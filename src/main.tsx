import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setWorkerUrl } from 'maplibre-gl';
// maplibre 6 can't self-resolve its worker under a bundler; ?worker&url emits a
// self-contained, base-aware chunk. Without this the worker 404s on GitHub Pages
// and every GeoJSON layer (routes, trucks, labels) silently fails to render.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import './index.css';
import App from './App.tsx';

setWorkerUrl(maplibreWorkerUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
