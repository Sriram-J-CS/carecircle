"""End-to-end tests of the demo journey. Run:  pytest -q"""
import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["CARECIRCLE_DB"] = os.path.join(_tmp, "test.db")
os.environ["UPLOAD_DIR"] = os.path.join(_tmp, "uploads")
os.environ["RUN_SCHEDULER"] = "false"
os.environ["GEMINI_API_KEY"] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.services import risk_engine, scheduler  # noqa: E402

FACE = [0.1] * 128
OTHER_FACE = [0.9] * 128


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def H(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def world(client):
    """A patient (with face id + 1 emergency contact), her son (relative) and a doctor."""
    doc = client.get("/directory/doctors?limit=1").json()[0]
    p = client.post("/auth/register", json={
        "role": "patient", "name": "Lakshmi", "age": 72, "phone": "9876543210", "email": "lakshmi@example.com",
        "password": "Secret123", "language": "en", "face_descriptor": FACE, "conditions": ["Hypertension"],
        "address": "12 Anna Nagar", "city": "Chennai", "pincode": "600040",
        "emergency_contacts": [{"name": "Ravi", "phone": "9000000001", "relation": "son", "email": "ravi@example.com"}],
        "doctor_ids": [doc["id"]]})
    assert p.status_code == 201, p.text
    son = client.post("/auth/register", json={"role": "relative", "name": "Ravi", "phone": "9000000001",
                                              "email": "ravi@example.com", "password": "Secret123"})
    dr = client.post("/auth/register", json={"role": "doctor", "name": "Dr Test", "phone": "9111111111",
                                             "email": "dr@example.com", "password": "Secret123", "doctor_directory_id": doc["id"]})
    other = client.post("/auth/register", json={"role": "relative", "name": "Stranger", "phone": "9222222222",
                                                "email": "x@example.com", "password": "Secret123"})
    return {"p": p.json(), "son": son.json(), "dr": dr.json(), "other": other.json()}


def test_directory_prefix_search(client):
    names = [h["name"] for h in client.get("/directory/hospitals?q=A&limit=50").json()]
    assert names and all(n.lower().startswith("a") for n in names[:5])
    meds = client.get("/directory/medicines?q=Dol").json()
    assert meds[0]["name"].startswith("Dolo")


def test_register_validation(client, world):
    dup = client.post("/auth/register", json={"role": "relative", "name": "x", "phone": "9333333333",
                                              "email": "lakshmi@example.com", "password": "Secret123"})
    assert dup.status_code == 409
    no_contact = client.post("/auth/register", json={"role": "patient", "name": "x", "phone": "9333333333",
                                                     "email": "nc@example.com", "password": "Secret123"})
    assert no_contact.status_code == 422


def test_login_and_face_login(client, world):
    ok = client.post("/auth/login", json={"email": "lakshmi@example.com", "password": "Secret123"})
    assert ok.status_code == 200
    assert client.post("/auth/login", json={"email": "lakshmi@example.com", "password": "bad"}).status_code == 401
    f = client.post("/auth/face-login", json={"descriptor": FACE})
    assert f.status_code == 200 and f.json()["user"]["name"] == "Lakshmi"
    assert client.post("/auth/face-login", json={"descriptor": OTHER_FACE}).status_code == 401


def test_access_control(client, world):
    pid = world["p"]["user"]["id"]
    assert client.get(f"/patients/{pid}/summary", headers=H(world["son"]["token"])).status_code == 200  # granted at registration
    assert client.get(f"/patients/{pid}/summary", headers=H(world["dr"]["token"])).status_code == 200   # chosen doctor
    assert client.get(f"/patients/{pid}/summary", headers=H(world["other"]["token"])).status_code == 403


def test_pills_one_by_one_then_checkin_required(client, world):
    tok, pid = world["p"]["token"], world["p"]["user"]["id"]
    ids = []
    for name in ("Telma 40", "Glycomet 500"):
        s = client.post(f"/patients/{pid}/schedules", headers=H(tok), json={"medicine_name": name, "times": ["08:00"]}).json()
        ids.append(s["id"])
        assert client.post(f"/patients/{pid}/schedules/{s['id']}/test-dose", headers=H(tok)).status_code == 200
    due = client.get("/me/reminders", headers=H(tok)).json()["dose_slots"]
    doses = due[0]["doses"]
    assert len(doses) == 2
    # second tablet first -> blocked
    assert client.post(f"/doses/{doses[1]['id']}/confirm", headers=H(tok)).status_code == 409
    first = client.post(f"/doses/{doses[0]['id']}/confirm", headers=H(tok),
                        files={"proof": ("clip.webm", b"fakevideo", "video/webm")})
    assert first.status_code == 200 and first.json()["slot_complete"] is False
    last = client.post(f"/doses/{doses[1]['id']}/confirm", headers=H(tok)).json()
    assert last["slot_complete"] and last["checkin_required"]


def test_emergency_flow_alerts_family_and_closes_loop(client, world):
    tok, pid = world["p"]["token"], world["p"]["user"]["id"]
    r = client.post("/checkins", headers=H(tok), json={"text": "I have chest pain and shortness of breath", "trigger": "voice"}).json()
    assert r["level"] == "emergency" and r["risk_score"] < 40 and r["emergency_numbers"]["national_emergency"] == "112"
    alerts = client.get("/alerts?status=open", headers=H(world["son"]["token"])).json()
    crit = [a for a in alerts if a["severity"] == "critical"]
    assert crit, "son must see the critical alert"
    outbox = client.get("/admin/outbox", headers=H(world["son"]["token"])).json()
    assert any(m["channel"] == "call" for m in outbox) and any(m["channel"] == "sms" for m in outbox)
    ack = client.post(f"/alerts/{crit[0]['id']}/acknowledge", headers=H(world["son"]["token"])).json()
    assert ack["status"] == "acknowledged"
    note = client.get("/notifications?unread_only=true", headers=H(tok)).json()
    assert any("responding" in n["body"] for n in note)  # patient is told someone is on it


def test_attention_flow_offer_accept_and_decline(client, world):
    tok = world["p"]["token"]
    r = client.post("/checkins", headers=H(tok), json={"text": "I have a headache and mild fever", "feeling": 3, "pain": 5}).json()
    assert r["level"] == "attention" and 40 <= r["risk_score"] < 70 and r["offer"]
    order = client.post(f"/checkins/{r['checkin_id']}/offer", headers=H(tok), json={"accept": True, "pharmacy": "MedPlus"}).json()
    assert order["status"] == "ordered" and order["order"]["pharmacy"] == "MedPlus"
    # a second one that is declined -> family alerted
    r2 = client.post("/checkins", headers=H(tok), json={"symptoms": ["acidity", "headache"], "feeling": 3, "pain": 5}).json()
    declined = client.post(f"/checkins/{r2['checkin_id']}/offer", headers=H(tok), json={"accept": False}).json()
    assert declined["status"] == "declined"
    types = [a["type"] for a in client.get("/alerts", headers=H(world["son"]["token"])).json()]
    assert "offer_declined" in types


def test_normal_checkin(client, world):
    r = client.post("/checkins", headers=H(world["p"]["token"]), json={"feeling": 5, "pain": 0}).json()
    assert r["level"] == "normal" and r["risk_score"] >= 70 and r["offer"] is None


def test_missed_dose_alert_then_auto_clear(client, world):
    from app.db import connect, update, q1
    tok, pid = world["p"]["token"], world["p"]["user"]["id"]
    s = client.post(f"/patients/{pid}/schedules", headers=H(tok), json={"medicine_name": "Amlong 5", "times": ["09:00"]}).json()
    conn = connect()
    when = "2020-01-01T09:00:00+05:30"
    conn.execute("INSERT INTO dose_logs (schedule_id, patient_id, medicine_name, dosage, scheduled_for, status) VALUES (?,?,?,?,?, 'pending')",
                 (s["id"], pid, "Amlong 5", "1 tablet", when))
    did = q1(conn, "SELECT id FROM dose_logs WHERE scheduled_for=?", (when,))["id"]
    assert scheduler.tick(conn)["missed"] >= 1
    assert any(a["type"] == "missed_dose" for a in client.get("/alerts?status=open", headers=H(world["son"]["token"])).json())
    assert client.post(f"/doses/{did}/confirm", headers=H(tok)).status_code == 200  # late, but taken
    still_open = [a for a in client.get("/alerts?status=open", headers=H(world["son"]["token"])).json()
                  if a["type"] == "missed_dose" and a["ref_id"] == did]
    assert not still_open
    conn.close()


def test_appointment_and_lifestyle(client, world):
    pid = world["p"]["user"]["id"]
    a = client.post(f"/patients/{pid}/appointments", headers=H(world["son"]["token"]),
                    json={"title": "Cardiology check-up", "scheduled_at": "2030-11-20T10:30:00"})
    assert a.status_code == 201
    assert client.get(f"/patients/{pid}/appointments", headers=H(world["p"]["token"])).json()
    plan = client.get(f"/patients/{pid}/lifestyle-plan", headers=H(world["p"]["token"])).json()
    assert plan["food"]["avoid"] and "travel" in plan


def test_sos_and_chat(client, world):
    tok = world["p"]["token"]
    assert client.post("/sos", headers=H(tok)).json()["alert"] == "sos"
    chat = client.post("/agent/chat", headers=H(tok), json={"message": "when is my doctor appointment"}).json()
    assert chat["intent"] == "appointment"


def test_risk_engine_negation_and_red_flags():
    assert risk_engine.assess(text="I have no chest pain, feeling fine")["level"] == "normal"
    assert risk_engine.assess(text="my face is drooping")["level"] == "emergency"
    assert risk_engine.assess(vitals={"spo2": 85})["level"] == "emergency"
    assert risk_engine.assess(text="நெஞ்சு வலி")["level"] == "emergency"
