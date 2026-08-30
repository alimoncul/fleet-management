// One-shot generator: turns the waypoint lists below into road-following route
// geometry via the public OSRM demo server, and writes src/routes.json.
// Re-run manually if you change the corridors:  node scripts/build-routes.mjs
import { writeFileSync } from 'node:fs';

const OSRM = 'https://router.project-osrm.org/route/v1/driving';

// [lng, lat] waypoints roughly following real Istanbul transit corridors.
const CORRIDORS = [
  {
    id: 'metrobus',
    name: 'Metrobüs · D-100',
    color: '#f5a524',
    type: 'bus',
    stops: ['Bakırköy', 'Zeytinburnu', 'Topkapı', 'Mecidiyeköy', 'Zincirlikuyu', '15 Temmuz Köprüsü', 'Altunizade', 'Söğütlüçeşme'],
    wp: [
      [28.872, 40.98],
      [28.902, 40.993],
      [28.933, 41.019],
      [28.995, 41.067],
      [29.009, 41.068],
      [29.033, 41.045],
      [29.043, 41.023],
      [29.033, 40.99],
    ],
  },
  {
    id: 't1',
    name: 'Tram T1 · Kabataş–Zeytinburnu',
    color: '#22d3ee',
    type: 'tram',
    stops: ['Kabataş', 'Karaköy', 'Eminönü', 'Sultanahmet', 'Beyazıt', 'Aksaray', 'Topkapı', 'Zeytinburnu'],
    wp: [
      [28.991, 41.033],
      [28.977, 41.023],
      [28.972, 41.017],
      [28.977, 41.0055],
      [28.964, 41.01],
      [28.95, 41.011],
      [28.933, 41.019],
      [28.902, 40.993],
    ],
  },
  {
    id: 'm2',
    name: 'Metro M2 · Yenikapı–Hacıosman',
    color: '#a78bfa',
    type: 'train',
    stops: ['Yenikapı', 'Şişhane', 'Taksim', 'Şişli', 'Gayrettepe', 'Levent', 'Maslak', 'Hacıosman'],
    wp: [
      [28.95, 41.005],
      [28.974, 41.029],
      [28.985, 41.037],
      [28.988, 41.06],
      [29.01, 41.068],
      [29.011, 41.078],
      [29.019, 41.111],
      [29.033, 41.108],
    ],
  },
  {
    id: 'asia',
    name: 'Route 16 · Kadıköy–Pendik',
    color: '#4ade80',
    type: 'bus',
    stops: ['Kadıköy', 'Bostancı', 'Maltepe', 'Kartal', 'Pendik'],
    wp: [
      [29.026, 40.99],
      [29.095, 40.954],
      [29.131, 40.935],
      [29.19, 40.899],
      [29.234, 40.877],
    ],
  },
  {
    id: 'bosphorus',
    name: 'Route 25 · Beşiktaş–Sarıyer',
    color: '#fde047',
    type: 'bus',
    stops: ['Beşiktaş', 'Ortaköy', 'Bebek', 'Rumeli Hisarı', 'Emirgan', 'İstinye', 'Sarıyer'],
    wp: [
      [29.006, 41.043],
      [29.027, 41.047],
      [29.043, 41.077],
      [29.056, 41.085],
      [29.054, 41.108],
      [29.057, 41.115],
      [29.053, 41.166],
    ],
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const out = [];
for (const c of CORRIDORS) {
  const coords = c.wp.map((p) => p.join(',')).join(';');
  const url = `${OSRM}/${coords}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${c.id}: OSRM ${res.status}`);
  const json = await res.json();
  const route = json.routes?.[0];
  if (!route) throw new Error(`${c.id}: no route`);

  const path = route.geometry.coordinates.map(([lng, lat]) => [
    Math.round(lng * 1e5) / 1e5,
    Math.round(lat * 1e5) / 1e5,
  ]);

  // Stop fractions from the per-leg distances (one leg between each waypoint).
  const total = route.distance;
  let acc = 0;
  const stops = c.stops.map((name, i) => {
    if (i === 0) return { name, at: 0 };
    acc += route.legs[i - 1].distance;
    return { name, at: i === c.stops.length - 1 ? 1 : Math.round((acc / total) * 1e4) / 1e4 };
  });

  out.push({ id: c.id, name: c.name, color: c.color, type: c.type, path, stops });
  console.log(`${c.id}: ${path.length} pts, ${(total / 1000).toFixed(1)} km`);
  await sleep(1200);
}

writeFileSync(new URL('../src/routes.json', import.meta.url), JSON.stringify(out) + '\n');
console.log('wrote src/routes.json');
