"""Closed-loop alerts: a family member/doctor must acknowledge and resolve; the patient is told who responded."""
from fastapi import APIRouter, Depends, HTTPException

from ..config import settings
from ..db import get_db, q, q1
from ..security import access_level, current_user, require_access
from ..services import notifier
from ..timeutil import iso, now

router = APIRouter(tags=["alerts"])


def _visible_patient_ids(conn, user: dict) -> list[int]:
    if user["role"] == "patient":
        return [user["id"]]
    rows = q(conn, "SELECT id FROM users WHERE role='patient'")
    return [r["id"] for r in rows if access_level(conn, user, r["id"])]


@router.get("/alerts")
def list_alerts(status: str | None = None, user=Depends(current_user), conn=Depends(get_db)):
    ids = _visible_patient_ids(conn, user)
    if not ids:
        return []
    marks = ",".join("?" for _ in ids)
    sql = (f"SELECT a.*, u.name AS patient_name FROM alerts a JOIN users u ON u.id=a.patient_id "
           f"WHERE a.patient_id IN ({marks})")
    params: list = list(ids)
    if status:
        sql += " AND a.status=?"
        params.append(status)
    return q(conn, sql + " ORDER BY a.id DESC LIMIT 100", tuple(params))


def _load(conn, alert_id: int, user: dict) -> dict:
    alert = q1(conn, "SELECT * FROM alerts WHERE id=?", (alert_id,))
    if not alert:
        raise HTTPException(404, "Alert not found")
    require_access(conn, user, alert["patient_id"])
    return alert


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge(alert_id: int, user=Depends(current_user), conn=Depends(get_db)):
    alert = _load(conn, alert_id, user)
    if user["role"] == "patient":
        raise HTTPException(403, "A caregiver or doctor must acknowledge")
    if alert["status"] == "open":
        conn.execute("UPDATE alerts SET status='acknowledged', acknowledged_by=?, acknowledged_at=? WHERE id=?", (user["id"], iso(now()), alert_id))
        notifier.notify_user(conn, alert["patient_id"], "Help is on the way", f"{user['name']} has seen your alert and is responding.")
        notifier.notify_circle(conn, alert["patient_id"], "Alert acknowledged", f"{user['name']} is handling: {alert['message'][:120]}")
    return q1(conn, "SELECT * FROM alerts WHERE id=?", (alert_id,))


@router.post("/alerts/{alert_id}/resolve")
def resolve(alert_id: int, user=Depends(current_user), conn=Depends(get_db)):
    alert = _load(conn, alert_id, user)
    if user["role"] == "patient" and alert["type"] not in ("missed_dose", "checkin_overdue", "needs_attention"):
        raise HTTPException(403, "A caregiver or doctor must resolve this alert")
    conn.execute("UPDATE alerts SET status='resolved', resolved_by=?, resolved_at=? WHERE id=?", (user["id"], iso(now()), alert_id))
    return q1(conn, "SELECT * FROM alerts WHERE id=?", (alert_id,))


# ---------- in-app notifications ----------
@router.get("/notifications")
def notifications(unread_only: bool = False, user=Depends(current_user), conn=Depends(get_db)):
    sql = "SELECT * FROM notifications WHERE user_id=?" + (" AND read=0" if unread_only else "") + " ORDER BY id DESC LIMIT 50"
    return q(conn, sql, (user["id"],))


@router.post("/notifications/read-all")
def read_all(user=Depends(current_user), conn=Depends(get_db)):
    conn.execute("UPDATE notifications SET read=1 WHERE user_id=?", (user["id"],))
    return {"ok": True}


@router.get("/admin/outbox")
def outbox(user=Depends(current_user), conn=Depends(get_db)):
    """Demo helper: shows the SMS/calls that were sent (or simulated) for this user's patients."""
    if not settings.demo_mode:
        raise HTTPException(404, "Not found")
    ids = _visible_patient_ids(conn, user)
    phones = [r["phone"] for pid in ids for r in q(conn, "SELECT phone FROM emergency_contacts WHERE patient_id=?", (pid,))]
    if not phones:
        return []
    marks = ",".join("?" for _ in phones)
    return q(conn, f"SELECT * FROM notifications WHERE channel IN ('sms','call') AND to_addr IN ({marks}) ORDER BY id DESC LIMIT 50", tuple(phones))
