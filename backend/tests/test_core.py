from __future__ import annotations
import io
from datetime import date, timedelta
import httpx, pytest
from PIL import Image
from app.assessment import engine
from app.digipin import digipin
from app.satellite import ndvi
from app.weather import open_meteo
from .conftest import login

SQ = {"type": "Polygon", "coordinates": [[[77.5, 13.0], [77.504, 13.0], [77.504, 13.004], [77.5, 13.004], [77.5, 13.0]]]}
BOWTIE = {"type": "Polygon", "coordinates": [[[77.5, 13.0], [77.504, 13.004], [77.504, 13.0], [77.5, 13.004], [77.5, 13.0]]]}


# --- pure logic ---
def test_digipin_official_vector():
    assert digipin.encode(13.11179621, 80.20264269) == "4T396F42L7"
    lat, lon = digipin.decode("4T396F42L7")
    assert abs(lat - 13.11179621) < 1e-3 and abs(lon - 80.20264269) < 1e-3


def test_digipin_rejects_out_of_range_and_bad_codes():
    with pytest.raises(ValueError): digipin.encode(51.5, -0.12)  # London: no fabricated pin
    with pytest.raises(ValueError): digipin.decode("ABC")


def test_ndvi_formula_and_pct():
    assert ndvi.ndvi(0.8, 0.2) == pytest.approx(0.6)
    assert ndvi.ndvi(0, 0) is None
    assert ndvi.pct_change(0.8, 0.4) == -50.0
    assert ndvi.pct_change(0.1, 0.05) is None  # not meaningful for sparse vegetation


def test_weather_parse_keeps_missing_as_none():
    rows = open_meteo.parse({"daily": {"time": ["2026-01-01", "2026-01-02"], "precipitation_sum": [3.2, None],
                                       "temperature_2m_max": [30, 31], "temperature_2m_min": [20, None]}})
    assert rows[1]["precip_mm"] is None and rows[0]["precip_mm"] == 3.2


def test_weather_failure_is_explicit_not_fabricated(monkeypatch):
    def boom(*a, **k): raise httpx.ConnectError("offline")
    monkeypatch.setattr(httpx, "get", boom)
    r = open_meteo.fetch(13, 77, date.today() - timedelta(days=10))
    assert r["status"] == "unavailable" and "daily" not in r


def _claim(dis="flood"):
    return {"incident_date": date(2026, 7, 10), "disaster_type": dis, "description": "Field submerged"}


def test_engine_thresholds_and_manual_review():
    sat = {"status": "completed", "pre_ndvi": 0.8, "post_ndvi": 0.35, "valid_pixel_pct_pre": 90, "valid_pixel_pct_post": 80}
    r = engine.run(_claim(), SQ, [], sat, {"status": "unavailable"})
    assert r["category"] == "significant" and r["manual_review_required"] is True
    assert any("zero rainfall" in w for w in r["warnings"]) and any("photographs" in w for w in r["warnings"])
    sat["post_ndvi"] = 0.78
    assert engine.run(_claim(), SQ, [], sat, {"status": "unavailable"})["category"] == "none"


def test_engine_insufficient_and_demo_flagging():
    r = engine.run(_claim(), SQ, [], {"status": "config_required", "error": "GEE not configured"}, {"status": "unavailable"})
    assert r["category"] == "insufficient_satellite"
    d = engine.run(_claim(), SQ, [], ndvi.demo(date(2026, 7, 10)), {"status": "unavailable"})
    assert d["is_demo"] and any("DEMONSTRATION" in w for w in d["warnings"])


def test_engine_low_coverage_not_trusted():
    sat = {"status": "completed", "pre_ndvi": 0.8, "post_ndvi": 0.2, "valid_pixel_pct_pre": 20, "valid_pixel_pct_post": 90}
    assert engine.run(_claim(), SQ, [], sat, {"status": "unavailable"})["category"] == "insufficient_satellite"


# --- API ---
def test_auth_validation_and_duplicate(client, farmer):
    assert client.post("/api/auth/register", json={"name": "A", "email": "x@t.io", "password": "short", "consent": True}).status_code == 422
    assert client.post("/api/auth/register", json={"name": "Abc", "email": "y@t.io", "password": "Passw0rd!x", "consent": False}).status_code == 422
    assert client.post("/api/auth/register", json={"name": "Ravi", "email": "RAVI@t.io", "password": "Passw0rd!x", "consent": True}).status_code == 409
    assert client.post("/api/auth/login", json={"email": "ravi@t.io", "password": "wrong-pass"}).status_code == 401
    assert client.get("/api/auth/me").status_code == 401


def test_role_permissions(client, farmer):
    off = login(client, "officer@t.io")
    assert client.get("/api/admin/users", headers=farmer).status_code == 403
    assert client.get("/api/admin/users", headers=off).status_code == 403
    assert client.post("/api/farms", json={"name": "Nope", "state": "K", "district": "D"}, headers=off).status_code == 403
    assert client.get("/api/admin/users", headers=login(client, "admin@t.io")).status_code == 200


def test_field_polygon_validation(client, farmer):
    farm = client.post("/api/farms", json={"name": "Ravi Farm", "state": "Karnataka", "district": "Bengaluru Rural", "village": "Hoskote"}, headers=farmer)
    assert farm.status_code == 201
    fid = farm.json()["id"]
    bad = client.post("/api/fields", json={"farm_id": fid, "name": "Bow", "boundary": BOWTIE}, headers=farmer)
    assert bad.status_code == 422 and "Invalid boundary" in bad.json()["detail"]
    assert client.post("/api/fields", json={"farm_id": fid, "name": "P", "boundary": {"type": "Point", "coordinates": [1, 2]}}, headers=farmer).status_code == 422
    ok = client.post("/api/fields", json={"farm_id": fid, "name": "North plot", "crop": "Paddy", "boundary": SQ}, headers=farmer)
    assert ok.status_code == 201
    f = ok.json()
    assert 15 < f["area_ha"] < 25 and len(f["digipin"]) == 10  # ~0.4km x 0.43km = ~19 ha


def test_digipin_outside_coverage_is_unavailable(client, farmer):
    london = {"type": "Polygon", "coordinates": [[[-0.12, 51.5], [-0.119, 51.5], [-0.119, 51.501], [-0.12, 51.501], [-0.12, 51.5]]]}
    r = client.post("/api/fields/preview", json={"boundary": london}, headers=farmer)
    assert r.status_code == 200 and r.json()["digipin"] is None and r.json()["digipin_available"] is False


def _jpeg(size=(64, 64)):
    b = io.BytesIO(); Image.new("RGB", size, (30, 120, 40)).save(b, "JPEG"); return b.getvalue()


def test_full_claim_workflow(client, farmer, other_farmer, monkeypatch):
    monkeypatch.setattr(open_meteo, "fetch", lambda *a, **k: {
        "status": "completed", "source": open_meteo.SOURCE, "range": ["2026-06-10", "2026-07-24"], "incident_date": "2026-07-10",
        "limitations": open_meteo.LIMITS, "retrieved_at": "2026-07-25T00:00:00+00:00",
        "daily": [{"date": f"2026-07-{d:02d}", "precip_mm": 80.0 if d == 10 else 2.0, "tmax_c": 30, "tmin_c": 22} for d in range(1, 20)]})
    field = client.get("/api/fields", headers=farmer).json()[0]
    inc = (date.today() - timedelta(days=30)).isoformat()
    body = {"field_id": field["id"], "crop_name": "Paddy", "disaster_type": "flood", "incident_date": inc, "description": "Field flooded", "consent": True}
    assert client.post("/api/claims", json={**body, "incident_date": (date.today() + timedelta(days=3)).isoformat()}, headers=farmer).status_code == 422
    c = client.post("/api/claims", json=body, headers=farmer)
    assert c.status_code == 201
    cid = c.json()["id"]
    # evidence validation
    assert client.post(f"/api/claims/{cid}/evidence", files={"file": ("x.jpg", b"not an image", "image/jpeg")}, headers=farmer).status_code == 415
    for i in range(3):
        r = client.post(f"/api/claims/{cid}/evidence", files={"file": (f"p{i}.jpg", _jpeg(), "image/jpeg")}, headers=farmer)
        assert r.status_code == 201 and r.json()["has_gps"] is False and len(r.json()["sha256"]) == 64
    # isolation
    assert client.get(f"/api/claims/{cid}", headers=other_farmer).status_code == 404
    # submit -> background pipeline (TestClient runs it)
    s = client.post(f"/api/claims/{cid}/submit", headers=farmer)
    assert s.status_code == 200 and s.json()["ref"].startswith("KC-")
    d = client.get(f"/api/claims/{cid}", headers=farmer).json()
    assert d["status"] == "analysis_completed", d["history"]
    assert d["satellite"]["status"] == "demo" and d["satellite"]["is_demo"] is True  # labelled, never passed off as real
    assert d["assessments"][0]["manual_review_required"] is True and d["report"]["sha256"]
    assert d["weather"]["status"] == "completed"
    # evidence file access control
    eid = d["evidence"][0]["id"]
    assert client.get(f"/api/evidence/{eid}/file", headers=farmer).status_code == 200
    assert client.get(f"/api/evidence/{eid}/file", headers=other_farmer).status_code == 404
    # report download + verification
    pdf = client.get(f"/api/reports/{cid}/download", headers=farmer)
    assert pdf.status_code == 200 and pdf.content[:5] == b"%PDF-" and len(pdf.content) > 5000
    assert client.get(f"/api/reports/{cid}/download", headers=other_farmer).status_code == 404
    # officer cannot see unassigned claim; admin assigns; officer reviews
    off = login(client, "officer@t.io"); adm = login(client, "admin@t.io")
    assert client.get(f"/api/claims/{cid}", headers=off).status_code == 404
    oid = client.get("/api/admin/users?role=officer", headers=adm).json()[0]["id"]
    assert client.post(f"/api/admin/claims/{cid}/assign?officer_id={oid}", headers=adm).status_code == 200
    assert client.post(f"/api/claims/{cid}/review", json={"action": "approve", "comment": "x"}, headers=login(client, "officer2@t.io")).status_code == 404
    assert client.post(f"/api/claims/{cid}/review", json={"action": "request_evidence"}, headers=off).status_code == 422  # reason required
    assert client.post(f"/api/claims/{cid}/review", json={"action": "start_review"}, headers=off).status_code == 200
    r = client.post(f"/api/claims/{cid}/review", json={"action": "request_evidence", "comment": "Please add a wide-angle photo"}, headers=off)
    assert r.json()["status"] == "additional_evidence_required"
    assert client.post(f"/api/claims/{cid}/review", json={"action": "approve", "comment": "ok"}, headers=farmer).status_code == 403
    # farmer sees updated status + notifications, audit trail exists
    assert client.get(f"/api/claims/{cid}", headers=farmer).json()["status"] == "additional_evidence_required"
    n = client.get("/api/notifications", headers=farmer).json()
    assert n["unread"] > 0 and any("Additional evidence" in i["title"] for i in n["items"])
    code = client.get(f"/api/claims/{cid}", headers=farmer).json()["report"]
    assert code
    actions = {a["action"] for a in client.get("/api/admin/audit", headers=adm).json()["items"]}
    assert {"claim.submit", "admin.assign", "review.start_review", "report.download"} <= actions


def test_pipeline_without_gee_or_demo_reports_config_required(monkeypatch):
    from app.core.config import get_settings
    monkeypatch.setattr(get_settings(), "allow_demo_data", False)
    r = ndvi.analyze(SQ, date(2026, 7, 10))
    assert r["status"] == "config_required" and "pre_ndvi" not in r
