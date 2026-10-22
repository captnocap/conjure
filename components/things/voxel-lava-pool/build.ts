import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

/** One block on a metre grid: x, y, z are the block's low corner; w, h, d are fractions of a block. */
type Vox = { x: number; y: number; z: number; c: THREE.ColorRepresentation; w?: number; h?: number; d?: number };

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

/** A 32 × 32 painted fluid surface: lava is bright cells with dark crust seams, water is blue with pale ripples. */
function fluidMap(random: () => number, lava: boolean, cells: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const r = random();
      let colour: string;
      if (lava) colour = r < 0.1 ? '#ffd24a' : r < 0.55 ? '#ff8a14' : r < 0.85 ? '#e85a0c' : '#a8300a';
      else colour = r < 0.1 ? '#8fc4f5' : r < 0.7 ? '#3a7fe0' : '#2a63c0';
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, 1, 1);
    }
  if (lava) {
    ctx.fillStyle = '#3a1208';
    const seams = 3 + Math.round(random() * 4);
    for (let i = 0; i < seams; i++) {
      let x = Math.floor(random() * 32), y = Math.floor(random() * 32);
      for (let step = 0; step < 14; step++) {
        ctx.fillRect(x, y, 1, 1);
        if (random() < 0.5) x = (x + (random() < 0.5 ? 1 : -1) + 32) % 32; else y = (y + (random() < 0.5 ? 1 : -1) + 32) % 32;
      }
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(cells, cells);
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

const jitter = (base: string, random: () => number, amount = 0.035) => '#' + new THREE.Color(base).offsetHSL(0, 0, (random() - 0.5) * amount * 2).getHexString();

export default defineThing({
  questions: {
    size: score('How big is the pool?', ['A single block', 'Two blocks across', 'Three blocks across', 'A wide lake four blocks across']),
    fluid: choice('What fills it?', {
      lava: 'Glowing orange lava, smoking.',
      water: 'Cool clear blue water with a lily pad.',
    }),
    rim: choice('What is the rim made of?', {
      obsidian: 'Glossy purple-black obsidian cubes.',
      cobble: 'Rough grey cobblestone.',
      netherrack: 'Crumbly dark red hell-rock.',
      basalt: 'Dark grey basalt with a few stone blocks mixed in.',
    }),
    bridge: noul('Does a single row of stone blocks bridge across it?'),
    edge: choice('What sits at the edge of the pool?', {
      nothing: 'Nothing.',
      chest: 'A wooden chest, lid ajar, right at the brink.',
      pickaxe: 'A dropped pickaxe lying on the rim.',
      bucket: 'An iron bucket set down beside it.',
      boots: 'A pair of boots at the very edge, and nobody in them.',
      torch: 'A torch planted on the rim.',
    }),
    state: choice('What is the pool doing?', {
      calm: 'Still and quiet.',
      bubbling: 'Bubbling: blobs popping up from the surface.',
      spilling: 'Spilling over one side and running down onto the ground.',
      crusted: 'Half crusted over with dark cooled plates.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const map = pixelMap(random);
    const solid = s.material('#ffffff', { map, roughness: 0.92 });
    const lava = a.fluid === 'lava';
    const N = 1 + Math.round(a.size * 3);
    const cubes: Vox[] = [];
    const rimColour = { obsidian: '#1f1630', cobble: '#8d8f8a', netherrack: '#6e2b2b', basalt: '#3d3f42' }[a.rim];
    const rimTop = 1;
    const level = lava ? 0.78 : 0.7;
    const fluidMat = lava
      ? new THREE.MeshStandardMaterial({ map: fluidMap(random, true, N), color: '#c8c8c8', emissiveMap: fluidMap(random, true, N), emissive: '#ffffff', emissiveIntensity: mix(0.4, 0.75, 1 - mood.daylight * 0.5), roughness: 0.6 })
      : new THREE.MeshStandardMaterial({ map: fluidMap(random, false, N), color: '#ffffff', roughness: 0.2, transparent: true, opacity: 0.9 });
    const glowMat = new THREE.MeshStandardMaterial({ color: '#ffb640', emissive: '#ff7a1a', emissiveIntensity: mix(0.8, 1.8, 1 - mood.daylight * 0.5), roughness: 0.5 });
    const dark = '#2a1a12';

    // The rim ring, with the odd lowered or missing block as it wears.
    const half = N / 2;
    for (let x = -half - 1; x < half + 1; x++)
      for (let z = -half - 1; z < half + 1; z++) {
        const inside = x >= -half && x < half && z >= -half && z < half;
        if (inside) continue;
        if (random() < mood.wear * 0.12) continue;
        const colour = a.rim === 'basalt' && random() < 0.3 ? '#8d8f8a' : a.rim === 'obsidian' && random() < 0.15 ? '#8d8f8a' : rimColour;
        const h = random() < 0.25 + mood.wear * 0.3 ? 0.5 : rimTop;
        cubes.push({ x, y: 0, z, c: jitter(colour, random, a.rim === 'cobble' ? 0.08 : 0.03), h });
      }
    // The pool basin and fluid.
    cubes.push({ x: -half, y: 0, z: -half, c: dark, w: N, h: 0.2, d: N });
    const fluid = s.box([N, level, N], [0, 0.1 + level / 2, 0], fluidMat);
    void fluid;
    if (a.fluid === 'water') {
      const pads = 1 + Math.round(random() * Math.min(3, N));
      for (let i = 0; i < pads; i++) {
        const px = (random() - 0.5) * (N - 0.6), pz = (random() - 0.5) * (N - 0.6);
        s.box([0.5, 0.04, 0.5], [px, 0.1 + level + 0.02, pz], s.material('#3f8d2a', { roughness: 0.8 }));
        if (random() < 0.5) s.box([0.14, 0.14, 0.14], [px + 0.1, 0.1 + level + 0.1, pz - 0.1], s.material('#f49ac2'));
      }
      if (random() < 0.5) {
        s.box([0.18, 0.12, 0.2], [-half + 0.3, 0.1 + level + 0.06, half - 0.3], s.material('#4f9230'));
        for (const sx of [-0.05, 0.05]) s.box([0.05, 0.05, 0.05], [-half + 0.3 + sx, 0.1 + level + 0.14, half - 0.22], s.material('#17120f'));
      }
    }
    if (a.state === 'crusted')
      for (let i = 0; i < N * 2 + 1; i++) cubes.push({ x: (random() - 0.5) * (N - 0.4) - 0.25, y: 0.1 + level - 0.02, z: (random() - 0.5) * (N - 0.4) - 0.25, c: jitter(lava ? '#2a1a12' : '#e9f3ff', random, 0.05), w: 0.3 + random() * 0.5, h: 0.05, d: 0.3 + random() * 0.5 });
    if (a.bridge) {
      const row = Math.floor(random() * N) - half;
      for (let x = -half; x < half; x++) cubes.push({ x, y: 0.55, z: row, c: jitter('#8d8f8a', random, 0.08), h: 0.5 });
    }
    // Spill over one rim side, then a glowing puddle on the ground.
    if (a.state === 'spilling') {
      const side = Math.floor(random() * 4);
      const dx = [1, -1, 0, 0][side], dz = [0, 0, 1, -1][side];
      const along = Math.floor(random() * N) - half;
      const rx = dx ? (dx > 0 ? half : -half - 1) : along, rz = dz ? (dz > 0 ? half : -half - 1) : along;
      const flow = lava ? '#ff8a1f' : '#3a7fe0';
      cubes.push({ x: rx, y: 0.5, z: rz, c: flow, h: 0.5 });
      const ox = rx + dx, oz = rz + dz;
      cubes.push({ x: ox + (dx < 0 ? 0.6 : 0), y: 0, z: oz + (dz < 0 ? 0.6 : 0), c: flow, w: dx ? 0.4 : 0.6, h: 1.0, d: dz ? 0.4 : 0.6 });
      const pool = 0.9 + N * 0.35;
      s.box([pool, 0.08, pool], [ox + 0.5 + dx * (pool / 2 - 0.3), 0.06, oz + 0.5 + dz * (pool / 2 - 0.3)], lava ? glowMat : fluidMat);
    }
    // Scorched or grassy ground around the rim.
    for (let i = 0; i < 5 + Math.round(mood.density * 6); i++) {
      const ang = random() * Math.PI * 2, dist = half + 1 + random() * 1.1;
      const gx = Math.cos(ang) * dist, gz = Math.sin(ang) * dist;
      if (lava) cubes.push({ x: gx, y: 0, z: gz, c: jitter('#2a2320', random, 0.08), w: 0.4 + random() * 0.4, h: 0.05, d: 0.4 + random() * 0.4 });
      else cubes.push({ x: gx, y: 0, z: gz, c: jitter(random() < 0.3 ? '#e23b3b' : '#4f9230', random, 0.08), w: 0.1, h: 0.25 + random() * 0.25, d: 0.1 });
    }

    // At the edge.
    const corner = [[half + 0.5, half + 0.5], [-half - 0.5, half + 0.5], [half + 0.5, -half - 0.5], [-half - 0.5, -half - 0.5]][Math.floor(random() * 4)];
    const rimH = 1;
    const wood = s.material('#8a5a2b', { roughness: 0.85 });
    const iron = s.material('#9ea3a8', { metalness: 0.5, roughness: 0.45 });
    if (a.edge === 'chest') {
      s.box([0.8, 0.5, 0.7], [corner[0], rimH + 0.25, corner[1]], wood);
      const lid = s.box([0.8, 0.3, 0.7], [corner[0], rimH + 0.55, corner[1] - 0.25], wood);
      lid.rotation.x = -0.55;
      s.box([0.12, 0.14, 0.04], [corner[0], rimH + 0.45, corner[1] + 0.36], iron);
    }
    if (a.edge === 'pickaxe') {
      const pick = new THREE.Group();
      pick.add(s.box([0.07, 1.0, 0.07], [0, 0, 0], wood), s.box([0.1, 0.1, 0.7], [0, 0.5, 0], iron));
      pick.position.set(corner[0], rimH + 0.06, corner[1]);
      pick.rotation.set(Math.PI / 2, 0, random() * 2);
      s.root.add(pick);
    }
    if (a.edge === 'bucket') {
      s.cylinder(0.16, 0.13, 0.3, [corner[0], rimH + 0.15, corner[1]], iron, 10);
      s.ring(0.16, 0.015, [corner[0], rimH + 0.31, corner[1]], iron, Math.PI).rotation.x = Math.PI / 2;
    }
    if (a.edge === 'boots') for (const sx of [-0.14, 0.14]) s.box([0.18, 0.2, 0.3], [corner[0] + sx, rimH + 0.1, corner[1]], s.material('#4a2f1b'));
    if (a.edge === 'torch') {
      s.box([0.08, 0.6, 0.08], [corner[0], rimH + 0.3, corner[1]], wood);
      s.box([0.2, 0.2, 0.2], [corner[0], rimH + 0.65, corner[1]], glowMat);
    }

    // Bubbles and smoke.
    const bubbles: THREE.Mesh[] = [];
    if (a.state === 'bubbling' && lava)
      for (let i = 0; i < N + 2; i++) {
        const b = s.box([0.3, 0.3, 0.3], [(random() - 0.5) * (N - 0.4), 0.1 + level + 0.1, (random() - 0.5) * (N - 0.4)], glowMat);
        b.userData.phase = random() * 6;
        bubbles.push(b);
      }
    let smoke: THREE.InstancedMesh | null = null;
    const puffs: { x: number; z: number; phase: number; size: number }[] = [];
    if (lava) {
      const count = 6 + Math.round(mood.density * 6);
      const smokeMat = new THREE.MeshStandardMaterial({ color: '#6b6560', transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 });
      smoke = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), smokeMat, count);
      for (let i = 0; i < count; i++) puffs.push({ x: (random() - 0.5) * N * 0.6, z: (random() - 0.5) * N * 0.6, phase: i / count, size: 0.25 + random() * 0.3 });
      s.root.add(smoke);
    }
    const m = new THREE.Matrix4();
    const place = (time: number) => {
      if (!smoke) return;
      puffs.forEach((p, i) => {
        const t = ((time * (0.08 + mood.energy * 0.18) + p.phase) % 1);
        const y = 0.1 + level + t * 4.5;
        const k = p.size * (1 + t * 1.6);
        m.makeScale(k, k, k).setPosition(p.x + Math.sin(time * 0.7 + i) * 0.3 * t, y, p.z + Math.cos(time * 0.6 + i) * 0.3 * t);
        smoke!.setMatrixAt(i, m);
      });
      smoke.instanceMatrix.needsUpdate = true;
    };
    place(0);

    voxels(s, cubes, solid);
    const energy = mood.energy;
    return s.finish({
      update: (_dt, time) => {
        place(time);
        for (const b of bubbles) {
          const t = Math.max(0, Math.sin(time * (1.5 + energy * 2) + b.userData.phase));
          b.scale.setScalar(0.2 + t);
          b.position.y = 0.1 + level + 0.05 + t * 0.2;
        }
        if (lava) fluidMat.emissiveIntensity = mix(0.4, 0.75, 1 - mood.daylight * 0.5) * (0.94 + Math.sin(time * 3) * 0.06 * (0.3 + energy));
      },
    });
  },
});
