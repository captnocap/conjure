import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const CABS = {
  red: 'Fire-engine red gone a little chalky.',
  green: 'Deep forest green.',
  blue: 'Pale powder blue.',
  cream: 'Cream yellow with dark fenders.',
  turquoise: 'Two-tone turquoise and white, showroom proud.',
  black: 'Plain black, a working truck.',
  primer: 'Patchy grey primer and bare rust, never finished.',
} as const;
const CAB_TINT: Record<keyof typeof CABS, [string, string]> = {
  red: ['#b22a20', '#b22a20'], green: ['#2c5a3a', '#2c5a3a'], blue: ['#8fb6cf', '#8fb6cf'], cream: ['#e9d69a', '#3a3a3a'], turquoise: ['#3fb0aa', '#efeadb'], black: ['#26282b', '#26282b'], primer: ['#8d8f8c', '#8a5236'],
};
const LOADS = {
  heaped: 'Heaped over the boards with loose wheat, spilling at the corners.',
  level: 'Filled level, a flat bed of grain.',
  empty: 'Empty: bare planks and a scoop shovel.',
  sacks: 'Stacked with tied burlap sacks.',
  bales: 'Square straw bales stacked high and roped.',
  tarped: 'A full load hidden under a roped canvas tarp.',
} as const;
type P = readonly [number, number, number];

export default defineThing({
  questions: {
    era: choice('What era is the truck?', {
      thirties: 'A 1930s truck: upright square cab, narrow hood, separate fenders and stalk headlamps.',
      fifties: 'A 1950s truck: round shoulders, bulging fenders, a grinning chrome grille.',
      seventies: 'A 1970s truck: square cab, flat hood, rectangular grille.',
    }),
    cab: choice('What colour is the cab?', CABS),
    load: choice('What is in the box?', LOADS),
    riders: choice('Who is in the cab?', {
      dog: 'Only a dog, head out of the window, waiting.',
      farmer: 'A farmer in a hat, elbow out of the window.',
      both: 'The farmer at the wheel and the dog riding on the load.',
      nobody: 'Nobody: the door hangs open.',
    }),
    unloading: choice('Is it unloading?', {
      closed: 'No: tailgate shut, ready for the road.',
      chute: 'The tailgate chute is open and grain streams out onto the ground.',
      tipped: 'The hoist is up, the box tipped, grain sliding out the back.',
    }),
    box: choice('How is the stake box finished?', {
      bare: 'Bare silvered planks.',
      red: 'Barn-red boards.',
      green: 'Wagon green boards with a white stripe.',
    }),
    door: choice('What is lettered on the cab door?', {
      none: 'Nothing.',
      farm: 'A family farm name in an arc.',
      number: 'A fleet number in a circle.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = Math.min(1, mood.wear + (a.cab === 'primer' ? 0.25 : 0));
    const rust = new THREE.Color('#7b4a2e');
    const [bodyHex, fenderHex] = CAB_TINT[a.cab];
    const paint = s.material(new THREE.Color(bodyHex).lerp(rust, wear * 0.35), { roughness: mix(0.35, 0.8, wear), metalness: 0.15 });
    const fenderPaint = s.material(new THREE.Color(fenderHex).lerp(rust, wear * 0.4), { roughness: mix(0.35, 0.8, wear), metalness: 0.15 });
    const chrome = s.material(new THREE.Color('#d9dcdc').lerp(rust, wear * 0.4), { metalness: 0.5, roughness: 0.3 });
    const rubber = s.material('#222327', { roughness: 0.95 });
    const dark = s.material('#1c1d20', { roughness: 0.9 });
    const glass = new THREE.MeshStandardMaterial({ color: '#2f414b', roughness: 0.45, metalness: 0.1 });
    const wood = s.material({ bare: '#a39a8a', red: '#8f3526', green: '#3d6144' }[a.box]);
    const grainTint = new THREE.Color('#d6a23a');
    const grain = new THREE.MeshStandardMaterial({ color: grainTint, roughness: 0.95, emissive: grainTint, emissiveIntensity: mix(0.03, 0.16, mood.cheer) });
    const night = Math.abs(mood.daylight - 0.5) > 0.32;
    const lamp = s.material('#f5edc8', { emissive: '#ffe9a6', emissiveIntensity: night ? 1.6 : 0.1, roughness: 0.2 });
    const era = a.era;

    const body = new THREE.Group();
    s.root.add(body);
    const B = <T extends THREE.Object3D>(node: T) => { body.add(node); return node; };

    // Chassis and wheels.
    const wheelR = era === 'thirties' ? 0.44 : 0.47;
    s.box([0.9, 0.2, 6.3], [0, 0.72, -0.1], dark);
    const wheel = (x: number, z: number, squash = 1) => {
      const tyre = s.cylinder(wheelR, wheelR, 0.27, [x, wheelR * squash, z], rubber, 22);
      tyre.rotation.z = Math.PI / 2;
      tyre.scale.x = squash;
      const hub = s.cylinder(wheelR * 0.52, wheelR * 0.52, 0.29, [x, wheelR * squash, z], era === 'thirties' ? fenderPaint : chrome, 14);
      hub.rotation.z = Math.PI / 2;
    };
    const flat = wear > 0.8 && a.riders === 'nobody' ? 0.8 : 1;
    const fz = 2.35, rz = -1.75;
    wheel(0.92, fz, flat); wheel(-0.92, fz);
    for (const x of [0.78, 1.08, -0.78, -1.08]) wheel(x, rz);
    s.rod([-1, wheelR, fz], [1, wheelR, fz], 0.06, dark);
    s.rod([-1.1, wheelR, rz], [1.1, wheelR, rz], 0.08, dark);
    s.rod([0, 0.6, rz], [0, 0.6, 1.2], 0.04, dark);

    // Cab, extruded from a side profile so the roofline carries the era.
    const side = new THREE.Shape();
    const cabW = era === 'thirties' ? 1.6 : 1.86;
    if (era === 'fifties') {
      side.moveTo(0.3, 0.78); side.lineTo(0.3, 1.95); side.quadraticCurveTo(0.32, 2.3, 0.75, 2.32); side.lineTo(1.25, 2.32);
      side.quadraticCurveTo(1.6, 2.3, 1.72, 2.1); side.lineTo(2, 1.62); side.quadraticCurveTo(2.7, 1.66, 3.15, 1.5);
      side.quadraticCurveTo(3.5, 1.35, 3.48, 1.0); side.lineTo(3.42, 0.78);
    } else if (era === 'thirties') {
      side.moveTo(0.3, 0.78); side.lineTo(0.3, 2.3); side.lineTo(1.72, 2.36); side.lineTo(1.72, 2.26); side.lineTo(1.55, 2.24); side.lineTo(1.6, 0.78);
    } else {
      side.moveTo(0.3, 0.78); side.lineTo(0.3, 2.2); side.quadraticCurveTo(0.32, 2.3, 0.45, 2.3); side.lineTo(1.5, 2.3);
      side.lineTo(1.95, 1.66); side.lineTo(3.3, 1.6); side.quadraticCurveTo(3.42, 1.58, 3.42, 1.45); side.lineTo(3.42, 0.78);
    }
    side.closePath();
    const bevel = era === 'fifties' ? 0.1 : 0.04;
    const cabGeo = new THREE.ExtrudeGeometry(side, { depth: cabW - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 8 });
    const cab = B(s.mesh(cabGeo, paint, [cabW / 2 - bevel, 0, 0]));
    cab.rotation.y = -Math.PI / 2;
    const half = cabW / 2;

    // Nose.
    let noseZ = 3.5;
    if (era === 'thirties') {
      B(s.box([0.95, 0.55, 1.5], [0, 1.3, 2.35], paint));
      const hoodTop = B(s.cylinder(0.475, 0.475, 1.5, [0, 1.56, 2.35], paint, 16));
      hoodTop.rotation.x = Math.PI / 2;
      B(s.box([1.02, 1.05, 0.14], [0, 1.45, 3.15], chrome));
      B(s.box([0.8, 0.85, 0.05], [0, 1.45, 3.23], dark));
      for (const x of [-1, 1]) {
        const arch = B(s.mesh(new THREE.TorusGeometry(0.58, 0.13, 8, 20, Math.PI), fenderPaint, [x * 0.92, wheelR, fz]));
        arch.rotation.y = Math.PI / 2;
        arch.scale.set(1, 1, 2.3);
        B(s.box([0.34, 0.06, 1.5], [x * 0.9, 0.62, 1.1], fenderPaint));
        B(s.rod([x * 0.5, 1.5, 3.05], [x * 0.68, 1.55, 3.1], 0.025, dark));
        B(s.ball([0.15, 0.15, 0.12], [x * 0.7, 1.55, 3.14], chrome, 12));
        B(s.cylinder(0.12, 0.12, 0.03, [x * 0.7, 1.55, 3.26], lamp, 12)).rotation.x = Math.PI / 2;
      }
      B(s.box([1.9, 0.12, 0.08], [0, 0.72, 3.4], chrome));
      noseZ = 3.45;
    } else {
      const fifties = era === 'fifties';
      for (const x of [-1, 1]) {
        if (fifties) {
          B(s.ball([0.33, 0.52, 0.98], [x * 0.8, 0.98, fz + 0.08], fenderPaint, 18));
          B(s.ball([0.16, 0.16, 0.1], [x * 0.8, 1.2, fz + 1.0], chrome, 12));
          B(s.cylinder(0.13, 0.13, 0.04, [x * 0.8, 1.2, fz + 1.09], lamp, 14)).rotation.x = Math.PI / 2;
        } else {
          B(s.box([0.24, 0.5, 1.5], [x * 0.9, 1.1, fz], fenderPaint));
          B(s.box([0.3, 0.2, 0.05], [x * 0.68, 1.3, 3.46], lamp));
        }
      }
      // Grille: chrome bars across a dark mouth.
      B(s.box([fifties ? 1.25 : 1.5, fifties ? 0.5 : 0.42, 0.06], [0, fifties ? 1.08 : 1.2, fifties ? 3.52 : 3.45], dark));
      for (let i = 0; i < (fifties ? 5 : 3); i++) B(s.box([(fifties ? 1.3 : 1.5) - i * (fifties ? 0.06 : 0), 0.05, 0.06], [0, (fifties ? 0.9 : 1.05) + i * (fifties ? 0.1 : 0.14), fifties ? 3.56 : 3.48], chrome));
      B(s.box([2.1, 0.16, 0.12], [0, 0.66, fifties ? 3.68 : 3.56], chrome));
      noseZ = fifties ? 3.7 : 3.6;
    }
    void noseZ;

    // Glazing.
    const shieldTilt = era === 'fifties' ? 0.52 : era === 'thirties' ? 0.03 : 0.6;
    const shieldAt: P = era === 'fifties' ? [0, 1.9, 1.94] : era === 'thirties' ? [0, 1.85, 1.64] : [0, 1.98, 1.8];
    for (const x of [-1, 1]) {
      const pane = B(s.box([half * 0.86, 0.5, 0.04], [x * half * 0.47, shieldAt[1], shieldAt[2]], glass));
      pane.rotation.x = -shieldTilt;
    }
    const winY = 1.82, winZ = 1.0;
    for (const x of [-1, 1]) B(s.box([0.04, 0.5, 0.9], [x * (half + 0.012), winY, winZ], x > 0 && a.riders !== 'nobody' ? dark : glass));
    B(s.box([cabW * 0.6, 0.36, 0.04], [0, 1.9, 0.29], glass));
    // Door seams, handles, running board.
    for (const x of [-1, 1]) {
      B(s.box([0.02, 1.25, 0.03], [x * (half + 0.01), 1.42, 0.45], dark));
      B(s.box([0.02, 0.75, 0.03], [x * (half + 0.01), 1.17, 1.55], dark));
      B(s.box([0.05, 0.04, 0.16], [x * (half + 0.03), 1.42, 0.62], chrome));
      B(s.box([0.3, 0.06, 1.3], [x * (half + 0.08), 0.66, 1.0], dark));
    }
    if (a.door !== 'none') {
      const text = a.door === 'farm' ? 'HANSEN & SONS' : `${3 + Math.floor(random() * 40)}`;
      for (const x of [-1, 1]) {
        const sign = B(s.label(text, a.door === 'farm' ? 0.85 : 0.36, a.door === 'farm' ? 0.2 : 0.3, [x * (half + 0.02), 1.25, 1.0], a.door === 'farm' ? '#f1ead8' : '#1c1d20', a.door === 'farm' ? `#${paint.color.getHexString()}` : '#f1ead8'));
        sign.rotation.y = x * Math.PI / 2;
      }
    }

    // Riders.
    const dogFur = s.material(random() > 0.5 ? '#c98f4e' : random() > 0.5 ? '#3a3632' : '#e9e2d0');
    const dogHead = new THREE.Group();
    const dog = (at: P, turn: number, whole: boolean) => {
      const g = new THREE.Group();
      g.position.set(...at);
      g.rotation.y = turn;
      const part = (geometry: THREE.BufferGeometry, material: THREE.Material, p: P, scale: P = [1, 1, 1]) => {
        const m = new THREE.Mesh(geometry, material);
        m.position.set(...p); m.scale.set(...scale); m.castShadow = true;
        return m;
      };
      const ball = new THREE.SphereGeometry(1, 12, 8);
      dogHead.add(part(ball, dogFur, [0, 0, 0], [0.15, 0.15, 0.16]), part(ball, dogFur, [0, -0.04, 0.17], [0.08, 0.07, 0.12]), part(ball, dark, [0, -0.02, 0.29], [0.035, 0.03, 0.03]));
      for (const x of [-1, 1]) dogHead.add(part(new THREE.ConeGeometry(0.06, 0.16, 4), dogFur, [x * 0.11, 0.12, -0.03]));
      dogHead.add(part(ball, s.material('#d9627a'), [0, -0.12, 0.2], [0.035, 0.07, 0.02]));
      dogHead.position.set(0, whole ? 0.62 : 0, whole ? 0.22 : 0);
      if (!whole) dogHead.scale.setScalar(1.35);
      g.add(dogHead);
      if (whole) {
        g.add(part(ball, dogFur, [0, 0.3, 0], [0.17, 0.3, 0.2]), part(ball, dogFur, [0, 0.12, -0.1], [0.2, 0.14, 0.24]));
        for (const x of [-1, 1]) g.add(part(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), dogFur, [x * 0.09, 0.15, 0.17]));
      }
      return g;
    };
    const person = (x: number) => {
      const skin = s.material('#c99a76');
      B(s.ball([0.13, 0.15, 0.14], [x * (half + 0.1), 1.86, 1.02], skin, 12));
      B(s.cylinder(0.24, 0.24, 0.03, [x * (half + 0.1), 1.98, 1.02], s.material('#b9a36a'), 14));
      B(s.cylinder(0.13, 0.15, 0.13, [x * (half + 0.1), 2.05, 1.02], s.material('#b9a36a'), 14));
      B(s.rod([x * (half - 0.15), 1.6, 0.8], [x * (half + 0.14), 1.6, 1.1], 0.06, s.material('#4d6480')));
      B(s.rod([x * (half + 0.14), 1.6, 1.1], [x * (half + 0.06), 1.6, 1.38], 0.05, skin));
    };
    if (a.riders === 'dog') B(dog([half + 0.16, 1.9, 1.0], Math.PI / 2 - 0.5, false));
    if (a.riders === 'farmer' || a.riders === 'both') person(1);
    if (a.riders === 'nobody') {
      const leaf = B(s.box([0.05, 1.5, 1.15], [half + 0.5, 1.45, 1.55 - 0.3], paint));
      leaf.rotation.y = 1.0;
      B(s.box([0.04, 1.35, 1.0], [half + 0.012, 1.45, 1.0], dark));
    }

    // Stake box on a hinge at the back of the frame.
    const deckY = 1.08, bw = 2.36, bl = 3.6, bh = 1.12;
    const box = new THREE.Group();
    box.position.set(0, deckY, -3.4);
    s.root.add(box);
    const X = <T extends THREE.Object3D>(node: T) => { box.add(node); return node; };
    X(s.box([bw, 0.12, bl], [0, 0, bl / 2], wood));
    for (const z of [0.3, 1.2, 2.1, 3.0]) X(s.box([bw - 0.2, 0.12, 0.1], [0, -0.12, z], dark));
    const boards = 4;
    for (let i = 0; i < boards; i++) {
      const y = 0.17 + i * (bh / boards);
      for (const x of [-1, 1]) {
        const board = X(s.box([0.05, bh / boards - 0.06, bl], [x * (bw / 2 - 0.03), y + 0.08, bl / 2], wood));
        if (random() < wear * 0.4) board.rotation.x = (random() - 0.5) * 0.04;
      }
      X(s.box([bw, bh / boards - 0.06, 0.05], [0, y + 0.08, bl - 0.03], wood));
      if (!(i === 0 && a.unloading !== 'closed')) X(s.box([bw, bh / boards - 0.06, 0.05], [0, y + 0.08, 0.03], wood));
      else for (const x of [-1, 1]) X(s.box([bw / 2 - 0.3, bh / boards - 0.06, 0.05], [x * (bw / 4 + 0.15), y + 0.08, 0.03], wood));
    }
    if (a.box === 'green') for (const x of [-1, 1]) X(s.box([0.06, 0.07, bl], [x * (bw / 2 - 0.02), 0.17 + bh * 0.5, bl / 2], s.material('#ece6d4')));
    X(s.box([bw, 0.45, 0.06], [0, bh + 0.35, bl - 0.03], wood));
    for (const x of [-1, 1]) for (const z of [0.06, bl * 0.33, bl * 0.66, bl - 0.06]) X(s.box([0.08, bh + 0.25, 0.09], [x * (bw / 2 + 0.03), bh / 2 + 0.08, z], dark));

    const inside: P = [0, 0, bl / 2];
    if (a.load === 'heaped' || a.load === 'level' || a.load === 'tarped') {
      X(s.box([bw - 0.14, bh * 0.82, bl - 0.12], [0, bh * 0.41 + 0.06, bl / 2], a.load === 'tarped' ? s.material('#77765f') : grain));
      if (a.load !== 'level') {
        const mound = X(s.ball([bw / 2 - 0.05, a.load === 'tarped' ? 0.5 : 0.62, bl / 2 - 0.05], [0, bh * 0.8, bl / 2], a.load === 'tarped' ? s.material('#77765f') : grain, 20));
        mound.scale.y *= mix(0.85, 1.15, random());
        if (a.load === 'tarped') for (const z of [0.7, 1.8, 2.9]) X(s.ring(bw / 2 + 0.02, 0.018, [0, bh * 0.8, z], s.material('#d8cfae'), Math.PI)).scale.y = 0.55;
      }
    } else if (a.load === 'empty') {
      X(s.rod([0.5, 0.1, 0.6], [0.9, 1.2, 1.0], 0.025, s.material('#9a8562')));
      X(s.box([0.3, 0.02, 0.36], [0.47, 0.1, 0.52], chrome));
    } else if (a.load === 'sacks') {
      const sack = s.material('#b79a66');
      for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) {
        if (layer === 2 && random() > 0.55) continue;
        X(s.ball([0.36, 0.2, 0.3], [(i - 1) * 0.72 + (random() - 0.5) * 0.1, 0.26 + layer * 0.36, 0.42 + j * 0.69], sack, 10)).rotation.y = (random() - 0.5) * 0.4;
      }
    } else {
      const straw = s.material('#d8bd6a');
      for (let layer = 0; layer < 4; layer++) for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
        if (layer === 3 && random() > 0.6) continue;
        X(s.box([1.08, 0.44, 1.12], [(i - 0.5) * 1.12 + (random() - 0.5) * 0.06, 0.3 + layer * 0.46, 0.62 + j * 1.17], straw)).rotation.y = (random() - 0.5) * 0.06;
      }
      for (const z of [1.2, 2.4]) X(s.ring(bw / 2 + 0.05, 0.015, [0, 1.0, z], s.material('#d8cfae'), Math.PI)).scale.y = 0.95;
    }
    void inside;
    if (a.riders === 'both') {
      const top = a.load === 'empty' ? 0.08 : a.load === 'bales' ? 1.95 : a.load === 'sacks' ? 1.2 : a.load === 'level' ? bh * 0.84 : bh * 0.8 + 0.5;
      X(dog([0.2, top, bl * 0.55], 0.9, true));
    }

    // Unloading.
    const drops: THREE.InstancedMesh[] = [];
    const tipped = a.unloading === 'tipped';
    const hasGrain = a.load === 'heaped' || a.load === 'level' || a.load === 'tarped';
    let from: P = [0, deckY + 0.2, -3.45];
    if (tipped) {
      box.rotation.x = -mix(0.5, 0.68, random());
      s.rod([0, 0.75, -1.2], [0, deckY + Math.sin(-box.rotation.x) * 2.0 - 0.1, -3.4 + Math.cos(box.rotation.x) * 2.0], 0.07, chrome);
      s.rod([0, 0.75, -1.2], [0, 0.75 + (Math.sin(-box.rotation.x) * 2.0) * 0.5, -1.2 - 0.25], 0.1, dark);
      from = [0, deckY, -3.5];
    }
    if (a.unloading !== 'closed') {
      const size = hasGrain ? (tipped ? 1.9 : 1.2) : 0.45;
      const heap = s.lathe([[size, 0], [size * 0.8, size * 0.07], [size * 0.4, size * 0.32], [size * 0.12, size * 0.46], [0, size * 0.5]], grain, [0, 0, -3.4 - size * 0.55]);
      heap.scale.x = 1.2;
      if (hasGrain) {
        s.tube([from, [0, from[1] - 0.1, from[2] - 0.25], [0, size * 0.45, -3.4 - size * 0.5]], tipped ? 0.3 : 0.11, grain);
        const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), grain, 36);
        mesh.castShadow = true;
        s.root.add(mesh);
        drops.push(mesh);
      }
    }
    const offsets = Array.from({ length: 36 }, () => [random(), (random() - 0.5) * (tipped ? 1.4 : 0.4), random() * 0.5, 0.6 + random()]);
    const matrix = new THREE.Matrix4();
    const speed = mix(0.4, 2, mood.energy);
    const pour = (time: number) => {
      for (const mesh of drops) {
        offsets.forEach(([phase, dx, dz, rate], index) => {
          const t = (phase + time * speed * rate * 0.6) % 1;
          matrix.makeTranslation(dx, from[1] - t * t * (from[1] - 0.3), from[2] - 0.15 - t * (0.5 + dz));
          mesh.setMatrixAt(index, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
    };
    pour(0);

    // Exhaust, mirrors, tail lamp.
    B(s.rod([-(half + 0.06), 1.0, 0.28], [-(half + 0.06), 2.6, 0.28], 0.045, dark));
    for (const x of [-1, 1]) {
      B(s.rod([x * (half + 0.02), 1.7, 1.6], [x * (half + 0.32), 1.85, 1.62], 0.015, dark));
      B(s.box([0.03, 0.26, 0.16], [x * (half + 0.33), 1.92, 1.62], chrome));
    }
    s.box([0.12, 0.12, 0.05], [0.7, 0.85, -3.3], s.material('#b3261d', { emissive: '#ff3a24', emissiveIntensity: night ? 1.2 : 0.05 }));

    const idle = a.riders !== 'nobody' ? mix(0.002, 0.012, mood.energy) : 0;
    return s.finish({
      update: (_dt, time) => {
        body.position.y = Math.sin(time * 38) * idle;
        dogHead.rotation.z = Math.sin(time * mix(1, 5, mood.energy)) * 0.18;
        dogHead.rotation.x = Math.sin(time * mix(0.6, 3, mood.energy) + 1) * 0.1;
        if (drops.length) pour(time);
      },
    });
  },
});
