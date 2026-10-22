import * as THREE from 'three';
import { type Figure, Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { numberCard, paint, pickSkin, rig, worldOf } from './rig';

export default defineThing({
  questions: {
    plate: choice('What is on the tin plate?', {
      beans: 'A heap of brown beans, the twelfth meal of beans this week.',
      sandwich: 'A thick sandwich, white bread, something grey inside.',
      stew: 'A grey stew in a tin bowl, a spoon standing up in it.',
      coffee: 'Nothing but a tin mug of coffee: the food has not come round yet.',
    }),
    appetite: choice('How is he eating?', {
      shovelling: 'Head down, shovelling it in, the spoon never still.',
      picking: 'Picking at it, too tired to chew, staring at the far wall.',
      asleep: 'Spoon stopped halfway to the mouth, eyes shut, asleep on his feet.',
    }),
    shirt: choice('What is he wearing?', {
      vest: 'A sweat-grey vest, arms bare, braces hanging.',
      collarless: 'A collarless shirt gone yellow at the neck.',
      jacket: 'A suit jacket over a bare chest, the shirt sold or lost.',
    }),
    number: choice('What number is pinned on his back?', {
      five: 'Number 5.', twelve: 'Number 12.', thirtythree: 'Number 33.', sixty: 'Number 60.', onefour: 'Number 104.',
    }),
    partner: noul('Does his partner hold him up from behind, arms round his waist, her head against his back?'),
    razor: noul('Do a razor and a propped mirror lie on the rail for shaving on the move?'),
    sponsor: noul('Is a sponsor\'s card tacked to the rail post?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const wood = s.material(pick(['#8a6a44', '#7a5a3a', '#6a5038']), { roughness: 0.85 });
    const tin = s.material('#c9c4b4', { metalness: 0.65, roughness: 0.4 });

    // ---- the rail section: two posts, a plank at chest height, a lower rail
    const RZ = -0.44, RY = 1.12;
    for (const x of [-0.75, 0.75]) {
      s.box([0.08, RY + 0.08, 0.08], [x, (RY + 0.08) / 2, RZ], wood);
      s.box([0.26, 0.05, 0.26], [x, 0.025, RZ], wood);
    }
    s.box([1.7, 0.05, 0.22], [0, RY, RZ], wood);
    s.box([1.7, 0.05, 0.05], [0, 0.6, RZ], wood);
    if (mood.wear > 0.4) for (let i = 0; i < 5; i++) s.box([0.04 + random() * 0.08, 0.004, 0.03 + random() * 0.05], [(random() - 0.5) * 1.5, RY + 0.027, RZ + (random() - 0.5) * 0.15], s.material('#5a4a3a', { roughness: 1 }));
    if (a.sponsor) {
      const map = paint(256, 128, (c) => {
        c.fillStyle = '#efe6cc'; c.fillRect(0, 0, 256, 128);
        c.fillStyle = '#9c2a2a'; c.fillRect(0, 0, 256, 22); c.fillRect(0, 106, 256, 22);
        c.fillStyle = '#1e1c1a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 36px sans-serif';
        c.fillText(pick(["DUKE'S DINER", 'STAR CAB CO.', 'SUNRISE BAKERY', 'MAJESTIC HOTEL']), 128, 64);
      });
      const card = s.mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }), [0.75, 0.86, RZ + 0.045]);
      card.rotation.z = (random() - 0.5) * 0.1;
    }

    // ---- the man at the rail, three-quarters from behind so the card shows
    const H = mix(1.74, 1.84, random());
    const limb = H * 0.036 * 0.85, torsoL = H * 0.28, shoulderW = H * 0.115 * 0.85;
    const skin = pickSkin(random);
    const outfit = {
      vest: { top: '#d6d1c3', bottom: '#3a3a40', sleeves: 'short' as const },
      collarless: { top: '#e8e0c6', bottom: '#4a4038', sleeves: 'long' as const },
      jacket: { top: '#3a3230', bottom: '#2f2f33', sleeves: 'long' as const },
    }[a.shirt];
    const man = figure(s, {
      height: H, style: 'doll', build: 'slight', pose: 'standing', hair: 'short', hairColor: pick(['#2a1c14', '#4a2f1b', '#1f1a18', '#8a7a68']),
      skin, shoes: pick(['#2a2320', '#5a3a2a']), ...outfit,
    });
    s.root.add(man.root);
    const r = rig(man);
    if (a.shirt === 'vest') for (const side of [-1, 1]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.018, torsoL * 0.5, 0.008), s.material('#3a3a3a'));
      brace.position.set(side * shoulderW * 0.5, torsoL * 0.16, limb * 1.35);
      brace.rotation.x = 0.35;
      brace.rotation.z = side * 0.2;
      man.joints.spine.add(brace);
    }
    if (a.shirt === 'jacket') {
      const chest = new THREE.Mesh(new THREE.BoxGeometry(shoulderW * 0.55, torsoL * 0.5, 0.02), s.material(skin, { roughness: 0.6 }));
      chest.position.set(0, torsoL * 0.68, limb * 1.33);
      man.joints.spine.add(chest);
    }
    numberCard(s, man, H, { five: '5', twelve: '12', thirtythree: '33', sixty: '60', onefour: '104' }[a.number]);
    const asleep = a.appetite === 'asleep';
    r.leg('left', { forward: 6, out: 6, knee: 10 });
    r.leg('right', { forward: -4, out: 6, knee: 6 });
    r.lean(6);
    r.bow(a.appetite === 'picking' ? 4 : 14, 0);
    r.look(a.appetite === 'shovelling' ? 34 : asleep ? 40 : -6, a.appetite === 'picking' ? 50 : 0, asleep ? 12 : 0);
    r.arm('left', { forward: 12, out: 12, bend: 48, across: 12 });
    if (a.appetite === 'shovelling') r.arm('right', { forward: 55, out: 25, bend: 140, across: 50 });
    else if (asleep) r.arm('right', { forward: 40, out: 22, bend: 100, across: 40 });
    else r.arm('right', { forward: 20, out: 14, bend: 70, across: 20 });
    man.root.rotation.y = Math.PI + 0.55;
    r.settle();
    man.root.position.set(0.12, 0, 0.02);
    r.settle(false);

    // The plate goes where his left hand reaches on the plank; the mug beside it.
    const handL = worldOf(man.hands.left);
    const plateAt = new THREE.Vector3(handL.x + 0.1, RY + 0.03, RZ);
    const spoonMat = s.material('#c9c4b4', { metalness: 0.7, roughness: 0.35 });
    if (a.plate === 'stew') {
      s.lathe([[0.02, 0], [0.11, 0.005], [0.13, 0.06], [0.14, 0.065]], s.material('#c9c4b4', { metalness: 0.65, roughness: 0.4, side: THREE.DoubleSide }), [plateAt.x, plateAt.y - 0.01, plateAt.z]);
      s.cylinder(0.11, 0.11, 0.02, [plateAt.x, plateAt.y + 0.04, plateAt.z], s.material('#7a6a58', { roughness: 0.5 }), 18);
    } else {
      s.cylinder(0.13, 0.11, 0.012, [plateAt.x, plateAt.y - 0.01, plateAt.z], tin, 20);
    }
    if (a.plate === 'beans') {
      const bean = s.material('#8a5a2e', { roughness: 0.6 });
      s.scatter(new THREE.SphereGeometry(1, 7, 5), bean, Array.from({ length: 70 }, () => { const t = random() * Math.PI * 2, d = Math.sqrt(random()) * 0.085; return { at: [plateAt.x + Math.cos(t) * d, plateAt.y + 0.005 + (0.09 - d) * 0.3 * random(), plateAt.z + Math.sin(t) * d] as [number, number, number], size: 0.009 + random() * 0.004 }; }));
    } else if (a.plate === 'sandwich') {
      s.box([0.14, 0.03, 0.12], [plateAt.x, plateAt.y + 0.01, plateAt.z], s.material('#efe3c4', { roughness: 1 }));
      s.box([0.145, 0.015, 0.125], [plateAt.x, plateAt.y + 0.032, plateAt.z], s.material('#8a7a6a', { roughness: 1 }));
      s.box([0.14, 0.03, 0.12], [plateAt.x, plateAt.y + 0.055, plateAt.z], s.material('#e6d8b4', { roughness: 1 }));
    }
    const mugAt = new THREE.Vector3(plateAt.x - 0.2, RY + 0.025, RZ + 0.02);
    s.cylinder(0.035, 0.032, 0.09, [mugAt.x, mugAt.y + 0.045, mugAt.z], tin, 14);
    s.ring(0.025, 0.005, [mugAt.x + 0.035, mugAt.y + 0.045, mugAt.z], tin, Math.PI);
    if (a.plate !== 'sandwich') {
      // The spoon: in his right hand, bowl toward the mouth, or standing in the stew.
      const handR = worldOf(man.hands.right);
      const mouth = man.head.localToWorld(new THREE.Vector3(0, -H * 0.064 * 0.3, H * 0.064 * 0.95));
      if (a.appetite === 'picking' || a.plate === 'coffee') {
        const spoon = s.rod([handR.x, handR.y, handR.z], [handR.x + 0.03, handR.y - 0.12, handR.z - 0.04], 0.004, spoonMat);
        void spoon;
      } else {
        const tip = asleep ? handR.clone().lerp(mouth, 0.5) : mouth;
        const dir = tip.clone().sub(handR).normalize();
        const end = handR.clone().addScaledVector(dir, 0.12);
        s.rod([handR.x, handR.y, handR.z], [end.x, end.y, end.z], 0.004, spoonMat);
        const bowl = s.ball([0.016, 0.008, 0.022], [end.x, end.y, end.z], spoonMat, 10);
        bowl.lookAt(handR);
      }
    }
    if (a.razor) {
      const mx = plateAt.x + 0.32;
      const mirror = s.box([0.12, 0.16, 0.01], [mx, RY + 0.11, RZ - 0.06], s.material('#4a3a2a', { roughness: 0.7 }));
      mirror.rotation.x = -0.25;
      const glass = s.mesh(new THREE.PlaneGeometry(0.1, 0.14), new THREE.MeshStandardMaterial({ color: '#dfe6ea', metalness: 0.9, roughness: 0.1 }), [mx, RY + 0.11, RZ - 0.054]);
      glass.rotation.x = -0.25;
      const blade = s.box([0.09, 0.004, 0.018], [mx - 0.03, RY + 0.03, RZ + 0.05], s.material('#d8dadd', { metalness: 0.9, roughness: 0.2 }));
      blade.rotation.y = 0.5;
      s.box([0.07, 0.008, 0.018], [mx + 0.03, RY + 0.03, RZ + 0.02], s.material('#1a1a1c', { roughness: 0.4 })).rotation.y = 0.5;
      s.cylinder(0.025, 0.025, 0.04, [mx + 0.09, RY + 0.045, RZ], s.material('#f1ece0'), 12);
    }

    // ---- the partner holding him up from behind
    let her: Figure | null = null;
    if (a.partner) {
      const Hp = mix(1.56, 1.64, random());
      const dress = pick(['#9fb0c4', '#c9a0a0', '#b5bf98', '#d8c9a4', '#6a4a6a']);
      her = figure(s, {
        height: Hp, style: 'doll', build: 'slight', pose: 'standing', sleeves: 'short', hair: pick(['bun', 'short']), hairColor: pick(['#2a1c14', '#4a2f1b', '#6b4a2e']),
        skin: pickSkin(random), top: dress, bottom: dress, shoes: '#3a2a22',
      });
      s.root.add(her.root);
      const rp = rig(her);
      rp.arm('left', { forward: 35, out: 10, bend: 60, across: 65 });
      rp.arm('right', { forward: 35, out: 10, bend: 60, across: 65 });
      rp.lean(10);
      rp.bow(12, 0);
      rp.look(30, 0, 25);
      rp.leg('left', { forward: 4, out: 5, knee: 10 });
      rp.leg('right', { forward: -2, out: 5, knee: 8 });
      const hw = Hp * 0.075 * 0.85;
      const skirt = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(hw * 1.25, 0.03), new THREE.Vector2(hw * 1.3, -0.2), new THREE.Vector2(hw * 1.9, -Hp * 0.57 * 0.62)], 20), s.material(dress, { roughness: 0.95, side: THREE.DoubleSide }));
      skirt.castShadow = true;
      her.pelvis.add(skirt);
      numberCard(s, her, Hp, { five: '5', twelve: '12', thirtythree: '33', sixty: '60', onefour: '104' }[a.number]);
      her.root.rotation.y = man.root.rotation.y;
      rp.settle();
      const facing = new THREE.Vector3(Math.sin(man.root.rotation.y), 0, Math.cos(man.root.rotation.y));
      her.root.position.copy(man.root.position).addScaledVector(facing, -0.34);
      rp.settle(false);
    }

    // The feet shuffle; a shovelling spoon arm works; the sleeper sways.
    const energy = mood.energy;
    const phase = random() * Math.PI * 2;
    const hips = man.joints.hips, restL = hips.left.rotation.x, restR = hips.right.rotation.x;
    const elbow = man.joints.elbows.right, restElbow = elbow.rotation.x;
    return s.finish({
      update(dt, time) {
        man.update(dt, time);
        her?.update(dt, time);
        const step = Math.sin(time * mix(0.8, 2.6, energy) + phase);
        hips.left.rotation.x = restL - step * mix(0.03, 0.1, energy);
        hips.right.rotation.x = restR + step * mix(0.03, 0.1, energy);
        if (a.appetite === 'shovelling') elbow.rotation.x = restElbow + Math.sin(time * mix(2, 6, energy) + phase) * mix(0.02, 0.08, energy);
      },
    });
  },
});
