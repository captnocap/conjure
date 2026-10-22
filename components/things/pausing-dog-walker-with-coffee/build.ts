import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix } from '@conjure/kit';
import { at, coatSkirt, ground, hipsAt, joints, overTorso, pick, poseArm, poseLeg, scarf, skinTones } from './pose';

type Breed = 'terrier' | 'whippet' | 'labrador' | 'pug';
type Doing = 'sits' | 'pulls' | 'sniffs';

/** A small capsule-built dog standing on y = 0, facing +z. Returns the group and where its collar is. */
function dog(s: Sculpture, breed: Breed, doing: Doing) {
  const { random } = s.context;
  const spec = {
    terrier: { bodyL: 0.3, bodyR: 0.085, legL: 0.15, legR: 0.02, headR: 0.07, muzzle: [0.05, 0.04, 0.07], ears: 'up', tail: 'stub', coat: pick(random, ['#c9a46a', '#e8e4d8', '#3a3a3a', '#8a6a4a']), neckL: 0.06 },
    whippet: { bodyL: 0.48, bodyR: 0.075, legL: 0.33, legR: 0.014, headR: 0.055, muzzle: [0.04, 0.035, 0.1], ears: 'back', tail: 'whip', coat: pick(random, ['#8a8a84', '#c9b89a', '#4a4a4a', '#e8e4d8']), neckL: 0.12 },
    labrador: { bodyL: 0.62, bodyR: 0.14, legL: 0.32, legR: 0.03, headR: 0.1, muzzle: [0.08, 0.07, 0.11], ears: 'floppy', tail: 'thick', coat: pick(random, ['#d9c27a', '#1f1d1b', '#5a3a22']), neckL: 0.08 },
    pug: { bodyL: 0.26, bodyR: 0.1, legL: 0.11, legR: 0.022, headR: 0.085, muzzle: [0.06, 0.045, 0.03], ears: 'fold', tail: 'curl', coat: pick(random, ['#d9c29a', '#2a2a2a']), neckL: 0.04 },
  }[breed];
  const fur = s.material(spec.coat, { roughness: 1 });
  const dark = s.material(breed === 'pug' || breed === 'labrador' && spec.coat !== '#1f1d1b' ? '#1f1a18' : spec.coat, { roughness: 0.9 });
  const grey = s.material('#c9c4b8', { roughness: 1 });
  const group = new THREE.Group();
  const body = new THREE.Group();
  const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation?: [number, number, number]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const sitting = doing === 'sits';
  const hipY = spec.legL + spec.bodyR * 0.6;
  // Body along z, hips at the origin, shoulders forward.
  const trunk = add(body, new THREE.CapsuleGeometry(spec.bodyR, spec.bodyL - spec.bodyR * 2, 4, 12), fur, [0, 0, spec.bodyL / 2 - spec.bodyR], [Math.PI / 2, 0, 0]);
  if (breed === 'whippet') trunk.scale.y = 1.25;
  body.position.y = hipY;
  group.add(body);
  // Head on a neck at the front.
  const head = new THREE.Group();
  const neckTilt = doing === 'sniffs' ? 1.1 : sitting ? -0.3 : 0.2;
  head.position.set(0, spec.bodyR * 0.6, spec.bodyL - spec.bodyR * 0.5);
  head.rotation.x = neckTilt;
  body.add(head);
  add(head, new THREE.CylinderGeometry(spec.bodyR * 0.6, spec.bodyR * 0.8, spec.neckL + spec.headR, 8), fur, [0, (spec.neckL + spec.headR) / 2 * 0.5, spec.neckL * 0.3], [0.9, 0, 0]);
  const skull = add(head, new THREE.SphereGeometry(spec.headR, 12, 10), fur, [0, spec.neckL + spec.headR * 0.4, spec.neckL * 0.6]);
  if (breed === 'whippet') skull.scale.set(0.85, 0.9, 1.3);
  const [mw, mh, md] = spec.muzzle;
  add(head, new THREE.BoxGeometry(mw, mh, md), breed === 'pug' ? dark : breed === 'labrador' && random() < 0.5 ? grey : fur, [0, spec.neckL + spec.headR * 0.15, spec.neckL * 0.6 + spec.headR * 0.7 + md / 2]);
  add(head, new THREE.SphereGeometry(spec.headR * 0.18, 8, 6), s.material('#111111', { roughness: 0.3 }), [0, spec.neckL + spec.headR * 0.25, spec.neckL * 0.6 + spec.headR * 0.7 + md + 0.005]);
  for (const side of [-1, 1]) {
    const eye = add(head, new THREE.SphereGeometry(spec.headR * 0.12, 6, 5), s.material('#111111', { roughness: 0.3 }), [side * spec.headR * 0.45, spec.neckL + spec.headR * 0.5, spec.neckL * 0.6 + spec.headR * 0.8]);
    void eye;
    if (spec.ears === 'up') add(head, new THREE.ConeGeometry(spec.headR * 0.35, spec.headR * 0.8, 6), fur, [side * spec.headR * 0.6, spec.neckL + spec.headR * 1.2, spec.neckL * 0.6 - spec.headR * 0.1], [0, 0, -side * 0.25]);
    else if (spec.ears === 'floppy') add(head, new THREE.BoxGeometry(spec.headR * 0.5, spec.headR * 1.0, spec.headR * 0.2), fur, [side * spec.headR * 0.95, spec.neckL + spec.headR * 0.1, spec.neckL * 0.6 - spec.headR * 0.1], [0, 0, side * 0.2]);
    else if (spec.ears === 'fold') add(head, new THREE.BoxGeometry(spec.headR * 0.45, spec.headR * 0.5, spec.headR * 0.15), dark, [side * spec.headR * 0.8, spec.neckL + spec.headR * 0.7, spec.neckL * 0.6 - spec.headR * 0.2], [0, 0, side * 0.5]);
    else add(head, new THREE.ConeGeometry(spec.headR * 0.25, spec.headR * 0.7, 6), fur, [side * spec.headR * 0.55, spec.neckL + spec.headR * 0.9, spec.neckL * 0.6 - spec.headR * 0.5], [-1.2, 0, -side * 0.3]);
  }
  // The body settles first; the legs then run from its shoulder and hip points down to the ground.
  if (sitting) {
    body.rotation.x = -0.55;
    body.position.y = spec.bodyR * 1.05;
    body.position.z = -spec.bodyL * 0.05;
  } else if (doing === 'pulls') {
    body.rotation.x = 0.1;
    body.position.y = hipY - spec.bodyR * 0.1;
  }
  group.updateMatrixWorld(true);
  const frontZ = spec.bodyL - spec.bodyR * 1.3, hindZ = spec.bodyR * 0.5;
  const legBetween = (top: THREE.Vector3, bottom: THREE.Vector3, radius: number) => {
    const direction = top.clone().sub(bottom);
    const length = Math.max(direction.length(), 0.01);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.85, length, 7), fur);
    leg.position.copy(top).add(bottom).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    leg.castShadow = leg.receiveShadow = true;
    group.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.4, 6, 5), fur);
    foot.position.copy(bottom).add(new THREE.Vector3(0, radius * 0.9, radius * 0.6));
    foot.castShadow = true;
    group.add(foot);
  };
  for (const side of [-1, 1]) {
    const x = side * spec.bodyR * 0.6;
    const shoulder = body.localToWorld(new THREE.Vector3(x, -spec.bodyR * 0.3, frontZ));
    const frontLean = doing === 'pulls' ? -spec.legL * 0.3 : 0;
    legBetween(shoulder, new THREE.Vector3(shoulder.x, 0, shoulder.z + frontLean), spec.legR);
    const hip = body.localToWorld(new THREE.Vector3(x, -spec.bodyR * 0.3, hindZ));
    if (sitting) {
      const haunch = new THREE.Mesh(new THREE.SphereGeometry(spec.bodyR * 0.95, 10, 8), fur);
      haunch.position.set(hip.x * 1.15, spec.bodyR * 0.95, hip.z + spec.bodyR * 0.2);
      haunch.scale.set(0.8, 1, 1.2);
      haunch.castShadow = true;
      group.add(haunch);
      legBetween(new THREE.Vector3(hip.x * 1.2, spec.bodyR * 0.8, hip.z + spec.bodyR * 0.9), new THREE.Vector3(hip.x * 1.2, 0, hip.z + spec.bodyR * 1.1 + spec.legL * 0.15), spec.legR);
    } else {
      const hindLean = doing === 'pulls' ? spec.legL * 0.25 : 0;
      legBetween(hip, new THREE.Vector3(hip.x, 0, hip.z - hindLean), spec.legR);
    }
  }
  // Tail.
  if (spec.tail === 'curl') add(body, new THREE.TorusGeometry(spec.bodyR * 0.5, spec.bodyR * 0.2, 6, 12), fur, [0, spec.bodyR * 0.9, -spec.bodyR * 0.3], [0, Math.PI / 2, 0]);
  else if (spec.tail === 'stub') add(body, new THREE.CylinderGeometry(spec.bodyR * 0.2, spec.bodyR * 0.25, spec.bodyR * 1.2, 6), fur, [0, spec.bodyR * 0.9, -spec.bodyR * 0.7], [0.4, 0, 0]);
  else if (spec.tail === 'whip') add(body, new THREE.CylinderGeometry(0.006, 0.014, spec.bodyL * 0.6, 6), fur, [0, -spec.bodyR * 0.6, -spec.bodyR - spec.bodyL * 0.2], [-1.0, 0, 0]);
  else add(body, new THREE.CylinderGeometry(0.015, 0.03, spec.bodyL * 0.45, 7), fur, [0, spec.bodyR * 0.5, -spec.bodyR - spec.bodyL * 0.15], [-0.9, 0, 0]);
  // Collar at the base of the neck, with a tag.
  const collar = add(head, new THREE.TorusGeometry(spec.bodyR * 0.62, 0.008, 6, 14), s.material(pick(random, ['#b8302a', '#2b6fb8', '#1f1a18', '#d9c27a']), { roughness: 0.5 }), [0, spec.neckL * 0.35, spec.neckL * 0.25], [Math.PI / 2 - 0.4, 0, 0]);
  s.root.add(group);
  group.updateMatrixWorld(true);
  return { group, collar: collar as THREE.Object3D };
}

export default defineThing({
  questions: {
    breed: choice('What kind of dog?', {
      terrier: 'A scruffy little terrier with its ears up.',
      whippet: 'A thin whippet, all legs, shivering.',
      labrador: 'An old labrador with a greying muzzle.',
      pug: 'A pug with a black mask and a curled tail.',
    }),
    doing: choice('What is the dog doing?', {
      sits: 'Sitting at her feet, looking up at her.',
      pulls: 'Pulling on the leash toward something, leash taut.',
      sniffs: 'Nose down, sniffing the ground, going nowhere.',
    }),
    coat: choice('What colour is her coat?', {
      camel: 'A long camel coat.',
      black: 'A long black wool coat.',
      red: 'A long red coat, the only colour in the street.',
      green: 'A bottle-green coat.',
      check: 'A grey checked coat.',
      navy: 'A navy quilted coat.',
    }),
    scarf: choice('And her scarf?', {
      tartan: 'A red tartan scarf wound twice.',
      mustard: 'A mustard knitted scarf.',
      cream: 'A cream wool scarf.',
      grey: 'A thin grey scarf.',
      none: 'No scarf; collar turned up.',
    }),
    holds: choice('What is in her free hand?', {
      coffee: 'A takeaway coffee, lid on, held up near her chest.',
      phone: 'A phone, held down by her side mid-scroll.',
      umbrella: 'A furled umbrella, tip on the ground.',
      bag: 'A small paper bakery bag.',
    }),
    hair: choice('Her hair?', {
      bun: 'Pulled back in a bun.',
      long: 'Long, loose over the scarf.',
      short: 'Short.',
      hat: 'Under a knitted hat.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.6, 1.76, random());
    const build = random() < 0.3 ? 'slight' : 'average';
    const skin = pick(random, skinTones);
    const coat = { camel: '#c2a070', black: '#1f1f22', red: '#b8302a', green: '#2d4a3a', check: '#7a7a74', navy: '#2a3a5a' }[a.coat];
    const side = random() < 0.5 ? 1 : -1;
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'standing', gaze: 'ahead', skin, sleeves: 'long',
      hair: a.hair === 'hat' ? 'short' : a.hair, hairColor: pick(random, ['#1f1a18', '#3b2a22', '#6b4a2e', '#b8884a', '#8a8680']),
      top: coat, bottom: pick(random, ['#2a2a30', '#3a3a40', '#4a4238', '#1f1f22']), shoes: pick(random, ['#2a211b', '#1f1a18', '#4a3328']),
    });
    s.root.add(person.root);
    hipsAt(person, 0, 0, 0);
    const limb = H * 0.036 * (build === 'slight' ? 0.85 : 1);
    const torsoL = H * 0.28;
    const { spine, neck } = joints(person, 'left');
    const cloth = s.material(coat, { roughness: a.coat === 'navy' ? 0.55 : 0.9 });
    coatSkirt(s, person, H, build, cloth, 0.34);
    if (a.coat === 'navy') overTorso(s, person, H, build, cloth, { grow: 1.2, length: 0.98 });
    if (a.coat === 'check') {
      const lines = s.material('#4a4a46', { roughness: 0.9 });
      for (let i = 0; i < 3; i++) {
        const line = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.38, 0.004, 4, 24), lines);
        line.rotation.x = Math.PI / 2;
        line.position.y = torsoL * (0.2 + i * 0.28);
        line.scale.x = (H * 0.115 * (build === 'slight' ? 0.85 : 1) * 2) / (limb * 2.7);
        spine.add(line);
      }
    }
    if (a.scarf !== 'none') scarf(s, person, H, { tartan: '#9a2a2a', mustard: '#d9a020', cream: '#efe8d8', grey: '#8a8a84', none: '#000000' }[a.scarf]);
    else {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.45, limb * 0.35, 6, 18, Math.PI * 1.5), cloth);
      collar.rotation.set(Math.PI / 2, 0, Math.PI * 0.75);
      collar.position.y = torsoL + limb * 0.3;
      spine.add(collar);
    }
    if (a.hair === 'hat') {
      const headR = H * 0.064;
      const wool = s.material(pick(random, ['#8a1f2a', '#d9a020', '#4a6a8a', '#efe8d8']), { roughness: 1 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), wool);
      dome.position.y = headR * 0.05;
      dome.scale.y = 1.12;
      dome.castShadow = true;
      const bobble = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.28, 8, 6), wool);
      bobble.position.y = headR * 1.25;
      person.head.add(dome, bobble);
    }

    // ---- the pause: weight on one leg, head turned to look off to the side
    poseLeg(person, 'left', { forward: 2, out: 8, knee: 2 });
    poseLeg(person, 'right', { forward: -4, out: 1, knee: 0 });
    neck.rotation.y = side * 0.95;
    neck.rotation.x = -0.05;
    neck.rotation.z = -side * 0.08;
    spine.rotation.y = side * 0.15;
    ground(person);
    const hips = at(person.pelvis);

    // ---- the leash hand, hanging, and the dog on the other side
    const leashSide = side > 0 ? 'left' : 'right';
    const freeSide = leashSide === 'left' ? 'right' : 'left';
    const leashSign = leashSide === 'left' ? 1 : -1;
    poseArm(person, leashSide, { forward: a.doing === 'pulls' ? 28 : 12, out: 10, bend: 8 });
    const dogAt = {
      sits: { x: hips.x + leashSign * 0.4, z: hips.z + 0.3, yaw: -leashSign * 0.9 },
      pulls: { x: hips.x + leashSign * 0.75, z: hips.z + 0.85, yaw: leashSign * 0.5 },
      sniffs: { x: hips.x + leashSign * 0.45, z: hips.z + 0.55, yaw: leashSign * 1.3 + 0.4 },
    }[a.doing];
    const pet = dog(s, a.breed, a.doing);
    pet.group.position.set(dogAt.x, 0, dogAt.z);
    pet.group.rotation.y = dogAt.yaw + (random() - 0.5) * 0.3;
    pet.group.updateMatrixWorld(true);
    const collar = pet.collar.getWorldPosition(new THREE.Vector3());
    const hand = at(person.hands[leashSide]);
    const slack = a.doing === 'pulls' ? 0.0 : 0.12;
    const mid = hand.clone().lerp(collar, 0.5);
    mid.y -= slack;
    const leash = s.tube([[hand.x, hand.y, hand.z], [mid.x, mid.y, mid.z], [collar.x, collar.y, collar.z]], 0.006, s.material(pick(random, ['#b8302a', '#1f1a18', '#2b6fb8', '#8a6a44']), { roughness: 0.6 }));
    void leash;
    s.box([0.03, 0.02, 0.05], [hand.x, hand.y, hand.z], s.material('#1f1a18', { roughness: 0.6 }));

    // ---- the free hand
    if (a.holds === 'coffee') {
      poseArm(person, freeSide, { forward: 58, out: 2, bend: 108, across: -25 });
      const cup = new THREE.Group();
      const paper = s.material(pick(random, ['#f1ebdc', '#d9c9a8', '#efe8d8']), { roughness: 0.8 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.029, 0.1, 14), paper);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.012, 14), s.material(pick(random, ['#2a2320', '#f1efe6']), { roughness: 0.5 }));
      lid.position.y = 0.055;
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.034, 0.035, 14), s.material('#b8905a', { roughness: 0.9 }));
      sleeve.position.y = -0.005;
      body.castShadow = lid.castShadow = sleeve.castShadow = true;
      cup.add(body, lid, sleeve);
      cup.position.set(0, -0.02, 0.03);
      person.hands[freeSide].add(cup);
    } else if (a.holds === 'phone') {
      poseArm(person, freeSide, { forward: 14, out: 6, bend: 20 });
      const phone = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.008), s.material('#1a1a1c', { roughness: 0.3 }));
      phone.position.set(0, -0.03, 0.03);
      phone.rotation.x = 0.5;
      person.hands[freeSide].add(phone);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.12), new THREE.MeshStandardMaterial({ color: '#cfe8ff', emissive: '#9ec8ff', emissiveIntensity: 0.6 }));
      screen.position.set(0, -0.03, 0.035);
      screen.rotation.x = 0.5;
      person.hands[freeSide].add(screen);
    } else if (a.holds === 'umbrella') {
      poseArm(person, freeSide, { forward: 6, out: 8, bend: 4 });
      const free = at(person.hands[freeSide]);
      s.rod([free.x, 0.005, free.z + 0.08], [free.x, free.y, free.z], 0.016, s.material(pick(random, ['#1f1f22', '#8a1f2a', '#2a3a5a']), { roughness: 0.6 }), 0.012);
      s.cylinder(0.012, 0.012, 0.05, [free.x, free.y - 0.01, free.z + 0.03], s.material('#4a2f1b', { roughness: 0.6 }), 8).rotation.x = Math.PI / 2;
    } else {
      poseArm(person, freeSide, { forward: 30, out: 4, bend: 70, across: -20 });
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.06), s.material('#e8dcc0', { roughness: 1 }));
      bag.position.set(0, -0.08, 0.02);
      bag.castShadow = true;
      person.hands[freeSide].add(bag);
    }

    const energy = mood.energy;
    const headYaw = neck.rotation.y;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        neck.rotation.y = headYaw + Math.sin(time * 0.6) * 0.04 * energy;
        if (a.doing === 'pulls') pet.group.position.y = Math.abs(Math.sin(time * 6)) * 0.01 * energy;
      },
    });
  },
});
