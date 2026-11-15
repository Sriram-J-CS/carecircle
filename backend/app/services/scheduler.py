"""Background job (runs every minute): creates today's doses, marks missed ones, nudges the family,
and sends appointment reminders. `tick()` is a plain function so tests can call it directly."""
import asyncio
import logging
from datetime import timedelta

from ..config import settings
from ..db import connect, insert, jl, q, q1, update
from ..timeutil import at_time, iso, now, parse
from . import checkin_flow, notifier

log = logging.getLogger("carecircle.scheduler")


def materialize_doses(conn) -> int:
    """Create today's dose rows from active schedules (idempotent)."""
    created, today = 0, now()
    for s in q(conn, "SELECT * FROM med_schedules WHERE active=1"):
        if s["start_date"] and today.date().isoformat() < s["start_date"]:
            continue
        if s["end_date"] and today.date().isoformat() > s["end_date"]:
            continue
        for hhmm in jl(s["times"]):
            when = at_time(hhmm, today)
            if when < parse(s["created_at"]):  # don't back-fill times that passed before the schedule existed
                continue
            cur = conn.execute(
                """INSERT OR IGNORE INTO dose_logs (schedule_id, patient_id, medicine_name, dosage, scheduled_for, status)
                   VALUES (?,?,?,?,?, 'pending')""",
                (s["id"], s["patient_id"], s["medicine_name"], s["dosage"], iso(when)))
            created += cur.rowcount
    return created


def mark_missed(conn) -> int:
    cutoff = iso(now() - timedelta(minutes=settings.missed_after_min))
    late = q(conn, "SELECT * FROM dose_logs WHERE status IN ('pending','snoozed') AND scheduled_for<?", (cutoff,))
    for d in late:
        update(conn, "dose_logs", d["id"], status="missed")
        patient = q1(conn, "SELECT name FROM users WHERE id=?", (d["patient_id"],))
        hhmm = parse(d["scheduled_for"]).strftime("%I:%M %p")
        msg = f"{patient['name']} has not taken {d['medicine_name']} ({d['dosage']}) due at {hhmm}."
        insert(conn, "alerts", patient_id=d["patient_id"], type="missed_dose", severity="warning", message=msg,
               ref_id=d["id"], created_at=iso(now()))
        notifier.notify_circle(conn, d["patient_id"], "Missed medicine", msg, "warning")
    return len(late)


def nudge_overdue_checkins(conn) -> int:
    """If a check-in is >60 min overdue, tell the family once (until the patient checks in again)."""
    sent = 0
    for p in q(conn, "SELECT id, name FROM users WHERE role='patient'"):
        st = checkin_flow.checkin_status(conn, p["id"])
        if st["due"] and st["overdue_minutes"] >= 60:
            since = st["last_checkin_at"] or "0"
            if q1(conn, "SELECT 1 FROM alerts WHERE patient_id=? AND type='checkin_overdue' AND created_at>?", (p["id"], since)):
                continue
            msg = f"{p['name']} has not answered the health check-in for {st['overdue_minutes'] // 60}+ hours."
            insert(conn, "alerts", patient_id=p["id"], type="checkin_overdue", severity="warning", message=msg, created_at=iso(now()))
            notifier.notify_circle(conn, p["id"], "No response", msg, "warning")
            sent += 1
    return sent


def remind_appointments(conn) -> int:
    sent, t = 0, now()
    for a in q(conn, "SELECT * FROM appointments WHERE scheduled_at>?", (iso(t),)):
        delta = parse(a["scheduled_at"]) - t
        when = parse(a["scheduled_at"]).strftime("%d %b %I:%M %p")
        for col, window, label in (("reminded_24h", timedelta(hours=24), "tomorrow"), ("reminded_1h", timedelta(hours=1), "in 1 hour")):
            if not a[col] and delta <= window:
                body = f"Appointment {label}: {a['title']} with {a['doctor_name'] or 'doctor'} at {when}."
                notifier.notify_user(conn, a["patient_id"], "Appointment reminder", body)
                notifier.notify_circle(conn, a["patient_id"], "Appointment reminder", body)
                update(conn, "appointments", a["id"], **{col: 1})
                sent += 1
    return sent


def tick(conn=None) -> dict:
    own = conn is None
    conn = conn or connect()
    try:
        return {"doses_created": materialize_doses(conn), "missed": mark_missed(conn),
                "checkin_nudges": nudge_overdue_checkins(conn), "appointment_reminders": remind_appointments(conn)}
    finally:
        if own:
            conn.close()


async def run_loop(interval_s: int = 60) -> None:
    while True:
        try:
            await asyncio.to_thread(tick)
        except Exception:  # keep the loop alive no matter what
            log.exception("scheduler tick failed")
        await asyncio.sleep(interval_s)
