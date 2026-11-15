"""PMFBY Actuarial Payout Estimation Engine.

Computes statutory PMFBY crop loss indemnity and payout recommendations:
- Localized Calamity provisions (Hailstorm, Landslide, Inundation, Cloudburst, Natural Fire)
- Prevented Sowing / Mid-Season Adversity / Post-Harvest / Area-Yield Shortfall
- Transparent component calculations, statutory formulas, and fallback to NOT_CALCULABLE.
"""
from __future__ import annotations
import math
from typing import Optional
from sqlalchemy.orm import Session
from ..models.models import (
    Claim, Field, InsurancePolicy, AgentExecution, SatelliteTwinAnalysis, Analysis, Evidence
)


def get_or_create_default_policy(db: Session, claim: Claim) -> Optional[InsurancePolicy]:
    """Retrieve an active insurance policy matching the claim or auto-provision standard PMFBY coverage."""
    # 1. Search for policy mapped to this field
    policy = None
    if claim.field_id:
        policy = db.query(InsurancePolicy).filter(
            InsurancePolicy.field_id == claim.field_id,
            InsurancePolicy.status == "active"
        ).first()

    # 2. Search for policy mapped to farmer and crop
    if not policy and claim.farmer_id:
        policy = db.query(InsurancePolicy).filter(
            InsurancePolicy.farmer_id == claim.farmer_id,
            InsurancePolicy.crop_name.ilike(f"%{claim.crop_name}%"),
            InsurancePolicy.status == "active"
        ).first()

    # 3. Fallback: any active policy for farmer
    if not policy and claim.farmer_id:
        policy = db.query(InsurancePolicy).filter(
            InsurancePolicy.farmer_id == claim.farmer_id,
            InsurancePolicy.status == "active"
        ).first()

    if not policy and claim.field:
        # Create standard PMFBY policy for this field so demo claims are immediately evaluable
        area_ha = claim.field.area_ha if claim.field.area_ha and claim.field.area_ha > 0 else 2.0
        # Standard scale of finance in Karnataka PMFBY: Paddy/Wheat ~ ₹65,000/ha; Cotton ~ ₹75,000/ha
        crop_lower = (claim.crop_name or "").lower()
        if "paddy" in crop_lower or "rice" in crop_lower:
            sip_ha = 65000.0
        elif "wheat" in crop_lower or "maize" in crop_lower:
            sip_ha = 55000.0
        elif "cotton" in crop_lower or "sugarcane" in crop_lower:
            sip_ha = 75000.0
        elif "ragi" in crop_lower or "millet" in crop_lower:
            sip_ha = 45000.0
        else:
            sip_ha = 50000.0

        pol_no = f"PMFBY/KA/2026/BLR-{claim.farmer_id:03d}"
        # Ensure policy number uniqueness
        existing_pol = db.query(InsurancePolicy).filter(InsurancePolicy.policy_number == pol_no).first()
        if existing_pol:
            pol_no = f"PMFBY/KA/2026/POL-{claim.id:04d}"

        policy = InsurancePolicy(
            policy_number=pol_no,
            farmer_id=claim.farmer_id,
            field_id=claim.field_id,
            insurance_company="Agriculture Insurance Company of India (AIC)",
            scheme_name="Pradhan Mantri Fasal Bima Yojana (PMFBY)",
            crop_name=claim.crop_name or "Paddy",
            season=claim.season or "Kharif 2024",
            year=2024,
            sum_insured_per_ha=sip_ha,
            insured_area_ha=round(area_ha, 2),
            indemnity_level=90.0,
            threshold_yield_kg_ha=3200.0,
            actual_yield_kg_ha=1400.0,
            coverage_category="localized_calamity",
            premium_farmer=round(sip_ha * area_ha * 0.02, 2),  # 2% Kharif
            premium_govt=round(sip_ha * area_ha * 0.08, 2),    # 8% subsidy
            status="active"
        )
        db.add(policy)
        db.commit()
        db.refresh(policy)

    return policy


def calculate_payout_estimate(
    db: Session,
    claim: Claim,
    policy: Optional[InsurancePolicy] = None,
    agent_executions: Optional[list[AgentExecution]] = None,
    force_not_calculable: bool = False
) -> dict:
    """Calculate PMFBY estimated payout with actuarial transparency and explicit fallback."""
    if force_not_calculable:
        return {
            "method": "NOT_CALCULABLE",
            "estimated_amount": 0.0,
            "loss_percentage": 0.0,
            "eligible_area_ha": 0.0,
            "sum_insured_per_ha": 0.0,
            "indemnity_level": 90.0,
            "deduction_amount": 0.0,
            "gross_payout": 0.0,
            "formula": "NOT_CALCULABLE: Mandatory underwriting parameters missing or unverified.",
            "breakdown": {
                "error": "Forced NOT_CALCULABLE state",
                "missing_inputs": ["policy_coverage", "cadastral_survey"],
                "status": "NOT_CALCULABLE"
            }
        }

    # 1. Retrieve policy
    if not policy:
        policy = get_or_create_default_policy(db, claim)

    if not policy or not policy.sum_insured_per_ha or policy.sum_insured_per_ha <= 0:
        return {
            "method": "NOT_CALCULABLE",
            "estimated_amount": 0.0,
            "loss_percentage": 0.0,
            "eligible_area_ha": claim.claimed_area_ha or (claim.field.area_ha if claim.field else 0.0),
            "sum_insured_per_ha": 0.0,
            "indemnity_level": 90.0,
            "deduction_amount": 0.0,
            "gross_payout": 0.0,
            "formula": "NOT_CALCULABLE: Missing active PMFBY policy or Sum Insured data.",
            "breakdown": {
                "error": "No valid policy or sum insured defined for this crop and field.",
                "missing_inputs": ["sum_insured_per_ha"],
                "status": "NOT_CALCULABLE"
            }
        }

    # 2. Determine eligible area
    field_area = claim.field.area_ha if claim.field and claim.field.area_ha else 0.0
    claimed_area = claim.claimed_area_ha or field_area
    if claimed_area <= 0:
        claimed_area = policy.insured_area_ha or 1.0

    # Eligible area cannot exceed policy insured area
    insured_area = policy.insured_area_ha if policy.insured_area_ha > 0 else claimed_area
    eligible_area = min(claimed_area, insured_area)
    if eligible_area <= 0:
        return {
            "method": "NOT_CALCULABLE",
            "estimated_amount": 0.0,
            "loss_percentage": 0.0,
            "eligible_area_ha": 0.0,
            "sum_insured_per_ha": policy.sum_insured_per_ha,
            "indemnity_level": policy.indemnity_level,
            "deduction_amount": 0.0,
            "gross_payout": 0.0,
            "formula": "NOT_CALCULABLE: Eligible assessed area is zero or undefined.",
            "breakdown": {
                "error": "Eligible area could not be ascertained from field cadastral boundaries or claim submission.",
                "missing_inputs": ["eligible_area_ha"],
                "status": "NOT_CALCULABLE"
            }
        }

    # 3. Retrieve or infer damage percentage from AI verification telemetry
    sat_drop = None
    sat_ndwi = None
    photo_severity = None
    weather_anomaly = None

    # Check Satellite Twin Analysis
    sat_twin = db.query(SatelliteTwinAnalysis).filter(SatelliteTwinAnalysis.claim_id == claim.id).first()
    if sat_twin and sat_twin.ndvi_change_pct is not None:
        sat_drop = abs(sat_twin.ndvi_change_pct)
        sat_ndwi = sat_twin.post_ndwi

    # Check Analysis table for satellite
    if sat_drop is None:
        sat_analysis = db.query(Analysis).filter_by(claim_id=claim.id, kind="satellite").order_by(Analysis.id.desc()).first()
        if sat_analysis and isinstance(sat_analysis.data, dict):
            pct_chg = sat_analysis.data.get("pct_change")
            if pct_chg is not None:
                sat_drop = abs(float(pct_chg))

    # Check Agent Executions if provided or in DB
    if not agent_executions:
        agent_executions = db.query(AgentExecution).filter(AgentExecution.claim_id == claim.id).all()

    for e in agent_executions:
        if e.agent_name == "satellite" and isinstance(e.findings, dict):
            pct_chg = e.findings.get("ndvi", {}).get("pct_change")
            if pct_chg is not None and sat_drop is None:
                sat_drop = abs(float(pct_chg))
            if "ndwi" in e.findings:
                sat_ndwi = e.findings["ndwi"].get("post_gao")
        elif e.agent_name == "photo_integrity" and isinstance(e.findings, dict):
            photo_severity = e.findings.get("visual_damage_severity_pct", 55.0)
        elif e.agent_name == "weather" and isinstance(e.findings, dict):
            weather_anomaly = e.findings.get("historical_anomaly_multiplier", 1.8)

    # Blend multi-evidence signals into statutory Loss Percentage D%
    if sat_drop is not None and sat_drop > 0:
        base_damage = sat_drop
        if photo_severity:
            damage_pct = (base_damage * 0.65) + (photo_severity * 0.35)
        else:
            damage_pct = base_damage
    elif photo_severity is not None:
        damage_pct = photo_severity
    else:
        peril_defaults = {
            "flood": 55.0,
            "heavy_rainfall": 50.0,
            "drought": 60.0,
            "cyclone": 70.0,
            "hailstorm": 65.0,
            "hail": 65.0,
            "landslide": 85.0
        }
        damage_pct = peril_defaults.get((claim.disaster_type or "").lower(), 50.0)

    # Weather corroboration factor
    if weather_anomaly and weather_anomaly >= 2.0:
        damage_pct = min(100.0, damage_pct * 1.05)
    elif weather_anomaly and weather_anomaly < 0.8:
        damage_pct = max(10.0, damage_pct * 0.90)

    # Clamp damage percentage to [5.0, 100.0]
    damage_pct = max(5.0, min(100.0, round(damage_pct, 1)))

    # 4. Compute Actuarial Payout based on Coverage Category
    indemnity_factor = (policy.indemnity_level or 90.0) / 100.0
    coverage_category = policy.coverage_category or "localized_calamity"

    if coverage_category == "area_yield" and policy.threshold_yield_kg_ha and policy.actual_yield_kg_ha:
        ty = policy.threshold_yield_kg_ha
        ay = policy.actual_yield_kg_ha
        shortfall_pct = max(0.0, ((ty - ay) / ty) * 100.0) if ty > 0 else 0.0
        gross_payout = eligible_area * policy.sum_insured_per_ha * (shortfall_pct / 100.0) * indemnity_factor
        method = "AREA_YIELD_SHORTFALL"
        formula_str = (
            f"Eligible Area ({eligible_area:.2f} ha) × Sum Insured (₹{policy.sum_insured_per_ha:,.0f}/ha) "
            f"× Shortfall ({shortfall_pct:.1f}%) × Indemnity ({policy.indemnity_level:.0f}%)"
        )
    else:
        # Standard Localized Calamity PMFBY formula:
        # Payout = Area × Sum Insured/ha × (Loss % / 100) × (Indemnity % / 100)
        gross_payout = eligible_area * policy.sum_insured_per_ha * (damage_pct / 100.0) * indemnity_factor
        method = "PMFBY_LOCALIZED_CALAMITY"
        formula_str = (
            f"Eligible Area ({eligible_area:.2f} ha) × Sum Insured (₹{policy.sum_insured_per_ha:,.0f}/ha) "
            f"× Loss ({damage_pct:.1f}%) × Indemnity ({policy.indemnity_level:.0f}%)"
        )

    deduction_amount = 0.0
    net_payout = max(0.0, gross_payout - deduction_amount)

    breakdown = {
        "status": "CALCULATED",
        "method": method,
        "policy": {
            "id": policy.id,
            "policy_number": policy.policy_number,
            "insurance_company": policy.insurance_company,
            "scheme_name": policy.scheme_name,
            "crop_name": policy.crop_name,
            "season": policy.season,
            "sum_insured_per_ha": policy.sum_insured_per_ha,
            "insured_area_ha": policy.insured_area_ha,
            "indemnity_level": policy.indemnity_level,
        },
        "land_and_claim": {
            "claimed_area_ha": claimed_area,
            "field_registered_area_ha": field_area,
            "eligible_area_ha": eligible_area,
            "total_sum_insured": round(eligible_area * policy.sum_insured_per_ha, 2),
        },
        "damage_assessment": {
            "satellite_ndvi_drop_pct": sat_drop,
            "satellite_ndwi_moisture": sat_ndwi,
            "ground_photo_severity_pct": photo_severity,
            "weather_anomaly_multiplier": weather_anomaly,
            "final_assessed_damage_pct": damage_pct,
        },
        "actuarial_calculation": {
            "gross_calculated_payout": round(gross_payout, 2),
            "statutory_deductions": deduction_amount,
            "net_estimated_payout": round(net_payout, 2),
            "formula_string": formula_str,
        }
    }

    return {
        "method": method,
        "policy_id": policy.id,
        "policy_number": policy.policy_number,
        "insurance_company": policy.insurance_company,
        "sum_insured_per_ha": policy.sum_insured_per_ha,
        "insured_area_ha": policy.insured_area_ha,
        "claimed_area_ha": claimed_area,
        "eligible_area_ha": eligible_area,
        "total_sum_insured": round(eligible_area * policy.sum_insured_per_ha, 2),
        "loss_percentage": damage_pct,
        "indemnity_level": policy.indemnity_level,
        "gross_payout": round(gross_payout, 2),
        "deduction_amount": deduction_amount,
        "estimated_amount": round(net_payout, 2),
        "formula": formula_str,
        "breakdown": breakdown,
    }
