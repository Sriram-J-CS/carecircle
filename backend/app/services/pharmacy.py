"""Pharmacy ordering adapter.

Today this is a MOCK: it records the order and returns a fake reference + ETA. To go live, replace
`submit_order` with the partner's API call (Apollo Pharmacy / MedPlus / Tata 1mg / PharmEasy partner APIs).
Only the AI-suggested OTC items and a patient-approved order ever reach this function.
"""
import uuid

from ..db import insert
from ..timeutil import iso, now

PHARMACIES = [
    {"id": "apollo", "name": "Apollo Pharmacy", "eta": "60-90 min", "url": "https://www.apollopharmacy.in"},
    {"id": "medplus", "name": "MedPlus", "eta": "60-120 min", "url": "https://www.medplusmart.com"},
    {"id": "1mg", "name": "Tata 1mg", "eta": "same day", "url": "https://www.1mg.com"},
    {"id": "pharmeasy", "name": "PharmEasy", "eta": "same day", "url": "https://pharmeasy.in"},
    {"id": "netmeds", "name": "Netmeds", "eta": "same day", "url": "https://www.netmeds.com"},
]
DEFAULT = PHARMACIES[0]


def pick(name_or_id: str | None) -> dict:
    key = (name_or_id or "").lower()
    return next((p for p in PHARMACIES if key in (p["id"], p["name"].lower())), DEFAULT)


def submit_order(conn, patient_id: int, items: list[dict], address: str | None, pharmacy: str | None,
                 checkin_id: int | None = None) -> dict:
    ph = pick(pharmacy)
    ref = f"CC-{uuid.uuid4().hex[:8].upper()}"
    order_id = insert(conn, "orders", patient_id=patient_id, pharmacy=ph["name"], items=items, address=address,
                      status="placed", external_ref=ref, checkin_id=checkin_id, created_at=iso(now()))
    return {"order_id": order_id, "pharmacy": ph["name"], "reference": ref, "eta": ph["eta"], "status": "placed", "items": items}
