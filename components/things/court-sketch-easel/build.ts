import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const PALETTES = {
  colour: { line: '#26262c', skin: '#e0a988', dark: '#2f3f66', accent: '#b03030', wood: '#8a5a33', light: '#f4f0e0', sticks: ['#b03030', '#2f3f66', '#e0a988', '#8a5a33', '#d9b23a', '#4c7a5a', '#f4f0e0', '#26262c', '#7a4a8c', '#d97a3a'] },
  sanguine: { line: '#5a2a18', skin: '#d9a07a', dark: '#6b3420', accent: '#a8452c', wood: '#8f5a3a', light: '#f3e6d0', sticks: ['#a8452c', '#5a2a18', '#c98a5a', '#8f5a3a', '#f3e6d0', '#3a2418', '#b86a42'] },
  charcoal: { line: '#1c1c1e', skin: '#b9b6ae', dark: '#3a3a3d', accent: '#5c5c60', wood: '#77756f', light: '#f2f1ec', sticks: ['#1c1c1e', '#3a3a3d', '#5c5c60', '#8a8a88', '#f2f1ec', '#1c1c1e'] },
  tabloid: { line: '#101014', skin: '#ff9c7a', dark: '#1d5fe0', accent: '#e8203a', wood: '#c9781e', light: '#fff6c0', sticks: ['#e8203a', '#1d5fe0', '#f2c81e', '#ff9c7a', '#22b060', '#ff5fb0', '#101014', '#fff6c0', '#8a2be2'] },
} as const;
const PAPERS = { cream: '#efe6cf', grey: '#b7b5ad', blue: '#a9b6c2', kraft: '#b9966a' } as const;
const SUBJECTS = {
  accused: 'The accused standing in the dock behind a rail, head bowed, an officer at their shoulder.',
  witness: 'A witness in the box with their hands over their face, weeping.',
  emptydock: 'The dock, railed and empty: nobody came.',
  judge: 'The judge looming over the bench in wig and red robe.',
  jury: 'The jury, two rows of watching faces.',
  lawyer: 'A gowned barrister on their feet, arm flung out, pointing.',
  struck: 'A figure in the dock, but the whole drawing has been furiously scribbled over.',
} as const;
type Subject = keyof typeof SUBJECTS;

export default defineThing({
  questions: {
    subject: choice('What does the drawing show?', SUBJECTS),
    progress: score('How far along is the sketch?', ['A few pale construction lines', 'A loose line drawing', 'Blocked in with colour', 'Finished, vivid and worked up']),
    medium: choice('What is it drawn in?', {
      colour: 'A full box of soft pastels, naturalistic colour.',
      sanguine: 'Red-brown sanguine and sepia chalk, old-masterly.',
      charcoal: 'Charcoal and white chalk only, grey and grave.',
      tabloid: 'Loud, saturated colours for the evening news.',
    }),
    paper: choice('What paper is it on?', { cream: 'Warm cream paper.', grey: 'Mid-grey toned paper.', blue: 'Blue-grey paper.', kraft: 'Brown kraft paper.' }),
    support: choice('How is the board held?', {
      easel: 'On a light tripod sketching easel.',
      chair: 'Propped on the seat of a folding chair against its back; the artist has stepped out.',
      box: 'On a wooden box easel with an open drawer of chalks.',
    }),
    chalks: choice('What state are the chalks in?', {
      tidy: 'Ranked neatly by colour in an open tin.',
      scattered: 'Spilled from the tin, sticks rolled across the floor.',
      stubs: 'Worn to a handful of stubs; it has been a long trial.',
    }),
    extras: choice('What else has the artist left there?', {
      nothing: 'Nothing else.',
      sketches: 'Earlier sketches dropped on the floor around it.',
      rag: 'A chalky rag and a can of fixative.',
      thermos: 'A thermos flask and a cup.',
      pass: 'A press pass on a lanyard hung from the board.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pal = PALETTES[a.medium];
    const jit = (n: number) => (random() - 0.5) * n;

    // The drawing itself, painted stroke by stroke.
    const draw = (subject: Subject, progress: number, size: number) => {
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = Math.round(size * 0.75);
      const ctx = canvas.getContext('2d')!;
      const u = size / 512;
      ctx.fillStyle = PAPERS[a.paper]; ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(${random() > 0.5 ? '255,255,255' : '0,0,0'},0.04)`; ctx.fillRect(random() * canvas.width, random() * canvas.height, 3 * u, 3 * u); }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const lines = progress > 0.22, colour = progress > 0.5, finish = progress > 0.8;
      const stroke = (pts: number[][], col: string, w: number, alpha = 1, passes = 2) => {
        ctx.strokeStyle = col; ctx.globalAlpha = alpha;
        for (let p = 0; p < passes; p++) { ctx.lineWidth = w * u * mix(0.6, 1.2, random()); ctx.beginPath(); pts.forEach(([x, y], i) => { const X = (x + jit(5)) * u, Y = (y + jit(5)) * u; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke(); }
        ctx.globalAlpha = 1;
      };
      const oval = (cx: number, cy: number, rx: number, ry: number, col: string, w: number, alpha = 1) => {
        const pts: number[][] = []; for (let i = 0; i <= 14; i++) pts.push([cx + Math.cos(i / 14 * 6.4) * rx, cy + Math.sin(i / 14 * 6.4) * ry]); stroke(pts, col, w, alpha);
      };
      const hatch = (x0: number, y0: number, x1: number, y1: number, col: string, n: number, w: number, alpha = 0.75, slant = 0.5) => {
        ctx.strokeStyle = col; ctx.globalAlpha = alpha;
        for (let i = 0; i < n; i++) { const x = mix(x0, x1, random()), y = mix(y0, y1, random()), l = mix(14, 40, random()); ctx.lineWidth = w * u * mix(0.6, 1.3, random()); ctx.beginPath(); ctx.moveTo((x - l * slant) * u, (y + l) * u); ctx.lineTo((x + l * slant) * u, (y - l) * u); ctx.stroke(); }
        ctx.globalAlpha = 1;
      };
      const fill = (pts: number[][], col: string, alpha = 0.85) => { ctx.fillStyle = col; ctx.globalAlpha = alpha; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * u, y * u) : ctx.moveTo(x * u, y * u))); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; };
      const guide = pal.line, pale = progress > 0.22 ? 0.25 : 0.55;
      // A head-and-shoulders figure. k is head height in px.
      const person = (cx: number, cy: number, k: number, robe: string, o: { bowed?: number; wig?: boolean; hair?: string; hands?: boolean; arm?: number[] } = {}) => {
        const hx = cx + (o.bowed ?? 0) * k * 0.25, hy = cy + (o.bowed ?? 0) * k * 0.2;
        const sh = [[cx - k * 1.15, cy + k * 3.2], [cx - k * 1.05, cy + k * 1.15], [cx - k * 0.35, cy + k * 0.75], [cx + k * 0.35, cy + k * 0.75], [cx + k * 1.05, cy + k * 1.15], [cx + k * 1.15, cy + k * 3.2]];
        oval(hx, hy, k * 0.42, k * 0.55, guide, 2, pale); stroke([[cx, cy + k * 0.6], [cx, cy + k * 3]], guide, 1.5, pale, 1);
        if (colour) { fill(sh, robe, finish ? 0.9 : 0.6); hatch(cx - k, cy + k * 1.2, cx + k, cy + k * 3, pal.line, finish ? 22 : 8, 2, 0.35); }
        if (colour) { ctx.fillStyle = pal.skin; ctx.globalAlpha = finish ? 0.95 : 0.7; ctx.beginPath(); ctx.ellipse(hx * u, hy * u, k * 0.4 * u, k * 0.53 * u, 0, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1; }
        if (lines) { stroke(sh, pal.line, 3.5); oval(hx, hy, k * 0.42, k * 0.55, pal.line, 3); }
        if (o.wig && lines) { for (let i = 0; i < 9; i++) oval(hx + Math.cos(Math.PI + i / 8 * Math.PI) * k * 0.5, hy - k * 0.1 + Math.sin(Math.PI + i / 8 * Math.PI) * k * 0.5 + (i === 0 || i === 8 ? k * 0.45 : 0), k * 0.16, k * 0.16, colour ? pal.light : pal.line, colour ? 6 : 2); }
        else if (lines) hatch(hx - k * 0.4, hy - k * 0.65, hx + k * 0.4, hy - k * 0.3, o.hair ?? pal.line, colour ? 26 : 9, 3.5, 0.9, 0.9);
        if (finish) { stroke([[hx - k * 0.2, hy], [hx - k * 0.06, hy + 0.02 * k]], pal.line, 2.5, 1, 1); stroke([[hx + k * 0.08, hy], [hx + k * 0.22, hy]], pal.line, 2.5, 1, 1); stroke([[hx - k * 0.1, hy + k * 0.3], [hx + k * 0.12, hy + k * 0.3]], pal.accent, 2.5, 1, 1); hatch(hx - k * 0.4, hy - k * 0.2, hx - k * 0.2, hy + k * 0.3, pal.light, 6, 3, 0.8); }
        if (o.hands && lines) { for (const sx of [-1, 1]) { stroke([[cx + sx * k * 1.0, cy + k * 2.0], [cx + sx * k * 0.85, cy + k * 0.9], [hx + sx * k * 0.2, hy + k * 0.1]], pal.line, 4); if (colour) { ctx.fillStyle = pal.skin; ctx.beginPath(); ctx.ellipse((hx + sx * k * 0.18) * u, (hy + k * 0.05) * u, k * 0.22 * u, k * 0.34 * u, sx * 0.3, 0, 6.3); ctx.fill(); } oval(hx + sx * k * 0.18, hy + k * 0.05, k * 0.22, k * 0.34, pal.line, 2.5); } }
        if (o.arm && lines) { stroke([[cx + k * 0.9, cy + k * 1.2], [o.arm[0], o.arm[1]]], pal.line, 6); if (colour) stroke([[cx + k * 0.9, cy + k * 1.25], [mix(cx, o.arm[0], 0.8), mix(cy + k * 1.2, o.arm[1], 0.8)]], robe, 14, 0.85, 1); oval(o.arm[0], o.arm[1], k * 0.16, k * 0.12, pal.line, 3); }
      };
      const rail = (y: number, x0: number, x1: number, h: number, bars: number) => {
        stroke([[x0, y], [x1, y]], guide, 2, pale, 1);
        if (colour) { fill([[x0, y + 12], [x1, y + 12], [x1, y + h], [x0, y + h]], pal.wood, finish ? 0.85 : 0.5); hatch(x0, y + 10, x1, y + h, pal.line, finish ? 40 : 14, 2, 0.3); }
        if (lines) { stroke([[x0, y], [x1, y]], pal.line, 6); stroke([[x0, y + 14], [x1, y + 14]], pal.line, 3); for (let i = 0; i <= bars; i++) { const x = mix(x0, x1, i / bars); stroke([[x, y + 14], [x, y + h]], pal.line, i % 3 === 0 ? 5 : 2.5, 1, 1); } }
      };
      if (colour) hatch(0, 0, 512, 384, pal.dark, finish ? 60 : 20, 6, 0.12, 0.7);
      if (subject === 'accused' || subject === 'struck') {
        person(360, 110, 62, pal.dark, { hair: pal.line });
        person(205, 120, 70, a.medium === 'charcoal' ? pal.accent : pal.light, { bowed: 1, hair: pal.wood });
        rail(262, 40, 472, 150, 12);
        if (subject === 'struck') for (let i = 0; i < 16; i++) stroke([[jit(120) + 60, 40 + i * 20 + jit(30)], [256 + jit(100), 30 + i * 22 + jit(60)], [450 + jit(100), 40 + i * 20 + jit(40)]], i % 3 ? pal.line : pal.accent, 9, 0.9, 1);
      } else if (subject === 'witness') {
        person(256, 95, 80, pal.accent, { hands: true, hair: pal.wood });
        rail(290, 110, 402, 110, 6);
        if (lines) { stroke([[400, 290], [395, 220], [345, 190]], pal.line, 3); oval(338, 186, 12, 9, pal.line, 4); }
        if (finish) for (const sx of [-1, 1]) stroke([[256 + sx * 22, 150], [256 + sx * 26, 185]], a.medium === 'tabloid' ? pal.dark : pal.light, 4, 0.9, 1);
      } else if (subject === 'emptydock') {
        rail(190, 70, 442, 170, 12);
        if (lines) { for (const x of [70, 442]) stroke([[x, 70], [x, 360]], pal.line, 8); stroke([[70, 74], [442, 74]], pal.line, 3); for (let i = 1; i < 12; i++) stroke([[70 + i * 31, 74], [70 + i * 31, 190]], pal.line, 1.5, 0.8, 1); }
        if (colour) { hatch(110, 80, 400, 180, pal.light, finish ? 46 : 14, 7, 0.5, 0.2); hatch(200, 330, 500, 370, pal.line, 20, 5, 0.3, 2); }
      } else if (subject === 'judge') {
        person(256, 92, 78, pal.accent, { wig: true });
        if (colour) fill([[20, 262], [492, 262], [512, 384], [0, 384]], pal.wood, finish ? 0.9 : 0.55);
        if (lines) { stroke([[20, 262], [492, 262]], pal.line, 7); stroke([[0, 290], [512, 290]], pal.line, 3); for (let i = 0; i < 6; i++) stroke([[40 + i * 86, 300], [40 + i * 86, 384]], pal.line, 3, 1, 1); stroke([[400, 262], [400, 236], [432, 236], [432, 262]], pal.line, 4); stroke([[90, 255], [150, 240]], pal.line, 7, 1, 1); stroke([[146, 228], [158, 252]], pal.line, 12, 1, 1); }
        if (finish) hatch(30, 300, 480, 380, pal.line, 40, 2, 0.35);
      } else if (subject === 'jury') {
        for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) person(62 + i * 78 + (r ? 0 : 26), 62 + r * 118, 36, [pal.dark, pal.accent, pal.wood, pal.line][Math.floor(random() * 4)], { hair: [pal.line, pal.wood, pal.light][Math.floor(random() * 3)] });
        rail(318, 14, 498, 66, 8);
      } else {
        person(120, 250, 40, pal.dark, { hair: pal.wood });
        person(290, 80, 72, pal.line, { wig: true, arm: [470, 150] });
        if (lines) stroke([[20, 350], [500, 350]], pal.line, 6);
        if (colour) hatch(20, 355, 500, 384, pal.wood, 30, 5, 0.6, 2);
      }
      if (finish) { stroke([[420, 366], [450, 356], [468, 368], [492, 358]], pal.line, 2.5, 1, 1); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 });
    };

    const wood = s.material('#b98c58', { roughness: 0.7 });
    const darkWood = s.material('#6b4526', { roughness: 0.6 });
    const metal = s.material('#aeb4b8', { metalness: 0.8, roughness: 0.35 });
    const black = s.material('#1b1c1f');
    const BW = 0.78, BH = 0.6;

    // The board as a group: origin at its bottom edge centre, leaning back.
    const board = new THREE.Group();
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, p: [number, number, number], r: [number, number, number] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...p); mesh.rotation.set(...r); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    put(board, new THREE.BoxGeometry(BW, BH, 0.018), s.material('#c7a878', { roughness: 0.8 }), [0, BH / 2, 0]);
    const sheet = put(board, new THREE.BoxGeometry(BW - 0.08, (BW - 0.08) * 0.75, 0.004), draw(a.subject, a.progress, 512), [jit(0.01), BH / 2 - 0.005, 0.012]);
    sheet.rotation.z = jit(0.03);
    for (const x of [-0.2, 0.2]) { put(board, new THREE.BoxGeometry(0.06, 0.05, 0.03), black, [x, BH - 0.01, 0.012]); put(board, new THREE.BoxGeometry(0.04, 0.03, 0.02), metal, [x, BH + 0.02, 0.0]); }
    if (a.extras === 'pass') {
      put(board, new THREE.BoxGeometry(0.008, 0.3, 0.004), s.material('#22386b'), [BW / 2 - 0.05, BH - 0.14, 0.02], [0, 0, 0.12]);
      put(board, new THREE.BoxGeometry(0.008, 0.3, 0.004), s.material('#22386b'), [BW / 2 - 0.02, BH - 0.14, 0.02], [0, 0, -0.08]);
      put(board, new THREE.BoxGeometry(0.11, 0.15, 0.006), s.material('#f3f0e6'), [BW / 2 - 0.03, BH - 0.36, 0.024]);
      put(board, new THREE.BoxGeometry(0.11, 0.04, 0.008), s.material('#c21f2b'), [BW / 2 - 0.03, BH - 0.305, 0.025]);
    }
    s.root.add(board);

    let tinAt: [number, number, number] = [0.62, 0, 0.15];
    if (a.support === 'easel') {
      const ly = 0.72, lean = 0.26;
      board.position.set(0, ly + 0.02, 0.02); board.rotation.x = -lean;
      for (const x of [-1, 1]) s.rod([x * 0.42, 0, 0.26], [x * 0.05, 1.62, -0.22], 0.016, wood);
      s.rod([0, 0, -0.62], [0, 1.6, -0.24], 0.016, wood);
      s.box([0.86, 0.035, 0.07], [0, ly, 0.075], wood);
      s.box([0.16, 0.05, 0.05], [0, 1.62, -0.22], darkWood);
      s.rod([-0.25, 0.75, 0.06], [0, 0.72, -0.44], 0.006, metal);
      // A camp stool beside it holds the tin.
      const sx = 0.72, sz = 0.1;
      for (const z of [-0.13, 0.13]) { s.rod([sx - 0.17, 0, sz + z], [sx + 0.15, 0.4, sz + z], 0.011, metal); s.rod([sx + 0.17, 0, sz + z], [sx - 0.15, 0.4, sz + z], 0.011, metal); }
      s.box([0.34, 0.016, 0.3], [sx, 0.4, sz], s.material(mood.cheer > 0.5 ? '#b8482f' : '#5a5f4e', { roughness: 0.95 }));
      tinAt = [sx, 0.408, sz];
    } else if (a.support === 'chair') {
      const seat = 0.46;
      for (const x of [-1, 1]) { s.rod([x * 0.24, 0, 0.26], [x * 0.24, 0.95, -0.24], 0.014, metal); s.rod([x * 0.24, 0, -0.22], [x * 0.24, seat, 0.22], 0.014, metal); }
      s.box([0.5, 0.025, 0.44], [0, seat, 0.02], darkWood);
      s.box([0.5, 0.16, 0.02], [0, 0.86, -0.2], darkWood);
      board.position.set(0.03, seat + 0.014, 0.12); board.rotation.x = -0.42; board.rotation.z = jit(0.08);
      tinAt = [0.56, 0, 0.3];
    } else {
      const top = 0.74;
      for (const x of [-1, 1]) s.rod([x * 0.42, 0, 0.3], [x * 0.3, top - 0.1, 0.12], 0.018, wood);
      s.rod([0, 0, -0.55], [0, top - 0.1, -0.12], 0.018, wood);
      s.box([0.72, 0.13, 0.36], [0, top - 0.065, 0], darkWood);
      s.box([0.68, 0.07, 0.3], [0, top - 0.07, 0.3], wood);
      s.box([0.64, 0.01, 0.26], [0, top - 0.04, 0.3], s.material('#3a2a20'));
      for (const x of [-1, 1]) s.rod([x * 0.3, top, -0.1], [x * 0.3, top + 0.78, -0.3], 0.014, wood);
      s.box([0.74, 0.03, 0.06], [0, top + 0.03, -0.05], wood);
      board.position.set(0, top + 0.045, -0.07); board.rotation.x = -0.25;
      tinAt = [0, top - 0.035, 0.3];
      for (const k of [0, 1, 2]) s.ball([0.012, 0.012, 0.012], [-0.2 + k * 0.2, top - 0.07, 0.455], metal, 6);
    }

    // Chalks.
    const stick = (x: number, y: number, z: number, len: number, col: string, rot: number) => { const c = s.cylinder(0.011, 0.011, len, [x, y + 0.011, z], s.material(col, { roughness: 0.95 }), 8); c.rotation.set(Math.PI / 2, 0, rot); };
    const [tx, ty, tz] = tinAt;
    const inBox = a.support === 'box';
    const n = a.chalks === 'stubs' ? 6 : 14;
    if (!inBox) {
      s.box([0.3, 0.012, 0.2], [tx, ty + 0.006, tz], metal);
      for (const sx of [-1, 1]) s.box([0.006, 0.03, 0.2], [tx + sx * 0.15, ty + 0.015, tz], metal);
      for (const sz of [-1, 1]) s.box([0.3, 0.03, 0.006], [tx, ty + 0.015, tz + sz * 0.1], metal);
      const lid = s.box([0.3, 0.2, 0.008], [tx, ty + 0.1, tz - 0.125], metal); lid.rotation.x = -0.35;
      s.box([0.24, 0.12, 0.004], [tx, ty + 0.1, tz - 0.118], s.material(pal.sticks[0])).rotation.x = -0.35;
    }
    for (let i = 0; i < n; i++) {
      const col = pal.sticks[i % pal.sticks.length];
      const len = a.chalks === 'stubs' ? mix(0.02, 0.045, random()) : mix(0.06, 0.09, random());
      const spilled = a.chalks === 'scattered' && random() < 0.65;
      if (spilled) stick(tx + jit(0.9) - (a.support === 'easel' ? 0.3 : 0), 0, 0.35 + random() * 0.5, len, col, random() * 3);
      else stick(tx - (inBox ? 0.28 : 0.125) + (i + 0.5) * (inBox ? 0.56 : 0.25) / n, ty + 0.01, tz + (a.chalks === 'stubs' ? jit(0.1) : 0), len, col, a.chalks === 'tidy' ? 0 : jit(0.8));
    }
    if (a.chalks !== 'tidy' || mood.wear > 0.5) for (let i = 0; i < 6; i++) s.cylinder(0.05 + random() * 0.06, 0.05, 0.003, [jit(0.9), 0.0015, 0.3 + random() * 0.4], s.material(pal.sticks[Math.floor(random() * pal.sticks.length)], { roughness: 1, transparent: true, opacity: 0.55 }), 10);

    // Extras.
    if (a.extras === 'sketches') {
      const others = (Object.keys(SUBJECTS) as Subject[]).filter((k) => k !== a.subject && k !== 'struck');
      const count = 2 + Math.round(mood.density * 2);
      for (let i = 0; i < count; i++) {
        const sub = others[Math.floor(random() * others.length)];
        const p = s.mesh(new THREE.BoxGeometry(0.5, 0.004, 0.375), [black, black, draw(sub, mix(0.5, 1, random()), 256), black, black, black] as unknown as THREE.Material, [-0.75 + i * 0.5 + jit(0.2), 0.004 + i * 0.003, 0.62 + jit(0.3)]);
        p.rotation.y = jit(1.2);
      }
    } else if (a.extras === 'rag') {
      const geometry = new THREE.IcosahedronGeometry(0.11, 1); const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * mix(0.7, 1.4, random()), pos.getY(i) * mix(0.25, 0.6, random()), pos.getZ(i) * mix(0.7, 1.4, random()));
      geometry.computeVertexNormals();
      s.mesh(geometry, s.material('#d9d2c0', { roughness: 1 }), [-0.55, 0.04, 0.35]);
      s.ball([0.05, 0.02, 0.04], [-0.53, 0.085, 0.37], s.material(pal.sticks[0]), 8);
      s.cylinder(0.035, 0.035, 0.19, [-0.72, 0.095, 0.2], s.material('#d8dadc', { metalness: 0.6, roughness: 0.3 }), 14);
      s.cylinder(0.02, 0.03, 0.03, [-0.72, 0.205, 0.2], s.material('#c21f2b'), 12);
      s.cylinder(0.0355, 0.0355, 0.08, [-0.72, 0.09, 0.2], s.material('#22386b'), 14);
    } else if (a.extras === 'thermos') {
      s.cylinder(0.045, 0.045, 0.26, [-0.6, 0.13, 0.3], s.material(mood.cheer > 0.5 ? '#c21f2b' : '#2f5a44', { metalness: 0.3, roughness: 0.4 }), 16);
      s.cylinder(0.04, 0.045, 0.05, [-0.6, 0.285, 0.3], metal, 16);
      s.cylinder(0.042, 0.036, 0.06, [-0.45, 0.03, 0.4], metal, 14);
      s.cylinder(0.036, 0.034, 0.01, [-0.45, 0.056, 0.4], s.material('#4a2c16'), 14);
    }

    return s.finish();
  },
});
