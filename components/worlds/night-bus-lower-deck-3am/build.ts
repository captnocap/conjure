import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, figure, mix, score } from '@conjure/kit';
import { type Moquette, SKINS, busSeat, pick, seatPalette } from './bus';

type City = 'british' | 'tropical' | 'snowy';

/** The city outside, smeared across the fogged glass: one long canvas that scrolls past the windows. */
function cityCanvas(random: () => number, city: City, night: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const base = { british: '#2b3040', tropical: '#17302e', snowy: '#28324a' }[city];
  const dawn = { british: '#5a6474', tropical: '#3a5a58', snowy: '#6a7a92' }[city];
  const sky = ctx.createLinearGradient(0, 0, 0, 128);
  sky.addColorStop(0, night > 0.5 ? base : dawn);
  sky.addColorStop(1, base);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 128);
  const smear = (x: number, y: number, w: number, h: number, colour: string, alpha: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h));
    g.addColorStop(0, colour);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(w / Math.max(w, h), h / Math.max(w, h));
    ctx.translate(-x, -y);
    ctx.fillStyle = g;
    ctx.fillRect(x - Math.max(w, h), y - Math.max(w, h), Math.max(w, h) * 2, Math.max(w, h) * 2);
    ctx.restore();
  };
  if (city === 'british') {
    // Sodium lamps along the top, shopfront whites and the odd neon sign below, rain-streaked.
    for (let i = 0; i < 14; i++) smear(random() * 1024, 18 + random() * 14, 70 + random() * 60, 18, '#ffb04a', 0.8);
    for (let i = 0; i < 10; i++) smear(random() * 1024, 60 + random() * 40, 50 + random() * 70, 26, pick(random, ['#fff2d0', '#ffe6b0', '#e8f4ff']), 0.55);
    for (let i = 0; i < 4; i++) smear(random() * 1024, 50 + random() * 40, 30 + random() * 30, 14, pick(random, ['#ff4a8a', '#4affd0', '#ff3a3a']), 0.7);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 400; i++) ctx.fillRect(random() * 1024, random() * 128, 1, 3 + random() * 8);
    ctx.globalAlpha = 1;
  } else if (city === 'tropical') {
    // Stall bulbs in strings, neon pinks and greens, a wall of warm light low down.
    for (let i = 0; i < 20; i++) smear(random() * 1024, 70 + random() * 50, 60 + random() * 60, 30, pick(random, ['#ffc060', '#ffe0a0', '#ff8a40']), 0.75);
    for (let i = 0; i < 9; i++) smear(random() * 1024, 30 + random() * 50, 40 + random() * 40, 20, pick(random, ['#ff3aa0', '#40ff9a', '#ffe030', '#40c0ff']), 0.85);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = pick(random, ['#fff0b0', '#ffd080']);
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(random() * 1024, 40 + Math.sin(random() * 6) * 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    // Sparse blue-white lamps, a pale snowy verge low down, snow in the air.
    for (let i = 0; i < 7; i++) smear(random() * 1024, 14 + random() * 10, 60 + random() * 40, 16, '#dfe8ff', 0.8);
    for (let i = 0; i < 3; i++) smear(random() * 1024, 60, 40, 14, pick(random, ['#ff5a3a', '#ffb060']), 0.6);
    const verge = ctx.createLinearGradient(0, 90, 0, 128);
    verge.addColorStop(0, 'rgba(230,236,245,0)');
    verge.addColorStop(1, 'rgba(230,236,245,0.85)');
    ctx.fillStyle = verge;
    ctx.fillRect(0, 90, 1024, 38);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 260; i++) ctx.fillRect(random() * 1024, random() * 128, 2, 2);
  }
  // The fog on the inside of the glass: a soft wash that the streaks show through.
  ctx.fillStyle = `rgba(190,200,215,${0.18 + (1 - night) * 0.15})`;
  ctx.fillRect(0, 0, 1024, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function linoCanvas(random: () => number, wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3f4248';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = i % 3 ? 'rgba(255,255,255,0.08)' : `rgba(0,0,0,${0.15 + wear * 0.25})`;
    ctx.fillRect(random() * 128, random() * 128, 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 16);
  return texture;
}

const LIVERIES = {
  red: 'London red: red door edges and trim, navy and red moquette.',
  cream: 'Blue and cream: cream panels, blue moquette.',
  green: 'Green and grey: green doors, teal moquette.',
  yellow: 'Yellow and brown: a 1970s corporation bus, brown stripe moquette.',
} as const;
const LIVERY: Record<keyof typeof LIVERIES, { trim: string; panel: string; moquette: Moquette }> = {
  red: { trim: '#c8102e', panel: '#2c3140', moquette: 'barman' },
  cream: { trim: '#2a4fb8', panel: '#e6dcc2', moquette: 'blue' },
  green: { trim: '#1f6a3a', panel: '#4a5050', moquette: 'teal' },
  yellow: { trim: '#e8b020', panel: '#5a4a3a', moquette: 'brown' },
};

interface Slot { x: number; z: number; turn: number; h: number; r: number }
const SLOTS: Slot[] = [
  { x: 0.56, z: -1.0, turn: Math.PI - 0.16, h: 1.9, r: 0.95 }, // the cleared pram bay, right, three metres up the aisle
  { x: 0.66, z: 0.68, turn: Math.PI + 0.08, h: 1.85, r: 0.8 }, // right bay beyond the pram bay
  { x: -0.72, z: -0.75, turn: 0.18, h: 1.85, r: 0.8 }, // left bay, facing forward
  { x: 0.02, z: 2.5, turn: Math.PI - 0.2, h: 1.85, r: 0.42 }, // standing in the aisle, far up
  { x: -0.72, z: 2.35, turn: 0.1, h: 1.85, r: 0.8 }, // left bay, forward
];

export default defineWorld({
  questions: {
    city: choice('What city slides past the windows?', {
      british: 'A rainy British high street: sodium orange lamps, shuttered shopfronts, a kebab sign, rain streaking the glass.',
      tropical: 'A tropical night market: strings of bulbs, neon pink and green, stalls still trading.',
      snowy: 'A snowy ring road: sparse blue-white lamps, white verges, snow in the headlights.',
    }),
    full: score('How full is the bus?', ['Empty but for the cast', 'A few scattered passengers', 'Most seats taken', 'Packed, someone standing']),
    livery: choice('What livery is the bus?', LIVERIES),
    motion: choice('Is it moving?', {
      pulling: 'Pulling away: the lights outside sliding past, the strip light shivering.',
      stopped: 'Stopped at a red light: everything still, a red glow through the windscreen.',
    }),
    floor: choice('What is on the floor?', {
      litter: 'A chicken box, a free paper and a can rolling in the aisle.',
      paper: 'Just a free paper, pages splayed.',
      clean: 'Swept clean, the lino still wet in patches.',
    }),
    advert: choice('What does the cove advert above the windows say?', {
      night: 'NIGHT BUS · EVERY 20 MIN',
      injured: 'INJURED? CALL NOW',
      missing: 'MISSING: HAVE YOU SEEN THIS CAT?',
      hotline: 'TALK TO SOMEONE. ANY TIME.',
      cheap: 'FLIGHTS FROM £19',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const s = new Sculpture(context);
    const root = s.root;
    const night = Math.max(mood.daylight, 1 - mood.daylight) * 0.6 + 0.4;
    const livery = LIVERY[a.livery];
    const palette = seatPalette(s, random, livery.moquette);
    const W = 2.42, HEIGHT = 1.98, BACK = -4.6, FRONT = 5.1;
    const LEN = FRONT - BACK, MID = (BACK + FRONT) / 2;
    const panel = s.material(livery.panel, { roughness: 0.75 });
    const trim = s.material(livery.trim, { roughness: 0.5 });
    const steel = palette.steel;
    const yellow = palette.yellow;
    const cream = s.material('#e9e6dc', { roughness: 0.9 });
    const dark = s.material('#24262b', { roughness: 0.7 });

    // ---- lights: a cool fluorescent wash, warmed by the mood, and a key from the strip lights.
    const tubeColour = new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.25, 0.85);
    root.add(new THREE.HemisphereLight(tubeColour, '#3a3a40', 1.15));
    const key = new THREE.DirectionalLight(tubeColour, 1.9);
    key.position.set(0.6, 6, 1.5);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.03;
    key.shadow.bias = -0.0003;
    const shadow = key.shadow.camera;
    shadow.left = -6; shadow.right = 6; shadow.top = 6; shadow.bottom = -6; shadow.near = 0.5; shadow.far = 16;
    shadow.updateProjectionMatrix();
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#ffd9a0', 0.35);
    fill.position.set(-4, 2, -3);
    root.add(fill);

    // ---- floor, ceiling, walls and windows.
    const floor = s.mesh(new THREE.BoxGeometry(W, 0.06, LEN), s.material('#ffffff', { map: linoCanvas(random, mood.wear), roughness: 0.85 }), [0, -0.03, MID]);
    s.box([W, 0.04, LEN], [0, HEIGHT + 0.02, MID], cream);
    for (const side of [-1, 1]) {
      const x = side * W / 2;
      s.box([0.06, 0.95, LEN], [x, 0.475, MID], panel);
      s.box([0.1, 0.04, LEN], [x - side * 0.02, 0.97, MID], steel);
      s.box([0.06, 0.26, LEN], [x, HEIGHT - 0.13, MID], panel);
      // The cove advert strip.
      const text = { night: 'NIGHT BUS  ·  EVERY 20 MIN', injured: 'INJURED?  CALL NOW', missing: 'MISSING: HAVE YOU SEEN THIS CAT?', hotline: 'TALK TO SOMEONE.  ANY TIME.', cheap: 'FLIGHTS FROM £19' }[a.advert];
      const ad = s.label(text, 2.6, 0.2, [x - side * 0.035, HEIGHT - 0.14, MID + side * 1.2], a.advert === 'injured' ? '#ffffff' : '#1a1a1e', a.advert === 'injured' ? '#c8102e' : a.advert === 'cheap' ? '#ffb020' : '#f1ece0');
      ad.rotation.y = -side * Math.PI / 2;
      ad.castShadow = false;
    }
    // The city outside, on long glowing planes beyond the glass, and the fogged glass itself.
    const cityMap = cityCanvas(random, a.city, night);
    cityMap.repeat.set(LEN / 4.5, 1);
    const cityMat = new THREE.MeshStandardMaterial({ map: cityMap, emissive: '#ffffff', emissiveMap: cityMap, emissiveIntensity: mix(0.55, 0.95, night), roughness: 1, side: THREE.DoubleSide });
    const fog = new THREE.MeshStandardMaterial({ color: '#c0c8d4', roughness: 0.2, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    const pillars = [-3.3, -1.9, -0.5, 0.9, 2.3, 3.7];
    for (const side of [-1, 1]) {
      const x = side * W / 2;
      const city = s.mesh(new THREE.PlaneGeometry(LEN, HEIGHT - 0.95 - 0.26), cityMat, [x + side * 0.14, (0.99 + HEIGHT - 0.26) / 2, MID]);
      city.rotation.y = -side * Math.PI / 2;
      city.castShadow = city.receiveShadow = false;
      const pane = s.mesh(new THREE.PlaneGeometry(LEN, HEIGHT - 0.95 - 0.26), fog, [x, (0.99 + HEIGHT - 0.26) / 2, MID]);
      pane.rotation.y = -side * Math.PI / 2;
      pane.castShadow = false;
      for (const z of pillars) s.box([0.07, HEIGHT - 0.95 - 0.26, 0.09], [x, (0.99 + HEIGHT - 0.26) / 2, z], panel);
    }
    // The windscreen glow at the front, and the cab.
    const front = s.mesh(new THREE.PlaneGeometry(W, HEIGHT - 0.7), cityMat, [0, 0.7 + (HEIGHT - 0.7) / 2, FRONT + 0.05]);
    front.castShadow = front.receiveShadow = false;
    s.box([W, 0.7, 0.08], [0, 0.35, FRONT], panel);
    s.box([W, 0.06, 0.08], [0, 0.73, FRONT], steel);
    let redLight: THREE.PointLight | null = null;
    if (a.motion === 'stopped') {
      s.ball([0.3, 0.3, 0.05], [-0.35, 1.7, FRONT + 0.1], new THREE.MeshStandardMaterial({ color: '#ff2a1a', emissive: '#ff2a1a', emissiveIntensity: 3, transparent: true, opacity: 0.9, depthWrite: false }), 12);
      redLight = new THREE.PointLight('#ff3a2a', 12, 7, 2);
      redLight.position.set(-0.3, 1.6, FRONT - 0.4);
      root.add(redLight);
    }
    // The driver's cab: a glazed box at the front right with a green glow from the ticket machine.
    const cabX = 0.28, cabZ = FRONT - 1.0;
    s.box([0.05, 1.0, 1.0], [cabX, 0.5, cabZ + 0.5], panel);
    s.mesh(new THREE.PlaneGeometry(1.0, 0.9), fog, [cabX, 1.45, cabZ + 0.5]).rotation.y = Math.PI / 2;
    s.box([0.05, HEIGHT, 0.05], [cabX, HEIGHT / 2, cabZ], steel);
    s.box([W / 2 - cabX, 1.0, 0.05], [(W / 2 + cabX) / 2, 0.5, cabZ], panel);
    s.box([W / 2 - cabX, 0.05, 0.05], [(W / 2 + cabX) / 2, HEIGHT - 0.03, cabZ], steel);
    s.box([0.9, 0.22, 0.34], [0.75, 0.79, FRONT - 0.25], dark);
    const wheel = s.ring(0.22, 0.022, [0.78, 0.9, FRONT - 0.5], s.material('#4a4e58', { roughness: 0.45 }));
    wheel.rotation.x = 1.0;
    s.box([0.5, 0.12, 0.5], [0.78, 0.44, FRONT - 0.9], s.material('#2a3550', { roughness: 0.85 }));
    s.box([0.5, 0.7, 0.12], [0.78, 0.84, FRONT - 1.15], s.material('#2a3550', { roughness: 0.85 }));
    const ticket = s.box([0.22, 0.12, 0.18], [0.42, 1.06, FRONT - 0.5], s.material('#3a3d44', { roughness: 0.5 }));
    ticket.rotation.set(0.4, -0.5, 0);
    const greenMat = new THREE.MeshStandardMaterial({ color: '#5cff7c', emissive: '#5cff7c', emissiveIntensity: mix(1.2, 2.6, night) });
    s.box([0.16, 0.09, 0.004], [0.36, 1.1, FRONT - 0.42], greenMat).rotation.set(0.4, -0.5, 0);
    s.box([0.9, 0.5, 0.01], [0.75, 1.3, cabZ + 0.95], new THREE.MeshStandardMaterial({ color: '#8affa8', emissive: '#5cff7c', emissiveIntensity: mix(0.5, 1.1, night), transparent: true, opacity: 0.35, depthWrite: false })).castShadow = false;
    const green = new THREE.PointLight('#5cff7c', mix(4, 8, night), 3.6, 2);
    green.position.set(0.45, 1.25, FRONT - 0.5);
    root.add(green);
    s.cylinder(0.065, 0.065, 0.03, [cabX + 0.06, 1.1, cabZ + 0.15], yellow, 18).rotation.z = Math.PI / 2;
    s.cylinder(0.02, 0.02, 0.24, [cabX + 0.06, 0.97, cabZ + 0.15], steel, 10);
    // The front-left wheel arch and its single seat, opposite the cab.
    s.box([0.9, 0.42, 1.0], [-0.75, 0.21, FRONT - 0.5], panel);
    busSeat(s, palette, { x: -0.75, z: FRONT - 0.5, seatTop: 0.78, width: 0.46, aisle: 'right', turn: Math.PI, cantilever: true });

    // ---- the centre doors on the left, the stairwell on the right.
    const doorZ = 0.35, doorLen = 1.25;
    for (let leaf = 0; leaf < 2; leaf++) {
      const z = doorZ + leaf * doorLen / 2 + doorLen / 4;
      s.box([0.05, 1.9, doorLen / 2 - 0.04], [-W / 2 + 0.01, 0.95, z], dark);
      s.mesh(new THREE.PlaneGeometry(doorLen / 2 - 0.1, 1.1), fog, [-W / 2 + 0.05, 1.3, z]).rotation.y = Math.PI / 2;
      s.box([0.06, 1.9, 0.05], [-W / 2 + 0.02, 0.95, z + (leaf ? 1 : -1) * (doorLen / 4 - 0.03)], trim);
    }
    s.box([0.08, 0.04, doorLen + 0.1], [-W / 2 + 0.06, 1.9, doorZ + doorLen / 2], trim);
    s.box([0.3, 0.012, doorLen], [-W / 2 + 0.2, 0.006, doorZ + doorLen / 2], yellow);
    const stairZ = 1.75, stairLen = 1.45, stairX = 0.42;
    s.box([0.05, 1.05, stairLen], [stairX, 0.525, stairZ + stairLen / 2], panel);
    s.box([0.05, 0.05, stairLen + 0.1], [stairX, 1.05, stairZ + stairLen / 2], yellow);
    for (let step = 0; step < 5; step++) {
      const rise = 0.2;
      s.box([W / 2 - stairX - 0.05, rise, stairLen / 5], [(W / 2 + stairX) / 2, rise / 2 + step * rise, stairZ + stairLen / 5 * (step + 0.5)], dark);
      s.box([W / 2 - stairX - 0.05, 0.012, 0.05], [(W / 2 + stairX) / 2, rise + step * rise + 0.006, stairZ + stairLen / 5 * (step + 0.5) - stairLen / 10 + 0.03], yellow);
    }
    s.box([W / 2 - stairX, 0.05, stairLen], [(W / 2 + stairX) / 2, HEIGHT + 0.02, stairZ + stairLen / 2], dark);
    const stairGlow = new THREE.PointLight('#fff0c0', 1.5, 3, 2);
    stairGlow.position.set(0.8, 1.6, stairZ + stairLen - 0.2);
    root.add(stairGlow);

    // ---- strip lights along the ceiling, one of them flickering, and the two yellow ceiling rails.
    const tubes: { mesh: THREE.Mesh; material: THREE.MeshStandardMaterial; base: number; flicker: boolean }[] = [];
    const flickerIndex = Math.floor(random() * 4);
    for (let i = 0; i < 4; i++) {
      const z = BACK + 1.4 + i * 2.2;
      const material = new THREE.MeshStandardMaterial({ color: '#fff8e8', emissive: tubeColour, emissiveIntensity: 1.8, roughness: 0.4 });
      const mesh = s.box([0.12, 0.05, 1.5], [0, HEIGHT - 0.03, z], material);
      mesh.castShadow = false;
      s.box([0.16, 0.03, 1.6], [0, HEIGHT - 0.0, z], cream);
      tubes.push({ mesh, material, base: 1.8, flicker: i === flickerIndex });
    }
    for (const side of [-1, 1]) {
      s.cylinder(0.016, 0.016, LEN - 1.2, [side * 0.36, HEIGHT - 0.14, MID], yellow, 10).rotation.x = Math.PI / 2;
      for (let i = 0; i < 6; i++) s.cylinder(0.012, 0.012, 0.14, [side * 0.36, HEIGHT - 0.07, BACK + 1 + i * 1.6], yellow, 8);
    }
    const poles: [number, number][] = [[-0.42, -2.7], [0.42, -3.35], [-0.42, 0.15], [0.42, 1.55], [-0.42, 3.1], [0.42, 3.55]];
    for (const [x, z] of poles) s.cylinder(0.017, 0.017, HEIGHT - 0.02, [x, HEIGHT / 2, z], yellow, 10);

    // ---- the fixed seats: rows on both sides, leaving the bays where the cast will stand.
    const rows: { x: number; z: number; aisle: 'left' | 'right' }[] = [];
    for (const z of [-2.9, -2.2, -1.5, 3.05, 3.75]) rows.push({ x: -0.76, z, aisle: 'right' });
    for (const z of [-2.9, 0.0, 1.35, stairZ + stairLen + 0.4]) rows.push({ x: 0.76, z, aisle: 'left' });
    const seatTop = 0.45;
    for (const row of rows) busSeat(s, palette, { x: row.x, z: row.z, seatTop, aisle: row.aisle, cantilever: true });
    // Padded backrest board in the pram bay and the folding seat beside it.
    s.box([0.06, 0.5, 1.3], [W / 2 - 0.05, 0.85, SLOTS[0].z], palette.fabric);
    s.box([0.16, 0.02, 1.3], [W / 2 - 0.12, 0.61, SLOTS[0].z], steel);

    // ---- passengers in the fixed seats, as many as the bus is full.
    const people: ReturnType<typeof figure>[] = [];
    const seatsToFill = Math.round(mix(0, 13, a.full) + (a.full > 0.1 ? random() * 1.5 : 0));
    const pool = rows.filter((row) => row.z > -2.6).flatMap((row) => [{ row, side: -1 }, { row, side: 1 }]).sort(() => random() - 0.5).slice(0, seatsToFill);
    for (const { row, side } of pool) {
      const H = mix(1.55, 1.85, random());
      const person = figure(s, {
        height: H, build: pick(random, ['slight', 'average', 'average', 'heavy']), style: 'doll', pose: 'sitting', skin: pick(random, SKINS),
        gaze: pick(random, ['down', 'down', 'ahead', 'left', 'right']), hair: pick(random, ['short', 'long', 'bun', 'cap', 'hood', 'none']),
        hairColor: pick(random, ['#2a1d18', '#3b2a22', '#6b4a2e', '#c89a5a', '#8a8a86']),
        top: pick(random, ['#1c1d21', '#4a4a4e', '#263556', '#5a3a3a', '#2f5a3e', '#8d8f93', '#4f5a32', '#6a2a4a']),
        bottom: pick(random, ['#1f2024', '#3b4f72', '#2a2a30', '#5a5d63']), shoes: pick(random, ['#1c1c1e', '#f1f1ee', '#4a3328']),
        sleeves: 'long', mirror: random() < 0.5,
      });
      person.root.position.set(row.x + side * 0.215, Math.max(0, seatTop + 0.045 * H - person.hipHeight), row.z - 0.06);
      person.root.rotation.y = (random() - 0.5) * 0.2;
      s.root.add(person.root);
      people.push(person);
    }
    if (a.full > 0.8) {
      const H = mix(1.6, 1.85, random());
      const stander = figure(s, {
        height: H, build: 'average', style: 'doll', pose: 'standing', skin: pick(random, SKINS), gaze: 'down', hair: pick(random, ['short', 'hood', 'cap']),
        top: pick(random, ['#1c1d21', '#263556', '#4f5a32']), bottom: '#1f2024', shoes: '#1c1c1e', sleeves: 'long',
      });
      stander.root.position.set(-0.1, 0, -0.6);
      stander.root.rotation.y = Math.PI + 0.4;
      s.root.add(stander.root);
      people.push(stander);
    }

    // ---- the floor: the chicken box, the free paper and the rolling can.
    const can = a.floor === 'litter' ? s.cylinder(0.033, 0.033, 0.12, [0.15, 0.033, -2.55], s.material('#c8102e', { metalness: 0.6, roughness: 0.35 }), 12) : null;
    if (can) can.rotation.set(Math.PI / 2, 0, 0.9);
    if (a.floor !== 'clean') {
      const paper = s.box([0.3, 0.012, 0.4], [-0.22 + random() * 0.2, 0.006, -3.0 + random() * 0.5], s.material('#e8e4d8', { roughness: 0.95 }));
      paper.rotation.y = (random() - 0.5) * 1.2;
      const mast = s.box([0.26, 0.004, 0.08], [paper.position.x, 0.013, paper.position.z - 0.14], s.material('#1a1a1e', { roughness: 0.9 }));
      mast.rotation.y = paper.rotation.y;
      s.box([0.14, 0.012, 0.2], [paper.position.x + 0.2, 0.006, paper.position.z + 0.25], s.material('#e8e4d8', { roughness: 0.95 })).rotation.y = paper.rotation.y + 0.6;
    }
    if (a.floor === 'litter') {
      const boxAt: [number, number] = [0.18 + random() * 0.15, -2.2 + random() * 0.4];
      const red = s.material('#c8202a', { roughness: 0.8 });
      const white = s.material('#f3f1e8', { roughness: 0.95 });
      const base = s.box([0.19, 0.08, 0.15], [boxAt[0], 0.04, boxAt[1]], red);
      base.rotation.y = random();
      s.box([0.17, 0.082, 0.13], [boxAt[0], 0.041, boxAt[1]], white).rotation.y = base.rotation.y;
      const lid = s.box([0.19, 0.08, 0.15], [boxAt[0], 0.1, boxAt[1] - 0.12], red);
      lid.rotation.set(-1.7, base.rotation.y, 0);
      s.scatter(new THREE.BoxGeometry(0.012, 0.012, 0.05), s.material('#e8b84a', { roughness: 0.8 }), Array.from({ length: 7 }, () => ({ at: [boxAt[0] + (random() - 0.5) * 0.3, 0.006, boxAt[1] + (random() - 0.5) * 0.3] as [number, number, number], size: 1 })));
    }
    if (a.floor === 'clean') {
      const wet = new THREE.MeshStandardMaterial({ color: '#8a9aa8', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.35, depthWrite: false });
      for (let i = 0; i < 4; i++) s.cylinder(0.25 + random() * 0.2, 0.25 + random() * 0.2, 0.004, [(random() - 0.5) * 0.5, 0.004, BACK + 1 + random() * 7], wet, 18);
    }
    if (mood.density > 0.6) for (let i = 0; i < 4; i++) s.box([0.06, 0.004, 0.09], [(random() - 0.5) * 0.7, 0.003, BACK + 1 + random() * 7], s.material(pick(random, ['#e8e4d8', '#d93a6a', '#2a6ad4']), { roughness: 0.9 })).rotation.y = random() * Math.PI;

    // ---- the camera: low in the aisle at the back, looking up the bus to the cab.
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 40);
    camera.position.set(-0.2, 1.16, BACK + 0.35);
    camera.lookAt(0.2, 0.86, FRONT - 3.0);
    camera.updateMatrixWorld(true);

    const place = (items: readonly Placeable[]) => {
      items.forEach((item, index) => {
        const slot = SLOTS[index % SLOTS.length];
        const fit = Math.min(slot.h / Math.max(item.height, 0.05), slot.r / Math.max(item.radius, 0.05)) * (item.hero ? 1 : 0.92);
        const scale = Math.min(1.35, Math.max(0.8, fit));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(slot.x, 0, slot.z);
        item.holder.rotation.y = slot.turn + (random() - 0.5) * 0.12;
        item.holder.updateMatrixWorld(true);
      });
      camera.updateMatrixWorld(true);
    };

    const pace = mix(0.3, 1.6, mood.energy);
    const scroll = a.motion === 'pulling' ? mix(0.05, 0.3, mood.energy) : 0;
    const flickerDepth = mix(0.1, 0.55, mood.energy);
    return {
      object: root, camera, background: new THREE.Color().setHSL(0.62, 0.15, mix(0.28, 0.2, night)), capacity: SLOTS.length, ground: floor, keyLight: key, place,
      update(_dt, time) {
        cityMap.offset.x = (time * scroll) % 1;
        for (const [index, tube] of tubes.entries()) {
          if (tube.flicker) {
            const n = Math.sin(time * 23 * pace + index) * Math.sin(time * 5.1 * pace) + Math.sin(time * 1.7 + index) * 0.5;
            tube.material.emissiveIntensity = tube.base * (n > 0.7 ? 1 - flickerDepth : 1);
          } else tube.material.emissiveIntensity = tube.base * (0.98 + 0.02 * Math.sin(time * 50 + index));
        }
        if (redLight) redLight.intensity = 12 * (0.95 + 0.05 * Math.sin(time * 2.2));
        for (const person of people) person.update(_dt, time);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
