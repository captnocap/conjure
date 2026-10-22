import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Small local geometry helpers. Copied per component; nothing here is shared at runtime. */
export type V3 = readonly [number, number, number];

export function at(position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0], scale: V3 | number = 1) {
  const s: V3 = typeof scale === 'number' ? [scale, scale, scale] : scale;
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2])),
    new THREE.Vector3(...s),
  );
}

/** Points a +y geometry from one point toward another. */
export function aim(from: V3, to: V3, scale: V3 | number = 1) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const s: V3 = typeof scale === 'number' ? [scale, scale, scale] : scale;
  const direction = b.sub(a);
  if (direction.lengthSq() < 1e-12) direction.set(0, 1, 0);
  return new THREE.Matrix4().compose(a, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()), new THREE.Vector3(...s));
}

/** Collects geometry per material and merges each pile into one mesh, tinted per piece by vertex colour. */
export class Bag {
  private readonly piles = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(material: THREE.Material, geometry: THREE.BufferGeometry, matrix?: THREE.Matrix4, colour?: THREE.ColorRepresentation) {
    const piece = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();
    if (matrix) piece.applyMatrix4(matrix);
    for (const name of Object.keys(piece.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv' && name !== 'color') piece.deleteAttribute(name);
    piece.clearGroups();
    if (!piece.getAttribute('normal')) piece.computeVertexNormals();
    const count = piece.getAttribute('position').count;
    if (!piece.getAttribute('uv')) piece.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    if (!piece.getAttribute('color') || colour !== undefined) {
      const tint = new THREE.Color(colour ?? '#ffffff');
      const colours = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) colours.set([tint.r, tint.g, tint.b], i * 3);
      piece.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    }
    const pile = this.piles.get(material);
    if (pile) pile.push(piece); else this.piles.set(material, [piece]);
  }

  flush(parent: THREE.Object3D) {
    const meshes: THREE.Mesh[] = [];
    for (const [material, pile] of this.piles) {
      const merged = mergeGeometries(pile);
      for (const piece of pile) piece.dispose();
      if (!merged) continue;
      (material as THREE.MeshStandardMaterial).vertexColors = true;
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.piles.clear();
    return meshes;
  }
}

/** A tube along a smooth curve whose radius follows `radius(t)`, t from 0 to 1. */
export function taper(points: readonly V3[], radius: (t: number) => number, segments = 14, sides = 6) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [], indices: number[] = [];
  const point = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPoint(t, point);
    const r = Math.max(radius(t), 1e-5), n = frames.normals[i], b = frames.binormals[i];
    for (let j = 0; j < sides; j++) {
      const angle = (j / sides) * Math.PI * 2, c = Math.cos(angle) * r, s = Math.sin(angle) * r;
      positions.push(point.x + n.x * c + b.x * s, point.y + n.y * c + b.y * s, point.z + n.z * c + b.z * s);
    }
  }
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = i * sides + ((j + 1) % sides), c = a + sides, d = b + sides;
      indices.push(a, b, c, b, d, c);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Pushes vertices in and out along their direction from the origin so a smooth solid turns lumpy. */
export function lumpy<T extends THREE.BufferGeometry>(geometry: T, amount: number, frequency: number, seed: number): T {
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const n =
      Math.sin(x * frequency + seed) * Math.sin(y * frequency * 1.31 + seed * 1.7) * Math.sin(z * frequency * 0.87 + seed * 2.3) +
      0.5 * Math.sin(x * frequency * 2.3 + seed * 3.1 + z * frequency * 1.9) * Math.sin(y * frequency * 2.7 + seed * 0.7);
    const k = 1 + n * amount;
    position.setXYZ(i, x * k, y * k, z * k);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function painted(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export const ball = (radius: number, detail = 12) => new THREE.SphereGeometry(radius, detail, Math.max(6, Math.round(detail * 0.7)));

/** A clear bead of water. Low opacity and no depth write, so it is not measured as solid. */
export const water = () => new THREE.MeshStandardMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.5, roughness: 0.04, metalness: 0.35, depthWrite: false, emissive: '#9fc4d6', emissiveIntensity: 0.25 });
