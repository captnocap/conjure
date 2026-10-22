import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type P3, cluster, glow, motes, mottle, mushroom, paint, put, strand, toadstoolGeometry } from './fungi';

const SPORES = {
  ghost: 'Pale ghost green, the classic foxfire glow.',
  cyan: 'Cold cyan, like deep-sea light.',
  amber: 'Warm amber gold, closest to real incense embers.',
  violet: 'Deep violet, strange and narcotic.',
  rose: 'Soft rose pink, tender and bodily.',
  bone: 'Dim bone white, more dust than light.',
} as const;
const SPORE_TINT: Record<keyof typeof SPORES, string> = {
  ghost: '#9dff8a', cyan: '#5fe9ff', amber: '#ffbf4d', violet: '#b987ff', rose: '#ff8fb5', bone: '#f3ecd2',
};

export default defineThing({
  questions: {
    support: choice('What does the censer hang from?', {
      crook: 'A tall wrought-iron crook stand with a scrolled arm, as in a side chapel.',
      arch: 'A small pointed stone arch, a fragment of the church itself.',
      stalk: 'A giant pale fungal stalk that has grown up and bent over to hold it.',
      tripod: 'Three lashed wooden staves, a pilgrim’s makeshift frame.',
    }),
    vessel: choice('What shape is the censer itself?', {
      globe: 'A round pierced globe with a small cross finial.',
      spire: 'A tall gothic tower with a pointed, pinnacled lid.',
      boat: 'A wide shallow bowl with a low domed lid.',
      cage: 'An open cage of bars through which the growth inside can be seen.',
    }),
    spores: choice('What colour are the spores it breathes out?', SPORES),
    keeper: choice('Is it tended, or does it move by itself?', {
      tended: 'Tended: polished metal, a fresh offering bowl and a snuffed taper at its foot.',
      abandoned: 'Abandoned: left to verdigris, barely moving, swung only by draughts.',
      selfmoving: 'Self-moving: threads of mycelium run from chain to frame and pull it like tendons.',
      burst: 'Burst: a fruiting body has pushed the lid open and crowns the vessel.',
    }),
    growth: score('How overgrown with puffballs is it?', ['A few pale buttons on the chains', 'Clusters at lid and foot', 'Smothered, more fungus than metal']),
    breath: score('How much does it breathe out?', ['A thin thread of motes', 'A slow steady plume', 'A thick billowing cloud that pools on the floor']),
    beneath: choice('What lies on the ground beneath it?', {
      bare: 'Nothing, bare flagstone.',
      drift: 'A soft glowing drift of settled spores.',
      ring: 'A fairy ring of small mushrooms seeded by the fall.',
      kneeler: 'A mouldering kneeling cushion, dented by knees.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = SPORE_TINT[a.spores];
    const glowLevel = mix(0.7, 1.7, mood.cheer) * mix(1.25, 0.85, Math.sin(mood.daylight * Math.PI));
    const polished = a.keeper === 'tended';
    const brassColour = new THREE.Color(polished ? '#c9973a' : '#8f7a45').lerp(new THREE.Color('#4f8f7c'), polished ? mood.wear * 0.2 : 0.08 + mood.wear * 0.6);
    const brass = paint(brassColour, { metalness: polished ? 0.85 : 0.45, roughness: polished ? 0.3 : 0.65, side: THREE.DoubleSide });
    const iron = s.material('#2c2b2e', { metalness: 0.6, roughness: 0.55 });
    const stone = s.material('#b6b0a0', { map: mottle(random, '#b6b0a0', ['#8f9a78', '#d2ccbb', '#7d7a70']) });
    const wood = s.material('#6a4b34');
    const pale = paint('#e9e1cc', { map: mottle(random, '#ece4cf', ['#cbbf9f', '#f7f2e4', '#a9a07f'], 90) });
    const puffMat = paint('#ffffff', { roughness: 0.9 });
    const lit = glow(tint, glowLevel, { side: THREE.DoubleSide });
    const ember = glow(tint, glowLevel * 1.6);
    const web = paint('#f1ecdc', { roughness: 0.95 });

    const pivotY = 2.55, drop = 1.3, R = 0.36, k = 1.5;
    const pivot: P3 = [0, pivotY, 0];
    let swingAxis: 'x' | 'z' = 'z';
    let reach = 1;

    // ---- the frame it hangs from
    if (a.support === 'crook') {
      s.cylinder(0.3, 0.36, 0.1, [0, 0.05, -0.75], iron, 8);
      s.cylinder(0.035, 0.05, 2.75, [0, 1.45, -0.75], iron, 10);
      s.tube([[0, 2.8, -0.75], [0, 3.02, -0.55], [0, 2.95, -0.2], [0, 2.7, 0], [0, 2.6, 0.02]], 0.03, iron);
      s.ring(0.14, 0.02, [0, 2.62, -0.52], iron).rotation.y = Math.PI / 2;
      s.ring(0.09, 0.016, [0, 2.2, -0.63], iron, Math.PI * 1.5).rotation.y = Math.PI / 2;
      for (const side of [-1, 1]) s.rod([0, 0.1, -0.75], [side * 0.34, 0.02, -0.55], 0.025, iron);
    } else if (a.support === 'arch') {
      reach = 0.75;
      for (const side of [-1, 1]) {
        s.box([0.3, 0.16, 0.34], [side * 1.05, 0.08, 0], stone);
        s.cylinder(0.1, 0.12, 1.75, [side * 1.05, 1.02, 0], stone, 10);
        s.box([0.28, 0.1, 0.3], [side * 1.05, 1.93, 0], stone);
        const rib: P3[] = [];
        for (let i = 0; i <= 6; i++) {
          const t = i / 6;
          rib.push([side * (1.05 - 1.05 * Math.sin((t * Math.PI) / 2) ** 1.3), 1.95 + 1.05 * Math.sin((t * Math.PI) / 2.2), 0]);
        }
        s.tube(rib, 0.1, stone);
      }
      s.ball([0.16, 0.2, 0.16], [0, 3.02, 0], stone, 10);
      s.rod([0, 2.95, 0], [0, pivotY, 0], 0.015, iron);
    } else if (a.support === 'stalk') {
      const stalkMat = paint('#e6dcc2', { map: mottle(random, '#e6dcc2', ['#c9bb97', '#f4eedd', '#b3a37c'], 120) });
      const curve = new THREE.CatmullRomCurve3([[0.05, 0, -0.85], [-0.06, 0.9, -0.9], [0.04, 1.9, -0.82], [0, 2.75, -0.55], [0, 2.95, -0.18], [0, 2.72, 0.02]].map((p) => new THREE.Vector3(...p)));
      for (let i = 0; i < 14; i++) {
        const p = curve.getPoint(i / 13), q = curve.getPoint(Math.min(1, i / 13 + 0.08));
        s.rod(p.toArray() as P3, q.toArray() as P3, mix(0.2, 0.07, i / 13), stalkMat, mix(0.19, 0.065, i / 13));
      }
      s.ball([0.34, 0.14, 0.34], [0.05, 0.05, -0.85], stalkMat, 12);
      mushroom(s.root, { at: [0, 2.68, 0.02], height: 0.02, cap: 0.34, capHeight: 0.2, capMat: pale, gillMat: lit, stalkMat: stalkMat });
      for (let i = 0; i < 4; i++) {
        const p = curve.getPoint(0.15 + i * 0.17);
        mushroom(s.root, { at: [p.x + (i % 2 ? 0.12 : -0.12), p.y, p.z + 0.08], height: 0.16, cap: 0.1 + random() * 0.06, lean: [0.5, i % 2 ? -0.7 : 0.7], capMat: pale, gillMat: lit, stalkMat });
      }
    } else {
      reach = 0.45;
      swingAxis = 'x';
      const feet: P3[] = [[0, 0, -0.95], [-0.85, 0, 0.5], [0.85, 0, 0.5]];
      for (const [index, foot] of feet.entries()) s.rod(foot, [-foot[0] * 0.12, 2.95 + index * 0.06, -foot[2] * 0.12], 0.045, wood, 0.03);
      for (let i = 0; i < 5; i++) s.ring(0.085, 0.014, [0, 2.6 + i * 0.03, 0], s.material('#b9a47a')).rotation.x = Math.PI / 2 + (random() - 0.5) * 0.3;
      s.rod([0, 2.75, 0], [0, pivotY, 0], 0.012, iron);
    }

    // ---- the swinging part: chains, vessel, growth
    const swing = new THREE.Group();
    swing.position.set(...pivot);
    s.root.add(swing);
    put(swing, new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 6, 16), iron), [0, 0, 0]);
    put(swing, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 12), brass), [0, -0.09, 0]);

    const tall = a.vessel === 'spire', wide = a.vessel === 'boat';
    const bowlR = wide ? R * 1.3 : R, bowlH = wide ? 0.3 : 0.42;
    const rimY = -drop;
    // bowl: foot, belly, rim
    put(swing, new THREE.Mesh(new THREE.LatheGeometry([[0.001, -bowlH - 0.1], [bowlR * 0.5, -bowlH - 0.1], [bowlR * 0.42, -bowlH - 0.04], [bowlR * 0.3, -bowlH], [bowlR * 0.8, -bowlH * 0.65], [bowlR, -bowlH * 0.2], [bowlR * 0.96, 0], [bowlR * 1.05, 0.02]].map(([x, y]) => new THREE.Vector2(x, y)), 24), brass), [0, rimY, 0]);
    put(swing, new THREE.Mesh(new THREE.CylinderGeometry(bowlR * 0.9, bowlR * 0.85, 0.02, 20), ember), [0, rimY - 0.02, 0]);
    // lid
    const lid = new THREE.Group();
    put(swing, lid, [0, rimY + 0.03, 0]);
    let lidTop = 0.3 * k;
    if (a.vessel === 'cage') {
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const bar: THREE.Vector3[] = [];
        for (let j = 0; j <= 5; j++) bar.push(new THREE.Vector3(Math.sin(angle) * R * Math.cos((j / 5) * 1.45), R * 1.5 * Math.sin((j / 5) * 1.5), Math.cos(angle) * R * Math.cos((j / 5) * 1.45)));
        put(lid, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bar), 8, 0.012, 5), brass));
      }
      put(lid, new THREE.Mesh(new THREE.TorusGeometry(R * 0.72, 0.012, 6, 20), brass), [0, R * 1.02, 0]).rotation.x = Math.PI / 2;
      put(lid, new THREE.Mesh(new THREE.SphereGeometry(R * 0.6, 12, 8), ember), [0, R * 0.35, 0]).scale.y = 0.8;
      lidTop = R * 1.52;
    } else {
      const profile: [number, number][] = (tall
        ? [[R * 1.02, 0], [R * 0.95, 0.08], [R * 0.7, 0.16], [R * 0.74, 0.2], [R * 0.5, 0.34], [R * 0.52, 0.38], [R * 0.22, 0.6], [0.02, 0.74]]
        : wide
          ? [[bowlR * 1.02, 0], [bowlR * 0.9, 0.07], [bowlR * 0.55, 0.15], [bowlR * 0.2, 0.19], [0.03, 0.2]]
          : [[R * 1.02, 0], [R * 0.98, 0.1], [R * 0.75, 0.22], [R * 0.4, 0.3], [0.03, 0.33]] as [number, number][]).map(([x, y]) => [x, y * k] as [number, number]);
      lidTop = profile[profile.length - 1][1];
      put(lid, new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 24), brass));
      // pierced openings glowing from within
      const holes: { at: P3; size: P3; turn: P3 }[] = [];
      const rows = tall ? 3 : 2;
      for (let row = 0; row < rows; row++) {
        const t = (row + 0.6) / (rows + 0.6);
        const index = Math.min(profile.length - 2, Math.floor(t * (profile.length - 1)));
        const [x0, y0] = profile[index], [x1, y1] = profile[index + 1];
        const radius = (x0 + x1) / 2 + 0.004, y = (y0 + y1) / 2;
        const n = row === 0 ? 10 : 7;
        for (let i = 0; i < n; i++) {
          const angle = ((i + row * 0.5) / n) * Math.PI * 2;
          holes.push({ at: [Math.sin(angle) * radius, y, Math.cos(angle) * radius], size: [0.04, tall ? 0.085 : 0.06, 0.016], turn: [0, angle, 0] });
        }
      }
      cluster(lid, new THREE.SphereGeometry(1, 8, 6), ember, holes);
      if (tall) for (let i = 0; i < 4; i++) put(lid, new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.2, 6), brass), [Math.sin(i * 1.57 + 0.78) * R * 0.72, 0.38, Math.cos(i * 1.57 + 0.78) * R * 0.72]);
    }
    // finial cross
    put(lid, new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.025), brass), [0, lidTop + 0.08, 0]);
    put(lid, new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.025), brass), [0, lidTop + 0.11, 0]);
    if (a.keeper === 'burst') {
      lid.rotation.z = -1.5;
      lid.position.x += bowlR * 1.25;
      lid.position.y -= 0.2;
      lid.position.y += 0.02;
      mushroom(swing, { at: [0, rimY - 0.05, 0], height: 0.5, cap: bowlR * 1.15, capHeight: 0.3, stalk: 0.09, lean: [0.1, -0.15], capMat: pale, gillMat: lit, stalkMat: pale });
      for (let i = 0; i < 3; i++) mushroom(swing, { at: [(random() - 0.5) * bowlR, rimY - 0.04, (random() - 0.5) * bowlR], height: 0.14 + random() * 0.1, cap: 0.07 + random() * 0.04, lean: [(random() - 0.5) * 0.8, (random() - 0.5) * 0.8], capMat: pale, gillMat: lit, stalkMat: pale });
    }

    // chains: three to the rim, one to the lid
    const chainMat = polished ? brass : iron;
    const anchors: P3[] = [];
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + 0.5;
      const end: P3 = [Math.sin(angle) * bowlR * 1.02, rimY + 0.02, Math.cos(angle) * bowlR * 1.02];
      anchors.push(end);
      const start: P3 = [Math.sin(angle) * 0.09, -0.09, Math.cos(angle) * 0.09];
      const links = 16;
      const items = Array.from({ length: links }, (_unused, k) => {
        const t = (k + 0.5) / links;
        return { at: [mix(start[0], end[0], t), mix(start[1], end[1], t), mix(start[2], end[2], t)] as P3, size: 1, turn: [0, k % 2 ? Math.PI / 2 : 0, 0] as P3 };
      });
      cluster(swing, new THREE.TorusGeometry(0.03, 0.008, 5, 10), chainMat, items);
    }
    if (a.keeper !== 'burst') put(swing, new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, drop - lidTop - 0.2, 5), chainMat), [0, (-0.09 + rimY + lidTop + 0.1) / 2, 0]);

    // puffballs: on the chains, at lid and foot
    const growth = mix(0.15, 1, a.growth) * mix(0.75, 1.2, mood.density);
    const puffs: { at: P3; size: P3; color: string }[] = [];
    const puffTints = ['#f2ead6', '#e3d6b6', '#d9c9a2', '#f7f3e6', '#c9b98f'];
    const puff = (at: P3, size: number) => puffs.push({ at, size: [size, size * (0.8 + random() * 0.25), size], color: puffTints[Math.floor(random() * puffTints.length)] });
    for (const end of anchors) {
      const n = Math.round(2 + growth * 7);
      for (let i = 0; i < n; i++) {
        const t = random() ** 0.7;
        puff([mix(end[0] * 0.3, end[0], t) + (random() - 0.5) * 0.04, mix(-0.15, end[1], t), mix(end[2] * 0.3, end[2], t) + (random() - 0.5) * 0.04], mix(0.03, 0.075, random()) * mix(0.8, 1.3, growth));
      }
    }
    const body = Math.round(growth * 22);
    for (let i = 0; i < body; i++) {
      const angle = random() * Math.PI * 2, band = random();
      const y = band < 0.45 ? rimY + (random() - 0.3) * 0.08 : rimY - bowlH * (0.75 + random() * 0.45);
      const radius = band < 0.45 ? bowlR * 1.03 : bowlR * mix(0.75, 0.3, random());
      puff([Math.sin(angle) * radius, y, Math.cos(angle) * radius], mix(0.04, 0.11, random() ** 1.5) * mix(0.8, 1.3, growth));
    }
    cluster(swing, new THREE.SphereGeometry(1, 10, 7), puffMat, puffs);
    // each large puffball has a dark pore that smokes
    cluster(swing, new THREE.SphereGeometry(1, 6, 4), paint('#4d4332'), puffs.filter((p) => p.size[0] > 0.06).map((p) => ({ at: [p.at[0], p.at[1] + p.size[1] * 0.92, p.at[2]] as P3, size: [p.size[0] * 0.25, p.size[0] * 0.12, p.size[0] * 0.25] as P3 })));

    // mycelial tendons for the self-moving one; stray webs when worn
    const top: P3 = a.support === 'tripod' ? [0, 2.9, 0] : a.support === 'arch' ? [0.6, 2.75, 0] : [0, 2.9, -0.5];
    if (a.keeper === 'selfmoving') {
      for (let i = 0; i < 7; i++) {
        const end = anchors[i % 3];
        const far: P3 = a.support === 'arch' ? [(i % 2 ? 1 : -1) * 1.0, 1.3 + random() * 0.9, 0] : a.support === 'tripod' ? [(i % 2 ? 1 : -1) * 0.5, 0.9 + random() * 0.8, 0.3] : [(random() - 0.5) * 0.1, 0.8 + random() * 1.5, -0.75];
        strand(s.root, [end[0] * (0.4 + random() * 0.6), pivotY + mix(-0.2, rimY, random() ** 0.6), end[2]], far, 0.1 + random() * 0.25, 0.012 + random() * 0.012, web, random);
      }
    }
    const webs = Math.round(mood.wear * 5 + (a.keeper === 'abandoned' ? 4 : 0));
    for (let i = 0; i < webs; i++) strand(s.root, [top[0] + (random() - 0.5) * 0.3, top[1] - random() * 0.4, top[2] + (random() - 0.5) * 0.2], [(random() - 0.5) * 0.25, pivotY - 0.1 - random() * 0.6, (random() - 0.5) * 0.1], 0.15 + random() * 0.3, 0.006, web, random);

    // ---- what lies beneath
    if (a.keeper === 'tended') {
      s.lathe([[0.001, 0], [0.09, 0], [0.05, 0.03], [0.13, 0.09], [0.14, 0.1]], brass, [0.5, 0, 0.45]);
      s.cylinder(0.11, 0.11, 0.01, [0.5, 0.085, 0.45], ember, 12);
      s.rod([-0.55, 0.012, 0.5], [-0.25, 0.012, 0.62], 0.012, s.material('#efe6c8'));
    }
    if (a.beneath === 'drift' || a.breath > 0.75) {
      const heap = Array.from({ length: 16 }, () => {
        const angle = random() * Math.PI * 2, r = random() ** 0.7 * 0.75;
        return { at: [Math.sin(angle) * r, 0, Math.cos(angle) * r] as P3, size: [0.16 + random() * 0.2, 0.025 + random() * 0.04, 0.16 + random() * 0.2] as P3 };
      });
      cluster(s.root, new THREE.SphereGeometry(1, 10, 6), glow(tint, glowLevel * 0.55, { roughness: 1 }), a.beneath === 'drift' ? heap : heap.slice(0, 7));
    }
    if (a.beneath === 'ring') {
      const n = 13 + Math.floor(random() * 6);
      cluster(s.root, toadstoolGeometry(), paint('#ffffff', { emissive: tint, emissiveIntensity: glowLevel * 0.6 }), Array.from({ length: n }, (_unused, i) => {
        const angle = (i / n) * Math.PI * 2 + random() * 0.2, r = 0.72 + (random() - 0.5) * 0.1, size = 0.14 + random() * 0.14;
        return { at: [Math.sin(angle) * r, 0, Math.cos(angle) * r] as P3, size: [size * 1.3, size, size * 1.3] as P3, color: puffTints[i % puffTints.length], turn: [(random() - 0.5) * 0.4, 0, (random() - 0.5) * 0.4] as P3 };
      }));
    }
    if (a.beneath === 'kneeler') {
      const cushion = s.box([0.62, 0.11, 0.36], [0, 0.085, 0.6], s.material('#7b2f3c', { map: mottle(random, '#7b2f3c', ['#5f7a4c', '#a34a55', '#3f2a2c'], 80) }));
      cushion.rotation.y = (random() - 0.5) * 0.3;
      s.box([0.7, 0.04, 0.42], [0, 0.02, 0.6], wood).rotation.y = cushion.rotation.y;
      for (const side of [-1, 1]) s.ball([0.1, 0.03, 0.09], [side * 0.14, 0.135, 0.6], s.material('#5a2029'), 10);
    }

    // ---- the breath: motes that leave the lid, trail behind the swing and sink
    const count = Math.round(mix(30, 260, a.breath) * mix(0.8, 1.2, mood.density));
    const seeds = Array.from({ length: count }, () => ({ age: random(), angle: random() * Math.PI * 2, spread: random(), wobble: random() * 6.28, size: mix(0.018, 0.05, random() ** 2) }));
    const cloud = motes(s.root, tint, seeds.map(() => ({ at: [0, 0, 0] as P3, size: 0.02 })), 0.9);
    const amplitude = (a.keeper === 'abandoned' ? 0.25 : a.keeper === 'selfmoving' ? 1.15 : 1) * mix(0.1, 0.62, mood.energy) * reach;
    const rate = mix(0.9, 2.3, mood.energy);
    const matrix = new THREE.Matrix4();
    const phase = 0.9 + random() * 0.6;
    const life = mix(2.6, 1.3, a.breath * 0.4);
    const place = (time: number) => {
      const angle = amplitude * Math.sin(time * rate + phase);
      if (swingAxis === 'z') swing.rotation.z = angle;
      else swing.rotation.x = angle;
      seeds.forEach((seed, index) => {
        const age = (seed.age + (time * mix(0.05, 0.16, mood.energy)) / life) % 1;
        // where the censer was when this mote left it
        const then = amplitude * Math.sin((time - age * 3) * rate + phase);
        const length = drop - lidTop * 0.5;
        const ox = swingAxis === 'z' ? Math.sin(then) * length : 0, oz = swingAxis === 'x' ? -Math.sin(then) * length : 0;
        const oy = pivotY - Math.cos(then) * length;
        const rise = Math.sin(Math.min(age * 4, 1) * Math.PI * 0.5) * 0.35;
        const fall = Math.max(0, age - 0.2) ** 1.4 * (oy + 0.3) * 1.25;
        const widen = (0.05 + age * mix(0.3, 0.75, a.breath)) * (0.4 + seed.spread);
        const y = Math.max(0.02, oy + rise - fall);
        const pooled = y <= 0.021 ? 1.6 : 1;
        const size = seed.size * (1 - age * 0.5) * mix(0.9, 1.35, a.breath);
        matrix.makeScale(size, size, size).setPosition(ox + Math.sin(seed.angle + time * 0.3 + seed.wobble) * widen * pooled, y, oz + Math.cos(seed.angle + seed.wobble * 0.5) * widen * pooled);
        cloud.setMatrixAt(index, matrix);
      });
      cloud.instanceMatrix.needsUpdate = true;
    };
    place(0);
    cloud.frustumCulled = false;
    return s.finish({ footprint: 1.1, update: (_dt, time) => place(time) });
  },
});
