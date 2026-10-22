import * as THREE from 'three';
import { Sculpture, type BuildContext, type Placeable, choice, defineWorld, diorama, mix, noul } from '@conjure/kit';

type V = [number, number, number];

const SKIES = {
  haze: 'White-hot heat haze, bleached and shadowless, cicadas screaming.',
  golden: 'Low golden late-afternoon sun, long shadows down the lane.',
  tornado: 'A bruised green-grey tornado-warning sky with a dark shelf cloud rolling in.',
  dusk: 'Pink dusk, windows and porch lights coming on, televisions flickering.',
  overcast: 'Flat grey overcast, humid and still.',
} as const;
const SKY_COLOUR: Record<keyof typeof SKIES, string> = { haze: '#ebe8da', golden: '#f1dcb4', tornado: '#939d88', dusk: '#dcb7b4', overcast: '#cfd3d1' };

const BANDS = {
  turquoise: 'White aluminium with turquoise bands, 1960s optimism.',
  brown: 'Cream with chocolate-brown bands, pure 1970s.',
  pink: 'Pale pink and white, a sun-faded Florida pastel.',
  mixed: 'A mismatched row: mint, mustard and rust-red, each one different.',
  beige: 'Anonymous beige vinyl siding, newer and plainer.',
} as const;

const SIGNS = {
  'shady-pines': 'SHADY PINES',
  'desert-rose': 'DESERT ROSE',
  lakeview: 'LAKEVIEW ESTATES',
  'happy-acres': 'HAPPY ACRES',
  'lots-for-rent': 'LOTS FOR RENT',
  'no-sign': 'NO SIGN',
} as const;

function stripes(a: string, b: string, count: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  for (let i = 0; i < count; i++) { ctx.fillStyle = i % 2 ? b : a; ctx.fillRect(i * 128 / count, 0, 128 / count + 1, 16); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function chainLink(rust: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = rust > 0.6 ? '#8a6a52' : '#8d9494';
  ctx.lineWidth = 5;
  for (const d of [-64, 0, 64]) {
    ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + 64, 64); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(d + 64, 0); ctx.lineTo(d, 64); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

interface HomeOptions { length: number; body: string; band: string; lit: boolean; boarded: boolean; notice: boolean; tyres: boolean; flowers: boolean; awning: boolean; dish: boolean }

/** A neighbour's mobile home: long axis x, front door facing +z, standing on y = 0. */
function home(context: BuildContext, o: HomeOptions) {
  const s = new Sculpture(context);
  const { mood, random } = context;
  const L = o.length, D = 3.1;
  const body = s.material(o.body, { roughness: 0.55, metalness: 0.15 });
  const band = s.material(o.band, { roughness: 0.6 });
  const skirt = s.material('#aeb2b0', { metalness: 0.4, roughness: 0.5 });
  const white = s.material('#f1eee4');
  const glass = o.lit
    ? new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffc566', emissiveIntensity: 1.1, roughness: 0.4 })
    : new THREE.MeshStandardMaterial({ color: '#3c4a52', roughness: 0.25, metalness: 0.3 });
  const ply = s.material('#b89466', { roughness: 0.95 });

  s.box([L - 0.16, 0.55, D - 0.16], [0, 0.275, 0], skirt);
  // Missing skirting panels show the dark crawl space.
  for (let i = 0; i < Math.round(mood.wear * 3); i++) s.box([0.9, 0.42, 0.04], [mix(-L / 2 + 1, L / 2 - 1, random()), 0.24, D / 2 - 0.07], s.material('#2a2a28'));
  s.box([L, 2.05, D], [0, 1.575, 0], body);
  s.box([L + 0.03, 0.34, D + 0.03], [0, 1.2, 0], band);
  s.box([L + 0.03, 0.09, D + 0.03], [0, 2.38, 0], band);
  s.box([L + 0.22, 0.09, D + 0.22], [0, 2.645, 0], s.material('#d9dad4', { metalness: 0.5, roughness: 0.4 }));
  // Rust weeping from the roof seam.
  for (let i = 0; i < Math.round(mood.wear * 7); i++) {
    const h = 0.3 + random() * 0.9;
    s.box([0.07 + random() * 0.1, h, 0.012], [mix(-L / 2 + 0.3, L / 2 - 0.3, random()), 2.58 - h / 2, D / 2 + 0.008], s.material('#8a5a3a', { roughness: 1 }));
  }
  if (o.tyres) for (let i = 0; i < 3; i++) {
    const tyre = s.ring(0.27, 0.1, [mix(-L / 2 + 1, L / 2 - 1, random()), 2.78, (random() - 0.5) * 1.6], s.material('#2a2a2b', { roughness: 0.95 }));
    tyre.rotation.x = Math.PI / 2;
  }

  const doorX = -L * 0.16;
  const windows = [-L * 0.36, L * 0.1, L * 0.33];
  for (const x of windows) {
    s.box([1.22, 0.92, 0.05], [x, 1.78, D / 2 + 0.01], white);
    if (o.boarded) { s.box([1.3, 1, 0.05], [x, 1.78, D / 2 + 0.05], ply).rotation.z = (random() - 0.5) * 0.08; continue; }
    s.box([1.06, 0.76, 0.05], [x, 1.78, D / 2 + 0.03], glass);
    for (let j = 0; j < 4; j++) s.box([1.06, 0.022, 0.03], [x, 1.5 + j * 0.19, D / 2 + 0.07], white);
  }
  // End window facing the lane, with a box fan or an air conditioner wedged in it.
  s.box([0.05, 0.8, 1.2], [L / 2 + 0.01, 1.8, 0], white);
  s.box([0.05, 0.64, 1.04], [L / 2 + 0.03, 1.8, 0], o.boarded ? ply : glass);
  if (!o.boarded) s.box([0.4, 0.36, 0.55], [L / 2 + 0.2, 1.62, 0.2], s.material('#cfcabc'));
  // Door, steps and porch.
  s.box([0.86, 1.92, 0.05], [doorX, 1.53, D / 2 + 0.02], white);
  s.box([0.26, 0.26, 0.03], [doorX, 2.0, D / 2 + 0.05], o.boarded ? ply : glass).rotation.z = Math.PI / 4;
  if (o.notice) s.box([0.3, 0.4, 0.02], [doorX, 1.45, D / 2 + 0.06], s.material('#ff7a2a', { emissive: '#ff5a10', emissiveIntensity: 0.25 }));
  const wood = s.material('#a58a66', { roughness: 0.9 });
  s.box([1.7, 0.12, 1.1], [doorX, 0.5, D / 2 + 0.57], wood);
  for (const x of [-0.78, 0.78]) for (const z of [0.08, 1.05]) s.box([0.08, 0.5, 0.08], [doorX + x, 0.25, D / 2 + z], wood);
  s.box([0.9, 0.12, 0.3], [doorX, 0.3, D / 2 + 1.26], wood);
  s.box([0.9, 0.12, 0.3], [doorX, 0.12, D / 2 + 1.54], wood);
  for (const x of [-0.8, 0.8]) s.box([0.06, 0.8, 0.06], [doorX + x, 0.95, D / 2 + 1.08], wood);
  s.box([1.7, 0.06, 0.06], [doorX, 1.35, D / 2 + 1.08], wood);
  if (o.awning) {
    const cloth = new THREE.MeshStandardMaterial({ map: stripes(o.band, '#f3efe2', 9), roughness: 0.8, side: THREE.DoubleSide });
    const awning = s.box([2.5, 0.05, 1.5], [doorX, 2.25, D / 2 + 0.7], cloth);
    awning.rotation.x = 0.32 + mood.wear * 0.15;
    awning.rotation.z = (random() - 0.5) * mood.wear * 0.25;
    for (const x of [-1.15, 1.15]) s.rod([doorX + x, 0.55, D / 2 + 1.05], [doorX + x, 2.02, D / 2 + 1.38], 0.02, white);
  }
  // Tow hitch, still on after thirty years.
  const steel = s.material('#55585a', { metalness: 0.6 });
  s.rod([-L / 2, 0.45, 0.7], [-L / 2 - 1, 0.4, 0], 0.045, steel);
  s.rod([-L / 2, 0.45, -0.7], [-L / 2 - 1, 0.4, 0], 0.045, steel);
  s.rod([-L / 2 - 0.95, 0, 0], [-L / 2 - 0.95, 0.5, 0], 0.035, steel);
  // Propane bottles and a meter by the end wall.
  for (const z of [-0.25, 0.25]) {
    s.cylinder(0.17, 0.17, 0.75, [L / 2 + 0.32, 0.4, -1 + z], white, 12);
    s.ball([0.17, 0.12, 0.17], [L / 2 + 0.32, 0.78, -1 + z], white, 12);
  }
  if (o.dish) {
    s.rod([L * 0.3, 2.68, -0.9], [L * 0.3, 3.15, -0.9], 0.025, steel);
    const dish = s.cylinder(0.36, 0.08, 0.1, [L * 0.3, 3.2, -0.82], s.material('#c9ccc9', { metalness: 0.3 }), 16);
    dish.rotation.set(1.0, 0.6, 0);
  } else {
    // A television aerial instead.
    s.rod([L * 0.3, 2.68, -0.9], [L * 0.3, 4.1, -0.9], 0.02, steel);
    for (let i = 0; i < 4; i++) s.rod([L * 0.3 - 0.45 + i * 0.05, 3.5 + i * 0.17, -0.9], [L * 0.3 + 0.45 - i * 0.05, 3.5 + i * 0.17, -0.9], 0.012, steel);
  }
  if (o.flowers) {
    const blooms = Array.from({ length: 46 }, () => {
      const x = mix(-L / 2 + 0.3, L / 2 - 0.3, random());
      return { at: [x, 0.16 + random() * 0.14, D / 2 + 0.22 + random() * 0.25] as V, size: 0.7 + random() * 0.8, color: ['#e8452f', '#f2b01e', '#f277a8', '#ffffff', '#5a9a3c', '#4d8a35'][Math.floor(random() * 6)] };
    }).filter((b) => Math.abs(b.at[0] - doorX) > 1);
    s.scatter(new THREE.IcosahedronGeometry(0.1, 0), s.material('#ffffff', { roughness: 0.8 }), blooms);
  }
  return s.root;
}

export default defineWorld({
  questions: {
    setting: choice('What lies beyond the park?', {
      pines: 'A dark wall of tall southern pines.',
      desert: 'Open desert: sand, creosote scrub, saguaros and a low red mesa.',
      prairie: 'Flat tornado-alley prairie with a water tower and a few cottonwoods.',
      highway: 'The edge of town: a highway berm with a guardrail and a billboard.',
    }),
    sky: choice('What is the sky doing?', SKIES),
    state: choice('What state is the park in?', {
      proud: 'Tended with pride: flower beds along the skirting, swept steps, fresh awnings.',
      'lived-in': 'Ordinary and lived-in: trash cans, a grill, things left out in the yard.',
      'half-empty': 'Half empty: one lot is just a bare concrete pad with a hookup post and a FOR RENT sign.',
      'storm-hit': 'The morning after a storm: a home shoved off its blocks, a leaning pole, boards and sheet metal everywhere.',
      condemned: 'Being cleared out: boarded windows, orange notices on the doors, weeds taking the lane.',
    }),
    homes: choice('What do the mobile homes look like?', BANDS),
    lane: choice('What is the lane surfaced with?', {
      gravel: 'Pale crushed gravel with a grassy crown.',
      asphalt: 'Old grey asphalt, cracked and patched.',
      'red-dirt': 'Rutted red dirt with puddles standing in the low spots.',
      sand: 'Soft pale sand with tyre tracks.',
    }),
    fence: choice('What divides the nearest yard from the lane?', {
      'chain-link': 'A sagging chain-link fence with a gate.',
      picket: 'A low white picket fence.',
      tyres: 'A row of half-buried painted tyres.',
      open: 'Nothing: the yard runs straight into the lane.',
    }),
    overhead: choice('What hangs overhead along the lane?', {
      wires: 'Just sagging power and phone lines.',
      'string-lights': 'Strings of coloured party bulbs looped pole to pole.',
      sneakers: 'Power lines with a pair of sneakers thrown over them.',
      birds: 'Power lines with a row of birds sitting on them.',
    }),
    sign: choice('What does the park sign at the entrance say?', SIGNS),
    whirligigs: noul('Are there pinwheels and whirligigs spinning along the yard edge?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const ground = { pines: '#aaa56f', desert: '#d8bc8e', prairie: '#c8b672', highway: '#b5ae8a' }[a.setting];
    const { art: s, world } = diorama(context, {
      background: SKY_COLOUR[a.sky], floor: ground, width: 18, depth: 20, maxHeight: 3.3, radius: 2.3, pitch: 27, yaw: 30,
      slots: [[3.4, 1.4], [6.6, 6.6, 0, 0.72], [-7.4, 4.2, 0, 0.75], [0.3, 7.6, 0, 0.6]],
    });
    const stormy = a.state === 'storm-hit', condemned = a.state === 'condemned';
    const lit = a.sky === 'dusk' || (a.sky === 'tornado' && mood.daylight > 0.6) || mood.daylight > 0.85;

    // Light follows the sky.
    const key = world.keyLight!;
    const hemi = s.root.children.find((child) => (child as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight | undefined;
    if (a.sky === 'haze') { key.intensity = 3.3; key.color.lerp(new THREE.Color('#ffffff'), 0.6); }
    if (a.sky === 'golden') { key.intensity = 3.1; key.color.lerp(new THREE.Color('#ffc978'), 0.7); }
    if (a.sky === 'tornado') { key.intensity = 1.5; key.color.set('#d8e6c0'); hemi?.color.set('#c9d8b4'); if (hemi) hemi.intensity = 1.15; }
    if (a.sky === 'dusk') { key.intensity = 1.9; key.color.set('#ffb49a'); hemi?.color.set('#e9c9e0'); }
    if (a.sky === 'overcast') { key.intensity = 1.2; if (hemi) hemi.intensity = 1.9; }

    // The lane, running straight down the left of the frame.
    const LX = -4, LW = 3.7;
    const laneColour = { gravel: '#bdb7a8', asphalt: '#77767a', 'red-dirt': '#b46f4a', sand: '#e0d3ab' }[a.lane];
    s.box([LW, 0.06, 20], [LX, 0.03, 0], s.material(laneColour, { roughness: 1 }));
    const speck = (n: number, colours: string[], size: [number, number], spread = LW / 2 - 0.1) => Array.from({ length: n }, () => ({
      at: [LX + (random() - 0.5) * 2 * spread, 0.065, (random() - 0.5) * 19.6] as V, size: mix(size[0], size[1], random()), color: colours[Math.floor(random() * colours.length)],
    }));
    if (a.lane === 'gravel') {
      s.scatter(new THREE.IcosahedronGeometry(0.06, 0), s.material('#ffffff', { roughness: 1 }), speck(260, ['#d8d3c6', '#9d978a', '#c9c0ad', '#84807a'], [0.5, 1.4]));
      s.scatter(new THREE.ConeGeometry(0.05, 0.16, 4), s.material('#ffffff', { roughness: 1 }), speck(70, ['#8c9552', '#a3a25e'], [0.6, 1.5], 0.3));
    } else if (a.lane === 'asphalt') {
      for (let i = 0; i < 9; i++) {
        const crack = s.box([0.05, 0.012, 1 + random() * 2.2], [LX + (random() - 0.5) * 3, 0.062, (random() - 0.5) * 18], s.material('#3b3a3c'));
        crack.rotation.y = (random() - 0.5) * 1.6;
      }
      for (let i = 0; i < 3; i++) s.box([0.9 + random(), 0.012, 0.8 + random()], [LX + (random() - 0.5) * 2, 0.063, (random() - 0.5) * 16], s.material('#55545a', { roughness: 1 }));
    } else if (a.lane === 'red-dirt') {
      for (const x of [-0.8, 0.8]) s.box([0.45, 0.012, 20], [LX + x, 0.058, 0], s.material('#96573a', { roughness: 1 }));
      for (let i = 0; i < 4; i++) {
        const puddle = s.cylinder(0.3 + random() * 0.25, 0.3, 0.012, [LX + (random() < 0.5 ? -0.8 : 0.8) + (random() - 0.5) * 0.3, 0.068, (random() - 0.5) * 17], new THREE.MeshStandardMaterial({ color: '#9c8f86', roughness: 0.08, metalness: 0.5 }), 18);
        puddle.scale.z = 1.6;
      }
    } else {
      for (const x of [-0.8, 0.8]) s.box([0.34, 0.012, 20], [LX + x, 0.058, 0], s.material('#cdbf95', { roughness: 1 }));
    }

    // Scrubby yard: dry tufts everywhere, weeds taller when the place is going under.
    const tuftColours = a.setting === 'desert' ? ['#a59a5a', '#8d8a52', '#b9a66a'] : ['#7f9048', '#9aa052', '#b3a85c', '#6f8a44'];
    const tufts = Array.from({ length: Math.round(mix(120, 320, mood.density)) }, () => {
      let x = (random() - 0.5) * 17.6;
      if (Math.abs(x - LX) < LW / 2 + 0.1) x = LX + (x < LX ? -1 : 1) * (LW / 2 + 0.1 + random() * 0.5);
      return { at: [x, 0.08, (random() - 0.5) * 19.6] as V, size: mix(0.6, condemned ? 3.4 : 1.9, random() * random()), color: tuftColours[Math.floor(random() * tuftColours.length)] };
    });
    s.scatter(new THREE.ConeGeometry(0.09, 0.3, 4), s.material('#ffffff', { roughness: 1 }), tufts);
    // Worn bare patches.
    for (let i = 0; i < 5; i++) {
      const patch = s.cylinder(1, 1, 0.012, [mix(-1, 8, random()), 0.006, mix(-4, 9, random())], s.material(new THREE.Color(ground).offsetHSL(0, -0.05, -0.06), { roughness: 1 }), 14);
      patch.scale.set(0.8 + random() * 1.2, 1, 0.6 + random());
    }

    // The neighbours.
    const palette: Record<keyof typeof BANDS, [string, string][]> = {
      turquoise: [['#eef0ea', '#2fa7a4'], ['#eef0ea', '#3f8fb0']],
      brown: [['#efe6cc', '#6b4630'], ['#e9dcb8', '#8a5a34']],
      pink: [['#f6ece8', '#f0a3b0'], ['#f3f0e6', '#f4b8a8']],
      mixed: [['#cfe6d2', '#c8a02a'], ['#efe6cc', '#a8402c']],
      beige: [['#d9cdb4', '#b3a58a'], ['#d2c7b0', '#9a9482']],
    };
    const [first, second] = palette[a.homes];
    const base = { lit, boarded: condemned, notice: condemned, tyres: mood.wear > 0.45, flowers: a.state === 'proud', awning: true, dish: random() < 0.5 };
    const homeA = home(context, { ...base, length: 9.6, body: first[0], band: first[1] });
    homeA.position.set(3.6, 0, -7.1);
    s.root.add(homeA);
    s.box([10.4, 0.1, 3.7], [3.4, 0.03, -7.1], s.material('#b9b6ab', { roughness: 1 }));

    if (a.state === 'half-empty') {
      // A vacated lot: pad, hookup post, sign.
      s.box([3.6, 0.12, 9.2], [-7.1, 0.06, -4.6], s.material('#bcb9ad', { roughness: 1 }));
      for (const z of [-7.5, -4.6, -1.7]) for (const x of [-1, 1]) s.box([0.4, 0.2, 0.2], [-7.1 + x, 0.2, z], s.material('#9a9a94', { roughness: 1 }));
      s.box([0.14, 1.1, 0.14], [-6.0, 0.55, -0.4], s.material('#7a7d7c', { metalness: 0.4 }));
      s.box([0.3, 0.36, 0.2], [-6.0, 1.0, -0.4], s.material('#9aa0a0', { metalness: 0.5 }));
      s.rod([-6.3, 0, 0.6], [-6.3, 1.3, 0.6], 0.03, s.material('#e9e4d6'));
      const sign = s.label('LOT FOR RENT', 1.3, 0.5, [-6.3, 1.25, 0.64], '#ffffff', '#c8242a');
      sign.rotation.y = 0.6;
    } else {
      const homeB = home(context, { ...base, length: 8.6, body: second[0], band: second[1], dish: !base.dish, awning: !stormy });
      homeB.rotation.y = Math.PI / 2;
      homeB.position.set(-7.25, 0, -4.9);
      if (stormy) { homeB.rotation.y += 0.22; homeB.rotation.z = 0.09; homeB.position.y = 0.12; homeB.position.x += 0.3; }
      s.root.add(homeB);
      s.box([3.6, 0.1, 9.4], [-7.25, 0.03, -4.9], s.material('#b9b6ab', { roughness: 1 }));
    }

    // Poles and wires down the yard side of the lane.
    const PX = -1.85;
    const wood = s.material('#6f5a44', { roughness: 0.95 });
    const wire = s.material('#2b2b2e', { roughness: 0.8 });
    const poles: { z: number; lean: number }[] = [{ z: -9.3, lean: 0.03 }, { z: 0.2, lean: stormy ? 0.3 : -0.04 - mood.wear * 0.06 }, { z: 9.5, lean: 0.02 }];
    const top = (p: { z: number; lean: number }, h: number, side: number): V => [PX + Math.sin(p.lean) * h + side * 0.55, Math.cos(p.lean) * h, p.z];
    for (const p of poles) {
      s.rod([PX, 0, p.z], [PX + Math.sin(p.lean) * 6.3, Math.cos(p.lean) * 6.3, p.z], 0.11, wood, 0.08);
      s.rod(top(p, 5.7, -1.3), top(p, 5.7, 1.3), 0.045, wood);
      for (const side of [-1, 0, 1]) s.cylinder(0.04, 0.05, 0.12, [top(p, 5.82, side)[0], top(p, 5.82, side)[1], p.z], s.material('#9fb7b0'), 8);
      s.cylinder(0.16, 0.16, 0.5, [top(p, 5.0, 0.42)[0], top(p, 5.0, 0)[1], p.z], s.material('#8a8f90', { metalness: 0.4 }), 12);
    }
    const sagging = mix(0.35, 0.8, mood.wear);
    const span = (from: V, to: V, sag: number, radius = 0.018, material: THREE.Material = wire) => {
      const points: V[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        points.push([mix(from[0], to[0], t), mix(from[1], to[1], t) - Math.sin(t * Math.PI) * sag, mix(from[2], to[2], t)]);
      }
      s.tube(points, radius, material);
      return points;
    };
    const perches: V[] = [];
    for (let i = 0; i < poles.length - 1; i++) {
      for (const side of [-1, 0, 1]) perches.push(...span(top(poles[i], 5.86, side), top(poles[i + 1], 5.86, side), sagging * (0.8 + random() * 0.4)).slice(2, 7));
      span(top(poles[i], 4.6, 0), top(poles[i + 1], 4.6, 0), sagging * 1.3, 0.03);
    }
    // Service drops to the homes.
    span(top(poles[0], 5.3, 0), [1.2, 2.75, -6.2], 0.5);
    if (a.state !== 'half-empty' && !stormy) span(top(poles[1], 5.3, 0), [-5.75, 2.75, -1.4], 0.45);
    if (a.overhead === 'string-lights') {
      const bulbs: { at: V; size: number; color: string }[] = [];
      const colours = ['#ff4a3a', '#ffd23a', '#3ad27a', '#3a9aff', '#ff7ad0'];
      for (let i = 0; i < poles.length - 1; i++) for (const p of span(top(poles[i], 3.4, 0), top(poles[i + 1], 3.4, 0), 0.7, 0.012))
        bulbs.push({ at: [p[0], p[1] - 0.09, p[2]], size: 1, color: colours[bulbs.length % colours.length] });
      for (const p of span(top(poles[1], 3.4, 0), [1.6, 2.7, -5.5], 0.5, 0.012)) bulbs.push({ at: [p[0], p[1] - 0.09, p[2]], size: 1, color: colours[bulbs.length % colours.length] });
      s.scatter(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: lit ? 0.9 : 0.25, roughness: 0.4 }), bulbs);
    } else if (a.overhead === 'sneakers') {
      const p = perches[3];
      for (const dx of [-0.08, 0.1]) {
        s.rod([p[0], p[1], p[2]], [p[0] + dx, p[1] - 0.5 - dx, p[2]], 0.01, s.material('#f1eee4'));
        s.box([0.12, 0.13, 0.3], [p[0] + dx, p[1] - 0.58 - dx, p[2] + 0.06], s.material('#e9e4d8'));
        s.box([0.13, 0.04, 0.32], [p[0] + dx, p[1] - 0.65 - dx, p[2] + 0.06], s.material('#c8242a'));
      }
    } else if (a.overhead === 'birds') {
      const birds = perches.filter(() => random() < 0.55).map((p) => ({ at: [p[0], p[1] + 0.1, p[2] + (random() - 0.5) * 0.5] as V, size: 0.8 + random() * 0.4 }));
      const flock = s.scatter(new THREE.SphereGeometry(0.1, 8, 6), s.material('#26262a'), birds);
      flock.scale.set(1, 1, 1);
    }

    // Yard edge along the lane.
    const FX = -1.55, gate: [number, number] = [3.4, 5.2];
    const spinners: THREE.Object3D[] = [];
    if (a.fence === 'chain-link') {
      const steel = s.material('#9aa1a1', { metalness: 0.6, roughness: 0.45 });
      const texture = chainLink(mood.wear);
      const run = (z0: number, z1: number) => {
        const length = z1 - z0;
        const map = texture.clone();
        map.repeat.set(length * 3.2, 3.6);
        map.needsUpdate = true;
        const mesh = s.mesh(new THREE.PlaneGeometry(length, 1.15), new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.6 }), [FX, 0.62, (z0 + z1) / 2]);
        mesh.rotation.y = Math.PI / 2;
        mesh.castShadow = false;
        s.rod([FX, 1.2, z0], [FX, 1.2 - mood.wear * 0.08, z1], 0.025, steel);
        for (let z = z0; z <= z1 + 0.01; z += length / Math.max(1, Math.round(length / 2.2))) {
          const lean = (random() - 0.5) * mood.wear * 0.3;
          s.rod([FX, 0, z], [FX + lean, 1.25, z], 0.035, steel);
        }
      };
      run(-4.4, gate[0]);
      run(gate[1], 9.8);
      // The gate, left standing open.
      const leaf = new Sculpture(context);
      const map = texture.clone(); map.repeat.set(5, 3.6); map.needsUpdate = true;
      leaf.mesh(new THREE.PlaneGeometry(1.7, 1.1), new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }), [0.85, 0.62, 0]).castShadow = false;
      for (const [f, t] of [[[0, 0.07, 0], [0, 1.18, 0]], [[1.7, 0.07, 0], [1.7, 1.18, 0]], [[0, 1.18, 0], [1.7, 1.18, 0]], [[0, 0.07, 0], [1.7, 0.07, 0]]] as [V, V][]) leaf.rod(f, t, 0.025, steel);
      leaf.root.position.set(FX, 0, gate[0]);
      leaf.root.rotation.y = -Math.PI / 2 + 0.9 + random() * 0.5;
      s.root.add(leaf.root);
    } else if (a.fence === 'picket') {
      const white = s.material('#f3f0e6');
      const pickets: { at: V; size: number }[] = [];
      for (let z = -4.4; z <= 9.8; z += 0.19) if (z < gate[0] || z > gate[1]) {
        if (random() < mood.wear * 0.35) continue;
        pickets.push({ at: [FX, 0.4, z], size: 1 });
      }
      s.scatter(new THREE.BoxGeometry(0.03, 0.8, 0.1), white, pickets);
      for (const [z0, z1] of [[-4.4, gate[0]], [gate[1], 9.8]]) for (const y of [0.25, 0.6]) s.box([0.035, 0.07, z1 - z0], [FX - 0.03, y, (z0 + z1) / 2], white);
    } else if (a.fence === 'tyres') {
      const colours = ['#f0ede2', '#2fb5b0', '#f2c230', '#f77fae', '#e8452f'];
      for (let z = -4; z <= 9.6; z += 0.92) if (z < gate[0] - 0.3 || z > gate[1] + 0.3) {
        const tyre = s.ring(0.3, 0.11, [FX, 0.05, z], s.material(mood.wear > 0.7 ? '#2b2b2c' : colours[Math.floor(random() * colours.length)], { roughness: 0.7 }), Math.PI);
        tyre.rotation.y = Math.PI / 2;
      }
    }
    if (a.whirligigs) {
      const colours = ['#e8452f', '#f2c230', '#2fa7d8', '#f277a8', '#58b04a'];
      for (let i = 0; i < 6; i++) {
        const z = -3.2 + i * 2.3 + (random() - 0.5) * 0.6;
        if (z > gate[0] - 0.3 && z < gate[1] + 0.3) continue;
        const x = FX + 0.45 + random() * 0.2, h = 0.75 + random() * 0.4;
        s.rod([x, 0, z], [x, h, z], 0.012, s.material('#d9d9d4'));
        const wheel = new THREE.Group();
        for (let b = 0; b < 6; b++) {
          const blade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 3), s.material(colours[(i + b) % colours.length], { side: THREE.DoubleSide }));
          blade.position.set(Math.cos(b / 6 * 6.283) * 0.14, Math.sin(b / 6 * 6.283) * 0.14, 0);
          blade.rotation.z = b / 6 * 6.283 - Math.PI / 2;
          blade.scale.z = 0.25;
          blade.castShadow = true;
          wheel.add(blade);
        }
        wheel.position.set(x - 0.04, h, z);
        wheel.rotation.y = -Math.PI / 2 + 0.5;
        s.root.add(wheel);
        spinners.push(wheel);
      }
    }

    // Things that accumulate in a yard.
    const can = (x: number, z: number, fallen: boolean) => {
      const bin = s.cylinder(0.3, 0.25, 0.8, [x, fallen ? 0.3 : 0.4, z], s.material('#5c6a62', { metalness: 0.3 }), 12);
      if (fallen) bin.rotation.set(Math.PI / 2, 0, random() * 3);
      else s.cylinder(0.32, 0.32, 0.06, [x, 0.83, z], s.material('#4a554f'), 12);
    };
    if (a.state !== 'proud') { can(8.2, -4.6, stormy); can(7.5, -4.7, false); }
    if (a.state === 'lived-in' || a.state === 'proud') {
      // Kettle grill.
      for (let i = 0; i < 3; i++) s.rod([7.6 + Math.cos(i * 2.1) * 0.28, 0, -2.6 + Math.sin(i * 2.1) * 0.28], [7.6 + Math.cos(i * 2.1) * 0.12, 0.6, -2.6 + Math.sin(i * 2.1) * 0.12], 0.015, s.material('#c9ccc9', { metalness: 0.6 }));
      s.ball([0.34, 0.3, 0.34], [7.6, 0.78, -2.6], s.material(a.state === 'proud' ? '#b0322a' : '#232325', { roughness: 0.35 }), 16);
      // Doghouse.
      s.box([0.9, 0.6, 1], [8.1, 0.3, 9.1], s.material('#b0483a'));
      const roof = s.cylinder(0.75, 0.75, 1.15, [8.1, 0.72, 9.1], s.material('#4a3d35'), 3);
      roof.rotation.set(Math.PI / 2, 0, 0); roof.scale.set(1, 1, 0.5); roof.rotation.z = 0;
      s.box([0.36, 0.4, 0.02], [8.1, 0.22, 9.61], s.material('#1f1c1a'));
    }
    if (a.state === 'proud') {
      // A flag by the porch and whitewashed stones up the path.
      s.rod([7.9, 0, -4.9], [7.9, 3.6, -4.9], 0.03, s.material('#e9e9e4', { metalness: 0.4 }));
      s.mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshStandardMaterial({ map: stripes('#c8242a', '#f3efe2', 2), side: THREE.DoubleSide, roughness: 0.8 }), [8.5, 3.2, -4.9]);
      s.scatter(new THREE.IcosahedronGeometry(0.13, 0), s.material('#f3f0e8', { roughness: 0.9 }), Array.from({ length: 16 }, (_u, i) => ({ at: [(i % 2 ? 0.9 : 2.3) + (random() - 0.5) * 0.1, 0.06, -4.1 + Math.floor(i / 2) * 0.45] as V, size: 0.8 + random() * 0.4 })));
    }
    if (stormy) {
      const sheet = s.material('#c9ccc8', { metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide });
      const plank = s.material('#b89466', { roughness: 0.95 });
      for (let i = 0; i < 14; i++) {
        const metal = i % 3 === 0;
        const piece = s.box(metal ? [1.2 + random(), 0.03, 0.7 + random() * 0.5] : [1 + random() * 1.6, 0.05, 0.14], [mix(-8, 8.5, random()), 0.08 + random() * 0.1, mix(-4, 9.5, random())], metal ? sheet : plank);
        piece.rotation.set((random() - 0.5) * 0.5, random() * 3.1, (random() - 0.5) * (metal ? 0.9 : 0.3));
      }
      // A limb down across the lane.
      s.rod([-5.6, 0.15, 6.2], [-2.6, 0.5, 7.4], 0.12, wood, 0.05);
      s.scatter(new THREE.IcosahedronGeometry(0.3, 0), s.material('#5f7a3f', { roughness: 1 }), Array.from({ length: 9 }, () => ({ at: [mix(-4.4, -2.4, random()), 0.3 + random() * 0.4, mix(6.6, 7.8, random())] as V, size: 0.7 + random() * 0.8 })));
    }
    if (condemned) {
      s.rod([-1.3, 0, 8.8], [-1.3, 1.5, 8.8], 0.03, s.material('#e9e4d6'));
      s.label('NOTICE TO VACATE', 1.4, 0.55, [-1.3, 1.45, 8.84], '#1c1a1a', '#ff8a2a').rotation.y = 0.4;
    }

    // The park sign at the lane mouth.
    if (a.sign !== 'no-sign') {
      const board = new Sculpture(context);
      const post = board.material('#e9e4d6');
      for (const x of [-1.05, 1.05]) board.box([0.12, 2.3, 0.12], [x, 1.15, 0], post);
      board.box([2.5, 0.95, 0.08], [0, 1.85, 0], board.material('#f1ead2'));
      board.label(SIGNS[a.sign], 2.36, 0.6, [0, 1.92, 0.05], a.sign === 'lots-for-rent' ? '#c8242a' : '#2c5a4a', '#f1ead2');
      board.label('MOBILE HOME PARK', 1.9, 0.2, [0, 1.52, 0.05], '#5a5348', '#f1ead2');
      if (condemned || a.state === 'half-empty') board.label(condemned ? 'CLOSED' : 'VACANCY', 1.2, 0.34, [0.3, 1.02, 0.06], '#ffffff', '#c8242a').rotation.z = -0.08;
      board.root.position.set(-7.35, 0, 8.9);
      board.root.rotation.set(0, 0.55, (random() - 0.5) * mood.wear * 0.2);
      s.root.add(board.root);
    }

    // Beyond the park.
    if (a.setting === 'pines') {
      const trunks: { at: V; size: number }[] = [], needles: { at: V; size: number; color: string }[] = [];
      const tree = (x: number, z: number) => {
        const h = 4.2 + random() * 2.2;
        trunks.push({ at: [x, h * 0.4, z], size: h * 0.8 });
        for (let k = 0; k < 4; k++) needles.push({ at: [x, h * (0.5 + k * 0.15), z], size: (1.25 - k * 0.26) * (0.8 + random() * 0.3), color: ['#3f5a3c', '#4a6a42', '#36503a'][Math.floor(random() * 3)] });
      };
      for (let x = -8.6; x <= 8.7; x += 1.25) tree(x + (random() - 0.5) * 0.5, -9.5 + (random() - 0.5) * 0.5);
      for (let z = -8; z <= 2; z += 1.6) tree(-8.7 + (random() - 0.5) * 0.3, z + (random() - 0.5) * 0.5);
      s.scatter(new THREE.CylinderGeometry(0.035, 0.05, 1, 6), s.material('#6a4f3a', { roughness: 1 }), trunks);
      s.scatter(new THREE.ConeGeometry(1, 1.5, 7), s.material('#ffffff', { roughness: 1 }), needles);
    } else if (a.setting === 'desert') {
      const mesa = s.material('#c98a66', { roughness: 1 });
      s.box([9, 2.2, 0.8], [-3.5, 1.1, -9.55], mesa);
      s.box([5, 3, 0.7], [-4.5, 1.5, -9.6], mesa);
      s.box([6, 1.4, 0.7], [5.5, 0.7, -9.6], mesa);
      const cactus = s.material('#6f8f5a', { roughness: 0.9 });
      for (const [x, z, h] of [[8.3, -2.5, 3.2], [-8.6, 6.6, 2.4], [8.5, 2.6, 2.6]] as V[]) {
        s.cylinder(0.2, 0.22, h, [x, h / 2, z], cactus, 10);
        s.ball([0.2, 0.2, 0.2], [x, h, z], cactus, 10);
        for (const side of [-1, 1]) {
          const y = h * (0.4 + random() * 0.2);
          s.tube([[x, y, z], [x + side * 0.5, y, z], [x + side * 0.55, y + 0.3, z], [x + side * 0.55, y + 0.9, z]], 0.13, cactus);
        }
      }
      s.scatter(new THREE.IcosahedronGeometry(0.4, 0), s.material('#ffffff', { roughness: 1 }), Array.from({ length: 22 }, () => ({ at: [(random() < 0.5 ? mix(5.5, 8.7, random()) : mix(-8.8, 8.8, random())), 0.2, random() < 0.5 ? mix(-9.6, 9.6, random()) : mix(-9.6, -8.9, random())] as V, size: 0.6 + random() * 0.9, color: ['#8f9a5a', '#a39a62', '#7d8a55'][Math.floor(random() * 3)] })).filter((p) => p.at[0] > 5.4 || p.at[2] < -8.8));
    } else if (a.setting === 'prairie') {
      const steel = s.material('#c9d2d2', { metalness: 0.4, roughness: 0.5 });
      const tx = -6.2, tz = -9.4;
      for (const dx of [-0.8, 0.8]) for (const dz of [-0.25, 0.25]) s.rod([tx + dx * 1.2, 0, tz + dz], [tx + dx * 0.7, 4.6, tz + dz], 0.06, steel);
      s.lathe([[0, 4.5], [0.9, 4.6], [1.25, 5], [1.25, 6], [0.8, 6.5], [0, 6.65]], steel, [tx, 0, tz]);
      s.cylinder(0.12, 0.12, 4.6, [tx, 2.3, tz], steel, 8);
      s.label('HOME OF THE', 1.6, 0.3, [tx, 5.75, tz + 1.27], '#3a5a8a', '#c9d2d2');
      const leaves: { at: V; size: number; color: string }[] = [];
      for (const x of [1.5, 6.4, 8.2]) {
        const h = 3 + random() * 1.4;
        s.rod([x, 0, -9.5], [x + (random() - 0.5) * 0.5, h, -9.5], 0.16, wood, 0.08);
        for (let k = 0; k < 6; k++) leaves.push({ at: [x + (random() - 0.5) * 1.6, h + (random() - 0.3) * 1.3, -9.5 + (random() - 0.5) * 0.5], size: 0.7 + random() * 0.6, color: ['#7d9a4a', '#8fa352', '#6a8a44'][Math.floor(random() * 3)] });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { roughness: 1 }), leaves);
      s.scatter(new THREE.ConeGeometry(0.12, 1, 4), s.material('#ffffff', { roughness: 1 }), Array.from({ length: 150 }, () => ({ at: [mix(-8.9, 8.9, random()), 0.4, mix(-9.9, -9.2, random())] as V, size: 0.6 + random() * 0.7, color: ['#c9b45a', '#b9a652', '#d6c06a'][Math.floor(random() * 3)] })));
    } else {
      s.box([18, 1.3, 1.1], [0, 0.65, -9.45], s.material('#9a9a78', { roughness: 1 }));
      const rail = s.material('#c9ccc9', { metalness: 0.6, roughness: 0.4 });
      s.box([18, 0.26, 0.06], [0, 1.85, -9.1], rail);
      for (let x = -8.5; x <= 8.5; x += 1.7) s.box([0.1, 0.7, 0.1], [x, 1.6, -9.15], rail);
      for (const x of [3.2, 7.4]) s.box([0.22, 5.4, 0.22], [x, 2.7, -9.5], s.material('#6a6d6c', { metalness: 0.4 }));
      s.box([5.4, 2.4, 0.2], [5.3, 5, -9.4], s.material('#f1ead2'));
      const text = mood.cheer > 0.66 ? 'LOTTO $40 MILLION' : mood.cheer > 0.33 ? 'INJURED? CALL NOW' : 'WE BUY HOUSES CASH';
      s.label(text, 5.1, 1.2, [5.3, 5.2, -9.29], '#ffffff', mood.cheer > 0.66 ? '#1f8a4a' : mood.cheer > 0.33 ? '#c8242a' : '#1c2a6b');
      s.box([0.2, 6.2, 0.2], [-6.4, 3.1, -9.5], s.material('#e9e9e4'));
      s.box([1.6, 1.3, 0.24], [-6.4, 5.7, -9.5], s.material('#d8322a', { emissive: '#d8322a', emissiveIntensity: lit ? 0.7 : 0.1 }));
      s.label('GAS', 1.4, 0.7, [-6.4, 5.75, -9.37], '#ffffff', '#d8322a');
    }

    // Weather that does not count toward the frame: cloud bank or heat shimmer.
    const clouds: THREE.Mesh[] = [];
    if (a.sky === 'tornado' || a.sky === 'overcast' || a.sky === 'dusk') {
      const tone = { tornado: '#4d5a50', overcast: '#aeb3b3', dusk: '#cfa2a8' }[a.sky];
      const cloud = new THREE.MeshStandardMaterial({ color: tone, roughness: 1, transparent: true, opacity: a.sky === 'tornado' ? 0.92 : 0.55, depthWrite: false });
      const n = a.sky === 'tornado' ? 9 : 5;
      for (let i = 0; i < n; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), cloud);
        puff.position.set(mix(-13, 4, i / (n - 1)) + random(), 7.2 + random() * 1.2 - (a.sky === 'tornado' ? 0.6 : 0), -11 - random() * 2);
        puff.scale.set(2.6 + random() * 1.6, 0.9 + random() * 0.6, 1.6);
        s.root.add(puff);
        clouds.push(puff);
      }
    }

    const cap = 2.3;
    const placeAll = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      placeAll(items);
      // A lawn chair may loom a little in a diorama, but not over the roofline.
      for (const item of items) if (item.holder.scale.x > cap) item.holder.scale.setScalar(cap);
    };
    const speed = mix(0.4, 9, mood.energy) * (a.sky === 'tornado' ? 1.6 : 1);
    const starts = clouds.map((c) => c.position.x);
    world.update = (dt, time) => {
      for (const wheel of spinners) wheel.rotateZ(dt * speed);
      clouds.forEach((c, i) => { c.position.x = starts[i] + Math.sin(time * 0.05 * (1 + mood.energy) + i) * 0.8; });
    };
    return world;
  },
});
