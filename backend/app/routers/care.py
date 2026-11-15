"""Appointments, activity tracking (walking/exercise/travel) and the daily wellness plan."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db, insert, jl, q, q1
from ..schemas import ActivityIn, AppointmentIn
from ..security import current_user, patient_only, require_access
from ..services import lifestyle, notifier
from ..timeutil import IST, iso, now

router = APIRouter(tags=["care"])


@router.post("/patients/{pid}/appointments", status_code=201)
def add_appointment(pid: int, body: AppointmentIn, user=Depends(current_user), conn=Depends(get_db)):
    """Patient, relative or doctor can book. Reminders are sent 24h and 1h before (scheduler)."""
    require_access(conn, user, pid)
    when = body.scheduled_at if body.scheduled_at.tzinfo else body.scheduled_at.replace(tzinfo=IST)
    aid = insert(conn, "appointments", patient_id=pid, title=body.title, doctor_name=body.doctor_name, hospital=body.hospital,
                 scheduled_at=iso(when), notes=body.notes, created_by=user["id"], created_at=iso(now()))
    if user["id"] != pid:
        notifier.notify_user(conn, pid, "New appointment", f"{user['name']} booked: {body.title} on {when.strftime('%d %b %I:%M %p')}.")
    return q1(conn, "SELECT * FROM appointments WHERE id=?", (aid,))


@router.get("/patients/{pid}/appointments")
def list_appointments(pid: int, upcoming: bool = True, user=Depends(current_user), conn=Depends(get_db)):
    require_access(conn, user, pid)
    if upcoming:
        return q(conn, "SELECT * FROM appointments WHERE patient_id=? AND scheduled_at>=? ORDER BY scheduled_at", (pid, iso(now())))
    return q(conn, "SELECT * FROM appointments WHERE patient_id=? ORDER BY scheduled_at DESC", (pid,))


@router.delete("/patients/{pid}/appointments/{aid}")
def cancel_appointment(pid: int, aid: int, user=Depends(current_user), conn=Depends(get_db)):
    require_access(conn, user, pid)
    conn.execute("DELETE FROM appointments WHERE id=? AND patient_id=?", (aid, pid))
    return {"ok": True}


@router.post("/activity", status_code=201)
def log_activity(body: ActivityIn, user=Depends(patient_only), conn=Depends(get_db)):
    """Log walking (km), exercise (minutes) or a trip (km)."""
    return {"id": insert(conn, "activities", patient_id=user["id"], kind=body.kind, value=body.value, unit=body.unit, created_at=iso(now()))}


@router.get("/patients/{pid}/activity")
def activity(pid: int, days: int = 7, user=Depends(current_user), conn=Depends(get_db)):
    require_access(conn, user, pid)
    since = iso(now() - timedelta(days=min(days, 90)))
    return q(conn, "SELECT kind, SUM(value) total, unit, substr(created_at,1,10) day FROM activities WHERE patient_id=? AND created_at>=? GROUP BY kind, unit, day ORDER BY day",
             (pid, since))


@router.get("/patients/{pid}/lifestyle-plan")
def lifestyle_plan(pid: int, user=Depends(current_user), conn=Depends(get_db)):
    """Exercise, walking target, food and travel-distance guidance, adapted to the latest risk score."""
    require_access(conn, user, pid)
    patient = q1(conn, "SELECT age FROM users WHERE id=?", (pid,))
    profile = q1(conn, "SELECT conditions FROM patient_profiles WHERE user_id=?", (pid,)) or {}
    latest = q1(conn, "SELECT risk_score FROM checkins WHERE patient_id=? ORDER BY id DESC LIMIT 1", (pid,))
    walked = q1(conn, "SELECT COALESCE(SUM(value),0) v FROM activities WHERE patient_id=? AND kind='walking' AND substr(created_at,1,10)=?",
                (pid, now().date().isoformat()))["v"]
    return lifestyle.build_plan(patient["age"], jl(profile.get("conditions")), latest["risk_score"] if latest else None, walked)
