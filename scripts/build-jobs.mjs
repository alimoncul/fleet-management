// One-shot generator: road-following geometry for a pool of freight jobs across
// the Marmara region, via the public OSRM demo server. Writes src/jobs.json.
// Re-run manually after editing PLACES / JOBS:  node scripts/build-jobs.mjs
import { writeFileSync } from 'node:fs';

const OSRM = 'https://router.project-osrm.org/route/v1/driving';

// [lng, lat]
const PLACES = {
  ambarli: { name: 'Ambarlı Limanı', lngLat: [28.681, 40.962] },
  ikitelli: { name: 'İkitelli OSB', lngLat: [28.792, 41.073] },
  hadimkoy: { name: 'Hadımköy', lngLat: [28.652, 41.138] },
  halkali: { name: 'Halkalı Lojistik', lngLat: [28.783, 41.032] },
  tuzla: { name: 'Tuzla Sanayi', lngLat: [29.301, 40.833] },
  gebze: { name: 'Gebze OSB', lngLat: [29.43, 40.802] },
  dudullu: { name: 'Dudullu OSB', lngLat: [29.174, 41.001] },
  saw: { name: 'Sabiha Gökçen Kargo', lngLat: [29.309, 40.902] },
  izmit: { name: 'İzmit', lngLat: [29.923, 40.766] },
  adapazari: { name: 'Adapazarı', lngLat: [30.403, 40.782] },
  tekirdag: { name: 'Tekirdağ Limanı', lngLat: [27.512, 40.976] },
  cerkezkoy: { name: 'Çerkezköy OSB', lngLat: [27.99, 41.288] },
  corlu: { name: 'Çorlu', lngLat: [27.801, 41.159] },
  bursa: { name: 'Bursa OSB', lngLat: [29.061, 40.226] },
  yalova: { name: 'Yalova', lngLat: [29.277, 40.655] },
  golcuk: { name: 'Gölcük Tersane', lngLat: [29.83, 40.719] },
};

const JOBS = [
  ['ambarli', 'gebze', 'Containerized freight', 24000],
  ['ikitelli', 'izmit', 'Automotive parts', 18500],
  ['tuzla', 'tekirdag', 'Steel coils', 26000],
  ['cerkezkoy', 'dudullu', 'Textiles', 12000],
  ['gebze', 'corlu', 'Machinery', 21000],
  ['hadimkoy', 'adapazari', 'Construction materials', 25500],
  ['saw', 'halkali', 'Electronics', 8600],
  ['bursa', 'ikitelli', 'Furniture', 9400],
  ['izmit', 'ambarli', 'Chemicals', 22000],
  ['dudullu', 'yalova', 'Food & beverage', 15000],
  ['tekirdag', 'gebze', 'Paper goods', 19000],
  ['adapazari', 'tuzla', 'Frozen goods', 17500],
  ['halkali', 'golcuk', 'Industrial equipment', 23000],
  ['corlu', 'saw', 'Consumer goods', 11000],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
let i = 1000;

for (const [oKey, dKey, cargo, weightKg] of JOBS) {
  const o = PLACES[oKey];
  const d = PLACES[dKey];
  const url = `${OSRM}/${o.lngLat.join(',')};${d.lngLat.join(',')}?overview=simplified&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${oKey}->${dKey}: OSRM ${res.status}`);
  const route = (await res.json()).routes?.[0];
  if (!route) throw new Error(`${oKey}->${dKey}: no route`);

  const path = route.geometry.coordinates.map(([lng, lat]) => [
    Math.round(lng * 1e5) / 1e5,
    Math.round(lat * 1e5) / 1e5,
  ]);

  out.push({
    id: `JOB-${++i}`,
    origin: o,
    dest: d,
    cargo,
    weightKg,
    path,
  });
  console.log(`${o.name} -> ${d.name}: ${path.length} pts, ${(route.distance / 1000).toFixed(0)} km`);
  await sleep(1100);
}

writeFileSync(new URL('../src/jobs.json', import.meta.url), JSON.stringify(out) + '\n');
console.log(`wrote src/jobs.json (${out.length} jobs)`);
