import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const WOOD = { white: '#f0ede4', birch: '#dcc294', grey: '#a3a9ab', sage: '#a9bda6', walnut: '#70503a' } as const;
const CLOTHES = {
  whites: ['#f6f3ea', '#efeadc', '#f8f6f0', '#e9e4d6'],
  pastels: ['#f3c6cf', '#bcdcee', '#f6e6a8', '#c2e3c8', '#d9c8ec'],
  greys: ['#c9ccce', '#9aa0a4', '#e4e5e3', '#6f767c'],
  brights: ['#e0563f', '#2f7fc0', '#f0b92c', '#3fa56a', '#f08a3c'],
} as const;
type P3 = readonly [number, number, number];

export default defineThing({
  questions: {
    state: choice('What state is the changing station in?', {
      pristine: 'Pristine and fully stocked, everything squared up, never yet used.',
      working: 'In daily use: stocked but lived-in, things a little out of line.',
      chaos: 'Mid-change chaos: an open nappy on the mat, wipes trailing, tubs open, clothes flung, the pail lid up.',
      bare: 'Stripped bare: no mat, empty shelves, a box of outgrown clothes packed beside it.',
    }),
    table: choice('What kind of table is it?', {
      shelves: 'An open wooden changing unit with a shelf beneath.',
      dresser: 'A chest of drawers with a changing tray on top.',
      trolley: 'A slim metal-framed trolley on castors with three trays.',
    }),
    wood: choice('What colour is the furniture?', {
      white: 'White.',
      birch: 'Pale birch.',
      grey: 'Dove grey.',
      sage: 'Sage green paint.',
      walnut: 'Dark walnut.',
    }),
    mat: choice('What covers the curved changing mat?', {
      wipe: 'Plain white wipe-clean vinyl.',
      terry: 'A yellow terry towelling cover.',
      stars: 'Grey with white stars.',
      waves: 'Blue and white stripes.',
      rainbow: 'A print of little rainbows.',
    }),
    pail: choice('What takes the used nappies?', {
      pail: 'A tall white nappy pail with a coloured twist lid.',
      pedal: 'A brushed-steel pedal bin.',
      hamper: 'A lidded wicker hamper.',
      none: 'Nothing: no bin at all.',
    }),
    clothes: choice('What are the folded babygrows like?', {
      whites: 'All whites and creams.',
      pastels: 'Soft pastels.',
      greys: 'Sensible greys.',
      brights: 'Bright hand-me-down primaries.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wood = s.material(WOOD[a.wood], { roughness: 0.5 });
    const steel = s.material('#b9bec2', { metalness: 0.6, roughness: 0.35 });
    const white = s.material('#f6f4ee', { roughness: 0.7 });
    const cloth = CLOTHES[a.clothes];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const W = 1.1, D = 0.52, H = 0.88;
    const mess = { pristine: 0, working: 0.35, chaos: 1, bare: 0 }[a.state];
    const stocked = a.state !== 'bare';
    const jig = (amount: number) => (random() - 0.5) * amount * mess;
    const soft = (size: P3, at: P3, colour: THREE.ColorRepresentation, r = 0.012) => s.mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(r, Math.min(...size) * 0.45)), s.material(colour, { roughness: 1 }), at);

    // ---- Furniture ----
    const shelves: number[] = [];
    const rim = (y: number, h: number, material: THREE.Material, w = W, d = D) => {
      s.box([w, h, 0.018], [0, y + h / 2, -d / 2 + 0.009], material);
      for (const x of [-1, 1]) s.box([0.018, h, d], [x * (w / 2 - 0.009), y + h / 2, 0], material);
      s.box([w, h * 0.4, 0.018], [0, y + h * 0.2, d / 2 - 0.009], material);
    };
    if (a.table === 'shelves') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.045, H + 0.1, 0.045], [x * (W / 2 - 0.022), (H + 0.1) / 2, z * (D / 2 - 0.022)], wood);
      s.box([W, 0.025, D], [0, H - 0.0125, 0], wood);
      rim(H, 0.1, wood);
      s.box([W - 0.05, 0.022, D - 0.03], [0, 0.47, 0], wood); shelves.push(0.481);
      for (const x of [-1, 1]) s.box([0.022, 0.05, D - 0.05], [x * (W / 2 - 0.022), 0.1, 0], wood);
      for (const y of [0.3, 0.68]) s.box([W - 0.05, 0.05, 0.018], [0, y, -D / 2 + 0.02], wood);
    } else if (a.table === 'dresser') {
      s.box([W, H - 0.07, D], [0, (H - 0.07) / 2 + 0.07, 0], wood);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.05, 0.07, 0.05], [x * (W / 2 - 0.05), 0.035, z * (D / 2 - 0.05)], wood);
      rim(H, 0.1, wood);
      const face = s.material(new THREE.Color(WOOD[a.wood]).multiplyScalar(0.93), { roughness: 0.5 });
      for (let i = 0; i < 3; i++) {
        const open = (i === 2 && a.state === 'chaos') || (i === 1 && a.state === 'working' && random() < 0.5) ? 0.2 : i === 0 && a.state === 'bare' ? 0.12 : 0;
        const y = 0.2 + i * 0.255;
        s.box([W - 0.05, 0.235, 0.02], [0, y, D / 2 + 0.01 + open], face);
        for (const x of [-0.28, 0.28]) s.ball([0.016, 0.016, 0.016], [x, y + 0.03, D / 2 + 0.032 + open], steel, 12);
        if (open) {
          s.box([W - 0.1, 0.012, open], [0, y - 0.1, D / 2 + open / 2], wood);
          for (const x of [-1, 1]) s.box([0.012, 0.18, open], [x * (W / 2 - 0.05), y - 0.02, D / 2 + open / 2], wood);
          if (stocked) for (let k = 0; k < 4; k++) soft([0.2, 0.05, open * 0.75], [-0.36 + k * 0.24 + jig(0.04), y + 0.06 + jig(0.03), D / 2 + open / 2], pick(cloth)).rotation.y = jig(0.5);
        }
      }
    } else {
      const paint = a.wood === 'birch' || a.wood === 'walnut' ? steel : wood;
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.cylinder(0.013, 0.013, H + 0.02, [x * (W / 2 - 0.013), (H + 0.02) / 2 + 0.06, z * (D / 2 - 0.013)], paint, 10);
        s.cylinder(0.028, 0.028, 0.02, [x * (W / 2 - 0.013), 0.028, z * (D / 2 - 0.013)], s.material('#2f3134'), 14).rotation.z = Math.PI / 2;
      }
      for (const y of [0.14, 0.5, H]) {
        s.box([W, 0.012, D], [0, y - 0.006, 0], paint);
        rim(y, y === H ? 0.09 : 0.055, paint);
        if (y !== H) shelves.push(y);
      }
      s.tube([[W / 2, H + 0.02, -D / 2 + 0.02], [W / 2 + 0.07, H + 0.05, -D / 2 + 0.02], [W / 2 + 0.07, H + 0.05, D / 2 - 0.02], [W / 2, H + 0.02, D / 2 - 0.02]], 0.011, paint);
    }

    // ---- The curved mat ----
    const matX = -0.17, matL = 0.72, matD = D - 0.07;
    if (stocked) {
      const tile = document.createElement('canvas'); tile.width = tile.height = 64;
      const g = tile.getContext('2d')!;
      const ground = { wipe: '#f7f6f1', terry: '#f3d977', stars: '#9aa2a8', waves: '#f4f7fa', rainbow: '#f7f1e4' }[a.mat];
      g.fillStyle = ground; g.fillRect(0, 0, 64, 64);
      if (a.mat === 'stars') { g.fillStyle = '#ffffff'; g.font = '30px serif'; g.fillText('★', 4, 28); g.fillText('★', 36, 60); }
      if (a.mat === 'waves') { g.fillStyle = '#7ea6cf'; g.fillRect(0, 8, 64, 16); g.fillRect(0, 40, 64, 16); }
      if (a.mat === 'terry') { g.fillStyle = 'rgba(190,150,30,0.25)'; for (let i = 0; i < 90; i++) g.fillRect(random() * 64, random() * 64, 2, 2); }
      if (a.mat === 'rainbow') { g.lineWidth = 4; ['#e8857a', '#efc15a', '#86b9d8'].forEach((ink, i) => { g.strokeStyle = ink; for (const [x, y] of [[18, 30], [48, 62]]) { g.beginPath(); g.arc(x, y, 14 - i * 5, Math.PI, 0); g.stroke(); } }); }
      if (mood.wear > 0.45) { g.fillStyle = `rgba(160,130,80,${(mood.wear - 0.4) * 0.4})`; g.beginPath(); g.ellipse(30, 34, 20, 12, 0.5, 0, 7); g.fill(); }
      const cover = new THREE.CanvasTexture(tile); cover.colorSpace = THREE.SRGBColorSpace; cover.wrapS = cover.wrapT = THREE.RepeatWrapping; cover.repeat.set(9, 9);
      const profile = new THREE.Shape();
      const half = matD / 2;
      profile.moveTo(-half, 0.006); profile.lineTo(half, 0.006);
      for (let i = 0; i <= 20; i++) { const z = half - i / 20 * matD, edge = Math.abs(z) / half; profile.lineTo(z * (1 - 0.04 * (1 - edge)), 0.028 + 0.11 * edge ** 1.9 - (edge > 0.9 ? (edge - 0.9) * 0.45 : 0)); }
      const mat = s.mesh(new THREE.ExtrudeGeometry(profile, { depth: matL, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, steps: 1 }), new THREE.MeshStandardMaterial({ map: cover, roughness: a.mat === 'wipe' ? 0.35 : 0.95 }));
      mat.geometry.translate(0, 0, -matL / 2);
      mat.rotation.y = Math.PI / 2 + jig(0.12);
      mat.position.set(matX + jig(0.03), H, 0);
    } else {
      s.box([matL, 0.002, matD], [matX, H + 0.001, 0], s.material(new THREE.Color(WOOD[a.wood]).multiplyScalar(1.06), { roughness: 0.4 }));
    }

    // ---- The caddy ----
    const caddy = new THREE.Group();
    const c = <T extends THREE.Object3D>(node: T) => { caddy.add(node); return node; };
    const felt = s.material(pick(['#8d9499', '#b9a98c', '#7d8f9c', '#a88f8f']), { roughness: 1 });
    const cw = 0.27, cd = 0.2, ch = 0.12;
    c(s.box([cw, 0.008, cd], [0, 0.004, 0], felt));
    for (const z of [-1, 1]) c(s.box([cw, ch, 0.008], [0, ch / 2, z * cd / 2], felt));
    for (const x of [-1, 1]) c(s.box([0.008, ch, cd], [x * cw / 2, ch / 2, 0], felt));
    c(s.box([cw, ch * 0.85, 0.006], [0, ch * 0.43, -0.01], felt));
    c(s.tube([[-0.06, ch, -0.01], [-0.045, ch + 0.07, -0.01], [0.045, ch + 0.07, -0.01], [0.06, ch, -0.01]], 0.008, felt));
    if (stocked) {
      const nappies = Math.round(mix(3, 6, mood.density)) - (a.state === 'chaos' ? 2 : 0);
      for (let i = 0; i < nappies; i++) {
        const n = c(soft([0.034, 0.105, 0.085], [-0.1 + i * 0.04, 0.065 + jig(0.02), -0.055], '#fbfaf6', 0.014));
        n.rotation.z = jig(0.5);
        c(s.box([0.035, 0.012, 0.086], [-0.1 + i * 0.04, 0.1, -0.055], s.material('#a9d3c7'))).rotation.z = n.rotation.z;
      }
      const lids = ['#3f7fb5', '#e8a23a', '#d9607a'];
      for (let i = 0; i < 2; i++) {
        const x = -0.085 + i * 0.075, open = a.state === 'chaos' && i === 0;
        c(s.cylinder(0.03, 0.028, 0.055, [x, 0.036, 0.05], white, 16));
        if (!open) c(s.cylinder(0.032, 0.032, 0.014, [x, 0.07, 0.05], s.material(lids[i]), 16));
        else c(s.cylinder(0.027, 0.027, 0.004, [x, 0.062, 0.05], s.material('#fdfbf0'), 16));
      }
      c(s.cylinder(0.02, 0.022, 0.11, [0.075, 0.063, 0.05], s.material('#f1dfc4', { roughness: 0.3 }), 14));
      c(s.cylinder(0.008, 0.008, 0.03, [0.075, 0.13, 0.05], white, 8));
      c(s.box([0.03, 0.008, 0.012], [0.075, 0.146, 0.058], white));
    }
    s.root.add(caddy);
    const caddyX = a.table === 'trolley' ? 0.37 : 0.38;
    caddy.position.set(caddyX + jig(0.03), H + 0.001, 0.02 + jig(0.05));
    caddy.rotation.y = jig(0.9) + (a.state === 'bare' ? 0.3 : 0);
    if (a.state === 'bare' && random() < 0.5) { caddy.rotation.z = Math.PI / 2; caddy.position.y = H + cw / 2; caddy.position.x = caddyX - 0.05; }

    // ---- Shelf stock ----
    const fold = (x: number, y: number, z: number, n: number) => {
      for (let i = 0; i < n; i++) soft([0.19, 0.028, 0.15], [x + jig(0.05), y + 0.014 + i * 0.029, z + jig(0.04)], pick(cloth), 0.012).rotation.y = jig(0.6);
      return y + n * 0.029;
    };
    if (stocked) {
      shelves.forEach((y, level) => {
        const n = Math.round(mix(2, 6, mood.density));
        fold(-0.36, y, 0, n);
        if (level === 0) fold(-0.13, y, 0.02, Math.max(1, n - 2));
        // A shrink-wrapped pack of nappies and a basket of rolled muslins.
        const pack = soft([0.24, 0.2, 0.17], [0.13 + jig(0.03), y + 0.1, -0.02], '#eaf3f1', 0.02);
        pack.rotation.y = jig(0.4);
        const sticker = s.label('NAPPIES', 0.16, 0.06, [0, 0.03, 0.0855], '#ffffff', '#4a9aa6'); pack.add(sticker);
        const basket = s.material('#b7925c', { roughness: 1 });
        s.box([0.24, 0.13, 0.3], [0.4, y + 0.065, 0], basket);
        for (let i = 0; i < 3; i++) { const roll = s.cylinder(0.035, 0.035, 0.22, [0.34 + i * 0.06, y + 0.14, 0], s.material(pick(cloth), { roughness: 1 }), 12); roll.rotation.x = Math.PI / 2; }
      });
      if (a.table === 'dresser') fold(matX + 0.2, H + 0.11, 0, 0);
    }

    // ---- Mid-change debris ----
    const top = H + 0.04;
    if (a.state === 'chaos') {
      // The open nappy on the mat.
      const outline = new THREE.Shape();
      const pts: [number, number][] = [[-0.13, -0.11], [-0.13, 0.11], [-0.06, 0.1], [-0.02, 0.065], [0.05, 0.065], [0.09, 0.1], [0.14, 0.1], [0.14, -0.1], [0.09, -0.1], [0.05, -0.065], [-0.02, -0.065], [-0.06, -0.1]];
      pts.forEach(([x, y], i) => (i ? outline.lineTo(x, y) : outline.moveTo(x, y)));
      const nappy = s.mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.012, bevelEnabled: false }), s.material('#fcfbf7', { roughness: 1 }), [matX + jig(0.1), top + 0.012, jig(0.05)]);
      nappy.rotation.set(-Math.PI / 2, 0, jig(0.8));
      for (const y of [-0.085, 0.085]) nappy.add(s.box([0.05, 0.03, 0.004], [0.115, y, 0.013], s.material('#7fc4b4')));
      nappy.add(s.box([0.07, 0.1, 0.004], [-0.09, 0, 0.013], s.material('#cfe9e2')));
      // Wipes pulled out in a trail, and the pack they came from.
      const wipes = soft([0.17, 0.05, 0.1], [matX + 0.42 + jig(0.03), H + 0.026, D / 2 - 0.09], '#cfe6ef', 0.015);
      wipes.rotation.y = 0.5 + jig(0.6);
      for (let i = 0; i < 4; i++) s.box([0.09, 0.003, 0.07], [matX + 0.3 - i * 0.06, top + 0.03 + i * 0.004, D / 2 - 0.12 - i * 0.03], s.material('#ffffff', { roughness: 1 })).rotation.set(jig(0.5), jig(2), jig(0.5));
      // A lid, a loose nappy and a balled-up one on the floor.
      s.cylinder(0.032, 0.032, 0.014, [0.2, 0.007, D / 2 + 0.16 + random() * 0.1], s.material('#3f7fb5'), 16);
      soft([0.034, 0.105, 0.085], [-0.1 + random() * 0.3, 0.018, D / 2 + 0.2], '#fbfaf6', 0.014).rotation.set(0, random() * 3, Math.PI / 2);
      s.ball([0.05, 0.042, 0.048], [-0.35 - random() * 0.1, 0.042, D / 2 + 0.15], s.material('#f1eee4', { roughness: 1 }), 12);
      // A babygrow flung over the front edge.
      const grow = pick(cloth), gx = matX - 0.2 + random() * 0.15;
      s.box([0.2, 0.012, 0.1], [gx, H + 0.047, D / 2 - 0.03], s.material(grow, { roughness: 1 }));
      s.box([0.2, 0.3, 0.012], [gx, H - 0.1, D / 2 + 0.012], s.material(grow, { roughness: 1 })).rotation.z = 0.06;
      for (const side of [-1, 1]) { const sleeve = s.box([0.05, 0.16, 0.012], [gx + side * 0.13, H - 0.06, D / 2 + 0.014], s.material(grow, { roughness: 1 })); sleeve.rotation.z = side * 0.5; }
      for (const side of [-1, 1]) s.box([0.075, 0.14, 0.012], [gx + side * 0.055, H - 0.3, D / 2 + 0.012], s.material(grow, { roughness: 1 })).rotation.z = side * 0.08;
    } else if (a.state === 'working') {
      soft([0.034, 0.105, 0.085], [matX + 0.05, top + 0.02, 0.02], '#fbfaf6', 0.014).rotation.set(0, 0.4, Math.PI / 2);
      soft([0.17, 0.05, 0.1], [matX + 0.2, top + 0.03, -0.06], '#cfe6ef', 0.015).rotation.y = 0.3;
    } else if (a.state === 'bare') {
      // Packed away: a taped box of outgrown clothes.
      const bx = -(W / 2 + 0.25), card = s.material('#c39a66', { roughness: 0.95 });
      s.box([0.36, 0.26, 0.3], [bx, 0.13, 0.08], card).rotation.y = 0.25;
      const tag = s.label(pick(['0-3 MONTHS', 'BABY', 'KEEP', 'TOO SMALL', 'CHARITY']), 0.26, 0.07, [bx + 0.036, 0.15, 0.226], '#3a2c1c', '#c39a66'); tag.rotation.y = 0.25;
      s.box([0.37, 0.003, 0.06], [bx, 0.261, 0.08], s.material('#dccba8', { roughness: 0.4 })).rotation.y = 0.25;
      if (mood.density > 0.4) soft([0.2, 0.03, 0.15], [bx + 0.02, 0.278, 0.08], pick(cloth)).rotation.y = 0.6;
      s.ball([0.03, 0.01, 0.015], [0.1 + random() * 0.2, shelves[0] !== undefined ? shelves[0] + 0.01 : H + 0.012, 0.1], s.material(pick(cloth), { roughness: 1 }), 10);
    }

    // ---- The pail ----
    if (a.pail !== 'none') {
      const under = a.table === 'shelves';
      const px = under ? -0.3 : W / 2 + 0.2, pz = under ? 0.02 : 0.02;
      const open = a.state === 'chaos' || (a.state === 'bare' && random() < 0.6);
      const group = new THREE.Group(); group.position.set(px, 0, pz); s.root.add(group);
      const p = <T extends THREE.Object3D>(node: T) => { group.add(node); return node; };
      const lid = new THREE.Group(); group.add(lid);
      const tall = under ? 0.36 : 0.46;
      if (a.pail === 'pail') {
        p(s.lathe([[0, 0], [0.11, 0], [0.13, tall], [0, tall]], white));
        lid.position.set(0, tall, -0.13);
        const cap = s.lathe([[0.135, 0], [0.13, 0.03], [0.07, 0.06], [0, 0.065]], s.material(pick(['#6fa8c9', '#e2a4b1', '#9ac3a0']), { roughness: 0.4 })); cap.position.set(0, 0, 0.13); lid.add(cap);
        const knob = s.cylinder(0.03, 0.035, 0.03, [0, 0.075, 0.13], white, 14); lid.add(knob);
      } else if (a.pail === 'pedal') {
        p(s.cylinder(0.125, 0.125, tall, [0, tall / 2, 0], steel, 24));
        p(s.cylinder(0.13, 0.13, 0.03, [0, 0.015, 0], s.material('#2c2e31'), 24));
        p(s.box([0.09, 0.012, 0.06], [0, 0.02, 0.15], s.material('#2c2e31')));
        lid.position.set(0, tall, -0.125);
        const cap = s.lathe([[0.128, 0], [0.12, 0.02], [0, 0.035]], steel); cap.position.set(0, 0, 0.125); lid.add(cap);
      } else {
        const wicker = s.material('#b48a54', { roughness: 1 });
        p(s.lathe([[0, 0], [0.12, 0], [0.145, tall], [0, tall]], wicker));
        for (let i = 1; i < 6; i++) p(s.ring(0.12 + 0.025 * i / 6 + 0.003, 0.004, [0, tall * i / 6, 0], s.material('#9a7240', { roughness: 1 }))).rotation.x = Math.PI / 2;
        lid.position.set(0, tall, -0.145);
        const cap = s.lathe([[0.15, 0], [0.14, 0.025], [0, 0.04]], wicker); cap.position.set(0, 0, 0.145); lid.add(cap);
      }
      if (open) { lid.rotation.x = -(under ? 0.6 : 1.25); p(s.cylinder(0.11, 0.11, 0.004, [0, tall - 0.01, 0], s.material('#3a3c40'), 20)); }
      if (under) {
        // Company for the pail under the table: a basket, or just the bare floor.
        if (stocked) { s.box([0.34, 0.2, 0.32], [0.25, 0.1, 0], s.material('#b7925c', { roughness: 1 })); fold(0.25, 0.2, 0, Math.round(mix(1, 3, mood.density))); }
      }
    } else if (a.table === 'shelves' && stocked) {
      s.box([0.34, 0.2, 0.32], [0.25, 0.1, 0], s.material('#b7925c', { roughness: 1 })); fold(-0.25, 0, 0.02, Math.round(mix(2, 5, mood.density)));
    }

    return s.finish();
  },
});
