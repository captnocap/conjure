import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/** Creature-shop sculpting helpers: lumpy heads, tapered tubes and painted canvases. */
export type V3 = readonly [number, number, number];

const fract = (n: number) => n - Math.floor(n);
const hash = (x: number, y: number, z: number) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
const fade = (t: number) => t * t * (3 - 2 * t);

/** Smooth value noise in -1..1. Deterministic: no generator state. */
export function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash(ix + dx, iy + dy, iz + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy),
    l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  ) * 2 - 1;
}

export const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** A sphere pushed into any shape, with welded seams and optional per-vertex colour. */
export function blob(
  segments: number,
  shape: (dir: THREE.Vector3) => THREE.Vector3,
  paint?: (point: THREE.Vector3, dir: THREE.Vector3) => THREE.Color,
): THREE.BufferGeometry {
  const sphere = new THREE.SphereGeometry(1, segments, Math.round(segments * 0.7));
  sphere.deleteAttribute('uv');
  sphere.deleteAttribute('normal');
  const geometry = mergeVertices(sphere, 1e-4);
  sphere.dispose();
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colours = paint ? new Float32Array(position.count * 3) : null;
  const dir = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    dir.fromBufferAttribute(position, i).normalize();
    const point = shape(dir.clone());
    position.setXYZ(i, point.x, point.y, point.z);
    if (colours && paint) {
      const colour = paint(point, dir);
      colours.set([colour.r, colour.g, colour.b], i * 3);
    }
  }
  if (colours) geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export interface HeadSpec {
  /** 1 is an adult human head, about 0.23 m tall. */
  size: number;
  width: number;
  height: number;
  depth: number;
  /** 0 pointed … 1 square and heavy. */
  jaw: number;
  chin: number;
  brow: number;
  socket: number;
  eyeSpread: number;
  eyeHeight: number;
  /** Negative values dig a nasal cavity. */
  nose: number;
  /** Positive cheekbones, negative sunken cheeks. */
  cheek: number;
  snout: number;
  mouth: number;
  crown: number;
  /** A third socket in the forehead. */
  third: number;
  lump: number;
  lumpScale: number;
  /** Lumps only where x is on this side: -1 left, 1 right, 0 everywhere. */
  lumpSide: number;
}

export const HUMAN: HeadSpec = {
  size: 1, width: 1, height: 1, depth: 1, jaw: 0.5, chin: 0.4, brow: 0.5, socket: 0.6, eyeSpread: 0.36, eyeHeight: 0.12,
  nose: 0.6, cheek: 0.3, snout: 0, mouth: 0.4, crown: 0, third: 0, lump: 0, lumpScale: 6, lumpSide: 0,
};

/** A head surface you can ask for points on, so eyes, lips and pins sit on the skin. */
export class Head {
  readonly spec: HeadSpec;
  constructor(spec: Partial<HeadSpec> = {}) { this.spec = { ...HUMAN, ...spec }; }

  point(dir: THREE.Vector3): THREE.Vector3 {
    const s = this.spec;
    const d = dir.clone().normalize();
    const p = new THREE.Vector3(d.x * 0.078 * s.width, d.y * 0.115 * s.height, d.z * 0.096 * s.depth);
    const front = smooth(-0.15, 0.35, d.z);
    const g = (cx: number, cy: number, wx: number, wy: number) =>
      front * Math.exp(-(((d.x - cx) / wx) ** 2) - ((d.y - cy) / wy) ** 2);
    if (d.y < 0) {
      const t = -d.y;
      p.x *= 1 - t * t * (0.5 - 0.42 * s.jaw);
      if (d.z < 0) p.z *= 1 - t * 0.3;
      p.y *= 1 - t * 0.08;
    } else p.multiplyScalar(1 + s.crown * 0.2 * d.y * smooth(0.6, -0.6, d.z));
    let f = 1;
    const e = s.eyeSpread, h = s.eyeHeight;
    f += s.brow * 0.11 * (g(-e, h + 0.2, 0.26, 0.1) + g(e, h + 0.2, 0.26, 0.1) + 0.5 * g(0, h + 0.18, 0.2, 0.1));
    f -= s.socket * 0.15 * (g(-e, h, 0.17, 0.12) + g(e, h, 0.17, 0.12));
    f -= s.third * 0.13 * g(0, h + 0.42, 0.15, 0.12);
    f += s.nose * (s.nose > 0 ? 0.26 : 0.14) * g(0, -0.14, 0.1, 0.17) + Math.max(s.nose, 0) * 0.1 * g(0, 0.08, 0.07, 0.2);
    f += s.cheek * 0.09 * (g(-0.56, -0.12, 0.2, 0.16) + g(0.56, -0.12, 0.2, 0.16));
    f += s.chin * 0.16 * g(0, -0.8, 0.26, 0.2);
    f += s.snout * 0.6 * g(0, -0.3, 0.36, 0.3);
    f -= s.mouth * 0.045 * g(0, -0.46, 0.34, 0.06);
    if (s.lump > 0) {
      const side = s.lumpSide === 0 ? 1 : smooth(-0.12, 0.12, d.x * s.lumpSide);
      const k = s.lumpScale;
      f += s.lump * side * (noise3(d.x * k + 3, d.y * k + 7, d.z * k) + 0.5 * noise3(d.x * k * 2.3, d.y * k * 2.3 + 5, d.z * k * 2.3));
    }
    return p.multiplyScalar(f * s.size);
  }

  /** A point on the face: x and y are -1..1 across and up the front of the head. */
  face(x: number, y: number, lift = 0): THREE.Vector3 {
    const dir = new THREE.Vector3(x, y, Math.sqrt(Math.max(0.0001, 1 - x * x - y * y)));
    const p = this.point(dir);
    return lift ? p.add(this.normal(dir).multiplyScalar(lift)) : p;
  }

  normal(dir: THREE.Vector3): THREE.Vector3 {
    const d = dir.clone().normalize();
    const up = Math.abs(d.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(up, d).normalize();
    const v = new THREE.Vector3().crossVectors(d, u);
    const a = this.point(d.clone().addScaledVector(u, 0.04));
    const b = this.point(d.clone().addScaledVector(u, -0.04));
    const c = this.point(d.clone().addScaledVector(v, 0.04));
    const e = this.point(d.clone().addScaledVector(v, -0.04));
    const n = a.sub(b).cross(c.sub(e)).normalize();
    return n.dot(d) < 0 ? n.negate() : n;
  }

  geometry(segments = 56, paint?: (point: THREE.Vector3, dir: THREE.Vector3) => THREE.Color) {
    return blob(segments, (dir) => this.point(dir), paint);
  }
}

/** A tube along a curve whose radius changes along its length (and optionally around it). */
export function taperTube(
  points: readonly (V3 | THREE.Vector3)[],
  radius: (t: number, angle: number) => number,
  steps = 32,
  radial = 10,
  closed = false,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p instanceof THREE.Vector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2]))), closed);
  const frames = curve.computeFrenetFrames(steps, closed);
  const positions: number[] = [], indices: number[] = [];
  const centre = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    curve.getPointAt(t, centre);
    const n = frames.normals[i], b = frames.binormals[i];
    for (let j = 0; j < radial; j++) {
      const angle = (j / radial) * Math.PI * 2;
      const r = Math.max(radius(t, angle), 0.00001);
      positions.push(
        centre.x + r * (Math.cos(angle) * n.x + Math.sin(angle) * b.x),
        centre.y + r * (Math.cos(angle) * n.y + Math.sin(angle) * b.y),
        centre.z + r * (Math.cos(angle) * n.z + Math.sin(angle) * b.z),
      );
    }
  }
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + ((j + 1) % radial), c = a + radial, d = b + radial;
      indices.push(a, b, c, b, d, c);
    }
  if (!closed) {
    for (const [ring, t, flip] of [[0, 0, true], [steps, 1, false]] as const) {
      curve.getPointAt(t, centre);
      const hub = positions.length / 3;
      positions.push(centre.x, centre.y, centre.z);
      for (let j = 0; j < radial; j++) {
        const a = ring * radial + j, b = ring * radial + ((j + 1) % radial);
        if (flip) indices.push(hub, b, a); else indices.push(hub, a, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A canvas you paint yourself, as a colour texture. */
export function painted(width: number, height: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const pick = <T,>(list: readonly T[], random: () => number): T => list[Math.floor(random() * list.length) % list.length];
