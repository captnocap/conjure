import * as THREE from 'three';
import { type Sculpture, mix } from '@conjure/kit';

/**
 * A six-legged alien grazer: barrel body, a row of bony plates down the spine, a trunk snout
 * and a slow tail. Built at `size` (1 = cow-sized) into its own group at the origin, standing
 * on y = 0 and facing +z. The same anatomy makes a calf, a bull, or a carcass on its side.
 */
export type GrazerPose = 'graze' | 'alert' | 'lying' | 'walk' | 'dead';
export type GrazerMarkings = 'plain' | 'dappled' | 'banded' | 'pale-belly';
export type GrazerHorns = 'none' | 'stubs' | 'curved' | 'crest';

export interface GrazerOptions {
  size: number;
  hide: string;
  plate: string;
  markings: GrazerMarkings;
  horns: GrazerHorns;
  pose: GrazerPose;
  /** Four legs makes an ordinary farm animal; six is the alien. */
  legs?: 4 | 6;
  tag?: 'none' | 'ear-tag' | 'brand' | 'paint';
  /** For a carcass: 1 lies on its right flank, -1 on its left. */
  side?: 1 | -1;
}

export interface Grazer {
  group: THREE.Group;
  /** Breathing, weight shifting, chewing and the tail. */
  update(dt: number, time: number): void;
  /** Local-space body centre and half-extents, for pools and blankets. */
  body: { centre: THREE.Vector3; radii: THREE.Vector3 };
  /** Local-space hip joints, for leg-side props. */
  hips: THREE.Vector3[];
  /** The barrel of the body, to bloat or sink a carcass. */
  bodyMesh: THREE.Mesh;
}

const PALE = { plain: null, dappled: null, banded: null, 'pale-belly': '#e2dccd' } as const;

export function grazer(s: Sculpture, o: GrazerOptions): Grazer {
  const { random, mood } = s.context;
  const S = o.size;
  const g = new THREE.Group();
  s.root.add(g);
  const put = <T extends THREE.Object3D>(m: T) => { g.add(m); return m; };
  const P = (x: number, y: number, z: number): [number, number, number] => [x * S, y * S, z * S];

  const hide = s.material(o.hide, { roughness: 0.88 });
  const dark = s.material(new THREE.Color(o.hide).multiplyScalar(0.55).getStyle(), { roughness: 0.9 });
  const plate = s.material(o.plate, { roughness: 0.7, flatShading: true });
  const hoof = s.material('#2d2a2a', { roughness: 0.6 });
  const eye = s.material('#15120f', { roughness: 0.3 });

  const dead = o.pose === 'dead', lying = o.pose === 'lying';
  const side = o.side ?? 1;
  const Lz = 1.1, Rx = 0.52, Ry = 0.5;
  const bodyY = lying ? 0.56 : 1.0;

  // Body: one barrel ellipsoid, a touch deeper at the rear.
  const body = put(s.ball(P(Rx, Ry, Lz), P(0, bodyY, 0), hide, 18));
  body.rotation.x = 0.03;
  const belly = PALE[o.markings];
  if (belly) put(s.ball(P(Rx * 0.9, Ry * 0.78, Lz * 0.86), P(0, bodyY - 0.2 * 1, 0.02), s.material(belly, { roughness: 0.9 }), 16));
  if (o.markings === 'dappled') {
    const spots: { at: [number, number, number]; size: number }[] = [];
    const n = 18 + Math.floor(random() * 14);
    for (let i = 0; i < n; i++) {
      const u = (random() - 0.5) * 1.7, t = mix(0.42, 1.58, random()) * Math.PI * (random() < 0.5 ? 1 : -1);
      const r = Math.sqrt(1 - u * u);
      spots.push({ at: P(Rx * Math.sin(t) * r * 1.0, bodyY + Ry * Math.cos(t) * r, Lz * u), size: mix(0.06, 0.12, random()) * S });
    }
    put(s.scatter(new THREE.SphereGeometry(1, 8, 6), dark, spots));
  }
  if (o.markings === 'banded') {
    for (const z of [0.62, 0.1, -0.45]) {
      const r = Math.sqrt(1 - (z / Lz) ** 2);
      const band = put(s.ring(1, 0.05, P(0, bodyY, z), dark));
      band.scale.set(Rx * r * S * 1.0, Ry * r * S * 1.0, S);
    }
  }

  // Bony plates marching down the spine: low faceted shingles, each overlapping the next.
  const shell = new THREE.SphereGeometry(1, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const plateCount = 8;
  for (let i = 0; i < plateCount; i++) {
    const z = 0.9 - i * (1.72 / (plateCount - 1));
    const top = bodyY + Ry * Math.sqrt(Math.max(0, 1 - (z / Lz) ** 2));
    const end = i === 0 || i === plateCount - 1 ? 0.7 : 1;
    const m = put(s.mesh(shell, plate, P(0, top - 0.06, z)));
    m.scale.set(0.34 * end * S, 0.13 * S * mix(0.85, 1.15, random()), 0.2 * S);
    m.rotation.x = -0.3 + (random() - 0.5) * 0.08;
    m.rotation.y = (random() - 0.5) * 0.06;
  }
  // A ridge of knuckles along the centre line ties the plates into one carapace.
  put(s.scatter(new THREE.IcosahedronGeometry(1, 0), plate, Array.from({ length: plateCount }, (_u, i) => {
    const z = 0.9 - i * (1.72 / (plateCount - 1));
    const top = bodyY + Ry * Math.sqrt(Math.max(0, 1 - (z / Lz) ** 2));
    return { at: P(0, top + 0.06, z + 0.02), size: 0.05 * S };
  })));

  // Legs: three pairs, each a thigh, a shin and a hoof.
  const legZ = (o.legs ?? 6) === 6 ? [0.72, 0, -0.72] : [0.72, -0.72];
  const hips: THREE.Vector3[] = [];
  let k = 0;
  for (const z of legZ) for (const sx of [-1, 1]) {
    const x = sx * 0.4;
    const swing = o.pose === 'walk' ? (k % 2 ? 0.16 : -0.16) * (z > 0.3 ? 1 : z < -0.3 ? -1 : 0.6) : 0;
    const jitter = (random() - 0.5) * 0.06;
    hips.push(new THREE.Vector3(x * S, (bodyY - 0.3) * S, z * S));
    if (dead) {
      // Stiff and straight out of the belly. In body space they point down with a small fan, so
      // once the animal is rolled onto its flank they lie level: the lower pair along the ground,
      // the upper pair stacked above them, pointing at the sky a little.
      const lower = sx === -side;
      const splay = lower ? 0 : sx * 0.14;
      const fan = (z > 0.3 ? 0.1 : z < -0.3 ? -0.1 : 0) + jitter * 3;
      const knee: [number, number, number] = [x + splay * 0.5, bodyY - 0.3 - 0.48, z + fan * 0.5];
      const foot: [number, number, number] = [x + splay, bodyY - 0.3 - 0.98, z + fan];
      put(s.rod(P(x, bodyY - 0.3, z), P(...knee), 0.11 * S, hide, 0.085 * S));
      put(s.rod(P(...knee), P(...foot), 0.08 * S, hide, 0.065 * S));
      put(s.cylinder(0.09 * S, 0.1 * S, 0.09 * S, P(foot[0], foot[1] - 0.04, foot[2]), hoof, 10));
    } else if (lying) {
      // Folded like a cow at rest: the front shins stretch forward along the ground with their
      // hooves showing; the other legs tuck along the flank, hock behind, hoof forward.
      if (z > 0.3) {
        put(s.rod(P(x * 0.95, 0.09, z - 0.05), P(x * 1.02, 0.08, z + 0.5), 0.07 * S, hide, 0.065 * S));
        const h = put(s.cylinder(0.08 * S, 0.085 * S, 0.1 * S, P(x * 1.03, 0.07, z + 0.56), hoof, 10));
        h.rotation.x = Math.PI / 2;
      } else {
        put(s.rod(P(x * 1.1, 0.1, z - 0.3), P(x * 1.14, 0.09, z + 0.3), 0.075 * S, hide, 0.065 * S));
        put(s.ball(P(0.12, 0.12, 0.13), P(x * 1.08, 0.14, z - 0.3), hide, 10));
        const h = put(s.cylinder(0.08 * S, 0.085 * S, 0.1 * S, P(x * 1.14, 0.07, z + 0.35), hoof, 10));
        h.rotation.x = Math.PI / 2;
      }
    } else {
      put(s.rod(P(x, bodyY - 0.3, z), P(x * 1.12, 0.36, z + swing * 0.5 + jitter), 0.11 * S, hide, 0.085 * S));
      put(s.rod(P(x * 1.12, 0.36, z + swing * 0.5 + jitter), P(x * 1.15, 0.06, z + swing + jitter), 0.08 * S, hide, 0.065 * S));
      put(s.cylinder(0.09 * S, 0.1 * S, 0.09 * S, P(x * 1.15, 0.045, z + swing + jitter), hoof, 10));
    }
    k++;
  }

  // Neck and head, as a pivot group so the head can chew and the trunk can bob. A dead head
  // droops toward the ground side (local -x·side becomes down once the body is rolled).
  const headAt = dead ? new THREE.Vector3(-side * 0.24, bodyY - 0.05, 1.7) : lying ? new THREE.Vector3(0, 0.95, 1.55)
    : o.pose === 'alert' ? new THREE.Vector3(0, 1.55, 1.6) : o.pose === 'walk' ? new THREE.Vector3(0, 1.0, 1.72) : new THREE.Vector3(0, 0.58, 1.68);
  const neckFrom = new THREE.Vector3(0, bodyY + 0.1, 0.95);
  put(s.rod(P(neckFrom.x, neckFrom.y, neckFrom.z), P(headAt.x, headAt.y, headAt.z), 0.2 * S, hide, 0.15 * S));
  const head = new THREE.Group();
  head.position.set(headAt.x * S, headAt.y * S, headAt.z * S);
  g.add(head);
  const hp = <T extends THREE.Object3D>(m: T) => { head.add(m); return m; };
  const skull = hp(s.ball(P(0.25, 0.23, 0.34), [0, 0, 0], hide, 16));
  skull.rotation.x = o.pose === 'alert' ? -0.3 : 0.25;
  for (const sx of [-1, 1]) {
    const ear = hp(s.ball(P(0.05, 0.13, 0.09), P(sx * 0.26, 0.12, -0.08), hide, 10));
    ear.rotation.z = sx * 0.7;
    ear.rotation.x = -0.3;
    hp(s.ball(P(0.035, 0.035, 0.035), P(sx * 0.2, 0.06, 0.16), eye, 8));
  }
  // The trunk: a thick base, then a tube that reaches the grass, hangs, or lies slack.
  const trunkPts: [number, number, number][] = dead
    ? [[0, -0.05, 0.3], [-side * 0.06, -0.1, 0.62], [-side * 0.14, -0.14, 0.92], [-side * 0.2, -0.16, 1.1]]
    : o.pose === 'alert' || o.pose === 'walk'
      ? [[0, -0.05, 0.3], [0, -0.35, 0.4], [0, -0.68, 0.34], [0, -0.85, 0.45]]
      : lying
        ? [[0, -0.05, 0.3], [0, -0.35, 0.5], [0, -0.7, 0.62], [0, -0.88, 0.75]]
        : [[0, -0.05, 0.3], [0, -0.22, 0.5], [0, -0.4, 0.6], [0, -0.52, 0.66]];
  hp(s.rod(P(0, -0.02, 0.2), P(trunkPts[1][0], trunkPts[1][1], trunkPts[1][2]), 0.1 * S, hide, 0.08 * S));
  hp(s.tube(trunkPts.map(([x, y, z]) => P(x, y, z)), 0.07 * S, hide));
  const tip = trunkPts[3];
  hp(s.ball(P(0.085, 0.07, 0.085), P(tip[0], tip[1], tip[2]), dark, 10));
  if (o.horns === 'stubs') for (const sx of [-1, 1]) {
    const h = hp(s.cylinder(0.02 * S, 0.06 * S, 0.16 * S, P(sx * 0.14, 0.24, -0.05), plate, 8));
    h.rotation.z = sx * -0.35;
  }
  if (o.horns === 'curved') for (const sx of [-1, 1]) {
    hp(s.tube([P(sx * 0.12, 0.18, -0.05), P(sx * 0.3, 0.34, -0.12), P(sx * 0.42, 0.5, 0.02), P(sx * 0.4, 0.6, 0.2)], 0.045 * S, plate));
    hp(s.ball(P(0.045, 0.045, 0.045), P(sx * 0.4, 0.6, 0.2), plate, 8));
  }
  if (o.horns === 'crest') {
    const c = hp(s.ball(P(0.05, 0.2, 0.36), P(0, 0.26, -0.08), plate, 10));
    c.rotation.x = -0.35;
  }
  if (o.tag === 'ear-tag') hp(s.box(P(0.07, 0.09, 0.01), P(-0.3, 0.02, -0.08), s.material('#f2c21b', { roughness: 0.5 })));
  if (o.tag === 'brand') {
    const n = String(10 + Math.floor(random() * 89));
    const label = put(s.label(n, 0.26 * S, 0.17 * S, P(Rx + 0.004, bodyY + 0.02, -0.25), '#2b2420', o.hide));
    label.rotation.y = Math.PI / 2;
  }
  if (o.tag === 'paint') put(s.box(P(0.32, 0.03, 0.12), P(0, bodyY + Ry + 0.1, -0.78), s.material('#ff6a1f', { roughness: 0.6, emissive: '#ff4a00', emissiveIntensity: 0.15 }))).rotation.x = -0.25;

  // Tail: a pivot at the rump so it can swing. A dead tail trails down to the ground.
  const tail = new THREE.Group();
  tail.position.set(0, (bodyY - 0.05) * S, -1.02 * S);
  g.add(tail);
  const tailPts: [number, number, number][] = dead
    ? [[0, 0, 0], [-side * 0.15, -0.08, -0.4], [-side * 0.32, -0.16, -0.75], [-side * 0.45, -0.2, -0.95]]
    : [[0, 0, 0], [0, -0.16, -0.36], [0, -0.48, -0.6], [0, -0.82, -0.68]];
  const tt = s.tube(tailPts.map(([x, y, z]) => P(x, y, z)), 0.05 * S, hide);
  tail.add(tt);
  const tuft = s.ball(P(0.1, 0.13, 0.1), P(tailPts[3][0], tailPts[3][1] - 0.04, tailPts[3][2]), dark, 10);
  tail.add(tuft);

  if (dead) {
    // Roll the whole animal onto one flank; the flank at half-width then rests on the ground.
    g.rotation.z = side * Math.PI / 2;
    g.position.y = Rx * S;
    tail.rotation.x = 0.3;
  }

  const energy = mix(0.25, 1.4, mood.energy);
  const phase = random() * Math.PI * 2;
  const restY = g.position.y, restZ = g.rotation.z;
  return {
    group: g,
    body: { centre: new THREE.Vector3(0, bodyY * S, 0), radii: new THREE.Vector3(Rx * S, Ry * S, Lz * S) },
    hips,
    bodyMesh: body,
    update(_dt, time) {
      if (dead) return;
      const t = time * energy + phase;
      // Shifting its weight, breathing, chewing with the whole head, and a slow tail.
      g.rotation.z = restZ + Math.sin(t * 0.45) * 0.014;
      g.position.y = restY + Math.sin(t * 0.9) * 0.004 * S;
      head.rotation.x = Math.sin(t * 3.2) * 0.035 + Math.sin(t * 0.7) * 0.04;
      head.rotation.y = Math.sin(t * 0.3) * 0.08;
      tail.rotation.y = Math.sin(t * 0.8) * 0.4;
      tail.rotation.x = Math.sin(t * 1.6) * 0.08;
    },
  };
}
