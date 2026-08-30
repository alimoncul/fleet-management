// Run: npm test  (node strips the types)
import assert from 'node:assert/strict';
import { along, bearing, offsetRight, pathLengthKm, segLengths } from './geo.ts';

const path: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 1],
];
const seg = segLengths(path);
const total = pathLengthKm(path);

assert.deepEqual(along(path, seg, total, 0).lngLat, [0, 0]);

const end = along(path, seg, total, 1).lngLat;
assert.ok(Math.abs(end[0] - 1) < 1e-9 && Math.abs(end[1] - 1) < 1e-9, 'endpoint');

const mid = along(path, seg, total, (seg[0] / total) * 0.5).lngLat;
assert.ok(Math.abs(mid[0]) < 1e-9 && Math.abs(mid[1] - 0.5) < 1e-6, 'first-leg midpoint');

assert.ok(Math.abs(bearing([0, 0], [0, 1])) < 1e-6, 'due north ~ 0');
assert.ok(Math.abs(bearing([0, 0], [1, 0]) - 90) < 1e-6, 'due east ~ 90');

// heading north -> right is east: lng increases, lat ~unchanged
const rN = offsetRight([0, 0], 0, 111320);
assert.ok(rN[0] > 0.9 && Math.abs(rN[1]) < 1e-6, 'offsetRight north -> east');
// heading east -> right is south: lat decreases
const rE = offsetRight([0, 0], 90, 111320);
assert.ok(rE[1] < -0.9 && Math.abs(rE[0]) < 1e-6, 'offsetRight east -> south');

console.log('geo.test.ts OK');
