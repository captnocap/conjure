import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { type Build, HAT_COLOURS, type P, RAD, arm, boots, hardHat, leg, look, paint, pick, pickSkin, worldOf } from './site';

export default defineThing({
  questions: {
    showing: choice('What does he show the phone?', {
      face: 'His own face, the phone held up in front of him.',
      view: 'The view: the phone turned away, held out to one side.',
      lunch: 'The lunch, the phone pointed down at the tiffin on his knee.',
    }),
    wave: choice('How does he wave?', {
      small: 'A small wave, fingers only, shy of the other workers.',
      big: 'A big wave, the whole arm.',
      kiss: 'A kiss blown from the fingertips.',
      thumbs: 'A thumbs-up held next to his face.',
    }),
    overalls: choice('What colour are his overalls?', {
      blue: 'Faded blue, grey with dust.',
      orange: 'Orange, the company colour.',
      grey: 'Grey, torn at one knee.',
      khaki: 'Khaki, white at the seams.',
      white: 'Once-white painter\'s overalls, every colour on them.',
    }),
    bootsOff: noul('Are his boots off and set beside the crate, socks on his feet?'),
    lunch: choice('What is on his knee?', {
      tiffin: 'A stacked steel tiffin, the top tier open.',
      roti: 'Foil-wrapped flatbreads, one unrolled.',
      tub: 'A plastic tub of rice and a spoon.',
      nothing: 'Nothing: he has not got to lunch yet.',
    }),
    hat: choice('Where is his hard hat?', {
      on: 'Still on, pushed back.',
      off: 'Off, upturned on the ground beside him with his gloves in it.',
      knee: 'Off, hooked on the crate corner.',
    }),
    seat: choice('What does he sit on?', {
      crate: 'A wooden crate.',
      bucket: 'An upturned bucket.',
      blocks: 'A stack of concrete blocks.',
      plank: 'A plank across two blocks, room for one more.',
    }),
    screen: choice('What is on the screen?', {
      family: 'A bright room with small faces crowding the camera.',
      child: 'One child, close to the lens.',
      outside: 'A doorway, sun, a courtyard, someone laughing.',
      dark: 'A dim room lit by its own phone: night on the other side of the world.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.64, 1.82, random());
    const build: Build = random() < 0.3 ? 'slight' : random() < 0.5 ? 'heavy' : 'average';
    const dust = mood.wear;
    const base = { blue: '#3a5a8a', orange: '#f07a1a', grey: '#6e7074', khaki: '#9a8a5a', white: '#e8e4da' }[a.overalls];
    const colour = new THREE.Color(base).lerp(new THREE.Color('#b8ad98'), 0.15 + dust * 0.35).getStyle();
    const skin = pickSkin(random);
    const phoneSide = random() < 0.5 ? 'right' : 'left';
    const waveSide = phoneSide === 'right' ? 'left' : 'right';
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'sitting', hair: a.hat === 'on' ? 'none' : 'short', hairColor: '#2a2320', skin,
      top: colour, bottom: colour, shoes: a.bootsOff ? '#d9d6cc' : '#5a4030', sleeves: random() < 0.5 ? 'long' : 'short',
    });
    s.root.add(person.root);
    const seatH = { crate: 0.45, bucket: 0.36, blocks: 0.4, plank: 0.42 }[a.seat];
    const low = seatH < 0.4;
    leg(person, 'left', { forward: low ? 98 : 90, knee: low ? 114 : 100, out: 14, foot: 'flat' });
    leg(person, 'right', { forward: low ? 96 : 88, knee: low ? 110 : 96, out: 10, foot: 'flat' });
    // The phone arm: out in front, to the side for the view, or down at the lunch.
    if (a.showing === 'face') arm(person, phoneSide, { forward: 82, out: 12, bend: 24, across: 18 });
    else if (a.showing === 'view') arm(person, phoneSide, { forward: 70, out: 60, bend: 10, across: -10 });
    else arm(person, phoneSide, { forward: 60, out: 10, bend: 70, across: 30 });
    // The waving hand.
    if (a.wave === 'small') arm(person, waveSide, { forward: 70, out: 14, bend: 110, across: -10 });
    else if (a.wave === 'big') arm(person, waveSide, { forward: 150, out: 40, bend: 30, across: -20 });
    else if (a.wave === 'kiss') arm(person, waveSide, { forward: 55, out: 8, bend: 140, across: 32 });
    else arm(person, waveSide, { forward: 50, out: 24, bend: 125, across: 10 });
    look(person, a.showing === 'lunch' ? 30 : a.showing === 'view' ? 4 : 10, a.showing === 'view' ? (phoneSide === 'right' ? -45 : 45) : (phoneSide === 'right' ? -8 : 8));
    person.joints.spine.rotation.x = 0.08;
    person.settle();
    person.root.updateMatrixWorld(true);
    const hips = worldOf(person.pelvis);
    if (!a.bootsOff) boots(s, person, H);
    // Overall bib and straps.
    const limb = H * 0.036 * { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const torsoL = H * 0.28, r = limb * 1.35 * (build === 'heavy' ? 1.25 : 1);
    const strap = s.material(colour, { roughness: 0.9 });
    const shirt = s.material(pick(random, ['#d9d6cc', '#8a3a3a', '#4a6a5a', '#2a2a2c']), { roughness: 0.9 });
    const chest = new THREE.Mesh(new THREE.BoxGeometry(r * 1.9 * (person.joints.spine.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh).scale.x * 0.92, torsoL * 0.34, 0.014), shirt);
    chest.position.set(0, torsoL * 0.8, r + 0.004);
    chest.castShadow = true;
    person.joints.spine.add(chest);
    for (const sign of [-1, 1]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.035, torsoL * 0.5, 0.012), strap);
      band.position.set(sign * H * 0.042, torsoL * 0.74, r + 0.014);
      band.castShadow = true;
      person.joints.spine.add(band);
    }
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.01), strap);
    pocket.position.set(0, torsoL * 0.5, r + 0.012);
    person.joints.spine.add(pocket);

    // ---- the seat under him
    const seatAt: P = [hips.x, 0, hips.z - 0.03];
    const sit = Math.max(0.2, person.hipHeight - 0.03);
    if (a.seat === 'crate') {
      const wood = s.material('#b89560', { roughness: 0.9 });
      s.box([0.5, sit, 0.45], [seatAt[0], sit / 2, seatAt[2]], s.material('#9a7a4a', { roughness: 0.95 }));
      for (let i = 0; i < 3; i++) { s.box([0.52, 0.08, 0.015], [seatAt[0], 0.07 + i * (sit / 3), seatAt[2] + 0.23], wood); s.box([0.015, 0.08, 0.47], [seatAt[0] + 0.26, 0.07 + i * (sit / 3), seatAt[2]], wood); s.box([0.015, 0.08, 0.47], [seatAt[0] - 0.26, 0.07 + i * (sit / 3), seatAt[2]], wood); }
    } else if (a.seat === 'bucket') {
      s.cylinder(0.135, 0.15, sit, [seatAt[0], sit / 2, seatAt[2]], s.material(pick(random, ['#e8e6de', '#2b4f8a', '#f07a1a']), { roughness: 0.55 }), 18);
    } else if (a.seat === 'blocks') {
      const block = s.material('#9a9a94', { roughness: 0.95 });
      for (let layer = 0; layer < 2; layer++) s.box([0.4, sit / 2, 0.2], [seatAt[0], sit / 4 + layer * (sit / 2), seatAt[2]], block).rotation.y = layer ? Math.PI / 2 : 0;
    } else {
      const block = s.material('#9a9a94', { roughness: 0.95 });
      for (const x of [-0.7, 0.7]) s.box([0.2, sit - 0.05, 0.4], [seatAt[0] + x, (sit - 0.05) / 2, seatAt[2]], block);
      s.box([1.8, 0.05, 0.25], [seatAt[0], sit - 0.025, seatAt[2]], s.material('#c9a66b', { roughness: 0.9 }));
    }

    // ---- the phone, face lit toward him or away
    const hand = worldOf(person.hands[phoneSide]);
    const head = worldOf(person.head);
    const screenMap = paint(96, 192, (c) => {
      const tones = { family: ['#f6e7b0', '#e8c27a'], child: ['#f2dcc0', '#d9a880'], outside: ['#dff0ff', '#f6e3a0'], dark: ['#2a2f48', '#1a1c2a'] }[a.screen];
      const g = c.createLinearGradient(0, 0, 0, 192); g.addColorStop(0, tones[0]); g.addColorStop(1, tones[1]); c.fillStyle = g; c.fillRect(0, 0, 96, 192);
      const faces = a.screen === 'family' ? 4 : a.screen === 'child' ? 1 : a.screen === 'outside' ? 1 : 1;
      for (let i = 0; i < faces; i++) {
        const cx = a.screen === 'child' ? 48 : 20 + ((i * 37) % 60) + random() * 10, cy = a.screen === 'child' ? 90 : 60 + ((i * 53) % 90), rr = a.screen === 'child' ? 30 : 12 + random() * 8;
        c.fillStyle = a.screen === 'dark' ? '#5a5a6a' : pick(random, ['#c58f62', '#a6714b', '#7a4f33', '#dfb48f']); c.beginPath(); c.arc(cx, cy, rr, 0, Math.PI * 2); c.fill();
        c.fillStyle = a.screen === 'dark' ? '#2a2a34' : '#2a2320'; c.beginPath(); c.arc(cx, cy - rr * 0.7, rr * 0.9, Math.PI, 0); c.fill();
      }
      if (a.screen === 'outside') { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 96, 50); c.fillStyle = '#8ab070'; c.fillRect(0, 150, 96, 42); }
      if (a.screen === 'dark') { c.fillStyle = '#9fbbff'; c.fillRect(30, 70, 14, 20); }
      c.fillStyle = '#ffffff'; c.fillRect(4, 180, 30, 8); c.fillStyle = '#e8463a'; c.beginPath(); c.arc(80, 184, 5, 0, Math.PI * 2); c.fill();
    });
    const phone = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.009), s.material('#1f2124', { roughness: 0.35 }));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.138), new THREE.MeshStandardMaterial({ map: screenMap, emissive: '#ffffff', emissiveMap: screenMap, emissiveIntensity: mix(0.6, 1.2, 1 - mood.daylight * 0.3), roughness: 0.3 }));
    screen.position.z = 0.0051;
    body.castShadow = true;
    phone.add(body, screen);
    phone.position.set(hand.x, hand.y + 0.06, hand.z + 0.01);
    if (a.showing === 'face') {
      // Screen toward his face.
      phone.lookAt(head.x, head.y, head.z);
    } else if (a.showing === 'view') {
      phone.lookAt(head.x, head.y, head.z);
      phone.rotateY(Math.PI);
    } else {
      phone.rotation.set(-Math.PI / 2 + 0.6, (phoneSide === 'right' ? 1 : -1) * 0.3, 0);
      phone.position.y = hand.y + 0.03;
    }
    s.root.add(phone);

    // ---- the wave and the kiss
    const waveHand = worldOf(person.hands[waveSide]);
    if (a.wave === 'kiss') s.ball([0.012, 0.012, 0.012], [waveHand.x, waveHand.y + 0.02, waveHand.z + 0.06], new THREE.MeshStandardMaterial({ color: '#f0a0b0', emissive: '#f08098', emissiveIntensity: 0.6, transparent: true, opacity: 0.7, depthWrite: false }), 8);
    if (a.wave === 'thumbs') s.rod([waveHand.x, waveHand.y, waveHand.z], [waveHand.x, waveHand.y + 0.07, waveHand.z], 0.012, (person.hands.left.parent!.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh).material as THREE.Material);

    // ---- lunch on the knee
    const knee = worldOf(person.joints.knees[phoneSide === 'right' ? 'left' : 'right']);
    const kneeTop: P = [knee.x, knee.y + 0.05, knee.z - 0.06];
    const steel = s.material('#c9ced2', { metalness: 0.85, roughness: 0.3 });
    if (a.lunch === 'tiffin') {
      for (let tier = 0; tier < 3; tier++) s.cylinder(0.065, 0.065, 0.05, [kneeTop[0], kneeTop[1] + 0.025 + tier * 0.052, kneeTop[2]], steel, 18);
      s.cylinder(0.062, 0.062, 0.006, [kneeTop[0], kneeTop[1] + 0.155, kneeTop[2]], s.material(pick(random, ['#e8c25a', '#c8a050', '#8a6a3a']), { roughness: 0.8 }), 18);
      const lid = s.cylinder(0.068, 0.068, 0.012, [kneeTop[0] + 0.09, kneeTop[1] + 0.006, kneeTop[2] + 0.08], steel, 18);
      void lid;
      s.rod([kneeTop[0] - 0.07, kneeTop[1] + 0.2, kneeTop[2]], [kneeTop[0] + 0.02, kneeTop[1] + 0.16, kneeTop[2] + 0.02], 0.004, steel);
    } else if (a.lunch === 'roti') {
      const foil = s.material('#d4d8dc', { metalness: 0.8, roughness: 0.3 });
      s.cylinder(0.085, 0.085, 0.03, [kneeTop[0], kneeTop[1] + 0.015, kneeTop[2]], foil, 16);
      s.cylinder(0.08, 0.08, 0.006, [kneeTop[0] + 0.05, kneeTop[1] + 0.033, kneeTop[2] + 0.03], s.material('#e8c98a', { roughness: 0.9 }), 16);
    } else if (a.lunch === 'tub') {
      s.cylinder(0.075, 0.065, 0.07, [kneeTop[0], kneeTop[1] + 0.035, kneeTop[2]], s.material('#f2efe6', { roughness: 0.5, transparent: true, opacity: 0.9 }), 16);
      s.cylinder(0.07, 0.07, 0.03, [kneeTop[0], kneeTop[1] + 0.055, kneeTop[2]], s.material('#f6f0dc', { roughness: 0.9 }), 16);
      s.rod([kneeTop[0] + 0.02, kneeTop[1] + 0.07, kneeTop[2]], [kneeTop[0] + 0.08, kneeTop[1] + 0.15, kneeTop[2] - 0.03], 0.005, s.material('#f2f1ea'));
    }

    // ---- the hat, and the boots off beside the crate
    const hatColour = pick(random, [HAT_COLOURS.yellow, HAT_COLOURS.white, HAT_COLOURS.orange, HAT_COLOURS.blue]);
    if (a.hat === 'on') hardHat(s, person, H, hatColour, { tilt: 12 });
    else {
      const headR = H * 0.064;
      const shell = s.material(hatColour, { roughness: 0.35 });
      const spare = new THREE.Group();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.16, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), shell);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.36, headR * 1.4, headR * 0.08, 24), shell);
      dome.castShadow = rim.castShadow = true;
      spare.add(dome, rim);
      if (a.hat === 'off') {
        spare.position.set(seatAt[0] + (phoneSide === 'right' ? 0.5 : -0.5), headR * 1.2, seatAt[2] + 0.2);
        spare.rotation.set(Math.PI, random() * 3, 0.15);
        s.scatter(new THREE.BoxGeometry(0.08, 0.03, 0.16), s.material('#e8c25a', { roughness: 0.85 }), [{ at: [spare.position.x, headR * 1.3, spare.position.z] as P, size: 1 }, { at: [spare.position.x + 0.03, headR * 1.33, spare.position.z - 0.02] as P, size: 1 }]);
      } else {
        spare.position.set(seatAt[0] + (phoneSide === 'right' ? -0.26 : 0.26), sit + headR * 0.2, seatAt[2] - 0.2);
        spare.rotation.set(0.4, 0.5, (phoneSide === 'right' ? 1 : -1) * 0.6);
      }
      s.root.add(spare);
    }
    if (a.bootsOff) {
      const leather = s.material('#5a4030', { roughness: 0.8 });
      const bx = seatAt[0] + (phoneSide === 'right' ? -0.45 : 0.45) + (random() - 0.5) * 0.1, bz = seatAt[2] + 0.35;
      for (let i = 0; i < 2; i++) {
        const boot = new THREE.Group();
        const sole = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.16, 3, 8), leather);
        sole.rotation.x = Math.PI / 2;
        sole.position.y = 0.045;
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 10), leather);
        shaft.position.set(0, 0.1, -0.06);
        sole.castShadow = shaft.castShadow = true;
        boot.add(sole, shaft);
        boot.position.set(bx + (i - 0.5) * 0.13, 0, bz + (random() - 0.5) * 0.06);
        boot.rotation.y = (random() - 0.5) * 0.8 + (i ? 0.3 : -0.3);
        if (i === 1 && random() < 0.4) { boot.rotation.z = Math.PI / 2; boot.position.y = 0.05; }
        s.root.add(boot);
      }
    }

    // Turned so the phone arm and the waving hand both show.
    s.root.rotation.y = (phoneSide === 'right' ? -1 : 1) * 24 * RAD;
    const energy = mood.energy;
    const waveShoulder = person.joints.shoulders[waveSide];
    const waveElbow = person.joints.elbows[waveSide];
    const baseZ = waveShoulder.rotation.z, baseY = waveElbow.rotation.y;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        const rate = a.wave === 'big' ? 3.5 : 6;
        if (a.wave === 'big') waveShoulder.rotation.z = baseZ + Math.sin(time * rate) * 0.22 * (0.3 + energy);
        else if (a.wave === 'small') waveElbow.rotation.y = baseY + Math.sin(time * rate) * 0.18 * (0.3 + energy);
      },
    });
  },
});
