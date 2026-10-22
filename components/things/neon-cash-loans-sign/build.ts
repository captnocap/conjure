import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { Batch, card, painted, pick } from './util';

type XY = readonly [number, number];
type Stroke = { points: readonly XY[]; closed?: boolean };
const line = (...points: XY[]): Stroke => ({ points });

// A bent-glass alphabet: every letter is a few continuous tubes in a 1 × 1.5 box.
const GLYPHS: Record<string, readonly Stroke[]> = {
  A: [line([0, 0], [0.5, 1.5], [1, 0]), line([0.22, 0.6], [0.78, 0.6])],
  B: [line([0, 0], [0, 1.5], [0.7, 1.5], [0.95, 1.3], [0.95, 1], [0.7, 0.78], [0, 0.78]), line([0.7, 0.78], [1, 0.55], [1, 0.25], [0.75, 0], [0, 0])],
  C: [line([1, 1.25], [0.75, 1.5], [0.25, 1.5], [0, 1.25], [0, 0.25], [0.25, 0], [0.75, 0], [1, 0.25])],
  D: [line([0, 0], [0, 1.5], [0.6, 1.5], [1, 1.1], [1, 0.4], [0.6, 0], [0, 0])],
  E: [line([1, 1.5], [0, 1.5], [0, 0], [1, 0]), line([0, 0.78], [0.75, 0.78])],
  G: [line([1, 1.25], [0.75, 1.5], [0.25, 1.5], [0, 1.25], [0, 0.25], [0.25, 0], [0.75, 0], [1, 0.25], [1, 0.7], [0.55, 0.7])],
  H: [line([0, 0], [0, 1.5]), line([1, 0], [1, 1.5]), line([0, 0.78], [1, 0.78])],
  L: [line([0, 1.5], [0, 0], [1, 0])],
  N: [line([0, 0], [0, 1.5], [1, 0], [1, 1.5])],
  O: [{ points: [[0.25, 0], [0.75, 0], [1, 0.25], [1, 1.25], [0.75, 1.5], [0.25, 1.5], [0, 1.25], [0, 0.25]], closed: true }],
  P: [line([0, 0], [0, 1.5], [0.7, 1.5], [1, 1.25], [1, 0.95], [0.7, 0.7], [0, 0.7])],
  S: [line([1, 1.25], [0.75, 1.5], [0.25, 1.5], [0, 1.25], [0, 0.95], [0.25, 0.78], [0.75, 0.72], [1, 0.55], [1, 0.25], [0.75, 0], [0.25, 0], [0, 0.25])],
  U: [line([0, 1.5], [0, 0.25], [0.25, 0], [0.75, 0], [1, 0.25], [1, 1.5])],
  W: [line([0, 1.5], [0.25, 0], [0.5, 1], [0.75, 0], [1, 1.5])],
  Y: [line([0, 1.5], [0.5, 0.75], [1, 1.5]), line([0.5, 0.75], [0.5, 0])],
};

const HUES = { red: '#ff2a3c', pink: '#ff4fb8', blue: '#4fcfff', green: '#3dff8a', amber: '#ffae2a', white: '#f2f5ff', purple: '#b06bff' } as const;
const SECOND: Record<keyof typeof HUES, keyof typeof HUES> = { red: 'white', pink: 'blue', blue: 'pink', green: 'amber', amber: 'red', white: 'red', purple: 'green' };

export default defineThing({
  questions: {
    wording: choice('What does the neon say?', {
      cash: 'CASH, one blunt word.',
      loans: 'LOANS, a promise with a hook in it.',
      'cash-loans': 'CASH over LOANS in two colours.',
      gold: 'WE BUY over GOLD.',
      open: 'OPEN, whatever the hour.',
      pawn: 'The three pawnbroker balls glowing above PAWN.',
    }),
    colour: choice('What colour is the main tube?', {
      red: 'Hot red, urgent.',
      pink: 'Candy pink, a little sleazy.',
      blue: 'Ice blue, cold and clean.',
      green: 'Dollar green.',
      amber: 'Amber gold, warm and old.',
      white: 'Hard white with coloured trim.',
      purple: 'Ultraviolet purple.',
    }),
    border: choice('What surrounds the lettering?', {
      none: 'Nothing; bare letters on the frame.',
      box: 'A rounded rectangle of tube.',
      double: 'Two nested borders in two colours.',
      arrow: 'An underline that bends into an arrow pointing at the door.',
    }),
    burnt: choice('Which parts have burnt out?', {
      none: 'Every tube is lit.',
      one: 'One letter is dead grey glass.',
      first: 'The first letter is out, so it spells something else.',
      several: 'More dead than alive: a few letters cling on.',
      border: 'The letters are dead; only the trim still glows.',
      all: 'The whole sign is off, cold glass in a dark window.',
    }),
    window: choice('What is the window around it like?', {
      clean: 'Clean plate glass in a painted frame.',
      bars: 'Steel security bars across the outside.',
      blinds: 'Venetian blinds half closed behind the sign.',
      papered: 'Newspaper taped over the glass behind it; the shop is hiding something or gone.',
      stickers: 'Cluttered with card-logo stickers, hours and hand-lettered offers.',
    }),
    sill: choice('What shares the sill with the transformer?', {
      bare: 'Only dust and the cable.',
      cat: 'A cat asleep in the glow.',
      plant: 'A sun-bleached plant that has given up.',
      wares: 'A few pawned things set out to tempt: a clock, a camera, a trophy.',
      flies: 'Dead flies and a faded CLOSED card.',
    }),
    pullChain: noul('Does a pull-chain switch dangle from the sign?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dusk = Math.abs(mood.daylight - 0.5) * 2; // 0 at noon, 1 at dawn or dusk
    const glow = mix(0.3, 1, dusk);
    const W = 1.6, SILL = 0.34, OPEN = 1.22, H = SILL + OPEN + 0.13;

    // ---- window bay ----
    const framePaint = pick(random, mood.cheer > 0.5 ? ['#2d5c50', '#a3352c', '#27457a', '#e7dfc8'] : ['#3a3d40', '#4a3a2c', '#5d6660', '#2c2f38']);
    const frame = s.material(framePaint, { roughness: 0.6 });
    const base = s.material(pick(random, ['#8a4a36', '#b7b0a0', '#6f6a62', '#93764f']), { roughness: 0.9 });
    const steel = s.material('#aeb3b5', { metalness: 0.5, roughness: 0.35 });
    const black = s.material('#141416', { roughness: 0.5 });
    s.box([W + 0.1, SILL, 0.42], [0, SILL / 2, -0.1], base);
    s.box([W + 0.16, 0.04, 0.5], [0, SILL + 0.02, -0.1], frame);
    for (const x of [-1, 1]) s.box([0.09, OPEN, 0.12], [x * (W / 2 + 0.005), SILL + 0.04 + OPEN / 2, 0], frame);
    s.box([W + 0.16, 0.13, 0.16], [0, H - 0.025, 0], frame);
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d7ecea', transparent: true, opacity: 0.1 + mood.wear * 0.08, roughness: 0.05, depthWrite: false });
    s.box([W - 0.08, OPEN, 0.012], [0, SILL + 0.04 + OPEN / 2, 0.02], glass);
    const streak = s.material('#ffffff', { transparent: true, opacity: 0.1, depthWrite: false });
    for (let i = 0; i < 2; i++) s.box([0.08 + i * 0.1, OPEN * 1.1, 0.002], [-0.45 + i * 0.22, SILL + 0.04 + OPEN / 2, 0.03], streak).rotation.z = -0.5;
    // brick courses on the stall riser
    const courses = new Batch(new THREE.BoxGeometry(1, 1, 1), s.material('#00000', { transparent: true, opacity: 0.22, depthWrite: false }));
    for (let r = 1; r < 4; r++) courses.add([0, r * (SILL / 4), 0.111], [W + 0.1, 0.008, 0.002]);
    courses.into(s.root);

    // ---- the sign ----
    const cy = SILL + 0.04 + OPEN * 0.55, sz = -0.1;
    const lines: { text: string; second: boolean }[] = {
      cash: [{ text: 'CASH', second: false }],
      loans: [{ text: 'LOANS', second: false }],
      'cash-loans': [{ text: 'CASH', second: false }, { text: 'LOANS', second: true }],
      gold: [{ text: 'WE BUY', second: true }, { text: 'GOLD', second: false }],
      open: [{ text: 'OPEN', second: false }],
      pawn: [{ text: 'PAWN', second: false }],
    }[a.wording];
    const balls = a.wording === 'pawn';
    const signW = 1.12, signH = lines.length === 2 || balls ? 0.8 : 0.52;
    const sign = new THREE.Group();
    sign.position.set(0, cy, sz);
    sign.rotation.z = (random() - 0.5) * mix(0.01, 0.09, mood.wear);
    s.root.add(sign);
    const addTo = (mesh: THREE.Mesh) => { mesh.castShadow = true; sign.add(mesh); return mesh; };
    const bar = (w: number, h: number, x: number, y: number) => addTo(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.014), black)).position.set(x, y, 0);
    for (const y of [-1, 1]) bar(signW, 0.016, 0, y * signH / 2);
    for (const x of [-1, -0.34, 0.34, 1]) bar(0.016, signH, x * signW / 2, 0);
    if (lines.length === 2 || balls) bar(signW, 0.012, 0, 0);
    addTo(new THREE.Mesh(new THREE.BoxGeometry(signW - 0.01, signH - 0.01, 0.008), new THREE.MeshStandardMaterial({ color: '#1c1c22', roughness: 0.35 }))).position.z = -0.012;

    type Group = 'a' | 'b' | 'dead' | 'buzz';
    const tubes: Record<Group, THREE.BufferGeometry[]> = { a: [], b: [], dead: [], buzz: [] };
    const R = 0.0115;
    const tube = (points: readonly XY[], closed: boolean, group: Group) => {
      const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0.034)), closed, 'catmullrom', 0.12);
      tubes[group].push(new THREE.TubeGeometry(curve, Math.max(8, points.length * 7), R, 6, closed));
    };

    const allLetters = lines.reduce((n, l) => n + l.text.replace(/ /g, '').length, 0);
    const dead = new Set<number>();
    if (a.burnt === 'one') dead.add(Math.floor(random() * allLetters));
    if (a.burnt === 'first') dead.add(0);
    if (a.burnt === 'several') for (let i = 0; i < allLetters; i++) if (random() < 0.62) dead.add(i);
    if (a.burnt === 'border' || a.burnt === 'all') for (let i = 0; i < allLetters; i++) dead.add(i);
    let buzz = Math.floor(random() * allLetters);
    if (dead.has(buzz)) buzz = -1;

    const innerW = signW - 0.16, rows = lines.length + (balls ? 1 : 0);
    const rowH = (signH - 0.14) / rows;
    let letter = 0;
    lines.forEach((entry, index) => {
      const row = index + (balls ? 1 : 0);
      const scale = Math.min((rowH - 0.07) / 1.5, innerW / (entry.text.length * 1.38));
      const total = entry.text.length * 1.38 * scale - 0.38 * scale;
      const y0 = signH / 2 - 0.07 - rowH * (row + 0.5) - 0.75 * scale;
      [...entry.text].forEach((ch, i) => {
        if (ch === ' ') return;
        const x0 = -total / 2 + i * 1.38 * scale;
        const group: Group = dead.has(letter) ? 'dead' : letter === buzz ? 'buzz' : entry.second ? 'b' : 'a';
        for (const stroke of GLYPHS[ch]) tube(stroke.points.map(([x, y]) => [x0 + x * scale, y0 + y * scale] as const), !!stroke.closed, group);
        letter++;
      });
    });
    const trimDead = a.burnt === 'all';
    if (balls) {
      const r = rowH * 0.3, by = signH / 2 - 0.07 - rowH * 0.5;
      const circle = (cx: number, cyy: number): XY[] => Array.from({ length: 10 }, (_u, k) => [cx + Math.cos((k / 10) * 6.283) * r, cyy + Math.sin((k / 10) * 6.283) * r] as const);
      const g: Group = trimDead ? 'dead' : 'b';
      tube(circle(-r * 2.3, by + r * 0.25), true, g);
      tube(circle(r * 2.3, by + r * 0.25), true, g);
      tube(circle(0, by - r * 0.35), true, g);
      tube([[-r * 2.3, by + r * 1.25], [-r * 1.4, by + r * 1.75], [0, by + r * 1.9], [r * 1.4, by + r * 1.75], [r * 2.3, by + r * 1.25]], false, trimDead ? 'dead' : 'a');
    }
    const rounded = (w: number, h: number, c: number): XY[] => [[-w / 2 + c, -h / 2], [w / 2 - c, -h / 2], [w / 2, -h / 2 + c], [w / 2, h / 2 - c], [w / 2 - c, h / 2], [-w / 2 + c, h / 2], [-w / 2, h / 2 - c], [-w / 2, -h / 2 + c]];
    if (a.border === 'box' || a.border === 'double') tube(rounded(signW - 0.05, signH - 0.05, 0.07), true, trimDead ? 'dead' : 'b');
    if (a.border === 'double') tube(rounded(signW + 0.05, signH + 0.05, 0.1), true, trimDead ? 'dead' : 'a');
    if (a.border === 'arrow') {
      const y = -signH / 2 - 0.02, side = random() < 0.5 ? -1 : 1;
      tube([[-side * signW * 0.46, y + 0.06], [-side * signW * 0.4, y], [side * signW * 0.3, y], [side * signW * 0.44, y - 0.05], [side * signW * 0.5, y - 0.2]], false, trimDead ? 'dead' : 'b');
      tube([[side * signW * 0.5 - 0.07, y - 0.12], [side * signW * 0.5, y - 0.21], [side * signW * 0.5 + 0.07, y - 0.12]], false, trimDead ? 'dead' : 'b');
    }

    const hueA = new THREE.Color(HUES[a.colour]), hueB = new THREE.Color(HUES[SECOND[a.colour]]);
    const lit = (hue: THREE.Color) => new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: mix(0.55, 1.05, glow), roughness: 0.35 });
    const materials: Record<Group, THREE.MeshStandardMaterial> = {
      a: lit(hueA), b: lit(hueB), buzz: lit(hueA),
      dead: new THREE.MeshStandardMaterial({ color: '#77767a', roughness: 0.3 }),
    };
    const halos: THREE.MeshBasicMaterial[] = [];
    const meshes: Partial<Record<Group, THREE.Mesh>> = {};
    for (const key of ['a', 'b', 'buzz', 'dead'] as const) {
      if (!tubes[key].length) { materials[key].dispose(); continue; }
      const geometry = mergeGeometries(tubes[key]);
      tubes[key].forEach((g) => g.dispose());
      meshes[key] = addTo(new THREE.Mesh(geometry, materials[key]));
      if (key !== 'dead') {
        const halo = new THREE.MeshBasicMaterial({ color: key === 'b' ? hueB : hueA, transparent: true, opacity: 0.22 * glow, depthWrite: false });
        const aura = new THREE.Mesh(geometry, halo);
        aura.scale.set(1, 1, 3.2);
        aura.position.z = -0.07;
        sign.add(aura);
        // widen the aura by drawing the same tubes a little fatter through the normal direction
        const fat = new THREE.Mesh(geometry, halo);
        fat.scale.set(1.012, 1.03, 1);
        sign.add(fat);
        halos.push(halo);
      }
    }
    // the wash of coloured light on whatever is behind the sign
    const anyLit = a.burnt !== 'all';
    const wash = painted(128, 128, (ctx, w) => {
      const g = ctx.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w / 2);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.55, '#555555');
      g.addColorStop(1, '#000000');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, w);
    });
    const washMat = new THREE.MeshBasicMaterial({ alphaMap: wash, color: a.burnt === 'border' ? hueB : hueA, transparent: true, opacity: anyLit ? 0.5 * glow : 0, depthWrite: false });
    const washMesh = new THREE.Mesh(new THREE.PlaneGeometry(signW * 1.25, signH * 1.5), washMat);
    washMesh.position.set(0, cy, sz + 0.004);
    s.root.add(washMesh);

    // chains up to the lintel, link by link
    const links = new Batch(new THREE.TorusGeometry(0.011, 0.003, 4, 8), steel);
    const topY = H - 0.09 - cy;
    for (const x of [-1, 1]) {
      const n = Math.max(2, Math.round((topY - signH / 2) / 0.02));
      for (let i = 0; i <= n; i++) links.add([x * signW * 0.4, signH / 2 + (i / n) * (topY - signH / 2), 0], 1, [0, i % 2 ? Math.PI / 2 : 0, 0]);
    }
    let chainPivot: THREE.Group | null = null;
    if (a.pullChain) {
      chainPivot = new THREE.Group();
      chainPivot.position.set(signW * 0.5 - 0.06, -signH / 2, 0.02);
      const beads = new Batch(new THREE.SphereGeometry(0.006, 6, 4), steel);
      for (let i = 0; i < 16; i++) beads.add([0, -i * 0.014, 0]);
      beads.into(chainPivot);
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.014, 0.03, 8), steel);
      bell.position.y = -0.24;
      chainPivot.add(bell);
      sign.add(chainPivot);
    }
    links.into(sign);

    // transformer on the sill, with its high-tension leads
    const tx = (random() < 0.5 ? -1 : 1) * (W / 2 - 0.22), ty = SILL + 0.04;
    s.box([0.2, 0.1, 0.12], [tx, ty + 0.05, -0.2], black);
    s.box([0.22, 0.012, 0.14], [tx, ty + 0.006, -0.2], steel);
    for (const dx of [-1, 1]) s.cylinder(0.012, 0.016, 0.04, [tx + dx * 0.06, ty + 0.12, -0.2], s.material('#e9e4d4'), 8);
    s.box([0.07, 0.035, 0.002], [tx, ty + 0.055, -0.139], s.material('#f1d43c'));
    const sx = Math.sign(tx);
    for (const dx of [-1, 1]) s.tube([[tx + dx * 0.06, ty + 0.14, -0.2], [tx + dx * 0.06 - sx * 0.03, ty + 0.3, -0.16], [sx * signW / 2 + sx * 0.03, cy - signH / 2 + 0.02 + (dx + 1) * 0.05, sz - 0.01], [sx * signW / 2 - sx * 0.01, cy - signH / 2 + 0.05 + (dx + 1) * 0.05, sz + 0.02]], 0.005, black);
    s.tube([[tx - sx * 0.1, ty + 0.03, -0.2], [tx - sx * 0.2, ty + 0.012, -0.25], [tx - sx * 0.34, ty + 0.012, -0.2], [tx - sx * 0.42, ty + 0.012, -0.31]], 0.006, black);

    // ---- what the window is like ----
    const backZ = -0.24, midY = SILL + 0.04 + OPEN / 2;
    if (a.window === 'bars') {
      const n = 7;
      for (let i = 0; i < n; i++) s.cylinder(0.011, 0.011, OPEN, [-W / 2 + 0.08 + (i + 0.5) * ((W - 0.16) / n), midY, 0.085], steel, 8);
      for (const y of [0.22, 0.78]) s.box([W + 0.04, 0.03, 0.012], [0, SILL + 0.04 + OPEN * y, 0.1], steel);
    } else if (a.window === 'blinds') {
      const slat = new Batch(new THREE.BoxGeometry(1, 1, 1), s.material(pick(random, ['#cfc6a8', '#b9c2c4', '#d8b98a']), { roughness: 0.6 }));
      const dropTo = SILL + 0.04 + OPEN * mix(0.5, 0.15, random());
      let k = 0;
      for (let y = SILL + OPEN; y > dropTo; y -= 0.045) {
        const crooked = random() < mood.wear * 0.25 ? (random() - 0.5) * 0.12 : 0;
        slat.add([0, y, backZ], [W - 0.12, 0.006, 0.042], [1.0, 0, crooked]);
        k++;
      }
      slat.add([0, dropTo - 0.02, backZ], [W - 0.12, 0.022, 0.03]);
      slat.into(s.root);
      for (const x of [-0.5, 0.5]) s.box([0.004, k * 0.045, 0.004], [x, SILL + OPEN - k * 0.0225, backZ + 0.02], s.material('#d5cfbb'));
    } else if (a.window === 'papered') {
      const news = () => painted(256, 340, (ctx, w, h) => {
        ctx.fillStyle = mood.wear > 0.5 ? '#d9cfa9' : '#e7e2d0';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(14, 14, w - 28, 26);
        ctx.fillStyle = 'rgba(40,40,40,0.55)';
        for (let c = 0; c < 4; c++) for (let y = 56; y < h - 10; y += 7) ctx.fillRect(14 + c * 59, y, 30 + random() * 22, 3);
        ctx.fillStyle = 'rgba(40,40,40,0.4)';
        ctx.fillRect(14 + Math.floor(random() * 3) * 59, 70 + random() * 120, 110, 80);
      });
      const cols = 4;
      for (let c = 0; c < cols; c++) for (let r = 0; r < 2; r++) {
        if (random() < mood.wear * 0.2) continue;
        const sheet = card((W - 0.1) / cols + 0.03, OPEN / 2 + 0.03, news());
        sheet.position.set(-W / 2 + 0.05 + (c + 0.5) * ((W - 0.1) / cols), SILL + 0.04 + (r + 0.5) * (OPEN / 2), backZ + c * 0.002 + r * 0.001);
        sheet.rotation.z = (random() - 0.5) * 0.06;
        s.root.add(sheet);
      }
    } else if (a.window === 'stickers') {
      const texts = ['VISA', 'ATM', 'WE BUY', '24 HR', 'NO CHECKS', 'LAYAWAY', 'EZ TERMS', 'SE HABLA', 'ID REQ', 'OPEN 9-9'];
      const n = 7 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        const t = pick(random, texts), w = 0.16 + random() * 0.08;
        const paper = pick(random, ['#f4e94a', '#f6f3ea', '#1f4fb0', '#c8202c', '#ff9a3a', '#f6f3ea']);
        const sticker = s.label(t, w, w * 0.45, [0, 0, 0], paper === '#1f4fb0' || paper === '#c8202c' ? '#ffffff' : '#18181a', paper);
        const edge = random() < 0.5;
        sticker.position.set(edge ? (random() < 0.5 ? -1 : 1) * (W / 2 - 0.16 - random() * 0.06) : (random() - 0.5) * (W - 0.4), edge ? SILL + 0.2 + random() * (OPEN - 0.3) : SILL + 0.12 + random() * 0.12, 0.03 + i * 0.0007);
        sticker.rotation.z = (random() - 0.5) * 0.3;
      }
    }

    // ---- company on the sill ----
    const ox = -Math.sign(tx) * (W / 2 - 0.42), oy = SILL + 0.04, oz = -0.2;
    if (a.sill === 'cat') {
      const fur = s.material(pick(random, ['#d98a3a', '#2a2a2c', '#b9b3a8', '#e9e2d0', '#7a5a3a']), { roughness: 1 });
      s.ball([0.17, 0.085, 0.11], [ox, oy + 0.08, oz], fur, 16);
      s.ball([0.062, 0.055, 0.058], [ox + 0.13, oy + 0.075, oz + 0.07], fur, 14);
      for (const dx of [-1, 1]) s.mesh(new THREE.ConeGeometry(0.022, 0.04, 4), fur, [ox + 0.13 + dx * 0.035, oy + 0.128, oz + 0.07]);
      s.tube([[ox - 0.15, oy + 0.03, oz], [ox - 0.17, oy + 0.025, oz + 0.09], [ox - 0.05, oy + 0.025, oz + 0.13], [ox + 0.06, oy + 0.025, oz + 0.12]], 0.02, fur);
    } else if (a.sill === 'plant') {
      s.cylinder(0.07, 0.05, 0.11, [ox, oy + 0.055, oz], s.material('#b5623c'), 12);
      const leaf = s.material(mood.wear > 0.4 ? '#a59a5a' : '#7c9a52', { side: THREE.DoubleSide });
      for (let i = 0; i < 7; i++) {
        const t = (i / 7) * 6.28 + random(), droop = 0.12 + random() * 0.14;
        s.tube([[ox, oy + 0.11, oz], [ox + Math.cos(t) * 0.07, oy + 0.11 + droop, oz + Math.sin(t) * 0.05], [ox + Math.cos(t) * 0.17, oy + 0.06 + droop * 0.4, oz + Math.sin(t) * 0.09]], 0.008, leaf);
      }
    } else if (a.sill === 'wares') {
      const gold = s.material('#e7b93c', { metalness: 0.4, roughness: 0.3, emissive: '#5a4a22', emissiveIntensity: 0.6 });
      s.cylinder(0.05, 0.06, 0.02, [ox - 0.2, oy + 0.01, oz], black, 12);
      s.cylinder(0.012, 0.012, 0.1, [ox - 0.2, oy + 0.07, oz], gold, 8);
      s.lathe([[0, 0], [0.02, 0.005], [0.045, 0.05], [0.05, 0.1], [0.045, 0.1], [0, 0.02]], gold, [ox - 0.2, oy + 0.12, oz]);
      s.box([0.16, 0.1, 0.07], [ox, oy + 0.05, oz], s.material('#2a2a2e'));
      s.cylinder(0.04, 0.04, 0.06, [ox, oy + 0.05, oz + 0.05], steel, 14).rotation.x = Math.PI / 2;
      s.cylinder(0.075, 0.075, 0.05, [ox + 0.2, oy + 0.09, oz], gold, 20).rotation.x = Math.PI / 2;
      s.cylinder(0.062, 0.062, 0.052, [ox + 0.2, oy + 0.09, oz + 0.002], s.material('#f6f3e8'), 20).rotation.x = Math.PI / 2;
      s.box([0.1, 0.02, 0.05], [ox + 0.2, oy + 0.01, oz], gold);
    } else if (a.sill === 'flies') {
      const flies = new Batch(new THREE.SphereGeometry(0.007, 5, 4), black);
      for (let i = 0; i < 9; i++) flies.add([ox + (random() - 0.5) * 0.6, oy + 0.005, oz + (random() - 0.5) * 0.2], [1.5, 0.8, 1]);
      flies.into(s.root);
      const closed = s.label('CLOSED', 0.3, 0.13, [ox, oy + 0.075, oz + 0.02], '#b3201d', '#e9e1c6');
      closed.rotation.x = -0.25;
      closed.rotation.z = (random() - 0.5) * 0.2;
    }

    // ---- hum, flicker, sway ----
    const base0 = materials.a.emissiveIntensity;
    const nerves = mood.energy;
    const hash = Math.floor(random() * 1000);
    const noise = (t: number) => { const x = Math.sin((Math.floor(t) + hash) * 127.1) * 43758.5453; return x - Math.floor(x); };
    return s.finish({
      update: (_dt, time) => {
        const hum = 1 - 0.06 * nerves * (0.5 + 0.5 * Math.sin(time * 37));
        materials.a.emissiveIntensity = base0 * hum;
        materials.b.emissiveIntensity = base0 * hum;
        // the unstable letter drops out more often the more nervous the scene is
        const out = noise(time * mix(2, 14, nerves)) < nerves * 0.45;
        materials.buzz.emissiveIntensity = out ? 0.08 : base0 * hum;
        if (washMat.opacity > 0) washMat.opacity = 0.5 * glow * hum;
        for (const halo of halos) halo.opacity = 0.22 * glow * hum;
        if (chainPivot) chainPivot.rotation.z = Math.sin(time * 1.3) * 0.12 * nerves;
        sign.rotation.x = Math.sin(time * 0.9) * 0.012 * nerves;
              },
    });
  },
});
