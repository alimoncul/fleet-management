export type LngLat = [number, number];

export type TruckClass = 'tractor' | 'box' | 'flatbed' | 'tanker' | 'reefer';
export type TruckStatus = 'online' | 'offline';
export type View = 'map' | 'fleet' | 'analytics' | 'crew';

export interface Place {
  name: string;
  lngLat: LngLat;
}

export interface Job {
  id: string;
  origin: Place;
  dest: Place;
  path: LngLat[];
  seg: number[];
  lengthKm: number;
  cargo: string;
  weightKg: number;
}

export interface Driver {
  id: string;
  name: string;
  photo: string;
  truckId: string;
  hiredMonthsAgo: number;
  experienceYears: number;
  rating: number; // 4.0..5.0
  phone: string;
  // live
  drivingMinSinceBreak: number;
  resting: boolean;
  restLeftSec: number;
}

export interface Truck {
  id: string; // licence plate
  brand: string;
  model: string;
  cls: TruckClass;
  status: TruckStatus;
  jobId: string;
  driverId: string;
  progress: number; // 0..1 along the job path
  leg: 'out' | 'back'; // outbound to dest, or returning to origin
  dwellSec: number; // > 0 while parked at a terminal
  speedKmh: number; // cruising speed
  heading: number;
  lngLat: LngLat;
  odometerKm: number;
  fuelPct: number;
  lastUpdate: number;
}

export interface Alert {
  id: string;
  severity: 'warn' | 'crit';
  truckId: string;
  text: string;
  ts: number;
}
