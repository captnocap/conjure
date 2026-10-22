import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score, type BuildContext } from '@conjure/kit';

type V3 = readonly [number, number, number];
type Act = 'ears' | 'mouth' | 'eyes' | 'lap';
interface Paints { fur: THREE.Material; face: THREE.Material; dark: THREE.Material; white: THREE.Material }

/** One seated carved monkey, about one unit tall, rump on the origin, facing +z. */
function figure(context: BuildContext, paints: Paints, act: Act, peek: boolean, chipped: boolean, plump: number) {
  const g = new Sculpture(context);
  const { fur, face, dark, white } = paints;
  g.ball([0.3 * plump, 0.34, 0.27 * plump], [0, 0.34, 0], fur, 18);
  g.ball([0.19, 0.22, 0.1], [0, 0.34, 0.2 * plump], face, 12);
  g.ball([0.27, 0.26, 0.26], [0, 0.79, 0.03], fur, 20);
  g.ball([0.2, 0.19, 0.1], [0, 0.77, 0.21], face, 16);
  g.ball([0.125, 0.095, 0.1], [0, 0.69, 0.27], face, 14);
  g.tube([[-0.16, 0.86, 0.24], [0, 0.9, 0.3], [0.16, 0.86, 0.24]], 0.03, fur);
  for (const side of [-1, 1]) {
    if (!(chipped && side === -1)) g.ball([0.05, 0.095, 0.075], [side * 0.275, 0.8, 0.02], face, 10);
    g.ball([0.03, 0.034, 0.02], [side * 0.085, 0.8, 0.29], dark, 8);
    g.ball([0.135, 0.115, 0.2], [side * 0.2 * plump, 0.12, 0.17], fur, 12);
    g.ball([0.075, 0.055, 0.1], [side * 0.2 * plump, 0.06, 0.37], face, 10);
    const lifted = peek && side === 1;
    const poses: Record<Act, [V3, V3, V3]> = {
      ears: [[0.44, 0.5, 0.08], lifted ? [0.48, 0.88, 0.1] : [0.32, 0.8, 0.07], [0.06, 0.11, 0.1]],
      eyes: [[0.36, 0.5, 0.24], lifted ? [0.14, 0.71, 0.32] : [0.088, 0.8, 0.315], [0.09, 0.075, 0.05]],
      mouth: [[0.36, 0.44, 0.24], peek ? [0.08, 0.55, 0.36] : [0.06, 0.675, 0.375], [0.085, 0.07, 0.05]],
      lap: [[0.38, 0.36, 0.12], [0.06, 0.2, 0.31], [0.1, 0.07, 0.07]],
    };
    const [elbow, hand, size] = poses[act];
    const shoulder: V3 = [side * 0.26 * plump, 0.56, 0.05], e: V3 = [side * elbow[0], elbow[1], elbow[2]], h: V3 = [side * hand[0], hand[1], hand[2]];
    g.rod(shoulder, e, 0.085, fur, 0.07);
    g.ball([0.072, 0.072, 0.072], e, fur, 10);
    g.rod(e, h, 0.07, fur, 0.055);
    const palm = g.ball(size, h, face, 10);
    if (act === 'eyes' || act === 'mouth') palm.rotation.z = side * -0.35;
  }
  if (act === 'eyes' && peek) {
    // One round eye caught looking.
    g.ball([0.05, 0.055, 0.03], [0.085, 0.8, 0.29], white, 10);
    g.ball([0.026, 0.03, 0.02], [0.092, 0.8, 0.315], dark, 8);
  }
  if (act === 'mouth' && peek) {
    g.tube([[-0.09, 0.665, 0.335], [0, 0.635, 0.375], [0.09, 0.665, 0.335]], 0.022, white);
  } else if (act !== 'mouth') {
    g.tube([[-0.07, 0.655, 0.345], [0, 0.64, 0.372], [0.07, 0.655, 0.345]], 0.011, dark);
  }
  for (const side of [-1, 1]) g.ball([0.014, 0.012, 0.01], [side * 0.03, 0.71, 0.365], dark, 6);
  return g.root;
}

export default defineThing({
  questions: {
    medium: choice('What is it made of?', {
      wood: 'Painted wood in the shrine manner: brown monkeys with pale faces against green, gold and red.',
      brass: 'Solid cast brass, a desk paperweight polished by thumbs.',
      stone: 'Weathered grey stone furred with moss, a wayside koshin marker.',
      resin: 'Cheap glossy resin souvenir in loud colours on a red base with gold lettering.',
    }),
    completeness: choice('Is the set complete?', {
      three: 'All three: see, hear and speak no evil.',
      broken: 'One has been broken away, leaving a jagged stump and two feet.',
      four: 'Four: a rarer fourth monkey covers its lap, do no evil.',
    }),
    peek: choice('Is one of them cheating?', {
      none: 'No: all three hold the pose.',
      eyes: 'The one covering its eyes has dropped a hand and is peeking with one round eye.',
      ears: 'The one covering its ears has lifted a hand away to listen.',
      mouth: 'The one covering its mouth has let its hands slip from a grin.',
    }),
    arrangement: choice('How are they arranged?', {
      row: 'Side by side in a row.',
      totem: "Stacked in a column, each sitting on the head of the one below.",
      circle: 'Back to back in a ring, facing outward.',
    }),
    size: score('How big is the carving?', ['A pocket ornament', 'A mantelpiece figure', 'A garden statue', 'A lintel panel as wide as a doorway']),
    setting: choice('What is it mounted on or left with?', {
      plain: 'Just its own base.',
      beam: 'A red lacquered beam with gilt end caps, as if cut from the shrine.',
      souvenir: 'A gift-shop price tag on a string and a barcode sticker.',
      coins: 'A scatter of small coins left by people asking for discretion.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const unit = mix(0.055, 0.62, a.size ** 1.5);
    const wear = mood.wear;
    const tone = (hex: string, bare: string, amount: number) => new THREE.Color(hex).lerp(new THREE.Color(bare), amount);
    const g = new Sculpture(context);
    let paints: Paints;
    let baseMat: THREE.Material, bare: string;
    if (a.medium === 'wood') {
      bare = '#a78a62';
      paints = {
        fur: g.material(tone('#7a4526', bare, wear * 0.55), { roughness: 0.6 }), face: g.material(tone('#ecc999', bare, wear * 0.5), { roughness: 0.6 }),
        dark: g.material('#22150f'), white: g.material('#f6f1e2', { roughness: 0.4 }),
      };
      baseMat = g.material(tone('#b3261e', bare, wear * 0.6), { roughness: 0.45 });
    } else if (a.medium === 'brass') {
      bare = '#5f8f7a';
      const brass = g.material(tone('#c0922f', bare, wear * 0.3), { metalness: 0.9, roughness: 0.28 + wear * 0.3, emissive: '#3d2a05', emissiveIntensity: 0.4 });
      const deep = g.material(tone('#6b4d17', bare, wear * 0.3), { metalness: 0.8, roughness: 0.5 });
      paints = { fur: brass, face: brass, dark: deep, white: g.material('#e9c66b', { metalness: 0.9, roughness: 0.2 }) };
      baseMat = brass;
    } else if (a.medium === 'stone') {
      bare = '#77756c';
      const rock = g.material(tone('#96948a', '#6f7460', wear * 0.5), { roughness: 1 });
      paints = { fur: rock, face: g.material(tone('#a5a398', '#6f7460', wear * 0.4), { roughness: 1 }), dark: g.material('#4c4b45', { roughness: 1 }), white: g.material('#c9c7bc', { roughness: 1 }) };
      baseMat = rock;
    } else {
      bare = '#d8d2c4';
      const gloss = { roughness: 0.18, metalness: 0.05 };
      paints = {
        fur: g.material(tone(mood.cheer > 0.5 ? '#d9791c' : '#a8571a', bare, wear * 0.45), gloss), face: g.material(tone('#ffd7a3', bare, wear * 0.4), gloss),
        dark: g.material('#1a1210', gloss), white: g.material('#ffffff', gloss),
      };
      baseMat = g.material(tone('#cf1f2a', bare, wear * 0.45), gloss);
    }

    const acts: Act[] = ['ears', 'mouth', 'eyes'];
    if (a.completeness === 'four') acts.push('lap');
    const missing = a.completeness === 'broken' ? Math.floor(random() * 3) : -1;
    const n = acts.length;
    const plump = a.medium === 'resin' ? 1.12 : a.medium === 'stone' ? 1.08 : 1;
    const baseH = 0.14;
    const stump = (root: THREE.Group) => {
      const raw = new Sculpture(context);
      const rawMat = raw.material(bare, { roughness: 1 });
      raw.ball([0.27, 0.1, 0.24], [0, 0.07, 0], rawMat, 10);
      for (let i = 0; i < 6; i++) {
        const t = (i / 6) * Math.PI * 2 + random();
        const shard = raw.mesh(new THREE.ConeGeometry(0.07, 0.12 + random() * 0.16, 5), rawMat, [Math.cos(t) * 0.14, 0.17, Math.sin(t) * 0.12]);
        shard.rotation.set((random() - 0.5) * 0.6, random() * 3, (random() - 0.5) * 0.6);
      }
      for (const side of [-1, 1]) raw.ball([0.075, 0.055, 0.1], [side * 0.2, 0.06, 0.37], paints.face, 10);
      root.add(raw.root);
    };
    acts.forEach((act, i) => {
      const holder = new THREE.Group();
      const peek = a.peek === act;
      if (i === missing && a.arrangement !== 'totem') stump(holder);
      else if (i === missing) return;
      else holder.add(figure(context, paints, act, peek, wear > 0.7 && i === 0, plump));
      if (a.arrangement === 'row') holder.position.set((i - (n - 1) / 2) * 0.74, baseH, 0);
      else if (a.arrangement === 'totem') {
        const level = missing >= 0 && i > missing ? i - 1 : i;
        holder.position.set(0, baseH + level * 0.86, level * -0.02);
        holder.rotation.y = (random() - 0.5) * 0.2;
      } else {
        const t = (i / n) * Math.PI * 2 + 0.5;
        holder.position.set(Math.sin(t) * 0.36, baseH, Math.cos(t) * 0.36);
        holder.rotation.y = t;
      }
      g.root.add(holder);
    });
    if (a.arrangement === 'totem' && missing >= 0) {
      // The broken one lies where it fell.
      const fallen = new THREE.Group();
      stump(fallen);
      fallen.position.set(0.62, 0, 0.2);
      fallen.rotation.set(0, 0.6, 0);
      g.root.add(fallen);
    }

    // Base, and the shrine panel behind a wooden row.
    const width = a.arrangement === 'row' ? n * 0.74 + 0.16 : a.arrangement === 'circle' ? 1.2 : 1.0;
    const depth = a.arrangement === 'row' ? 0.72 : a.arrangement === 'totem' ? 0.8 : 1.2;
    const zc = a.arrangement === 'circle' ? 0 : 0.1;
    if (a.medium === 'stone') {
      const rock = g.mesh(new THREE.DodecahedronGeometry(0.5, 1), baseMat, [0, baseH * 0.4, zc]);
      rock.scale.set(width * 1.1, baseH * 1.5, depth * 1.15);
    } else if (a.arrangement === 'row') g.box([width, baseH, depth], [0, baseH / 2, zc], baseMat);
    else g.cylinder(width / 2, width / 2 + 0.04, baseH, [0, baseH / 2, zc], baseMat, 32);
    if (a.arrangement === 'row' && a.medium === 'wood') {
      const green = g.material(tone('#2f7355', bare, wear * 0.55), { roughness: 0.6 }), gold = g.material(tone('#d9aa3a', bare, wear * 0.5), { metalness: 0.6, roughness: 0.35, emissive: '#5a3d06', emissiveIntensity: 0.3 });
      g.box([width, 1.22, 0.07], [0, baseH + 0.61, -0.3], green);
      g.box([width + 0.1, 0.09, 0.14], [0, baseH + 1.26, -0.28], gold);
      for (const side of [-1, 1]) g.box([0.09, 1.3, 0.14], [side * (width / 2 + 0.005), baseH + 0.65, -0.28], gold);
      for (let i = 0; i < n + 1; i++) {
        const x = (i - n / 2) * 0.74 + (random() - 0.5) * 0.1, y = baseH + 0.98 + random() * 0.12;
        g.tube([[x - 0.16, y, -0.25], [x - 0.07, y + 0.07, -0.25], [x, y, -0.25], [x + 0.08, y + 0.06, -0.25], [x + 0.16, y, -0.25]], 0.028, g.material(tone('#f1ead6', bare, wear * 0.5)));
      }
    }
    if (a.medium === 'resin' && a.arrangement === 'row') {
      const label = g.label(n === 4 ? 'SEE · HEAR · SPEAK · DO NO EVIL' : 'SEE · HEAR · SPEAK NO EVIL', width * 0.9, baseH * 0.7, [0, baseH / 2, zc + depth / 2 + 0.004], '#ffd95a', '#b0151f');
      label.castShadow = false;
    }
    if (a.medium === 'stone') {
      const spots = [];
      const tops = Math.round(24 + wear * 110);
      for (let i = 0; i < tops; i++) spots.push({ at: [(random() - 0.5) * width, baseH * (0.8 + random() * 0.4), zc + (random() - 0.5) * depth] as V3, size: 0.03 + random() * 0.04, color: random() < 0.5 ? '#5d7a35' : '#7d9440' });
      if (a.arrangement === 'row') acts.forEach((_act, i) => {
        if (i === missing) return;
        for (let k = 0; k < 4 + Math.round(wear * 10); k++) {
          const t = random() * Math.PI * 2, r = random() * 0.2;
          spots.push({ at: [(i - (n - 1) / 2) * 0.74 + Math.cos(t) * r, baseH + 1.045 - r * r * 1.6, 0.03 + Math.sin(t) * r] as V3, size: 0.03 + random() * 0.03, color: random() < 0.5 ? '#5d7a35' : '#7d9440' });
        }
      });
      g.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), spots);
    }
    if (wear > 0.6 && a.medium !== 'stone') g.rod([-width * 0.2, baseH + 0.004, zc + depth / 2 - 0.02], [width * 0.05, baseH + 0.004, zc - depth * 0.2], 0.012, paints.dark);

    let lift = 0;
    if (a.setting === 'beam') {
      const red = g.material(tone('#a81f1a', '#7a5a45', wear * 0.5), { roughness: 0.4 }), gilt = g.material('#d9aa3a', { metalness: 0.7, roughness: 0.3, emissive: '#5a3d06', emissiveIntensity: 0.3 });
      const beam = 0.3, long = width + 0.9;
      g.box([long, beam, depth * 0.8], [0, -beam / 2, zc], red);
      for (const side of [-1, 1]) {
        g.box([0.1, beam + 0.04, depth * 0.8 + 0.04], [side * long / 2, -beam / 2, zc], gilt);
        g.box([0.3, 0.5, depth * 0.6], [side * (long / 2 - 0.35), -beam - 0.25, zc], red);
      }
      lift = beam + 0.5;
    } else if (a.setting === 'souvenir') {
      const paper = g.material('#f5f0df');
      const tag = g.box([0.26, 0.004, 0.36], [width / 2 + 0.28, 0.004, zc + 0.2], paper);
      tag.rotation.y = 0.5;
      g.tube([[width / 2 - 0.1, baseH + 0.5, 0.1], [width / 2 + 0.1, 0.2, 0.16], [width / 2 + 0.24, 0.012, zc + 0.1]], 0.008, g.material('#c9302a'));
      g.box([0.16, 0.005, 0.03], [width / 2 + 0.28, 0.008, zc + 0.26], g.material('#c9302a')).rotation.y = 0.5;
      const sticker = g.label('|||||| ||| ||', 0.3, 0.14, [-width * 0.25, baseH * 0.5, zc + depth / 2 + 0.006], '#111111', '#ffffff');
      sticker.castShadow = false;
    } else if (a.setting === 'coins') {
      const coins = [];
      for (let i = 0; i < 8 + Math.round(mood.density * 26); i++) coins.push({ at: [(random() - 0.5) * (width + 0.5), 0.006, zc + depth / 2 + 0.08 + random() * 0.5] as V3, size: 0.045 + random() * 0.02, color: random() < 0.3 ? '#c9c9c9' : '#c99a3a' });
      const disc = new THREE.CylinderGeometry(1, 1, 0.25, 12);
      g.scatter(disc, new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.8, roughness: 0.35 }), coins);
    }
    g.root.position.y = lift;
    g.root.scale.setScalar(unit);
    s.root.add(g.root);
    return s.finish();
  },
});
