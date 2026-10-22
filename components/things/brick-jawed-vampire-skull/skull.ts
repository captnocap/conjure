import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * A human skull in "skull units": the cranium is centred on the origin with radius about 1,
 * the upper teeth end near y = -1.07 and the chin near y = -1.44. One unit is about 93 mm.
 */
export const SKULL = { top: 0.88, base: -0.56, teeth: -1.07, chin: -1.44, unit: 0.093 } as const;
/** Centre of each eye socket's opening, for whatever a builder wants to set into it. */
export const SOCKET: readonly [number, number, number] = [0.33, -0.19, 0.74];

export interface SkullSpec {
  bone: THREE.ColorRepresentation;
  /** Colour pooled in the sockets and nose. */
  hollow: THREE.ColorRepresentation;
  /** Colour of age blotches, and how strong they are (0..1). */
  stain: THREE.ColorRepresentation;
  blotch: number;
  random: () => number;
  jaw: 'closed' | 'open' | 'missing';
  /** Radians the jaw hangs open by. */
  gape?: number;
  upper?: (index: number) => boolean;
  lower?: (index: number) => boolean;
  /** 0 ordinary canines … 1 unmistakable fangs. */
  fang?: number;
  /** 0 bare bone … 1 dried skin: shallower sockets and a shrunken nose instead of a hole. */
  flesh?: number;
  roughness?: number;
  tooth?: THREE.ColorRepresentation;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The undeformed cranium surface along a direction, for laying hair, veils and wax on it. */
export function surface(direction: THREE.Vector3, lift = 1): THREE.Vector3 {
  const d = direction.clone().normalize();
  const p = new THREE.Vector3(d.x * 0.78, d.y * 0.88, d.z * (d.z < 0 ? 1.06 : 0.98));
  if (d.y < 0) {
    const t = -d.y;
    p.y = -0.88 * t * lerp(0.6, 1, smooth(-0.25, 0.55, d.z));
    p.x *= 1 - 0.3 * t * t;
  }
  return p.multiplyScalar(lift);
}

export function buildSkull(spec: SkullSpec) {
  const { random } = spec;
  const flesh = spec.flesh ?? 0;
  const root = new THREE.Group();
  const geometry = new THREE.SphereGeometry(1, 72, 48);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const colours = new Float32Array(position.count * 3);
  const bone = new THREE.Color(spec.bone), hollow = new THREE.Color(spec.hollow), stain = new THREE.Color(spec.stain);
  const o = [random() * 9, random() * 9, random() * 9, random() * 9];
  const d = new THREE.Vector3(), c = new THREE.Vector3(), tint = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    d.fromBufferAttribute(position, i).normalize();
    const p = surface(d);
    let dark = 0;
    for (const side of [-1, 1]) {
      const angle = d.angleTo(c.set(side * 0.42, -0.2, 0.885).normalize());
      const k = 1 - smooth(0.15, 0.36, angle);
      p.x -= side * 0.05 * k;
      p.z -= 0.3 * k * (1 - flesh * 0.5);
      dark = Math.max(dark, smooth(0.15, 0.75, k));
      const cheek = Math.exp(-((d.angleTo(c.set(side * 0.64, -0.44, 0.62).normalize()) / 0.2) ** 2));
      p.addScaledVector(c, 0.09 * cheek);
      const temple = Math.exp(-((d.angleTo(c.set(side * 0.9, -0.05, 0.4).normalize()) / 0.24) ** 2));
      p.x -= side * 0.06 * temple;
    }
    if (d.z > 0) {
      const dy = d.y + 0.56;
      const half = 0.04 + 0.11 * smooth(0.15, -0.12, dy);
      const k = 1 - smooth(0.55, 1.15, Math.max(Math.abs(d.x) / half, Math.abs(dy) / 0.17));
      if (flesh < 0.5) { p.z -= 0.24 * k; dark = Math.max(dark, k); } else p.z += 0.1 * k * smooth(0.2, -0.1, dy);
      const brow = Math.exp(-(((d.y - 0.03) / 0.07) ** 2)) * smooth(0.3, 0.7, d.z) * smooth(0.8, 0.3, Math.abs(d.x));
      p.z += 0.05 * brow;
    }
    position.setXYZ(i, p.x, p.y, p.z);
    const noise = 0.5 + 0.28 * Math.sin(d.x * 5 + o[0]) * Math.sin(d.y * 6 + o[1]) + 0.22 * Math.sin(d.z * 9 + o[2]) * Math.sin(d.x * 11 + o[3]);
    tint.copy(bone).lerp(stain, spec.blotch * smooth(0.42, 0.8, noise) * 0.75).lerp(hollow, dark * (1 - flesh * 0.25));
    colours.set([tint.r, tint.g, tint.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  const roughness = spec.roughness ?? 0.82;
  const skin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness });
  const plain = new THREE.MeshStandardMaterial({ color: bone.clone().lerp(stain, spec.blotch * 0.2), roughness });
  const ivory = new THREE.MeshStandardMaterial({ color: spec.tooth ?? bone.clone().lerp(new THREE.Color('#fff6dc'), 0.45), roughness: 0.5 });
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material, at: readonly [number, number, number]) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(...at);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const cranium = add(root, geometry, skin, [0, 0, 0]);

  // Upper jaw, cheek arches.
  add(root, new THREE.CylinderGeometry(0.39, 0.36, 0.44, 24), plain, [0, -0.75, 0.38]).scale.z = 1.08;
  const bar = (parent: THREE.Object3D, from: readonly [number, number, number], to: readonly [number, number, number], radius: number, squash = 1) => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), along = b.clone().sub(a);
    const mesh = add(parent, new THREE.CylinderGeometry(radius, radius, along.length(), 10), plain, a.add(b).multiplyScalar(0.5).toArray() as [number, number, number]);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize());
    mesh.scale.set(squash, 1, 1 / Math.sqrt(squash));
    return mesh;
  };
  for (const side of [-1, 1]) bar(root, [side * 0.6, -0.42, 0.56], [side * 0.67, -0.36, -0.08], 0.05);

  const teeth = (parent: THREE.Object3D, upper: boolean, keep: (index: number) => boolean) => {
    for (let i = 0; i < 12; i++) {
      if (!keep(i)) continue;
      const phi = (i - 5.5) * 0.2, canine = i === 3 || i === 8, molar = i < 2 || i > 9;
      const fang = canine ? (spec.fang ?? 0) : 0;
      const length = (upper ? 0.13 : 0.1) * (0.85 + random() * 0.3) + fang * (upper ? 0.34 : 0.12);
      const wide = molar ? 0.05 : 0.04;
      const geo = new THREE.CylinderGeometry(upper ? wide : wide * (1 - fang * 0.8), upper ? wide * (fang > 0.25 ? 0.2 : 0.8) : wide, length, 7);
      const radius = upper ? 0.36 : 0.32;
      const y = upper ? -0.955 - length / 2 : -1.15 + length / 2;
      const tooth = add(parent, geo, ivory, [Math.sin(phi) * radius, y, 0.38 + Math.cos(phi) * radius * 1.08]);
      tooth.rotation.set((random() - 0.5) * 0.12, phi, (random() - 0.5) * 0.12);
    }
  };
  teeth(root, true, spec.upper ?? (() => true));

  let jaw: THREE.Group | null = null;
  if (spec.jaw !== 'missing') {
    jaw = new THREE.Group();
    jaw.position.set(0, -0.56, -0.03);
    const inner = new THREE.Group();
    inner.position.set(0, 0.56, 0.03);
    jaw.add(inner);
    const arc = 3.6;
    const body = new THREE.TorusGeometry(0.36, 0.085, 10, 28, arc);
    body.rotateZ(Math.PI / 2 - arc / 2);
    body.rotateX(Math.PI / 2);
    body.scale(1, 1.7, 1.05);
    add(inner, body, plain, [0, -1.295, 0.38]);
    add(inner, new THREE.SphereGeometry(1, 14, 10), plain, [0, -1.35, 0.75]).scale.set(0.17, 0.11, 0.09);
    for (const side of [-1, 1]) bar(inner, [side * 0.37, -1.36, 0.3], [side * 0.52, -0.6, -0.03], 0.1, 0.45);
    teeth(inner, false, spec.lower ?? (() => true));
    if (spec.jaw === 'open') jaw.rotation.x = spec.gape ?? 0.4;
    root.add(jaw);
  }
  return { root, cranium, jaw, skin, plain, ivory };
}

/** Many thin tapering strands (hair, wire, drips) merged into one mesh. Points are in the caller's units. */
export function strands(paths: readonly (readonly THREE.Vector3[])[], radius: number, material: THREE.Material, sides = 4) {
  const parts = paths.filter((path) => path.length > 1).map((path) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([...path]), Math.max(4, path.length * 2), radius, sides, false));
  const mesh = new THREE.Mesh(parts.length ? mergeGeometries(parts) : new THREE.BufferGeometry(), material);
  for (const part of parts) part.dispose();
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** A long bone lying along +x, centred, with a knuckle at each end. Length and thickness in the caller's units. */
export function longBone(length: number, thick: number, material: THREE.Material) {
  const shaft = new THREE.CylinderGeometry(thick * 0.7, thick * 0.85, length, 10);
  shaft.rotateZ(Math.PI / 2);
  const parts: THREE.BufferGeometry[] = [shaft];
  for (const end of [-1, 1]) for (const z of [-1, 1]) {
    const knob = new THREE.SphereGeometry(thick * 1.05, 10, 8);
    knob.translate(end * length / 2, 0, z * thick * 0.6);
    parts.push(knob);
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts), material);
  for (const part of parts) part.dispose();
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** A canvas painted by the caller, as a colour texture. */
export function painted(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A patch that hugs the cranium: longitudes around +z (radians each way) and polar angles from the crown. */
export function capPatch(turn: number, halfWidth: number, from: number, to: number, lift: number) {
  const geo = new THREE.SphereGeometry(1, 28, 14, Math.PI / 2 + turn - halfWidth, halfWidth * 2, from, to - from);
  const position = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    const p = surface(v.fromBufferAttribute(position, i), lift);
    position.setXYZ(i, p.x, p.y, p.z);
  }
  geo.computeVertexNormals();
  return geo;
}
