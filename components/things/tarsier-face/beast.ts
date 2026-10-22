import * as THREE from 'three';
import type { BuildContext } from '@conjure/kit';

/** Small organic-modelling vocabulary shared by the canopy animals. Copied per component. */
export type V3 = readonly [number, number, number];
type Paint = THREE.Material;
const vec = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);

const lit = <T extends THREE.Object3D>(object: T): T => {
  object.castShadow = object.receiveShadow = true;
  return object;
};

/** An ellipsoid: the workhorse for skulls, bellies, cheeks and pads. */
export function blob(parent: THREE.Object3D, size: V3, at: V3, material: Paint, rot: V3 = [0, 0, 0], segments = 20) {
  const mesh = lit(new THREE.Mesh(new THREE.SphereGeometry(1, segments, Math.max(8, segments >> 1)), material));
  mesh.scale.set(size[0], size[1], size[2]);
  mesh.position.set(at[0], at[1], at[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  parent.add(mesh);
  return mesh;
}

export interface SweepOptions {
  /** Cross-section height over width; below 1 flattens it along `up`. */
  flat?: number;
  up?: V3;
  segments?: number;
  radial?: number;
}

/** A tube along a curve whose radius changes along its length: tails, limbs, noses, bills, boughs. */
export function sweep(parent: THREE.Object3D, points: readonly V3[], radius: number | ((t: number) => number), material: Paint, options: SweepOptions = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(vec), false, 'centripetal');
  const n = options.segments ?? Math.max(16, points.length * 7), m = options.radial ?? 10, flat = options.flat ?? 1;
  const r = typeof radius === 'number' ? () => radius : radius;
  const positions: number[] = [], index: number[] = [];
  const up = vec(options.up ?? [0, 1, 0]);
  const first = curve.getTangentAt(0);
  const normal = up.clone().addScaledVector(first, -up.dot(first));
  if (normal.lengthSq() < 1e-5) normal.set(1, 0, 0).addScaledVector(first, -first.x);
  normal.normalize();
  const side = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
    normal.addScaledVector(tangent, -normal.dot(tangent)).normalize();
    side.crossVectors(tangent, normal);
    const size = Math.max(r(t), 1e-5);
    for (let j = 0; j < m; j++) {
      const angle = (j / m) * Math.PI * 2, c = Math.cos(angle) * size, s = Math.sin(angle) * size * flat;
      positions.push(p.x + side.x * c + normal.x * s, p.y + side.y * c + normal.y * s, p.z + side.z * c + normal.z * s);
    }
  }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      const a = i * m + j, b = (i + 1) * m + j, c = i * m + ((j + 1) % m), d = (i + 1) * m + ((j + 1) % m);
      index.push(a, b, c, b, d, c);
    }
  const start = curve.getPointAt(0), end = curve.getPointAt(1), base = positions.length / 3;
  positions.push(start.x, start.y, start.z, end.x, end.y, end.z);
  for (let j = 0; j < m; j++) {
    index.push(base, j, (j + 1) % m);
    index.push(base + 1, n * m + ((j + 1) % m), n * m + j);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const mesh = lit(new THREE.Mesh(geometry, material));
  parent.add(mesh);
  return mesh;
}

export interface EyeOptions {
  at: V3;
  r: number;
  /** Direction of gaze in the parent's frame. */
  look?: V3;
  iris: THREE.ColorRepresentation;
  white?: THREE.ColorRepresentation;
  /** Iris radius as a fraction of the eyeball, 0..1. */
  irisSize?: number;
  /** Pupil radius as a fraction of the iris, 0..1. */
  pupil?: number;
  /** 0 wide open … 1 shut. */
  lid?: number;
  lower?: number;
  lidMaterial?: Paint;
  shine?: boolean;
}

/** A glossy eyeball with iris, pupil, catchlight and lids that really close. */
export function eye(parent: THREE.Object3D, o: EyeOptions) {
  const group = new THREE.Group();
  group.position.set(o.at[0], o.at[1], o.at[2]);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), vec(o.look ?? [0, 0, 1]).normalize());
  const gloss = { roughness: 0.18, metalness: 0.05 };
  group.add(lit(new THREE.Mesh(new THREE.SphereGeometry(o.r, 22, 14), new THREE.MeshStandardMaterial({ color: o.white ?? '#efe9dc', ...gloss }))));
  const cap = (radius: number, angle: number, material: Paint) => {
    const geometry = new THREE.SphereGeometry(radius, 22, 6, 0, Math.PI * 2, 0, angle);
    geometry.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    return mesh;
  };
  const irisAngle = Math.asin(Math.min(0.99, o.irisSize ?? 0.6));
  cap(o.r * 1.012, irisAngle, new THREE.MeshStandardMaterial({ color: o.iris, ...gloss }));
  cap(o.r * 1.026, Math.max(0.02, irisAngle * (o.pupil ?? 0.45)), new THREE.MeshStandardMaterial({ color: '#0b0a09', roughness: 0.1 }));
  if (o.shine !== false) {
    const glint = new THREE.Mesh(new THREE.SphereGeometry(o.r * 0.11, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.6, roughness: 0.1 }));
    glint.position.set(-o.r * 0.3, o.r * 0.36, o.r * 0.9);
    group.add(glint);
  }
  if (o.lidMaterial) {
    const lid = o.lid ?? 0, tilt = 0.45;
    const upper = new THREE.Mesh(new THREE.SphereGeometry(o.r * 1.075, 22, 10, 0, Math.PI * 2, 0, 0.3 + 1.45 * lid), o.lidMaterial);
    upper.rotation.x = tilt;
    const lower = new THREE.Mesh(new THREE.SphereGeometry(o.r * 1.07, 22, 8, 0, Math.PI * 2, 0, lid > 0.85 ? 1.02 : 0.55 + 0.45 * (o.lower ?? 0.3)), o.lidMaterial);
    lower.rotation.x = Math.PI - tilt;
    group.add(lit(upper), lit(lower));
  }
  parent.add(group);
  return group;
}

/** Many fur spikes in one draw call: ruffs, beards, crests, wet clumps. */
export function tufts(parent: THREE.Object3D, items: readonly { at: V3; dir: V3; len: number; r: number }[], material: Paint) {
  const geometry = new THREE.ConeGeometry(1, 1, 5);
  geometry.translate(0, 0.5, 0);
  const mesh = lit(new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1)));
  mesh.count = items.length;
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), yAxis = new THREE.Vector3(0, 1, 0);
  items.forEach((item, i) => {
    q.setFromUnitVectors(yAxis, vec(item.dir).normalize());
    matrix.compose(vec(item.at), q, new THREE.Vector3(item.r, item.len, item.r));
    mesh.setMatrixAt(i, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
  return mesh;
}

/** Flat pointed leaves, petals, ears of moss or shed feathers in one draw call. */
export function leaves(parent: THREE.Object3D, items: readonly { at: V3; size: number; rot: V3; long?: number }[], material: Paint) {
  const geometry = new THREE.SphereGeometry(1, 6, 4);
  geometry.scale(0.42, 0.05, 1);
  const mesh = lit(new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1)));
  mesh.count = items.length;
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  items.forEach((item, i) => {
    q.setFromEuler(e.set(item.rot[0], item.rot[1], item.rot[2]));
    matrix.compose(vec(item.at), q, new THREE.Vector3(item.size, item.size, item.size * (item.long ?? 1)));
    mesh.setMatrixAt(i, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
  return mesh;
}

/** A painted stroke texture: fur when the strokes are fine, bark when they are coarse. */
export function strokes(context: BuildContext, base: THREE.ColorRepresentation, streak: THREE.ColorRepresentation, options: { count?: number; length?: number; width?: number; vertical?: boolean } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const a = new THREE.Color(base), b = new THREE.Color(streak);
  ctx.fillStyle = `#${a.getHexString()}`;
  ctx.fillRect(0, 0, 128, 128);
  ctx.lineCap = 'round';
  const count = options.count ?? 260, length = options.length ?? 9;
  for (let i = 0; i < count; i++) {
    const x = context.random() * 128, y = context.random() * 128, k = context.random();
    ctx.strokeStyle = `#${a.clone().lerp(b, 0.25 + k * 0.75).getHexString()}`;
    ctx.globalAlpha = 0.35 + context.random() * 0.4;
    ctx.lineWidth = (options.width ?? 1.4) * (0.6 + context.random());
    ctx.beginPath();
    ctx.moveTo(x, y);
    const wobble = (context.random() - 0.5) * length * 0.5;
    if (options.vertical === false) ctx.lineTo(x + length * (0.6 + k), y + wobble);
    else ctx.lineTo(x + wobble, y + length * (0.6 + k));
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** A coat: base colour with finer streaks, dulled and greyed by wear. */
export function coat(context: BuildContext, base: THREE.ColorRepresentation, streak: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) {
  const grey = new THREE.Color('#8d857a'), wear = context.mood.wear * 0.22;
  const texture = strokes(context, new THREE.Color(base).lerp(grey, wear), new THREE.Color(streak).lerp(grey, wear));
  texture.repeat.set(3, 3);
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.88, ...options });
}

export function skin(colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6, ...options });
}

/** A mossy bough or stem with bark, moss pads on its upper side and a few epiphyte leaves. */
export function bough(parent: THREE.Object3D, context: BuildContext, points: readonly V3[], radius: number | ((t: number) => number), options: { moss?: number; leafy?: number; tone?: THREE.ColorRepresentation } = {}) {
  const bark = strokes(context, options.tone ?? '#6b5a48', '#3d3329', { count: 180, length: 22, width: 2.6, vertical: false });
  bark.repeat.set(1, 4);
  const barkMaterial = new THREE.MeshStandardMaterial({ map: bark, roughness: 0.95 });
  const mesh = sweep(parent, points, radius, barkMaterial, { radial: 12 });
  const curve = new THREE.CatmullRomCurve3(points.map(vec), false, 'centripetal');
  const r = typeof radius === 'number' ? () => radius : radius;
  const mossMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color('#5f8a3c').lerp(new THREE.Color('#7b7a4a'), context.mood.wear * 0.6), roughness: 1 });
  const pads = Math.round((options.moss ?? 0.5) * 16);
  for (let i = 0; i < pads; i++) {
    const t = context.random(), p = curve.getPointAt(t), tangent = curve.getTangentAt(t), size = r(t);
    const out = new THREE.Vector3(context.random() - 0.5, 0.9, context.random() - 0.5);
    out.addScaledVector(tangent, -out.dot(tangent)).normalize();
    blob(parent, [size * (0.5 + context.random() * 0.5), size * 0.28, size * (0.5 + context.random() * 0.6)], [p.x + out.x * size * 0.85, p.y + out.y * size * 0.85, p.z + out.z * size * 0.85], mossMaterial, [0, context.random() * 3, 0], 10);
  }
  const sprigs = Math.round((options.leafy ?? 0.4) * 14);
  if (sprigs > 0) {
    const items = [];
    for (let i = 0; i < sprigs; i++) {
      const t = context.random(), p = curve.getPointAt(t), size = r(t), turn = context.random() * Math.PI * 2;
      items.push({ at: [p.x + Math.cos(turn) * size * 0.6, p.y + size * 0.9, p.z + Math.sin(turn) * size * 0.6] as V3, size: size * (0.9 + context.random() * 0.9), rot: [-0.5 - context.random() * 0.7, turn, 0] as V3, long: 1.3 });
    }
    leaves(parent, items, new THREE.MeshStandardMaterial({ color: new THREE.Color('#3f7f45').lerp(new THREE.Color('#9a8a3a'), context.mood.wear * 0.5), roughness: 0.7, side: THREE.DoubleSide }));
  }
  return mesh;
}

/** Centre on the origin and stand on y = 0, measuring only solid surfaces. */
export function settle(root: THREE.Object3D) {
  const bounds = new THREE.Box3();
  root.updateWorldMatrix(true, true);
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = [mesh.material].flat()[0];
    if (material && (!material.depthWrite || material.opacity <= 0.2)) return;
    bounds.expandByObject(node, true);
  });
  if (!bounds.isEmpty()) {
    const centre = bounds.getCenter(new THREE.Vector3());
    root.position.set(-centre.x, -bounds.min.y, -centre.z);
  }
  return root;
}
