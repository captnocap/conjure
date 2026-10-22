import * as THREE from 'three';
import { type Figure, type Sculpture, visibleBounds } from '@conjure/kit';

const RAD = Math.PI / 180;
export type Side = 'left' | 'right';

/** The joint groups behind a kit figure's hands and feet, so a pose can be adjusted after it is built. */
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
  return { shoulder, elbow, wrist, hip, knee, ankle, spine, neck };
}

export interface ArmPose {
  /** Lifts the upper arm toward the front, degrees: 90 is straight out ahead, 180 straight up. */
  forward?: number;
  /** Swings the upper arm away from the body, degrees (negative tucks it in). */
  out?: number;
  /** Folds the elbow, degrees. */
  bend?: number;
  /** Swings the forearm sideways across the chest before the bend, degrees. */
  inward?: number;
  /** Turns the bent forearm across the body after the bend, degrees. */
  across?: number;
}
export function poseArm(person: Figure, side: Side, pose: ArmPose) {
  const { shoulder, elbow } = joints(person, side);
  const sign = side === 'left' ? 1 : -1;
  shoulder.rotation.set(-(pose.forward ?? 0) * RAD, 0, sign * (pose.out ?? 0) * RAD);
  elbow.rotation.set(-(pose.bend ?? 0) * RAD, sign * (pose.across ?? 0) * RAD, -sign * (pose.inward ?? 0) * RAD);
}

export interface LegPose {
  /** Lifts the thigh toward the front, degrees: 90 is sitting. */
  forward?: number;
  out?: number;
  /** Folds the knee, degrees. */
  knee?: number;
  /** Extra ankle pitch, degrees: positive points the toes down. */
  toes?: number;
}
export function poseLeg(person: Figure, side: Side, pose: LegPose) {
  const { hip, knee, ankle } = joints(person, side);
  const sign = side === 'left' ? 1 : -1;
  hip.rotation.set(-(pose.forward ?? 0) * RAD, 0, sign * (pose.out ?? 0) * RAD);
  knee.rotation.x = (pose.knee ?? 0) * RAD;
  ankle.rotation.x = -(knee.rotation.x + hip.rotation.x) + (pose.toes ?? 0) * RAD;
}

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

/** Put a figure's hip joint at a given height, for a seat that is higher than its legs are long. */
export function seat(person: Figure, hipY: number) {
  person.root.updateMatrixWorld(true);
  person.root.position.y += hipY - at(person.pelvis).y;
  person.root.updateMatrixWorld(true);
}

/**
 * Swing an arm from the shoulder until its hand (or elbow) is nearest a target height, keeping the
 * other angles. Returns the forward angle it settled on. Call after the figure is seated or grounded.
 */
export function reachTo(person: Figure, side: Side, targetY: number, pose: ArmPose, part: 'hand' | 'elbow' = 'hand', range: [number, number] = [0, 150]) {
  const node = part === 'hand' ? person.hands[side] : joints(person, side).elbow;
  let best = pose.forward ?? range[0], bestError = Infinity;
  for (let forward = range[0]; forward <= range[1]; forward += 2) {
    poseArm(person, side, { ...pose, forward });
    const error = Math.abs(at(node).y - targetY);
    if (error < bestError - 0.002) { bestError = error; best = forward; }
  }
  poseArm(person, side, { ...pose, forward: best });
  return best;
}

/**
 * Swing and bend an arm until its hand (or elbow) is nearest a target height and depth, keeping the
 * other angles. Returns the pose it settled on. Call after the figure is seated or grounded.
 */
export function reachPoint(person: Figure, side: Side, target: { y: number; z: number; x?: number }, pose: ArmPose, part: 'hand' | 'elbow' = 'hand', ranges: { forward?: [number, number]; bend?: [number, number] } = {}) {
  const node = part === 'hand' ? person.hands[side] : joints(person, side).elbow;
  const [f0, f1] = ranges.forward ?? [0, 150];
  const [b0, b1] = part === 'elbow' ? [pose.bend ?? 0, pose.bend ?? 0] : ranges.bend ?? [0, 130];
  let best = { ...pose, forward: f0, bend: b0 }, bestError = Infinity;
  for (let forward = f0; forward <= f1; forward += 3) for (let bend = b0; bend <= b1; bend += 5) {
    poseArm(person, side, { ...pose, forward, bend });
    const here = at(node);
    const error = Math.hypot(here.y - target.y, here.z - target.z, target.x === undefined ? 0 : here.x - target.x);
    if (error < bestError - 0.001) { bestError = error; best = { ...pose, forward, bend }; }
  }
  poseArm(person, side, best);
  return best;
}

/** Move a figure so its hip joint lands at (x, z) on the ground plane, turned to face a yaw. */
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

/** The hand mesh of one side, for gloves. */
export function handMesh(person: Figure, side: Side) {
  return joints(person, side).wrist.children.find((node) => (node as THREE.Mesh).isMesh) as THREE.Mesh;
}
/** The foot mesh of one side, for socks and odd shoes. */
export function footMesh(person: Figure, side: Side) {
  return joints(person, side).ankle.children.find((node) => (node as THREE.Mesh).isMesh) as THREE.Mesh;
}
/** The torso mesh, for a waistcoat or vest fitted over it. */
export function torsoMesh(person: Figure) {
  const { spine } = joints(person, 'left');
  return spine.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh;
}

/** A garment capsule fitted over the torso: a vest, a waistcoat, a coat's body, a bib. */
export function overTorso(s: Sculpture, person: Figure, H: number, build: 'slight' | 'average' | 'heavy', material: THREE.Material, options: { grow?: number; length?: number; lift?: number } = {}) {
  const { spine } = joints(person, 'left');
  const torso = torsoMesh(person);
  const limb = H * 0.036 * { slight: 0.85, average: 1, heavy: 1.3 }[build];
  const torsoL = H * 0.28;
  const radius = limb * 1.35 * (build === 'heavy' ? 1.25 : 1) * (options.grow ?? 1.1);
  const length = torsoL * (options.length ?? 0.96);
  const vest = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.001, length - radius * 2), 4, 14), material);
  vest.position.y = length / 2 + (options.lift ?? 0) * torsoL;
  vest.scale.x = torso.scale.x;
  vest.castShadow = vest.receiveShadow = true;
  spine.add(vest);
  return vest;
}

/** Where the figure's mouth sits in sculpture space. */
export function mouthOf(person: Figure, H: number) {
  const headR = H * 0.064;
  return person.head.localToWorld(new THREE.Vector3(0, -headR * 0.25, headR * 0.95));
}

/** A brimmed hat with a band, added to the head and tilted a little. */
export function brimmedHat(s: Sculpture, person: Figure, H: number, colour: THREE.ColorRepresentation, tilt = 0.15, band: THREE.ColorRepresentation = '#2a2320') {
  const headR = H * 0.064;
  const felt = s.material(colour, { roughness: 0.85 });
  const group = new THREE.Group();
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.75, headR * 1.75, headR * 0.09, 22), felt);
  brim.position.y = headR * 0.72;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.9, headR * 1.08, headR * 1.15, 22), felt);
  crown.position.y = headR * 1.3;
  const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.1, headR * 1.1, headR * 0.22, 22), s.material(band, { roughness: 0.6 }));
  ribbon.position.y = headR * 0.88;
  for (const part of [brim, crown, ribbon]) part.castShadow = part.receiveShadow = true;
  group.add(brim, crown, ribbon);
  group.rotation.set(-0.08, 0, tilt);
  group.position.set(tilt * headR * 0.3, 0, -headR * 0.05);
  person.head.add(group);
  return group;
}

/** A flat cap sitting on the head, with its peak forward. */
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

/** A knitted beanie pulled down over the ears. */
export function beanie(s: Sculpture, person: Figure, H: number, colour: THREE.ColorRepresentation) {
  const headR = H * 0.064;
  const wool = s.material(colour, { roughness: 1 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), wool);
  dome.position.y = headR * 0.02;
  dome.scale.y = 1.15;
  const fold = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.05, headR * 0.16, 8, 20), wool);
  fold.rotation.x = Math.PI / 2;
  fold.position.y = headR * 0.1;
  dome.castShadow = fold.castShadow = true;
  person.head.add(dome, fold);
}

/** A tall fur hat. */
export function furHat(s: Sculpture, person: Figure, H: number, colour: THREE.ColorRepresentation) {
  const headR = H * 0.064;
  const fur = s.material(colour, { roughness: 1 });
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.25, headR * 1.3, headR * 1.5, 18), fur);
  hat.position.y = headR * 0.95;
  hat.castShadow = true;
  person.head.add(hat);
}

/** A headscarf tied under the chin: it covers the hair and frames the face. */
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

/** A small curved smile, for a face that is allowed one. */
export function smile(s: Sculpture, person: Figure, H: number) {
  const headR = H * 0.064;
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.22, headR * 0.03, 6, 12, Math.PI * 0.8), s.material('#4a2a24', { roughness: 0.5 }));
  mouth.position.set(0, -headR * 0.22, headR * 0.93);
  mouth.rotation.z = Math.PI + Math.PI * 0.1;
  person.head.add(mouth);
}

/** A long coat skirt below the hips, for a standing figure in an overcoat. */
export function coatSkirt(s: Sculpture, person: Figure, H: number, build: 'slight' | 'average' | 'heavy', material: THREE.Material, length = 0.26) {
  const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
  const hipW = H * 0.075 * wide;
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(hipW * 1.55, hipW * 1.9, H * length, 18, 1, true), material);
  skirt.position.y = -H * length / 2 + H * 0.02;
  skirt.castShadow = skirt.receiveShadow = true;
  person.pelvis.add(skirt);
  return skirt;
}

/** A scarf wound round the neck with one tail hanging down the chest. */
export function scarf(s: Sculpture, person: Figure, H: number, colour: THREE.ColorRepresentation) {
  const { spine } = joints(person, 'left');
  const limb = H * 0.036;
  const torsoL = H * 0.28;
  const wool = s.material(colour, { roughness: 1 });
  const loop = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.6, limb * 0.55, 8, 18), wool);
  loop.rotation.x = Math.PI / 2;
  loop.position.y = torsoL + limb * 0.2;
  loop.scale.x = 1.4;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(limb * 1.1, torsoL * 0.5, limb * 0.4), wool);
  tail.position.set(limb * 0.5, torsoL * 0.72, limb * 1.9);
  tail.rotation.z = 0.08;
  loop.castShadow = tail.castShadow = true;
  spine.add(loop, tail);
}

/** A necktie down the chest. */
export function necktie(s: Sculpture, person: Figure, H: number, colour: THREE.ColorRepresentation, front: number) {
  const { spine } = joints(person, 'left');
  const torsoL = H * 0.28;
  const silk = s.material(colour, { roughness: 0.45 });
  const tie = new THREE.Mesh(new THREE.BoxGeometry(H * 0.022, torsoL * 0.58, 0.006), silk);
  tie.position.set(0, torsoL * 0.62, front);
  const knot = new THREE.Mesh(new THREE.BoxGeometry(H * 0.03, H * 0.025, 0.012), silk);
  knot.position.set(0, torsoL * 0.93, front);
  spine.add(tie, knot);
}

/** A cigarette tucked behind one ear. */
export function cigaretteBehindEar(s: Sculpture, person: Figure, H: number, side: Side = 'right') {
  const headR = H * 0.064;
  const sign = side === 'left' ? 1 : -1;
  const paper = s.material('#f4efe2', { roughness: 0.7 });
  const cig = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6), paper);
  cig.position.set(sign * headR * 1.02, headR * 0.05, headR * 0.1);
  cig.rotation.x = Math.PI / 2 - 0.15;
  cig.rotation.z = sign * 0.1;
  const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.02, 6), s.material('#d8a24a', { roughness: 0.7 }));
  filter.position.set(sign * headR * 1.02, headR * 0.05, headR * 0.1 - 0.031);
  filter.rotation.copy(cig.rotation);
  person.head.add(cig, filter);
}

export const skinTones = ['#e8c9ad', '#d9b08c', '#c99a78', '#b5805a', '#8a5a3c', '#f0cfb0'] as const;
export const pick = <T>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)];
