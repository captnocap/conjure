import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type P3 = readonly [number, number, number];
type Tint = THREE.ColorRepresentation;

/** A locally painted texture: no images, no fonts beyond the browser's generic families. */
export function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Many differently coloured solids merged into one mesh with vertex colours. */
export class Batch {
  private parts: THREE.BufferGeometry[] = [];
  private matrix = new THREE.Matrix4();
  private quaternion = new THREE.Quaternion();

  get size() { return this.parts.length; }

  add(geometry: THREE.BufferGeometry, color: Tint, at: P3 = [0, 0, 0], rotation: P3 = [0, 0, 0], scale: P3 = [1, 1, 1]) {
    const part = geometry.index ? geometry.toNonIndexed() : geometry;
    if (part !== geometry) geometry.dispose();
    for (const name of Object.keys(part.attributes)) if (name !== 'position' && name !== 'normal') part.deleteAttribute(name);
    this.quaternion.setFromEuler(new THREE.Euler(...rotation));
    this.matrix.compose(new THREE.Vector3(...at), this.quaternion, new THREE.Vector3(...scale));
    part.applyMatrix4(this.matrix);
    const tint = new THREE.Color(color);
    const count = part.getAttribute('position').count;
    const colours = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colours.set([tint.r, tint.g, tint.b], i * 3);
    part.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    this.parts.push(part);
    return this;
  }

  box(size: P3, at: P3, color: Tint, rotation: P3 = [0, 0, 0]) {
    return this.add(new THREE.BoxGeometry(...size), color, at, rotation);
  }

  cyl(top: number, bottom: number, height: number, at: P3, color: Tint, segments = 12, rotation: P3 = [0, 0, 0]) {
    return this.add(new THREE.CylinderGeometry(top, bottom, height, segments), color, at, rotation);
  }

  ball(size: P3, at: P3, color: Tint, segments = 12, rotation: P3 = [0, 0, 0]) {
    return this.add(new THREE.SphereGeometry(1, segments, Math.max(6, segments >> 1)), color, at, rotation, size);
  }

  rod(from: P3, to: P3, radius: number, color: Tint, segments = 8, endRadius = radius) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a);
    const length = Math.max(direction.length(), 1e-4);
    const geometry = new THREE.CylinderGeometry(endRadius, radius, length, segments);
    const part = geometry.toNonIndexed();
    geometry.dispose();
    part.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    return this.add(part, color, a.add(b).multiplyScalar(0.5).toArray() as [number, number, number]);
  }

  /** Merge everything added so far into one shadow-casting mesh and attach it. */
  into(parent: THREE.Object3D, options: THREE.MeshStandardMaterialParameters = {}) {
    if (!this.parts.length) return null;
    const geometry = mergeGeometries(this.parts, false)!;
    for (const part of this.parts) part.dispose();
    this.parts = [];
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, ...options }));
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

/** Blend a colour toward weathered grey-brown. */
export const aged = (color: Tint, wear: number, toward: Tint = '#8a8274') => new THREE.Color(color).lerp(new THREE.Color(toward), wear);
