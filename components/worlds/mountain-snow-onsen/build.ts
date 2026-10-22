import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
interface Spot { at: P3; scale: P3; turn?: number; tint?: string }

export default defineWorld({
  questions: {
    hour: choice('What hour is it?', {
      dusk: 'Blue dusk: the snow gone violet-blue, the water and lanterns starting to glow.',
      snowlight: 'A white overcast afternoon, everything pale and shadowless.',
      night: 'Night: deep blue, the pool lit from within and by a few warm lights.',
      dawn: 'First light: rose and peach on the snow, the gorge still in shadow.',
    }),
    water: choice('What is the spring water like?', {
      milky: 'Opaque milky blue-white.',
      emerald: 'Cloudy emerald green.',
      iron: 'Rusty gold-brown, iron rich.',
      cobalt: 'Vivid cobalt blue, almost unnatural.',
    }),
    enclosure: choice('What stands behind the pool?', {
      bamboo: 'A tall fence of tied bamboo canes capped with snow.',
      planks: 'A weathered fence of dark cedar boards.',
      stone: 'A dry-stone wall with snow along its top.',
      open: 'Nothing: the pool looks straight out at white peaks.',
    }),
    trees: choice('What grows around it?', {
      pines: 'Pines, their tiers bent under loaves of snow.',
      bare: 'Bare black maples, every branch drawn in white.',
      bamboo: 'A grove of green bamboo bowed over by snow.',
      none: 'Nothing but rock and snow.',
    }),
    shelter: choice('Is there any building?', {
      none: 'None: open sky.',
      roof: 'An open timber roof on four posts over a bench, heaped with snow.',
      hut: 'A small changing hut with a cloth curtain across its door.',
    }),
    lights: choice('What lights it?', {
      none: 'Nothing but the sky.',
      lanterns: 'Low stone lanterns glowing on the rim.',
      paper: 'A string of round paper lanterns hung across the back.',
      candles: 'Candles set in hollows scooped in the snow.',
    }),
    snowfall: score('Is snow falling?', ['No, the air is clear and still', 'A few slow flakes', 'Steady snowfall', 'Thick heavy snow']),
    trace: choice('Who has been here?', {
      nobody: 'Nobody: the snow is unmarked.',
      footprints: 'Someone: bare footprints cross the snow to the water.',
      tray: 'Someone unhurried: a tray with a flask and cups floats on the pool, a towel left on a stone.',
      animal: 'Something small and four-footed came down from the rocks to the edge.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();
    const CX = 0.3, CZ = 0.6, PX = 4.4, PZ = 2.95;
    const slots: [number, number, number, number][] = [
      [CX, CZ + 0.1, 0.16, 1.05],
      [-4.2, 2.7, 0.42, 0.85],
      [4.7, 1.2, 0.42, 0.85],
      [-3.2, -3.4, 0.26, 0.85],
      [3.5, -3.5, 0.26, 0.85],
      [0.3, -3.8, 0.26, 0.75],
    ];
    const sky = { dusk: '#9fb1cf', snowlight: '#dfe3e6', night: '#66769c', dawn: '#ecd2cf' }[a.hour];
    const snowTone = { dusk: '#dfe6f4', snowlight: '#f1f3f4', night: '#c3cde6', dawn: '#f6e9e6' }[a.hour];
    const { art: s, world } = diorama(context, { background: sky, floor: snowTone, width: 14, depth: 11, maxHeight: 2.5, radius: 1.3, pitch: 30, yaw: 26, slots });
    const root = s.root;

    // Light for the hour.
    const hemi = root.children.find((c) => (c as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight | undefined;
    const key = world.keyLight!;
    if (a.hour === 'dusk') { hemi?.color.set('#c9d6ff'); hemi?.groundColor.set('#6e7a99'); if (hemi) hemi.intensity = 1.35; key.color.set('#cfd9ff'); key.intensity = 2.0; }
    if (a.hour === 'night') { hemi?.color.set('#aab9ee'); hemi?.groundColor.set('#55608a'); if (hemi) hemi.intensity = 1.1; key.color.set('#b9c8ff'); key.intensity = 1.5; }
    if (a.hour === 'dawn') { hemi?.color.set('#ffe9e4'); hemi?.groundColor.set('#8a7f95'); key.color.set('#ffd2bd'); key.intensity = 2.5; }
    const dark = a.hour === 'night' ? 1 : a.hour === 'dusk' ? 0.6 : a.hour === 'dawn' ? 0.3 : 0.1;

    const snow = new THREE.MeshStandardMaterial({ color: snowTone, roughness: 0.95 });
    const rock = new THREE.MeshStandardMaterial({ color: '#40444c', roughness: 0.95, flatShading: true });
    const rockPale = new THREE.MeshStandardMaterial({ color: '#5a5f68', roughness: 0.95, flatShading: true });
    const timber = s.material('#6b4a33', { roughness: 0.85 });
    const waterTone = { milky: '#6dbfd8', emerald: '#58c79a', iron: '#c99a55', cobalt: '#4f8fe0' }[a.water];
    const water = new THREE.MeshStandardMaterial({ color: waterTone, roughness: 0.18, emissive: waterTone, emissiveIntensity: mix(0.25, 0.6, dark) * mix(0.8, 1.2, mood.warmth) });
    const glow = new THREE.MeshStandardMaterial({ color: '#ffd28a', emissive: '#ff9c38', emissiveIntensity: mix(1.2, 3, dark) * mix(0.8, 1.3, mood.warmth), roughness: 0.6 });

    const inst = (geometry: THREE.BufferGeometry, material: THREE.Material, spots: Spot[], shadow = true) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(spots.length, 1));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      mesh.count = spots.length;
      spots.forEach((p, i) => {
        mesh.setMatrixAt(i, m.compose(new THREE.Vector3(...p.at), q.setFromEuler(e.set(0, p.turn ?? 0, 0)), new THREE.Vector3(...p.scale)));
        if (p.tint) mesh.setColorAt(i, new THREE.Color(p.tint));
      });
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };
    const lump = new THREE.IcosahedronGeometry(1, 1);
    const dome = new THREE.SphereGeometry(1, 14, 8);

    // The pool: an irregular basin of glowing water.
    const k1 = r(0, 6), k2 = r(0, 6);
    const edge = (t: number, grow = 1): [number, number] => {
      const f = (1 + 0.07 * Math.sin(t * 3 + k1) + 0.045 * Math.sin(t * 5 + k2)) * grow;
      return [CX + Math.cos(t) * PX * f, CZ + Math.sin(t) * PZ * f];
    };
    const outline = new THREE.Shape();
    for (let i = 0; i <= 64; i++) { const [x, z] = edge((i / 64) * Math.PI * 2); if (i) outline.lineTo(x, -z); else outline.moveTo(x, -z); }
    const pool = s.mesh(new THREE.ShapeGeometry(outline).rotateX(-Math.PI / 2), water, [0, 0.05, 0]);
    pool.castShadow = false;
    // A band of bare wet ground where the heat has melted the snow back.
    const melt = new THREE.Shape();
    for (let i = 0; i <= 64; i++) { const [x, z] = edge((i / 64) * Math.PI * 2, 1.09); if (i) melt.lineTo(x, -z); else melt.moveTo(x, -z); }
    s.mesh(new THREE.ShapeGeometry(melt).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#4f555f', roughness: 0.6 }), [0, 0.02, 0]).castShadow = false;

    // Standing places: the hero's rock in the middle, flat rim stones, levelled drifts.
    const flatStone = (x: number, z: number, top: number, radius: number, material: THREE.Material) => {
      const g = new THREE.CylinderGeometry(radius * 0.92, radius * 1.08, top + 0.3, 9);
      const pos = g.attributes.position, kk = r(0, 6);
      for (let i = 0; i < pos.count; i++) { const t = Math.atan2(pos.getZ(i), pos.getX(i)), f = 1 + 0.1 * Math.sin(t * 3 + kk) + 0.06 * Math.sin(t * 5 + kk); pos.setX(i, pos.getX(i) * f); pos.setZ(i, pos.getZ(i) * f); }
      g.computeVertexNormals();
      return s.mesh(g, material, [x, (top - 0.3) / 2, z]);
    };
    flatStone(slots[0][0], slots[0][1], slots[0][2], 1.55, rock);
    for (const i of [1, 2]) {
      flatStone(slots[i][0], slots[i][1], slots[i][2], 1.3, i === 1 ? rock : rockPale);
      for (let k = 0; k < 4; k++) { const t = r(0, 6.3); s.ball([r(0.25, 0.4), 0.09, r(0.2, 0.3)], [slots[i][0] + Math.cos(t) * 1.32, slots[i][2] - 0.08, slots[i][1] + Math.sin(t) * 1.32], snow, 8); }
    }
    for (const i of [3, 4, 5]) {
      const drift = s.mesh(new THREE.CylinderGeometry(1.35, 1.9, slots[i][2], 16), snow, [slots[i][0], slots[i][2] / 2, slots[i][1]]);
      drift.receiveShadow = true;
      s.ball([2.0, 0.14, 1.7], [slots[i][0], 0.02, slots[i][1]], snow, 14);
    }

    // The ring of boulders, lower at the front so the water shows, each with its cap of snow.
    const rocks: Spot[] = [], caps: Spot[] = [];
    const ring = Math.round(mix(30, 44, mood.density));
    for (let i = 0; i < ring; i++) {
      const t = (i / ring) * Math.PI * 2 + r(-0.04, 0.04);
      const [x, z] = edge(t, 1.07 + r(-0.01, 0.03));
      if (slots.slice(1, 3).some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 1.5)) continue;
      const front = Math.sin(t) > 0.25 ? 0.55 : 1;
      const w = r(0.3, 0.55), h = r(0.25, 0.6) * front, d = r(0.28, 0.45), turn = r(0, 3);
      rocks.push({ at: [x, h * 0.45, z], scale: [w, h, d], turn, tint: random() < 0.3 ? '#5c616b' : '#40444c' });
      caps.push({ at: [x, h * 1.25, z], scale: [w * 0.82, 0.07 + h * 0.2, d * 0.82], turn });
    }
    inst(lump, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), rocks);
    inst(dome, snow, caps);

    // The gorge wall down the left side, with a bamboo pipe feeding the pool from it.
    const crag: Spot[] = [], cragSnow: Spot[] = [];
    for (let i = 0; i < 9; i++) {
      const z = -5 + i * 1.25 + r(-0.2, 0.2), back = 1 - i / 9;
      const w = r(0.9, 1.3), h = mix(1.0, 3.3, back) * r(0.8, 1.1), d = r(0.8, 1.15), x = -6.25 + r(-0.2, 0.25), turn = r(0, 3);
      crag.push({ at: [x, h * 0.42, z], scale: [w, h, d], turn, tint: i % 3 ? '#3a3e46' : '#4d525b' });
      cragSnow.push({ at: [x, h * 1.3, z], scale: [w * 0.8, 0.16, d * 0.8], turn });
      if (h > 1.6) { crag.push({ at: [x + 0.7, h * 0.22, z + 0.4], scale: [w * 0.7, h * 0.5, d * 0.7], turn: turn + 1 }); cragSnow.push({ at: [x + 0.7, h * 0.72, z + 0.4], scale: [w * 0.55, 0.13, d * 0.55], turn }); }
    }
    inst(lump, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), crag);
    inst(dome, snow, cragSnow);
    const cane = new THREE.MeshStandardMaterial({ color: '#a9a25a', roughness: 0.5 });
    const [fx, fz] = edge(Math.PI * 1.02, 0.93);
    s.rod([-5.9, 1.42, fz - 0.3], [fx - 0.25, 1.12, fz], 0.07, cane);
    for (const x of [-5.2, fx - 0.5]) { s.rod([x, 0, fz - 0.42], [x + 0.05, 1.5, fz + 0.02], 0.035, cane); s.rod([x, 0, fz + 0.2], [x + 0.05, 1.5, fz - 0.24], 0.035, cane); }
    const fall = new THREE.MeshStandardMaterial({ color: '#eef8fb', roughness: 0.2, emissive: waterTone, emissiveIntensity: 0.5 });
    s.tube([[fx - 0.25, 1.1, fz], [fx - 0.05, 0.9, fz], [fx + 0.05, 0.4, fz], [fx + 0.07, 0.05, fz]], 0.045, fall).castShadow = false;
    const splash = s.ring(0.28, 0.03, [fx + 0.08, 0.06, fz], fall);
    splash.rotation.x = Math.PI / 2;

    // What stands behind.
    const BZ = -5.05;
    const lean = mood.wear > 0.6 ? (mood.wear - 0.6) * 0.3 : 0;
    if (a.enclosure === 'bamboo') {
      const canes: Spot[] = [];
      for (let x = -5.2; x < 6.9; x += 0.13) canes.push({ at: [x, 0.95 + r(-0.03, 0.05), BZ + r(-0.01, 0.01)], scale: [1, 1 + r(-0.03, 0.04), 1], tint: ['#b7a565', '#a69250', '#c4b377', '#8f8a4e'][Math.floor(random() * 4)] });
      const fence = inst(new THREE.CylinderGeometry(0.055, 0.055, 1.9, 6), new THREE.MeshStandardMaterial({ roughness: 0.55 }), canes);
      fence.rotation.x = lean;
      for (const y of [0.45, 1.45]) s.box([12.2, 0.09, 0.09], [0.85, y, BZ + 0.08], s.material('#3b2e22'));
      for (let x = -4.6; x < 6.9; x += 1.15) for (const y of [0.45, 1.45]) s.box([0.05, 0.14, 0.14], [x, y, BZ + 0.08], s.material('#1f1a16'));
    } else if (a.enclosure === 'planks') {
      const boards: Spot[] = [];
      for (let x = -5.2; x < 6.9; x += 0.26) boards.push({ at: [x, 0.9 + r(-0.04, 0.06), BZ], scale: [1, 1 + r(-0.05, 0.06), 1], tint: ['#4a3a2e', '#3b2f26', '#5a4636'][Math.floor(random() * 3)] });
      inst(new THREE.BoxGeometry(0.24, 1.8, 0.05), new THREE.MeshStandardMaterial({ roughness: 0.9 }), boards).rotation.x = lean;
      s.box([12.2, 0.1, 0.07], [0.85, 1.35, BZ + 0.06], timber);
    } else if (a.enclosure === 'stone') {
      const blocks: Spot[] = [];
      for (let row = 0; row < 4; row++) for (let x = -5.3 + (row % 2) * 0.35; x < 6.9; x += 0.72) blocks.push({ at: [x + r(-0.04, 0.04), 0.2 + row * 0.36, BZ], scale: [0.4, 0.21, 0.3], turn: r(-0.1, 0.1), tint: ['#6b6f76', '#585c64', '#7b7f85'][Math.floor(random() * 3)] });
      inst(lump, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), blocks);
    } else {
      // Open to the range: pale peaks with white heads behind a low bank.
      const peak = new THREE.MeshStandardMaterial({ color: a.hour === 'dawn' ? '#c9a9b9' : '#8fa0bf', roughness: 1, flatShading: true });
      for (let i = 0; i < 5; i++) {
        const x = -4.6 + i * 2.6 + r(-0.4, 0.4), h = r(2.2, 3.9), w = r(1.7, 2.4);
        const cone = s.mesh(new THREE.ConeGeometry(w, h, 7), peak, [x, h / 2, BZ - 0.1]);
        cone.scale.z = 0.25; cone.rotation.y = r(0, 1); cone.castShadow = false;
        const head = s.mesh(new THREE.ConeGeometry(w * 0.42, h * 0.4, 7), snow, [x, h * 0.81, BZ - 0.08]);
        head.scale.z = 0.27; head.rotation.y = cone.rotation.y; head.castShadow = false;
      }
    }
    if (a.enclosure !== 'open') {
      const top = a.enclosure === 'stone' ? 1.5 : 1.9;
      const heaps: Spot[] = [];
      for (let x = -5.1; x < 6.9; x += 0.5) heaps.push({ at: [x, top + 0.02, BZ + lean * 1.2], scale: [r(0.3, 0.42), r(0.08, 0.15), 0.14] });
      inst(dome, snow, heaps);
    }
    const bank: Spot[] = [];
    for (let x = -5; x < 7; x += 0.9) bank.push({ at: [x + r(-0.2, 0.2), 0.02, BZ + 0.55 + r(-0.1, 0.2)], scale: [r(0.7, 1.1), r(0.18, 0.4), r(0.4, 0.6)] });
    for (let i = 0, n = Math.round(mix(6, 16, mood.density)); i < n; i++) { const front = random() < 0.5; bank.push({ at: [front ? r(-6.5, 6.5) : r(5.6, 6.7), 0.02, front ? r(4.3, 5.2) : r(-2, 4.5)], scale: [r(0.5, 1.0), r(0.12, 0.28), r(0.4, 0.7)] }); }
    inst(dome, snow, bank);

    // Trees along the back and on the crag.
    const sites: [number, number, number][] = [[-4.4, BZ - 0.15, 1], [-1.9, BZ - 0.2, 0.85], [0.9, BZ - 0.15, 1.05], [3.3, BZ - 0.2, 0.8], [-6.2, -3.2, 0.9], [-6.3, 1.4, 0.7], [6.3, BZ + 0.3, 0.9]];
    const hasShelter = a.shelter !== 'none';
    const count = a.trees === 'none' ? 0 : Math.round(mix(4, sites.length, mood.density));
    const needle = new THREE.MeshStandardMaterial({ color: a.hour === 'night' ? '#27413a' : '#2f4d3f', roughness: 0.9, flatShading: true });
    const bark = new THREE.MeshStandardMaterial({ color: '#2a211d', roughness: 1 });
    for (let i = 0; i < count; i++) {
      const [x, z, k] = sites[i];
      if (hasShelter && x > 5) continue;
      const base = x < -6 ? 1.2 : 0;
      if (a.trees === 'pines') {
        const H = 4.0 * k * r(0.9, 1.05);
        s.cylinder(0.07, 0.14, H * 0.5, [x, base + H * 0.25, z], bark, 7);
        const tiers = 5;
        for (let j = 0; j < tiers; j++) {
          const f = j / (tiers - 1), y = base + H * mix(0.3, 0.9, f), w = H * mix(0.3, 0.09, f), th = H * 0.24;
          const tier = s.mesh(new THREE.ConeGeometry(w, th, 8), needle, [x, y, z]);
          tier.rotation.y = r(0, 1);
          const cap = s.mesh(new THREE.ConeGeometry(w * 0.86, th * 0.62, 8), snow, [x + r(-0.03, 0.03), y + th * 0.26, z + 0.03]);
          cap.rotation.y = tier.rotation.y;
        }
      } else if (a.trees === 'bare') {
        const H = 3.6 * k;
        s.rod([x, base, z], [x + r(-0.15, 0.15), base + H * 0.5, z], 0.13, bark, 0.08);
        for (let j = 0; j < 7; j++) {
          const t = r(0, 6.3), y0 = base + H * r(0.3, 0.52), len = H * r(0.3, 0.5), up = r(0.5, 1.1);
          const tip: P3 = [x + Math.cos(t) * len * Math.cos(up), y0 + len * Math.sin(up), z + Math.sin(t) * len * Math.cos(up) * 0.5];
          s.rod([x, y0, z], tip, 0.05, bark, 0.018);
          s.rod([x + (tip[0] - x) * 0.25, y0 + (tip[1] - y0) * 0.25 + 0.05, z + (tip[2] - z) * 0.25], [tip[0], tip[1] + 0.035, tip[2]], 0.03, snow, 0.014);
          for (let q = 0; q < 2; q++) { const t2 = t + r(-1, 1), l2 = len * 0.45; const mid: P3 = [x + (tip[0] - x) * 0.6, y0 + (tip[1] - y0) * 0.6, z + (tip[2] - z) * 0.6]; s.rod(mid, [mid[0] + Math.cos(t2) * l2 * 0.6, mid[1] + l2 * 0.7, mid[2] + Math.sin(t2) * l2 * 0.3], 0.022, bark, 0.01); }
        }
      } else {
        const green = new THREE.MeshStandardMaterial({ color: '#6f9550', roughness: 0.5 });
        const leaf = new THREE.MeshStandardMaterial({ color: '#557a44', roughness: 0.9, flatShading: true });
        for (let j = 0; j < 5; j++) {
          const bx = x + r(-0.45, 0.45), H = 3.9 * k * r(0.75, 1.05), bend = r(0.5, 1.5), dir = r(-0.4, 0.4);
          s.tube([[bx, base, z], [bx + dir * 0.1, base + H * 0.5, z + bend * 0.08], [bx + dir * 0.4, base + H * 0.85, z + bend * 0.45], [bx + dir * 0.7, base + H * 0.9, z + bend * 1.0]], 0.035, green);
          s.ball([0.42, 0.2, 0.5], [bx + dir * 0.6, base + H * 0.88, z + bend * 0.75], leaf, 6);
          s.ball([0.36, 0.1, 0.42], [bx + dir * 0.6, base + H * 0.88 + 0.17, z + bend * 0.75], snow, 8);
        }
      }
    }

    // A building in the back right corner.
    if (hasShelter) {
      const hx = 5.95, hz = -3.75, W = 1.7, D = 2.2, HH = 2.0;
      const post = s.material('#4d3626', { roughness: 0.85 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.box([0.11, HH, 0.11], [hx + sx * W / 2, HH / 2, hz + sz * D / 2], post);
      s.box([W + 0.3, 0.08, D + 0.3], [hx, 0.06, hz], timber);
      if (a.shelter === 'hut') {
        const wall = s.material('#d9cdb4', { roughness: 0.95 });
        s.box([W, HH - 0.1, 0.06], [hx, HH / 2, hz - D / 2], wall);
        s.box([0.06, HH - 0.1, D], [hx - W / 2, HH / 2, hz], wall);
        s.box([0.06, HH - 0.1, D], [hx + W / 2, HH / 2, hz], wall);
        s.box([W, 0.5, 0.06], [hx, HH - 0.3, hz + D / 2], wall);
        s.box([W * 0.28, HH - 0.6, 0.06], [hx + W * 0.36, (HH - 0.6) / 2 + 0.05, hz + D / 2], wall);
        // The door curtain, split in three, indigo with a pale mark.
        const indigo = new THREE.MeshStandardMaterial({ color: '#27407c', roughness: 0.95, side: THREE.DoubleSide });
        for (let i = 0; i < 3; i++) { const flap = s.box([W * 0.22, 0.85, 0.02], [hx - W * 0.36 + i * W * 0.235, HH - 0.98, hz + D / 2 + 0.05], indigo); flap.rotation.x = r(-0.06, 0.1); }
        s.cylinder(0.14, 0.14, 0.01, [hx - W * 0.125, HH - 0.9, hz + D / 2 + 0.075], new THREE.MeshStandardMaterial({ color: '#f0ece0' }), 16).rotation.x = Math.PI / 2;
        s.rod([hx - W * 0.5, HH - 0.54, hz + D / 2 + 0.05], [hx + W * 0.22, HH - 0.54, hz + D / 2 + 0.05], 0.02, post);
        if (a.lights !== 'none') s.box([0.02, 0.5, 0.5], [hx - W / 2 - 0.04, 1.3, hz + 0.2], glow);
      } else {
        s.box([W * 0.9, 0.06, 0.4], [hx, 0.48, hz - D * 0.25], timber);
        for (const sx of [-1, 1]) s.box([0.08, 0.42, 0.36], [hx + sx * W * 0.38, 0.27, hz - D * 0.25], post);
      }
      const roof = new THREE.Shape();
      roof.moveTo(-W / 2 - 0.4, 0); roof.lineTo(0, 0.75); roof.lineTo(W / 2 + 0.4, 0); roof.lineTo(W / 2 + 0.4, -0.08); roof.lineTo(-W / 2 - 0.4, -0.08); roof.closePath();
      s.mesh(new THREE.ExtrudeGeometry(roof, { depth: D + 0.7, bevelEnabled: false }).translate(0, 0, -(D + 0.7) / 2), s.material('#3a2d24'), [hx, HH + 0.06, hz]);
      const load = new THREE.Shape();
      load.moveTo(-W / 2 - 0.38, 0.02); load.quadraticCurveTo(-W * 0.3, 0.75, 0, 0.98); load.quadraticCurveTo(W * 0.3, 0.75, W / 2 + 0.38, 0.02); load.lineTo(0, 0.74); load.closePath();
      s.mesh(new THREE.ExtrudeGeometry(load, { depth: D + 0.62, bevelEnabled: false }).translate(0, 0, -(D + 0.62) / 2), snow, [hx, HH + 0.08, hz]);
    }

    // Lights.
    const flames: THREE.MeshStandardMaterial[] = [glow];
    if (a.lights === 'lanterns') {
      const stone = s.material('#7d8087', { roughness: 0.95 });
      const places: [number, number][] = [edge(Math.PI * 1.36, 1.2), edge(Math.PI * 0.3, 1.22), edge(Math.PI * 1.68, 1.2)];
      places.slice(0, mood.cheer > 0.3 ? 3 : 2).forEach(([x, z]) => {
        s.box([0.2, 0.5, 0.2], [x, 0.25, z], stone);
        s.box([0.44, 0.07, 0.44], [x, 0.53, z], stone);
        s.box([0.3, 0.28, 0.3], [x, 0.7, z], glow);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.box([0.06, 0.28, 0.06], [x + sx * 0.14, 0.7, z + sz * 0.14], stone);
        const capStone = s.mesh(new THREE.ConeGeometry(0.46, 0.26, 4), stone, [x, 0.97, z]);
        capStone.rotation.y = Math.PI / 4;
        s.ball([0.36, 0.14, 0.36], [x, 1.03, z], snow, 10);
      });
      const lamp = new THREE.PointLight('#ffb060', mix(4, 14, dark), 7, 1.6);
      lamp.position.set(places[0][0], 0.9, places[0][1] + 0.3);
      root.add(lamp);
    } else if (a.lights === 'paper') {
      const y = 2.75, x0 = -4.9, x1 = hasShelter ? 4.9 : 6.6, z = BZ + 0.45;
      for (const x of [x0, x1]) s.rod([x, 0, z], [x, y + 0.25, z], 0.05, timber);
      const pts: P3[] = [];
      for (let i = 0; i <= 8; i++) { const f = i / 8; pts.push([mix(x0, x1, f), y + 0.2 - Math.sin(f * Math.PI) * 0.45, z]); }
      s.tube(pts, 0.012, new THREE.MeshStandardMaterial({ color: '#1d1a18' }));
      const paper = new THREE.MeshStandardMaterial({ color: '#ffb46a', emissive: mood.cheer > 0.5 ? '#ff7a2e' : '#ff9a4a', emissiveIntensity: mix(1.1, 2.6, dark), roughness: 0.7 });
      flames.push(paper);
      for (let i = 1; i < 8; i++) { const p = pts[i]; s.ball([0.19, 0.22, 0.19], [p[0], p[1] - 0.25, p[2]], paper, 12); s.cylinder(0.08, 0.08, 0.03, [p[0], p[1] - 0.03, p[2]], bark, 8); s.cylinder(0.08, 0.08, 0.03, [p[0], p[1] - 0.47, p[2]], bark, 8); }
      const lamp = new THREE.PointLight('#ff9a50', mix(5, 16, dark), 9, 1.5);
      lamp.position.set(0.5, y - 0.4, z + 0.6);
      root.add(lamp);
    } else if (a.lights === 'candles') {
      const n = Math.round(mix(5, 12, mood.cheer * 0.5 + mood.density * 0.5));
      for (let i = 0; i < n; i++) {
        const [x, z] = edge((i / n) * Math.PI * 2 + r(-0.15, 0.15), r(1.2, 1.3));
        if (slots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 1.6)) continue;
        const hollow = s.mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), snow, [x, 0.03, z]);
        hollow.rotation.z = Math.PI; hollow.position.y = 0.2; hollow.scale.y = 0.7;
        s.ball([0.2, 0.05, 0.2], [x, 0.03, z], snow, 10);
        s.cylinder(0.035, 0.035, 0.1, [x, 0.12, z], new THREE.MeshStandardMaterial({ color: '#f4eedb' }), 8);
        s.ball([0.035, 0.065, 0.035], [x, 0.22, z], glow, 8);
      }
      const lamp = new THREE.PointLight('#ffb060', mix(3, 10, dark), 8, 1.6);
      lamp.position.set(CX, 0.8, CZ + PZ + 0.4);
      root.add(lamp);
    }

    // Who has been here.
    if (a.trace === 'footprints') {
      const dent = new THREE.MeshStandardMaterial({ color: new THREE.Color(snowTone).multiplyScalar(0.72), roughness: 1 });
      const [tx, tz] = edge(Math.PI * 0.22, 1.12);
      const from: [number, number] = hasShelter ? [5.3, -2.3] : [6.6, 4.9];
      const steps = 11, prints: Spot[] = [];
      const heading = Math.atan2(tx - from[0], tz - from[1]);
      for (let i = 0; i < steps; i++) { const f = i / (steps - 1), side = i % 2 ? 1 : -1; prints.push({ at: [mix(from[0], tx, f) + Math.cos(heading) * side * 0.13 + Math.sin(f * 5) * 0.08, 0.012, mix(from[1], tz, f) - Math.sin(heading) * side * 0.13], scale: [0.085, 1, 0.19], turn: heading + side * 0.12 }); }
      inst(new THREE.CylinderGeometry(1, 1, 0.012, 12), dent, prints, false);
    } else if (a.trace === 'tray') {
      const tx = CX + 2.3, tz = CZ + 1.3;
      s.cylinder(0.3, 0.28, 0.05, [tx, 0.08, tz], s.material('#7b2a1f', { roughness: 0.35 }), 24);
      const clay = s.material('#ece8dc', { roughness: 0.4 });
      s.lathe([[0, 0], [0.07, 0], [0.085, 0.1], [0.06, 0.17], [0.028, 0.2], [0.028, 0.25], [0.045, 0.27]], clay, [tx - 0.08, 0.105, tz - 0.03]);
      for (const [dx, dz] of [[0.13, 0.08], [0.07, -0.15]]) s.cylinder(0.05, 0.03, 0.055, [tx + dx, 0.133, tz + dz], clay, 12);
      const ripple = s.ring(0.42, 0.012, [tx, 0.056, tz], new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }));
      ripple.rotation.x = Math.PI / 2;
      const [wx, wz] = edge(Math.PI * 0.62, 1.07);
      s.box([0.46, 0.05, 0.3], [wx, 0.4, wz], new THREE.MeshStandardMaterial({ color: '#f5f2ea', roughness: 1 })).rotation.y = r(0, 1);
      s.ball([0.5, 0.36, 0.42], [wx, 0.08, wz], rock, 6);
    } else if (a.trace === 'animal') {
      const dent = new THREE.MeshStandardMaterial({ color: new THREE.Color(snowTone).multiplyScalar(0.72), roughness: 1 });
      const [tx, tz] = edge(Math.PI * 1.2, 1.13);
      const prints: Spot[] = [];
      for (let i = 0; i < 16; i++) { const f = i / 15; const x = mix(-5.6, tx, f) + Math.sin(f * 7) * 0.25, z = mix(-4.2, tz, f); for (const side of [-1, 1]) prints.push({ at: [x + side * 0.07, 0.012, z + (i % 2) * 0.05], scale: [0.045, 1, 0.06] }); }
      inst(new THREE.CylinderGeometry(1, 1, 0.012, 8), dent, prints, false);
    }

    // Falling snow.
    const flakeCount = a.snowfall < 0.12 ? 0 : Math.round(mix(40, 420, a.snowfall));
    const flakes = flakeCount ? new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 1 }), flakeCount) : null;
    const flakeSeed = Array.from({ length: flakeCount }, () => ({ x: r(-6.8, 6.8), y: r(0, 5), z: r(-5.3, 5.3), size: r(0.018, 0.04), sway: r(0, 6.3) }));
    if (flakes) { flakes.castShadow = false; root.add(flakes); }

    // Steam lying on the water, thin enough that the cast shows through it.
    const mist = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: mix(0.17, 0.25, dark), depthWrite: false, roughness: 1, emissive: '#cfdcea', emissiveIntensity: 0.5 });
    const puffGeometry = new THREE.IcosahedronGeometry(1, 2);
    const puffCount = Math.round(mix(22, 46, mood.energy * 0.6 + mood.density * 0.4));
    const puffs = Array.from({ length: puffCount }, (_unused, i) => {
      const mesh = new THREE.Mesh(puffGeometry, mist);
      root.add(mesh);
      const t = r(0, 6.3), d = Math.sqrt(random());
      return { mesh, x: CX + Math.cos(t) * d * PX * 0.92, z: CZ + Math.sin(t) * d * PZ * 0.9, phase: (i + random()) / puffCount, size: r(0.35, 0.75), sway: r(0, 6.3) };
    });
    const windX = r(-0.6, 0.6);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
    const pose = (time: number) => {
      const rate = mix(0.5, 1.8, mood.energy);
      for (const p of puffs) {
        const t = (p.phase + time * 0.035 * rate) % 1;
        p.mesh.position.set(p.x + (windX * t + Math.sin(p.sway + t * 4) * 0.2) * t, 0.15 + t * 2.3, p.z + Math.cos(p.sway + t * 3) * 0.2 * t);
        p.mesh.scale.setScalar(p.size * (0.6 + t * 1.6) * Math.sin(Math.PI * Math.min(1, t * 1.1)) ** 0.5 + 0.001);
      }
      if (flakes) {
        flakeSeed.forEach((f, i) => {
          const y = 5 - ((5 - f.y + time * 0.35 * rate * (0.6 + f.size * 12)) % 5);
          flakes.setMatrixAt(i, m4.compose(v3.set(f.x + Math.sin(f.sway + time * 0.6) * 0.25, y, f.z), q4, sc.setScalar(f.size)));
        });
        flakes.instanceMatrix.needsUpdate = true;
      }
      const flick = 1 + (Math.sin(time * 8.3) * 0.5 + Math.sin(time * 19.1) * 0.3) * 0.12 * rate;
      flames.forEach((m, i) => { m.emissiveIntensity = (m.userData.base as number) * (i ? 1 + (flick - 1) * 0.4 : flick); });
    };
    flames.forEach((m) => { m.userData.base = m.emissiveIntensity; });
    pose(0);
    world.update = (_dt, time) => pose(time);
    return world;
  },
});
