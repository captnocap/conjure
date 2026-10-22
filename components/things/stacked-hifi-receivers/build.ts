import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { painted, pick } from './util';

type Face = 'receiver' | 'deck' | 'eq' | 'cd' | 'amp' | 'boombox';
type Style = { face: string; ink: string; trim: string; lampA: string; lampB: string; shell: string; wood: boolean };
type Knob = { x: number; y: number; r: number };
type PriceMode = 'tape' | 'stickers' | 'as-is' | 'none';

const PRICES = ['$15', '$20', '$25', '$35', '$40', '$60', '$75', '$8'];

/** Paint one front panel and, when it is powered, the matching glow map. Coordinates are in a 0..1 box. */
function paintFace(kind: Face, style: Style, lit: boolean, price: PriceMode, wear: number, random: () => number, aspect: number) {
  const W = 512, H = Math.max(64, Math.round(W / aspect));
  const knobs: Knob[] = [];
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = W;
  glowCanvas.height = H;
  const glow = glowCanvas.getContext('2d')!;
  glow.fillStyle = '#000';
  glow.fillRect(0, 0, W, H);
  const map = painted(W, H, (ctx) => {
    const X = (v: number) => v * W, Y = (v: number) => v * H;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const base = new THREE.Color(style.face);
    g.addColorStop(0, '#' + base.clone().offsetHSL(0, 0, 0.06).getHexString());
    g.addColorStop(1, '#' + base.clone().offsetHSL(0, 0, -0.07).getHexString());
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let y = 2; y < H; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const lamp = (x: number, y: number, w: number, h: number, colour: string, detail?: (c: CanvasRenderingContext2D) => void) => {
      const dim = '#' + new THREE.Color(colour).multiplyScalar(0.16).getHexString();
      ctx.fillStyle = '#0b0b0d';
      ctx.fillRect(X(x) - 3, Y(y) - 3, X(w) + 6, Y(h) + 6);
      ctx.fillStyle = lit ? colour : dim;
      ctx.fillRect(X(x), Y(y), X(w), Y(h));
      detail?.(ctx);
      if (lit) { glow.fillStyle = colour; glow.fillRect(X(x), Y(y), X(w), Y(h)); detail?.(glow); }
    };
    const dial = (x: number, y: number, r: number, big = false) => {
      const missing = random() < wear * 0.22;
      ctx.beginPath();
      ctx.arc(X(x), Y(y), r * H, 0, 7);
      ctx.fillStyle = missing ? '#101012' : style.trim;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.stroke();
      if (!missing) {
        const t = random() * 5;
        ctx.beginPath();
        ctx.moveTo(X(x), Y(y));
        ctx.lineTo(X(x) + Math.cos(t) * r * H, Y(y) + Math.sin(t) * r * H);
        ctx.strokeStyle = style.ink;
        ctx.stroke();
        if (big) knobs.push({ x, y, r: r * H / W });
      }
    };
    const meter = (x: number, y: number, w: number, h: number) =>
      lamp(x, y, w, h, style.lampA, (c) => {
        c.strokeStyle = '#1a1a1a';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(X(x + w / 2), Y(y + h * 1.25), Y(h), Math.PI * 1.2, Math.PI * 1.8);
        c.stroke();
        c.strokeStyle = '#b3201d';
        c.beginPath();
        c.moveTo(X(x + w / 2), Y(y + h));
        c.lineTo(X(x + w / 2) + (random() - 0.5) * X(w) * 0.6, Y(y + h * 0.2));
        c.stroke();
      });
    const buttons = (x: number, y: number, n: number, w: number, h: number) => {
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i === 0 && kind === 'deck' ? '#b3201d' : style.trim;
        ctx.fillRect(X(x + i * w * 1.18), Y(y), X(w), Y(h));
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.strokeRect(X(x + i * w * 1.18), Y(y), X(w), Y(h));
      }
    };
    const word = (text: string, x: number, y: number, size: number) => {
      ctx.fillStyle = style.ink;
      ctx.font = `bold ${size * H}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, X(x), Y(y));
    };
    const brand = pick(random, ['SONARA', 'KENMORE X', 'PIONEX', 'MARANT', 'AKIO', 'TEKNIK', 'SANSEI']);

    if (kind === 'receiver') {
      lamp(0.04, 0.12, 0.66, 0.36, style.lampA, (c) => {
        c.fillStyle = '#1a1a1a';
        c.font = `bold ${H * 0.13}px sans-serif`;
        c.textAlign = 'center';
        ['88', '92', '96', '100', '104', '108'].forEach((n, i) => c.fillText(n, X(0.1 + i * 0.105), Y(0.27)));
        for (let i = 0; i < 44; i++) c.fillRect(X(0.07 + i * 0.0138), Y(0.34), 2, H * (i % 4 ? 0.05 : 0.1));
        c.fillStyle = '#d1201b';
        c.fillRect(X(0.1 + random() * 0.5), Y(0.14), 4, Y(0.32));
      });
      dial(0.86, 0.36, 0.26, true);
      for (let i = 0; i < 5; i++) dial(0.1 + i * 0.105, 0.76, 0.1);
      buttons(0.62, 0.7, 4, 0.04, 0.14);
      word(brand, 0.74, 0.86, 0.11);
    } else if (kind === 'deck') {
      ctx.fillStyle = '#0d0d10';
      ctx.fillRect(X(0.06), Y(0.12), X(0.36), Y(0.56));
      ctx.fillStyle = '#d8d2bd';
      ctx.fillRect(X(0.1), Y(0.2), X(0.28), Y(0.3));
      ctx.fillStyle = '#0d0d10';
      for (const cx of [0.17, 0.31]) { ctx.beginPath(); ctx.arc(X(cx), Y(0.38), H * 0.09, 0, 7); ctx.fill(); }
      buttons(0.06, 0.76, 6, 0.05, 0.16);
      meter(0.5, 0.16, 0.17, 0.34);
      meter(0.7, 0.16, 0.17, 0.34);
      dial(0.56, 0.76, 0.11);
      dial(0.68, 0.76, 0.11);
      dial(0.92, 0.72, 0.15, true);
      word(brand, 0.5, 0.07, 0.09);
    } else if (kind === 'eq') {
      for (let i = 0; i < 10; i++) {
        const x = 0.08 + i * 0.075;
        ctx.fillStyle = '#0d0d10';
        ctx.fillRect(X(x), Y(0.14), 5, Y(0.72));
        ctx.fillStyle = style.trim;
        ctx.fillRect(X(x) - 8, Y(0.18 + random() * 0.6), 21, Y(0.1));
      }
      lamp(0.84, 0.2, 0.12, 0.5, style.lampB, (c) => {
        c.fillStyle = '#0b0b0d';
        for (let i = 0; i < 6; i++) c.fillRect(X(0.84), Y(0.2 + i * 0.085), X(0.12), 3);
      });
    } else if (kind === 'cd') {
      ctx.fillStyle = '#0d0d10';
      ctx.fillRect(X(0.06), Y(0.2), X(0.42), Y(0.3));
      lamp(0.56, 0.2, 0.26, 0.34, style.lampB, (c) => {
        c.fillStyle = '#06140a';
        c.font = `bold ${H * 0.26}px monospace`;
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        c.fillText(` ${1 + Math.floor(random() * 12)}  0:${10 + Math.floor(random() * 49)}`, X(0.57), Y(0.37));
      });
      buttons(0.56, 0.7, 6, 0.05, 0.14);
      dial(0.92, 0.36, 0.14);
      word(brand, 0.06, 0.78, 0.13);
    } else if (kind === 'amp') {
      dial(0.2, 0.5, 0.36, true);
      lamp(0.4, 0.2, 0.3, 0.2, style.lampB, (c) => {
        c.fillStyle = '#0b0b0d';
        for (let i = 0; i < 16; i++) c.fillRect(X(0.4 + i * 0.019), Y(0.2), 3, Y(0.2));
      });
      buttons(0.4, 0.62, 5, 0.045, 0.16);
      dial(0.8, 0.5, 0.13);
      dial(0.91, 0.5, 0.13);
      lamp(0.045, 0.14, 0.02, 0.1, '#ff3b30');
      word(brand, 0.72, 0.84, 0.11);
    } else {
      // boombox: two drivers, a cassette door and a tuner strip
      for (const cx of [0.17, 0.83]) {
        for (const [r, c] of [[0.36, style.trim], [0.32, '#101012'], [0.25, '#26262a'], [0.09, '#0c0c0e']] as const) {
          ctx.beginPath();
          ctx.arc(X(cx), Y(0.56), H * r, 0, 7);
          ctx.fillStyle = c;
          ctx.fill();
        }
      }
      lamp(0.34, 0.1, 0.32, 0.14, style.lampA, (c) => {
        c.fillStyle = '#1a1a1a';
        for (let i = 0; i < 26; i++) c.fillRect(X(0.35 + i * 0.0115), Y(0.14), 2, H * (i % 4 ? 0.04 : 0.08));
        c.fillStyle = '#d1201b';
        c.fillRect(X(0.36 + random() * 0.26), Y(0.1), 3, Y(0.14));
      });
      ctx.fillStyle = '#0d0d10';
      ctx.fillRect(X(0.36), Y(0.34), X(0.28), Y(0.36));
      ctx.fillStyle = '#d8d2bd';
      ctx.fillRect(X(0.39), Y(0.42), X(0.22), Y(0.18));
      ctx.fillStyle = '#0d0d10';
      for (const cx of [0.45, 0.55]) { ctx.beginPath(); ctx.arc(X(cx), Y(0.51), H * 0.05, 0, 7); ctx.fill(); }
      buttons(0.36, 0.78, 6, 0.04, 0.12);
      lamp(0.34, 0.27, 0.32, 0.035, style.lampB, (c) => {
        c.fillStyle = '#0b0b0d';
        for (let i = 0; i < 12; i++) c.fillRect(X(0.34 + i * 0.0267), Y(0.27), 3, Y(0.035));
      });
    }
    // dust and scratches
    ctx.fillStyle = `rgba(150,140,120,${wear * 0.3})`;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(255,255,255,${wear * 0.35})`;
    for (let i = 0; i < wear * 10; i++) { ctx.beginPath(); const sx = random() * W, sy = random() * H; ctx.moveTo(sx, sy); ctx.lineTo(sx + (random() - 0.5) * 120, sy + (random() - 0.5) * 30); ctx.stroke(); }
    // the price
    if (price !== 'none' && random() < 0.85) {
      const text = price === 'as-is' ? 'AS IS' : pick(random, PRICES);
      const px = X(0.2 + random() * 0.5), py = Y(0.3 + random() * 0.4);
      for (const c of [ctx, glow]) {
        c.save();
        c.translate(px, py);
        c.rotate((random() - 0.5) * 0.3);
        if (price === 'stickers') {
          c.fillStyle = c === glow ? '#000' : pick(random, ['#f6ff3a', '#ff5fb0', '#63ff6a', '#ff8a2a']);
          c.beginPath();
          for (let i = 0; i < 20; i++) { const r = H * (i % 2 ? 0.2 : 0.29), t = (i / 20) * 6.283; c.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
          c.fill();
        } else {
          c.fillStyle = c === glow ? '#000' : price === 'as-is' ? '#f6f3ea' : '#e2cf9a';
          c.fillRect(-H * 0.42, -H * 0.16, H * 0.84, H * 0.32);
        }
        if (c === ctx) {
          c.fillStyle = price === 'as-is' ? '#b3201d' : '#1d1d1d';
          c.font = `italic bold ${H * 0.24}px cursive, sans-serif`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(text, 0, 2);
        }
        c.restore();
      }
    }
  });
  let glowTexture: THREE.CanvasTexture | null = null;
  if (lit) {
    glowTexture = new THREE.CanvasTexture(glowCanvas);
    glowTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return { map, glow: glowTexture, knobs };
}

function paintSpeaker(style: Style, bare: boolean, torn: boolean, random: () => number) {
  return painted(256, 512, (ctx, w, h) => {
    ctx.fillStyle = style.wood ? '#7a4a28' : '#1c1c1f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = bare ? '#26262a' : style.wood ? '#3a2e22' : '#111113';
    ctx.fillRect(14, 14, w - 28, h - 28);
    if (!bare) {
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      for (let y = 16; y < h - 14; y += 4) { ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(w - 14, y); ctx.stroke(); }
      ctx.fillStyle = style.trim;
      ctx.fillRect(w / 2 - 26, h - 46, 52, 12);
      return;
    }
    const cone = (cx: number, cy: number, r: number) => {
      const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      g.addColorStop(0, '#0c0c0e');
      g.addColorStop(0.3, '#3a3a3e');
      g.addColorStop(0.85, '#1a1a1c');
      g.addColorStop(1, '#8a8a8a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 7);
      ctx.fill();
    };
    cone(w / 2, h * 0.68, w * 0.36);
    cone(w / 2, h * 0.33, w * 0.2);
    cone(w / 2, h * 0.13, w * 0.1);
    if (torn) {
      ctx.fillStyle = '#050506';
      ctx.beginPath();
      ctx.moveTo(w / 2, h * 0.68);
      const t0 = random() * 6;
      for (let i = 0; i <= 5; i++) ctx.lineTo(w / 2 + Math.cos(t0 + i * 0.2) * w * (i % 2 ? 0.33 : 0.24), h * 0.68 + Math.sin(t0 + i * 0.2) * w * (i % 2 ? 0.33 : 0.24));
      ctx.fill();
    }
  });
}

export default defineThing({
  questions: {
    era: choice('What era is the gear?', {
      silver: '1970s silver faces with amber dials and walnut sleeves, heavy and handsome.',
      black: '1980s black boxes with red and green LEDs, thin and stacked like a rack.',
      boombox: 'A pile of boomboxes: twin speakers, cassette doors, handles and antennas.',
      mismatched: 'A mismatched heap of every decade, silver, black and beige together.',
    }),
    height: score('How tall is the stack?', ['Three or four units', 'Waist high', 'Chest high, more than is wise']),
    lean: score('How precarious is it?', ['Squared up and stable', 'A little out of true', 'Leaning', 'About to go over']),
    powered: choice('Is anything switched on?', {
      none: 'All dead, cords wrapped.',
      one: 'One unit is on, its dial glowing in the gloom.',
      several: 'A few are lit; someone has been testing them.',
      all: 'Every dial and meter is glowing at once.',
    }),
    prices: choice('How is it priced?', {
      tape: 'Handwritten masking-tape prices stuck on the faces.',
      stickers: 'Fluorescent starburst stickers.',
      'as-is': 'White AS IS labels in red ink.',
      none: 'No prices; you have to ask.',
    }),
    speakers: choice('What speakers stand with it?', {
      none: 'None.',
      pair: 'A matched pair of floor speakers flanking the stack.',
      orphan: 'One orphan speaker with its grille gone and a torn cone.',
      stack: 'Two small bookshelf speakers stacked to one side.',
    }),
    top: choice('What sits on top?', {
      nothing: 'Nothing.',
      turntable: 'A turntable with a record still on the platter.',
      tapes: 'A spill of cassettes and a pair of headphones.',
      cables: 'A tangle of cables and a remote control.',
      records: 'A short stack of LPs in worn sleeves.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const warm = mood.warmth > 0.45;
    const STYLES: Record<'silver' | 'black' | 'beige' | 'gold', Style> = {
      silver: { face: '#c5c9cb', ink: '#1c1c1e', trim: '#e6e8e9', lampA: warm ? '#ffb347' : '#aee8d6', lampB: '#ffcf6a', shell: '#232326', wood: true },
      black: { face: '#1c1d21', ink: '#d8d8d8', trim: '#3a3c42', lampA: '#ff8a2a', lampB: warm ? '#ff3b30' : '#42e06a', shell: '#141416', wood: false },
      beige: { face: '#d6cdb6', ink: '#3a3a3a', trim: '#b9b09a', lampA: '#8fe0a0', lampB: '#8fe0a0', shell: '#cfc6af', wood: false },
      gold: { face: '#c9b27a', ink: '#2a2418', trim: '#e2cf9a', lampA: '#ffb347', lampB: '#ff6a3a', shell: '#2a2622', wood: true },
    };
    const boomColours = mood.cheer > 0.5 ? ['#c5c9cb', '#c8262b', '#e2c81f', '#1c1d21', '#2a6fd0'] : ['#c5c9cb', '#1c1d21', '#3a3c42', '#8a8f92'];
    const styleFor = (): Style => {
      if (a.era === 'silver') return random() < 0.15 ? STYLES.gold : STYLES.silver;
      if (a.era === 'black') return STYLES.black;
      if (a.era === 'boombox') {
        const face = pick(random, boomColours);
        const darkFace = new THREE.Color(face).getHSL({ h: 0, s: 0, l: 0 }).l < 0.3;
        return { face, ink: darkFace ? '#d8d8d8' : '#1c1c1e', trim: darkFace ? '#b9bdc0' : '#e6e8e9', lampA: '#ffb347', lampB: '#ff3b30', shell: face, wood: false };
      }
      return pick(random, [STYLES.silver, STYLES.black, STYLES.beige, STYLES.gold]);
    };
    const wood = s.material('#7a4a28', { roughness: 0.55 });
    const chrome = s.material('#d5d8da', { metalness: 0.5, roughness: 0.3 });
    const lamps: THREE.MeshStandardMaterial[] = [];

    const count = a.era === 'boombox'
      ? Math.max(2, Math.min(6, Math.round(mix(2, 5.4, a.height) + (mood.density - 0.5) * 1.4)))
      : Math.max(3, Math.min(12, Math.round(mix(4, 10.6, a.height) + (mood.density - 0.5) * 2)));
    const litSet = new Set<number>();
    if (a.powered === 'one') litSet.add(Math.floor(random() * count));
    if (a.powered === 'several') { for (let i = 0; i < count; i++) if (random() < 0.45) litSet.add(i); litSet.add(Math.floor(random() * count)); }
    if (a.powered === 'all') for (let i = 0; i < count; i++) litSet.add(i);

    const makeUnit = (kind: Face, lit: boolean) => {
      const style = styleFor();
      const g = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
      const box = (size: [number, number, number], at: [number, number, number], material: THREE.Material) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(...size), material)); m.position.set(...at); return m; };
      const boom = kind === 'boombox';
      const w = boom ? 0.52 + random() * 0.18 : (kind === 'receiver' && style.wood ? 0.48 : 0.43) + random() * 0.03;
      const h = boom ? w * (0.46 + random() * 0.08) : { receiver: 0.145, deck: 0.135, eq: 0.085, cd: 0.09, amp: 0.125, boombox: 0 }[kind] * (a.era === 'black' ? 0.82 : 1);
      const d = boom ? 0.15 + random() * 0.03 : 0.3 + random() * 0.07;
      const sleeve = !boom && style.wood && random() < 0.7;
      const shell = s.material(style.shell, { roughness: 0.55, metalness: boom ? 0.1 : 0.25 });
      box([w, h, d], [0, h / 2, 0], sleeve ? wood : shell);
      const fw = sleeve ? w - 0.03 : w - 0.004, fh = h - (sleeve ? 0.02 : 0.006);
      const { map, glow, knobs } = paintFace(kind, style, lit, a.prices, mood.wear, random, fw / fh);
      const faceMat = new THREE.MeshStandardMaterial({ map, roughness: 0.42, metalness: 0.2, ...(glow ? { emissive: new THREE.Color('#ffffff'), emissiveMap: glow, emissiveIntensity: 1.1 } : {}) });
      if (glow) lamps.push(faceMat);
      const face = add(new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), faceMat));
      face.position.set(0, h / 2, d / 2 + 0.004);
      box([fw, fh, 0.006], [0, h / 2, d / 2], s.material(style.face));
      const knobMat = s.material(style.trim, { metalness: 0.45, roughness: 0.3 });
      for (const k of knobs) {
        const knob = add(new THREE.Mesh(new THREE.CylinderGeometry(k.r * fw * 0.92, k.r * fw, 0.022, 18), knobMat));
        knob.rotation.x = Math.PI / 2;
        knob.position.set((k.x - 0.5) * fw, h / 2 + (0.5 - k.y) * fh, d / 2 + 0.015);
      }
      if (boom) {
        // handle and antenna
        const hw = w * 0.6;
        for (const x of [-1, 1]) box([0.02, 0.06, 0.02], [x * hw / 2, h + 0.03, 0], shell);
        box([hw + 0.02, 0.02, 0.03], [0, h + 0.065, 0], shell);
        const aerial = 0.32 + random() * 0.25;
        const antenna = add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, aerial, 6), chrome));
        const lean = (random() - 0.2) * 1.1;
        antenna.geometry.translate(0, aerial / 2, 0);
        antenna.position.set(w / 2 - 0.04, h, -d / 2 + 0.02);
        antenna.rotation.z = -lean;
        for (let i = 0; i < 4; i++) {
          const top = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 10), knobMat));
          top.position.set(-w * 0.3 + i * 0.045, h + 0.006, d * 0.2);
        }
      } else {
        // top vents and rear feet give the lid some life from above
        box([w * 0.62, 0.002, d * 0.4], [0, h + 0.001, -d * 0.1], s.material(sleeve ? '#5f3820' : '#0d0d0f'));
      }
      return { g, w, h, d };
    };

    // ---- build the tower ----
    const tower = new THREE.Group();
    s.root.add(tower);
    const dir = random() < 0.5 ? -1 : 1;
    let topY = 0, topX = 0, topZ = 0, topW = 0.43, topD = 0.3, topTilt = 0;
    if (a.era === 'boombox') {
      const base = count >= 5 ? 3 : count >= 3 ? 2 : 1;
      let left = count, row = 0, y = 0, n = base;
      while (left > 0) {
        const inRow = Math.min(n, left);
        let rowH = 0;
        for (let i = 0; i < inRow; i++) {
          const unit = makeUnit('boombox', litSet.has(count - left + i));
          const x = (i - (inRow - 1) / 2) * 0.66 + dir * a.lean * 0.07 * row + (random() - 0.5) * 0.04;
          unit.g.position.set(x, y, (random() - 0.5) * 0.05);
          unit.g.rotation.y = (random() - 0.5) * (0.1 + a.lean * 0.45);
          const last = left - inRow === 0 && i === inRow - 1;
          if (last && a.lean > 0.6 && row > 0) { unit.g.rotation.z = dir * -0.16; unit.g.position.y += Math.sin(0.16) * unit.w * 0.5; }
          tower.add(unit.g);
          rowH = Math.max(rowH, unit.h + 0.075);
          if (last) { topY = y + unit.h + 0.075; topX = x; topZ = unit.g.position.z; topW = unit.w; topD = unit.d; topTilt = unit.g.rotation.z; }
        }
        left -= inRow;
        y += rowH - 0.07;
        n = Math.max(1, n - 1);
        row++;
      }
    } else {
      const order: Face[] = [];
      const pool: Face[] = a.era === 'black' ? ['amp', 'cd', 'deck', 'eq', 'receiver', 'cd', 'deck'] : ['receiver', 'deck', 'receiver', 'amp', 'eq', 'deck', 'receiver'];
      if (a.era === 'mismatched') pool.push('cd', 'amp', 'eq');
      for (let i = 0; i < count; i++) order.push(i === 0 ? (a.era === 'black' ? 'amp' : 'receiver') : pick(random, pool));
      let y = 0;
      order.forEach((kind, i) => {
        const unit = makeUnit(kind, litSet.has(i));
        const x = dir * a.lean * 0.034 * i + (random() - 0.5) * (0.012 + a.lean * 0.03);
        const z = (random() - 0.5) * (0.015 + a.lean * 0.05);
        unit.g.position.set(x, y, z);
        unit.g.rotation.y = (random() - 0.5) * (0.05 + a.lean * 0.4);
        const last = i === count - 1;
        if (last && a.lean > 0.62) {
          // the top one is propped on a cassette and wants to slide
          const tilt = dir * -0.11;
          unit.g.rotation.z = tilt;
          unit.g.position.y += Math.sin(0.11) * unit.w * 0.5 + 0.004;
          const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.016, 0.065), s.material(pick(random, ['#e8e2cf', '#2a2a2e', '#c8262b'])));
          wedge.position.set(x - dir * unit.w * 0.36, y + 0.008, z + 0.05);
          wedge.castShadow = true;
          tower.add(wedge);
          topTilt = tilt;
        }
        tower.add(unit.g);
        y += unit.h + 0.004;
        if (last) { topY = y + (topTilt ? Math.sin(0.11) * unit.w * 0.5 : 0); topX = x; topZ = z; topW = unit.w; topD = unit.d; }
      });
    }

    // ---- what sits on top ----
    const top = new THREE.Group();
    top.position.set(topX, topY, topZ);
    top.rotation.z = topTilt;
    tower.add(top);
    const onTop = (mesh: THREE.Mesh, at: [number, number, number]) => { mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; top.add(mesh); return mesh; };
    const dark = s.material('#151517');
    if (a.top === 'turntable' && a.era !== 'boombox') {
      const tw = Math.min(0.44, topW), td = Math.min(0.36, topD + 0.03);
      onTop(new THREE.Mesh(new THREE.BoxGeometry(tw, 0.05, td), a.era === 'black' ? s.material('#1c1d21') : wood), [0, 0.025, 0]);
      onTop(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.014, 32), chrome), [-0.04, 0.057, 0]);
      onTop(new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.004, 32), s.material('#0c0c0e', { roughness: 0.3 })), [-0.04, 0.066, 0]);
      onTop(new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.005, 20), s.material(pick(random, ['#c8262b', '#e2c81f', '#2a6fd0', '#f2a7c0', '#2fae6b']))), [-0.04, 0.067, 0]);
      onTop(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 12), chrome), [tw / 2 - 0.05, 0.07, -td / 2 + 0.06]);
      const arm = onTop(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 6), chrome), [tw / 2 - 0.085, 0.085, -td / 2 + 0.16]);
      arm.rotation.x = Math.PI / 2;
      arm.rotation.z = 0.33;
      const lid = new THREE.Mesh(new THREE.BoxGeometry(tw, 0.07, td), new THREE.MeshPhysicalMaterial({ color: '#c9d6d8', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false }));
      lid.geometry.translate(0, 0.035, td / 2);
      lid.position.set(0, 0.05, -td / 2);
      lid.rotation.x = -1.0;
      top.add(lid);
    } else if (a.top === 'tapes' || (a.top === 'turntable' && a.era === 'boombox')) {
      const n = 4 + Math.floor(random() * 4 + mood.density * 3);
      for (let i = 0; i < n; i++) {
        const tape = onTop(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.014, 0.064), s.material(pick(random, ['#e8e2cf', '#2a2a2e', '#c8262b', '#e2c81f', '#8fb8d8', '#f2a7c0']))), [(random() - 0.5) * (topW - 0.14), 0.007 + (i % 3) * 0.014, (random() - 0.5) * Math.max(0.02, topD - 0.1)]);
        tape.rotation.y = random() * 3;
      }
      if (a.era !== 'boombox' || topW > 0.5) {
        const hx = topW * 0.18;
        const band = onTop(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.007, 6, 20, Math.PI), dark), [hx, 0.07, 0]);
        band.rotation.y = 0.5;
        for (const sgn of [-1, 1]) {
          const cup = onTop(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), dark), [hx + sgn * 0.075 * Math.cos(0.5), 0.045, -sgn * 0.075 * Math.sin(0.5)]);
          cup.rotation.z = Math.PI / 2;
          cup.rotation.y = 0.5;
        }
      }
    } else if (a.top === 'cables') {
      const cable = s.material('#18181a', { roughness: 0.6 });
      for (let k = 0; k < 4; k++) {
        const pts: THREE.Vector3[] = [];
        const r0 = 0.05 + random() * 0.07;
        for (let i = 0; i <= 12; i++) { const t = (i / 12) * 6.283 * (1 + random() * 0.3); pts.push(new THREE.Vector3(Math.cos(t) * r0 * (1 + random() * 0.3) + (random() - 0.5) * 0.05, 0.008 + k * 0.01 + random() * 0.012, Math.sin(t) * r0 * 0.8)); }
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.005, 5), k === 2 ? s.material(pick(random, ['#c8262b', '#e8e2cf', '#e2c81f'])) : cable);
        onTop(tube, [(random() - 0.5) * 0.1, 0, (random() - 0.5) * 0.04]);
      }
      // one lead hangs down the front
      const hang = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, 0.01, 0.05), new THREE.Vector3(0.1, 0.0, topD / 2 + 0.03), new THREE.Vector3(0.11, -0.16, topD / 2 + 0.04), new THREE.Vector3(0.09, -0.3, topD / 2 + 0.035)]), 30, 0.005, 5), cable);
      onTop(hang, [0, 0, 0]);
      const remote = onTop(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.014, 0.15), s.material('#2a2a2e')), [-topW * 0.28, 0.007, 0.02]);
      remote.rotation.y = 0.5;
    } else if (a.top === 'records') {
      const n = 4 + Math.floor(random() * 5);
      for (let i = 0; i < n; i++) {
        const lp = onTop(new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.005, 0.31), s.material(pick(random, ['#d9642a', '#2a5fb0', '#e8e2cf', '#1c1c1f', '#e2c81f', '#7c2a5a', '#3a8a6a']))), [(random() - 0.5) * 0.03, 0.003 + i * 0.0055, (random() - 0.5) * 0.03]);
        lp.rotation.y = (random() - 0.5) * 0.5;
      }
    }

    // ---- speakers ----
    const spStyle = a.era === 'black' || a.era === 'boombox' ? STYLES.black : STYLES.silver;
    const speaker = (x: number, y: number, hh: number, bare: boolean, torn: boolean, turn: number) => {
      const w = hh * 0.52, d = hh * 0.42;
      const g = new THREE.Group();
      const cab = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), spStyle.wood ? wood : s.material('#1c1c1f'));
      cab.position.y = hh / 2;
      cab.castShadow = cab.receiveShadow = true;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.006, hh - 0.006), new THREE.MeshStandardMaterial({ map: paintSpeaker(spStyle, bare, torn, random), roughness: 0.8 }));
      face.position.set(0, hh / 2, d / 2 + 0.003);
      g.add(cab, face);
      g.position.set(x, y, (random() - 0.5) * 0.06);
      g.rotation.y = turn;
      s.root.add(g);
      return w;
    };
    const reach = a.era === 'boombox' ? (count >= 5 ? 1.05 : count >= 3 ? 0.72 : 0.4) : 0.3;
    if (a.speakers === 'pair') {
      const hh = 0.62 + random() * 0.2;
      const bare = random() < 0.4;
      speaker(-(reach + hh * 0.26 + 0.06), 0, hh, bare, false, 0.12 + (random() - 0.5) * 0.1);
      speaker(reach + hh * 0.26 + 0.06 + Math.max(0, dir) * a.lean * 0.2, 0, hh, bare, false, -0.12 + (random() - 0.5) * 0.1);
    } else if (a.speakers === 'orphan') {
      speaker(-dir * (reach + 0.26), 0, 0.72, true, true, dir * 0.25);
    } else if (a.speakers === 'stack') {
      const x = -dir * (reach + 0.2);
      speaker(x, 0, 0.36, random() < 0.5, false, (random() - 0.5) * 0.3);
      speaker(x + (random() - 0.5) * 0.04, 0.36, 0.36, true, random() < 0.3, (random() - 0.5) * 0.5);
    }

    const pulse = mix(0, 0.35, mood.energy);
    const phases = lamps.map(() => random() * 6.28);
    return s.finish({
      update: lamps.length ? (_dt, time) => { lamps.forEach((lamp, i) => { lamp.emissiveIntensity = 1.1 + Math.sin(time * 9 + phases[i]) * Math.sin(time * 2.3 + phases[i] * 2) * pulse; }); } : undefined,
    });
  },
});
