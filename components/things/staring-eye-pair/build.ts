import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { makeEye } from './eye';
import { SKIN_COLOUR, SKIN_TONES, almond, crease, makeSocket, skinPlate } from './face';

const IRIS = {
  brown: 'Warm dark brown.',
  blue: 'Pale clear blue.',
  green: 'Green with gold flecks.',
  hazel: 'Hazel, amber into olive.',
  grey: 'Cool grey.',
  amber: 'Bright wolfish amber.',
  black: 'So dark the pupil is lost in it.',
} as const;
const IRIS_COLOUR: Record<keyof typeof IRIS, string> = {
  brown: '#6b3d1c', blue: '#5b9bd0', green: '#5f9040', hazel: '#9a7a30', grey: '#8794a0', amber: '#d08a1c', black: '#20140e',
};

export default defineThing({
  questions: {
    expression: choice('What are the eyes saying?', {
      surprise: 'Wide open in surprise or fright, white showing all round.',
      suspicion: 'Narrowed in suspicion, a sidelong slit.',
      sleepy: 'Sleepy and half-lidded, heavy and slow.',
      furious: 'Furious: lids slanted hard down toward the nose.',
      kind: 'Kind, crinkled up from below by a smile.',
      pleading: 'Pleading, slanted up in the middle like a sad dog.',
    }),
    age: choice('How old is the face they belong to?', {
      infant: 'An infant: huge irises, smooth plump skin.',
      young: 'Young, clear and unlined.',
      middle: 'Middle-aged, a few fine lines and some tiredness.',
      elderly: "Elderly: crow's feet, bags, hooded lids, thinning lashes.",
    }),
    iris: choice('What colour are the eyes?', IRIS),
    alignment: choice('How are the two eyes matched?', {
      matched: 'A perfectly matched pair.',
      wandering: 'One eye wanders off outward on its own.',
      crossed: 'Slightly crossed, both turned in toward the nose.',
      heterochromia: 'Two different colours, one of them pale blue.',
    }),
    skin: choice('What is the skin tone?', SKIN_TONES),
    doing: choice('What are they doing right now?', {
      staring: 'Staring straight at you without a blink.',
      glancing: 'Glancing off to one side.',
      upward: 'Rolled up toward the ceiling, exasperated or praying.',
      blinking: 'Blinking slowly, again and again.',
      bruised: 'One of them is a swollen black eye, purple and nearly shut.',
    }),
    lashes: choice('What are the lashes like?', {
      sparse: 'Sparse and pale, barely there.',
      natural: 'Natural dark lashes.',
      heavy: 'Heavy with mascara, long and black.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = a.age === 'infant' ? 0.0135 : 0.013;
    const gap = a.age === 'infant' ? 0.027 : 0.031;
    const old = { infant: 0, young: 0.1, middle: 0.5, elderly: 1 }[a.age];
    const skinTone = new THREE.Color(SKIN_COLOUR[a.skin]);
    const skin = new THREE.MeshStandardMaterial({ color: skinTone, roughness: mix(0.55, 0.8, old) });
    const shade = new THREE.MeshStandardMaterial({ color: skinTone.clone().multiplyScalar(0.62), roughness: 0.8 });
    const face = new THREE.Group();

    // Lid angles for each look: [upper, lower, drop of the inner end, brow fold height].
    const look = {
      surprise: [-0.66, 0.56, 0, 1.75],
      suspicion: [-0.2, 0.27, 0.14, 1.25],
      sleepy: [-0.08, 0.46, -0.12, 1.45],
      furious: [-0.3, 0.3, 0.42, 1.0],
      kind: [-0.2, 0.12, -0.14, 1.5],
      pleading: [-0.44, 0.48, -0.36, 1.7],
    }[a.expression];
    const hood = old * 0.06;
    const smile = (mood.cheer - 0.5) * 0.1;

    const outline = new THREE.Shape();
    const wide = gap + r * 2.5, top = r * 2.5, bottom = -r * 1.9, round = r * 1.5;
    outline.moveTo(-wide + round, bottom);
    outline.quadraticCurveTo(0, bottom + r * 0.7, wide - round, bottom);
    outline.quadraticCurveTo(wide, bottom, wide, bottom + round);
    outline.lineTo(wide, top - round);
    outline.quadraticCurveTo(wide, top, wide - round, top);
    outline.quadraticCurveTo(0, top + r * 0.5, -wide + round, top);
    outline.quadraticCurveTo(-wide, top, -wide, top - round);
    outline.lineTo(-wide, bottom + round);
    outline.quadraticCurveTo(-wide, bottom, -wide + round, bottom);
    for (const side of [-1, 1]) outline.holes.push(almond(side * gap, 0, r * 1.2, r * 0.74, r * 0.6));
    face.add(skinPlate(outline, 0.004, skin));

    // Bridge of the nose between them.
    const bridge = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), skin);
    bridge.scale.set(r * 0.62, r * 1.7, r * 0.36);
    bridge.position.set(0, -r * 0.45, 0);
    bridge.castShadow = true;
    face.add(bridge);

    const lash = { sparse: { count: 12, length: 0.22, colour: '#8a705a' }, natural: { count: 22, length: 0.36, colour: '#2a1c14' }, heavy: { count: 30, length: 0.62, colour: '#0c0a0a' } }[a.lashes];
    const thin = a.age === 'elderly' ? 0.5 : a.age === 'infant' ? 0.7 : 1;
    const glance = a.doing === 'glancing' ? (random() < 0.5 ? -1 : 1) * 0.6 : 0;
    const lift = a.doing === 'upward' ? 0.75 : 0.28;
    const bruisedSide = a.doing === 'bruised' ? (random() < 0.5 ? -1 : 1) : 0;
    const driftSide = random() < 0.5 ? -1 : 1;
    const sockets = ([-1, 1] as const).map((side) => {
      const nose = (side === -1 ? 1 : -1) as 1 | -1;
      const colour = a.alignment === 'heterochromia' && side === driftSide ? '#a9d3ee' : IRIS_COLOUR[a.iris];
      const bruised = side === bruisedSide;
      const eye = makeEye({
        r,
        iris: colour,
        pupil: a.expression === 'surprise' ? 'pinpoint' : a.expression === 'pleading' || a.age === 'infant' ? 'blown' : 'normal',
        sclera: old > 0.8 ? '#ece2c8' : '#f5f1e9',
        veins: Math.min(1, 0.08 + old * 0.2 + mood.wear * 0.4 + (bruised ? 0.7 : 0) + (a.expression === 'sleepy' ? 0.25 : 0)),
        irisAngle: a.age === 'infant' ? 0.66 : 0.54,
        random,
      });
      let yaw = glance + (random() - 0.5) * 0.04;
      if (a.alignment === 'wandering' && side === driftSide) yaw += side * 0.55;
      if (a.alignment === 'crossed') yaw -= side * 0.34;
      eye.ball.rotation.set(-lift, yaw, 0, 'YXZ');
      const socket = makeSocket({
        r,
        skin,
        lid: bruised ? new THREE.MeshStandardMaterial({ color: '#5b2c5e', roughness: 0.5 }) : skin,
        eye,
        upper: bruised ? 0.3 : look[0] + hood,
        lower: bruised ? 0.36 : look[1] - smile,
        tilt: nose * look[2],
        lash: { count: Math.round(lash.count * thin), length: lash.length, colour: lash.colour, curl: a.lashes === 'heavy' ? 0.8 : 0.45, clump: a.lashes === 'heavy' ? 0.4 : 0 },
        lowerLash: a.lashes === 'sparse' ? undefined : { count: Math.round(lash.count * 0.5 * thin), length: lash.length * 0.4, colour: lash.colour, curl: 0.2 },
        rim: bruised ? '#7a2d3c' : undefined,
        nose,
        random,
      });
      socket.group.position.set(side * gap, 0, 0);
      face.add(socket.group);

      // The fold of brow skin above the eye carries half the expression.
      const fold = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), skin);
      fold.scale.set(r * 1.75, r * 0.46, r * (0.34 + old * 0.12));
      fold.position.set(side * (gap + r * 0.1), r * look[3] + (a.expression === 'furious' ? side * 0 : 0), r * 0.05);
      fold.rotation.z = nose * look[2] * 0.9;
      fold.castShadow = true;
      face.add(fold);
      if (a.expression === 'furious' || a.expression === 'suspicion') face.add(crease([[side * r * 0.35, r * 2.2, r * 0.06], [side * r * 0.28, r * 1.6, r * 0.2], [side * r * 0.4, r * 1.0, r * 0.06]], r * 0.07, shade));
      if (old > 0.4 || a.expression === 'sleepy' || mood.wear > 0.7) {
        // Bags under the eyes.
        face.add(crease([[side * (gap - r * 0.9), -r * 1.0, r * 0.05], [side * gap, -r * (1.35 + old * 0.2), r * 0.12], [side * (gap + r * 0.95), -r * 0.95, r * 0.05]], r * (0.05 + old * 0.04), shade));
        if (old > 0.8) face.add(crease([[side * (gap - r * 0.7), -r * 1.45, r * 0.03], [side * gap, -r * 1.8, r * 0.06], [side * (gap + r * 0.8), -r * 1.4, r * 0.03]], r * 0.045, shade));
      }
      if (old > 0.8 || a.expression === 'kind') {
        for (let line = 0; line < 3; line++) {
          const fan = (line - 1) * 0.5 + 0.1;
          face.add(crease([[side * (gap + r * 1.3), r * fan * 0.4, r * 0.03], [side * (gap + r * 1.75), r * fan * 1.1, r * 0.05], [side * (gap + r * 2.3), r * fan * 2.0, r * 0.02]], r * 0.045, shade));
        }
      }
      if (bruised) {
        const swell = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: '#4d2a55', roughness: 0.55 }));
        swell.scale.set(r * 1.7, r * 0.9, r * 0.5);
        swell.position.set(side * gap, -r * 1.05, 0);
        const stain = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: '#7d5a3a', roughness: 0.7 }));
        stain.scale.set(r * 2.1, r * 1.9, r * 0.12);
        stain.position.set(side * gap, -r * 0.2, 0);
        face.add(swell, stain);
      }
      return { socket, bruised, open: look[0] + hood, shut: look[1] - smile };
    });

    // A slim brass stand holds the strip up at a tilt, like a mounted specimen.
    const brass = s.material('#a8873f', { metalness: 0.8, roughness: 0.35 });
    const high = r * 4.2;
    face.position.y = high;
    face.rotation.x = -0.24;
    s.root.add(face);
    s.lathe([[0, 0], [r * 2.2, 0], [r * 2.2, r * 0.18], [r * 0.5, r * 0.4], [r * 0.2, r * 0.6], [0, r * 0.6]], brass, [0, 0, -r * 1.2]);
    s.rod([0, r * 0.4, -r * 1.2], [0, high + r * 0.6, -r * 0.6], r * 0.14, brass);

    const pace = mix(0.25, 1.1, mood.energy);
    const phase = random() * 5;
    return s.finish({
      update: (_dt, time) => {
        if (a.doing !== 'blinking') return;
        const beat = ((time * pace + phase) % 2.4) / 0.42;
        const closed = beat < 1 ? Math.sin(beat * Math.PI) : 0;
        for (const { socket, bruised, open, shut } of sockets) if (!bruised) socket.setUpper(mix(open, shut, closed));
      },
    });
  },
});
