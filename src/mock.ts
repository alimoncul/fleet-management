import { mulberry32, pathLengthKm, segLengths } from './geo';
import routesData from './routes.json';
import type { LngLat, Route, Stop, Vehicle, VehicleType } from './types';

// Road-following geometry for real Istanbul transit corridors, generated once
// from the OSRM demo server — see scripts/build-routes.mjs.
type RawRoute = {
  id: string;
  name: string;
  color: string;
  type: VehicleType;
  path: number[][];
  stops: Stop[];
};

const RAW = routesData as RawRoute[];

export const ROUTES: Route[] = RAW.map((r) => {
  const path = r.path as LngLat[];
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    path,
    seg: segLengths(path),
    lengthKm: pathLengthKm(path),
    stops: r.stops,
  };
});

export const TYPE_COLOR: Record<VehicleType, string> = {
  bus: '#f5a524',
  taxi: '#fde047',
  train: '#22d3ee',
  tram: '#a78bfa',
};

const TYPE_LABEL: Record<VehicleType, string> = {
  bus: 'Bus',
  taxi: 'Taxi',
  train: 'Train',
  tram: 'Tram',
};

const routeType: Record<string, VehicleType> = Object.fromEntries(RAW.map((r) => [r.id, r.type]));

export function makeVehicles(): Vehicle[] {
  const rng = mulberry32(20260830);
  const out: Vehicle[] = [];
  let n = 1000;

  const spawn = (routeId: string, type: VehicleType) => {
    const r = ROUTES.find((x) => x.id === routeId)!;
    const online = rng() > 0.14;
    out.push({
      id: `${TYPE_LABEL[type]} ${++n}`,
      type,
      status: online ? 'online' : 'offline',
      routeId,
      progress: rng(),
      dir: rng() > 0.5 ? 1 : -1,
      speedKmh: 22 + rng() * 26,
      heading: 0,
      lngLat: [r.path[0][0], r.path[0][1]],
      passengerLoad: 0.15 + rng() * 0.7,
      nextStop: r.stops[0].name,
      scheduleOffsetMin: Math.round((rng() * 2 - 1) * 7),
      gps: true,
      lte: rng() > 0.12,
      lastUpdate: Date.now(),
    });
  };

  for (const r of ROUTES) {
    const count = 6 + Math.floor(rng() * 3);
    for (let i = 0; i < count; i++) spawn(r.id, routeType[r.id]);
  }
  for (let i = 0; i < 6; i++) spawn(ROUTES[Math.floor(rng() * ROUTES.length)].id, 'taxi');

  return out;
}
