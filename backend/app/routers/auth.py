"""Registration + login (email/password or Face ID) for patients, doctors and relatives."""
from fastapi import APIRouter, Depends, HTTPException, Request

from ..db import get_db, insert, q1, tx
from ..schemas import FaceLoginIn, LoginIn, RegisterIn
from ..security import (best_face_match, create_token, current_user, hash_password, link_pending_grants,
                        normalize_phone, public_user, verify_password)
from ..protection import audit, check_locked, clear_failures, record_failure
from ..timeutil import iso, now

DUMMY_HASH = hash_password("not-a-real-password-1")
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
def register(body: RegisterIn, request: Request, conn=Depends(get_db)):
    """Create an account. Patients must give at least one emergency contact (name + mobile)."""
    if q1(conn, "SELECT 1 FROM users WHERE email=?", (body.email,)):
        raise HTTPException(409, "This email is already registered - please sign in")
    if body.face_descriptor is not None and len(body.face_descriptor) != 128:
        raise HTTPException(422, "face_descriptor must have 128 numbers (face-api.js)")
    if body.role == "patient" and not body.emergency_contacts:
        raise HTTPException(422, "Add at least one emergency contact (name and mobile number)")
    if body.role == "doctor" and body.doctor_directory_id and not q1(conn, "SELECT 1 FROM doctors WHERE id=?", (body.doctor_directory_id,)):
        raise HTTPException(422, "Unknown doctor_directory_id")
    if body.face_descriptor:
        match, _ = best_face_match(conn, body.face_descriptor)
        if match:
            raise HTTPException(409, "This face is already registered - please sign in with Face ID")

    with tx(conn):
        uid = insert(conn, "users", role=body.role, name=body.name, age=body.age, phone=normalize_phone(body.phone),
                     email=body.email, password_hash=hash_password(body.password), face_descriptor=body.face_descriptor,
                     language=body.language, doctor_directory_id=body.doctor_directory_id,
                     registration_no=body.registration_no, created_at=iso(now()))
        if body.role == "patient":
            insert(conn, "patient_profiles", user_id=uid, conditions=body.conditions, allergies=body.allergies,
                   address=body.address, city=body.city, state=body.state, pincode=body.pincode, hospital_id=body.hospital_id)
            for c in body.emergency_contacts:
                insert(conn, "emergency_contacts", patient_id=uid, name=c.name, phone=normalize_phone(c.phone), relation=c.relation)
                if c.app_access:
                    insert(conn, "access_grants", patient_id=uid, role="relative", name=c.name, phone=normalize_phone(c.phone),
                           email=(c.email or "").lower() or None, relation=c.relation, status="pending", created_at=iso(now()))
            for doc_id in body.doctor_ids:
                if q1(conn, "SELECT 1 FROM doctors WHERE id=?", (doc_id,)):
                    conn.execute("INSERT OR IGNORE INTO care_team (patient_id, doctor_id) VALUES (?,?)", (uid, doc_id))
        else:
            link_pending_grants(conn, {"id": uid, "role": body.role, "email": body.email, "phone": body.phone})

    user = q1(conn, "SELECT * FROM users WHERE id=?", (uid,))
    audit(conn, uid, "register", body.role, request.client.host if request.client else "")
    return {"token": create_token(uid, body.role), "user": public_user(user)}


@router.post("/login")
def login(body: LoginIn, request: Request, conn=Depends(get_db)):
    email = body.email.strip().lower()
    ip = request.client.host if request.client else ""
    check_locked(f"login:{email}")
    user = q1(conn, "SELECT * FROM users WHERE email=?", (email,))
    # always run the hash so response time does not reveal whether the email exists
    ok = verify_password(body.password, user["password_hash"] if user else DUMMY_HASH)
    if not user or not ok:
        record_failure(f"login:{email}")
        audit(conn, user["id"] if user else None, "login_failed", email, ip)
        raise HTTPException(401, "Wrong email or password")
    clear_failures(f"login:{email}")
    audit(conn, user["id"], "login", "password", ip)
    return {"token": create_token(user["id"], user["role"]), "user": public_user(user)}


@router.post("/face-login")
def face_login(body: FaceLoginIn, request: Request, conn=Depends(get_db)):
    """Frontend sends the 128-number face descriptor; we return a token if it matches an enrolled face."""
    if len(body.descriptor) != 128:
        raise HTTPException(422, "descriptor must have 128 numbers")
    ip = request.client.host if request.client else ""
    check_locked(f"face:{ip}")
    user, distance = best_face_match(conn, body.descriptor)
    if not user:
        record_failure(f"face:{ip}")
        audit(conn, None, "face_login_failed", "", ip)
        raise HTTPException(401, "Face not recognised - use email and password")
    clear_failures(f"face:{ip}")
    audit(conn, user["id"], "login", "face", ip)
    return {"token": create_token(user["id"], user["role"]), "user": public_user(user), "match_distance": round(distance, 3)}


@router.get("/me")
def me(user=Depends(current_user)):
    return public_user(user)
