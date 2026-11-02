import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { captureAtelier, projectedAtelierEdges, snapshotAtelierGeometry } from '../engine/atelier-capture';
// @ts-expect-error Vendored browser modules intentionally have no TypeScript declarations.
import { restoreGeometryStudies } from '../public/atelier/geometry-studies.js';
// @ts-expect-error Vendored browser modules intentionally have no TypeScript declarations.
import { projectMembraneMasks } from '../public/atelier/projected-membranes.js';
// @ts-expect-error Vendored browser modules intentionally have no TypeScript declarations.
import { worldFromPixel } from '../public/atelier/spectral-film.js';
// @ts-expect-error Vendored browser modules intentionally have no TypeScript declarations.
import { makeFrame, styles } from '../public/atelier/styles.js';
// @ts-expect-error Vendored browser modules intentionally have no TypeScript declarations.
import { operations, recordDrawing, replayDrawing } from '../public/atelier/drawing-protocol.js';

const camera = () => {
  const value = new THREE.OrthographicCamera(-4.1, 4.1, 4.1, -4.1, .1, 100);
  value.position.set(0, 3, 8); value.lookAt(0, 0, 0); value.updateMatrixWorld(true);
  return value;
};
const mesh = () => new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ae7135', metalness: .7, roughness: .2 }));

test('Atelier snapshot preserves grouped owner IDs, draw ranges, instance transforms, and immutable buffers', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 4, 4, 0], 3));
  geometry.setIndex([0, 1, 2, 1, 3, 2]); geometry.setDrawRange(3, 3);
  const object = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial(), 2);
  object.position.set(2, 0, 0);
  object.setMatrixAt(0, new THREE.Matrix4().makeTranslation(-1, 0, 0));
  object.setMatrixAt(1, new THREE.Matrix4().makeTranslation(1, 0, 0)); object.updateMatrixWorld(true);
  const lens = camera();
  const snapshot = snapshotAtelierGeometry([{ mesh: object, id: 7, material: object.material }], lens, 720);
  assert.equal(snapshot.source, 'conjure'); assert.equal(snapshot.meshes.length, 2);
  assert.deepEqual(snapshot.meshes.map(m => m.id), [7, 7]);
  assert.notEqual(snapshot.meshes[0].bodyId, snapshot.meshes[1].bodyId);
  assert.deepEqual(snapshot.meshes.map(m => m.matrix[12]), [1, 3]);
  assert.deepEqual(Array.from(snapshot.meshes[0].index!), [1, 3, 2]);
  assert.equal(snapshot.worldScale, 1);
  const saved = structuredClone(snapshot);
  geometry.attributes.position.setX(1, 99); object.position.x = 500; lens.position.z = 30;
  assert.deepEqual(snapshot, saved);
});

test('Atelier snapshot bakes current morph positions and material groups', () => {
  const object = mesh(), geometry = object.geometry;
  const target = geometry.attributes.position.clone();
  for (let i = 0; i < target.count; i++) target.setX(i, target.getX(i) + 2);
  geometry.morphAttributes.position = [target]; object.updateMorphTargets(); object.morphTargetInfluences![0] = .5;
  const first = new THREE.MeshStandardMaterial({ metalness: .9 }), second = new THREE.MeshStandardMaterial({ metalness: .1 });
  object.material = [first, second] as unknown as THREE.MeshStandardMaterial;
  geometry.clearGroups(); geometry.addGroup(0, 6, 0); geometry.addGroup(6, 6, 1); object.updateMatrixWorld(true);
  const snapshot = snapshotAtelierGeometry([{ mesh: object, id: 3, material: object.material }], camera(), 720);
  assert.equal(snapshot.meshes.length, 2);
  assert.equal(snapshot.meshes[0].position[0], geometry.attributes.position.getX(0) + 1);
  assert.deepEqual(snapshot.meshes.map(m => m.material.metalness), [.9, .1]);
  assert.equal(snapshot.meshes[0].bodyId, snapshot.meshes[1].bodyId);
  assert.deepEqual(snapshot.meshes.map(m => m.index!.length), [6, 6]);
});

test('captured creases, lights and material evidence follow the real scene and survive disposal', () => {
  const scene = new THREE.Scene(), object = mesh(); scene.add(object);
  const key = new THREE.DirectionalLight('#e0b684', 2.4); key.position.set(3, 4, 5); scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#94cbee', .7); fill.position.set(-3, 1, -2); scene.add(fill, fill.target);
  const hemi = new THREE.HemisphereLight('#ccbbee', '#303020', 1.2); scene.add(hemi); scene.updateMatrixWorld(true);
  const lens = camera(), capture = captureAtelier([{ mesh: object, id: 3, material: object.material }], scene, lens, 720, key);
  assert.equal(capture.spectralLights.length, 2); assert.equal(capture.spectralLights[0].intensity, 2.4);
  assert.equal(capture.spectralHemisphere.intensity, 1.2); assert.equal(capture.metalnesses[3], .7);
  const saved = projectedAtelierEdges(capture.geometry);
  assert.ok(saved.edges.length >= 12); assert.ok(saved.edgeOwners.every(id => id === 3));
  object.geometry.dispose(); scene.clear(); lens.position.x = 99;
  assert.deepEqual(capture.edges, saved.edges); assert.deepEqual(capture.edgeOwners, saved.edgeOwners);
  const expected = key.position.clone().normalize().toArray();
  expected.forEach((value, i) => assert.ok(Math.abs(capture.sectionRibLighting.directional[0].direction[i] - value) < 1e-12));
});

test('ground is explicit and never inferred from geometry array order', () => {
  const ground = mesh(), object = mesh(); ground.updateMatrixWorld(true); object.updateMatrixWorld(true);
  const snapshot = snapshotAtelierGeometry([{ mesh: object, id: 4, material: object.material }, { mesh: ground, id: 1, material: ground.material }], camera(), 720);
  assert.deepEqual(snapshot.meshes.map(m => m.ground), [false, true]);
  assert.ok(projectedAtelierEdges(snapshot).edgeOwners.every(id => id === 4));
});

test('restored generic studies keep repeated group owners and scale voxel cells with the captured view', () => {
  const a = mesh(), b = mesh(), floor = mesh();
  a.position.x = -.8; b.position.x = .8; floor.position.y = -2;
  for (const value of [a, b, floor]) value.updateMatrixWorld(true);
  const snapshot = snapshotAtelierGeometry([a, b, floor].map((value, i) => ({ mesh: value, id: i < 2 ? 6 : 1, material: value.material })), camera(), 720);
  const studies = restoreGeometryStudies(snapshot);
  const samples = studies.surfaceSamples(); assert.ok(samples.length > 0);
  for (let i = 3; i < samples.length; i += 6) assert.equal(samples[i], 6);
  const sections = studies.sectionLines(12); assert.ok(sections.length > 0);
  for (let i = 6; i < sections.length; i += 9) assert.equal(sections[i], 6);
  const blocks = studies.voxelFaces(.16); assert.ok(blocks.length > 0);
  for (let i = 11; i < blocks.length; i += 16) assert.equal(blocks[i], 6);
  const masks = projectMembraneMasks(snapshot);
  assert.equal(masks.length, 1); assert.equal(masks[0].id, 6); assert.ok(masks[0].mask.some((v: number) => v));
  const enlarged = structuredClone(snapshot), scale = 100;
  enlarged.worldScale *= scale;
  for (const part of enlarged.meshes) for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14]) part.matrix[i] *= scale;
  // V * S^-1 preserves projection while all geometry and cell lengths scale together.
  const view = new THREE.Matrix4().fromArray(enlarged.view).multiply(new THREE.Matrix4().makeScale(1 / scale, 1 / scale, 1 / scale));
  enlarged.view = view.toArray();
  const scaled = restoreGeometryStudies(enlarged).voxelFaces(.16);
  assert.equal(scaled.length, blocks.length);
  for (let i = 0; i < blocks.length; i++) assert.ok(Math.abs(scaled[i] - blocks[i]) < 1e-5);
});

test('membrane unions clip near planes and viewport boundaries on perspective scenes', () => {
  const object = mesh(); object.scale.set(12, 2, 2); object.position.z = -2; object.updateMatrixWorld(true);
  const lens = new THREE.PerspectiveCamera(60, 1, .1, 30); lens.updateMatrixWorld(true);
  const snapshot = snapshotAtelierGeometry([{ mesh: object, id: 9, material: object.material }], lens, 720);
  const masks = projectMembraneMasks(snapshot, 32);
  assert.equal(masks.length, 1); assert.equal(masks[0].id, 9);
  assert.ok(masks[0].mask.some((v: number) => v)); assert.equal(masks[0].mask.length, 1024);
});

test('material groups rejoin for boundary extraction instead of turning a closed box into six sheets', () => {
  const object = new THREE.Mesh(new THREE.BoxGeometry(), Array.from({ length: 6 }, () => new THREE.MeshStandardMaterial()));
  object.updateMatrixWorld(true);
  const snapshot = snapshotAtelierGeometry([{ mesh: object, id: 5, material: object.material }], camera(), 720);
  assert.equal(snapshot.meshes.length, 6); assert.equal(new Set(snapshot.meshes.map(m => m.bodyId)).size, 1);
  assert.equal(restoreGeometryStudies(snapshot).openBoundaries().length, 0);
  assert.equal(projectedAtelierEdges(snapshot).edges.length, 12);
});

test('linear perspective depth reconstructs a world point through the captured projection', () => {
  const lens = new THREE.PerspectiveCamera(60, 1, .1, 100); lens.position.set(0, 0, 10); lens.updateMatrixWorld(true);
  const geometry = snapshotAtelierGeometry([], lens, 720);
  const worldFromClip = lens.matrixWorld.clone().multiply(lens.projectionMatrixInverse).toArray();
  const value = worldFromPixel({ size: 720, geometry, near: .1, far: 100, worldFromClip }, 359.5, 359.5, 10);
  assert.ok(value.every((v: number) => Math.abs(v) < 1e-10));
});

test('perspective geometry spacing follows subject distance and is invariant to translating the scene', () => {
  const object = mesh(); object.position.z = -5; object.updateMatrixWorld(true);
  const lens = new THREE.PerspectiveCamera(60, 1, .1, 100); lens.updateMatrixWorld(true);
  const source = () => snapshotAtelierGeometry([{ mesh: object, id: 3, material: object.material }], lens, 720);
  const initial = source().worldScale;
  assert.ok(initial > .5 && initial < 1);
  object.position.x += 100; lens.position.x += 100; object.updateMatrixWorld(true); lens.updateMatrixWorld(true);
  assert.ok(Math.abs(source().worldScale - initial) < 1e-12);
});

test('perspective voxel faces and crease segments are clipped before crossing the camera plane', () => {
  const object = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, 1.2), new THREE.MeshBasicMaterial());
  object.position.set(.4, 0, -.5); object.updateMatrixWorld(true);
  const lens = new THREE.PerspectiveCamera(90, 1, .1, 20); lens.updateMatrixWorld(true);
  const snapshot = snapshotAtelierGeometry([{ mesh: object, id: 3, material: object.material }], lens, 200);
  const faces = restoreGeometryStudies(snapshot).voxelFaces(.16);
  assert.ok(faces.length > 0); assert.equal(faces.polygons.length, faces.length / 16);
  for (const polygon of faces.polygons) {
    assert.ok(polygon.length >= 3);
    for (const xy of polygon) for (const value of xy) assert.ok(Number.isFinite(value) && value >= -1e-7 && value <= 200 + 1e-7);
  }
  const edges = projectedAtelierEdges(snapshot).edges; assert.ok(edges.length > 0);
  for (const pair of edges) for (const point of pair) {
    assert.ok(point[0] >= -1e-7 && point[0] <= 200 + 1e-7);
    assert.ok(point[1] >= -1e-7 && point[1] <= 200 + 1e-7);
    assert.ok(point[2] >= .1 - 1e-7);
  }
});

test('perspective point marks and sections face the local view ray on corridor side walls', () => {
  const object = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial());
  object.rotation.y = -Math.PI / 2; object.position.set(.6, 0, -2); object.updateMatrixWorld(true);
  const lens = new THREE.PerspectiveCamera(90, 1, .1, 20); lens.updateMatrixWorld(true);
  const snapshot = snapshotAtelierGeometry([{ mesh: object, id: 3, material: object.material }], lens, 200);
  const studies = restoreGeometryStudies(snapshot), points = studies.surfaceSamples(), sections = studies.sectionLines(12);
  let facingPoints = 0;
  for (let i = 0; i < points.length; i += 6) if (points[i] >= 0 && points[i + 1] >= 0 && points[i + 5] > .1) facingPoints++;
  assert.ok(facingPoints > 10000);
  assert.ok(sections.length > 0);
  for (let i = 8; i < sections.length; i += 9) assert.ok(sections[i] > .1);
});

test('clipped perspective voxel outlines survive the actual worker drawing protocol without losing polygon vertices', async () => {
  const object = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, 1.2), new THREE.MeshBasicMaterial());
  object.position.set(.4, 0, -.5); object.updateMatrixWorld(true);
  const lens = new THREE.PerspectiveCamera(90, 1, .1, 20);
  lens.rotation.z = .37; lens.updateMatrixWorld(true);
  const size = 200, geometry = snapshotAtelierGeometry([{ mesh: object, id: 3, material: object.material }], lens, size);
  // Match contact-worker: only immutable input crosses into the worker, where
  // geometry methods and their variable-length polygon arrays are constructed.
  const raw = structuredClone({ geometry, size, color: new Uint8Array(size * size * 4),
    normal: new Uint8Array(size * size * 4), near: lens.near, far: lens.far });
  Object.assign(raw, restoreGeometryStudies(raw.geometry));
  const frame = makeFrame(raw, 2401, .6), faces = frame.voxelFaces(.12);
  assert.ok(faces.polygons.some((polygon: number[][]) => polygon.length > 4), 'fixture must clip a quad into a larger polygon');
  const style = styles.find((value: { id: string }) => value.id === 'voxels');
  assert.ok(style);
  const packet = structuredClone(recordDrawing(style.draw, frame, { CLOSE: 'close' }));
  const shapes: number[][][] = [];
  let current: number[][] | undefined;
  const graphics: Record<string, unknown> = Object.fromEntries(operations
    .filter((name: string) => !name.startsWith('ctx.') && name !== '$pixels')
    .map((name: string) => [name, () => {}]));
  graphics.beginShape = () => { current = []; };
  graphics.vertex = (x: number, y: number) => {
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
    assert.ok(x >= -1e-7 && x <= size + 1e-7 && y >= -1e-7 && y <= size + 1e-7);
    assert.ok(current); current.push([x, y]);
  };
  graphics.endShape = (mode: string) => {
    assert.equal(mode, 'close'); assert.ok(current); shapes.push(current); current = undefined;
  };
  await replayDrawing(graphics, packet, { now: () => 0, yieldFrame: async () => {} });
  assert.deepEqual(shapes, faces.polygons);
});

test('point marks clip the lens range at draw time while shared anchors remain available to graph studies', () => {
  const dots = styles.find((style: { id: string }) => style.id === 'surface-dots');
  const points = new Float32Array([
    5, 5, .5, 3, 0, 1,
    6, 5, 5, 3, 1, 1,
    7, 5, 11, 3, 2, 1,
    -20, 5, 5, 3, 3, 1,
  ]);
  const marks: number[][] = [];
  const painter = { background() {}, noStroke() {}, fill() {}, circle(...values: number[]) { if (values[2] >= 2) marks.push(values); } };
  const frame = { w: 20, intensity: .5, surfacePoints: () => points,
    geometrySnapshot: () => ({ source: 'conjure', camera: 'perspective', near: 1, far: 10 }),
    rnd: () => 0, ID: () => 3, T: () => 0, distance: () => 100,
    C: () => [100, 120, 140], B: () => [100, 120, 140], clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)) };
  dots.draw(painter, frame);
  assert.deepEqual(marks.map(mark => mark.slice(0, 2)), [[6, 5]]);
  assert.equal(points[18], -20, 'the shared offscreen anchor is not overwritten by dot visibility');
});
