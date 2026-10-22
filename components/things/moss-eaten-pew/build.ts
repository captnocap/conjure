import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type P3, bracket, cluster, glow, mottle, mushroom, paint, put, toadstoolGeometry } from './fungi';

export default defineThing({
  questions: {
    seat: choice('What remains on the seat?', {
      hymnal: 'An open hymnal, pages swollen and furred, with a ribbon marker.',
      umbrella: 'A forgotten black umbrella leaning in the corner, and a pair of gloves.',
      sleeper: 'A seated shape of pale fungus, slumped where someone once sat, head bowed.',
      hat: 'A Sunday hat with a band and a folded coat.',
      candles: 'A row of burnt-down candle stubs and a jar of dead flowers: a private memorial.',
      hollow: 'Nothing, only a worn hollow in the moss the shape of a person.',
    }),
    ends: choice('How are the bench ends carved?', {
      poppyhead: 'Tall poppyhead finials, the classic medieval pew end.',
      scroll: 'A curved scrolled armrest, Victorian and comfortable.',
      gothic: 'A pointed panel pierced with a trefoil.',
      plain: 'Plain square boards, a poor parish.',
    }),
    moss: choice('What kind of growth is eating it?', {
      cushion: 'Bright green cushion moss in fat round pillows.',
      lichen: 'Dry grey-green and ochre lichen crusts.',
      golden: 'Golden-olive feather moss, soft and long.',
      wet: 'Dark wet moss studded with tiny glowing mushrooms.',
    }),
    sink: score('How far has it sunk?', ['Standing level on the floor', 'One end settling', 'Half swallowed and tilting badly']),
    through: choice('What grows through the boards?', {
      nothing: 'Nothing has broken through yet.',
      ferns: 'Ferns unrolling between the slats.',
      shelves: 'Shelf fungi stepping up the bench ends.',
      toadstools: 'A line of toadstools along the back rail like a row of heads.',
      sapling: 'A thin sapling that has split the seat.',
    }),
    kneeler: noul('Is there a kneeling board in front of it?'),
    books: noul('Are there hymn books still in the rack on its back?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const bench = new THREE.Group();
    s.root.add(bench);
    const L = 2.7, D = 0.5, seatY = 0.45, backY = 1.02;
    const oak = new THREE.Color('#6b4a30').lerp(new THREE.Color('#77766a'), mood.wear * 0.55).offsetHSL(0, 0, (mood.warmth - 0.5) * 0.05);
    const grain = mottle(random, '#' + oak.getHexString(), ['#4c3523', '#8a6b4a', '#59604a'], 70, 128);
    grain.repeat.set(3, 1);
    const wood = paint('#ffffff', { map: grain, roughness: 0.75 });
    const darkWood = paint(oak.clone().multiplyScalar(0.7));
    const mossTints = {
      cushion: ['#5f9a3a', '#7bb04a', '#4a7d2e', '#93c25c'],
      lichen: ['#a9b59a', '#c7c09a', '#8a9a82', '#c9a85a'],
      golden: ['#a59a3c', '#8a8a34', '#c2ae4e', '#6f7a30'],
      wet: ['#2f5a34', '#3c6a3a', '#244a30', '#4a7a46'],
    }[a.moss];
    const glowTint = new THREE.Color().setHSL(mix(0.5, 0.3, mood.warmth), 0.8, 0.6);
    const glowLevel = mix(0.4, 1, mood.cheer);

    // ---- the bench
    put(bench, new THREE.Mesh(new THREE.BoxGeometry(L, 0.05, D), wood), [0, seatY, 0.02]);
    put(bench, new THREE.Mesh(new THREE.BoxGeometry(L, 0.09, 0.04), wood), [0, seatY - 0.06, D / 2]);
    const back = put(bench, new THREE.Mesh(new THREE.BoxGeometry(L, backY - seatY + 0.05, 0.04), wood), [0, (backY + seatY) / 2, -D / 2 + 0.04]);
    back.rotation.x = -0.1;
    put(bench, new THREE.Mesh(new THREE.BoxGeometry(L + 0.04, 0.06, 0.09), darkWood), [0, backY + 0.03, -D / 2 - 0.005]);
    for (let i = 0; i < 6; i++) put(bench, new THREE.Mesh(new THREE.BoxGeometry(0.03, backY - seatY - 0.1, 0.02), darkWood), [(i - 2.5) * (L / 6), (backY + seatY) / 2, -D / 2 + 0.065]).rotation.x = -0.1;
    put(bench, new THREE.Mesh(new THREE.BoxGeometry(0.05, seatY, D * 0.8), wood), [0, seatY / 2, 0]);
    // carved ends
    const end = new THREE.Shape();
    const h = { poppyhead: 1.12, scroll: 0.86, gothic: 1.3, plain: 1.08 }[a.ends];
    end.moveTo(-0.32, 0);
    end.lineTo(0.3, 0);
    if (a.ends === 'scroll') {
      end.lineTo(0.3, 0.52);
      end.bezierCurveTo(0.42, 0.56, 0.42, 0.74, 0.28, 0.74);
      end.bezierCurveTo(0.1, 0.74, -0.05, 0.66, -0.16, 0.86);
      end.bezierCurveTo(-0.2, 1.08, -0.36, 1.12, -0.36, 0.98);
    } else if (a.ends === 'gothic') {
      end.lineTo(0.3, 0.7);
      end.quadraticCurveTo(0.2, 1.05, -0.02, h);
      end.quadraticCurveTo(-0.24, 1.05, -0.34, 0.7);
    } else if (a.ends === 'poppyhead') {
      end.lineTo(0.3, 0.6);
      end.quadraticCurveTo(0.12, 0.66, -0.08, 0.98);
      end.lineTo(-0.1, h);
      end.lineTo(-0.3, h);
      end.lineTo(-0.34, 0.9);
    } else {
      end.lineTo(0.3, 0.6);
      end.lineTo(-0.1, 0.72);
      end.lineTo(-0.1, h);
      end.lineTo(-0.34, h);
    }
    end.lineTo(-0.32, 0);
    if (a.ends === 'gothic') {
      const hole = new THREE.Path();
      for (let i = 0; i < 3; i++) hole.absarc(-0.02 + Math.sin(i * 2.09) * 0.07, 0.86 + Math.cos(i * 2.09) * 0.07, 0.06, 0, Math.PI * 2, i > 0);
      const trefoil = new THREE.Path().absarc(-0.02, 0.86, 0.1, 0, Math.PI * 2, true);
      end.holes.push(trefoil);
      void hole;
    }
    const endGeometry = new THREE.ExtrudeGeometry(end, { depth: 0.06, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 });
    for (const side of [-1, 1]) {
      const panel = put(bench, new THREE.Mesh(endGeometry, wood), [side * (L / 2) - (side > 0 ? 0 : 0.06), 0, 0]);
      panel.rotation.y = -Math.PI / 2;
      panel.position.x = side * (L / 2) + 0.03;
      if (a.ends === 'poppyhead') {
        const x = side * (L / 2), z = -0.2;
        put(bench, new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), darkWood), [x, h + 0.13, z]).scale.set(0.6, 1.25, 1);
        for (const lobe of [-1, 1]) put(bench, new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), darkWood), [x, h + 0.04, z + lobe * 0.085]).scale.set(0.6, 1, 1);
        put(bench, new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.2), darkWood), [x, h - 0.02, z]);
      }
    }
    // hymn-book rack on the back
    put(bench, new THREE.Mesh(new THREE.BoxGeometry(L - 0.2, 0.02, 0.1), darkWood), [0, 0.62, -D / 2 - 0.07]);
    put(bench, new THREE.Mesh(new THREE.BoxGeometry(L - 0.2, 0.09, 0.015), darkWood), [0, 0.67, -D / 2 - 0.12]);
    if (a.books) {
      const tints = ['#7a2a2a', '#2a3f6a', '#3c5a3a', '#2a2a2a', '#8a6a2a'];
      const count = Math.round(mix(3, 9, mood.density));
      for (let i = 0; i < count; i++) {
        const book = put(bench, new THREE.Mesh(new THREE.BoxGeometry(0.035 + random() * 0.02, 0.19, 0.13), s.material(tints[Math.floor(random() * tints.length)])), [(random() - 0.5) * (L - 0.5), 0.72, -D / 2 - 0.07]);
        book.rotation.z = (random() - 0.5) * 0.5;
        book.rotation.x = Math.PI / 2 - 1.45;
      }
    }
    if (a.kneeler) {
      put(bench, new THREE.Mesh(new THREE.BoxGeometry(L - 0.3, 0.05, 0.2), wood), [0, 0.16, 0.72]);
      put(bench, new THREE.Mesh(new THREE.BoxGeometry(L - 0.4, 0.05, 0.17), s.material('#7b2f3c')), [0, 0.2, 0.72]);
      for (const x of [-1, 1]) put(bench, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.22), darkWood), [x * (L / 2 - 0.3), 0.08, 0.72]);
    }

    // ---- what remains on the seat
    const spot = (random() - 0.5) * 1.2;
    const top = seatY + 0.025;
    if (a.seat === 'hymnal') {
      const cover = put(bench, new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.02, 0.3), s.material('#5a1f24')), [spot, top + 0.01, 0.05]);
      cover.rotation.y = (random() - 0.5) * 0.6;
      const page = paint('#e8dfc4', { map: mottle(random, '#e8dfc4', ['#b9c2a0', '#cdbf96', '#9aa78a'], 50, 64) });
      for (const side of [-1, 1]) {
        const leaf = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.27, 12, 1, false, -0.37, 0.74), page);
        leaf.rotation.x = Math.PI / 2;
        leaf.position.set(side * 0.105, -0.262, 0);
        cover.add(leaf);
        leaf.castShadow = true;
      }
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 0.42), paint('#b8323c'));
      ribbon.position.set(0.01, 0.045, 0.06);
      cover.add(ribbon);
    } else if (a.seat === 'umbrella') {
      const black = s.material('#1f2226');
      const umbrella = new THREE.Group();
      put(umbrella, new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.72, 10), black), [0, 0.42, 0]).rotation.x = Math.PI;
      put(umbrella, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.0, 6), s.material('#8a6a44')), [0, 0.5, 0]);
      put(umbrella, new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI), s.material('#8a6a44')), [0.045, 1.0, 0]);
      put(bench, umbrella, [L / 2 - 0.22, top - 0.42, 0.18]);
      umbrella.rotation.set(-0.45, 0, 0.12);
      for (const dx of [0, 0.09]) put(bench, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.2), s.material('#3a2c26')), [L / 2 - 0.6 + dx, top + 0.01 + dx * 0.15, 0.08]).rotation.y = 0.3 + dx * 3;
    } else if (a.seat === 'sleeper') {
      const flesh = paint('#ffffff', { map: mottle(random, '#e6dcc4', ['#cbbf9f', '#f5f0e2', '#b0a685'], 90, 64) });
      const body = new THREE.Group();
      put(body, new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), flesh), [0, 0.3, -0.06]).scale.set(0.21, 0.32, 0.16);
      put(body, new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), flesh), [0.03, 0.64, 0.06]).scale.set(0.115, 0.13, 0.12);
      for (const side of [-1, 1]) {
        put(body, new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.3, 4, 8), flesh), [side * 0.11, 0.05, 0.14]).rotation.x = Math.PI / 2;
        put(body, new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.32, 4, 8), flesh), [side * 0.11, -0.2, 0.32]);
        put(body, new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 8), flesh), [side * 0.21, 0.26, 0.06]).rotation.set(0.5, 0, side * 0.2);
      }
      const capMat = glow(glowTint, glowLevel * 0.5, { side: THREE.DoubleSide }), gillMat = paint('#f3ead2', { side: THREE.DoubleSide }), stalkMat = paint('#efe6ce');
      for (let i = 0; i < 5; i++) mushroom(body, { at: [(random() - 0.5) * 0.3, 0.5 + random() * 0.2, -0.08 + random() * 0.1], height: 0.1 + random() * 0.14, cap: 0.05 + random() * 0.05, lean: [(random() - 0.5) * 0.9, (random() - 0.5) * 0.9], capMat, gillMat, stalkMat });
      put(bench, body, [spot, top, -0.02]).rotation.z = (random() - 0.5) * 0.25;
    } else if (a.seat === 'hat') {
      const felt = s.material('#2c3440');
      put(bench, new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.012, 20), felt), [spot, top + 0.008, 0.04]);
      put(bench, new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.105, 0.11, 18), felt), [spot, top + 0.065, 0.04]);
      put(bench, new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.03, 18), s.material('#a34a55')), [spot, top + 0.03, 0.04]);
      for (let i = 0; i < 3; i++) put(bench, new THREE.Mesh(new THREE.BoxGeometry(0.42 - i * 0.03, 0.035, 0.32), s.material(i === 1 ? '#7a6a52' : '#8c7a5e')), [spot + 0.55, top + 0.02 + i * 0.035, 0.03]).rotation.y = (random() - 0.5) * 0.15;
    } else if (a.seat === 'candles') {
      const wax = paint('#efe4c4');
      const n = 5 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        const x = spot + (i - n / 2) * 0.11 + (random() - 0.5) * 0.03, stub = 0.03 + random() * 0.1;
        put(bench, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, stub, 8), wax), [x, top + stub / 2, 0.1 + (random() - 0.5) * 0.08]);
        put(bench, new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.008, 10), wax), [x, top + 0.004, 0.1]);
      }
      const jarX = spot + n * 0.07 + 0.1;
      put(bench, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.14, 12), new THREE.MeshStandardMaterial({ color: '#cfe0dc', transparent: true, opacity: 0.45, roughness: 0.1 })), [jarX, top + 0.07, 0]);
      for (let i = 0; i < 5; i++) {
        const lean: P3 = [(random() - 0.5) * 0.2, 0.3 + random() * 0.14, (random() - 0.5) * 0.2];
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.34, 4), s.material('#6a6a3c'));
        put(bench, stem, [jarX + lean[0] / 2, top + 0.17, lean[2] / 2]).rotation.set(lean[2], 0, -lean[0]);
        put(bench, new THREE.Mesh(new THREE.SphereGeometry(0.03, 7, 5), s.material(['#8a5a4a', '#a88a5a', '#7a4a5a'][i % 3])), [jarX + lean[0], top + lean[1], lean[2]]).scale.y = 0.6;
      }
    }

    // ---- the growth that is eating it
    const pads: { at: P3; size: P3; color: string }[] = [];
    const amount = mix(0.45, 1.25, mood.wear * 0.5 + a.sink * 0.5) * mix(0.8, 1.2, mood.density);
    const flat = a.moss === 'lichen' ? 0.25 : a.moss === 'golden' ? 0.6 : 0.5;
    const pad = (at: P3, size: number) => pads.push({ at, size: [size * (0.8 + random() * 0.5), size * flat * (0.7 + random() * 0.6), size * (0.8 + random() * 0.5)], color: mossTints[Math.floor(random() * mossTints.length)] });
    const hollowAt = a.seat === 'hollow' ? spot : 99;
    for (let i = 0; i < 46 * amount; i++) {
      const x = (random() - 0.5) * L;
      if (Math.abs(x - hollowAt) < 0.26 || (a.seat !== 'hollow' && Math.abs(x - spot) < 0.3 && random() < 0.8)) continue;
      pad([x, top, (random() - 0.5) * D * 0.8 + 0.02], 0.05 + random() * 0.09);
    }
    for (let i = 0; i < 30 * amount; i++) pad([(random() - 0.5) * L, backY + 0.06, -D / 2 + (random() - 0.5) * 0.06], 0.05 + random() * 0.08);
    for (let i = 0; i < 26 * amount; i++) pad([(random() - 0.5) * L, seatY + 0.1 + random() ** 2 * (backY - seatY - 0.1), -D / 2 + 0.07], 0.04 + random() * 0.06);
    for (const side of [-1, 1]) for (let i = 0; i < 9 * amount; i++) pad([side * (L / 2 + 0.03), random() * h, (random() - 0.5) * 0.5], 0.04 + random() * 0.07);
    if (a.seat === 'hollow') {
      for (let i = 0; i < 22; i++) {
        const angle = (i / 22) * Math.PI * 2;
        pad([spot + Math.sin(angle) * 0.29, top, 0.02 + Math.cos(angle) * 0.2], 0.09 + random() * 0.04);
      }
      for (let i = 0; i < 12; i++) pad([spot + (random() - 0.5) * 0.4, seatY + 0.12 + random() * 0.42, -D / 2 + 0.075], 0.035);
      put(bench, new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), paint(oak.clone().multiplyScalar(0.55))), [spot, top, 0.02]).scale.set(0.22, 0.012, 0.16);
    }
    cluster(bench, new THREE.SphereGeometry(1, 9, 6), paint('#ffffff', { roughness: 1 }), pads);

    // ---- breaking through
    const capMat = glow(glowTint, a.moss === 'wet' ? glowLevel : glowLevel * 0.25, { side: THREE.DoubleSide });
    if (a.through === 'toadstools') {
      const red = paint(new THREE.Color('#b8402c').lerp(new THREE.Color('#d9b06a'), 1 - mood.cheer), { side: THREE.DoubleSide }), gillMat = paint('#f3ead2', { side: THREE.DoubleSide }), stalkMat = paint('#efe6ce');
      const n = 6 + Math.floor(random() * 5);
      for (let i = 0; i < n; i++) mushroom(bench, { at: [(i - (n - 1) / 2) * (L / n) + (random() - 0.5) * 0.12, backY + 0.05, -D / 2], height: 0.12 + random() * 0.2, cap: 0.07 + random() * 0.06, lean: [(random() - 0.5) * 0.4, (random() - 0.5) * 0.4], capMat: a.moss === 'wet' ? capMat : red, gillMat, stalkMat });
    } else if (a.through === 'shelves') {
      const colours = ['#efe6ce', '#f1e3b6', '#a8683a', '#d99a4a'];
      for (const side of [-1, 1]) for (let i = 0; i < 5; i++) bracket(bench, { at: [side * (L / 2 + 0.06), 0.2 + i * 0.19 + random() * 0.06, (random() - 0.5) * 0.4], radius: 0.13 + random() * 0.1, yaw: side * Math.PI / 2 + (random() - 0.5) * 0.5, colours, phase: random() * 6 });
    } else if (a.through === 'ferns') {
      const green = paint('#4f8a3a', { side: THREE.DoubleSide });
      const fronds: { at: P3; size: P3; turn: P3 }[] = [];
      for (let clump = 0; clump < 4; clump++) {
        const x = (random() - 0.5) * (L - 0.4), z = random() < 0.5 ? D / 2 + 0.06 : -D / 2 - 0.2;
        for (let i = 0; i < 7; i++) fronds.push({ at: [x, 0.02, z], size: [0.09, 0.45 + random() * 0.4, 1], turn: [0.5 + random() * 0.6, random() * 6.28, 0] });
      }
      const frond = new THREE.ConeGeometry(1, 1, 4, 1);
      frond.translate(0, 0.5, 0);
      frond.scale(1, 1, 0.12);
      for (const f of fronds) f.turn = [f.turn[0] * Math.cos(f.turn[1]), f.turn[1], f.turn[0] * Math.sin(f.turn[1])];
      cluster(bench, frond, green, fronds);
    } else if (a.through === 'sapling') {
      const x = -spot * 0.8 + 0.3, bark = s.material('#6a5a48');
      const trunk: P3[] = [[x, 0.05, 0.05], [x + 0.03, seatY, 0.04], [x - 0.04, 1.1, 0.0], [x + 0.05, 1.75, 0.05], [x, 2.25, 0.02]];
      put(bench, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trunk.map((p) => new THREE.Vector3(...p))), 16, 0.022, 6), bark));
      const leaves: { at: P3; size: P3; color: string }[] = [];
      for (let i = 0; i < 26; i++) {
        const y = 1.2 + random() * 1.1, r = (2.4 - y) * 0.32 * random();
        const angle = random() * 6.28;
        leaves.push({ at: [x + Math.sin(angle) * r, y, Math.cos(angle) * r], size: [0.07, 0.03, 0.05], color: ['#7ba848', '#93b85a', '#5f8f3a'][i % 3] });
      }
      cluster(bench, new THREE.SphereGeometry(1, 6, 4), paint('#ffffff'), leaves);
      for (const side of [-1, 1]) put(bench, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.06), wood), [x + side * 0.12, top + 0.03, 0.05]).rotation.z = side * 0.35;
    }
    if (a.moss === 'wet') {
      cluster(bench, toadstoolGeometry(2), capMat, Array.from({ length: Math.round(18 * amount) }, () => {
        const size = 0.04 + random() * 0.07, onBack = random() < 0.4;
        return { at: [(random() - 0.5) * L, onBack ? backY + 0.06 : top, onBack ? -D / 2 : (random() - 0.5) * D * 0.7] as P3, size: [size, size, size] as P3 };
      }));
    }

    // ---- sinking: tilt the bench into a mound of moss
    const tilt = a.sink * mix(0.6, 1, random());
    bench.rotation.z = (random() < 0.5 ? -1 : 1) * tilt * 0.17;
    bench.rotation.x = -tilt * 0.07;
    bench.position.y = -tilt * 0.2;
    const mound: { at: P3; size: P3; color: string }[] = [];
    const lowSide = bench.rotation.z > 0 ? -1 : 1;
    const groundCount = Math.round(mix(14, 60, a.sink) * mix(0.7, 1.2, mood.density));
    for (let i = 0; i < groundCount; i++) {
      const nearLow = random() < 0.5 + a.sink * 0.3;
      const x = nearLow ? lowSide * (L / 2) * (0.45 + random() * 0.6) : (random() - 0.5) * (L + 0.2);
      const z = (random() - 0.5) * 0.95;
      const size = (0.1 + random() * 0.14) * mix(0.8, 1.5, a.sink * (nearLow ? 1 : 0.4));
      mound.push({ at: [x, 0, z], size: [size, size * (a.moss === 'lichen' ? 0.35 : 0.7), size], color: mossTints[Math.floor(random() * mossTints.length)] });
    }
    cluster(s.root, new THREE.SphereGeometry(1, 10, 7), paint('#ffffff', { roughness: 1 }), mound);
    if (a.moss === 'golden') {
      // sporophytes: thin stalks with capsules
      cluster(s.root, new THREE.CylinderGeometry(0.004, 0.004, 1, 4), paint('#b4603a'), mound.slice(0, 30).map((m) => ({ at: [m.at[0] + (random() - 0.5) * 0.1, m.size[1] + 0.05, m.at[2] + (random() - 0.5) * 0.1] as P3, size: [1, 0.14 + random() * 0.1, 1] as P3 })));
    }

    return s.finish();
  },
});
