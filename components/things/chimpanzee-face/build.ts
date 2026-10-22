import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { blob, bust, eye, fur, jaw } from './ape';

export default defineThing({
  questions: {
    expression: choice('What is the face doing?', {
      stare: 'A flat, level stare with the mouth shut: unreadable, patient, a little bored.',
      hoot: 'A pant-hoot: lips pushed out into a round trumpet, calling across the forest.',
      grin: 'A fear grin: lips pulled right back off clenched teeth, eyes wide. Looks like a smile, means dread.',
      pout: 'A pout: the lower lip pushed far out, begging or sulking.',
      play: 'A play face: mouth loosely open, jaw dropped, eyes soft, about to be tickled.',
    }),
    age: choice('How old is it?', {
      infant: 'A pink-faced infant with huge eyes and ears, sparse dark fuzz, a tiny muzzle.',
      adult: 'A dark-faced adult in its prime with a full black coat.',
      elder: 'A grey-chinned elder, balding on the forehead, face freckled and deeply lined.',
    }),
    gaze: choice('Where is it looking?', {
      viewer: 'Straight at whoever is looking at it.',
      aside: 'Off to one side, as if something else is more interesting.',
      up: 'Upward, into the canopy or at a raised hand.',
      down: 'Down and away, avoiding eye contact.',
    }),
    holds: choice('What does it hold to its mouth?', {
      nothing: 'Nothing; the hands are out of sight.',
      twig: 'A stripped twig used as a tool, the tip between its lips.',
      fruit: 'A bright piece of fruit with a bite out of it.',
      fingers: 'Its own fingers, sucked or chewed in thought.',
    }),
    scars: choice('What marks has life left on it?', {
      none: 'None, a clean unmarked face.',
      ear: 'One ear torn, the top half ragged and missing.',
      scar: 'Pale scars slashed across brow and cheek.',
      both: 'A torn ear and old scars both: a veteran of many fights.',
    }),
    bristling: noul('Is its hair standing on end, puffed up in alarm or display?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const infant = a.age === 'infant', elder = a.age === 'elder';
    const K = infant ? 0.78 : 1; // overall head size
    const coat = new THREE.Color(elder ? '#2a2725' : '#171413').lerp(new THREE.Color('#4a4037'), mood.wear * 0.4);
    const faceTone = infant ? '#e2a98e' : elder ? '#3d2f29' : '#2e2420';
    const muzzleTone = infant ? '#f0c3aa' : elder ? '#6b5346' : '#5a4336';
    const face = s.material(faceTone, { roughness: 0.7 });
    const muzzle = s.material(muzzleTone, { roughness: 0.65 });
    const dark = s.material(infant ? '#b97f6a' : '#1d1716', { roughness: 0.75 });
    const under = s.material(coat, { roughness: 0.95 });
    const gum = s.material(infant ? '#e58f8f' : '#b25a5e', { roughness: 0.45 });
    const tooth = s.material(elder ? '#d6c592' : '#f3ecd6', { roughness: 0.35 });
    const tongue = s.material('#d9727c', { roughness: 0.5 });

    // Shoulders and neck.
    const shoulderW = infant ? 0.13 : 0.2;
    s.root.add(bust(s, [shoulderW, infant ? 0.13 : 0.2, infant ? 0.1 : 0.14], under));
    const headY = infant ? 0.25 : 0.39;
    blob(s, [0.08 * K, 0.11, 0.08 * K], [0, headY - 0.13, -0.01], under);
    const bristle = a.bristling ? 1.3 : 1;
    const furLen = (infant ? 0.022 : 0.034) * bristle * mix(1, 0.8, mood.wear);
    const droop = a.bristling ? 0.18 : mix(0.5, 0.66, mood.wear);
    fur(s, {
      at: [0, 0, 0], radii: [shoulderW, infant ? 0.13 : 0.2, infant ? 0.1 : 0.14], count: infant ? 380 : 800, length: furLen * 1.2, color: coat, droop,
      mess: 0.2 + mood.wear * 0.5, keep: (d) => d.y > 0.02,
    });

    const head = new THREE.Group();
    head.position.set(0, headY, 0.03);
    s.root.add(head);
    const gaze = { viewer: [0, 0], aside: [random() < 0.5 ? -0.6 : 0.6, 0], up: [0.1, 0.5], down: [-0.25, -0.5] }[a.gaze] as [number, number];
    head.rotation.set(-0.3 - gaze[1] * 0.3, gaze[0] * 0.55, (random() - 0.5) * 0.12);
    head.scale.setScalar(infant ? 1.12 : 1.22);

    // Skull under the coat, then the bare face plate.
    blob(s, [0.098 * K, 0.106 * K, 0.112 * K], [0, 0.03 * K, -0.012], under, [0, 0, 0], head);
    fur(s, {
      parent: head, at: [0, 0.03 * K, -0.012], radii: [0.098 * K, 0.106 * K, 0.112 * K], count: infant ? 420 : 800, length: furLen, color: coat, droop,
      mess: 0.25 + mood.wear * 0.5,
      keep: (d) => (d.z < 0.3 || d.y > (elder ? 2 : 0.62)) && !(elder && d.y > 0.45 && d.z > -0.35) && !(infant && random() < 0.35),
      colorAt: (d) => (elder && d.y < -0.1 ? '#8f8a84' : undefined),
    });
    blob(s, [0.079 * K, 0.083 * K, 0.05 * K], [0, 0.004, 0.068 * K], face, [0, 0, 0], head);
    if (elder) blob(s, [0.07, 0.05, 0.05], [0, 0.085, 0.03], s.material('#4d3a31', { roughness: 0.6 }), [0, 0, 0], head);

    // Ears: the chimp's signature.
    const earScale = infant ? 1.25 : 1;
    const torn = a.scars === 'ear' || a.scars === 'both';
    const tornSide = random() < 0.5 ? -1 : 1;
    for (const side of [-1, 1]) {
      const cut = torn && side === tornSide;
      const ear = new THREE.Group();
      ear.position.set(side * 0.1 * K, 0.022 * K, -0.004);
      ear.rotation.set(0, side * 0.75, side * -0.12);
      head.add(ear);
      const h = 0.05 * K * earScale;
      blob(s, [0.037 * K * earScale, cut ? h * 0.58 : h, 0.009], [side * 0.022, cut ? -h * 0.4 : 0, 0], face, [0, 0, 0], ear, 18);
      blob(s, [0.022 * K * earScale, cut ? h * 0.36 : h * 0.62, 0.006], [side * 0.022, cut ? -h * 0.4 : 0, 0.007], dark, [0, 0, 0], ear, 14);
      if (cut) for (let i = 0; i < 3; i++) blob(s, [0.008, 0.012 + random() * 0.01, 0.006], [side * (0.004 + i * 0.018), h * 0.12, 0], s.material('#7a4a44'), [0, 0, (random() - 0.5) * 0.8], ear, 8);
    }

    // Brow ridge and eyes.
    const E = {
      stare: { gape: 0, lid: 0.22, brow: -0.004, bared: false },
      hoot: { gape: 0.3, lid: 0.2, brow: 0.004, bared: false },
      grin: { gape: 0.1, lid: 0, brow: 0.008, bared: true },
      pout: { gape: 0, lid: 0.25, brow: 0.006, bared: false },
      play: { gape: 0.62, lid: 0.42, brow: 0.002, bared: false },
    }[a.expression];
    const eyeR = (infant ? 0.019 : 0.016);
    for (const side of [-1, 1]) {
      blob(s, [0.03 * K, 0.026 * K, 0.02], [side * 0.036 * K, 0.02 * K, 0.092 * K], dark, [0, 0, 0], head, 16);
      eye(s, { parent: head, at: [side * 0.036 * K, 0.02 * K, 0.1 * K], r: eyeR, iris: infant ? '#5a3a22' : '#a5672a', gaze, lid: Math.max(0, E.lid - mood.energy * 0.1 + (1 - mood.cheer) * 0.06) * (infant ? 0.5 : 1), lidMat: dark });
      if (!infant) blob(s, [0.045, 0.019, 0.03], [side * 0.036, 0.047 + E.brow, 0.094], dark, [0.25, 0, side * -0.1], head, 16);
    }
    if (!infant) blob(s, [0.05, 0.016, 0.026], [0, 0.046 + E.brow, 0.1], dark, [0.25, 0, 0], head, 16);

    // Muzzle on a hinged jaw, nose on top.
    const mL = (infant ? 0.092 : 0.142), mW = (infant ? 0.092 : 0.138);
    const hingeY = infant ? -0.04 : -0.052;
    const hoot = a.expression === 'hoot';
    const j = jaw(s, {
      parent: head, hinge: [0, hingeY, 0.03], length: mL * (hoot ? 1.08 : 1), width: mW * (hoot ? 0.86 : a.expression === 'grin' ? 1.08 : 1), slope: 0.14,
      upperHeight: infant ? 0.036 : 0.052, lowerHeight: infant ? 0.03 : 0.045, gape: E.gape, lift: 0.1,
      upper: muzzle, lower: muzzle, gum, tooth, lip: dark, lipRadius: infant ? 0.003 : 0.0045,
      canine: infant ? 0.006 : elder ? 0.014 : 0.02, lowerCanine: infant ? 0.005 : 0.014, incisor: infant ? 0.006 : 0.012,
      teeth: infant && !E.bared ? 'none' : elder && mood.wear > 0.6 ? 'stumps' : 'whole', bared: E.bared, tongue,
    });
    const noseZ = 0.03 + mL * 0.74, noseY = hingeY + (infant ? 0.03 : 0.04);
    blob(s, [0.024 * K, 0.03 * K, 0.014], [0, noseY + 0.022, noseZ - 0.018], face, [0.5, 0, 0], head, 14);
    for (const side of [-1, 1]) blob(s, [0.0075 * K, 0.006 * K, 0.006], [side * 0.012 * K, noseY, noseZ + 0.004], s.material('#0d0909'), [0.4, side * 0.4, 0], head, 10);
    if (hoot) {
      const lips = s.mesh(new THREE.TorusGeometry(0.026, 0.011, 10, 28), dark);
      lips.position.set(0, -0.012, j.tip.z * 1.0);
      const hole = blob(s, [0.021, 0.021, 0.008], [0, -0.012, j.tip.z + 0.004], s.material('#1c0708'), [0, 0, 0], undefined, 14);
      j.frame.add(lips, hole);
    }
    if (a.expression === 'pout') {
      blob(s, [0.036 * K, 0.014 * K, 0.026 * K], [0, -0.012, j.tip.z * 0.98], muzzle, [0.25, 0, 0], j.lower, 16);
      blob(s, [0.026 * K, 0.008 * K, 0.014 * K], [0, -0.004, j.tip.z * 1.1], gum, [0.3, 0, 0], j.lower, 14);
    }
    if (elder) fur(s, { parent: j.lower, at: [0, -0.012, mL * 0.55], radii: [mW * 0.42, 0.04, mL * 0.42], count: 150, length: 0.03 * bristle, color: '#b9b4ab', droop: 0.55, keep: (d) => d.y < -0.25 });
    else if (!infant) fur(s, { parent: j.lower, at: [0, -0.012, mL * 0.5], radii: [mW * 0.42, 0.04, mL * 0.4], count: 60, length: 0.018, color: '#d9d2c4', droop: 0.6, keep: (d) => d.y < -0.5 });

    // Scars and freckles.
    if (a.scars === 'scar' || a.scars === 'both') {
      const pale = s.material('#c9a79a', { roughness: 0.5 });
      const side = random() < 0.5 ? -1 : 1;
      const cuts: [number, number, number, number, number, number][] = [
        [side * 0.012, 0.075, 0.106, side * 0.05, 0.04, 0.112],
        [side * 0.05, 0.0, 0.112, side * 0.07, -0.04, 0.09],
        [-side * 0.02, -0.01, 0.125, -side * 0.045, -0.03, 0.118],
      ];
      for (const c of cuts) head.add(s.rod([c[0] * K, c[1] * K, c[2] * K], [c[3] * K, c[4] * K, c[5] * K], 0.0032, pale));
    }
    if (elder) {
      const spots = Array.from({ length: 22 }, () => {
        const x = (random() - 0.5) * 0.12, y = -0.04 + random() * 0.09;
        return { at: [x, y, 0.068 + 0.05 * Math.sqrt(Math.max(0, 1 - (x / 0.079) ** 2 - ((y - 0.004) / 0.083) ** 2))] as [number, number, number], size: 0.003 + random() * 0.003 };
      });
      head.add(s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#17100e'), spots));
    }

    // A forearm and hand bringing something to the mouth.
    if (a.holds !== 'nothing') {
      s.root.updateMatrixWorld(true);
      const mouth = j.lower.localToWorld(new THREE.Vector3(0, 0, mL));
      const side = random() < 0.5 ? -1 : 1;
      const hand = new THREE.Vector3(mouth.x + side * 0.05 * K, mouth.y - 0.045 * K, mouth.z + 0.035);
      const armR = infant ? 0.022 : 0.036;
      s.tube([[side * shoulderW * 0.8, 0.0, 0.08], [side * (shoulderW * 0.9), 0.06, 0.2 * K + 0.04], [hand.x + side * 0.03, hand.y - 0.06, hand.z + 0.02], [hand.x, hand.y, hand.z]], armR, under);
      fur(s, { at: [side * shoulderW * 0.85, 0.05, 0.16 * K + 0.03], radii: [armR * 1.5, 0.075, 0.1 * K], count: 110, length: furLen * 0.8, color: coat, droop: 0.5 });
      blob(s, [0.03 * K, 0.034 * K, 0.022 * K], [hand.x, hand.y, hand.z], dark);
      const curl = a.holds === 'fingers' ? 1 : 0.55;
      for (let f = 0; f < 4; f++) {
        const fx = hand.x - side * (0.02 - f * 0.014) * K, fy = hand.y + 0.03 * K;
        s.tube([[fx, fy - 0.01, hand.z], [fx - side * 0.006 * curl, fy + 0.03 * K, hand.z + 0.006], [mix(fx, mouth.x, 0.55 * curl), mix(fy + 0.045 * K, mouth.y, curl), mix(hand.z - 0.012, mouth.z - 0.004, curl)]], 0.0075 * K, dark);
      }
      if (a.holds === 'twig') {
        const twig = s.material('#b89a62', { roughness: 0.8 });
        s.rod([mouth.x, mouth.y, mouth.z - 0.006], [hand.x + side * 0.16, hand.y - 0.1, hand.z + 0.12], 0.0042, twig, 0.006);
        s.rod([hand.x + side * 0.09, hand.y - 0.055, hand.z + 0.07], [hand.x + side * 0.13, hand.y - 0.03, hand.z + 0.11], 0.003, twig);
      }
      if (a.holds === 'fruit') {
        const colour = ['#f08a1c', '#e23b2e', '#f2c21d', '#8fbf2f'][Math.floor(random() * 4)];
        const fr = 0.036 * (infant ? 0.85 : 1);
        const at: [number, number, number] = [mix(hand.x, mouth.x, 0.6), mouth.y - 0.012, mouth.z + fr * 0.8];
        blob(s, [fr, fr * 0.95, fr], at, s.material(colour, { roughness: 0.45 }), [0, 0, 0], undefined, 18);
        blob(s, [fr * 0.45, fr * 0.4, fr * 0.3], [at[0] + side * fr * 0.45, at[1] + fr * 0.5, at[2] + fr * 0.5], s.material('#fff1c9', { roughness: 0.6 }), [0, 0, 0], undefined, 10);
        s.rod([at[0], at[1] + fr * 0.9, at[2]], [at[0] + 0.006, at[1] + fr * 1.3, at[2]], 0.003, s.material('#4d3a22'));
      }
    }

    let t0 = random() * 10;
    const speed = mix(0.4, 2.2, mood.energy);
    const rest = head.rotation.clone();
    return s.finish({
      update: (dt) => {
        t0 += dt * speed;
        head.rotation.y = rest.y + Math.sin(t0 * 0.7) * 0.04;
        if (hoot || a.expression === 'play') j.lower.rotation.x = E.gape * 0.9 * (1 + Math.sin(t0 * 3) * 0.12 * mood.energy);
      },
    });
  },
});
