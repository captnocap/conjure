export type Patient = 'dog' | 'pug' | 'cat' | 'rabbit' | 'parrot' | 'monkey';
export type Finding = 'clean' | 'fracture' | 'hook' | 'baby' | 'shadow';
export type Tint = 'blue' | 'amber' | 'green' | 'inverted';

interface Spec { c: [number, number, number, number]; nose: number; tip: number; orbit: number; teeth: number; canine: number; under: number; flat: boolean }
const SPECS: Record<Exclude<Patient, 'parrot'>, Spec> = {
  dog: { c: [0.68, 0.4, 0.17, 0.15], nose: 0.1, tip: 0.042, orbit: 0.045, teeth: 9, canine: 0.075, under: 0, flat: false },
  pug: { c: [0.6, 0.4, 0.22, 0.2], nose: 0.31, tip: 0.07, orbit: 0.07, teeth: 6, canine: 0.05, under: 0.045, flat: false },
  cat: { c: [0.62, 0.42, 0.2, 0.17], nose: 0.3, tip: 0.05, orbit: 0.075, teeth: 4, canine: 0.08, under: 0, flat: false },
  rabbit: { c: [0.66, 0.42, 0.16, 0.13], nose: 0.17, tip: 0.05, orbit: 0.055, teeth: 5, canine: 0, under: 0, flat: true },
  monkey: { c: [0.6, 0.36, 0.22, 0.21], nose: 0.3, tip: 0.075, orbit: 0.06, teeth: 7, canine: 0.05, under: 0, flat: true },
};
const BONE: Record<Tint, [string, string]> = {
  blue: ['#040915', '205,228,255'],
  amber: ['#150e06', '255,228,186'],
  green: ['#03110b', '190,255,216'],
  inverted: ['#040915', '225,232,240'],
};

/** Paints one lateral head radiograph, animal facing left. `zoom` crops in on the teeth. */
export function paintFilm(patient: Patient, finding: Finding, tint: Tint, wear: number, random: () => number, zoom = 1, flip = false) {
  const W = 512, H = 400;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d')!;
  const [bg, rgb] = BONE[tint];
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // Exposure falls off toward the corners.
  const vignette = g.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 330);
  vignette.addColorStop(0, `rgba(${rgb},0.1)`); vignette.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = vignette; g.fillRect(0, 0, W, H);

  g.save();
  if (flip) { g.translate(W, 0); g.scale(-1, 1); }
  if (zoom !== 1) { g.translate(W * 0.3, H * 0.62); g.scale(zoom, zoom); g.translate(-W * 0.3, -H * 0.62); }
  g.globalCompositeOperation = 'lighter';
  g.filter = 'blur(1.6px)';
  const X = (x: number) => x * W, Y = (y: number) => y * H * 1.12 - 8;
  const bone = (alpha: number) => { g.fillStyle = `rgba(${rgb},${alpha})`; g.strokeStyle = `rgba(${rgb},${alpha})`; };
  const poly = (pts: number[][], alpha: number) => { bone(alpha); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.closePath(); g.fill(); };
  const oval = (x: number, y: number, rx: number, ry: number, alpha: number, rot = 0) => { bone(alpha); g.beginPath(); g.ellipse(X(x), Y(y), rx * W, ry * H * 1.12, rot, 0, Math.PI * 2); g.fill(); };
  const line = (pts: number[][], width: number, alpha: number) => { bone(alpha); g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); };
  const dark = (x: number, y: number, rx: number, ry: number, alpha: number) => { g.globalCompositeOperation = 'source-over'; g.fillStyle = bg; g.globalAlpha = alpha; g.beginPath(); g.ellipse(X(x), Y(y), rx * W, ry * H * 1.12, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; g.globalCompositeOperation = 'lighter'; };
  const spine = (pts: number[][], size: number) => { for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; g.save(); g.translate(X((x0 + x1) / 2), Y((y0 + y1) / 2)); g.rotate(Math.atan2((y1 - y0) * H, (x1 - x0) * W)); bone(0.38); g.beginPath(); g.roundRect(-size * 0.8, -size * 0.5, size * 1.6, size, 4); g.fill(); bone(0.25); g.fillRect(-size * 0.3, -size * 0.9, size * 0.5, size * 0.5); g.restore(); } };

  let mark: [number, number] = [0.5, 0.5];
  let throat: [number, number] = [0.7, 0.62];
  if (patient === 'parrot') {
    const cx = 0.6, cy = 0.38, r = 0.19;
    oval(0.56, 0.5, 0.36, 0.42, 0.06);
    oval(cx, cy, r, r, 0.3); dark(cx + 0.02, cy, r * 0.82, r * 0.82, 0.4);
    oval(cx, cy, r * 0.95, r * 0.95, 0.1);
    // Sclerotic ring.
    dark(cx - 0.07, cy + 0.01, 0.085, 0.085, 0.75);
    for (let i = 0; i < 14; i++) { const t = (i / 14) * Math.PI * 2; oval(cx - 0.07 + Math.cos(t) * 0.062 * 0.88, cy + 0.01 + Math.sin(t) * 0.062, 0.012, 0.012, 0.45); }
    // The hooked upper beak, dense along its ridge.
    bone(0.42); g.beginPath(); g.moveTo(X(0.47), Y(0.24)); g.bezierCurveTo(X(0.26), Y(0.2), X(0.14), Y(0.42), X(0.24), Y(0.7)); g.bezierCurveTo(X(0.27), Y(0.56), X(0.34), Y(0.5), X(0.46), Y(0.5)); g.closePath(); g.fill();
    bone(0.5); g.lineWidth = 7; g.beginPath(); g.moveTo(X(0.47), Y(0.24)); g.bezierCurveTo(X(0.26), Y(0.2), X(0.14), Y(0.42), X(0.24), Y(0.7)); g.stroke();
    dark(0.4, 0.32, 0.02, 0.014, 0.8);
    bone(0.4); g.beginPath(); g.moveTo(X(0.46), Y(0.54)); g.bezierCurveTo(X(0.36), Y(0.56), X(0.3), Y(0.62), X(0.3), Y(0.7)); g.bezierCurveTo(X(0.4), Y(0.72), X(0.48), Y(0.66), X(0.52), Y(0.56)); g.closePath(); g.fill();
    line([[0.46, 0.5], [0.58, 0.52], [0.7, 0.5]], 5, 0.45);
    const neck: number[][] = []; for (let i = 0; i <= 9; i++) { const t = i / 9; neck.push([0.74 + Math.sin(t * 3.4) * 0.06 + t * 0.06, 0.5 + t * 0.44]); }
    spine(neck, 13);
    mark = finding === 'fracture' ? [0.27, 0.46] : [0.66, 0.36]; throat = [0.62, 0.66];
    if (finding === 'fracture') { g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.strokeStyle = bg; g.lineWidth = 4; g.beginPath(); g.moveTo(X(0.19), Y(0.42)); g.lineTo(X(0.25), Y(0.45)); g.lineTo(X(0.23), Y(0.49)); g.lineTo(X(0.31), Y(0.52)); g.stroke(); g.globalCompositeOperation = 'lighter'; }
  } else {
    const sp = SPECS[patient], [cx, cy, rx, ry] = sp.c, nose = sp.nose, my = cy + 0.03;
    oval((cx + nose) / 2 + 0.06, cy + 0.06, (cx + rx - nose) * 0.62, ry * 1.75, 0.055);
    if (patient === 'rabbit') { oval(0.86, 0.2, 0.15, 0.04, 0.07, -0.5); oval(0.9, 0.3, 0.16, 0.04, 0.06, -0.2); }
    if (patient === 'cat' || patient === 'dog') poly([[cx + 0.02, cy - ry * 0.95], [cx + rx * 0.5, cy - ry * 1.75], [cx + rx * 0.75, cy - ry * 0.75]], 0.06);
    // Cranium: bright shell, darker vault.
    oval(cx, cy, rx, ry, 0.34); dark(cx + rx * 0.08, cy - ry * 0.02, rx * 0.8, ry * 0.78, 0.45); oval(cx, cy, rx * 0.9, ry * 0.9, 0.1);
    if (patient === 'monkey') line([[cx - rx * 0.98, cy - ry * 0.35], [cx - rx * 0.7, cy - ry * 0.5]], 9, 0.5);
    if (patient === 'dog') line([[cx - rx * 0.1, cy - ry * 1.0], [cx + rx * 0.85, cy - ry * 0.55]], 6, 0.4);
    // Muzzle.
    poly([[cx - rx * 0.55, cy - ry * 0.62], [nose + 0.03, my - sp.tip - 0.01], [nose, my - sp.tip * 0.4], [nose + 0.01, my + sp.tip], [cx - rx * 0.3, cy + ry * 0.78]], 0.36);
    dark((cx - rx * 0.6 + nose) / 2 + 0.02, my - sp.tip * 0.35, (cx - rx * 0.6 - nose) * 0.36, sp.tip * 0.42, 0.5);
    // Orbit and cheekbone.
    const ox = cx - rx * 0.78, oy = cy - ry * 0.08;
    dark(ox, oy, sp.orbit, sp.orbit * 1.15, 0.8);
    bone(0.4); g.lineWidth = 4; g.beginPath(); g.ellipse(X(ox), Y(oy), sp.orbit * W, sp.orbit * 1.15 * H * 1.12, 0, 0, Math.PI * 2); g.stroke();
    line([[ox - sp.orbit * 0.6, oy + sp.orbit * 1.4], [cx - rx * 0.2, cy + ry * 0.45], [cx + rx * 0.25, cy + ry * 0.3]], 7, 0.42);
    // Mandible.
    const jx = nose + 0.025 - sp.under, jy = my + sp.tip + 0.02;
    poly([[jx, jy], [cx - rx * 0.4, cy + ry * 0.92], [cx - rx * 0.05, cy + ry * 0.2], [cx + rx * 0.1, cy + ry * 0.3], [cx + rx * 0.22, cy + ry * 0.38], [cx + rx * 0.3, cy + ry * 1.28], [cx - rx * 0.2, cy + ry * 1.36], [jx + 0.02, jy + 0.06], [jx - 0.008, jy + 0.03]], 0.4);
    line([[jx + 0.01, jy + 0.055], [cx - rx * 0.2, cy + ry * 1.36], [cx + rx * 0.3, cy + ry * 1.28]], 5, 0.3);
    // Teeth along the bite line.
    const bx = cx - rx * 0.42, by = cy + ry * 0.84;
    const at = (t: number): [number, number] => [nose + 0.035 + (bx - nose - 0.035) * t, my + sp.tip + 0.012 + (by - my - sp.tip - 0.012) * t];
    const tooth = (t: number, len: number, w: number, up: boolean, alpha = 0.85, shift = 0) => { const [x, y] = at(t); const d = up ? 1 : -1; if (sp.flat) { bone(alpha); g.beginPath(); g.roundRect(X(x + shift - w / 2), Y(up ? y : y - len), w * W, len * H * 1.12, 3); g.fill(); } else poly([[x + shift - w / 2, y + d * 0.004], [x + shift + w / 2, y + d * 0.004], [x + shift + w * 0.1, y - d * len]], alpha); };
    for (let i = 0; i < sp.teeth; i++) {
      const t = 0.3 + (i / Math.max(1, sp.teeth - 1)) * 0.7, size = 0.03 + Math.sin((i / sp.teeth) * Math.PI) * 0.022;
      tooth(t, size * (patient === 'rabbit' ? 2.1 : 1), (0.62 / sp.teeth) * (bx - nose) * 1.05, false);
      tooth(t + 0.03, size * (patient === 'rabbit' ? 2.3 : 0.9), (0.62 / sp.teeth) * (bx - nose) * 1.05, true);
    }
    if (patient === 'rabbit') {
      // Ever-growing incisors, curling past each other.
      bone(0.9); g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(X(nose + 0.1), Y(my - 0.03)); g.quadraticCurveTo(X(nose - 0.02), Y(my + 0.0), X(nose + 0.03), Y(my + sp.tip + 0.09)); g.stroke();
      g.beginPath(); g.moveTo(X(jx + 0.13), Y(jy + 0.05)); g.quadraticCurveTo(X(jx - 0.05), Y(jy + 0.03), X(jx - 0.035), Y(jy - 0.11)); g.stroke();
      for (let i = 0; i < 4; i++) { const [x, y] = at(0.45 + i * 0.16); poly([[x - 0.006, y + 0.05], [x + 0.008, y + 0.05], [x + 0.012, y + 0.12 + random() * 0.03]], 0.6); }
    } else {
      for (let i = 0; i < 3; i++) { tooth(0.02 + i * 0.045, 0.022, 0.012, false, 0.75); tooth(0.0 + i * 0.045, 0.02, 0.012, true, 0.75, -sp.under); }
      if (sp.canine) {
        const flatWas = sp.flat; sp.flat = false;
        tooth(0.2, -sp.canine * 1.0, 0.03, true, 0.95); tooth(0.12, -sp.canine * 0.85, 0.028, false, 0.95, -sp.under);
        if (finding === 'baby') { tooth(0.255, -sp.canine * 0.7, 0.014, true, 1); tooth(0.07, -sp.canine * 0.6, 0.013, false, 1, -sp.under); }
        sp.flat = flatWas;
      }
    }
    spine([[cx + rx * 0.92, cy + ry * 0.25], [cx + rx * 1.3, cy + ry * 0.55], [cx + rx * 1.65, cy + ry * 0.95], [cx + rx * 2.0, cy + ry * 1.4], [cx + rx * 2.3, cy + ry * 1.9]], patient === 'dog' ? 24 : 20);
    throat = [cx + rx * 0.45, cy + ry * 1.05];
    const mid: [number, number] = [(jx + cx - rx * 0.2) / 2 + 0.03, (jy + 0.045 + cy + ry * 1.14) / 2];
    mark = finding === 'fracture' ? mid : finding === 'baby' ? at(0.16) : [cx + rx * 0.25, cy - ry * 0.25];
    if (finding === 'fracture') {
      g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.strokeStyle = bg; g.lineWidth = 5; g.lineJoin = 'miter';
      g.beginPath(); g.moveTo(X(mid[0] - 0.02), Y(mid[1] - 0.075)); g.lineTo(X(mid[0] + 0.012), Y(mid[1] - 0.03)); g.lineTo(X(mid[0] - 0.012), Y(mid[1] + 0.005)); g.lineTo(X(mid[0] + 0.02), Y(mid[1] + 0.07)); g.stroke();
      g.globalCompositeOperation = 'lighter';
      poly([[mid[0] + 0.01, mid[1] + 0.06], [mid[0] + 0.05, mid[1] + 0.075], [mid[0] + 0.03, mid[1] + 0.095]], 0.55);
    }
  }
  g.filter = 'none';
  if (finding === 'shadow') {
    g.globalCompositeOperation = 'source-over';
    const blob = g.createRadialGradient(X(mark[0]), Y(mark[1]), 2, X(mark[0]), Y(mark[1]), 46);
    blob.addColorStop(0, `rgba(${rgb},0.5)`); blob.addColorStop(0.6, `rgba(${rgb},0.24)`); blob.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = blob; g.beginPath(); g.ellipse(X(mark[0]), Y(mark[1]), 50, 40, 0.4, 0, Math.PI * 2); g.fill();
  }
  if (finding === 'hook') {
    // Metal is the brightest thing on any film.
    g.globalCompositeOperation = 'source-over'; g.strokeStyle = '#ffffff'; g.lineCap = 'round'; g.lineWidth = 6;
    const [hx, hy] = [X(throat[0]), Y(throat[1])];
    g.beginPath(); g.moveTo(hx - 34, hy - 30); g.lineTo(hx + 8, hy + 14); g.arc(hx - 8, hy + 30, 22, -0.75, Math.PI * 0.95); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(hx - 30, hy + 36); g.lineTo(hx - 17, hy + 26); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.arc(hx - 39, hy - 35, 6, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1.2; g.strokeStyle = `rgba(${rgb},0.55)`; g.beginPath(); g.moveTo(hx - 42, hy - 40); g.bezierCurveTo(hx - 120, hy - 60, hx - 180, hy - 20, hx - 250, hy - 10); g.stroke();
    mark = throat;
  }
  g.restore();

  // Burned-in side marker.
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = `rgba(${rgb},0.9)`; g.font = 'bold 26px monospace'; g.textBaseline = 'top';
  g.fillText(flip ? 'R' : 'L', 18, 14);
  g.font = '13px monospace'; g.fillText(zoom !== 1 ? 'DENTAL' : 'LAT SKULL', 44, 22);
  // Dust, scratches and thumbprints gather with wear.
  for (let i = 0; i < wear * 26; i++) { g.strokeStyle = `rgba(${rgb},${0.1 + random() * 0.25})`; g.lineWidth = 0.6 + random(); const x = random() * W, y = random() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (random() - 0.5) * 90, y + (random() - 0.5) * 30); g.stroke(); }
  for (let i = 0; i < wear * 60; i++) { g.fillStyle = `rgba(${rgb},${0.2 + random() * 0.3})`; g.fillRect(random() * W, random() * H, 1.5, 1.5); }
  if (tint === 'inverted') { g.globalCompositeOperation = 'difference'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
  // Grease-pencil annotation over the finding.
  if (finding !== 'clean') {
    let mx = (X(mark[0]) - W * 0.3) * zoom + W * 0.3;
    const myy = (Y(mark[1]) - H * 0.62) * zoom + H * 0.62;
    if (flip) mx = W - mx;
    g.strokeStyle = tint === 'amber' ? '#ff5340' : '#ffcf3d'; g.lineWidth = 4.5; g.lineCap = 'round';
    g.beginPath();
    const rr = finding === 'hook' ? 62 : 52;
    for (let i = 0; i <= 40; i++) { const t = (i / 40) * Math.PI * 2.15 - 0.6, r = rr * (1 + Math.sin(t * 3 + random()) * 0.05 + i * 0.002); const px = mx + Math.cos(t) * r * 1.12, py = myy + Math.sin(t) * r * 0.86; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke();
    if (finding === 'shadow') { g.fillStyle = g.strokeStyle; g.font = 'bold 44px monospace'; g.fillText('?', Math.min(W - 40, mx + rr + 14), Math.max(8, myy - 50)); }
  }
  return canvas;
}
