import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { BELTS, BELT_COLOUR, RAD, type Side, belly, hairdo, mawashi, pickSkin, reach, rig, sheen, sizes, towel } from './pose';

export default defineThing({
  questions: {
    belt: choice('What colour is his mawashi?', BELTS),
    leg: choice('Which leg is raised?', {
      right: 'The right leg raised, the weight on the left.',
      left: 'The left leg raised, the weight on the right.',
    }),
    depth: score('How high is the leg?', ['Barely off the sand, a warm-up stamp', 'Knee high, a working shiko', 'Foot above the hip, the full show of it']),
    hair: choice('What is his hair like?', {
      chonmage: 'An oiled topknot folded forward over the crown.',
      oicho: 'The formal ginkgo-leaf fan of a ranked man.',
      cropped: 'Cropped short: a new recruit without enough hair for a knot yet.',
    }),
    sweat: noul('Is his skin shining with sweat?'),
    marks: noul('Are there red slap marks across his chest and shoulders?'),
    towel: noul('Does a folded towel lie on the sand beside him?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.8, 1.9, random());
    const skin = pickSkin(random);
    const person = figure(s, {
      height: H, build: 'heavy', style: 'doll', hair: 'short', hairColor: '#1a1512', skin, top: skin, bottom: skin, shoes: skin, sleeves: 'short', pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    belly(person, H, s.material(skin, { roughness: 0.45 }));
    mawashi(s, person, H, 'heavy', BELT_COLOUR[a.belt]);
    hairdo(s, person, H, a.hair);
    if (a.sweat) sheen(s, person, skin, 0.22);

    // The pose: squat on one leg, swing the other out and up, hands braced on the standing knee.
    const pose = rig(person);
    const up: Side = a.leg, stand: Side = up === 'right' ? 'left' : 'right';
    const upSign = up === 'left' ? 1 : -1;
    const depth = a.depth;
    const squat = 36 + depth * 8;
    pose.leg(stand, { forward: squat, out: 10, knee: squat * 1.55, foot: 'flat' });
    pose.leg(up, { forward: 8 + depth * 4, out: 40 + depth * 50, knee: 10 + depth * 14 });
    // The raised foot flexes toes-up: turn it about the ankle's y so it points along the leg's up.
    person.joints.ankles[up].rotation.set(0, upSign * (55 + depth * 25) * RAD, 0);
    pose.lean(8, upSign * 2);
    pose.bow(24 + depth * 4, -upSign * 2);
    pose.look(-22, 0);
    person.root.updateMatrixWorld(true);
    const hip = person.joints.hips[stand].getWorldPosition(new THREE.Vector3());
    const knee = person.joints.knees[stand].getWorldPosition(new THREE.Vector3());
    // Hands rest on the thigh just above the knee, the near hand outside, the far hand across on top.
    const thigh = knee.clone().lerp(hip, 0.22);
    const { limb } = sizes(H, 'heavy');
    const standSign = -upSign;
    reach(person, stand, thigh.clone().add(new THREE.Vector3(standSign * limb * 1.1, 0.02, limb * 0.8)), standSign * 0.45, 0.6);
    reach(person, up, thigh.clone().add(new THREE.Vector3(-standSign * limb * 0.2, 0.08, limb * 1.1)), -standSign * 0.8, 0.6);
    person.settle();

    // Slap marks: dark red patches on the chest and the fronts of the shoulders.
    if (a.marks) {
      const { torsoL } = sizes(H, 'heavy');
      const red = s.material('#b85a48', { roughness: 1 });
      for (let i = 0; i < 4; i++) {
        const patch = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), red);
        patch.scale.set(H * 0.045, H * 0.03, H * 0.012);
        patch.position.set((i - 1.5) * H * 0.06 + (random() - 0.5) * H * 0.02, torsoL * (0.62 + (i % 2) * 0.12) + (random() - 0.5) * H * 0.02, H * 0.078);
        patch.rotation.z = (random() - 0.5) * 0.8;
        person.joints.spine.add(patch);
      }
      for (const side of ['left', 'right'] as const) {
        const patch = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), red);
        patch.scale.set(H * 0.03, H * 0.022, H * 0.012);
        patch.position.set(0, -H * 0.04, limb * 0.95);
        person.joints.shoulders[side].add(patch);
      }
    }

    // Sand clinging to the sole and heel of the planted foot when the hall has been worked in.
    if (mood.wear > 0.35) {
      const dust = s.material('#cfc3a8', { roughness: 1 });
      const foot = person.joints.ankles[stand];
      const smear = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), dust);
      smear.scale.set(limb * 1.0, limb * 0.35, limb * 1.6);
      smear.position.set(0, -H * 0.03 - limb * 0.6, limb * 1.1);
      foot.add(smear);
    }

    if (a.towel) towel(s, [standSign * mix(0.55, 0.7, random()), 0, mix(0.05, 0.35, random())], '#f0ece2', (random() - 0.5) * 1.2);

    const energy = mood.energy;
    const restUp = person.joints.hips[up].rotation.z;
    const phase = random() * 6.28;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        person.joints.hips[up].rotation.z = restUp + Math.sin(time * mix(0.8, 2.2, energy) + phase) * 0.025 * (0.3 + energy);
      },
    });
  },
});
