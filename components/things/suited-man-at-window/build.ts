import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix } from '@conjure/kit';

type P3 = [number, number, number];
const RAD = Math.PI / 180;

export default defineThing({
  questions: {
    suit: choice('What colour is the suit?', {
      charcoal: 'Charcoal grey, the anonymous business suit.',
      black: 'Black, funeral or formal.',
      navy: 'Navy blue.',
      grey: 'Light grey flannel.',
      cream: 'Cream linen, a man in a hot city.',
      brown: 'Chocolate brown, a little out of date.',
    }),
    tie: choice('What is at his collar?', {
      none: 'An open collar, no tie.',
      black: 'A narrow black tie.',
      red: 'A red tie.',
      blue: 'A blue tie.',
      loose: 'A dark tie pulled loose, top button open.',
    }),
    jacket: choice('Where is the jacket?', {
      on: 'On, buttoned.',
      shoulder: 'Hooked on a finger over his shoulder, shirt sleeves showing.',
      chair: 'Dropped over the back of a chair beside him.',
    }),
    holds: choice('What is in his free hand?', {
      phone: 'A phone held to his ear.',
      screen: 'A phone held low, its screen lighting his face as he reads it.',
      glass: 'A tumbler of whisky.',
      cigarette: 'A lit cigarette hanging at his side.',
      nothing: 'Nothing; the hand hangs loose.',
    }),
    looks: choice('Where is he looking?', {
      out: 'Out through the glass at the city.',
      back: 'Back over his shoulder at us.',
      down: 'Down at the street far below.',
    }),
    build: choice('What kind of figure is he?', {
      tall: 'Tall and very still, upright.',
      slight: 'A slight figure leaning one forearm on the glass.',
      broad: 'Broad and heavy, planted.',
    }),
    head: choice('What about his head?', {
      short: 'Short dark hair.',
      grey: 'Short grey hair.',
      bald: 'Shaved or bald.',
      hat: 'A brimmed hat still on indoors.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const suitTone = { charcoal: '#2c2e33', black: '#15151a', navy: '#1b2442', grey: '#737680', cream: '#cfc2a2', brown: '#4a3528' }[a.suit];
    const shirtTone = random() < 0.7 ? '#f1efe8' : '#cfdcea';
    const light = a.suit === 'cream' || a.suit === 'grey';
    const shoeTone = light || a.suit === 'brown' ? '#4a2f1e' : '#141416';
    const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b', '#c9986f'][Math.floor(random() * 6)];
    const H = { tall: 1.88, slight: 1.7, broad: 1.8 }[a.build];
    const turn = random() < 0.5 ? 0.55 : -0.55;
    const mirror = turn < 0;
    const action: 'left' | 'right' = turn > 0 ? 'left' : 'right';
    const other: 'left' | 'right' = action === 'left' ? 'right' : 'left';
    const jacketOn = a.jacket === 'on';
    const person = figure(s, {
      height: H, build: a.build === 'broad' ? 'heavy' : a.build === 'slight' ? 'slight' : 'average', style: 'doll',
      pose: 'standing', gaze: a.looks === 'back' ? 'over-shoulder' : a.looks === 'down' || a.holds === 'screen' ? 'down' : 'ahead',
      hair: a.head === 'bald' ? 'none' : a.head === 'hat' ? 'hat' : 'short',
      hairColor: a.head === 'grey' ? '#b9b5ae' : a.head === 'hat' ? (light ? '#4a3a2c' : '#1d1d20') : '#2a2320',
      skin, top: jacketOn ? suitTone : shirtTone, bottom: suitTone, shoes: shoeTone, sleeves: 'long', mirror,
    });
    s.root.add(person.root);
    const arm = (side: 'left' | 'right', forward: number, out: number, bend: number, inward: number) => {
      const sign = side === 'left' ? 1 : -1;
      person.joints.shoulders[side].rotation.set(-forward * RAD, 0, sign * out * RAD);
      person.joints.elbows[side].rotation.set(-bend * RAD, -sign * inward * RAD, 0);
    };
    // The free hand: phone to the ear, phone held low, a glass, or hanging.
    if (a.holds === 'phone') arm(action, 72, 6, 148, 22);
    else if (a.holds === 'screen') arm(action, -3, 12, 100, 30);
    else if (a.holds === 'glass') arm(action, -15, 12, 120, 15);
    else arm(action, 4, 6, 12, 0);
    // The other hand: in a pocket, hooking the jacket over the shoulder, or braced on the glass.
    if (a.jacket === 'shoulder') arm(other, 50, 46, 156, -13);
    else if (a.build === 'slight') arm(other, 90, 37, 100, 59);
    else arm(other, -25, 2, 78, 14);
    if (a.build === 'slight') person.joints.body.rotation.x = 0.1;
    if (a.build === 'tall') person.joints.spine.rotation.x = -0.03;
    person.settle();
    person.root.rotation.y = Math.PI + turn;
    person.root.updateMatrixWorld(true);

    // ---- collar and tie, lapels when the jacket is on -----------------------------------
    const chest = person.joints.spine;
    const torsoL = H * 0.28, depth = H * 0.036 * (a.build === 'broad' ? 1.3 : a.build === 'slight' ? 0.85 : 1) * 1.35 * (a.build === 'broad' ? 1.25 : 1);
    const inChest = (mesh: THREE.Mesh, at: P3) => { mesh.position.set(...at); chest.add(mesh); return mesh; };
    const shirt = s.material(shirtTone, { roughness: 0.8 });
    if (jacketOn) {
      inChest(s.box([0.1, torsoL * 0.62, 0.012], [0, 0, 0], shirt), [0, torsoL * 0.66, depth - 0.002]);
      const lapel = s.material(suitTone, { roughness: 0.55 });
      for (const side of [-1, 1]) { const l = inChest(s.box([0.06, torsoL * 0.5, 0.014], [0, 0, 0], lapel), [side * 0.055, torsoL * 0.68, depth + 0.004]); l.rotation.z = side * 0.22; }
      inChest(s.ball([0.012, 0.012, 0.012], [0, 0, 0], s.material('#1a1a1d'), 8), [0, torsoL * 0.42, depth + 0.006]);
    }
    if (a.tie !== 'none') {
      const tieTone = { black: '#141416', red: '#9a1c24', blue: '#24418f', loose: '#2a2a30', none: '#000' }[a.tie];
      const tie = inChest(s.box([0.055, torsoL * 0.58, 0.01], [0, 0, 0], s.material(tieTone, { roughness: 0.5 })), [a.tie === 'loose' ? 0.02 : 0, torsoL * 0.62, depth + 0.012]);
      if (a.tie === 'loose') tie.rotation.z = 0.12;
      inChest(s.box([0.045, 0.035, 0.014], [0, 0, 0], s.material(tieTone, { roughness: 0.5 })), [a.tie === 'loose' ? 0.03 : 0, torsoL * 0.92 - (a.tie === 'loose' ? 0.04 : 0), depth + 0.012]);
    }
    for (const side of [-1, 1]) { const c = inChest(s.box([0.05, 0.045, 0.012], [0, 0, 0], shirt), [side * 0.04, torsoL * 0.96, depth + 0.006]); c.rotation.z = -side * 0.5; }

    // ---- the jacket, when it is off --------------------------------------------------------
    const cloth = s.material(suitTone, { roughness: 0.6 });
    if (a.jacket === 'shoulder') {
      // The jacket hangs down the back from the hooked hand: a folded body, two empty sleeves and the collar.
      const sign = other === 'left' ? 1 : -1;
      const hook = new THREE.Group();
      hook.position.set(sign * H * 0.1, torsoL + 0.03, -depth - 0.03);
      hook.rotation.z = -sign * 0.12; hook.rotation.x = 0.08;
      chest.add(hook);
      const inHook = (mesh: THREE.Mesh, at: P3) => { mesh.position.set(...at); hook.add(mesh); return mesh; };
      inHook(s.box([0.24, 0.5, 0.045], [0, 0, 0], cloth), [0, -0.26, -0.02]);
      inHook(s.box([0.2, 0.42, 0.04], [0, 0, 0], cloth), [sign * 0.04, -0.3, -0.055]).rotation.y = sign * 0.3;
      for (const side of [-1, 1]) {
        const sleeve = inHook(s.mesh(new THREE.CapsuleGeometry(0.045, 0.36, 4, 8), cloth), [side * 0.13, -0.32, -0.03 + side * 0.01]);
        sleeve.rotation.z = side * 0.14;
      }
      inHook(s.box([0.2, 0.07, 0.09], [0, 0, 0], cloth), [0, 0.0, -0.02]);
      inHook(s.box([0.06, 0.1, 0.03], [0, 0, 0], shirt), [-sign * 0.02, -0.12, 0.005]);
    }
    if (a.jacket === 'chair') {
      const chair = new THREE.Group();
      const side = turn > 0 ? -1 : 1;
      chair.position.set(side * 0.62, 0, 0.12); chair.rotation.y = turn * 0.6;
      s.root.add(chair);
      const wood = s.material(random() < 0.5 ? '#3b2a20' : '#6a4a35', { roughness: 0.5 });
      const put = (mesh: THREE.Mesh, at: P3) => { mesh.position.set(...at); chair.add(mesh); return mesh; };
      put(s.box([0.42, 0.04, 0.42], [0, 0, 0], wood), [0, 0.45, 0]);
      for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) put(s.box([0.035, 0.45, 0.035], [0, 0, 0], wood), [x, 0.225, z]);
      for (const x of [-0.18, 0.18]) put(s.box([0.035, 0.42, 0.035], [0, 0, 0], wood), [x, 0.68, -0.19]);
      put(s.box([0.4, 0.1, 0.03], [0, 0, 0], wood), [0, 0.85, -0.19]);
      put(s.box([0.44, 0.26, 0.09], [0, 0, 0], cloth), [0, 0.8, -0.19]);
      put(s.box([0.4, 0.3, 0.05], [0, 0, 0], cloth), [0, 0.56, -0.24]).rotation.x = 0.1;
      put(s.box([0.36, 0.2, 0.05], [0, 0, 0], cloth), [0.02, 0.6, -0.14]).rotation.x = -0.15;
    }

    // ---- what the free hand holds -------------------------------------------------------
    const hand = person.hands[action];
    const handAt = hand.getWorldPosition(new THREE.Vector3());
    const dark = s.material('#121316', { roughness: 0.35 });
    if (a.holds === 'phone' || a.holds === 'screen') {
      const phone = s.box([0.07, 0.14, 0.009], [0, 0, 0], dark);
      phone.position.set(0, 0.02, 0.022);
      hand.add(phone);
      if (a.holds === 'screen') {
        phone.rotation.x = -0.9;
        const screen = s.mesh(new THREE.PlaneGeometry(0.06, 0.12), new THREE.MeshStandardMaterial({ color: '#dfe9ff', emissive: '#9fc4ff', emissiveIntensity: 1.6 }), [0, 0, 0]);
        screen.position.set(0, 0.0, 0.0052); phone.add(screen);
      }
    } else if (a.holds === 'glass') {
      const clear = new THREE.MeshStandardMaterial({ color: '#f2f7f8', transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false });
      const at: P3 = [handAt.x, handAt.y - 0.02, handAt.z];
      s.cylinder(0.036, 0.032, 0.09, [at[0], at[1] + 0.045, at[2]], clear, 16);
      s.cylinder(0.034, 0.031, 0.035, [at[0], at[1] + 0.02, at[2]], s.material('#c8862a', { roughness: 0.1, emissive: '#7a4a10', emissiveIntensity: 0.3, transparent: true, opacity: 0.9, depthWrite: false }), 16);
      s.cylinder(0.036, 0.036, 0.006, [at[0], at[1] + 0.003, at[2]], clear, 16);
    } else if (a.holds === 'cigarette') {
      const cig = s.cylinder(0.004, 0.004, 0.08, [0, 0, 0], s.material('#f1ede4', { roughness: 0.9 }), 8);
      cig.position.set(0, -0.01, 0.035); cig.rotation.x = 0.7;
      hand.add(cig);
      const ember = s.ball([0.007, 0.007, 0.007], [0, 0, 0], new THREE.MeshStandardMaterial({ color: '#ff6a2a', emissive: '#ff4a10', emissiveIntensity: 3 }), 8);
      ember.position.set(0, -0.04, 0); cig.add(ember);
      for (let i = 0; i < 3; i++) {
        const puff = s.ball([0.02 + i * 0.012, 0.02 + i * 0.012, 0.02 + i * 0.012], [handAt.x + (random() - 0.5) * 0.04, handAt.y + 0.08 + i * 0.08, handAt.z + 0.03], new THREE.MeshStandardMaterial({ color: '#d9d6cf', transparent: true, opacity: 0.28, depthWrite: false }), 8);
        puff.castShadow = false;
      }
    }

    const energy = mood.energy;
    const sway = mix(0.2, 1, energy);
    return s.finish({
      update: (dt, time) => {
        person.update(dt, time);
        person.root.rotation.y = Math.PI + turn + Math.sin(time * 0.35) * 0.015 * sway;
      },
    });
  },
});
