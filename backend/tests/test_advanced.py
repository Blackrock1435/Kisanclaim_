import pytest
from app.api.geo import process_4corner_parcel, point_to_polygon_distance_m
from app.digipin import digipin


def test_4corner_parcel_lock_and_digipins():
    # 4 corners around a field in Mandya / Bengaluru Rural (lat, lon)
    coords = [
        [13.1110, 80.2020],
        [13.1125, 80.2020],
        [13.1125, 80.2035],
        [13.1110, 80.2035],
    ]
    res = process_4corner_parcel(coords)
    assert res["area_ha"] > 0
    assert res["area_acres"] > 0
    assert len(res["centroid_digipin"]) == 10
    assert len(res["corner_digipins"]) == 4
    for c in res["corner_digipins"]:
        assert len(c["digipin"]) == 10


def test_400m_geofence_classification():
    # Polygon around lat 13.111 to 13.113, lon 80.202 to 80.204
    poly_geojson = {
        "type": "Polygon",
        "coordinates": [[
            [80.202, 13.111],
            [80.202, 13.113],
            [80.204, 13.113],
            [80.204, 13.111],
            [80.202, 13.111],
        ]]
    }

    # Point 1: Inside polygon
    dist, status = point_to_polygon_distance_m(13.112, 80.203, poly_geojson)
    assert status == "inside"
    assert dist == 0.0

    # Point 2: Very close (about 50m away)
    dist2, status2 = point_to_polygon_distance_m(13.1135, 80.203, poly_geojson)
    assert status2 == "within_400m"
    assert 0 < dist2 <= 400.0

    # Point 3: Far away (about 5km away)
    dist3, status3 = point_to_polygon_distance_m(13.150, 80.203, poly_geojson)
    assert status3 == "beyond_400m"
    assert dist3 > 400.0


def test_digipin_official_test_vector():
    # Official test vector from India Post specification:
    # (13.11179621, 80.20264269) -> 4T396F42L7
    pin = digipin.encode(13.11179621, 80.20264269)
    assert pin == "4T396F42L7"
    lat, lon = digipin.decode("4T396F42L7")
    assert abs(lat - 13.111796) < 0.0001
    assert abs(lon - 80.202642) < 0.0001


def test_copilot_chat_endpoint_validation(client):
    from .conftest import login
    headers = login(client, "officer@t.io")
    # Nonexistent claim should return 404
    r = client.post("/api/copilot/chat", json={"claim_id": 999999, "question": "Why is this claim suspicious?"}, headers=headers)
    assert r.status_code == 404


def test_evidence_graph_dag_stages(client):
    from .conftest import login
    headers = login(client, "officer@t.io")
    # Nonexistent claim returns 404
    r = client.get("/api/evidence-graph/999999", headers=headers)
    assert r.status_code == 404

    # Fetch claim #1
    r = client.get("/api/evidence-graph/1", headers=headers)
    if r.status_code == 200:
        data = r.json()
        assert "stages" in data
        assert len(data["stages"]) == 6
        assert "nodes" in data
        assert len(data["nodes"]) >= 20
        assert "links" in data
        assert len(data["links"]) >= 15
        assert "timeline" in data
        assert len(data["timeline"]) == 11
        assert "claims_list" in data


