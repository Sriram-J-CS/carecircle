"""The heart of the app: a check-in comes in -> risk score -> action (reassure / offer medicine / emergency)."""
from datetime import timedelta

from ..config import settings
from ..db import insert, jl, q, q1, update
from ..timeutil import iso, now, parse
from . import ai_agent, notifier, pharmacy, risk_engine
from .risk_engine import SYMPTOMS

EMERGENCY_NUMBERS = {"ambulance": "108", "national_emergency": "112"}

MESSAGES = {
    "normal": {
        "en": "You are doing well. Keep taking your medicines on time and drink enough water.",
        "ta": "நீங்கள் நன்றாக இருக்கிறீர்கள். மருந்துகளை நேரத்திற்கு எடுத்துக் கொள்ளுங்கள், தண்ணீர் அதிகம் குடியுங்கள்.",
        "hi": "आप ठीक हैं। दवाइयाँ समय पर लेते रहें और पानी पीते रहें।"},
    "attention_offer": {
        "en": "I noticed some symptoms ({s}). Shall I order a suitable over-the-counter medicine from a nearby pharmacy?",
        "ta": "சில அறிகுறிகள் தெரிகின்றன ({s}). அருகிலுள்ள மருந்தகத்திலிருந்து பொருத்தமான மருந்தை ஆர்டர் செய்யலாமா?",
        "hi": "मुझे कुछ लक्षण दिखे ({s})। क्या मैं पास की फार्मेसी से उपयुक्त दवा मंगवा दूँ?"},
    "attention_no_offer": {
        "en": "I noticed some symptoms ({s}). Please rest and see your doctor. I am informing your family.",
        "ta": "சில அறிகுறிகள் தெரிகின்றன ({s}). ஓய்வெடுத்து மருத்துவரைப் பாருங்கள். உங்கள் குடும்பத்தினருக்கு தெரிவிக்கிறேன்.",
        "hi": "मुझे कुछ लक्षण दिखे ({s})। आराम करें और डॉक्टर को दिखाएँ। मैं आपके परिवार को बता रहा हूँ।"},
    "emergency": {
        "en": "This may be serious. Call 112 now or press SOS. I am alerting your family.",
        "ta": "இது தீவிரமாக இருக்கலாம். உடனே 112 ஐ அழைக்கவும். உங்கள் குடும்பத்தினருக்கு தெரிவிக்கிறேன்.",
        "hi": "यह गंभीर हो सकता है। अभी 112 पर कॉल करें। मैं आपके परिवार को सूचित कर रहा हूँ।"},
}


def _msg(kind: str, lang: str, **fmt) -> str:
    table = MESSAGES[kind]
    return table.get(lang, table["en"]).format(**fmt)


def checkin_status(conn, patient_id: int) -> dict:
    """Is a periodic check-in due? (every N hours, only 07:00-22:00)"""
    last = q1(conn, "SELECT created_at FROM checkins WHERE patient_id=? ORDER BY id DESC LIMIT 1", (patient_id,))
    since = parse(last["created_at"]) if last else parse(q1(conn, "SELECT created_at FROM users WHERE id=?", (patient_id,))["created_at"])
    next_due = since + timedelta(hours=settings.checkin_interval_hours)
    t = now()
    awake = 7 <= t.hour < 22
    return {"due": awake and t >= next_due, "last_checkin_at": last["created_at"] if last else None,
            "next_due_at": iso(next_due), "overdue_minutes": max(0, int((t - next_due).total_seconds() // 60))}


def _missed_last_24h(conn, patient_id: int) -> int:
    since = iso(now() - timedelta(hours=24))
    return q1(conn, "SELECT COUNT(*) c FROM dose_logs WHERE patient_id=? AND status='missed' AND scheduled_for>=?",
              (patient_id, since))["c"]


def process_checkin(conn, patient: dict, data: dict, trigger: str) -> dict:
    pid = patient["id"]
    profile = q1(conn, "SELECT * FROM patient_profiles WHERE user_id=?", (pid,)) or {}
    conditions, allergies = jl(profile.get("conditions")), jl(profile.get("allergies"))
    lang = data.get("language") or patient.get("language") or "en"
    missed = _missed_last_24h(conn, pid)

    rule = risk_engine.assess(text=data.get("text", ""), symptoms=data.get("symptoms"), pain=data.get("pain"),
                              feeling=data.get("feeling"), vitals=data.get("vitals"), age=patient.get("age"),
                              conditions=conditions, missed_doses=missed)
    score, symptoms = rule["score"], list(rule["symptoms"])
    summary, source, ai_note = "; ".join(rule["reasons"]) or "No concerning symptoms reported.", "rules", None

    recent = [r["risk_score"] for r in q(conn, "SELECT risk_score FROM checkins WHERE patient_id=? ORDER BY id DESC LIMIT 5", (pid,))]
    llm = ai_agent.llm_assess({"age": patient.get("age"), "conditions": conditions, "language": lang,
                               "text": data.get("text", ""), "symptoms": data.get("symptoms", []), "pain": data.get("pain"),
                               "feeling": data.get("feeling"), "vitals": data.get("vitals", {}),
                               "missed_doses_24h": missed, "recent_scores": recent})
    if llm:
        source = "rules+gemini"
        score = min(score, llm["risk_score"])  # always take the more cautious of the two
        symptoms = list(dict.fromkeys([*symptoms, *llm["symptoms"]]))
        ai_note = llm["user_message"] or None
        summary = llm["summary"] or summary
        if llm["confidence"] < 0.4 and (symptoms or data.get("text")):
            score = min(score, settings.low_confidence_cap)  # AI unsure -> assume the worst
            summary += " (AI was not confident - treated as urgent)"
    red = [k for k in symptoms if SYMPTOMS[k]["red"]]
    if red:
        score = min(score, 25)
    level = risk_engine.level_for(score)

    labels = ", ".join(SYMPTOMS[k]["label"] for k in symptoms) or "none"
    offer = None
    if level == "attention":
        items = risk_engine.suggest_otc(symptoms, conditions, allergies)
        if items:
            ph = pharmacy.DEFAULT
            offer = {"items": items, "pharmacy": ph["name"], "eta": ph["eta"], "pharmacies": [p["name"] for p in pharmacy.PHARMACIES],
                     "note": "Over-the-counter only. Check with a pharmacist/doctor if you take other medicines."}
    message = (_msg("emergency", lang) if level == "emergency"
               else _msg("attention_offer", lang, s=labels) if level == "attention" and offer
               else _msg("attention_no_offer", lang, s=labels) if level == "attention"
               else _msg("normal", lang))

    analysis = {"source": source, "symptoms": symptoms, "symptom_labels": labels, "red_flags": rule["red_flags"],
                "reasons": rule["reasons"], "summary": summary, "ai_message": ai_note, "offer": offer, "message": message}
    checkin_id = insert(conn, "checkins", patient_id=pid, trigger=trigger, input=data, risk_score=score, level=level,
                        analysis=analysis, offer_status="pending" if offer else None, created_at=iso(now()))

    notified = None
    if level == "emergency":
        update_msg = f"{patient['name']}: possible emergency (risk {score}/100). {summary}. Please call them now."
        insert(conn, "alerts", patient_id=pid, type="emergency", severity="critical", message=update_msg,
               ref_id=checkin_id, created_at=iso(now()))
        notified = notifier.notify_circle(conn, pid, "EMERGENCY - CareCircle", update_msg, "critical", call=True)
    elif level == "attention" and not offer:
        # nothing we can order -> the family should know and a doctor visit is advised
        msg = f"{patient['name']} reported: {labels} (risk {score}/100). Please check in and consider a doctor visit."
        insert(conn, "alerts", patient_id=pid, type="needs_attention", severity="warning", message=msg,
               ref_id=checkin_id, created_at=iso(now()))
        notified = notifier.notify_circle(conn, pid, "Needs attention", msg, "warning")

    return {"checkin_id": checkin_id, "risk_score": score, "level": level, "message": message, "symptoms": symptoms,
            "symptom_labels": labels, "reasons": rule["reasons"], "offer": offer, "notified": notified,
            "emergency_numbers": EMERGENCY_NUMBERS if level == "emergency" else None, "source": source,
            "disclaimer": "CareCircle does not diagnose. This is a risk indication, not medical advice."}


def respond_to_offer(conn, patient: dict, checkin_id: int, accept: bool, pharmacy_name: str | None) -> dict:
    """Patient says yes -> AI places the order. Patient says no -> the family is told (as the product spec requires)."""
    row = q1(conn, "SELECT * FROM checkins WHERE id=? AND patient_id=?", (checkin_id, patient["id"]))
    if not row:
        return {"error": "not_found"}
    analysis = jl(row["analysis"], {})
    offer = analysis.get("offer")
    if not offer or row["offer_status"] != "pending":
        return {"error": "no_pending_offer"}
    pid = patient["id"]
    if accept:
        profile = q1(conn, "SELECT * FROM patient_profiles WHERE user_id=?", (pid,)) or {}
        address = ", ".join(x for x in [profile.get("address"), profile.get("city"), profile.get("pincode")] if x)
        order = pharmacy.submit_order(conn, pid, offer["items"], address, pharmacy_name or offer["pharmacy"], checkin_id)
        update(conn, "checkins", checkin_id, offer_status="accepted")
        notifier.notify_circle(conn, pid, "Medicine ordered",
                               f"{patient['name']} ordered {', '.join(i['name'] for i in offer['items'])} from {order['pharmacy']} (ETA {order['eta']}).", "info")
        return {"status": "ordered", "order": order}
    update(conn, "checkins", checkin_id, offer_status="declined")
    msg = f"{patient['name']} reported {analysis.get('symptom_labels')} (risk {row['risk_score']}/100) and declined the suggested medicine. Please check on them."
    insert(conn, "alerts", patient_id=pid, type="offer_declined", severity="warning", message=msg, ref_id=checkin_id, created_at=iso(now()))
    notified = notifier.notify_circle(conn, pid, "Needs attention", msg, "warning")
    return {"status": "declined", "family_notified": notified}
