export type LngLat = [number, number];
export type VehicleType = 'bus' | 'taxi' | 'train' | 'tram';
export type VehicleStatus = 'online' | 'offline';

export interface Stop {
  name: string;
  at: number; // 0..1 fraction along route path
}

export interface Route {
  id: string;
  name: string;
  color: string;
  path: LngLat[];
  seg: number[]; // per-segment length in km
  lengthKm: number;
  stops: Stop[];
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  status: VehicleStatus;
  routeId: string;
  progress: number; // 0..1 along route
  dir: 1 | -1; // travel direction along the polyline
  speedKmh: number;
  heading: number; // degrees, 0 = north
  lngLat: LngLat;
  passengerLoad: number; // 0..1
  nextStop: string;
  scheduleOffsetMin: number; // + behind schedule, - ahead
  gps: boolean;
  lte: boolean;
  lastUpdate: number; // epoch ms
}

export interface Alert {
  id: string;
  severity: 'warn' | 'crit';
  vehicleId: string;
  text: string;
  ts: number;
}
