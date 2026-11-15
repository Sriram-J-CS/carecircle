import json
import urllib.request
import urllib.error
import sqlite3

BASE_URL = "http://127.0.0.1:8000"

def seed_demo_accounts():
    print("Seeding canonical demo accounts: lakshmi@carecircle.in, ravi@carecircle.in, dr.karthik@carecircle.in...")
    
    # Clean prior demo data for clean state
    conn = sqlite3.connect("backend/carecircle.db")
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE email IN ('lakshmi@carecircle.in', 'ravi@carecircle.in', 'dr.karthik@carecircle.in')")
    conn.commit()
    conn.close()
    
    lakshmi_face = [0.33] * 128
    
    # 1. Register Lakshmi
    req1 = urllib.request.Request(
        f"{BASE_URL}/auth/register",
        data=json.dumps({
            "role": "patient",
            "name": "Lakshmi",
            "age": 72,
            "phone": "+919876500001",
            "email": "lakshmi@carecircle.in",
            "password": "Password123!",
            "language": "en",
            "face_descriptor": lakshmi_face,
            "conditions": ["Hypertension"],
            "allergies": [],
            "address": "12 Gandhi Road, T Nagar",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "pincode": "600017",
            "hospital_id": 2,
            "doctor_ids": [4],
            "emergency_contacts": [
                {
                    "name": "Ravi",
                    "phone": "+919876500002",
                    "relation": "son",
                    "email": "ravi@carecircle.in",
                    "app_access": True
                }
            ]
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req1) as resp:
        lakshmi_data = json.loads(resp.read().decode("utf-8"))
        lakshmi_token = lakshmi_data["token"]
        lakshmi_id = lakshmi_data["user"]["id"]
        print(f"Lakshmi registered: id={lakshmi_id}")

    # Add 2 medicines for Lakshmi at 08:00
    for med, dosage in [("Telma 40", "1 tablet (40mg)"), ("Metformin 500", "1 tablet (500mg)")]:
        mreq = urllib.request.Request(
            f"{BASE_URL}/patients/{lakshmi_id}/schedules",
            data=json.dumps({
                "medicine_name": med,
                "dosage": dosage,
                "times": ["08:00"],
                "with_food": "after",
                "notes": "Take daily with water"
            }).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {lakshmi_token}"}
        )
        with urllib.request.urlopen(mreq) as mresp:
            print(f"Added schedule: {med}")

    # 2. Register Ravi
    req2 = urllib.request.Request(
        f"{BASE_URL}/auth/register",
        data=json.dumps({
            "role": "relative",
            "name": "Ravi",
            "phone": "+919876500002",
            "email": "ravi@carecircle.in",
            "password": "Password123!",
            "language": "en"
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req2) as resp:
        ravi_data = json.loads(resp.read().decode("utf-8"))
        ravi_token = ravi_data["token"]
        ravi_id = ravi_data["user"]["id"]
        print(f"Ravi registered: id={ravi_id}")

    # 3. Register Doctor
    req3 = urllib.request.Request(
        f"{BASE_URL}/auth/register",
        data=json.dumps({
            "role": "doctor",
            "name": "Dr. Karthik Nair",
            "phone": "+919876500003",
            "email": "dr.karthik@carecircle.in",
            "password": "Password123!",
            "language": "en",
            "doctor_directory_id": 4,
            "registration_no": "MCI-55443"
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req3) as resp:
        doc_data = json.loads(resp.read().decode("utf-8"))
        print(f"Doctor registered: id={doc_data['user']['id']}")

    print("Canonical demo credentials seeded successfully!")

if __name__ == "__main__":
    seed_demo_accounts()
