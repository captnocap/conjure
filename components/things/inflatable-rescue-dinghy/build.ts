import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { flood, floodColour } from './flood';

type V3 = readonly [number, number, number];
const HULLS = {
  orange: 'Rescue orange, visible from a rooftop.',
  red: 'Fire-engine red.',
  yellow: 'Bright yellow, a lifeguard boat.',
  grey: 'Military grey with black trim, an army engineers\' boat.',
  blue: 'White tubes with a blue stripe, a coast-guard look.',
} as const;
const HULL_TINT: Record<keyof typeof HULLS, string> = { orange: '#e8651c', red: '#c5271f', yellow: '#e9bd1f', grey: '#7f888a', blue: '#e9ebea' };

export default defineThing({
  questions: {
    hull: choice('What colour are the inflatable tubes?', HULLS),
    load: choice('What is the boat carrying?', {
      empty: 'Nothing yet: it is on its way out, the floor bare.',
      blankets: 'Stacks of folded grey and red blankets and a big tea flask.',
      goat: 'A rescued goat standing in the middle, unimpressed.',
      supplies: 'Relief cartons, blue water cans and sacks of rice.',
      belongings: 'A family\'s things: a tin trunk, cloth bundles, a rolled mat and a birdcage.',
      people: 'A rescuer in a life vest and helmet standing at the stern, and one passenger huddled in a blanket.',
    }),
    markings: choice('What is painted on the tubes?', {
      rescue: 'RESCUE in white block capitals.',
      relief: 'FLOOD RELIEF and a unit number.',
      fire: 'FIRE & RESCUE in official lettering.',
      civil: 'CIVIL DEFENCE in stencilled letters.',
      volunteer: 'A hand-painted name, a volunteers\' boat bought with donations.',
      none: 'Nothing: plain unmarked tubes.',
    }),
    mooring: choice('Is it moored or moving?', {
      moored: 'Tied by its painter to a bamboo pole stuck in the flood.',
      drifting: 'Drifting free with nobody at the tiller, rope trailing in the water.',
      steps: 'Nosed up against a flight of half-drowned steps, waiting for someone to come down.',
      underway: 'Under way, pushing a small bow wave.',
    }),
    motor: choice('What is at the stern?', {
      tilted: 'An outboard motor tilted up clear of the debris.',
      running: 'An outboard motor down and running, churning the brown water.',
      oars: 'No motor, just a pair of oars in rowlocks.',
    }),
    condition: choice('What shape are the tubes in?', {
      taut: 'Drum-tight and nearly new.',
      patched: 'Covered in glued patches of mismatched rubber from years of service.',
      soft: 'One side gone soft and wrinkled, the boat listing toward it.',
    }),
    signal: choice('What is it showing to be seen or heard?', {
      none: 'Nothing.',
      flag: 'A red flag on a short pole at the stern.',
      beacon: 'An amber flashing beacon on a little mast.',
      hailer: 'A white loudhailer lying on the bow.',
      lantern: 'A hurricane lantern hung from a pole, for night work.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const hullTint = HULL_TINT[a.hull];
    const rubber = s.material(hullTint, { roughness: 0.5 });
    const trim = s.material(a.hull === 'blue' ? '#1f4f9a' : '#1d1f22', { roughness: 0.75 });
    const grey = s.material('#4c5357', { roughness: 0.8 });
    const steel = s.material('#b9bfc2', { metalness: 0.7, roughness: 0.35 });
    const rope = s.material('#f1ead2', { roughness: 0.9 });
    const wood = s.material('#a67a45', { roughness: 0.8 });
    const boat = new THREE.Group();
    s.root.add(boat);
    const add = <T extends THREE.Object3D>(object: T, parent: THREE.Object3D = boat) => { object.traverse((node) => { node.castShadow = node.receiveShadow = true; }); parent.add(object); return object; };
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, at: V3 = [0, 0, 0], scale: V3 = [1, 1, 1], parent: THREE.Object3D = boat) => {
      const m = add(new THREE.Mesh(geometry, material), parent);
      m.position.set(...at); m.scale.set(...scale);
      return m;
    };
    const rod = (from: V3, to: V3, radius: number, material: THREE.Material, parent: THREE.Object3D = boat) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const m = mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 8), material, [0, 0, 0], [1, 1, 1], parent);
      m.position.copy(p.add(q).multiplyScalar(0.5));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return m;
    };
    const sphere = new THREE.SphereGeometry(1, 14, 10);
    const cube = new THREE.BoxGeometry(1, 1, 1);

    // ---- the tubes: one U from stern quarter to stern quarter round the bow ----
    const B = 0.62, T = 0.245;
    const half: V3[] = [[-B, 0.26, -1.72], [-B, 0.26, -0.7], [-B, 0.275, 0.35], [-B * 0.9, 0.31, 0.95], [-B * 0.58, 0.37, 1.42], [0, 0.41, 1.63]];
    const points = [...half, ...half.slice(0, -1).reverse().map(([x, y, z]) => [-x, y, z] as V3)];
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.4);
    const tubeGeometry = new THREE.TubeGeometry(curve, 90, T, 14, false);
    if (a.condition === 'soft') {
      const pos = tubeGeometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        if (x < -0.2 && z < 0.9) {
          const sag = Math.min(1, (0.9 - z) / 0.8) * 0.42;
          pos.setY(i, 0.05 + (pos.getY(i) - 0.05) * (1 - sag) + Math.sin(z * 9) * 0.012 * sag);
        }
      }
      tubeGeometry.computeVertexNormals();
    }
    mesh(tubeGeometry, rubber);
    for (const side of [-1, 1]) {
      const soft = a.condition === 'soft' && side < 0;
      const cone = mesh(new THREE.ConeGeometry(T, 0.36, 14), trim, [side * B, soft ? 0.18 : 0.26, -1.9], [1, 1, soft ? 0.6 : 1]);
      cone.rotation.x = -Math.PI / 2;
      // Seam bands, rubbing strake and the scalloped grab line with its patches.
      for (const z of [-1.2, -0.3, 0.55]) mesh(new THREE.TorusGeometry(T + 0.004, 0.012, 6, 24), trim, [side * B, soft ? 0.19 : 0.262, z], [1, soft ? 0.62 : 1, 1]);
      rod([side * (B + T - 0.01), soft ? 0.15 : 0.2, -1.7], [side * (B + T - 0.01), soft ? 0.16 : 0.215, 0.4], 0.028, trim);
      for (let i = 0; i < 4; i++) {
        const z = -1.4 + i * 0.55;
        const y = soft ? 0.3 : 0.44;
        const loop = mesh(new THREE.TorusGeometry(0.2, 0.012, 5, 14, Math.PI), rope, [side * (B + 0.15), y, z + 0.275], [1.35, 0.5, 1]);
        loop.rotation.set(Math.PI + (side > 0 ? -0.45 : 0.45), Math.PI / 2, 0, 'YXZ');
        mesh(cube, grey, [side * (B + 0.13), y + 0.01, z], [0.06, 0.03, 0.09]);
      }
      mesh(cube, grey, [side * (B + 0.13), soft ? 0.31 : 0.45, 0.8], [0.06, 0.03, 0.09]);
      // Carry handles.
      for (const z of [-0.9, 0.2]) mesh(new THREE.TorusGeometry(0.07, 0.014, 5, 10, Math.PI), trim, [side * B, (soft ? 0.34 : 0.26 + T) - 0.005, z]).rotation.y = Math.PI / 2;
    }
    // Floor, keel shadow, transom and thwart.
    mesh(cube, grey, [0, 0.11, -0.2], [B * 2 - 0.2, 0.06, 3.0]);
    mesh(cube, s.material('#3a3f42'), [0, 0.145, -0.2], [B * 2 - 0.5, 0.012, 2.8]);
    mesh(cube, s.material('#8a6a42', { roughness: 0.7 }), [0, 0.3, -1.62], [B * 2 - 0.36, 0.44, 0.06]);
    mesh(cube, wood, [0, 0.36, -0.55], [B * 2 - 0.4, 0.035, 0.24]);
    // D-ring and bow dodger.
    mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12), steel, [0, 0.42, 1.88]).rotation.y = Math.PI / 2;
    const dodger = mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), trim, [0, 0.42, 1.2], [0.42, 0.14, 0.38]);
    dodger.rotation.x = 0.12;

    // Markings on both sides.
    const text = { rescue: 'RESCUE', relief: 'FLOOD RELIEF ' + (1 + Math.floor(random() * 9)), fire: 'FIRE & RESCUE', civil: 'CIVIL DEFENCE', volunteer: ['SEVA', 'ASHA', 'JEEVAN', 'SATHI'][Math.floor(random() * 4)], none: '' }[a.markings];
    if (text && a.condition !== 'soft' || (text && a.condition === 'soft')) {
      const ink = a.hull === 'blue' ? '#1f4f9a' : a.hull === 'yellow' ? '#1d1f22' : '#ffffff';
      for (const side of [-1, 1]) {
        if (a.condition === 'soft' && side < 0) continue;
        const width = a.markings === 'volunteer' ? 0.8 : 1.3;
        const label = s.label(text, width, 0.2, [side * (B + T + 0.004), 0.3, -0.45], a.markings === 'volunteer' ? '#fff3b0' : ink, a.markings === 'volunteer' ? '#1f6f5a' : hullTint);
        label.rotation.y = side * Math.PI / 2;
        boat.add(label);
      }
    }
    if (a.condition === 'patched') {
      const tints = ['#3a3d40', '#b8b0a0', '#c94a2a', '#e0a02a', '#6f7a80'];
      for (let i = 0; i < 9; i++) {
        const side = random() < 0.5 ? -1 : 1, z = -1.5 + random() * 2.2, angle = (random() - 0.2) * 1.5;
        const patch = mesh(new THREE.CircleGeometry(0.07 + random() * 0.05, 10), s.material(tints[i % tints.length], { roughness: 0.6, side: THREE.DoubleSide }), [side * (B + Math.cos(angle) * (T + 0.006)), 0.26 + Math.sin(angle) * (T + 0.006), z], [1.3, 1, 1]);
        patch.rotation.set(0, side * Math.PI / 2, 0);
        patch.rotateX(-side * angle * (side > 0 ? 1 : -1));
      }
    }

    // ---- stern gear ----
    if (a.motor !== 'oars') {
      const motor = new THREE.Group();
      const cowl = s.material(a.hull === 'grey' ? '#2a2d2f' : '#22262a', { roughness: 0.35 });
      mesh(sphere, cowl, [0, 0.2, -0.08], [0.16, 0.2, 0.25], motor);
      mesh(cube, s.material('#c9cdd0'), [0, 0.2, -0.08], [0.325, 0.04, 0.4], motor);
      mesh(cube, cowl, [0, -0.25, -0.1], [0.09, 0.7, 0.14], motor);
      mesh(cube, cowl, [0, -0.3, -0.26], [0.02, 0.3, 0.2], motor);
      const gear = mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.34, 10), cowl, [0, -0.6, -0.14], [1, 1, 1], motor);
      gear.rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const blade = mesh(cube, steel, [0, -0.6, -0.33], [0.2, 0.07, 0.012], motor);
        blade.rotation.z = (i / 3) * Math.PI;
      }
      mesh(cube, cowl, [0, -0.72, -0.12], [0.015, 0.16, 0.16], motor);
      rod([0, 0.1, 0.05], [0.12, 0.2, 0.6], 0.02, cowl, motor);
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8), s.material('#17181a'), [0.13, 0.21, 0.66], [1, 1, 1], motor).rotation.x = 1.4;
      mesh(cube, steel, [0, 0.02, 0.03], [0.2, 0.2, 0.1], motor);
      motor.position.set(0, 0.56, -1.7);
      motor.rotation.x = a.motor === 'tilted' ? 1.15 : 0.08;
      add(motor);
      mesh(cube, s.material('#c5271f', { roughness: 0.5 }), [0.3, 0.26, -1.4], [0.24, 0.24, 0.3]);
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8), s.material('#17181a'), [0.3, 0.395, -1.36]);
    } else {
      for (const side of [-1, 1]) {
        mesh(new THREE.TorusGeometry(0.035, 0.01, 5, 10), steel, [side * B, 0.26 + T + 0.03, -0.45]).rotation.y = Math.PI / 2;
        const oar = new THREE.Group();
        rod([0, 0, 0], [0, 0, 1.45], 0.02, wood, oar);
        mesh(cube, s.material(hullTint, { roughness: 0.6 }), [0, 0, 1.68], [0.15, 0.02, 0.5], oar);
        oar.position.set(side * (B - 0.42), 0.42, -0.2);
        oar.rotation.set(-0.16, side * (Math.PI / 2 + 0.75 + random() * 0.25), 0, 'YXZ');
        add(oar);
      }
    }
    // Paddle, throw rope and bag are always aboard.
    const paddle = new THREE.Group();
    rod([0, 0, -0.75], [0, 0, 0.5], 0.018, steel, paddle);
    mesh(cube, s.material('#1d1f22'), [0, 0, 0.72], [0.17, 0.018, 0.44], paddle);
    mesh(cube, s.material('#1d1f22'), [0, 0, -0.78], [0.1, 0.03, 0.035], paddle);
    paddle.position.set(-B + 0.3, 0.2, 0.2);
    paddle.rotation.set(0.05, 0.12 + (random() - 0.5) * 0.2, 0);
    add(paddle);
    const coilAt: V3 = [0.12, 0.15, 0.85];
    for (let i = 0; i < 4; i++) mesh(new THREE.TorusGeometry(0.15 - i * 0.012, 0.018, 6, 18), s.material('#e9d23a', { roughness: 0.9 }), [coilAt[0], coilAt[1] + i * 0.03, coilAt[2]]).rotation.x = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 10), s.material('#c5271f', { roughness: 0.8 }), [-0.2, 0.2, 0.95]).rotation.z = 1.3;
    const ring = mesh(new THREE.TorusGeometry(0.19, 0.055, 8, 20), s.material('#e8451c', { roughness: 0.6 }), [0, 0.45, -1.56]);
    ring.rotation.x = 0.1;
    for (let i = 0; i < 4; i++) { const band = mesh(new THREE.TorusGeometry(0.058, 0.008, 5, 10), s.material('#f3f0e6'), [Math.cos(i * 1.57 + 0.78) * 0.19, 0.45 + Math.sin(i * 1.57 + 0.78) * 0.19, -1.56]); band.rotation.set(Math.PI / 2, 0, i * 1.57 + 0.78, 'ZYX'); }

    // ---- the load ----
    const cargo = new THREE.Group();
    cargo.position.set(0, 0.15, 0);
    add(cargo);
    if (a.load === 'blankets') {
      const tints = ['#8b8f92', '#b33a2e', '#6f7377', '#8a6f4a'];
      for (let stack = 0; stack < 3; stack++) for (let i = 0; i < 2 + Math.floor(random() * 4); i++) {
        const b = mesh(cube, s.material(tints[Math.floor(random() * tints.length)], { roughness: 1 }), [(stack - 1) * 0.02 + (random() - 0.5) * 0.04, 0.045 + i * 0.09, -0.15 + stack * 0.42 - (stack === 0 ? 0.75 : 0)], [0.62, 0.085, 0.36], cargo);
        b.rotation.y = (random() - 0.5) * 0.16;
        mesh(cube, s.material('#e9e2cf'), [b.position.x, b.position.y, b.position.z + 0.181], [0.62, 0.02, 0.004], cargo).rotation.y = b.rotation.y;
      }
      mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.36, 14), s.material('#2f6f9a', { metalness: 0.4, roughness: 0.4 }), [0.32, 0.4, -0.55], [1, 1, 1], cargo);
      mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.07, 12), s.material('#e9e2cf'), [0.32, 0.61, -0.55], [1, 1, 1], cargo);
    } else if (a.load === 'goat') {
      const coat = s.material(['#f1ece0', '#3a2f28', '#b98a5a'][Math.floor(random() * 3)], { roughness: 1 });
      const patchy = s.material('#2e2622', { roughness: 1 });
      const goat = new THREE.Group();
      mesh(sphere, coat, [0, 0.5, 0], [0.17, 0.19, 0.36], goat);
      mesh(sphere, patchy, [0.02, 0.56, -0.12], [0.16, 0.13, 0.16], goat);
      for (const [x, z] of [[-0.1, 0.24], [0.1, 0.24], [-0.1, -0.24], [0.1, -0.24]]) rod([x, 0.42, z], [x * 1.1, 0, z * 1.05], 0.03, coat, goat);
      rod([0, 0.6, 0.3], [0, 0.82, 0.44], 0.075, coat, goat);
      const head = mesh(sphere, coat, [0, 0.86, 0.52], [0.075, 0.085, 0.14], goat);
      head.rotation.x = 0.35;
      for (const side of [-1, 1]) {
        const ear = mesh(sphere, patchy, [side * 0.1, 0.86, 0.44], [0.07, 0.02, 0.04], goat);
        ear.rotation.z = side * -0.5;
        const horn = mesh(new THREE.ConeGeometry(0.02, 0.14, 6), s.material('#5a5148'), [side * 0.04, 0.98, 0.43], [1, 1, 1], goat);
        horn.rotation.x = -0.5;
      }
      mesh(new THREE.ConeGeometry(0.025, 0.1, 5), coat, [0, 0.74, 0.6], [1, 1, 1], goat).rotation.x = Math.PI;
      mesh(sphere, coat, [0, 0.62, -0.36], [0.03, 0.03, 0.06], goat);
      mesh(new THREE.TorusGeometry(0.08, 0.012, 5, 12), s.material('#d9a13a'), [0, 0.72, 0.38], [1, 1, 1], goat).rotation.x = 0.9;
      goat.rotation.y = 0.5 + (random() - 0.5) * 1.6;
      goat.position.z = -0.1;
      goat.scale.setScalar(1.05);
      cargo.add(goat);
    } else if (a.load === 'supplies') {
      const card = s.material('#b8905a', { roughness: 0.95 });
      const spots: V3[] = [[-0.2, 0.15, -0.9], [0.22, 0.15, -0.85], [-0.02, 0.44, -0.88], [-0.22, 0.15, -0.2], [0.2, 0.15, 0.3]];
      spots.forEach(([x, y, z], i) => {
        const c = mesh(cube, card, [x, y, z], [0.4, 0.3, 0.36], cargo);
        c.rotation.y = (random() - 0.5) * 0.3;
        mesh(cube, s.material('#e9e2cf'), [x, y + 0.151, z], [0.06, 0.004, 0.36], cargo).rotation.y = c.rotation.y;
        if (i === 2) { const tag = s.label('RELIEF', 0.3, 0.12, [x, y, z + 0.185], '#a5271f', '#e9e2cf'); tag.rotation.y = c.rotation.y; cargo.add(tag); }
      });
      for (let i = 0; i < 3; i++) {
        mesh(cube, s.material('#2f6fc0', { roughness: 0.5 }), [0.22 - i * 0.02, 0.19, -0.3 + i * 0.01 - (i === 2 ? 0.0 : 0) + (i - 1) * 0.0, ], [0.17, 0.38, 0.26], cargo).position.z = -0.42 + i * 0.3 - (i === 2 ? -0.5 : 0);
      }
      for (let i = 0; i < 3; i++) mesh(sphere, s.material('#e6e1d0', { roughness: 1 }), [-0.2 + (i % 2) * 0.06, 0.1 + i * 0.13, 0.42], [0.26, 0.09, 0.19], cargo).rotation.y = i * 0.4;
    } else if (a.load === 'belongings') {
      mesh(cube, s.material(mood.cheer > 0.5 ? '#3f8a7a' : '#5a6a72', { metalness: 0.4, roughness: 0.5 }), [0, 0.19, -0.75], [0.7, 0.38, 0.42], cargo);
      for (const x of [-0.2, 0.2]) mesh(cube, s.material('#c9a23a', { metalness: 0.6 }), [x, 0.3, -0.535], [0.06, 0.08, 0.012], cargo);
      const bundle = ['#d96a8a', '#e0b23a', '#7fa6c9', '#d9cfb2', '#8fbf6a'];
      for (let i = 0; i < 4; i++) {
        mesh(sphere, s.material(bundle[Math.floor(random() * bundle.length)], { roughness: 1 }), [(i % 2 ? 0.2 : -0.2) + (random() - 0.5) * 0.08, 0.17 + (i > 1 ? 0.2 : 0), -0.1 + (i % 2) * 0.1 + (i > 1 ? 0.05 : 0)], [0.22, 0.18, 0.22], cargo);
      }
      const mat = mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 12), s.material('#c9a86a', { roughness: 1 }), [-0.36, 0.3, -0.3], [1, 1, 1], cargo);
      mat.rotation.set(Math.PI / 2 - 0.25, 0, 0);
      const cage = new THREE.Group();
      const wire = s.material('#d8c98a', { metalness: 0.6, roughness: 0.4 });
      for (let i = 0; i < 10; i++) rod([Math.cos(i * 0.628) * 0.13, 0, Math.sin(i * 0.628) * 0.13], [Math.cos(i * 0.628) * 0.03, 0.34, Math.sin(i * 0.628) * 0.03], 0.005, wire, cage);
      mesh(new THREE.TorusGeometry(0.13, 0.008, 5, 16), wire, [0, 0, 0], [1, 1, 1], cage).rotation.x = Math.PI / 2;
      mesh(new THREE.TorusGeometry(0.11, 0.006, 5, 16), wire, [0, 0.12, 0], [1, 1, 1], cage).rotation.x = Math.PI / 2;
      mesh(sphere, s.material('#5fb04a'), [0, 0.1, 0], [0.04, 0.05, 0.06], cage);
      cage.position.set(0.15, 0.02, 0.45);
      cargo.add(cage);
    } else if (a.load === 'people') {
      const person = (vest: boolean) => {
        const p = new THREE.Group();
        const skin = s.material(['#8a5a3c', '#6f472f', '#a8714a'][Math.floor(random() * 3)], { roughness: 0.8 });
        const cloth = s.material(vest ? '#2f3f5a' : mood.cheer > 0.5 ? '#c9508a' : '#8b8f92', { roughness: 0.95 });
        if (vest) {
          for (const side of [-1, 1]) rod([side * 0.09, 0, 0], [side * 0.08, 0.8, 0], 0.065, cloth, p);
          mesh(sphere, s.material('#ee5a1c', { roughness: 0.7 }), [0, 1.08, 0], [0.2, 0.27, 0.15], p);
          mesh(cube, s.material('#e9e9d8', { emissive: '#e9e9d8', emissiveIntensity: 0.2 }), [0, 1.1, 0], [0.41, 0.035, 0.31], p);
          mesh(sphere, skin, [0, 1.45, 0.01], [0.1, 0.115, 0.105], p);
          mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), s.material('#e9d23a', { roughness: 0.4 }), [0, 1.47, 0], [0.12, 0.11, 0.125], p);
          for (const side of [-1, 1]) rod([side * 0.21, 1.25, 0], [side * 0.26, 0.85, 0.16], 0.045, cloth, p);
          rod([0.27, 0.05, 0.2], [0.27, 2.0, 0.12], 0.02, wood, p);
        } else {
          mesh(sphere, cloth, [0, 0.36, 0], [0.26, 0.38, 0.26], p);
          mesh(sphere, cloth, [0, 0.72, 0.02], [0.14, 0.14, 0.14], p);
          mesh(sphere, skin, [0, 0.7, 0.07], [0.09, 0.1, 0.085], p);
        }
        return p;
      };
      const crew = person(true);
      crew.position.set(-0.1, 0, -1.05);
      crew.rotation.y = 0.2;
      const passenger = person(false);
      passenger.position.set(0.08, 0.2, -0.5);
      passenger.rotation.y = 0.3 + random() * 0.5;
      cargo.add(crew, passenger);
      if (random() < 0.6) { const child = person(false); child.scale.setScalar(0.7); child.position.set(-0.22, 0.2, -0.42); cargo.add(child); }
    }

    // ---- signals ----
    if (a.signal === 'flag') {
      rod([-0.36, 0.3, -1.6], [-0.36, 1.65, -1.6], 0.014, steel);
      const cloth = mesh(new THREE.PlaneGeometry(0.5, 0.32, 6, 1), s.material('#d8261c', { side: THREE.DoubleSide, roughness: 0.8 }), [-0.36, 1.48, -1.86]);
      const pos = cloth.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 9) * 0.035);
      cloth.geometry.computeVertexNormals();
      cloth.rotation.y = Math.PI / 2;
    } else if (a.signal === 'beacon' || a.signal === 'lantern') {
      const lamp = a.signal === 'beacon';
      rod([-0.36, 0.3, -1.6], [-0.36, lamp ? 1.25 : 1.5, -1.6], 0.014, steel);
      const glowTint = lamp ? '#ffa21f' : '#ffd27a';
      const light = s.material(glowTint, { emissive: glowTint, emissiveIntensity: mix(1.2, 2.6, mood.energy), roughness: 0.3 });
      if (lamp) mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.11, 12), light, [-0.36, 1.3, -1.6]);
      else {
        rod([-0.36, 1.48, -1.6], [-0.36, 1.48, -1.38], 0.01, steel);
        mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.14, 10), light, [-0.36, 1.33, -1.38]);
        mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 10), trim, [-0.36, 1.24, -1.38]);
        mesh(new THREE.ConeGeometry(0.07, 0.06, 10), trim, [-0.36, 1.43, -1.38]);
      }
      const halo = mesh(sphere, new THREE.MeshBasicMaterial({ color: glowTint, transparent: true, opacity: 0.16, depthWrite: false }), [-0.36, lamp ? 1.3 : 1.33, lamp ? -1.6 : -1.38], [0.24, 0.24, 0.24]);
      halo.castShadow = false;
      boat.userData.light = light;
    } else if (a.signal === 'hailer') {
      const horn = mesh(new THREE.CylinderGeometry(0.13, 0.03, 0.3, 14, 1, true), s.material('#f1f1ec', { side: THREE.DoubleSide, roughness: 0.4 }), [0.1, 0.62, 1.2]);
      horn.rotation.set(Math.PI / 2 - 0.25, 0.5, 0);
      mesh(cube, s.material('#c5271f'), [0.03, 0.56, 1.02], [0.07, 0.14, 0.08]);
    }

    // ---- afloat ----
    const level = 0.3;
    const stepsHere = a.mooring === 'steps';
    const f = flood(s, 1.65, stepsHere ? 3.0 : 2.7, level);
    if (a.condition === 'soft') boat.rotation.z = 0.09;
    boat.rotation.y = (random() - 0.5) * 0.2 + (a.mooring === 'drifting' ? 0.35 : 0);
    if (a.motor === 'running' || a.mooring === 'underway') boat.rotation.x = -0.035;
    f.float(boat, 0.13);
    f.ripple(0, 0, B + T + 0.12, 1, (1.95 + 0.1) / (B + T + 0.12));
    if (a.mooring !== 'drifting') f.ripple(0, 0, B + T + 0.34, 1, (1.95 + 0.32) / (B + T + 0.34));
    const water = floodColour(s);
    const foam = new THREE.MeshStandardMaterial({ color: water.clone().lerp(new THREE.Color('#f3efe2'), 0.75), roughness: 0.4 });
    if (a.motor === 'running') {
      for (let i = 0; i < 9; i++) {
        const blob = s.mesh(new THREE.CircleGeometry(0.1 + random() * 0.12, 10), foam, [(random() - 0.5) * 0.7, level + 0.007, -2.1 - random() * 0.55]);
        blob.rotation.x = -Math.PI / 2;
      }
    }
    if (a.mooring === 'underway') {
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
        const streak = s.mesh(new THREE.CircleGeometry(1, 10), foam, [side * (0.5 + i * 0.3), level + 0.007, 1.5 - i * 0.6]);
        streak.rotation.set(-Math.PI / 2, 0, side * 1.15);
        streak.scale.set(0.45, 0.03, 1);
      }
    }
    if (a.mooring === 'moored') {
      const px = 0.5 + random() * 0.25, pz = 2.3;
      s.rod([px, 0, pz], [px + 0.12, 1.9, pz - 0.08], 0.035, s.material('#b89a4f', { roughness: 0.8 }), 0.028);
      for (const y of [0.7, 1.25]) s.ring(0.036, 0.008, [px + y * 0.063, y, pz - y * 0.04], s.material('#6f5a2c')).rotation.x = Math.PI / 2;
      s.tube([[0, boat.position.y + 0.42, 1.88], [px * 0.45, level + 0.1, 2.15], [px + 0.04, 0.68, pz - 0.03]], 0.014, rope);
      const rag = s.box([0.012, 0.22, 0.16], [px + 0.12, 1.75, pz - 0.16], s.material('#d8261c', { roughness: 0.9 }));
      rag.rotation.x = 0.2;
      f.ripple(px, pz, 0.09, 2);
    } else if (a.mooring === 'drifting') {
      s.tube([[0, boat.position.y + 0.42, 1.88], [0.3, level + 0.02, 2.05], [0.75, level + 0.006, 2.2], [1.0, level + 0.006, 1.85], [1.25, level + 0.006, 2.1]], 0.014, rope);
    } else if (stepsHere) {
      const stone = s.material('#a9a394', { roughness: 0.95 });
      for (let i = 0; i < 3; i++) s.box([1.9, 0.22, 0.32], [0, level - 0.1 + i * 0.22, 2.2 + i * 0.26], stone);
      s.box([2.1, level + 0.62, 0.3], [0, (level + 0.62) / 2, 2.98], stone);
      for (const x of [-0.95, 0.95]) s.box([0.2, level + 0.95, 1.05], [x * 1.05, (level + 0.95) / 2, 2.6], s.material('#c9bfa6', { roughness: 0.95 }));
      s.tube([[0, boat.position.y + 0.42, 1.88], [0.2, level + 0.3, 2.3], [0.5, level + 0.5, 2.7], [0.62, level + 0.7, 2.95]], 0.014, rope);
      s.cylinder(0.035, 0.045, 0.34, [0.62, level + 0.78, 2.98], steel, 8);
    }

    const bob = { base: boat.position.y, roll: boat.rotation.z };
    const energy = mix(0.2, 1, mood.energy);
    return s.finish({
      footprint: 2.2,
      update: (dt, time) => {
        f.update(dt, time);
        boat.position.y = bob.base + Math.sin(time * 1.2) * 0.015 * energy;
        boat.rotation.z = bob.roll + Math.sin(time * 0.9) * 0.02 * energy;
        const light = boat.userData.light as THREE.MeshStandardMaterial | undefined;
        if (light && a.signal === 'beacon') light.emissiveIntensity = Math.sin(time * 6) > 0 ? 2.6 : 0.3;
      },
    });
  },
});
