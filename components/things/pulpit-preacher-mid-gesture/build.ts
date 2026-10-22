import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, score } from '@conjure/kit';
import { at, pick, pickSkin, rig } from './pose';

type P = [number, number, number];

export default defineThing({
  questions: {
    vestment: choice('What does the preacher wear?', {
      gown: 'A black Geneva gown with white preaching bands at the throat.',
      surplice: 'A white surplice with a coloured stole hanging down the front.',
      suit: 'A plain dark suit, white shirt and tie: a lay preacher or a chapel minister.',
      habit: 'A brown friar\'s habit with the hood up and a rope belt.',
    }),
    gesture: choice('What are the hands doing?', {
      finger: 'One finger raised high to make the point, the other hand flat on the book.',
      wide: 'Both arms flung wide, palms open to the whole congregation.',
      fist: 'A fist brought down on the pulpit rim, the other hand on the book.',
      reading: 'Both hands on the book, head bowed, reading the text aloud.',
    }),
    moment: choice('What moment of the sermon is it?', {
      opening: 'The opening: upright and measured, the hourglass just turned.',
      warning: 'The warning: leaning hard over the rim, the hourglass half run.',
      consolation: 'The consolation: leaning back, head tilted kindly, sand nearly gone.',
      blessing: 'The final blessing: hand lifted, head raised, the hourglass empty.',
    }),
    lectern: choice('What lies open on the lectern?', {
      bible: 'A great leather Bible with red page edges and ribbon markers.',
      notes: 'A sheaf of handwritten notes, fanned and dog-eared.',
      tablet: 'A tablet computer, its screen glowing.',
      nothing: 'Nothing: speaking without notes, a glass of water on the rim.',
    }),
    wood: choice('What is the pulpit made of?', {
      oak: 'Dark carved oak, blackened with centuries of polish.',
      pine: 'Pale plain pine, a chapel joiner\'s work.',
      painted: 'Painted cream with gilt mouldings, Georgian and elegant.',
      marble: 'White marble with a wrought-iron stair rail.',
    }),
    age: score('How old is the preacher?', ['A young curate, barely out of college', 'Middle-aged and solid', 'White-haired and stooped, forty years in this pulpit']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const floorY = 1.32;
    const woodColour = { oak: '#3a2614', pine: '#b89062', painted: '#ece4d2', marble: '#e6e2da' }[a.wood];
    const wood = s.material(woodColour, { roughness: a.wood === 'marble' ? 0.35 : 0.55 });
    const trimColour = { oak: '#5a3d22', pine: '#9a7448', painted: '#c9a24a', marble: '#2a2a2c' }[a.wood];
    const trim = s.material(trimColour, { roughness: 0.5, metalness: a.wood === 'painted' ? 0.4 : 0 });
    const railMat = a.wood === 'marble' ? s.material('#2a2a2c', { roughness: 0.5, metalness: 0.4 }) : trim;

    // ---- the pulpit: stone footing, a stem flaring into an octagonal drum with a moulded rim
    s.box([0.9, 0.12, 0.9], [0, 0.06, 0], s.material('#b8b2a4', { roughness: 0.9 }));
    s.cylinder(0.2, 0.26, 0.85, [0, 0.54, 0], wood, 8);
    s.cylinder(0.58, 0.2, 0.42, [0, 1.17, 0], wood, 8);
    const drum = s.cylinder(0.62, 0.58, 0.96, [0, floorY + 0.48, 0], wood, 8);
    drum.rotation.y = Math.PI / 8;
    const rim = s.cylinder(0.68, 0.66, 0.06, [0, floorY + 0.98, 0], trim, 8);
    rim.rotation.y = Math.PI / 8;
    const foot = s.cylinder(0.64, 0.6, 0.05, [0, floorY + 0.02, 0], trim, 8);
    foot.rotation.y = Math.PI / 8;
    // Raised panels on the front faces.
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      if (Math.cos(angle) < -0.2) continue;
      const panel = s.box([0.34, 0.62, 0.03], [Math.sin(angle) * 0.58, floorY + 0.49, Math.cos(angle) * 0.58], trim);
      panel.rotation.y = angle;
    }
    // Lectern board on the front rim, the book or notes upon it.
    const desk = s.box([0.5, 0.03, 0.36], [0, floorY + 1.04, 0.52], wood);
    desk.rotation.x = -0.55;
    s.box([0.5, 0.04, 0.03], [0, floorY + 0.94, 0.68], wood);

    // ---- the curved stair round the back: solid blocks rising to the pulpit floor, balusters and a rail
    const steps = 7;
    const stairR = 0.86;
    const stepPoints: P[] = [];
    for (let i = 0; i < steps; i++) {
      const angle = Math.PI * 0.48 + (i / (steps - 1)) * Math.PI * 0.7;
      const top = 0.05 + (i + 1) * ((floorY - 0.05) / steps);
      // Round the back: +x side first, curving behind the drum to the far side.
      const x = Math.sin(angle) * stairR, z = Math.cos(angle) * stairR;
      const block = s.box([0.46, top, 0.3], [x, top / 2, z], wood);
      block.rotation.y = angle;
      const post = s.rod([Math.sin(angle) * (stairR + 0.2), top, Math.cos(angle) * (stairR + 0.2)], [Math.sin(angle) * (stairR + 0.2), top + 0.85, Math.cos(angle) * (stairR + 0.2)], 0.012, railMat);
      void post;
      stepPoints.push([Math.sin(angle) * (stairR + 0.2), top + 0.86, Math.cos(angle) * (stairR + 0.2)]);
    }
    s.tube(stepPoints, 0.022, railMat);

    // ---- backboard and sounding board, a hexagonal canopy with a finial
    const canopyY = floorY + 2.75;
    s.box([0.9, canopyY - floorY, 0.06], [0, floorY + (canopyY - floorY) / 2, -0.62], wood);
    // A hanging of coloured cloth on the backboard, so the preacher stands against colour, not against the wood.
    const dossal = s.material({ oak: '#8a1f24', pine: '#2f4a7a', painted: '#2f6a3a', marble: '#6a2a4a' }[a.wood], { roughness: 0.95 });
    s.box([0.76, 1.5, 0.02], [0, floorY + 1.72, -0.58], dossal);
    s.box([0.8, 0.05, 0.05], [0, floorY + 2.48, -0.58], trim);
    const canopy = s.cylinder(0.86, 0.86, 0.09, [0, canopyY + 0.045, -0.05], wood, 6);
    canopy.rotation.y = Math.PI / 6;
    const cornice = s.cylinder(0.92, 0.86, 0.05, [0, canopyY + 0.11, -0.05], trim, 6);
    cornice.rotation.y = Math.PI / 6;
    const underside = s.cylinder(0.7, 0.7, 0.02, [0, canopyY - 0.01, -0.05], s.material(a.wood === 'oak' ? '#8a1f24' : '#4a3a7a', { roughness: 0.8 }), 6);
    underside.rotation.y = Math.PI / 6;
    s.cylinder(0.02, 0.1, 0.3, [0, canopyY + 0.28, -0.05], trim, 6);
    s.ball([0.07, 0.07, 0.07], [0, canopyY + 0.48, -0.05], trim, 10);

    // ---- the preacher, standing in the drum
    const H = mix(1.66, 1.8, random()) * (a.age > 0.8 ? 0.96 : 1);
    const skin = pickSkin(random);
    const clothes = {
      gown: { top: '#17171a', bottom: '#17171a', sleeves: 'long' as const },
      surplice: { top: '#f3f0e8', bottom: '#1e1e22', sleeves: 'long' as const },
      suit: { top: '#2b2e36', bottom: '#2b2e36', sleeves: 'long' as const },
      habit: { top: '#5a4130', bottom: '#5a4130', sleeves: 'long' as const },
    }[a.vestment];
    const hair = a.vestment === 'habit' ? 'hood' : a.age > 0.75 && random() < 0.5 ? 'none' : 'short';
    const hairColor = a.age > 0.75 ? '#e4e1da' : a.age > 0.4 ? '#6b6058' : pick(random, ['#2a1e18', '#4a3222', '#8a5a2a']);
    const person = figure(s, { height: H, build: a.age > 0.4 && random() < 0.5 ? 'heavy' : 'average', style: 'doll', skin, hair, hairColor, pose: 'standing', gaze: 'ahead', ...clothes });
    s.root.add(person.root);
    const pose = rig(person);
    const blessing = a.moment === 'blessing';
    // Hands: the book hand reaches the lectern; the free hand makes the point.
    const onBook = { forward: 52, out: 8, bend: 30, across: 18 };
    if (a.gesture === 'finger') {
      pose.arm('right', { forward: blessing ? 150 : 118, out: 14, bend: blessing ? 10 : 55, across: 0 });
      pose.arm('left', onBook);
    } else if (a.gesture === 'wide') {
      pose.arm('right', { forward: 38, out: 74, bend: 18, across: 0 });
      pose.arm('left', { forward: 38, out: 74, bend: 18, across: 0 });
    } else if (a.gesture === 'fist') {
      pose.arm('right', { forward: 56, out: 22, bend: 48, across: -8 });
      pose.arm('left', onBook);
    } else {
      pose.arm('right', { ...onBook, across: -18 });
      pose.arm('left', onBook);
    }
    const stoop = a.age > 0.75 ? 8 : 0;
    if (a.moment === 'opening') { pose.bow(2 + stoop); pose.look(a.gesture === 'reading' ? 36 : 14); }
    else if (a.moment === 'warning') { pose.bow(16 + stoop); pose.look(a.gesture === 'reading' ? 30 : 12, 0); }
    else if (a.moment === 'consolation') { pose.bow(-4 + stoop); pose.look(a.gesture === 'reading' ? 34 : 10, 0, 9); }
    else { pose.bow(stoop); pose.look(a.gesture === 'reading' ? 30 : -14); }
    // settle() measures in world space and offsets the body under the root, so it runs before the root is lifted into the pulpit.
    person.settle();
    person.root.position.set(0, floorY, -0.05);
    person.root.updateMatrixWorld(true);

    // Vestment details: bands, stole, shirt and tie, rope belt, wide sleeves.
    const neck = at(s, person.joints.neck);
    const white = s.material('#f6f4ee', { roughness: 0.9 });
    const chest = new THREE.Vector3(neck.x, neck.y - 0.04 * H, neck.z + 0.066 * H);
    if (a.vestment === 'gown') {
      s.ring(0.045 * H, 0.01 * H, [neck.x, neck.y + 0.01 * H, neck.z], white).rotation.x = Math.PI / 2;
      for (const side of [-1, 1]) s.box([0.022 * H, 0.07 * H, 0.005 * H], [chest.x + side * 0.013 * H, chest.y - 0.02 * H, chest.z], white).rotation.x = 0.15;
    } else if (a.vestment === 'surplice') {
      const stoleColour = mood.cheer < 0.35 ? '#4a2a6a' : mood.cheer > 0.75 ? '#e2c25a' : '#2f6a3a';
      const stole = s.material(stoleColour, { roughness: 0.8 });
      for (const side of [-1, 1]) {
        const strip = s.box([0.06 * H, 0.5 * H, 0.012 * H], [chest.x + side * 0.055 * H, chest.y - 0.22 * H, chest.z + 0.004 * H], stole);
        strip.rotation.x = 0.1;
      }
      s.ring(0.045 * H, 0.01 * H, [neck.x, neck.y + 0.01 * H, neck.z], s.material('#1e1e22'), ).rotation.x = Math.PI / 2;
    } else if (a.vestment === 'suit') {
      s.box([0.07 * H, 0.08 * H, 0.004 * H], [chest.x, chest.y - 0.01 * H, chest.z], white).rotation.x = 0.1;
      s.box([0.022 * H, 0.2 * H, 0.006 * H], [chest.x, chest.y - 0.08 * H, chest.z + 0.004 * H], s.material(pick(random, ['#7a1f2a', '#1f3a7a', '#3a5a3a']), { roughness: 0.6 })).rotation.x = 0.12;
    } else {
      const rope = s.material('#d9cba0', { roughness: 0.95 });
      const hip = at(s, person.pelvis);
      s.ring(0.09 * H, 0.009 * H, [hip.x, hip.y + 0.05 * H, hip.z], rope).rotation.x = Math.PI / 2;
    }
    if (a.vestment !== 'suit') {
      const sleeveMat = s.material(clothes.top, { roughness: 0.9, side: THREE.DoubleSide });
      for (const side of ['left', 'right'] as const) {
        const elbow = at(s, person.joints.elbows[side]);
        const upper = at(s, person.joints.shoulders[side]);
        const mid = upper.clone().lerp(elbow, 0.6);
        const sleeve = s.mesh(new THREE.CylinderGeometry(0.03 * H, 0.085 * H, upper.distanceTo(elbow) * 1.08, 14, 1, true), sleeveMat, mid.toArray() as P);
        sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), upper.clone().sub(elbow).normalize());
      }
    }
    // The raised finger: a short stub from the lifted hand.
    if (a.gesture === 'finger') {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.009 * H, 0.04 * H, 3, 6), s.material(skin, { roughness: 0.6 }));
      finger.position.set(0, -0.03 * H, 0);
      person.hands.right.add(finger);
    }

    // ---- on the lectern
    const deskTop = new THREE.Vector3(0, floorY + 1.07, 0.5);
    const tilt = -0.55;
    if (a.lectern === 'bible') {
      const leather = s.material(a.wood === 'oak' ? '#1e1512' : '#4a1c18', { roughness: 0.5 });
      const edges = s.material('#b5242a', { roughness: 0.8 });
      for (const side of [-1, 1]) {
        const cover = s.box([0.21, 0.05, 0.3], [deskTop.x + side * 0.11, deskTop.y + 0.03, deskTop.z], leather);
        cover.rotation.set(tilt, 0, side * 0.08);
        const block = s.box([0.19, 0.045, 0.28], [deskTop.x + side * 0.11, deskTop.y + 0.035, deskTop.z], edges);
        block.rotation.set(tilt, 0, side * 0.08);
        const page = s.box([0.19, 0.003, 0.28], [deskTop.x + side * 0.11, deskTop.y + 0.06, deskTop.z], white);
        page.rotation.set(tilt, 0, side * 0.08);
      }
      for (let i = 0; i < 3; i++) s.box([0.012, 0.004, 0.2], [deskTop.x - 0.04 + i * 0.04, deskTop.y + 0.02, deskTop.z + 0.22], s.material(['#b5242a', '#2a5a3a', '#c9a24a'][i], { roughness: 0.8 })).rotation.x = tilt + 0.3;
    } else if (a.lectern === 'notes') {
      for (let i = 0; i < 5; i++) {
        const sheet = s.box([0.21, 0.003, 0.29], [deskTop.x + (random() - 0.5) * 0.03, deskTop.y + 0.01 + i * 0.004, deskTop.z + (random() - 0.5) * 0.02], white);
        sheet.rotation.set(tilt, (random() - 0.5) * 0.25, 0);
      }
      // Lines of handwriting on the top sheet.
      const ink = s.material('#2a2a3a', { roughness: 1 });
      for (let i = 0; i < 6; i++) {
        const line = s.box([0.12 + random() * 0.05, 0.002, 0.008], [deskTop.x - 0.01, deskTop.y + 0.032 - i * 0.02, deskTop.z + 0.1 - i * 0.034], ink);
        line.rotation.x = tilt;
      }
    } else if (a.lectern === 'tablet') {
      const slab = s.box([0.18, 0.012, 0.25], [deskTop.x, deskTop.y + 0.02, deskTop.z], s.material('#1c1c1f', { roughness: 0.4, metalness: 0.3 }));
      slab.rotation.x = tilt;
      const screen = s.mesh(new THREE.PlaneGeometry(0.16, 0.22), new THREE.MeshStandardMaterial({ color: '#dfe8f0', emissive: '#bcd3e6', emissiveIntensity: 0.9 }), [deskTop.x, deskTop.y + 0.027, deskTop.z]);
      screen.rotation.x = -Math.PI / 2 + tilt;
      screen.castShadow = false;
    } else {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.24, roughness: 0.05, depthWrite: false });
      s.cylinder(0.032, 0.028, 0.1, [0.42, floorY + 1.06, 0.38], glass, 14);
      s.cylinder(0.028, 0.026, 0.06, [0.42, floorY + 1.04, 0.38], new THREE.MeshStandardMaterial({ color: '#dfeefa', transparent: true, opacity: 0.6, depthWrite: false }), 14);
    }

    // ---- the hourglass on the rim, its sand run down by the length of the sermon
    const sand = { opening: 0.92, warning: 0.55, consolation: 0.2, blessing: 0.02 }[a.moment];
    const hx = -0.5, hz = 0.32, hy = floorY + 1.02;
    const frame = s.material(a.wood === 'marble' ? '#2a2a2c' : '#6b4a2e', { roughness: 0.6 });
    s.cylinder(0.065, 0.065, 0.014, [hx, hy, hz], frame, 10);
    s.cylinder(0.065, 0.065, 0.014, [hx, hy + 0.23, hz], frame, 10);
    for (let i = 0; i < 3; i++) s.rod([hx + Math.cos(i * 2.09) * 0.055, hy, hz + Math.sin(i * 2.09) * 0.055], [hx + Math.cos(i * 2.09) * 0.055, hy + 0.23, hz + Math.sin(i * 2.09) * 0.055], 0.006, frame);
    const bulb = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false });
    s.mesh(new THREE.ConeGeometry(0.045, 0.1, 14), bulb, [hx, hy + 0.062, hz]);
    s.mesh(new THREE.ConeGeometry(0.045, 0.1, 14), bulb, [hx, hy + 0.168, hz]).rotation.x = Math.PI;
    const sandMat = s.material('#e3c46a', { roughness: 1 });
    const bottom = s.mesh(new THREE.ConeGeometry(0.043 * (1 - sand) + 0.004, 0.09 * (1 - sand) + 0.006, 12), sandMat, [hx, hy + 0.012 + (0.09 * (1 - sand) + 0.006) / 2, hz]);
    void bottom;
    if (sand > 0.05) {
      const top = s.mesh(new THREE.CylinderGeometry(0.04 * Math.sqrt(sand), 0.004, 0.09 * sand, 12), sandMat, [hx, hy + 0.123 + 0.09 * sand / 2, hz]);
      void top;
    }

    const energy = mood.energy;
    const baseR = person.joints.shoulders.right.rotation.x;
    const emphatic = a.gesture === 'finger' || a.gesture === 'fist' ? 0.1 : a.gesture === 'wide' ? 0.04 : 0;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        person.joints.shoulders.right.rotation.x = baseR + Math.sin(time * mix(1.5, 4, energy)) * emphatic * mix(0.3, 1, energy);
      },
    });
  },
});
