import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type P3, bracket, cluster, glow, motes, mottle, mushroom, paint, put } from './fungi';

const SPECIES = {
  turkeytail: 'Turkey tail: thin leathery fans in many fine bands of brown, rust and cream.',
  sulphur: 'Chicken-of-the-woods: thick ruffled shelves in sulphur yellow and orange.',
  conk: 'Artist’s conk: heavy hoof-like shelves, grey-brown above and chalk white beneath.',
  oyster: 'Oyster: soft pale grey drooping caps, gilled and tender.',
  beefsteak: 'Beefsteak: wet, fleshy, blood-red tongues.',
  ghost: 'Ghost fungus: pallid shelves that glow green from underneath.',
} as const;
const LOOK: Record<keyof typeof SPECIES, { colours: string[]; thick: number; tilt: number; rough: number; emissive?: string }> = {
  turkeytail: { colours: ['#eadfc4', '#f5ecd4', '#6f4329', '#c98a4a', '#4f5f6a', '#a8683a'], thick: 0.14, tilt: 0, rough: 0.9 },
  sulphur: { colours: ['#f6e27a', '#fff2a6', '#ee8222', '#f6b43a'], thick: 0.3, tilt: -0.08, rough: 0.8 },
  conk: { colours: ['#f4f0e4', '#e8e2d0', '#5a4a3c', '#7d6a56'], thick: 0.42, tilt: 0, rough: 0.95 },
  oyster: { colours: ['#f4efe4', '#ebe5d8', '#b0a89c', '#cdc6ba'], thick: 0.2, tilt: 0.18, rough: 0.7 },
  beefsteak: { colours: ['#e8b0a0', '#d0473c', '#8a1f24', '#aa2e2c'], thick: 0.34, tilt: 0.06, rough: 0.3 },
  ghost: { colours: ['#b6f7a0', '#eef8e2', '#b4c4a2', '#dbe6ce'], thick: 0.22, tilt: 0.05, rough: 0.7, emissive: '#3fd45c' },
};

export default defineThing({
  questions: {
    species: choice('What kind of shelf fungus is it built from?', SPECIES),
    preached: choice('What is preached from it now?', {
      nothing: 'Nothing: the cup stands empty.',
      skeleton: 'A skeleton leans over the rim, still mid-sermon.',
      bloom: 'A great fruiting body has risen from the cup and blooms where the preacher stood.',
      voice: 'A column of glowing spores rises from the cup like a voice.',
      robe: 'An empty hooded robe stands upright in it, stiff with mould.',
    }),
    core: choice('What do the shelves grow from?', {
      pier: 'A clustered stone pier of the old church.',
      trunk: 'A dead tree trunk that came up through the floor.',
      stalk: 'One enormous pale fungal stalk.',
    }),
    height: score('How high does the pulpit stand?', ['A few steps, almost conversational', 'Head height', 'Towering over the congregation']),
    book: choice('What state is the book in?', {
      open: 'Open and still legible, a ribbon across the page.',
      gills: 'Its pages have become gills: the book itself is a fungus now.',
      closed: 'Closed and clasped, nobody has opened it since.',
      fallen: 'Fallen to the floor at the foot of the steps, face down.',
    }),
    steps: choice('What has been left on the steps?', {
      bare: 'Nothing.',
      candles: 'A candle stub on every step.',
      pages: 'Loose pages scattered down them.',
      bowls: 'Small offering bowls.',
    }),
    canopy: choice('What hangs over the preacher’s head?', {
      none: 'Nothing, open air.',
      shelf: 'One vast shelf fungus as a sounding board.',
      tester: 'The old carved wooden canopy, sagging and furred.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const look = LOOK[a.species];
    const level = mix(0.4, 0.95, mood.cheer);
    const tint = new THREE.Color(look.emissive ?? '#7fe86a').offsetHSL((mood.warmth - 0.5) * -0.12, 0, 0);
    const shelfMaterial: THREE.MeshStandardMaterialParameters = { roughness: look.rough, ...(look.emissive ? { emissive: tint, emissiveIntensity: level * 0.45 } : {}) };
    const cupY = mix(1.1, 2.5, a.height);
    const coreR = 0.3;
    const coreH = cupY + (a.canopy === 'none' ? 1.5 : 2.7);

    // ---- the core the shelves grow from
    if (a.core === 'pier') {
      const stone = paint('#ffffff', { map: mottle(random, '#b9b3a2', ['#8f9a78', '#d2ccbb', '#7d7a70'], 120) });
      s.cylinder(coreR, coreR, coreH, [0, coreH / 2, 0], stone, 12);
      for (let i = 0; i < 4; i++) s.cylinder(0.09, 0.09, coreH, [Math.sin(i * 1.57 + 0.78) * coreR, coreH / 2, Math.cos(i * 1.57 + 0.78) * coreR], stone, 8);
      s.cylinder(coreR + 0.16, coreR + 0.22, 0.25, [0, 0.125, 0], stone, 8);
      s.lathe([[coreR + 0.05, 0], [coreR + 0.25, 0.2], [coreR + 0.28, 0.3], [0.001, 0.3]], stone, [0, coreH - 0.02, 0]);
    } else if (a.core === 'trunk') {
      const bark = paint('#ffffff', { map: mottle(random, '#5e4a38', ['#3f3226', '#7a6650', '#6a7a52'], 120) });
      s.lathe([[coreR * 1.9, 0], [coreR * 1.25, 0.3], [coreR, 0.9], [coreR * 0.92, coreH * 0.7], [coreR * 0.8, coreH], [0.001, coreH + 0.05]], bark);
      for (let i = 0; i < 5; i++) s.rod([Math.sin(i * 1.3) * 0.2, 0.25, Math.cos(i * 1.3) * 0.2], [Math.sin(i * 1.3) * 0.85, 0, Math.cos(i * 1.3) * 0.85], 0.12, bark, 0.04);
      s.rod([0, coreH - 0.5, 0], [-0.7, coreH + 0.25, -0.3], 0.1, bark, 0.03);
      s.rod([0, coreH - 0.9, 0], [0.55, coreH - 0.2, -0.4], 0.08, bark, 0.02);
    } else {
      const pale = paint('#ffffff', { map: mottle(random, '#e6dcc2', ['#c9bb97', '#f4eedd', '#b3a37c'], 120) });
      s.lathe([[coreR * 1.7, 0], [coreR * 1.5, 0.2], [coreR * 1.05, 0.7], [coreR * 0.95, coreH * 0.8], [coreR * 1.1, coreH], [0.001, coreH]], pale);
      mushroom(s.root, { at: [0, coreH - 0.1, 0], height: 0.12, cap: 0.75, capHeight: 0.4, stalk: coreR, capMat: pale, gillMat: glow(tint, level * 0.5, { side: THREE.DoubleSide }), stalkMat: pale });
    }

    // ---- the spiral of steps: the foot faces the viewer, the top arrives at the side or back of the cup
    const rise = 0.24;
    const count = Math.max(4, Math.round((cupY + 0.25) / rise));
    const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
    const foot = 0.95;
    const turn = [0.5, 0.57, 0.43, 0.64, 0.36, 0.7].find((t) => Math.abs(wrap(foot + (count - 1) * t)) > 1.25) ?? 0.5;
    const stepSpots: { at: P3; angle: number }[] = [];
    const rail: P3[] = [];
    const railMat = paint(look.colours[1], { roughness: 0.9 });
    for (let k = 0; k < count; k++) {
      const angle = foot + k * turn, y = (k + 1) * rise;
      const radius = mix(1.05, 0.8, k / (count - 1)) + random() * 0.08;
      const thick = Math.max(0.11, radius * look.thick * 0.8);
      bracket(s.root, { at: [Math.sin(angle) * (coreR - 0.08), y - thick * 0.6, Math.cos(angle) * (coreR - 0.08)], radius, thick, yaw: angle + (random() - 0.5) * 0.12, tilt: look.tilt * 0.5, colours: look.colours, phase: random() * 6, material: shelfMaterial });
      stepSpots.push({ at: [Math.sin(angle) * (coreR + radius * 0.5), y + 0.02, Math.cos(angle) * (coreR + radius * 0.5)], angle });
      const reach = coreR + radius * 0.92;
      const post: P3 = [Math.sin(angle) * reach, y + 0.82, Math.cos(angle) * reach];
      rail.push(post);
      if (k % 2 === 0) s.rod([post[0], y - 0.02, post[2]], post, 0.022, railMat, 0.016);
    }
    const last = rail[rail.length - 1];
    rail.unshift([rail[0][0] * 1.04, 0.5, rail[0][2] * 1.04]);
    rail.push([last[0] * 0.8, last[1] - 0.05, last[2] * 0.8]);
    s.tube(rail, 0.03, railMat);
    // lesser shelves crowding the pillar
    const extras = Math.round(mix(4, 16, mood.density));
    for (let i = 0; i < extras; i++) {
      const angle = random() * Math.PI * 2, radius = 0.16 + random() * 0.24;
      bracket(s.root, { at: [Math.sin(angle) * coreR * 0.9, 0.2 + random() * (coreH - 0.5), Math.cos(angle) * coreR * 0.9], radius, thick: radius * look.thick * 1.2, yaw: angle, tilt: look.tilt, colours: look.colours, phase: random() * 6, material: shelfMaterial });
    }

    // ---- the cup
    const cupZ = 0.62, cupR = 0.74;
    const [under, rim, bandA, bandB] = look.colours;
    const cupMat = paint('#ffffff', { map: mottle(random, bandB, [bandA, rim, bandB], 160), roughness: look.rough, side: THREE.DoubleSide, ...(look.emissive ? { emissive: tint, emissiveIntensity: level * 0.25 } : {}) });
    s.lathe([[0.12, -0.75], [0.3, -0.45], [cupR * 0.75, -0.12], [cupR * 0.95, 0.15], [cupR, 0.9], [cupR + 0.08, 1.0], [cupR - 0.02, 1.02], [cupR - 0.08, 0.2], [0.001, 0.06]], cupMat, [0, cupY, cupZ]);
    s.ring(cupR + 0.03, 0.045, [0, cupY + 1.0, cupZ], paint(rim, { roughness: look.rough })).rotation.x = Math.PI / 2;
    for (let i = 0; i < 7; i++) {
      const angle = -1.2 + i * 0.4;
      bracket(s.root, { at: [Math.sin(angle) * cupR * 0.97, cupY + 0.25 + (i % 2) * 0.3, cupZ + Math.cos(angle) * cupR * 0.97], radius: 0.2 + random() * 0.12, yaw: angle, tilt: look.tilt, colours: look.colours, phase: random() * 6, material: shelfMaterial });
    }
    s.rod([0, cupY - 0.6, 0.1], [0, cupY - 0.7, cupZ], 0.2, paint(under), 0.14);

    // ---- the book on its rest
    const page = paint('#ffffff', { map: mottle(random, '#e6dcc0', ['#b9c2a0', '#cdbf96', '#8f9a7c', '#6a5a44'], 70, 64) });
    const book = new THREE.Group();
    if (a.book === 'closed') {
      put(book, new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 0.56), s.material('#5a1f24')));
      put(book, new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.085, 0.565), page), [0.015, 0, 0]);
      put(book, new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.06), paint('#b08a3c', { metalness: 0.8, roughness: 0.4 })), [0, 0, 0.12]);
    } else {
      put(book, new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.025, 0.56), s.material('#5a1f24')));
      for (const side of [-1, 1]) {
        const leaf = put(book, new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.52, 14, 1, false, -0.42, 0.84), page), [side * 0.2, -0.43, 0]);
        leaf.rotation.x = Math.PI / 2;
      }
      if (a.book === 'gills') {
        const gillMat = glow(tint, level * 0.7, { side: THREE.DoubleSide });
        cluster(book, new THREE.BoxGeometry(1, 1, 1), gillMat, Array.from({ length: 22 }, (_unused, i) => ({ at: [(i - 10.5) * 0.036, 0.1 + Math.sin((i / 21) * Math.PI) * 0.06, 0] as P3, size: [0.006, 0.12 + Math.sin((i / 21) * Math.PI) * 0.12, 0.5] as P3, turn: [0, 0, (i - 10.5) * -0.07] as P3 })));
      } else put(book, new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.006, 0.75), paint('#b8323c')), [0.05, 0.085, 0.1]);
    }
    if (a.book === 'fallen') {
      book.rotation.set(Math.PI, random() * 3, 0.1);
      put(s.root, book, [0.5 + random() * 0.3, 0.09, 1.55]);
    } else {
      book.rotation.x = 0.45;
      put(s.root, book, [0, cupY + 1.2, cupZ + cupR + 0.08]);
    }
    s.box([0.7, 0.04, 0.46], [0, cupY + 1.13, cupZ + cupR + 0.08], paint(bandA)).rotation.x = 0.45;
    s.rod([0, cupY + 0.85, cupZ + cupR], [0, cupY + 1.1, cupZ + cupR + 0.06], 0.05, paint(bandA));

    // ---- what preaches
    const floor = cupY + 0.08;
    let cloud: THREE.InstancedMesh | null = null;
    const seeds = Array.from({ length: a.preached === 'voice' ? Math.round(mix(90, 180, mood.density)) : 0 }, () => ({ age: random(), angle: random() * 6.28, spread: random(), size: 0.02 + random() ** 2 * 0.045 }));
    let pulse: THREE.MeshStandardMaterial | null = null;
    if (a.preached === 'skeleton') {
      const bone = paint('#e9e0c8', { roughness: 0.7 });
      const figure = new THREE.Group();
      put(figure, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.75, 6), bone), [0, 1.05, 0]).rotation.x = 0.35;
      for (let i = 0; i < 5; i++) {
        const rib = put(figure, new THREE.Mesh(new THREE.TorusGeometry(0.16 - Math.abs(i - 1.5) * 0.02, 0.016, 5, 14, Math.PI * 1.7), bone), [0, 1.0 + i * 0.075, 0.07 + i * 0.027]);
        rib.rotation.set(Math.PI / 2 + 0.35, 0, Math.PI / 2 + Math.PI * 0.15);
      }
      put(figure, new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.16), bone), [0, 0.72, -0.1]);
      const skull = new THREE.Group();
      put(skull, new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), bone)).scale.set(1, 1.05, 1.15);
      put(skull, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.1), bone), [0, -0.11, 0.05]);
      for (const side of [-1, 1]) put(skull, new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), paint('#1a1612')), [side * 0.045, -0.01, 0.105]);
      put(figure, skull, [0, 1.52, 0.3]).rotation.set(0.35, (random() - 0.5) * 0.6, (random() - 0.5) * 0.3);
      for (const side of [-1, 1]) {
        const shoulder: P3 = [side * 0.2, 1.36, 0.2], elbow: P3 = [side * 0.34, 1.12, 0.36], hand: P3 = [side * (0.2 + random() * 0.2), 1.02 + (side > 0 ? random() * 0.35 : 0), 0.72];
        for (const [from, to] of [[shoulder, elbow], [elbow, hand]] as const) {
          const boneMesh = put(figure, new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1, 6), bone));
          const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to);
          boneMesh.position.copy(p).add(q).multiplyScalar(0.5);
          boneMesh.scale.y = p.distanceTo(q);
          boneMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize());
        }
        put(figure, new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), bone), hand).scale.set(1, 0.5, 1.4);
      }
      const capMat = glow(tint, level * 0.6, { side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) mushroom(figure, { at: [(random() - 0.5) * 0.25, 1.2 + random() * 0.4, 0.1 + random() * 0.15], height: 0.08 + random() * 0.1, cap: 0.04 + random() * 0.04, lean: [random() - 0.5, random() - 0.5], capMat, gillMat: bone, stalkMat: bone });
      put(s.root, figure, [0, floor - 0.72, cupZ - 0.05]);
    } else if (a.preached === 'bloom') {
      const capMat = paint(look.colours[3], { side: THREE.DoubleSide, roughness: look.rough });
      pulse = glow(tint, level, { side: THREE.DoubleSide });
      const stalkMat = paint('#f0e8d2');
      mushroom(s.root, { at: [0, floor, cupZ], height: 1.75, cap: 0.72, capHeight: 0.42, stalk: 0.13, shape: 0.9, lean: [0.06, (random() - 0.5) * 0.15], capMat, gillMat: pulse, stalkMat });
      for (let i = 0; i < 5; i++) mushroom(s.root, { at: [(random() - 0.5) * 0.8, floor, cupZ + (random() - 0.5) * 0.8], height: 0.9 + random() * 0.6, cap: 0.14 + random() * 0.14, lean: [(random() - 0.5) * 0.5, (random() - 0.5) * 0.5], capMat, gillMat: pulse, stalkMat });
    } else if (a.preached === 'voice') {
      cloud = motes(s.root, tint, seeds.map(() => ({ at: [0, 0, 0] as P3, size: 0.02 })));
      cloud.frustumCulled = false;
      pulse = glow(tint, level);
      s.ball([cupR * 0.82, 0.12, cupR * 0.82], [0, cupY + 0.5, cupZ], pulse, 16);
    } else if (a.preached === 'robe') {
      const cloth = paint('#ffffff', { map: mottle(random, mood.cheer > 0.5 ? '#6a2a3a' : '#2f2c33', ['#8f9a78', '#4a3a44', '#b9b3a2'], 90), side: THREE.DoubleSide });
      s.lathe([[0.36, 0], [0.3, 0.7], [0.24, 1.3], [0.17, 1.5], [0.001, 1.52]], cloth, [0, floor, cupZ]);
      const hood = s.mesh(new THREE.SphereGeometry(0.19, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.72), cloth, [0, floor + 1.62, cupZ + 0.02]);
      hood.rotation.x = 0.95;
      s.ball([0.13, 0.15, 0.08], [0, floor + 1.6, cupZ + 0.08], paint('#0f0d10'), 10);
      for (const side of [-1, 1]) s.rod([side * 0.24, floor + 1.35, cupZ], [side * 0.3, floor + 0.95, cupZ + 0.42], 0.09, cloth, 0.11);
    }

    // ---- canopy
    const canopyY = cupY + 2.55;
    if (a.canopy === 'shelf') bracket(s.root, { at: [0, canopyY, coreR - 0.1], radius: 1.35, thick: 0.3, tilt: -0.12, colours: look.colours, phase: random() * 6, material: shelfMaterial });
    else if (a.canopy === 'tester') {
      const oak = paint('#ffffff', { map: mottle(random, '#5c3d28', ['#3f2a1c', '#7a5a3c', '#8a9a72', '#cfc4a4'], 100) });
      const tester = s.cylinder(1.0, 1.0, 0.16, [0, canopyY, cupZ], oak, 8);
      tester.rotation.z = (random() - 0.5) * mix(0.05, 0.4, mood.wear);
      s.cylinder(0.04, 0.9, 0.5, [0, canopyY + 0.33, cupZ], oak, 8).rotation.z = tester.rotation.z;
      for (let i = 0; i < 8; i++) s.mesh(new THREE.ConeGeometry(0.06, 0.2, 4), oak, [Math.sin(i * 0.785 + 0.39) * 0.95, canopyY - 0.16, cupZ + Math.cos(i * 0.785 + 0.39) * 0.95]).rotation.x = Math.PI;
      for (let i = 0; i < 4; i++) bracket(s.root, { at: [(random() - 0.5) * 1.2, canopyY + 0.1, cupZ + 0.6 + random() * 0.3], radius: 0.2 + random() * 0.15, colours: look.colours, phase: random() * 6, material: shelfMaterial });
    }

    // ---- left on the steps
    if (a.steps === 'candles') {
      const wax = paint('#efe4c4'), flame = glow('#ffb84a', 1.6);
      stepSpots.forEach((spot) => {
        const stub = 0.06 + random() * 0.12;
        s.cylinder(0.03, 0.036, stub, [spot.at[0], spot.at[1] + stub / 2, spot.at[2]], wax, 8);
        if (random() < mix(0.3, 1, mood.cheer)) s.ball([0.018, 0.04, 0.018], [spot.at[0], spot.at[1] + stub + 0.04, spot.at[2]], flame, 6);
      });
    } else if (a.steps === 'pages') {
      const sheets = stepSpots.flatMap((spot) => (random() < 0.75 ? [{ at: [spot.at[0] + (random() - 0.5) * 0.2, spot.at[1] + 0.03, spot.at[2] + (random() - 0.5) * 0.2] as P3, size: [0.2, 0.004, 0.28] as P3, turn: [(random() - 0.5) * 0.3, random() * 3, 0] as P3 }] : []));
      for (let i = 0; i < 6; i++) sheets.push({ at: [(random() - 0.5) * 2, 0.005, 0.9 + random() * 0.9], size: [0.2, 0.004, 0.28], turn: [0, random() * 3, 0] });
      cluster(s.root, new THREE.BoxGeometry(1, 1, 1), page, sheets);
    } else if (a.steps === 'bowls') {
      const clay = s.material('#a8643c');
      stepSpots.filter((_unused, i) => i % 2 === 0).forEach((spot) => {
        s.lathe([[0.001, 0], [0.05, 0], [0.11, 0.07], [0.1, 0.07], [0.04, 0.015], [0.001, 0.015]], clay, spot.at);
        s.cylinder(0.085, 0.085, 0.01, [spot.at[0], spot.at[1] + 0.05, spot.at[2]], glow(tint, level * 0.5), 10);
      });
    }

    const matrix = new THREE.Matrix4();
    const speed = mix(0.08, 0.5, mood.energy);
    const speak = (time: number) => {
      if (pulse) pulse.emissiveIntensity = level * (1 + mix(0.05, 0.35, mood.energy) * Math.sin(time * mix(0.6, 3, mood.energy)));
      if (!cloud) return;
      seeds.forEach((seed, index) => {
        const age = (seed.age + time * speed) % 1;
        const widen = 0.1 + age ** 1.5 * (0.5 + seed.spread * 0.6);
        const size = seed.size * (1 - age * 0.55);
        matrix.makeScale(size, size, size).setPosition(Math.sin(seed.angle + age * 3) * widen, cupY + 0.6 + age * 2.4, cupZ + Math.cos(seed.angle + age * 3) * widen + age * 0.5);
        cloud!.setMatrixAt(index, matrix);
      });
      cloud.instanceMatrix.needsUpdate = true;
    };
    speak(0);
    return s.finish({ update: (_dt, time) => speak(time) });
  },
});
