/**
 * Geospatial utilities for KisanClaim:
 * - Geodesic Haversine distance
 * - Polygon area in acres (Spherical Shoelace)
 * - Polygon centroid calculation
 * - Edge distance calculations between vertices
 * - Default parcel coordinate generation
 */

export const EARTH_RADIUS_METERS = 6378137.0;

/** Computes great-circle distance between two GPS coordinates in meters */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180.0;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180.0;

  const a =
    Math.sin(deltaPhi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2.0) ** 2;
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates area of polygon [[lat, lon], ...] in acres using spherical Shoelace formula.
 */
export function calculatePolygonAreaAcres(coords: [number, number][]): number {
  if (!coords || coords.length < 3) return 2.5;

  const pts = [...coords];
  if (
    pts[0][0] !== pts[pts.length - 1][0] ||
    pts[0][1] !== pts[pts.length - 1][1]
  ) {
    pts.push(pts[0]);
  }

  let areaSqMeters = 0.0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [lat1, lon1] = pts[i];
    const [lat2, lon2] = pts[i + 1];

    const midLatRad = (((lat1 + lat2) / 2.0) * Math.PI) / 180.0;
    const x1 = ((lon1 * Math.PI) / 180.0) * EARTH_RADIUS_METERS * Math.cos(midLatRad);
    const y1 = ((lat1 * Math.PI) / 180.0) * EARTH_RADIUS_METERS;
    const x2 = ((lon2 * Math.PI) / 180.0) * EARTH_RADIUS_METERS * Math.cos(midLatRad);
    const y2 = ((lat2 * Math.PI) / 180.0) * EARTH_RADIUS_METERS;

    areaSqMeters += x1 * y2 - x2 * y1;
  }

  areaSqMeters = Math.abs(areaSqMeters) / 2.0;
  const acres = areaSqMeters * 0.000247105;
  return Number(Math.max(0.1, acres).toFixed(2));
}

/** Calculates the geometric centroid [lat, lon] of a polygon */
export function calculatePolygonCentroid(coords: [number, number][]): [number, number] {
  if (!coords || coords.length === 0) return [13.2456, 77.7123];

  let sumLat = 0;
  let sumLon = 0;
  const count = coords.length;

  for (let i = 0; i < count; i++) {
    sumLat += coords[i][0];
    sumLon += coords[i][1];
  }

  return [
    Number((sumLat / count).toFixed(6)),
    Number((sumLon / count).toFixed(6)),
  ];
}

/** Calculates the edge distances in meters between each successive vertex */
export function calculateEdgeDistances(coords: [number, number][]): number[] {
  if (!coords || coords.length < 2) return [];
  const distances: number[] = [];
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const nextIdx = (i + 1) % n;
    const d = haversineDistanceMeters(
      coords[i][0],
      coords[i][1],
      coords[nextIdx][0],
      coords[nextIdx][1]
    );
    distances.push(Math.round(d));
  }
  return distances;
}

/**
 * Returns a standard 4-point cadastral polygon around a given center [lat, lon]
 */
export function generateDefaultParcelCoordinates(
  centerLat: number = 13.2456,
  centerLon: number = 77.7123
): [number, number][] {
  const dLat = 0.0009;
  const dLon = 0.0011;

  return [
    [Number((centerLat + dLat * 0.95).toFixed(6)), Number((centerLon - dLon * 0.90).toFixed(6))], // P1: NW
    [Number((centerLat + dLat * 1.05).toFixed(6)), Number((centerLon + dLon * 0.85).toFixed(6))], // P2: NE
    [Number((centerLat - dLat * 0.90).toFixed(6)), Number((centerLon + dLon * 1.00).toFixed(6))], // P3: SE
    [Number((centerLat - dLat * 1.00).toFixed(6)), Number((centerLon - dLon * 0.95).toFixed(6))], // P4: SW
  ];
}
