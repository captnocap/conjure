import * as THREE from 'three';
import { type Thing, disposeTree, visibleBounds } from '@conjure/kit';

export type Rand = () => number;
export type V3 = readonly [number, number, number];
export const range = (r: Rand, a: number, b: number) => a + (b - a) * r();
export const pick = <T>(r: Rand, list: readonly T[]): T => list[Math.min(list.length - 1, Math.floor(r() * list.length))];
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Smooth seeded noise in roughly -1..1, a function of position so seams stay welded. */
export function noise(r: Rand) {
  const waves = Array.from({ length: 7 }, () => [range(r, -1, 1), range(r, -1, 1), range(r, -1, 1), r() * 6.283] as const);
  return (x: number, y: number, z: number, frequency = 1) => {
    let sum = 0;
    waves.forEach((k, i) => {
      const octave = 1 + i * 0.75;
      sum += Math.sin((k[0] * x + k[1] * y + k[2] * z) * frequency * octave * 2.3 + k[3]) / octave;
    });
    return sum / 2.3;
  };
}

/** Push each vertex along its normal by fn(position). */
export function displace<G extends THREE.BufferGeometry>(geometry: G, fn: (p: THREE.Vector3, n: THREE.Vector3) => number): G {
  const position = geometry.attributes.position, normal = geometry.attributes.normal;
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    n.fromBufferAttribute(normal, i);
    const d = fn(p, n);
    position.setXYZ(i, p.x + n.x * d, p.y + n.y * d, p.z + n.z * d);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Vertex colours from position; pair with a material that has vertexColors: true. */
export function paint<G extends THREE.BufferGeometry>(geometry: G, fn: (p: THREE.Vector3, out: THREE.Color, index: number) => void): G {
  const position = geometry.attributes.position;
  const colours = new Float32Array(position.count * 3);
  const p = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    fn(p, c, i);
    colours[i * 3] = c.r; colours[i * 3 + 1] = c.g; colours[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return geometry;
}

/** A polar grid disc lying on y = 0 whose height is h(x, z); rings run out to radius(angle). */
export function terrainDisc(rings: number, segments: number, radius: (angle: number) => number, height: (x: number, z: number, t: number) => number) {
  const position: number[] = [], index: number[] = [];
  position.push(0, height(0, 0, 0), 0);
  for (let ring = 1; ring <= rings; ring++) {
    const t = ring / rings;
    for (let s = 0; s < segments; s++) {
      const angle = (s / segments) * Math.PI * 2, r = radius(angle) * t;
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      position.push(x, height(x, z, t), z);
    }
  }
  for (let s = 0; s < segments; s++) index.push(0, 1 + ((s + 1) % segments), 1 + s);
  for (let ring = 1; ring < rings; ring++) {
    const a0 = 1 + (ring - 1) * segments, b0 = 1 + ring * segments;
    for (let s = 0; s < segments; s++) {
      const s1 = (s + 1) % segments;
      index.push(a0 + s, a0 + s1, b0 + s, a0 + s1, b0 + s1, b0 + s);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export function mat(color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...options });
}

export function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: V3 = [0, 0, 0], scale: V3 | number = 1, rotation: V3 = [0, 0, 0], shadow = true) {
  const m = new THREE.Mesh(geometry, material);
  if (typeof scale === 'number') m.scale.setScalar(scale); else m.scale.set(scale[0], scale[1], scale[2]);
  m.rotation.set(rotation[0], rotation[1], rotation[2]);
  m.position.set(at[0], at[1], at[2]);
  m.castShadow = m.receiveShadow = shadow;
  parent.add(m);
  return m;
}

export interface Spot { at: V3; scale?: V3 | number; rot?: V3; color?: THREE.ColorRepresentation }

/** Many copies in one draw call. */
export function instances(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, spots: readonly Spot[]) {
  const im = new THREE.InstancedMesh(geometry, material, Math.max(spots.length, 1));
  im.count = spots.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  spots.forEach((spot, i) => {
    const sc = spot.scale ?? 1;
    if (typeof sc === 'number') s.setScalar(sc); else s.set(sc[0], sc[1], sc[2]);
    const rot = spot.rot ?? [0, 0, 0];
    q.setFromEuler(e.set(rot[0], rot[1], rot[2]));
    m.compose(p.set(spot.at[0], spot.at[1], spot.at[2]), q, s);
    im.setMatrixAt(i, m);
    if (spot.color !== undefined) im.setColorAt(i, new THREE.Color(spot.color));
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = im.receiveShadow = true;
  parent.add(im);
  return im;
}

/** A canvas painted locally and wrapped as a texture. */
export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, colour = true) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  if (colour) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Centre the visible object on x and z but keep y = 0 as the ground, so pits and footings stay buried. */
export function grounded(root: THREE.Object3D, options: { footprint?: number; update?: Thing['update']; lift?: boolean; measure?: THREE.Object3D } = {}): Thing {
  const bounds = visibleBounds(options.measure ?? root);
  if (!bounds.isEmpty()) {
    const centre = bounds.getCenter(new THREE.Vector3());
    root.position.set(-centre.x, options.lift ? -bounds.min.y : 0, -centre.z);
  }
  const thing: Thing = { object: root, dispose: () => disposeTree(root) };
  if (options.footprint !== undefined) thing.footprint = options.footprint;
  if (options.update) thing.update = options.update;
  return thing;
}
