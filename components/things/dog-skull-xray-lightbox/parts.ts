import * as THREE from 'three';

export type V3 = readonly [number, number, number];

/** An ellipsoid added to any parent group. */
export function ball(parent: THREE.Object3D, material: THREE.Material, at: V3, size: V3, rot: V3 = [0, 0, 0], segments = 20) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, Math.max(8, segments >> 1)), material);
  mesh.position.set(...at);
  mesh.scale.set(...size);
  mesh.rotation.set(...rot);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** A torus arc, for wrinkles, lids, collars and smiles. */
export function arc(parent: THREE.Object3D, material: THREE.Material, radius: number, tube: number, angle: number, at: V3, rot: V3 = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 32, angle), material);
  mesh.position.set(...at);
  mesh.rotation.set(...rot);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

export function cyl(parent: THREE.Object3D, material: THREE.Material, top: number, bottom: number, height: number, at: V3, rot: V3 = [0, 0, 0], segments = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material);
  mesh.position.set(...at);
  mesh.rotation.set(...rot);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function cone(parent: THREE.Object3D, material: THREE.Material, radius: number, height: number, at: V3, rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1], segments = 16) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, segments), material);
  mesh.position.set(...at);
  mesh.rotation.set(...rot);
  mesh.scale.set(...scale);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function tube(parent: THREE.Object3D, material: THREE.Material, points: readonly V3[], radius: number, closed = false) {
  const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(16, points.length * 6), radius, 8, closed), material);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

export const paint = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...options });

/** A tapering swept tube: beaks, tails, tongues, horns. `squash` flattens it across x. */
export function horn(parent: THREE.Object3D, material: THREE.Material, points: readonly V3[], radius: (t: number) => number, squash = 1, rings = 20, sides = 12) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(rings, false);
  const positions: number[] = [], index: number[] = [];
  const offset = new THREE.Vector3();
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, p = curve.getPointAt(t), r = Math.max(radius(t), 0.00001);
    for (let j = 0; j < sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      offset.copy(frames.normals[i]).multiplyScalar(Math.cos(angle) * r).addScaledVector(frames.binormals[i], Math.sin(angle) * r);
      offset.x *= squash;
      positions.push(p.x + offset.x, p.y + offset.y, p.z + offset.z);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < sides; j++) {
    const a = i * sides + j, b = i * sides + (j + 1) % sides, c = a + sides, d = b + sides;
    index.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
