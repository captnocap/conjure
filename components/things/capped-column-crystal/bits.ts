import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Thing, disposeTree, visibleBounds } from '@conjure/kit';

/** Local geometry helpers. Copied per component; nothing here is shared at runtime. */
export type Tone = THREE.ColorRepresentation;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function xf(at: THREE.Vector3, scale: THREE.Vector3 | number = 1, turn?: THREE.Euler | THREE.Quaternion) {
  const q = turn instanceof THREE.Quaternion ? turn : new THREE.Quaternion().setFromEuler(turn ?? new THREE.Euler());
  return new THREE.Matrix4().compose(at, q, typeof scale === 'number' ? V(scale, scale, scale) : scale);
}

/** A matrix that carries a +y geometry so it points from one point toward another. */
export function aim(from: THREE.Vector3, to: THREE.Vector3, scale: THREE.Vector3 | number = 1) {
  const direction = to.clone().sub(from);
  if (direction.lengthSq() < 1e-14) direction.set(0, 1, 0);
  return xf(from, scale, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), direction.normalize()));
}

export interface TubeOptions {
  sides?: number;
  /** Colour along the length, 0 at the first point to 1 at the last. */
  colour?: (t: number) => Tone;
  /** Resample through a smooth curve with this many points. */
  smooth?: number;
  /** Squash the section across its width: 1 round, 0.1 a blade. */
  flat?: number;
  /** Which way the flat face looks, roughly. */
  up?: THREE.Vector3;
}

/** A tapered, optionally flattened and coloured tube along a polyline. */
export function tube(points: readonly THREE.Vector3[], radius: number | ((t: number) => number), options: TubeOptions = {}) {
  const sides = options.sides ?? 6, flat = options.flat ?? 1;
  const path = options.smooth && points.length > 2 ? new THREE.CatmullRomCurve3([...points]).getPoints(options.smooth) : points;
  const n = path.length;
  const pos: number[] = [], nor: number[] = [], col: number[] = [], uv: number[] = [], idx: number[] = [];
  const tangent = V(), binormal = V(), tint = new THREE.Color('#ffffff');
  const normal = options.up ? options.up.clone() : V(0, 0, 1);
  for (let i = 0; i < n; i++) {
    tangent.copy(path[Math.min(i + 1, n - 1)]).sub(path[Math.max(i - 1, 0)]);
    if (tangent.lengthSq() < 1e-16) tangent.set(0, 1, 0);
    tangent.normalize();
    if (Math.abs(normal.dot(tangent)) > 0.97) normal.set(tangent.y, tangent.z, tangent.x);
    normal.addScaledVector(tangent, -normal.dot(tangent)).normalize();
    binormal.crossVectors(tangent, normal);
    const t = n > 1 ? i / (n - 1) : 0;
    const r = typeof radius === 'number' ? radius : radius(t);
    if (options.colour) tint.set(options.colour(t));
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2, c = Math.cos(angle), s = Math.sin(angle);
      // The flat face looks along `normal`; the width runs along the binormal.
      const ox = normal.x * c * flat + binormal.x * s, oy = normal.y * c * flat + binormal.y * s, oz = normal.z * c * flat + binormal.z * s;
      pos.push(path[i].x + ox * r, path[i].y + oy * r, path[i].z + oz * r);
      const nx = normal.x * c + binormal.x * s * flat, ny = normal.y * c + binormal.y * s * flat, nz = normal.z * c + binormal.z * s * flat;
      const length = Math.hypot(nx, ny, nz) || 1;
      nor.push(nx / length, ny / length, nz / length);
      col.push(tint.r, tint.g, tint.b);
      uv.push(j / sides, t);
    }
  }
  for (let i = 0; i < n - 1; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j, b = a + sides + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(idx);
  return geometry;
}

/** Points along a bent stalk from a base to a tip, bowed sideways by `bow`. */
export function arc(from: THREE.Vector3, to: THREE.Vector3, bow: THREE.Vector3, count = 8) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    points.push(from.clone().lerp(to, t).addScaledVector(bow, Math.sin(t * Math.PI)));
  }
  return points;
}

/** Collects pieces and merges them into one mesh, tinted per piece by vertex colour. */
export class Bag {
  private parts: THREE.BufferGeometry[] = [];

  /** Pass a colour to tint the whole piece, or null to keep the piece's own vertex colours. */
  add(geometry: THREE.BufferGeometry, colour: Tone | null = null, matrix?: THREE.Matrix4) {
    const piece = geometry.index ? geometry.toNonIndexed() : geometry;
    if (piece !== geometry) geometry.dispose();
    if (matrix) piece.applyMatrix4(matrix);
    for (const name of Object.keys(piece.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) piece.deleteAttribute(name);
    piece.clearGroups();
    if (!piece.getAttribute('normal')) piece.computeVertexNormals();
    const count = piece.getAttribute('position').count;
    if (!piece.getAttribute('uv')) piece.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    if (colour !== null || !piece.getAttribute('color')) {
      const tint = new THREE.Color(colour ?? '#ffffff'), colours = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) colours.set([tint.r, tint.g, tint.b], i * 3);
      piece.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    }
    this.parts.push(piece);
    return this;
  }

  get size() { return this.parts.length; }

  /** Merge everything collected so far into one shadow-casting mesh under `parent`. */
  /** The merged geometry alone, for instancing. Empties the bag. */
  geometry() {
    const merged = mergeGeometries(this.parts);
    for (const piece of this.parts) piece.dispose();
    this.parts = [];
    return merged;
  }

  into(parent: THREE.Object3D, material: THREE.Material) {
    if (!this.parts.length) { material.dispose(); return null; }
    const merged = mergeGeometries(this.parts);
    for (const piece of this.parts) piece.dispose();
    this.parts = [];
    (material as THREE.MeshStandardMaterial).vertexColors = true;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

export const matte = (options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ roughness: 0.8, ...options });

/** A water bead's skin: the scene turned upside down inside a lens, with glints all round. */
export function dewMaterial(sky: Tone, ground: Tone, glow = 0.45) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const hex = (tone: Tone) => `#${new THREE.Color(tone).getHexString()}`;
  const gradient = ctx.createLinearGradient(0, 0, 0, 64);
  gradient.addColorStop(0, hex(new THREE.Color(ground).multiplyScalar(0.55)));
  gradient.addColorStop(0.42, hex(ground));
  gradient.addColorStop(0.5, '#ffffff');
  gradient.addColorStop(0.62, hex(sky));
  gradient.addColorStop(1, hex(new THREE.Color(sky).lerp(new THREE.Color('#ffffff'), 0.6)));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(14 + i * 32, 17, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(26 + i * 32, 24, 3, 2);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: glow, roughness: 0.08 });
}

/** Stand the finished object on y = 0, centred, and wrap it as a Thing. */
export function finish(root: THREE.Object3D, update?: Thing['update'], footprint?: number): Thing {
  const bounds = visibleBounds(root);
  if (!bounds.isEmpty()) {
    const centre = bounds.getCenter(V());
    root.position.set(-centre.x, -bounds.min.y, -centre.z);
  }
  return { object: root, ...(update ? { update } : {}), ...(footprint ? { footprint } : {}), dispose: () => disposeTree(root) };
}

// ---- Ice and wool vocabulary for the mitten-in-snow family. ----

/** A tapered six-sided crystal bar lying in the plane it is aimed in; `thick` is its depth along local z. */
export function bar(from: THREE.Vector3, to: THREE.Vector3, w0: number, w1: number, thick: number) {
  return new THREE.CylinderGeometry(Math.max(w1 / w0, 0.02), 1, 1, 6).translate(0, 0.5, 0).applyMatrix4(aim(from, to, V(w0, Math.max(from.distanceTo(to), 1e-5), thick)));
}

/** A hexagonal plate in the XY plane with corners on the arm axes. */
export const hexPlate = (radius: number, thick: number, sides = 6) => new THREE.CylinderGeometry(radius, radius, thick, sides).rotateX(Math.PI / 2);

export type FlakeForm = 'fern' | 'stellar' | 'sector' | 'plated' | 'spiked' | 'twelve';
export interface FlakePlan { form: FlakeForm; arms: number; stations: { t: number; length: number; sub: number }[]; hub: number; rib: number }

/** Decide one arm's branching once so all six arms agree, as real crystals do. */
export function flakePlan(form: FlakeForm, lush: number, random: () => number): FlakePlan {
  const span = { fern: [4, 9], stellar: [2, 5], sector: [1, 3], plated: [1, 3], spiked: [0, 2], twelve: [2, 4] }[form];
  const count = Math.round(span[0] + (span[1] - span[0]) * lush);
  const stations = Array.from({ length: count }, (_unused, i) => {
    const t = 0.2 + 0.72 * ((i + 0.5 + (random() - 0.5) * 0.5) / count), wobble = 0.75 + random() * 0.5;
    const length = { fern: 0.5 * (1 - t) ** 0.7, stellar: 0.24 * (1 - t * 0.6), sector: 0.1, plated: 0.15 * (1 - t * 0.5), spiked: 0.1, twelve: 0.2 * (1 - t * 0.7) }[form] * wobble;
    return { t, length, sub: form === 'fern' && length > 0.14 ? (length > 0.26 ? 3 : 2) : 0 };
  });
  return { form, arms: form === 'twelve' ? 12 : 6, stations, hub: { fern: 0.13, stellar: 0.16, sector: 0.24, plated: 0.2, spiked: 0.1, twelve: 0.15 }[form], rib: { fern: 0.05, stellar: 0.06, sector: 0.045, plated: 0.045, spiked: 0.04, twelve: 0.045 }[form] };
}

export interface FlakeOptions {
  matrix?: THREE.Matrix4;
  /** Colour by depth: 0 rib, 1 side arm, 2 twig, 3 hub. */
  tone: (depth: number, arm: number) => Tone;
  thick?: number;
  random: () => number;
  /** 0 perfect symmetry, 1 visibly lopsided. */
  rough?: number;
  /** Arm index that stops short, and how far along it stops. */
  broken?: number;
  stub?: number;
}

/** One arm along +y of a unit-radius flake between t0 and t1. Returns points on it (unit space, pre-matrix applied). */
export function flakeArm(bag: Bag, plan: FlakePlan, t0: number, t1: number, matrix: THREE.Matrix4, tone: (depth: number) => Tone, thick: number, jitter: () => number, anchors: THREE.Vector3[]) {
  const put = (geometry: THREE.BufferGeometry, depth: number) => bag.add(geometry, tone(depth), matrix);
  const mark = (p: THREE.Vector3) => anchors.push(p.clone().applyMatrix4(matrix));
  const w = plan.rib, taper = (t: number) => w * (1 - 0.6 * t);
  put(bar(V(0, t0, 0), V(0, t1, 0), taper(t0), plan.form === 'spiked' ? 0.004 : taper(t1), thick), 0);
  mark(V(0, t1, 0)); mark(V(0, (t0 + t1) / 2, 0));
  if (plan.form === 'sector' && t1 > 0.5) put(hexPlate(1, thick * 0.7).applyMatrix4(xf(V(0, mix2(Math.max(t0, 0.2), t1, 0.5), 0), V(0.2, (t1 - Math.max(t0, 0.2)) * 0.52, 1))), 1);
  if (plan.form === 'plated' && t1 > 0.95) { put(hexPlate(0.2, thick * 0.8).applyMatrix4(xf(V(0, 0.84, 0))), 1); put(hexPlate(0.1, thick * 1.3).applyMatrix4(xf(V(0, 0.84, 0))), 2); mark(V(0.15, 0.84, 0)); mark(V(-0.15, 0.84, 0)); }
  for (const station of plan.stations) {
    if (station.t < t0 + 0.02 || station.t > t1 - 0.02) continue;
    for (const side of [-1, 1]) {
      const length = station.length * jitter(), dir = V(side * 0.866, 0.5, 0), from = V(0, station.t, 0), to = from.clone().addScaledVector(dir, length);
      put(bar(from, to, w * 0.62, w * 0.22, thick * 0.8), 1);
      mark(to);
      for (let k = 1; k <= station.sub; k++) {
        const u = k / (station.sub + 0.6), base = from.clone().lerp(to, u);
        put(bar(base, base.clone().add(V(0, length * 0.42 * (1 - u * 0.6), 0)), w * 0.4, w * 0.15, thick * 0.65), 2);
        if (k === 1) put(bar(base, base.clone().add(V(side * length * 0.26, 0, 0)), w * 0.36, w * 0.12, thick * 0.6), 2);
      }
    }
  }
}
const mix2 = (a: number, b: number, t: number) => a + (b - a) * t;

/** A whole snow crystal of unit radius in the XY plane. Returns anchor points (for rime, drops) and arm tips. */
export function flake(bag: Bag, plan: FlakePlan, options: FlakeOptions) {
  const base = options.matrix ?? new THREE.Matrix4(), thick = options.thick ?? 0.035, rough = options.rough ?? 0;
  const anchors: THREE.Vector3[] = [], tips: THREE.Vector3[] = [];
  for (let arm = 0; arm < plan.arms; arm++) {
    const turn = new THREE.Matrix4().makeRotationZ((arm / plan.arms) * Math.PI * 2);
    const matrix = base.clone().multiply(turn);
    let reach = (plan.form === 'twelve' && arm % 2 ? 0.72 : 1) * (1 - rough * 0.35 * options.random());
    if (arm === options.broken) reach = options.stub ?? 0.35;
    flakeArm(bag, plan, 0, reach, matrix, (depth) => options.tone(depth, arm), thick, () => 1 + (options.random() - 0.5) * rough * 0.9, anchors);
    tips.push(V(0, reach, 0).applyMatrix4(matrix));
  }
  bag.add(hexPlate(plan.hub, thick * 1.5), options.tone(3, 0), base);
  bag.add(hexPlate(plan.hub * 0.55, thick * 2.1), options.tone(1, 0), base);
  return { anchors, tips };
}

/** Faceted ice that keeps its vertex colours and glints. */
export const ice = (glow = 0.08, options: THREE.MeshPhysicalMaterialParameters = {}) =>
  new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.2, flatShading: true, emissive: '#4f8fc8', emissiveIntensity: glow, clearcoat: 0.3, clearcoatRoughness: 0.2, ...options });

/** A crimped wool fibre from one point to another: a wavy path that droops toward its tip. */
export function crimp(from: THREE.Vector3, to: THREE.Vector3, amplitude: number, waves: number, random: () => number, droop = 0) {
  const axis = to.clone().sub(from), length = axis.length();
  const side = V(axis.y, axis.z, axis.x).cross(axis).normalize(), other = side.clone().cross(axis).normalize();
  const phase = random() * Math.PI * 2, count = Math.max(6, Math.round(waves * 5)), points: THREE.Vector3[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count, grow = Math.min(1, t * 4), angle = phase + t * waves * Math.PI * 2;
    points.push(from.clone().addScaledVector(axis, t).addScaledVector(side, Math.sin(angle) * amplitude * grow).addScaledVector(other, Math.cos(angle * 0.7) * amplitude * 0.5 * grow).add(V(0, -droop * length * t * t, 0)));
  }
  return points;
}

/** Yarn colour with a plied twist: lighter and darker bands winding along the strand. */
export const plied = (tone: THREE.Color, turns: number) => (t: number) => tone.clone().offsetHSL(0, 0, Math.sin(t * turns * Math.PI * 2) * 0.055);

export const WOOL = {
  charcoal: '#3c3f47', navy: '#2c3f66', oxblood: '#7d2a30', forest: '#2f5a44', mustard: '#b98a2c', heather: '#7c7f8c', cream: '#cfc3a6', teal: '#2a6f78',
} as const;
