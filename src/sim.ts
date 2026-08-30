import type { FeatureCollection } from 'geojson';
import { along } from './geo';
import { makeVehicles, ROUTES } from './mock';
import type { Vehicle } from './types';
import { clamp01 } from './util';

// The live simulation state. Mutated in place each animation frame; the store
// takes a snapshot from here a couple of times a second for the React panels.
export const sim: Vehicle[] = makeVehicles();

const routeById = new Map(ROUTES.map((r) => [r.id, r]));

function nextStopName(routeId: string, p: number, dir: 1 | -1): string {
  const stops = routeById.get(routeId)!.stops;
  if (dir === 1) {
    for (const s of stops) if (s.at > p) return s.name;
    return stops[stops.length - 1].name;
  }
  for (let i = stops.length - 1; i >= 0; i--) if (stops[i].at < p) return stops[i].name;
  return stops[0].name;
}

export function step(dtSec: number): void {
  const now = Date.now();
  for (const v of sim) {
    if (v.status === 'offline') continue;
    const r = routeById.get(v.routeId)!;

    const dKm = (v.speedKmh / 3600) * dtSec;
    let p = v.progress + (v.dir * dKm) / r.lengthKm;
    if (p >= 1) {
      p = 1;
      v.dir = -1;
    } else if (p <= 0) {
      p = 0;
      v.dir = 1;
    }
    v.progress = p;

    const { lngLat, heading } = along(r.path, r.seg, r.lengthKm, p);
    v.lngLat = lngLat;
    v.heading = v.dir === 1 ? heading : (heading + 180) % 360;
    v.nextStop = nextStopName(v.routeId, p, v.dir);

    v.passengerLoad = clamp01(v.passengerLoad + (Math.random() - 0.5) * 0.03 * dtSec);
    v.scheduleOffsetMin += (Math.random() - 0.5) * 0.05 * dtSec;
    v.lastUpdate = now;
  }

  // Rare signal drop / recovery.
  if (Math.random() < 0.02 * dtSec) {
    const v = sim[Math.floor(Math.random() * sim.length)];
    v.status = v.status === 'online' ? 'offline' : 'online';
    v.lastUpdate = now;
  }
}

export function vehiclesFC(): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: sim.map((v) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: v.lngLat },
      properties: {
        id: v.id,
        type: v.type,
        status: v.status,
        heading: Math.round(v.heading),
        load: Math.round(v.passengerLoad * 100),
      },
    })),
  };
}
