import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;
const INK = '#000000', GROUND = '#ffffff', ACCENT = '#ff0000';

/** Thick round-ended stroke through points, in the unit square. */
function stroke(ctx: Ctx, pts: [number, number][], width: number, colour = INK) {
  ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
}
function blob(ctx: Ctx, x: number, y: number, rx: number, ry: number, colour = INK, turn = 0) {
  ctx.fillStyle = colour; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2); ctx.fill();
}
function wavy(x0: number, y0: number, x1: number, y1: number, waves: number, amp: number): [number, number][] {
  const pts: [number, number][] = [], dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  for (let i = 0; i <= 24; i++) { const t = i / 24, w = Math.sin(t * Math.PI * waves) * amp * (0.4 + t); pts.push([x0 + dx * t - dy / len * w, y0 + dy * t + dx / len * w]); }
  return pts;
}
function dolphin(ctx: Ctx, cx: number, cy: number, size: number, turn: number, flip: boolean) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(turn); ctx.scale(flip ? -size : size, size);
  ctx.fillStyle = INK; ctx.beginPath();
  ctx.moveTo(-0.5, 0.02); ctx.quadraticCurveTo(-0.2, -0.36, 0.22, -0.2); ctx.quadraticCurveTo(0.4, -0.13, 0.52, -0.12);
  ctx.quadraticCurveTo(0.42, -0.04, 0.3, -0.02); ctx.quadraticCurveTo(0.0, 0.1, -0.3, 0.02); ctx.quadraticCurveTo(-0.42, 0.0, -0.5, 0.02); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-0.44, 0.02); ctx.lineTo(-0.66, -0.14); ctx.lineTo(-0.56, 0.03); ctx.lineTo(-0.66, 0.2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-0.12, -0.25); ctx.lineTo(-0.2, -0.46); ctx.lineTo(0.06, -0.26); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0.0, 0.04); ctx.lineTo(-0.06, 0.2); ctx.lineTo(0.14, 0.02); ctx.closePath(); ctx.fill();
  blob(ctx, 0.3, -0.12, 0.03, 0.03, GROUND);
  stroke(ctx, [[-0.3, -0.06], [0.1, -0.1]], 0.025, ACCENT);
  ctx.restore();
}
function fish(ctx: Ctx, cx: number, cy: number, size: number, turn: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(turn); ctx.scale(size, size);
  blob(ctx, 0, 0, 0.5, 0.2);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-0.42, 0); ctx.lineTo(-0.75, -0.24); ctx.lineTo(-0.75, 0.24); ctx.closePath(); ctx.fill();
  blob(ctx, 0.28, -0.04, 0.045, 0.045, GROUND);
  ctx.restore();
}
function trident(ctx: Ctx, x: number, top: number, bottom: number, w: number) {
  stroke(ctx, [[x, top + 0.04], [x, bottom]], 0.022);
  stroke(ctx, [[x - w, top + 0.02], [x - w, top + 0.1], [x + w, top + 0.1], [x + w, top + 0.02]], 0.02);
  for (const dx of [-w, 0, w]) { ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(dx + x - 0.022, top + 0.04); ctx.lineTo(dx + x, top - 0.02); ctx.lineTo(dx + x + 0.022, top + 0.04); ctx.closePath(); ctx.fill(); }
}
function figure(ctx: Ctx, joints: Record<string, [number, number]>, w: number) {
  const j = joints;
  stroke(ctx, [j.hip, j.chest], w * 1.5);
  blob(ctx, j.head[0], j.head[1], w * 0.95, w * 1.05);
  stroke(ctx, [j.chest, j.elbowA, j.handA], w * 0.8); stroke(ctx, [j.chest, j.elbowB, j.handB], w * 0.8);
  stroke(ctx, [j.hip, j.kneeA, j.footA], w); stroke(ctx, [j.hip, j.kneeB, j.footB], w);
  stroke(ctx, [j.footA, [j.footA[0] + w * 1.2 * Math.sign(j.handA[0] - j.hip[0] || 1), j.footA[1]]], w * 0.7);
  stroke(ctx, [j.footB, [j.footB[0] + w * 1.2 * Math.sign(j.handA[0] - j.hip[0] || 1), j.footB[1]]], w * 0.7);
  stroke(ctx, [[j.hip[0] - w * 0.6, j.hip[1] - w * 0.3], [j.hip[0] + w * 0.6, j.hip[1] - w * 0.3]], w * 0.9, ACCENT);
}

const MOTIFS: Record<string, (ctx: Ctx, random: () => number) => void> = {
  oceanus(ctx, random) {
    for (let k = -5; k <= 5; k++) stroke(ctx, wavy(0.5 + k * 0.03, 0.56, 0.5 + k * 0.062, 0.86 - Math.abs(k) * 0.022, 3, 0.02), 0.03);
    for (let k = -6; k <= 6; k++) { const an = -Math.PI / 2 + k * 0.27; stroke(ctx, wavy(0.5 + Math.cos(an) * 0.14, 0.42 + Math.sin(an) * 0.17, 0.5 + Math.cos(an) * 0.3, 0.42 + Math.sin(an) * 0.3, 2, 0.018), 0.03); }
    blob(ctx, 0.5, 0.44, 0.16, 0.19);
    for (const sx of [-1, 1]) {
      blob(ctx, 0.5 + sx * 0.065, 0.41, 0.042, 0.027, GROUND); blob(ctx, 0.5 + sx * 0.065, 0.412, 0.015, 0.018);
      stroke(ctx, [[0.5 + sx * 0.025, 0.36], [0.5 + sx * 0.07, 0.345], [0.5 + sx * 0.115, 0.365]], 0.012, GROUND);
      blob(ctx, 0.5 + sx * 0.095, 0.5, 0.03, 0.02, ACCENT);
      // lobster claws in the hair
      stroke(ctx, [[0.5 + sx * 0.08, 0.27], [0.5 + sx * 0.13, 0.19]], 0.022);
      stroke(ctx, [[0.5 + sx * 0.13, 0.19], [0.5 + sx * 0.1, 0.13], [0.5 + sx * 0.135, 0.15]], 0.02);
      stroke(ctx, [[0.5 + sx * 0.13, 0.19], [0.5 + sx * 0.19, 0.15], [0.5 + sx * 0.16, 0.14]], 0.02);
    }
    stroke(ctx, [[0.5, 0.4], [0.5, 0.5], [0.475, 0.51]], 0.012, GROUND);
    stroke(ctx, [[0.45, 0.565], [0.5, 0.58], [0.55, 0.565]], 0.014, GROUND);
    fish(ctx, 0.2, 0.74 + random() * 0.05, 0.1, -0.3); fish(ctx, 0.8, 0.72 + random() * 0.05, 0.1, Math.PI + 0.3);
  },
  dolphins(ctx, random) {
    trident(ctx, 0.5, 0.2, 0.84, 0.07);
    dolphin(ctx, 0.3, 0.42 + random() * 0.04, 0.34, -0.5, false);
    dolphin(ctx, 0.7, 0.6 + random() * 0.04, 0.34, 0.5 + Math.PI, false);
    for (const [x, y] of [[0.26, 0.76], [0.74, 0.28]]) stroke(ctx, wavy(x - 0.09, y, x + 0.09, y, 3, 0.012), 0.016);
  },
  wrestlers(ctx, random) {
    stroke(ctx, [[0.18, 0.84], [0.82, 0.84]], 0.022);
    const lean = 0.02 + random() * 0.03;
    const a = { head: [0.4 + lean, 0.33], chest: [0.385, 0.42], hip: [0.32, 0.58], elbowA: [0.47, 0.46], handA: [0.56, 0.42], elbowB: [0.46, 0.52], handB: [0.57, 0.56], kneeA: [0.4, 0.69], footA: [0.36, 0.82], kneeB: [0.26, 0.7], footB: [0.21, 0.82] } as Record<string, [number, number]>;
    const b: Record<string, [number, number]> = {};
    for (const key of Object.keys(a)) b[key] = [1 - a[key][0], a[key][1] + (key === 'head' || key === 'chest' ? 0.03 : 0)];
    b.handA = [0.43, 0.5]; b.handB = [0.42, 0.6];
    figure(ctx, a, 0.05); figure(ctx, b, 0.05);
    // the prize: a palm branch and a vase
    stroke(ctx, [[0.82, 0.38], [0.86, 0.2]], 0.014, ACCENT);
    for (let k = 0; k < 5; k++) for (const sx of [-1, 1]) stroke(ctx, [[0.825 + k * 0.008, 0.36 - k * 0.035], [0.825 + k * 0.008 + sx * 0.04, 0.33 - k * 0.035]], 0.01, ACCENT);
    blob(ctx, 0.14, 0.3, 0.035, 0.05); stroke(ctx, [[0.14, 0.24], [0.14, 0.22]], 0.03);
  },
  octopus(ctx, random) {
    for (let k = 0; k < 8; k++) {
      const an = Math.PI * (0.08 + k * 0.12), pts: [number, number][] = [];
      const curl = (k % 2 ? 1 : -1) * (0.9 + random() * 0.5);
      for (let i = 0; i <= 26; i++) { const t = i / 26, r = 0.06 + t * 0.36, th = an + curl * t * t * 1.5; pts.push([0.5 + Math.cos(th) * r * 1.05, 0.44 + Math.sin(th) * r]); }
      for (let i = 0; i < 26; i += 2) stroke(ctx, pts.slice(i, i + 3), 0.042 * (1 - i / 30));
      for (let i = 3; i < 22; i += 4) blob(ctx, pts[i][0], pts[i][1], 0.008, 0.008, GROUND);
    }
    blob(ctx, 0.5, 0.33, 0.1, 0.14);
    blob(ctx, 0.5, 0.44, 0.09, 0.05);
    for (const sx of [-1, 1]) { blob(ctx, 0.5 + sx * 0.045, 0.42, 0.024, 0.02, GROUND); blob(ctx, 0.5 + sx * 0.045, 0.42, 0.009, 0.014); }
    blob(ctx, 0.5, 0.28, 0.035, 0.05, ACCENT);
    fish(ctx, 0.2, 0.22, 0.09, 0.2); fish(ctx, 0.82, 0.2, 0.08, Math.PI - 0.2);
  },
  galley(ctx, random) {
    for (let row = 0; row < 2; row++) for (let k = 0; k < 6; k++) stroke(ctx, [[0.12 + k * 0.13 + row * 0.06, 0.78 + row * 0.06], [0.16 + k * 0.13 + row * 0.06, 0.755 + row * 0.06], [0.2 + k * 0.13 + row * 0.06, 0.78 + row * 0.06]], 0.016);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(0.14, 0.52); ctx.quadraticCurveTo(0.12, 0.38, 0.2, 0.34); ctx.quadraticCurveTo(0.2, 0.56, 0.34, 0.6); ctx.lineTo(0.74, 0.6); ctx.lineTo(0.9, 0.56); ctx.lineTo(0.76, 0.69); ctx.lineTo(0.3, 0.69); ctx.quadraticCurveTo(0.16, 0.66, 0.14, 0.52); ctx.fill();
    for (let k = 0; k < 8; k++) stroke(ctx, [[0.33 + k * 0.05, 0.66], [0.29 + k * 0.05, 0.76]], 0.01);
    stroke(ctx, [[0.5, 0.6], [0.5, 0.2]], 0.018);
    stroke(ctx, [[0.33, 0.24], [0.67, 0.24]], 0.016);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(0.34, 0.25); ctx.lineTo(0.66, 0.25); ctx.quadraticCurveTo(0.72, 0.38, 0.65, 0.5); ctx.lineTo(0.35, 0.5); ctx.quadraticCurveTo(0.4, 0.38, 0.34, 0.25); ctx.fill();
    for (let k = 1; k < 4; k++) stroke(ctx, [[0.36 + k * 0.075, 0.26], [0.37 + k * 0.075, 0.49]], 0.012, k % 2 ? ACCENT : GROUND);
    blob(ctx, 0.83, 0.585, 0.014, 0.014, GROUND);
    stroke(ctx, [[0.2, 0.34], [0.24, 0.3], [0.2, 0.28]], 0.014);
    dolphin(ctx, 0.2 + random() * 0.05, 0.14, 0.16, -0.2, false);
  },
};

export default defineThing({
  questions: {
    subject: choice('What does the mosaic show?', {
      oceanus: 'The face of a bearded sea god, lobster claws in his wild hair, beard flowing like waves.',
      dolphins: 'Two leaping dolphins either side of a trident.',
      octopus: 'An octopus with curling arms among small fish.',
      galley: 'A galley under sail with a bank of oars, over stylised waves.',
      wrestlers: 'Two naked wrestlers locked together, a palm branch and prize vase beside them.',
    }),
    border: choice('What frames the picture?', {
      plain: 'Two plain black bands.',
      teeth: 'A sawtooth band of black and white triangles.',
      key: 'A Greek key meander.',
      waves: 'A running wave scroll, crest after crest.',
    }),
    palette: choice('What colours are the tesserae?', {
      bw: 'Strict black figures on white, the Ostia style.',
      ochre: 'Black and white with touches of red ochre.',
      sea: 'Blue-black on cream with glints of turquoise glass.',
      night: 'Reversed: pale figures on a black ground.',
    }),
    format: choice('What shape is the panel?', {
      square: 'A square panel.',
      long: 'A long rectangular strip, a threshold or pool edge.',
      roundel: 'A round medallion.',
    }),
    setting: choice('Where is the mosaic now?', {
      floor: 'Still in the floor, surrounded by plain white paving.',
      lifted: 'A lifted fragment with ragged edges, propped upright on timber struts.',
      museum: 'Mounted upright in a steel frame on a dark base with a label.',
      crate: 'Lying in a shallow wooden transport crate packed with straw.',
      dig: 'Half uncovered in an excavation: soil over one corner, a brush, a trowel and a striped scale bar.',
    }),
    damage: choice('How has it been damaged?', {
      intact: 'Hardly at all; a tessera missing here and there.',
      traffic: 'A worn path of missing tesserae runs across it where people walked.',
      lacuna: 'A large hole in one part, filled with plain pinkish mortar.',
      patched: 'An ancient repair: a patch of clumsy oversized white tesserae ignoring the picture.',
      crumbling: 'The edges are breaking up and loose tesserae lie scattered around it.',
    }),
    size: score('How big is the panel?', ['A small emblem you could carry', 'The floor of a small room', 'A hall floor several strides across']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const round = a.format === 'roundel';
    const aspect = a.format === 'long' ? 1.7 : 1;
    const size = mix(0.6, 2.4, a.size);
    const Wp = size * aspect, Hp = size, T = Math.max(0.04, size * 0.045);
    const rows = 64, cols = Math.round(rows * aspect);

    // 1. Draw the cartoon in three flat colours.
    const cartoon = document.createElement('canvas');
    cartoon.height = 448; cartoon.width = Math.round(448 * aspect);
    const cx = cartoon.getContext('2d', { willReadFrequently: true })!;
    cx.fillStyle = GROUND; cx.fillRect(0, 0, cartoon.width, cartoon.height);
    cx.save(); cx.translate((cartoon.width - 448) / 2, 0); cx.scale(448, 448);
    if (round) { cx.translate(0.5, 0.5); cx.scale(0.84, 0.84); cx.translate(-0.5, -0.5); }
    MOTIFS[a.subject](cx, random);
    cx.restore();
    cx.save(); cx.scale(448, 448);
    if (aspect > 1) { const side = (aspect - 1) / 2; dolphin(cx, side * 0.62 + 0.04, 0.5, side * 0.9, -0.25, false); dolphin(cx, aspect - side * 0.62 - 0.04, 0.5, side * 0.9, 0.25, true); }
    if (round) {
      cx.strokeStyle = INK; cx.lineWidth = 0.035; cx.beginPath(); cx.arc(0.5, 0.5, 0.475, 0, Math.PI * 2); cx.stroke();
      cx.lineWidth = 0.014; cx.beginPath(); cx.arc(0.5, 0.5, 0.43, 0, Math.PI * 2); cx.stroke();
      if (a.border !== 'plain') for (let k = 0; k < 40; k++) { const an = k / 40 * Math.PI * 2; cx.fillStyle = GROUND; cx.beginPath(); cx.arc(0.5 + Math.cos(an) * 0.475, 0.5 + Math.sin(an) * 0.475, a.border === 'teeth' ? 0.012 : 0.008, 0, Math.PI * 2); cx.fill(); }
    } else {
      const band = 0.075, m = 0.035;
      cx.strokeStyle = INK;
      if (a.border === 'plain') { cx.lineWidth = 0.03; cx.strokeRect(m + 0.015, m + 0.015, aspect - m * 2 - 0.03, 1 - m * 2 - 0.03); cx.lineWidth = 0.012; cx.strokeRect(m + 0.06, m + 0.06, aspect - m * 2 - 0.12, 1 - m * 2 - 0.12); }
      else {
        cx.fillStyle = INK;
        cx.fillRect(m, m, aspect - m * 2, band); cx.fillRect(m, 1 - m - band, aspect - m * 2, band); cx.fillRect(m, m, band, 1 - m * 2); cx.fillRect(aspect - m - band, m, band, 1 - m * 2);
        const sides: [number, number, number, number, number][] = [[m, m, 1, 0, aspect - m * 2], [aspect - m, m, 0, 1, 1 - m * 2], [aspect - m, 1 - m, -1, 0, aspect - m * 2], [m, 1 - m, 0, -1, 1 - m * 2]];
        for (const [x0, y0, dx, dy, len] of sides) {
          const n = Math.round(len / band);
          cx.save(); cx.translate(x0, y0); cx.rotate(Math.atan2(dy, dx));
          const u = len / n;
          for (let k = 0; k < n; k++) {
            cx.save(); cx.translate(k * u, 0);
            if (a.border === 'teeth') { cx.fillStyle = GROUND; cx.beginPath(); cx.moveTo(u * 0.1, band * 0.86); cx.lineTo(u * 0.5, band * 0.14); cx.lineTo(u * 0.9, band * 0.86); cx.closePath(); cx.fill(); }
            else if (a.border === 'key') stroke(cx, [[0, band * 0.8], [u * 0.2, band * 0.8], [u * 0.2, band * 0.2], [u * 0.8, band * 0.2], [u * 0.8, band * 0.62], [u * 0.5, band * 0.62], [u * 0.5, band * 0.42]], band * 0.13, GROUND);
            else { cx.strokeStyle = GROUND; cx.lineWidth = band * 0.16; cx.lineCap = 'round'; cx.beginPath(); cx.arc(u * 0.5, band * 0.56, band * 0.3, Math.PI * 0.2, Math.PI * 1.9); cx.stroke(); stroke(cx, [[u * 0.78, band * 0.72], [u * 1.0, band * 0.84]], band * 0.16, GROUND); }
            cx.restore();
          }
          cx.restore();
        }
      }
    }
    cx.restore();
    const src = cx.getImageData(0, 0, cartoon.width, cartoon.height).data;

    // 2. Decide what is lost.
    const lattice = Array.from({ length: 100 }, () => random());
    const noise = (x: number, y: number) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi; const at = (i: number, j: number) => lattice[((i % 10) + 10) % 10 + (((j % 10) + 10) % 10) * 10]; const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return mix(mix(at(xi, yi), at(xi + 1, yi), sx), mix(at(xi, yi + 1), at(xi + 1, yi + 1), sx), sy); };
    const holeX = 0.25 + random() * 0.5, holeY = 0.3 + random() * 0.45, holeR = 0.16 + random() * 0.1;
    const pathAngle = random() * Math.PI, pathOff = (random() - 0.5) * 0.3;
    const lostAt = (u: number, v: number): 0 | 1 | 2 | 3 => { // 0 kept, 1 bare mortar, 2 pink fill, 3 crude patch
      const n = noise(u * 7 * aspect, v * 7), fine = noise(u * 23 * aspect + 5, v * 23 + 3);
      const hole = Math.hypot((u - holeX) * aspect, v - holeY) + (n - 0.5) * 0.14;
      if (a.damage === 'lacuna' && hole < holeR) return 2;
      if (a.damage === 'patched' && hole < holeR) return 3;
      let p = wear * 0.5 * (n * 0.7 + fine * 0.6) ** 2.2 * 1.5 + 0.01;
      if (a.damage === 'traffic') { const d = Math.abs((u - 0.5) * aspect * Math.cos(pathAngle) + (v - 0.5) * Math.sin(pathAngle) + pathOff); p += Math.max(0, 0.13 - d) * 4 * (0.25 + n) * (0.5 + fine); }
      if (a.damage === 'crumbling') { const edge = Math.min(u * aspect, v, (1 - u) * aspect, 1 - v); p += Math.max(0, 0.16 - edge + (n - 0.5) * 0.14) * 6; }
      return random() < p ? 1 : 0;
    };

    // 3. Set the tesserae.
    const pal = { bw: ['#1f1d1c', '#ece5d3', '#1f1d1c'], ochre: ['#1f1d1c', '#ece5d3', '#a8492c'], sea: ['#1b3044', '#efe6cf', '#3fa3a6'], night: ['#eae3d0', '#1d1c1c', '#c9a14a'] }[a.palette];
    const cell = 16;
    const canvas = document.createElement('canvas');
    canvas.width = cols * cell; canvas.height = rows * cell;
    const ctx = canvas.getContext('2d')!;
    const mortar = new THREE.Color('#9a8f7c').lerp(new THREE.Color('#6f6452'), wear * 0.6);
    ctx.fillStyle = `#${mortar.getHexString()}`; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const shade = (hex: string, spread: number) => { const n = parseInt(hex.slice(1), 16), d = (random() - 0.5) * spread * 255, g = wear * 0.16; const ch = (v: number, grime: number) => Math.round(Math.min(255, Math.max(0, mix(v + d, grime, g)))); return `rgb(${ch(n >> 16, 140)},${ch((n >> 8) & 255, 128)},${ch(n & 255, 104)})`; };
    let missing = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const u = (i + 0.5) / cols, v = (j + 0.5) / rows;
      if (round && Math.hypot(u - 0.5, v - 0.5) > 0.498) continue;
      const lost = lostAt(u, v);
      const x = i * cell, y = j * cell;
      if (lost === 1) { missing++; continue; }
      if (lost === 2) { ctx.fillStyle = shade('#c79a86', 0.05); ctx.fillRect(x, y, cell, cell); continue; }
      if (lost === 3) { if (i % 2 === 0 && j % 2 === 0) { ctx.fillStyle = shade(random() < 0.12 ? '#b9785a' : '#d9d2c0', 0.08); ctx.fillRect(x + 2, y + 2, cell * 2 - 4, cell * 2 - 4); } continue; }
      const px = Math.min(cartoon.width - 1, Math.floor(u * cartoon.width)), py = Math.min(cartoon.height - 1, Math.floor(v * cartoon.height));
      const k = (py * cartoon.width + px) * 4;
      const r = src[k], g = src[k + 1];
      const tone = r > 140 && g < 110 ? pal[2] : r + g < 250 ? pal[0] : pal[1];
      ctx.fillStyle = shade(tone, tone === pal[1] ? 0.07 : 0.05);
      const inset = 1.2 + random() * 1.2;
      ctx.fillRect(x + inset + (random() - 0.5) * 1.5, y + inset + (random() - 0.5) * 1.5, cell - inset * 2, cell - inset * 2);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
    const face = new THREE.MeshStandardMaterial({ map, roughness: a.palette === 'sea' ? 0.45 : 0.7 });
    const bed = s.material(mortar, { roughness: 1 });

    // 4. The slab.
    const ragged = a.setting === 'lifted' || a.setting === 'dig' || (a.damage === 'crumbling' && a.setting !== 'floor' && a.setting !== 'museum');
    const outline: THREE.Vector2[] = [];
    if (round) for (let k = 0; k < 64; k++) { const an = k / 64 * Math.PI * 2, r = size / 2 * (ragged ? 1 - random() * 0.035 - (noise(k * 0.4, 1) > 0.7 ? 0.05 : 0) : 1); outline.push(new THREE.Vector2(Math.cos(an) * r, Math.sin(an) * r)); }
    else {
      const per = (n: number, x0: number, y0: number, dx: number, dy: number, nx: number, ny: number) => { for (let k = 0; k < n; k++) { const bite = ragged ? random() * size * 0.03 + (noise(k * 0.5 + x0 * 3, y0 * 3) > 0.68 ? size * 0.05 : 0) : 0; outline.push(new THREE.Vector2(x0 + dx * k / n + nx * bite, y0 + dy * k / n + ny * bite)); } };
      const nw = Math.round(10 * aspect), nh = 10;
      per(nw, -Wp / 2, -Hp / 2, Wp, 0, 0, 1); per(nh, Wp / 2, -Hp / 2, 0, Hp, -1, 0); per(nw, Wp / 2, Hp / 2, -Wp, 0, 0, -1); per(nh, -Wp / 2, Hp / 2, 0, -Hp, 1, 0);
    }
    const shape = new THREE.Shape(outline);
    const panel = new THREE.Group();
    s.root.add(panel);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false }).rotateX(-Math.PI / 2), bed);
    const top = new THREE.ShapeGeometry(shape);
    const uv = top.attributes.uv, pos = top.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / Wp + 0.5, pos.getY(i) / Hp + 0.5);
    top.rotateX(-Math.PI / 2);
    const picture = new THREE.Mesh(top, face);
    picture.position.y = T + 0.0015;
    for (const mesh of [body, picture]) { mesh.castShadow = mesh.receiveShadow = true; panel.add(mesh); }

    const timber = s.material('#9c7a4c', { roughness: 0.9 });
    const steel = s.material('#3c4246', { metalness: 0.6, roughness: 0.45 });
    const loose: { at: P3; size: number; color: string }[] = [];
    const strew = (n: number, reach: number, y: number) => { for (let k = 0; k < n; k++) { const an = random() * Math.PI * 2, r = 0.5 + random() * reach; loose.push({ at: [Math.cos(an) * Wp * r, y + size * 0.006, Math.sin(an) * Hp * r], size: size * 0.011, color: random() < 0.45 ? pal[0] : pal[1] }); } };

    if (a.setting === 'floor') {
      const around: THREE.Vector2[] = [];
      const m = size * 0.24;
      for (let k = 0; k < 40; k++) { const an = k / 40 * Math.PI * 2, sq = 1 / Math.max(Math.abs(Math.cos(an)), Math.abs(Math.sin(an))); around.push(new THREE.Vector2(Math.cos(an) * sq * (Wp / 2 + m * (0.55 + random() * 0.45)), Math.sin(an) * sq * (Hp / 2 + m * (0.55 + random() * 0.45)))); }
      const field = new THREE.Shape(around);
      const plainCanvas = document.createElement('canvas'); plainCanvas.width = plainCanvas.height = 256;
      const pc = plainCanvas.getContext('2d')!; pc.fillStyle = `#${mortar.getHexString()}`; pc.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { if (random() < wear * 0.3) continue; pc.fillStyle = shade(pal[1], 0.07); pc.fillRect(i * 16 + 1.5, j * 16 + 1.5, 13, 13); }
      const plain = new THREE.CanvasTexture(plainCanvas); plain.colorSpace = THREE.SRGBColorSpace; plain.wrapS = plain.wrapT = THREE.RepeatWrapping; plain.repeat.set(rows / 16 / Hp, rows / 16 / Hp);
      const under = s.mesh(new THREE.ExtrudeGeometry(field, { depth: T * 0.98, bevelEnabled: false }).rotateX(-Math.PI / 2), bed);
      under.position.y = 0;
      const paving = s.mesh(new THREE.ShapeGeometry(field).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: plain, roughness: 0.75 }), [0, T * 0.98 + 0.0005, 0]);
      paving.castShadow = false;
      if (wear > 0.5) { const weeds: { at: P3; size: number; color: string }[] = []; for (let k = 0; k < wear * 26; k++) { const x = (random() - 0.5) * (Wp + m), z = (random() - 0.5) * (Hp + m); for (let b = 0; b < 3; b++) weeds.push({ at: [x + (random() - 0.5) * 0.04 * size, T + size * (0.012 + b * 0.012), z + (random() - 0.5) * 0.04 * size], size: size * (0.012 + random() * 0.012), color: random() < 0.5 ? '#5f7d36' : '#84913c' }); } s.scatter(new THREE.TetrahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), weeds); }
      strew(Math.round(missing * 0.03), 0.12, T);
    } else if (a.setting === 'lifted' || a.setting === 'museum') {
      const museum = a.setting === 'museum';
      const theta = museum ? 1.42 : 1.12 + random() * 0.12;
      const baseH = museum ? Math.max(0.12, size * 0.14) : 0.05 * size + 0.02;
      if (museum) {
        const f = size * 0.025;
        for (const [w, h, x, z] of [[Wp + f * 2, f, 0, -Hp / 2 - f / 2], [Wp + f * 2, f, 0, Hp / 2 + f / 2], [f, Hp, -Wp / 2 - f / 2, 0], [f, Hp, Wp / 2 + f / 2, 0]] as const) { const bar = new THREE.Mesh(new THREE.BoxGeometry(w, T + 0.02, h), steel); bar.position.set(x, T / 2, z); bar.castShadow = true; panel.add(bar); }
        s.box([Wp + size * 0.24, baseH, size * 0.42], [0, baseH / 2, -size * 0.04], s.material('#2c2f33', { roughness: 0.6 }));
        const card = s.label({ oceanus: 'OCEANVS', dolphins: 'DELPHINI', octopus: 'POLYPVS', galley: 'NAVIS', wrestlers: 'LVCTATORES' }[a.subject], size * 0.34, size * 0.085, [Wp * 0.26, baseH * 0.55, size * 0.172], '#2b2b2b', '#f1ede2');
        card.castShadow = false;
      } else {
        for (const x of [-1, 1]) s.box([size * 0.07, baseH, size * 0.5], [x * Wp * 0.3, baseH / 2, -size * 0.1], timber);
      }
      panel.rotation.x = theta;
      const back = museum ? 0 : -size * 0.02;
      panel.position.set(0, baseH + Math.sin(theta) * (Hp / 2) * (round ? 1 : 1) + (museum ? size * 0.025 * Math.sin(theta) : 0), back + Math.cos(theta) * 0 + 0.0);
      panel.position.z = -Math.cos(theta) * Hp / 2 + size * 0.1;
      // struts behind
      const topY = panel.position.y + Math.sin(theta) * Hp * 0.28, topZ = panel.position.z - Math.cos(theta) * Hp * 0.28 - T * 1.05;
      for (const x of [-1, 1]) s.rod([x * Wp * 0.3, baseH, -size * 0.32], [x * Wp * 0.3, topY, topZ - 0.01], size * 0.022, museum ? steel : timber);
      if (!museum) { s.box([Wp * 0.7, size * 0.05, size * 0.03], [0, topY, topZ - size * 0.02], timber); strew(Math.round(missing * 0.02) + 6, 0.1, 0); for (const item of loose) { item.at[2] = size * (0.2 + random() * 0.3); item.at[0] *= 0.8; } }
    } else if (a.setting === 'crate') {
      const wall = size * 0.16, gap = size * 0.07, cw = Wp + gap * 2, ch = Hp + gap * 2, t = size * 0.025;
      s.box([cw + t * 2, t, ch + t * 2], [0, t / 2, 0], timber);
      for (const z of [-1, 1]) s.box([cw + t * 2, wall, t], [0, wall / 2, z * (ch / 2 + t / 2)], timber);
      for (const x of [-1, 1]) s.box([t, wall, ch], [x * (cw / 2 + t / 2), wall / 2, 0], timber);
      for (const x of [-0.3, 0.3]) s.box([size * 0.06, wall * 0.9, t * 0.5], [x * cw, wall / 2, ch / 2 + t * 1.2], s.material('#7a5c38'));
      const stamp = s.label(`OSTIA ${Math.floor(random() * 90 + 10)}`, size * 0.36, size * 0.09, [0, wall * 0.5, ch / 2 + t + 0.004], '#3a2a1c', '#9c7a4c'); stamp.castShadow = false;
      panel.position.y = t + size * 0.03;
      const straw: THREE.Mesh[] = [];
      const strawMat = s.material('#d9bf6a', { roughness: 1 });
      const strands = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.012, 0.012), strawMat, 150);
      const mat = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let k = 0; k < 150; k++) {
        const along = random() < 0.5, sgn = random() < 0.5 ? -1 : 1;
        const x = along ? (random() - 0.5) * cw : sgn * (Wp / 2 + gap * random()), z = along ? sgn * (Hp / 2 + gap * random()) : (random() - 0.5) * ch;
        q.setFromEuler(new THREE.Euler((random() - 0.5) * 0.6, random() * Math.PI, (random() - 0.5) * 0.6));
        mat.compose(new THREE.Vector3(x, t + size * (0.02 + random() * 0.07), z), q, new THREE.Vector3(size * (0.08 + random() * 0.1), size, size));
        strands.setMatrixAt(k, mat);
      }
      strands.castShadow = true; s.root.add(strands); void straw;
      if (mood.density > 0.4) { const lid = s.box([cw + t * 2, t, ch + t * 2], [-(cw / 2 + t * 2 + Math.sin(0.3) * (ch / 2)), Math.cos(0.3) * (ch / 2 + t), 0], timber); lid.rotation.set(0, 0, Math.PI / 2 - 0.3); lid.scale.set(ch / cw * 0 + 1, 1, 1); lid.rotation.set(0, Math.PI / 2, 0); lid.rotation.set(Math.PI / 2 - 0.25, 0, 0); lid.position.set(0, Math.cos(0.25) * (ch / 2 + t), -(ch / 2 + t * 2 + Math.sin(0.25) * (ch / 2 + t))); }
    } else {
      // Excavation: soil under and over, tools beside.
      const soil = s.material('#7a6248', { roughness: 1 });
      const pad = s.cylinder(Math.max(Wp, Hp) * 0.78, Math.max(Wp, Hp) * 0.82, size * 0.05, [0, size * 0.025, 0], soil, 28);
      pad.scale.set(Wp >= Hp ? 1 : Wp / Hp, 1, Hp >= Wp ? 1 : Hp / Wp);
      panel.position.y = size * 0.035;
      const corner = [random() < 0.5 ? -1 : 1, -1];
      for (let k = 0; k < 7; k++) { const heap = s.ball([size * (0.14 + random() * 0.16), size * (0.04 + random() * 0.07), size * (0.14 + random() * 0.14)], [corner[0] * Wp * (0.5 - random() * 0.32), size * 0.06 + T, corner[1] * Hp * (0.5 - random() * 0.3)], soil, 10); heap.rotation.y = random() * 3; }
      const bx = -corner[0] * Wp * 0.34, bz = Hp * 0.5 + size * 0.14;
      const bar = s.label('', size * 0.5, size * 0.04, [bx, size * 0.052, bz], '#111', '#f4f1e8'); bar.rotation.x = -Math.PI / 2;
      for (let k = 0; k < 5; k += 2) s.box([size * 0.1, 0.004, size * 0.04], [bx - size * 0.2 + k * size * 0.1, size * 0.054, bz], s.material('#141414')).castShadow = false;
      const tx = corner[0] * Wp * 0.4, tz = Hp * 0.5 + size * 0.12;
      s.rod([tx, size * 0.065, tz], [tx + size * 0.16, size * 0.065, tz + size * 0.03], size * 0.014, timber);
      const bristle = s.box([size * 0.07, size * 0.02, size * 0.09], [tx - size * 0.035, size * 0.062, tz - size * 0.008], s.material('#d8c48a', { roughness: 1 })); bristle.rotation.y = 0.18;
      strew(Math.round(missing * 0.02) + 8, 0.14, size * 0.05);
    }
    if (a.damage === 'crumbling' && a.setting !== 'museum') strew(40, 0.16, a.setting === 'floor' ? T : a.setting === 'dig' ? size * 0.05 : a.setting === 'crate' ? size * 0.03 : 0);
    if (a.setting === 'crate') for (const item of loose) { item.at[0] *= 0.82; item.at[2] *= 0.82; item.at[1] = size * 0.09; }
    if (loose.length) s.scatter(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), loose);
    return s.finish();
  },
});
