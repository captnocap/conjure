import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
import { BELTS, BELT_COLOUR, type P, at, belly, bottle, mawashi, pickSkin, reach, rig, sandals, sheen, sizes, towel } from './pose';

const TOWELS = {
  white: 'Plain white terry, the stable issue.',
  grey: 'Grey, washed thin.',
  blue: 'Pale blue with a darker stripe at the hem.',
  navy: 'Navy with the stable name in white.',
  pink: 'A faded pink one somebody\'s mother sent.',
} as const;
const TOWEL_COLOUR: Record<keyof typeof TOWELS, string> = { white: '#f1ede4', grey: '#a7a49c', blue: '#b9cfe0', navy: '#243454', pink: '#dcb0b4' };

export default defineThing({
  questions: {
    build: choice('Who is squatting there?', {
      heavy: 'A heavy veteran, belly resting on his thighs.',
      average: 'A solid mid-ranker, thick but not vast.',
    }),
    towel: choice('What colour is the towel over his head?', TOWELS),
    hang: score('How low does his head hang?', ['Chin down, still watching the ring through the towel', 'Face hidden, forehead near his knees', 'Folded almost double, the towel brushing the sand']),
    hand: choice('What is in his hand?', {
      bottle: 'A plastic water bottle dangling from his fingers.',
      ladle: 'A wooden ladle of water from the bucket.',
      nothing: 'Nothing; the hands hang empty between the knees.',
    }),
    belt: choice('What colour is his mawashi?', BELTS),
    scraped: noul('Is his back scraped raw and red from the clay?'),
    bandage: noul('Is one knee wrapped in a white bandage?'),
    around: choice('What lies around him on the sand?', {
      nothing: 'Bare sand.',
      towel: 'A second towel dropped in a heap.',
      sandals: 'His sandals, kicked off.',
      cup: 'A paper cup and a crumpled wrapper.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const build = a.build;
    const H = build === 'heavy' ? mix(1.82, 1.92, random()) : mix(1.76, 1.86, random());
    const skin = pickSkin(random);
    const person = figure(s, {
      height: H, build, style: 'doll', hair: 'none', skin, top: skin, bottom: skin, shoes: skin, sleeves: 'short', pose: 'standing', gaze: 'down', face: 'blank',
    });
    s.root.add(person.root);
    belly(person, H, s.material(skin, { roughness: 0.45 }), build === 'heavy' ? 1 : 0.7);
    mawashi(s, person, H, build, BELT_COLOUR[a.belt]);
    sheen(s, person, skin, 0.28 + (1 - mood.energy) * 0.15);
    const { limb, torsoL, hipW } = sizes(H, build);

    // ---- the squat: heels down, thighs spread, elbows on the knees, head hung
    const pose = rig(person);
    for (const side of ['left', 'right'] as const) pose.leg(side, { forward: 102, out: 18, knee: 142, foot: 'flat' });
    pose.lean(14, 0);
    pose.bow(24 + a.hang * 14, 0, 0);
    pose.look(34 + a.hang * 30, (random() - 0.5) * 10);
    person.settle();
    person.root.updateMatrixWorld(true);
    const kneeL = at(s, person.joints.knees.left);
    const kneeR = at(s, person.joints.knees.right);
    // Hands dangle just ahead of and inside the knees so the forearms rest along the thighs.
    reach(person, 'left', kneeL.clone().add(new THREE.Vector3(-limb * 1.2, -0.02, 0.14)), -0.5, 0.5);
    reach(person, 'right', kneeR.clone().add(new THREE.Vector3(limb * 1.2, -0.04, 0.12)), 0.5, 0.5);
    person.settle();
    person.root.updateMatrixWorld(true);

    // ---- the towel: one cloth bell fitted over the hung head and the back of the neck, hanging with gravity
    const cloth = s.material(TOWEL_COLOUR[a.towel], { roughness: 0.95, side: THREE.DoubleSide });
    const headBox = new THREE.Box3().setFromObject(person.head);
    headBox.expandByPoint(at(s, person.joints.neck));
    const centre = headBox.getCenter(new THREE.Vector3());
    const half = headBox.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const R = Math.max(half.x, half.z) * 1.12;
    const stretchX = Math.max(0.8, (half.x * 1.25) / R), stretchZ = Math.max(0.9, (half.z * 1.2) / R);
    const fall = half.y + mix(0.1, 0.26, a.hang) + random() * 0.04;
    const foldPhase = random() * 6.28, hemPhase = random() * 6.28, folds = 5 + Math.floor(random() * 3);
    const bell = new ParametricGeometry((u, v, target) => {
      const phi = u * Math.PI * 2;
      const cap = 0.38;
      let r: number, y: number, d = 0;
      if (v < cap) {
        const theta = 0.012 + (v / cap) * (Math.PI / 2 - 0.012);
        r = R * Math.sin(theta);
        y = R * 0.72 * Math.cos(theta);
      } else {
        d = (v - cap) / (1 - cap);
        r = R * (1 + 0.42 * Math.pow(d, 1.2));
        y = -fall * d;
      }
      r *= 1 + d * (0.09 * Math.sin(phi * folds + foldPhase) + 0.04 * Math.sin(phi * 13 + hemPhase));
      y -= d * d * 0.035 * Math.sin(phi * 3 + hemPhase);
      target.set(Math.cos(phi) * r * stretchX, y, Math.sin(phi) * r * stretchZ);
    }, 40, 14);
    const drape = new THREE.Mesh(bell, cloth);
    drape.position.set(centre.x, headBox.max.y - R * 0.6, centre.z);
    drape.castShadow = drape.receiveShadow = true;
    s.root.add(drape);
    // A hem band in a second colour, for the striped and lettered towels.
    if (a.towel === 'blue' || a.towel === 'navy') {
      const edge = s.material(a.towel === 'blue' ? '#4a6f96' : '#eeeeea', { roughness: 0.9, side: THREE.DoubleSide });
      const band = new ParametricGeometry((u, v, target) => {
        const phi = u * Math.PI * 2, d = 0.86 + v * 0.06;
        const r = R * (1 + 0.42 * Math.pow(d, 1.2)) * (1 + d * (0.09 * Math.sin(phi * folds + foldPhase) + 0.04 * Math.sin(phi * 13 + hemPhase))) * 1.01;
        target.set(Math.cos(phi) * r * stretchX, -fall * d - d * d * 0.035 * Math.sin(phi * 3 + hemPhase), Math.sin(phi) * r * stretchZ);
      }, 40, 1);
      const stripe = new THREE.Mesh(band, edge);
      stripe.position.copy(drape.position);
      s.root.add(stripe);
    }

    // ---- what is in his hand: a bottle or a ladle hung upright from the fingers
    const upright = (node: THREE.Object3D, hand: THREE.Object3D) => {
      hand.updateWorldMatrix(true, false);
      node.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).invert());
      hand.add(node);
    };
    if (a.hand === 'bottle') {
      const group = new THREE.Group();
      const b = bottle(s, [0, 0, 0], false);
      s.root.remove(b);
      b.position.set(0, -0.2, 0.02);
      group.add(b);
      upright(group, person.hands.right);
    } else if (a.hand === 'ladle') {
      const wood = s.material('#b89a6a', { roughness: 0.8 });
      const group = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 8), wood);
      handle.rotation.z = 0.35;
      handle.position.set(0.06, -0.12, 0);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.055, 12, 1, true), wood);
      cup.position.set(0.13, -0.32, 0);
      const water = new THREE.Mesh(new THREE.CircleGeometry(0.042, 12), s.material('#a9c4c9', { roughness: 0.1 }));
      water.rotation.x = -Math.PI / 2;
      water.position.set(0.13, -0.3, 0);
      handle.castShadow = cup.castShadow = true;
      group.add(handle, cup, water);
      upright(group, person.hands.right);
    }

    // ---- the scraped back, the bandaged knee
    if (a.scraped) {
      const raw = s.material('#b24e40', { roughness: 1 });
      for (let i = 0; i < 3; i++) {
        const patch = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), raw);
        patch.scale.set(H * (0.03 + random() * 0.025), H * (0.045 + random() * 0.03), H * 0.012);
        patch.position.set((i - 1) * H * 0.045 + (random() - 0.5) * H * 0.02, torsoL * (0.35 + i * 0.18), -limb * (build === 'heavy' ? 1.55 : 1.3));
        patch.rotation.z = (random() - 0.5) * 0.6;
        person.joints.spine.add(patch);
      }
    }
    if (a.bandage) {
      const gauze = s.material('#f3f1ea', { roughness: 0.95 });
      const knee = person.joints.knees[random() < 0.5 ? 'left' : 'right'];
      for (let i = 0; i < 4; i++) {
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(limb * 1.07, limb * 1.09, limb * 0.5, 16), gauze);
        wrap.position.y = -limb * 0.35 - i * limb * 0.48;
        wrap.rotation.z = (random() - 0.5) * 0.1;
        wrap.castShadow = true;
        knee.add(wrap);
      }
    }

    // ---- what lies around him
    const side = random() < 0.5 ? -1 : 1;
    if (a.around === 'towel') {
      const heap = towel(s, [side * mix(0.55, 0.7, random()), 0, mix(0.1, 0.3, random())], '#e8e3d8', random() * 3);
      heap.scale.set(1, 0.8, 1.2);
    }
    if (a.around === 'sandals') sandals(s, [side * 0.6, 0, -0.1 + random() * 0.3], random() - 0.5);
    if (a.around === 'cup') {
      const paper = s.material('#f0ece2', { roughness: 0.9 });
      const cup = s.cylinder(0.04, 0.03, 0.09, [side * 0.55, 0.035, 0.3], paper, 12);
      cup.rotation.set(Math.PI / 2 + 0.3, 0, random() * 2);
      const wrapper = s.ball([0.045, 0.025, 0.04], [side * 0.72, 0.02, 0.1], s.material('#d9c35a', { roughness: 0.7 }), 7);
      wrapper.rotation.set(random(), random(), 0);
    }

    // Clay on the heels and the seat of the belt when the hall has been worked in.
    if (mood.wear > 0.3) {
      const dust = s.material('#cfc3a8', { roughness: 1 });
      const seat = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), dust);
      seat.scale.set(hipW * 0.9, limb * 0.5, limb * 0.6);
      seat.position.set(0, -limb * 0.3, -limb * 2.9);
      person.pelvis.add(seat);
    }

    const energy = mood.energy;
    const restBow = person.joints.spine.rotation.x;
    const phase = random() * 6.28;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        // Heavy breathing: the whole back rises and falls.
        person.joints.spine.rotation.x = restBow + Math.sin(time * mix(1.6, 3.2, energy) + phase) * 0.03;
      },
    });
  },
});
