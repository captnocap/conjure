import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import type { BuildContext } from '../kit/contract';
import { Sculpture, drapeGeometry, surfaceGeometry } from '../kit/geometry';
import { seeded } from '../kit/random';

const context = (): BuildContext => ({
  idea: 'a drape check',
  mood: { wear: 0.2, warmth: 0.5, energy: 0.5, density: 0.5, daylight: 0.5, cheer: 0.5 },
  scale: 'room',
  seed: 5,
  random: seeded(5),
});
const points = (geometry: THREE.BufferGeometry) => {
  const position = geometry.getAttribute('position');
  return Array.from({ length: position.count }, (_, k) => new THREE.Vector3().fromBufferAttribute(position, k));
};

test('a tablecloth settles on the top and hangs over the edges, never inside the table', () => {
  const started = performance.now();
  const geometry = drapeGeometry({ size: [1.6, 1.2], at: [0, 1, 0], over: [{ box: [1, 0.75, 0.6], at: [0, 0.375, 0] }] }, seeded(3));
  const elapsed = performance.now() - started;
  const all = points(geometry);
  assert.ok(all.every((p) => [p.x, p.y, p.z].every(Number.isFinite)));
  const top = all.filter((p) => Math.abs(p.x) < 0.2 && Math.abs(p.z) < 0.1);
  assert.ok(top.length > 0 && top.every((p) => p.y > 0.75 && p.y < 0.79), `the middle rests on the top: ${top.map((p) => p.y.toFixed(3)).join(',')}`);
  const lowest = Math.min(...all.map((p) => p.y));
  assert.ok(lowest < 0.5, `the overhang falls well below the top: ${lowest}`);
  const inside = all.filter((p) => Math.abs(p.x) < 0.49 && p.y < 0.74 && p.y > 0.01 && Math.abs(p.z) < 0.29);
  assert.equal(inside.length, 0, 'no cloth inside the table');
  assert.ok(elapsed < 1500, `settles quickly: ${elapsed.toFixed(0)} ms`);
  const again = drapeGeometry({ size: [1.6, 1.2], at: [0, 1, 0], over: [{ box: [1, 0.75, 0.6], at: [0, 0.375, 0] }] }, seeded(3));
  assert.deepEqual(Array.from(again.getAttribute('position').array), Array.from(geometry.getAttribute('position').array), 'the same seed gives the same folds');
});

test('a cloth over a ball, and over an upright drum, rests on top and sinks around it', () => {
  for (const [support, top] of [[{ ball: 0.3, at: [0, 0.3, 0] as const }, 0.6], [{ cylinder: [0.25, 0.5] as const, at: [0, 0.25, 0] as const }, 0.5]] as const) {
    const all = points(drapeGeometry({ size: [1.2, 1.2], at: [0, 0.9, 0], over: [support], detail: 24 }, seeded(4)));
    const highest = Math.max(...all.map((p) => p.y));
    assert.ok(highest > top && highest < top + 0.03, `it peaks at the top of the support (${top}): ${highest}`);
    assert.ok(Math.min(...all.map((p) => p.y)) < 0.05, 'its edges reach the floor');
  }
});

test('a hung cloth keeps its pins: corners sag in the middle, a back edge lets the front fall', () => {
  const corners = points(drapeGeometry({ size: [2, 1], at: [0, 1.5, 0], hang: 'corners', floor: null, detail: 20 }, seeded(1)));
  for (const [x, z] of [[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]]) {
    assert.ok(corners.some((p) => Math.abs(p.x - x) < 1e-6 && Math.abs(p.z - z) < 1e-6 && Math.abs(p.y - 1.5) < 0.02), `corner ${x},${z} held`);
  }
  assert.ok(Math.min(...corners.map((p) => p.y)) < 1.35, 'the middle sags');
  const curtain = points(drapeGeometry({ size: [1, 1.2], at: [0, 2, 0], hang: 'back-edge', floor: null, detail: 20 }, seeded(1)));
  assert.ok(Math.min(...curtain.map((p) => p.y)) < 1.1, 'the free edge hangs down');
});

test('a Sculpture drape is a two-faced mesh in the sculpture', () => {
  const art = new Sculpture(context());
  const mesh = art.drape({ size: [1, 1], at: [0, 0.5, 0], over: [{ box: [0.5, 0.4, 0.5], at: [0, 0.2, 0] }], detail: 12 }, art.material('#a33'));
  assert.equal(mesh.parent, art.root);
  const normals = mesh.geometry.getAttribute('normal');
  const half = normals.count / 2;
  let up = 0, down = 0;
  for (let k = 0; k < normals.count; k++) (k < half ? normals.getY(k) > 0 && up++ : normals.getY(k) < 0 && down++);
  assert.ok(up > half * 0.5 && down > half * 0.5, `one face looks up and one down: ${up}, ${down} of ${half}`);
});

test('a surface that pinches to a pole keeps unit normals there, pointing along the axis', () => {
  const sphere = surfaceGeometry((u, v, target) => {
    const phi = u * Math.PI * 2, theta = v * Math.PI;
    target.set(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi));
  }, [24, 12], true, false);
  const position = sphere.getAttribute('position'), normal = sphere.getAttribute('normal');
  for (let k = 0; k < normal.count; k++) {
    const n = new THREE.Vector3().fromBufferAttribute(normal, k), p = new THREE.Vector3().fromBufferAttribute(position, k);
    assert.ok(Math.abs(n.length() - 1) < 1e-5, `normal ${k} is a unit vector`);
    assert.ok(n.dot(p) > 0.9, `normal ${k} points out of the sphere: ${n.dot(p)}`);
  }
  // Faces are wound the way their normals point, so the outside is the front.
  const index = sphere.getIndex()!;
  for (let f = 0; f < index.count; f += 3) {
    const [a, b, c] = [index.getX(f), index.getX(f + 1), index.getX(f + 2)].map((k) => new THREE.Vector3().fromBufferAttribute(position, k));
    const face = b.clone().sub(a).cross(c.clone().sub(a));
    if (face.lengthSq() < 1e-12) continue;
    assert.ok(face.dot(a) > 0, `face ${f / 3} faces outward`);
  }
  const plain = surfaceGeometry((u, v, target) => target.set(u, 0, v), [4, 4], false, false).getAttribute('normal').getY(0);
  const flipped = surfaceGeometry((u, v, target) => target.set(u, 0, v), [4, 4], false, true).getAttribute('normal').getY(0);
  assert.equal(Math.abs(plain), 1);
  assert.equal(flipped, -plain, 'flip turns it over');
});
