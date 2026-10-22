import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { paint, pickSkin, rig, worldOf } from './rig';

export default defineThing({
  questions: {
    suit: choice('What is he wearing?', {
      white: 'A white dinner jacket with black lapels and black trousers, nightclub smart.',
      black: 'A black tuxedo, satin lapels, a bit shiny at the knees.',
      checked: 'A loud checked blazer over dark trousers, a carnival barker in evening dress.',
    }),
    doing: choice('What is he doing?', {
      announcing: 'Announcing, one hand on the mic, the other arm flung wide to the room.',
      singing: 'Singing, both hands cupped round the microphone, head tipped back.',
      pointing: 'Pointing a finger at a couple on the floor, calling them out by number.',
      cigarette: 'Lighting a cigarette between announcements, the mic still in his other hand.',
    }),
    mic: choice('What kind of microphone is it?', {
      ribbon: 'A big radio-station ribbon microphone, a pill-shaped chrome block with a grille.',
      carbon: 'A bare carbon mic: a round capsule sprung inside a ring.',
    }),
    plate: choice('What does the square plate under the microphone say?', {
      kdmh: 'Station letters KDMH.',
      wjev: 'Station letters WJEV.',
      air: 'ON THE AIR.',
      none: 'No plate, just the bare stand.',
    }),
    hair: choice('What is his hair like?', {
      slicked: 'Black hair slicked flat and shining with brilliantine.',
      parted: 'Fair hair with a sharp side parting.',
      bald: 'Bald as an egg, the scalp shining under the bulbs.',
    }),
    build: choice('What is his build?', {
      lean: 'Lean and tall, all angles.',
      portly: 'Portly, the cummerbund working hard.',
    }),
    cue: noul('Is a cue card in his free hand?'),
    podium: noul('Does he stand on a low round podium step?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = a.build === 'lean' ? mix(1.8, 1.88, random()) : mix(1.7, 1.78, random());
    const wide = a.build === 'portly' ? 1.3 : 1;
    const limb = H * 0.036 * wide, torsoL = H * 0.28, shoulderW = H * 0.115 * wide, headR = H * 0.064;
    const chrome = s.material('#d9dde0', { metalness: 0.9, roughness: 0.22 });
    const black = '#17171b';
    const top = { white: '#f3f0e8', black, checked: '#ffffff' }[a.suit];
    const person = figure(s, {
      height: H, style: 'doll', build: a.build === 'portly' ? 'heavy' : 'slight', pose: 'standing', sleeves: 'long',
      hair: a.hair === 'bald' ? 'none' : 'short', hairColor: a.hair === 'slicked' ? '#0f0d0c' : '#c9a35a', skin: pickSkin(random),
      top, bottom: black, shoes: '#0c0c0e',
    });
    s.root.add(person.root);
    const r = rig(person);
    const torso = person.joints.spine.children.find((n) => (n as THREE.Mesh).isMesh) as THREE.Mesh;
    if (a.suit === 'checked') {
      const check = paint(64, 64, (c) => {
        const colours = pick([['#c9a24a', '#5a3a1a'], ['#b83a2a', '#2a2a3a'], ['#3a7a5a', '#e8e0c0']]);
        c.fillStyle = colours[0]; c.fillRect(0, 0, 64, 64);
        c.fillStyle = colours[1];
        for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) if (((x + y) / 16) % 2) c.fillRect(x, y, 16, 16);
      });
      check.wrapS = check.wrapT = THREE.RepeatWrapping;
      check.repeat.set(4, 5);
      const mat = new THREE.MeshStandardMaterial({ map: check, roughness: 0.8 });
      torso.material = mat;
      for (const side of ['left', 'right'] as const) {
        (person.joints.shoulders[side].children[0] as THREE.Mesh).material = mat;
        (person.joints.elbows[side].children[0] as THREE.Mesh).material = mat;
      }
    }
    if (a.hair === 'slicked') {
      const cap = person.head.children.find((n, i) => i > 0 && (n as THREE.Mesh).isMesh && n.scale.y > 1.05) as THREE.Mesh | undefined;
      if (cap) (cap.material as THREE.MeshStandardMaterial).roughness = 0.2;
    }
    if (a.hair === 'parted') {
      const line = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.06, headR * 0.05, headR * 1.1), s.material('#f1d2b6'));
      line.position.set(headR * 0.35, headR * 1.08, 0);
      line.rotation.z = -0.25;
      person.head.add(line);
    }
    // Shirt front, bow tie, lapels and (for the portly) a cummerbund.
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(H * 0.055, torsoL * 0.62, 0.012), s.material('#f6f3ea', { roughness: 0.6 }));
    shirt.position.set(0, torsoL * 0.6, limb * 1.36);
    const tie = new THREE.Group();
    for (const side of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.4, headR * 0.24, headR * 0.12), s.material(black)); wing.position.x = side * headR * 0.22; tie.add(wing); }
    tie.add(new THREE.Mesh(new THREE.BoxGeometry(headR * 0.12, headR * 0.15, headR * 0.15), s.material(black)));
    tie.position.set(0, torsoL * 0.97, limb * 1.3);
    person.joints.spine.add(shirt, tie);
    if (a.suit !== 'checked') for (const side of [-1, 1]) {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(H * 0.03, torsoL * 0.5, 0.01), s.material(a.suit === 'white' ? black : '#2a2a30', { roughness: 0.3 }));
      lapel.position.set(side * H * 0.045, torsoL * 0.62, limb * 1.38);
      lapel.rotation.z = side * 0.28;
      person.joints.spine.add(lapel);
    }
    if (a.build === 'portly') {
      const sash = new THREE.Mesh(new THREE.CylinderGeometry(limb * 1.5, limb * 1.5, torsoL * 0.16, 20, 1, true), s.material(pick(['#5a1a1a', '#1a1a1a', '#2a2a5a']), { roughness: 0.4, side: THREE.DoubleSide }));
      sash.scale.x = (shoulderW * 2) / (limb * 2.7) / 1.25;
      sash.position.y = torsoL * 0.12;
      person.joints.spine.add(sash);
    }

    // ---- the microphone stand in front of him
    const micY = 1.58 * (H / 1.8);
    const stand = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.025, 28), chrome);
    base.position.y = 0.0125;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, micY - 0.1, 12), chrome);
    pole.position.y = (micY - 0.1) / 2 + 0.02;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 12), chrome);
    collar.position.y = micY * 0.55;
    stand.add(base, pole, collar);
    if (a.plate !== 'none') {
      const text = { kdmh: 'KDMH', wjev: 'WJEV', air: 'ON THE AIR', none: '' }[a.plate];
      const map = paint(256, 160, (c) => {
        c.fillStyle = '#1b2230'; c.fillRect(0, 0, 256, 160);
        c.strokeStyle = '#d9d2b8'; c.lineWidth = 8; c.strokeRect(10, 10, 236, 140);
        c.fillStyle = '#efe6cc'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = `bold ${text.length > 5 ? 54 : 96}px sans-serif`;
        c.fillText(text, 128, 82);
      });
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.11, 0.018), [chrome, chrome, chrome, chrome, new THREE.MeshStandardMaterial({ map, roughness: 0.6 }), new THREE.MeshStandardMaterial({ color: '#1b2230' })] as unknown as THREE.Material);
      plate.position.set(0, micY - 0.17, 0.0);
      stand.add(plate);
    }
    const head = new THREE.Group();
    head.position.y = micY;
    if (a.mic === 'ribbon') {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.09, 4, 16), chrome);
      body.scale.z = 0.55;
      const grille = s.material('#5a5e62', { metalness: 0.6, roughness: 0.5 });
      for (let i = 0; i < 7; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.006, 0.062), grille);
        bar.position.y = -0.07 + i * 0.023;
        head.add(bar);
      }
      const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.006, 6, 20, Math.PI), chrome);
      yoke.rotation.z = Math.PI;
      yoke.position.y = -0.02;
      head.add(body, yoke);
    } else {
      const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 20), s.material('#2a2a2e', { metalness: 0.5, roughness: 0.4 }));
      capsule.rotation.x = Math.PI / 2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.006, 8, 28), chrome);
      head.add(capsule, ring);
      for (let i = 0; i < 4; i++) {
        const t = i * Math.PI / 2 + Math.PI / 4;
        const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.038, 6), chrome);
        spring.position.set(Math.cos(t) * 0.067, Math.sin(t) * 0.067, 0);
        spring.rotation.z = t + Math.PI / 2;
        head.add(spring);
      }
    }
    stand.add(head);
    stand.traverse((n) => { (n as THREE.Mesh).castShadow = (n as THREE.Mesh).receiveShadow = true; });
    stand.position.set(-0.04, 0, 0.44);
    s.root.add(stand);

    // ---- the pose: weight on one leg, hand on the mic, the other arm by the patter
    r.leg('right', { forward: 0, out: 3, knee: 0 });
    r.leg('left', { forward: 8, out: 14, knee: 14 });
    r.lean(5, -2);
    r.bow(2, 3);
    r.arm('right', { forward: 65, out: 15, bend: 80, across: 45 });
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.004), s.material('#efe6cc', { roughness: 0.9 }));
    card.castShadow = true;
    let ember: THREE.Mesh | null = null;
    if (a.doing === 'announcing') {
      r.arm('left', { forward: 25, out: 82, bend: 8, across: 0 });
      r.look(-8, 10, 0);
      if (a.cue) { card.position.set(0, -0.02, 0.03); card.rotation.x = -0.4; person.hands.left.add(card); }
    } else if (a.doing === 'singing') {
      r.arm('left', { forward: 65, out: 15, bend: 80, across: 45 });
      r.look(-22, 0, 0);
      r.lean(7, 0);
    } else if (a.doing === 'pointing') {
      r.arm('left', { forward: 88, out: 36, bend: 0, across: 0 });
      r.look(2, 34, 0);
      if (a.cue) { card.position.set(0, -0.02, 0.02); card.rotation.x = -0.9; person.hands.left.add(card); }
    } else {
      r.arm('left', { forward: 55, out: 25, bend: 140, across: 50 });
      r.look(6, -10, 0);
      const cig = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 8), s.material('#f4f1ea'));
      cig.position.set(0, -0.01, 0.04);
      cig.rotation.x = Math.PI / 2 - 0.5;
      ember = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshStandardMaterial({ color: '#ff7a30', emissive: '#ff5a10', emissiveIntensity: 2.2 }));
      ember.position.set(0, 0.01, 0.08);
      person.hands.left.add(cig, ember);
    }
    r.settle();
    person.root.position.set(0, 0, 0);
    r.settle(false);
    // Slide him so the mic hand rests on the microphone head.
    const hand = worldOf(person.hands.right);
    person.root.position.x += (stand.position.x + 0.02) - hand.x;
    person.root.position.z += (stand.position.z - 0.07) - hand.z;
    if (a.podium) {
      s.cylinder(0.55, 0.58, 0.1, [person.root.position.x, 0.05, person.root.position.z + 0.05], s.material(pick(['#5a1f24', '#2a2a30', '#3a2a1a']), { roughness: 0.7 }), 36);
      person.root.position.y += 0.1;
      stand.position.y += 0.1;
    }

    // The free arm gestures with the music; a lit cigarette pulses.
    const energy = mood.energy;
    const phase = random() * Math.PI * 2;
    const free = person.joints.shoulders.left, restFree = free.rotation.x, restOut = free.rotation.z;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (a.doing === 'announcing' || a.doing === 'pointing') {
          free.rotation.x = restFree + Math.sin(time * mix(1.2, 3.5, energy) + phase) * mix(0.02, 0.1, energy);
          free.rotation.z = restOut + Math.cos(time * mix(1.2, 3.5, energy) * 0.7 + phase) * mix(0.01, 0.06, energy);
        }
        if (ember) (ember.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.6 + Math.sin(time * 3 + phase) * 0.8;
      },
    });
  },
});
