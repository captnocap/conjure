import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/** Local helpers for nebular forms: seeded noise, bent tapering limbs, lumpy blobs, rim hulls and soft glows. */

export type Noise = (x: number, y: number, z: number, octaves?: number) => number;

/** Seeded fractal value noise in roughly [-1, 1]. */
export function makeNoise(seed: number): Noise {
  const hash = (x: number, y: number, z: number) => {
    let n = (Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683) ^ seed) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const ease = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = ease(x - xi), v = ease(y - yi), w = ease(z - zi);
    const at = (a: number, b: number, c: number) => hash(xi + a, yi + b, zi + c);
    const x00 = at(0, 0, 0) + (at(1, 0, 0) - at(0, 0, 0)) * u;
    const x10 = at(0, 1, 0) + (at(1, 1, 0) - at(0, 1, 0)) * u;
    const x01 = at(0, 0, 1) + (at(1, 0, 1) - at(0, 0, 1)) * u;
    const x11 = at(0, 1, 1) + (at(1, 1, 1) - at(0, 1, 1)) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return (y0 + (y1 - y0) * w) * 2 - 1;
  };
  return (x, y, z, octaves = 3) => {
    let sum = 0, gain = 0.5, total = 0, scale = 1;
    for (let octave = 0; octave < octaves; octave++) {
      sum += value(x * scale + octave * 17.3, y * scale - octave * 9.1, z * scale + octave * 4.7) * gain;
      total += gain;
      gain *= 0.5;
      scale *= 2.03;
    }
    return sum / total;
  };
}

export interface LimbOptions {
  /** Radius at t = 0 (start) … 1 (tip). */
  radius: (t: number) => number;
  /** Multiplier on the radius for a surface point, for lumps and bites. */
  rough?: (point: THREE.Vector3, t: number) => number;
  rings?: number;
  sides?: number;
}

/** A tube along a bent spine with a varying, roughened radius and a closed tip. */
export function limb(points: readonly THREE.Vector3[], options: LimbOptions): THREE.BufferGeometry {
  const rings = options.rings ?? 40, sides = options.sides ?? 18;
  const curve = new THREE.CatmullRomCurve3(points.map((point) => point.clone()));
  const positions: number[] = [];
  const indices: number[] = [];
  const tangent = new THREE.Vector3(), normal = new THREE.Vector3(), binormal = new THREE.Vector3();
  const centre = new THREE.Vector3(), surface = new THREE.Vector3(), direction = new THREE.Vector3();
  curve.getTangentAt(0, tangent);
  normal.set(1, 0, 0);
  if (Math.abs(tangent.x) > 0.9) normal.set(0, 0, 1);
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    curve.getPointAt(t, centre);
    curve.getTangentAt(t, tangent);
    normal.addScaledVector(tangent, -normal.dot(tangent)).normalize();
    binormal.crossVectors(tangent, normal);
    const radius = Math.max(options.radius(t), 0.0001);
    for (let side = 0; side < sides; side++) {
      const angle = (side / sides) * Math.PI * 2;
      direction.copy(normal).multiplyScalar(Math.cos(angle)).addScaledVector(binormal, Math.sin(angle));
      surface.copy(centre).addScaledVector(direction, radius);
      const factor = options.rough ? Math.max(options.rough(surface, t), 0.05) : 1;
      surface.copy(centre).addScaledVector(direction, radius * factor);
      positions.push(surface.x, surface.y, surface.z);
    }
  }
  for (let ring = 0; ring < rings; ring++)
    for (let side = 0; side < sides; side++) {
      const a = ring * sides + side, b = ring * sides + ((side + 1) % sides), c = a + sides, d = b + sides;
      indices.push(a, b, c, b, d, c);
    }
  curve.getPointAt(1, centre);
  positions.push(centre.x, centre.y, centre.z);
  const tip = (rings + 1) * sides;
  for (let side = 0; side < sides; side++) indices.push(rings * sides + side, rings * sides + ((side + 1) % sides), tip);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A sphere pushed in and out by a function of direction, with smooth normals. */
export function blob(radius: number, shape: (direction: THREE.Vector3) => number, detail = 4): THREE.BufferGeometry {
  const raw = new THREE.IcosahedronGeometry(1, detail);
  raw.deleteAttribute('normal');
  raw.deleteAttribute('uv');
  const geometry = mergeVertices(raw, 1e-4);
  raw.dispose();
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const direction = new THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    direction.fromBufferAttribute(position, index).normalize();
    const reach = radius * Math.max(shape(direction), 0.02);
    position.setXYZ(index, direction.x * reach, direction.y * reach, direction.z * reach);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Paint a geometry per vertex. The material must set vertexColors. */
export function tint(geometry: THREE.BufferGeometry, paint: (point: THREE.Vector3, normal: THREE.Vector3) => THREE.Color) {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const colours = new Float32Array(position.count * 3);
  const point = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    const colour = paint(point.fromBufferAttribute(position, index), normal.fromBufferAttribute(normals, index));
    colours[index * 3] = colour.r;
    colours[index * 3 + 1] = colour.g;
    colours[index * 3 + 2] = colour.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return geometry;
}

/** The same surface pushed out along its normals: drawn back-faced it becomes a glowing rim on every silhouette. */
export function hull(geometry: THREE.BufferGeometry, thickness: (point: THREE.Vector3, normal: THREE.Vector3) => number): THREE.BufferGeometry {
  const copy = geometry.clone();
  copy.deleteAttribute('color');
  const position = copy.getAttribute('position') as THREE.BufferAttribute;
  const normals = copy.getAttribute('normal') as THREE.BufferAttribute;
  const point = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    point.fromBufferAttribute(position, index);
    normal.fromBufferAttribute(normals, index);
    point.addScaledVector(normal, thickness(point, normal));
    position.setXYZ(index, point.x, point.y, point.z);
  }
  return copy;
}

export const rimPaint = (colour: THREE.ColorRepresentation) => new THREE.MeshBasicMaterial({ color: colour, side: THREE.BackSide });
export const hazePaint = (colour: THREE.ColorRepresentation, opacity: number, side: THREE.Side = THREE.FrontSide) =>
  new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false, side });

const UNIT_BALL = () => new THREE.SphereGeometry(1, 24, 16);

/** Nested see-through shells: a soft halo from any angle that is not measured as solid. */
export function glow(radius: number, colour: THREE.ColorRepresentation, strength = 1, layers = 5): THREE.Group {
  const group = new THREE.Group();
  const geometry = UNIT_BALL();
  const material = hazePaint(colour, Math.min(0.19, 0.11 * strength));
  for (let layer = 1; layer <= layers; layer++) {
    const shell = new THREE.Mesh(geometry, material);
    shell.scale.setScalar(radius * (layer / layers) ** 1.4);
    shell.renderOrder = 2;
    group.add(shell);
  }
  return group;
}

/** A small star: a hot solid core, a coloured halo and, if asked, thin diffraction spikes so it reads as a star on any backdrop. */
export function star(radius: number, colour: THREE.ColorRepresentation, halo = 3.2, strength = 1, spikes = 0): THREE.Group {
  const group = new THREE.Group();
  const tone = new THREE.Color(colour);
  const core = new THREE.Mesh(UNIT_BALL(), new THREE.MeshBasicMaterial({ color: tone.clone().lerp(new THREE.Color('#ffffff'), 0.45) }));
  core.scale.setScalar(radius);
  group.add(core, glow(radius * halo, tone, strength));
  if (spikes > 0) {
    const needle = new THREE.OctahedronGeometry(1, 0);
    const paint = new THREE.MeshBasicMaterial({ color: tone.clone().lerp(new THREE.Color('#ffffff'), 0.2) });
    for (const [x, y, z, reach] of [[1, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 0.7]] as const) {
      const spike = new THREE.Mesh(needle, paint);
      const thin = radius * 0.16;
      spike.scale.set(x ? radius * spikes * reach : thin, y ? radius * spikes * reach : thin, z ? radius * spikes * reach : thin);
      group.add(spike);
    }
  }
  return group;
}

export const pick = <T>(random: () => number, list: readonly T[]): T => list[Math.floor(random() * list.length) % list.length];
export const vec = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
