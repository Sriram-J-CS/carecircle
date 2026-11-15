"""Rule-based health-risk engine (the safety net - it always runs, with or without an LLM).

Score 0-100, higher = healthier:   >= 70 normal | 40-69 attention | < 40 emergency
It never diagnoses. It only turns reported symptoms/vitals into a risk band.
"""
import re

# key -> label, penalty weight, red_flag, keywords (English + Tamil + Hindi)
SYMPTOMS: dict[str, dict] = {
    "chest_pain": dict(label="chest pain", weight=60, red=True, kw=[
        "chest pain", "chest pressure", "chest hurts", "pain in chest", "pain in my chest", "heart pain",
        "நெஞ்சு வலி", "நெஞ்சில் வலி", "seene mein dard", "chhati mein dard", "सीने में दर्द"]),
    "breathing": dict(label="difficulty breathing", weight=55, red=True, kw=[
        "can't breathe", "cannot breathe", "difficulty breathing", "trouble breathing", "breathless",
        "short of breath", "shortness of breath", "மூச்சு திணறல்", "மூச்சு விட", "सांस लेने में तकलीफ", "सांस फूल"]),
    "fainting": dict(label="fainting", weight=50, red=True, kw=[
        "fainted", "fainting", "passed out", "blacked out", "unconscious", "மயங்கி", "बेहोश"]),
    "stroke_signs": dict(label="possible stroke signs", weight=60, red=True, kw=[
        "slurred speech", "face drooping", "face is drooping", "arm weakness", "one side weak", "numb on one side",
        "can't speak", "முகம் கோணல்", "लकवा"]),
    "bleeding": dict(label="heavy bleeding", weight=60, red=True, kw=[
        "heavy bleeding", "bleeding a lot", "vomiting blood", "blood in stool", "coughing blood", "coughing up blood"]),
    "fall_injury": dict(label="a fall", weight=40, red=False, kw=[
        "i fell", "fell down", "had a fall", "slipped and fell", "கீழே விழுந்த", "गिर गया", "गिर गई"]),
    "confusion": dict(label="confusion", weight=40, red=False, kw=[
        "confused", "disoriented", "don't know where i am", "குழப்பம்", "भ्रमित"]),
    "palpitations": dict(label="palpitations", weight=30, red=False, kw=[
        "palpitation", "heart racing", "heart pounding", "fast heartbeat", "படபடப்பு", "धड़कन तेज"]),
    "low_sugar": dict(label="possible low sugar", weight=35, red=False, kw=[
        "low sugar", "sweating and shaking", "hypoglycemia", "sugar is low"]),
    "fever": dict(label="fever", weight=22, red=False, kw=["fever", "high temperature", "காய்ச்சல்", "बुखार", "bukhar"]),
    "dizziness": dict(label="dizziness", weight=20, red=False, kw=[
        "dizzy", "giddy", "spinning", "lightheaded", "light-headed", "தலை சுற்று", "चक्कर"]),
    "vomiting": dict(label="vomiting / nausea", weight=15, red=False, kw=[
        "vomit", "nausea", "nauseous", "feel like throwing up", "வாந்தி", "उल्टी", "ulti"]),
    "diarrhea": dict(label="loose motions", weight=14, red=False, kw=[
        "diarrhea", "diarrhoea", "loose motion", "loose stool", "வயிற்றுப்போக்கு", "दस्त"]),
    "weakness": dict(label="weakness / tiredness", weight=12, red=False, kw=[
        "weak", "tired", "fatigue", "no energy", "exhausted", "சோர்வு", "कमजोरी", "थकान"]),
    "headache": dict(label="headache", weight=10, red=False, kw=[
        "headache", "head ache", "head pain", "my head hurts", "தலைவலி", "thalai vali", "सिरदर्द", "sir dard"]),
    "body_pain": dict(label="body pain", weight=10, red=False, kw=[
        "body pain", "body ache", "joint pain", "back pain", "knee pain", "muscle pain", "leg pain",
        "உடல் வலி", "மூட்டு வலி", "बदन दर्द", "जोड़ों में दर्द", "कमर दर्द"]),
    "cough_cold": dict(label="cough / cold", weight=8, red=False, kw=[
        "cough", "cold", "runny nose", "sore throat", "இருமல்", "சளி", "खांसी", "सर्दी"]),
    "acidity": dict(label="acidity / stomach upset", weight=8, red=False, kw=[
        "acidity", "heartburn", "gas", "indigestion", "stomach pain", "stomach ache", "அசிடிட்டி", "வயிற்று வலி", "पेट दर्द", "गैस"]),
}

CHRONIC = ("heart", "cardiac", "diabet", "hypertension", "bp", "copd", "asthma", "kidney", "stroke")
NEGATIONS = ("no ", "not ", "without ", "don't have ", "do not have ", "never ", "nothing ")


def level_for(score: int) -> str:
    if score >= 70:
        return "normal"
    if score >= 40:
        return "attention"
    return "emergency"


def detect_symptoms(text: str) -> list[str]:
    """Keyword match with a simple negation check ("no chest pain" is ignored)."""
    text = (text or "").lower()
    found = []
    for key, spec in SYMPTOMS.items():
        for kw in spec["kw"]:
            for m in re.finditer(re.escape(kw.lower()), text):
                before = text[max(0, m.start() - 14): m.start()]
                if any(n in before for n in NEGATIONS):
                    continue
                found.append(key)
                break
            if key in found:
                break
    return found


def assess(*, text: str = "", symptoms: list[str] | None = None, pain: int | None = None, feeling: int | None = None,
           vitals: dict | None = None, age: int | None = None, conditions: list[str] | None = None,
           missed_doses: int = 0) -> dict:
    vitals = vitals or {}
    keys = [k for k in dict.fromkeys([*(symptoms or []), *detect_symptoms(text)]) if k in SYMPTOMS]
    reasons: list[str] = []
    red_flags: list[str] = [SYMPTOMS[k]["label"] for k in keys if SYMPTOMS[k]["red"]]

    weights = sorted((SYMPTOMS[k]["weight"] for k in keys), reverse=True)
    penalty = (weights[0] + 0.5 * sum(weights[1:])) if weights else 0.0
    if keys:
        reasons.append("Reported: " + ", ".join(SYMPTOMS[k]["label"] for k in keys))

    chronic = [c for c in (conditions or []) if any(t in c.lower() for t in CHRONIC)]
    if chronic and penalty >= 10:
        penalty *= 1.2
        reasons.append("Existing condition raises the risk")

    if pain is not None:
        if pain >= 8:
            penalty += 25; reasons.append(f"Severe pain ({pain}/10)")
        elif pain >= 5:
            penalty += 12; reasons.append(f"Moderate pain ({pain}/10)")
    if feeling is not None:
        extra = {1: 30, 2: 18, 3: 6}.get(feeling, 0)
        if extra:
            penalty += extra; reasons.append(f"Feeling rated {feeling}/5")

    spo2, temp, hr = vitals.get("spo2"), vitals.get("temp_c"), vitals.get("heart_rate")
    sys_bp, sugar = vitals.get("systolic"), vitals.get("sugar")
    if spo2 is not None:
        if spo2 < 90:
            red_flags.append(f"very low oxygen ({spo2}%)")
        elif spo2 < 94:
            penalty += 35; reasons.append(f"Low oxygen ({spo2}%)")
    if temp is not None and temp >= 38.5:
        penalty += 20; reasons.append(f"High temperature ({temp}°C)")
        if temp >= 40:
            red_flags.append(f"very high temperature ({temp}°C)")
    if hr is not None and (hr > 120 or hr < 45):
        penalty += 25; reasons.append(f"Abnormal heart rate ({hr})")
        if hr > 140 or hr < 40:
            red_flags.append(f"dangerous heart rate ({hr})")
    if sys_bp is not None and (sys_bp >= 180 or sys_bp < 90):
        penalty += 30; reasons.append(f"Abnormal blood pressure ({sys_bp})")
        if sys_bp >= 200 or sys_bp < 80:
            red_flags.append(f"dangerous blood pressure ({sys_bp})")
    if sugar is not None and (sugar < 70 or sugar > 300):
        penalty += 30; reasons.append(f"Abnormal blood sugar ({sugar})")
        if sugar < 54:
            red_flags.append(f"very low blood sugar ({sugar})")

    if missed_doses:
        penalty += min(15, 5 * missed_doses); reasons.append(f"{missed_doses} missed dose(s) in the last 24h")
    if age and age >= 75:
        penalty += 5

    score = max(0, min(100, round(100 - penalty)))
    if red_flags:
        score = min(score, 25)
        reasons.insert(0, "Red flag: " + ", ".join(red_flags))
    confident = bool(keys or pain is not None or feeling is not None or vitals)
    return {"score": score, "level": level_for(score), "symptoms": keys, "red_flags": red_flags,
            "reasons": reasons, "confidence": 0.9 if confident else 0.5}


# ---- over-the-counter suggestions (only for the 40-69 band, always needs the patient's consent) ----
OTC = {
    "fever": [dict(name="Paracetamol 500mg (e.g. Dolo / Crocin)", avoid_if=["liver"])],
    "headache": [dict(name="Paracetamol 500mg (e.g. Dolo / Crocin)", avoid_if=["liver"])],
    "body_pain": [dict(name="Paracetamol 500mg (e.g. Dolo / Crocin)", avoid_if=["liver"])],
    "acidity": [dict(name="Antacid gel/tablet (e.g. Digene / Gelusil)", avoid_if=["kidney"])],
    "diarrhea": [dict(name="ORS sachets (e.g. Electral)", avoid_if=["kidney", "heart failure"])],
    "vomiting": [dict(name="ORS sachets (e.g. Electral)", avoid_if=["kidney", "heart failure"])],
    "cough_cold": [dict(name="Throat lozenges / warm-water gargle kit", avoid_if=[])],
    "weakness": [dict(name="ORS sachets (e.g. Electral)", avoid_if=["kidney", "heart failure"])],
}


def suggest_otc(symptoms: list[str], conditions: list[str], allergies: list[str]) -> list[dict]:
    cond = " ".join(conditions).lower()
    allergy = " ".join(allergies).lower()
    items, seen = [], set()
    for key in symptoms:
        for med in OTC.get(key, []):
            if med["name"] in seen or any(a in cond for a in med["avoid_if"]):
                continue
            if any(w and w in med["name"].lower() for w in allergy.replace(",", " ").split()):
                continue
            seen.add(med["name"])
            items.append({"name": med["name"], "qty": 1, "for": SYMPTOMS[key]["label"]})
    return items
