import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
type Era = 'sepia' | 'bw' | 'seventies' | 'polaroid' | 'nineties';
type Subject = 'wedding' | 'baby' | 'holiday' | 'uniform' | 'pet' | 'house';
const COLS = 8, ROWS = 4, CELL = 128, HERO = 30, BACK = 31;
// Print size in metres and the picture window inside the 128 px cell: [left, top, right, bottom].
const FORMAT: Record<Era, { size: readonly [number, number]; window: readonly [number, number, number, number]; card: string }> = {
  sepia: { size: [0.078, 0.112], window: [14, 12, 114, 100], card: '#d6c193' },
  bw: { size: [0.094, 0.07], window: [8, 9, 120, 119], card: '#f1eee4' },
  seventies: { size: [0.09, 0.09], window: [10, 10, 118, 118], card: '#f4f0e4' },
  polaroid: { size: [0.088, 0.107], window: [9, 9, 119, 96], card: '#f5f2e8' },
  nineties: { size: [0.126, 0.086], window: [0, 0, 128, 128], card: '#ffffff' },
};

/** Maps a natural colour to how this kind of print would have recorded it. */
function toner(era: Era, fade: number) {
  const dark = new THREE.Color(), light = new THREE.Color(), out = new THREE.Color(), k = { h: 0, s: 0, l: 0 };
  return (hex: string) => {
    out.set(hex).getHSL(k);
    if (era === 'sepia') out.copy(dark.set('#35240f')).lerp(light.set('#ead8b0'), k.l * (1 - fade * 0.3) + fade * 0.25);
    else if (era === 'bw') out.setHSL(0.1, 0.03, mix(0.04, 0.9, k.l * k.l) * (1 - fade * 0.15) + fade * 0.1);
    else if (era === 'seventies') out.setHSL(k.h, k.s * 0.75, k.l).lerp(light.set('#e9a646'), 0.14 + fade * 0.22);
    else if (era === 'polaroid') out.setHSL(k.h, k.s * 0.8, k.l).lerp(light.set('#b7d8cc'), 0.2 + fade * 0.25);
    else out.setHSL(k.h, Math.min(1, k.s * 1.15), k.l).lerp(light.set('#e9c9c0'), fade * 0.3);
    return `#${out.getHexString()}`;
  };
}

function person(ctx: Ctx, x: number, base: number, tall: number, body: string, skin: string, hair: string, style: 'suit' | 'dress' | 'cap' = 'suit') {
  const r = tall * 0.115, top = base - tall;
  ctx.fillStyle = body;
  if (style === 'dress') { ctx.beginPath(); ctx.moveTo(x - r * 0.9, top + r * 2); ctx.lineTo(x + r * 0.9, top + r * 2); ctx.lineTo(x + tall * 0.24, base); ctx.lineTo(x - tall * 0.24, base); ctx.fill(); }
  else { ctx.fillRect(x - tall * 0.15, top + r * 2, tall * 0.3, tall * 0.42); ctx.fillRect(x - tall * 0.13, top + tall * 0.6, tall * 0.11, tall * 0.4); ctx.fillRect(x + tall * 0.02, top + tall * 0.6, tall * 0.11, tall * 0.4); }
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, top + r, r, 0, 7); ctx.fill();
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(x, top + r * 0.85, r * 1.05, Math.PI, Math.PI * 2); ctx.fill();
  if (style === 'cap') { ctx.fillStyle = body; ctx.fillRect(x - r * 1.2, top - r * 0.2, r * 2.4, r * 0.7); ctx.fillRect(x - r * 1.4, top + r * 0.4, r * 2.8, r * 0.22); }
}

function scene(ctx: Ctx, subject: Subject, W: number, H: number, t: (hex: string) => string, random: () => number) {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
  const skin = t(pick(['#e2b79a', '#d6a585', '#b98566', '#8c5f45'])), hair = () => t(pick(['#2a1c12', '#6b4a2a', '#c9a45a', '#8a8a8a']));
  const sky = () => { ctx.fillStyle = t('#a9c9e6'); ctx.fillRect(0, 0, W, H); };
  if (subject === 'wedding') {
    sky(); ctx.fillStyle = t('#7f9a5a'); ctx.fillRect(0, H * 0.74, W, H);
    ctx.fillStyle = t('#b3a58f'); ctx.fillRect(W * 0.2, H * 0.08, W * 0.6, H * 0.68);
    ctx.fillStyle = t('#3a2c22'); ctx.beginPath(); ctx.arc(W * 0.5, H * 0.42, W * 0.17, Math.PI, 0); ctx.lineTo(W * 0.67, H * 0.76); ctx.lineTo(W * 0.33, H * 0.76); ctx.fill();
    person(ctx, W * 0.38, H * 0.95, H * 0.62, t('#1e2026'), skin, hair());
    person(ctx, W * 0.63, H * 0.95, H * 0.57, t('#fbfaf4'), skin, t('#fbfaf4'), 'dress');
    ctx.fillStyle = t('#d9506e'); ctx.beginPath(); ctx.arc(W * 0.52, H * 0.66, H * 0.05, 0, 7); ctx.fill();
  } else if (subject === 'baby') {
    ctx.fillStyle = t('#cdbb9f'); ctx.fillRect(0, 0, W, H);
    const a = t(pick(['#d98a8a', '#8ab0d9', '#e3c768'])), b = t('#f3ead8');
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? a : b; ctx.fillRect(i * W / 6, H * 0.55 + j * H * 0.15, W / 6 + 1, H * 0.15 + 1); }
    ctx.fillStyle = t('#f6f2e8'); ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.78, W * 0.2, H * 0.17, 0, 0, 7); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(W * 0.5, H * 0.42, H * 0.22, 0, 7); ctx.fill();
    ctx.fillStyle = t('#2a1c12'); for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(W * 0.5 + sx * H * 0.085, H * 0.4, H * 0.025, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.arc(W * 0.5, H * 0.48, H * 0.06, 0.2, Math.PI - 0.2); ctx.lineWidth = 2; ctx.strokeStyle = t('#7a3b2e'); ctx.stroke();
    ctx.fillStyle = hair(); ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.22, H * 0.07, H * 0.04, 0, 0, 7); ctx.fill();
  } else if (subject === 'holiday') {
    sky();
    if (random() < 0.55) {
      ctx.fillStyle = t('#2f7fb8'); ctx.fillRect(0, H * 0.42, W, H * 0.2); ctx.fillStyle = t('#ead49c'); ctx.fillRect(0, H * 0.6, W, H);
      ctx.fillStyle = t('#ffd94a'); ctx.beginPath(); ctx.arc(W * 0.8, H * 0.18, H * 0.09, 0, 7); ctx.fill();
      for (let i = 0; i < 5; i++) { ctx.fillStyle = t(i % 2 ? '#e23b2e' : '#f6f2e8'); ctx.fillRect(W * 0.06 + i * W * 0.07, H * 0.5, W * 0.07, H * 0.26); }
      person(ctx, W * 0.58, H * 0.92, H * 0.4, t(pick(['#e23b2e', '#2f6fd0', '#f2c21b'])), skin, hair()); person(ctx, W * 0.78, H * 0.94, H * 0.26, t('#3fa35a'), skin, hair());
    } else {
      ctx.fillStyle = t('#6f8a5a'); ctx.fillRect(0, H * 0.5, W, H); ctx.fillStyle = t('#8a8a86'); ctx.fillRect(0, H * 0.72, W, H);
      ctx.fillStyle = t(pick(['#3f8a8a', '#b3261e', '#e3c768', '#f1ead6'])); ctx.beginPath(); ctx.roundRect(W * 0.12, H * 0.56, W * 0.62, H * 0.2, 8); ctx.fill(); ctx.beginPath(); ctx.roundRect(W * 0.26, H * 0.42, W * 0.32, H * 0.18, 8); ctx.fill();
      ctx.fillStyle = t('#18181a'); for (const x of [0.26, 0.6]) { ctx.beginPath(); ctx.arc(W * x, H * 0.77, H * 0.07, 0, 7); ctx.fill(); }
      person(ctx, W * 0.86, H * 0.9, H * 0.5, t('#27324a'), skin, hair());
    }
  } else if (subject === 'uniform') {
    ctx.fillStyle = t('#7b8478'); ctx.fillRect(0, 0, W, H);
    const cloth = t(pick(['#46583a', '#27324a', '#5a5f66']));
    ctx.fillStyle = cloth; ctx.beginPath(); ctx.ellipse(W * 0.5, H * 1.02, W * 0.4, H * 0.42, 0, 0, 7); ctx.fill();
    ctx.fillStyle = skin; ctx.fillRect(W * 0.44, H * 0.5, W * 0.12, H * 0.14); ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.4, H * 0.15, H * 0.18, 0, 0, 7); ctx.fill();
    ctx.fillStyle = cloth; ctx.fillRect(W * 0.5 - H * 0.19, H * 0.15, H * 0.38, H * 0.12); ctx.fillStyle = t('#141416'); ctx.fillRect(W * 0.5 - H * 0.2, H * 0.26, H * 0.4, H * 0.035);
    ctx.fillStyle = t('#e3c768'); ctx.beginPath(); ctx.arc(W * 0.5, H * 0.2, H * 0.03, 0, 7); ctx.fill(); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(W * 0.5, H * (0.72 + i * 0.1), H * 0.02, 0, 7); ctx.fill(); }
  } else if (subject === 'pet') {
    ctx.fillStyle = t('#6f9a4e'); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = t('#ece6d2'); for (let i = 0; i < 9; i++) ctx.fillRect(i * W / 8 - 2, H * 0.08, W / 12, H * 0.34);
    const coat = t(pick(['#9a6a3a', '#2a2420', '#e8dcc2', '#c98a4a']));
    ctx.fillStyle = coat; ctx.beginPath(); ctx.ellipse(W * 0.46, H * 0.62, W * 0.24, H * 0.14, 0, 0, 7); ctx.fill();
    for (const x of [0.3, 0.38, 0.56, 0.63]) ctx.fillRect(W * x, H * 0.66, W * 0.05, H * 0.24);
    ctx.beginPath(); ctx.arc(W * 0.74, H * 0.47, H * 0.13, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(W * 0.66, H * 0.38, H * 0.05, H * 0.1, -0.4, 0, 7); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = coat; ctx.beginPath(); ctx.moveTo(W * 0.24, H * 0.58); ctx.quadraticCurveTo(W * 0.1, H * 0.5, W * 0.14, H * 0.36); ctx.stroke();
    ctx.fillStyle = t('#141416'); ctx.beginPath(); ctx.arc(W * 0.78, H * 0.45, H * 0.02, 0, 7); ctx.arc(W * 0.86, H * 0.5, H * 0.025, 0, 7); ctx.fill();
  } else {
    sky(); ctx.fillStyle = t('#7f9a5a'); ctx.fillRect(0, H * 0.7, W, H);
    ctx.fillStyle = t(pick(['#c9b08a', '#b5553f', '#e6dfc8'])); ctx.fillRect(W * 0.14, H * 0.3, W * 0.72, H * 0.44);
    ctx.fillStyle = t('#6b2f24'); ctx.beginPath(); ctx.moveTo(W * 0.06, H * 0.32); ctx.lineTo(W * 0.5, H * 0.06); ctx.lineTo(W * 0.94, H * 0.32); ctx.fill();
    ctx.fillStyle = t('#3a2c22'); ctx.fillRect(W * 0.44, H * 0.5, W * 0.12, H * 0.24); ctx.fillStyle = t('#dfeaf2'); for (const x of [0.22, 0.66]) ctx.fillRect(W * x, H * 0.42, W * 0.13, H * 0.14);
    const n = 3 + Math.floor(random() * 3);
    for (let i = 0; i < n; i++) person(ctx, W * (0.5 + (i - (n - 1) / 2) * 0.15), H * 0.96, H * mix(0.24, 0.42, random()), t(pick(['#27324a', '#b3261e', '#e3c768', '#f1ead6', '#3f8a5a'])), skin, hair(), random() < 0.4 ? 'dress' : 'suit');
  }
}

function print(ctx: Ctx, era: Era, draw: (W: number, H: number) => void, wear: number, random: () => number) {
  const { window: [l, tp, r, b], card } = FORMAT[era];
  ctx.clearRect(0, 0, CELL, CELL);
  ctx.fillStyle = card; ctx.beginPath(); ctx.roundRect(0, 0, CELL, CELL, era === 'seventies' ? 14 : era === 'sepia' ? 5 : 0); ctx.fill();
  ctx.save(); ctx.beginPath();
  if (era === 'sepia' && random() < 0.5) ctx.ellipse((l + r) / 2, (tp + b) / 2, (r - l) / 2, (b - tp) / 2, 0, 0, 7); else ctx.rect(l, tp, r - l, b - tp);
  ctx.clip(); ctx.translate(l, tp); draw(r - l, b - tp); ctx.restore();
  if (era === 'sepia') { ctx.strokeStyle = '#a3854a'; ctx.lineWidth = 1.5; ctx.strokeRect(6, 5, CELL - 12, CELL - 10); ctx.strokeStyle = '#6b5632'; ctx.beginPath(); ctx.moveTo(40, 114); ctx.bezierCurveTo(54, 106, 66, 122, 88, 112); ctx.stroke(); }
  if (era === 'nineties') { ctx.fillStyle = '#ff8a1e'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'right'; ctx.fillText(`'${90 + Math.floor(random() * 9)} ${1 + Math.floor(random() * 12)} ${1 + Math.floor(random() * 28)}`, 122, 120); }
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = `rgba(150,110,50,${wear * 0.22})`; ctx.fillRect(0, 0, CELL, CELL);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < wear * 4; i++) { ctx.beginPath(); ctx.moveTo(random() * CELL, 0); ctx.lineTo(random() * CELL, CELL); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
}

export default defineThing({
  questions: {
    era: choice('What era are most of the photographs from?', {
      sepia: 'Sepia studio portraits on cream card mounts, a century old.',
      bw: 'Small black-and-white snapshots with white borders, mid-century.',
      seventies: 'Square 1970s colour prints with rounded corners, gone orange with age.',
      polaroid: 'Polaroids with thick white frames, colours drifting to green.',
      nineties: 'Glossy 1990s six-by-fours with an orange date stamped in the corner.',
    }),
    subject: choice('What do the pictures mostly show?', {
      wedding: 'Weddings: couples posed stiffly outside church doors.',
      baby: 'Babies and small children on blankets, somebody\'s firstborn.',
      holiday: 'Holidays: beaches, windbreaks and the family car.',
      uniform: 'Young men in uniform, head-and-shoulders portraits.',
      pet: 'Dogs and cats in back gardens.',
      house: 'Families lined up in front of their houses.',
      mixed: 'A whole life jumbled together.',
    }),
    order: choice('How are the photographs kept?', {
      neat: 'Filed upright in tidy rows like index cards.',
      stuffed: 'Stuffed in every which way, corners sticking up.',
      spilled: 'Overflowing: a slide of prints has poured over the edge and across the table.',
    }),
    special: choice('What has happened to the one photograph set apart at the front?', {
      none: 'Nothing: there is no photograph set apart.',
      whole: 'It is simply the best one, propped where it can be seen.',
      torn: 'It was torn in half between the two people in it.',
      cutout: 'One face has been neatly cut out, leaving a hole.',
      written: 'It is turned over to show handwriting on the back.',
    }),
    frames: choice('What framed portraits are propped beside the box?', {
      none: 'None.',
      oval: 'A single portrait in an oval gilt frame.',
      several: 'Several mismatched frames: gilt, dark wood, tarnished silver.',
    }),
    slides: noul('Are 35mm slides and a strip of negatives mixed in?'),
    sign: choice('What does the little price card say, if there is one?', {
      none: 'No card.',
      each: '10¢ EACH',
      handful: '$1 A HANDFUL',
      ancestors: 'INSTANT ANCESTORS',
      whose: 'DO YOU KNOW THEM?',
    }),
    box: choice('What kind of box is it?', {
      kraft: 'A plain brown cardboard shoebox with a white size label.',
      sneaker: 'A glossy red trainer box with a white stripe.',
      tin: 'An old navy biscuit tin with gold bands.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const era: Era = a.era, [pw, ph] = FORMAT[era].size, tone = toner(era, mood.wear);
    const subjects: readonly Subject[] = a.subject === 'mixed' ? ['wedding', 'baby', 'holiday', 'uniform', 'pet', 'house'] : [a.subject, a.subject, a.subject, pick(['wedding', 'baby', 'holiday', 'uniform', 'pet', 'house'] as const)];

    // Every print is a cell of one atlas.
    const canvas = document.createElement('canvas'); canvas.width = COLS * CELL; canvas.height = ROWS * CELL;
    const ctx = canvas.getContext('2d')!;
    const heroW = FORMAT[era].window;
    for (let cell = 0; cell < COLS * ROWS; cell++) {
      ctx.save(); ctx.translate((cell % COLS) * CELL, Math.floor(cell / COLS) * CELL); ctx.beginPath(); ctx.rect(0, 0, CELL, CELL); ctx.clip();
      if (cell === BACK) {
        ctx.fillStyle = '#efe8d4'; ctx.fillRect(0, 0, CELL, CELL);
        ctx.fillStyle = '#2a3f8a'; ctx.textAlign = 'center'; ctx.font = 'italic 19px serif';
        pick([['Mum & Dad', 'Margate 1961'], ['Our wedding', 'June 1957'], ['Tommy', 'aged 3'], ['Who is', 'this?'], ['Last summer', 'at the lake']]).forEach((line, i) => ctx.fillText(line, 64, 58 + i * 26, 108));
        ctx.strokeStyle = 'rgba(120,100,60,0.5)'; ctx.strokeRect(3, 3, CELL - 6, CELL - 6);
      } else if (cell === HERO) {
        print(ctx, era, (W, H) => {
          ctx.fillStyle = tone('#a9c9e6'); ctx.fillRect(0, 0, W, H); ctx.fillStyle = tone('#7f9a5a'); ctx.fillRect(0, H * 0.8, W, H);
          person(ctx, W * 0.3, H * 1.25, H * 1.05, tone('#1e2026'), tone('#e2b79a'), tone('#2a1c12'));
          person(ctx, W * 0.7, H * 1.25, H * 1.0, tone('#f6f2e8'), tone('#e2b79a'), tone('#6b4a2a'), 'dress');
        }, mood.wear, random);
        if (a.special === 'cutout') { ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(heroW[0] + (heroW[2] - heroW[0]) * 0.7, heroW[1] + (heroW[3] - heroW[1]) * 0.36, (heroW[3] - heroW[1]) * 0.17, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      } else print(ctx, era, (W, H) => scene(ctx, pick(subjects), W, H, tone, random), mood.wear, random);
      ctx.restore();
    }
    const atlas = new THREE.CanvasTexture(canvas); atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 4;
    const prints: THREE.BufferGeometry[] = [];
    const remap = (g: THREE.BufferGeometry, cell: number, flat = false, u0 = 0, u1 = 1) => {
      const uv = g.attributes.uv, cx = cell % COLS, cy = Math.floor(cell / COLS);
      for (let i = 0; i < uv.count; i++) {
        const u = flat ? 0.07 : mix(u0, u1, uv.getX(i)) * 0.984 + 0.008, v = flat ? 0.93 : uv.getY(i) * 0.984 + 0.008;
        uv.setXY(i, (cx + u) / COLS, (ROWS - 1 - cy + v) / ROWS);
      }
      return g;
    };
    const place = (g: THREE.BufferGeometry, m: THREE.Matrix4) => { const flat = g.index ? g.toNonIndexed() : g; flat.applyMatrix4(m); prints.push(flat); };
    const snapshot = (m: THREE.Matrix4, cell: number, w = pw, h = ph, faceDown = false) => {
      const face = remap(new THREE.PlaneGeometry(w, h), faceDown ? BACK : cell, faceDown && cell !== BACK), back = remap(new THREE.PlaneGeometry(w, h), BACK, true);
      back.rotateY(Math.PI);
      place(face, m); place(back, m);
    };
    const pose = (x: number, y: number, z: number, pitch: number, yaw: number, roll = 0, size = 1) =>
      new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ')), new THREE.Vector3(size, size, size));
    const any = () => Math.floor(random() * HERO);

    // The box and its lid.
    const W = 0.34, D = 0.2, H = 0.115, t = 0.004;
    const shell = a.box === 'tin' ? s.material('#27365f', { metalness: 0.6, roughness: mix(0.3, 0.7, mood.wear) }) : s.material(a.box === 'sneaker' ? '#c8322b' : '#b58e5c', { roughness: a.box === 'sneaker' ? 0.4 : 0.95 });
    const inner = s.material(a.box === 'tin' ? '#b9b3a0' : '#d9c3a0', { roughness: 0.9, metalness: a.box === 'tin' ? 0.5 : 0 });
    s.box([W, t, D], [0, t / 2, 0], inner);
    for (const z of [-1, 1]) s.box([W, H, t], [0, H / 2, z * (D - t) / 2], shell);
    for (const x of [-1, 1]) s.box([t, H, D], [x * (W - t) / 2, H / 2, 0], shell);
    const band = a.box === 'tin' ? s.material('#c9a23a', { metalness: 0.8, roughness: 0.35 }) : s.material('#f4f1e8', { roughness: 0.6 });
    if (a.box !== 'kraft') for (const y of a.box === 'tin' ? [0.02, H - 0.02] : [H * 0.5]) { s.box([W + 0.002, a.box === 'tin' ? 0.008 : 0.03, D + 0.002], [0, y, 0], band); }
    else s.label('SIZE 9  BRN', 0.11, 0.045, [W / 2 - 0.075, H * 0.5, D / 2 + 0.0015], '#2a2a2a', '#f1eee4').rotation.z = 0.03;
    const lid = new THREE.Group();
    lid.add(s.box([W + 0.012, 0.004, D + 0.012], [0, 0, 0], shell), s.box([W + 0.012, 0.03, 0.004], [0, 0.015, (D + 0.008) / 2], shell), s.box([W + 0.012, 0.03, 0.004], [0, 0.015, -(D + 0.008) / 2], shell), s.box([0.004, 0.03, D + 0.012], [(W + 0.008) / 2, 0.015, 0], shell), s.box([0.004, 0.03, D + 0.012], [-(W + 0.008) / 2, 0.015, 0], shell));
    lid.position.set((random() - 0.5) * 0.06, 0.1, -D / 2 - 0.045); lid.rotation.set(1.18, (random() - 0.5) * 0.2, 0, 'YXZ');
    s.root.add(lid);

    // Prints inside the box.
    const fill = mix(0.55, 1, mood.density);
    const columns = Math.max(2, Math.floor((W - 0.02) / (pw + 0.01)));
    const perColumn = Math.round({ neat: 15, stuffed: 20, spilled: 12 }[a.order] * fill);
    for (let c = 0; c < columns; c++) {
      const x = (c - (columns - 1) / 2) * ((W - 0.03) / columns);
      for (let i = 0; i < perColumn; i++) {
        const z = -D / 2 + 0.014 + (i + 0.5) / perColumn * (D - 0.03);
        const wild = a.order === 'neat' ? 0.04 : 1;
        const lift = Math.max(0.006, H - ph - 0.004) + random() * 0.012 + (a.order !== 'neat' && random() < 0.2 ? random() * 0.045 : 0);
        snapshot(pose(x + (random() - 0.5) * 0.03 * wild, lift + ph / 2, z, -0.16 + (random() - 0.5) * 0.5 * wild, (random() - 0.5) * 0.7 * wild, (random() - 0.5) * 0.6 * wild), any());
      }
    }
    // Loose prints on the table.
    const loose = { neat: 3, stuffed: 8, spilled: 20 }[a.order] + Math.round(mood.density * 6);
    for (let i = 0; i < loose; i++) {
      const spill = a.order === 'spilled' && i < 12;
      const x = spill ? (random() - 0.5) * 0.3 + i * 0.012 : (random() < 0.5 ? -1 : 1) * (W / 2 + 0.03 + random() * 0.16) * (random() < 0.6 ? 1 : 0.3);
      const z = spill ? D / 2 + 0.03 + i * 0.022 + random() * 0.03 : D / 2 - 0.06 + random() * 0.32;
      snapshot(pose(x, 0.0015 + i * 0.0011, z, -Math.PI / 2 + (random() - 0.5) * 0.04, random() * 6.3), any(), pw, ph, random() < 0.14);
    }
    if (a.order === 'spilled') for (let i = 0; i < 5; i++) snapshot(pose((random() - 0.5) * 0.2, H + 0.012 - i * 0.02, D / 2 - 0.02 + i * 0.028, -0.95 - i * 0.08, (random() - 0.5) * 0.6), any());

    // The photograph set apart, leaning on the front of the box, a little larger than life.
    if (a.special !== 'none') {
      const hw = pw * 1.45, hh = ph * 1.45, lean = -0.5, x = -W / 2 + hw / 2 + 0.02, y = hh / 2 * Math.cos(lean) + 0.002, z = D / 2 + 0.008 + hh / 2 * Math.sin(-lean);
      if (a.special === 'torn') {
        for (const sideSign of [-1, 1]) {
          const piece = new THREE.Shape(); const edge = sideSign * hw / 2;
          piece.moveTo(edge, -hh / 2); piece.lineTo(edge, hh / 2);
          for (let k = 0; k <= 9; k++) piece.lineTo((k % 2 ? 0.004 : -0.003) + Math.sin(k * 1.7) * 0.002, hh / 2 - k * hh / 9);
          piece.closePath();
          const g = new THREE.ShapeGeometry(piece), p = g.attributes.position, uv = g.attributes.uv;
          for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / hw + 0.5, p.getY(i) / hh + 0.5);
          const m = pose(x + sideSign * 0.012 + (sideSign > 0 ? 0.035 : 0), y - (sideSign > 0 ? 0.004 : 0), z + (sideSign > 0 ? 0.012 : 0), lean - (sideSign > 0 ? 0.25 : 0), sideSign > 0 ? -0.35 : 0.1, sideSign * 0.12);
          const mirror = g.clone().rotateY(Math.PI);
          place(remap(g, HERO), m); place(remap(mirror, BACK, true), m);
        }
      } else if (a.special === 'written') { const m = pose(x, y, z, lean, 0.12, 0.06); place(remap(new THREE.PlaneGeometry(hw, hh), BACK), m); }
      else snapshot(pose(x, y, z, lean, 0.12, (random() - 0.5) * 0.12), HERO, hw, hh);
    }

    s.mesh(mergeGeometries(prints)!, new THREE.MeshStandardMaterial({ map: atlas, roughness: era === 'nineties' || era === 'polaroid' ? 0.35 : 0.8, alphaTest: 0.5 }));
    for (const g of prints) g.dispose();

    // Framed portraits.
    const framed = (x: number, z: number, w: number, h: number, kind: 'oval' | 'gilt' | 'wood' | 'silver', yaw: number) => {
      const g = new THREE.Group();
      const moulding = kind === 'wood' ? s.material('#3d2616', { roughness: 0.5 }) : kind === 'silver' ? s.material('#b9bcc0', { metalness: 0.85, roughness: mix(0.3, 0.7, mood.wear) }) : s.material('#c9a23a', { metalness: 0.75, roughness: mix(0.3, 0.6, mood.wear) });
      const pictureMap = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.4 });
      if (kind === 'oval') {
        const rim = s.ring(1, 0.09, [0, 0, 0], moulding); rim.scale.set(w / 2, h / 2, 0.012 / 0.09 * 0.5);
        const face = new THREE.Mesh(remap(new THREE.CircleGeometry(0.5, 32), any(), false, 0.16, 0.84), pictureMap); face.scale.set(w * 0.92, h * 0.92, 1); face.position.z = 0.002;
        const board = s.cylinder(0.5, 0.5, 0.006, [0, 0, -0.004], s.material('#5a4630'), 32); board.rotation.x = Math.PI / 2; board.scale.set(w, 1, h);
        g.add(rim, face, board);
      } else {
        const rail = 0.018;
        g.add(s.box([w + rail * 2, rail, 0.014], [0, h / 2 + rail / 2, 0], moulding), s.box([w + rail * 2, rail, 0.014], [0, -h / 2 - rail / 2, 0], moulding), s.box([rail, h, 0.014], [w / 2 + rail / 2, 0, 0], moulding), s.box([rail, h, 0.014], [-w / 2 - rail / 2, 0, 0], moulding), s.box([w, h, 0.004], [0, 0, -0.004], s.material('#efe8d6')));
        const face = new THREE.Mesh(remap(new THREE.PlaneGeometry(w * 0.82, h * 0.82), any()), pictureMap); face.position.z = 0.001;
        g.add(face);
      }
      const lean = -mix(0.2, 0.32, random()), tall = h + 0.036;
      g.add(s.rod([0, tall * 0.25, -0.006], [0, -tall / 2, -tall * 0.42], 0.004, s.material('#2a2a2a')));
      g.position.set(x, tall / 2 * Math.cos(lean) + 0.002, z); g.rotation.set(lean, yaw, 0, 'YXZ');
      s.root.add(g);
    };
    if (a.frames === 'oval') framed(W / 2 + 0.12, -0.02, 0.15, 0.2, 'oval', -0.3);
    if (a.frames === 'several') {
      framed(W / 2 + 0.11, -0.04, 0.13, 0.17, 'gilt', -0.35);
      framed(-W / 2 - 0.12, -0.03, 0.15, 0.2, 'oval', 0.3);
      framed(W / 2 + 0.24, 0.08, 0.09, 0.115, 'silver', -0.55);
      if (mood.density > 0.4) framed(-W / 2 - 0.25, 0.09, 0.1, 0.13, 'wood', 0.6);
    }

    // Slides and negatives.
    if (a.slides) {
      const mounts: THREE.BufferGeometry[] = [];
      const colour = (g: THREE.BufferGeometry, hex: string) => { const c = new THREE.Color(hex), n = g.attributes.position.count, data = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.toArray(data, i * 3); g.setAttribute('color', new THREE.BufferAttribute(data, 3)); return g; };
      const count = 7 + Math.floor(random() * 5 + mood.density * 5);
      for (let i = 0; i < count; i++) {
        const m = pose((random() - 0.5) * 0.7, 0.004 + i * 0.0012, D / 2 + 0.06 + random() * 0.26, (random() - 0.5) * 0.05, random() * 6.3);
        const mount = colour(new THREE.BoxGeometry(0.05, 0.003, 0.05), '#f3f1ea'), film = colour(new THREE.BoxGeometry(0.035, 0.0034, 0.023), pick(['#3a2a5a', '#7a3b1e', '#1e4a5a', '#5a1e2a', '#2a4a1e']));
        mount.applyMatrix4(m); film.applyMatrix4(m); mounts.push(mount, film);
      }
      for (let i = 0; i < 6; i++) {
        const strip = colour(new THREE.BoxGeometry(0.036, 0.0016, 0.035), i % 2 ? '#6b3a1c' : '#52290f');
        strip.applyMatrix4(pose(-0.3 + i * 0.037, 0.012 + Math.sin(i * 0.7) * 0.008, D / 2 + 0.2 + i * 0.012, 0, 0.32, Math.cos(i * 0.7) * 0.25));
        mounts.push(strip);
      }
      s.mesh(mergeGeometries(mounts)!, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
      for (const g of mounts) g.dispose();
    }

    // Tent card.
    if (a.sign !== 'none') {
      const text = { each: '10¢ EACH', handful: '$1 A HANDFUL', ancestors: 'INSTANT ANCESTORS', whose: 'DO YOU KNOW THEM?' }[a.sign];
      const x = W / 2 - 0.02, z = D / 2 + 0.1, wide = 0.2, tall = 0.085;
      const front = s.label(text, wide, tall, [x, tall / 2 * 0.9, z], '#8a1f1f', mood.cheer > 0.5 ? '#ffe04a' : '#f4ecd6');
      front.rotation.set(-0.42, -0.2, 0, 'YXZ');
      const rear = s.box([wide, tall, 0.001], [x + 0.008, tall / 2 * 0.9, z - 0.036], s.material('#f4ecd6'));
      rear.rotation.set(0.42, -0.2, 0, 'YXZ');
    }
    return s.finish();
  },
});
