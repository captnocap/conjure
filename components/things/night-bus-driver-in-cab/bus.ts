import * as THREE from 'three';
import { type Figure, type Sculpture, visibleBounds } from '@conjure/kit';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Shared vocabulary for the night-bus passengers: poses beyond the presets, moquette seats, yellow rails. */

export const RAD = Math.PI / 180;
export type Side = 'left' | 'right';
export type Point = [number, number, number];
export const SKINS = ['#f0cfb0', '#e3c2a4', '#d9b08c', '#c99a78', '#b5805a', '#8d5a3a', '#6b4328'] as const;
export const pick = <T>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)];
const clampCos = (value: number) => Math.min(1, Math.max(-1, value));

// ---------------------------------------------------------------- posing a kit figure

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
  /** Swings the upper arm away from the body, degrees (negative tucks it across). */
  out?: number;
  /** Folds the elbow, degrees. */
  bend?: number;
  /** Turns the bent forearm across the chest, degrees. */
  inward?: number;
}
export function poseArm(person: Figure, side: Side, pose: ArmPose) {
  const { shoulder, elbow } = joints(person, side);
  const sign = side === 'left' ? 1 : -1;
  shoulder.rotation.set(-(pose.forward ?? 0) * RAD, 0, sign * (pose.out ?? 0) * RAD);
  elbow.rotation.set(-(pose.bend ?? 0) * RAD, -sign * (pose.inward ?? 0) * RAD, 0);
}

export interface LegPose {
  /** Lifts the thigh toward the front, degrees: 90 is sitting. */
  forward?: number;
  out?: number;
  /** Folds the knee, degrees. */
  knee?: number;
  /** Extra ankle pitch, degrees, on top of keeping the foot flat. */
  toe?: number;
}
export function poseLeg(person: Figure, side: Side, pose: LegPose) {
  const { hip, knee, ankle } = joints(person, side);
  const sign = side === 'left' ? 1 : -1;
  hip.rotation.set(-(pose.forward ?? 0) * RAD, 0, sign * (pose.out ?? 0) * RAD);
  knee.rotation.x = (pose.knee ?? 0) * RAD;
  ankle.rotation.x = -(knee.rotation.x + hip.rotation.x) + (pose.toe ?? 0) * RAD;
}

/** Bend a leg so the ankle lands `dy` above and `dz` ahead of the hip joint, knee forward. */
export function reachLeg(person: Figure, side: Side, H: number, dy: number, dz: number, out = 0, toe = 0) {
  const L1 = H * 0.24, L2 = H * 0.23;
  const d = Math.max(0.02, Math.min(Math.hypot(dy, dz), L1 + L2 - 0.002));
  const phi = Math.atan2(dz, -dy);
  const alpha = Math.acos(clampCos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const inner = Math.acos(clampCos((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2)));
  poseLeg(person, side, { forward: (phi + alpha) / RAD, knee: (Math.PI - inner) / RAD, out, toe });
}

/** Bend an arm so the wrist lands `dy` above and `dz` ahead of the shoulder, elbow behind the line. */
export function reachArm(person: Figure, side: Side, H: number, dy: number, dz: number, out = 0, inward = 0) {
  const L1 = H * 0.17, L2 = H * 0.15;
  const d = Math.max(0.02, Math.min(Math.hypot(dy, dz), L1 + L2 - 0.002));
  const phi = Math.atan2(dz, -dy);
  const alpha = Math.acos(clampCos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const inner = Math.acos(clampCos((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2)));
  poseArm(person, side, { forward: (phi - alpha) / RAD, bend: (Math.PI - inner) / RAD, out, inward });
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

/** The figure's limb radius, torso length and the mesh the kit built for its torso. */
export function anatomy(person: Figure, H: number, build: 'slight' | 'average' | 'heavy' = 'average') {
  const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
  const limb = H * 0.036 * wide;
  const torsoL = H * 0.28;
  const headR = H * 0.064;
  const { spine } = joints(person, 'left');
  const torso = spine.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh;
  const chestR = limb * 1.35 * (build === 'heavy' ? 1.25 : 1);
  return { limb, torsoL, headR, torso, chestR, spine, shoulderW: H * 0.115 * wide };
}

/** A garment over the torso: a capsule for a jumper or tabard, an open-fronted cylinder for a coat. */
export function garment(person: Figure, H: number, build: 'slight' | 'average' | 'heavy', material: THREE.Material, options: { grow?: number; length?: number; open?: number; flare?: number; lift?: number } = {}) {
  const { torsoL, torso, chestR, spine } = anatomy(person, H, build);
  const grow = options.grow ?? 1.12;
  const length = options.length ?? 0.98;
  const radius = chestR * grow;
  let mesh: THREE.Mesh;
  if (options.open) {
    const gap = options.open * RAD;
    const geometry = new THREE.CylinderGeometry(radius, radius * (options.flare ?? 1.08), torsoL * length, 18, 1, true, gap / 2, Math.PI * 2 - gap);
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = torsoL * (0.5 + (options.lift ?? 0));
  } else {
    mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.01, torsoL * length - radius * 2), 4, 14), material);
    mesh.position.y = torsoL * (0.47 + (options.lift ?? 0));
  }
  mesh.scale.x = torso.scale.x * 1.02;
  mesh.castShadow = mesh.receiveShadow = true;
  spine.add(mesh);
  return mesh;
}

/** Flatten the dot eyes into closed lines. */
export function closeEyes(person: Figure, headR: number) {
  for (const child of person.head.children) {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && (mesh.geometry as THREE.SphereGeometry).type === 'SphereGeometry' && mesh.position.z > headR * 0.6 && Math.abs(mesh.position.x) > headR * 0.2)
      mesh.scale.set(1.5, 0.22, 0.6);
  }
}

/** A small dark open mouth below the eyes. */
export function openMouth(person: Figure, headR: number, material: THREE.Material, wide = 1) {
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.16, 10, 8), material);
  mouth.position.set(0, -headR * 0.38, headR * 0.9);
  mouth.scale.set(1.1 * wide, 1.3, 0.35);
  person.head.add(mouth);
  return mouth;
}

/** Two small earbuds, white or black, at the ears. */
export function earbuds(person: Figure, headR: number, material: THREE.Material) {
  for (const side of [-1, 1]) {
    const bud = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.14, 8, 6), material);
    bud.position.set(side * headR * 0.98, headR * 0.05, headR * 0.1);
    bud.castShadow = true;
    person.head.add(bud);
  }
}

// ---------------------------------------------------------------- the bus furniture

export const MOQUETTES = ['barman', 'teal', 'brown', 'blue', 'red'] as const;
export type Moquette = (typeof MOQUETTES)[number];

/** Woven seat fabric painted on a canvas: the geometric patterns of British bus upholstery. */
export function moquette(random: () => number, kind: Moquette) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const base = { barman: '#1f2b4d', teal: '#1d5f5c', brown: '#5a3a24', blue: '#2b4474', red: '#7f2430' }[kind];
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  if (kind === 'barman') {
    ctx.fillStyle = '#b8323c';
    for (let y = 0; y < 128; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < 128; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x + 14, y + 4);
      ctx.lineTo(x + 22, y + 18);
      ctx.lineTo(x + 8, y + 18);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#8d93a0';
    for (let y = 20; y < 128; y += 32) for (let x = (y / 32) % 2 ? 2 : 18; x < 128; x += 32) ctx.fillRect(x, y, 6, 6);
    ctx.fillStyle = '#d9a62e';
    for (let y = 30; y < 128; y += 32) ctx.fillRect(0, y, 128, 1.5);
  } else if (kind === 'teal') {
    ctx.fillStyle = '#4a2a66';
    for (let y = 0; y < 128; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < 128; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x + 8, y);
      ctx.lineTo(x + 16, y + 10);
      ctx.lineTo(x + 8, y + 20);
      ctx.lineTo(x, y + 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#b9d64a';
    for (let y = 24; y < 128; y += 32) for (let x = (y / 32) % 2 ? 0 : 16; x < 128; x += 32) ctx.fillRect(x + 6, y, 4, 4);
  } else if (kind === 'brown') {
    const stripes = ['#c8722a', '#b89a64', '#8a4a2a', '#d9b36a'];
    for (let x = 0; x < 128; x += 8) {
      ctx.fillStyle = stripes[(x / 8) % stripes.length];
      ctx.fillRect(x, 0, 3 + (x / 8) % 3, 128);
    }
  } else if (kind === 'blue') {
    ctx.fillStyle = '#9aa3b0';
    for (let y = 0; y < 128; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < 128; x += 16) ctx.fillRect(x, y, 7, 7);
    ctx.fillStyle = '#5a9a5a';
    for (let y = 9; y < 128; y += 16) for (let x = (y / 16) % 2 ? 1 : 9; x < 128; x += 16) ctx.fillRect(x, y, 3, 3);
  } else {
    ctx.fillStyle = '#3a1a1e';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3a1a1e';
    for (let y = 0; y < 128; y += 24) {
      ctx.beginPath();
      for (let x = 0; x <= 128; x += 16) ctx.lineTo(x, y + ((x / 16) % 2 ? 0 : 10));
      ctx.stroke();
    }
    ctx.fillStyle = '#d9a62e';
    for (let y = 4; y < 128; y += 24) for (let x = 8; x < 128; x += 32) ctx.fillRect(x, y, 3, 3);
  }
  // The weave: a scatter of lighter and darker threads.
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.14)';
    ctx.fillRect(random() * 128, random() * 128, 2, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export interface SeatPalette {
  fabric: THREE.Material;
  plastic: THREE.Material;
  steel: THREE.Material;
  yellow: THREE.Material;
}
export function seatPalette(s: Sculpture, random: () => number, kind: Moquette = pick(random, MOQUETTES)): SeatPalette {
  return {
    fabric: s.material('#ffffff', { map: moquette(random, kind), roughness: 0.95 }),
    plastic: s.material('#3b3e44', { roughness: 0.55 }),
    steel: s.material('#9aa0a6', { metalness: 0.55, roughness: 0.4 }),
    yellow: s.material('#f2c230', { roughness: 0.45 }),
  };
}

const rounded = (size: Point, radius = 0.03) => new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(radius, Math.min(...size) / 2.2));

export interface SeatOptions {
  /** Centre of the cushion on the floor. */
  x: number;
  z: number;
  /** Height of the cushion's top surface. */
  seatTop: number;
  width?: number;
  /** Which side the aisle is on: the grab handle and the floor leg go there. */
  aisle?: Side;
  /** Turn the whole seat about y. */
  turn?: number;
  /** Leave out the floor leg on the wall side (a cantilever off the wall). */
  cantilever?: boolean;
}

/** A moquette bus seat facing +z: cushion, reclined backrest in a plastic shell, steel frame and the yellow grab handle. */
export function busSeat(s: Sculpture, palette: SeatPalette, options: SeatOptions) {
  const width = options.width ?? 0.86;
  const aisle = (options.aisle ?? 'right') === 'right' ? 1 : -1;
  const group = new THREE.Group();
  group.position.set(options.x, 0, options.z);
  group.rotation.y = options.turn ?? 0;
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: Point, rotation: Point = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...at);
    mesh.rotation.set(...rotation);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const top = options.seatTop;
  add(rounded([width, 0.1, 0.44], 0.035), palette.fabric, [0, top - 0.05, 0.02]);
  // The backrest leans back a little; its rear is a hard plastic shell.
  const recline = -0.16;
  const back = new THREE.Group();
  back.position.set(0, top - 0.02, -0.2);
  back.rotation.x = recline;
  group.add(back);
  const pad = new THREE.Mesh(rounded([width, 0.6, 0.09], 0.035), palette.fabric);
  pad.position.set(0, 0.3, 0.02);
  const shell = new THREE.Mesh(rounded([width + 0.02, 0.62, 0.03], 0.012), palette.plastic);
  shell.position.set(0, 0.3, -0.04);
  for (const mesh of [pad, shell]) {
    mesh.castShadow = mesh.receiveShadow = true;
    back.add(mesh);
  }
  // The yellow grab handle on the aisle corner of the backrest.
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.016, 8, 20, Math.PI), palette.yellow);
  handle.position.set(aisle * (width / 2 - 0.09), 0.6, -0.04);
  handle.castShadow = true;
  back.add(handle);
  const handleBase = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.03, 0.04), palette.plastic);
  handleBase.position.set(aisle * (width / 2 - 0.09), 0.58, -0.04);
  back.add(handleBase);
  // Frame: a bar under the cushion, a leg on the aisle side and a bracket or leg on the wall side.
  add(new THREE.BoxGeometry(width * 0.92, 0.05, 0.07), palette.steel, [0, top - 0.14, -0.05]);
  add(new THREE.CylinderGeometry(0.022, 0.022, top - 0.16, 10), palette.steel, [aisle * (width / 2 - 0.1), (top - 0.16) / 2, -0.05]);
  add(new THREE.BoxGeometry(0.16, 0.025, 0.1), palette.steel, [aisle * (width / 2 - 0.1), 0.0125, -0.05]);
  if (!options.cantilever) add(new THREE.CylinderGeometry(0.022, 0.022, top - 0.16, 10), palette.steel, [-aisle * (width / 2 - 0.1), (top - 0.16) / 2, -0.05]);
  s.root.add(group);
  return group;
}

export interface WallOptions {
  /** The wall runs along z at this x. */
  x: number;
  z: number;
  length: number;
  /** Where the window pillar stands along the run (z). */
  pillarZ?: number;
  glass?: THREE.Material;
  panel: THREE.Material;
  trim: THREE.Material;
  /** Sill height: the lower panel runs from the floor to here. */
  sill?: number;
  height?: number;
}

/** A short run of the bus's side wall: lower panel, sill, the pillar between windows and, if asked, a fogged pane. */
export function sideWall(s: Sculpture, options: WallOptions) {
  const sill = options.sill ?? 0.92, height = options.height ?? 1.9;
  const out = Math.sign(options.x) || -1;
  const x = options.x;
  s.box([0.06, sill, options.length], [x, sill / 2, options.z], options.panel);
  s.box([0.09, 0.04, options.length], [x - out * 0.015, sill + 0.02, options.z], options.trim);
  if (options.glass) {
    s.box([0.06, 0.08, options.length], [x, height - 0.04, options.z], options.panel);
    const pane = s.mesh(new THREE.PlaneGeometry(options.length, height - sill - 0.12), options.glass, [x - out * 0.005, (sill + height) / 2 - 0.02, options.z]);
    pane.rotation.y = -out * Math.PI / 2;
    pane.castShadow = pane.receiveShadow = false;
  }
  if (options.pillarZ !== undefined) s.box([0.07, height - sill, 0.09], [x, (sill + height) / 2, options.pillarZ], options.panel);
}

/** A yellow floor-to-ceiling grab pole. */
export function pole(s: Sculpture, yellow: THREE.Material, steel: THREE.Material, x: number, z: number, height = 1.9) {
  s.cylinder(0.017, 0.017, height, [x, height / 2, z], yellow, 12);
  s.cylinder(0.05, 0.06, 0.02, [x, 0.01, z], steel, 14);
}

/** Fogged window glass: pale, cold, translucent, ignored by the gate's size measure. */
export function fogGlass(night = 0.5) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.6, 0.2, 0.72), roughness: 0.3, transparent: true, opacity: 0.42, depthWrite: false,
    emissive: new THREE.Color().setHSL(0.08, 0.6, 0.35), emissiveIntensity: 0.25 + night * 0.4, side: THREE.DoubleSide,
  });
}
