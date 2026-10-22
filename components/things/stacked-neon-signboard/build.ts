import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const TRADES = {
  noodles: 'A noodle shop: a steaming bowl and chopsticks.',
  clinic: 'A back-alley clinic: a bold medical cross.',
  pawn: 'A pawnbroker: three hanging balls.',
  'love-hotel': 'A love hotel: a heart and an hourly rate.',
  bar: 'A bar: a tilted cocktail glass.',
  pachinko: 'A gambling parlour: a lucky star and sevens.',
  repair: 'A repair stall for machines and bodies: a cog.',
  optics: 'An eye shop or surveillance broker: a single staring eye.',
} as const;
type Trade = keyof typeof TRADES;
const TRADE_KEYS = Object.keys(TRADES) as Trade[];

type Ctx = CanvasRenderingContext2D;
const ICONS: Record<Trade, (c: Ctx, x: number, y: number, r: number) => void> = {
  noodles(c, x, y, r) {
    c.beginPath(); c.arc(x, y + r * 0.1, r * 0.8, 0, Math.PI); c.closePath(); c.fill();
    c.fillRect(x - r * 0.35, y + r * 0.8, r * 0.7, r * 0.14);
    for (const k of [-0.4, 0, 0.4]) { c.beginPath(); c.moveTo(x + k * r, y - r * 0.15); c.bezierCurveTo(x + k * r - r * 0.25, y - r * 0.45, x + k * r + r * 0.25, y - r * 0.65, x + k * r, y - r * 0.95); c.stroke(); }
  },
  clinic(c, x, y, r) { c.fillRect(x - r * 0.28, y - r * 0.85, r * 0.56, r * 1.7); c.fillRect(x - r * 0.85, y - r * 0.28, r * 1.7, r * 0.56); },
  pawn(c, x, y, r) {
    for (const [dx, dy] of [[0, -0.5], [-0.52, 0.4], [0.52, 0.4]]) { c.beginPath(); c.arc(x + dx * r, y + dy * r, r * 0.36, 0, Math.PI * 2); c.fill(); }
    c.beginPath(); c.moveTo(x - r * 0.52, y + r * 0.1); c.lineTo(x, y - r * 0.9); c.lineTo(x + r * 0.52, y + r * 0.1); c.stroke();
  },
  'love-hotel'(c, x, y, r) {
    c.beginPath(); c.moveTo(x, y + r * 0.85);
    c.bezierCurveTo(x - r * 1.5, y - r * 0.2, x - r * 0.6, y - r * 1.2, x, y - r * 0.35);
    c.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.5, y - r * 0.2, x, y + r * 0.85); c.fill();
  },
  bar(c, x, y, r) {
    c.beginPath(); c.moveTo(x - r * 0.8, y - r * 0.7); c.lineTo(x + r * 0.8, y - r * 0.7); c.lineTo(x, y + r * 0.15); c.closePath(); c.fill();
    c.fillRect(x - r * 0.06, y + r * 0.1, r * 0.12, r * 0.65); c.fillRect(x - r * 0.45, y + r * 0.72, r * 0.9, r * 0.12);
    c.beginPath(); c.arc(x + r * 0.5, y - r * 0.85, r * 0.18, 0, Math.PI * 2); c.fill();
  },
  pachinko(c, x, y, r) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.42 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    c.closePath(); c.fill();
  },
  repair(c, x, y, r) {
    c.beginPath(); c.arc(x, y, r * 0.5, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55); c.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9); c.stroke(); }
    c.beginPath(); c.arc(x, y, r * 0.16, 0, Math.PI * 2); c.fill();
  },
  optics(c, x, y, r) {
    c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x, y - r * 0.95, x + r, y); c.quadraticCurveTo(x, y + r * 0.95, x - r, y); c.stroke();
    c.beginPath(); c.arc(x, y, r * 0.32, 0, Math.PI * 2); c.fill();
  },
};

export default defineThing({
  questions: {
    trade: choice('What does the biggest sign advertise?', TRADES),
    neighbours: choice('What do the other signs in the stack advertise?', {
      same: 'The same business again and again, in different sizes.',
      vice: 'Bars, love hotels and gambling: the night trade.',
      trades: 'Clinics, pawnbrokers, repair stalls: the survival trade.',
      jumble: 'A jumble of everything, no two alike.',
    }),
    style: choice('How are the signs made?', {
      neon: 'Bent glass neon tubing glowing on dark boxes.',
      lightbox: 'Backlit plastic lightboxes in loud flat colours.',
      led: 'Coarse LED dot-matrix panels.',
      painted: 'Hand-painted boards lit by little gooseneck lamps.',
    }),
    script: choice('What does the invented lettering look like?', {
      blocks: 'Dense square characters built of strokes and boxes.',
      curls: 'Looping cursive hooks and dots.',
      runes: 'Spiky angular staves with branching ticks.',
    }),
    stack: score('How tall is the stack?', ['Two signs', 'Four signs', 'Six signs rising out of sight']),
    failure: choice('Which part has failed?', {
      none: 'Nothing: every sign is burning steadily.',
      flicker: 'One sign stutters on and off.',
      'dead-box': 'One box in the middle is completely dark.',
      'half-lit': 'Half of the biggest sign has gone out, leaving a broken word.',
      hanging: 'One box has dropped a fixing and hangs crooked.',
      blackout: 'A power cut: every sign is dark.',
    }),
    mount: choice('What holds it up?', {
      pole: 'A steel pole bolted to the pavement.',
      wall: 'Brackets on a stained concrete pillar with pipes running up it.',
      scaffold: 'A cross-braced scaffold frame between two posts.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const hot = ['#ff3d7f', '#ff7a1a', '#ffd23a', '#ff4a3d'], cold = ['#2fe6ff', '#8a7bff', '#3dffb0', '#e94bff'];
    const glowColour = () => pick(random() < mood.warmth * 0.7 + 0.15 ? hot : cold);
    const steel = s.material('#4a4f55', { metalness: 0.5, roughness: 0.6 });
    const dark = s.material('#1c1d22', { roughness: 0.7 });

    const count = 2 + Math.round(a.stack * 4);
    const pool: Trade[] = a.neighbours === 'same' ? [a.trade]
      : a.neighbours === 'vice' ? ['bar', 'love-hotel', 'pachinko']
      : a.neighbours === 'trades' ? ['clinic', 'pawn', 'repair', 'optics']
      : TRADE_KEYS;
    const mainIndex = count > 2 ? 1 : 0; // the biggest is near the top
    const failIndex = a.failure === 'half-lit' ? mainIndex : (mainIndex + 1 + Math.floor(random() * (count - 1))) % count;

    const glyph = (c: Ctx, x: number, y: number, size: number) => {
      const u = size / 2 * 0.82;
      c.lineWidth = size * (a.style === 'painted' ? 0.1 : 0.13);
      if (a.script === 'blocks') {
        const lines = 3 + Math.floor(random() * 4);
        for (let i = 0; i < lines; i++) {
          const p = (Math.floor(random() * 3) - 1) * u, from = (Math.floor(random() * 2) - 1) * u, to = from + (1 + Math.floor(random() * 2)) * u;
          c.beginPath();
          if (random() < 0.5) { c.moveTo(x + from, y + p); c.lineTo(x + Math.min(to, u), y + p); } else { c.moveTo(x + p, y + from); c.lineTo(x + p, y + Math.min(to, u)); }
          c.stroke();
        }
        if (random() < 0.5) c.strokeRect(x - u * (random() < 0.5 ? 1 : 0.5), y - u * 0.5, u, u * (0.5 + random() * 0.5));
        if (random() < 0.4) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + (random() < 0.5 ? -u : u), y + u); c.stroke(); }
      } else if (a.script === 'curls') {
        for (let i = 0; i < 2 + Math.floor(random() * 2); i++) {
          const start = random() * 6.28;
          c.beginPath(); c.arc(x + (random() - 0.5) * u, y + (random() - 0.5) * u, u * (0.3 + random() * 0.45), start, start + 2.4 + random() * 2.6); c.stroke();
        }
        c.beginPath(); c.arc(x + (random() - 0.5) * u * 1.4, y - u * 0.85, size * 0.07, 0, 6.28); c.fill();
      } else {
        const lean = (random() - 0.5) * u * 0.5;
        c.beginPath(); c.moveTo(x + lean, y - u); c.lineTo(x - lean, y + u); c.stroke();
        for (let i = 0; i < 2 + Math.floor(random() * 3); i++) {
          const t = random() * 2 - 1, side = random() < 0.5 ? -1 : 1;
          c.beginPath(); c.moveTo(x - lean * t, y + t * u); c.lineTo(x - lean * t + side * u * 0.8, y + t * u + (random() < 0.5 ? -1 : 1) * u * 0.5); c.stroke();
        }
      }
    };

    interface Sign { material: THREE.MeshStandardMaterial; base: number; lit: boolean; box: number }
    const signs: Sign[] = [];
    const paint = (w: number, h: number, trade: Trade, index: number, round: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = Math.min(640, Math.max(96, Math.round(256 * h / w)));
      const c = canvas.getContext('2d')!;
      const W = canvas.width, Hh = canvas.height;
      const primary = glowColour();
      let secondary = glowColour();
      if (secondary === primary) secondary = '#ffffff';
      const board = pick(['#e9dfc4', '#a9372c', '#2f5d52', '#d9b23c', '#24385f']);
      const bg = { neon: '#15131c', lightbox: primary, led: '#0b0b0d', painted: board }[a.style];
      const ink = { neon: primary, lightbox: pick(['#ffffff', '#fff6c8', '#1a1420']), led: primary, painted: board === '#e9dfc4' || board === '#d9b23c' ? '#7a1f1a' : '#f1e9d2' }[a.style];
      const accent = { neon: secondary, lightbox: '#ffffff', led: secondary, painted: ink }[a.style];
      c.fillStyle = bg; c.fillRect(0, 0, W, Hh);
      if (a.style === 'lightbox') { c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 8; c.strokeRect(10, 10, W - 20, Hh - 20); }
      if (a.style === 'painted') { c.strokeStyle = ink; c.lineWidth = 5; c.strokeRect(12, 12, W - 24, Hh - 24); }
      c.lineCap = 'round'; c.lineJoin = 'round';
      if (a.style === 'neon') { c.shadowColor = primary; c.shadowBlur = 16; }
      const vertical = Hh > W * 1.25;
      const cells = round ? 1 : vertical ? Math.max(2, Math.min(5, Math.round(Hh / W * 1.25))) : Math.max(2, Math.min(4, Math.round(W / Hh * 1.2)));
      const cell = vertical ? Math.min(W * 0.72, (Hh - 30) / cells) : Math.min(Hh * 0.72, (W - 30) / cells);
      const iconAt = round ? 0 : random() < 0.75 ? 0 : -1;
      for (let i = 0; i < cells; i++) {
        const x = vertical ? W / 2 : W / 2 + (i - (cells - 1) / 2) * cell, y = vertical ? Hh / 2 + (i - (cells - 1) / 2) * cell : Hh / 2;
        if (i === iconAt) {
          c.fillStyle = c.strokeStyle = accent; if (a.style === 'neon') c.shadowColor = accent;
          c.lineWidth = cell * 0.09;
          ICONS[trade](c, x, y, cell * (round ? 0.36 : 0.4));
        } else {
          c.fillStyle = c.strokeStyle = ink; if (a.style === 'neon') c.shadowColor = ink;
          glyph(c, x, y, cell * 0.92);
        }
      }
      c.shadowBlur = 0;
      if (a.style === 'led') { c.fillStyle = '#0b0b0d'; for (let x = 0; x < W; x += 7) c.fillRect(x, 0, 2.4, Hh); for (let y = 0; y < Hh; y += 7) c.fillRect(0, y, W, 2.4); }
      // Grime and rust runs from the top edge.
      for (let i = 0; i < Math.round(mood.wear * 14); i++) {
        const x = random() * W, length = Hh * (0.15 + random() * 0.5), run = c.createLinearGradient(0, 0, 0, length);
        run.addColorStop(0, 'rgba(40,24,14,0.55)'); run.addColorStop(1, 'rgba(40,24,14,0)');
        c.fillStyle = run; c.fillRect(x, 0, 4 + random() * 10, length);
      }
      if (a.failure === 'half-lit' && index === mainIndex) {
        c.fillStyle = 'rgba(8,8,12,0.86)';
        if (vertical) c.fillRect(0, random() < 0.5 ? 0 : Hh * 0.5, W, Hh * 0.5); else c.fillRect(random() < 0.5 ? 0 : W * 0.5, 0, W * 0.5, Hh);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const dead = a.failure === 'blackout' || (a.failure === 'dead-box' && index === failIndex) || (a.failure === 'hanging' && index === failIndex && random() < 0.6);
      const base = (a.style === 'painted' ? 0.22 : mix(0.8, 1.2, (mood.cheer + mood.energy) / 2)) * (dead ? 0.02 : 1);
      const material = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: '#ffffff', emissiveIntensity: base, color: dead ? '#55565c' : a.style === 'painted' ? '#ffffff' : '#9a9a9a', roughness: 0.5 });
      signs.push({ material, base, lit: !dead, box: index });
      return { material, primary, dead };
    };

    // --- Lay out the stack from the top down --------------------------------------------------
    const clearance = { pole: 1.15, wall: 1.0, scaffold: 0.6 }[a.mount];
    const shapes = Array.from({ length: count }, (_unused, index) => {
      const main = index === mainIndex;
      const tall = main ? random() < 0.7 : random() < 0.4;
      const round = !main && !tall && random() < 0.22;
      const w = round ? 0.62 + random() * 0.14 : main ? mix(0.75, 0.95, random()) : mix(0.5, 1.1, random());
      const h = round ? w : tall ? w * mix(1.3, main ? 1.9 : 1.6, random()) : w * mix(0.36, 0.62, random());
      return { w, h, round, main, trade: main ? a.trade : pick(pool) };
    });
    const total = shapes.reduce((sum, shape) => sum + shape.h + 0.07, 0);
    const maxW = Math.max(...shapes.map((shape) => shape.w));
    let y = clearance + total;
    const depth = 0.2;
    shapes.forEach((shape, index) => {
      const { w, h } = shape;
      const face = paint(w, h, shape.trade, index, shape.round);
      const group = new THREE.Group();
      const offset = a.mount === 'scaffold' ? (maxW - w) * random() : random() < 0.3 ? 0.1 + random() * 0.12 : 0.06;
      group.position.set(offset + w / 2, y - h / 2, 0);
      s.root.add(group);
      const frame = random() < 0.5 ? dark : steel;
      if (shape.round) {
        const drum = s.cylinder(w / 2, w / 2, depth, [0, 0, 0], frame, 32); drum.rotation.x = Math.PI / 2; group.add(drum);
        for (const side of [-1, 1]) { const disc = s.mesh(new THREE.CircleGeometry(w / 2 - 0.025, 32), face.material, [0, 0, side * (depth / 2 + 0.003)]); if (side < 0) disc.rotation.y = Math.PI; group.add(disc); }
      } else {
        group.add(s.box([w, h, depth], [0, 0, 0], frame));
        for (const side of [-1, 1]) { const plane = s.mesh(new THREE.PlaneGeometry(w - 0.05, h - 0.05), face.material, [0, 0, side * (depth / 2 + 0.003)]); if (side < 0) plane.rotation.y = Math.PI; group.add(plane); }
        if (a.style === 'neon') {
          const tube = new THREE.MeshStandardMaterial({ color: face.primary, emissive: face.primary, emissiveIntensity: face.dead ? 0.02 : 1.3, roughness: 0.4 });
          if (face.dead) tube.color.set('#6a6a70');
          signs.push({ material: tube, base: tube.emissiveIntensity, lit: !face.dead, box: index });
          const hw = w / 2 - 0.012, hh = h / 2 - 0.012, z = depth / 2 + 0.02;
          for (const [from, to] of [[[-hw, hh], [hw, hh]], [[hw, hh], [hw, -hh]], [[hw, -hh], [-hw, -hh]], [[-hw, -hh], [-hw, hh]]] as const)
            group.add(s.rod([from[0], from[1], z], [to[0], to[1], z], 0.011, tube));
        }
        if (a.style === 'painted') {
          const lampOn = a.failure !== 'blackout';
          const bulb = new THREE.MeshStandardMaterial({ color: '#fff1c2', emissive: '#ffd98a', emissiveIntensity: lampOn ? 1.5 : 0 });
          for (const lx of w > 0.7 ? [-w * 0.25, w * 0.25] : [0]) {
            group.add(s.rod([lx, h / 2, 0.02], [lx, h / 2 + 0.1, depth / 2 + 0.16], 0.008, steel));
            const shade = s.mesh(new THREE.ConeGeometry(0.055, 0.07, 12, 1, true), s.material('#2e5a4c', { side: THREE.DoubleSide }), [lx, h / 2 + 0.08, depth / 2 + 0.17]); shade.rotation.x = -0.9; group.add(shade);
            group.add(s.ball([0.022, 0.022, 0.022], [lx, h / 2 + 0.06, depth / 2 + 0.165], bulb, 8));
          }
        }
      }
      // Bracket arms back to the spine.
      for (const dy of shape.round ? [0] : [h / 2 - 0.06, -h / 2 + 0.06]) s.rod([-0.02, y - h / 2 + dy, 0], [offset + (shape.round ? w * 0.1 : 0.02), y - h / 2 + dy, 0], 0.016, steel);
      if (a.failure === 'hanging' && index === failIndex) {
        const drop = 0.22 + random() * 0.18;
        group.position.x += Math.sin(drop) * h / 2; group.position.y -= w / 2 * Math.sin(drop) + 0.03; group.rotation.z = -drop; group.rotation.y = (random() - 0.5) * 0.3;
        s.rod([offset + w * 0.9, y + 0.02, 0], [offset + w * 0.86, y - 0.16, 0.03], 0.006, steel);
        const spark = new THREE.MeshStandardMaterial({ color: '#fff7c4', emissive: '#ffe36a', emissiveIntensity: 2 });
        for (let i = 0; i < 5; i++) s.ball([0.014, 0.014, 0.014], [offset + w + (random() - 0.5) * 0.2, y - random() * 0.25, (random() - 0.5) * 0.2], spark, 6).castShadow = false;
      }
      y -= h + 0.07;
    });

    // --- Whatever holds it up -----------------------------------------------------------------
    const top = clearance + total + 0.15;
    if (a.mount === 'wall') {
      const concrete = s.material('#8d8a86', { roughness: 0.95 });
      s.box([0.34, top + 0.35, 0.9], [-0.22, (top + 0.35) / 2, 0], concrete);
      s.box([0.36, 0.1, 0.94], [-0.22, top + 0.1, 0], s.material('#6f6c69', { roughness: 0.95 }));
      for (const z of [-0.33, 0.36]) s.cylinder(0.03, 0.03, top + 0.2, [-0.03, (top + 0.2) / 2, z], s.material(z < 0 ? '#5e3c2c' : '#3f4a50', { metalness: 0.3 }), 10);
      s.box([0.2, 0.3, 0.14], [0.0, 0.7, -0.2], steel);
      for (let i = 0; i < 3 + Math.round(mood.wear * 4); i++) s.box([0.345, 0.5 + random() * 0.8, 0.05 + random() * 0.08], [-0.22, top * (0.3 + random() * 0.6), (random() - 0.5) * 0.7], s.material('#6e6a63', { roughness: 1 }));
      s.box([0.3, 0.26, 0.5], [0.1, 0.45, 0.1], s.material('#c9c6bb', { roughness: 0.6 }));
      s.cylinder(0.1, 0.1, 0.02, [0.255, 0.45, 0.1], dark, 16).rotation.z = Math.PI / 2;
      s.cylinder(0.025, 0.025, top - clearance + 0.2, [-0.02, clearance + (top - clearance) / 2, 0], steel, 10);
    } else if (a.mount === 'pole') {
      s.cylinder(0.05, 0.065, top, [-0.02, top / 2, 0], steel, 14);
      s.cylinder(0.16, 0.18, 0.04, [-0.02, 0.02, 0], steel, 16);
      for (let i = 0; i < 4; i++) s.cylinder(0.016, 0.016, 0.03, [-0.02 + Math.cos(i * 1.57 + 0.78) * 0.13, 0.05, Math.sin(i * 1.57 + 0.78) * 0.13], dark, 6);
      s.box([0.16, 0.24, 0.12], [-0.02, 1.05, 0.1], dark);
      s.ball([0.07, 0.03, 0.07], [-0.02, top, 0], steel, 12);
    } else {
      for (const x of [-0.04, maxW + 0.16]) { s.cylinder(0.03, 0.03, top, [x, top / 2, -0.03], steel, 10); s.box([0.14, 0.03, 0.14], [x, 0.015, -0.03], steel); }
      for (let level = 0; level < top - 0.4; level += 1.1) {
        const upper = Math.min(level + 1.1, top - 0.1);
        s.rod([-0.04, level + 0.1, -0.12], [maxW + 0.16, upper, -0.12], 0.012, steel);
        s.rod([maxW + 0.16, level + 0.1, -0.12], [-0.04, upper, -0.12], 0.012, steel);
        s.rod([-0.04, upper, -0.03], [maxW + 0.16, upper, -0.03], 0.016, steel);
      }
    }
    // Cables: loops down the spine and a few loose ends.
    const cable = s.material('#16171a', { roughness: 0.8 });
    const loops = 2 + Math.round(mood.density * 4);
    for (let i = 0; i < loops; i++) {
      const from = clearance + random() * total, to = Math.max(0.3, from - 0.5 - random() * 1.2), sag = 0.12 + random() * 0.25, z = (random() - 0.5) * 0.12;
      s.tube([[0.02, from, z], [sag, (from + to) / 2 + 0.1, z + 0.1], [sag * 0.8, to + 0.05, z + 0.12], [0.0, to, z]], 0.008, cable);
    }
    if (mood.density > 0.35) s.tube([[0.1, clearance + 0.02, 0.05], [0.25, clearance - 0.25, 0.08], [0.22, clearance - 0.5 - random() * 0.3, 0.02]], 0.007, cable);

    const flickers = a.failure === 'flicker' ? signs.filter((sign) => sign.box === failIndex) : [];
    const rate = mix(0.6, 2.2, mood.energy);
    for (const sign of flickers) sign.material.emissiveIntensity = sign.base * 0.3;
    return s.finish({
      footprint: 0.45,
      update: (_dt, time) => {
        const t = time * rate;
        const on = Math.sin(t * 23) + Math.sin(t * 7.3) + Math.sin(t * 1.7) > 0.2;
        for (const sign of flickers) sign.material.emissiveIntensity = sign.base * (on ? 1 : 0.08);
        // A slow hum of brightness over the whole stack.
        for (const sign of signs) if (sign.lit && !flickers.includes(sign)) sign.material.emissiveIntensity = sign.base * (0.94 + 0.06 * Math.sin(time * 9 + sign.base * 40));
      },
    });
  },
});
