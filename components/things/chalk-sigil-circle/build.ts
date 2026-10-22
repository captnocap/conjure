import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const N = 1024, C = 512;
type Ctx = CanvasRenderingContext2D;

/** A wobbly, doubled stroke that reads as chalk rather than as a vector line. */
function chalk(ctx: Ctx, random: () => number, points: readonly (readonly [number, number])[], width: number, closed = false) {
  for (let pass = 0; pass < 3; pass++) {
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = width * (0.7 + random() * 0.5);
    ctx.beginPath();
    points.forEach(([x, y], i) => { const px = x + (random() - 0.5) * 3, py = y + (random() - 0.5) * 3; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
    if (closed) ctx.closePath();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
const circlePoints = (cx: number, cy: number, r: number, from = 0, to = Math.PI * 2, steps = 72) =>
  Array.from({ length: steps + 1 }, (_u, i) => { const g = from + (to - from) * i / steps; return [cx + Math.cos(g) * r, cy + Math.sin(g) * r] as const; });

const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const;
function planet(ctx: Ctx, random: () => number, kind: (typeof PLANETS)[number], s: number, w: number) {
  const P = (list: [number, number][]) => chalk(ctx, random, list.map(([x, y]) => [x * s, y * s] as const), w);
  const O = (x: number, y: number, r: number, from = 0, to = Math.PI * 2) => chalk(ctx, random, circlePoints(x * s, y * s, r * s, from, to, 28), w);
  if (kind === 'sun') { O(0, 0, 0.5); O(0, 0, 0.07); }
  if (kind === 'moon') { O(0, 0, 0.5, 0.9, 5.4); O(0.28, 0, 0.42, 1.25, 5.03); }
  if (kind === 'venus' || kind === 'mercury') { O(0, -0.2, 0.28); P([[0, 0.08], [0, 0.62]]); P([[-0.22, 0.36], [0.22, 0.36]]); }
  if (kind === 'mercury') O(0, -0.72, 0.24, 0, Math.PI);
  if (kind === 'mars') { O(-0.1, 0.15, 0.3); P([[0.11, -0.06], [0.5, -0.45]]); P([[0.2, -0.45], [0.5, -0.45], [0.5, -0.15]]); }
  if (kind === 'jupiter') { O(-0.25, -0.22, 0.22, -2.8, 1.3); P([[-0.42, 0.15], [0.42, 0.15]]); P([[0.2, -0.5], [0.2, 0.55]]); }
  if (kind === 'saturn') { P([[-0.2, -0.55], [-0.2, 0.3]]); P([[-0.42, -0.3], [0.05, -0.3]]); O(0.05, 0.08, 0.22, -3.1, 1.1); P([[0.16, 0.27], [0.3, 0.45]]); }
}

export default defineThing({
  questions: {
    figure: choice('What figure is drawn inside the ring?', {
      pentagram: 'A five-pointed star, the common conjuror\'s pentagram.',
      heptagram: 'A seven-pointed star, one point for each planet.',
      triangle: 'A single triangle with a small circle at its heart: the triangle of art.',
      octagram: 'Two overlapped squares making an eight-pointed seal.',
      spiral: 'A spiral winding inward with ticks along it, more witchcraft than geometry.',
    }),
    state: choice('What state is the circle in?', {
      fresh: 'Freshly drawn and crisp, candles unlit, waiting for the hour.',
      working: 'In use: every candle burning, the rite under way.',
      answered: 'Something has answered: the chalk lines themselves are glowing.',
      scuffed: 'Scuffed out in a hurry: one side smeared away by a boot, candles kicked over, chalky footprints leaving.',
      faded: 'Old and nearly worn away, a ghost of lines under years of dust.',
      scorched: 'A black scorch at the centre and soot blown outward: it went wrong.',
    }),
    chalk: choice('What is it drawn in?', {
      white: 'Plain white chalk.',
      red: 'Red ochre, the colour of dried blood.',
      yellow: 'Yellow sulphur.',
      blue: 'Pale blue, like tailor\'s chalk.',
      salt: 'Thick poured lines of white salt rather than chalk.',
    }),
    script: choice('What is written around the ring?', {
      planets: 'The Latin names of the planets in capitals.',
      angels: 'Names of angels: MICHAEL, GABRIEL, RAPHAEL and the rest.',
      runes: 'Angular invented characters nobody can read.',
      signs: 'No words at all, only the planetary signs.',
    }),
    floor: choice('What floor is it drawn on?', {
      flagstone: 'Grey cellar flagstones with wide joints.',
      slate: 'One dark slab of slate.',
      tile: 'Worn red clay tiles.',
      boards: 'Dark wooden floorboards.',
    }),
    candles: choice('What candles stand at the points?', {
      tallow: 'Yellowish tallow stubs of uneven height.',
      black: 'Black wax candles.',
      red: 'Red wax candles.',
      none: 'None: the chalk alone.',
    }),
    centre: choice('What lies at the centre?', {
      empty: 'Nothing, a bare floor.',
      bowl: 'A brass bowl of ash and embers.',
      skull: 'A human skull.',
      book: 'An open grimoire lying face up.',
      salt: 'A small cone of poured salt.',
      flask: 'A sealed glass flask of something dark.',
    }),
    tools: noul('Have the chalk stub and a knife been left lying beside the circle?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 2.3, k = W / N;
    const ink = { white: '#f4f1e8', red: '#b8402c', yellow: '#e6c53a', blue: '#a9cfe8', salt: '#ffffff' }[a.chalk];
    const width = a.chalk === 'salt' ? 13 : 8.5;

    // Chalk layer.
    const layer = document.createElement('canvas'); layer.width = layer.height = N;
    const ctx = layer.getContext('2d')!;
    ctx.strokeStyle = ctx.fillStyle = ink; ctx.lineCap = ctx.lineJoin = 'round';
    const Ro = 455, Ri = 345, Rm = (Ro + Ri) / 2;
    chalk(ctx, random, circlePoints(C, C, Ro), width, true);
    chalk(ctx, random, circlePoints(C, C, Ri), width, true);
    const points = { pentagram: 5, heptagram: 7, triangle: 3, octagram: 8, spiral: 6 }[a.figure];
    const vertex = (i: number, r: number, n = points) => { const g = -Math.PI / 2 + i * Math.PI * 2 / n; return [C + Math.cos(g) * r, C + Math.sin(g) * r] as const; };
    if (a.figure === 'pentagram' || a.figure === 'heptagram') {
      const step = a.figure === 'pentagram' ? 2 : 3;
      for (let i = 0; i < points; i++) chalk(ctx, random, [vertex(i, Ri - 6), vertex(i + step, Ri - 6)], width);
      chalk(ctx, random, circlePoints(C, C, a.figure === 'pentagram' ? 100 : 62), width * 0.8, true);
    } else if (a.figure === 'triangle') {
      chalk(ctx, random, [0, 1, 2].map((i) => vertex(i, Ri - 6)), width, true);
      chalk(ctx, random, circlePoints(C, C, 120), width, true);
      for (let i = 0; i < 3; i++) { const [x, y] = vertex(i + 0.5, 250); chalk(ctx, random, [[x - 26, y], [x + 26, y]], width * 0.8); chalk(ctx, random, [[x, y - 26], [x, y + 26]], width * 0.8); }
    } else if (a.figure === 'octagram') {
      chalk(ctx, random, [0, 2, 4, 6].map((i) => vertex(i, Ri - 6)), width, true);
      chalk(ctx, random, [1, 3, 5, 7].map((i) => vertex(i, Ri - 6)), width, true);
      chalk(ctx, random, circlePoints(C, C, 150), width * 0.8, true);
    } else {
      const turns = 3.2, spiral: [number, number][] = [];
      for (let i = 0; i <= 160; i++) { const t = i / 160, g = t * turns * Math.PI * 2 - Math.PI / 2, r = (Ri - 10) * (1 - t * 0.86); spiral.push([C + Math.cos(g) * r, C + Math.sin(g) * r]); }
      chalk(ctx, random, spiral, width);
      for (let i = 6; i < 150; i += 9) { const [x, y] = spiral[i], dx = x - C, dy = y - C, l = Math.hypot(dx, dy); chalk(ctx, random, [[x - dx / l * 16, y - dy / l * 16], [x + dx / l * 16, y + dy / l * 16]], width * 0.7); }
    }
    // Seven signs and seven names round the band.
    const names = a.script === 'angels' ? ['MICHAEL', 'GABRIEL', 'RAPHAEL', 'ANAEL', 'SAMAEL', 'SACHIEL', 'CASSIEL'] : ['SOL', 'LVNA', 'MERCVRIVS', 'VENVS', 'MARS', 'IVPITER', 'SATVRNVS'];
    const offset = random() * 0.9;
    for (let i = 0; i < 7; i++) {
      const g = offset + i * Math.PI * 2 / 7;
      ctx.save(); ctx.translate(C + Math.cos(g) * Rm, C + Math.sin(g) * Rm); ctx.rotate(g + Math.PI / 2);
      planet(ctx, random, PLANETS[i], 62, width * 0.62);
      ctx.restore();
      if (a.script === 'signs') continue;
      const mid = g + Math.PI / 7, word = names[i], span = Math.min(0.62, word.length * 0.085);
      for (let c = 0; c < word.length; c++) {
        const cg = mid + (word.length === 1 ? 0 : (c / (word.length - 1) - 0.5) * span);
        ctx.save(); ctx.translate(C + Math.cos(cg) * Rm, C + Math.sin(cg) * Rm); ctx.rotate(cg + Math.PI / 2);
        if (a.script === 'runes') {
          const strokes = 2 + Math.floor(random() * 2);
          for (let j = 0; j < strokes; j++) chalk(ctx, random, [[(Math.floor(random() * 3) - 1) * 13, (Math.floor(random() * 3) - 1) * 24], [(Math.floor(random() * 3) - 1) * 13, (Math.floor(random() * 3) - 1) * 24]], width * 0.5);
        } else { ctx.font = 'bold 54px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.92; ctx.fillText(word[c], (random() - 0.5) * 3, (random() - 0.5) * 4); ctx.globalAlpha = 1; }
        ctx.restore();
      }
    }
    // Grain: knock tiny holes out of every stroke.
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 9000; i++) { ctx.globalAlpha = 0.25 + random() * 0.5; ctx.fillRect(random() * N, random() * N, 1 + random() * 2.5, 1 + random() * 2.5); }
    const gapAngle = 0.5 + random() * 1.6; // toward the front right, where the smear shows
    const prints: [number, number, number][] = [];
    if (a.state === 'scuffed') {
      ctx.globalAlpha = 0.93; ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const g = gapAngle + (random() - 0.5) * 0.75, r0 = 150 + random() * 120, r1 = Ro + 40;
        ctx.lineWidth = 46 + random() * 60;
        ctx.beginPath(); ctx.moveTo(C + Math.cos(g) * r0, C + Math.sin(g) * r0); ctx.lineTo(C + Math.cos(g + (random() - 0.5) * 0.3) * r1, C + Math.sin(g + (random() - 0.5) * 0.3) * r1); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = ink;
      for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.05 + random() * 0.06; const g = gapAngle + (random() - 0.5) * 0.9, r = 200 + random() * 280; ctx.beginPath(); ctx.ellipse(C + Math.cos(g) * r, C + Math.sin(g) * r, 30 + random() * 40, 14 + random() * 14, g, 0, 7); ctx.fill(); }
      // Chalky bootprints leaving through the gap.
      for (let i = 0; i < 3; i++) {
        const r = Ro + 6 + i * 22, g = gapAngle + (i % 2 ? 0.1 : -0.1), x = C + Math.cos(g) * r, y = C + Math.sin(g) * r;
        if (Math.abs(x - C) > 490 || Math.abs(y - C) > 490) break;
        prints.push([x, y, g]);
        ctx.globalAlpha = 0.75 - i * 0.2; ctx.save(); ctx.translate(x, y); ctx.rotate(g);
        ctx.beginPath(); ctx.ellipse(12, 0, 24, 13, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(-26, 0, 11, 10, 0, 0, 7); ctx.fill(); ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

    // Floor.
    const floor = document.createElement('canvas'); floor.width = floor.height = N;
    const f = floor.getContext('2d')!;
    const base = { flagstone: '#77746c', slate: '#3d4248', tile: '#8c4c3a', boards: '#5e4530' }[a.floor];
    f.fillStyle = a.floor === 'boards' ? '#2a1f16' : a.floor === 'slate' ? base : '#3e3b36'; f.fillRect(0, 0, N, N);
    const tone = new THREE.Color();
    const cell = (x: number, y: number, w: number, h: number) => { tone.set(base).offsetHSL(0, (random() - 0.5) * 0.04, (random() - 0.5) * 0.07); f.fillStyle = tone.getStyle(); f.fillRect(x + 3, y + 3, w - 6, h - 6); };
    if (a.floor === 'flagstone') { let y = 0; while (y < N) { const h = 190 + random() * 110; let x = -random() * 150; while (x < N) { const w = 210 + random() * 190; cell(x, y, w, h); x += w; } y += h; } }
    if (a.floor === 'tile') for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) cell(x * 128, y * 128, 128, 128);
    if (a.floor === 'boards') for (let x = 0; x < 9; x++) { const w = N / 9; let y = -random() * 400; while (y < N) { const h = 500 + random() * 400; cell(x * w, y, w, h); y += h; } }
    for (let i = 0; i < 260 + mood.wear * 500; i++) { f.fillStyle = `rgba(${random() < 0.5 ? '20,18,16' : '190,185,170'},${0.03 + random() * 0.06})`; f.beginPath(); f.arc(random() * N, random() * N, 2 + random() * 26, 0, 7); f.fill(); }
    if (a.state === 'scorched') {
      const burn = f.createRadialGradient(C, C, 20, C, C, 330); burn.addColorStop(0, 'rgba(8,6,5,0.97)'); burn.addColorStop(0.45, 'rgba(14,10,8,0.8)'); burn.addColorStop(1, 'rgba(14,10,8,0)');
      f.fillStyle = burn; f.fillRect(0, 0, N, N);
    }
    f.globalAlpha = a.state === 'faded' ? 0.3 : a.state === 'scorched' ? 0.8 : mix(0.98, 0.72, mood.wear);
    f.drawImage(layer, 0, 0);
    f.globalAlpha = 1;
    if (a.state === 'scorched') {
      f.strokeStyle = 'rgba(10,8,6,0.5)'; f.lineCap = 'round';
      for (let i = 0; i < 26; i++) { const g = random() * 6.28, r0 = 90 + random() * 80, r1 = 260 + random() * 240; f.lineWidth = 6 + random() * 22; f.beginPath(); f.moveTo(C + Math.cos(g) * r0, C + Math.sin(g) * r0); f.lineTo(C + Math.cos(g) * r1, C + Math.sin(g) * r1); f.stroke(); }
    }
    const map = new THREE.CanvasTexture(floor); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    const glowColour = new THREE.Color().setHSL(mix(0.58, 0.04, mood.warmth), 0.9, 0.55);
    const top = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
    if (a.state === 'answered') { const glowMap = new THREE.CanvasTexture(layer); glowMap.colorSpace = THREE.SRGBColorSpace; top.emissiveMap = glowMap; top.emissive = glowColour; top.emissiveIntensity = 1.3; }
    const edge = new THREE.MeshStandardMaterial({ color: new THREE.Color(base).multiplyScalar(0.7), roughness: 1 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.07, W), [edge, edge, top, edge, edge, edge]);
    slab.position.y = 0.035; slab.castShadow = slab.receiveShadow = true;
    s.root.add(slab);
    const Y = 0.07;
    const at = (px: number, py: number): [number, number] => [(px - C) * k, (py - C) * k];

    // Candles at the points.
    const flames: THREE.Mesh[] = [];
    if (a.candles !== 'none') {
      const waxColour = { tallow: '#e6d9ae', black: '#1c1a1d', red: '#9a1c20' }[a.candles];
      const wax = s.material(waxColour, { roughness: 0.5 });
      const lit = a.state === 'working' || a.state === 'answered';
      const flameColour = a.state === 'answered' ? glowColour.clone().lerp(new THREE.Color('#ffffff'), 0.35) : new THREE.Color('#ffb040');
      const flameMat = new THREE.MeshStandardMaterial({ color: flameColour, emissive: flameColour, emissiveIntensity: 1.2 });
      const n = a.figure === 'octagram' ? 8 : points;
      for (let i = 0; i < n; i++) {
        const [px, py] = vertex(i, a.figure === 'spiral' ? Rm : Ri - 6, n), [x, z] = at(px, py);
        const g = Math.atan2(py - C, px - C);
        const inGap = a.state === 'scuffed' && Math.abs(Math.atan2(Math.sin(g - gapAngle), Math.cos(g - gapAngle))) < 0.75;
        if (a.state === 'faded' && random() < 0.6) { s.cylinder(0.05, 0.055, 0.006, [x, Y + 0.003, z], wax, 12); continue; } // only a wax ring left
        const h = (0.11 + random() * 0.22) * (a.state === 'working' || a.state === 'answered' ? 0.75 : 1) * mix(1.1, 0.7, mood.wear);
        s.cylinder(0.07 + random() * 0.02, 0.075 + random() * 0.02, 0.006, [x, Y + 0.003, z], wax, 12);
        if (inGap || (a.state === 'scorched' && random() < 0.5)) {
          const kick = 0.18 + random() * 0.25, kx = x + Math.cos(gapAngle) * kick, kz = z + Math.sin(gapAngle) * kick;
          if (Math.abs(kx) < W / 2 - 0.1 && Math.abs(kz) < W / 2 - 0.1) { const c = s.cylinder(0.034, 0.038, h, [kx, Y + 0.036, kz], wax, 12); c.rotation.set(Math.PI / 2, 0, random() * 3); }
          continue;
        }
        s.cylinder(0.034, 0.038, h, [x, Y + h / 2, z], wax, 12);
        for (let d = 0; d < 2; d++) { const dg = random() * 6.28; s.ball([0.007, 0.02 + random() * 0.02, 0.007], [x + Math.cos(dg) * 0.035, Y + h - 0.03 - random() * 0.02, z + Math.sin(dg) * 0.035], wax, 6); }
        s.cylinder(0.002, 0.002, 0.014, [x, Y + h + 0.007, z], s.material('#1a1410'), 5);
        if (lit) { const flame = s.ball([0.02, 0.034, 0.02], [x, Y + h + 0.045, z], flameMat, 8); flame.castShadow = false; flame.userData = { y: Y + h + 0.04, phase: random() * 6 }; flames.push(flame); }
      }
    }

    // Centre piece.
    const dark = s.material('#15120f', { roughness: 1 });
    if (a.centre === 'bowl') {
      const brass = s.material('#b08a3a', { metalness: 0.75, roughness: 0.4, side: THREE.DoubleSide });
      s.lathe([[0, 0.012], [0.05, 0.012], [0.055, 0], [0.07, 0], [0.065, 0.02], [0.13, 0.09], [0.17, 0.11], [0.175, 0.118]], brass, [0, Y, 0]);
      const live = a.state === 'working' || a.state === 'answered';
      s.cylinder(0.14, 0.12, 0.01, [0, Y + 0.095, 0], new THREE.MeshStandardMaterial({ color: live ? '#5a2a18' : '#9a968c', emissive: '#ff5a18', emissiveIntensity: live ? 0.8 : 0, roughness: 1 }), 16);
    } else if (a.centre === 'skull') {
      const bone = s.material('#dcd3b8', { roughness: 0.7 });
      s.ball([0.085, 0.08, 0.1], [0, Y + 0.105, -0.01], bone, 16);
      s.box([0.1, 0.06, 0.07], [0, Y + 0.045, 0.045], bone);
      for (const d of [-1, 1]) s.ball([0.022, 0.024, 0.02], [d * 0.035, Y + 0.095, 0.078], dark, 8);
      s.ball([0.01, 0.018, 0.012], [0, Y + 0.062, 0.088], dark, 6);
      for (let i = -2; i <= 2; i++) s.box([0.012, 0.022, 0.006], [i * 0.017, Y + 0.022, 0.08], bone);
    } else if (a.centre === 'book') {
      const cover = s.material('#4a2a20', { roughness: 0.85 });
      const page = s.material('#e4d8b6');
      for (const d of [-1, 1]) { const c = s.box([0.2, 0.014, 0.28], [d * 0.1, Y + 0.012, 0], cover); c.rotation.z = d * 0.08; const p = s.box([0.185, 0.022, 0.26], [d * 0.098, Y + 0.03, 0], page); p.rotation.z = d * 0.13; for (let i = 0; i < 7; i++) { const l = s.box([0.14, 0.001, 0.008], [d * 0.1, Y + 0.0425 + 0.004, -0.09 + i * 0.03], dark); l.rotation.z = d * 0.13; l.castShadow = false; } }
    } else if (a.centre === 'salt') {
      s.mesh(new THREE.ConeGeometry(0.13, 0.11, 20), s.material('#f6f4ee', { roughness: 1 }), [0, Y + 0.055, 0]);
    } else if (a.centre === 'flask') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#d6e8e0', transparent: true, opacity: 0.4, roughness: 0.08 });
      s.lathe([[0, 0], [0.06, 0.004], [0.1, 0.07], [0.09, 0.15], [0.03, 0.22], [0.026, 0.3], [0.034, 0.31]], glass, [0, Y, 0]);
      s.ball([0.085, 0.06, 0.085], [0, Y + 0.07, 0], s.material('#3a1020', { roughness: 0.3, emissive: glowColour, emissiveIntensity: a.state === 'answered' ? 0.9 : 0 }), 14).castShadow = false;
      s.cylinder(0.03, 0.027, 0.03, [0, Y + 0.315, 0], s.material('#8a1f1f'), 10);
    }
    if (a.tools) {
      const g = gapAngle + 2.4, r = 0.3 + random() * 0.25;
      const stub = s.cylinder(0.011, 0.011, 0.06, [Math.cos(g) * r, Y + 0.011, Math.sin(g) * r], s.material(ink, { roughness: 1 }), 8); stub.rotation.set(Math.PI / 2, 0, random() * 3);
      const kx = Math.cos(g + 0.5) * (r + 0.12), kz = Math.sin(g + 0.5) * (r + 0.12), turn = random() * 3;
      const knife = new THREE.Group(); knife.position.set(kx, Y + 0.008, kz); knife.rotation.y = turn; s.root.add(knife);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.004, 0.026), s.material('#c9ccd0', { metalness: 0.9, roughness: 0.25 })); blade.position.x = 0.085; blade.castShadow = true;
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), s.material('#1c1612')); grip.rotation.z = Math.PI / 2; grip.position.x = -0.05; grip.castShadow = true;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.06), s.material('#b08a3a', { metalness: 0.7 }));
      knife.add(blade, grip, guard);
    }
    void prints;

    const speed = mix(0.5, 2.4, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const flame of flames) { const w = Math.sin(time * speed * 6 + flame.userData.phase); flame.scale.y = 0.045 * (1 + 0.2 * w); flame.position.y = flame.userData.y + 0.004 * w; }
        if (a.state === 'answered') top.emissiveIntensity = 1.3 + 0.5 * Math.sin(time * speed * 1.7);
      },
    });
  },
});
