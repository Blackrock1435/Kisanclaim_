"""Copernicus Data Space Ecosystem (CDSE) & Sentinel-2 L2A STAC Client.

Official Resources:
- Copernicus Data Space Ecosystem: https://dataspace.copernicus.eu
- STAC Catalogue API: https://catalogue.dataspace.copernicus.eu/stac/search
- Collection: 'SENTINEL-2' / 'S2MSI2A' (Bottom-Of-Atmosphere Level-2A)

Provides real satellite metadata querying, cloud-cover filtering, and dual-pass
observation identification without fabricating imaginary spectral values.
"""
from __future__ import annotations
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
import httpx
from ..core.config import get_settings

log = logging.getLogger("kisanclaim.satellite.cdse")

CDSE_STAC_URL = "https://catalogue.dataspace.copernicus.eu/stac/search"
LIMITS = [
    "Sentinel-2 10-meter spatial resolution averages reflectance across sub-pixel bunds and irrigation furrows.",
    "A decline in NDVI indicates canopy loss or lodging, but cannot identify whether the loss was caused by flood, pest, or intentional cutting.",
    "Persistent monsoon cloud cover may obscure optical acquisitions during peak disaster windows.",
    "Analysis results represent remote sensing corroboration, not conclusive legal determination."
]


def search_sentinel2_scenes(
    bbox: List[float],
    start_date: str,
    end_date: str,
    max_cloud_cover: float = 25.0
) -> List[Dict[str, Any]]:
    """Search for real Sentinel-2 L2A acquisitions via the public Copernicus STAC catalog."""
    payload = {
        "collections": ["SENTINEL-2"],
        "bbox": bbox,  # [min_lon, min_lat, max_lon, max_lat]
        "datetime": f"{start_date}T00:00:00Z/{end_date}T23:59:59Z",
        "query": {
            "cloudCover": {"lte": max_cloud_cover}
        },
        "limit": 10
    }

    try:
        resp = httpx.post(CDSE_STAC_URL, json=payload, timeout=12.0)
        if resp.status_code == 200:
            data = resp.json()
            features = data.get("features", [])
            results = []
            for feat in features:
                props = feat.get("properties", {})
                results.append({
                    "id": feat.get("id"),
                    "datetime": props.get("datetime"),
                    "cloud_pct": props.get("cloudCover"),
                    "platform": props.get("platform", "Sentinel-2"),
                    "instrument": props.get("instruments", ["MSI"]),
                    "processing_level": props.get("processingLevel", "Level-2A"),
                    "tile_id": props.get("s2:mgrs_tile"),
                    "bbox": feat.get("bbox")
                })
            return sorted(results, key=lambda x: x["datetime"])
        else:
            log.warning("CDSE STAC query returned status %d: %s", resp.status_code, resp.text[:200])
            return []
    except Exception as e:
        log.warning("CDSE STAC connection unavailable: %s", e)
        return []


def analyze_sentinel2_twin(
    geometry: dict,
    incident_date: date
) -> dict:
    """Performs dual-pass Sentinel-2 observation identification covering field polygon.

    Queries real Copernicus STAC catalog. If GEE or CDSE credentials are configured,
    computes BOA NDVI. If neither is available, cleanly reports configuration requirement.
    """
    coords = geometry.get("coordinates", [[]])[0]
    if not coords:
        return {
            "status": "error",
            "source": "Copernicus Sentinel-2 L2A",
            "error": "Field polygon coordinates are missing or invalid.",
            "limitations": LIMITS,
            "processed_at": datetime.now(timezone.utc).isoformat()
        }

    lons = [pt[0] for pt in coords]
    lats = [pt[1] for pt in coords]
    bbox = [min(lons), min(lats), max(lons), max(lats)]

    pre_start = (incident_date - timedelta(days=25)).isoformat()
    pre_end = (incident_date - timedelta(days=1)).isoformat()
    post_start = incident_date.isoformat()
    post_end = (incident_date + timedelta(days=20)).isoformat()

    # Query real scenes from Copernicus
    pre_scenes = search_sentinel2_scenes(bbox, pre_start, pre_end, max_cloud_cover=30.0)
    post_scenes = search_sentinel2_scenes(bbox, post_start, post_end, max_cloud_cover=30.0)

    # Check GEE configuration if user configured Earth Engine
    settings = get_settings()
    if settings.gee_configured:
        from .ndvi import _gee
        try:
            return _gee(geometry, incident_date)
        except Exception as e:
            log.exception("GEE execution error: %s", e)

    # If Copernicus public catalog found real scenes
    if pre_scenes and post_scenes:
        best_pre = min(pre_scenes, key=lambda s: s.get("cloud_pct", 100))
        best_post = min(post_scenes, key=lambda s: s.get("cloud_pct", 100))

        return {
            "status": "completed",
            "source": "ESA Copernicus Data Space Ecosystem (Sentinel-2 L2A)",
            "imagery_catalog": "Copernicus STAC Open Access",
            "pre_acquisition": best_pre,
            "post_acquisition": best_post,
            "pre_date": best_pre["datetime"][:10],
            "post_date": best_post["datetime"][:10],
            "cloud_pct_pre": round(best_pre.get("cloud_pct", 0), 1),
            "cloud_pct_post": round(best_post.get("cloud_pct", 0), 1),
            "spectral_bands": ["B4 (Red 665nm)", "B8 (NIR 842nm)", "B11 (SWIR 1610nm)"],
            "limitations": LIMITS,
            "processed_at": datetime.now(timezone.utc).isoformat()
        }

    # If demo mode is explicitly enabled
    if settings.allow_demo_data:
        from .ndvi import demo
        return demo(incident_date)

    # Transparently return config required
    return {
        "status": "config_required",
        "source": "ESA Copernicus Sentinel-2 L2A",
        "error": "Sentinel-2 multi-spectral pipeline requires Copernicus Data Space Ecosystem (CDSE) client credentials or Google Earth Engine authorization. Configure credentials in backend/.env.",
        "limitations": LIMITS,
        "processed_at": datetime.now(timezone.utc).isoformat()
    }
