import * as THREE from 'three';
import { type Sculpture, clamp01, mix } from '@conjure/kit';

/** Shared railway vocabulary for this folder: instanced blocks, a length of track, weeds, figures. */

export type P3 = readonly [number, number, number];
export interface Block {
  size: P3;
  at: P3;
  rot?: P3;
  color?: THREE.ColorRepresentation;
}

/** Height of the running surface above the ground, metres. */
export const RAIL_TOP = 0.46;
export const HALF_GAUGE = 0.7175;

/** How snowed-in the scene is, from the shared mood: cold ideas get drifts, warm ones none. */
export const snowOf = (s: Sculpture) => clamp01((0.42 - s.context.mood.warmth) / 0.42);

/** Many boxes (or any unit geometry) in one draw call, each with its own size, turn and tint. */
export function blocks(
  parent: THREE.Object3D,
  material: THREE.Material,
  items: readonly Block[],
  geometry: THREE.BufferGeometry = new THREE.BoxGeometry(1, 1, 1),
) {
  if (items.length === 0) {
    geometry.dispose();
    return null;
  }
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), euler = new THREE.Euler();
  const white = new THREE.Color('#ffffff');
  const tinted = items.some((item) => item.color !== undefined);
  items.forEach((item, index) => {
    const [rx, ry, rz] = item.rot ?? [0, 0, 0];
    turn.setFromEuler(euler.set(rx, ry, rz));
    matrix.compose(new THREE.Vector3(...item.at), turn, new THREE.Vector3(...item.size));
    mesh.setMatrixAt(index, matrix);
    if (tinted) mesh.setColorAt(index, item.color === undefined ? white : new THREE.Color(item.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export const hexOf = (material: THREE.Material) => `#${(material as THREE.MeshStandardMaterial).color.getHexString()}`;

export interface TrackOptions {
  length: number;
  /** Centre of the length. The track runs along x unless turned. */
  at?: P3;
  yaw?: number;
  sleepers?: 'timber' | 'concrete';
  /** Leave the last sleepers at the +x end loose and skewed, as at an end of track. */
  ragged?: boolean;
}

/** A ballasted length of standard-gauge track: bed, sleepers, two rails, loose stone, snow when cold. */
export function track(s: Sculpture, options: TrackOptions) {
  const { mood, random } = s.context;
  const { length } = options;
  const snow = snowOf(s);
  const group = new THREE.Group();
  group.position.set(...(options.at ?? [0, 0, 0]));
  group.rotation.y = options.yaw ?? 0;
  s.root.add(group);

  const bedShape = new THREE.Shape([
    new THREE.Vector2(-1.95, 0), new THREE.Vector2(1.95, 0), new THREE.Vector2(1.5, 0.24), new THREE.Vector2(-1.5, 0.24),
  ]);
  const bedGeometry = new THREE.ExtrudeGeometry(bedShape, { depth: length, bevelEnabled: false });
  bedGeometry.rotateY(Math.PI / 2);
  bedGeometry.translate(-length / 2, 0, 0);
  const stone = new THREE.Color('#857f76').lerp(new THREE.Color('#5d5348'), mood.wear * 0.35).lerp(new THREE.Color('#e9eef1'), snow * 0.45);
  const bed = new THREE.Mesh(bedGeometry, new THREE.MeshStandardMaterial({ color: stone, roughness: 1 }));
  bed.castShadow = bed.receiveShadow = true;
  group.add(bed);

  const timber = options.sleepers !== 'concrete';
  const sleeperColour = timber ? '#4a3b2e' : '#a9a79f';
  const count = Math.max(2, Math.floor(length / 0.62));
  const parts: Block[] = [];
  for (let i = 0; i < count; i++) {
    const x = -length / 2 + (i + 0.5) * (length / count);
    const loose = options.ragged && i > count - 4 ? 1 : 0;
    parts.push({
      size: [0.25, 0.14, 2.5 * (1 - loose * random() * 0.12)],
      at: [x + (random() - 0.5) * 0.04, 0.25, (random() - 0.5) * (0.05 + mood.wear * 0.08 + loose * 0.2)],
      rot: [0, (random() - 0.5) * (0.02 + mood.wear * 0.05 + loose * 0.18), 0],
      color: new THREE.Color(sleeperColour).offsetHSL(0, 0, (random() - 0.5) * 0.06),
    });
  }
  const rust = new THREE.Color('#5b473b').lerp(new THREE.Color('#7a4a2c'), mood.wear * 0.7);
  const shine = new THREE.Color('#b4b9bd').lerp(rust, mood.wear * 0.85);
  for (const z of [-HALF_GAUGE, HALF_GAUGE]) {
    parts.push({ size: [length, 0.13, 0.065], at: [0, 0.385, z], color: rust });
    parts.push({ size: [length, 0.02, 0.07], at: [0, RAIL_TOP - 0.008, z], color: shine });
    parts.push({ size: [length, 0.02, 0.14], at: [0, 0.325, z], color: rust });
  }
  blocks(group, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, metalness: 0.15 }), parts);

  // Loose ballast on the shoulders, so the bed has a broken edge rather than a ruled one.
  const stones: Block[] = [];
  const stoneCount = Math.round(length * 9);
  for (let i = 0; i < stoneCount; i++) {
    const side = random() < 0.5 ? -1 : 1;
    const across = random() < 0.35 ? (random() - 0.5) * 1.1 : side * mix(1.3, 2.15, random());
    const size = mix(0.06, 0.15, random());
    stones.push({
      size: [size, size * 0.7, size],
      at: [(random() - 0.5) * length, Math.abs(across) > 1.5 ? mix(0.2, 0.02, (Math.abs(across) - 1.5) / 0.65) : 0.25, across],
      rot: [random() * 3, random() * 3, random() * 3],
      color: stone.clone().offsetHSL(0, 0, (random() - 0.5) * 0.12),
    });
  }
  blocks(group, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), stones, new THREE.DodecahedronGeometry(0.6, 0));

  if (snow > 0.2) {
    const white = new THREE.MeshStandardMaterial({ color: '#f3f6f8', roughness: 0.95 });
    blocks(group, white, [{ size: [length, 0.05 + snow * 0.06, 1.15], at: [0, 0.3, 0] }]);
    const drifts: Block[] = [];
    for (const side of [-1, 1]) {
      let x = -length / 2 + 0.4;
      while (x < length / 2 - 0.4) {
        const run = mix(0.9, 2.4, random());
        if (random() < 0.4 + snow * 0.5) drifts.push({ size: [run, 0.22 + snow * 0.22, mix(0.6, 1.1, random())], at: [Math.min(x + run / 2, length / 2 - run / 2), 0.1, side * mix(1.45, 1.8, random())] });
        x += run * 0.8;
      }
    }
    blocks(group, white, drifts, new THREE.SphereGeometry(0.5, 12, 6));
  }
  return group;
}

/** Tufts of grass or dead stalks, each tuft a spray of thin blades. Cold or grim moods dry them out. */
export function weeds(s: Sculpture, tufts: readonly { at: P3; size: number }[], parent: THREE.Object3D = s.root) {
  const { mood, random } = s.context;
  const live = new THREE.Color('#5d7a3a'), dead = new THREE.Color('#9a8c5e');
  const dryness = clamp01(1.1 - mood.warmth * 1.2 - mood.cheer * 0.3 + 0.2);
  const blades: Block[] = [];
  for (const tuft of tufts) {
    const n = 5 + Math.floor(random() * 5);
    for (let i = 0; i < n; i++) {
      const h = tuft.size * mix(0.5, 1.2, random());
      const lean = mix(0.05, 0.5, random()), turn = random() * Math.PI * 2;
      blades.push({
        size: [tuft.size * 0.09, h, tuft.size * 0.09],
        at: [tuft.at[0] + Math.sin(turn) * lean * h * 0.4, tuft.at[1] + h * 0.46, tuft.at[2] + Math.cos(turn) * lean * h * 0.4],
        rot: [Math.cos(turn) * lean, 0, -Math.sin(turn) * lean],
        color: live.clone().lerp(dead, clamp01(dryness + (random() - 0.5) * 0.4)).offsetHSL(0, 0, (random() - 0.5) * 0.08),
      });
    }
  }
  return blocks(parent, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), blades, new THREE.ConeGeometry(0.5, 1, 4));
}

export interface FigureOptions {
  at: P3;
  yaw?: number;
  coat: THREE.ColorRepresentation;
  trousers?: THREE.ColorRepresentation;
  hat?: 'cap' | 'hardhat' | 'brim' | 'beanie' | 'none';
  hatColour?: THREE.ColorRepresentation;
  pose?: 'stand' | 'sit' | 'reach' | 'hunch';
}

/** A simple clothed figure about 1.75 m tall. Feet (or seat, when sitting) at the given point. */
export function figure(s: Sculpture, options: FigureOptions) {
  const group = new THREE.Group();
  const coat = s.material(options.coat, { roughness: 0.9 });
  const legs = s.material(options.trousers ?? '#2d3238', { roughness: 0.9 });
  const skin = s.material('#c99a7c', { roughness: 0.8 });
  const boot = s.material('#1f1c1a');
  const pose = options.pose ?? 'stand';
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3, rot: P3 = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...at);
    mesh.rotation.set(...rot);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const limb = (from: P3, to: P3, radius: number, material: THREE.Material) => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const d = b.clone().sub(a);
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(d.length(), 0.01), 3, 8), material);
    mesh.position.copy(a.add(b).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    mesh.castShadow = true;
    group.add(mesh);
  };
  const sitting = pose === 'sit';
  const hip = sitting ? 0.08 : 0.88;
  const lean = pose === 'hunch' || sitting ? 0.28 : pose === 'reach' ? -0.05 : 0.04;
  const shoulder: P3 = [0, hip + 0.56 * Math.cos(lean), 0.56 * Math.sin(lean)];
  for (const side of [-1, 1]) {
    if (sitting) {
      limb([side * 0.1, hip, 0], [side * 0.13, hip + 0.02, 0.42], 0.075, legs);
      limb([side * 0.13, hip, 0.44], [side * 0.13, hip - 0.4, 0.5], 0.062, legs);
      add(new THREE.BoxGeometry(0.11, 0.09, 0.26), boot, [side * 0.13, hip - 0.42, 0.56]);
    } else {
      limb([side * 0.1, hip, 0], [side * 0.12, 0.1, side * 0.04], 0.075, legs);
      add(new THREE.BoxGeometry(0.11, 0.09, 0.27), boot, [side * 0.12, 0.045, side * 0.04 + 0.05]);
    }
    const hand: P3 = pose === 'reach'
      ? [side * 0.2, shoulder[1] + 0.42, shoulder[2] + 0.3]
      : sitting || pose === 'hunch'
        ? [side * 0.14, shoulder[1] - 0.3, shoulder[2] + 0.42]
        : [side * 0.27, shoulder[1] - 0.55, shoulder[2] + 0.06];
    limb([side * 0.21, shoulder[1] - 0.04, shoulder[2]], hand, 0.055, coat);
    add(new THREE.SphereGeometry(0.055, 8, 6), skin, hand);
  }
  add(new THREE.CylinderGeometry(0.2, 0.17, 0.62, 10), coat, [0, hip + 0.29 * Math.cos(lean), 0.29 * Math.sin(lean)], [lean, 0, 0]);
  const head: P3 = [0, shoulder[1] + 0.17, shoulder[2] + 0.05];
  add(new THREE.SphereGeometry(0.115, 12, 10), skin, head);
  const hatColour = s.material(options.hatColour ?? '#2c2f33');
  const hat = options.hat ?? 'cap';
  if (hat === 'cap') {
    add(new THREE.CylinderGeometry(0.12, 0.125, 0.08, 12), hatColour, [head[0], head[1] + 0.09, head[2]]);
    add(new THREE.BoxGeometry(0.18, 0.02, 0.12), hatColour, [head[0], head[1] + 0.06, head[2] + 0.14]);
  } else if (hat === 'hardhat') {
    add(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hatColour, [head[0], head[1] + 0.03, head[2]]);
    add(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 14), hatColour, [head[0], head[1] + 0.04, head[2] + 0.02]);
  } else if (hat === 'brim') {
    add(new THREE.CylinderGeometry(0.1, 0.125, 0.11, 12), hatColour, [head[0], head[1] + 0.12, head[2]]);
    add(new THREE.CylinderGeometry(0.22, 0.22, 0.018, 16), hatColour, [head[0], head[1] + 0.07, head[2]]);
  } else if (hat === 'beanie') {
    add(new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.9), hatColour, [head[0], head[1] + 0.02, head[2]]);
  }
  group.position.set(...options.at);
  group.rotation.y = options.yaw ?? 0;
  s.root.add(group);
  return group;
}
