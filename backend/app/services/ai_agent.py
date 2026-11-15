"""Gemini-powered health assistant. Optional: if GEMINI_API_KEY is empty every function returns None
and the rule engine (risk_engine.py) carries the whole flow.

"Training" the agent = (1) the strict system prompt below, (2) the rule engine as a safety floor,
(3) your datasets loaded into the DB (medicines, hospitals) which the agent is given as context.
It never diagnoses and never prescribes prescription-only drugs.
"""
import json
import logging

from ..config import settings
from .risk_engine import SYMPTOMS

log = logging.getLogger("carecircle.ai")

SYSTEM_PROMPT = """You are CareCircle's care assistant for elderly people in India who may be alone at home.
You talk like a warm, patient grandchild: short sentences, simple words, in the user's language.

HARD RULES
- You are NOT a doctor. Never diagnose. Say "these symptoms may need attention", never "you have X".
- Never suggest prescription-only drugs, antibiotics, steroids or sedatives. Only common over-the-counter items.
- For elderly users avoid NSAIDs (ibuprofen, diclofenac, aspirin for pain).
- Any chest pain, trouble breathing, fainting, stroke signs (face droop, slurred speech, one-sided weakness),
  heavy bleeding, or confusion => risk_score <= 25 and tell them to call 112 immediately.
- If you are unsure, lower the score and lower your confidence. Safety first.

SCORING (0-100, higher = healthier): >=70 normal, 40-69 needs attention, <40 emergency.

Reply with JSON only:
{"symptoms": [<keys from the allowed list>], "risk_score": <int>, "confidence": <0..1>,
 "summary": "<one factual sentence for the family, no diagnosis>",
 "user_message": "<what to say to the elder, in their language, max 2 sentences>"}
"""

_client = None


def enabled() -> bool:
    return bool(settings.gemini_api_key)


def _get_client():
    global _client
    if _client is None:
        from google import genai  # imported lazily so the app starts without the package
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def _generate(prompt: str, system: str, as_json: bool) -> str | None:
    if not enabled():
        return None
    try:
        from google.genai import types
        cfg = types.GenerateContentConfig(system_instruction=system, temperature=0.2,
                                          response_mime_type="application/json" if as_json else "text/plain")
        resp = _get_client().models.generate_content(model=settings.gemini_model, contents=prompt, config=cfg)
        return resp.text
    except Exception as exc:  # network, quota, bad key... never break the safety flow
        log.warning("Gemini call failed: %s", exc)
        return None


def llm_assess(context: dict) -> dict | None:
    """context: age, conditions, language, text, symptoms, pain, feeling, vitals, missed_doses, recent_scores."""
    prompt = (f"Allowed symptom keys: {list(SYMPTOMS)}\n"
              f"Patient context and check-in:\n{json.dumps(context, ensure_ascii=False)}")
    raw = _generate(prompt, SYSTEM_PROMPT, as_json=True)
    if not raw:
        return None
    try:
        data = json.loads(raw)
        return {
            "symptoms": [s for s in data.get("symptoms", []) if s in SYMPTOMS],
            "risk_score": max(0, min(100, int(data.get("risk_score", 100)))),
            "confidence": float(data.get("confidence", 0.5)),
            "summary": str(data.get("summary", ""))[:400],
            "user_message": str(data.get("user_message", ""))[:400],
        }
    except (ValueError, TypeError):
        log.warning("Gemini returned non-JSON: %.80s", raw)
        return None


def chat_reply(message: str, language: str, context: dict) -> str | None:
    """General companion chat (greetings, 'what is my next medicine', etc.)."""
    system = SYSTEM_PROMPT.split("Reply with JSON only")[0] + f"\nReply in language code '{language}'. Plain text, max 3 sentences."
    return _generate(f"Context: {json.dumps(context, ensure_ascii=False)}\nUser said: {message}", system, as_json=False)
