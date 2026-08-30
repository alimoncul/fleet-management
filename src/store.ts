import { create } from 'zustand';
import { mulberry32 } from './geo';
import { sim } from './sim';
import type { Alert, Vehicle, VehicleType } from './types';

const ALL_TYPES: VehicleType[] = ['bus', 'taxi', 'train', 'tram'];

// Seeded backfill so the efficiency sparkline is full on first paint.
const effSeed = mulberry32(7);
const EFF_HISTORY_0 = Array.from({ length: 48 }, () => Math.round(68 + effSeed() * 18));

function efficiency(vs: Vehicle[]): number {
  const online = vs.filter((v) => v.status === 'online');
  if (!online.length) return 0;
  const onTime = online.filter((v) => Math.abs(v.scheduleOffsetMin) <= 5).length;
  return Math.round((onTime / online.length) * 100);
}

function deriveAlerts(vs: Vehicle[], prev: Alert[]): Alert[] {
  const firstSeen = new Map(prev.map((a) => [a.id, a.ts]));
  const out: Alert[] = [];
  const add = (v: Vehicle, kind: string, severity: Alert['severity'], text: string) => {
    const id = `${v.id}:${kind}`;
    out.push({ id, severity, vehicleId: v.id, text, ts: firstSeen.get(id) ?? Date.now() });
  };
  for (const v of vs) {
    if (v.status === 'offline') add(v, 'offline', 'crit', `${v.id} lost signal`);
    if (v.scheduleOffsetMin > 8)
      add(v, 'late', 'warn', `${v.id} is ${Math.round(v.scheduleOffsetMin)} min behind schedule`);
    if (v.status === 'online' && v.passengerLoad > 0.92)
      add(v, 'load', 'warn', `Capacity issue near ${v.nextStop} · ${v.id}`);
  }
  return out.sort((a, b) => b.ts - a.ts).slice(0, 12);
}

interface Store {
  vehicles: Vehicle[];
  alerts: Alert[];
  effHistory: number[];
  selectedId: string | null;
  typeFilter: Set<VehicleType>;
  select: (id: string | null) => void;
  toggleType: (t: VehicleType) => void;
  sync: () => void; // pull a snapshot from the simulation
}

export const useStore = create<Store>((set) => ({
  vehicles: sim.map((v) => ({ ...v })),
  alerts: [],
  effHistory: EFF_HISTORY_0,
  selectedId: null,
  typeFilter: new Set(ALL_TYPES),

  select: (id) => set({ selectedId: id }),

  toggleType: (t) =>
    set((s) => {
      const next = new Set(s.typeFilter);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return { typeFilter: next };
    }),

  sync: () => {
    const snap = sim.map((v) => ({ ...v }));
    set((s) => ({
      vehicles: snap,
      alerts: deriveAlerts(snap, s.alerts),
      effHistory: [...s.effHistory.slice(-71), efficiency(snap)],
    }));
  },
}));
