import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    fire: choice('What state is the fire in?', {
      blazing: 'Fresh fuel has caught: tongues of flame stand up from the coals.',
      glowing: 'A steady bed of orange coals, no flame, giving off heat.',
      embers: 'Mostly grey ash with a few red eyes still winking in it.',
      cold: 'Dead: a heap of pale ash and black charcoal ends.',
      empty: 'Scraped clean, a bare blackened dish.',
    }),
    feet: choice('What are the legs like?', {
      lion: 'Curving cabriole legs ending in broad lion paws.',
      goat: 'Slender straight legs ending in small cloven hooves, a satyr mask at each knee.',
      folding: 'Thin crossed rods that fold like a camp stool, with plain pad feet.',
      claw: 'Bowed legs ending in bird talons gripping a ball.',
    }),
    dish: choice('What shape is the fire dish?', {
      shallow: 'A wide shallow pan, coals heaped proud of the rim.',
      cauldron: 'A deep round-bellied cauldron with ring handles.',
      basket: 'An openwork basket of bronze bars, the fire showing through.',
      tray: 'A flat rimmed tray with a crenellated edge like a tiny fortress wall.',
    }),
    metal: choice('What is it made of?', {
      bronze: 'Warm polished bronze, golden brown.',
      verdigris: 'Bronze gone green and blue with age.',
      iron: 'Black wrought iron, rough and smith-made.',
      gilt: 'Gilded and bright, temple treasure.',
    }),
    purpose: choice('What is it being used for?', {
      warmth: 'Only to heat the room; nothing else is on or near it.',
      incense: 'An offering: resin lumps smoulder on the coals and a small incense box sits by one foot.',
      cooking: 'A soot-black pot is set over the fire.',
      tending: 'Someone is feeding it: iron tongs hang on the rim and a basket of charcoal stands beside it.',
      vigil: 'A wreath of leaves hangs from one leg, left during a night watch.',
      toppled: 'It has been knocked over and lies on its side, coals spilled across the floor.',
    }),
    smoke: noul('Is smoke rising from it?'),
    height: score('How tall does it stand?', ['A low floor brazier at shin height', 'Waist high', 'A tall altar stand at chest height']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const metalColour = new THREE.Color({ bronze: '#b47a36', verdigris: '#5c9a84', iron: '#3b3835', gilt: '#e0b445' }[a.metal]);
    if (a.metal === 'bronze' || a.metal === 'gilt') metalColour.lerp(new THREE.Color('#4f8f78'), wear * 0.55);
    if (a.metal === 'iron') metalColour.lerp(new THREE.Color('#7a4526'), wear * 0.6);
    const metal = new THREE.MeshStandardMaterial({ color: metalColour, metalness: a.metal === 'iron' ? 0.4 : 0.75, roughness: mix(a.metal === 'gilt' ? 0.22 : 0.38, 0.8, wear), side: THREE.DoubleSide });
    const soot = new THREE.MeshStandardMaterial({ color: '#211d1b', roughness: 1, side: THREE.DoubleSide });
    const ashMat = new THREE.MeshStandardMaterial({ color: '#bdb7ad', roughness: 1 });
    const heat = { blazing: 1, glowing: 0.8, embers: 0.3, cold: 0, empty: 0 }[a.fire];
    const hot = new THREE.Color().setHSL(mix(0.015, 0.07, mood.warmth), 1, 0.5, THREE.SRGBColorSpace);
    const coalHot = new THREE.MeshStandardMaterial({ color: hot, emissive: hot, emissiveIntensity: mix(0.3, 0.5, mood.warmth) * (0.5 + heat * 0.5), roughness: 0.9 });
    const coalDark = new THREE.MeshStandardMaterial({ color: '#1c1a19', roughness: 1 });

    const H = mix(0.42, 1.25, a.height);
    const Rb = mix(0.24, 0.36, 0.5 + (random() - 0.5) * 0.6) * (a.dish === 'shallow' || a.dish === 'tray' ? 1.15 : 1);
    const depth = { shallow: 0.07, cauldron: 0.24, basket: 0.2, tray: 0.06 }[a.dish];
    const rig = new THREE.Group(); // everything that tips over together
    s.root.add(rig);
    const g = new Sculpture(context);
    rig.add(g.root);
    const polar = (angle: number, r: number, y: number): P3 => [Math.sin(angle) * r, y, Math.cos(angle) * r];
    const bottom = H - depth;

    // Dish.
    if (a.dish === 'shallow') g.lathe([[0.001, bottom], [Rb * 0.55, bottom + 0.005], [Rb * 0.95, H - 0.015], [Rb * 1.06, H], [Rb * 1.06, H + 0.012], [Rb * 0.93, H - 0.005], [Rb * 0.5, bottom + 0.018], [0.001, bottom + 0.015]], metal);
    else if (a.dish === 'cauldron') {
      g.lathe([[0.001, bottom], [Rb * 0.6, bottom + 0.03], [Rb * 1.02, bottom + depth * 0.5], [Rb * 0.92, H - 0.03], [Rb * 1.0, H], [Rb * 0.9, H], [Rb * 0.86, H - 0.03], [Rb * 0.95, bottom + depth * 0.5], [Rb * 0.55, bottom + 0.045], [0.001, bottom + 0.02]], metal);
      for (const side of [-1, 1]) {
        const handle = g.ring(0.05, 0.009, [side * (Rb * 1.0 + 0.012), H - 0.09, 0], metal);
        handle.rotation.y = Math.PI / 2; handle.rotation.x = 0;
        g.ball([0.02, 0.02, 0.02], [side * (Rb * 0.98), H - 0.045, 0], metal, 8);
      }
    } else if (a.dish === 'basket') {
      g.cylinder(Rb * 0.7, Rb * 0.7, 0.012, [0, bottom, 0], metal, 24);
      const bars = 18;
      for (let i = 0; i < bars; i++) { const an = i / bars * Math.PI * 2; g.rod(polar(an, Rb * 0.7, bottom), polar(an, Rb, H), 0.008, metal); }
      for (const t of [0.45, 1]) g.ring(Rb * mix(0.7, 1, t), 0.011, [0, bottom + depth * t, 0], metal).rotation.x = Math.PI / 2;
    } else {
      g.cylinder(Rb, Rb * 0.96, 0.025, [0, bottom + 0.012, 0], metal, 32);
      const merlons = 20;
      for (let i = 0; i < merlons; i++) { const an = i / merlons * Math.PI * 2; const m = g.box([Rb * 0.2, depth + (i % 2 ? 0.03 : 0), 0.014], polar(an, Rb * 0.98, bottom + 0.025 + (depth + (i % 2 ? 0.03 : 0)) / 2), metal); m.rotation.y = an; }
    }
    // A sooty lining so the inside reads dark.
    const [lineR, lineY] = a.dish === 'cauldron' ? [Rb * 0.84, H - 0.05] : a.dish === 'basket' ? [Rb * 0.85, bottom + depth * 0.45] : [Rb * 0.88, H - depth * 0.45];
    const lining = g.cylinder(lineR, lineR * 0.8, 0.01, [0, lineY, 0], soot, 24);
    lining.castShadow = false;

    // Legs.
    const lean = (random() - 0.5) * 0.25;
    for (let i = 0; i < 3; i++) {
      const an = i / 3 * Math.PI * 2 + Math.PI / 3 + lean;
      const top = a.dish === 'cauldron' ? bottom + depth * 0.45 : bottom + 0.01;
      const topR = a.dish === 'basket' ? Rb * 0.78 : Rb * 0.92;
      if (a.feet === 'lion' || a.feet === 'claw') {
        const bow = a.feet === 'claw' ? 1.25 : 1.12;
        g.tube([polar(an, topR, top), polar(an, Rb * bow, mix(0, top, 0.72)), polar(an, Rb * 0.62, top * 0.3), polar(an, Rb * 0.72, 0.1), polar(an, Rb * 0.98, 0.045)], 0.017 + H * 0.006, metal);
        g.ball([0.03, 0.04, 0.03], polar(an, Rb * bow * 0.97, top * 0.74), metal, 10);
        if (a.feet === 'lion') {
          g.ball([0.05, 0.036, 0.06], polar(an, Rb * 1.02, 0.036), metal, 12).rotation.y = an;
          for (const t of [-1, 0, 1]) g.ball([0.017, 0.02, 0.026], polar(an + t * 0.045 / Rb, Rb * 1.02 + 0.05, 0.02), metal, 8).rotation.y = an;
        } else {
          g.ball([0.036, 0.036, 0.036], polar(an, Rb * 1.0, 0.036), s.material('#d9d2c2', { roughness: 0.4 }), 12);
          for (const t of [-1, 0, 1]) g.rod(polar(an + t * 0.03 / Rb, Rb * 0.98, 0.085), polar(an + t * 0.045 / Rb, Rb * 1.0 + 0.036, 0.012), 0.009, metal, 0.003);
        }
      } else if (a.feet === 'goat') {
        g.rod(polar(an, topR, top), polar(an, Rb * 1.12, 0.05), 0.014, metal, 0.02);
        g.cylinder(0.014, 0.026, 0.05, polar(an, Rb * 1.13, 0.025), soot, 8);
        const knee = polar(an, mix(topR, Rb * 1.12, 0.3) + 0.012, mix(top, 0.05, 0.3));
        g.ball([0.036, 0.046, 0.03], knee, metal, 10).rotation.y = an;
        for (const side of [-1, 1]) g.rod([knee[0] + Math.cos(an) * side * 0.022, knee[1] + 0.03, knee[2] - Math.sin(an) * side * 0.022], [knee[0] + Math.cos(an) * side * 0.05, knee[1] + 0.085, knee[2] - Math.sin(an) * side * 0.05], 0.009, metal, 0.002);
      } else {
        const next = an + Math.PI * 2 / 3;
        g.rod(polar(an, topR, top), polar(next, Rb * 1.05, 0.02), 0.011, metal);
        g.rod(polar(next, topR, top), polar(an, Rb * 1.05, 0.02), 0.011, metal);
        g.cylinder(0.03, 0.036, 0.02, polar(an, Rb * 1.05, 0.01), metal, 10);
      }
    }
    if (a.feet !== 'folding') {
      const y = bottom * 0.36;
      const r = a.feet === 'goat' ? Rb * 1.0 : Rb * 0.62;
      g.ring(r, 0.008, [0, y, 0], metal).rotation.x = Math.PI / 2;
      if (H > 0.7) { g.cylinder(r * 0.5, r * 0.5, 0.008, [0, y, 0], metal, 20); for (let i = 0; i < 3; i++) { const an = i / 3 * Math.PI * 2 + Math.PI / 3 + lean; g.rod(polar(an, r, y), [0, y, 0], 0.006, metal); } }
    }

    // Fuel, ash and fire.
    const flames: THREE.Mesh[] = [];
    const heapR = lineR * 0.92, heapY = lineY;
    const upright = a.purpose !== 'toppled';
    if (a.fire !== 'empty' && upright) {
      const mound = g.ball([heapR, 0.035 + mood.density * 0.03, heapR], [0, heapY, 0], heat > 0.5 ? coalDark : ashMat, 16);
      mound.castShadow = false;
      const n = Math.round(mix(22, 60, mood.density));
      const hotBits: { at: P3; size: number }[] = [], darkBits: { at: P3; size: number }[] = [], ashBits: { at: P3; size: number }[] = [];
      for (let i = 0; i < n; i++) {
        const r = Math.sqrt(random()) * heapR * 0.92, an = random() * Math.PI * 2;
        const at = polar(an, r, heapY + (0.03 + mood.density * 0.03) * (1 - (r / heapR) ** 2) + random() * 0.012);
        const bit = { at, size: 0.016 + random() * 0.02 };
        const roll = random();
        if (roll < heat * 0.85) hotBits.push(bit); else if (a.fire === 'cold' || a.fire === 'embers' ? roll < 0.75 : false) ashBits.push(bit); else darkBits.push(bit);
      }
      const lump = new THREE.DodecahedronGeometry(1, 0);
      if (hotBits.length) g.scatter(lump, coalHot, hotBits).castShadow = false;
      if (darkBits.length) g.scatter(lump.clone(), coalDark, darkBits);
      if (ashBits.length) g.scatter(lump.clone(), ashMat, ashBits);
    }
    if (a.fire === 'blazing' && upright) {
      const count = 5 + Math.floor(random() * 4);
      for (let i = 0; i < count; i++) {
        const outer = i > 1;
        const tint = new THREE.Color().setHSL(outer ? mix(0.03, 0.07, mood.warmth) : 0.13, 1, outer ? 0.52 : 0.6, THREE.SRGBColorSpace);
        const fl = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 7, 3), new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.3, roughness: 1 }));
        const r = outer ? heapR * (0.25 + random() * 0.5) : heapR * 0.15 * i, an = random() * Math.PI * 2;
        const h = (outer ? 0.14 : 0.24) + random() * 0.12;
        fl.userData = { h, w: 0.035 + random() * 0.03, phase: random() * 6, y: heapY + 0.04 };
        fl.position.set(Math.sin(an) * r, heapY + 0.04 + h / 2, Math.cos(an) * r);
        fl.scale.set(fl.userData.w, h, fl.userData.w);
        g.root.add(fl);
        flames.push(fl);
      }
    }

    // What it is for.
    const extras = new Sculpture(context); // stays upright on the floor
    s.root.add(extras.root);
    if (a.purpose === 'incense') {
      const resin = s.material('#e3b23c', { roughness: 0.3, emissive: '#7a3d00', emissiveIntensity: heat * 0.6 });
      for (let i = 0; i < 5; i++) g.ball([0.018, 0.014, 0.018], polar(random() * 6.3, heapR * random() * 0.5, heapY + 0.07 + random() * 0.01), resin, 8);
      const an = Math.PI / 3 + lean + 0.5;
      const at = polar(an, Rb * 1.6, 0);
      const box = extras.box([0.11, 0.07, 0.08], [at[0], 0.035, at[2]], s.material('#6a4a2e')); box.rotation.y = random();
      extras.box([0.115, 0.012, 0.085], [at[0] + 0.02, 0.078, at[2]], s.material('#7a5636')).rotation.set(0, box.rotation.y, 0.25);
      for (let i = 0; i < 4; i++) extras.ball([0.012, 0.01, 0.012], [at[0] + (random() - 0.5) * 0.16, 0.008, at[2] + 0.07 + random() * 0.06], resin, 6);
    }
    if (a.purpose === 'cooking') {
      const y = heapY + 0.07;
      g.lathe([[0.001, y], [0.09, y + 0.01], [0.13, y + 0.08], [0.105, y + 0.15], [0.12, y + 0.17], [0.1, y + 0.17], [0.09, y + 0.15], [0.001, y + 0.14]], soot);
      g.ring(0.11, 0.006, [0, y + 0.2, 0], metal, Math.PI).rotation.y = random();
      g.cylinder(0.092, 0.092, 0.004, [0, y + 0.145, 0], s.material('#9a7b4a', { roughness: 0.5 }), 16);
    }
    if (a.purpose === 'tending') {
      const an = lean + Math.PI;
      for (const side of [-1, 1]) g.rod(polar(an + side * 0.05, Rb * 1.05, H + 0.02), polar(an + side * 0.12, Rb * 1.12, H - 0.36), 0.006, soot);
      g.ball([0.012, 0.012, 0.012], polar(an, Rb * 1.05, H + 0.025), soot, 6);
      const at = polar(lean + 0.2, Rb * 1.75, 0);
      const wicker = s.material('#9c7a48', { roughness: 1, side: THREE.DoubleSide });
      extras.lathe([[0.001, 0.005], [0.1, 0.005], [0.14, 0.15], [0.13, 0.15], [0.095, 0.02], [0.001, 0.02]], wicker, [at[0], 0, at[2]]);
      for (const y of [0.05, 0.1, 0.15]) extras.ring(0.105 + y * 0.25, 0.007, [at[0], y, at[2]], wicker).rotation.x = Math.PI / 2;
      extras.scatter(new THREE.DodecahedronGeometry(1, 0), coalDark, Array.from({ length: 16 }, () => ({ at: [at[0] + (random() - 0.5) * 0.17, 0.1 + random() * 0.08, at[2] + (random() - 0.5) * 0.17] as P3, size: 0.02 + random() * 0.018 })));
    }
    if (a.purpose === 'vigil') {
      const an = Math.PI / 3 + lean;
      const at = polar(an, Rb * 1.08, bottom * 0.5);
      const wreath = g.ring(0.1, 0.014, at, s.material('#4d6b3a'));
      wreath.rotation.y = an; wreath.rotation.x = 0.25;
      const leaves: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 34; i++) {
        const t = i / 34 * Math.PI * 2;
        const local = new THREE.Vector3(Math.cos(t) * 0.1, Math.sin(t) * 0.1, (random() - 0.5) * 0.03).applyEuler(wreath.rotation).add(wreath.position);
        leaves.push({ at: local.toArray() as P3, size: 0.02 + random() * 0.014, color: mood.wear > 0.6 ? '#8a7a45' : random() < 0.5 ? '#4f7a3a' : '#6d8f43' });
      }
      g.scatter(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), leaves);
    }

    // Smoke: pale puffs that do not count as solid.
    const puffs: THREE.Mesh[] = [];
    if (a.smoke && a.purpose !== 'toppled' && a.fire !== 'empty') {
      const smokeMat = new THREE.MeshStandardMaterial({ color: a.fire === 'cold' ? '#a9a7a2' : '#6f6c68', transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 16; i++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), smokeMat);
        puff.userData.phase = i / 16;
        g.root.add(puff);
        puffs.push(puff);
      }
    }
    const drift = (random() - 0.5) * 0.5;
    const placeSmoke = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.userData.phase + time * mix(0.03, 0.14, mood.energy)) % 1;
        puff.position.set(Math.sin(t * 7 + puff.userData.phase * 20) * 0.05 * (1 + t * 3) + drift * t * 0.6, heapY + 0.12 + t * (0.7 + H * 0.5), Math.cos(t * 5) * 0.04 * (1 + t * 3));
        puff.scale.set(0.03 + t * 0.12, 0.05 + t * 0.14, 0.03 + t * 0.12);
      }
    };
    placeSmoke(0);

    if (a.purpose === 'toppled') {
      const axis = lean + (random() - 0.5) * 0.3; // fall between two legs, mouth toward the viewer
      rig.rotation.order = 'YXZ';
      rig.rotation.y = axis;
      rig.rotation.x = Math.PI / 2 - Math.atan2(Rb * 0.9, H) * 0.85;
      rig.position.y = Rb * 1.02;
      rig.updateMatrixWorld(true);
      const lowest = new THREE.Box3().setFromObject(rig).min.y;
      rig.position.y -= lowest;
      if (a.fire !== 'empty') {
        const spill: { at: P3; size: number }[] = [], glow: { at: P3; size: number }[] = [];
        for (let i = 0; i < 36; i++) {
          const d = H * 0.75 + random() * 0.75, off = (random() - 0.5) * (0.25 + (d - H * 0.75) * 0.9);
          const at: P3 = [Math.sin(axis) * d + Math.cos(axis) * off, 0.012, Math.cos(axis) * d - Math.sin(axis) * off];
          (random() < heat * 0.7 ? glow : spill).push({ at, size: 0.014 + random() * 0.02 });
        }
        const lump = new THREE.DodecahedronGeometry(1, 0);
        if (spill.length) extras.scatter(lump, a.fire === 'cold' || a.fire === 'embers' ? ashMat : coalDark, spill);
        if (glow.length) extras.scatter(lump.clone(), coalHot, glow).castShadow = false;
        const smear = extras.cylinder(0.3, 0.3, 0.004, [Math.sin(axis) * (H * 0.75 + 0.3), 0.002, Math.cos(axis) * (H * 0.75 + 0.3)], new THREE.MeshStandardMaterial({ color: a.fire === 'cold' ? '#a9a49b' : '#3a3532', roughness: 1 }), 18);
        smear.scale.set(1, 1, 1.5); smear.rotation.y = axis; smear.castShadow = false;
      }
    } else if (wear > 0.5 && a.fire !== 'empty') {
      // Ash and cinders dropped on the floor beneath it.
      extras.scatter(new THREE.DodecahedronGeometry(1, 0), ashMat, Array.from({ length: Math.round(wear * 16) }, () => ({ at: polar(random() * 6.3, Rb * (0.2 + random() * 1.2), 0.006), size: 0.008 + random() * 0.012 })));
    }

    const pace = mix(2, 11, mood.energy);
    const flicker = mix(0.1, 0.45, mood.energy);
    return s.finish({
      update: flames.length || puffs.length || heat > 0 ? (_dt, time) => {
        for (const fl of flames) {
          const k = 1 + Math.sin(time * pace + fl.userData.phase) * flicker;
          fl.scale.set(fl.userData.w, fl.userData.h * k, fl.userData.w);
          fl.position.y = fl.userData.y + fl.userData.h * k / 2;
        }
        coalHot.emissiveIntensity = mix(0.3, 0.5, mood.warmth) * (0.5 + heat * 0.5) * (1 + Math.sin(time * pace * 0.4) * flicker * 0.5);
        placeSmoke(time);
      } : undefined,
    });
  },
});
