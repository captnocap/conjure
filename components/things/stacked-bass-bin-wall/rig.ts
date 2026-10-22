import * as THREE from 'three';
import { type Figure, type Sculpture, visibleBounds } from '@conjure/kit';

export const RAD = Math.PI / 180;
export type Side = 'left' | 'right';

const groups = (node: THREE.Object3D) => node.children.filter((child): child is THREE.Group => (child as THREE.Group).isGroup);

export interface ArmPose {
  /** Upper arm swung forward from hanging, degrees; negative swings it back. */
  forward?: number;
  /** Upper arm swung out from the body, degrees; negative crosses it inward. */
  out?: number;
  /** Elbow bend, degrees. */
  bend?: number;
  /** Forearm swung inward across the body, degrees. */
  across?: number;
}
export interface LegPose {
  forward?: number;
  out?: number;
  knee?: number;
  /** Ankle angle in degrees, or 'flat' to keep the sole level with the ground. */
  foot?: number | 'flat';
}

/**
 * Joint handles for a kit figure, so a pose can go beyond the stock set. Angles in degrees,
 * outward and forward positive. Copied from the people wave; the kit exposes the same joints.
 */
export function rig(person: Figure) {
  const body = person.root.children[0];
  const [spine, hipL, hipR] = groups(person.pelvis);
  const [neck] = groups(spine);
  const sign = (side: Side) => (side === 'left' ? 1 : -1);
  return {
    body, spine, neck,
    arm(side: Side, pose: ArmPose) {
      const wrist = person.hands[side].parent!, elbow = wrist.parent!, shoulder = elbow.parent!;
      if (pose.forward !== undefined) shoulder.rotation.x = -pose.forward * RAD;
      if (pose.out !== undefined) shoulder.rotation.z = sign(side) * pose.out * RAD;
      if (pose.bend !== undefined) elbow.rotation.x = -pose.bend * RAD;
      if (pose.across !== undefined) elbow.rotation.y = sign(side) * pose.across * RAD;
    },
    leg(side: Side, pose: LegPose) {
      const hip = side === 'left' ? hipL : hipR;
      const [knee] = groups(hip);
      const [ankle] = groups(knee);
      if (pose.forward !== undefined) hip.rotation.x = -pose.forward * RAD;
      if (pose.out !== undefined) hip.rotation.z = sign(side) * pose.out * RAD;
      if (pose.knee !== undefined) knee.rotation.x = pose.knee * RAD;
      ankle.rotation.x = pose.foot === undefined || pose.foot === 'flat' ? -(knee.rotation.x + hip.rotation.x) : pose.foot * RAD;
    },
    /** Whole-body lean forward about the ground, degrees. */
    lean(degrees: number) { body.rotation.x = degrees * RAD; },
    /** Whole-body tilt sideways, degrees; positive tips the head toward the figure's right. */
    tilt(degrees: number) { body.rotation.z = -degrees * RAD; },
    /** Bend at the waist, degrees forward. */
    bow(degrees: number) { spine.rotation.x = degrees * RAD; },
    /** Head pitch (down positive), yaw (to the figure's left positive) and roll, degrees. */
    look(pitch: number, yaw = 0, roll = 0) { neck.rotation.set(pitch * RAD, yaw * RAD, roll * RAD); },
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
export function paint(width: number, height: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
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

/** Move a figure so that its pelvis joint sits at a point: a seat, a ledge, the top of a stack. */
export function seat(person: Figure, x: number, y: number, z: number) {
  person.root.updateMatrixWorld(true);
  const pelvis = worldOf(person.pelvis);
  const root = person.root.getWorldPosition(new THREE.Vector3());
  person.root.position.set(person.root.position.x + x - pelvis.x + (pelvis.x - root.x) * 0, person.root.position.y + y - pelvis.y, person.root.position.z + z - pelvis.z);
  person.root.updateMatrixWorld(true);
}

export const SKINS = ['#f1d2b6', '#dfb48f', '#c58f62', '#a6714b', '#7a4f33', '#5a3a28'] as const;
export const pickSkin = (random: () => number) => SKINS[Math.floor(random() * SKINS.length)];
export const pick = <T>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)];

/** A self-lit material that prints well: colour and emissive together. */
export const glow = (color: THREE.ColorRepresentation, intensity = 1.2, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, ...extra });

/** A see-through light volume: additive, never written to depth, so it is not measured as solid. */
export const beam = (color: THREE.ColorRepresentation, opacity = 0.35) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

/** A bucket hat on a figure's head: a short crown and a sloping brim. */
export function bucketHat(art: Sculpture, person: Figure, headR: number, color: THREE.ColorRepresentation) {
  const cloth = art.material(color, { roughness: 0.95 });
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.98, headR * 1.08, headR * 0.95, 20), cloth);
  crown.position.y = headR * 0.7;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.1, headR * 1.62, headR * 0.28, 20, 1, true), cloth);
  brim.position.y = headR * 0.3;
  cloth.side = THREE.DoubleSide;
  crown.castShadow = brim.castShadow = true;
  person.head.add(crown, brim);
}
