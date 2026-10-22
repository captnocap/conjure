import * as THREE from 'three';

/** Small private vocabulary for sculpting mask faces: a relief shell, painted canvases and tapered horns. */

export type Relief = (u: number, v: number) => number;
export type Pt = readonly [number, number, number];

export const g = (x: number, c: number, s: number) => Math.exp(-(((x - c) / s) ** 2));
export const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Below 1 inside a turned ellipse. */
export const ell = (u: number, v: number, cu: number, cv: number, ru: number, rv: number, rot = 0) => {
  const c = Math.cos(rot), s = Math.sin(rot);
  const du = u - cu, dv = v - cv;
  const a = (du * c + dv * s) / ru, b = (-du * s + dv * c) / rv;
  return a * a + b * b;
};

export interface ShellSpec {
  w: number;
  h: number;
  d: number;
  relief?: Relief;
  hole?: (u: number, v: number) => boolean;
  /** How much the chin narrows, 0 to 0.6. */
  taper?: number;
  /** How much the forehead narrows. */
  crown?: number;
  /** Superellipse exponent of the outline: 2 is an oval, higher is squarer. */
  round?: number;
  segU?: number;
  segV?: number;
}

export function shellPoint(spec: ShellSpec, u: number, v: number, out = new THREE.Vector3()) {
  const n = spec.round ?? 2.3;
  const av = Math.min(1, Math.abs(v));
  const side = (1 - av ** n) ** (1 / n);
  const narrow = v < 0 ? 1 - (spec.taper ?? 0.2) * -v : 1 - (spec.crown ?? 0.05) * v;
  const base = Math.sqrt(Math.max(0, 1 - u * u * 0.95)) * (0.7 + 0.3 * Math.sqrt(Math.max(0, 1 - v * v)));
  return out.set(u * (spec.w / 2) * side * narrow, v * (spec.h / 2), spec.d * (base + (spec.relief ? spec.relief(u, v) : 0)));
}

/** A face-shaped relief shell over u, v in -1..1, front toward +z, with holes cut where asked. */
export function shell(spec: ShellSpec, material: THREE.Material) {
  const nu = spec.segU ?? 64, nv = spec.segV ?? 84;
  const positions = new Float32Array((nu + 1) * (nv + 1) * 3);
  const uvs = new Float32Array((nu + 1) * (nv + 1) * 2);
  const p = new THREE.Vector3();
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1, v = (j / nv) * 2 - 1;
      shellPoint(spec, u, v, p);
      const k = j * (nu + 1) + i;
      positions.set([p.x, p.y, p.z], k * 3);
      uvs.set([i / nu, j / nv], k * 2);
    }
  const index: number[] = [];
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const u = ((i + 0.5) / nu) * 2 - 1, v = ((j + 0.5) / nv) * 2 - 1;
      if (spec.hole?.(u, v)) continue;
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      index.push(a, b, d, a, d, c);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** The usual landmarks of a human face as relief, each one scalable. */
export function human(p: { nose?: number; brow?: number; cheek?: number; lips?: number; chin?: number; socket?: number; smile?: number } = {}): Relief {
  const { nose = 1, brow = 1, cheek = 1, lips = 1, chin = 1, socket = 1, smile = 0 } = p;
  return (u, v) => {
    const au = Math.abs(u);
    const t = Math.min(1, Math.max(0, (0.24 - v) / 0.44));
    const win = v > 0.24 ? g(v, 0.24, 0.12) : v < -0.2 ? g(v, -0.2, 0.05) : 1;
    let r = nose * (0.1 + 0.36 * t ** 1.5) * g(u, 0, 0.085 + 0.07 * t) * win;
    r += nose * 0.1 * g(au, 0.14, 0.06) * g(v, -0.17, 0.06);
    r += brow * 0.13 * g(v, 0.31, 0.085) * g(au, 0.42, 0.32);
    r -= socket * 0.15 * g(au, 0.42, 0.2) * g(v, 0.14, 0.1);
    r += cheek * 0.13 * g(au, 0.52, 0.22) * g(v, -0.14 + smile * 0.06, 0.17);
    const lift = smile * 0.09 * au;
    r += lips * 0.09 * g(v, -0.43 + lift, 0.035) * g(u, 0, 0.28);
    r += lips * 0.085 * g(v, -0.53 + lift, 0.04) * g(u, 0, 0.22);
    r += 0.07 * g(v, -0.47, 0.15) * g(u, 0, 0.36);
    r += chin * 0.13 * g(v, -0.78, 0.1) * g(u, 0, 0.26);
    return r;
  };
}

export type Painter = (ctx: CanvasRenderingContext2D, X: (u: number) => number, Y: (v: number) => number, W: number, H: number) => void;

/** A canvas whose pixels follow the shell's u, v: X(-1) is the left edge and Y(1) the top. */
export function painted(width: number, height: number, draw: Painter) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, (u) => ((u + 1) / 2) * width, (v) => ((1 - v) / 2) * height, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A tube that follows a curve with a radius that changes along it: horns, beaks, tusks, cords. */
export function horn(points: readonly Pt[], radius: (t: number) => number, material: THREE.Material, options: { sides?: number; steps?: number; squash?: number; side?: Pt } = {}) {
  const sides = options.sides ?? 10, steps = options.steps ?? 24, squash = options.squash ?? 1;
  const curve = new THREE.CatmullRomCurve3(points.map((q) => new THREE.Vector3(...q)));
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  const normal = new THREE.Vector3(...(options.side ?? [1, 0, 0]));
  const binormal = new THREE.Vector3(), at = new THREE.Vector3(), tangent = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    curve.getPoint(t, at);
    curve.getTangent(t, tangent);
    normal.addScaledVector(tangent, -normal.dot(tangent));
    if (normal.lengthSq() < 1e-8) normal.set(tangent.y, tangent.z, tangent.x).addScaledVector(tangent, -tangent.dot(new THREE.Vector3(tangent.y, tangent.z, tangent.x)));
    normal.normalize();
    binormal.crossVectors(tangent, normal);
    const r = Math.max(radius(t), 0.00001);
    for (let k = 0; k <= sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      positions.push(
        at.x + normal.x * Math.cos(a) * r + binormal.x * Math.sin(a) * r * squash,
        at.y + normal.y * Math.cos(a) * r + binormal.y * Math.sin(a) * r * squash,
        at.z + normal.z * Math.cos(a) * r + binormal.z * Math.sin(a) * r * squash,
      );
      uvs.push(k / sides, t);
    }
  }
  for (let i = 0; i < steps; i++)
    for (let k = 0; k < sides; k++) {
      const a = i * (sides + 1) + k, b = a + 1, c = a + sides + 1, d = c + 1;
      index.push(a, b, c, b, d, c);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** An irregular blob path, for flakes, stains, patches and torn paper. */
export function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, random: () => number, points = 9) {
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2, k = r * (0.55 + random() * 0.7);
    if (i === 0) ctx.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
    else ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  ctx.closePath();
}
