import * as THREE from 'three';
import { type Figure, Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { at, ground, joints, poseArm, poseLeg } from './pose';

const SUIT = { black: '#1c1b1f', brown: '#5a4634', navy: '#22304a' } as const;

export default defineThing({
  questions: {
    holds: choice('What does he hold against his chest?', {
      cap: 'His flat tweed cap, in both hands.',
      hat: 'A black felt hat held by the brim.',
      flowers: 'A bunch of wildflowers from the ditch, tied with twine.',
      card: 'A mass card in a white envelope, held like a ticket.',
    }),
    suit: choice('What colour is the Sunday suit?', {
      black: 'Black, the one for funerals.',
      brown: 'Brown, from the wedding years ago, too tight now.',
      navy: 'Navy, the good one.',
    }),
    stance: choice('How does he stand?', {
      shifting: 'Weight on one leg, the other foot turned out, shifting.',
      planted: 'Feet planted wide, immovable, like a man at a mart.',
      shrinking: 'Toes turned in, shoulders hunched, trying to take up less room.',
    }),
    gaze: choice('Where is he looking?', {
      floor: 'At the floor, at his own boots.',
      ahead: 'Straight ahead, jaw set.',
      aside: 'Sideways toward the door, wondering when he can go.',
    }),
    muddy: noul('Are his boots muddy from the yard?'),
    son: noul('Does a younger son stand beside him, copying the stance?'),
    hair: choice('What about his hair?', {
      slicked: 'Dark hair slicked flat with water for the occasion.',
      bald: 'Bald on top and sunburnt, a pale band where the cap sits.',
      thatch: 'A grey thatch that will not lie down.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const skin = pick(['#e0b8a0', '#d9a88a', '#c99a78', '#e8c4a8']);
    const suit = SUIT[a.suit];
    const white = s.material('#f3f1ea', { roughness: 0.8 });
    const tweed = s.material(pick(['#5a4a38', '#6b6456', '#4a4a44']), { roughness: 1 });
    const felt = s.material('#141316', { roughness: 0.8 });

    /** A standing man in a tight suit, hands together at the chest; the son is the same at a smaller height. */
    const stander = (H: number, build: 'heavy' | 'average', young: boolean) => {
      const person = figure(s, {
        height: H, build, style: 'doll', pose: 'standing', skin, sleeves: 'long',
        gaze: a.gaze === 'floor' ? 'down' : a.gaze === 'aside' ? (random() < 0.5 ? 'left' : 'right') : 'ahead',
        hair: a.hair === 'bald' && !young ? 'none' : 'short',
        hairColor: young ? pick(['#3b2a22', '#6b4a2e', '#a04a2a']) : a.hair === 'thatch' ? '#9a948a' : '#1f1611',
        top: suit, bottom: suit, shoes: '#2a211b',
      });
      s.root.add(person.root);
      const pose = { forward: 38, out: 4, bend: 108, inward: 52 };
      poseArm(person, 'left', pose);
      poseArm(person, 'right', { ...pose, inward: 48 });
      if (a.stance === 'shifting') {
        poseLeg(person, 'left', { forward: 0, out: 2 });
        poseLeg(person, 'right', { forward: 6, out: 14, knee: 12 });
        person.pelvis.parent!.rotation.z = 0.035;
      } else if (a.stance === 'planted') {
        poseLeg(person, 'left', { out: 12 });
        poseLeg(person, 'right', { out: 12 });
      } else {
        poseLeg(person, 'left', { out: -4 });
        poseLeg(person, 'right', { out: -4 });
      }
      const { spine, neck, shoulder } = joints(person, 'left');
      if (a.stance === 'shrinking') { spine.rotation.x = -0.16; neck.rotation.x -= 0.1; }
      ground(person);
      const torsoL = H * 0.28;
      const limb = H * 0.036 * (build === 'heavy' ? 1.3 : 1);
      const front = limb * 1.35 * (build === 'heavy' ? 1.25 : 1);
      // The shirt shows in a V at the chest with a narrow black tie; the sleeves stop short of the cuffs.
      const vee = new THREE.Mesh(new THREE.BoxGeometry(0.075, torsoL * 0.36, 0.008), white);
      vee.position.set(0, torsoL * 0.8, front - 0.001);
      spine.add(vee);
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.03, torsoL * 0.42, 0.006), s.material('#111113', { roughness: 0.6 }));
      tie.position.set(0, torsoL * 0.72, front + 0.006);
      spine.add(tie);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.0, 0.01, 6, 18), white);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = torsoL + 0.004;
      spine.add(collar);
      for (const side of ['left', 'right'] as const) {
        const cuff = new THREE.Mesh(new THREE.TorusGeometry(limb * 0.85, 0.008, 6, 14), white);
        cuff.rotation.x = Math.PI / 2;
        cuff.position.y = 0.012;
        joints(person, side).wrist.add(cuff);
      }
      // Buttons straining across the belly.
      const button = s.material('#2a2320', { roughness: 0.4 });
      for (let i = 0; i < 2; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), button);
        b.position.set(0.012, torsoL * (0.28 + i * 0.16), front + 0.003);
        spine.add(b);
      }
      if (a.hair === 'bald' && !young) {
        const band = new THREE.Mesh(new THREE.SphereGeometry(H * 0.064 * 1.02, 16, 8, 0, Math.PI * 2, Math.PI * 0.28, Math.PI * 0.12), s.material('#f0d8c4', { roughness: 0.8, side: THREE.DoubleSide }));
        person.head.add(band);
      }
      void shoulder;
      return person;
    };

    const H = mix(1.82, 1.94, random());
    const man = stander(H, 'heavy', false);
    const hands = at(man.hands.left).add(at(man.hands.right)).multiplyScalar(0.5);

    // ---- what he holds against his chest
    const holdAt = (person: Figure, scale: number) => {
      const h = at(person.hands.left).add(at(person.hands.right)).multiplyScalar(0.5);
      const prop = new THREE.Group();
      prop.position.set(h.x, h.y + 0.02 * scale, h.z + 0.03 * scale);
      prop.scale.setScalar(scale);
      s.root.add(prop);
      return prop;
    };
    const holding = (person: Figure, scale: number, kind: typeof a.holds) => {
      const prop = holdAt(person, scale);
      if (kind === 'cap') {
        const crown = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), tweed);
        crown.scale.y = 0.5;
        crown.rotation.x = Math.PI / 2;
        const peak = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.01), tweed);
        peak.position.set(0, -0.1, 0.0);
        peak.rotation.x = 0.2;
        crown.castShadow = peak.castShadow = true;
        prop.add(crown, peak);
      } else if (kind === 'hat') {
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.008, 24), felt);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.1, 20), felt);
        brim.rotation.x = Math.PI / 2;
        top.rotation.x = Math.PI / 2;
        top.position.z = 0.05;
        brim.castShadow = top.castShadow = true;
        prop.add(brim, top);
      } else if (kind === 'flowers') {
        const stem = s.material('#5a7a3a', { roughness: 0.9 });
        for (let i = 0; i < 7; i++) {
          const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.26, 6), stem);
          stalk.rotation.set((random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.4);
          stalk.position.set((random() - 0.5) * 0.03, 0.05, 0.02);
          prop.add(stalk);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), s.material(pick(['#f1e36b', '#f4f1e6', '#b75a9a', '#e8863a', '#6a8ad8']), { roughness: 0.8 }));
          head.position.set(stalk.position.x - Math.sin(stalk.rotation.z) * 0.13, 0.18 + (random() - 0.5) * 0.04, 0.02 + Math.sin(stalk.rotation.x) * 0.13);
          prop.add(head);
        }
        const twine = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 12), s.material('#c9b98a'));
        twine.rotation.x = Math.PI / 2;
        twine.position.set(0, -0.02, 0.02);
        prop.add(twine);
      } else {
        const envelope = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.006), white);
        envelope.rotation.x = -0.2;
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.04, 0.002), s.material('#8a7a3a', { metalness: 0.4 }));
        cross.position.set(-0.04, 0.0, 0.004);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.008, 0.002), cross.material);
        bar.position.set(-0.04, 0.008, 0.004);
        envelope.add(cross, bar);
        envelope.castShadow = true;
        prop.add(envelope);
      }
    };
    holding(man, 1, a.holds);

    // ---- mud on the boots and the floor
    if (a.muddy) {
      const mud = s.material('#5a4530', { roughness: 1 });
      for (const side of ['left', 'right'] as const) {
        const foot = joints(man, side).ankle;
        for (let i = 0; i < 4; i++) {
          const splash = new THREE.Mesh(new THREE.SphereGeometry(0.012 + random() * 0.01, 6, 5), mud);
          splash.position.set((random() - 0.5) * 0.06, -0.02 + random() * 0.03, (random() - 0.5) * 0.1 + 0.05);
          foot.add(splash);
        }
        const print = at(foot);
        s.cylinder(0.05, 0.06, 0.004, [print.x + (random() - 0.5) * 0.05, 0.002, print.z + 0.03], mud, 10).scale.z = 1.6;
      }
    }

    // ---- the son, a head shorter, same stance, same cap
    let son: Figure | null = null;
    if (a.son) {
      const side = random() < 0.5 ? -1 : 1;
      const boy = stander(H * 0.66, 'average', true);
      boy.root.position.set(side * 0.46, 0, 0.06);
      boy.root.rotation.y = -side * 0.12;
      ground(boy);
      holding(boy, 0.66, a.holds === 'hat' ? 'cap' : a.holds);
      son = boy;
      void hands;
    }

    return s.finish({
      update(dt, time) {
        man.update(dt, time);
        son?.update(dt, time);
      },
    });
  },
});
