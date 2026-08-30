import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Map, Popup } from 'react-map-gl/maplibre';
import type { MapMouseEvent, MapRef } from 'react-map-gl/maplibre';
import type {
  ExpressionSpecification,
  GeoJSONSource,
  LayerSpecification,
  Map as MlMap,
} from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';

import { along } from './geo';
import { ROUTES } from './mock';
import { useStore } from './store';
import { useSimulation } from './useSimulation';
import type { LngLat } from './types';

const rawKey = import.meta.env.VITE_MAPTILER_KEY;
const KEY = typeof rawKey === 'string' && rawKey ? rawKey : undefined;

const MAP_STYLE = KEY
  ? `https://api.maptiler.com/maps/hybrid/style.json?key=${KEY}`
  : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
// Custom terrain only with a MapTiler key. The keyless Carto style already
// ships hillshade, and there is no reliable keyless raster-dem source.
const DEM_URL = KEY ? `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${KEY}` : null;

const INITIAL = { longitude: 29.01, latitude: 41.04, zoom: 10.8, pitch: 55, bearing: -18 };

const TYPE_COLOR_EXPR: ExpressionSpecification = [
  'match',
  ['get', 'type'],
  'bus',
  '#f5a524',
  'taxi',
  '#fde047',
  'train',
  '#22d3ee',
  'tram',
  '#a78bfa',
  '#9aa0aa',
];

const routesFC: FeatureCollection = {
  type: 'FeatureCollection',
  features: ROUTES.map((r) => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: r.path },
    properties: { id: r.id, color: r.color },
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
  if (DEM_URL && !map.getSource('dem')) {
    try {
      map.addSource('dem', { type: 'raster-dem', url: DEM_URL, tileSize: 256 });
      map.setTerrain({ source: 'dem', exaggeration: 1.3 });
    } catch {
      /* terrain is optional; map still works flat */
    }
  }

  if (map.getSource('routes')) return; // already built

  map.addSource('routes', { type: 'geojson', data: routesFC });
  map.addLayer({
    id: 'routes-line',
    type: 'line',
    source: 'routes',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.3 },
  } as LayerSpecification);
  map.addLayer({
    id: 'routes-line-sel',
    type: 'line',
    source: 'routes',
    filter: ['==', ['get', 'id'], ''],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.95 },
  } as LayerSpecification);

  map.addSource('stops', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'stops-dot',
    type: 'circle',
    source: 'stops',
    paint: {
      'circle-radius': 4,
      'circle-color': '#e7e9ee',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#0b0e13',
    },
  } as LayerSpecification);
  map.addLayer({
    id: 'stops-label',
    type: 'symbol',
    source: 'stops',
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 11,
      'text-offset': [0, 1.1],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: {
      'text-color': '#c7ccd6',
      'text-halo-color': '#0b0e13',
      'text-halo-width': 1.2,
    },
  } as LayerSpecification);

  addArrowImage(map);
  map.addSource('vehicles', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'vehicles-halo',
    type: 'circle',
    source: 'vehicles',
    filter: ['==', ['get', 'id'], ''],
    paint: { 'circle-radius': 15, 'circle-color': '#ffffff', 'circle-opacity': 0.16 },
  } as LayerSpecification);
  map.addLayer({
    id: 'vehicles-dot',
    type: 'circle',
    source: 'vehicles',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 4, 14, 7.5],
      'circle-color': TYPE_COLOR_EXPR,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#0b0e13',
      'circle-opacity': ['case', ['==', ['get', 'status'], 'offline'], 0.3, 1],
    },
  } as LayerSpecification);
  map.addLayer({
    id: 'vehicles-arrow',
    type: 'symbol',
    source: 'vehicles',
    layout: {
      'icon-image': 'arrow',
      'icon-rotate': ['get', 'heading'],
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-size': ['interpolate', ['linear'], ['zoom'], 9, 0.4, 14, 0.8],
    },
    paint: { 'icon-opacity': ['case', ['==', ['get', 'status'], 'offline'], 0.25, 0.95] },
  } as LayerSpecification);
}

type Hover = { lngLat: LngLat; id: string; load: number; nextStop: string };

export function FleetMap() {
  const mapRef = useRef<MapRef | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);

  const selectedId = useStore((s) => s.selectedId);
  const typeFilter = useStore((s) => s.typeFilter);
  const vehicles = useStore((s) => s.vehicles);

  const selRouteId = useMemo(
    () => vehicles.find((v) => v.id === selectedId)?.routeId ?? null,
    [vehicles, selectedId],
  );

  const stopsFC = useMemo<FeatureCollection>(() => {
    const r = ROUTES.find((x) => x.id === selRouteId);
    return {
      type: 'FeatureCollection',
      features: r
        ? r.stops.map((s) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: along(r.path, r.seg, r.lengthKm, s.at).lngLat,
            },
            properties: { name: s.name },
          }))
        : [],
    };
  }, [selRouteId]);

  useSimulation(mapRef);

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    buildLayers(map);
    setReady(true);
  }, []);

  // Type filter + selection highlight.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !ready) return;
    const typed: ExpressionSpecification = ['in', ['get', 'type'], ['literal', [...typeFilter]]];
    map.setFilter('vehicles-dot', typed);
    map.setFilter('vehicles-arrow', typed);
    map.setFilter('vehicles-halo', ['all', ['==', ['get', 'id'], selectedId ?? ''], typed]);
    map.setFilter('routes-line-sel', ['==', ['get', 'id'], selRouteId ?? '']);
  }, [selectedId, selRouteId, typeFilter, ready]);

  // Stops for the selected vehicle's route.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !ready) return;
    (map.getSource('stops') as GeoJSONSource | undefined)?.setData(stopsFC);
  }, [stopsFC, ready]);

  // Fly to a newly selected vehicle.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !selectedId) return;
    const v = useStore.getState().vehicles.find((x) => x.id === selectedId);
    if (v) {
      map.flyTo({
        center: v.lngLat,
        zoom: Math.max(map.getZoom(), 12.5),
        pitch: 55,
        duration: 1200,
      });
    }
  }, [selectedId]);

  const onClick = useCallback((e: MapMouseEvent) => {
    const f = e.features?.[0];
    useStore.getState().select(f ? String(f.properties?.id) : null);
  }, []);

  const onMouseMove = useCallback((e: MapMouseEvent) => {
    const map = mapRef.current?.getMap();
    const f = e.features?.[0];
    if (map) map.getCanvas().style.cursor = f ? 'pointer' : '';
    if (!f) {
      setHover((h) => (h ? null : h));
      return;
    }
    const v = useStore.getState().vehicles.find((x) => x.id === f.properties?.id);
    if (v) {
      setHover({
        lngLat: v.lngLat,
        id: v.id,
        load: Math.round(v.passengerLoad * 100),
        nextStop: v.nextStop,
      });
    }
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
        maxPitch={75}
        interactiveLayerIds={ready ? ['vehicles-dot'] : undefined}
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
            <div className="vpop__row">Next · {hover.nextStop}</div>
            <div className="vpop__row">Load · {hover.load}%</div>
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
