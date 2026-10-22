import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

const PAINT = {
  yellow: 'Construction yellow with a black counterweight.',
  orange: 'Warehouse orange, the big-brand look.',
  red: 'Bright red with white wheels.',
  green: 'Deep green, an older European truck.',
  blue: 'Clean blue and white, a food-factory electric.',
  grey: 'Plain fleet grey, anonymous and rented.',
} as const;
const PAINT_HEX: Record<keyof typeof PAINT, string> = {
  yellow: '#e9b21a', orange: '#e2641c', red: '#c5302b', green: '#2e6a48', blue: '#2a62ad', grey: '#9aa1a3',
};

export default defineThing({
  questions: {
    power: choice('What powers it?', {
      propane: 'Gas: a silver propane bottle strapped across the back.',
      electric: 'Electric: a boxy battery pack under the seat and a coiled charging lead.',
      diesel: 'Diesel: a sooty upright exhaust stack, a yard truck.',
    }),
    paint: choice('What colour is it?', PAINT),
    forks: score('Where are the forks?', ['Resting flat on the floor', 'Carried just off the ground', 'Raised to chest height', 'Raised to the top of the mast']),
    load: choice('What is on the forks?', {
      none: 'Nothing: bare forks.',
      cartons: 'A pallet of cardboard cartons.',
      empties: 'A stack of empty pallets.',
      drums: 'Steel drums on a pallet.',
      pipes: 'A long bundle of pipes carried crosswise, wider than the truck.',
      crate: 'One big wooden crate.',
    }),
    beacon: choice('What is the warning light doing?', {
      amber: 'An amber beacon flashing on the roof.',
      blue: 'A blue safety spotlight throwing a dot on the floor ahead.',
      off: 'Switched off: the truck is dead and dark.',
    }),
    seat: choice('What has been left on it?', {
      empty: 'Nothing: the seat is empty.',
      jacket: 'A hi-vis jacket draped over the seat back.',
      hat: 'A hard hat sitting on the seat.',
      tag: 'A red DO NOT OPERATE tag hung on the steering wheel.',
      lunch: 'A flask and a lunchbox on the dashboard.',
    }),
    guard: choice('What is over the driver?', {
      bars: 'An open overhead guard of steel bars.',
      mesh: 'A guard with a solid rain cover on top.',
      cab: 'A full cab with a windscreen for working out in the yard.',
    }),
    tyres: choice('What tyres does it run on?', {
      cushion: 'Small solid black tyres for smooth warehouse floors.',
      white: 'White non-marking tyres for a clean floor.',
      pneumatic: 'Big chunky pneumatic tyres for rough yards.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const body = s.material(PAINT_HEX[a.paint], { metalness: 0.2, roughness: 0.45 });
    const dark = s.material('#24272a', { roughness: 0.65 });
    const iron = s.material(a.paint === 'blue' ? '#e8e8e2' : '#33373a', { roughness: 0.6, metalness: 0.3 });
    const steel = s.material('#7e8589', { metalness: 0.75, roughness: 0.4 });
    const mastPaint = s.material('#2b2e31', { metalness: 0.5, roughness: 0.5 });
    const chrome = s.material('#dfe3e5', { metalness: 0.95, roughness: 0.15 });
    const wood = s.material('#c49a62', { roughness: 0.9 });
    const woodDark = s.material('#a67c48', { roughness: 0.9 });
    const big = a.tyres === 'pneumatic';
    const rubber = s.material(a.tyres === 'white' ? '#e6e3da' : '#1c1d1f', { roughness: 0.85 });
    const hub = s.material(a.paint === 'red' ? '#efece2' : a.paint === 'yellow' ? '#c5302b' : '#e9b21a', { roughness: 0.5 });

    const wheel = (r: number, w: number, x: number, z: number) => {
      const side = Math.sign(x);
      const t = s.cylinder(r, r, w, [x, r, z], rubber, 24);
      t.rotation.z = Math.PI / 2;
      s.cylinder(r * 0.55, r * 0.55, 0.03, [x + side * w / 2, r, z], hub, 16).rotation.z = Math.PI / 2;
      s.cylinder(r * 0.16, r * 0.16, 0.05, [x + side * w / 2, r, z], dark, 10).rotation.z = Math.PI / 2;
      if (big) for (let i = 0; i < 12; i++) {
        const lug = s.box([w * 1.02, 0.03, 0.06], [x, r + Math.sin(i / 12 * Math.PI * 2) * r, z + Math.cos(i / 12 * Math.PI * 2) * r], rubber);
        lug.rotation.x = -i / 12 * Math.PI * 2;
      }
    };
    const fr = big ? 0.38 : 0.31, rr = big ? 0.3 : 0.24;
    const lift0 = big ? 0.1 : 0;
    const Y = (y: number) => y + lift0;
    wheel(fr, big ? 0.3 : 0.26, 0.48, 0.22); wheel(fr, big ? 0.3 : 0.26, -0.48, 0.22);
    wheel(rr, big ? 0.24 : 0.18, 0.44, -0.9); wheel(rr, big ? 0.24 : 0.18, -0.44, -0.9);

    // Chassis, fenders, hood and the heavy rounded counterweight.
    s.box([0.8, 0.5, 1.55], [0, Y(0.5), -0.38], body);
    for (const x of [-1, 1]) {
      s.box([0.2, 0.08, 0.86], [x * 0.5, Y(0.74), 0.2], body);
      s.box([0.2, 0.3, 0.08], [x * 0.5, Y(0.6), 0.62], body);
      s.box([0.16, 0.42, 0.75], [x * 0.48, Y(0.72), -0.42], body);
    }
    s.box([1.14, 0.78, 0.4], [0, Y(0.66), -1.2], iron);
    const cap = s.cylinder(0.57, 0.57, 0.78, [0, Y(0.66), -1.38], iron, 28);
    cap.scale.z = 0.42;
    s.box([0.3, 0.06, 0.05], [0, Y(0.42), -1.63], steel);
    const electric = a.power === 'electric';
    s.box([0.98, electric ? 0.46 : 0.36, 0.86], [0, Y(electric ? 0.98 : 0.95), -0.6], electric ? s.material('#3a3f44', { roughness: 0.5 }) : body);
    if (electric) {
      s.label('48V', 0.4, 0.2, [0.492, Y(0.98), -0.6], '#f2d21e', '#3a3f44').rotation.y = Math.PI / 2;
      s.label('48V', 0.4, 0.2, [-0.492, Y(0.98), -0.6], '#f2d21e', '#3a3f44').rotation.y = -Math.PI / 2;
      const coil = s.material('#e2641c', { roughness: 0.6 });
      for (let i = 0; i < 5; i++) s.ring(0.11, 0.014, [0.3, Y(1.12) + i * 0.012, -1.2], coil).rotation.x = Math.PI / 2 + (random() - 0.5) * 0.15;
      s.box([0.08, 0.06, 0.12], [0.3, Y(1.1), -1.05], s.material('#2a62ad'));
    } else {
      for (let i = 0; i < 6; i++) s.box([0.004, 0.2, 0.05], [0.492, Y(0.95), -0.85 + i * 0.09], dark);
      const tag = s.label('FLT ' + String(1 + Math.floor(random() * 28)).padStart(2, '0'), 0.36, 0.13, [0.563, Y(0.74), -0.4], '#1c1d1f', '#f0ead2');
      tag.rotation.y = Math.PI / 2;
    }
    const seatTop = Y(electric ? 1.21 : 1.13);
    // Seat.
    const vinyl = s.material('#1e2023', { roughness: 0.5 });
    s.box([0.5, 0.1, 0.48], [0, seatTop + 0.05, -0.48], vinyl);
    const back = s.box([0.5, 0.5, 0.1], [0, seatTop + 0.33, -0.76], vinyl);
    back.rotation.x = -0.12;
    // Dash, steering wheel and hydraulic levers.
    s.box([0.9, 0.5, 0.14], [0, Y(0.98), 0.36], body);
    s.box([0.8, 0.04, 0.5], [0, Y(0.77), 0.08], dark);
    s.rod([-0.12, Y(1.18), 0.33], [-0.12, Y(1.46), 0.12], 0.025, dark);
    const steer = s.ring(0.16, 0.018, [-0.12, Y(1.47), 0.11], dark);
    steer.rotation.x = -Math.PI / 2 + 0.65;
    s.ball([0.03, 0.03, 0.03], [-0.02, Y(1.53), 0.02], chrome, 10);
    for (let i = 0; i < 3; i++) {
      s.rod([0.2 + i * 0.07, Y(1.2), 0.34], [0.2 + i * 0.07, Y(1.38), 0.26 + (random() - 0.5) * 0.06], 0.009, steel);
      s.ball([0.022, 0.022, 0.022], [0.2 + i * 0.07, Y(1.39), 0.26], i === 0 ? s.material('#c5302b') : dark, 8);
    }

    // Overhead guard.
    const top = Y(2.16);
    const post = s.material('#26292c', { roughness: 0.55, metalness: 0.3 });
    for (const x of [-0.52, 0.52]) {
      s.rod([x, Y(0.78), 0.44], [x, top, 0.22], 0.035, post);
      s.rod([x, Y(1.05), -1.0], [x, top, -0.86], 0.035, post);
      s.rod([x, top, 0.24], [x, top, -0.88], 0.035, post);
    }
    for (const z of [0.22, -0.86]) s.rod([-0.52, top, z], [0.52, top, z], 0.035, post);
    if (a.guard === 'bars') for (let i = 1; i < 7; i++) s.rod([-0.52, top, 0.22 - i * 0.155], [0.52, top, 0.22 - i * 0.155], 0.016, post);
    else s.box([1.12, 0.03, 1.16], [0, top + 0.04, -0.32], s.material(a.guard === 'cab' ? PAINT_HEX[a.paint] : '#3b4046', { roughness: 0.5 }));
    if (a.guard === 'cab') {
      const glass = new THREE.MeshStandardMaterial({ color: '#bfe0ea', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
      const screen = s.mesh(new THREE.PlaneGeometry(1.0, 1.4), glass, [0, Y(1.47), 0.33]);
      screen.rotation.x = -0.16;
      screen.castShadow = false;
      const rear = s.mesh(new THREE.PlaneGeometry(1.0, 1.05), glass, [0, Y(1.62), -0.93]);
      rear.rotation.x = 0.12;
      rear.castShadow = false;
      s.rod([0.1, Y(1.25), 0.4], [0.38, Y(1.75), 0.33], 0.01, dark);
    }
    // Headlamps on the front posts.
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const lamp = s.material('#fff3c8', { emissive: '#ffe39a', emissiveIntensity: a.beacon === 'off' ? 0 : mix(0.2, 1.6, dusk) });
    for (const x of [-0.52, 0.52]) {
      s.cylinder(0.06, 0.05, 0.08, [x, Y(1.72), 0.36], dark, 12).rotation.x = Math.PI / 2;
      s.cylinder(0.05, 0.05, 0.01, [x, Y(1.72), 0.405], lamp, 12).rotation.x = Math.PI / 2;
    }

    // Fuel.
    if (a.power === 'propane') {
      const tank = s.material('#d6dadb', { metalness: 0.6, roughness: 0.3 });
      const cyl = s.cylinder(0.16, 0.16, 0.62, [0, Y(1.24), -1.2], tank, 20);
      cyl.rotation.z = Math.PI / 2;
      for (const x of [-0.31, 0.31]) s.ball([0.1, 0.16, 0.16], [x, Y(1.24), -1.2], tank, 14);
      for (const x of [-0.16, 0.16]) s.ring(0.165, 0.012, [x, Y(1.24), -1.2], dark).rotation.y = Math.PI / 2;
      s.cylinder(0.03, 0.03, 0.08, [0.4, Y(1.24), -1.2], s.material('#b98a2c', { metalness: 0.8 }), 10).rotation.z = Math.PI / 2;
      s.box([0.5, 0.03, 0.36], [0, Y(1.065), -1.2], dark);
    } else if (a.power === 'diesel') {
      s.cylinder(0.035, 0.035, 1.3, [0.5, Y(1.7), -1.12], s.material('#3a3632', { metalness: 0.5, roughness: 0.7 }), 12);
      s.cylinder(0.055, 0.055, 0.35, [0.5, Y(1.4), -1.12], s.material('#55504a', { metalness: 0.5, roughness: 0.6 }), 12);
      const flap = s.cylinder(0.04, 0.04, 0.008, [0.5, Y(2.37), -1.14], dark, 10);
      flap.rotation.x = 0.7;
      s.box([0.6, 0.3, 0.02], [0, Y(0.75), -1.615], dark);
    }

    // Mast, lift cylinder, chains and carriage.
    const forkY = lift0 * 0 + [0.03, 0.22, 1.25, 2.75][0] + (a.forks < 1 / 3 ? mix(0, 0.19, a.forks * 3) : a.forks < 2 / 3 ? mix(0.19, 1.22, a.forks * 3 - 1) : mix(1.22, 2.72, a.forks * 3 - 2));
    const rise = Math.max(0, forkY - 0.95);
    const mz = 0.72;
    for (const x of [-0.37, 0.37]) {
      s.box([0.09, 2.05, 0.15], [x, 1.13, mz], mastPaint);
      s.box([0.065, 2.0, 0.1], [x * 0.8, 1.14 + rise, mz + 0.01], steel);
    }
    for (const y of [0.25, 1.2, 2.13]) s.box([0.83, 0.08, 0.06], [0, y, mz - 0.07], mastPaint);
    s.box([0.66, 0.07, 0.06], [0, 2.12 + rise, mz + 0.02], steel);
    s.cylinder(0.05, 0.05, 1.5, [0, 0.9, mz - 0.01], mastPaint, 14);
    s.cylinder(0.03, 0.03, 0.75 + rise, [0, 1.65 + (0.75 + rise) / 2 - 0.3, mz - 0.01], chrome, 12);
    for (const x of [-0.1, 0.1]) s.box([0.025, Math.max(0.1, 2.05 + rise - forkY - 0.5), 0.012], [x, (2.05 + rise + forkY + 0.5) / 2, mz + 0.06], dark);
    for (const x of [-1, 1]) s.rod([x * 0.42, Y(0.62), 0.5], [x * 0.37, 0.8, mz - 0.06], 0.03, chrome);
    const cz = mz + 0.11;
    for (const y of [0.12, 0.5]) s.box([1.02, 0.11, 0.05], [0, forkY + y, cz], mastPaint);
    for (const x of [-0.5, 0.5]) s.box([0.03, 1.1, 0.03], [x, forkY + 0.6, cz], mastPaint);
    s.box([1.03, 0.03, 0.03], [0, forkY + 1.15, cz], mastPaint);
    for (let i = 1; i < 6; i++) s.box([0.022, 0.62, 0.022], [-0.5 + i / 6, forkY + 0.84, cz], mastPaint);
    const fz = cz + 0.05;
    for (const x of [-0.28, 0.28]) {
      s.box([0.11, 0.62, 0.045], [x, forkY + 0.31, fz], steel);
      s.box([0.11, 0.045, 1.07], [x, forkY + 0.0225, fz + 0.535], steel);
      const tip = s.box([0.09, 0.025, 0.12], [x, forkY + 0.014, fz + 1.12], steel);
      tip.rotation.x = 0.1;
    }

    // Load.
    const pallet = (y: number, parent: THREE.Object3D, tone = wood) => {
      const add = (size: P3, at: P3, material: THREE.Material) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        mesh.position.set(...at);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
      };
      const L = 1.2, W = 1.0;
      for (const z of [-W / 2 + 0.05, 0, W / 2 - 0.05]) {
        add([L, 0.022, 0.1], [0, y + 0.011, z], woodDark);
        for (const x of [-L / 2 + 0.0725, 0, L / 2 - 0.0725]) add([0.145, 0.078, 0.1], [x, y + 0.061, z], tone);
      }
      for (const x of [-L / 2 + 0.0725, 0, L / 2 - 0.0725]) add([0.145, 0.022, W], [x, y + 0.111, 0], woodDark);
      for (let i = 0; i < 6; i++) add([L, 0.022, 0.125], [0, y + 0.133, -W / 2 + 0.0625 + i * (W - 0.125) / 5], tone);
    };
    const cargo = new THREE.Group();
    cargo.position.set(0, Math.max(0, forkY - 0.055), fz + 0.56);
    s.root.add(cargo);
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      cargo.add(mesh);
      return mesh;
    };
    if (a.load !== 'none' && a.load !== 'pipes') pallet(0, cargo);
    if (a.load === 'cartons') {
      const layers = 2 + Math.round(mood.density * 2);
      const tones = ['#b98a55', '#c79a63', '#ad8250', '#bf9460'].map((tone) => s.material(tone, { roughness: 0.9 }));
      const tape = s.material('#dccba2', { roughness: 0.5 });
      for (let layer = 0; layer < layers; layer++)
        for (let ix = 0; ix < 3; ix++)
          for (let iz = 0; iz < 2; iz++) {
            if (layer === layers - 1 && layer > 1 && random() < 0.3) continue;
            const at: P3 = [-0.39 + ix * 0.39 + (random() - 0.5) * 0.03, 0.144 + 0.16 + layer * 0.322, -0.24 + iz * 0.48 + (random() - 0.5) * 0.03];
            put(new THREE.BoxGeometry(0.37, 0.32, 0.46), tones[Math.floor(random() * 4)], at);
            put(new THREE.BoxGeometry(0.372, 0.322, 0.05), tape, at);
          }
    } else if (a.load === 'empties') {
      const count = 3 + Math.round(mood.density * 6);
      for (let i = 1; i <= count; i++) {
        const g = new THREE.Group();
        pallet(0, g, i % 2 ? woodDark : wood);
        g.position.set((random() - 0.5) * 0.06, i * 0.146, (random() - 0.5) * 0.06);
        g.rotation.y = (random() - 0.5) * 0.1;
        cargo.add(g);
      }
    } else if (a.load === 'drums') {
      const colours = ['#2b5ea0', '#b53a2e', '#2a2d30', '#3c7a52'];
      const main = colours[Math.floor(random() * 4)];
      const n = mood.density > 0.5 ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const paintDrum = s.material(random() < 0.7 ? main : colours[Math.floor(random() * 4)], { metalness: 0.35, roughness: 0.45 });
        const at: P3 = n === 4 ? [(i % 2 - 0.5) * 0.59, 0.144 + 0.43, (Math.floor(i / 2) - 0.5) * 0.5] : [(i - 0.5) * 0.6, 0.144 + 0.43, 0];
        const r = n === 4 ? 0.245 : 0.285;
        put(new THREE.CylinderGeometry(r, r, 0.86, 24), paintDrum, at);
        for (const y of [-0.42, -0.14, 0.14, 0.42]) put(new THREE.TorusGeometry(r, 0.012, 6, 28), paintDrum, [at[0], at[1] + y, at[2]]).rotation.x = Math.PI / 2;
      }
    } else if (a.load === 'crate') {
      const ply = s.material('#d2b17c', { roughness: 0.9 });
      const ht = 0.8 + mood.density * 0.4;
      put(new THREE.BoxGeometry(1.1, ht, 0.9), ply, [0, 0.144 + ht / 2, 0]);
      for (const x of [-1, 0, 1]) for (const z of [-1, 1]) put(new THREE.BoxGeometry(0.09, ht + 0.02, 0.03), woodDark, [x * 0.5, 0.144 + ht / 2, z * 0.462]);
      for (const y of [0.05, ht - 0.05]) for (const z of [-1, 1]) put(new THREE.BoxGeometry(1.12, 0.09, 0.03), woodDark, [0, 0.144 + y, z * 0.466]);
      for (const x of [-1, 1]) for (const y of [0.05, ht - 0.05]) put(new THREE.BoxGeometry(0.03, 0.09, 0.92), woodDark, [x * 0.562, 0.144 + y, 0]);
      const mark = s.label('FRAGILE', 0.55, 0.15, [0, 0, 0], '#b3261e', '#d2b17c');
      cargo.add(mark);
      mark.position.set(0.58, 0.144 + ht * 0.55, 0);
      mark.rotation.y = Math.PI / 2;
    } else if (a.load === 'pipes') {
      const kinds = [['#c8693c', 0.7, 0.4], ['#8d9396', 0.8, 0.35], ['#3c6fb0', 0.1, 0.5], ['#d9d5c8', 0.05, 0.6]] as const;
      const kind = kinds[Math.floor(random() * kinds.length)];
      const pipe = s.material(kind[0], { metalness: kind[1], roughness: kind[2] });
      const length = 3 + random() * 1.2, r = 0.055;
      const rows = 2 + Math.round(mood.density * 2);
      for (let row = 0; row < rows; row++)
        for (let i = 0; i < 7 - row; i++) {
          const m = put(new THREE.CylinderGeometry(r, r, length, 12, 1, true), pipe, [(random() - 0.5) * 0.2, 0.1 + r + row * r * 1.74, -0.36 + (i + row * 0.5) * r * 2.02]);
          m.rotation.z = Math.PI / 2;
          (m.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        }
      const strap = s.material('#e9b21a', { roughness: 0.6 });
      for (const x of [-0.9, 0.9]) put(new THREE.BoxGeometry(0.05, rows * r * 1.74 + 0.03, 0.8), strap, [x, 0.1 + rows * r * 0.87, 0]);
      cargo.position.y = forkY - 0.055;
    }

    // Warning light.
    const amber = new THREE.MeshStandardMaterial({ color: a.beacon === 'blue' ? '#2f6bff' : '#ff9a1a', emissive: a.beacon === 'blue' ? '#2f6bff' : '#ff8a00', emissiveIntensity: a.beacon === 'off' ? 0 : 1.6, roughness: 0.3 });
    if (a.beacon === 'blue') {
      s.box([0.1, 0.07, 0.1], [0, top + 0.07, 0.2], dark);
      s.cylinder(0.04, 0.04, 0.02, [0, top + 0.05, 0.255], amber, 12).rotation.x = Math.PI / 2;
      const spot = s.mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: '#3b78ff', transparent: true, opacity: 0.75, depthWrite: false }), [0, 0.012, 2.5]);
      spot.rotation.x = -Math.PI / 2;
      spot.castShadow = false;
    } else {
      s.cylinder(0.07, 0.08, 0.04, [0.3, top + 0.075, -0.75], dark, 14);
      s.cylinder(0.055, 0.06, 0.1, [0.3, top + 0.14, -0.75], amber, 14);
      s.ball([0.055, 0.03, 0.055], [0.3, top + 0.19, -0.75], amber, 12);
    }

    // What the driver left.
    if (a.seat === 'jacket') {
      const vis = s.material(mood.cheer > 0.5 ? '#eaf01e' : '#f37a18', { roughness: 0.8, emissive: mood.cheer > 0.5 ? '#6b6e00' : '#6e3000', emissiveIntensity: 0.35 });
      const band = s.material('#d5d8d6', { metalness: 0.6, roughness: 0.3 });
      const drape = s.box([0.56, 0.44, 0.16], [0, seatTop + 0.4, -0.77], vis);
      drape.rotation.x = -0.12;
      for (const y of [0.3, 0.42]) s.box([0.57, 0.04, 0.17], [0, seatTop + y, -0.76 - (y - 0.3) * 0.12], band).rotation.x = -0.12;
      for (const x of [-1, 1]) {
        const sleeve = s.box([0.1, 0.42, 0.11], [x * 0.33, seatTop + 0.26 + random() * 0.08, -0.74], vis);
        sleeve.rotation.z = x * 0.18;
        sleeve.rotation.x = (random() - 0.5) * 0.3;
      }
    } else if (a.seat === 'hat') {
      const helmet = s.material(mood.cheer > 0.5 ? '#f2f0e8' : '#e9b21a', { roughness: 0.35 });
      s.ball([0.12, 0.1, 0.14], [0.03, seatTop + 0.13, -0.45], helmet, 16);
      s.cylinder(0.15, 0.15, 0.012, [0.03, seatTop + 0.108, -0.42], helmet, 18).scale.z = 1.15;
    } else if (a.seat === 'tag') {
      const tag = s.label('DO NOT OPERATE', 0.26, 0.16, [-0.12, Y(1.36), 0.2], '#ffffff', '#c7261e');
      tag.rotation.x = -0.25;
      tag.rotation.z = (random() - 0.5) * 0.3;
    } else if (a.seat === 'lunch') {
      s.cylinder(0.04, 0.04, 0.24, [0.25, Y(1.35), 0.37], s.material('#2e6a48', { metalness: 0.5, roughness: 0.4 }), 12);
      s.cylinder(0.042, 0.035, 0.05, [0.25, Y(1.49), 0.37], chrome, 12);
      s.box([0.2, 0.09, 0.12], [-0.3, Y(1.275), 0.37], s.material('#3c6fb0', { roughness: 0.5 })).rotation.y = (random() - 0.5) * 0.4;
    }

    s.root.rotation.y = 0.72 + (random() - 0.5) * 0.3;
    const speed = mix(3, 11, mood.energy);
    return s.finish({
      update: a.beacon === 'off' ? undefined : (_dt, time) => {
        amber.emissiveIntensity = a.beacon === 'blue' ? 1.6 : 1.3 + Math.sin(time * speed) * 1.1;
      },
    });
  },
});
