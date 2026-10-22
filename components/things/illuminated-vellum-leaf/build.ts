import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Rand = () => number;
type Ctx = CanvasRenderingContext2D;
type Pigment = 'gold' | 'blue' | 'red' | 'green' | 'rose' | 'white';

const W = 768, H = 1056;

const LETTERS = {
  B: 'B, for Beatus vir: the opening of a psalter.',
  D: 'D, a great round bowl with room for a scene inside.',
  I: 'I, a tall column running the height of the text: In principio.',
  O: 'O, a full circle like a window or a wheel.',
  P: 'P, with a long stem dropping down the margin.',
  S: 'S, a serpent of a letter.',
} as const;

function letterPath(g: Ctx, letter: keyof typeof LETTERS, x: number, y: number, w: number, h: number) {
  const X = (u: number) => x + u * w, Y = (v: number) => y + v * h;
  g.beginPath();
  if (letter === 'B') {
    g.moveTo(X(0.3), Y(0.1)); g.lineTo(X(0.3), Y(0.9));
    g.moveTo(X(0.3), Y(0.1)); g.bezierCurveTo(X(0.85), Y(0.1), X(0.85), Y(0.5), X(0.3), Y(0.5));
    g.bezierCurveTo(X(0.95), Y(0.5), X(0.95), Y(0.9), X(0.3), Y(0.9));
  } else if (letter === 'D') {
    g.moveTo(X(0.26), Y(0.1)); g.lineTo(X(0.26), Y(0.9));
    g.moveTo(X(0.26), Y(0.1)); g.bezierCurveTo(X(1.02), Y(0.1), X(1.02), Y(0.9), X(0.26), Y(0.9));
  } else if (letter === 'I') {
    g.moveTo(X(0.5), Y(0.06)); g.lineTo(X(0.5), Y(0.94));
    g.moveTo(X(0.25), Y(0.06)); g.lineTo(X(0.75), Y(0.06));
    g.moveTo(X(0.25), Y(0.94)); g.lineTo(X(0.75), Y(0.94));
  } else if (letter === 'O') {
    g.ellipse(X(0.5), Y(0.5), w * 0.33, h * 0.38, 0, 0, Math.PI * 2);
  } else if (letter === 'P') {
    g.moveTo(X(0.3), Y(0.08)); g.lineTo(X(0.3), Y(1.5));
    g.moveTo(X(0.3), Y(0.08)); g.bezierCurveTo(X(0.98), Y(0.08), X(0.98), Y(0.66), X(0.3), Y(0.66));
  } else {
    g.moveTo(X(0.74), Y(0.26)); g.bezierCurveTo(X(0.62), Y(0.04), X(0.24), Y(0.08), X(0.28), Y(0.32));
    g.bezierCurveTo(X(0.32), Y(0.54), X(0.72), Y(0.46), X(0.74), Y(0.7));
    g.bezierCurveTo(X(0.76), Y(0.96), X(0.34), Y(0.96), X(0.24), Y(0.76));
  }
}

interface Painted { map: THREE.CanvasTexture; glow: THREE.CanvasTexture }

function paintLeaf(random: Rand, a: { letter: keyof typeof LETTERS; style: string; margin: string; progress: string; gold: number; script: number }, mood: { wear: number; cheer: number; warmth: number }): Painted {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d')!;
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = W / 2; glowCanvas.height = H / 2;
  const e = glowCanvas.getContext('2d')!;
  e.fillStyle = '#000';
  e.fillRect(0, 0, W, H);
  e.scale(0.5, 0.5);

  const bright = mix(0.82, 1.08, mood.cheer);
  const tone = (hex: string) => '#' + new THREE.Color(hex).multiplyScalar(bright).getHexString();
  const hasGold = a.gold > 0.12;
  const COL: Record<Pigment, string> = {
    gold: hasGold ? '#d9a92a' : '#c9a55a', blue: tone('#24459a'), red: tone('#b8281c'), green: tone('#2f7a4a'), rose: tone('#c9788a'), white: '#f4efe0',
  };
  const stage = a.progress === 'sketch' ? 0 : a.progress === 'half' ? 1 : 2;
  const laid: Record<Pigment, boolean> = { gold: stage >= 1, blue: stage >= 1, red: stage >= 2, green: stage >= 2, rose: stage >= 2, white: stage >= 2 };
  const SKETCH = 'rgba(104,70,42,0.95)';
  const INK = '#221a14';

  /** Fill a shape with a pigment if the painter has reached it, otherwise leave the drypoint outline. */
  const lay = (pigment: Pigment, path: (c: Ctx) => void, outline = true) => {
    g.beginPath();
    path(g);
    if (laid[pigment]) {
      g.fillStyle = COL[pigment];
      g.fill();
      e.beginPath();
      path(e);
      e.fillStyle = pigment === 'gold' && hasGold ? '#ffb23c' : '#000';
      e.fill();
      if (outline && stage >= 2) { g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke(); }
    } else { g.strokeStyle = SKETCH; g.lineWidth = 2.4; g.stroke(); }
  };
  const stroke = (pigment: Pigment, width: number, path: (c: Ctx) => void) => {
    g.lineCap = 'round'; g.lineJoin = 'round';
    path(g);
    if (laid[pigment]) {
      if (stage >= 2) { g.strokeStyle = INK; g.lineWidth = width + 4; g.stroke(); }
      g.strokeStyle = COL[pigment]; g.lineWidth = width; g.stroke();
      e.lineCap = 'round'; path(e); e.strokeStyle = pigment === 'gold' && hasGold ? '#ffb23c' : '#000'; e.lineWidth = width + (pigment === 'gold' ? 0 : 4); e.stroke();
    } else {
      g.strokeStyle = SKETCH; g.lineWidth = width; g.stroke();
      g.strokeStyle = '#e9dcba'; g.lineWidth = Math.max(0.5, width - 5); g.stroke();
    }
  };

  // ---- vellum ----
  g.fillStyle = '#ebdfbd';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(150,118,66,${0.025 + random() * 0.05 * (0.4 + mood.wear)})`;
    g.beginPath();
    g.ellipse(random() * W, random() * H, 20 + random() * 130, 16 + random() * 90, random() * 3, 0, 7);
    g.fill();
  }
  const edge = g.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 0.72);
  edge.addColorStop(0, 'rgba(120,90,40,0)');
  edge.addColorStop(1, `rgba(110,80,40,${0.22 + mood.wear * 0.25})`);
  g.fillStyle = edge;
  g.fillRect(0, 0, W, H);

  // ---- layout ----
  const L = 120, R = W - 130, T = 100, B = H - 230;
  const tall = a.letter === 'I';
  const box = tall ? { x: L, y: T, w: 150, h: 640 } : { x: L, y: T, w: 320, h: 320 };
  const pitch = 34;
  const lines = Math.floor((B - T) / pitch);
  const density = mix(0.55, 1, a.script);

  // Ruling: pricked and drawn in plummet, visible wherever the script has not covered it.
  g.strokeStyle = 'rgba(130,100,70,0.35)';
  g.lineWidth = 1;
  for (let i = 0; i <= lines; i++) { g.beginPath(); g.moveTo(L - 14, T + i * pitch + 23); g.lineTo(R + 14, T + i * pitch + 23); g.stroke(); }
  for (const x of [L - 6, L, R, R + 6]) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, H - 60); g.stroke(); }
  for (let i = 0; i <= lines; i++) { g.fillStyle = 'rgba(70,50,30,0.6)'; g.fillRect(W - 44, T + i * pitch + 14, 2, 2); }

  // ---- script ----
  const written = a.progress === 'sketch' ? Math.round(lines * mix(0.25, 0.5, random())) : a.progress === 'half' ? Math.round(lines * mix(0.55, 0.8, random())) : lines;
  let endX = L, endY = T;
  for (let i = 0; i < written; i++) {
    const y = T + i * pitch;
    const inBox = y < box.y + box.h + 6 && !(a.letter === 'P' && y > box.y + box.h * 0.75);
    let x = inBox || (a.letter === 'P' && y < box.y + box.h * 1.55) ? box.x + (a.letter === 'P' && !inBox ? box.w * 0.5 : box.w) + 16 : L;
    const rubric = i === 0 || (random() < 0.05 && i > 3);
    const last = i === written - 1 && written < lines;
    const stop = last ? x + (R - x) * mix(0.25, 0.8, random()) : R;
    if (!inBox && random() < 0.08 && stage >= 0) {
      // A two-line versal in alternating red and blue.
      g.fillStyle = i % 2 ? COL.red : COL.blue;
      g.fillRect(x, y + 2, 22, 22);
      g.fillStyle = '#ebdfbd';
      g.fillRect(x + 7, y + 8, 8, 10);
      x += 29;
    }
    while (x < stop - 4) {
      const word = Math.min((22 + random() * 62) * (rubric ? 1.2 : 1), stop - x);
      g.fillStyle = rubric ? '#a8281c' : INK;
      const step = mix(9.4, 6.6, density);
      for (let k = 0; k < word; k += step) {
        const r = random();
        g.fillRect(x + k, y + 6, 4, 17);
        if (r < 0.16) g.fillRect(x + k, y - 4, 4, 11);
        else if (r < 0.26) g.fillRect(x + k, y + 22, 4, 9);
        if (r > 0.5) g.fillRect(x + k, y + 6, step, 3.2);
        if (r > 0.75) g.fillRect(x + k, y + 19.8, step, 3.2);
      }
      x += word + 13;
    }
    if (!last && x < R - 2 && random() < 0.3) { g.fillStyle = COL.red; for (let k = x; k < R - 3; k += 12) g.fillRect(k, y + 13, 7, 3.5); }
    endX = Math.min(x, R); endY = y;
  }
  void endX; void endY;

  // ---- the initial ----
  const style = a.style;
  const field = (c: Ctx) => c.rect(box.x, box.y, box.w, box.h);
  const letterColour: Pigment = style === 'gothic' ? 'blue' : style === 'insular' ? 'green' : style === 'penwork' ? 'red' : 'gold';
  if (style === 'gothic') {
    lay('gold', field);
    lay('red', (c) => c.rect(box.x + 18, box.y + 18, box.w - 36, box.h - 36));
    if (laid.white) { g.fillStyle = COL.gold; for (let i = 0; i < 7; i++) for (let j = 0; j < (tall ? 18 : 7); j++) g.fillRect(box.x + 30 + i * ((box.w - 60) / 6) - 2, box.y + 30 + j * ((box.h - 60) / (tall ? 17 : 6)) - 2, 4, 4); }
  } else if (style === 'romanesque') {
    lay('green', field);
    lay('blue', (c) => c.rect(box.x + 14, box.y + 14, box.w - 28, box.h - 28));
    for (let i = 0; i < (tall ? 3 : 4); i++) {
      const cx = tall ? box.x + box.w / 2 : box.x + box.w * (0.3 + (i % 2) * 0.42), cy = tall ? box.y + box.h * (0.25 + i * 0.25) : box.y + box.h * (0.3 + Math.floor(i / 2) * 0.42);
      stroke('white', 8, (c) => { c.beginPath(); for (let t = 0; t < 9; t += 0.2) c.lineTo(cx + Math.cos(t) * t * 6, cy + Math.sin(t) * t * 6); });
      lay('red', (c) => c.arc(cx, cy, 7, 0, 7));
    }
  } else if (style === 'whitevine') {
    const patches: Pigment[] = ['blue', 'green', 'rose', 'blue', 'rose', 'green'];
    const cols = tall ? 1 : 2, rows = tall ? 6 : 3;
    patches.forEach((p, i) => lay(p, (c) => c.rect(box.x + (i % cols) * (box.w / cols), box.y + Math.floor(i / cols) * (box.h / rows), box.w / cols, box.h / rows), false));
    for (let i = 0; i < (tall ? 7 : 9); i++) {
      const cx = box.x + 30 + random() * (box.w - 60), cy = box.y + 30 + random() * (box.h - 60), turn = random() * 6;
      stroke('white', 8, (c) => { c.beginPath(); for (let t = 0; t < 7; t += 0.2) c.lineTo(cx + Math.cos(t + turn) * t * 7, cy + Math.sin(t + turn) * t * 7); });
    }
    g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(box.x, box.y, box.w, box.h);
  } else if (style === 'insular') {
    // No ground: the letter is ringed with rows of red dots and filled with knotwork.
    g.fillStyle = '#b8281c';
    for (let ring = 0; ring < 3; ring++)
      for (let t = 0; t < 1; t += 0.009) {
        const inset = -8 + ring * 12;
        const per = 2 * (box.w + box.h - 4 * inset);
        let d = t * per;
        const w2 = box.w - 2 * inset, h2 = box.h - 2 * inset;
        let px = box.x + inset, py = box.y + inset;
        if (d < w2) px += d; else if ((d -= w2) < h2) { px += w2; py += d; } else if ((d -= h2) < w2) { px += w2 - d; py += h2; } else py += h2 - (d - w2);
        g.beginPath(); g.arc(px, py, 2.8, 0, 7); g.fill();
      }
    for (let i = 0; i < (tall ? 4 : 5); i++) {
      const cx = box.x + box.w * (tall ? 0.5 : 0.55 + (random() - 0.5) * 0.3), cy = box.y + box.h * (0.2 + i * 0.16);
      stroke(i % 2 ? 'gold' : 'rose', 7, (c) => { c.beginPath(); for (let t = 0; t < 12; t += 0.2) c.lineTo(cx + Math.cos(t) * t * 4, cy + Math.sin(t) * t * 4); });
    }
  }
  const weight = tall ? 56 : style === 'penwork' ? 40 : 52;
  stroke(letterColour, weight, (c) => letterPath(c, a.letter, box.x, box.y, box.w, box.h));
  if (laid.white || stage < 2) {
    // The highlight line that makes painted letters look modelled.
    g.save();
    letterPath(g, a.letter, box.x, box.y, box.w, box.h);
    g.strokeStyle = stage >= 2 ? (style === 'insular' ? COL.gold : COL.white) : SKETCH;
    g.lineWidth = stage >= 2 ? 4 : 1.5;
    g.setLineDash(style === 'insular' ? [6, 7] : [16, 9]);
    g.stroke();
    g.restore();
  }
  if (style === 'penwork') {
    // Filigree: hairline loops in the opposite colour spinning out into the margin.
    g.strokeStyle = laid.blue ? COL.blue : SKETCH;
    g.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) {
      const ax = box.x + random() * box.w * 0.5, ay = box.y + random() * box.h;
      g.beginPath();
      g.moveTo(ax, ay);
      g.bezierCurveTo(ax - 40 - random() * 50, ay + (random() - 0.5) * 80, ax - 70 - random() * 40, ay + 60 + random() * 160, ax - 30 - random() * 70, ay + 120 + random() * 260);
      g.stroke();
      g.beginPath(); g.arc(ax - 20 - random() * 60, ay + (random() - 0.5) * 60, 4 + random() * 5, 0, 7); g.stroke();
    }
  }
  if (!tall && a.letter !== 'S' && a.letter !== 'I' && (style === 'gothic' || style === 'romanesque')) {
    // A small figure in the bowl: robe, face and a gold halo.
    const cx = box.x + box.w * (a.letter === 'O' ? 0.5 : 0.56), cy = box.y + box.h * (a.letter === 'P' ? 0.38 : a.letter === 'B' ? 0.7 : 0.52), k = a.letter === 'B' || a.letter === 'P' ? 0.8 : 1.35;
    lay(style === 'gothic' ? 'blue' : 'red', (c) => { c.moveTo(cx - 30 * k, cy + 62 * k); c.quadraticCurveTo(cx - 26 * k, cy - 6 * k, cx, cy - 10 * k); c.quadraticCurveTo(cx + 26 * k, cy - 6 * k, cx + 30 * k, cy + 62 * k); c.closePath(); });
    lay('gold', (c) => c.arc(cx, cy - 26 * k, 23 * k, 0, 7));
    lay('white', (c) => c.arc(cx, cy - 26 * k, 14 * k, 0, 7));
    if (stage >= 2) { g.fillStyle = INK; g.fillRect(cx - 7 * k, cy - 29 * k, 3, 3); g.fillRect(cx + 4 * k, cy - 29 * k, 3, 3); g.fillRect(cx - 4 * k, cy - 19 * k, 8 * k, 1.6); }
  }

  // ---- borders and margins ----
  const leaf = (x: number, y: number, angle: number, size: number, pigment: Pigment) =>
    lay(pigment, (c) => {
      const cs = Math.cos(angle), sn = Math.sin(angle);
      const at = (u: number, v: number) => [x + (u * cs - v * sn) * size, y + (u * sn + v * cs) * size] as const;
      c.moveTo(...at(0, 0));
      c.quadraticCurveTo(...at(0.5, -0.9), ...at(1.3, -0.25));
      c.lineTo(...at(1.0, 0)); c.lineTo(...at(1.3, 0.25));
      c.quadraticCurveTo(...at(0.5, 0.9), ...at(0, 0));
    });
  const vine = (points: [number, number][], rich: boolean) => {
    stroke(rich ? 'gold' : 'blue', rich ? 10 : 7, (c) => { c.beginPath(); c.moveTo(...points[0]); for (let i = 1; i < points.length; i++) { const [px, py] = points[i - 1], [qx, qy] = points[i]; c.quadraticCurveTo(px + (qx - px) * 0.5 + (i % 2 ? 22 : -22), py + (qy - py) * 0.5 + (i % 2 ? -14 : 14), qx, qy); } });
    const kinds: Pigment[] = ['red', 'blue', 'gold', 'green', 'rose'];
    for (let i = 1; i < points.length; i++) {
      const [px, py] = points[i - 1], [qx, qy] = points[i];
      const n = Math.max(1, Math.round(Math.hypot(qx - px, qy - py) / 70));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n, x = px + (qx - px) * t, y = py + (qy - py) * t;
        const base = Math.atan2(qy - py, qx - px) + (k % 2 ? 1.2 : -1.2) + (random() - 0.5) * 0.5;
        leaf(x, y, base, 24 + random() * 12, kinds[Math.floor(random() * kinds.length)]);
        if (random() < 0.6) lay('gold', (c) => c.arc(x - Math.cos(base) * 24, y - Math.sin(base) * 24, 8, 0, 7));
      }
    }
  };
  const snail = (x: number, y: number, k: number) => {
    lay('rose', (c) => { c.moveTo(x - 46 * k, y); c.quadraticCurveTo(x - 20 * k, y - 16 * k, x + 34 * k, y - 6 * k); c.quadraticCurveTo(x + 52 * k, y - 22 * k, x + 50 * k, y - 34 * k); c.lineTo(x + 58 * k, y - 30 * k); c.quadraticCurveTo(x + 60 * k, y, x + 30 * k, y + 4 * k); c.closePath(); });
    lay('gold', (c) => c.arc(x - 6 * k, y - 22 * k, 26 * k, 0, 7));
    stroke('red', 3, (c) => { c.beginPath(); for (let t = 0; t < 11; t += 0.3) c.lineTo(x - 6 * k + Math.cos(t) * t * 2.1 * k, y - 22 * k + Math.sin(t) * t * 2.1 * k); });
  };
  const rabbit = (x: number, y: number, k: number) => {
    lay('white', (c) => c.ellipse(x, y - 20 * k, 30 * k, 20 * k, -0.2, 0, 7));
    lay('white', (c) => c.arc(x + 28 * k, y - 40 * k, 13 * k, 0, 7));
    lay('white', (c) => c.ellipse(x + 24 * k, y - 66 * k, 5 * k, 18 * k, -0.15, 0, 7));
    lay('white', (c) => c.ellipse(x + 35 * k, y - 64 * k, 5 * k, 18 * k, 0.25, 0, 7));
    lay('white', (c) => c.arc(x - 30 * k, y - 22 * k, 7 * k, 0, 7));
    lay('white', (c) => c.ellipse(x - 12 * k, y - 3 * k, 18 * k, 6 * k, 0, 0, 7));
    if (stage >= 2) { g.fillStyle = INK; g.beginPath(); g.arc(x + 32 * k, y - 42 * k, 2.2 * k, 0, 7); g.fill(); }
    // It carries a lance: marginal rabbits are usually up to something.
    g.strokeStyle = stage >= 2 ? INK : SKETCH; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x - 20 * k, y - 4 * k); g.lineTo(x + 86 * k, y - 62 * k); g.stroke();
  };
  const dragon = (x: number, y: number, k: number, down = false) => {
    const body = (c: Ctx) => { c.beginPath(); for (let t = 0; t <= 1.001; t += 0.05) { const px = down ? x + Math.sin(t * 9) * 26 * k : x + t * 210 * k, py = down ? y + t * 330 * k : y - Math.sin(t * 9) * 20 * k - t * 10 * k; c.lineTo(px, py); } };
    stroke('green', 15 * k, body);
    const hx = down ? x + Math.sin(9) * 26 * k : x + 210 * k, hy = down ? y + 330 * k : y - Math.sin(9) * 20 * k - 10 * k;
    lay('green', (c) => c.ellipse(hx, hy, 17 * k, 12 * k, down ? 1.2 : -0.3, 0, 7));
    lay('red', (c) => { c.moveTo(hx + 10 * k, hy + 4 * k); c.lineTo(hx + 44 * k, hy + (down ? 26 : -12) * k); c.lineTo(hx + 14 * k, hy + 12 * k); c.closePath(); });
    const wx = down ? x : x + 70 * k, wy = down ? y + 90 * k : y - 10 * k;
    lay('red', (c) => { c.moveTo(wx, wy); c.lineTo(wx + (down ? 80 : 20) * k, wy - 58 * k); c.lineTo(wx + (down ? 62 : 44) * k, wy - 30 * k); c.lineTo(wx + (down ? 96 : 66) * k, wy - 40 * k); c.lineTo(wx + (down ? 60 : 62) * k, wy - 8 * k); c.closePath(); });
  };
  const bird = (x: number, y: number, k: number, pigment: Pigment) => {
    lay(pigment, (c) => c.ellipse(x, y - 16 * k, 20 * k, 12 * k, -0.35, 0, 7));
    lay(pigment, (c) => c.arc(x + 18 * k, y - 30 * k, 9 * k, 0, 7));
    lay('gold', (c) => { c.moveTo(x + 26 * k, y - 32 * k); c.lineTo(x + 40 * k, y - 28 * k); c.lineTo(x + 26 * k, y - 26 * k); c.closePath(); });
    lay(pigment, (c) => { c.moveTo(x - 16 * k, y - 12 * k); c.lineTo(x - 46 * k, y + 2 * k); c.lineTo(x - 40 * k, y - 12 * k); c.closePath(); });
    g.strokeStyle = stage >= 2 ? INK : SKETCH; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - 2 * k, y - 5 * k); g.lineTo(x - 2 * k, y + 6 * k); g.moveTo(x + 6 * k, y - 5 * k); g.lineTo(x + 6 * k, y + 6 * k); g.stroke();
  };
  const rich = a.gold > 0.55;
  const baseY = B + 76;
  if (a.margin !== 'none') {
    vine([[box.x - 18, box.y + (tall ? 20 : box.h)], [L - 44, T + 380], [L - 58, T + 560], [L - 40, B + 10], [L + 40, baseY], [W / 2, baseY + 16], [R - 40, baseY - 6]], rich);
    vine([[box.x + 10, box.y - 14], [W / 2, T - 54], [R + 10, T - 40]], rich);
    if (a.margin === 'vines' || rich) vine([[R + 10, T - 40], [R + 56, T + 200], [R + 44, T + 480], [R + 64, B - 60], [R - 40, baseY - 6]], rich);
  }
  if (a.margin === 'beasts') { rabbit(L + 120, baseY + 120, 1.5); snail(R - 130, baseY + 118, 1.5); }
  else if (a.margin === 'monsters') { dragon(R + 70, T + 150, 1.3, true); dragon(L + 40, baseY + 100, 1.7); }
  else if (a.margin === 'birds') { bird(L + 150, baseY + 14, 2, 'blue'); bird(R - 110, baseY + 2, 1.8, 'red'); bird(W / 2 + 40, T - 52, 1.3, 'rose'); bird(R + 66, T + 330, 1.5, 'green'); }

  // ---- what time and people did to it ----
  g.globalCompositeOperation = 'source-over';
  if (a.progress === 'defaced') {
    // Scraped faces and furious knife scores across the picture.
    g.strokeStyle = 'rgba(236,224,192,0.92)';
    g.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      g.lineWidth = 2 + random() * 7;
      const x = box.x + random() * box.w, y = box.y + random() * box.h, angle = -0.9 + random() * 0.6, len = 30 + random() * 90;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len); g.stroke();
    }
    g.strokeStyle = 'rgba(20,14,10,0.9)';
    g.lineWidth = 10;
    g.beginPath(); g.moveTo(L - 50, T + 60 + random() * 200); g.lineTo(R + 60, B - random() * 200);
    g.moveTo(R + 40, T + 80 + random() * 200); g.lineTo(L - 20, B + 60 - random() * 160); g.stroke();
    for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(16,12,10,0.92)'; g.beginPath(); g.ellipse(L + random() * (R - L), T + random() * (B - T), 20 + random() * 50, 12 + random() * 30, random() * 3, 0, 7); g.fill(); }
  }
  for (let i = 0; i < Math.floor(mood.wear * 7); i++) {
    const x = random() * W, y = random() * H, r = 40 + random() * 130;
    g.strokeStyle = 'rgba(110,80,40,0.4)'; g.lineWidth = 3;
    g.fillStyle = 'rgba(140,108,60,0.16)';
    g.beginPath(); g.ellipse(x, y, r, r * (0.5 + random() * 0.6), random() * 3, 0, 7); g.fill(); g.stroke();
  }
  // Alpha: holes, tears and a missing corner.
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  if (a.progress === 'excised') {
    // Someone has cut the initial out with a knife, overshooting at the corners.
    g.fillRect(box.x - 10, box.y - 12, box.w + 24, box.h + 22);
    g.fillRect(box.x - 10, box.y + box.h + 8, box.w + 60, 3);
    g.fillRect(box.x + box.w + 12, box.y - 40, 3, box.h + 50);
  }
  if (mood.wear > 0.45 || a.progress === 'defaced') {
    const corner = 60 + mood.wear * 170;
    g.beginPath(); g.moveTo(W, H); g.lineTo(W - corner, H);
    for (let t = 0; t <= 1; t += 0.1) g.lineTo(W - corner * (1 - t) + (random() - 0.5) * 22, H - corner * 1.2 * t + (random() - 0.5) * 22);
    g.lineTo(W, H - corner * 1.2); g.fill();
    for (let i = 0; i < Math.floor(mood.wear * 9); i++) { g.beginPath(); g.arc(random() * W, random() * H, 3 + random() * 5, 0, 7); g.fill(); }
  }
  g.globalCompositeOperation = 'source-over';

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const glow = new THREE.CanvasTexture(glowCanvas);
  glow.colorSpace = THREE.SRGBColorSpace;
  return { map, glow };
}

export default defineThing({
  questions: {
    letter: choice('Which great initial opens the page?', LETTERS),
    style: choice('In what manner is it illuminated?', {
      gothic: 'High Gothic: a blue letter on burnished gold with a red diapered field and a small haloed figure.',
      romanesque: 'Romanesque: a heavy gold letter on blocks of green and blue, with thick white spirals.',
      insular: 'Insular, like Kells: no gold ground, the letter ringed in red dots and packed with spirals.',
      whitevine: 'Italian white-vine: a gold letter tangled in pale vine curls over patches of blue, green and rose.',
      penwork: 'Plain penwork: a red letter with hairline blue flourishes running down the margin, no pictures at all.',
    }),
    margin: choice('What lives in the margins?', {
      none: 'Nothing: clean wide margins.',
      vines: 'A full ivy-leaf border on every side, with gold dots.',
      beasts: 'A rabbit with a lance and a giant snail in the lower margin.',
      monsters: 'Dragons: one coiling down the outer margin, one prowling under the text.',
      birds: 'Small bright birds perched along the vine.',
    }),
    progress: choice('How far along is the page, or what was done to it?', {
      finished: 'Finished, burnished, perfect.',
      half: 'Half painted: script done, gold laid and blue filled, everything else still bare outline.',
      sketch: 'Barely begun: a few lines of script and the whole design only as faint drawing.',
      defaced: 'Defaced: the picture scraped and scored, ink thrown, a corner torn away.',
      excised: 'Robbed: the great initial has been cut clean out, leaving a window.',
    }),
    gold: score('How much gold is on it?', ['None: yellow ochre stands in for gold', 'Gold on the initial only', 'Gold everywhere, vines and all, blazing']),
    script: score('How tightly is the script packed?', ['Open and airy', 'Regular book hand', 'Cramped and black']),
    support: choice('How is the leaf displayed?', {
      easel: 'Pinned to a small oak easel board with a back strut and a ledge.',
      wedge: 'Leaning on a solid sloped block, like a desk in miniature.',
      line: 'Hanging by pegs from a cord between two posts, drying.',
      mount: 'In a plain modern museum mount on a slim metal stand.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const painted = paintLeaf(random, a, mood);
    const PW = 0.36, PH = PW * (H / W);
    const oakTone = new THREE.Color('#8a6639').lerp(new THREE.Color('#4a3625'), mood.wear * 0.7);
    const oak = (shift = 0) => s.material(oakTone.clone().offsetHSL(0, 0, shift), { roughness: 0.8 });

    const glowing = a.progress !== 'sketch' && a.gold > 0.12;
    const vellum = new THREE.MeshStandardMaterial({
      map: painted.map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.82,
      emissive: glowing ? '#ffffff' : '#000000', emissiveMap: glowing ? painted.glow : null, emissiveIntensity: mix(0.04, 0.13, a.gold),
    });
    const page = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH, 16, 20), vellum);
    const p = page.geometry.attributes.position;
    const cockle = mix(0.0015, 0.007, mood.wear) * (a.support === 'line' ? 1.8 : 1);
    const phase = random() * 6;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      p.setZ(i, (0.5 + 0.5 * Math.sin(x * 26 + phase) * Math.sin(y * 17 + phase * 2)) * cockle * 2 + (x > PW * 0.3 && y < -PH * 0.3 ? (x - PW * 0.3) * (-y - PH * 0.3) * 1.6 : 0));
    }
    page.geometry.computeVertexNormals();
    page.castShadow = page.receiveShadow = true;

    const lean = new Sculpture(context);
    s.root.add(lean.root);
    const pin = s.material('#b8892c', { metalness: 0.7, roughness: 0.35 });

    if (a.support === 'easel') {
      const tilt = -0.26;
      const BW = PW + 0.08, BH = PH + 0.09;
      lean.root.rotation.x = tilt;
      lean.root.position.y = 0.035;
      lean.box([BW, BH, 0.018], [0, BH / 2 + 0.02, 0], oak(0.03));
      lean.box([BW + 0.03, 0.03, 0.055], [0, 0.012, 0.03], oak(-0.04));
      for (const side of [-1, 1]) lean.box([0.03, 0.05, 0.02], [side * (BW / 2 - 0.04), BH + 0.03, 0], oak(-0.03));
      page.position.set(0, 0.028 + PH / 2 + 0.01, 0.014);
      lean.root.add(page);
      for (const [x, y] of [[-1, 1], [1, 1], [0, 1]] as const) lean.cylinder(0.005, 0.005, 0.012, [x * (PW / 2 - 0.012), 0.038 + (y + 1) * (PH / 2 - 0.012), 0.018], pin, 8).rotation.x = Math.PI / 2;
      // Back strut and feet.
      s.rod([0, 0.035 + BH * 0.72 * Math.cos(tilt), -BH * 0.72 * Math.sin(-tilt) * 1 - 0.0], [0, 0.01, -0.26], 0.012, oak(-0.03));
      s.box([BW * 0.7, 0.02, 0.03], [0, 0.01, -0.26], oak(-0.05));
      s.box([BW + 0.03, 0.035, 0.07], [0, 0.0175, 0.015], oak(-0.05));
    } else if (a.support === 'wedge') {
      const tilt = -0.72;
      const BW = PW + 0.09, BL = PH + 0.07;
      const rise = Math.cos(tilt) * BL, run = Math.sin(-tilt) * BL;
      const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, 0.05), new THREE.Vector2(-run, rise + 0.05), new THREE.Vector2(-run - 0.03, rise + 0.05), new THREE.Vector2(-run - 0.03, 0)]);
      const block = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: BW, bevelEnabled: false }), oak(0.02));
      block.rotation.y = -Math.PI / 2;
      block.position.set(BW / 2, 0, run / 2);
      lean.root.rotation.x = tilt;
      lean.root.position.set(0, 0.052, run / 2);
      lean.box([BW, 0.03, 0.035], [0, 0.012, 0.018], oak(-0.05));
      page.position.set(0, 0.03 + PH / 2, 0.006);
      lean.root.add(page);
      for (const side of [-1, 1]) {
        // Weighted cords over the leaf.
        lean.rod([-BW / 2 - 0.004, 0.03 + PH * (side > 0 ? 0.86 : 0.2), 0.009], [BW / 2 + 0.004, 0.03 + PH * (side > 0 ? 0.86 : 0.2), 0.009], 0.0022, s.material('#cdbf9a'));
        for (const end of [-1, 1]) s.ball([0.011, 0.018, 0.011], [end * (BW / 2 + 0.012), 0.052 + Math.cos(tilt) * (0.03 + PH * (side > 0 ? 0.86 : 0.2)) - 0.045, run / 2 - Math.sin(-tilt) * (0.03 + PH * (side > 0 ? 0.86 : 0.2))], s.material('#6f7377', { metalness: 0.4 }), 8);
      }
    } else if (a.support === 'line') {
      const top = PH + 0.16;
      for (const side of [-1, 1]) {
        s.rod([side * (PW / 2 + 0.11), 0.03, 0], [side * (PW / 2 + 0.11), top + 0.05, 0], 0.012, oak());
        s.box([0.1, 0.03, 0.16], [side * (PW / 2 + 0.11), 0.015, 0], oak(-0.05));
        s.ball([0.018, 0.018, 0.018], [side * (PW / 2 + 0.11), top + 0.06, 0], oak(-0.04), 10);
      }
      s.tube([[-(PW / 2 + 0.11), top + 0.02, 0], [0, top - 0.012, 0], [PW / 2 + 0.11, top + 0.02, 0]], 0.003, s.material('#cdbf9a'));
      page.position.set(0, top - 0.035 - PH / 2, 0);
      page.rotation.set((random() - 0.5) * 0.1, (random() - 0.5) * 0.3, (random() - 0.5) * 0.05);
      s.root.add(page);
      for (const side of [-1, 1]) s.box([0.012, 0.05, 0.016], [side * PW * 0.32, top - 0.035, 0], oak(0.08));
    } else {
      const tilt = -0.14;
      const MW = PW + 0.13, MH = PH + 0.15;
      lean.root.rotation.x = tilt;
      lean.root.position.y = 0.42;
      const card = s.material('#f1eee6', { roughness: 0.95 });
      lean.box([MW, MH, 0.012], [0, MH / 2, 0], card);
      lean.box([MW + 0.02, MH + 0.02, 0.01], [0, MH / 2, -0.011], s.material('#2c2e31', { metalness: 0.5, roughness: 0.4 }));
      page.position.set(0, MH / 2, 0.009);
      lean.root.add(page);
      const steel = s.material('#3a3d41', { metalness: 0.6, roughness: 0.35 });
      s.rod([0, 0, -0.04], [0, 0.44 + MH * 0.4, -0.04 - MH * 0.4 * Math.sin(-tilt) - 0.012], 0.012, steel);
      s.cylinder(0.15, 0.16, 0.014, [0, 0.007, -0.04], steel, 28);
      const caption = s.label(a.progress === 'excised' ? 'LEAF, INITIAL REMOVED' : a.progress === 'defaced' ? 'LEAF, DEFACED' : 'LEAF FROM A PSALTER', 0.15, 0.03, [0, 0.38, 0.02], '#2a2c2e', '#f1eee6');
      caption.rotation.x = tilt;
    }

    // The illuminator's things at the foot, when the scene is busy.
    if (a.support !== 'mount') {
      const clutter = Math.floor(mood.density * 4.5);
      const colours = ['#24459a', '#b8281c', '#d9a92a', '#2f7a4a'];
      for (let i = 0; i < clutter; i++) {
        const x = -0.19 + i * 0.1 + random() * 0.03, z = 0.13 + random() * 0.05;
        const shell = s.ball([0.03, 0.009, 0.022], [x, 0.008, z], s.material('#e6e0d2', { roughness: 0.3 }), 12);
        shell.rotation.y = random() * 3;
        s.ball([0.02, 0.005, 0.014], [x, 0.014, z], s.material(colours[i % 4], { roughness: 0.5 }), 10).rotation.y = shell.rotation.y;
      }
      if (a.progress === 'half' || a.progress === 'sketch' || clutter > 1) {
        const bx = 0.12, bz = 0.2;
        s.rod([bx - 0.1, 0.006, bz], [bx + 0.08, 0.006, bz + 0.03], 0.004, oak(0.1), 0.003);
        s.rod([bx + 0.08, 0.006, bz + 0.03], [bx + 0.115, 0.006, bz + 0.036], 0.004, s.material('#24459a'), 0.001);
      }
      if (a.progress === 'excised') {
        // The knife left where it was used.
        s.box([0.09, 0.012, 0.016], [-0.1, 0.006, 0.19], s.material('#3a281b')).rotation.y = 0.5;
        s.box([0.07, 0.003, 0.012], [-0.033, 0.005, 0.153], s.material('#c3c7cb', { metalness: 0.85, roughness: 0.25 })).rotation.y = 0.5;
      }
    }

    return s.finish();
  },
});
