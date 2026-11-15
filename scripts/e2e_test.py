import json
import urllib.request
import urllib.error
import time

BASE_URL = "http://127.0.0.1:8000"

def req(path, method="GET", body=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            err_data = json.loads(content)
        except Exception:
            err_data = content
        return e.code, err_data

def run_demo():
    print("=================== RUNNING CARECIRCLE DEMO SCRIPT ===================")
    
    # 1. Register Lakshmi
    print("\n--- Step 1: Register Patient (Lakshmi, 72, hypertension, face scan, 2 medicines) ---")
    ts = int(time.time() * 1000) % 1000000
    seed = (ts % 900 + 100) / 1000.0
    lakshmi_face = [round((seed + i * 0.005) % 1.0, 4) for i in range(128)]
    lakshmi_phone = f"+9198{ts:08d}"
    ravi_phone = f"+9197{ts:08d}"
    ravi_email = f"ravi_{ts}@example.com"

    lakshmi_reg = {
        "role": "patient",
        "name": "Lakshmi",
        "age": 72,
        "phone": lakshmi_phone,
        "email": f"lakshmi_{ts}@example.com",
        "password": "Password123!",
        "language": "en",
        "face_descriptor": lakshmi_face,
        "conditions": ["Hypertension"],
        "allergies": [],
        "address": "12 Gandhi Road, T Nagar",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "600017",
        "emergency_contacts": [
            {
                "name": "Ravi",
                "phone": ravi_phone,
                "relation": "son",
                "email": ravi_email,
                "app_access": True
            }
        ]
    }
    status, res = req("/auth/register", method="POST", body=lakshmi_reg)
    print(f"Register Lakshmi: {status} -> user_id: {res.get('user', {}).get('id')}")
    assert status == 201, f"Failed: {res}"
    lakshmi_token = res["token"]
    lakshmi_id = res["user"]["id"]
    
    # Add two medicines at 08:00
    status, med1 = req(f"/patients/{lakshmi_id}/schedules", method="POST", token=lakshmi_token, body={
        "medicine_name": "Telma 40",
        "dosage": "1 tablet (40mg)",
        "times": ["08:00"],
        "with_food": "after"
    })
    print(f"Add Schedule Telma 40: {status} -> id: {med1.get('id')}")
    assert status == 201
    
    status, med2 = req(f"/patients/{lakshmi_id}/schedules", method="POST", token=lakshmi_token, body={
        "medicine_name": "Metformin 500",
        "dosage": "1 tablet (500mg)",
        "times": ["08:00"],
        "with_food": "after"
    })
    print(f"Add Schedule Metformin 500: {status} -> id: {med2.get('id')}")
    assert status == 201
    
    # 2. Register Ravi and Doctor
    print("\n--- Step 2: Register Ravi (relative) with same phone/email & register Doctor ---")
    ravi_reg = {
        "role": "relative",
        "name": "Ravi",
        "phone": ravi_phone,
        "email": ravi_email,
        "password": "Password123!",
        "language": "en"
    }
    status, res = req("/auth/register", method="POST", body=ravi_reg)
    print(f"Register Ravi: {status} -> user_id: {res.get('user', {}).get('id')}")
    if status == 409: # Already registered from prior run, try login
        status, res = req("/auth/login", method="POST", body={"email": ravi_reg["email"], "password": ravi_reg["password"]})
        print(f"Login Ravi: {status}")
    assert status in (200, 201), f"Failed: {res}"
    ravi_token = res["token"]
    ravi_id = res["user"]["id"]
    
    # Register Doctor
    doc_email = f"dr.karthik_{int(time.time())}@example.com"
    doc_reg = {
        "role": "doctor",
        "name": "Dr. Karthik Nair",
        "phone": "+919876543303",
        "email": doc_email,
        "password": "Password123!",
        "language": "en",
        "doctor_directory_id": 4,
        "registration_no": "MCI-55443"
    }
    status, doc_res = req("/auth/register", method="POST", body=doc_reg)
    print(f"Register Doctor: {status} -> doc_id: {doc_res.get('user', {}).get('id')}")
    assert status == 201
    doc_token = doc_res["token"]
    
    # 3. Sign in as Lakshmi with Face ID & Demo Drawer test-dose
    print("\n--- Step 3: Face Login Lakshmi & test-dose on both tablets ---")
    status, face_res = req("/auth/face-login", method="POST", body={"descriptor": lakshmi_face})
    print(f"Face Login status: {status} -> matched user: {face_res.get('user', {}).get('name')}, distance: {face_res.get('match_distance')}")
    assert status == 200
    lakshmi_token = face_res["token"]
    
    # Test dose for med1 and med2
    status, td1 = req(f"/patients/{lakshmi_id}/schedules/{med1['id']}/test-dose", method="POST", token=lakshmi_token)
    print(f"Test dose med1: {status}")
    assert status == 200
    status, td2 = req(f"/patients/{lakshmi_id}/schedules/{med2['id']}/test-dose", method="POST", token=lakshmi_token)
    print(f"Test dose med2: {status}")
    assert status == 200
    
    # Query reminders / dose logs
    status, doses = req(f"/patients/{lakshmi_id}/doses", token=lakshmi_token)
    print(f"Doses count for today: {len(doses)}")
    pending_doses = [d for d in doses if d["status"] == "pending"]
    print(f"Pending doses: {[d['medicine_name'] for d in pending_doses]}")
    assert len(pending_doses) >= 2
    
    # Test ordered confirmation flow: Confirming dose 2 first should return 409!
    print("Testing enforcement: confirming second tablet first...")
    status, err_confirm = req(f"/doses/{pending_doses[1]['id']}/confirm", method="POST", token=lakshmi_token)
    print(f"Out of order confirm status: {status} (Expected 409: {err_confirm.get('detail')})")
    assert status == 409
    
    # Confirm tablet 1
    print(f"Confirming tablet 1: {pending_doses[0]['medicine_name']}...")
    status, conf1 = req(f"/doses/{pending_doses[0]['id']}/confirm", method="POST", token=lakshmi_token)
    print(f"Confirm 1 status: {status} -> next_dose: {conf1.get('next_dose', {}).get('medicine_name')}, slot_complete: {conf1.get('slot_complete')}")
    assert status == 200
    assert conf1.get("next_dose") is not None
    
    # Confirm tablet 2
    print(f"Confirming tablet 2: {pending_doses[1]['medicine_name']}...")
    status, conf2 = req(f"/doses/{pending_doses[1]['id']}/confirm", method="POST", token=lakshmi_token)
    print(f"Confirm 2 status: {status} -> slot_complete: {conf2.get('slot_complete')}, checkin_required: {conf2.get('checkin_required')}")
    assert status == 200
    assert conf2.get("slot_complete") is True
    assert conf2.get("checkin_required") is True
    
    # 4. Say "I have a headache and mild fever" -> expect amber result + offer -> accept -> order confirmation
    print("\n--- Step 4: Voice Agent / Checkin: 'I have a headache and mild fever' ---")
    status, chat_res = req("/agent/chat", method="POST", token=lakshmi_token, body={"message": "I have a headache and mild fever", "language": "en"})
    print(f"Agent chat reply: {chat_res.get('reply')}")
    print(f"Agent chat action: {chat_res.get('action')}")
    
    # Submit check-in to get the exact offer object and score
    status, chk_res = req("/checkins", method="POST", token=lakshmi_token, body={
        "feeling": 2,
        "pain": 4,
        "symptoms": ["headache", "fever"],
        "text": "I have a headache and mild fever",
        "trigger": "post_med"
    })
    print(f"Checkin status: {status} -> risk_score: {chk_res.get('risk_score')}, level: {chk_res.get('level')}")
    assert status == 201
    assert chk_res["level"] == "attention", f"Expected attention, got {chk_res['level']}"
    assert chk_res.get("offer") is not None, "Expected medicine offer"
    print(f"Offer items: {chk_res['offer'].get('items')}, pharmacy: {chk_res['offer'].get('pharmacy')}")
    
    # Accept the offer
    checkin_id = chk_res.get("checkin_id") or chk_res.get("id")
    status, offer_res = req(f"/checkins/{checkin_id}/offer", method="POST", token=lakshmi_token, body={
        "accept": True,
        "pharmacy": "Apollo Pharmacy"
    })
    print(f"Accept offer status: {status} -> order: {offer_res.get('order')}")
    assert status == 200
    assert offer_res.get("status") == "ordered"
    assert offer_res.get("order", {}).get("reference") is not None
    
    # 5. Say "My chest hurts and I can't breathe" -> expect red emergency screen
    print("\n--- Step 5: Emergency: 'My chest hurts and I can't breathe' ---")
    status, emg_chat = req("/agent/chat", method="POST", token=lakshmi_token, body={"message": "My chest hurts and I can't breathe", "language": "en"})
    print(f"Emergency chat action: {emg_chat.get('action')}")
    assert emg_chat.get("action", {}).get("type") == "show_emergency"
    
    # Also check checkin scoring for severe symptoms
    status, emg_chk = req("/checkins", method="POST", token=lakshmi_token, body={
        "feeling": 1,
        "pain": 9,
        "symptoms": ["chest pain", "shortness of breath"],
        "text": "My chest hurts and I can't breathe"
    })
    print(f"Emergency checkin status: {status} -> risk_score: {emg_chk.get('risk_score')}, level: {emg_chk.get('level')}")
    assert status == 201
    assert emg_chk["level"] == "emergency"
    
    # 6. As Ravi: see critical alert, acknowledge ("I'm on it"), see SMS/call entries
    print("\n--- Step 6: Ravi verifies critical alert, taps 'I\'m on it', checks messages sent ---")
    # Verify Ravi can see Lakshmi in patients
    status, ravi_pts = req("/patients", token=ravi_token)
    print(f"Ravi visible patients: {[p['name'] for p in ravi_pts]}")
    assert any(p["id"] == lakshmi_id for p in ravi_pts), "Ravi cannot see Lakshmi"
    
    # Get Lakshmi's summary for Ravi
    status, ravi_summary = req(f"/patients/{lakshmi_id}/summary", token=ravi_token)
    print(f"Ravi sees open alerts count: {len(ravi_summary.get('open_alerts', []))}")
    open_alerts = ravi_summary.get("open_alerts", [])
    assert len(open_alerts) > 0, "No open alerts found for Ravi"
    crit_alert = open_alerts[0]
    print(f"Latest alert: id={crit_alert['id']}, severity={crit_alert['severity']}, msg={crit_alert['message']}")
    
    # Ravi acknowledges alert: "I'm on it"
    status, ack_res = req(f"/alerts/{crit_alert['id']}/acknowledge", method="POST", token=ravi_token)
    print(f"Ravi acknowledge status: {status} -> alert status: {ack_res.get('status')}")
    assert status == 200
    assert ack_res.get("status") == "acknowledged"
    
    # Check messages sent in outbox
    status, outbox = req("/admin/outbox", token=ravi_token)
    print(f"Admin outbox messages count: {len(outbox)}")
    print(f"Recent outbox entries: {[{'kind': m.get('kind'), 'to': m.get('to'), 'body': m.get('body')[:50]} for m in outbox[:3]]}")
    assert len(outbox) > 0
    
    # As Lakshmi: check notifications to see "Ravi has seen your alert and is responding"
    status, lakshmi_notifs = req("/notifications", token=lakshmi_token)
    print(f"Lakshmi notifications count: {len(lakshmi_notifs)}")
    print(f"Lakshmi latest notification: {lakshmi_notifs[0] if lakshmi_notifs else 'None'}")
    assert any("Ravi" in n.get("body", "") or "Ravi" in n.get("message", "") for n in lakshmi_notifs), "Lakshmi did not receive acknowledgment notification from Ravi"
    
    # 7. Ravi books appointment; Lakshmi sees it
    print("\n--- Step 7: Ravi books appointment; Lakshmi sees it ---")
    appt_data = {
        "title": "Cardiology Follow-Up",
        "doctor_name": "Dr. Karthik Nair",
        "hospital": "City Care Hospital",
        "scheduled_at": "2026-11-20T10:00:00+05:30",
        "notes": "Bring previous ECG records"
    }
    status, appt_res = req(f"/patients/{lakshmi_id}/appointments", method="POST", token=ravi_token, body=appt_data)
    print(f"Book appointment status: {status} -> id: {appt_res.get('id')}")
    assert status == 201
    
    # Lakshmi queries appointments
    status, lakshmi_appts = req(f"/patients/{lakshmi_id}/appointments", token=lakshmi_token)
    print(f"Lakshmi appointments count: {len(lakshmi_appts)}")
    assert any(a["title"] == "Cardiology Follow-Up" for a in lakshmi_appts)
    print("Found booked appointment on Lakshmi's account!")
    
    print("\n=================== ALL 7 STEPS PASSED PERFECTLY ===================")

if __name__ == "__main__":
    run_demo()
