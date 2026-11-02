import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, paint, paintHex } from '@conjure/kit';

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const TRADES = {
  pawn: { words: '大押', small: '按 押 典 當' },
  restaurant: { words: '金龍酒家', small: '海鮮 點心 晚飯' },
  mahjong: { words: '麻雀耍樂', small: '雀館 通宵' },
  tailor: { words: '鴻昌洋服', small: '西裝 旗袍' },
  hotel: { words: '華都賓館', small: '時鐘酒店 冷氣' },
} as const;

type Ctx = CanvasRenderingContext2D;
/** The trade's emblem drawn as tube outlines: a bat holding a coin, a steaming bowl, a tile, scissors, a bed. */
const motif = (c: Ctx, trade: keyof typeof TRADES, x: number, y: number, r: number) => {
  c.beginPath();
  if (trade === 'pawn') {
    c.moveTo(x - r, y - r * 0.2); c.quadraticCurveTo(x - r * 0.6, y - r * 0.9, x - r * 0.2, y - r * 0.4);
    c.lineTo(x, y - r * 0.6); c.lineTo(x + r * 0.2, y - r * 0.4); c.quadraticCurveTo(x + r * 0.6, y - r * 0.9, x + r, y - r * 0.2);
    c.quadraticCurveTo(x + r * 0.6, y - r * 0.05, x + r * 0.45, y + r * 0.2); c.quadraticCurveTo(x, y - r * 0.05, x - r * 0.45, y + r * 0.2); c.quadraticCurveTo(x - r * 0.6, y - r * 0.05, x - r, y - r * 0.2);
    c.moveTo(x + r * 0.42, y + r * 0.62); c.arc(x, y + r * 0.62, r * 0.42, 0, Math.PI * 2);
    c.rect(x - r * 0.12, y + r * 0.5, r * 0.24, r * 0.24);
  } else if (trade === 'restaurant') {
    c.moveTo(x - r, y); c.quadraticCurveTo(x - r, y + r * 0.9, x, y + r * 0.9); c.quadraticCurveTo(x + r, y + r * 0.9, x + r, y); c.closePath();
    for (const dx of [-0.4, 0, 0.4]) { c.moveTo(x + dx * r, y - r * 0.15); c.bezierCurveTo(x + (dx - 0.2) * r, y - r * 0.45, x + (dx + 0.2) * r, y - r * 0.6, x + dx * r, y - r * 0.9); }
    c.moveTo(x + r * 0.2, y - r * 0.3); c.lineTo(x + r * 1.1, y - r * 1.0); c.moveTo(x + r * 0.35, y - r * 0.2); c.lineTo(x + r * 1.2, y - r * 0.85);
  } else if (trade === 'mahjong') {
    c.rect(x - r * 0.6, y - r * 0.85, r * 1.2, r * 1.7); c.rect(x - r * 0.45, y - r * 0.7, r * 0.9, r * 1.4);
  } else if (trade === 'tailor') {
    c.moveTo(x - r * 0.25, y + r * 0.55); c.arc(x - r * 0.4, y + r * 0.55, r * 0.15, 0, Math.PI * 2);
    c.moveTo(x + r * 0.55, y + r * 0.55); c.arc(x + r * 0.4, y + r * 0.55, r * 0.15, 0, Math.PI * 2);
    c.moveTo(x - r * 0.3, y + r * 0.4); c.lineTo(x + r * 0.5, y - r * 0.9); c.moveTo(x + r * 0.3, y + r * 0.4); c.lineTo(x - r * 0.5, y - r * 0.9);
  } else {
    c.moveTo(x - r, y + r * 0.5); c.lineTo(x - r, y - r * 0.4); c.moveTo(x - r, y + r * 0.1); c.lineTo(x + r, y + r * 0.1); c.lineTo(x + r, y + r * 0.5);
    c.moveTo(x - r * 0.45, y - r * 0.1); c.arc(x - r * 0.6, y - r * 0.1, r * 0.15, 0, Math.PI * 2);
    c.moveTo(x - r * 0.3, y - r * 0.05); c.lineTo(x + r * 0.9, y - r * 0.05);
  }
};

export default defineThing({
  questions: {
    trade: choice('What trade is the sign for?', {
      pawn: 'A pawnshop: the bat holding a coin and the single character for pledge.',
      restaurant: 'A Cantonese seafood restaurant, a steaming rice bowl beside its name.',
      mahjong: 'A mahjong parlour, a tile outlined in light.',
      tailor: 'An old tailor\'s shop, a pair of scissors glowing.',
      hotel: 'A cheap guesthouse hotel, a bed in tubes, by-the-hour rooms.',
    }),
    shape: choice('Which way does the sign run?', {
      vertical: 'A tall vertical board, the characters stacked top to bottom.',
      horizontal: 'A wide horizontal board jutting far out over the road.',
    }),
    tube: paint('What colour are the neon tubes of the lettering?', ['red', 'magenta', 'turquoise', 'lime', 'amber', 'white', 'sky', 'yellow', 'purple', 'orange']),
    border: paint('What colour is the border tube?', ['turquoise', 'yellow', 'red', 'magenta', 'white', 'lime', 'sky', 'amber', 'purple']),
    backing: paint('What colour is the painted backing board?', ['red', 'black', 'white', 'yellow', 'navy', 'green', 'cream', 'teal']),
    state: choice('What state is it in?', {
      blazing: 'Every tube lit and humming.',
      flickering: 'Some tubes dead, one character flickering on and off.',
      dark: 'Switched off for good: grey glass on a faded board.',
      dismantling: 'Being taken down: half the tubes gone, a crane strap slung round the frame.',
    }),
    rain: noul('Is it raining, water dripping off the sign onto the street?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.3) / 0.7));
    const vertical = a.shape === 'vertical';
    const sw = vertical ? 2.4 : 6.4, sh = vertical ? 7.2 : 2.8, sd = 0.35;
    const x0 = 0.9, cx = x0 + sw / 2;
    const bottom = vertical ? 4.2 : 6.4, cy = bottom + sh / 2;
    const tubeHex = paintHex(a.tube), borderHex = paintHex(a.border), backHex = paintHex(a.backing);
    const lit = a.state !== 'dark';
    const glowAmount = lit ? mix(0.35, 1, night) : 0;
    const wet = a.rain;

    // The tenement wall it hangs from: grilled windows, air-conditioners, a drainpipe.
    const wallMap = canvasTexture(256, 512, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 512);
      for (let row = 0; row < 6; row++) for (let col = 0; col < 3; col++) {
        const x = 20 + col * 80, y = 20 + row * 82;
        c.fillStyle = random() < 0.25 + night * 0.3 ? '#f3d58e' : '#3c4248'; c.fillRect(x, y, 56, 50);
        c.strokeStyle = '#7d7a72'; c.lineWidth = 2; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(x + k * 11, y - 3); c.lineTo(x + k * 11, y + 54); c.stroke(); }
        c.strokeRect(x - 3, y - 3, 62, 56);
      }
      for (let i = 0; i < 30 + mood.wear * 60; i++) { c.fillStyle = `rgba(50,45,35,${0.08 + random() * 0.18})`; c.fillRect(random() * 256, random() * 512, 3 + random() * 6, 20 + random() * 90); }
    });
    const wall = s.material(new THREE.Color('#cfc6b2').multiplyScalar(wet ? 0.75 : 1), { map: wallMap, roughness: wet ? 0.35 : 0.9 });
    s.box([0.5, 15, 7.5], [-0.25, 7.5, 0], wall);
    const unit = s.material('#d9d6cc', { roughness: 0.6 });
    for (const [y, z] of [[3.6, -2.2], [8.4, 2.3], [11.5, -2.4], [13.2, 1.6]]) { s.box([0.6, 0.55, 0.85], [0.3, y, z], unit); s.box([0.02, 0.4, 0.4], [0.61, y, z], s.material('#4d4f52')); }
    s.cylinder(0.07, 0.07, 15, [0.1, 7.5, 3.4], s.material('#6a6d70'), 8);
    s.box([4.6, 0.12, 7.5], [2.05, 0.06, 0], s.material(wet ? '#7d7d7a' : '#a8a59b', { roughness: wet ? 0.15 : 0.9, metalness: wet ? 0.2 : 0 }));
    s.box([0.15, 0.2, 7.5], [4.35, 0.1, 0], s.material('#bdb8ac'));

    // The lattice frame and its stays back to the wall, rusting with age.
    const steel = s.material(new THREE.Color('#4d5257').lerp(new THREE.Color('#8a4a24'), mood.wear * 0.85), { roughness: 0.75, metalness: 0.3 });
    const bars: THREE.BufferGeometry[] = [];
    const bar = (p: THREE.Vector3, q: THREE.Vector3, r = 0.05) => {
      const d = q.clone().sub(p); const g = new THREE.BoxGeometry(r * 2, d.length(), r * 2);
      g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())));
      g.translate((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2); bars.push(g);
    };
    const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
    const fx0 = x0 - 0.15, fx1 = x0 + sw + 0.15, fy0 = bottom - 0.15, fy1 = bottom + sh + 0.15;
    for (const z of [-sd / 2 - 0.02, sd / 2 + 0.02]) {
      bar(V(fx0, fy0, z), V(fx1, fy0, z)); bar(V(fx0, fy1, z), V(fx1, fy1, z)); bar(V(fx0, fy0, z), V(fx0, fy1, z)); bar(V(fx1, fy0, z), V(fx1, fy1, z));
    }
    const bays = Math.max(2, Math.round((vertical ? sh : sw) / 1.2));
    for (let i = 0; i < bays; i++) {
      if (vertical) { const y0 = fy0 + (i * (fy1 - fy0)) / bays, y1 = fy0 + ((i + 1) * (fy1 - fy0)) / bays; bar(V(fx0, y0), V(fx1, y1), 0.03); bar(V(fx1, y0), V(fx0, y1), 0.03); bar(V(fx0, y1), V(fx1, y1), 0.03); }
      else { const xa = fx0 + (i * (fx1 - fx0)) / bays, xb = fx0 + ((i + 1) * (fx1 - fx0)) / bays; bar(V(xa, fy0), V(xb, fy1), 0.03); bar(V(xb, fy0), V(xa, fy1), 0.03); bar(V(xb, fy0), V(xb, fy1), 0.03); }
    }
    // Arms from the wall: a top chord to the frame's far top corner and a strut below.
    bar(V(0, fy1 + 0.4), V(fx1, fy1), 0.06);
    bar(V(0, fy1 - (vertical ? 3.2 : 2.6)), V(fx1 * 0.75, fy1 + 0.06), 0.05);
    bar(V(0, fy0), V(fx0, fy0), 0.06);
    bar(V(0, fy1 + 0.4), V(fx0, fy1), 0.05);
    s.box([0.1, fy1 - fy0 + 1, 0.5], [0.05, (fy0 + fy1) / 2 + 0.3, 0], steel);
    s.mesh(mergeGeometries(bars.map((g) => g.toNonIndexed())), steel);

    // The board: painted backing with small painted characters, grime streaks.
    const px = 112;
    const W = Math.round(sw * px), H = Math.round(sh * px);
    const trade = TRADES[a.trade];
    const chars = [...trade.words];
    const removed = new Set<number>();
    if (a.state === 'dismantling') chars.forEach((_c, i) => { if (i >= Math.ceil(chars.length / 2) || random() < 0.3) removed.add(i); });
    const deadIndex = a.state === 'flickering' ? Math.floor(random() * chars.length) : -1;
    const flickerIndex = a.state === 'flickering' ? (deadIndex + 1) % chars.length : -1;
    const motifAt = vertical ? [W / 2, W * 0.42, W * 0.36] : [H * 0.55, H / 2, H * 0.36];
    const slot = (i: number) => vertical
      ? { x: W / 2, y: W * 0.95 + (i + 0.5) * ((H - W * 1.05) / chars.length), size: Math.min(W * 0.78, ((H - W * 1.05) / chars.length) * 0.88) }
      : { x: H * 1.1 + (i + 0.5) * ((W - H * 1.2) / chars.length), y: H * 0.56, size: Math.min(H * 0.7, ((W - H * 1.2) / chars.length) * 0.9) };
    const font = (size: number) => `bold ${Math.round(size)}px "WenQuanYi Zen Hei", "Noto Sans CJK TC", "PingFang HK", "Microsoft JhengHei", sans-serif`;
    const strokeGlyph = (c: Ctx, i: number) => { const p = slot(i); c.font = font(p.size); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(chars[i], p.x, p.y); };
    const boardMap = canvasTexture(W, H, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 6; c.strokeRect(10, 10, W - 20, H - 20);
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.font = font(vertical ? W * 0.12 : H * 0.11); c.textAlign = 'center';
      if (vertical) c.fillText(trade.small, W / 2, H - W * 0.12, W * 0.9); else c.fillText(trade.small, W - H * 0.9, H - H * 0.1, H * 1.6);
      // Unlit or missing tubes: grey glass, or just the screw holes and a pale ghost where they hung.
      c.lineJoin = 'round';
      chars.forEach((_ch, i) => {
        if (removed.has(i)) { c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 9; strokeGlyph(c, i); c.fillStyle = 'rgba(0,0,0,0.6)'; const p = slot(i); for (let k = 0; k < 8; k++) { c.beginPath(); c.arc(p.x + (random() - 0.5) * p.size * 0.8, p.y + (random() - 0.5) * p.size * 0.8, 2.5, 0, 7); c.fill(); } }
        else if (!lit || i === deadIndex) { c.strokeStyle = 'rgba(170,175,180,0.9)'; c.lineWidth = 7; strokeGlyph(c, i); }
      });
      if (!lit || a.state === 'dismantling') { c.strokeStyle = 'rgba(170,175,180,0.9)'; c.lineWidth = 7; motif(c, a.trade, motifAt[0], motifAt[1], motifAt[2]); c.stroke(); }
      for (let i = 0; i < 10 + mood.wear * 40; i++) { c.fillStyle = `rgba(40,30,20,${0.08 + random() * 0.18})`; c.fillRect(random() * W, random() * H, 3 + random() * 6, 10 + random() * 60); }
    });
    const board = s.material(backHex, { map: boardMap, roughness: 0.6 });
    s.box([sw, sh, sd], [cx, cy, 0], board);

    // Lit lettering: one canvas for the steady tubes and one for the flickering character, each with a soft halo.
    const drawTubes = (only: number | null, blur: boolean) => canvasTexture(W, H, (c) => {
      c.clearRect(0, 0, W, H);
      c.lineJoin = 'round'; c.lineCap = 'round';
      const pass = (colour: string, width: number) => {
        c.strokeStyle = colour; c.lineWidth = width;
        chars.forEach((_ch, i) => { if (removed.has(i) || i === deadIndex) return; if (only === null ? i === flickerIndex : i !== only) return; strokeGlyph(c, i); });
        if (only === null && a.state !== 'dismantling') { motif(c, a.trade, motifAt[0], motifAt[1], motifAt[2]); c.stroke(); }
      };
      if (blur) { c.shadowColor = tubeHex; c.shadowBlur = 24; pass(tubeHex, 18); }
      else { pass(tubeHex, 9); pass('rgba(255,255,255,0.85)', 3); }
    });
    const updates: ((time: number) => void)[] = [];
    if (lit) {
      const layers: { map: THREE.Texture; halo: THREE.Texture; flicker: boolean }[] = [{ map: drawTubes(null, false), halo: drawTubes(null, true), flicker: false }];
      if (flickerIndex >= 0) layers.push({ map: drawTubes(flickerIndex, false), halo: drawTubes(flickerIndex, true), flicker: true });
      for (const layer of layers) {
        const tubeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: layer.map, emissive: '#ffffff', emissiveMap: layer.map, emissiveIntensity: mix(0.8, 2.4, glowAmount), transparent: true, alphaTest: 0.25, roughness: 0.3 });
        const haloMat = new THREE.MeshBasicMaterial({ map: layer.halo, transparent: true, opacity: mix(0.25, 0.85, glowAmount), depthWrite: false, blending: THREE.AdditiveBlending });
        for (const side of [-1, 1]) {
          const plane = s.mesh(new THREE.PlaneGeometry(sw, sh), tubeMat, [cx, cy, side * (sd / 2 + 0.07)]);
          plane.rotation.y = side > 0 ? 0 : Math.PI; plane.castShadow = false;
          const halo = s.mesh(new THREE.PlaneGeometry(sw * 1.04, sh * 1.04), haloMat, [cx, cy, side * (sd / 2 + 0.1)]);
          halo.rotation.y = plane.rotation.y; halo.castShadow = halo.receiveShadow = false;
        }
        if (layer.flicker) {
          const rate = mix(3, 14, mood.energy), seed = random() * 10;
          updates.push((time) => { const on = Math.sin(time * rate + seed) + Math.sin(time * rate * 2.7) > 0.3; tubeMat.emissiveIntensity = on ? 2 : 0.05; haloMat.opacity = on ? 0.7 : 0; });
        }
      }
    }
    // The border tube in 3D, standing off the board on both faces.
    const inset = 0.16, r = 0.22;
    const borderPath = new THREE.CurvePath<THREE.Vector3>();
    const bx0 = x0 + inset, bx1 = x0 + sw - inset, by0 = bottom + inset, by1 = bottom + sh - inset;
    const corners: [number, number][] = [[bx0 + r, by0], [bx1 - r, by0], [bx1, by0 + r], [bx1, by1 - r], [bx1 - r, by1], [bx0 + r, by1], [bx0, by1 - r], [bx0, by0 + r]];
    for (let i = 0; i < 8; i++) {
      const [ax, ay] = corners[i], [qx, qy] = corners[(i + 1) % 8];
      if (i % 2 === 0) borderPath.add(new THREE.LineCurve3(V(ax, ay), V(qx, qy)));
      else { const c = [[bx1, by0], [bx1, by1], [bx0, by1], [bx0, by0]][(i - 1) / 2]; borderPath.add(new THREE.QuadraticBezierCurve3(V(ax, ay), V(c[0], c[1]), V(qx, qy))); }
    }
    const borderLit = lit && a.state !== 'dismantling';
    const borderMat = new THREE.MeshStandardMaterial({ color: borderLit ? borderHex : '#b5b9bd', emissive: borderLit ? borderHex : '#000000', emissiveIntensity: borderLit ? mix(0.8, 2.4, glowAmount) : 0, roughness: 0.3, transparent: !borderLit, opacity: borderLit ? 1 : 0.8 });
    const points = borderPath.getSpacedPoints(160);
    const keep = a.state === 'dismantling' ? points.slice(0, 70) : points;
    for (const side of [-1, 1]) {
      const pts = keep.map((p) => V(p.x, p.y, side * (sd / 2 + 0.09)));
      const tube = s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, a.state !== 'dismantling'), 200, 0.035, 6, a.state !== 'dismantling'), borderMat);
      tube.castShadow = false;
    }

    // Being dismantled: a sling round the frame's top to a crane hook above.
    if (a.state === 'dismantling') {
      const strap = s.material('#e8b21e', { roughness: 0.8 });
      const hook = V(cx, fy1 + 3.2);
      for (const x of [fx0 + 0.3, fx1 - 0.3]) for (const z of [-0.25, 0.25]) s.rod([x, fy1, z], hook.toArray() as [number, number, number], 0.035, strap);
      s.box([0.25, 0.5, 0.15], [cx, fy1 + 3.4, 0], s.material('#2a2c2f', { metalness: 0.6 }));
      s.rod([cx, fy1 + 3.6, 0], [cx, fy1 + 7.5, 0], 0.03, s.material('#2a2c2f'));
      const loose = s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(x0 + sw * 0.6, bottom + sh * 0.3, sd / 2 + 0.09), V(x0 + sw * 0.7, bottom + sh * 0.1, sd / 2 + 0.4), V(x0 + sw * 0.72, bottom - 0.6, sd / 2 + 0.3)]), 24, 0.03, 5), s.material('#b5b9bd', { transparent: true, opacity: 0.8 }));
      loose.castShadow = false;
    }
    // Rain dripping off the frame.
    if (wet) {
      const drops: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 120; i++) { const x = fx0 + random() * (fx1 - fx0 + 1.5); drops.push({ at: [x, random() * bottom, (random() - 0.5) * 3], size: 1 }); }
      const rain = s.scatter(new THREE.BoxGeometry(0.015, 0.45, 0.015), new THREE.MeshStandardMaterial({ color: '#d4e2ec', transparent: true, opacity: 0.5, depthWrite: false }), drops);
      rain.castShadow = false;
      updates.push((time) => { rain.position.y = -((time * mix(4, 10, mood.energy)) % 1.2); });
      const puddle = s.mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshStandardMaterial({ color: '#333a40', emissive: tubeHex, emissiveIntensity: lit ? 0.35 * glowAmount : 0, roughness: 0.05, metalness: 0.4 }), [cx, 0.125, 1.2]);
      puddle.rotation.x = -Math.PI / 2; puddle.scale.y = 0.6; puddle.castShadow = false;
    }

    const hum = mix(0.92, 1, 1 - mood.energy * 0.3);
    const baseBorder = borderMat.emissiveIntensity;
    return s.finish({
      footprint: 2.5,
      update: (_dt, time) => {
        for (const fn of updates) fn(time);
        if (borderLit && mood.wear > 0.5) borderMat.emissiveIntensity = baseBorder * (Math.sin(time * 31) > 0.85 ? hum * 0.5 : 1);
      },
    });
  },
});
