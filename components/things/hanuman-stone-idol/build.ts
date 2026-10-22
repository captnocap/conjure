import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { limb, monkeyHead, sittingBody, type V3 } from './primate';

export default defineThing({
  questions: {
    pose: choice('What pose is the god carved in?', {
      mace: 'Standing guard with his great mace on his shoulder and one palm raised in blessing.',
      kneeling: 'Kneeling on one knee with palms pressed together, the devoted servant.',
      mountain: 'Striding with a whole herb-covered mountain held aloft on one palm.',
      chest: 'Tearing his own chest open with both hands to show the tiny gold couple inside.',
    }),
    coating: choice('What covers the stone?', {
      bare: 'Bare grey weathered stone, every chisel mark showing, lichen in the hollows.',
      sindoor: 'A fresh even coat of bright orange sindoor, glossy with oil.',
      thick: 'Decades of vermilion so thick the features have blurred into a soft orange lump with glued-on staring eyes and squares of silver foil.',
    }),
    offerings: choice('What has been left at his feet?', {
      nothing: 'Nothing: a swept, bare ledge.',
      lamp: 'Clay oil lamps burning, with a few incense sticks.',
      bananas: 'A hand of bananas and a few loose ones.',
      coins: 'A scatter of small coins on the ledge.',
      coconut: 'Broken coconut halves, white inside, and husk fibre.',
      everything: 'A festival heap: lamps, fruit, coconuts, coins and flowers all at once.',
    }),
    visitor: noul('Is a living monkey sitting on top of the idol or its shrine?'),
    niche: choice('What kind of niche holds him?', {
      arch: 'A weathered stone arch on two stubby pillars.',
      cement: 'A little painted cement temple with a stepped spire and a saffron flag.',
      tiled: 'A white bathroom-tile box with an iron grille gate, pure roadside pragmatism.',
      roots: 'No building at all: the slab leans in the grip of banyan roots tied with red thread.',
    }),
    garland: choice('Is he garlanded?', {
      none: 'No garland.',
      marigold: 'A fat orange and yellow marigold garland round his neck.',
      dried: 'A brown dried-out garland from some week past.',
      red: 'A red hibiscus garland and a red cloth sash.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const thick = a.coating === 'thick', bare = a.coating === 'bare';
    const tone = bare ? '#8f8d84' : thick ? '#e8501a' : '#f26a1b';
    const body = s.material(tone, { roughness: bare ? 0.95 : thick ? 0.6 : 0.4, emissive: bare ? '#000000' : '#7a1c00', emissiveIntensity: bare ? 0 : 0.18 });
    const deep = s.material(bare ? '#6f6d66' : '#b83a10', { roughness: 0.8 });
    const stone = s.material('#9a968a', { roughness: 0.95 });
    const gold = s.material('#e0b040', { metalness: 0.8, roughness: 0.3, emissive: '#7a5200', emissiveIntensity: 0.3 });
    const foil = s.material('#e8edf0', { metalness: 0.95, roughness: 0.15 });

    // The figure, in high relief against its slab.
    const f = new Sculpture(context);
    const kneel = a.pose === 'kneeling';
    const dy = kneel ? -0.1 : 0;
    const fat = thick ? 1.22 : 1;
    f.box([0.42, 0.62 + dy, 0.06], [0, (0.62 + dy) / 2, -0.11], body);
    const crest = f.cylinder(0.21, 0.21, 0.06, [0, 0.62 + dy, -0.11], body, 28);
    crest.rotation.x = Math.PI / 2;
    const sh = 0.47 + dy, hipY = 0.27 + dy, headY = 0.6 + dy, torsoY = 0.39 + dy;
    if (kneel) {
      limb(f, [[-0.05, hipY, 0], [-0.07, 0.045, 0.11], [-0.07, 0.035, -0.04]], 0.055 * fat, 0.04 * fat, body);
      limb(f, [[0.05, hipY, 0], [0.085, 0.21, 0.13], [0.085, 0.03, 0.12]], 0.055 * fat, 0.04 * fat, body);
      f.ball([0.04, 0.025, 0.06], [0.085, 0.025, 0.16], body, 10);
    } else {
      const stride = a.pose === 'mountain' ? 0.06 : 0;
      for (const side of [-1, 1]) {
        limb(f, [[side * 0.055, hipY, 0], [side * 0.065, 0.14, 0.03 + side * stride], [side * 0.065, 0.03, 0.02 + side * stride]], 0.058 * fat, 0.042 * fat, body);
        f.ball([0.042, 0.025, 0.065], [side * 0.065, 0.025, 0.06 + side * stride], body, 10);
        if (!thick) f.ring(0.045, 0.008, [side * 0.065, 0.06, 0.02 + side * stride], deep).rotation.x = Math.PI / 2;
      }
    }
    f.lathe([[0.075, 0], [0.105 * fat, 0.02], [0.1 * fat, 0.08], [0.085, 0.1]], body, [0, hipY - 0.04, 0]);
    f.ball([0.105 * fat, 0.125, 0.085 * fat], [0, torsoY, 0], body, 18);
    for (const side of [-1, 1]) f.ball([0.055 * fat, 0.045, 0.04], [side * 0.05, torsoY + 0.045, 0.06], body, 12);
    if (!thick) f.ring(0.085, 0.009, [0, hipY + 0.045, 0.005], deep).rotation.x = Math.PI / 2;

    // Head: muzzle, puffed cheeks, tiered crown.
    f.ball([0.075 * fat, 0.078, 0.072 * fat], [0, headY, 0.01], body, 18);
    f.ball([0.05 * fat, 0.04, 0.05], [0, headY - 0.03, 0.065], body, 14);
    for (const side of [-1, 1]) {
      f.ball([0.03, 0.03, 0.025], [side * 0.05, headY - 0.025, 0.045], body, 10);
      f.ball([0.014, 0.03, 0.022], [side * 0.078 * fat, headY, 0.0], body, 8);
      if (!thick) f.ball([0.012, 0.012, 0.012], [side * 0.08, headY - 0.04, 0.005], gold, 8);
      if (thick) {
        f.ball([0.026, 0.026, 0.012], [side * 0.034, headY + 0.018, 0.078], f.material('#f7f4ea', { roughness: 0.2 }), 12);
        f.ball([0.012, 0.012, 0.008], [side * 0.034, headY + 0.018, 0.088], f.material('#0c0c0c', { roughness: 0.2 }), 10);
      } else {
        f.ball([0.016, 0.01, 0.008], [side * 0.032, headY + 0.018, 0.074], deep, 8);
        f.rod([side * 0.012, headY + 0.036, 0.078], [side * 0.055, headY + 0.042, 0.062], 0.006, body);
      }
    }
    if (!thick) f.rod([-0.03, headY - 0.045, 0.108], [0.03, headY - 0.045, 0.108], 0.004, deep);
    f.lathe(thick ? [[0.07, 0], [0.06, 0.05], [0.03, 0.1], [0, 0.12]] : [[0.078, 0], [0.08, 0.02], [0.062, 0.03], [0.064, 0.05], [0.045, 0.06], [0.046, 0.08], [0.022, 0.095], [0.026, 0.11], [0, 0.135]], bare || thick ? body : gold, [0, headY + 0.055, 0]);

    // Tail, arching up behind the shoulder and over the crown.
    f.tube([[0.03, hipY, -0.06], [0.2, hipY + 0.06, -0.06], [0.24, sh + 0.1, -0.06], [0.16, headY + 0.2, -0.06], [0.03, headY + 0.22, -0.06], [0.0, headY + 0.17, -0.06]], 0.022 * fat, body);
    f.ball([0.032, 0.032, 0.03], [0.0, headY + 0.17, -0.06], body, 10);

    const mace = (hand: V3, tipAt: V3) => {
      f.rod(hand, tipAt, 0.014 * fat, body);
      f.ball([0.06 * fat, 0.065 * fat, 0.06 * fat], tipAt, body, 16);
      if (!thick) {
        const band = f.ring(0.058, 0.008, tipAt, deep);
        band.rotation.x = Math.PI / 2;
        f.ball([0.018, 0.03, 0.018], [tipAt[0] + (tipAt[0] - hand[0]) * 0.22, tipAt[1] + (tipAt[1] - hand[1]) * 0.22, tipAt[2]], body, 8);
      }
    };
    const arm = (side: number, hand: V3) => {
      const shoulder: V3 = [side * 0.125 * fat, sh, 0.01];
      const elbow: V3 = [(shoulder[0] + hand[0]) / 2 + side * 0.06, (shoulder[1] + hand[1]) / 2 - 0.05, (shoulder[2] + hand[2]) / 2 - 0.01];
      limb(f, [shoulder, elbow, hand], 0.042 * fat, 0.032 * fat, body);
      f.ball([0.034 * fat, 0.034, 0.03], hand, body, 10);
      if (!thick) f.ring(0.036, 0.007, elbow, deep).rotation.x = Math.PI / 2;
    };
    if (a.pose === 'mace') {
      arm(1, [0.17, sh - 0.07, 0.09]);
      mace([0.17, sh - 0.09, 0.09], [0.2, sh + 0.2, 0.03]);
      arm(-1, [-0.19, sh + 0.03, 0.09]);
      f.box([0.05, 0.065, 0.014], [-0.19, sh + 0.06, 0.1], body);
    } else if (kneel) {
      arm(1, [0.02, sh - 0.07, 0.12]);
      arm(-1, [-0.02, sh - 0.07, 0.12]);
      f.box([0.035, 0.08, 0.035], [0, sh - 0.04, 0.125], body).rotation.x = -0.3;
      mace([-0.17, 0.04, 0.2], [0.1, 0.06, 0.24]);
    } else if (a.pose === 'mountain') {
      arm(-1, [-0.2, headY + 0.1, 0.02]);
      const peak = f.mesh(new THREE.DodecahedronGeometry(0.1, 0), body, [-0.2, headY + 0.2, 0.02]);
      peak.scale.set(1.25, 0.8, 0.9);
      peak.rotation.set(0.3, random() * 3, 0.2);
      f.mesh(new THREE.ConeGeometry(0.06, 0.09, 6), body, [-0.22, headY + 0.3, 0.02]);
      const herb = f.material(bare ? '#5f7d4a' : '#3f8a3a', { roughness: 0.9 });
      for (let i = 0; i < 6; i++) f.mesh(new THREE.ConeGeometry(0.014, 0.04, 5), bare || thick ? body : herb, [-0.2 + (random() - 0.5) * 0.2, headY + 0.28 + random() * 0.03, 0.02 + (random() - 0.5) * 0.1]);
      arm(1, [0.17, hipY + 0.02, 0.07]);
      mace([0.17, hipY + 0.04, 0.07], [0.22, 0.07, 0.1]);
    } else {
      arm(1, [0.06, torsoY + 0.05, 0.095]);
      arm(-1, [-0.06, torsoY + 0.05, 0.095]);
      f.box([0.085, 0.1, 0.02], [0, torsoY + 0.04, 0.08], f.material('#3a0d06'));
      f.box([0.07, 0.085, 0.01], [0, torsoY + 0.04, 0.09], gold);
      for (const side of [-1, 1]) {
        f.ball([0.012, 0.022, 0.008], [side * 0.016, torsoY + 0.03, 0.098], f.material(side < 0 ? '#2b5fc0' : '#d6336c', { emissive: side < 0 ? '#2b5fc0' : '#d6336c', emissiveIntensity: 0.4 }), 8);
        f.ball([0.01, 0.01, 0.008], [side * 0.016, torsoY + 0.06, 0.098], f.material('#f0d2a8'), 8);
      }
    }
    if (thick) {
      // Paste built up in lumps, and foil pressed on wherever it would stick.
      for (let i = 0; i < 26; i++) f.ball([0.03 + random() * 0.03, 0.025 + random() * 0.03, 0.02], [(random() - 0.5) * 0.36, 0.04 + random() * (0.72 + dy), -0.085 + random() * 0.02], body, 8);
      for (let i = 0; i < 9 + Math.round(mood.cheer * 8); i++) {
        const leaf = f.box([0.03, 0.03, 0.003], [(random() - 0.5) * 0.24, 0.08 + random() * (0.5 + dy), 0.075 + random() * 0.03], foil);
        leaf.rotation.set(random() - 0.5, random() - 0.5, random() * 3);
      }
    } else if (bare) {
      for (let i = 0; i < 4 + Math.round(mood.wear * 12); i++) f.ball([0.03, 0.03, 0.006], [(random() - 0.5) * 0.36, random() * (0.7 + dy), -0.078], f.material(random() < 0.5 ? '#7d8a5a' : '#b9b48c', { roughness: 1 }), 8);
    } else {
      // The tilak and a fresh dab on the brow.
      f.box([0.012, 0.035, 0.006], [0, headY + 0.04, 0.078], f.material('#c4161c', { emissive: '#7a0000', emissiveIntensity: 0.3 }));
    }

    if (a.garland !== 'none') {
      const colours = { marigold: ['#f28a12', '#ffc72e'], dried: ['#7a5a36', '#8f7146'], red: ['#c4161c', '#e23b4e'] }[a.garland];
      const beads = 22;
      for (let i = 0; i < beads; i++) {
        const t = (i / (beads - 1)) * Math.PI;
        const drop = a.garland === 'dried' ? 0.2 : 0.16;
        f.ball([0.02, 0.02, 0.02], [Math.cos(t) * 0.1, sh + 0.035 - Math.sin(t) * drop, 0.045 + Math.sin(t) * 0.06], f.material(colours[i % 2], { roughness: 0.9, emissive: colours[i % 2], emissiveIntensity: a.garland === 'dried' ? 0 : 0.2 }), 8);
      }
      if (a.garland === 'red') f.box([0.2, 0.04, 0.012], [0, hipY + 0.07, 0.085], f.material('#c4161c')).rotation.z = 0.25;
    }
    f.root.rotation.x = a.niche === 'roots' ? -0.12 : 0;

    // Base and niche.
    const baseH = 0.16;
    f.root.position.set(0, baseH, -0.02);
    s.root.add(f.root);
    let perchY = baseH + headY + 0.19, perchZ = -0.02;
    if (a.niche === 'arch') {
      s.box([0.86, baseH, 0.6], [0, baseH / 2, 0.04], stone);
      s.box([0.96, 0.05, 0.7], [0, 0.025, 0.04], stone);
      for (const side of [-1, 1]) {
        s.lathe([[0.075, 0], [0.075, 0.05], [0.055, 0.08], [0.055, 0.5], [0.075, 0.54], [0.075, 0.6]], stone, [side * 0.33, baseH, -0.02]);
      }
      const arch = s.ring(0.33, 0.07, [0, baseH + 0.6, -0.02], stone, Math.PI);
      arch.scale.z = 1.5;
      s.box([0.12, 0.12, 0.2], [0, baseH + 0.96, -0.02], stone).rotation.z = Math.PI / 4;
    } else if (a.niche === 'cement') {
      const paint = ['#e76f9a', '#3aa0d8', '#f2c230', '#58b56b'];
      const pick = Math.floor(random() * 4);
      const wall = s.material(paint[pick]), trim = s.material(paint[(pick + 1) % 4]), cap = s.material(paint[(pick + 2) % 4]);
      s.box([0.9, baseH, 0.66], [0, baseH / 2, 0.04], wall);
      s.box([0.98, 0.04, 0.74], [0, 0.02, 0.04], trim);
      s.box([0.74, 0.92, 0.05], [0, baseH + 0.46, -0.24], wall);
      for (const side of [-1, 1]) s.box([0.07, 0.92, 0.42], [side * 0.335, baseH + 0.46, -0.03], wall);
      for (const side of [-1, 1]) s.cylinder(0.035, 0.035, 0.92, [side * 0.335, baseH + 0.46, 0.2], trim, 12);
      s.box([0.86, 0.06, 0.6], [0, baseH + 0.95, -0.02], trim);
      for (let i = 0; i < 4; i++) s.box([0.62 - i * 0.14, 0.09, 0.44 - i * 0.09], [0, baseH + 1.02 + i * 0.09, -0.04], i % 2 ? cap : wall);
      s.lathe([[0, 0], [0.05, 0.01], [0.06, 0.05], [0.03, 0.08], [0.012, 0.1], [0.02, 0.13], [0, 0.17]], gold, [0, baseH + 1.34, -0.04]);
      s.rod([0.24, baseH + 0.98, -0.2], [0.24, baseH + 1.75, -0.2], 0.008, stone);
      const flag = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.26, 0.07), new THREE.Vector2(0, 0.16)]);
      s.mesh(new THREE.ShapeGeometry(flag), new THREE.MeshStandardMaterial({ color: '#f47a12', side: THREE.DoubleSide, emissive: '#a34000', emissiveIntensity: 0.3 }), [0.245, baseH + 1.58, -0.2]);
      perchY = baseH + 0.98; perchZ = 0.18;
    } else if (a.niche === 'tiled') {
      const tile = s.material('#eef1f0', { roughness: 0.25 }), grout = s.material('#9aa3a5'), iron = s.material('#2c2f33', { metalness: 0.6, roughness: 0.5 });
      s.box([0.9, baseH, 0.66], [0, baseH / 2, 0.04], tile);
      s.box([0.8, 0.94, 0.05], [0, baseH + 0.47, -0.24], tile);
      for (const side of [-1, 1]) s.box([0.05, 0.94, 0.5], [side * 0.375, baseH + 0.47, 0.01], tile);
      s.box([0.9, 0.06, 0.62], [0, baseH + 0.97, 0.02], s.material('#b9bdbb'));
      for (let i = 1; i < 7; i++) s.box([0.905, 0.006, 0.006], [0, i * 0.155, 0.262], grout);
      for (let i = 0; i < 6; i++) for (const side of [-1, 1]) s.box([0.006, baseH + 0.94, 0.006], [side * 0.402, (baseH + 0.94) / 2, -0.2 + i * 0.09], grout);
      for (let i = -4; i <= 4; i++) s.box([0.006, baseH, 0.006], [i * 0.1, baseH / 2, 0.372], grout);
      // The gate: one leaf shut, one swung open.
      const gate = new Sculpture(context);
      for (let i = 0; i < 5; i++) gate.rod([0.02 + i * 0.075, 0, 0], [0.02 + i * 0.075, 0.9, 0], 0.007, iron);
      for (const y of [0.02, 0.45, 0.88]) gate.rod([0, y, 0], [0.34, y, 0], 0.008, iron);
      gate.root.position.set(-0.35, baseH + 0.02, 0.26);
      gate.root.rotation.y = -mix(0.2, 1.9, random());
      s.root.add(gate.root);
      perchY = baseH + 1.0; perchZ = 0.2;
    } else {
      s.box([0.8, baseH, 0.6], [0, baseH / 2, 0.04], stone).rotation.y = 0.05;
      const bark = s.material('#7b6a55', { roughness: 1 });
      s.cylinder(0.3, 0.42, 1.5, [0.08, 0.75, -0.48], bark, 14);
      for (let i = 0; i < 8; i++) {
        const side = i % 2 ? 1 : -1, reach = 0.28 + random() * 0.2;
        s.tube([[side * 0.1 + 0.08, 1.35 - i * 0.05, -0.3], [side * reach, 0.9 - random() * 0.3, -0.14 + random() * 0.1], [side * (reach + 0.08), 0.35, 0.0 + random() * 0.2], [side * (reach + 0.16 + random() * 0.1), -0.02, 0.15 + random() * 0.25]], 0.02 + random() * 0.025, bark);
      }
      const thread = s.material('#c4161c', { emissive: '#7a0000', emissiveIntensity: 0.25 });
      for (let i = 0; i < 3; i++) s.ring(0.34 - i * 0.012, 0.007, [0.08, 0.95 + i * 0.07, -0.48], thread).rotation.set(Math.PI / 2 + (random() - 0.5) * 0.15, 0, 0);
    }

    // Offerings on the front ledge.
    const many = a.offerings === 'everything';
    const plenty = mix(0.4, 1, mood.density);
    const ledge = (x: number, z = 0.22): V3 => [x, baseH, z];
    const flames: THREE.Mesh[] = [];
    if (a.offerings === 'lamp' || many) {
      const clay = s.material('#a85c36');
      const count = many ? 2 : 1 + Math.round(plenty * 4);
      for (let i = 0; i < count; i++) {
        const [x, y, z] = ledge(many ? -0.3 + i * 0.6 : (i - (count - 1) / 2) * 0.13, 0.25 + (i % 2) * 0.05);
        s.lathe([[0, 0], [0.025, 0], [0.04, 0.02], [0.036, 0.024], [0, 0.012]], clay, [x, y, z]);
        const flame = s.mesh(new THREE.ConeGeometry(0.012, 0.045, 8), new THREE.MeshStandardMaterial({ color: '#ffd76a', emissive: '#ffb020', emissiveIntensity: 2.2 }), [x + 0.02, y + 0.045, z]);
        flames.push(flame);
      }
      const ash = s.material('#5a4a3c');
      for (let i = 0; i < 3; i++) {
        const x = 0.27 + i * 0.02;
        s.rod([x, baseH, 0.05], [x + (i - 1) * 0.02, baseH + 0.24, 0.07], 0.003, ash);
        s.ball([0.006, 0.006, 0.006], [x + (i - 1) * 0.02, baseH + 0.24, 0.07], s.material('#ff5a1e', { emissive: '#ff3a00', emissiveIntensity: 2 }), 6);
      }
    }
    if (a.offerings === 'bananas' || many) {
      const yellow = s.material('#f2cf3a', { roughness: 0.6 });
      const count = many ? 4 : 4 + Math.round(plenty * 5);
      for (let i = 0; i < count; i++) {
        const banana = s.ring(0.07, 0.016, [many ? -0.14 : -0.08, baseH + 0.02 + (i % 3) * 0.004, 0.2], yellow, 1.7);
        banana.rotation.set(Math.PI / 2 - 0.2, 0, 0.5 + i * 0.23);
        banana.scale.z = 1.2;
      }
      if (!many) for (let i = 0; i < 2; i++) s.ring(0.07, 0.015, [0.2 + i * 0.05, baseH + 0.015, 0.24 - i * 0.07], yellow, 1.6).rotation.set(Math.PI / 2, 0, random() * 6);
    }
    if (a.offerings === 'coins' || many) {
      const count = many ? 8 : 8 + Math.round(plenty * 22);
      for (let i = 0; i < count; i++) {
        const coin = s.cylinder(0.014, 0.014, 0.003, [(random() - 0.5) * 0.7, baseH + 0.003 + (random() < 0.2 ? 0.004 : 0), 0.14 + random() * 0.18], random() < 0.6 ? foil : gold, 12);
        coin.rotation.x = (random() - 0.5) * 0.3;
      }
    }
    if (a.offerings === 'coconut' || many) {
      const husk = s.material('#6a4a2c', { roughness: 1 }), meat = s.material('#f6f1e4', { roughness: 0.6 });
      const count = many ? 2 : 2 + Math.round(plenty * 3);
      for (let i = 0; i < count; i++) {
        const x = many ? 0.1 + i * 0.13 : (i - (count - 1) / 2) * 0.15, z = 0.2 + (i % 2) * 0.07;
        const half = new THREE.Group();
        const shell = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), husk);
        const inside = new THREE.Mesh(new THREE.CircleGeometry(0.048, 16), meat);
        inside.rotation.x = -Math.PI / 2;
        inside.position.y = 0.001;
        shell.castShadow = true;
        half.add(shell, inside);
        half.position.set(x, baseH + 0.055, z);
        half.rotation.set((random() - 0.5) * 0.7, random() * 6, (random() - 0.5) * 0.7 + (i % 3 === 2 ? Math.PI : 0));
        s.root.add(half);
      }
    }
    if (many) {
      for (let i = 0; i < 14; i++) s.ball([0.018, 0.012, 0.018], [(random() - 0.5) * 0.75, baseH + 0.01, 0.12 + random() * 0.2], s.material(i % 2 ? '#f28a12' : '#ffc72e', { emissive: '#a34a00', emissiveIntensity: 0.2 }), 8);
    }

    if (a.visitor) {
      const m = new Sculpture(context);
      const H = 0.2, fur = '#8a7250', tip = '#c2a878';
      const seat = sittingBody(m, { height: H, girth: 0.95, fur, tip, belly: tip, skin: '#dd8a7a', hunch: 0.8, ragged: 0.3 });
      const head = monkeyHead(context, { skin: '#dd8a7a', fur, tip, iris: '#c9821b', ear: 1.1, muzzle: 0.9, brow: 0.5, eyeOpen: 0.8, mouth: 'closed', cheek: mood.density * 0.6, furLength: 0.3, furCount: 180 });
      head.scale.setScalar(0.07);
      head.position.set(0, seat.neck[1] + 0.04, seat.neck[2] + 0.025);
      head.rotation.set(0.25, (random() - 0.5) * 1.2, 0);
      m.root.add(head);
      m.tube([[0, 0.02, -0.06], [0.02, -0.02, -0.1], [0.04, -0.12, -0.09], [0.05, -0.22, -0.08]], 0.011, m.material(fur));
      m.root.position.set(a.niche === 'cement' ? -0.22 : 0, perchY, perchZ);
      m.root.rotation.y = (random() - 0.5) * 0.6;
      s.root.add(m.root);
    }

    const flicker = mix(3, 14, mood.energy);
    return s.finish({
      update: (_dt, time) => flames.forEach((flame, i) => {
        flame.scale.y = 1 + Math.sin(time * flicker + i * 2.3) * 0.25;
        flame.rotation.z = Math.sin(time * flicker * 0.6 + i) * 0.2;
      }),
    });
  },
});
