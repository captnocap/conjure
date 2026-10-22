import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    species: choice('What character does the bare frame hint at?', {
      bear: 'A bear: two round wire ear hoops on top and a short blunt muzzle frame.',
      rabbit: 'A rabbit: two tall ear loops standing straight up, buck teeth.',
      duck: 'A duck: a long flat bill made of two hinged plates.',
      human: 'A human: narrow, with a nose bridge and a full row of even dentures.',
      cat: 'A cat: two pointed triangular ear plates and whisker wires.',
    }),
    gaze: choice('Where are the eyes pointing?', {
      ahead: 'Dead ahead, straight at whoever is in front.',
      left: 'Both hard to one side, as if something moved.',
      up: 'Rolled upward.',
      crossed: 'Each a different way, a servo out of calibration.',
      down: 'Lowered to the floor.',
    }),
    jaw: choice('Is the jaw open or shut?', {
      shut: 'Clamped shut, teeth meeting.',
      ajar: 'Hanging slightly open.',
      wide: 'Dropped wide open as far as the hinge allows.',
    }),
    skin: choice('How much of its skin remains?', {
      none: 'None: clean bare metal.',
      scrap: 'A torn scrap of rubber and fur still glued to one cheek.',
      half: 'Half the face still covered in fur, the other half bare frame.',
      hanging: 'The whole face mask hanging off one side by a last fastener.',
    }),
    mount: choice('How is it sitting?', {
      stand: 'Upright on a round bench stand.',
      side: 'Lying on its side where it was dropped.',
      crate: 'Bolted on top of a wooden parts crate.',
      pole: 'High on a tall floor pole at head height.',
    }),
    power: choice('Is it powered?', {
      dead: 'Dead: dull glass eyes, nothing moving.',
      live: 'Powered: eyes lit and slowly hunting side to side, jaw ticking.',
      fault: 'Faulting: one eye glowing red, the other dark.',
    }),
    tag: choice('If a paper tag hangs from it, what does it say?', {
      none: 'There is no tag.',
      repair: 'REPAIR',
      scrap: 'SCRAP',
      warning: 'DO NOT POWER ON',
      name: 'A character name and a date from 1987.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const head = new THREE.Group();
    s.root.add(head);
    const add = <T extends THREE.Object3D>(m: T, g: THREE.Object3D = head) => { g.add(m); return m; };
    const alu = s.material('#b9bfc2', { metalness: 0.85, roughness: mix(0.25, 0.6, mood.wear) });
    const steel = s.material('#6f767b', { metalness: 0.8, roughness: 0.4 });
    const dark = s.material('#1c1d20', { roughness: 0.6 });
    const brass = s.material('#c49a3a', { metalness: 0.8, roughness: 0.3 });
    const white = s.material('#f3efe4', { roughness: 0.15 });
    const tooth = s.material('#ece5cf', { roughness: 0.35 });
    const skinTint = { bear: '#8a5a34', rabbit: '#b9a6d6', duck: '#e8c531', human: '#d9a488', cat: '#e58a3a' }[a.species];
    const skin = s.material(skinTint, { roughness: 0.95, side: THREE.DoubleSide });
    const human = a.species === 'human';
    const W = human ? 0.115 : 0.14;

    // Neck joint and skull cage.
    add(s.ball([0.04, 0.04, 0.04], [0, 0, 0], steel, 12));
    for (const side of [-1, 1]) {
      const plate = add(s.cylinder(0.12, 0.12, 0.008, [side * W, 0.16, -0.01], alu, 24));
      plate.rotation.z = Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        const t = i * 1.257;
        const hole = add(s.cylinder(0.022, 0.022, 0.012, [side * W, 0.16 + Math.cos(t) * 0.07, -0.01 + Math.sin(t) * 0.07], dark, 10));
        hole.rotation.z = Math.PI / 2;
      }
      add(s.cylinder(0.02, 0.02, 0.03, [side * (W + 0.01), 0.16, -0.01], steel, 8)).rotation.z = Math.PI / 2;
      add(s.rod([side * W, 0.06, 0.03], [side * 0.08, 0.085, 0.14], 0.008, alu));
    }
    const over = add(s.mesh(new THREE.TorusGeometry(W, 0.012, 6, 24, Math.PI), alu, [0, 0.19, -0.01]));
    over.scale.y = 0.75;
    const crest = add(s.mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 24, Math.PI), alu, [0, 0.17, -0.01]));
    crest.rotation.y = Math.PI / 2; crest.scale.y = 0.95;
    add(s.box([W * 2, 0.03, 0.01], [0, 0.225, 0.115], alu));
    add(s.box([W * 1.6, 0.16, 0.008], [0, 0.14, -0.135], alu));
    add(s.box([W * 2, 0.012, 0.25], [0, 0.045, -0.01], alu));
    add(s.rod([0, 0, 0], [0, 0.05, 0], 0.03, steel));

    // Eyes in ring mounts with lid shells.
    const eyeOn = a.power === 'live' ? mix(0.6, 1.8, mood.cheer) : 0;
    const eyeGroups: THREE.Group[] = [];
    const aim: Record<typeof a.gaze, [number, number][]> = {
      ahead: [[0, 0], [0, 0]], left: [[0, -0.6], [0, -0.6]], up: [[-0.55, 0], [-0.55, 0]],
      crossed: [[0.2, 0.5], [-0.3, -0.35]], down: [[0.5, 0], [0.5, 0]],
    };
    [-1, 1].forEach((side, index) => {
      const g = new THREE.Group();
      g.position.set(side * 0.062, 0.165, 0.11);
      head.add(g);
      eyeGroups.push(g);
      const fault = a.power === 'fault';
      const glow = fault ? (side === 1 ? 2 : 0) : eyeOn;
      const irisTint = fault && side === 1 ? '#ff2a1a' : a.power === 'live' ? '#7fd0ff' : '#3a6f8a';
      add(s.ball([0.045, 0.045, 0.045], [0, 0, 0], white, 18), g);
      add(s.ball([0.024, 0.024, 0.01], [0, 0, 0.04], new THREE.MeshStandardMaterial({ color: irisTint, emissive: irisTint, emissiveIntensity: glow, roughness: 0.2 }), 12), g);
      add(s.ball([0.011, 0.011, 0.006], [0, 0, 0.048], dark, 8), g);
      g.rotation.set(aim[a.gaze][index][0], aim[a.gaze][index][1], 0);
      const ring = add(s.mesh(new THREE.TorusGeometry(0.052, 0.008, 6, 20), alu, [side * 0.062, 0.165, 0.1]));
      ring.rotation.set(0, 0, 0);
      const lid = add(s.mesh(new THREE.SphereGeometry(0.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), s.material('#d7dadb', { metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide }), [side * 0.062, 0.165, 0.11]));
      lid.rotation.x = -0.75 + (side === 1 ? mood.wear * 1.1 * random() : 0);
      const lower = add(s.mesh(new THREE.SphereGeometry(0.05, 16, 6, 0, Math.PI * 2, 0, Math.PI / 3.4), s.material('#d7dadb', { metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide }), [side * 0.062, 0.165, 0.11]));
      lower.rotation.x = Math.PI + 0.55;
      add(s.box([0.04, 0.035, 0.05], [side * 0.062, 0.165, 0.03], dark));
      add(s.rod([side * 0.062, 0.215, 0.11], [side * 0.062, 0.24, 0.03], 0.004, brass));
    });

    // Upper and lower jaw.
    const duck = a.species === 'duck';
    const len = duck ? 0.3 : a.species === 'bear' ? 0.15 : human ? 0.1 : 0.13;
    const jw = human ? 0.12 : duck ? 0.17 : 0.15;
    const jawPlate = (parent: THREE.Object3D, y: number, up: boolean) => {
      if (duck) {
        const bill = add(s.cylinder(jw / 2, jw / 2, 0.012, [0, y, 0.06 + len / 2], s.material('#d98a1e', { roughness: 0.5 }), 20), parent);
        bill.scale.z = len / jw * 1.1;
        add(s.box([jw * 0.8, 0.012, len * 0.6], [0, y, 0.06 + len * 0.3], alu), parent);
        return;
      }
      add(s.box([jw, 0.01, len], [0, y, 0.06 + len / 2], alu), parent);
      const n = human ? 10 : 7;
      for (let i = 0; i < n; i++) {
        const big = a.species === 'rabbit' && up && (i === 3 || i === 4) ? 2.1 : 1;
        if (a.species === 'rabbit' && up && i === 3) continue;
        const tw = jw / n * 0.82 * (big > 1 ? 1.7 : 1);
        const th = (human ? 0.02 : 0.026) * big * (0.85 + random() * 0.3);
        if (mood.wear > 0.6 && random() < (mood.wear - 0.5) * 0.5) continue;
        add(s.box([tw, th, 0.012], [-jw / 2 + (i + 0.5) * jw / n - (big > 1 ? jw / n / 2 : 0), y + (up ? -th / 2 : th / 2), 0.06 + len - 0.008], tooth), parent);
      }
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++)
        add(s.box([0.01, 0.02, len / 4.5], [side * (jw / 2 - 0.006), y + (up ? -0.01 : 0.01), 0.08 + i * len / 3.4], tooth), parent);
    };
    jawPlate(head, 0.085, true);
    const jaw = new THREE.Group();
    jaw.position.set(0, 0.06, 0.03);
    head.add(jaw);
    jawPlate(jaw, -0.005, false);
    for (const side of [-1, 1]) add(s.box([0.008, 0.035, 0.07], [side * (jw / 2 + 0.006), 0.005, 0.04], steel), jaw);
    add(s.cylinder(0.012, 0.012, jw + 0.05, [0, 0, 0], steel, 8), jaw).rotation.z = Math.PI / 2;
    const jawRest = { shut: 0.02, ajar: 0.3, wide: 0.85 }[a.jaw];
    jaw.rotation.x = jawRest;
    if (human) add(s.mesh(new THREE.ConeGeometry(0.025, 0.07, 4), alu, [0, 0.13, 0.15])).rotation.x = 0.3;
    if (a.species === 'cat') for (const side of [-1, 1]) for (let i = 0; i < 3; i++)
      add(s.rod([side * 0.05, 0.1, 0.17], [side * 0.2, 0.08 + i * 0.03, 0.2], 0.0025, steel));

    // Pneumatic cylinders: jaw, and a pair tilting the head on its neck.
    const piston = (from: P3, to: P3, g: THREE.Object3D = head) => {
      const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), M = A.clone().lerp(B, 0.6);
      add(s.rod(from, M.toArray() as P3, 0.016, brass), g);
      add(s.rod(M.toArray() as P3, to, 0.006, s.material('#e8eaec', { metalness: 0.9, roughness: 0.15 })), g);
      add(s.ball([0.012, 0.012, 0.012], to, steel, 8), g);
      add(s.cylinder(0.019, 0.019, 0.012, from, dark, 8), g);
    };
    piston([0.05, 0.12, -0.12], [0.05, 0.05, 0.03]);
    const postLen = a.mount === 'pole' ? 0.62 : a.mount === 'side' ? 0.2 : 0.27;
    for (const side of [-1, 1]) piston([side * 0.035, -0.17, -0.02], [side * 0.09, 0.04, -0.06]);

    // Ears and other species tells.
    const frame = (geometry: THREE.BufferGeometry, at: P3) => add(s.mesh(geometry, alu, at));
    if (a.species === 'bear') for (const side of [-1, 1]) {
      frame(new THREE.TorusGeometry(0.055, 0.008, 6, 20), [side * 0.12, 0.34, -0.01]);
      add(s.rod([side * 0.1, 0.25, -0.01], [side * 0.12, 0.29, -0.01], 0.008, alu));
    }
    if (a.species === 'rabbit') for (const side of [-1, 1]) {
      const ear = frame(new THREE.TorusGeometry(0.05, 0.008, 6, 20), [side * 0.07, 0.46, -0.02]);
      ear.scale.set(0.75, 3.4, 1);
      ear.rotation.z = -side * 0.12;
      if (side === 1 && mood.wear > 0.45) { ear.rotation.z = -1.0 * mood.wear; ear.position.set(0.2, 0.4, -0.02); }
      add(s.cylinder(0.014, 0.014, 0.05, [side * 0.07, 0.29, -0.02], brass, 8));
    }
    if (a.species === 'cat') for (const side of [-1, 1]) {
      const ear = add(s.mesh(new THREE.ConeGeometry(0.06, 0.11, 3), alu, [side * 0.1, 0.33, -0.01]));
      ear.scale.z = 0.25; ear.rotation.z = -side * 0.25;
    }

    // Skin remnants.
    if (a.skin === 'scrap') {
      const scrap = add(s.mesh(new THREE.SphereGeometry(0.165, 14, 10, 1.75, 1.25, 1.05, 1.15), skin, [0, 0.14, -0.01]));
      scrap.scale.set(1.02, 1, 1);
      add(s.mesh(new THREE.ConeGeometry(0.03, 0.09, 3), skin, [0.12, 0.02, 0.09])).rotation.z = Math.PI;
    } else if (a.skin === 'half') {
      const half = add(s.mesh(new THREE.SphereGeometry(0.175, 20, 16, Math.PI / 2, Math.PI, 0, Math.PI * 0.72), skin, [0, 0.15, -0.01]));
      half.scale.set(1.05, 1.1, 1);
      add(s.ball([0.05, 0.035, 0.05], [0.04, 0.11, 0.06 + len], skin, 10));
      if (a.species === 'bear') add(s.ball([0.07, 0.07, 0.03], [0.12, 0.34, -0.01], skin, 12));
      // a cut-out so the covered eye still shows
      add(s.ball([0.05, 0.05, 0.02], [0.062, 0.165, 0.145], dark, 12));
    } else if (a.skin === 'hanging') {
      const mask = new THREE.Group();
      mask.position.set(-W - 0.01, 0.22, 0.05);
      mask.rotation.set(0.25, -0.5, 1.15 + random() * 0.3);
      head.add(mask);
      const shell = add(s.mesh(new THREE.SphereGeometry(0.17, 20, 14, 0, Math.PI, 0.15, Math.PI * 0.75), skin), mask);
      shell.position.set(0.16, -0.05, 0);
      add(s.ball([0.07, 0.05, duck ? 0.14 : 0.07], [0.16, -0.1, 0.17], duck ? s.material('#d98a1e') : skin, 12), mask);
      add(s.ball([0.022, 0.018, 0.018], [0.16, -0.075, duck ? 0.3 : 0.235], dark, 8), mask);
      for (const side of [-1, 1]) add(s.ball([0.035, 0.035, 0.012], [0.16 + side * 0.06, 0.0, 0.158], dark, 10), mask);
    }

    // Neck post, air line ribbon and mount.
    add(s.rod([0, -postLen, 0], [0, 0, 0], 0.022, steel));
    add(s.cylinder(0.035, 0.035, 0.03, [0, -0.17, 0], steel, 12));
    const lineTints = ['#2f6fd0', '#d23b2f', '#e3c22a', '#e9ecec', '#222428', '#3da45a'];
    lineTints.forEach((tint, i) => {
      const x = (i - 2.5) * 0.013;
      const end: P3 = a.mount === 'side' ? [x * 3, -postLen - 0.12 - random() * 0.08, -0.1 + (random() - 0.5) * 0.16] : [x * 2 + (random() - 0.5) * 0.05, -postLen + 0.012, -0.14 - random() * 0.12];
      add(s.tube([[x, 0.1, -0.142], [x, -0.03, -0.075], [x, -postLen * 0.55, -0.032], [x, -postLen + 0.05, -0.04], end], 0.0055, s.material(tint, { roughness: 0.4 })));
    });
    for (let i = 0; i < 3; i++) add(s.box([0.09, 0.008, 0.012], [0, -0.04 - i * (postLen - 0.1) / 3, -0.038], dark));

    if (a.mount === 'side') {
      add(s.cylinder(0.06, 0.06, 0.012, [0, -postLen, 0], steel, 16));
      head.rotation.z = Math.PI / 2 - 0.12;
      head.rotation.x = -0.35;
      const lay = new THREE.Group();
      s.root.add(lay);
      lay.add(head);
      lay.rotation.y = 0.35 + (random() - 0.5) * 0.4;
      
    } else {
      head.rotation.y = (random() - 0.5) * 0.3;
      s.cylinder(0.14, 0.15, 0.02, [0, -postLen, 0], dark, 24);
      for (let i = 0; i < 4; i++) s.cylinder(0.012, 0.012, 0.012, [Math.sin(i * 1.57 + 0.78) * 0.115, -postLen + 0.012, Math.cos(i * 1.57 + 0.78) * 0.115], brass, 6);
      if (a.mount === 'crate') {
        const wood = s.material('#a47d4f', { roughness: 0.9 });
        s.box([0.42, 0.3, 0.38], [0, -postLen - 0.16, 0], wood);
        for (const y of [-0.04, -0.28]) s.box([0.44, 0.035, 0.4], [0, -postLen - y - 0.32, 0], s.material('#7c5a36'));
        s.label('PARTS', 0.22, 0.07, [0, -postLen - 0.16, 0.192], '#3a2a1a', '#a47d4f');
      }
      if (a.mount === 'pole') s.cylinder(0.22, 0.24, 0.03, [0, -postLen - 0.015, 0], steel, 24);
    }

    if (a.tag !== 'none') {
      const text = { repair: 'REPAIR', scrap: 'SCRAP', warning: 'DO NOT POWER ON', name: 'ROLO 3/87' }[a.tag];
      const paper = a.tag === 'warning' ? '#e8c22a' : a.tag === 'scrap' ? '#d9553f' : '#ead9b0';
      const tag = add(s.label(text, 0.13, 0.06, [W + 0.03, 0.0, 0.07], '#22201c', paper));
      tag.rotation.set(0, 0.3, -0.2 + (random() - 0.5) * 0.3);
      add(s.rod([W, 0.1, 0.03], [W + 0.03, 0.03, 0.07], 0.002, dark));
    }

    const live = a.power === 'live', phase = random() * 6;
    const base = eyeGroups.map((g) => g.rotation.y);
    return s.finish({
      update: (_dt, time) => {
        if (!live) return;
        const t = time * mix(0.6, 3, mood.energy) + phase;
        eyeGroups.forEach((g, i) => { g.rotation.y = base[i] + Math.sin(t) * 0.45; });
        jaw.rotation.x = jawRest + Math.max(0, Math.sin(t * 3.1)) * 0.12 * mood.energy;
      },
    });
  },
});
