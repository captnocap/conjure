import * as THREE from 'three';
import type { Figure } from '@conjure/kit';

const RAD = Math.PI / 180;
export type Side = 'left' | 'right';

export interface ArmPose {
  /** Lifts the upper arm toward the front, degrees: 90 is straight out ahead, 180 straight up. */
  forward?: number;
  /** Swings the upper arm away from the body, degrees. */
  out?: number;
  /** Folds the elbow, degrees. */
  bend?: number;
  /** Turns the bent forearm about the upper arm, degrees. Positive swings a hanging left forearm outward; mirrored for the right arm. */
  swing?: number;
}
export function armPose(person: Figure, side: Side, pose: ArmPose) {
  const sign = side === 'left' ? 1 : -1;
  const shoulder = person.joints.shoulders[side], elbow = person.joints.elbows[side];
  shoulder.rotation.set(-(pose.forward ?? 0) * RAD, 0, sign * (pose.out ?? 0) * RAD);
  elbow.rotation.set(-(pose.bend ?? 0) * RAD, sign * (pose.swing ?? 0) * RAD, 0);
}

export interface LegPose {
  /** Lifts the thigh toward the front, degrees: 90 is sitting. */
  forward?: number;
  out?: number;
  /** Folds the knee, degrees. */
  knee?: number;
  /** Keep the sole level with the ground (default) or let the foot follow the shin. */
  flat?: boolean;
}
export function legPose(person: Figure, side: Side, pose: LegPose) {
  const sign = side === 'left' ? 1 : -1;
  const { hips, knees, ankles } = person.joints;
  hips[side].rotation.set(-(pose.forward ?? 0) * RAD, 0, sign * (pose.out ?? 0) * RAD);
  knees[side].rotation.x = (pose.knee ?? 0) * RAD;
  ankles[side].rotation.x = pose.flat === false ? 0 : -(knees[side].rotation.x + hips[side].rotation.x);
}

/**
 * Turn a limb joint so the limb (hanging along its local -y) runs along `direction`, with its
 * bend axis (local x) as near as possible to `axis`. Both vectors are in the joint's parent space.
 */
export function aim(joint: THREE.Object3D, direction: THREE.Vector3, axis: THREE.Vector3) {
  const y = direction.clone().normalize().negate();
  const x = axis.clone().sub(y.clone().multiplyScalar(axis.dot(y))).normalize();
  const z = new THREE.Vector3().crossVectors(x, y);
  joint.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/** Where a joint or attachment sits in the sculpture's space right now. */
export function at(node: THREE.Object3D) {
  node.updateWorldMatrix(true, false);
  return node.getWorldPosition(new THREE.Vector3());
}

/** The limb segment a joint group holds directly. */
export function segmentOf(joint: THREE.Object3D) {
  return joint.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh;
}

/** A rolled cuff of cloth around a limb just below its joint: a rolled sleeve or trouser leg. */
export function cuff(joint: THREE.Object3D, radius: number, material: THREE.Material, drop = 0.02) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.38, 8, 20), material);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -drop;
  ring.castShadow = true;
  joint.add(ring);
  return ring;
}

/** A soft crocheted or knitted prayer cap sitting on the crown of the head. */
export function skullcap(head: THREE.Object3D, headR: number, material: THREE.Material, options: { band?: THREE.Material; tall?: number } = {}) {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.09, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), material);
  dome.position.y = headR * 0.14;
  dome.scale.y = options.tall ?? 1;
  dome.castShadow = true;
  head.add(dome);
  if (options.band) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.0, headR * 0.09, 6, 24), options.band);
    band.rotation.x = Math.PI / 2;
    band.position.y = headR * 0.14 + headR * 1.09 * Math.cos(Math.PI * 0.42) * (options.tall ?? 1);
    head.add(band);
  }
  return dome;
}

/** A short beard: a block of hair under the chin and along the jaw. */
export function beard(head: THREE.Object3D, headR: number, material: THREE.Material, length = 1) {
  const chin = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.78, 14, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), material);
  chin.position.set(0, -headR * 0.18, headR * 0.3);
  chin.scale.set(1, 0.85 * length, 0.9);
  chin.castShadow = true;
  head.add(chin);
  return chin;
}

/**
 * Two-bone reach: turn the shoulder and elbow so the hand's tip lands on `target` (sculpture
 * space), with the elbow pushed toward `pole`. `upper` and `lower` are the upper-arm length and
 * the forearm-plus-hand length. Measured from the figure as it stands now, so pose the body first.
 */
export function reach(person: Figure, side: Side, target: THREE.Vector3, pole: THREE.Vector3, upper: number, lower: number) {
  const shoulder = person.joints.shoulders[side], elbow = person.joints.elbows[side];
  const parent = shoulder.parent!;
  const s = at(shoulder);
  const toTarget = target.clone().sub(s);
  const dist = Math.min(Math.max(toTarget.length(), Math.abs(upper - lower) + 0.01), (upper + lower) * 0.995);
  const u = toTarget.normalize();
  const p = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
  const cosA = Math.min(1, Math.max(-1, (upper * upper + dist * dist - lower * lower) / (2 * upper * dist)));
  const a = Math.acos(cosA);
  const elbowAt = s.clone().addScaledVector(u, upper * Math.cos(a)).addScaledVector(p, upper * Math.sin(a));
  const bendAxis = new THREE.Vector3().crossVectors(p, u).normalize();
  const local = (node: THREE.Object3D, v: THREE.Vector3) => v.clone().applyQuaternion(node.getWorldQuaternion(new THREE.Quaternion()).invert());
  parent.updateWorldMatrix(true, false);
  aim(shoulder, local(parent, elbowAt.clone().sub(s)), local(parent, bendAxis));
  shoulder.updateWorldMatrix(true, false);
  const handAt = s.clone().addScaledVector(u, dist);
  aim(elbow, local(shoulder, handAt.sub(elbowAt)), local(shoulder, bendAxis));
  elbow.updateWorldMatrix(true, true);
}
