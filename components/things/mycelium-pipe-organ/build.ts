import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type P3, bracket, cluster, domeGeometry, glow, motes, mottle, mushroom, paint, put, strand } from './fungi';

export default defineThing({
  questions: {
    sound: choice('Does it still sound?', {
      silent: 'Silent: the mouths of the pipes are webbed shut.',
      wheeze: 'It wheezes: one or two pipes sigh out a thread of spores now and then.',
      hum: 'It hums: every pipe glows faintly from within, one held chord.',
      plays: 'It plays itself: keys held down by threads, pipes puffing bright spores in turn.',
    }),
    player: choice('Who last played it, and what did they leave?', {
      nobody: 'Nobody in living memory: the keyboard lid is shut and furred over.',
      organist: 'The old organist: sheet music still on the stand, a cardigan folded on the bench.',
      remains: 'Someone who never got up: a pale fungal figure slumped over the keys.',
      child: 'A child who snuck in: a wooden crate pulled up as a step, a dropped toy.',
      fungus: 'The fungus itself: ropes of mycelium lie across the keys like fingers.',
    }),
    tops: choice('What grows from the tops of the pipes?', {
      caps: 'Each pipe wears a wide mushroom cap.',
      open: 'Nothing: ragged open mouths, dark and hollow.',
      puffballs: 'Puffballs swelling out of every pipe like blown bubbles.',
      coral: 'Branching coral fungus, like frozen sound.',
      shelves: 'Shelf fungi stepping up the sides of the pipes.',
    }),
    front: choice('How are the pipes arranged?', {
      mitre: 'Tallest in the middle, falling away to each side like a gable.',
      wings: 'Tall towers at each side with a low valley between.',
      ramp: 'One long slope from short to tall, like a pan flute.',
      towers: 'Three clustered towers with short pipes between them.',
    }),
    glow: choice('What colour is the light inside it?', {
      foxfire: 'Foxfire green.',
      amber: 'Warm amber.',
      cyan: 'Cold cyan.',
      violet: 'Violet.',
      bone: 'Pale bone white, hardly a colour.',
    }),
    takeover: score('How far has the organ case been taken over?', ['Carved oak still showing, fungus only in the pipes', 'Half and half', 'No wood left: the whole case is one fruiting body']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = { foxfire: '#63e84a', amber: '#f5a02a', cyan: '#2cc4ea', violet: '#9456f0', bone: '#e9e2c4' }[a.glow];
    const sounding = a.sound !== 'silent';
    const level = mix(0.45, 1, mood.cheer) * (a.sound === 'plays' ? 1.25 : a.sound === 'hum' ? 1 : 0.7);
    const take = Math.min(1, a.takeover * 0.8 + mood.wear * 0.3);
    const oakTint = new THREE.Color('#5c3d28').lerp(new THREE.Color('#cfc4a4'), take * 0.75);
    const oak = paint('#ffffff', { map: mottle(random, '#' + oakTint.getHexString(), ['#3f2a1c', '#7a5a3c', '#d8cfb4', '#8a9a72'], 110) });
    const dark = paint(oakTint.clone().multiplyScalar(0.55));
    const stalk = paint('#ffffff', { map: mottle(random, '#e4dabd', ['#c9bb97', '#f4eedd', '#b3a37c', '#d9c8a0'], 120) });
    const lit = glow(tint, level, { side: THREE.DoubleSide });
    const hollow = sounding ? glow(tint, level * 0.9) : paint('#2a241c');
    const web = paint('#f1ecdc', { roughness: 1 });
    const W = 2.6, caseH = 1.25, depth = 0.9;

    // ---- case: plinth, console, impost
    s.box([W, caseH, depth], [0, caseH / 2, -0.25], oak);
    s.box([W + 0.14, 0.1, depth + 0.1], [0, caseH + 0.05, -0.25], dark);
    s.box([W + 0.1, 0.12, depth + 0.08], [0, 0.06, -0.25], dark);
    for (let i = 0; i < 4; i++) s.box([0.5, 0.75, 0.02], [(i - 1.5) * 0.62, 0.55, 0.21], dark);
    // console: two manuals, stop jambs, music desk
    s.box([1.5, 0.08, 0.42], [0, 0.78, 0.38], oak);
    for (const side of [-1, 1]) {
      s.box([0.2, 0.5, 0.42], [side * 0.85, 1.0, 0.38], oak);
      const knobs: { at: P3; size: number; color: string }[] = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) knobs.push({ at: [side * (0.8 + c * 0.09), 0.86 + r * 0.1, 0.6], size: 0.028, color: random() < 0.3 + take * 0.4 ? '#cfd8b8' : '#efe7d0' });
      s.scatter(new THREE.SphereGeometry(1, 8, 6), paint('#ffffff'), knobs);
    }
    const keyFur = mix(0.2, 1, mood.wear * 0.6 + a.takeover * 0.4);
    const whites: { at: P3; size: P3; color: string }[] = [], blacks: { at: P3; size: P3; color: string }[] = [];
    const held = new Set<number>();
    if (a.sound === 'plays' || a.player === 'fungus') for (let i = 0; i < 7; i++) held.add(Math.floor(random() * 60));
    for (let manual = 0; manual < 2; manual++) {
      const y = 0.83 + manual * 0.07, z = 0.48 - manual * 0.16;
      for (let i = 0; i < 30; i++) {
        const down = held.has(manual * 30 + i) ? 0.018 : 0;
        const mouldy = random() < keyFur * 0.6;
        whites.push({ at: [(i - 14.5) * 0.045, y - down, z], size: [0.041, 0.02, 0.15], color: mouldy ? ['#a9bd8f', '#c8cfae', '#8fa88a'][i % 3] : '#efe8d2' });
        if (![2, 6].includes(i % 7)) blacks.push({ at: [(i - 14) * 0.045, y + 0.016 - down, z - 0.03], size: [0.022, 0.022, 0.09], color: mouldy ? '#5a6a4c' : '#201c1a' });
      }
    }
    cluster(s.root, new THREE.BoxGeometry(1, 1, 1), paint('#ffffff', { roughness: 0.5 }), whites);
    cluster(s.root, new THREE.BoxGeometry(1, 1, 1), paint('#ffffff', { roughness: 0.5 }), blacks);
    // fur on the keys
    const fur = Array.from({ length: Math.round(keyFur * 40) }, () => ({ at: [(random() - 0.5) * 1.35, 0.85 + random() * 0.07, 0.3 + random() * 0.25] as P3, size: [0.02 + random() * 0.04, 0.012 + random() * 0.02, 0.02 + random() * 0.04] as P3, color: ['#b9c9a0', '#dfe4cc', '#93a886', '#f1eede'][Math.floor(random() * 4)] }));
    if (fur.length) cluster(s.root, new THREE.SphereGeometry(1, 7, 5), paint('#ffffff', { roughness: 1 }), fur);
    // pedalboard
    for (let i = 0; i < 13; i++) s.box([0.035, 0.03, 0.5], [(i - 6) * 0.075, 0.03, 0.5], i % 3 === 1 ? dark : oak).rotation.y = (i - 6) * 0.02;
    s.box([1.1, 0.05, 0.06], [0, 0.03, 0.22], dark);
    // bench
    const benchZ = 1.02, benchTurn = (random() - 0.5) * 0.25;
    const bench = new THREE.Group();
    put(bench, new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 0.34), oak), [0, 0.6, 0]);
    for (const side of [-1, 1]) put(bench, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.3), oak), [side * 0.5, 0.3, 0]);
    put(bench, new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.04), dark), [0, 0.2, 0]);
    put(s.root, bench, [0, 0, benchZ]).rotation.y = benchTurn;

    // ---- pipes: fungal stalks of graded heights
    const n = 12;
    const heightAt = (t: number) => {
      const centre = Math.abs(t - 0.5) * 2;
      if (a.front === 'mitre') return mix(1, 0.3, centre ** 1.2);
      if (a.front === 'wings') return mix(0.32, 1, centre ** 1.6);
      if (a.front === 'ramp') return mix(0.28, 1, t);
      return 0.35 + 0.65 * Math.max(0, Math.cos(t * Math.PI * 4)) ** 2;
    };
    const pipes: { at: P3; size: P3; turn: P3 }[] = [], mouths: { at: P3; size: P3; turn: P3 }[] = [], lips: { at: P3; size: P3; turn: P3 }[] = [];
    const tops: { x: number; y: number; z: number; r: number; lean: number }[] = [];
    const baseY = caseH + 0.1;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const tall = heightAt(t);
      const r = mix(0.07, 0.125, tall) * (0.9 + random() * 0.2);
      const height = mix(0.7, 2.25, tall) * (0.94 + random() * 0.12);
      const lean = (random() - 0.5) * mix(0.02, 0.2, take);
      const x = (t - 0.5) * (W - 0.25), z = -0.12 + Math.sin(t * Math.PI) * 0.12 * (a.front === 'mitre' ? 1 : -0.4);
      pipes.push({ at: [x + Math.sin(-lean) * height / 2, baseY + height / 2, z], size: [r, height, r], turn: [0, 0, lean] });
      // foot cone, mouth and lip like a real flue pipe
      mouths.push({ at: [x, baseY + 0.26, z + r * 0.86], size: [r * 1.1, 0.07, r * 0.5], turn: [0, 0, 0] });
      lips.push({ at: [x, baseY + 0.31, z + r * 0.95], size: [r * 1.3, 0.02, r * 0.4], turn: [0.5, 0, 0] });
      tops.push({ x: x + Math.sin(-lean) * height, y: baseY + height * Math.cos(lean), z, r, lean });
    }
    // back rank, shorter and darker, to give the front depth
    for (let i = 0; i < n - 1; i++) {
      const t = (i + 0.5) / (n - 1), tall = heightAt(t) * 0.8 + 0.1, r = 0.05 + random() * 0.03, height = mix(0.65, 2.0, tall) * (0.85 + random() * 0.2);
      pipes.push({ at: [(t - 0.5) * (W - 0.3), baseY + height / 2, -0.42], size: [r, height, r], turn: [0, 0, (random() - 0.5) * 0.1] });
    }
    cluster(s.root, new THREE.CylinderGeometry(0.92, 1, 1, 12, 1, a.tops === 'open'), stalk, pipes);
    cluster(s.root, new THREE.BoxGeometry(1, 1, 1), hollow, mouths);
    cluster(s.root, new THREE.BoxGeometry(1, 1, 1), paint('#cfc3a2'), lips);
    // pipe shades: carved (or grown) tracery tying the rank to the case
    const towerX = W / 2 - 0.02;
    for (const side of [-1, 1]) s.box([0.1, 2.5, 0.5], [side * (towerX + 0.05), baseY + 1.25 - 0.05, -0.25], oak);
    s.box([W + 0.2, 0.5, 0.06], [0, baseY + 0.25 - 0.05, -0.55], dark);
    if (take < 0.75) {
      for (const side of [-1, 1]) {
        s.mesh(new THREE.ConeGeometry(0.11, 0.4, 4), dark, [side * (towerX + 0.05), baseY + 2.65, -0.25]);
        s.ball([0.05, 0.05, 0.05], [side * (towerX + 0.05), baseY + 2.88, -0.25], dark, 8);
      }
    } else for (const side of [-1, 1]) mushroom(s.root, { at: [side * (towerX + 0.05), baseY + 2.4, -0.25], height: 0.3, cap: 0.36, capHeight: 0.22, stalk: 0.07, capMat: stalk, gillMat: lit, stalkMat: stalk });

    // ---- what grows from the tops
    const capItems: { at: P3; size: P3; turn: P3; color: string }[] = [];
    const balls: { at: P3; size: P3; color: string }[] = [];
    const capTints = ['#d9c9a0', '#c7a878', '#e8dcc0', '#b8946a'];
    tops.forEach((top, index) => {
      if (a.tops === 'caps') capItems.push({ at: [top.x, top.y - 0.02, top.z], size: [top.r * 2.5, top.r * 1.7, top.r * 2.5], turn: [0, 0, top.lean * 2 + (random() - 0.5) * 0.3], color: capTints[index % capTints.length] });
      else if (a.tops === 'puffballs') {
        const size = top.r * (1.4 + random() * 0.8);
        balls.push({ at: [top.x, top.y + size * 0.5, top.z], size: [size, size * 0.9, size], color: capTints[index % 4] });
        if (random() < 0.5) balls.push({ at: [top.x + top.r, top.y + size * 0.2, top.z + top.r * 0.6], size: [size * 0.5, size * 0.5, size * 0.5], color: '#f1ecdc' });
      } else if (a.tops === 'coral') {
        for (let b = 0; b < 3; b++) {
          const angle = random() * 6.28, reach = top.r * (1.5 + random() * 2);
          const mid: P3 = [top.x + Math.sin(angle) * reach * 0.5, top.y + reach * 0.9, top.z + Math.cos(angle) * reach * 0.3];
          s.rod([top.x, top.y - 0.03, top.z], mid, top.r * 0.35, lit, top.r * 0.2);
          for (const fork of [-1, 1]) s.rod(mid, [mid[0] + fork * reach * 0.35, mid[1] + reach * (0.5 + random() * 0.5), mid[2]], top.r * 0.2, lit, top.r * 0.07);
        }
      } else if (a.tops === 'shelves') {
        for (let b = 0; b < 2 + Math.floor(random() * 2); b++) {
          const side = random() < 0.5 ? -1 : 1;
          bracket(s.root, { at: [top.x + side * top.r * 0.5, top.y - 0.1 - b * (0.22 + random() * 0.2), top.z + top.r * 0.6], radius: top.r * (1.6 + random()), yaw: side * 0.7 + (random() - 0.5) * 0.4, colours: ['#f1e3b6', '#f7f0d8', '#b8763c', '#dba552'], phase: random() * 6 });
        }
      }
      if (a.tops !== 'open' && a.tops !== 'caps') return;
    });
    if (capItems.length) {
      cluster(s.root, domeGeometry(1, 1, 0.9, 14), paint('#ffffff', { side: THREE.DoubleSide }), capItems);
      cluster(s.root, new THREE.CylinderGeometry(0.9, 0.3, 0.2, 12, 1, true), lit, capItems.map((c) => ({ at: [c.at[0], c.at[1] - c.size[1] * 0.2, c.at[2]] as P3, size: [c.size[0], c.size[1], c.size[2]] as P3, turn: c.turn })));
    }
    if (balls.length) cluster(s.root, new THREE.SphereGeometry(1, 12, 8), paint('#ffffff', { roughness: 0.95 }), balls);
    if (a.tops === 'open') cluster(s.root, new THREE.CylinderGeometry(0.85, 0.85, 0.02, 10), hollow, tops.map((top) => ({ at: [top.x, top.y - 0.03, top.z] as P3, size: [top.r, 1, top.r] as P3 })));

    // ---- who played it last
    if (a.player === 'nobody') {
      s.box([1.5, 0.04, 0.44], [0, 0.93, 0.4], oak).rotation.x = 0.28;
      const crust = Array.from({ length: 16 }, () => ({ at: [(random() - 0.5) * 1.4, 0.96 + random() * 0.04, 0.25 + random() * 0.3] as P3, size: [0.05 + random() * 0.06, 0.02, 0.05 + random() * 0.06] as P3, color: ['#b9c9a0', '#dfe4cc', '#93a886'][Math.floor(random() * 3)] }));
      cluster(s.root, new THREE.SphereGeometry(1, 7, 5), paint('#ffffff', { roughness: 1 }), crust).rotation.x = 0.0;
    } else {
      s.box([0.7, 0.36, 0.02], [0, 1.2, 0.2], dark).rotation.x = -0.2;
    }
    if (a.player === 'organist') {
      const sheet = s.label('♪ ♩ ♫ ♪ ♬', 0.5, 0.3, [0, 1.2, 0.225], '#2a2a2a', '#ece3c8');
      sheet.rotation.x = -0.2;
      const cardigan = new THREE.Group();
      for (let i = 0; i < 3; i++) put(cardigan, new THREE.Mesh(new THREE.BoxGeometry(0.34 - i * 0.02, 0.03, 0.26), s.material(i === 2 ? '#6a7a5a' : '#75866a')), [0, 0.64 + i * 0.03, 0]);
      put(bench, cardigan, [0.3, 0, 0]);
      put(bench, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.05), paint('#2a2a2a')), [-0.25, 0.635, 0.05]).rotation.y = 0.4;
      for (const dx of [-0.03, 0.03]) put(bench, new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 5, 12), paint('#c9a54a', { metalness: 0.8 })), [-0.25 + dx, 0.645, 0.0]).rotation.x = Math.PI / 2;
    } else if (a.player === 'remains') {
      const flesh = paint('#ffffff', { map: mottle(random, '#e6dcc4', ['#cbbf9f', '#f5f0e2', '#b0a685'], 90, 64) });
      const body = new THREE.Group();
      put(body, new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), flesh), [0, 0.9, -0.12]).scale.set(0.2, 0.3, 0.16);
      body.children[0].rotation.x = -0.75;
      put(body, new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 9), flesh), [0.04, 1.0, -0.42]);
      for (const side of [-1, 1]) {
        put(body, new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.42, 4, 8), flesh), [side * 0.24, 0.92, -0.38]).rotation.x = -1.35;
        put(body, new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 8), flesh), [side * 0.1, 0.66, 0.02]).rotation.x = Math.PI / 2;
        put(body, new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 8), flesh), [side * 0.1, 0.36, -0.16]);
      }
      const capMat = glow(tint, level * 0.6, { side: THREE.DoubleSide });
      for (let i = 0; i < 6; i++) mushroom(body, { at: [(random() - 0.5) * 0.3, 0.95 + random() * 0.15, -0.1 - random() * 0.3], height: 0.1 + random() * 0.16, cap: 0.05 + random() * 0.05, lean: [(random() - 0.5), (random() - 0.5)], capMat, gillMat: flesh, stalkMat: flesh });
      put(s.root, body, [0, 0, benchZ]).rotation.y = benchTurn;
    } else if (a.player === 'child') {
      const crate = s.material('#a8824e');
      s.box([0.42, 0.26, 0.3], [-0.2, 0.13, benchZ + 0.42], crate).rotation.y = 0.2;
      for (const y of [0.07, 0.19]) s.box([0.44, 0.02, 0.32], [-0.2, y, benchZ + 0.42], s.material('#7a5a34')).rotation.y = 0.2;
      // a dropped toy rabbit
      const toy = s.material('#c98a9a');
      s.ball([0.07, 0.09, 0.06], [0.45, 0.06, benchZ + 0.45], toy, 10);
      s.ball([0.05, 0.05, 0.05], [0.52, 0.11, benchZ + 0.5], toy, 10);
      for (const dz of [-0.025, 0.025]) s.ball([0.015, 0.05, 0.012], [0.57, 0.15, benchZ + 0.5 + dz], toy, 6).rotation.z = -0.7;
    } else if (a.player === 'fungus') {
      for (let i = 0; i < 9; i++) {
        const x = (random() - 0.5) * 1.3, top = tops[Math.floor(random() * tops.length)];
        strand(s.root, [x, 0.9, 0.46 - (i % 2) * 0.16], [top.x, baseY + 0.1 + random() * 0.5, top.z + 0.1], -0.12 - random() * 0.15, 0.014 + random() * 0.012, web, random);
      }
    }
    // webs: across the mouths when silent, between pipes when worn
    const webCount = (a.sound === 'silent' ? 12 : 0) + Math.round(take * 8);
    for (let i = 0; i < webCount; i++) {
      const p = tops[Math.floor(random() * (tops.length - 1))], q = tops[Math.min(tops.length - 1, tops.indexOf(p) + 1 + Math.floor(random() * 2))];
      const down = random() ** 2;
      strand(s.root, [p.x, mix(p.y, baseY + 0.3, down), p.z + p.r], [q.x, mix(q.y, baseY + 0.3, down), q.z + q.r], 0.08 + random() * 0.25, 0.007, web, random);
    }
    // creeping growth on the case
    const creep = Math.round(take * 26 * mix(0.7, 1.2, mood.density));
    if (creep) {
      const colours = ['#efe6ce', '#f1e3b6', '#a8683a', '#d99a4a'];
      for (let i = 0; i < Math.min(creep, 10); i++) {
        const side = random() < 0.5 ? -1 : 1, front = random() < 0.5;
        bracket(s.root, { at: front ? [(random() - 0.5) * W, 0.2 + random() * 0.9, 0.2] : [side * (W / 2), 0.2 + random() * 2.5, -0.25 + (random() - 0.5) * 0.6], radius: 0.12 + random() * 0.16, yaw: front ? 0 : side * Math.PI / 2, colours, phase: random() * 6 });
      }
      cluster(s.root, new THREE.SphereGeometry(1, 8, 6), paint('#ffffff', { roughness: 1 }), Array.from({ length: creep }, () => ({ at: [(random() - 0.5) * (W + 0.4), 0, 0.3 + (random() - 0.5) * 0.5 - (random() < 0.4 ? 0.9 : 0)] as P3, size: [0.1 + random() * 0.14, 0.05 + random() * 0.06, 0.1 + random() * 0.14] as P3, color: ['#dfd6bc', '#b9c9a0', '#efe9d8'][Math.floor(random() * 3)] })));
    }

    // ---- breath
    const voices = a.sound === 'plays' ? tops.length : a.sound === 'hum' ? Math.ceil(tops.length / 2) : a.sound === 'wheeze' ? 2 : 0;
    const speakers = [...tops].sort(() => random() - 0.5).slice(0, voices);
    const per = a.sound === 'plays' ? 10 : a.sound === 'hum' ? 5 : 9;
    const seeds = speakers.flatMap((top, voice) => Array.from({ length: per }, () => ({ top, voice, age: random(), dx: random() - 0.5, dz: random() - 0.5, size: 0.015 + random() ** 2 * 0.035 })));
    const cloud = seeds.length ? motes(s.root, tint, seeds.map(() => ({ at: [0, 0, 0] as P3, size: 0.02 }))) : null;
    const matrix = new THREE.Matrix4();
    const tempo = mix(0.25, 1.6, mood.energy);
    const breathe = (time: number) => {
      if (!cloud) return;
      seeds.forEach((seed, index) => {
        const phrase = a.sound === 'plays' ? Math.max(0, Math.sin(time * tempo * 2 + seed.voice * 1.7)) : 1;
        const age = (seed.age + time * tempo * 0.25) % 1;
        const size = seed.size * (1 - age * 0.6) * (0.25 + phrase * 0.75);
        matrix.makeScale(size, size, size).setPosition(seed.top.x + seed.dx * (0.05 + age * 0.5), seed.top.y + 0.1 + age * mix(0.5, 1.1, phrase), seed.top.z + 0.05 + seed.dz * (0.05 + age * 0.4));
        cloud.setMatrixAt(index, matrix);
      });
      cloud.instanceMatrix.needsUpdate = true;
      if (a.sound === 'hum' || a.sound === 'plays') lit.emissiveIntensity = level * (1 + 0.2 * Math.sin(time * tempo * 2));
    };
    breathe(0.4);
    if (cloud) cloud.frustumCulled = false;

    return s.finish({ update: (_dt, time) => breathe(time + 0.4) });
  },
});
