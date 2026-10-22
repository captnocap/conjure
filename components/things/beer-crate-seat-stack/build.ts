import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { drawGlyph } from './glyphs';

const BRANDS = {
  yellow: 'Sun-faded lager yellow with a red band.',
  red: 'Brick red with white lettering.',
  blue: 'Deep blue, a rival brewery.',
  green: 'Bottle green, for soda and mixers.',
  black: 'Black sake crates with a white character.',
  mixed: 'A jumble of every brewery that delivers here.',
} as const;
const BRAND: Record<Exclude<keyof typeof BRANDS, 'mixed'>, { body: string; band: string; ink: string; glyph: string }> = {
  yellow: { body: '#e3b62c', band: '#c8322a', ink: '#fbf6e2', glyph: '生' },
  red: { body: '#b8362c', band: '#f3ecd8', ink: '#b8362c', glyph: '大' },
  blue: { body: '#27478e', band: '#f3ecd8', ink: '#27478e', glyph: '天' },
  green: { body: '#2f7048', band: '#f0d040', ink: '#1f3a28', glyph: '山' },
  black: { body: '#26262a', band: '#26262a', ink: '#f3ecd8', glyph: '酒' },
};
type BrandKey = keyof typeof BRAND;

const W = 0.46, D = 0.34, H = 0.31;
function crateGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const add = (w: number, h: number, d: number, x: number, y: number, z: number) => parts.push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  add(W, 0.02, D, 0, 0.01, 0);
  for (const x of [-1, 1]) for (const z of [-1, 1]) add(0.035, H, 0.035, x * (W / 2 - 0.0175), H / 2, z * (D / 2 - 0.0175));
  for (const z of [-1, 1]) {
    add(W, 0.04, 0.02, 0, H - 0.02, z * (D / 2 - 0.01));
    add(W, 0.15, 0.016, 0, 0.095, z * (D / 2 - 0.008));
    for (const x of [-0.12, 0, 0.12]) add(0.02, H, 0.016, x, H / 2, z * (D / 2 - 0.008));
  }
  for (const x of [-1, 1]) {
    add(0.02, 0.04, D, x * (W / 2 - 0.01), H - 0.02, 0);
    add(0.016, 0.15, D, x * (W / 2 - 0.008), 0.095, 0);
    add(0.016, 0.03, D, x * (W / 2 - 0.008), 0.215, 0);
  }
  for (const z of [-D / 6, D / 6]) add(W - 0.04, 0.14, 0.006, 0, 0.09, z);
  for (const x of [-W / 4, 0, W / 4]) add(0.006, 0.14, D - 0.04, x, 0.09, 0);
  const merged = mergeGeometries(parts)!;
  for (const part of parts) part.dispose();
  return merged;
}

export default defineThing({
  questions: {
    height: score('How high is the stack?', ['A single crate', 'Two or three', 'Chest high', 'A leaning tower taller than a person']),
    brand: choice('What colour are the crates?', BRANDS),
    load: choice('What is in the stacked crates?', {
      empties: 'Empty brown bottles waiting for the brewery truck.',
      bare: 'Nothing: bare crates.',
      mixed: 'Some full of empties, some bare.',
    }),
    order: choice('How are they stacked?', {
      neat: 'Squared up neatly against the wall.',
      staggered: 'Twisted and overhanging, stacked in a hurry.',
      toppled: 'The top one has fallen and spilled bottles on the ground.',
    }),
    seats: choice('How many crates are turned over as seats?', {
      one: 'One: a break taken alone.',
      two: 'Two, angled toward each other for a shared smoke.',
      three: 'Three around a crate that serves as a table.',
    }),
    left: choice('What was left on the seat?', {
      ashtray: 'An ashtray tin full of butts and an empty beer glass.',
      bottle: 'A half-finished bottle of beer, its cap beside it.',
      paper: 'A folded sports newspaper and a pack of cigarettes.',
      phone: 'A phone lying face up, still glowing, and a lighter: back in a minute.',
      cardboard: 'Only a flattened square of cardboard for a cushion.',
      apron: 'A folded white apron and a pair of kitchen clogs on the ground: the shift is over.',
    }),
    smoke: noul('Is a cigarette still burning there?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const geometry = crateGeometry();
    const keys = Object.keys(BRAND) as BrandKey[];
    const plastic = new Map<BrandKey, THREE.Material>();
    const labels = new Map<BrandKey, THREE.Material>();
    const pick = (): BrandKey => (a.brand === 'mixed' ? keys[Math.floor(random() * keys.length)] : a.brand);
    const bodyOf = (key: BrandKey) => {
      if (!plastic.has(key)) plastic.set(key, s.material(new THREE.Color(BRAND[key].body).lerp(new THREE.Color('#d8cfb8'), mood.wear * 0.1), { roughness: 0.55 }));
      return plastic.get(key)!;
    };
    const labelOf = (key: BrandKey) => {
      if (!labels.has(key)) {
        const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 96;
        const g = canvas.getContext('2d')!; const brand = BRAND[key];
        g.fillStyle = brand.band; g.fillRect(0, 0, 256, 96);
        if (key === 'yellow') { g.fillStyle = brand.ink; g.beginPath(); g.ellipse(128, 48, 62, 38, 0, 0, Math.PI * 2); g.fill(); drawGlyph(g, brand.glyph, 100, 20, 56, brand.band, 0.14); }
        else { drawGlyph(g, brand.glyph, 96, 14, 66, brand.ink, 0.14); g.fillStyle = brand.ink; g.fillRect(14, 20, 56, 8); g.fillRect(14, 68, 56, 8); g.fillRect(186, 20, 56, 8); g.fillRect(186, 68, 56, 8); }
        for (let i = 0; i < mood.wear * 12; i++) { g.fillStyle = `rgba(200,190,170,${0.2 + random() * 0.4})`; g.fillRect(random() * 256, random() * 96, 6 + random() * 30, 2 + random() * 5); }
        const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
        labels.set(key, new THREE.MeshStandardMaterial({ map, roughness: 0.7 }));
      }
      return labels.get(key)!;
    };
    const bottles: THREE.Matrix4[] = [];
    const upright = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);

    /** One crate as a group with its origin at the centre of its base. */
    const crate = (key: BrandKey, full: boolean) => {
      const group = new THREE.Group();
      const shell = new THREE.Mesh(geometry, bodyOf(key));
      shell.castShadow = shell.receiveShadow = true;
      group.add(shell);
      for (const side of [-1, 1]) {
        const label = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.62, 0.11), labelOf(key));
        label.position.set(0, 0.095, side * (D / 2 + 0.001));
        if (side < 0) label.rotation.y = Math.PI;
        group.add(label);
      }
      group.userData.full = full;
      return group;
    };
    const fill = (group: THREE.Group, chance: number) => {
      group.updateMatrixWorld(true);
      for (let i = 0; i < 12; i++) {
        if (random() > chance) continue;
        const local = new THREE.Matrix4().compose(new THREE.Vector3(-W * 3 / 8 + (i % 4) * W / 4, 0.02, -D / 3 + Math.floor(i / 4) * D / 3), upright, one);
        bottles.push(local.premultiply(group.matrixWorld));
      }
    };

    // The stack: one or two columns against the back.
    const total = 1 + Math.round(a.height * 8);
    const columns = total > 6 ? 2 : 1;
    const mess = a.order === 'neat' ? 0.02 : mix(0.12, 0.3, mood.wear * 0.5 + mood.energy * 0.5);
    let placed = 0, topOfMain = 0;
    const tops: THREE.Group[] = [];
    for (let column = 0; column < columns; column++) {
      const inColumn = column === 0 ? Math.min(total, 6) : total - 6;
      const cx = column === 0 ? (columns > 1 ? -W * 0.54 : 0) : W * 0.54;
      let driftX = 0, driftZ = 0;
      for (let level = 0; level < inColumn; level++, placed++) {
        const toppled = a.order === 'toppled' && column === 0 && level === inColumn - 1 && inColumn > 1;
        const full = a.load === 'empties' || (a.load === 'mixed' && random() > 0.5);
        const group = crate(pick(), full);
        if (toppled) {
          group.rotation.set(Math.PI / 2 + 0.05, 0, 0.4 + random() * 0.5);
          group.position.set(cx + W * 0.9 + random() * 0.2, D / 2, 0.55 + random() * 0.2);
          s.root.add(group);
          const glass = s.material('#5a3a1c', { roughness: 0.25 });
          for (let i = 0; i < 5; i++) { const lying = s.cylinder(0.034, 0.034, 0.22, [group.position.x - 0.2 + random() * 0.5, 0.034, group.position.z + 0.25 + random() * 0.4], glass, 10); lying.rotation.set(Math.PI / 2, 0, random() * 3); }
          continue;
        }
        driftX += (random() - 0.5) * mess * 0.35; driftZ += (random() - 0.5) * mess * 0.25;
        group.position.set(cx + driftX, level * (H + 0.004), driftZ);
        group.rotation.y = (random() - 0.5) * mess * 2.2;
        s.root.add(group);
        if (full) fill(group, level === inColumn - 1 || (a.order === 'toppled' && level === inColumn - 2) ? mix(0.5, 1, random()) : 0.85);
        if (level === inColumn - 1 || (a.order === 'toppled' && column === 0 && level === inColumn - 2)) tops.push(group);
        if (column === 0) topOfMain = (level + 1) * H;
      }
    }

    // Seats in front: upturned crates.
    const seatCount = { one: 1, two: 2, three: 3 }[a.seats];
    const seatSpots: [number, number, number][] = seatCount === 1 ? [[0.3, 0.72, 0.3]] : seatCount === 2 ? [[-0.42, 0.75, 0.5], [0.45, 0.8, -0.45]] : [[-0.62, 0.95, 0.7], [0.62, 0.95, -0.7], [0, 1.45, 0]];
    const seatTops: THREE.Vector3[] = [];
    for (const [x, z, turn] of seatSpots) {
      const seat = crate(pick(), false);
      seat.rotation.set(Math.PI, turn + (random() - 0.5) * 0.3, 0);
      seat.position.set(x, H, z);
      s.root.add(seat);
      seatTops.push(new THREE.Vector3(x, H, z));
    }
    let table = seatTops[0];
    if (seatCount === 3) {
      const base = crate(pick(), false);
      base.position.set(0, 0, 0.92); base.rotation.y = 0.2;
      s.root.add(base);
      s.box([0.62, 0.02, 0.5], [0, H + 0.012, 0.92], s.material('#b89466', { roughness: 0.85 })).rotation.y = 0.2;
      table = new THREE.Vector3(0, H + 0.024, 0.92);
    }

    // What was left on the seat (or the table).
    const { x: tx, y: ty, z: tz } = table;
    const tin = s.material('#c9ced0', { metalness: 0.8, roughness: 0.35 });
    let ember: THREE.Vector3 | null = null;
    if (a.left === 'ashtray') {
      s.lathe([[0, 0.004], [0.055, 0.004], [0.06, 0], [0.062, 0.035], [0.055, 0.035], [0.052, 0.01], [0, 0.01]], tin, [tx - 0.1, ty, tz + 0.02]);
      const butts = 4 + Math.floor(random() * 5 + mood.wear * 6);
      for (let i = 0; i < butts; i++) { const butt = s.cylinder(0.0045, 0.0045, 0.03, [tx - 0.1 + (random() - 0.5) * 0.07, ty + 0.018 + random() * 0.012, tz + 0.02 + (random() - 0.5) * 0.07], s.material(random() > 0.5 ? '#e8a05a' : '#f4f1e6'), 6); butt.rotation.set(random() * 3, 0, 1.2 + random() * 0.6); }
      s.cylinder(0.034, 0.028, 0.11, [tx + 0.1, ty + 0.055, tz - 0.03], new THREE.MeshStandardMaterial({ color: '#eef6f8', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }), 16);
      s.ring(0.034, 0.003, [tx + 0.1, ty + 0.11, tz - 0.03], s.material('#f4f8f8', { roughness: 0.1 })).rotation.x = Math.PI / 2;
      s.cylinder(0.028, 0.027, 0.012, [tx + 0.1, ty + 0.007, tz - 0.03], s.material('#f1e6c2'), 14);
      ember = new THREE.Vector3(tx - 0.045, ty + 0.04, tz + 0.02);
    } else if (a.left === 'bottle') {
      const glass = s.material('#5a3a1c', { roughness: 0.2 });
      s.lathe([[0, 0], [0.034, 0], [0.036, 0.01], [0.036, 0.15], [0.014, 0.22], [0.013, 0.28], [0.016, 0.285], [0, 0.285]], glass, [tx - 0.06, ty, tz]);
      s.label('BEER', 0.06, 0.05, [tx - 0.06, ty + 0.09, tz + 0.037], '#b8362c', '#f3ecd8');
      s.cylinder(0.014, 0.014, 0.006, [tx + 0.07, ty + 0.003, tz + 0.06], s.material('#d8a52e', { metalness: 0.7 }), 12);
      s.cylinder(0.034, 0.028, 0.11, [tx + 0.1, ty + 0.055, tz - 0.06], new THREE.MeshStandardMaterial({ color: '#eef6f8', transparent: true, opacity: 0.3, depthWrite: false }), 16);
      s.cylinder(0.03, 0.027, 0.05, [tx + 0.1, ty + 0.027, tz - 0.06], s.material('#d89a2a', { roughness: 0.2, emissive: '#7a4a08', emissiveIntensity: 0.3 }), 14);
      s.cylinder(0.031, 0.03, 0.012, [tx + 0.1, ty + 0.058, tz - 0.06], s.material('#fbf6e2'), 14);
    } else if (a.left === 'paper') {
      const front = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 176; const g = c.getContext('2d')!; g.fillStyle = '#e9e4d2'; g.fillRect(0, 0, 128, 176); g.fillStyle = '#c8261e'; g.fillRect(8, 8, 112, 34); drawGlyph(g, '大', 12, 10, 30, '#fbf6e2', 0.16); drawGlyph(g, '中', 48, 10, 30, '#fbf6e2', 0.16); g.fillStyle = '#6a6a66'; g.fillRect(8, 50, 60, 50); g.fillStyle = '#3a3a3a'; for (let i = 0; i < 16; i++) g.fillRect(74 + (i % 4) * 12, 50 + Math.floor(i / 4) * 13, 3, 10); for (let i = 0; i < 9; i++) g.fillRect(8, 108 + i * 7, 112 - random() * 30, 3); const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; return map; })();
      const paper = s.box([0.24, 0.022, 0.32], [tx - 0.04, ty + 0.011, tz], [s.material('#e9e4d2'), s.material('#e9e4d2'), new THREE.MeshStandardMaterial({ map: front, roughness: 0.9 }), s.material('#e9e4d2'), s.material('#e9e4d2'), s.material('#e9e4d2')] as unknown as THREE.Material);
      paper.rotation.y = (random() - 0.5) * 0.6;
      s.box([0.056, 0.022, 0.088], [tx + 0.14, ty + 0.011, tz + 0.06], s.material(random() > 0.5 ? '#f3f1ea' : '#1f4f9a')).rotation.y = random();
      ember = new THREE.Vector3(tx + 0.17, ty + 0.01, tz - 0.1);
    } else if (a.left === 'phone') {
      const phone = s.box([0.075, 0.009, 0.155], [tx - 0.02, ty + 0.0045, tz], s.material('#16171a', { roughness: 0.25 }));
      phone.rotation.y = (random() - 0.5) * 0.8;
      const screen = s.box([0.066, 0.002, 0.143], [tx - 0.02, ty + 0.0095, tz], new THREE.MeshStandardMaterial({ color: '#bfe0ff', emissive: '#9fd0ff', emissiveIntensity: mix(0.7, 1.4, mood.cheer) }));
      screen.rotation.y = phone.rotation.y;
      s.box([0.024, 0.014, 0.075], [tx + 0.12, ty + 0.007, tz + 0.05], s.material(['#e0362c', '#2fae62', '#f2c62e'][Math.floor(random() * 3)])).rotation.y = random() * 2;
      ember = new THREE.Vector3(tx + 0.19, ty + 0.01, tz - 0.08);
    } else if (a.left === 'cardboard') {
      s.box([0.44, 0.012, 0.33], [tx, ty + 0.006, tz], s.material('#b8926a', { roughness: 0.95 })).rotation.y = seatSpots[0][2] + 0.08;
    } else {
      s.box([0.3, 0.035, 0.22], [tx, ty + 0.018, tz], s.material('#f1efe6', { roughness: 0.9 })).rotation.y = seatSpots[0][2];
      s.box([0.3, 0.012, 0.03], [tx, ty + 0.04, tz + 0.03], s.material('#dcd8cb')).rotation.y = seatSpots[0][2];
      for (const side of [-1, 1]) { s.ball([0.05, 0.035, 0.12], [seatTops[0].x + 0.38 + side * 0.07, 0.035, seatTops[0].z + 0.25], s.material('#f3f1ea', { roughness: 0.4 }), 12); s.ball([0.047, 0.03, 0.06], [seatTops[0].x + 0.38 + side * 0.07, 0.05, seatTops[0].z + 0.3], s.material('#e6e3d8', { roughness: 0.4 }), 10); }
    }
    if (a.smoke && !ember) ember = new THREE.Vector3(tx + 0.19, ty + 0.01, tz + 0.1);

    // A cigarette and its wisp.
    const wisps: THREE.Mesh[] = [];
    if (a.smoke && ember) {
      const cigarette = s.cylinder(0.004, 0.004, 0.07, [ember.x, ember.y, ember.z], s.material('#f6f4ec'), 6);
      cigarette.rotation.z = Math.PI / 2 - 0.15;
      s.ball([0.005, 0.005, 0.005], [ember.x + 0.036, ember.y + 0.006, ember.z], new THREE.MeshStandardMaterial({ color: '#ff5a1e', emissive: '#ff4a10', emissiveIntensity: 2 }), 6);
      const haze = new THREE.MeshStandardMaterial({ color: '#dfe3e6', transparent: true, opacity: 0.16, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 9; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), haze);
        puff.userData = { base: ember.clone().add(new THREE.Vector3(0.036, 0.01, 0)), phase: i / 9, drift: random() * 6 };
        s.root.add(puff); wisps.push(puff);
      }
    }
    const placeWisps = (time: number) => {
      for (const puff of wisps) {
        const { base, phase, drift } = puff.userData as { base: THREE.Vector3; phase: number; drift: number };
        const t = (phase + time * mix(0.05, 0.22, mood.energy)) % 1;
        puff.position.set(base.x + Math.sin(t * 7 + drift) * 0.05 * t, base.y + t * 0.75, base.z + Math.cos(t * 5 + drift) * 0.04 * t);
        puff.scale.setScalar(0.012 + t * 0.07);
      }
    };
    placeWisps(0);

    // Things on top of the stack and around its foot.
    if (mood.density > 0.35 && tops.length) {
      const top = tops[0];
      if (!top.userData.full) s.box([0.34, 0.2, 0.26], [top.position.x, top.position.y + H + 0.1, top.position.z], s.material('#b8926a', { roughness: 0.95 })).rotation.y = random() * 0.4;
    }
    void topOfMain;
    const litter = Math.floor(mood.wear * 9 + mood.density * 5);
    for (let i = 0; i < litter; i++) {
      const lx = (random() - 0.5) * 1.6, lz = 0.3 + random() * 1.0;
      if (random() > 0.4) { const butt = s.cylinder(0.004, 0.004, 0.028, [lx, 0.004, lz], s.material(random() > 0.5 ? '#e8a05a' : '#efeadc'), 6); butt.rotation.set(Math.PI / 2, 0, random() * 3); }
      else s.cylinder(0.014, 0.014, 0.005, [lx, 0.0025, lz], s.material('#d8a52e', { metalness: 0.7 }), 10);
    }

    if (bottles.length) {
      const bottle = new THREE.LatheGeometry([[0, 0], [0.034, 0], [0.036, 0.01], [0.036, 0.15], [0.014, 0.22], [0.013, 0.28], [0.017, 0.285], [0, 0.285]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
      const all = new THREE.InstancedMesh(bottle, s.material('#5a3a1c', { roughness: 0.22 }), bottles.length);
      bottles.forEach((matrix, index) => all.setMatrixAt(index, matrix));
      all.castShadow = true;
      s.root.add(all);
    }

    return s.finish({ update: (_dt, time) => placeWisps(time) });
  },
});
