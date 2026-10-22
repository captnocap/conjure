import * as THREE from 'three';

/** Smooth pseudo-noise in -1..1 from a position; deterministic, no tables. */
export const wobble = (x: number, y: number, z: number, seed = 0) =>
  0.5 * Math.sin(x * 7.1 + seed) * Math.cos(y * 5.3 + seed * 2.1) +
  0.3 * Math.sin(y * 11.7 + z * 9.1 + seed * 3.3) +
  0.2 * Math.sin(z * 17.3 + x * 15.1 + seed * 5.7);

const EYES = [new THREE.Vector3(0.36, 0.12, 0.92).normalize(), new THREE.Vector3(-0.36, 0.12, 0.92).normalize()];

/** A point on a stylised human head for a unit direction. The head is about 0.24 m tall, centred on its own origin. */
export function headPoint(x: number, y: number, z: number, scale = 1, target = new THREE.Vector3()) {
  const length = Math.hypot(x, y, z) || 1;
  x /= length; y /= length; z /= length;
  const down = Math.max(0, -y), up = Math.max(0, y);
  const w = 0.077 * (1 - 0.4 * down ** 1.6);
  let pz = z * 0.097;
  if (z > 0) pz *= 1 - 0.08 * up; else pz *= 1 - 0.3 * down ** 1.5;
  if (z > 0) pz += 0.012 * down * down;
  pz -= 0.012 * up;
  let inset = 1;
  for (const eye of EYES) {
    const d = Math.hypot(x - eye.x, y - eye.y, z - eye.z);
    inset -= 0.085 * Math.exp(-((d / 0.2) ** 2));
  }
  // Brow and cheekbones stand a little proud of the sockets.
  inset += 0.03 * Math.exp(-(((y - 0.3) / 0.1) ** 2)) * Math.max(0, z);
  return target.set(x * w * scale * inset, y * 0.118 * scale, pz * scale * inset);
}

/** The head as a mesh geometry with per-vertex colour from `paint(direction)`. */
export function headGeometry(paint: (direction: THREE.Vector3) => THREE.Color, segments = 56) {
  const geometry = new THREE.SphereGeometry(1, segments, Math.round(segments * 0.72));
  const position = geometry.attributes.position;
  const colours = new Float32Array(position.count * 3);
  const direction = new THREE.Vector3(), point = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    direction.fromBufferAttribute(position, i).normalize();
    paint(direction).toArray(colours, i * 3);
    headPoint(direction.x, direction.y, direction.z, 1, point);
    position.setXYZ(i, point.x, point.y, point.z);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Turn a flat-ish mesh so its local +z points along `normal`. */
export function faceOut(mesh: THREE.Object3D, normal: THREE.Vector3) {
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
  return mesh;
}

/** Many tapering strands (hair, fibres) in one draw call. */
export function strands(
  items: readonly { at: THREE.Vector3; dir: THREE.Vector3; length: number; width: number }[],
  material: THREE.Material,
) {
  const geometry = new THREE.ConeGeometry(1, 1, 4, 1);
  geometry.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1));
  mesh.count = items.length;
  const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), size = new THREE.Vector3();
  items.forEach((item, index) => {
    turn.setFromUnitVectors(up, item.dir.clone().normalize());
    matrix.compose(item.at, turn, size.set(item.width, item.length, item.width));
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
