import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { Batch, blend, paint, type P3 } from './tundra';

const BED = 0.56, LENGTH = 2.8, WIDTH = 0.74;
type Tint = THREE.ColorRepresentation;

/** A wooden herders' sledge, nose toward +x, standing on y = 0. */
function sledge(local: Batch, wood: Tint, dark: Tint) {
  const h = BED - 0.04, L = LENGTH, width = WIDTH;
  for (const side of [-1, 1]) {
    const z = side * width / 2;
    local.tube([[-L / 2, 0.04, z], [0, 0.04, z], [L / 2 - 0.55, 0.04, z], [L / 2 - 0.12, 0.2, z], [L / 2 + 0.08, 0.6, z]], () => 0.042, wood, 5, 16);
    local.rod([-L / 2 + 0.1, h, z * 0.82], [L / 2 - 0.5, h, z * 0.82], 0.032, 0.032, wood, 5);
    local.rod([L / 2 - 0.5, h, z * 0.82], [L / 2 + 0.08, 0.6, z], 0.026, 0.022, wood, 5);
    for (let i = 0; i < 4; i++) {
      const x = -L / 2 + 0.3 + i * (L - 1.1) / 3;
      local.rod([x + 0.14, 0.05, z], [x, h, z * 0.82], 0.03, 0.026, dark, 5);
    }
  }
  for (let i = 0; i < 4; i++) {
    const x = -L / 2 + 0.3 + i * (L - 1.1) / 3;
    local.rod([x, h, -width * 0.41], [x, h, width * 0.41], 0.026, 0.026, dark, 5);
  }
  for (let i = -1; i <= 1; i++) local.box([L - 0.75, 0.025, width * 0.22], [-0.2, h + 0.03, i * width * 0.25], wood);
  local.rod([L / 2 + 0.08, 0.6, -width / 2], [L / 2 + 0.08, 0.6, width / 2], 0.024, 0.024, dark, 5);
}

const LOADS = ['bundles', 'poles', 'chest', 'stove', 'firewood', 'sacks', 'cradle', 'sacred', 'dog', 'empty'] as const;
type Load = (typeof LOADS)[number];

export default defineThing({
  questions: {
    count: choice('How many sledges are roped together?', {
      two: 'Two, a small household.',
      three: 'Three, nose to tail.',
      four: 'Four, a long heavy train.',
      five: 'Five, everything a family owns.',
    }),
    cargo: choice('What is most of the cargo?', {
      household: 'A mix of everything: bundles, a chest, the stove, sacks.',
      tent: 'The tent itself: long poles trailing behind and rolled hide covers.',
      stores: 'Winter stores: sacks, firewood and boxes.',
      bedding: 'Soft high heaps of furs and bedding.',
    }),
    last: choice('What rides on the last sledge?', {
      cradle: 'A child\'s cradle, wooden with a hoop and a bright blanket, lashed on top.',
      poles: 'The tent poles, their tips dragging far out behind.',
      sacred: 'A closed chest under red cloth with antlers tied on: the sacred sledge.',
      stove: 'The iron stove and its lengths of pipe.',
      dog: 'A dog curled up asleep on the bundles.',
      empty: 'Nothing. It is already unloaded.',
    }),
    wrap: choice('What are the loads wrapped in?', {
      hides: 'Brown reindeer hides, fur side out.',
      tarps: 'Bright blue and orange tarpaulins.',
      cloth: 'Red and green patterned cloth with pale borders.',
      canvas: 'Grey-white canvas, weathered.',
    }),
    state: choice('What is happening to the train?', {
      ready: 'Packed and ready, harness lines laid out in front waiting for the animals.',
      parked: 'Left parked for the season, settled into the ground.',
      unloading: 'Being unloaded: bundles stand on the ground beside the first sledge.',
      spilled: 'One sledge has tipped on its side and spilled its load.',
    }),
    line: score('How does the train sit?', ['In a dead straight line', 'A gentle bend', 'Curled in a wide arc']),
    lashing: score('How is it tied down?', ['Loosely piled, barely roped', 'A few ropes over each load', 'Bound tight under a net of crossing ropes']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = { two: 2, three: 3, four: 4, five: 5 }[a.count];
    const wood = blend('#a98556', '#8f8b80', mood.wear * 0.85), dark = blend('#77593a', '#66635b', mood.wear * 0.85);
    const rope = '#d6c8a2', iron = '#2e2c2a';
    const palette: string[] = {
      hides: ['#7d5d42', '#6c4f38', '#94775a', '#5d4433', '#b39a78'],
      tarps: ['#2f6ea8', '#d9732b', '#2f6ea8', '#3f8a5a', '#c9c2ad'],
      cloth: ['#a8322b', '#2f6b4a', '#c98a2b', '#a8322b', '#e0d6bd'],
      canvas: ['#c9c4b4', '#b3ad9b', '#d8d4c6', '#9c9685'],
    }[a.wrap];
    const pick = () => blend(palette[Math.floor(random() * palette.length)], '#8b8275', mood.wear * 0.3);
    const ropes = Math.round(mix(0, 5, a.lashing));
    const heap = mix(0.9, 1.4, mood.density) * (a.cargo === 'bedding' ? 1.35 : 1);

    const hoop = (b: Batch, x: number, y: number, ry: number, rz: number, color: Tint = rope) =>
      b.add(new THREE.TorusGeometry(1, 0.035, 5, 14), color, new THREE.Matrix4().makeScale(1, ry, rz).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)).setPosition(x, y, 0));
    const lash = (b: Batch, top: number) => {
      for (let i = 0; i < ropes; i++) hoop(b, -1.0 + (i + 0.5) * (1.8 / ropes), BED + top * 0.5 - 0.04, top * 0.5 + 0.05, WIDTH * 0.47);
      if (ropes >= 4) for (const z of [-1, 1]) b.rod([-1.1, BED + top * 0.6, z * WIDTH * 0.42], [0.85, BED + top * 0.6, z * WIDTH * 0.42], 0.016, 0.016, rope, 4);
    };
    const bundles = (b: Batch, tall: number) => {
      let x = -1.1, top = 0;
      while (x < 0.7) {
        const lx = 0.27 + random() * 0.22, ly = (0.2 + random() * 0.14) * tall, lz = 0.31 + random() * 0.08;
        b.ball([lx, ly, lz], [x + lx * 0.8, BED + ly * 0.92, (random() - 0.5) * 0.08], pick(), [0, (random() - 0.5) * 0.4, 0], 8);
        top = Math.max(top, ly * 1.9);
        x += lx * 1.5;
      }
      for (let i = 0; i < Math.round(1 + tall * 1.5); i++) {
        const lx = 0.3 + random() * 0.2, ly = 0.16 + random() * 0.1;
        b.ball([lx, ly, 0.27], [-0.75 + i * 0.6 + random() * 0.2, BED + top * 0.8 + ly * 0.6, 0], pick(), [0, (random() - 0.5) * 0.5, 0], 8);
      }
      return top + 0.3;
    };
    const poles = (b: Batch, trail: number) => {
      const n = 9 + Math.floor(random() * 5);
      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / 5), z = ((i % 5) - 2) * 0.12 + (random() - 0.5) * 0.04;
        const y = BED + 0.06 + row * 0.1;
        const back = -1.4 - trail * (0.6 + random() * 0.5);
        b.rod([back, trail > 1 ? Math.max(0.04, y - 0.45 - random() * 0.1) : y + 0.02, z * (1 + trail * 0.7)], [1.15 + random() * 0.4, y + 0.1, z * 0.8], 0.04, 0.022, i % 3 ? '#b59a70' : '#8d7350', 5);
      }
    };
    const stove = (b: Batch, x: number, y: number) => {
      b.box([0.62, 0.42, 0.4], [x, y + 0.21, 0], iron);
      b.box([0.2, 0.18, 0.02], [x + 0.32, y + 0.2, 0], '#5a4a3c');
      b.drum(0.075, 0.2, [x - 0.15, y + 0.5, 0], iron, undefined, 7);
      for (let i = 0; i < 3; i++) b.drum(0.07, 1.1, [x - 0.75 - (i % 2) * 0.1, y + 0.08 + Math.floor(i / 2) * 0.13, (i % 2 ? 0.1 : -0.1) * (i < 2 ? 1 : 0)], '#4a4744', [0, 0, Math.PI / 2], 7);
    };
    const cradle = (b: Batch, x: number, y: number) => {
      b.ball([0.5, 0.2, 0.24], [x, y + 0.16, 0], '#b98f58', undefined, 10);
      b.ball([0.42, 0.13, 0.19], [x - 0.04, y + 0.3, 0], '#b8322a', undefined, 10);
      b.ball([0.12, 0.1, 0.12], [x + 0.3, y + 0.36, 0], '#efe6d2', undefined, 8);
      for (const dx of [0.3, 0.05]) b.add(new THREE.TorusGeometry(0.27, 0.022, 5, 10, Math.PI), '#e2cf9e', new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(x + dx, y + 0.24, 0));
      b.rod([x + 0.3, y + 0.51, 0], [x + 0.05, y + 0.51, 0], 0.016, 0.016, '#e2cf9e', 4);
      for (let i = 0; i < 4; i++) b.rod([x - 0.38 + i * 0.13, y + 0.4, -0.16], [x - 0.3 + i * 0.13, y + 0.4, 0.16], 0.012, 0.012, '#f0e2b8', 4);
      b.ball([0.035, 0.035, 0.035], [x + 0.3, y + 0.44, 0.2], '#2f7fd0', undefined, 6);
      b.ball([0.035, 0.035, 0.035], [x + 0.3, y + 0.38, 0.22], '#e6b422', undefined, 6);
    };
    const load = (b: Batch, kind: Load): void => {
      if (kind === 'empty') return;
      if (kind === 'bundles') { lash(b, bundles(b, heap)); return; }
      if (kind === 'poles') { poles(b, 2.2); b.ball([0.55, 0.2, 0.3], [-0.2, BED + 0.4, 0], pick(), undefined, 8); for (const x of [-0.6, 0.2, 0.9]) hoop(b, x, BED + 0.16, 0.2, 0.34); return; }
      if (kind === 'chest') {
        b.box([1.25, 0.5, 0.58], [-0.25, BED + 0.27, 0], '#8a6844');
        b.box([1.3, 0.07, 0.62], [-0.25, BED + 0.55, 0], '#6f5236');
        for (const x of [-0.7, 0.2]) b.box([0.05, 0.53, 0.6], [x, BED + 0.28, 0], iron);
        b.ball([0.3, 0.2, 0.28], [0.72, BED + 0.2, 0], pick(), undefined, 8);
        b.ball([0.4, 0.15, 0.26], [-0.3, BED + 0.72, 0], pick(), undefined, 8);
        lash(b, 0.85);
        return;
      }
      if (kind === 'stove') { b.ball([0.5, 0.14, 0.32], [-0.2, BED + 0.1, 0], pick(), undefined, 8); stove(b, 0.35, BED + 0.2); b.drum(0.17, 0.22, [-0.95, BED + 0.34, 0], '#3b3a3a', undefined, 9); return; }
      if (kind === 'firewood') {
        for (let row = 0; row < Math.round(3 * heap) + 1; row++) for (let i = 0; i < 5 - (row > 2 ? 1 : 0); i++)
          b.rod([-1.1 + random() * 0.1, BED + 0.1 + row * 0.15, -0.26 + i * 0.13 + (row % 2) * 0.05], [0.7 + random() * 0.2, BED + 0.1 + row * 0.15, -0.26 + i * 0.13 + (row % 2) * 0.05], 0.07, 0.07, random() < 0.5 ? '#c8a97a' : '#8a6d4c', 6);
        lash(b, 0.15 * (Math.round(3 * heap) + 1) + 0.05);
        return;
      }
      if (kind === 'sacks') {
        for (let i = 0; i < Math.round(5 * heap); i++) {
          const layer = i > 2 ? 1 : 0;
          b.ball([0.3, 0.2, 0.28], [-0.85 + (i % 3) * 0.62 + layer * 0.3, BED + 0.2 + layer * 0.32, (random() - 0.5) * 0.06], i % 2 ? '#c9bc98' : '#b5a57f', [0, 0, (random() - 0.5) * 0.3], 8);
          b.ball([0.07, 0.07, 0.07], [-0.85 + (i % 3) * 0.62 + layer * 0.3 + 0.27, BED + 0.34 + layer * 0.32, 0], '#a3936e', undefined, 5);
        }
        lash(b, 0.7);
        return;
      }
      if (kind === 'cradle') { b.ball([0.95, 0.17, 0.33], [-0.2, BED + 0.14, 0], pick(), undefined, 10); cradle(b, -0.15, BED + 0.26); for (const x of [-0.55, 0.3]) hoop(b, x, BED + 0.2, 0.27, 0.35); return; }
      if (kind === 'sacred') {
        b.box([1.3, 0.48, 0.58], [-0.2, BED + 0.25, 0], '#6f5236');
        b.box([1.4, 0.05, 0.68], [-0.2, BED + 0.5, 0], '#b3261f');
        for (const z of [-1, 1]) b.box([1.4, 0.3, 0.02], [-0.2, BED + 0.37, z * 0.33], '#b3261f');
        for (const x of [-0.7, 0.3]) hoop(b, x, BED + 0.25, 0.3, 0.36, '#e6d9b0');
        for (const side of [-1, 1]) {
          const pts: P3[] = [[0.1, BED + 0.52, side * 0.08], [-0.1, BED + 0.85, side * 0.3], [-0.45, BED + 1.15, side * 0.42], [-0.3, BED + 1.5, side * 0.34]];
          b.tube(pts, (t) => 0.035 * (1 - t * 0.6), '#e2d8c2', 5, 10);
          for (const p of pts.slice(1)) b.rod(p, [p[0] + 0.25, p[1] + 0.22, p[2] + side * 0.05], 0.022, 0.008, '#e2d8c2', 4);
        }
        return;
      }
      // A dog asleep on a low heap.
      b.ball([0.95, 0.2, 0.33], [-0.2, BED + 0.16, 0], pick(), undefined, 10);
      const fur = a.wrap === 'canvas' ? '#3a3632' : '#e8e2d4';
      b.ball([0.36, 0.2, 0.26], [-0.2, BED + 0.5, 0], fur, undefined, 10);
      b.ball([0.15, 0.13, 0.14], [0.1, BED + 0.46, 0.14], fur, undefined, 8);
      b.rod([0.1, BED + 0.44, 0.14], [0.02, BED + 0.4, 0.33], 0.07, 0.04, fur, 6);
      b.ball([0.035, 0.035, 0.035], [0.01, BED + 0.4, 0.35], '#1c1a18', undefined, 5);
      for (const z of [0.08, 0.2]) b.rod([0.16, BED + 0.55, z], [0.22, BED + 0.66, z + 0.02], 0.045, 0.01, '#6d5a48', 4);
      b.tube([[-0.5, BED + 0.4, -0.1], [-0.55, BED + 0.36, 0.2], [-0.3, BED + 0.34, 0.32]], () => 0.06, fur, 5, 8);
    };

    const mixes: Record<typeof a.cargo, Load[]> = {
      household: ['bundles', 'chest', 'stove', 'sacks', 'bundles'],
      tent: ['poles', 'bundles', 'poles', 'bundles', 'chest'],
      stores: ['sacks', 'firewood', 'chest', 'sacks', 'firewood'],
      bedding: ['bundles', 'bundles', 'chest', 'bundles', 'bundles'],
    };
    const start = Math.floor(random() * 5);
    const kinds: Load[] = Array.from({ length: count }, (_u, i) => mixes[a.cargo][(start + i) % 5]);
    kinds[count - 1] = a.last;

    // Lay the train along an arc, lead sledge at +x.
    const bend = mix(0, 0.42, a.line) * (random() < 0.5 ? -1 : 1) * (3 / count + 0.4);
    const spacing = LENGTH + mix(0.3, 0.5, random());
    const all = new Batch();
    const seats: { centre: THREE.Vector3; yaw: number }[] = [];
    let centre = new THREE.Vector3(), yaw = -bend * (count - 1) / 2;
    const dir = (angle: number) => new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
    for (let i = 0; i < count; i++) {
      seats.push({ centre: centre.clone(), yaw });
      const next = yaw + bend + (random() - 0.5) * 0.08;
      centre = centre.clone().addScaledVector(dir(yaw), -spacing / 2).addScaledVector(dir(next), -spacing / 2);
      yaw = next;
    }
    const tipped = a.state === 'spilled' ? Math.min(count - 1, 1 + Math.floor(random() * Math.max(1, count - 2))) : -1;
    const sink = a.state === 'parked' ? -0.05 - mood.wear * 0.08 : 0;
    seats.forEach((seat, index) => {
      const base = new THREE.Matrix4().makeRotationY(seat.yaw).setPosition(seat.centre.x, sink, seat.centre.z);
      const frame = new Batch();
      sledge(frame, wood, dark);
      const onGround = index === tipped || (a.state === 'unloading' && index === 0);
      const cargo = new Batch();
      load(cargo, kinds[index]);
      if (index === tipped) {
        all.adopt(frame.geometry(), base.clone().multiply(new THREE.Matrix4().makeRotationX(1.42).setPosition(0, 0.42, 0.25)));
      } else all.adopt(frame.geometry(), base.clone().multiply(new THREE.Matrix4().makeRotationZ(a.state === 'parked' ? (random() - 0.5) * 0.06 : 0)));
      if (!cargo.empty) {
        const side = index === tipped ? 1 : (random() < 0.5 ? -1 : 1);
        const spill = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(index === tipped ? 0.35 : 0, (random() - 0.5) * 0.5, index === tipped ? (random() - 0.5) * 0.3 : 0)).setPosition(0, -BED + 0.02, side * (WIDTH + 0.55));
        all.adopt(cargo.geometry(), onGround ? base.clone().multiply(spill) : base);
      }
    });

    // Ropes between sledges, and the harness line out in front.
    const nose = (seat: { centre: THREE.Vector3; yaw: number }) => seat.centre.clone().addScaledVector(dir(seat.yaw), LENGTH / 2 + 0.08).setY(0.6 + sink);
    const tail = (seat: { centre: THREE.Vector3; yaw: number }) => seat.centre.clone().addScaledVector(dir(seat.yaw), -LENGTH / 2 + 0.1).setY(0.5 + sink);
    const arr = (v: THREE.Vector3) => v.toArray() as P3;
    for (let i = 0; i < count - 1; i++) {
      const from = tail(seats[i]), to = nose(seats[i + 1]), mid = from.clone().lerp(to, 0.5).setY(a.state === 'ready' ? 0.48 : 0.22);
      all.tube([arr(from), arr(mid), arr(to)], () => 0.022, rope, 5, 10);
    }
    if (a.state !== 'parked') {
      const lead = seats[0], front = dir(lead.yaw), sideways = new THREE.Vector3(front.z, 0, -front.x);
      const from = nose(lead);
      for (const z of a.state === 'ready' ? [-0.45, 0.45] : [0.2]) {
        const pts: P3[] = [arr(from)];
        for (let k = 1; k <= 4; k++) pts.push(arr(lead.centre.clone().addScaledVector(front, LENGTH / 2 + 0.2 + k * 0.6).addScaledVector(sideways, z * k * 0.4 + Math.sin(k * 1.7 + z) * (a.state === 'ready' ? 0.08 : 0.4)).setY(0.03)));
        all.tube(pts, () => 0.022, rope, 5, 16);
        const end = pts[pts.length - 1];
        all.add(new THREE.TorusGeometry(0.24, 0.035, 5, 12), '#8a5a34', new THREE.Matrix4().makeRotationX(Math.PI / 2 - 0.15).setPosition(end[0] + front.x * 0.24, 0.05, end[2] + front.z * 0.24));
      }
    }
    if (a.state === 'parked') {
      // A long driving pole stuck upright by the lead sledge, the way a camp is marked.
      const p = seats[0].centre;
      all.rod([p.x + 0.6, 0, p.z + 0.75], [p.x + 0.75, 3.4, p.z + 0.85], 0.03, 0.015, '#b59a70', 5);
    }
    s.root.add(all.mesh(paint(mood.wear, { side: THREE.DoubleSide })));
    return s.finish();
  },
});
