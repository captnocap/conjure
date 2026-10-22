import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

const LIVERIES = {
  classic: 'White upperworks over a navy hull with a blue funnel band, the county ferry everyone grew up with.',
  steamer: 'Black hull, cream upperworks and a red funnel: an old steamship company that never changed.',
  modern: 'Bright yellow hull with white upperworks, a recent tender won by a big operator.',
  green: 'Dark green hull and pale grey upperworks, streaked and second-hand.',
  electric: 'Pale silver-grey all over with a lime stripe: the new battery ferry.',
} as const;
const LIVERY: Record<keyof typeof LIVERIES, { hull: string; upper: string; funnel: string; stripe: string }> = {
  classic: { hull: '#1f3557', upper: '#f1f0ea', funnel: '#2a5ea8', stripe: '#c8202f' },
  steamer: { hull: '#1b1b1d', upper: '#ecdfbf', funnel: '#b3261e', stripe: '#1b1b1d' },
  modern: { hull: '#e9b61c', upper: '#f6f6f2', funnel: '#1d2a44', stripe: '#1d2a44' },
  green: { hull: '#22493a', upper: '#c9cdc8', funnel: '#22493a', stripe: '#e3d9a8' },
  electric: { hull: '#b9c2c6', upper: '#e9edee', funnel: '#8fd130', stripe: '#8fd130' },
};
const NAMES = { fjordlys: 'FJORDLYS', heimferd: 'HEIMFERD', stord: 'M/F STORD', sognekongen: 'SOGNEKONGEN', last: 'SISTE FERJE' } as const;

/** A strip of cabin windows, some lit. */
function windows(count: number, lit: number, upper: string, random: () => number, glow: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = glow ? '#000000' : upper;
  ctx.fillRect(0, 0, 1024, 64);
  const pitch = 1024 / count;
  for (let i = 0; i < count; i++) {
    const on = random() < lit;
    ctx.fillStyle = glow ? (on ? '#ffd27a' : '#000000') : on ? '#ffe2a2' : '#26323b';
    ctx.beginPath();
    ctx.roundRect(i * pitch + pitch * 0.16, 12, pitch * 0.68, 40, 8);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    livery: choice('What colours does the ferry wear?', LIVERIES),
    ramp: choice('How is the forward ramp?', {
      raised: 'Raised and locked, like its twin at the stern: the ferry is under way.',
      lowering: 'Halfway down as the ferry noses in.',
      down: 'Flat down, the deck open to the road.',
    }),
    load: score('How full is the car deck?', ['Empty steel deck', 'A handful of cars', 'Half full', 'Packed bumper to bumper']),
    cargo: choice('What is it mostly carrying?', {
      cars: 'Ordinary family cars in every colour.',
      campers: 'Summer traffic: camper vans and a tour coach.',
      timber: 'A timber lorry stacked with logs among a few cars.',
      farm: 'A tractor with a livestock trailer, and pickups.',
      ambulance: 'An ambulance at the front of the queue with its blue lights turning.',
    }),
    aboard: choice('Who is aboard tonight?', {
      crowded: 'A full lounge: every window lit and warm.',
      some: 'A scatter of passengers, half the windows lit.',
      last: 'The last sailing: one or two lit windows and the wheelhouse.',
      dark: 'Nobody. Laid up, every window dark.',
    }),
    name: choice('What name is painted on her side?', {
      fjordlys: 'FJORDLYS, "fjord light".',
      heimferd: 'HEIMFERD, "the journey home".',
      stord: 'M/F STORD, plain and municipal.',
      sognekongen: 'SOGNEKONGEN, "king of the Sogn".',
      last: 'SISTE FERJE, "last ferry".',
    }),
    underway: noul('Is she under way, pushing a white bow wave across dark water?'),
    smoke: noul('Is exhaust trailing from the funnel?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const dusk = clamp01(Math.abs(mood.daylight - 0.5) * 2);
    const c = LIVERY[a.livery];
    const L = mix(37, 45, random()), B = 10.4, hullH = 2.5;
    const hull = s.material(c.hull, { roughness: 0.6 });
    const upper = s.material(c.upper, { roughness: 0.55 });
    const deckMat = s.material('#5d6b62', { roughness: 0.9 });
    const dark = s.material('#1b2126', { roughness: 0.5 });
    const steel = s.material('#8a9296', { metalness: 0.5, roughness: 0.5 });
    const stripe = s.material(c.stripe);

    // Hull: blunt at both ends, flared a little at the deck.
    const plan = (b: number, l: number, taper: number, nose: number) => {
      const p: [number, number][] = [[-b / 2, -l / 2 + taper], [-b / 2 * nose, -l / 2], [b / 2 * nose, -l / 2], [b / 2, -l / 2 + taper], [b / 2, l / 2 - taper], [b / 2 * nose, l / 2], [-b / 2 * nose, l / 2], [-b / 2, l / 2 - taper]];
      return new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x, y)));
    };
    const slab = (shape: THREE.Shape, height: number, y: number, material: THREE.Material) => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);
      return s.mesh(geometry, material, [0, y, 0]);
    };
    slab(plan(B * 0.94, L * 0.96, 5.5, 0.6), 1.5, 0, s.material(a.livery === 'electric' ? '#2c6a45' : '#7a2a22', { roughness: 0.8 }));
    slab(plan(B, L, 5, 0.68), hullH - 0.7, 0.7, hull);
    slab(plan(B * 1.01, L * 1.005, 5, 0.68), 0.18, hullH - 0.45, stripe);
    slab(plan(B * 0.985, L * 0.99, 5, 0.68), 0.06, hullH, deckMat);
    // Rust weeping from the scuppers.
    if (wear > 0.25) {
      const streaks: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < wear * 40; i++) {
        const side = random() < 0.5 ? -1 : 1;
        streaks.push({ at: [side * (B / 2 + 0.01), hullH - 0.5 - random() * 0.5, (random() - 0.5) * (L - 11)], size: 0.5 + random() * 0.9, color: random() < 0.7 ? '#8a4a22' : '#5c3418' });
      }
      s.scatter(new THREE.BoxGeometry(0.04, 1.3, 0.22), new THREE.MeshStandardMaterial({ roughness: 1 }), streaks);
    }
    // Lane markings.
    for (const x of [-3.1, 0, 3.1]) s.box([0.12, 0.02, L - 9], [x, hullH + 0.07, 0], s.material('#e9e3b8'));

    // Side houses with their rows of windows.
    const litShare = { crowded: 0.95, some: 0.5, last: 0.08, dark: 0 }[a.aboard];
    const glowPower = mix(0.7, 2.2, dusk);
    const houseL = L * 0.5, houseH = 4.6, houseW = 1.7;
    const band = (count: number, length: number, height: number, at: [number, number, number], turn: number, share = litShare) => {
      const seed = Math.floor(random() * 1e6);
      let state = seed;
      const local = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
      const map = windows(count, share, c.upper, local, false);
      state = seed;
      const emissiveMap = windows(count, share, c.upper, local, true);
      const mesh = s.mesh(new THREE.PlaneGeometry(length, height), new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: '#ffffff', emissiveIntensity: glowPower, roughness: 0.4 }), at);
      mesh.rotation.y = turn;
      return mesh;
    };
    for (const side of [-1, 1]) {
      const x = side * (B / 2 - houseW / 2 - 0.1);
      s.box([houseW, houseH, houseL], [x, hullH + houseH / 2, 0], upper);
      band(14, houseL * 0.92, 0.85, [x + side * (houseW / 2 + 0.01), hullH + 3.3, 0], side * Math.PI / 2);
      band(9, houseL * 0.7, 0.6, [x + side * (houseW / 2 + 0.01), hullH + 1.5, 0], side * Math.PI / 2, litShare * 0.4);
      // Bulwarks running on to the ends.
      for (const end of [-1, 1]) {
        const len = (L - houseL) / 2 - 3.2;
        s.box([0.18, 1.3, len], [side * (B / 2 - 0.2), hullH + 0.65, end * (houseL / 2 + len / 2)], hull);
      }
      const label = s.label(NAMES[a.name], 6.2, 0.75, [side * (B / 2 + 0.02), hullH - 1.05, 0], a.livery === 'modern' || a.livery === 'electric' ? '#1d2a44' : '#f1f0ea', c.hull);
      label.rotation.y = side * Math.PI / 2;
    }

    // The lounge bridging the car deck, and the wheelhouse on top.
    const loungeL = houseL * 0.82, loungeY = hullH + houseH;
    s.box([B - 0.1, 2.5, loungeL], [0, loungeY + 1.25, 0], upper);
    s.box([B + 0.5, 0.16, loungeL + 0.8], [0, loungeY + 0.02, 0], stripe);
    s.box([B + 0.3, 0.14, loungeL + 0.5], [0, loungeY + 2.55, 0], upper);
    for (const side of [-1, 1]) band(16, loungeL * 0.94, 1, [side * (B / 2 - 0.03), loungeY + 1.4, 0], side * Math.PI / 2);
    for (const end of [-1, 1]) band(9, B * 0.9, 1, [0, loungeY + 1.4, end * (loungeL / 2 + 0.01)], end > 0 ? 0 : Math.PI);
    // The dark tunnel of the car deck beneath.
    s.box([B - houseW * 2 - 0.3, 0.1, loungeL - 0.2], [0, loungeY - 0.1, 0], dark);
    const wy = loungeY + 2.6;
    s.box([5, 2.3, 4.2], [0, wy + 1.15, 0], upper);
    const bridgeLit = a.aboard === 'dark' ? 0 : 1;
    for (const end of [-1, 1]) band(5, 4.8, 0.95, [0, wy + 1.5, end * 2.11], end > 0 ? 0 : Math.PI, bridgeLit * 0.8);
    for (const side of [-1, 1]) band(4, 4, 0.95, [side * 2.51, wy + 1.5, 0], side * Math.PI / 2, bridgeLit * 0.8);
    s.box([8.6, 0.14, 2.2], [0, wy + 1.05, 0], upper); // bridge wings
    s.box([5.5, 0.16, 4.7], [0, wy + 2.35, 0], stripe);
    // Mast, radar, funnel.
    s.rod([0, wy + 2.4, 0], [0, wy + 5.2, 0], 0.09, steel, 0.05);
    s.box([1.5, 0.1, 0.1], [0, wy + 4.2, 0], steel);
    const radar = s.box([1.6, 0.12, 0.22], [0, wy + 3.2, 0.5], upper);
    s.rod([0, wy + 2.4, 0.5], [0, wy + 3.15, 0.5], 0.05, steel);
    for (const [x, colour] of [[-0.75, '#e23a2a'], [0.75, '#3ad06a']] as const) s.ball([0.09, 0.09, 0.09], [x, wy + 4.3, 0], s.material(colour, { emissive: colour, emissiveIntensity: 2 }), 8);
    const fz = -loungeL * 0.3;
    s.cylinder(0.75, 0.95, 3, [0, wy + 1.5, fz], s.material(c.funnel), 14).scale.z = 1.5;
    s.cylinder(0.78, 0.8, 0.5, [0, wy + 2.9, fz], dark, 14).scale.z = 1.5;
    // Lifeboat, rafts and rails.
    s.mesh(new THREE.CapsuleGeometry(0.55, 2.2, 6, 12), s.material('#e8622a'), [B / 2 - 1.3, wy + 0.55, loungeL * 0.28]).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) s.cylinder(0.3, 0.3, 0.9, [-B / 2 + 1.1, wy + 0.4, loungeL * 0.18 + i * 1.1], upper, 10).rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      s.box([0.05, 0.05, loungeL + 0.4], [side * (B / 2 + 0.1), wy + 0.95, 0], steel);
      for (let i = 0; i <= 8; i++) s.box([0.05, 0.9, 0.05], [side * (B / 2 + 0.1), wy + 0.5, -loungeL / 2 + (i / 8) * loungeL], steel);
      for (const z of [-loungeL * 0.3, loungeL * 0.3]) s.ring(0.28, 0.07, [side * (B / 2 + 0.16), wy + 0.55, z], s.material('#f0642a')).rotation.y = Math.PI / 2;
    }

    // Ramps: the forward one answers the question, the after one stays up.
    const rampAngle = { raised: mix(1.05, 1.2, random()), lowering: 0.45, down: -0.06 }[a.ramp];
    const rampW = B * 0.62, rampL = 5.2;
    for (const end of [1, -1]) {
      const angle = end > 0 ? rampAngle : 1.15;
      const pivot = new THREE.Group();
      pivot.position.set(0, hullH + 0.1, end * (L / 2 - 1.3));
      const plate = new THREE.Mesh(new THREE.BoxGeometry(rampW, 0.22, rampL), s.material('#4f5a55', { roughness: 0.8 }));
      plate.position.z = rampL / 2;
      pivot.add(plate);
      for (const side of [-1, 1]) {
        const curb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, rampL), s.material('#e8c21c'));
        curb.position.set(side * (rampW / 2 - 0.1), 0.3, rampL / 2);
        pivot.add(curb);
      }
      for (let i = 0; i < 7; i++) {
        const cleat = new THREE.Mesh(new THREE.BoxGeometry(rampW - 0.5, 0.06, 0.12), steel);
        cleat.position.set(0, 0.13, 0.5 + i * 0.7);
        pivot.add(cleat);
      }
      pivot.rotation.x = -angle;
      pivot.rotation.y = end > 0 ? 0 : Math.PI;
      pivot.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      s.root.add(pivot);
      // Ramp towers and the wires that hold it.
      for (const side of [-1, 1]) {
        const tx = side * (rampW / 2 + 0.55), tz = end * (L / 2 - 2.3);
        s.box([0.45, 4.2, 0.6], [tx, hullH + 2.1, tz], upper);
        const tipY = hullH + 0.1 + Math.sin(angle) * rampL * 0.85, tipZ = end * (L / 2 - 1.3 + Math.cos(angle) * rampL * 0.85);
        s.rod([tx, hullH + 4.1, tz], [side * (rampW / 2 - 0.1), tipY, tipZ], 0.03, steel);
      }
    }

    // Vehicles in two or three lanes.
    const paints = ['#b3261e', '#e9e7df', '#1d3a66', '#2e2f33', '#8d9499', '#3f7a4d', '#d9a21c', '#6b1f3a', '#c9d3d8'];
    const pick = () => paints[Math.floor(random() * paints.length)];
    const glass = s.material('#22303a', { roughness: 0.25 });
    const tyre = s.material('#15171a');
    const beacons: THREE.Mesh[] = [];
    const vehicle = (kind: string, x: number, z: number) => {
      const y = hullH + 0.08;
      const wheels = (len: number, w: number) => { for (const zz of [-len * 0.32, len * 0.32]) s.cylinder(0.33, 0.33, w + 0.1, [x, y + 0.33, z + zz], tyre, 10).rotation.z = Math.PI / 2; };
      if (kind === 'car') {
        const body = s.material(pick(), { roughness: 0.35, metalness: 0.3 });
        s.box([1.75, 0.6, 4.2], [x, y + 0.62, z], body);
        s.box([1.6, 0.5, 2.2], [x, y + 1.15, z - 0.2], glass);
        s.box([1.62, 0.06, 2.0], [x, y + 1.42, z - 0.2], body);
        wheels(4.2, 1.75);
        return 4.2;
      }
      if (kind === 'camper') {
        s.box([2.1, 2.2, 5.6], [x, y + 1.5, z - 0.4], s.material('#efeee6'));
        s.box([2.0, 1.2, 1.6], [x, y + 1.0, z + 3], s.material('#efeee6'));
        s.box([1.9, 0.6, 0.1], [x, y + 1.35, z + 3.8], glass);
        s.box([2.12, 0.25, 4], [x, y + 1.2, z - 0.4], s.material(['#c8643a', '#3a8fb5', '#6a9a4a'][Math.floor(random() * 3)]));
        wheels(6.6, 2.1);
        return 7;
      }
      if (kind === 'coach') {
        s.box([2.5, 2.9, 11], [x, y + 1.85, z], s.material(['#f0efe8', '#2a4f8a', '#b3261e'][Math.floor(random() * 3)]));
        s.box([2.52, 0.9, 10.2], [x, y + 2.4, z], glass);
        wheels(11, 2.5);
        return 11.5;
      }
      if (kind === 'lorry') {
        s.box([2.4, 2.5, 2.2], [x, y + 1.7, z + 5], s.material(pick()));
        s.box([2.3, 0.8, 0.1], [x, y + 2.3, z + 6.1], glass);
        s.box([2.4, 0.3, 9.5], [x, y + 0.85, z - 0.6], steel);
        const logs: { at: [number, number, number]; size: number; color: string }[] = [];
        for (let row = 0; row < 4; row++) for (let i = 0; i < 5 - (row % 2); i++) logs.push({ at: [x - 0.9 + i * 0.45 + (row % 2) * 0.22, y + 1.25 + row * 0.4, z - 0.8], size: 0.21, color: ['#b98a55', '#a3774a', '#c9a06a'][Math.floor(random() * 3)] });
        const log = new THREE.CylinderGeometry(1, 1, 40, 8);
        log.rotateX(Math.PI / 2);
        s.scatter(log, new THREE.MeshStandardMaterial({ roughness: 0.9 }), logs);
        for (const zz of [-4.5, 3]) for (const sx of [-1, 1]) s.box([0.1, 2, 0.1], [x + sx * 1.15, y + 1.9, z + zz], dark);
        wheels(11, 2.4);
        return 12.5;
      }
      if (kind === 'tractor') {
        const body = s.material(['#2f7a3a', '#c8202f', '#2a5ea8'][Math.floor(random() * 3)]);
        s.box([1.2, 1, 2.4], [x, y + 1.3, z + 3.6], body);
        s.box([1.5, 1.5, 1.5], [x, y + 2.2, z + 2.4], glass);
        for (const sx of [-1, 1]) s.cylinder(0.85, 0.85, 0.5, [x + sx * 0.95, y + 0.85, z + 2.4], tyre, 14).rotation.z = Math.PI / 2;
        for (const sx of [-1, 1]) s.cylinder(0.5, 0.5, 0.35, [x + sx * 0.8, y + 0.5, z + 4.4], tyre, 12).rotation.z = Math.PI / 2;
        s.box([2.2, 1.9, 5], [x, y + 1.6, z - 1.8], s.material('#9aa3a6', { metalness: 0.4 }));
        for (let i = 0; i < 5; i++) s.box([2.24, 0.12, 4.8], [x, y + 1.0 + i * 0.32, z - 1.8], dark);
        wheels(4, 2.2);
        return 9.5;
      }
      // Ambulance.
      s.box([2.1, 2.3, 5.8], [x, y + 1.55, z], s.material('#f2e23a'));
      s.box([2.12, 0.45, 5.8], [x, y + 1.3, z], s.material('#2f8a4a'));
      s.box([1.9, 0.7, 0.1], [x, y + 1.9, z + 2.92], glass);
      const blue = s.material('#3a7dff', { emissive: '#2a6dff', emissiveIntensity: 3 });
      for (const sx of [-1, 1]) beacons.push(s.box([0.5, 0.18, 0.3], [x + sx * 0.6, y + 2.8, z + 2.3], blue));
      wheels(5.8, 2.1);
      return 6.4;
    };
    const lanes = [-3.1 / 2 - 0.05, 3.1 / 2 + 0.05];
    const special = { cars: [] as string[], campers: ['coach', 'camper', 'camper'], timber: ['lorry'], farm: ['tractor'], ambulance: ['ambulance'] }[a.cargo];
    const deckSpan = L - 11;
    lanes.forEach((x, lane) => {
      let z = deckSpan / 2;
      const budget = deckSpan * clamp01(a.load * 1.05 + (lane === 0 && special.length ? 0.35 : 0));
      let used = 0, first = true;
      while (used < budget) {
        const kind = lane === 0 && first && special.length ? special[0] : lane === 1 && special.length > 1 && first ? special[1] : a.cargo === 'campers' && random() < 0.3 ? 'camper' : 'car';
        const need = { car: 4.2, camper: 7, coach: 11.5, lorry: 12.5, tractor: 9.5, ambulance: 6.4 }[kind]!;
        if (used + need > deckSpan) break;
        const centre = kind === 'lorry' ? -1.2 : kind === 'tractor' ? -1.3 : kind === 'camper' ? -0.6 : 0;
        vehicle(kind, x + (random() - 0.5) * 0.3, z - need / 2 + centre);
        const gap = 0.7 + random() * mix(2.5, 0.2, a.load);
        z -= need + gap;
        used += need + gap;
        first = false;
      }
    });

    // Water, bow wave and wake.
    const foam: THREE.Mesh[] = [];
    if (a.underway) {
      const water = s.cylinder(1, 1, 0.08, [0, 0.0, -3], s.material('#24414d', { roughness: 0.25, metalness: 0.2 }), 40);
      water.scale.set(B * 1.25, 1, L * 0.78);
      const white = s.material('#eef4f5', { roughness: 0.9 });
      const push = mix(0.6, 1.3, mood.energy);
      for (const side of [-1, 1])
        for (let i = 0; i < 7; i++) {
          const t = i / 6;
          foam.push(s.ball([0.9 * push * (1 - t * 0.5), 0.3 * push * (1 - t * 0.6), 2.2], [side * (B * 0.34 + t * B * 0.3), 0.08, L / 2 - 1 - t * 9], white, 10));
        }
      for (let i = 0; i < 8; i++) foam.push(s.ball([1.6 + random() * 1.4, 0.14, 1.6 + random()], [(random() - 0.5) * B * 0.7, 0.07, -L / 2 - 1 - i * 1.3], white, 10));
    }
    const puffs: THREE.Mesh[] = [];
    if (a.smoke) {
      for (let i = 0; i < 6; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: a.livery === 'electric' ? '#eef2f3' : '#5d5f62', transparent: true, opacity: 0.5 - i * 0.06, depthWrite: false, roughness: 1 }));
        puff.userData.phase = i / 6;
        s.root.add(puff);
        puffs.push(puff);
      }
    }
    const place = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.userData.phase + time * mix(0.03, 0.14, mood.energy)) % 1;
        puff.position.set(Math.sin(t * 9 + puff.userData.phase * 20) * 0.5, wy + 3.3 + t * 3.2, fz - t * mix(3, 9, mood.energy));
        puff.scale.setScalar(0.6 + t * 1.8);
      }
    };
    place(0);
    void radar;

    return s.finish({
      update: (dt, time) => {
        radar.rotation.y += dt * mix(0.8, 3, mood.energy);
        place(time);
        beacons.forEach((beacon, index) => { (beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(time * 9 + index * Math.PI) > 0 ? 4 : 0.3; });
        foam.forEach((blob, index) => { blob.position.y = 0.08 + Math.sin(time * 3 + index) * 0.04 * mood.energy; });
      },
    });
  },
});
