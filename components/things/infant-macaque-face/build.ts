import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { limb, monkeyHead, sittingBody, tufts, type Mouth, type V3 } from './primate';

const hex = (c: THREE.Color) => `#${c.getHexString()}`;

export default defineThing({
  questions: {
    clings: choice('What is it clinging to?', {
      mother: "Its mother's chest: she sits behind it, knees up, and it presses back into her belly fur.",
      sibling: "An older sibling's back, ridden jockey-style while the sibling walks on all fours.",
      toy: 'A worn stuffed toy, hugged hard in place of a parent.',
      finial: 'A gilded temple finial, arms wrapped back around cold metal.',
      nothing: 'Nothing: alone on a stone step, hugging itself.',
    }),
    expression: choice('What is its face doing?', {
      wonder: 'Wide-eyed wonder, mouth shut, staring at everything.',
      coo: 'A coo-call pout: lips pushed out in a small round O.',
      squall: 'Squalling: mouth wide open, eyes screwed up, tongue showing.',
      asleep: 'Fast asleep, eyes shut, head lolling to one side.',
    }),
    age: score('How old is it?', ['Days old: black fur, deep wrinkles, enormous ears', 'A few weeks: still dark and wobbly', 'Two months: coat browning, steadier', 'Four months: nearly a bold little juvenile']),
    lip: choice('What is on its lip?', {
      clean: 'Nothing.',
      milk: 'A white drop of milk.',
      crumb: 'Yellow crumbs of stolen sweet.',
      petal: 'A marigold petal stuck there.',
    }),
    enclosed: noul("If it is with its mother, does her arm close around it?"),
    gaze: choice('Where is it looking?', {
      you: 'Straight at you.',
      up: 'Up, toward the face above it or the sky.',
      aside: 'Off to one side at some noise.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const clings = a.clings;
    const T = mix(0.13, 0.19, a.age);
    const R = T * mix(0.68, 0.56, a.age);
    const furC = new THREE.Color('#2b201a').lerp(new THREE.Color('#84694a'), a.age * 0.85).lerp(new THREE.Color('#6d665c'), mood.wear * 0.25);
    const fur = hex(furC), tip = hex(furC.clone().lerp(new THREE.Color('#d9c59c'), 0.35));
    const skin = hex(new THREE.Color('#f0a094').lerp(new THREE.Color('#e9b5a4'), a.age));
    const stone = s.material('#b7ad99');

    // The baby, built with its rump at the origin.
    const b = new Sculpture(context);
    const furMat = b.material(fur, { roughness: 0.95 }), skinMat = b.material(skin, { roughness: 0.75 });
    const torso = b.ball([0.3 * T, 0.45 * T, 0.27 * T], [0, 0.5 * T, 0], furMat, 16);
    b.ball([0.2 * T, 0.3 * T, 0.12 * T], [0, 0.45 * T, 0.18 * T], b.material(skin, { roughness: 0.85 }), 12);
    tufts(b, { centre: [0, 0.5 * T, 0], radii: [0.31 * T, 0.46 * T, 0.28 * T], count: 110, colour: fur, tip, length: 0.15 * T, width: 0.035 * T, comb: [0, -1, -0.2], combAmount: 0.5, keep: (d) => !(d.z > 0.6 && Math.abs(d.x) < 0.5) });
    const pose: Record<typeof a.clings, { hand: V3; knee: V3; foot: V3 }> = {
      mother: { hand: [0.56, 0.72, -0.22], knee: [0.42, 0.32, 0.12], foot: [0.52, 0.16, -0.18] },
      sibling: { hand: [0.3, 0.3, 0.5], knee: [0.42, 0.14, 0.16], foot: [0.48, -0.2, 0.06] },
      toy: { hand: [0.34, 0.5, 0.58], knee: [0.44, 0.26, 0.28], foot: [0.4, 0.04, 0.56] },
      finial: { hand: [0.34, 0.86, -0.3], knee: [0.44, 0.3, 0.1], foot: [0.36, 0.1, -0.28] },
      nothing: { hand: [0.07, 0.52, 0.3], knee: [0.42, 0.34, 0.26], foot: [0.3, 0.04, 0.42] },
    };
    const p = pose[clings];
    for (const side of [-1, 1]) {
      const m = (v: V3): V3 => [v[0] * side * T, v[1] * T, v[2] * T];
      const shoulder: V3 = [side * 0.25 * T, 0.78 * T, 0.03 * T], hand = m(p.hand);
      const elbow: V3 = [(shoulder[0] + hand[0]) / 2 + side * 0.14 * T, Math.min(shoulder[1], hand[1]) - 0.1 * T, (shoulder[2] + hand[2]) / 2 + 0.05 * T];
      limb(b, [shoulder, elbow, hand], 0.07 * T, 0.05 * T, furMat);
      b.ball([0.065 * T, 0.05 * T, 0.075 * T], hand, skinMat, 10);
      const foot = m(p.foot);
      limb(b, [[side * 0.17 * T, 0.2 * T, 0.05 * T], m(p.knee), foot], 0.09 * T, 0.05 * T, furMat);
      b.ball([0.055 * T, 0.04 * T, 0.1 * T], [foot[0], foot[1], foot[2] + 0.05 * T], skinMat, 10);
    }
    const tail = b.tube([[0, 0.1 * T, -0.24 * T], [0.1 * T, 0.05 * T, -0.4 * T], [0.22 * T, 0.03 * T, -0.42 * T], [0.32 * T, 0.03 * T, -0.32 * T]], 0.022 * T, furMat);

    const mouth: Mouth = ({ wonder: 'closed', coo: 'pout', squall: 'squall', asleep: 'closed' } as const)[a.expression];
    const head = monkeyHead(context, {
      skin, fur, tip, iris: '#3a2416', ear: mix(1.95, 1.55, a.age), muzzle: mix(0.4, 0.6, a.age), brow: 0.1,
      eyeOpen: { wonder: 1.35, coo: 1, squall: 0.22, asleep: 0.04 }[a.expression], mouth, cheek: 0, furLength: 0.22, furCount: 170,
      parted: hex(new THREE.Color('#17110e').lerp(furC, a.age * 0.5)), wrinkles: a.age < 0.7, eyeSize: mix(1.5, 1.3, a.age), ragged: 0.2 + mood.wear * 0.3,
    });
    const lipAt: V3 = [0.09, -0.5, 0.9 + 0.12 + 0.3 * mix(0.4, 0.6, a.age)];
    const h = new Sculpture(context);
    if (a.lip === 'milk') {
      h.ball([0.07, 0.085, 0.05], lipAt, h.material('#ffffff', { roughness: 0.15, emissive: '#ffffff', emissiveIntensity: 0.35 }), 10);
      h.ball([0.035, 0.05, 0.03], [lipAt[0] + 0.02, lipAt[1] - 0.16, lipAt[2] - 0.03], h.material('#ffffff', { roughness: 0.15, emissive: '#ffffff', emissiveIntensity: 0.35 }), 8);
    } else if (a.lip === 'crumb') {
      for (let i = 0; i < 6; i++) h.box([0.045, 0.04, 0.04], [lipAt[0] - 0.18 + random() * 0.36, lipAt[1] - random() * 0.14, lipAt[2] - 0.03], h.material(i % 2 ? '#f1c232' : '#e8962a')).rotation.set(random() * 3, random() * 3, 0);
    } else if (a.lip === 'petal') {
      const petal = h.ball([0.1, 0.13, 0.02], [lipAt[0] + 0.05, lipAt[1] - 0.03, lipAt[2]], h.material('#f58a0c', { emissive: '#d86200', emissiveIntensity: 0.35 }), 10);
      petal.rotation.z = 0.5;
    }
    head.add(h.root);
    head.scale.setScalar(R);
    head.position.set(0, 0.95 * T + R * 0.62, 0.07 * T);
    const turn = a.gaze === 'aside' ? (random() < 0.5 ? -0.6 : 0.6) : (random() - 0.5) * 0.2;
    head.rotation.set(a.gaze === 'up' ? -0.55 : -0.22, turn, 0);
    if (a.expression === 'asleep') head.rotation.set(0.05, turn * 0.4, random() < 0.5 ? 0.4 : -0.4);
    if (a.expression === 'squall') head.rotation.x -= 0.25;
    b.root.add(head);

    // What it holds on to.
    let slab: V3 = [0.34, 0.05, 0.32];
    const seat = new THREE.Vector3(0, 0, 0);
    if (clings === 'mother') {
      const M = 0.4;
      const momFur = hex(new THREE.Color('#8a7250').lerp(new THREE.Color('#6d665c'), mood.wear * 0.4)), momTip = '#cdb88c';
      const mom = new Sculpture(context);
      const zb = 0.4 * M;
      const body = sittingBody(mom, {
        height: M, girth: 1.08, fur: momFur, tip: momTip, belly: momTip, skin: '#dd8a7a', hunch: 0.55, ragged: 0.25 + mood.wear * 0.4,
        rightHand: a.enclosed ? [-0.1, (0.05 * M + 0.5 * T) / M, (zb + 0.34 * T) / M] : undefined,
        leftHand: a.enclosed ? [-0.42, (0.05 * M + 0.75 * T) / M, (zb + 0.05 * T) / M] : undefined,
      });
      const momHead = monkeyHead(context, { skin: '#dd8a7a', fur: momFur, tip: momTip, iris: '#c9821b', ear: 1, muzzle: 0.95, brow: 0.45, eyeOpen: 0.6, mouth: 'closed', cheek: 0.1, furLength: 0.3, furCount: 260, ragged: 0.25 + mood.wear * 0.4 });
      momHead.scale.setScalar(0.105);
      momHead.position.set(body.neck[0], body.neck[1] + 0.06, body.neck[2] + 0.035);
      momHead.rotation.set(0.5, (random() - 0.5) * 0.3, 0);
      mom.root.add(momHead);
      mom.tube([[0, 0.03, -0.12], [0.1, 0.02, -0.19], [0.22, 0.015, -0.17], [0.3, 0.015, -0.08]], 0.018, mom.material(momFur));
      mom.root.position.z = -0.1;
      s.root.add(mom.root);
      seat.set(0, 0.02 * M, zb - 0.1);
      slab = [0.62, 0.05, 0.56];
    } else if (clings === 'sibling') {
      const q = new Sculpture(context);
      const sibFur = hex(new THREE.Color('#8f7653').lerp(new THREE.Color('#6d665c'), mood.wear * 0.4)), mat = q.material(sibFur, { roughness: 0.95 });
      const back = 0.27;
      q.ball([0.105, 0.1, 0.23], [0, back - 0.07, 0], mat, 16);
      tufts(q, { centre: [0, back - 0.07, 0], radii: [0.11, 0.105, 0.235], count: 200, colour: sibFur, tip: '#cdb88c', length: 0.045, width: 0.011, comb: [0, -0.6, -1], combAmount: 0.6 });
      const stride = 0.05;
      for (const side of [-1, 1]) {
        limb(q, [[side * 0.08, back - 0.08, 0.17], [side * 0.09, 0.12, 0.2 + side * stride], [side * 0.09, 0.015, 0.22 + side * stride * 1.6]], 0.036, 0.022, mat);
        limb(q, [[side * 0.08, back - 0.08, -0.16], [side * 0.1, 0.13, -0.1 - side * stride], [side * 0.09, 0.015, -0.2 - side * stride * 1.6]], 0.042, 0.022, mat);
      }
      q.tube([[0, back - 0.04, -0.22], [0, back + 0.06, -0.32], [0.02, back + 0.02, -0.42], [0.03, back - 0.08, -0.46]], 0.014, mat);
      const sibHead = monkeyHead(context, { skin: '#e3a090', fur: sibFur, tip: '#cdb88c', iris: '#c9821b', ear: 1.3, muzzle: 0.8, brow: 0.3, eyeOpen: 0.9, mouth: 'closed', cheek: mood.density * 0.5, furLength: 0.28, furCount: 220, eyeSize: 1.1 });
      sibHead.scale.setScalar(0.08);
      sibHead.position.set(0, back + 0.03, 0.27);
      sibHead.rotation.set(0.1, (random() - 0.5) * 0.5, 0);
      q.root.add(sibHead);
      q.root.rotation.y = 0.35;
      s.root.add(q.root);
      b.root.rotation.y = 0.35;
      seat.set(-0.015, back + 0.0, -0.04);
      slab = [0.4, 0.05, 0.74];
    } else if (clings === 'toy') {
      const t = new Sculpture(context);
      const plushC = new THREE.Color(['#e79ab0', '#8fb6de', '#e8c56a', '#9ccf9a'][Math.floor(random() * 4)]).lerp(new THREE.Color('#9a9488'), 0.15 + mood.wear * 0.55);
      const plush = t.material(plushC, { roughness: 1 }), pale = t.material(plushC.clone().lerp(new THREE.Color('#fff6e6'), 0.55), { roughness: 1 }), thread = t.material('#2a2320');
      const U = T * 0.95;
      t.ball([0.3 * U, 0.34 * U, 0.26 * U], [0, 0.32 * U, 0], plush, 14);
      t.ball([0.17 * U, 0.2 * U, 0.08 * U], [0, 0.3 * U, 0.2 * U], pale, 10);
      t.ball([0.27 * U, 0.25 * U, 0.24 * U], [0, 0.8 * U, 0.02 * U], plush, 14);
      t.ball([0.12 * U, 0.1 * U, 0.1 * U], [0, 0.74 * U, 0.22 * U], pale, 10);
      t.ball([0.035 * U, 0.03 * U, 0.02 * U], [0, 0.78 * U, 0.32 * U], thread, 8);
      for (const side of [-1, 1]) {
        t.ball([0.1 * U, 0.1 * U, 0.05 * U], [side * 0.22 * U, 1.02 * U, 0], plush, 10);
        t.ball([0.11 * U, 0.1 * U, 0.16 * U], [side * 0.22 * U, 0.1 * U, 0.24 * U], plush, 10);
        t.ball([0.09 * U, 0.09 * U, 0.15 * U], [side * 0.34 * U, 0.48 * U, 0.1 * U], plush, 10).rotation.y = side * 0.6;
        // Button eyes: one is missing when things are worn.
        if (side === 1 && mood.wear > 0.5) {
          t.rod([side * 0.13 * U - 0.03 * U, 0.86 * U, 0.235 * U], [side * 0.13 * U + 0.03 * U, 0.92 * U, 0.235 * U], 0.006 * U, thread);
          t.rod([side * 0.13 * U - 0.03 * U, 0.92 * U, 0.235 * U], [side * 0.13 * U + 0.03 * U, 0.86 * U, 0.235 * U], 0.006 * U, thread);
        } else t.ball([0.035 * U, 0.035 * U, 0.02 * U], [side * 0.11 * U, 0.88 * U, 0.235 * U], thread, 8);
      }
      t.root.position.set(0.1 * T, 0, 0.42 * T);
      t.root.rotation.set(-0.12, -0.3, 0.1);
      s.root.add(t.root);
      slab = [0.38, 0.05, 0.4];
    } else if (clings === 'finial') {
      const gold = s.material('#d9a737', { metalness: 0.85, roughness: mix(0.25, 0.6, mood.wear), emissive: '#6b4a08', emissiveIntensity: 0.25 });
      const baseH = 0.05;
      s.cylinder(0.17, 0.19, baseH, [0, baseH / 2, -0.1], s.material('#a14a37'), 8);
      const U = T * 1.75;
      s.lathe([[0, 0], [0.42 * U, 0], [0.46 * U, 0.08 * U], [0.3 * U, 0.2 * U], [0.2 * U, 0.3 * U], [0.36 * U, 0.52 * U], [0.4 * U, 0.72 * U], [0.28 * U, 0.95 * U], [0.12 * U, 1.08 * U], [0.2 * U, 1.2 * U], [0.1 * U, 1.34 * U], [0.05 * U, 1.7 * U], [0, 2.0 * U]], gold, [0, baseH + 0.02, -0.1]);
      seat.set(0, 0, 0.1);
      slab = [0.46, 0.05, 0.52];
    }
    b.root.position.add(seat);
    s.root.add(b.root);

    // A worn temple step underneath, with whatever the day has dropped on it.
    s.box(slab, [0, -slab[1] / 2, clings === 'mother' ? 0.02 : 0.03], stone);
    const bits = Math.round(mood.density * 7);
    for (let i = 0; i < bits; i++) {
      const petal = s.ball([0.018, 0.004, 0.011], [(random() - 0.5) * slab[0] * 0.9, 0.004, slab[2] * (0.25 + random() * 0.22)], s.material(i % 3 ? '#f28a12' : '#e8c53a'), 8);
      petal.rotation.y = random() * 3;
    }

    const pace = mix(0.3, 3, mood.energy), baseTurn = head.rotation.y, squall = a.expression === 'squall', asleep = a.expression === 'asleep';
    return s.finish({
      update: (_dt, time) => {
        const breath = Math.sin(time * (asleep ? 1.2 : 2.4));
        torso.scale.set(0.3 * T * (1 + breath * 0.03), 0.45 * T, 0.27 * T * (1 + breath * 0.05));
        if (!asleep) head.rotation.y = baseTurn + Math.sin(time * pace) * 0.15 * mood.energy;
        if (squall) head.position.y = 0.95 * T + R * 0.62 + Math.abs(Math.sin(time * 9)) * 0.004;
        tail.rotation.y = Math.sin(time * pace * 1.3) * 0.2 * mood.energy;
      },
    });
  },
});
