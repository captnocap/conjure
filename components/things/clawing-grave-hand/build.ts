import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, score } from '@conjure/kit';
import { buildHand, clods, flexHand, grass, limb, mottled, mound, paint, put, shade, turfSlabs } from './grave';

export default defineThing({
  questions: {
    gesture: choice('What is the hand doing?', {
      clawing: 'Fingers hooked and spread, raking the air: pure menace.',
      reach: 'Open and straining upward, begging or grasping for help.',
      fist: 'A clenched fist punched through the turf in triumph or rage.',
      wave: 'A polite, slightly sheepish wave hello, tilting side to side.',
      rose: 'Holding up a single long-stemmed rose, romantic and wrong.',
      point: 'One accusing finger pointing straight up at the sky, or at you.',
    }),
    flesh: choice('What state is the flesh in?', {
      fresh: 'Freshly buried: pale, waxy and bluish, still whole.',
      rot: 'Green-grey rot, blotched and sagging.',
      bone: 'Mostly flesh but with bare bone showing through fingers and forearm.',
      skeleton: 'A clean full skeleton hand, every knuckle a knob of bone.',
    }),
    sleeve: choice('What is left of the sleeve?', {
      lace: 'A frilled lace cuff from a burial gown or wedding dress.',
      suit: 'A dark Sunday suit sleeve with a white shirt cuff and button.',
      bandage: 'Loose stained bandages wound around the forearm, one end trailing.',
      bare: 'Nothing: a bare forearm.',
      uniform: 'A soldier\'s sleeve with braid and brass buttons.',
    }),
    jewellery: choice('Is it wearing any jewellery?', {
      none: 'Nothing at all.',
      wedding: 'A plain gold wedding band, still shining.',
      signet: 'A heavy signet ring with a dark red stone.',
      rings: 'Rings on nearly every finger, a buried fortune.',
      watch: 'A wristwatch, stopped.',
      charm: 'A thin charm bracelet hanging loose at the wrist.',
    }),
    ground: choice('What ground is it breaking through?', {
      turf: 'Mown cemetery lawn, split into slabs of turf.',
      weeds: 'Long neglected grass and weeds.',
      bare: 'Bare freshly dug clay, no grass at all.',
      leaves: 'Thin grass under a litter of fallen autumn leaves.',
    }),
    spray: score('How much soil has been thrown about?', ['A neat small crack', 'A scattered heap', 'An eruption of flung clods']),
    emerged: score('How far out of the ground is it?', ['Fingers and palm only', 'To the wrist', 'Most of the forearm', 'Nearly to the elbow']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const dirt = mood.wear;

    // Flesh, bone and nail.
    const tones = { fresh: '#cdd5cb', rot: '#8ea06a', bone: '#a9ab8c', skeleton: '#e6dfc6' }[a.flesh];
    const skin = shade(shade(tones, mood.warmth > 0.5 ? '#d8c9a6' : '#b9c8d6', Math.abs(mood.warmth - 0.5) * 0.5), '#5b4a36', dirt * 0.3);
    const fleshMap = mottled(random, skin, a.flesh === 'fresh'
      ? [{ color: '#7d8fb0', count: 10, size: 0.02, alpha: 0.4, line: true }, { color: '#8f7f9a', count: 6, size: 0.06, alpha: 0.2 }, { color: '#4a3a2a', count: Math.round(10 + dirt * 40), size: 0.03, alpha: 0.5 }]
      : [{ color: '#4c5a34', count: 22, size: 0.07, alpha: 0.45 }, { color: '#2f2a22', count: 14, size: 0.035, alpha: 0.6 }, { color: '#c0b67a', count: 8, size: 0.03, alpha: 0.5 }, { color: '#4a3a2a', count: Math.round(dirt * 40), size: 0.03, alpha: 0.5 }]);
    const flesh = paint('#ffffff', { map: fleshMap, roughness: 0.7 });
    const bone = paint(shade('#ebe4cb', '#8d7a55', dirt * 0.45), { roughness: 0.6 });
    const nail = paint(a.flesh === 'fresh' ? '#8b8fa0' : '#3a3528', { roughness: 0.4 });

    const bare = a.flesh === 'bone' ? [random() < 0.4, true, random() < 0.5, true, random() < 0.6] : [false, false, false, false, false];
    const curls = {
      clawing: [0.45, 0.62, 0.7, 0.66, 0.55],
      reach: [0.1, 0.12, 0.05, 0.1, 0.18],
      fist: [0.9, 1.5, 1.55, 1.55, 1.5],
      wave: [0.05, 0.02, 0.0, 0.03, 0.08],
      rose: [0.75, 1.2, 1.25, 1.25, 1.2],
      point: [0.95, 0.02, 1.5, 1.55, 1.5],
    }[a.gesture].map((curl) => curl + (random() - 0.5) * 0.14);
    const spread = { clawing: 1, reach: 0.8, fist: 0.05, wave: 0.45, rose: 0.08, point: 0.1 }[a.gesture];
    const size = 1.4;
    const hand = buildHand({ curls, spread, flesh, bone, nail, bare, skeleton: a.flesh === 'skeleton', nailLength: a.gesture === 'clawing' ? 0.016 : 0.004, size, left: random() < 0.5 });

    // The arm leans a little, as if still pushing.
    const out = mix(0.08, 0.42, a.emerged);
    const lean = new THREE.Vector3((random() - 0.5) * 0.3, 1, (random() - 0.2) * 0.22).normalize();
    const arm = new THREE.Group();
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), lean);
    root.add(arm);
    const wrist = new THREE.Group();
    wrist.position.set(0, out, 0);
    wrist.rotation.x = { clawing: 0.35, reach: -0.1, fist: 0.05, wave: 0, rose: 0.1, point: 0 }[a.gesture];
    wrist.rotation.y = (random() - 0.5) * 0.6;
    arm.add(wrist);
    wrist.add(hand.group);

    const below = 0.12;
    if (a.flesh === 'skeleton') {
      limb(arm, [-0.012, -below, 0], [-0.016, out, 0], 0.011, 0.009, bone, 7);
      limb(arm, [0.014, -below, 0], [0.016, out, 0], 0.0085, 0.0105, bone, 7);
      put(arm, new THREE.SphereGeometry(0.014, 8, 6), bone, [-0.016, out, 0]);
      put(arm, new THREE.SphereGeometry(0.013, 8, 6), bone, [0.016, out, 0]);
    } else {
      limb(arm, [0, -below, 0], [0, out, 0], 0.046, 0.034, flesh, 14);
      put(arm, new THREE.SphereGeometry(0.031, 12, 8), flesh, [0, out, 0], [0, 0, 0], [1.25, 0.9, 0.85]);
      if (a.flesh === 'bone' && out > 0.12) {
        // A torn window in the forearm with the two bones inside.
        const y0 = out * 0.35, y1 = out * 0.8;
        limb(arm, [-0.012, y0, 0.026], [-0.012, y1, 0.02], 0.008, 0.007, bone, 6);
        limb(arm, [0.012, y0, 0.027], [0.012, y1, 0.021], 0.007, 0.007, bone, 6);
        put(arm, new THREE.SphereGeometry(1, 10, 8), paint('#3a231f'), [0, (y0 + y1) / 2, 0.02], [0, 0, 0], [0.03, (y1 - y0) * 0.55, 0.014]);
      }
    }

    // Sleeve.
    const cuffY = Math.max(out - 0.035, 0.0);
    const sleeveTop = cuffY;
    if (a.sleeve === 'suit' || a.sleeve === 'uniform') {
      const cloth = paint(shade(a.sleeve === 'suit' ? '#26262e' : '#4d5f3a', '#5a4a38', dirt * 0.4));
      if (sleeveTop > 0.03) limb(arm, [0, -below, 0], [0, sleeveTop, 0], 0.062, 0.05, cloth, 14);
      put(arm, new THREE.CylinderGeometry(0.044, 0.047, 0.03, 14), paint(shade('#eeeadc', '#8a7a5c', dirt * 0.5)), [0, sleeveTop + 0.012, 0]);
      const brass = paint('#c9a23a', { metalness: 0.8, roughness: 0.3 });
      const buttons = a.sleeve === 'uniform' ? 3 : 1;
      for (let i = 0; i < buttons; i++) put(arm, new THREE.SphereGeometry(0.008, 8, 6), a.sleeve === 'uniform' ? brass : paint('#15151a'), [0.05, sleeveTop - 0.012 - i * 0.022, 0.008]);
      if (a.sleeve === 'uniform' && sleeveTop > 0.06) put(arm, new THREE.TorusGeometry(0.056, 0.005, 6, 20), brass, [0, sleeveTop - 0.035, 0], [Math.PI / 2, 0, 0]);
      // A torn hem.
      for (let i = 0; i < 7; i++) {
        const t = i / 7 * Math.PI * 2;
        put(arm, new THREE.ConeGeometry(0.014, 0.03 + random() * 0.03, 4), cloth, [Math.cos(t) * 0.047, sleeveTop + 0.008, Math.sin(t) * 0.047], [0, random(), (random() - 0.5) * 0.5]);
      }
    } else if (a.sleeve === 'lace') {
      const lace = paint(shade('#f4efe2', '#8d7c5e', dirt * 0.45), { side: THREE.DoubleSide, roughness: 0.9 });
      if (sleeveTop > 0.03) limb(arm, [0, -below, 0], [0, sleeveTop, 0], 0.055, 0.04, lace, 14);
      for (let tier = 0; tier < 3; tier++) {
        const profile = [[0.036, 0], [0.05 + tier * 0.008, -0.004], [0.075 + tier * 0.012, 0.022], [0.082 + tier * 0.012, 0.03]].map(([x, y]) => new THREE.Vector2(x, y));
        const frill = new THREE.LatheGeometry(profile, 22);
        const pos = frill.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
          if (r > 0.06) pos.setY(i, pos.getY(i) + Math.sin(Math.atan2(z, x) * 9 + tier) * 0.008);
        }
        frill.computeVertexNormals();
        put(arm, frill, lace, [0, sleeveTop - tier * 0.022 + 0.005, 0], [tier === 0 ? Math.PI : 0, 0, 0]);
      }
    } else if (a.sleeve === 'bandage') {
      const linen = paint(shade('#d9cfae', '#7a6a4a', dirt * 0.5));
      const turns = Math.max(2, Math.round(out / 0.03));
      for (let i = 0; i < turns; i++) {
        const y = -0.02 + (out + 0.03) * (i / turns);
        put(arm, new THREE.TorusGeometry(0.036 + (1 - i / turns) * 0.008, 0.011, 6, 18), linen, [0, y, 0], [Math.PI / 2 + (random() - 0.5) * 0.35, (random() - 0.5) * 0.3, 0], [1, 1, 0.75]);
      }
      const tail = new THREE.CatmullRomCurve3([new THREE.Vector3(0.035, out * 0.7, 0.01), new THREE.Vector3(0.09, out * 0.55, 0.04), new THREE.Vector3(0.11, out * 0.25, 0.02), new THREE.Vector3(0.15, 0.02, 0.06)]);
      put(arm, new THREE.TubeGeometry(tail, 16, 0.009, 5), linen, [0, 0, 0], [0, 0, 0], [1, 1, 0.5]);
    }

    // Jewellery.
    const gold = paint('#e3b63c', { metalness: 0.9, roughness: 0.22, emissive: '#5a3c05', emissiveIntensity: 0.4 });
    const ringOn = (finger: number, material: THREE.Material, stone?: THREE.Material) => {
      const joint = hand.joints[finger][0];
      put(joint, new THREE.TorusGeometry(0.0125 * size, 0.0036 * size, 6, 14), material, [0, 0.018 * size, 0], [Math.PI / 2, 0, 0]);
      if (stone) put(joint, new THREE.OctahedronGeometry(0.008 * size), stone, [0, 0.018 * size, -0.014 * size]);
    };
    const ruby = paint('#a3122a', { roughness: 0.15, emissive: '#6a0818', emissiveIntensity: 0.6 });
    if (a.jewellery === 'wedding') ringOn(3, gold);
    if (a.jewellery === 'signet') ringOn(4, gold, ruby);
    if (a.jewellery === 'rings') {
      ringOn(1, gold, paint('#1f7a4a', { roughness: 0.2, emissive: '#0c4a2a', emissiveIntensity: 0.5 }));
      ringOn(2, paint('#d8dde0', { metalness: 0.9, roughness: 0.2 }));
      ringOn(3, gold, ruby);
      ringOn(4, gold);
    }
    if (a.jewellery === 'watch' && out > 0.05) {
      put(arm, new THREE.TorusGeometry(0.034, 0.008, 6, 18), paint('#3a2a1e'), [0, out - 0.02, 0], [Math.PI / 2, 0, 0], [1.15, 0.85, 1.6]);
      put(arm, new THREE.CylinderGeometry(0.02, 0.02, 0.008, 18), gold, [0, out - 0.02, -0.031], [Math.PI / 2, 0, 0]);
      put(arm, new THREE.CylinderGeometry(0.016, 0.016, 0.009, 18), paint('#f3eedd'), [0, out - 0.02, -0.032], [Math.PI / 2, 0, 0]);
    }
    if (a.jewellery === 'charm' && out > 0.05) {
      put(arm, new THREE.TorusGeometry(0.04, 0.0028, 5, 22), gold, [0, out - 0.03, 0], [Math.PI / 2 + 0.35, 0, 0.2]);
      for (let i = 0; i < 4; i++) put(arm, new THREE.OctahedronGeometry(0.007), gold, [Math.cos(i * 1.4 + 1) * 0.04, out - 0.045 - Math.abs(Math.sin(i * 1.4 + 1)) * 0.012, Math.sin(i * 1.4 + 1) * 0.04]);
    }

    // The rose, held in the curled fingers.
    if (a.gesture === 'rose') {
      const rose = new THREE.Group();
      rose.position.set(0, 0.075 * size, 0.03 * size);
      rose.rotation.set(-0.12, 0, (random() - 0.5) * 0.3);
      hand.group.add(rose);
      const stem = paint('#3d6a35');
      limb(rose, [0, -0.1, 0], [0, 0.2, 0], 0.004, 0.0035, stem, 6);
      const wilt = 1 - mood.cheer;
      const red = paint(shade(shade('#c8102e', '#f3e9e4', mood.cheer > 0.85 ? 0.8 : 0), '#3a1418', wilt * 0.55), { roughness: 0.55, emissive: '#5a0010', emissiveIntensity: 0.35 * mood.cheer });
      const head = new THREE.Group();
      head.position.set(0, 0.2, 0);
      head.rotation.x = wilt * 0.9;
      rose.add(head);
      put(head, new THREE.SphereGeometry(0.022, 10, 8), red, [0, 0.018, 0], [0, 0, 0], [1, 1.15, 1]);
      for (let i = 0; i < 7; i++) {
        const t = i * 2.4, r = 0.012 + i * 0.0028;
        put(head, new THREE.SphereGeometry(0.02, 8, 6, 0, Math.PI), red, [Math.cos(t) * r, 0.016 + i * 0.001, Math.sin(t) * r], [0.25, -t + Math.PI / 2, 0], [1, 1.1, 0.35]);
      }
      put(head, new THREE.ConeGeometry(0.014, 0.02, 6), stem, [0, -0.004, 0], [Math.PI, 0, 0]);
      for (const [y, side] of [[0.07, 1], [0.12, -1]] as const) put(rose, new THREE.SphereGeometry(1, 8, 6), stem, [side * 0.022, y, 0], [0, 0, side * -0.7], [0.022, 0.006, 0.012]);
      if (wilt > 0.5) for (let i = 0; i < 4; i++) put(root, new THREE.SphereGeometry(1, 6, 4), red, [(random() - 0.5) * 0.2, 0.06, 0.08 + random() * 0.1], [random(), random(), random()], [0.016, 0.003, 0.012]);
    }

    // The broken ground.
    const soilBase = shade('#5a4030', mood.warmth > 0.5 ? '#7a4a2c' : '#3f3a38', Math.abs(mood.warmth - 0.5) * 0.9);
    const soilA = `#${soilBase.getHexString()}`, soilB = `#${shade(soilBase, '#1c1512', 0.4).getHexString()}`, soilC = `#${shade(soilBase, '#a08060', 0.3).getHexString()}`;
    const soil = paint(soilBase, { roughness: 1, map: mottled(random, '#ffffff', [{ color: '#000000', count: 60, size: 0.03, alpha: 0.25 }, { color: '#ffffff', count: 20, size: 0.015, alpha: 0.3 }]) });
    const reach = mix(0.13, 0.2, a.spray);
    mound(root, random, reach, mix(0.04, 0.08, a.spray), reach * 0.9, soil, [0, 0, 0], 0.3);
    put(root, new THREE.CylinderGeometry(reach * 1.3, reach * 1.35, 0.03, 26), a.ground === 'bare' ? soil : paint(shade('#55733b', '#6f6a3c', dirt * 0.6)), [0, -0.016, 0]);
    put(root, new THREE.TorusGeometry(0.06, 0.03, 6, 14), paint(soilB, { roughness: 1 }), [lean.x * 0.08, mix(0.04, 0.07, a.spray), lean.z * 0.08], [Math.PI / 2, 0, 0]);
    clods(root, random, Math.round(mix(14, 90, a.spray) * mix(0.7, 1.3, mood.density)), 0.05, reach * mix(1.0, 1.3, a.spray), mix(0.011, 0.02, a.spray), [soilA, soilB, soilC]);
    const greens = mood.cheer > 0.5 ? ['#5f8f3c', '#7aa648', '#4c7a34'] : ['#566b3a', '#6d7343', '#4a5a36'];
    const outside = (x: number, z: number) => Math.hypot(x, z) > reach * 0.75;
    if (a.ground === 'turf') {
      turfSlabs(root, random, 5 + Math.round(a.spray * 4), reach * 0.86, 0.085, paint(soilB, { roughness: 1 }), paint(greens[0]), [0, 0.02, 0], 0.5 + a.spray * 0.5);
      grass(root, random, Math.round(mix(120, 320, mood.density)), reach * 1.3, 0.035, greens, outside);
    } else if (a.ground === 'weeds') {
      grass(root, random, Math.round(mix(160, 420, mood.density)), reach * 1.3, 0.13, [...greens, '#8a8a4a'], outside);
      for (let i = 0; i < 5; i++) {
        const t = random() * 6.28, d = reach * (0.9 + random() * 0.35);
        limb(root, [Math.cos(t) * d, 0, Math.sin(t) * d], [Math.cos(t) * d * 1.05, 0.2 + random() * 0.12, Math.sin(t) * d * 1.05], 0.004, 0.003, paint('#6a7a40'), 5);
        put(root, new THREE.SphereGeometry(0.016, 7, 5), paint(i % 2 ? '#e9e2b0' : '#b9a3c9'), [Math.cos(t) * d * 1.05, 0.33 - random() * 0.1, Math.sin(t) * d * 1.05]);
      }
    } else if (a.ground === 'leaves') {
      grass(root, random, Math.round(mix(60, 160, mood.density)), reach * 1.3, 0.04, greens, outside);
      const leafBits = [];
      const tints = ['#c9772a', '#a34a22', '#d6a43a', '#7a4a26', '#b8572c'];
      for (let i = 0; i < Math.round(mix(40, 110, mood.density)); i++) {
        const t = random() * 6.28, d = reach * (0.55 + random() * 0.72), s = 0.022 + random() * 0.02;
        leafBits.push({ p: [Math.cos(t) * d, 0.012 + random() * 0.05 * (d < reach ? 1 : 0.2), Math.sin(t) * d] as const, r: [(random() - 0.5) * 0.9, random() * 6, (random() - 0.5) * 0.9] as const, s: [s, s * 0.12, s * 0.7] as const, c: tints[Math.floor(random() * tints.length)] });
      }
      const leaves = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1), paint('#ffffff'), leafBits.length);
      const m = new THREE.Matrix4();
      leafBits.forEach((bit, i) => {
        m.compose(new THREE.Vector3(...bit.p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...bit.r)), new THREE.Vector3(...bit.s));
        leaves.setMatrixAt(i, m);
        leaves.setColorAt(i, new THREE.Color(bit.c));
      });
      leaves.castShadow = leaves.receiveShadow = true;
      root.add(leaves);
    } else {
      // Bare clay: spade-cut lumps and a few pale stones.
      for (let i = 0; i < 7; i++) {
        const t = random() * 6.28, d = reach * (0.8 + random() * 0.45);
        put(root, new THREE.DodecahedronGeometry(0.03 + random() * 0.03, 0), i % 3 ? soil : paint('#a9a69a', { flatShading: true }), [Math.cos(t) * d, 0.012, Math.sin(t) * d], [random() * 3, random() * 3, 0], [1, 0.6, 0.9]);
      }
    }

    const energy = mood.energy;
    const waving = a.gesture === 'wave';
    const baseZ = wrist.rotation.z;
    return {
      object: root,
      footprint: reach * 1.3,
      update(_dt, time) {
        flexHand(hand, time, (a.gesture === 'fist' || a.gesture === 'rose' ? 0.05 : 0.22) * (0.25 + energy), 1.2 + energy * 5);
        wrist.rotation.z = baseZ + (waving ? Math.sin(time * (2 + energy * 5)) * 0.45 : Math.sin(time * (1 + energy * 3)) * 0.05 * energy);
      },
      dispose: () => disposeTree(root),
    };
  },
});
// rescaled so the hand fills the frame
