import * as THREE from 'three';
import { type Figure, type Sculpture, visibleBounds } from '@conjure/kit';

/** Shared vocabulary for the construction-site figures: hard hats, vests, poses and steel. */
export const RAD = Math.PI / 180;
export type Side = 'left' | 'right';
export type P = [number, number, number];
export type Build = 'slight' | 'average' | 'heavy';

export interface ArmPose {
  /** Upper arm swung forward from hanging, degrees: 90 straight ahead, 180 straight up. */
  forward?: number;
  /** Upper arm swung out from the body, degrees. */
  out?: number;
  /** Elbow bend, degrees. */
  bend?: number;
  /** The bent forearm turned across the body about the upper arm, degrees; negative turns it outward. */
  across?: number;
}
export interface LegPose {
  /** Thigh swung forward, degrees: 90 is sitting. */
  forward?: number;
  out?: number;
  /** Knee bend, degrees. */
  knee?: number;
  /** Ankle pitch in degrees (positive points the toes down), or 'flat' to keep the sole level. */
  foot?: number | 'flat';
}

export function arm(person: Figure, side: Side, pose: ArmPose) {
  const sign = side === 'left' ? 1 : -1;
  const shoulder = person.joints.shoulders[side], elbow = person.joints.elbows[side];
  if (pose.forward !== undefined) shoulder.rotation.x = -pose.forward * RAD;
  if (pose.out !== undefined) shoulder.rotation.z = sign * pose.out * RAD;
  if (pose.bend !== undefined) elbow.rotation.x = -pose.bend * RAD;
  if (pose.across !== undefined) elbow.rotation.y = -sign * pose.across * RAD;
}

export function leg(person: Figure, side: Side, pose: LegPose) {
  const sign = side === 'left' ? 1 : -1;
  const hip = person.joints.hips[side], knee = person.joints.knees[side], ankle = person.joints.ankles[side];
  if (pose.forward !== undefined) hip.rotation.x = -pose.forward * RAD;
  if (pose.out !== undefined) hip.rotation.z = sign * pose.out * RAD;
  if (pose.knee !== undefined) knee.rotation.x = pose.knee * RAD;
  ankle.rotation.x = pose.foot === undefined || pose.foot === 'flat' ? -(knee.rotation.x + hip.rotation.x) : -(knee.rotation.x + hip.rotation.x) + pose.foot * RAD;
}

/** Head pitch (down positive) and yaw (to the figure's left positive), degrees. */
export function look(person: Figure, pitch: number, yaw = 0) {
  person.joints.neck.rotation.set(pitch * RAD, yaw * RAD, 0);
}
/** Bend at the waist, degrees forward. */
export const bow = (person: Figure, degrees: number) => { person.joints.spine.rotation.x = degrees * RAD; };
/** Tip the whole body forward about the ground, degrees. */
export const lean = (person: Figure, degrees: number) => { person.joints.body.rotation.x = degrees * RAD; };

/** World position of a node, in the sculpture's frame. */
export const worldOf = (node: THREE.Object3D) => {
  node.updateWorldMatrix(true, false);
  return node.getWorldPosition(new THREE.Vector3());
};

/** Put the figure's lowest point back on y = 0 without moving it sideways. */
export function drop(person: Figure, floor = 0) {
  person.root.updateMatrixWorld(true);
  const bounds = visibleBounds(person.root);
  if (!bounds.isEmpty()) person.root.position.y += floor - bounds.min.y;
  person.root.updateMatrixWorld(true);
}

export const SKINS = ['#f1d2b6', '#dfb48f', '#c58f62', '#a6714b', '#7a4f33', '#5a3a28'] as const;
export const pickSkin = (random: () => number) => SKINS[Math.floor(random() * SKINS.length)];
export const pick = <T>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)];

export const HAT_COLOURS = { white: '#f2f1ea', yellow: '#f5c614', orange: '#f07a1a', blue: '#2c5fb8', red: '#c8302a', green: '#2f8a4a', black: '#2a2a2c' } as const;
export const VEST_COLOURS = { orange: '#ff7a14', yellow: '#f0ff2a', lime: '#b8ff3a', none: '' } as const;

/** A hard hat on the figure's head: dome, rim, peak and a centre ridge. Tilt in degrees, positive tips it back. */
export function hardHat(art: Sculpture, person: Figure, H: number, colour: string, options: { tilt?: number; scale?: number; turn?: number } = {}) {
  const headR = H * 0.064;
  const group = new THREE.Group();
  const shell = art.material(colour, { roughness: 0.35 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.16, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), shell);
  dome.position.y = headR * 0.36;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.34, headR * 1.4, headR * 0.08, 24), shell);
  rim.position.y = headR * 0.38;
  const peak = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.2, headR * 0.08, headR * 0.7), shell);
  peak.position.set(0, headR * 0.38, headR * 1.4);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.26, headR * 0.12, headR * 1.7), shell);
  ridge.position.y = headR * 1.45;
  for (const mesh of [dome, rim, peak, ridge]) { mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); }
  group.scale.setScalar(options.scale ?? 1);
  group.rotation.set(-(options.tilt ?? 0) * RAD, (options.turn ?? 0) * RAD, 0);
  person.head.add(group);
  return group;
}

/** A hi-vis vest over the torso, with two reflective bands. */
export function vest(art: Sculpture, person: Figure, H: number, build: Build, colour: string) {
  const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
  const limb = H * 0.036 * wide, torsoL = H * 0.28;
  const r = limb * 1.35 * (build === 'heavy' ? 1.25 : 1);
  const spine = person.joints.spine;
  const torso = spine.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh | undefined;
  const stretch = torso?.scale.x ?? 1;
  const cloth = art.material(colour, { roughness: 0.85, emissive: colour, emissiveIntensity: 0.1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(r * 1.08, Math.max(0.01, torsoL * 0.84 - limb * 2.7), 4, 14), cloth);
  body.position.y = torsoL * 0.47;
  body.scale.x = stretch * 1.04;
  body.castShadow = body.receiveShadow = true;
  spine.add(body);
  const silver = art.material('#d6dadc', { roughness: 0.3, metalness: 0.3, emissive: '#9aa0a4', emissiveIntensity: 0.15 });
  for (const y of [torsoL * 0.26, torsoL * 0.46]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(r * 1.1, 0.008, 6, 28), silver);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    band.scale.x = stretch * 1.04;
    band.castShadow = true;
    spine.add(band);
  }
  return body;
}

/** A fall-arrest harness: shoulder straps, a waist belt and a D-ring between the shoulder blades. Returns the D-ring node. */
export function harness(art: Sculpture, person: Figure, H: number, build: Build, colour = '#2a3a8a') {
  const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
  const limb = H * 0.036 * wide, torsoL = H * 0.28, shoulderW = H * 0.115 * wide;
  const r = limb * 1.35 * (build === 'heavy' ? 1.25 : 1);
  const spine = person.joints.spine;
  const torso = spine.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh | undefined;
  const stretch = torso?.scale.x ?? 1;
  const webbing = art.material(colour, { roughness: 0.9 });
  for (const sign of [-1, 1]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.035, torsoL * 0.8, 0.012), webbing);
    strap.position.set(sign * shoulderW * 0.45, torsoL * 0.55, r + 0.004);
    strap.rotation.z = sign * 0.12;
    strap.castShadow = true;
    spine.add(strap);
    const back = strap.clone();
    back.position.z = -r - 0.004;
    back.rotation.z = -sign * 0.25;
    spine.add(back);
  }
  const belt = new THREE.Mesh(new THREE.TorusGeometry(r * 1.06, 0.012, 6, 28), webbing);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = torsoL * 0.16;
  belt.scale.x = stretch * 1.02;
  spine.add(belt);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16), art.material('#b9bec2', { metalness: 0.8, roughness: 0.3 }));
  ring.position.set(0, torsoL * 0.78, -r - 0.012);
  ring.castShadow = true;
  spine.add(ring);
  return ring;
}

/** Work boots: a darker, chunkier foot and a short shaft above the ankle. */
export function boots(art: Sculpture, person: Figure, H: number, colour = '#5a4030') {
  const leather = art.material(colour, { roughness: 0.8 });
  for (const side of ['left', 'right'] as const) {
    const ankle = person.joints.ankles[side];
    const foot = ankle.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh | undefined;
    if (foot) foot.material = leather;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.036 * 1.02, H * 0.036 * 1.08, H * 0.05, 10), leather);
    shaft.position.y = H * 0.01;
    shaft.castShadow = true;
    ankle.add(shaft);
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

/** An I-beam section extruded along z and centred, metres. */
export function beamGeometry(length: number, depth = 0.3, flange = 0.25, tf = 0.025, tw = 0.018) {
  const shape = new THREE.Shape();
  const hw = flange / 2, hd = depth / 2, ht = tw / 2;
  shape.moveTo(-hw, -hd);
  shape.lineTo(hw, -hd);
  shape.lineTo(hw, -hd + tf);
  shape.lineTo(ht, -hd + tf);
  shape.lineTo(ht, hd - tf);
  shape.lineTo(hw, hd - tf);
  shape.lineTo(hw, hd);
  shape.lineTo(-hw, hd);
  shape.lineTo(-hw, hd - tf);
  shape.lineTo(-ht, hd - tf);
  shape.lineTo(-ht, -hd + tf);
  shape.lineTo(-hw, -hd + tf);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geometry.translate(0, 0, -length / 2);
  return geometry;
}

/** The steel finishes a site beam comes in. */
export const STEEL = {
  primer: { colour: '#9a4a3c', roughness: 0.75, metalness: 0.15 },
  grey: { colour: '#8d9296', roughness: 0.7, metalness: 0.2 },
  rust: { colour: '#7a4a2e', roughness: 0.95, metalness: 0.05 },
  galvanised: { colour: '#b4bbbf', roughness: 0.45, metalness: 0.6 },
} as const;
