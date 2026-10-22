import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

type Geo = 'ball' | 'banana' | 'root' | 'leaf';
interface Kind { geo: Geo; size: [number, number, number]; tones: [string, string, string]; crown?: string }
const K: Record<string, Kind> = {
  plantain: { geo: 'banana', size: [0.1, 0.1, 0.13], tones: ['#6f9a2e', '#e6c22e', '#33250f'] },
  banana: { geo: 'banana', size: [0.085, 0.085, 0.1], tones: ['#9fbf3a', '#f4d630', '#4a341a'] },
  yuca: { geo: 'root', size: [0.032, 0.26, 0.032], tones: ['#6a4630', '#6a4630', '#4d3526'] },
  carrot: { geo: 'root', size: [0.02, 0.17, 0.02], tones: ['#ee8a2e', '#e8742a', '#9a5a2a'] },
  scallion: { geo: 'root', size: [0.014, 0.3, 0.014], tones: ['#9fc86a', '#6fae4a', '#9a9a4a'] },
  mango: { geo: 'ball', size: [0.045, 0.045, 0.062], tones: ['#5d9a3a', '#f0902a', '#7a421a'] },
  redmango: { geo: 'ball', size: [0.048, 0.048, 0.064], tones: ['#7a9a3a', '#d9442a', '#6a2a1a'] },
  avocado: { geo: 'ball', size: [0.038, 0.038, 0.052], tones: ['#4f7f30', '#2d3d22', '#1b1912'] },
  lime: { geo: 'ball', size: [0.028, 0.028, 0.03], tones: ['#4f9e28', '#7fbf2a', '#a89a34'] },
  coconut: { geo: 'ball', size: [0.062, 0.062, 0.066], tones: ['#7a5a36', '#6b4a2c', '#4a3320'] },
  papaya: { geo: 'ball', size: [0.06, 0.058, 0.12], tones: ['#5f963a', '#f0a030', '#8f5220'] },
  pineapple: { geo: 'ball', size: [0.062, 0.085, 0.062], tones: ['#7a8a2a', '#d9a62a', '#7f5218'], crown: '#3f7a34' },
  orange: { geo: 'ball', size: [0.04, 0.04, 0.04], tones: ['#a9b83a', '#f28a1c', '#a0662a'] },
  mandarin: { geo: 'ball', size: [0.03, 0.026, 0.03], tones: ['#b9b83a', '#f5781a', '#9a5a22'] },
  lemon: { geo: 'ball', size: [0.032, 0.032, 0.042], tones: ['#b5c940', '#f4d92e', '#bfa23a'] },
  grapefruit: { geo: 'ball', size: [0.055, 0.052, 0.055], tones: ['#d8c84a', '#f2b05a', '#b07c3a'] },
  lettuce: { geo: 'leaf', size: [0.085, 0.07, 0.085], tones: ['#a6d472', '#6fae3c', '#8a8a3a'] },
  cabbage: { geo: 'ball', size: [0.085, 0.078, 0.085], tones: ['#c9e2a0', '#a3cf7a', '#9a9a5a'] },
  redcabbage: { geo: 'ball', size: [0.08, 0.075, 0.08], tones: ['#8a4a8a', '#6a2d6a', '#4a2a4a'] },
  collard: { geo: 'leaf', size: [0.075, 0.035, 0.15], tones: ['#4f8f3c', '#2f6a2c', '#6a6a2a'] },
  cilantro: { geo: 'leaf', size: [0.05, 0.03, 0.1], tones: ['#7fc04a', '#4f9a34', '#8a8a34'] },
  tomato: { geo: 'ball', size: [0.038, 0.034, 0.038], tones: ['#8fae3a', '#d9321f', '#7a1f18'] },
  apple: { geo: 'ball', size: [0.038, 0.037, 0.038], tones: ['#9fbf3a', '#c8242c', '#6a2a1c'] },
  potato: { geo: 'ball', size: [0.042, 0.034, 0.055], tones: ['#b8925e', '#b08a5a', '#7a6a4a'] },
  onion: { geo: 'ball', size: [0.04, 0.038, 0.04], tones: ['#d9a04a', '#c98a3a', '#8a6a3a'] },
  redonion: { geo: 'ball', size: [0.04, 0.038, 0.04], tones: ['#9a3a5a', '#8a2a4a', '#5a2a3a'] },
  garlic: { geo: 'ball', size: [0.026, 0.024, 0.026], tones: ['#f3eee0', '#efe8d8', '#c9c0a8'] },
};
const MIXES = {
  tropical: 'Plantains, yuca, mangoes, avocados, limes and coconuts: a Caribbean or Latin corner.',
  citrus: 'Oranges, lemons, limes and grapefruit, bright as traffic lights.',
  greens: 'Lettuces, collards, cabbages, scallions and herbs, all leaf and water.',
  mango: 'Mangoes above all, with papayas and pineapples: a tropical market stall.',
  roots: 'Potatoes, onions, garlic, carrots and yuca: cheap staples in earth colours.',
  mixed: 'A little of everything: apples, bananas, tomatoes, oranges, lettuce, potatoes.',
} as const;
const SLOTS: Record<keyof typeof MIXES, string[]> = {
  tropical: ['plantain', 'yuca', 'mango', 'avocado', 'lime', 'coconut', 'papaya', 'plantain'],
  citrus: ['orange', 'lemon', 'lime', 'grapefruit', 'orange', 'mandarin', 'lemon', 'orange'],
  greens: ['lettuce', 'collard', 'cabbage', 'scallion', 'cilantro', 'redcabbage', 'lettuce', 'collard'],
  mango: ['mango', 'redmango', 'papaya', 'pineapple', 'mango', 'coconut', 'lime', 'pineapple'],
  roots: ['potato', 'onion', 'redonion', 'garlic', 'carrot', 'potato', 'yuca', 'onion'],
  mixed: ['apple', 'banana', 'tomato', 'orange', 'lettuce', 'potato', 'lemon', 'avocado'],
};
const PRICES = {
  dollars: ['$1.99 LB', '3/$1', '2/$5', '99c EA', '4/$1', '$2.49 LB', '5/$2', '$1 EA'],
  pesos: ['$18 KG', '3x$10', '$25 PZA', '$12 KG', '2x$15', '$30 KG', '$8 PZA', '$22 KG'],
  neon: ['4/$1', 'SALE', '2/$3', 'FRESH', '99c', '5/$2', 'RIPE', '$1'],
};

export default defineThing({
  questions: {
    mix: choice('What produce is in the crates?', MIXES),
    ripeness: score('How ripe is it?', ['Hard and green, just off the truck', 'Turning', 'Perfectly ripe', 'Overripe, spotted and soft, drawing flies']),
    fill: score('How much is left in the crates?', ['A few stragglers rolling in empty crates', 'Picked over', 'Full', 'Heaped high for the morning']),
    prices: choice('What are the price signs like?', {
      dollars: 'Torn cardboard with black marker prices in dollars and cents.',
      pesos: 'Torn cardboard with prices per kilo in pesos.',
      neon: 'Fluorescent starburst cards shouting deals.',
      none: 'No prices at all: you ask.',
    }),
    risers: choice('What are the crates propped on?', {
      milk: 'Stacked plastic milk crates in mismatched colours.',
      pallets: 'Stacks of wooden pallets.',
      cinder: 'Grey cinder blocks with planks across them.',
    }),
    scale: noul('Is a hanging produce scale mounted over the display?'),
    flowers: choice('Are there buckets of cut flowers alongside?', {
      none: 'No flowers.',
      mixed: 'Buckets of mixed bouquets in every colour.',
      roses: 'Paper-wrapped red roses, a dozen at a time.',
      marigolds: 'Sunflowers and orange marigolds, bright and funereal.',
    }),
    state: choice('What is happening at the display?', {
      tidy: 'Set out neatly and open for business.',
      spilled: 'One crate has tipped and fruit is rolling across the pavement.',
      tarp: 'A blue tarp is pulled over half of it and weighted with bricks: closing up.',
      restock: 'Cartons of new stock wait beside it on a hand truck.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const lists: Record<Geo, { m: THREE.Matrix4; c: THREE.Color }[]> = { ball: [], banana: [], root: [], leaf: [] };
    const put = (geo: Geo, parent: THREE.Matrix4 | null, at: [number, number, number], turn: [number, number, number], size: [number, number, number], colour: THREE.Color) => {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn)), new THREE.Vector3(...size));
      if (parent) m.premultiply(parent);
      lists[geo].push({ m, c: colour });
    };
    const tone = (kind: Kind) => {
      const r = clamp01(a.ripeness + (random() - 0.5) * 0.3);
      const colour = new THREE.Color(kind.tones[0]);
      if (r < 0.62) colour.lerp(new THREE.Color(kind.tones[1]), r / 0.62);
      else colour.set(kind.tones[1]).lerp(new THREE.Color(kind.tones[2]), (r - 0.62) / 0.38 * 0.8);
      return colour.offsetHSL(0, 0, (random() - 0.5) * 0.06);
    };
    /** One piece of produce resting at a point, in the frame of `parent`. */
    const item = (kind: Kind, parent: THREE.Matrix4 | null, x: number, y: number, z: number) => {
      const [sx, sy, sz] = kind.size, j = mix(0.88, 1.12, random()) * 1.2, spin = random() * Math.PI * 2;
      const colour = tone(kind);
      if (kind.geo === 'banana') put('banana', parent, [x, y + 0.02, z], [Math.PI / 2, 0, spin], [sx * j, sz * j, sy * j * 1.3], colour);
      else if (kind.geo === 'root') put('root', parent, [x, y + sx, z], [0, spin * 0.25 - 0.4, Math.PI / 2], [sx * j, sy * j, sz * j], colour);
      else if (kind.crown) {
        put('ball', parent, [x, y + sy, z], [0, spin, 0], [sx * j, sy * j, sz * j], colour);
        put('leaf', parent, [x, y + sy * 2.2, z], [0, spin, 0], [sx * 0.55, sy * 0.75, sx * 0.55], new THREE.Color(kind.crown));
      } else put(kind.geo, parent, [x, y + sy * 0.9, z], [(random() - 0.5) * 0.5, spin, (random() - 0.5) * 0.5], [sx * j, sy * j, sz * j], colour);
    };

    const wood = [0, 1, 2].map((i) => s.material(new THREE.Color('#c9a56a').offsetHSL(0, -0.05 * i, -0.05 * i - mood.wear * 0.08)));
    const CW = 0.5, CD = 0.36, CH = 0.15;
    const crate = (frame: THREE.Group) => {
      const add = (size: [number, number, number], at: [number, number, number]) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), pick(wood));
        mesh.position.set(...at);
        mesh.castShadow = mesh.receiveShadow = true;
        frame.add(mesh);
      };
      add([CW, 0.012, CD], [0, 0.006, -CD / 2]);
      for (const z of [0, -CD]) for (const y of [0.04, 0.115]) add([CW, 0.055, 0.012], [0, y, z + (z ? 0.006 : -0.006)]);
      for (const x of [-1, 1]) add([0.014, CH, CD], [x * (CW / 2 - 0.007), CH / 2, -CD / 2]);
      s.root.add(frame);
      frame.updateMatrix();
      return frame.matrix.clone();
    };
    const fillCrate = (kind: Kind, frame: THREE.Matrix4, amount: number) => {
      const r = Math.max(kind.size[0], kind.geo === 'root' ? kind.size[1] * 0.3 : kind.size[2]) * (kind.geo === 'banana' ? 0.42 : 1.15);
      const spots: [number, number, number][] = [];
      for (let layer = 0; layer < 3; layer++) {
        const nx = Math.floor(0.45 / (r * 1.9)) - layer, nz = Math.floor(0.31 / (r * 1.9)) - layer;
        if (nx < 1 || nz < 1) break;
        for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++)
          spots.push([(i - (nx - 1) / 2) * r * 1.9 + (random() - 0.5) * r * 0.4, 0.014 + layer * (kind.geo === 'banana' ? 0.035 : kind.geo === 'root' ? kind.size[0] * 2 : kind.size[1] * 1.7), -CD / 2 + (k - (nz - 1) / 2) * r * 1.9 + (random() - 0.5) * r * 0.4]);
      }
      const wanted = Math.max(1, Math.round(spots.length * amount));
      const ground = spots.filter((spot) => spot[1] < 0.02);
      const chosen = wanted >= ground.length ? spots.slice(0, wanted) : ground.sort(() => random() - 0.5).slice(0, wanted);
      for (const [x, y, z] of chosen) item(kind, frame, x, y, z);
    };

    const sign = (text: string, at: [number, number, number]) => {
      const canvas = document.createElement('canvas');
      canvas.width = 160; canvas.height = 112;
      const g = canvas.getContext('2d')!;
      const neon = a.prices === 'neon';
      g.fillStyle = neon ? pick(['#f8f020', '#ff5aa8', '#6dff4a', '#ff9a1c']) : pick(['#c9a26a', '#bf9558', '#d3b07a']);
      g.beginPath();
      if (neon) for (let i = 0; i < 24; i++) { const r = i % 2 ? 0.98 : 0.74, t = i / 24 * Math.PI * 2; g.lineTo(80 + Math.cos(t) * 78 * r, 56 + Math.sin(t) * 54 * r); }
      else for (const [x, y] of [[4, 8], [150, 2], [156, 104], [8, 108]]) g.lineTo(x + (random() - 0.5) * 14, y + (random() - 0.5) * 12);
      g.closePath();
      g.fill();
      g.fillStyle = neon ? '#14141a' : '#17130f';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `bold ${Math.min(58, 190 / text.length * 1.35)}px monospace`;
      g.translate(80, 58);
      g.rotate((random() - 0.5) * 0.14);
      g.fillText(text, 0, 0, neon ? 104 : 136);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const card = s.mesh(new THREE.PlaneGeometry(0.3, 0.21), new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, emissive: neon ? '#ffffff' : '#000000', emissiveMap: neon ? texture : null, emissiveIntensity: neon ? 0.25 : 0 }), at);
      card.rotation.set(-0.2, (random() - 0.5) * 0.3, (random() - 0.5) * 0.2);
      s.rod([at[0], at[1] - 0.2, at[2] - 0.004], [at[0], at[1], at[2] - 0.006], 0.004, wood[2]);
    };

    // Risers and the two tiers of tilted crates.
    const lattice = document.createElement('canvas');
    lattice.width = lattice.height = 64;
    const lg = lattice.getContext('2d')!;
    lg.fillStyle = '#ffffff'; lg.fillRect(0, 0, 64, 64);
    lg.fillStyle = '#3a3a3a';
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) lg.fillRect(5 + i * 15, 12 + k * 15, 9, 10);
    lg.fillRect(18, 2, 28, 6);
    const latticeTexture = new THREE.CanvasTexture(lattice);
    latticeTexture.colorSpace = THREE.SRGBColorSpace;
    const milkColours = ['#c22a24', '#2a56b0', '#2f8f4a', '#26272b', '#e8782a', '#e8c52a'];
    const riser = (x: number, z: number, levels: number) => {
      for (let level = 0; level < levels; level++) {
        if (a.risers === 'milk') s.box([0.36, 0.29, 0.36], [x + (random() - 0.5) * 0.04, 0.15 + level * 0.3, z], new THREE.MeshStandardMaterial({ map: latticeTexture, color: pick(milkColours), roughness: 0.55 })).rotation.y = (random() - 0.5) * 0.25;
        else if (a.risers === 'pallets') for (let p = 0; p < 2; p++) {
          const y = level * 0.3 + p * 0.15;
          for (const sy of [0.02, 0.13]) s.box([0.54, 0.022, 0.42], [x, y + sy, z], pick(wood));
          for (const sx of [-0.22, 0, 0.22]) s.box([0.08, 0.09, 0.42], [x + sx, y + 0.075, z], wood[2]);
        } else {
          for (const sx of [-0.14, 0.14]) s.box([0.19, 0.28, 0.39], [x + sx, 0.14 + level * 0.3, z], s.material('#9a9b98', { roughness: 0.95 }));
          s.box([0.56, 0.02, 0.4], [x, 0.29 + level * 0.3, z], wood[1]);
        }
      }
    };
    const order = SLOTS[a.mix].slice().sort(() => random() - 0.5);
    const cols = 4, pitch = 0.57, prices = a.prices === 'none' ? [] : PRICES[a.prices];
    const spillCol = Math.floor(random() * cols), tarped = (col: number) => a.state === 'tarp' && col >= 2;
    order.forEach((name, index) => {
      const back = index >= cols, col = index % cols;
      const x = (col - (cols - 1) / 2) * pitch;
      const levels = back ? 2 : 1, tilt = back ? 0.42 : 0.3, zFront = back ? -0.06 : 0.44;
      riser(x, zFront - 0.2, levels);
      if (!back && a.state === 'spilled' && col === spillCol) return;
      const frame = new THREE.Group();
      frame.position.set(x, levels * 0.3 + 0.004, zFront);
      frame.rotation.set(tilt, (random() - 0.5) * 0.08, 0);
      const matrix = crate(frame);
      s.box([0.4, CD * Math.sin(tilt) * 0.8, 0.05], [x, levels * 0.3 + CD * Math.sin(tilt) * 0.4, zFront - CD * 0.82], wood[2]);
      if (tarped(col)) return;
      fillCrate(K[name], matrix, clamp01(mix(0.05, 1.1, a.fill ** 0.6) * mix(0.75, 1.15, random())));
      if (prices.length && random() < 0.85) sign(prices[(index + Math.floor(random() * 3)) % prices.length], [x + (random() - 0.5) * 0.2, levels * 0.3 + CD * Math.sin(tilt) + 0.27, zFront - CD * 0.93]);
    });
    const halfW = cols * pitch / 2;

    if (a.state === 'spilled') {
      const kind = K[order[spillCol]], x = (spillCol - (cols - 1) / 2) * pitch;
      const frame = new THREE.Group();
      frame.position.set(x + 0.05, 0.25, 0.86);
      frame.rotation.set(1.5, 0.25, 0);
      const matrix = crate(frame);
      for (let i = 0; i < 3; i++) item(kind, matrix, (random() - 0.5) * 0.3, 0.014, -0.06 - random() * 0.1);
      for (let i = 0; i < Math.round(mix(6, 16, a.fill)); i++) item(kind, null, x + (random() - 0.5) * 1.5, 0, 0.95 + random() * 0.9);
    }
    if (a.ripeness > 0.75 || mood.wear > 0.7) for (let i = 0; i < 5; i++) item(K[pick(order)], null, (random() - 0.5) * 2.2, 0, 0.6 + random() * 0.4);
    if (a.state === 'tarp') {
      const tarp = new THREE.MeshStandardMaterial({ color: '#2a63c4', roughness: 0.5, side: THREE.DoubleSide });
      const cx = pitch, w = pitch * 2 + 0.1;
      const p1 = new THREE.Vector3(cx, 0.98, -0.5), p2 = new THREE.Vector3(cx, 0.52, 0.5);
      const sheet = s.box([w, 0.012, p1.distanceTo(p2)], [cx, (p1.y + p2.y) / 2, 0], tarp);
      sheet.rotation.x = Math.atan2(p1.y - p2.y, p2.z - p1.z);
      s.box([w, 0.4, 0.012], [cx, 0.325, 0.51], tarp).rotation.x = -0.06;
      s.box([0.012, 0.6, 0.95], [cx + w / 2, 0.5, 0.0], tarp).rotation.x = 0.43;
      s.box([w, 0.5, 0.012], [cx, 0.74, -0.5], tarp);
      for (let i = 0; i < 3; i++) {
        const t = 0.2 + i * 0.3 + random() * 0.1, bx = cx + (random() - 0.5) * w * 0.7;
        const brick = s.box([0.2, 0.06, 0.095], [bx, mix(p1.y, p2.y, t) + 0.035, mix(p1.z, p2.z, t)], s.material('#9a4a34', { roughness: 0.95 }));
        brick.rotation.set(sheet.rotation.x, random() * 2, 0);
      }
    }
    if (a.state === 'restock') {
      const bx = halfW + 0.42, steel = s.material('#b3302a', { metalness: 0.4 }), card = s.material('#b88d54', { roughness: 0.9 });
      const stack = 2 + Math.floor(random() * 3);
      for (let i = 0; i < stack; i++) {
        s.box([0.46, 0.26, 0.34], [bx + (random() - 0.5) * 0.03, 0.2 + i * 0.265, 0.12], card).rotation.y = (random() - 0.5) * 0.1;
        s.label(pick(['PRODUCE', 'BANANAS', 'KEEP COOL', 'PRODUCT OF MEXICO']), 0.36, 0.09, [bx, 0.2 + i * 0.265, 0.293], '#3a5a2a', '#c79c62');
      }
      s.box([0.44, 0.015, 0.3], [bx, 0.06, 0.15], steel);
      for (const x of [-0.2, 0.2]) {
        s.rod([bx + x, 0.06, -0.07], [bx + x, 1.25, -0.2], 0.014, steel);
        s.cylinder(0.09, 0.09, 0.04, [bx + x * 1.15, 0.09, -0.1], s.material('#1c1c1e'), 16).rotation.z = Math.PI / 2;
      }
      s.rod([bx - 0.2, 1.25, -0.2], [bx + 0.2, 1.25, -0.2], 0.014, steel);
      s.rod([bx - 0.2, 0.7, -0.14], [bx + 0.2, 0.7, -0.14], 0.01, steel);
    }

    // Buckets of cut flowers at the left end.
    if (a.flowers !== 'none') {
      const blooms: { at: [number, number, number]; size: number; color: string }[] = [];
      const centres: { at: [number, number, number]; size: number; color: string }[] = [];
      const palette = { mixed: ['#e83a5a', '#f6c12a', '#f08ab8', '#ffffff', '#9a4ac8', '#f2742a'], roses: ['#c4162a', '#d92a3a', '#a8101f'], marigolds: ['#f28a12', '#f6a81c', '#f6d21c'] }[a.flowers];
      const buckets = Math.round(mix(2, 5, mood.density));
      for (let b = 0; b < buckets; b++) {
        const bx = -halfW - 0.24 - (b % 2) * 0.3 + (random() - 0.5) * 0.05, bz = 0.42 - Math.floor(b / 2) * 0.34 + (b % 2) * 0.12;
        s.cylinder(0.14, 0.11, 0.3, [bx, 0.15, bz], s.material(pick(['#26272b', '#8e9699', '#2f8f4a', '#f2f0ea']), { roughness: 0.5 }), 16);
        const bunches = 3 + Math.floor(random() * 3);
        for (let i = 0; i < bunches; i++) {
          const t = i / bunches * Math.PI * 2 + random(), lean = 0.09;
          const top: [number, number, number] = [bx + Math.cos(t) * lean, 0.62 + random() * 0.16, bz + Math.sin(t) * lean];
          if (a.flowers === 'roses') {
            const cone = s.mesh(new THREE.ConeGeometry(0.075, 0.36, 10, 1, true), s.material(pick(['#f4efe0', '#f6d5dc', '#cfe6d6']), { side: THREE.DoubleSide, roughness: 0.6 }), [(bx + top[0]) / 2, top[1] - 0.2, (bz + top[2]) / 2]);
            cone.rotation.set(Math.PI + Math.sin(t) * 0.25, 0, -Math.cos(t) * 0.25);
          } else s.rod([bx, 0.28, bz], [top[0], top[1] - 0.04, top[2]], 0.012, s.material('#3f7a34'));
          const sunflower = a.flowers === 'marigolds' && i % 2 === 0;
          const heads = sunflower ? 1 : 5;
          for (let h = 0; h < heads; h++) {
            const at: [number, number, number] = [top[0] + (random() - 0.5) * 0.09 * (heads > 1 ? 1 : 0), top[1] + (random() - 0.5) * 0.05, top[2] + (random() - 0.5) * 0.09 * (heads > 1 ? 1 : 0)];
            blooms.push({ at, size: sunflower ? 0.075 : 0.032 + random() * 0.012, color: sunflower ? '#f6c81c' : pick(palette) });
            if (sunflower) centres.push({ at: [at[0], at[1] + 0.012, at[2]], size: 0.036, color: '#4a2c14' });
          }
        }
      }
      const head = new THREE.SphereGeometry(1, 10, 6);
      head.scale(1, 0.55, 1);
      s.scatter(head, new THREE.MeshStandardMaterial({ roughness: 0.7 }), blooms);
      if (centres.length) s.scatter(head.clone(), new THREE.MeshStandardMaterial({ roughness: 0.9 }), centres);
    }

    // Hanging scale on a post at the back.
    const swing = new THREE.Group();
    if (a.scale) {
      const iron = s.material('#3a3d40', { metalness: 0.6, roughness: 0.5 });
      const px = halfW - 0.1, pz = -0.52, top = 2.05, reach = 0.55;
      s.rod([px, 0, pz], [px, top, pz], 0.022, iron);
      s.rod([px, top - 0.03, pz], [px, top - 0.03, pz + reach], 0.016, iron);
      s.rod([px, top - 0.4, pz], [px, top - 0.03, pz + reach * 0.7], 0.01, iron);
      const hung = new Sculpture(context);
      const brass = hung.material('#c9a23a', { metalness: 0.7, roughness: 0.35 });
      hung.rod([0, 0, 0], [0, -0.1, 0], 0.005, iron);
      hung.cylinder(0.11, 0.11, 0.06, [0, -0.21, 0], brass, 24).rotation.x = Math.PI / 2;
      const dial = document.createElement('canvas');
      dial.width = dial.height = 128;
      const d = dial.getContext('2d')!;
      d.fillStyle = '#f6f1df'; d.beginPath(); d.arc(64, 64, 62, 0, 7); d.fill();
      d.strokeStyle = '#1c1c1c'; d.lineWidth = 3;
      for (let i = 0; i < 20; i++) { const t = i / 20 * Math.PI * 2; d.beginPath(); d.moveTo(64 + Math.cos(t) * 50, 64 + Math.sin(t) * 50); d.lineTo(64 + Math.cos(t) * 60, 64 + Math.sin(t) * 60); d.stroke(); }
      const needle = random() * 5;
      d.strokeStyle = '#c4162a'; d.lineWidth = 5; d.beginPath(); d.moveTo(64, 64); d.lineTo(64 + Math.cos(needle) * 48, 64 + Math.sin(needle) * 48); d.stroke();
      const dialTexture = new THREE.CanvasTexture(dial);
      dialTexture.colorSpace = THREE.SRGBColorSpace;
      hung.mesh(new THREE.CircleGeometry(0.098, 24), new THREE.MeshStandardMaterial({ map: dialTexture, roughness: 0.6 }), [0, -0.21, 0.032]);
      for (let i = 0; i < 3; i++) { const t = i / 3 * Math.PI * 2 + 0.5; hung.rod([0, -0.32, 0], [Math.cos(t) * 0.15, -0.66, Math.sin(t) * 0.15], 0.003, iron); }
      hung.lathe([[0.001, -0.72], [0.1, -0.715], [0.16, -0.67], [0.165, -0.66]], new THREE.MeshStandardMaterial({ color: '#c3c9ca', metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }));
      const weighed = K[order[0]];
      if (a.fill > 0.2 && weighed.geo === 'ball') for (let i = 0; i < 3; i++) {
        const fruit = hung.ball(weighed.size, [(i - 1) * weighed.size[0] * 1.6, -0.71 + weighed.size[1], (random() - 0.5) * 0.06], new THREE.MeshStandardMaterial({ color: tone(weighed), roughness: 0.6 }), 12);
        fruit.rotation.y = random() * 3;
      }
      swing.add(hung.root);
      swing.position.set(px, top - 0.03, pz + reach);
      s.root.add(swing);
    }

    // Flies over the overripe.
    const flies = new THREE.Group();
    if (a.ripeness > 0.8) {
      const dots = Array.from({ length: 12 }, () => ({ at: [(random() - 0.5) * 1.6, random() * 0.35, (random() - 0.5) * 0.5] as [number, number, number], size: 0.009 }));
      const cloud = new Sculpture(context);
      cloud.scatter(new THREE.SphereGeometry(1, 5, 4), new THREE.MeshStandardMaterial({ color: '#111111' }), dots);
      flies.add(cloud.root);
      flies.position.set(0, 0.95, 0.1);
      s.root.add(flies);
    }

    const geometries: Record<Geo, THREE.BufferGeometry> = {
      ball: new THREE.SphereGeometry(1, 12, 9),
      banana: new THREE.TorusGeometry(1, 0.19, 6, 10, 1.7),
      root: new THREE.CylinderGeometry(0.35, 1, 1, 7),
      leaf: new THREE.IcosahedronGeometry(1, 0),
    };
    for (const geo of Object.keys(lists) as Geo[]) {
      const list = lists[geo];
      if (!list.length) { geometries[geo].dispose(); continue; }
      const mesh = new THREE.InstancedMesh(geometries[geo], new THREE.MeshStandardMaterial({ roughness: geo === 'leaf' ? 0.85 : 0.5, flatShading: geo === 'leaf' }), list.length);
      list.forEach((entry, index) => { mesh.setMatrixAt(index, entry.m); mesh.setColorAt(index, entry.c); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    const speed = mix(0.6, 2.6, mood.energy), reachSwing = mix(0.02, 0.16, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        swing.rotation.x = Math.sin(time * speed) * reachSwing;
        flies.rotation.y = time * speed * 0.8;
        flies.position.y = 0.95 + Math.sin(time * speed * 3) * 0.04;
      },
    });
  },
});
