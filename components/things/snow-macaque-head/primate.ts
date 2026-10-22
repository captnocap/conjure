import * as THREE from 'three';
import { Sculpture, type BuildContext } from '@conjure/kit';

/** Shared monkey anatomy, copied into each primate component's own folder. */
export type V3 = readonly [number, number, number];

export interface TuftOptions {
  centre: V3;
  radii: V3;
  count: number;
  colour: string;
  tip: string;
  length: number;
  width: number;
  /** Direction the coat is combed toward, and how strongly (0 stands straight out). */
  comb?: V3;
  combAmount?: number;
  keep?: (direction: THREE.Vector3, point: THREE.Vector3) => boolean;
  aim?: (direction: THREE.Vector3) => THREE.Vector3;
  ragged?: number;
}

/** A coat of fur: one instanced mesh of small spikes standing on an ellipsoid. */
export function tufts(s: Sculpture, o: TuftOptions) {
  const random = s.context.random;
  const geometry = new THREE.ConeGeometry(1, 1, 4, 1);
  geometry.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }), o.count);
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), p = new THREE.Vector3(), n = new THREE.Vector3();
  const q = new THREE.Quaternion(), scale = new THREE.Vector3(), m = new THREE.Matrix4();
  const comb = new THREE.Vector3(...(o.comb ?? [0, -1, 0])).normalize();
  const base = new THREE.Color(o.colour), tip = new THREE.Color(o.tip), tint = new THREE.Color();
  const ragged = o.ragged ?? 0.3;
  let made = 0;
  for (let tries = 0; tries < o.count * 6 && made < o.count; tries++) {
    const u = random() * 2 - 1, turn = random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    d.set(r * Math.cos(turn), u, r * Math.sin(turn));
    p.set(d.x * o.radii[0], d.y * o.radii[1], d.z * o.radii[2]);
    if (o.keep && !o.keep(d, p)) continue;
    if (o.aim) n.copy(o.aim(d)).normalize();
    else n.set(d.x / o.radii[0], d.y / o.radii[1], d.z / o.radii[2]).normalize().lerp(comb, o.combAmount ?? 0.4).normalize();
    q.setFromUnitVectors(up, n);
    const long = o.length * (1 - ragged + random() * ragged * 2);
    scale.set(o.width * (0.7 + random() * 0.6), long, o.width * (0.7 + random() * 0.6));
    p.multiplyScalar(0.93).add(new THREE.Vector3(...o.centre));
    m.compose(p, q, scale);
    mesh.setMatrixAt(made, m);
    mesh.setColorAt(made, tint.copy(base).lerp(tip, random()));
    made++;
  }
  mesh.count = made;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  s.root.add(mesh);
  return mesh;
}

export type Mouth = 'closed' | 'frown' | 'threat' | 'grimace' | 'pout' | 'squall' | 'smack';

export interface HeadSpec {
  skin: string;
  fur: string;
  tip: string;
  iris: string;
  /** 1 is an adult macaque ear. */
  ear: number;
  /** 1 is an adult macaque muzzle; less is a flat baby face. */
  muzzle: number;
  /** 0 soft … 1 a heavy overhanging ridge. */
  brow: number;
  /** 0 shut … 1 open … 1.3 staring. */
  eyeOpen: number;
  mouth: Mouth;
  /** Cheek pouches, 0 empty … 1 bulging. */
  cheek: number;
  furLength: number;
  furCount: number;
  /** A ruff of long hair framing the face, 0 none … 1 full. */
  ruff?: number;
  ruffColour?: string;
  ruffTip?: string;
  /** Dark centre-parted cap of hair, as on an infant. */
  parted?: string;
  scars?: boolean;
  wrinkles?: boolean;
  eyeSize?: number;
  ragged?: number;
}

/** A monkey head of radius 1 centred on the origin and facing +z. Scale and place the returned group. */
export function monkeyHead(context: BuildContext, spec: HeadSpec) {
  const h = new Sculpture(context);
  const skin = h.material(spec.skin, { roughness: 0.7 });
  const shade = h.material(new THREE.Color(spec.skin).multiplyScalar(0.62), { roughness: 0.8 });
  const fur = h.material(spec.fur, { roughness: 0.95 });
  const dark = h.material('#1a1210', { roughness: 0.6 });
  const tooth = h.material('#f1ead2', { roughness: 0.4 });
  const tongue = h.material('#d4566a', { roughness: 0.5 });

  h.ball([1, 0.96, 1.02], [0, 0, 0], fur, 24);
  h.ball([0.68, 0.72, 0.5], [0, -0.05, 0.55], skin, 24);
  // Brow ridge: its shadow is what makes the stare.
  const browRadius = 0.07 + spec.brow * 0.07;
  h.tube([[-0.56, 0.2, 0.82], [-0.27, 0.36 + spec.brow * 0.03, 1.02], [0, 0.31, 1.06 + spec.brow * 0.04], [0.27, 0.36 + spec.brow * 0.03, 1.02], [0.56, 0.2, 0.82]], browRadius, spec.brow > 0.6 ? shade : skin);

  const eyeSize = spec.eyeSize ?? 1;
  const open = spec.eyeOpen;
  for (const side of [-1, 1]) {
    const ex = side * 0.25, ey = 0.1, ez = 0.92, er = 0.135 * eyeSize;
    h.ball([er * 1.25, er * 1.25, er * 0.9], [ex, ey, ez - 0.04], shade, 14);
    h.ball([er, er, er], [ex, ey, ez], h.material(spec.iris, { roughness: 0.25, emissive: spec.iris, emissiveIntensity: 0.12 }), 16);
    h.ball([er * 0.52, er * 0.52, er * 0.3], [ex, ey, ez + er * 0.8], dark, 12);
    h.ball([er * 0.16, er * 0.16, er * 0.1], [ex + er * 0.3, ey + er * 0.3, ez + er * 0.93], h.material('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }), 8);
    const cap = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(118 - open * 84, 18, 120));
    const lid = h.mesh(new THREE.SphereGeometry(er * 1.1, 16, 10, 0, Math.PI * 2, 0, cap), skin, [ex, ey, ez]);
    lid.rotation.x = THREE.MathUtils.degToRad(48);
    if (open < 0.2) {
      // A shut eye still needs a line to read at a distance.
      h.tube([[ex - er, ey - er * 0.35, ez + er * 0.72], [ex, ey - er * 0.72, ez + er * 0.98], [ex + er, ey - er * 0.35, ez + er * 0.72]], 0.022, dark);
    }
    // Ears.
    const ear = h.ball([0.09 * spec.ear, 0.27 * spec.ear, 0.21 * spec.ear], [side * (0.93 + 0.05 * spec.ear), 0.1, -0.02], skin, 14);
    ear.rotation.y = side * -0.5;
    const inner = h.ball([0.05 * spec.ear, 0.18 * spec.ear, 0.13 * spec.ear], [side * (0.97 + 0.07 * spec.ear), 0.1, 0.04], shade, 10);
    inner.rotation.y = side * -0.5;
    if (spec.cheek > 0.02) {
      const bulge = 0.16 + spec.cheek * 0.3;
      h.ball([bulge, bulge * 0.95, bulge], [side * (0.38 + spec.cheek * 0.12), -0.62 - spec.cheek * 0.1, 0.6], skin, 16);
    }
  }

  // Muzzle, nose and mouth.
  const mz = 0.9, mrz = 0.12 + 0.3 * spec.muzzle, front = mz + mrz;
  const gape = { closed: 0, frown: 0, threat: 0.75, grimace: 0.3, pout: 0, squall: 1, smack: 0.12 }[spec.mouth];
  h.ball([0.4, 0.27, mrz], [0, -0.3, mz], skin, 20);
  h.ball([0.13, 0.26, 0.12], [0, -0.06, 0.98], skin, 12);
  for (const side of [-1, 1]) h.ball([0.04, 0.03, 0.03], [side * 0.07, -0.2, front - 0.035], dark, 8);
  const jawY = -0.5 - gape * 0.3;
  h.ball([0.33, 0.17, mrz * 0.92], [0, jawY, mz - 0.04], skin, 16);
  const lip = (y: number, bend: number, wide: number): V3[] => [-1, -0.5, 0, 0.5, 1].map((t) => {
    const angle = t * wide;
    return [Math.sin(angle) * 0.39, y + bend * t * t, mz + Math.cos(angle) * mrz * 0.97] as const;
  });
  if (gape > 0) {
    h.ball([0.27, 0.05 + gape * 0.16, mrz * 0.85], [0, -0.5 - gape * 0.12, mz + 0.03], dark, 16);
    if (spec.mouth === 'squall' || spec.mouth === 'smack') h.ball([0.14, 0.05, 0.16], [0, jawY + 0.13, front - 0.14 + (spec.mouth === 'smack' ? 0.12 : 0)], tongue, 10);
    if (spec.mouth === 'threat') for (const side of [-1, 1]) {
      const fang = h.mesh(new THREE.ConeGeometry(0.045, 0.2, 8), tooth, [side * 0.19, -0.6, front - 0.1]);
      fang.rotation.x = Math.PI;
      h.mesh(new THREE.ConeGeometry(0.035, 0.13, 8), tooth, [side * 0.13, jawY + 0.17, front - 0.1]);
    }
  }
  if (spec.mouth === 'grimace') {
    // Lips drawn back off a clenched fence of teeth.
    h.tube(lip(-0.55, 0.06, 1.15), 0.075, tooth);
    h.tube(lip(-0.55, 0.06, 1.2), 0.02, dark);
    for (let i = -3; i <= 3; i++) h.box([0.012, 0.15, 0.02], [Math.sin(i * 0.3) * 0.39, -0.55 + 0.06 * (i / 3.8) ** 2, mz + Math.cos(i * 0.3) * mrz * 0.97 + 0.07], dark);
  } else if (spec.mouth === 'pout' || spec.mouth === 'smack') {
    const ring = h.ring(0.11, 0.055, [0, -0.44, front + 0.02], skin);
    ring.scale.set(1, 0.85, 1.6);
    h.ball([0.07, 0.055, 0.04], [0, -0.44, front + 0.05], dark, 10);
  } else if (gape === 0) {
    h.tube(lip(-0.47, spec.mouth === 'frown' ? -0.09 : 0.05, 1.05), 0.024, dark);
  }

  if (spec.scars) {
    h.rod([0.38, 0.5, 0.86], [0.12, -0.02, 1.06], 0.022, h.material('#f3d9cf'));
    h.rod([-0.5, -0.1, 0.84], [-0.36, -0.36, 0.95], 0.02, h.material('#f3d9cf'));
  }
  if (spec.wrinkles) {
    for (const y of [0.5, 0.6]) h.tube([[-0.3, y - 0.03, 0.94 - (y - 0.5) * 0.5], [0, y + 0.02, 1.0 - (y - 0.5) * 0.5], [0.3, y - 0.03, 0.94 - (y - 0.5) * 0.5]], 0.014, shade);
    for (const side of [-1, 1]) h.tube([[side * 0.12, -0.08, 1.0], [side * 0.27, -0.13, 0.98], [side * 0.4, -0.06, 0.9]], 0.014, shade);
  }

  const inFace = (p: THREE.Vector3) => p.z > 0 && (p.x / 0.7) ** 2 + ((p.y + 0.05) / 0.74) ** 2 < 1;
  tufts(h, {
    centre: [0, 0, 0], radii: [1, 0.96, 1.02], count: spec.furCount, colour: spec.fur, tip: spec.tip, length: spec.furLength, width: 0.085,
    comb: [0, -0.45, -0.8], combAmount: 0.5, ragged: spec.ragged, keep: (_d, p) => !inFace(p),
  });
  if (spec.ruff) {
    tufts(h, {
      centre: [0, -0.08, 0.3], radii: [0.92, 0.95, 0.5], count: Math.round(170 * spec.ruff), colour: spec.ruffColour ?? spec.fur, tip: spec.ruffTip ?? spec.tip,
      length: 0.34 + spec.ruff * 0.36, width: 0.1, ragged: spec.ragged,
      keep: (d, p) => d.z > -0.2 && d.z < 0.72 && !((p.x / 0.6) ** 2 + ((p.y - 0.02) / 0.62) ** 2 < 1) && !(d.y > 0.55 && spec.parted !== undefined),
      aim: (d) => new THREE.Vector3(d.x, d.y - 0.25, 0.3),
    });
  }
  if (spec.parted) {
    tufts(h, {
      centre: [0, 0.05, -0.02], radii: [1.02, 1, 1.03], count: 150, colour: spec.parted, tip: spec.parted, length: 0.34, width: 0.13, ragged: 0.2,
      keep: (d, p) => d.y > 0.42 && !(p.z > 0.55 && p.y < 0.62),
      aim: (d) => new THREE.Vector3(Math.sign(d.x || 1) * 1, -0.25, -0.15),
    });
  }
  return h.root;
}

/** A tapering limb through several joints, with rounded knuckles so it never shows a gap. */
export function limb(s: Sculpture, points: readonly V3[], from: number, to: number, material: THREE.Material) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = from + (to - from) * (i / (points.length - 1)), b = from + (to - from) * ((i + 1) / (points.length - 1));
    s.rod(points[i], points[i + 1], a, material, b);
    s.ball([b, b, b], points[i + 1], material, 10);
  }
  s.ball([from, from, from], points[0], material, 10);
}

export interface BodySpec {
  /** Seat to shoulder, metres. */
  height: number;
  girth: number;
  fur: string;
  tip: string;
  belly: string;
  skin: string;
  /** 0 bolt upright … 1 curled over its knees. */
  hunch: number;
  limbWidth?: number;
  furLength?: number;
  ragged?: number;
  /** Override where a hand ends up, in body units relative to the seat. */
  rightHand?: V3;
  leftHand?: V3;
  /** One leg hanging off the perch instead of drawn up. */
  dangle?: boolean;
}

/** A seated monkey body with its rump on the origin, facing +z. Returns where the head and hands go. */
export function sittingBody(s: Sculpture, o: BodySpec) {
  const H = o.height, g = o.girth, w = (o.limbWidth ?? 1) * H;
  const fur = s.material(o.fur, { roughness: 0.95 });
  const skin = s.material(o.skin, { roughness: 0.75 });
  const lean = o.hunch * 0.22 * H;
  s.ball([0.36 * H * g, 0.3 * H, 0.36 * H * g], [0, 0.27 * H, -0.02 * H], fur, 18);
  const chest = s.ball([0.31 * H * g, 0.4 * H, 0.29 * H * g], [0, 0.62 * H, lean * 0.55], fur, 18);
  chest.rotation.x = o.hunch * 0.45;
  s.ball([0.23 * H * g, 0.3 * H, 0.16 * H * g], [0, 0.5 * H, 0.2 * H * g + lean * 0.3], s.material(o.belly, { roughness: 0.95 }), 14);
  tufts(s, {
    centre: [0, 0.5 * H, lean * 0.3], radii: [0.37 * H * g, 0.54 * H, 0.36 * H * g], count: 260, colour: o.fur, tip: o.tip, length: (o.furLength ?? 0.16) * H, width: 0.035 * H,
    comb: [0, -1, -0.15], combAmount: 0.6, ragged: o.ragged, keep: (d) => !(d.z > 0.55 && Math.abs(d.x) < 0.5) && d.y > -0.75,
  });
  const neck: V3 = [0, 0.98 * H, lean + 0.06 * H];
  const hands: V3[] = [];
  for (const side of [-1, 1]) {
    const hip: V3 = [side * 0.2 * H * g, 0.16 * H, 0.08 * H];
    const hanging = o.dangle && side === -1;
    const knee: V3 = hanging ? [side * 0.3 * H * g, 0.1 * H, 0.42 * H] : [side * 0.36 * H * g, 0.5 * H, 0.4 * H];
    const foot: V3 = hanging ? [side * 0.3 * H * g, -0.38 * H, 0.46 * H] : [side * 0.3 * H * g, 0.04 * H, 0.52 * H];
    limb(s, [hip, knee], 0.13 * w, 0.085 * w, fur);
    limb(s, [knee, foot], 0.08 * w, 0.055 * w, fur);
    s.ball([0.06 * H, 0.035 * H, 0.12 * H], [foot[0], foot[1], foot[2] + 0.07 * H], skin, 10);
    const shoulder: V3 = [side * 0.29 * H * g, 0.84 * H, lean + 0.02 * H];
    const custom = side === 1 ? o.rightHand : o.leftHand;
    const hand: V3 = custom ? [custom[0] * H, custom[1] * H, custom[2] * H] : hanging ? [side * 0.42 * H * g, 0.06 * H, 0.2 * H] : [knee[0] * 0.95, knee[1] + 0.09 * H, knee[2] + 0.05 * H];
    const elbow: V3 = [(shoulder[0] + hand[0]) / 2 + side * 0.13 * H, Math.min(shoulder[1], hand[1]) - 0.16 * H, (shoulder[2] + hand[2]) / 2 - 0.04 * H];
    limb(s, [shoulder, elbow, hand], 0.085 * w, 0.055 * w, fur);
    s.ball([0.06 * H, 0.05 * H, 0.07 * H], hand, skin, 10);
    hands.push(hand);
  }
  return { neck, leftHand: hands[0], rightHand: hands[1] };
}
