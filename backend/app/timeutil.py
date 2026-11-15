"""Time helpers. The app is India-only, so everything runs in IST."""
from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))


def now() -> datetime:
    return datetime.now(IST)


def iso(dt: datetime) -> str:
    return dt.astimezone(IST).isoformat(timespec="seconds")


def parse(value: str) -> datetime:
    dt = datetime.fromisoformat(value)
    return dt if dt.tzinfo else dt.replace(tzinfo=IST)


def at_time(hhmm: str, day: datetime | None = None) -> datetime:
    hour, minute = (int(x) for x in hhmm.split(":"))
    return (day or now()).replace(hour=hour, minute=minute, second=0, microsecond=0)
