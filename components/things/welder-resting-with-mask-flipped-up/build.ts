import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { type Build, type P, RAD, arm, boots, leg, look, paint, pick, pickSkin, worldOf } from './site';

export default defineThing({
  questions: {
    helmet: choice('What is on his head?', {
      flip: 'A plain black flip-front welding mask, flipped up.',
      auto: 'An auto-darkening helmet with a flame decal, pushed up on the head.',
      leather: 'An old leather welding hood shoved back off the face.',
      goggles: 'Only cutting goggles pushed up onto the forehead.',
    }),
    drink: choice('What is he drinking?', {
      water: 'A plastic water bottle, half empty.',
      can: 'A cold can of something.',
      thermos: 'Coffee from a thermos cup.',
      nothing: 'Nothing: both hands hang between his knees.',
    }),
    jacket: choice('What is he wearing?', {
      open: 'A spatter-spotted leather welding jacket, open over a dark t-shirt.',
      zipped: 'The leather jacket zipped to the throat.',
      sleeves: 'A dark t-shirt with leather sleeves and a bib apron.',
      tee: 'Just a grey t-shirt, the jacket thrown over the machine.',
    }),
    glow: noul('Does a fresh weld still glow dull red on the steel beside him?'),
    state: choice('What just happened?', {
      finished: 'Just finished a pass: the electrode stub still smoking in the holder on the ground.',
      ready: 'About to start again: a fresh rod clamped in the holder across his lap.',
      break: 'A long break: the holder hung up, the cable coiled, the gloves off.',
    }),
    seat: choice('What does he sit on?', {
      white: 'An upturned white plastic bucket.',
      orange: 'An upturned orange bucket.',
      machine: 'The welding machine itself, a red box with dials.',
      spool: 'A wooden cable spool on its side.',
    }),
    work: choice('What is he welding?', {
      plate: 'A steel plate on the ground with a run of bead on it.',
      pipe: 'A length of pipe on two stands.',
      cage: 'A rebar cage lying on the ground.',
      column: 'A column base plate, bolted down.',
    }),
    head: choice('What is under the helmet?', {
      cap: 'A cap turned backwards.',
      bandana: 'A red bandana tied over the hair.',
      short: 'Short cropped hair.',
      bald: 'A shaved head.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.68, 1.86, random());
    const build: Build = random() < 0.45 ? 'heavy' : 'average';
    const skin = pickSkin(random);
    const leatherColour = pick(random, ['#b48a5a', '#9a7446', '#7a5a3a']);
    const topColour = a.jacket === 'tee' ? '#8a8c8e' : a.jacket === 'sleeves' ? leatherColour : leatherColour;
    const hair = a.head === 'cap' ? 'cap' : a.head === 'short' ? 'short' : 'none';
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', hair, hairColor: a.head === 'cap' ? pick(random, ['#2a2a2c', '#4a5a8a', '#6b4a2e']) : '#2a2320',
      skin, top: topColour, bottom: '#3f4652', shoes: '#2a211b', sleeves: a.jacket === 'tee' ? 'short' : 'long',
    });
    s.root.add(person.root);
    const lowSeat = a.seat !== 'machine';
    leg(person, 'left', { forward: lowSeat ? 100 : 90, knee: lowSeat ? 118 : 100, out: 16, foot: 'flat' });
    leg(person, 'right', { forward: lowSeat ? 98 : 88, knee: lowSeat ? 114 : 98, out: 12, foot: 'flat' });
    const drinkSide = random() < 0.6 ? 'right' : 'left';
    const restSide = drinkSide === 'right' ? 'left' : 'right';
    if (a.drink === 'nothing') {
      arm(person, 'left', { forward: 48, out: 4, bend: 42, across: 20 });
      arm(person, 'right', { forward: 48, out: 4, bend: 42, across: 20 });
    } else {
      arm(person, drinkSide, { forward: 44, out: 8, bend: 112, across: 22 });
      arm(person, restSide, { forward: 62, out: 10, bend: 48, across: 12 });
    }
    person.joints.spine.rotation.x = 0.16;
    look(person, 14, 12 * (random() < 0.5 ? 1 : -1));
    person.settle();
    person.root.updateMatrixWorld(true);
    const hips = worldOf(person.pelvis);
    const headR = H * 0.064;
    const limb = H * 0.036 * { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const torsoL = H * 0.28;
    boots(s, person, H, '#2a211b');

    // ---- the seat, sized to where his hips landed
    const seatH = Math.max(0.2, person.hipHeight - 0.035);
    const seatAt: P = [hips.x, 0, hips.z - 0.02];
    const dark = s.material('#2a2c30', { roughness: 0.6 });
    if (a.seat === 'white' || a.seat === 'orange') {
      const plastic = s.material(a.seat === 'white' ? '#e8e6de' : '#f07a1a', { roughness: 0.55 });
      s.cylinder(0.135, 0.15, seatH, [seatAt[0], seatH / 2, seatAt[2]], plastic, 18);
      s.ring(0.15, 0.012, [seatAt[0], 0.012, seatAt[2]], plastic).rotation.x = Math.PI / 2;
      const handle = s.tube([[seatAt[0] - 0.15, 0.1, seatAt[2]], [seatAt[0] - 0.22, 0.05, seatAt[2] + 0.1], [seatAt[0] - 0.14, 0.02, seatAt[2] + 0.2]], 0.006, s.material('#8a8c8e', { metalness: 0.7, roughness: 0.4 }));
      void handle;
    } else if (a.seat === 'machine') {
      const red = s.material('#b8302a', { roughness: 0.5, metalness: 0.2 });
      s.box([0.5, seatH, 0.42], [seatAt[0], seatH / 2, seatAt[2]], red);
      s.box([0.5, 0.02, 0.42], [seatAt[0], seatH - 0.01, seatAt[2]], dark);
      for (let i = 0; i < 2; i++) s.cylinder(0.035, 0.035, 0.02, [seatAt[0] - 0.12 + i * 0.24, seatH * 0.55, seatAt[2] + 0.215], dark, 14).rotation.x = Math.PI / 2;
      s.box([0.3, 0.06, 0.01], [seatAt[0], seatH * 0.8, seatAt[2] + 0.215], s.material('#f2f1ea', { roughness: 0.6 }));
      s.cylinder(0.02, 0.02, 0.4, [seatAt[0], seatH + 0.02, seatAt[2] - 0.15], dark, 10).rotation.z = Math.PI / 2;
    } else {
      const wood = s.material('#b89560', { roughness: 0.9 });
      const spool = s.cylinder(0.3, 0.3, 0.04, [seatAt[0], 0.02, seatAt[2]], wood, 20);
      void spool;
      s.cylinder(0.12, 0.12, seatH - 0.04, [seatAt[0], seatH / 2, seatAt[2]], wood, 14);
      s.cylinder(0.26, 0.26, 0.04, [seatAt[0], seatH - 0.02, seatAt[2]], wood, 20);
    }

    // ---- the helmet, flipped up above the forehead
    const shell = s.material('#1f2124', { roughness: 0.45 });
    if (a.helmet === 'flip' || a.helmet === 'auto') {
      const mask = new THREE.Group();
      const decal = a.helmet === 'auto'
        ? new THREE.MeshStandardMaterial({ map: paint(128, 160, (c) => {
          c.fillStyle = '#1f2124'; c.fillRect(0, 0, 128, 160);
          for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? '#f08a1a' : '#d8262c'; c.beginPath(); const x = 10 + i * 17; c.moveTo(x, 160); c.quadraticCurveTo(x + 20, 110 - random() * 40, x + 8, 50 - random() * 30); c.quadraticCurveTo(x - 4, 100, x - 10, 160); c.fill(); }
        }), roughness: 0.45, side: THREE.DoubleSide })
        : shell;
      const front = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.45, headR * 1.3, headR * 2.7, 20, 1, true, -Math.PI * 0.55, Math.PI * 1.1), decal);
      front.material.side = THREE.DoubleSide;
      front.castShadow = true;
      const window = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.2, headR * 0.55, 0.004), s.material('#1a3a2a', { roughness: 0.2, metalness: 0.3 }));
      window.position.set(0, headR * 0.1, headR * 1.44);
      mask.add(front, window);
      mask.position.set(0, headR * 1.15, headR * 0.1);
      mask.rotation.x = -72 * RAD;
      person.head.add(mask);
      const band = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.12, headR * 0.09, 6, 24), shell);
      band.rotation.x = Math.PI / 2;
      band.position.y = headR * 0.45;
      person.head.add(band);
      for (const side of [-1, 1]) {
        const pivot = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.18, headR * 0.18, headR * 0.1, 10), s.material('#8a8c8e', { metalness: 0.6, roughness: 0.4 }));
        pivot.rotation.z = Math.PI / 2;
        pivot.position.set(side * headR * 1.2, headR * 0.45, 0);
        person.head.add(pivot);
      }
    } else if (a.helmet === 'leather') {
      const hood = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.25, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), s.material('#5a3a22', { roughness: 0.95, side: THREE.DoubleSide }));
      hood.position.set(0, headR * 0.5, -headR * 0.9);
      hood.rotation.x = -1.1;
      hood.scale.set(1, 0.9, 1.2);
      hood.castShadow = true;
      person.head.add(hood);
    } else {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.08, headR * 0.07, 6, 24), shell);
      strap.rotation.x = Math.PI / 2;
      strap.position.y = headR * 0.6;
      person.head.add(strap);
      for (const side of [-1, 1]) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.3, headR * 0.26, headR * 0.3, 12), s.material('#4a4c50', { roughness: 0.5 }));
        cup.rotation.x = Math.PI / 2 - 0.5;
        cup.position.set(side * headR * 0.38, headR * 0.7, headR * 0.95);
        person.head.add(cup);
      }
    }
    if (a.head === 'bandana') {
      const cloth = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.06, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), s.material('#b8302a', { roughness: 0.95 }));
      cloth.position.y = headR * 0.12;
      cloth.castShadow = true;
      person.head.add(cloth);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.3, headR * 0.6, headR * 0.1), s.material('#b8302a', { roughness: 0.95 }));
      tail.position.set(0, -headR * 0.2, -headR * 1.02);
      person.head.add(tail);
    }
    if (a.head === 'cap') {
      // Turn the stock cap's peak to the back.
      const peak = person.head.children.find((child) => (child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry.type === 'BoxGeometry' && child.position.z > headR);
      if (peak) peak.position.z = -peak.position.z;
    }

    // ---- the jacket: open over a t-shirt, zipped, sleeves and apron, or just the tee
    const r = limb * 1.35 * (build === 'heavy' ? 1.25 : 1);
    const torso = person.joints.spine.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh | undefined;
    const stretch = torso?.scale.x ?? 1;
    const spots = new THREE.MeshStandardMaterial({ map: paint(128, 128, (c) => {
      c.fillStyle = leatherColour; c.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(30,20,12,${0.25 + random() * 0.5 * (0.4 + mood.wear)})`; c.beginPath(); c.arc(random() * 128, random() * 128, 1 + random() * 3, 0, Math.PI * 2); c.fill(); }
    }), roughness: 0.75 });
    if (a.jacket === 'open' || a.jacket === 'zipped') {
      if (torso) torso.material = spots;
      if (a.jacket === 'open') {
        const tee = new THREE.Mesh(new THREE.BoxGeometry(r * 0.9 * stretch, torsoL * 0.8, 0.02), s.material('#2a2c30', { roughness: 0.9 }));
        tee.position.set(0, torsoL * 0.48, r + 0.002);
        tee.castShadow = true;
        person.joints.spine.add(tee);
      } else {
        const zip = new THREE.Mesh(new THREE.BoxGeometry(0.012, torsoL * 0.85, 0.006), s.material('#8a8c8e', { metalness: 0.7, roughness: 0.4 }));
        zip.position.set(0, torsoL * 0.5, r + 0.004);
        person.joints.spine.add(zip);
      }
    } else if (a.jacket === 'sleeves') {
      if (torso) torso.material = s.material('#2a2c30', { roughness: 0.9 });
      const bib = new THREE.Mesh(new THREE.BoxGeometry(r * 1.6 * stretch, torsoL * 0.75, 0.02), spots);
      bib.position.set(0, torsoL * 0.4, r + 0.006);
      bib.castShadow = true;
      person.joints.spine.add(bib);
      const lap = s.box([0.34, 0.015, 0.28], [hips.x, hips.y + 0.04, hips.z + 0.17], spots);
      lap.rotation.x = -0.1;
    } else {
      // The jacket thrown over whatever is nearest.
      const heap = s.ball([0.22, 0.09, 0.2], [seatAt[0] + 0.42, 0.09, seatAt[2] - 0.25], spots, 12);
      heap.rotation.y = random() * 3;
    }

    // ---- gauntlets on one knee, the drink in the hand
    const kneeAt = worldOf(person.joints.knees[restSide]);
    const leather = s.material(leatherColour, { roughness: 0.85 });
    if (a.state !== 'ready') for (let i = 0; i < 2; i++) {
      const glove = s.box([0.1, 0.035, 0.3], [kneeAt.x + (i - 0.5) * 0.06, kneeAt.y + 0.05 + i * 0.03, kneeAt.z - 0.04 + i * 0.02], leather);
      glove.rotation.set(0.15, (i - 0.5) * 0.5, 0);
      s.box([0.085, 0.036, 0.11], [kneeAt.x + (i - 0.5) * 0.06, kneeAt.y + 0.05 + i * 0.03, kneeAt.z + 0.12], s.material('#8a6a44', { roughness: 0.9 })).rotation.set(0.15, (i - 0.5) * 0.5, 0);
    }
    if (a.drink !== 'nothing') {
      const hand = worldOf(person.hands[drinkSide]);
      if (a.drink === 'water') {
        s.cylinder(0.035, 0.035, 0.2, [hand.x, hand.y + 0.06, hand.z + 0.02], new THREE.MeshPhysicalMaterial({ color: '#bfe0ff', transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false }), 12);
        s.cylinder(0.034, 0.034, 0.09, [hand.x, hand.y + 0.01, hand.z + 0.02], s.material('#a8d4f8', { roughness: 0.2, transparent: true, opacity: 0.8 }), 12);
        s.cylinder(0.018, 0.018, 0.025, [hand.x, hand.y + 0.17, hand.z + 0.02], s.material('#2b6fb8', { roughness: 0.5 }), 10);
      } else if (a.drink === 'can') {
        s.cylinder(0.033, 0.033, 0.12, [hand.x, hand.y + 0.03, hand.z + 0.02], s.material(pick(random, ['#c8302a', '#2b4f8a', '#2f8a4a']), { roughness: 0.35, metalness: 0.4 }), 14);
        s.cylinder(0.03, 0.03, 0.008, [hand.x, hand.y + 0.094, hand.z + 0.02], s.material('#c9ced2', { metalness: 0.8, roughness: 0.3 }), 14);
      } else {
        s.cylinder(0.04, 0.034, 0.075, [hand.x, hand.y + 0.02, hand.z + 0.02], s.material('#c9ced2', { metalness: 0.8, roughness: 0.3 }), 14);
        s.cylinder(0.045, 0.045, 0.3, [seatAt[0] - 0.3, 0.15, seatAt[2] + 0.05], s.material('#2f7a3a', { roughness: 0.45 }), 16);
      }
    }

    // ---- the electrode holder and its cable
    const cableMaterial = s.material('#1a1a1c', { roughness: 0.7 });
    const holderAt = a.state === 'ready'
      ? (() => { const h = worldOf(person.hands[restSide]); return new THREE.Vector3(h.x, h.y + 0.02, h.z + 0.05); })()
      : a.state === 'break' ? new THREE.Vector3(seatAt[0] + (a.seat === 'machine' ? 0.26 : 0.16), seatH + 0.02, seatAt[2] - 0.1) : new THREE.Vector3(seatAt[0] + 0.45, 0.03, seatAt[2] + 0.25);
    const holder = new THREE.Group();
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.14, 10), s.material('#c8302a', { roughness: 0.5 }));
    grip.rotation.z = Math.PI / 2;
    const jaws = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.025), s.material('#8a8c8e', { metalness: 0.6, roughness: 0.4 }));
    jaws.position.x = 0.09;
    grip.castShadow = jaws.castShadow = true;
    holder.add(grip, jaws);
    if (a.state !== 'break') {
      const rodLength = a.state === 'ready' ? 0.3 : 0.07;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, rodLength, 6), s.material(a.state === 'ready' ? '#c9ced2' : '#5a5048', { metalness: 0.5, roughness: 0.4 }));
      rod.rotation.z = -0.5;
      rod.position.set(0.11 + Math.sin(0.5) * rodLength * 0.5, Math.cos(0.5) * rodLength * 0.5 + 0.01, 0);
      holder.add(rod);
    }
    holder.position.copy(holderAt);
    holder.rotation.y = a.state === 'ready' ? -0.6 : random() * Math.PI;
    s.root.add(holder);
    // The cable runs from the holder to a flat coil on the ground.
    const coilAt: P = [seatAt[0] + 0.55, 0.012, seatAt[2] - 0.3];
    const coil = s.ring(0.22, 0.012, coilAt, cableMaterial);
    coil.rotation.x = Math.PI / 2;
    const coil2 = s.ring(0.19, 0.012, [coilAt[0] + 0.02, 0.034, coilAt[2] - 0.02], cableMaterial);
    coil2.rotation.x = Math.PI / 2;
    const holderWorld = holder.position;
    s.tube([[holderWorld.x - 0.07, holderWorld.y, holderWorld.z], [(holderWorld.x + coilAt[0]) / 2, 0.02, (holderWorld.z + coilAt[2]) / 2 + 0.15], [coilAt[0] + 0.22, 0.015, coilAt[2]]], 0.011, cableMaterial);

    // ---- the work, and the weld that may still glow
    const steel = s.material('#6a6e72', { metalness: 0.5, roughness: 0.55 });
    const workAt: P = [seatAt[0] - 0.75, 0, seatAt[2] + 0.35];
    let bead: THREE.Mesh | null = null;
    const beadMaterial = a.glow ? new THREE.MeshStandardMaterial({ color: '#5a3a2a', emissive: new THREE.Color().setHSL(0.03, 1, 0.45), emissiveIntensity: mix(0.8, 2.0, mood.warmth), roughness: 0.6 }) : s.material('#8a8278', { metalness: 0.4, roughness: 0.5 });
    if (a.work === 'plate') {
      s.box([0.6, 0.012, 0.4], [workAt[0], 0.006, workAt[2]], steel);
      bead = s.cylinder(0.009, 0.009, 0.4, [workAt[0] - 0.05, 0.016, workAt[2]], beadMaterial, 8);
      bead.rotation.z = Math.PI / 2;
    } else if (a.work === 'pipe') {
      for (const dx of [-0.35, 0.35]) { s.box([0.06, 0.3, 0.3], [workAt[0] + dx, 0.15, workAt[2]], s.material('#f2c21c', { roughness: 0.5 })); s.box([0.1, 0.03, 0.34], [workAt[0] + dx, 0.315, workAt[2]], s.material('#f2c21c', { roughness: 0.5 })); }
      const pipe = s.cylinder(0.08, 0.08, 1.1, [workAt[0], 0.4, workAt[2]], steel, 18);
      pipe.rotation.z = Math.PI / 2;
      bead = s.ring(0.082, 0.009, [workAt[0] + 0.05, 0.4, workAt[2]], beadMaterial);
      bead.rotation.y = Math.PI / 2;
    } else if (a.work === 'cage') {
      const rebar = s.material('#6a4a3a', { roughness: 0.9 });
      const cage = new THREE.Group();
      for (let i = 0; i < 6; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.007, 6, 18), rebar); ring.rotation.y = Math.PI / 2; ring.position.x = -0.5 + i * 0.2; ring.castShadow = true; cage.add(ring); }
      for (let k = 0; k < 8; k++) { const t = (k / 8) * Math.PI * 2; const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.2, 6), rebar); bar.rotation.z = Math.PI / 2; bar.position.set(0, Math.cos(t) * 0.17, Math.sin(t) * 0.17); bar.castShadow = true; cage.add(bar); }
      cage.position.set(workAt[0], 0.18, workAt[2]);
      s.root.add(cage);
      bead = s.ball([0.02, 0.02, 0.02], [workAt[0] - 0.3, 0.35, workAt[2]], beadMaterial, 8);
    } else {
      s.box([0.5, 0.03, 0.5], [workAt[0], 0.015, workAt[2]], steel);
      for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) { s.cylinder(0.018, 0.018, 0.06, [workAt[0] + x, 0.06, workAt[2] + z], steel, 8); s.cylinder(0.028, 0.028, 0.02, [workAt[0] + x, 0.05, workAt[2] + z], steel, 6); }
      s.mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), steel, [workAt[0], 0.28, workAt[2]]);
      bead = s.ring(0.13, 0.009, [workAt[0], 0.035, workAt[2]], beadMaterial);
      bead.rotation.x = Math.PI / 2;
      bead.scale.set(1.0, 1.0, 1.0);
    }
    // Smoke from the stub or the fresh weld, when a burn has just ended.
    const wisps: { mesh: THREE.Mesh; base: THREE.Vector3; phase: number }[] = [];
    if (a.state === 'finished' || a.glow) {
      const smoke = new THREE.MeshStandardMaterial({ color: '#9a9a96', transparent: true, opacity: 0.35, depthWrite: false, roughness: 1 });
      const from = a.state === 'finished' ? holderAt.clone().add(new THREE.Vector3(0.12, 0.05, 0)) : new THREE.Vector3(...workAt).add(new THREE.Vector3(0, 0.05, 0));
      for (let i = 0; i < 5; i++) {
        const puff = s.ball([0.03 + i * 0.012, 0.03 + i * 0.012, 0.03 + i * 0.012], [from.x + (random() - 0.5) * 0.04, from.y + i * 0.07, from.z + (random() - 0.5) * 0.04], smoke, 8);
        puff.castShadow = false;
        wisps.push({ mesh: puff, base: puff.position.clone(), phase: random() * 6.3 });
      }
    }

    const energy = mood.energy;
    const glowBase = (bead?.material as THREE.MeshStandardMaterial | undefined)?.emissiveIntensity ?? 0;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        for (const { mesh, base, phase } of wisps) {
          mesh.position.set(base.x + Math.sin(time * 0.8 + phase) * 0.02, base.y + (Math.sin(time * 0.5 + phase) + 1) * 0.02, base.z + Math.cos(time * 0.6 + phase) * 0.02);
        }
        if (bead && a.glow) (bead.material as THREE.MeshStandardMaterial).emissiveIntensity = glowBase * (0.85 + Math.sin(time * 2.5) * 0.15 * (0.3 + energy));
      },
    });
  },
});
