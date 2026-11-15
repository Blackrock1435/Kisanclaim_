from __future__ import annotations
from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..core.db import Base


def now():
    return datetime.now(timezone.utc)


STATUSES = ["draft", "submitted", "evidence_processing", "analysis_pending", "analysis_completed",
            "under_review", "additional_evidence_required", "approved", "rejected", "closed"]


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), index=True)  # farmer | officer | admin
    language: Mapped[str] = mapped_column(String(5), default="en")
    district: Mapped[Optional[str]] = mapped_column(String(80))
    consent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Farm(Base):
    __tablename__ = "farms"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    state: Mapped[str] = mapped_column(String(80))
    district: Mapped[str] = mapped_column(String(80))
    taluk: Mapped[Optional[str]] = mapped_column(String(80))
    village: Mapped[Optional[str]] = mapped_column(String(80))
    address: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    fields: Mapped[list["Field"]] = relationship(back_populates="farm", cascade="all, delete-orphan")


class Field(Base):
    __tablename__ = "fields"
    id: Mapped[int] = mapped_column(primary_key=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    crop: Mapped[Optional[str]] = mapped_column(String(80))
    season: Mapped[Optional[str]] = mapped_column(String(30))
    sowing_date: Mapped[Optional[date]] = mapped_column(Date)
    area_ha: Mapped[float] = mapped_column(Float)
    boundary: Mapped[dict] = mapped_column(JSON)  # GeoJSON Polygon, EPSG:4326 (PostGIS upgrade path in docs)
    centroid_lat: Mapped[float] = mapped_column(Float)
    centroid_lon: Mapped[float] = mapped_column(Float)
    digipin: Mapped[Optional[str]] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    farm: Mapped[Farm] = relationship(back_populates="fields")


class Claim(Base):
    __tablename__ = "claims"
    id: Mapped[int] = mapped_column(primary_key=True)
    ref: Mapped[Optional[str]] = mapped_column(String(24), unique=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id"), index=True)
    officer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), index=True)
    crop_name: Mapped[str] = mapped_column(String(80))
    variety: Mapped[Optional[str]] = mapped_column(String(80))
    sowing_date: Mapped[Optional[date]] = mapped_column(Date)
    season: Mapped[Optional[str]] = mapped_column(String(30))
    expected_harvest: Mapped[Optional[date]] = mapped_column(Date)
    disaster_type: Mapped[str] = mapped_column(String(30), index=True)
    incident_date: Mapped[date] = mapped_column(Date)
    duration_days: Mapped[Optional[int]] = mapped_column(Integer)
    description: Mapped[Optional[str]] = mapped_column(Text)
    remarks: Mapped[Optional[str]] = mapped_column(Text)
    claimed_area_ha: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    claimed_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)
    consent: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    field: Mapped[Field] = relationship()
    farmer: Mapped[User] = relationship(foreign_keys=[farmer_id])
    officer: Mapped[Optional[User]] = relationship(foreign_keys=[officer_id])


class ClaimEvent(Base):
    """Traceable status history."""
    __tablename__ = "claim_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    actor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    from_status: Mapped[Optional[str]] = mapped_column(String(32))
    to_status: Mapped[str] = mapped_column(String(32))
    note: Mapped[Optional[str]] = mapped_column(Text)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Evidence(Base):
    __tablename__ = "evidence"
    id: Mapped[int] = mapped_column(primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    stored_path: Mapped[str] = mapped_column(String(500))
    mime: Mapped[str] = mapped_column(String(40))
    size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    exif_lat: Mapped[Optional[float]] = mapped_column(Float)
    exif_lon: Mapped[Optional[float]] = mapped_column(Float)
    exif_taken_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Analysis(Base):
    """Satellite + weather results, one row per run (history kept)."""
    __tablename__ = "analyses"
    id: Mapped[int] = mapped_column(primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(12))  # satellite | weather
    status: Mapped[str] = mapped_column(String(24))  # completed | unavailable | config_required | demo
    source: Mapped[str] = mapped_column(String(120))
    data: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Assessment(Base):
    __tablename__ = "assessments"
    __table_args__ = (UniqueConstraint("claim_id", "version"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    rule_version: Mapped[str] = mapped_column(String(20))
    category: Mapped[str] = mapped_column(String(60))
    data: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("assessments.id", ondelete="CASCADE"), index=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    path: Mapped[str] = mapped_column(String(500))
    sha256: Mapped[str] = mapped_column(String(64))
    verify_code: Mapped[str] = mapped_column(String(32), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[int] = mapped_column(primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    officer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(30))
    comment: Mapped[Optional[str]] = mapped_column(Text)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    officer: Mapped[User] = relationship()


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[Optional[str]] = mapped_column(Text)
    claim_id: Mapped[Optional[int]] = mapped_column(ForeignKey("claims.id", ondelete="SET NULL"))
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(60), index=True)
    entity: Mapped[Optional[str]] = mapped_column(String(40))
    entity_id: Mapped[Optional[int]] = mapped_column(Integer)
    detail: Mapped[Optional[str]] = mapped_column(Text)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)


class ParcelVersion(Base):
    """Historical versioning of locked agricultural field boundaries."""
    __tablename__ = "parcel_versions"
    id: Mapped[int] = mapped_column(primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    boundary: Mapped[dict] = mapped_column(JSON)
    centroid_lat: Mapped[float] = mapped_column(Float)
    centroid_lon: Mapped[float] = mapped_column(Float)
    centroid_digipin: Mapped[str] = mapped_column(String(10))
    corner_digipins: Mapped[list] = mapped_column(JSON)  # array of 4 DIGIPINs
    area_ha: Mapped[float] = mapped_column(Float)
    area_acres: Mapped[float] = mapped_column(Float)
    reason: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class GeoCameraEvidence(Base):
    """Anti-tamper Live GeoCamera telemetry and geofence verification."""
    __tablename__ = "geocamera_evidence"
    id: Mapped[int] = mapped_column(primary_key=True)
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id", ondelete="CASCADE"), index=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    gps_lat: Mapped[Optional[float]] = mapped_column(Float)
    gps_lon: Mapped[Optional[float]] = mapped_column(Float)
    gps_accuracy_m: Mapped[Optional[float]] = mapped_column(Float)
    digipin: Mapped[Optional[str]] = mapped_column(String(10))
    distance_to_parcel_m: Mapped[Optional[float]] = mapped_column(Float)
    geofence_status: Mapped[str] = mapped_column(String(32))  # inside | within_400m | beyond_400m | gps_unavailable
    client_captured_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    server_uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    sha256_hash: Mapped[str] = mapped_column(String(64), index=True)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_of_id: Mapped[Optional[int]] = mapped_column(ForeignKey("geocamera_evidence.id"), nullable=True)
    tamper_flags: Mapped[dict] = mapped_column(JSON, default=dict)


class SatelliteTwinAnalysis(Base):
    """Sentinel-2 Level-2A before/after comparison with NDVI and NDWI indicators."""
    __tablename__ = "satellite_twin_analyses"
    id: Mapped[int] = mapped_column(primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id", ondelete="CASCADE"), index=True)
    pre_date: Mapped[date] = mapped_column(Date)
    post_date: Mapped[date] = mapped_column(Date)
    cloud_pct_pre: Mapped[Optional[float]] = mapped_column(Float)
    cloud_pct_post: Mapped[Optional[float]] = mapped_column(Float)
    pre_ndvi: Mapped[Optional[float]] = mapped_column(Float)
    post_ndvi: Mapped[Optional[float]] = mapped_column(Float)
    ndvi_change_pct: Mapped[Optional[float]] = mapped_column(Float)
    pre_ndwi: Mapped[Optional[float]] = mapped_column(Float)
    post_ndwi: Mapped[Optional[float]] = mapped_column(Float)
    ndwi_formula: Mapped[str] = mapped_column(String(80), default="Gao 1996 (B8-B11)/(B8+B11)")
    imagery_status: Mapped[str] = mapped_column(String(32), default="available")
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AgentExecution(Base):
    """Traceable execution outputs of the 6 Autonomous AI Verification Agents."""
    __tablename__ = "agent_executions"
    id: Mapped[int] = mapped_column(primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    farmer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    execution_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    agent_name: Mapped[str] = mapped_column(String(60), index=True)
    status: Mapped[str] = mapped_column(String(30))  # success | warning | anomaly_detected | missing_evidence | error
    score: Mapped[float] = mapped_column(Float)  # 0 to 100
    weight: Mapped[float] = mapped_column(Float)  # default weight (e.g. 20, 15, 25, 15, 15, 10)
    weighted_score: Mapped[float] = mapped_column(Float)
    risk_flags: Mapped[list] = mapped_column(JSON, default=list)
    findings: Mapped[dict] = mapped_column(JSON, default=dict)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class DossierVerification(Base):
    """Cryptographic verification tokens and SHA-256 validation for PDF Evidence Dossiers."""
    __tablename__ = "dossier_verifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    pdf_path: Mapped[str] = mapped_column(String(500))
    sha256_hash: Mapped[str] = mapped_column(String(64))
    report_version: Mapped[int] = mapped_column(Integer, default=1)
    verified_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class FarmerOtp(Base):
    """Secure OTP tracking for Farmer mobile verification."""
    __tablename__ = "farmer_otps"
    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(20), index=True)
    otp_hash: Mapped[str] = mapped_column(String(128))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    resend_available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class IntegrationConfig(Base):
    """Real external data service integration management."""
    __tablename__ = "integration_configs"
    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    provider: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(30), default="config_required")  # connected | degraded | config_required | error
    capabilities: Mapped[list] = mapped_column(JSON, default=list)
    config_data: Mapped[dict] = mapped_column(JSON, default=dict)
    last_tested_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class CropRecord(Base):
    """Historical crop cultivation and harvest records per field."""
    __tablename__ = "crop_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id", ondelete="CASCADE"), index=True)
    crop_name: Mapped[str] = mapped_column(String(80))
    variety: Mapped[Optional[str]] = mapped_column(String(80))
    season: Mapped[str] = mapped_column(String(30))  # Kharif | Rabi | Zaid
    sowing_date: Mapped[Optional[date]] = mapped_column(Date)
    harvest_date: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="sown")  # sown | vegetative | flowering | harvested | damaged
    yield_quintals: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ClaimOfficerNote(Base):
    """Structured inspection and clarification notes submitted by underwriters and field officers."""
    __tablename__ = "claim_officer_notes"
    id: Mapped[int] = mapped_column(primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    officer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    note_type: Mapped[str] = mapped_column(String(40))  # inspection | clarification_request | review_finding
    content: Mapped[str] = mapped_column(Text)
    action_required_from_farmer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class PlatformConfig(Base):
    """Platform-wide system configuration settings (agent weights, thresholds, feature flags)."""
    __tablename__ = "platform_configs"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class InsurancePolicy(Base):
    """PMFBY Actuarial Insurance Policy coverage and underwriting schedule."""
    __tablename__ = "insurance_policies"
    id: Mapped[int] = mapped_column(primary_key=True)
    policy_number: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    field_id: Mapped[Optional[int]] = mapped_column(ForeignKey("fields.id", ondelete="SET NULL"), nullable=True, index=True)
    insurance_company: Mapped[str] = mapped_column(String(120), default="Agriculture Insurance Company of India (AIC)")
    scheme_name: Mapped[str] = mapped_column(String(120), default="Pradhan Mantri Fasal Bima Yojana (PMFBY)")
    crop_name: Mapped[str] = mapped_column(String(80))
    season: Mapped[str] = mapped_column(String(30), default="Kharif 2024")
    year: Mapped[int] = mapped_column(Integer, default=2024)
    sum_insured_per_ha: Mapped[float] = mapped_column(Float, default=65000.0)
    insured_area_ha: Mapped[float] = mapped_column(Float, default=2.0)
    indemnity_level: Mapped[float] = mapped_column(Float, default=90.0)  # 70%, 80%, or 90%
    threshold_yield_kg_ha: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    actual_yield_kg_ha: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    coverage_category: Mapped[str] = mapped_column(String(50), default="localized_calamity")
    premium_farmer: Mapped[float] = mapped_column(Float, default=1300.0)
    premium_govt: Mapped[float] = mapped_column(Float, default=5200.0)
    status: Mapped[str] = mapped_column(String(30), default="active")
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    farmer: Mapped[User] = relationship(foreign_keys=[farmer_id])
    field: Mapped[Optional[Field]] = relationship(foreign_keys=[field_id])


class InsuranceAssessment(Base):
    """Underwriter and Competent Authority Assessment, estimated payout, and approval record."""
    __tablename__ = "insurance_assessments"
    id: Mapped[int] = mapped_column(primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    policy_id: Mapped[Optional[int]] = mapped_column(ForeignKey("insurance_policies.id", ondelete="SET NULL"), nullable=True, index=True)
    policy_number: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    sum_insured_per_ha: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    insured_area_ha: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    claimed_area_ha: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    claimed_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_estimated_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_calculation_method: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)  # PMFBY_LOCALIZED_CALAMITY | AREA_YIELD_SHORTFALL | NOT_CALCULABLE
    ai_calculation_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    completeness_pct: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)  # draft | submitted_for_approval | approved | modified_approved | rejected | returned_for_evidence
    officer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    recommended_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    assessed_damage_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    assessed_eligible_area_ha: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    deduction_amount: Mapped[float] = mapped_column(Float, default=0.0)
    officer_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    officer_difference_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    officer_assessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    admin_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    approved_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    admin_decision: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)  # approved | modified_approved | rejected | returned
    admin_decision_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    admin_modification_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    admin_decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    supersedes_id: Mapped[Optional[int]] = mapped_column(ForeignKey("insurance_assessments.id"), nullable=True)
    execution_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pdf_token: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    pdf_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    claim: Mapped[Claim] = relationship()
    farmer: Mapped[User] = relationship(foreign_keys=[farmer_id])
    officer: Mapped[Optional[User]] = relationship(foreign_keys=[officer_id])
    admin: Mapped[Optional[User]] = relationship(foreign_keys=[admin_id])
    policy: Mapped[Optional[InsurancePolicy]] = relationship(foreign_keys=[policy_id])


class SettlementRecord(Base):
    """DBT Payment and Claim Disbursement tracking under PMFBY."""
    __tablename__ = "settlement_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("insurance_assessments.id", ondelete="CASCADE"), index=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    payout_amount: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(40), default="NOT_APPROVED", index=True)  # NOT_APPROVED | APPROVED_AWAITING_PAYMENT | PAYMENT_PROCESSING | PAID | PAYMENT_FAILED | ON_HOLD
    payment_method: Mapped[str] = mapped_column(String(40), default="DBT_AADHAAR")
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    account_number_masked: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    ifsc_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    transaction_reference: Mapped[Optional[str]] = mapped_column(String(80), nullable=True, index=True)
    disbursed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    assessment: Mapped[InsuranceAssessment] = relationship()
    claim: Mapped[Claim] = relationship()
    farmer: Mapped[User] = relationship(foreign_keys=[farmer_id])


class PaymentStatusHistory(Base):
    """Immutable audit trail for insurance payment and disbursement state transitions."""
    __tablename__ = "payment_status_histories"
    id: Mapped[int] = mapped_column(primary_key=True)
    settlement_id: Mapped[int] = mapped_column(ForeignKey("settlement_records.id", ondelete="CASCADE"), index=True)
    from_status: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    to_status: Mapped[str] = mapped_column(String(40))
    changed_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reference_number: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)




