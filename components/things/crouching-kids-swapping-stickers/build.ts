import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { HAIR_COLOURS, type P, SCHOOL_COLOURS, at, paint, pick, pickSkin, rig } from './pose';

const SHINY = ['#e8c23a', '#c9d2e8', '#e85a9a', '#4ae0d8', '#9a6ae8'];
const PLAIN = ['#e84a3a', '#2a63c8', '#3aa655', '#f2c21c', '#ffffff', '#1d1a18'];

export default defineThing({
  questions: {
    kids: choice('How many of them are there?', {
      two: 'Two, one on either side of the album.',
      three: 'Three in a tight huddle.',
      four: 'Four: three on the ground and one bent over their shoulders, trying to see.',
    }),
    deal: choice('How is the swap going?', {
      offer: 'One holds a fanned stack out and another reaches for it.',
      haggle: 'The stack is held back against the chest and the other hand is up, bargaining.',
      found: 'One holds a single shiny up to the light and the others all look up at it.',
      sulk: 'One has turned away and crossed their arms: a bad swap.',
    }),
    album: choice('What is the album doing?', {
      open: 'Open flat on the ground at a half-filled double page.',
      closed: 'Closed, the cover covered in stickers, being used as a table.',
      none: 'No album: the swap is straight from hand to hand over the tarmac.',
    }),
    stickers: choice('What kind of stickers?', {
      foil: 'Shiny foil stickers that catch the light.',
      plain: 'Plain paper stickers, football faces and cartoon animals.',
      cards: 'Trading cards, bigger and stiffer, in a rubber band.',
    }),
    coats: choice('What are they wearing?', {
      mixed: 'One in a coat, the others in school jumpers.',
      jumpers: 'All in school jumpers.',
      coats: 'All in coats with the hoods up: a cold day.',
      summer: 'Polo shirts and shorts: a hot day.',
    }),
    packet: noul('Is a torn-open packet lying on the ground?'),
    ground: choice('What else is on the ground beside them?', {
      nothing: 'Nothing.',
      lunchbox: 'A lunchbox being used as a table.',
      scatter: 'Spilt stickers scattered across the ground.',
      spare: 'A second album, closed, waiting its turn.',
    }),
    school: choice('What is the school colour?', {
      navy: 'Navy blue.', maroon: 'Maroon.', green: 'Bottle green.', grey: 'Grey.', red: 'Bright red.', royal: 'Royal blue.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const school = SCHOOL_COLOURS[a.school];
    const palette = a.stickers === 'foil' ? SHINY : PLAIN;
    const stickerMat = (colour: string) => s.material(colour, a.stickers === 'foil' ? { metalness: 0.75, roughness: 0.25, emissive: colour, emissiveIntensity: 0.18 } : { roughness: 0.6 });
    const stickerSize: P = a.stickers === 'cards' ? [0.064, 0.002, 0.09] : [0.05, 0.002, 0.065];
    const coatColours = ['#2a2f3a', '#8a1f2a', '#3a6a3a', '#d85a2a', '#2a4a9a', '#9a4ac8'];

    // ---- the album at the centre
    const pageMap = paint(256, 192, (c) => {
      c.fillStyle = '#f2eee2'; c.fillRect(0, 0, 256, 192);
      c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
        const x = 14 + i * 47, y = 14 + j * 42;
        c.strokeRect(x, y, 38, 34);
        if (random() < 0.55) { c.fillStyle = pick(random, palette); c.fillRect(x + 1, y + 1, 36, 32); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x + 6, y + 6, 10, 8); }
        else { c.fillStyle = 'rgba(0,0,0,0.08)'; c.font = '10px sans-serif'; c.fillText(String(100 + i * 4 + j), x + 10, y + 20); }
      }
    });
    const pageMat = new THREE.MeshStandardMaterial({ map: pageMap, roughness: 0.9 });
    const cover = s.material(pick(random, ['#1d3a7a', '#c81f2a', '#2a7a3a', '#1d1a18']), { roughness: 0.6 });
    if (a.album === 'open') {
      for (const sx of [-1, 1]) {
        const page = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.012, 0.29), [pageMat, pageMat, pageMat, cover, pageMat, pageMat]);
        page.position.set(sx * 0.107, 0.008, 0);
        page.rotation.z = -sx * 0.06;
        page.rotation.y = (random() - 0.5) * 0.2;
        page.castShadow = page.receiveShadow = true;
        s.root.add(page);
      }
      s.box([0.02, 0.016, 0.3], [0, 0.008, 0], cover);
    } else if (a.album === 'closed') {
      const book = s.box([0.23, 0.03, 0.3], [0, 0.015, 0], cover);
      book.rotation.y = (random() - 0.5) * 0.6;
      for (let i = 0; i < 7; i++) s.box(stickerSize, [(random() - 0.5) * 0.18, 0.032, (random() - 0.5) * 0.24], stickerMat(pick(random, palette))).rotation.y = random() * 3;
    }

    // ---- the huddle
    const count = { two: 2, three: 3, four: 4 }[a.kids];
    const angles = count === 2 ? [150, -60] : [180, 72, -72, 135];
    const radius = 0.44;
    const kids: ReturnType<typeof figure>[] = [];
    const coatOf = (index: number) => a.coats === 'coats' || (a.coats === 'mixed' && index === 1);
    const makeKid = (index: number) => {
      const H = mix(1.02, 1.18, random());
      const coat = coatOf(index);
      const coatColour = pick(random, coatColours);
      const kid = figure(s, {
        height: H, build: random() < 0.25 ? 'slight' : 'average', style: 'doll', skin: pickSkin(random),
        hair: coat ? 'hood' : pick(random, ['short', 'long', 'bun', 'cap', 'short'] as const), hairColor: pick(random, HAIR_COLOURS),
        top: coat ? coatColour : a.coats === 'summer' ? pick(random, ['#f2f0ea', '#e8f0ff', school]) : school,
        bottom: a.coats === 'summer' ? school : pick(random, ['#8a8d93', '#2a2f3a', '#3a3a3e']),
        shoes: pick(random, ['#1d1a18', '#f2f0ea', '#c8322a', '#2a63c8']), sleeves: a.coats === 'summer' ? 'short' : 'long',
        pose: 'crouching', gaze: 'down',
      });
      s.root.add(kid.root);
      kids.push(kid);
      return { kid, H, coat, coatColour };
    };
    const roles = ['holder', 'reacher', 'kneeler', 'leaner'] as const;
    const positions: { x: number; z: number; yaw: number }[] = [];
    const fans: THREE.Group[] = [];
    for (let i = 0; i < count; i++) {
      const theta = angles[i] * Math.PI / 180;
      const role = roles[i];
      const r = role === 'leaner' ? 0.78 : role === 'kneeler' ? radius + 0.04 : radius;
      const x = r * Math.sin(theta), z = r * Math.cos(theta);
      const { kid, H, coat, coatColour } = makeKid(i);
      const pose = rig(kid);
      const lookUp = a.deal === 'found';
      if (role === 'holder') {
        if (a.deal === 'found') { pose.arm('right', { forward: 150, out: 12, bend: 20, across: 10 }); pose.arm('left', { forward: 40, out: 8, bend: 70 }); pose.look(-30, 0); }
        else if (a.deal === 'haggle') { pose.arm('right', { forward: 60, out: -6, bend: 125, across: 50 }); pose.arm('left', { forward: 70, out: 20, bend: 60, across: -20 }); pose.look(8, 0); }
        else { pose.arm('right', { forward: 72, out: 14, bend: 36, across: 10 }); pose.arm('left', { forward: 45, out: 10, bend: 70 }); pose.look(16, 0); }
        pose.bow(14);
      } else if (role === 'reacher') {
        if (a.deal === 'sulk') { pose.arm('left', { forward: 35, out: -4, bend: 118, across: 72 }); pose.arm('right', { forward: 35, out: -4, bend: 118, across: 72 }); pose.look(-4, 70); pose.bow(-6, 0, 0); }
        else if (a.deal === 'haggle') { pose.arm('left', { forward: 80, out: 12, bend: 14 }); pose.arm('right', { forward: 80, out: 12, bend: 14 }); pose.look(lookUp ? -22 : 10, 0); pose.bow(18); }
        else { pose.arm('right', { forward: 78, out: 10, bend: 20 }); pose.arm('left', { forward: 50, out: 8, bend: 70 }); pose.look(lookUp ? -24 : 18, 0); pose.bow(16); }
      } else if (role === 'kneeler') {
        kid.joints.body.rotation.x = 0;
        pose.leg('left', { forward: 0, out: 4, knee: 92 });
        pose.leg('right', { forward: 0, out: 4, knee: 92 });
        if (lookUp) { pose.bow(30); pose.arm('left', { forward: 20, out: 6, bend: 60 }); pose.arm('right', { forward: 20, out: 6, bend: 60 }); pose.look(-30, 0); }
        else { pose.bow(84); pose.arm('left', { forward: 86, out: 12, bend: 0 }); pose.arm('right', { forward: 86, out: 12, bend: 0 }); pose.look(-6, 0); }
      } else {
        // Standing behind, bent double over the others' shoulders, hands on knees.
        kid.joints.body.rotation.x = 0;
        pose.leg('left', { forward: 8, out: 5, knee: 18 });
        pose.leg('right', { forward: 8, out: 5, knee: 18 });
        pose.bow(58);
        pose.arm('left', { forward: 60, out: 10, bend: 10 });
        pose.arm('right', { forward: 60, out: 10, bend: 10 });
        pose.look(lookUp ? -10 : 18, 0);
      }
      kid.settle();
      const yaw = theta + Math.PI + (random() - 0.5) * 0.2;
      kid.root.position.set(x, 0, z);
      kid.root.rotation.y = yaw;
      positions.push({ x, z, yaw });
      if (coat) {
        const hip = at(s, kid.pelvis);
        const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.095 * H, 0.12 * H, 0.17 * H, 16, 1, true), s.material(coatColour, { roughness: 0.9, side: THREE.DoubleSide }));
        hem.position.copy(hip).add(new THREE.Vector3(0, -0.02 * H, 0));
        hem.rotation.y = yaw;
        hem.castShadow = true;
        s.root.add(hem);
      }
      // What the hands hold.
      if (role === 'holder') {
        const fan = new THREE.Group();
        const n = a.deal === 'found' ? 1 : 4 + Math.floor(random() * 4);
        for (let k = 0; k < n; k++) {
          const sticker = new THREE.Mesh(new THREE.BoxGeometry(...stickerSize), stickerMat(pick(random, palette)));
          sticker.rotation.y = (k - (n - 1) / 2) * 0.22;
          sticker.position.set(0, k * 0.0025, stickerSize[2] * 0.4);
          sticker.castShadow = true;
          fan.add(sticker);
        }
        fan.rotation.x = a.deal === 'found' ? -Math.PI / 2 + 0.3 : -0.9;
        fan.position.y = -0.01;
        kid.hands.right.add(fan);
        fans.push(fan);
        if (a.stickers === 'cards' && a.deal !== 'found') {
          const band = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.003, 5, 12), s.material('#c8a060', { roughness: 0.9 }));
          band.rotation.x = Math.PI / 2;
          band.position.z = stickerSize[2] * 0.4;
          fan.add(band);
        }
      }
    }

    // ---- the ground: packet, spilt stickers, a lunchbox, a spare album
    const open = random() * Math.PI * 2;
    const spot = (r: number) => [Math.sin(open) * r, Math.cos(open) * r] as const;
    if (a.packet) {
      const [px, pz] = spot(0.28);
      const packet = s.box([0.07, 0.003, 0.11], [px, 0.003, pz], s.material(pick(random, ['#e8402a', '#2a63c8', '#f2c21c']), { roughness: 0.6 }));
      packet.rotation.y = random() * 3;
      packet.rotation.x = 0.05;
      const flap = s.box([0.07, 0.003, 0.035], [px + 0.02, 0.012, pz + 0.05], packet.material as THREE.Material);
      flap.rotation.set(0.6, random() * 3, 0);
    }
    if (a.ground === 'scatter') {
      const n = 6 + Math.floor(random() * 8);
      for (let i = 0; i < n; i++) {
        const angle = random() * Math.PI * 2, r = 0.15 + random() * 0.5;
        s.box(stickerSize, [Math.sin(angle) * r, 0.002 + i * 0.001, Math.cos(angle) * r], stickerMat(pick(random, palette))).rotation.y = random() * 3;
      }
    }
    if (a.ground === 'lunchbox') {
      const [px, pz] = spot(0.36);
      const box = s.box([0.25, 0.1, 0.17], [px, 0.05, pz], s.material(pick(random, ['#e8402a', '#2a7ad8', '#f2c21c', '#8a4ad8']), { roughness: 0.5 }));
      box.rotation.y = random();
      for (let i = 0; i < 3; i++) s.box(stickerSize, [px + (random() - 0.5) * 0.15, 0.102 + i * 0.002, pz + (random() - 0.5) * 0.1], stickerMat(pick(random, palette))).rotation.y = random() * 3;
    }
    if (a.ground === 'spare') {
      const [px, pz] = spot(0.4);
      s.box([0.23, 0.03, 0.3], [px, 0.015, pz], s.material(pick(random, ['#1d3a7a', '#c81f2a', '#2a7a3a']), { roughness: 0.6 })).rotation.y = random() * 3;
    }

    // ---- motion: heads bob and the fan tilts as the bargaining goes on
    const phase = random() * Math.PI * 2;
    const necks = kids.map((kid) => kid.joints.neck.rotation.x);
    return s.finish({
      update(dt, time) {
        kids.forEach((kid, i) => {
          kid.update(dt, time);
          kid.joints.neck.rotation.x = necks[i] + Math.sin(time * mix(0.8, 2.4, mood.energy) + phase + i * 1.7) * 0.05 * (0.3 + mood.energy);
        });
        for (const fan of fans) fan.rotation.z = Math.sin(time * 1.6 + phase) * 0.12 * mood.energy;
      },
    });
  },
});
