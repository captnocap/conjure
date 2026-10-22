import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { type P, at, paint, pick, pickSkin, rig } from './pose';
import { wall } from './wall';

export default defineThing({
  questions: {
    whistle: choice('Where is the whistle?', {
      lips: 'At her lips, mid-blast.',
      raised: 'Held up in her fist, about to blow.',
      hanging: 'Hanging on the lanyard at her chest, not needed yet.',
    }),
    arm: choice('What is her other arm doing?', {
      pointing: 'Pointing sternly out to the side at the culprit.',
      folded: 'Folded across her front, waiting.',
      hip: 'Hand on her hip.',
      wagging: 'A finger wagging up in front of her.',
    }),
    tabard: choice('What colour is the tabard?', {
      yellow: 'Fluorescent yellow with a silver band.',
      orange: 'Fluorescent orange with a silver band.',
      pink: 'Fluorescent pink, the one nobody else would wear.',
    }),
    tea: choice('Where is her tea?', {
      pocket: 'A mug of tea stuffed in the tabard pocket.',
      wall: 'A mug of tea standing on a low brick wall beside her.',
      flask: 'A tartan flask at her feet.',
      clipboard: 'No tea: a clipboard under her arm.',
    }),
    glasses: noul('Does she wear glasses?'),
    hair: choice('What is her hair like?', {
      bun: 'Grey hair scraped into a bun.',
      short: 'Short dark hair.',
      tied: 'Long hair tied back.',
      hat: 'A woolly hat pulled down.',
      headscarf: 'A patterned headscarf.',
    }),
    build: choice('What is she like?', {
      slight: 'Small and wiry, quick on her feet.',
      average: 'Ordinary height, ordinary build.',
      heavy: 'Big and solid, a presence across the whole yard.',
    }),
    feet: choice('What is at her feet?', {
      nothing: 'Nothing.',
      ball: 'A confiscated football.',
      firstaid: 'A green first-aid bag.',
      cone: 'A traffic cone guarding a puddle.',
      cardigan: 'A lost-property cardigan picked up off the ground.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = { slight: 1.56, average: 1.64, heavy: 1.68 }[a.build] + (random() - 0.5) * 0.06;
    const skin = pickSkin(random);
    const cardigan = pick(random, ['#8a8a8e', '#9a7ab8', '#c9b89a', '#2a3a5a', '#6a3a3a', '#5a7a5a']);
    const hiVis = { yellow: '#e8f52a', orange: '#ff7a1a', pink: '#ff4aa0' }[a.tabard];
    const vis = s.material(hiVis, { roughness: 0.7, emissive: hiVis, emissiveIntensity: 0.18, side: THREE.DoubleSide });
    const silver = s.material('#d8dde0', { roughness: 0.35, metalness: 0.3, emissive: '#c8ccd0', emissiveIntensity: 0.1, side: THREE.DoubleSide });
    const mirror = random() < 0.5;
    const pointSide = mirror ? 'right' : 'left';
    const whistleSide = mirror ? 'left' : 'right';

    const person = figure(s, {
      height: H, build: a.build, style: 'doll', skin,
      hair: a.hair === 'bun' ? 'bun' : a.hair === 'short' ? 'short' : a.hair === 'tied' ? 'long' : a.hair === 'hat' ? 'hat' : 'hood',
      hairColor: a.hair === 'bun' ? '#c9c4bc' : a.hair === 'hat' ? pick(random, ['#8a1f2a', '#2a4a9a', '#3a3a3e']) : pick(random, ['#1f1a18', '#3b2a22', '#6b4a2e', '#8a8680']),
      top: cardigan, bottom: pick(random, ['#2a2a30', '#3a3a40', '#4a4238', '#5a4a5a']), shoes: '#1d1a18', sleeves: 'long', pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const pose = rig(person);
    // Feet planted wide.
    pose.leg('left', { out: 7, knee: 0 });
    pose.leg('right', { out: 7, knee: 0 });
    // The whistle hand.
    if (a.whistle === 'lips') pose.arm(whistleSide, { forward: 100, out: 10, bend: 145, across: 45 });
    else if (a.whistle === 'raised') pose.arm(whistleSide, { forward: 70, out: 14, bend: 125, across: 20 });
    else pose.arm(whistleSide, { forward: 4, out: 6, bend: 10 });
    // The other arm; a clipboard is hugged to the chest whatever the arm meant to do.
    if (a.tea === 'clipboard') pose.arm(pointSide, { forward: 62, out: -4, bend: 118, across: 52 });
    else if (a.arm === 'pointing') pose.arm(pointSide, { forward: 4, out: 86, bend: 2 });
    else if (a.arm === 'folded') pose.arm(pointSide, { forward: 35, out: -4, bend: 118, across: 72 });
    else if (a.arm === 'hip') pose.arm(pointSide, { forward: 8, out: 38, bend: 95, across: -55 });
    else pose.arm(pointSide, { forward: 80, out: -5, bend: 110, across: 20 });
    // Gaze right along the pointing arm, otherwise at whoever it is.
    const yaw = a.arm === 'pointing' ? 52 : 18;
    pose.look(a.arm === 'wagging' ? 6 : 2, pointSide === 'left' ? yaw : -yaw, 0);
    pose.bow(a.arm === 'pointing' ? 3 : 1, 0, pointSide === 'left' ? -6 : 6);
    person.settle();

    // ---- the tabard: a flattened open cylinder over the torso, silver band, shoulder straps and a pocket
    const spine = person.joints.spine;
    const torsoL = H * 0.28;
    const wide = { slight: 0.85, average: 1, heavy: 1.3 }[a.build];
    // The figure's torso is H * 0.115 * wide to each side and about limb * 1.35 deep, so the tabard must clear both.
    const r = H * 0.125 * wide, depth = H * 0.036 * wide * 1.35 * (a.build === 'heavy' ? 1.25 : 1) * 1.22;
    const tab = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.0, r * 1.06, torsoL * 0.84, 20, 1, true), vis);
    tab.scale.z = depth / r;
    tab.position.y = torsoL * 0.46;
    tab.castShadow = true;
    spine.add(tab);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, torsoL * 0.09, 20, 1, true), silver);
    band.scale.z = depth * 1.04 / r;
    band.position.y = torsoL * 0.5;
    spine.add(band);
    const band2 = band.clone();
    band2.position.y = torsoL * 0.3;
    spine.add(band2);
    for (const sx of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(r * 0.32, torsoL * 0.12, depth * 2.1), vis);
      strap.position.set(sx * r * 0.58, torsoL * 0.9, 0);
      spine.add(strap);
    }
    // Front pocket, with the tea in it when that is where it lives.
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(r * 0.55, torsoL * 0.2, depth * 0.3), vis);
    pocket.position.set(pointSide === 'left' ? -r * 0.45 : r * 0.45, torsoL * 0.18, depth * 1.02);
    spine.add(pocket);
    const mugColour = pick(random, ['#f2f0ea', '#d83a4a', '#2a63c8', '#3a9a5a', '#f2c21c']);
    const mugMat = s.material(mugColour, { roughness: 0.4 });
    const mug = (parent: THREE.Object3D, position: P, tilt = 0) => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.1, 14), mugMat);
      cup.position.set(...position);
      cup.rotation.z = tilt;
      cup.castShadow = true;
      parent.add(cup);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.007, 6, 12), mugMat);
      handle.position.set(0.046, 0, 0);
      cup.add(handle);
      const tea = new THREE.Mesh(new THREE.CircleGeometry(0.036, 14), s.material('#8a5a2a', { roughness: 0.3 }));
      tea.rotation.x = -Math.PI / 2;
      tea.position.y = 0.045;
      cup.add(tea);
      return cup;
    };
    if (a.tea === 'pocket') mug(spine, [pocket.position.x, torsoL * 0.3, depth * 1.05], 0.12);

    // ---- whistle and lanyard
    const chrome = s.material('#c9ced2', { metalness: 0.8, roughness: 0.3 });
    const cord = s.material(pick(random, ['#1d1a18', '#c8322a', '#2a63c8']), { roughness: 0.9 });
    const neck = at(s, person.joints.neck);
    const whistleAt = (where: THREE.Vector3) => {
      const body = s.cylinder(0.016, 0.016, 0.05, [where.x, where.y, where.z], chrome, 10);
      body.rotation.x = Math.PI / 2;
      s.box([0.012, 0.012, 0.03], [where.x, where.y + 0.004, where.z - 0.035], chrome);
      return body;
    };
    if (a.whistle === 'hanging') {
      const chest = new THREE.Vector3(neck.x, neck.y - 0.17 * H, neck.z + 0.085 * H);
      whistleAt(chest);
      s.tube([[neck.x - 0.04 * H, neck.y, neck.z - 0.02], [neck.x - 0.03 * H, neck.y - 0.08 * H, neck.z + 0.07 * H], [chest.x, chest.y + 0.02, chest.z - 0.01], [neck.x + 0.03 * H, neck.y - 0.08 * H, neck.z + 0.07 * H], [neck.x + 0.04 * H, neck.y, neck.z - 0.02]], 0.004, cord);
    } else {
      const hand = at(s, person.hands[whistleSide]);
      const mouth = at(s, person.head).add(new THREE.Vector3(0, -0.03 * H, 0.06 * H));
      const where = a.whistle === 'lips' ? mouth : hand.clone().add(new THREE.Vector3(0, 0.02, 0.03));
      whistleAt(where);
      s.tube([[neck.x - 0.04 * H, neck.y, neck.z - 0.02], [neck.x - 0.02 * H, neck.y - 0.06 * H, neck.z + 0.07 * H], [where.x, where.y - 0.03, where.z - 0.02], [neck.x + 0.03 * H, neck.y - 0.05 * H, neck.z + 0.07 * H], [neck.x + 0.04 * H, neck.y, neck.z - 0.02]], 0.004, cord);
    }

    // ---- glasses
    if (a.glasses) {
      const headR = H * 0.064;
      const frame = s.material(pick(random, ['#1d1a18', '#8a3a2a', '#c9a44a']), { roughness: 0.4, metalness: 0.4 });
      for (const sx of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.26, headR * 0.035, 6, 14), frame);
        lens.position.set(sx * headR * 0.36, headR * 0.12, headR * 0.95);
        person.head.add(lens);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.22, headR * 0.05, headR * 0.05), frame);
      bridge.position.set(0, headR * 0.15, headR * 0.98);
      person.head.add(bridge);
    }
    if (a.hair === 'headscarf') {
      // The hood is the scarf; a knot under the chin.
      const knot = new THREE.Mesh(new THREE.SphereGeometry(H * 0.012, 8, 6), s.material(cardigan, { roughness: 0.9 }));
      knot.position.set(0, -H * 0.06, H * 0.05);
      person.head.add(knot);
    }

    // ---- clipboard hugged flat against the tabard
    if (a.tea === 'clipboard') {
      const board = new THREE.Group();
      board.position.set(pointSide === 'left' ? -r * 0.15 : r * 0.15, torsoL * 0.5, depth * 1.25);
      board.rotation.set(-0.12, 0, pointSide === 'left' ? 0.1 : -0.1);
      spine.add(board);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.33, 0.01), s.material('#8a6a44', { roughness: 0.8 }));
      back.castShadow = true;
      board.add(back);
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.28, 0.004), s.material('#f2efe4', { roughness: 0.95 }));
      sheet.position.set(0, -0.015, 0.007);
      board.add(sheet);
      for (let i = 0; i < 6; i++) { const line = new THREE.Mesh(new THREE.BoxGeometry(0.14 - (i % 3) * 0.03, 0.006, 0.002), s.material('#3a3a3e', { roughness: 1 })); line.position.set(-0.02, 0.08 - i * 0.035, 0.01); board.add(line); }
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.02), chrome);
      clip.position.set(0, 0.16, 0.008);
      board.add(clip);
    }

    // ---- the low wall and the mug on it
    const side = pointSide === 'left' ? 1 : -1;
    if (a.tea === 'wall') {
      wall(s, { width: 0.9, height: 0.52, thickness: 0.22, finish: 'red-brick', wear: mood.wear, random, at: [side * 0.62, 0, -0.05] });
      mug(s.root, [side * 0.62 + (random() - 0.5) * 0.3, 0.58 + 0.05, -0.16], 0);
    }

    // ---- what is at her feet
    const fx = -side * 0.45 + (random() - 0.5) * 0.2, fz = 0.3 + random() * 0.15;
    if (a.feet === 'ball') {
      s.ball([0.11, 0.11, 0.11], [fx, 0.11, fz], s.material(mood.wear > 0.5 ? '#9a9890' : '#f0eee8', { roughness: 0.8 }), 14);
      s.ring(0.11, 0.012, [fx, 0.11, fz], s.material('#2a2a2e', { roughness: 0.8 })).rotation.y = random() * 3;
    }
    if (a.feet === 'firstaid') {
      s.box([0.3, 0.2, 0.14], [fx, 0.1, fz], s.material('#2a8a4a', { roughness: 0.7 }));
      s.box([0.1, 0.025, 0.006], [fx, 0.12, fz + 0.072], s.material('#f2f2f2', { roughness: 0.6 }));
      s.box([0.025, 0.1, 0.006], [fx, 0.12, fz + 0.072], s.material('#f2f2f2', { roughness: 0.6 }));
      s.box([0.14, 0.03, 0.02], [fx, 0.215, fz], s.material('#1d1a18', { roughness: 0.7 }));
    }
    if (a.feet === 'cone') {
      const cone = s.material('#ff6a1a', { roughness: 0.6 });
      s.box([0.36, 0.03, 0.36], [fx, 0.015, fz], s.material('#2a2a2e', { roughness: 0.9 }));
      s.cylinder(0.025, 0.13, 0.5, [fx, 0.28, fz], cone, 16);
      s.cylinder(0.075, 0.095, 0.08, [fx, 0.33, fz], s.material('#f2f2f2', { roughness: 0.5, emissive: '#ffffff', emissiveIntensity: 0.08 }), 16);
      const puddle = s.mesh(new THREE.CircleGeometry(0.3, 18), new THREE.MeshStandardMaterial({ color: '#6a7480', roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.65, depthWrite: false }), [fx + 0.25, 0.003, fz + 0.1]);
      puddle.rotation.x = -Math.PI / 2;
      puddle.scale.x = 1.5;
      puddle.castShadow = false;
    }
    if (a.feet === 'cardigan') {
      const wool = s.material(pick(random, ['#243352', '#6e1f2e', '#2f5a3a', '#7a7d82']), { roughness: 0.95 });
      s.ball([0.19, 0.06, 0.15], [fx, 0.055, fz], wool, 12);
      s.ball([0.11, 0.045, 0.13], [fx + 0.13, 0.04, fz - 0.07], wool, 10);
    }
    if (a.tea === 'flask') {
      const tartan = paint(64, 64, (c) => {
        c.fillStyle = '#8a1f2a'; c.fillRect(0, 0, 64, 64);
        c.fillStyle = 'rgba(30,60,40,0.7)'; for (let i = 0; i < 4; i++) { c.fillRect(i * 16, 0, 6, 64); c.fillRect(0, i * 16, 64, 6); }
        c.fillStyle = 'rgba(240,220,120,0.6)'; for (let i = 0; i < 4; i++) { c.fillRect(i * 16 + 10, 0, 2, 64); c.fillRect(0, i * 16 + 10, 64, 2); }
      });
      tartan.wrapS = tartan.wrapT = THREE.RepeatWrapping;
      tartan.repeat.set(3, 3);
      s.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 16), new THREE.MeshStandardMaterial({ map: tartan, roughness: 0.6 }), [fx, 0.15, fz]);
      s.cylinder(0.045, 0.045, 0.05, [fx, 0.325, fz], s.material('#f2efe4', { roughness: 0.5 }), 16);
    }

    // ---- motion: the blast puffs the cheeks and the pointing arm jabs with the scene's energy
    const point = person.joints.shoulders[pointSide];
    const baseZ = point.rotation.z;
    const phase = random() * Math.PI * 2;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (a.arm === 'pointing') point.rotation.z = baseZ + Math.sin(time * mix(1, 3.5, mood.energy) + phase) * 0.04 * (0.2 + mood.energy);
        if (a.arm === 'wagging') person.joints.elbows[pointSide].rotation.x += Math.cos(time * 7 + phase) * 0.003 * mood.energy;
      },
    });
  },
});
