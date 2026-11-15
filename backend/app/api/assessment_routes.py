"""PMFBY AI Insurance Assessment, Actuarial Payout Recommendation,
and Officer/Admin Approval Workflow API.
"""
from __future__ import annotations
import hashlib
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field as PydanticField
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..core.db import get_db
from ..core.security import current_user, require_roles
from ..models.models import (
    Claim, Field as FarmField, Farm, User, Evidence, GeoCameraEvidence,
    SatelliteTwinAnalysis, Analysis, AgentExecution, DossierVerification,
    InsurancePolicy, InsuranceAssessment, SettlementRecord, PaymentStatusHistory,
    AuditLog, ClaimOfficerNote
)
from ..services.common import audit, notify
from ..services.payout_engine import calculate_payout_estimate, get_or_create_default_policy

router = APIRouter(prefix="/api/assessments", tags=["insurance assessments & approvals"])


# ---------------- Pydantic Request Models ----------------
class SaveDraftAssessmentIn(BaseModel):
    recommended_amount: Optional[float] = None
    assessed_damage_pct: Optional[float] = None
    assessed_eligible_area_ha: Optional[float] = None
    deduction_amount: float = 0.0
    officer_remarks: Optional[str] = None
    officer_difference_reason: Optional[str] = None


class SubmitAssessmentIn(BaseModel):
    recommended_amount: float
    assessed_damage_pct: float
    assessed_eligible_area_ha: float
    deduction_amount: float = 0.0
    officer_remarks: str
    officer_difference_reason: Optional[str] = None
    declaration_accepted: bool = True


class AdminDecisionIn(BaseModel):
    decision: str  # approve | modify | reject | return_for_evidence
    approved_amount: Optional[float] = None
    modification_reason: Optional[str] = None
    rejection_reason: Optional[str] = None
    remarks: Optional[str] = None


class UpdatePaymentStatusIn(BaseModel):
    status: str  # APPROVED_AWAITING_PAYMENT | PAYMENT_PROCESSING | PAID | PAYMENT_FAILED | ON_HOLD
    transaction_reference: Optional[str] = None
    failure_reason: Optional[str] = None
    notes: Optional[str] = None


# ---------------- 1. DASHBOARD STATS ----------------
@router.get("/stats")
def get_assessment_stats(u: User = Depends(current_user), db: Session = Depends(get_db)):
    """Aggregate statistics for Insurance Officer & Admin Assessment Dashboard."""
    total_claims = db.query(Claim).count()
    awaiting_assessment = (
        db.query(Claim)
        .filter(Claim.status.in_(["submitted", "analysis_completed", "evidence_processing"]))
        .count()
    )
    under_officer_review = (
        db.query(Claim)
        .filter(Claim.status == "under_review")
        .count()
    )
    submitted_for_approval = (
        db.query(InsuranceAssessment)
        .filter(InsuranceAssessment.status == "submitted_for_approval")
        .count()
    )
    approved_count = (
        db.query(InsuranceAssessment)
        .filter(InsuranceAssessment.status.in_(["approved", "modified_approved"]))
        .count()
    )
    rejected_count = (
        db.query(InsuranceAssessment)
        .filter(InsuranceAssessment.status == "rejected")
        .count()
    )

    # Calculate financial totals
    ai_estimated_total = db.query(func.sum(InsuranceAssessment.ai_estimated_amount)).scalar() or 0.0
    approved_payout_total = db.query(func.sum(InsuranceAssessment.approved_amount)).scalar() or 0.0

    # Settlement tracking
    settlements_awaiting = (
        db.query(SettlementRecord)
        .filter(SettlementRecord.status == "APPROVED_AWAITING_PAYMENT")
        .count()
    )
    settlements_processing = (
        db.query(SettlementRecord)
        .filter(SettlementRecord.status == "PAYMENT_PROCESSING")
        .count()
    )
    settlements_paid = (
        db.query(SettlementRecord)
        .filter(SettlementRecord.status == "PAID")
        .count()
    )

    return {
        "total_claims": total_claims,
        "awaiting_assessment": awaiting_assessment,
        "under_officer_review": under_officer_review,
        "submitted_for_approval": submitted_for_approval,
        "approved_count": approved_count,
        "rejected_count": rejected_count,
        "total_estimated_payout": round(ai_estimated_total, 2),
        "total_approved_payout": round(approved_payout_total, 2),
        "settlements": {
            "awaiting_payment": settlements_awaiting,
            "processing": settlements_processing,
            "paid": settlements_paid,
        }
    }


# ---------------- 2. CLAIMS LIST FOR ASSESSMENT ----------------
@router.get("")
def list_claims_for_assessment(
    q: Optional[str] = None,
    district: Optional[str] = None,
    crop: Optional[str] = None,
    disaster: Optional[str] = None,
    status: Optional[str] = None,
    verification_status: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    u: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """List claims with multi-attribute filtering, AI verification signals, and assessment states."""
    query = db.query(Claim)

    if u.role == "farmer":
        query = query.filter(Claim.farmer_id == u.id)

    if district:
        query = query.join(Claim.field).join(FarmField.farm).filter(Farm.district.ilike(f"%{district}%"))
    if crop:
        query = query.filter(Claim.crop_name.ilike(f"%{crop}%"))
    if disaster:
        query = query.filter(Claim.disaster_type.ilike(f"%{disaster}%"))
    if status:
        query = query.filter(Claim.status == status)

    if q and q.strip():
        term = q.strip()
        conds = [
            Claim.crop_name.ilike(f"%{term}%"),
            Claim.disaster_type.ilike(f"%{term}%"),
            Claim.ref.ilike(f"%{term}%"),
        ]
        if term.isdigit():
            conds.append(Claim.id == int(term))
            conds.append(Claim.farmer_id == int(term))
        query = query.join(Claim.farmer).filter(or_(*conds, User.name.ilike(f"%{term}%"), User.phone.ilike(f"%{term}%")))

    total = query.count()
    claims = query.order_by(Claim.id.desc()).offset((page - 1) * limit).limit(limit).all()

    items = []
    for c in claims:
        farmer = c.farmer
        field = c.field
        farm = field.farm if field else None

        # Count evidence
        ev_count = db.query(Evidence).filter(Evidence.claim_id == c.id).count()
        geo_count = db.query(GeoCameraEvidence).filter(GeoCameraEvidence.claim_id == c.id).count()

        # AI verification findings
        fusion = (
            db.query(AgentExecution)
            .filter(AgentExecution.claim_id == c.id, AgentExecution.agent_name == "fusion_risk")
            .order_by(AgentExecution.id.desc())
            .first()
        )

        # Assessment record
        assessment = (
            db.query(InsuranceAssessment)
            .filter(InsuranceAssessment.claim_id == c.id)
            .order_by(InsuranceAssessment.id.desc())
            .first()
        )

        # Settlement record
        settlement = (
            db.query(SettlementRecord)
            .filter(SettlementRecord.claim_id == c.id)
            .order_by(SettlementRecord.id.desc())
            .first()
        )

        items.append({
            "id": c.id,
            "ref": c.ref or f"KC-2026-00010{c.id}",
            "crop_name": c.crop_name,
            "variety": c.variety,
            "disaster_type": c.disaster_type,
            "incident_date": c.incident_date.isoformat() if c.incident_date else None,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "farmer": {
                "id": farmer.id if farmer else c.farmer_id,
                "name": farmer.name if farmer else f"Farmer #{c.farmer_id}",
                "phone": farmer.phone if farmer else None,
                "district": farmer.district if farmer else (farm.district if farm else "Karnataka"),
                "village": farm.village if farm else None,
            },
            "field": {
                "id": field.id if field else c.field_id,
                "name": field.name if field else "Unknown Field",
                "area_ha": field.area_ha if field else 0.0,
                "digipin": field.digipin if field else "4T396F42L7",
            },
            "evidence": {
                "photo_count": ev_count + geo_count,
                "has_geocamera": geo_count > 0,
            },
            "ai_verification": {
                "has_run": fusion is not None,
                "score": fusion.score if fusion else None,
                "outcome_category": fusion.findings.get("outcome_category") if fusion else None,
                "recommendation": fusion.findings.get("recommendation") if fusion else None,
            },
            "assessment": {
                "id": assessment.id if assessment else None,
                "status": assessment.status if assessment else "pending",
                "ai_estimated_amount": assessment.ai_estimated_amount if assessment else None,
                "recommended_amount": assessment.recommended_amount if assessment else None,
                "approved_amount": assessment.approved_amount if assessment else None,
                "assessed_damage_pct": assessment.assessed_damage_pct if assessment else None,
            },
            "settlement": {
                "status": settlement.status if settlement else "NOT_APPROVED",
                "payout_amount": settlement.payout_amount if settlement else None,
            }
        })

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": items
    }


# ---------------- 3. SINGLE CLAIM ASSESSMENT CONTEXT ----------------
@router.get("/claim/{claim_id}")
def get_claim_assessment_context(
    claim_id: int,
    u: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Retrieve complete claim assessment dossier context, AI scores, policy, and existing drafts."""
    claim = db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")
    if u.role == "farmer" and claim.farmer_id != u.id:
        raise HTTPException(403, "Access forbidden: you do not own this claim")

    farmer = claim.farmer
    field = claim.field
    farm = field.farm if field else None

    # Retrieve or auto-provision PMFBY policy
    policy = get_or_create_default_policy(db, claim)

    # Evidence photos
    evs = db.query(Evidence).filter(Evidence.claim_id == claim.id).order_by(Evidence.id.asc()).all()
    geo_evs = db.query(GeoCameraEvidence).filter(GeoCameraEvidence.claim_id == claim.id).all()
    geo_map = {g.evidence_id: g for g in geo_evs}

    photos_data = []
    for e in evs:
        g = geo_map.get(e.id)
        photos_data.append({
            "id": e.id,
            "filename": e.filename,
            "size": e.size,
            "size_mb": round(e.size / (1024 * 1024), 2) if e.size else 0.0,
            "mime": e.mime,
            "sha256": e.sha256,
            "lat": e.exif_lat or (g.gps_lat if g else None),
            "lon": e.exif_lon or (g.gps_lon if g else None),
            "taken_at": e.exif_taken_at.isoformat() if e.exif_taken_at else None,
            "uploaded_at": e.uploaded_at.isoformat() if e.uploaded_at else None,
            "file_url": f"/api/evidence/{e.id}/file",
            "is_geocamera": g is not None,
            "geofence_status": g.geofence_status if g else "standard_upload",
            "distance_to_parcel_m": g.distance_to_parcel_m if g else None,
            "digipin": g.digipin if g else None,
            "tamper_flags": g.tamper_flags if g else {},
        })

    # AI Verification Agent Executions (latest run)
    agent_execs = (
        db.query(AgentExecution)
        .filter(AgentExecution.claim_id == claim.id)
        .order_by(AgentExecution.id.desc())
        .limit(6)
        .all()
    )
    # Order them canonically
    order_map = {"geolocation": 1, "photo_integrity": 2, "satellite": 3, "weather": 4, "land_policy": 5, "fusion_risk": 6}
    agent_execs.sort(key=lambda x: order_map.get(x.agent_name, 99))

    fusion = next((x for x in agent_execs if x.agent_name == "fusion_risk"), None)

    # AI Payout Estimation Engine run
    payout_estimate = calculate_payout_estimate(db, claim, policy, agent_execs)

    # Existing Assessment Draft or Completed
    assessment = (
        db.query(InsuranceAssessment)
        .filter(InsuranceAssessment.claim_id == claim.id)
        .order_by(InsuranceAssessment.id.desc())
        .first()
    )

    officer_user = db.get(User, assessment.officer_id) if assessment and assessment.officer_id else None
    admin_user = db.get(User, assessment.admin_id) if assessment and assessment.admin_id else None

    # Settlement record
    settlement = (
        db.query(SettlementRecord)
        .filter(SettlementRecord.claim_id == claim.id)
        .order_by(SettlementRecord.id.desc())
        .first()
    )

    # Dossier verification record
    dossier = (
        db.query(DossierVerification)
        .filter(DossierVerification.claim_id == claim.id)
        .order_by(DossierVerification.id.desc())
        .first()
    )

    assessment_data = None
    if assessment:
        assessment_data = {
            "id": assessment.id,
            "version": assessment.version,
            "status": assessment.status,
            "ai_estimated_amount": assessment.ai_estimated_amount,
            "ai_calculation_method": assessment.ai_calculation_method,
            "ai_calculation_breakdown": assessment.ai_calculation_breakdown,
            "recommended_amount": assessment.recommended_amount,
            "assessed_damage_pct": assessment.assessed_damage_pct,
            "assessed_eligible_area_ha": assessment.assessed_eligible_area_ha,
            "deduction_amount": assessment.deduction_amount,
            "officer_remarks": assessment.officer_remarks,
            "officer_difference_reason": assessment.officer_difference_reason,
            "officer_id": assessment.officer_id,
            "officer_name": officer_user.name if officer_user else None,
            "officer_assessed_at": assessment.officer_assessed_at.isoformat() if assessment.officer_assessed_at else None,
            "approved_amount": assessment.approved_amount,
            "admin_decision": assessment.admin_decision,
            "admin_decision_remarks": assessment.admin_decision_remarks,
            "admin_modification_reason": assessment.admin_modification_reason,
            "admin_id": assessment.admin_id,
            "admin_name": admin_user.name if admin_user else None,
            "admin_decided_at": assessment.admin_decided_at.isoformat() if assessment.admin_decided_at else None,
            "pdf_token": assessment.pdf_token,
            "pdf_url": f"/api/reports/download/{assessment.pdf_token}" if assessment.pdf_token else None,
            "verification_url": f"/verify-report/{assessment.pdf_token}" if assessment.pdf_token else None,
        }

    return {
        "claim": {
            "id": claim.id,
            "ref": claim.ref or f"KC-2026-00010{claim.id}",
            "crop_name": claim.crop_name,
            "variety": claim.variety,
            "season": claim.season or "Kharif 2024",
            "sowing_date": claim.sowing_date.isoformat() if claim.sowing_date else None,
            "incident_date": claim.incident_date.isoformat() if claim.incident_date else None,
            "disaster_type": claim.disaster_type,
            "duration_days": claim.duration_days,
            "status": claim.status,
            "description": claim.description,
            "remarks": claim.remarks,
            "claimed_area_ha": claim.claimed_area_ha or (field.area_ha if field else 0.0),
            "claimed_amount": claim.claimed_amount or (round((field.area_ha or 1.0) * (policy.sum_insured_per_ha or 65000.0) * 0.7, 2) if policy else 50000.0),
        },
        "farmer": {
            "id": farmer.id if farmer else claim.farmer_id,
            "name": farmer.name if farmer else f"Farmer #{claim.farmer_id}",
            "phone": farmer.phone if farmer else "+91 Registered",
            "email": farmer.email if farmer else None,
            "district": farmer.district if farmer else (farm.district if farm else "Karnataka"),
            "village": farm.village if farm else "Rural Area",
        },
        "field": {
            "id": field.id if field else claim.field_id,
            "name": field.name if field else "Field #1",
            "area_ha": field.area_ha if field else 2.0,
            "digipin": field.digipin if field else "4T396F42L7",
            "centroid_lat": field.centroid_lat if field else 13.1118,
            "centroid_lon": field.centroid_lon if field else 80.2026,
            "boundary": field.boundary if field else None,
        },
        "policy": {
            "id": policy.id if policy else None,
            "policy_number": policy.policy_number if policy else "PMFBY/KA/2026/BLR-001",
            "insurance_company": policy.insurance_company if policy else "Agriculture Insurance Company of India (AIC)",
            "scheme_name": policy.scheme_name if policy else "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
            "crop_name": policy.crop_name if policy else claim.crop_name,
            "season": policy.season if policy else "Kharif 2024",
            "sum_insured_per_ha": policy.sum_insured_per_ha if policy else 65000.0,
            "insured_area_ha": policy.insured_area_ha if policy else 2.0,
            "indemnity_level": policy.indemnity_level if policy else 90.0,
            "coverage_category": policy.coverage_category if policy else "localized_calamity",
            "premium_farmer": policy.premium_farmer if policy else 1300.0,
            "premium_govt": policy.premium_govt if policy else 5200.0,
            "status": policy.status if policy else "active",
        },
        "photos": photos_data,
        "ai_agents": [{
            "id": e.id,
            "agent_name": e.agent_name,
            "status": e.status,
            "score": e.score,
            "weight": e.weight,
            "weighted_score": e.weighted_score,
            "risk_flags": e.risk_flags,
            "findings": e.findings,
            "duration_ms": e.duration_ms,
            "executed_at": e.executed_at.isoformat(),
        } for e in agent_execs],
        "fusion_summary": {
            "score": fusion.score if fusion else 75.0,
            "outcome_category": fusion.findings.get("outcome_category", "LOW RISK") if fusion else "LOW RISK",
            "recommendation": fusion.findings.get("recommendation", "Eligible for assessment") if fusion else "Eligible",
            "evidence_completeness_pct": fusion.findings.get("evidence_completeness_pct", 85.0) if fusion else 85.0,
        },
        "payout_estimate": payout_estimate,
        "assessment": assessment_data,
        "settlement": {
            "id": settlement.id if settlement else None,
            "status": settlement.status if settlement else "NOT_APPROVED",
            "payout_amount": settlement.payout_amount if settlement else None,
            "payment_method": settlement.payment_method if settlement else "DBT_AADHAAR",
            "transaction_reference": settlement.transaction_reference if settlement else None,
            "disbursed_at": settlement.disbursed_at.isoformat() if settlement and settlement.disbursed_at else None,
            "failure_reason": settlement.failure_reason if settlement else None,
        } if settlement else None,
        "dossier": {
            "token": dossier.token if dossier else None,
            "url": f"/api/reports/download/{dossier.token}" if dossier else None,
            "verify_url": f"/verify-report/{dossier.token}" if dossier else None,
            "sha256": dossier.sha256_hash if dossier else None,
        } if dossier else None,
    }


# ---------------- 4. RECALCULATE AI PAYOUT ESTIMATE ----------------
@router.post("/claim/{claim_id}/calculate")
def recalculate_claim_payout(
    claim_id: int,
    u: User = Depends(require_roles("officer", "admin")),
    db: Session = Depends(get_db)
):
    """Run real-time actuarial payout calculation engine for a claim."""
    claim = db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")

    policy = get_or_create_default_policy(db, claim)
    estimate = calculate_payout_estimate(db, claim, policy)

    return {
        "success": True,
        "claim_id": claim.id,
        "estimate": estimate
    }


# ---------------- 5. OFFICER SAVE ASSESSMENT DRAFT ----------------
@router.post("/claim/{claim_id}/save-draft")
def save_assessment_draft(
    claim_id: int,
    p: SaveDraftAssessmentIn,
    u: User = Depends(require_roles("officer", "admin")),
    db: Session = Depends(get_db)
):
    """Save an editable assessment draft without submitting for approval."""
    claim = db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")

    policy = get_or_create_default_policy(db, claim)
    estimate = calculate_payout_estimate(db, claim, policy)

    assessment = (
        db.query(InsuranceAssessment)
        .filter(InsuranceAssessment.claim_id == claim.id, InsuranceAssessment.status == "draft")
        .first()
    )

    now_dt = datetime.now(timezone.utc)
    if not assessment:
        assessment = InsuranceAssessment(
            claim_id=claim.id,
            farmer_id=claim.farmer_id,
            policy_id=policy.id if policy else None,
            policy_number=policy.policy_number if policy else None,
            sum_insured_per_ha=policy.sum_insured_per_ha if policy else None,
            insured_area_ha=policy.insured_area_ha if policy else None,
            claimed_area_ha=claim.claimed_area_ha or (claim.field.area_ha if claim.field else None),
            claimed_amount=claim.claimed_amount,
            ai_estimated_amount=estimate.get("estimated_amount"),
            ai_calculation_method=estimate.get("method"),
            ai_calculation_breakdown=estimate.get("breakdown", {}),
            status="draft",
            officer_id=u.id,
            recommended_amount=p.recommended_amount if p.recommended_amount is not None else estimate.get("estimated_amount"),
            assessed_damage_pct=p.assessed_damage_pct if p.assessed_damage_pct is not None else estimate.get("loss_percentage"),
            assessed_eligible_area_ha=p.assessed_eligible_area_ha if p.assessed_eligible_area_ha is not None else estimate.get("eligible_area_ha"),
            deduction_amount=p.deduction_amount,
            officer_remarks=p.officer_remarks,
            officer_difference_reason=p.officer_difference_reason,
            officer_assessed_at=now_dt,
            created_at=now_dt,
            updated_at=now_dt,
        )
        db.add(assessment)
    else:
        if p.recommended_amount is not None:
            assessment.recommended_amount = p.recommended_amount
        if p.assessed_damage_pct is not None:
            assessment.assessed_damage_pct = p.assessed_damage_pct
        if p.assessed_eligible_area_ha is not None:
            assessment.assessed_eligible_area_ha = p.assessed_eligible_area_ha
        assessment.deduction_amount = p.deduction_amount
        assessment.officer_remarks = p.officer_remarks
        assessment.officer_difference_reason = p.officer_difference_reason
        assessment.officer_id = u.id
        assessment.officer_assessed_at = now_dt
        assessment.updated_at = now_dt

    if claim.status in ("submitted", "analysis_completed"):
        claim.status = "under_review"

    db.commit()
    db.refresh(assessment)

    return {
        "success": True,
        "message": "Assessment draft saved successfully",
        "assessment_id": assessment.id,
        "status": assessment.status,
        "recommended_amount": assessment.recommended_amount,
    }


# ---------------- 6. OFFICER SUBMIT RECOMMENDATION FOR APPROVAL ----------------
@router.post("/claim/{claim_id}/submit")
def submit_assessment_for_approval(
    claim_id: int,
    p: SubmitAssessmentIn,
    u: User = Depends(require_roles("officer", "admin")),
    db: Session = Depends(get_db)
):
    """Submit statutory officer assessment recommendation for Competent Authority / Admin Approval."""
    claim = db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")

    if not p.declaration_accepted:
        raise HTTPException(422, "Underwriting declaration must be accepted prior to submission.")

    if p.recommended_amount < 0:
        raise HTTPException(422, "Recommended payout amount cannot be negative.")

    if not (0.0 <= p.assessed_damage_pct <= 100.0):
        raise HTTPException(422, "Assessed damage percentage must be between 0% and 100%.")

    if p.assessed_eligible_area_ha <= 0:
        raise HTTPException(422, "Assessed eligible area must be greater than zero.")

    if not p.officer_remarks or not p.officer_remarks.strip():
        raise HTTPException(422, "Underwriter inspection remarks are mandatory.")

    policy = get_or_create_default_policy(db, claim)
    estimate = calculate_payout_estimate(db, claim, policy)
    ai_est = estimate.get("estimated_amount", 0.0)

    # If recommended amount differs by more than 10% from AI estimate, difference reason is required
    diff_pct = abs(p.recommended_amount - ai_est) / (ai_est or 1.0)
    if diff_pct > 0.10 and (not p.officer_difference_reason or not p.officer_difference_reason.strip()):
        raise HTTPException(
            422,
            f"Recommended amount (₹{p.recommended_amount:,.2f}) diverges by {diff_pct * 100:.1f}% from AI estimate (₹{ai_est:,.2f}). "
            "A specific reason for the difference is statutory requirement."
        )

    # Locate existing draft or create new
    assessment = (
        db.query(InsuranceAssessment)
        .filter(InsuranceAssessment.claim_id == claim.id)
        .order_by(InsuranceAssessment.id.desc())
        .first()
    )

    now_dt = datetime.now(timezone.utc)
    if not assessment or assessment.status in ("approved", "modified_approved", "rejected"):
        # Version increment
        ver = (assessment.version + 1) if assessment else 1
        assessment = InsuranceAssessment(
            claim_id=claim.id,
            farmer_id=claim.farmer_id,
            policy_id=policy.id if policy else None,
            policy_number=policy.policy_number if policy else None,
            sum_insured_per_ha=policy.sum_insured_per_ha if policy else None,
            insured_area_ha=policy.insured_area_ha if policy else None,
            claimed_area_ha=claim.claimed_area_ha or (claim.field.area_ha if claim.field else None),
            claimed_amount=claim.claimed_amount,
            ai_estimated_amount=ai_est,
            ai_calculation_method=estimate.get("method"),
            ai_calculation_breakdown=estimate.get("breakdown", {}),
            status="submitted_for_approval",
            officer_id=u.id,
            recommended_amount=p.recommended_amount,
            assessed_damage_pct=p.assessed_damage_pct,
            assessed_eligible_area_ha=p.assessed_eligible_area_ha,
            deduction_amount=p.deduction_amount,
            officer_remarks=p.officer_remarks.strip(),
            officer_difference_reason=p.officer_difference_reason.strip() if p.officer_difference_reason else None,
            officer_assessed_at=now_dt,
            version=ver,
            created_at=now_dt,
            updated_at=now_dt,
        )
        db.add(assessment)
    else:
        assessment.recommended_amount = p.recommended_amount
        assessment.assessed_damage_pct = p.assessed_damage_pct
        assessment.assessed_eligible_area_ha = p.assessed_eligible_area_ha
        assessment.deduction_amount = p.deduction_amount
        assessment.officer_remarks = p.officer_remarks.strip()
        assessment.officer_difference_reason = p.officer_difference_reason.strip() if p.officer_difference_reason else None
        assessment.status = "submitted_for_approval"
        assessment.officer_id = u.id
        assessment.officer_assessed_at = now_dt
        assessment.updated_at = now_dt

    claim.status = "under_review"

    # Add audit log
    audit_entry = AuditLog(
        actor_id=u.id,
        action="assessment.submit_for_approval",
        entity="claim",
        entity_id=claim.id,
        detail=f"Officer recommended payout: ₹{p.recommended_amount:,.2f} for damage: {p.assessed_damage_pct}%.",
        at=now_dt,
    )
    db.add(audit_entry)

    # Save note
    note = ClaimOfficerNote(
        claim_id=claim.id,
        officer_id=u.id,
        note_type="review_finding",
        content=f"Assessment submitted for approval. Recommended: ₹{p.recommended_amount:,.2f}. Remarks: {p.officer_remarks}",
        created_at=now_dt,
    )
    db.add(note)

    db.commit()
    db.refresh(assessment)

    return {
        "success": True,
        "message": "Assessment successfully submitted for Competent Authority approval",
        "assessment_id": assessment.id,
        "claim_id": claim.id,
        "status": assessment.status,
        "recommended_amount": assessment.recommended_amount,
    }


# ---------------- 7. ADMIN APPROVAL / MODIFICATION / REJECTION ----------------
@router.post("/{assessment_id}/admin-decision")
def make_admin_decision(
    assessment_id: int,
    p: AdminDecisionIn,
    u: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """Admin / Competent Authority adjudication: Approve, Modify Amount, Reject, or Return."""
    assessment = db.get(InsuranceAssessment, assessment_id)
    if not assessment:
        raise HTTPException(404, "Assessment record not found")

    claim = db.get(Claim, assessment.claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")

    now_dt = datetime.now(timezone.utc)
    decision = p.decision.lower()

    if decision not in ("approve", "modify", "reject", "return_for_evidence"):
        raise HTTPException(422, f"Invalid decision: '{decision}'. Must be approve, modify, reject, or return_for_evidence.")

    if decision == "modify":
        if p.approved_amount is None or p.approved_amount < 0:
            raise HTTPException(422, "Approved amount is required and cannot be negative when modifying amount.")
        if not p.modification_reason or not p.modification_reason.strip():
            raise HTTPException(422, "Mandatory justification is required when modifying underwriter's recommended amount.")
        final_amount = p.approved_amount
        admin_decision_code = "modified_approved"
        assessment_status = "modified_approved"
        claim.status = "approved"

    elif decision == "approve":
        final_amount = assessment.recommended_amount or 0.0
        admin_decision_code = "approved"
        assessment_status = "approved"
        claim.status = "approved"

    elif decision == "reject":
        if not p.rejection_reason or not p.rejection_reason.strip():
            raise HTTPException(422, "Mandatory statutory rejection reason is required.")
        final_amount = 0.0
        admin_decision_code = "rejected"
        assessment_status = "rejected"
        claim.status = "rejected"

    elif decision == "return_for_evidence":
        if not p.remarks or not p.remarks.strip():
            raise HTTPException(422, "Instructions for additional evidence or officer clarification are required.")
        final_amount = 0.0
        admin_decision_code = "returned"
        assessment_status = "returned_for_evidence"
        claim.status = "additional_evidence_required"

    # Update assessment record
    assessment.admin_id = u.id
    assessment.approved_amount = final_amount
    assessment.admin_decision = admin_decision_code
    assessment.status = assessment_status
    assessment.admin_decision_remarks = p.remarks or (p.rejection_reason if decision == "reject" else None)
    assessment.admin_modification_reason = p.modification_reason if decision == "modify" else None
    assessment.admin_decided_at = now_dt
    assessment.updated_at = now_dt

    # Settlement Record management
    settlement = (
        db.query(SettlementRecord)
        .filter(SettlementRecord.claim_id == claim.id)
        .order_by(SettlementRecord.id.desc())
        .first()
    )

    if decision in ("approve", "modify"):
        # Auto-provision or update settlement in APPROVED_AWAITING_PAYMENT state (NEVER marked PAID automatically)
        if not settlement:
            settlement = SettlementRecord(
                assessment_id=assessment.id,
                claim_id=claim.id,
                farmer_id=claim.farmer_id,
                payout_amount=final_amount,
                status="APPROVED_AWAITING_PAYMENT",
                payment_method="DBT_AADHAAR",
                bank_name="Canara Bank (PMFBY Direct Benefit)",
                account_number_masked="XXXX-XXXX-4819",
                ifsc_code="CNRB0000124",
                created_at=now_dt,
                updated_at=now_dt,
            )
            db.add(settlement)
            db.flush()
        else:
            settlement.assessment_id = assessment.id
            settlement.payout_amount = final_amount
            settlement.status = "APPROVED_AWAITING_PAYMENT"
            settlement.updated_at = now_dt

        # Log PaymentStatusHistory
        psh = PaymentStatusHistory(
            settlement_id=settlement.id,
            from_status=None,
            to_status="APPROVED_AWAITING_PAYMENT",
            changed_by_user_id=u.id,
            notes=f"Admin approved payout: ₹{final_amount:,.2f}. Ready for DBT disbursement queue.",
            created_at=now_dt,
        )
        db.add(psh)

        # Generate and attach cryptographic PDF Dossier
        try:
            token = uuid.uuid4().hex
            s = get_settings()
            reports_dir = os.path.join(s.upload_dir, "reports")
            os.makedirs(reports_dir, exist_ok=True)
            pdf_filename = f"dossier_{claim.ref or claim.id}_{token[:8]}.pdf"
            pdf_path = os.path.join(reports_dir, pdf_filename)

            from ..reports.pdf import generate_advanced_dossier_pdf
            generate_advanced_dossier_pdf(db, claim, pdf_path, token)

            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()
            pdf_hash = hashlib.sha256(pdf_bytes).hexdigest()

            assessment.pdf_path = pdf_path
            assessment.pdf_token = token
            assessment.pdf_hash = pdf_hash

            dv = DossierVerification(
                claim_id=claim.id,
                token=token,
                pdf_path=pdf_path,
                sha256_hash=pdf_hash,
                report_version=assessment.version,
                created_at=now_dt,
            )
            db.add(dv)
        except Exception as e:
            # Non-blocking for PDF generation failure
            pass

    elif decision == "reject":
        if settlement:
            settlement.status = "NOT_APPROVED"
            settlement.failure_reason = p.rejection_reason
            settlement.updated_at = now_dt

    elif decision == "return_for_evidence":
        # Add note to farmer
        note = ClaimOfficerNote(
            claim_id=claim.id,
            officer_id=u.id,
            note_type="clarification_request",
            content=f"Claim returned by Competent Authority for additional ground evidence: {p.remarks}",
            action_required_from_farmer="Please upload additional geotagged photos of damaged crop using Live GeoCamera.",
            created_at=now_dt,
        )
        db.add(note)

    # Audit log
    audit_entry = AuditLog(
        actor_id=u.id,
        action=f"assessment.{admin_decision_code}",
        entity="claim",
        entity_id=claim.id,
        detail=f"Admin decision: {admin_decision_code.upper()} for Claim #{claim.ref or claim.id}. Approved Amount: ₹{final_amount:,.2f}.",
        at=now_dt,
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(assessment)

    return {
        "success": True,
        "message": f"Admin decision '{admin_decision_code}' recorded successfully",
        "assessment_id": assessment.id,
        "claim_id": claim.id,
        "decision": admin_decision_code,
        "approved_amount": final_amount,
        "pdf_token": assessment.pdf_token,
        "verification_url": f"/verify-report/{assessment.pdf_token}" if assessment.pdf_token else None,
    }


# ---------------- 8. FARMER / OFFICER SETTLEMENT STATUS ----------------
@router.get("/claim/{claim_id}/settlement")
def get_claim_settlement_status(
    claim_id: int,
    u: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Fetch transparent settlement and DBT payment status for a claim (privacy-preserving for farmers)."""
    claim = db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")

    if u.role == "farmer" and claim.farmer_id != u.id:
        raise HTTPException(403, "Access forbidden")

    settlement = (
        db.query(SettlementRecord)
        .filter(SettlementRecord.claim_id == claim.id)
        .order_by(SettlementRecord.id.desc())
        .first()
    )

    assessment = (
        db.query(InsuranceAssessment)
        .filter(InsuranceAssessment.claim_id == claim.id)
        .order_by(InsuranceAssessment.id.desc())
        .first()
    )

    dossier = (
        db.query(DossierVerification)
        .filter(DossierVerification.claim_id == claim.id)
        .order_by(DossierVerification.id.desc())
        .first()
    )

    status_val = settlement.status if settlement else ("APPROVED_AWAITING_PAYMENT" if claim.status == "approved" else "NOT_APPROVED")
    approved_amt = (settlement.payout_amount if settlement else None) or (assessment.approved_amount if assessment else None) or 0.0

    # Decision explanation: sanitized for farmer view (no internal fraud scores or sensitive notes)
    if claim.status == "approved" or (assessment and assessment.status in ("approved", "modified_approved")):
        explanation = (
            f"Your PMFBY claim has been approved for a statutory payout of ₹{approved_amt:,.2f}. "
            "The amount is sanctioned under Direct Benefit Transfer (DBT) to your Aadhaar-linked bank account."
        )
    elif claim.status == "rejected" or (assessment and assessment.status == "rejected"):
        explanation = (
            f"Your claim could not be sanctioned under PMFBY guidelines. "
            f"Reason: {assessment.admin_decision_remarks if assessment else 'Damage criteria not satisfied'}"
        )
    elif claim.status == "additional_evidence_required":
        explanation = "Additional ground photographs or field evidence have been requested by the inspection committee."
    else:
        explanation = "Your claim is currently under active scientific verification and underwriter review."

    return {
        "claim_id": claim.id,
        "ref": claim.ref or f"KC-2026-00010{claim.id}",
        "is_approved": claim.status == "approved" or (assessment is not None and assessment.status in ("approved", "modified_approved")),
        "settlement_status": status_val,
        "approved_amount": approved_amt,
        "damage_pct": assessment.assessed_damage_pct if assessment else None,
        "decision_explanation": explanation,
        "payment_method": settlement.payment_method if settlement else "DBT_AADHAAR",
        "bank_name": settlement.bank_name if settlement else "Canara Bank (Aadhaar Seeded)",
        "account_number_masked": settlement.account_number_masked if settlement else "XXXX-XXXX-4819",
        "ifsc_code": settlement.ifsc_code if settlement else "CNRB0000124",
        "transaction_reference": settlement.transaction_reference if settlement else None,
        "disbursed_at": settlement.disbursed_at.isoformat() if settlement and settlement.disbursed_at else None,
        "dossier_token": dossier.token if dossier else (assessment.pdf_token if assessment else None),
        "dossier_download_url": f"/api/reports/download/{dossier.token}" if dossier else (f"/api/reports/download/{assessment.pdf_token}" if assessment and assessment.pdf_token else None),
        "dossier_verify_url": f"/verify-report/{dossier.token}" if dossier else (f"/verify-report/{assessment.pdf_token}" if assessment and assessment.pdf_token else None),
    }


# ---------------- 9. UPDATE PAYMENT STATUS (DBT DISBURSEMENT) ----------------
@router.post("/claim/{claim_id}/update-payment")
def update_claim_payment_status(
    claim_id: int,
    p: UpdatePaymentStatusIn,
    u: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """Update DBT settlement payment status (APPROVED_AWAITING_PAYMENT, PAYMENT_PROCESSING, PAID, PAYMENT_FAILED, ON_HOLD)."""
    claim = db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")

    valid_statuses = ("APPROVED_AWAITING_PAYMENT", "PAYMENT_PROCESSING", "PAID", "PAYMENT_FAILED", "ON_HOLD")
    if p.status not in valid_statuses:
        raise HTTPException(422, f"Invalid status: '{p.status}'. Must be one of {valid_statuses}")

    settlement = (
        db.query(SettlementRecord)
        .filter(SettlementRecord.claim_id == claim.id)
        .order_by(SettlementRecord.id.desc())
        .first()
    )

    now_dt = datetime.now(timezone.utc)
    if not settlement:
        assessment = (
            db.query(InsuranceAssessment)
            .filter(InsuranceAssessment.claim_id == claim.id)
            .order_by(InsuranceAssessment.id.desc())
            .first()
        )
        amt = assessment.approved_amount if assessment and assessment.approved_amount else 25000.0
        settlement = SettlementRecord(
            assessment_id=assessment.id if assessment else 0,
            claim_id=claim.id,
            farmer_id=claim.farmer_id,
            payout_amount=amt,
            status=p.status,
            payment_method="DBT_AADHAAR",
            bank_name="Canara Bank (Aadhaar Seeded)",
            account_number_masked="XXXX-XXXX-4819",
            ifsc_code="CNRB0000124",
            transaction_reference=p.transaction_reference,
            disbursed_at=now_dt if p.status == "PAID" else None,
            failure_reason=p.failure_reason,
            created_at=now_dt,
            updated_at=now_dt,
        )
        db.add(settlement)
        db.flush()
    else:
        old_status = settlement.status
        settlement.status = p.status
        if p.transaction_reference:
            settlement.transaction_reference = p.transaction_reference
        if p.failure_reason:
            settlement.failure_reason = p.failure_reason
        if p.status == "PAID" and not settlement.disbursed_at:
            settlement.disbursed_at = now_dt
        settlement.updated_at = now_dt

    # Immutable PaymentStatusHistory
    psh = PaymentStatusHistory(
        settlement_id=settlement.id,
        from_status=old_status if 'old_status' in locals() else None,
        to_status=p.status,
        changed_by_user_id=u.id,
        notes=p.notes,
        reference_number=p.transaction_reference,
        created_at=now_dt,
    )
    db.add(psh)

    # Audit log
    audit_entry = AuditLog(
        actor_id=u.id,
        action=f"payment.{p.status.lower()}",
        entity="settlement",
        entity_id=settlement.id,
        detail=f"Disbursement payment status updated to {p.status}. Ref: {p.transaction_reference or 'N/A'}.",
        at=now_dt,
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(settlement)

    return {
        "success": True,
        "message": f"Payment status successfully updated to {p.status}",
        "settlement_id": settlement.id,
        "status": settlement.status,
        "transaction_reference": settlement.transaction_reference,
        "disbursed_at": settlement.disbursed_at.isoformat() if settlement.disbursed_at else None,
    }


# ---------------- 10. GENERATE MULTI-PAGE PDF DOSSIER ----------------
@router.post("/claim/{claim_id}/generate-dossier")
def generate_assessment_dossier_pdf(
    claim_id: int,
    u: User = Depends(require_roles("officer", "admin")),
    db: Session = Depends(get_db)
):
    """Generate official multi-page PDF Evidence Dossier with QR verification seal."""
    claim = db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")

    token = uuid.uuid4().hex
    s = get_settings()
    reports_dir = os.path.join(s.upload_dir, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    pdf_filename = f"dossier_{claim.ref or claim.id}_{token[:8]}.pdf"
    pdf_path = os.path.join(reports_dir, pdf_filename)

    now_dt = datetime.now(timezone.utc)

    from ..reports.pdf import generate_advanced_dossier_pdf
    generate_advanced_dossier_pdf(db, claim, pdf_path, token)

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()
    pdf_hash = hashlib.sha256(pdf_bytes).hexdigest()

    # Link to latest assessment if one exists
    assessment = (
        db.query(InsuranceAssessment)
        .filter(InsuranceAssessment.claim_id == claim.id)
        .order_by(InsuranceAssessment.id.desc())
        .first()
    )
    if assessment:
        assessment.pdf_path = pdf_path
        assessment.pdf_token = token
        assessment.pdf_hash = pdf_hash
        assessment.updated_at = now_dt

    dv = DossierVerification(
        claim_id=claim.id,
        token=token,
        pdf_path=pdf_path,
        sha256_hash=pdf_hash,
        report_version=assessment.version if assessment else 1,
        created_at=now_dt,
    )
    db.add(dv)
    db.commit()

    return {
        "success": True,
        "claim_id": claim.id,
        "token": token,
        "sha256_hash": pdf_hash,
        "download_url": f"/api/reports/download/{token}",
        "verify_url": f"/verify-report/{token}",
        "created_at": dv.created_at.isoformat(),
    }
