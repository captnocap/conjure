import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type V3 = [number, number, number];
type Bit = { p: V3; s: V3; r?: V3; c?: THREE.ColorRepresentation };

function bits(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: readonly Bit[]) {
  if (!list.length) { geometry.dispose(); material.dispose(); return null; }
  const mesh = new THREE.InstancedMesh(geometry, material, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
  const v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  list.forEach((b, i) => {
    e.set(...(b.r ?? [0, 0, 0]), 'YXZ');
    m.compose(v.set(...b.p), q.setFromEuler(e), sc.set(...b.s));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.set(b.c ?? '#ffffff'));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Radius of the ring, deck to axis. The deck is the inside of a wheel, so "up" leans inward as you walk along it. */
const RR = 17;

export default defineWorld({
  questions: {
    crop: choice('What grows on the planting terraces?', {
      vegetables: 'Mixed kitchen rows: lettuces, cabbages, staked tomatoes.',
      grain: 'Dense golden grain standing in even blocks.',
      rice: 'Flooded rice paddies, green shoots in still mirrored water.',
      orchard: 'Small orchard trees in blossom or fruit.',
      meadow: 'A wildflower meadow someone decided to allow.',
      fallow: 'Bare furrowed soil resting between plantings.',
    }),
    state: choice('What state is the garden in this morning?', {
      thriving: 'Thriving and tended, every bed full.',
      seedlings: 'Newly replanted: rows of tiny seedlings in dark fresh soil.',
      harvest: 'Mid-harvest: half the rows cut to stubble, crates stacked along the path.',
      blight: 'Blighted: brown patches and pulled gaps spreading through the beds.',
      overgrown: 'Left to itself: overgrown beds, vines up the ribs, weeds through the deck.',
      festival: 'Dressed for a festival: bunting and paper lanterns strung under the sun.',
    }),
    window: choice('What does the long window show?', {
      stars: 'A slow field of stars.',
      planet: 'A planet passing, close enough to show its bands.',
      nebula: 'Drifts of coloured gas, rose and teal.',
      destination: 'One star brighter than all the rest, the destination, ringed with a faint halo.',
      shuttered: 'Mostly steel: storm shutters closed over all but a few bays.',
    }),
    sun: choice('What condition is the strip-sun in?', {
      whole: 'Every segment burning evenly.',
      gap: 'One segment dead and sagging, leaving a band of shade on the beds.',
      patchwork: 'A patchwork: segments replaced over the centuries, no two quite the same colour.',
      failing: 'Mostly dark, a couple of segments left and amber emergency strips on the wall.',
    }),
    deck: choice('What is the deck surface?', {
      plate: 'Pale riveted steel plate.',
      timber: 'A worn timber boardwalk laid over the plating.',
      moss: 'Plating softened by moss and tufts of grass.',
      tile: 'Cream ceramic tile with painted yellow lane lines.',
    }),
    wall: choice('What have the generations put on the wall above the window?', {
      mural: 'A long faded mural of hills, a river and a yellow sun nobody here has seen.',
      numbers: 'Only stencilled deck numbers.',
      hands: 'A band of children\'s painted handprints in every colour.',
      plaques: 'A row of small brass memorial plaques.',
      tally: 'A painted count of voyage years, repainted each generation.',
      roses: 'Climbing roses trained along wires.',
    }),
    left: choice('What have the gardeners left out?', {
      nothing: 'Nothing; everything is put away.',
      barrow: 'A wheelbarrow, a spade and a watering can.',
      laundry: 'A washing line of work clothes.',
      picnic: 'A picnic blanket and a basket.',
      ladder: 'A stepladder and toolbox under the sun.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => mix(lo, hi, random());
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const lift = (x: number) => RR - Math.sqrt(RR * RR - x * x);
    const slotAt = (x: number, z: number, size = 1) => [x, z, lift(x), size] as const;
    const slots = [slotAt(0, 1.7), slotAt(-3.7, 0.5), slotAt(3.7, 0.5), slotAt(-2.3, 3.6, 0.8), slotAt(2.3, 3.6, 0.8), slotAt(-6.6, 1.9, 0.8), slotAt(6.6, 1.9, 0.8)];

    const d = mood.daylight;
    const sunHue = new THREE.Color('#ffb59a').lerp(new THREE.Color('#fff2cc'), Math.sin(d * Math.PI));
    if (d > 0.5) sunHue.lerp(new THREE.Color('#ff9a4a'), (d - 0.5) * 1.4);
    sunHue.lerp(new THREE.Color().setHSL(mix(0.58, 0.08, mood.warmth), 0.8, 0.75), 0.2);
    const bg = new THREE.Color('#ecdcd4').lerp(new THREE.Color('#e3e9e1'), Math.sin(d * Math.PI)).lerp(new THREE.Color('#e8d3bd'), Math.max(0, d - 0.6));

    const { art: s, world } = diorama(context, { background: `#${bg.getHexString()}`, floor: null, width: 16.5, depth: 10.4, maxHeight: 3.0, radius: 1.4, pitch: 30, yaw: 27, slots });
    if (world.keyLight) world.keyLight.color.lerp(sunHue, 0.6);

    const pm = 0.5;
    const at = (phi: number, h: number, z: number): V3 => [(RR - h) * Math.sin(phi), RR - (RR - h) * Math.cos(phi), z];
    const sector = (h0: number, h1: number, p0: number, p1: number, z0: number, z1: number, mat: THREE.Material, hole?: [number, number, number, number]) => {
      // An arc of the ring between heights h0 (lower) and h1 (upper) above the deck.
      const shape = new THREE.Shape();
      shape.absarc(0, RR, RR - h0, -Math.PI / 2 + p0, -Math.PI / 2 + p1, false);
      shape.absarc(0, RR, RR - h1, -Math.PI / 2 + p1, -Math.PI / 2 + p0, true);
      shape.closePath();
      if (hole) {
        const path = new THREE.Path();
        path.absarc(0, RR, RR - hole[0], -Math.PI / 2 + hole[2], -Math.PI / 2 + hole[3], false);
        path.absarc(0, RR, RR - hole[1], -Math.PI / 2 + hole[3], -Math.PI / 2 + hole[2], true);
        path.closePath();
        shape.holes.push(path);
      }
      return s.mesh(new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 28 }), mat, [0, 0, z0]);
    };
    const slab = (size: V3, phi: number, h: number, z: number, mat: THREE.Material) => { const m = s.box(size, at(phi, h, z), mat); m.rotation.z = phi; return m; };

    const steel = s.material('#8f9a9b', { metalness: 0.6, roughness: 0.45 });
    const dark = s.material('#353c40', { roughness: 0.7 });
    const hull = s.material('#dcdfd6', { roughness: 0.7 });
    const concrete = s.material('#bdb9aa', { roughness: 0.9 });
    const soilHex = a.state === 'seedlings' ? '#3d2c20' : '#5d4632';
    const soil = s.material(soilHex, { roughness: 1 });

    // Deck.
    const deckHex = { plate: '#b9beb6', timber: '#a98a5f', moss: '#a9b3a2', tile: '#ddd8c6' }[a.deck];
    const deck = sector(-0.5, 0, -pm - 0.02, pm + 0.02, -5.3, 5.1, s.material(deckHex, { roughness: 0.85, metalness: a.deck === 'plate' ? 0.3 : 0 }));
    world.ground = deck;
    const seams: Bit[] = [];
    if (a.deck === 'timber') for (let k = 0; k < 56; k++) { const phi = -pm + (k + 0.5) * (2 * pm / 56); seams.push({ p: at(phi, 0.012, 1.7), s: [2 * pm * RR / 56 - 0.03, 0.03, 6.7], r: [0, 0, phi], c: pick(['#b08f62', '#9f8158', '#b99a6e', '#a68a5c', '#8f7450']) }); }
    else for (let k = 0; k <= 14; k++) { const phi = -pm + k * (2 * pm / 14); seams.push({ p: at(phi, 0.004, 1.7), s: [a.deck === 'tile' ? 0.025 : 0.05, 0.012, 6.7], r: [0, 0, phi], c: a.deck === 'tile' ? '#b9b3a0' : '#8f968f' }); }
    if (a.deck === 'tile') { for (let j = 0; j < 9; j++) for (let k = 0; k < 30; k++) if ((j + k) % 2 === 0) { const phi = -pm + (k + 0.5) * (2 * pm / 30); seams.push({ p: at(phi, 0.004, -1.3 + j * 0.74), s: [2 * pm * RR / 30, 0.012, 0.74], r: [0, 0, phi], c: '#cfc9b4' }); } }
    bits(s.root, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }), seams);
    if (a.deck === 'tile') for (const z of [-1.1, 4.95]) sector(0, 0.014, -pm, pm, z, z + 0.09, s.material('#e2b23c'));
    // Front lip and hazard ends.
    sector(0, 0.14, -pm - 0.02, pm + 0.02, 5.0, 5.12, steel);
    for (const sd of [-1, 1]) for (let k = 0; k < 9; k++) slab([0.12, 0.02, 0.5], sd * (pm + 0.012), 0.005, -3.8 + k * 1.05, s.material(k % 2 ? '#e0a820' : '#30363a'));

    // Terraces stepping up toward the back wall, with a stair through the middle.
    const tierH = 0.44, tiers = 3, stairHalf = 0.036;
    const beds: { p0: number; p1: number; h: number; z0: number; z1: number }[] = [];
    for (let k = 1; k <= tiers; k++) {
      const zf = -1.8 - (k - 1) * 1.0, zb = k === tiers ? -5.0 : zf - 1.0;
      for (const sd of [-1, 1]) {
        const p0 = sd < 0 ? -pm + 0.015 : stairHalf, p1 = sd < 0 ? -stairHalf : pm - 0.015;
        sector(0, k * tierH, p0, p1, -5.0, zf, concrete);
        sector(k * tierH - 0.02, k * tierH + 0.02, p0 + 0.008, p1 - 0.008, zb + 0.06, zf - 0.1, a.crop === 'rice' ? new THREE.MeshStandardMaterial({ color: '#7fa8b0', roughness: 0.08, metalness: 0.5 }) : soil);
        beds.push({ p0: p0 + 0.014, p1: p1 - 0.014, h: k * tierH + 0.02, z0: zb + 0.14, z1: zf - 0.18 });
      }
      for (let st = 0; st < 2; st++) s.box([stairHalf * 2 * RR - 0.02, tierH / 2, 0.5], [0, (k - 1) * tierH + (st + 0.5) * tierH / 2, zf + 0.25 - st * 0.5 - 0.5 + 0.5], s.material('#a9a596', { roughness: 0.9 }));
      s.box([stairHalf * 2 * RR - 0.02, k * tierH, 5.0 + zf - 0.75], [0, k * tierH / 2, (-5.0 + zf - 0.75) / 2], s.material('#a9a596', { roughness: 0.9 }));
    }
    // Irrigation channel along the foot of the terraces, and two front planters.
    sector(0, 0.1, -pm + 0.015, pm - 0.015, -1.78, -1.5, steel);
    sector(0.05, 0.11, -pm + 0.03, pm - 0.03, -1.74, -1.54, a.state === 'blight' && mood.wear > 0.6 ? soil : new THREE.MeshStandardMaterial({ color: '#7fb6c8', roughness: 0.08, metalness: 0.4 }));
    for (const sd of [-1, 1]) {
      const p0 = sd < 0 ? -0.49 : 0.3, p1 = sd < 0 ? -0.3 : 0.49;
      sector(0, 0.42, p0, p1, 3.5, 4.8, a.deck === 'timber' ? s.material('#8f7450') : steel);
      sector(0.4, 0.45, p0 + 0.008, p1 - 0.008, 3.6, 4.7, soil);
      beds.push({ p0: p0 + 0.014, p1: p1 - 0.014, h: 0.45, z0: 3.72, z1: 4.58 });
    }

    // Planting.
    const blobs: Bit[] = [], sticks: Bit[] = [], dots: Bit[] = [];
    const sickHues = ['#7a5a32', '#93803c', '#4a3d28', '#a8944a'];
    const sat = mix(0.75, 1.1, mood.cheer);
    const leaf = (hex: string) => {
      if ((a.state === 'blight' && random() < 0.6) || random() < mood.wear * 0.18) return new THREE.Color(pick(sickHues));
      const c = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      return c.setHSL(hsl.h + rr(-0.015, 0.015), Math.min(1, hsl.s * sat), hsl.l + rr(-0.05, 0.05) + (a.state === 'seedlings' ? 0.1 : 0));
    };
    const grow = { thriving: 1, seedlings: 0.34, harvest: 1, blight: 0.8, overgrown: 1.45, festival: 1 }[a.state];
    const gapShare = { thriving: 0.03, seedlings: 0.05, harvest: 0, blight: 0.35, overgrown: 0.05, festival: 0.03 }[a.state];
    const thick = mix(0.75, 1.2, mood.density);
    const trees: { phi: number; h: number; z: number }[] = [];
    beds.forEach((bed, bi) => {
      const rowGap = a.crop === 'grain' ? 0.17 : a.crop === 'orchard' ? 0.9 : 0.34;
      const nRows = Math.max(1, Math.floor((bed.z1 - bed.z0) / rowGap));
      for (let row = 0; row < nRows; row++) {
        const z = bed.z0 + (row + 0.5) * (bed.z1 - bed.z0) / nRows;
        const cut = a.state === 'harvest' && (bi + row) % 2 === 0;
        const kind = (bi * 3 + row) % 4;
        const stepLen = (a.crop === 'grain' ? 0.13 : a.crop === 'orchard' ? 1.7 : a.crop === 'meadow' ? 0.2 : 0.36) / thick;
        const n = Math.floor((bed.p1 - bed.p0) * RR / stepLen);
        for (let k = 0; k < n; k++) {
          const phi = bed.p0 + (k + rr(0.3, 0.7)) * (bed.p1 - bed.p0) / n, zz = z + rr(-0.04, 0.04);
          if (random() < gapShare) continue;
          const up = (h: number): V3 => at(phi, bed.h + h, zz);
          const g = grow * rr(0.85, 1.15);
          if (cut && a.crop !== 'orchard') { if (a.crop !== 'fallow') sticks.push({ p: up(0), s: [0.03, 0.06, 0.03], r: [0, 0, phi], c: '#c9b070' }); continue; }
          if (a.crop === 'vegetables') {
            if (kind === 0) blobs.push({ p: up(0.07 * g), s: [0.16 * g, 0.1 * g, 0.16 * g], c: leaf('#7fbf46') });
            else if (kind === 1) { blobs.push({ p: up(0.1 * g), s: [0.15 * g, 0.13 * g, 0.15 * g], c: leaf('#5f9f7f') }); blobs.push({ p: up(0.04 * g), s: [0.21 * g, 0.04 * g, 0.21 * g], c: leaf('#4f8f6a') }); }
            else if (kind === 2) { sticks.push({ p: up(0), s: [0.02, 0.75 * Math.min(g, 1.1), 0.02], r: [0, 0, phi], c: '#b99a6a' }); blobs.push({ p: up(0.36 * g), s: [0.14 * g, 0.3 * g, 0.14 * g], c: leaf('#3f8a3c') }); if (g > 0.6) for (let j = 0; j < 3; j++) dots.push({ p: at(phi + rr(-0.008, 0.008), bed.h + rr(0.2, 0.55) * g, zz + rr(0.08, 0.14)), s: [0.04, 0.04, 0.04], c: a.state === 'blight' ? '#4a2f24' : random() < 0.7 ? '#e03a26' : '#e9a23a' }); }
            else { blobs.push({ p: up(0.12 * g), s: [0.08 * g, 0.2 * g, 0.08 * g], c: leaf('#6fb04a') }); blobs.push({ p: up(0.1 * g), s: [0.14 * g, 0.07 * g, 0.05 * g], c: leaf('#8a3a5a') }); }
          } else if (a.crop === 'grain') {
            const hgt = rr(0.45, 0.62) * g;
            sticks.push({ p: up(0), s: [0.05, hgt, 0.05], r: [rr(-0.12, 0.12), 0, phi + rr(-0.1, 0.1)], c: a.state === 'seedlings' ? leaf('#7fbf46') : a.state === 'blight' && random() < 0.5 ? pick(sickHues) : pick(['#d9b84a', '#e2c45a', '#c9a63c', '#d0b866']) });
          } else if (a.crop === 'rice') {
            for (let j = 0; j < 3; j++) sticks.push({ p: at(phi + rr(-0.004, 0.004), bed.h, zz + rr(-0.05, 0.05)), s: [0.02, rr(0.16, 0.34) * g, 0.02], r: [rr(-0.25, 0.25), 0, phi + rr(-0.25, 0.25)], c: leaf('#7fc24a') });
          } else if (a.crop === 'orchard') trees.push({ phi, h: bed.h, z: zz });
          else if (a.crop === 'meadow') {
            sticks.push({ p: up(0), s: [0.03, rr(0.15, 0.4) * g, 0.03], r: [rr(-0.3, 0.3), 0, phi + rr(-0.3, 0.3)], c: leaf('#7fae4a') });
            if (a.state !== 'seedlings' && random() < 0.6) dots.push({ p: up(rr(0.2, 0.42) * g), s: [0.05, 0.04, 0.05], c: a.state === 'blight' ? pick(sickHues) : pick(['#f2c230', '#e2574a', '#f4f1e4', '#b77ad8', '#f08ab0', '#5f8fd8']) });
          } else if (random() < (a.state === 'overgrown' ? 0.5 : 0.06)) blobs.push({ p: up(0.04), s: [0.08 * g, 0.06 * g, 0.08 * g], c: leaf('#6f9a4a') });
        }
        if (a.crop === 'fallow') for (const sdz of [-0.08, 0.08]) { const m = sector(bed.h, bed.h + 0.03, bed.p0, bed.p1, z + sdz - 0.03, z + sdz + 0.03, s.material('#4d3a2a', { roughness: 1 })); m.castShadow = false; }
      }
    });
    const crowns: Bit[] = [];
    for (const tree of trees) {
      const g = (a.state === 'seedlings' ? 0.4 : 1) * rr(0.8, 1.15), trunkH = 0.8 * g;
      sticks.push({ p: at(tree.phi, tree.h, tree.z), s: [0.09 * g, trunkH, 0.09 * g], r: [0, 0, tree.phi], c: '#6a4c34' });
      const bare = a.state === 'blight' && random() < 0.4;
      for (let j = 0; j < (bare ? 0 : 4); j++) {
        const c = at(tree.phi + rr(-0.015, 0.015) * g, tree.h + trunkH + rr(0.1, 0.5) * g, tree.z + rr(-0.25, 0.25) * g);
        crowns.push({ p: c, s: [rr(0.35, 0.5) * g, rr(0.3, 0.42) * g, rr(0.35, 0.5) * g], c: leaf('#5f9f4a') });
        if (a.state !== 'seedlings') for (let f = 0; f < 5; f++) dots.push({ p: [c[0] + rr(-0.4, 0.4) * g, c[1] + rr(-0.2, 0.35) * g, c[2] + rr(0.1, 0.45) * g], s: [0.055, 0.055, 0.055], c: a.state === 'harvest' ? pick(['#e03a26', '#e9a23a']) : a.state === 'blight' ? '#5a4030' : mood.cheer > 0.45 ? pick(['#fbe3ea', '#f6c9d8', '#ffffff']) : pick(['#e03a26', '#d8c23a']) });
      }
      if (bare) for (let j = 0; j < 3; j++) sticks.push({ p: at(tree.phi, tree.h + trunkH, tree.z), s: [0.035, 0.5, 0.035], r: [rr(-0.8, 0.8), 0, tree.phi + rr(-0.8, 0.8)], c: '#5a4030' });
    }
    // Weeds and moss on the deck itself.
    const mossy = a.deck === 'moss' ? 1 : a.state === 'overgrown' ? 0.7 : mood.wear > 0.7 ? 0.25 : 0;
    for (let k = 0; k < 150 * mossy; k++) {
      const phi = rr(-pm, pm), z = random() < 0.5 ? rr(-1.4, -0.9) : rr(-1.4, 4.9);
      if (slots.some(([sx, sz]) => Math.hypot(RR * Math.sin(phi) - sx, z - sz) < 1.2)) { if (random() < 0.7) continue; }
      if (random() < 0.6) blobs.push({ p: at(phi, 0.01, z), s: [rr(0.1, 0.32), 0.02, rr(0.1, 0.3)], c: leaf(pick(['#6f9a52', '#7fa85a', '#5f8a4a'])) });
      else sticks.push({ p: at(phi, 0, z), s: [0.03, rr(0.08, 0.22), 0.03], r: [rr(-0.3, 0.3), 0, phi + rr(-0.3, 0.3)], c: leaf('#7fae4a') });
    }

    // Back wall with the long window.
    const wallTop = 6.1, win0 = 2.0, win1 = 3.75, pw = 0.44;
    sector(0, wallTop, -pm - 0.02, pm + 0.02, -5.3, -5.0, hull, [win0, win1, -pw, pw]);
    sector(wallTop - 0.02, wallTop + 0.12, -pm - 0.02, pm + 0.02, -5.36, -4.92, steel);
    for (const h of [win0 - 0.06, win1 + 0.0]) sector(h, h + 0.07, -pw - 0.01, pw + 0.01, -5.02, -4.94, steel);
    const bays = 12;
    for (let k = 0; k <= bays; k++) slab([0.09, win1 - win0, 0.14], -pw + k * (2 * pw / bays), (win0 + win1) / 2, -5.1, steel);
    sector(win0 - 0.1, win1 + 0.1, -pw - 0.02, pw + 0.02, -5.62, -5.5, new THREE.MeshStandardMaterial({ color: '#17204a', emissive: '#111a44', emissiveIntensity: 0.8, roughness: 0.4 }));
    const starCount = a.window === 'shuttered' ? 40 : a.window === 'stars' ? 170 : 90;
    const stars = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1.6 }), starCount);
    const starData = Array.from({ length: starCount }, () => ({ phi: rr(-pw, pw), h: rr(win0 + 0.08, win1 - 0.08), size: 0.018 + Math.pow(random(), 4) * 0.05 }));
    const starCol = new THREE.Color();
    starData.forEach((_star, i) => stars.setColorAt(i, starCol.set(pick(['#ffffff', '#ffffff', '#dfe8ff', '#fff0c8', '#ffd8e0']))));
    stars.castShadow = false; stars.frustumCulled = false;
    s.root.add(stars);
    const sm = new THREE.Matrix4();
    const layStars = (shift: number) => {
      starData.forEach((star, i) => {
        const phi = ((star.phi + shift + pw) % (2 * pw) + 2 * pw) % (2 * pw) - pw;
        const p = at(phi, star.h, -5.47);
        sm.makeScale(star.size, star.size, star.size).setPosition(p[0], p[1], p[2]);
        stars.setMatrixAt(i, sm);
      });
      stars.instanceMatrix.needsUpdate = true;
    };
    layStars(0);
    if (a.window === 'planet') {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d')!;
      g.beginPath(); g.arc(128, 128, 126, 0, 7); g.clip();
      const hues = pick([['#d9a066', '#f0d2a0', '#b8693c'], ['#6fa8d8', '#cfe6f5', '#3f6f9f'], ['#c9b7e8', '#f1e6ff', '#8a6ac0'], ['#7fbf9a', '#d8f0d8', '#3f8a6a']]);
      for (let y = 0; y < 256; y += 13) { g.fillStyle = pick(hues); g.fillRect(0, y + rr(-3, 3), 256, 15); }
      const shade = g.createLinearGradient(0, 0, 256, 200);
      shade.addColorStop(0.4, 'rgba(5,8,30,0)'); shade.addColorStop(0.85, 'rgba(5,8,30,0.92)');
      g.fillStyle = shade; g.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const phi = rr(-0.25, 0.25);
      const disc = s.mesh(new THREE.CircleGeometry(0.78, 40), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.85, transparent: true, alphaTest: 0.5 }), at(phi, (win0 + win1) / 2, -5.46));
      disc.rotation.z = phi + rr(-0.4, 0.4); disc.castShadow = false;
    } else if (a.window === 'nebula') {
      for (let k = 0; k < 16; k++) { const phi = rr(-pw + 0.06, pw - 0.06); const puff = s.mesh(new THREE.CircleGeometry(rr(0.4, 0.8), 20), new THREE.MeshBasicMaterial({ color: pick(['#ff6eaa', '#50d2c8', '#a078ff', '#ffaa6e']), transparent: true, opacity: 0.2, depthWrite: false }), at(phi, rr(win0 + 0.6, win1 - 0.6), -5.48 + k * 0.001)); puff.castShadow = false; puff.scale.y = 0.75; }
    } else if (a.window === 'destination') {
      const phi = rr(-0.2, 0.25), h = rr(win0 + 0.6, win1 - 0.6);
      const core = s.mesh(new THREE.CircleGeometry(0.13, 24), new THREE.MeshStandardMaterial({ color: '#fff7d0', emissive: '#ffe9a0', emissiveIntensity: 3 }), at(phi, h, -5.45)); core.castShadow = false;
      for (const [r, o] of [[0.3, 0.3], [0.52, 0.16]] as const) { const halo = s.mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: o, depthWrite: false }), at(phi, h, -5.46)); halo.castShadow = false; }
      slab([1.3, 0.014, 0.01], phi, h, -5.455, new THREE.MeshStandardMaterial({ color: '#fff7d0', emissive: '#ffe9a0', emissiveIntensity: 2 })).castShadow = false;
    } else if (a.window === 'shuttered') {
      const open = new Set([Math.floor(rr(1, 4)), Math.floor(rr(5, 8)), Math.floor(rr(8, 11))]);
      for (let k = 0; k < bays; k++) if (!open.has(k)) { const phi = -pw + (k + 0.5) * (2 * pw / bays); slab([2 * pw * RR / bays - 0.05, win1 - win0, 0.05], phi, (win0 + win1) / 2, -5.2, s.material('#9aa29e', { metalness: 0.5 })); for (let j = 1; j < 6; j++) slab([2 * pw * RR / bays - 0.1, 0.03, 0.02], phi, win0 + j * (win1 - win0) / 6, -5.165, dark); }
    }

    // What the generations put on the wall above the window.
    const bandLo = win1 + 0.35, bandHi = 5.25, bandMid = (bandLo + bandHi) / 2, bandH = bandHi - bandLo;
    const tiles = 6, tileW = 2 * pw * RR / tiles;
    const tile = (i: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, alpha = false) => {
      const c = document.createElement('canvas'); c.width = 384; c.height = Math.round(384 * bandH / tileW);
      const g = c.getContext('2d')!;
      draw(g, c.width, c.height);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const phi = -pw + (i + 0.5) * (2 * pw / tiles);
      const m = s.mesh(new THREE.PlaneGeometry(tileW + 0.005, bandH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, transparent: alpha, alphaTest: alpha ? 0.3 : 0 }), at(phi, bandMid, -4.985));
      m.rotation.z = phi; m.castShadow = false;
    };
    const fadeAmt = mix(0.15, 0.6, mood.wear);
    if (a.wall === 'mural') {
      const hillSeed = [rr(0, 6), rr(0, 6), rr(0, 6)];
      for (let i = 0; i < tiles; i++) tile(i, (g, w, h) => {
        const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#9fd0e8'); sky.addColorStop(1, '#f6e6c0');
        g.fillStyle = sky; g.fillRect(0, 0, w, h);
        const gx = (x: number) => i * w + x;
        if (i === 4) { g.fillStyle = '#f6c930'; g.beginPath(); g.arc(w * 0.5, h * 0.3, h * 0.17, 0, 7); g.fill(); }
        [['#8fb88a', 0.45, 0.004], ['#6fa368', 0.6, 0.007], ['#4f8a52', 0.76, 0.011]].forEach(([hex, base, f], j) => { g.fillStyle = hex as string; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 8) g.lineTo(x, h * (base as number) + Math.sin(gx(x) * (f as number) + hillSeed[j]) * h * 0.12); g.lineTo(w, h); g.fill(); });
        g.strokeStyle = '#5fa8d0'; g.lineWidth = h * 0.05; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.88 + Math.sin(gx(x) * 0.006) * h * 0.05); g.stroke();
        g.fillStyle = `rgba(220,223,214,${fadeAmt})`; g.fillRect(0, 0, w, h);
      });
    } else if (a.wall === 'numbers') {
      const deckNo = 1 + Math.floor(random() * 9);
      for (const i of [1, 4]) tile(i, (g, w, h) => { g.fillStyle = '#3a4a5a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${h * 0.5}px monospace`; g.fillText(i === 1 ? `RING C` : `AGRI ${deckNo}`, w / 2, h / 2, w * 0.9); g.fillRect(w * 0.08, h * 0.84, w * 0.84, h * 0.05); }, true);
    } else if (a.wall === 'hands') {
      for (let i = 0; i < tiles; i++) tile(i, (g, w, h) => {
        for (let k = 0; k < 9 + mood.density * 8; k++) { g.save(); g.translate(rr(20, w - 20), rr(30, h - 20)); g.rotate(rr(-0.6, 0.6)); const sc = rr(0.8, 1.4); g.scale(sc, sc); g.fillStyle = pick(['#e2574a', '#f2c230', '#4d8fd8', '#5aa84a', '#b77ad8', '#f28a1e']); g.globalAlpha = 1 - fadeAmt * 0.6; g.beginPath(); g.ellipse(0, 0, 11, 13, 0, 0, 7); g.fill(); for (let f = 0; f < 5; f++) { g.beginPath(); g.ellipse(-12 + f * 6, -19 + Math.abs(f - 2) * 3, 2.8, 9, (f - 2) * 0.2, 0, 7); g.fill(); } g.restore(); }
      }, true);
    } else if (a.wall === 'plaques') {
      const plaques: Bit[] = [];
      for (let k = 0, n = Math.round(mix(18, 46, mood.density)); k < n; k++) for (let row = 0; row < 2; row++) { if (random() < 0.15) continue; const phi = -pw + (k + 0.5) * (2 * pw / n); plaques.push({ p: at(phi, bandLo + 0.3 + row * 0.5, -4.98), s: [2 * pw * RR / n * 0.72, 0.34, 0.03], r: [0, 0, phi], c: random() < mood.wear * 0.5 ? '#6f8a72' : pick(['#c9a24a', '#b8903c', '#d2ae58']) }); }
      bits(s.root, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.7, roughness: 0.35 }), plaques);
    } else if (a.wall === 'tally') {
      const year = 200 + Math.floor(random() * 500);
      for (let i = 0; i < tiles; i++) tile(i, (g, w, h) => {
        g.strokeStyle = '#3a4a5a'; g.fillStyle = '#b9452e'; g.lineWidth = 5; g.lineCap = 'round';
        if (i === tiles - 1) { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${h * 0.34}px monospace`; g.fillText(`YEAR`, w / 2, h * 0.3); g.fillText(`${year}`, w / 2, h * 0.68); return; }
        for (let row = 0; row < 3; row++) for (let grp = 0; grp < 8; grp++) { const x = 16 + grp * 46, y = h * (0.1 + row * 0.3); for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x + k * 8, y); g.lineTo(x + k * 8 + rr(-2, 2), y + h * 0.2); g.stroke(); } g.beginPath(); g.moveTo(x - 5, y + h * 0.17); g.lineTo(x + 30, y + h * 0.03); g.stroke(); }
      }, true);
    } else {
      const rose: Bit[] = [], bloom: Bit[] = [];
      for (const h of [bandLo + 0.15, bandMid, bandHi - 0.15]) sector(h, h + 0.012, -pw, pw, -4.99, -4.975, dark).castShadow = false;
      for (let k = 0; k < 260 * mix(0.6, 1.2, mood.density); k++) { const phi = rr(-pw, pw), h = bandLo + Math.pow(random(), 1.4) * bandH; rose.push({ p: at(phi, h, -4.93), s: [rr(0.1, 0.2), rr(0.08, 0.15), 0.06], c: leaf(pick(['#4f8a46', '#5f9a4e', '#3f7a3e'])) }); if (random() < 0.35) bloom.push({ p: at(phi, h + 0.03, -4.88), s: [0.07, 0.07, 0.05], c: mood.wear > 0.75 ? '#9a7a62' : pick(['#f08ab0', '#e2574a', '#fbe3ea', '#f6c9d8']) }); }
      for (let k = 0; k < 9; k++) { const phi = -pw + (k + 0.5) * (2 * pw / 9); sticks.push({ p: at(phi, win1 + 0.05, -4.96), s: [0.04, bandH * rr(0.5, 0.9), 0.04], r: [0, 0, phi + rr(-0.2, 0.2)], c: '#5a4632' }); }
      bits(s.root, new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), rose);
      bits(s.root, new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), bloom);
    }

    // Ribs cantilevered off the wall, and the strip-sun slung beneath them along the ring.
    const ribPhis = [-0.42, -0.14, 0.14, 0.42], sunH = 5.05, sunZ = -1.6, railH = 5.72;
    for (const phi of ribPhis) {
      slab([0.16, 0.26, 4.6], phi, railH + 0.05, -2.7, hull);
      const from = at(phi, 3.95, -5.0), to = at(phi, railH - 0.08, -2.2);
      s.rod(from, to, 0.05, steel);
      slab([0.3, 0.5, 0.12], phi, 3.95, -4.95, steel);
      slab([0.22, 0.34, 0.1], phi, railH + 0.05, -0.38, s.material('#e0a820'));
    }
    sector(railH - 0.1, railH - 0.02, -pm + 0.03, pm - 0.03, sunZ - 0.07, sunZ + 0.07, steel);
    const segs = 8, segArc = (2 * 0.46) / segs;
    const deadSeg = Math.floor(rr(1, segs - 1));
    const sunMats: { mat: THREE.MeshStandardMaterial; level: number }[] = [];
    const fins: Bit[] = [];
    let lit = 0;
    for (let k = 0; k < segs; k++) {
      const phi = -0.46 + (k + 0.5) * segArc;
      let level = mix(0.6, 1, Math.sin(d * Math.PI)) * rr(0.94, 1.04);
      let hue = sunHue.clone();
      if (a.sun === 'gap' && k === deadSeg) level = 0;
      if (a.sun === 'patchwork') { hue = hue.lerp(new THREE.Color(pick(['#ffd0a0', '#fff6e0', '#d8e8ff', '#ffe27a', '#ffc0b0', '#e8ffd8'])), 0.65); level *= rr(0.6, 1.05); }
      if (a.sun === 'failing' && k !== deadSeg && k !== (deadSeg + 3) % segs) level = 0;
      lit += level / segs;
      const sag = level === 0 && a.sun === 'gap' ? 0.28 : 0;
      const g = new THREE.Group();
      const p = at(phi, sunH - sag, sunZ);
      g.position.set(p[0], p[1], p[2]); g.rotation.z = phi + (sag ? 0.16 : 0); g.rotation.x = -0.32;
      const len = segArc * (RR - sunH) - 0.1;
      const G = (m: THREE.Mesh) => { g.add(m); return m; };
      G(s.box([len, 0.16, 0.62], [0, 0.06, 0], a.sun === 'patchwork' && k % 3 === 1 ? s.material('#c9cfc6') : hull));
      const mat = new THREE.MeshStandardMaterial({ color: level > 0.02 ? hue : '#4a5054', emissive: hue, emissiveIntensity: level * 1.5, roughness: 0.4 });
      sunMats.push({ mat, level });
      G(s.box([len - 0.06, 0.07, 0.54], [0, -0.05, 0], mat));
      const spill = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9d5c6').lerp(hue, Math.min(1, level)), emissive: hue, emissiveIntensity: level * 0.55, roughness: 0.5, side: THREE.DoubleSide });
      for (const sd of [-1, 1]) G(s.box([len, 0.012, 0.3], [0, -0.13, sd * 0.4], spill)).rotation.x = sd * 0.65;
      s.root.add(g);
      for (let f = 0, n = Math.floor(len / 0.11); f < n; f++) fins.push({ p: at(phi - segArc / 2 + (f + 0.8) * (segArc / (n + 0.6)), sunH - sag + 0.2, sunZ - 0.06), s: [0.02, 0.12, 0.5], r: [-0.32, 0, phi], c: '#c3cbcc' });
      for (const sd of [-1, 1]) s.rod(at(phi + sd * segArc * 0.38, sunH - sag + 0.14, sunZ), at(phi + sd * segArc * 0.38, railH - 0.08, sunZ), 0.014, dark);
    }
    bits(s.root, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.6, roughness: 0.4 }), fins);
    // The fall of light: a faint sheet under the bar and a warm band across the beds and path.
    const rich = sunHue.clone(); { const hsl = { h: 0, s: 0, l: 0 }; rich.getHSL(hsl); rich.setHSL(hsl.h, Math.min(1, hsl.s + 0.25), Math.min(0.66, hsl.l)); }
    const sheet = sector(0.5, sunH - 0.15, -0.45, 0.45, sunZ - 0.02, sunZ + 0.02, new THREE.MeshBasicMaterial({ color: rich, transparent: true, opacity: 0.1 * lit, depthWrite: false, side: THREE.DoubleSide }));
    sheet.castShadow = false;
    const pool = sector(0.016, 0.02, -0.45, 0.45, -1.45, 0.9, new THREE.MeshBasicMaterial({ color: rich, transparent: true, opacity: 0.22 * lit, depthWrite: false }));
    pool.castShadow = false;
    if (a.sun === 'failing') for (const phi of [-0.3, 0, 0.3]) slab([1.6, 0.07, 0.04], phi, win0 - 0.3, -4.97, new THREE.MeshStandardMaterial({ color: '#ffb02a', emissive: '#ff9a1a', emissiveIntensity: 2 }));

    // Pipes, a valve and a sign on the terraces' retaining wall.
    sector(tierH * 0.45, tierH * 0.45 + 0.07, -pm + 0.03, -stairHalf - 0.02, -1.8, -1.74, s.material('#4f8f86', { metalness: 0.4 }));
    s.cylinder(0.09, 0.09, 0.03, at(0.08, tierH * 0.5, -1.74), s.material('#c0392b'), 10).rotation.x = Math.PI / 2;

    // State dressing.
    const loose = (phi: number, z: number) => !slots.some(([sx, sz, , size]) => Math.hypot(RR * Math.sin(phi) - sx, z - sz) < 1.5 * (size ?? 1));
    if (a.state === 'harvest') {
      const wood = s.material('#b98a52');
      for (let k = 0; k < 7; k++) {
        const phi = [-0.4, -0.33, -0.26, 0.13, 0.2, 0.27, 0.4][k], z = -1.05 + rr(-0.1, 0.1), stack = 1 + Math.floor(random() * 3);
        if (!loose(phi, z)) continue;
        for (let j = 0; j < stack; j++) slab([0.55, 0.26, 0.4], phi, 0.14 + j * 0.28, z, wood).rotation.y = rr(-0.15, 0.15);
        const hueC = { vegetables: '#7fbf46', grain: '#d9b84a', rice: '#e9dfb8', orchard: '#e03a26', meadow: '#f08ab0', fallow: '#8a6a4a' }[a.crop];
        for (let j = 0; j < 9; j++) dots.push({ p: at(phi + rr(-0.012, 0.012), 0.05 + stack * 0.28 + rr(0, 0.05), z + rr(-0.13, 0.13)), s: [0.07, 0.06, 0.07], c: random() < 0.8 ? hueC : '#e9a23a' });
      }
    } else if (a.state === 'overgrown') {
      for (const phi of ribPhis) for (let k = 0; k < 46; k++) { const t = random(), from = at(phi, 3.95, -5.0), to = at(phi, railH - 0.08, -2.2); const onBrace = random() < 0.6; const p: V3 = onBrace ? [mix(from[0], to[0], t) + rr(-0.12, 0.12), mix(from[1], to[1], t) + rr(-0.2, 0.1), mix(from[2], to[2], t) + rr(-0.12, 0.12)] : at(phi + rr(-0.008, 0.008), railH - rr(0, 0.6), rr(-4.8, -0.6)); blobs.push({ p, s: [rr(0.08, 0.16), rr(0.06, 0.12), rr(0.08, 0.16)], c: leaf(pick(['#4f8a46', '#5f9a4e', '#6fae52'])) }); }
      for (let k = 0; k < 60; k++) { const phi = rr(-pm, pm); blobs.push({ p: at(phi, rr(0.1, tiers * tierH), -1.76 - Math.floor(rr(0, 3)) * 1.0 + 0.02), s: [rr(0.1, 0.2), rr(0.1, 0.25), 0.05], c: leaf('#5f9a4e') }); }
    } else if (a.state === 'festival') {
      const flags: Bit[] = [];
      const paper = ['#e2574a', '#f2c230', '#4d8fd8', '#5aa84a', '#f4f1e4', '#f08ab0'];
      for (let r = 0; r < ribPhis.length - 1; r++) for (let k = 0; k <= 14; k++) {
        const t = k / 14, phi = mix(ribPhis[r], ribPhis[r + 1], t), h = railH - 0.25 - Math.sin(t * Math.PI) * 0.75;
        flags.push({ p: at(phi, h, -0.38), s: [0.2, 0.26, 0.012], r: [0, 0, phi + Math.PI], c: paper[(k + r) % paper.length] });
        if (k % 5 === 2) { const lp = at(phi, h - 0.42, -0.38); s.rod(at(phi, h, -0.38), lp, 0.006, dark); const lan = s.ball([0.16, 0.19, 0.16], lp, new THREE.MeshStandardMaterial({ color: paper[(k + r * 2) % 4], emissive: paper[(k + r * 2) % 4], emissiveIntensity: mix(0.5, 1.2, mood.cheer), roughness: 0.6 }), 12); lan.castShadow = true; }
      }
      const flagGeo = new THREE.ConeGeometry(0.6, 1, 3); flagGeo.translate(0, 0.5, 0);
      bits(s.root, flagGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, side: THREE.DoubleSide }), flags);
    }

    // What the gardeners left out.
    const lphi = 0.385, lz = -0.85;
    const L = (dx: number, h: number, dz: number): V3 => at(lphi + dx / RR, h, lz + dz);
    if (a.left === 'barrow') {
      const paintMat = s.material(pick(['#4f8f86', '#c0392b', '#d9a13c']), { metalness: 0.3 });
      const tub = slab([0.75, 0.3, 0.55], lphi, 0.5, lz, paintMat); tub.rotation.x = 0.0; tub.rotation.z = lphi + 0.12;
      const wheel = s.cylinder(0.2, 0.2, 0.08, L(-0.5, 0.2, 0), dark, 16); wheel.rotation.x = Math.PI / 2;
      for (const dz of [-0.24, 0.24]) { s.rod(L(-0.5, 0.2, dz * 0.4), L(0.95, 0.52, dz), 0.022, steel); s.rod(L(0.3, 0.36, dz), L(0.36, 0, dz), 0.022, steel); }
      blobs.push({ p: L(0, 0.68, 0), s: [0.3, 0.12, 0.22], c: soilHex });
      s.rod(L(-1.2, 0, 0.5), L(-1.25, 1.15, 0.2), 0.02, s.material('#b98a52')); s.box([0.2, 0.26, 0.02], L(-1.2, 0.12, 0.5), steel).rotation.z = lphi;
      s.cylinder(0.13, 0.15, 0.3, L(1.5, 0.15, 0.3), s.material('#6a9aa8', { metalness: 0.4 }), 14); s.rod(L(1.6, 0.12, 0.3), L(1.95, 0.36, 0.3), 0.022, s.material('#6a9aa8', { metalness: 0.4 }), 0.012);
    } else if (a.left === 'laundry') {
      const p0 = L(-1.5, 0, 0.1), p1 = L(1.5, 0, 0.1), t0 = L(-1.5, 1.75, 0.1), t1 = L(1.5, 1.75, 0.1);
      s.rod(p0, t0, 0.03, steel); s.rod(p1, t1, 0.03, steel); s.rod(t0, t1, 0.006, dark);
      for (let k = 0; k < 6; k++) { const t = (k + 0.7) / 7, w = rr(0.26, 0.42), hgt = rr(0.4, 0.75); const c = s.box([w, hgt, 0.02], L(mix(-1.5, 1.5, t), 1.75 - hgt / 2 - 0.02, 0.1), s.material(pick(['#5a7fa8', '#d9d4c4', '#6f8a5a', '#c8553d', '#e9c46a', '#8a8f9a']), { roughness: 0.95 })); c.rotation.z = lphi; }
      slab([0.5, 0.26, 0.36], lphi + 0.02, 0.13, lz + 0.6, s.material('#c9b48a'));
    } else if (a.left === 'picnic') {
      const cloth = slab([1.5, 0.02, 1.1], lphi, 0.012, lz + 0.3, s.material('#c8553d', { roughness: 0.95 })); cloth.rotation.y = 0.2;
      for (let k = 0; k < 3; k++) { const st = slab([1.5, 0.004, 0.1], lphi, 0.025, lz - 0.1 + k * 0.4, s.material('#f4f1e4')); st.rotation.y = 0.2; }
      slab([0.4, 0.24, 0.3], lphi - 0.02, 0.14, lz + 0.2, s.material('#b98a52'));
      s.ring(0.16, 0.014, L(-0.34, 0.26, 0.2), s.material('#9a7242'), Math.PI).rotation.y = Math.PI / 2;
      for (let k = 0; k < 3; k++) s.cylinder(0.05, 0.04, 0.09, L(0.25 + k * 0.16, 0.07, 0.45 + (k % 2) * 0.15), s.material(pick(['#f4f1e4', '#7fb6c8', '#e9c46a'])), 12);
      dots.push({ p: L(0.3, 0.06, 0.1), s: [0.07, 0.07, 0.07], c: '#e03a26' }, { p: L(0.42, 0.06, 0.16), s: [0.07, 0.07, 0.07], c: '#e9a23a' });
    } else if (a.left === 'ladder') {
      const wood = s.material('#c9a45c');
      const apex = 2.3;
      for (const dz of [-0.24, 0.24]) { s.rod(L(-0.5, 0, dz), L(0, apex, dz * 0.7), 0.028, wood); s.rod(L(0.5, 0, dz), L(0, apex, dz * 0.7), 0.028, wood); }
      for (let k = 1; k < 7; k++) { const t = k / 7; s.rod(L(-0.5 * (1 - t), apex * t, -0.24 * mix(1, 0.7, t)), L(-0.5 * (1 - t), apex * t, 0.24 * mix(1, 0.7, t)), 0.018, wood); }
      slab([0.3, 0.04, 0.4], lphi, apex + 0.02, lz, wood);
      slab([0.46, 0.2, 0.24], lphi + 0.07, 0.1, lz + 0.35, s.material('#c0392b'));
    }

    bits(s.root, new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), blobs);
    bits(s.root, new THREE.SphereGeometry(1, 9, 7), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }), crowns);
    const stickGeo = new THREE.BoxGeometry(1, 1, 1); stickGeo.translate(0, 0.5, 0);
    bits(s.root, stickGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), sticks);
    bits(s.root, new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), dots);

    // Everyone stands leaning toward the axis, as the deck curves under them.
    const basePlace = world.place.bind(world);
    const zAxis = new THREE.Vector3(0, 0, 1), lean = new THREE.Quaternion();
    world.place = (items) => {
      basePlace(items);
      items.forEach((item) => {
        lean.setFromAxisAngle(zAxis, Math.asin(THREE.MathUtils.clamp(item.holder.position.x / RR, -1, 1)));
        item.holder.quaternion.premultiply(lean);
        item.holder.updateMatrixWorld(true);
      });
    };
    let shift = 0;
    const drift = mix(0.002, 0.02, mood.energy);
    world.update = (dt, time) => {
      shift += dt * drift;
      layStars(shift);
      if (a.sun === 'failing' || a.sun === 'gap') for (const seg of sunMats) if (seg.level > 0 && a.sun === 'failing') seg.mat.emissiveIntensity = seg.level * 1.5 * (Math.sin(time * 23) + Math.sin(time * 7.1) > -0.6 ? 1 : 0.25);
    };
    return world;
  },
});
