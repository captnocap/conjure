import * as THREE from 'three';
import { choice, clamp01, defineWorld, diorama, mix, score } from '@conjure/kit';
import { lump, strew, type Speck } from './grains';

const SANDS = {
  white: 'Tropical white: coral and shell ground to sugar, almost too bright to look at.',
  golden: 'Golden quartz, the ordinary sand of a family holiday.',
  pink: 'Pink sand, blushed by the red shells of tiny sea creatures.',
  volcanic: 'Volcanic black: basalt grit with green crystals glinting in it.',
  olivine: 'Olive green, a rare beach made of one mineral.',
  garnet: 'Wine-dark purple-red garnet sand, heavy and strange.',
  shingle: 'Grey grit and rock chips, a cold northern shore.',
  mixed: 'Every colour at once: a pinch of the whole world\'s mountains.',
} as const;
const PALETTE: Record<keyof typeof SANDS, { grains: string[]; specks: string[]; share: number }> = {
  white: { grains: ['#f4eedf', '#ece2cc', '#f8f4ea', '#e2d7c0', '#f0dfd1', '#e4e9ea'], specks: ['#f0b3aa', '#bfb7a8'], share: 0.05 },
  golden: { grains: ['#e0c188', '#d3ac70', '#ebd5a5', '#c69c60', '#d9c6a1', '#eddfbc'], specks: ['#3a3836', '#55504a', '#f4eee0'], share: 0.07 },
  pink: { grains: ['#eeb5b0', '#f4cfc8', '#e6979c', '#f5e3da', '#f0c0ac', '#f8efe7'], specks: ['#d44f5d', '#ffffff'], share: 0.1 },
  volcanic: { grains: ['#444246', '#55514d', '#38383c', '#625d56', '#49504a', '#6f6962'], specks: ['#86a846', '#a3bd62', '#c9c2b5'], share: 0.1 },
  olivine: { grains: ['#8a9a4a', '#a3b25c', '#6f7f3a', '#b9c178', '#5d6a3d', '#c8c9a0'], specks: ['#2d2d30', '#e9e2cf'], share: 0.1 },
  garnet: { grains: ['#8a3a4e', '#a34a58', '#6d2f47', '#b86a6a', '#5a3550', '#c9a59a'], specks: ['#2a2a2d', '#e8d9c8'], share: 0.12 },
  shingle: { grains: ['#8f8d89', '#a8a49c', '#74736f', '#bdb7ab', '#6a6660', '#cfcac0'], specks: ['#b0603a', '#e9e3d6'], share: 0.08 },
  mixed: { grains: ['#efe6d2', '#d6b074', '#444246', '#eeb5b0', '#8a9a4a', '#a8a49c', '#f8f4ea', '#8a3a4e'], specks: ['#2a2a2d'], share: 0.04 },
};
const HORIZONS = {
  sea: 'A blurred band of turquoise sea under a pale blue sky, noon on holiday.',
  sunset: 'Molten orange and rose, the sun melting into the water.',
  haze: 'White sea mist: no horizon at all, only brightness.',
  storm: 'Slate grey sky over a pewter sea.',
  bokeh: 'Soft out-of-focus discs of colour: beach umbrellas, towels and people, far too big to be seen.',
  dusk: 'Blue-violet dusk with a low pale moon.',
} as const;
const SKY: Record<keyof typeof HORIZONS, { top: string; glow: string; sea: string; shore: string }> = {
  sea: { top: '#cfe9f7', glow: '#fbfdfb', sea: '#6fcfd2', shore: '#d9f0ea' },
  sunset: { top: '#f6c9a0', glow: '#fff1c4', sea: '#f08c5a', shore: '#f7c7a8' },
  haze: { top: '#eef1ee', glow: '#ffffff', sea: '#e3ebe9', shore: '#f1f1ea' },
  storm: { top: '#aab4bb', glow: '#d9dfe0', sea: '#7f8f96', shore: '#b9c2c2' },
  bokeh: { top: '#d5ecf5', glow: '#fdfcf4', sea: '#8fd5d8', shore: '#e6efe2' },
  dusk: { top: '#8f95c4', glow: '#e9c9c9', sea: '#6f7fb5', shore: '#a9a7c8' },
};
const smooth = (t: number) => { const k = clamp01(t); return k * k * (3 - 2 * k); };

export default defineWorld({
  questions: {
    sand: choice('What is the sand made of?', SANDS),
    terrain: choice('How do the grains lie?', {
      strand: 'A level pavement of grains, smoothed by the last wave.',
      dunes: 'Piled into a dune ridge along the back, a mountain range of grains.',
      ripples: 'Combed into parallel ripples by the water.',
      hollow: 'A scooped hollow ringed by a bank of grains, like the inside of a footprint.',
      slope: 'A steady beach face climbing away from the water.',
    }),
    water: choice('Where is the water?', {
      dry: 'Nowhere: the sand is dry and loose.',
      film: 'A film of water retreating across the front, its edge a lace of foam.',
      flood: 'A thin sheet over everything, the grains just breaking the surface.',
      beads: 'A few fat droplets sitting on the grains like glass domes.',
      foam: 'Only foam is left: lines and clusters of bubbles where the wave was.',
    }),
    horizon: choice('What is the blur beyond the sand?', HORIZONS),
    coarse: score('How coarse is the sand?', ['Fine and even, like sugar', 'Ordinary beach sand', 'Coarse grit, every grain a boulder']),
    dressing: choice('What lies among the grains?', {
      nothing: 'Nothing but grains.',
      shells: 'Broken shell: white curved chips and tiny spires.',
      minerals: 'Heavy dark crystals and one or two gem-bright ones.',
      weed: 'Dark ribbons of dried seaweed draped across the grains.',
      plastic: 'Bright shards and fibres of plastic, the modern strandline.',
      monoliths: 'A few great clear quartz grains standing over the rest like monoliths.',
    }),
    story: choice('What has just happened here?', {
      untouched: 'Nothing for hours. It is still.',
      footprint: 'Someone walked by: the bank of a giant heel print curves along one side.',
      tracks: 'Something small crossed: a line of craters along the front.',
      wind: 'The wind is up, and grains are flying low across the surface.',
      castle: 'A child was here: dribbled towers of wet grains stand at the back.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const W = 14, D = 11;
    const sand = PALETTE[a.sand];
    const sky = SKY[a.horizon];
    const k1 = random() * 6.283, k2 = random() * 6.283;
    const wetLine = (x: number) => 2.3 + 0.55 * Math.sin(x * 0.55 + k1) + 0.25 * Math.sin(x * 1.7 + k2);
    const trackSpots = Array.from({ length: 8 }, (_unused, i) => [-6 + i * 1.7 + (i % 2) * 0.3, 4.55 + (i % 2 ? 0.28 : -0.28)] as const);

    /** Height of the sand surface. Never below zero: the stage floor is bedrock. */
    const height = (x: number, z: number) => {
      let h = 0.04 + 0.04 * Math.sin(x * 1.3 + z * 0.7 + k1);
      if (a.terrain === 'dunes') h += 2.7 * smooth((-z - 2.9) / 2.3) * (0.7 + 0.3 * Math.sin(x * 0.55 + k2)) + 1.9 * smooth((-x - 4.9) / 1.9) * (0.75 + 0.25 * Math.sin(z * 0.8 + k1));
      else if (a.terrain === 'ripples') h += 0.16 + 0.16 * Math.sin(z * 2.3 + Math.sin(x * 0.45 + k2) * 0.9);
      else if (a.terrain === 'hollow') { const d = Math.max(Math.abs(x) / 7, Math.abs(z) / 5.5); h += 1.7 * smooth((d - 0.74) / 0.22) * (x > 3 || z > 2 ? 0.4 : 1); }
      else if (a.terrain === 'slope') h += (5.5 - z) * 0.14;
      if (a.story === 'footprint') { const d = Math.hypot(x + 10.5, z - 1.5); h += 1.7 * Math.exp(-(((d - 5.4) / 0.75) ** 2)) + (d < 5.4 ? 0 : 0); }
      if (a.story === 'tracks') for (const [tx, tz] of trackSpots) { const d = Math.hypot(x - tx, z - tz); h += 0.32 * Math.exp(-(((d - 0.42) / 0.14) ** 2)); }
      return h;
    };

    const spots: [number, number, number][] = [[0, 0.7, 1], [-3.7, -0.9, 1], [3.7, -0.7, 1], [-2.3, 2.9, 0.8], [2.5, 3, 0.8], [0, -2.9, 0.9]];
    const { art: s, world } = diorama(context, {
      background: sky.top, floor: sand.grains[1], width: W, depth: D, maxHeight: 3.1, radius: 1.35, pitch: 26, yaw: 24,
      slots: spots.map(([x, z, size]) => [x, z, height(x, z) + 0.1, size] as const),
    });
    const free = (x: number, z: number, room: number) => spots.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > room);
    const somewhere = (room: number, back = false): [number, number] => {
      for (let i = 0; i < 40; i++) {
        const x = (random() - 0.5) * (W - 1.4), z = back ? -D / 2 + 0.6 + random() * 2.4 : (random() - 0.5) * (D - 1.2);
        if (free(x, z, room)) return [x, z];
      }
      return [(random() < 0.5 ? -1 : 1) * 6, -4.6];
    };

    const film = a.water === 'film', flood = a.water === 'flood';
    const wetAt = (x: number, z: number) => flood || (film && z > wetLine(x) - 0.3) || a.story === 'castle' && z < -3;
    const shade = (hex: string, wet: boolean) => { const c = new THREE.Color(hex); return wet ? c.multiplyScalar(0.74) : c.offsetHSL(0, 0, mix(-0.03, 0.03, mood.cheer)); };

    // The solid sand under the loose grains, so no gap ever shows bedrock.
    const skin = new THREE.PlaneGeometry(W, D, 70, 56);
    skin.rotateX(-Math.PI / 2);
    const sp = skin.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i), z = sp.getZ(i), rim = Math.abs(x) > W / 2 - 0.01 || Math.abs(z) > D / 2 - 0.01;
      sp.setY(i, rim ? 0 : height(x, z) - 0.06);
    }
    skin.computeVertexNormals();
    const ground = s.mesh(skin, new THREE.MeshStandardMaterial({ color: new THREE.Color(sand.grains[0]).lerp(new THREE.Color(sand.grains[3 % sand.grains.length]), 0.5).multiplyScalar(flood ? 0.7 : 0.86), roughness: 0.9 }));
    ground.castShadow = false;
    world.ground = ground;

    // The grains themselves: one jittered pavement, then the larger ones that ride on top.
    const grains: Speck[] = [];
    const pitch = mix(0.4, 0.8, a.coarse);
    for (let x = -W / 2 + pitch * 0.5; x < W / 2 - pitch * 0.3; x += pitch)
      for (let z = -D / 2 + pitch * 0.5; z < D / 2 - pitch * 0.3; z += pitch) {
        const gx = x + (random() - 0.5) * pitch * 0.7, gz = z + (random() - 0.5) * pitch * 0.7;
        const speck = random() < sand.share;
        const size = pitch * (speck ? 0.3 + random() * 0.25 : 0.5 + random() * 0.38);
        const from = speck ? sand.specks : sand.grains;
        grains.push({ x: gx, y: height(gx, gz) + size * (speck ? 0.3 : 0.05), z: gz, size, color: shade(from[Math.floor(random() * from.length)], wetAt(gx, gz)) });
      }
    const big = 10 + Math.round(mood.density * 16 + a.coarse * 10);
    for (let i = 0; i < big; i++) {
      const [x, z] = somewhere(2.0);
      const size = mix(0.5, 0.95, a.coarse) * (0.7 + random() * 0.7);
      grains.push({ x, y: height(x, z) + size * 0.35, z, size, color: shade(sand.grains[Math.floor(random() * sand.grains.length)], wetAt(x, z)) });
    }
    if (a.story === 'castle') {
      for (const [cx, cz, tall] of [[-5.6, -3.9, 3.1], [5.3, -4.4, 2.3], [-2.4, -4.6, 1.7], [-6.0, 0.9, 1.5]] as const) {
        for (let y = 0; y < tall; y += 0.2) {
          const r = 0.75 * Math.pow(1 - y / tall, 0.7) + 0.1;
          for (let k = 0; k < 3 + r * 9; k++) { const t = random() * 6.283, d = Math.sqrt(random()) * r; grains.push({ x: cx + Math.cos(t) * d, y: height(cx, cz) + y + 0.1, z: cz + Math.sin(t) * d, size: 0.2 + random() * 0.1, color: shade(sand.grains[Math.floor(random() * sand.grains.length)], true), flat: 0.8 }); }
        }
      }
    }
    const grainPaint = new THREE.MeshStandardMaterial({ roughness: flood ? 0.3 : mix(0.45, 0.7, mood.wear) });
    s.root.add(strew(random, grains, lump(random, { detail: 1, amp: 0.3, chips: 3 }), grainPaint));

    const flying = new THREE.Group();
    if (a.story === 'wind') {
      const air: Speck[] = [];
      for (let i = 0; i < 110 + Math.round(mood.energy * 80); i++) {
        const lift = random() * random();
        air.push({ x: (random() - 0.5) * (W - 1), y: 0.5 + lift * 2.6, z: (random() - 0.5) * (D - 1), size: 0.07 + random() * 0.09, color: sand.grains[Math.floor(random() * sand.grains.length)] });
      }
      flying.add(strew(random, air, lump(random, { detail: 0, amp: 0.3 }), grainPaint));
      // Streaks of blown dust, so the wind has a direction even in a still frame.
      const dust = new THREE.MeshBasicMaterial({ color: sand.grains[2], transparent: true, opacity: 0.35, depthWrite: false });
      for (let i = 0; i < 14; i++) { const streak = new THREE.Mesh(new THREE.BoxGeometry(1.6 + random() * 2.4, 0.03, 0.05), dust); streak.position.set((random() - 0.5) * (W - 4), 0.6 + random() * 1.8, (random() - 0.5) * (D - 1)); streak.rotation.z = 0.08; flying.add(streak); }
      s.root.add(flying);
    }

    // What the tide left among the grains.
    const n = 5 + Math.round(mood.density * 9);
    if (a.dressing === 'shells') {
      const shell = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f7f1e6').lerp(new THREE.Color('#bdb5a6'), mood.wear * 0.4), roughness: 0.45, side: THREE.DoubleSide });
      const blush = new THREE.MeshStandardMaterial({ color: '#f1c2b4', roughness: 0.45, side: THREE.DoubleSide });
      for (let i = 0; i < n; i++) {
        const [x, z] = somewhere(1.9), size = 0.5 + random() * 0.7;
        if (i % 3 === 2) {
          const spire = s.mesh(new THREE.ConeGeometry(size * 0.4, size * 1.5, 14, 6), blush, [x, height(x, z) + size * 0.35, z]);
          const pos = spire.geometry.attributes.position as THREE.BufferAttribute;
          for (let v = 0; v < pos.count; v++) { const y = pos.getY(v), bulge = 1 + 0.16 * Math.sin(y * 16 / size); pos.setX(v, pos.getX(v) * bulge); pos.setZ(v, pos.getZ(v) * bulge); }
          spire.geometry.computeVertexNormals();
          spire.rotation.set(1.3 + random() * 0.3, random() * 6, 0);
        } else {
          const chip = s.mesh(new THREE.SphereGeometry(size, 16, 8, random() * 3, 1.3 + random() * 1.2, 0.35, 0.9 + random() * 0.4), i % 2 ? shell : blush, [x, height(x, z) + size * 0.15, z]);
          chip.rotation.set(random() * 6, random() * 6, random() * 6);
        }
      }
    } else if (a.dressing === 'minerals') {
      const heavy = new THREE.MeshStandardMaterial({ color: '#26262b', metalness: 0.5, roughness: 0.3, flatShading: true });
      const gem = (hex: string) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.15, emissive: hex, emissiveIntensity: 0.35, flatShading: true });
      for (let i = 0; i < n + 3; i++) {
        const [x, z] = somewhere(1.8), size = 0.25 + random() * 0.35;
        const crystal = s.mesh(i % 4 === 0 ? new THREE.DodecahedronGeometry(size) : new THREE.OctahedronGeometry(size), i % 4 === 0 ? gem('#b3243c') : i % 4 === 2 ? gem('#6aa83a') : heavy, [x, height(x, z) + size * 0.6, z]);
        crystal.rotation.set(random() * 6, random() * 6, random() * 6);
      }
    } else if (a.dressing === 'weed') {
      const weed = new THREE.MeshStandardMaterial({ color: new THREE.Color('#4f4a22').lerp(new THREE.Color('#2a2617'), mood.wear * 0.6), roughness: 0.4 });
      for (let i = 0; i < Math.ceil(n / 2); i++) {
        const [x, z] = somewhere(2.2), turn = random() * 6.283, points: [number, number, number][] = [];
        for (let k = 0; k < 6; k++) { const px = x + Math.cos(turn + k * 0.25) * (k - 2.5) * 0.7, pz = z + Math.sin(turn + k * 0.25) * (k - 2.5) * 0.7; if (Math.abs(px) < W / 2 - 0.3 && Math.abs(pz) < D / 2 - 0.3) points.push([px, (height(px, pz) + 0.3 + 0.12 * Math.sin(k * 2)) / 0.3, pz]); }
        if (points.length < 3) continue;
        const ribbon = s.tube(points, 0.3, weed);
        ribbon.scale.y = 0.3;
        if (i % 2 === 0) s.ball([0.22, 0.18, 0.18], [points[1][0], points[1][1] * 0.3 + 0.1, points[1][2]], weed, 10);
      }
    } else if (a.dressing === 'plastic') {
      const bright = ['#e04848', '#3f8fe0', '#f2c230', '#3fae6a', '#f4f2ea', '#ef7fb0'];
      const bits: Speck[] = [];
      for (let i = 0; i < n * 3; i++) { const [x, z] = somewhere(1.6); bits.push({ x, y: height(x, z) + 0.3, z, size: 0.22 + random() * 0.22, color: bright[i % bright.length], flat: 0.3 }); }
      s.root.add(strew(random, bits, new THREE.TetrahedronGeometry(1), new THREE.MeshStandardMaterial({ roughness: 0.3, flatShading: true })));
      const pellet = new THREE.MeshStandardMaterial({ color: '#f4f2ea', roughness: 0.25, emissive: '#f4f2ea', emissiveIntensity: 0.15 });
      for (let i = 0; i < 4; i++) { const [x, z] = somewhere(1.9); s.ball([0.45, 0.22, 0.45], [x, height(x, z) + 0.3, z], pellet, 16); }
      const rope = new THREE.MeshStandardMaterial({ color: '#1f6fd6', roughness: 0.45, emissive: '#1f6fd6', emissiveIntensity: 0.2 });
      const z0 = -4.2 + random() * 0.5;
      for (const shift of [0, 0.12]) s.tube([-5, -3, -1, 1, 3, 5].map((x, i) => [x, height(x, z0) + 0.32 + 0.2 * Math.sin(i * 1.9 + shift * 20), z0 + shift + 0.35 * Math.sin(i * 1.3)] as const), 0.07, rope);
    } else if (a.dressing === 'monoliths') {
      const quartz = new THREE.MeshStandardMaterial({ color: '#eef3f1', roughness: 0.2, transparent: true, opacity: 0.8, emissive: '#eef3f1', emissiveIntensity: 0.15 });
      for (let i = 0; i < 3 + Math.round(mood.density * 3); i++) {
        const [x, z] = i < 3 ? somewhere(2.4, true) : somewhere(2.6), size = 0.8 + random() * 0.7;
        const stone = s.mesh(lump(random, { detail: 2, amp: 0.22, chips: 5, stretch: [0.8, 1.2 + random() * 0.5, 0.75] }), quartz, [x, height(x, z) + size * 0.9, z]);
        stone.scale.setScalar(size);
        stone.rotation.set((random() - 0.5) * 0.3, random() * 6, (random() - 0.5) * 0.3);
      }
    }

    // Water.
    const wet = new THREE.MeshStandardMaterial({ color: new THREE.Color(sky.sea).lerp(new THREE.Color('#ffffff'), 0.45), transparent: true, opacity: flood ? 0.3 : 0.42, roughness: 0.03, metalness: 0.35, depthWrite: false });
    const glint = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false });
    const bubbles: Speck[] = [];
    const frontLevel = height(0, 4.6) + 0.17;
    if (film || flood) {
      const outline = new THREE.Shape();
      const back = (x: number) => (flood ? -D / 2 + 0.25 : wetLine(x));
      outline.moveTo(-W / 2 + 0.2, D / 2 - 0.2);
      for (let x = -W / 2 + 0.2; x <= W / 2 - 0.19; x += 0.4) outline.lineTo(x, back(x));
      outline.lineTo(W / 2 - 0.2, D / 2 - 0.2);
      const sheet = new THREE.ShapeGeometry(outline);
      sheet.rotateX(Math.PI / 2);
      const water = s.mesh(sheet, wet, [0, frontLevel, 0]);
      water.material.side = THREE.DoubleSide;
      water.castShadow = water.receiveShadow = false;
      for (let i = 0; i < 9; i++) {
        const x = (random() - 0.5) * (W - 3), z = flood ? (random() - 0.5) * (D - 2) : 3.2 + random() * 1.8;
        const streak = s.mesh(new THREE.CircleGeometry(1, 12), glint, [x, frontLevel + 0.02, z]);
        streak.rotation.x = -Math.PI / 2;
        streak.scale.set(0.5 + random() * 0.9, 0.06 + random() * 0.05, 1);
        streak.castShadow = false;
      }
    }
    if (film || a.water === 'foam') {
      for (let x = -W / 2 + 0.4; x < W / 2 - 0.4; x += 0.13) {
        if (random() < 0.25) continue;
        const z = wetLine(x) + (random() - 0.5) * 0.3 * (a.water === 'foam' ? 2.2 : 1), size = 0.06 + random() * random() * 0.26;
        bubbles.push({ x, y: height(x, z) + 0.2 + size * 0.5, z, size, color: '#ffffff', flat: 1 });
      }
      if (a.water === 'foam') for (let c = 0; c < 5; c++) { const [cx, cz] = somewhere(1.9); for (let i = 0; i < 16; i++) { const size = 0.08 + random() * 0.2; bubbles.push({ x: cx + (random() - 0.5) * 1.1, y: height(cx, cz) + 0.22 + size * 0.5, z: cz + (random() - 0.5) * 0.9, size, color: '#ffffff', flat: 1 }); } }
    }
    if (bubbles.length) s.root.add(strew(random, bubbles, new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.15, emissive: '#dff3f5', emissiveIntensity: 0.5 })));
    if (a.water === 'beads') {
      for (let i = 0; i < 3 + Math.round(mood.density * 3); i++) {
        const [x, z] = somewhere(2.4), size = 0.6 + random() * 0.6, y = height(x, z) + 0.12;
        const drop = s.mesh(new THREE.SphereGeometry(size, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), wet, [x, y, z]);
        drop.scale.y = 0.72;
        drop.castShadow = false;
        const shine = s.mesh(new THREE.SphereGeometry(size * 0.16, 10, 8), glint, [x - size * 0.3, y + size * 0.5, z + size * 0.35]);
        shine.castShadow = false;
        s.cylinder(size * 1.02, size * 1.02, 0.03, [x, y + 0.02, z], new THREE.MeshStandardMaterial({ color: new THREE.Color(sand.grains[0]).multiplyScalar(0.55), roughness: 0.3, transparent: true, opacity: 0.6, depthWrite: false }), 24).castShadow = false;
      }
    }

    // The blur beyond: a curved backdrop painted like something far out of focus.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    // The wall runs from y = 12 down to y = -48, far below the frame, so its lower reach reads as blurred foreground beach.
    const row = (y: number) => ((12 - y) / 60) * 1024;
    const stop = (y: number) => (12 - y) / 60;
    const fade = ctx.createLinearGradient(0, 0, 0, 1024);
    fade.addColorStop(0, sky.top);
    fade.addColorStop(stop(2.5), sky.top);
    fade.addColorStop(stop(-0.9), sky.glow);
    fade.addColorStop(stop(-1.9), sky.sea);
    fade.addColorStop(stop(-4.2), sky.sea);
    fade.addColorStop(stop(-6), sky.shore);
    const near = new THREE.Color(sand.grains[0]).lerp(new THREE.Color(sky.glow), 0.55);
    fade.addColorStop(stop(-9), near.getStyle());
    fade.addColorStop(1, near.clone().lerp(new THREE.Color(sand.grains[1]), 0.25).getStyle());
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, 1024, 1024);
    const disc = (x: number, y: number, r: number, hex: string, alpha: number) => {
      const blur = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
      const rgb = new THREE.Color(hex).getStyle().slice(4, -1);
      blur.addColorStop(0, `rgba(${rgb},${alpha})`);
      blur.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = blur;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    };
    if (a.horizon === 'sunset') disc(380 + random() * 260, row(-0.6), 52, '#fff3b8', 0.95);
    if (a.horizon === 'dusk') disc(360 + random() * 300, row(2.2), 26, '#f6f1e0', 0.95);
    if (a.horizon === 'bokeh') {
      const party = mood.cheer > 0.4 ? ['#f25f5c', '#ffd23f', '#3fa7d6', '#59cd90', '#f7a1c4', '#ffffff'] : ['#8fa3ad', '#c9b79c', '#7f9aa8', '#d9d4c7', '#a7b8a8'];
      for (let i = 0; i < 18 + Math.round(mood.density * 18); i++) disc(random() * 1024, row(1.5 - random() * 6.5), 18 + random() * 34, party[i % party.length], 0.6);
    }
    for (let i = 0; i < 30; i++) disc(random() * 1024, row(-1.9 - random() * 2.6), 5 + random() * 12, '#ffffff', a.horizon === 'storm' ? 0.12 : 0.4);
    // Out-of-focus grains in the near foreground.
    for (let i = 0; i < 40; i++) disc(random() * 1024, row(-9 - random() * 30), 20 + random() * 40, new THREE.Color(sand.grains[i % sand.grains.length]).lerp(new THREE.Color(sky.glow), 0.35).getStyle(), 0.3);
    const paint = new THREE.CanvasTexture(canvas);
    paint.colorSpace = THREE.SRGBColorSpace;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 60, 48, 1, true, 2.0, 3.3), new THREE.MeshBasicMaterial({ map: paint, side: THREE.BackSide, depthWrite: false, fog: false }));
    wall.position.y = -18;
    wall.renderOrder = -10;
    s.root.add(wall);

    const drift = mix(0.2, 1.4, mood.energy);
    world.update = (_dt, time) => {
      if (film || flood) wet.opacity = (flood ? 0.3 : 0.42) + 0.06 * Math.sin(time * drift * 2);
      if (a.story === 'wind') flying.position.x = ((time * drift * 1.5) % 1.2) - 0.6;
    };
    return world;
  },
});
