import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

export default defineThing({
  questions: {
    finish: choice('What is the cat made of?', {
      classic: 'Glossy white ceramic with calico patches, red collar and pink ears.',
      gold: 'Gaudy gold plate all over.',
      black: 'Black lacquer with gold trim, a ward against bad luck.',
      chrome: 'Bare polished chrome with panel seams, plainly a robot.',
      kintsugi: 'Old cracked ceramic mended with veins of gold, one ear chipped.',
      'pink-plastic': 'Cheap translucent pink plastic glowing from inside.',
    }),
    eye: choice('What is its one glowing eye like?', {
      red: 'A hard red laser dot, watching.',
      cyan: 'A cool cyan scanner ring.',
      amber: 'A warm amber lamp, friendly.',
      green: 'A sickly green night-vision glow.',
      dead: 'Burnt out: a dark cracked lens.',
    }),
    arm: choice('What is the waving arm doing?', {
      waving: 'Beckoning steadily, back and forth.',
      stuck: 'Stuck part-way, twitching against a jammed gear.',
      fallen: 'Fallen off: it lies on the shrine, wires trailing from the shoulder.',
      both: 'Both arms raised and waving, greedy for everything.',
    }),
    paw: choice('Which paw is raised?', {
      left: 'The left, calling in customers.',
      right: 'The right, calling in money.',
    }),
    offering: choice('What offering sits before it?', {
      oranges: 'A little pyramid of mandarin oranges.',
      incense: 'Sticks of incense smouldering in a bowl of ash.',
      coins: 'A scatter of coins and a folded banknote.',
      sake: 'A flask of rice wine with two tiny cups.',
      cigarettes: 'An opened pack of cigarettes and a lighter.',
      'noodle-cup': 'A cup of instant noodles with the lid peeled back.',
      batteries: 'Batteries and a memory chip: offerings a machine might want.',
      nothing: 'Nothing at all: the shrine is bare.',
    }),
    shrine: choice('What is the shrine?', {
      'red-shelf': 'A red lacquer stand with gold trim and a tiny gate behind.',
      counter: 'A corner of worn wooden counter with a square of red felt.',
      crate: 'An upturned plastic bottle crate with a cardboard backdrop.',
      niche: 'A tiled alcove box with a strip of light across the top.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const on = <T extends THREE.Object3D>(group: THREE.Object3D, mesh: T) => { group.add(mesh); return mesh; };
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    const look = {
      classic: { body: '#f4f1ea', metal: 0, rough: 0.22, trim: '#c8202a', ear: '#f2a0b4' },
      gold: { body: '#d9a92e', metal: 0.85, rough: 0.25, trim: '#c8202a', ear: '#b9821a' },
      black: { body: '#1b1a1e', metal: 0.1, rough: 0.2, trim: '#d9a92e', ear: '#d9a92e' },
      chrome: { body: '#ccd3d8', metal: 0.85, rough: 0.16, trim: '#2a2c31', ear: '#2a2c31' },
      kintsugi: { body: '#e6dfcf', metal: 0, rough: 0.5, trim: '#8a2a2a', ear: '#d6a9a0' },
      'pink-plastic': { body: '#f78ac0', metal: 0, rough: 0.3, trim: '#ffffff', ear: '#ffd0e6' },
    }[a.finish];
    const body = s.material(look.body, { metalness: look.metal, roughness: look.rough, emissive: a.finish === 'pink-plastic' ? '#ff4fa0' : '#000000', emissiveIntensity: a.finish === 'pink-plastic' ? 0.35 : 0 });
    const trim = s.material(look.trim, { roughness: 0.5 });
    const gold = s.material('#e0b23a', { metalness: 0.8, roughness: 0.28 });
    const dark = s.material('#17171a', { roughness: 0.5 });
    const brass = s.material('#b98a35', { metalness: 0.7, roughness: 0.35 });
    const eyeColour = { red: '#ff2a2a', cyan: '#2fe6ff', amber: '#ffb030', green: '#6dff3a', dead: '#1a1a1c' }[a.eye];
    const glow = new THREE.MeshStandardMaterial({ color: eyeColour, emissive: a.eye === 'dead' ? '#000000' : eyeColour, emissiveIntensity: 2, roughness: 0.2 });

    // --- Shrine -----------------------------------------------------------------------------
    let top = 0.05;
    const W = 0.46, D = 0.4;
    let strip: THREE.MeshStandardMaterial | null = null;
    if (a.shrine === 'red-shelf') {
      const lacquer = s.material('#b3202a', { roughness: 0.3 });
      s.box([W, 0.035, D], [0, 0.0175, 0], lacquer);
      s.box([W - 0.06, 0.03, D - 0.06], [0, 0.05, 0], lacquer);
      s.box([W + 0.01, 0.006, D + 0.01], [0, 0.036, 0], gold);
      top = 0.065;
      for (const x of [-0.19, 0.19]) { s.cylinder(0.012, 0.014, 0.48, [x, 0.275, -0.165], lacquer, 10); }
      s.box([0.48, 0.022, 0.03], [0, 0.51, -0.165], lacquer);
      s.box([0.4, 0.016, 0.022], [0, 0.455, -0.165], lacquer);
      s.box([0.52, 0.012, 0.04], [0, 0.527, -0.165], dark);
    } else if (a.shrine === 'counter') {
      s.box([W + 0.1, 0.05, D + 0.06], [0, 0.025, 0], s.material('#8a5d38', { roughness: 0.75 }));
      for (let i = 0; i < 4; i++) s.box([W + 0.1, 0.001, 0.003], [0, 0.0505, -0.15 + i * 0.1 + random() * 0.02], s.material('#5a3b22'));
      s.box([0.36, 0.006, 0.32], [0, 0.053, -0.01], s.material('#b3202a', { roughness: 1 })).rotation.y = (random() - 0.5) * 0.15;
      top = 0.056;
    } else if (a.shrine === 'crate') {
      const plastic = s.material(mood.warmth > 0.5 ? '#d9a21e' : '#2a62a8', { roughness: 0.6 });
      top = 0.2;
      s.box([W, 0.02, D], [0, top - 0.01, 0], plastic);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.03, top, 0.03], [x * (W / 2 - 0.015), top / 2, z * (D / 2 - 0.015)], plastic);
      for (const y of [0.02, 0.1]) { for (const z of [-1, 1]) s.box([W, 0.03, 0.012], [0, y, z * (D / 2 - 0.006)], plastic); for (const x of [-1, 1]) s.box([0.012, 0.03, D], [x * (W / 2 - 0.006), y, 0], plastic); }
      const board = s.box([0.42, 0.4, 0.006], [0, top + 0.2, -0.19], s.material('#b58a55', { roughness: 0.95 })); board.rotation.x = -0.06;
      const charm = s.label(pick(['福', '吉', '$$$', '千客']), 0.12, 0.12, [0.12, top + 0.31, -0.186], '#d9a92e', '#b3202a'); charm.rotation.z = Math.PI / 4;
    } else {
      const tile = s.material('#d9e2de', { roughness: 0.25 });
      s.box([W, 0.04, D], [0, 0.02, 0], tile);
      s.box([W, 0.44, 0.02], [0, 0.22, -D / 2 + 0.01], tile);
      for (const x of [-1, 1]) s.box([0.02, 0.44, D * 0.45], [x * (W / 2 - 0.01), 0.22, -D * 0.275], tile);
      s.box([W, 0.02, 0.08], [0, 0.45, -D / 2 + 0.04], s.material('#2a2c31'));
      for (let i = 1; i < 5; i++) s.box([W - 0.04, 0.002, 0.001], [0, 0.04 + i * 0.08, -D / 2 + 0.021], s.material('#9fb0aa'));
      for (let i = 1; i < 5; i++) s.box([0.002, 0.4, 0.001], [-W / 2 + i * W / 5, 0.24, -D / 2 + 0.021], s.material('#9fb0aa'));
      const stripColour = mood.warmth > 0.5 ? '#ffb86a' : '#ff5fd0';
      strip = new THREE.MeshStandardMaterial({ color: stripColour, emissive: stripColour, emissiveIntensity: 1.6 });
      s.box([W - 0.06, 0.012, 0.012], [0, 0.434, -D / 2 + 0.03], strip);
      top = 0.04;
    }

    // --- The cat ----------------------------------------------------------------------------
    const cat = new THREE.Group();
    cat.position.set(0, top, -0.07);
    cat.scale.setScalar(1.3);
    cat.rotation.y = (random() - 0.5) * 0.25;
    s.root.add(cat);
    on(cat, s.lathe([[0, 0], [0.07, 0], [0.092, 0.025], [0.098, 0.07], [0.085, 0.12], [0.06, 0.155], [0.04, 0.17]], body));
    const headY = 0.215;
    on(cat, s.ball([0.086, 0.074, 0.08], [0, headY, 0.005], body, 28));
    const chipped = a.finish === 'kintsugi' ? (random() < 0.5 ? -1 : 1) : 0;
    for (const side of [-1, 1]) {
      const tall = side === chipped ? 0.022 : 0.05;
      const ear = on(cat, s.mesh(new THREE.ConeGeometry(0.03, tall, 4), body, [side * 0.052, headY + 0.055 + tall / 2, 0])); ear.rotation.y = Math.PI / 4;
      if (side !== chipped) { const inner = on(cat, s.mesh(new THREE.ConeGeometry(0.018, 0.032, 4), s.material(look.ear), [side * 0.052, headY + 0.07, 0.009])); inner.rotation.y = Math.PI / 4; }
      on(cat, s.ball([0.03, 0.022, 0.036], [side * 0.05, 0.02, 0.075], body, 12)); // front feet
      on(cat, s.ball([0.04, 0.045, 0.055], [side * 0.08, 0.04, 0.0], body, 12)); // haunches
      for (let w = 0; w < 3; w++) on(cat, s.rod([side * 0.04, headY - 0.012, 0.07], [side * 0.105, headY - 0.002 + (w - 1) * 0.016, 0.06], 0.0012, a.finish === 'black' || a.finish === 'chrome' ? gold : dark));
    }
    // Face: one living lens, one painted eye.
    const lensSide = random() < 0.5 ? -1 : 1;
    on(cat, s.ring(0.019, 0.005, [lensSide * 0.034, headY + 0.012, 0.07], brass)).rotation.y = lensSide * 0.4;
    on(cat, s.ball([0.016, 0.016, 0.01], [lensSide * 0.034, headY + 0.012, 0.073], glow, 14));
    if (a.eye === 'dead') on(cat, s.rod([lensSide * 0.026, headY + 0.022, 0.082], [lensSide * 0.042, headY + 0.002, 0.082], 0.0015, s.material('#9a9a9a')));
    on(cat, s.ball([0.013, 0.017, 0.006], [-lensSide * 0.034, headY + 0.012, 0.072], a.finish === 'black' ? gold : dark, 12));
    on(cat, s.ball([0.008, 0.006, 0.006], [0, headY - 0.008, 0.083], s.material('#e2748c'), 8));
    for (const side of [-1, 1]) on(cat, s.ring(0.011, 0.0018, [side * 0.011, headY - 0.02, 0.079], a.finish === 'black' ? gold : dark, Math.PI)).rotation.z = Math.PI;
    // Collar, bell, tail.
    on(cat, s.ring(0.057, 0.009, [0, 0.163, 0.003], trim)).rotation.x = Math.PI / 2;
    on(cat, s.ball([0.019, 0.019, 0.019], [0, 0.148, 0.062], gold, 12));
    on(cat, s.box([0.012, 0.003, 0.004], [0, 0.14, 0.08], dark));
    on(cat, s.tube([[0, 0.02, -0.09], [0.03, 0.05, -0.115], [0.05, 0.1, -0.1], [0.04, 0.13, -0.085]], 0.014, body));
    // Calico patches, chrome seams or gold veins.
    const surface = (theta: number, y: number): [number, number, number] => { const r = y < 0.16 ? mix(0.098, 0.06, Math.max(0, (y - 0.07) / 0.09)) : Math.sqrt(Math.max(0.0004, 1 - ((y - headY) / 0.074) ** 2)) * 0.083; return [Math.sin(theta) * r, y, Math.cos(theta) * r + (y < 0.16 ? 0 : 0.005)]; };
    if (a.finish === 'classic') for (let i = 0; i < 4; i++) { const p = surface(1.2 + random() * 3.8, pick([0.06, 0.1, 0.23, 0.25])); on(cat, s.ball([0.03 + random() * 0.015, 0.025, 0.03], [p[0] * 0.93, p[1], p[2] * 0.93], s.material(pick(['#d9862a', '#2a2420']), { roughness: 0.25 }), 10)); }
    if (a.finish === 'chrome') { for (const y of [0.05, 0.11]) on(cat, s.ring(surface(0, y)[2] + 0.001, 0.002, [0, y, 0], dark)).rotation.x = Math.PI / 2; for (let i = 0; i < 6; i++) { const p = surface(i * 1.05, 0.08); on(cat, s.ball([0.004, 0.004, 0.004], [p[0] * 1.01, p[1], p[2] * 1.01], dark, 6)); } on(cat, s.rod([0.0, headY + 0.07, -0.02], [0.01, headY + 0.13, -0.03], 0.002, dark)); on(cat, s.ball([0.006, 0.006, 0.006], [0.01, headY + 0.13, -0.03], glow, 8)); }
    if (a.finish === 'kintsugi') for (let i = 0; i < 4; i++) {
      let theta = (random() - 0.5) * 2.4, y = i < 2 ? headY + 0.05 : 0.14;
      const points: [number, number, number][] = [];
      for (let k = 0; k < 5; k++) { const p = surface(theta, y); points.push([p[0] * 1.015, p[1], p[2] * 1.015]); theta += (random() - 0.5) * 0.5; y -= 0.022 + random() * 0.012; }
      on(cat, s.tube(points, 0.0022, gold));
    }
    // Coin slot on the crown, sometimes with a coin caught in it.
    on(cat, s.box([0.044, 0.004, 0.016], [0, headY + 0.0735, 0.005], brass));
    on(cat, s.box([0.03, 0.0045, 0.005], [0, headY + 0.0738, 0.005], dark));
    if (random() < 0.4 + mood.cheer * 0.3) on(cat, s.cylinder(0.014, 0.014, 0.003, [0.002, headY + 0.08, 0.005], gold, 14)).rotation.x = Math.PI / 2;

    // Arms.
    const raised = a.paw === 'left' ? 1 : -1; // the cat's left is the viewer's right
    const makeArm = (side: number) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.082, 0.132, 0.02);
      cat.add(shoulder);
      const hub = on(shoulder, s.cylinder(0.02, 0.02, 0.016, [0, 0, 0], brass, 12)); hub.rotation.z = Math.PI / 2;
      for (let t = 0; t < 8; t++) on(shoulder, s.box([0.012, 0.007, 0.007], [0, Math.cos(t * 0.785) * 0.022, Math.sin(t * 0.785) * 0.022], brass)).rotation.x = t * 0.785;
      const swing = new THREE.Group();
      shoulder.add(swing);
      on(swing, s.rod([side * 0.016, 0, 0], [side * 0.024, 0.095, 0.012], 0.019, body, 0.022));
      on(swing, s.ball([0.03, 0.033, 0.028], [side * 0.024, 0.122, 0.02], body, 12));
      for (let t = -1; t <= 1; t++) on(swing, s.ball([0.007, 0.011, 0.005], [side * 0.024 + t * 0.013, 0.13, 0.045], s.material('#e2748c'), 6));
      return { shoulder, swing };
    };
    const arms: { swing: THREE.Group; phase: number }[] = [];
    const sides = a.arm === 'both' ? [1, -1] : [raised];
    for (const side of sides) {
      const { shoulder, swing } = makeArm(side);
      if (a.arm === 'fallen') {
        swing.removeFromParent();
        swing.scale.setScalar(1.3); swing.position.set(side * 0.17, top + 0.03, 0.1 + random() * 0.03); swing.rotation.set(Math.PI / 2, 0, side * (0.8 + random() * 0.6));
        s.root.add(swing);
        for (const colour of ['#d8352c', '#f0c22a', '#2f7fd0']) on(shoulder, s.tube([[side * 0.012, 0, 0], [side * 0.04, 0.01 + random() * 0.02, 0.01], [side * (0.05 + random() * 0.02), -0.02 - random() * 0.03, 0.02]], 0.002, s.material(colour)));
      } else arms.push({ swing, phase: side === raised ? 0 : Math.PI });
    }
    // The resting paw holds a koban coin (unless both are raised: then it hangs from the collar).
    const koban = new THREE.Group();
    const plate = on(koban, s.cylinder(0.03, 0.03, 0.006, [0, 0, 0], gold, 20)); plate.rotation.x = Math.PI / 2; plate.scale.set(0.7, 1, 1);
    for (let i = 0; i < 3; i++) on(koban, s.box([0.022, 0.003, 0.002], [0, 0.012 - i * 0.012, 0.004], s.material('#7a5a14')));
    if (a.arm === 'both') { koban.position.set(0, 0.1, 0.098); }
    else {
      koban.position.set(-raised * 0.05, 0.085, 0.1); koban.rotation.z = -raised * 0.25;
      on(cat, s.rod([-raised * 0.085, 0.13, 0.03], [-raised * 0.07, 0.085, 0.085], 0.02, body, 0.022));
      on(cat, s.ball([0.024, 0.022, 0.022], [-raised * 0.068, 0.08, 0.09], body, 10));
    }
    koban.scale.setScalar(1.25);
    cat.add(koban);

    // --- Offerings ----------------------------------------------------------------------------
    const smoke: THREE.Mesh[] = [];
    const offer = (kind: string, ox: number, oz: number) => {
      const g = new THREE.Group();
      g.position.set(ox, top, oz); g.rotation.y = (random() - 0.5) * 0.6;
      s.root.add(g);
      if (kind === 'oranges') {
        const orange = s.material('#f08a1c', { roughness: 0.6 });
        on(g, s.cylinder(0.055, 0.045, 0.008, [0, 0.004, 0], s.material('#eee8da', { roughness: 0.3 }), 20));
        for (let i = 0; i < 3; i++) on(g, s.ball([0.022, 0.02, 0.022], [Math.cos(i * 2.1) * 0.023, 0.028, Math.sin(i * 2.1) * 0.023], orange, 12));
        on(g, s.ball([0.022, 0.02, 0.022], [0, 0.06, 0], orange, 12));
        on(g, s.ball([0.012, 0.002, 0.006], [0.006, 0.081, 0], s.material('#3f8a3a'), 6));
      } else if (kind === 'incense') {
        on(g, s.lathe([[0.02, 0], [0.035, 0.008], [0.04, 0.035], [0.036, 0.035], [0, 0.03]], s.material('#3a5a7a', { roughness: 0.4 })));
        const ember = new THREE.MeshStandardMaterial({ color: '#ff8a4a', emissive: '#ff5a1c', emissiveIntensity: 2 });
        for (let i = 0; i < 3; i++) {
          const lean = (i - 1) * 0.02, height = 0.1 + random() * 0.05;
          on(g, s.rod([lean * 0.3, 0.03, 0], [lean, 0.03 + height, (random() - 0.5) * 0.01], 0.0018, s.material('#6a4a3a')));
          on(g, s.ball([0.003, 0.003, 0.003], [lean, 0.03 + height, 0], ember, 6));
        }
        for (let i = 0; i < 5; i++) { const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#d9e0e4', transparent: true, opacity: 0.2, depthWrite: false })); puff.userData.at = [ox, top + 0.15, oz]; puff.scale.setScalar(0.001); s.root.add(puff); smoke.push(puff); }
      } else if (kind === 'coins') {
        for (let i = 0; i < 9; i++) on(g, s.cylinder(0.011, 0.011, 0.002, [(random() - 0.5) * 0.1, 0.002 + (i % 3) * 0.002, (random() - 0.5) * 0.05], i % 3 ? gold : s.material('#c9ced1', { metalness: 0.7, roughness: 0.3 }), 12));
        const note = on(g, s.box([0.07, 0.003, 0.034], [0.03, 0.006, 0.01], s.material('#7fae8a', { roughness: 0.9 }))); note.rotation.y = 0.5;
      } else if (kind === 'sake') {
        const china = s.material('#eee8da', { roughness: 0.3 });
        on(g, s.lathe([[0, 0], [0.022, 0], [0.027, 0.03], [0.022, 0.06], [0.009, 0.075], [0.009, 0.092], [0.014, 0.1]], china, [-0.03, 0, 0]));
        on(g, s.ring(0.024, 0.002, [-0.03, 0.035, 0], s.material('#2a4a8a'))).rotation.x = Math.PI / 2;
        for (const x of [0.02, 0.055]) on(g, s.lathe([[0.008, 0], [0.012, 0.004], [0.017, 0.02], [0.015, 0.02], [0, 0.008]], china, [x, 0, (random() - 0.5) * 0.03]));
      } else if (kind === 'cigarettes') {
        const pack = on(g, s.box([0.04, 0.062, 0.016], [-0.02, 0.009, 0], s.material(pick(['#c8202a', '#1f4a8a', '#e9e3d0']), { roughness: 0.5 }))); pack.rotation.x = Math.PI / 2 - 0.02;
        on(g, s.box([0.042, 0.004, 0.012], [-0.02, 0.018, -0.02], gold));
        for (let i = 0; i < 2; i++) { const cig = on(g, s.cylinder(0.003, 0.003, 0.055, [0.02 + i * 0.012, 0.004, 0.01 * i], s.material('#f1ede2'), 8)); cig.rotation.set(Math.PI / 2, 0, random() * 0.8); }
        on(g, s.box([0.014, 0.036, 0.008], [0.055, 0.018, -0.01], s.material('#39b8ff', { roughness: 0.2, transparent: true, opacity: 0.85 })));
        on(g, s.box([0.014, 0.008, 0.008], [0.055, 0.04, -0.01], s.material('#c9ced1', { metalness: 0.7 })));
      } else if (kind === 'noodle-cup') {
        on(g, s.lathe([[0, 0], [0.026, 0], [0.038, 0.075], [0.04, 0.075], [0.04, 0.08], [0, 0.08]], s.material('#f1ede2', { roughness: 0.6 })));
        on(g, s.cylinder(0.034, 0.03, 0.025, [0, 0.04, 0], s.material(pick(['#c8202a', '#d9a21e', '#2a62a8']), { roughness: 0.6 }), 20));
        const lid = on(g, s.cylinder(0.041, 0.041, 0.002, [0.01, 0.096, -0.01], s.material('#d9d9d4', { metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide }), 18)); lid.rotation.z = 0.7; lid.scale.x = 0.6;
        on(g, s.rod([-0.01, 0.07, 0.005], [-0.035, 0.14, 0.02], 0.002, s.material('#f1ede2')));
      } else if (kind === 'batteries') {
        for (let i = 0; i < 3; i++) {
          const battery = new THREE.Group(); battery.position.set(-0.035 + i * 0.02, 0.008, (random() - 0.5) * 0.02); battery.rotation.set(Math.PI / 2, 0, (random() - 0.5) * 0.5); g.add(battery);
          on(battery, s.cylinder(0.0075, 0.0075, 0.045, [0, 0, 0], s.material(pick(['#d9a21e', '#1b1a1e', '#2aa860']), { roughness: 0.4 }), 10));
          on(battery, s.cylinder(0.0076, 0.0076, 0.012, [0, 0.017, 0], s.material('#c9ced1', { metalness: 0.7 }), 10));
          on(battery, s.cylinder(0.003, 0.003, 0.004, [0, 0.0245, 0], s.material('#c9ced1', { metalness: 0.7 }), 8));
        }
        on(g, s.box([0.04, 0.004, 0.03], [0.045, 0.002, 0.005], s.material('#1f6b45', { roughness: 0.5 })));
        on(g, s.box([0.02, 0.005, 0.016], [0.045, 0.006, 0.005], dark));
        for (let i = 0; i < 5; i++) on(g, s.box([0.003, 0.002, 0.004], [0.031 + i * 0.007, 0.0045, 0.019], gold));
      }
    };
    const frontZ = D / 2 - 0.06 + (a.shrine === 'counter' ? 0.02 : 0);
    if (a.offering !== 'nothing') offer(a.offering, (random() - 0.5) * 0.05, frontZ);
    if (mood.density > 0.55) {
      const extras = ['oranges', 'coins', 'incense', 'sake', 'batteries'].filter((kind) => kind !== a.offering);
      offer(pick(extras), -0.15, frontZ - 0.02);
      if (mood.density > 0.8) offer(pick(extras), 0.15, frontZ - 0.01);
    }
    // A pair of little electric candles when there is any cheer to spare.
    const candleGlow = new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffb040', emissiveIntensity: 1.8 });
    if (mood.cheer > 0.3 || mood.density > 0.4) for (const x of [-0.185, 0.185]) {
      s.cylinder(0.011, 0.011, 0.05, [x, top + 0.025, 0.04], s.material('#c8202a', { roughness: 0.4 }), 10);
      const flame = s.ball([0.006, 0.011, 0.006], [x, top + 0.06, 0.04], candleGlow, 8); flame.castShadow = false;
    }

    const speed = mix(0.7, 2.6, mood.energy);
    const stuckAt = 0.25 + random() * 0.3;
    const pose = (time: number) => {
      for (const arm of arms) {
        const wave = Math.sin(time * speed + arm.phase);
        arm.swing.rotation.x = a.arm === 'stuck' ? stuckAt + (Math.sin(time * 31) > 0.6 ? 0.06 : 0) : 0.3 + wave * 0.38;
      }
    };
    pose(random() * 6);
    return s.finish({
      footprint: 0.3,
      update: (_dt, time) => {
        pose(time);
        if (a.eye !== 'dead') glow.emissiveIntensity = a.eye === 'red' ? 1.4 + (Math.sin(time * 3) > 0.9 ? 1.4 : 0) : 1.7 + 0.4 * Math.sin(time * 1.7);
        if (strip) strip.emissiveIntensity = 1.5 + (Math.sin(time * 17) * Math.sin(time * 3.1) > 0.7 ? -0.9 : 0);
        candleGlow.emissiveIntensity = 1.6 + 0.4 * Math.sin(time * 11) * Math.sin(time * 2.3);
        smoke.forEach((puff, index) => {
          const t = (time * 0.18 + index / smoke.length) % 1, at = puff.userData.at as number[];
          puff.position.set(at[0] + s.root.position.x * 0 + Math.sin(t * 6 + index) * 0.012, at[1] + t * 0.22, at[2] + Math.cos(t * 5) * 0.008);
          puff.scale.setScalar(0.006 + t * 0.022);
          (puff.material as THREE.MeshStandardMaterial).opacity = 0.32 * (1 - t);
        });
      },
    });
  },
});
