import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';
import { monkeyHead, sittingBody, type V3 } from './primate';

interface Big { obj: THREE.Object3D; home: V3; rest: number; trace: 'peel' | 'crumbs' | 'spill' }
interface Dot { at: V3; size: number; color?: THREE.ColorRepresentation }

export default defineThing({
  questions: {
    offered: choice('What was offered?', {
      fruit: 'A fruit pyramid: a hand of bananas, oranges and apples stacked, split coconut halves.',
      sweets: 'Sweets and coins: a pyramid of orange laddoos, squares of silvered barfi, sticky jalebi spirals, loose change.',
      flowers: 'Flowers and rice: a heap of marigolds, a mound of white rice, cones of red and yellow powder, a clay lamp.',
      lunch: "A tourist's whole lunch, set down for one second: sandwich halves, a crisp packet, a juice box, a banana.",
    }),
    raid: score('How far has the raid gone?', ['Untouched and perfect', 'One piece gone, one peel left behind', 'Half of it dragged off the tray', 'A scattered wreck, almost nothing left on the plate']),
    thief: noul('Is a small monkey still there with its hand in the tray?'),
    incense: noul('Is incense burning beside it?'),
    tray: choice('What holds the offering?', {
      brass: 'A rimmed brass puja tray on a low brass tripod.',
      copper: 'A beaten copper plate straight on the ground.',
      steel: 'A stainless steel thali on a small wooden stool.',
      leaf: 'A fresh green banana leaf laid on a stone step.',
      pattal: 'A stitched plate of dried leaves on the bare ground.',
    }),
    prints: choice('What have the small hands left behind?', {
      dust: 'Dusty grey palm prints around the tray.',
      powder: 'Bright red and yellow powder handprints.',
      sticky: 'Dark sticky prints and smears.',
      none: 'No prints: a clean getaway.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const Rt = 0.2;
    const r = a.raid;

    // The stand and the tray.
    let ty = 0.012;
    let slab: [number, number] | null = null, slabH = 0;
    const metal = (hex: string) => s.material(new THREE.Color(hex).lerp(new THREE.Color('#6d6a52'), mood.wear * 0.35), { metalness: 0.85, roughness: 0.25 + mood.wear * 0.4, emissive: new THREE.Color(hex).multiplyScalar(0.18) });
    const dish = (material: THREE.Material, y: number) => s.lathe([[0, 0.01], [Rt * 0.84, 0.01], [Rt * 0.98, 0.034], [Rt * 1.05, 0.036], [Rt * 1.05, 0.026], [Rt * 0.9, 0], [0, 0]], material, [0, y, 0]);
    if (a.tray === 'brass') {
      const brass = metal('#c9982f');
      const h = 0.13;
      s.lathe([[0.1, 0], [0.11, 0.012], [0.05, 0.03], [0.03, 0.07], [0.06, 0.11], [0.12, h], [0, h]], brass);
      for (let i = 0; i < 3; i++) s.rod([Math.sin(i * 2.094) * 0.07, 0.03, Math.cos(i * 2.094) * 0.07], [Math.sin(i * 2.094) * 0.15, 0, Math.cos(i * 2.094) * 0.15], 0.012, brass, 0.016);
      dish(brass, h);
      ty = h + 0.012;
    } else if (a.tray === 'copper') {
      dish(metal('#b5673a'), 0);
    } else if (a.tray === 'steel') {
      const wood = s.material('#8a6238'), h = 0.2;
      s.box([0.3, 0.025, 0.3], [0, h - 0.0125, 0], wood);
      for (const x of [-0.12, 0.12]) for (const z of [-0.12, 0.12]) s.rod([x * 1.15, 0, z * 1.15], [x, h - 0.02, z], 0.016, wood);
      for (const z of [-0.13, 0.13]) s.box([0.26, 0.016, 0.016], [0, h * 0.4, z], wood);
      dish(s.material('#cfd3d6', { metalness: 0.9, roughness: 0.18 + mood.wear * 0.3 }), h);
      ty = h + 0.012;
    } else if (a.tray === 'leaf') {
      slab = [0.8, 0.62];
      slabH = 0.1;
      s.box([slab[0], slabH, slab[1]], [0, slabH / 2, 0], s.material('#b3a892'));
      s.box([slab[0] + 0.03, 0.02, slab[1] + 0.03], [0, slabH - 0.01, 0], s.material('#9c917c'));
      const green = s.material(new THREE.Color('#3f8f3a').lerp(new THREE.Color('#8a8a4a'), mood.wear * 0.5), { roughness: 0.5 });
      s.ball([Rt * 1.55, 0.005, Rt * 0.95], [0, slabH + 0.005, 0], green, 24);
      s.rod([-Rt * 1.55, slabH + 0.009, 0], [Rt * 1.55, slabH + 0.009, 0], 0.006, s.material('#b7cf7a'));
      for (let i = -5; i <= 5; i++) if (i) s.rod([i * 0.05, slabH + 0.0095, -Rt * 0.8 * Math.sqrt(1 - (i / 6.2) ** 2)], [i * 0.05 + 0.03, slabH + 0.0095, Rt * 0.8 * Math.sqrt(1 - (i / 6.2) ** 2)], 0.0022, s.material('#2f7030'));
      ty = slabH + 0.011;
    } else {
      const dry = s.material('#9a9455', { roughness: 0.9 });
      s.lathe([[0, 0.006], [Rt * 0.8, 0.006], [Rt * 1.08, 0.03], [Rt * 1.08, 0.022], [Rt * 0.85, 0], [0, 0]], dry);
      for (let i = 0; i < 7; i++) s.rod([0, 0.0075, 0], [Math.sin(i * 0.9) * Rt * 0.95, 0.02, Math.cos(i * 0.9) * Rt * 0.95], 0.0025, s.material('#6c6a35'));
      ty = 0.008;
    }
    const groundAt = (x: number, z: number) => (slab && Math.abs(x) < slab[0] / 2 - 0.02 && Math.abs(z) < slab[1] / 2 - 0.02 ? slabH : 0);
    const thrown = (): [number, number] => {
      for (let tries = 0; tries < 8; tries++) {
        const t = random() * Math.PI * 2, d = Rt * (1.28 + random() * 0.75);
        const x = Math.cos(t) * d, z = Math.sin(t) * d * 0.9;
        if (!(a.thief && x < -Rt && Math.abs(z) < 0.16)) return [x, z];
      }
      return [Rt * 1.7, 0.1];
    };

    // Pieces.
    const yellow = s.material('#f1c232', { roughness: 0.5 }), brownTip = s.material('#4a3520');
    const bananaGeometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.075, 0, 0), new THREE.Vector3(0, 0, 0.05), new THREE.Vector3(0.075, 0, 0)), 12, 0.017, 8);
    const banana = () => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(bananaGeometry, yellow));
      for (const x of [-0.078, 0.078]) {
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), brownTip);
        tip.position.set(x, 0, -0.002);
        g.add(tip);
      }
      return g;
    };
    const peel = (x: number, z: number) => {
      const y = groundAt(x, z);
      for (let i = 0; i < 4; i++) {
        const strip = s.ball([0.05, 0.005, 0.013], [x + Math.cos(i * 1.57 + 0.4) * 0.04, y + 0.006, z + Math.sin(i * 1.57 + 0.4) * 0.04], i % 2 ? yellow : s.material('#f6e6a8'), 8);
        strip.rotation.y = -(i * 1.57 + 0.4);
      }
      s.ball([0.014, 0.012, 0.014], [x, y + 0.012, z], brownTip, 8);
    };
    const round = (hex: string, size = 0.036) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), s.material(hex, { roughness: 0.45 })));
      const stem = new THREE.Mesh(new THREE.SphereGeometry(size * 0.14, 6, 5), brownTip);
      stem.position.y = size * 0.97;
      g.add(stem);
      return g;
    };
    const bite = (g: THREE.Object3D, size: number, flesh = '#fbf3d5') => {
      const scoop = new THREE.Mesh(new THREE.SphereGeometry(size * 0.62, 10, 8), s.material(flesh, { roughness: 0.9 }));
      scoop.position.set(size * 0.5, size * 0.42, size * 0.42);
      g.add(scoop);
    };
    const coconut = () => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), s.material('#6b4a2c', { roughness: 1 })));
      const meat = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), s.material('#fbf8ee', { roughness: 0.6 }));
      meat.scale.set(0.052, 0.012, 0.052);
      g.add(meat);
      const hollow = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6), s.material('#e3dcc6'));
      hollow.scale.set(0.034, 0.008, 0.034);
      hollow.position.y = 0.008;
      g.add(hollow);
      return g;
    };
    const block = (size: V3, hex: string, top?: string) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(...size), s.material(hex, { roughness: 0.6 })));
      if (top) {
        const foil = new THREE.Mesh(new THREE.BoxGeometry(size[0] * 0.9, 0.002, size[2] * 0.9), s.material(top, { metalness: 0.9, roughness: 0.25 }));
        foil.position.y = size[1] / 2 + 0.001;
        g.add(foil);
      }
      return g;
    };

    const bigs: Big[] = [];
    const balls: Dot[] = [], poms: Dot[] = [], discs: Dot[] = [];
    const pSmall = r < 0.15 ? 0 : clamp01((r - 0.25) / 0.75) * 0.92;
    const small = (list: Dot[], home: V3, size: number, color: THREE.ColorRepresentation) => {
      if (random() < pSmall) {
        if (random() < 0.35) return;
        const [x, z] = thrown();
        list.push({ at: [x, groundAt(x, z) + size * 0.8, z], size, color });
      } else list.push({ at: home, size, color });
    };
    const more = 0.6 + mood.density * 0.8;
    const marigolds = (count: number, cx: number, cz: number, spread: number, heap: number) => {
      for (let i = 0; i < count; i++) {
        const t = random() * Math.PI * 2, d = Math.sqrt(random()) * spread;
        small(poms, [cx + Math.cos(t) * d, ty + 0.018 + heap * (1 - d / spread) * random(), cz + Math.sin(t) * d], 0.02 + random() * 0.006, new THREE.Color(random() < 0.3 ? '#ffc21c' : '#f58a0c').lerp(new THREE.Color('#8a6a3a'), mood.wear * 0.3 * random()));
      }
    };

    if (a.offered === 'fruit') {
      for (let i = 0; i < 5; i++) {
        const b = banana();
        b.rotation.set(0, 0.5 + (i - 2) * 0.22, 0.25);
        bigs.push({ obj: b, home: [-0.07 + (i - 2) * 0.006, ty + 0.03 + i * 0.004, 0.03 + (i - 2) * 0.03], rest: 0.017, trace: 'peel' });
      }
      const colours = ['#f08a1c', '#c8262b', '#f08a1c', '#a8324a', '#b9c858', '#c8262b'];
      const stack: V3[] = [[0.05, 0, -0.03], [0.125, 0, -0.03], [0.088, 0, 0.035], [0.088, 0.058, -0.008]];
      stack.forEach((p, i) => bigs.push({ obj: round(colours[i]), home: [p[0], ty + 0.036 + p[1], p[2]], rest: 0.036, trace: 'crumbs' }));
      for (const [x, z] of [[-0.02, -0.12], [0.02, 0.125]]) bigs.push({ obj: coconut(), home: [x, ty + 0.056, z], rest: 0.056, trace: 'spill' });
      marigolds(Math.round(7 * more), 0, 0, Rt * 0.8, 0);
    } else if (a.offered === 'sweets') {
      const rows: [number, number, number][] = [];
      for (let i = 0; i < 6; i++) rows.push([Math.cos(i * 1.047) * 0.045, 0, Math.sin(i * 1.047) * 0.045]);
      rows.push([0, 0, 0]);
      for (let i = 0; i < 3; i++) rows.push([Math.cos(i * 2.094 + 0.5) * 0.026, 0.036, Math.sin(i * 2.094 + 0.5) * 0.026]);
      rows.push([0, 0.072, 0]);
      for (const p of rows) small(balls, [0.055 + p[0], ty + 0.023 + p[1], -0.035 + p[2]], 0.023, random() < 0.5 ? '#f09a1a' : '#e8861a');
      const barfi = ['#f6efe0', '#f2b8c6', '#b9d48a'];
      for (let i = 0; i < 6; i++) {
        const b = block([0.046, 0.022, 0.046], barfi[i % 3], '#e4e6ea');
        b.rotation.y = 0.3;
        bigs.push({ obj: b, home: [-0.09 + (i % 2) * 0.05, ty + 0.011 + Math.floor(i / 4) * 0.023, 0.0 + Math.floor((i % 4) / 2) * 0.052 + (i > 3 ? 0.026 : 0)], rest: 0.011, trace: 'crumbs' });
      }
      for (let k = 0; k < 3; k++) {
        const points: V3[] = [];
        for (let i = 0; i <= 26; i++) {
          const t = i * 0.5, d = 0.008 + i * 0.0011;
          points.push([Math.cos(t) * d, Math.sin(i * 1.3) * 0.002, Math.sin(t) * d]);
        }
        const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 60, 0.0065, 6), s.material('#f07d12', { roughness: 0.2, emissive: '#a84300', emissiveIntensity: 0.3 }));
        bigs.push({ obj: coil, home: [0.01 + k * 0.045, ty + 0.007 + k * 0.004, 0.115 - k * 0.012], rest: 0.007, trace: 'crumbs' });
      }
      for (let i = 0; i < Math.round(12 * more); i++) {
        const t = random() * Math.PI * 2, d = Rt * (0.5 + random() * 0.33);
        small(discs, [Math.cos(t) * d, ty + 0.004 + random() * 0.003, Math.sin(t) * d], 0.011 + random() * 0.004, random() < 0.35 ? '#d5d7da' : '#d1a23a');
      }
    } else if (a.offered === 'flowers') {
      marigolds(Math.round(34 * more), -0.05, 0.03, 0.085, 0.07);
      const pile = (hex: string, radius: number, height: number) => new THREE.Mesh(new THREE.ConeGeometry(radius, height, 18), s.material(hex, { roughness: 1, emissive: hex, emissiveIntensity: 0.12 }));
      bigs.push({ obj: pile('#f4f1e6', 0.062, 0.05), home: [0.085, ty + 0.025, 0.06], rest: 0.025, trace: 'spill' });
      bigs.push({ obj: pile('#d81f26', 0.036, 0.05), home: [0.09, ty + 0.025, -0.07], rest: 0.025, trace: 'spill' });
      bigs.push({ obj: pile('#f0b414', 0.032, 0.044), home: [0.02, ty + 0.022, -0.125], rest: 0.022, trace: 'spill' });
      const lamp = new THREE.Group();
      lamp.add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.02, 0], [0.034, 0.02], [0.03, 0.022], [0.018, 0.008], [0, 0.008]].map(([x, y]) => new THREE.Vector2(x, y)), 16), s.material('#a8553c')));
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.034, 8), new THREE.MeshStandardMaterial({ color: '#ffd76a', emissive: '#ff9a1c', emissiveIntensity: 2 }));
      flame.position.set(0.02, 0.036, 0);
      if (r < 0.6) lamp.add(flame);
      bigs.push({ obj: lamp, home: [-0.03, ty, -0.1], rest: 0, trace: 'spill' });
      for (let i = 0; i < Math.round(16 * more); i++) {
        const t = random() * Math.PI * 2, d = Rt * (0.2 + random() * 0.7);
        small(discs, [Math.cos(t) * d, ty + 0.003, Math.sin(t) * d], 0.012, random() < 0.5 ? '#e8463a' : '#f58a0c');
      }
    } else {
      const bread = s.material('#e3c28c'), crust = s.material('#b98548');
      const tri = new THREE.Shape([new THREE.Vector2(-0.06, -0.045), new THREE.Vector2(0.06, -0.045), new THREE.Vector2(-0.06, 0.075)]);
      const layer = (depth: number, material: THREE.Material, y: number, grow = 1) => {
        const m = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth, bevelEnabled: false }), material);
        m.rotation.x = -Math.PI / 2;
        m.scale.set(grow, grow, 1);
        m.position.y = y;
        return m;
      };
      for (let k = 0; k < 2; k++) {
        const g = new THREE.Group();
        g.add(layer(0.012, bread, 0), layer(0.007, s.material('#5fa83a'), 0.012, 1.06), layer(0.006, s.material('#e8788a'), 0.019, 1.03), layer(0.006, s.material('#f1c232'), 0.025, 1.04), layer(0.012, k ? crust : bread, 0.031));
        g.rotation.y = k ? 2.6 : -0.4;
        bigs.push({ obj: g, home: [k ? 0.0 : -0.085, ty + 0.002 + k * 0.012, k ? 0.055 : 0.02], rest: 0.002, trace: 'crumbs' });
      }
      const packet = new THREE.Group();
      const bag = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), s.material(['#d9251d', '#1f6fd0', '#f0b414'][Math.floor(random() * 3)], { roughness: 0.25, metalness: 0.3 }));
      bag.scale.set(0.055, 0.02, 0.08);
      const logo = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), s.material('#fff3c4', { roughness: 0.3 }));
      logo.scale.set(0.032, 0.008, 0.03);
      logo.position.y = 0.015;
      packet.add(bag, logo);
      for (const z of [-0.08, 0.08]) {
        const crimp = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.004, 0.012), s.material('#c9ccd0', { metalness: 0.8, roughness: 0.3 }));
        crimp.position.z = z;
        packet.add(crimp);
      }
      packet.rotation.y = 0.5;
      bigs.push({ obj: packet, home: [0.095, ty + 0.02, -0.03], rest: 0.02, trace: 'spill' });
      const juice = new THREE.Group();
      juice.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.036), s.material('#3aa05a', { roughness: 0.4 })));
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.035, 0.038), s.material('#f7a11c'));
      band.position.y = -0.01;
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.06, 6), s.material('#ffffff'));
      straw.position.set(0.012, 0.07, 0);
      straw.rotation.z = -0.3;
      juice.add(band, straw);
      bigs.push({ obj: juice, home: [-0.02, ty + 0.05, -0.11], rest: 0.019, trace: 'spill' });
      const b = banana();
      b.rotation.y = -0.3;
      bigs.push({ obj: b, home: [0.03, ty + 0.018, 0.14], rest: 0.017, trace: 'peel' });
      bigs.push({ obj: round('#c8262b'), home: [-0.11, ty + 0.036, -0.06], rest: 0.036, trace: 'crumbs' });
      const napkin = block([0.13, 0.003, 0.13], '#f6f3ea');
      napkin.rotation.y = 0.7;
      bigs.push({ obj: napkin, home: [0.07, ty + 0.002, 0.06], rest: 0.002, trace: 'spill' });
    }

    // The raid: the first piece is gone altogether, the rest are flung where they landed.
    const order = bigs.map((_, i) => i).sort(() => random() - 0.5);
    const taken = r < 0.15 ? 0 : Math.max(1, Math.round(((r - 0.33) / 0.67) * bigs.length));
    const crumbs: Dot[] = [];
    order.forEach((index, rank) => {
      const piece = bigs[index];
      if (rank >= taken) {
        piece.obj.position.set(...piece.home);
        s.root.add(piece.obj);
        return;
      }
      const [x, z] = thrown();
      const y = groundAt(x, z);
      if (piece.trace === 'peel') peel(x, z);
      else for (let i = 0; i < 7; i++) crumbs.push({ at: [x + (random() - 0.5) * 0.12, y + 0.004, z + (random() - 0.5) * 0.12], size: 0.005 + random() * 0.006, color: piece.trace === 'spill' ? '#f4f1e6' : '#e8c37a' });
      if (rank === 0 || piece.trace === 'peel') return;
      const [x2, z2] = thrown();
      piece.obj.position.set(x2, groundAt(x2, z2) + piece.rest, z2);
      piece.obj.rotation.y = random() * Math.PI * 2;
      if (piece.rest > 0.03 && piece.trace === 'crumbs') bite(piece.obj, 0.036);
      if (piece.trace === 'spill' && piece.rest > 0.015) piece.obj.rotation.z = Math.PI / 2 * (random() < 0.5 ? 1 : 0.2);
      s.root.add(piece.obj);
    });
    for (const child of s.root.children) child.traverse((node) => { node.castShadow = node.receiveShadow = true; });
    if (balls.length) s.scatter(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 }), balls);
    if (poms.length) s.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, emissive: '#b04a00', emissiveIntensity: 0.12 + mood.cheer * 0.25 }), poms);
    if (discs.length) s.scatter(new THREE.CylinderGeometry(1, 1, 0.22, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, metalness: a.offered === 'sweets' ? 0.8 : 0 }), discs);
    if (crumbs.length) s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), crumbs);

    // Handprints.
    if (a.prints !== 'none' && r > 0.15) {
      const marks: Dot[] = [];
      const tones = { dust: ['#6a5c4e', '#77695a'], powder: ['#d81f26', '#f0b414'], sticky: ['#4a2e1a', '#6b3f1f'] }[a.prints];
      for (let i = 0; i < Math.round(3 + r * 11); i++) {
        const t = random() * Math.PI * 2, d = Rt * (1.22 + random() * 0.7);
        const x = Math.cos(t) * d, z = Math.sin(t) * d, y = groundAt(x, z) + 0.002, heading = t + (random() - 0.5), colour = tones[i % 2];
        marks.push({ at: [x, y, z], size: 0.024, color: colour });
        for (let f = -2; f <= 2; f++) {
          const spread = heading + f * 0.32, reach = f === -2 ? 0.034 : 0.05 - Math.abs(f) * 0.004;
          marks.push({ at: [x + Math.cos(spread) * reach, y, z + Math.sin(spread) * reach], size: 0.009, color: colour });
        }
      }
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.12, 10), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), marks).castShadow = false;
    }

    // Incense.
    const puffs: THREE.Mesh[] = [];
    if (a.incense) {
      const fallen = r > 0.8;
      const g = new Sculpture(context);
      g.lathe([[0, 0], [0.03, 0], [0.032, 0.008], [0.012, 0.02], [0.014, 0.03], [0, 0.03]], metal('#c9982f'));
      const sticks = fallen ? 1 : 3;
      for (let i = 0; i < sticks; i++) {
        const lean: V3 = [Math.sin(i * 2.1) * 0.035, 0.2, Math.cos(i * 2.1) * 0.035];
        g.rod([0, 0.025, 0], lean, 0.0028, g.material('#5a4030'));
        g.ball([0.005, 0.007, 0.005], lean, new THREE.MeshStandardMaterial({ color: '#ff7a2a', emissive: '#ff4a0a', emissiveIntensity: 2.2 }), 8);
        g.rod([lean[0] * 0.8, 0.165, lean[2] * 0.8], [lean[0] * 0.98, 0.197, lean[2] * 0.98], 0.0045, g.material('#b9b3a8'));
      }
      const ix = Rt * 1.25, iz = -Rt * 0.95;
      g.root.position.set(ix, groundAt(ix, iz), iz);
      if (fallen) {
        g.root.rotation.z = -1.45;
        g.root.position.y += 0.03;
      }
      s.root.add(g.root);
      const smoke = new THREE.MeshStandardMaterial({ color: '#e9e6df', transparent: true, opacity: 0.22, depthWrite: false, roughness: 1 });
      for (let i = 0; i < (fallen ? 0 : 6); i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.014 + i * 0.006, 10, 8), smoke);
        puff.position.set(ix + Math.sin(i * 1.3) * 0.02, groundAt(ix, iz) + 0.24 + i * 0.06, iz + Math.cos(i * 1.7) * 0.02);
        puff.userData.base = puff.position.clone();
        s.root.add(puff);
        puffs.push(puff);
      }
    }

    // The thief.
    let thiefHead: THREE.Group | null = null;
    if (a.thief) {
      const m = new Sculpture(context);
      const H = 0.2, turn = Math.PI / 2 - 0.45;
      const sx = -(Rt + 0.13), sz = 0.05, sy = groundAt(sx, sz);
      const target = new THREE.Vector3(-Rt * 0.42 - sx, ty + 0.055 - sy, 0.02 - sz).applyAxisAngle(new THREE.Vector3(0, 1, 0), -turn).divideScalar(H);
      const fur = '#8f7653', tip = '#cdb88c', skin = '#e3a090';
      const body = sittingBody(m, { height: H, girth: 0.85, fur, tip, belly: tip, skin, hunch: 0.7, limbWidth: 0.85, rightHand: [target.x, target.y, target.z], leftHand: r > 0.3 ? [-0.2, 0.95, 0.5] : undefined, ragged: 0.25 + mood.wear * 0.4 });
      if (r > 0.3) m.ball([0.022, 0.022, 0.022], [body.leftHand[0], body.leftHand[1] + 0.02, body.leftHand[2] + 0.012], m.material(a.offered === 'fruit' ? '#f1c232' : a.offered === 'flowers' ? '#f58a0c' : '#f09a1a'), 10);
      const head = monkeyHead(context, { skin, fur, tip, iris: '#c9821b', ear: 1.35, muzzle: 0.75, brow: 0.3, eyeOpen: 1.25, mouth: 'closed', cheek: clamp01(r * 1.1), furLength: 0.28, furCount: 240, eyeSize: 1.15, ragged: 0.25 + mood.wear * 0.4 });
      head.scale.setScalar(0.08);
      head.position.set(body.neck[0], body.neck[1] + 0.045, body.neck[2] + 0.03);
      head.rotation.set(-0.15, -0.9, 0);
      m.root.add(head);
      thiefHead = head;
      m.tube([[0, 0.02, -0.07], [-0.05, 0.012, -0.12], [-0.12, 0.012, -0.11], [-0.17, 0.012, -0.05]], 0.012, m.material(fur));
      m.root.position.set(sx, sy, sz);
      m.root.rotation.y = turn;
      s.root.add(m.root);
    }

    const pace = mix(0.3, 2.4, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        puffs.forEach((puff, i) => {
          const base = puff.userData.base as THREE.Vector3, phase = (time * pace * 0.25 + i / puffs.length) % 1;
          puff.position.set(base.x + Math.sin(time * pace + i) * 0.015 * (1 + i), base.y + phase * 0.05, base.z + Math.cos(time * pace * 0.8 + i * 2) * 0.012);
        });
        if (thiefHead) thiefHead.rotation.y = -0.9 + Math.sin(time * pace * 1.6) * 0.5 * mood.energy;
      },
    });
  },
});
