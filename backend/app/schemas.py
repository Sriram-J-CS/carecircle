"""Request bodies (Pydantic)."""
import re
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=10, max_length=16)
    relation: str = "family"
    email: str | None = None
    app_access: bool = True  # lets this person see the patient's dashboard once they register


class RegisterIn(BaseModel):
    role: Literal["patient", "doctor", "relative"]
    name: str = Field(min_length=1, max_length=80)
    age: int | None = Field(None, ge=1, le=120)
    phone: str = Field(min_length=10, max_length=16)
    email: str
    password: str = Field(min_length=6, max_length=100)
    language: str = "en"
    face_descriptor: list[float] | None = None  # 128 numbers from face-api.js

    # patient only
    conditions: list[str] = []
    allergies: list[str] = []
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    emergency_contacts: list[ContactIn] = []
    hospital_id: int | None = None
    doctor_ids: list[int] = []

    # doctor only
    doctor_directory_id: int | None = None
    registration_no: str | None = None

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v) or len(v) > 120:
            raise ValueError("invalid email")
        return v

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        if len(v) < 8 or not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("password must be at least 8 characters with a letter and a number")
        return v

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        if len(re.sub(r"\D", "", v)) < 10:
            raise ValueError("enter a valid 10-digit mobile number")
        return v

    @field_validator("face_descriptor")
    @classmethod
    def _face(cls, v):
        if v is not None and (len(v) != 128 or any(abs(x) > 5 for x in v)):
            raise ValueError("face_descriptor must be 128 sane numbers")
        return v


class LoginIn(BaseModel):
    email: str = Field(max_length=120)
    password: str = Field(max_length=100)


class FaceLoginIn(BaseModel):
    descriptor: list[float] = Field(min_length=128, max_length=128)


class AccessIn(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    relation: str = "family"
    role: Literal["relative", "doctor"] = "relative"


class CareTeamIn(BaseModel):
    doctor_ids: list[int] = []
    hospital_id: int | None = None


class ScheduleIn(BaseModel):
    medicine_name: str = Field(min_length=1, max_length=120)
    dosage: str = "1 tablet"
    times: list[str] = Field(min_length=1)
    with_food: Literal["before", "after", "with", "any"] | None = "any"
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = Field(None, max_length=500)

    @field_validator("times")
    @classmethod
    def _times(cls, v: list[str]) -> list[str]:
        for t in v:
            if not TIME_RE.match(t):
                raise ValueError(f"time must be HH:MM (24h), got {t}")
        return sorted(set(v))


class CheckinIn(BaseModel):
    feeling: int | None = Field(None, ge=1, le=5)  # 1 = very bad ... 5 = great
    pain: int | None = Field(None, ge=0, le=10)
    symptoms: list[str] = []  # keys from GET /checkins/questions
    text: str = Field("", max_length=2000)  # free text / voice transcript
    vitals: dict = {}  # optional: spo2, temp_c, heart_rate, systolic, diastolic, sugar
    language: str | None = None
    trigger: Literal["periodic", "post_med", "manual", "voice"] = "manual"


class OfferResponseIn(BaseModel):
    accept: bool
    pharmacy: str | None = None


class AppointmentIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    doctor_name: str | None = None
    hospital: str | None = None
    scheduled_at: datetime
    notes: str | None = None


class ActivityIn(BaseModel):
    kind: Literal["walking", "exercise", "travel"]
    value: float = Field(gt=0)
    unit: str = "km"


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    language: str | None = None
