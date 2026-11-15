from __future__ import annotations
"""Sentinel-2 NDVI analysis.

* ndvi(): NDVI = (NIR - RED) / (NIR + RED); Sentinel-2 NIR = B8, RED = B4.
* analyze(): real analysis through Google Earth Engine (COPERNICUS/S2_SR_HARMONIZED, SCL cloud/shadow mask)
  ONLY when GEE credentials are configured. Otherwise returns 'config_required'
  or - if ALLOW_DEMO_DATA=true - the deck's ILLUSTRATIVE series clearly flagged as demo. Never silent fabrication.
"""
from datetime import date, datetime, timedelta, timezone
from ..core.config import get_settings

SOURCE = "Sentinel-2 L2A (COPERNICUS/S2_SR_HARMONIZED) via Google Earth Engine"
LIMITS = [
    "NDVI changes can also come from normal growth, maturity, harvest, irrigation, soil background or cloud residue.",
    "A decline in NDVI is NOT proof of disaster damage and NDVI does not measure financial loss.",
    "Satellite imagery cannot establish the cause of damage.",
]


def ndvi(nir: float, red: float) -> float | None:
    d = nir + red
    return None if d == 0 else (nir - red) / d


def pct_change(pre: float | None, post: float | None) -> float | None:
    if pre is None or post is None or pre < 0.2:  # not meaningful for bare / very sparse vegetation
        return None
    return round((post - pre) / pre * 100, 1)


# Illustrative weekly pattern from the pitch deck (NOT measured).
_DEMO_HEALTHY = [0.45, 0.58, 0.70, 0.78, 0.82, 0.84, 0.83, 0.80]
_DEMO_DAMAGED = [0.45, 0.57, 0.69, 0.77, 0.35, 0.30, 0.31, 0.33]


def demo(incident: date) -> dict:
    series = []
    for i in range(8):
        d = incident + timedelta(days=(i - 4) * 7)
        series.append({"date": d.isoformat(), "ndvi": _DEMO_DAMAGED[i], "reference": _DEMO_HEALTHY[i],
                       "valid_pixel_pct": None, "phase": "pre" if d < incident else "post"})
    pre, post = _DEMO_DAMAGED[3], _DEMO_DAMAGED[5]
    return {"status": "demo", "is_demo": True, "source": "DEMONSTRATION DATA - illustrative sample, not satellite-measured",
            "series": series, "pre_ndvi": pre, "post_ndvi": post, "diff": round(post - pre, 3),
            "pct_change": pct_change(pre, post), "pre_date": series[3]["date"], "post_date": series[5]["date"],
            "valid_pixel_pct_pre": None, "valid_pixel_pct_post": None, "cloud_note": "n/a (demo)",
            "limitations": LIMITS, "processed_at": datetime.now(timezone.utc).isoformat()}


def _gee(geometry: dict, incident: date) -> dict:
    import ee  # optional dependency
    s = get_settings()
    creds = ee.ServiceAccountCredentials(s.gee_service_account, s.gee_private_key_file)
    ee.Initialize(creds, project=s.gee_project)
    geom = ee.Geometry(geometry)

    def mask(img):
        scl = img.select("SCL")
        bad = scl.eq(3).Or(scl.eq(8)).Or(scl.eq(9)).Or(scl.eq(10)).Or(scl.eq(11))  # shadow, cloud, cirrus, snow
        n = img.normalizedDifference(["B8", "B4"]).rename("NDVI")
        return n.updateMask(bad.Not()).copyProperties(img, ["system:time_start"])

    col = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filterBounds(geom)
           .filterDate((incident - timedelta(days=90)).isoformat(), (incident + timedelta(days=60)).isoformat())
           .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 80)))

    def stats(img):
        m = img.reduceRegion(ee.Reducer.mean(), geom, 10, maxPixels=1e9)
        valid = img.mask().reduceRegion(ee.Reducer.mean(), geom, 10, maxPixels=1e9)
        return ee.Feature(None, {"t": img.get("system:time_start"), "ndvi": m.get("NDVI"), "valid": valid.get("NDVI")})

    feats = col.map(mask).map(stats).getInfo()["features"]
    series = []
    for f in feats:
        p = f["properties"]
        if p.get("ndvi") is None or p.get("t") is None:
            continue
        d = datetime.fromtimestamp(p["t"] / 1000, tz=timezone.utc).date()
        series.append({"date": d.isoformat(), "ndvi": round(p["ndvi"], 3),
                       "valid_pixel_pct": round((p.get("valid") or 0) * 100, 1), "phase": "pre" if d < incident else "post"})
    series.sort(key=lambda r: r["date"])
    pre = [r for r in series if r["phase"] == "pre" and r["valid_pixel_pct"] >= 50]
    post = [r for r in series if r["phase"] == "post" and r["valid_pixel_pct"] >= 50]
    if not pre or not post:
        return {"status": "unavailable", "source": SOURCE, "series": series, "limitations": LIMITS,
                "error": "No sufficiently cloud-free Sentinel-2 image before and after the incident (>=50% valid pixels).",
                "processed_at": datetime.now(timezone.utc).isoformat()}
    a, b = pre[-1], post[0]  # nearest usable image on each side of the incident
    return {"status": "completed", "is_demo": False, "source": SOURCE, "series": series,
            "pre_ndvi": a["ndvi"], "post_ndvi": b["ndvi"], "diff": round(b["ndvi"] - a["ndvi"], 3),
            "pct_change": pct_change(a["ndvi"], b["ndvi"]), "pre_date": a["date"], "post_date": b["date"],
            "valid_pixel_pct_pre": a["valid_pixel_pct"], "valid_pixel_pct_post": b["valid_pixel_pct"],
            "cloud_note": "SCL mask removes cloud shadow, medium/high cloud, cirrus and snow pixels.",
            "limitations": LIMITS, "processed_at": datetime.now(timezone.utc).isoformat()}


def analyze(geometry: dict, incident: date) -> dict:
    s = get_settings()
    if s.gee_configured:
        try:
            return _gee(geometry, incident)
        except Exception as e:
            return {"status": "unavailable", "source": SOURCE, "error": f"{type(e).__name__}: {e}"[:300],
                    "limitations": LIMITS, "processed_at": datetime.now(timezone.utc).isoformat()}
    if s.allow_demo_data:
        return demo(incident)
    return {"status": "config_required", "source": SOURCE, "limitations": LIMITS,
            "error": "Google Earth Engine is not configured. Set GEE_PROJECT, GEE_SERVICE_ACCOUNT and GEE_PRIVATE_KEY_FILE "
                     "(see docs/setup.md). No satellite values have been produced.",
            "processed_at": datetime.now(timezone.utc).isoformat()}
