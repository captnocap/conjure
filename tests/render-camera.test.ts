import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { RenderCameraPool } from '../engine/render-camera';

function sameView(source: THREE.Camera, actual: THREE.Camera) {
  assert.deepEqual(actual.matrixWorld.elements, source.matrixWorld.elements);
  assert.deepEqual(actual.matrixWorldInverse.elements, source.matrixWorldInverse.elements);
  assert.deepEqual(actual.projectionMatrix.elements, source.projectionMatrix.elements);
  assert.deepEqual(actual.projectionMatrixInverse.elements, source.projectionMatrixInverse.elements);
  assert.equal(actual.layers.mask, source.layers.mask);
  assert.equal(actual.coordinateSystem, source.coordinateSystem);
  assert.equal(actual.reversedDepth, source.reversedDepth);
}

test('rendering camera identities stay bounded across fresh world cameras and both lens types', () => {
  const pool = new RenderCameraPool(), orthographicIds = new Set<number>(), perspectiveIds = new Set<number>();
  for (let at = 0; at < 10; at++) {
    const ortho = new THREE.OrthographicCamera(-at - 1, at + 2, 3, -2, 0.1, 100 + at);
    ortho.position.set(at + 1, 2, 5); ortho.lookAt(0, 1, 0);
    const view = pool.sync(ortho);
    orthographicIds.add(view.id);
    assert.notEqual(view, ortho);
    sameView(ortho, view);
    assert.equal((view as THREE.OrthographicCamera).near, ortho.near);
    assert.equal((view as THREE.OrthographicCamera).far, ortho.far);
    const perspective = new THREE.PerspectiveCamera(30 + at, 1.6, 0.25, 400);
    perspective.position.set(2, at, 9); perspective.lookAt(0, 0, 0);
    const pview = pool.sync(perspective);
    perspectiveIds.add(pview.id);
    sameView(perspective, pview);
    assert.equal((pview as THREE.PerspectiveCamera).fov, perspective.fov);
    assert.equal((pview as THREE.PerspectiveCamera).aspect, perspective.aspect);
  }
  assert.equal(orthographicIds.size, 1);
  assert.equal(perspectiveIds.size, 1);
  assert.notEqual([...orthographicIds][0], [...perspectiveIds][0]);
});

test('parented camera world transform survives the capture update without modifying its source', () => {
  const parent = new THREE.Group();
  parent.position.set(4, -2, 8); parent.rotation.set(0.2, 0.6, -0.1); parent.scale.set(2, 2, 2);
  const source = new THREE.PerspectiveCamera(57, 1.3, 0.2, 900);
  source.position.set(1, 2, 5); source.rotation.set(-0.1, 0.2, 0.3); source.layers.set(3);
  parent.add(source);
  const before = source.position.clone();
  const view = new RenderCameraPool().sync(source);
  sameView(source, view);
  view.updateMatrixWorld(true);
  sameView(source, view);
  assert.equal(view.parent, null);
  assert.equal(source.parent, parent);
  assert.deepEqual(source.position, before);
  view.layers.set(0);
  assert.equal(source.layers.mask, 1 << 3, 'capture layer changes do not alter the authored camera');
});

test('view offsets and temporary asymmetric film projection are copied exactly instead of recomputed', () => {
  const pool = new RenderCameraPool();
  for (const source of [new THREE.OrthographicCamera(-4, 4, 3, -3, 0, 200), new THREE.PerspectiveCamera(49, 1.2, 0.1, 300)]) {
    source.zoom = 1.4;
    source.setViewOffset(1200, 900, 120, 90, 800, 600);
    source.viewport = new THREE.Vector4(10, 15, 600, 450);
    const widen = new THREE.Matrix4().set(0.6, 0, 0, 0.23, 0, 0.7, 0, -0.17, 0, 0, 1, 0, 0, 0, 0, 1);
    source.projectionMatrix.premultiply(widen);
    source.projectionMatrixInverse.copy(source.projectionMatrix).invert();
    const view = pool.sync(source) as THREE.OrthographicCamera | THREE.PerspectiveCamera;
    sameView(source, view);
    assert.deepEqual(view.view, source.view);
    assert.notEqual(view.view, source.view);
    assert.deepEqual(view.viewport, source.viewport);
    assert.notEqual(view.viewport, source.viewport);
    view.updateMatrixWorld();
    sameView(source, view);
  }
});

test('coordinate system and public reversed-depth state travel with the exact projection', () => {
  class ReversedCamera extends THREE.PerspectiveCamera { override get reversedDepth() { return true; } }
  const source = new ReversedCamera(40, 1, 0.5, 250);
  source.coordinateSystem = THREE.WebGPUCoordinateSystem;
  source.updateProjectionMatrix();
  const pool = new RenderCameraPool(), view = pool.sync(source);
  sameView(source, view);
  view.updateMatrixWorld();
  sameView(source, view);
  const ordinary = new THREE.PerspectiveCamera();
  sameView(ordinary, pool.sync(ordinary));
});
