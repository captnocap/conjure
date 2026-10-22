import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Batch, blend, paint, type P3 } from './tundra';

type Pose = 'walk' | 'graze' | 'look' | 'lie' | 'alert';
interface Coat { body: THREE.Color; pale: THREE.Color; dark: THREE.Color; antler: THREE.Color }

function deer(o: { pose: Pose; antler: number; coat: Coat; phase: number; random: () => number; pack: 'none' | 'bell' | 'pack'; material: THREE.Material }) {
  const { coat, random } = o;
  const group = new THREE.Group();
  const lying = o.pose === 'lie';
  const drop = lying ? -0.58 : 0;
  const body = new Batch();
  body.ball([0.56, 0.3, 0.25], [0, 1.0 + drop, 0], coat.body);
  body.ball([0.3, 0.34, 0.26], [0.36, 0.97 + drop, 0], coat.body);
  body.ball([0.3, 0.3, 0.25], [-0.4, 1.03 + drop, 0], coat.body);
  body.ball([0.3, 0.12, 0.2], [0.0, 0.8 + drop, 0], coat.pale);
  body.ball([0.1, 0.18, 0.17], [-0.66, 1.08 + drop, 0], coat.pale);
  body.ball([0.06, 0.1, 0.05], [-0.73, 1.12 + drop, 0], coat.pale);
  const moving = o.pose === 'walk';
  [[0.38, 0.13, 0], [0.38, -0.13, Math.PI], [-0.42, 0.13, Math.PI * 0.6], [-0.42, -0.13, Math.PI * 1.6]].forEach(([x, z, offset], index) => {
    if (lying) {
      const front = index < 2;
      const a: P3 = front ? [0.4, 0.26, z * 1.3] : [-0.42, 0.22, z * 1.7];
      const b: P3 = front ? [0.72, 0.07, z * 1.5] : [-0.08, 0.06, z * 2.1];
      body.rod(a, b, 0.07, 0.04, coat.dark);
      body.ball([0.06, 0.04, 0.05], b, coat.dark, undefined, 6);
      return;
    }
    const swing = moving ? Math.sin(o.phase + offset) * 0.2 : (random() - 0.5) * 0.08;
    const lift = moving && swing > 0.12 ? 0.09 : 0;
    const rear = index >= 2;
    const hip: P3 = [x, 0.92, z], knee: P3 = [x + swing * 0.45 + (rear ? -0.07 : 0.03), 0.5 + lift * 0.5, z], foot: P3 = [x + swing, 0.04 + lift, z];
    body.rod(hip, knee, 0.085, 0.045, coat.body);
    body.rod(knee, foot, 0.042, 0.034, coat.dark);
    body.ball([0.065, 0.045, 0.05], foot, coat.dark, undefined, 6);
  });
  if (o.pack === 'bell') {
    body.add(new THREE.TorusGeometry(0.21, 0.035, 6, 14), '#b8322a', new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(0.6, 1.12 + drop, 0));
    body.ball([0.05, 0.06, 0.05], [0.62, 0.86 + drop, 0], '#c9a23a', undefined, 6);
  }
  if (o.pack === 'pack') {
    for (const z of [-1, 1]) body.box([0.5, 0.34, 0.2], [-0.02, 1.08 + drop, z * 0.3], z > 0 ? '#3c6f8f' : '#8f5b34', [z * 0.2, 0, 0]);
    body.box([0.6, 0.06, 0.62], [-0.02, 1.31 + drop, 0], '#c7b48f');
    body.rod([-0.02, 1.34 + drop, -0.3], [-0.02, 1.34 + drop, 0.3], 0.03, 0.03, '#4a3a2c');
  }
  group.add(body.mesh(o.material));

  const head = new Batch();
  head.rod([-0.06, -0.06, 0], [0.3, 0.36, 0], 0.18, 0.11, coat.body, 8);
  head.ball([0.13, 0.26, 0.11], [0.2, 0.0, 0], coat.pale, [0, 0, -0.75], 8);
  const H: P3 = [0.38, 0.42, 0];
  head.ball([0.16, 0.115, 0.105], H, coat.body, undefined, 8);
  head.rod(H, [0.63, 0.34, 0], 0.09, 0.06, coat.body);
  head.ball([0.058, 0.058, 0.058], [0.65, 0.34, 0], coat.dark, undefined, 6);
  const A = o.antler;
  for (const side of [-1, 1]) {
    head.rod([0.3, 0.5, side * 0.08], [0.2, 0.57, side * 0.22], 0.04, 0.012, coat.body, 5);
    if (A < 0.12) continue;
    const jit = () => (random() - 0.5) * 0.08 * A;
    const B: P3 = [0.3, 0.5, side * 0.05];
    const pts: P3[] = [
      B,
      [B[0] - 0.18 * A + jit(), B[1] + 0.3 * A, B[2] + side * 0.18 * A],
      [B[0] - 0.27 * A + jit(), B[1] + 0.68 * A, B[2] + side * 0.32 * A],
      [B[0] - 0.08 * A + jit(), B[1] + 1.0 * A, B[2] + side * 0.3 * A],
      [B[0] + 0.2 * A, B[1] + 1.13 * A + jit(), B[2] + side * 0.22 * A],
    ];
    const thick = 0.02 + 0.016 * A;
    head.tube(pts, (t) => thick * (1 - t * 0.6), coat.antler, 5, 14);
    const tine = (from: P3, d: P3, r = thick * 0.6) => {
      const to: P3 = [from[0] + d[0] * A + jit(), from[1] + d[1] * A + jit(), from[2] + side * d[2] * A];
      head.rod(from, to, r, r * 0.35, coat.antler, 5);
      return to;
    };
    const brow = tine(B, [0.3, 0.12, 0.02], thick * 0.8);
    tine(brow, [0.1, 0.13, 0.0]);
    tine(brow, [0.12, -0.03, 0.03]);
    tine(pts[1], [0.24, 0.1, 0.06]);
    tine(pts[2], [-0.22, 0.12, 0.02]);
    tine(pts[3], [-0.06, 0.26, 0.05]);
    tine(pts[3], [0.1, 0.24, -0.06]);
    tine(pts[4], [0.16, 0.14, 0.0]);
    tine(pts[4], [0.02, 0.24, 0.05]);
  }
  const neck = new THREE.Group();
  neck.add(head.mesh(o.material));
  neck.position.set(0.52, 1.12 + drop, 0);
  const pitch = { walk: -0.28, alert: 0.2, graze: -1.72, look: 0.12, lie: 0.05 }[o.pose] + (random() - 0.5) * 0.12;
  const yaw = o.pose === 'look' ? -2.1 : (random() - 0.5) * 0.3;
  if (o.pose === 'graze') neck.scale.set(1.22, 1.22, 1);
  neck.rotation.set(0, yaw, pitch);
  group.add(neck);
  return { group, neck, pitch, yaw };
}

export default defineThing({
  questions: {
    size: choice('How many reindeer are there?', {
      pair: 'Only two, a cow and one other, stragglers.',
      few: 'A handful, four or five animals.',
      string: 'A string of seven or eight.',
      column: 'A long column of a dozen, the tail of something much bigger.',
    }),
    formation: choice('How are they arranged?', {
      file: 'Strung out in single file, nose to tail along an invisible trail.',
      loose: 'Scattered loosely, each animal a little apart.',
      bunch: 'Bunched tight, flanks touching and antlers overlapping into one thicket.',
      wedge: 'A wedge fanning out behind a leader.',
    }),
    doing: choice('What is the herd doing right now?', {
      travelling: 'Walking steadily, heads low, going somewhere far.',
      grazing: 'Mostly heads down, grazing lichen.',
      resting: 'Half of them lying down, legs folded, chewing.',
      alarmed: 'Heads up and still, all listening to something.',
    }),
    coat: choice('What do their coats look like?', {
      autumn: 'Brown backs with cream necks and pale rumps, the autumn coat.',
      silhouette: 'Nearly black, read as silhouettes against the light.',
      winter: 'Pale and almost white, winter animals.',
      piebald: 'A mixed herd: browns, greys and one or two white ones.',
    }),
    antlers: score('How big are the antlers?', ['Short velvet spikes', 'Modest racks', 'Tall branching racks', 'Enormous overlapping crowns']),
    lookback: noul('Is one animal turned to look back at the viewer?'),
    calves: noul('Are there small antlerless calves among them?'),
    leader: choice('What marks the lead animal?', {
      nothing: 'Nothing, a wild herd with no owner.',
      bell: 'A red collar and a brass bell: a herder is not far.',
      pack: 'Pack bundles strapped across its back, a working animal.',
      white: 'It is pure white, the one a herder would call sacred.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const material = paint(mood.wear, { roughness: 0.9 });
    const base = { pair: 2, few: 4, string: 7, column: 11 }[a.size];
    const count = Math.max(2, base + Math.round((mood.density - 0.5) * (base > 4 ? 3 : 1)));
    const warm = mix(-0.08, 0.08, mood.warmth);
    const coatOf = (index: number): Coat => {
      const kind = a.coat === 'piebald' ? (['autumn', 'grey', 'autumn', 'winter', 'dark'] as const)[Math.floor(random() * 5)] : a.coat;
      const white = a.leader === 'white' && index === 0;
      const shade = (random() - 0.5) * 0.16;
      const set = white || kind === 'winter'
        ? { body: '#d6cebd', pale: '#f1ece0', dark: '#75695a', antler: '#8f7a5e' }
        : kind === 'silhouette'
          ? { body: '#2b2724', pale: '#3a342f', dark: '#191716', antler: '#2e2925' }
          : kind === 'grey'
            ? { body: '#8b857c', pale: '#d9d4c8', dark: '#4a4641', antler: '#8a7860' }
            : kind === 'dark'
              ? { body: '#3e3129', pale: '#a89780', dark: '#221c18', antler: '#6f5c46' }
              : { body: '#75553c', pale: '#e2d6bb', dark: '#3a2b21', antler: '#927654' };
      const tone = (hex: string) => new THREE.Color(hex).offsetHSL(warm * 0.1, 0, shade * (white ? 0.3 : 1));
      return { body: tone(set.body), pale: tone(set.pale), dark: tone(set.dark), antler: blend(set.antler, '#5a4334', mood.wear * 0.4) };
    };

    // Where each animal stands: x is the direction of travel.
    const spots: { x: number; z: number; turn: number }[] = [];
    const tooClose = (x: number, z: number, gap: number) => spots.some((p) => Math.hypot(p.x - x, (p.z - z) * 1.6) < gap);
    if (a.formation === 'file') {
      let x = 0;
      for (let i = 0; i < count; i++) {
        spots.push({ x: -x, z: Math.sin(i * 0.9 + random() * 2) * 0.75, turn: 0 });
        x += mix(1.25, 1.9, random()) * (i === count - 2 ? 1.6 : 1);
      }
    } else if (a.formation === 'wedge') {
      for (let i = 0; i < count; i++) {
        const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
        spots.push({ x: -row * mix(1.5, 2.0, random()), z: i === 0 ? 0 : side * row * mix(0.75, 1.0, random()), turn: 0 });
      }
    } else {
      const gap = a.formation === 'bunch' ? 0.95 : 2.1, spread = Math.sqrt(count) * (a.formation === 'bunch' ? 0.85 : 1.9);
      for (let i = 0, tries = 0; i < count && tries < 600; tries++) {
        const angle = random() * Math.PI * 2, r = Math.sqrt(random()) * spread;
        const x = Math.cos(angle) * r * 1.5, z = Math.sin(angle) * r * 0.6;
        if (tooClose(x, z, gap)) continue;
        spots.push({ x, z, turn: 0 });
        i++;
      }
      spots.sort((p, q) => q.x - p.x);
    }

    const lookIndex = a.lookback ? Math.min(spots.length - 1, 1 + Math.floor(random() * Math.max(1, spots.length - 1))) : -1;
    const heads: { neck: THREE.Group; pitch: number; yaw: number; pose: Pose; phase: number }[] = [];
    spots.forEach((spot, index) => {
      const roll = random();
      let pose: Pose = a.doing === 'travelling' ? (roll < 0.82 ? 'walk' : 'graze')
        : a.doing === 'grazing' ? (roll < 0.7 ? 'graze' : roll < 0.85 ? 'walk' : 'alert')
          : a.doing === 'resting' ? (roll < 0.55 ? 'lie' : roll < 0.8 ? 'graze' : 'alert')
            : (roll < 0.85 ? 'alert' : 'look');
      if (index === 0 && a.doing !== 'resting') pose = a.doing === 'alarmed' ? 'alert' : a.doing === 'grazing' ? 'graze' : 'walk';
      if (index === lookIndex) pose = 'look';
      const calf = a.calves && index > 0 && index !== lookIndex && (index % 3 === 2 || (count < 4 && index === count - 1));
      const size = calf ? mix(0.5, 0.62, random()) : mix(0.9, 1.08, random());
      const made = deer({
        pose, coat: coatOf(index), phase: random() * Math.PI * 2, random, material,
        antler: calf ? 0.05 : mix(0.4, 1.3, a.antlers) * mix(0.75, 1.15, random()),
        pack: index === 0 && !calf && a.leader !== 'white' && a.leader !== 'nothing' ? a.leader : 'none',
      });
      const loose = a.formation === 'loose' || pose === 'graze' || pose === 'lie';
      made.group.rotation.y = (random() - 0.5) * (loose ? 1.3 : 0.3) + (pose === 'graze' && random() < 0.25 ? Math.PI : 0);
      made.group.scale.setScalar(size);
      made.group.position.set(spot.x, 0, spot.z + (calf ? 0.5 : 0));
      s.root.add(made.group);
      heads.push({ neck: made.neck, pitch: made.pitch, yaw: made.yaw, pose, phase: random() * 6 });
    });

    const pace = mix(0.25, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const h of heads) {
          const wave = Math.sin(time * pace * (h.pose === 'walk' ? 2.2 : 0.7) + h.phase);
          h.neck.rotation.z = h.pitch + wave * (h.pose === 'graze' ? 0.07 : 0.035);
          if (h.pose === 'alert' || h.pose === 'look') h.neck.rotation.y = h.yaw + Math.sin(time * pace * 0.4 + h.phase) * 0.12;
        }
      },
    });
  },
});
