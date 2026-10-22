import * as THREE from 'three';
import type { Figure, Sculpture } from '@conjure/kit';

export const RAD = Math.PI / 180;
export type Side = 'left' | 'right';
export type P = [number, number, number];

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
    /** Whole-body lean about the feet: forward degrees, and a sideways roll toward the figure's left. */
    lean(forward: number, roll = 0) { joints.body.rotation.x = forward * RAD; joints.body.rotation.z = roll * RAD; },
    /** Bend at the waist: forward degrees, a sideways tip toward the figure's left, and a twist to the left. */
    bow(forward: number, tip = 0, twist = 0) { joints.spine.rotation.set(forward * RAD, twist * RAD, tip * RAD); },
    /** Head pitch (down positive), yaw (to the figure's left positive) and roll (ear toward the left shoulder positive), degrees. */
    look(pitch: number, yaw = 0, roll = 0) { joints.neck.rotation.set(pitch * RAD, yaw * RAD, roll * RAD); },
    /** The foot mesh, for slippers, boots and bare feet. */
    foot(side: Side) { return joints.ankles[side].children[0] as THREE.Mesh; },
  };
}

const LIMITS: Record<keyof Required<ArmPose>, [number, number]> = { forward: [-45, 178], out: [-35, 110], bend: [0, 150], across: [-70, 95] };

/**
 * Swing one arm so the hand lands on a target (world space), by coordinate descent over the
 * four arm angles. Good enough to put a hand on a valve, a drum rim or a fan handle.
 */
export function reach(person: Figure, side: Side, target: THREE.Vector3, start: ArmPose = {}) {
  const r = rig(person);
  const pose: Required<ArmPose> = { forward: start.forward ?? 40, out: start.out ?? 12, bend: start.bend ?? 60, across: start.across ?? 10 };
  const hand = person.hands[side];
  const at = new THREE.Vector3();
  const cost = () => { r.arm(side, pose); hand.getWorldPosition(at); return at.distanceTo(target); };
  let best = cost();
  let step = 32;
  for (let round = 0; round < 60 && step > 0.4; round++) {
    let improved = false;
    for (const key of ['forward', 'out', 'bend', 'across'] as const) {
      for (const direction of [1, -1]) {
        const previous = pose[key];
        pose[key] = Math.min(LIMITS[key][1], Math.max(LIMITS[key][0], previous + direction * step));
        const c = cost();
        if (c < best - 1e-5) { best = c; improved = true; break; }
        pose[key] = previous;
      }
    }
    if (!improved) step *= 0.5;
  }
  r.arm(side, pose);
  return { pose, error: best };
}

/** Where a figure attachment sits in the sculpture's space right now. */
export function at(art: Sculpture, node: THREE.Object3D) {
  art.root.updateMatrixWorld(true);
  return art.root.worldToLocal(node.getWorldPosition(new THREE.Vector3()));
}

/** A point given in a node's own frame, in the sculpture's space. */
export function atLocal(art: Sculpture, node: THREE.Object3D, local: P) {
  art.root.updateMatrixWorld(true);
  return art.root.worldToLocal(node.localToWorld(new THREE.Vector3(...local)));
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
 * A skirt, dress or coat hem: an open cone hung from a point on the figure, so a dress reads as
 * cloth rather than as trousers. Returns the mesh for further tilting.
 */
export function hem(art: Sculpture, material: THREE.Material, top: THREE.Vector3, topRadius: number, bottomRadius: number, length: number, depth = 1) {
  const cone = art.mesh(new THREE.CylinderGeometry(topRadius, bottomRadius, length, 20, 1, true), material, [top.x, top.y - length / 2, top.z]);
  cone.scale.z = depth;
  return cone;
}

/** A square of cloth with a gentle curl and a lifted corner, for handkerchiefs and towels. */
export function cloth(size: number, curl: number, random: () => number) {
  const geometry = new THREE.PlaneGeometry(size, size, 6, 6);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) / size, y = position.getY(i) / size;
    position.setZ(i, Math.sin(x * Math.PI * 1.4 + 0.3) * curl * size + Math.cos(y * Math.PI) * curl * 0.5 * size + (random() - 0.5) * size * 0.03);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** The torso, upper arms and thighs of a figure, for dressing them in a printed cloth. */
export function dressParts(person: Figure) {
  const torso = person.joints.spine.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh;
  const upper = (side: Side) => person.joints.shoulders[side].children[0] as THREE.Mesh;
  const thigh = (side: Side) => person.joints.hips[side].children[0] as THREE.Mesh;
  const shin = (side: Side) => person.joints.knees[side].children[0] as THREE.Mesh;
  const fore = (side: Side) => person.joints.elbows[side].children[0] as THREE.Mesh;
  const hips = person.pelvis.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh;
  return { torso, hips, upper, thigh, shin, fore };
}

/** Brown skin tones first: the neighbourhood these figures come from. */
export const SKINS = ['#6e4630', '#8a5a3c', '#5a3a28', '#a6714b', '#3f2a1e', '#c58f62', '#dfb48f'] as const;
export const pickSkin = (random: () => number) => SKINS[Math.floor(random() * SKINS.length)];
export const pick = <T,>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)];
