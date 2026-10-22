import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type P3 = readonly [number, number, number];
type Tint = THREE.ColorRepresentation;
const UP = new THREE.Vector3(0, 1, 0);

/** A tube along a smooth curve whose radius changes along its length (trunks, necks, limbs). */
export function taperTube(points: readonly P3[], radius: (t: number) => number, radial = 7, steps = points.length * 5) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(steps, false);
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, p = curve.getPoint(t), n = frames.normals[i], b = frames.binormals[i], r = radius(t);
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r;
      pos.push(p.x + n.x * c + b.x * s, p.y + n.y * c + b.y * s, p.z + n.z * c + b.z * s);
    }
  }
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + ((j + 1) % radial), c = a + radial, d = b + radial;
      idx.push(a, b, c, b, d, c);
    }
  const start = curve.getPoint(0), end = curve.getPoint(1), s = pos.length / 3;
  pos.push(start.x, start.y, start.z, end.x, end.y, end.z);
  for (let j = 0; j < radial; j++) {
    idx.push(s, (j + 1) % radial, j);
    idx.push(s + 1, steps * radial + j, steps * radial + ((j + 1) % radial));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Collects many coloured solids and merges them into one vertex-coloured mesh. */
export class Batch {
  private parts: THREE.BufferGeometry[] = [];

  get empty() {
    return this.parts.length === 0;
  }

  add(geometry: THREE.BufferGeometry, color: Tint, matrix?: THREE.Matrix4) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    if (matrix) g.applyMatrix4(matrix);
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const c = new THREE.Color(color), n = g.getAttribute('position').count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.toArray(a, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    this.parts.push(g);
    return this;
  }

  at(at: P3, rot?: P3, scale?: P3 | number) {
    const s: P3 = typeof scale === 'number' ? [scale, scale, scale] : scale ?? [1, 1, 1];
    return new THREE.Matrix4().compose(
      new THREE.Vector3(...at),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot ?? [0, 0, 0]))),
      new THREE.Vector3(...s),
    );
  }

  ball(radii: P3, at: P3, color: Tint, rot?: P3, segments = 12) {
    return this.add(new THREE.SphereGeometry(1, segments, Math.max(6, Math.floor(segments * 0.7))), color, this.at(at, rot, radii));
  }

  /** A faceted lump: foliage clumps, rocks, clods. */
  blob(radii: P3, at: P3, color: Tint, rot?: P3, detail = 1) {
    return this.add(new THREE.IcosahedronGeometry(1, detail), color, this.at(at, rot, radii));
  }

  box(size: P3, at: P3, color: Tint, rot?: P3) {
    return this.add(new THREE.BoxGeometry(...size), color, this.at(at, rot));
  }

  rod(from: P3, to: P3, r0: number, r1: number, color: Tint, segments = 6) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a), len = Math.max(d.length(), 1e-4);
    const m = new THREE.Matrix4().compose(a.add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), new THREE.Vector3(1, 1, 1));
    return this.add(new THREE.CylinderGeometry(r1, r0, len, segments), color, m);
  }

  drum(radius: number, height: number, at: P3, color: Tint, rot?: P3, segments = 12, top = radius) {
    return this.add(new THREE.CylinderGeometry(top, radius, height, segments), color, this.at(at, rot));
  }

  cone(radius: number, height: number, at: P3, color: Tint, rot?: P3, segments = 8) {
    return this.add(new THREE.ConeGeometry(radius, height, segments), color, this.at(at, rot));
  }

  tube(points: readonly P3[], r0: number, r1: number, color: Tint, radial = 7, matrix?: THREE.Matrix4) {
    return this.add(taperTube(points, (t) => r0 + (r1 - r0) * t, radial), color, matrix);
  }

  /** A tube with any radius profile. */
  shaped(points: readonly P3[], radius: (t: number) => number, color: Tint, radial = 8, matrix?: THREE.Matrix4) {
    return this.add(taperTube(points, radius, radial), color, matrix);
  }

  /** Merge everything collected so far into one mesh and start again. */
  mesh(options: THREE.MeshStandardMaterialParameters = {}) {
    const geometry = mergeGeometries(this.parts, false)!;
    for (const part of this.parts) part.dispose();
    this.parts = [];
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, ...options }));
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }
}

/** Shift a colour's lightness and saturation a little, for natural unevenness. */
export function vary(color: Tint, random: () => number, amount = 0.06) {
  const c = new THREE.Color(color), hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return c.setHSL(hsl.h + (random() - 0.5) * amount * 0.3, THREE.MathUtils.clamp(hsl.s + (random() - 0.5) * amount, 0, 1), THREE.MathUtils.clamp(hsl.l + (random() - 0.5) * amount * 1.6, 0, 1));
}

/** Put a finished group on the contract's origin: centred in x and z, standing on y = 0. */
export function settle(root: THREE.Object3D, recentre = true) {
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return root;
  const centre = box.getCenter(new THREE.Vector3());
  if (recentre) root.position.set(-centre.x, 0, -centre.z);
  return root;
}
