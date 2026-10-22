import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

const PAINT = {
  yellow: 'Safety yellow, the default of every warehouse.',
  red: 'Fire-engine red, a hire-shop classic.',
  orange: 'Bright orange with black forks.',
  blue: 'Workshop blue, slightly posh.',
  green: 'Dark machine green, old and dependable.',
  galvanised: 'Bare galvanised steel for cold stores and fish markets.',
} as const;
const PAINT_HEX: Record<keyof typeof PAINT, string> = {
  yellow: '#e8b317', red: '#c7302a', orange: '#e2671c', blue: '#2c5fa8', green: '#2f6b46', galvanised: '#aab2b4',
};

export default defineThing({
  questions: {
    load: choice('What is on the forks?', {
      none: 'Nothing: the bare forks lie empty on the floor.',
      pallet: 'One empty wooden pallet.',
      empties: 'A tall stack of empty pallets going back to the yard.',
      cartons: 'A pallet of brown cardboard cartons.',
      sacks: 'A pallet of heavy paper sacks, flour or cement.',
      drums: 'Steel oil drums standing on a pallet.',
      crate: 'One big plywood crate stencilled FRAGILE.',
    }),
    paint: choice('What colour is it painted?', PAINT),
    lift: score('How high are the forks pumped?', ['Dropped flat on the floor', 'Just clear of the ground', 'Pumped all the way up']),
    handle: choice('Where is the handle?', {
      upright: 'Sprung upright, parked.',
      pulled: 'Leaning back at arm height, as if someone is mid-pull.',
      dropped: 'Fallen right down to the floor, a trip hazard.',
    }),
    state: choice('What has happened to it?', {
      parked: 'Nothing: put away square and ready.',
      abandoned: 'Abandoned mid-aisle, work gloves left over the handle and a paper cup on the fork.',
      tagged: 'Out of service, a red DO NOT USE tag tied to the handle.',
      leaking: 'Leaking: a dark puddle of hydraulic oil under the pump and a rag.',
      chained: 'Chained and padlocked to a yellow bollard so nobody borrows it.',
    }),
    marking: choice('What is written on it?', {
      none: 'Nothing beyond the capacity plate.',
      bay: 'A stencilled BAY 4.',
      hire: 'A hire company sticker: HIRE ME.',
      name: 'A name in marker pen: DAVE.',
      keep: 'A pleading notice: DO NOT REMOVE.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const galv = a.paint === 'galvanised';
    const body = s.material(PAINT_HEX[a.paint], { metalness: galv ? 0.7 : 0.25, roughness: galv ? 0.45 : 0.5 });
    const forkPaint = a.paint === 'orange' ? s.material('#26282a', { metalness: 0.4 }) : body;
    const steel = s.material('#8d9396', { metalness: 0.8, roughness: 0.35 });
    const chrome = s.material('#d9dee0', { metalness: 0.95, roughness: 0.18 });
    const dark = s.material('#202326', { roughness: 0.7 });
    const tyre = s.material(mood.cheer > 0.5 ? '#d9662a' : '#c9b98a', { roughness: 0.55 });
    const wood = s.material('#c49a62', { roughness: 0.9 });
    const woodDark = s.material('#a67c48', { roughness: 0.9 });

    const wheel = (r: number, w: number, at: P3, material: THREE.Material) => {
      const m = s.cylinder(r, r, w, at, material, 20);
      m.rotation.x = Math.PI / 2;
      return m;
    };
    const pallet = (y: number, cx: number, tone = wood) => {
      const L = 1.2, W = 0.8;
      for (const z of [-W / 2 + 0.05, 0, W / 2 - 0.05]) {
        s.box([L, 0.022, 0.1], [cx, y + 0.011, z], woodDark);
        for (const x of [-L / 2 + 0.0725, 0, L / 2 - 0.0725]) s.box([0.145, 0.078, 0.1], [cx + x, y + 0.061, z], tone);
      }
      for (const x of [-L / 2 + 0.0725, 0, L / 2 - 0.0725]) s.box([0.145, 0.022, W], [cx + x, y + 0.111, 0], woodDark);
      for (let i = 0; i < 5; i++) s.box([L, 0.022, 0.125], [cx, y + 0.133, -W / 2 + 0.0625 + i * (W - 0.125) / 4], tone);
    };

    const h = mix(0.085, 0.2, a.lift);
    // Forks, tips and the little load rollers that swing down as it lifts.
    for (const z of [-0.19, 0.19]) {
      s.box([1.15, 0.05, 0.16], [0.575, h - 0.025, z], forkPaint);
      const tip = s.box([0.1, 0.028, 0.13], [1.185, h - 0.034, z], steel);
      tip.rotation.z = -0.12;
      wheel(0.04, 0.09, [0.93, 0.04, z], tyre);
      if (h > 0.1) s.rod([0.86, h - 0.04, z], [0.93, 0.04, z], 0.012, steel);
      const scuffs = Math.round(mood.wear * 9);
      for (let i = 0; i < scuffs; i++)
        s.box([0.05 + random() * 0.16, 0.002, 0.02 + random() * 0.05], [0.15 + random() * 0.9, h + 0.001, z + (random() - 0.5) * 0.09], steel);
    }
    // Bulkhead, gussets, pump and steer wheels.
    s.box([0.09, 0.34, 0.54], [-0.035, h + 0.12, 0], body);
    s.box([0.2, 0.05, 0.36], [-0.14, h + 0.26, 0], body);
    for (const z of [-0.17, 0.17]) s.rod([-0.05, h + 0.02, z], [-0.2, h + 0.24, z * 0.6], 0.02, body);
    s.cylinder(0.055, 0.06, 0.3, [-0.21, 0.31, 0], dark, 18);
    s.cylinder(0.03, 0.03, h + 0.2, [-0.21, 0.36 + (h + 0.2) / 2 - 0.1, 0], chrome, 14);
    s.box([0.1, 0.07, 0.09], [-0.3, 0.3, 0.07], dark);
    for (const z of [-0.065, 0.065]) wheel(0.09, 0.055, [-0.21, 0.09, z], tyre);
    wheel(0.02, 0.2, [-0.21, 0.09, 0], steel);
    s.box([0.06, 0.1, 0.03], [-0.21, 0.15, 0], steel);
    s.label('2500 kg', 0.2, 0.06, [-0.082, h + 0.22, 0], '#1b1d1f', '#f0ead2').rotation.y = -Math.PI / 2;
    if (a.marking !== 'none') {
      const text = { bay: 'BAY 4', hire: 'HIRE ME', name: 'DAVE', keep: 'DO NOT REMOVE' }[a.marking];
      const hand = a.marking === 'name';
      const plate = s.label(text, 0.44, 0.13, [-0.083, h + 0.1, 0], a.marking === 'hire' ? '#ffffff' : '#15171a', a.marking === 'hire' ? '#1d3f8f' : hand ? '#e9e4d2' : '#f4d13a');
      plate.rotation.y = -Math.PI / 2;
      if (hand) plate.rotation.x = 0.07;
    }

    // Tiller with its loop handle and release lever.
    const tilt = { upright: 0.1, pulled: 0.75, dropped: 1.42 }[a.handle] + (random() - 0.5) * 0.08;
    const dir = new THREE.Vector3(-Math.sin(tilt), Math.cos(tilt), 0);
    const pivot = new THREE.Vector3(-0.23, 0.44, 0);
    const along = (d: number, z = 0): P3 => [pivot.x + dir.x * d, pivot.y + dir.y * d, z];
    s.ball([0.05, 0.05, 0.07], [pivot.x, pivot.y, 0], body, 12);
    s.rod(along(0), along(0.78), 0.022, body);
    s.tube([along(0.76, 0), along(0.8, 0.15), along(0.9, 0.19), along(1.0, 0.15), along(1.02, 0), along(1.0, -0.15), along(0.9, -0.19), along(0.8, -0.15)], 0.017, dark, true);
    s.rod(along(0.86, -0.05), along(0.93, 0.07), 0.012, a.paint === 'red' ? dark : s.material('#c7302a'));

    // What it carries.
    const liftY = Math.max(0, h - 0.1);
    const cx = 0.62;
    if (a.load !== 'none') pallet(liftY, cx);
    const top = liftY + 0.144;
    if (a.load === 'empties') {
      const count = 3 + Math.round(mood.density * 5);
      for (let i = 1; i <= count; i++) {
        const g = new THREE.Group();
        const before = s.root.children.length;
        pallet(0, 0, i % 2 ? woodDark : wood);
        for (const child of s.root.children.slice(before)) g.add(child);
        g.position.set(cx + (random() - 0.5) * 0.06, liftY + i * 0.146, (random() - 0.5) * 0.06);
        g.rotation.y = (random() - 0.5) * 0.12;
        s.root.add(g);
      }
    } else if (a.load === 'cartons') {
      const layers = 2 + Math.round(mood.density * 2);
      const tones = ['#b98a55', '#c79a63', '#a97c4a', '#bf9460'];
      for (let layer = 0; layer < layers; layer++)
        for (let ix = 0; ix < 3; ix++)
          for (let iz = 0; iz < 2; iz++) {
            if (layer === layers - 1 && random() < 0.35) continue;
            const box = s.box([0.37, 0.27, 0.37], [cx - 0.39 + ix * 0.39 + (random() - 0.5) * 0.03, top + 0.135 + layer * 0.272, -0.195 + iz * 0.39 + (random() - 0.5) * 0.03], s.material(tones[Math.floor(random() * tones.length)], { roughness: 0.9 }));
            box.rotation.y = (random() - 0.5) * 0.1;
            s.box([0.375, 0.004, 0.05], [box.position.x, box.position.y + 0.135, box.position.z], s.material('#d9c9a0', { roughness: 0.5 })).rotation.y = box.rotation.y;
          }
    } else if (a.load === 'sacks') {
      const layers = 3 + Math.round(mood.density * 3);
      const paper = s.material('#c9ab78', { roughness: 0.95 });
      const band = s.material(mood.cheer > 0.5 ? '#c8452f' : '#3b6ea5', { roughness: 0.9 });
      for (let layer = 0; layer < layers; layer++) {
        const turned = layer % 2 === 1;
        for (let i = 0; i < 4; i++) {
          if (layer === layers - 1 && i === 3 && random() < 0.6) continue;
          const u = (i % 2 - 0.5), v = (Math.floor(i / 2) - 0.5);
          const at: P3 = [cx + (turned ? v * 0.62 : u * 0.6) + (random() - 0.5) * 0.04, top + 0.075 + layer * 0.128, (turned ? u * 0.4 : v * 0.4) + (random() - 0.5) * 0.04];
          const sack = s.ball([0.31, 0.082, 0.21], at, paper, 14);
          sack.rotation.y = (random() - 0.5) * 0.14;
          const stripe = s.ball([0.1, 0.084, 0.212], at, band, 12);
          stripe.rotation.y = sack.rotation.y;
        }
      }
    } else if (a.load === 'drums') {
      const colours = ['#2b5ea0', '#b53a2e', '#2a2d30', '#3c7a52'];
      const pick = colours[Math.floor(random() * colours.length)];
      for (const x of [-0.3, 0.3]) {
        const paintDrum = s.material(random() < 0.75 ? pick : colours[Math.floor(random() * colours.length)], { metalness: 0.35, roughness: 0.45 });
        const z = (random() - 0.5) * 0.08;
        s.cylinder(0.285, 0.285, 0.86, [cx + x, top + 0.43, z], paintDrum, 28);
        for (const y of [0.02, 0.3, 0.58, 0.86]) s.ring(0.287, 0.012, [cx + x, top + y, z], paintDrum).rotation.x = Math.PI / 2;
        s.cylinder(0.03, 0.03, 0.02, [cx + x + 0.17, top + 0.875, z], steel, 10);
      }
    } else if (a.load === 'crate') {
      const ply = s.material('#d2b17c', { roughness: 0.9 });
      const w = 1.02, d = 0.72, ht = 0.7 + mood.density * 0.3;
      s.box([w, ht, d], [cx, top + ht / 2, 0], ply);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.08, ht + 0.02, 0.03], [cx + x * (w / 2 - 0.04), top + ht / 2, z * (d / 2 + 0.012)], woodDark);
      for (const y of [0.05, ht - 0.05]) for (const z of [-1, 1]) s.box([w + 0.02, 0.08, 0.03], [cx, top + y, z * (d / 2 + 0.014)], woodDark);
      s.label('FRAGILE', 0.6, 0.16, [cx, top + ht * 0.55, d / 2 + 0.031], '#b3261e', '#d2b17c').rotation.z = (random() - 0.5) * 0.1;
      const side = s.label('THIS WAY UP', 0.5, 0.11, [cx - w / 2 - 0.002, top + ht * 0.6, 0], '#22252a', '#d2b17c');
      side.rotation.y = -Math.PI / 2;
    }

    // The story.
    if (a.state === 'abandoned') {
      const glove = s.material('#d8a12c', { roughness: 0.95 });
      const g = along(1.0, 0.1);
      s.ball([0.05, 0.035, 0.09], [g[0], g[1] + 0.03, g[2]], glove, 10).rotation.x = 0.5;
      s.ball([0.05, 0.035, 0.09], [g[0] - 0.01, g[1] + 0.035, g[2] - 0.2], glove, 10).rotation.x = -0.4;
      if (a.load === 'none') {
        s.cylinder(0.04, 0.03, 0.1, [0.4 + random() * 0.4, h + 0.05, 0.19], s.material('#f1ede2'), 14);
        s.cylinder(0.042, 0.042, 0.012, [s.root.children.at(-1)!.position.x, h + 0.106, 0.19], dark, 14);
      } else s.cylinder(0.04, 0.03, 0.1, [-0.14, h + 0.335, 0.1], s.material('#f1ede2'), 14);
    } else if (a.state === 'tagged') {
      const at = along(0.8, 0.2);
      const tag = s.label('DO NOT USE', 0.24, 0.13, [at[0], at[1] - 0.12, at[2] + 0.01], '#ffffff', '#c7261e');
      tag.rotation.y = -0.5;
      tag.rotation.z = 0.12;
      s.rod(at, [at[0], at[1] - 0.06, at[2] + 0.01], 0.004, dark);
    } else if (a.state === 'leaking') {
      const oil = new THREE.MeshStandardMaterial({ color: '#3b2f22', roughness: 0.12, metalness: 0.3 });
      for (let i = 0; i < 4; i++) s.cylinder(0.07 + random() * 0.09, 0.07 + random() * 0.09, 0.004, [-0.25 + (random() - 0.5) * 0.3, 0.002 + i * 0.0005, (random() - 0.5) * 0.4], oil, 20).scale.z = 0.6 + random() * 0.6;
      const rag = s.ball([0.12, 0.03, 0.09], [-0.5, 0.025, 0.28], s.material('#b9c1c9', { roughness: 1 }), 8);
      rag.rotation.y = random() * 3;
    } else if (a.state === 'chained') {
      const bx = -0.62, bz = 0.34;
      s.cylinder(0.07, 0.07, 0.95, [bx, 0.475, bz], s.material('#e8b317'), 18);
      s.ball([0.07, 0.04, 0.07], [bx, 0.95, bz], s.material('#e8b317'), 14);
      for (const y of [0.55, 0.75]) s.cylinder(0.072, 0.072, 0.08, [bx, y, bz], dark, 18);
      s.cylinder(0.11, 0.11, 0.02, [bx, 0.01, bz], steel, 18);
      const p = along(0.35);
      s.tube([[bx, 0.62, bz], [bx + 0.12, 0.42, bz - 0.1], [p[0] - 0.05, 0.42, 0.1], p, [p[0] + 0.03, 0.5, -0.05], [bx + 0.15, 0.5, bz - 0.2], [bx, 0.62, bz]], 0.011, steel);
      s.box([0.05, 0.06, 0.025], [bx + 0.09, 0.5, bz - 0.06], s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 }));
    }

    s.root.rotation.y = 0.62 + (random() - 0.5) * (a.state === 'abandoned' ? 0.9 : 0.25);
    return s.finish();
  },
});
