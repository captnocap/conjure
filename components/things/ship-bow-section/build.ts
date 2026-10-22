import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

const TYPES = {
  bulker: 'A bulk carrier: blunt, full and plain, with a bulbous forefoot and one stubby foremast.',
  tanker: 'An oil tanker: very broad and bluff, deck pipes and a catwalk running aft to the cut.',
  container: 'A container ship: a fine sharp bow with a great overhanging flare, a breakwater and a few boxes left behind.',
  tramp: 'An old general cargo tramp: small, with a straight raked stem and a derrick post.',
  ferry: 'A passenger ferry: white, with rows of portholes and a stepped deckhouse of windows.',
} as const;
const SHAPE: Record<keyof typeof TYPES, { h: number; b: number; k: number; entry: number; rake: number; curve: number; bulb: boolean; flare: number }> = {
  bulker: { h: 19, b: 24, k: 0.5, entry: 12, rake: 2.5, curve: 2, bulb: true, flare: 0.25 },
  tanker: { h: 20, b: 28, k: 0.42, entry: 12, rake: 2, curve: 2, bulb: true, flare: 0.15 },
  container: { h: 21, b: 22, k: 0.95, entry: 24, rake: 8, curve: 2.2, bulb: true, flare: 0.75 },
  tramp: { h: 14, b: 16, k: 0.85, entry: 15, rake: 5, curve: 1, bulb: false, flare: 0.4 },
  ferry: { h: 16, b: 20, k: 0.8, entry: 19, rake: 6, curve: 1.4, bulb: false, flare: 0.55 },
};
const LIVERY = {
  black: 'Black topsides over red anti-fouling, the classic working ship.',
  blue: 'Deep company blue over a red-brown bottom.',
  green: 'Dark bottle green over red.',
  oxide: 'Red lead from keel to rail, the colour of a ship that was never pretty.',
  grey: 'Flat grey over black, anonymous.',
  white: 'White over blue, once smart, now weeping rust.',
  orange: 'Faded safety orange over black.',
} as const;
const PAINT: Record<keyof typeof LIVERY, [string, string, string]> = {
  black: ['#23262b', '#8c3a2c', '#e8e4d8'],
  blue: ['#1f3f72', '#7a3528', '#e8e4d8'],
  green: ['#1f4a3a', '#8a3a2a', '#e8e4d8'],
  oxide: ['#96412f', '#7a3023', '#f0e9d6'],
  grey: ['#7d848a', '#2c2e31', '#f0f0ea'],
  white: ['#e6e3d8', '#274a78', '#1e2c44'],
  orange: ['#cf6a2a', '#26282b', '#f4efe0'],
};
const NAMES = {
  promise: 'OCEAN PROMISE in tall welded letters.',
  stella: 'STELLA MARIS, a name given with a blessing.',
  harvest: 'GOLDEN HARVEST, optimistic and long ago.',
  trader: 'PACIFIC TRADER, plain and commercial.',
  star: 'NORTHERN STAR, far from any north.',
  renamed: 'A short stencilled last-voyage name, EVER 7, daubed over the ghost of the old one.',
  blanked: 'Painted out with a grey rectangle before the last voyage; only the weld ghosts remain.',
} as const;
const NAME_TEXT: Record<keyof typeof NAMES, string> = {
  promise: 'OCEAN PROMISE', stella: 'STELLA MARIS', harvest: 'GOLDEN HARVEST', trader: 'PACIFIC TRADER', star: 'NORTHERN STAR', renamed: 'EVER 7', blanked: 'OCEAN PROMISE',
};
const PORTS = {
  monrovia: 'MONROVIA', panama: 'PANAMA', valletta: 'VALLETTA', majuro: 'MAJURO', limassol: 'LIMASSOL', basseterre: 'BASSETERRE, a flag bought for the final trip',
} as const;

export default defineThing({
  questions: {
    type: choice('What kind of ship was it?', TYPES),
    livery: choice('What colour is the hull paint?', LIVERY),
    name: choice('What name is on the bow?', NAMES),
    port: choice('What port of registry is lettered under the name?', PORTS),
    cut: score('How much of the ship has been cut away behind the bow?', [
      'Barely started: a long forward third of the ship still stands',
      'A deep block of bow with several holds of decks showing',
      'A short slab, taller than it is long',
      'Only the stem itself, a thin leaning slice',
    ]),
    draught: choice('What are the draught marks at the stem like?', {
      metric: 'Crisp white metric numerals climbing the stem.',
      roman: 'Old Roman numerals in feet.',
      ghost: 'Mostly scaled off, a few numerals surviving.',
      chalk: 'Overwritten with big yellow chalk tallies by the cutters.',
    }),
    anchor: choice('Where is the anchor?', {
      housed: 'Still drawn up tight in the hawsepipe, as if she might sail.',
      dropped: 'Let go one last time: hanging on its chain down to the sand.',
      gone: 'Already taken for scrap; an empty pipe weeping rust.',
    }),
    work: choice('What is happening at the cut edge right now?', {
      silent: 'Nothing. Work has stopped and the steel just stands there.',
      cutting: 'Torches are burning: sparks fall from the edge and small figures stand on the decks.',
      lowering: 'A cut plate hangs on a wire from the deck edge, about to be dropped.',
      ladders: 'Bamboo ladders and ropes lean against it, climbers gone for tea.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const T = SHAPE[a.type];
    const H = T.h, HD = H - 1.3, halfB = T.b / 2;
    const [topside, bottom, ink] = PAINT[a.type === 'ferry' && a.livery === 'black' ? 'white' : a.livery];
    const remain = mix(27, 11, Math.pow(a.cut, 0.8)) * (H / 19);

    // Hull form, in ship coordinates: stem toward +x, cut toward -x, port side at +z.
    const stemX = (y: number) => -T.rake * Math.pow(1 - clamp01(y / H), T.curve);
    const levels = 8;
    const jag = Array.from({ length: levels + 1 }, () => (random() - 0.5) * 1.8);
    const slant = a.cut * 5 + random() * 2;
    const cutX = (y: number) => {
      const h = clamp01(y / H) * levels, i = Math.min(levels - 1, Math.floor(h));
      const x = -remain + mix(jag[i], jag[i + 1], h - i) + (slant * y) / H;
      return Math.min(x, stemX(y) - 2.5);
    };
    const halfBreadth = (x: number, y: number) => {
      const h = clamp01(y / H);
      const entry = T.entry * mix(1.35, 1 - T.flare * 0.55, h);
      const along = clamp01((stemX(y) - x) / entry);
      const bilge = y < 2.6 ? 0.7 + 0.3 * Math.sqrt(1 - (1 - y / 2.6) ** 2) : 1;
      return halfB * bilge * Math.pow(Math.sin((along * Math.PI) / 2), T.k);
    };
    const NI = 28, NJ = 24;
    const xMin = Math.min(...Array.from({ length: NJ + 1 }, (_u, j) => cutX((H * j) / NJ))), span = -xMin + 0.01;
    const station = (t: number, y: number) => mix(cutX(y), stemX(y), 1 - Math.pow(1 - t, 1.7));

    // Painted hull side: one canvas in metres, mirrored lettering for the far side.
    const paint = (side: 1 | -1) => {
      const ppm = Math.min(30, 1400 / span);
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(span * ppm);
      canvas.height = Math.ceil(H * ppm);
      const ctx = canvas.getContext('2d')!;
      const px = (x: number) => (x - xMin) * ppm, py = (y: number) => (H - y) * ppm;
      const wl = H * 0.4;
      ctx.fillStyle = topside;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = bottom;
      ctx.fillRect(0, py(wl), canvas.width, canvas.height);
      ctx.fillStyle = a.livery === 'white' ? '#b8402e' : '#d8d2c2';
      ctx.fillRect(0, py(wl + 0.45), canvas.width, 0.45 * ppm);
      if (a.type === 'ferry') {
        ctx.fillStyle = bottom;
        ctx.fillRect(0, py(H * 0.8), canvas.width, 0.5 * ppm);
        ctx.fillStyle = '#1b2028';
        for (const row of [0.56, 0.68]) for (let x = xMin + 1; x < -4; x += 1.9) { ctx.beginPath(); ctx.arc(px(x), py(H * row), 0.32 * ppm, 0, 7); ctx.fill(); }
      }
      // Plate seams.
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 1;
      for (let y = 1.2; y < H; y += 2.3) {
        ctx.beginPath(); ctx.moveTo(0, py(y)); ctx.lineTo(canvas.width, py(y)); ctx.stroke();
        for (let x = xMin + ((y * 7) % 5); x < 0; x += 7) { ctx.beginPath(); ctx.moveTo(px(x), py(y)); ctx.lineTo(px(x), py(y + 2.3)); ctx.stroke(); }
      }
      // Fouling and scum under the old waterline.
      for (let i = 0; i < 260; i++) {
        const y = random() ** 1.5 * wl;
        ctx.fillStyle = ['rgba(120,128,92,0.35)', 'rgba(196,190,160,0.3)', 'rgba(60,58,48,0.3)'][i % 3];
        ctx.beginPath(); ctx.ellipse(random() * canvas.width, py(y), (0.4 + random() * 1.4) * ppm, (0.15 + random() * 0.4) * ppm, 0, 0, 7); ctx.fill();
      }
      const text = (label: string, x: number, y: number, size: number, colour: string, alpha: number, font = 'bold') => {
        ctx.save();
        ctx.translate(px(x), py(y));
        ctx.scale(side, 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = colour;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${font} ${size * ppm}px sans-serif`;
        ctx.fillText(label, 0, 0);
        ctx.restore();
      };
      // Name and port of registry.
      const fade = mix(1, 0.45, mood.wear);
      const label = NAME_TEXT[a.name], letter = H * 0.088;
      const nameX = stemX(H * 0.86) - 3.2 - label.length * letter * 0.36, nameY = H * 0.86;
      if (a.name === 'blanked') {
        text(label, nameX, nameY, letter, ink, 0.3);
        ctx.fillStyle = 'rgba(128,130,128,0.82)';
        ctx.fillRect(px(nameX - label.length * letter * 0.38), py(nameY + letter * 0.75), label.length * letter * 0.76 * ppm, letter * 1.5 * ppm);
      } else if (a.name === 'renamed') {
        text('OCEAN PROMISE', nameX - 3, nameY, letter, ink, 0.22);
        text(label, nameX + 2, nameY - 0.1, letter * 1.05, '#f3f0e6', 0.95, 'bold italic');
      } else text(label, nameX, nameY, letter, ink, fade);
      const port = a.port.toUpperCase();
      text(port, nameX, nameY - letter * 1.25, letter * 0.5, ink, fade * (a.name === 'blanked' ? 0.5 : 0.9));
      // Draught marks beside the stem.
      for (let m = 2; m < H * 0.62; m += 1) {
        const x = stemX(m) - 2.2 - halfBreadth(stemX(m) - 2.2, m) * 0.02;
        if (a.draught === 'ghost' && random() < 0.6) continue;
        const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
        if (a.draught === 'chalk') text(String(Math.round(m * 3 + random() * 2)), x - 0.4 + random() * 0.5, m, 0.95, '#f2d23c', 0.95, 'italic bold');
        else text(a.draught === 'roman' ? roman[m + 2] ?? 'XVI' : `${m * 2}`.padStart(2, ' '), x, m, 0.72, m < wl ? '#efe8da' : ink, a.draught === 'ghost' ? 0.55 : 0.95);
      }
      // Rust: weeping streaks from the rail, the hawsepipe and the seams.
      const streaks = 30 + Math.floor(mood.wear * 130);
      for (let i = 0; i < streaks; i++) {
        const x = random() * canvas.width, top = py(H * (0.3 + random() * 0.7)), length = (1 + random() * 6) * ppm, w = (0.1 + random() * 0.45) * ppm;
        const g = ctx.createLinearGradient(0, top, 0, top + length);
        g.addColorStop(0, `rgba(${130 + random() * 40},${60 + random() * 25},30,${0.35 + mood.wear * 0.4})`);
        g.addColorStop(1, 'rgba(120,60,30,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, top, w, length);
      }
      const hx = px(stemX(H * 0.7) - 5.5), hy = py(H * 0.7);
      const g = ctx.createLinearGradient(0, hy, 0, hy + 7 * ppm);
      g.addColorStop(0, 'rgba(110,50,22,0.85)');
      g.addColorStop(1, 'rgba(110,50,22,0)');
      ctx.fillStyle = g;
      ctx.fillRect(hx - 0.6 * ppm, hy, 1.2 * ppm, 7 * ppm);
      // Scorch along the cut.
      const burn = ctx.createLinearGradient(0, 0, 3.5 * ppm, 0);
      burn.addColorStop(0, 'rgba(20,16,14,0.8)');
      burn.addColorStop(1, 'rgba(20,16,14,0)');
      ctx.fillStyle = burn;
      ctx.fillRect(0, 0, (3.5 + slant) * ppm, canvas.height);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    };

    const inside = s.material(mix(0, 1, random()) > 0.5 ? '#b9b49c' : '#9fae9c', { side: THREE.BackSide, roughness: 0.9 });
    const steel = s.material('#6b5446', { roughness: 0.9, side: THREE.DoubleSide });
    const burnt = s.material('#2a2320', { roughness: 0.95 });
    const deckPaint = s.material(a.type === 'ferry' ? '#5b7a63' : a.livery === 'oxide' ? '#5f6a5c' : '#7d4234', { side: THREE.DoubleSide, roughness: 0.9 });
    const dark = s.material('#2b2d30', { roughness: 0.8 });
    const iron = s.material('#3c3430', { roughness: 0.85, metalness: 0.3 });

    for (const side of [1, -1] as const) {
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      for (let j = 0; j <= NJ; j++)
        for (let i = 0; i <= NI; i++) {
          const y = (H * j) / NJ, x = station(i / NI, y);
          positions.push(x, y, side * halfBreadth(x, y));
          uvs.push((x - xMin) / span, y / H);
        }
      for (let j = 0; j < NJ; j++)
        for (let i = 0; i < NI; i++) {
          const p = j * (NI + 1) + i, q = p + 1, r = p + NI + 1, t = r + 1;
          if (side > 0) index.push(p, q, r, q, t, r);
          else index.push(p, r, q, q, r, t);
        }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      s.mesh(geometry, new THREE.MeshStandardMaterial({ map: paint(side), roughness: mix(0.6, 0.95, mood.wear), metalness: 0.1 }));
      s.mesh(geometry.clone(), inside);
    }

    // Horizontal plates: the bottom, the tween decks and the weather deck, all ending at the cut.
    const plate = (y: number, material: THREE.Material) => {
      const positions: number[] = [], index: number[] = [];
      for (let i = 0; i <= NI; i++) {
        const x = station(i / NI, y), z = halfBreadth(x, y);
        positions.push(x, y, z, x, y, -z);
        if (i < NI) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      s.mesh(geometry, material);
    };
    plate(0.02, steel);
    const decks: number[] = [];
    for (let y = a.type === 'ferry' ? 2.6 : 3.2; y < HD - 1.8; y += a.type === 'ferry' ? 2.7 : a.type === 'tramp' ? 3.4 : 4.2) decks.push(y);
    decks.push(HD);
    for (const y of decks) {
      plate(y, y === HD ? deckPaint : steel);
      // The deck edge as a burnt girder across the cut, with pillars down to the deck below.
      const x = cutX(y), z = halfBreadth(x, y);
      s.box([0.3, 0.42, z * 2], [x + 0.05, y - 0.2, 0], burnt);
      for (const f of [-0.5, 0, 0.5]) s.box([0.22, 2.2, 0.22], [x + 0.6 + random() * 0.6, y - 1.3, f * z * 1.3], iron);
    }
    // A watertight bulkhead part-way in, pierced by one doorway.
    {
      const xb = mix(xMin + slant, stemX(0), 0.42);
      const positions: number[] = [], index: number[] = [];
      let rows = 0;
      for (let j = 0; j <= NJ; j++) {
        const y = Math.min((H * j) / NJ, HD);
        if (xb < cutX(y) + 0.5) break;
        const z = halfBreadth(xb, y);
        positions.push(xb, y, z, xb, y, -z);
        rows++;
      }
      for (let j = 0; j < rows - 1; j++) index.push(j * 2, j * 2 + 1, j * 2 + 2, j * 2 + 1, j * 2 + 3, j * 2 + 2);
      if (rows > 2) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(index);
        geometry.computeVertexNormals();
        s.mesh(geometry, s.material('#a8a089', { side: THREE.DoubleSide, roughness: 0.9 }));
        for (const y of decks.slice(0, -1)) s.box([0.08, 1.9, 0.8], [xb - 0.06, y + 1, (random() - 0.5) * halfB], dark);
      }
    }
    // The shell's cut edge, blackened.
    {
      const edge: [number, number, number][] = [];
      for (let j = NJ; j >= 0; j--) { const y = (H * j) / NJ, x = cutX(y); edge.push([x, y, halfBreadth(x, y)]); }
      for (let j = 0; j <= NJ; j++) { const y = (H * j) / NJ, x = cutX(y); edge.push([x, y, -halfBreadth(x, y)]); }
      s.tube(edge, 0.17, burnt);
    }

    // Bulbous forefoot.
    if (T.bulb) {
      const bulb = s.ball([H * 0.21, H * 0.105, H * 0.1], [stemX(H * 0.1) - H * 0.02, H * 0.115, 0], s.material(bottom, { roughness: 0.85 }), 24);
      bulb.rotation.z = 0.06;
    }

    // Forecastle gear.
    const fx = stemX(HD);
    for (const side of [1, -1]) {
      s.cylinder(0.75, 0.75, 1.1, [fx - 8, HD + 0.85, side * 2.1], iron, 14).rotation.x = Math.PI / 2;
      s.box([1.6, 0.5, 1.6], [fx - 8, HD + 0.3, side * 2.1], dark);
      for (const dx of [0, 0.9]) s.cylinder(0.22, 0.26, 0.8, [fx - 4.6 - dx, HD + 0.4, side * Math.max(1, halfBreadth(fx - 5, HD) - 1.3)], dark, 10);
    }
    s.rod([fx - 0.9, HD, 0], [fx - 0.5, H + 2.6, 0], 0.07, dark);
    if (a.type === 'bulker' || a.type === 'tanker' || a.type === 'container') {
      const mx = Math.max(fx - 11, cutX(HD) + 1.5);
      s.cylinder(0.28, 0.42, 7.5, [mx, HD + 3.75, 0], s.material('#d9c9a0'), 10);
      s.box([0.2, 0.2, 3.4], [mx, HD + 6.2, 0], s.material('#d9c9a0'));
      s.box([0.9, 0.5, 0.9], [mx, HD + 7.6, 0], dark);
    }
    if (a.type === 'tanker') {
      const start = cutX(HD) + 0.3;
      for (const z of [-1.6, -0.8, 0.8]) s.rod([start, HD + 0.9, z], [fx - 10, HD + 0.9, z], 0.28, s.material(z > 0 ? '#b5482f' : '#8f9391'));
      s.box([Math.max(1, fx - 10 - start), 0.12, 1.3], [(start + fx - 10) / 2, HD + 2.2, 2.4], dark);
      for (let x = start + 1; x < fx - 10; x += 3.5) s.box([0.14, 2.2, 0.14], [x, HD + 1.1, 2.4], dark);
    }
    if (a.type === 'container') {
      s.box([0.25, 2.2, T.b * 0.7], [fx - 13 < cutX(HD) + 3 ? cutX(HD) + 3 : fx - 13, HD + 1.1, 0], s.material(topside));
      const colours = ['#a8452f', '#2f5d8a', '#3d7a5a', '#c9b037', '#8a8f93'];
      const bx = cutX(HD) + 4;
      if (bx < fx - 16) for (let i = 0; i < 2 + Math.floor(mood.density * 4); i++)
        s.box([6.06, 2.59, 2.44], [bx + (random() - 0.5) * 0.4, HD + 1.3 + Math.floor(i / 3) * 2.6, ((i % 3) - 1) * 2.6], s.material(colours[Math.floor(random() * colours.length)]));
    }
    if (a.type === 'tramp') {
      const mx = Math.max(fx - 12, cutX(HD) + 1.5);
      s.cylinder(0.3, 0.45, 9, [mx, HD + 4.5, 0], s.material('#c8a25a'), 10);
      for (const side of [1, -1]) s.rod([mx, HD + 1.2, side * 0.5], [mx - 5 * (mx - 6 > cutX(HD) ? 1 : -0.6), HD + 6.5, side * 3], 0.14, s.material('#c8a25a'));
      s.box([0.3, 0.3, 4], [mx, HD + 8.2, 0], dark);
    }
    if (a.type === 'ferry') {
      const start = cutX(H) + 0.4, end = fx - 9;
      if (end - start > 3) for (let tier = 0; tier < 2; tier++) {
        const from = start, to = end - tier * 3.5, w = T.b * (0.78 - tier * 0.1);
        if (to - from < 2) continue;
        s.box([to - from, 2.6, w], [(from + to) / 2, HD + 1.3 + tier * 2.6, 0], s.material('#e9e6dc'));
        s.box([to - from + 0.05, 0.9, w + 0.06], [(from + to) / 2, HD + 1.6 + tier * 2.6, 0], dark);
      }
    }

    // Anchor and hawsepipe on both bows.
    const ay = H * 0.7, ax = stemX(ay) - 5.5;
    for (const side of [1, -1]) {
      const az = halfBreadth(ax, ay), slope = (halfBreadth(ax + 0.5, ay) - halfBreadth(ax - 0.5, ay));
      const lean = (halfBreadth(ax, ay + 0.5) - halfBreadth(ax, ay - 0.5));
      const group = new THREE.Group();
      group.position.set(ax, ay, side * (az + 0.05));
      group.rotation.y = side * Math.atan(-slope);
      group.rotation.x = side * Math.atan(lean);
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], rz = 0, rx = 0) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...at); mesh.rotation.z = rz; mesh.rotation.x = rx;
        mesh.castShadow = true;
        group.add(mesh);
      };
      const pipe = new THREE.TorusGeometry(0.75, 0.24, 8, 20);
      add(pipe, iron, [0, 0, 0.05 * side]);
      add(new THREE.CircleGeometry(0.7, 16), new THREE.MeshStandardMaterial({ color: '#0d0c0b', side: THREE.DoubleSide }), [0, 0, 0.06 * side]);
      const anchor = new THREE.Group();
      const part = (size: [number, number, number], at: [number, number, number], rz = 0) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), iron);
        mesh.position.set(...at); mesh.rotation.z = rz; mesh.castShadow = true;
        anchor.add(mesh);
      };
      part([0.38, 3, 0.34], [0, -1.5, 0]);
      part([2.6, 0.55, 0.5], [0, -3.1, 0]);
      part([0.42, 1.9, 0.4], [-1.1, -2.4, 0], -0.28);
      part([0.42, 1.9, 0.4], [1.1, -2.4, 0], 0.28);
      if (a.anchor === 'housed') { anchor.position.set(0, 0.3, 0.3 * side); group.add(anchor); }
      s.root.add(group);
      if (a.anchor === 'dropped') {
        const gz = side * (az + 1.2 + random());
        const links = 18;
        for (let i = 0; i < links; i++) {
          const y = mix(ay - 0.4, 0.4, i / (links - 1));
          s.box([0.16, (ay / links) * 0.8, 0.34], [ax + Math.sin(i) * 0.04, y, mix(side * (az + 0.3), gz, (i / (links - 1)) ** 2)], iron).rotation.y = (i % 2) * 1.57;
        }
        anchor.position.set(ax - 0.5, 0.3, gz + side * 0.6);
        anchor.rotation.set(side * 1.45, 0.5, 0);
        anchor.position.y = 0.25;
        s.root.add(anchor);
      }
    }

    // People, for scale, and the work in hand.
    const shirts = ['#3d6fa3', '#b8452f', '#d9c36a', '#5a8f6b', '#e8e2d0', '#6a4a8a'];
    const person = (x: number, y: number, z: number) => {
      const shirt = s.material(shirts[Math.floor(random() * shirts.length)]);
      s.box([0.3, 0.8, 0.22], [x, y + 0.4, z], s.material('#2f3338'));
      s.box([0.42, 0.62, 0.26], [x, y + 1.1, z], shirt);
      s.ball([0.12, 0.13, 0.12], [x, y + 1.55, z], s.material('#7a5038'), 8);
      if (random() < 0.5) s.ball([0.14, 0.08, 0.14], [x, y + 1.66, z], s.material('#e3c53a'), 8);
    };
    const edgeAt = (y: number, f: number): [number, number, number] => { const x = cutX(y); return [x, y, f * halfBreadth(x, y)]; };
    const scrap = s.material('#5d4a3f', { roughness: 0.95 });
    const loose = 2 + Math.floor(mood.density * 7);
    for (let i = 0; i < loose; i++) {
      const w = 1.5 + random() * 3;
      const plateMesh = s.box([w, 0.08, 1 + random() * 2.5], [xMin - 2 - random() * 6, 0.06 + i * 0.01, (random() - 0.3) * halfB * 1.6], i % 3 ? scrap : s.material(topside));
      plateMesh.rotation.y = random() * 3;
      if (random() < 0.3) { plateMesh.rotation.z = 0.5; plateMesh.position.y = w * 0.24; }
    }
    person(xMin - 3 - random() * 3, 0, halfB * (0.4 + random() * 0.6));
    if (a.work === 'cutting') {
      const sparkMaterial = new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffae3a', emissiveIntensity: 2.4 });
      const points: { at: [number, number, number]; size: number }[] = [];
      const torches = 2 + Math.floor(mood.energy * 3);
      for (let t = 0; t < torches; t++) {
        const y = decks[Math.floor(random() * decks.length)];
        const f = t === 0 ? 0.98 : (random() - 0.2) * 1.2;
        const [x, , z] = edgeAt(y, Math.min(0.98, f));
        person(x + 0.6, y, z * 0.9);
        s.box([0.1, 1.6, 0.1], [x, y - 0.6, z], new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff6a1a', emissiveIntensity: 2 }));
        for (let k = 0; k < 46; k++) {
          const fall = random() ** 0.7 * Math.min(y, 9), out = random() * 1.6 * (fall / 4 + 0.3);
          points.push({ at: [x - out * (0.4 + random()), y - 0.4 - fall, z + (random() - 0.4) * out], size: 0.07 + random() * 0.1 });
        }
      }
      s.scatter(new THREE.SphereGeometry(1, 5, 4), sparkMaterial, points);
    }
    if (a.work === 'lowering') {
      const [x, y, z] = edgeAt(HD, 0.55);
      const drop = HD * (0.35 + random() * 0.3);
      s.rod([x + 0.5, y + 3.2, z], [x - 2.2, y + 3.6, z], 0.1, iron);
      s.rod([x + 0.5, y, z], [x + 0.5, y + 3.2, z], 0.12, iron);
      s.rod([x - 2.2, y + 3.6, z], [x - 2.2, y - drop + 2, z], 0.04, dark);
      const hung = s.box([0.12, 4, 5.5], [x - 2.2, y - drop, z], s.material(topside));
      hung.rotation.x = (random() - 0.5) * 0.5;
      hung.rotation.y = (random() - 0.5) * 0.4;
      person(x + 1.4, y, z - 1.5);
      person(x + 1.2, y, z + 1.8);
    }
    if (a.work === 'ladders') {
      const bamboo = s.material('#c9a85c');
      for (let n = 0; n < 2 + Math.floor(random() * 2); n++) {
        const y = decks[Math.min(decks.length - 1, n)], [x, , z] = edgeAt(y, (random() - 0.5) * 1.4);
        const foot = x - 1.5 - y * 0.22;
        for (const dz of [-0.28, 0.28]) s.rod([foot, 0, z + dz], [x - 0.1, y + 0.9, z + dz], 0.06, bamboo);
        for (let r = 1; r < y / 0.5; r++) { const f = r / (y / 0.5 + 1); s.box([0.05, 0.05, 0.56], [mix(foot, x - 0.1, f), mix(0, y + 0.9, f), z], bamboo); }
      }
      const [x, y, z] = edgeAt(HD, -0.3);
      s.rod([x, y, z], [x - 0.6, 0.1, z + 1], 0.04, s.material('#d8cfae'));
    }

    s.root.rotation.y = 0.36;
    return s.finish({ footprint: Math.max(span, T.b) * 0.5 });
  },
});
