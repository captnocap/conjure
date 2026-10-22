import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export type Rand = () => number;

const direction = (random: Rand) => {
  const v = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5);
  return v.lengthSq() < 1e-4 ? v.set(0, 1, 0) : v.normalize();
};

/** A tumbled lump of unit radius: a sphere pushed about by a few slow waves, then chipped by planes. */
export function lump(random: Rand, o: { detail?: number; amp?: number; chips?: number; smooth?: boolean; stretch?: readonly [number, number, number] } = {}) {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, o.detail ?? 2);
  const amp = o.amp ?? 0.16;
  const waves = Array.from({ length: 5 }, () => ({ k: direction(random).multiplyScalar(1.2 + random() * 2.4), p: random() * 6.283, a: amp * (0.4 + random() * 0.6) / 2 }));
  const planes = Array.from({ length: o.chips ?? 0 }, () => ({ n: direction(random), d: 0.6 + random() * 0.3 }));
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const [sx, sy, sz] = o.stretch ?? [1, 1, 1];
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let r = 1;
    for (const w of waves) r += w.a * Math.sin(v.dot(w.k) + w.p);
    v.multiplyScalar(r);
    for (const plane of planes) {
      const over = v.dot(plane.n) - plane.d;
      if (over > 0) v.addScaledVector(plane.n, -over * 1.35);
    }
    pos.setXYZ(i, v.x * sx, v.y * sy, v.z * sz);
  }
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  if (o.smooth) g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  return g;
}

export interface Speck { x: number; y: number; z: number; size: number; color: THREE.ColorRepresentation; flat?: number }

/** Many tumbled grains in one draw call, each turned and squashed its own way. */
export function strew(random: Rand, specks: readonly Speck[], geometry: THREE.BufferGeometry, material: THREE.Material) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(specks.length, 1));
  mesh.count = specks.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  specks.forEach((speck, i) => {
    e.set(random() * 6.283, random() * 6.283, random() * 6.283);
    q.setFromEuler(e);
    sc.set(speck.size * (0.8 + random() * 0.4), speck.size * (speck.flat ?? (0.6 + random() * 0.4)), speck.size * (0.8 + random() * 0.4));
    m.compose(p.set(speck.x, speck.y, speck.z), q, sc);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(speck.color).offsetHSL(0, 0, (random() - 0.5) * 0.08));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export const SAND = {
  pale: ['#efe6d2', '#e3d5b8', '#f6f1e6', '#d8c7a4', '#cfc3b0', '#f2dccb'],
  tan: ['#d6bf96', '#c4a779', '#e0cfaa', '#b3966d', '#cdbb9c', '#e8dcc0'],
  dark: ['#3a3836', '#55504a', '#2a2a2d', '#6b6258', '#4a5a44'],
} as const;

/**
 * A small patch of beach under a macro subject: a low mound with grains strewn over it.
 * Its surface sits at y = 0 in the middle and falls away at the rim.
 */
export function bed(random: Rand, o: { radius: number; grain: number; count: number; palette: readonly string[]; specks?: readonly string[]; speckShare?: number; wet?: number }) {
  const group = new THREE.Group();
  const base = new THREE.Color(o.palette[0]).lerp(new THREE.Color(o.palette[1 % o.palette.length]), 0.5).multiplyScalar(1 - (o.wet ?? 0) * 0.3);
  const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: base, roughness: 0.9 - (o.wet ?? 0) * 0.5 }));
  mound.scale.set(o.radius, o.grain * 0.9, o.radius);
  mound.position.y = -o.grain * 0.9;
  mound.receiveShadow = true;
  group.add(mound);
  const specks: Speck[] = [];
  for (let i = 0; i < o.count; i++) {
    const r = Math.sqrt(random()) * o.radius * 0.97, t = random() * 6.283;
    const drop = (1 - Math.sqrt(Math.max(0, 1 - (r / o.radius) ** 2))) * o.grain * 0.9;
    const dark = o.specks && random() < (o.speckShare ?? 0.08);
    const size = o.grain * (dark ? 0.3 + random() * 0.3 : 0.45 + random() * 0.6);
    specks.push({ x: Math.cos(t) * r, y: -drop - size * 0.25, z: Math.sin(t) * r, size, color: dark ? o.specks![Math.floor(random() * o.specks!.length)] : o.palette[Math.floor(random() * o.palette.length)] });
  }
  const grains = strew(random, specks, lump(random, { detail: 1, amp: 0.3, chips: 2 }), new THREE.MeshStandardMaterial({ roughness: 0.6 - (o.wet ?? 0) * 0.3 }));
  group.add(grains);
  return group;
}

/** Lift an object so its lowest point rests at `y`. */
export function rest(object: THREE.Object3D, y = 0) {
  object.position.y = 0;
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object, true);
  object.position.y = y - box.min.y;
  return box.max.y - box.min.y;
}
