import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type Xf = { p: [number, number, number]; r: [number, number, number]; s?: [number, number, number]; c: THREE.Color };

function instances(root: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: Xf[], shadow = true) {
  if (!list.length) { geometry.dispose(); material.dispose(); return null; }
  const mesh = new THREE.InstancedMesh(geometry, material, list.length);
  const d = new THREE.Object3D();
  d.rotation.order = 'YXZ';
  list.forEach((it, i) => {
    d.position.set(...it.p);
    d.rotation.set(...it.r);
    d.scale.set(...(it.s ?? [1, 1, 1]));
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
    mesh.setColorAt(i, it.c);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  root.add(mesh);
  return mesh;
}

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const SEASONS = {
  winter: ['#5a3d2b', '#6a2f3a', '#4a392b', '#7a6238', '#3f3326', '#5c2a36'],
  bloom: ['#7a4a78', '#8a5a8c', '#5c6a34', '#6a5a3a', '#6d3f6a', '#4f5a30'],
  burnt: ['#221f1d', '#2c2622', '#3a3430', '#5f5a52', '#1c1a19', '#6f8a3a'],
  autumn: ['#a8682c', '#b47a38', '#7c4528', '#6a2f3a', '#96582a', '#6f5530'],
} as const;

export default defineWorld({
  questions: {
    weather: choice('What is the weather doing?', {
      drizzle: 'Fine soft drizzle hanging in the air, everything beaded and grey.',
      mist: 'Thick mist swallowing the hill; no rain, no horizon.',
      driving: 'Hard slanting rain driven across the bog by the wind.',
      clearing: 'The cloud is breaking: one pale shaft of light comes down on the moor.',
      after: 'The rain has just stopped; the pools are bright with sky.',
    }),
    season: choice('What colour is the heather?', {
      winter: 'Winter: brown, rust and wine, nothing in flower.',
      bloom: 'Late summer: the whole bog hazed purple with ling in bloom.',
      burnt: 'Spring after burning: black charred patches with sharp green shoots coming through.',
      autumn: 'Autumn: deer-grass turned orange and fox-red.',
    }),
    pools: choice('How does the water lie?', {
      few: 'A few round black pools between the hummocks.',
      chain: 'A wandering chain of small pools, like dropped beads.',
      lochan: 'One wide dark lochan across the foreground, with hummock islands.',
      drained: 'Drained: the pools are empty hollows of bare cracking peat.',
    }),
    cuttings: choice('Has the turf been cut here?', {
      old: 'Old hand cuttings: a stepped bank across the back, slumped and grown over, and a long flooded trench.',
      fresh: 'A working bank: clean black steps, and rows of little footed turf stacks drying on the cutaway.',
      milled: 'Industrial: the far ground is stripped to bare brown peat, ruled with drains, with a long stockpile.',
      none: 'Never cut: unbroken bog to the foot of the hill.',
    }),
    hill: choice('What shape is the hill behind?', {
      whaleback: 'A long low rounded whaleback.',
      table: 'A flat-topped table mountain with scree skirts.',
      cone: 'A single pale quartzite cone.',
      none: 'No hill at all: the bog runs flat into the cloud.',
    }),
    trace: choice('What sign of people is there?', {
      none: 'None at all.',
      fence: 'A line of leaning fence posts and slack wire crossing the bog.',
      cottage: 'A small white cottage far off with a thread of turf smoke.',
      poles: 'Telegraph poles leaning away along an unseen road.',
      sheep: 'A scatter of sheep with dye marks on their backs.',
    }),
    kept: choice('What is the peat keeping, shown in its cut edge?', {
      nothing: 'Only layer on layer of dark peat.',
      oak: 'Black trunks and stumps of a drowned forest.',
      track: 'The log ends of an ancient timber trackway.',
      hoard: 'A small hoard of gold, never found.',
      sleeper: 'A curled sleeping figure, tanned and whole.',
    }),
    view: choice('Where is the eye?', {
      low: 'Almost at ground level, among the heather.',
      walker: 'At the height of someone standing on a hummock.',
      raven: 'Higher, looking down on the pattern of pools.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => lo + (hi - lo) * random();
    const C = (hex: string) => new THREE.Color(hex);
    const W = 12.5, D = 9.5;
    const sky = C({ drizzle: '#c6cbca', mist: '#d5d8d5', driving: '#b3b9bb', clearing: '#d3d6cf', after: '#cdd3d4' }[a.weather]);
    sky.lerp(C('#d8c9b4'), Math.max(0, mood.warmth - 0.5) * 0.3).lerp(C('#b9bcc6'), Math.abs(mood.daylight - 0.5) * 0.25);
    const slots: [number, number, number?, number?][] = [[0, 0.8], [-2.9, -1.1], [1.7, -1.0], [-3.9, 2.4, 0, 0.7], [4.8, 2.1, 0, 0.7]];
    const { art: s, world } = diorama(context, {
      background: `#${sky.getHexString()}`, floor: null, width: W, depth: D, maxHeight: 3.6, radius: 1.6,
      pitch: { low: 12, walker: 17, raven: 30 }[a.view], yaw: 20, slots,
    });
    const root = s.root;
    // Overcast: soften the stock key light and let the sky do the lighting.
    const bright = a.weather === 'clearing' ? 1 : a.weather === 'after' ? 0.75 : a.weather === 'driving' ? 0.3 : 0.5;
    root.traverse((node) => {
      const light = node as THREE.Light;
      if (!light.isLight) return;
      if ((light as THREE.HemisphereLight).isHemisphereLight) light.intensity = 1.5;
      else if (light === world.keyLight) light.intensity = mix(1.1, 2.4, bright);
      else light.intensity = 0.5;
    });

    // --- Terrain -------------------------------------------------------------------------
    const ph = [rr(0, 6), rr(0, 6), rr(0, 6), rr(0, 6)];
    const noise = (x: number, z: number) => Math.sin(x * 1.3 + ph[0]) * Math.cos(z * 1.7 + ph[1]) * 0.5 + Math.sin(x * 2.9 + z * 1.1 + ph[2]) * 0.3 + Math.sin(z * 3.7 - x * 0.7 + ph[3]) * 0.2;
    const pools: { x: number; z: number; rx: number; rz: number; rect?: boolean }[] = [];
    const clearOfSlots = (x: number, z: number, gap: number) => slots.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > gap);
    const bankFront = a.cuttings === 'none' ? -99 : -2.9;
    if (a.pools === 'lochan') pools.push({ x: 2.2, z: 3.4, rx: 3.8, rz: 1.4 }, { x: -1.2, z: 3.9, rx: 1.8, rz: 0.8 }, { x: -5.2, z: 0.5, rx: 0.8, rz: 0.5 });
    else {
      const want = a.pools === 'chain' ? 8 : a.pools === 'drained' ? 4 : 4;
      for (let i = 0, tries = 0; pools.length < want && tries < 200; tries++) {
        const chain = a.pools === 'chain';
        const t = pools.length / (want - 1);
        const x = chain ? mix(-5.4, 5.4, t) + rr(-0.4, 0.4) : rr(-5.5, 5.5);
        const z = chain ? 2.1 + Math.sin(t * 5 + ph[0]) * 1.3 + rr(-0.3, 0.3) : rr(Math.max(-4, bankFront + 1.0), 4);
        const rx = chain ? rr(0.4, 0.7) : rr(0.7, 1.25), rz = rx * rr(0.5, 0.75);
        if (!clearOfSlots(x, z, chain ? 1.4 : 1.6 + rx * 0.5)) { if (chain) i++; if (chain && i > 40) break; continue; }
        if (pools.some((p) => Math.hypot(p.x - x, p.z - z) < p.rx + rx + 0.2)) continue;
        pools.push({ x, z, rx, rz });
      }
    }
    // A straight flooded trench: the signature of hand cutting.
    if (a.cuttings === 'old' || a.cuttings === 'fresh') pools.push({ x: -2.2, z: 4.05, rx: 3.6, rz: 0.36, rect: true });
    const wetness = (x: number, z: number) => {
      let w = 0;
      for (const p of pools) {
        const d = p.rect ? Math.max(Math.abs(x - p.x) / p.rx, Math.abs(z - p.z) / p.rz) : Math.hypot((x - p.x) / p.rx, (z - p.z) / p.rz) + noise(x * 2, z * 2) * 0.12;
        w = Math.max(w, p.rect ? (d < 1 ? 1 : 0) : 1 - smooth(0.8, 1.15, d));
      }
      return w;
    };
    const stand = (x: number, z: number) => { let f = 1; for (const [sx, sz, , size = 1] of slots) f = Math.min(f, smooth(1.0 * size, 2.0 * size, Math.hypot(x - sx, z - sz))); return f; };
    const steps = a.cuttings === 'fresh' ? [[-2.9, 0.32], [-3.25, 0.64], [-3.6, 0.96]] : a.cuttings === 'old' ? [[-2.9, 0.5], [-3.6, 0.95]] : a.cuttings === 'milled' ? [[-2.9, 0.1]] : [];
    const bankTop = (z: number) => { let y = 0; for (const [front, top] of steps) if (z < front) y = top; return y; };
    const ground = (x: number, z: number) => {
      const f = stand(x, z);
      const lump = (noise(x, z) * 0.11 + 0.06 + noise(x * 2.3 + 4, z * 2.1) * 0.04) * f;
      return lump - wetness(x, z) * 0.26 * Math.max(f, 0.0);
    };
    const height = (x: number, z: number) => (z < bankFront ? bankTop(z) : ground(x, z));

    const palette = SEASONS[a.season].map((hex) => C(hex).lerp(C('#8b8275'), (1 - mood.cheer) * 0.15));
    const mossTints = ['#6f7d32', '#8e4a34', '#9a8a3c', '#5d6b2e'].map(C);
    const bare = C(a.season === 'burnt' ? '#1d1a18' : '#2a211b');
    const NX = 90, NZ = 72;
    const terrain = new THREE.PlaneGeometry(W, D, NX, NZ);
    terrain.rotateX(-Math.PI / 2);
    const tp = terrain.attributes.position;
    const colours = new Float32Array(tp.count * 3);
    const tintOf = new THREE.Color();
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i);
      const edge = Math.abs(x) > W / 2 - 0.01 || Math.abs(z) > D / 2 - 0.01;
      const wet = wetness(x, z);
      tp.setY(i, edge ? -0.22 : z < bankFront ? -0.05 : ground(x, z));
      const pick = Math.floor((noise(x * 1.7 + 9, z * 1.9 - 3) * 0.5 + 0.5) * palette.length * 0.999 + random() * 0.8) % palette.length;
      tintOf.copy(palette[Math.max(0, pick)]).multiplyScalar(0.9);
      const fringe = smooth(0.05, 0.6, wet) * (1 - smooth(0.75, 1, wet));
      tintOf.lerp(mossTints[Math.floor(random() * mossTints.length)], fringe * 0.85);
      tintOf.lerp(bare, smooth(0.7, 1, wet));
      tintOf.offsetHSL(0, 0, (random() - 0.5) * 0.04);
      colours.set([tintOf.r, tintOf.g, tintOf.b], i * 3);
    }
    terrain.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    terrain.computeVertexNormals();
    const land = new THREE.Mesh(terrain, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    land.receiveShadow = true;
    root.add(land);
    world.ground = land;

    if (a.pools !== 'drained') {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.1, D - 0.1), new THREE.MeshStandardMaterial({ color: a.weather === 'after' ? '#7d8a92' : a.weather === 'clearing' ? '#4a565e' : '#1f282d', roughness: 0.1, metalness: 0.2 }));
      water.rotation.x = -Math.PI / 2;
      water.position.y = -0.06;
      water.receiveShadow = true;
      root.add(water);
    }

    // The block of peat the whole scene sits on, cut clean so its layers show.
    const section = (story: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 128;
      const g = canvas.getContext('2d')!;
      const grad = g.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, '#4a3524'); grad.addColorStop(0.2, '#33251b'); grad.addColorStop(0.7, '#241a14'); grad.addColorStop(1, '#3a3a36');
      g.fillStyle = grad;
      g.fillRect(0, 0, 1024, 128);
      for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${random() < 0.5 ? '130,95,60' : '10,6,4'},${rr(0.08, 0.3)})`; g.fillRect(rr(0, 1024), rr(0, 128), rr(20, 160), rr(1, 2.5)); }
      for (let x = 0; x < 1024; x += 13) { g.fillStyle = `rgba(0,0,0,${rr(0.05, 0.2)})`; g.fillRect(x + rr(-2, 2), 0, 1.5, 128); }
      if (story) {
        if (a.kept === 'oak') {
          g.fillStyle = '#0f0d0c'; g.strokeStyle = '#8f9390';
          for (let i = 0; i < 6; i++) { const x = rr(60, 960), y = rr(60, 100), r = rr(9, 17); g.beginPath(); if (i % 2) g.ellipse(x, y, r * rr(3, 6), r * 0.7, rr(-0.1, 0.1), 0, 6.3); else g.arc(x, y, r, 0, 6.3); g.fill(); g.lineWidth = 1.5; g.stroke(); }
        } else if (a.kept === 'track') {
          for (let x = 260; x < 780; x += 21) { g.fillStyle = '#b08a55'; g.beginPath(); g.arc(x, 74 + Math.sin(x * 0.02) * 4, 9, 0, 6.3); g.fill(); g.strokeStyle = '#4a3320'; g.lineWidth = 2; g.stroke(); g.beginPath(); g.arc(x, 74 + Math.sin(x * 0.02) * 4, 4, 0, 6.3); g.stroke(); }
          g.fillStyle = '#7a5a35'; g.fillRect(250, 86, 540, 5);
        } else if (a.kept === 'hoard') {
          const cx = rr(300, 720);
          g.strokeStyle = '#f1c93a'; g.lineWidth = 5; g.beginPath(); g.arc(cx, 78, 15, 0.6, 5.7); g.stroke();
          g.fillStyle = '#f1c93a';
          for (let i = 0; i < 12; i++) { g.beginPath(); g.ellipse(cx + 34 + rr(0, 60), 90 + rr(-8, 6), 6, 3.5, 0, 0, 6.3); g.fill(); }
        } else if (a.kept === 'sleeper') {
          const cx = rr(340, 680), cy = 78;
          g.strokeStyle = '#a8743a'; g.fillStyle = '#a8743a'; g.lineCap = 'round'; g.lineJoin = 'round';
          g.lineWidth = 17; g.beginPath(); g.moveTo(cx - 34, cy - 4); g.quadraticCurveTo(cx, cy - 16, cx + 30, cy + 2); g.stroke();
          g.lineWidth = 11; g.beginPath(); g.moveTo(cx + 30, cy + 2); g.lineTo(cx + 4, cy + 20); g.lineTo(cx + 40, cy + 24); g.stroke();
          g.lineWidth = 8; g.beginPath(); g.moveTo(cx - 22, cy - 2); g.lineTo(cx - 8, cy + 14); g.lineTo(cx - 34, cy + 16); g.stroke();
          g.beginPath(); g.arc(cx - 48, cy + 2, 12, 0, 6.3); g.fill();
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.75 });
    };
    const plainSide = section(false), frontSide = section(a.kept !== 'nothing');
    const block = new THREE.Mesh(new THREE.BoxGeometry(W, 1.7, D), [plainSide, plainSide, plainSide, plainSide, frontSide, plainSide]);
    block.position.y = -0.22 - 0.85;
    block.receiveShadow = true;
    root.add(block);

    // --- Cuttings ------------------------------------------------------------------------
    const heathTop = new THREE.MeshStandardMaterial({ color: palette[0].clone().multiplyScalar(0.85), roughness: 1 });
    const face = new THREE.MeshStandardMaterial({ map: plainSide.map, roughness: a.cuttings === 'fresh' ? 0.45 : 0.9 });
    steps.forEach(([front, top], i) => {
      const back = i < steps.length - 1 ? steps[i + 1][0] : -D / 2;
      const depth = front - -D / 2;
      const milled = a.cuttings === 'milled';
      const body = s.box([W - 0.02, top + 0.2, depth], [0, (top - 0.2) / 2, front - depth / 2], milled ? s.material('#4a3526', { roughness: 1 }) : face);
      body.castShadow = false;
      if (a.cuttings === 'old') { body.position.y -= 0.02; }
      if (!milled) {
        const last = i === steps.length - 1;
        const capDepth = front - back;
        const cap = s.box([W - 0.02, 0.05, capDepth + (a.cuttings === 'old' ? 0.08 : 0)], [0, top + 0.02, front - capDepth / 2 + (a.cuttings === 'old' ? 0.04 : 0)], last || a.cuttings === 'old' ? heathTop : s.material('#231a15', { roughness: 0.4 }));
        cap.castShadow = false;
      }
    });
    if (a.cuttings === 'milled') {
      const drain = s.material('#17110e', { roughness: 0.5 });
      for (let x = -W / 2 + 1; x < W / 2; x += 1.6) s.box([0.12, 0.02, -2.9 + D / 2], [x, 0.11, (-2.9 - D / 2) / 2], drain).castShadow = false;
      // The stockpile: a long ridge of milled peat under grey sheeting.
      const ridge = new THREE.Shape();
      ridge.moveTo(-0.7, 0); ridge.lineTo(0, 0.7); ridge.lineTo(0.7, 0); ridge.closePath();
      const pile = s.mesh(new THREE.ExtrudeGeometry(ridge, { depth: W * 0.62, bevelEnabled: false }), s.material('#3a2a1f', { roughness: 1 }), [-W * 0.42, 0.1, -3.9]);
      pile.rotation.y = Math.PI / 2;
      const sheet = s.mesh(new THREE.ExtrudeGeometry(ridge, { depth: W * 0.3, bevelEnabled: false }), s.material('#9aa3a6', { roughness: 0.5 }), [-W * 0.3, 0.12, -3.9]);
      sheet.rotation.y = Math.PI / 2;
      sheet.scale.set(1.02, 1.03, 1);
    }
    if (a.cuttings === 'fresh') {
      // Footed turf drying on the cutaway, in the rows it was thrown out in.
      const feet: Xf[] = [];
      for (const z of [-2.35, -1.85]) for (let x = -W / 2 + 0.5; x < W / 2 - 0.3; x += rr(0.5, 0.7)) {
        if (!clearOfSlots(x, z, 1.5) || wetness(x, z) > 0.1) continue;
        feet.push({ p: [x, ground(x, z), z + rr(-0.08, 0.08)], r: [0, rr(0, 3), 0], s: [1, rr(0.85, 1.2), 1], c: C('#3d2a1f').offsetHSL(0, 0, rr(-0.03, 0.06)) });
      }
      const foot = new THREE.ConeGeometry(0.2, 0.36, 5);
      foot.translate(0, 0.18, 0);
      instances(root, foot, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), feet);
      // A slean left standing in the top step.
      const sx = 4.6;
      s.rod([sx, 0.2, -3.1], [sx + 0.1, 1.5, -3.15], 0.025, s.material('#a58a5e'));
      s.rod([sx + 0.02, 1.48, -3.15], [sx + 0.2, 1.5, -3.15], 0.02, s.material('#a58a5e'));
    }

    // --- Heather, sedge and cotton ---------------------------------------------------------
    const tufts: Xf[] = [], sedge: Xf[] = [], cotton: Xf[] = [];
    const count = Math.round(mix(650, 1300, mood.density));
    for (let i = 0; i < count; i++) {
      const x = rr(-W / 2 + 0.15, W / 2 - 0.15), z = rr(-D / 2 + 0.15, D / 2 - 0.15);
      if (!clearOfSlots(x, z, 1.05)) continue;
      const wet = z < bankFront ? 0 : wetness(x, z);
      if (wet > 0.45) continue;
      if (a.cuttings === 'milled' && z < bankFront) continue;
      if (a.cuttings === 'fresh' && z < bankFront && z > -3.6) continue;
      const y = height(x, z);
      const near = smooth(0.5, 4.5, z);
      const size = rr(0.09, 0.2) * mix(0.9, 1.5, near);
      if (random() < (a.season === 'burnt' ? 0.15 : 0.3) + wet) {
        const straw = C(a.season === 'autumn' ? '#b98a42' : a.season === 'burnt' ? '#6f8a3a' : '#9a8a52').offsetHSL(0, 0, rr(-0.06, 0.06));
        for (let k = 0; k < 5; k++) sedge.push({ p: [x + rr(-0.05, 0.05), y - 0.02, z + rr(-0.05, 0.05)], r: [rr(-0.4, 0.4), 0, rr(-0.4, 0.4)], s: [1, rr(0.25, 0.55) * mix(0.9, 1.5, near), 1], c: straw });
        if (a.season !== 'winter' && random() < 0.25) cotton.push({ p: [x + rr(-0.05, 0.05), y + rr(0.3, 0.5), z], r: [0, 0, 0], s: [0.035, 0.04, 0.035], c: C('#f4f1e6') });
      } else tufts.push({ p: [x, y + size * 0.25, z], r: [rr(-0.3, 0.3), rr(0, 6.28), rr(-0.3, 0.3)], s: [size, size * rr(0.6, 1), size], c: palette[Math.floor(random() * palette.length)].clone().offsetHSL(0, 0, rr(-0.04, 0.05)) });
    }
    instances(root, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), tufts);
    const blade = new THREE.ConeGeometry(0.018, 1, 4);
    blade.translate(0, 0.5, 0);
    instances(root, blade, new THREE.MeshStandardMaterial({ roughness: 0.9 }), sedge);
    instances(root, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.1 }), cotton, false);

    // --- The hill and the cloud it disappears into -------------------------------------------
    const backZ = -D / 2 - 0.25;
    const hillTop = { whaleback: 3.4, table: 3.8, cone: 4.6, none: 0 }[a.hill];
    const profile = (u: number, layer: number) => {
      const wobble = Math.sin(u * 9 + ph[layer]) * 0.12 + Math.sin(u * 23 + ph[layer + 1]) * 0.05;
      if (layer === 1) return 1.0 + Math.sin(u * 3.1 + ph[2]) * 0.35 + wobble * 1.2;
      const c = mix(-0.5, 0.25, (ph[3] / 6));
      if (a.hill === 'whaleback') return hillTop * Math.exp(-(((u - c) / 0.75) ** 2)) + wobble;
      if (a.hill === 'table') return hillTop * (smooth(0.95, 0.5, Math.abs(u - c)) * 0.75 + smooth(0.55, 0.45, Math.abs(u - c)) * 0.25) + wobble;
      if (a.hill === 'cone') return hillTop * Math.max(0, 1 - Math.abs(u - c) / 0.6) ** 1.25 + 0.6 * Math.exp(-(((u - c - 0.7) / 0.4) ** 2)) + wobble;
      return 0.5 + wobble;
    };
    const far = sky.clone().lerp(C('#7c8388'), a.weather === 'mist' ? 0.22 : 0.5);
    const mid = sky.clone().lerp(palette[0].clone().lerp(C('#5a5f5c'), 0.6), a.weather === 'mist' ? 0.35 : 0.62);
    [0, 1].forEach((layer) => {
      if (layer === 0 && a.hill === 'none') return;
      const shape = new THREE.Shape();
      shape.moveTo(-W / 2 - 0.2, -0.6);
      for (let i = 0; i <= 60; i++) { const u = (i / 60) * 2 - 1; shape.lineTo(u * (W / 2 + 0.2), Math.max(0.2, profile(u, layer))); }
      shape.lineTo(W / 2 + 0.2, -0.6);
      shape.closePath();
      const ridge = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: layer ? mid : far, toneMapped: false }));
      ridge.position.set(0, 0, backZ - (layer ? 0 : 0.2));
      root.add(ridge);
    });
    // Cloud lying on the hill: opaque sky colour at the top, thinning downward.
    const veil = document.createElement('canvas');
    veil.width = 128; veil.height = 128;
    const vg = veil.getContext('2d')!;
    const fade = vg.createLinearGradient(0, 0, 0, 128);
    const shown = sky.clone().convertLinearToSRGB();
    const rgb = `${Math.round(shown.r * 255)},${Math.round(shown.g * 255)},${Math.round(shown.b * 255)}`;
    const reach = a.weather === 'mist' ? 0.95 : a.weather === 'clearing' || a.weather === 'after' ? 0.5 : 0.72;
    fade.addColorStop(0, `rgba(${rgb},1)`); fade.addColorStop(0.3, `rgba(${rgb},0.95)`); fade.addColorStop(reach, `rgba(${rgb},${a.weather === 'mist' ? 0.6 : 0})`); fade.addColorStop(1, `rgba(${rgb},${a.weather === 'mist' ? 0.35 : 0})`);
    vg.fillStyle = fade;
    vg.fillRect(0, 0, 128, 128);
    for (const [from, to] of [[0, 30], [128, 98]]) {
      const side = vg.createLinearGradient(from, 0, to, 0);
      side.addColorStop(0, `rgba(${rgb},1)`); side.addColorStop(0.45, `rgba(${rgb},1)`); side.addColorStop(1, `rgba(${rgb},0)`);
      vg.fillStyle = side;
      vg.fillRect(Math.min(from, to), 0, 30, 128);
    }
    const veilTexture = new THREE.CanvasTexture(veil);
    veilTexture.colorSpace = THREE.SRGBColorSpace;
    const veilHeight = 7.2;
    const shroud = new THREE.Mesh(new THREE.PlaneGeometry(W + 3.2, veilHeight), new THREE.MeshBasicMaterial({ map: veilTexture, transparent: true, depthWrite: false, toneMapped: false }));
    shroud.position.set(0, veilHeight / 2 - 1.0, backZ + 0.1);
    root.add(shroud);

    // The heavy sky: a lid of dark cloud over the back of the scene.
    const cloudTint = sky.clone().lerp(C('#6f777d'), a.weather === 'driving' ? 0.75 : a.weather === 'clearing' ? 0.35 : 0.55);
    const cloudMaterials = [0.55, 0.8, 1.05].map((k) => new THREE.MeshBasicMaterial({ color: sky.clone().lerp(cloudTint, k), toneMapped: false }));
    const lid: THREE.Mesh[] = [];
    const gapX = rr(-3, 3);
    for (let i = 0; i < 26; i++) {
      const x = rr(-W / 2 - 1.2, W / 2 + 1.2), z = rr(-D / 2 - 0.3, 1.5);
      if (a.weather === 'clearing' && Math.abs(x - gapX) < 1.9) continue;
      const y = rr(5.5, 6.5);
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), cloudMaterials[y < 5.8 ? 2 : y < 6.15 ? 1 : 0]);
      puff.position.set(x, y, z);
      puff.scale.set(rr(2.4, 4.2), rr(0.3, 0.55), rr(1.6, 2.6));
      root.add(puff);
      lid.push(puff);
    }
    if (a.weather === 'clearing') {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 2.3, 8, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4d2', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      beam.scale.setScalar(0.8);
      beam.position.set(gapX - 0.6, 3.1, -2.4);
      beam.rotation.z = -0.2;
      root.add(beam);
    }

    // Rain.
    const rain = new THREE.Group();
    root.add(rain);
    const P = 2.6;
    const slant = a.weather === 'driving' ? 0.55 : 0.1;
    if (a.weather === 'drizzle' || a.weather === 'driving') {
      const drops: Xf[] = [];
      const base = Math.round((a.weather === 'driving' ? 150 : 90) * mix(0.7, 1.3, mood.energy));
      for (let i = 0; i < base; i++) {
        const x = rr(-W / 2, W / 2), z = rr(-D / 2, D / 2), y0 = rr(0, P), len = a.weather === 'driving' ? rr(0.5, 0.9) : rr(0.18, 0.35);
        const tone = random() < 0.5 ? sky.clone().lerp(C('#ffffff'), 0.6) : sky.clone().lerp(C('#5f686e'), 0.5);
        for (let k = 0; k < 3; k++) drops.push({ p: [x + (y0 + k * P) * slant, y0 + k * P + 0.3, z], r: [0, 0, -Math.atan(slant)], s: [1, len, 1], c: tone });
      }
      instances(rain, new THREE.BoxGeometry(0.012, 1, 0.012), new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: a.weather === 'driving' ? 0.6 : 0.5, depthWrite: false }), drops, false);
    }

    // --- Signs of people ---------------------------------------------------------------------
    const smoke: THREE.Mesh[] = [];
    if (a.trace === 'fence') {
      const timber = s.material('#6f6657', { roughness: 1 });
      const wire = s.material('#5f5d58', { metalness: 0.5, roughness: 0.6 });
      const tops: [number, number, number][] = [];
      for (let x = -W / 2 + 0.4; x < W / 2; x += rr(1.3, 1.8)) {
        const z = -2.55 + Math.sin(x * 0.4) * 0.2, y = height(x, z);
        const lean = rr(-0.25, 0.25) * mix(0.4, 1.4, mood.wear), tall = rr(0.95, 1.2);
        const post = s.cylinder(0.045, 0.055, tall + 0.2, [x + Math.sin(lean) * tall * 0.5, y + tall / 2 - 0.1, z], timber, 6);
        post.rotation.z = -lean;
        tops.push([x + Math.sin(lean) * tall, y + tall * Math.cos(lean) - 0.12, z]);
      }
      for (let i = 0; i < tops.length - 1; i++) for (const drop of [0, 0.35]) {
        if (random() < mood.wear * 0.3) continue;
        const p = tops[i], q = tops[i + 1];
        s.tube([[p[0], p[1] - drop, p[2]], [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - drop - 0.08, (p[2] + q[2]) / 2], [q[0], q[1] - drop, q[2]]], 0.008, wire);
      }
    } else if (a.trace === 'cottage') {
      const x = rr(2.5, 4.8), z = -4.1, y = height(x, z);
      const lime = s.material('#ebe7da', { roughness: 0.9 });
      s.box([1.5, 0.62, 0.8], [x, y + 0.31, z], lime);
      const gable = new THREE.Shape();
      gable.moveTo(-0.44, 0); gable.lineTo(0, 0.42); gable.lineTo(0.44, 0); gable.closePath();
      const roof = s.mesh(new THREE.ExtrudeGeometry(gable, { depth: 1.56, bevelEnabled: false }), s.material('#3d3a36', { roughness: 0.9 }), [x - 0.78, y + 0.62, z]);
      roof.rotation.y = Math.PI / 2;
      s.box([0.18, 0.3, 0.18], [x + 0.6, y + 1.05, z], lime);
      s.box([0.16, 0.34, 0.02], [x - 0.1, y + 0.2, z + 0.41], s.material(mood.cheer > 0.5 ? '#b8322a' : '#2f4a3a'));
      for (const wx of [-0.5, 0.35]) s.box([0.16, 0.16, 0.02], [x + wx, y + 0.36, z + 0.41], s.material('#2a2f33', { emissive: '#ffb347', emissiveIntensity: mood.daylight > 0.7 || mood.daylight < 0.25 ? 1.2 : 0.15 }));
      const smokeMaterial = new THREE.MeshBasicMaterial({ toneMapped: false, color: sky.clone().lerp(C('#6f7478'), 0.45), transparent: true, opacity: 0.5, depthWrite: false });
      for (let i = 0; i < 7; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.1 + i * 0.045, 8, 6), smokeMaterial);
        puff.position.set(x + 0.6 + i * 0.22 * (0.4 + mood.energy), y + 1.3 + i * 0.26, z);
        root.add(puff);
        smoke.push(puff);
      }
    } else if (a.trace === 'poles') {
      const tar = s.material('#3a322c', { roughness: 1 });
      const tops: [number, number, number][] = [];
      for (let i = 0; i < 5; i++) {
        const x = -W / 2 + 0.8 + i * 2.7 + rr(-0.3, 0.3), z = -3.95 + i * 0.1, y = height(x, z);
        const lean = rr(-0.16, 0.16) * mix(0.5, 1.5, mood.wear), tall = 2.5;
        const pole = s.cylinder(0.04, 0.06, tall, [x + Math.sin(lean) * tall / 2, y + tall / 2, z], tar, 6);
        pole.rotation.z = -lean;
        const top: [number, number, number] = [x + Math.sin(lean) * tall, y + tall * Math.cos(lean), z];
        const arm = s.box([0.5, 0.04, 0.04], [top[0], top[1] - 0.15, top[2]], tar);
        arm.rotation.z = -lean;
        tops.push(top);
      }
      for (let i = 0; i < tops.length - 1; i++) for (const off of [-0.2, 0.2]) {
        const p = tops[i], q = tops[i + 1];
        s.tube([[p[0] + off, p[1] - 0.13, p[2]], [(p[0] + q[0]) / 2 + off, (p[1] + q[1]) / 2 - 0.4, (p[2] + q[2]) / 2], [q[0] + off, q[1] - 0.13, q[2]]], 0.006, tar);
      }
    } else if (a.trace === 'sheep') {
      const wool: Xf[] = [], dark: Xf[] = [], marks: Xf[] = [];
      for (let i = 0, tries = 0; i < Math.round(mix(4, 9, mood.density)) && tries < 80; tries++) {
        const x = rr(-W / 2 + 0.6, W / 2 - 0.6), z = rr(-4.3, -1.8);
        if (!clearOfSlots(x, z, 1.7) || (z >= bankFront && wetness(x, z) > 0.05) || (a.cuttings !== 'none' && Math.abs(z - bankFront) < 0.85 && z > -3.7)) continue;
        i++;
        const y = height(x, z), turn = rr(0, 6.28), dx = Math.sin(turn), dz = Math.cos(turn);
        wool.push({ p: [x, y + 0.42, z], r: [0, turn, 0], s: [0.2, 0.19, 0.33], c: C('#e2ddcf').offsetHSL(0, 0, rr(-0.06, 0.02)) });
        dark.push({ p: [x + dx * 0.36, y + 0.48 - (random() < 0.5 ? 0.22 : 0), z + dz * 0.36], r: [0, turn, 0], s: [0.07, 0.08, 0.11], c: C('#27221f') });
        for (const [ox, oz] of [[-0.1, -0.18], [0.1, -0.18], [-0.1, 0.18], [0.1, 0.18]]) dark.push({ p: [x + dx * oz + dz * ox, y + 0.13, z + dz * oz - dx * ox], r: [0, 0, 0], s: [0.025, 0.15, 0.025], c: C('#27221f') });
        marks.push({ p: [x - dx * 0.1, y + 0.58, z - dz * 0.1], r: [0, turn, 0], s: [0.1, 0.04, 0.12], c: C(mood.cheer > 0.5 ? '#d0352b' : '#2f5f9a') });
      }
      const blob = () => new THREE.IcosahedronGeometry(1, 1);
      instances(root, blob(), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), wool);
      instances(root, blob(), new THREE.MeshStandardMaterial({ roughness: 0.8 }), dark);
      instances(root, blob(), new THREE.MeshStandardMaterial({ roughness: 1 }), marks);
    }

    const fall = a.weather === 'driving' ? mix(5, 9, mood.energy) : mix(1.2, 2.6, mood.energy);
    const driftSpeed = mix(0.02, 0.22, mood.energy);
    const home = lid.map((puff) => puff.position.x);
    const smokeHome = smoke.map((puff) => puff.position.clone());
    world.update = (_dt, time) => {
      const y = -((time * fall) % P);
      rain.position.set(y * slant, y, 0);
      lid.forEach((puff, i) => { puff.position.x = home[i] + Math.sin(time * driftSpeed + i) * 0.5; });
      smoke.forEach((puff, i) => { puff.position.x = smokeHome[i].x + Math.sin(time * 0.8 + i * 0.6) * 0.04 * i; });
    };
    return world;
  },
});
