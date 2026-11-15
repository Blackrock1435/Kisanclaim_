import pytest
from datetime import date
from fastapi import HTTPException
from app.core.db import SessionLocal
from app.models.models import User, Farm, Field, Claim, PlatformConfig
from app.core.security import make_token, hash_password
from app.agents.engine import get_agent_weights, DEFAULT_AGENT_WEIGHTS, execute_all_agents
from app.weather.open_meteo import analyze
from app.api.geo import process_4corner_parcel

POLY = {
    "type": "Polygon",
    "coordinates": [[[76.89, 12.52], [76.90, 12.52], [76.90, 12.53], [76.89, 12.53], [76.89, 12.52]]]
}


def test_agent_weights_configuration_and_validation(client):
    db = SessionLocal()
    admin = User(email="admin_weights@kisanclaim.in", name="Admin", password_hash=hash_password("Pass!123"), role="admin")
    officer = User(email="officer_weights@kisanclaim.in", name="Officer", password_hash=hash_password("Pass!123"), role="officer")
    farmer = User(email="farmer_weights@kisanclaim.in", name="Farmer", password_hash=hash_password("Pass!123"), role="farmer")
    db.add_all([admin, officer, farmer])
    db.commit()

    admin_token = make_token(admin.id, "admin")
    farmer_token = make_token(farmer.id, "farmer")
    admin_hdr = {"Authorization": f"Bearer {admin_token}"}
    farmer_hdr = {"Authorization": f"Bearer {farmer_token}"}

    # 1. GET default weights
    res = client.get("/api/agents/weights", headers=admin_hdr)
    assert res.status_code == 200
    weights = res.json()["weights"]
    assert weights["satellite"] == 25.0
    assert weights["geolocation"] == 15.0
    assert weights["photo_integrity"] == 15.0
    assert weights["weather"] == 15.0
    assert weights["land_policy"] == 20.0
    assert weights["fusion_risk"] == 10.0
    assert sum(weights.values()) == 100.0

    # 2. PUT valid custom weights
    custom_weights = {
        "geolocation": 20.0,
        "photo_integrity": 10.0,
        "satellite": 30.0,
        "weather": 15.0,
        "land_policy": 15.0,
        "fusion_risk": 10.0,
    }
    res = client.put("/api/agents/weights", json={"weights": custom_weights}, headers=admin_hdr)
    assert res.status_code == 200
    assert res.json()["weights"]["satellite"] == 30.0

    # 3. GET reflects updated weights
    res = client.get("/api/agents/weights", headers=admin_hdr)
    assert res.json()["weights"]["satellite"] == 30.0

    # 4. PUT invalid weights (sum != 100) must return 422
    invalid_weights = dict(custom_weights)
    invalid_weights["satellite"] = 50.0  # sum = 120
    res = client.put("/api/agents/weights", json={"weights": invalid_weights}, headers=admin_hdr)
    assert res.status_code == 422

    # 5. Farmer cannot edit weights (must return 403)
    res = client.put("/api/agents/weights", json={"weights": custom_weights}, headers=farmer_hdr)
    assert res.status_code == 403

    db.close()


def test_strict_farmer_data_isolation(client):
    db = SessionLocal()
    farmer_a = User(email="farmer_a@kisanclaim.in", name="Farmer A", password_hash=hash_password("Pass!123"), role="farmer")
    farmer_b = User(email="farmer_b@kisanclaim.in", name="Farmer B", password_hash=hash_password("Pass!123"), role="farmer")
    db.add_all([farmer_a, farmer_b])
    db.commit()

    farm_a = Farm(owner_id=farmer_a.id, name="Farm A", district="Mandya", state="Karnataka")
    db.add(farm_a)
    db.commit()

    field_a = Field(
        farm_id=farm_a.id, name="Field A", crop="Paddy", season="Kharif",
        sowing_date=date(2026, 6, 1), area_ha=2.0, centroid_lat=12.52, centroid_lon=76.89, digipin="4T396F42L7",
        boundary=POLY
    )
    db.add(field_a)
    db.commit()

    claim_a = Claim(
        farmer_id=farmer_a.id, field_id=field_a.id, status="submitted",
        crop_name="Paddy", disaster_type="flood", incident_date=date(2026, 8, 15)
    )
    db.add(claim_a)
    db.commit()

    token_b = make_token(farmer_b.id, "farmer")
    hdr_b = {"Authorization": f"Bearer {token_b}"}

    # Farmer B attempting to view Farmer A's Evidence Graph must be forbidden
    res = client.get(f"/api/evidence-graph/{claim_a.id}", headers=hdr_b)
    assert res.status_code == 403

    # Farmer B attempting to view Farmer A's Satellite comparison must be forbidden
    res = client.get(f"/api/satellite/comparison/{claim_a.id}", headers=hdr_b)
    assert res.status_code == 403

    # Farmer B attempting to view Farmer A's GeoCamera history must be forbidden
    res = client.get(f"/api/geocamera/history/{claim_a.id}", headers=hdr_b)
    assert res.status_code == 403

    # Farmer B attempting to view Farmer A's Agent results must be forbidden
    res = client.get(f"/api/agents/results/{claim_a.id}", headers=hdr_b)
    assert res.status_code == 403

    # Farmer B dashboard has NO claims, so active_claim_proof should be None
    res = client.get("/api/dashboard", headers=hdr_b)
    assert res.status_code == 200
    assert res.json()["active_claim_proof"] is None

    db.close()


def test_open_meteo_weather_taxonomy():
    res = analyze(
        lat=13.1118,
        lon=77.5946,
        incident=date(2026, 8, 15),
        disaster_type="flood"
    )
    # Status must be one of VERIFIED, UNAVAILABLE, DEMO, or MANUAL_REVIEW_REQUIRED
    assert res["status"] in ("VERIFIED", "UNAVAILABLE", "DEMO", "MANUAL_REVIEW_REQUIRED")
    assert "window_precip_mm" in res
    assert "cumulative_7d_precip_mm" in res
    assert "baseline_normal_mm" in res
    assert "anomaly_ratio" in res
    assert res["baseline_normal_mm"] == 35.0


def test_4corner_parcel_validation():
    # Valid 4 corners (approx 1 hectare rectangle)
    coords = [
        [13.110, 77.590],
        [13.111, 77.590],
        [13.111, 77.591],
        [13.110, 77.591],
    ]
    parcel = process_4corner_parcel(coords)
    assert parcel["area_ha"] > 0
    assert parcel["centroid_digipin"] is not None
    assert len(parcel["corner_digipins"]) == 4
    assert parcel["boundary_validation_status"] == "VALID_GEOMETRY"
    assert "India Post DIGIPIN" in parcel["legal_notice"]

    # Invalid corners: Less than 4 corners raises HTTPException(422)
    with pytest.raises(HTTPException):
        process_4corner_parcel([[13.110, 77.590], [13.111, 77.590]])


def test_disaster_map_api(client):
    db = SessionLocal()
    farmer = User(email="farmer_map@kisanclaim.in", name="Farmer Map", password_hash=hash_password("Pass!123"), role="farmer")
    db.add(farmer)
    db.commit()

    farm = Farm(owner_id=farmer.id, name="Mysuru Farm", district="Mysuru", state="Karnataka")
    db.add(farm)
    db.commit()

    field = Field(
        farm_id=farm.id, name="Plot South", crop="Cotton", season="Kharif",
        sowing_date=date(2026, 6, 1), area_ha=3.5, centroid_lat=12.2958, centroid_lon=76.6394, digipin="4T396F42L7",
        boundary=POLY
    )
    db.add(field)
    db.commit()

    claim = Claim(
        farmer_id=farmer.id, field_id=field.id, status="submitted",
        crop_name="Cotton", disaster_type="drought", incident_date=date(2026, 8, 10)
    )
    db.add(claim)
    db.commit()

    token = make_token(farmer.id, "farmer")
    hdr = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/disaster-map/claims", headers=hdr)
    assert res.status_code == 200
    data = res.json()
    assert "claims" in data
    assert "stats" in data
    assert data["stats"]["total_claims"] >= 1
    assert any(c["id"] == claim.id for c in data["claims"])

    db.close()
