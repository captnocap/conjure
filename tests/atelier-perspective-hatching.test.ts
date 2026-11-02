import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
// @ts-expect-error Vendored browser runtime.
import { createHatchVisibilityAtlas, exactHatchVisible, visibleHatchSegmentIntervals, projectSurfaceHatches, packSurfaceHatches, exactVisibleHatchRuns, project } from '../public/atelier/surface-hatch-geometry.js';
// @ts-expect-error Vendored browser runtime.
import { createMaterialVisibility } from '../public/atelier/material-visibility.js';
// @ts-expect-error Vendored browser runtime.
import { MODEL_VERSION } from '../public/atelier/perforated-shell-field.js';

const perspective = () => { const camera = new THREE.PerspectiveCamera(90, 1, 1, 20); camera.updateMatrixWorld(); return camera; };
const prepared = (id: number, points: number[][]) => {
  const faces = [[points[0], points[1], points[2]], [points[0], points[2], points[3]]].map(p => {
    const a = new THREE.Vector3().fromArray(p[0]), b = new THREE.Vector3().fromArray(p[1]), c = new THREE.Vector3().fromArray(p[2]);
    return { p, normal: b.sub(a).cross(c.sub(a)).normalize().toArray() };
  });
  return { id, faces, mesh: new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial()) };
};
const quad = (id: number, left: number, right: number, depth: number) => prepared(id, [[left, -2, -depth], [right, -2, -depth], [right, 2, -depth], [left, 2, -depth]]);
const near = (actual: number, expected: number, epsilon = 2e-6) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} differs from ${expected}`);

for (const mode of ['perspective', 'orthographic'] as const) test(`${mode} hatch intervals resolve an occluder narrower than the drawing samples`, () => {
  const camera = mode === 'perspective' ? perspective() : new THREE.OrthographicCamera(-2, 2, 2, -2, 1, 20);
  camera.updateMatrixWorld();
  const target = quad(3, -4, 4, 4), blocker = quad(4, -.004, .004, 2);
  const atlas = createHatchVisibilityAtlas([target, blocker], camera.matrixWorldInverse, camera.projectionMatrix, 100);
  const capture = { view: camera.matrixWorldInverse, projection: camera.projectionMatrix, size: 100 };
  const a = project([-1, 0, -4], capture), b = project([1, 0, -4], capture);
  const intervals = visibleHatchSegmentIntervals(atlas, a, b, 3);
  assert.equal(intervals.length, 2);
  const expected = mode === 'perspective' ? .004 : .002;
  near(intervals[0][0], 0); near(intervals[0][1], .5 - expected);
  near(intervals[1][0], .5 + expected); near(intervals[1][1], 1);
  assert.equal(exactHatchVisible(atlas, 50, 50, 4, 3), false);
  const source = packSurfaceHatches([{ object: 3, family: 0, points: [{ p: [-1, 0, -4] }, { p: [1, 0, -4] }] }]);
  const projected = projectSurfaceHatches(source, camera.matrixWorldInverse, camera.projectionMatrix, 100);
  const drawn = exactVisibleHatchRuns(projected, atlas, { samplePixels: 5 });
  assert.equal(drawn.runs.length, 8, 'the two visible runs cannot bridge the thin blocker');
});

test('perspective visibility uses reciprocal depth on sloping surfaces', () => {
  const camera = perspective();
  const target = prepared(3, [[-1, -1, -2], [3, -1, -6], [3, 1, -6], [-1, 1, -2]]);
  const blocker = quad(4, -10, 10, 3.5);
  const atlas = createHatchVisibilityAtlas([target, blocker], camera.matrixWorldInverse, camera.projectionMatrix, 100);
  const capture = { view: camera.matrixWorldInverse, projection: camera.projectionMatrix, size: 100 };
  const a = project([-1, 0, -2], capture), b = project([3, 0, -6], capture);
  assert.equal(exactHatchVisible(atlas, 50, 50, 3, 3), true, 'midpoint depth is harmonic 3, not arithmetic 4');
  const intervals = visibleHatchSegmentIntervals(atlas, a, b, 3);
  assert.equal(intervals.length, 1); near(intervals[0][0], 0);
  near(intervals[0][1], (1 / 2 - 1 / 3.5) / (1 / 2 - 1 / 6), 2e-6);
});

test('perspective paths and triangles clip to the real near plane before division', () => {
  const camera = perspective();
  const target = prepared(3, [[-.2, -.3, -.5], [.2, -.3, -4], [.2, .3, -4], [-.2, .3, -.5]]);
  const atlas = createHatchVisibilityAtlas([target], camera.matrixWorldInverse, camera.projectionMatrix, 100);
  assert.ok(atlas.triangles.length > 0);
  for (const triangle of atlas.triangles) for (const at of [2, 5, 8]) assert.ok(triangle[at] >= 1 - 1e-12);
  const source = packSurfaceHatches([{ object: 3, family: 0, points: [{ p: [-.2, 0, -.5] }, { p: [.2, 0, -4] }] }]);
  const projected = projectSurfaceHatches(source, camera.matrixWorldInverse, camera.projectionMatrix, 100);
  assert.ok(projected.points.length >= 6); near(projected.points[2], 1);
  assert.ok([...projected.points].every(Number.isFinite));
  const drawn = exactVisibleHatchRuns(projected, atlas);
  assert.ok(drawn.runs.length > 0);
});

test('perspective shell visibility reconstructs local coordinates at supplied linear depth', () => {
  const camera = perspective(), mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  mesh.position.set(2, 0, -5); mesh.updateMatrixWorld();
  const meshes: THREE.Mesh[] = []; meshes[6] = mesh;
  const visibility = createMaterialVisibility({ model: MODEL_VERSION, objectIds: [7] }, meshes, camera.matrixWorldInverse, camera.projectionMatrix, 100);
  const world = [2.1, .2, -5], screen = project(world, { view: camera.matrixWorldInverse, projection: camera.projectionMatrix, size: 100 });
  const local = visibility.point(7, ...screen);
  near(local[0], .1); near(local[1], .2); near(local[2], 0);
});
