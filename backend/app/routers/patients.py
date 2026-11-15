"""Patient profile, who can see it (relatives / doctors) and the dashboard used by all three roles."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db, insert, jl, q, q1
from ..schemas import AccessIn, CareTeamIn, ContactIn
from ..security import current_user, normalize_phone, patient_only, public_user, require_access
from ..services import checkin_flow
from ..timeutil import iso, now

router = APIRouter(tags=["patients"])


@router.get("/patients")
def my_patients(user=Depends(current_user), conn=Depends(get_db)):
    """Doctors and relatives: the patients they are allowed to see."""
    if user["role"] == "patient":
        return [public_user(user)]
    if user["role"] == "relative":
        sql = ("SELECT u.* FROM users u JOIN access_grants g ON g.patient_id=u.id "
               "WHERE g.grantee_id=? AND g.status='active' AND g.role='relative'")
        rows = q(conn, sql, (user["id"],))
    else:
        sql = ("SELECT DISTINCT u.* FROM users u WHERE u.role='patient' AND ("
               " u.id IN (SELECT patient_id FROM care_team WHERE doctor_id=?)"
               " OR u.id IN (SELECT patient_id FROM access_grants WHERE grantee_id=? AND role='doctor' AND status='active'))")
        rows = q(conn, sql, (user.get("doctor_directory_id") or -1, user["id"]))
    return [public_user(r) for r in rows]


@router.get("/patients/{pid}/summary")
def summary(pid: int, user=Depends(current_user), conn=Depends(get_db)):
    """One call = everything the dashboard needs."""
    level = require_access(conn, user, pid)
    patient = q1(conn, "SELECT * FROM users WHERE id=?", (pid,))
    profile = q1(conn, "SELECT * FROM patient_profiles WHERE user_id=?", (pid,)) or {}
    today = now().date().isoformat()
    doses = q(conn, "SELECT * FROM dose_logs WHERE patient_id=? AND substr(scheduled_for,1,10)=? ORDER BY scheduled_for, id", (pid, today))
    since = iso(now() - timedelta(days=30))
    stats = q1(conn, "SELECT SUM(status='taken') t, SUM(status='missed') m FROM dose_logs WHERE patient_id=? AND scheduled_for>=?", (pid, since))
    taken, missed = stats["t"] or 0, stats["m"] or 0
    trend = q(conn, "SELECT id, risk_score, level, created_at FROM checkins WHERE patient_id=? ORDER BY id DESC LIMIT 14", (pid,))
    latest = q1(conn, "SELECT * FROM checkins WHERE patient_id=? ORDER BY id DESC LIMIT 1", (pid,))
    if latest:
        latest["analysis"], latest["input"] = jl(latest["analysis"], {}), jl(latest["input"], {})
    team = q(conn, "SELECT d.id, d.name, d.specialty, h.name hospital FROM care_team c JOIN doctors d ON d.id=c.doctor_id "
                   "LEFT JOIN hospitals h ON h.id=d.hospital_id WHERE c.patient_id=?", (pid,))
    return {
        "access_level": level,
        "patient": public_user(patient),
        "profile": {**profile, "conditions": jl(profile.get("conditions")), "allergies": jl(profile.get("allergies"))},
        "emergency_contacts": q(conn, "SELECT id, name, phone, relation FROM emergency_contacts WHERE patient_id=?", (pid,)),
        "care_team": team,
        "today_doses": doses,
        "adherence_30d_pct": round(100 * taken / (taken + missed)) if (taken + missed) else None,
        "checkin_status": checkin_flow.checkin_status(conn, pid),
        "latest_checkin": latest,
        "risk_trend": list(reversed(trend)),
        "open_alerts": q(conn, "SELECT * FROM alerts WHERE patient_id=? AND status!='resolved' ORDER BY id DESC", (pid,)),
        "upcoming_appointments": q(conn, "SELECT * FROM appointments WHERE patient_id=? AND scheduled_at>=? ORDER BY scheduled_at LIMIT 5", (pid, iso(now()))),
        "recent_orders": [{**o, "items": jl(o["items"])} for o in q(conn, "SELECT * FROM orders WHERE patient_id=? ORDER BY id DESC LIMIT 5", (pid,))],
    }


# ---------- patient manages who is around them ----------
@router.get("/patients/me/access")
def list_access(user=Depends(patient_only), conn=Depends(get_db)):
    return q(conn, "SELECT id, role, name, phone, email, relation, status FROM access_grants WHERE patient_id=? ORDER BY id", (user["id"],))


@router.post("/patients/me/access", status_code=201)
def grant_access(body: AccessIn, user=Depends(patient_only), conn=Depends(get_db)):
    """Give a relative (or doctor) permission to see your dashboard. They get access when they register with this email/phone."""
    if not body.email and not body.phone:
        raise HTTPException(422, "Give an email or a phone number")
    grantee = None
    if body.email:
        grantee = q1(conn, "SELECT id FROM users WHERE lower(email)=lower(?) AND role=?", (body.email, "doctor" if body.role == "doctor" else "relative"))
    gid = insert(conn, "access_grants", patient_id=user["id"], grantee_id=grantee["id"] if grantee else None, role=body.role,
                 name=body.name, phone=normalize_phone(body.phone) if body.phone else None, email=(body.email or "").lower() or None,
                 relation=body.relation, status="active" if grantee else "pending", created_at=iso(now()))
    return {"id": gid, "status": "active" if grantee else "pending"}


@router.delete("/patients/me/access/{grant_id}")
def revoke_access(grant_id: int, user=Depends(patient_only), conn=Depends(get_db)):
    conn.execute("DELETE FROM access_grants WHERE id=? AND patient_id=?", (grant_id, user["id"]))
    return {"ok": True}


@router.post("/patients/me/contacts", status_code=201)
def add_contact(body: ContactIn, user=Depends(patient_only), conn=Depends(get_db)):
    cid = insert(conn, "emergency_contacts", patient_id=user["id"], name=body.name, phone=normalize_phone(body.phone), relation=body.relation)
    if body.app_access:
        insert(conn, "access_grants", patient_id=user["id"], role="relative", name=body.name, phone=normalize_phone(body.phone),
               email=(body.email or "").lower() or None, relation=body.relation, status="pending", created_at=iso(now()))
    return {"id": cid}


@router.post("/patients/me/care-team")
def set_care_team(body: CareTeamIn, user=Depends(patient_only), conn=Depends(get_db)):
    """Choose hospital + doctors (after registration)."""
    if body.hospital_id:
        conn.execute("UPDATE patient_profiles SET hospital_id=? WHERE user_id=?", (body.hospital_id, user["id"]))
    for d in body.doctor_ids:
        if q1(conn, "SELECT 1 FROM doctors WHERE id=?", (d,)):
            conn.execute("INSERT OR IGNORE INTO care_team (patient_id, doctor_id) VALUES (?,?)", (user["id"], d))
    return {"ok": True}
