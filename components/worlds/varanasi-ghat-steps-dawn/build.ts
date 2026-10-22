import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';

type P = [number, number, number];

/** A soft radial puff, for mist. */
function puffMap() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/** A painted house front: plaster, rows of shuttered windows, a damp line at the foot. */
function facadeMap(colour: string, shutter: string, cols: number, rows: number, wear: number, random: () => number, sign?: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const g = canvas.getContext('2d')!;
  g.fillStyle = colour; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,40,20,${0.04 + random() * 0.06 * wear})`; g.fillRect(random() * 512, random() * 512, 20 + random() * 60, 6 + random() * 30); }
  const cw = 512 / cols, rh = 420 / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * cw + cw * 0.28, y = 40 + r * rh + rh * 0.2, w = cw * 0.44, h = rh * 0.58;
    g.fillStyle = '#2a2622'; g.fillRect(x, y, w, h);
    g.fillStyle = shutter; g.fillRect(x - w * 0.3, y, w * 0.28, h); g.fillRect(x + w * 1.02, y, w * 0.28, h);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - w * 0.34, y + h, w * 1.68, 5);
  }
  if (sign) { g.fillStyle = '#efe4c8'; g.fillRect(120, 460, 272, 42); g.fillStyle = '#2b3a6a'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.fillText(sign, 256, 492); }
  const grad = g.createLinearGradient(0, 512, 0, 380);
  grad.addColorStop(0, `rgba(40,50,40,${0.35 + wear * 0.4})`); grad.addColorStop(1, 'rgba(40,50,40,0)');
  g.fillStyle = grad; g.fillRect(0, 380, 512, 132);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineWorld({
  questions: {
    mist: score('How thick is the mist on the river?', ['A clear cold dawn', 'Thin haze over the water', 'Fog swallowing the boats and the spire']),
    water: choice('What is the river doing?', {
      mirror: 'Flat as a mirror, the boats doubled in it.',
      ripples: 'Slow ripples pushed by a breeze.',
      high: 'Swollen and brown, the lowest step drowned.',
      low: 'Low, a mud bank showing beside the last step.',
    }),
    litter: choice('What litters the wet bottom step?', {
      marigolds: 'Marigold heads and petals, orange on dark stone.',
      leafcups: 'Spent leaf-cup lamps and burnt wicks.',
      cloth: 'A wet white cloth left folded on the step.',
      nothing: 'Scrubbed clean, dark and shining.',
    }),
    backdrop: choice('What stands behind the steps?', {
      temple: 'A temple spire above a small shrine, a red flag on top.',
      palace: 'A tall ochre palace wall with shuttered windows and a balcony.',
      ruin: 'A crumbling wall with a tree growing from it.',
      both: 'A spire beside a painted lodging house.',
    }),
    parasols: score('How many bamboo parasols stand on the steps?', ['None', 'One', 'A few', 'A whole row']),
    boats: score('How many rowboats are moored at the step?', ['None', 'One', 'Two or three', 'A raft of them tied together']),
    smoke: choice('What drifts across the water?', {
      smoke: 'Wood smoke from a fire up the ghat.',
      incense: 'A thread of incense from the shrine.',
      birds: 'A scatter of gulls over the boats.',
      nothing: 'Only the mist.',
    }),
    state: choice('What is the morning like here?', {
      routine: 'Routine: laundry spread on the upper steps, a tea stall open.',
      rite: 'A rite: a wrapped bier on the step, marigolds round it.',
      festival: 'Festival: garlands and strings of bulbs between the parasols.',
      empty: 'Empty: nobody has come down yet.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const RISE = 0.34, TREAD = 1.2, STEPS = 6, Z0 = 2.6, W = 13;
    const high = a.water === 'high';
    const top = (k: number) => 0.14 + k * RISE;
    const zc = (k: number) => Z0 - (k + 0.5) * TREAD;
    const platformTop = top(STEPS), platformZ = (Z0 - STEPS * TREAD - 6) / 2;
    const heroStep = high ? 1 : 0;
    const dawn = new THREE.Color('#e9d9d4').lerp(new THREE.Color('#f1ece4'), a.mist * 0.5).lerp(new THREE.Color('#f3dcc6'), mood.warmth * 0.3);
    const { art: s, world } = diorama(context, {
      background: dawn.getStyle(), floor: '#c9c1bb', width: W, depth: 12, floorY: 0, yaw: 24, pitch: 27, maxHeight: 2.2, radius: 1.5,
      slots: [[0.2, zc(heroStep), top(heroStep)], [-3.2, zc(2), top(2), 0.95], [3.4, zc(2), top(2), 0.95], [-1.7, zc(4), top(4), 0.9], [2.3, zc(4), top(4), 0.9], [0.6, platformZ + 0.5, platformTop, 0.85]],
    });
    if (world.keyLight) world.keyLight.intensity *= mix(1, 0.7, a.mist);

    // The river: the diorama floor, made glossy, and raised when the river is up.
    const waterColour = new THREE.Color(high ? '#8a7a62' : '#9fb3b0').lerp(dawn, 0.35).lerp(new THREE.Color('#6f8a7a'), mood.wear * 0.25);
    const water = world.ground as THREE.Mesh;
    water.material = new THREE.MeshStandardMaterial({ color: waterColour, roughness: a.water === 'mirror' ? 0.05 : 0.2, metalness: 0.35, emissive: dawn, emissiveIntensity: 0.12 });
    water.castShadow = false;
    const waterY = high ? 0.3 : 0;
    water.position.y = waterY - 0.12;

    // The steps, wet and dark at the bottom, paler and drier going up.
    const dry = new THREE.Color('#c4b59a').lerp(new THREE.Color('#7a766a'), mood.wear * 0.5);
    const wet = new THREE.Color('#6f6a5e').lerp(new THREE.Color('#4a4a44'), mood.wear * 0.3);
    for (let k = 0; k < STEPS; k++) {
      const stone = s.material(wet.clone().lerp(dry, Math.min(1, (k - (high ? 1 : 0)) / 2.5 + 0.1)), { roughness: 0.9 });
      s.box([W, top(k) + 0.6, TREAD + 0.02], [0, (top(k) - 0.6) / 2, zc(k)], stone);
      // Nosing worn pale along the edge of each tread.
      s.box([W, 0.02, 0.08], [0, top(k) + 0.005, zc(k) + TREAD / 2 - 0.04], s.material(dry.clone().lerp(new THREE.Color('#e8e0cc'), 0.4)));
    }
    s.box([W, platformTop + 0.6, 6 - (STEPS * TREAD - Z0) + 0.02], [0, (platformTop - 0.6) / 2, platformZ], s.material(dry, { roughness: 0.9 }));
    // A wide ramp of stone where the bathing steps give way to a sloped bank on the right.
    if (a.water === 'low') {
      const mud = s.ball([2.8, 0.14, 1.6], [3.9, 0.02, Z0 + 0.9], s.material('#6e5a44', { roughness: 1 }), 14);
      void mud;
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#8a8277', { roughness: 1 }), Array.from({ length: 8 }, () => ({ at: [2.8 + random() * 2.2, 0.12, Z0 + 0.4 + random() * 1.0] as P, size: 0.08 + random() * 0.1 })));
    }

    // Litter on the wet bottom step and petals on the water.
    const petalMaterial = s.material('#f0831a', { emissive: '#7a3000', emissiveIntensity: 0.3, roughness: 0.85 });
    const litterZ = zc(heroStep) + TREAD * 0.3, litterY = top(heroStep) + 0.012;
    if (a.litter === 'marigolds') {
      s.scatter(new THREE.SphereGeometry(1, 6, 4), petalMaterial, Array.from({ length: 70 }, (_u, i) => ({ at: [(random() - 0.5) * W * 0.9, litterY + 0.01, litterZ + (random() - 0.5) * TREAD * 0.6] as P, size: 0.025 + random() * 0.025, color: i % 3 ? '#f0831a' : '#f2b21c' })));
      const floating = s.scatter(new THREE.CylinderGeometry(1, 1, 0.1, 7), petalMaterial, Array.from({ length: 40 }, (_u, i) => ({ at: [(random() - 0.5) * W * 0.8, waterY + 0.012, Z0 + 0.1 + random() * 1.6] as P, size: 0.03 + random() * 0.02, color: i % 3 ? '#f0831a' : '#f2b21c' })));
      floating.castShadow = false;
    }
    if (a.litter === 'leafcups') {
      s.scatter(new THREE.CylinderGeometry(1, 0.7, 0.4, 8), s.material('#5a6a30', { roughness: 0.9 }), Array.from({ length: 22 }, () => ({ at: [(random() - 0.5) * W * 0.85, litterY + 0.02, litterZ + (random() - 0.5) * TREAD * 0.6] as P, size: 0.06 })));
      s.scatter(new THREE.SphereGeometry(1, 5, 4), s.material('#2a2622'), Array.from({ length: 22 }, () => ({ at: [(random() - 0.5) * W * 0.85, litterY + 0.03, litterZ + (random() - 0.5) * TREAD * 0.6] as P, size: 0.02 })));
    }
    if (a.litter === 'cloth') for (let i = 0; i < 3; i++) s.box([0.5 + random() * 0.3, 0.05, 0.35], [(random() - 0.5) * W * 0.7, litterY + 0.025, litterZ], s.material('#e6e2d6', { roughness: 0.95 }));
    if (a.litter === 'nothing') { const sheen = s.mesh(new THREE.PlaneGeometry(W, TREAD * 0.9), new THREE.MeshStandardMaterial({ color: '#6f7a78', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.3, depthWrite: false }), [0, litterY, zc(heroStep)]); sheen.rotation.x = -Math.PI / 2; sheen.castShadow = false; }

    // Behind: a shrine and spire, a palace wall, a ruin with a tree, or a spire beside a lodging house.
    const backZ = -5.4;
    const spire = (x: number) => {
      const red = s.material('#a8362a', { roughness: 0.8 }), cream = s.material('#e9dcc2', { roughness: 0.85 });
      s.box([2.6, 2.3, 2.0], [x, platformTop + 1.15, backZ], cream);
      s.box([2.8, 0.2, 2.2], [x, platformTop + 2.35, backZ], red);
      const profile: [number, number][] = [[1.05, 0], [1.0, 0.6], [0.92, 1.2], [0.8, 1.8], [0.66, 2.35], [0.5, 2.8], [0.34, 3.15], [0.2, 3.4], [0.0, 3.5]];
      s.lathe(profile, cream, [x, platformTop + 2.45, backZ]);
      for (let i = 1; i < 7; i++) s.ring(mix(1.0, 0.3, i / 7), 0.03, [x, platformTop + 2.45 + i * 0.47, backZ], s.material('#c9b58e', { roughness: 0.9 })).rotation.x = Math.PI / 2;
      s.cylinder(0.42, 0.42, 0.14, [x, platformTop + 6.0, backZ], s.material('#c9b58e', { roughness: 0.9 }), 16);
      s.lathe([[0, 0], [0.12, 0.05], [0.16, 0.2], [0.05, 0.5], [0, 0.6]], s.material('#c9962e', { metalness: 0.75, roughness: 0.3 }), [x, platformTop + 6.07, backZ]);
      s.rod([x, platformTop + 6.6, backZ], [x, platformTop + 7.4, backZ], 0.02, s.material('#3a3836'));
      const flag = s.box([0.5, 0.3, 0.01], [x + 0.27, platformTop + 7.2, backZ], s.material('#e8481a', { side: THREE.DoubleSide }));
      flag.rotation.y = 0.3;
      // The shrine door, with a bell hanging in it.
      s.box([0.7, 1.4, 0.05], [x, platformTop + 0.7, backZ + 1.02], s.material('#2a2622'));
      return flag;
    };
    const wallMaterial = (colour: string, shutter: string, cols: number, rows: number, sign?: string) => new THREE.MeshStandardMaterial({ map: facadeMap(colour, shutter, cols, rows, mood.wear, random, sign), roughness: 0.9 });
    let flag: THREE.Mesh | null = null;
    if (a.backdrop === 'temple') flag = spire(-1.2);
    if (a.backdrop === 'palace') {
      const wall = s.box([8, 5.2, 1.4], [0.3, platformTop + 2.6, backZ - 0.2], wallMaterial('#c98c4a', '#3f6a5a', 4, 3));
      void wall;
      s.box([3.2, 0.12, 0.9], [1.2, platformTop + 3.1, backZ + 0.9], s.material('#e9dcc2'));
      for (let i = 0; i < 7; i++) s.cylinder(0.04, 0.04, 0.7, [-0.3 + i * 0.5, platformTop + 3.5, backZ + 1.3], s.material('#e9dcc2'), 8);
      s.box([3.2, 0.06, 0.06], [1.2, platformTop + 3.9, backZ + 1.3], s.material('#e9dcc2'));
      s.box([8.2, 0.3, 1.5], [0.3, platformTop + 5.3, backZ - 0.2], s.material('#a8362a', { roughness: 0.8 }));
    }
    if (a.backdrop === 'ruin') {
      const brick = s.material('#9a6a4e', { roughness: 0.95 });
      s.box([6, 2.8, 0.8], [-1, platformTop + 1.4, backZ], brick);
      s.box([2.2, 1.4, 0.8], [-3, platformTop + 3.5, backZ], brick);
      s.box([1.4, 0.9, 0.8], [1.2, platformTop + 3.25, backZ], brick);
      s.scatter(new THREE.BoxGeometry(1, 0.5, 0.6), brick, Array.from({ length: 10 }, () => ({ at: [-1 + (random() - 0.5) * 6, platformTop + 0.15, backZ + 0.8 + random() * 0.6] as P, size: 0.2 + random() * 0.2 })));
      s.cylinder(0.1, 0.22, 2.6, [0.2, platformTop + 2.8 + 1.3, backZ + 0.1], s.material('#5a4030', { roughness: 0.95 }), 10);
      s.ball([2.2, 1.3, 1.8], [0.4, platformTop + 5.6, backZ], s.material(mood.cheer > 0.4 ? '#4f7a3a' : '#6a7a4a', { roughness: 0.95 }), 14);
      s.ball([1.4, 0.9, 1.2], [1.6, platformTop + 4.9, backZ + 0.3], s.material(mood.cheer > 0.4 ? '#5a8a44' : '#747f52', { roughness: 0.95 }), 12);
    }
    if (a.backdrop === 'both') {
      flag = spire(-3.4);
      const house = s.box([5, 4.6, 1.6], [2.6, platformTop + 2.3, backZ - 0.1], wallMaterial(mood.cheer > 0.5 ? '#d9a860' : '#9fb0c0', '#2b3a6a', 3, 3, 'RIVER VIEW'));
      void house;
      s.box([5.2, 0.2, 1.8], [2.6, platformTop + 4.7, backZ - 0.1], s.material('#6a3a2a', { roughness: 0.8 }));
    }
    // A bell on a frame at the top of the steps.
    const brass = s.material('#c9962e', { metalness: 0.75, roughness: 0.3 });
    const bellX = 3.6, bellZ = platformZ + 1.0;
    for (const dx of [-0.3, 0.3]) s.rod([bellX + dx, platformTop, bellZ], [bellX + dx, platformTop + 2.2, bellZ], 0.04, s.material('#3a3836'));
    s.rod([bellX - 0.35, platformTop + 2.2, bellZ], [bellX + 0.35, platformTop + 2.2, bellZ], 0.035, s.material('#3a3836'));
    const bell = new THREE.Group();
    bell.position.set(bellX, platformTop + 2.15, bellZ);
    const bellMesh = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.22, 0], [0.2, 0.1], [0.14, 0.3], [0.09, 0.42], [0.04, 0.48], [0, 0.48]].map(([x, y]) => new THREE.Vector2(x, y)), 20), brass);
    bellMesh.position.y = -0.55; bellMesh.castShadow = true;
    bell.add(bellMesh);
    s.root.add(bell);

    // Parasols: wide cane shades on bamboo poles over a priest's wooden platform.
    const parasolCount = a.parasols < 0.17 ? 0 : a.parasols < 0.5 ? 1 : a.parasols < 0.84 ? 3 : 6;
    const parasolAt: { x: number; z: number; y: number }[] = [];
    const parasolSpots: [number, number][] = [[-4.6, 3], [4.9, 3], [-5.2, 5], [5.4, 5], [-2.4, 5], [2.9, 5]];
    for (let i = 0; i < parasolCount; i++) {
      const [x, k] = parasolSpots[i];
      const y = top(k), z = zc(k);
      parasolAt.push({ x, z, y });
      s.box([1.3, 0.22, 1.3], [x, y + 0.11, z], s.material('#6a4a2e', { roughness: 0.8 }));
      s.box([1.34, 0.03, 1.34], [x, y + 0.235, z], s.material(['#9c1f1c', '#e07a14', '#efe8da'][i % 3], { roughness: 0.95 }));
      s.rod([x, y, z - 0.5], [x + 0.05, y + 3.0, z - 0.5], 0.035, s.material('#c9b27a', { roughness: 0.8 }));
      const shade = s.mesh(new THREE.ConeGeometry(1.45, 0.45, 18, 1, true), s.material(['#c9a66b', '#b8945a', '#d6b57a'][i % 3], { roughness: 0.9, side: THREE.DoubleSide }), [x + 0.05, y + 3.0 - 0.2, z - 0.5]);
      shade.castShadow = true;
      for (let r = 0; r < 10; r++) { const t = (r / 10) * Math.PI * 2; s.rod([x + 0.05, y + 2.98, z - 0.5], [x + 0.05 + Math.cos(t) * 1.4, y + 2.98 - 0.42, z - 0.5 + Math.sin(t) * 1.4], 0.012, s.material('#8a6a3a')); }
    }
    // Festival strings between parasols, or laundry and a tea stall, or a bier.
    const bulbs: THREE.InstancedMesh | null = a.state === 'festival' ? new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshStandardMaterial({ color: '#fff0b0', emissive: '#ffd060', emissiveIntensity: 1.6 }), 160) : null;
    if (a.state === 'festival') {
      const poles: P[] = parasolAt.length >= 2 ? parasolAt.map(({ x, z, y }) => [x + 0.05, y + 2.5, z - 0.5] as P) : [[-5, top(3) + 2.4, zc(3)], [5, top(3) + 2.4, zc(3)], [0, top(5) + 2.4, zc(5)]];
      if (parasolAt.length < 2) for (const p of poles) s.rod([p[0], p[1] - 2.4, p[2]], p, 0.03, s.material('#c9b27a'));
      const matrix = new THREE.Matrix4();
      let index = 0;
      for (let i = 0; i < poles.length; i++) for (let j = i + 1; j < poles.length; j++) {
        const from = new THREE.Vector3(...poles[i]), to = new THREE.Vector3(...poles[j]);
        if (from.distanceTo(to) > 9) continue;
        const points: P[] = [];
        for (let t = 0; t <= 1; t += 0.05) { const p = from.clone().lerp(to, t); p.y -= Math.sin(t * Math.PI) * 0.6; points.push([p.x, p.y, p.z]); }
        s.tube(points, 0.012, s.material('#3a2a1a'));
        for (let t = 0.1; t < 1; t += 0.08) { const p = from.clone().lerp(to, t); p.y -= Math.sin(t * Math.PI) * 0.6 + 0.08; if (index < 160 && bulbs) { matrix.makeTranslation(p.x, p.y, p.z); bulbs.setMatrixAt(index++, matrix); } }
        s.scatter(new THREE.SphereGeometry(1, 5, 4), petalMaterial, Array.from({ length: 10 }, () => { const t = random(); const p = from.clone().lerp(to, t); return { at: [p.x, p.y - Math.sin(t * Math.PI) * 0.6 - 0.2 - random() * 0.2, p.z] as P, size: 0.05 }; }));
      }
      if (bulbs) { bulbs.count = index; bulbs.instanceMatrix.needsUpdate = true; s.root.add(bulbs); }
    }
    if (a.state === 'routine') {
      for (let i = 0; i < 6; i++) s.box([0.9 + random() * 0.6, 0.02, 0.6], [-5.3 + i * 1.8 + random() * 0.4, top(5) + 0.015, zc(5) + (random() - 0.5) * 0.4], s.material(['#e8e2d2', '#c93a6a', '#2b4f8a', '#e3b530', '#6fa06a'][i % 5], { roughness: 0.95 }));
      const sx = 4.6, sz = platformZ + 0.9;
      s.box([1.4, 0.9, 0.8], [sx, platformTop + 0.45, sz], s.material('#4a6a8a', { roughness: 0.7 }));
      s.box([1.5, 0.05, 0.9], [sx, platformTop + 0.93, sz], s.material('#6a4a2e'));
      s.lathe([[0, 0], [0.12, 0], [0.14, 0.12], [0.08, 0.18], [0.05, 0.2], [0, 0.2]], s.material('#9a9a94', { metalness: 0.7, roughness: 0.35 }), [sx - 0.3, platformTop + 0.96, sz]);
      s.scatter(new THREE.CylinderGeometry(1, 0.8, 1.6, 8), s.material('#e3c9a0'), Array.from({ length: 8 }, (_u, i) => ({ at: [sx + 0.15 + (i % 4) * 0.12, platformTop + 1.0, sz - 0.2 + Math.floor(i / 4) * 0.2] as P, size: 0.045 })));
      for (const dx of [-0.6, 0.6]) s.rod([sx + dx, platformTop + 0.95, sz - 0.35], [sx + dx, platformTop + 2.3, sz - 0.35], 0.025, s.material('#c9b27a'));
      s.box([1.6, 0.03, 1.2], [sx, platformTop + 2.3, sz + 0.1], s.material('#2b4f8a', { side: THREE.DoubleSide }));
    }
    if (a.state === 'rite') {
      const bx = -3.8, bk = 1, by = top(bk), bz = zc(bk);
      for (const dz of [-0.28, 0.28]) s.rod([bx - 1.1, by + 0.08, bz + dz], [bx + 1.1, by + 0.08, bz + dz], 0.025, s.material('#c9b27a'));
      s.box([1.9, 0.32, 0.5], [bx, by + 0.26, bz], s.material('#e07a14', { roughness: 0.95 }));
      s.box([1.92, 0.08, 0.52], [bx, by + 0.3, bz], s.material('#efe8da', { roughness: 0.95 }));
      s.scatter(new THREE.SphereGeometry(1, 6, 4), petalMaterial, Array.from({ length: 40 }, (_u, i) => { const t = random() * 6.3, d = 0.7 + random() * 0.6; return { at: [bx + Math.cos(t) * d * 1.3, by + 0.02, bz + Math.sin(t) * d * 0.5] as P, size: 0.035, color: i % 3 ? '#f0831a' : '#f2b21c' }; }));
      for (let i = 0; i < 3; i++) s.rod([bx - 0.6 + i * 0.6, by + 0.45, bz], [bx - 0.6 + i * 0.6, by + 0.75, bz + 0.05], 0.005, s.material('#5a3020'));
    }

    // Boats moored at the step.
    const boatCount = a.boats < 0.17 ? 0 : a.boats < 0.5 ? 1 : a.boats < 0.84 ? 3 : 6;
    const floating: THREE.Group[] = [];
    const hullColours = ['#2f5f9e', '#3f7a4a', '#26241f', '#9a948a', '#b8302a', '#4a6a8a'];
    for (let i = 0; i < boatCount; i++) {
      const group = new THREE.Group();
      const L = 2.8 + random() * 0.8, HALF = 0.5;
      const shape = new THREE.Shape();
      const segs = 10;
      const beam = (t: number) => HALF * Math.min(1, Math.sin(Math.min(1, t * 1.6) * Math.PI / 2) ** 0.6);
      for (let j = 0; j <= segs; j++) { const t = j / segs, x = -L / 2 + t * L; j === 0 ? shape.moveTo(x, beam(t)) : shape.lineTo(x, beam(t)); }
      for (let j = segs; j >= 0; j--) { const t = j / segs; shape.lineTo(-L / 2 + t * L, -beam(t)); }
      const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.42, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.08, bevelSegments: 2 }), s.material(hullColours[i % hullColours.length], { roughness: 0.8 }));
      hull.rotation.x = -Math.PI / 2;
      hull.position.y = -0.08;
      const inner = new THREE.Shape();
      for (let j = 0; j <= segs; j++) { const t = j / segs, x = -L / 2 + 0.12 + t * (L - 0.24); j === 0 ? inner.moveTo(x, beam(t) * 0.78) : inner.lineTo(x, beam(t) * 0.78); }
      for (let j = segs; j >= 0; j--) { const t = j / segs; inner.lineTo(-L / 2 + 0.12 + t * (L - 0.24), -beam(t) * 0.78); }
      const well = new THREE.Mesh(new THREE.ShapeGeometry(inner), s.material('#2e2a24', { roughness: 0.95 }));
      well.rotation.x = -Math.PI / 2;
      well.position.y = 0.36;
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, HALF * 1.9), s.material('#8a6a44'));
      bench.position.set(-L * 0.2, 0.3, 0);
      const gunwale = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false }), s.material('#efece2', { roughness: 0.7 }));
      gunwale.rotation.x = -Math.PI / 2;
      gunwale.position.y = 0.36;
      gunwale.scale.set(1.02, 1.08, 1);
      for (const mesh of [hull, well, bench, gunwale]) { mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); }
      const x = i < 3 ? -4.6 + i * 2.0 + (random() - 0.5) * 0.8 : -3.6 + (i - 3) * 3.0 + (random() - 0.5) * 0.8;
      const z = Z0 + 1.0 + (i < 3 ? 0.4 : 1.9) + random() * 0.5;
      group.position.set(x, waterY, z);
      group.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.7 + (i >= 3 ? 0.4 : 0);
      s.root.add(group);
      floating.push(group);
      s.rod([x, waterY + 0.3, z], [x + (random() - 0.5) * 1.2, top(heroStep) + 0.05, zc(heroStep) + TREAD * 0.45], 0.012, s.material('#d5c79d'));
    }

    // Smoke, incense, gulls.
    const puffs = puffMap();
    const smokes: { mesh: THREE.Mesh; y0: number; phase: number }[] = [];
    const smokeMaterial = new THREE.MeshBasicMaterial({ map: puffs, color: '#8f8a84', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
    const column = (x: number, y: number, z: number, count: number, size: number) => {
      for (let i = 0; i < count; i++) {
        const mesh = s.mesh(new THREE.PlaneGeometry(size + i * size * 0.35, size + i * size * 0.35), smokeMaterial, [x + (random() - 0.5) * 0.3 * i, y + i * size * 0.7, z]);
        mesh.castShadow = false;
        smokes.push({ mesh, y0: mesh.position.y, phase: random() * 6.3 });
      }
    };
    if (a.smoke === 'smoke') {
      const fx = -5.4, fy = top(4), fz = zc(4);
      s.scatter(new THREE.CylinderGeometry(0.5, 0.5, 1, 8), s.material('#4a3020', { roughness: 0.95 }), Array.from({ length: 5 }, (_u, i) => ({ at: [fx + (i - 2) * 0.12, fy + 0.08, fz + (random() - 0.5) * 0.2] as P, size: 0.12 })));
      s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#2a1a12', emissive: '#ff5a10', emissiveIntensity: mix(0.5, 1.5, mood.energy), roughness: 1 }), Array.from({ length: 8 }, () => ({ at: [fx + (random() - 0.5) * 0.4, fy + 0.12, fz + (random() - 0.5) * 0.3] as P, size: 0.05 })));
      column(fx, fy + 0.5, fz, 8, 0.7);
    }
    if (a.smoke === 'incense') column(a.backdrop === 'both' ? -3.4 : a.backdrop === 'temple' ? -1.2 : 0.5, platformTop + 1.5, backZ + 1.1, 6, 0.22);
    if (a.smoke === 'birds') {
      const gull = s.material('#3a3a3a', { side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) {
        const x = (random() - 0.5) * 10, y = 1.5 + random() * 3.5, z = Z0 + random() * 3;
        for (const side of [-1, 1]) { const wing = s.box([0.3, 0.012, 0.08], [x + side * 0.14, y + 0.04, z], gull); wing.rotation.z = side * 0.4; }
      }
    }

    // Mist: veils over the water and the backdrop, low puffs lying on the river.
    const mistMaterial = (opacity: number) => new THREE.MeshBasicMaterial({ map: puffs, color: '#f4efe9', transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    const mists: THREE.Mesh[] = [];
    const veil = (w: number, h: number, at: P, opacity: number) => {
      if (opacity < 0.04) return;
      const mesh = s.mesh(new THREE.PlaneGeometry(w, h), mistMaterial(opacity), at);
      mesh.castShadow = false;
      mists.push(mesh);
    };
    for (let i = 0; i < 9; i++) veil(4 + random() * 4, 1.6 + random() * 1.2, [(random() - 0.5) * W, waterY + 0.5 + random() * 0.4, Z0 + random() * 3.2], 0.15 + a.mist * 0.55);
    for (let i = 0; i < 6; i++) veil(6 + random() * 4, 3 + random() * 2, [(random() - 0.5) * W, platformTop + 1 + random() * 3, backZ + 1.5 + random()], a.mist * a.mist * 0.8);
    for (let i = 0; i < 4; i++) veil(5 + random() * 3, 1.5, [(random() - 0.5) * W, top(3) + 0.8, zc(3) + (random() - 0.5)], a.mist * 0.35);

    const energy = mood.energy;
    const ripples = a.water === 'ripples' ? s.scatter(new THREE.BoxGeometry(1, 0.01, 0.06), new THREE.MeshBasicMaterial({ color: '#e8e4dc', transparent: true, opacity: 0.45, depthWrite: false }), Array.from({ length: 40 }, () => ({ at: [(random() - 0.5) * W, waterY + 0.012, Z0 + 0.2 + random() * 3.2] as P, size: 0.8 + random() * 1.4 }))) : null;
    if (ripples) ripples.castShadow = false;
    const rippleSeeds = ripples ? Array.from({ length: 40 }, () => ({ x: (random() - 0.5) * W, z: Z0 + 0.2 + random() * 3.2, len: 0.8 + random() * 1.4, phase: random() * 6.3 })) : [];
    const matrix = new THREE.Matrix4();
    world.update = (dt: number, time: number) => {
      for (const [i, boat] of floating.entries()) { boat.position.y = waterY + Math.sin(time * (0.7 + energy * 0.6) + i) * 0.02; boat.rotation.z = Math.sin(time * 0.5 + i) * 0.015; }
      for (const { mesh, y0, phase } of smokes) { mesh.position.y = y0 + Math.sin(time * 0.4 + phase) * 0.08; mesh.position.x += Math.sin(time * 0.3 + phase) * 0.0008 * (0.3 + energy); }
      for (const [i, mesh] of mists.entries()) mesh.position.x += Math.sin(time * 0.15 + i) * 0.0012 * (0.2 + energy);
      if (ripples) {
        for (const [i, seed] of rippleSeeds.entries()) { matrix.makeScale(seed.len * (0.8 + 0.2 * Math.sin(time * 0.8 + seed.phase)), 1, 1).setPosition(seed.x + Math.sin(time * 0.3 + seed.phase) * 0.3, waterY + 0.012, seed.z); ripples.setMatrixAt(i, matrix); }
        ripples.instanceMatrix.needsUpdate = true;
      }
      bell.rotation.z = Math.sin(time * (2.5 + energy * 3)) * 0.12 * energy;
      if (flag) flag.rotation.y = 0.3 + Math.sin(time * 2) * 0.25 * (0.3 + energy);
    };
    const disposeBase = world.dispose;
    world.dispose = () => { puffs.dispose(); disposeBase(); };
    return world;
  },
});
