import type { LngLat } from './types';

// Seeded PRNG so the initial fleet layout is identical on every load.
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const R_KM = 6371;
const rad = (d: number): number => (d * Math.PI) / 180;

export function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

export function segLengths(path: LngLat[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < path.length; i++) out.push(haversineKm(path[i - 1], path[i]));
  return out;
}

export function pathLengthKm(path: LngLat[]): number {
  return segLengths(path).reduce((a, b) => a + b, 0);
}

// bearing a -> b in degrees, 0..360 (0 = north, 90 = east)
export function bearing(a: LngLat, b: LngLat): number {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x =
    Math.cos(rad(a[1])) * Math.sin(rad(b[1])) -
    Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Position + heading at fraction t (0..1) along a polyline.
// Shift a point ~meters to the right of the travel direction — so trucks sit on
// the correct (right-hand) carriageway for Turkey, and outbound / return traffic
// doesn't overlap on the centreline.
export function offsetRight(lngLat: LngLat, headingDeg: number, meters: number): LngLat {
  const th = (headingDeg * Math.PI) / 180;
  const east = Math.cos(th);
  const north = -Math.sin(th);
  const dLat = (meters * north) / 111320;
  const dLng = (meters * east) / (111320 * Math.cos((lngLat[1] * Math.PI) / 180));
  return [lngLat[0] + dLng, lngLat[1] + dLat];
}

// Whole polyline shifted onto the right-hand carriageway, using each vertex's
// local travel direction. `reverse` flips it for the return leg.
export function offsetPath(path: LngLat[], meters: number, reverse = false): LngLat[] {
  const n = path.length;
  if (n < 2) return path.slice();
  const out: LngLat[] = [];
  for (let i = 0; i < n; i++) {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(n - 1, i + 1)];
    let h = bearing(a, b);
    if (reverse) h = (h + 180) % 360;
    out.push(offsetRight(path[i], h, meters));
  }
  return out;
}

export function along(
  path: LngLat[],
  seg: number[],
  totalKm: number,
  t: number,
): { lngLat: LngLat; heading: number } {
  const target = Math.max(0, Math.min(1, t)) * totalKm;
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const len = seg[i - 1];
    if (acc + len >= target || i === path.length - 1) {
      const f = len === 0 ? 0 : (target - acc) / len;
      const a = path[i - 1];
      const b = path[i];
      return {
        lngLat: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f],
        heading: bearing(a, b),
      };
    }
    acc += len;
  }
  const a = path[path.length - 2];
  const b = path[path.length - 1];
  return { lngLat: [b[0], b[1]], heading: bearing(a, b) };
}
