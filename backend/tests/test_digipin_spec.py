import pytest
from app.digipin import digipin


def test_official_india_post_test_vector():
    # Official test vector from India Post GitHub & specs:
    # (13.11179621, 80.20264269) -> 4T396F42L7
    pin = digipin.encode(13.11179621, 80.20264269)
    assert pin == "4T396F42L7"
    lat, lon = digipin.decode("4T396F42L7")
    assert abs(lat - 13.111796) < 0.0001
    assert abs(lon - 80.202642) < 0.0001


def test_digipin_bounds_and_polygon():
    bounds = digipin.decode_bounds("4T396F42L7")
    assert len(bounds) == 4
    min_lat, max_lat, min_lon, max_lon = bounds
    assert min_lat < max_lat
    assert min_lon < max_lon
    assert 13.111 <= min_lat <= 13.112
    assert 80.202 <= min_lon <= 80.203

    poly = digipin.decode_cell_polygon("4T396F42L7")
    assert poly["type"] == "Polygon"
    assert len(poly["coordinates"][0]) == 5
    assert poly["properties"]["digipin"] == "4T396F42L7"


def test_digipin_hierarchy():
    steps = digipin.explore_hierarchy("4T396F42L7")
    assert len(steps) == 10
    assert steps[0]["level"] == 1
    assert steps[0]["prefix"] == "4"
    assert steps[9]["level"] == 10
    assert steps[9]["prefix"] == "4T396F42L7"


def test_digipin_validation():
    assert digipin.is_valid("4T396F42L7") is True
    assert digipin.is_valid("ABC") is False
    assert digipin.is_valid("1234567890") is False  # 0 and 1 are invalid in DIGIPIN
