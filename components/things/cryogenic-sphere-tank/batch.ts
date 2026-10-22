import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type P = readonly [number, number, number];
type C = THREE.ColorRepresentation;

/** Collects many small solids, each with its own colour, into one vertex-coloured mesh. */
export class Batch {
  private parts: THREE.BufferGeometry[] = [];
  private frame = new THREE.Matrix4();
  private tint = new THREE.Color();

  /** Everything added inside `fn` is placed in the given local frame. */
  within(position: P, rotation: P, fn: () => void, scale = 1) {
    const saved = this.frame.clone();
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2], 'YXZ')),
      new THREE.Vector3(scale, scale, scale),
    );
    this.frame = saved.clone().multiply(local);
    fn();
    this.frame = saved;
  }

  add(source: THREE.BufferGeometry, color: C, at: P = [0, 0, 0], rot: P = [0, 0, 0]) {
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(...at),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ')),
      new THREE.Vector3(1, 1, 1),
    );
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(this.frame, local));
    for (const name of Object.keys(geometry.attributes)) if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name);
    const count = geometry.attributes.position.count;
    const colours = new Float32Array(count * 3);
    this.tint.set(color);
    for (let i = 0; i < count; i++) colours.set([this.tint.r, this.tint.g, this.tint.b], i * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    this.parts.push(geometry);
    return this;
  }

  box(size: P, at: P, color: C, rot: P = [0, 0, 0]) {
    return this.add(new THREE.BoxGeometry(...size), color, at, rot);
  }

  cyl(top: number, bottom: number, height: number, at: P, color: C, segments = 12, rot: P = [0, 0, 0]) {
    return this.add(new THREE.CylinderGeometry(top, bottom, height, segments), color, at, rot);
  }

  ball(radius: number, at: P, color: C, stretch: P = [1, 1, 1], segments = 16) {
    const geometry = new THREE.SphereGeometry(radius, segments, Math.max(6, Math.floor(segments * 0.6)));
    geometry.scale(...stretch);
    return this.add(geometry, color, at);
  }

  rod(from: P, to: P, radius: number, color: C, endRadius = radius, segments = 6) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a);
    const length = Math.max(direction.length(), 0.0001);
    const geometry = new THREE.CylinderGeometry(endRadius, radius, length, segments);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    return this.add(geometry, color, a.add(b).multiplyScalar(0.5).toArray() as [number, number, number]);
  }

  /** A square lattice mast from y0 to y1: four legs, rings and X bracing on every face. */
  lattice(width: number, y0: number, y1: number, bays: number, member: number, color: (bay: number) => C, skip: () => boolean = () => false, topWidth = width) {
    const step = (y1 - y0) / bays;
    const half = (bay: number) => (width + (topWidth - width) * (bay / bays)) / 2;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const;
    for (let bay = 0; bay < bays; bay++) {
      const a = y0 + bay * step, b = a + step, ha = half(bay), hb = half(bay + 1);
      corners.forEach(([x, z], index) => {
        const [nx, nz] = corners[(index + 1) % 4];
        this.rod([x * ha, a, z * ha], [x * hb, b, z * hb], member, color(bay), member, 4);
        this.rod([x * hb, b, z * hb], [nx * hb, b, nz * hb], member * 0.75, color(bay), member * 0.75, 4);
        if (!skip()) this.rod([x * ha, a, z * ha], [nx * hb, b, nz * hb], member * 0.6, color(bay), member * 0.6, 4);
        if (!skip()) this.rod([nx * ha, a, nz * ha], [x * hb, b, z * hb], member * 0.6, color(bay), member * 0.6, 4);
      });
    }
  }

  mesh(options: THREE.MeshStandardMaterialParameters = {}) {
    const geometry = this.parts.length ? mergeGeometries(this.parts) : new THREE.BufferGeometry();
    for (const part of this.parts) part.dispose();
    this.parts = [];
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, ...options }));
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }
}

/** Letters painted on a canvas, stacked down a tall panel or run along a wide one. */
export function sign(lines: readonly string[], width: number, height: number, ink: string, paper: string, font = 'bold') {
  const canvas = document.createElement('canvas');
  const scale = 512 / Math.max(width, height);
  canvas.width = Math.max(32, Math.round(width * scale));
  canvas.height = Math.max(32, Math.round(height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const row = canvas.height / lines.length;
  const longest = Math.max(...lines.map((line) => line.length), 1);
  ctx.font = `${font} ${Math.min(row * 0.82, (canvas.width / longest) * 1.5)}px monospace`;
  lines.forEach((line, index) => ctx.fillText(line, canvas.width / 2, row * (index + 0.5), canvas.width * 0.94));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  return mesh;
}
