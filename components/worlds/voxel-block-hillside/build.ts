import * as THREE from 'three';
import { Sculpture, choice, defineWorld, diorama, mix } from '@conjure/kit';

/** One block on a metre grid: x, y, z are the block's low corner; w, h, d are fractions of a block. */
type Vox = { x: number; y: number; z: number; c: THREE.ColorRepresentation; w?: number; h?: number; d?: number };

function pixelMap(random: () => number, low = 0.84) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const v = Math.round(255 * mix(low, 1, random()));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1, 1);
    }
  const map = new THREE.CanvasTexture(canvas);
  map.magFilter = map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  return map;
}

function voxels(s: Sculpture, cubes: readonly Vox[], material: THREE.Material) {
  if (!cubes.length) return null;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, cubes.length);
  const m = new THREE.Matrix4();
  cubes.forEach((v, i) => {
    const w = v.w ?? 1, h = v.h ?? 1, d = v.d ?? 1;
    m.makeScale(w, h, d).setPosition(v.x + w / 2, v.y + h / 2, v.z + d / 2);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(v.c));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor!.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  s.root.add(mesh);
  return mesh;
}

const jitter = (base: string, random: () => number, amount = 0.03) => '#' + new THREE.Color(base).offsetHSL(0, 0, (random() - 0.5) * amount * 2).getHexString();

// The terrain: x in [-8, 8), z in [-6, 6). Level 0 stands at y = 0; terraces rise toward the back left,
// and for z <= -3 the plateau drops three blocks sheer: the dirt cliff, facing the camera's side.
const X0 = -8, X1 = 8, Z0 = -6, Z1 = 6;
const level = (x: number, z: number) => {
  let h = 0;
  if (x <= 3 && z <= 4 && z > -3) h = 1;
  if (x <= 1 && z <= 2 && z > -3) h = 2;
  if (x <= -2 && z <= -1) h = 3;
  return h;
};
const POND = { x0: 3, x1: 6, z0: 1, z1: 4 };
const inPond = (x: number, z: number) => x >= POND.x0 && x < POND.x1 && z >= POND.z0 && z < POND.z1;
const SLOTS: readonly (readonly [number, number, number, number])[] = [[-5, -3.5, 3, 1], [-4, 0.5, 2, 0.8], [1.5, -4.5, 0, 0.8], [-3, 3, 1, 0.7], [6.5, -1.5, 0, 0.7]];

const SKIES = {
  day: { say: 'A flat clear blue sky with a square sun.', bg: '#8ec5f5' },
  sunset: { say: 'An orange and pink evening sky, the square sun low.', bg: '#f0a878' },
  night: { say: 'A deep blue night with square stars and a square moon; torches lit on the terraces.', bg: '#33427a' },
  overcast: { say: 'A pale grey overcast sky, no sun.', bg: '#c9d3dc' },
} as const;

export default defineWorld({
  questions: {
    sky: choice('What is the sky doing?', Object.fromEntries(Object.entries(SKIES).map(([k, v]) => [k, v.say])) as Record<keyof typeof SKIES, string>),
    biome: choice('What kind of country is it?', {
      meadow: 'Bright green grass with square flowers.',
      forest: 'Darker grass and many cube trees crowding the edges.',
      autumn: 'Yellowed grass, orange and red tree canopies, fallen leaf blocks.',
      snow: 'Snow-capped blocks and spruce trees dusted white.',
      desert: 'Sand-topped blocks, sandstone and cactus columns.',
    }),
    pond: choice('What fills the square pond?', {
      water: 'Clear blue water with a lily pad.',
      ice: 'A frozen sheet of pale ice.',
      dry: 'Nothing: a dry cracked-mud pit.',
      lava: 'Glowing orange lava, a thread of smoke above it.',
    }),
    ore: choice('What glints in the cut edge of the ground?', {
      coal: 'Black coal flecks.',
      iron: 'Tan iron flecks.',
      gold: 'Glowing gold nuggets.',
      diamond: 'Glowing cyan diamonds.',
      redstone: 'Glowing red dust veins.',
      mixed: 'A bit of everything, a rich seam.',
    }),
    cliff: choice('What marks the dirt cliff?', {
      bare: 'Bare dirt and gravel.',
      cave: 'A dark square cave mouth at its foot.',
      waterfall: 'A column of water pouring from the top into a puddle.',
      ladder: 'A wooden ladder up the face.',
      stairs: 'Rough stair blocks cut up the side.',
    }),
    built: choice('What has someone built here?', {
      nothing: 'Nothing: untouched.',
      hut: 'A small plank hut with a door and a torch.',
      fence: 'A fence along the cliff top.',
      path: 'A cobblestone path with torches winding up the terraces.',
      farm: 'Tilled rows of wheat on a lower terrace.',
      campfire: 'A ring of logs and a campfire at the cliff foot.',
    }),
    clouds: choice('What are the clouds like?', {
      blocks: 'Chunky cube clouds.',
      slabs: 'Flat one-block-thick sheets.',
      none: 'A clear sky.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const sky = SKIES[a.sky];
    const { art: s, world } = diorama(context, {
      background: sky.bg, floor: null, width: 16, depth: 12, maxHeight: 4.6, radius: 1.6, pitch: 34, yaw: 30, slots: SLOTS,
    });
    const map = pixelMap(random);
    const solid = s.material('#ffffff', { map, roughness: 0.92 });
    const glowMat = new THREE.MeshStandardMaterial({ color: '#ffd978', emissive: '#ffb640', emissiveIntensity: a.sky === 'night' ? 1.8 : 0.9, roughness: 0.6 });
    const oreGlow = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.4 });
    const cubes: Vox[] = [];
    const glows: Vox[] = [];
    const ores: Vox[] = [];

    const biome = {
      meadow: { cap: '#5fa83a', dirt: '#7a5230', leaf: '#4f9a2f', trunk: '#6b4a2e', trees: 2 },
      forest: { cap: '#4f9230', dirt: '#6e4a2c', leaf: '#2f6b33', trunk: '#4a3321', trees: 5 },
      autumn: { cap: '#b89a3a', dirt: '#7a5230', leaf: '#d2812c', trunk: '#6b4a2e', trees: 3 },
      snow: { cap: '#eef1f4', dirt: '#6e4d32', leaf: '#2f6b33', trunk: '#4a3321', trees: 3 },
      desert: { cap: '#e2cf8f', dirt: '#d4b978', leaf: '#4f9230', trunk: '#3f8d2a', trees: 2 },
    }[a.biome];
    const stone = '#8d8f8a';

    // Terrain blocks: dirt columns capped with the biome's surface, and the cut strip of stone below.
    const caveCell = (x: number, y: number, z: number) => a.cliff === 'cave' && x >= -4 && x <= -2 && z >= -5 && z <= -4 && y >= 0 && y < 2;
    const lavaRim = (x: number, z: number) => a.pond === 'lava' && !inPond(x, z) && x >= POND.x0 - 1 && x <= POND.x1 && z >= POND.z0 - 1 && z <= POND.z1;
    for (let x = X0; x < X1; x++)
      for (let z = Z0; z < Z1; z++) {
        const h = level(x, z);
        const cliffFace = x === -2 && z <= -3;
        for (let y = -1; y < h; y++) {
          const top = y === h - 1;
          if (top && inPond(x, z)) continue;
          if (caveCell(x, y, z)) continue;
          if (top && lavaRim(x, z) && random() < 0.6) { cubes.push({ x, y, z, c: jitter('#2a2320', random) }); continue; }
          let colour = biome.dirt;
          if (cliffFace && random() < 0.35) colour = random() < 0.5 ? '#8a8378' : stone;
          if (a.biome === 'desert' && top) colour = biome.cap;
          if (top && a.biome !== 'desert') {
            cubes.push({ x, y, z, c: jitter(colour, random), h: 0.7 });
            cubes.push({ x, y: y + 0.7, z, c: jitter(biome.cap, random, 0.04), h: 0.3 });
          } else cubes.push({ x, y, z, c: jitter(colour, random) });
        }
        // Below the dirt, at the two cut faces the camera sees, stone with ore.
        if (x === X1 - 1 || z === Z1 - 1)
          for (let y = -4; y < -1; y++) {
            cubes.push({ x, y, z, c: jitter(a.biome === 'desert' ? '#c9a95f' : stone, random, 0.05) });
            if (random() < 0.22) {
              const kinds = a.ore === 'mixed' ? (['coal', 'iron', 'gold', 'diamond', 'redstone'] as const) : ([a.ore] as const);
              const kind = kinds[Math.floor(random() * kinds.length)];
              const tint = { coal: '#1e1d1f', iron: '#c9a27a', gold: '#ffd24a', diamond: '#8fe8f0', redstone: '#ff3a3a' }[kind];
              const list = kind === 'coal' || kind === 'iron' ? cubes : ores;
              const u = 0.15 + random() * 0.5, v = 0.15 + random() * 0.5;
              if (x === X1 - 1) list.push({ x: x + 0.98, y: y + v, z: z + u, c: tint, w: 0.05, h: 0.3, d: 0.3 });
              else list.push({ x: x + u, y: y + v, z: z + 0.98, c: tint, w: 0.3, h: 0.3, d: 0.05 });
            }
          }
      }

    // The square pond.
    const px = POND.x0, pz = POND.z0, pw = POND.x1 - POND.x0, pd = POND.z1 - POND.z0;
    const basin = { water: '#d9c58a', ice: '#cfe0ea', dry: '#5e4530', lava: '#3a2a22' }[a.pond];
    cubes.push({ x: px, y: -1, z: pz, c: basin, w: pw, h: 0.5, d: pd });
    let lavaMat: THREE.MeshStandardMaterial | null = null;
    if (a.pond === 'water') {
      s.box([pw, 0.35, pd], [px + pw / 2, -0.33, pz + pd / 2], new THREE.MeshStandardMaterial({ color: '#3a7fe0', roughness: 0.15, transparent: true, opacity: 0.85 }));
      for (let i = 0; i < 2; i++) cubes.push({ x: px + 0.3 + random() * (pw - 1), y: -0.15, z: pz + 0.3 + random() * (pd - 1), c: '#3f8d2a', w: 0.5, h: 0.04, d: 0.5 });
      cubes.push({ x: px + 1.2, y: -0.11, z: pz + 1.1, c: '#f49ac2', w: 0.16, h: 0.16, d: 0.16 });
    }
    if (a.pond === 'ice') {
      cubes.push({ x: px, y: -0.5, z: pz, c: '#d6ecf7', w: pw, h: 0.4, d: pd });
      for (let i = 0; i < 4; i++) cubes.push({ x: px + random() * (pw - 0.8), y: -0.1, z: pz + random() * pd, c: '#ffffff', w: 0.8, h: 0.01, d: 0.05 });
    }
    if (a.pond === 'dry') {
      for (let i = 0; i < 6; i++) cubes.push({ x: px + random() * (pw - 0.9), y: -0.5, z: pz + random() * (pd - 0.1), c: '#3a2a1a', w: 0.9, h: 0.01, d: 0.06 });
      cubes.push({ x: px + 1.4, y: -0.5, z: pz + 1.4, c: '#b8a26a', w: 0.08, h: 0.7, d: 0.08 });
    }
    if (a.pond === 'lava') {
      lavaMat = new THREE.MeshStandardMaterial({ color: '#ff8a14', emissive: '#ff6a10', emissiveIntensity: 0.8, roughness: 0.6 });
      s.box([pw, 0.35, pd], [px + pw / 2, -0.33, pz + pd / 2], lavaMat);
    }

    // The cliff.
    const oak = '#8a5a2b';
    if (a.cliff === 'cave') {
      // The hollow is three blocks deep; a near-black block set back inside it reads as the dark throat.
      cubes.push({ x: -3.98, y: 0.02, z: -4.98, c: '#0b0a10', w: 2.3, h: 1.96, d: 1.96 });
      for (const z of [-5.1, -3.1]) cubes.push({ x: -1.1, y: 0, z, c: oak, w: 0.2, h: 2.1, d: 0.2 });
      cubes.push({ x: -1.15, y: 2.0, z: -5.15, c: oak, w: 0.3, h: 0.25, d: 2.3 });
    }
    const waterMat = new THREE.MeshStandardMaterial({ color: '#3a7fe0', roughness: 0.15, transparent: true, opacity: 0.85 });
    if (a.cliff === 'waterfall') {
      cubes.push({ x: -3, y: 2.7, z: -5, c: '#3a7fe0', w: 1, h: 0.3, d: 1 });
      s.box([0.5, 3.2, 0.9], [-0.72, 1.6, -4.5], waterMat);
      s.box([2.2, 0.12, 2.2], [-0.4, 0.06, -4.5], waterMat);
      for (let i = 0; i < 5; i++) cubes.push({ x: -1.4 + random() * 1.8, y: 0.1, z: -5.5 + random() * 2, c: '#eaf4ff', w: 0.15, h: 0.08, d: 0.15 });
    }
    if (a.cliff === 'ladder') {
      for (const z of [-4.8, -4.2]) cubes.push({ x: -1.02, y: 0, z, c: oak, w: 0.08, h: 3.2, d: 0.08 });
      for (let i = 0; i < 9; i++) cubes.push({ x: -1.04, y: 0.25 + i * 0.34, z: -4.85, c: oak, w: 0.06, h: 0.07, d: 0.7 });
    }
    if (a.cliff === 'stairs') {
      cubes.push({ x: -1, y: 0, z: -4, c: jitter(stone, random), h: 2 });
      cubes.push({ x: -1, y: 2, z: -4, c: jitter(stone, random), h: 0.5 });
      cubes.push({ x: 0, y: 0, z: -4, c: jitter(stone, random), h: 1 });
      cubes.push({ x: 0, y: 1, z: -4, c: jitter(stone, random), h: 0.5 });
      cubes.push({ x: 1, y: 0, z: -4, c: jitter(stone, random), h: 0.5 });
    }

    // Trees and cacti along the back and left edges.
    const treeSpots: [number, number][] = [[-7.5, -5.5], [-7.5, -1.5], [3, -5.5], [6, -5.5], [7, -3.5], [-7.5, 4.5], [-5.5, -5.5]];
    const treeCount = Math.min(treeSpots.length, biome.trees + Math.round(mood.density * 2));
    for (let i = 0; i < treeCount; i++) {
      const [tx, tz] = treeSpots[i];
      const gx = Math.floor(tx), gz = Math.floor(tz);
      const base = level(gx, gz);
      if (a.biome === 'desert') {
        const th = 2 + Math.round(random() * 2);
        cubes.push({ x: gx + 0.25, y: base, z: gz + 0.25, c: jitter(biome.trunk, random), w: 0.5, h: th, d: 0.5 });
        if (random() < 0.7) { cubes.push({ x: gx + 0.75, y: base + 1, z: gz + 0.3, c: biome.trunk, w: 0.5, h: 0.4, d: 0.4 }); cubes.push({ x: gx + 0.85, y: base + 1, z: gz + 0.3, c: biome.trunk, w: 0.4, h: 1.2, d: 0.4 }); }
        continue;
      }
      const th = 2 + Math.round(random() * 2);
      for (let y = 0; y < th; y++) cubes.push({ x: gx, y: base + y, z: gz, c: jitter(biome.trunk, random) });
      const spruce = a.biome === 'snow' || (a.biome === 'forest' && random() < 0.5);
      const leafColour = () => {
        const c = new THREE.Color(biome.leaf);
        if (a.biome === 'autumn' && random() < 0.4) c.set('#c23b2a');
        c.offsetHSL(0, 0, (random() - 0.5) * 0.08);
        return '#' + c.getHexString();
      };
      if (spruce) {
        for (let layer = 0; layer < 3; layer++) {
          const r = 2 - layer;
          for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (Math.abs(dx) + Math.abs(dz) <= r + (layer === 0 ? 1 : 0) && (Math.max(Math.abs(dx), Math.abs(dz)) === r || random() < 0.7)) cubes.push({ x: gx + dx, y: base + th - 1 + layer * 1, z: gz + dz, c: leafColour() });
          if (a.biome === 'snow') for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (Math.abs(dx) + Math.abs(dz) <= r && random() < 0.5) cubes.push({ x: gx + dx, y: base + th + layer, z: gz + dz, c: '#eef1f4', h: 0.2 });
        }
        cubes.push({ x: gx, y: base + th + 2, z: gz, c: leafColour() });
      } else {
        for (let dy = 0; dy < 3; dy++) {
          const r = dy === 1 ? 2 : 1;
          for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (!(Math.abs(dx) === r && Math.abs(dz) === r && random() < 0.5)) cubes.push({ x: gx + dx, y: base + th - 1 + dy, z: gz + dz, c: leafColour() });
        }
        if (a.biome === 'autumn') for (let i = 0; i < 5; i++) cubes.push({ x: gx + (random() - 0.5) * 4, y: base, z: gz + (random() - 0.5) * 4, c: leafColour(), w: 0.35, h: 0.06, d: 0.35 });
      }
    }

    // Grass tufts and flowers, more when the mood is cheerful.
    const tufts = Math.round(mix(4, 22, mood.cheer));
    for (let i = 0; i < tufts; i++) {
      const x = X0 + random() * (X1 - X0), z = Z0 + random() * (Z1 - Z0);
      if (inPond(Math.floor(x), Math.floor(z))) continue;
      if (SLOTS.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 1.6)) continue;
      const y = level(Math.floor(x), Math.floor(z));
      if (a.biome === 'desert') { cubes.push({ x, y, z, c: '#b8a26a', w: 0.1, h: 0.3, d: 0.1 }); continue; }
      if (a.biome === 'snow') { cubes.push({ x, y, z, c: '#8d8f8a', w: 0.3, h: 0.15, d: 0.3 }); continue; }
      cubes.push({ x, y, z, c: '#3f8d2a', w: 0.08, h: 0.35, d: 0.08 });
      if (random() < 0.6) cubes.push({ x: x - 0.1, y: y + 0.35, z: z - 0.1, c: ['#e23b3b', '#f4d53a', '#f08ac0', '#ffffff'][Math.floor(random() * 4)], w: 0.28, h: 0.2, d: 0.28 });
    }

    // Built things.
    const torchAt = (x: number, y: number, z: number) => {
      cubes.push({ x: x - 0.05, y, z: z - 0.05, c: oak, w: 0.1, h: 0.6, d: 0.1 });
      glows.push({ x: x - 0.11, y: y + 0.6, z: z - 0.11, c: '#ffd978', w: 0.22, h: 0.22, d: 0.22 });
    };
    if (a.built === 'hut') {
      const plank = '#b88a4a', cobbleC = stone;
      const hx = 5, hz = -6, base = 0;
      for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) cubes.push({ x: hx + x, y: base, z: hz + z, c: jitter(cobbleC, random, 0.08) });
      for (let y = 1; y < 3; y++) for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) if (x === 0 || x === 2 || z === 0 || z === 2) cubes.push({ x: hx + x, y: base + y, z: hz + z, c: jitter(plank, random) });
      cubes.push({ x: hx - 0.2, y: base + 3, z: hz - 0.2, c: jitter('#6b4a2e', random), w: 3.4, h: 0.5, d: 3.4 });
      cubes.push({ x: hx + 1.1, y: base + 1, z: hz + 2.98, c: '#3a2a1a', w: 0.8, h: 1.8, d: 0.06 });
      cubes.push({ x: hx + 0.2, y: base + 1.6, z: hz + 2.98, c: '#8fd4ff', w: 0.6, h: 0.6, d: 0.06 });
      torchAt(hx + 2.5, base + 1.2, hz + 3.2);
    }
    if (a.built === 'fence') {
      const posts: [number, number][] = [];
      for (let x = -7.5; x <= -1.5; x += 1) posts.push([x, -0.5]);
      for (let z = -1.5; z >= -5.5; z -= 1) posts.push([-1.5, z]);
      for (const [x, z] of posts) cubes.push({ x: x - 0.08, y: 3, z: z - 0.08, c: oak, w: 0.16, h: 1, d: 0.16 });
      for (let i = 0; i < posts.length - 1; i++) {
        const [ax, az] = posts[i], [bx, bz] = posts[i + 1];
        for (const y of [3.4, 3.8]) cubes.push({ x: Math.min(ax, bx) - 0.04, y, z: Math.min(az, bz) - 0.04, c: oak, w: Math.abs(bx - ax) + 0.08, h: 0.1, d: Math.abs(bz - az) + 0.08 });
      }
    }
    if (a.built === 'path') {
      const route: [number, number][] = [[0, 5], [0, 4], [0, 3], [-1, 3], [-1, 2], [-1, 1], [-1, 0], [-2, 0], [-3, 0], [-3, -1], [-3, -2]];
      for (const [x, z] of route) {
        const y = level(x, z);
        cubes.push({ x: x + 0.05, y, z: z + 0.05, c: jitter(stone, random, 0.1), w: 0.9, h: 0.08, d: 0.9 });
      }
      for (const [x, z] of [[0, 4], [-1, 2], [-3, -1]] as [number, number][]) {
        const lower = level(x, z + 1), upper = level(x, z);
        if (upper > lower) cubes.push({ x, y: lower, z: z + 1, c: jitter(stone, random, 0.1), h: 0.5 });
      }
      for (const [x, z] of [[0.9, 4.5], [-0.1, 1.5], [-2.1, -0.5]] as [number, number][]) torchAt(x, level(Math.floor(x), Math.floor(z)), z);
    }
    if (a.built === 'farm') {
      for (let x = -7; x <= -3; x++) {
        for (let z = 3; z <= 4; z++) cubes.push({ x, y: 1, z, c: jitter('#4a3520', random), w: 1, h: 0.06, d: 1 });
        for (let z = 3; z <= 4; z++) for (const o of [0.25, 0.65]) cubes.push({ x: x + o, y: 1.06, z: z + 0.3, c: mood.warmth > 0.5 ? '#d9b24a' : '#6fb04a', w: 0.1, h: 0.5 + random() * 0.3, d: 0.1 });
      }
      s.box([5, 0.1, 0.5], [-4.5, 1.0, 2.6], waterMat);
    }
    let fire: Vox | null = null;
    if (a.built === 'campfire') {
      const cx = 3, cz = -4.5;
      for (const [dx, dz] of [[-0.9, -0.5], [0.9, -0.5], [0, 0.9]]) cubes.push({ x: cx + dx - 0.5, y: 0, z: cz + dz - 0.2, c: oak, w: 1, h: 0.4, d: 0.4 });
      cubes.push({ x: cx - 0.4, y: 0, z: cz - 0.15, c: '#2a2320', w: 0.8, h: 0.15, d: 0.3 });
      cubes.push({ x: cx - 0.15, y: 0, z: cz - 0.4, c: '#2a2320', w: 0.3, h: 0.15, d: 0.8 });
      fire = { x: cx - 0.2, y: 0.15, z: cz - 0.2, c: '#ffb640', w: 0.4, h: 0.5, d: 0.4 };
      glows.push(fire);
    }
    // Torches on the terraces at night.
    if (a.sky === 'night') for (const [x, z] of [[-2.5, -1.5], [1.5, 2.5], [-7.5, 1.5], [3.5, 4.5]]) torchAt(x, level(Math.floor(x), Math.floor(z)), z);

    // Sky: a square sun or moon and stars sit far back, written without depth so they never widen the
    // frame; clouds keep to the right half of the sky, where the terrain is low, so they never cross the hero.
    const sunX = 1 + mood.daylight * 7;
    const skyMat = (colour: string, emissive: string, intensity: number) => new THREE.MeshStandardMaterial({ color: colour, emissive, emissiveIntensity: intensity, depthWrite: false });
    if (a.sky === 'day') s.box([1.4, 1.4, 1.4], [sunX, 9, -7], skyMat('#ffe66a', '#ffd94a', 1.2));
    if (a.sky === 'sunset') s.box([1.6, 1.6, 1.6], [sunX + 1, 7, -7], skyMat('#ff9a3a', '#ff7a2a', 1.3));
    let stars: THREE.InstancedMesh | null = null;
    if (a.sky === 'night') {
      s.box([1.3, 1.3, 1.3], [3, 9.5, -8], skyMat('#e8ecf0', '#c8d0dc', 0.7));
      const starCubes: Vox[] = [];
      for (let i = 0; i < 40; i++) {
        const k = 0.12 + random() * 0.16;
        starCubes.push({ x: -1 + random() * 12, y: 7.5 + random() * 4, z: -9 - random() * 2, c: '#ffffff', w: k, h: k, d: k });
      }
      stars = voxels(s, starCubes, new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1, depthWrite: false }));
    }
    type Cloud = { x: number; z: number; y: number; cubes: Vox[] };
    const cloudList: Cloud[] = [];
    let clouds: THREE.InstancedMesh | null = null;
    let cloudTotal = 0;
    if (a.clouds !== 'none') {
      const count = 2 + Math.round(mood.density * 3);
      for (let i = 0; i < count; i++) {
        const w = 3 + Math.round(random() * 3), d = 2 + Math.round(random() * 2);
        const cloud: Cloud = { x: -2 + random() * 10, z: -9 + random() * 4, y: 7.5 + random() * 1.5, cubes: [] };
        for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) if (!((x === 0 || x === w - 1) && (z === 0 || z === d - 1) && random() < 0.5)) cloud.cubes.push({ x, y: 0, z, c: '#ffffff', h: a.clouds === 'slabs' ? 0.5 : 1 });
        if (a.clouds === 'blocks') for (let j = 0; j < 2; j++) cloud.cubes.push({ x: 1 + Math.floor(random() * Math.max(1, w - 2)), y: 1, z: Math.floor(random() * d), c: '#ffffff' });
        cloudList.push(cloud);
        cloudTotal += cloud.cubes.length;
      }
      const cloudMat = new THREE.MeshStandardMaterial({ color: a.sky === 'night' ? '#aab4cc' : a.sky === 'sunset' ? '#ffd6c0' : '#ffffff', roughness: 1 });
      clouds = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), cloudMat, cloudTotal);
      clouds.castShadow = true;
      s.root.add(clouds);
    }
    const m = new THREE.Matrix4();
    const placeClouds = (time: number) => {
      if (!clouds) return;
      const drift = time * mix(0.05, 0.35, mood.energy);
      let i = 0;
      for (const cloud of cloudList) {
        const cx = ((cloud.x + drift + 4) % 16) - 4;
        for (const c of cloud.cubes) {
          const h = c.h ?? 1;
          m.makeScale(1, h, 1).setPosition(cx + c.x + 0.5, cloud.y + c.y + h / 2, cloud.z + c.z + 0.5);
          clouds.setMatrixAt(i++, m);
        }
      }
      clouds.instanceMatrix.needsUpdate = true;
      clouds.computeBoundingSphere();
    };
    placeClouds(0);

    // Night lighting: dim and cool the diorama's lights so the torches carry the scene.
    if (a.sky === 'night') {
      for (const node of s.root.children) {
        if (node instanceof THREE.DirectionalLight) { node.intensity *= node === world.keyLight ? 0.4 : 0.6; node.color.lerp(new THREE.Color('#9fb0ff'), 0.6); }
        if (node instanceof THREE.HemisphereLight) { node.intensity *= 0.55; node.color.set('#8d9bd8'); node.groundColor.set('#2a2f45'); }
      }
    }
    if (a.sky === 'overcast') for (const node of s.root.children) if (node instanceof THREE.DirectionalLight && node === world.keyLight) { node.intensity *= 0.7; node.color.set('#e8ecf2'); }
    if (a.sky === 'sunset') for (const node of s.root.children) if (node instanceof THREE.DirectionalLight && node === world.keyLight) node.color.lerp(new THREE.Color('#ffb070'), 0.6);

    const terrain = voxels(s, cubes, solid)!;
    voxels(s, glows, glowMat);
    voxels(s, ores, oreGlow);
    world.ground = terrain;
    const smoke: THREE.Mesh[] = [];
    if (a.pond === 'lava' || a.built === 'campfire') {
      const smokeMat = new THREE.MeshStandardMaterial({ color: '#6b6560', transparent: true, opacity: 0.45, depthWrite: false, roughness: 1 });
      const origin = a.pond === 'lava' ? [px + pw / 2, 0, pz + pd / 2] : [3, 0.5, -4.5];
      for (let i = 0; i < 5; i++) {
        const puff = s.mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), smokeMat, [origin[0], origin[1], origin[2]]);
        puff.userData.phase = i / 5;
        puff.userData.origin = origin;
        smoke.push(puff);
      }
    }
    const baseUpdate = world.update;
    world.update = (dt, time) => {
      baseUpdate?.(dt, time);
      placeClouds(time);
      const energy = mood.energy;
      smoke.forEach((puff, i) => {
        const t = (time * (0.1 + energy * 0.15) + puff.userData.phase) % 1;
        const o = puff.userData.origin as number[];
        puff.position.set(o[0] + Math.sin(time + i) * 0.3 * t, o[1] + t * 4, o[2] + Math.cos(time * 0.8 + i) * 0.3 * t);
        puff.scale.setScalar(0.6 + t * 1.8);
      });
      glowMat.emissiveIntensity = (a.sky === 'night' ? 1.8 : 0.9) * (0.92 + Math.sin(time * 8) * 0.08 * (0.3 + energy));
      if (lavaMat) lavaMat.emissiveIntensity = 0.8 + Math.sin(time * 3) * 0.1;
      void stars; void fire;
    };
    return world;
  },
});
