import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    full: score('How full is the ashtray?', ['Wiped clean and gleaming', 'A couple of butts in a dusting of ash', 'Half a pack deep', 'Heaped and overflowing onto the floor']),
    burning: choice('Is anything still burning in it?', {
      nothing: 'Nothing: all cold.',
      cigarette: 'One cigarette resting in a notch, a long ash and a straight thread of smoke.',
      forgotten: 'A forgotten cigarette burnt down to a full-length curl of ash.',
      pair: 'Two cigarettes burning in opposite notches, a conversation in progress.',
      cigar: 'A fat cigar, smouldering.',
      pipe: 'A briar pipe laid across the rim, still warm.',
    }),
    bowl: choice('What is the glass bowl like?', {
      amber: 'Thick amber glass that glows like whiskey.',
      smoke: 'Smoke-grey glass.',
      ruby: 'Deep ruby red glass.',
      green: 'Bottle-green pressed glass.',
      milk: 'Opaque white milk glass.',
    }),
    stem: choice('What kind of stand is it?', {
      column: 'A plain chrome column on a weighted dome base, lobby standard issue.',
      twist: 'A twisted brass stem with a loop handle over the bowl.',
      atomic: 'Atomic-age: three splayed hairpin legs with ball feet under a saucer.',
      turned: 'A turned dark-wood column, a gentleman’s smoking stand.',
    }),
    butts: choice('What do the butts say about who smoked here?', {
      filters: 'Tan filter tips, an ordinary pack-a-day habit.',
      plain: 'Short white unfiltered stubs, smoked right down.',
      lipstick: 'Filters ringed with red lipstick.',
      mixed: 'A mix of brands and a cigar stub: a room full of people.',
    }),
    shelf: noul('Does it have a small tray part way up holding a pack and a lighter?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tarnish = mood.wear * 0.4;
    const chrome = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d6dadb').lerp(new THREE.Color('#7d7868'), tarnish), metalness: 0.9, roughness: mix(0.18, 0.55, mood.wear) });
    const brass = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9a04a').lerp(new THREE.Color('#6b5a38'), tarnish), metalness: 0.85, roughness: mix(0.25, 0.6, mood.wear) });
    const wood = s.material('#4a2c1a', { roughness: 0.45 });
    const black = s.material('#1b1a19', { roughness: 0.5 });
    const metal = a.stem === 'twist' ? brass : chrome;
    const top = mix(0.66, 0.74, random());

    // Stand.
    if (a.stem === 'column') {
      s.lathe([[0, 0], [0.15, 0], [0.155, 0.012], [0.13, 0.03], [0.05, 0.055], [0.022, 0.075], [0.018, 0.09]], chrome);
      s.cylinder(0.016, 0.018, top - 0.09, [0, (top + 0.09) / 2, 0], chrome, 16);
      s.cylinder(0.026, 0.026, 0.02, [0, top * 0.55, 0], chrome, 16);
    } else if (a.stem === 'twist') {
      s.lathe([[0, 0], [0.14, 0], [0.145, 0.015], [0.09, 0.03], [0.07, 0.06], [0.03, 0.075], [0.02, 0.1]], brass);
      for (const phase of [0, Math.PI]) {
        const points: P3[] = [];
        for (let i = 0; i <= 40; i++) { const t = i / 40, turn = phase + t * Math.PI * 9; points.push([Math.cos(turn) * 0.011, mix(0.09, top, t), Math.sin(turn) * 0.011]); }
        s.tube(points, 0.009, brass);
      }
      s.ball([0.03, 0.03, 0.03], [0, 0.11, 0], brass, 12);
    } else if (a.stem === 'atomic') {
      for (let i = 0; i < 3; i++) {
        const t = i * Math.PI * 2 / 3 + Math.PI / 6, x = Math.cos(t), z = Math.sin(t);
        s.tube([[x * 0.2, 0.03, z * 0.2], [x * 0.09, top * 0.5, z * 0.09], [x * 0.05, top - 0.01, z * 0.05], [x * 0.02, top * 0.55, z * 0.02 + 0.0001], [x * 0.17, 0.035, z * 0.17 + 0.03]], 0.006, black);
        s.ball([0.022, 0.022, 0.022], [x * 0.19, 0.022, z * 0.19 + 0.015], brass, 12);
      }
      s.ring(0.075, 0.006, [0, top * 0.42, 0], brass).rotation.x = Math.PI / 2;
    } else {
      s.lathe([[0, 0], [0.15, 0], [0.155, 0.02], [0.1, 0.035], [0.05, 0.05], [0.03, 0.09], [0.045, 0.14], [0.022, 0.2], [0.03, 0.3], [0.02, 0.36], [0.036, 0.44], [0.02, 0.52], [0.028, top - 0.03], [0.05, top], [0, top]], wood);
      s.ring(0.047, 0.006, [0, 0.14, 0], brass).rotation.x = Math.PI / 2;
    }

    // Holder, bowl and rim with three rests.
    const R = a.stem === 'atomic' ? 0.14 : 0.115, bowlH = a.stem === 'atomic' ? 0.045 : 0.06, rimY = top + bowlH + 0.012;
    s.lathe([[0, 0], [0.04, 0], [R * 0.72, 0.012], [R * 0.76, 0.02], [0, 0.02]], metal, [0, top - 0.008, 0]);
    const glassTone = { amber: '#c9761c', smoke: '#5a5650', ruby: '#8f1626', green: '#2f6a3a', milk: '#efece2' }[a.bowl];
    const glass = new THREE.MeshPhysicalMaterial({ color: glassTone, transparent: a.bowl !== 'milk', opacity: a.bowl === 'milk' ? 1 : 0.82, roughness: 0.08, emissive: glassTone, emissiveIntensity: a.bowl === 'milk' ? 0.05 : mix(0.2, 0.55, mood.warmth), side: THREE.DoubleSide });
    s.lathe([[0, 0], [R * 0.7, 0], [R * 0.95, bowlH * 0.5], [R, bowlH], [R * 0.9, bowlH], [R * 0.82, bowlH * 0.5], [R * 0.6, 0.014], [0, 0.014]], glass, [0, top + 0.012, 0]);
    for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; s.ball([0.012, bowlH * 0.24, 0.008], [Math.cos(t) * R * 0.97, top + 0.012 + bowlH * 0.52, Math.sin(t) * R * 0.97], glass, 8).rotation.y = -t + Math.PI / 2; }
    s.ring(R * 0.96, 0.007, [0, rimY, 0], metal).rotation.x = Math.PI / 2;
    const notch = (i: number) => i * Math.PI * 2 / 3 + 0.5;
    for (let i = 0; i < 3; i++) for (const off of [-0.09, 0.09]) s.ball([0.009, 0.01, 0.009], [Math.cos(notch(i) + off) * R * 0.96, rimY + 0.008, Math.sin(notch(i) + off) * R * 0.96], metal, 8);
    if (a.stem === 'twist' || a.stem === 'turned') {
      const loop = s.ring(R * 0.98, 0.006, [0, rimY, 0], metal, Math.PI);
      loop.scale.y = 1.25;
      loop.rotation.y = Math.PI / 2 + 0.3;
    } else if (a.stem === 'column') {
      s.cylinder(0.006, 0.006, 0.05, [0, top + 0.04, 0], chrome, 8);
      s.ball([0.02, 0.014, 0.02], [0, top + 0.07, 0], black, 12);
    }

    // Ash and butts.
    const ash = new THREE.MeshStandardMaterial({ color: '#77746f', roughness: 1 });
    const paper = new THREE.MeshStandardMaterial({ color: '#f0ece0', roughness: 0.9 });
    const filterTone = (i: number) => a.butts === 'plain' ? '#f0ece0' : a.butts === 'lipstick' ? (i % 3 ? '#c2202f' : '#c99a5a') : a.butts === 'mixed' ? ['#c99a5a', '#f0ece0', '#e9e4d6', '#5a3a22'][i % 4] : '#c99a5a';
    const inside = top + 0.028;
    const ashH = a.full * bowlH * 0.9;
    const dome = Math.max(0.006, ashH * (a.full > 0.8 ? 0.95 : 0.7));
    if (a.full > 0.08) {
      s.ball([R * 0.8, dome, R * 0.8], [0, inside, 0], ash, 16);
    }
    const count = Math.round(a.full * a.full * 26 + (a.full > 0.2 ? 2 : 0));
    const stub = (at: P3, yaw: number, tilt: number, i: number, fat = false) => {
      const group = new THREE.Group();
      const length = fat ? 0.05 : 0.018 + random() * 0.022, radius = fat ? 0.009 : 0.0042;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), fat ? new THREE.MeshStandardMaterial({ color: '#4a2f1c', roughness: 0.9 }) : paper);
      body.position.x = length / 2 + 0.008;
      body.rotation.z = Math.PI / 2;
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.02, radius * 1.02, 0.016, 8), new THREE.MeshStandardMaterial({ color: fat ? '#4a2f1c' : filterTone(i), roughness: 0.9 }));
      tip.rotation.z = Math.PI / 2;
      body.castShadow = tip.castShadow = true;
      group.add(body, tip);
      group.position.set(...at);
      group.rotation.set(0, yaw, tilt);
      s.root.add(group);
    };
    for (let i = 0; i < count; i++) {
      const t = random() * Math.PI * 2, r = Math.sqrt(random()) * R * 0.62;
      stub([Math.cos(t) * r, inside + dome * Math.sqrt(Math.max(0, 1 - (r / (R * 0.8)) ** 2)) + 0.003 + random() * 0.006, Math.sin(t) * r], random() * 6, (random() - 0.5) * 1.2, i, a.butts === 'mixed' && i % 9 === 4);
    }
    if (a.full > 0.8) {
      for (let i = 0; i < 5 + Math.floor(mood.density * 6); i++) { const t = random() * 6.3, r = 0.1 + random() * 0.2; stub([Math.cos(t) * r, r < 0.15 ? 0.04 : 0.006, Math.sin(t) * r], random() * 6, 0, i); }
      const smudge = s.cylinder(0.26, 0.26, 0.003, [0.05, 0.0015, 0.04], new THREE.MeshStandardMaterial({ color: '#8f8c86', roughness: 1, transparent: true, opacity: 0.5, depthWrite: false }), 24);
      smudge.scale.z = 0.7;
    }

    // What is lit.
    const smokes: THREE.Mesh[] = [];
    const smokeMat = new THREE.MeshStandardMaterial({ color: '#8e98a4', transparent: true, opacity: 0.55, depthWrite: false, roughness: 1 });
    const thread = (from: P3) => {
      const points: P3[] = [], lean = (random() - 0.5) * 0.12, wobble = mix(0.006, 0.05, mood.energy);
      for (let i = 0; i <= 14; i++) { const t = i / 14; points.push([from[0] + lean * t * t + Math.sin(t * 9 + from[0] * 40) * wobble * t * 1.6, from[1] + t * 0.55, from[2] + Math.cos(t * 7 + from[2] * 30) * wobble * t * 1.6]); }
      const mesh = s.tube(points, 0.0045, smokeMat);
      mesh.castShadow = false;
      smokes.push(mesh);
      const wisp = s.tube(points.slice(6).map(([x, y, z], i) => [x + Math.sin(i) * 0.012, y + 0.02, z + Math.cos(i * 1.3) * 0.012] as P3), 0.008, smokeMat);
      wisp.castShadow = false;
      smokes.push(wisp);
    };
    const ember = new THREE.MeshStandardMaterial({ color: '#ff7a2a', emissive: '#ff5a1a', emissiveIntensity: 2 });
    const resting = (index: number, ashLength: number, fat = false) => {
      const t = notch(index), x = Math.cos(t), z = Math.sin(t), radius = fat ? 0.011 : 0.0046, total = fat ? 0.13 : 0.085;
      const outer: P3 = [x * (R + 0.03), rimY + 0.014, z * (R + 0.03)], inner: P3 = [x * (R + 0.03 - total), rimY + 0.008, z * (R + 0.03 - total)];
      const burnt = total * ashLength, emberAt: P3 = [mix(inner[0], outer[0], ashLength), mix(inner[1], outer[1], ashLength), mix(inner[2], outer[2], ashLength)];
      s.rod(emberAt, outer, radius, fat ? new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.9 }) : paper);
      if (!fat) s.rod([mix(outer[0], inner[0], 0.24), outer[1], mix(outer[2], inner[2], 0.24)], outer, radius * 1.03, new THREE.MeshStandardMaterial({ color: filterTone(index + 1), roughness: 0.9 }));
      else s.rod([mix(outer[0], inner[0], 0.3), outer[1], mix(outer[2], inner[2], 0.3)], [mix(outer[0], inner[0], 0.2), outer[1], mix(outer[2], inner[2], 0.2)], radius * 1.06, brass);
      if (burnt > 0.004) s.rod(inner, emberAt, radius * 0.95, ash);
      s.ball([radius * 1.15, radius * 1.15, radius * 1.15], emberAt, ember, 8);
      thread(emberAt);
    };
    if (a.burning === 'cigarette') resting(0, 0.3);
    else if (a.burning === 'forgotten') resting(0, 0.72);
    else if (a.burning === 'pair') { resting(0, 0.25); resting(1, 0.4); }
    else if (a.burning === 'cigar') resting(0, 0.16, true);
    else if (a.burning === 'pipe') {
      const t = notch(0), x = Math.cos(t), z = Math.sin(t);
      const bowlAt: P3 = [x * (R - 0.05), rimY + 0.022, z * (R - 0.05)];
      s.lathe([[0, 0], [0.014, 0.004], [0.02, 0.022], [0.018, 0.044], [0.013, 0.044], [0.012, 0.012], [0, 0.01]], s.material('#5a2c16', { roughness: 0.35 }), [bowlAt[0], bowlAt[1] - 0.018, bowlAt[2]]);
      s.rod([bowlAt[0], bowlAt[1] - 0.008, bowlAt[2]], [x * (R + 0.09), rimY + 0.012, z * (R + 0.09)], 0.006, black, 0.004);
      s.cylinder(0.012, 0.012, 0.003, [bowlAt[0], bowlAt[1] + 0.022, bowlAt[2]], ember, 10);
      thread([bowlAt[0], bowlAt[1] + 0.024, bowlAt[2]]);
    }

    // Tray with a pack and a lighter.
    if (a.shelf) {
      const y = top * 0.58, tx = a.stem === 'atomic' ? 0 : 0.1;
      s.cylinder(0.105, 0.095, 0.012, [tx, y, 0], metal, 24);
      s.ring(0.105, 0.005, [tx, y + 0.01, 0], metal).rotation.x = Math.PI / 2;
      const pack = s.box([0.056, 0.022, 0.086], [tx + 0.02, y + 0.018, 0.015], s.material(['#c2202f', '#efe9d8', '#2f6a5a', '#1f3a6a'][Math.floor(random() * 4)], { roughness: 0.5 }));
      pack.rotation.y = random() * 3;
      s.box([0.057, 0.0225, 0.02], [pack.position.x + Math.sin(pack.rotation.y) * 0.03, y + 0.018, pack.position.z + Math.cos(pack.rotation.y) * 0.03], s.material('#efe9d8')).rotation.y = pack.rotation.y;
      s.box([0.036, 0.055, 0.012], [tx - 0.045, y + 0.0335, -0.035], chrome).rotation.y = 0.6;
    }

    const drift = mix(0.15, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        smokes.forEach((smoke, index) => { smoke.rotation.y = Math.sin(time * drift * 0.6 + index) * 0.25; smoke.scale.x = 1 + Math.sin(time * drift + index * 2) * 0.15; });
        ember.emissiveIntensity = 1.6 + Math.sin(time * 2.3) * 0.6;
      },
    });
  },
});
