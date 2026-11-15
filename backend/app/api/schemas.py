from __future__ import annotations
from datetime import date
from pydantic import BaseModel, EmailStr, Field as F, field_validator

DISASTERS = ["flood", "drought", "heavy_rainfall", "cyclone", "hailstorm", "landslide", "other"]


class RegisterIn(BaseModel):
    name: str = F(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = F(default=None, max_length=20)
    password: str = F(min_length=8, max_length=128)
    district: str | None = None
    language: str = "en"
    consent: bool

    @field_validator("consent")
    @classmethod
    def need_consent(cls, v):
        if not v:
            raise ValueError("Consent to data collection and analysis is required")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class SendOtpIn(BaseModel):
    phone: str = F(min_length=10, max_length=15)


class VerifyOtpIn(BaseModel):
    phone: str = F(min_length=10, max_length=15)
    otp: str = F(min_length=4, max_length=8)
    name: str | None = None


class FarmIn(BaseModel):
    name: str = F(min_length=2, max_length=120)
    state: str
    district: str
    taluk: str | None = None
    village: str | None = None
    address: str | None = None


class FieldIn(BaseModel):
    farm_id: int
    name: str = F(min_length=1, max_length=120)
    crop: str | None = None
    season: str | None = None
    sowing_date: date | None = None
    boundary: dict  # GeoJSON Polygon


class ClaimIn(BaseModel):
    field_id: int
    crop_name: str = F(min_length=2, max_length=80)
    variety: str | None = None
    sowing_date: date | None = None
    season: str | None = None
    expected_harvest: date | None = None
    disaster_type: str
    incident_date: date
    duration_days: int | None = F(default=None, ge=0, le=365)
    description: str | None = F(default=None, max_length=4000)
    remarks: str | None = F(default=None, max_length=2000)
    consent: bool = False

    @field_validator("disaster_type")
    @classmethod
    def ok(cls, v):
        if v not in DISASTERS:
            raise ValueError(f"disaster_type must be one of {DISASTERS}")
        return v

    @field_validator("incident_date")
    @classmethod
    def not_future(cls, v):
        if v > date.today():
            raise ValueError("Incident date cannot be in the future")
        return v


class ReviewIn(BaseModel):
    action: str  # start_review | comment | request_evidence | evidence_reviewed | approve | reject | close
    comment: str | None = F(default=None, max_length=3000)


class UserCreateIn(BaseModel):
    name: str
    email: EmailStr
    password: str = F(min_length=8)
    role: str
    district: str | None = None


class ParcelLockIn(BaseModel):
    field_id: int
    coords: list[list[float]]  # list of 4 [lat, lon] points
    reason: str | None = None


class AgentWeightsIn(BaseModel):
    geolocation: float | None = 20.0
    photo_integrity: float | None = 15.0
    satellite: float | None = 25.0
    weather: float | None = 15.0
    land_policy: float | None = 15.0
    fusion_risk: float | None = 10.0


class CropRecordIn(BaseModel):
    crop_name: str = F(min_length=2, max_length=80)
    variety: str | None = None
    season: str = F(min_length=2, max_length=30)
    sowing_date: date | None = None
    harvest_date: date | None = None
    status: str = "sown"
    yield_quintals: float | None = None


class FieldUpdateIn(BaseModel):
    name: str | None = None
    crop: str | None = None
    season: str | None = None
    sowing_date: date | None = None
    boundary: dict | None = None  # GeoJSON Polygon


class ClaimOfficerNoteIn(BaseModel):
    note_type: str = "inspection"  # inspection | clarification_request | review_finding
    content: str = F(min_length=3, max_length=5000)
    action_required_from_farmer: str | None = None


class RequestEvidenceIn(BaseModel):
    action_required: str = F(min_length=5, max_length=2000)
    requested_items: list[str] = []
    officer_instructions: str | None = None


