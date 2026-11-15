"""SQLite storage. Plain sqlite3 - no ORM, so there is nothing to configure."""
import json
import sqlite3
from contextlib import contextmanager

from .config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK (role IN ('patient','doctor','relative')),
  name TEXT NOT NULL, age INTEGER, phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  face_descriptor TEXT, language TEXT DEFAULT 'en',
  doctor_directory_id INTEGER, registration_no TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, action TEXT NOT NULL, detail TEXT, ip TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS patient_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  conditions TEXT DEFAULT '[]', allergies TEXT DEFAULT '[]',
  address TEXT, city TEXT, state TEXT, pincode TEXT, hospital_id INTEGER
);
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL, phone TEXT NOT NULL, relation TEXT
);
-- who may VIEW a patient: relatives (and doctors added by email). status pending until they register.
CREATE TABLE IF NOT EXISTS access_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id),
  grantee_id INTEGER REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'relative',
  name TEXT, phone TEXT, email TEXT, relation TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS care_team (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id),
  doctor_id INTEGER NOT NULL,
  UNIQUE (patient_id, doctor_id)
);
CREATE TABLE IF NOT EXISTS hospitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, city TEXT, state TEXT, kind TEXT DEFAULT 'private'
);
CREATE INDEX IF NOT EXISTS idx_hospitals_name ON hospitals(name);
CREATE TABLE IF NOT EXISTS doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, specialty TEXT, hospital_id INTEGER,
  city TEXT, state TEXT, is_sample INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(name);
CREATE TABLE IF NOT EXISTS medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, generic TEXT, category TEXT
);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE TABLE IF NOT EXISTS med_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id),
  medicine_name TEXT NOT NULL, dosage TEXT, times TEXT NOT NULL,
  with_food TEXT, start_date TEXT, end_date TEXT, notes TEXT,
  active INTEGER DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS dose_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL REFERENCES med_schedules(id),
  patient_id INTEGER NOT NULL, medicine_name TEXT, dosage TEXT,
  scheduled_for TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|taken|missed|snoozed
  taken_at TEXT, snoozed_until TEXT, proof_path TEXT,
  UNIQUE (schedule_id, scheduled_for)
);
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id),
  trigger TEXT, input TEXT, risk_score INTEGER, level TEXT, analysis TEXT,
  offer_status TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, severity TEXT NOT NULL, message TEXT NOT NULL, ref_id INTEGER,
  status TEXT NOT NULL DEFAULT 'open',  -- open|acknowledged|resolved
  acknowledged_by INTEGER, acknowledged_at TEXT, resolved_by INTEGER, resolved_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id),
  pharmacy TEXT, items TEXT, address TEXT, status TEXT, external_ref TEXT,
  checkin_id INTEGER, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL, doctor_name TEXT, hospital TEXT, scheduled_at TEXT NOT NULL,
  notes TEXT, reminded_24h INTEGER DEFAULT 0, reminded_1h INTEGER DEFAULT 0,
  created_by INTEGER, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL, value REAL NOT NULL, unit TEXT, created_at TEXT NOT NULL
);
-- in-app notifications (user_id set) and outbound SMS/calls (to_addr set)
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, channel TEXT NOT NULL, to_addr TEXT,
  title TEXT, body TEXT, severity TEXT DEFAULT 'info',
  status TEXT DEFAULT 'sent', read INTEGER DEFAULT 0, created_at TEXT NOT NULL
);
"""


def connect() -> sqlite3.Connection:
    # isolation_level=None -> autocommit; use tx() when several writes must succeed together
    conn = sqlite3.connect(settings.db_path, check_same_thread=False, timeout=15, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    conn = connect()
    conn.executescript(SCHEMA)
    conn.close()


def get_db():
    """FastAPI dependency."""
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def tx(conn: sqlite3.Connection):
    conn.execute("BEGIN")
    try:
        yield
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise


def q(conn, sql: str, params: tuple = ()) -> list[dict]:
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def q1(conn, sql: str, params: tuple = ()) -> dict | None:
    row = conn.execute(sql, params).fetchone()
    return dict(row) if row else None


def _enc(v):
    return json.dumps(v) if isinstance(v, (list, dict)) else v


def insert(conn, table: str, **values) -> int:
    cols = ", ".join(values)
    marks = ", ".join("?" for _ in values)
    cur = conn.execute(f"INSERT INTO {table} ({cols}) VALUES ({marks})", tuple(_enc(v) for v in values.values()))
    return cur.lastrowid


def update(conn, table: str, row_id: int, **values) -> None:
    sets = ", ".join(f"{k}=?" for k in values)
    conn.execute(f"UPDATE {table} SET {sets} WHERE id=?", (*[_enc(v) for v in values.values()], row_id))


def jl(value, default=None):
    """Load a JSON text column."""
    if value in (None, ""):
        return default if default is not None else []
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default if default is not None else []
