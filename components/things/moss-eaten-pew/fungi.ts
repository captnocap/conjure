import * as THREE from 'three';

/** Shared fungal vocabulary for the fungal-cathedral set. Copied into each component's folder. */
export type P3 = readonly [number, number, number];
type Rand = () => number;

function put<T extends THREE.Object3D>(parent: THREE.Object3D, node: T, at: P3 = [0, 0, 0]) {
  node.position.set(at[0], at[1], at[2]);
  node.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true;
  });
  parent.add(node);
  return node;
}

export function paint(color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...options });
}

export function glow(color: THREE.ColorRepresentation, intensity: number, options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.55, ...options });
}

/** The top of a mushroom cap: rim at y = 0, apex at y = height. shape 0 flat plate … 1 round dome … 2 pointed bell. */
export function domeGeometry(radius: number, height: number, shape = 1, segments = 18) {
  const points: THREE.Vector2[] = [new THREE.Vector2(radius * 0.9, -height * 0.16)];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const round = Math.cos((t * Math.PI) / 2);
    const bell = (1 - t) ** 1.9;
    const across = shape <= 1 ? round : round + (bell - round) * (shape - 1);
    const up = shape <= 1 ? Math.sin((t * Math.PI) / 2) ** (1.6 - shape * 0.8) : t ** 0.8;
    points.push(new THREE.Vector2(Math.max(radius * across, 0.0004), height * up));
  }
  return new THREE.LatheGeometry(points, segments);
}

export function gillGeometry(radius: number, height: number, stalk: number, segments = 18) {
  return new THREE.LatheGeometry(
    [new THREE.Vector2(stalk * 0.8, height * 0.3), new THREE.Vector2(radius * 0.55, height * 0.06), new THREE.Vector2(radius * 0.9, -height * 0.16)],
    segments,
  );
}

export interface MushroomOptions {
  at: P3;
  height: number;
  cap: number;
  capHeight?: number;
  stalk?: number;
  shape?: number;
  lean?: readonly [number, number];
  capMat: THREE.Material;
  gillMat: THREE.Material;
  stalkMat: THREE.Material;
}

/** A stalked mushroom standing at `at`. Three meshes. */
export function mushroom(parent: THREE.Object3D, o: MushroomOptions) {
  const group = new THREE.Group();
  const stalk = o.stalk ?? o.cap * 0.2;
  const capHeight = o.capHeight ?? o.cap * 0.75;
  if (o.lean) group.rotation.set(o.lean[0], 0, o.lean[1]);
  put(group, new THREE.Mesh(new THREE.CylinderGeometry(stalk * 0.75, stalk * 1.2, o.height, 9), o.stalkMat), [0, o.height / 2, 0]);
  const y = o.height - capHeight * 0.3;
  put(group, new THREE.Mesh(domeGeometry(o.cap, capHeight, o.shape ?? 1), o.capMat), [0, y, 0]);
  put(group, new THREE.Mesh(gillGeometry(o.cap, capHeight, stalk), o.gillMat), [0, y, 0]);
  return put(parent, group, o.at);
}

/** One-piece toadstool for instancing: unit height, cap radius 0.45. */
export function toadstoolGeometry(shape = 1) {
  const points = [new THREE.Vector2(0.11, 0), new THREE.Vector2(0.08, 0.62), new THREE.Vector2(0.4, 0.56), new THREE.Vector2(0.45, 0.64)];
  for (let i = 1; i <= 5; i++) {
    const t = i / 5;
    points.push(new THREE.Vector2(Math.max(0.45 * Math.cos((t * Math.PI) / 2) ** (shape > 1 ? 1.7 : 1), 0.001), 0.64 + 0.36 * Math.sin((t * Math.PI) / 2)));
  }
  return new THREE.LatheGeometry(points, 10);
}

/**
 * A shelf fungus: a half disc with zoned bands, its flat side at z = 0 and bulging toward +z.
 * Colours run underside, rim, then alternating bands to the wall.
 */
export function bracketGeometry(radius: number, thick: number, colours: readonly THREE.ColorRepresentation[], wobble = 0.08, phase = 0, segments = 22) {
  const profile: [number, number, number][] = [
    [0.02, -0.55, 0], [0.5, -0.5, 0], [0.88, -0.25, 0], [1, 0, 1], [0.95, 0.16, 2], [0.8, 0.3, 3], [0.6, 0.42, 2], [0.4, 0.52, 3], [0.2, 0.6, 2], [0.02, 0.64, 3],
  ];
  const geometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x * radius, y * thick)), segments, -Math.PI / 2, Math.PI);
  const position = geometry.getAttribute('position');
  const tints = colours.map((colour) => new THREE.Color(colour));
  const colour = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i);
    const swell = 1 + wobble * Math.sin(Math.atan2(x, z) * 5 + phase) + wobble * 0.5 * Math.sin(Math.atan2(x, z) * 11 + phase * 2);
    position.setXYZ(i, x * swell, position.getY(i), z * swell);
    const tint = tints[profile[i % profile.length][2] % tints.length];
    colour.set([tint.r, tint.g, tint.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colour, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function bracket(parent: THREE.Object3D, o: { at: P3; radius: number; thick?: number; yaw?: number; tilt?: number; colours: readonly THREE.ColorRepresentation[]; phase?: number; material?: THREE.MeshStandardMaterialParameters }) {
  const mesh = new THREE.Mesh(
    bracketGeometry(o.radius, o.thick ?? o.radius * 0.28, o.colours, 0.08, o.phase ?? 0),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide, ...o.material }),
  );
  mesh.rotation.order = 'YXZ';
  mesh.rotation.y = o.yaw ?? 0;
  mesh.rotation.x = o.tilt ?? 0;
  return put(parent, mesh, o.at);
}

/** A sagging strand of mycelium or chain between two points. */
export function strand(parent: THREE.Object3D, from: P3, to: P3, sag: number, radius: number, material: THREE.Material, random?: Rand) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const points = [0, 0.33, 0.66, 1].map((t) => {
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    if (random && t > 0 && t < 1) p.add(new THREE.Vector3(random() - 0.5, 0, random() - 0.5).multiplyScalar(sag * 0.5));
    return p;
  });
  return put(parent, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 10, radius, 5), material));
}

/** Many copies of one geometry with per-copy colour, stretch and turn, in one draw call. */
export function cluster(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  items: readonly { at: P3; size: number | P3; color?: THREE.ColorRepresentation; turn?: P3 }[],
) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1));
  mesh.count = items.length;
  const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), euler = new THREE.Euler();
  items.forEach((item, index) => {
    const size = typeof item.size === 'number' ? [item.size, item.size, item.size] : item.size;
    euler.set(...(item.turn ?? [0, 0, 0]) as [number, number, number]);
    matrix.compose(new THREE.Vector3(...item.at), turn.setFromEuler(euler), new THREE.Vector3(size[0], size[1], size[2]));
    mesh.setMatrixAt(index, matrix);
    if (item.color !== undefined) mesh.setColorAt(index, new THREE.Color(item.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return put(parent, mesh);
}

/** A mottled surface: blotches of the given colours over a base. */
export function mottle(random: Rand, base: string, spots: readonly string[], count = 140, size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = 0.25 + random() * 0.55;
    ctx.fillStyle = spots[Math.floor(random() * spots.length)];
    ctx.beginPath();
    ctx.arc(random() * size, random() * size, (0.01 + random() ** 2 * 0.09) * size, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Drifting glowing motes. They are see-through, so they are not measured as part of the object. */
export function motes(parent: THREE.Object3D, color: THREE.ColorRepresentation, items: readonly { at: P3; size: number }[], opacity = 0.85) {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const mesh = cluster(parent, new THREE.IcosahedronGeometry(1, 0), material, items);
  mesh.castShadow = mesh.receiveShadow = false;
  return mesh;
}

export { put };
