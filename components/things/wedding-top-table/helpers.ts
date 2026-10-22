import * as THREE from 'three';

/** A round cloth falling in soft pleats: an open cylinder whose folds deepen toward the hem. */
export function drapeRound(top: number, bottom: number, height: number, folds: number, depth: number) {
  const geometry = new THREE.CylinderGeometry(top, bottom, height, 120, 8, true);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = 0.5 - y / height;
    const k = 1 + t * depth * Math.sin(Math.atan2(z, x) * folds);
    p.setXYZ(i, x * k, y, z * k);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A rectangular tablecloth: a box whose sides flare and ripple toward the hem. */
export function drapeBox(width: number, height: number, depth: number, ripple = 0.025, pitch = 0.16) {
  const geometry = new THREE.BoxGeometry(width, height, depth, Math.max(4, Math.round(width / 0.05)), 6, Math.max(4, Math.round(depth / 0.05)));
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), z = p.getZ(i);
    const y = p.getY(i);
    const t = 0.5 - y / height;
    const edgeX = Math.abs(Math.abs(x) - width / 2) < 1e-4, edgeZ = Math.abs(Math.abs(z) - depth / 2) < 1e-4;
    const wave = Math.sin((x + z) / pitch * Math.PI * 2);
    if (edgeX) x += Math.sign(x) * t * (0.03 + ripple * wave);
    if (edgeZ) z += Math.sign(z) * t * (0.03 + ripple * wave);
    p.setXYZ(i, x, y, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A locally painted texture: no images, no fonts beyond the browser's own. */
export function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Move a freshly made mesh (or group) under a sub-group, keeping its local transform. */
export function into<T extends THREE.Object3D>(group: THREE.Object3D, node: T): T {
  group.add(node);
  return node;
}
