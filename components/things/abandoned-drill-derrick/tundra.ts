import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type P3 = readonly [number, number, number];
type Tint = THREE.ColorRepresentation;
const UP = new THREE.Vector3(0, 1, 0);

/** A tube along a smooth curve whose radius changes along its length (tusks, antlers, runners). */
export function taperTube(points: readonly P3[], radius: (t: number) => number, radial = 7, steps = points.length * 6) {
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

  private place(at: P3, rot?: P3, scale?: P3) {
    return new THREE.Matrix4().compose(
      new THREE.Vector3(...at),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot ?? [0, 0, 0]))),
      new THREE.Vector3(...(scale ?? [1, 1, 1])),
    );
  }

  ball(radii: P3, at: P3, color: Tint, rot?: P3, segments = 12) {
    return this.add(new THREE.SphereGeometry(1, segments, Math.max(6, Math.floor(segments * 0.7))), color, this.place(at, rot, radii));
  }

  box(size: P3, at: P3, color: Tint, rot?: P3) {
    return this.add(new THREE.BoxGeometry(...size), color, this.place(at, rot));
  }

  rod(from: P3, to: P3, r0: number, r1: number, color: Tint, segments = 6) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a), len = Math.max(d.length(), 1e-4);
    const m = new THREE.Matrix4().compose(a.add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), new THREE.Vector3(1, 1, 1));
    return this.add(new THREE.CylinderGeometry(r1, r0, len, segments), color, m);
  }

  drum(radius: number, height: number, at: P3, color: Tint, rot?: P3, segments = 12, top = radius) {
    return this.add(new THREE.CylinderGeometry(top, radius, height, segments), color, this.place(at, rot));
  }

  tube(points: readonly P3[], radius: (t: number) => number, color: Tint, radial = 6, steps?: number) {
    return this.add(taperTube(points, radius, radial, steps), color);
  }

  get empty() { return this.parts.length === 0; }

  /** Take an already coloured geometry (another batch's `geometry()`) without repainting it. */
  adopt(geometry: THREE.BufferGeometry, matrix?: THREE.Matrix4) {
    if (matrix) geometry.applyMatrix4(matrix);
    this.parts.push(geometry);
    return this;
  }

  geometry(transform?: THREE.Matrix4) {
    const merged = mergeGeometries(this.parts) ?? new THREE.BufferGeometry();
    for (const part of this.parts) part.dispose();
    this.parts = [];
    if (transform) merged.applyMatrix4(transform);
    return merged;
  }

  /** Merge into one mesh; `transform` is baked in so the batch can be built in local space. */
  mesh(material: THREE.Material, transform?: THREE.Matrix4) {
    const mesh = new THREE.Mesh(this.geometry(transform), material);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }
}

export const paint = (wear: number, options: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 + wear * 0.25, ...options });

/** Blend two colours; handy for mood-driven tints. */
export const blend = (a: Tint, b: Tint, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), Math.min(1, Math.max(0, t)));
