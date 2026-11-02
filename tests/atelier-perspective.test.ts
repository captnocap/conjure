import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { snapshotAtelierGeometry } from '../engine/atelier-capture';
const runtime = (file: string) => import(new URL(`../public/atelier/${file}.js`, import.meta.url).href);
const [naturalist, game, spectral] = await Promise.all([runtime('naturalist-plate'), runtime('game-spatial-studies'), runtime('spectral-film')]);

const points = Array.from({ length: 23 }, (_, i) => new THREE.Vector3(
  Math.sin(i * 1.71) + i * .007, Math.cos(i * .64) * .4 + i * .02, Math.cos(i * 1.28) * .8 + i * .003));
function frameAt(position: THREE.Vector3) {
  const camera = new THREE.PerspectiveCamera(53, 1, .1, 100);
  camera.position.copy(position); camera.lookAt(0, .2, 0); camera.updateMatrixWorld();
  const size = 128, geometry = { source: 'conjure', camera: 'perspective', near: camera.near, far: camera.far,
    view: camera.matrixWorldInverse.toArray(), projection: camera.projectionMatrix.toArray(), worldScale: 1 };
  const raw = { size, near: camera.near, far: camera.far, geometry,
    worldFromClip: camera.matrixWorld.clone().multiply(camera.projectionMatrixInverse).toArray() };
  const samples = new Float64Array(points.length * 6);
  points.forEach((point, index) => {
    const p = point.clone().project(camera), v = point.clone().applyMatrix4(camera.matrixWorldInverse);
    samples.set([(p.x + 1) * size / 2, (1 - p.y) * size / 2, -v.z, 3, index, 1], index * 6);
  });
  const worldLight = new THREE.Vector3(1, 3, 2).normalize(), light = worldLight.clone().transformDirection(camera.matrixWorldInverse);
  return { camera, worldLight, frame: { w: size, seed: 17, pixelWorldSize: .05,
    geometrySnapshot: () => geometry, surfacePoints: () => samples,
    worldAtDepth: (x: number, y: number, depth: number) => spectral.worldFromPixel(raw, x, y, depth),
    worldPosition: (x: number, y: number) => spectral.worldFromPixel(raw, x, y, 8),
    reliefLight: [light.x, -light.y, light.z], distance: () => 8 } };
}

test('Perspective Naturalist reconstructs hidden sample positions and retains a world-space graph across camera moves', () => {
  const a = frameAt(new THREE.Vector3(4, 3, 7)), b = frameAt(new THREE.Vector3(-5, 2, 6));
  const ga = naturalist.buildNaturalistGraph(a.frame), gb = naturalist.buildNaturalistGraph(b.frame);
  for (const graph of [ga, gb]) for (const node of graph.nodes) {
    assert.ok(new THREE.Vector3(...node.world).distanceTo(points[node.index]) < 1e-10);
    assert.equal(node.worldMetric, true);
  }
  assert.deepEqual(ga.treeEdges.map((e: { a: number; b: number }) => [e.a, e.b]), gb.treeEdges.map((e: { a: number; b: number }) => [e.a, e.b]));
  ga.treeEdges.forEach((edge: { a: number; b: number; length: number }, i: number) => {
    const expected = points[ga.nodes[edge.a].index].distanceTo(points[ga.nodes[edge.b].index]);
    assert.ok(Math.abs(expected - edge.length) < 1e-10);
    assert.ok(Math.abs(edge.length - gb.treeEdges[i].length) < 1e-10);
  });
});

test('Perspective Naturalist uses reciprocal depth for a projected surface chord', () => {
  const { frame } = frameAt(new THREE.Vector3(0, 0, 8));
  const sampled = { ...frame, ID: () => 3,
    distance: (x: number) => 1 / ((1 - (x + .5 - 10) / 100) / 2 + ((x + .5 - 10) / 100) / 10) };
  const intervals = naturalist.naturalistVisibleIntervals(sampled, { x: 10, y: 20, z: 2, id: 3 }, { x: 110, y: 20, z: 10, id: 3 }, .3);
  assert.equal(intervals.length, 1);
  assert.deepEqual(intervals[0], [10, 20, 110, 20]);
});

test('Perspective Naturalist bounds offscreen chord traversal before visiting pixel cells', () => {
  const { frame } = frameAt(new THREE.Vector3(0, 0, 8));
  let calls = 0;
  const sampled = { ...frame, ID: () => 3, distance: () => { calls++; return 5; } };
  const intervals = naturalist.naturalistVisibleIntervals(sampled, { x: -1e8, y: 20, z: 5, id: 3 }, { x: 1e8, y: 20, z: 5, id: 3 }, .1);
  assert.ok(calls <= frame.w + 2);
  assert.equal(intervals.length, 1);
  assert.ok(Math.abs(intervals[0][0]) < 1e-6);
  assert.ok(Math.abs(intervals[0][2] - frame.w) < 1e-6);
});

test('INSIDE perspective floor shadows reproject the physical receiver through the captured camera', () => {
  const { frame, camera, worldLight } = frameAt(new THREE.Vector3(4, 5, 8));
  const basis = game.capturedBasis(frame), point = new THREE.Vector3(1, 2, .5), elongation = 1.8;
  const shadow = point.clone().addScaledVector(worldLight, -point.y / worldLight.y * elongation);
  shadow.y = 0;
  const clip = shadow.project(camera), expected = [(clip.x + 1) * frame.w / 2 - .5, (1 - clip.y) * frame.w / 2 - .5];
  const actual = game.projectFloorShadow(point.toArray(), 0, basis, elongation);
  assert.ok(Math.hypot(actual[0] - expected[0], actual[1] - expected[1]) < 1e-9);
  assert.ok(Math.hypot(...basis.worldLight.map((v: number, i: number) => v - worldLight.toArray()[i])) < 1e-12);
});

test('Original orthographic floor-shadow mapping keeps its existing affine contract', () => {
  const frame = { w: 128, worldPosition: (x: number, y: number) => [-2 + x * .01, 2 - y * .01, -5], reliefLight: [.2, -.7, .5] };
  const basis = game.capturedBasis(frame);
  assert.equal(basis.perspective, undefined);
  const actual = game.projectFloorShadow([1, 2, .5], 0, basis, 1);
  assert.ok(Math.abs(actual[0] - (3 - 4 / 7) * 100) < 1e-9);
  assert.ok(Math.abs(actual[1] - 200) < 1e-9);
});


test('INSIDE Conjure orthographic captures use actual camera projection and scene-scale shadow continuity', () => {
  const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, .1, 80);
  camera.position.set(4, 5, 8); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const frame = { w: 128, reliefLight: [0, -.8, .6], geometrySnapshot: () => ({ source: 'conjure',
    near: camera.near, far: camera.far, view: camera.matrixWorldInverse.toArray(), projection: camera.projectionMatrix.toArray() }) };
  const basis = game.capturedBasis(frame);
  assert.equal(basis.conjure, true); assert.equal(basis.perspective, false);
  assert.equal(basis.pixelScale(2), 8 / 128); assert.equal(basis.pixelScale(20), 8 / 128);
  const projected = basis.project([1, 0, 2]), expected = new THREE.Vector3(1, 0, 2).project(camera);
  assert.ok(Math.hypot(projected[0] - ((expected.x + 1) * 64 - .5), projected[1] - ((1 - expected.y) * 64 - .5)) < 1e-10);
  const perspective = game.capturedBasis(frameAt(new THREE.Vector3(4, 5, 8)).frame);
  assert.ok(Number.isFinite(perspective.pixelScale(2)));
  assert.ok(Math.abs(perspective.pixelScale(20) / perspective.pixelScale(2) - 10) < 1e-12);
});


test('restored offscreen mesh samples keep true world anchors and Naturalist tree topology through camera orbit', async () => {
  const { restoreGeometryStudies } = await runtime('geometry-studies');
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  mesh.position.set(10, 0, -5); mesh.updateMatrixWorld();
  const capture = (position: THREE.Vector3) => {
    const camera = new THREE.PerspectiveCamera(60, 1, .1, 100);
    camera.position.copy(position); camera.lookAt(0, 0, -5); camera.updateMatrixWorld();
    const size = 128, geometry = snapshotAtelierGeometry([{ mesh, id: 3, material: mesh.material }], camera, size);
    // Use actual seeded triangle samples, keeping a small stable graph for this
    // camera-invariance regression rather than manufacturing projected points.
    const samples = restoreGeometryStudies(geometry).surfaceSamples().slice(0, 128 * 6);
    assert.ok(Array.from({ length: 128 }, (_, i) => samples[i * 6]).every(x => x > size));
    assert.ok(Array.from({ length: 128 }, (_, i) => samples[i * 6 + 5]).some(facing => facing > .1),
      'offscreen facing remains a geometric direction, not a rejection sentinel');
    const raw = { size, near: camera.near, far: camera.far, geometry,
      worldFromClip: camera.matrixWorld.clone().multiply(camera.projectionMatrixInverse).toArray() };
    const graph = naturalist.buildNaturalistGraph({ w: size, seed: 17, pixelWorldSize: .05,
      geometrySnapshot: () => geometry, surfacePoints: () => samples,
      worldAtDepth: (x: number, y: number, depth: number) => spectral.worldFromPixel(raw, x, y, depth) });
    return { graph, camera };
  };
  try {
    const a = capture(new THREE.Vector3(0, 0, 0)), b = capture(new THREE.Vector3(1, 1, 1));
    assert.equal(a.graph.nodes.length, 128); assert.equal(b.graph.nodes.length, 128);
    for (let i = 0; i < a.graph.nodes.length; i++) {
      const node = a.graph.nodes[i], other = b.graph.nodes[i], point = new THREE.Vector3(...node.world);
      assert.ok(point.x >= 9.5 - 2e-6 && point.x <= 10.5 + 2e-6, 'anchor stays on the real offscreen box');
      assert.ok(point.distanceTo(new THREE.Vector3(...other.world)) < 3e-6, 'same sample reconstructs the same world anchor');
      const local = point.clone().sub(mesh.position), values = local.toArray();
      const face = values.map(value => Math.abs(Math.abs(value) - .5));
      const axis = face.indexOf(Math.min(...face)), normal = new THREE.Vector3();
      normal.setComponent(axis, Math.sign(values[axis]));
      const expected = normal.dot(a.camera.position.clone().sub(point).normalize());
      assert.ok(Math.abs(node.facing - expected) < 2e-6, 'facing agrees with the actual surface normal and camera');
    }
    assert.deepEqual(a.graph.treeEdges.map((edge: { a: number; b: number }) => [edge.a, edge.b]),
      b.graph.treeEdges.map((edge: { a: number; b: number }) => [edge.a, edge.b]));
  } finally { mesh.geometry.dispose(); mesh.material.dispose(); }
});
