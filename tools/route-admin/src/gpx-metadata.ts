export interface TrackPoint {
  lat: number;
  lon: number;
  /** Elevation in meters, or null if the point has no <ele>. */
  ele: number | null;
}

/**
 * Regex-based GPX point extraction (trkpt, falling back to rtept) - the same
 * fallback convention as parseGpxTrack in browser-script.ts / the frontend's
 * route-detail.component.ts, just without needing a DOMParser since this runs
 * in plain Node, not a browser page.
 */
export function parseGpxPoints(gpxText: string): TrackPoint[] {
  const points = parsePointTag(gpxText, 'trkpt');
  return points.length > 0 ? points : parsePointTag(gpxText, 'rtept');
}

function parsePointTag(gpxText: string, tag: 'trkpt' | 'rtept'): TrackPoint[] {
  const tagRegex = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, 'g');
  const points: TrackPoint[] = [];
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(gpxText))) {
    const [, attrs, body] = match;
    const lat = parseFloat(attrs.match(/lat="([^"]+)"/)?.[1] ?? '');
    const lon = parseFloat(attrs.match(/lon="([^"]+)"/)?.[1] ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const eleText = body.match(/<ele>([^<]+)<\/ele>/)?.[1];
    const ele = eleText !== undefined ? parseFloat(eleText) : NaN;
    points.push({ lat, lon, ele: Number.isFinite(ele) ? ele : null });
  }
  return points;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(a: TrackPoint, b: TrackPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Total path length in km, rounded to 2 decimals (matches the existing data's precision). */
export function totalDistanceKm(points: TrackPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(points[i - 1], points[i]);
  }
  return Math.round(total * 100) / 100;
}

/**
 * Total elevation gain in meters, rounded to the nearest integer. Raw
 * GPS/barometric elevation readings are noisy, so climbs are only counted
 * once the elevation has moved more than ELEVATION_NOISE_THRESHOLD_M away
 * from the last "reference" point - otherwise a naive sum of every positive
 * point-to-point delta wildly overcounts gain on flat/noisy sections.
 */
const ELEVATION_NOISE_THRESHOLD_M = 2;

export function totalElevationGainM(points: TrackPoint[]): number {
  const withElevation = points.filter((p) => p.ele !== null) as (TrackPoint & {
    ele: number;
  })[];
  if (withElevation.length === 0) return 0;

  let gain = 0;
  let reference = withElevation[0].ele;
  for (const point of withElevation.slice(1)) {
    const delta = point.ele - reference;
    if (delta > ELEVATION_NOISE_THRESHOLD_M) {
      gain += delta;
      reference = point.ele;
    } else if (delta < -ELEVATION_NOISE_THRESHOLD_M) {
      reference = point.ele;
    }
  }
  return Math.round(gain);
}

/** Estimated ride time in milliseconds at a flat 30 km/h average. */
export function estimatedTimeMs(distanceKm: number): number {
  const AVERAGE_SPEED_KMH = 30;
  return Math.round((distanceKm / AVERAGE_SPEED_KMH) * 3600 * 1000);
}
