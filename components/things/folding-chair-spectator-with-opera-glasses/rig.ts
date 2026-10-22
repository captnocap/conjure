import * as THREE from 'three';
import { type Figure, type Sculpture, visibleBounds } from '@conjure/kit';

export const RAD = Math.PI / 180;
export type Side = 'left' | 'right';

export interface ArmPose {
  /** Upper arm swung forward from hanging, degrees; 90 is straight out ahead, negative swings it back. */
  forward?: number;
  /** Upper arm swung out from the body, degrees; negative crosses it inward. */
  out?: number;
  /** Elbow bend, degrees. */
  bend?: number;
  /** The bent forearm swung across the body, degrees; negative swings it away. */
  across?: number;
}
export interface LegPose {
  forward?: number;
  out?: number;
  knee?: number;
  /** Ankle angle in degrees, or 'flat' to keep the sole level with the ground. */
  foot?: number | 'flat';
}

/** Joint handles for a kit figure, so a pose can go beyond the stock set. Angles in degrees, outward and forward positive. */
export function rig(person: Figure) {
  const { joints } = person;
  const sign = (side: Side) => (side === 'left' ? 1 : -1);
  return {
    arm(side: Side, pose: ArmPose) {
      const shoulder = joints.shoulders[side], elbow = joints.elbows[side];
      if (pose.forward !== undefined) shoulder.rotation.x = -pose.forward * RAD;
      if (pose.out !== undefined) shoulder.rotation.z = sign(side) * pose.out * RAD;
      if (pose.bend !== undefined) elbow.rotation.x = -pose.bend * RAD;
      // The kit's elbow y swings a right forearm inward for positive angles, so flip it for the left.
      if (pose.across !== undefined) elbow.rotation.y = -sign(side) * pose.across * RAD;
    },
    leg(side: Side, pose: LegPose) {
      const hip = joints.hips[side], knee = joints.knees[side], ankle = joints.ankles[side];
      if (pose.forward !== undefined) hip.rotation.x = -pose.forward * RAD;
      if (pose.out !== undefined) hip.rotation.z = sign(side) * pose.out * RAD;
      if (pose.knee !== undefined) knee.rotation.x = pose.knee * RAD;
      ankle.rotation.x = pose.foot === undefined || pose.foot === 'flat' ? -(knee.rotation.x + hip.rotation.x) : pose.foot * RAD;
    },
    /** Whole-body lean forward about the feet, degrees. */
    lean(degrees: number, roll = 0) { joints.body.rotation.x = degrees * RAD; joints.body.rotation.z = roll * RAD; },
    /** Bend at the waist: forward degrees, and a sideways tilt toward the figure's left. */
    bow(degrees: number, tilt = 0) { joints.spine.rotation.x = degrees * RAD; joints.spine.rotation.z = tilt * RAD; },
    /** Head pitch (down positive), yaw (to the figure's left positive) and roll (ear toward the left shoulder positive), degrees. */
    look(pitch: number, yaw = 0, roll = 0) { joints.neck.rotation.set(pitch * RAD, yaw * RAD, roll * RAD); },
    /** After reposing or turning: the lowest point back on the ground, the bounds centred under the root when asked. */
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

/** World position of a figure attachment, in the sculpture's frame. */
export const worldOf = (node: THREE.Object3D) => {
  node.updateWorldMatrix(true, false);
  return node.getWorldPosition(new THREE.Vector3());
};

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

/** A contestant's number on a card, pinned to the back of a figure's torso (or its chest with `front`). */
export function numberCard(s: Sculpture, person: Figure, H: number, number: string, front = false, heavy = false) {
  const texture = paint(128, 96, (c) => {
    c.fillStyle = '#ece4cf';
    c.fillRect(0, 0, 128, 96);
    c.fillStyle = '#d8cfb6';
    c.fillRect(0, 0, 128, 4);
    c.fillRect(0, 92, 128, 4);
    c.fillStyle = '#1e1c1a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `bold ${number.length > 2 ? 58 : 70}px sans-serif`;
    c.fillText(number, 64, 52);
    c.fillStyle = '#7a7a7a';
    for (const x of [12, 116]) { c.beginPath(); c.arc(x, 12, 4, 0, Math.PI * 2); c.fill(); }
  });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.1 * H, 0.075 * H), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }));
  const limb = H * 0.036;
  card.position.set(0, H * 0.28 * 0.62, (front ? 1 : -1) * (limb * 1.35 * (heavy ? 1.25 : 1) + 0.008));
  card.rotation.y = front ? 0 : Math.PI;
  card.rotation.z = (s.context.random() - 0.5) * 0.16;
  card.castShadow = true;
  person.joints.spine.add(card);
  return card;
}

export const SKINS = ['#f1d2b6', '#dfb48f', '#c58f62', '#a6714b', '#7a4f33'] as const;
export const pickSkin = (random: () => number) => SKINS[Math.floor(random() * SKINS.length)];
