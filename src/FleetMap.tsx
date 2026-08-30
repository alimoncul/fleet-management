import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Map, Popup } from 'react-map-gl/maplibre';
import type { MapMouseEvent, MapRef } from 'react-map-gl/maplibre';
import type {
  ExpressionSpecification,
  GeoJSONSource,
  LayerSpecification,
  Map as MlMap,
  SourceSpecification,
  StyleSpecification,
} from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';

import { offsetPath } from './geo';
import { HUBS, JOBS } from './mock';
import { jobStatus, OFFSET_M } from './sim';
import { useStore } from './store';
import { useSimulation } from './useSimulation';
import type { LngLat } from './types';

const rawKey = import.meta.env.VITE_MAPTILER_KEY;
const KEY = typeof rawKey === 'string' && rawKey ? rawKey : undefined;

// Keyless: Esri satellite raster + AWS terrarium DEM for real 3D terrain.
// With a MapTiler key: their hybrid (satellite + labels) style + terrain-rgb.
const KEYLESS_STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    sat: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#0a0d13' } },
    { id: 'sat', type: 'raster', source: 'sat' },
  ],
};

const MAP_STYLE: string | StyleSpecification = KEY
  ? `https://api.maptiler.com/maps/hybrid/style.json?key=${KEY}`
  : KEYLESS_STYLE;

const DEM_SOURCE: SourceSpecification = KEY
  ? {
      type: 'raster-dem',
      url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${KEY}`,
      tileSize: 256,
    }
  : {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      encoding: 'terrarium',
      tileSize: 256,
      maxzoom: 14,
    };

const INITIAL = { longitude: 28.95, latitude: 40.9, zoom: 8.4, pitch: 58, bearing: -14 };

const hubsFC: FeatureCollection = {
  type: 'FeatureCollection',
  features: HUBS.map((h) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: h.lngLat },
    properties: { name: h.name },
  })),
};

const CLASS_COLOR_EXPR: ExpressionSpecification = [
  'match',
  ['get', 'cls'],
  'tractor',
  '#f5a524',
  'box',
  '#22d3ee',
  'flatbed',
  '#4ade80',
  'tanker',
  '#fb5b78',
  'reefer',
  '#a78bfa',
  '#9aa0aa',
];

const jobsFC: FeatureCollection = {
  type: 'FeatureCollection',
  features: JOBS.map((j) => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: j.path },
    properties: { id: j.id },
  })),
};

function addArrowImage(map: MlMap): void {
  if (map.hasImage('arrow')) return;
  const size = 28;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.translate(size / 2, size / 2);
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(6, 7);
  ctx.lineTo(0, 3.5);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fillStyle = '#0b0e13';
  ctx.fill();
  map.addImage('arrow', ctx.getImageData(0, 0, size, size), { pixelRatio: 2 });
}

function buildLayers(map: MlMap): void {
  if (!map.getSource('dem')) {
    try {
      map.addSource('dem', DEM_SOURCE);
      map.setTerrain({ source: 'dem', exaggeration: 1.35 });
    } catch {
      /* terrain optional; map still works flat */
    }
  }
  try {
    map.setSky({
      'sky-color': '#0b1220',
      'sky-horizon-blend': 0.5,
      'horizon-color': '#2a3a55',
      'horizon-fog-blend': 0.6,
      'fog-color': '#0a0d13',
      'fog-ground-blend': 0.4,
    });
  } catch {
    /* sky optional */
  }

  if (map.getSource('jobs')) return;

  map.addSource('jobs', { type: 'geojson', data: jobsFC });
  map.addLayer({
    id: 'jobs-line',
    type: 'line',
    source: 'jobs',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#8b93a3', 'line-width': 1.5, 'line-opacity': 0.16 },
  } as LayerSpecification);
  // selected truck's route, shifted onto its current carriageway
  map.addSource('route-sel', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'route-sel-line',
    type: 'line',
    source: 'route-sel',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#f5a524', 'line-width': 3.5, 'line-opacity': 0.9 },
  } as LayerSpecification);

  map.addSource('endpoints', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });
  map.addLayer({
    id: 'endpoints-dot',
    type: 'circle',
    source: 'endpoints',
    paint: {
      'circle-radius': 5,
      'circle-color': ['match', ['get', 'kind'], 'origin', '#4ade80', '#fb5b78'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#0b0e13',
    },
  } as LayerSpecification);
  map.addLayer({
    id: 'endpoints-label',
    type: 'symbol',
    source: 'endpoints',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-offset': [0, 1.2],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: { 'text-color': '#eef0f4', 'text-halo-color': '#0b0e13', 'text-halo-width': 1.4 },
  } as LayerSpecification);

  map.addSource('hubs', { type: 'geojson', data: hubsFC });
  map.addLayer({
    id: 'hubs-dot',
    type: 'circle',
    source: 'hubs',
    paint: {
      'circle-radius': 3,
      'circle-color': '#e7e9ee',
      'circle-opacity': 0.55,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#0b0e13',
    },
  } as LayerSpecification);
  map.addLayer({
    id: 'hubs-label',
    type: 'symbol',
    source: 'hubs',
    minzoom: 8,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 10.5,
      'text-offset': [0, 0.8],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: {
      'text-color': '#c9cdd6',
      'text-halo-color': '#0b0e13',
      'text-halo-width': 1.4,
    },
  } as LayerSpecification);

  addArrowImage(map);
  map.addSource('trucks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'trucks-halo',
    type: 'circle',
    source: 'trucks',
    filter: ['==', ['get', 'id'], ''],
    paint: { 'circle-radius': 15, 'circle-color': '#ffffff', 'circle-opacity': 0.16 },
  } as LayerSpecification);
  map.addLayer({
    id: 'trucks-dot',
    type: 'circle',
    source: 'trucks',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3.5, 13, 7.5],
      'circle-color': CLASS_COLOR_EXPR,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#0b0e13',
      'circle-opacity': [
        'case',
        ['==', ['get', 'status'], 'offline'],
        0.25,
        ['==', ['get', 'moving'], 0],
        0.5,
        1,
      ],
    },
  } as LayerSpecification);
  map.addLayer({
    id: 'trucks-arrow',
    type: 'symbol',
    source: 'trucks',
    layout: {
      'icon-image': 'arrow',
      'icon-rotate': ['get', 'heading'],
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.35, 13, 0.75],
    },
    paint: {
      'icon-opacity': [
        'case',
        ['==', ['get', 'status'], 'offline'],
        0.2,
        ['==', ['get', 'moving'], 0],
        0.35,
        0.95,
      ],
    },
  } as LayerSpecification);
}

type Hover = { lngLat: LngLat; id: string; status: string; cargo: string; route: string };

export function FleetMap() {
  const mapRef = useRef<MapRef | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);

  const selectedId = useStore((s) => s.selectedTruckId);
  const trucks = useStore((s) => s.trucks);

  const sel = useMemo(
    () => trucks.find((t) => t.id === selectedId) ?? null,
    [trucks, selectedId],
  );
  const selJobId = sel?.jobId ?? null;
  const selLeg = sel?.leg ?? 'out';

  const routeSelFC = useMemo<FeatureCollection>(() => {
    const job = JOBS.find((j) => j.id === selJobId);
    return {
      type: 'FeatureCollection',
      features: job
        ? [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: offsetPath(job.path, OFFSET_M, selLeg === 'back'),
              },
              properties: {},
            },
          ]
        : [],
    };
  }, [selJobId, selLeg]);

  const endpointsFC = useMemo<FeatureCollection>(() => {
    const job = JOBS.find((j) => j.id === selJobId);
    return {
      type: 'FeatureCollection',
      features: job
        ? [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: job.origin.lngLat },
              properties: { kind: 'origin', name: job.origin.name },
            },
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: job.dest.lngLat },
              properties: { kind: 'dest', name: job.dest.name },
            },
          ]
        : [],
    };
  }, [selJobId]);

  useSimulation(mapRef);

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    buildLayers(map);
    setReady(true);
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !ready) return;
    map.setFilter('trucks-halo', ['==', ['get', 'id'], selectedId ?? '']);
  }, [selectedId, ready]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !ready) return;
    (map.getSource('endpoints') as GeoJSONSource | undefined)?.setData(endpointsFC);
    (map.getSource('route-sel') as GeoJSONSource | undefined)?.setData(routeSelFC);
  }, [endpointsFC, routeSelFC, ready]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !selectedId) return;
    const t = useStore.getState().trucks.find((x) => x.id === selectedId);
    if (t) {
      map.flyTo({ center: t.lngLat, zoom: Math.max(map.getZoom(), 10.5), duration: 1200 });
    }
  }, [selectedId]);

  const onClick = useCallback((e: MapMouseEvent) => {
    const f = e.features?.[0];
    useStore.getState().selectTruck(f ? String(f.properties?.id) : null);
  }, []);

  const onMouseMove = useCallback((e: MapMouseEvent) => {
    const map = mapRef.current?.getMap();
    const f = e.features?.[0];
    if (map) map.getCanvas().style.cursor = f ? 'pointer' : '';
    if (!f) {
      setHover((h) => (h ? null : h));
      return;
    }
    const t = useStore.getState().trucks.find((x) => x.id === f.properties?.id);
    if (!t) return;
    const job = JOBS.find((j) => j.id === t.jobId);
    setHover({
      lngLat: t.lngLat,
      id: t.id,
      status: jobStatus(t),
      cargo: job?.cargo ?? '—',
      route: job ? `${job.origin.name} → ${job.dest.name}` : '—',
    });
  }, []);

  const zoomBy = (d: number) => {
    const map = mapRef.current?.getMap();
    if (map) map.easeTo({ zoom: map.getZoom() + d, duration: 250 });
  };
  const recenter = () => {
    mapRef.current?.getMap().flyTo({
      center: [INITIAL.longitude, INITIAL.latitude],
      zoom: INITIAL.zoom,
      pitch: INITIAL.pitch,
      bearing: INITIAL.bearing,
      duration: 900,
    });
  };

  return (
    <div className="mapwrap">
      <Map
        ref={mapRef}
        initialViewState={INITIAL}
        mapStyle={MAP_STYLE}
        maxPitch={80}
        interactiveLayerIds={ready ? ['trucks-dot'] : undefined}
        onLoad={onLoad}
        onClick={onClick}
        onMouseMove={onMouseMove}
      >
        {hover && (
          <Popup
            longitude={hover.lngLat[0]}
            latitude={hover.lngLat[1]}
            anchor="bottom"
            offset={16}
            closeButton={false}
            closeOnClick={false}
            className="vpop"
          >
            <div className="vpop__id">{hover.id}</div>
            <div className="vpop__row">{hover.status} · {hover.cargo}</div>
            <div className="vpop__row">{hover.route}</div>
          </Popup>
        )}
      </Map>

      <div className="maptitle">Fleet Operations</div>
      <div className="mapctl">
        <button onClick={() => zoomBy(1)} aria-label="Zoom in">
          +
        </button>
        <button onClick={recenter} aria-label="Recenter">
          ⌖
        </button>
        <button onClick={() => zoomBy(-1)} aria-label="Zoom out">
          −
        </button>
      </div>
    </div>
  );
}
