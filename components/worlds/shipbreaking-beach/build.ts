import * as THREE from 'three';
import { type Placeable, type World, choice, clamp01, defineWorld, disposeTree, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
// Standing places on the sand: x, z, tallest and widest a thing may be there. The hero first.
const SLOTS: readonly (readonly [number, number, number, number])[] = [
  [1.6, 4.5, 4.4, 3.0], [-3.1, 9.2, 2.3, 1.4], [6.6, -1.5, 4.6, 2.7], [-7.0, -3.5, 5.0, 3.0], [3.6, 10.6, 2.0, 1.2], [9.5, -15, 7, 4.5],
];
const TYPES = {
  bulker: 'A bulk carrier: one cavernous rust-red hold with sloping tanks in its corners.',
  tanker: 'An oil tanker: three tall black tanks side by side, ringed with ledges, pipes on deck.',
  ferry: 'A passenger ferry: a white doll\'s house of cabin decks in pastel colours over a dark car deck.',
  container: 'A container ship: a lattice of cell guides with a few forgotten boxes still in it.',
} as const;
const LIVERY = {
  black: 'Black over red bottom paint.',
  blue: 'Deep blue over red.',
  green: 'Bottle green over red.',
  oxide: 'Red oxide all over.',
  orange: 'Faded orange over black.',
  grey: 'Flat grey over black.',
} as const;
const PAINT: Record<keyof typeof LIVERY, [string, string]> = {
  black: ['#2a2d32', '#8c3a2c'], blue: ['#24457a', '#7a3528'], green: ['#23513f', '#8a3a2a'], oxide: ['#9a4632', '#7a3023'], orange: ['#cf6a2a', '#2c2e31'], grey: ['#858c92', '#34363a'],
};
const SKIES = {
  glare: 'White noon glare: a bleached sky and a sun you cannot look at through the haze.',
  smog: 'Brown smog: torch smoke and burning cable insulation hanging in yellow air.',
  monsoon: 'Monsoon overcast: heavy grey cloud, flat light, everything wet.',
  dusk: 'Dusty dusk: a swollen orange sun low in peach and rose haze.',
  dawn: 'Dawn mist: pale blue and pink, the hulk only half emerged.',
} as const;
const SKY: Record<keyof typeof SKIES, [string, string, string, string]> = {
  glare: ['#c3cfd4', '#dcdfd3', '#f0e8cf', '#fffbe6'],
  smog: ['#a99f8c', '#cbb693', '#e6c898', '#ffe6b0'],
  monsoon: ['#8c98a2', '#a8b1b6', '#c7ccc8', '#eef0ea'],
  dusk: ['#a497ad', '#d8a69a', '#f2bd8d', '#ffcf8a'],
  dawn: ['#a9bccf', '#d3cdd6', '#f1d8cf', '#fff0e2'],
};

export default defineWorld({
  questions: {
    hulk: choice('What kind of ship is the hulk, shown by its cut cross-section?', TYPES),
    livery: choice('What colour is the hulk\'s hull?', LIVERY),
    progress: score('How far has the cutting gone?', [
      'The bow has only just come off: one clean vertical face, full height',
      'The upper decks are stepped back like terraces',
      'A long staircase of decks receding from the beach',
      'Cut down nearly to the bottom plates near the beach, the rest a distant ramp',
    ]),
    sky: choice('What is the air like?', SKIES),
    tide: choice('Where is the tide?', {
      out: 'Far out: the hulk stands high and dry on an endless grey flat.',
      pools: 'Going out: sheets and pools of standing water mirror the sky.',
      in: 'In: water laps around the hulk and comes up the beach in thin tongues.',
    }),
    shift: choice('Who is on the beach?', {
      working: 'A full shift: cutters on the decks throwing sparks, a gang carrying a plate.',
      resting: 'A break: men squatting round a kettle fire, the torches out.',
      deserted: 'Nobody. The yard is shut, or everyone has fled, and birds have the flats.',
    }),
    foreground: choice('What marks the mud in the foreground?', {
      cables: 'Deep parallel cable drag grooves and a heavy chain.',
      oil: 'Rainbow-skinned oil puddles and leaking drums.',
      footprints: 'Hundreds of bare footprints and a lost sandal.',
      scrap: 'Slag, offcuts and torch-burnt circles where plates were cut.',
    }),
    neighbours: choice('What else stands along the shore?', {
      row: 'A whole row of other hulks fading into the haze on both sides.',
      arrival: 'One intact ship just driven ashore, still flying a flag, waiting its turn.',
      none: 'Nothing: this is the only ship on the whole beach.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const pick = <X,>(list: readonly X[]) => list[Math.floor(random() * list.length)];
    const matt = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.9, ...options });
    const canvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!, w, h);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    };
    const css = (c: THREE.Color) => `#${c.getHexString()}`;
    const rgba = (c: THREE.Color, alpha: number) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;

    // Air and sky.
    const tintTo = new THREE.Color(mood.warmth > 0.5 ? '#f0b070' : '#9fb6d8');
    const sky = SKY[a.sky].map((hex) => new THREE.Color(hex).lerp(tintTo, Math.abs(mood.warmth - 0.5) * 0.3).lerp(new THREE.Color('#8f8a84'), (1 - mood.cheer) * 0.12));
    const haze = sky[2].clone();
    const hazed = (colour: THREE.ColorRepresentation, amount: number) => new THREE.Color(colour).lerp(haze, amount);
    const sunSide = mood.daylight < 0.5 ? -1 : 1;
    const sunLow = Math.abs(mood.daylight - 0.5) * 2;
    const lowSun = a.sky === 'dusk' || a.sky === 'dawn' ? Math.max(0.75, sunLow) : sunLow;
    const sunU = 0.5 + sunSide * mix(0.075, 0.105, lowSun), sunV = mix(0.29, 0.5, lowSun);
    const skyTexture = canvasTexture(1024, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, css(sky[0])); g.addColorStop(0.45, css(sky[1])); g.addColorStop(0.78, css(sky[2])); g.addColorStop(1, css(sky[2]));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // The hazy sun: a soft disc with a wide bloom.
      const sx = w * sunU, sy = h * sunV, veiled = a.sky === 'monsoon' ? 0.35 : 1;
      const bloom = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.28);
      bloom.addColorStop(0, rgba(sky[3], 0.95 * veiled)); bloom.addColorStop(0.22, rgba(sky[3], 0.45 * veiled)); bloom.addColorStop(1, rgba(sky[3], 0));
      ctx.fillStyle = bloom; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = rgba(new THREE.Color('#ffffff').lerp(sky[3], a.sky === 'dusk' ? 0.75 : 0.3), 0.95 * veiled);
      ctx.beginPath(); ctx.arc(sx, sy, a.sky === 'dusk' ? 24 : 17, 0, 7); ctx.fill();
      // Haze bands and cloud.
      for (let i = 0; i < (a.sky === 'monsoon' ? 26 : 10); i++) {
        ctx.fillStyle = a.sky === 'monsoon' ? `rgba(105,115,125,${0.1 + random() * 0.14})` : rgba(sky[2], 0.16 + random() * 0.2);
        ctx.beginPath(); ctx.ellipse(random() * w, h * (a.sky === 'monsoon' ? random() * 0.6 : 0.5 + random() * 0.3), w * (0.1 + random() * 0.2), h * (0.012 + random() * (a.sky === 'monsoon' ? 0.06 : 0.02)), 0, 0, 7); ctx.fill();
      }
      // Smoke columns far along the shore, leaning with the wind.
      const columns = a.sky === 'smog' ? 7 : a.shift === 'deserted' ? 1 : 3;
      for (let i = 0; i < columns; i++) {
        const x0 = random() * w, lean = 60 + random() * 80;
        for (let k = 0; k < 16; k++) {
          const t = k / 15;
          ctx.fillStyle = `rgba(70,62,56,${0.12 * (1 - t)})`;
          ctx.beginPath(); ctx.ellipse(x0 + lean * t * t, h * 0.82 - t * h * 0.36, 8 + t * 40, 10 + t * 22, 0, 0, 7); ctx.fill();
        }
      }
      // Low far shore.
      ctx.fillStyle = rgba(hazed('#6f6a66', 0.55), 1);
      ctx.beginPath(); ctx.moveTo(0, h * 0.815);
      for (let x = 0; x <= w; x += 32) ctx.lineTo(x, h * (0.808 + random() * 0.006));
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(520, 190), new THREE.MeshBasicMaterial({ map: skyTexture, fog: false }));
    backdrop.position.set(0, 60, -210);
    backdrop.renderOrder = -1;
    root.add(backdrop);
    const background = sky[1].clone();

    // The hulk.
    const HX = -7, HZ = -33, TURN = -1.95;
    const hulk = new THREE.Group();
    hulk.position.set(HX, 0, HZ);
    hulk.rotation.y = TURN;
    root.add(hulk);
    const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), TURN).add(hulk.position);
    const B = { bulker: 32, tanker: 36, ferry: 27, container: 32 }[a.hulk], H = { bulker: 22, tanker: 24, ferry: 25.3, container: 23 }[a.hulk];
    const LEN = 96, halfB = B / 2, HD = H - 1.2;
    const levels: number[] = a.hulk === 'ferry' ? [0, 2.6, 7.6, 10.5, 13.4, 16.3, 19.2, 22.1, H] : a.hulk === 'tanker' ? [0, 2.4, 6.6, 10.8, 15, 19.2, H] : a.hulk === 'container' ? [0, 2.2, 6.4, 10.6, 14.8, 19, H] : [0, 2.2, 6.2, 10.2, 14.2, 18.2, H];
    const bands = levels.length - 1;
    const cut = levels.slice(0, -1).map((_y, k) => -(a.progress * 4.6 * Math.pow(k, 1.3) * (6 / bands) + (k ? 0.4 + random() * 1.8 : 0)));
    const deepest = Math.min(...cut);
    const [topside, bottom] = PAINT[a.livery];
    const hullWhite = a.hulk === 'ferry';
    const taper = (x: number) => (x > -LEN * 0.74 ? 1 : Math.sqrt(Math.max(0.02, 1 - Math.pow((-x - LEN * 0.74) / (LEN * 0.27), 2))));
    const breadth = (x: number, y: number) => halfB * (y < 2.4 ? 0.74 + 0.26 * Math.sqrt(1 - (1 - y / 2.4) ** 2) : 1) * taper(x);
    const far = 0.16; // how much the haze already eats the hulk
    const sideTexture = (side: 1 | -1) => canvasTexture(2048, 448, (ctx, w, h) => {
      const px = (x: number) => ((x + LEN) / LEN) * w, py = (y: number) => (1 - y / H) * h, wl = H * 0.36;
      ctx.fillStyle = css(hazed(hullWhite ? '#e4e1d6' : topside, far)); ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = css(hazed(bottom, far)); ctx.fillRect(0, py(wl), w, h);
      ctx.fillStyle = css(hazed(hullWhite ? topside : '#d8d2c2', far)); ctx.fillRect(0, py(wl + 0.5), w, (0.5 / H) * h);
      if (hullWhite) { ctx.fillStyle = css(hazed(topside, far)); ctx.fillRect(0, py(H * 0.7), w, (0.7 / H) * h); ctx.fillStyle = '#26303a'; for (const row of [0.47, 0.58, 0.8, 0.9]) for (let x = -LEN + 6; x < -1; x += 2.2) ctx.fillRect(px(x), py(H * row), 12, 9); }
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
      for (let y = 1.5; y < H; y += 2.5) { ctx.beginPath(); ctx.moveTo(0, py(y)); ctx.lineTo(w, py(y)); ctx.stroke(); }
      for (let i = 0; i < 300; i++) { ctx.fillStyle = ['rgba(120,128,92,0.35)', 'rgba(196,190,160,0.28)', 'rgba(60,58,48,0.3)'][i % 3]; ctx.beginPath(); ctx.ellipse(random() * w, py(random() ** 1.5 * wl), 8 + random() * 30, 3 + random() * 8, 0, 0, 7); ctx.fill(); }
      // The company name along the side, its first letters already gone with the bow.
      ctx.save();
      ctx.translate(px(-17), py(H * 0.66)); ctx.scale(side, 1);
      ctx.fillStyle = hullWhite ? css(hazed(topside, far)) : '#e9e5d8'; ctx.globalAlpha = mix(0.9, 0.5, mood.wear);
      ctx.font = `bold ${h * 0.24}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pick(['ARIS LINE', 'OMISE', 'ARVEST', 'TAR LINES', 'RADER']), 0, 0);
      ctx.restore();
      for (let i = 0; i < 60 + mood.wear * 220; i++) {
        const x = random() * w, top = py(H * (0.25 + random() * 0.75)), len = 20 + random() * 130;
        const g = ctx.createLinearGradient(0, top, 0, top + len);
        g.addColorStop(0, `rgba(${130 + random() * 40},${62 + random() * 25},32,${0.35 + mood.wear * 0.35})`); g.addColorStop(1, 'rgba(125,62,30,0)');
        ctx.fillStyle = g; ctx.fillRect(x, top, 2 + random() * 9, len);
      }
      const burn = ctx.createLinearGradient(w, 0, w - 90 - a.progress * 500, 0);
      burn.addColorStop(0, 'rgba(22,18,16,0.8)'); burn.addColorStop(1, 'rgba(22,18,16,0)');
      ctx.fillStyle = burn; ctx.fillRect(0, 0, w, h);
    });
    const rows: { y: number; k: number }[] = [];
    levels.slice(0, -1).forEach((y0, k) => { const y1 = levels[k + 1]; for (const f of k === 0 ? [0, 0.2, 0.5, 0.8, 1] : [0, 1]) rows.push({ y: mix(y0 + (k ? 0.001 : 0), y1 - 0.001, f), k }); });
    const NI = 16;
    const inside = matt(hazed(a.hulk === 'bulker' ? '#8a4a36' : a.hulk === 'tanker' ? '#3a3632' : a.hulk === 'ferry' ? '#cfcab6' : '#7d8a80', far), { side: THREE.BackSide });
    const station = (t: number, k: number) => mix(cut[k], -LEN, Math.pow(t, 1.5));
    const outside = new THREE.MeshStandardMaterial({ map: sideTexture(-1), roughness: 0.85 });
    for (const side of [1, -1] as const) {
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      rows.forEach(({ y, k }) => { for (let i = 0; i <= NI; i++) { const x = station(i / NI, k); positions.push(x, y, side * breadth(x, y)); uvs.push((x + LEN) / LEN, y / H); } });
      for (let j = 0; j < rows.length - 1; j++) {
        if (rows[j].k !== rows[j + 1].k) continue;
        for (let i = 0; i < NI; i++) { const p = j * (NI + 1) + i, q = p + 1, r = p + NI + 1, t = r + 1; if (side > 0) index.push(p, r, q, q, r, t); else index.push(p, q, r, q, t, r); }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      hulk.add(new THREE.Mesh(geometry, outside), new THREE.Mesh(geometry, inside));
    }
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); hulk.add(mesh); return mesh; };
    const slab = (size: P3, at: P3, material: THREE.Material) => part(new THREE.BoxGeometry(...size), material, at);
    const burnt = matt(hazed('#241d1a', far * 0.6));
    const steel = matt(hazed('#6b5446', far));
    const pale = matt(hazed(a.hulk === 'tanker' ? '#4a4540' : '#b9b49c', far));
    const deckPaint = matt(hazed(a.hulk === 'ferry' ? '#5b7a63' : '#7d4234', far));
    // Bottom plating, the cut edges of the shell, and the weather deck.
    slab([LEN + cut[0], 0.3, B * 0.74], [(cut[0] - LEN) / 2, 0.15, 0], steel);
    for (let k = 0; k < bands; k++) {
      const y0 = levels[k], y1 = levels[k + 1];
      for (const side of [1, -1]) slab([0.7, y1 - y0, 0.55], [cut[k] + 0.2, (y0 + y1) / 2, side * (breadth(cut[k], Math.max(y0, 2.4)) - 0.2)], burnt);
      if (k > 0 && cut[k - 1] - cut[k] > 0.3) for (const side of [1, -1]) slab([cut[k - 1] - cut[k], 0.5, 0.55], [(cut[k - 1] + cut[k]) / 2, y0 + 0.1, side * (halfB - 0.2)], burnt);
    }
    slab([LEN * 0.8 + cut[bands - 1], 0.35, B - 0.3], [(cut[bands - 1] - LEN * 0.8) / 2, HD, 0], deckPaint);
    slab([0.6, 0.6, B], [cut[bands - 1] + 0.15, HD - 0.1, 0], burnt);
    // What the cross-section shows, by kind of ship.
    const deckAt = (k: number, depth: number, material: THREE.Material = steel) => {
      const front = cut[k - 1], y = levels[k];
      slab([depth + (front - cut[k]), 0.3, B - 0.5], [front - (depth + (front - cut[k])) / 2, y, 0], material);
      slab([0.5, 0.5, B - 0.3], [front + 0.1, y - 0.05, 0], burnt);
    };
    const terraces: { x: number; y: number; k: number }[] = [];
    if (a.hulk === 'ferry') {
      const pastel = ['#e9dfc2', '#bcd6c4', '#b9cfe0', '#ecc7c0', '#e6d7a0', '#d0c4e0'];
      for (let k = 1; k < bands; k++) {
        deckAt(k, 9, matt(hazed('#c9c4b0', far)));
        terraces.push({ x: cut[k - 1], y: levels[k], k });
        const y0 = levels[k] + 0.15, y1 = levels[k + 1] - 0.15, car = k === 1;
        const rooms = car ? 1 : 7 + (k % 2);
        const wall = canvasTexture(512, 64, (ctx, w, h) => {
          for (let r = 0; r < rooms; r++) {
            const x0 = (r / rooms) * w, rw = w / rooms;
            ctx.fillStyle = car ? css(hazed('#3c4046', far)) : css(hazed(pick(pastel), far)); ctx.fillRect(x0, 0, rw + 1, h);
            if (car) { ctx.fillStyle = 'rgba(240,235,210,0.5)'; for (let s = 0; s < 9; s++) ctx.fillRect(30 + s * 54, h * 0.72, 30, 4); ctx.fillStyle = 'rgba(226,150,40,0.7)'; ctx.fillRect(0, h * 0.1, w, 5); }
            else { ctx.fillStyle = 'rgba(60,50,42,0.75)'; ctx.fillRect(x0 + rw * 0.36, h * 0.3, rw * 0.26, h * 0.7); if (random() < 0.6) { ctx.fillStyle = 'rgba(250,246,230,0.8)'; ctx.fillRect(x0 + rw * 0.06, h * 0.56, rw * 0.24, h * 0.12); } if (random() < 0.4) { ctx.fillStyle = css(hazed(pick(['#b8452f', '#2f5d8a', '#d8b23a']), far)); ctx.fillRect(x0 + rw * 0.7, h * 0.2, rw * 0.2, h * 0.3); } }
          }
        });
        part(new THREE.PlaneGeometry(B - 0.8, y1 - y0), new THREE.MeshStandardMaterial({ map: wall, roughness: 0.9 }), [cut[k] - (car ? 16 : 5), (y0 + y1) / 2, 0]).rotation.y = Math.PI / 2;
        if (!car) for (let r = 1; r < rooms; r++) slab([5, y1 - y0, 0.14], [cut[k] - 2.5, (y0 + y1) / 2, -halfB + 0.4 + (r / rooms) * (B - 0.8)], pale);
      }
    } else {
      deckAt(1, 60);
      terraces.push({ x: cut[0], y: levels[1], k: 1 });
      const backX = deepest - (a.hulk === 'bulker' ? 20 : 13);
      const bulkhead = canvasTexture(512, 256, (ctx, w, h) => {
        ctx.fillStyle = css(hazed(a.hulk === 'bulker' ? '#7a4634' : a.hulk === 'tanker' ? '#2f2c2a' : '#6f7a72', far)); ctx.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 32) { const g = ctx.createLinearGradient(x, 0, x + 32, 0); g.addColorStop(0, 'rgba(0,0,0,0.28)'); g.addColorStop(0.5, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0.28)'); ctx.fillStyle = g; ctx.fillRect(x, 0, 32, h); }
        for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(140,70,34,${0.15 + random() * 0.25})`; ctx.fillRect(random() * w, random() * h, 6 + random() * 20, 30 + random() * 90); }
        ctx.strokeStyle = 'rgba(230,220,190,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w * 0.52, h); ctx.lineTo(w * 0.52, h * 0.05); ctx.moveTo(w * 0.55, h); ctx.lineTo(w * 0.55, h * 0.05); ctx.stroke();
      });
      part(new THREE.PlaneGeometry(B - 0.6, HD - levels[1]), new THREE.MeshStandardMaterial({ map: bulkhead, roughness: 0.9 }), [backX, (HD + levels[1]) / 2, 0]).rotation.y = Math.PI / 2;
      const prism = (points: [number, number][], from: number, length: number, material: THREE.Material) => {
        const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(-z, y))), { depth: length, bevelEnabled: false });
        geometry.rotateY(-Math.PI / 2);
        part(geometry, material, [from, 0, 0]);
      };
      if (a.hulk === 'bulker') {
        const tank = matt(hazed('#6f3f30', far));
        for (const side of [1, -1]) {
          prism([[side * halfB, levels[1]], [side * (halfB - 5.5), levels[1]], [side * halfB, levels[1] + 5]], cut[1], 60, tank);
          prism([[side * halfB, HD], [side * (halfB - 7), HD], [side * halfB, HD - 6]], cut[bands - 1], 60, tank);
        }
        // Frames along the far side of the hold, and a mound of the last cargo.
        const ribs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, HD - levels[1] - 11, 0.7), matt(hazed('#5f3528', far)), 28);
        for (let i = 0; i < 28; i++) ribs.setMatrixAt(i, new THREE.Matrix4().makeTranslation(deepest - 1 - Math.floor(i / 2) * 1.6, (HD + levels[1]) / 2 - 0.5, (i % 2 ? 1 : -1) * (halfB - 0.4)));
        hulk.add(ribs);
        slab([0.4, 2, B * 0.5], [cut[bands - 1] - 2, HD + 1, 0], burnt);
      } else if (a.hulk === 'tanker') {
        for (const side of [1, -1]) {
          slab([50, HD - levels[1], 0.3], [deepest - 25, (HD + levels[1]) / 2, side * B * 0.2], pale);
          for (let k = 2; k < bands; k++) for (const z of [halfB - 1, B * 0.2 + 0.9, B * 0.2 - 0.9]) slab([50 + (cut[k - 1] - deepest), 0.3, 1.7], [cut[k - 1] - (50 + (cut[k - 1] - deepest)) / 2, levels[k], side * z], steel);
          for (let k = 1; k < bands; k++) slab([0.6, levels[k + 1] - levels[k], 0.5], [cut[k] + 0.2, (levels[k] + levels[k + 1]) / 2, side * B * 0.2], burnt);
        }
        for (let k = 2; k < bands; k++) terraces.push({ x: cut[k - 1], y: levels[k], k });
        for (const z of [-3, -1.5, 0, 1.8]) { const pipe = part(new THREE.CylinderGeometry(0.4, 0.4, 60, 8), matt(hazed(z === 0 ? '#b5482f' : '#8f9391', far)), [cut[bands - 1] - 30, HD + 0.9, z]); pipe.rotation.z = Math.PI / 2; }
        for (let x = cut[bands - 1] - 2; x > cut[bands - 1] - 60; x -= 9) slab([0.4, 1.2, 9], [x, HD + 0.6, -0.5], burnt);
      } else {
        const guide = matt(hazed('#59645e', far));
        for (const side of [1, -1]) slab([50, HD - levels[1], 0.3], [deepest - 25, (HD + levels[1]) / 2, side * (halfB - 2.6)], pale);
        const columns: THREE.Matrix4[] = [];
        const cells = Math.floor((B - 6.2) / 2.6);
        for (let k = 1; k < bands; k++) for (let c = 0; c <= cells; c++) for (let row = 0; row < 2; row++)
          columns.push(new THREE.Matrix4().compose(new THREE.Vector3(cut[k] - 0.3 - row * 6.3, (levels[k] + levels[k + 1]) / 2, (c - cells / 2) * 2.6), new THREE.Quaternion(), new THREE.Vector3(1, levels[k + 1] - levels[k], 1)));
        const lattice = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 1, 0.22), guide, columns.length);
        columns.forEach((m, i) => lattice.setMatrixAt(i, m));
        hulk.add(lattice);
        for (let k = 2; k < bands; k++) { slab([0.25, 0.3, B - 5.4], [cut[k - 1] - 0.3, levels[k], 0], guide); terraces.push({ x: cut[k - 1], y: levels[k], k }); }
        const boxColours = ['#a8452f', '#2f5d8a', '#3d7a5a', '#c9b037', '#8a8f93', '#c8642a'];
        const left = 3 + Math.floor(mood.density * 9);
        for (let i = 0; i < left; i++) {
          const c = Math.floor(random() * cells), tier = Math.floor(random() * random() * 4), k = 1 + Math.floor(random() * Math.min(3, bands - 1));
          const box = slab([6.06, 2.59, 2.44], [cut[k] - 3.4, levels[1] + 1.45 + tier * 2.6, (c - cells / 2 + 0.5) * 2.6], matt(hazed(pick(boxColours), far)));
          if (random() < 0.2) box.rotation.set(0.12, 0.1, 0.3);
        }
      }
    }
    // Deck house and funnel far aft, almost lost in the haze.
    const aft = matt(hazed('#dcd8cc', 0.5)), funnelPaint = matt(hazed(topside, 0.5));
    slab([13, 11, B * 0.8], [-LEN * 0.8, HD + 5.5, 0], aft);
    slab([9, 3, B * 1.02], [-LEN * 0.78, HD + 12.5, 0], aft);
    slab([13.2, 0.9, B * 0.8 + 0.2], [-LEN * 0.8, HD + 8, 0], matt(hazed('#39424a', 0.5)));
    part(new THREE.CylinderGeometry(2.4, 2.9, 8, 14), funnelPaint, [-LEN * 0.86, HD + 15, 0]);
    part(new THREE.CylinderGeometry(2.45, 2.5, 1.6, 14), matt(hazed('#e8e4d8', 0.5)), [-LEN * 0.86, HD + 16, 0]);
    part(new THREE.CylinderGeometry(0.15, 0.25, 9, 6), aft, [-LEN * 0.74, HD + 18, 0]);
    // Things hanging off the cut: wires, a plate on its way down, rope ladders to the mud.
    const wire = matt('#2b2826');
    for (let i = 0; i < 4 + Math.floor(mood.wear * 6); i++) {
      const k = 1 + Math.floor(random() * (bands - 1)), len = 2 + random() * 7, z = (random() - 0.5) * (B - 2);
      const hang = slab([0.09, len, 0.09], [cut[k] + 0.5 + random() * 0.3, levels[k + 1] - len / 2, z], wire);
      hang.rotation.z = (random() - 0.5) * 0.12;
    }
    if (a.shift !== 'deserted') {
      const k = Math.max(1, bands - 2), z = halfB * 0.45;
      slab([0.1, 6, 0.1], [cut[k - 1] + 1.6, levels[k] + 3.2, z], wire);
      const plate = slab([0.2, 3.6, 5], [cut[k - 1] + 1.6, levels[k] - 1.6, z], matt(hazed(topside, far)));
      plate.rotation.set(0.2, 0.3, 0.05);
    }
    const bamboo = matt('#c9a85c');
    for (const z of [-halfB * 0.5, halfB * 0.2]) {
      const top = levels[Math.min(2, bands - 1)];
      for (const dz of [-0.3, 0.3]) { const pole = slab([0.12, Math.hypot(top, 3.5), 0.12], [cut[0] + 1.9, top / 2, z + dz], bamboo); pole.rotation.z = Math.atan2(3.5, top); }
      for (let r = 1; r < top / 0.6; r++) slab([0.08, 0.08, 0.6], [cut[0] + 3.6 - (r * 0.6 / top) * 3.5, r * 0.6, z], bamboo);
    }
    hulk.traverse((node) => { const mesh = node as THREE.Mesh; if (mesh.isMesh) mesh.receiveShadow = false; });

    // The flats: one painted sheet of mud in metres, with everything that has been dragged across it.
    const mud = new THREE.Color('#8c7f6d').lerp(sky[2], 0.22).lerp(new THREE.Color('#5d5852'), a.sky === 'monsoon' ? 0.3 : 0.08);
    const wetMud = mud.clone().lerp(new THREE.Color('#4a4743'), 0.42);
    const G = 100, PX = 1536, gx = (x: number) => ((x + 50) / G) * PX, gz = (z: number) => ((z + 75) / G) * PX, m = PX / G;
    const cutFoot = toWorld(cut[0] + 1, 0, 0);
    const anchors: [number, number][] = [[10, 14], [-9, 9], [16, 2]];
    const groundTexture = canvasTexture(PX, PX, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, PX);
      g.addColorStop(0, css(wetMud)); g.addColorStop(0.45, css(wetMud.clone().lerp(mud, 0.5))); g.addColorStop(0.8, css(mud)); g.addColorStop(1, css(mud.clone().lerp(new THREE.Color('#b9a88c'), 0.25)));
      ctx.fillStyle = g; ctx.fillRect(0, 0, PX, PX);
      for (let i = 0; i < 6000; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(255,250,235,0.07)' : 'rgba(20,18,16,0.08)'; const sz = 2 + random() * 5; ctx.fillRect(random() * PX, random() * PX, sz * 2.4, sz); }
      // Ripple lines left by the tide.
      ctx.strokeStyle = 'rgba(255,250,240,0.1)'; ctx.lineWidth = 2;
      for (let i = 0; i < 70; i++) { const y = random() * PX * 0.75, x = random() * PX; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 120, y + 14 * (random() - 0.5), x + 260, y + 20 * (random() - 0.5), x + 380 + random() * 200, y + 10 * (random() - 0.5)); ctx.stroke(); }
      // Oil: dark soaked patches everywhere, more as the place wears.
      const oils = 30 + Math.floor(mood.wear * 70) + (a.foreground === 'oil' ? 40 : 0);
      for (let i = 0; i < oils; i++) {
        const near = a.foreground === 'oil' && i % 2 === 0;
        const x = near ? gx((random() - 0.5) * 22) : random() * PX, y = near ? gz(-2 + random() * 16) : random() * PX, r = (near ? 0.6 + random() * 1.6 : 1 + random() * 4) * m;
        const blot = ctx.createRadialGradient(x, y, 0, x, y, r);
        blot.addColorStop(0, `rgba(22,20,24,${0.3 + random() * 0.3})`); blot.addColorStop(0.7, 'rgba(22,20,24,0.18)'); blot.addColorStop(1, 'rgba(22,20,24,0)');
        ctx.fillStyle = blot; ctx.save(); ctx.translate(x, y); ctx.scale(1.8, 0.7); ctx.translate(-x, -y); ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
        if (near || random() < 0.25) for (let ring = 0; ring < 3; ring++) { ctx.strokeStyle = `hsla(${(ring * 80 + random() * 60) % 360},55%,60%,0.2)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r * (0.5 + ring * 0.2), r * (0.2 + ring * 0.08), 0, 0, 7); ctx.stroke(); }
      }
      // Rust and shadow under the hulk.
      const stain = ctx.createRadialGradient(gx(cutFoot.x), gz(cutFoot.z), 2 * m, gx(cutFoot.x), gz(cutFoot.z), 26 * m);
      stain.addColorStop(0, 'rgba(60,34,22,0.6)'); stain.addColorStop(0.4, 'rgba(120,62,34,0.3)'); stain.addColorStop(1, 'rgba(120,62,34,0)');
      ctx.fillStyle = stain; ctx.fillRect(0, 0, PX, PX);
      // Cable drag marks from the winch stands to the foot of the cut, and plate gouges.
      const groove = (x0: number, z0: number, x1: number, z1: number, lines: number, spread: number, width: number, alpha: number) => {
        for (let l = 0; l < lines; l++) {
          const off = (l - (lines - 1) / 2) * spread, bend = (random() - 0.5) * 6;
          for (const [dx, colour, lw] of [[0, `rgba(30,26,24,${alpha})`, width], [width * 0.9, 'rgba(255,245,225,0.16)', width * 0.5]] as const) {
            ctx.strokeStyle = colour; ctx.lineWidth = lw * m;
            ctx.beginPath(); ctx.moveTo(gx(x0 + off) + dx * m, gz(z0));
            ctx.quadraticCurveTo(gx((x0 + x1) / 2 + bend + off) + dx * m, gz((z0 + z1) / 2), gx(x1 + off * 0.3) + dx * m, gz(z1));
            ctx.stroke();
          }
        }
      };
      const heavy = a.foreground === 'cables';
      anchors.forEach(([x, z], i) => groove(x, z, cutFoot.x + (i - 1) * 4, cutFoot.z + 2, heavy ? 5 : 2, heavy ? 0.5 : 0.35, heavy ? 0.16 : 0.09, heavy ? 0.6 : 0.4));
      for (let i = 0; i < 4 + Math.floor(mood.density * 5); i++) groove(cutFoot.x + (random() - 0.5) * 16, cutFoot.z + 3, 14 + random() * 16, -14 + random() * 22, 1, 0, 1.1 + random() * 1.2, 0.18);
      if (heavy) for (let i = 0; i < 3; i++) groove(-14 + i * 9 + random() * 3, 25, cutFoot.x + (random() - 0.5) * 8, cutFoot.z, 3, 0.4, 0.14, 0.55);
      // Lorry tracks along the top of the beach.
      for (const off of [0, 2]) { ctx.strokeStyle = 'rgba(40,34,30,0.3)'; ctx.lineWidth = 0.45 * m; ctx.setLineDash([0.3 * m, 0.14 * m]); ctx.beginPath(); ctx.moveTo(0, gz(17 + off)); ctx.bezierCurveTo(gx(-10), gz(13 + off), gx(12), gz(20 + off), PX, gz(15 + off)); ctx.stroke(); ctx.setLineDash([]); }
      if (a.foreground === 'footprints') for (let trail = 0; trail < 26; trail++) {
        let x = (random() - 0.5) * 30, z = 2 + random() * 14; const heading = Math.atan2(cutFoot.x - x + (random() - 0.5) * 30, cutFoot.z - z), steps = 12 + Math.floor(random() * 26);
        for (let i = 0; i < steps; i++) { ctx.fillStyle = 'rgba(34,29,26,0.5)'; ctx.beginPath(); ctx.ellipse(gx(x + Math.cos(heading) * (i % 2 ? 0.14 : -0.14)), gz(z), 0.06 * m, 0.14 * m, -heading, 0, 7); ctx.fill(); x += Math.sin(heading) * 0.45; z += Math.cos(heading) * 0.45; }
      }
      if (a.foreground === 'scrap') for (let i = 0; i < 46; i++) {
        const x = gx((random() - 0.5) * 30), y = gz(-6 + random() * 22), r = (0.3 + random() * 0.9) * m;
        const scorch = ctx.createRadialGradient(x, y, 0, x, y, r);
        scorch.addColorStop(0, 'rgba(16,14,13,0.75)'); scorch.addColorStop(0.6, 'rgba(60,34,22,0.4)'); scorch.addColorStop(1, 'rgba(60,34,22,0)');
        ctx.fillStyle = scorch; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    });
    const ground = new THREE.Group();
    root.add(ground);
    const flats = new THREE.Mesh(new THREE.PlaneGeometry(G, G), new THREE.MeshStandardMaterial({ map: groundTexture, roughness: mix(0.5, 0.75, mood.wear), metalness: 0.05 }));
    flats.rotation.x = -Math.PI / 2;
    flats.position.set(0, 0, -25);
    flats.receiveShadow = true;
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(700, 500), matt(wetMud.clone().lerp(mud, 0.3)));
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(0, -0.03, -120);
    ground.add(apron, flats);
    const waterColour = sky[2].clone().lerp(new THREE.Color('#ffffff'), 0.25).lerp(wetMud, 0.08);
    const water = new THREE.MeshStandardMaterial({ color: waterColour, roughness: 0.1, metalness: 0, emissive: waterColour, emissiveIntensity: 0.18 });
    const seaEdge = a.tide === 'in' ? -17 : a.tide === 'pools' ? -44 : -62;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 220), water);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.03, seaEdge - 110);
    sea.receiveShadow = true;
    ground.add(sea);
    const pool = (x: number, z: number, rx: number, rz: number) => {
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 20), water);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = (random() - 0.5) * 0.5;
      mesh.scale.set(rx, rz, 1);
      mesh.position.set(x, 0.02, z);
      mesh.receiveShadow = true;
      ground.add(mesh);
    };
    const clearOfSlots = (x: number, z: number, r: number) => SLOTS.every(([sx, sz, , sr]) => Math.hypot(x - sx, z - sz) > sr + r + 0.4);
    const pools = a.tide === 'out' ? 5 : a.tide === 'pools' ? 26 : 16;
    for (let i = 0; i < pools * 3 && ground.children.length < pools + 3; i++) {
      const z = a.tide === 'in' ? seaEdge + random() * 22 : mix(-40, 14, random()), x = (random() - 0.5) * (30 + (14 - z) * 1.1), rx = 1.2 + random() * (a.tide === 'out' ? 2 : 5), rz = rx * (0.25 + random() * 0.3);
      if (clearOfSlots(x, z, rx)) pool(x, z, rx, rz);
    }
    if (a.tide === 'in') for (let i = 0; i < 9; i++) pool(-45 + i * 11 + random() * 5, seaEdge + 1, 6 + random() * 4, 2.5 + random() * 3);
    // The hulk's reflection smeared down the wet mud toward us.
    const reflection = canvasTexture(64, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, rgba(hazed(hullWhite ? '#8a8a84' : topside, 0.35), a.tide === 'out' ? 0.4 : 0.6)); g.addColorStop(1, rgba(hazed(topside, 0.6), 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const edge = ctx.createLinearGradient(0, 0, w, 0);
      edge.addColorStop(0, 'rgba(0,0,0,1)'); edge.addColorStop(0.25, 'rgba(0,0,0,0)'); edge.addColorStop(0.75, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = edge; ctx.fillRect(0, 0, w, h);
    });
    const smear = new THREE.Mesh(new THREE.PlaneGeometry(B * 1.05, 26), new THREE.MeshBasicMaterial({ map: reflection, transparent: true, depthWrite: false }));
    smear.rotation.x = -Math.PI / 2;
    smear.rotation.z = -0.38;
    smear.position.set(cutFoot.x + 4.5, 0.05, cutFoot.z + 12);
    root.add(smear);

    // Other ships along the shore, flat in the haze.
    const silhouette = (x: number, z: number, scale: number, fade: number, whole: boolean) => {
      const beam = 15 * scale, h = 22 * scale;
      const hullShape = new THREE.Shape([[-beam * 0.72, 0], [beam * 0.72, 0], [beam, h * 0.5], [beam, h], [-beam, h], [-beam, h * 0.5]].map(([px, py]) => new THREE.Vector2(px, py)));
      const tone = matt(hazed(pick(['#3a3d42', '#5a3a30', '#2f4560']), fade));
      const body = new THREE.Mesh(new THREE.ShapeGeometry(hullShape), tone);
      body.position.set(x, 0, z);
      root.add(body);
      const house = new THREE.Mesh(new THREE.PlaneGeometry(beam * 0.95, h * 0.4), matt(hazed('#bdb8ac', Math.min(0.9, fade + 0.2))));
      house.position.set(x + beam * 0.1, h * 1.2, z - 2);
      const funnel = new THREE.Mesh(new THREE.PlaneGeometry(beam * 0.3, h * 0.3), tone);
      funnel.position.set(x + beam * 0.15, h * 1.5, z - 3);
      root.add(house, funnel);
      if (!whole) { const gap = new THREE.Mesh(new THREE.PlaneGeometry(beam * 1.5, h * 0.82), matt(hazed('#7a6a5c', fade))); gap.position.set(x, h * 0.55, z + 0.5); root.add(gap); for (let d = 1; d < 5; d++) { const deck = new THREE.Mesh(new THREE.PlaneGeometry(beam * 1.5, h * 0.035), tone); deck.position.set(x, h * (0.15 + d * 0.17), z + 0.8); root.add(deck); } }
      else {
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(3 * scale, 2 * scale), matt(hazed(pick(['#c8281f', '#2f5d8a', '#f2c82a']), fade * 0.6)));
        flag.position.set(x - beam * 0.2, h * 1.72, z - 1);
        const mast = new THREE.Mesh(new THREE.PlaneGeometry(0.4 * scale, h * 0.8), tone);
        mast.position.set(x - beam * 0.3, h * 1.4, z - 1);
        root.add(flag, mast);
      }
    };
    if (a.neighbours === 'row') { let i = 0; for (const [x, z] of [[-38, -95], [-66, -140], [60, -150], [-98, -180], [98, -185]] as const) { silhouette(x, z, 0.85 + random() * 0.2, 0.42 + i * 0.08, i === 3); i++; } }
    else if (a.neighbours === 'arrival') silhouette(-39, -92, 0.95, 0.4, true);

    // Haze: sheets of the horizon colour hung between us and everything far.
    const veilFade = canvasTexture(4, 128, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
    const veil = (z: number, opacity: number, h: number) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(700, h), new THREE.MeshBasicMaterial({ color: haze, map: veilFade, transparent: true, opacity, depthWrite: false }));
      mesh.position.set(0, h / 2 - 1, z);
      root.add(mesh);
    };
    const thick = { glare: 0.16, smog: 0.3, monsoon: 0.2, dusk: 0.22, dawn: 0.36 }[a.sky];
    veil(-24, thick * 0.7, 30);
    veil(-60, thick * 1.2, 46);
    veil(-100, thick * 1.5, 60);
    veil(-140, thick * 1.5, 70);

    // Dressing on the beach: the cables themselves, drums, bottles, poles, a plot board.
    const dress = new THREE.Group();
    root.add(dress);
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; dress.add(mesh); return mesh; };
    const cableSteel = matt('#3d3a37', { metalness: 0.5, roughness: 0.5 });
    anchors.forEach(([x, z], i) => {
      const end = new THREE.Vector3(cutFoot.x + (i - 1) * 4, 2.5 + i, cutFoot.z + 1.5);
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0.5, z), new THREE.Vector3(mix(x, end.x, 0.3), 0.06, mix(z, end.z, 0.3)), new THREE.Vector3(mix(x, end.x, 0.75) + (random() - 0.5) * 2, 0.06, mix(z, end.z, 0.75)), end]);
      put(new THREE.TubeGeometry(curve, 40, 0.045, 5), cableSteel, [0, 0, 0]);
    });
    if (a.foreground === 'cables') {
      const links = new THREE.InstancedMesh(new THREE.TorusGeometry(0.075, 0.024, 6, 10), cableSteel, 34);
      for (let i = 0; i < 34; i++) links.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(-1.4 + i * 0.105 + Math.sin(i * 0.4) * 0.12, 0.03, 8.4 - i * 0.05 + Math.sin(i * 0.7) * 0.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(i % 2 ? Math.PI / 2 : 0.2, 0.4, 0)), new THREE.Vector3(1, 1, 1)));
      links.castShadow = true;
      dress.add(links);
    }
    const drumColours = ['#2f5d8a', '#a8452f', '#3d7a5a', '#c9b037', '#5a5a5a'];
    const drums = 2 + Math.floor(mood.density * 5) + (a.foreground === 'oil' ? 4 : 0);
    for (let i = 0; i < drums; i++) {
      const x = -10 + (random() - 0.5) * 6, z = -9 + (random() - 0.5) * 6;
      if (!clearOfSlots(x, z, 0.4)) continue;
      const drum = put(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 14), matt(pick(drumColours), { metalness: 0.3, roughness: 0.6 }), [x, 0.44, z]);
      if (random() < 0.3) { drum.rotation.z = Math.PI / 2; drum.position.y = 0.29; drum.rotation.y = random() * 3; }
    }
    if (a.foreground === 'scrap') {
      const bits = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.04, 1), matt('#ffffff'), 40);
      const rusts = ['#6b4a3a', '#7a5238', '#4f3d36', topside];
      for (let i = 0; i < 40; i++) {
        let x = 0, z = 0;
        for (let tries = 0; tries < 6; tries++) { x = (random() - 0.5) * 26; z = -8 + random() * 22; if (clearOfSlots(x, z, 0.6)) break; }
        bits.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, 0.03, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, random() * 3, (random() - 0.5) * 0.2)), new THREE.Vector3(0.3 + random() * 0.9, 1, 0.2 + random() * 0.6)));
        bits.setColorAt(i, new THREE.Color(pick(rusts)));
      }
      bits.castShadow = bits.receiveShadow = true;
      dress.add(bits);
    }
    if (a.foreground === 'footprints') { const sandal = put(new THREE.BoxGeometry(0.1, 0.02, 0.26), matt(pick(['#2a6fb0', '#c8402f'])), [-1.2, 0.012, 12.6]); sandal.rotation.y = 0.6; }
    // Bamboo boundary poles with rag flags, and the plot board.
    const rags = mood.cheer > 0.5 ? ['#c8281f', '#f2c82a', '#2f8a5a', '#e58aa4'] : ['#8a2f28', '#6a6a62', '#c9c2a8'];
    for (const [x, z] of [[-10.5, -8], [-14, -24], [11.5, -9], [17, -26]] as const) {
      const h = 5 + random() * 2;
      put(new THREE.CylinderGeometry(0.05, 0.07, h, 6), bamboo, [x, h / 2, z]).rotation.z = (random() - 0.5) * 0.08;
      put(new THREE.PlaneGeometry(1.3, 0.8), matt(pick(rags), { side: THREE.DoubleSide }), [x + 0.7, h - 0.5, z]);
    }
    const boardTexture = canvasTexture(256, 160, (ctx, w, h) => {
      ctx.fillStyle = '#e9e2c8'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#1f3f72'; ctx.lineWidth = 8; ctx.strokeRect(6, 6, w - 12, h - 12);
      ctx.fillStyle = '#1f3f72'; ctx.textAlign = 'center'; ctx.font = 'bold 44px sans-serif'; ctx.fillText('PLOT', w / 2, 62);
      ctx.fillStyle = '#b3261f'; ctx.font = 'bold 64px sans-serif'; ctx.fillText(String(11 + Math.floor(random() * 150)), w / 2, 132);
      for (let i = 0; i < mood.wear * 30; i++) { ctx.fillStyle = 'rgba(120,70,40,0.3)'; ctx.fillRect(random() * w, random() * h, 4 + random() * 20, 20 + random() * 40); }
    });
    put(new THREE.BoxGeometry(2.6, 1.6, 0.06), new THREE.MeshStandardMaterial({ map: boardTexture, roughness: 0.8 }), [-10, 3.2, -15]).rotation.y = 0.3;
    for (const dx of [-1, 1]) put(new THREE.BoxGeometry(0.1, 4, 0.1), matt('#6b4a30'), [-10 + dx * 1.05, 2, -15 - dx * 0.33]);

    // People, as two instanced meshes: on the terraces, carrying a plate, or squatting round the fire.
    const people: { at: THREE.Vector3; squat: boolean }[] = [];
    const torches: THREE.Vector3[] = [];
    const crowd = a.shift === 'deserted' ? 0 : mix(0.45, 1, mood.energy);
    if (a.shift === 'working') {
      const sites = Math.round(mix(2, 6, mood.energy));
      for (let i = 0; i < sites && terraces.length; i++) {
        const t = terraces[Math.floor(random() * terraces.length)], z = (random() - 0.5) * (B - 5);
        people.push({ at: toWorld(t.x - 0.9, t.y + 0.15, z), squat: random() < 0.5 });
        torches.push(toWorld(t.x + 0.15, t.y + 0.1, z + 0.5));
      }
      const gx0 = 13, gz0 = -11, heading = 0.5, men = Math.round(mix(4, 8, mood.density));
      for (let i = 0; i < men; i++) people.push({ at: new THREE.Vector3(gx0 + Math.cos(heading) * i * 0.7, 0, gz0 - Math.sin(heading) * i * 0.7 + 0.2), squat: false });
      const load = put(new THREE.BoxGeometry(men * 0.7 + 0.6, 0.05, 1.1), matt(topside), [gx0 + Math.cos(heading) * (men - 1) * 0.35, 1.72, gz0 - Math.sin(heading) * (men - 1) * 0.35]);
      load.rotation.set(0.1, heading, 0);
    }
    if (a.shift === 'resting') {
      const fx = -9.5, fz = 5.5, men = Math.round(mix(3, 8, mood.density));
      for (let i = 0; i < men; i++) { const ang = (i / men) * Math.PI * 2 + random() * 0.4; people.push({ at: new THREE.Vector3(fx + Math.cos(ang) * 1.3, 0, fz + Math.sin(ang) * 1.1), squat: true }); }
      put(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshStandardMaterial({ color: '#ff8a3a', emissive: '#ff5a1a', emissiveIntensity: 2 }), [fx, 0.08, fz]).scale.y = 0.5;
      put(new THREE.CylinderGeometry(0.1, 0.14, 0.2, 10), matt('#2a2623', { metalness: 0.4 }), [fx, 0.28, fz]);
    }
    for (let i = 0; i < Math.round(crowd * 5); i++) {
      const x = (random() - 0.5) * 40, z = -26 + random() * 16;
      people.push({ at: new THREE.Vector3(x, 0, z), squat: false });
    }
    if (people.length) {
      const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 1, 0.26), matt('#ffffff'), people.length * 2);
      const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.125, 8, 6), matt('#7a5038'), people.length);
      const shirts = ['#3d6fa3', '#b8452f', '#d9c36a', '#5a8f6b', '#e8e2d0', '#6a4a8a', '#c9b89a'];
      people.forEach(({ at, squat }, i) => {
        const legs = squat ? 0.42 : 0.84, torso = 0.6;
        bodies.setMatrixAt(i * 2, new THREE.Matrix4().compose(new THREE.Vector3(at.x, at.y + legs / 2, at.z), new THREE.Quaternion(), new THREE.Vector3(0.8, legs, 1)));
        bodies.setColorAt(i * 2, new THREE.Color(pick(['#3b3f45', '#6b5a4a', '#9a8a6a', '#4a5a7a'])));
        bodies.setMatrixAt(i * 2 + 1, new THREE.Matrix4().compose(new THREE.Vector3(at.x, at.y + legs + torso / 2, at.z), new THREE.Quaternion(), new THREE.Vector3(1, torso, 1)));
        bodies.setColorAt(i * 2 + 1, new THREE.Color(pick(shirts)));
        heads.setMatrixAt(i, new THREE.Matrix4().makeTranslation(at.x, at.y + legs + torso + 0.14, at.z));
      });
      bodies.castShadow = heads.castShadow = true;
      root.add(bodies, heads);
    }
    const sparkMaterial = new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffae3a', emissiveIntensity: 3 });
    if (torches.length) {
      const per = 34, sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 4), sparkMaterial, torches.length * per);
      const toward = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), TURN);
      torches.forEach((torch, t) => {
        for (let i = 0; i < per; i++) {
          const fall = Math.pow(random(), 0.7) * Math.min(torch.y, 9), out = random() * (0.4 + fall * 0.3), size = i === 0 ? 0.3 : 0.07 + random() * 0.1;
          sparks.setMatrixAt(t * per + i, new THREE.Matrix4().compose(new THREE.Vector3(torch.x + toward.x * out + (random() - 0.5) * out, torch.y - (i ? fall : 0), torch.z + toward.z * out + (random() - 0.5) * out), new THREE.Quaternion(), new THREE.Vector3(size, size, size)));
        }
      });
      root.add(sparks);
    }
    // Birds take the flats when the people leave.
    const birds = Math.round((a.shift === 'deserted' ? 16 : 3) * mix(1.2, 0.5, mood.energy));
    if (birds) {
      const flock = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 0.5, 5), matt(a.sky === 'dawn' || a.tide !== 'out' ? '#f2f0e8' : '#1f1d1c'), birds);
      for (let i = 0; i < birds; i++) {
        let x = 0, z = 0;
        for (let tries = 0; tries < 6; tries++) { x = (random() - 0.5) * 34; z = -24 + random() * 34; if (clearOfSlots(x, z, 0.5)) break; }
        flock.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, 0.3, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, (random() - 0.5) * 0.5)), new THREE.Vector3(1, 1 + random() * 0.6, 1)));
      }
      flock.castShadow = true;
      root.add(flock);
    }

    // Smoke: from the cut, from the far shore, from the fire.
    const smokeMaterial = new THREE.MeshBasicMaterial({ color: hazed('#3a3531', a.sky === 'smog' ? 0.25 : 0.45), transparent: true, opacity: a.sky === 'smog' ? 0.34 : 0.24, depthWrite: false });
    const sources: THREE.Vector3[] = [];
    if (a.shift === 'working') { sources.push(toWorld(deepest - 6, HD, 3), toWorld(cut[1] - 2, levels[2], -halfB * 0.4)); }
    if (a.shift === 'resting') sources.push(new THREE.Vector3(-9.5, 0.4, 5.5));
    if (a.sky === 'smog' || mood.wear > 0.6) sources.push(toWorld(-LEN * 0.5, HD, 0), new THREE.Vector3(34, 0, -40));
    const puffs: { mesh: THREE.Mesh; source: THREE.Vector3; phase: number; big: number }[] = [];
    sources.forEach((source, s) => {
      const big = source.y < 1 && source.x < 0 ? 0.25 : 1;
      for (let i = 0; i < 9; i++) { const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), smokeMaterial); root.add(mesh); puffs.push({ mesh, source, phase: i / 9 + s * 0.37, big }); }
    });
    const wind = (random() < 0.5 ? -1 : 1) * mix(3, 9, mood.energy);
    const drift = (time: number) => puffs.forEach(({ mesh, source, phase, big }) => {
      const age = (phase + time * 0.035 * mix(0.6, 1.6, mood.energy)) % 1;
      mesh.position.set(source.x + wind * age * age * 3 * big, source.y + age * 22 * big, source.z - age * 4);
      mesh.scale.setScalar((0.8 + age * 4.6) * big);
    });
    drift(0);

    // Light: a veiled sun from over one shoulder, and a great deal of bounce from the haze.
    const hemi = new THREE.HemisphereLight(sky[1].clone().lerp(new THREE.Color('#ffffff'), 0.4), mud.clone().lerp(new THREE.Color('#6f675e'), 0.4), a.sky === 'monsoon' ? 1.9 : 1.6);
    const key = new THREE.DirectionalLight(sky[3].clone().lerp(new THREE.Color('#ffffff'), 0.35), a.sky === 'monsoon' ? 0.9 : mix(2.2, 1.5, sunLow));
    key.position.set(sunSide * mix(16, 30, sunLow), mix(34, 15, sunLow), 20);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 4;
    const rim = new THREE.DirectionalLight(sky[3], 0.5);
    rim.position.set(sunSide * 30, 20, -60);
    rim.target.position.set(0, 2, 0);
    root.add(hemi, key, key.target, rim, rim.target);

    // Camera: standing on the beach, looking up.
    const camera = new THREE.PerspectiveCamera(41, 1, 0.3, 700);
    camera.position.set(0.6 + (random() - 0.5) * 0.8, 1.75, 21.5);
    const aim = new THREE.Vector3(-1.2, 8.6, -33);
    camera.lookAt(aim);

    const twinkle = mix(0.15, 0.6, mood.energy);
    const world: World = {
      object: root, camera, background, capacity: SLOTS.length, ground, keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, i) => {
          const [x, z, maxHeight, maxRadius] = SLOTS[i % SLOTS.length];
          const fit = Math.min(maxHeight / Math.max(item.height, 0.05), maxRadius / Math.max(item.radius, 0.05));
          // Big things are brought down to the slot; small ones are helped a little but stay small beside the hulk.
          const scale = Math.min(fit, Math.max(1, Math.min(2.2, (maxHeight * 0.5) / Math.max(item.height, 0.05))));
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, 0, z);
          item.holder.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z) * 0.6 + (context.random() - 0.5) * 0.5;
          item.holder.updateMatrixWorld(true);
        });
        camera.lookAt(aim);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const shadow = key.shadow.camera;
        shadow.left = -30; shadow.right = 30; shadow.bottom = -30; shadow.top = 30;
        shadow.near = 1; shadow.far = 120;
        shadow.updateProjectionMatrix();
      },
      update(_dt, time) {
        drift(time);
        sparkMaterial.emissiveIntensity = 3 * (1 - twinkle * 0.5 + Math.sin(time * 31) * twinkle * 0.3 + Math.sin(time * 13.7) * twinkle * 0.2);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
    void clamp01;
    return world;
  },
});
