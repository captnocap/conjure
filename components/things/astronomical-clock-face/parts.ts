import * as THREE from 'three';

/** A flat toothed wheel in the XY plane, centred, `thickness` deep along z. Optional spoke windows. */
export function gearGeometry(radius: number, teeth: number, thickness: number, hole = 0, spokes = 0, depth = radius * 0.16) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  const inner = radius - depth;
  for (let t = 0; t < teeth; t++) {
    const a = t * step;
    const points: [number, number][] = [[inner, a], [radius, a + step * 0.18], [radius, a + step * 0.5], [inner, a + step * 0.68]];
    for (const [r, angle] of points) {
      const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
      if (t === 0 && r === inner && angle === a) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
  }
  shape.closePath();
  if (hole > 0) {
    const path = new THREE.Path();
    path.absarc(0, 0, hole, 0, Math.PI * 2, true);
    shape.holes.push(path);
  }
  if (spokes > 0) {
    const r1 = Math.max(hole * 1.8, radius * 0.28), r2 = inner * 0.8;
    const sector = (Math.PI * 2) / spokes;
    for (let i = 0; i < spokes; i++) {
      const a0 = i * sector + sector * 0.14, a1 = (i + 1) * sector - sector * 0.14;
      const path = new THREE.Path();
      path.absarc(0, 0, r2, a0, a1, false);
      path.absarc(0, 0, r1, a1, a0, true);
      path.closePath();
      shape.holes.push(path);
    }
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 5 });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
}

/** A painted canvas as a colour texture. */
export function painted(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export type KeyStyle = 'butterfly' | 'heart' | 'ring' | 'tbar';

/** A wind-up key: shaft rising along +y from the origin, bow at the top lying in the XY plane. */
export function windKey(material: THREE.Material, size: number, style: KeyStyle = 'butterfly') {
  const key = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, x: number, y: number, rz = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);
    mesh.rotation.z = rz;
    mesh.castShadow = true;
    key.add(mesh);
    return mesh;
  };
  const shaft = size * 0.55, t = size * 0.055;
  add(new THREE.CylinderGeometry(t, t, shaft, 10), 0, shaft / 2);
  add(new THREE.CylinderGeometry(t * 1.9, t * 1.9, t * 1.6, 12), 0, t * 0.8);
  if (style === 'butterfly') {
    for (const side of [-1, 1]) add(new THREE.TorusGeometry(size * 0.2, t * 0.9, 8, 20), side * size * 0.22, shaft + size * 0.16).scale.set(1, 1.25, 1);
  } else if (style === 'heart') {
    for (const side of [-1, 1]) add(new THREE.TorusGeometry(size * 0.13, t * 0.9, 8, 18), side * size * 0.14, shaft + size * 0.3);
    for (const side of [-1, 1]) add(new THREE.CylinderGeometry(t * 0.9, t * 0.9, size * 0.36, 8), side * size * 0.13, shaft + size * 0.1, side * 0.78);
  } else if (style === 'ring') {
    add(new THREE.TorusGeometry(size * 0.26, t, 8, 24), 0, shaft + size * 0.24);
  } else {
    add(new THREE.CylinderGeometry(t * 1.2, t * 1.2, size * 0.8, 10), 0, shaft, Math.PI / 2);
    for (const side of [-1, 1]) add(new THREE.SphereGeometry(t * 2, 10, 8), side * size * 0.4, shaft);
  }
  return key;
}
