// Shared graveyard vocabulary, copied into each component folder that needs it.
import * as THREE from 'three';

export type Rand = () => number;
export type V3 = readonly [number, number, number];

export const paint = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.86, ...options });

export const shade = (a: THREE.ColorRepresentation, b: THREE.ColorRepresentation, t: number) =>
  new THREE.Color(a).lerp(new THREE.Color(b), Math.min(1, Math.max(0, t)));

export function put(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: V3 = [0, 0, 0], turn: V3 = [0, 0, 0], size: V3 | number = 1) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...at);
  mesh.rotation.set(...turn);
  if (typeof size === 'number') mesh.scale.setScalar(size);
  else mesh.scale.set(...size);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** A capsule or tapered limb between two points. */
export function limb(parent: THREE.Object3D, from: V3, to: V3, r0: number, r1: number, material: THREE.Material, sides = 10) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const d = b.clone().sub(a);
  const mesh = put(parent, new THREE.CylinderGeometry(r1, r0, Math.max(d.length(), 1e-4), sides), material, a.clone().add(b).multiplyScalar(0.5).toArray() as [number, number, number]);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}

export interface Bit { p: V3; r?: V3; s: V3 | number; c?: THREE.ColorRepresentation }
/** Many copies of one solid in a single draw call, each with its own turn, size and tint. */
export function many(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, bits: readonly Bit[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(bits.length, 1));
  mesh.count = bits.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  bits.forEach((bit, i) => {
    e.set(...(bit.r ?? [0, 0, 0]));
    q.setFromEuler(e);
    if (typeof bit.s === 'number') s.setScalar(bit.s);
    else s.set(...bit.s);
    m.compose(p.set(...bit.p), q, s);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(bit.c ?? '#ffffff'));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  parent.add(mesh);
  return mesh;
}

/** A lumpy heap of earth: a half dome pushed about by a few seeded waves. */
export function mound(parent: THREE.Object3D, random: Rand, rx: number, h: number, rz: number, material: THREE.Material, at: V3 = [0, 0, 0], lump = 0.22) {
  const g = new THREE.SphereGeometry(1, 30, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = g.attributes.position;
  const k = [random() * 6, random() * 6, random() * 6, random() * 6];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = Math.sin(x * 5.1 + k[0]) * Math.sin(z * 4.3 + k[1]) + 0.6 * Math.sin(x * 9.7 + z * 8.1 + k[2]) + 0.4 * Math.sin(z * 13 + k[3]);
    const f = 1 + n * lump * (0.35 + y * 0.65);
    pos.setXYZ(i, x * f, y * f, z * f);
  }
  g.computeVertexNormals();
  return put(parent, g, material, at, [0, 0, 0], [rx, h, rz]);
}

/** Thrown clods of soil around a point, denser near the centre. */
export function clods(parent: THREE.Object3D, random: Rand, count: number, inner: number, outer: number, size: number, colours: readonly string[], at: V3 = [0, 0, 0]) {
  const bits: Bit[] = [];
  for (let i = 0; i < count; i++) {
    const a = random() * Math.PI * 2, d = inner + (outer - inner) * random() ** 1.7;
    const s = size * (0.4 + random() * 1.1);
    bits.push({ p: [at[0] + Math.cos(a) * d, at[1] + s * 0.35, at[2] + Math.sin(a) * d], r: [random() * 3, random() * 3, random() * 3], s: [s, s * (0.6 + random() * 0.5), s * (0.7 + random() * 0.6)], c: colours[Math.floor(random() * colours.length)] });
  }
  return many(parent, new THREE.IcosahedronGeometry(1, 0), paint('#ffffff', { roughness: 1, flatShading: true }), bits);
}

/** Tufts of grass blades in a ring or patch. `keep` rejects positions (for instance, over a hole). */
export function grass(parent: THREE.Object3D, random: Rand, count: number, radius: number, height: number, colours: readonly string[], keep: (x: number, z: number) => boolean = () => true, at: V3 = [0, 0, 0]) {
  const blade = new THREE.ConeGeometry(0.5, 1, 4);
  blade.translate(0, 0.5, 0);
  const bits: Bit[] = [];
  for (let i = 0; i < count; i++) {
    const a = random() * Math.PI * 2, d = radius * Math.sqrt(random());
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!keep(x, z)) continue;
    const h = height * (0.45 + random() * 0.9);
    bits.push({ p: [at[0] + x, at[1], at[2] + z], r: [(random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.7], s: [h * 0.13, h, h * 0.06], c: colours[Math.floor(random() * colours.length)] });
  }
  return many(parent, blade, paint('#ffffff', { roughness: 0.9 }), bits);
}

/** Slabs of split turf tipped outward around a break in the ground. */
export function turfSlabs(parent: THREE.Object3D, random: Rand, count: number, radius: number, size: number, soil: THREE.Material, green: THREE.Material, at: V3 = [0, 0, 0], lift = 0.5) {
  for (let i = 0; i < count; i++) {
    const a = (i + random() * 0.6) / count * Math.PI * 2;
    const w = size * (0.7 + random() * 0.7), d = size * (0.6 + random() * 0.6), t = size * 0.22;
    const holder = new THREE.Group();
    holder.position.set(at[0] + Math.cos(a) * radius, at[1] + t * 0.3 + random() * size * 0.12, at[2] + Math.sin(a) * radius);
    holder.rotation.y = -a + Math.PI / 2 + (random() - 0.5) * 0.5;
    parent.add(holder);
    // Local +z points inward to the break; the inner edge is thrown upward.
    put(holder, new THREE.BoxGeometry(w, t, d), [soil, soil, green, soil, soil, soil], [0, 0, 0], [(0.15 + random() * lift), 0, (random() - 0.5) * 0.35]);
  }
}

/** Skin, cloth or stone with painted blotches, veins and speckle, so large plain surfaces are not flat colour. */
export function mottled(random: Rand, base: THREE.ColorRepresentation, marks: readonly { color: string; count: number; size: number; alpha?: number; line?: boolean }[], size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = `#${new THREE.Color(base).getHexString()}`;
  ctx.fillRect(0, 0, size, size);
  for (const mark of marks) {
    ctx.globalAlpha = mark.alpha ?? 0.5;
    ctx.fillStyle = ctx.strokeStyle = mark.color;
    for (let i = 0; i < mark.count; i++) {
      const x = random() * size, y = random() * size, r = mark.size * size * (0.4 + random());
      if (mark.line) {
        ctx.lineWidth = Math.max(1, mark.size * size * 0.25);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + (random() - 0.5) * r * 4, y + r * 2, x + (random() - 0.5) * r * 5, y + r * 4, x + (random() - 0.5) * r * 6, y + r * 7);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * (0.5 + random() * 0.7), random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Carved lettering on a small canvas, for stones, tags and paper. Lines are centred and shrunk to fit. */
export function lettered(lines: readonly string[], options: { ink?: string; paper?: string; width?: number; height?: number; font?: string; grime?: number; random?: Rand; vertical?: boolean } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = options.width ?? 256;
  canvas.height = options.height ?? 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = options.paper ?? '#8f928c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const random = options.random;
  if (random && options.grime) {
    for (let i = 0; i < 60 * options.grime; i++) {
      ctx.globalAlpha = 0.12 + random() * 0.2;
      ctx.fillStyle = random() < 0.5 ? '#3c4a2c' : '#2e2a26';
      ctx.beginPath();
      ctx.ellipse(random() * canvas.width, random() * canvas.height, 4 + random() * 22, 3 + random() * 14, random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = options.ink ?? '#2b2d2b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const font = options.font ?? 'Georgia, "Times New Roman", serif';
  if (options.vertical) {
    const chars = [...lines.join('')];
    const step = canvas.height / (chars.length + 1);
    ctx.font = `bold ${Math.min(step * 0.95, canvas.width * 0.8)}px ${font}`;
    chars.forEach((ch, i) => ctx.fillText(ch, canvas.width / 2, step * (i + 1)));
  } else {
    const step = canvas.height / (lines.length + 1);
    lines.forEach((line, i) => {
      const px = Math.min(step * (i === 0 ? 0.95 : 0.7), (canvas.width * 1.75) / Math.max(line.length, 3));
      ctx.font = `bold ${px}px ${font}`;
      ctx.fillText(line, canvas.width / 2, step * (i + 1), canvas.width * 0.9);
    });
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export type StoneShape = 'round' | 'shoulder' | 'slab' | 'cross' | 'gothic';
/** A headstone standing on y = 0 at the origin, face toward +z. Returns the group and the face size. */
export function headstone(parent: THREE.Object3D, shape: StoneShape, width: number, height: number, thick: number, stone: THREE.Material, face: THREE.Texture | null) {
  const group = new THREE.Group();
  parent.add(group);
  const w = width / 2;
  const outline = new THREE.Shape();
  if (shape === 'cross') {
    const arm = width * 0.16, bar = height * 0.62;
    outline.moveTo(-arm, 0); outline.lineTo(arm, 0); outline.lineTo(arm, bar - arm); outline.lineTo(w, bar - arm); outline.lineTo(w, bar + arm);
    outline.lineTo(arm, bar + arm); outline.lineTo(arm, height); outline.lineTo(-arm, height); outline.lineTo(-arm, bar + arm); outline.lineTo(-w, bar + arm);
    outline.lineTo(-w, bar - arm); outline.lineTo(-arm, bar - arm); outline.closePath();
  } else {
    outline.moveTo(-w, 0); outline.lineTo(w, 0);
    if (shape === 'round') { outline.lineTo(w, height - w); outline.absarc(0, height - w, w, 0, Math.PI, false); }
    else if (shape === 'shoulder') {
      const s = height - w * 0.95;
      outline.lineTo(w, s); outline.lineTo(w * 0.72, s); outline.absarc(0, s, w * 0.72, 0, Math.PI, false); outline.lineTo(-w, s);
    } else if (shape === 'gothic') { outline.lineTo(w, height - w * 1.1); outline.quadraticCurveTo(w * 0.9, height - w * 0.3, 0, height); outline.quadraticCurveTo(-w * 0.9, height - w * 0.3, -w, height - w * 1.1); }
    else { outline.lineTo(w, height); outline.lineTo(-w, height); }
    outline.closePath();
  }
  const geometry = new THREE.ExtrudeGeometry(outline, { depth: thick, bevelEnabled: true, bevelSize: thick * 0.12, bevelThickness: thick * 0.12, bevelSegments: 1, curveSegments: 10 });
  geometry.translate(0, 0, -thick / 2);
  put(group, geometry, stone);
  if (face) {
    const fw = shape === 'cross' ? width * 0.3 : width * 0.82, fh = shape === 'cross' ? height * 0.5 : height * 0.56;
    const plate = put(group, new THREE.PlaneGeometry(fw, fh), new THREE.MeshStandardMaterial({ map: face, roughness: 0.95 }), [0, shape === 'cross' ? height * 0.27 : height * 0.42, thick * 0.63 + 0.002]);
    plate.castShadow = false;
  }
  return group;
}

export interface HandSpec {
  /** Curl in radians per joint for thumb, index, middle, ring, little. */
  curls: readonly number[];
  spread: number;
  flesh: THREE.Material;
  bone: THREE.Material;
  nail: THREE.Material;
  /** Per finger (thumb first): true shows bare bone. */
  bare: readonly boolean[];
  /** True strips the palm to metacarpals as well. */
  skeleton: boolean;
  nailLength: number;
  size?: number;
  left?: boolean;
}
export interface Hand { group: THREE.Group; joints: THREE.Object3D[][]; rest: number[] }

/** A hand with jointed fingers. Wrist at the origin, fingers toward +y, palm facing +z. */
export function buildHand(spec: HandSpec): Hand {
  const group = new THREE.Group();
  const k = spec.size ?? 1;
  const joints: THREE.Object3D[][] = [];
  const palmW = 0.088 * k, palmH = 0.098 * k, palmT = 0.03 * k;
  if (spec.skeleton) {
    for (let i = 0; i < 6; i++) put(group, new THREE.SphereGeometry(0.012 * k, 8, 6), spec.bone, [(i % 3 - 1) * 0.02 * k, (i < 3 ? 0.008 : 0.026) * k, 0], [0, 0, 0], [1.1, 0.8, 0.9]);
    for (let i = 0; i < 4; i++) limb(group, [(i - 1.5) * 0.014 * k, 0.03 * k, 0], [(i - 1.5) * 0.024 * k, palmH, 0], 0.0055 * k, 0.0065 * k, spec.bone, 6);
  } else {
    const palm = put(group, new THREE.SphereGeometry(1, 14, 10), spec.flesh, [0, palmH * 0.52, 0], [0, 0, 0], [palmW * 0.56, palmH * 0.6, palmT * 0.62]);
    palm.name = 'palm';
    put(group, new THREE.SphereGeometry(1, 10, 8), spec.flesh, [-palmW * 0.3, palmH * 0.3, palmT * 0.3], [0, 0, 0.5], [palmW * 0.26, palmH * 0.36, palmT * 0.5]);
  }
  const finger = (index: number, base: V3, lens: readonly number[], r: number, splay: number, yaw: number) => {
    const chain: THREE.Object3D[] = [];
    let holder: THREE.Object3D = group;
    const bare = spec.bare[index] || spec.skeleton;
    lens.forEach((len, i) => {
      const joint = new THREE.Group();
      if (i === 0) { joint.position.set(...base); joint.rotation.z = splay; joint.rotation.y = yaw; }
      else joint.position.set(0, lens[i - 1], 0);
      joint.rotation.x = spec.curls[index] * (i === 0 ? 0.75 : 1);
      holder.add(joint);
      chain.push(joint);
      const rr = r * (1 - i * 0.13);
      if (bare) {
        put(joint, new THREE.CylinderGeometry(rr * 0.42, rr * 0.5, len, 6), spec.bone, [0, len / 2, 0]);
        put(joint, new THREE.SphereGeometry(rr * 0.78, 8, 6), spec.bone, [0, 0, 0]);
        if (i === lens.length - 1) put(joint, new THREE.ConeGeometry(rr * 0.5, len * 0.35, 6), spec.bone, [0, len * 1.1, 0]);
      } else {
        put(joint, new THREE.CapsuleGeometry(rr, len, 3, 8), spec.flesh, [0, len / 2, 0]);
        if (i === lens.length - 1) {
          const n = spec.nailLength * k;
          put(joint, new THREE.ConeGeometry(rr * 0.85, len * 0.5 + n, 5), spec.nail, [0, len * 0.85 + n / 2, -rr * 0.45], [0.12, 0, 0], [1, 1, 0.45]);
        }
      }
      holder = joint;
    });
    joints.push(chain);
  };
  finger(0, [-palmW * 0.52, palmH * 0.2, palmT * 0.2], [0.042 * k, 0.034 * k], 0.0115 * k, 0.75 + spec.spread * 0.5, -0.5);
  const lengths = [0.078, 0.088, 0.08, 0.062];
  lengths.forEach((length, i) => {
    const x = (i - 1.5) * palmW * 0.27;
    finger(i + 1, [x, palmH * (i === 3 ? 0.9 : 1), 0], [length * 0.45 * k, length * 0.31 * k, length * 0.25 * k], 0.0098 * k * (i === 3 ? 0.88 : 1), -(i - 1.5) * spec.spread * 0.42, 0);
  });
  if (spec.left) group.scale.x = -1;
  return { group, joints, rest: [...spec.curls] };
}

/** Flex a hand's fingers around their resting curl. */
export function flexHand(hand: Hand, time: number, amount: number, speed: number) {
  hand.joints.forEach((chain, f) => {
    const wave = Math.sin(time * speed + f * 0.9) * amount;
    chain.forEach((joint, i) => { joint.rotation.x = Math.max(-0.12, hand.rest[f] + wave) * (i === 0 ? 0.75 : 1); });
  });
}
