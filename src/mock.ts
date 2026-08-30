import { mulberry32, pathLengthKm, segLengths } from './geo';
import type { LngLat, Route, Vehicle, VehicleType } from './types';

// Hand-drawn routes around the San Francisco Bay Area. Coordinates are illustrative,
// they do not follow real streets.
const RAW: {
  id: string;
  name: string;
  color: string;
  type: VehicleType;
  path: LngLat[];
  stops: string[];
}[] = [
  {
    id: 'r14',
    name: 'Route 14 · Mission',
    color: '#f5a524',
    type: 'bus',
    path: [
      [-122.4649, 37.7083],
      [-122.4415, 37.7258],
      [-122.4194, 37.762],
      [-122.4189, 37.7749],
      [-122.4074, 37.7955],
      [-122.3937, 37.8083],
    ],
    stops: ['Balboa Park', 'Glen Park', '24th St', 'Civic Center', 'Washington Sq', 'Pier 39'],
  },
  {
    id: 'rN',
    name: 'Line N · Judah',
    color: '#22d3ee',
    type: 'tram',
    path: [
      [-122.5107, 37.7601],
      [-122.4869, 37.7609],
      [-122.4633, 37.7609],
      [-122.4383, 37.7627],
      [-122.4147, 37.7706],
      [-122.3934, 37.7801],
    ],
    stops: ['Ocean Beach', 'Sunset', 'Inner Sunset', 'Cole Valley', 'Duboce', 'Caltrain'],
  },
  {
    id: 'rT',
    name: 'Line T · Third',
    color: '#a78bfa',
    type: 'tram',
    path: [
      [-122.3934, 37.7765],
      [-122.3886, 37.7574],
      [-122.3903, 37.7359],
      [-122.3924, 37.7137],
      [-122.4001, 37.7089],
    ],
    stops: ['Embarcadero', 'Dogpatch', 'Bayview', 'Sunnydale', 'Balboa Park'],
  },
  {
    id: 'rTB',
    name: 'Transbay · Bay Bridge',
    color: '#fde047',
    type: 'train',
    path: [
      [-122.3927, 37.7896],
      [-122.3665, 37.8003],
      [-122.3013, 37.8265],
      [-122.2711, 37.8044],
      [-122.2585, 37.8087],
    ],
    stops: ['Salesforce Transit', 'Treasure Is', 'West Oakland', 'Downtown Oakland', 'Lake Merritt'],
  },
  {
    id: 'rGG',
    name: 'Route 30 · Golden Gate',
    color: '#4ade80',
    type: 'bus',
    path: [
      [-122.4183, 37.8021],
      [-122.4467, 37.8049],
      [-122.4785, 37.8199],
      [-122.4802, 37.8388],
      [-122.4855, 37.859],
      [-122.4899, 37.8746],
    ],
    stops: ['Marina', 'Presidio', 'Bridge Toll', 'Vista Point', 'Sausalito', 'Mill Valley'],
  },
];

export const ROUTES: Route[] = RAW.map((r) => {
  const n = r.stops.length;
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    path: r.path,
    seg: segLengths(r.path),
    lengthKm: pathLengthKm(r.path),
    stops: r.stops.map((name, i) => ({ name, at: n === 1 ? 0 : i / (n - 1) })),
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
