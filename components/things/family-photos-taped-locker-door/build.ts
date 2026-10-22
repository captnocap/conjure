import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type G = CanvasRenderingContext2D;
type R = () => number;
type XY = [number, number];

function paint(width: number, height: number, draw: (g: G, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// ---------------------------------------------------------------- crayon, a child's hand
function crayon(g: G, pts: readonly XY[], colour: string, width: number, r: R, closed = false) {
  g.strokeStyle = colour; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let pass = 0; pass < 3; pass++) {
    g.globalAlpha = 0.5 + r() * 0.3;
    g.lineWidth = width * (0.55 + r() * 0.5);
    g.beginPath();
    pts.forEach(([x, y], i) => {
      const jx = x + (r() - 0.5) * width * 0.9, jy = y + (r() - 0.5) * width * 0.9;
      if (i) g.lineTo(jx, jy); else g.moveTo(jx, jy);
    });
    if (closed) g.closePath();
    g.stroke();
  }
  g.globalAlpha = 1;
}
const loop = (cx: number, cy: number, rx: number, ry: number, n = 14): XY[] =>
  Array.from({ length: n + 1 }, (_u, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry]);
function scribbleFill(g: G, x: number, y: number, w: number, h: number, colour: string, r: R, step = 5) {
  const pts: XY[] = [];
  for (let yy = y; yy < y + h; yy += step) pts.push([x + r() * 4, yy], [x + w - r() * 4, yy + step / 2]);
  crayon(g, pts, colour, step * 0.9, r);
}
function crayonText(g: G, text: string, cx: number, y: number, size: number, colours: readonly string[], r: R) {
  g.font = `bold ${size}px sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const step = size * 0.78;
  let x = cx - ((text.length - 1) * step) / 2;
  for (const [i, ch] of [...text].entries()) {
    g.save();
    g.translate(x, y + (r() - 0.5) * size * 0.25);
    g.rotate((r() - 0.5) * 0.35);
    g.fillStyle = colours[i % colours.length];
    g.globalAlpha = 0.85;
    g.fillText(ch, 0, 0);
    g.restore();
    x += step;
  }
  g.globalAlpha = 1;
}
function stickPerson(g: G, x: number, feet: number, h: number, colour: string, r: R, dress = false) {
  const head = h * 0.16;
  crayon(g, loop(x, feet - h + head, head, head, 10), '#5a3a22', 2.5, r, true);
  if (dress) crayon(g, [[x, feet - h + head * 2], [x - h * 0.2, feet - h * 0.3], [x + h * 0.2, feet - h * 0.3], [x, feet - h + head * 2]], colour, 3, r);
  else crayon(g, [[x, feet - h + head * 2], [x, feet - h * 0.35]], colour, 4, r);
  crayon(g, [[x - h * 0.12, feet], [x, feet - h * 0.35], [x + h * 0.12, feet]], '#2f4f8a', 3, r);
  crayon(g, [[x - h * 0.3, feet - h * 0.55], [x, feet - h * 0.65], [x + h * 0.3, feet - h * 0.55]], colour, 3, r);
}
function heart(g: G, x: number, y: number, s: number, colour: string, r: R) {
  crayon(g, [[x, y + s], [x - s, y], [x - s * 0.9, y - s * 0.6], [x - s * 0.4, y - s * 0.7], [x, y - s * 0.2], [x + s * 0.4, y - s * 0.7], [x + s * 0.9, y - s * 0.6], [x + s, y], [x, y + s]], colour, 3, r);
}

const DRAWINGS = {
  family: 'The whole family holding hands under a big yellow sun, MY FAMILY across the top.',
  rocket: 'A red rocket flying to the moon past yellow stars, a little person in the window, COME HOME SOON.',
  house: 'A house with smoke from the chimney, a tree and a sun, HOME written wobbly.',
  pet: 'A big brown dog with a wagging tail and its name in capitals.',
  rainbow: 'A rainbow over clouds with hearts and I LOVE YOU.',
  scribble: 'A toddler\'s scribble: wild loops of every colour, signed with a handprint.',
} as const;

function paintDrawing(g: G, w: number, h: number, subject: keyof typeof DRAWINGS, r: R, bright: number) {
  g.fillStyle = '#f7f4ea'; g.fillRect(0, 0, w, h);
  const sun = () => { crayon(g, loop(w * 0.13, h * 0.18, h * 0.09, h * 0.09), '#f2c21a', 5, r, true); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; crayon(g, [[w * 0.13 + Math.cos(a) * h * 0.12, h * 0.18 + Math.sin(a) * h * 0.12], [w * 0.13 + Math.cos(a) * h * 0.18, h * 0.18 + Math.sin(a) * h * 0.18]], '#f2a01a', 3, r); } };
  const grass = () => { const pts: XY[] = []; for (let x = 0; x <= w; x += 8) pts.push([x, h * 0.9 - (x / 8 % 2) * 7]); crayon(g, pts, '#3fa34a', 4, r); scribbleFill(g, 0, h * 0.9, w, h * 0.1, '#5bbf5a', r, 6); };
  if (subject === 'family') {
    sun(); grass();
    const n = 3 + Math.floor(r() * 3);
    const colours = ['#d8262c', '#2f6fd8', '#8a3fc2', '#f07a1a', '#2e8a4a'];
    for (let i = 0; i < n; i++) stickPerson(g, w * (0.3 + (i / Math.max(1, n - 1)) * 0.55), h * 0.88, h * (i < 2 ? 0.55 : 0.36), colours[i % colours.length], r, i % 2 === 1);
    crayonText(g, 'MY FAMILY', w * 0.6, h * 0.14, h * 0.13, ['#d8262c', '#2f6fd8', '#2e8a4a'], r);
  }
  if (subject === 'rocket') {
    for (let i = 0; i < 9; i++) { const x = r() * w, y = r() * h * 0.75; crayon(g, [[x - 5, y], [x + 5, y]], '#f2c21a', 2.5, r); crayon(g, [[x, y - 5], [x, y + 5]], '#f2c21a', 2.5, r); }
    crayon(g, loop(w * 0.82, h * 0.25, h * 0.13, h * 0.13), '#9a9aa0', 4, r, true);
    scribbleFill(g, w * 0.73, h * 0.15, h * 0.17, h * 0.2, '#c8c8c8', r, 5);
    const rx = w * 0.38, ry = h * 0.52;
    g.save(); g.translate(rx, ry); g.rotate(-0.6);
    crayon(g, [[-18, 30], [-18, -20], [0, -46], [18, -20], [18, 30], [-18, 30]], '#d8262c', 4, r);
    scribbleFill(g, -16, -18, 32, 46, '#e8483c', r, 6);
    crayon(g, loop(0, -6, 8, 8), '#2f6fd8', 3, r, true);
    crayon(g, [[-18, 30], [-30, 42], [-18, 14]], '#d8262c', 3, r);
    crayon(g, [[18, 30], [30, 42], [18, 14]], '#d8262c', 3, r);
    crayon(g, [[-10, 34], [0, 64], [10, 34]], '#f07a1a', 5, r);
    g.restore();
    crayonText(g, 'COME HOME SOON', w * 0.5, h * 0.88, h * 0.1, ['#2f6fd8', '#d8262c'], r);
  }
  if (subject === 'house') {
    sun(); grass();
    const x0 = w * 0.38, y0 = h * 0.45, hw = w * 0.32, hh = h * 0.42;
    crayon(g, [[x0, y0], [x0 + hw, y0], [x0 + hw, y0 + hh], [x0, y0 + hh], [x0, y0]], '#c0392b', 4, r);
    crayon(g, [[x0 - 8, y0], [x0 + hw / 2, y0 - h * 0.22], [x0 + hw + 8, y0]], '#6b3a1a', 4, r);
    crayon(g, [[x0 + hw * 0.4, y0 + hh], [x0 + hw * 0.4, y0 + hh * 0.5], [x0 + hw * 0.6, y0 + hh * 0.5], [x0 + hw * 0.6, y0 + hh]], '#2f4f8a', 3, r);
    scribbleFill(g, x0 + hw * 0.1, y0 + hh * 0.15, hw * 0.2, hh * 0.22, '#f2c21a', r, 4);
    scribbleFill(g, x0 + hw * 0.7, y0 + hh * 0.15, hw * 0.2, hh * 0.22, '#f2c21a', r, 4);
    const smoke: XY[] = []; for (let i = 0; i < 20; i++) smoke.push([x0 + hw * 0.8 + Math.sin(i * 0.9) * 8 + i * 1.5, y0 - h * 0.15 - i * 3]);
    crayon(g, smoke, '#8a8a90', 2.5, r);
    crayon(g, [[w * 0.2, h * 0.88], [w * 0.2, h * 0.55]], '#6b3a1a', 6, r);
    crayon(g, loop(w * 0.2, h * 0.48, w * 0.08, h * 0.12), '#2e8a4a', 5, r, true);
    scribbleFill(g, w * 0.13, h * 0.38, w * 0.14, h * 0.2, '#3fa34a', r, 5);
    crayonText(g, 'HOME', w * 0.7, h * 0.14, h * 0.15, ['#8a3fc2', '#d8262c'], r);
  }
  if (subject === 'pet') {
    grass();
    const bx = w * 0.5, by = h * 0.6;
    crayon(g, loop(bx, by, w * 0.22, h * 0.16), '#8a5a2a', 5, r, true);
    scribbleFill(g, bx - w * 0.18, by - h * 0.1, w * 0.36, h * 0.2, '#b07a3a', r, 6);
    crayon(g, loop(bx + w * 0.24, by - h * 0.2, h * 0.12, h * 0.11), '#8a5a2a', 5, r, true);
    crayon(g, [[bx + w * 0.2, by - h * 0.28], [bx + w * 0.17, by - h * 0.12]], '#5a3a1a', 6, r);
    for (const dx of [-0.15, -0.06, 0.07, 0.15]) crayon(g, [[bx + w * dx, by + h * 0.1], [bx + w * dx, by + h * 0.28]], '#8a5a2a', 5, r);
    crayon(g, [[bx - w * 0.22, by - h * 0.05], [bx - w * 0.32, by - h * 0.22], [bx - w * 0.3, by - h * 0.28]], '#8a5a2a', 4, r);
    crayon(g, [[bx + w * 0.3, by - h * 0.2], [bx + w * 0.31, by - h * 0.2]], '#1d1d1f', 4, r);
    crayonText(g, ['MAX', 'BISCUIT', 'LUNA', 'BUDDY', 'PEPPER'][Math.floor(r() * 5)], w * 0.5, h * 0.14, h * 0.15, ['#2f6fd8', '#d8262c', '#2e8a4a'], r);
  }
  if (subject === 'rainbow') {
    const cols = ['#d8262c', '#f07a1a', '#f2c21a', '#3fa34a', '#2f6fd8', '#8a3fc2'];
    cols.forEach((c, i) => { const pts: XY[] = []; for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.15) pts.push([w * 0.5 + Math.cos(a) * (w * 0.38 - i * 7), h * 0.78 + Math.sin(a) * (h * 0.55 - i * 7)]); crayon(g, pts, c, 6, r); });
    for (const cx of [w * 0.14, w * 0.86]) { crayon(g, loop(cx, h * 0.8, w * 0.1, h * 0.08), '#7aa6c8', 4, r, true); }
    crayonText(g, 'I LOVE YOU', w * 0.5, h * 0.9, h * 0.11, ['#d8262c', '#8a3fc2'], r);
  }
  if (subject === 'scribble') {
    const cols = ['#d8262c', '#2f6fd8', '#f2c21a', '#3fa34a', '#8a3fc2'];
    for (let k = 0; k < 5; k++) {
      const pts: XY[] = []; let x = r() * w, y = r() * h;
      for (let i = 0; i < 18; i++) { x = Math.min(w - 6, Math.max(6, x + (r() - 0.5) * w * 0.4)); y = Math.min(h - 6, Math.max(6, y + (r() - 0.5) * h * 0.4)); pts.push([x, y]); }
      crayon(g, pts, cols[k], 4, r);
    }
    g.fillStyle = 'rgba(47,111,216,0.55)';
    const hx = w * 0.78, hy = h * 0.72;
    g.beginPath(); g.ellipse(hx, hy, 13, 16, 0, 0, 7); g.fill();
    for (let f = 0; f < 5; f++) { g.beginPath(); g.ellipse(hx - 14 + f * 7, hy - 20 - (f % 4 ? 4 : 0), 3.5, 9, (f - 2) * 0.2, 0, 7); g.fill(); }
  }
  for (let i = 0; i < Math.round(bright * 3); i++) heart(g, w * (0.1 + r() * 0.8), h * (0.25 + r() * 0.5), 6 + r() * 4, '#e8483c', r);
}

// ---------------------------------------------------------------- photographs
const PHOTOS = ['beach', 'dog', 'baby', 'sunset', 'house', 'birthday', 'mountain', 'snow', 'park'] as const;
type Photo = (typeof PHOTOS)[number];
function person(g: G, x: number, feet: number, h: number, colour: string, skin: string) {
  g.fillStyle = colour;
  g.beginPath(); g.roundRect(x - h * 0.15, feet - h * 0.78, h * 0.3, h * 0.5, h * 0.08); g.fill();
  g.fillStyle = '#2a2d3a'; g.fillRect(x - h * 0.12, feet - h * 0.3, h * 0.24, h * 0.3);
  g.fillStyle = skin; g.beginPath(); g.arc(x, feet - h * 0.88, h * 0.12, 0, 7); g.fill();
}
function paintPhoto(g: G, w: number, h: number, subject: Photo, r: R, fade: number, cast: number, polaroid: boolean) {
  const bw = polaroid ? w * 0.07 : w * 0.035;
  const bottom = polaroid ? h * 0.2 : bw;
  g.fillStyle = '#f5f3ee'; g.fillRect(0, 0, w, h);
  g.save();
  g.beginPath(); g.rect(bw, bw, w - bw * 2, h - bw - bottom); g.clip();
  g.translate(bw, bw);
  const W = w - bw * 2, H = h - bw - bottom;
  const skins = ['#e8c4a0', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b'];
  const sk = () => skins[Math.floor(r() * skins.length)];
  const clothes = ['#d8262c', '#2f6fd8', '#f2c21a', '#3fa34a', '#e86aa0', '#f07a1a', '#ffffff'];
  const cl = () => clothes[Math.floor(r() * clothes.length)];
  const sky = (top: string, low: string, at = 0.6) => { const gr = g.createLinearGradient(0, 0, 0, H * at); gr.addColorStop(0, top); gr.addColorStop(1, low); g.fillStyle = gr; g.fillRect(0, 0, W, H * at); };
  if (subject === 'beach') {
    sky('#3f8fe0', '#bfe2f5', 0.5);
    g.fillStyle = '#2a7ab8'; g.fillRect(0, H * 0.5, W, H * 0.15);
    g.fillStyle = '#ecd8a8'; g.fillRect(0, H * 0.65, W, H * 0.35);
    const n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) person(g, W * (0.2 + (i / Math.max(1, n - 1)) * 0.6), H * 0.95, H * (i < 2 ? 0.62 : 0.4), cl(), sk());
  } else if (subject === 'dog') {
    g.fillStyle = '#7ac0e8'; g.fillRect(0, 0, W, H * 0.45);
    g.fillStyle = '#5aa04a'; g.fillRect(0, H * 0.45, W, H * 0.55);
    const c = ['#b07a3a', '#2a2420', '#e8d8b8', '#8a5a2a'][Math.floor(r() * 4)];
    g.fillStyle = c;
    g.beginPath(); g.ellipse(W * 0.48, H * 0.66, W * 0.26, H * 0.14, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(W * 0.72, H * 0.48, W * 0.13, H * 0.11, 0, 0, 7); g.fill();
    g.fillRect(W * 0.28, H * 0.7, W * 0.06, H * 0.2); g.fillRect(W * 0.6, H * 0.7, W * 0.06, H * 0.2);
    g.fillStyle = '#1d1d1f'; g.beginPath(); g.arc(W * 0.8, H * 0.5, W * 0.025, 0, 7); g.fill();
    if (r() < 0.6) person(g, W * 0.2, H * 0.95, H * 0.55, cl(), sk());
  } else if (subject === 'baby') {
    g.fillStyle = r() < 0.5 ? '#f0d6dc' : '#d6e4f0'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(W * 0.5, H * 0.62, W * 0.3, H * 0.28, 0, 0, 7); g.fill();
    g.fillStyle = sk(); g.beginPath(); g.arc(W * 0.5, H * 0.36, W * 0.2, 0, 7); g.fill();
    g.fillStyle = '#f5e090'; g.beginPath(); g.ellipse(W * 0.5, H * 0.22, W * 0.12, H * 0.05, 0, 0, 7); g.fill();
  } else if (subject === 'sunset') {
    sky('#5a3a7a', '#f08a3a', 0.7);
    g.fillStyle = '#ffd36a'; g.beginPath(); g.arc(W * 0.5, H * 0.66, W * 0.16, 0, 7); g.fill();
    g.fillStyle = '#3a2a4a'; g.fillRect(0, H * 0.7, W, H * 0.3);
    g.fillStyle = '#1d1824';
    for (const x of [0.38, 0.6]) { g.beginPath(); g.roundRect(W * x - W * 0.07, H * 0.42, W * 0.14, H * 0.5, 6); g.fill(); g.beginPath(); g.arc(W * x, H * 0.37, W * 0.07, 0, 7); g.fill(); }
  } else if (subject === 'house') {
    sky('#5aa8e8', '#cfe6f5', 0.55);
    g.fillStyle = '#6ab05a'; g.fillRect(0, H * 0.75, W, H * 0.25);
    g.fillStyle = ['#e8d8b8', '#c87a5a', '#a8c0d8', '#f0f0e8'][Math.floor(r() * 4)]; g.fillRect(W * 0.18, H * 0.4, W * 0.64, H * 0.38);
    g.fillStyle = '#6a3a2a'; g.beginPath(); g.moveTo(W * 0.12, H * 0.42); g.lineTo(W * 0.5, H * 0.18); g.lineTo(W * 0.88, H * 0.42); g.fill();
    g.fillStyle = '#3a5a8a'; g.fillRect(W * 0.44, H * 0.58, W * 0.12, H * 0.2);
    g.fillStyle = '#f5f0c8'; g.fillRect(W * 0.25, H * 0.48, W * 0.12, H * 0.1); g.fillRect(W * 0.63, H * 0.48, W * 0.12, H * 0.1);
  } else if (subject === 'birthday') {
    g.fillStyle = '#3a2a2a'; g.fillRect(0, 0, W, H);
    const gl = g.createRadialGradient(W * 0.5, H * 0.55, 2, W * 0.5, H * 0.55, W * 0.6); gl.addColorStop(0, 'rgba(255,190,90,0.85)'); gl.addColorStop(1, 'rgba(255,190,90,0)');
    g.fillStyle = gl; g.fillRect(0, 0, W, H);
    g.fillStyle = sk(); g.beginPath(); g.arc(W * 0.5, H * 0.32, W * 0.16, 0, 7); g.fill();
    g.fillStyle = cl(); g.beginPath(); g.moveTo(W * 0.42, H * 0.2); g.lineTo(W * 0.5, H * 0.02); g.lineTo(W * 0.58, H * 0.2); g.fill();
    g.fillStyle = '#f5ecd8'; g.fillRect(W * 0.25, H * 0.62, W * 0.5, H * 0.22);
    g.fillStyle = '#e86aa0'; g.fillRect(W * 0.25, H * 0.62, W * 0.5, H * 0.05);
    for (let i = 0; i < 5; i++) { g.fillStyle = '#ffe080'; g.beginPath(); g.arc(W * (0.3 + i * 0.1), H * 0.55, W * 0.025, 0, 7); g.fill(); }
  } else if (subject === 'mountain') {
    sky('#3a7ad0', '#d8ecf8', 0.7);
    g.fillStyle = '#5a6a7a'; g.beginPath(); g.moveTo(0, H * 0.75); g.lineTo(W * 0.35, H * 0.25); g.lineTo(W * 0.6, H * 0.55); g.lineTo(W * 0.8, H * 0.35); g.lineTo(W, H * 0.6); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(W * 0.27, H * 0.35); g.lineTo(W * 0.35, H * 0.25); g.lineTo(W * 0.43, H * 0.37); g.fill();
    g.fillStyle = '#4a7a3a'; g.fillRect(0, H * 0.82, W, H * 0.18);
    person(g, W * 0.3, H * 0.98, H * 0.35, cl(), sk());
  } else if (subject === 'snow') {
    sky('#a8b8c8', '#e8eef2', 0.5);
    g.fillStyle = '#f4f6f8'; g.fillRect(0, H * 0.5, W, H * 0.5);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(W * 0.65, H * 0.75, W * 0.14, 0, 7); g.fill(); g.beginPath(); g.arc(W * 0.65, H * 0.52, W * 0.1, 0, 7); g.fill();
    g.fillStyle = '#f07a1a'; g.fillRect(W * 0.65, H * 0.51, W * 0.08, H * 0.02);
    person(g, W * 0.3, H * 0.95, H * 0.55, cl(), sk());
  } else {
    g.fillStyle = '#8ac87a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#4a8a3a'; g.beginPath(); g.arc(W * 0.2, H * 0.25, W * 0.25, 0, 7); g.fill(); g.beginPath(); g.arc(W * 0.85, H * 0.2, W * 0.22, 0, 7); g.fill();
    for (let i = 0; i < 2 + Math.floor(r() * 2); i++) person(g, W * (0.3 + i * 0.22), H * 0.95, H * (0.5 + r() * 0.2), cl(), sk());
  }
  g.restore();
  // Age: a yellowed, faded print with a colour cast from the scene's warmth.
  g.fillStyle = `rgba(${Math.round(mix(150, 255, cast))}, ${Math.round(mix(200, 215, cast))}, ${Math.round(mix(255, 140, cast))}, ${0.1 + fade * 0.35})`;
  g.fillRect(0, 0, w, h);
  if (polaroid) {
    g.fillStyle = 'rgba(40,40,60,0.55)'; g.font = `italic ${Math.round(h * 0.09)}px serif`; g.textAlign = 'center';
    g.fillText(['us ♥', 'summer', 'home', 'Mum', 'Dad', 'the kids', '2025'][Math.floor(r() * 7)], w / 2, h - bottom * 0.4);
  }
}

// ---------------------------------------------------------------- notes
const NOTES = {
  moon: 'Lined paper in a child\'s hand: LOVE YOU TO THE MOON AND BACK, with a heart.',
  safe: 'A folded note from a partner: Come home safe. We are so proud of you. xx',
  sleeps: 'A countdown in marker: ONLY 96 MORE SLEEPS!',
  sticky: 'A yellow sticky note: CALL HOME SUNDAY, underlined twice.',
  letter: 'A creased letter half out of its envelope, read many times.',
} as const;
function paintNote(g: G, w: number, h: number, kind: keyof typeof NOTES, r: R, fade: number) {
  const lined = (paper: string) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,130,200,0.45)'; g.lineWidth = 1.5;
    for (let y = h * 0.18; y < h; y += h * 0.1) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = 'rgba(220,60,60,0.5)'; g.beginPath(); g.moveTo(w * 0.14, 0); g.lineTo(w * 0.14, h); g.stroke();
  };
  const hand = (lines: readonly string[], colour: string, size: number, y0: number, step: number, font = 'italic') => {
    g.fillStyle = colour; g.font = `${font} ${size}px serif`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    lines.forEach((line, i) => { g.save(); g.translate(w * 0.18, y0 + i * step); g.rotate((r() - 0.5) * 0.05); g.fillText(line, 0, 0, w * 0.78); g.restore(); });
  };
  if (kind === 'moon') {
    lined('#fbfaf4');
    g.font = `bold ${h * 0.11}px sans-serif`; g.fillStyle = '#8a3fc2'; g.textAlign = 'left';
    ['LOVE YOU', 'TO THE', 'MOON AND', 'BACK!!'].forEach((t, i) => g.fillText(t, w * 0.18, h * (0.27 + i * 0.15), w * 0.78));
    g.fillStyle = '#d8262c'; g.beginPath(); g.arc(w * 0.62, h * 0.86, h * 0.05, Math.PI, 0); g.arc(w * 0.72, h * 0.86, h * 0.05, Math.PI, 0); g.lineTo(w * 0.67, h * 0.96); g.fill();
  } else if (kind === 'safe') {
    lined('#fbfaf4');
    hand(['Come home safe.', 'We are so', 'proud of you.', 'Always,', '   xx'], '#1f3a8a', h * 0.085, h * 0.26, h * 0.13);
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, h * 0.5); g.lineTo(w, h * 0.5); g.stroke();
  } else if (kind === 'sleeps') {
    g.fillStyle = '#fbfaf4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f6fd8'; g.font = `bold ${h * 0.12}px sans-serif`; g.textAlign = 'center';
    g.fillText('ONLY', w / 2, h * 0.22);
    g.fillStyle = '#d8262c'; g.font = `bold ${h * 0.34}px sans-serif`;
    g.fillText(String(20 + Math.floor(r() * 140)), w / 2, h * 0.58);
    g.fillStyle = '#2f6fd8'; g.font = `bold ${h * 0.1}px sans-serif`;
    g.fillText('MORE SLEEPS!', w / 2, h * 0.8, w * 0.9);
  } else if (kind === 'sticky') {
    g.fillStyle = '#f7e36a'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, 0, w, h * 0.12);
    g.fillStyle = '#1d1d1f'; g.font = `bold ${h * 0.15}px sans-serif`; g.textAlign = 'center';
    g.fillText('CALL', w / 2, h * 0.36); g.fillText('HOME', w / 2, h * 0.56); g.fillText('SUN', w / 2, h * 0.76);
    g.strokeStyle = '#d8262c'; g.lineWidth = 3;
    for (const y of [0.83, 0.88]) { g.beginPath(); g.moveTo(w * 0.2, h * y); g.lineTo(w * 0.8, h * y); g.stroke(); }
  } else {
    g.fillStyle = '#e8e2d0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fbfaf4'; g.fillRect(w * 0.08, 0, w * 0.84, h * 0.62);
    g.fillStyle = 'rgba(30,40,90,0.55)';
    for (let y = h * 0.08; y < h * 0.58; y += h * 0.045) g.fillRect(w * 0.14, y, w * (0.5 + r() * 0.22), h * 0.012);
    g.fillStyle = '#d8d0b8'; g.beginPath(); g.moveTo(0, h * 0.55); g.lineTo(w / 2, h * 0.78); g.lineTo(w, h * 0.55); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, h * 0.55); g.lineTo(w / 2, h * 0.78); g.lineTo(w, h * 0.55); g.stroke();
    g.fillStyle = '#c0392b'; g.fillRect(w * 0.74, h * 0.82, w * 0.16, h * 0.12);
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.moveTo(w * 0.5, 0); g.lineTo(w * 0.5, h); g.stroke();
  }
  g.fillStyle = `rgba(200,170,90,${fade * 0.3})`; g.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------- the locker
const FINISHES = {
  grey: { body: '#8a9096', inner: '#5e646a', note: 'Battleship-grey steel: barracks, factories, ships.' },
  blue: { body: '#2f5d9a', inner: '#24466f', note: 'Glossy school-corridor blue.' },
  red: { body: '#a8322d', inner: '#7a2622', note: 'Chipped school red.' },
  olive: { body: '#5d6340', inner: '#454a30', note: 'Olive drab, an army barracks.' },
  white: { body: '#e3e6e4', inner: '#b8bcbc', note: 'White enamel panel with a grab rail: a station, hospital or ship\'s crew locker.' },
  wood: { body: '#9a6a3a', inner: '#6a4626', note: 'Varnished wood, an old gym or clubhouse.' },
  mint: { body: '#8fbfa6', inner: '#6a9a82', note: 'Faded mint green, a 1960s changing room.' },
} as const;
const NAMES = ['OKAFOR', 'LINDQVIST', 'MORENO', 'TANAKA', 'BYRNE', 'ADEYEMI', 'KOWALSKI', 'NGUYEN', 'HALE', 'SANTOS', 'PATEL', 'O\'NEILL'];

export default defineThing({
  questions: {
    finish: choice('What kind of locker is it?', Object.fromEntries(Object.entries(FINISHES).map(([k, v]) => [k, v.note])) as Record<keyof typeof FINISHES, string>),
    photos: score('How many photos are taped to the door?', ['A single photo', 'Three or four', 'Six or seven', 'Ten or more, edge to edge']),
    drawing: choice('What is the child\'s crayon drawing of?', DRAWINGS),
    note: choice('What is the note?', NOTES),
    flower: choice('What dried flower is taped there?', {
      rose: 'A single dried red rose, taped across its stem.',
      lavender: 'A bunch of lavender hung upside down by a ribbon.',
      wildflowers: 'A small bunch of dried wildflowers, pale yellow and pink.',
      pressed: 'A pressed daisy flattened under clear tape.',
      none: 'No flower.',
    }),
    story: choice('What is happening with this locker?', {
      fresh: 'Just put up: bright new tape, every photo straight, the paint clean.',
      years: 'Layered over years: faded photos overlapping, curled corners, yellowed tape and old tape scars.',
      leaving: 'Packing up to go home: half the photos already taken down, clean rectangles where they were, a duffel bag at its foot.',
      tribute: 'A tribute: a black ribbon across one photo, flowers and a candle left at its foot. Someone did not come home.',
    }),
    door: choice('Is the door open?', {
      shut: 'Shut and latched.',
      ajar: 'Ajar, a glimpse of a hanging jacket inside.',
      open: 'Swung open, showing the shelf, the hanging clothes and boots.',
    }),
    label: choice('How is the name on the door written?', {
      dymo: 'A black embossed label-maker strip.',
      card: 'A typed card slid into a metal frame.',
      tape: 'Masking tape and marker pen.',
      none: 'No name, just the locker number.',
    }),
    row: noul('Does it stand in a row with plain neighbouring lockers?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const finish = FINISHES[a.finish];
    const story = a.story;
    const years = story === 'years', leaving = story === 'leaving', tribute = story === 'tribute', fresh = story === 'fresh';
    const doorState = leaving && a.door === 'shut' ? 'ajar' : a.door;
    const W = 0.5, D = 0.5, H = 1.84, T = 0.018;
    const dw = W - 0.04, dh = 1.66, dy = 0.11;
    const fade = Math.min(1, mood.wear * 0.6 + (years ? 0.5 : 0) + (fresh ? -0.2 : 0));
    const number = 10 + Math.floor(random() * 80);
    const metal = a.finish !== 'wood';

    const body = s.material(finish.body, { metalness: metal ? 0.35 : 0, roughness: metal ? 0.45 : 0.6 });
    const inner = s.material(finish.inner, { roughness: 0.8 });
    const dark = s.material('#24262a', { roughness: 0.7 });
    const steel = s.material('#b8bec4', { metalness: 0.8, roughness: 0.3 });

    // ---- the door's painted face: louvres, the pressed bead, scuffs, tape scars ----
    const doorFace = (decorated: boolean, scars: readonly { x: number; y: number; w: number; h: number; t: number }[]) => {
      const cw = 256, ch = 928;
      return paint(cw, ch, (g) => {
        const base = new THREE.Color(finish.body).lerp(new THREE.Color('#8b8275'), mood.wear * 0.18);
        g.fillStyle = `#${base.getHexString()}`; g.fillRect(0, 0, cw, ch);
        if (a.finish === 'wood') { g.strokeStyle = 'rgba(60,30,10,0.25)'; g.lineWidth = 2; for (let x = 0; x < cw; x += 7 + random() * 6) { g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, ch * 0.3, x - 8, ch * 0.7, x + 3, ch); g.stroke(); } }
        const sheen = g.createLinearGradient(0, 0, cw, 0); sheen.addColorStop(0, 'rgba(255,255,255,0.10)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(0,0,0,0.10)');
        g.fillStyle = sheen; g.fillRect(0, 0, cw, ch);
        // pressed bead around the edge
        g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 3; g.strokeRect(14, 14, cw - 28, ch - 28);
        g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 2; g.strokeRect(17, 17, cw - 34, ch - 34);
        // louvres top and bottom
        for (const top of [44, ch - 150]) for (let i = 0; i < 6; i++) {
          const y = top + i * 18;
          g.fillStyle = 'rgba(10,10,12,0.85)'; g.beginPath(); g.roundRect(56, y, cw - 112, 8, 4); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(58, y + 9, cw - 116, 2);
        }
        // the paint around old tape is grubby; where a photo was is clean
        const px = (x: number) => ((x + dw / 2) / dw) * cw, py = (y: number) => (1 - (y - dy) / dh) * ch;
        for (const scar of scars) {
          g.save(); g.translate(px(scar.x), py(scar.y)); g.rotate(-scar.t);
          const sw = (scar.w / dw) * cw, sh = (scar.h / dh) * ch;
          g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(-sw / 2, -sh / 2, sw, sh);
          g.strokeStyle = 'rgba(60,50,30,0.25)'; g.lineWidth = 1.5; g.strokeRect(-sw / 2, -sh / 2, sw, sh);
          g.fillStyle = 'rgba(225,205,150,0.75)';
          for (const sx of [-1, 1]) { g.save(); g.translate(sx * sw / 2, -sh / 2); g.rotate(sx * 0.7); g.fillRect(-9, -3, 18, 6); g.restore(); }
          g.restore();
        }
        // scuffs, dents and rust by wear
        for (let i = 0; i < 6 + mood.wear * 40; i++) {
          const x = random() * cw, y = random() * ch;
          g.strokeStyle = `rgba(${random() < 0.5 ? '255,255,255' : '30,30,30'},${0.08 + random() * 0.12})`; g.lineWidth = 1 + random() * 2;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + (random() - 0.5) * 30, y + (random() - 0.5) * 10); g.stroke();
        }
        if (metal) for (let i = 0; i < mood.wear * 14; i++) {
          const x = random() * cw, y = ch * (0.7 + random() * 0.3);
          g.fillStyle = `rgba(${130 + random() * 40},${60 + random() * 30},30,${0.25 + random() * 0.3})`;
          g.beginPath(); g.ellipse(x, y, 2 + random() * 6, 2 + random() * 9, 0, 0, 7); g.fill();
        }
        if (!decorated && random() < 0.5) {
          // a neighbour's sticker
          g.fillStyle = pick(['#f2c21a', '#d8262c', '#2f6fd8', '#ffffff']); g.beginPath(); g.arc(cw * (0.3 + random() * 0.4), ch * (0.4 + random() * 0.3), 14, 0, 7); g.fill();
        }
      });
    };

    // ---- one locker: carcass, door on a right-hand hinge, number plate ----
    const locker = (x: number, decorated: boolean, num: number, scars: readonly { x: number; y: number; w: number; h: number; t: number }[], opening: number) => {
      const group = new THREE.Group();
      group.position.x = x;
      s.root.add(group);
      const put = (m: THREE.Mesh, parent: THREE.Object3D = group) => { parent.add(m); return m; };
      // carcass: back, sides, top, floor, kick plate, a sloped hat
      put(s.box([W, H - 0.08, T], [0, 0.08 + (H - 0.08) / 2, -D / 2 + T / 2], opening ? inner : body));
      for (const sx of [-1, 1]) put(s.box([T, H - 0.08, D], [sx * (W / 2 - T / 2), 0.08 + (H - 0.08) / 2, 0], body));
      put(s.box([W, T, D], [0, H - T / 2, 0], body));
      put(s.box([W, T, D], [0, 0.08 + T / 2, 0], opening ? inner : body));
      put(s.box([W - 0.01, 0.08, D - 0.04], [0, 0.04, -0.02], dark));
      const hat = put(s.box([W, 0.012, D * 0.62], [0, H + 0.07, -D * 0.12], body));
      hat.rotation.x = -0.42;
      put(s.box([W, 0.09, 0.012], [0, H + 0.045, D * 0.16 + 0.01], body));
      // the frame around the door opening
      put(s.box([0.022, dh + 0.04, 0.012], [-W / 2 + 0.011, dy + dh / 2, D / 2 + 0.006], body));
      put(s.box([0.022, dh + 0.04, 0.012], [W / 2 - 0.011, dy + dh / 2, D / 2 + 0.006], body));
      // interior when open
      if (opening) {
        const shelf = put(s.box([W - T * 2, 0.012, D - 0.04], [0, 1.5, -0.01], inner));
        void shelf;
        put(s.rod([-W / 2 + T, 1.42, 0], [W / 2 - T, 1.42, 0], 0.008, steel));
        // a jacket on a hanger
        const coat = new THREE.Shape();
        coat.moveTo(-0.08, 0); coat.lineTo(-0.1, 0.5); coat.lineTo(-0.2, 0.42); coat.lineTo(-0.2, 0.1); coat.lineTo(-0.15, 0.1); coat.lineTo(-0.14, 0.34);
        coat.lineTo(-0.14, 0); coat.lineTo(0.14, 0); coat.lineTo(0.14, 0.34); coat.lineTo(0.15, 0.1); coat.lineTo(0.2, 0.1); coat.lineTo(0.2, 0.42); coat.lineTo(0.1, 0.5); coat.lineTo(0.03, 0.52); coat.lineTo(-0.03, 0.52); coat.lineTo(-0.1, 0.5);
        const jacketGeo = new THREE.ExtrudeGeometry(coat, { depth: 0.06, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
        if (!leaving || random() < 0.4) {
          const jacket = put(s.mesh(jacketGeo, s.material(pick(['#2f4f6a', '#5d6340', '#8a9096', '#b8312f', '#1f2a3a', '#d8d4c8']), { roughness: 0.9 }), [0, 0.86, -0.03]));
          jacket.rotation.y = (random() - 0.5) * 0.3;
          put(s.ring(0.05, 0.004, [0, 1.38, 0], steel, Math.PI)).rotation.z = 0;
        } else jacketGeo.dispose();
        // a cap and a folded towel on the shelf, boots on the floor
        if (!leaving) {
          put(s.box([0.22, 0.06, 0.2], [-0.08, 1.54, -0.06], s.material(pick(['#e8e4dc', '#c8d8e8', '#d8c8a8']), { roughness: 1 })));
          put(s.ball([0.08, 0.05, 0.08], [0.12, 1.53, -0.04], s.material(pick(['#1f2a3a', '#5d6340', '#b8312f']))));
          for (const bx of [-0.08, 0.08]) {
            put(s.box([0.08, 0.16, 0.1], [bx, 0.17, -0.1], dark));
            put(s.box([0.085, 0.05, 0.22], [bx, 0.115, -0.05], dark));
          }
        }
      }
      // the door, hinged on the right so its face turns toward the viewer as it opens
      const hinge = new THREE.Group();
      hinge.position.set(W / 2 - 0.022, 0, D / 2 + 0.014);
      group.add(hinge);
      hinge.rotation.y = opening;
      const face = new THREE.Group();
      face.position.x = -dw / 2;
      hinge.add(face);
      const map = doorFace(decorated, scars);
      const mats = [body, body, body, body, new THREE.MeshStandardMaterial({ map, roughness: metal ? 0.5 : 0.65, metalness: metal ? 0.25 : 0 }), inner];
      const slab = new THREE.Mesh(new THREE.BoxGeometry(dw, dh, 0.02), mats);
      slab.position.set(0, dy + dh / 2, -0.01);
      slab.castShadow = slab.receiveShadow = true;
      face.add(slab);
      for (const hy of [0.35, dy + dh / 2, dy + dh - 0.25]) put(s.cylinder(0.008, 0.008, 0.07, [dw / 2 + 0.006, hy, -0.006], steel, 8), face);
      // the latch handle on the free edge
      put(s.box([0.028, 0.14, 0.014], [-dw / 2 + 0.05, 1.0, 0.008], steel), face);
      put(s.box([0.02, 0.05, 0.03], [-dw / 2 + 0.05, 1.04, 0.02], steel), face);
      // number plate
      const plate = put(s.label(String(num), 0.07, 0.034, [0, 0, 0], '#1d1d1f', '#d4d8dc'), face);
      plate.position.set(dw * 0.18, 1.49, 0.003);
      return { group, face, hinge };
    };

    // ---- the collage layout on the hero door: cells three across, five down ----
    const x0 = -dw / 2 + 0.085, x1 = dw / 2 - 0.035, yTop = 1.43, yBot = 0.43;
    const cols = 3, rows = 5, cw = (x1 - x0) / cols, chh = (yTop - yBot) / rows;
    const cell = (c: number, r: number): [number, number] => [x0 + (c + 0.5) * cw, yTop - (r + 0.5) * chh];
    const free = new Set<string>();
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) free.add(`${c},${r}`);
    const take = (c: number, r: number) => free.delete(`${c},${r}`);
    const tilt = fresh ? 0.04 : years ? 0.2 : 0.1;
    const flowerCell: [number, number] | null = a.flower === 'none' ? null : [Math.floor(random() * cols), 0];
    if (flowerCell) take(...flowerCell);
    const drawRow = 2 + Math.floor(random() * 3), drawCol = random() < 0.5 ? 0 : 1;
    take(drawCol, drawRow); take(drawCol + 1, drawRow);
    const remaining = () => [...free].map((k) => k.split(',').map(Number) as [number, number]);
    const noteChoices = remaining();
    const noteCell = noteChoices[Math.floor(random() * noteChoices.length)];
    take(...noteCell);
    let photoCount = Math.round(mix(1, 11, a.photos));
    const cells = remaining().sort((p, q) => (Math.abs(p[1] - 1.6) + random() * 1.6) - (Math.abs(q[1] - 1.6) + random() * 1.6));
    const photoSpots: { x: number; y: number; t: number }[] = [];
    for (let i = 0; i < Math.min(photoCount, cells.length); i++) { const [x, y] = cell(...cells[i]); photoSpots.push({ x: x + (random() - 0.5) * 0.02, y: y + (random() - 0.5) * 0.03, t: (random() - 0.5) * 2 * tilt }); }
    if (years) for (let i = 0; i < 3; i++) photoSpots.push({ x: mix(x0, x1, random()), y: mix(yBot + 0.05, yTop - 0.05, random()), t: (random() - 0.5) * 2 * tilt });
    photoCount = photoSpots.length;
    // leaving: some photos already gone, leaving clean rectangles behind
    const scars: { x: number; y: number; w: number; h: number; t: number }[] = [];
    const kept = photoSpots.filter((spot, i) => {
      const gone = leaving ? photoSpots.length > 1 && (i % 2 === 0 || random() < 0.3) : years ? random() < 0.15 : false;
      if (gone) scars.push({ x: spot.x, y: spot.y, w: 0.092, h: 0.122, t: spot.t });
      return !gone;
    });

    // Kept under about 50 degrees so the photos still face a camera on either side.
    const opening = { shut: 0, ajar: 0.3 + random() * 0.12, open: 0.72 + random() * 0.14 }[doorState];
    const hero = locker(0, true, number, scars, opening);
    const face = hero.face;
    if (a.row) {
      locker(-W - 0.004, false, number - 1, [], 0);
      locker(W + 0.004, false, number + 1, [], 0);
    }
    if (a.finish === 'white') {
      // a station grab rail beside the locker
      const rx = (a.row ? W * 1.5 : W / 2) + 0.06;
      for (const y of [0.7, 1.5]) s.box([0.05, 0.03, 0.05], [rx, y, D / 2 - 0.08], steel);
      s.rod([rx, 0.7, D / 2 - 0.04], [rx, 1.5, D / 2 - 0.04], 0.016, s.material('#e8b83a', { roughness: 0.5 }));
    }

    // ---- the name ----
    const surname = pick(NAMES);
    const initial = pick(['A', 'J', 'M', 'R', 'S', 'T', 'K', 'L']);
    if (a.label !== 'none') {
      const text = `${initial}. ${surname}`;
      const lab = a.label === 'dymo' ? s.label(text, 0.13, 0.022, [0, 0, 0], '#f4f4f0', '#141416')
        : a.label === 'card' ? s.label(text, 0.13, 0.034, [0, 0, 0], '#1d1d1f', '#f4f1e6')
        : s.label(surname, 0.14, 0.03, [0, 0, 0], '#1f3a8a', '#e8dcb0');
      face.add(lab);
      lab.position.set(-dw * 0.12, 1.49, 0.004);
      lab.rotation.z = a.label === 'tape' ? (random() - 0.5) * 0.08 : 0;
      if (a.label === 'card') {
        const frame = s.box([0.145, 0.044, 0.006], [-dw * 0.12, 1.49, 0.001], steel);
        face.add(frame);
      }
    }

    // ---- photos, the drawing, the note, all with tape at the corners ----
    const tapeSpots: THREE.Matrix4[] = [];
    const tapeAt = (x: number, y: number, z: number, angle: number) => tapeSpots.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, angle)), new THREE.Vector3(1, 1, 1)));
    let layer = 0.003;
    const fluttering: { pivot: THREE.Group; rest: number }[] = [];
    const pinUp = (map: THREE.Texture, w: number, h: number, x: number, y: number, t: number, corners: 2 | 4, curl = 0) => {
      layer += 0.0012;
      const pivot = new THREE.Group();
      pivot.position.set(x, y + h / 2, layer);
      pivot.rotation.z = t;
      face.add(pivot);
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.55, side: THREE.DoubleSide }));
      sheet.position.y = -h / 2;
      sheet.castShadow = sheet.receiveShadow = true;
      pivot.add(sheet);
      pivot.rotation.x = -curl;
      if (curl > 0) fluttering.push({ pivot, rest: -curl });
      const cos = Math.cos(t), sin = Math.sin(t);
      const at = (u: number, v: number): [number, number] => [x + u * cos - v * sin, y + h / 2 + u * sin + v * cos];
      const tapeZ = layer + 0.0008;
      const [ax, ay] = at(-w / 2, 0), [bx, by] = at(w / 2, 0);
      tapeAt(ax, ay, tapeZ, t + 0.75); tapeAt(bx, by, tapeZ, t - 0.75);
      if (corners === 4) { const [cx, cy] = at(-w / 2, -h), [ex, ey] = at(w / 2, -h); tapeAt(cx, cy, tapeZ, t - 0.75); tapeAt(ex, ey, tapeZ, t + 0.75); }
      return pivot;
    };
    const subjects = [...PHOTOS].sort(() => random() - 0.5);
    let ribbonDone = false;
    kept.forEach((spot, i) => {
      const polaroid = random() < 0.35;
      const portrait = random() < 0.55;
      const [pw, ph] = polaroid ? [0.09, 0.108] : portrait ? [0.092, 0.122] : [0.122, 0.092];
      const map = paint(polaroid ? 120 : portrait ? 120 : 160, polaroid ? 144 : portrait ? 160 : 120, (g, w, h) => paintPhoto(g, w, h, subjects[i % subjects.length], random, fade * (0.6 + random() * 0.4), mood.warmth, polaroid));
      const curl = years && random() < 0.5 ? 0.12 + random() * 0.15 : !fresh && random() < 0.15 ? 0.08 : 0;
      const pivot = pinUp(map, pw, ph, spot.x, spot.y, spot.t, 2, curl);
      if (tribute && !ribbonDone) {
        ribbonDone = true;
        const black = s.material('#141416', { roughness: 0.6 });
        for (const sign of [-1, 1]) {
          const band = new THREE.Mesh(new THREE.PlaneGeometry(0.018, 0.085), black);
          band.position.set(pw / 2 - 0.024 + sign * 0.01, -0.03, 0.0012);
          band.rotation.z = sign * 0.45;
          pivot.add(band);
        }
        const knot = new THREE.Mesh(new THREE.CircleGeometry(0.013, 12), black);
        knot.position.set(pw / 2 - 0.024, -0.008, 0.0016);
        pivot.add(knot);
      }
    });
    // the crayon drawing, bigger and taped at all four corners
    {
      const [cx, cy] = cell(drawCol, drawRow);
      const map = paint(256, 192, (g, w, h) => paintDrawing(g, w, h, a.drawing, random, mood.cheer));
      pinUp(map, 0.25, 0.185, cx + cw / 2 + (random() - 0.5) * 0.01, cy, (random() - 0.5) * tilt, 4, years ? 0.05 : 0);
    }
    // the note
    {
      const [nx, ny] = cell(...noteCell);
      const [nw, nh] = a.note === 'sticky' ? [0.075, 0.075] : a.note === 'letter' ? [0.1, 0.12] : [0.09, 0.115];
      const map = paint(128, Math.round(128 * nh / nw), (g, w, h) => paintNote(g, w, h, a.note, random, fade));
      if (a.note === 'sticky') { layer += 0.0012; const sheet = new THREE.Mesh(new THREE.PlaneGeometry(nw, nh), new THREE.MeshStandardMaterial({ map, roughness: 0.7, side: THREE.DoubleSide })); sheet.position.set(nx, ny, layer); sheet.rotation.z = (random() - 0.5) * 0.2; face.add(sheet); }
      else pinUp(map, nw, nh, nx, ny, (random() - 0.5) * tilt * 1.5, 2, random() < 0.4 ? 0.1 : 0);
    }
    // the dried flower
    if (flowerCell) {
      const [fx, fy] = cell(...flowerCell);
      const z = layer + 0.012;
      const stemMat = s.material('#6a6a3a', { roughness: 1 });
      const add = (m: THREE.Mesh) => { face.add(m); return m; };
      if (a.flower === 'rose') {
        const lean = (random() - 0.5) * 0.8;
        const top: [number, number, number] = [fx + Math.sin(lean) * 0.08, fy + 0.07, z + 0.01];
        add(s.rod([fx - Math.sin(lean) * 0.08, fy - 0.09, z], top, 0.0035, stemMat));
        const rose = add(s.lathe([[0, -0.012], [0.016, -0.006], [0.02, 0.012], [0.014, 0.024], [0.004, 0.028]], s.material('#6e1f2a', { roughness: 0.9 }), top));
        rose.rotation.z = -lean;
        const leaf = add(s.ball([0.016, 0.006, 0.004], [fx + 0.01, fy - 0.01, z + 0.004], s.material('#5a5a2a', { roughness: 1 })));
        leaf.rotation.z = 0.6;
        tapeAt(fx, fy - 0.03, z + 0.006, lean + Math.PI / 2);
      } else if (a.flower === 'lavender' || a.flower === 'wildflowers') {
        const n = a.flower === 'lavender' ? 7 : 6;
        const tie: [number, number, number] = [fx, fy + 0.06, z];
        const heads: { at: [number, number, number]; size: number; color: string }[] = [];
        for (let i = 0; i < n; i++) {
          const spread = (i / (n - 1) - 0.5) * 0.08 + (random() - 0.5) * 0.01;
          const end: [number, number, number] = [fx + spread, fy - 0.07 - random() * 0.02, z + 0.004 + random() * 0.006];
          add(s.rod(tie, end, 0.0018, stemMat));
          add(s.rod(tie, [fx + spread * 0.2, fy + 0.085, z], 0.0018, stemMat));
          if (a.flower === 'lavender') {
            const spike = add(s.ball([0.006, 0.022, 0.006], [end[0], end[1] - 0.014, end[2]], s.material('#7a6a9a', { roughness: 1 }), 8));
            spike.rotation.z = spread * 2;
          } else heads.push({ at: [end[0], end[1] - 0.006, end[2]], size: 0.009 + random() * 0.005, color: pick(['#e8d890', '#e8c0c8', '#f0ece0', '#d8a868']) });
        }
        if (heads.length) { const m = s.scatter(new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { roughness: 1 }), heads); face.add(m); }
        add(s.cylinder(0.007, 0.007, 0.012, tie, s.material(tribute ? '#141416' : pick(['#c0392b', '#8a6aa8', '#e8e0c8'])), 10));
        tapeAt(fx, fy + 0.07, z + 0.008, 0.1);
      } else {
        const map = paint(96, 96, (g, w, h) => {
          g.clearRect(0, 0, w, h);
          g.strokeStyle = '#7a7a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h * 0.45); g.quadraticCurveTo(w * 0.42, h * 0.75, w * 0.5, h); g.stroke();
          for (let i = 0; i < 14; i++) { g.save(); g.translate(w / 2, h * 0.38); g.rotate((i / 14) * Math.PI * 2); g.fillStyle = 'rgba(244,238,214,0.95)'; g.beginPath(); g.ellipse(0, -h * 0.17, w * 0.05, h * 0.15, 0, 0, 7); g.fill(); g.restore(); }
          g.fillStyle = '#d8a828'; g.beginPath(); g.arc(w / 2, h * 0.38, w * 0.09, 0, 7); g.fill();
        });
        layer += 0.0012;
        const daisy = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.4, roughness: 0.8 }));
        daisy.position.set(fx, fy, layer);
        face.add(daisy);
        const cover = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.1), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false }));
        cover.position.set(fx, fy, layer + 0.0008);
        face.add(cover);
      }
    }
    // a few stickers, ticket stubs or a pin-badge with the scene's density and cheer
    for (let i = 0; i < Math.round(mood.density * 3); i++) {
      const [ex, ey] = [mix(x0, x1, random()), mix(yBot, yTop, random())];
      layer += 0.0012;
      const sticker = mood.cheer > 0.5 && random() < 0.7;
      const geo = sticker ? new THREE.CircleGeometry(0.014, 5) : new THREE.PlaneGeometry(0.06, 0.025);
      const m = new THREE.Mesh(geo, s.material(sticker ? pick(['#f2c21a', '#e86aa0', '#3fa3e0']) : pick(['#e8d8b0', '#c8e0f0', '#f0c8a8'])));
      m.position.set(ex, ey, layer); m.rotation.z = random() * 3;
      face.add(m);
      if (!sticker) tapeAt(ex, ey + 0.012, layer + 0.0008, 0.2);
    }
    if (tapeSpots.length) {
      const tapeColour = fresh ? '#f4f2ea' : years || mood.wear > 0.6 ? '#d8c27a' : '#ece6cf';
      const tape = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.034, 0.012), new THREE.MeshStandardMaterial({ color: tapeColour, transparent: true, opacity: 0.82, roughness: 0.4 }), tapeSpots.length);
      tapeSpots.forEach((m, i) => tape.setMatrixAt(i, m));
      tape.instanceMatrix.needsUpdate = true;
      face.add(tape);
    }

    // ---- padlock, a duffel bag, a tribute at its foot ----
    if (doorState === 'shut' && !leaving && random() < 0.5) {
      const brass = s.material('#c8a040', { metalness: 0.8, roughness: 0.35 });
      face.add(s.box([0.034, 0.04, 0.014], [-dw / 2 + 0.05, 0.93, 0.03], brass));
      face.add(s.ring(0.011, 0.003, [-dw / 2 + 0.05, 0.955, 0.03], steel, Math.PI));
    }
    if (leaving) {
      // a duffel bag: a fat cylinder with round end panels, a zip along the top and two webbing handles
      const bagGroup = new THREE.Group();
      bagGroup.position.set(-0.04, 0, D / 2 + 0.3);
      bagGroup.rotation.y = 0.25;
      s.root.add(bagGroup);
      const cloth = s.material(pick(['#6b7048', '#2f4a6a', '#8a2a26', '#b8a27a']), { roughness: 0.95 });
      const trim = s.material(pick(['#1d1d1f', '#3a3a32', '#c8c0a8']), { roughness: 0.9 });
      const barrel = s.mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.56, 20), cloth, [0, 0.14, 0]);
      barrel.rotation.z = Math.PI / 2; barrel.scale.set(1, 1, 0.82);
      bagGroup.add(barrel);
      for (const ex of [-0.285, 0.285]) {
        const end = s.mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.03, 20), trim, [ex, 0.14, 0]);
        end.rotation.z = Math.PI / 2; end.scale.set(1, 1, 0.82);
        bagGroup.add(end);
      }
      bagGroup.add(s.box([0.5, 0.012, 0.02], [0, 0.288, 0], trim));
      for (const hx of [-0.1, 0.1]) { const handle = s.ring(0.05, 0.009, [hx, 0.29, 0], trim, Math.PI); handle.rotation.y = Math.PI / 2; bagGroup.add(handle); }
      const strap = s.tube([[-0.29, 0.2, 0.06], [-0.1, 0.42, 0.12], [0.1, 0.42, 0.12], [0.29, 0.2, 0.06]], 0.01, trim);
      bagGroup.add(strap);
    }
    let flame: THREE.Mesh | null = null;
    if (tribute) {
      // a memorial candle in a tall red glass jar, lit
      s.cylinder(0.042, 0.042, 0.14, [0.14, 0.07, D / 2 + 0.16], s.material('#f0ece0', { roughness: 0.8 }), 16);
      s.cylinder(0.05, 0.048, 0.2, [0.14, 0.1, D / 2 + 0.16], new THREE.MeshStandardMaterial({ color: '#d8262c', emissive: '#d84020', emissiveIntensity: 0.5, transparent: true, opacity: 0.55, depthWrite: false }), 16);
      flame = s.ball([0.014, 0.03, 0.014], [0.14, 0.17, D / 2 + 0.16], new THREE.MeshStandardMaterial({ color: '#ffd080', emissive: '#ffb040', emissiveIntensity: 2.4, transparent: true, opacity: 0.95, depthWrite: false }), 10);
      flame.castShadow = false;
      // a bouquet in cone wrapping, lying at the foot
      const bouquet = new THREE.Group();
      bouquet.position.set(-0.12, 0.07, D / 2 + 0.22);
      bouquet.rotation.y = 0.5;
      s.root.add(bouquet);
      const wrap = s.mesh(new THREE.ConeGeometry(0.1, 0.4, 16, 1, true), new THREE.MeshStandardMaterial({ color: pick(['#f4f1e6', '#e8d8e0', '#d8e4ec']), roughness: 0.7, side: THREE.DoubleSide }), [0, 0, 0]);
      wrap.rotation.z = -Math.PI / 2;
      bouquet.add(wrap);
      const blooms = Array.from({ length: 11 }, () => ({ at: [-0.2 - random() * 0.08, 0.01 + (random() - 0.5) * 0.12, (random() - 0.5) * 0.14] as [number, number, number], size: 0.03 + random() * 0.014, color: pick(['#f0f0ea', '#e8c0c8', '#d8262c', '#f2d860', '#f0f0ea']) }));
      bouquet.add(s.scatter(new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { roughness: 0.9 }), blooms));
    }

    const energy = mood.energy;
    const result = s.finish({
      update(_dt, time) {
        fluttering.forEach(({ pivot, rest }, i) => { pivot.rotation.x = rest - (0.5 + 0.5 * Math.sin(time * (1.5 + energy * 4) + i * 1.7)) * 0.08 * (0.2 + energy); });
        if (flame) flame.scale.y = 0.022 * (1 + Math.sin(time * 11) * 0.12 + Math.sin(time * 17.3) * 0.08);
      },
    });
    void hero;
    return result;
  },
});
