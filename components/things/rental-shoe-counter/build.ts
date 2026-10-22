import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

function paint(width: number, height: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const SIGNS = {
  rental: ['SHOE RENTAL', '#b3261e', '#f7ecc4'],
  price: ['SHOES  $1.50', '#1c3f7a', '#f4f1e4'],
  street: ['NO STREET SHOES', '#f7ecc4', '#7a2a1a'],
  socks: ['SOCKS REQUIRED', '#1e4a3a', '#f1d98a'],
  back: ['BACK IN 5 MIN', '#2a2a2a', '#e9e2cf'],
  league: ['LEAGUE NIGHT', '#fff2a8', '#3b2a6b'],
} as const;

export default defineThing({
  questions: {
    stock: choice('How picked-over are the shoe cubbies?', {
      full: 'Every pigeonhole holds a pair: the doors have just opened.',
      busy: 'About half the pairs are out on the lanes, gaps everywhere.',
      odd: 'Only the very large and very small sizes are left, the middle stripped bare.',
      bare: 'Nearly empty: three or four lonely pairs in a wall of dark holes.',
      jumbled: 'Full but thrown back in a hurry: single shoes, pairs crooked, some toe-out.',
    }),
    deposit: choice('What has been left on the counter as a deposit?', {
      none: 'Nothing has been left.',
      trainers: 'A pair of worn white trainers.',
      keys: 'A bunch of car keys with a big plastic fob.',
      boot: 'A single child\'s red rubber boot.',
      heels: 'A pair of high heels, one fallen on its side.',
      licence: 'A wallet lying open with a driving licence beside it.',
    }),
    sign: choice('What does the sign above say?', {
      rental: 'SHOE RENTAL', price: 'SHOES $1.50', street: 'NO STREET SHOES', socks: 'SOCKS REQUIRED', back: 'BACK IN 5 MIN', league: 'LEAGUE NIGHT',
    }),
    shoes: choice('What do the rental shoes look like?', {
      classic: 'Red, blue and cream panels, the classic clown-ish rental.',
      saddle: 'Brown and tan saddle shoes, older and more dignified.',
      neon: '1990s velcro shoes in lime, pink and black.',
      mono: 'Black and white, like spats.',
    }),
    counter: choice('What is the counter faced with?', {
      woodgrain: 'Fake walnut wood-grain laminate with a chrome edge.',
      boomerang: 'Orange formica printed with pale boomerangs.',
      teal: 'Speckled teal laminate with a cream top.',
      carpet: 'The same patterned carpet as the floor, run up the front of the counter.',
    }),
    shutter: noul('Is a roller shutter pulled half down over the shoes?'),
    waiting: noul('Is a pair of rental shoes set out on the counter, waiting for someone?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const glow = mix(0.25, 1, mood.cheer);
    const chrome = s.material('#dfe3e6', { metalness: 0.9, roughness: 0.22 });
    const dark = s.material('#1b1a1d', { roughness: 0.9 });
    const cream = s.material('#ece3c8', { roughness: 0.6 });
    const scheme = {
      classic: { body: ['#c8202a', '#1f4fa0', '#c8202a'], patch: ['#1f4fa0', '#ece3c8', '#ece3c8'], sole: '#ece3c8' },
      saddle: { body: ['#c9a36a', '#b98d55', '#d4b27c'], patch: ['#5a3320', '#4a2a1a', '#5a3320'], sole: '#3a2a1c' },
      neon: { body: ['#151518', '#151518', '#2a2a30'], patch: ['#b8ff2a', '#ff3fa8', '#2fe0ff'], sole: '#f4f4f4' },
      mono: { body: ['#f2f0ea', '#141416', '#f2f0ea'], patch: ['#141416', '#f2f0ea', '#141416'], sole: '#8a8a8a' },
    }[a.shoes];

    // ---- the pigeonhole wall
    const COLS = 8, ROWS = 5, CW = 0.31, CH = 0.2, W = COLS * CW + 0.06, Y0 = 0.82, DEPTH = 0.36, BZ = -0.52;
    const carcass = s.material(a.counter === 'woodgrain' ? '#6b4526' : a.counter === 'boomerang' ? '#7a5632' : '#5c5a55', { roughness: 0.7 });
    s.box([W, Y0, DEPTH], [0, Y0 / 2, BZ], carcass);
    s.box([W, ROWS * CH + 0.04, 0.03], [0, Y0 + ROWS * CH / 2, BZ - DEPTH / 2 + 0.015], dark);
    for (let r = 0; r <= ROWS; r++) s.box([W, 0.022, DEPTH], [0, Y0 + r * CH, BZ], carcass);
    for (let c = 0; c <= COLS; c++) s.box([c === 0 || c === COLS ? 0.03 : 0.016, ROWS * CH, DEPTH], [(c - COLS / 2) * CW, Y0 + ROWS * CH / 2, BZ], carcass);
    // size tabs along each shelf lip
    for (let r = 0; r < ROWS; r++) {
      const map = paint(1024, 32, (c, w, h) => {
        c.fillStyle = '#00000000'; c.clearRect(0, 0, w, h);
        for (let col = 0; col < COLS; col++) {
          const size = ROWS * COLS > 0 ? (r * COLS + col) * 0.5 + (r < 1 ? 10 : 3) : 0;
          const label = r === 0 ? `K${10 + col}` : String(4 + (r - 1) * 2.5 + col * 0.5 > 0 ? (3 + (r - 1) * 2 + col * 0.5) : size);
          c.fillStyle = '#f3ecd6'; c.fillRect((col + 0.3) * w / COLS, 3, w / COLS * 0.4, h - 6);
          c.fillStyle = '#2a2a2a'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(label, (col + 0.5) * w / COLS, h / 2 + 1);
        }
      });
      s.mesh(new THREE.PlaneGeometry(COLS * CW, 0.03), new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.5, roughness: 0.8 }), [0, Y0 + r * CH + 0.004, BZ + DEPTH / 2 + 0.003]);
    }

    // which cubbies hold shoes
    const holds = (r: number, c: number) => {
      const lean = (mood.density - 0.5) * 0.3;
      if (a.stock === 'full' || a.stock === 'jumbled') return random() < 0.97;
      if (a.stock === 'busy') return random() < 0.5 + lean;
      if (a.stock === 'odd') return (c === 0 || c === COLS - 1 || (c === 1 && r % 2 === 0) || (r === 0 && c > 4)) && random() < 0.92;
      return random() < 0.09 + lean * 0.2;
    };
    const shoeGeometry = new RoundedBoxGeometry(0.1, 0.085, 0.26, 3, 0.035);
    const patchGeometry = new RoundedBoxGeometry(0.085, 0.07, 0.06, 2, 0.028);
    const soleGeometry = new THREE.BoxGeometry(0.1, 0.014, 0.25);
    const tabGeometry = new THREE.BoxGeometry(0.034, 0.026, 0.004);
    const spots: { m: THREE.Matrix4; body: string; patch: string; out: boolean }[] = [];
    const q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    let pairs = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!holds(r, c)) continue;
      pairs++;
      const tone = Math.floor(random() * 3);
      const small = r === 0 ? 0.78 : mix(0.9, 1.05, (c + r * 2) / 16);
      for (const side of [-1, 1]) {
        const messy = a.stock === 'jumbled';
        if (messy && random() < 0.18) continue;
        const out = messy && random() < 0.25;
        e.set(0, (out ? Math.PI : 0) + (random() - 0.5) * (messy ? 0.7 : 0.12), messy && random() < 0.15 ? Math.PI / 2 : 0);
        const y = Y0 + r * CH + 0.011 + 0.05 * small + (e.z ? 0.006 : 0);
        const m = new THREE.Matrix4().compose(new THREE.Vector3((c - COLS / 2 + 0.5) * CW + side * 0.062, y, BZ + 0.04 + (random() - 0.5) * (messy ? 0.07 : 0.02)), q.setFromEuler(e), one.clone().multiplyScalar(small));
        spots.push({ m, body: scheme.body[tone], patch: scheme.patch[tone], out });
      }
    }
    if (spots.length) {
      const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, offset: THREE.Vector3, colour: (spot: typeof spots[number]) => string | null) => {
        const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
        const shift = new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z);
        spots.forEach((spot, i) => {
          mesh.setMatrixAt(i, spot.m.clone().multiply(shift));
          const tint = colour(spot);
          if (tint) mesh.setColorAt(i, new THREE.Color(tint).lerp(new THREE.Color('#7d7466'), mood.wear * 0.3));
        });
        mesh.castShadow = mesh.receiveShadow = true;
        s.root.add(mesh);
      };
      instanced(shoeGeometry, new THREE.MeshStandardMaterial({ roughness: 0.6 }), new THREE.Vector3(0, 0, 0), (spot) => spot.body);
      instanced(patchGeometry, new THREE.MeshStandardMaterial({ roughness: 0.6 }), new THREE.Vector3(0, 0.004, 0.108), (spot) => spot.patch);
      instanced(soleGeometry, s.material(scheme.sole), new THREE.Vector3(0, -0.044, 0), () => null);
      instanced(tabGeometry, s.material('#fbf8ee'), new THREE.Vector3(0, 0.012, 0.139), () => null);
    }

    // ---- sign above
    const [text, ink, paper] = SIGNS[a.sign];
    const TOP = Y0 + ROWS * CH;
    const signMap = paint(1024, 160, (c, w, h) => {
      c.fillStyle = paper; c.fillRect(0, 0, w, h);
      c.strokeStyle = ink; c.lineWidth = 8; c.strokeRect(12, 12, w - 24, h - 24);
      c.fillStyle = ink; c.font = `bold ${a.sign === 'back' ? 'italic ' : ''}96px ${a.sign === 'back' ? 'cursive' : 'sans-serif'}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(text, w / 2, h / 2 + 6, w - 80);
      if (a.sign === 'league') for (let i = 0; i < 22; i++) { c.beginPath(); c.arc(30 + i * (w - 60) / 21, 22, 6, 0, 7); c.fill(); c.beginPath(); c.arc(30 + i * (w - 60) / 21, h - 22, 6, 0, 7); c.fill(); }
    });
    const handwritten = a.sign === 'back';
    const SW = handwritten ? 0.9 : W, SH = handwritten ? 0.3 : 0.36;
    const board = s.mesh(new THREE.BoxGeometry(SW, SH, 0.06), [dark, dark, dark, dark, new THREE.MeshStandardMaterial({ map: signMap, roughness: 0.7, emissive: '#ffffff', emissiveMap: signMap, emissiveIntensity: handwritten ? 0 : 0.35 * glow }), dark] as unknown as THREE.Material, [0, TOP + 0.05 + SH / 2, BZ + 0.08]);
    if (handwritten) { board.position.set(0.3, TOP - 0.2, BZ + DEPTH / 2 + 0.05); board.rotation.z = -0.06; s.box([W, 0.08, DEPTH], [0, TOP + 0.04, BZ], carcass); }
    else for (const x of [-1, 1]) s.box([0.04, SH + 0.05, 0.1], [x * (SW / 2 + 0.02), TOP + 0.05 + SH / 2, BZ + 0.08], chrome);

    // ---- roller shutter
    if (a.shutter) {
      const drop = mix(0.42, 0.62, random()) * ROWS * CH;
      const slatMap = paint(32, 256, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#8e949a' : '#b4babf'; c.fillRect(0, i * h / 16, w, h / 16); } });
      slatMap.wrapT = THREE.RepeatWrapping; slatMap.repeat.set(1, drop / 0.5);
      s.mesh(new THREE.BoxGeometry(W - 0.02, drop, 0.02), new THREE.MeshStandardMaterial({ map: slatMap, metalness: 0.5, roughness: 0.5 }), [0, TOP - drop / 2, BZ + DEPTH / 2 + 0.03]);
      s.box([W - 0.02, 0.05, 0.035], [0, TOP - drop, BZ + DEPTH / 2 + 0.03], chrome);
      s.cylinder(0.02, 0.02, 0.05, [0, TOP - drop - 0.04, BZ + DEPTH / 2 + 0.04], dark, 8);
    }

    // ---- the counter
    const CWID = W + 0.1, CHT = 1.0, CD = 0.56, CZ = 0.52;
    const faceMap = paint(512, 256, (c, w, h) => {
      if (a.counter === 'woodgrain') {
        c.fillStyle = '#6b4526'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 90; i++) { c.strokeStyle = `rgba(${30 + random() * 40},${15 + random() * 20},5,0.45)`; c.lineWidth = 0.5 + random() * 2; c.beginPath(); const x = random() * w; c.moveTo(x, 0); c.bezierCurveTo(x + (random() - 0.5) * 20, h * 0.3, x + (random() - 0.5) * 20, h * 0.6, x + (random() - 0.5) * 10, h); c.stroke(); }
        c.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 1; i < 4; i++) c.fillRect(i * w / 4, 0, 2, h);
      } else if (a.counter === 'boomerang') {
        c.fillStyle = '#e07a2a'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 40; i++) { c.save(); c.translate(random() * w, random() * h); c.rotate(random() * 6.28); c.strokeStyle = ['#f6e2b4', '#f2c261', '#8a3f1a'][i % 3]; c.lineWidth = 3; c.beginPath(); c.moveTo(-14, 6); c.quadraticCurveTo(0, -14, 14, 6); c.stroke(); c.restore(); }
      } else if (a.counter === 'teal') {
        c.fillStyle = '#2f8a86'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 1400; i++) { c.fillStyle = ['#f1ead2', '#1c5552', '#e3b23c'][i % 3]; c.fillRect(random() * w, random() * h, 2, 2); }
      } else {
        c.fillStyle = '#3a2a4a'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 70; i++) { c.fillStyle = ['#e0457b', '#2fb5ad', '#f2c12e', '#7a4fd0'][i % 4]; c.save(); c.translate(random() * w, random() * h); c.rotate(random() * 6.28); if (i % 2) c.fillRect(-8, -2, 16, 4); else { c.beginPath(); c.moveTo(0, -9); c.lineTo(8, 6); c.lineTo(-8, 6); c.fill(); } c.restore(); }
      }
      c.fillStyle = 'rgba(40,30,20,0.35)';
      for (let i = 0; i < mood.wear * 50; i++) c.fillRect(random() * w, h * mix(0.6, 1, random()), 4 + random() * 30, 1 + random() * 3);
    });
    s.mesh(new THREE.BoxGeometry(CWID, CHT - 0.1, CD - 0.08), new THREE.MeshStandardMaterial({ map: faceMap, roughness: a.counter === 'carpet' ? 1 : 0.4 }), [0, 0.05 + (CHT - 0.1) / 2, CZ]);
    s.box([CWID - 0.04, 0.06, CD - 0.14], [0, 0.03, CZ], dark);
    s.box([CWID + 0.06, 0.05, CD + 0.04], [0, CHT - 0.025, CZ], a.counter === 'teal' ? cream : s.material(a.counter === 'woodgrain' ? '#d8cdb4' : a.counter === 'boomerang' ? '#f1ead2' : '#4a4652', { roughness: 0.35 }));
    s.box([CWID + 0.07, 0.03, 0.015], [0, CHT - 0.025, CZ + CD / 2 + 0.022], chrome);

    // counter-top furniture, laid out left to right with jitter
    const top = CHT;
    const at = (x: number, z = 0) => [x * (CWID / 2 - 0.2) + (random() - 0.5) * 0.06, top, CZ + z + (random() - 0.5) * 0.04] as const;
    // bell
    { const [x, y, z] = at(0.55, 0.08);
      s.cylinder(0.055, 0.06, 0.012, [x, y + 0.006, z], dark, 20);
      s.mesh(new THREE.SphereGeometry(0.05, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), chrome, [x, y + 0.012, z]);
      s.cylinder(0.008, 0.008, 0.025, [x, y + 0.07, z], dark, 8); }
    // disinfectant spray
    { const [x, y, z] = at(0.82, -0.08);
      const canMap = paint(128, 128, (c, w, h) => { c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#1f7fc4'; c.fillRect(0, h * 0.25, w, h * 0.5); c.fillStyle = '#ffffff'; c.font = 'bold 20px sans-serif'; c.textAlign = 'center'; c.fillText('FRESH', w / 4, h * 0.56); c.fillText('FRESH', w * 0.75, h * 0.56); });
      s.mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.19, 16), new THREE.MeshStandardMaterial({ map: canMap, metalness: 0.3, roughness: 0.4 }), [x, y + 0.095, z]);
      s.cylinder(0.02, 0.031, 0.02, [x, y + 0.2, z], chrome, 16);
      s.cylinder(0.014, 0.014, 0.03, [x, y + 0.222, z], s.material('#e8e8e8'), 10);
      if (mood.wear > 0.6) s.cylinder(0.033, 0.033, 0.19, [x + 0.12, y + 0.033, z + 0.05], s.material('#c9c9c2', { metalness: 0.3 }), 16).rotation.z = Math.PI / 2; }

    const shoe = (colours: { body: string; patch: string; sole: string }, where: readonly [number, number, number], turn: number, scale = 1, tipped = false) => {
      const g = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, tint: string, x: number, y: number, z: number) => { const m = new THREE.Mesh(geometry, s.material(tint)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
      add(new THREE.BoxGeometry(0.1, 0.018, 0.29), colours.sole, 0, 0.009, 0);
      add(new RoundedBoxGeometry(0.1, 0.085, 0.14, 3, 0.035), colours.patch, 0, 0.058, -0.075);
      add(new RoundedBoxGeometry(0.1, 0.06, 0.2, 3, 0.028), colours.body, 0, 0.045, 0.045);
      add(new RoundedBoxGeometry(0.06, 0.02, 0.1, 2, 0.008), '#f4f1e6', 0, 0.078, 0.01);
      g.position.set(...where); g.rotation.y = turn; g.scale.setScalar(scale);
      if (tipped) { g.rotation.z = Math.PI / 2; g.position.y += 0.05 * scale; }
      s.root.add(g);
    };
    if (a.waiting) {
      const [x, y, z] = at(-0.05, 0.02); const tone = Math.floor(random() * 3);
      const colours = { body: scheme.body[tone], patch: scheme.patch[tone], sole: scheme.sole };
      shoe(colours, [x - 0.07, y, z], 0.08, 1.05); shoe(colours, [x + 0.07, y, z + 0.02], -0.1, 1.05);
    }
    // the deposit, with a paper tag
    const [dx, dy, dz] = at(-0.62, 0.0);
    if (a.deposit !== 'none') {
      const tag = s.label('#' + String(10 + Math.floor(random() * 80)), 0.11, 0.06, [dx + 0.26, dy + 0.003, dz + 0.14], '#2a2a2a', '#f1d98a');
      tag.rotation.set(-Math.PI / 2, 0, 0.3);
    }
    if (a.deposit === 'trainers') {
      const colours = { body: mood.wear > 0.5 ? '#cfc8b4' : '#f2f0ea', patch: '#e4e0d4', sole: '#8a8f96' };
      shoe(colours, [dx - 0.08, dy, dz], 0.4, 1.15); shoe(colours, [dx + 0.09, dy, dz + 0.03], 0.15, 1.15, random() < 0.4);
    } else if (a.deposit === 'keys') {
      s.ring(0.035, 0.004, [dx, dy + 0.006, dz], chrome).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) { const t = -0.6 + i * 0.6 + random() * 0.2; const key = s.box([0.012, 0.004, 0.075], [dx + Math.sin(t) * 0.07, dy + 0.004 + i * 0.003, dz + Math.cos(t) * 0.07], chrome); key.rotation.y = t; s.cylinder(0.016, 0.016, 0.005, [dx + Math.sin(t) * 0.035, dy + 0.004 + i * 0.003, dz + Math.cos(t) * 0.035], chrome, 10); }
      const fob = s.mesh(new RoundedBoxGeometry(0.07, 0.022, 0.11, 2, 0.01), s.material(['#e23a2e', '#f2c12e', '#2f7fd0'][Math.floor(random() * 3)]), [dx - 0.07, dy + 0.011, dz - 0.05]);
      fob.rotation.y = 0.8;
      s.rod([dx - 0.03, dy + 0.006, dz - 0.01], [dx - 0.05, dy + 0.012, dz - 0.03], 0.003, chrome);
    } else if (a.deposit === 'boot') {
      const rubber = s.material('#d8242c', { roughness: 0.35 });
      s.lathe([[0.001, 0.02], [0.045, 0.02], [0.046, 0.1], [0.05, 0.2], [0.053, 0.21], [0.047, 0.212], [0.044, 0.2]], rubber, [dx, dy, dz - 0.03]);
      const foot = s.mesh(new RoundedBoxGeometry(0.095, 0.07, 0.19, 3, 0.03), rubber, [dx, dy + 0.045, dz + 0.03]);
      foot.rotation.y = 0; s.box([0.095, 0.014, 0.19], [dx, dy + 0.007, dz + 0.03], s.material('#f1ead2'));
    } else if (a.deposit === 'heels') {
      const tint = s.material(['#d81e5b', '#111114', '#c9a227'][Math.floor(random() * 3)], { roughness: 0.3 });
      for (const [ox, tipped] of [[-0.07, false], [0.08, true]] as const) {
        const g = new THREE.Group();
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.01, 0.2), tint); sole.position.set(0, 0.06, 0); sole.rotation.x = 0.42;
        const toe = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.05, 0.09, 2, 0.02), tint); toe.position.set(0, 0.03, 0.09);
        const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.005, 0.1, 8), tint); heel.position.set(0, 0.05, -0.085);
        const cup = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.05, 0.05, 2, 0.02), tint); cup.position.set(0, 0.12, -0.085);
        g.add(sole, toe, heel, cup); g.traverse((n) => { n.castShadow = true; });
        g.position.set(dx + ox, dy, dz); g.rotation.y = tipped ? 1.1 : 0.2;
        if (tipped) { g.rotation.z = Math.PI / 2; g.position.y += 0.035; }
        s.root.add(g);
      }
    } else if (a.deposit === 'licence') {
      const leather = s.material('#4a2f1e', { roughness: 0.8 });
      s.box([0.11, 0.012, 0.09], [dx - 0.06, dy + 0.006, dz], leather); s.box([0.11, 0.012, 0.09], [dx + 0.055, dy + 0.008, dz], leather).rotation.z = 0.08;
      s.box([0.09, 0.004, 0.02], [dx + 0.055, dy + 0.02, dz - 0.02], s.material('#5fae6a'));
      const card = s.label('ID', 0.086, 0.054, [dx + 0.02, dy + 0.003, dz + 0.13], '#1c3f7a', '#dfe8f2');
      card.rotation.set(-Math.PI / 2, 0, -0.35);
    }
    // a pad of lane tickets and a pencil
    { const [x, y, z] = at(0.22, 0.1); s.box([0.1, 0.02, 0.14], [x, y + 0.01, z], s.material('#f6d6dc')).rotation.y = 0.2; s.rod([x + 0.08, y + 0.006, z - 0.05], [x + 0.14, y + 0.006, z + 0.07], 0.005, s.material('#e9b825')); }

    return s.finish({ footprint: pairs >= 0 ? undefined : 1 });
  },
});
