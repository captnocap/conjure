import * as THREE from 'three';
import type { Figure, Sculpture } from '@conjure/kit';

export const RAD = Math.PI / 180;
export type Side = 'left' | 'right';

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
      // A bent forearm swings about the elbow's y: toward +x for positive y, and +x is the figure's left.
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

/** Where a figure attachment sits in the sculpture's space right now. */
export function at(art: Sculpture, node: THREE.Object3D) {
  art.root.updateMatrixWorld(true);
  return art.root.worldToLocal(node.getWorldPosition(new THREE.Vector3()));
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

/**
 * A robe, skirt or coat hem: an open cone hung from a point on the figure, so a cassock, a gown
 * or a raincoat reads as cloth rather than as trousers. Returns the mesh for further tilting.
 */
export function hem(art: Sculpture, material: THREE.Material, top: THREE.Vector3, topRadius: number, bottomRadius: number, length: number, depth = 1) {
  const cone = art.mesh(new THREE.CylinderGeometry(topRadius, bottomRadius, length, 20, 1, true), material, [top.x, top.y - length / 2, top.z]);
  cone.scale.z = depth;
  return cone;
}

export const SKINS = ['#f1d2b6', '#e3c2a4', '#dfb48f', '#c58f62', '#a6714b', '#7a4f33', '#5a3a28'] as const;
export const pickSkin = (random: () => number) => SKINS[Math.floor(random() * SKINS.length)];
export const pick = <T>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)];
