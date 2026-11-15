import math
from fastapi import HTTPException
from pyproj import Geod
from shapely.geometry import Point, Polygon as ShapelyPolygon, shape, mapping
from shapely.validation import explain_validity
from ..digipin import digipin

_geod = Geod(ellps="WGS84")
MAX_HA = 2000


def process_boundary(geojson: dict) -> dict:
    """Validate polygon; return normalized geometry, centroid, geodesic area (ha) and DIGIPIN if in coverage."""
    if not isinstance(geojson, dict) or geojson.get("type") != "Polygon":
        raise HTTPException(422, "Boundary must be a GeoJSON Polygon")
    try:
        g = shape(geojson)
    except Exception:
        raise HTTPException(422, "Boundary geometry could not be read")
    if not g.is_valid:
        raise HTTPException(422, f"Invalid boundary: {explain_validity(g)}. Redraw without crossing lines.")
    if g.is_empty or len(g.exterior.coords) < 4:
        raise HTTPException(422, "Boundary needs at least 3 corner points")
    minx, miny, maxx, maxy = g.bounds
    if not (-180 <= minx <= maxx <= 180 and -90 <= miny <= maxy <= 90):
        raise HTTPException(422, "Coordinates must be longitude/latitude (EPSG:4326)")
    area_m2, _ = _geod.geometry_area_perimeter(g)
    ha = abs(area_m2) / 10_000
    if ha < 0.001:
        raise HTTPException(422, "Field area is too small")
    if ha > MAX_HA:
        raise HTTPException(422, f"Field area exceeds {MAX_HA} ha - please check the boundary")
    c = g.centroid
    try:
        pin = digipin.encode(c.y, c.x)
    except ValueError:
        pin = None  # outside India Post DIGIPIN coverage
    return {"geometry": mapping(g), "lat": c.y, "lon": c.x, "area_ha": round(ha, 4), "digipin": pin}


def process_4corner_parcel(coords: list[list[float]]) -> dict:
    """Validate a 4-corner agricultural parcel, calculate area (ha & acres),

    centroid DIGIPIN and 4 corner DIGIPINs according to official India Post specifications.
    Input coords: list of 4 [lat, lon] or 5 with closing coordinate.
    """
    if len(coords) not in (4, 5):
        raise HTTPException(422, "A 4-corner parcel must have exactly 4 corner points")

    clean_pts = [(p[1], p[0]) for p in coords[:4]]  # (lon, lat) for Shapely
    clean_pts.append(clean_pts[0])  # close polygon

    poly = ShapelyPolygon(clean_pts)
    if not poly.is_valid:
        raise HTTPException(422, f"Invalid parcel geometry: {explain_validity(poly)}. Corners must not cross each other.")

    area_m2, _ = _geod.geometry_area_perimeter(poly)
    ha = round(abs(area_m2) / 10_000, 4)
    if ha < 0.001:
        raise HTTPException(422, "Parcel area is zero or too small. Please check your boundary coordinates.")
    if ha > 2000.0:
        raise HTTPException(422, "Parcel area exceeds maximum 2000 ha threshold. Please redraw field boundary.")

    acres = round(ha * 2.47105, 3)

    c = poly.centroid
    try:
        centroid_pin = digipin.encode(c.y, c.x)
    except ValueError:
        centroid_pin = None

    corner_pins = []
    for p in coords[:4]:
        try:
            corner_pins.append({"lat": p[0], "lon": p[1], "digipin": digipin.encode(p[0], p[1])})
        except ValueError:
            corner_pins.append({"lat": p[0], "lon": p[1], "digipin": None})

    geojson_poly = mapping(poly)
    return {
        "geometry": geojson_poly,
        "centroid_lat": round(c.y, 6),
        "centroid_lon": round(c.x, 6),
        "centroid_digipin": centroid_pin,
        "corner_digipins": corner_pins,
        "area_ha": ha,
        "area_acres": acres,
        "boundary_validation_status": "VALID_GEOMETRY",
        "legal_notice": "India Post DIGIPIN provides 4m×4m spatial location pinning and does not constitute statutory land title ownership.",
    }


def point_to_polygon_distance_m(lat: float, lon: float, polygon_geojson: dict) -> tuple[float, str]:
    """Calculate minimum geodesic distance from a point to a polygon in meters and classify 400m geofence.

    Returns: (distance_meters, status)
    status: 'inside' | 'within_400m' | 'beyond_400m'
    """
    try:
        poly = shape(polygon_geojson)
        pt = Point(lon, lat)
    except Exception:
        return 99999.0, "beyond_400m"

    if poly.contains(pt):
        return 0.0, "inside"

    # Nearest point on polygon exterior
    nearest_pt = poly.exterior.interpolate(poly.exterior.project(pt))
    _, _, dist_m = _geod.inv(lon, lat, nearest_pt.x, nearest_pt.y)
    dist_m = round(abs(dist_m), 1)

    if dist_m <= 400.0:
        status = "within_400m"
    else:
        status = "beyond_400m"

    return dist_m, status

