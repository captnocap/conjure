import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/** Shared tooth vocabulary, copied into each dental component's own folder. Units are metres. */
export const TEETH_REVISION = 'REV_teeth_5';
export type ToothKind = 'incisor' | 'canine' | 'premolar' | 'molar' | 'fang' | 'block';

export interface CrownOptions {
  detail?: number;
  /** 0 sharp young cusps, 1 ground flat. */
  worn?: number;
  /** Keep one half only (-1 left, 1 right), with a broken face on the midline. */
  half?: -1 | 0 | 1;
  /** A pit sunk into the biting surface: centre in -1..1, radius and depth as fractions. */
  dent?: { u: number; w: number; r: number; depth: number };
  shade?: (t: number, u: number, w: number) => THREE.ColorRepresentation;
}

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => { const c = clamp(x); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A crown with its neck at y = 0 and biting surface near y = height. Width on x, depth on z, face on +z. */
export function crownGeometry(kind: ToothKind, width: number, height: number, depth: number, options: CrownOptions = {}): THREE.BufferGeometry {
  const detail = options.detail ?? 6;
  let geometry: THREE.BufferGeometry = new THREE.BoxGeometry(2, 2, 2, detail, detail, detail);
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  geometry = mergeVertices(geometry);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const uvs = new Float32Array(position.count * 2);
  const v = new THREE.Vector3(), n = new THREE.Vector3(), tint = new THREE.Color();
  const worn = options.worn ?? 0;
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    n.copy(v).normalize();
    v.lerp(n, kind === 'block' ? 0.45 : 0.72);
    const t = (v.y + 1) / 2, u = v.x, w = v.z;
    const top = ease((t - 0.45) / 0.55);
    let sx = 1, sz = 1, dy = 0, dz = 0;
    if (kind === 'molar') {
      sx = sz = 0.8 + 0.2 * Math.sin(Math.PI * clamp(t * 0.85 + 0.08));
      const cusp = Math.sin(Math.min(Math.abs(u), 1) * Math.PI * 0.8) * Math.sin(Math.min(Math.abs(w), 1) * Math.PI * 0.8);
      dy = top * (0.42 * cusp - 0.2) * (1 - worn * 0.85);
    } else if (kind === 'premolar') {
      sx = sz = 0.8 + 0.2 * Math.sin(Math.PI * clamp(t * 0.85 + 0.08));
      const cusp = Math.sin(Math.min(Math.abs(w), 1) * Math.PI * 0.8) * (1 - 0.35 * u * u);
      dy = top * (0.36 * cusp - 0.14) * (1 - worn * 0.85);
    } else if (kind === 'incisor') {
      sx = lerp(0.74, 1, ease(t * 1.3));
      sz = lerp(1, 0.2 + worn * 0.25, Math.pow(t, 1.5));
      dz = 0.12 * t;
      dy = -worn * 0.25 * top;
    } else if (kind === 'canine') {
      const point = Math.pow(clamp((t - 0.5) / 0.5), 1.3);
      sx = t < 0.5 ? lerp(0.72, 1, t / 0.5) : lerp(1, 0.14 + worn * 0.5, point);
      sz = lerp(1, 0.24 + worn * 0.3, Math.pow(t, 1.4));
      dy = -worn * 0.3 * top;
    } else if (kind === 'fang') {
      sx = sz = lerp(1, 0.04, Math.pow(t, 1.15));
      dz = -0.55 * t * t;
    }
    if (options.dent && t > 0.5) {
      const d = Math.hypot(u - options.dent.u, w - options.dent.w) / options.dent.r;
      dy -= options.dent.depth * ease(1 - d) * top;
    }
    let x = u * sx * width / 2;
    if (options.half && x * options.half < 0) x = options.half * width * 0.012 * (1 + Math.sin(t * 19 + w * 11));
    position.setXYZ(i, x, (t + dy * 0.5) * height, (w * sz + dz) * depth / 2);
    tint.set(options.shade ? options.shade(t, u, w) : '#f2ecdc');
    colors.set([tint.r, tint.g, tint.b], i * 3);
    uvs.set([u * 0.5 + 0.5, t], i * 2);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

export interface SweepOptions {
  radial?: number;
  steps?: number;
  /** Starting direction of the first radius; carried along the path. */
  normal?: THREE.Vector3;
  color?: (t: number) => THREE.ColorRepresentation;
  straight?: boolean;
}

/** A capped tube along a path whose two radii may change along its length: roots, gums, wires, cords. */
export function sweep(points: readonly THREE.Vector3[], radius: (t: number) => number | readonly [number, number], options: SweepOptions = {}): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points as THREE.Vector3[], false, options.straight ? 'catmullrom' : 'centripetal', options.straight ? 0 : 0.5);
  const steps = options.steps ?? Math.max(12, points.length * 6), radial = options.radial ?? 12;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const N = (options.normal ?? new THREE.Vector3(0, 1, 0)).clone();
  const T = new THREE.Vector3(), B = new THREE.Vector3(), P = new THREE.Vector3(), tint = new THREE.Color('#ffffff');
  const ends: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    curve.getPoint(t, P);
    curve.getTangent(t, T);
    N.addScaledVector(T, -N.dot(T));
    if (N.lengthSq() < 1e-8) N.set(1, 0.01, 0.02).addScaledVector(T, -T.x);
    N.normalize();
    B.crossVectors(T, N);
    const r = radius(t);
    const [rn, rb] = typeof r === 'number' ? [r, r] : r;
    if (options.color) tint.set(options.color(t));
    for (let j = 0; j < radial; j++) {
      const angle = j / radial * Math.PI * 2, c = Math.cos(angle) * rn, s = Math.sin(angle) * rb;
      pos.push(P.x + N.x * c + B.x * s, P.y + N.y * c + B.y * s, P.z + N.z * c + B.z * s);
      col.push(tint.r, tint.g, tint.b);
    }
    if (i === 0 || i === steps) ends.push(P.clone());
  }
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + (j + 1) % radial, c = a + radial, d = b + radial;
      idx.push(a, b, c, b, d, c);
    }
  const first = pos.length / 3;
  pos.push(ends[0].x, ends[0].y, ends[0].z, ends[1].x, ends[1].y, ends[1].z);
  col.push(col[0], col[1], col[2], tint.r, tint.g, tint.b);
  const last = steps * radial;
  for (let j = 0; j < radial; j++) {
    idx.push(first, (j + 1) % radial, j);
    idx.push(first + 1, last + j, last + (j + 1) % radial);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();
  return geometry;
}

/** An irregular pebble: gauze wads, cotton, blood drops, crumbs. */
export function lump(radius: number, random: () => number, rough = 0.25, detail = 2, shade?: (v: THREE.Vector3) => THREE.ColorRepresentation): THREE.BufferGeometry {
  let geometry: THREE.BufferGeometry = new THREE.IcosahedronGeometry(radius, detail);
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  geometry = mergeVertices(geometry);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const v = new THREE.Vector3(), tint = new THREE.Color('#ffffff');
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).multiplyScalar(1 + (random() - 0.5) * rough * 2);
    position.setXYZ(i, v.x, v.y, v.z);
    if (shade) tint.set(shade(v));
    colors.set([tint.r, tint.g, tint.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** One side of a human arch from the midline back: kind and width in millimetres. */
export const HUMAN: readonly (readonly [ToothKind, number])[] = [
  ['incisor', 8.6], ['incisor', 6.8], ['canine', 7.6], ['premolar', 7.0], ['premolar', 6.8], ['molar', 10.2], ['molar', 9.8],
];

/** A point on a half-ellipse arch (front at +z), `s` metres along it from the midline; it runs straight back past the widest point. */
export function archPoint(a: number, b: number, s: number) {
  const side = s < 0 ? -1 : 1, step = 0.004;
  let left = Math.abs(s), theta = 0;
  while (left > 0 && theta < Math.PI / 2) {
    left -= Math.hypot(a * Math.cos(theta), b * Math.sin(theta)) * step;
    theta += step;
  }
  theta = Math.min(theta, Math.PI / 2);
  const over = Math.max(0, left);
  return { x: side * a * Math.sin(theta), z: b * Math.cos(theta) - over, turn: Math.atan2(side * Math.sin(theta) / a, Math.cos(theta) / b) };
}

export interface ArchSpot { kind: ToothKind; width: number; x: number; z: number; turn: number; side: -1 | 1; order: number; s: number }

/** Where each tooth of an arch sits, front teeth first on each side. */
export function archSpots(a: number, b: number, teeth: readonly (readonly [ToothKind, number])[] = HUMAN, unit = 0.001, gap = 0): ArchSpot[] {
  const spots: ArchSpot[] = [];
  for (const side of [-1, 1] as const) {
    let along = gap / 2;
    teeth.forEach(([kind, mm], order) => {
      const width = mm * unit, s = side * (along + width / 2);
      spots.push({ kind, width, side, order, s, ...archPoint(a, b, s) });
      along += width + gap;
    });
  }
  return spots;
}

export const archLength = (teeth: readonly (readonly [ToothKind, number])[] = HUMAN, unit = 0.001, gap = 0) =>
  teeth.reduce((sum, [, mm]) => sum + mm * unit + gap, 0);

export function archPath(a: number, b: number, reach: number, y = 0, count = 36, inset = 0): THREE.Vector3[] {
  return Array.from({ length: count + 1 }, (_unused, i) => {
    const p = archPoint(a, b, lerp(-reach, reach, i / count));
    return new THREE.Vector3(p.x - Math.sin(p.turn) * inset, y, p.z - Math.cos(p.turn) * inset);
  });
}

/** A flat plate filling an outline on the xz plane; its top is at y = 0 and it hangs `thickness` below. */
export function plate(outline: readonly THREE.Vector3[], thickness: number, bevel = 0): THREE.BufferGeometry {
  const shape = new THREE.Shape(outline.map((p) => new THREE.Vector2(p.x, p.z)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 4 });
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** A locally painted texture: no images, no fonts beyond the browser's own. */
export function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
