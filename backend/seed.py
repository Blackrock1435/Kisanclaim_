from __future__ import annotations
"""Create demo accounts and sample claims for testing Voice Filing and Insurance Dashboard."""
import os
from datetime import date, datetime, timedelta, timezone
from app.core.db import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.models import (
    User, Farm, Field, Claim, ClaimEvent, Analysis, Assessment, Review,
    SatelliteTwinAnalysis, GeoCameraEvidence, ParcelVersion, AgentExecution, DossierVerification, Evidence
)
from app.digipin import digipin

Base.metadata.create_all(engine)
db = SessionLocal()

DEFAULT_PW = "Password@123"

# 1. Users
users_meta = [
    ("admin@kisanclaim.in", "Platform Admin", "admin", "Bengaluru Urban", "9876500001"),
    ("officer@kisanclaim.in", "Bima Senior Officer", "officer", "Bengaluru Rural", "9876500002"),
    ("farmer@kisanclaim.in", "Ramesh Kumar (Farmer)", "farmer", "Bengaluru Rural", "9876543210"),
]

user_objs = {}
for email, name, role, dist, phone in users_meta:
    u = db.query(User).filter_by(email=email).first()
    pw = os.getenv(f"SEED_{role.upper()}_PASSWORD") or DEFAULT_PW
    if not u:
        u = User(email=email, name=name, role=role, phone=phone, password_hash=hash_password(pw), district=dist, language="hi")
        db.add(u)
        db.flush()
    else:
        u.password_hash = hash_password(pw)
        u.phone = phone
    user_objs[role] = u
    print(f"{role:8} {email}  phone: {phone}  password: {pw}")

farmer = user_objs["farmer"]
officer = user_objs["officer"]

# 2. Farm
farm = db.query(Farm).filter_by(owner_id=farmer.id).first()
if not farm:
    farm = Farm(
        owner_id=farmer.id,
        name="Shri Krishna Krishi Farm",
        state="Karnataka",
        district="Bengaluru Rural",
        taluk="Devanahalli",
        village="Binnamangala",
        address="Survey No. 42/B, Near Gram Panchayat"
    )
    db.add(farm)
    db.flush()

# 3. Fields with accurate DIGIPIN
f1 = db.query(Field).filter_by(farm_id=farm.id, name="North Paddy Field").first()
if not f1:
    lat, lon = 13.111796, 80.202643
    pin = digipin.encode(lat, lon)
    f1 = Field(
        farm_id=farm.id,
        name="North Paddy Field",
        crop="Paddy",
        season="Kharif",
        sowing_date=date.today() - timedelta(days=75),
        area_ha=2.4,
        centroid_lat=lat,
        centroid_lon=lon,
        digipin=pin,
        boundary={
            "type": "Polygon",
            "coordinates": [[[lon - 0.002, lat - 0.002], [lon + 0.002, lat - 0.002],
                             [lon + 0.002, lat + 0.002], [lon - 0.002, lat + 0.002],
                             [lon - 0.002, lat - 0.002]]]
        }
    )
    db.add(f1)
    db.flush()

f2 = db.query(Field).filter_by(farm_id=farm.id, name="South Wheat Field").first()
if not f2:
    lat, lon = 13.120500, 80.210200
    pin = digipin.encode(lat, lon)
    f2 = Field(
        farm_id=farm.id,
        name="South Wheat Field",
        crop="Wheat",
        season="Rabi",
        sowing_date=date.today() - timedelta(days=40),
        area_ha=1.8,
        centroid_lat=lat,
        centroid_lon=lon,
        digipin=pin,
        boundary={
            "type": "Polygon",
            "coordinates": [[[lon - 0.0015, lat - 0.0015], [lon + 0.0015, lat - 0.0015],
                             [lon + 0.0015, lat + 0.0015], [lon - 0.0015, lat + 0.0015],
                             [lon - 0.0015, lat - 0.0015]]]
        }
    )
    db.add(f2)
    db.flush()

# 4. Claims for Insurer Dashboard
c1 = db.query(Claim).filter_by(ref="KC-2026-000101").first()
if not c1:
    c1 = Claim(
        ref="KC-2026-000101",
        farmer_id=farmer.id,
        field_id=f1.id,
        officer_id=officer.id,
        crop_name="Paddy (Basmati)",
        variety="Pusa 1121",
        sowing_date=date.today() - timedelta(days=75),
        season="Kharif",
        expected_harvest=date.today() + timedelta(days=30),
        disaster_type="flood",
        incident_date=date.today() - timedelta(days=6),
        duration_days=3,
        description="Flash flood submerged the lower quadrant of the paddy plot for 72 hours following continuous heavy downpour.",
        status="analysis_completed",
        consent=True,
        submitted_at=datetime.now(timezone.utc) - timedelta(days=5)
    )
    db.add(c1)
    db.flush()

    db.add(ClaimEvent(claim_id=c1.id, actor_id=farmer.id, to_status="submitted", note="Claim submitted with DIGIPIN reference", at=datetime.now(timezone.utc) - timedelta(days=5)))
    db.add(ClaimEvent(claim_id=c1.id, actor_id=None, to_status="analysis_completed", note="Automated Sentinel-2 & Open-Meteo pipeline completed", at=datetime.now(timezone.utc) - timedelta(days=4)))

    db.add(Analysis(
        claim_id=c1.id,
        kind="satellite",
        status="completed",
        source="Sentinel-2 L2A",
        data={
            "pre_date": str(date.today() - timedelta(days=15)),
            "post_date": str(date.today() - timedelta(days=2)),
            "pre_ndvi": 0.72,
            "post_ndvi": 0.38,
            "diff": -0.34,
            "pct_change": -47.2,
            "valid_pixel_pct_pre": 95,
            "valid_pixel_pct_post": 92,
            "series": [
                {"date": str(date.today() - timedelta(days=20)), "ndvi": 0.68},
                {"date": str(date.today() - timedelta(days=15)), "ndvi": 0.72},
                {"date": str(date.today() - timedelta(days=2)), "ndvi": 0.38}
            ]
        }
    ))

    db.add(Analysis(
        claim_id=c1.id,
        kind="weather",
        status="completed",
        source="Open-Meteo Archive API",
        data={
            "range": [str(date.today() - timedelta(days=10)), str(date.today())],
            "total_precip_mm": 184.6,
            "daily": [
                {"date": str(date.today() - timedelta(days=7)), "precip_mm": 12.0},
                {"date": str(date.today() - timedelta(days=6)), "precip_mm": 88.4},
                {"date": str(date.today() - timedelta(days=5)), "precip_mm": 64.2},
                {"date": str(date.today() - timedelta(days=4)), "precip_mm": 20.0}
            ]
        }
    ))

    db.add(Assessment(
        claim_id=c1.id,
        version=1,
        rule_version="1.0.0",
        category="significant",
        data={
            "category_text": "Significant vegetation decline consistent with heavy rainfall flood event",
            "consistency": "consistent",
            "manual_review_required": True,
            "signals": [
                {"name": "NDVI Vegetation Drop", "status": "CONFIRMED", "text": "47.2% decline in canopy greenness post-incident."},
                {"name": "Rainfall Severity", "status": "CONFIRMED", "text": "184.6 mm recorded over 3-day event window."},
                {"name": "DIGIPIN Geospatial Tag", "status": "VERIFIED", "text": f"Farm polygon matches unit DIGIPIN {f1.digipin}."}
            ],
            "warnings": []
        }
    ))

c2 = db.query(Claim).filter_by(ref="KC-2026-000102").first()
if not c2:
    c2 = Claim(
        ref="KC-2026-000102",
        farmer_id=farmer.id,
        field_id=f2.id,
        officer_id=officer.id,
        crop_name="Wheat (Sharbati)",
        variety="C-306",
        sowing_date=date.today() - timedelta(days=40),
        season="Rabi",
        disaster_type="hail",
        incident_date=date.today() - timedelta(days=3),
        duration_days=1,
        description="Hailstorm damaged young tillers across the plot.",
        status="under_review",
        consent=True,
        submitted_at=datetime.now(timezone.utc) - timedelta(days=2)
    )
    db.add(c2)
    db.flush()

    db.add(ClaimEvent(claim_id=c2.id, actor_id=farmer.id, to_status="submitted", note="Claim submitted", at=datetime.now(timezone.utc) - timedelta(days=2)))
    db.add(ClaimEvent(claim_id=c2.id, actor_id=officer.id, to_status="under_review", note="Underwriter review initiated", at=datetime.now(timezone.utc) - timedelta(days=1)))
    db.add(Review(claim_id=c2.id, officer_id=officer.id, action="start_review", comment="Inspecting satellite vegetation and hail track radar."))

# 5. Parcel Versioning (Locked Cadastral Boundaries)
pv1 = db.query(ParcelVersion).filter_by(field_id=f1.id).first()
if not pv1:
    corners = [
        {"corner": 1, "lat": 13.109796, "lon": 80.200643, "digipin": digipin.encode(13.109796, 80.200643)},
        {"corner": 2, "lat": 13.113796, "lon": 80.200643, "digipin": digipin.encode(13.113796, 80.200643)},
        {"corner": 3, "lat": 13.113796, "lon": 80.204643, "digipin": digipin.encode(13.113796, 80.204643)},
        {"corner": 4, "lat": 13.109796, "lon": 80.204643, "digipin": digipin.encode(13.109796, 80.204643)},
    ]
    db.add(ParcelVersion(
        field_id=f1.id,
        version=1,
        boundary=f1.boundary,
        centroid_lat=f1.centroid_lat,
        centroid_lon=f1.centroid_lon,
        centroid_digipin=f1.digipin or "4T396F42L7",
        corner_digipins=corners,
        area_ha=2.4,
        area_acres=5.93,
        reason="Initial official PMFBY cadastral boundary lock via Bhoomi survey coordinates."
    ))

# 6. Sentinel-2 Satellite Twin Dual-Pass Analysis
sat1 = db.query(SatelliteTwinAnalysis).filter_by(claim_id=c1.id).first()
if not sat1:
    db.add(SatelliteTwinAnalysis(
        claim_id=c1.id,
        field_id=f1.id,
        pre_date=date.today() - timedelta(days=14),
        post_date=date.today() - timedelta(days=2),
        cloud_pct_pre=4.2,
        cloud_pct_post=8.6,
        pre_ndvi=0.68,
        post_ndvi=0.39,
        ndvi_change_pct=-42.8,
        pre_ndwi=-0.12,
        post_ndwi=0.48,
        ndwi_formula="Gao 1996 (B8-B11)/(B8+B11)",
        imagery_status="verified",
        data={
            "mission": "Sentinel-2 L2A Multispectral",
            "resolution_m": 10,
            "canopy_loss_ha": 1.44,
            "submerged_water_ha": 1.15
        }
    ))

# 7. GeoCamera In-Field Evidence
ev1 = db.query(Evidence).filter_by(claim_id=c1.id).first()
if not ev1:
    ev1 = Evidence(
        claim_id=c1.id,
        filename="field_flood_inspection_01.jpg",
        stored_path="storage/sample_flood_geocam.jpg",
        mime="image/jpeg",
        size=2415820,
        sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        exif_lat=13.111820,
        exif_lon=80.202650,
        exif_taken_at=datetime.now(timezone.utc) - timedelta(days=5)
    )
    db.add(ev1)
    db.flush()

gc1 = db.query(GeoCameraEvidence).filter_by(claim_id=c1.id).first()
if not gc1:
    db.add(GeoCameraEvidence(
        evidence_id=ev1.id,
        claim_id=c1.id,
        gps_lat=13.111820,
        gps_lon=80.202650,
        gps_accuracy_m=2.4,
        digipin=f1.digipin or "4T396F42L7",
        distance_to_parcel_m=0.0,
        geofence_status="inside",
        client_captured_at=datetime.now(timezone.utc) - timedelta(days=5),
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        is_duplicate=False,
        tamper_flags={"exif_intact": True, "solar_angle_valid": True, "geofence_ok": True}
    ))

# 8. Six Autonomous AI Verification Agents
agents_data = [
    ("GeoLocation Agent", "success", 95.0, 20.0, 19.0, [], {"distance_m": 0.0, "status": "inside_boundary", "accuracy_m": 2.4, "digipin_match": True}),
    ("Photo Integrity Agent", "success", 92.0, 15.0, 13.8, [], {"exif_consistent": True, "duplicate_detected": False, "solar_lighting_check": "passed", "tampering_risk": "low"}),
    ("Satellite Analysis Agent", "success", 88.0, 25.0, 22.0, [], {"ndvi_drop_pct": -42.8, "ndwi_inundation": +0.48, "statutory_loss_confirmed": True, "cloud_cover_pct": 8.6}),
    ("Weather Verification Agent", "success", 85.0, 15.0, 12.75, [], {"rainfall_3d_sum_mm": 184.6, "historical_percentile": 98.4, "flood_peril_corroborated": True}),
    ("Land & Policy / Bhoomi Agent", "success", 94.0, 15.0, 14.1, [], {"rtc_survey_number": "42/B", "pmfby_policy_valid": True, "farmer_tenure_verified": True}),
    ("Evidence Fusion & Risk Agent", "success", 90.0, 10.0, 9.0, [], {"composite_score": 90.65, "fraud_risk": "VERY_LOW", "recommended_action": "AUTO_APPROVE_ELIGIBLE"}),
]

for name, status, score, weight, wscore, flags, findings in agents_data:
    existing = db.query(AgentExecution).filter_by(claim_id=c1.id, agent_name=name).first()
    if not existing:
        db.add(AgentExecution(
            claim_id=c1.id,
            agent_name=name,
            status=status,
            score=score,
            weight=weight,
            weighted_score=wscore,
            risk_flags=flags,
            findings=findings,
            duration_ms=340
        ))

# 9. Cryptographic Dossier Verification
dossier = db.query(DossierVerification).filter_by(claim_id=c1.id).first()
if not dossier:
    db.add(DossierVerification(
        claim_id=c1.id,
        token="513c877923184ef2a4a80c68d95a3cdd",
        pdf_path="storage/reports/dossier_KC-2026-000101.pdf",
        sha256_hash="f4a9b6c82d3e1107584129e71954fbc5218491bce98522301c227845f09623b1"
    ))

db.commit()
print("Database seed complete! Advanced verification and proof records successfully seeded.")
