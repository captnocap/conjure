import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type V = THREE.Vector3;
export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** A tapered tube along a smooth curve: branches, roots, ropes. */
export function limb(points: V[], r0: number, r1: number, sides = 7, perPoint = 3): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  // Short curves do not need the default two hundred arc-length samples.
  curve.arcLengthDivisions = Math.max(12, points.length * 8);
  const n = Math.max(2, points.length * perPoint);
  const frames = curve.computeFrenetFrames(n, false);
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const p = curve.getPointAt(i / n), r = r0 + (r1 - r0) * (i / n);
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r;
      pos.push(p.x + N.x * c + B.x * s, p.y + N.y * c + B.y * s, p.z + N.z * c + B.z * s);
    }
  }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = i * sides + ((j + 1) % sides), c = a + sides, d = b + sides;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Any geometry reduced to bare flat-shaded triangles so unlike shapes can be merged. */
export function plain(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g.clone();
  for (const name of Object.keys(out.attributes)) if (name !== 'position') out.deleteAttribute(name);
  out.computeVertexNormals();
  g.dispose();
  return out;
}

/** Merge and free a pile of geometries of mixed origin. */
export function fuse(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map(plain);
  const merged = mergeGeometries(flat);
  for (const g of flat) g.dispose();
  return merged;
}

/** A lumpy faceted ball: one clump of foliage, moss or fog. */
export function clump(detail = 2, rough = 0.2): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + rough * Math.sin(x * 4.7 + y * 2.1) * Math.cos(z * 5.3 - y * 3.2) + rough * 0.5 * Math.sin(y * 9 + x * 7 + z * 3);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}

export interface Blob { at: V; size: V; color: THREE.ColorRepresentation; turn?: number; tilt?: THREE.Euler }
export function instances(geometry: THREE.BufferGeometry, material: THREE.Material, blobs: Blob[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, blobs.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = v(0, 1, 0), c = new THREE.Color();
  blobs.forEach((b, i) => {
    if (b.tilt) q.setFromEuler(b.tilt); else q.setFromAxisAngle(up, b.turn ?? 0);
    m.compose(b.at, q, b.size);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(b.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** A box between two points with a given cross-section: planks, beams, posts. */
export function beam(from: V, to: V, width: number, thick: number, roll = 0): THREE.BufferGeometry {
  const d = to.clone().sub(from), len = d.length();
  const g = new THREE.BoxGeometry(width, thick, len);
  const q = new THREE.Quaternion().setFromUnitVectors(v(0, 0, 1), d.normalize());
  g.rotateZ(roll);
  g.applyQuaternion(q);
  const mid = from.clone().add(to).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}
