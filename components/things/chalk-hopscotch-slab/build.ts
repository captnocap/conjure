import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
const S = 400, W = 1.5, D = 2.5, PW = 600, PH = 1000;

export default defineThing({
  questions: {
    layout: choice('What shape is the hopscotch grid?', {
      classic: 'The classic: single squares and side-by-side pairs up to a rounded home at ten.',
      ladder: 'A plain ladder of eight single squares.',
      snail: 'A snail-shell spiral winding in to the middle.',
    }),
    extra: choice('What else is drawn beside it?', {
      sun: 'A big smiling sun with rays.',
      family: 'A row of stick-figure family, tall to small, and a dog.',
      name: 'A name in capital letters with a heart.',
      arrows: 'START and arrows showing which way to go.',
      flowers: 'Flowers and hearts scattered about.',
      nothing: 'Nothing else.',
    }),
    rain: score('How much has the rain taken?', ['Drawn this afternoon, crisp and dusty', 'Scuffed by feet', 'Half gone after a shower', 'Only ghosts left in the grain']),
    chalk: choice('What colour is the chalk?', {
      white: 'Plain white school chalk.',
      pastel: 'A whole tub of fat pastel pavement chalks, every line a different colour.',
      pink: 'All pink.',
      'blue-yellow': 'Blue lines with yellow numbers.',
    }),
    marker: choice('What marker lies on the grid?', {
      stone: 'A flat pebble.',
      'bottle-top': 'A gold bottle top.',
      beanbag: 'A small cloth beanbag.',
      shell: 'A seashell.',
      none: 'None; the marker is gone.',
    }),
    left: choice('What was left behind on the slabs?', {
      chalks: 'A tub and a scatter of worn chalk stubs.',
      shoe: 'A single small sandal.',
      rope: 'A skipping rope.',
      nothing: 'Nothing.',
    }),
    paving: choice('What is it drawn on?', {
      grey: 'Square grey council paving slabs.',
      checker: 'A pink and buff chequered patio.',
      riven: 'Riven sandstone flags in mixed honey tones.',
      tarmac: 'One slab of dark playground tarmac.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const dark = a.paving === 'tarmac';

    // 1. The stone, painted per slab.
    const canvas = document.createElement('canvas'); canvas.width = PW; canvas.height = PH;
    const g = canvas.getContext('2d')!;
    const cols = dark ? 1 : 3, rows = dark ? 1 : 5, cw = PW / cols, ch = PH / rows;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const base = new THREE.Color(a.paving === 'grey' ? '#8d8c86' : a.paving === 'checker' ? ((c + r) % 2 ? '#b5807a' : '#b3a07a') : a.paving === 'riven' ? pick(['#b3935e', '#a88752', '#bb9c68', '#9c8050']) : '#45474b');
      base.offsetHSL(0, 0, (random() - 0.5) * 0.05).lerp(new THREE.Color('#7f8072'), wear * 0.25);
      g.fillStyle = `#${base.getHexString()}`; g.fillRect(c * cw, r * ch, cw, ch);
    }
    for (let i = 0; i < 5200; i++) { g.fillStyle = random() > 0.5 ? 'rgba(255,255,255,0.14)' : 'rgba(30,28,24,0.14)'; const d = dark ? 3 : 2; g.fillRect(random() * PW, random() * PH, d, d); }
    if (a.paving === 'riven') { g.strokeStyle = 'rgba(110,80,40,0.18)'; g.lineWidth = 3; for (let i = 0; i < 40; i++) { const x = random() * PW, y = random() * PH; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 40, y + 10, x + 70, y - 14, x + 120, y + 6); g.stroke(); } }
    g.strokeStyle = 'rgba(40,36,30,0.55)'; g.lineWidth = 2;
    for (let i = 0; i < Math.round(wear * 7); i++) { let x = random() * PW, y = random() * PH; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (random() - 0.5) * 70; y += 20 + random() * 40; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < Math.round(wear * mix(20, 90, mood.density)); i++) {
      const onCol = random() > 0.5, line = onCol ? Math.round(random() * cols) * cw : Math.round(random() * rows) * ch, t = random();
      g.fillStyle = `rgba(${90 + random() * 30},${120 + random() * 30},60,0.55)`; g.beginPath(); g.ellipse(onCol ? line + (random() - 0.5) * 14 : t * PW, onCol ? t * PH : line + (random() - 0.5) * 14, 6 + random() * 16, 5 + random() * 9, random() * 3, 0, 7); g.fill();
    }

    // 2. The chalk, on its own layer so the rain can take it.
    const layer = document.createElement('canvas'); layer.width = PW; layer.height = PH;
    const c = layer.getContext('2d')!;
    c.lineCap = 'round'; c.lineJoin = 'round';
    const pastels = ['#f6a6c0', '#a6d8f6', '#f8e58a', '#b6eaa8', '#d8b6f2', '#f8c09a', '#ffffff'];
    const lineTint = () => ({ white: '#fbfbf6', pastel: pick(pastels), pink: '#f79ac0', 'blue-yellow': '#8cc6f8' }[a.chalk]);
    const numTint = () => ({ white: '#fbfbf6', pastel: pick(pastels), pink: '#fbb8d2', 'blue-yellow': '#fbe36a' }[a.chalk]);
    const stroke = (points: [number, number][], colour: string, thin = 8, closed = false) => {
      const width = thin * 1.6;
      for (let pass = 0; pass < 2; pass++) {
        c.strokeStyle = colour; c.globalAlpha = 0.8; c.lineWidth = width * (pass ? 0.6 : 1);
        c.beginPath();
        points.forEach(([x, y], i) => { const jx = x + (random() - 0.5) * 5, jy = y + (random() - 0.5) * 5; if (i) c.lineTo(jx, jy); else c.moveTo(jx, jy); });
        if (closed) c.closePath();
        c.stroke();
      }
      c.globalAlpha = 1;
    };
    const wobble = (x0: number, y0: number, x1: number, y1: number): [number, number][] => { const out: [number, number][] = []; const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 40)); for (let i = 0; i <= n; i++) out.push([mix(x0, x1, i / n), mix(y0, y1, i / n)]); return out; };
    const rect = (x: number, y: number, w: number, h: number, colour: string) => { const skew = () => (random() - 0.5) * 10; stroke([...wobble(x + skew(), y + skew(), x + w + skew(), y + skew()), ...wobble(x + w + skew(), y + skew(), x + w + skew(), y + h + skew()), ...wobble(x + w, y + h + skew(), x + skew(), y + h + skew())], colour, 8, true); };
    const circle = (x: number, y: number, r: number, colour: string, from = 0, to = Math.PI * 2, width = 8) => { const pts: [number, number][] = []; const n = Math.max(8, Math.round(r / 4)); for (let i = 0; i <= n; i++) { const t = mix(from, to, i / n); pts.push([x + Math.cos(t) * r, y + Math.sin(t) * r]); } stroke(pts, colour, width); };
    const write = (text: string, x: number, y: number, size: number, colour: string, turn = 0) => {
      c.save(); c.translate(x, y); c.rotate(turn + (random() - 0.5) * 0.14);
      c.font = `bold ${size}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.strokeStyle = colour; c.fillStyle = colour; c.lineWidth = Math.max(5, size * 0.1); c.globalAlpha = 0.9; c.strokeText(text, 0, 0); c.globalAlpha = 0.55; c.fillText(text, 0, 0); c.globalAlpha = 1;
      c.restore();
    };
    const cells: { x: number; y: number; n: number }[] = [];
    const cell = (x: number, y: number, n: number) => cells.push({ x, y, n });
    if (a.layout === 'classic') {
      const k = 118, cx = PW / 2 + (random() - 0.5) * 20; let y = PH - 34, n = 1;
      for (const span of [1, 1, 1, 2, 1, 2, 1]) {
        for (let i = 0; i < span; i++) { const x = cx + (i - (span - 1) / 2) * k; rect(x - k / 2, y - k, k, k, lineTint()); write(String(n), x, y - k / 2, 66, numTint()); cell(x, y - k / 2, n++); }
        y -= k;
      }
      circle(cx, y, k * 0.72, lineTint(), Math.PI, Math.PI * 2); write('10', cx, y - k * 0.32, 52, numTint()); cell(cx, y - k * 0.3, 10);
    } else if (a.layout === 'ladder') {
      const k = 112, cx = PW / 2 + (random() - 0.5) * 30;
      for (let n = 1; n <= 8; n++) { const y = PH - 40 - (n - 1) * k; rect(cx - k * 0.62, y - k, k * 1.24, k, lineTint()); write(String(n), cx, y - k / 2, 70, numTint()); cell(cx, y - k / 2, n); }
    } else {
      const cx = PW / 2, cy = PH / 2 + 20, turns = 2.25, r0 = 62, r1 = 275, band = (r1 - r0) / turns;
      const radius = (t: number) => r0 + (r1 - r0) * t / (turns * Math.PI * 2);
      const spiral = (offset: number, colour: string) => { const pts: [number, number][] = []; for (let i = 0; i <= 150; i++) { const t = i / 150 * turns * Math.PI * 2; const r = radius(t) + offset; pts.push([cx + Math.cos(-t - 1.2) * r, cy + Math.sin(-t - 1.2) * r]); } stroke(pts, colour, 8); };
      const tint = lineTint();
      spiral(0, tint); spiral(-band, a.chalk === 'pastel' ? lineTint() : tint);
      let n = 14, t = turns * Math.PI * 2;
      while (t > 1.1 && n > 0) {
        const r = radius(t), step = 96 / r, ang = -t - 1.2;
        stroke([[cx + Math.cos(ang) * r, cy + Math.sin(ang) * r], [cx + Math.cos(ang) * (r - band), cy + Math.sin(ang) * (r - band)]], lineTint(), 7);
        const mid = -(t - step / 2) - 1.2, rm = radius(t - step / 2) - band / 2;
        if (rm > 30) { write(String(15 - n), cx + Math.cos(mid) * rm, cy + Math.sin(mid) * rm, 44, numTint()); cell(cx + Math.cos(mid) * rm, cy + Math.sin(mid) * rm, 15 - n); }
        t -= step; n--;
      }
      circle(cx, cy, 34, numTint(), 0, Math.PI * 2, 6);
    }

    // Drawings in the margins.
    const left = 16, right = PW - 16, margin = a.layout === 'snail' ? 0 : 150;
    if (a.extra === 'sun') {
      const x = a.layout === 'snail' ? 110 : right - 78, y = 105, col = a.chalk === 'white' ? '#fbfbf6' : '#fbe36a';
      circle(x, y, 46, col);
      for (let i = 0; i < 11; i++) { const t = i / 11 * Math.PI * 2; stroke([[x + Math.cos(t) * 58, y + Math.sin(t) * 58], [x + Math.cos(t) * (84 + random() * 18), y + Math.sin(t) * (84 + random() * 18)]], col, 7); }
      circle(x, y + 4, 24, col, 0.3, Math.PI - 0.3, 5); circle(x - 15, y - 12, 4, col, 0, 7, 5); circle(x + 15, y - 12, 4, col, 0, 7, 5);
    } else if (a.extra === 'family') {
      const sizes = [1, 0.92, 0.6, 0.45], x = a.layout === 'snail' ? 90 : left + 70;
      sizes.forEach((k, i) => {
        const y = (a.layout === 'snail' ? 40 : 250) + i * 150, col = lineTint(), h = 110 * k, fx = a.layout === 'snail' ? 80 + i * 145 : x, fy = a.layout === 'snail' ? 150 : y + 130;
        circle(fx, fy - h, 17 * k + 6, col, 0, 7, 6);
        stroke([[fx, fy - h + 20 * k + 4], [fx, fy - h * 0.35]], col, 7);
        stroke([[fx - 30 * k - 6, fy - h * 0.72], [fx, fy - h * 0.62], [fx + 30 * k + 6, fy - h * 0.72]], col, 6);
        stroke([[fx - 22 * k - 4, fy], [fx, fy - h * 0.35], [fx + 22 * k + 4, fy]], col, 6);
        if (i === 1) stroke([[fx - 26, fy - h * 0.3], [fx, fy - h * 0.62], [fx + 26, fy - h * 0.3], [fx - 26, fy - h * 0.3]], col, 6);
      });
      const dx = a.layout === 'snail' ? 500 : right - 80, dy = a.layout === 'snail' ? 900 : 760, col = lineTint();
      stroke([[dx - 34, dy], [dx + 30, dy], [dx + 30, dy + 26], [dx - 34, dy + 26], [dx - 34, dy]], col, 6); circle(dx + 44, dy - 6, 14, col, 0, 7, 6);
      for (const lx of [-28, -10, 12, 26]) stroke([[dx + lx, dy + 26], [dx + lx, dy + 48]], col, 5);
      stroke([[dx - 34, dy], [dx - 52, dy - 20]], col, 5);
    } else if (a.extra === 'name') {
      const name = pick(['LUCY', 'SAM', 'ANNA', 'BEN', 'ROSIE', 'JOE', 'MAY', 'TOM']);
      const col = numTint();
      if (a.layout === 'snail') write(name, PW / 2, 90, 80, col);
      else [...name].forEach((letter, i) => write(letter, left + 68, 180 + i * 96, 84, col));
      const hx = a.layout === 'snail' ? PW - 90 : right - 74, hy = a.layout === 'snail' ? 900 : 300, hc = a.chalk === 'white' ? '#fbfbf6' : '#f79ac0';
      stroke([[hx, hy + 40], [hx - 42, hy - 4], [hx - 24, hy - 34], [hx, hy - 12], [hx + 24, hy - 34], [hx + 42, hy - 4], [hx, hy + 40]], hc, 8);
      write(pick(['AGE 6', 'AGE 7', 'WOZ ERE', 'X X X']), a.layout === 'snail' ? PW / 2 : right - 76, a.layout === 'snail' ? PH - 60 : 420, 30, lineTint(), a.layout === 'snail' ? 0 : -0.2);
    } else if (a.extra === 'arrows') {
      const col = numTint();
      write('START', a.layout === 'snail' ? PW / 2 : left + 76, PH - 60, 42, col);
      const arrow = (x: number, y: number, len: number, turn: number) => { const ex = x + Math.sin(turn) * len, ey = y - Math.cos(turn) * len; stroke([[x, y], [ex, ey]], col, 8); stroke([[ex - Math.cos(turn) * 22 - Math.sin(turn) * 26, ey - Math.sin(turn) * 22 + Math.cos(turn) * 26], [ex, ey], [ex + Math.cos(turn) * 22 - Math.sin(turn) * 26, ey + Math.sin(turn) * 22 + Math.cos(turn) * 26]], col, 8); };
      if (a.layout === 'snail') { arrow(70, PH - 110, 90, 0.5); arrow(PW - 80, 150, 80, -2.4); }
      else { arrow(left + 70, PH - 120, 130, 0.1); arrow(left + 76, PH - 420, 130, 0.25); arrow(right - 76, 330, 120, Math.PI - 0.2); arrow(right - 70, 640, 130, Math.PI); write('HOME', right - 84, 110, 36, col, 0.1); }
    } else if (a.extra === 'flowers') {
      for (let i = 0; i < 9; i++) {
        const sideX = a.layout === 'snail' ? (i % 2 ? 60 + random() * 80 : PW - 140 + random() * 80) : (i % 2 ? left + 30 + random() * (margin - 70) : right - margin + 40 + random() * (margin - 70));
        const y = a.layout === 'snail' ? (i < 5 ? 40 + random() * 150 : PH - 190 + random() * 150) : 80 + i * 96 + random() * 30, col = a.chalk === 'white' ? '#fbfbf6' : pick(pastels);
        if (i % 3 === 2) stroke([[sideX, y + 26], [sideX - 28, y - 3], [sideX - 16, y - 22], [sideX, y - 8], [sideX + 16, y - 22], [sideX + 28, y - 3], [sideX, y + 26]], col, 6);
        else { for (let p = 0; p < 5; p++) circle(sideX + Math.cos(p * 1.257) * 20, y + Math.sin(p * 1.257) * 20, 11, col, 0, 7, 5); circle(sideX, y, 7, numTint(), 0, 7, 6); stroke([[sideX, y + 30], [sideX + 6, y + 70]], a.chalk === 'white' ? '#fbfbf6' : '#b6eaa8', 5); }
      }
    }

    // 3. Weather: feet scuff the middle, rain lifts whole patches and leaves ghosts.
    const rain = a.rain;
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < Math.round(rain * 60 + 4); i++) {
      const target = cells.length ? pick(cells) : { x: PW / 2, y: PH / 2 };
      c.globalAlpha = 0.35 + random() * 0.4; c.fillStyle = '#000';
      c.beginPath(); c.ellipse(target.x + (random() - 0.5) * 90, target.y + (random() - 0.5) * 90, 14 + random() * 26, 26 + random() * 40, (random() - 0.5) * 0.8, 0, 7); c.fill();
    }
    for (let i = 0; i < Math.round(Math.max(0, rain - 0.3) * 75); i++) {
      c.globalAlpha = 0.25 + random() * 0.4;
      const x = random() * PW, y = random() * PH, r = 16 + random() * 60;
      c.beginPath(); c.ellipse(x, y, r, r * (0.6 + random() * 0.8), random() * 3, 0, 7); c.fill();
      if (random() > 0.5) c.fillRect(x - 5, y, 10, 60 + random() * 140);
    }
    for (let i = 0; i < 900; i++) { c.globalAlpha = 0.5; c.fillRect(random() * PW, random() * PH, 3, 3); }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    const wetness = Math.max(0, rain - 0.4) / 0.6;
    for (let i = 0; i < Math.round(wetness * 9); i++) { g.fillStyle = `rgba(30,34,40,${0.06 + random() * 0.08})`; g.beginPath(); g.ellipse(random() * PW, random() * PH, 40 + random() * 110, 30 + random() * 80, random() * 3, 0, 7); g.fill(); }
    if (rain > 0.45) { g.globalAlpha = 0.16 * rain; g.drawImage(layer, 4, 22); }
    const fade = mix(1, 0.42, Math.pow(rain, 1.6));
    g.globalAlpha = fade;
    g.drawImage(layer, 0, 0);
    g.globalAlpha = 1;
    const glowCanvas = document.createElement('canvas'); glowCanvas.width = PW; glowCanvas.height = PH;
    const gc = glowCanvas.getContext('2d')!; gc.fillStyle = '#000'; gc.fillRect(0, 0, PW, PH); gc.globalAlpha = fade; gc.drawImage(layer, 0, 0);
    const glow = new THREE.CanvasTexture(glowCanvas); glow.colorSpace = THREE.SRGBColorSpace;
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
    const top = new THREE.MeshStandardMaterial({ map: texture, roughness: mix(0.95, 0.55, wetness), emissive: '#ffffff', emissiveMap: glow, emissiveIntensity: 0.4 });
    const sideTone = s.material(a.paving === 'grey' ? '#7f7e78' : a.paving === 'checker' ? '#a48a78' : a.paving === 'riven' ? '#9a7f52' : '#3a3c40', { roughness: 1 });

    // 4. Slabs, each a little out of true.
    const thick = dark ? 0.07 : 0.055, gap = 0.012;
    s.box([W + 0.05, 0.02, D + 0.05], [0, 0.01, 0], s.material('#5a4a36', { roughness: 1 }));
    const heights: number[][] = [];
    for (let ci = 0; ci < cols; ci++) { heights.push([]); for (let ri = 0; ri < rows; ri++) {
      const sw = W / cols, sd = D / rows, x = -W / 2 + sw * (ci + 0.5), z = -D / 2 + sd * (ri + 0.5);
      const group = new THREE.Group();
      const lift = dark ? 0 : random() * 0.012 * wear;
      group.position.set(x, 0.02 + thick / 2 + lift, z);
      if (!dark) group.rotation.set((random() - 0.5) * 0.05 * wear, (random() - 0.5) * 0.02 * wear, (random() - 0.5) * 0.05 * wear);
      heights[ci].push(0.02 + thick + lift);
      const body = new THREE.Mesh(new THREE.BoxGeometry(sw - gap, thick, sd - gap), sideTone); body.castShadow = body.receiveShadow = true; group.add(body);
      const face = new THREE.PlaneGeometry(sw - gap, sd - gap); face.rotateX(-Math.PI / 2);
      const pos = face.attributes.position, uv = face.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, (x + pos.getX(i) + W / 2) / W, 1 - (z + pos.getZ(i) + D / 2) / D);
      const lid = new THREE.Mesh(face, top); lid.position.y = thick / 2 + 0.0012; lid.receiveShadow = true; group.add(lid);
      s.root.add(group);
    } }
    const surface = (px: number, py: number): P3 => { const ci = Math.min(cols - 1, Math.max(0, Math.floor(px / cw))), ri = Math.min(rows - 1, Math.max(0, Math.floor(py / ch))); return [px / S - W / 2, heights[ci][ri] + 0.004, py / S - D / 2]; };

    // Grass in the joints and round the edge.
    const blades: { at: P3; size: number; color: string }[] = [];
    const fringe = Math.round(mix(40, 150, mood.density));
    for (let i = 0; i < fringe; i++) { const t = random() * 2 * (W + D), out = 0.03 + random() * 0.1; const [x, z] = t < W ? [t - W / 2, -D / 2 - out] : t < W + D ? [W / 2 + out, t - W - D / 2] : t < 2 * W + D ? [t - W - D - W / 2, D / 2 + out] : [-W / 2 - out, t - 2 * W - D - D / 2]; blades.push({ at: [x, 0, z], size: 0.5 + random(), color: pick(['#6f9a3c', '#89ad45', '#5b8a3a', '#a8a84a']) }); }
    if (!dark) for (let i = 0; i < Math.round(wear * mix(10, 70, mood.density)); i++) { const onCol = random() > 0.5; const x = onCol ? -W / 2 + Math.ceil(random() * (cols - 1)) * W / cols : (random() - 0.5) * W, z = onCol ? (random() - 0.5) * D : -D / 2 + Math.ceil(random() * (rows - 1)) * D / rows; blades.push({ at: [x, 0.05, z], size: 0.3 + random() * 0.6, color: pick(['#6f9a3c', '#89ad45', '#5b8a3a']) }); }
    const blade = new THREE.ConeGeometry(0.014, 0.16, 4); blade.translate(0, 0.08, 0);
    s.scatter(blade, new THREE.MeshStandardMaterial({ roughness: 1 }), blades);

    // 5. What lies on it.
    if (a.marker !== 'none' && cells.length) {
      const target = cells[Math.min(cells.length - 1, Math.floor(random() * Math.min(7, cells.length)))];
      const at = surface(target.x + (random() - 0.5) * 50, target.y + 26 + random() * 16);
      if (a.marker === 'stone') s.ball([0.05, 0.016, 0.038], [at[0], at[1] + 0.012, at[2]], s.material(pick(['#6f6d68', '#8a857a', '#4f4d4a']), { roughness: 0.8 }), 12).rotation.y = random() * 3;
      else if (a.marker === 'bottle-top') { s.cylinder(0.022, 0.026, 0.01, [at[0], at[1] + 0.005, at[2]], s.material('#d9b23a', { metalness: 0.8, roughness: 0.3 }), 16); }
      else if (a.marker === 'beanbag') s.ball([0.06, 0.022, 0.05], [at[0], at[1] + 0.018, at[2]], s.material(pick(['#d8352f', '#2f6fd0', '#3aa66a']), { roughness: 1 }), 10).rotation.y = random() * 3;
      else { const shell = s.mesh(new THREE.ConeGeometry(0.04, 0.02, 9, 1), s.material('#f1dfc8', { roughness: 0.6, flatShading: true }), [at[0], at[1] + 0.01, at[2]]); shell.scale.z = 0.8; shell.rotation.y = random() * 3; }
    }
    if (a.left === 'chalks') {
      const base = surface(PW - 80 + (random() - 0.5) * 30, PH - 110 + (random() - 0.5) * 60);
      s.mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.1, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#e9ecec', roughness: 0.5, side: THREE.DoubleSide }), [base[0], base[1] + 0.05, base[2]]);
      const sticks = a.chalk === 'white' ? ['#fbfbf6'] : a.chalk === 'pink' ? ['#f79ac0', '#fbb8d2'] : a.chalk === 'blue-yellow' ? ['#8cc6f8', '#fbe36a'] : pastels;
      for (let i = 0; i < 5; i++) s.cylinder(0.012, 0.012, 0.11, [base[0] + (random() - 0.5) * 0.07, base[1] + 0.07, base[2] + (random() - 0.5) * 0.07], s.material(pick(sticks), { roughness: 1 }), 8).rotation.set((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5);
      for (let i = 0; i < Math.round(mix(3, 8, mood.density)); i++) { const p = surface(40 + random() * (PW - 80), 60 + random() * (PH - 120)); s.cylinder(0.012, 0.011, 0.03 + random() * 0.05, [p[0], p[1] + 0.012, p[2]], s.material(pick(sticks), { roughness: 1 }), 8).rotation.set(Math.PI / 2, 0, random() * 3); }
    } else if (a.left === 'shoe') {
      const p = surface(PW - 100 + (random() - 0.5) * 60, 300 + random() * 400), turn = random() * 3;
      const sole = s.box([0.075, 0.018, 0.17], [p[0], p[1] + 0.01, p[2]], s.material('#d9c9a3')); sole.rotation.y = turn;
      for (const off of [-0.03, 0.04]) { const band = s.box([0.085, 0.03, 0.022], [p[0] + Math.sin(turn) * off, p[1] + 0.03, p[2] + Math.cos(turn) * off], s.material('#c0362c')); band.rotation.y = turn; }
    } else if (a.left === 'rope') {
      const p = surface(110, 700), pts: P3[] = [];
      for (let i = 0; i <= 14; i++) { const t = i / 14 * Math.PI * 1.8; pts.push([p[0] + Math.cos(t) * (0.2 + 0.06 * Math.sin(t * 3)), p[1] + 0.012, p[2] + Math.sin(t) * 0.42]); }
      s.tube(pts, 0.009, s.material('#e9e3d2'));
      for (const end of [pts[0], pts[14]]) s.cylinder(0.016, 0.016, 0.12, [end[0], end[1] + 0.008, end[2]], s.material('#d8352f'), 8).rotation.set(Math.PI / 2, 0, random() * 3);
    }
    if (wetness > 0.3) {
      const p = surface(120 + random() * 360, 150 + random() * 700);
      const puddle = s.mesh(new THREE.CircleGeometry(1, 28), s.material('#7f96a3', { roughness: 0.05, metalness: 0.35 }), [p[0], p[1] + 0.006, p[2]]);
      puddle.rotation.x = -Math.PI / 2; puddle.rotation.z = random() * 3; puddle.scale.set(0.16 + wetness * 0.2, 0.1 + wetness * 0.16, 1); puddle.castShadow = false;
    }

    return s.finish();
  },
});
