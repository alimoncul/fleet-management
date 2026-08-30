import type { ReactElement } from 'react';
import type { TruckClass } from '../types';
import { CLASS_COLOR } from '../mock';

// Simple 2D side-view truck illustrations, one shape per class.
const BODIES: Record<TruckClass, ReactElement> = {
  tractor: (
    <>
      <rect x="30" y="12" width="34" height="20" rx="2" />
      <rect x="8" y="16" width="20" height="16" rx="2" />
      <path d="M8 16h6l4 6v10H8z" opacity="0.55" />
    </>
  ),
  box: (
    <>
      <rect x="26" y="8" width="38" height="24" rx="2" />
      <rect x="8" y="16" width="16" height="16" rx="2" />
    </>
  ),
  flatbed: (
    <>
      <rect x="26" y="24" width="38" height="8" rx="1" />
      <rect x="30" y="14" width="12" height="10" rx="1" opacity="0.55" />
      <rect x="8" y="16" width="16" height="16" rx="2" />
    </>
  ),
  tanker: (
    <>
      <rect x="26" y="12" width="38" height="16" rx="8" />
      <rect x="8" y="16" width="16" height="16" rx="2" />
      <rect x="24" y="28" width="40" height="4" />
    </>
  ),
  reefer: (
    <>
      <rect x="26" y="8" width="38" height="24" rx="2" />
      <rect x="27" y="10" width="8" height="8" rx="1" opacity="0.5" />
      <rect x="8" y="16" width="16" height="16" rx="2" />
    </>
  ),
};

export function TruckIcon({ cls, size = 56 }: { cls: TruckClass; size?: number }) {
  return (
    <svg
      className="truckicon"
      width={size}
      height={(size * 40) / 72}
      viewBox="0 0 72 40"
      aria-hidden="true"
    >
      <g fill={CLASS_COLOR[cls]}>{BODIES[cls]}</g>
      <g fill="#0b0e13" stroke={CLASS_COLOR[cls]} strokeWidth="2">
        <circle cx="20" cy="34" r="4" />
        <circle cx="52" cy="34" r="4" />
      </g>
    </svg>
  );
}
