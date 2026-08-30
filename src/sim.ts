import type { FeatureCollection } from 'geojson';
import { along, offsetRight } from './geo';
import { BREAK_MIN, DRIVERS, JOBS, MAX_DRIVE_MIN, TRUCKS } from './mock';
import type { Driver, Truck } from './types';

// Live simulation state, mutated in place each frame. The store snapshots it at 2 Hz.
export const trucks: Truck[] = TRUCKS;
export const drivers: Driver[] = DRIVERS;

const jobById = new Map(JOBS.map((j) => [j.id, j]));
const driverById = new Map(drivers.map((d) => [d.id, d]));

const OFFSET_M = 9; // metres right of centreline

function assignNextJob(t: Truck): void {
  const cur = jobById.get(t.jobId)!;
  // prefer a job whose origin is near where this truck just finished
  const here = cur.origin.lngLat;
  let best = JOBS[0];
  let bestD = Infinity;
  for (const j of JOBS) {
    if (j.id === t.jobId) continue;
    const dx = j.origin.lngLat[0] - here[0];
    const dy = j.origin.lngLat[1] - here[1];
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = j;
    }
  }
  t.jobId = best.id;
  t.leg = 'out';
  t.progress = 0;
  t.lngLat = [best.origin.lngLat[0], best.origin.lngLat[1]];
  t.fuelPct = 100;
}

export function step(dtSec: number): void {
  const now = Date.now();

  for (const d of drivers) {
    if (!d.resting) continue;
    d.restLeftSec -= dtSec;
    if (d.restLeftSec <= 0) {
      d.resting = false;
      d.restLeftSec = 0;
      d.drivingMinSinceBreak = 0;
    }
  }

  for (const t of trucks) {
    if (t.status === 'offline') continue;
    const driver = driverById.get(t.driverId)!;
    const job = jobById.get(t.jobId)!;

    if (driver.resting) {
      t.lastUpdate = now;
      continue; // truck parked with its driver
    }

    if (t.dwellSec > 0) {
      t.dwellSec -= dtSec;
      if (t.dwellSec <= 0) {
        t.dwellSec = 0;
        if (t.leg === 'out') t.leg = 'back';
        else assignNextJob(t);
      }
      t.lastUpdate = now;
      continue;
    }

    const dKm = (t.speedKmh / 3600) * dtSec;
    const sign = t.leg === 'out' ? 1 : -1;
    let p = t.progress + (sign * dKm) / job.lengthKm;
    if (p >= 1) {
      p = 1;
      t.dwellSec = 6 + Math.random() * 10;
    } else if (p <= 0) {
      p = 0;
      t.dwellSec = 6 + Math.random() * 10;
    }
    t.progress = p;

    const { lngLat, heading } = along(job.path, job.seg, job.lengthKm, p);
    const dir = t.leg === 'out' ? heading : (heading + 180) % 360;
    t.heading = dir;
    t.lngLat = offsetRight(lngLat, dir, OFFSET_M);

    t.odometerKm += dKm;
    t.fuelPct = Math.max(3, t.fuelPct - dKm * 0.06);
    driver.drivingMinSinceBreak += dtSec / 60;
    if (driver.drivingMinSinceBreak >= MAX_DRIVE_MIN) {
      driver.resting = true;
      driver.restLeftSec = BREAK_MIN * 60;
    }
    t.lastUpdate = now;
  }

  // rare signal drop / recovery
  if (Math.random() < 0.02 * dtSec) {
    const t = trucks[Math.floor(Math.random() * trucks.length)];
    t.status = t.status === 'online' ? 'offline' : 'online';
    t.lastUpdate = now;
  }
}

export function jobStatus(t: Truck): string {
  if (t.status === 'offline') return 'no signal';
  if (driverById.get(t.driverId)?.resting) return 'driver resting';
  if (t.dwellSec > 0) return t.leg === 'out' ? 'unloading' : 'loading';
  return t.leg === 'out' ? 'en route' : 'returning';
}

export function isMoving(t: Truck): boolean {
  return t.status === 'online' && t.dwellSec <= 0 && !driverById.get(t.driverId)?.resting;
}

export function trucksFC(): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: trucks.map((t) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: t.lngLat },
      properties: {
        id: t.id,
        cls: t.cls,
        status: t.status,
        heading: Math.round(t.heading),
        moving: isMoving(t) ? 1 : 0,
      },
    })),
  };
}
