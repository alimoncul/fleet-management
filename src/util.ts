import { MAX_DRIVE_MIN } from './mock';
import type { Driver } from './types';

export const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

export function ago(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

export function hm(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

export function tenure(monthsAgo: number): string {
  const y = Math.floor(monthsAgo / 12);
  const m = monthsAgo % 12;
  if (!y) return `${m} mo`;
  return m ? `${y}y ${m}m` : `${y}y`;
}

// Time until the driver's next mandatory break (or how much rest is left).
export function restLabel(d: Driver): string {
  if (d.resting) return `Resting · ${Math.ceil(d.restLeftSec / 60)}m left`;
  return `Rest in ${hm(MAX_DRIVE_MIN - d.drivingMinSinceBreak)}`;
}

export function restFraction(d: Driver): number {
  return clamp01(d.drivingMinSinceBreak / MAX_DRIVE_MIN);
}
