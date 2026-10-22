import * as THREE from 'three';
import { type Figure, visibleBounds } from '@conjure/kit';

export const RAD = Math.PI / 180;
export type Side = 'left' | 'right';
export type P = [number, number, number];

const groups = (node: THREE.Object3D) => node.children.filter((child): child is THREE.Group => (child as THREE.Group).isGroup);

export interface ArmPose {
  /** Upper arm swung forward from hanging, degrees; negative swings it back. */
  forward?: number;
  /** Upper arm swung out from the body, degrees; negative crosses it inward. */
  out?: number;
  /** Elbow bend, degrees. */
  bend?: number;
  /** Bent forearm swung inward across the body, degrees. */
  across?: number;
}
export interface LegPose {
  forward?: number;
  out?: number;
  knee?: number;
  /** Ankle angle in degrees, or 'flat' to keep the sole level with the ground. */
  foot?: number | 'flat';
}

/** Joint handles for a kit figure, so a pose can go beyond the stock set. Angles in degrees. */
export function rig(person: Figure) {
  const body = person.root.children[0];
  const [spine, hipL, hipR] = groups(person.pelvis);
  const [neck] = groups(spine);
  const sign = (side: Side) => (side === 'left' ? 1 : -1);
  const legOf = (side: Side) => {
    const hip = side === 'left' ? hipL : hipR;
    const [knee] = groups(hip);
    const [ankle] = groups(knee);
    return { hip, knee, ankle };
  };
  return {
    body, spine, neck,
    arm(side: Side, pose: ArmPose) {
      const wrist = person.hands[side].parent!, elbow = wrist.parent!, shoulder = elbow.parent!;
      elbow.rotation.order = 'YXZ';
      if (pose.forward !== undefined) shoulder.rotation.x = -pose.forward * RAD;
      if (pose.out !== undefined) shoulder.rotation.z = sign(side) * pose.out * RAD;
      if (pose.bend !== undefined) elbow.rotation.x = -pose.bend * RAD;
      if (pose.across !== undefined) elbow.rotation.y = -sign(side) * pose.across * RAD;
    },
    leg(side: Side, pose: LegPose) {
      const { hip, knee, ankle } = legOf(side);
      if (pose.forward !== undefined) hip.rotation.x = -pose.forward * RAD;
      if (pose.out !== undefined) hip.rotation.z = sign(side) * pose.out * RAD;
      if (pose.knee !== undefined) knee.rotation.x = pose.knee * RAD;
      ankle.rotation.x = pose.foot === undefined || pose.foot === 'flat' ? -(knee.rotation.x + hip.rotation.x) : pose.foot * RAD;
    },
    /** The shoe mesh of one foot, for odd boots and sandals. */
    foot(side: Side) { return legOf(side).ankle.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh; },
    /** Whole-body lean forward about the feet, degrees. */
    lean(degrees: number) { body.rotation.x = degrees * RAD; },
    /** Whole-body roll to the figure's left, degrees: weight on one hip. */
    roll(degrees: number) { body.rotation.z = degrees * RAD; },
    /** Bend at the waist, degrees forward. */
    bow(degrees: number) { spine.rotation.x = degrees * RAD; },
    /** Head pitch (down positive) and yaw (to the figure's left positive), degrees. */
    look(pitch: number, yaw = 0) { neck.rotation.x = pitch * RAD; neck.rotation.y = yaw * RAD; },
    /** After reposing or turning, put the lowest point on the ground again, under the root. */
    settle(centre = true) {
      person.root.updateMatrixWorld(true);
      const bounds = visibleBounds(person.root);
      if (bounds.isEmpty()) return;
      const mid = bounds.getCenter(new THREE.Vector3());
      const at = person.root.position;
      if (centre) { at.x += at.x - mid.x; at.z += at.z - mid.z; }
      at.y -= bounds.min.y;
      person.root.updateMatrixWorld(true);
    },
  };
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

/** World position of a figure attachment, in the sculpture's frame. */
export const worldOf = (node: THREE.Object3D) => {
  node.updateWorldMatrix(true, false);
  return node.getWorldPosition(new THREE.Vector3());
};

export const SKINS = ['#f1d2b6', '#dfb48f', '#c58f62', '#a6714b', '#7a4f33', '#5a3a28'] as const;
export const pickSkin = (random: () => number) => SKINS[Math.floor(random() * SKINS.length)];
export const pick = <T>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)];

/** A knitted beanie pulled down over the head, with a rolled brim. */
export function beanie(person: Figure, material: THREE.Material, headR: number) {
  const crown = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.14, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), material);
  crown.position.y = headR * 0.08;
  crown.scale.y = 1.15;
  const brim = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.1, headR * 0.16, 8, 24), material);
  brim.rotation.x = Math.PI / 2;
  brim.position.y = headR * 0.12;
  crown.castShadow = brim.castShadow = true;
  person.head.add(crown, brim);
}

/** A headscarf: a close cap over the hair and a drape falling to the shoulders behind. */
export function headscarf(person: Figure, material: THREE.Material, headR: number) {
  const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 16, 10, Math.PI * 0.9, Math.PI * 1.2, 0, Math.PI * 0.62), material);
  cap.position.y = headR * 0.05;
  cap.scale.y = 1.12;
  const drape = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.95, headR * 1.5, headR * 2.2, 14, 1, true), material);
  drape.position.set(0, -headR * 0.9, -headR * 0.35);
  cap.castShadow = drape.castShadow = true;
  person.head.add(cap, drape);
}
