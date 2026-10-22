import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

const COLS = 8, ROWS = 4, CW = 256, CH = 128;
type Theme = 'dad' | 'company' | 'holiday' | 'souvenir' | 'floral';
type Ctx = CanvasRenderingContext2D;

function tint(geometry: THREE.BufferGeometry, colour: THREE.Color) {
  const count = geometry.attributes.position.count, data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colour.toArray(data, i * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(data, 3));
  return geometry;
}
function fuse(parts: THREE.BufferGeometry[]) {
  const merged = mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)))!;
  for (const part of parts) part.dispose();
  return merged;
}

/** One mug design, drawn to wrap a cylinder: the motif sits in the middle third, which faces front. */
function design(ctx: Ctx, theme: Theme, random: () => number) {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
  const words = (lines: readonly string[], ink: string, top = -44, span = 88) => {
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const step = span / lines.length;
    lines.forEach((line, i) => { ctx.font = `bold ${Math.min(step * 0.95, 190 / Math.max(line.length, 2))}px sans-serif`; ctx.fillText(line, 0, top + step * (i + 0.5), 112); });
  };
  let base = '#f4f1ea';
  const motif: (() => void)[] = [];
  if (theme === 'dad') {
    const [b, ink, accent] = pick([['#f4f1ea', '#1d2a55', '#d3312b'], ['#1f3a6b', '#fff6d6', '#f2c230'], ['#c62f2f', '#fff6e6', '#ffe14a'], ['#f0d23c', '#2a2320', '#c62f2f'], ['#f4f1ea', '#b3202a', '#1d2a55']]);
    base = b;
    const lines = pick([["WORLD'S", 'BEST', 'DAD'], ['#1', 'MOM'], ['BEST', 'GRANDPA', 'EVER'], ["WORLD'S", 'OKAYEST', 'BOSS'], ['#1', 'TEACHER'], ['I ♥', 'MY GRAN'], ['GOLF', 'DAD'], ['BEST', 'NANA']]);
    motif.push(() => { ctx.fillStyle = accent; ctx.fillRect(-60, -56, 120, 7); ctx.fillRect(-60, 49, 120, 7); words(lines, ink); });
  } else if (theme === 'company') {
    const [b, ink, accent] = pick([['#f4f1ea', '#16325c', '#e2462e'], ['#16325c', '#f4f1ea', '#39b6e8'], ['#121214', '#f4f1ea', '#f2a81d'], ['#0f7f7a', '#f4f1ea', '#f4d13a'], ['#f4f1ea', '#2f7d3a', '#2f7d3a'], ['#8c1d2c', '#f4f1ea', '#d9b24a']]);
    base = b;
    const name = pick([['ACME'], ['DATATRON'], ['1ST BANK'], ['K-ROCK', '98.7'], ['SALES', "TEAM '94"], ['UNITED', 'FREIGHT'], ['PHARMACO'], ['25 YEARS', 'SERVICE'], ['MIDLAND', 'TYRES']]);
    const logo = Math.floor(random() * 3);
    motif.push(() => {
      ctx.fillStyle = ctx.strokeStyle = accent; ctx.lineWidth = 9;
      if (logo === 0) { ctx.beginPath(); ctx.arc(0, -22, 22, 0, 7); ctx.fill(); ctx.fillStyle = b; ctx.fillRect(-26, -26, 52, 7); }
      else if (logo === 1) { ctx.beginPath(); ctx.arc(0, 4, 44, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 16, 44, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
      else for (let i = 0; i < 3; i++) ctx.fillRect(-30 + i * 22, -44 + i * 8, 16, 38 - i * 8);
      words(name, ink, 4, 46);
    });
  } else if (theme === 'holiday') {
    const kind = Math.floor(random() * 5);
    base = ['#b8242a', '#f4f1ea', '#1f6b3a', '#16161a', '#f3b4c6'][kind];
    motif.push(() => {
      if (kind === 0) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; for (const [x, y, r] of [[-30, -18, 22], [30, 14, 26], [-22, 34, 12]]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + Math.cos(k * 1.047) * r, y + Math.sin(k * 1.047) * r); ctx.lineTo(x - Math.cos(k * 1.047) * r, y - Math.sin(k * 1.047) * r); ctx.stroke(); } }
      if (kind === 1) { ctx.fillStyle = '#1f6b3a'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(0, -50 + k * 22); ctx.lineTo(18 + k * 12, -16 + k * 24); ctx.lineTo(-18 - k * 12, -16 + k * 24); ctx.fill(); } ctx.fillStyle = '#c62f2f'; ctx.fillRect(-8, 32, 16, 16); ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(0, -50, 7, 0, 7); ctx.fill(); }
      if (kind === 2) { ctx.fillStyle = '#b8242a'; ctx.fillRect(-60, -30, 120, 12); ctx.fillRect(-60, 18, 120, 12); words(['HO HO', 'HO'], '#fff6e6', -14, 30); }
      if (kind === 3) { ctx.fillStyle = '#f07d1a'; ctx.beginPath(); ctx.ellipse(0, 4, 44, 38, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#16161a'; for (const x of [-18, 18]) { ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x + 10, 0); ctx.lineTo(x, -16); ctx.fill(); } ctx.fillRect(-24, 16, 48, 9); }
      if (kind === 4) { ctx.fillStyle = '#c21f3a'; ctx.beginPath(); ctx.moveTo(0, 44); ctx.bezierCurveTo(-70, -6, -30, -62, 0, -24); ctx.bezierCurveTo(30, -62, 70, -6, 0, 44); ctx.fill(); }
    });
  } else if (theme === 'souvenir') {
    const kind = Math.floor(random() * 4);
    base = ['#bfe3f2', '#16161a', '#f4f1ea', '#f6dd6a'][kind];
    const place = pick([['NIAGARA', 'FALLS'], ['LAS VEGAS'], ['FLORIDA'], ['GRAND', 'CANYON'], ['PARIS'], ['BLACKPOOL'], ['HAWAII'], ['OHIO']]);
    motif.push(() => {
      if (kind === 0) { ctx.fillStyle = '#f2a81d'; ctx.beginPath(); ctx.arc(22, -24, 20, 0, 7); ctx.fill(); ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-24, 12); ctx.quadraticCurveTo(-18, -18, -30, -40); ctx.stroke(); ctx.strokeStyle = '#2f8a3f'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-30, -40); ctx.quadraticCurveTo(-30 + Math.cos(k * 1.2 + 3.4) * 20, -58, -30 + Math.cos(k * 1.2 + 3.4) * 34, -34 + Math.abs(Math.sin(k)) * 6); ctx.stroke(); } words(place, '#1c3f7a', 14, 40); }
      if (kind === 1) { ctx.fillStyle = '#f2c230'; for (const [x, w, h] of [[-52, 16, 40], [-32, 20, 66], [-8, 14, 50], [10, 22, 78], [36, 16, 44]]) ctx.fillRect(x, 14 - h, w, h); words(place, '#ff4f9a', 16, 40); }
      if (kind === 2) { words(['I ♥'], '#16161a', -50, 56); ctx.fillStyle = '#d3222b'; ctx.fillRect(-60, 48, 120, 8); words(place.slice(0, 1), '#16161a', 4, 42); }
      if (kind === 3) { ctx.fillStyle = '#a5562f'; ctx.beginPath(); ctx.moveTo(-58, 14); ctx.lineTo(-24, -44); ctx.lineTo(0, -8); ctx.lineTo(24, -52); ctx.lineTo(58, 14); ctx.fill(); words(place, '#5a2a14', 16, 40); }
    });
  } else {
    base = pick(['#f6efdc', '#f3d6dc', '#d6e6f2', '#eef0d8']);
    const petal = pick(['#d94f7a', '#3f5fb0', '#e3a11f', '#a04fc0']);
    const cat = random() < 0.35;
    motif.push(() => {
      for (let i = 0; i < 5; i++) {
        const x = -46 + i * 23, y = (i % 2 ? -22 : 22) + (cat ? 28 : 0) * (i % 2 ? 0 : 0.4);
        if (cat && i % 2) continue;
        ctx.fillStyle = petal; for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(p * 1.257) * 11, y + Math.sin(p * 1.257) * 11, 9, 9, 0, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill();
      }
      if (cat) { ctx.fillStyle = '#2a2424'; ctx.beginPath(); ctx.ellipse(0, -14, 26, 22, 0, 0, 7); ctx.fill(); for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 24, -26); ctx.lineTo(sx * 20, -50); ctx.lineTo(sx * 6, -32); ctx.fill(); } ctx.fillStyle = '#e8d25a'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 10, -16, 5, 7, 0, 0, 7); ctx.fill(); } }
    });
  }
  ctx.fillStyle = base; ctx.fillRect(0, 0, CW, CH);
  if (theme === 'floral') { ctx.fillStyle = '#c9a23a'; ctx.fillRect(0, 0, CW, 6); }
  ctx.save(); ctx.translate(CW / 2, CH / 2); ctx.scale(0.72, 1); for (const draw of motif) draw(); ctx.restore();
}

export default defineThing({
  questions: {
    theme: choice('What is painted on most of the mugs?', {
      dad: 'Family slogans in block capitals: World\'s Best Dad, #1 Mom, Best Grandpa Ever.',
      company: 'Corporate giveaways: logos of banks, radio stations and firms that no longer exist.',
      holiday: 'Seasonal mugs: snowflakes, Christmas trees, pumpkins and Valentine hearts.',
      souvenir: 'Holiday souvenirs with place names, palm trees and skylines.',
      floral: 'Grandmotherly florals and cats on cream china with gold rims.',
      mixed: 'A bit of everything, no two alike.',
    }),
    wares: choice('What shares the shelves with the mugs?', {
      mugs: 'Nothing: it is all mugs.',
      plates: 'Stacks of odd dinner plates and saucers in clashing glazes.',
      glass: 'Stray glassware: tumblers and single wine glasses, some tinted.',
      all: 'Plates and glassware both.',
    }),
    order: choice('How is it arranged?', {
      tidy: 'Tidy rows, handles all turned the same way by a careful volunteer.',
      jumble: 'A jumble: mugs on their sides, stacked inside each other, shoved in anywhere.',
    }),
    stock: score('How much is left on the shelves?', ['Nearly bare, a few stragglers', 'Picked over with gaps', 'Well stocked', 'Crammed to every edge']),
    favourite: noul('Is one chipped, obviously much-used favourite mug standing alone at the front of the top shelf?'),
    broken: noul('Has a mug fallen and smashed on the floor in front of the unit?'),
    sign: choice('What does the shelf-edge sign say, if there is one?', {
      none: 'No sign.',
      quarter: 'MUGS 25¢',
      five: '5 FOR $1',
      breakage: 'YOU BREAK IT YOU BUY IT',
      glass: 'ALL GLASS $1',
    }),
    unit: choice('What kind of shelf unit is it?', {
      steel: 'Grey boltless steel garage shelving with angle-iron posts.',
      wire: 'Chrome wire shelving on round posts, like a restaurant kitchen.',
      gondola: 'A cream shop gondola with a pegboard back panel and a kick plinth.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const W = 0.98, D = 0.38, levels = [0.14, 0.5, 0.86, 1.22] as const, T = 0.025;

    // The unit.
    if (a.unit === 'steel') {
      const paintwork = s.material('#7d8791', { metalness: 0.5, roughness: mix(0.45, 0.85, mood.wear) });
      for (const x of [-1, 1]) for (const z of [-1, 1]) { s.box([0.035, 1.36, 0.006], [x * W / 2, 0.68, z * (D / 2 + 0.003)], paintwork); s.box([0.006, 1.36, 0.035], [x * (W / 2 + 0.014), 0.68, z * (D / 2 - 0.012)], paintwork); }
      for (const y of levels) { s.box([W, T, D], [0, y - T / 2, 0], s.material('#a8a08c', { roughness: 0.9 })); for (const z of [-1, 1]) s.box([W, 0.045, 0.008], [0, y - 0.02, z * (D / 2 + 0.006)], paintwork); }
    } else if (a.unit === 'wire') {
      const chrome = s.material('#d5dade', { metalness: 0.9, roughness: mix(0.2, 0.6, mood.wear) });
      for (const x of [-1, 1]) for (const z of [-1, 1]) { s.cylinder(0.014, 0.014, 1.38, [x * W / 2, 0.69, z * D / 2], chrome, 10); s.cylinder(0.03, 0.03, 0.035, [x * W / 2, 0.02, z * D / 2], s.material('#222225'), 10).rotation.z = Math.PI / 2; }
      const bars: THREE.BufferGeometry[] = [];
      for (const y of levels) {
        for (let i = 0; i <= 14; i++) { const g = new THREE.BoxGeometry(W, 0.006, 0.006); g.translate(0, y - 0.004, -D / 2 + i * D / 14); bars.push(g); }
        for (const x of [-W / 2, -W / 6, W / 6, W / 2]) { const g = new THREE.BoxGeometry(0.008, 0.008, D); g.translate(x, y - 0.012, 0); bars.push(g); }
        for (const z of [-1, 1]) { const g = new THREE.BoxGeometry(W, 0.03, 0.006); g.translate(0, y - 0.018, z * D / 2); bars.push(g); }
      }
      s.mesh(fuse(bars), chrome);
    } else {
      const cream = s.material('#e6dfc8', { roughness: 0.7 });
      s.box([W, 0.12, D + 0.04], [0, 0.06, 0.01], s.material('#6a6558'));
      for (const x of [-1, 1]) s.box([0.04, 1.5, 0.05], [x * (W / 2 - 0.02), 0.75, -D / 2 - 0.02], cream);
      const peg = document.createElement('canvas'); peg.width = peg.height = 64;
      const pc = peg.getContext('2d')!; pc.fillStyle = '#cdb994'; pc.fillRect(0, 0, 64, 64); pc.fillStyle = '#6b5a3c'; pc.beginPath(); pc.arc(32, 32, 7, 0, 7); pc.fill();
      const board = new THREE.CanvasTexture(peg); board.colorSpace = THREE.SRGBColorSpace; board.wrapS = board.wrapT = THREE.RepeatWrapping; board.repeat.set(32, 46);
      s.box([W - 0.06, 1.4, 0.012], [0, 0.8, -D / 2 - 0.012], new THREE.MeshStandardMaterial({ map: board, roughness: 0.9 }));
      for (const y of levels) { s.box([W - 0.04, T, D], [0, y - T / 2, 0], cream); s.box([W - 0.04, 0.04, 0.008], [0, y - 0.02, D / 2 + 0.004], s.material('#bdb6a2')); }
    }

    // Mug designs share one atlas.
    const themes: readonly Theme[] = a.theme === 'mixed' ? ['dad', 'company', 'holiday', 'souvenir', 'floral'] : [a.theme, a.theme, a.theme, a.theme, a.theme, pick(['dad', 'company', 'holiday', 'souvenir', 'floral'] as const)];
    const canvas = document.createElement('canvas'); canvas.width = COLS * CW; canvas.height = ROWS * CH;
    const ctx = canvas.getContext('2d')!;
    const FAVOURITE = COLS * ROWS - 1;
    for (let cell = 0; cell < COLS * ROWS; cell++) {
      ctx.save(); ctx.translate((cell % COLS) * CW, Math.floor(cell / COLS) * CH);
      ctx.beginPath(); ctx.rect(0, 0, CW, CH); ctx.clip();
      if (cell === FAVOURITE) {
        ctx.fillStyle = '#f1ead6'; ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#3f6fb5'; for (let i = 0; i < 4; i++) ctx.fillRect(0, 14 + i * 30, CW, 13);
        ctx.fillStyle = '#b9b3a2'; ctx.beginPath(); ctx.moveTo(96, 0); ctx.lineTo(118, 30); ctx.lineTo(132, 12); ctx.lineTo(150, 0); ctx.fill();
        ctx.strokeStyle = '#4a4438'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(118, 30); ctx.lineTo(110, 62); ctx.lineTo(124, 90); ctx.lineTo(116, 128); ctx.stroke();
        ctx.fillStyle = 'rgba(90,60,30,0.35)'; ctx.fillRect(0, 0, CW, 5);
      } else design(ctx, pick(themes), random);
      if (mood.wear > 0.3) { ctx.fillStyle = `rgba(110,90,60,${mood.wear * 0.22})`; ctx.fillRect(0, 0, CW, CH * 0.12); }
      ctx.restore();
    }
    const atlas = new THREE.CanvasTexture(canvas); atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 4;
    const WHITE = new THREE.Color(1, 1, 1), INSIDE = new THREE.Color(0.5, 0.46, 0.4);
    const ceramic: THREE.BufferGeometry[] = [], crockery: THREE.BufferGeometry[] = [], glass: THREE.BufferGeometry[] = [];
    const remap = (g: THREE.BufferGeometry, cell: number, flat: boolean) => {
      const uv = g.attributes.uv, cx = cell % COLS, cy = Math.floor(cell / COLS);
      for (let i = 0; i < uv.count; i++) {
        const u = flat ? 0.02 : mix(0.004, 0.996, uv.getX(i)), v = flat ? 0.5 : mix(0.02, 0.98, uv.getY(i));
        uv.setXY(i, (cx + u) / COLS, (ROWS - 1 - cy + v) / ROWS);
      }
      return g;
    };
    const mug = (matrix: THREE.Matrix4, cell: number, r: number, h: number, handle = true) => {
      const wall = new THREE.CylinderGeometry(r, r * mix(0.8, 1, random()), h, 18, 1, true); wall.rotateY(Math.PI);
      const well = new THREE.CircleGeometry(r * 0.94, 18); well.rotateX(-Math.PI / 2); well.translate(0, h * 0.28, 0);
      const foot = new THREE.CircleGeometry(r * 0.8, 12); foot.rotateX(Math.PI / 2); foot.translate(0, -h / 2, 0);
      const parts = [tint(remap(wall, cell, false), WHITE), tint(remap(well, cell, true), INSIDE), tint(remap(foot, cell, true), WHITE)];
      if (handle) { const loop = new THREE.TorusGeometry(h * 0.3, h * 0.07, 6, 10, Math.PI); loop.rotateZ(-Math.PI / 2); loop.translate(r * 0.96, 0, 0); parts.push(tint(remap(loop, cell, true), WHITE)); }
      for (const part of parts) { part.applyMatrix4(matrix); ceramic.push(part); }
    };
    const GLAZES = ['#f1eee4', '#e9dfc4', '#3f5fa8', '#7a5234', '#8a9a4a', '#d9a521', '#e7b3bd', '#2f6f6a', '#b5452f'];
    const plates = (x: number, y: number, z: number, count: number, neat: boolean) => {
      let top = y;
      for (let i = 0; i < count; i++) {
        const r = mix(0.085, 0.125, random()), glaze = new THREE.Color(pick(GLAZES)), centre = random() < 0.5 ? new THREE.Color('#f1eee4') : glaze.clone().offsetHSL(0, 0, 0.1);
        const dish = new THREE.CylinderGeometry(r, r * 0.55, 0.017, 22), eye = new THREE.CylinderGeometry(r * 0.62, r * 0.6, 0.004, 22);
        eye.translate(0, 0.008, 0);
        const m = new THREE.Matrix4().compose(new THREE.Vector3(x + (neat ? 0 : (random() - 0.5) * 0.03), top + 0.0085, z + (neat ? 0 : (random() - 0.5) * 0.03)), new THREE.Quaternion().setFromEuler(new THREE.Euler(neat ? 0 : (random() - 0.5) * 0.08, 0, 0)), new THREE.Vector3(1, 1, 1));
        for (const g of [tint(dish, glaze), tint(eye, centre)]) { g.applyMatrix4(m); crockery.push(g); }
        top += 0.0125;
      }
    };
    const TINTS = ['#eaf6f6', '#eaf6f6', '#d9a04a', '#7fb884', '#6f9be0', '#e6a0b8'];
    const glassware = (x: number, y: number, z: number, lying: boolean) => {
      const stem = random() < 0.45, colour = new THREE.Color(pick(TINTS));
      const g: THREE.BufferGeometry = stem
        ? new THREE.LatheGeometry([[0.034, 0], [0.006, 0.008], [0.005, 0.085], [0.036, 0.12], [0.04, 0.15], [0.033, 0.19]].map(([r, h]) => new THREE.Vector2(r, h)), 14)
        : new THREE.LatheGeometry([[0, 0.004], [0.03, 0.004], [0.032, 0.012], [mix(0.034, 0.042, random()), mix(0.1, 0.15, random())]].map(([r, h]) => new THREE.Vector2(r, h)), 14);
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y + (lying ? 0.04 : 0), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, random() * 6, lying ? Math.PI / 2 : 0, 'YXZ')), new THREE.Vector3(1, 1, 1)));
      glass.push(tint(g, colour));
    };

    // Fill the shelves slot by slot.
    const neat = a.order === 'tidy';
    const stock = clamp01(a.stock * 0.8 + mood.density * 0.25);
    const columns = 7, pitch = 0.128, rowsZ = [0.088, -0.078] as const;
    const plan: Record<typeof a.wares, readonly string[]> = { mugs: ['m', 'm', 'm', 'm'], plates: ['p', 'p', 'm', 'm'], glass: ['g', 'm', 'm', 'g'], all: ['p', 'm', 'g', 'm'] };
    const pool = { mugs: 'mmmm', plates: 'mmmp', glass: 'mmmg', all: 'mmpg' }[a.wares];
    const handleTurn = -0.6 + (random() - 0.5) * 0.4;
    levels.forEach((y, level) => {
      const reach = Math.ceil(columns * mix(0.45, 1, stock) + (random() - 0.5) * 1.5);
      const fromLeft = random() < 0.5;
      for (let c = 0; c < columns; c++) {
        const x = (c - (columns - 1) / 2) * pitch;
        const reserved = a.favourite && level === levels.length - 1 && c >= 2 && c <= 4;
        const rank = fromLeft ? c : columns - 1 - c;
        const kind = neat ? plan[a.wares][level] : pool[Math.floor(random() * pool.length)];
        if (kind === 'p' && c < columns - 1 && !reserved && !(a.favourite && level === levels.length - 1 && c === 1)) {
          if (neat ? rank < reach : random() < mix(0.2, 1, stock)) plates(x + pitch / 2, y, 0, 2 + Math.floor(random() * (neat ? 9 : 7) * mix(0.5, 1, stock)), neat);
          c++;
          continue;
        }
        rowsZ.forEach((z, row) => {
          if (reserved && row === 0) return;
          if (!(neat ? rank < reach - (row === 0 && random() < 0.25 ? 1 : 0) : random() < mix(0.38, 1, stock))) return;
          const jx = x + (neat ? (random() - 0.5) * 0.008 : (random() - 0.5) * 0.05), jz = z + (neat ? (random() - 0.5) * 0.008 : (random() - 0.5) * 0.05);
          if (kind === 'g') { glassware(jx, y, jz, !neat && random() < 0.15); return; }
          const r = mix(0.04, 0.052, random()), h = mix(0.095, 0.125, random());
          const turn = neat ? handleTurn + (random() - 0.5) * 0.15 : random() * 6.3;
          const lying = !neat && random() < 0.16;
          const cell = Math.floor(random() * FAVOURITE);
          mug(new THREE.Matrix4().compose(new THREE.Vector3(jx, y + (lying ? r : h / 2), jz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, lying ? Math.PI / 2 : 0, 'YXZ')), new THREE.Vector3(1, 1, 1)), cell, r, h);
          if (!lying && !neat && random() < 0.18) mug(new THREE.Matrix4().compose(new THREE.Vector3(jx + 0.005, y + h + 0.03, jz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, random() * 6, 0.1)), new THREE.Vector3(1, 1, 1)), Math.floor(random() * FAVOURITE), r * 0.92, h * 0.9);
        });
      }
    });
    if (a.favourite) mug(new THREE.Matrix4().compose(new THREE.Vector3(0, levels[3] + 0.075, 0.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.75, 0)), new THREE.Vector3(1, 1, 1)), FAVOURITE, 0.062, 0.15);
    if (a.broken) {
      const cell = Math.floor(random() * FAVOURITE), cx = (random() - 0.5) * 0.5;
      for (let i = 0; i < 9; i++) {
        const arc = mix(0.5, 1.6, random());
        const shard = new THREE.CylinderGeometry(0.047, 0.045, mix(0.03, 0.09, random()), 6, 1, true, random() * 6, arc);
        tint(remap(shard, cell, false), WHITE);
        shard.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(cx + (random() - 0.5) * 0.4, 0.035, D / 2 + 0.16 + random() * 0.25), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 + (random() - 0.5), random() * 6, random() * 6)), new THREE.Vector3(1, 1, 1)));
        ceramic.push(shard);
      }
      const loop = new THREE.TorusGeometry(0.032, 0.008, 6, 10, Math.PI); loop.rotateX(Math.PI / 2); loop.translate(cx + 0.1, 0.008, D / 2 + 0.34);
      ceramic.push(tint(remap(loop, cell, true), WHITE));
    }

    if (ceramic.length) s.mesh(fuse(ceramic), new THREE.MeshStandardMaterial({ map: atlas, vertexColors: true, roughness: mix(0.25, 0.6, mood.wear), side: THREE.DoubleSide }));
    else atlas.dispose();
    if (crockery.length) s.mesh(fuse(crockery), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.3, 0.6, mood.wear) }));
    if (glass.length) { const pane = s.mesh(fuse(glass), new THREE.MeshPhysicalMaterial({ vertexColors: true, transparent: true, opacity: 0.42, roughness: 0.08, depthWrite: false, side: THREE.DoubleSide })); pane.castShadow = false; }

    if (a.sign !== 'none') {
      const text = { quarter: 'MUGS 25¢', five: '5 FOR $1', breakage: 'YOU BREAK IT YOU BUY IT', glass: 'ALL GLASS $1' }[a.sign];
      const wide = a.sign === 'breakage' ? 0.62 : 0.34;
      const card = s.label(text, wide, 0.085, [(random() - 0.5) * 0.2, levels[2] - 0.05, D / 2 + 0.016], a.sign === 'breakage' ? '#fff6e0' : '#b3202a', a.sign === 'breakage' ? '#b3202a' : mood.cheer > 0.4 ? '#ffe04a' : '#f1e6c8');
      card.rotation.z = (random() - 0.5) * mix(0.02, 0.14, mood.wear);
    }
    return s.finish();
  },
});
