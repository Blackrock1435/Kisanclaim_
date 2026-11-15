from __future__ import annotations
"""Transparent, rule-based PRELIMINARY assessment. No black box, no crop-loss percentage, no automatic approval.
Thresholds are configuration (RULES) and versioned so every assessment records the rules it used."""
from datetime import datetime, timezone
from shapely.geometry import Point, shape
from ..satellite.ndvi import pct_change

RULE_VERSION = "1.0.0"
RULES = {
    "min_valid_pixel_pct": 50,
    "ndvi_change_pct": {"low": -10, "moderate": -25, "significant": -40},  # more negative than these thresholds
    "flood_rain_mm_day": 50, "drought_30d_mm": 20, "min_photos": 3, "photo_near_field_m": 500,
}
CATEGORY_TEXT = {
    "none": "No significant vegetation change detected",
    "low": "Low vegetation change detected",
    "moderate": "Moderate vegetation change detected",
    "significant": "Significant vegetation change detected",
    "insufficient_satellite": "Insufficient satellite data",
    "manual": "Evidence requires manual verification",
}
WET = {"flood", "heavy_rainfall", "cyclone"}


def _distance_m(lat, lon, poly) -> float:
    # small-area approximation: degrees -> metres
    return poly.distance(Point(lon, lat)) * 111_320


def run(claim: dict, field_geom: dict, evidence: list[dict], sat: dict, weather: dict) -> dict:
    signals, warnings = [], []
    poly = shape(field_geom)
    sat_ok = sat.get("status") in ("completed", "demo") and sat.get("pre_ndvi") is not None
    if sat.get("status") == "demo":
        warnings.append("Satellite values are DEMONSTRATION data, not measured. Not usable as evidence.")
    cat = "insufficient_satellite"
    if sat_ok:
        vp = [v for v in (sat.get("valid_pixel_pct_pre"), sat.get("valid_pixel_pct_post")) if v is not None]
        if vp and min(vp) < RULES["min_valid_pixel_pct"]:
            warnings.append("Valid pixel coverage is below the minimum threshold; satellite result is unreliable.")
        else:
            ch = pct_change(sat["pre_ndvi"], sat["post_ndvi"])
            t = RULES["ndvi_change_pct"]
            if ch is None:
                cat = "manual"
                warnings.append("Pre-event NDVI is too low for a meaningful percentage change.")
            elif ch <= t["significant"]:
                cat = "significant"
            elif ch <= t["moderate"]:
                cat = "moderate"
            elif ch <= t["low"]:
                cat = "low"
            else:
                cat = "none"
            signals.append({"name": "Vegetation change (NDVI)", "status": "info",
                            "text": f"NDVI {sat['pre_ndvi']} -> {sat['post_ndvi']} ({'n/a' if ch is None else f'{ch:+}%'})."})
    else:
        warnings.append(sat.get("error") or "No usable satellite result.")

    # rainfall consistency
    rows = [r for r in (weather.get("daily") or [])]
    if weather.get("status") == "completed" and rows:
        inc = claim["incident_date"]
        near = [r["precip_mm"] for r in rows if r["precip_mm"] is not None and abs((datetime.fromisoformat(r["date"]).date() - inc).days) <= 3]
        prior = [r["precip_mm"] for r in rows if r["precip_mm"] is not None and 0 < (inc - datetime.fromisoformat(r["date"]).date()).days <= 30]
        if claim["disaster_type"] in WET and near:
            mx = max(near)
            ok = mx >= RULES["flood_rain_mm_day"]
            signals.append({"name": "Rainfall around incident", "status": "supports" if ok else "weak",
                            "text": f"Peak gridded rainfall within +/-3 days: {mx:.1f} mm/day (reference {RULES['flood_rain_mm_day']} mm)."})
        elif claim["disaster_type"] == "drought" and prior:
            tot = sum(prior)
            signals.append({"name": "Rainfall deficit", "status": "supports" if tot < RULES["drought_30d_mm"] else "weak",
                            "text": f"Total gridded rainfall in the 30 days before: {tot:.1f} mm."})
        else:
            signals.append({"name": "Rainfall", "status": "neutral", "text": "No rule applies to this disaster type; shown for context."})
    else:
        warnings.append("Historical weather data unavailable; this is not interpreted as zero rainfall.")

    # photos
    n = len(evidence)
    if n < RULES["min_photos"]:
        warnings.append(f"Additional photographs recommended ({n} uploaded, {RULES['min_photos']}+ suggested).")
    gps = [e for e in evidence if e.get("lat") is not None]
    if gps:
        near_f = [e for e in gps if _distance_m(e["lat"], e["lon"], poly) <= RULES["photo_near_field_m"]]
        signals.append({"name": "Photo locations", "status": "supports" if len(near_f) == len(gps) else "check",
                        "text": f"{len(near_f)} of {len(gps)} geotagged photos are within {RULES['photo_near_field_m']} m of the field."})
    else:
        signals.append({"name": "Photo locations", "status": "neutral",
                        "text": "No GPS metadata in photos. This is common (privacy settings, messaging apps) and is not an indicator of fraud."})

    consistency = "not_enough_data"
    if sat_ok and cat in ("none",) and claim.get("description"):
        consistency = "check"
        warnings.append("Satellite change is small while damage is reported. Manual verification advised (NDVI may miss damage).")
    elif sat_ok and cat in ("low", "moderate", "significant"):
        consistency = "aligned"
    return {"category": cat, "category_text": CATEGORY_TEXT[cat], "signals": signals, "warnings": warnings,
            "consistency": consistency, "manual_review_required": True, "rule_version": RULE_VERSION, "rules": RULES,
            "is_demo": sat.get("status") == "demo",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "disclaimer_ack": "Preliminary indicator only. Not a crop-loss percentage, insurance decision or approval."}
