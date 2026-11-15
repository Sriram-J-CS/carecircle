"""Medicine schedules, reminders, and "take one tablet at a time on camera" confirmation."""
from datetime import timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..config import settings
from ..db import get_db, insert, jl, q, q1, update
from ..schemas import ScheduleIn
from ..security import current_user, patient_only, require_access
from ..services import checkin_flow, scheduler
from ..timeutil import iso, now

router = APIRouter(tags=["medications"])
MAX_PROOF_BYTES = 25 * 1024 * 1024
ALLOWED_PROOF = {".webm": ("video/webm", "audio/webm"), ".mp4": ("video/mp4",), ".jpg": ("image/jpeg",), ".jpeg": ("image/jpeg",), ".png": ("image/png",)}


def _fmt(s: dict) -> dict:
    return {**s, "times": jl(s["times"])}


@router.post("/patients/{pid}/schedules", status_code=201)
def create_schedule(pid: int, body: ScheduleIn, user=Depends(current_user), conn=Depends(get_db)):
    """Patient or their doctor adds a medicine and the times of day (e.g. ["08:00","20:00"])."""
    require_access(conn, user, pid, levels=("self", "doctor"))
    sid = insert(conn, "med_schedules", patient_id=pid, medicine_name=body.medicine_name, dosage=body.dosage, times=body.times,
                 with_food=body.with_food, start_date=body.start_date.isoformat() if body.start_date else None,
                 end_date=body.end_date.isoformat() if body.end_date else None, notes=body.notes, created_at=iso(now()))
    scheduler.materialize_doses(conn)
    return _fmt(q1(conn, "SELECT * FROM med_schedules WHERE id=?", (sid,)))


@router.get("/patients/{pid}/schedules")
def list_schedules(pid: int, user=Depends(current_user), conn=Depends(get_db)):
    require_access(conn, user, pid)
    return [_fmt(s) for s in q(conn, "SELECT * FROM med_schedules WHERE patient_id=? AND active=1 ORDER BY id", (pid,))]


@router.delete("/patients/{pid}/schedules/{sid}")
def stop_schedule(pid: int, sid: int, user=Depends(current_user), conn=Depends(get_db)):
    require_access(conn, user, pid, levels=("self", "doctor"))
    conn.execute("UPDATE med_schedules SET active=0 WHERE id=? AND patient_id=?", (sid, pid))
    return {"ok": True}


@router.post("/patients/{pid}/schedules/{sid}/test-dose")
def test_dose(pid: int, sid: int, user=Depends(current_user), conn=Depends(get_db)):
    """DEMO helper: make a dose due right now so you can show the reminder + camera flow on stage."""
    if not settings.demo_mode:
        raise HTTPException(404, "Not found")
    require_access(conn, user, pid, levels=("self", "doctor"))
    s = q1(conn, "SELECT * FROM med_schedules WHERE id=? AND patient_id=?", (sid, pid))
    if not s:
        raise HTTPException(404, "Schedule not found")
    when = iso(now().replace(second=0, microsecond=0))
    conn.execute("INSERT OR REPLACE INTO dose_logs (schedule_id, patient_id, medicine_name, dosage, scheduled_for, status) VALUES (?,?,?,?,?, 'pending')",
                 (sid, pid, s["medicine_name"], s["dosage"], when))
    return {"scheduled_for": when}


@router.get("/patients/{pid}/doses")
def doses(pid: int, date: str | None = None, user=Depends(current_user), conn=Depends(get_db)):
    require_access(conn, user, pid)
    day = date or now().date().isoformat()
    return q(conn, "SELECT * FROM dose_logs WHERE patient_id=? AND substr(scheduled_for,1,10)=? ORDER BY scheduled_for, id", (pid, day))


@router.get("/me/reminders")
def my_reminders(user=Depends(patient_only), conn=Depends(get_db)):
    """The frontend polls this every ~30s: what must the elder do RIGHT NOW? (doses, check-in, appointments)"""
    t = now()
    due = q(conn, """SELECT * FROM dose_logs WHERE patient_id=? AND status IN ('pending','snoozed') AND scheduled_for<=?
                     AND (snoozed_until IS NULL OR snoozed_until<=?) ORDER BY scheduled_for, id""",
            (user["id"], iso(t + timedelta(minutes=5)), iso(t)))
    slots: dict[str, list] = {}
    for d in due:
        slots.setdefault(d["scheduled_for"], []).append(d)
    soon = q(conn, "SELECT * FROM appointments WHERE patient_id=? AND scheduled_at BETWEEN ? AND ? ORDER BY scheduled_at",
             (user["id"], iso(t), iso(t + timedelta(hours=24))))
    unread = q1(conn, "SELECT COUNT(*) c FROM notifications WHERE user_id=? AND read=0", (user["id"],))["c"]
    return {"dose_slots": [{"slot": k, "doses": v} for k, v in slots.items()],
            "checkin": checkin_flow.checkin_status(conn, user["id"]), "appointments_next_24h": soon, "unread_notifications": unread}


@router.post("/doses/{dose_id}/confirm")
def confirm_dose(dose_id: int, proof: UploadFile | None = File(None), user=Depends(patient_only), conn=Depends(get_db)):
    """Patient confirms they took the tablet (optionally uploading the short camera clip/photo as proof).
    Tablets in the same time slot must be confirmed one after another, in order."""
    dose = q1(conn, "SELECT * FROM dose_logs WHERE id=? AND patient_id=?", (dose_id, user["id"]))
    if not dose:
        raise HTTPException(404, "Dose not found")
    if dose["status"] == "taken":
        raise HTTPException(409, "Already confirmed")
    earliest = now() + timedelta(minutes=settings.early_confirm_min)
    if dose["scheduled_for"] > iso(earliest):
        raise HTTPException(409, "It is not time for this tablet yet")
    blocker = q1(conn, "SELECT id, medicine_name FROM dose_logs WHERE patient_id=? AND scheduled_for=? AND id<? AND status IN ('pending','snoozed') ORDER BY id LIMIT 1",
                 (user["id"], dose["scheduled_for"], dose_id))
    if blocker:
        raise HTTPException(409, f"Please take {blocker['medicine_name']} first (dose {blocker['id']})")
    if settings.require_proof and not proof:
        raise HTTPException(422, "Camera proof is required to confirm this tablet")

    proof_path = None
    if proof:
        folder = Path(settings.upload_dir) / str(user["id"])
        folder.mkdir(parents=True, exist_ok=True)
        ext = Path(proof.filename or "").suffix.lower() or ".webm"
        ctype = (proof.content_type or "").split(";")[0].strip().lower()
        if ext not in ALLOWED_PROOF or ctype not in ALLOWED_PROOF[ext]:
            raise HTTPException(415, "Proof must be a webm/mp4 video or a jpg/png photo")
        target = folder / f"dose_{dose_id}{ext}"
        data = proof.file.read(MAX_PROOF_BYTES + 1)
        if len(data) > MAX_PROOF_BYTES:
            raise HTTPException(413, "Proof file too large (max 25 MB)")
        target.write_bytes(data)
        proof_path = str(target)

    update(conn, "dose_logs", dose_id, status="taken", taken_at=iso(now()), proof_path=proof_path)
    # closed loop: the family's "missed dose" alert for this dose clears automatically
    conn.execute("UPDATE alerts SET status='resolved', resolved_at=? WHERE type='missed_dose' AND ref_id=? AND status!='resolved'", (iso(now()), dose_id))

    nxt = q1(conn, "SELECT * FROM dose_logs WHERE patient_id=? AND scheduled_for=? AND status IN ('pending','snoozed') ORDER BY id LIMIT 1",
             (user["id"], dose["scheduled_for"]))
    slot_done = nxt is None
    return {"dose_id": dose_id, "status": "taken", "next_dose": nxt, "slot_complete": slot_done,
            "checkin_required": slot_done,  # after the last tablet the app must ask "how do you feel?"
            "checkin_trigger": "post_med" if slot_done else None}


@router.post("/doses/{dose_id}/snooze")
def snooze_dose(dose_id: int, minutes: int = 10, user=Depends(patient_only), conn=Depends(get_db)):
    dose = q1(conn, "SELECT * FROM dose_logs WHERE id=? AND patient_id=?", (dose_id, user["id"]))
    if not dose or dose["status"] not in ("pending", "snoozed"):
        raise HTTPException(404, "Dose not found or already handled")
    minutes = max(5, min(minutes, 20))
    update(conn, "dose_logs", dose_id, status="snoozed", snoozed_until=iso(now() + timedelta(minutes=minutes)))
    return {"snoozed_until": iso(now() + timedelta(minutes=minutes))}
