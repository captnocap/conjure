import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Sculpture } from '@conjure/kit';

export type P3 = readonly [number, number, number];
type Paint = THREE.Material;

/** A box with softened edges. */
export function rbox(s: Sculpture, size: P3, at: P3, material: Paint, radius = 0.06) {
  const r = Math.min(radius, Math.min(...size) * 0.45);
  return s.mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 3, r), material, at);
}

/** A side profile drawn in x/y and given thickness across z, centred on `z`. */
export function slab(s: Sculpture, profile: readonly (readonly [number, number])[], depth: number, material: Paint, z = 0, bevel = 0.03) {
  const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
  const b = Math.min(bevel, depth * 0.3);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: depth - b * 2, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 10 });
  geometry.translate(0, 0, -(depth - b * 2) / 2);
  return s.mesh(geometry, material, [0, 0, z]);
}

/** A road wheel whose axle runs across z. */
export function wheel(s: Sculpture, radius: number, width: number, at: P3, tyre: Paint, hub: Paint) {
  const t = s.cylinder(radius, radius, width, at, tyre, 20);
  t.rotation.x = Math.PI / 2;
  const h = s.cylinder(radius * 0.55, radius * 0.55, width + 0.02, at, hub, 14);
  h.rotation.x = Math.PI / 2;
  const n = s.cylinder(radius * 0.2, radius * 0.2, width + 0.06, at, tyre, 8);
  n.rotation.x = Math.PI / 2;
  return t;
}

/** A traffic cone standing at x, z. */
export function cone(s: Sculpture, x: number, z: number, orange: Paint, white: Paint, fallen = 0) {
  if (fallen) {
    const c = s.cylinder(0.03, 0.14, 0.5, [x, 0.14, z], orange, 12);
    c.rotation.z = Math.PI / 2 - 0.24; c.rotation.y = fallen;
    return;
  }
  s.cylinder(0.03, 0.14, 0.5, [x, 0.29, z], orange, 12);
  s.box([0.36, 0.035, 0.36], [x, 0.02, z], orange);
  s.cylinder(0.073, 0.094, 0.1, [x, 0.32, z], white, 12);
}

/** A rotating warning beacon. Returns a per-frame function. */
export function beacon(s: Sculpture, at: P3, colour: string, lit: boolean, size = 1) {
  const base = new THREE.MeshStandardMaterial({ color: '#2a2d30', roughness: 0.6 });
  s.cylinder(0.07 * size, 0.08 * size, 0.04 * size, [at[0], at[1] + 0.02 * size, at[2]], base, 12);
  const lens = new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: lit ? 2.4 : 0.05, roughness: 0.3 });
  const dome = s.cylinder(0.05 * size, 0.065 * size, 0.12 * size, [at[0], at[1] + 0.1 * size, at[2]], lens, 12);
  s.ball([0.05 * size, 0.03 * size, 0.05 * size], [at[0], at[1] + 0.16 * size, at[2]], lens, 10);
  let halo: THREE.Mesh | null = null;
  if (lit) {
    halo = new THREE.Mesh(new THREE.CircleGeometry(0.5 * size, 3, 0, 0.9), new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2;
    const pivot = new THREE.Group();
    pivot.position.set(at[0], at[1] + 0.11 * size, at[2]);
    pivot.add(halo);
    s.root.add(pivot);
    halo = pivot as unknown as THREE.Mesh;
  }
  return (time: number, speed: number) => {
    if (!lit) return;
    if (halo) halo.rotation.y = time * speed;
    lens.emissiveIntensity = 1.6 + Math.max(0, Math.sin(time * speed)) * 2.2;
    void dome;
  };
}

/** A faceless seated or standing crew figure built into `group`-less sculpture space. Feet (or seat) at `at`. */
export function crew(s: Sculpture, at: P3, facing: number, vest: Paint, cloth: Paint, skin: Paint, seated = true) {
  const g = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, material: Paint, p: P3, rot?: P3) => {
    const m = new THREE.Mesh(geometry, material); m.position.set(...p); if (rot) m.rotation.set(...rot); m.castShadow = true; g.add(m); return m;
  };
  const hip = seated ? 0 : 0.85;
  if (seated) {
    for (const z of [-0.1, 0.1]) { add(new THREE.CapsuleGeometry(0.075, 0.34, 4, 8), cloth, [0.2, 0.06, z], [0, 0, Math.PI / 2]); add(new THREE.CapsuleGeometry(0.065, 0.34, 4, 8), cloth, [0.42, -0.18, z]); }
  } else for (const z of [-0.1, 0.1]) add(new THREE.CapsuleGeometry(0.075, 0.7, 4, 8), cloth, [0, 0.42, z]);
  add(new THREE.CapsuleGeometry(0.17, 0.3, 4, 10), vest, [0, hip + 0.38, 0]);
  add(new THREE.SphereGeometry(0.115, 14, 10), skin, [0.01, hip + 0.82, 0]);
  for (const z of [-0.22, 0.22]) add(new THREE.CapsuleGeometry(0.05, 0.38, 4, 8), vest, [seated ? 0.17 : 0.02, hip + (seated ? 0.4 : 0.3), z], [0, 0, seated ? 1.0 : 0.05]);
  g.position.set(...at); g.rotation.y = facing;
  s.root.add(g);
  return g;
}
