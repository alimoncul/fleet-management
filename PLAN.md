# FleetView — MVP Plan

Mock fleet-management dashboard. Web. Tilted terrain map, vehicles moving in real time,
click a vehicle to see status / route / info. No backend — everything simulated in the browser.

Remote: `git@github.com:alimoncul/fleet-management.git`

---

## v2 — road-freight pivot (current)

The build below shipped, then pivoted to a **road-freight** fleet. What changed:

- **Vehicles are trucks** (tractor / box / flatbed / tanker / reefer), real TR-market
  brands. Plates, not "Bus 6023".
- **Routes → jobs.** No fixed loops; each truck runs a delivery leg
  (origin → dest → return → next job) from `src/jobs.json` (14 legs across the
  Marmara region, road-snapped via OSRM). `scripts/build-jobs.mjs` regenerates it.
- **İstanbul / Marmara** map area. Positions offset ~9 m right of the centreline for
  right-hand traffic.
- **Nav trimmed to 4 real views:** Live Map, Fleet, Analytics, Crew.
  Routes / Maintenance / Incidents deleted.
- **Drivers** — `src/mock.ts` seeds a roster with 2D initial avatars
  (`src/ui/Avatar.tsx`), tenure, experience, safety rating, and live
  hours-of-service (4.5 h driving → 45 min break).
- **Fleet view** — filterable table (class / brand / status / search) with 2D truck
  icons (`src/ui/TruckIcon.tsx`), cargo + weight, job.
- **Analytics view** — mock financials (revenue, gross margin, cost/km, profit per
  delivery, outstanding invoices) + operations KPIs + inline-SVG charts.
- **Crew view** — driver table (`src/views/CrewView.tsx`), row layout like Fleet;
  photos from randomuser.me with an initials fallback. Phone numbers are all
  `+90 500 00 00 NN`.
- Truck detail (right rail) now shows driver card + cargo/weight + trip progress +
  fuel / odometer.

The v1 sections below are kept for history; the data-model and mock-data details are
superseded by `src/types.ts` / `src/mock.ts` / `src/jobs.json`.

---

## 1. Reference & intent

Reference image = a transit **ops-center** dashboard ("Traffic Management"):

- Dark UI, glassy translucent cards, blur.
- Top nav: Live Map / Fleet / Routes / Analytics / Maintenance / Incidents / Crew.
- Left rail: vehicle-type filters (Bus/Taxi/Train/Tram) with counts, Online/Offline cards,
  operational-efficiency chart, vehicle cards with mini route maps + GPS/LTE status.
- Center: tilted satellite/terrain map, route lines, station markers, hover popups
  (passenger load), custom zoom controls, bottom stat strips.
- Right rail: warnings / schedule-deviation feed.

This MVP takes the **look and the core interaction**, cuts the rest.

### In scope (v1)

| Feature | Notes |
|---|---|
| Tilted terrain + satellite map | MapLibre, pitch ~55°, real elevation |
| ~40 vehicles moving along routes | browser simulation loop |
| Vehicle types | bus / taxi / train / tram, color-coded |
| Click vehicle (map or list) | fly to it, highlight its route + stops, open detail panel |
| Hover vehicle | small popup: next stop + passenger load |
| Detail panel | status, speed, heading, passenger load, schedule offset, ordered stop list, GPS/LTE, last update |
| Left rail | type filter chips + counts, Online/Offline count cards, efficiency sparkline, scrollable vehicle list |
| Right rail | warnings feed derived from live sim state |
| Top bar | logo, nav tabs (Live Map is the only real view; rest are visual stubs), search box (visual), alert bell |
| Keyless fallback | runs with zero setup if no MapTiler key |

### Out of scope (v1) — deliberate cuts

- No backend, WebSocket, auth, database.
- No live routing engine — road-following route geometry is baked once from the
  OSRM demo server into `src/routes.json` (`scripts/build-routes.mjs`).
- No multi-page routing — single view; nav tabs are stubs.
- No charting library — the one sparkline is inline SVG.
- 3D building extrusions — **stretch only** (barely visible at fleet zoom).
- Bottom stat strips (schedule-offset table, passenger-volume bar chart) — skipped.
- No test suite — one runnable math check for the geo helpers only.

---

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + React 18 + TypeScript | fast, standard, easy to grow |
| Map | `maplibre-gl` + `react-map-gl` (maplibre mode) | free, tilted terrain, no Mapbox token |
| Tiles | MapTiler free key — satellite raster + terrain-RGB DEM | matches reference |
| State | `zustand` | one store: vehicles, routes, selection, filters, alerts |
| Charts | inline SVG sparkline (~30 lines) | not worth a dependency |
| Styling | `theme.css` design tokens + CSS Modules | dark glassy cards, no Tailwind |
| RNG | `mulberry32` seeded (~5 lines) | stable, repeatable demo |

**No new dependency** gets added for anything a few lines cover.

---

## 3. Architecture

Single-page React app. One `zustand` store. A `requestAnimationFrame` simulation loop
mutates vehicle positions each frame and pushes them to the map as GeoJSON.

```
requestAnimationFrame loop (useSimulation)
        │  advance progress, recompute lngLat + heading, drift load/offset
        ▼
   zustand store  ──────────────►  React panels (left rail, right rail, detail)
        │
        ▼
  map source.setData(vehicles GeoJSON)  ──►  MapLibre circle + arrow layers
```

Vehicles are **not** React components — they are features in one GeoJSON source updated
via `setData`. Cheap even at thousands of points. Click/hover handled by
`react-map-gl` layer events (`interactiveLayerIds`).

---

## 4. Data model

```ts
type VehicleType = 'bus' | 'taxi' | 'train' | 'tram';

interface Route {
  id: string;
  name: string;                          // "Route 14"
  color: string;
  path: [number, number][];              // road-following LineString (from OSRM)
  seg: number[];                         // per-segment km, precomputed
  stops: { name: string; at: number }[]; // at = 0..1 fraction along path
  lengthKm: number;                      // precomputed
}

interface Vehicle {
  id: string;                 // "Bus 6023"
  type: VehicleType;
  status: 'online' | 'offline';
  routeId: string;
  progress: number;           // 0..1 along route, advanced by sim
  speedKmh: number;
  heading: number;            // derived: bearing prev→next path point
  lngLat: [number, number];   // derived: lerp along path at progress
  passengerLoad: number;      // 0..1
  nextStop: string;           // derived
  scheduleOffsetMin: number;  // + behind schedule / - ahead
  gps: boolean;
  lte: boolean;
  lastUpdate: number;         // epoch ms
}
```

---

## 5. Mock data

- **`src/routes.json`** — 5 real **İstanbul** transit corridors (Metrobüs, Tram T1,
  Metro M2, Kadıköy–Pendik, Beşiktaş–Sarıyer). Waypoints in `scripts/build-routes.mjs`
  are snapped to roads by the OSRM demo server; `seg` / `lengthKm` computed at load.
- **`src/mock.ts`** — ~40 vehicles seeded across routes, types, statuses, initial
  progress, speed. Seeded RNG so every load looks identical.

---

## 6. Simulation — `sim/useSimulation.ts`

`requestAnimationFrame` loop, delta-time based:

- **Move**: `progress += speedKmh * dtHours / lengthKm`, wrap at 1.
- **Position**: `lngLat` = linear interpolation along `path` at `progress`
  (`sim/geo.ts` — `lerpAlongPath`, no turf).
- **Heading**: bearing between the two path points bracketing `progress`.
- **Next stop**: first stop whose `at > progress`.
- **Noise**: passenger load random-walks; `scheduleOffsetMin` drifts; rare `online↔offline` flip.
- One `store.set` per frame; map source updated in the same tick.

`sim/geo.ts` gets **one assert-based self-check** (`lerpAlongPath` endpoints + a known
`bearing` value) — the only test in the MVP.

---

## 7. Map — `map/FleetMap.tsx`

- `<Map>` from `react-map-gl` (maplibre), MapTiler satellite style, `pitch: 55`, `bearing: -18`.
- **Terrain**: `raster-dem` source (MapTiler terrain-RGB) + `setTerrain({ exaggeration: 1.3 })`
  + `sky` layer.
- **Routes**: 1 GeoJSON source (LineString FeatureCollection) → `line` layer.
  Selected vehicle's route rendered thicker / brighter via a `filter` or `feature-state`.
- **Stops**: GeoJSON points → `circle` layer, visible only for the selected route.
- **Vehicles**: 1 GeoJSON source → `circle` layer (radius by zoom, color by `type`) +
  `symbol` arrow layer (`icon-rotate: ['get', 'heading']`). Updated via `setData` each frame.
- **Interactions**:
  - click vehicle → `select(id)` → `map.flyTo` → detail panel opens, route highlights, stops show.
  - `mousemove` over vehicle → hover popup: next stop + passenger load %.
- **Controls**: custom `+ / − / recenter` buttons (bottom-left), title overlay
  ("FleetView — Live Map"), current-vehicle / layer pill.
- **Keyless fallback**: if `VITE_MAPTILER_KEY` is unset, swap to Esri World Imagery raster
  + AWS Terrarium DEM so the repo runs with no signup.

---

## 8. UI layout

```
┌──────────────────────────────────────────────────────────────┐
│ TopBar: logo │ Live Map · Fleet · Routes · … │ search   🔔    │
├────────────┬─────────────────────────────────┬───────────────┤
│ LeftRail   │            MAP (fill)           │ RightRail      │
│ ~320px     │   title overlay                 │ ~340px         │
│            │   hover popup                   │                │
│ • type     │   zoom / recenter controls      │ WarningsFeed   │
│   filters  │                                 │                │
│ • on/off   │                                 │ ── or ──       │
│   counts   │                                 │                │
│ • efficiency                                 │ VehicleDetail  │
│   sparkline│                                 │ (when a        │
│ • vehicle  │                                 │  vehicle is    │
│   list     │                                 │  selected)     │
└────────────┴─────────────────────────────────┴───────────────┘
```

### LeftRail

- **Type filter chips** — Bus / Taxi / Train / Tram, each with a live count. Toggling hides
  that type on the map and in the list.
- **Online / Offline count cards** — derived from store.
- **Efficiency sparkline** — seeded 24h series, inline SVG, current % label.
- **Vehicle list** — scrollable cards: id, type icon, status dot, GPS/LTE, next stop,
  schedule offset. Click = same as clicking the map marker.

### RightRail — WarningsFeed

Alerts derived from live sim state by simple rules:

| Rule | Message |
|---|---|
| `scheduleOffsetMin > 10` | "{id} is {n} min behind schedule" |
| status → `offline` | "{id} lost signal" |
| `passengerLoad > 0.9` | "Capacity issue near {nextStop}" |

Sorted most-recent-first, each item: severity dot + text + relative time. Bell badge in
TopBar = open alert count.

### VehicleDetail (replaces RightRail when a vehicle is selected)

Header (id, type, status) · live stats (speed, heading, passenger-load bar, schedule
offset) · route name + ordered stop list with the "next" stop marked · GPS/LTE · last
update · close (X) → deselect.

---

## 9. File structure

```
src/
  main.tsx  App.tsx
  store.ts                 zustand: vehicles, routes, selectedId, filters, alerts
  types.ts
  theme.css

  sim/
    useSimulation.ts       rAF loop
    geo.ts                 lerpAlongPath, bearing, mulberry32
    geo.test.ts            the one runnable check

  map/
    FleetMap.tsx           react-map-gl, terrain, sources + layers
    layers.ts              layer style objects
    HoverPopup.tsx

  panels/
    TopBar.tsx
    LeftRail.tsx           Filters, StatusCounts, EfficiencyChart, VehicleList
    RightRail.tsx          WarningsFeed
    VehicleDetail.tsx

  ui/
    Sparkline.tsx  Chip.tsx  StatusDot.tsx

  mock/
    routes.ts  vehicles.ts
```

---

## 10. Setup

```
npm create vite@latest . -- --template react-ts
npm i maplibre-gl react-map-gl zustand
# .env
VITE_MAPTILER_KEY=<free key from maptiler.com>   # optional — keyless fallback if absent
```

README documents: get a free MapTiler key, or run keyless.

---

## 11. Phases (~15–16 h)

| # | Phase | Est |
|---|---|---|
| 1 | Scaffold Vite+React+TS, deps, theme tokens, 3-column layout shell | 1 h |
| 2 | MapTiler satellite + terrain + pitch + custom controls + keyless fallback | 1.5 h |
| 3 | Mock routes + vehicles + seeded RNG; draw route + stop layers | 1.5 h |
| 4 | Simulation loop → vehicles move; vehicle circle + arrow layers | 2 h |
| 5 | Selection (click map / list) → flyTo + route highlight + stops; hover popup | 1.5 h |
| 6 | LeftRail: filters + counts + vehicle list wired to store | 1.5 h |
| 7 | VehicleDetail panel | 1.5 h |
| 8 | WarningsFeed (derive alerts from state) | 1.5 h |
| 9 | Efficiency sparkline | 0.5 h |
| 10 | Styling pass to match reference (dark, glassy, blur), edge states, README | 2 h |
| — | **Stretch:** 3D building extrusions (openmaptiles vector source + `fill-extrusion`) | 1 h |

---

## 12. Risks / open questions

- **MapTiler free tier** covers satellite + terrain-RGB; verify quota is fine for a demo
  (it is — 100k tile loads/mo).
- **Satellite + 3D buildings** needs a *second* (vector) tile source layered over the raster;
  that is why buildings are a stretch, not core.
- **rAF + `setData` every frame** for ~40 points is trivial; if the vehicle count later grows
  past a few thousand, throttle the sim tick to ~4 Hz and interpolate in the layer.
- City choice (İstanbul) is cosmetic — edit corridors in `scripts/build-routes.mjs`
  and re-run it for any metro area.
