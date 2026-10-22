import * as THREE from 'three';
import type { Sculpture } from './geometry';
import { visibleBounds } from './measure';

/**
 * A stylised, poseable person. Faceless or dot-eyed, built from capsules or blocks, so it
 * sits well under every print treatment and never pretends to be a photograph of anyone.
 * Stands on y = 0, centred, facing +z; the caller adds it to a Sculpture and may hang props
 * from its hands and head. Proportions follow `height`, so one helper covers a toddler, a
 * giant and a tabletop figurine.
 */
export const FIGURE_POSES = [
  'standing', 'walking', 'running', 'sitting', 'kneeling', 'crouching', 'lying',
  'reaching', 'pointing', 'waving', 'carrying', 'arms-crossed', 'hands-on-hips', 'leaning', 'slumped',
] as const;
export type FigurePose = (typeof FIGURE_POSES)[number];

export const FIGURE_STYLES = ['mannequin', 'blocky', 'silhouette', 'doll'] as const;
export type FigureStyle = (typeof FIGURE_STYLES)[number];

export const FIGURE_GAZES = ['ahead', 'down', 'up', 'left', 'right', 'over-shoulder'] as const;
export type FigureGaze = (typeof FIGURE_GAZES)[number];

export const FIGURE_HAIR = ['none', 'short', 'long', 'bun', 'cap', 'hat', 'hood'] as const;
export type FigureHair = (typeof FIGURE_HAIR)[number];

export interface FigureOptions {
  /** Standing height in metres. Default 1.7. */
  height?: number;
  build?: 'slight' | 'average' | 'heavy';
  pose?: FigurePose;
  gaze?: FigureGaze;
  style?: FigureStyle;
  /** Two dots for eyes, or a blank face. Default blank for silhouettes, dots otherwise. */
  face?: 'blank' | 'dots';
  hair?: FigureHair;
  skin?: THREE.ColorRepresentation;
  hairColor?: THREE.ColorRepresentation;
  top?: THREE.ColorRepresentation;
  bottom?: THREE.ColorRepresentation;
  shoes?: THREE.ColorRepresentation;
  sleeves?: 'long' | 'short';
  /** Mirror the pose, so a pointing figure points with the other hand. */
  mirror?: boolean;
}

/** The joint groups, for poses beyond the presets. Rotate them, then call `settle()` to re-ground the figure. */
export interface FigureJoints {
  /** Tilts the whole body about the ground: positive x leans forward. */
  body: THREE.Group;
  pelvis: THREE.Group;
  /** Positive x bends the torso forward. */
  spine: THREE.Group;
  /** Positive x looks down, y turns the head. */
  neck: THREE.Group;
  /** Limbs hang along -y from their joint: negative x swings forward, positive z swings a left limb outward (and a right one inward). */
  shoulders: { left: THREE.Group; right: THREE.Group };
  /** Euler order YXZ: x bends the forearm, then y swings the bent forearm across or away from the body. */
  elbows: { left: THREE.Group; right: THREE.Group };
  hips: { left: THREE.Group; right: THREE.Group };
  /** Positive x bends the shin back. */
  knees: { left: THREE.Group; right: THREE.Group };
  ankles: { left: THREE.Group; right: THREE.Group };
}

export interface Figure {
  /** Add this to your Sculpture's root. It stands on y = 0 at the origin, facing +z. */
  root: THREE.Group;
  /** Every joint, for custom poses. */
  joints: FigureJoints;
  /**
   * After rotating joints yourself: drop the lowest point back to the ground and recentre on the
   * origin, in the figure's own space, so it works wherever `root` has been placed. Updates
   * `hipHeight` and `height`.
   */
  settle(): void;
  /** Recompute `hipHeight` and `height` for the current pose without moving anything. */
  measure(): void;
  /** Attachment points: a prop added here hangs from the hand, oriented with the forearm. */
  hands: { left: THREE.Object3D; right: THREE.Object3D };
  /** The head group, for hats, masks and props held to the face. */
  head: THREE.Object3D;
  /** The hips, for belts, bags and chairs. */
  pelvis: THREE.Object3D;
  /** Height of the hip joint above the ground in this pose: where a seat should be for a sitting figure. */
  hipHeight: number;
  /** The figure's height in this pose, metres. */
  height: number;
  /**
   * Put a hand on a point: turns that shoulder and bends that elbow (two-bone inverse kinematics)
   * so the palm reaches `target`, or points the straight arm toward it when it is out of reach.
   * `target` is in the space of `options.space` (default the figure's `root`; pass your
   * Sculpture's root to give a point in the thing's own coordinates). The elbow drops down and
   * slightly out like a relaxed arm unless `options.elbow` names another direction, given in the
   * figure's own space (+y up, +z forward, +x the figure's left). Returns how far the palm is
   * from the target afterwards, in metres: 0 when it arrives. Reaching does not move the body,
   * so pose and `settle()` first and reach last.
   */
  reach(side: 'left' | 'right', target: THREE.Vector3Like, options?: { space?: THREE.Object3D; elbow?: THREE.Vector3Like }): number;
  /** Turn the head toward a point, within a comfortable neck range. `space` as for `reach`. */
  lookAt(target: THREE.Vector3Like, space?: THREE.Object3D): void;
  /** Call from your thing's update to let it breathe and sway with the scene's energy. */
  update(dt: number, time: number): void;
}

interface Joints {
  spine: number; neckPitch: number; neckYaw: number;
  armF: [number, number]; armOut: [number, number]; elbow: [number, number]; forearmIn: [number, number];
  legF: [number, number]; legOut: [number, number]; knee: [number, number];
  /** Whole-body lean forward, degrees, about the hips. */
  lean: number;
  /** Lying figures are laid on their back. */
  lying?: boolean;
}

const RAD = Math.PI / 180;
const standing: Joints = { spine: 0, neckPitch: 0, neckYaw: 0, armF: [4, 4], armOut: [6, 6], elbow: [12, 12], forearmIn: [0, 0], legF: [0, 0], legOut: [3, 3], knee: [0, 0], lean: 0 };
const POSES: Record<FigurePose, Joints> = {
  standing,
  walking: { ...standing, armF: [28, -28], elbow: [30, 20], legF: [-22, 24], knee: [8, 30], lean: 4 },
  running: { ...standing, armF: [60, -50], elbow: [95, 95], legF: [-40, 55], knee: [25, 90], lean: 14 },
  sitting: { ...standing, armF: [18, 18], elbow: [70, 70], legF: [88, 88], knee: [88, 88], legOut: [6, 6] },
  kneeling: { ...standing, armF: [10, 10], elbow: [25, 25], legF: [0, 0], knee: [92, 92], spine: 4 },
  crouching: { ...standing, armF: [45, 45], elbow: [70, 70], legF: [95, 95], knee: [140, 140], legOut: [14, 14], lean: 30, neckPitch: -15 },
  lying: { ...standing, armF: [10, 10], armOut: [12, 12], elbow: [8, 8], legOut: [5, 5], lying: true },
  reaching: { ...standing, armF: [150, 20], armOut: [12, 8], elbow: [5, 20], neckPitch: -20, spine: -6 },
  pointing: { ...standing, armF: [85, 6], armOut: [4, 6], elbow: [4, 14], neckYaw: 0 },
  waving: { ...standing, armF: [150, 6], armOut: [35, 6], elbow: [45, 14], forearmIn: [-30, 0] },
  carrying: { ...standing, armF: [70, 70], armOut: [4, 4], elbow: [75, 75], lean: 2 },
  'arms-crossed': { ...standing, armF: [35, 35], armOut: [-4, -4], elbow: [115, 115], forearmIn: [70, 70] },
  'hands-on-hips': { ...standing, armF: [-10, -10], armOut: [38, 38], elbow: [95, 95], forearmIn: [55, 55] },
  leaning: { ...standing, armF: [6, 6], elbow: [15, 15], legF: [-6, 10], legOut: [10, 2], lean: -8, spine: -4 },
  slumped: { ...standing, armF: [10, 10], elbow: [40, 40], legF: [80, 80], knee: [70, 70], legOut: [12, 12], spine: 28, neckPitch: 22 },
};

const GAZE: Record<FigureGaze, [number, number]> = {
  ahead: [0, 0], down: [25, 0], up: [-25, 0], left: [0, 40], right: [0, -40], 'over-shoulder': [-5, 110],
};

/** Build a figure. Pass the Sculpture so its materials carry the scene's wear. */
export function figure(art: Sculpture, options: FigureOptions = {}): Figure {
  const H = options.height ?? 1.7;
  const build = options.build ?? 'average';
  const style = options.style ?? 'mannequin';
  const pose = POSES[options.pose ?? 'standing'];
  const mirror = options.mirror ?? false;
  const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
  const limb = H * 0.036 * wide;
  const silhouette = style === 'silhouette';
  const paint = (colour: THREE.ColorRepresentation | undefined, fallback: THREE.ColorRepresentation) =>
    art.material(silhouette ? '#1f2126' : colour ?? fallback, silhouette ? { roughness: 1 } : style === 'doll' ? { roughness: 0.45 } : {});
  const skin = paint(options.skin, style === 'mannequin' ? '#c9a978' : '#d9b08c');
  const top = paint(options.top, style === 'mannequin' ? '#c9a978' : '#5b7a8a');
  const bottom = paint(options.bottom, style === 'mannequin' ? '#b89868' : '#3d4652');
  const shoes = paint(options.shoes, style === 'mannequin' ? '#8f7350' : '#2a2a2c');
  const hairPaint = paint(options.hairColor, '#3b2a22');
  const sleeves = options.sleeves ?? 'long';

  const segment = (length: number, radius: number, material: THREE.Material) => {
    const geometry = style === 'blocky'
      ? new THREE.BoxGeometry(radius * 2, length, radius * 2)
      : new THREE.CapsuleGeometry(radius, Math.max(0.001, length - radius * 2), 4, 10);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    // Hangs down from its joint at the group origin.
    mesh.position.y = -length / 2;
    return mesh;
  };
  const joint = (parent: THREE.Object3D, at: [number, number, number]) => {
    const group = new THREE.Group();
    group.position.set(...at);
    parent.add(group);
    return group;
  };

  // Proportions, as fractions of height.
  const headR = H * 0.064;
  const neckL = H * 0.03;
  const torsoL = H * 0.28;
  const pelvisL = H * 0.07;
  const thighL = H * 0.24;
  const shinL = H * 0.23;
  const footL = H * 0.03;
  const upperL = H * 0.17;
  const foreL = H * 0.15;
  const handL = H * 0.055;
  const shoulderW = H * 0.115 * wide;
  const hipW = H * 0.075 * wide;

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hipHeightStanding = pelvisL + thighL + shinL + footL;
  const pelvis = joint(body, [0, hipHeightStanding, 0]);
  const hips = new THREE.Mesh(
    style === 'blocky' ? new THREE.BoxGeometry(hipW * 2, pelvisL, limb * 2.2) : new THREE.CapsuleGeometry(limb * 1.1, hipW * 2 - limb * 2.2, 4, 10),
    bottom,
  );
  if (style !== 'blocky') hips.rotation.z = Math.PI / 2;
  hips.castShadow = hips.receiveShadow = true;
  pelvis.add(hips);

  const spine = joint(pelvis, [0, pelvisL * 0.5, 0]);
  const torso = new THREE.Mesh(
    style === 'blocky'
      ? new THREE.BoxGeometry(shoulderW * 2, torsoL, limb * 2.4)
      : new THREE.CapsuleGeometry(limb * 1.35 * (build === 'heavy' ? 1.25 : 1), torsoL - limb * 2.7, 4, 12),
    top,
  );
  torso.position.y = torsoL / 2;
  if (style !== 'blocky') torso.scale.x = (shoulderW * 2) / (limb * 2.7 * (build === 'heavy' ? 1.25 : 1));
  torso.castShadow = torso.receiveShadow = true;
  spine.add(torso);

  const neck = joint(spine, [0, torsoL + neckL * 0.3, 0]);
  const head = new THREE.Group();
  head.position.y = neckL + headR;
  neck.add(head);
  const skull = new THREE.Mesh(style === 'blocky' ? new THREE.BoxGeometry(headR * 1.8, headR * 2.1, headR * 1.8) : new THREE.SphereGeometry(headR, 18, 12), skin);
  if (style !== 'blocky') skull.scale.y = 1.12;
  skull.castShadow = skull.receiveShadow = true;
  head.add(skull);
  if ((options.face ?? (silhouette ? 'blank' : 'dots')) === 'dots' && !silhouette) {
    const eye = art.material('#2a2320', { roughness: 0.4 });
    for (const side of [-1, 1]) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.11, 8, 6), eye);
      dot.position.set(side * headR * 0.36, headR * 0.12, headR * 0.9);
      head.add(dot);
    }
  }
  const hair = options.hair ?? (silhouette ? 'none' : 'short');
  if (hair !== 'none') {
    let cap: THREE.Mesh | null = null;
    if (hair === 'short' || hair === 'long' || hair === 'bun') {
      cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.06, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairPaint);
      cap.position.y = headR * 0.1;
      cap.scale.y = 1.1;
    }
    if (hair === 'long') {
      const fall = new THREE.Mesh(new THREE.CapsuleGeometry(headR * 0.75, headR * 1.6, 3, 8), hairPaint);
      fall.position.set(0, -headR * 0.7, -headR * 0.55);
      fall.castShadow = true;
      head.add(fall);
    }
    if (hair === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.42, 10, 8), hairPaint);
      bun.position.set(0, headR * 0.75, -headR * 0.8);
      head.add(bun);
    }
    if (hair === 'cap') {
      cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.08, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hairPaint);
      cap.position.y = headR * 0.15;
      const peak = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.3, headR * 0.12, headR * 0.9), hairPaint);
      peak.position.set(0, headR * 0.35, headR * 1.2);
      head.add(peak);
    }
    if (hair === 'hat') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.7, headR * 1.7, headR * 0.1, 20), hairPaint);
      brim.position.y = headR * 0.75;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.95, headR * 1.05, headR * 1.1, 20), hairPaint);
      crown.position.y = headR * 1.3;
      brim.castShadow = crown.castShadow = true;
      head.add(brim, crown);
    }
    if (hair === 'hood') {
      // phi runs from +x through -z: this half is the back of the head and both sides, leaving the face open.
      cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.25, 16, 10, Math.PI, Math.PI, 0, Math.PI * 0.85), top);
      cap.position.set(0, headR * 0.05, -headR * 0.15);
    }
    if (cap) {
      cap.castShadow = true;
      head.add(cap);
    }
  }

  const hands = { left: new THREE.Object3D(), right: new THREE.Object3D() };
  const joints = {
    body, pelvis, spine, neck,
    shoulders: {} as FigureJoints['shoulders'], elbows: {} as FigureJoints['elbows'],
    hips: {} as FigureJoints['hips'], knees: {} as FigureJoints['knees'], ankles: {} as FigureJoints['ankles'],
  };
  const limbs = (side: 'left' | 'right') => {
    const sign = side === 'left' ? 1 : -1;
    const index = (side === 'left') !== mirror ? 0 : 1;
    const shoulder = joint(spine, [sign * shoulderW, torsoL - limb * 0.6, 0]);
    shoulder.add(segment(upperL, limb, top));
    const elbow = joint(shoulder, [0, -upperL, 0]);
    // Bend first (x), then swing the bent forearm sideways (y), so hands can meet in front of the body.
    elbow.rotation.order = 'YXZ';
    elbow.add(segment(foreL, limb * 0.9, sleeves === 'long' ? top : skin));
    const wrist = joint(elbow, [0, -foreL, 0]);
    wrist.add(segment(handL, limb * 0.75, skin));
    const palm = hands[side];
    palm.position.y = -handL;
    wrist.add(palm);
    // A limb hanging along -y: negative x swings it forward; positive z swings it toward +x, which is outward for the left side.
    shoulder.rotation.x = -pose.armF[index] * RAD;
    shoulder.rotation.z = sign * pose.armOut[index] * RAD;
    elbow.rotation.x = -pose.elbow[index] * RAD;
    // A bent forearm points forward; a positive y turn swings it toward +x, so "in" is negative for the left arm.
    elbow.rotation.y = -sign * pose.forearmIn[index] * RAD;
    joints.shoulders[side] = shoulder;
    joints.elbows[side] = elbow;

    const hip = joint(pelvis, [sign * hipW * 0.75, -pelvisL * 0.3, 0]);
    hip.add(segment(thighL, limb * 1.15, bottom));
    const knee = joint(hip, [0, -thighL, 0]);
    knee.add(segment(shinL, limb, bottom));
    const ankle = joint(knee, [0, -shinL, 0]);
    const foot = new THREE.Mesh(
      style === 'blocky' ? new THREE.BoxGeometry(limb * 2, footL * 2, limb * 4.2) : new THREE.CapsuleGeometry(limb * 0.95, limb * 2.4, 3, 8),
      shoes,
    );
    if (style !== 'blocky') foot.rotation.x = Math.PI / 2;
    foot.position.set(0, -footL, limb * 1.1);
    foot.castShadow = foot.receiveShadow = true;
    ankle.add(foot);
    hip.rotation.x = -pose.legF[index] * RAD;
    hip.rotation.z = sign * pose.legOut[index] * RAD;
    knee.rotation.x = pose.knee[index] * RAD;
    // Feet stay flat on whatever they reach.
    ankle.rotation.x = -(knee.rotation.x + hip.rotation.x);
    joints.hips[side] = hip;
    joints.knees[side] = knee;
    joints.ankles[side] = ankle;
  };
  limbs('left');
  limbs('right');

  // The torso and head sit above their joints, so positive x tips them forward and down.
  spine.rotation.x = pose.spine * RAD;
  const [gazePitch, gazeYaw] = GAZE[options.gaze ?? 'ahead'];
  neck.rotation.x = (pose.neckPitch + gazePitch) * RAD;
  neck.rotation.y = (mirror ? -1 : 1) * (pose.neckYaw + gazeYaw) * RAD;
  body.rotation.x = pose.lean * RAD;
  if (pose.lying) {
    body.rotation.x = -Math.PI / 2;
    body.rotation.z = Math.PI * 0.03;
  }

  // Bring the lowest point to the ground and the figure over the origin, whatever the pose did.
  // Everything is measured in the root's own space, so this works wherever the root was placed.
  const state = { hipHeight: 0, height: 0 };
  const toLocal = new THREE.Matrix4();
  const localBounds = () => {
    root.updateMatrixWorld(true);
    toLocal.copy(root.matrixWorld).invert();
    return visibleBounds(root).applyMatrix4(toLocal);
  };
  const measure = () => {
    const bounds = localBounds();
    state.height = bounds.max.y - bounds.min.y;
    state.hipHeight = pelvis.getWorldPosition(new THREE.Vector3()).applyMatrix4(toLocal).y - bounds.min.y;
  };
  const settle = () => {
    body.position.set(0, 0, 0);
    const bounds = localBounds();
    const centre = bounds.getCenter(new THREE.Vector3());
    body.position.set(-centre.x, -bounds.min.y, -centre.z);
    measure();
  };
  settle();

  const energy = art.context.mood.energy;
  const phase = art.context.random() * Math.PI * 2;
  // The sway is added to whatever roll the builder set; a change since the last frame is adopted as the new rest.
  let restingRoll = body.rotation.z, writtenRoll = Number.NaN;
  let restingNod = head.rotation.z, writtenNod = Number.NaN;
  // A point given in some space, brought into a joint's parent space.
  const into = (parent: THREE.Object3D, target: THREE.Vector3Like, space: THREE.Object3D) => {
    space.updateWorldMatrix(true, false);
    root.updateMatrixWorld(true);
    const world = space.localToWorld(new THREE.Vector3(target.x, target.y, target.z));
    return parent.worldToLocal(world);
  };
  const reach: Figure['reach'] = (side, target, options = {}) => {
    const shoulder = joints.shoulders[side], elbow = joints.elbows[side];
    const palm = hands[side];
    const upper = upperL, fore = foreL + handL;
    const local = into(shoulder.parent!, target, options.space ?? root).sub(shoulder.position);
    const wanted = local.length();
    if (wanted < 1e-6) return 0;
    // The law of cosines gives the elbow; the arm cannot fold flat or straighten past its length.
    const d = Math.min(Math.max(wanted, Math.abs(upper - fore) + 0.01 * H), (upper + fore) * 0.999);
    const bend = Math.PI - Math.acos(THREE.MathUtils.clamp((upper * upper + fore * fore - d * d) / (2 * upper * fore), -1, 1));
    elbow.rotation.set(-bend, 0, 0);
    // The hand with the shoulder at rest, then the shortest turn that carries it onto the target.
    const rest = new THREE.Vector3(0, -upper - fore * Math.cos(bend), fore * Math.sin(bend)).normalize();
    const aim = local.clone().normalize();
    const turn = new THREE.Quaternion().setFromUnitVectors(rest, aim);
    // Swivel the arm about the shoulder-to-hand line so the elbow points where a person's would.
    const sign = side === 'left' ? 1 : -1;
    const pole = options.elbow
      ? new THREE.Vector3(options.elbow.x, options.elbow.y, options.elbow.z)
      : new THREE.Vector3(sign * 0.35, -1, -0.25);
    // The pole is in the figure's space; the shoulder's parent may be bent, so carry it across.
    const spineTurn = shoulder.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(root.getWorldQuaternion(new THREE.Quaternion()));
    pole.applyQuaternion(spineTurn);
    const elbowAt = new THREE.Vector3(0, -upper, 0).applyQuaternion(turn);
    const flat = (v: THREE.Vector3) => v.clone().sub(aim.clone().multiplyScalar(v.dot(aim)));
    const from = flat(elbowAt), to = flat(pole);
    if (from.lengthSq() > 1e-10 && to.lengthSq() > 1e-10) {
      const angle = Math.atan2(from.clone().cross(to).dot(aim), from.dot(to));
      turn.premultiply(new THREE.Quaternion().setFromAxisAngle(aim, angle));
    }
    shoulder.quaternion.copy(turn);
    root.updateMatrixWorld(true);
    const reached = palm.getWorldPosition(new THREE.Vector3());
    const goal = (options.space ?? root).localToWorld(new THREE.Vector3(target.x, target.y, target.z));
    // Report in the figure's own units, whatever scale it was placed at.
    const scale = root.getWorldScale(new THREE.Vector3()).x || 1;
    const gap = reached.distanceTo(goal) / scale;
    return gap < 0.005 * H ? 0 : gap;
  };
  const lookAt: Figure['lookAt'] = (target, space = root) => {
    const local = into(neck.parent!, target, space).sub(neck.position).sub(new THREE.Vector3(0, neckL + headR, 0));
    const yaw = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -75 * RAD, 75 * RAD);
    const pitch = THREE.MathUtils.clamp(Math.atan2(-local.y, Math.hypot(local.x, local.z)), -40 * RAD, 50 * RAD);
    neck.rotation.set(pitch, yaw, 0, 'YXZ');
  };

  return {
    root, hands, head, pelvis, joints,
    settle, measure, reach, lookAt,
    get hipHeight() { return state.hipHeight; },
    get height() { return state.height; },
    update(_dt, time) {
      const breath = Math.sin(time * (1.2 + energy * 2) + phase);
      torso.scale.z = 1 + breath * 0.012;
      if (head.rotation.z !== writtenNod) restingNod = head.rotation.z;
      writtenNod = restingNod + Math.sin(time * 0.7 + phase) * 0.02 * (0.3 + energy);
      head.rotation.z = writtenNod;
      if (body.rotation.z !== writtenRoll) restingRoll = body.rotation.z;
      writtenRoll = restingRoll + Math.sin(time * 0.5 + phase) * 0.008 * energy;
      body.rotation.z = writtenRoll;
    },
  };
}
