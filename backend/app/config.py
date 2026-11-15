"""Central configuration. Everything is read from environment variables / .env."""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes")


@dataclass(frozen=True)
class Settings:
    db_path: str = os.getenv("CARECIRCLE_DB", str(BASE_DIR / "carecircle.db"))
    upload_dir: str = os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads"))

    jwt_secret: str = os.getenv("JWT_SECRET", "change-me-in-production-use-a-long-random-string")
    jwt_hours: int = int(os.getenv("JWT_HOURS", "24"))
    face_threshold: float = float(os.getenv("FACE_THRESHOLD", "0.5"))  # face-api.js Euclidean distance

    # AI (optional - the rule engine works without it)
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    low_confidence_cap: int = int(os.getenv("LOW_CONFIDENCE_CAP", "39"))  # AI unsure -> treat as emergency

    # Alerts (optional - without these, messages are only logged in the notifications table)
    twilio_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_from: str = os.getenv("TWILIO_FROM_NUMBER", "")

    # Behaviour
    checkin_interval_hours: int = int(os.getenv("CHECKIN_INTERVAL_HOURS", "6"))
    missed_after_min: int = int(os.getenv("MISSED_AFTER_MIN", "30"))
    early_confirm_min: int = int(os.getenv("EARLY_CONFIRM_MIN", "60"))
    require_proof: bool = _bool("REQUIRE_PROOF", False)  # True = pill video mandatory
    run_scheduler: bool = _bool("RUN_SCHEDULER", True)
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")

    # Security
    app_env: str = os.getenv("APP_ENV", "development")  # development | production
    demo_mode: bool = _bool("DEMO_MODE", True)  # exposes test-dose + outbox helpers; set false in production
    max_body_bytes: int = int(os.getenv("MAX_BODY_BYTES", str(26 * 1024 * 1024)))
    login_max_attempts: int = int(os.getenv("LOGIN_MAX_ATTEMPTS", "5"))
    login_lock_minutes: int = int(os.getenv("LOGIN_LOCK_MINUTES", "15"))
    rate_limit_per_min: int = int(os.getenv("RATE_LIMIT_PER_MIN", "120"))
    auth_rate_limit_per_min: int = int(os.getenv("AUTH_RATE_LIMIT_PER_MIN", "10"))


settings = Settings()

_DEFAULT_SECRET = "change-me-in-production-use-a-long-string"
if settings.app_env == "production":
    if settings.jwt_secret.startswith("change-me") or len(settings.jwt_secret) < 32:
        raise RuntimeError("Refusing to start: set a random JWT_SECRET (>= 32 chars) when APP_ENV=production")
    if "*" in settings.cors_origins:
        raise RuntimeError("Refusing to start: CORS_ORIGINS must list your real frontend URL in production")
