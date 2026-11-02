import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const ray = await import(new URL('../public/atelier/conjure-ray-geometry.js', import.meta.url).href);
const thickness = await import(new URL('../public/atelier/thickness-exposure.js', import.meta.url).href);
const chromatic = await import(new URL('../public/atelier/chromatic-shadow-conjure.js', import.meta.url).href);
const shadowStudy = await import(new URL('../public/atelier/chromatic-shadow-study.js', import.meta.url).href);

function mesh(geometry: THREE.BufferGeometry, id = 3, position = new THREE.Vector3(), extra = {}) {
  return { id, position: geometry.getAttribute('position').array, index: geometry.index?.array ?? null,
    matrix: new THREE.Matrix4().makeTranslation(position.x, position.y, position.z).toArray(),
    drawRange: { start: 0, count: Infinity }, side: THREE.FrontSide, castShadow: true, ...extra };
}
function scene(meshes: any[], size = 24, perspective = false, scale = 1) {
  const camera = perspective ? new THREE.PerspectiveCamera(45, 1, 0.1, 20) : new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 20);
  camera.position.set(0, 0, 5); camera.updateMatrixWorld(true);
  return { version: 1, source: 'conjure', size, view: camera.matrixWorldInverse.toArray(),
    projection: camera.projectionMatrix.toArray(), near: camera.near, far: camera.far,
    worldScale: scale, meshes };
}
function depthBytes(d: number, output: Uint8Array, at: number) {
  let remaining = d;
  for (let k = 0; k < 3; k++) { remaining *= 256; output[at + k] = Math.floor(remaining); remaining -= output[at + k]; }
  output[at + 3] = Math.round(remaining * 255);
}

test('ray topology welds UV/normal seams and distinguishes open sheets', () => {
  const snapshot = scene([mesh(new THREE.BoxGeometry()), mesh(new THREE.SphereGeometry(1, 16, 12), 4), mesh(new THREE.PlaneGeometry(), 5)]);
  const engine = ray.prepareConjureRayGeometry(snapshot, { topology: true });
  assert.deepEqual(engine.meshes.map((m: any) => m.closed), [true, true, false]);
  engine.dispose();
  assert.throws(() => engine.hitAny([0, 0, 3], [0, 0, -1]), /disposed/);
});

test('material-group capture faces recombine into the original closed body', () => {
  const geometry = new THREE.BoxGeometry(), whole = mesh(geometry);
  const groups = geometry.groups.map(group => ({ ...whole, bodyId: 'solid:1',
    index: geometry.index!.array.slice(group.start, group.start + group.count) }));
  const complete = thickness.prepareThickness(scene([whole])), split = thickness.prepareThickness(scene(groups));
  assert.deepEqual(split.total, complete.total);
  assert.equal(split.stats.closedMeshes, 1);
});

test('mirrored winding preserves physical thickness and open-sheet incidence', () => {
  const box = mesh(new THREE.BoxGeometry());
  const mirrored = { ...box, matrix: new THREE.Matrix4().makeScale(-1, 1, 1).toArray() };
  assert.deepEqual(thickness.prepareThickness(scene([box])).total, thickness.prepareThickness(scene([mirrored])).total);
});

test('disconnected overlapping shells in one merged mesh keep additive chord depth', () => {
  const a = new THREE.BoxGeometry(1, 1, 1), b = new THREE.BoxGeometry(1, 1, 1).translate(0.1, 0.1, 0.25);
  const separate = thickness.prepareThickness(scene([mesh(a), mesh(b)]));
  const merged = thickness.prepareThickness(scene([mesh(mergeGeometries([a, b])!)]));
  for (let i = 0; i < separate.total.length; i++) assert.ok(Math.abs(merged.total[i] - separate.total[i]) < 1e-10);
});

test('open non-manifold geometry is explicitly treated as sheets', () => {
  const box = new THREE.BoxGeometry(), indices = box.index!.array.slice(6);
  const open = { ...mesh(box), index: indices };
  const result = thickness.prepareThickness(scene([open]));
  assert.equal(result.stats.closedMeshes, 0);
  assert.equal(result.stats.sheetMeshes, 1);
});

test('repeated identity IDs remain independent overlapping attenuation bodies', () => {
  const one = scene([mesh(new THREE.BoxGeometry(1, 1, 1))]);
  const two = scene([mesh(new THREE.BoxGeometry(1, 1, 1)), mesh(new THREE.BoxGeometry(1, 1, 1))]);
  const a = thickness.prepareThickness(one).total, b = thickness.prepareThickness(two).total;
  for (let i = 0; i < a.length; i++) assert.ok(Math.abs(b[i] - 2 * a[i]) < 1e-10);
  assert.ok(a.some((v: number) => Math.abs(v - 1) < 1e-10));
});

test('explicit ground=false keeps ID1 architecture in thickness', () => {
  const a = thickness.prepareThickness(scene([mesh(new THREE.BoxGeometry(), 1, undefined, { ground: false })]));
  const b = thickness.prepareThickness(scene([mesh(new THREE.BoxGeometry(), 1, undefined, { ground: true })]));
  assert.ok(a.total.some((v: number) => v > 0));
  assert.ok(b.total.every((v: number) => v === 0));
});

test('open surfaces keep source sheet-incidence attenuation and opaque film', () => {
  const snapshot = scene([mesh(new THREE.PlaneGeometry(2, 2))]);
  const field = thickness.prepareThickness(snapshot);
  assert.ok(field.total.some((v: number) => Math.abs(v - 0.025) < 1e-10));
  const pixels = thickness.filmThickness(field.total, snapshot.size, 1.2);
  for (let i = 3; i < pixels.length; i += 4) assert.equal(pixels[i], 255);
  assert.ok(pixels.some((v: number, i: number) => i % 4 !== 3 && v > 0));
});

test('camera rays and linear-depth receivers work with perspective projection', () => {
  const snapshot = scene([mesh(new THREE.BoxGeometry())], 24, true);
  const camera = ray.cameraRays(snapshot);
  const p = camera.receiver(0.4, -0.2, (5 - snapshot.near) / (snapshot.far - snapshot.near));
  assert.ok(Math.abs(p[2]) < 1e-12);
  const v = new THREE.Vector3(...p).applyMatrix4(new THREE.Matrix4().fromArray(snapshot.view)).applyMatrix4(new THREE.Matrix4().fromArray(snapshot.projection));
  assert.ok(Math.abs(v.x - 0.4) < 1e-12 && Math.abs(v.y + 0.2) < 1e-12);
  const field = thickness.prepareThickness(snapshot);
  assert.ok(field.total.some((v: number) => v > 1));
  assert.ok(field.total.every((v: number) => Number.isFinite(v) && v >= 0));
});

test('closed body clipping retains the near-plane interior', () => {
  const snapshot = scene([mesh(new THREE.BoxGeometry(1, 1, 2), 3, new THREE.Vector3(0, 0, 4.5))]);
  const field = thickness.prepareThickness(snapshot);
  assert.ok(field.total.some((v: number) => Math.abs(v - 1.4) < 1e-10));
});

test('original Garden route remains exact and requires its historical geometry contract', () => {
  const source = scene([mesh(new THREE.BoxGeometry(), 2)]);
  const original = { ...source, source: undefined };
  const a = thickness.prepareThickness(original), b = thickness.prepareThickness(source);
  assert.deepEqual(thickness.filmThickness(a.total, source.size), thickness.filmThickness(b.total, source.size));
  assert.throws(() => thickness.prepareThickness({ ...original, meshes: [mesh(new THREE.BoxGeometry(), 21)] }), /identity/);
  assert.doesNotThrow(() => thickness.prepareThickness({ ...source, meshes: [mesh(new THREE.BoxGeometry(), 21)] }));
  assert.throws(() => shadowStudy.prepareChromaticShadowFrame({ w: 24, geometrySnapshot: () => original }), /fixed 720/);
});

test('chromatic rays produce all four states and respect independent caster policy', () => {
  const snapshot = scene([mesh(new THREE.BoxGeometry(2, 2, 0.2), 3, new THREE.Vector3(0, 0, 1))], 32);
  const count = snapshot.size ** 2, color = new Uint8ClampedArray(count * 4).fill(255), identity = new Uint8Array(count * 4), depth = new Uint8Array(count * 4);
  for (let i = 0; i < count; i++) { identity[i * 4] = 2; depthBytes((5 - snapshot.near) / (snapshot.far - snapshot.near), depth, i * 4); }
  const frame = { w: snapshot.size, color, depth, identity, sectionRibLighting: { directional: [
    { direction: new THREE.Vector3(0.5, 0, 1).normalize().toArray() }, { direction: new THREE.Vector3(-0.5, 0, 1).normalize().toArray() },
  ] } };
  const rendered = chromatic.renderConjureChromaticShadows(frame, snapshot);
  assert.ok(rendered.counts.every((n: number) => n > 0));
  const noCaster = { ...snapshot, meshes: snapshot.meshes.map(m => ({ ...m, castShadow: false })) };
  assert.equal(chromatic.renderConjureChromaticShadows(frame, noCaster).counts[0], count);
  const oneLight = { ...frame, sectionRibLighting: { directional: frame.sectionRibLighting.directional.slice(0, 1) } };
  const limited = chromatic.renderConjureChromaticShadows(oneLight, snapshot);
  assert.equal(limited.counts[2] + limited.counts[3], 0);
  assert.equal(limited.directionalLights, 1);
  assert.deepEqual(chromatic.renderConjureChromaticShadows(frame, snapshot).pixels, rendered.pixels);
});
