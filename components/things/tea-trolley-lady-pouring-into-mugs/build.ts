import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { type P, SKINS, at, biscuitGeometry, biscuitMaterial, bow, ground, headscarf, joints, lean, look, mug, overTorso, pick, poseLeg, reach } from './rig';

const TABARDS = { blue: '#2f56a8', green: '#2f6a4a', maroon: '#6e2538', pink: '#d57a9c', yellow: '#d8b02a', grey: '#7d8188' } as const;

export default defineThing({
  questions: {
    urn: choice('What is the tea urn like?', {
      chrome: 'A tall chrome urn, polished, catching the light.',
      aluminium: 'A dented aluminium urn, dull and old.',
    }),
    tabard: choice('What colour is her tabard?', {
      blue: 'A royal blue tabard.',
      green: 'A bottle green tabard.',
      maroon: 'A maroon tabard.',
      pink: 'A pink tabard.',
      yellow: 'A mustard yellow tabard.',
      grey: 'A grey tabard with a pocket.',
    }),
    action: choice('What is she doing right now?', {
      pouring: 'Pouring: one hand on the tap, the other holding a mug under it.',
      leaning: 'Leaning on the trolley handle, waiting for the rush.',
    }),
    mugs: score('How many mugs are waiting on the trolley?', ['Two or three', 'A row of six', 'A dozen stacked in rows']),
    plate: choice('What is left on the biscuit plate?', {
      full: 'A full plate, nobody has been yet.',
      few: 'A few biscuits left and a scatter of crumbs.',
      crumbs: 'Crumbs only: the biscuits went in the first minute.',
    }),
    lower: choice('What is on the lower tier?', {
      milk: 'A crate of milk bottles.',
      tin: 'A big square biscuit tin.',
      spares: 'Spare mugs and a dishcloth.',
      cash: 'A cash tin and a sugar bag.',
    }),
    card: noul('Is there a hand-written price card propped against the urn?'),
    age: choice('How old is she?', {
      young: 'Young, early twenties, quick on her feet.',
      middle: 'Middle-aged, solid, everyone\'s auntie.',
      older: 'Old, small and bent, been doing the trolley for decades.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = { young: mix(1.58, 1.7, random()), middle: mix(1.55, 1.68, random()), older: mix(1.46, 1.58, random()) }[a.age];
    const build = a.age === 'middle' ? (random() < 0.6 ? 'heavy' : 'average') : a.age === 'older' ? 'slight' : 'average';
    const skin = pick(random, SKINS);
    const cardigan = pick(random, ['#c9b89a', '#6a6a66', '#5a4030', '#8a6a8a', '#3a4a6a', '#b06a4a']);
    const person = figure(s, {
      height: H, build, style: 'doll', skin, sleeves: 'long', hair: 'none',
      top: cardigan, bottom: pick(random, ['#2a2a30', '#3a3540', '#4a4238', '#6a5a5a']), shoes: '#1d1a18',
      pose: 'standing', gaze: 'down',
    });
    s.root.add(person.root);
    const tabard = s.material(TABARDS[a.tabard], { roughness: 0.85 });
    overTorso(person, H, build, tabard, { grow: 1.12, length: 1.0 });
    headscarf(s, person, H, pick(random, ['#8a2a4a', '#2a4a8a', '#b86a2a', '#4a6a3a', '#d9c9a1']));
    if (a.tabard === 'grey') {
      const { spine } = joints(person, 'left');
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(H * 0.08, H * 0.06, 0.008), s.material('#6a6e74', { roughness: 0.85 }));
      pocket.position.set(0, H * 0.28 * 0.3, H * 0.036 * { slight: 0.85, average: 1, heavy: 1.3 }[build] * 1.35 * (build === 'heavy' ? 1.25 : 1) * 1.12 + 0.004);
      spine.add(pocket);
    }

    // The trolley: two steel tiers on posts, castors, a push bar on her side.
    const steel = s.material('#aeb4b8', { metalness: 0.7, roughness: 0.35 });
    const dull = s.material('#6e7276', { metalness: 0.5, roughness: 0.6 });
    const TW = 0.9, TD = 0.5, tz = 0.44, top = 0.86, low = 0.3;
    for (const [y, h] of [[top, 0.025], [low, 0.02]] as const) {
      s.box([TW, h, TD], [0, y - h / 2, tz], steel);
      for (const side of [-1, 1]) s.box([TW, 0.035, 0.012], [0, y + 0.01, tz + side * (TD / 2 - 0.006)], steel);
      for (const end of [-1, 1]) s.box([0.012, 0.035, TD], [end * (TW / 2 - 0.006), y + 0.01, tz], steel);
    }
    for (const dx of [-TW / 2 + 0.03, TW / 2 - 0.03]) for (const dz of [-TD / 2 + 0.03, TD / 2 - 0.03]) {
      s.cylinder(0.012, 0.012, top + 0.1, [dx, (top + 0.1) / 2 + 0.05, tz + dz], steel, 10);
      s.cylinder(0.03, 0.03, 0.02, [dx, 0.03, tz + dz], s.material('#2a2a2c', { roughness: 0.8 }), 12).rotation.z = Math.PI / 2;
      s.cylinder(0.01, 0.01, 0.04, [dx, 0.06, tz + dz], dull, 8);
    }
    const barY = top + 0.14, barZ = tz - TD / 2 + 0.03;
    s.box([TW - 0.06, 0.022, 0.022], [0, barY, barZ], steel);
    for (const dx of [-TW / 2 + 0.03, TW / 2 - 0.03]) s.box([0.022, 0.1, 0.022], [dx, barY - 0.05, barZ], steel);

    // The urn on her right, its tap toward her.
    const urnX = -0.22, urnZ = tz + 0.06, R = 0.15, urnH = 0.42;
    const chrome = s.material('#dfe3e6', { metalness: 0.92, roughness: 0.18 });
    const alu = s.material('#b0b2ae', { metalness: 0.55, roughness: 0.55 });
    const urnPaint = a.urn === 'chrome' ? chrome : alu;
    s.lathe([[0, 0], [R - 0.02, 0], [R, 0.02], [R, urnH - 0.04], [R - 0.01, urnH], [R - 0.03, urnH + 0.01], [R - 0.05, urnH + 0.05], [0.03, urnH + 0.07], [0.03, urnH + 0.1], [0, urnH + 0.1]], urnPaint, [urnX, top, urnZ]);
    s.ring(R - 0.01, 0.012, [urnX, top + urnH - 0.02, urnZ], urnPaint).rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      const handle = s.ring(0.04, 0.009, [urnX + side * (R + 0.005), top + urnH * 0.7, urnZ], s.material('#1d1d1f', { roughness: 0.6 }), Math.PI);
      handle.rotation.set(0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
    }
    if (a.urn === 'aluminium') {
      for (let i = 0; i < 4; i++) {
        const dent = s.ball([0.03, 0.02, 0.012], [urnX + Math.sin(i * 1.9 + 0.4) * R, top + 0.08 + random() * 0.25, urnZ + Math.cos(i * 1.9 + 0.4) * R], s.material('#8a8c88', { metalness: 0.5, roughness: 0.7 }), 8);
        dent.rotation.y = -(i * 1.9 + 0.4);
      }
    }
    // Sight glass and the tap on the near side.
    s.cylinder(0.006, 0.006, urnH * 0.6, [urnX + 0.06, top + urnH * 0.42, urnZ - R - 0.006], new THREE.MeshStandardMaterial({ color: '#d8e6ee', transparent: true, opacity: 0.6, roughness: 0.1, depthWrite: false }), 8).castShadow = false;
    const tapY = top + 0.13, tapZ = urnZ - R;
    s.cylinder(0.014, 0.014, 0.05, [urnX, tapY, tapZ - 0.02], chrome, 10).rotation.x = Math.PI / 2;
    s.cylinder(0.008, 0.008, 0.045, [urnX, tapY - 0.02, tapZ - 0.045], chrome, 8);
    const lever = s.box([0.012, 0.045, 0.01], [urnX, tapY + 0.035, tapZ - 0.035], s.material('#1d1d1f', { roughness: 0.5 }));
    lever.rotation.x = a.action === 'pouring' ? -0.6 : 0.1;

    // Mugs waiting on the top tier, the plate, the milk jug.
    const count = 2 + Math.round(a.mugs * 10);
    const mugColour = pick(random, ['#f1ede4', '#e8e2d2', '#dfe7ea']);
    for (let i = 0; i < count; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      mug(s, [0.1 + col * 0.09 + (random() - 0.5) * 0.01, top + (row > 2 ? 0.07 : 0), tz - 0.15 + (row % 3) * 0.12 + (random() - 0.5) * 0.01], { colour: mugColour, yaw: random() * 6.3 });
    }
    const plateX = 0.02, plateZ = tz + 0.14;
    s.cylinder(0.11, 0.095, 0.012, [plateX, top + 0.006, plateZ], s.material('#f1ede4', { roughness: 0.4 }), 24);
    const kind = pick(random, ['round', 'chocolate', 'rectangular'] as const);
    const biscuits = { full: 10, few: 3, crumbs: 0 }[a.plate];
    if (biscuits) s.scatter(biscuitGeometry(kind), biscuitMaterial(s, kind), Array.from({ length: biscuits }, (_u, i) => ({ at: [plateX + Math.cos(i * 1.3) * (a.plate === 'full' ? 0.055 : 0.04) * (i % 2 ? 1 : 0.6), top + 0.012 + Math.floor(i / 5) * 0.009, plateZ + Math.sin(i * 1.3) * 0.055 * (i % 2 ? 1 : 0.6)] as P, size: 1 })));
    if (a.plate !== 'full') {
      const crumbs = s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#c9a06a', { roughness: 1 }), Array.from({ length: 10 }, () => ({ at: [plateX + (random() - 0.5) * 0.16, top + 0.014, plateZ + (random() - 0.5) * 0.16] as P, size: 0.004 + random() * 0.005 })));
      crumbs.castShadow = false;
    }
    s.lathe([[0, 0], [0.035, 0], [0.04, 0.03], [0.034, 0.08], [0.038, 0.09], [0.03, 0.09], [0.028, 0.012], [0, 0.012]], s.material('#f1ede4', { roughness: 0.4 }), [0.2, top, tz + 0.17]);
    s.ring(0.02, 0.005, [0.24, top + 0.05, tz + 0.17], s.material('#f1ede4', { roughness: 0.4 }), Math.PI).rotation.z = -Math.PI / 2;
    if (a.card) {
      const card = s.label(pick(random, ['TEA 5p', 'TEA & BISCUIT 8p', 'NO CREDIT', 'TEA  COFFEE  SQUASH']), 0.16, 0.09, [urnX + 0.12, top + 0.05, tapZ + 0.03], '#2a2a6a', '#f4f0e0');
      card.rotation.set(-0.35, 0.3, 0);
    }
    // The lower tier.
    if (a.lower === 'milk') {
      s.box([0.34, 0.2, 0.24], [0.15, low + 0.1, tz], s.material(pick(random, ['#2f6fc4', '#c9402a']), { roughness: 0.6 }));
      s.scatter(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 12), new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.3 }), Array.from({ length: 8 }, (_u, i) => ({ at: [0.15 - 0.12 + (i % 4) * 0.08, low + 0.17, tz - 0.05 + Math.floor(i / 4) * 0.1] as P, size: 1 })));
    } else if (a.lower === 'tin') {
      s.box([0.3, 0.16, 0.26], [0.05, low + 0.08, tz], s.material(pick(random, ['#8a2a2a', '#1f4f9f', '#2a7a4a']), { roughness: 0.4, metalness: 0.3 }));
      s.box([0.26, 0.1, 0.004], [0.05, low + 0.08, tz - 0.132], s.material('#e8d8a0', { roughness: 0.6 }));
    } else if (a.lower === 'spares') {
      for (let i = 0; i < 6; i++) mug(s, [-0.3 + i * 0.09, low, tz + (i % 2 ? 0.1 : -0.1)], { colour: mugColour, yaw: random() * 6.3 });
      s.box([0.16, 0.01, 0.12], [0.3, low + 0.005, tz + 0.1], s.material('#9fb7b4', { roughness: 1 }));
    } else {
      s.box([0.22, 0.08, 0.16], [-0.2, low + 0.04, tz], s.material('#2a2a30', { roughness: 0.5, metalness: 0.3 }));
      s.box([0.1, 0.16, 0.06], [0.15, low + 0.08, tz], s.material('#efe8d4', { roughness: 0.9 }));
      s.box([0.1, 0.03, 0.062], [0.15, low + 0.1, tz], s.material('#2a6ad4', { roughness: 0.6 }));
    }

    // Her pose: behind the trolley, pouring or leaning on the bar.
    const pouring = a.action === 'pouring';
    lean(person, a.age === 'older' ? 6 : 2);
    bow(person, pouring ? 14 : 18 + (a.age === 'older' ? 8 : 0));
    poseLeg(person, 'left', { out: 5 });
    poseLeg(person, 'right', { out: 5 });
    person.root.position.set(0, 0, 0);
    person.root.updateMatrixWorld(true);
    const hips = at(person.pelvis);
    person.root.position.z = barZ - 0.2 - hips.z;
    person.root.position.x = pouring ? urnX + 0.12 : 0;
    person.root.updateMatrixWorld(true);
    if (pouring) {
      look(person, 34, -8);
      reach(person, 'right', new THREE.Vector3(urnX + 0.01, tapY + 0.05, tapZ - 0.06), { forward: [30, 110], out: [-10, 30], bend: [10, 120], across: [-10, 50] });
      reach(person, 'left', new THREE.Vector3(urnX + 0.05, top + 0.1, tapZ - 0.09), { forward: [30, 110], out: [-10, 30], bend: [10, 120], across: [-10, 50] });
      ground(person);
      const left = at(person.hands.left);
      const held = mug(s, [urnX + 0.0, top + 0.015, tapZ - 0.075], { colour: mugColour, tea: true, yaw: Math.PI / 2 });
      held.position.x = left.x - 0.02;
      // Tea from the spout into the mug.
      const stream = s.cylinder(0.004, 0.006, tapY - 0.045 - (top + 0.1), [urnX, (tapY - 0.045 + top + 0.1) / 2, tapZ - 0.045], new THREE.MeshStandardMaterial({ color: '#8a5a2a', roughness: 0.2, transparent: true, opacity: 0.85, depthWrite: false }), 8);
      stream.castShadow = false;
    } else {
      look(person, 8, 12);
      for (const side of ['left', 'right'] as const) {
        const x = side === 'left' ? 0.18 : -0.18;
        reach(person, side, new THREE.Vector3(x, barY + 0.02, barZ - 0.02), { forward: [10, 90], out: [-10, 25], bend: [0, 100], across: [-20, 40] });
      }
      ground(person);
    }
    // Steam over the urn lid, rising faster when the room has energy.
    const puffs: { mesh: THREE.Mesh; base: number; phase: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const puff = s.ball([0.03, 0.035, 0.03], [urnX + (random() - 0.5) * 0.08, top + urnH + 0.1 + i * 0.06, urnZ + (random() - 0.5) * 0.08], new THREE.MeshStandardMaterial({ color: '#f4f2ee', transparent: true, opacity: 0.18, depthWrite: false, roughness: 1 }), 8);
      puff.castShadow = false;
      puffs.push({ mesh: puff, base: puff.position.y, phase: random() * 6.3 });
    }
    const energy = mood.energy;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        for (const [i, puff] of puffs.entries()) {
          const t = (time * (0.2 + energy * 0.3) + puff.phase + i * 0.33) % 1;
          puff.mesh.position.y = puff.base + t * 0.25;
          const grow = 1 + t * 1.5;
          puff.mesh.scale.set(0.03 * grow, 0.035 * grow, 0.03 * grow);
          (puff.mesh.material as THREE.MeshStandardMaterial).opacity = 0.2 * (1 - t);
        }
      },
    });
  },
});
