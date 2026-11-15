from __future__ import annotations
"""Official India Post DIGIPIN specification implementation.

Faithful implementation of India Post's official open-source specifications:
- https://www.indiapost.gov.in/digipin
- https://github.com/INDIAPOST-gov/digipin
- Level 10 resolution: ~4m × 4m continuous bounding cell.
- Reference vector from official repository:
  (13.11179621, 80.20264269) -> 4T396F42L7

DIGIPIN is a geographic spatial indexing reference only — NOT proof of land
ownership and NOT a substitute for the complete cadastral field polygon.
"""
import re
from typing import Tuple, Dict, List

GRID = [
    ["F", "C", "9", "8"],
    ["J", "3", "2", "7"],
    ["K", "4", "5", "6"],
    ["L", "M", "P", "T"]
]
MIN_LAT, MAX_LAT, MIN_LON, MAX_LON = 2.5, 38.5, 63.5, 99.5
_VALID = re.compile(r"^[23456789CJKLMPFT]{10}$")


def is_valid(pin: str) -> bool:
    """Validate if string is a valid 10-character India Post DIGIPIN."""
    if not isinstance(pin, str):
        return False
    return bool(_VALID.match(pin.strip().upper()))


def encode(lat: float, lon: float, length: int = 10) -> str:
    """Encode latitude and longitude into official India Post DIGIPIN.
    length: length of code (1 to 10). Level 10 represents ~4m x 4m precision.
    """
    if not (MIN_LAT <= lat <= MAX_LAT):
        raise ValueError(f"Latitude {lat}° out of India coverage range [{MIN_LAT}, {MAX_LAT}]")
    if not (MIN_LON <= lon <= MAX_LON):
        raise ValueError(f"Longitude {lon}° out of India coverage range [{MIN_LON}, {MAX_LON}]")

    length = max(1, min(10, length))
    min_lat, max_lat, min_lon, max_lon = MIN_LAT, MAX_LAT, MIN_LON, MAX_LON
    out = ""

    for _ in range(length):
        lat_div = (max_lat - min_lat) / 4
        lon_div = (max_lon - min_lon) / 4
        row = 3 - int((lat - min_lat) // lat_div)
        col = int((lon - min_lon) // lon_div)
        row = max(0, min(row, 3))
        col = max(0, min(col, 3))
        out += GRID[row][col]
        max_lat = min_lat + lat_div * (4 - row)
        min_lat = min_lat + lat_div * (3 - row)
        min_lon = min_lon + lon_div * col
        max_lon = min_lon + lon_div

    return out


def decode_bounds(pin: str) -> Tuple[float, float, float, float]:
    """Decode DIGIPIN to its exact bounding box (min_lat, max_lat, min_lon, max_lon)."""
    pin = pin.strip().upper()
    if not _VALID.match(pin) and not re.match(r"^[23456789CJKLMPFT]{1,10}$", pin):
        raise ValueError(f"Invalid DIGIPIN code: {pin}")

    min_lat, max_lat, min_lon, max_lon = MIN_LAT, MAX_LAT, MIN_LON, MAX_LON
    for ch in pin:
        ri, ci = next((r, c) for r in range(4) for c in range(4) if GRID[r][c] == ch)
        lat_div = (max_lat - min_lat) / 4
        lon_div = (max_lon - min_lon) / 4
        lat1, lat2 = max_lat - lat_div * (ri + 1), max_lat - lat_div * ri
        lon1, lon2 = min_lon + lon_div * ci, min_lon + lon_div * (ci + 1)
        min_lat, max_lat, min_lon, max_lon = lat1, lat2, lon1, lon2

    return round(min_lat, 8), round(max_lat, 8), round(min_lon, 8), round(max_lon, 8)


def decode(pin: str) -> Tuple[float, float]:
    """Decode DIGIPIN to representative centroid coordinates (lat, lon)."""
    min_lat, max_lat, min_lon, max_lon = decode_bounds(pin)
    return round((min_lat + max_lat) / 2, 6), round((min_lon + max_lon) / 2, 6)


def decode_cell_polygon(pin: str) -> dict:
    """Decode DIGIPIN into a GeoJSON Polygon representing the exact bounding cell."""
    min_lat, max_lat, min_lon, max_lon = decode_bounds(pin)
    # GeoJSON coordinates order: [lon, lat]
    coordinates = [[
        [min_lon, min_lat],
        [max_lon, min_lat],
        [max_lon, max_lat],
        [min_lon, max_lat],
        [min_lon, min_lat]
    ]]
    return {
        "type": "Polygon",
        "coordinates": coordinates,
        "properties": {
            "digipin": pin.strip().upper(),
            "center": [(min_lat + max_lat) / 2, (min_lon + max_lon) / 2],
            "width_m": round(abs(max_lon - min_lon) * 111320 * 0.97, 2),
            "height_m": round(abs(max_lat - min_lat) * 110540, 2)
        }
    }


def explore_hierarchy(pin: str) -> List[Dict]:
    """Returns the progressive hierarchical decomposition from Level 1 to Level 10."""
    pin = pin.strip().upper()
    if not is_valid(pin):
        raise ValueError(f"Invalid DIGIPIN for hierarchical exploration: {pin}")

    steps = []
    for length in range(1, len(pin) + 1):
        sub_pin = pin[:length]
        min_lat, max_lat, min_lon, max_lon = decode_bounds(sub_pin)
        center_lat = round((min_lat + max_lat) / 2, 6)
        center_lon = round((min_lon + max_lon) / 2, 6)
        steps.append({
            "level": length,
            "prefix": sub_pin,
            "character": pin[length - 1],
            "center": [center_lat, center_lon],
            "bounds": [min_lat, max_lat, min_lon, max_lon],
            "precision_m": "~" + str(round(4000000 / (4 ** length), 1)) if length < 8 else "~4m"
        })
    return steps
