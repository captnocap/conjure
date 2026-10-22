import * as THREE from 'three';
import { type Figure, Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { numberCard, paint, pickSkin, rig } from './rig';

const NUMBERS = {
  seven: 'Number 7, a single digit on a clean card: an early entrant.',
  'twenty-three': 'Number 23.',
  'forty-one': 'Number 41.',
  'sixty-eight': 'Number 68.',
  'one-twelve': 'Number 112, three digits: a late entry in a big field.',
} as const;
const DIGITS: Record<keyof typeof NUMBERS, string> = { seven: '7', 'twenty-three': '23', 'forty-one': '41', 'sixty-eight': '68', 'one-twelve': '112' };

/** Sequins painted as a dense scatter of pale glints on a dark cloth. */
function sequins(random: () => number, base: string, glint: string) {
  return paint(128, 128, (c) => {
    c.fillStyle = base;
    c.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 520; i++) {
      c.fillStyle = i % 5 ? glint : '#ffffff';
      c.globalAlpha = 0.35 + random() * 0.6;
      c.beginPath();
      c.arc(random() * 128, random() * 128, 1.2 + random() * 1.6, 0, Math.PI * 2);
      c.fill();
    }
  });
}

export default defineThing({
  questions: {
    asleep: choice('Who is asleep?', {
      she: 'She is asleep, head on his shoulder, her free arm hanging limp, while his feet keep shuffling.',
      he: 'He is asleep, slumped with his head on her shoulder, while she keeps them both moving.',
      both: 'Both are asleep, temples leaning together, still swaying, neither quite falling.',
    }),
    outfits: choice('What are they wearing?', {
      shirtsleeves: 'He in shirt-sleeves and suspenders, she in a faded cotton day dress.',
      tuxedo: 'A borrowed tuxedo that does not fit him, and a sequinned gown that was once somebody else\'s.',
      overalls: 'Both in work overalls and cotton shirts: a farm couple who drove in for the prize.',
      sunday: 'His one Sunday suit, her good wool dress with a white collar.',
    }),
    number: choice('What number is pinned on their backs?', NUMBERS),
    shoes: choice('What state are the shoes in?', {
      polished: 'Still polished, somebody shines them in the rest breaks.',
      scuffed: 'Scuffed grey, worn through at the toes.',
      taped: 'Soles wrapped round and round with white tape.',
      stockinged: 'The shoes are gone: they dance in stockinged feet.',
    }),
    gone: score('How far gone are they?', ['Still upright and dancing properly', 'Shuffling, leaning on each other', 'Barely standing, knees sagging, held up by the hold alone']),
    blanket: noul('Is a grey blanket draped over the sleeping one\'s shoulders?'),
    towel: noul('Does a towel hang around the neck of the one still awake?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const sheAsleep = a.asleep !== 'he';
    const heAsleep = a.asleep !== 'she';
    const gone = a.gone;
    const Hh = mix(1.7, 1.8, random()), Hs = mix(1.58, 1.66, random());
    const skinH = pickSkin(random), skinS = pickSkin(random);

    // ---- clothes
    const shoeColour = { polished: '#141416', scuffed: '#6f5a46', taped: '#4a3a2e', stockinged: '' }[a.shoes];
    const shoeRough = a.shoes === 'polished' ? 0.25 : 0.95;
    const his = {
      shirtsleeves: { top: '#eee8d8', bottom: '#4a4a52', sleeves: 'short' as const },
      tuxedo: { top: '#1c1c22', bottom: '#1c1c22', sleeves: 'long' as const },
      overalls: { top: '#c9c0a8', bottom: '#3d4f6e', sleeves: 'long' as const },
      sunday: { top: '#4a3f3a', bottom: '#4a3f3a', sleeves: 'long' as const },
    }[a.outfits];
    const dress = { shirtsleeves: pick(['#9fb0c4', '#c9a0a0', '#b5bf98', '#d8c9a4']), tuxedo: pick(['#2a2a44', '#4a1f30', '#1f3a3a']), overalls: '#3d4f6e', sunday: pick(['#5a3a3a', '#3a4a5a', '#4a4a3a']) }[a.outfits];
    const hers = { top: a.outfits === 'overalls' ? '#e9e2cf' : dress, bottom: dress, sleeves: (a.outfits === 'sunday' ? 'long' : 'short') as 'long' | 'short' };
    const gownMat = a.outfits === 'tuxedo' ? s.material('#ffffff', { map: sequins(random, dress, '#d9d0ff'), roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide }) : s.material(dress, { roughness: 0.95, side: THREE.DoubleSide });

    const make = (H: number, skin: string, outfit: { top: string; bottom: string; sleeves: 'long' | 'short' }, woman: boolean, mirror: boolean) => {
      const person = figure(s, {
        height: H, style: 'doll', skin, mirror, build: woman || a.gone > 0.5 ? 'slight' : 'average',
        hair: woman ? pick(['bun', 'short']) : 'short', hairColor: pick(['#2a1c14', '#4a2f1b', '#6b4a2e', '#1f1a18']),
        shoes: a.shoes === 'stockinged' ? (woman ? '#d9b89a' : '#5a5a58') : shoeColour,
        ...outfit,
      });
      // The kit paints shoes with the sculpture's wear; a polished pair needs its own gloss.
      for (const ankle of [person.joints.ankles.left, person.joints.ankles.right]) {
        const foot = ankle.children[0] as THREE.Mesh;
        (foot.material as THREE.MeshStandardMaterial).roughness = shoeRough;
        if (a.shoes === 'taped') for (const dz of [-0.03, 0.025]) {
          const tape = new THREE.Mesh(new THREE.TorusGeometry(H * 0.036 * 1.05, 0.006, 6, 14), s.material('#e8e4d8', { roughness: 1 }));
          tape.position.set(0, -H * 0.03, H * 0.036 * 1.1 + dz);
          tape.castShadow = true;
          ankle.add(tape);
        }
      }
      s.root.add(person.root);
      return person;
    };

    const he = make(Hh, skinH, his, false, false);
    const she = make(Hs, skinS, hers, true, true);
    const limbH = Hh * 0.036, limbS = Hs * 0.036;

    // Suspenders, bibs, shirt fronts and a bow tie, hung on the torsos.
    const strap = (person: Figure, H: number, colour: string, bib: boolean) => {
      const mat = s.material(colour, { roughness: 0.9 });
      const limb = H * 0.036, torsoL = H * 0.28, shoulderW = H * 0.115;
      for (const side of [-1, 1]) for (const z of [1, -1]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.022 * H / 1.7, torsoL * 0.78, 0.008), mat);
        band.position.set(side * shoulderW * 0.42, torsoL * 0.55, z * (limb * 1.4));
        band.rotation.x = z * -0.06;
        band.castShadow = true;
        person.joints.spine.add(band);
      }
      if (bib) {
        const front = new THREE.Mesh(new THREE.BoxGeometry(shoulderW * 1.1, torsoL * 0.42, 0.012), mat);
        front.position.set(0, torsoL * 0.42, limb * 1.37);
        front.castShadow = true;
        person.joints.spine.add(front);
      }
    };
    if (a.outfits === 'shirtsleeves') strap(he, Hh, '#2a2a30', false);
    if (a.outfits === 'overalls') { strap(he, Hh, '#3d4f6e', true); strap(she, Hs, '#3d4f6e', true); }
    if (a.outfits === 'tuxedo' || a.outfits === 'sunday') {
      const torsoL = Hh * 0.28;
      const shirt = new THREE.Mesh(new THREE.BoxGeometry(Hh * 0.05, torsoL * 0.62, 0.01), s.material('#f1ede2', { roughness: 0.7 }));
      shirt.position.set(0, torsoL * 0.62, limbH * 1.36);
      he.joints.spine.add(shirt);
      const tie = new THREE.Mesh(new THREE.BoxGeometry(Hh * 0.055, Hh * 0.018, 0.016), s.material(a.outfits === 'tuxedo' ? '#141416' : '#6a2a2a', { roughness: 0.6 }));
      tie.position.set(0, torsoL * 0.96, limbH * 1.38);
      he.joints.spine.add(tie);
      if (a.outfits === 'sunday') {
        const collar = new THREE.Mesh(new THREE.TorusGeometry(limbS * 1.55, limbS * 0.35, 6, 18), s.material('#f1ede2', { roughness: 0.8 }));
        collar.position.y = Hs * 0.28 * 0.98;
        collar.rotation.x = Math.PI / 2;
        she.joints.spine.add(collar);
      }
    }
    // Her skirt: a lathe from the hips, to the knee for a day dress and to the floor for the gown.
    if (a.outfits !== 'overalls') {
      const hipW = Hs * 0.075, hip = Hs * 0.57;
      const hem = a.outfits === 'tuxedo' ? hip - 0.03 : hip * 0.62;
      const flare = a.outfits === 'tuxedo' ? 2.4 : 1.9;
      const skirt = new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(hipW * 1.25, 0.03), new THREE.Vector2(hipW * 1.3, -hem * 0.3), new THREE.Vector2(hipW * flare * 0.75, -hem * 0.75), new THREE.Vector2(hipW * flare, -hem),
      ], 24), gownMat);
      skirt.castShadow = skirt.receiveShadow = true;
      she.pelvis.add(skirt);
    }

    // ---- the hold: he faces +z, she faces him; each a little to the other's right.
    const rh = rig(he), rs = rig(she);
    he.root.position.set(0.07, 0, -0.16);
    she.root.position.set(-0.07, 0, 0.18 + gone * 0.02);
    she.root.rotation.y = Math.PI;
    const sag = gone;
    // His frame: left arm out to the side holding her hand, right arm round her back.
    rh.arm('left', { forward: 30, out: 70, bend: 20, across: 0 });
    rh.arm('right', { forward: 50, out: 20, bend: 70, across: 60 });
    rh.leg('left', { forward: 7, out: 4, knee: 6 + sag * 20 });
    rh.leg('right', { forward: -4, out: 4, knee: 4 + sag * 16 });
    rs.arm('right', { forward: 30, out: 62, bend: 20, across: 0 });
    rs.leg('left', { forward: 5, out: 3, knee: 8 + sag * 24 });
    rs.leg('right', { forward: -2, out: 5, knee: 6 + sag * 20 });

    // Who sleeps: the head drops onto the partner's shoulder, the free arm hangs.
    if (sheAsleep && !heAsleep) {
      rs.arm('left', { forward: 8, out: 8, bend: 8 });
      rs.lean(7 + sag * 5);
      rs.bow(6 + sag * 10, 6);
      rs.look(26, 12, 36);
      rh.lean(3 + sag * 3);
      rh.bow(4 + sag * 8, -4);
      rh.look(8 + sag * 20, -10, -8);
    } else if (heAsleep && !sheAsleep) {
      rh.arm('right', { forward: 10, out: 10, bend: 10 });
      rs.arm('left', { forward: 70, out: 10, bend: 90, across: 40 });
      rh.lean(9 + sag * 5);
      rh.bow(24 + sag * 10, 8);
      rh.leg('left', { forward: 9, out: 4, knee: 18 + sag * 20 });
      rh.leg('right', { forward: -2, out: 4, knee: 16 + sag * 16 });
      rh.look(32, 14, 40);
      rs.lean(2 + sag * 3);
      rs.bow(3 + sag * 6, 5);
      rs.look(6 + sag * 18, 12, 10);
    } else {
      rs.arm('left', { forward: 70, out: 10, bend: 90, across: 40 });
      rh.lean(5 + sag * 5);
      rs.lean(5 + sag * 5);
      rh.bow(10 + sag * 8, -3);
      rs.bow(10 + sag * 8, 3);
      rh.look(18, -6, -26);
      rs.look(18, 6, -26);
    }
    rh.settle(false);
    rs.settle(false);

    // ---- cards, blanket, towel
    const digits = DIGITS[a.number];
    numberCard(s, he, Hh, digits);
    numberCard(s, she, Hs, digits);
    if (a.blanket) {
      const sleeper = heAsleep ? he : she, H = heAsleep ? Hh : Hs;
      const wool = s.material(pick(['#6f6f6a', '#5a5f5a', '#7a6a5a']), { roughness: 1, side: THREE.DoubleSide });
      const torsoL = H * 0.28, shoulderW = H * 0.115;
      const cape = new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(H * 0.04, torsoL * 0.98), new THREE.Vector2(shoulderW * 1.3, torsoL * 0.8), new THREE.Vector2(shoulderW * 1.45, torsoL * 0.35), new THREE.Vector2(shoulderW * 1.5, torsoL * 0.05),
      ], 20, Math.PI * 0.3, Math.PI * 1.4), wool);
      cape.castShadow = true;
      sleeper.joints.spine.add(cape);
    }
    if (a.towel) {
      const waker = heAsleep && !sheAsleep ? she : he, H = waker === he ? Hh : Hs;
      const cloth = s.material('#e4ddc8', { roughness: 1 });
      const torsoL = H * 0.28, shoulderW = H * 0.115, limb = H * 0.036;
      for (const side of [-1, 1]) {
        const half = new THREE.Mesh(new THREE.BoxGeometry(H * 0.07, torsoL * 0.5, 0.012), cloth);
        half.position.set(side * shoulderW * 0.55, torsoL * 0.78, limb * 1.4);
        half.rotation.z = side * 0.12;
        half.castShadow = true;
        waker.joints.spine.add(half);
      }
      const yoke = new THREE.Mesh(new THREE.TorusGeometry(shoulderW * 0.7, 0.02, 6, 16, Math.PI), cloth);
      yoke.position.set(0, torsoL * 1.0, limb * 0.4);
      yoke.rotation.x = -Math.PI / 2;
      waker.joints.spine.add(yoke);
    }

    // The one awake keeps their feet shifting; the pair sways as one.
    const rate = mix(0.6, 2.2, mood.energy);
    const amplitude = mix(0.03, 0.12, mood.energy);
    const phase = random() * Math.PI * 2;
    const shufflers = [...(heAsleep && !sheAsleep ? [] : [he]), ...(sheAsleep && !heAsleep ? [] : [she])];
    const rest = new Map<THREE.Object3D, number>();
    for (const person of [he, she]) {
      rest.set(person.joints.hips.left, person.joints.hips.left.rotation.x);
      rest.set(person.joints.hips.right, person.joints.hips.right.rotation.x);
      rest.set(person.joints.body, person.joints.body.rotation.z);
    }
    return s.finish({
      update(dt, time) {
        he.update(dt, time);
        she.update(dt, time);
        const sway = Math.sin(time * rate * 0.5 + phase);
        for (const person of [he, she]) person.joints.body.rotation.z = rest.get(person.joints.body)! + (person === she ? -sway : sway) * amplitude * 0.4;
        for (const person of shufflers) {
          const step = Math.sin(time * rate + phase);
          person.joints.hips.left.rotation.x = rest.get(person.joints.hips.left)! - step * amplitude;
          person.joints.hips.right.rotation.x = rest.get(person.joints.hips.right)! + step * amplitude;
        }
      },
    });
  },
});
