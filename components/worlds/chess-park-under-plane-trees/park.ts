import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Sculpture, mix } from '@conjure/kit';

/** Park furniture: a slatted bench, pigeons, a lamp post, a litter bin, iron railings. All metres. */

export interface BenchOptions {
  x?: number;
  z?: number;
  /** Length along x. */
  length?: number;
  /** Seat height. */
  seat?: number;
  wood?: THREE.ColorRepresentation;
  iron?: THREE.ColorRepresentation;
  back?: boolean;
  arms?: boolean;
  yaw?: number;
}

/** A slatted timber bench on cast-iron ends, facing +z. Returns the seat top height, arm height and the ends. */
export function parkBench(s: Sculpture, options: BenchOptions = {}) {
  const x = options.x ?? 0, z = options.z ?? 0;
  const length = options.length ?? 1.8;
  const seatY = options.seat ?? 0.45;
  const wood = s.material(options.wood ?? '#8a6a44', { roughness: 0.85 });
  const iron = s.material(options.iron ?? '#2f3a34', { metalness: 0.5, roughness: 0.55 });
  const group = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], rotation?: [number, number, number]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...at);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const depth = 0.46;
  const slat = new THREE.BoxGeometry(length, 0.035, 0.075);
  for (let i = 0; i < 5; i++) add(slat, wood, [0, seatY - 0.0175, -depth / 2 + 0.05 + i * 0.09]);
  const hasBack = options.back ?? true;
  if (hasBack) {
    const backSlat = new THREE.BoxGeometry(length, 0.07, 0.03);
    for (let i = 0; i < 3; i++) add(backSlat, wood, [0, seatY + 0.14 + i * 0.11, -depth / 2 - 0.03 - i * 0.02], [-0.18, 0, 0]);
  }
  const armY = seatY + 0.24;
  for (const side of [-1, 1]) {
    const ex = side * (length / 2 - 0.08);
    // Cast-iron end: two legs, a seat rail, an upright for the back, a scrolled armrest.
    add(new THREE.CylinderGeometry(0.02, 0.025, seatY - 0.02, 8), iron, [ex, (seatY - 0.02) / 2, -depth / 2 + 0.06]);
    add(new THREE.CylinderGeometry(0.02, 0.025, seatY - 0.02, 8), iron, [ex, (seatY - 0.02) / 2, depth / 2 - 0.08]);
    add(new THREE.BoxGeometry(0.04, 0.03, depth - 0.1), iron, [ex, seatY - 0.045, -0.01]);
    if (hasBack) add(new THREE.CylinderGeometry(0.018, 0.02, 0.42, 8), iron, [ex, seatY + 0.19, -depth / 2 - 0.05], [-0.18, 0, 0]);
    if (options.arms ?? true) {
      add(new THREE.BoxGeometry(0.04, 0.025, depth - 0.06), iron, [ex, armY, -0.02]);
      add(new THREE.CylinderGeometry(0.014, 0.014, armY - seatY, 8), iron, [ex, seatY + (armY - seatY) / 2, depth / 2 - 0.1]);
      add(new THREE.TorusGeometry(0.03, 0.01, 6, 12), iron, [ex, armY + 0.02, depth / 2 - 0.05], [0, Math.PI / 2, 0]);
    }
  }
  group.position.set(x, 0, z);
  group.rotation.y = options.yaw ?? 0;
  s.root.add(group);
  return { group, seatY, armY, depth, length };
}

/** One pigeon as a single merged geometry: standing, or tipped forward pecking. About 0.3 m long, facing +z. */
export function pigeonGeometry(pecking = false) {
  const body = new THREE.SphereGeometry(1, 12, 8);
  body.scale(0.058, 0.05, 0.095);
  body.translate(0, 0.08, 0);
  const head = new THREE.SphereGeometry(0.028, 10, 8);
  head.translate(0, pecking ? 0.075 : 0.145, pecking ? 0.13 : 0.085);
  const neck = new THREE.CylinderGeometry(0.02, 0.03, 0.05, 8);
  neck.rotateX(pecking ? 1.3 : 0.5);
  neck.translate(0, pecking ? 0.09 : 0.115, pecking ? 0.1 : 0.065);
  const beak = new THREE.ConeGeometry(0.007, 0.022, 6);
  beak.rotateX(pecking ? Math.PI * 0.85 : Math.PI / 2);
  beak.translate(0, pecking ? 0.055 : 0.14, pecking ? 0.145 : 0.12);
  const tail = new THREE.BoxGeometry(0.045, 0.01, 0.09);
  tail.rotateX(-0.35);
  tail.translate(0, 0.085, -0.12);
  const parts = [body, head, neck, beak, tail];
  for (const side of [-1, 1]) {
    const leg = new THREE.CylinderGeometry(0.004, 0.004, 0.045, 5);
    leg.translate(side * 0.014, 0.025, 0.01);
    parts.push(leg);
  }
  if (pecking) { body.rotateX(0.35); body.translate(0, 0.0, 0.0); }
  const merged = mergeGeometries(parts.map((part) => part.toNonIndexed()), false)!;
  for (const part of parts) part.dispose();
  return merged;
}

export const PIGEON_COLOURS = ['#7a7d84', '#5a5c62', '#8f9198', '#4a4c52', '#e8e6e0', '#8a6a52', '#6b6d72', '#9a8e86'];

export interface PigeonSpot { x: number; z: number; y?: number; yaw: number; pecking?: boolean; colour?: THREE.ColorRepresentation }

/** A flock in two instanced meshes (standing, pecking). */
export function pigeons(s: Sculpture, spots: readonly PigeonSpot[], scale = 1) {
  const { random } = s.context;
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
  const groups = [spots.filter((spot) => !spot.pecking), spots.filter((spot) => spot.pecking)];
  const meshes: THREE.InstancedMesh[] = [];
  groups.forEach((list, index) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(pigeonGeometry(index === 1), material, list.length);
    const matrix = new THREE.Matrix4();
    list.forEach((spot, i) => {
      const size = scale * mix(0.9, 1.1, random());
      matrix.compose(new THREE.Vector3(spot.x, spot.y ?? 0, spot.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, spot.yaw, 0)), new THREE.Vector3(size, size, size));
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, new THREE.Color(spot.colour ?? PIGEON_COLOURS[Math.floor(random() * PIGEON_COLOURS.length)]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    s.root.add(mesh);
    meshes.push(mesh);
  });
  return meshes;
}

/** A cast-iron lamp post with a glowing lantern. Returns the lantern so the world can brighten it at dusk. */
export function lampPost(s: Sculpture, at: [number, number], options: { height?: number; glow?: number; warmth?: number; iron?: THREE.ColorRepresentation } = {}) {
  const [x, z] = at;
  const height = options.height ?? 3.6;
  const iron = s.material(options.iron ?? '#2a2e2c', { metalness: 0.5, roughness: 0.55 });
  s.cylinder(0.09, 0.13, 0.4, [x, 0.2, z], iron, 12);
  s.cylinder(0.05, 0.075, height - 0.9, [x, 0.4 + (height - 0.9) / 2, z], iron, 10);
  s.cylinder(0.08, 0.05, 0.12, [x, height - 0.46, z], iron, 10);
  const glow = options.glow ?? 0;
  const lantern = new THREE.MeshStandardMaterial({ color: '#fff3d2', emissive: new THREE.Color().setHSL(mix(0.12, 0.08, options.warmth ?? 0.5), 0.9, 0.6), emissiveIntensity: mix(0.08, 1.6, glow), roughness: 0.4 });
  const lamp = s.mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.38, 6), lantern, [x, height - 0.2, z]);
  lamp.castShadow = false;
  s.mesh(new THREE.ConeGeometry(0.26, 0.2, 6), iron, [x, height + 0.08, z]);
  s.mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 6), iron, [x, height - 0.4, z]);
  return { lamp, lantern };
}

/** A municipal litter bin: a slatted steel drum on a post, a bag liner showing at the rim. */
export function litterBin(s: Sculpture, at: [number, number], colour: THREE.ColorRepresentation = '#2f4a3a', full = 0.5) {
  const [x, z] = at;
  const paint = s.material(colour, { metalness: 0.4, roughness: 0.6 });
  s.cylinder(0.03, 0.03, 0.5, [x, 0.25, z], paint, 8);
  s.cylinder(0.2, 0.18, 0.6, [x, 0.8, z], paint, 14);
  s.cylinder(0.21, 0.21, 0.03, [x, 1.11, z], s.material('#1f2320', { roughness: 0.6 }), 14);
  s.cylinder(0.2, 0.2, 0.03, [x, 0.5, z], s.material('#1f2320', { roughness: 0.6 }), 14);
  s.cylinder(0.17, 0.17, 0.04, [x, 1.08, z], s.material('#1a1a1c', { roughness: 0.9 }), 14);
  if (full > 0.5) {
    const { random } = s.context;
    for (let i = 0; i < 3; i++) s.box([0.06, 0.03, 0.08], [x + (random() - 0.5) * 0.2, 1.14, z + (random() - 0.5) * 0.2], s.material(['#f1efe6', '#d8452c', '#c9b27e'][i], { roughness: 0.8 })).rotation.y = random() * 3;
  }
}

/** A low run of iron railings along x: posts, two rails, and spear tops. Instanced. */
export function ironFence(s: Sculpture, from: [number, number], to: [number, number], options: { height?: number; colour?: THREE.ColorRepresentation; spacing?: number } = {}) {
  const height = options.height ?? 0.7;
  const spacing = options.spacing ?? 0.14;
  const iron = s.material(options.colour ?? '#2a2e2c', { metalness: 0.5, roughness: 0.5 });
  const dx = to[0] - from[0], dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz);
  const count = Math.max(2, Math.floor(length / spacing));
  const matrix = new THREE.Matrix4();
  const bars = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.009, 0.009, height, 6), iron, count);
  const tips = new THREE.InstancedMesh(new THREE.ConeGeometry(0.016, 0.05, 6), iron, count);
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const x = from[0] + dx * t, z = from[1] + dz * t;
    bars.setMatrixAt(i, matrix.makeTranslation(x, height / 2, z));
    tips.setMatrixAt(i, matrix.makeTranslation(x, height + 0.025, z));
  }
  bars.instanceMatrix.needsUpdate = tips.instanceMatrix.needsUpdate = true;
  bars.castShadow = tips.castShadow = true;
  s.root.add(bars, tips);
  for (const y of [height * 0.2, height * 0.88]) {
    const rail = s.box([0.02, 0.02, length], [from[0] + dx / 2, y, from[1] + dz / 2], iron);
    rail.rotation.y = yaw;
  }
  const posts = Math.max(2, Math.round(length / 2.4) + 1);
  for (let i = 0; i < posts; i++) {
    const t = i / (posts - 1);
    s.box([0.05, height + 0.08, 0.05], [from[0] + dx * t, (height + 0.08) / 2, from[1] + dz * t], iron);
  }
}

/** A shopping trolley bag: a tartan box on two small wheels with a tall handle. */
export function trolleyBag(s: Sculpture, at: [number, number, number], yaw = 0, colour: THREE.ColorRepresentation = '#5a2a3a') {
  const group = new THREE.Group();
  const cloth = s.material(colour, { roughness: 0.95 });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation?: [number, number, number]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  };
  add(new THREE.BoxGeometry(0.34, 0.5, 0.26), cloth, [0, 0.33, 0]);
  add(new THREE.BoxGeometry(0.36, 0.05, 0.28), cloth, [0, 0.6, 0]);
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(0.34, 0.012, 0.27), s.material('#d9c27a', { roughness: 0.9 }), [0, 0.18 + i * 0.13, 0]);
  const iron = s.material('#3a3d42', { metalness: 0.5, roughness: 0.5 });
  for (const side of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), iron, [side * 0.16, 0.05, -0.08], [0, 0, Math.PI / 2]);
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.95, 6), iron, [side * 0.1, 0.48, -0.13]);
  }
  add(new THREE.BoxGeometry(0.24, 0.025, 0.025), iron, [0, 0.95, -0.13]);
  group.position.set(...at);
  group.rotation.y = yaw;
  s.root.add(group);
  return group;
}
