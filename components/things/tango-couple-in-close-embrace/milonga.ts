import * as THREE from 'three';
import type { Figure, Sculpture } from '@conjure/kit';

/** Shared vocabulary for the milonga figures: degree-based posing, a small solver that puts a hand or a foot where it is wanted, and the café furniture. */

export const RAD = Math.PI / 180;
export type Side = 'left' | 'right';
export type P = [number, number, number];

export const SKINS = ['#f1d2b6', '#e3c2a4', '#dfb48f', '#c58f62', '#a6714b', '#7a4f33', '#5a3a28'] as const;
export const pick = <T>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)];
export const pickSkin = (random: () => number) => pick(random, SKINS);
export const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export interface ArmPose {
  /** Upper arm swung forward from hanging, degrees; negative swings it back. */
  forward?: number;
  /** Upper arm swung out from the body, degrees; negative crosses it inward. */
  out?: number;
  /** Elbow bend, degrees. */
  bend?: number;
  /** Bent forearm swung inward across the body, degrees; negative swings it outward. */
  across?: number;
}
export interface LegPose {
  forward?: number;
  out?: number;
  knee?: number;
  /** Ankle angle in degrees, or 'flat' to keep the sole level with the ground. */
  foot?: number | 'flat';
}

/** Degree-based handles on a kit figure's joints, so poses can go beyond the presets. */
export function rig(person: Figure) {
  const { joints } = person;
  const sign = (side: Side) => (side === 'left' ? 1 : -1);
  return {
    arm(side: Side, pose: ArmPose) {
      const shoulder = joints.shoulders[side], elbow = joints.elbows[side];
      if (pose.forward !== undefined) shoulder.rotation.x = -pose.forward * RAD;
      if (pose.out !== undefined) shoulder.rotation.z = sign(side) * pose.out * RAD;
      if (pose.bend !== undefined) elbow.rotation.x = -pose.bend * RAD;
      if (pose.across !== undefined) elbow.rotation.y = -sign(side) * pose.across * RAD;
    },
    leg(side: Side, pose: LegPose) {
      const hip = joints.hips[side], knee = joints.knees[side], ankle = joints.ankles[side];
      if (pose.forward !== undefined) hip.rotation.x = -pose.forward * RAD;
      if (pose.out !== undefined) hip.rotation.z = sign(side) * pose.out * RAD;
      if (pose.knee !== undefined) knee.rotation.x = pose.knee * RAD;
      ankle.rotation.x = pose.foot === undefined || pose.foot === 'flat' ? -(knee.rotation.x + hip.rotation.x) : pose.foot * RAD;
    },
    /** Whole-body lean about the ground: forward positive, and a sideways roll. */
    lean(forward: number, roll = 0) { joints.body.rotation.x = forward * RAD; joints.body.rotation.z = roll * RAD; },
    /** Bend at the waist, degrees forward, with an optional sideways tip and twist. */
    bow(forward: number, tip = 0, twist = 0) { joints.spine.rotation.set(forward * RAD, twist * RAD, tip * RAD); },
    /** Head pitch (down positive), yaw (to the figure's left positive) and a sideways tilt, degrees. */
    look(pitch: number, yaw = 0, tilt = 0) { joints.neck.rotation.set(pitch * RAD, yaw * RAD, tilt * RAD); },
  };
}

/** Where a node sits in the sculpture's space right now. */
export function at(art: Sculpture, node: THREE.Object3D) {
  art.root.updateMatrixWorld(true);
  return art.root.worldToLocal(node.getWorldPosition(new THREE.Vector3()));
}

interface Dial { node: THREE.Object3D; axis: 'x' | 'y' | 'z'; min: number; max: number }

/** Turn a few joints until `tip` lands on `target` (sculpture space): gradient descent from the current pose and a few fixed starts, so it is deterministic and does not stall on a ridge. */
function solve(art: Sculpture, tip: THREE.Object3D, dials: Dial[], target: THREE.Vector3, starts: number[][] = [], iterations = 50) {
  art.root.updateMatrixWorld(true);
  const goal = art.root.localToWorld(target.clone());
  const top = dials[0].node;
  const pos = new THREE.Vector3();
  const limit = (values: number[]) => values.map((value, index) => clamp(value, dials[index].min, dials[index].max));
  const set = (values: number[]) => dials.forEach((dial, index) => { dial.node.rotation[dial.axis] = values[index]; });
  const error = (values: number[]) => {
    set(values);
    top.updateMatrixWorld(true);
    return tip.getWorldPosition(pos).distanceToSquared(goal);
  };
  const initial = dials.map((dial) => dial.node.rotation[dial.axis]);
  let bestValues = initial, bestError = error(initial);
  for (const start of [initial, ...starts]) {
    let values = limit(start.length === dials.length ? start : [...start, ...initial.slice(start.length)]);
    let current = error(values);
    let step = 0.5;
    for (let round = 0; round < iterations && current > 1e-7; round++) {
      const gradient = values.map((value, index) => {
        const up = values.slice(), down = values.slice();
        up[index] = clamp(value + 0.01, dials[index].min, dials[index].max);
        down[index] = clamp(value - 0.01, dials[index].min, dials[index].max);
        const span = up[index] - down[index];
        return span > 0 ? (error(up) - error(down)) / span : 0;
      });
      const norm = Math.hypot(...gradient);
      if (norm < 1e-9) break;
      let moved = false;
      for (let t = step; t > 1e-4; t *= 0.5) {
        const next = limit(values.map((value, index) => value - (gradient[index] / norm) * t));
        const trial = error(next);
        if (trial < current) { values = next; current = trial; moved = true; step = Math.min(0.6, t * 1.6); break; }
      }
      if (!moved) break;
    }
    if (current < bestError) { bestError = current; bestValues = values; }
  }
  set(bestValues);
  art.root.updateMatrixWorld(true);
  return Math.sqrt(bestError);
}

/** Bend an arm so its hand lands on `target` (sculpture space). The elbow may also swing the forearm across when `across` is allowed. */
export function reachHand(art: Sculpture, person: Figure, side: Side, target: THREE.Vector3, options: { across?: boolean; outMin?: number; outMax?: number } = {}) {
  const sign = side === 'left' ? 1 : -1;
  const shoulder = person.joints.shoulders[side], elbow = person.joints.elbows[side];
  const outMin = (options.outMin ?? -25) * RAD, outMax = (options.outMax ?? 110) * RAD;
  const dials: Dial[] = [
    { node: shoulder, axis: 'x', min: -175 * RAD, max: 40 * RAD },
    { node: shoulder, axis: 'z', min: sign > 0 ? outMin : -outMax, max: sign > 0 ? outMax : -outMin },
    { node: elbow, axis: 'x', min: -150 * RAD, max: 0 },
  ];
  if (options.across) dials.push({ node: elbow, axis: 'y', min: -100 * RAD, max: 100 * RAD });
  const starts = [[-90 * RAD, sign * 15 * RAD, -30 * RAD], [-150 * RAD, sign * 20 * RAD, -10 * RAD], [-30 * RAD, sign * 80 * RAD, -20 * RAD], [-90 * RAD, sign * 60 * RAD, -90 * RAD], [-60 * RAD, 0, -120 * RAD], [-120 * RAD, sign * -20 * RAD, -100 * RAD]];
  return solve(art, person.hands[side], dials, target, starts.map((start) => options.across ? [...start, 0] : start));
}

/** Bend a leg so its ankle lands on `target` (sculpture space), then flatten or point the foot. */
export function reachFoot(art: Sculpture, person: Figure, side: Side, target: THREE.Vector3, foot: number | 'flat' = 'flat') {
  const sign = side === 'left' ? 1 : -1;
  const hip = person.joints.hips[side], knee = person.joints.knees[side], ankle = person.joints.ankles[side];
  const dials: Dial[] = [
    { node: hip, axis: 'x', min: -130 * RAD, max: 45 * RAD },
    { node: hip, axis: 'z', min: sign > 0 ? -12 * RAD : -40 * RAD, max: sign > 0 ? 40 * RAD : 12 * RAD },
    { node: knee, axis: 'x', min: 0, max: 150 * RAD },
  ];
  const miss = solve(art, ankle, dials, target, [[-90 * RAD, 0, 90 * RAD], [-45 * RAD, 0, 45 * RAD], [-110 * RAD, sign * 10 * RAD, 130 * RAD], [20 * RAD, 0, 30 * RAD]]);
  ankle.rotation.x = foot === 'flat' ? -(knee.rotation.x + hip.rotation.x) : foot * RAD;
  return miss;
}

/** The figure's proportions, as the kit lays them out. */
export function anatomy(H: number, build: 'slight' | 'average' | 'heavy' = 'average') {
  const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
  const limb = H * 0.036 * wide;
  return { limb, headR: H * 0.064, torsoL: H * 0.28, pelvisL: H * 0.07, thighL: H * 0.24, shinL: H * 0.23, footL: H * 0.03, upperL: H * 0.17, foreL: H * 0.15, handL: H * 0.055, shoulderW: H * 0.115 * wide, hipW: H * 0.075 * wide, chestR: limb * 1.35 * (build === 'heavy' ? 1.25 : 1) };
}

/** A garment over the torso: a capsule for a jumper, an open-fronted cylinder for a jacket or waistcoat. Attached to the spine so it bends with the figure. */
export function garment(person: Figure, H: number, build: 'slight' | 'average' | 'heavy', material: THREE.Material, options: { grow?: number; length?: number; open?: number; flare?: number; lift?: number } = {}) {
  const { torsoL, chestR, shoulderW, limb } = anatomy(H, build);
  const grow = options.grow ?? 1.12;
  const length = options.length ?? 0.98;
  const radius = chestR * grow;
  const spine = person.joints.spine;
  let mesh: THREE.Mesh;
  if (options.open) {
    const gap = options.open * RAD;
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * (options.flare ?? 1.08), torsoL * length, 18, 1, true, gap / 2, Math.PI * 2 - gap), material);
    mesh.position.y = torsoL * (0.5 + (options.lift ?? 0));
  } else {
    mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.01, torsoL * length - radius * 2), 4, 14), material);
    mesh.position.y = torsoL * (0.47 + (options.lift ?? 0));
  }
  mesh.scale.x = ((shoulderW * 2) / (limb * 2.7 * (build === 'heavy' ? 1.25 : 1))) * 1.02;
  mesh.castShadow = mesh.receiveShadow = true;
  spine.add(mesh);
  return mesh;
}

/** A skirt: an open cone hung from the waist, following the pelvis. `slit` leaves a gap, in degrees, centred on `slitAt` (degrees around the hips: 0 = the front, 90 = the figure's left, -90 = the right, 180 = the back). */
export function skirt(person: Figure, H: number, build: 'slight' | 'average' | 'heavy', material: THREE.Material, options: { length?: number; flare?: number; slit?: number; slitAt?: number; drop?: number } = {}) {
  const { hipW, limb, pelvisL } = anatomy(H, build);
  const top = hipW + limb * 1.2;
  const length = options.length ?? H * 0.3;
  const slit = (options.slit ?? 0) * RAD;
  // Three's cylinder starts its sweep at +z (the front) and runs toward +x (the figure's left).
  const start = slit > 0 ? ((options.slitAt ?? 0) * RAD) + slit / 2 : 0;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, top * (options.flare ?? 1.25), length, 22, 1, true, start, Math.PI * 2 - slit), material);
  mesh.position.y = pelvisL * 0.55 - length / 2 + (options.drop ?? 0);
  mesh.castShadow = mesh.receiveShadow = true;
  person.pelvis.add(mesh);
  return mesh;
}

/** A shirt front and a tie or bow tie, on the chest. */
export function shirtFront(art: Sculpture, person: Figure, H: number, build: 'slight' | 'average' | 'heavy', options: { tie?: 'none' | 'tie' | 'bow'; tieColour?: string; shirt?: string }) {
  const { torsoL, chestR, shoulderW, limb } = anatomy(H, build);
  const sx = (shoulderW * 2) / (limb * 2.7);
  const spine = person.joints.spine;
  const white = art.material(options.shirt ?? '#f4f1ea', { roughness: 0.85 });
  const front = new THREE.Mesh(new THREE.BoxGeometry(chestR * 0.9, torsoL * 0.42, 0.008), white);
  front.position.set(0, torsoL * 0.76, chestR + 0.004);
  void sx;
  front.castShadow = true;
  spine.add(front);
  const tieMat = art.material(options.tieColour ?? '#2a2a30', { roughness: 0.6 });
  if (options.tie === 'tie') {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(chestR * 0.3, torsoL * 0.5, 0.01), tieMat);
    tie.position.set(0, torsoL * 0.66, chestR * 1.0 + 0.006);
    tie.castShadow = true;
    spine.add(tie);
  } else if (options.tie === 'bow') {
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(chestR * 0.42, chestR * 0.28, 0.02), tieMat);
      wing.position.set(side * chestR * 0.24, torsoL * 0.95, chestR * 1.0);
      spine.add(wing);
    }
    const knot = new THREE.Mesh(new THREE.BoxGeometry(chestR * 0.14, chestR * 0.18, 0.024), tieMat);
    knot.position.set(0, torsoL * 0.95, chestR * 1.0);
    spine.add(knot);
  }
}

/** A pocket square peeking from the left breast of a jacket. */
export function pocketSquare(person: Figure, H: number, build: 'slight' | 'average' | 'heavy', material: THREE.Material) {
  const { torsoL, chestR } = anatomy(H, build);
  const square = new THREE.Mesh(new THREE.BoxGeometry(chestR * 0.3, chestR * 0.12, 0.012), material);
  square.position.set(chestR * 0.72, torsoL * 0.84, chestR * 0.95);
  square.rotation.z = 0.2;
  person.joints.spine.add(square);
  return square;
}

/** A heel under a foot, turning a kit shoe into a dance shoe; attached to the ankle so it follows the foot. Tilt the planted foot about 12 degrees toe-down to stand on it. */
export function heel(person: Figure, side: Side, H: number, material: THREE.Material, height = 0.06) {
  const { limb, footL } = anatomy(H);
  const ankle = person.joints.ankles[side];
  const block = new THREE.Mesh(new THREE.CylinderGeometry(limb * 0.32, limb * 0.2, height, 8), material);
  block.position.set(0, -footL - limb * 0.95 + height * 0.45 - height / 2, -limb * 0.45);
  block.castShadow = true;
  ankle.add(block);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.05, limb * 0.12, 6, 14), material);
  strap.position.set(0, -footL * 0.3, limb * 0.2);
  strap.rotation.x = Math.PI / 2;
  ankle.add(strap);
  return block;
}

/** Hair slicked back with pomade: a tighter cap than the kit's, with a parting line. */
export function slick(person: Figure, H: number, material: THREE.Material) {
  const { headR } = anatomy(H);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.04, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), material);
  cap.position.set(0, headR * 0.12, -headR * 0.12);
  cap.scale.set(1, 0.95, 1.1);
  cap.castShadow = true;
  person.head.add(cap);
  return cap;
}

/** A thin moustache under where the nose would be. */
export function moustache(person: Figure, H: number, material: THREE.Material) {
  const { headR } = anatomy(H);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.08, headR * 0.1), material);
  hair.position.set(0, -headR * 0.28, headR * 0.95);
  person.head.add(hair);
  return hair;
}

// ---------------------------------------------------------------- café furniture and glassware

/** A bentwood café chair: round seat, hooped back, four turned legs. Stands on y = 0 at `x, z`, its back toward -z, turned by `yaw`. */
export function bentwoodChair(art: Sculpture, x: number, z: number, yaw: number, wood: THREE.Material, seatHeight = 0.45, cane?: THREE.Material) {
  const group = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P, rotate: P = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...at);
    mesh.rotation.set(...rotate);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  add(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 18), cane ?? wood, [0, seatHeight - 0.015, 0]);
  add(new THREE.TorusGeometry(0.2, 0.012, 6, 24), wood, [0, seatHeight - 0.03, 0], [Math.PI / 2, 0, 0]);
  for (const [lx, lz] of [[-0.15, 0.15], [0.15, 0.15], [-0.15, -0.15], [0.15, -0.15]] as const) {
    const leg = add(new THREE.CylinderGeometry(0.013, 0.018, seatHeight - 0.03, 8), wood, [lx * 1.05, (seatHeight - 0.03) / 2, lz * 1.05]);
    leg.rotation.set(lz > 0 ? 0.04 : -0.04, 0, lx > 0 ? -0.04 : 0.04);
  }
  add(new THREE.TorusGeometry(0.16, 0.008, 6, 20), wood, [0, seatHeight * 0.35, 0], [Math.PI / 2, 0, 0]);
  // The hooped back: an arch from the seat rim up and over.
  add(new THREE.TorusGeometry(0.18, 0.013, 8, 24, Math.PI), wood, [0, seatHeight + 0.24, -0.18]);
  for (const sx of [-0.18, 0.18]) add(new THREE.CylinderGeometry(0.013, 0.013, 0.26, 8), wood, [sx, seatHeight + 0.11, -0.18]);
  add(new THREE.TorusGeometry(0.11, 0.01, 6, 20, Math.PI), wood, [0, seatHeight + 0.2, -0.17]);
  for (const sx of [-0.11, 0.11]) add(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 8), wood, [sx, seatHeight + 0.1, -0.17]);
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  art.root.add(group);
  return group;
}

/** A small round café table with a white cloth over a cast-iron pedestal. Returns the top height. */
export function clothTable(art: Sculpture, x: number, z: number, options: { radius?: number; height?: number; cloth?: THREE.Material; iron?: THREE.Material } = {}) {
  const radius = options.radius ?? 0.36, height = options.height ?? 0.74;
  const cloth = options.cloth ?? art.material('#f3efe4', { roughness: 0.95 });
  const iron = options.iron ?? art.material('#2a2724', { roughness: 0.6, metalness: 0.3 });
  art.cylinder(radius, radius, 0.025, [x, height - 0.012, z], cloth, 28);
  const drape = art.mesh(new THREE.CylinderGeometry(radius, radius * 0.96, 0.24, 28, 1, true), cloth, [x, height - 0.14, z]);
  drape.material = cloth;
  art.cylinder(radius * 0.97, radius * 0.97, 0.03, [x, height - 0.04, z], art.material('#4a3a2e', { roughness: 0.6 }), 24);
  art.cylinder(0.03, 0.035, height - 0.08, [x, (height - 0.08) / 2, z], iron, 10);
  art.cylinder(0.2, 0.26, 0.03, [x, 0.015, z], iron, 20);
  art.cylinder(0.08, 0.14, 0.05, [x, 0.055, z], iron, 12);
  return height;
}

export const GLASS_PROFILES = {
  wine: [[0, 0], [0.032, 0], [0.032, 0.004], [0.006, 0.006], [0.005, 0.07], [0.012, 0.075], [0.034, 0.09], [0.036, 0.13], [0.03, 0.165], [0.027, 0.17]],
  flute: [[0, 0], [0.028, 0], [0.028, 0.004], [0.005, 0.006], [0.004, 0.09], [0.012, 0.095], [0.02, 0.13], [0.02, 0.22]],
  tumbler: [[0, 0], [0.03, 0], [0.028, 0.004], [0.031, 0.05], [0.034, 0.1]],
  tall: [[0, 0], [0.028, 0], [0.026, 0.004], [0.03, 0.09], [0.033, 0.17]],
} as const;

/** A stemmed or straight glass as a lathe geometry, standing on y = 0. */
export function glassGeometry(kind: keyof typeof GLASS_PROFILES) {
  return new THREE.LatheGeometry(GLASS_PROFILES[kind].map(([x, y]) => new THREE.Vector2(x, y)), 16);
}

/** A wine bottle as a lathe geometry, standing on y = 0, 0.3 m tall. */
export function bottleGeometry(height = 0.3) {
  const h = height / 0.3;
  const profile: [number, number][] = [[0, 0], [0.036, 0], [0.037, 0.004 * h], [0.037, 0.19 * h], [0.03, 0.22 * h], [0.015, 0.25 * h], [0.013, 0.29 * h], [0.014, 0.3 * h], [0, 0.3 * h]];
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 16);
}

/** A see-through material for glassware. It does not write depth, so the gate measures only the solid parts. */
export function glassMaterial(tint: THREE.ColorRepresentation = '#eef3f0', opacity = 0.35) {
  return new THREE.MeshPhysicalMaterial({ color: tint, transparent: true, opacity, roughness: 0.08, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
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
