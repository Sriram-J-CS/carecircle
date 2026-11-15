"""Security tests: lockout, rate limit, headers, password policy, uploads, token tampering, access control."""
import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["CARECIRCLE_DB"] = os.path.join(_tmp, "sec.db")
os.environ["UPLOAD_DIR"] = os.path.join(_tmp, "uploads")
os.environ["RUN_SCHEDULER"] = "false"
os.environ["GEMINI_API_KEY"] = ""
os.environ["RATE_LIMIT_PER_MIN"] = "1000"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import protection  # noqa: E402
from app.main import app  # noqa: E402

BASE = {"role": "relative", "name": "Sec", "phone": "9444444444", "email": "sec@example.com", "password": "Secret123"}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset():
    protection.reset_state()


def test_security_headers(client):
    r = client.get("/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert "no-store" in r.headers["cache-control"]


def test_weak_password_rejected(client):
    for bad in ("short1", "alllettersss", "12345678"):
        r = client.post("/auth/register", json={**BASE, "email": f"{bad}@example.com", "password": bad})
        assert r.status_code == 422


def test_login_lockout_after_failures(client):
    assert client.post("/auth/register", json=BASE).status_code == 201
    protection.reset_state()
    codes = [client.post("/auth/login", json={"email": BASE["email"], "password": "Wrong1234"}).status_code for _ in range(5)]
    assert codes == [401] * 5
    assert client.post("/auth/login", json={"email": BASE["email"], "password": BASE["password"]}).status_code == 429


def test_auth_rate_limit(client):
    codes = [client.post("/auth/login", json={"email": f"n{i}@x.com", "password": "Wrong1234"}).status_code for i in range(14)]
    assert 429 in codes


def test_tampered_and_missing_token(client):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer abc.def.ghi"}).status_code == 401


def test_malformed_face_descriptor(client):
    assert client.post("/auth/face-login", json={"descriptor": [0.1] * 5}).status_code == 422
    assert client.post("/auth/face-login", json={"descriptor": [99.0] * 128}).status_code == 401


def test_cors_not_wildcard(client):
    r = client.options("/auth/login", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert r.headers.get("access-control-allow-origin") != "*"
    assert "evil.example" not in r.headers.get("access-control-allow-origin", "")


def test_oversized_body_rejected(client):
    r = client.post("/auth/login", content=b"x", headers={"content-length": str(999_999_999), "content-type": "application/json"})
    assert r.status_code == 413


def test_audit_log_written(client):
    from app.db import connect
    client.post("/auth/login", json={"email": BASE["email"], "password": BASE["password"]})
    rows = connect().execute("SELECT COUNT(*) c FROM audit_log").fetchone()["c"]
    assert rows >= 1
