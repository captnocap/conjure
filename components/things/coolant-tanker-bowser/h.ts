import * as THREE from 'three';

export type V = readonly [number, number, number];
type P = THREE.Object3D;
type M = THREE.Material;

/** Local mesh helpers: every part casts and receives shadow and lands under the given parent. */
export function add(parent: P, geometry: THREE.BufferGeometry, material: M, at: V = [0, 0, 0], rot: V = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(at[0], at[1], at[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export const group = (parent: P, at: V = [0, 0, 0], rot: V = [0, 0, 0]) => {
  const g = new THREE.Group();
  g.position.set(at[0], at[1], at[2]);
  g.rotation.set(rot[0], rot[1], rot[2]);
  parent.add(g);
  return g;
};
export const box = (parent: P, size: V, at: V, material: M, rot: V = [0, 0, 0]) =>
  add(parent, new THREE.BoxGeometry(size[0], size[1], size[2]), material, at, rot);
export const cyl = (parent: P, top: number, bottom: number, height: number, at: V, material: M, rot: V = [0, 0, 0], segments = 16) =>
  add(parent, new THREE.CylinderGeometry(top, bottom, height, segments), material, at, rot);
export const ball = (parent: P, size: V, at: V, material: M, segments = 14) => {
  const mesh = add(parent, new THREE.SphereGeometry(1, segments, Math.max(6, segments >> 1)), material, at);
  mesh.scale.set(size[0], size[1], size[2]);
  return mesh;
};
/** A box stretched from one point to another, w wide (x) and d deep. */
export function seg(parent: P, from: V, to: V, w: number, d: number, material: M) {
  const a = new THREE.Vector3(from[0], from[1], from[2]), b = new THREE.Vector3(to[0], to[1], to[2]);
  const dir = b.clone().sub(a);
  const mesh = add(parent, new THREE.BoxGeometry(w, Math.max(dir.length(), 0.001), d), material, a.add(b).multiplyScalar(0.5).toArray() as unknown as V);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}
export function rod(parent: P, from: V, to: V, radius: number, material: M, segments = 8) {
  const a = new THREE.Vector3(from[0], from[1], from[2]), b = new THREE.Vector3(to[0], to[1], to[2]);
  const dir = b.clone().sub(a);
  const mesh = add(parent, new THREE.CylinderGeometry(radius, radius, Math.max(dir.length(), 0.001), segments), material, a.add(b).multiplyScalar(0.5).toArray() as unknown as V);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}
export const tube = (parent: P, points: readonly V[], radius: number, material: M) =>
  add(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), Math.max(12, points.length * 6), radius, 6, false), material);

/** A canvas-painted texture: no fonts or images beyond what the browser draws itself. */
export function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
/** A flat painted panel; clear pixels are cut away, so it can sit just proud of a surface. */
export function decal(parent: P, texture: THREE.Texture, w: number, h: number, at: V, rot: V = [0, 0, 0], extra: THREE.MeshStandardMaterialParameters = {}) {
  const mesh = add(parent, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, alphaTest: 0.35, side: THREE.DoubleSide, ...extra }), at, rot);
  mesh.castShadow = false;
  return mesh;
}
/** Diagonal yellow and black warning stripes. */
export const hazard = (yellow = '#e8b21c', black = '#1d1d1b', bands = 8) =>
  paint(256, 64, (ctx, w, h) => {
    ctx.fillStyle = yellow;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = black;
    const step = w / bands;
    for (let i = -2; i < bands + 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, h); ctx.lineTo(i * step + step / 2, h); ctx.lineTo(i * step + step / 2 + h, 0); ctx.lineTo(i * step + h, 0);
      ctx.fill();
    }
  });
export const stencil = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, colour: string, align: CanvasTextAlign = 'center', maxWidth?: number) => {
  ctx.fillStyle = colour;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${size}px "Arial Narrow", Impact, sans-serif`;
  ctx.fillText(text, x, y, maxWidth);
};
