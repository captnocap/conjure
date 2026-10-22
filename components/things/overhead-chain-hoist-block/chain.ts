import * as THREE from 'three';
import type { Sculpture } from '@conjure/kit';

type P3 = readonly [number, number, number];

/**
 * A run of oval chain links as one instanced mesh, laid along a smooth curve through `points`.
 * Each link is turned a quarter turn from its neighbour, as real chain hangs.
 */
export function chain(art: Sculpture, points: readonly P3[], pitch: number, material: THREE.Material, parent: THREE.Object3D = art.root) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.2);
  const length = curve.getLength();
  const count = Math.max(1, Math.round(length / pitch));
  const geometry = new THREE.TorusGeometry(pitch * 0.34, pitch * 0.11, 5, 10);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  const align = new THREE.Quaternion();
  const twist = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1.55, 1);
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const at = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    align.setFromUnitVectors(up, tangent);
    twist.setFromAxisAngle(up, (i % 2) * Math.PI / 2);
    matrix.compose(at, align.multiply(twist), scale);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** A forged lifting hook hanging point-down from `top`, opening toward +x; returns its group. */
export function hook(art: Sculpture, top: P3, size: number, material: THREE.Material, parent: THREE.Object3D = art.root) {
  const group = new THREE.Group();
  group.position.set(...top);
  parent.add(group);
  const add = (mesh: THREE.Mesh) => {
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  // Eye, shank, then the curve of the hook and its tip.
  const eye = add(new THREE.Mesh(new THREE.TorusGeometry(size * 0.16, size * 0.05, 6, 14), material));
  eye.position.y = -size * 0.12;
  const shank = add(new THREE.Mesh(new THREE.CylinderGeometry(size * 0.07, size * 0.09, size * 0.5, 10), material));
  shank.position.y = -size * 0.5;
  const bend = add(new THREE.Mesh(new THREE.TorusGeometry(size * 0.28, size * 0.085, 7, 20, Math.PI * 1.45), material));
  bend.position.set(size * 0.28, -size * 0.78, 0);
  bend.rotation.z = Math.PI * 0.5;
  const tip = add(new THREE.Mesh(new THREE.ConeGeometry(size * 0.085, size * 0.2, 8), material));
  tip.position.set(size * 0.47, -size * 0.6, 0);
  tip.rotation.z = -0.3;
  const latch = add(new THREE.Mesh(new THREE.BoxGeometry(size * 0.04, size * 0.42, size * 0.07), material));
  latch.position.set(size * 0.22, -size * 0.63, 0);
  latch.rotation.z = 0.45;
  return group;
}
