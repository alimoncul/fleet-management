import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { GeoJSONSource } from 'maplibre-gl';
import type { MapRef } from 'react-map-gl/maplibre';
import { step, vehiclesFC } from './sim';
import { useStore } from './store';

// rAF loop: advances the simulation and pushes vehicle positions straight to the
// map source (smooth). A slower interval snapshots into the store for the panels.
export function useSimulation(mapRef: RefObject<MapRef | null>): void {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      step(dt);
      const src = mapRef.current?.getMap()?.getSource('vehicles') as GeoJSONSource | undefined;
      src?.setData(vehiclesFC());
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    const iv = window.setInterval(() => useStore.getState().sync(), 500);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(iv);
    };
  }, [mapRef]);
}
