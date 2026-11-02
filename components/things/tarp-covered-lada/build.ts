import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
type XY = [number, number];

const SEDAN: XY[] = [[-2.0, 0.32], [-2.04, 0.84], [-1.96, 0.9], [-1.2, 0.93], [-0.84, 1.38], [0.36, 1.4], [0.86, 0.95], [1.94, 0.88], [2.04, 0.8], [2.0, 0.34]];
const ESTATE: XY[] = [[-2.0, 0.32], [-2.04, 0.9], [-1.9, 1.36], [-0.84, 1.39], [0.36, 1.4], [0.86, 0.95], [1.94, 0.88], [2.04, 0.8], [2.0, 0.34]];

export default defineThing({
  questions: {
    state: choice('How is the car being kept right now?', {
      covered: 'Fully under a tarp roped down tight, a car-shaped ghost.',
      half: 'The tarp pulled back off the front half, about to be driven or just looked at.',
      parked: 'Uncovered and parked, washed, ready.',
      bonnet: 'Bonnet up, mid-repair, somebody was just leaning into the engine.',
      blocks: 'Up on bricks with wheels off, a project that has lasted years.',
    }),
    colour: choice('What colour is the car?', {
      beige: 'Safari beige, the colour of most of them.',
      white: 'Plain white.',
      red: 'Ruby red, the one everybody wanted.',
      blue: 'Dusty Adriatic blue.',
      green: 'Cypress green.',
      orange: 'Carrot orange.',
      mustard: 'Mustard yellow.',
    }),
    body: choice('Which body is it?', {
      sedan: 'The three-box sedan with a boot.',
      estate: 'The estate with a long roof, for the dacha run.',
    }),
    tarp: choice('If there is a tarp, what is it?', {
      canvas: 'Army khaki canvas, heavy and stiff.',
      grey: 'A grey tarpaulin stitched from old tent halves.',
      blue: 'A blue-striped oilcloth more at home on a kitchen table.',
      patched: 'Brown canvas with lighter square patches sewn on.',
    }),
    ground: choice('What lies on the ground beside it?', {
      nothing: 'Nothing.',
      toolbox: 'An open steel toolbox and spanners laid out on a rag.',
      wheel: 'A spare wheel lying flat and a jack.',
      canister: 'A jerrycan, a funnel and a dark oil stain.',
      legs: 'A pair of legs in work trousers sticking out from under the sill.',
    }),
    rack: noul('Does it carry a roof rack with something strapped to it?'),
    snow: score('How much snow has settled on it?', ['None', 'A light dusting', 'A soft cap on the roof', 'A deep unbroken load: it has not moved all winter']),
    tarpTies: choice('If the car is covered, what secures the cover?', {
      ropes: 'Pale ropes cross the roof and tie to ordinary bricks.',
      straps: 'Wide webbing straps run over the roof to heavy blocks.',
      elastic: 'Dark elastic cords end in low metal ground hooks.',
      sacks: 'Ropes are weighted with small sand-filled sacks.',
    }),
    wheelFinish: choice('On any fitted wheels, what is visible at the centre?', {
      steel: 'Plain painted steel wheel centres.',
      caps: 'Polished domed hubcaps.',
      bolts: 'Exposed dark centres with four silver wheel bolts.',
      rings: 'Thin bright trim rings surround the steel centres.',
    }),
    bumperGuards: choice('What extra protection is fitted to the bumpers?', {
      plain: 'Only the original narrow chrome bumpers.',
      rubber: 'Broad black rubber overriders at both ends.',
      tubular: 'A low tubular guard surrounds the front grille.',
      corners: 'Rubber corner buffers curl around both bumper ends.',
    }),
    roofLoad: choice('If the roof rack is uncovered, what is tied to it?', {
      suitcase: 'One hard-sided brown suitcase.',
      timber: 'Five long timber planks in two layers.',
      skis: 'A pair of wooden skis and a canvas holdall.',
      baskets: 'Two closed wicker baskets for the dacha trip.',
    }),
    rackFrame: choice('If fitted, how is the roof rack built?', {
      bars: 'A low open lattice of plain steel bars.',
      basket: 'A shallow basket with an upright perimeter rail.',
      timber: 'Timber load slats are screwed over the crossbars.',
      rollers: 'Rubber sleeves cover the load-bearing crossbars.',
    }),
    parkingStops: choice('What marks or secures the parking place?', {
      none: 'The car stands on an unmarked patch.',
      chocks: 'Two timber wedges are tucked behind the rear wheels.',
      blocks: 'A long concrete wheel stop marks the front of the bay.',
      post: 'A folding parking post stands lowered beside the car.',
    }),
    repairLight: choice('What light has been brought out for the car?', {
      none: 'No additional light.',
      stand: 'A rectangular work lamp is mounted on a short tripod.',
      lantern: 'A squat portable lantern sits on the ground.',
      lead: 'A caged inspection lamp rests on a low tool tray with its coiled lead.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const profile = a.body === 'sedan' ? SEDAN : ESTATE;
    const tops = profile.slice(1, -1);
    const topY = (x: number) => {
      if (x <= tops[0][0]) return tops[0][1];
      for (let i = 0; i < tops.length - 1; i++) if (x <= tops[i + 1][0]) return mix(tops[i][1], tops[i + 1][1], (x - tops[i][0]) / (tops[i + 1][0] - tops[i][0]));
      return tops[tops.length - 1][1];
    };
    const onBlocks = a.state === 'blocks';
    const hasTarp = a.state === 'covered' || a.state === 'half';
    const lift = onBlocks ? 0.06 : 0;
    const car = new Sculpture(context);
    car.root.position.y = lift;
    s.root.add(car.root);

    const paintColour = new THREE.Color({ beige: '#d3c29c', white: '#e9e7de', red: '#a4252a', blue: '#5f86a8', green: '#3e6b4e', orange: '#d96a2a', mustard: '#cfa32e' }[a.colour]);
    paintColour.lerp(new THREE.Color('#8f887c'), mood.wear * 0.3 + (1 - mood.cheer) * 0.1);
    const paint = car.material(paintColour, { metalness: 0.3, roughness: mix(0.3, 0.75, mood.wear) });
    const chrome = car.material('#d5d9db', { metalness: 0.9, roughness: 0.25 });
    const black = car.material('#1c1d1f', { roughness: 0.8 });
    const glass = new THREE.MeshStandardMaterial({ color: '#27343b', roughness: 0.12, metalness: 0.5 });
    const rust = car.material('#6e3d24', { roughness: 1 });
    const snowMat = new THREE.MeshStandardMaterial({ color: '#f0f3f6', roughness: 0.95 });

    // Body: the side profile extruded across the width.
    const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
    const bodyGeometry = new THREE.ExtrudeGeometry(shape, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2 });
    bodyGeometry.translate(0, 0, -0.75);
    car.mesh(bodyGeometry, paint);
    const HW = 0.79;
    for (const side of [-1, 1]) {
      const z = side * (HW + 0.004);
      // Greenhouse glass with pillars, door seams, handles, trim strip and wheel arches.
      const rear = a.body === 'sedan' ? -0.84 : -1.8;
      const glassShape = new THREE.Shape([new THREE.Vector2(rear + 0.02, 0.98), new THREE.Vector2(rear + 0.14, 1.31), new THREE.Vector2(0.3, 1.33), new THREE.Vector2(0.74, 0.98)]);
      const pane = car.mesh(new THREE.ShapeGeometry(glassShape), glass, [0, 0, z]);
      if (side < 0) pane.rotation.y = Math.PI, pane.scale.x = -1;
      for (const x of a.body === 'sedan' ? [-0.2] : [-0.2, -1.0]) car.box([0.07, 0.36, 0.012], [x, 1.15, z], paint);
      for (const x of [-0.95, -0.17, 0.78]) car.box([0.012, 0.62, 0.008], [x, 0.66, z], black);
      for (const x of [-0.32, 0.6]) car.box([0.12, 0.025, 0.02], [x, 0.9, z], chrome);
      car.box([3.9, 0.025, 0.012], [0, 0.72, z], chrome);
      for (const x of [-1.22, 1.24]) { const arch = car.cylinder(0.37, 0.37, 0.01, [x, 0.33, z], black, 20); arch.rotation.x = Math.PI / 2; }
      if (mood.wear > 0.3) for (let i = 0; i < Math.floor(mood.wear * 7); i++) car.box([0.12 + random() * 0.3, 0.05 + random() * 0.09, 0.01], [-1.8 + random() * 3.6, 0.36 + random() * 0.1, z + side * 0.003], rust);
    }
    // Screens front and rear.
    const screen = (x0: number, y0: number, x1: number, y1: number) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      const m = car.box([len * 0.86, 0.01, 1.36], [(x0 + x1) / 2, (y0 + y1) / 2, 0], glass);
      m.rotation.z = Math.atan2(y1 - y0, x1 - x0);
      const n = new THREE.Vector3(-(y1 - y0), x1 - x0, 0).normalize().multiplyScalar(0.012 * Math.sign(x1 - x0 || 1));
      m.position.add(n.y < 0 ? n.negate() : n);
    };
    screen(0.36, 1.4, 0.86, 0.95);
    if (a.body === 'sedan') screen(-1.2, 0.93, -0.84, 1.38); else screen(-2.04, 0.9, -1.9, 1.36);
    // Face: grille, round headlamps, bumpers, tail lamps, plates.
    car.box([0.02, 0.22, 1.1], [2.03, 0.66, 0], black);
    for (let i = 0; i < 5; i++) car.box([0.012, 0.012, 1.08], [2.045, 0.58 + i * 0.04, 0], chrome);
    const lampGlow = mood.daylight > 0.8 && a.state === 'parked' ? 0.9 : 0.08;
    for (const z of [-0.6, 0.6]) {
      const lamp = car.cylinder(0.085, 0.085, 0.04, [2.04, 0.66, z], new THREE.MeshStandardMaterial({ color: '#f3f0dc', emissive: '#ffe9a8', emissiveIntensity: lampGlow, roughness: 0.2 }), 14); lamp.rotation.z = Math.PI / 2;
      const rim = car.ring(0.09, 0.012, [2.05, 0.66, z], chrome); rim.rotation.y = Math.PI / 2;
      car.box([0.02, 0.2, 0.09], [-2.045, 0.7, z * 1.08], new THREE.MeshStandardMaterial({ color: '#a51f1f', emissive: '#a51f1f', emissiveIntensity: 0.15, roughness: 0.3 }));
    }
    for (const x of [-2.09, 2.09]) { car.box([0.07, 0.07, 1.66], [x, 0.44, 0], chrome); for (const z of [-0.5, 0.5]) car.box([0.06, 0.13, 0.05], [x + Math.sign(x) * 0.02, 0.45, z], black); }
    const plate = `${'АВЕКМНОРСТ'[Math.floor(random() * 10)]} ${10 + Math.floor(random() * 89)}-${10 + Math.floor(random() * 89)} ${['МО', 'ЛЕ', 'КИ', 'СВ', 'НО'][Math.floor(random() * 5)]}`;
    for (const side of [-1, 1]) { const p = car.label(plate, 0.46, 0.11, [side * 2.13, 0.34, 0], '#f4f4f0', '#17181a'); p.rotation.y = side * Math.PI / 2; }

    // Wheels, or brick stacks where wheels used to be.
    const tyre = car.material('#1b1b1d', { roughness: 0.95 });
    const hub = car.material(mood.wear > 0.7 ? '#7c6a58' : '#c9cdd0', { metalness: 0.7, roughness: 0.4 });
    const brick = s.material('#a44d32', { roughness: 1 });
    const missing = onBlocks ? [true, true, random() < 0.6, random() < 0.6] : [false, false, false, false];
    [[-1.22, -1], [-1.22, 1], [1.24, -1], [1.24, 1]].forEach(([x, side], index) => {
      const z = side * 0.72;
      if (missing[index] || (onBlocks && index > 1 && missing[2] && missing[3])) {
        const drum = car.cylinder(0.13, 0.13, 0.08, [x, 0.3, side * 0.7], rust, 12); drum.rotation.x = Math.PI / 2;
        for (let i = 0; i < 4; i++) s.box([0.25, 0.09, 0.12], [x + (random() - 0.5) * 0.015, 0.045 + i * 0.09, side * 0.6], brick).rotation.y = i % 2 ? Math.PI / 2 : 0;
      } else {
        const wheel = car.cylinder(0.3, 0.3, 0.19, [x, 0.3, z], tyre, 20); wheel.rotation.x = Math.PI / 2;
        const cap = car.cylinder(0.17, 0.17, 0.2, [x, 0.3, z], hub, 14); cap.rotation.x = Math.PI / 2;
        if (onBlocks) wheel.position.y = cap.position.y = 0.3 - lift;
        const wy = onBlocks ? 0.3 - lift : 0.3, faceZ = side * 0.83;
        if (a.wheelFinish === 'caps') car.ball([0.18, 0.18, 0.035], [x, wy, faceZ], chrome, 14);
        else if (a.wheelFinish === 'rings') car.ring(0.235, 0.016, [x, wy, faceZ], chrome);
        else if (a.wheelFinish === 'bolts') {
          const inset = car.cylinder(0.145, 0.145, 0.01, [x, wy, faceZ], black, 14); inset.rotation.x = Math.PI / 2;
          for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2; const bolt = car.cylinder(0.015, 0.015, 0.025, [x + Math.cos(t) * 0.1, wy + Math.sin(t) * 0.1, faceZ + side * 0.015], chrome, 6); bolt.rotation.x = Math.PI / 2; }
        }
      }
    });
    if (a.bumperGuards === 'rubber') for (const x of [-2.13, 2.13]) for (const z of [-0.5, 0.5]) car.box([0.12, 0.26, 0.09], [x, 0.47, z], black);
    else if (a.bumperGuards === 'tubular') {
      for (const z of [-0.64, 0.64]) car.rod([2.13, 0.44, z], [2.23, 0.85, z], 0.022, chrome);
      car.rod([2.23, 0.85, -0.64], [2.23, 0.85, 0.64], 0.022, chrome);
    } else if (a.bumperGuards === 'corners') for (const end of [-1, 1]) for (const side of [-1, 1]) car.tube([[end * 1.98, 0.44, side * 0.84], [end * 2.13, 0.44, side * 0.84], [end * 2.13, 0.44, side * 0.64]], 0.047, black);

    // Bonnet up: hinged at the nose, an engine bay with the round air filter everybody remembers.
    if (a.state === 'bonnet') {
      car.box([1.0, 0.012, 1.38], [1.4, 0.925, 0], black);
      car.box([0.5, 0.2, 0.36], [1.42, 0.9, -0.05], car.material('#5d6062', { metalness: 0.5 }));
      car.cylinder(0.17, 0.17, 0.09, [1.35, 1.03, 0.0], car.material('#2c4a78', { metalness: 0.4 }), 16);
      car.box([0.22, 0.18, 0.16], [1.72, 0.94, 0.48], black);
      car.cylinder(0.05, 0.05, 0.12, [1.1, 0.96, -0.5], car.material('#e7e3d4'), 10);
      const lid = new THREE.Group(); lid.position.set(1.94, 0.9, 0); lid.rotation.z = -mix(0.85, 1.05, random()); car.root.add(lid);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.03, 1.5), paint); panel.position.x = -0.54; panel.castShadow = true; lid.add(panel);
      car.rod([1.0, 0.93, 0.62], [1.38, 1.5, 0.62], 0.008, chrome);
    }

    // Roof rack.
    const roofX = a.body === 'sedan' ? -0.24 : -0.7, roofLen = a.body === 'sedan' ? 1.0 : 2.0;
    if (a.rack) {
      const beforeRack = new Set(car.root.children);
      const bar = car.material('#3a3d40', { metalness: 0.6 });
      for (const z of [-0.66, 0.66]) car.rod([roofX - roofLen / 2, 1.5, z], [roofX + roofLen / 2, 1.5, z], 0.012, bar);
      for (let i = 0; i < 4; i++) { const x = roofX - roofLen / 2 + i * roofLen / 3; car.rod([x, 1.5, -0.66], [x, 1.5, 0.66], 0.012, bar); for (const z of [-0.66, 0.66]) car.rod([x, 1.39, z * 1.04], [x, 1.5, z], 0.01, bar); }
      if (a.rackFrame === 'basket') {
        for (const x of [roofX - roofLen / 2, roofX + roofLen / 2]) for (const z of [-0.66, 0.66]) car.rod([x, 1.5, z], [x, 1.68, z], 0.012, bar);
        for (const z of [-0.66, 0.66]) car.rod([roofX - roofLen / 2, 1.68, z], [roofX + roofLen / 2, 1.68, z], 0.012, bar);
        for (const x of [roofX - roofLen / 2, roofX + roofLen / 2]) car.rod([x, 1.68, -0.66], [x, 1.68, 0.66], 0.012, bar);
      } else if (a.rackFrame === 'timber') for (let i = 0; i < 7; i++) car.box([roofLen, 0.025, 0.13], [roofX, 1.5245, -0.54 + i * 0.18], car.material('#9f8256'));
      else if (a.rackFrame === 'rollers') for (let i = 0; i < 4; i++) car.rod([roofX - roofLen / 2 + i * roofLen / 3, 1.5, -0.6], [roofX - roofLen / 2 + i * roofLen / 3, 1.5, 0.6], 0.034, black);
      if (!hasTarp) {
        const cargoRoot = new THREE.Group(), beforeCargo = new Set(car.root.children);
        const rackY = a.rackFrame === 'timber' ? 1.537 : a.rackFrame === 'rollers' ? 1.534 : 1.512;
        if (a.roofLoad === 'suitcase') { car.box([0.75, 0.24, 0.5], [roofX, rackY + 0.12, 0.1], car.material('#6f4a2e')); car.box([0.76, 0.03, 0.04], [roofX, rackY + 0.14, 0.36], chrome); }
        else if (a.roofLoad === 'timber') for (let i = 0; i < 5; i++) car.box([2.4, 0.03, 0.14], [roofX + 0.2, rackY + 0.015 + (i > 2 ? 0.03 : 0), -0.3 + (i % 3) * 0.16 + (i > 2 ? 0.08 : 0)], car.material('#c7a56a'));
        else if (a.roofLoad === 'skis') { for (const z of [-0.1, 0.05]) car.box([1.9, 0.02, 0.07], [roofX + 0.2, rackY + 0.01, z], car.material(z < 0 ? '#c9302b' : '#2f62ad')); car.box([0.9, 0.2, 0.3], [roofX, rackY + 0.1, 0.4], car.material('#4f6b4a', { roughness: 1 })); }
        else for (const z of [-0.28, 0.28]) {
          const wicker = car.material('#aa8c57'); car.box([0.65, 0.29, 0.45], [roofX, rackY + 0.145, z], wicker);
          car.box([0.67, 0.035, 0.47], [roofX, rackY + 0.3075, z], wicker);
          for (let i = 0; i < 5; i++) for (const side of [-1, 1]) car.box([0.65, 0.008, 0.008], [roofX, rackY + 0.04 + i * 0.05, z + side * 0.228], car.material('#78613d'));
        }
        for (const child of [...car.root.children]) if (!beforeCargo.has(child)) cargoRoot.add(child);
        car.root.add(cargoRoot);
        const box = new THREE.Box3().setFromObject(cargoRoot, true); const high = box.max.y - lift;
        for (const x of [roofX - 0.25, roofX + 0.25]) car.tube([[x, rackY, -0.62], [x, high + 0.008, -0.56], [x, high + 0.008, 0.56], [x, rackY, 0.62]], 0.01, car.material('#6b5d40'));
      }
      const rackRoot = new THREE.Group(); rackRoot.name = 'roof-rack';
      for (const child of [...car.root.children]) if (!beforeRack.has(child)) rackRoot.add(child);
      car.root.add(rackRoot);
    }

    // A draped shell over the car: used for the tarp and for the snow that settles on top.
    const loft = (x0: number, x1: number, t0: number, t1: number, top: (x: number) => number, halfW: number, hem: number, wrinkle: number, taper0: boolean, taper1: boolean, e = 0.2) => {
      const nx = 44, nt = 26;
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      const phase = random() * 6;
      for (let i = 0; i <= nx; i++) {
        const u = i / nx, x = mix(x0, x1, u);
        const end = Math.min(taper0 ? (x - x0) / 0.22 : 9, taper1 ? (x1 - x) / 0.22 : 9, 1);
        const close = Math.sqrt(Math.max(0, 1 - (1 - end) * (1 - end)));
        const h = hem + (top(x) - hem) * close, hw = halfW * (0.82 + 0.18 * close);
        for (let j = 0; j <= nt; j++) {
          const theta = mix(t0, t1, j / nt) * Math.PI, c = Math.cos(theta), sn = Math.sin(theta);
          const fold = wrinkle * (Math.sin(x * 9 + theta * 5 + phase) * 0.5 + Math.sin(x * 23 + phase * 2) * 0.3) * (1 - sn * 0.6);
          const z = Math.sign(c) * Math.pow(Math.abs(c), e) * (hw + fold);
          const y = hem + (h - hem) * Math.pow(sn, e) + wrinkle * 0.6 * Math.sin(x * 11 + z * 6 + phase) * sn + (sn < 0.05 ? wrinkle * 1.5 * Math.sin(x * 14 + phase) : 0);
          positions.push(x, y, z); uvs.push(u * 3, j / nt * 2);
          if (i < nx && j < nt) { const p = i * (nt + 1) + j; index.push(p, p + nt + 1, p + 1, p + 1, p + nt + 1, p + nt + 2); }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(index); g.computeVertexNormals();
      return g;
    };

    const tarpTop = (x: number) => {
      const bodyTop = Math.max(topY(x), topY(x - 0.12), topY(x + 0.12)) + 0.065 + lift;
      if (!a.rack) return bodyTop;
      // Carry the cloth above the actual rack perimeter, including a tall basket rail.
      // The broad plateau covers the full rack; its shoulders fall outside the end bars.
      const rackTop = (a.rackFrame === 'basket' ? 1.692 : a.rackFrame === 'timber' ? 1.537 : a.rackFrame === 'rollers' ? 1.534 : 1.512) + lift;
      const shoulder = Math.max(0, Math.min(1, (roofLen / 2 + 0.24 - Math.abs(x - roofX)) / 0.24));
      return Math.max(bodyTop, bodyTop + (rackTop + 0.06 - bodyTop) * shoulder);
    };
    const coverTo = a.state === 'half' ? mix(-0.5, 0.1, random()) : 2.2;
    if (hasTarp) {
      const tint = { canvas: '#77744e', grey: '#8b8f8d', blue: '#6f93b8', patched: '#7a5f43' }[a.tarp];
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      g.fillStyle = tint; g.fillRect(0, 0, 256, 256);
      if (a.tarp === 'blue') { g.fillStyle = '#e9e6da'; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 12, 256); }
      if (a.tarp === 'patched') for (let i = 0; i < 7; i++) { g.fillStyle = ['#a88a62', '#5d4631', '#8f8a6a'][i % 3]; g.fillRect(random() * 220, random() * 220, 26 + random() * 30, 22 + random() * 26); }
      if (a.tarp === 'grey') { g.strokeStyle = '#5f6462'; g.lineWidth = 3; for (const v of [84, 170]) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, 256); g.moveTo(0, v); g.lineTo(256, v); g.stroke(); } }
      for (let i = 0; i < 30 + mood.wear * 90; i++) { g.fillStyle = `rgba(${random() < 0.5 ? '40,35,25' : '200,195,175'},${0.05 + random() * 0.12})`; g.beginPath(); g.ellipse(random() * 256, random() * 256, 6 + random() * 26, 4 + random() * 12, random() * 3, 0, 7); g.fill(); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      const cloth = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, side: THREE.DoubleSide });
      const hem = mix(0.16, 0.34, random()) + lift;
      s.mesh(loft(-2.2, coverTo, 0, 1, tarpTop, 0.9, hem, 0.022, true, a.state !== 'half'), cloth).name = 'tarp-shell';
      if (a.state === 'half') {
        // The pulled-back half lies in a thick roll across the roof.
        const pts: P3[] = [];
        for (let j = 0; j <= 12; j++) { const theta = j / 12 * Math.PI, c = Math.cos(theta); pts.push([coverTo + 0.03, hem + (tarpTop(coverTo) + 0.05 - hem) * Math.pow(Math.sin(theta), 0.2), Math.sign(c) * Math.pow(Math.abs(c), 0.2) * 0.93]); }
        s.tube(pts, 0.085, cloth);
      }
      // Ropes over the top, tied off to bricks.
      const rope = s.material(a.tarpTies === 'elastic' ? '#353a39' : a.tarpTies === 'straps' ? '#5f6852' : '#cdbf9a', { roughness: 1 });
      const ropeXs = a.state === 'half' ? [-1.5, -0.75] : [-1.45, -0.3, 1.25];
      for (const x of ropeXs) {
        const pts: P3[] = [[x, 0.07, -1.12]];
        for (let j = 1; j < 12; j++) { const theta = j / 12 * Math.PI, c = Math.cos(theta); pts.push([x, hem + (tarpTop(x) + 0.012 - hem) * Math.pow(Math.sin(theta), 0.2) + 0.012, Math.sign(c) * Math.pow(Math.abs(c), 0.2) * 0.925]); }
        pts.push([x, 0.07, 1.12]);
        s.tube(pts.reverse(), a.tarpTies === 'straps' ? 0.025 : a.tarpTies === 'elastic' ? 0.007 : 0.012, rope);
        for (const z of [-1.14, 1.14]) {
          if (a.tarpTies === 'elastic') s.tube([[x, 0.07, z], [x + 0.035, 0.09, z], [x + 0.055, 0.04, z], [x + 0.045, -0.01, z]], 0.008, chrome);
          else if (a.tarpTies === 'sacks') s.ball([0.17, 0.07, 0.1], [x, 0.07, z], s.material('#a28a5a'), 10);
          else s.box([a.tarpTies === 'straps' ? 0.32 : 0.25, 0.09, a.tarpTies === 'straps' ? 0.2 : 0.12], [x, 0.045, z], a.tarpTies === 'straps' ? s.material('#95968d') : brick).rotation.y = random() * 3;
        }
      }
    }

    // Snow.
    if (a.snow > 0.2) {
      const depth = mix(0.0, 0.2, (a.snow - 0.2) / 0.8);
      const from = -2.02, to = hasTarp ? Math.min(coverTo, 2.02) : 2.02;
      const top = (x: number) => (hasTarp ? tarpTop(x) : topY(x) + lift + (a.state === 'bonnet' && x > 0.9 ? -0.3 : 0)) + depth * (0.7 + 0.3 * Math.sin(x * 2.3 + 1));
      s.mesh(loft(from, a.state === 'bonnet' ? 0.84 : to, 0.14, 0.86, top, hasTarp ? 0.9 : 0.8, hasTarp ? 0.8 : 0.84 + lift, 0.006, true, true, hasTarp ? 0.2 : 0.3), snowMat);
      if (!hasTarp || a.state === 'half') for (const x of [2.09, -2.09]) if (!(hasTarp && x < 0)) s.box([0.08, 0.03 + depth * 0.3, 1.6], [x, 0.49 + lift, 0], snowMat);
    }

    // Ground: a rectangle of yard, with an oil stain where it always stands.
    const earth = new THREE.Color('#77736b').lerp(new THREE.Color('#e3e7ea'), Math.min(1, a.snow * 1.2));
    s.box([4.9, 0.05, 2.9], [0, -0.025, 0.2], new THREE.MeshStandardMaterial({ color: earth, roughness: 1 }));
    const oil = new THREE.MeshStandardMaterial({ color: '#201c19', roughness: 0.25 });
    const stain = s.cylinder(0.3, 0.3, 0.008, [1.3 + random() * 0.3, 0.004, 0.2], oil, 14); stain.scale.z = 0.7;
    if (a.snow > 0.55) for (const [x, z] of [[-2.2, -0.9], [2.2, -0.8], [-2.1, 1.35], [2.0, 1.4]] as const) s.ball([0.5, 0.12, 0.4], [x, 0, z], snowMat, 10);
    if (a.parkingStops === 'chocks') for (const side of [-1, 1]) {
      const wedge = new THREE.Shape([new THREE.Vector2(-0.17, 0), new THREE.Vector2(0.17, 0), new THREE.Vector2(0.17, 0.13)]);
      const geometry = new THREE.ExtrudeGeometry(wedge, {depth:0.23,bevelEnabled:false}); s.mesh(geometry,s.material('#a08050'),[-1.65,0,side*0.72-0.115]);
    } else if (a.parkingStops === 'blocks') {
      s.box([0.19,0.14,1.75],[2.33,0.07,0],s.material('#a6a395'));
      for(const z of [-0.55,0.55])s.box([0.2,0.005,0.23],[2.33,0.1425,z],s.material('#c6af4f'));
    } else if (a.parkingStops === 'post') {
      s.box([0.24,0.035,0.24],[-0.4,0.0175,-1.12],chrome);
      s.box([0.09,0.09,0.95],[-0.4,0.08,-0.7],s.material('#9c4237'));
      s.cylinder(0.055,0.055,0.14,[-0.4,0.08,-1.12],chrome,10).rotation.z=Math.PI/2;
    }
    if (a.repairLight !== 'none') {
      const x=1.95,z=1.15,metal=s.material('#444b48'),lamp=s.material('#eddfad',{emissive:'#ebc67a',emissiveIntensity:mix(0.15,1.25,1-mood.daylight)});
      if(a.repairLight==='stand') {
        for(let i=0;i<3;i++){const t=i*Math.PI*2/3;s.rod([x+Math.cos(t)*0.22,0.012,z+Math.sin(t)*0.22],[x,0.28,z],0.014,metal);}
        s.rod([x,0.2,z],[x,0.68,z],0.018,metal);s.box([0.28,0.22,0.09],[x,0.75,z],metal);s.box([0.23,0.17,0.012],[x,0.75,z+0.051],lamp);
      } else if(a.repairLight==='lantern') {
        s.cylinder(0.1,0.12,0.055,[x,0.0275,z],metal,12);s.cylinder(0.075,0.075,0.18,[x,0.145,z],lamp,12);s.cylinder(0.11,0.085,0.06,[x,0.265,z],metal,12);
        s.tube([[x-0.08,0.25,z],[x-0.08,0.38,z],[x+0.08,0.38,z],[x+0.08,0.25,z]],0.008,metal);
      } else {
        s.box([0.4,0.025,0.28],[x,0.0125,z],metal);s.rod([x-0.12,0.075,z],[x+0.03,0.075,z],0.04,metal);s.rod([x+0.03,0.075,z],[x+0.14,0.075,z],0.046,lamp);
        for(const end of [0.03,0.14])s.ring(0.05,0.005,[x+end,0.075,z],metal).rotation.y=Math.PI/2;
        for(const d of [-1,1])s.rod([x+0.02,0.075+d*0.05,z],[x+0.16,0.075+d*0.05,z],0.005,metal);
        for(let i=0;i<3;i++){const loop=s.ring(0.11+i*0.02,0.006,[x-0.3,0.006,z],metal);loop.rotation.x=Math.PI/2;}
        s.tube([[x-0.12,0.075,z],[x-0.21,0.02,z+0.06],[x-0.3,0.006,z+0.11]],0.006,metal);
      }
    }

    // What is on the ground on the near side.
    const gz = 1.2;
    if (a.ground === 'toolbox') {
      const tx = 0.9 + random() * 0.4;
      s.box([0.62, 0.012, 0.42], [tx - 0.75, 0.008, gz], s.material('#8a2f2a', { roughness: 1 })).rotation.y = 0.2;
      const steel = s.material('#c5c9cc', { metalness: 0.85, roughness: 0.3 });
      for (let i = 0; i < 4 + Math.floor(mood.density * 4); i++) { const w = s.box([0.18 + random() * 0.1, 0.012, 0.025], [tx - 0.95 + random() * 0.4, 0.02, gz - 0.14 + i * 0.045], steel); w.rotation.y = (random() - 0.5) * 0.5; }
      const boxMat = s.material('#3f6a8c', { metalness: 0.4 });
      s.box([0.46, 0.16, 0.22], [tx, 0.08, gz], boxMat);
      const lid = s.box([0.46, 0.02, 0.22], [tx, 0.26, gz - 0.16], boxMat); lid.rotation.x = -1.2;
      s.box([0.4, 0.03, 0.16], [tx, 0.165, gz], s.material('#1f2224'));
      s.rod([tx - 0.1, 0.17, gz + 0.02], [tx + 0.14, 0.24, gz - 0.02], 0.014, s.material('#c98a2a'));
    } else if (a.ground === 'wheel') {
      const wx = -1.0 + random() * 0.4;
      s.cylinder(0.3, 0.3, 0.19, [wx, 0.095, gz], tyre, 20);
      s.cylinder(0.17, 0.17, 0.2, [wx, 0.1, gz], hub, 14);
      const jackMat = s.material('#a3352c', { metalness: 0.4 });
      s.box([0.2, 0.03, 0.12], [0.9, 0.015, gz - 0.2], jackMat);
      for (const d of [-1, 1]) { s.rod([0.9 - d * 0.09, 0.03, gz - 0.2], [0.9 + d * 0.09, 0.2, gz - 0.2], 0.012, jackMat); }
      s.rod([0.75, 0.115, gz - 0.2], [1.3, 0.115, gz - 0.2], 0.008, s.material('#c5c9cc', { metalness: 0.8 }));
      s.box([0.12, 0.02, 0.1], [0.9, 0.21, gz - 0.2], jackMat);
    } else if (a.ground === 'canister') {
      const cx = 0.6 + random() * 0.5;
      const can = s.material('#4d5a3c', { metalness: 0.3 });
      s.box([0.34, 0.44, 0.16], [cx, 0.22, gz], can).rotation.y = 0.3;
      s.box([0.2, 0.05, 0.06], [cx, 0.47, gz], can).rotation.y = 0.3;
      s.cylinder(0.03, 0.03, 0.06, [cx + 0.13, 0.47, gz - 0.04], black, 8);
      const funnel = s.mesh(new THREE.ConeGeometry(0.1, 0.14, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#c9502f', side: THREE.DoubleSide, roughness: 0.6 }), [cx - 0.5, 0.07, gz + 0.1]); funnel.rotation.z = 1.9;
      const pool = s.cylinder(0.42, 0.42, 0.008, [cx - 0.35, 0.005, gz - 0.1], oil, 16); pool.scale.z = 0.6;
    } else if (a.ground === 'legs') {
      const lx = -0.2 + random() * 0.5;
      const mechanic=figure(s,{height:1.52,pose:'lying',style:'doll',hair:'cap',top:'#3c4a63',bottom:'#3c4a63',shoes:'#1f1c1a',skin:'#bf9678'});
      mechanic.root.position.set(lx,0.015,0.65);s.root.add(mechanic.root);
      s.box([0.56, 0.015, 1.6], [lx, 0.0075, 0.65], s.material('#b59a6a', { roughness: 1 }));
    }
    return s.finish();
  },
});
