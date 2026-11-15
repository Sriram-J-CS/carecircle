"""Passwords, JWT, face matching and "who may see which patient" rules."""
import hashlib
import hmac
import math
import os
import re
import time

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings
from .db import get_db, jl, q1

bearer = HTTPBearer(auto_error=False)


# ---------- passwords ----------
def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split("$")
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 200_000)
        return hmac.compare_digest(digest.hex(), digest_hex)
    except ValueError:
        return False


# ---------- JWT ----------
def create_token(user_id: int, role: str) -> str:
    payload = {"sub": str(user_id), "role": role, "iat": int(time.time()), "jti": os.urandom(8).hex(),
               "exp": int(time.time()) + settings.jwt_hours * 3600}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), conn=Depends(get_db)) -> dict:
    if not creds:
        raise HTTPException(401, "Not logged in")
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=["HS256"], options={"require": ["exp", "sub"]})
        user = q1(conn, "SELECT * FROM users WHERE id=?", (int(payload["sub"]),))
        if user and payload.get("role") != user["role"]:
            raise ValueError("role mismatch")
    except (jwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(401, "Invalid or expired token")
    if not user:
        raise HTTPException(401, "User not found")
    return user


def patient_only(user: dict = Depends(current_user)) -> dict:
    if user["role"] != "patient":
        raise HTTPException(403, "Only the patient can do this")
    return user


def public_user(user: dict) -> dict:
    hidden = {"password_hash", "face_descriptor"}
    out = {k: v for k, v in user.items() if k not in hidden}
    out["has_face_id"] = bool(user.get("face_descriptor"))
    return out


# ---------- face ID ----------
def face_distance(a: list[float], b: list[float]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def best_face_match(conn, descriptor: list[float]) -> tuple[dict | None, float]:
    """Compare against every enrolled face. Returns (user, distance) of the closest one under the threshold."""
    best, best_d = None, 9.9
    rows = conn.execute("SELECT * FROM users WHERE face_descriptor IS NOT NULL").fetchall()
    for row in rows:
        stored = jl(row["face_descriptor"])
        if len(stored) != len(descriptor):
            continue
        d = face_distance(stored, descriptor)
        if d < best_d:
            best, best_d = dict(row), d
    if best and best_d <= settings.face_threshold:
        return best, best_d
    return None, best_d


# ---------- phone numbers ----------
def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    return "+91" + digits[-10:] if len(digits) >= 10 else phone


# ---------- access control ----------
def access_level(conn, user: dict, patient_id: int) -> str | None:
    """'self' | 'relative' | 'doctor' | None."""
    if user["role"] == "patient":
        return "self" if user["id"] == patient_id else None
    if user["role"] == "relative":
        ok = q1(conn, "SELECT 1 FROM access_grants WHERE patient_id=? AND grantee_id=? AND role='relative' AND status='active'",
                (patient_id, user["id"]))
        return "relative" if ok else None
    if user["role"] == "doctor":
        via_team = user.get("doctor_directory_id") and q1(
            conn, "SELECT 1 FROM care_team WHERE patient_id=? AND doctor_id=?", (patient_id, user["doctor_directory_id"]))
        via_grant = q1(conn, "SELECT 1 FROM access_grants WHERE patient_id=? AND grantee_id=? AND role='doctor' AND status='active'",
                       (patient_id, user["id"]))
        return "doctor" if (via_team or via_grant) else None
    return None


def require_access(conn, user: dict, patient_id: int, levels=("self", "relative", "doctor")) -> str:
    if not q1(conn, "SELECT 1 FROM users WHERE id=? AND role='patient'", (patient_id,)):
        raise HTTPException(404, "Patient not found")
    level = access_level(conn, user, patient_id)
    if level not in levels:
        raise HTTPException(403, "You do not have access to this patient")
    return level


def link_pending_grants(conn, user: dict) -> None:
    """When a relative/doctor registers, activate any grants the patient created for their email/phone."""
    conn.execute(
        """UPDATE access_grants SET grantee_id=?, status='active'
           WHERE status='pending' AND grantee_id IS NULL AND role=?
             AND ((email IS NOT NULL AND lower(email)=lower(?)) OR (phone IS NOT NULL AND phone=?))""",
        (user["id"], "doctor" if user["role"] == "doctor" else "relative", user["email"], normalize_phone(user["phone"])),
    )
