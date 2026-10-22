import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];
const SIGNS = {
  recharge: ['RECHARGE', 'CARD HERE'],
  charge: ['CHARGE YOUR', 'PHONE N50'],
  call: ['MAKE CALL', 'HERE'],
  pos: ['POS · TRANSFER', 'AIRTIME · DATA'],
  back: ['BACK IN', '5 MINUTES'],
  credit: ['NO CREDIT', 'ABEG'],
} as const;

function lettering(lines: readonly string[], w: number, h: number, ink: string, paper: string, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(48, Math.round((512 * h) / w));
  const c = canvas.getContext('2d')!;
  c.fillStyle = paper;
  c.fillRect(0, 0, canvas.width, canvas.height);
  const longest = Math.max(...lines.map((line) => line.length));
  const size = Math.min((canvas.height / lines.length) * 0.7, (512 / longest) * 1.5);
  c.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  lines.forEach((line, index) => {
    c.save();
    c.translate(256, (canvas.height * (index + 0.5)) / lines.length);
    c.rotate((random() - 0.5) * 0.05);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillText(line, 3, 4, 480);
    c.fillStyle = ink;
    c.fillText(line, 0, 0, 480);
    c.restore();
  });
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide });
}

function parasol(s: Sculpture, radius: number, rise: number, colours: readonly string[], missing: (panel: number) => boolean, fade: number) {
  const group = new THREE.Group();
  const positions: number[] = [], tints: number[] = [];
  const panels = 8, drop = 0.16;
  const pale = new THREE.Color('#ddd6c4');
  for (let i = 0; i < panels; i++) {
    if (missing(i)) continue;
    const a0 = (i / panels) * Math.PI * 2, a1 = ((i + 1) / panels) * Math.PI * 2;
    const p0 = [Math.cos(a0) * radius, 0, Math.sin(a0) * radius], p1 = [Math.cos(a1) * radius, 0, Math.sin(a1) * radius];
    const colour = new THREE.Color(colours[i % colours.length]).lerp(pale, fade);
    const trim = new THREE.Color(colours[(i + 1) % colours.length]).lerp(pale, fade);
    const push = (tint: THREE.Color, ...points: number[][]) => points.forEach((point) => { positions.push(...point); tints.push(tint.r, tint.g, tint.b); });
    push(colour, [0, rise, 0], p1, p0);
    push(trim, p0, p1, [p1[0], -drop, p1[2]]);
    push(trim, p0, [p1[0], -drop, p1[2]], [p0[0], -drop, p0[2]]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3));
  geometry.computeVertexNormals();
  const cloth = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }));
  cloth.castShadow = cloth.receiveShadow = true;
  group.add(cloth);
  const metal = s.material('#b9b6ac', { metalness: 0.5 });
  for (let i = 0; i < panels; i++) {
    const t = (i / panels) * Math.PI * 2;
    group.add(s.rod([0, rise - 0.01, 0], [Math.cos(t) * radius, -0.005, Math.sin(t) * radius], 0.008, metal));
  }
  group.add(s.cylinder(0.03, 0.03, 0.06, [0, rise + 0.02, 0], metal, 8));
  return group;
}

export default defineThing({
  questions: {
    brand: choice('What are the brand colours of the parasol and table skirt?', {
      yellow: 'Loud network yellow with black trim.',
      green: 'Green and white, the national-colours network.',
      red: 'Red and white.',
      blue: 'Sky blue and white, a bank-agent stand.',
      orange: 'Orange and black, the newcomer.',
      mixed: 'Two rival networks stitched together, yellow and red: the vendor sells everybody.',
    }),
    sign: choice('What does the hand-lettered sign say?', {
      recharge: 'RECHARGE CARD HERE.',
      charge: 'CHARGE YOUR PHONE N50.',
      call: 'MAKE CALL HERE.',
      pos: 'POS · TRANSFER · AIRTIME · DATA.',
      back: 'BACK IN 5 MINUTES, on a scrap of card.',
      credit: 'NO CREDIT ABEG.',
    }),
    phones: score('How many phones are charging on the strip?', ['One lonely handset', 'A handful', 'A dozen in a tangle', 'Twenty or more, stacked and labelled with tape']),
    stool: choice("What about the vendor's stool?", {
      vendor: 'The vendor sits on it, bent over a phone.',
      empty: 'Empty, pushed back as if just left.',
      held: 'Empty but for a folded cloth and a handbag keeping the place.',
      tipped: 'Knocked over on its side.',
    }),
    power: choice('Where does the power come from?', {
      lead: 'A long extension lead snaking away across the ground to somewhere with light.',
      battery: 'A car battery and a small inverter under the table.',
      solar: 'A small solar panel propped against the table leg, angled at the sun.',
      dead: 'Nowhere right now: the strip is dark and the plug lies loose. NEPA has taken light.',
    }),
    cards: score('How well stocked are the recharge cards?', ['A few last cards', 'One strip', 'Several strips pegged on a string', 'Curtains of card strips in every network colour']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const palette = { yellow: ['#f6c61a', '#1c1c1e'], green: ['#1f9a4a', '#f2f0e6'], red: ['#d42a24', '#f2f0e6'], blue: ['#3a9ad8', '#f2f0e6'], orange: ['#f07a1a', '#1c1c1e'], mixed: ['#f6c61a', '#d42a24'] }[a.brand];
    const ply = s.material('#c9a878'), wood = s.material('#8a6a44'), dark = s.material('#1e1e22'), white = s.material('#f0efe8');
    const live = a.power !== 'dead';

    // Table: plywood top on a rough frame, with a branded skirt and the sign.
    const tw = 1.15, td = 0.6, th = 0.76;
    s.box([tw, 0.025, td], [0, th, 0], ply);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.045, th, 0.045], [x * (tw / 2 - 0.05), th / 2, z * (td / 2 - 0.05)], wood);
    s.box([tw - 0.1, 0.03, 0.03], [0, 0.2, -td / 2 + 0.05], wood);
    const skirt = s.material(palette[0], { roughness: 0.8, side: THREE.DoubleSide });
    s.box([tw, 0.5, 0.008], [0, th - 0.26, td / 2 + 0.004], skirt);
    s.box([tw, 0.07, 0.01], [0, th - 0.045, td / 2 + 0.006], s.material(palette[1]));
    for (const x of [-1, 1]) s.box([0.008, 0.5, td], [x * (tw / 2 + 0.004), th - 0.26, 0], skirt);
    const scrap = a.sign === 'back';
    const signW = scrap ? 0.5 : 0.95, signH = scrap ? 0.3 : 0.36;
    const signMat = lettering(SIGNS[a.sign], signW, signH, scrap ? '#1c1c1e' : pick(['#b3261e', '#1b3f8f', '#14141a']), scrap ? '#d8c8a0' : '#f4f0de', random);
    const sign = s.mesh(new THREE.PlaneGeometry(signW, signH), signMat, [scrap ? 0.15 : 0, th - 0.3, td / 2 + 0.014]);
    sign.rotation.z = scrap ? -0.08 : (random() - 0.5) * 0.04;

    // Power strip and phones.
    const stripX = -0.1, stripZ = -0.12;
    s.box([0.5, 0.035, 0.07], [stripX, th + 0.03, stripZ], white);
    s.box([0.03, 0.012, 0.03], [stripX - 0.22, th + 0.052, stripZ], s.material('#d42a24', { emissive: '#ff3a2a', emissiveIntensity: live ? 1.6 : 0 }));
    const count = Math.round(mix(1, 22, a.phones * a.phones * 0.6 + a.phones * 0.4));
    const screens: THREE.MeshStandardMaterial[] = [];
    const cable = s.material('#e8e6de'), blackCable = s.material('#222226');
    const bodies = ['#1c1c20', '#2a2a30', '#b8bcc0', '#c8322a', '#1f4fb0', '#e8c020', '#f0efe8'];
    for (let i = 0; i < count; i++) {
      const col = i % 6, layer = Math.floor(i / 12);
      const row = Math.floor(i / 6) % 2;
      const x = stripX - 0.3 + col * 0.13 + (random() - 0.5) * 0.05, z = stripZ + 0.14 + row * 0.17 + (random() - 0.5) * 0.04;
      const y = th + 0.02 + layer * 0.016;
      const smart = random() > 0.45;
      const group = new THREE.Group();
      const size: P = smart ? [0.07, 0.01, 0.145] : [0.05, 0.016, 0.115];
      group.add(s.box(size, [0, 0, 0], s.material(pick(bodies), { roughness: 0.4 })));
      const lit = live && random() < 0.75;
      const screen = new THREE.MeshStandardMaterial({ color: lit ? '#bfe8c8' : '#15171a', emissive: lit ? pick(['#6affa0', '#a8d8ff', '#ffffff', '#ffe08a']) : '#000000', emissiveIntensity: lit ? 0.9 : 0, roughness: 0.2 });
      if (lit) screens.push(screen);
      group.add(s.box(smart ? [0.06, 0.003, 0.125] : [0.04, 0.003, 0.045], [0, size[1] / 2 + 0.001, smart ? 0 : -0.028], screen));
      if (!smart) for (let k = 0; k < 3; k++) group.add(s.box([0.036, 0.003, 0.008], [0, size[1] / 2 + 0.001, 0.01 + k * 0.016], s.material('#8a8e92')));
      if (a.phones > 0.7 && random() > 0.4) group.add(s.box([0.04, 0.003, 0.018], [0, size[1] / 2 + 0.003, smart ? 0.045 : 0.05], s.material('#e8dcb0')));
      group.position.set(x, y + size[1] / 2, z);
      group.rotation.y = (random() - 0.5) * 0.9;
      s.root.add(group);
      const socket = stripX - 0.18 + (i % 5) * 0.09;
      s.tube([[x, y + 0.01, z - size[2] / 2], [(x + socket) / 2 + (random() - 0.5) * 0.1, th + 0.035 + random() * 0.03, (z + stripZ) / 2], [socket, th + 0.06, stripZ]], 0.004, random() > 0.4 ? blackCable : cable);
      if (i < 5) s.box([0.035, 0.035, 0.035], [socket, th + 0.062, stripZ], random() > 0.5 ? white : dark);
    }
    // The ledger, a calculator, a cash tin with a padlock.
    s.box([0.2, 0.02, 0.15], [0.4, th + 0.024, 0.14], s.material('#27405a')).rotation.y = 0.2;
    s.box([0.19, 0.004, 0.14], [0.4, th + 0.036, 0.14], white).rotation.y = 0.2;
    s.box([0.07, 0.012, 0.11], [0.42, th + 0.02, -0.12], dark).rotation.y = -0.3;
    s.box([0.2, 0.11, 0.13], [0.42, th + 0.068, -0.02 - 0.2], s.material('#5a6a5a', { metalness: 0.4 }));
    s.ring(0.015, 0.004, [0.42, th + 0.05, -0.15], s.material('#c9a84a', { metalness: 0.8 }));

    // Parasol, its pole lashed to the table.
    const top = parasol(s, 1.3, 0.38, palette, () => false, mix(0.0, 0.22, mood.wear));
    const lean = new THREE.Group();
    lean.position.set(0.25, 0, -td / 2 - 0.06);
    lean.rotation.set((random() - 0.5) * 0.08, 0, (random() - 0.5) * 0.1);
    lean.add(s.rod([0, 0, 0], [0, 2.3, 0], 0.022, s.material('#c9c6ba', { metalness: 0.5 })));
    top.position.y = 2.0;
    top.rotation.y = random();
    lean.add(top);
    s.root.add(lean);
    s.ring(0.2, 0.08, [0.25, 0.08, -td / 2 - 0.06], s.material('#232326', { roughness: 0.95 })).rotation.x = Math.PI / 2;
    s.cylinder(0.2, 0.2, 0.12, [0.25, 0.07, -td / 2 - 0.06], s.material('#a9a79c'), 14);
    // Card strips pegged on a string beneath the canopy.
    const strips = Math.round(mix(0, 9, a.cards));
    const cardColours = ['#f6c61a', '#1f9a4a', '#d42a24', '#3a9ad8', '#f07a1a', '#f2f0e6'];
    const stringY = 1.72;
    s.rod([-0.62, stringY, 0.1], [0.72, stringY, 0.1], 0.004, blackCable);
    s.rod([-0.62, stringY, 0.1], [-0.56, 0.78, 0.26], 0.012, wood);
    s.rod([0.72, stringY, 0.1], [0.56, 0.78, 0.26], 0.012, wood);
    const cardPoints: { at: P; size: number; color: string }[] = [];
    for (let i = 0; i < Math.max(1, strips); i++) {
      const x = strips <= 1 ? 0 : mix(-0.5, 0.6, i / (strips - 1));
      const long = strips === 0 ? 2 : 3 + Math.floor(random() * 5);
      const colour = pick(cardColours);
      for (let k = 0; k < long; k++) cardPoints.push({ at: [x, stringY - 0.05 - k * 0.075, 0.1 + (random() - 0.5) * 0.01], size: 1, color: colour });
    }
    s.scatter(new THREE.BoxGeometry(0.1, 0.068, 0.004), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), cardPoints);

    // Power source.
    if (a.power === 'lead' || a.power === 'dead') {
      const end: P = a.power === 'lead' ? [-1.45, 0.012, -0.5 - random() * 0.4] : [-0.9, 0.012, 0.5];
      s.tube([[stripX - 0.25, th + 0.03, stripZ], [-0.62, th - 0.1, -0.2], [-0.75, 0.05, -0.1], [-1.1, 0.012, 0.25 - random() * 0.3], [(end[0] - 1.1) / 2 - 0.1, 0.012, 0.05], end], 0.008, s.material('#e87a1c'));
      if (a.power === 'dead') s.box([0.06, 0.035, 0.05], end, white);
      else s.cylinder(0.14, 0.14, 0.07, [end[0] - 0.1, 0.035, end[2]], s.material('#e87a1c'), 14);
    }
    if (a.power === 'battery') {
      s.box([0.28, 0.2, 0.18], [-0.25, 0.1, -0.05], dark);
      s.box([0.28, 0.025, 0.18], [-0.25, 0.21, -0.05], s.material('#3a5aa8'));
      for (const x of [-0.1, 0.1]) s.cylinder(0.014, 0.014, 0.03, [-0.25 + x, 0.235, -0.05], s.material(x < 0 ? '#d42a24' : '#1c1c1e'), 8);
      s.box([0.22, 0.09, 0.14], [0.12, 0.045, -0.05], s.material('#8a8e92', { metalness: 0.5 }));
      s.box([0.02, 0.02, 0.005], [0.18, 0.06, 0.022], s.material('#3aff7a', { emissive: '#3aff7a', emissiveIntensity: 1.5 }));
      s.tube([[-0.15, 0.24, -0.05], [-0.02, 0.2, 0.0], [0.05, 0.08, -0.05]], 0.006, s.material('#d42a24'));
      s.tube([[0.2, 0.08, -0.05], [0.3, 0.4, -0.2], [stripX + 0.25, th + 0.03, stripZ]], 0.006, blackCable);
    }
    if (a.power === 'solar') {
      const panel = new THREE.Group();
      panel.add(s.box([0.62, 0.02, 0.42], [0, 0, 0], s.material('#b8bcc0', { metalness: 0.6 })));
      panel.add(s.box([0.58, 0.022, 0.38], [0, 0.002, 0], s.material('#1a2a5a', { roughness: 0.15, metalness: 0.3 })));
      for (let i = 1; i < 4; i++) panel.add(s.box([0.004, 0.024, 0.38], [-0.29 + i * 0.145, 0.003, 0], s.material('#8a94b0')));
      panel.position.set(-0.98, 0.24, 0.25);
      panel.rotation.set(0, 0.5, 0.9);
      s.root.add(panel);
      s.rod([-1.12, 0.36, 0.3], [-1.3, 0, 0.36], 0.012, wood);
      s.tube([[-0.9, 0.12, 0.2], [-0.7, 0.02, 0.0], [-0.62, 0.4, -0.2], [stripX - 0.25, th + 0.03, stripZ]], 0.006, blackCable);
    }

    // The stool.
    const sx = 0.05 + (random() - 0.5) * 0.2, sz = -1.0;
    const stoolMat = s.material(pick(['#2a62c8', '#c8322a', '#2c8a56', '#f0f0e8', '#7a4a2a']));
    const stool = new THREE.Group();
    stool.add(s.cylinder(0.17, 0.21, 0.44, [0, 0.22, 0], stoolMat, 12), s.cylinder(0.18, 0.18, 0.02, [0, 0.45, 0], stoolMat, 12));
    stool.position.set(sx, 0, sz);
    s.root.add(stool);
    if (a.stool === 'tipped') { stool.rotation.z = Math.PI / 2 - 0.12; stool.rotation.y = random() * 2; stool.position.set(sx + 0.3, 0.2, sz - 0.1); }
    if (a.stool === 'empty') stool.position.z -= 0.25;
    if (a.stool === 'held') {
      s.box([0.26, 0.05, 0.22], [sx, 0.485, sz], s.material(pick(['#d86a9a', '#e0a020', '#3a8a8a'])));
      s.box([0.2, 0.15, 0.09], [sx + 0.02, 0.585, sz], s.material('#4a2a1a'));
      s.ring(0.07, 0.008, [sx + 0.02, 0.67, sz], s.material('#4a2a1a'), Math.PI);
    }
    if (a.stool === 'vendor') {
      const shirt = s.material(pick([palette[0], '#e8e2d0', '#7a3a8a', '#2f6fb0']));
      const wrap = s.material(pick(['#30383f', '#7a2a4a', '#27405a', '#3a6a4a']));
      const flesh = s.material(pick(['#5a3a28', '#6b4630', '#4a2f20']));
      s.rod([sx, 0.48, sz], [sx, 1.02, sz + 0.1], 0.17, shirt, 0.14);
      s.ball([0.1, 0.115, 0.1], [sx, 1.2, sz + 0.2], flesh, 12);
      s.ball([0.105, 0.07, 0.105], [sx, 1.26, sz + 0.17], s.material(pick(['#1c1c1e', palette[0], '#d86a9a'])), 10);
      for (const x of [-1, 1]) {
        s.rod([sx + x * 0.09, 0.5, sz], [sx + x * 0.12, 0.5, sz + 0.38], 0.07, wrap);
        s.rod([sx + x * 0.12, 0.5, sz + 0.38], [sx + x * 0.12, 0.03, sz + 0.42], 0.05, wrap);
        s.rod([sx + x * 0.17, 0.98, sz + 0.1], [sx + x * 0.08, 0.84, sz + 0.42], 0.035, flesh);
      }
      s.box([0.07, 0.012, 0.13], [sx, 0.85, sz + 0.45], dark).rotation.x = -0.7;
      const glow = new THREE.MeshStandardMaterial({ color: '#cfe8ff', emissive: '#a8d8ff', emissiveIntensity: 1 });
      s.box([0.06, 0.004, 0.11], [sx, 0.856, sz + 0.445], glow).rotation.x = -0.7;
      screens.push(glow);
    }
    // Wear and crowding: scratched-off cards on the ground.
    const litter = Math.round((mood.wear * 0.5 + mood.density * 0.5) * 12);
    for (let i = 0; i < litter; i++) s.box([0.09, 0.003, 0.055], [(random() - 0.5) * 2.2, 0.002, 0.45 + random() * 0.7], s.material(pick(cardColours))).rotation.y = random() * 3;

    const sway = mix(0.004, 0.025, mood.energy), tilt = lean.rotation.z;
    const base = screens.map((screen) => screen.emissiveIntensity);
    return s.finish({
      footprint: 1.2,
      update: (_dt, time) => {
        lean.rotation.z = tilt + Math.sin(time * 1.1) * sway;
        screens.forEach((screen, index) => { screen.emissiveIntensity = base[index] * (0.75 + 0.25 * Math.sin(time * (1.5 + mood.energy * 4) + index * 2.1)); });
      },
    });
  },
});
