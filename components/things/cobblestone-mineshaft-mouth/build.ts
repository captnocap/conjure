import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

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

/** A stone-brick face: pale mortar lines over grey blocks. */
function brickMap(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const mortar = y % 8 === 7 || (x + (y >= 8 ? 4 : 0)) % 8 === 7;
      const v = mortar ? 120 : Math.round(mix(170, 215, random()));
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

const jitter = (base: string, random: () => number, amount = 0.035) => '#' + new THREE.Color(base).offsetHSL(0, 0, (random() - 0.5) * amount * 2).getHexString();

export default defineThing({
  questions: {
    surface: choice('What is the hillside made of?', {
      grass: 'Green grass over brown dirt.',
      snow: 'A white snow cap over frozen dirt.',
      sand: 'Pale sand and sandstone, a desert dig.',
      stone: 'Bare grey mountain stone all the way up.',
    }),
    frame: choice('What frames the opening?', {
      timber: 'Two oak props and a lintel beam.',
      brick: 'A ring of stone bricks.',
      barred: 'Timber props with iron bars across the mouth, locked up.',
      raw: 'Nothing, a raw hole hacked into the hill.',
    }),
    inside: choice('What shows inside the tunnel?', {
      torchlight: 'A torch burning on the wall, warm light on the stone.',
      ore: 'A glint of ore in the dark walls.',
      water: 'Water flooding the tunnel floor.',
      nothing: 'Nothing, only dark.',
    }),
    cart: choice('Is there a mine cart at the mouth?', {
      none: 'No cart.',
      empty: 'An empty cart waiting on the rail.',
      loaded: 'A cart heaped with coal and ore.',
      tipped: 'A cart tipped on its side, load spilled.',
    }),
    rail: noul('Does a run of mine-cart rail come out of the mouth?'),
    pile: choice('What is piled beside the entrance?', {
      nothing: 'Nothing.',
      cobble: 'A heap of grey cobblestone blocks.',
      coal: 'A heap of black coal.',
      sign: 'A lone wooden sign on a post.',
      tools: 'A pickaxe and shovel leaning against the hill.',
      lantern: 'A lit lantern on a post.',
    }),
    state: choice('What has happened at the entrance?', {
      quiet: 'Nothing: it is tidy and in use.',
      collapsed: 'A rockfall of rubble half blocks the mouth and a prop has snapped.',
      overgrown: 'Vines and grass hang over the opening; nobody has been here in years.',
      cobwebbed: 'Cobwebs fill the corners and bones lie at the threshold.',
      busy: 'Freshly worked: extra torches planted outside and footprints in the dirt.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const map = pixelMap(random);
    const solid = s.material('#ffffff', { map, roughness: 0.92 });
    const brick = s.material('#ffffff', { map: brickMap(random), roughness: 0.85 });
    const glowMat = new THREE.MeshStandardMaterial({ color: '#ffd978', emissive: '#ffb640', emissiveIntensity: mix(0.7, 1.8, 1 - mood.daylight), roughness: 0.6 });
    const gemMat = new THREE.MeshStandardMaterial({ color: '#8fe8f0', emissive: '#3fc4d8', emissiveIntensity: 0.9, roughness: 0.3 });
    const cubes: Vox[] = [];
    const bricks: Vox[] = [];
    const glows: Vox[] = [];
    const gems: Vox[] = [];

    const palette = {
      grass: { cap: '#5fa83a', body: '#7a5230', base: '#8d8f8a', capDepth: 1 },
      snow: { cap: '#eef1f4', body: '#6e4d32', base: '#8d8f8a', capDepth: 1 },
      sand: { cap: '#e2cf8f', body: '#d4b978', base: '#c9a95f', capDepth: 1 },
      stone: { cap: '#8d8f8a', body: '#8d8f8a', base: '#767873', capDepth: 0 },
    }[a.surface];
    const tunnelStone = '#5f615d';
    const warmStone = '#8a6a48';

    // The chunk: x -3..3, z -4..0, stepping up toward the back. The tunnel runs from the +z face inward.
    const W = 3, D = 4;
    const heightAt = (z: number) => (z <= -3 ? 5 : 4);
    const inTunnel = (x: number, y: number, z: number) => x >= -1 && x < 1 && y >= 0 && y < 2 && z >= -3 && z < 0;
    const has = (x: number, y: number, z: number) => x >= -W && x < W && z >= -D && z < 0 && y >= 0 && y < heightAt(z) && !inTunnel(x, y, z);
    for (let x = -W; x < W; x++)
      for (let z = -D; z < 0; z++)
        for (let y = 0; y < heightAt(z); y++) {
          if (inTunnel(x, y, z)) continue;
          const enclosed = has(x + 1, y, z) && has(x - 1, y, z) && has(x, y + 1, z) && has(x, y - 1, z) && has(x, y, z + 1) && has(x, y, z - 1) && y > 0;
          if (enclosed) continue;
          const top = y === heightAt(z) - 1;
          const touchesTunnel = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([dx, dy, dz]) => inTunnel(x + dx, y + dy, z + dz));
          const ringsMouth = z === -1 && touchesTunnel && a.frame === 'brick';
          let colour = top && palette.capDepth ? palette.cap : y === 0 ? palette.base : palette.body;
          if (touchesTunnel && !top) colour = a.inside === 'torchlight' ? warmStone : tunnelStone;
          if (a.surface === 'grass' && !top && random() < mood.wear * 0.15) colour = '#6b5a3a';
          const vox = { x, y, z, c: jitter(colour, random) };
          if (ringsMouth) bricks.push({ ...vox, c: jitter('#a4a7a1', random, 0.03) });
          else cubes.push(vox);
          // A grass lip hangs over the dirt below the cap.
          if (top && a.surface === 'grass' && y > 0) {
            if (!has(x + 1, y, z)) cubes.push({ x: x + 1, y: y + 0.75, z, c: jitter('#4f9230', random), w: 0.06, h: 0.25, d: 1 });
            if (!has(x, y, z + 1)) cubes.push({ x, y: y + 0.75, z: z + 1, c: jitter('#4f9230', random), w: 1, h: 0.25, d: 0.06 });
          }
        }
    // Tunnel floor and the shaft dropping away, with the ladder on the back wall.
    cubes.push({ x: -1, y: 0, z: -3, c: tunnelStone, w: 2, h: 0.08, d: 3 });
    cubes.push({ x: -0.5, y: 0.085, z: -2.6, c: '#07070b', w: 1, h: 0.02, d: 0.9 });
    const ladderWood = s.material('#8a5a2b');
    for (const x of [-0.35, 0.35]) s.box([0.06, 1.9, 0.06], [x, 0.95, -2.9], ladderWood);
    for (let i = 0; i < 6; i++) s.box([0.76, 0.05, 0.05], [0, 0.2 + i * 0.3, -2.9], ladderWood);

    // Framing.
    const oak = s.material('#8a5a2b', { roughness: 0.85 });
    const iron = s.material('#5a5d60', { metalness: 0.5, roughness: 0.5 });
    if (a.frame === 'timber' || a.frame === 'barred') {
      const snapped = a.state === 'collapsed';
      s.box([0.26, 2.3, 0.26], [-1.15, 1.15, 0.14], oak);
      if (snapped) {
        const stub = s.box([0.26, 0.9, 0.26], [1.15, 0.45, 0.14], oak);
        void stub;
        const fallen = s.box([0.26, 1.4, 0.26], [1.6, 0.4, 0.9], oak);
        fallen.rotation.set(0.4, 0, -1.1);
      } else s.box([0.26, 2.3, 0.26], [1.15, 1.15, 0.14], oak);
      s.box([2.9, 0.3, 0.3], [0, 2.4, 0.14], oak);
      if (!snapped) for (const z of [-1, -2]) { s.box([0.2, 2.0, 0.2], [-1.0, 1.0, z - 0.5], oak); s.box([0.2, 2.0, 0.2], [1.0, 1.0, z - 0.5], oak); s.box([2.2, 0.2, 0.2], [0, 1.95, z - 0.5], oak); }
    }
    if (a.frame === 'barred') for (let i = 0; i < 5; i++) s.box([0.06, 2.1, 0.06], [-0.8 + i * 0.4, 1.05, 0.05], iron);
    if (a.frame === 'barred') s.box([1.9, 0.06, 0.06], [0, 1.3, 0.08], iron);

    // Inside the tunnel.
    let torch: THREE.Mesh | null = null;
    if (a.inside === 'torchlight') {
      s.box([0.08, 0.5, 0.08], [-0.88, 1.2, -1.6], oak);
      torch = s.box([0.2, 0.2, 0.2], [-0.88, 1.5, -1.6], glowMat);
    }
    if (a.inside === 'ore')
      for (let i = 0; i < 7; i++) {
        const side = random() < 0.5 ? -1 : 1;
        gems.push({ x: side * 0.98 + (side < 0 ? -0.1 : 0), y: 0.2 + random() * 1.5, z: -2.8 + random() * 2.4, c: i % 3 ? '#8fe8f0' : '#ffd24a', w: 0.12, h: 0.22, d: 0.22 });
      }
    if (a.inside === 'water') {
      // Kept short so the dark back of the tunnel still shows above the flood from a raised view.
      const water = new THREE.MeshStandardMaterial({ color: '#3a7fe0', transparent: true, opacity: 0.6, roughness: 0.15, depthWrite: false });
      s.box([2.0, 0.3, 2.3], [0, 0.2, -1.25], water);
    }

    // Rail and cart.
    const railZ = a.rail ? 2.6 : 0.4;
    if (a.rail || a.cart !== 'none') {
      for (let z = -2.6; z < railZ; z += 0.55) s.box([1.3, 0.08, 0.2], [0, 0.04, z], s.material('#6b4a2e'));
      for (const x of [-0.38, 0.38]) s.box([0.08, 0.07, railZ + 2.9], [x, 0.115, (railZ - 2.9) / 2], iron);
    }
    if (a.cart !== 'none') {
      const cartMat = s.material('#4a4d50', { metalness: 0.4, roughness: 0.6 });
      const cart = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 1.05), cartMat);
      body.position.y = 0.5;
      body.castShadow = body.receiveShadow = true;
      cart.add(body);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.5, 0.9), s.material('#2a2c2e'));
      inner.position.y = 0.6;
      cart.add(inner);
      for (const x of [-0.42, 0.42]) for (const z of [-0.32, 0.32]) { const wheel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.24), iron); wheel.position.set(x, 0.22, z); wheel.castShadow = true; cart.add(wheel); }
      if (a.cart === 'loaded' || a.cart === 'tipped')
        for (let i = 0; i < 9; i++) {
          const lump = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), i % 4 === 0 ? s.material('#c9a23a', { metalness: 0.5, roughness: 0.4 }) : s.material('#1e1d1f'));
          lump.position.set((random() - 0.5) * 0.6, 0.78 + (i < 4 ? 0.2 : 0), (random() - 0.5) * 0.7);
          lump.castShadow = true;
          cart.add(lump);
        }
      cart.position.set(0, 0, a.rail ? 1.5 : 0.75);
      if (a.cart === 'tipped') {
        cart.rotation.z = Math.PI / 2 - 0.1;
        cart.position.set(0.7, 0.1, a.rail ? 1.9 : 1.1);
        for (let i = 0; i < 7; i++) s.box([0.2, 0.2, 0.2], [1.2 + random() * 0.8, 0.1, 0.8 + random() * 1.4], s.material('#1e1d1f'));
      }
      s.root.add(cart);
    }

    // Piles beside the entrance.
    const px = random() < 0.5 ? -2.2 : 2.2;
    if (a.pile === 'cobble') for (let i = 0; i < 7; i++) cubes.push({ x: px + (random() - 0.5) * 0.9 - 0.25, y: i < 4 ? 0 : 0.5, z: 0.3 + random() * 0.9, c: jitter('#8d8f8a', random, 0.08), w: 0.5, h: 0.5, d: 0.5 });
    if (a.pile === 'coal') for (let i = 0; i < 9; i++) cubes.push({ x: px + (random() - 0.5) * 1.0 - 0.2, y: i < 5 ? 0 : 0.4, z: 0.3 + random() * 0.9, c: jitter('#1e1d1f', random, 0.05), w: 0.4, h: 0.4, d: 0.4 });
    if (a.pile === 'sign') {
      s.box([0.08, 1.1, 0.08], [px, 0.55, 0.8], oak);
      s.label(['MINE', 'KEEP OUT', 'DANGER', 'SHAFT 7'][Math.floor(random() * 4)], 1.1, 0.5, [px, 1.3, 0.84], '#2a2320', '#c9a06a');
      s.box([1.14, 0.54, 0.06], [px, 1.3, 0.8], oak);
    }
    if (a.pile === 'tools') {
      const pick = new THREE.Group();
      pick.add(s.box([0.07, 1.0, 0.07], [0, 0.5, 0], oak), s.box([0.1, 0.1, 0.7], [0, 0.98, 0], iron));
      pick.position.set(px * 0.75, 0.05, 0.25); pick.rotation.z = px > 0 ? 0.3 : -0.3;
      s.root.add(pick);
      const shovel = new THREE.Group();
      shovel.add(s.box([0.07, 1.0, 0.07], [0, 0.5, 0], oak), s.box([0.26, 0.3, 0.05], [0, 0.1, 0], iron));
      shovel.position.set(px * 0.75 + (px > 0 ? 0.35 : -0.35), 0.05, 0.25); shovel.rotation.z = px > 0 ? 0.35 : -0.35;
      s.root.add(shovel);
    }
    if (a.pile === 'lantern') {
      s.box([0.08, 1.4, 0.08], [px, 0.7, 0.8], oak);
      s.box([0.4, 0.06, 0.06], [px + (px > 0 ? -0.15 : 0.15), 1.42, 0.8], oak);
      glows.push({ x: px + (px > 0 ? -0.42 : 0.18), y: 1.0, z: 0.68, c: '#ffd978', w: 0.24, h: 0.3, d: 0.24 });
      s.box([0.28, 0.04, 0.28], [px + (px > 0 ? -0.3 : 0.3), 1.32, 0.8], iron);
    }

    // The state of the place.
    if (a.state === 'collapsed')
      for (let i = 0; i < 10; i++) cubes.push({ x: -0.9 + random() * 1.6 - 0.25, y: i < 6 ? 0 : 0.5, z: -0.6 + random() * 1.2, c: jitter(i % 3 ? '#8d8f8a' : palette.body, random, 0.08), w: 0.5, h: 0.5, d: 0.5 });
    if (a.state === 'overgrown') {
      for (let i = 0; i < 9; i++) cubes.push({ x: -1.4 + random() * 2.7, y: 2.0 - random() * 1.6, z: 0.02, c: jitter('#3f8a2f', random, 0.08), w: 0.1, h: 1.0 + random() * 1.2, d: 0.08 });
      for (let i = 0; i < 12; i++) cubes.push({ x: -3 + random() * 6, y: 0, z: 0.1 + random() * 1.5, c: jitter('#5fa83a', random, 0.08), w: 0.1, h: 0.3 + random() * 0.3, d: 0.1 });
    }
    if (a.state === 'cobwebbed') {
      const web = new THREE.MeshStandardMaterial({ color: '#f4f4f0', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
      for (const x of [-0.98, 0.98]) { const w = s.mesh(new THREE.PlaneGeometry(0.7, 0.7), web, [x + (x < 0 ? 0.35 : -0.35), 1.65, -0.3]); w.rotation.y = x < 0 ? 0.4 : -0.4; }
      const bone = s.material('#efe9d8');
      s.box([0.5, 0.08, 0.08], [0.4, 0.04, 0.5], bone).rotation.y = 0.5;
      s.box([0.26, 0.26, 0.26], [-0.3, 0.13, 0.6], bone);
      s.box([0.06, 0.06, 0.02], [-0.37, 0.16, 0.74], s.material('#17120f'));
      s.box([0.06, 0.06, 0.02], [-0.23, 0.16, 0.74], s.material('#17120f'));
    }
    if (a.state === 'busy') {
      for (const x of [-1.9, 1.9]) { s.box([0.08, 0.6, 0.08], [x, 0.3, 0.7], oak); glows.push({ x: x - 0.1, y: 0.6, z: 0.6, c: '#ffd978', w: 0.2, h: 0.2, d: 0.2 }); }
      for (let i = 0; i < 8; i++) cubes.push({ x: -0.6 + random() * 1.2, y: 0, z: 0.4 + i * 0.3, c: jitter(palette.body, random, 0.05), w: 0.22, h: 0.02, d: 0.3 });
    }
    // Pebbles and tufts on top, more when the scene is cluttered.
    for (let i = 0; i < Math.round(mix(2, 8, mood.density)); i++) {
      const z = -D + random() * D, x = -W + random() * W * 2;
      const y = heightAt(Math.floor(z));
      if (a.surface === 'grass') cubes.push({ x, y, z, c: jitter(random() < 0.3 ? '#e23b3b' : '#4f9230', random), w: 0.1, h: 0.25 + random() * 0.2, d: 0.1 });
      else cubes.push({ x, y, z, c: jitter(palette.base, random, 0.1), w: 0.2, h: 0.14, d: 0.2 });
    }

    voxels(s, cubes, solid);
    voxels(s, bricks, brick);
    voxels(s, glows, glowMat);
    voxels(s, gems, gemMat);
    const energy = mood.energy;
    const phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        glowMat.emissiveIntensity = mix(0.7, 1.8, 1 - mood.daylight) * (0.92 + Math.sin(time * 8 + phase) * 0.08 * (0.3 + energy));
        if (torch) torch.scale.setScalar(1 + Math.sin(time * 9 + phase) * 0.1);
      },
    });
  },
});
