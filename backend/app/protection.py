"""Request-level protection: security headers, body-size limit, rate limiting, login lockout, audit log."""
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .config import settings
from .db import connect
from .timeutil import iso, now

AUTH_PATHS = ("/auth/login", "/auth/face-login", "/auth/register")
_hits: dict[tuple[str, str], deque] = defaultdict(deque)
_fails: dict[str, list[float]] = defaultdict(list)  # key -> failure timestamps


def reset_state() -> None:
    _hits.clear()
    _fails.clear()


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _too_many(key: tuple[str, str], limit: int) -> bool:
    t = time.time()
    dq = _hits[key]
    while dq and t - dq[0] > 60:
        dq.popleft()
    if len(dq) >= limit:
        return True
    dq.append(t)
    return False


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        length = request.headers.get("content-length")
        if length and length.isdigit() and int(length) > settings.max_body_bytes:
            return JSONResponse({"detail": "Request too large"}, status_code=413)
        ip = _client_ip(request)
        is_auth = request.url.path in AUTH_PATHS and request.method == "POST"
        if is_auth and _too_many((ip, "auth"), settings.auth_rate_limit_per_min):
            return JSONResponse({"detail": "Too many attempts. Please wait a minute."}, status_code=429,
                                headers={"Retry-After": "60"})
        if _too_many((ip, "all"), settings.rate_limit_per_min):
            return JSONResponse({"detail": "Too many requests. Slow down."}, status_code=429, headers={"Retry-After": "60"})
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=()"
        response.headers["Cross-Origin-Resource-Policy"] = "same-site"
        response.headers["Cache-Control"] = "no-store"
        if request.url.path not in ("/docs", "/redoc", "/openapi.json"):
            response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        if settings.app_env == "production":
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response


# ---------- account lockout ----------
def check_locked(key: str) -> None:
    window = settings.login_lock_minutes * 60
    t = time.time()
    _fails[key] = [x for x in _fails[key] if t - x < window]
    if len(_fails[key]) >= settings.login_max_attempts:
        raise HTTPException(429, f"Too many failed attempts. Try again in {settings.login_lock_minutes} minutes.")


def record_failure(key: str) -> None:
    _fails[key].append(time.time())


def clear_failures(key: str) -> None:
    _fails.pop(key, None)


# ---------- audit trail ----------
def audit(conn, user_id: int | None, action: str, detail: str = "", ip: str = "") -> None:
    conn.execute("INSERT INTO audit_log (user_id, action, detail, ip, created_at) VALUES (?,?,?,?,?)",
                 (user_id, action, detail[:300], ip, iso(now())))
