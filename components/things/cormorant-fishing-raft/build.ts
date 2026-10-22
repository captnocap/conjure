import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    raft: choice('What is the raft made of?', {
      bamboo: 'Thick green-gold bamboo culms, freshly lashed.',
      weathered: 'Old silvered bamboo, split and sun-bleached.',
      pipe: 'White plastic drainpipe with blue end caps, the modern tourist version of the same shape.',
    }),
    fisherman: choice('Where is the fisherman?', {
      absent: 'Not aboard: only his hat and pole are left on the raft.',
      poling: 'Standing at the stern in a conical hat, leaning on a long pole.',
      seated: 'Sitting low on a stool, smoking, waiting on the birds.',
      posing: 'Standing with the perch across his shoulders, a bird at each end, holding still for a photograph.',
    }),
    birds: choice('What are the cormorants doing?', {
      hunched: 'Both perched and hunched, necks drawn in, waiting.',
      drying: 'One holds its wings spread wide to dry.',
      diving: 'One has dived: only its neck shows in the water, the other watches.',
      fed: 'One holds a silver fish crosswise in its beak.',
    }),
    lantern: choice('What light hangs from the prow?', {
      paper: 'A round red-orange paper lantern, soft and warm.',
      kerosene: 'A glass hurricane lamp with a small yellow flame.',
      gas: 'A harsh white pressure lamp under a tin hood, to draw fish up.',
      dark: 'A lantern that is not lit.',
      none: 'No lantern at all.',
    }),
    catch: score('How much fish is in the basket?', ['Empty', 'A few small ones', 'Half full', 'Heaped and spilling']),
    cargo: choice('What else is on the deck?', {
      bare: 'Nothing else.',
      net: 'A heap of wet net with cork floats.',
      kettle: 'A little clay stove with a kettle and a bowl.',
      seats: 'Two plastic chairs under a parasol, for paying passengers.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const r = new Sculpture(context);
    s.root.add(r.root);
    const { mood, random } = context;
    const night = clamp01(Math.abs(mood.daylight - 0.5) * 2);
    const lit = a.lantern !== 'dark' && a.lantern !== 'none';

    // Water patch so the raft floats on something, with rings spreading from it.
    const waterTone = new THREE.Color('#4f8f7d').lerp(new THREE.Color('#31504f'), night * 0.5).lerp(new THREE.Color('#8a8f6a'), mood.wear * 0.2);
    const water = s.cylinder(1, 1, 0.05, [0, 0.025, 0], new THREE.MeshStandardMaterial({ color: waterTone, roughness: 0.18, metalness: 0.25 }), 48);
    water.scale.set(4.5, 1, 1.75);
    const ringMat = new THREE.MeshStandardMaterial({ color: waterTone.clone().lerp(new THREE.Color('#ffffff'), 0.45), roughness: 0.3 });
    const ripple = (x: number, z: number, rad: number) => { const t = s.ring(rad, 0.012, [x, 0.05, z], ringMat); t.rotation.x = Math.PI / 2; t.scale.set(1, 0.5, 1); return t; };

    // Hull: bamboo culms side by side, the prow steamed upward.
    const n = a.raft === 'pipe' ? 6 : 5 + Math.floor(random() * 3);
    const rad = a.raft === 'pipe' ? 0.085 : 0.07;
    const pitch = rad * 2.08;
    const half = ((n - 1) * pitch) / 2;
    const tones = { bamboo: ['#b9b05a', '#8fa04a', '#cdbb6a'], weathered: ['#a59c84', '#8d8672', '#b8ae96'], pipe: ['#e9ebe8', '#dfe3e2', '#f1f1ec'] }[a.raft];
    const nodes: { at: P3; size: number }[] = [];
    for (let i = 0; i < n; i++) {
      const z = -half + i * pitch;
      const back = -3.4 - random() * 0.25, lift = 0.6 + random() * 0.12;
      r.tube([[back, rad + 0.1, z], [-2.7, rad, z], [0, rad, z], [1.9, rad, z], [2.8, rad + 0.16, z], [3.6, rad + lift, z]], rad, r.material(tones[Math.floor(random() * 3)], { roughness: a.raft === 'pipe' ? 0.3 : 0.6 }));
      if (a.raft === 'pipe') {
        r.ball([rad * 1.1, rad * 1.1, rad * 1.1], [3.6, rad + lift, z], r.material('#2f6fb5'), 10);
        r.ball([rad * 1.1, rad * 1.1, rad * 1.1], [back, rad + 0.1, z], r.material('#2f6fb5'), 10);
      } else for (let x = -2.6 + random() * 0.4; x < 1.9; x += 0.42 + random() * 0.1) nodes.push({ at: [x, rad, z], size: rad * 1.06 });
    }
    if (nodes.length) r.scatter(new THREE.TorusGeometry(1, 0.1, 5, 12).rotateY(Math.PI / 2), r.material('#5d5a36'), nodes);
    const lash = r.material(a.raft === 'pipe' ? '#3a3d42' : '#6b5335');
    for (const x of [-2.9, -1.2, 0.6, 2.1]) r.rod([x, rad * 2 + 0.03, -half - 0.08], [x, rad * 2 + 0.03, half + 0.08], 0.035, lash);
    const deck = rad * 2 + 0.06;

    const wood = r.material('#6a4b30'), straw = r.material('#d2b76a'), skin = r.material('#b98660'), indigo = r.material('#2f4466'), black = r.material('#16181a', { roughness: 0.45, metalness: 0.25 });

    // Lantern on a bent prow pole.
    let lamp: THREE.Group | null = null;
    if (a.lantern !== 'none') {
      r.tube([[2.3, deck - 0.05, 0.02], [2.55, 1.0, 0.02], [2.9, 1.75, 0.02], [3.25, 1.95, 0.02]], 0.025, wood);
      lamp = new THREE.Group();
      lamp.position.set(3.25, 1.95, 0.02);
      r.root.add(lamp);
      const put = <T extends THREE.Object3D>(m: T) => { m.removeFromParent(); lamp!.add(m); return m; };
      put(r.rod([0, 0, 0], [0, -0.22, 0], 0.006, black));
      const glow = lit ? mix(0.9, 2.6, night) : 0;
      if (a.lantern === 'paper' || a.lantern === 'dark') {
        const col = a.lantern === 'dark' ? '#8a4a3a' : '#f0562c';
        put(r.ball([0.17, 0.2, 0.17], [0, -0.44, 0], new THREE.MeshStandardMaterial({ color: col, emissive: lit ? '#ff7a2a' : '#000000', emissiveIntensity: glow, roughness: 0.8 }), 14));
        for (const y of [-0.24, -0.64]) put(r.cylinder(0.08, 0.08, 0.03, [0, y, 0], black, 12));
        put(r.rod([0, -0.65, 0], [0, -0.82, 0], 0.012, r.material('#c9a13a')));
      } else if (a.lantern === 'kerosene') {
        put(r.cylinder(0.09, 0.11, 0.07, [0, -0.6, 0], r.material('#6f7a7c', { metalness: 0.6 }), 12));
        put(r.cylinder(0.05, 0.085, 0.24, [0, -0.44, 0], new THREE.MeshStandardMaterial({ color: '#fff3c9', transparent: true, opacity: 0.35, depthWrite: false }), 12));
        put(r.ball([0.03, 0.06, 0.03], [0, -0.48, 0], new THREE.MeshStandardMaterial({ color: '#ffd76a', emissive: '#ffb52e', emissiveIntensity: glow * 1.5 }), 8));
        put(r.cylinder(0.03, 0.07, 0.07, [0, -0.28, 0], r.material('#6f7a7c', { metalness: 0.6 }), 12));
        put(r.ring(0.11, 0.008, [0, -0.44, 0], r.material('#6f7a7c')));
      } else {
        put(r.mesh(new THREE.ConeGeometry(0.26, 0.14, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#9aa3a5', metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }), [0, -0.27, 0]));
        put(r.ball([0.1, 0.12, 0.1], [0, -0.42, 0], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#eaf6ff', emissiveIntensity: glow * 1.6 }), 12));
        put(r.cylinder(0.07, 0.09, 0.1, [0, -0.58, 0], r.material('#a13a2a'), 12));
      }
      if (lit) {
        const streak = s.mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: a.lantern === 'gas' ? '#f4fbff' : '#ffb35a', transparent: true, opacity: mix(0.25, 0.7, night), depthWrite: false }), [3.3, 0.056, 0.3]);
        streak.rotation.x = -Math.PI / 2; streak.scale.set(0.9, 0.3, 1);
      }
    }

    // Cormorants.
    const birds: THREE.Group[] = [];
    const cormorant = (at: P3, pose: 'hunched' | 'spread' | 'fish' | 'alert', turn: number, neckOnly = false) => {
      const b = new Sculpture(context);
      b.root.position.set(...at); b.root.rotation.y = turn; b.root.scale.setScalar(1.4);
      r.root.add(b.root); birds.push(b.root);
      if (!neckOnly) {
        const body = b.ball([0.12, 0.2, 0.15], [0, 0.2, -0.03], black, 14);
        body.rotation.x = -0.35;
        b.ball([0.1, 0.11, 0.1], [0, 0.11, 0.02], r.material('#2a2c2e'), 10);
      }
      const up = pose === 'hunched' ? 0 : 0.1;
      b.tube([[0, 0.32, 0.02], [0, 0.42 + up, -0.04], [0, 0.52 + up * 1.5, 0.0], [0, 0.56 + up * 1.6, 0.07]], 0.036, black);
      const hy = 0.57 + up * 1.6;
      b.ball([0.045, 0.045, 0.065], [0, hy, 0.1], black, 10);
      b.ball([0.03, 0.028, 0.035], [0, hy - 0.022, 0.14], r.material('#e0a02a'), 8);
      b.rod([0, hy, 0.14], [0, hy - 0.005, 0.27], 0.014, r.material('#8f8a72'), 0.008);
      b.rod([0, hy - 0.005, 0.27], [0, hy - 0.035, 0.28], 0.008, r.material('#8f8a72'), 0.003);
      for (const x of [-0.03, 0.03]) b.ball([0.008, 0.008, 0.008], [x, hy + 0.012, 0.13], r.material('#3fd0a8', { emissive: '#1f8f70', emissiveIntensity: 0.6 }), 6);
      b.ring(0.04, 0.007, [0, 0.33, 0.015], straw).rotation.x = Math.PI / 2;
      if (!neckOnly) { const tail = b.box([0.09, 0.02, 0.22], [0, 0.03, -0.17], black); tail.rotation.x = 0.7; }
      if (!neckOnly) for (const x of [-0.05, 0.05]) b.box([0.05, 0.015, 0.09], [x, 0.0, 0.03], r.material('#3b3d3a'));
      if (!neckOnly) for (const side of [-1, 1]) {
        if (pose === 'spread') {
          const w = b.ball([0.26, 0.02, 0.11], [side * 0.3, 0.33, -0.06], black, 10); w.rotation.z = side * 0.35;
          const tip = b.ball([0.16, 0.015, 0.08], [side * 0.6, 0.4, -0.08], black, 8); tip.rotation.z = side * -0.25;
        } else { const w = b.ball([0.03, 0.17, 0.11], [side * 0.11, 0.2, -0.05], r.material('#1d2022', { metalness: 0.3 }), 10); w.rotation.x = -0.35; }
      }
      if (pose === 'fish') { const f = b.ball([0.11, 0.03, 0.02], [0, hy - 0.02, 0.26], r.material('#c9d3d6', { metalness: 0.7, roughness: 0.25 }), 8); f.rotation.z = 0.25; }
      return b;
    };

    const posing = a.fisherman === 'posing';
    const manX = posing ? -0.5 : -2.0;
    const perchY = posing ? 1.42 : 0.82;
    const perchA = posing ? manX - 1.25 : -0.35, perchB = posing ? manX + 1.25 : 1.75;
    r.rod([perchA, perchY, 0], [perchB, perchY, 0], 0.028, r.material(a.raft === 'pipe' ? '#b9b05a' : tones[0]));
    if (!posing) for (const x of [perchA + 0.2, perchB - 0.2]) {
      r.rod([x, deck - 0.05, -0.2], [x, perchY, 0], 0.022, wood); r.rod([x, deck - 0.05, 0.2], [x, perchY, 0], 0.022, wood);
    }
    const p1: P3 = [perchA + (posing ? 0.2 : 0.65), perchY + 0.03, 0], p2: P3 = [perchB - (posing ? 0.2 : 0.55), perchY + 0.03, 0];
    cormorant(p1, a.birds === 'drying' ? 'spread' : a.birds === 'fed' ? 'fish' : 'hunched', (random() - 0.5) * 0.8);
    if (a.birds === 'diving') {
      const dx = 0.6 + random() * 1.5, dz = 0.95 + random() * 0.25;
      const diver = cormorant([dx, -0.36, dz], 'fish', -0.6, true);
      diver.root.removeFromParent(); s.root.add(diver.root);
      ripple(dx, dz, 0.25); ripple(dx, dz, 0.5); ripple(dx, dz, 0.8);
    } else cormorant(p2, a.birds === 'hunched' ? 'hunched' : 'alert', (random() - 0.5) * 0.8 + (a.birds === 'drying' ? 0.6 : 0));

    // Fisherman, or what he left.
    const hat = (at: P3, tilt = 0) => { const h = r.mesh(new THREE.ConeGeometry(0.34, 0.2, 20), straw, at); h.rotation.z = tilt; return h; };
    const poleMat = r.material('#b9a75c');
    if (a.fisherman === 'absent') {
      r.rod([-3.0, deck + 0.03, half - 0.1], [2.2, deck + 0.05, -half + 0.15], 0.025, poleMat);
      hat([-1.7, deck + 0.1, 0.1], 0.12);
    } else {
      const sit = a.fisherman === 'seated';
      const hip = sit ? 0.42 : 0.86;
      if (sit) {
        r.cylinder(0.14, 0.16, 0.3, [manX, deck + 0.15, 0], wood, 10);
        for (const z of [-0.1, 0.1]) { r.rod([manX, deck + hip - 0.05, z], [manX + 0.38, deck + hip, z], 0.06, r.material('#3a3a3c')); r.rod([manX + 0.38, deck + hip, z], [manX + 0.42, deck + 0.04, z], 0.045, skin); }
      } else for (const z of [-0.1, 0.1]) { r.rod([manX, deck, z], [manX, deck + 0.45, z], 0.045, skin); r.rod([manX, deck + 0.4, z], [manX, deck + hip, z], 0.07, r.material('#3a3a3c')); }
      const lean = a.fisherman === 'poling' ? 0.12 : 0;
      const sh: P3 = [manX + lean, deck + hip + 0.52, 0];
      r.rod([manX, deck + hip - 0.04, 0], sh, 0.16, indigo, 0.19);
      r.ball([0.105, 0.12, 0.105], [sh[0] + 0.02, sh[1] + 0.2, 0], skin, 12);
      hat([sh[0] + 0.02, sh[1] + 0.36, 0]);
      if (a.fisherman === 'poling') {
        r.rod(sh, [manX + 0.35, deck + 1.05, 0.28], 0.04, indigo); r.rod([sh[0], sh[1], 0], [manX + 0.3, deck + 0.8, 0.3], 0.04, indigo);
        r.rod([manX - 1.5, -0.02, 0.8], [manX + 1.3, deck + 2.2, 0.05], 0.022, poleMat);
        ripple(manX - 1.5, 0.8, 0.2);
      } else if (posing) {
        for (const side of [-1, 1]) { r.rod(sh, [manX + side * 0.45, perchY - 0.02, 0.02], 0.04, indigo); }
      } else {
        r.rod(sh, [manX + 0.3, sh[1] - 0.25, 0.12], 0.04, indigo); r.rod([manX + 0.3, sh[1] - 0.25, 0.12], [manX + 0.18, sh[1] + 0.1, 0.1], 0.035, skin);
        r.rod([manX + 0.18, sh[1] + 0.1, 0.1], [manX + 0.42, sh[1] + 0.02, 0.14], 0.01, wood);
        r.rod([-3.0, deck + 0.03, half - 0.1], [1.9, deck + 0.05, half - 0.05], 0.025, poleMat);
      }
    }

    // Basket and catch.
    const bx = posing ? 1.5 : -0.95, bz = 0.05;
    const basket = r.lathe([[0.1, 0], [0.2, 0.03], [0.27, 0.2], [0.24, 0.36], [0.15, 0.44], [0.16, 0.47]], new THREE.MeshStandardMaterial({ color: '#9c7a45', roughness: 0.9, side: THREE.DoubleSide }), [bx, deck, bz]);
    for (const y of [0.1, 0.2, 0.3]) r.ring(y === 0.2 ? 0.275 : 0.25, 0.01, [bx, deck + y, bz], r.material('#6f5530')).rotation.x = Math.PI / 2;
    void basket;
    const fishMat = r.material('#c3ced2', { metalness: 0.7, roughness: 0.25 });
    const fishCount = Math.round(a.catch * a.catch * 22);
    for (let k = 0; k < fishCount; k++) {
      const spill = k > 9;
      const th = random() * 6.28, d = spill ? 0.3 + random() * 0.35 : random() * 0.1;
      const f = r.ball([0.11 + random() * 0.05, 0.022, 0.035], [bx + Math.cos(th) * d, spill ? deck + 0.02 : deck + 0.44 + (k / 10) * 0.07, bz + Math.sin(th) * d * 0.6], fishMat, 8);
      f.rotation.y = random() * 3.1; if (!spill) f.rotation.z = (random() - 0.5) * 0.8;
    }

    if (a.cargo === 'net') {
      const nx = posing ? -2.4 : 0.9;
      const heap = r.ball([0.45, 0.14, 0.32], [nx, deck + 0.08, -0.05], r.material('#4c6a5a', { roughness: 1, flatShading: true }), 9);
      heap.rotation.y = random();
      for (let k = 0; k < 7; k++) r.ball([0.045, 0.03, 0.045], [nx + (random() - 0.5) * 0.8, deck + 0.14 + random() * 0.08, (random() - 0.5) * 0.5], r.material('#c79a5a'), 8);
    } else if (a.cargo === 'kettle') {
      const kx = posing ? -2.4 : 0.9;
      r.cylinder(0.14, 0.11, 0.2, [kx, deck + 0.1, -0.05], r.material('#a5542f'), 12);
      r.cylinder(0.1, 0.1, 0.02, [kx, deck + 0.2, -0.05], new THREE.MeshStandardMaterial({ color: '#ff8a3a', emissive: '#ff5a1a', emissiveIntensity: mix(0.5, 2, night) }), 12);
      r.ball([0.1, 0.085, 0.1], [kx, deck + 0.3, -0.05], r.material('#2f3336', { metalness: 0.5 }), 12);
      r.rod([kx + 0.08, deck + 0.3, -0.05], [kx + 0.2, deck + 0.37, -0.05], 0.014, r.material('#2f3336'));
      r.ring(0.07, 0.008, [kx, deck + 0.38, -0.05], r.material('#2f3336'), Math.PI);
      r.cylinder(0.07, 0.04, 0.05, [kx + 0.32, deck + 0.025, 0.12], r.material('#e8e4d6'), 12);
    } else if (a.cargo === 'seats') {
      const sx = posing ? -2.5 : 0.75;
      const plastic = r.material(mood.cheer > 0.5 ? '#d8342c' : '#3b6fb0', { roughness: 0.4 });
      for (const dx of [-0.3, 0.3]) {
        r.box([0.4, 0.04, 0.4], [sx + dx, deck + 0.38, 0], plastic); r.box([0.04, 0.4, 0.4], [sx + dx - 0.2, deck + 0.6, 0], plastic);
        for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) r.rod([sx + dx + lx, deck, lz], [sx + dx + lx * 0.9, deck + 0.38, lz * 0.9], 0.015, plastic);
      }
      r.rod([sx - 0.05, deck, -0.25], [sx - 0.05, deck + 1.75, -0.25], 0.018, r.material('#c9ccce', { metalness: 0.6 }));
      const shade = r.mesh(new THREE.ConeGeometry(0.95, 0.28, 8, 1, true), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#f2c230' : '#b9c2b0', roughness: 0.8, side: THREE.DoubleSide, flatShading: true }), [sx - 0.05, deck + 1.72, -0.25]);
      void shade;
    }
    ripple(0, 0, 3.4);

    const amp = mix(0.004, 0.035, mood.energy), speed = mix(0.5, 2.2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        r.root.position.y = Math.sin(time * speed) * amp;
        r.root.rotation.x = Math.sin(time * speed * 0.7) * amp * 0.8;
        if (lamp) lamp.rotation.z = Math.sin(time * speed * 0.9) * mix(0.03, 0.2, mood.energy);
      },
    });
  },
});
