import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
const KINDS = ['mitten', 'teddy', 'shoe', 'lunchbox', 'hat', 'wellie', 'bottle', 'cap', 'jumper', 'bag', 'book', 'umbrella'] as const;
type Kind = (typeof KINDS)[number];

export default defineThing({
  questions: {
    container: choice('What is the lost property kept in?', {
      cardboard: 'A sagging cardboard box with its flaps open.',
      crate: 'A bright plastic stacking crate with slotted sides.',
      basket: 'A big round wicker laundry basket.',
      chest: 'A battered wooden tea chest with metal edges.',
      tub: 'A grey plastic storage tub, its lid propped behind.',
    }),
    label: choice('What does the label say?', {
      lost: 'LOST PROPERTY in neat printed capitals.',
      found: 'LOST & FOUND on a cheerful card.',
      yours: 'IS THIS YOURS? in a teacher’s marker pen.',
      bin: 'UNCLAIMED: BIN ON FRIDAY, a final warning.',
      child: 'LOST PROPPERTY, misspelt by a child in fat crayon letters.',
      none: 'No label at all; everyone just knows.',
    }),
    fullness: score('How full is it?', ['A few things at the bottom', 'Half full', 'Heaped to the brim', 'Overflowing onto the floor']),
    top: choice('What sits on top, the first thing you notice?', {
      mitten: 'A single red mitten.',
      teddy: 'A worn teddy bear, face up.',
      shoe: 'One small shoe without its pair.',
      lunchbox: 'A lunchbox with a cartoon lid.',
      hat: 'A woolly bobble hat.',
      wellie: 'One wellington boot standing upright.',
      bottle: 'A water bottle with a name half rubbed off.',
      cap: 'A sun cap with a faded peak.',
    }),
    season: choice('What season do the lost things belong to?', {
      winter: 'Winter: gloves, hats, wellies and umbrellas.',
      summer: 'Summer: caps, water bottles, swim bags and sandals.',
      year: 'A whole year’s worth mixed together.',
    }),
    colours: choice('What colours are the things?', {
      uniform: 'School uniform colours: navy, grey, bottle green and maroon.',
      bright: 'Bright children’s colours, red, yellow, pink and turquoise.',
      faded: 'Washed-out and sun-faded, everything a little grey.',
    }),
    scarf: choice('Is a scarf trailing out of it?', {
      none: 'No scarf.',
      striped: 'A long striped knitted scarf hangs over the rim and along the floor.',
      plain: 'A plain school scarf dangles over one corner.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const round = a.container === 'basket';
    const W = round ? 0.56 : a.container === 'chest' ? 0.5 : 0.62, D = round ? 0.56 : a.container === 'chest' ? 0.5 : 0.44;
    const H = { cardboard: 0.36, crate: 0.32, basket: 0.5, chest: 0.5, tub: 0.38 }[a.container];
    const textures: THREE.Texture[] = [];

    const PAL = {
      uniform: ['#1f2f55', '#5a5f66', '#1f5a3a', '#6a1f2c', '#e8e6de', '#2a2a2e'],
      bright: ['#e2382c', '#f2c21c', '#e85aa0', '#1fb0b8', '#3f8fe0', '#5ac04a', '#f08020'],
      faded: ['#a9a4a0', '#b8a8a8', '#9aa8b0', '#b0b09a', '#c0b8a8', '#8f98a0'],
    }[a.colours];
    const cloth = (hex?: string) => s.material(hex ?? PAL[Math.floor(random() * PAL.length)], { roughness: 0.95 });
    const plastic = (hex?: string) => s.material(hex ?? PAL[Math.floor(random() * PAL.length)], { roughness: 0.35 });

    // Container.
    const wall = 0.012;
    let labelZ = D / 2 + 0.003, labelY = H * 0.5;
    if (a.container === 'cardboard') {
      const card = s.material('#b98f5a', { roughness: 0.95 }), inner = s.material('#a67d4c', { roughness: 0.95 });
      s.box([W, wall, D], [0, wall / 2, 0], inner);
      for (const side of [-1, 1]) { s.box([wall, H, D], [side * (W / 2 - wall / 2), H / 2, 0], card); s.box([W, H, wall], [0, H / 2, side * (D / 2 - wall / 2)], card); }
      const sag = mix(0.5, 1.5, wear);
      for (const side of [-1, 1]) {
        const f1 = s.box([W - 0.01, 0.006, D * 0.48], [0, 0, 0], card); f1.geometry.translate(0, 0, side * D * 0.24); f1.position.set(0, H, side * D / 2); f1.rotation.x = side * (sag + random() * 0.5);
        const f2 = s.box([W * 0.3, 0.006, D - 0.01], [0, 0, 0], card); f2.geometry.translate(side * W * 0.15, 0, 0); f2.position.set(side * W / 2, H, 0); f2.rotation.z = -side * (sag * 0.9 + random() * 0.6);
      }
      s.box([W + 0.004, 0.05, 0.002], [0, H * 0.82, D / 2 + 0.001], s.material('#d9c9a0', { roughness: 0.5 }));
    } else if (a.container === 'crate' || a.container === 'tub') {
      const tubMat = a.container === 'tub' ? s.material('#8f969c', { roughness: 0.45 }) : plastic(['#2f6fd0', '#d8352c', '#2f9a52', '#f0a020'][Math.floor(random() * 4)]);
      s.box([W - 0.02, wall, D - 0.02], [0, wall / 2, 0], tubMat);
      if (a.container === 'tub') {
        for (const side of [-1, 1]) { s.box([wall, H, D], [side * (W / 2 - wall / 2), H / 2, 0], tubMat); s.box([W, H, wall], [0, H / 2, side * (D / 2 - wall / 2)], tubMat); }
        const lid = s.box([W + 0.03, 0.02, D + 0.03], [0, (D + 0.03) / 2 * Math.cos(0.25), -D / 2 - 0.07], s.material('#3f6fb0', { roughness: 0.4 })); lid.rotation.x = Math.PI / 2 - 0.25;
      } else {
        for (const side of [-1, 1]) for (const y of [0.04, 0.13, 0.22]) { s.box([wall, 0.06, D], [side * (W / 2 - wall / 2), y, 0], tubMat); s.box([W, 0.06, wall], [0, y, side * (D / 2 - wall / 2)], tubMat); }
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.box([0.03, H, 0.03], [sx * (W / 2 - 0.015), H / 2, sz * (D / 2 - 0.015)], tubMat);
        for (const side of [-1, 1]) for (let i = -2; i <= 2; i++) { s.box([0.02, H, wall], [i * W * 0.2, H / 2, side * (D / 2 - wall / 2)], tubMat); }
      }
      for (const side of [-1, 1]) { s.box([wall * 1.5, 0.035, D + 0.02], [side * (W / 2), H - 0.017, 0], tubMat); s.box([W + 0.02, 0.035, wall * 1.5], [0, H - 0.017, side * (D / 2)], tubMat); }
      labelY = H * 0.55; labelZ = D / 2 + 0.012;
    } else if (a.container === 'basket') {
      const wicker = s.material('#b08a4e', { roughness: 0.9 }), band = s.material('#8a6632', { roughness: 0.9 });
      const body = s.lathe([[0.001, 0], [W * 0.4, 0], [W * 0.43, 0.05], [W * 0.5, H], [W * 0.47, H], [W * 0.4, 0.06], [0.001, 0.03]], wicker);
      (body.material as THREE.Material).side = THREE.DoubleSide;
      for (let i = 1; i < 9; i++) { const y = i * H / 9; s.ring(W * (0.43 + 0.07 * y / H) + 0.002, 0.007, [0, y, 0], i % 3 === 0 ? band : wicker).rotation.x = Math.PI / 2; }
      s.ring(W * 0.5, 0.016, [0, H, 0], band).rotation.x = Math.PI / 2;
      for (const side of [-1, 1]) s.ring(0.06, 0.01, [side * W * 0.5, H - 0.06, 0], band).rotation.y = Math.PI / 2;
      labelZ = W * 0.48 + 0.012; labelY = H * 0.55;
    } else {
      const ply = s.material('#c2a06a', { roughness: 0.8 }), tin = s.material('#9a9d9e', { metalness: 0.7, roughness: 0.45 });
      s.box([W, wall, D], [0, wall / 2, 0], ply);
      for (const side of [-1, 1]) { s.box([wall, H, D], [side * (W / 2 - wall / 2), H / 2, 0], ply); s.box([W, H, wall], [0, H / 2, side * (D / 2 - wall / 2)], ply); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.box([0.035, H + 0.004, 0.035], [sx * (W / 2 - 0.012), H / 2, sz * (D / 2 - 0.012)], tin);
      for (const side of [-1, 1]) for (const y of [0.012, H - 0.012]) { s.box([W + 0.008, 0.03, 0.014], [0, y, side * D / 2], tin); s.box([0.014, 0.03, D + 0.008], [side * W / 2, y, 0], tin); }
      labelY = H * 0.5; labelZ = D / 2 + 0.008;
    }

    // Label.
    if (a.label !== 'none') {
      const c = document.createElement('canvas'); c.width = 512; c.height = 256;
      const g = c.getContext('2d')!;
      const text = { lost: ['LOST', 'PROPERTY'], found: ['LOST &', 'FOUND'], yours: ['IS THIS', 'YOURS?'], bin: ['UNCLAIMED', 'BIN ON FRIDAY'], child: ['LOST', 'PROPPERTY'] }[a.label];
      g.fillStyle = a.label === 'found' ? '#f6d84a' : a.label === 'bin' ? '#f3ead2' : '#f6f3e8'; g.fillRect(0, 0, 512, 256);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (a.label === 'lost') { g.strokeStyle = '#1f2f55'; g.lineWidth = 10; g.strokeRect(12, 12, 488, 232); }
      text.forEach((line, row) => {
        const size = Math.min(104, 780 / line.length);
        g.font = `bold ${size}px ${a.label === 'lost' || a.label === 'bin' ? 'monospace' : '"Comic Sans MS", "Chalkboard SE", cursive, sans-serif'}`;
        let x = 256 - g.measureText(line).width / 2;
        for (const ch of line) {
          const w = g.measureText(ch).width;
          g.save(); g.translate(x + w / 2, 80 + row * 100 + (a.label === 'child' ? (random() - 0.5) * 22 : 0)); g.rotate(a.label === 'child' ? (random() - 0.5) * 0.35 : a.label === 'yours' ? -0.04 : 0);
          g.fillStyle = a.label === 'child' ? ['#d8352c', '#2c66c8', '#2f9a52', '#e07a1c', '#8a3fb0'][Math.floor(random() * 5)] : a.label === 'bin' ? '#b0241c' : a.label === 'found' ? '#1d1d1f' : '#1f2f55';
          g.fillText(ch, 0, 0); g.restore(); x += w;
        }
      });
      if (a.label === 'bin') { g.strokeStyle = '#b0241c'; g.lineWidth = 8; g.beginPath(); g.moveTo(60, 232); g.lineTo(452, 232); g.stroke(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; textures.push(t);
      const lw = Math.min(W * 0.72, 0.4), lh = lw / 2;
      const label = s.mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }), [(random() - 0.5) * 0.03, Math.min(labelY, H - lh / 2 - 0.03), labelZ]);
      label.rotation.z = (random() - 0.5) * (a.label === 'lost' ? 0.04 : 0.16); label.castShadow = false;
      if (a.label !== 'lost') for (const side of [-1, 1]) { const tape = s.box([0.07, 0.025, 0.001], [label.position.x + side * lw * 0.46, label.position.y + lh * 0.44, labelZ + 0.002], s.material('#d9c27a', { roughness: 0.5 })); tape.rotation.z = side * -0.7; tape.castShadow = false; }
    }

    // Things. Each is built in its own group, lying on y = 0 around its own origin.
    const make = (kind: Kind, star = false): THREE.Group => {
      const g = new THREE.Group();
      const part = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3, scale: P3 = [1, 1, 1], rot: P3 = [0, 0, 0]) => { const m = new THREE.Mesh(geometry, material); m.position.set(...at); m.scale.set(...scale); m.rotation.set(...rot); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
      const ball = (size: P3, at: P3, material: THREE.Material, rot: P3 = [0, 0, 0]) => part(new THREE.SphereGeometry(1, 14, 10), material, at, size, rot);
      const box = (size: P3, at: P3, material: THREE.Material, rot: P3 = [0, 0, 0]) => part(new THREE.BoxGeometry(...size), material, at, [1, 1, 1], rot);
      const cyl = (r1: number, r2: number, h: number, at: P3, material: THREE.Material, rot: P3 = [0, 0, 0]) => part(new THREE.CylinderGeometry(r1, r2, h, 14), material, at, [1, 1, 1], rot);
      if (kind === 'mitten') {
        const m = cloth(star ? '#d8352c' : undefined);
        ball([0.055, 0.025, 0.075], [0, 0.025, 0.02], m); ball([0.022, 0.02, 0.04], [0.055, 0.022, -0.005], m, [0, -0.6, 0]);
        cyl(0.045, 0.05, 0.05, [0, 0.025, -0.07], cloth('#f1eee4'), [Math.PI / 2, 0, 0]).scale.z = 0.55;
      } else if (kind === 'teddy') {
        const fur = cloth(a.colours === 'faded' ? '#b8a48a' : '#b07a3e'), pale = cloth('#e0c8a0'), dark = s.material('#1d1d1f');
        ball([0.075, 0.06, 0.09], [0, 0.06, 0], fur); ball([0.06, 0.055, 0.058], [0, 0.085, 0.13], fur);
        ball([0.03, 0.03, 0.025], [0, 0.125, 0.14], pale); ball([0.009, 0.009, 0.009], [0, 0.15, 0.142], dark);
        for (const side of [-1, 1]) { ball([0.022, 0.012, 0.022], [side * 0.048, 0.1, 0.17], fur); ball([0.007, 0.007, 0.007], [side * 0.022, 0.135, 0.158], dark); ball([0.028, 0.028, 0.06], [side * 0.085, 0.055, 0.04], fur, [0, side * 0.7, 0]); ball([0.032, 0.032, 0.065], [side * 0.05, 0.045, -0.1], fur, [0, side * -0.3, 0]); }
      } else if (kind === 'shoe') {
        const upper = a.season === 'summer' ? plastic() : s.material('#1d1d1f', { roughness: 0.4 }), sole = s.material(a.season === 'summer' ? '#f1eee4' : '#3a3a3c');
        box([0.075, 0.018, 0.2], [0, 0.009, 0], sole); ball([0.038, 0.035, 0.06], [0, 0.045, 0.055], upper); box([0.07, 0.065, 0.085], [0, 0.05, -0.055], upper);
        box([0.078, 0.014, 0.03], [0, 0.065, 0.0], a.season === 'summer' ? sole : upper);
      } else if (kind === 'lunchbox') {
        const base = plastic(), lid = plastic();
        box([0.2, 0.07, 0.15], [0, 0.035, 0], base); box([0.205, 0.022, 0.155], [0, 0.081, 0], lid); box([0.08, 0.018, 0.016], [0, 0.1, 0], lid);
        ball([0.04, 0.004, 0.04], [0.045, 0.094, 0.02], s.material('#f6e27a')); ball([0.02, 0.004, 0.02], [-0.04, 0.094, -0.03], s.material('#f1eee4'));
      } else if (kind === 'hat') {
        const m = cloth(), band = cloth();
        part(new THREE.SphereGeometry(0.09, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), m, [0, 0.03, 0], [1, 1.05, 1]);
        cyl(0.094, 0.094, 0.045, [0, 0.025, 0], band); ball([0.035, 0.035, 0.035], [0, 0.145, 0], cloth('#f1eee4'));
      } else if (kind === 'wellie') {
        const rubber = plastic(a.colours === 'bright' ? ['#f2c21c', '#e2382c', '#2f9a52'][Math.floor(random() * 3)] : '#1f5a3a');
        const leg = cyl(0.05, 0.04, 0.2, [0, 0.13, -0.035], rubber); (leg.material as THREE.Material).side = THREE.DoubleSide;
        ball([0.048, 0.04, 0.1], [0, 0.04, 0.045], rubber); box([0.09, 0.016, 0.25], [0, 0.008, 0.03], s.material('#2a2a2c'));
        cyl(0.053, 0.053, 0.014, [0, 0.232, -0.035], s.material('#2a2a2c'));
      } else if (kind === 'bottle') {
        const m = plastic();
        cyl(0.033, 0.033, 0.16, [0, 0.08, 0], m); cyl(0.018, 0.032, 0.03, [0, 0.175, 0], m); cyl(0.02, 0.02, 0.03, [0, 0.2, 0], s.material('#f1eee4'));
      } else if (kind === 'cap') {
        const m = cloth();
        part(new THREE.SphereGeometry(0.085, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), m, [0, 0.005, 0], [1, 0.8, 1.1]);
        ball([0.07, 0.006, 0.065], [0, 0.012, 0.11], cloth()); ball([0.012, 0.008, 0.012], [0, 0.074, 0], m);
      } else if (kind === 'jumper') {
        const m = cloth();
        ball([0.17, 0.05, 0.13], [0, 0.045, 0], m, [0, random(), 0]); ball([0.06, 0.035, 0.16], [0.13, 0.035, 0.06], m, [0, 0.9, 0]); ball([0.055, 0.035, 0.15], [-0.14, 0.035, -0.02], m, [0, -0.5, 0]);
        part(new THREE.TorusGeometry(0.04, 0.014, 6, 14), m, [0, 0.085, -0.04], [1, 1, 1], [Math.PI / 2 - 0.3, 0, 0]);
      } else if (kind === 'bag') {
        const m = cloth();
        ball([0.085, 0.065, 0.1], [0, 0.065, 0], m); cyl(0.016, 0.04, 0.05, [0, 0.09, 0.095], m, [1.1, 0, 0]);
        part(new THREE.TorusGeometry(0.045, 0.004, 6, 16), s.material('#f1eee4'), [0.02, 0.08, 0.15], [1, 1.4, 1], [1.2, 0.3, 0]);
      } else if (kind === 'book') {
        box([0.15, 0.012, 0.21], [0, 0.01, 0], plastic()); box([0.14, 0.01, 0.2], [0.003, 0.004, 0], s.material('#f1eee4'));
        box([0.08, 0.002, 0.03], [0, 0.017, 0.04], s.material('#f6f3e8'));
      } else {
        const m = cloth();
        cyl(0.012, 0.03, 0.42, [0, 0.03, 0], m, [Math.PI / 2, 0, 0]); cyl(0.006, 0.006, 0.12, [0, 0.03, -0.26], s.material('#3a2a1c'), [Math.PI / 2, 0, 0]);
        part(new THREE.TorusGeometry(0.03, 0.008, 6, 12, Math.PI), s.material('#3a2a1c'), [0.03, 0.03, -0.32], [1, 1, 1], [Math.PI / 2, 0, Math.PI]);
        cyl(0.002, 0.012, 0.05, [0, 0.03, 0.235], s.material('#c2c6c8', { metalness: 0.8 }), [Math.PI / 2, 0, 0]);
      }
      return g;
    };
    const pools: Record<typeof a.season, Kind[]> = {
      winter: ['mitten', 'mitten', 'hat', 'wellie', 'jumper', 'umbrella', 'mitten', 'shoe', 'jumper'],
      summer: ['cap', 'bottle', 'bag', 'shoe', 'lunchbox', 'cap', 'bottle', 'book', 'jumper'],
      year: ['mitten', 'cap', 'bottle', 'shoe', 'lunchbox', 'hat', 'jumper', 'bag', 'book', 'teddy', 'wellie', 'umbrella'],
    };
    const pool = pools[a.season];

    // The heap: a soft mound of fabric gives the pile its body, then things lie on it.
    const level = H * mix(0.22, 1.02, Math.min(1, a.fullness * 1.25));
    const moundH = mix(0.05, 0.14, a.fullness);
    const mound = s.ball([W * 0.46, moundH, D * 0.46], [0, level - moundH * 0.35, 0], s.material(new THREE.Color(PAL[Math.floor(random() * PAL.length)]).multiplyScalar(0.6), { roughness: 1 }), 18);
    mound.rotation.y = random();
    const surface = (x: number, z: number) => level + moundH * 0.65 * Math.sqrt(Math.max(0, 1 - (x / (W * 0.46)) ** 2 - (z / (D * 0.46)) ** 2)) - moundH * 0.35;
    const count = Math.round(mix(3, 11, a.fullness) + mood.density * 3);
    for (let i = 0; i < count; i++) {
      const t = i * 2.4 + random() * 0.8, r = Math.sqrt((i + 0.5) / count) * 0.92;
      const x = Math.cos(t) * r * W * 0.38, z = Math.sin(t) * r * D * 0.36;
      const item = make(pool[Math.floor(random() * pool.length)]);
      item.position.set(x, surface(x, z) - 0.01, z);
      item.rotation.set((random() - 0.5) * 0.7, random() * 6.3, (random() - 0.5) * 0.7);
      s.root.add(item);
    }
    const star = make(a.top, true);
    const upright = a.top === 'wellie' || a.top === 'bottle';
    star.scale.setScalar(1.2);
    star.position.set((random() - 0.5) * 0.08, surface(0, 0.02) + (upright ? -0.03 : 0.035), 0.03);
    star.rotation.set(upright ? (random() - 0.5) * 0.3 : a.top === 'teddy' ? -0.35 : (random() - 0.5) * 0.3, a.top === 'teddy' ? (random() - 0.5) * 0.5 : random() * 6.3, upright ? (random() - 0.5) * 0.4 : (random() - 0.5) * 0.25);
    s.root.add(star);

    // Spilled on the floor when it overflows.
    const spilled = a.fullness > 0.7 ? 2 + Math.floor(random() * 3 + mood.density * 2) : a.fullness > 0.45 && random() < 0.5 ? 1 : 0;
    for (let i = 0; i < spilled; i++) {
      const item = make(pool[Math.floor(random() * pool.length)]);
      const angle = -0.4 + i * 0.75 + random() * 0.4, dist = Math.max(W, D) * 0.5 + 0.2 + random() * 0.16;
      item.position.set(Math.sin(angle) * dist, 0, Math.cos(angle) * dist * 0.9);
      item.rotation.y = random() * 6.3;
      s.root.add(item);
    }

    // The scarf.
    if (a.scarf !== 'none') {
      const c = document.createElement('canvas'); c.width = 256; c.height = 16;
      const g = c.getContext('2d')!;
      const one = PAL[Math.floor(random() * PAL.length)], two = a.scarf === 'striped' ? PAL[Math.floor(random() * PAL.length)] : one;
      for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? one : two === one && a.scarf === 'striped' ? '#f1eee4' : two; g.fillRect(i * 16, 0, 16, 16); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; textures.push(t);
      const edge = round ? W * 0.5 : W / 2;
      const side = random() < 0.5 ? -1 : 1;
      const long = a.scarf === 'striped';
      const pts: P3[] = [[side * edge * 0.2, level + 0.02, 0.0], [side * edge * 0.7, H + 0.04, D * 0.2], [side * (edge + 0.03), H + 0.02, D * 0.28], [side * (edge + 0.06), H * 0.5, D * 0.33]];
      if (long) pts.push([side * (edge + 0.09), 0.05, D * 0.4], [side * (edge + 0.05), 0.03, D * 0.75], [side * (edge - 0.25), 0.03, D * 0.95 + 0.1], [side * (edge - 0.55), 0.03, D * 0.9 + 0.12]);
      else pts.push([side * (edge + 0.065), H * 0.22, D * 0.34]);
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const scarf = s.mesh(new THREE.TubeGeometry(curve, 48, 0.024, 8, false), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
      scarf.scale.set(1, 1, 1);
      const end = pts[pts.length - 1];
      for (let i = 0; i < 5; i++) s.rod(end, [end[0] + (long ? -side * 0.05 : (i - 2) * 0.012), end[1] - (long ? 0.02 : 0.06), end[2] + (long ? (i - 2) * 0.02 : 0)], 0.005, cloth(one));
    }

    const thing = s.finish();
    const dispose = thing.dispose;
    return { ...thing, dispose: () => { for (const t of textures) t.dispose(); dispose(); } };
  },
});
