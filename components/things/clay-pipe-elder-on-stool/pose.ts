import * as THREE from 'three';
import { type Figure, visibleBounds } from '@conjure/kit';

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
  /** Swings the upper arm away from the body, degrees. */
  out?: number;
  /** Folds the elbow, degrees. */
  bend?: number;
  /** Turns the forearm across the chest, degrees. Applied before the bend. */
  inward?: number;
}
export function poseArm(person: Figure, side: Side, pose: ArmPose) {
  const { shoulder, elbow } = joints(person, side);
  const sign = side === 'left' ? 1 : -1;
  shoulder.rotation.set(-(pose.forward ?? 0) * RAD, 0, sign * (pose.out ?? 0) * RAD);
  elbow.rotation.set(-(pose.bend ?? 0) * RAD, 0, -sign * (pose.inward ?? 0) * RAD);
}

export interface LegPose {
  /** Lifts the thigh toward the front, degrees: 90 is sitting. */
  forward?: number;
  out?: number;
  /** Folds the knee, degrees. */
  knee?: number;
}
export function poseLeg(person: Figure, side: Side, pose: LegPose) {
  const { hip, knee, ankle } = joints(person, side);
  const sign = side === 'left' ? 1 : -1;
  hip.rotation.set(-(pose.forward ?? 0) * RAD, 0, sign * (pose.out ?? 0) * RAD);
  knee.rotation.x = (pose.knee ?? 0) * RAD;
  ankle.rotation.x = -(knee.rotation.x + hip.rotation.x);
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
