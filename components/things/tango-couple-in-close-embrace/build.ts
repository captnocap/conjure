import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, score } from '@conjure/kit';
import { anatomy, at, garment, heel, paint, pick, pickSkin, pocketSquare, reachHand, rig, shirtFront, skirt, slick } from './milonga';

const DRESSES = {
  red: 'Red satin, the classic.',
  black: 'Black, severe and elegant.',
  emerald: 'Emerald green silk.',
  gold: 'Gold sequins catching the light.',
  white: 'White, bridal or defiant.',
  plum: 'Deep plum velvet.',
} as const;
const DRESS_COLOUR: Record<keyof typeof DRESSES, string> = { red: '#b3202c', black: '#1c1b1f', emerald: '#1f6b4a', gold: '#c9a23a', white: '#f1ece2', plum: '#5a1f44' };

export default defineThing({
  questions: {
    dress: choice('What colour is her dress?', DRESSES),
    step: choice('Who is stepping forward?', {
      man: 'The man steps forward, driving the walk; she travels backward.',
      woman: 'She steps forward into him; he yields back.',
      neither: 'Neither: feet gathered under them, weight suspended.',
    }),
    leg: score('How high does her free leg whip back?', ['Barely off the floor', 'Calf height', 'Knee height', 'Thigh height', 'A high whip to the hip']),
    moment: choice('What is the moment?', {
      pause: 'A held pause: upright, chests pressed, the leg hovering, waiting for the music.',
      sweep: 'A long sweep: deep lean, long stride, the leg flung, hair flying.',
      walk: 'The quiet walk: small steps, upright, almost still, the hard part.',
    }),
    hair: choice('How is her hair?', {
      bun: 'A tight low bun with a flower.',
      slicked: 'Short and slicked back like his.',
      long: 'Long and loose down her back.',
    }),
    suit: choice('What is he wearing?', {
      jacket: 'A dark suit jacket, buttoned, with a thin tie.',
      waistcoat: 'Shirtsleeves and a dark waistcoat, jacket left on a chair.',
      white: 'A white dinner jacket and a bow tie.',
      pinstripe: 'A grey pinstripe suit with a pocket square.',
    }),
    couple: choice('Who are they?', {
      young: 'A young couple, dark-haired, showing off.',
      old: 'An old couple, grey-haired, slower and closer, decades of this.',
      mixed: 'An old milonguero with a much younger partner, teaching her the walk.',
      strangers: 'Two strangers who met by a nod across the room ten minutes ago.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const old = a.couple === 'old';
    const himOld = old || a.couple === 'mixed';
    const Hm = mix(1.74, 1.84, random()) * (old ? 0.96 : 1);
    const Hw = mix(1.6, 1.7, random()) * (old ? 0.97 : 1);
    const skinM = pickSkin(random), skinW = a.couple === 'old' ? skinM : pickSkin(random);
    const grey = pick(random, ['#d9d6cf', '#b5b2ab', '#8a8780']);
    const dark = pick(random, ['#1f1612', '#2a1e18', '#3b2a22']);
    const dressColour = DRESS_COLOUR[a.dress];
    const dressMat = s.material(dressColour, { roughness: a.dress === 'gold' ? 0.3 : a.dress === 'plum' ? 0.95 : 0.5, metalness: a.dress === 'gold' ? 0.5 : 0, side: THREE.DoubleSide });
    const suitColour = { jacket: '#23232a', waistcoat: '#2b2a31', white: '#efe9dc', pinstripe: '#4d4e55' }[a.suit];
    const trouserColour = a.suit === 'white' ? '#1c1b1f' : suitColour;
    const sweep = a.moment === 'sweep';
    const legLift = a.leg * (a.moment === 'pause' ? 0.7 : a.moment === 'walk' ? 0.45 : 1);

    // ---- him: facing +z, the planted frame of the embrace
    const him = figure(s, {
      height: Hm, build: himOld ? (random() < 0.5 ? 'heavy' : 'average') : 'average', style: 'doll', skin: skinM,
      hair: 'none',
      top: a.suit === 'waistcoat' ? '#f4f1ea' : suitColour, bottom: trouserColour, shoes: '#141214', sleeves: 'long',
      pose: 'standing', gaze: 'down',
    });
    s.root.add(him.root);
    const hisPose = rig(him);
    const stride = sweep ? 34 : a.moment === 'walk' ? 16 : 8;
    if (a.step === 'man') { hisPose.leg('left', { forward: stride, knee: 4, out: 3 }); hisPose.leg('right', { forward: -stride * 0.6, knee: 10, out: 3 }); }
    else if (a.step === 'woman') { hisPose.leg('left', { forward: -stride * 0.7, knee: 12, out: 3 }); hisPose.leg('right', { forward: stride * 0.4, knee: 4, out: 3 }); }
    else { hisPose.leg('left', { forward: 4, knee: 2, out: 4 }); hisPose.leg('right', { forward: -4, knee: 4, out: 2 }); }
    hisPose.lean(sweep ? 9 : 5, 0);
    const bald = himOld && random() < 0.4;
    hisPose.bow(0, 0, 6);
    him.settle();
    him.root.updateMatrixWorld(true);
    const hisChest = at(s, him.joints.spine);
    const { torsoL: torsoM, chestR: chestM } = anatomy(Hm, 'average');

    // ---- her: facing -z, pressed to him, a little to his right so the heads pass
    const her = figure(s, {
      height: Hw, build: 'slight', style: 'doll', skin: skinW,
      hair: a.hair === 'slicked' ? 'none' : a.hair, hairColor: old ? grey : dark,
      top: dressColour, bottom: dressColour, shoes: dressColour === '#1c1b1f' ? '#2a2326' : '#1c1b1f', sleeves: 'short',
      pose: 'standing', gaze: 'down',
    });
    s.root.add(her.root);
    const herPose = rig(her);
    // Planted left foot under her; right leg trails back (her back is +z in the world) and the knee folds the shin up.
    const plantForward = a.step === 'woman' ? stride * 0.8 : a.step === 'man' ? -stride * 0.5 : 2;
    herPose.leg('left', { forward: plantForward, knee: 2, out: 2, foot: -plantForward - 2 + 12 });
    herPose.leg('right', { forward: -(12 + 42 * legLift), knee: 35 + 95 * legLift, out: 6 + 6 * legLift, foot: 92 });
    herPose.lean(sweep ? 10 : 6, 0);
    herPose.bow(0, 0, -5);
    her.settle();
    her.root.rotation.y = Math.PI;
    const { torsoL: torsoW, chestR: chestW } = anatomy(Hw, 'slight');
    her.root.position.set(-0.07, 0, 0.6);
    her.root.updateMatrixWorld(true);
    // Chests touching: measure the two breastbones and close the gap to a shirt's thickness.
    const hisBreast = him.joints.spine.localToWorld(new THREE.Vector3(0, torsoM * 0.75, chestM));
    const herBreast = her.joints.spine.localToWorld(new THREE.Vector3(0, torsoW * 0.75, chestW));
    her.root.position.z -= herBreast.z - hisBreast.z - 0.015;
    her.root.updateMatrixWorld(true);

    // ---- the frame of arms: his left and her right joined out on the open side (+x), elbows bent, at shoulder height
    const shoulderY = at(s, him.joints.shoulders.left).y;
    const between = hisBreast.z + 0.008;
    // The joined hands sit well out to the open side, a little above his shoulder and forward of the chests, so both elbows bend into a V.
    const joined = new THREE.Vector3(sweep ? 0.5 : 0.44, shoulderY + (sweep ? 0.1 : 0.05), between + 0.1);
    reachHand(s, him, 'left', joined, { outMin: 25, outMax: 95 });
    reachHand(s, her, 'right', joined.clone().add(new THREE.Vector3(0.025, 0.04, 0.01)), { outMin: 20, outMax: 90 });
    // His right arm round her back, her left arm over his shoulder.
    const herBack = her.joints.spine.localToWorld(new THREE.Vector3(-0.03, torsoW * 0.72, -chestW - 0.02));
    reachHand(s, him, 'right', herBack, { across: true, outMin: -30, outMax: 60 });
    const hisShoulder = him.joints.spine.localToWorld(new THREE.Vector3(-0.07, torsoM * 1.02, -chestM * 0.4));
    reachHand(s, her, 'left', hisShoulder, { across: true, outMin: -30, outMax: 80 });
    // Both heads turn toward the joined hands and look down; hers tips to his cheek.
    hisPose.look(a.moment === 'walk' ? 14 : 20, 32, old ? 4 : 8);
    herPose.look(18, -34, 12);

    // ---- her dress and heels: a slit on the trailing side lets the leg out
    skirt(her, Hw, 'slight', dressMat, { length: Hw * (sweep ? 0.38 : 0.42), flare: 1.5, slit: 55, slitAt: -140, drop: 0.02 });
    // Bare legs under the dress: the hips keep the dress colour, the thighs and shins take her skin.
    const skinMat = s.material(skinW, { roughness: 0.45 });
    for (const side of ['left', 'right'] as const) for (const node of [her.joints.hips[side], her.joints.knees[side]]) for (const child of node.children) if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = skinMat;
    const shoeMat = s.material(a.dress === 'gold' ? '#c9a23a' : a.dress === 'white' ? '#e9e2d4' : '#1c1b1f', { roughness: 0.35, metalness: a.dress === 'gold' ? 0.5 : 0 });
    heel(her, 'left', Hw, shoeMat, 0.075);
    heel(her, 'right', Hw, shoeMat, 0.075);
    if (a.hair === 'bun') {
      const flower = s.mesh(new THREE.SphereGeometry(0.025, 10, 8), s.material(a.dress === 'red' ? '#f1ece2' : '#c8202c', { roughness: 0.8 }));
      flower.position.set(0.035, 0.06, -0.045);
      flower.scale.set(1, 0.8, 1);
      her.head.add(flower);
    } else if (a.hair === 'slicked') slick(her, Hw, s.material(old ? grey : dark, { roughness: 0.35 }));
    // A hint of a neckline: a slim strap and a necklace.
    const chain = new THREE.Mesh(new THREE.TorusGeometry(chestW * 0.7, 0.004, 6, 20, Math.PI), s.material('#d9c27a', { metalness: 0.9, roughness: 0.25 }));
    chain.position.set(0, torsoW * 0.96, chestW * 1.02);
    chain.rotation.z = Math.PI;
    her.joints.spine.add(chain);

    // ---- his suit: jacket or waistcoat over a white shirt, a tie or bow, slicked hair
    if (a.suit === 'waistcoat') garment(him, Hm, 'average', s.material('#2b2a31', { roughness: 0.8, side: THREE.DoubleSide }), { grow: 1.1, length: 0.92, open: 44, lift: 0.02 });
    else {
      let jacketMat: THREE.Material;
      if (a.suit === 'pinstripe') {
        const stripes = paint(128, 128, (c) => {
          c.fillStyle = suitColour;
          c.fillRect(0, 0, 128, 128);
          c.fillStyle = '#8a8b93';
          for (let x = 6; x < 128; x += 16) c.fillRect(x, 0, 2, 128);
        });
        stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
        stripes.repeat.set(6, 3);
        jacketMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.8, side: THREE.DoubleSide });
      } else jacketMat = s.material(a.suit === 'white' ? '#f1ebdd' : '#1d1d24', { roughness: a.suit === 'white' ? 0.7 : 0.85, side: THREE.DoubleSide });
      // An open jacket over the shirt, flaring a little at the hem, with two lapels folded back at the gap.
      garment(him, Hm, 'average', jacketMat, { grow: 1.12, length: 1.04, open: 38, flare: 1.1, lift: -0.02 });
      const { torsoL, chestR } = anatomy(Hm, 'average');
      for (const side of [-1, 1]) {
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(chestR * 0.34, torsoL * 0.46, 0.012), jacketMat);
        lapel.position.set(side * chestR * 0.42, torsoL * 0.72, chestR * 1.06);
        lapel.rotation.set(0, side * 0.5, side * 0.12);
        lapel.castShadow = true;
        him.joints.spine.add(lapel);
      }
    }
    shirtFront(s, him, Hm, 'average', { tie: a.suit === 'white' ? 'bow' : 'tie', tieColour: a.suit === 'white' ? '#1c1b1f' : pick(random, ['#7a1f2a', '#1f2a4a', '#2a2a30', '#5a3a1a']) });
    if (a.suit === 'pinstripe' || a.suit === 'white') pocketSquare(him, Hm, 'average', s.material(a.suit === 'white' ? '#b3202c' : '#f1ece2', { roughness: 0.9 }));
    if (!bald) slick(him, Hm, s.material(himOld ? grey : dark, { roughness: 0.3 }));

    // Turn the pair so they stand side by side across the view, the open side of the embrace toward +z.
    const couple = new THREE.Group();
    couple.rotation.y = -55 * Math.PI / 180;
    couple.add(him.root, her.root);
    s.root.add(couple);

    // The couple is one shape: a breath, and her free leg trembling at the top of the whip.
    const hipR = her.joints.hips.right;
    const baseHip = hipR.rotation.x;
    const energy = mood.energy;
    return s.finish({
      update(dt, time) {
        him.update(dt, time);
        her.update(dt, time);
        hipR.rotation.x = baseHip + Math.sin(time * mix(0.8, 2.4, energy)) * 0.03 * (0.3 + energy) * legLift;
      },
    });
  },
});
