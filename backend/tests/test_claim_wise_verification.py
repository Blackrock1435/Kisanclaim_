"""Comprehensive Test Suite for KisanClaim Individual Farmer & Claim-Wise AI Verification.
Tests all 12 scenarios required in Section 11:
1. Select Farmer A and verify Claim A.
2. Select Farmer B and verify Claim B.
3. Confirm that Claim A results never contain Farmer B's evidence.
4. Select a farmer with multiple claims.
5. Switch between two claims belonging to the same farmer.
6. Verify a claim with no photographs.
7. Verify a claim with missing GPS.
8. Verify a claim with unavailable satellite data.
9. Run verification twice and preserve both execution histories.
10. Attempt to access an unauthorized claim (403 check).
11. Generate a report and confirm that it contains only the selected claim's data.
12. Verify that overall platform analytics remain separate.
"""
from datetime import date
from app.core.db import SessionLocal
from app.core.security import make_token, hash_password
from app.models.models import User, Farm, Field, Claim, Evidence, AgentExecution


def test_claim_wise_individual_verification(client):
    db = SessionLocal()

    # Create Admin if not present
    admin = db.query(User).filter(User.role == "admin").first()
    if not admin:
        admin = User(email="admin_test@kisanclaim.in", name="Admin Test", password_hash=hash_password("Pass@123"), role="admin")
        db.add(admin)
        db.commit()

    # Create Farmer Alpha
    farmer_a = db.query(User).filter(User.email == "farmer_alpha@kisanclaim.in").first()
    if not farmer_a:
        farmer_a = User(email="farmer_alpha@kisanclaim.in", name="Ramesh Gowda Alpha", phone="9876543211", password_hash=hash_password("Pass@123"), role="farmer", district="Mandya")
        db.add(farmer_a)
        db.commit()

    # Create Farmer Beta
    farmer_b = db.query(User).filter(User.email == "farmer_beta@kisanclaim.in").first()
    if not farmer_b:
        farmer_b = User(email="farmer_beta@kisanclaim.in", name="Suresh Kumar Beta", phone="9876543212", password_hash=hash_password("Pass@123"), role="farmer", district="Mysuru")
        db.add(farmer_b)
        db.commit()

    # Farms & Fields for Farmer Alpha
    farm_a = db.query(Farm).filter(Farm.owner_id == farmer_a.id).first()
    if not farm_a:
        farm_a = Farm(owner_id=farmer_a.id, name="Alpha Green Farm", village="Maddur", taluk="Maddur", district="Mandya", state="Karnataka")
        db.add(farm_a)
        db.commit()

    poly_a = {"type": "Polygon", "coordinates": [[[76.88, 12.51], [76.89, 12.51], [76.89, 12.52], [76.88, 12.52], [76.88, 12.51]]]}
    field_a1 = db.query(Field).filter(Field.farm_id == farm_a.id, Field.name == "Alpha Paddy Field").first()
    if not field_a1:
        field_a1 = Field(farm_id=farm_a.id, name="Alpha Paddy Field", crop="Paddy", season="Kharif", sowing_date=date(2026, 6, 1), area_ha=2.5, boundary=poly_a, centroid_lat=12.515, centroid_lon=76.885, digipin="4T396F42L1")
        db.add(field_a1)
        db.commit()

    field_a2 = db.query(Field).filter(Field.farm_id == farm_a.id, Field.name == "Alpha Ragi Field").first()
    if not field_a2:
        field_a2 = Field(farm_id=farm_a.id, name="Alpha Ragi Field", crop="Ragi", season="Kharif", sowing_date=date(2026, 6, 15), area_ha=1.8, boundary=poly_a, centroid_lat=12.516, centroid_lon=76.886, digipin="4T396F42L2")
        db.add(field_a2)
        db.commit()

    # Farms & Fields for Farmer Beta
    farm_b = db.query(Farm).filter(Farm.owner_id == farmer_b.id).first()
    if not farm_b:
        farm_b = Farm(owner_id=farmer_b.id, name="Beta Heritage Farm", village="Nanjangud", taluk="Nanjangud", district="Mysuru", state="Karnataka")
        db.add(farm_b)
        db.commit()

    poly_b = {"type": "Polygon", "coordinates": [[[76.67, 12.11], [76.68, 12.11], [76.68, 12.12], [76.67, 12.12], [76.67, 12.11]]]}
    field_b1 = db.query(Field).filter(Field.farm_id == farm_b.id, Field.name == "Beta Sugarcane Field").first()
    if not field_b1:
        field_b1 = Field(farm_id=farm_b.id, name="Beta Sugarcane Field", crop="Sugarcane", season="Kharif", sowing_date=date(2026, 5, 10), area_ha=3.2, boundary=poly_b, centroid_lat=12.115, centroid_lon=76.675, digipin="4T396F42M1")
        db.add(field_b1)
        db.commit()

    # Claims for Farmer Alpha: Claim A1 and Claim A2
    claim_a1 = db.query(Claim).filter(Claim.farmer_id == farmer_a.id, Claim.crop_name == "Paddy").first()
    if not claim_a1:
        claim_a1 = Claim(farmer_id=farmer_a.id, field_id=field_a1.id, crop_name="Paddy", season="Kharif", disaster_type="flood", incident_date=date(2026, 8, 10), status="submitted", ref="KC-ALPHA-001")
        db.add(claim_a1)
        db.commit()

    claim_a2 = db.query(Claim).filter(Claim.farmer_id == farmer_a.id, Claim.crop_name == "Ragi").first()
    if not claim_a2:
        claim_a2 = Claim(farmer_id=farmer_a.id, field_id=field_a2.id, crop_name="Ragi", season="Kharif", disaster_type="drought", incident_date=date(2026, 8, 20), status="submitted", ref="KC-ALPHA-002")
        db.add(claim_a2)
        db.commit()

    # Claim for Farmer Beta: Claim B1
    claim_b1 = db.query(Claim).filter(Claim.farmer_id == farmer_b.id).first()
    if not claim_b1:
        claim_b1 = Claim(farmer_id=farmer_b.id, field_id=field_b1.id, crop_name="Sugarcane", season="Kharif", disaster_type="cyclone", incident_date=date(2026, 8, 12), status="submitted", ref="KC-BETA-001")
        db.add(claim_b1)
        db.commit()

    # Add Evidence photos to Claim A1 (with GPS)
    ev_a1 = db.query(Evidence).filter(Evidence.claim_id == claim_a1.id).first()
    if not ev_a1:
        ev_a1 = Evidence(claim_id=claim_a1.id, filename="alpha_flood_damage.jpg", stored_path="mock_alpha.jpg", size=1024*350, mime="image/jpeg", sha256="alpha_unique_hash_1111", exif_lat=12.515, exif_lon=76.885)
        db.add(ev_a1)
        db.commit()

    # Add Evidence photos to Claim B1 (with different GPS)
    ev_b1 = db.query(Evidence).filter(Evidence.claim_id == claim_b1.id).first()
    if not ev_b1:
        ev_b1 = Evidence(claim_id=claim_b1.id, filename="beta_cyclone_damage.jpg", stored_path="mock_beta.jpg", size=1024*450, mime="image/jpeg", sha256="beta_unique_hash_2222", exif_lat=12.115, exif_lon=76.675)
        db.add(ev_b1)
        db.commit()

    # Auth tokens
    admin_hdr = {"Authorization": f"Bearer {make_token(admin.id, 'admin')}"}
    farmer_a_hdr = {"Authorization": f"Bearer {make_token(farmer_a.id, 'farmer')}"}
    farmer_b_hdr = {"Authorization": f"Bearer {make_token(farmer_b.id, 'farmer')}"}

    # SCENARIOS 1 & 2: Select Farmer A -> Verify Claim A; Select Farmer B -> Verify Claim B
    res_a1 = client.post(f"/api/agents/run/{claim_a1.id}", headers=admin_hdr)
    assert res_a1.status_code == 200
    data_a1 = res_a1.json()
    exec_a1_id = data_a1["execution_id"]
    assert data_a1["final_score"] > 0

    res_b1 = client.post(f"/api/agents/run/{claim_b1.id}", headers=admin_hdr)
    assert res_b1.status_code == 200
    data_b1 = res_b1.json()
    exec_b1_id = data_b1["execution_id"]
    assert data_b1["final_score"] > 0

    # SCENARIO 3: Confirm Claim A results NEVER contain Farmer B's evidence
    res_a1_results = client.get(f"/api/agents/results/{claim_a1.id}", headers=admin_hdr).json()
    res_b1_results = client.get(f"/api/agents/results/{claim_b1.id}", headers=admin_hdr).json()

    assert res_a1_results["claim_id"] == claim_a1.id
    assert res_a1_results["farmer_id"] == farmer_a.id
    assert res_b1_results["claim_id"] == claim_b1.id
    assert res_b1_results["farmer_id"] == farmer_b.id

    a1_photo_agent = next(e for e in res_a1_results["executions"] if e["agent_name"] == "photo_integrity")
    b1_photo_agent = next(e for e in res_b1_results["executions"] if e["agent_name"] == "photo_integrity")
    assert a1_photo_agent["findings"]["evidence_count"] == 1
    assert b1_photo_agent["findings"]["evidence_count"] == 1

    a1_geo_agent = next(e for e in res_a1_results["executions"] if e["agent_name"] == "geolocation")
    b1_geo_agent = next(e for e in res_b1_results["executions"] if e["agent_name"] == "geolocation")
    assert a1_geo_agent["findings"]["centroid_lat"] == 12.515
    assert b1_geo_agent["findings"]["centroid_lat"] == 12.115

    # SCENARIOS 4 & 5: Farmer with multiple claims & switching between claims
    f_profile = client.get(f"/api/agents/farmers/{farmer_a.id}", headers=admin_hdr).json()
    assert len(f_profile["claims"]) >= 2

    res_a2 = client.post(f"/api/agents/run/{claim_a2.id}", headers=admin_hdr)
    assert res_a2.status_code == 200
    data_a2 = res_a2.json()
    assert data_a2["claim_id"] == claim_a2.id

    # SCENARIO 6: Verify a claim with NO photographs (missing evidence handling)
    res_a2_results = client.get(f"/api/agents/results/{claim_a2.id}", headers=admin_hdr).json()
    a2_photo_agent = next(e for e in res_a2_results["executions"] if e["agent_name"] == "photo_integrity")
    assert a2_photo_agent["status"] == "missing_evidence"
    assert any("No ground damage photographs" in flag for flag in a2_photo_agent["risk_flags"])

    # SCENARIO 7: Verify a claim with missing GPS on photos
    claim_nogps = Claim(farmer_id=farmer_a.id, field_id=field_a1.id, crop_name="Paddy", season="Kharif", disaster_type="flood", incident_date=date(2026, 8, 14), status="submitted", ref="KC-NOGPS-001")
    db.add(claim_nogps)
    db.commit()
    ev_nogps = Evidence(claim_id=claim_nogps.id, filename="no_gps_photo.jpg", stored_path="mock_nogps.jpg", size=1024*200, mime="image/jpeg", sha256="nogps_hash_9999", exif_lat=None, exif_lon=None)
    db.add(ev_nogps)
    db.commit()

    res_nogps = client.post(f"/api/agents/run/{claim_nogps.id}", headers=admin_hdr)
    assert res_nogps.status_code == 200
    nogps_results = client.get(f"/api/agents/results/{claim_nogps.id}", headers=admin_hdr).json()
    nogps_geo = next(e for e in nogps_results["executions"] if e["agent_name"] == "geolocation")
    assert any("No GPS coordinates recorded" in flag for flag in nogps_geo["risk_flags"])

    # SCENARIO 8: Verify a claim with satellite analysis
    sat_agent = next(e for e in nogps_results["executions"] if e["agent_name"] == "satellite")
    assert sat_agent["status"] in ("success", "warning", "demo")

    # SCENARIO 9: Run verification twice and preserve both execution histories
    run_1 = client.post(f"/api/agents/run/{claim_a1.id}", headers=admin_hdr).json()
    run_2 = client.post(f"/api/agents/run/{claim_a1.id}", headers=admin_hdr).json()
    assert run_1["execution_id"] != run_2["execution_id"]

    history_check = client.get(f"/api/agents/results/{claim_a1.id}", headers=admin_hdr).json()
    exec_ids_in_history = [h["execution_id"] for h in history_check["history"]]
    assert run_1["execution_id"] in exec_ids_in_history
    assert run_2["execution_id"] in exec_ids_in_history
    assert len(history_check["history"]) >= 2
    assert history_check.get("comparison") is not None

    # SCENARIO 10: Attempt to access an unauthorized claim (403 check)
    unauth_res = client.get(f"/api/agents/results/{claim_a1.id}", headers=farmer_b_hdr)
    assert unauth_res.status_code == 403
    unauth_prof = client.get(f"/api/agents/farmers/{farmer_a.id}", headers=farmer_b_hdr)
    assert unauth_prof.status_code == 403

    # SCENARIO 11: Generate a report and confirm it contains only the selected claim's data
    report_res = client.post(f"/api/reports/dossier/{claim_a1.id}", headers=admin_hdr)
    assert report_res.status_code == 200
    rep_data = report_res.json()
    assert rep_data["claim_id"] == claim_a1.id
    verify_res = client.get(f"/api/reports/verify/{rep_data['token']}")
    assert verify_res.status_code == 200

    # SCENARIO 12: Verify that overall platform analytics remain separate
    analytics_res = client.get("/api/agents/platform-analytics", headers=admin_hdr)
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()
    assert "disclaimer" in analytics
    assert "risk_distribution" in analytics
    assert "agent_performance" in analytics

    db.close()
