import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const COLOURS = {
  blue: 'Municipal blue with grey tanks.',
  yellow: 'Safety yellow with black trim.',
  orange: 'Grey body with orange panels, a contract-cleaning fleet.',
  green: 'Hospital green.',
  red: 'Bright red, a supermarket machine.',
  white: 'Clinical white with a teal stripe.',
} as const;
const PAINT: Record<keyof typeof COLOURS, [string, string]> = {
  blue: ['#2a62b8', '#8f979e'], yellow: ['#f0bb1c', '#26282b'], orange: ['#8d9499', '#e96d1c'], green: ['#3f9a6b', '#cfd6d2'], red: ['#cf2f2a', '#3a3d41'], white: ['#e9ecea', '#1f9a96'],
};

export default defineThing({
  questions: {
    colour: choice('What colour is the machine?', COLOURS),
    rider: choice('Who is on it?', {
      operator: 'A night cleaner in a hi-vis vest, hunched at the wheel.',
      empty: 'Nobody: parked mid-floor with the key still in.',
      vest: 'Nobody, but a hi-vis vest is draped over the seat and a thermos stands on the footwell.',
      headphones: 'A cleaner in big headphones and a hooded top, somewhere else entirely.',
    }),
    stripe: choice('What trail does it leave behind?', {
      straight: 'A long straight wet stripe, shining.',
      curve: 'A wet stripe swinging round in a slow curve.',
      suds: 'A foamy stripe with clumps of suds left along its edges.',
      dry: 'No trail: the tank is empty or it has not started.',
      missed: 'A wet stripe that swerves around something that is no longer there.',
    }),
    beacon: noul('Is the amber beacon lit?'),
    sign: choice('What has been set out beside it?', {
      none: 'Nothing.',
      wetfloor: 'A yellow folding CAUTION WET FLOOR sign.',
      cones: 'Two small orange cones.',
      bucket: 'A mop bucket with a wringer and a mop standing in it.',
    }),
    cargo: choice('What is strapped to the back of the machine?', {
      nothing: 'Nothing.',
      bottles: 'A caddy of blue and pink chemical bottles.',
      broom: 'A broom and a long-handled dustpan in a clip.',
      binbag: 'A bulging bin bag tied to the rail.',
      radio: 'A small radio hung from the rail, playing to an empty hall.',
    }),
    size: choice('How big a machine is it?', {
      compact: 'A compact one that fits down shop aisles.',
      large: 'A big wide industrial one with twin brush decks.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [main, trim] = PAINT[a.colour];
    const big = a.size === 'large';
    const W = big ? 0.98 : 0.74, L = big ? 1.75 : 1.45;
    const body = s.material(main, { roughness: 0.42 });
    const accent = s.material(trim, { roughness: 0.5 });
    const dark = s.material('#1c1e20', { roughness: 0.8 });
    const steel = s.material('#a7adb1', { metalness: 0.85, roughness: 0.3 });
    const rb = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 4, r);
    const back = -L / 2, front = L / 2;

    // Rear tank that the driver sits against, and the lower chassis.
    s.mesh(rb(W, 0.62, L * 0.44, 0.1), body, [0, 0.62, back + L * 0.22]);
    s.mesh(rb(W * 0.96, 0.3, L * 0.9, 0.06), accent, [0, 0.29, 0]);
    s.mesh(rb(W * 0.7, 0.07, L * 0.3, 0.03), dark, [0, 0.95, back + L * 0.2]);
    s.cylinder(0.07, 0.07, 0.03, [W * 0.2, 0.99, back + L * 0.14], steel, 16);
    s.box([W * 0.5, 0.012, 0.012], [0, 0.6, back - 0.003], dark);
    // Footwell and front cowl with the steering column.
    s.box([W * 0.9, 0.04, L * 0.3], [0, 0.42, front - L * 0.36], dark);
    s.mesh(rb(W * 0.9, 0.52, L * 0.2, 0.09), body, [0, 0.62, front - L * 0.13]);
    s.mesh(rb(W * 0.5, 0.1, 0.06, 0.02), dark, [0, 0.8, front - L * 0.235]);
    const col: [number, number, number] = [0, 0.86, front - L * 0.2];
    const hub: [number, number, number] = [0, 1.06, front - L * 0.3];
    s.rod(col, hub, 0.022, dark);
    const wheel = s.ring(0.15, 0.016, hub, dark);
    wheel.rotation.x = Math.PI / 2 - 0.5;
    for (const turn of [0, 2.1, 4.2]) { const spoke = s.box([0.28, 0.012, 0.018], hub, dark); spoke.rotation.set(-0.5, 0, 0); spoke.rotateY(turn); }
    // Console: a couple of lit buttons and a key.
    const lamp = (x: number, colour: string, onNow: boolean) => s.cylinder(0.014, 0.014, 0.012, [x, 0.89, front - L * 0.16], new THREE.MeshStandardMaterial({ color: colour, emissive: onNow ? colour : '#000000', emissiveIntensity: 1 }), 10);
    lamp(-0.14, '#39d06a', a.stripe !== 'dry'); lamp(-0.09, '#ff5a36', a.stripe === 'dry'); lamp(0.12, '#f0b020', true);
    // Headlight bar.
    const head = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#fff0c0', emissiveIntensity: mix(0.5, 1.1, 1 - mood.daylight * 0.5), roughness: 0.3 });
    for (const x of [-W * 0.28, W * 0.28]) s.mesh(rb(0.12, 0.05, 0.03, 0.012), head, [x, 0.66, front - L * 0.03 + 0.005]).castShadow = false;
    s.label(['ECO 70', 'SCRUBMASTER', 'T-16', 'NIGHTLINE', 'CLEAN CO'][Math.floor(random() * 5)], W * 0.5, 0.07, [0, 0.52, front - L * 0.03 + 0.004], '#ffffff', trim);

    // Seat.
    const seatZ = back + L * 0.47;
    s.mesh(rb(0.42, 0.09, 0.4, 0.035), dark, [0, 0.78, seatZ]);
    const rest = s.mesh(rb(0.4, 0.36, 0.08, 0.035), dark, [0, 1.04, seatZ - 0.2]);
    rest.rotation.x = -0.12;
    s.box([0.3, 0.3, 0.3], [0, 0.6, seatZ], accent);

    // Wheels: one steered at the front, two at the back.
    const tyre = (x: number, z: number, r: number, w: number) => { const t = s.cylinder(r, r, w, [x, r, z], dark, 20); t.rotation.z = Math.PI / 2; const cap = s.cylinder(r * 0.5, r * 0.5, w + 0.01, [x, r, z], steel, 12); cap.rotation.z = Math.PI / 2; };
    tyre(0, front - L * 0.22, 0.15, 0.1);
    for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) tyre(x, back + L * 0.2, 0.17, 0.09);

    // Brush deck under the front, with its skirt and spinning brushes.
    const brushes: THREE.Object3D[] = [];
    const deckZ = front - L * 0.02;
    const discs = big ? [-0.25, 0.25] : [0];
    s.mesh(rb(big ? 1.08 : 0.72, 0.1, 0.56, 0.045), accent, [0, 0.14, deckZ]);
    s.mesh(rb(big ? 1.12 : 0.76, 0.05, 0.6, 0.02), dark, [0, 0.06, deckZ]);
    const bristle = s.material(a.colour === 'red' ? '#2c5ab8' : '#c7382c', { roughness: 1 });
    for (const x of discs) {
      const brush = new THREE.Group();
      brush.position.set(x, 0.035, deckZ + 0.05);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.05, 24), bristle);
      pad.castShadow = true;
      brush.add(pad);
      for (let k = 0; k < 6; k++) { const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.052, 0.2), dark); tuft.position.set(Math.sin(k * 1.047) * 0.15, 0, Math.cos(k * 1.047) * 0.15); tuft.rotation.y = k * 1.047; brush.add(tuft); }
      s.root.add(brush);
      brushes.push(brush);
      s.cylinder(0.08, 0.1, 0.1, [x, 0.22, deckZ + 0.05], dark, 14);
    }
    s.rod([-W * 0.3, 0.3, front - L * 0.15], [-W * 0.3, 0.18, deckZ - 0.1], 0.02, steel);
    s.rod([W * 0.3, 0.3, front - L * 0.15], [W * 0.3, 0.18, deckZ - 0.1], 0.02, steel);
    // Bumper roller at one corner.
    s.cylinder(0.05, 0.05, 0.05, [(big ? 0.56 : 0.38), 0.14, deckZ + 0.22], s.material('#e6e6e0'), 14);

    // Curved squeegee trailing at the back, and the fat suction hose up to the tank.
    const sq = s.mesh(new THREE.TorusGeometry(W * 0.62, 0.028, 8, 28, Math.PI * 0.9), dark, [0, 0.035, back + W * 0.5]);
    sq.rotation.x = Math.PI / 2; sq.rotation.z = Math.PI * 0.05;
    const sq2 = s.mesh(new THREE.TorusGeometry(W * 0.62, 0.02, 8, 28, Math.PI * 0.9), steel, [0, 0.085, back + W * 0.5]);
    sq2.rotation.x = Math.PI / 2; sq2.rotation.z = Math.PI * 0.05;
    for (const x of [-W * 0.55, W * 0.55]) s.cylinder(0.035, 0.035, 0.03, [x, 0.035, back + W * 0.32], s.material('#e6e6e0'), 12).rotation.z = Math.PI / 2;
    s.tube([[0, 0.1, back - W * 0.1], [0.05, 0.3, back - 0.14], [0.2, 0.62, back - 0.1], [W * 0.3, 0.86, back + 0.04], [W * 0.2, 0.96, back + L * 0.12]], 0.035, s.material('#2d2f33', { roughness: 0.6 }));

    // Beacon on a mast behind the seat.
    const mastX = -W * 0.36, mastZ = back + 0.1;
    s.rod([mastX, 0.9, mastZ], [mastX, 1.56, mastZ], 0.014, steel);
    s.cylinder(0.05, 0.055, 0.03, [mastX, 1.57, mastZ], dark, 14);
    const amber = new THREE.MeshStandardMaterial({ color: a.beacon ? '#ffb020' : '#8a5a1a', emissive: '#ff9a10', emissiveIntensity: a.beacon ? 1.4 : 0.02, roughness: 0.25 });
    s.cylinder(0.04, 0.045, 0.08, [mastX, 1.625, mastZ], amber, 14).castShadow = false;
    const halo = s.ball([0.16, 0.16, 0.16], [mastX, 1.625, mastZ], new THREE.MeshBasicMaterial({ color: '#ffb020', transparent: true, opacity: a.beacon ? 0.22 : 0, depthWrite: false }), 14);
    halo.castShadow = halo.receiveShadow = false;
    const sweep = new THREE.Group();
    sweep.position.set(mastX, 1.625, mastZ);
    s.root.add(sweep);
    if (a.beacon) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.035), new THREE.MeshBasicMaterial({ color: '#ffd070', transparent: true, opacity: 0.5, depthWrite: false })); sweep.add(bar); }

    // Rider.
    const vestMat = s.material('#d9f02c', { roughness: 0.8, emissive: '#6a7a00', emissiveIntensity: 0.35 });
    const band = s.material('#d6dadc', { metalness: 0.6, roughness: 0.3 });
    if (a.rider === 'operator' || a.rider === 'headphones') {
      const hood = a.rider === 'headphones';
      const cloth = s.material(hood ? '#3a3f4c' : '#2f4a6a', { roughness: 0.95 });
      const skin = s.material(['#8d5a3c', '#c99873', '#6b4630', '#e0b592'][Math.floor(random() * 4)], { roughness: 0.8 });
      const slump = mix(0.32, 0.1, mood.energy);
      const torso = s.mesh(rb(0.36, 0.5, 0.24, 0.09), hood ? cloth : vestMat, [0, 1.1, seatZ - 0.04 + slump * 0.2]);
      torso.rotation.x = slump;
      if (!hood) for (const y of [-0.08, 0.06]) { const stripeBand = s.box([0.37, 0.035, 0.25], [0, 1.1 + y, seatZ - 0.04 + slump * 0.2 + y * slump], band); stripeBand.rotation.x = slump; }
      const headAt: [number, number, number] = [0, 1.46, seatZ + 0.06 + slump * 0.3];
      s.ball([0.1, 0.115, 0.11], headAt, skin, 16);
      if (hood) {
        s.ball([0.118, 0.125, 0.12], [headAt[0], headAt[1] + 0.015, headAt[2] - 0.03], cloth, 16);
        const arc = s.ring(0.12, 0.012, [headAt[0], headAt[1] + 0.01, headAt[2] - 0.01], dark, Math.PI);
        arc.rotation.y = 0;
        for (const x of [-0.115, 0.115]) s.cylinder(0.045, 0.045, 0.035, [x, headAt[1], headAt[2] - 0.01], s.material('#d13a2e'), 14).rotation.z = Math.PI / 2;
      } else s.ball([0.105, 0.06, 0.115], [headAt[0], headAt[1] + 0.075, headAt[2] - 0.005], s.material('#22262c', { roughness: 0.9 }), 14);
      for (const x of [-0.11, 0.11]) {
        s.rod([x, 0.86, seatZ + 0.05], [x, 0.84, seatZ + 0.42], 0.065, s.material('#2a2e36', { roughness: 0.9 }));
        s.rod([x, 0.84, seatZ + 0.42], [x, 0.5, seatZ + 0.5], 0.055, s.material('#2a2e36', { roughness: 0.9 }));
        s.mesh(rb(0.1, 0.07, 0.22, 0.03), dark, [x, 0.47, seatZ + 0.56]);
        const shoulder: [number, number, number] = [x * 1.7, 1.28, seatZ + slump * 0.25];
        const elbow: [number, number, number] = [x * 2, 1.06, seatZ + 0.22];
        const hand: [number, number, number] = [x * 1.25, hub[1] + 0.02, hub[2] - 0.05];
        s.rod(shoulder, elbow, 0.05, cloth); s.rod(elbow, hand, 0.045, cloth);
        s.ball([0.045, 0.045, 0.045], hand, skin, 10);
      }
    } else if (a.rider === 'vest') {
      const drape = s.mesh(rb(0.4, 0.34, 0.07, 0.03), vestMat, [0.02, 1.08, seatZ - 0.15]);
      drape.rotation.x = -0.12; drape.rotation.z = 0.06;
      s.box([0.41, 0.035, 0.075], [0.02, 1.04, seatZ - 0.145], band).rotation.set(-0.12, 0, 0.06);
      s.mesh(rb(0.36, 0.05, 0.3, 0.02), vestMat, [0.03, 0.845, seatZ + 0.02]);
      s.cylinder(0.04, 0.04, 0.24, [W * 0.25, 0.56, front - L * 0.4], s.material('#3c6e58', { metalness: 0.5, roughness: 0.4 }), 14);
      s.cylinder(0.03, 0.04, 0.05, [W * 0.25, 0.7, front - L * 0.4], steel, 14);
    }
    if (a.rider !== 'operator' && a.rider !== 'headphones') {
      // The key and its fob.
      s.box([0.012, 0.03, 0.012], [0.19, 0.9, front - L * 0.16], steel);
      s.box([0.03, 0.05, 0.004], [0.19, 0.86, front - L * 0.15], s.material('#e0372c'));
    }

    // Cargo on the back rail.
    s.rod([-W * 0.4, 0.94, back + 0.03], [W * 0.4, 0.94, back + 0.03], 0.012, steel);
    for (const x of [-W * 0.4, W * 0.4]) s.rod([x, 0.8, back + 0.06], [x, 0.94, back + 0.03], 0.012, steel);
    if (a.cargo === 'bottles') {
      s.box([0.42, 0.14, 0.14], [W * 0.1, 0.84, back - 0.06], dark);
      ['#2f8fe0', '#e86aa8', '#f0d03a', '#2f8fe0'].forEach((colour, i) => {
        const x = W * 0.1 - 0.15 + i * 0.1;
        s.cylinder(0.04, 0.04, 0.2, [x, 0.98, back - 0.06], s.material(colour, { roughness: 0.3 }), 12);
        s.cylinder(0.014, 0.02, 0.06, [x, 1.11, back - 0.06], s.material('#f1f1ee'), 8);
        s.box([0.02, 0.02, 0.07], [x, 1.14, back - 0.085], s.material('#f1f1ee'));
      });
    } else if (a.cargo === 'broom') {
      s.rod([W * 0.3, 0.3, back - 0.06], [W * 0.3 + 0.05, 1.75, back - 0.02], 0.014, s.material('#c9a45c'));
      s.box([0.3, 0.1, 0.05], [W * 0.3, 0.27, back - 0.07], s.material('#3a66b0', { roughness: 1 }));
      s.rod([W * 0.05, 0.4, back - 0.06], [W * 0.05, 1.4, back - 0.03], 0.01, steel);
      s.box([0.24, 0.2, 0.1], [W * 0.05, 0.32, back - 0.08], dark);
    } else if (a.cargo === 'binbag') {
      const bag = s.material('#22252a', { roughness: 0.35 });
      s.ball([0.24, 0.3, 0.2], [0.05, 0.68, back - 0.17], bag, 14);
      s.ball([0.15, 0.16, 0.14], [0.14, 0.52, back - 0.2], bag, 12);
      s.cylinder(0.02, 0.06, 0.12, [0.03, 0.98, back - 0.1], bag, 10);
    } else if (a.cargo === 'radio') {
      s.mesh(rb(0.26, 0.15, 0.08, 0.02), s.material('#b8bcbe', { metalness: 0.4 }), [0.08, 0.83, back - 0.05]);
      s.cylinder(0.045, 0.045, 0.01, [0.02, 0.83, back - 0.092], dark, 16).rotation.x = Math.PI / 2;
      s.rod([0.19, 0.9, back - 0.05], [0.3, 1.2, back - 0.05], 0.004, steel);
      s.tube([[-0.02, 0.9, back - 0.05], [0.08, 0.97, back - 0.02], [0.18, 0.9, back - 0.05]], 0.006, dark);
    }

    // The wet stripe: see-through, so it does not count as part of the machine's footprint.
    const wet = new THREE.MeshStandardMaterial({ color: '#dff2ff', transparent: true, opacity: 0.42, roughness: 0.02, metalness: 0.6, depthWrite: false });
    if (a.stripe !== 'dry') {
      const width = W * 1.12, reach = big ? 3.4 : 2.8, steps = 26;
      const bend = a.stripe === 'curve' ? (random() < 0.5 ? 1 : -1) * 0.5 : 0;
      const positions: number[] = [], index: number[] = [];
      const edge: [number, number][] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, d = t * reach;
        const side = bend * d * d * 0.22 + (a.stripe === 'missed' ? Math.exp(-((t - 0.55) ** 2) / 0.02) * 0.75 : 0);
        const z = back + 0.05 - d * Math.cos(bend * t * 0.9);
        const half = width / 2 * mix(1, 0.86, t);
        positions.push(side - half, 0.004, z, side + half, 0.004, z);
        edge.push([side - half, z], [side + half, z]);
        if (i < steps) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const stripe = s.mesh(geometry, wet);
      stripe.castShadow = false;
      if (a.stripe === 'suds') {
        const foam = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, transparent: true, opacity: 0.85, depthWrite: false });
        const blobs = edge.filter(() => random() < 0.5).flatMap(([x, z]) => Array.from({ length: 2 }, () => ({ at: [x + (random() - 0.5) * 0.12, 0.012, z + (random() - 0.5) * 0.1] as [number, number, number], size: 0.02 + random() * 0.035 })));
        s.scatter(new THREE.SphereGeometry(1, 8, 6), foam, blobs).castShadow = false;
      }
    }

    // Set out beside it.
    const side = random() < 0.5 ? 1 : -1;
    if (a.sign === 'wetfloor') {
      const yellow = s.material('#f5cf1c', { roughness: 0.5, side: THREE.DoubleSide });
      const sx = side * (W / 2 + 0.45), sz = back + 0.3 + random() * 0.4;
      for (const dir of [1, -1]) {
        const leaf = s.box([0.3, 0.64, 0.012], [sx, 0.3, sz + dir * 0.09], yellow);
        leaf.rotation.x = dir * -0.28;
        const text = s.label('CAUTION', 0.24, 0.07, [sx, 0.46, sz + dir * 0.058], '#141414', '#f5cf1c');
        text.rotation.x = dir * -0.28; text.rotation.y = dir === 1 ? 0 : Math.PI;
        const tri = s.label('WET FLOOR', 0.24, 0.06, [sx, 0.24, sz + dir * 0.118], '#c22a1c', '#f5cf1c');
        tri.rotation.x = dir * -0.28; tri.rotation.y = dir === 1 ? 0 : Math.PI;
      }
    } else if (a.sign === 'cones') {
      const hazard = s.material('#ef6a1c', { roughness: 0.6 });
      for (const k of [0, 1]) {
        const cx = side * (W / 2 + 0.3 + k * 0.1), cz = back + 0.1 + k * 0.8 + random() * 0.2;
        s.box([0.2, 0.02, 0.2], [cx, 0.01, cz], hazard);
        s.cylinder(0.02, 0.08, 0.32, [cx, 0.18, cz], hazard, 14);
        s.cylinder(0.042, 0.056, 0.06, [cx, 0.22, cz], s.material('#f4f4f0'), 14);
      }
    } else if (a.sign === 'bucket') {
      const bx = side * (W / 2 + 0.42), bz = back + 0.5;
      s.mesh(rb(0.36, 0.3, 0.5, 0.05), s.material('#f0c21c', { roughness: 0.5 }), [bx, 0.2, bz]);
      s.box([0.3, 0.02, 0.44], [bx, 0.345, bz], s.material('#6b7f8a', { roughness: 0.1, metalness: 0.4 }));
      s.box([0.3, 0.22, 0.18], [bx, 0.42, bz + 0.14], s.material('#2f62b0'));
      s.rod([bx, 0.5, bz + 0.2], [bx + side * 0.18, 0.72, bz + 0.2], 0.012, steel);
      s.rod([bx, 0.32, bz - 0.1], [bx - side * 0.1, 1.5, bz - 0.25], 0.013, s.material('#c9a45c'));
      s.ball([0.09, 0.08, 0.09], [bx, 0.38, bz - 0.1], s.material('#e9e4d4', { roughness: 1 }), 10);
      for (const [x, z] of [[-0.14, -0.2], [0.14, -0.2], [-0.14, 0.2], [0.14, 0.2]]) s.cylinder(0.03, 0.03, 0.03, [bx + x, 0.03, bz + z], dark, 10).rotation.z = Math.PI / 2;
    }
    // Grime along the skirt on a machine that has seen years of floors.
    for (let k = 0; k < Math.round(mood.wear * 8); k++) s.box([0.05 + random() * 0.2, 0.012, 0.004], [(random() - 0.5) * W * 0.8, 0.2 + random() * 0.2, back - 0.004 - 0 * k], s.material('#4a463e', { roughness: 1 })).rotation.z = (random() - 0.5) * 0.4;

    const spin = a.stripe === 'dry' ? 0 : mix(3, 14, mood.energy);
    const turn = mix(2.5, 7, mood.energy);
    return s.finish({
      update: (dt, time) => {
        for (const [i, brush] of brushes.entries()) brush.rotation.y += dt * spin * (i % 2 ? -1 : 1);
        if (a.beacon) { sweep.rotation.y = time * turn; amber.emissiveIntensity = 1 + Math.sin(time * turn) * 0.6; }
      },
    });
  },
});
