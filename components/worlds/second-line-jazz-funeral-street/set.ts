import * as THREE from 'three';
import { mix } from '@conjure/kit';

export type P = [number, number, number];

/** A canvas-painted texture: no fonts, images or network. */
export function paint(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A mesh with shadows, added to a parent. */
export function part(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: P = [0, 0, 0], rotation: P = [0, 0, 0], scale: P = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...at);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** A rod between two points inside a group. */
export function rodIn(parent: THREE.Object3D, from: P, to: P, radius: number, material: THREE.Material, endRadius = radius) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const direction = b.clone().sub(a);
  const mesh = part(parent, new THREE.CylinderGeometry(endRadius, radius, Math.max(direction.length(), 0.0001), 8), material, a.add(b).multiplyScalar(0.5).toArray() as P);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

/** A tube whose radius tapers from r0 to r1 along a smooth path: oak limbs, wires. */
export function taperTube(points: readonly P[], r0: number, r1: number, segments = 20, radial = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geometry = new THREE.TubeGeometry(curve, segments, 1, radial, false);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const centre = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    curve.getPointAt(i / segments, centre);
    const r = mix(r0, r1, i / segments);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(position, k).sub(centre).multiplyScalar(r).add(centre);
      position.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geometry.computeVertexNormals();
  return { geometry, curve };
}

export interface Instance { at: P; rotation?: P; scale?: P; color?: THREE.ColorRepresentation }

/** Many small solids in one draw call, each with its own turn, size and colour. */
export function instances(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: readonly Instance[], shadows = true) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), euler = new THREE.Euler(), scale = new THREE.Vector3(), at = new THREE.Vector3();
  list.forEach((item, index) => {
    quaternion.setFromEuler(euler.set(...(item.rotation ?? [0, 0, 0])));
    matrix.compose(at.set(...item.at), quaternion, scale.set(...(item.scale ?? [1, 1, 1])));
    mesh.setMatrixAt(index, matrix);
    if (item.color !== undefined) mesh.setColorAt(index, new THREE.Color(item.color));
  });
  mesh.count = list.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Clapboard siding as a 2 m tile: boards, their shadows, and paint peeling to grey wood with wear. */
export function clapboard(colour: string, wear: number, random: () => number) {
  const map = paint(512, 512, (c) => {
    c.fillStyle = colour;
    c.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 32) {
      c.fillStyle = 'rgba(0,0,0,0.16)';
      c.fillRect(0, y + 27, 512, 5);
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.fillRect(0, y, 512, 3);
    }
    const peel = Math.round(wear * 26);
    for (let i = 0; i < peel; i++) {
      const x = random() * 512, y = Math.floor(random() * 16) * 32 + 4, w = 12 + random() * 70;
      c.fillStyle = random() < 0.5 ? '#9c9686' : '#b8b2a2';
      c.beginPath();
      c.moveTo(x, y);
      for (let k = 0; k <= 6; k++) c.lineTo(x + (w * k) / 6, y + random() * 6);
      for (let k = 6; k >= 0; k--) c.lineTo(x + (w * k) / 6, y + 18 + random() * 8);
      c.fill();
    }
    c.fillStyle = `rgba(70,60,45,${0.05 + wear * 0.12})`;
    for (let i = 0; i < 18; i++) c.fillRect(random() * 512, random() * 512, 2 + random() * 3, 20 + random() * 60);
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

/** Louvred shutter leaves. */
export function louvres(colour: string, wear: number, random: () => number) {
  return paint(128, 320, (c) => {
    c.fillStyle = colour;
    c.fillRect(0, 0, 128, 320);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(0, 0, 128, 10); c.fillRect(0, 310, 128, 10); c.fillRect(0, 0, 10, 320); c.fillRect(118, 0, 10, 320); c.fillRect(0, 152, 128, 12);
    for (let y = 16; y < 304; y += 11) {
      c.fillStyle = 'rgba(0,0,0,0.28)';
      c.fillRect(12, y + 7, 104, 4);
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.fillRect(12, y, 104, 2);
    }
    for (let i = 0; i < wear * 8; i++) { c.fillStyle = '#9c9686'; c.fillRect(random() * 110, random() * 300, 6 + random() * 14, 3 + random() * 8); }
  });
}
