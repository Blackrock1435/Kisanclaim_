from datetime import date
from app.core.db import SessionLocal
from app.models.models import User, Farm, Field, Claim, CropRecord, ClaimOfficerNote
from app.core.security import make_token, hash_password


def test_field_update_and_crop_records(client):
    db = SessionLocal()
    farmer = User(email="farmer_test@kisanclaim.in", name="Ramesh", password_hash=hash_password("Passw0rd!x"), role="farmer", consent_at=None)
    db.add(farmer)
    db.flush()

    farm = Farm(owner_id=farmer.id, name="Green Acres", state="Karnataka", district="Mandya")
    db.add(farm)
    db.flush()

    poly = {
        "type": "Polygon",
        "coordinates": [[[76.89, 12.52], [76.90, 12.52], [76.90, 12.53], [76.89, 12.53], [76.89, 12.52]]]
    }
    field = Field(farm_id=farm.id, name="Plot A", crop="Paddy", season="Kharif", sowing_date=date(2026, 6, 1),
                  area_ha=1.2, boundary=poly, centroid_lat=12.525, centroid_lon=76.895, digipin="4T396F42L7")
    db.add(field)
    db.commit()

    token = make_token(farmer.id, "farmer")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Update field details
    res = client.put(f"/api/fields/{field.id}", json={"name": "Plot A - North", "crop": "Ragi"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Plot A - North"
    assert res.json()["crop"] == "Ragi"

    # 2. Add crop record
    res = client.post(f"/api/fields/{field.id}/crops", json={
        "crop_name": "Ragi",
        "variety": "GPU-28",
        "season": "Kharif 2026",
        "sowing_date": "2026-06-15",
        "yield_quintals": 18.5
    }, headers=headers)
    assert res.status_code == 201
    crop_id = res.json()["id"]
    assert res.json()["crop_name"] == "Ragi"
    assert res.json()["variety"] == "GPU-28"

    # 3. List crop records
    res = client.get(f"/api/fields/{field.id}/crops", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["crop_name"] == "Ragi"

    # 4. Delete crop record
    res = client.delete(f"/api/fields/{field.id}/crops/{crop_id}", headers=headers)
    assert res.status_code == 204

    res = client.get(f"/api/fields/{field.id}/crops", headers=headers)
    assert len(res.json()) == 0
    db.close()


def test_officer_notes_and_evidence_request(client):
    db = SessionLocal()
    farmer = User(email="farmer2@kisanclaim.in", name="Suresh", password_hash=hash_password("Passw0rd!x"), role="farmer")
    officer = User(email="officer_audit@kisanclaim.in", name="Inspector Rao", password_hash=hash_password("Passw0rd!x"), role="officer", district="Mandya")
    db.add_all([farmer, officer])
    db.flush()

    farm = Farm(owner_id=farmer.id, name="Riverbank Farm", state="Karnataka", district="Mandya")
    db.add(farm)
    db.flush()

    poly = {"type": "Polygon", "coordinates": [[[76.89, 12.52], [76.90, 12.52], [76.90, 12.53], [76.89, 12.53], [76.89, 12.52]]]}
    field = Field(farm_id=farm.id, name="Plot B", crop="Sugarcane", area_ha=2.5, boundary=poly, centroid_lat=12.525, centroid_lon=76.895)
    db.add(field)
    db.flush()

    claim = Claim(farmer_id=farmer.id, officer_id=officer.id, field_id=field.id, ref="KC-2026-999001", crop_name="Sugarcane",
                  disaster_type="flood", incident_date=date(2026, 7, 10), status="submitted")
    db.add(claim)
    db.commit()

    officer_token = make_token(officer.id, "officer")
    officer_headers = {"Authorization": f"Bearer {officer_token}"}

    farmer_token = make_token(farmer.id, "farmer")
    farmer_headers = {"Authorization": f"Bearer {farmer_token}"}

    # 1. Officer adds inspection note
    res = client.post(f"/api/claims/{claim.id}/notes", json={
        "note_type": "inspection",
        "content": "On-site observation: Standing water observed across north parcel boundary.",
        "action_required_from_farmer": "Provide photo of water drainage canal"
    }, headers=officer_headers)
    assert res.status_code == 201
    assert res.json()["officer_name"] == "Inspector Rao"
    assert res.json()["note_type"] == "inspection"

    # 2. Officer requests additional evidence
    res = client.post(f"/api/claims/{claim.id}/request-evidence", json={
        "action_required": "Please submit wide-angle GeoCamera photo of affected furrow lines.",
        "requested_items": ["wide_angle_photo", "sowing_receipt"],
        "officer_instructions": "Take the photo inside the 400m geofence with GeoCamera enabled."
    }, headers=officer_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "additional_evidence_required"

    # 3. Farmer views notes
    res = client.get(f"/api/claims/{claim.id}/notes", headers=farmer_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 2

    # 4. Check claim detail has notes
    res = client.get(f"/api/claims/{claim.id}", headers=farmer_headers)
    assert res.status_code == 200
    assert len(res.json()["officer_notes"]) >= 2
    assert res.json()["status"] == "additional_evidence_required"
    db.close()


def test_admin_integrations_endpoint(client):
    db = SessionLocal()
    admin = User(email="admin_sys@kisanclaim.in", name="Admin", password_hash=hash_password("Passw0rd!x"), role="admin")
    db.add(admin)
    db.commit()

    admin_token = make_token(admin.id, "admin")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. List integrations
    res = client.get("/api/admin/integrations", headers=headers)
    assert res.status_code == 200
    integrations = res.json().get("integrations", [])
    assert len(integrations) >= 6
    keys = {item["key"] for item in integrations}
    assert "open_meteo" in keys
    assert "digipin_national" in keys
    assert "sms_gateway" in keys

    # 2. Test Open-Meteo connection
    res = client.post("/api/admin/integrations/open_meteo/test", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("connected", "degraded", "error", "demo")
    assert "message" in data

    # 3. Test DIGIPIN connection (pure math algorithm)
    res = client.post("/api/admin/integrations/digipin_national/test", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "connected"
    assert data["key"] == "digipin_national"
    db.close()
