"""Health check-ins ("how are you feeling?") -> AI risk score -> action; plus the medicine-order consent step."""
from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db, jl, q, q1
from ..schemas import CheckinIn, OfferResponseIn
from ..security import current_user, patient_only, require_access
from ..services import checkin_flow
from ..services.risk_engine import SYMPTOMS

router = APIRouter(tags=["checkins"])


@router.get("/checkins/questions")
def questions():
    """What the check-in screen should ask. Render these as big buttons / read them aloud."""
    return {
        "feeling": {"question": "How are you feeling right now?", "scale": {1: "Very bad", 2: "Bad", 3: "Okay", 4: "Good", 5: "Great"}},
        "pain": {"question": "Any pain? (0 = none, 10 = worst)", "min": 0, "max": 10},
        "symptoms": {"question": "Do you have any of these?",
                     "options": [{"key": k, "label": v["label"]} for k, v in SYMPTOMS.items()]},
        "vitals_optional": ["spo2", "temp_c", "heart_rate", "systolic", "diastolic", "sugar"],
        "free_text": "Tell me in your own words (voice or typing, any language)",
    }


@router.get("/checkins/status")
def status(user=Depends(patient_only), conn=Depends(get_db)):
    return checkin_flow.checkin_status(conn, user["id"])


@router.post("/checkins", status_code=201)
def submit_checkin(body: CheckinIn, user=Depends(patient_only), conn=Depends(get_db)):
    """Used by the 6-hourly prompt, the after-tablets prompt and the voice assistant."""
    return checkin_flow.process_checkin(conn, user, body.model_dump(), body.trigger)


@router.post("/checkins/{checkin_id}/offer")
def answer_offer(checkin_id: int, body: OfferResponseIn, user=Depends(patient_only), conn=Depends(get_db)):
    """Yes -> the agent orders the suggested medicine from a pharmacy. No -> the family is notified."""
    result = checkin_flow.respond_to_offer(conn, user, checkin_id, body.accept, body.pharmacy)
    if "error" in result:
        raise HTTPException(404 if result["error"] == "not_found" else 409, result["error"])
    return result


@router.get("/patients/{pid}/checkins")
def history(pid: int, limit: int = 30, user=Depends(current_user), conn=Depends(get_db)):
    require_access(conn, user, pid)
    rows = q(conn, "SELECT * FROM checkins WHERE patient_id=? ORDER BY id DESC LIMIT ?", (pid, min(limit, 200)))
    return [{**r, "input": jl(r["input"], {}), "analysis": jl(r["analysis"], {})} for r in rows]


@router.get("/patients/{pid}/orders")
def orders(pid: int, user=Depends(current_user), conn=Depends(get_db)):
    require_access(conn, user, pid)
    return [{**o, "items": jl(o["items"])} for o in q(conn, "SELECT * FROM orders WHERE patient_id=? ORDER BY id DESC", (pid,))]
