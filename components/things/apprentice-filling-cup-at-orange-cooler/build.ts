import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { type Build, HAT_COLOURS, type P, RAD, arm, boots, bow, drop, hardHat, leg, look, pick, pickSkin, vest, worldOf } from './site';

export default defineThing({
  questions: {
    cooler: choice('What colour is the cooler?', {
      orange: 'Orange with a white lid, the classic.',
      yellow: 'Yellow with a white lid.',
      blue: 'Blue with a white lid.',
      red: 'Red with a white lid.',
    }),
    overflow: noul('Is the cup overflowing, water running over his hand?'),
    doing: choice('What is he doing?', {
      filling: 'Crouched, pressing the spigot into a cup.',
      drinking: 'Crouched by the cooler, drinking the cup straight down.',
      carrying: 'Standing up with a cup in each hand, about to carry them off.',
      draining: 'Tipping the cooler forward to get the last of the water out.',
    }),
    build: choice('What is the apprentice like?', {
      skinny: 'Skinny, all wrists, the vest hanging off him.',
      stocky: 'Short and stocky.',
      gangly: 'Tall and gangly, folded up over the crate.',
    }),
    gloves: choice('What is on his hands?', {
      none: 'Bare hands.',
      leather: 'Yellow leather rigger gloves.',
      rubber: 'Bright orange rubber gloves.',
      one: 'One glove on, the other tucked in his belt.',
    }),
    second: noul('Does a second filled cup wait on the crate for someone else?'),
    stand: choice('What is the cooler standing on?', {
      crate: 'A rough wooden crate.',
      milk: 'A plastic milk crate.',
      blocks: 'Two concrete blocks.',
      bucket: 'An upturned bucket.',
    }),
    hat: choice('What colour is his hard hat?', {
      yellow: 'Yellow, a size too big.', white: 'White, a size too big.', orange: 'Orange, a size too big.', blue: 'Blue, a size too big.', green: 'Green, the new-starter colour.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    // ---- the stand and the cooler
    const standH = { crate: 0.42, milk: 0.3, blocks: 0.4, bucket: 0.36 }[a.stand];
    if (a.stand === 'crate') {
      const wood = s.material('#b89560', { roughness: 0.9 });
      s.box([0.5, standH, 0.5], [0, standH / 2, 0], s.material('#9a7a4a', { roughness: 0.95 }));
      for (let i = 0; i < 4; i++) { s.box([0.52, 0.07, 0.015], [0, 0.06 + i * 0.1, 0.255], wood); s.box([0.015, 0.07, 0.52], [0.255, 0.06 + i * 0.1, 0], wood); s.box([0.52, 0.07, 0.015], [0, 0.06 + i * 0.1, -0.255], wood); s.box([0.015, 0.07, 0.52], [-0.255, 0.06 + i * 0.1, 0], wood); }
    } else if (a.stand === 'milk') {
      const plastic = s.material(pick(random, ['#2b4f8a', '#b8302a', '#2f8a4a']), { roughness: 0.6 });
      s.box([0.36, standH, 0.36], [0, standH / 2, 0], plastic);
      for (let i = 0; i < 5; i++) for (const sign of [-1, 1]) { s.box([0.38, 0.012, 0.012], [0, 0.03 + i * 0.06, sign * 0.185], s.material('#1a1a1c')); s.box([0.012, 0.012, 0.38], [sign * 0.185, 0.03 + i * 0.06, 0], s.material('#1a1a1c')); }
    } else if (a.stand === 'blocks') {
      const block = s.material('#9a9a94', { roughness: 0.95 });
      for (let layer = 0; layer < 2; layer++) {
        const box = s.box([0.4, 0.19, 0.2], [0, 0.1 + layer * 0.2, 0], block);
        box.rotation.y = layer ? Math.PI / 2 : 0;
        for (const dx of [-0.1, 0.1]) { const hole = s.box([0.12, 0.2, 0.12], [layer ? 0 : dx, 0.1 + layer * 0.2, layer ? dx : 0], s.material('#5a5a56', { roughness: 1 })); hole.scale.set(1, 0.96, 1); }
      }
    } else {
      s.cylinder(0.14, 0.155, standH, [0, standH / 2, 0], s.material('#e8e6de', { roughness: 0.55 }), 18);
    }
    const coolerColour = { orange: '#f07a1a', yellow: '#f2c21c', blue: '#2b5fb8', red: '#c8302a' }[a.cooler];
    const body = s.material(coolerColour, { roughness: 0.5 });
    const white = s.material('#f2f1ea', { roughness: 0.5 });
    const cooler = new THREE.Group();
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.5, 24), body);
    tank.position.y = 0.25;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.205, 0.07, 24), white);
    lid.position.y = 0.535;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 24), white);
    foot.position.y = 0.015;
    for (const mesh of [tank, lid, foot]) { mesh.castShadow = mesh.receiveShadow = true; cooler.add(mesh); }
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI), white);
    handle.position.set(0, 0.57, 0);
    handle.rotation.y = Math.PI / 2;
    cooler.add(handle);
    // The push-button spigot at the foot of the front.
    const spigot = new THREE.Group();
    spigot.position.set(0, 0.08, 0.19);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 10), white);
    stem.rotation.x = Math.PI / 2;
    stem.position.z = 0.03;
    const button = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.04), s.material('#2b5fb8', { roughness: 0.5 }));
    button.position.set(0, 0.03, 0.05);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), white);
    nozzle.position.set(0, -0.02, 0.06);
    stem.castShadow = button.castShadow = true;
    spigot.add(stem, button, nozzle);
    cooler.add(spigot);
    // The sleeve of cups taped to the lid.
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.32, 14), s.material('#f8f7f2', { roughness: 0.7 }));
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.set(0, 0.615, -0.03);
    sleeve.castShadow = true;
    cooler.add(sleeve);
    for (const x of [-0.08, 0.08]) {
      const tape = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.006, 6, 18), s.material('#8a8c8e', { roughness: 0.5 }));
      tape.rotation.y = Math.PI / 2;
      tape.position.set(x, 0.615, -0.03);
      cooler.add(tape);
    }
    cooler.position.y = standH;
    const draining = a.doing === 'draining';
    if (draining) { cooler.rotation.x = 0.32; cooler.position.z = 0.03; }
    s.root.add(cooler);
    s.root.updateMatrixWorld(true);
    const nozzleAt = nozzle.getWorldPosition(new THREE.Vector3());

    // ---- the apprentice
    const H = { skinny: mix(1.68, 1.78, random()), stocky: mix(1.58, 1.66, random()), gangly: mix(1.84, 1.94, random()) }[a.build];
    const build: Build = ({ skinny: 'slight', stocky: 'heavy', gangly: 'slight' } as const)[a.build];
    const crouched = a.doing === 'filling' || a.doing === 'drinking';
    const person = figure(s, {
      height: H, build, style: 'doll', pose: crouched ? 'crouching' : 'standing', hair: 'none', skin: pickSkin(random),
      top: pick(random, ['#8a8c8e', '#3a4a6a', '#d9d6cc', '#5b7a9c']), bottom: '#3f4a5c', shoes: '#5a4030', sleeves: 'short',
    });
    s.root.add(person.root);
    const cupSide = random() < 0.5 ? 'right' : 'left';
    const other = cupSide === 'right' ? 'left' : 'right';
    if (a.doing === 'filling') {
      arm(person, cupSide, { forward: 62, out: 6, bend: 38, across: 10 });
      arm(person, other, { forward: 86, out: 12, bend: 30, across: 12 });
      look(person, 28, 0);
    } else if (a.doing === 'drinking') {
      arm(person, cupSide, { forward: 52, out: 10, bend: 140, across: 28 });
      arm(person, other, { forward: 40, out: 8, bend: 60, across: 10 });
      look(person, -24, 0);
    } else if (a.doing === 'carrying') {
      arm(person, 'left', { forward: 46, out: 6, bend: 78, across: 14 });
      arm(person, 'right', { forward: 46, out: 6, bend: 78, across: 14 });
      leg(person, 'left', { forward: -6, out: 3 });
      leg(person, 'right', { forward: 14, out: 3, knee: 18 });
      look(person, 4, 0);
    } else {
      bow(person, 24);
      arm(person, 'left', { forward: 54, out: 10, bend: 16, across: 0 });
      arm(person, 'right', { forward: 54, out: 10, bend: 16, across: 0 });
      look(person, 36, 0);
    }
    person.settle();
    person.root.rotation.y = Math.PI;
    person.root.position.set(0, 0, 0.8);
    drop(person);
    // Slide the figure so the cup hand lands under the spigot, or the hands land on the lid.
    if (a.doing === 'filling' || a.doing === 'drinking') {
      const hand = worldOf(person.hands[a.doing === 'filling' ? cupSide : other]);
      const target = a.doing === 'filling' ? new THREE.Vector3(nozzleAt.x + (cupSide === 'right' ? -0.03 : 0.03), nozzleAt.y - 0.09, nozzleAt.z + 0.06) : new THREE.Vector3(nozzleAt.x + 0.18, hand.y, nozzleAt.z + 0.12);
      person.root.position.add(new THREE.Vector3(target.x - hand.x, 0, target.z - hand.z));
      person.root.position.y += Math.max(0, target.y - hand.y) * (a.doing === 'filling' ? 0 : 0);
    } else if (draining) {
      const hand = worldOf(person.hands.left);
      const lidAt = lid.getWorldPosition(new THREE.Vector3());
      person.root.position.add(new THREE.Vector3(0, 0, lidAt.z + 0.08 - hand.z));
    } else {
      person.root.rotation.y = Math.PI + 0.9 * (random() < 0.5 ? 1 : -1);
      person.root.position.set(0.55 * (random() < 0.5 ? 1 : -1), 0, 0.55);
    }
    drop(person);
    hardHat(s, person, H, HAT_COLOURS[a.hat], { scale: 1.22, tilt: a.doing === 'drinking' ? 10 : -8, turn: (random() - 0.5) * 14 });
    vest(s, person, H, build, pick(random, ['#ff7a14', '#f0ff2a']));
    boots(s, person, H);
    // Gloves: recolour the hands, or tuck one in the belt.
    const gloveColour = a.gloves === 'leather' ? '#e8c25a' : a.gloves === 'rubber' ? '#f07a1a' : null;
    if (gloveColour || a.gloves === 'one') {
      const glove = s.material(gloveColour ?? '#e8c25a', { roughness: 0.85 });
      for (const side of ['left', 'right'] as const) {
        if (a.gloves === 'one' && side !== cupSide) continue;
        const wrist = person.hands[side].parent as THREE.Object3D;
        const hand = wrist.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh | undefined;
        if (hand) hand.material = glove;
      }
      if (a.gloves === 'one') {
        const tucked = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.03), glove);
        tucked.position.set(H * 0.075 * 0.9, -0.02, 0.02);
        tucked.rotation.z = 0.3;
        tucked.castShadow = true;
        person.pelvis.add(tucked);
      }
    }
    person.root.updateMatrixWorld(true);

    // ---- cups and water
    const paper = s.material('#f8f7f2', { roughness: 0.7 });
    const water = new THREE.MeshPhysicalMaterial({ color: '#9fd4ff', transparent: true, opacity: 0.55, roughness: 0.05, depthWrite: false });
    const cupAt = (at: P, full: number) => {
      s.cylinder(0.038, 0.03, 0.095, at, paper, 14);
      if (full > 0) s.cylinder(0.034, 0.034, 0.004, [at[0], at[1] + 0.045 * full, at[2]], s.material('#9fd4ff', { roughness: 0.1, transparent: true, opacity: 0.8 }), 14);
    };
    if (a.doing === 'filling') {
      const hand = worldOf(person.hands[cupSide]);
      cupAt([nozzleAt.x, hand.y + 0.03, nozzleAt.z + 0.045], a.overflow ? 1 : 0.6);
      // The stream from the nozzle into the cup.
      s.cylinder(0.005, 0.007, Math.max(0.02, nozzleAt.y - hand.y - 0.08), [nozzleAt.x, (nozzleAt.y + hand.y + 0.08) / 2, nozzleAt.z + 0.045], water, 8).castShadow = false;
      if (a.overflow) {
        s.cylinder(0.04, 0.03, 0.02, [nozzleAt.x, hand.y + 0.085, nozzleAt.z + 0.045], water, 12).castShadow = false;
        s.cylinder(0.004, 0.006, hand.y + 0.03, [nozzleAt.x + 0.02, (hand.y + 0.03) / 2, nozzleAt.z + 0.08], water, 6).castShadow = false;
        const puddle = s.cylinder(0.16, 0.16, 0.004, [nozzleAt.x + 0.02, 0.002, nozzleAt.z + 0.12], water, 20);
        puddle.castShadow = false;
      }
    } else if (a.doing === 'drinking') {
      const hand = worldOf(person.hands[cupSide]);
      const cup = s.cylinder(0.038, 0.03, 0.095, [hand.x, hand.y + 0.02, hand.z + 0.03], paper, 14);
      cup.rotation.x = -0.9;
    } else if (a.doing === 'carrying') {
      for (const side of ['left', 'right'] as const) { const hand = worldOf(person.hands[side]); cupAt([hand.x, hand.y + 0.025, hand.z + 0.02], 0.9); }
    } else {
      // Draining: a dribble from the nozzle into a cup on the ground.
      cupAt([nozzleAt.x, 0.0475, nozzleAt.z + 0.2], 0.3);
      s.cylinder(0.004, 0.005, nozzleAt.y - 0.1, [nozzleAt.x, (nozzleAt.y + 0.1) / 2, nozzleAt.z + 0.2], water, 6).castShadow = false;
    }
    if (a.second) {
      const edge = a.stand === 'bucket' ? 0.1 : a.stand === 'milk' ? 0.14 : 0.2;
      cupAt([edge * (cupSide === 'right' ? -1 : 1), standH + 0.0475, edge * 0.8], 1);
    }
    // A few crushed cups on the ground when the site is busy.
    const litter = Math.round(mood.density * 4 * mood.wear);
    for (let i = 0; i < litter; i++) {
      const crushed = s.cylinder(0.03, 0.025, 0.05, [(random() - 0.5) * 1.2, 0.02, 0.3 + random() * 0.6], paper, 10);
      crushed.rotation.set(random() * 2, random() * 3, 1.3);
    }

    // Turned so the cooler and the crouched figure sit side by side in the frame.
    s.root.rotation.y = 125 * RAD;
    const energy = mood.energy;
    const pressArm = a.doing === 'filling' ? person.joints.elbows[other] : null;
    const base = pressArm ? pressArm.rotation.x : 0;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (pressArm) pressArm.rotation.x = base + Math.sin(time * 2.2) * 0.04 * (0.2 + energy);
      },
    });
  },
});
