import * as THREE from 'three';

export type Rand = () => number;
export type V3 = readonly [number, number, number];
export const range = (r: Rand, a: number, b: number) => a + (b - a) * r();
export const pick = <T>(r: Rand, list: readonly T[]): T => list[Math.min(list.length - 1, Math.floor(r() * list.length))];

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
export function paint<G extends THREE.BufferGeometry>(geometry: G, fn: (p: THREE.Vector3, out: THREE.Color) => void): G {
  const position = geometry.attributes.position;
  const colours = new Float32Array(position.count * 3);
  const p = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    fn(p, c);
    colours[i * 3] = c.r; colours[i * 3 + 1] = c.g; colours[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return geometry;
}

export function mat(color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...options });
}

export function add<T extends THREE.Object3D>(parent: THREE.Object3D, child: T, at: V3 = [0, 0, 0]): T {
  child.position.set(at[0], at[1], at[2]);
  child.traverse((node) => { if ((node as THREE.Mesh).isMesh) node.castShadow = node.receiveShadow = true; });
  parent.add(child);
  return child;
}

export function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: V3 = [0, 0, 0], scale: V3 | number = 1, rotation: V3 = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  if (typeof scale === 'number') m.scale.setScalar(scale); else m.scale.set(scale[0], scale[1], scale[2]);
  m.rotation.set(rotation[0], rotation[1], rotation[2]);
  return add(parent, m, at);
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
  im.frustumCulled = false;
  parent.add(im);
  return im;
}

/** A tube through points. */
export function tube(parent: THREE.Object3D, points: readonly V3[], radius: number, material: THREE.Material, radial = 8, segments = 0) {
  const path = new THREE.CatmullRomCurve3(points.map((q) => new THREE.Vector3(q[0], q[1], q[2])));
  return mesh(parent, new THREE.TubeGeometry(path, segments || Math.max(12, points.length * 6), radius, radial, false), material);
}

/** A tapered cylinder between two points. */
export function rod(parent: THREE.Object3D, from: V3, to: V3, radius: number, material: THREE.Material, endRadius = radius, radial = 8) {
  const a = new THREE.Vector3(from[0], from[1], from[2]), b = new THREE.Vector3(to[0], to[1], to[2]);
  const d = b.clone().sub(a);
  const m = mesh(parent, new THREE.CylinderGeometry(endRadius, radius, Math.max(d.length(), 1e-4), radial), material, a.clone().add(b).multiplyScalar(0.5).toArray() as [number, number, number]);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

/** Sit the assembly on y = 0, centred in x and z, measuring only solid meshes. */
export function settle(root: THREE.Object3D, measure: (root: THREE.Object3D) => THREE.Box3) {
  const bounds = measure(root);
  if (!bounds.isEmpty()) {
    const centre = bounds.getCenter(new THREE.Vector3());
    root.position.set(-centre.x, -bounds.min.y, -centre.z);
  }
}
