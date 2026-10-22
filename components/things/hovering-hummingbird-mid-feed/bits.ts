import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Thing, disposeTree, visibleBounds } from '@conjure/kit';

/** Local geometry helpers. Copied per component; nothing here is shared at runtime. */
export type Tone = THREE.ColorRepresentation;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const TAU = Math.PI * 2;

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
      const angle = (j / sides) * TAU, c = Math.cos(angle), s = Math.sin(angle);
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

/** Points along a bent run from a start to an end, bowed sideways by `bow`. */
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

/** A smooth seeded field over space, roughly -1..1: a sum of plane waves, cheap and seam-free. */
export function field(random: () => number, waves = 9) {
  const list = Array.from({ length: waves }, (_unused, index) => {
    const octave = 1 + Math.floor(index / 3);
    return { d: V(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize(), f: (1.2 + random()) * octave, p: random() * TAU, a: 1 / octave };
  });
  const total = list.reduce((sum, wave) => sum + wave.a, 0);
  return (p: THREE.Vector3, frequency = 1) => {
    let sum = 0;
    for (const wave of list) sum += Math.sin(wave.d.dot(p) * wave.f * frequency + wave.p) * wave.a;
    return (sum / total) * 1.7;
  };
}
export type Field = ReturnType<typeof field>;

/**
 * An ellipsoid pushed in and out by a smooth field, welded so it has no seam.
 * `frequency` is in waves per unit of the unscaled sphere.
 */
export function blob(radii: THREE.Vector3, noise: Field | null, amount = 0, frequency = 2, widthSegments = 18, heightSegments = 12) {
  let g: THREE.BufferGeometry = new THREE.SphereGeometry(1, widthSegments, heightSegments);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.getAttribute('position');
  const p = V();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const push = noise ? 1 + noise(p, frequency) * amount : 1;
    pos.setXYZ(i, p.x * radii.x * push, p.y * radii.y * push, p.z * radii.z * push);
  }
  g.computeVertexNormals();
  return g;
}

/** Colour each vertex of a geometry by a function of its position and normal. */
export function paint(geometry: THREE.BufferGeometry, colour: (p: THREE.Vector3, n: THREE.Vector3) => Tone) {
  const pos = geometry.getAttribute('position');
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  const nor = geometry.getAttribute('normal');
  const out = new Float32Array(pos.count * 3);
  const p = V(), n = V(), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    c.set(colour(p, n));
    out.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return geometry;
}

/**
 * A leaf blade along +z from the stalk end, lying in xz with its face up (+y).
 * `fold` lifts the edges into a V along the midrib, `droop` bends the tip down, `twist` turns it.
 */
export function leaf(length: number, width: number, options: { fold?: number; droop?: number; twist?: number; tip?: number; segments?: number; colour?: (t: number, s: number) => Tone } = {}) {
  const rows = options.segments ?? 12, cols = 6;
  const fold = options.fold ?? 0.25, droop = options.droop ?? 0.15, twist = options.twist ?? 0, tip = options.tip ?? 0.85;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const half = width * 0.5 * Math.pow(Math.sin(Math.PI * Math.pow(t, tip)), 0.8);
    for (let j = 0; j <= cols; j++) {
      const s = (j / cols) * 2 - 1;
      const x0 = s * half;
      const y0 = Math.abs(s) * half * fold - droop * length * t * t;
      const angle = twist * t;
      pos.push(x0 * Math.cos(angle) - y0 * Math.sin(angle), x0 * Math.sin(angle) + y0 * Math.cos(angle), t * length);
      c.set(options.colour ? options.colour(t, s) : '#ffffff');
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j, b = a + cols + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
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
    ctx.ellipse(14 + i * 32, 17, 6, 5, 0, 0, TAU);
    ctx.fill();
    ctx.fillRect(26 + i * 32, 24, 3, 2);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: glow, roughness: 0.08, metalness: 0.1 });
}

/** Many copies of one geometry, each with its own matrix and optional colour. */
export function instances(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: readonly { matrix: THREE.Matrix4; colour?: Tone }[]) {
  if (!list.length) { geometry.dispose(); material.dispose(); return null; }
  const mesh = new THREE.InstancedMesh(geometry, material, list.length);
  list.forEach((entry, index) => {
    mesh.setMatrixAt(index, entry.matrix);
    if (entry.colour !== undefined) mesh.setColorAt(index, new THREE.Color(entry.colour));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
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
