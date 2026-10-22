import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/** Local helpers for weathered stone, turf and the small creatures of a moor. Copied per component. */
export type Rand = () => number;
export type Tint = THREE.ColorRepresentation;

/** Seeded fractal value noise in roughly [-1, 1]. */
export function makeNoise(random: Rand) {
  const ox = random() * 91 + 3, oy = random() * 91 + 3, oz = random() * 91 + 3;
  const hash = (x: number, y: number, z: number) => {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const fade = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number, z: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    return lerp(
      lerp(lerp(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx), lerp(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx), fy),
      lerp(lerp(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx), lerp(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx), fy),
      fz,
    );
  };
  return (x: number, y: number, z: number, octaves = 3) => {
    let sum = 0, amplitude = 1, total = 0, frequency = 1;
    for (let octave = 0; octave < octaves; octave++) {
      sum += (value(x * frequency + ox, y * frequency + oy, z * frequency + oz) * 2 - 1) * amplitude;
      total += amplitude;
      amplitude *= 0.5;
      frequency *= 2.1;
    }
    return sum / total;
  };
}

export interface StoneSpec {
  /** Width, height, depth in metres. The stone stands with its base on y = 0. */
  size: readonly [number, number, number];
  /** How much narrower the top is than the base: 1 keeps it square. */
  taper?: number;
  /** 0 a sharp block … 1 a boulder. */
  round?: number;
  /** Surface relief in metres. */
  rough?: number;
  segments?: number;
  base: Tint;
  /** Lichen, moss, soot: blotches of another colour. `up` biases them to upward faces. */
  patches?: readonly { color: Tint; amount: number; scale?: number; up?: number }[];
  /** Darkening toward the foot, 0..1. */
  damp?: number;
  /** White rime on upward faces, 0..1. */
  frost?: number;
}

/** A weathered block with vertex colours. Use with `stoneMaterial()`. */
export function stoneGeometry(random: Rand, spec: StoneSpec): THREE.BufferGeometry {
  const [w, h, d] = spec.size;
  const longest = Math.max(w, h, d);
  const n = spec.segments ?? 10;
  const seg = (side: number) => Math.max(2, Math.round((n * side) / longest));
  const box = new THREE.BoxGeometry(1, 1, 1, seg(w), seg(h), seg(d));
  box.deleteAttribute('normal');
  box.deleteAttribute('uv');
  const geometry = mergeVertices(box, 1e-4);
  box.dispose();
  const noise = makeNoise(random);
  const round = spec.round ?? 0.35, taper = spec.taper ?? 0.88, rough = spec.rough ?? longest * 0.02;
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const p = new THREE.Vector3(), s = new THREE.Vector3();
  const skew = (random() - 0.5) * 0.12;
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    s.copy(p).normalize().multiplyScalar(0.575);
    p.lerp(s, round);
    const up = p.y + 0.5;
    const narrow = 1 + (taper - 1) * up;
    p.x = p.x * narrow + skew * up;
    p.z *= narrow;
    p.set(p.x * w, up * h, p.z * d);
    const f = 2.2 / longest;
    const swell = noise(p.x * f, p.y * f, p.z * f, 2) * rough * 1.7 + noise(p.x * f * 5, p.y * f * 5, p.z * f * 5, 2) * rough;
    s.set(p.x / w, (up - 0.5) * 0.6, p.z / d).normalize();
    p.addScaledVector(s, swell);
    position.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const base = new THREE.Color(spec.base), c = new THREE.Color(), tint = new THREE.Color();
  const patches = (spec.patches ?? []).map((patch) => ({ ...patch, tint: new THREE.Color(patch.color), offset: random() * 50 }));
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    const ny = normal.getY(i);
    const f = 3 / longest;
    c.copy(base).multiplyScalar(0.86 + 0.28 * noise(p.x * f * 2 + 9, p.y * f * 2, p.z * f * 2, 3) + 0.08 * ny);
    for (const patch of patches) {
      const k = (patch.scale ?? 1) * f;
      const field = noise(p.x * k + patch.offset, p.y * k, p.z * k + patch.offset, 3) * 0.5 + 0.5 + (patch.up ?? 0) * (ny - 0.3) * 0.35;
      const edge = 1 - patch.amount * 0.75;
      const cover = THREE.MathUtils.smoothstep(field, edge - 0.04, edge + 0.08);
      c.lerp(patch.tint, cover * 0.9);
    }
    if (spec.damp) c.multiplyScalar(1 - spec.damp * 0.45 * (1 - THREE.MathUtils.smoothstep(p.y / h, 0, 0.3)));
    if (spec.frost) c.lerp(tint.set('#eef4f7'), spec.frost * THREE.MathUtils.smoothstep(ny, 0.25, 0.8) * 0.85);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export const stoneMaterial = (roughness = 0.95) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness: 0 });

/** A shadow-casting mesh. */
export function solid(geometry: THREE.BufferGeometry, material: THREE.Material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export interface Dab { at: readonly [number, number, number]; scale?: readonly [number, number, number] | number; turn?: readonly [number, number, number]; color?: Tint }

/** Many copies of one geometry in a single draw call, each with its own turn, size and colour. */
export function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, dabs: readonly Dab[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(dabs.length, 1));
  mesh.count = dabs.length;
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
  dabs.forEach((dab, index) => {
    e.set(...(dab.turn ?? [0, 0, 0]));
    q.setFromEuler(e);
    if (typeof dab.scale === 'number' || dab.scale === undefined) sc.setScalar(dab.scale ?? 1);
    else sc.set(...dab.scale);
    matrix.compose(v.set(...dab.at), q, sc);
    mesh.setMatrixAt(index, matrix);
    if (dab.color !== undefined) mesh.setColorAt(index, c.set(dab.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

/** A clump of grass blades, about 1 unit tall, to be instanced. */
export function tuftGeometry() {
  const blades: number[] = [];
  const index: number[] = [];
  const count = 5;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + i;
    const lean = 0.25 + (i % 3) * 0.16;
    const bx = Math.cos(angle) * 0.12, bz = Math.sin(angle) * 0.12;
    const tx = bx + Math.cos(angle) * lean, tz = bz + Math.sin(angle) * lean;
    const sx = -Math.sin(angle) * 0.1, sz = Math.cos(angle) * 0.1;
    const start = blades.length / 3;
    blades.push(bx - sx, 0, bz - sz, bx + sx, 0, bz + sz, tx, 0.7 + (i % 2) * 0.3, tz);
    index.push(start, start + 1, start + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(blades, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < normal.count; i++) normal.setXYZ(i, 0, 1, 0);
  return geometry;
}

/** Grass tufts scattered at the given ground points. */
export function tufts(random: Rand, points: readonly (readonly [number, number, number])[], colors: readonly Tint[], size = 0.3) {
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: THREE.DoubleSide });
  const mesh = instanced(tuftGeometry(), material, points.map((at) => ({
    at, scale: size * (0.6 + random() * 0.9), turn: [0, random() * 6.28, 0] as const, color: colors[Math.floor(random() * colors.length)],
  })));
  mesh.castShadow = false;
  return mesh;
}

/** A sheep about 1 m long, standing or lying, facing +x. */
export function sheep(random: Rand, lying = false, fleece: Tint = '#e4ddcb') {
  const group = new THREE.Group();
  const wool = new THREE.MeshStandardMaterial({ color: fleece, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 0.9 });
  const body = solid(new THREE.SphereGeometry(1, 12, 8), wool);
  body.scale.set(0.52, 0.36, 0.34);
  body.position.y = lying ? 0.3 : 0.68;
  const head = solid(new THREE.SphereGeometry(1, 10, 6), dark);
  head.scale.set(0.17, 0.13, 0.12);
  const down = random() < 0.5 && !lying;
  head.position.set(0.58, body.position.y + (down ? -0.3 : 0.2), 0);
  head.rotation.z = down ? -0.9 : -0.3;
  group.add(body, head);
  for (const side of [-1, 1]) {
    const ear = solid(new THREE.SphereGeometry(1, 6, 4), dark);
    ear.scale.set(0.04, 0.03, 0.09);
    ear.position.set(head.position.x - 0.08, head.position.y + 0.07, side * 0.13);
    group.add(ear);
    if (!lying) for (const end of [-1, 1]) {
      const leg = solid(new THREE.CylinderGeometry(0.035, 0.03, 0.42, 6), dark);
      leg.position.set(end * 0.3, 0.21, side * 0.14);
      group.add(leg);
    }
  }
  return group;
}

/** A crow about 0.45 m long, perched, facing +x. */
export function crow() {
  const group = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: '#15161a', roughness: 0.5 });
  const body = solid(new THREE.SphereGeometry(1, 10, 6), black);
  body.scale.set(0.2, 0.12, 0.1);
  body.position.y = 0.17;
  body.rotation.z = 0.35;
  const head = solid(new THREE.SphereGeometry(0.075, 8, 6), black);
  head.position.set(0.17, 0.3, 0);
  const beak = solid(new THREE.ConeGeometry(0.03, 0.13, 6), new THREE.MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.4 }));
  beak.rotation.z = -Math.PI / 2 - 0.2;
  beak.position.set(0.28, 0.285, 0);
  const tail = solid(new THREE.BoxGeometry(0.22, 0.02, 0.09), black);
  tail.position.set(-0.24, 0.1, 0);
  tail.rotation.z = 0.5;
  group.add(body, head, beak, tail);
  for (const side of [-1, 1]) {
    const leg = solid(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4), black);
    leg.position.set(0, 0.05, side * 0.04);
    group.add(leg);
  }
  return group;
}

/** A canvas of carved marks with a clear ground, to lay just proud of a stone face. */
export function carvedDecal(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, ink = 'rgba(30,26,22,0.72)') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = Math.max(32, Math.round((256 * height) / width));
  const ctx = canvas.getContext('2d')!;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // A pale lower-right edge and a dark groove read as a cut under raking light.
  for (const [dx, dy, style] of [[2.5, 2.5, 'rgba(255,250,235,0.45)'], [0, 0, ink]] as const) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.strokeStyle = style;
    ctx.fillStyle = style;
    draw(ctx, canvas.width, canvas.height);
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.receiveShadow = true;
  return mesh;
}
