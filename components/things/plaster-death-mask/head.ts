import * as THREE from 'three';

/**
 * A small stylised head kit, in "head units": the skull is about 2 units tall and faces +z.
 * Scale the group that holds these parts by HEAD (metres per unit) to get a life-size head.
 */
export const HEAD = 0.115;

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Push a point on the unit sphere out to the surface of the head. `jaw` 0 closed … 1 hanging open. */
export function shape(p: THREE.Vector3, jaw = 0, out = new THREE.Vector3()): THREE.Vector3 {
  const { x, y, z } = p;
  const t = Math.max(0, -y);
  let X = x * 0.8, Y = y * 1.08, Z = z * 0.95;
  X *= 1 - 0.36 * Math.pow(t, 1.6);
  if (z < 0) Z *= 1.06 * (1 - 0.45 * t);
  else Z *= 0.9 * (1 - 0.1 * t * t);
  Y -= jaw * 0.3 * smooth(0.3, 0.8, t);
  if (z > 0) {
    const front = smooth(0, 0.35, z);
    for (const sx of [-1, 1]) Z -= front * 0.1 * Math.exp(-((x - sx * 0.33) ** 2) / 0.022 - ((y - 0.1) ** 2) / 0.012);
    Z += front * 0.05 * Math.exp(-((y - 0.28) ** 2) / 0.004 - (x * x) / 0.25);
    Z += front * 0.045 * Math.exp(-((Math.abs(x) - 0.45) ** 2) / 0.03 - ((y + 0.12) ** 2) / 0.03);
    Z += front * 0.07 * Math.exp(-(x * x) / 0.03 - ((y + 0.86) ** 2) / 0.02);
    Z += front * 0.04 * Math.exp(-(x * x) / 0.06 - ((y + 0.5) ** 2) / 0.04);
  }
  return out.set(X, Y, Z);
}

/** The point on the face for sphere coordinates (x right, y up), both roughly -0.8 … 0.8. */
export function at(x: number, y: number, jaw = 0, lift = 0): THREE.Vector3 {
  const z = Math.sqrt(Math.max(0.0001, 1 - x * x - y * y));
  const p = shape(new THREE.Vector3(x, y, z), jaw);
  if (lift) p.add(new THREE.Vector3(x * 0.6, y * 0.3, z).normalize().multiplyScalar(lift));
  return p;
}

/** A sphere geometry pushed through `shape`. `keep` drops triangles (for wounds, masks and cut-aways). */
export function skin(options: {
  jaw?: number; inflate?: number; tilt?: number; cap?: number; detail?: number;
  keep?: (dir: THREE.Vector3, surface: THREE.Vector3) => boolean;
} = {}): THREE.BufferGeometry {
  const detail = options.detail ?? 44;
  const geometry = new THREE.SphereGeometry(1, detail, Math.round(detail * 0.75), 0, Math.PI * 2, 0, options.cap ?? Math.PI);
  if (options.tilt) geometry.rotateX(options.tilt);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const dir = new THREE.Vector3(), out = new THREE.Vector3();
  const dirs: THREE.Vector3[] = [];
  for (let i = 0; i < position.count; i++) {
    dir.fromBufferAttribute(position, i).normalize();
    dirs.push(dir.clone());
    shape(dir, options.jaw ?? 0, out);
    if (options.inflate) out.addScaledVector(dir, options.inflate);
    position.setXYZ(i, out.x, out.y, out.z);
  }
  if (options.keep && geometry.index) {
    const index = geometry.index.array, kept: number[] = [];
    const centre = new THREE.Vector3(), surface = new THREE.Vector3();
    for (let i = 0; i < index.length; i += 3) {
      centre.copy(dirs[index[i]]).add(dirs[index[i + 1]]).add(dirs[index[i + 2]]).normalize();
      shape(centre, options.jaw ?? 0, surface);
      if (options.keep(centre, surface)) kept.push(index[i], index[i + 1], index[i + 2]);
    }
    geometry.setIndex(kept);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export interface FaceParts {
  group: THREE.Group;
  add<T extends THREE.Object3D>(node: T): T;
  ball(size: [number, number, number], at: THREE.Vector3 | [number, number, number], material: THREE.Material, segments?: number): THREE.Mesh;
  tube(points: THREE.Vector3[], radius: number, material: THREE.Material): THREE.Mesh;
}

export function parts(group: THREE.Group): FaceParts {
  const add = <T extends THREE.Object3D>(node: T) => {
    node.traverse((m) => { m.castShadow = true; m.receiveShadow = true; });
    group.add(node);
    return node;
  };
  const unit = new THREE.SphereGeometry(1, 18, 12);
  return {
    group, add,
    ball(size, where, material) {
      const mesh = new THREE.Mesh(unit, material);
      mesh.scale.set(...size);
      if (Array.isArray(where)) mesh.position.set(...where); else mesh.position.copy(where);
      return add(mesh);
    },
    tube(points, radius, material) {
      return add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(12, points.length * 6), radius, 6), material));
    },
  };
}

export function nose(f: FaceParts, material: THREE.Material, size = 1, jaw = 0) {
  const tip = at(0, -0.17, jaw);
  f.ball([0.1 * size, 0.24, 0.13 * size], [0, 0.02, tip.z - 0.02], material).rotation.x = -0.35;
  f.ball([0.115 * size, 0.1 * size, 0.12 * size], [0, tip.y, tip.z + 0.06 * size], material);
  for (const sx of [-1, 1]) f.ball([0.065 * size, 0.06 * size, 0.07 * size], [sx * 0.09 * size, tip.y - 0.02, tip.z + 0.01], material);
}

export function ears(f: FaceParts, material: THREE.Material, size = 1, skip: -1 | 0 | 1 = 0) {
  for (const sx of [-1, 1] as const) {
    if (sx === skip) continue;
    const ear = f.ball([0.07, 0.2 * size, 0.13 * size], [sx * 0.8, 0.0, -0.08], material);
    ear.rotation.set(0, sx * -0.5, sx * -0.12);
  }
}

export interface EyeSpec {
  side: -1 | 1;
  /** 0 wide open … 0.5 heavy … 1 shut */
  lid: number;
  white: THREE.Material;
  iris: THREE.Material;
  pupil: THREE.Material;
  lidMaterial: THREE.Material;
  look?: [number, number];
  pupilSize?: number;
}

/** An eyeball set into its socket with upper and lower lids. Returns the turning eyeball. */
export function eye(f: FaceParts, spec: EyeSpec): THREE.Group {
  const centre = at(spec.side * 0.33, 0.1);
  centre.z -= 0.075;
  const r = 0.128;
  const ball = new THREE.Group();
  ball.position.copy(centre);
  ball.add(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), spec.white));
  const iris = new THREE.Mesh(new THREE.SphereGeometry(r * 1.015, 18, 5, 0, Math.PI * 2, 0, 0.6), spec.iris);
  iris.rotation.x = Math.PI / 2;
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), spec.pupil);
  const ps = spec.pupilSize ?? 0.26;
  pupil.scale.set(ps, ps, 0.1);
  pupil.position.z = r * 0.95;
  ball.add(iris, pupil);
  ball.rotation.set(-(spec.look?.[1] ?? 0), spec.look?.[0] ?? 0, 0);
  f.add(ball);
  const lidGeo = new THREE.SphereGeometry(r * 1.09, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const upper = new THREE.Mesh(lidGeo, spec.lidMaterial);
  upper.position.copy(centre);
  upper.rotation.x = -0.75 + spec.lid * 2.2;
  const lower = new THREE.Mesh(lidGeo, spec.lidMaterial);
  lower.position.copy(centre);
  lower.rotation.x = Math.PI + 0.95 - spec.lid * 0.75;
  f.add(upper); f.add(lower);
  return ball;
}

export function brow(f: FaceParts, side: -1 | 1, material: THREE.Material, tilt = 0, weight = 0.03) {
  const a = at(side * 0.14, 0.31 + tilt * 0.09, 0, 0.02), b = at(side * 0.36, 0.36, 0, 0.02), c = at(side * 0.56, 0.3 - tilt * 0.09, 0, 0.02);
  return f.tube([a, b, c], weight, material);
}

export interface MouthSpec {
  /** 0 closed … 1 gaping; pass the same value used for the skin. */
  jaw: number;
  /** -1 frown … 1 smile */
  curve: number;
  lip: THREE.Material;
  dark: THREE.Material;
  teeth?: THREE.Material;
  width?: number;
}

export function mouth(f: FaceParts, spec: MouthSpec) {
  const w = spec.width ?? 0.27, jaw = spec.jaw;
  const line = (yOff: number, lift: number, bend: number) => [-1, -0.5, 0, 0.5, 1].map((u) =>
    at(u * w, -0.5 + yOff + spec.curve * 0.07 * (u * u - 0.4) - bend * (1 - u * u), jaw * 0.35, lift));
  if (jaw < 0.12) {
    f.tube(line(0, 0.012, 0), 0.016, spec.dark);
    f.tube(line(0.035, 0.008, -0.012), 0.026, spec.lip);
    f.tube(line(-0.04, 0.006, 0.014), 0.03, spec.lip);
    return;
  }
  const gap = 0.05 + jaw * 0.2;
  const mid = at(0, -0.5 - gap * 0.5, jaw * 0.6);
  f.ball([w * 0.78, gap * 0.95, 0.09], [mid.x, mid.y, mid.z - 0.035], spec.dark);
  f.tube(line(0.045, 0.004, -0.02), 0.028, spec.lip);
  const lower = [-1, -0.5, 0, 0.5, 1].map((u) => at(u * w * 0.95, -0.5 - gap * (1.25 - 0.55 * u * u) + spec.curve * 0.05 * (u * u), jaw, 0.004));
  f.tube(lower, 0.03, spec.lip);
  if (spec.teeth) {
    const tooth = new THREE.BoxGeometry(0.045, 0.06, 0.03);
    for (let i = -3; i <= 3; i++) {
      const top = new THREE.Mesh(tooth, spec.teeth);
      top.position.copy(at(i * 0.05, -0.5 - 0.005, jaw * 0.35, -0.03));
      f.add(top);
      if (jaw > 0.3 && Math.abs(i) < 3) {
        const bottom = new THREE.Mesh(tooth, spec.teeth);
        bottom.position.copy(at(i * 0.048, -0.5 - gap * 1.05, jaw, -0.05));
        f.add(bottom);
      }
    }
  }
}

/** Neck and a slab of shoulders cut flat at the chest. The base sits at y = -2.75 head units. */
export function shoulders(f: FaceParts, neck: THREE.Material, top: THREE.Material, cloth: THREE.Material, width = 1.75) {
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 0.9, 20), neck);
  column.position.set(0, -1.25, -0.12);
  f.add(column);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), top);
  dome.scale.set(width, 0.62, 0.78);
  dome.position.set(0, -2.1, -0.12);
  f.add(dome);
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.94, 0.65, 28), cloth);
  chest.scale.set(width, 1, 0.78);
  chest.position.set(0, -2.425, -0.12);
  f.add(chest);
  return { baseY: -2.75, top: -1.48 };
}

/** A cap of hair following the skull. `back` tilts the hairline off the forehead. */
export function hairCap(material: THREE.Material, reach = 1.45, back = -0.45, inflate = 0.05) {
  const mesh = new THREE.Mesh(skin({ cap: reach, tilt: back, inflate, detail: 32 }), material);
  mesh.castShadow = true;
  return mesh;
}
