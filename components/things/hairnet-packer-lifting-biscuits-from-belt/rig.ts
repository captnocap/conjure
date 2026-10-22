import * as THREE from 'three';
import { type Figure, type Sculpture, visibleBounds } from '@conjure/kit';

/** Pose and prop helpers for the biscuit-factory figures. Angles in degrees, lengths in metres. */
export const RAD = Math.PI / 180;
export type Side = 'left' | 'right';
export type P = [number, number, number];
export type Build = 'slight' | 'average' | 'heavy';

export const pick = <T>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)];
export const SKINS = ['#f1d2b6', '#e3bd9a', '#d9b08c', '#c58f62', '#a6714b', '#7a4f33', '#5a3a28'] as const;
export const HAIRS = ['#1f1a18', '#3b2a22', '#6b4a2a', '#a8763a', '#c9b48a', '#8a8580', '#d8d4cc'] as const;

/** The figure's proportions, as the kit derives them from height and build. */
export function anatomy(H: number, build: Build) {
  const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
  const limb = H * 0.036 * wide;
  return {
    wide, limb,
    headR: H * 0.064,
    torsoL: H * 0.28,
    pelvisL: H * 0.07,
    shoulderW: H * 0.115 * wide,
    hipW: H * 0.075 * wide,
    handL: H * 0.055,
    /** Radius of the torso capsule before its x stretch. */
    chestR: limb * 1.35 * (build === 'heavy' ? 1.25 : 1),
  };
}

/** The joint groups behind a kit figure's hands and feet. */
export function joints(person: Figure, side: Side) {
  const wrist = person.hands[side].parent as THREE.Object3D;
  const elbow = wrist.parent as THREE.Object3D;
  const shoulder = elbow.parent as THREE.Object3D;
  const neck = person.head.parent as THREE.Object3D;
  const spine = neck.parent as THREE.Object3D;
  const wanted = side === 'left' ? 1 : -1;
  const hip = person.pelvis.children.find((child) => (child as THREE.Group).isGroup && child !== spine && Math.sign(child.position.x) === wanted) as THREE.Object3D;
  const knee = hip.children.find((child) => (child as THREE.Group).isGroup) as THREE.Object3D;
  const ankle = knee.children.find((child) => (child as THREE.Group).isGroup) as THREE.Object3D;
  return { shoulder, elbow, wrist, hip, knee, ankle, spine, neck, body: person.root.children[0] };
}

export interface ArmPose {
  /** Upper arm swung toward the front: 90 is straight out ahead, 180 straight up. Negative swings it back. */
  forward?: number;
  /** Upper arm swung away from the body; negative tucks it across. */
  out?: number;
  /** Elbow bend. */
  bend?: number;
  /** The bent forearm swung across the body (positive) or away (negative). */
  across?: number;
}
export function poseArm(person: Figure, side: Side, pose: ArmPose) {
  const { shoulder, elbow } = joints(person, side);
  const sign = side === 'left' ? 1 : -1;
  elbow.rotation.order = 'YXZ';
  shoulder.rotation.set(-(pose.forward ?? 0) * RAD, 0, sign * (pose.out ?? 0) * RAD);
  elbow.rotation.set(-(pose.bend ?? 0) * RAD, -sign * (pose.across ?? 0) * RAD, 0);
}
export function armPose(person: Figure, side: Side): Required<ArmPose> {
  const { shoulder, elbow } = joints(person, side);
  const sign = side === 'left' ? 1 : -1;
  return { forward: -shoulder.rotation.x / RAD, out: sign * shoulder.rotation.z / RAD, bend: -elbow.rotation.x / RAD, across: -sign * elbow.rotation.y / RAD };
}

export interface LegPose {
  /** Thigh lifted toward the front: 90 is sitting. */
  forward?: number;
  out?: number;
  knee?: number;
  /** Extra ankle pitch; positive points the toes down. */
  toes?: number;
}
export function poseLeg(person: Figure, side: Side, pose: LegPose) {
  const { hip, knee, ankle } = joints(person, side);
  const sign = side === 'left' ? 1 : -1;
  hip.rotation.set(-(pose.forward ?? 0) * RAD, 0, sign * (pose.out ?? 0) * RAD);
  knee.rotation.x = (pose.knee ?? 0) * RAD;
  ankle.rotation.x = -(knee.rotation.x + hip.rotation.x) + (pose.toes ?? 0) * RAD;
}

/** Bend at the waist (forward positive), look down (positive) and turn the head (to the figure's left positive). */
export function bow(person: Figure, degrees: number) { joints(person, 'left').spine.rotation.x = degrees * RAD; }
export function look(person: Figure, pitch: number, yaw = 0, roll = 0) { joints(person, 'left').neck.rotation.set(pitch * RAD, yaw * RAD, roll * RAD); }
export function lean(person: Figure, forward: number, side = 0) { const body = joints(person, 'left').body; body.rotation.x = forward * RAD; body.rotation.z = side * RAD; }

/** Where a joint or attachment sits in the sculpture's space right now. */
export function at(node: THREE.Object3D) {
  node.updateWorldMatrix(true, false);
  return node.getWorldPosition(new THREE.Vector3());
}

/** After re-posing joints, drop the figure so its lowest visible point rests on y = 0 again. */
export function ground(person: Figure) {
  person.root.updateMatrixWorld(true);
  const bounds = visibleBounds(person.root);
  if (!bounds.isEmpty()) person.root.position.y -= bounds.min.y;
  person.root.updateMatrixWorld(true);
}

/** Put a figure's hip joint at a given height, for a seat higher than its legs are long. */
export function seat(person: Figure, hipY: number) {
  person.root.updateMatrixWorld(true);
  person.root.position.y += hipY - at(person.pelvis).y;
  person.root.updateMatrixWorld(true);
}

/** Move a figure so its hip joint lands over (x, z), turned to a yaw. Keeps its height. */
export function hipsAt(person: Figure, x: number, z: number, yaw = 0) {
  person.root.rotation.y = 0;
  person.root.position.set(0, person.root.position.y, 0);
  person.root.updateMatrixWorld(true);
  const local = at(person.pelvis);
  const dx = local.x * Math.cos(yaw) + local.z * Math.sin(yaw), dz = -local.x * Math.sin(yaw) + local.z * Math.cos(yaw);
  person.root.rotation.y = yaw;
  person.root.position.set(x - dx, person.root.position.y, z - dz);
  person.root.updateMatrixWorld(true);
}

export interface ReachRanges { forward?: [number, number]; out?: [number, number]; bend?: [number, number]; across?: [number, number] }

/**
 * Swing and bend an arm until the hand is nearest a point in sculpture space: a coarse sweep of
 * the shoulder and elbow, then a fine one around the best. Returns the pose and its error.
 */
export function reach(person: Figure, side: Side, target: THREE.Vector3, ranges: ReachRanges = {}, keep: Partial<ArmPose> = {}) {
  const hand = person.hands[side];
  const r = {
    forward: ranges.forward ?? [-20, 150], out: ranges.out ?? [-10, 40], bend: ranges.bend ?? [0, 130], across: ranges.across ?? [-20, 60],
  };
  const fixed = (key: keyof ArmPose) => keep[key] !== undefined;
  const span = (key: keyof ArmPose, step: number) => (fixed(key) ? [keep[key]!] : Array.from({ length: Math.floor((r[key][1] - r[key][0]) / step) + 1 }, (_u, i) => r[key][0] + i * step));
  let best: Required<ArmPose> = { forward: 0, out: 0, bend: 0, across: 0 }, bestError = Infinity;
  const test = (pose: Required<ArmPose>) => {
    poseArm(person, side, pose);
    const error = at(hand).distanceTo(target);
    if (error < bestError) { bestError = error; best = pose; }
  };
  for (const forward of span('forward', 10)) for (const out of span('out', 10)) for (const bend of span('bend', 10)) for (const across of span('across', 20)) test({ forward, out, bend, across });
  const around = (key: keyof ArmPose, step: number, reach: number) => (fixed(key) ? [keep[key]!] : Array.from({ length: Math.round((2 * reach) / step) + 1 }, (_u, i) => Math.min(r[key][1], Math.max(r[key][0], best[key] - reach + i * step))));
  const coarse = best;
  for (const forward of around('forward', 2, 10)) for (const out of around('out', 3, 10)) for (const bend of around('bend', 3, 10)) for (const across of around('across', 5, 20)) test({ forward, out, bend, across });
  void coarse;
  poseArm(person, side, best);
  return { ...best, error: bestError };
}

export function handMesh(person: Figure, side: Side) {
  return joints(person, side).wrist.children.find((node) => (node as THREE.Mesh).isMesh) as THREE.Mesh;
}
export function torsoMesh(person: Figure) {
  const { spine } = joints(person, 'left');
  return spine.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh;
}

/** A garment capsule fitted over the torso: a tabard, a coat body, a bib. */
export function overTorso(person: Figure, H: number, build: Build, material: THREE.Material, options: { grow?: number; length?: number; lift?: number } = {}) {
  const { spine } = joints(person, 'left');
  const torso = torsoMesh(person);
  const { torsoL, chestR } = anatomy(H, build);
  const radius = chestR * (options.grow ?? 1.1);
  const length = torsoL * (options.length ?? 0.96);
  const vest = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.001, length - radius * 2), 4, 14), material);
  vest.position.y = length / 2 + (options.lift ?? 0) * torsoL;
  vest.scale.x = torso.scale.x;
  vest.castShadow = vest.receiveShadow = true;
  spine.add(vest);
  return vest;
}

/** A coat or overall skirt hanging from the hips: `length` as a fraction of height. */
export function coatSkirt(person: Figure, H: number, build: Build, material: THREE.Material, length = 0.24) {
  const { hipW } = anatomy(H, build);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(hipW * 1.5, hipW * 1.85, H * length, 18, 1, true), material);
  skirt.position.y = -H * length / 2 + H * 0.025;
  skirt.castShadow = skirt.receiveShadow = true;
  person.pelvis.add(skirt);
  return skirt;
}

/** A necktie and a knot down the front of the chest. */
export function necktie(s: Sculpture, person: Figure, H: number, build: Build, colour: THREE.ColorRepresentation, front: number) {
  const { spine } = joints(person, 'left');
  const { torsoL } = anatomy(H, build);
  const silk = s.material(colour, { roughness: 0.45 });
  const tie = new THREE.Mesh(new THREE.BoxGeometry(H * 0.022, torsoL * 0.55, 0.006), silk);
  tie.position.set(0, torsoL * 0.6, front);
  const knot = new THREE.Mesh(new THREE.BoxGeometry(H * 0.03, H * 0.025, 0.012), silk);
  knot.position.set(0, torsoL * 0.92, front);
  tie.castShadow = knot.castShadow = true;
  spine.add(tie, knot);
}

/** A shirt collar showing above a coat or overall. */
export function collar(s: Sculpture, person: Figure, H: number, build: Build, colour: THREE.ColorRepresentation = '#f1efe6') {
  const { spine } = joints(person, 'left');
  const { torsoL, limb } = anatomy(H, build);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.3, limb * 0.22, 6, 16), s.material(colour, { roughness: 0.6 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = torsoL + limb * 0.1;
  ring.scale.x = 1.25;
  spine.add(ring);
}

/** A pale, slightly see-through hairnet over the hair, with its elastic at the brim. */
export function hairnet(s: Sculpture, person: Figure, H: number, colour: THREE.ColorRepresentation = '#f3efe6') {
  const headR = H * 0.064;
  const net = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.2, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), new THREE.MeshStandardMaterial({ color: colour, transparent: true, opacity: 0.55, roughness: 1, depthWrite: false }));
  net.position.set(0, headR * 0.08, -headR * 0.08);
  net.scale.y = 1.08;
  net.castShadow = false;
  const band = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.08, headR * 0.05, 6, 24), s.material(colour, { roughness: 0.9 }));
  band.rotation.x = Math.PI / 2 + 0.12;
  band.position.set(0, headR * 0.05, -headR * 0.08);
  person.head.add(net, band);
}

/** A headscarf tied under the chin: covers the hair and frames the face. */
export function headscarf(s: Sculpture, person: Figure, H: number, colour: THREE.ColorRepresentation) {
  const headR = H * 0.064;
  const cloth = s.material(colour, { roughness: 0.9, side: THREE.DoubleSide });
  const hood = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.18, 18, 12, Math.PI * 0.85, Math.PI * 1.3, 0, Math.PI * 0.78), cloth);
  hood.position.set(0, headR * 0.08, -headR * 0.1);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.5, headR * 1.3, 8), cloth);
  tail.position.set(0, -headR * 0.55, -headR * 0.75);
  tail.rotation.x = Math.PI - 0.5;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.22, 8, 6), cloth);
  knot.position.set(0, -headR * 1.05, headR * 0.5);
  for (const part of [hood, tail, knot]) part.castShadow = true;
  person.head.add(hood, tail, knot);
}

/** A flat cap with its peak forward. */
export function flatCap(s: Sculpture, person: Figure, H: number, colour: THREE.ColorRepresentation) {
  const headR = H * 0.064;
  const tweed = s.material(colour, { roughness: 0.95 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), tweed);
  dome.position.y = headR * 0.12;
  dome.scale.set(1.05, 0.8, 1.15);
  const peak = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.3, headR * 0.1, headR * 0.8), tweed);
  peak.position.set(0, headR * 0.42, headR * 1.15);
  peak.rotation.x = 0.18;
  dome.castShadow = peak.castShadow = true;
  person.head.add(dome, peak);
}

/** Round spectacles: two rims and a bridge in front of the eyes. */
export function glasses(s: Sculpture, person: Figure, H: number, colour: THREE.ColorRepresentation = '#2a2320') {
  const headR = H * 0.064;
  const frame = s.material(colour, { roughness: 0.4, metalness: 0.4 });
  for (const side of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.26, headR * 0.03, 6, 16), frame);
    rim.position.set(side * headR * 0.36, headR * 0.12, headR * 0.98);
    person.head.add(rim);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.025, headR * 0.025, headR * 1.1, 6), frame);
    arm.rotation.x = Math.PI / 2;
    arm.position.set(side * headR * 0.95, headR * 0.14, headR * 0.45);
    person.head.add(arm);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.22, headR * 0.04, headR * 0.04), frame);
  bridge.position.set(0, headR * 0.14, headR * 0.98);
  person.head.add(bridge);
}

/** A pencil moustache: a thin dark bar under the nose. */
export function pencilMoustache(s: Sculpture, person: Figure, H: number, colour: THREE.ColorRepresentation = '#2a2320') {
  const headR = H * 0.064;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.07, headR * 0.06), s.material(colour, { roughness: 0.8 }));
  bar.position.set(0, -headR * 0.2, headR * 0.95);
  person.head.add(bar);
}

/** A pen or pencil tucked behind one ear. */
export function penBehindEar(s: Sculpture, person: Figure, H: number, side: Side = 'right', colour: THREE.ColorRepresentation = '#1f3f8f') {
  const headR = H * 0.064;
  const sign = side === 'left' ? 1 : -1;
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.13, 6), s.material(colour, { roughness: 0.4 }));
  pen.position.set(sign * headR * 1.04, headR * 0.1, headR * 0.15);
  pen.rotation.x = Math.PI / 2 - 0.2;
  pen.rotation.z = sign * 0.08;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.03, 6), s.material('#e6e2d6', { roughness: 0.4 }));
  cap.position.set(sign * headR * 1.04, headR * 0.1 + 0.01, headR * 0.15 + 0.05);
  cap.rotation.copy(pen.rotation);
  person.head.add(pen, cap);
}

/** A canvas-painted texture: no fonts, images or network. */
export function paint(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export type BiscuitKind = 'round' | 'rectangular' | 'chocolate' | 'cream';
export const BISCUIT_COLOUR: Record<BiscuitKind, string> = { round: '#d0a05a', rectangular: '#c9975a', chocolate: '#4a2a16', cream: '#d9b070' };

/** One biscuit, lying flat, centred at its base. */
export function biscuitGeometry(kind: BiscuitKind) {
  const thickness = kind === 'chocolate' ? 0.011 : 0.009;
  const geometry = kind === 'rectangular' || kind === 'cream'
    ? new THREE.BoxGeometry(0.062, thickness, 0.042)
    : new THREE.CylinderGeometry(0.034, 0.034, thickness, 18);
  geometry.translate(0, thickness / 2, 0);
  return geometry;
}
export function biscuitMaterial(s: Sculpture, kind: BiscuitKind) {
  return s.material(BISCUIT_COLOUR[kind], { roughness: kind === 'chocolate' ? 0.35 : 0.9 });
}

/** A short run of conveyor: a steel frame on legs, a dark rubber belt, side rails, two end rollers. */
export function conveyor(s: Sculpture, options: { length: number; width?: number; height?: number; at?: P; endRoller?: 'left' | 'right' | 'both' | 'none' }) {
  const length = options.length, width = options.width ?? 0.6, height = options.height ?? 0.9;
  const [cx, cy, cz] = options.at ?? [0, 0, 0];
  const steel = s.material('#8e9497', { metalness: 0.65, roughness: 0.4 });
  const dark = s.material('#2a2c2e', { roughness: 0.85 });
  const rubber = s.material('#24262a', { roughness: 0.95 });
  const top = cy + height;
  // Bed and belt.
  s.box([length, 0.05, width], [cx, top - 0.05, cz], steel);
  s.box([length + (options.endRoller === 'none' ? 0 : 0.0), 0.02, width - 0.08], [cx, top - 0.015, cz], rubber);
  // Side rails standing above the belt.
  for (const side of [-1, 1]) s.box([length, 0.09, 0.03], [cx, top + 0.02, cz + side * (width / 2 - 0.015)], steel);
  // Legs with a cross brace and feet.
  const legXs = length > 1.4 ? [-length / 2 + 0.2, 0, length / 2 - 0.2] : [-length / 2 + 0.15, length / 2 - 0.15];
  for (const lx of legXs) {
    for (const side of [-1, 1]) {
      s.box([0.05, top - 0.08, 0.05], [cx + lx, cy + (top - 0.08) / 2, cz + side * (width / 2 - 0.08)], dark);
      s.box([0.1, 0.02, 0.1], [cx + lx, cy + 0.01, cz + side * (width / 2 - 0.08)], dark);
    }
    s.box([0.04, 0.04, width - 0.2], [cx + lx, cy + 0.3, cz], dark);
  }
  // Return rollers underneath, end drums.
  const ends = options.endRoller === 'both' ? [-1, 1] : options.endRoller === 'left' ? [1] : options.endRoller === 'right' ? [-1] : [];
  for (const end of ends) {
    const drum = s.cylinder(0.055, 0.055, width - 0.06, [cx + end * (length / 2 + 0.0), top - 0.045, cz], steel, 18);
    drum.rotation.x = Math.PI / 2;
  }
  return { top, steel, dark, rubber };
}

/** A row-and-column scatter of biscuits along a belt, with jitter and gaps. */
export function biscuitRows(s: Sculpture, kind: BiscuitKind, options: { from: P; length: number; width: number; rows: number; pitch: number; gaps?: number; random: () => number }) {
  const { random } = options;
  const points: { at: P; size: number }[] = [];
  const count = Math.floor(options.length / options.pitch);
  const [x0, y, z0] = options.from;
  for (let i = 0; i < count; i++) for (let r = 0; r < options.rows; r++) {
    if (random() < (options.gaps ?? 0)) continue;
    const x = x0 + (i + 0.5) * options.pitch + (random() - 0.5) * 0.01;
    const z = z0 + (r + 0.5) * (options.width / options.rows) - options.width / 2 + (random() - 0.5) * 0.012;
    points.push({ at: [x, y, z], size: 1 });
  }
  if (!points.length) return null;
  const mesh = s.scatter(biscuitGeometry(kind), biscuitMaterial(s, kind), points);
  if (kind === 'rectangular' || kind === 'cream') {
    // Turn the oblongs so their long side runs across the belt.
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    points.forEach((p, i) => { matrix.compose(new THREE.Vector3(...p.at), q, new THREE.Vector3(1, 1, 1)); mesh.setMatrixAt(i, matrix); });
    mesh.instanceMatrix.needsUpdate = true;
  }
  return mesh;
}

/** A flat cardboard tray or a stack of them: a shallow open box, brown or printed. */
export function trayStack(s: Sculpture, at: P, count: number, options: { width?: number; depth?: number; colour?: THREE.ColorRepresentation; random: () => number }) {
  const width = options.width ?? 0.3, depth = options.depth ?? 0.22;
  const card = s.material(options.colour ?? '#b9915c', { roughness: 0.95 });
  const [x, y, z] = at;
  for (let i = 0; i < count; i++) {
    const yy = y + i * 0.035, jx = (options.random() - 0.5) * 0.015, jz = (options.random() - 0.5) * 0.015;
    s.box([width, 0.008, depth], [x + jx, yy + 0.004, z + jz], card);
    s.box([width, 0.04, 0.008], [x + jx, yy + 0.02, z + jz - depth / 2 + 0.004], card);
    s.box([width, 0.04, 0.008], [x + jx, yy + 0.02, z + jz + depth / 2 - 0.004], card);
    s.box([0.008, 0.04, depth], [x + jx - width / 2 + 0.004, yy + 0.02, z + jz], card);
    s.box([0.008, 0.04, depth], [x + jx + width / 2 - 0.004, yy + 0.02, z + jz], card);
  }
  return { top: y + count * 0.035 };
}

/** A small transistor radio with an aerial, resting on a surface. */
export function radio(s: Sculpture, at: P, yaw = 0, colour: THREE.ColorRepresentation = '#c8c2b0') {
  const g = new THREE.Group();
  g.position.set(...at);
  g.rotation.y = yaw;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.06), s.material(colour, { roughness: 0.5 }));
  body.position.y = 0.05;
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.004), s.material('#2a2a2c', { roughness: 0.9 }));
  grille.position.set(-0.035, 0.05, 0.031);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 16), s.material('#e8e2d2', { roughness: 0.5 }));
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0.05, 0.05, 0.031);
  const aerial = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.28, 6), s.material('#b8bcc2', { metalness: 0.8, roughness: 0.3 }));
  aerial.position.set(0.07, 0.22, -0.01);
  aerial.rotation.z = -0.35;
  for (const part of [body, grille, dial, aerial]) part.castShadow = part.receiveShadow = true;
  g.add(body, grille, dial, aerial);
  s.root.add(g);
  return g;
}

/** A tea mug: a short cylinder with a loop handle, optionally with tea in it. */
export function mug(s: Sculpture, at: P, options: { colour?: THREE.ColorRepresentation; tea?: boolean; yaw?: number } = {}) {
  const g = new THREE.Group();
  g.position.set(...at);
  g.rotation.y = options.yaw ?? 0;
  const china = s.material(options.colour ?? '#f1ede4', { roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.095, 16, 1, true), new THREE.MeshStandardMaterial({ color: (china as THREE.MeshStandardMaterial).color, roughness: 0.4, side: THREE.DoubleSide }));
  body.position.y = 0.0475;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.006, 16), china);
  base.position.y = 0.003;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 14, Math.PI), china);
  handle.position.set(0.04, 0.05, 0);
  handle.rotation.z = -Math.PI / 2;
  body.castShadow = base.castShadow = handle.castShadow = true;
  g.add(body, base, handle);
  if (options.tea) {
    const tea = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.004, 16), s.material('#8a5a2a', { roughness: 0.2 }));
    tea.position.y = 0.075;
    g.add(tea);
  }
  s.root.add(g);
  return g;
}
