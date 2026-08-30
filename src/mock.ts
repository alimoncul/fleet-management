import { mulberry32, pathLengthKm, segLengths } from './geo';
import jobsData from './jobs.json';
import type { Driver, Job, LngLat, Place, Truck, TruckClass } from './types';

// ---- jobs: road-following legs across the Marmara region (see scripts/build-jobs.mjs) ----

type RawJob = { id: string; origin: Place; dest: Place; cargo: string; weightKg: number; path: number[][] };

export const JOBS: Job[] = (jobsData as RawJob[]).map((j) => {
  const path = j.path as LngLat[];
  return {
    id: j.id,
    origin: j.origin,
    dest: j.dest,
    cargo: j.cargo,
    weightKg: j.weightKg,
    path,
    seg: segLengths(path),
    lengthKm: pathLengthKm(path),
  };
});

// ---- catalogs ----

export const CLASS_COLOR: Record<TruckClass, string> = {
  tractor: '#f5a524',
  box: '#22d3ee',
  flatbed: '#4ade80',
  tanker: '#fb5b78',
  reefer: '#a78bfa',
};

export const CLASS_LABEL: Record<TruckClass, string> = {
  tractor: 'Tractor unit',
  box: 'Box trailer',
  flatbed: 'Flatbed',
  tanker: 'Tanker',
  reefer: 'Reefer',
};

const FLEET: { brand: string; model: string; cls: TruckClass }[] = [
  { brand: 'Ford Trucks', model: 'F-MAX', cls: 'tractor' },
  { brand: 'Mercedes-Benz', model: 'Actros 1851', cls: 'tractor' },
  { brand: 'Mercedes-Benz', model: 'Arocs 3348', cls: 'flatbed' },
  { brand: 'MAN', model: 'TGX 18.510', cls: 'tractor' },
  { brand: 'Scania', model: 'R 500', cls: 'tanker' },
  { brand: 'Scania', model: 'S 500', cls: 'reefer' },
  { brand: 'Volvo Trucks', model: 'FH16', cls: 'box' },
  { brand: 'Volvo Trucks', model: 'FM', cls: 'flatbed' },
  { brand: 'DAF', model: 'XF 480', cls: 'box' },
  { brand: 'DAF', model: 'XG+', cls: 'reefer' },
  { brand: 'Iveco', model: 'S-Way', cls: 'tractor' },
  { brand: 'Renault Trucks', model: 'T High 520', cls: 'box' },
  { brand: 'BMC', model: 'Tuğra 681', cls: 'tanker' },
];

const FIRST = [
  'Mehmet', 'Mustafa', 'Ahmet', 'Ali', 'Hüseyin', 'Hasan', 'İbrahim', 'Osman', 'Yusuf', 'Murat',
  'Ömer', 'Kemal', 'Emre', 'Serkan', 'Burak', 'Fatih', 'Volkan', 'Erhan', 'Cengiz', 'Tolga',
  'Selim', 'Barış', 'Onur', 'Kaan', 'Uğur', 'Gökhan', 'Hakan', 'Tuncay', 'Levent', 'Ferhat',
];
const LAST = [
  'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir',
  'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek',
  'Polat', 'Korkmaz', 'Çakır', 'Erdoğan', 'Güneş',
];

const PLATE_LETTERS = 'ABCDEFGHJKLMNPRSTUVYZ';

export const MAX_DRIVE_MIN = 270; // 4.5 h continuous driving before a mandatory break (EU/TR)
export const BREAK_MIN = 45;

const TRUCK_COUNT = 40;

// ---- generated fleet (seeded, stable across reloads) ----

function build(): { trucks: Truck[]; drivers: Driver[] } {
  const rng = mulberry32(20260830);
  const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)];
  const trucks: Truck[] = [];
  const drivers: Driver[] = [];

  for (let i = 0; i < TRUCK_COUNT; i++) {
    const spec = FLEET[i % FLEET.length];
    const plate = `34 ${pick([...PLATE_LETTERS])}${pick([...PLATE_LETTERS])} ${100 + Math.floor(rng() * 899)}`;
    const job = JOBS[Math.floor(rng() * JOBS.length)];
    const driverId = `DRV-${1000 + i}`;
    const online = rng() > 0.12;

    trucks.push({
      id: plate,
      brand: spec.brand,
      model: spec.model,
      cls: spec.cls,
      status: online ? 'online' : 'offline',
      jobId: job.id,
      driverId,
      progress: rng(),
      leg: rng() > 0.5 ? 'out' : 'back',
      dwellSec: 0,
      speedKmh: 62 + rng() * 26,
      heading: 0,
      lngLat: [job.origin.lngLat[0], job.origin.lngLat[1]],
      odometerKm: 120_000 + Math.floor(rng() * 600_000),
      fuelPct: 25 + rng() * 70,
      lastUpdate: Date.now(),
    });

    drivers.push({
      id: driverId,
      name: `${pick(FIRST)} ${pick(LAST)}`,
      truckId: plate,
      hiredMonthsAgo: 2 + Math.floor(rng() * 130),
      experienceYears: 3 + Math.floor(rng() * 25),
      rating: Math.round((4 + rng()) * 10) / 10,
      phone: `+90 5${Math.floor(30 + rng() * 20)} ${Math.floor(100 + rng() * 899)} ${Math.floor(10 + rng() * 89)} ${Math.floor(10 + rng() * 89)}`,
      drivingMinSinceBreak: Math.floor(rng() * MAX_DRIVE_MIN),
      resting: false,
      restLeftSec: 0,
    });
  }
  return { trucks, drivers };
}

export const { trucks: TRUCKS, drivers: DRIVERS } = build();
