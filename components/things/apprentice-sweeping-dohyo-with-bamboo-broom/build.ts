import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { BELTS, BELT_COLOUR, type P, at, bucket, hairdo, mawashi, pickSkin, reach, rig, sandals, sizes } from './pose';

const JACKETS = {
  white: 'Undyed white cotton gone grey at the cuffs.',
  indigo: 'Deep indigo, the stable crest faded on the back.',
  grey: 'Plain workshop grey.',
  green: 'Dull moss green.',
  stripes: 'Blue and white vertical stripes.',
} as const;
const JACKET_COLOUR: Record<keyof typeof JACKETS, string> = { white: '#e6e2d6', indigo: '#263352', grey: '#7d7d80', green: '#55634a', stripes: '#4a6a9a' };

export default defineThing({
  questions: {
    tool: choice('What is he sweeping with?', {
      broom: 'A wide bamboo twig broom, the twigs splayed in a fan.',
      rake: 'A wooden rake with a row of pegs, drawing lines in the sand.',
      push: 'A short stiff-bristled push broom on a long handle.',
    }),
    pile: score('How much has he swept up?', ['Just started: a few scuffs in the sand', 'A small heap gathering by the broom', 'A proper mound, ready for the dustpan']),
    jacket: choice('What colour is his cotton jacket?', JACKETS),
    belt: choice('What colour is the mawashi under it?', BELTS),
    hair: choice('What is his hair like?', {
      cropped: 'Cropped close: a new recruit, not enough hair for a knot yet.',
      loose: 'Grown out and loose, tied back with a cord.',
      chonmage: 'Long enough at last for a small oiled topknot.',
    }),
    glance: noul('Does he glance over his shoulder at someone behind him?'),
    beside: choice('What stands near him on the sand?', {
      dustpan: 'Only the wooden dustpan waiting for the pile.',
      bucket: 'A wooden bucket of water with a ladle, for damping the sand after.',
      sandals: 'His own flat sandals kicked off at the edge.',
      both: 'The bucket, the ladle and the sandals.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.64, 1.74, random());
    const skin = pickSkin(random);
    const jacket = JACKET_COLOUR[a.jacket];
    const person = figure(s, {
      height: H, build: 'slight', style: 'doll', skin, top: jacket, bottom: skin, shoes: skin, sleeves: 'long',
      hair: a.hair === 'loose' ? 'long' : 'short', hairColor: '#1a1512', pose: 'standing', gaze: 'down',
    });
    s.root.add(person.root);
    mawashi(s, person, H, 'slight', BELT_COLOUR[a.belt]);
    if (a.hair !== 'loose') hairdo(s, person, H, a.hair);
    const { limb, torsoL, headR } = sizes(H, 'slight');

    // The jacket: a hem that hangs over the mawashi, a crossed collar, stripes if asked.
    const cloth = s.material(jacket, { roughness: 0.9, side: THREE.DoubleSide });
    const hem = new THREE.Mesh(new THREE.CylinderGeometry(limb * 1.7, limb * 2.3, torsoL * 0.42, 18, 1, true), cloth);
    hem.scale.x = 1.5;
    hem.position.set(0, torsoL * 0.02, 0);
    hem.castShadow = hem.receiveShadow = true;
    person.joints.spine.add(hem);
    const collar = s.material(a.jacket === 'white' ? '#2a2d3e' : '#ece6d8', { roughness: 0.8 });
    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(limb * 0.7, torsoL * 0.5, limb * 0.25), collar);
      strip.position.set(side * limb * 0.55, torsoL * 0.72, limb * 1.45);
      strip.rotation.z = side * 0.42;
      strip.castShadow = true;
      person.joints.spine.add(strip);
    }
    if (a.jacket === 'stripes') {
      const white = s.material('#eceae2', { roughness: 0.9 });
      for (let i = -2; i <= 2; i++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(limb * 0.35, torsoL * 0.8, limb * 0.1), white);
        stripe.position.set(i * limb * 0.75, torsoL * 0.5, limb * 1.42);
        stripe.castShadow = true;
        person.joints.spine.add(stripe);
      }
    }
    if (a.hair === 'loose') {
      const cord = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.3, headR * 0.05, 6, 12), s.material('#c9b58a'));
      cord.position.set(0, -headR * 0.35, -headR * 0.75);
      person.head.add(cord);
    }

    // ---- the pose: bent double, knees soft, the broom head out to one side
    const side = random() < 0.5 ? -1 : 1; // which way the broom head goes: -1 is the figure's right
    const pose = rig(person);
    const bow = 38 + random() * 6;
    pose.leg('left', { forward: 12, out: 7, knee: 22, foot: 'flat' });
    pose.leg('right', { forward: 6, out: 7, knee: 18, foot: 'flat' });
    pose.lean(6, side * 3);
    pose.bow(bow, side * 4, -side * 10);
    if (a.glance) pose.look(-4, -side * 78, side * 6);
    else pose.look(28 + random() * 6, side * 10);
    person.settle();
    person.root.updateMatrixWorld(true);

    // Hands: the upper hand near the chest on the figure's far side, the lower hand reaching down the shaft.
    const upperSide = side === -1 ? 'left' : 'right';
    const lowerSide = side === -1 ? 'right' : 'left';
    const SU = person.joints.shoulders[upperSide].getWorldPosition(new THREE.Vector3());
    const SL = person.joints.shoulders[lowerSide].getWorldPosition(new THREE.Vector3());
    const U = SU.clone().add(new THREE.Vector3(side * 0.12, -0.21 * (H / 1.7), 0.12));
    const L = SL.clone().add(new THREE.Vector3(side * 0.06, -0.54 * (H / 1.7), 0.2));
    reach(person, upperSide, U, -side * 0.6, 0.6);
    reach(person, lowerSide, L, side * 0.25, 0.6);
    person.root.updateMatrixWorld(true);

    // ---- the broom: a shaft through both hands, extended to the floor; the head sits where it lands
    const handU = at(s, person.hands[upperSide]);
    const handL = at(s, person.hands[lowerSide]);
    const dir = handL.clone().sub(handU).normalize();
    if (dir.y > -0.45) { dir.y = -0.45; dir.normalize(); } // never let it go so shallow the head leaves the stage
    const floorY = 0.035;
    const t = (handL.y - floorY) / -dir.y;
    const foot = handL.clone().addScaledVector(dir, t);
    const top = handU.clone().addScaledVector(dir, -0.18);
    const woodTone = a.tool === 'push' ? '#8a6a46' : '#b89760';
    const wood = s.material(woodTone, { roughness: 0.7 });
    s.rod(top.toArray() as P, foot.clone().addScaledVector(dir, -0.06).toArray() as P, 0.016, wood, 0.013);
    // Hands wrap the shaft: a small grip bead at each so the fingers read as closed round it.
    const grip = s.material(skin, { roughness: 0.5 });
    for (const hand of [handU, handL]) s.ball([limb * 0.95, limb * 0.8, limb * 0.95], hand.toArray() as P, grip, 10);
    const straw = s.material('#c9b26a', { roughness: 0.95, side: THREE.DoubleSide });
    const binding = s.material('#4a3a2a', { roughness: 0.8 });
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    if (a.tool === 'broom') {
      // A fan of twigs: a flattened cone from the shaft end, bound twice, with loose twig tips at the edge.
      const fan = s.mesh(new THREE.CylinderGeometry(0.035, 0.26, 0.42, 20, 1, true), straw, foot.clone().addScaledVector(dir, -0.2).toArray() as P);
      fan.quaternion.copy(q);
      fan.scale.z = 0.3;
      for (const [i, w] of [0.038, 0.06].entries()) {
        const band = s.cylinder(w, w * 1.1, 0.03, foot.clone().addScaledVector(dir, -0.4 + i * 0.07).toArray() as P, binding, 14);
        band.quaternion.copy(q);
        band.scale.z = 0.5;
      }
      const twigs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.004, 0.006, 0.16, 5), straw, 34);
      const m = new THREE.Matrix4(), pos = new THREE.Vector3(), rot = new THREE.Quaternion(), scl = new THREE.Vector3(1, 1, 1);
      const basis = new THREE.Matrix4().makeRotationFromQuaternion(q);
      for (let i = 0; i < 34; i++) {
        const u = (i / 33 - 0.5) * 2;
        const spread = new THREE.Vector3(u * 0.26, 0.09, (random() - 0.5) * 0.08).applyMatrix4(basis);
        pos.copy(foot).add(spread);
        rot.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -u * 0.55 + (random() - 0.5) * 0.2));
        m.compose(pos, rot, scl);
        twigs.setMatrixAt(i, m);
      }
      twigs.instanceMatrix.needsUpdate = true;
      twigs.castShadow = twigs.receiveShadow = true;
      s.root.add(twigs);
    } else if (a.tool === 'rake') {
      const bar = s.mesh(new THREE.BoxGeometry(0.46, 0.035, 0.035), wood, foot.clone().addScaledVector(dir, -0.04).toArray() as P);
      bar.quaternion.copy(q);
      const pegs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.005, 0.1, 6), wood, 11);
      const m = new THREE.Matrix4(), pos = new THREE.Vector3(), scl = new THREE.Vector3(1, 1, 1);
      const basis = new THREE.Matrix4().makeRotationFromQuaternion(q);
      for (let i = 0; i < 11; i++) {
        pos.copy(foot).addScaledVector(dir, -0.04).add(new THREE.Vector3((i / 10 - 0.5) * 0.42, 0.0, 0).applyMatrix4(basis)).addScaledVector(dir, 0.05);
        m.compose(pos, q, scl);
        pegs.setMatrixAt(i, m);
      }
      pegs.instanceMatrix.needsUpdate = true;
      pegs.castShadow = true;
      s.root.add(pegs);
    } else {
      const head = s.mesh(new THREE.BoxGeometry(0.4, 0.05, 0.08), wood, foot.clone().addScaledVector(dir, -0.09).toArray() as P);
      head.quaternion.copy(q);
      const bristles = s.mesh(new THREE.BoxGeometry(0.38, 0.07, 0.07), s.material('#3a3328', { roughness: 1 }), foot.clone().addScaledVector(dir, -0.035).toArray() as P);
      bristles.quaternion.copy(q);
    }

    // ---- the swept sand: scuffs, a heap, grains ahead of the broom; the dustpan beside it
    const sand = s.material(`hsl(38, ${28 - mood.wear * 8}%, ${64 - mood.wear * 10}%)`, { roughness: 1 });
    const ahead = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    const pileAt = foot.clone().add(ahead.clone().multiplyScalar(0.3));
    const heap = 0.05 + a.pile * 0.11;
    const mound = s.ball([heap * 2.4, heap, heap * 1.8], [pileAt.x, 0, pileAt.z], sand, 14);
    mound.rotation.y = random() * 3;
    s.scatter(new THREE.SphereGeometry(1, 5, 4), sand, Array.from({ length: 10 + Math.round(a.pile * 26) }, () => {
      const r = heap * 2 + random() * 0.3, angle = random() * Math.PI * 2;
      return { at: [pileAt.x + Math.cos(angle) * r, 0.006, pileAt.z + Math.sin(angle) * r * 0.8] as P, size: 0.008 + random() * 0.014 };
    })).scale.y = 0.5;
    for (let i = 0; i < 3 + Math.round(a.pile * 2); i++) {
      const streak = s.box([0.5 + random() * 0.4, 0.004, 0.025], [pileAt.x - ahead.x * (0.2 + i * 0.17), 0.002, pileAt.z - ahead.z * (0.2 + i * 0.17) + (random() - 0.5) * 0.2], sand);
      streak.rotation.y = Math.atan2(ahead.x, ahead.z) + Math.PI / 2 + (random() - 0.5) * 0.5;
    }
    // Dustpan: a tin pan with three low sides and a wooden handle, lying by the heap.
    const panAt = pileAt.clone().add(new THREE.Vector3(-ahead.z, 0, ahead.x).multiplyScalar(side * 0.34));
    const tin = s.material('#8e9394', { metalness: 0.55, roughness: 0.45 });
    const pan = new THREE.Group();
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.006, 0.2), tin);
    tray.position.y = 0.003;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.006), tin);
    back.position.set(0, 0.03, -0.1);
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.2), tin);
    wallL.position.set(-0.12, 0.025, 0);
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.2), tin);
    wallR.position.set(0.12, 0.025, 0);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 10), wood);
    handle.rotation.x = Math.PI / 2 - 0.45;
    handle.position.set(0, 0.11, -0.22);
    for (const mesh of [tray, back, wallL, wallR, handle]) { mesh.castShadow = mesh.receiveShadow = true; pan.add(mesh); }
    pan.position.set(panAt.x, 0, panAt.z);
    pan.rotation.y = Math.atan2(ahead.x, ahead.z) + Math.PI + (random() - 0.5) * 0.6;
    s.root.add(pan);

    if (a.beside === 'bucket' || a.beside === 'both') bucket(s, [-side * 0.62, 0, -0.35 + random() * 0.2], random() * 3);
    if (a.beside === 'sandals' || a.beside === 'both') sandals(s, [-side * (a.beside === 'both' ? 0.35 : 0.5), 0, -0.62], random() - 0.5 + (side < 0 ? 0.4 : -0.4));

    // Sand on the shins and feet where he has been kneeling to gather it.
    if (mood.wear > 0.3) {
      const dust = s.material('#cfc3a8', { roughness: 1 });
      for (const leg of ['left', 'right'] as const) {
        const smear = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), dust);
        smear.scale.set(limb * 0.9, limb * 1.6, limb * 0.5);
        smear.position.set(0, -H * 0.17, limb * 0.85);
        person.joints.knees[leg].add(smear);
      }
    }

    const energy = mood.energy;
    const restBow = person.joints.spine.rotation.x;
    const phase = random() * 6.28;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        person.joints.spine.rotation.x = restBow + Math.sin(time * mix(1.2, 3.5, energy) + phase) * 0.018 * (0.2 + energy);
      },
    });
  },
});
