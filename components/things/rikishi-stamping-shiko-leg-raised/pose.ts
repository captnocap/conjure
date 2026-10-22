import * as THREE from 'three';
import type { Figure, Sculpture } from '@conjure/kit';

export const RAD = Math.PI / 180;
export type Side = 'left' | 'right';
export type P = [number, number, number];
export type Build = 'slight' | 'average' | 'heavy';

export const SKINS = ['#ecc9a6', '#e2b892', '#d6a67c', '#c8956c', '#b8835e'] as const;
export const pick = <T>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)];
export const pickSkin = (random: () => number) => pick(random, SKINS);

export const BELTS = {
  black: 'Black cotton, the practice belt of the lower ranks.',
  white: 'White cotton: a ranked man, a sekitori.',
  navy: 'Dark navy blue.',
  olive: 'Faded olive drab, washed a thousand times.',
  maroon: 'Deep maroon.',
} as const;
export const BELT_COLOUR: Record<keyof typeof BELTS, string> = { black: '#1b1b1e', white: '#ebe7dc', navy: '#1e2a4a', olive: '#5d6244', maroon: '#5a1f26' };

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
    /** Whole-body lean about the ground: forward positive, and a sideways roll (positive tips the top toward the figure's right). */
    lean(forward: number, roll = 0) { joints.body.rotation.x = forward * RAD; joints.body.rotation.z = roll * RAD; },
    /** Bend at the waist, degrees forward, with an optional sideways tip and twist. */
    bow(forward: number, tip = 0, twist = 0) { joints.spine.rotation.set(forward * RAD, twist * RAD, tip * RAD); },
    /** Head pitch (down positive), yaw (to the figure's left positive) and a sideways tilt, degrees. */
    look(pitch: number, yaw = 0, tilt = 0) { joints.neck.rotation.set(pitch * RAD, yaw * RAD, tilt * RAD); },
  };
}

/**
 * Two-bone reach: turn one arm so its palm lands on a world-space point. `swivel` (radians)
 * turns the elbow round the shoulder-to-target line; `grip` is how far along the hand the
 * target sits (0 wrist, 1 fingertips).
 */
export function reach(person: Figure, side: Side, target: THREE.Vector3, swivel = 0, grip = 0.5) {
  const shoulder = person.joints.shoulders[side], elbow = person.joints.elbows[side];
  const wrist = person.hands[side].parent!;
  const upper = -elbow.position.y, fore = -wrist.position.y - person.hands[side].position.y * grip;
  const parent = shoulder.parent!;
  parent.updateWorldMatrix(true, false);
  const local = parent.worldToLocal(target.clone()).sub(shoulder.position);
  const d = Math.min(Math.max(local.length(), Math.abs(upper - fore) + 0.01), (upper + fore) * 0.985);
  const bend = Math.PI - Math.acos(Math.min(1, Math.max(-1, (upper * upper + fore * fore - d * d) / (2 * upper * fore))));
  const rest = new THREE.Vector3(0, -upper - fore * Math.cos(bend), fore * Math.sin(bend)).normalize();
  const dir = local.clone().normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(rest, dir);
  if (swivel) q.premultiply(new THREE.Quaternion().setFromAxisAngle(dir, swivel));
  shoulder.quaternion.copy(q);
  elbow.rotation.set(-bend, 0, 0);
}

/** Where a figure attachment sits in the sculpture's space right now. */
export function at(art: Sculpture, node: THREE.Object3D) {
  art.root.updateMatrixWorld(true);
  return art.root.worldToLocal(node.getWorldPosition(new THREE.Vector3()));
}

/** The figure's limb radius, hip half-width and pelvis length, as the kit derives them. */
export function sizes(H: number, build: Build) {
  const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
  return { limb: H * 0.036 * wide, hipW: H * 0.075 * wide, pelvisL: H * 0.07, torsoL: H * 0.28, headR: H * 0.064, wide };
}

/** A wrestler's belly: a ball hung from the spine below the chest. */
export function belly(person: Figure, H: number, material: THREE.Material, size = 1) {
  const r = H * 0.1 * size;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), material);
  ball.scale.set(1.35, 0.95, 0.9);
  ball.position.set(0, H * 0.075, H * 0.045);
  ball.castShadow = ball.receiveShadow = true;
  person.joints.spine.add(ball);
  return ball;
}

/** A mawashi wrapped round the hips: the thick band, the knot at the back and the strip in front. */
export function mawashi(art: Sculpture, person: Figure, H: number, build: Build, colour: string) {
  const { limb, hipW, pelvisL } = sizes(H, build);
  const cloth = art.material(colour, { roughness: 0.85 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 28), cloth);
  band.scale.set(hipW * 1.55, pelvisL * 1.7, limb * 2.1);
  band.position.set(0, -pelvisL * 0.15, limb * 0.2);
  const knot = new THREE.Mesh(new THREE.BoxGeometry(hipW * 0.9, pelvisL * 1.0, limb * 1.2), cloth);
  knot.position.set(0, -pelvisL * 0.1, -limb * 2.4);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(hipW * 0.55, pelvisL * 1.5, limb * 0.3), cloth);
  strip.position.set(0, -pelvisL * 1.2, limb * 2.0);
  for (const mesh of [band, knot, strip]) {
    mesh.castShadow = mesh.receiveShadow = true;
    person.pelvis.add(mesh);
  }
  return cloth;
}

export type Hairdo = 'chonmage' | 'oicho' | 'cropped' | 'loose';
/** Finish the kit's hair as a sumo topknot: oiled cap plus the folded knot, the formal fan, or left as cropped stubble. */
export function hairdo(art: Sculpture, person: Figure, H: number, style: Hairdo, colour = '#1a1512') {
  const { headR } = sizes(H, 'average');
  const oiled = art.material(colour, { roughness: 0.3 });
  person.head.traverse((node) => {
    const mesh = node as THREE.Mesh;
    const params = (mesh.geometry as THREE.SphereGeometry | undefined)?.parameters as { thetaLength?: number; radius?: number } | undefined;
    if (!mesh.isMesh || !params || params.thetaLength === undefined || params.thetaLength >= Math.PI || (params.radius ?? 1) < headR * 0.5) return;
    if (style === 'cropped') (mesh.material as THREE.MeshStandardMaterial).roughness = 0.95;
    else mesh.material = oiled;
  });
  if (style === 'chonmage' || style === 'oicho') {
    const knot = new THREE.Mesh(new THREE.CapsuleGeometry(headR * 0.2, headR * 0.75, 3, 8), oiled);
    knot.rotation.x = Math.PI / 2 - 0.3;
    knot.position.set(0, headR * 1.12, headR * 0.05);
    knot.castShadow = true;
    person.head.add(knot);
  }
  if (style === 'oicho') {
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.62, headR * 0.62, headR * 0.14, 18, 1, false, 0, Math.PI), oiled);
    fan.rotation.set(Math.PI / 2 - 0.5, 0, 0);
    fan.position.set(0, headR * 1.05, -headR * 0.45);
    fan.castShadow = true;
    person.head.add(fan);
  }
}

/** Set the roughness of every skin-coloured surface: low for a sweat sheen. */
export function sheen(art: Sculpture, person: Figure, skin: string, roughness: number) {
  const tinted = art.material(skin).color.getHex();
  person.root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (material.color?.getHex() === tinted) material.roughness = roughness;
  });
}

/** Sit a figure cross-legged: thighs out and forward, shins folded in front. Call settle() afterwards. */
export function sitCrossLegged(person: Figure, spread = 52) {
  for (const side of ['left', 'right'] as const) {
    const sign = side === 'left' ? 1 : -1;
    const { hips, knees, ankles } = person.joints;
    hips[side].rotation.set(-(side === 'left' ? 78 : 72) * RAD, 0, sign * spread * RAD);
    knees[side].rotation.set(0, 0, -sign * 128 * RAD);
    ankles[side].rotation.set(-60 * RAD, 0, 0);
  }
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

/** A folded white towel on the ground, with one end rolled. */
export function towel(art: Sculpture, atPoint: P, colour: string, turn: number) {
  const cloth = art.material(colour, { roughness: 0.95 });
  const group = new THREE.Group();
  const fold = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.19), cloth);
  fold.position.y = 0.0175;
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.19, 12), cloth);
  roll.rotation.x = Math.PI / 2;
  roll.position.set(0.17, 0.04, 0);
  for (const mesh of [fold, roll]) mesh.castShadow = mesh.receiveShadow = true;
  group.add(fold, roll);
  group.position.set(...atPoint);
  group.rotation.y = turn;
  art.root.add(group);
  return group;
}
