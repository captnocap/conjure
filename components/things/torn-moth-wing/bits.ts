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
