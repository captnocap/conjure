import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, mix, noul } from '@conjure/kit';
import { at, hem, pick, pickSkin, rig } from './pose';

type P = [number, number, number];

export default defineThing({
  questions: {
    state: choice('What is she doing?', {
      arriving: 'Still arriving: paused mid-step, turned toward the seats, deciding where to slip in.',
      leaving: 'Already turning to leave, looking back over her shoulder.',
      frozen: 'Stopped dead, facing straight ahead, caught in the doorway as every head turns.',
    }),
    carries: choice('What does she carry?', {
      handbag: 'A handbag clutched to her chest with both arms.',
      flowers: 'A bunch of flowers in wet paper, held to her chest.',
      child: 'A small child by the hand, in a hood, pulling the other way.',
      envelope: 'A single envelope or card, held in front of her like a ticket.',
    }),
    coat: choice('What colour is the raincoat?', {
      yellow: 'Bright yellow oilskin.',
      navy: 'Navy, long, belted.',
      beige: 'A beige trench coat, darkened across the shoulders by the rain.',
      black: 'Black, funeral-sober.',
      red: 'Red, the only colour in the room.',
    }),
    hood: noul('Is her hood up?'),
    umbrella: choice('What about the umbrella?', {
      folded: 'Folded and dripping, held point-down at her side.',
      halfOpen: 'Still half open, collapsed at the ribs, too big to bring inside.',
      none: 'No umbrella: she is soaked through, hair plastered flat.',
    }),
    shoes: choice('What is on her feet?', {
      heels: 'Smart heels, the wrong shoes for the weather.',
      wellies: 'Green wellington boots.',
      trainers: 'White trainers, grey with wet.',
      boots: 'Black ankle boots.',
    }),
    trail: noul('Is there a trail of wet footprints behind her across the floor?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.58, 1.74, random());
    const skin = pickSkin(random);
    const coatColour = { yellow: '#e2b61e', navy: '#243052', beige: '#c6b08a', black: '#1c1c20', red: '#b0242a' }[a.coat];
    const wet = s.material(coatColour, { roughness: 0.32, side: THREE.DoubleSide });
    const shoeColour = { heels: '#1a1816', wellies: '#2f5a3a', trainers: '#dcdcd6', boots: '#1a1816' }[a.shoes];
    const soaked = a.umbrella === 'none';
    const person = figure(s, {
      height: H, build: random() < 0.3 ? 'slight' : 'average', style: 'doll', skin,
      hair: a.hood ? 'hood' : soaked ? 'long' : pick(random, ['long', 'bun', 'short']), hairColor: pick(random, ['#2a1e18', '#4a3222', '#b8884a', '#8a2a1a', '#d8d2c8']),
      top: coatColour, bottom: a.shoes === 'wellies' ? '#3d4652' : pick(random, ['#2a2a30', '#3d4652', '#6a5a4a']), shoes: shoeColour, sleeves: 'long',
      pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const pose = rig(person);
    // Clutching: both forearms across the chest. One arm goes down to the umbrella or the child instead.
    const clutch = { forward: 62, out: 2, bend: 112, across: 42 };
    const umbrellaHand = a.umbrella !== 'none';
    if (a.carries === 'child') {
      pose.arm('left', { forward: 12, out: 22, bend: 4, across: 0 });
      pose.arm('right', umbrellaHand ? { forward: 8, out: 10, bend: 6, across: 0 } : clutch);
    } else if (a.carries === 'envelope') {
      pose.arm('left', { forward: 48, out: 2, bend: 100, across: 50 });
      pose.arm('right', umbrellaHand ? { forward: 8, out: 10, bend: 6, across: 0 } : { forward: 48, out: 2, bend: 100, across: 50 });
    } else {
      pose.arm('left', clutch);
      pose.arm('right', umbrellaHand ? { forward: 6, out: 12, bend: 8, across: 0 } : clutch);
    }
    if (a.state === 'arriving') { pose.look(6, 36, 4); pose.bow(4, 0, 18); pose.leg('left', { forward: 12, knee: 10, out: 4 }); pose.leg('right', { forward: -6, out: 6 }); pose.lean(3); }
    else if (a.state === 'leaving') { pose.look(2, 70, 0); pose.bow(2, 0, 30); pose.leg('left', { forward: -10, out: 8 }); pose.leg('right', { forward: 14, knee: 14, out: 4 }); }
    else { pose.look(0, 0, 0); pose.bow(-2); pose.leg('left', { out: 3 }); pose.leg('right', { out: 3 }); }
    person.settle();
    person.root.rotation.y = a.state === 'leaving' ? 2.6 : a.state === 'arriving' ? 0.55 : 0;
    person.root.updateMatrixWorld(true);

    // The raincoat: a hem from the hips to the knee, a belt and a collar, the shoulders darker with rain.
    const hip = at(s, person.pelvis);
    const neck = at(s, person.joints.neck);
    const turn = person.root.rotation.y;
    const skirt = hem(s, wet, new THREE.Vector3(hip.x, hip.y + 0.03 * H, hip.z), 0.1 * H, 0.17 * H, 0.26 * H, 0.75);
    skirt.rotation.y = turn;
    const belt = s.ring(0.1 * H, 0.012 * H, [hip.x, hip.y + 0.07 * H, hip.z], s.material(coatColour, { roughness: 0.6 }));
    belt.rotation.x = Math.PI / 2;
    belt.scale.z = 0.75;
    belt.rotation.z = turn;
    s.ring(0.062 * H, 0.016 * H, [neck.x, neck.y - 0.005 * H, neck.z], wet).rotation.x = Math.PI / 2;
    if (a.coat === 'beige') {
      // Rain-dark shoulders: a cap of darker cloth over the shoulders.
      const dark = s.material('#9a8666', { roughness: 0.4, side: THREE.DoubleSide });
      const shoulders = s.mesh(new THREE.CylinderGeometry(0.06 * H, 0.14 * H, 0.08 * H, 18, 1, true), dark, [neck.x, neck.y - 0.045 * H, neck.z]);
      shoulders.scale.z = 0.7;
      shoulders.rotation.y = turn;
    }

    // ---- what she holds to her chest
    const chest = new THREE.Vector3(neck.x, neck.y - 0.1 * H, neck.z);
    const forward = new THREE.Vector3(Math.sin(turn), 0, Math.cos(turn));
    const side = new THREE.Vector3(Math.cos(turn), 0, -Math.sin(turn));
    const held = chest.clone().addScaledVector(forward, 0.1 * H);
    if (a.carries === 'handbag') {
      const bagMat = s.material(pick(random, ['#2a1f1a', '#6a2a2a', '#1f2a4a', '#8a6a4a']), { roughness: 0.45 });
      const bag = s.box([0.2 * H, 0.14 * H, 0.07 * H], held.toArray() as P, bagMat);
      bag.rotation.y = turn;
      const strap = s.ring(0.07 * H, 0.008 * H, [held.x, held.y + 0.1 * H, held.z], bagMat, Math.PI);
      strap.rotation.y = turn;
      s.ball([0.016 * H, 0.016 * H, 0.008 * H], [held.x + forward.x * 0.04 * H, held.y + 0.02 * H, held.z + forward.z * 0.04 * H], s.material('#d4b24a', { metalness: 0.8, roughness: 0.3 }), 8);
    } else if (a.carries === 'flowers') {
      const paper = s.mesh(new THREE.ConeGeometry(0.08 * H, 0.26 * H, 10, 1, true), s.material('#d9cfb8', { roughness: 0.95, side: THREE.DoubleSide }), [held.x, held.y - 0.02 * H, held.z]);
      paper.rotation.set(0.5, 0, 0.35);
      const heads = Array.from({ length: 7 }, () => ({ at: [held.x + (random() - 0.5) * 0.1 * H, held.y + 0.1 * H + random() * 0.05 * H, held.z + forward.z * 0.02 * H + (random() - 0.5) * 0.06 * H] as P, size: 0.018 * H + random() * 0.012 * H, color: pick(random, ['#f6f1e8', '#f2b7c6', '#e9c94c', '#b0242a', '#8a5aa8']) }));
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.8 }), heads);
      for (const head of heads.slice(0, 4)) s.rod([head.at[0], head.at[1] - 0.02 * H, head.at[2]], [held.x, held.y - 0.08 * H, held.z], 0.003 * H, s.material('#3f6a3a', { roughness: 0.9 }));
    } else if (a.carries === 'envelope') {
      const card = s.box([0.11 * H, 0.075 * H, 0.004 * H], [held.x, held.y - 0.04 * H, held.z], s.material('#f4f0e6', { roughness: 0.95 }));
      card.rotation.set(-0.3, turn, 0);
    }

    // ---- the umbrella: folded point-down at her side, or collapsed and half open
    const umbrellaMat = s.material(pick(random, ['#1c1c20', '#3a2a5a', '#2a4a7a', '#7a1f2a', '#1f1f1f']), { roughness: 0.5 });
    const handle = s.material('#4a2c18', { roughness: 0.5 });
    let tip: THREE.Vector3 | null = null;
    const drips: THREE.Mesh[] = [];
    if (a.umbrella !== 'none') {
      const hand = at(s, person.hands.right);
      tip = new THREE.Vector3(hand.x + side.x * -0.02, 0.012, hand.z + side.z * -0.02);
      if (a.umbrella === 'folded') {
        // A folded umbrella is fat in the middle and tied with its strap, with a ferrule at the tip.
        s.rod([hand.x, hand.y + 0.03, hand.z], [tip.x, tip.y + 0.08, tip.z], 0.04, umbrellaMat, 0.02);
        s.rod([tip.x, tip.y + 0.08, tip.z], [tip.x, tip.y, tip.z], 0.008, s.material('#8a8a8e', { metalness: 0.6 }));
        const strapAt = new THREE.Vector3(hand.x, hand.y + 0.03, hand.z).lerp(tip, 0.45);
        s.ring(0.04, 0.008, strapAt.toArray() as P, s.material('#1a1a1c', { roughness: 0.7 })).rotation.x = Math.PI / 2;
        const crook = s.ring(0.03, 0.007, [hand.x, hand.y + 0.06, hand.z], handle, Math.PI);
        crook.rotation.y = turn;
        s.rod([hand.x + (0.8 - 0.5) * 0, hand.y, hand.z], [hand.x, hand.y + 0.03, hand.z], 0.01, handle);
      } else {
        const canopy = s.mesh(new THREE.ConeGeometry(0.3, 0.5, 8, 1, true), umbrellaMat, [tip.x, tip.y + 0.26, tip.z]);
        canopy.rotation.x = Math.PI;
        canopy.rotation.y = random();
        (canopy.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        s.rod([hand.x, hand.y + 0.03, hand.z], [tip.x, tip.y, tip.z], 0.008, s.material('#8a8a8e', { metalness: 0.6 }));
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + canopy.rotation.y;
          s.rod([tip.x, tip.y + 0.5, tip.z], [tip.x + Math.cos(angle) * 0.3, tip.y + 0.02, tip.z + Math.sin(angle) * 0.3], 0.003, s.material('#8a8a8e', { metalness: 0.6 }));
        }
      }
      // Drips: three beads that fall and reset.
      const water = new THREE.MeshStandardMaterial({ color: '#dfe8f0', transparent: true, opacity: 0.7, depthWrite: false, roughness: 0.1 });
      for (let i = 0; i < 3; i++) {
        const drop = s.ball([0.008, 0.013, 0.008], [tip.x, tip.y + 0.05 + i * 0.07, tip.z], water, 8);
        drop.castShadow = false;
        drips.push(drop);
      }
    }
    // The puddle under the tip, and wet footprints behind her.
    const puddleMat = new THREE.MeshStandardMaterial({ color: '#3a3f44', transparent: true, opacity: 0.45, depthWrite: false, roughness: 0.15 });
    const puddleAt = tip ?? new THREE.Vector3(hip.x, 0, hip.z);
    const puddle = s.mesh(new THREE.CircleGeometry(soaked ? 0.22 : 0.12, 20), puddleMat, [puddleAt.x, 0.003, puddleAt.z]);
    puddle.rotation.x = -Math.PI / 2;
    puddle.scale.set(1.3, 1, 1);
    puddle.castShadow = false;
    if (a.trail) {
      const prints: { at: P; size: number }[] = [];
      const back = forward.clone().negate();
      for (let i = 1; i <= 6; i++) {
        const step = i * 0.32;
        const sideways = (i % 2 ? 0.08 : -0.08);
        prints.push({ at: [hip.x + back.x * step + side.x * sideways, 0.002, hip.z + back.z * step + side.z * sideways], size: 1 });
      }
      const print = s.scatter(new THREE.CircleGeometry(0.07, 10), new THREE.MeshStandardMaterial({ color: '#3a3f44', transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.2 }), prints);
      const m = new THREE.Matrix4();
      prints.forEach((p, i) => { m.makeRotationX(-Math.PI / 2).setPosition(...p.at); m.multiply(new THREE.Matrix4().makeScale(0.7, 1.3, 1)); print.setMatrixAt(i, m); });
      print.instanceMatrix.needsUpdate = true;
      print.castShadow = false;
    }

    // ---- the child by the hand, hooded, pulling the other way
    let child: Figure | null = null;
    if (a.carries === 'child') {
      const kid = figure(s, {
        height: mix(0.9, 1.05, random()), build: 'slight', style: 'doll', skin: random() < 0.6 ? skin : pickSkin(random),
        hair: 'hood', hairColor: '#2a1e18', top: pick(random, ['#b23a2e', '#2b5a9a', '#4a7a3a', '#e2b61e']), bottom: pick(random, ['#2a2a30', '#55585e']), shoes: pick(random, ['#2f5a3a', '#dcdcd6']), sleeves: 'long',
        pose: 'standing', gaze: 'ahead',
      });
      const kidPose = rig(kid);
      kidPose.arm('right', { forward: 60, out: 50, bend: 6, across: 0 });
      kidPose.arm('left', { forward: 10, out: 8, bend: 20, across: 0 });
      kidPose.lean(-12);
      kidPose.look(-10, -30);
      kid.settle();
      const mother = at(s, person.hands.left);
      kid.root.position.set(mother.x + side.x * 0.42, 0, mother.z + side.z * 0.42);
      kid.root.rotation.y = turn - 0.9;
      s.root.add(kid.root);
      child = kid;
    }

    const energy = mood.energy;
    const rate = mix(0.6, 1.6, energy);
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        child?.update(dt, time);
        if (tip) for (const [i, drop] of drips.entries()) {
          const t = ((time * rate * 0.5 + i / 3) % 1 + 1) % 1;
          drop.position.y = tip.y + 0.26 - t * 0.25;
          (drop.material as THREE.MeshStandardMaterial).opacity = t < 0.95 ? 0.7 : 0;
        }
      },
    });
  },
});
