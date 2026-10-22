import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    finish: choice('What is its finish?', {
      chrome: 'Bright chrome, polished by a thousand hands.',
      seagreen: 'Thick sea-green municipal paint.',
      rust: 'Rust blooming through what is left of the paint.',
      navy: 'Navy enamel with brass fittings.',
      yellow: 'Council yellow, chipped at the edges.',
    }),
    head: choice('What kind of viewer is it?', {
      telescope: 'A single long telescope barrel with a flared hood.',
      binocular: 'A fat rounded tower viewer with two eyepieces, like a face.',
    }),
    points: choice('Where is it pointing?', {
      sea: 'Level, out to the horizon.',
      sky: 'Tipped up at the sky.',
      ground: 'Drooped at the ground, its clamp long gone.',
      inland: 'Swung right round to look back at the town.',
    }),
    tag: choice('Is there a notice on it?', {
      none: 'No notice, it works.',
      tag: 'An OUT OF ORDER tag hanging from it on string.',
      bag: 'A bin bag taped over the viewer.',
      card: 'A hand-written card taped to the pedestal about which coins it takes.',
    }),
    setting: choice('What is it bolted to?', {
      pad: 'A round concrete pad.',
      deck: 'Pier decking with a length of painted railing behind.',
      parapet: 'Paving behind a low stone parapet wall.',
      rock: 'A lump of rough rock at a lookout.',
    }),
    left: choice('What has been left with it?', {
      nothing: 'Nothing.',
      gull: 'A gull perched on top, unbothered.',
      icecream: 'A dropped ice cream melting at its foot.',
      scarf: 'A scarf tied round the pedestal, flapping.',
      coins: 'A few coins left on the step for the next child.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rustTone = new THREE.Color('#8a4a25');
    const metal = (hex: string, metalness: number, roughness: number, rusting = 0) =>
      new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(rustTone, Math.min(0.9, rusting + mood.wear * 0.13)), metalness: metalness * (1 - mood.wear * 0.5), roughness: Math.min(1, roughness + mood.wear * 0.3) });
    const body = {
      chrome: metal('#d9dee0', 0.95, 0.16),
      seagreen: metal('#3f9a8a', 0.1, 0.5),
      rust: metal('#5f8f84', 0.2, 0.9, 0.62),
      navy: metal('#22355f', 0.2, 0.4),
      yellow: metal('#eab820', 0.1, 0.5),
    }[a.finish];
    const fitting = a.finish === 'navy' ? metal('#c9a03a', 0.85, 0.3) : a.finish === 'rust' ? metal('#7a6a5a', 0.4, 0.8, 0.4) : metal('#c9cfd1', 0.9, 0.22);
    const dark = new THREE.MeshStandardMaterial({ color: '#14171a', roughness: 0.6 });
    const lens = new THREE.MeshStandardMaterial({ color: '#27425a', roughness: 0.08, metalness: 0.6 });
    const stoneHex = mood.warmth > 0.5 ? '#c9c1ae' : '#b7b8b2';

    // What it stands on.
    let floor = 0.08;
    if (a.setting === 'pad') {
      s.cylinder(0.62, 0.66, 0.08, [0, 0.04, 0], s.material(stoneHex, { roughness: 1 }), 28);
    } else if (a.setting === 'deck') {
      const plank = s.material('#a58a66', { roughness: 0.95 });
      for (let i = 0; i < 7; i++) s.box([0.19, 0.06 + random() * 0.012, 1.3], [-0.63 + i * 0.21, 0.04, 0], plank);
      const paint = s.material(mood.cheer > 0.5 ? '#3f9a8a' : '#f1ede0', { roughness: 0.5 });
      for (const x of [-0.7, 0, 0.7]) { s.box([0.07, 1.05, 0.07], [x, 0.6, -0.6], paint); s.ball([0.055, 0.055, 0.055], [x, 1.16, -0.6], paint, 10); }
      for (const y of [0.45, 0.78, 1.08]) s.rod([-0.7, y, -0.6], [0.7, y, -0.6], 0.022, paint);
    } else if (a.setting === 'parapet') {
      const slab = s.material(stoneHex, { roughness: 1 });
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s.box([0.48, 0.07 + random() * 0.01, 0.43], [-0.5 + i * 0.5, 0.04, -0.3 + j * 0.45], slab);
      const wall = s.material('#a39c8c', { roughness: 1, flatShading: true });
      s.box([1.5, 0.55, 0.28], [0, 0.35, -0.66], wall);
      for (let i = 0; i < 4; i++) s.box([0.37, 0.09, 0.34], [-0.57 + i * 0.38, 0.67, -0.66], slab);
    } else {
      floor = 0.3;
      const rock = s.material('#8f8b80', { roughness: 1, flatShading: true });
      s.mesh(new THREE.CylinderGeometry(0.4, 0.78, floor, 8, 1), rock, [0, floor / 2, 0]).rotation.y = random() * 3;
      for (let i = 0; i < 6; i++) {
        const t = random() * Math.PI * 2, r = 0.16 + random() * 0.16;
        s.mesh(new THREE.IcosahedronGeometry(r, 0), rock, [Math.sin(t) * 0.66, r * 0.5, Math.cos(t) * 0.66]).rotation.set(random() * 3, random() * 3, 0);
      }
    }

    // Pedestal, bolts and the child's step.
    s.lathe([[0.22, 0], [0.22, 0.035], [0.13, 0.09], [0.1, 0.3], [0.085, 0.92], [0.12, 0.98], [0.12, 1.04], [0.001, 1.04]], body, [0, floor, 0]);
    for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2 + 0.6; s.cylinder(0.022, 0.022, 0.03, [Math.sin(t) * 0.175, floor + 0.045, Math.cos(t) * 0.175], fitting, 6); }
    s.ring(0.1, 0.014, [0, floor + 0.5, 0], fitting).rotation.x = Math.PI / 2;
    const yaw = (a.points === 'inland' ? Math.PI + 0.7 : 0.75) + (random() - 0.5) * 0.5;
    const back: P3 = [Math.sin(yaw) * 1, 0, Math.cos(yaw) * 1];
    const stepAt: P3 = [back[0] * 0.36, floor + 0.2, back[2] * 0.36];
    const step = s.cylinder(0.2, 0.2, 0.035, stepAt, body, 20);
    step.scale.set(1, 1, 0.75);
    step.rotation.y = yaw;
    s.rod([back[0] * 0.08, floor + 0.12, back[2] * 0.08], [back[0] * 0.34, floor + 0.19, back[2] * 0.34], 0.03, body);
    for (let i = -2; i <= 2; i++) s.box([0.3, 0.008, 0.012], [stepAt[0] - back[2] * 0 + back[0] * i * 0.05, floor + 0.222, stepAt[2] + back[2] * i * 0.05], dark).rotation.y = yaw;

    // Yoke and head.
    const pivotY = floor + 1.27;
    const turret = new THREE.Group();
    turret.position.set(0, 0, 0);
    turret.rotation.y = yaw;
    s.root.add(turret);
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3, turn?: P3) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      if (turn) mesh.rotation.set(...turn);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const wide = a.head === 'binocular' ? 0.25 : 0.13;
    add(turret, new THREE.CylinderGeometry(0.1, 0.12, 0.07, 18), fitting, [0, floor + 1.075, 0]);
    add(turret, new THREE.BoxGeometry(wide * 2 + 0.05, 0.05, 0.11), body, [0, floor + 1.12, 0]);
    for (const side of [-1, 1]) {
      add(turret, new THREE.BoxGeometry(0.04, 0.22, 0.1), body, [side * wide, pivotY - 0.08, 0]);
      add(turret, new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), fitting, [side * (wide + 0.03), pivotY, 0], [0, 0, Math.PI / 2]);
    }
    // Coin box on the pedestal head, facing the viewer.
    add(turret, new THREE.BoxGeometry(0.17, 0.24, 0.11), body, [0, floor + 0.93, 0.14]);
    add(turret, new THREE.BoxGeometry(0.012, 0.06, 0.012), dark, [0.03, floor + 0.98, 0.197]);
    add(turret, new THREE.BoxGeometry(0.09, 0.05, 0.012), fitting, [-0.02, floor + 0.875, 0.197]);
    add(turret, new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), fitting, [-0.045, floor + 0.985, 0.2], [Math.PI / 2, 0, 0]);

    const head = new THREE.Group();
    head.position.set(0, pivotY, 0);
    head.rotation.x = { sea: 0.04, sky: 0.62, ground: -0.6, inland: 0.1 }[a.points] + (random() - 0.5) * 0.08;
    turret.add(head);
    let crown: P3 = [0, 0.11, 0];
    if (a.head === 'telescope') {
      const profile = [[0.001, -0.62], [0.118, -0.62], [0.125, -0.42], [0.09, -0.38], [0.085, 0.12], [0.1, 0.14], [0.1, 0.2], [0.06, 0.24], [0.055, 0.42], [0.07, 0.43], [0.07, 0.47], [0.001, 0.47]].map(([x, y]) => new THREE.Vector2(x, y));
      add(head, new THREE.LatheGeometry(profile, 24), body, [0, 0, 0], [Math.PI / 2, 0, 0]);
      add(head, new THREE.CylinderGeometry(0.105, 0.105, 0.012, 20), lens, [0, 0, -0.615], [Math.PI / 2, 0, 0]);
      add(head, new THREE.TorusGeometry(0.122, 0.014, 8, 24), fitting, [0, 0, -0.62]);
      add(head, new THREE.TorusGeometry(0.092, 0.014, 8, 24), fitting, [0, 0, -0.2]);
      add(head, new THREE.TorusGeometry(0.062, 0.012, 8, 20), fitting, [0, 0, 0.3]);
      add(head, new THREE.CylinderGeometry(0.045, 0.06, 0.05, 14), dark, [0, 0, 0.49], [Math.PI / 2, 0, 0]);
      add(head, new THREE.BoxGeometry(0.03, 0.1, 0.03), fitting, [0, 0.12, -0.1]);
      add(head, new THREE.SphereGeometry(0.03, 10, 8), fitting, [0, 0.18, -0.1]);
      crown = [0, 0.1, -0.35];
    } else {
      const shell = add(head, new THREE.SphereGeometry(1, 24, 16), body, [0, 0.02, -0.02]);
      shell.scale.set(0.21, 0.19, 0.3);
      add(head, new THREE.BoxGeometry(0.3, 0.2, 0.03), body, [0, 0.02, 0.26]);
      for (const side of [-1, 1]) {
        add(head, new THREE.CylinderGeometry(0.075, 0.085, 0.14, 18), body, [side * 0.095, 0.03, -0.3], [Math.PI / 2, 0, 0]);
        add(head, new THREE.CylinderGeometry(0.065, 0.065, 0.012, 18), lens, [side * 0.095, 0.03, -0.372], [Math.PI / 2, 0, 0]);
        add(head, new THREE.TorusGeometry(0.078, 0.012, 8, 20), fitting, [side * 0.095, 0.03, -0.37]);
        add(head, new THREE.CylinderGeometry(0.035, 0.045, 0.07, 12), dark, [side * 0.075, 0.05, 0.3], [Math.PI / 2, 0, 0]);
        add(head, new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10), fitting, [side * 0.24, -0.04, 0.1], [0, 0, Math.PI / 2]);
      }
      add(head, new THREE.BoxGeometry(0.2, 0.012, 0.3), fitting, [0, 0.2, -0.02]);
      crown = [0, 0.2, -0.02];
    }
    if (mood.wear > 0.35) {
      const scab = metal('#8a4a25', 0, 1, 0.5);
      for (let i = 0; i < Math.round(mood.wear * 9); i++) add(turret, new THREE.IcosahedronGeometry(0.025 + random() * 0.02, 0), scab, [Math.sin(i * 2.4) * 0.09, floor + 0.15 + random() * 0.8, Math.cos(i * 2.4) * 0.09]);
    }

    // Notices.
    if (a.tag === 'tag') {
      const card = s.label('OUT OF ORDER', 0.34, 0.15, [0, 0, 0], '#c21f1a', '#f6f1df');
      const hang = new THREE.Group();
      hang.add(card);
      card.position.set(0, -0.2, 0);
      add(hang, new THREE.CylinderGeometry(0.004, 0.004, 0.14, 4), dark, [0, -0.07, 0]);
      hang.position.set(0, pivotY - 0.1, 0.02);
      hang.rotation.set(0, (random() - 0.5) * 0.6, (random() - 0.5) * 0.3);
      turret.add(hang);
      hang.position.z = a.head === 'binocular' ? 0.3 : 0.2;
    } else if (a.tag === 'bag') {
      const bag = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#2f5fa8' : '#1f2226', roughness: 0.35, flatShading: true });
      const lump = add(head, new THREE.IcosahedronGeometry(1, 1), bag, a.head === 'binocular' ? [0, 0.02, 0] : [0, 0, 0.26]);
      lump.scale.set(a.head === 'binocular' ? 0.29 : 0.15, a.head === 'binocular' ? 0.25 : 0.14, a.head === 'binocular' ? 0.43 : 0.3);
      const tape = new THREE.MeshStandardMaterial({ color: '#d8c98a', roughness: 0.6 });
      add(head, new THREE.TorusGeometry(a.head === 'binocular' ? 0.27 : 0.125, 0.014, 6, 20), tape, a.head === 'binocular' ? [0, 0.02, -0.12] : [0, 0, 0.1]);
    } else if (a.tag === 'card') {
      const card = s.label('20p ONLY', 0.24, 0.16, [0, 0, 0], '#1d2733', '#f6f1df');
      turret.add(card);
      card.position.set(0.01, floor + 0.66, 0.105);
      card.rotation.z = (random() - 0.5) * 0.3;
    }

    // Left behind.
    if (a.left === 'gull') {
      const bird = new THREE.Group();
      const white = new THREE.MeshStandardMaterial({ color: '#f6f4ee', roughness: 0.7 }), grey = new THREE.MeshStandardMaterial({ color: '#9aa2a8', roughness: 0.7 }), beak = new THREE.MeshStandardMaterial({ color: '#f2b90f', roughness: 0.5 });
      add(bird, new THREE.SphereGeometry(1, 12, 8), white, [0, 0.14, 0]).scale.set(0.085, 0.085, 0.16);
      add(bird, new THREE.SphereGeometry(1, 12, 8), grey, [0, 0.16, -0.04]).scale.set(0.092, 0.06, 0.16);
      add(bird, new THREE.SphereGeometry(0.058, 10, 8), white, [0, 0.25, 0.12]);
      add(bird, new THREE.ConeGeometry(0.02, 0.08, 6), beak, [0, 0.245, 0.2], [Math.PI / 2, 0, 0]);
      for (const x of [-0.03, 0.03]) add(bird, new THREE.CylinderGeometry(0.006, 0.006, 0.08, 5), beak, [x, 0.03, 0]);
      bird.position.set(crown[0], crown[1] - 0.02, crown[2]);
      bird.rotation.y = random() * 6;
      bird.rotation.x = -head.rotation.x;
      head.add(bird);
    } else if (a.left === 'icecream') {
      const at: P3 = [-back[2] * 0.42 + back[0] * 0.1, floor, back[0] * 0.42 + back[2] * 0.1];
      s.cylinder(0.14, 0.17, 0.012, [at[0], at[1] + 0.006, at[2]], s.material('#fbf3df', { roughness: 0.3 }), 12).scale.set(1, 1, 0.7);
      s.ball([0.07, 0.045, 0.07], [at[0], at[1] + 0.035, at[2]], s.material(mood.cheer > 0.5 ? '#f6a8b4' : '#fbf3df', { roughness: 0.4 }), 10);
      const cone = s.mesh(new THREE.ConeGeometry(0.055, 0.2, 10), s.material('#d9a45a'), [at[0] + 0.08, at[1] + 0.07, at[2] + 0.03]);
      cone.rotation.set(0.3, 0, -1.2);
    } else if (a.left === 'scarf') {
      const wool = s.material(mood.warmth > 0.5 ? '#c9302a' : '#2c5fa8', { roughness: 1 });
      s.ring(0.105, 0.035, [0, floor + 0.72, 0], wool).rotation.x = Math.PI / 2;
      const blow = mix(0.2, 1.2, mood.energy);
      for (const [len, drop] of [[0.42, 0.1], [0.3, 0.22]] as const) {
        const tail = s.box([len, 0.11, 0.02], [0.1 + len / 2 * Math.cos(1 / blow * 0.6), floor + 0.7 - drop - len / 2 * Math.sin(1 / blow * 0.6) * 0.6, 0.06], wool);
        tail.rotation.z = -Math.min(1.3, 0.5 / blow) - drop;
      }
    } else if (a.left === 'coins') {
      const coin = new THREE.MeshStandardMaterial({ color: '#d9d2b8', metalness: 0.8, roughness: 0.3 });
      for (let i = 0; i < 4; i++) s.cylinder(0.032, 0.032, 0.012, [stepAt[0] + (random() - 0.5) * 0.18, floor + 0.226 + (i === 3 ? 0.012 : 0), stepAt[2] + (random() - 0.5) * 0.12], i % 2 ? coin : new THREE.MeshStandardMaterial({ color: '#c98f4a', metalness: 0.8, roughness: 0.35 }), 10);
    }

    // A loose head creaks in the wind when there is energy about.
    const loose = a.points === 'ground' ? 0.05 : 0.012, base = head.rotation.x, speed = mix(0.3, 2.4, mood.energy);
    return s.finish({ footprint: 0.7, update: (_dt, time) => { head.rotation.x = base + Math.sin(time * speed) * loose * mood.energy; } });
  },
});
