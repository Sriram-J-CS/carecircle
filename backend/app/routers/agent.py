"""Voice/text assistant endpoint and the SOS button.
Speech-to-text and text-to-speech happen in the browser (Web Speech API); this endpoint receives the transcript."""
import re

from fastapi import APIRouter, Depends

from ..db import get_db, insert, jl, q, q1
from ..schemas import ChatIn
from ..security import patient_only
from ..services import ai_agent, checkin_flow, notifier
from ..services.risk_engine import detect_symptoms
from ..timeutil import iso, now, parse

router = APIRouter(tags=["agent"])

SOS_WORDS = ("emergency", "help me", "ambulance", "sos", "அவசரம்", "காப்பாற்று", "बचाओ", "इमरजेंसी")
TAKEN_WORDS = ("taken", "took my", "i took", "had my medicine", "எடுத்தேன்", "खा ली", "ले ली")
MEDS_WORDS = ("my medicine", "which tablet", "next tablet", "what medicine", "மருந்து", "दवा")
APPT_WORDS = ("appointment", "doctor visit", "when is my doctor", "அப்பாயின்ட்மென்ட்", "अपॉइंटमेंट")


def _intent(text: str) -> str:
    t = text.lower()
    if any(w in t for w in SOS_WORDS):
        return "sos"
    if detect_symptoms(t):
        return "symptom"
    if any(w in t for w in TAKEN_WORDS):
        return "dose_taken"
    if any(w in t for w in APPT_WORDS):
        return "appointment"
    if any(w in t for w in MEDS_WORDS):
        return "medicines"
    if re.search(r"\b(not well|unwell|sick|pain|hurts?)\b", t):
        return "symptom"
    return "chat"


def trigger_sos(conn, patient: dict) -> dict:
    msg = f"{patient['name']} pressed SOS and needs help NOW. Please call them immediately."
    insert(conn, "alerts", patient_id=patient["id"], type="sos", severity="critical", message=msg, created_at=iso(now()))
    notified = notifier.notify_circle(conn, patient["id"], "SOS - CareCircle", msg, "critical", call=True)
    return {"alert": "sos", "notified": notified, "emergency_numbers": checkin_flow.EMERGENCY_NUMBERS,
            "message": "Help is being alerted. Call 112 now if you can."}


@router.post("/sos")
def sos(user=Depends(patient_only), conn=Depends(get_db)):
    return trigger_sos(conn, user)


@router.post("/agent/chat")
def chat(body: ChatIn, user=Depends(patient_only), conn=Depends(get_db)):
    """Send the voice transcript. Returns what to say (reply) and what the UI should do (action)."""
    lang = body.language or user.get("language") or "en"
    intent = _intent(body.message)

    if intent == "sos":
        res = trigger_sos(conn, user)
        return {"intent": intent, "reply": res["message"], "action": {"type": "show_emergency", **res}}

    if intent == "symptom":
        res = checkin_flow.process_checkin(conn, user, {"text": body.message, "language": lang}, "voice")
        action = {"type": "show_emergency"} if res["level"] == "emergency" else \
                 {"type": "ask_offer", "checkin_id": res["checkin_id"], "offer": res["offer"]} if res["offer"] else {"type": "none"}
        return {"intent": intent, "reply": res["message"], "risk_score": res["risk_score"], "level": res["level"], "action": action, "details": res}

    if intent == "dose_taken":
        nxt = q1(conn, "SELECT * FROM dose_logs WHERE patient_id=? AND status IN ('pending','snoozed') AND scheduled_for<=? ORDER BY scheduled_for, id LIMIT 1",
                 (user["id"], iso(now())))
        if nxt:
            return {"intent": intent, "reply": f"Great. Please show {nxt['medicine_name']} on camera so I can confirm it.",
                    "action": {"type": "open_pill_camera", "dose_id": nxt["id"]}}
        return {"intent": intent, "reply": "You have no tablet due right now.", "action": {"type": "none"}}

    if intent == "medicines":
        rows = q(conn, "SELECT medicine_name, dosage, scheduled_for, status FROM dose_logs WHERE patient_id=? AND substr(scheduled_for,1,10)=? ORDER BY scheduled_for",
                 (user["id"], now().date().isoformat()))
        left = [r for r in rows if r["status"] in ("pending", "snoozed")]
        if not left:
            return {"intent": intent, "reply": "You have taken all of today's medicines.", "action": {"type": "none"}}
        nxt = left[0]
        return {"intent": intent, "action": {"type": "none"},
                "reply": f"Next is {nxt['medicine_name']}, {nxt['dosage']}, at {parse(nxt['scheduled_for']).strftime('%I:%M %p')}. {len(left)} left today."}

    if intent == "appointment":
        a = q1(conn, "SELECT * FROM appointments WHERE patient_id=? AND scheduled_at>=? ORDER BY scheduled_at LIMIT 1", (user["id"], iso(now())))
        reply = (f"Your next appointment is {a['title']} on {parse(a['scheduled_at']).strftime('%d %B at %I:%M %p')}."
                 if a else "You have no upcoming appointments.")
        return {"intent": intent, "reply": reply, "action": {"type": "none"}}

    profile = q1(conn, "SELECT conditions FROM patient_profiles WHERE user_id=?", (user["id"],)) or {}
    reply = ai_agent.chat_reply(body.message, lang, {"name": user["name"], "age": user.get("age"), "conditions": jl(profile.get("conditions"))})
    return {"intent": "chat", "action": {"type": "none"},
            "reply": reply or "I am here with you. You can ask about your medicines, appointments, or tell me how you feel."}
