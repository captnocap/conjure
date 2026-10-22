import * as THREE from 'three';
import { type Figure, Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { numberCard, pickSkin, rig, worldOf } from './rig';

export default defineThing({
  questions: {
    state: choice('What state is the dancer in?', {
      limp: 'Limp and flat on the boards, arms flung out, head rolled to the side.',
      stirring: 'Stirring: one knee drawing up, a hand lifting toward the bottle, the head turning.',
      pulled: 'Being hauled back up: half sitting, the nurse\'s arm behind the shoulders, head lolling.',
    }),
    who: choice('Who has gone down?', {
      girl: 'A girl in a faded cotton day dress and cheap heels.',
      vest: 'A man in a sweat-grey vest and braces, shirt long gone.',
      sleeves: 'A man in shirt-sleeves and a loosened tie.',
      gown: 'A girl in a thin satin gown, the sequins half fallen off.',
    }),
    holds: choice('What does the nurse hold to the dancer?', {
      salts: 'A small brown bottle of smelling salts under the nose.',
      water: 'A tin cup of water tipped to the lips.',
      cloth: 'A wet cloth pressed to the forehead.',
      pulse: 'Nothing: two fingers on the wrist, counting the pulse.',
    }),
    nurse: choice('What is the nurse like?', {
      young: 'Young and slight, cap askew, barely older than the dancer.',
      matron: 'A stout matron in a starched cap, unhurried, seen it all.',
      tall: 'Tall and bony, sleeves rolled, cap pinned straight.',
    }),
    number: choice('What number is on the dancer\'s card?', {
      four: 'Number 4.', nineteen: 'Number 19.', thirty: 'Number 30.', fifty: 'Number 55.', ninety: 'Number 91.',
    }),
    cape: noul('Does she wear a dark blue nurse\'s cape over the white dress?'),
    towel: noul('Does a towel hang over the nurse\'s shoulder?'),
    partner: noul('Does the dancer\'s partner stand over them, bent with hands on knees, waiting to see?'),
    cup: noul('Does a spilled tin cup lie beside them in its puddle?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const white = '#f4f2ea';
    const tin = s.material('#c9c4b4', { metalness: 0.6, roughness: 0.4 });

    // ---- the nurse, sitting back on her heels and bent over the dancer
    const Hn = { young: mix(1.56, 1.62, random()), matron: mix(1.58, 1.66, random()), tall: mix(1.7, 1.78, random()) }[a.nurse];
    const nurse = figure(s, {
      height: Hn, style: 'doll', pose: 'kneeling', build: a.nurse === 'matron' ? 'heavy' : 'slight', sleeves: a.nurse === 'tall' ? 'short' : 'long',
      hair: 'bun', hairColor: pick(['#3b2a22', '#6b4a2e', '#8a8378', '#1f1a18']), skin: pickSkin(random),
      top: white, bottom: white, shoes: '#e6e2d8',
    });
    s.root.add(nurse.root);
    const rn = rig(nurse);
    const pulled = a.state === 'pulled';
    rn.leg('left', { forward: 75, out: 7, knee: 140 });
    rn.leg('right', { forward: 75, out: 7, knee: 140 });
    rn.bow(pulled ? 30 : 50, 0);
    rn.lean(pulled ? 6 : 12);
    rn.look(pulled ? 30 : 36, 18, 0);
    if (pulled) {
      rn.arm('left', { forward: 62, out: 22, bend: 32, across: 10 });
      rn.arm('right', { forward: 72, out: 6, bend: 62, across: 32 });
    } else {
      rn.arm('left', { forward: 106, out: 14, bend: 10, across: 0 });
      rn.arm('right', { forward: 92, out: 6, bend: 52, across: 26 });
    }
    rn.settle(false);
    const hipW = Hn * 0.075 * (a.nurse === 'matron' ? 1.3 : 0.85);
    const pelvisY = worldOf(nurse.pelvis).y;
    // A starched skirt pooled over the folded legs, the cap and its black band.
    const skirt = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(hipW * 1.25, 0.03), new THREE.Vector2(hipW * 1.35, -pelvisY * 0.35), new THREE.Vector2(hipW * 1.8, -pelvisY * 0.8), new THREE.Vector2(hipW * 2.0, -pelvisY + 0.012),
    ], 24), s.material(white, { roughness: 0.95, side: THREE.DoubleSide }));
    skirt.scale.z = 1.3;
    skirt.position.z = 0.05;
    const belt = new THREE.Mesh(new THREE.TorusGeometry(hipW * 1.12, 0.012, 6, 24), s.material('#1a1a1c', { roughness: 0.6 }));
    belt.rotation.x = Math.PI / 2;
    belt.position.y = Hn * 0.07 * 0.45;
    belt.scale.z = 0.7;
    nurse.pelvis.add(belt);
    if (a.cape) {
      const torsoL = Hn * 0.28, shoulderW = Hn * 0.115 * (a.nurse === 'matron' ? 1.3 : 0.85);
      const cape = new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(Hn * 0.045, torsoL * 1.0), new THREE.Vector2(shoulderW * 1.3, torsoL * 0.82), new THREE.Vector2(shoulderW * 1.5, torsoL * 0.3), new THREE.Vector2(shoulderW * 1.55, -torsoL * 0.05),
      ], 20, Math.PI * 0.32, Math.PI * 1.36), s.material('#1f2a4a', { roughness: 0.95, side: THREE.DoubleSide }));
      cape.castShadow = true;
      nurse.joints.spine.add(cape);
    }
    skirt.castShadow = skirt.receiveShadow = true;
    nurse.pelvis.add(skirt);
    const headR = Hn * 0.064;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.35, headR * 0.34, headR * 0.95), s.material(white, { roughness: 0.9 }));
    cap.position.set(0, headR * 0.92, -headR * 0.2);
    cap.rotation.z = a.nurse === 'young' ? 0.18 : 0;
    const band = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.37, headR * 0.1, headR * 0.3), s.material('#1a1a1c'));
    band.position.set(0, headR * 0.92, headR * 0.14);
    band.rotation.z = cap.rotation.z;
    cap.castShadow = true;
    nurse.head.add(cap, band);
    if (a.towel) {
      const cloth = s.material('#e8e2d2', { roughness: 1 });
      const torsoL = Hn * 0.28, shoulderW = Hn * 0.115 * (a.nurse === 'matron' ? 1.3 : 0.85);
      const drape = new THREE.Mesh(new THREE.BoxGeometry(Hn * 0.08, torsoL * 0.62, 0.014), cloth);
      drape.position.set(-shoulderW * 0.8, torsoL * 0.72, Hn * 0.036 * 1.5);
      drape.rotation.set(0.15, 0, -0.08);
      const over = new THREE.Mesh(new THREE.BoxGeometry(Hn * 0.08, 0.014, Hn * 0.12), cloth);
      over.position.set(-shoulderW * 0.8, torsoL * 1.02, 0);
      drape.castShadow = over.castShadow = true;
      nurse.joints.spine.add(drape, over);
    }

    // ---- the dancer, laid out with the head at the nurse's left hand
    const woman = a.who === 'girl' || a.who === 'gown';
    const Hd = woman ? mix(1.58, 1.68, random()) : mix(1.7, 1.82, random());
    const dressColour = a.who === 'girl' ? pick(['#9fb0c4', '#c9a0a0', '#b5bf98', '#d8c9a4']) : pick(['#2a2a44', '#5a1f30', '#1f3a3a', '#6a4a7a']);
    const outfit = {
      girl: { top: dressColour, bottom: dressColour, sleeves: 'short' as const, shoes: '#4a2a22' },
      gown: { top: dressColour, bottom: dressColour, sleeves: 'short' as const, shoes: '#c9b89a' },
      vest: { top: '#d9d4c6', bottom: '#3a3a40', sleeves: 'short' as const, shoes: '#2a2320' },
      sleeves: { top: '#eee9dc', bottom: '#4a4038', sleeves: 'short' as const, shoes: '#1d1a18' },
    }[a.who];
    const dancer = figure(s, {
      height: Hd, style: 'doll', pose: 'lying', build: 'slight', skin: pickSkin(random),
      hair: woman ? pick(['short', 'long', 'bun']) : 'short', hairColor: pick(['#2a1c14', '#4a2f1b', '#6b4a2e', '#1f1a18', '#9a6a3a']),
      ...outfit,
    });
    s.root.add(dancer.root);
    const rd = rig(dancer);
    const limbD = Hd * 0.036 * 0.85;
    if (a.who === 'vest') {
      // Braces over the vest.
      for (const side of [-1, 1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.02, Hd * 0.28 * 0.8, 0.008), s.material('#3a3a3a'));
        strap.position.set(side * Hd * 0.115 * 0.85 * 0.42, Hd * 0.28 * 0.55, limbD * 1.4);
        dancer.joints.spine.add(strap);
      }
    }
    if (a.who === 'sleeves') {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.035, Hd * 0.28 * 0.55, 0.008), s.material(pick(['#6a2a2a', '#2a3a6a', '#3a5a3a'])));
      tie.position.set(0.03, Hd * 0.28 * 0.62, limbD * 1.42);
      tie.rotation.z = 0.25;
      dancer.joints.spine.add(tie);
    }
    if (woman) {
      // Her skirt, flattened against the boards.
      const hw = Hd * 0.075 * 0.85, hem = a.who === 'gown' ? Hd * 0.5 : Hd * 0.33;
      const flat = new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(hw * 1.25, 0.03), new THREE.Vector2(hw * 1.4, -hem * 0.4), new THREE.Vector2(hw * (a.who === 'gown' ? 2.4 : 2.0), -hem),
      ], 20), s.material(dressColour, { roughness: a.who === 'gown' ? 0.4 : 0.95, metalness: a.who === 'gown' ? 0.2 : 0, side: THREE.DoubleSide }));
      flat.scale.z = 0.35;
      flat.position.z = -hw * 0.3;
      flat.castShadow = true;
      dancer.pelvis.add(flat);
    }
    numberCard(s, dancer, Hd, { four: '4', nineteen: '19', thirty: '30', fifty: '55', ninety: '91' }[a.number], true);
    // Pose by state. The lying preset lays the body on its back with the head toward -z.
    if (a.state === 'limp') {
      rd.arm('left', { forward: -10, out: 70, bend: 10, across: 0 });
      rd.arm('right', { forward: 5, out: 40, bend: 25, across: 0 });
      rd.leg('left', { forward: 0, out: 9, knee: 0 });
      rd.leg('right', { forward: 0, out: 4, knee: 6 });
      rd.look(-6, 48, 0);
    } else if (a.state === 'stirring') {
      rd.arm('left', { forward: 8, out: 30, bend: 20, across: 0 });
      rd.arm('right', { forward: 75, out: 20, bend: 55, across: 25 });
      rd.leg('left', { forward: 0, out: 8, knee: 0 });
      rd.leg('right', { forward: 55, out: 6, knee: 100, foot: 'flat' });
      rd.look(10, 40, 0);
    } else {
      dancer.joints.body.rotation.x = -Math.PI / 2 + 0.95;
      dancer.joints.body.rotation.z = 0;
      rd.bow(18, 0);
      rd.arm('left', { forward: 10, out: 25, bend: 15, across: 0 });
      rd.arm('right', { forward: 20, out: 15, bend: 40, across: 10 });
      rd.leg('left', { forward: 54, out: 8, knee: 0 });
      rd.leg('right', { forward: 60, out: 5, knee: 50 });
      rd.look(38, 20, 15);
    }
    // Turn the body to lie across the nurse's front, head toward her left hand, then slide it under that hand.
    dancer.root.rotation.y = -Math.PI / 2 + (random() - 0.5) * 0.3;
    rd.settle(false);
    const handL = worldOf(nurse.hands.left);
    const head = worldOf(dancer.head);
    const target = pulled ? handL.clone().add(new THREE.Vector3(0.02, 0.3, 0.1)) : handL.clone().add(new THREE.Vector3(0.03, -0.02, 0.02));
    dancer.root.position.add(target.sub(head));
    dancer.root.position.y = Math.max(dancer.root.position.y, 0);
    rd.settle(false);

    // ---- what the nurse holds, at her right hand
    const handR = worldOf(nurse.hands.right);
    if (a.holds === 'salts') {
      const bottle = s.cylinder(0.016, 0.018, 0.06, [handR.x, handR.y - 0.01, handR.z + 0.01], s.material('#5a3214', { roughness: 0.3 }), 12);
      bottle.rotation.z = 0.35;
      s.cylinder(0.008, 0.008, 0.016, [handR.x - 0.012, handR.y + 0.025, handR.z + 0.01], s.material('#c9a97a'), 8).rotation.z = 0.35;
    } else if (a.holds === 'water') {
      const cup = s.cylinder(0.034, 0.03, 0.08, [handR.x, handR.y - 0.01, handR.z + 0.02], tin, 14);
      cup.rotation.z = 0.9;
    } else if (a.holds === 'cloth') {
      const cloth = s.box([0.12, 0.012, 0.09], [handR.x, handR.y - 0.015, handR.z + 0.02], s.material('#e4e8e2', { roughness: 1 }));
      cloth.rotation.set(0.2, 0.3, 0.1);
    }

    // ---- the partner standing over them at the dancer's feet, hands on knees
    let partner: Figure | null = null;
    if (a.partner) {
      const Hp = woman ? mix(1.72, 1.82, random()) : mix(1.6, 1.68, random());
      const pColour = woman ? '#efe9d8' : pick(['#9fb0c4', '#c9a0a0', '#d8c9a4']);
      partner = figure(s, {
        height: Hp, style: 'doll', pose: 'standing', build: 'slight', skin: pickSkin(random), sleeves: 'short',
        hair: woman ? 'short' : 'bun', hairColor: pick(['#2a1c14', '#4a2f1b', '#6b4a2e']),
        top: pColour, bottom: woman ? '#4a4a52' : pColour, shoes: '#2a2320',
      });
      s.root.add(partner.root);
      const rp = rig(partner);
      rp.leg('left', { forward: 8, out: 10, knee: 28 });
      rp.leg('right', { forward: 8, out: 10, knee: 28 });
      rp.bow(48, 0);
      rp.look(22, 0, 0);
      rp.arm('left', { forward: 62, out: 14, bend: 8, across: 0 });
      rp.arm('right', { forward: 62, out: 14, bend: 8, across: 0 });
      numberCard(s, partner, Hp, { four: '4', nineteen: '19', thirty: '30', fifty: '55', ninety: '91' }[a.number]);
      if (!woman) {
        const hw = Hp * 0.075 * 0.85;
        const sk = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(hw * 1.25, 0.03), new THREE.Vector2(hw * 1.3, -0.25), new THREE.Vector2(hw * 1.9, -Hp * 0.57 * 0.62)], 20), s.material(pColour, { roughness: 0.95, side: THREE.DoubleSide }));
        sk.castShadow = true;
        partner.pelvis.add(sk);
      }
      const feet = worldOf(dancer.joints.ankles.left);
      partner.root.position.set(feet.x - 0.42, 0, feet.z - 0.1);
      partner.root.rotation.y = Math.PI / 2 + 0.2;
      rp.settle(false);
    }

    // ---- the spilled cup
    if (a.cup) {
      const hand = worldOf(dancer.hands.left);
      const at = new THREE.Vector3(hand.x + (random() - 0.5) * 0.2, 0, hand.z + 0.18 + random() * 0.1);
      const cup = s.cylinder(0.034, 0.03, 0.08, [at.x, 0.032, at.z], tin, 14);
      cup.rotation.set(Math.PI / 2, 0, random() * 2);
      const puddle = s.cylinder(0.1, 0.1, 0.004, [at.x + 0.06, 0.002, at.z + 0.04], s.material('#6f6a5e', { roughness: 0.2, metalness: 0.1 }), 18);
      puddle.scale.x = 1.5;
    }

    // The nurse's hand with the bottle wavers; a stirring dancer's lifted hand trembles.
    const energy = mood.energy;
    const phase = random() * Math.PI * 2;
    const shaker = a.state === 'stirring' ? dancer.joints.elbows.right : null;
    const restShake = shaker?.rotation.x ?? 0;
    const wrist = nurse.joints.elbows.right, restWrist = wrist.rotation.x;
    return s.finish({
      update(dt, time) {
        nurse.update(dt, time);
        dancer.update(dt, time);
        partner?.update(dt, time);
        wrist.rotation.x = restWrist + Math.sin(time * mix(1.5, 5, energy) + phase) * mix(0.01, 0.05, energy);
        if (shaker) shaker.rotation.x = restShake + Math.sin(time * 7 + phase) * 0.05 * energy;
      },
    });
  },
});
