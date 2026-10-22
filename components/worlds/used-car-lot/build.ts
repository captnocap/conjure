import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, diorama, mix } from '@conjure/kit';

type P2 = readonly [number, number];
type V3 = [number, number, number];

const DEALERS = {
  bigal: "BIG AL'S",
  honest: "HONEST ED'S",
  ezcredit: 'E-Z CREDIT',
  crown: 'CROWN MOTORS',
  family: 'FAMILY AUTO',
  lastchance: 'LAST CHANCE',
} as const;
const PITCHES = {
  finance: 'WE FINANCE',
  nocredit: 'NO CREDIT? NO PROBLEM',
  down: '$99 DOWN DRIVES TODAY',
  tax: 'TAX REFUND SALE',
  mustgo: 'EVERYTHING MUST GO',
  cash: 'WE BUY CARS - CASH',
} as const;
const SCHEMES = {
  hotrod: { flags: ['#e3342f', '#ffcf1f'], sign: '#c81e1e', ink: '#ffe23a' },
  patriotic: { flags: ['#d22b2b', '#f5f2ea', '#22459c'], sign: '#1f3f96', ink: '#ffffff' },
  rainbow: { flags: ['#e3342f', '#ffcf1f', '#2f9e44', '#1f6fd8', '#ff7a1a', '#b146c2'], sign: '#f2c218', ink: '#1b1b1b' },
  miami: { flags: ['#ff5fa8', '#35c6d6', '#fff07a'], sign: '#12a3a8', ink: '#fff0f6' },
  money: { flags: ['#1f8f4a', '#f5f2ea', '#f2c218'], sign: '#17723b', ink: '#ffe23a' },
} as const;
const GROUND = { asphalt: '#55585d', faded: '#8f8e88', gravel: '#b5a68c', concrete: '#c4c0b4' } as const;

interface Style { length: number; width: number; bottom: number; wheel: number; axles: P2; top: readonly P2[]; cabin: readonly [P2, P2, P2, P2]; bed?: P2 }
// Side profiles: x runs rear (-) to front (+), y is height.
const STYLES: Record<string, Style> = {
  sedan: { length: 4.7, width: 1.78, bottom: 0.24, wheel: 0.31, axles: [-1.4, 1.42],
    top: [[-2.35, 0.62], [-2.3, 0.9], [-1.4, 0.96], [0.9, 0.96], [2.05, 0.84], [2.35, 0.62]], cabin: [[-1.6, 0.94], [-0.95, 1.42], [0.15, 1.42], [1.02, 0.94]] },
  boxy: { length: 4.5, width: 1.72, bottom: 0.25, wheel: 0.3, axles: [-1.3, 1.38],
    top: [[-2.25, 0.6], [-2.25, 0.9], [-1.35, 0.92], [0.85, 0.92], [2.2, 0.86], [2.25, 0.6]], cabin: [[-1.42, 0.92], [-1.1, 1.4], [0.3, 1.4], [0.82, 0.92]] },
  yacht: { length: 5.4, width: 1.96, bottom: 0.25, wheel: 0.34, axles: [-1.65, 1.62],
    top: [[-2.7, 0.58], [-2.7, 0.83], [-1.5, 0.87], [0.3, 0.89], [2.62, 0.85], [2.7, 0.58]], cabin: [[-1.62, 0.87], [-0.85, 1.31], [-0.05, 1.31], [0.5, 0.88]] },
  pickup: { length: 5.2, width: 1.92, bottom: 0.38, wheel: 0.39, axles: [-1.55, 1.62], bed: [-2.5, -0.42],
    top: [[-2.6, 0.72], [-2.6, 1.02], [-0.35, 1.02], [0.95, 1.04], [2.5, 0.98], [2.6, 0.72]], cabin: [[-0.34, 1.03], [-0.24, 1.72], [0.72, 1.72], [1.16, 1.03]] },
  hatch: { length: 3.8, width: 1.6, bottom: 0.22, wheel: 0.28, axles: [-1.15, 1.2],
    top: [[-1.9, 0.56], [-1.86, 0.9], [-1.5, 0.92], [0.62, 0.92], [1.72, 0.8], [1.9, 0.58]], cabin: [[-1.84, 0.92], [-1.3, 1.4], [0.02, 1.4], [0.68, 0.92]] },
  suv: { length: 4.6, width: 1.84, bottom: 0.4, wheel: 0.39, axles: [-1.35, 1.42],
    top: [[-2.3, 0.72], [-2.3, 1.06], [-1.0, 1.07], [0.85, 1.07], [2.2, 1.0], [2.3, 0.72]], cabin: [[-2.26, 1.06], [-2.1, 1.76], [0.25, 1.76], [0.9, 1.06]] },
};
const STOCK: Record<string, { styles: readonly string[]; paints: readonly string[] }> = {
  mixed: { styles: ['sedan', 'boxy', 'hatch', 'suv', 'pickup', 'sedan'], paints: ['#a3140d', '#ecebe4', '#aab0b4', '#1f7f82', '#b99a5b', '#27478f', '#202226', '#6b4630'] },
  trucks: { styles: ['pickup', 'suv', 'pickup', 'suv', 'pickup'], paints: ['#a3140d', '#ecebe4', '#202226', '#27478f', '#b8b0a0', '#2f5a3a'] },
  beaters: { styles: ['boxy', 'yacht', 'hatch', 'sedan', 'boxy', 'pickup'], paints: ['#7d5a3c', '#8d8f6a', '#9a6a5a', '#6f7f86', '#b9a37a', '#55606a'] },
  shiny: { styles: ['sedan', 'suv', 'sedan', 'suv'], paints: ['#f1f0ea', '#b4babd', '#1d1f23', '#a3140d'] },
};

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineWorld({
  questions: {
    dealer: choice('Whose name is on the big sign?', {
      bigal: "BIG AL'S: a loud man with a loud tie.",
      honest: "HONEST ED'S: which nobody quite believes.",
      ezcredit: 'E-Z CREDIT: buy here, pay here, pay forever.',
      crown: 'CROWN MOTORS: a little grander than the stock deserves.',
      family: 'FAMILY AUTO: second generation, handshake deals.',
      lastchance: 'LAST CHANCE: the edge of town, the end of the line.',
    }),
    pitch: choice('What does the letter board under the sign say?', {
      finance: 'WE FINANCE.',
      nocredit: 'NO CREDIT? NO PROBLEM.',
      down: '$99 DOWN DRIVES TODAY.',
      tax: 'TAX REFUND SALE.',
      mustgo: 'EVERYTHING MUST GO.',
      cash: 'WE BUY CARS - CASH.',
    }),
    state: choice('What kind of day is the lot having?', {
      saturday: 'The big Saturday sale: every stall full, balloons on every mirror, cones at the driveway.',
      slow: 'A slow weekday: most stalls full, nobody around, the office door propped open.',
      closing: 'Going out of business: half the stalls empty, a banner on the office, last cars marked down.',
      abandoned: 'Closed for good: stalls empty but for a derelict or two, weeds in the cracks, a chain across the driveway, the sign dark and broken.',
    }),
    colours: choice('What colours are the pennants and the sign?', {
      hotrod: 'Red and yellow, the clearance-sale classic.',
      patriotic: 'Red, white and blue.',
      rainbow: 'Every colour of pennant under a yellow sign.',
      miami: 'Pink, turquoise and pale yellow, a 1980s holdover.',
      money: 'Green, white and gold.',
    }),
    ground: choice('What is the lot paved with?', {
      asphalt: 'Dark asphalt with painted stall lines.',
      faded: 'Sun-greyed asphalt, the lines nearly gone.',
      gravel: 'Gravel and dirt, no lines at all.',
      concrete: 'Pale concrete slabs with expansion joints.',
    }),
    stock: choice('What is mostly for sale?', {
      mixed: 'A bit of everything: sedans, hatchbacks, a truck or two in every colour.',
      trucks: 'Pickups and tall SUVs.',
      beaters: 'Tired old beaters in faded browns and greens, some with primer panels and soft tyres.',
      shiny: 'Clean late-model sedans and SUVs in white, silver, black and red.',
    }),
    overhead: choice('What is strung over the lot?', {
      pennants: 'Sagging lines of triangular pennants.',
      bulbs: 'Strings of bare light bulbs.',
      fringe: 'Lines of glittering metallic fringe.',
      both: 'Pennants and bulb strings together, the full carnival.',
    }),
    sign: choice('What tops the roadside sign?', {
      box: 'Nothing: a plain lit box sign on two legs.',
      arrow: 'A big arrow studded with chasing bulbs, pointing into the lot.',
      starburst: 'A spiky atomic starburst from the 1950s.',
    }),
    behind: choice('What closes off the back of the lot?', {
      fence: 'A chain-link fence.',
      wall: 'A painted concrete-block wall.',
      billboard: 'A chain-link fence with a big billboard rising behind it.',
      field: 'Nothing: the asphalt just gives out into scrub and weeds.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const dead = a.state === 'abandoned';
    const dusk = clamp01((Math.abs(mood.daylight - 0.5) * 2 - 0.4) / 0.4);
    const glow = dead ? 0 : dusk;
    const sky = new THREE.Color('#e3eaec').lerp(new THREE.Color('#f3e6c9'), mood.warmth * 0.7);
    sky.lerp(new THREE.Color('#a39dbd').lerp(new THREE.Color('#d6a892'), mood.warmth), dusk * 0.8);
    const W = 24, D = 18;
    const frontZ = 2.5, backZ = -6.4;
    const { art: s, world } = diorama(context, {
      background: `#${sky.getHexString()}`, floor: GROUND[a.ground], width: W, depth: D, yaw: 26, pitch: 28, maxHeight: 6.2, radius: 2.9,
      slots: [[0, frontZ, 0, 1.12], [4.7, frontZ + 0.1], [-4.7, frontZ + 0.1], [6.2, -1.9, 0, 0.9], [-3.2, -1.9, 0, 0.9], [9.4, frontZ + 0.1]],
    });
    const root = s.root;
    const key = world.keyLight!;
    key.intensity = mix(2.8, 1.25, dusk);
    key.color.lerp(new THREE.Color('#ffb07a'), dusk * 0.5);
    for (const child of root.children) {
      const hemi = child as THREE.HemisphereLight;
      if (hemi.isHemisphereLight) { hemi.intensity = mix(1.45, 1.0, dusk); hemi.color.lerp(new THREE.Color('#b7b0e6'), dusk * 0.6); }
    }

    const scheme = SCHEMES[a.colours];
    const fade = (dead ? 0.4 : a.state === 'closing' ? 0.15 : 0) + mood.wear * 0.25;
    const tone = (hex: string) => {
      const c = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      return c.setHSL(hsl.h, hsl.s * mix(0.8, 1, mood.cheer) * (1 - fade * 0.6), mix(hsl.l, 0.72, fade * 0.45));
    };
    const flagColours = scheme.flags.map(tone);
    const steel = s.material('#a9afb2', { metalness: 0.6, roughness: 0.45 });
    const dark = s.material('#1b1c1f', { roughness: 0.9 });
    const wood = s.material('#7a5c40', { roughness: 0.95 });
    const white = s.material('#eeebe1');
    const chrome = s.material('#d5d9db', { metalness: 0.9, roughness: 0.22 });
    const rubber = s.material('#1b1b1d', { roughness: 0.95 });
    const glass = new THREE.MeshStandardMaterial({ color: '#22313b', roughness: 0.15, metalness: 0.4 });
    const lampGlass = new THREE.MeshStandardMaterial({ color: '#fff6d6', emissive: '#ffe9a8', emissiveIntensity: mix(0.1, 2.2, glow), roughness: 0.3 });
    const shade = (hex: string, by: number) => `#${new THREE.Color(hex).multiplyScalar(by).getHexString()}`;

    const plate = (text: string, width: number, height: number, ink: string, paper: string, lit = 0, font = 'bold') => {
      const map = paint(512, Math.max(48, Math.round(512 * height / width)), (ctx) => {
        const h = ctx.canvas.height;
        ctx.fillStyle = paper; ctx.fillRect(0, 0, 512, h);
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `${font} ${Math.round(h * 0.68)}px "Arial Black", Impact, sans-serif`;
        const fit = Math.min(1, 470 / ctx.measureText(text).width);
        ctx.translate(256, h / 2 + h * 0.04); ctx.scale(fit, 1);
        ctx.fillText(text, 0, 0);
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map, roughness: 0.8, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: lit }));
      mesh.castShadow = true;
      return mesh;
    };

    // ---- street edge: sidewalk, curb cut and the road --------------------------------
    const walk = s.material('#cfcbc0', { roughness: 0.95 });
    const road = s.material('#4b4d52', { roughness: 0.95 });
    s.box([20, 0.16, 1.3], [-2, 0.08, 5.45], walk);
    s.box([0.5, 0.16, 1.3], [11.75, 0.08, 5.45], walk);
    s.box([3.5, 0.05, 1.3], [9.75, 0.025, 5.45], walk);
    for (let x = -11; x < 8; x += 2) s.box([0.03, 0.005, 1.2], [x, 0.163, 5.4], s.material('#a9a59b'));
    s.box([W, 0.04, 2.9], [0, 0.02, 7.55], road);
    s.box([W, 0.006, 0.12], [0, 0.043, 6.35], s.material('#e9e6da'));
    for (let x = -11; x < 12; x += 3) s.box([1.6, 0.006, 0.14], [x, 0.043, 8.8], s.material('#e3b520'));
    s.box([0.9, 0.02, 0.5], [3.5, 0.045, 6.36], dark);

    // ---- lot surface: stall lines, cracks, stains, weeds -------------------------------
    const lineInk = s.material(a.ground === 'faded' ? '#b9b7ad' : a.ground === 'concrete' ? '#e3b520' : '#ecebe2', { transparent: a.ground === 'faded', opacity: a.ground === 'faded' ? 0.6 : 1 });
    const angle = 0.3;
    if (a.ground !== 'gravel') {
      for (let i = 0; i < 6; i++) { const line = s.box([0.1, 0.012, 5.0], [-11.75 + i * 4.7, 0.006, frontZ], lineInk); line.rotation.y = angle; }
      for (let i = 0; i < 6; i++) s.box([0.1, 0.012, 4.8], [-3.45 + i * 2.9, 0.006, backZ], lineInk);
      if (a.ground === 'concrete') {
        const joint = s.material('#9d998e');
        for (let x = -8; x < 12; x += 4) s.box([0.04, 0.008, 13.8], [x, 0.004, -2.1], joint);
        for (let z = -5; z < 5; z += 4) s.box([W, 0.008, 0.04], [0, 0.004, z], joint);
      }
    } else {
      const pebbles = Array.from({ length: 150 }, () => ({ at: [(random() - 0.5) * W * 0.98, 0.01, -9 + random() * 13.6] as V3, size: 0.05 + random() * 0.09, color: random() < 0.5 ? '#9a8c74' : '#cfc3ab' }));
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#ffffff', { roughness: 1 }), pebbles);
    }
    const crackInk = s.material(shade(GROUND[a.ground], 0.55));
    const weedSpots: V3[] = [];
    for (let i = 0; i < Math.round(mood.wear * 12 + (dead ? 8 : 0)); i++) {
      let x = (random() - 0.5) * 22, z = -8 + random() * 12, heading = random() * Math.PI;
      for (let k = 0; k < 3 + Math.floor(random() * 3); k++) {
        const len = 0.5 + random() * 0.9;
        if (a.ground !== 'gravel') s.box([len, 0.01, 0.035], [x, 0.005, z], crackInk).rotation.y = heading;
        weedSpots.push([x, 0, z]);
        x += Math.cos(heading) * len * 0.9; z -= Math.sin(heading) * len * 0.9; heading += (random() - 0.5) * 1.2;
      }
    }
    const stain = s.material(shade(GROUND[a.ground], 0.62), { roughness: 0.5 });
    for (let i = 0; i < 4 + Math.round(mood.wear * 8); i++) {
      const front = random() < 0.6;
      s.cylinder(0.2 + random() * 0.35, 0.2 + random() * 0.35, 0.008, [front ? -10 + random() * 20 : -3 + random() * 14, 0.004, (front ? frontZ : backZ) + (random() - 0.2) * 1.6], stain, 12).scale.z = 0.6 + random() * 0.6;
    }
    const weeds: { at: V3; size: number; color: string }[] = [];
    const weedCount = Math.round(mood.wear * 40 + (dead ? 70 : 0) + (a.behind === 'field' ? 20 : 0));
    for (let i = 0; i < weedCount; i++) {
      const spot = weedSpots.length && random() < 0.6 ? weedSpots[Math.floor(random() * weedSpots.length)] : [(random() < 0.5 ? -1 : 1) * (10 + random() * 1.8), 0, -8.5 + random() * 13] as V3;
      weeds.push({ at: [spot[0] + (random() - 0.5) * 0.3, 0, Math.min(4.6, spot[2] + (random() - 0.5) * 0.3)], size: 0.25 + random() * 0.5, color: random() < 0.5 ? '#7d8a3c' : '#a39a52' });
    }
    if (a.behind === 'field') for (let i = 0; i < 110; i++) weeds.push({ at: [(random() - 0.5) * W * 0.98, 0, -8.9 + random() * random() * 2.2], size: 0.4 + random() * 0.8, color: ['#7d8a3c', '#a39a52', '#c2ac62'][Math.floor(random() * 3)] });
    if (weeds.length) s.scatter(new THREE.ConeGeometry(0.22, 1, 5).translate(0, 0.5, 0), s.material('#ffffff', { roughness: 1 }), weeds);

    // ---- overhead strings ------------------------------------------------------------
    const pylon = new THREE.Vector3(-10.3, 0, 4.2);
    const polesAt: P2[] = [[11.3, 4.3], [-11.3, -8.2], [11.3, -8.2]];
    const poleTop = 6.6;
    const cones: THREE.Mesh[] = [];
    for (const [x, z] of polesAt) {
      s.cylinder(0.07, 0.1, poleTop, [x, poleTop / 2, z], steel, 10);
      s.cylinder(0.22, 0.26, 0.5, [x, 0.25, z], s.material('#c9c5b8', { roughness: 1 }), 10);
      const inward = new THREE.Vector3(-x, 0, -1.5 - z).normalize();
      s.rod([x, poleTop - 0.1, z], [x + inward.x * 1.2, poleTop + 0.15, z + inward.z * 1.2], 0.04, steel);
      const lampAt: V3 = [x + inward.x * 1.3, poleTop + 0.1, z + inward.z * 1.3];
      const head = s.box([0.75, 0.16, 0.45], lampAt, dark);
      head.rotation.y = Math.atan2(inward.x, inward.z);
      const lens = s.box([0.65, 0.04, 0.36], [lampAt[0], lampAt[1] - 0.1, lampAt[2]], lampGlass);
      lens.rotation.y = head.rotation.y;
      if (glow > 0.05) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(3.4, poleTop, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.07 * glow, depthWrite: false, side: THREE.DoubleSide }));
        cone.position.set(lampAt[0] + inward.x * 1.2, poleTop / 2 + 0.02, lampAt[2] + inward.z * 1.2);
        const pool = new THREE.Mesh(new THREE.CircleGeometry(3.6, 28), new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.16 * glow, depthWrite: false }));
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(cone.position.x, 0.03, cone.position.z);
        root.add(cone, pool);
        cones.push(cone);
      }
    }
    const top = (x: number, z: number, y = poleTop - 0.15) => new THREE.Vector3(x, y, z);
    const pylonTop = top(pylon.x + 1.4, pylon.z - 0.7, 7.3);
    const sagLine = (from: THREE.Vector3, to: THREE.Vector3, drop: number) => (t: number) => {
      const p = from.clone().lerp(to, t);
      p.y -= drop * 4 * t * (1 - t);
      return p;
    };
    const runs: { path: (t: number) => THREE.Vector3; length: number; kind: 'flags' | 'bulbs' | 'fringe' }[] = [];
    const spans: [THREE.Vector3, THREE.Vector3, number][] = [
      [pylonTop, top(11.3, 4.3), 1.5],
      [pylonTop, top(11.3, -8.2), 1.7],
      [top(11.3, 4.3), top(-11.3, -8.2), 1.7],
      [top(-11.3, -8.2), top(11.3, -8.2), 1.3],
    ];
    spans.forEach(([from, to, drop], index) => {
      if (dead && index > 0 && random() < 0.45) return;
      const length = from.distanceTo(to) * 1.03;
      const kind = a.overhead === 'pennants' ? 'flags' : a.overhead === 'bulbs' ? 'bulbs' : a.overhead === 'fringe' ? 'fringe' : index % 2 ? 'bulbs' : 'flags';
      runs.push({ path: sagLine(from, to, drop), length, kind });
      if (a.overhead === 'fringe' && index === 0) runs.push({ path: sagLine(from.clone().setY(from.y - 0.5), to.clone().setY(to.y - 0.5), drop + 0.5), length, kind: 'flags' });
    });
    const cord = s.material('#e4e0d4', { roughness: 0.9 });
    type Leaf = { at: THREE.Vector3; yaw: number; tilt: number; phase: number; sy: number; colour: THREE.Color };
    const flags: Leaf[] = [], strips: Leaf[] = [];
    const bulbsAt: THREE.Vector3[] = [];
    const missing = dead ? 0.55 : a.state === 'closing' ? 0.2 : mood.wear * 0.3;
    let counter = 0;
    for (const run of runs) {
      s.tube(Array.from({ length: 13 }, (_unused, i) => run.path(i / 12).toArray() as V3), 0.02, run.kind === 'bulbs' ? dark : cord);
      const step = run.kind === 'flags' ? 0.72 : run.kind === 'bulbs' ? 0.8 : 0.09;
      const n = Math.floor(run.length / step);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const tangent = run.path(Math.min(1, t + 0.01)).sub(run.path(Math.max(0, t - 0.01)));
        const yaw = Math.atan2(-tangent.z, tangent.x);
        if (run.kind === 'bulbs') { if (!(dead && random() < 0.5)) bulbsAt.push(run.path(t).setY(run.path(t).y - 0.09)); continue; }
        const colour = run.kind === 'flags' ? flagColours[counter++ % flagColours.length] : new THREE.Color(random() < 0.5 ? '#e4e8ec' : '#e9c44a');
        if (random() < missing) continue;
        (run.kind === 'flags' ? flags : strips).push({ at: run.path(t), yaw, tilt: (random() - 0.5) * mix(0.3, 0.9, mood.energy), phase: random() * 6.28, sy: run.kind === 'flags' ? (dead && random() < 0.5 ? 0.4 + random() * 0.4 : 1) : 0.7 + random() * 0.7, colour });
      }
    }
    const dummy = new THREE.Object3D();
    dummy.rotation.order = 'YXZ';
    const flutter = mix(0.05, 0.55, mood.energy), flutterSpeed = mix(1, 7, mood.energy);
    const leafSet = (leaves: Leaf[], geometry: THREE.BufferGeometry, material: THREE.Material, gain: number) => {
      if (!leaves.length) { geometry.dispose(); material.dispose(); return () => {}; }
      const mesh = new THREE.InstancedMesh(geometry, material, leaves.length);
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      leaves.forEach((leaf, index) => mesh.setColorAt(index, leaf.colour));
      const pose = (time: number) => {
        leaves.forEach((leaf, index) => {
          dummy.position.copy(leaf.at);
          dummy.rotation.set(leaf.tilt + Math.sin(time * flutterSpeed + leaf.phase) * flutter * gain, leaf.yaw + Math.cos(time * flutterSpeed * 0.7 + leaf.phase) * flutter * 0.4, 0);
          dummy.scale.set(1, leaf.sy, 1);
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      };
      pose(0);
      root.add(mesh);
      return pose;
    };
    const triangle = new THREE.Shape();
    triangle.moveTo(-0.3, 0); triangle.lineTo(0.3, 0); triangle.lineTo(0, -0.9);
    const poseFlags = leafSet(flags, new THREE.ShapeGeometry(triangle), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.04 }), 1);
    const poseStrips = leafSet(strips, new THREE.PlaneGeometry(0.07, 0.5).translate(0, -0.25, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide }), 1.5);

    // bulbs: string lights plus the chasing bulbs on the sign share one instanced mesh
    const chase: number[] = [];
    const addBulbs = (points: THREE.Vector3[], chasing: boolean) => { for (const p of points) { bulbsAt.push(p); if (chasing) chase.push(bulbsAt.length - 1); } };

    // ---- pylon sign ------------------------------------------------------------------
    const sign = new THREE.Group();
    sign.position.copy(pylon);
    sign.rotation.y = 0.5;
    root.add(sign);
    const put = <T extends THREE.Object3D>(parent: THREE.Object3D, node: T, at: V3) => { node.position.set(...at); node.traverse((n) => { n.castShadow = n.receiveShadow = true; }); parent.add(node); return node; };
    const box = (parent: THREE.Object3D, size: V3, at: V3, material: THREE.Material) => put(parent, new THREE.Mesh(new THREE.BoxGeometry(...size), material), at);
    const legPaint = s.material(dead ? '#8a8378' : scheme.sign);
    for (const x of [-1.5, 1.5]) box(sign, [0.26, 7.4, 0.26], [x, 3.7, 0], legPaint);
    const signColour = `#${tone(scheme.sign).getHexString()}`;
    const faceMap = paint(512, 224, (ctx) => {
      ctx.fillStyle = signColour; ctx.fillRect(0, 0, 512, 224);
      ctx.strokeStyle = scheme.ink; ctx.lineWidth = 10; ctx.strokeRect(10, 10, 492, 204);
      ctx.fillStyle = scheme.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'italic 900 104px "Arial Black", Impact, sans-serif';
      const name = DEALERS[a.dealer];
      ctx.save(); ctx.translate(256, 86); ctx.scale(Math.min(1, 450 / ctx.measureText(name).width), 1); ctx.fillText(name, 0, 0); ctx.restore();
      ctx.fillStyle = '#f6f3e8'; ctx.fillRect(40, 146, 432, 52);
      ctx.fillStyle = '#1b1b1b'; ctx.font = '900 44px "Arial Black", Impact, sans-serif'; ctx.fillText('USED CARS', 256, 174);
      if (dead || mood.wear > 0.7) {
        // broken panels: holes showing the dark box and dead tubes inside
        for (let i = 0; i < (dead ? 5 : 2); i++) {
          ctx.fillStyle = '#2a2724';
          ctx.beginPath();
          const cx = 40 + random() * 430, cy = 30 + random() * 160;
          for (let k = 0; k < 7; k++) { const r = 18 + random() * 40, t = (k / 7) * Math.PI * 2; ctx.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); }
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(120,104,84,0.35)'; ctx.fillRect(0, 0, 512, 224);
      }
    });
    box(sign, [4.5, 2.0, 0.42], [0, 6.2, 0], s.material(shade(signColour, 0.7)));
    for (const side of [-1, 1]) {
      const face = put(sign, new THREE.Mesh(new THREE.PlaneGeometry(4.36, 1.9), new THREE.MeshStandardMaterial({ map: faceMap, roughness: 0.6, emissive: '#ffffff', emissiveMap: faceMap, emissiveIntensity: mix(0.08, 0.95, glow) })), [0, 6.2, side * 0.215]);
      face.rotation.y = side === 1 ? 0 : Math.PI;
    }
    box(sign, [3.9, 1.05, 0.22], [0, 4.45, 0], s.material('#d8d5ca'));
    const boardText = dead ? ['FOR LEASE', 'CL SED', 'THANK  OU'][Math.floor(random() * 3)] : a.state === 'closing' && random() < 0.6 ? 'CLOSING SALE' : PITCHES[a.pitch];
    for (const side of [-1, 1]) {
      const board = put(sign, plate(boardText, 3.75, 0.92, dead ? '#3a3a3a' : '#1b1b1b', '#f4f1e6', mix(0.05, 0.7, glow)), [0, 4.45, side * 0.115]);
      board.rotation.y = side === 1 ? 0 : Math.PI;
    }
    if (a.sign === 'arrow') {
      const arrow = new THREE.Shape();
      for (const [x, y, i] of [[-2.4, 0.3, 0], [0.7, 0.3, 1], [0.7, 0.8, 2], [2.4, 0, 3], [0.7, -0.8, 4], [0.7, -0.3, 5], [-2.4, -0.3, 6]] as const) (i ? arrow.lineTo(x, y) : arrow.moveTo(x, y));
      const mesh = put(sign, new THREE.Mesh(new THREE.ExtrudeGeometry(arrow, { depth: 0.22, bevelEnabled: false }).translate(0, 0, -0.11), s.material(dead ? '#a59a82' : '#ffcf1f', { emissive: '#ffb300', emissiveIntensity: glow * 0.35 })), [0.5, 8.1, 0]);
      mesh.rotation.z = -0.4;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < 9; i++) for (const side of [-1, 1]) points.push(new THREE.Vector3(-2.2 + i * 0.5, 0, side * 0.14).applyEuler(mesh.rotation).add(mesh.position).applyEuler(sign.rotation).add(sign.position));
      if (!dead) addBulbs(points, true);
    } else if (a.sign === 'starburst') {
      const hub: V3 = [0, 8.3, 0];
      box(sign, [0.12, 1.2, 0.12], [0, 7.75, 0], steel);
      put(sign, new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), s.material(dead ? '#a59a82' : '#ffcf1f', { emissive: '#ffb300', emissiveIntensity: glow * 0.6, metalness: 0.4 })), hub);
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < 14; i++) {
        const dir = new THREE.Vector3(Math.cos(i * 2.4) * Math.sqrt(1 - ((i / 13) * 2 - 1) ** 2), (i / 13) * 2 - 1, Math.sin(i * 2.4) * Math.sqrt(1 - ((i / 13) * 2 - 1) ** 2));
        const reach = 0.8 + (i % 3) * 0.3;
        const spike = put(sign, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, reach, 5), chrome), [hub[0] + dir.x * reach / 2, hub[1] + dir.y * reach / 2, hub[2] + dir.z * reach / 2]);
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        points.push(dir.clone().multiplyScalar(reach).add(new THREE.Vector3(...hub)).applyEuler(sign.rotation).add(sign.position));
      }
      if (!dead) addBulbs(points, true);
    }

    // ---- office at the back -----------------------------------------------------------
    const office = new THREE.Group();
    office.position.set(-7.3, 0, -6.2);
    office.rotation.y = 0.12;
    root.add(office);
    const oW = 5.6, oH = 2.5, oD = 2.9, oY = 0.35;
    const siding = s.material(dead ? '#cbc5b4' : '#ece8da');
    const trim = s.material(`#${tone(scheme.sign).getHexString()}`);
    for (const z of [-1, 1]) box(office, [oW - 0.4, oY, 0.25], [0, oY / 2, z], dark);
    box(office, [oW, oH, oD], [0, oY + oH / 2, 0], siding);
    box(office, [oW + 0.02, 0.32, oD + 0.02], [0, oY + 0.75, 0], trim);
    box(office, [oW + 0.5, 0.14, oD + 0.6], [0, oY + oH + 0.07, 0.1], s.material('#8d8a82'));
    const fz = oD / 2;
    const open = a.state === 'slow' || a.state === 'saturday';
    const door = box(office, [0.95, 2.05, 0.06], [-1.6, oY + 1.03, fz + 0.03], s.material(dead ? '#8b8576' : '#f4f1e6'));
    if (open) { door.rotation.y = -1.1; door.position.set(-1.6 - 0.26, oY + 1.03, fz + 0.45); box(office, [0.9, 2.0, 0.02], [-1.6, oY + 1.0, fz + 0.012], s.material('#3a2f27')); }
    else box(office, [0.5, 0.6, 0.02], [-1.6, oY + 1.45, fz + 0.065], glass);
    const windowGlow = dead ? 0 : mix(0.15, 1.6, dusk) * (a.state === 'closing' ? 0.6 : 1);
    box(office, [2.3, 1.15, 0.05], [0.9, oY + 1.5, fz + 0.01], white);
    box(office, [2.1, 0.95, 0.05], [0.9, oY + 1.5, fz + 0.03], new THREE.MeshStandardMaterial({ color: dead ? '#4a4f4f' : '#f3dfa0', emissive: '#ffd98a', emissiveIntensity: windowGlow, roughness: 0.3 }));
    if (dead) for (let i = 0; i < 3; i++) box(office, [2.5, 0.28, 0.04], [0.9, oY + 1.15 + i * 0.36, fz + 0.07], wood).rotation.z = (random() - 0.5) * 0.12;
    else {
      // the desk lamp and blinds seen through the window
      for (let i = 0; i < 6; i++) box(office, [2.1, 0.02, 0.01], [0.9, oY + 1.1 + i * 0.16, fz + 0.06], white);
      box(office, [0.05, 0.4, 0.02], [0.4, oY + 1.25, fz + 0.065], dark);
      box(office, [0.3, 0.14, 0.02], [0.48, oY + 1.48, fz + 0.065], new THREE.MeshStandardMaterial({ color: '#2f8f5a', emissive: '#7dffb0', emissiveIntensity: 0.3 + dusk }));
    }
    box(office, [0.75, 0.5, 0.5], [2.35, oY + 1.9, fz + 0.2], s.material('#c9c6bb'));
    for (let i = 0; i < 4; i++) box(office, [0.65, 0.02, 0.02], [2.35, oY + 1.74 + i * 0.1, fz + 0.455], dark);
    // ramp and landing
    box(office, [1.5, 0.1, 1.1], [-1.6, oY - 0.05, fz + 0.55], wood);
    const ramp = box(office, [2.4, 0.08, 1.0], [0.3, oY / 2 - 0.03, fz + 0.6], wood);
    ramp.rotation.z = -Math.atan2(oY - 0.1, 2.4);
    for (const x of [-2.3, -0.9, 1.4]) box(office, [0.07, x > 1 ? 0.75 : 0.95, 0.07], [x, x > 1 ? 0.4 : oY + 0.42, fz + 1.08], wood);
    box(office, [3.8, 0.07, 0.07], [-0.45, oY + 0.72, fz + 1.08], wood).rotation.z = -0.07;
    const roofText = dead ? 'FOR LEASE' : a.state === 'closing' ? 'GOING OUT OF BUSINESS' : a.state === 'saturday' ? 'SALE TODAY!' : 'SALES OFFICE';
    const roofSign = put(office, plate(roofText, 4.4, 0.75, dead ? '#4a4a4a' : scheme.ink, dead ? '#d9d4c4' : signColour, mix(0.05, 0.6, glow)), [0, oY + oH + 0.75, fz - 0.2]);
    box(office, [4.5, 0.85, 0.08], [0, roofSign.position.y, fz - 0.25], s.material(shade(signColour, 0.7)));
    for (const x of [-1.8, 1.8]) box(office, [0.08, 0.5, 0.08], [x, oY + oH + 0.25, fz - 0.3], steel);
    if (dead) for (let i = 0; i < 9; i++) box(office, [0.24, 0.012, 0.12], [-1.6 + (random() - 0.5) * 0.9, oY + 0.01 + i * 0.012, fz + 0.4 + random() * 0.5], white).rotation.y = random() * 3;
    // a tyre stack and a trash barrel beside it
    for (let i = 0; i < 3 + Math.round(mood.density * 3); i++) {
      const tyre = put(office, new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.12, 8, 16), rubber), [3.5 + (random() - 0.5) * 0.08, 0.12 + i * 0.23, 0.6 + (random() - 0.5) * 0.08]);
      tyre.rotation.x = Math.PI / 2;
    }
    put(office, new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.85, 14), s.material('#3f6f8f', { metalness: 0.3 })), [3.6, 0.43, 1.6]);

    // ---- power lines behind -------------------------------------------------------------
    const poleWood = s.material('#5d4a38', { roughness: 1 });
    const wire = s.material('#232323');
    const poleXs = [-9.5, 1, 11.2];
    const lineZ = -8.75, lineY = 8.6;
    poleXs.forEach((x, index) => {
      const lean = (random() - 0.5) * 0.05;
      const pole = s.cylinder(0.1, 0.15, lineY + 0.4, [x, (lineY + 0.4) / 2, lineZ], poleWood, 8);
      pole.rotation.z = lean;
      s.box([0.12, 0.14, 2.2], [x, lineY, lineZ], poleWood);
      s.box([0.1, 0.12, 1.4], [x, lineY - 0.9, lineZ], poleWood);
      for (const z of [-0.95, 0, 0.95]) s.cylinder(0.05, 0.07, 0.16, [x, lineY + 0.15, lineZ + z], s.material('#9fb0a8'), 8);
      if (index === 1) {
        s.cylinder(0.26, 0.26, 0.75, [x + 0.42, lineY - 1.7, lineZ], s.material('#8b9094', { metalness: 0.4 }), 12);
        s.rod([x + 0.42, lineY - 1.3, lineZ], [x + 0.1, lineY - 0.9, lineZ + 0.5], 0.015, wire);
        // the drop that feeds the office
        s.tube([[x, lineY - 2.2, lineZ], [-3, 5.2, -7.6], [-5.3, 3.3, -6.6]], 0.018, wire);
      }
    });
    for (const [z, y, drop] of [[-0.95, lineY + 0.22, 0.5], [0, lineY + 0.22, 0.55], [0.95, lineY + 0.22, 0.5], [-0.6, lineY - 0.85, 0.7], [0.6, lineY - 0.85, 0.75], [0, lineY - 2.2, 0.9]] as const) {
      const points: V3[] = [];
      const xs = [-12.6, ...poleXs, 12.6];
      for (let i = 0; i < xs.length - 1; i++) for (let k = 0; k < 6; k++) {
        const t = k / 6;
        points.push([mix(xs[i], xs[i + 1], t), y - drop * 4 * t * (1 - t) * (i === 0 || i === xs.length - 2 ? 0.3 : 1), lineZ + z]);
      }
      points.push([12.6, y, lineZ + z]);
      s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.1), 72, 0.022, 4), wire);
    }
    if (mood.cheer < 0.4 || dead) for (let i = 0; i < 2 + Math.floor(random() * 3); i++) s.ball([0.1, 0.13, 0.16], [2.5 + i * 0.5 + random() * 0.3, lineY + 0.2, lineZ - 0.95], dark, 8);

    // ---- what closes the back ------------------------------------------------------------
    const edgeZ = -8.45;
    if (a.behind === 'fence' || a.behind === 'billboard') {
      const mesh = paint(64, 64, (ctx) => {
        ctx.clearRect(0, 0, 64, 64);
        ctx.strokeStyle = '#a7adb0'; ctx.lineWidth = 5;
        for (const d of [-64, 0, 64]) { ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + 64, 64); ctx.stroke(); ctx.beginPath(); ctx.moveTo(d + 64, 0); ctx.lineTo(d, 64); ctx.stroke(); }
      });
      mesh.wrapS = mesh.wrapT = THREE.RepeatWrapping;
      mesh.repeat.set(54, 5);
      s.mesh(new THREE.PlaneGeometry(W - 0.4, 2.1), new THREE.MeshStandardMaterial({ map: mesh, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4 }), [0, 1.05, edgeZ]);
      for (let x = -11.8; x <= 11.81; x += 2.95) s.cylinder(0.04, 0.04, 2.25, [x, 1.12, edgeZ], steel, 6);
      s.rod([-11.8, 2.12, edgeZ], [11.8, 2.12, edgeZ], 0.03, steel);
      for (let i = 0; i < Math.round(mood.wear * 5); i++) s.box([0.4 + random() * 0.3, 0.3 + random() * 0.3, 0.04], [-10 + random() * 20, 0.4 + random() * 1.2, edgeZ + 0.04], s.material(random() < 0.5 ? '#e9e6dc' : '#7fb0c8')).rotation.z = random();
    } else if (a.behind === 'wall') {
      const blocks = paint(256, 128, (ctx) => {
        ctx.fillStyle = dead ? '#b9b3a4' : '#d9d3c2'; ctx.fillRect(0, 0, 256, 128);
        ctx.fillStyle = signColour; ctx.fillRect(0, 34, 256, 30);
        ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2;
        for (let row = 0; row < 4; row++) { ctx.strokeRect(-2, row * 32, 260, 32); for (let col = 0; col < 5; col++) { const x = col * 64 + (row % 2) * 32; ctx.beginPath(); ctx.moveTo(x, row * 32); ctx.lineTo(x, row * 32 + 32); ctx.stroke(); } }
      });
      blocks.wrapS = THREE.RepeatWrapping;
      blocks.repeat.set(10, 1);
      const cap = s.material('#bdb7a8');
      s.box([W - 0.2, 2.3, 0.26], [0, 1.15, edgeZ - 0.1], cap);
      s.mesh(new THREE.PlaneGeometry(W - 0.2, 2.3), new THREE.MeshStandardMaterial({ map: blocks, roughness: 0.95 }), [0, 1.15, edgeZ + 0.035]);
      for (let i = 0; i < Math.round(mood.wear * 4 + (dead ? 3 : 0)); i++) s.tube(Array.from({ length: 5 }, (_unused, k) => [-10.5 + ((i * 3.1) % 19) + k * 0.45, 0.7 + random() * 0.9, edgeZ + 0.04] as V3), 0.04, s.material(['#2d2d2d', '#b146c2', '#1f6fd8'][i % 3]));
    }
    if (a.behind === 'billboard') {
      const bx = 6.2, bz = -8.72;
      for (const x of [-2.2, 2.2]) s.box([0.22, 5.6, 0.22], [bx + x, 2.8, bz], steel);
      s.box([7.6, 0.14, 0.9], [bx, 5.1, bz + 0.3], steel);
      const art = paint(512, 224, (ctx) => {
        const hot = `#${tone('#ffcf1f').getHexString()}`, red = `#${tone('#e3342f').getHexString()}`;
        ctx.fillStyle = dead ? '#d8d2c2' : hot; ctx.fillRect(0, 0, 512, 224);
        ctx.fillStyle = dead ? '#c3bcab' : red;
        for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(256, 260); ctx.lineTo(256 + Math.cos((i / 12) * Math.PI) * 600 - 22, 260 - Math.sin((i / 12) * Math.PI) * 600); ctx.lineTo(256 + Math.cos((i / 12 + 0.04) * Math.PI) * 600, 260 - Math.sin((i / 12 + 0.04) * Math.PI) * 600); ctx.fill(); }
        ctx.fillStyle = dead ? '#8b8576' : '#1b1b1b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'italic 900 78px "Arial Black", Impact, sans-serif';
        ctx.fillText(dead ? 'YOUR AD HERE' : 'EASY CREDIT!', 256, 88, 470);
        ctx.font = '900 40px "Arial Black", Impact, sans-serif';
        ctx.fillText(dead ? '555-0142' : 'DRIVE HOME TODAY', 256, 166, 470);
        if (mood.wear > 0.5 || dead) { ctx.fillStyle = '#b7ae9a'; for (let i = 0; i < 5; i++) ctx.fillRect(random() * 460, random() * 180, 60 + random() * 90, 26 + random() * 50); }
      });
      s.box([7.4, 3.3, 0.2], [bx, 6.8, bz], s.material('#6f6a5f'));
      s.mesh(new THREE.PlaneGeometry(7.2, 3.1), new THREE.MeshStandardMaterial({ map: art, roughness: 0.85, emissive: '#ffffff', emissiveMap: art, emissiveIntensity: mix(0.03, 0.5, glow) }), [bx, 6.8, bz + 0.11]);
      for (const x of [-2.4, 0, 2.4]) { s.rod([bx + x, 5.15, bz + 0.3], [bx + x, 5.25, bz + 0.75], 0.03, steel); s.box([0.4, 0.1, 0.2], [bx + x, 5.3, bz + 0.75], lampGlass); }
    }

    // ---- cars for sale -----------------------------------------------------------------
    const inks = ['#ffffff', '#f6ff3a', '#ff5fb4', '#8dff4a'];
    const priceTags = ['$995', '$1,495', '$2,995', '$3,995', '$4,888', '$6,995', 'AS IS', 'WOW!'];
    const priceMaps = Array.from({ length: 5 }, (_unused, index) => paint(256, 128, (ctx) => {
      ctx.clearRect(0, 0, 256, 128);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const colour = inks[(index + Math.floor(random() * 4)) % 4];
      ctx.fillStyle = ctx.strokeStyle = colour; ctx.lineWidth = 6; ctx.lineJoin = 'round';
      ctx.font = 'italic bold 78px "Comic Sans MS", "Trebuchet MS", sans-serif';
      const text = priceTags[Math.floor(random() * priceTags.length)];
      ctx.translate(128, 62); ctx.rotate((random() - 0.5) * 0.14);
      ctx.strokeText(text, 0, 0, 240); ctx.fillText(text, 0, 0, 240);
    }));
    const stock = STOCK[a.stock];
    const balloons: { at: V3; size: number; color: string }[] = [];
    const balloonHues = ['#e3342f', '#ffcf1f', '#1f6fd8', '#2f9e44', '#ff5fa8', '#f5f2ea'];
    const strings = s.material('#f1eee4');
    const makeCar = (x: number, z: number, turn: number, derelict: boolean) => {
      const style = STYLES[stock.styles[Math.floor(random() * stock.styles.length)]];
      const { length, width, bottom, wheel } = style;
      const beat = a.stock === 'beaters' || derelict;
      const dull = clamp01((derelict ? 0.7 : beat ? 0.35 : a.stock === 'shiny' ? -0.15 : 0.05) + mood.wear * 0.5);
      const colour = new THREE.Color(stock.paints[Math.floor(random() * stock.paints.length)]).lerp(new THREE.Color('#8f8573'), dull * 0.35);
      const body = new THREE.MeshStandardMaterial({ color: colour, roughness: mix(0.22, 0.9, dull), metalness: mix(0.35, 0.05, dull) });
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.rotation.y = turn;
      const car = new THREE.Group();
      car.rotation.y = -Math.PI / 2;
      group.add(car);
      const arch = wheel + 0.07;
      const phi = Math.asin(Math.min(0.99, (wheel - bottom) / arch));
      const outline = new THREE.Shape();
      outline.moveTo(-length / 2, bottom);
      for (const [px, py] of style.top) outline.lineTo(px, py);
      outline.lineTo(length / 2, bottom);
      outline.absarc(style.axles[1], wheel, arch, -phi, Math.PI + phi, false);
      outline.absarc(style.axles[0], wheel, arch, -phi, Math.PI + phi, false);
      outline.lineTo(-length / 2, bottom);
      const bevel = 0.06;
      const shell = new THREE.ExtrudeGeometry(outline, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 1, curveSegments: 6 });
      shell.translate(0, 0, -(width - bevel * 2) / 2);
      put(car, new THREE.Mesh(shell, body), [0, 0, 0]);
      const [rearBase, rearTop, frontTop, frontBase] = style.cabin;
      const cabinWidth = width * 0.84;
      const cabinShape = new THREE.Shape();
      cabinShape.moveTo(rearBase[0], rearBase[1] - 0.05);
      cabinShape.lineTo(rearTop[0], rearTop[1]); cabinShape.lineTo(frontTop[0], frontTop[1]); cabinShape.lineTo(frontBase[0], frontBase[1] - 0.05);
      const cabin = new THREE.ExtrudeGeometry(cabinShape, { depth: cabinWidth - 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 1 });
      cabin.translate(0, 0, -(cabinWidth - 0.1) / 2);
      put(car, new THREE.Mesh(cabin, glass), [0, 0, 0]);
      box(car, [frontTop[0] - rearTop[0] + 0.12, 0.05, cabinWidth + 0.02], [(frontTop[0] + rearTop[0]) / 2, frontTop[1] + 0.035, 0], body);
      if (style.bed) box(car, [style.bed[1] - style.bed[0], 0.04, width - 0.24], [(style.bed[0] + style.bed[1]) / 2, style.top[1][1] + 0.005, 0], dark);
      const nose = style.top[style.top.length - 1][1];
      box(car, [0.14, 0.15, width + 0.04], [length / 2 + 0.02, bottom + 0.09, 0], chrome);
      box(car, [0.14, 0.15, width + 0.04], [-length / 2 - 0.02, bottom + 0.09, 0], chrome);
      box(car, [0.05, Math.max(0.12, nose - bottom - 0.22), width * 0.5], [length / 2 + bevel * 0.75, (nose + bottom + 0.16) / 2 + 0.02, 0], dark);
      for (const side of [-1, 1]) box(car, [0.05, 0.14, width * 0.17], [length / 2 + bevel * 0.75, (nose + bottom + 0.16) / 2 + 0.02, side * width * 0.36], white);
      const flat = beat && random() < 0.5 ? Math.floor(random() * 4) : -1;
      let index = 0;
      for (const axle of style.axles) for (const side of [-1, 1]) {
        const squash = index++ === flat ? 0.8 : 1;
        const tyre = put(car, new THREE.Mesh(new THREE.CylinderGeometry(wheel, wheel, 0.24, 14), rubber), [axle, wheel * squash, side * (width / 2 - 0.13)]);
        tyre.rotation.x = Math.PI / 2;
        tyre.scale.set(1, 1, squash);
      }
      if (beat && random() < 0.6) box(car, [0.9, 0.42, 0.014], [frontBase[0] - 0.75, (frontBase[1] + bottom) / 2 + 0.06, (random() < 0.5 ? -1 : 1) * (width / 2 + 0.004)], s.material('#8f9497', { roughness: 1 }));
      if (!derelict) {
        const slopeX = frontBase[0] - frontTop[0], slopeY = frontTop[1] - frontBase[1];
        const map = priceMaps[Math.floor(random() * priceMaps.length)];
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(cabinWidth * 0.9, Math.hypot(slopeX, slopeY) * 0.9), new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.25, roughness: 0.8, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.4 }));
        screen.rotation.order = 'YXZ';
        screen.rotation.y = Math.PI / 2;
        screen.rotation.x = -Math.atan2(slopeX, slopeY);
        screen.position.set((frontBase[0] + frontTop[0]) / 2, (frontBase[1] + frontTop[1]) / 2 - 0.01, 0).addScaledVector(new THREE.Vector3(slopeY, slopeX, 0).normalize(), 0.06);
        car.add(screen);
      }
      root.add(group);
      if (a.state === 'saturday' || (!derelict && mood.cheer > 0.75 && random() < 0.5)) {
        group.updateMatrixWorld(true);
        const anchor = car.localToWorld(new THREE.Vector3(frontBase[0] - 0.08, frontBase[1] + 0.1, width / 2 + 0.08));
        for (let i = 0; i < 3; i++) {
          const at: V3 = [anchor.x + (random() - 0.5) * 0.6, anchor.y + 0.8 + random() * 0.7, anchor.z + (random() - 0.5) * 0.6];
          balloons.push({ at, size: 0.2, color: balloonHues[Math.floor(random() * balloonHues.length)] });
          s.rod(anchor.toArray() as V3, [at[0], at[1] - 0.2, at[2]], 0.006, strings);
        }
      }
      return group;
    };
    const fill = { saturday: 1, slow: 0.82, closing: 0.45, abandoned: 0.14 }[a.state] * mix(0.8, 1.1, mood.density);
    // Front-row cars double as stand-ins: the one in a slot steps aside when a cast thing takes it.
    const standIns = new Map<number, THREE.Object3D>();
    const frontRow: [number, number | null][] = [[0, 0], [4.7, 1], [-4.7, 2], [9.4, 5], [-9.4, null]];
    for (const [x, slot] of frontRow) {
      if (random() > fill && !(dead && slot === null)) continue;
      const car = makeCar(x + (random() - 0.5) * 0.3, frontZ + 0.1 + (random() - 0.5) * 0.3, angle + (random() - 0.5) * 0.08, dead);
      if (slot !== null) standIns.set(slot, car);
    }
    for (let i = 0; i < 5; i++) {
      if (random() > fill * 0.92) continue;
      makeCar(-2 + i * 2.9 + (random() - 0.5) * 0.2, backZ + (random() - 0.5) * 0.4, (random() - 0.5) * 0.06, dead || (a.state === 'closing' && random() < 0.3));
    }
    if (a.state === 'saturday') {
      const coneMat = s.material('#ff6a13', { emissive: '#ff5a00', emissiveIntensity: 0.15 });
      for (const [x, z] of [[8.1, 4.9], [11.4, 4.9], [8.1, 6.1], [11.4, 6.1]] as const) { s.cylinder(0.03, 0.17, 0.6, [x, 0.3, z], coneMat, 10); s.box([0.4, 0.04, 0.4], [x, 0.02, z], coneMat); }
      for (const legX of [-1.5, 1.5]) {
        const foot = new THREE.Vector3(legX, 1.2, 0.2).applyEuler(sign.rotation).add(sign.position);
        for (let i = 0; i < 6; i++) {
          const at: V3 = [foot.x + (random() - 0.5) * 0.9, foot.y + 0.7 + random() * 1.2, foot.z + (random() - 0.5) * 0.9];
          balloons.push({ at, size: 0.23, color: balloonHues[Math.floor(random() * balloonHues.length)] });
          s.rod(foot.toArray() as V3, [at[0], at[1] - 0.2, at[2]], 0.006, strings);
        }
      }
    }
    if (balloons.length) s.scatter(new THREE.SphereGeometry(1, 12, 10).scale(1, 1.2, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 }), balloons);
    if (dead) {
      // chain across the driveway
      for (const x of [8.1, 11.4]) s.cylinder(0.06, 0.06, 0.95, [x, 0.47, 4.95], s.material('#d9b21c'), 8);
      s.tube([[8.1, 0.9, 4.95], [9.75, 0.5, 4.98], [11.4, 0.9, 4.95]], 0.03, steel);
      s.box([0.6, 0.4, 0.02], [9.75, 0.62, 4.99], s.material('#f1eee4')).rotation.z = 0.06;
    }

    // ---- bulbs -----------------------------------------------------------------------
    let bulbs: THREE.InstancedMesh | null = null;
    const bulbOn = new THREE.Color('#fff1b0'), bulbOff = new THREE.Color(dusk > 0.3 ? '#6f6650' : '#d9d2bb');
    if (bulbsAt.length) {
      bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), bulbsAt.length);
      const matrix = new THREE.Matrix4();
      bulbsAt.forEach((p, i) => { bulbs!.setMatrixAt(i, matrix.makeTranslation(p.x, p.y, p.z)); bulbs!.setColorAt(i, dead ? bulbOff : bulbOn); });
      bulbs.frustumCulled = false;
      root.add(bulbs);
    }
    const chaseSet = new Set(chase);
    const blink = mix(1.5, 9, mood.energy);
    const lightBulbs = (time: number) => {
      if (!bulbs || dead) return;
      const step = Math.floor(time * blink);
      for (let i = 0; i < bulbsAt.length; i++) {
        const on = chaseSet.has(i) ? (i + step) % 3 !== 0 : mood.wear < 0.5 || (i * 7 + Math.floor(time * 0.7)) % 9 !== 0;
        bulbs.setColorAt(i, on ? bulbOn : bulbOff);
      }
      if (bulbs.instanceColor) bulbs.instanceColor.needsUpdate = true;
    };
    lightBulbs(0);

    // ---- placing the cast ------------------------------------------------------------
    const stage = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      standIns.forEach((car, slot) => { car.visible = slot >= items.length; });
      stage(items);
      items.forEach((item, index) => {
        // Street scale: small things may grow to about the size of a car, never to the size of a building.
        const cap = Math.max(1, 2.6 / Math.max(item.height, 0.05)) * (item.hero ? 1.15 : 1);
        if (item.holder.scale.x > cap) item.holder.scale.setScalar(cap);
        if (index !== 3 && index !== 4) item.holder.rotation.y += angle * 0.7;
      });
    };

    const hum = mix(0.004, 0.03, mood.energy);
    world.update = (_dt, time) => {
      poseFlags(time);
      poseStrips(time);
      lightBulbs(time);
      // the buzz of the lot lights
      if (cones.length) lampGlass.emissiveIntensity = mix(0.1, 2.2, glow) * (1 - hum * 8 * (Math.sin(time * 47) > 0.92 ? 1 : 0));
    };
    return world;
  },
});
