import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type FigureGaze, type FigureHair, mix, score } from '@conjure/kit';

export default defineThing({
  questions: {
    pose: choice('What are they doing?', {
      leaning: 'Leaning in, bent at the hips, peering closely at something.',
      pointing: 'Pointing at something with one arm out straight.',
      crossed: 'Standing with arms crossed, assessing.',
      crouched: 'Crouched low, looking at something near the floor.',
      hips: 'Hands on hips, head back, taking it all in.',
      walking: 'Striding past, mid-step.',
    }),
    holding: choice('What are they carrying?', {
      clipboard: 'A clipboard with a sheet of readings.',
      laptop: 'An open laptop balanced on the forearm.',
      coffee: 'A paper cup of coffee.',
      multimeter: 'A yellow handheld multimeter with a red probe lead.',
    }),
    coat: choice('What colour is the lab coat?', {
      white: 'A classic white lab coat.',
      blue: 'A pale blue coat.',
      grey: 'A grey work coat.',
      green: 'A dark green technician coat.',
    }),
    defenders: choice('What colour are the ear defenders?', {
      yellow: 'Bright safety yellow cups.',
      red: 'Red cups.',
      black: 'Black cups with a steel band.',
      orange: 'Orange cups.',
    }),
    eyes: choice('What is on their face?', {
      bare: 'Nothing, just dot eyes.',
      glasses: 'Round black-rimmed glasses.',
      goggles: 'Clear safety goggles on a strap.',
    }),
    hair: choice('What is their hair like?', {
      short: 'Short hair.', long: 'Long hair.', bun: 'Hair in a bun.', bald: 'Bald.', cap: 'A flat cap under the defenders.',
    }),
    looking: choice('Where are they looking?', {
      down: 'Down at what they hold or at the floor.',
      up: 'Up, at the top of something very tall.',
      ahead: 'Straight ahead at a screen or a gauge.',
      shoulder: 'Over the shoulder, at a colleague.',
    }),
    height: score('How tall are they?', ['A child-sized apprentice', 'Short', 'Average', 'Tall', 'Towering']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { random } = context;
    const H = mix(1.3, 2.0, a.height);
    const coatColour = { white: '#eef0ee', blue: '#aac7dc', grey: '#9ea3a6', green: '#2f5e4a' }[a.coat];
    const trousers = ['#2e3440', '#4a4c52', '#5a4b3c', '#2f3b57', '#6b6a62'][Math.floor(random() * 5)];
    const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b', '#c89270'][Math.floor(random() * 6)];
    const hair: FigureHair = a.hair === 'bald' ? 'none' : a.hair;
    const gaze = ({ down: 'down', up: 'up', ahead: 'ahead', shoulder: 'over-shoulder' } as const satisfies Record<typeof a.looking, FigureGaze>)[a.looking];
    const preset = { leaning: 'standing', pointing: 'pointing', crossed: 'arms-crossed', crouched: 'crouching', hips: 'hands-on-hips', walking: 'walking' } as const;
    const mirror = random() < 0.5;
    const person = figure(s, {
      height: H, style: 'doll', pose: preset[a.pose], gaze, hair, skin, mirror,
      top: coatColour, bottom: trousers, shoes: '#2a2a2c', sleeves: 'long',
      hairColor: ['#3b2a22', '#1d1b1a', '#8a6b4a', '#c9b48a', '#6e6a66'][Math.floor(random() * 5)],
    });
    s.root.add(person.root);
    const { joints } = person;
    if (a.pose === 'leaning') {
      // Bent at the hips, both hands up in front holding the thing, head craning in.
      joints.body.rotation.x = 0.28;
      joints.spine.rotation.x = 0.22;
      joints.neck.rotation.x += 0.15;
      for (const side of ['left', 'right'] as const) {
        joints.shoulders[side].rotation.x = -1.1;
        joints.elbows[side].rotation.x = -1.2;
        joints.elbows[side].rotation.y = (side === 'left' ? -1 : 1) * 0.35;
      }
      joints.hips.left.rotation.x = -0.1;
      joints.hips.right.rotation.x = 0.15;
      person.settle();
    }
    if (a.pose === 'crouched') {
      joints.neck.rotation.x += 0.2;
      person.settle();
    }
    person.root.updateMatrixWorld(true);

    // Lab coat: a skirt from the hips and lapels and a pen pocket on the chest.
    const coat = s.material(coatColour, { roughness: 0.75 });
    const coatDark = s.material(new THREE.Color(coatColour).multiplyScalar(0.82), { roughness: 0.75 });
    const limb = H * 0.036;
    const crouched = a.pose === 'crouched';
    const skirtL = crouched ? H * 0.1 : H * 0.24;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.1, H * (crouched ? 0.15 : 0.125), skirtL, 18, 1, true), new THREE.MeshStandardMaterial({ color: coat.color, roughness: 0.75, side: THREE.DoubleSide }));
    skirt.scale.z = 0.7;
    skirt.position.y = H * 0.035 - skirtL / 2 + 0.01;
    skirt.castShadow = true;
    person.pelvis.add(skirt);
    const torsoL = H * 0.28;
    for (const side of [-1, 1]) {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(H * 0.03, H * 0.085, H * 0.008), coatDark);
      lapel.position.set(side * H * 0.028, torsoL * 0.8, limb * 1.45);
      lapel.rotation.z = side * 0.45;
      joints.spine.add(lapel);
    }
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(H * 0.05, H * 0.05, H * 0.008), coatDark);
    pocket.position.set(-H * 0.055, torsoL * 0.62, limb * 1.42);
    joints.spine.add(pocket);
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.004, H * 0.004, H * 0.05, 6), s.material('#c8302c'));
    pen.position.set(-H * 0.062, torsoL * 0.66, limb * 1.46);
    joints.spine.add(pen);

    // Ear defenders: two cups and a band over the crown.
    const headR = H * 0.064;
    const cupColour = { yellow: '#f2c21b', red: '#c8302c', black: '#26282c', orange: '#f07a1a' }[a.defenders];
    const cup = s.material(cupColour, { roughness: 0.5 });
    const band = s.material(a.defenders === 'black' ? '#8a9096' : cupColour, { roughness: 0.5, metalness: a.defenders === 'black' ? 0.5 : 0 });
    for (const side of [-1, 1]) {
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.62, headR * 0.5, headR * 0.5, 16), cup);
      shell.rotation.z = Math.PI / 2;
      shell.position.set(side * headR * 1.12, headR * 0.02, headR * 0.05);
      shell.castShadow = true;
      person.head.add(shell);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.6, headR * 0.6, headR * 0.12, 16), s.material('#2a2a2c'));
      pad.rotation.z = Math.PI / 2;
      pad.position.set(side * headR * 0.86, headR * 0.02, headR * 0.05);
      person.head.add(pad);
    }
    const arc = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.2, headR * 0.09, 8, 24, Math.PI), band);
    arc.position.set(0, headR * 0.05, headR * 0.05);
    arc.castShadow = true;
    person.head.add(arc);

    // Glasses or goggles.
    if (a.eyes === 'glasses') {
      const rim = s.material('#1d1d1f', { roughness: 0.4 });
      for (const side of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.3, headR * 0.035, 6, 20), rim);
        lens.position.set(side * headR * 0.38, headR * 0.12, headR * 0.96);
        person.head.add(lens);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.04, headR * 0.04, headR * 0.9), rim);
        arm.position.set(side * headR * 0.7, headR * 0.15, headR * 0.5);
        person.head.add(arm);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.2, headR * 0.04, headR * 0.04), rim);
      bridge.position.set(0, headR * 0.15, headR * 0.98);
      person.head.add(bridge);
    } else if (a.eyes === 'goggles') {
      const goggle = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.5, headR * 0.55, headR * 0.35), new THREE.MeshPhysicalMaterial({ color: '#dff0ff', transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false }));
      goggle.position.set(0, headR * 0.12, headR * 0.88);
      person.head.add(goggle);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.06, headR * 0.06, 6, 24), s.material('#2a2a2c'));
      strap.rotation.x = Math.PI / 2;
      strap.position.y = headR * 0.12;
      person.head.add(strap);
    }

    // The prop, placed from the hands' positions in the figure's own space.
    person.root.updateMatrixWorld(true);
    const at = (object: THREE.Object3D) => s.root.worldToLocal(object.getWorldPosition(new THREE.Vector3()));
    const left = at(person.hands.left), right = at(person.hands.right);
    const headAt = at(person.head);
    const K = H / 1.7;
    const inHands = a.pose === 'leaning' || a.pose === 'crouched';
    const inOneHand = a.pose === 'pointing' || a.pose === 'walking';
    const pointingHand = mirror ? left : right;
    const freeHand = a.pose === 'pointing' ? (mirror ? right : left) : (mirror ? left : right);
    void pointingHand;
    const feetAt = at(person.pelvis);
    feetAt.y = 0;
    const prop = new THREE.Group();
    s.root.add(prop);
    const build = (what: typeof a.holding) => {
      const g = new THREE.Group();
      if (what === 'clipboard') {
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.23 * K, 0.32 * K, 0.012 * K), s.material('#7a5a3a', { roughness: 0.7 }));
        const paper = new THREE.Mesh(new THREE.BoxGeometry(0.21 * K, 0.29 * K, 0.004 * K), s.material('#f2f0e8', { roughness: 0.9 }));
        paper.position.set(0, -0.01 * K, 0.008 * K);
        const clip = new THREE.Mesh(new THREE.BoxGeometry(0.1 * K, 0.035 * K, 0.025 * K), s.material('#b8bcc0', { metalness: 0.7, roughness: 0.3 }));
        clip.position.set(0, 0.145 * K, 0.01 * K);
        const ink = s.material('#3a4a6a');
        for (let i = 0; i < 6; i++) {
          const line = new THREE.Mesh(new THREE.BoxGeometry((0.12 + random() * 0.06) * K, 0.006 * K, 0.002 * K), ink);
          line.position.set(-0.02 * K + random() * 0.02 * K, (0.09 - i * 0.035) * K, 0.011 * K);
          g.add(line);
        }
        g.add(board, paper, clip);
      } else if (what === 'laptop') {
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.32 * K, 0.018 * K, 0.22 * K), s.material('#3a3d42', { metalness: 0.4, roughness: 0.5 }));
        const lid = new THREE.Mesh(new THREE.BoxGeometry(0.32 * K, 0.21 * K, 0.01 * K), s.material('#3a3d42', { metalness: 0.4, roughness: 0.5 }));
        lid.position.set(0, 0.1 * K, -0.11 * K);
        lid.rotation.x = -0.25;
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.29 * K, 0.18 * K), new THREE.MeshStandardMaterial({ color: '#8fc4e8', emissive: '#3a8ac8', emissiveIntensity: 0.6, roughness: 0.4 }));
        screen.position.set(0, 0.1 * K, -0.104 * K);
        screen.rotation.x = -0.25;
        const keys = new THREE.Mesh(new THREE.BoxGeometry(0.26 * K, 0.004 * K, 0.1 * K), s.material('#25272b'));
        keys.position.set(0, 0.011 * K, 0.01 * K);
        g.add(base, lid, screen, keys);
      } else if (what === 'coffee') {
        const cupMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * K, 0.032 * K, 0.11 * K, 16), s.material('#f0ece2', { roughness: 0.8 }));
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.043 * K, 0.043 * K, 0.012 * K, 16), s.material('#3a2a22', { roughness: 0.6 }));
        lid.position.y = 0.06 * K;
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.041 * K, 0.037 * K, 0.04 * K, 16), s.material('#b89468', { roughness: 0.9 }));
        sleeve.position.y = -0.005 * K;
        g.add(cupMesh, lid, sleeve);
      } else {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.09 * K, 0.18 * K, 0.04 * K), s.material('#f2c21b', { roughness: 0.5 }));
        const face = new THREE.Mesh(new THREE.BoxGeometry(0.07 * K, 0.05 * K, 0.006 * K), s.material('#2a3a2a', { roughness: 0.4 }));
        face.position.set(0, 0.05 * K, 0.021 * K);
        const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * K, 0.025 * K, 0.01 * K, 16), s.material('#2a2a2c'));
        dial.rotation.x = Math.PI / 2;
        dial.position.set(0, -0.03 * K, 0.022 * K);
        g.add(body, face, dial);
      }
      g.traverse((node) => { if ((node as THREE.Mesh).isMesh) node.castShadow = true; });
      return g;
    };
    const item = build(a.holding);
    prop.add(item);
    const faceDir = new THREE.Vector3(0, 0, 1);
    if (inHands) {
      // Between both hands, lifted a little, tilted back toward the face.
      const mid = left.clone().add(right).multiplyScalar(0.5);
      const toHead = headAt.clone().sub(mid);
      if (a.holding === 'clipboard') {
        prop.position.copy(mid).add(new THREE.Vector3(0, 0.1 * K, 0.02 * K));
        prop.rotation.x = -Math.atan2(toHead.z, toHead.y) * 0.5 - 0.3;
      } else if (a.holding === 'laptop') {
        prop.position.copy(mid).add(new THREE.Vector3(0, 0.02 * K, 0.02 * K));
      } else if (a.holding === 'coffee') {
        prop.position.copy(right).add(new THREE.Vector3(0, 0.02 * K, 0));
        const extra = build('clipboard');
        extra.position.copy(left).add(new THREE.Vector3(0, 0.1 * K, 0.02 * K));
        extra.rotation.set(-0.5, 0.3, 0.2);
        s.root.add(extra);
      } else {
        prop.position.copy(left).add(new THREE.Vector3(0, 0.06 * K, 0));
        prop.rotation.set(-0.6, 0.2, 0);
        s.tube([[left.x, left.y, left.z], [left.x * 0.5 + right.x * 0.5, left.y - 0.08 * K, left.z + 0.05 * K], [right.x, right.y - 0.02 * K, right.z + 0.02 * K]], 0.004 * K, s.material('#c8302c'));
        s.rod([right.x, right.y, right.z], [right.x, right.y - 0.03 * K, right.z + 0.1 * K], 0.005 * K, s.material('#c8302c'));
      }
    } else if (inOneHand) {
      // Hanging from the free hand by the side.
      if (a.holding === 'clipboard') {
        prop.position.copy(freeHand).add(new THREE.Vector3(0, -0.1 * K, 0.02 * K));
        prop.rotation.set(0, Math.PI / 2 + (freeHand.x < 0 ? Math.PI : 0), 0);
      } else if (a.holding === 'laptop') {
        prop.position.copy(freeHand).add(new THREE.Vector3(0, -0.12 * K, 0.02 * K));
        prop.rotation.set(0, Math.PI / 2, Math.PI / 2);
        prop.children[0].rotation.x = 0;
        (prop.children[0].children[1] as THREE.Mesh).position.set(0, 0.012 * K, -0.0 * K);
        (prop.children[0].children[1] as THREE.Mesh).rotation.x = Math.PI / 2;
        (prop.children[0].children[2] as THREE.Mesh).visible = false;
      } else if (a.holding === 'coffee') {
        prop.position.copy(freeHand).add(new THREE.Vector3(0, 0.0, 0));
      } else {
        prop.position.copy(freeHand).add(new THREE.Vector3(0, -0.06 * K, 0.01 * K));
        prop.rotation.set(0.2, 0, 0);
      }
    } else {
      // Arms busy: the thing waits on the floor beside the feet.
      const side = feetAt.x + (mirror ? -1 : 1) * 0.3 * K;
      if (a.holding === 'clipboard') {
        prop.position.set(side, 0.155 * K, feetAt.z - 0.04 * K);
        prop.rotation.set(-0.35, 0.3, 0);
      } else if (a.holding === 'laptop') {
        prop.position.set(side, 0.009 * K, feetAt.z + 0.1 * K);
        prop.rotation.y = 0.5;
        (prop.children[0].children[1] as THREE.Mesh).rotation.x = -0.4;
        (prop.children[0].children[2] as THREE.Mesh).rotation.x = -0.4;
      } else if (a.holding === 'coffee') {
        prop.position.set(side, 0.055 * K, feetAt.z + 0.12 * K);
      } else {
        prop.position.set(side, 0.02 * K, feetAt.z + 0.1 * K);
        prop.rotation.set(-Math.PI / 2 + 0.3, 0.4, 0);
      }
    }
    void faceDir;
    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});
