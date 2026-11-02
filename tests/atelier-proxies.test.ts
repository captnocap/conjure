import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import * as THREE from 'three';

const proxy = await import(pathToFileURL(resolve('public/atelier/conjure-proxies.js')).href);
const ribs = await import(pathToFileURL(resolve('public/atelier/section-rib.js')).href);
const bars = await import(pathToFileURL(resolve('public/atelier/volume-bar.js')).href);
const plans = await import(pathToFileURL(resolve('public/atelier/volume-bar-plan.js')).href);

function snapshot(geometry: THREE.BufferGeometry, side: number = THREE.FrontSide, scale = 1) {
  const camera = new THREE.OrthographicCamera(-2 * scale, 2 * scale, 2 * scale, -2 * scale, .01 * scale, 20 * scale);
  camera.position.set(4 * scale, 3 * scale, 5 * scale);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return {
    version: 1, source: 'conjure', size: 80,
    view: camera.matrixWorldInverse.toArray(), projection: camera.projectionMatrix.toArray(),
    meshes: [{ id: 4, position: geometry.attributes.position.array, index: geometry.index?.array ?? null,
      matrix: new THREE.Matrix4().makeScale(scale, scale, scale).toArray(), side,
      drawRange: { start: 0, count: Infinity }, castShadow: true,
      material: { color: [.35, .52, .23] } }],
  };
}
const lighting = { directional: [
  { direction: new THREE.Vector3(3, 5, 2).normalize().toArray(), color: [4, 3.8, 3.4] },
  { direction: new THREE.Vector3(-4, 2, -1).normalize().toArray(), color: [.8, 1, 1.1] },
] };
const pigment = () => [160, 180, 130];

test('section proxy intersects real closed geometry and preserves torus holes', () => {
  const box = proxy.buildConjureSectionRibs(snapshot(new THREE.BoxGeometry(2, 2, 2)));
  assert.ok(box.diagnostics.filled > 0);
  assert.equal(box.diagnostics.ribbons, 0);
  const ring = proxy.buildConjureSectionRibs(snapshot(new THREE.TorusGeometry(1, .28, 12, 28)));
  assert.ok(ring.diagnostics.filled > 0);
  assert.ok(ring.faces.every((face: { p: number[][] }) => {
    const center = face.p.reduce((sum, p) => sum.map((v, i) => v + p[i] / 3), [0, 0, 0]);
    return Math.hypot(center[0], center[1]) > .65;
  }), 'section faces must not fill the torus central hole');
});

test('open surface sections use ribbons and cutaway leaves open edges uncapped', () => {
  const open = snapshot(new THREE.CylinderGeometry(1, 1, 2, 16, 1, true), THREE.DoubleSide);
  const section = proxy.buildConjureSectionRibs(open);
  assert.ok(section.diagnostics.ribbons > 0);
  assert.equal(section.diagnostics.filled, 0);
  const cut = proxy.buildConjureCutaway(open);
  assert.equal(cut.diagnostics.caps, 0);
  assert.equal(cut.diagnostics.uncappedOpenMeshes, 1);
});

test('cutaway generates actual red caps at one common oblique plane', () => {
  const source = snapshot(new THREE.BoxGeometry(2, 2, 2));
  const result = proxy.buildConjureCutaway(source);
  assert.ok(result.diagnostics.caps > 0);
  const { normal, offset } = result.diagnostics.plane;
  for (const face of result.faces) for (const p of face.p) {
    assert.ok(p.reduce((sum: number, v: number, i: number) => sum + v * normal[i], 0) <= offset + 1e-7);
  }
});

test('material groups share solid topology while original faces retain their pigments', () => {
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const source: any = snapshot(geometry);
  const original = source.meshes[0];
  source.meshes = geometry.groups.map((group, i) => ({ ...original, bodyId: 'box:0',
    index: geometry.index!.array.slice(group.start, group.start + group.count),
    material: { color: i < 3 ? [.7, .2, .1] : [.1, .2, .7] },
  }));
  const cut = proxy.buildConjureCutaway(source);
  assert.ok(cut.diagnostics.caps > 0);
  assert.equal(cut.diagnostics.uncappedOpenMeshes, 0);
  assert.ok(cut.faces.some((f: { pigment: number[] }) => f.pigment[0] === .7));
  assert.ok(cut.faces.some((f: { pigment: number[] }) => f.pigment[2] === .7));
  assert.ok(proxy.buildConjureLattice(source).diagnostics.bars > 100);
});

test('BCC bars remain wholly inside the source volume and adapt to scene units', () => {
  const source = snapshot(new THREE.BoxGeometry(2, 2, 2));
  const normal = proxy.buildConjureLattice(source);
  assert.ok(normal.diagnostics.bars > 100);
  for (const scale of [1e-6, .001, 1e3, 1e6, 1e9]) {
    const scaled = proxy.buildConjureLattice(snapshot(new THREE.BoxGeometry(2, 2, 2), THREE.FrontSide, scale));
    assert.equal(scaled.diagnostics.bars, normal.diagnostics.bars, `bar graph at world scale ${scale}`);
    for (const face of scaled.faces) for (const p of face.p) assert.ok(p.every((v: number) => Math.abs(v / scale) < 1));
  }
  for (const face of normal.faces) for (const p of face.p) assert.ok(p.every((v: number) => Math.abs(v) < 1));
});

test('worker plans admit dynamic proxy palettes and preserve immutable replay', () => {
  const source = snapshot(new THREE.BoxGeometry(2, 2, 2));
  const before = Array.from(source.meshes[0].position);
  const field = bars.prepareVolumeBar(source, lighting, pigment);
  assert.equal(field.model, 'conjure-interior-lattice-v1');
  const plan = plans.compactVolumeBarPlan(field, { source: 'fixture-1', size: source.size });
  assert.notEqual(plan.field.samples.buffer, field.samples.buffer);
  const image = bars.renderVolumeBar(plan.field);
  assert.equal(image.length, source.size ** 2 * 4);
  assert.ok(new Set(Array.from(image)).size > 40);
  assert.deepEqual(image, bars.renderVolumeBar(plan.field));
  assert.deepEqual(Array.from(source.meshes[0].position), before);
  const malformed = { ...plan.field, samples: plan.field.samples.slice() };
  malformed.samples[0] = 0xffffffff;
  assert.throws(() => bars.validateVolumeBarField(malformed));
  assert.throws(() => ribs.validateSectionRibGeometry(source), /bake/,
    'legacy Garden admission must not be relaxed for unrelated snapshots');
});

test('cutaway cold and cached frames preserve the established worker byte protocol', async () => {
  const cut = await import(pathToFileURL(resolve('public/atelier/cutaway-study.js')).href);
  const cutPlans = await import(pathToFileURL(resolve('public/atelier/cutaway-plan.js')).href);
  const source = snapshot(new THREE.BoxGeometry(2, 2, 2));
  const frame = { w: source.size, geometrySnapshot: () => source, sectionRibLighting: lighting,
    materialColor: pigment, prepare: (_key: string, create: () => unknown) => create() };
  const rgba = cut.prepareCutawayFrame(frame);
  assert.ok(rgba instanceof Uint8Array);
  const association = { source: 'cutaway-fixture', size: source.size };
  const plan = cutPlans.compactCutawayPlan(rgba, association);
  assert.deepEqual(cut.prepareCutawayFrame({ ...frame, cutawayPlan: plan }), rgba);
});

test('proxy visibility changes with camera, while section contrast preserves geometry', () => {
  const source = snapshot(new THREE.BoxGeometry(2, 2, 2));
  const field = ribs.prepareSectionRib(source, lighting, pigment);
  const low = ribs.renderSectionRib(field, .2), high = ribs.renderSectionRib(field, .9);
  assert.notDeepEqual(low, high);
  assert.equal(field.samples.length, source.size ** 2 * 4);
  const next = snapshot(new THREE.BoxGeometry(2, 2, 2));
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, .01, 20);
  camera.position.set(-5, 2, 3); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  next.view = camera.matrixWorldInverse.toArray();
  assert.notDeepEqual(ribs.renderSectionRib(ribs.prepareSectionRib(next, lighting, pigment)), ribs.renderSectionRib(field));
});
