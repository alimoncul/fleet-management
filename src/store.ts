import { create } from 'zustand';
import { mulberry32 } from './geo';
import { drivers as simDrivers, isMoving, trucks as simTrucks } from './sim';
import type { Alert, Driver, Truck, TruckClass, View } from './types';

const ALL_CLASSES: TruckClass[] = ['tractor', 'box', 'flatbed', 'tanker', 'reefer'];

// seeded backfill so the utilisation sparkline is full on first paint
const s = mulberry32(7);
const UTIL_0 = Array.from({ length: 48 }, () => Math.round(58 + s() * 26));

function utilisation(ts: Truck[]): number {
  if (!ts.length) return 0;
  return Math.round((ts.filter(isMoving).length / ts.length) * 100);
}

function deriveAlerts(ts: Truck[], ds: Driver[], prev: Alert[]): Alert[] {
  const firstSeen = new Map(prev.map((a) => [a.id, a.ts]));
  const driverByTruck = new Map(ds.map((d) => [d.truckId, d]));
  const out: Alert[] = [];
  const add = (t: Truck, kind: string, severity: Alert['severity'], text: string) => {
    const id = `${t.id}:${kind}`;
    out.push({ id, severity, truckId: t.id, text, ts: firstSeen.get(id) ?? Date.now() });
  };
  for (const t of ts) {
    if (t.status === 'offline') add(t, 'offline', 'crit', `${t.id} lost signal`);
    if (t.fuelPct < 15) add(t, 'fuel', 'warn', `${t.id} low fuel — ${Math.round(t.fuelPct)}%`);
    const d = driverByTruck.get(t.id);
    if (d?.resting) add(t, 'rest', 'warn', `${d.name} on mandatory rest`);
    else if (d && d.drivingMinSinceBreak > 240)
      add(t, 'restsoon', 'warn', `${d.name} — break due in ${Math.round(270 - d.drivingMinSinceBreak)} min`);
  }
  return out.sort((a, b) => b.ts - a.ts).slice(0, 14);
}

export interface FleetFilter {
  cls: Set<TruckClass>;
  status: 'all' | 'online' | 'offline';
  brand: string; // 'all' or a brand name
  q: string;
}

interface Store {
  view: View;
  trucks: Truck[];
  drivers: Driver[];
  alerts: Alert[];
  utilHistory: number[];
  selectedTruckId: string | null;
  selectedDriverId: string | null;
  fleetFilter: FleetFilter;
  setView: (v: View) => void;
  selectTruck: (id: string | null) => void;
  selectDriver: (id: string | null) => void;
  toggleClass: (c: TruckClass) => void;
  setFleetFilter: (patch: Partial<FleetFilter>) => void;
  sync: () => void;
}

export const useStore = create<Store>((set) => ({
  view: 'map',
  trucks: simTrucks.map((t) => ({ ...t })),
  drivers: simDrivers.map((d) => ({ ...d })),
  alerts: [],
  utilHistory: UTIL_0,
  selectedTruckId: null,
  selectedDriverId: null,
  fleetFilter: { cls: new Set(ALL_CLASSES), status: 'all', brand: 'all', q: '' },

  setView: (v) => set({ view: v }),
  selectTruck: (id) => set({ selectedTruckId: id }),
  selectDriver: (id) => set({ selectedDriverId: id }),

  toggleClass: (c) =>
    set((st) => {
      const cls = new Set(st.fleetFilter.cls);
      if (cls.has(c)) cls.delete(c);
      else cls.add(c);
      return { fleetFilter: { ...st.fleetFilter, cls } };
    }),

  setFleetFilter: (patch) => set((st) => ({ fleetFilter: { ...st.fleetFilter, ...patch } })),

  sync: () =>
    set((st) => {
      const trucks = simTrucks.map((t) => ({ ...t }));
      const drivers = simDrivers.map((d) => ({ ...d }));
      return {
        trucks,
        drivers,
        alerts: deriveAlerts(trucks, drivers, st.alerts),
        utilHistory: [...st.utilHistory.slice(-71), utilisation(trucks)],
      };
    }),
}));
