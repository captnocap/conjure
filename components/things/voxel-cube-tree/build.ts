import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

/** One block on a metre grid: x, y, z are the block's low corner; w, h, d are fractions of a block. */
type Vox = { x: number; y: number; z: number; c: THREE.ColorRepresentation; w?: number; h?: number; d?: number };

/** A 16 × 16 brightness-noise texture, nearest-filtered, so every face looks pixel painted. */
function pixelMap(random: () => number, low = 0.82) {
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

/** Every block of one material in a single instanced draw. */
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

const shade = (base: string, amount: number) => '#' + new THREE.Color(base).offsetHSL(0, 0, amount).getHexString();

export default defineThing({
  questions: {
    kind: choice('What kind of tree is it?', {
      oak: 'An oak: a brown square trunk under a round, lumpy green canopy.',
      spruce: 'A spruce: a tall stepped cone of dark green tiers, like a pixel Christmas tree.',
      birch: 'A birch: a pale white trunk with dark bars and a lighter, narrower crown.',
      blossom: 'A cherry in blossom: a puffy pink and white canopy.',
      dead: 'A dead tree: a grey bare trunk with a few stubby branch blocks and no leaves.',
    }),
    trunk: score('How tall is the trunk?', ['Two blocks, a sapling', 'Three blocks', 'Four blocks', 'Five blocks', 'Six blocks, a tall one']),
    canopy: score('How big is the canopy?', ['A tight little crown', 'A medium crown', 'A broad crown', 'A huge crown wider than it is tall']),
    chopped: noul('Has a block been chopped out of the trunk, leaving the top floating?'),
    hanging: choice('What hangs in the leaves?', {
      nothing: 'Nothing, only leaves.',
      apples: 'Red apples dotted through the lower leaves.',
      lanterns: 'Glowing yellow paper lanterns on short chains.',
      swing: 'A rope swing with a plank seat hanging from one side.',
      beehive: 'A striped bee nest tucked under the canopy.',
    }),
    foot: choice('What is at the foot of the tree?', {
      nothing: 'Bare ground.',
      sapling: 'A single tiny sapling growing beside it.',
      mushrooms: 'A cluster of red and brown block mushrooms.',
      litter: 'A scatter of fallen leaf blocks on the ground.',
      stump: 'The stump of a felled neighbour and a dropped log.',
      flowers: 'A patch of square red and yellow flowers.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const map = pixelMap(random);
    const solid = s.material('#ffffff', { map, roughness: 0.9 });
    const glow = new THREE.MeshStandardMaterial({ color: '#ffd978', emissive: '#ffb640', emissiveIntensity: mix(0.6, 1.6, 1 - mood.daylight), roughness: 0.6 });
    const cubes: Vox[] = [];
    const lamps: Vox[] = [];
    const T = 2 + Math.round(a.trunk * 4);
    const r = 1 + Math.round(a.canopy * 2);
    const autumn = Math.max(0, mood.warmth - 0.55) / 0.45;
    const trunkColour = { oak: '#6b4a2e', spruce: '#4a3321', birch: '#e8e4d6', blossom: '#5a4030', dead: '#5a5550' }[a.kind];
    const leafBase = { oak: '#4f9a2f', spruce: '#2f6b33', birch: '#8ec44a', blossom: '#f3a6c8', dead: '#777' }[a.kind];
    const leaf = () => {
      let c = new THREE.Color(leafBase);
      if (a.kind === 'oak' || a.kind === 'birch') c.lerp(new THREE.Color('#d2812c'), autumn * (0.5 + random() * 0.5));
      if (a.kind === 'blossom' && random() < 0.3) c = new THREE.Color('#fdd7e6');
      c.offsetHSL(0, 0, (random() - 0.5) * 0.08 + (mood.cheer - 0.5) * 0.06);
      if (random() < mood.wear * 0.2) c.lerp(new THREE.Color('#7a6a3a'), 0.6);
      return '#' + c.getHexString();
    };
    const holes = 0.08 + mood.wear * 0.3;

    // Trunk.
    const chopAt = a.chopped ? 1 : -1;
    for (let y = 0; y < T; y++) if (y !== chopAt) cubes.push({ x: 0, y, z: 0, c: shade(trunkColour, (random() - 0.5) * 0.04) });
    if (a.kind === 'birch')
      for (let i = 0; i < T * 2; i++) {
        const y = random() * (T - 0.2);
        if (Math.floor(y) === chopAt) continue;
        const side = Math.floor(random() * 4);
        const bar: Vox = { x: 0, y, z: 0, c: '#2d2a26', h: 0.12 };
        if (side === 0) Object.assign(bar, { z: 0.98, d: 0.04, x: random() * 0.5, w: 0.3 + random() * 0.3 });
        if (side === 1) Object.assign(bar, { z: -0.02, d: 0.04, x: random() * 0.5, w: 0.3 + random() * 0.3 });
        if (side === 2) Object.assign(bar, { x: 0.98, w: 0.04, z: random() * 0.5, d: 0.3 + random() * 0.3 });
        if (side === 3) Object.assign(bar, { x: -0.02, w: 0.04, z: random() * 0.5, d: 0.3 + random() * 0.3 });
        cubes.push(bar);
      }

    // Canopy.
    const bottom: Vox[] = []; // lowest leaf blocks, where things hang from
    const addLeaf = (x: number, y: number, z: number, shell: boolean) => {
      if (shell && random() < holes) return;
      const v = { x, y, z, c: leaf() };
      cubes.push(v);
      bottom.push(v);
    };
    let top = T;
    if (a.kind === 'oak' || a.kind === 'birch' || a.kind === 'blossom') {
      const rx = a.kind === 'birch' ? Math.max(1, r - 0.5) : r;
      const ry = a.kind === 'birch' ? r + 1 : r;
      const cy = T + ry - 1;
      for (let dy = -ry; dy <= ry; dy++)
        for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++)
          for (let z = -Math.ceil(rx); z <= Math.ceil(rx); z++) {
            const dist = (x * x + z * z) / ((rx + 0.5) ** 2) + (dy * dy) / ((ry + 0.5) ** 2);
            if (dist > 1) continue;
            if (x === 0 && z === 0 && cy + dy < T) continue;
            addLeaf(x, cy + dy, z, dist > 0.55);
          }
      top = cy + ry + 1;
    }
    if (a.kind === 'spruce') {
      let y = Math.max(1, T - 1);
      for (let tier = 0; tier <= r; tier++) {
        const rad = r - tier;
        // A square tier, then a smaller diamond above it, so the cone steps in like pixel art.
        for (let x = -rad; x <= rad; x++) for (let z = -rad; z <= rad; z++) if (!(x === 0 && z === 0 && y < T)) addLeaf(x, y, z, Math.abs(x) === rad && Math.abs(z) === rad);
        y++;
        const inner = rad - 1;
        if (inner >= 0) for (let x = -inner; x <= inner; x++) for (let z = -inner; z <= inner; z++) if (Math.abs(x) + Math.abs(z) <= inner && !(x === 0 && z === 0 && y < T)) addLeaf(x, y, z, Math.abs(x) + Math.abs(z) === inner && inner > 0);
        y++;
      }
      cubes.push({ x: 0, y: y - 1, z: 0, c: leaf() });
      top = y;
    }
    if (a.kind === 'dead') {
      // Gaunt half-block limbs reaching out and up, so the silhouette is a tree and not a boulder.
      const arms = 2 + Math.round(random() * 2);
      const used = new Set<number>();
      for (let i = 0; i < arms; i++) {
        const side = [0, 1, 2, 3].filter((k) => !used.has(k))[Math.floor(random() * (4 - used.size))];
        used.add(side);
        const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][side];
        const y = Math.max(1, T - 2 - Math.floor(random() * Math.max(1, T - 2)));
        const reach = 1.5 + Math.round(random() * 2) * 0.5;
        const dark = shade(trunkColour, -0.04);
        if (dir[0]) cubes.push({ x: dir[0] > 0 ? 1 : -reach, y: y + 0.25, z: 0.25, c: dark, w: reach, h: 0.5, d: 0.5 });
        else cubes.push({ x: 0.25, y: y + 0.25, z: dir[1] > 0 ? 1 : -reach, c: dark, w: 0.5, h: 0.5, d: reach });
        const ex = dir[0] ? (dir[0] > 0 ? reach + 0.5 : -reach) : 0.25, ez = dir[1] ? (dir[1] > 0 ? reach + 0.5 : -reach) : 0.25;
        cubes.push({ x: ex, y: y + 0.5, z: ez, c: shade(trunkColour, 0.03), w: 0.5, h: 1 + Math.round(random()) , d: 0.5 });
        if (random() < 0.5) cubes.push({ x: ex + 0.1, y: y + 1.5, z: ez + 0.1, c: shade(trunkColour, 0.06), w: 0.3, h: 0.6, d: 0.3 });
      }
      cubes.push({ x: 0.25, y: T, z: 0.25, c: shade(trunkColour, 0.03), w: 0.5, d: 0.5, h: 1.2 });
      cubes.push({ x: 0.35, y: T + 1.2, z: 0.35, c: shade(trunkColour, 0.06), w: 0.3, d: 0.3, h: 0.7 });
      top = T + 2;
    }
    // What hangs from the lowest leaf blocks.
    const lowest = bottom.filter((v) => !bottom.some((o) => o.x === v.x && o.z === v.z && o.y < v.y));
    const pick = (n: number) => [...lowest].sort(() => random() - 0.5).slice(0, n);
    const chains: THREE.Mesh[] = [];
    const swings: THREE.Group[] = [];
    if (a.kind !== 'dead' && a.hanging === 'apples')
      for (const v of pick(3 + Math.round(random() * 6))) cubes.push({ x: v.x + 0.3, y: v.y - 0.2, z: v.z + 0.3, c: random() < 0.8 ? '#d22a2a' : '#e8c02e', w: 0.4, h: 0.4, d: 0.4 });
    if (a.kind !== 'dead' && a.hanging === 'lanterns')
      for (const v of pick(2 + Math.round(random() * 3))) {
        lamps.push({ x: v.x + 0.28, y: v.y - 0.95, z: v.z + 0.28, c: '#ffd978', w: 0.44, h: 0.5, d: 0.44 });
        chains.push(s.rod([v.x + 0.5, v.y, v.z + 0.5], [v.x + 0.5, v.y - 0.45, v.z + 0.5], 0.02, s.material('#2a2622')));
      }
    if (a.kind !== 'dead' && a.hanging === 'swing' && lowest.length) {
      const edge = [...lowest].sort((p, q) => Math.hypot(q.x, q.z) - Math.hypot(p.x, p.z))[0];
      const drop = Math.max(1.2, edge.y - 0.6);
      const g = new THREE.Group();
      const rope = s.material('#b8a37a');
      const dx = edge.x + 0.5, dz = edge.z + 0.5;
      for (const side of [-0.3, 0.3]) g.add(s.rod([dx + side, edge.y, dz], [dx + side, edge.y - drop, dz], 0.02, rope));
      const plank = s.box([0.9, 0.08, 0.3], [dx, edge.y - drop, dz], s.material('#8b5a2b'));
      g.add(plank);
      s.root.add(g);
      swings.push(g);
    }
    if (a.kind !== 'dead' && a.hanging === 'beehive' && lowest.length) {
      const v = pick(1)[0];
      cubes.push({ x: v.x + 0.1, y: v.y - 0.9, z: v.z + 0.1, c: '#d8b45a', w: 0.8, h: 0.9, d: 0.8 });
      for (let i = 0; i < 3; i++) cubes.push({ x: v.x + 0.08, y: v.y - 0.8 + i * 0.3, z: v.z + 0.08, c: '#5a4218', w: 0.84, h: 0.1, d: 0.84 });
    }

    // At the foot.
    const dirt = '#7a5230';
    if (a.foot === 'sapling') {
      const sx = 1.3 + random() * 0.6, sz = (random() < 0.5 ? -1 : 1) * (0.8 + random() * 0.5);
      cubes.push({ x: sx, y: 0, z: sz, c: trunkColour, w: 0.3, h: 0.7, d: 0.3 });
      cubes.push({ x: sx - 0.2, y: 0.6, z: sz - 0.2, c: leaf(), w: 0.7, h: 0.6, d: 0.7 });
    }
    if (a.foot === 'mushrooms')
      for (let i = 0; i < 3 + Math.round(random() * 3); i++) {
        const mx = 0.9 + random() * 1.6, mz = (random() - 0.5) * 2.6, h = 0.3 + random() * 0.4;
        cubes.push({ x: mx, y: 0, z: mz, c: '#e9dcc0', w: 0.2, h, d: 0.2 });
        cubes.push({ x: mx - 0.15, y: h, z: mz - 0.15, c: random() < 0.6 ? '#c9302c' : '#9b6b3a', w: 0.5, h: 0.22, d: 0.5 });
      }
    if (a.foot === 'litter')
      for (let i = 0; i < 10 + Math.round(random() * 14); i++) {
        const ang = random() * Math.PI * 2, dist = 0.9 + random() * (r + 1.5);
        cubes.push({ x: Math.cos(ang) * dist + 0.5, y: 0, z: Math.sin(ang) * dist + 0.5, c: leaf(), w: 0.35, h: 0.08, d: 0.35 });
      }
    if (a.foot === 'stump') {
      cubes.push({ x: 1.6, y: 0, z: -0.8, c: trunkColour, w: 1, h: 0.45, d: 1 });
      cubes.push({ x: 1.65, y: 0.45, z: -0.75, c: shade(trunkColour, 0.12), w: 0.9, h: 0.02, d: 0.9 });
      cubes.push({ x: 1.2, y: 0, z: 0.9, c: shade(trunkColour, -0.03), w: 1.6, h: 0.6, d: 0.6 });
    }
    if (a.foot === 'flowers')
      for (let i = 0; i < 6 + Math.round(random() * 6); i++) {
        const fx = (random() - 0.5) * 4.5, fz = (random() - 0.5) * 4.5;
        if (Math.hypot(fx, fz) < 0.9) continue;
        cubes.push({ x: fx, y: 0, z: fz, c: '#3f8d2a', w: 0.1, h: 0.4, d: 0.1 });
        cubes.push({ x: fx - 0.1, y: 0.4, z: fz - 0.1, c: random() < 0.5 ? '#e23b3b' : '#f4d53a', w: 0.3, h: 0.25, d: 0.3 });
      }
    // Patches of dirt where the roots lift the turf, and the chopped block dropped as an item.
    for (let i = 0; i < 2 + Math.round(mood.wear * 3); i++) cubes.push({ x: (random() - 0.5) * 2.2, y: 0, z: (random() - 0.5) * 2.2, c: dirt, w: 0.4 + random() * 0.4, h: 0.06, d: 0.4 + random() * 0.4 });
    let item: THREE.Mesh | null = null;
    if (a.chopped) {
      item = s.box([0.42, 0.42, 0.42], [1.1, 0.3, 0.9], s.material(trunkColour, { map }));
      item.rotation.y = 0.6;
    }

    voxels(s, cubes, solid);
    voxels(s, lamps, glow);
    const energy = mood.energy;
    const phase = random() * 6;
    return s.finish({
      footprint: 0.7,
      update: (_dt, time) => {
        if (item) { item.position.y = 0.26 + Math.sin(time * 2 + phase) * 0.08; item.rotation.y = time * (0.6 + energy); }
        for (const g of swings) g.rotation.z = Math.sin(time * 1.3 + phase) * 0.08 * (0.3 + energy);
        glow.emissiveIntensity = mix(0.6, 1.6, 1 - mood.daylight) * (0.9 + Math.sin(time * 7 + phase) * 0.1 * energy);
        void chains; void top;
      },
    });
  },
});
