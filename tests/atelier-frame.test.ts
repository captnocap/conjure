import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const { makeFrame } = await import(pathToFileURL(resolve('public/atelier/styles.js')).href);
const { worldFromPixel } = await import(pathToFileURL(resolve('public/atelier/spectral-film.js')).href);

test('Atelier reads captured metallic trim per pixel while preserving the original owner fallback', () => {
  const raw = { size: 2, color: new Uint8ClampedArray(16).fill(128), normal: new Uint8ClampedArray(16),
    identity: new Uint8Array([3, 0, 0, 255, 3, 0, 0, 255, 3, 0, 0, 255, 3, 0, 0, 255]),
    metalnesses: [0, 0, 0, 0.4], material: new Uint8Array([255, 40, 0, 0, 0, 220, 0, 0, 255, 40, 0, 0, 0, 220, 0, 0]) };
  const frame = makeFrame(raw, 1, 0.6);
  assert.equal(frame.metalness(0, 0), 1);
  assert.equal(frame.metalness(1, 0), 0);
  assert.notEqual(frame.materialKey(0, 0), frame.materialKey(1, 0));
  const original = makeFrame({ ...raw, material: undefined }, 1, 0.6);
  assert.equal(original.metalness(0, 0), 0.4);
  assert.equal(original.materialKey(0, 0), 'original:0.4:0');
});

test('world-dependent Atelier effects reconstruct perspective and orthographic captures in world space', () => {
  for (const camera of [new THREE.PerspectiveCamera(50, 1, 0.2, 100), new THREE.OrthographicCamera(-3, 3, 3, -3, 0.2, 100)]) {
    camera.position.set(7, 4, 9); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const size = 720, x = 521, y = 273, distance = 8;
    const viewPoint = new THREE.Vector3((x + 0.5) / size * 2 - 1, 1 - (y + 0.5) / size * 2, 0).applyMatrix4(camera.projectionMatrixInverse);
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) viewPoint.multiplyScalar(-distance / viewPoint.z);
    else viewPoint.z = -distance;
    const expected = viewPoint.applyMatrix4(camera.matrixWorld);
    const actual = worldFromPixel({ size, near: camera.near, far: camera.far,
      geometry: { projection: camera.projectionMatrix.toArray() },
      worldFromClip: camera.matrixWorld.clone().multiply(camera.projectionMatrixInverse).toArray() }, x, y, distance);
    assert.ok(expected.distanceTo(new THREE.Vector3(...actual)) < 1e-10);
  }
});

test('Conjure depth studies keep scene depth variation outside the Garden camera range', () => {
  const raw = { size: 2, near: 100, far: 200, color: new Uint8ClampedArray(16).fill(128), normal: new Uint8ClampedArray(16),
    identity: new Uint8Array([3, 0, 0, 255, 3, 0, 0, 255, 3, 0, 0, 255, 3, 0, 0, 255]),
    depth: new Uint8Array([64, 0, 0, 0, 192, 0, 0, 0, 64, 0, 0, 0, 192, 0, 0, 0]),
    geometry: { source: 'conjure', projection: new THREE.Matrix4().toArray() } };
  const frame = makeFrame(raw, 1, 0.6);
  assert.equal(frame.Z(0, 0), 0);
  assert.equal(frame.Z(1, 0), 1);
  assert.equal(frame.normalizedDepth(150), 0.5);
  assert.equal(frame.interpolateDepth(2, 10, 0.5), 6);
  const perspective = makeFrame({ ...raw, geometry: { source: 'conjure', projection: new THREE.PerspectiveCamera().projectionMatrix.toArray() } }, 1, 0.6);
  assert.ok(Math.abs(perspective.interpolateDepth(2, 10, 0.5) - 10 / 3) < 1e-12);
  const legacy = makeFrame({ ...raw, geometry: undefined }, 1, 0.6);
  assert.equal(legacy.Z(0, 0), 1, 'the original fixed-scene normalization is unchanged');
});

test('two materials on one actor retain separate pigment and transmission through the Atelier frame', () => {
  const raw = { size: 2, color: new Uint8ClampedArray(16).fill(128), normal: new Uint8ClampedArray(16),
    identity: new Uint8Array([3, 0, 0, 255, 3, 0, 0, 255, 3, 0, 0, 255, 3, 0, 0, 255]),
    baseColors: [null, null, null, [128, 128, 128]], transmissions: [0, 0, 0, 0.5],
    albedo: new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255, 255, 0, 0, 255, 0, 0, 255, 255]),
    transmission: new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255]),
    geometry: { source: 'conjure', projection: new THREE.Matrix4().toArray() } };
  const frame = makeFrame(raw, 1, 0.6);
  assert.deepEqual(frame.B(0, 0), [255, 0, 0]);
  assert.deepEqual(frame.B(1, 0), [0, 0, 255]);
  assert.equal(frame.T(0, 0), 0);
  assert.equal(frame.T(1, 0), 1);
  const legacy = makeFrame({ ...raw, geometry: undefined, transmission: undefined }, 1, 0.6);
  assert.deepEqual(legacy.B(0, 0), [128, 128, 128]);
  assert.equal(legacy.T(0, 0), 0.5);
});

test('material barriers distinguish equal-PBR pigments without splitting textured pixels into profiles', () => {
  const raw = { size: 2, color: new Uint8ClampedArray(16).fill(128), normal: new Uint8ClampedArray(16),
    identity: new Uint8Array([3, 0, 0, 255, 3, 0, 0, 255, 3, 0, 0, 255, 3, 0, 0, 255]),
    material: new Uint8Array([64, 128, 255, 0, 64, 128, 255, 0, 64, 128, 255, 0, 64, 128, 255, 0]),
    albedo: new Uint8Array([220, 0, 0, 255, 0, 0, 220, 255, 70, 0, 0, 255, 0, 0, 40, 255]),
    transmission: new Uint8Array([0, 1, 2, 255, 166, 1, 3, 255, 0, 1, 2, 255, 166, 1, 3, 255]),
    materialProfiles: [{ token: 258 }, { token: 259 }],
    geometry: { source: 'conjure', projection: new THREE.Matrix4().toArray() } };
  const frame = makeFrame(raw, 1, 0.6);
  assert.notEqual(frame.materialKey(0, 0), frame.materialKey(1, 0), 'separate pigments keep a material barrier');
  assert.equal(frame.materialKey(0, 0), frame.materialKey(0, 1), 'texture variation stays within its material profile');
  assert.equal(frame.materialKey(1, 0), 'captured-profile:259', 'both token bytes survive the frame adapter');
  assert.equal(frame.T(1, 0), 166 / 255, 'the red channel remains the physical coefficient');
  const legacy = makeFrame({ ...raw, materialProfiles: undefined }, 1, 0.6);
  assert.equal(legacy.materialKey(0, 0), legacy.materialKey(1, 0), 'legacy captures keep the historical scalar fallback');
});
