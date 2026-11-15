"""Alerts to the family circle: in-app notification + SMS (+ phone call for emergencies).

Without Twilio keys nothing leaves the server - every message is still stored in the
`notifications` table with status 'simulated', so the demo works offline.
"""
import logging

import httpx

from ..config import settings
from ..db import insert, q
from ..timeutil import iso, now

log = logging.getLogger("carecircle.notify")
TWILIO = "https://api.twilio.com/2010-04-01/Accounts/{sid}"


def _record(conn, channel, to_addr=None, user_id=None, title="", body="", severity="info", status="sent"):
    return insert(conn, "notifications", user_id=user_id, channel=channel, to_addr=to_addr, title=title,
                  body=body, severity=severity, status=status, created_at=iso(now()))


def _twilio_ready() -> bool:
    return bool(settings.twilio_sid and settings.twilio_token and settings.twilio_from)


def send_sms(conn, to: str, body: str, severity="info", title="CareCircle") -> str:
    status = "simulated"
    if _twilio_ready():
        try:
            r = httpx.post(TWILIO.format(sid=settings.twilio_sid) + "/Messages.json",
                           data={"To": to, "From": settings.twilio_from, "Body": body},
                           auth=(settings.twilio_sid, settings.twilio_token), timeout=10)
            status = "sent" if r.status_code < 300 else f"failed:{r.status_code}"
        except httpx.HTTPError as exc:
            status = "failed"
            log.warning("SMS failed: %s", exc)
    _record(conn, "sms", to_addr=to, title=title, body=body, severity=severity, status=status)
    return status


def place_call(conn, to: str, message: str) -> str:
    status = "simulated"
    if _twilio_ready():
        twiml = f"<Response><Say voice='alice'>{message}</Say></Response>"
        try:
            r = httpx.post(TWILIO.format(sid=settings.twilio_sid) + "/Calls.json",
                           data={"To": to, "From": settings.twilio_from, "Twiml": twiml},
                           auth=(settings.twilio_sid, settings.twilio_token), timeout=10)
            status = "sent" if r.status_code < 300 else f"failed:{r.status_code}"
        except httpx.HTTPError as exc:
            status = "failed"
            log.warning("Call failed: %s", exc)
    _record(conn, "call", to_addr=to, title="Emergency call", body=message, severity="critical", status=status)
    return status


def notify_user(conn, user_id: int, title: str, body: str, severity="info") -> None:
    _record(conn, "app", user_id=user_id, title=title, body=body, severity=severity)


def circle_for(conn, patient_id: int) -> dict:
    """Everyone to tell: emergency contacts (phones) and relatives/doctors with app accounts."""
    contacts = q(conn, "SELECT name, phone FROM emergency_contacts WHERE patient_id=?", (patient_id,))
    members = q(conn, "SELECT grantee_id FROM access_grants WHERE patient_id=? AND status='active' AND grantee_id IS NOT NULL",
                (patient_id,))
    return {"phones": [c["phone"] for c in contacts], "user_ids": sorted({m["grantee_id"] for m in members})}


def notify_circle(conn, patient_id: int, title: str, body: str, severity="info", call=False) -> dict:
    """Tell the whole circle. severity 'critical' + call=True also phones the emergency contacts."""
    circle = circle_for(conn, patient_id)
    for uid in circle["user_ids"]:
        notify_user(conn, uid, title, body, severity)
    if severity in ("warning", "critical"):
        for phone in dict.fromkeys(circle["phones"]):
            send_sms(conn, phone, f"{title}: {body}", severity)
            if call and severity == "critical":
                place_call(conn, phone, f"{title}. {body}")
    return {"contacts_notified": len(circle["phones"]), "app_users_notified": len(circle["user_ids"])}
