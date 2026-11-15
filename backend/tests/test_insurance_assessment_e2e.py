"""Comprehensive End-to-End Tests for PMFBY AI Insurance Assessment,
Payout Recommendation, Admin Adjudication, and DBT Disbursement.
"""
from datetime import date, datetime, timezone
import pytest
from tests.conftest import login
from app.core.db import SessionLocal
from app.models.models import (
    Claim, Farm, Field, User, Evidence, GeoCameraEvidence, SatelliteTwinAnalysis,
    InsurancePolicy, InsuranceAssessment, SettlementRecord, PaymentStatusHistory,
    AgentExecution
)
from app.services.payout_engine import calculate_payout_estimate, get_or_create_default_policy


def test_insurance_assessment_end_to_end_suite(client, farmer):
    officer_h = login(client, "officer@t.io")
    admin_h = login(client, "admin@t.io")

    # 1. Setup farm, field, and claim
    f_res = client.post(
        "/api/farms",
        headers=farmer,
        json={"name": "Kaveri Basin Farm", "state": "Karnataka", "district": "Bengaluru Rural", "taluk": "Devanahalli", "village": "Binnamangala"}
    )
    assert f_res.status_code == 201
    farm_id = f_res.json()["id"]

    poly = {"type": "Polygon", "coordinates": [[[77.6, 13.1], [77.61, 13.1], [77.61, 13.11], [77.6, 13.11], [77.6, 13.1]]]}
    fld_res = client.post(
        "/api/fields",
        headers=farmer,
        json={"farm_id": farm_id, "name": "North Field", "crop": "Paddy", "boundary": poly}
    )
    assert fld_res.status_code == 201
    field_id = fld_res.json()["id"]

    clm_res = client.post(
        "/api/claims",
        headers=farmer,
        json={
            "field_id": field_id,
            "crop_name": "Paddy",
            "disaster_type": "flood",
            "incident_date": "2024-08-15",
            "description": "Flash flood submerging entire field for 4 days",
            "consent": True
        }
    )
    assert clm_res.status_code == 201
    claim_id = clm_res.json()["id"]

    # 2. Add ground evidence and satellite twin
    db = SessionLocal()
    ev1 = Evidence(
        claim_id=claim_id,
        filename="field_flood_01.jpg",
        stored_path="mock_path_flood.jpg",
        mime="image/jpeg",
        size=1500000,
        sha256="a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
        exif_lat=13.105,
        exif_lon=77.605,
        exif_taken_at=datetime.now(timezone.utc),
    )
    db.add(ev1)
    db.flush()

    geo1 = GeoCameraEvidence(
        evidence_id=ev1.id,
        claim_id=claim_id,
        gps_lat=13.105,
        gps_lon=77.605,
        gps_accuracy_m=4.2,
        digipin="4T396F42L7",
        distance_to_parcel_m=0.0,
        geofence_status="inside",
        sha256_hash=ev1.sha256,
    )
    db.add(geo1)

    sat = SatelliteTwinAnalysis(
        claim_id=claim_id,
        field_id=field_id,
        pre_date=date(2024, 8, 1),
        post_date=date(2024, 8, 20),
        cloud_pct_pre=2.1,
        cloud_pct_post=4.5,
        pre_ndvi=0.76,
        post_ndvi=0.32,
        ndvi_change_pct=-57.8,
        pre_ndwi=0.18,
        post_ndwi=0.58,
        imagery_status="available",
        data={"pct_change": -57.8}
    )
    db.add(sat)
    db.commit()
    db.close()

    # 3. Test Dashboard Stats endpoint
    stats_r = client.get("/api/assessments/stats", headers=officer_h)
    assert stats_r.status_code == 200
    stats = stats_r.json()
    assert "total_claims" in stats
    assert "awaiting_assessment" in stats
    assert "total_approved_payout" in stats

    # 4. Test List Claims endpoint with filtering
    list_r = client.get(f"/api/assessments?crop=Paddy&disaster=flood", headers=officer_h)
    assert list_r.status_code == 200
    items = list_r.json()["items"]
    assert any(c["id"] == claim_id for c in items)

    # 5. Test Claim Assessment Context retrieval
    ctx_r = client.get(f"/api/assessments/claim/{claim_id}", headers=officer_h)
    assert ctx_r.status_code == 200
    ctx = ctx_r.json()
    assert ctx["claim"]["id"] == claim_id
    assert ctx["farmer"]["name"] is not None
    assert ctx["field"]["area_ha"] > 0
    field_area = ctx["field"]["area_ha"]
    assert ctx["policy"]["sum_insured_per_ha"] > 0
    assert len(ctx["photos"]) >= 1

    # 6. Test AI Payout Engine Calculation
    calc_r = client.post(f"/api/assessments/claim/{claim_id}/calculate", headers=officer_h)
    assert calc_r.status_code == 200
    estimate = calc_r.json()["estimate"]
    assert estimate["method"] == "PMFBY_LOCALIZED_CALAMITY"
    assert estimate["estimated_amount"] > 0
    assert estimate["loss_percentage"] > 0
    assert "formula" in estimate
    ai_estimated_amt = estimate["estimated_amount"]

    # 7. Test Save Draft Assessment
    draft_r = client.post(
        f"/api/assessments/claim/{claim_id}/save-draft",
        headers=officer_h,
        json={
            "recommended_amount": ai_estimated_amt,
            "assessed_damage_pct": estimate["loss_percentage"],
            "assessed_eligible_area_ha": estimate["eligible_area_ha"],
            "deduction_amount": 0.0,
            "officer_remarks": "Draft assessment saved after satellite review."
        }
    )
    assert draft_r.status_code == 200
    assert draft_r.json()["success"] is True

    # 8. Test Submit Validation: Missing declaration should be rejected
    fail_decl_r = client.post(
        f"/api/assessments/claim/{claim_id}/submit",
        headers=officer_h,
        json={
            "recommended_amount": ai_estimated_amt,
            "assessed_damage_pct": 55.0,
            "assessed_eligible_area_ha": field_area,
            "officer_remarks": "Inspection complete",
            "declaration_accepted": False
        }
    )
    assert fail_decl_r.status_code == 422

    # 9. Test Submit Validation: Divergence > 10% without justification should be rejected
    divergent_amount = ai_estimated_amt * 1.50
    fail_diff_r = client.post(
        f"/api/assessments/claim/{claim_id}/submit",
        headers=officer_h,
        json={
            "recommended_amount": divergent_amount,
            "assessed_damage_pct": 85.0,
            "assessed_eligible_area_ha": field_area,
            "officer_remarks": "Substantially higher loss than AI estimate",
            "officer_difference_reason": "",  # Empty!
            "declaration_accepted": True
        }
    )
    assert fail_diff_r.status_code == 422

    # 10. Test Valid Submit for Admin Approval (with justification)
    submit_r = client.post(
        f"/api/assessments/claim/{claim_id}/submit",
        headers=officer_h,
        json={
            "recommended_amount": round(ai_estimated_amt * 1.15, 2),
            "assessed_damage_pct": 65.0,
            "assessed_eligible_area_ha": field_area,
            "deduction_amount": 500.0,
            "officer_remarks": "Field inspection confirmed severe siltation not fully captured by satellite.",
            "officer_difference_reason": "Ground surveyor identified standing water damage to panicle roots.",
            "declaration_accepted": True
        }
    )
    assert submit_r.status_code == 200
    assessment_id = submit_r.json()["assessment_id"]
    rec_amount = submit_r.json()["recommended_amount"]

    # 11. Test Admin Decision: Modify Approved Amount (with mandatory justification)
    # Testing missing justification failure first
    fail_mod_r = client.post(
        f"/api/assessments/{assessment_id}/admin-decision",
        headers=admin_h,
        json={
            "decision": "modify",
            "approved_amount": 75000.0,
            "modification_reason": ""  # Missing!
        }
    )
    assert fail_mod_r.status_code == 422

    # Valid modification approval
    approved_amt = 72000.0
    mod_ok_r = client.post(
        f"/api/assessments/{assessment_id}/admin-decision",
        headers=admin_h,
        json={
            "decision": "modify",
            "approved_amount": approved_amt,
            "modification_reason": "Adjusted to state statutory maximum cap for localized calamity category.",
            "remarks": "Approved with statutory modification."
        }
    )
    assert mod_ok_r.status_code == 200
    assert mod_ok_r.json()["approved_amount"] == approved_amt

    # Check that claim status is approved
    claim_check = client.get(f"/api/claims/{claim_id}", headers=admin_h)
    assert claim_check.status_code == 200
    assert claim_check.json()["status"] == "approved"

    # 12. Test Farmer Settlement & Transparency View
    settle_r = client.get(f"/api/assessments/claim/{claim_id}/settlement", headers=farmer)
    assert settle_r.status_code == 200
    s_data = settle_r.json()
    assert s_data["is_approved"] is True
    assert s_data["approved_amount"] == approved_amt
    assert s_data["settlement_status"] == "APPROVED_AWAITING_PAYMENT"
    assert "Your PMFBY claim has been approved" in s_data["decision_explanation"]
    # Check that sensitive officer deliberation internals are NOT leaked in response
    assert "internal_fraud_score" not in s_data
    assert "officer_difference_reason" not in s_data

    # 13. Test Update Payment Status: Transition to PAYMENT_PROCESSING
    pay_proc_r = client.post(
        f"/api/assessments/claim/{claim_id}/update-payment",
        headers=admin_h,
        json={
            "status": "PAYMENT_PROCESSING",
            "transaction_reference": "PFMS-KA-2024-00891",
            "notes": "Sent to State Treasury PFMS batch file"
        }
    )
    assert pay_proc_r.status_code == 200
    assert pay_proc_r.json()["status"] == "PAYMENT_PROCESSING"

    # 14. Test Update Payment Status: Transition to PAID
    pay_paid_r = client.post(
        f"/api/assessments/claim/{claim_id}/update-payment",
        headers=admin_h,
        json={
            "status": "PAID",
            "transaction_reference": "UTR-SBIN-20240822-098712",
            "notes": "Direct bank credit successfully acknowledged by RBI/Canara Bank"
        }
    )
    assert pay_paid_r.status_code == 200
    assert pay_paid_r.json()["status"] == "PAID"
    assert pay_paid_r.json()["disbursed_at"] is not None

    # Check Farmer settlement endpoint now reflects PAID
    settle_paid = client.get(f"/api/assessments/claim/{claim_id}/settlement", headers=farmer)
    assert settle_paid.json()["settlement_status"] == "PAID"
    assert settle_paid.json()["transaction_reference"] == "UTR-SBIN-20240822-098712"

    # 15. Test PDF Dossier Generation and Verification
    dossier_r = client.post(f"/api/assessments/claim/{claim_id}/generate-dossier", headers=officer_h)
    assert dossier_r.status_code == 200
    d_token = dossier_r.json()["token"]
    assert d_token is not None

    # Verify dossier via public QR verification endpoint
    verify_r = client.get(f"/api/reports/verify/{d_token}")
    assert verify_r.status_code == 200
    v_data = verify_r.json()
    assert v_data["is_valid"] is True
    assert v_data["sha256_fingerprint"] is not None
    assert v_data["verification_count"] >= 1

    # 16. Test Payout Engine NOT_CALCULABLE behavior with zero or missing area
    db2 = SessionLocal()
    clm_obj = db2.get(Claim, claim_id)
    not_calc = calculate_payout_estimate(db2, clm_obj, force_not_calculable=True)
    assert not_calc["method"] == "NOT_CALCULABLE"
    assert not_calc["estimated_amount"] == 0.0
    assert "missing_inputs" in not_calc["breakdown"]
    db2.close()
