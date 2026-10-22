import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PAYLOADS = {
  ore: 'A heaped bucket of grey ore.',
  ice: 'Blocks of blue-white ice.',
  ingots: 'Stacked bright ingots, refined and valuable.',
  canister: 'A sealed orange mail canister.',
  casket: 'A long plain casket with a flag over it: someone going home.',
  slag: 'Black slag, just being thrown away.',
} as const;

export default defineThing({
  questions: {
    length: score('How long is the rail?', ['A stubby test rig, four or five rings', 'A working launcher', 'A long rail striding across the pit', 'A monster that runs out of sight']),
    state: choice('What is it doing right now?', {
      idle: 'Idle and cold, the bucket parked at the breech.',
      charging: 'Charging: every ring glowing, bucket loaded, seconds from the shot.',
      firing: 'Firing: the bucket halfway up the rail with a streak behind it, rings lighting in sequence.',
      fault: 'Faulted mid-shot: the bucket jammed crooked, a ring knocked askew, cargo spilled below.',
    }),
    aim: choice('What is it aimed at?', {
      catcher: 'A catcher in low orbit: a shallow, businesslike climb.',
      sky: 'The deep sky: steeply up at the stars.',
      rival: "Dead level across the pit at a rival's claim, with a warning board beside it.",
      home: 'The home world: a middling angle, and a painted planet on the breech board.',
    }),
    payload: choice('What is in the bucket?', PAYLOADS),
    rings: choice('What are the coil rings like?', {
      hoops: 'Slim copper hoops, evenly spaced, elegant.',
      frames: 'Heavy square frames with boxed windings.',
      salvage: 'Mismatched salvaged rings of different sizes, some wrapped in tape.',
    }),
    power: choice('What feeds it?', {
      capacitors: 'A bank of fat capacitor drums.',
      reactor: 'A squat shielded reactor drum with a glowing sight glass.',
      solar: 'A tilted solar panel array.',
      batteries: 'A heap of vehicle batteries and jumper cables.',
    }),
    hopper: noul('Is there a loading hopper over the breech?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = mix(6.5, 18, a.length);
    const angle = THREE.MathUtils.degToRad({ catcher: 12, sky: 30, rival: 1.5, home: 20 }[a.aim]);
    const baseY = 1.3;
    const steel = s.material('#8a9196', { metalness: 0.7, roughness: 0.4 });
    const frame = s.material(mood.cheer > 0.5 ? '#d8a020' : '#7a8288', { metalness: 0.4, roughness: 0.55 });
    const dark = s.material('#2a2d30', { roughness: 0.7 });
    const copper = '#c57a3a';
    const glowColour = new THREE.Color().setHSL(mix(0.56, 0.06, mood.warmth), 1, 0.5);
    const at = (t: number, lift = 0): [number, number, number] => [-L / 2 * Math.cos(angle) + t * L * Math.cos(angle) - Math.sin(angle) * lift, baseY + t * L * Math.sin(angle) + Math.cos(angle) * lift, 0];

    // The rail lives in a tilted group; trestles are planted upright under it.
    const rail = new THREE.Group();
    rail.position.set(...at(0));
    rail.rotation.z = angle;
    s.root.add(rail);
    const add = <T extends THREE.Object3D>(node: T, x = 0, y = 0, z = 0) => { node.position.set(x, y, z); node.traverse((child) => { child.castShadow = child.receiveShadow = true; }); rail.add(node); return node; };
    for (const z of [-0.36, 0.36]) add(new THREE.Mesh(new THREE.BoxGeometry(L, 0.2, 0.16), steel), L / 2, 0, z);
    add(new THREE.Mesh(new THREE.BoxGeometry(L, 0.14, 0.5), dark), L / 2, -0.14, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 1.1), frame), -0.2, 0.2, 0);

    const spacing = a.rings === 'frames' ? 1.7 : 1.35;
    const count = Math.max(4, Math.floor((L - 1.2) / spacing));
    const coils: { material: THREE.MeshStandardMaterial; t: number; dead: boolean }[] = [];
    const askew = a.state === 'fault' ? Math.floor(count * 0.55) : -1;
    for (let i = 0; i < count; i++) {
      const x = 1.1 + i * (L - 1.6) / (count - 1);
      const dead = a.state === 'fault' && (i === askew || random() < 0.3) || random() < mood.wear * 0.15;
      const material = new THREE.MeshStandardMaterial({ color: copper, metalness: 0.6, roughness: 0.4, emissive: dead && a.state === 'fault' ? new THREE.Color('#ff2a1c') : glowColour, emissiveIntensity: 0 });
      const size = a.rings === 'salvage' ? mix(0.75, 1.15, random()) : 1;
      const ring = new THREE.Group();
      if (a.rings === 'frames') {
        const housing = s.material('#4a4f55', { metalness: 0.4 });
        for (const [h, d, y, z] of [[0.24, 1.9, 1.25, 0], [0.24, 1.9, -0.41, 0], [1.9, 0.24, 0.42, 0.83], [1.9, 0.24, 0.42, -0.83]] as const) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.34, h, d), housing);
          bar.position.set(0, y, z); ring.add(bar);
          const winding = new THREE.Mesh(new THREE.BoxGeometry(0.5, h > 1 ? 1.0 : 0.34, d > 1 ? 1.0 : 0.34), material);
          winding.position.set(0, y, z); ring.add(winding);
        }
      } else {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.92 * size, a.rings === 'salvage' ? mix(0.08, 0.16, random()) : 0.1, 8, 28), material);
        hoop.rotation.y = Math.PI / 2; hoop.position.y = 0.42; ring.add(hoop);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.9), dark); foot.position.y = -0.3 - (size - 1) * 0.5; ring.add(foot);
        if (a.rings === 'salvage' && random() > 0.5) { const tape = new THREE.Mesh(new THREE.TorusGeometry(0.92 * size, 0.1, 6, 8, 0.6), s.material(['#c8c8c0', '#d8b020', '#3f78a8'][i % 3])); tape.rotation.set(0, Math.PI / 2, 0); tape.rotation.x = random() * 5; tape.position.y = 0.42; ring.add(tape); }
      }
      if (i === askew) { ring.rotation.set(0.5, 0.3, -0.35); ring.position.y = -0.25; }
      add(ring, x, ring.position.y, 0);
      coils.push({ material, t: x / L, dead });
    }
    // Bus cable slung along one side.
    const cable: [number, number, number][] = [];
    for (let i = 0; i <= count; i++) cable.push([i * L / count, -0.3 - (i % 2) * 0.12, 0.52]);
    add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cable.map((p) => new THREE.Vector3(...p))), count * 6, 0.035, 6), dark));

    // Trestles.
    const trestles = Math.max(2, Math.round(L / 3.2));
    for (let i = 0; i < trestles; i++) {
      const t = (i + 0.35) / trestles;
      const top = at(t, -0.2);
      const spread = 0.5 + top[1] * 0.22;
      for (const z of [-1, 1]) {
        s.rod([top[0], 0, z * spread], [top[0], top[1], z * 0.3], 0.1, frame);
        s.cylinder(0.16, 0.2, 0.06, [top[0], 0.03, z * spread], dark, 6);
      }
      s.rod([top[0], top[1] * 0.45, -0.3 - (spread - 0.3) * 0.55], [top[0], top[1] * 0.45, 0.3 + (spread - 0.3) * 0.55], 0.045, frame);
      if (top[1] > 3) s.rod([top[0], 0.1, -spread], [top[0], top[1] * 0.45, 0.3 + (spread - 0.3) * 0.55], 0.03, steel);
      if (i > 0 && top[1] > 2) { const previous = at((i - 0.65) / trestles, -0.2); s.rod([previous[0], previous[1] * 0.45, 0], [top[0], top[1] * 0.9, 0], 0.035, steel); }
    }

    // The bucket and its cargo.
    const bucketT = { idle: 0.035, charging: 0.035, firing: mix(0.45, 0.75, random()), fault: (askew + 0.4) / count * 0.9 }[a.state];
    const bucket = new THREE.Group();
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); bucket.add(mesh); return mesh; };
    const sled = s.material('#c8452a', { metalness: 0.3 });
    part(new THREE.BoxGeometry(1.3, 0.1, 0.62), sled, 0, 0.14, 0);
    for (const z of [-0.3, 0.3]) part(new THREE.BoxGeometry(1.3, 0.34, 0.05), sled, 0, 0.32, z);
    for (const x of [-0.63, 0.63]) part(new THREE.BoxGeometry(0.05, 0.34, 0.62), sled, x, 0.32, 0);
    const tints = { ore: ['#84878a', '#6c6f72', '#9c9d9a'], ice: ['#cde6f3', '#a8d3ec', '#eef9fc'], slag: ['#2a2a2e', '#3a3836', '#1e1e22'] } as const;
    const spilled: { at: [number, number, number]; size: number; color: string }[] = [];
    if (a.payload === 'ore' || a.payload === 'ice' || a.payload === 'slag') {
      const palette = tints[a.payload];
      const lumps = new THREE.InstancedMesh(a.payload === 'ice' ? new THREE.BoxGeometry(1.5, 1.2, 1.4) : new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff', roughness: a.payload === 'ice' ? 0.25 : 0.9, flatShading: true }), 22);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion();
      for (let i = 0; i < 22; i++) {
        const x = (random() - 0.5) * 1.05, z = (random() - 0.5) * 0.45, size = mix(0.09, 0.17, random());
        turn.setFromEuler(new THREE.Euler(random() * 6, random() * 6, 0));
        matrix.compose(new THREE.Vector3(x, 0.4 + (1 - Math.abs(x) / 0.6) * 0.25 * random() + 0.08, z), turn, new THREE.Vector3(size, size, size));
        lumps.setMatrixAt(i, matrix); lumps.setColorAt(i, new THREE.Color(palette[i % palette.length]));
      }
      bucket.add(lumps);
      part(new THREE.BoxGeometry(1.2, 0.22, 0.55), new THREE.MeshStandardMaterial({ color: palette[0], roughness: 0.9 }), 0, 0.3, 0);
      if (a.state === 'fault') for (let i = 0; i < 18; i++) spilled.push({ at: [at(bucketT)[0] + (random() - 0.5) * 2.6, 0.08, (random() - 0.5) * 2.4], size: mix(0.09, 0.2, random()), color: palette[i % palette.length] });
    } else if (a.payload === 'ingots') {
      const metal = s.material('#d9dde0', { metalness: 0.9, roughness: 0.2 });
      for (let i = 0; i < 9; i++) part(new THREE.BoxGeometry(0.34, 0.12, 0.2), i % 4 === 0 ? s.material('#e8c050', { metalness: 0.9, roughness: 0.25 }) : metal, -0.38 + (i % 3) * 0.38, 0.26 + Math.floor(i / 3) * 0.13, (i % 2 - 0.5) * 0.24 * (i < 6 ? 1 : 0));
    } else if (a.payload === 'canister') {
      const can = part(new THREE.CapsuleGeometry(0.26, 0.7, 4, 12), s.material('#e8782a'), 0, 0.5, 0);
      can.rotation.z = Math.PI / 2;
      const band = part(new THREE.CylinderGeometry(0.27, 0.27, 0.16, 12), s.material('#f2f0e8'), 0, 0.5, 0); band.rotation.z = Math.PI / 2;
    } else {
      part(new THREE.BoxGeometry(1.6, 0.34, 0.5), s.material('#8a6a48', { roughness: 0.8 }), 0.05, 0.42, 0);
      part(new THREE.BoxGeometry(0.9, 0.02, 0.54), s.material(mood.cheer > 0.5 ? '#3f6fb8' : '#b8b4a8'), 0.2, 0.6, 0);
      part(new THREE.BoxGeometry(0.9, 0.02, 0.12), s.material('#c8281c'), 0.2, 0.612, 0);
    }
    if (a.state === 'fault') { bucket.rotation.set(0.5, 0.25, 0.2); bucket.position.y = 0.2; }
    add(bucket, bucketT * L, bucket.position.y, 0);
    if (a.state === 'firing') {
      const streak = new THREE.Mesh(new THREE.ConeGeometry(0.42, L * bucketT * 0.8, 10, 1, true), new THREE.MeshBasicMaterial({ color: glowColour, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
      streak.rotation.z = -Math.PI / 2; streak.position.set(bucketT * L - L * bucketT * 0.4 - 0.6, 0.4, 0); rail.add(streak);
    }
    if (spilled.length) s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.9, flatShading: true }), spilled);

    // Breech: hopper, power supply, board.
    const breech = at(0);
    if (a.hopper) {
      const hy = breech[1] + 1.9;
      const funnel = s.mesh(new THREE.CylinderGeometry(1.0, 0.3, 1.2, 4, 1, true), s.material('#8f8a7a', { side: THREE.DoubleSide, metalness: 0.4 }), [breech[0] + 0.6, hy, 0]);
      funnel.rotation.y = Math.PI / 4;
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([breech[0] + 0.6 + x * 0.75, 0, z * 0.95], [breech[0] + 0.6 + x * 0.6, hy + 0.5, z * 0.62], 0.05, frame);
      s.box([0.4, 0.5, 0.4], [breech[0] + 0.6, hy - 0.8, 0], dark);
    }
    const px = breech[0] - 1.6, pz = -1.5;
    const feed = (to: [number, number, number]) => s.tube([to, [(to[0] + breech[0]) / 2, 0.08, to[2] * 0.6], [breech[0] - 0.3, 0.3, -0.3], [breech[0] - 0.15, breech[1] - 0.2, -0.2]], 0.05, dark);
    if (a.power === 'capacitors') {
      for (let i = 0; i < 4; i++) {
        s.cylinder(0.36, 0.36, 1.3, [px - 0.5 + i * 0.85, 0.65, pz], s.material('#3a6a8a', { metalness: 0.4 }), 14);
        s.cylinder(0.1, 0.1, 0.2, [px - 0.5 + i * 0.85, 1.4, pz], new THREE.MeshStandardMaterial({ color: '#e8f4ff', emissive: glowColour, emissiveIntensity: a.state === 'idle' ? 0.2 : 1.5 }), 8);
      }
      s.rod([px - 0.5, 1.45, pz], [px + 2.05, 1.45, pz], 0.03, s.material(copper, { metalness: 0.8 }));
      feed([px + 2.05, 1.3, pz]);
    } else if (a.power === 'reactor') {
      s.cylinder(0.9, 1.0, 1.5, [px, 0.75, pz], s.material('#6a7068', { metalness: 0.3 }), 16);
      s.cylinder(0.95, 0.95, 0.12, [px, 1.3, pz], s.material('#d8b020'), 16);
      for (let i = 0; i < 6; i++) s.box([0.06, 1.2, 0.5], [px + Math.cos(i * 1.05) * 1.15, 0.7, pz + Math.sin(i * 1.05) * 1.15], steel).rotation.y = -i * 1.05;
      s.ball([0.2, 0.2, 0.08], [px + 0.2, 0.85, pz + 0.96], new THREE.MeshStandardMaterial({ color: '#b8ffe0', emissive: '#4dffc0', emissiveIntensity: mix(0.8, 2.2, mood.energy) }), 10);
      feed([px + 0.9, 0.5, pz + 0.3]);
    } else if (a.power === 'solar') {
      for (let i = 0; i < 3; i++) {
        const panel = s.box([1.5, 0.05, 2.2], [px - 1.2 + i * 1.65, 1.5, pz - 0.6], s.material('#24406a', { metalness: 0.6, roughness: 0.25 }));
        panel.rotation.x = 0.6;
        s.rod([px - 1.2 + i * 1.65, 0, pz - 0.6], [px - 1.2 + i * 1.65, 1.5, pz - 0.6], 0.05, steel);
      }
      feed([px + 2.1, 0.3, pz - 0.6]);
    } else {
      for (let i = 0; i < 9; i++) {
        const x = px + (i % 3) * 0.48 + (random() - 0.5) * 0.1, z = pz + Math.floor(i / 3) * 0.34 + (random() - 0.5) * 0.08;
        s.box([0.42, 0.3, 0.26], [x, 0.15, z], s.material(['#2a2d30', '#3f5a78', '#b8b4a8'][i % 3])).rotation.y = (random() - 0.5) * 0.4;
        s.cylinder(0.03, 0.03, 0.06, [x - 0.12, 0.33, z], s.material('#c0281f'), 6);
        s.cylinder(0.03, 0.03, 0.06, [x + 0.12, 0.33, z], dark, 6);
      }
      for (let i = 0; i < 3; i++) s.tube([[px + i * 0.48, 0.34, pz], [px + 0.4 + i * 0.3, 0.7 + i * 0.2, pz + 0.6], [breech[0] - 0.4, 0.5, -0.5 + i * 0.2], [breech[0] - 0.2, breech[1] - 0.2, -0.3]], 0.03, s.material(['#c0281f', '#18181a', '#d8b020'][i]));
    }
    const boardX = breech[0] - 0.4, boardZ = 1.5;
    for (const dx of [-0.6, 0.6]) s.rod([boardX + dx, 0, boardZ], [boardX + dx, 1.9, boardZ], 0.04, steel);
    const text = { catcher: 'CATCHER 4', sky: 'OUTBOUND', rival: 'KEEP CLEAR', home: 'HOME' }[a.aim];
    s.label(text, 1.5, 0.5, [boardX, 1.75, boardZ + 0.03], a.aim === 'rival' ? '#ffffff' : '#1c2a40', a.aim === 'rival' ? '#c8201a' : '#e8e4d2');
    s.box([1.56, 0.56, 0.04], [boardX, 1.75, boardZ], dark);
    if (a.aim === 'home') { s.cylinder(0.3, 0.3, 0.03, [boardX, 1.1, boardZ + 0.03], s.material('#3f78c8'), 20).rotation.x = Math.PI / 2; s.cylinder(0.14, 0.1, 0.035, [boardX - 0.06, 1.14, boardZ + 0.035], s.material('#4fa85a'), 7).rotation.x = Math.PI / 2; }
    if (a.aim === 'rival') { s.ring(0.26, 0.04, [boardX, 1.1, boardZ + 0.03], s.material('#c8201a')); s.box([0.7, 0.05, 0.03], [boardX, 1.1, boardZ + 0.03], s.material('#c8201a')); s.box([0.05, 0.7, 0.03], [boardX, 1.1, boardZ + 0.03], s.material('#c8201a')); }

    const base = { idle: 0.08, charging: 0.55, firing: 0.15, fault: 0.0 }[a.state];
    const light = (time: number) => {
      for (const coil of coils) {
        if (coil.dead) { coil.material.emissiveIntensity = a.state === 'fault' ? (Math.sin(time * 9 + coil.t * 40) > 0.2 ? 1.0 : 0.1) : 0; continue; }
        const pulse = a.state === 'firing' ? Math.max(0, 1 - Math.abs(((time * mix(0.4, 1.6, mood.energy) + 0.999) % 1) * 1.3 - 0.15 - coil.t) * 4) * 1.6
          : a.state === 'charging' ? 0.5 + 0.5 * Math.sin(time * mix(2, 9, mood.energy) - coil.t * 9) : a.state === 'fault' ? 0.3 : 0.5 + 0.5 * Math.sin(time * 1.2 - coil.t * 5);
        coil.material.emissiveIntensity = base + pulse * mix(0.2, 0.7, mood.energy) * (a.state === 'idle' ? 0.3 : 1);
      }
    };
    // Set the still frame so the shot reads without motion: rings brightest around the bucket.
    light(a.state === 'firing' ? (bucketT + 0.15) / 1.3 / mix(0.4, 1.6, mood.energy) : 0.4);
    return s.finish({ footprint: Math.min(L / 2, 3), update: (_dt, time) => light(time) });
  },
});
