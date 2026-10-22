import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { drapeBox, paint } from './helpers';

const TAU = Math.PI * 2;
type P3 = [number, number, number];
const WRAP = {
  whitegold: { paper: ['#fbf9f2', '#f1e7cc', '#d4ae52', '#e9e3d0'], ribbon: ['#d4ae52', '#ffffff', '#c9a13f'], cloth: '#f3ecdf' },
  kraft: { paper: ['#b8935a', '#c9a56c', '#a8834a', '#d2b382'], ribbon: ['#e9dcc0', '#b3202e', '#4a6e3c'], cloth: '#e9e0cc' },
  pastel: { paper: ['#f6c9d4', '#c9e4f0', '#d9eec9', '#fbe8b0', '#e0d0f0'], ribbon: ['#ffffff', '#f08aa8', '#7ab8d9'], cloth: '#fbf6ee' },
  bold: { paper: ['#e23b3b', '#2f6fd6', '#f2c230', '#3fae5a', '#8a4fd0', '#ff6fa8', '#19b5a5'], ribbon: ['#ffffff', '#f2c230', '#1b1b1f'], cloth: '#f6f3ea' },
  silver: { paper: ['#b4bec8', '#98a4b0', '#cfd7de', '#7f8fa0'], ribbon: ['#ffffff', '#2f4f7a'], cloth: '#2f3d5c' },
  black: { paper: ['#1f1f24', '#2a2a30', '#3a1a22'], ribbon: ['#b3202e', '#d4ae52'], cloth: '#6e1f30' },
} as const;

export default defineThing({
  questions: {
    laden: score('How laden is the table?', ['Three modest gifts', 'A respectable pile', 'Stacked high', 'Overflowing onto the floor all round']),
    wrapping: choice('How are the presents wrapped?', {
      whitegold: 'White, cream and gold with satin ribbon.',
      kraft: 'Brown kraft paper tied with twine and sprigs.',
      pastel: 'Soft pastels: pink, mint, sky, lemon.',
      bold: 'Every loud colour at once, nothing matching.',
      silver: 'Matching silver from one department-store gift list.',
      black: 'Black paper with blood-red ribbon.',
    }),
    cards: choice('Where do the cards go?', {
      birdcage: 'A white wire birdcage.',
      postbox: 'A miniature red pillar postbox.',
      suitcase: 'An open vintage suitcase.',
      well: 'A little wooden wishing well.',
      glassbox: 'A glass and brass box with the envelopes visible inside.',
    }),
    plan: choice('What is the seating plan on the easel styled as?', {
      mirror: 'White handwriting on a gilt-framed mirror.',
      window: 'An old salvaged window, a table in every pane.',
      chalkboard: 'A chalkboard in a wooden frame.',
      tags: 'Rows of luggage tags tied to a rustic board.',
      map: 'A world map with pins, each table a place the couple has been.',
      vinyl: 'A board of vinyl records, each table an album.',
    }),
    story: choice('Is there a story detail?', {
      none: 'No, it is just a gift table.',
      'apart-card': 'One unopened envelope, a different colour from the rest, set apart on its own at the corner.',
      'blank-page': 'The guest book lies open at a page left conspicuously blank, the pen across it.',
      'too-large': 'One present is absurdly large, taller than the table, standing beside it.',
      giveaway: 'One present is so badly disguised it is obviously a wrapped bicycle.',
    }),
    table: choice('What kind of table is it?', {
      linen: 'A table draped to the floor in linen.',
      farmhouse: 'A bare wooden farmhouse table with a lace runner.',
      barrels: 'A plank laid across two barrels.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <V,>(list: readonly V[]) => list[Math.floor(random() * list.length)];
    const wrap = WRAP[a.wrapping];
    const TW = 1.5, TD = 0.75, T = 0.76;

    // Batched parts.
    const tone = (kind: 'dots' | 'stripes') => {
      const tex = paint(64, 64, (ctx) => {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#b9b9b9';
        if (kind === 'dots') for (const [x, y] of [[16, 16], [48, 48], [48, 16], [16, 48]]) { ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); }
        else for (let k = 0; k < 4; k++) ctx.fillRect(k * 16, 0, 7, 64);
      });
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 2);
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
    };
    const flame = new THREE.MeshStandardMaterial({ color: '#fff1c9', emissive: new THREE.Color().setHSL(mix(0.14, 0.08, mood.warmth), 0.9, 0.6), emissiveIntensity: mix(0.9, 2.2, mood.cheer) });
    const GEO: Record<string, () => THREE.BufferGeometry> = {
      box: () => new THREE.BoxGeometry(1, 1, 1),
      cyl: () => new THREE.CylinderGeometry(1, 1, 1, 14),
      ball: () => new THREE.SphereGeometry(1, 10, 7),
      bloom: () => new THREE.IcosahedronGeometry(1, 1),
    };
    const MAT: Record<string, () => THREE.Material> = {
      matte: () => new THREE.MeshStandardMaterial({ roughness: 0.75 + mood.wear * 0.2 }),
      satin: () => new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.15 }),
      metal: () => new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.8 }),
      dots: () => tone('dots'),
      stripes: () => tone('stripes'),
      glass: () => new THREE.MeshStandardMaterial({ color: '#e6f2f6', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }),
      flame: () => flame,
    };
    const batches = new Map<string, { geo: string; mat: string; m: THREE.Matrix4[]; c: THREE.Color[] }>();
    const put = (geo: string, mat: string, m: THREE.Matrix4, color: THREE.ColorRepresentation = '#ffffff') => {
      const key = `${geo}|${mat}`;
      if (!batches.has(key)) batches.set(key, { geo, mat, m: [], c: [] });
      const b = batches.get(key)!; b.m.push(m); b.c.push(new THREE.Color(color));
    };
    const M = (p: P3, sc: P3 | number = 1, r: P3 = [0, 0, 0]) => new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], 'YXZ')), typeof sc === 'number' ? new THREE.Vector3(sc, sc, sc) : new THREE.Vector3(...sc));
    const I = new THREE.Matrix4();
    const on = (parent: THREE.Matrix4, local: THREE.Matrix4) => parent.clone().multiply(local);
    const box = (parent: THREE.Matrix4, mat: string, size: P3, p: P3, color: THREE.ColorRepresentation, r: P3 = [0, 0, 0]) => put('box', mat, on(parent, M(p, size, r)), color);
    const cyl = (parent: THREE.Matrix4, mat: string, radius: number, h: number, p: P3, color: THREE.ColorRepresentation, r: P3 = [0, 0, 0]) => put('cyl', mat, on(parent, M(p, [radius, h, radius], r)), color);
    const ball = (parent: THREE.Matrix4, mat: string, size: P3 | number, p: P3, color: THREE.ColorRepresentation) => put('ball', mat, on(parent, M(p, size)), color);

    // Table.
    if (a.table === 'linen') s.mesh(drapeBox(TW, T, TD, 0.02, 0.2), s.material(wrap.cloth, { roughness: 0.85 }), [0, T / 2, 0]);
    else if (a.table === 'farmhouse') {
      const wood = '#9a6b3e';
      box(I, 'matte', [TW, 0.05, TD], [0, T - 0.025, 0], wood);
      box(I, 'matte', [TW - 0.16, 0.1, TD - 0.16], [0, T - 0.1, 0], '#855a32');
      for (const ex of [-1, 1]) for (const ez of [-1, 1]) box(I, 'matte', [0.08, T - 0.05, 0.08], [ex * (TW / 2 - 0.09), (T - 0.05) / 2, ez * (TD / 2 - 0.09)], wood);
      box(I, 'matte', [TW + 0.008, 0.004, 0.36], [0, T + 0.002, 0], '#fbf7ea');
      for (const ex of [-1, 1]) box(I, 'matte', [0.004, 0.26, 0.36], [ex * (TW / 2 + 0.002), T - 0.127, 0], '#fbf7ea');
    } else {
      box(I, 'matte', [TW + 0.3, 0.05, TD], [0, T - 0.025, 0], '#b08a52');
      for (const ex of [-1, 1]) {
        s.lathe([[0, 0], [0.24, 0], [0.29, 0.18], [0.31, 0.355], [0.29, 0.53], [0.24, 0.71], [0, 0.71]], s.material('#8a5a34', { roughness: 0.85 }), [ex * 0.5, 0, 0]);
        for (const [yy, k] of [[0.06, 0.26], [0.2, 0.3], [0.5, 0.3], [0.65, 0.26]] as const) cyl(I, 'metal', k, 0.03, [ex * 0.5, yy, 0], '#55524e');
      }
    }

    // A wrapped present.
    const gift = (G: THREE.Matrix4, w: number, h: number, d: number, round = false) => {
      const paper = pick(wrap.paper), ribbon = pick(wrap.ribbon.filter((c) => c.toLowerCase() !== paper.toLowerCase())) ?? '#ffffff';
      const mat = a.wrapping === 'kraft' ? 'matte' : a.wrapping === 'silver' ? 'metal' : pick(['matte', 'satin', 'dots', 'stripes', 'matte']);
      const rw = Math.min(w, d) * 0.14;
      if (round) { cyl(G, mat, w / 2, h, [0, h / 2, 0], paper); cyl(G, 'satin', w / 2 + 0.004, rw, [0, h * 0.55, 0], ribbon); cyl(G, mat, w / 2 + 0.008, h * 0.22, [0, h * 0.89, 0], paper); }
      else { box(G, mat, [w, h, d], [0, h / 2, 0], paper); box(G, 'satin', [w + 0.005, h + 0.005, rw], [0, h / 2, 0], ribbon); box(G, 'satin', [rw, h + 0.005, d + 0.005], [0, h / 2, 0], ribbon); }
      const bs = Math.min(0.1, Math.max(0.035, Math.min(w, d) * 0.28));
      if (a.wrapping === 'kraft') { put('bloom', 'matte', on(G, M([0.01, h + bs * 0.4, 0], bs * 0.5)), pick(['#4a6e3c', '#7c9a58', '#b3202e'])); box(G, 'matte', [bs * 2.4, 0.006, 0.012], [0, h + 0.006, 0], '#4a6e3c', [0, 0.6, 0]); }
      else { for (const e of [-1, 1]) ball(G, 'satin', [bs, bs * 0.5, bs * 0.55], [e * bs * 0.85, h + bs * 0.4, 0], ribbon); ball(G, 'satin', bs * 0.36, [0, h + bs * 0.4, 0], ribbon); for (const e of [-1, 1]) box(G, 'satin', [bs * 1.5, 0.004, bs * 0.4], [e * bs * 0.6, h + 0.004, bs * 0.7], ribbon, [0, e * 0.9, 0]); }
      if (random() < 0.35) box(G, 'matte', [0.05, 0.002, 0.03], [w * 0.28, h + 0.004, -d * 0.28], '#fbf7ea', [0, random(), 0]);
    };
    const bag = (G: THREE.Matrix4, w: number, h: number) => {
      const paper = pick(wrap.paper), d = w * 0.45;
      box(G, 'matte', [w, h, d], [0, h / 2, 0], paper);
      for (const e of [-1, 1]) { box(G, 'matte', [0.008, h * 0.35, 0.008], [-w * 0.2, h + h * 0.15, e * d * 0.48], pick(wrap.ribbon)); box(G, 'matte', [0.008, h * 0.35, 0.008], [w * 0.2, h + h * 0.15, e * d * 0.48], pick(wrap.ribbon)); box(G, 'matte', [w * 0.4, 0.008, 0.008], [0, h + h * 0.32, e * d * 0.48], pick(wrap.ribbon)); }
      for (let k = 0; k < 4; k++) box(G, 'matte', [w * 0.5, h * 0.25, 0.004], [(random() - 0.5) * w * 0.4, h + 0.02, (random() - 0.5) * d * 0.6], '#fbf7ea', [random() * 0.6 - 0.3, random() * 2, random() * 0.6 - 0.3]);
    };

    // Table-top plan: an 8 x 3 grid of cells; some are reserved.
    const NX = 8, NZ = 3, cw = TW / NX * 0.92, cd = TD / NZ * 0.9;
    const cellAt = (i: number, j: number): [number, number] => [(i - (NX - 1) / 2) * (TW / NX) * 0.94, (j - (NZ - 1) / 2) * (TD / NZ) * 0.9];
    const taken = new Set<string>();
    for (const i of [0, 1, 2]) for (const j of [0, 1]) taken.add(`${i},${j}`);
    for (const i of [2, 3, 4, 5]) taken.add(`${i},2`);
    if (a.story === 'apart-card') for (const i of [6, 7]) for (const j of [1, 2]) taken.add(`${i},${j}`);
    const free: [number, number][] = [];
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) if (!taken.has(`${i},${j}`)) free.push([i, j]);
    const heights = new Map<string, { y: number; w: number; n: number }>();
    const count = Math.round(mix(3, 30, Math.min(1, a.laden * 1.15)));
    for (let k = 0; k < count; k++) {
      const [i, j] = k < 3 ? free[Math.min(free.length - 1, 2 + k * 2)] : pick(free);
      const key = `${i},${j}`, st = heights.get(key) ?? { y: T, w: Math.min(cw, cd) * 1.05, n: 0 };
      if (st.n >= 3 || st.y > T + 0.5) continue;
      const w = st.w * (0.7 + random() * 0.28), d = st.w * (0.7 + random() * 0.28), h = 0.05 + random() * (st.n === 0 ? 0.2 : 0.12);
      const [x, z] = cellAt(i, j);
      gift(M([x + (random() - 0.5) * 0.02, st.y, z + (random() - 0.5) * 0.02], 1, [0, (random() - 0.5) * 0.5, 0]), w, h, d, random() < 0.1);
      heights.set(key, { y: st.y + h + 0.004, w: Math.min(w, d) * 0.92, n: st.n + 1 });
    }
    // Overflow on the floor.
    const over = Math.max(0, a.laden - 0.5) * 2;
    const floorCount = Math.round(over * mix(9, 18, mood.density));
    for (let k = 0; k < floorCount; k++) {
      const front = random() < 0.65;
      const x = front ? (random() - 0.5) * (TW + 0.2) - 0.1 : -TW / 2 - 0.3 - random() * 0.5, z = front ? TD / 2 + 0.28 + random() * 0.55 : (random() - 0.5) * 0.9;
      const G = M([x, 0, z], 1, [0, (random() - 0.5) * 0.8, 0]);
      if (random() < 0.22) bag(G, 0.24 + random() * 0.12, 0.3 + random() * 0.15);
      else { const w = 0.2 + random() * 0.26, h = 0.12 + random() * 0.3, d = 0.2 + random() * 0.2; gift(G, w, h, d, random() < 0.12); if (random() < 0.4) gift(on(G, M([0, h + 0.004, 0], 1, [0, random(), 0])), w * 0.65, 0.08 + random() * 0.12, d * 0.65); }
    }

    // Card holder at the left.
    const hx = -TW / 2 + 0.3, hz = -0.08, env = ['#fbf7ea', '#f1e7cc', '#f6c9d4', '#c9e4f0', '#fbf7ea'];
    const envelope = (p: P3, r: P3, colour: string = pick(env), size = 1) => { box(I, 'matte', [0.17 * size, 0.004, 0.12 * size], p, colour, r); };
    if (a.cards === 'birdcage') {
      const wire = s.material('#f6f4ec', { roughness: 0.5 });
      s.cylinder(0.19, 0.2, 0.03, [hx, T + 0.015, hz], wire, 24);
      for (let k = 0; k < 10; k++) { const th = k / 10 * TAU, cx = Math.sin(th), cz = Math.cos(th); s.tube([[hx + cx * 0.18, T + 0.03, hz + cz * 0.18], [hx + cx * 0.18, T + 0.3, hz + cz * 0.18], [hx + cx * 0.15, T + 0.42, hz + cz * 0.15], [hx + cx * 0.07, T + 0.5, hz + cz * 0.07], [hx, T + 0.52, hz]], 0.005, wire); }
      for (const yy of [0.16, 0.3]) s.ring(0.18, 0.005, [hx, T + yy, hz], wire).rotation.x = Math.PI / 2;
      s.ring(0.03, 0.006, [hx, T + 0.56, hz], wire);
      for (let k = 0; k < 4 + Math.round(a.laden * 7); k++) envelope([hx + (random() - 0.5) * 0.14, T + 0.05 + k * 0.012, hz + (random() - 0.5) * 0.12], [(random() - 0.5) * 0.5, random() * TAU, (random() - 0.5) * 0.5], pick(env), 0.85);
    } else if (a.cards === 'postbox') {
      cyl(I, 'matte', 0.15, 0.04, [hx, T + 0.02, hz], '#17171b');
      cyl(I, 'satin', 0.13, 0.42, [hx, T + 0.25, hz], '#c2202e');
      cyl(I, 'satin', 0.145, 0.03, [hx, T + 0.47, hz], '#c2202e');
      ball(I, 'satin', [0.14, 0.06, 0.14], [hx, T + 0.485, hz], '#c2202e');
      box(I, 'matte', [0.13, 0.022, 0.02], [hx, T + 0.39, hz + 0.125], '#101012');
      s.label('CARDS', 0.14, 0.07, [hx, T + 0.28, hz + 0.133], '#1b1b1f', '#fbf7ea');
      envelope([hx + 0.01, T + 0.395, hz + 0.16], [0.15, 0.1, 0], '#fbf7ea', 0.7);
    } else if (a.cards === 'suitcase') {
      const leather = pick(['#7a4a2a', '#3f5f5a', '#8a2f2b']);
      box(I, 'matte', [0.44, 0.12, 0.3], [hx, T + 0.06, hz], leather);
      box(I, 'matte', [0.44, 0.3, 0.05], [hx, T + 0.24, hz - 0.17], leather, [-0.2, 0, 0]);
      box(I, 'matte', [0.4, 0.26, 0.01], [hx, T + 0.24, hz - 0.14], '#e9dcc0', [-0.2, 0, 0]);
      for (const e of [-1, 1]) box(I, 'metal', [0.03, 0.03, 0.02], [hx + e * 0.14, T + 0.11, hz + 0.155], '#c9a13f');
      for (let k = 0; k < 5 + Math.round(a.laden * 8); k++) envelope([hx + (random() - 0.5) * 0.26, T + 0.125 + k * 0.006, hz + (random() - 0.5) * 0.14], [(random() - 0.5) * 0.3, random() * TAU, 0]);
      for (let k = 0; k < 5; k++) box(I, 'matte', [0.05, 0.06, 0.003], [hx - 0.14 + k * 0.07, T + 0.3 - Math.sin(k / 4 * Math.PI) * 0.03, hz - 0.125], pick(wrap.paper), [-0.2, 0, Math.PI / 4]);
    } else if (a.cards === 'well') {
      const stone = '#a9a294', wood = '#8a5a34';
      cyl(I, 'matte', 0.17, 0.2, [hx, T + 0.1, hz], stone); cyl(I, 'matte', 0.13, 0.205, [hx, T + 0.1, hz], '#2a2a2e');
      for (const e of [-1, 1]) box(I, 'matte', [0.03, 0.42, 0.03], [hx + e * 0.16, T + 0.3, hz], wood);
      for (const e of [-1, 1]) box(I, 'matte', [0.26, 0.015, 0.34], [hx + e * 0.1, T + 0.53, hz], '#6a3f22', [0, 0, e * -0.6]);
      cyl(I, 'matte', 0.012, 0.34, [hx, T + 0.4, hz], wood, [0, 0, Math.PI / 2]);
      cyl(I, 'matte', 0.05, 0.07, [hx, T + 0.3, hz], '#b08a52');
      for (let k = 0; k < 3; k++) envelope([hx + (random() - 0.5) * 0.1, T + 0.21, hz + (random() - 0.5) * 0.1], [0.6, random() * TAU, 0.3], pick(env), 0.8);
    } else {
      const bw = 0.36, bh = 0.26, bd = 0.26, brass = '#c9a13f';
      box(I, 'glass', [bw, bh, bd], [hx, T + bh / 2, hz], '#ffffff');
      for (const ex of [-1, 1]) for (const ez of [-1, 1]) box(I, 'metal', [0.012, bh, 0.012], [hx + ex * bw / 2, T + bh / 2, hz + ez * bd / 2], brass);
      for (const yy of [0, bh]) { for (const ez of [-1, 1]) box(I, 'metal', [bw, 0.012, 0.012], [hx, T + yy, hz + ez * bd / 2], brass); for (const ex of [-1, 1]) box(I, 'metal', [0.012, 0.012, bd], [hx + ex * bw / 2, T + yy, hz], brass); }
      for (const ez of [-1, 1]) box(I, 'metal', [0.012, 0.012, bd * 0.75], [hx, T + bh + 0.07, hz + ez * bd * 0.0], brass);
      for (const ex of [-1, 1]) for (const ez of [-1, 1]) box(I, 'metal', [0.01, 0.01, Math.hypot(bw / 2, 0.07) * 1.02], [hx + ex * bw / 4, T + bh + 0.035, hz + ez * bd / 2 * 0.5], brass, [0.3 * ez, ex * 1.2, 0]);
      for (let k = 0; k < 6 + Math.round(a.laden * 10); k++) envelope([hx + (random() - 0.5) * 0.14, T + 0.01 + k * 0.012, hz + (random() - 0.5) * 0.1], [(random() - 0.5) * 0.4, random() * TAU, (random() - 0.5) * 0.4], pick(env), 0.9);
    }

    // Guest book and pen.
    const blank = a.story === 'blank-page';
    const gx = 0.02, gz = TD / 2 - 0.16;
    const pageTex = (empty: boolean) => paint(128, 160, (ctx, w, h) => {
      ctx.fillStyle = '#fdfbf2'; ctx.fillRect(0, 0, w, h);
      if (empty) return;
      for (let k = 0; k < 9; k++) {
        ctx.strokeStyle = pick(['#1f2a55', '#1b1b1f', '#7a1528', '#1f2a55']); ctx.lineWidth = 2; ctx.beginPath();
        const y = 16 + k * 16, x0 = 10 + random() * 20; ctx.moveTo(x0, y);
        for (let x = x0; x < w - 14 - random() * 40; x += 5) ctx.lineTo(x, y + (random() - 0.5) * 7);
        ctx.stroke();
      }
    });
    const bookScale = blank ? 1.5 : 1.15;
    const book = new THREE.Group();
    book.add(s.box([0.5, 0.02, 0.34], [0, 0.01, 0], s.material(pick(['#3a2a1a', '#6e1f30', '#27405c', '#f1e7cc']))));
    for (const e of [-1, 1]) {
      const page = s.box([0.235, 0.014, 0.32], [e * 0.12, 0.026, 0], s.material('#fdfbf2'));
      (page as THREE.Mesh).material = [page.material, page.material, new THREE.MeshStandardMaterial({ map: pageTex(blank ? e === 1 : random() < 0.15), roughness: 0.9 }), page.material, page.material, page.material];
      page.rotation.z = e * -0.06;
      book.add(page);
    }
    const pen = s.cylinder(0.006, 0.004, 0.17, [blank ? 0.12 : 0.3, 0.045, blank ? 0 : 0.05], s.material('#1b1b1f', { roughness: 0.3 }), 8);
    pen.rotation.set(Math.PI / 2, 0, blank ? 0.9 : 0.3, 'YXZ');
    book.add(pen);
    book.scale.setScalar(bookScale);
    book.position.set(gx, T + 0.002, gz - (blank ? 0.06 : 0));
    book.rotation.y = (random() - 0.5) * 0.2;
    s.root.add(book);
    if (!blank) { const tent = s.label('PLEASE SIGN', 0.22, 0.09, [gx + 0.42, T + 0.05, gz - 0.06], '#3a2a1a', '#fbf7ea'); tent.rotation.set(-0.3, -0.2, 0, 'YXZ'); }

    // Story details.
    if (a.story === 'apart-card') {
      const c = a.wrapping === 'bold' || a.wrapping === 'black' ? '#fbf7ea' : pick(['#b3202e', '#1f2a55', '#1b1b1f']);
      envelope([TW / 2 - 0.2, T + 0.004, 0.12], [0, 0.12, 0], c, 1.5);
      box(I, 'matte', [0.1, 0.002, 0.004], [TW / 2 - 0.2, T + 0.008, 0.12], c === '#fbf7ea' ? '#1b1b1f' : '#fbf7ea', [0, 0.12, 0]);
    }
    if (a.story === 'too-large') {
      const w = 0.95 + random() * 0.25, h = 1.25 + random() * 0.35, d = 0.8 + random() * 0.2;
      gift(M([-TW / 2 - w / 2 - 0.25, 0, 0.15], 1, [0, 0.25, 0]), w, h, d);
    }
    if (a.story === 'giveaway') {
      const paper = pick(wrap.paper), ribbon = pick(wrap.ribbon), R = 0.33;
      const B = M([-TW / 2 - 0.85, 0, 0.35], 1, [-0.16, 0.22, 0]);
      const bar = (from: P3, to: P3, r: number) => { const va = new THREE.Vector3(...from), vb = new THREE.Vector3(...to), dir = vb.clone().sub(va); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); put('cyl', 'matte', on(B, new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), q, new THREE.Vector3(r, dir.length(), r))), paper); };
      for (const x of [-0.52, 0.52]) cyl(B, 'matte', R, 0.07, [x, R, 0], paper, [Math.PI / 2, 0, 0]);
      bar([-0.52, R, 0], [-0.1, R, 0], 0.035); bar([-0.1, R, 0], [-0.22, 0.86, 0], 0.035); bar([-0.22, 0.86, 0], [0.36, 0.84, 0], 0.035); bar([-0.1, R, 0], [0.36, 0.84, 0], 0.035); bar([0.52, R, 0], [0.34, 0.98, 0], 0.035); bar([-0.52, R, 0], [-0.22, 0.86, 0], 0.03);
      bar([0.34, 1.0, -0.26], [0.34, 1.0, 0.26], 0.03);
      ball(B, 'matte', [0.14, 0.05, 0.08], [-0.25, 0.94, 0], paper);
      for (const e of [-1, 1]) ball(B, 'satin', [0.1, 0.06, 0.06], [0.34 + e * 0.09, 1.08, 0], ribbon);
      ball(B, 'satin', 0.04, [0.34, 1.08, 0], ribbon);
      for (const x of [-0.52, 0.52]) cyl(B, 'satin', R + 0.004, 0.02, [x, R, 0], ribbon, [Math.PI / 2, 0, 0]);
    }

    // Seating plan on an easel.
    const heading = pick(['FIND YOUR SEAT', 'SEATING PLAN', 'PLEASE BE SEATED', 'WHO SITS WHERE']);
    const BW = 0.78, BH = 1.05;
    const plan = paint(384, 512, (ctx, w, h) => {
      const scribble = (x: number, y: number, len: number, colour: string, width = 2) => { ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 4; k < len; k += 4) ctx.lineTo(x + k, y + (random() - 0.5) * 4); ctx.stroke(); };
      const title = (colour: string, y = 44) => { ctx.fillStyle = colour; ctx.font = 'bold 30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(heading, w / 2, y, w - 40); };
      const columns = (colour: string, top: number, cols: number, rows: number) => { for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const x0 = 30 + c * (w - 60) / cols, y0 = top + r * (h - top - 20) / rows; scribble(x0 + 10, y0 + 8, (w - 60) / cols - 40, colour, 4); for (let k = 0; k < 6; k++) scribble(x0 + 6, y0 + 28 + k * 13, (w - 60) / cols - 30 - random() * 30, colour); } };
      if (a.plan === 'mirror') { const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#c9d6dc'); g.addColorStop(0.5, '#eef4f6'); g.addColorStop(1, '#aebdc6'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); title('#ffffff'); columns('#ffffff', 80, 3, 3); }
      if (a.plan === 'chalkboard') { ctx.fillStyle = '#23272a'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let k = 0; k < 30; k++) ctx.fillRect(random() * w, random() * h, 80, 14); title('#f4f1e6'); columns('#f4f1e6', 80, 2, 3); ctx.fillStyle = '#ff9ab8'; ctx.font = '34px serif'; ctx.fillText('♥', w / 2, h - 24); }
      if (a.plan === 'window') { ctx.fillStyle = '#b4cbd3'; ctx.fillRect(0, 0, w, h); columns('#ffffff', 22, 2, 3); ctx.strokeStyle = '#9db0a0'; ctx.lineWidth = 16; ctx.strokeRect(0, 0, w, h); ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); for (const f of [1 / 3, 2 / 3]) { ctx.moveTo(0, h * f); ctx.lineTo(w, h * f); } ctx.stroke(); }
      if (a.plan === 'tags') { ctx.fillStyle = '#9a7248'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(60,35,15,0.35)'; for (let k = 1; k < 6; k++) ctx.fillRect(0, k * h / 6 - 2, w, 4); title('#fbf7ea', 36); for (let r = 0; r < 4; r++) { ctx.strokeStyle = '#e9dcc0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, 90 + r * 105); ctx.lineTo(w - 10, 96 + r * 105); ctx.stroke(); for (let c = 0; c < 6; c++) { const x = 28 + c * 57 + random() * 6, y = 96 + r * 105; ctx.fillStyle = '#d9bf8f'; ctx.fillRect(x, y, 40, 66); ctx.fillStyle = '#9a7248'; ctx.beginPath(); ctx.arc(x + 20, y + 8, 4, 0, TAU); ctx.fill(); scribble(x + 6, y + 26, 30, '#3a2a1a'); scribble(x + 6, y + 40, 24, '#3a2a1a'); } } }
      if (a.plan === 'map') { ctx.fillStyle = '#a9cfe0'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#c9d6a0'; for (const [x, y, rx, ry] of [[90, 170, 70, 90], [130, 340, 40, 80], [250, 190, 90, 70], [300, 330, 50, 44], [220, 120, 60, 30]]) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, random(), 0, TAU); ctx.fill(); } ctx.fillStyle = '#fbf7ea'; ctx.fillRect(0, 0, w, 72); title('#27405c', 38); for (let k = 0; k < 9; k++) { const x = 40 + random() * (w - 80), y = 110 + random() * (h - 160); ctx.strokeStyle = '#b3202e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30, y - 22); ctx.stroke(); ctx.fillStyle = '#b3202e'; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#fbf7ea'; ctx.fillRect(x + 28, y - 34, 50, 22); scribble(x + 32, y - 23, 40, '#1b1b1f'); } }
      if (a.plan === 'vinyl') { ctx.fillStyle = '#e9dcc0'; ctx.fillRect(0, 0, w, h); title('#1b1b1f', 38); for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { const x = 100 + c * 184, y = 150 + r * 140; ctx.fillStyle = '#141416'; ctx.beginPath(); ctx.arc(x, y, 62, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2e2e32'; ctx.lineWidth = 2; for (const rr of [34, 44, 54]) { ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.stroke(); } ctx.fillStyle = pick(['#e23b3b', '#f2c230', '#2f6fd6', '#3fae5a', '#ff6fa8']); ctx.beginPath(); ctx.arc(x, y, 24, 0, TAU); ctx.fill(); scribble(x - 16, y - 4, 32, '#1b1b1f'); scribble(x - 12, y + 8, 24, '#1b1b1f'); } }
    });
    const easel = new THREE.Group();
    const timber = s.material('#7a5230', { roughness: 0.8 });
    for (const e of [-1, 1]) easel.add(s.rod([e * 0.42, 0, 0.12], [e * 0.08, 1.95, -0.12], 0.02, timber));
    easel.add(s.rod([0, 0, -0.7], [0, 1.9, -0.13], 0.02, timber));
    easel.add(s.box([0.9, 0.04, 0.1], [0, 0.62, 0.1], timber));
    const frameCol = a.plan === 'mirror' ? s.material('#c9a13f', { metalness: 0.75, roughness: 0.3 }) : a.plan === 'window' ? s.material('#9db0a0') : a.plan === 'chalkboard' || a.plan === 'vinyl' ? s.material('#8a5a34') : s.material('#5a3d22');
    const board = s.box([BW + 0.09, BH + 0.09, 0.035], [0, 0.64 + (BH + 0.09) / 2, 0.02], frameCol);
    board.rotation.x = -0.13; board.position.z = 0.02 - 0.07;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshStandardMaterial({ map: plan, roughness: a.plan === 'mirror' ? 0.12 : 0.85, metalness: a.plan === 'mirror' ? 0.6 : 0 }));
    face.position.z = 0.019;
    board.add(face);
    easel.add(board);
    if (a.plan === 'mirror') for (const [x, y] of [[-1, 1], [1, 1], [-1, -1], [1, -1], [0, 1]] as const) { const knob = s.ball([0.06, 0.06, 0.03], [x * (BW / 2 + 0.03), y * (BH / 2 + 0.03) + (x === 0 ? 0.05 : 0), 0.01], frameCol); board.add(knob); }
    if (mood.cheer > 0.45) {
      const pts = [];
      for (let k = 0; k < 26; k++) { const f = k / 25, side = f < 0.4 ? 0 : f < 0.6 ? 1 : 2; const x = side === 0 ? -BW / 2 - 0.05 : side === 2 ? BW / 2 + 0.05 : mix(-BW / 2 - 0.05, BW / 2 + 0.05, (f - 0.4) / 0.2); const y = side === 0 ? mix(-BH / 2, BH / 2 + 0.05, f / 0.4) : side === 2 ? mix(BH / 2 + 0.05, -BH / 2, (f - 0.6) / 0.4) : BH / 2 + 0.06; pts.push({ at: [x, y, 0.03] as P3, size: 0.013 }); }
      const lights = s.scatter(new THREE.SphereGeometry(1, 6, 4), flame, pts);
      lights.castShadow = false;
      board.add(lights);
    }
    easel.position.set(TW / 2 + 0.62, 0, 0.32);
    easel.rotation.y = -0.38 + (random() - 0.5) * 0.15;
    s.root.add(easel);

    // Dressing that follows the mood.
    if (mood.cheer > 0.3 && a.table !== 'barrels') {
      const n = 11;
      for (let k = 0; k < n; k++) { const f = k / (n - 1), x = mix(-TW / 2 + 0.06, TW / 2 - 0.06, f), y = T - 0.08 - Math.sin(f * Math.PI) * 0.12; box(I, 'matte', [0.085, 0.085, 0.004], [x, y - 0.03, TD / 2 + 0.045 + (a.table === 'linen' ? 0.012 : 0)], pick(wrap.paper), [0, 0, Math.PI / 4]); box(I, 'matte', [0.14, 0.006, 0.004], [x, y + 0.028, TD / 2 + 0.043 + (a.table === 'linen' ? 0.012 : 0)], '#fbf7ea', [0, 0, (f - 0.5) * -0.5]); }
    }
    if (mood.density > 0.45) {
      const jx = TW / 2 - 0.12, jz = -TD / 2 + 0.12;
      cyl(I, 'glass', 0.045, 0.14, [jx, T + 0.07, jz], '#ffffff');
      for (let k = 0; k < 7; k++) { put('bloom', 'matte', M([jx + (random() - 0.5) * 0.12, T + 0.2 + random() * 0.1, jz + (random() - 0.5) * 0.12], 0.03 + random() * 0.02), pick(['#f3c6cc', '#fbf9f2', '#e59aa8', '#f1c232'])); box(I, 'matte', [0.004, 0.16, 0.004], [jx + (random() - 0.5) * 0.05, T + 0.14, jz + (random() - 0.5) * 0.05], '#4a6e3c'); }
    }
    for (let k = 0; k < Math.round(mood.wear * 8); k++) ball(I, 'matte', [0.05, 0.03, 0.05], [(random() - 0.5) * 2.4, 0.03, TD / 2 + 0.3 + random() * 0.8], pick(wrap.paper));

    for (const b of batches.values()) {
      const mesh = new THREE.InstancedMesh(GEO[b.geo](), MAT[b.mat](), b.m.length);
      b.m.forEach((m, k) => { mesh.setMatrixAt(k, m); mesh.setColorAt(k, b.c[k]); });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
      mesh.castShadow = b.mat !== 'glass' && b.mat !== 'flame';
      mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    const baseGlow = flame.emissiveIntensity;
    return s.finish({ update: (_dt, time) => { flame.emissiveIntensity = baseGlow * (1 + Math.sin(time * 2.6) * 0.3 * mood.energy); } });
  },
});
