import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    inside: choice('What is in the basket?', {
      dinner: 'Dinner for one: a single frozen meal, one can of beer and a small tub of ice cream.',
      birthday: 'A last-minute birthday: cake mix, frosting, a pack of candles and a party hat.',
      baby: 'Tins of baby formula, a pack of nappies and a feeding bottle.',
      date: 'A date that did not happen: a bottle of wine, a bunch of flowers and a box of chocolates.',
      noodles: 'Instant noodle cups and energy drinks, a night-shift or exam-week haul.',
      cat: 'Tins of cat food stacked high and one bag of kibble, nothing for the owner.',
      sick: 'Sick-day supplies: soup cans, tissues, orange juice and a bottle of medicine.',
      list: 'Nothing but a hand-written shopping list and a pen.',
    }),
    waiting: choice('How long has it been sitting there?', {
      moments: 'Moments: everything still cold and upright, as if they will be right back.',
      while: 'A while: frost gone, a puddle starting to spread from under it.',
      hours: 'Hours: packaging slumped and soggy, a wide puddle gone sticky at the edges.',
    }),
    forgotten: choice('What was forgotten on top of it?', {
      nothing: 'Nothing.',
      phone: 'A phone, screen lit with a call nobody is answering.',
      keys: 'A bunch of keys on a bright fob.',
      wallet: 'A worn leather wallet.',
      toy: "A child's small stuffed rabbit.",
      ring: 'A small velvet ring box, shut.',
    }),
    position: choice('How was it left?', {
      set: 'Set down carefully, handles standing, square to the shelf.',
      dropped: 'Dropped where they stood, handles flopped, things toppled inside.',
      tipped: 'Kicked over on its side, the contents spilled across the floor.',
    }),
    colour: choice('What is the basket like?', {
      red: 'Red plastic.',
      green: 'Supermarket green plastic.',
      blue: 'Blue plastic.',
      grey: 'Charcoal grey plastic, a newer upmarket store.',
      orange: 'Bright orange plastic, a discount chain.',
      wire: 'An old chromed wire basket with red plastic grips.',
    }),
    beside: choice('What lies on the floor beside it?', {
      nothing: 'Nothing.',
      umbrella: 'A folded umbrella still dripping.',
      mitten: 'One small woollen mitten.',
      footprints: 'Wet footprints leading away.',
      receipt: 'A long curling receipt from another shop.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const wire = a.colour === 'wire';
    const tintHex = { red: '#d02a22', green: '#2c8a4a', blue: '#2458c0', grey: '#3c4046', orange: '#f07016', wire: '#c8ced2' }[a.colour];
    const plastic = s.material(tintHex, { roughness: wire ? 0.25 : 0.45, metalness: wire ? 0.85 : 0.05 });
    const grip = wire ? s.material('#d02a22', { roughness: 0.5 }) : plastic;
    const mat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6, ...options });
    const soggy = a.waiting === 'hours' ? 1 : a.waiting === 'while' ? 0.4 : 0;

    // Item builders. Each returns a group standing on y = 0.
    const shadowed = <T extends THREE.Object3D>(node: T) => { node.traverse((n) => { n.castShadow = n.receiveShadow = true; }); return node; };
    const group = (...parts: THREE.Object3D[]) => { const g = new THREE.Group(); g.add(...parts); return shadowed(g); };
    const box = (size: P3, at: P3, material: THREE.Material) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...at); return mesh; };
    const cyl = (rt: number, rb: number, h: number, at: P3, material: THREE.Material, seg = 18) => { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material); mesh.position.set(...at); return mesh; };
    const ball = (size: P3, at: P3, material: THREE.Material) => { const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), material); mesh.scale.set(...size); mesh.position.set(...at); return mesh; };
    const packet = (w: number, h: number, d: number, colour: string, panel: string, spot: string) => group(
      box([w, h, d], [0, h / 2, 0], mat(colour, { roughness: 0.7 })),
      box([w * 0.84, h * 0.24, d + 0.003], [0, h * 0.8, 0], mat(panel)),
      cyl(Math.min(w, h) * 0.28, Math.min(w, h) * 0.28, d + 0.004, [0, h * 0.38, 0], mat(spot), 18).rotateX(Math.PI / 2),
    );
    const can = (r: number, h: number, colour: string, band: string) => group(cyl(r, r, h, [0, h / 2, 0], mat(colour, { metalness: 0.6, roughness: 0.3 })), cyl(r + 0.0015, r + 0.0015, h * 0.4, [0, h * 0.5, 0], mat(band)), cyl(r * 0.85, r, h * 0.04, [0, h, 0], mat('#c8ced2', { metalness: 0.9, roughness: 0.25 })));
    const tub = (r: number, h: number, colour: string, lid: string) => group(cyl(r, r * 0.84, h, [0, h / 2, 0], mat(colour)), cyl(r * 1.05, r * 1.05, h * 0.16, [0, h * 0.95, 0], mat(lid)));
    const bottle = (colour: string, label: string, h = 0.3) => group(
      new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.037, 0], [0.037, h * 0.58], [0.03, h * 0.68], [0.014, h * 0.78], [0.013, h * 0.97], [0.016, h * 0.98], [0.016, h], [0.001, h]].map(([x, y]) => new THREE.Vector2(x, y)), 20), mat(colour, { roughness: 0.12, metalness: 0.2 })),
      cyl(0.0385, 0.0385, h * 0.26, [0, h * 0.3, 0], mat(label)), cyl(0.0165, 0.0165, h * 0.1, [0, h * 0.94, 0], mat('#8a2a2a')),
    );
    const bouquet = () => {
      const g = group(new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.3, 14, 1, true).rotateX(Math.PI).translate(0, 0.15, 0), mat(pick(['#f4eede', '#f2c8d8', '#c8dcc8']), { side: THREE.DoubleSide, roughness: 0.8 })));
      const blooms = [pick(['#e8283a', '#f078a8', '#f5cb1c', '#f4f0e8', '#b060d0']), pick(['#e8283a', '#f078a8', '#f5cb1c', '#f4f0e8'])];
      for (let i = 0; i < 9; i++) { const t = i * 2.4, r = 0.012 + Math.sqrt(i) * 0.02; g.add(shadowed(ball([0.03, 0.026, 0.03], [Math.cos(t) * r, 0.3 + 0.03 - r * 0.25, Math.sin(t) * r], mat(mood.wear > 0.6 || soggy > 0.9 ? '#9a7a5a' : blooms[i % 2], { roughness: 0.8 })))); }
      for (let i = 0; i < 4; i++) g.add(shadowed(ball([0.03, 0.006, 0.012], [Math.cos(i * 1.6) * 0.07, 0.27, Math.sin(i * 1.6) * 0.07], mat('#3a7a3a'))));
      return g;
    };
    const softPack = (w: number, h: number, d: number, colour: string, spot: string) => group(ball([w / 2, h / 2, d / 2], [0, h / 2, 0], mat(colour, { roughness: 0.9 })), box([w * 0.72, h * 0.72, d * 0.9], [0, h / 2, 0], mat(colour, { roughness: 0.9 })), ball([w * 0.2, w * 0.2, 0.004], [0, h * 0.55, d * 0.47], mat(spot)));
    const hat = () => { const g = group(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 16).translate(0, 0.08, 0), mat(pick(['#f078a8', '#2ab0de', '#f5cb1c'])))); for (let i = 0; i < 3; i++) g.add(shadowed(cyl(0.05 - (i + 1) * 0.0125 + 0.002, 0.05 - (i + 0.55) * 0.0125 + 0.002, 0.014, [0, 0.04 * (i + 0.7), 0], mat('#f4f0e8')))); g.add(shadowed(ball([0.014, 0.014, 0.014], [0, 0.165, 0], mat('#f4f0e8')))); return g; };

    type Entry = { make: () => THREE.Object3D; at: [number, number]; lean?: number; turn?: number; lie?: boolean };
    const sets: Record<Exclude<typeof a.inside, 'list'>, Entry[]> = {
      dinner: [
        { make: () => packet(0.2, 0.25, 0.04, '#b8281e', '#f6f2e4', '#c98a4a'), at: [-0.05, -0.05], lean: -0.22 },
        { make: () => can(0.033, 0.123, pick(['#c8ced2', '#1f6a3a', '#c8a23a']), '#f4f0e8'), at: [0.11, 0.02] },
        { make: () => tub(0.05, 0.1, pick(['#f2b8c8', '#9ad8c8', '#f6ecd2']), '#f4f0e8'), at: [-0.03, 0.06] },
      ],
      birthday: [
        { make: () => packet(0.14, 0.2, 0.05, '#f078a8', '#f6f2e4', '#f5cb1c'), at: [-0.09, -0.04], lean: -0.15 },
        { make: () => tub(0.047, 0.085, '#f4f0e8', '#7a4a30'), at: [0.04, 0.05] },
        { make: () => { const g = packet(0.07, 0.13, 0.02, '#2ab0de', '#f6f2e4', '#f6f2e4'); for (let i = 0; i < 5; i++) g.add(box([0.006, 0.07, 0.022], [(i - 2) * 0.012, 0.05, 0.001], mat(['#e8283a', '#f5cb1c', '#5cc21f', '#f078a8', '#f4f0e8'][i]))); return g; }, at: [0.12, -0.06], lean: 0.2, turn: 0.4 },
        { make: hat, at: [0.06, -0.03] },
        { make: () => softPack(0.13, 0.15, 0.03, pick(['#f5cb1c', '#5cc21f']), '#e8283a'), at: [-0.1, 0.07], lean: 0.3 },
      ],
      baby: [
        { make: () => can(0.06, 0.15, '#a8d0f0', '#f6f2e4'), at: [-0.09, -0.03] },
        { make: () => can(0.06, 0.15, '#a8d0f0', '#f6f2e4'), at: [0.04, -0.04], turn: 1 },
        { make: () => softPack(0.22, 0.17, 0.1, pick(['#a8e0c0', '#f2c8d8', '#c8c0f0']), '#f6f2e4'), at: [-0.02, 0.07] },
        { make: () => group(cyl(0.027, 0.027, 0.11, [0, 0.055, 0], mat('#f4f8fa', { transparent: true, opacity: 0.8, roughness: 0.1 })), cyl(0.03, 0.03, 0.02, [0, 0.12, 0], mat('#f078a8')), ball([0.012, 0.02, 0.012], [0, 0.14, 0], mat('#e8c8a0'))), at: [0.13, 0.05] },
      ],
      date: [
        { make: () => bottle(pick(['#1c3a24', '#2a1418', '#3a3018']), '#f4f0e0'), at: [-0.11, -0.03], lean: -0.25, turn: 0.3 },
        { make: bouquet, at: [0.07, 0.02], lean: 0.5, turn: -0.4 },
        { make: () => group(box([0.16, 0.03, 0.16], [0, 0.015, 0], mat('#b8201c')), box([0.165, 0.032, 0.02], [0, 0.015, 0], mat('#d8b84a', { metalness: 0.6 })), box([0.02, 0.032, 0.165], [0, 0.015, 0], mat('#d8b84a', { metalness: 0.6 }))), at: [-0.02, 0.05], lie: true },
      ],
      noodles: [
        ...[[-0.11, -0.04], [-0.01, -0.05], [-0.07, 0.06]].map((at): Entry => ({ make: () => group(cyl(0.047, 0.036, 0.1, [0, 0.05, 0], mat('#f4f0e8')), cyl(0.046, 0.04, 0.045, [0, 0.055, 0], mat(pick(['#d02a22', '#f07016', '#2c8a4a']))), cyl(0.05, 0.05, 0.006, [0, 0.102, 0], mat('#e8d8a0'))), at: at as [number, number] })),
        { make: () => can(0.027, 0.165, '#1c1c20', '#8cf03c'), at: [0.1, -0.03] },
        { make: () => can(0.027, 0.165, '#1c1c20', pick(['#8cf03c', '#2ab0de', '#f0283c'])), at: [0.11, 0.05], lean: 0.2 },
      ],
      cat: [
        ...[[-0.11, -0.05], [-0.02, -0.06], [-0.1, 0.05]].map((at): Entry => ({ make: () => { const g = new THREE.Group(); const n = 2 + Math.floor(random() * 3); for (let i = 0; i < n; i++) { const tin = can(0.04, 0.036, '#c8ced2', pick(['#8a3ac8', '#f07016', '#2ab0de', '#e8283a'])); tin.position.set((random() - 0.5) * 0.008, i * 0.038, (random() - 0.5) * 0.008); g.add(tin); } return g; }, at: at as [number, number] })),
        { make: () => { const g = softPack(0.17, 0.25, 0.08, '#6a3a9a', '#f6f2e4'); g.add(ball([0.008, 0.008, 0.003], [-0.012, 0.145, 0.04], mat('#1c1c20')), ball([0.008, 0.008, 0.003], [0.012, 0.145, 0.04], mat('#1c1c20'))); for (const side of [-1, 1]) g.add(new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.022, 3).translate(side * 0.022, 0.178, 0.036), mat('#f6f2e4'))); return shadowed(g); }, at: [0.09, 0.03], lean: -0.12, turn: -0.3 },
      ],
      sick: [
        { make: () => can(0.034, 0.1, '#c8201c', '#f6f2e4'), at: [-0.12, -0.05] },
        { make: () => can(0.034, 0.1, '#c8201c', '#f6f2e4'), at: [-0.04, -0.06], turn: 2 },
        { make: () => { const g = group(box([0.22, 0.08, 0.11], [0, 0.04, 0], mat(pick(['#a8d0f0', '#f2c8d8', '#c8e0b8']))), box([0.1, 0.004, 0.03], [0, 0.081, 0], mat('#3a4a5a'))); const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 5, 1, true).translate(0, 0.105, 0), mat('#ffffff', { side: THREE.DoubleSide })); tuft.rotation.z = 0.3; g.add(shadowed(tuft)); return g; }, at: [0.0, 0.06], lie: true },
        { make: () => { const g = packet(0.07, 0.19, 0.07, '#f08a1c', '#f6f2e4', '#f5b01c'); const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.07, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).translate(0, 0.2, 0), mat('#f08a1c')); roof.scale.set(1, 0.6, 1); roof.position.y = 0.085; g.add(shadowed(roof)); return g; }, at: [0.12, -0.04] },
        { make: () => group(cyl(0.024, 0.024, 0.075, [0, 0.0375, 0], mat('#6a3a1c', { roughness: 0.2 })), cyl(0.0245, 0.0245, 0.035, [0, 0.035, 0], mat('#f6f2e4')), cyl(0.02, 0.02, 0.022, [0, 0.086, 0], mat('#f6f2e4'))), at: [0.13, 0.06] },
      ],
    };

    // The basket itself.
    const basket = new THREE.Group();
    const TW = 0.45, TD = 0.31, BW = 0.37, BD = 0.24, H = 0.21;
    const wallArt = paint(256, 128, (ctx) => {
      if (wire) { ctx.clearRect(0, 0, 256, 128); ctx.strokeStyle = tintHex; ctx.lineWidth = 3; for (let x = 4; x < 256; x += 21) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke(); } ctx.lineWidth = 4; for (const y of [3, 44, 86, 125]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); } return; }
      ctx.fillStyle = tintHex; ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 0, 256, 14);
      ctx.fillStyle = 'rgba(10,10,14,0.5)';
      for (let row = 0; row < 2; row++) for (let x = 10; x < 240; x += 25) { ctx.beginPath(); ctx.roundRect(x, 24 + row * 48, 14, 38, 4); ctx.fill(); }
      ctx.fillStyle = tintHex; ctx.fillRect(82, 20, 96, 48); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '900 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pick(['SHOP', 'FRESH', 'SAVE', 'MART']), 128, 45);
    });
    const wallMat = new THREE.MeshStandardMaterial({ map: wallArt, alphaTest: 0.5, side: THREE.DoubleSide, roughness: wire ? 0.25 : 0.45, metalness: wire ? 0.85 : 0.05, transparent: false });
    const quad = (p: P3[]) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p.flat(), 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); const mesh = new THREE.Mesh(g, wallMat); mesh.castShadow = mesh.receiveShadow = true; basket.add(mesh); };
    const bw = BW / 2, bd = BD / 2, tw = TW / 2, td = TD / 2;
    quad([[-bw, 0, bd], [bw, 0, bd], [tw, H, td], [-tw, H, td]]); quad([[bw, 0, -bd], [-bw, 0, -bd], [-tw, H, -td], [tw, H, -td]]);
    quad([[bw, 0, bd], [bw, 0, -bd], [tw, H, -td], [tw, H, td]]); quad([[-bw, 0, -bd], [-bw, 0, bd], [-tw, H, td], [-tw, H, -td]]);
    basket.add(shadowed(box([BW, 0.008, BD], [0, 0.004, 0], wire ? mat(tintHex, { metalness: 0.85, roughness: 0.3, transparent: true, opacity: 0.999 }) : plastic)));
    for (const side of [-1, 1]) { basket.add(shadowed(box([TW + 0.02, 0.022, 0.02], [0, H, side * td], plastic)), shadowed(box([0.02, 0.022, TD + 0.02], [side * tw, H, 0], plastic))); }
    // Handles: two hoops hinged on the long rims.
    const hoop = (side: number, raise: number) => {
      const pivot = new THREE.Group(); pivot.position.set(0, H + 0.01, side * td);
      const curve = new THREE.CatmullRomCurve3(([[-tw + 0.04, 0, 0], [-tw + 0.05, 0.12, 0], [-0.1, 0.175, 0], [0.1, 0.175, 0], [tw - 0.05, 0.12, 0], [tw - 0.04, 0, 0]] as P3[]).map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.4);
      pivot.add(shadowed(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, wire ? 0.006 : 0.009, 7), plastic)));
      const g = cyl(0.014, 0.014, 0.17, [0, 0.176, 0], grip, 10); g.rotation.z = Math.PI / 2; pivot.add(shadowed(g));
      // raise 1 = standing, meeting over the middle; 0 = folded flat outward.
      pivot.rotation.x = side * mix(Math.PI / 2 + 0.25, -0.4, raise);
      basket.add(pivot);
    };
    const tipped = a.position === 'tipped';
    hoop(1, a.position === 'set' ? 1 : tipped ? 0.05 : random() < 0.5 ? 0.9 : 0.02);
    hoop(-1, a.position === 'set' ? 1 : tipped ? 0.3 : 0.03 + random() * 0.1);
    s.root.add(basket);

    // Contents.
    const spill = new THREE.Group(); s.root.add(spill);
    const topple = a.position === 'dropped' ? 1 : 0;
    if (a.inside === 'list') {
      const listArt = paint(128, 256, (ctx) => { ctx.fillStyle = '#fbf8ea'; ctx.fillRect(0, 0, 128, 256); ctx.strokeStyle = '#2a3a8a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = 0; i < 9; i++) { const y = 26 + i * 25; ctx.beginPath(); ctx.moveTo(14, y); let x = 14; while (x < 40 + random() * 70) { x += 5; ctx.lineTo(x, y + (random() - 0.5) * 7); } ctx.stroke(); if (i < 3 + random() * 4) { ctx.strokeStyle = '#c8281e'; ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(x + 6, y - 2); ctx.stroke(); ctx.strokeStyle = '#2a3a8a'; } } });
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: listArt, roughness: 0.9, side: THREE.DoubleSide }));
      sheet.position.set(tipped ? 0.1 : -0.03, tipped ? 0.004 : 0.012, tipped ? 0.42 : 0.01); sheet.rotation.y = 0.5 + random(); sheet.castShadow = true; (tipped ? spill : basket).add(sheet);
      const pen = cyl(0.005, 0.005, 0.14, [tipped ? 0.24 : 0.09, tipped ? 0.006 : 0.016, tipped ? 0.36 : -0.02], mat('#1f4fb8'), 8); pen.rotation.set(Math.PI / 2, 0, 0.8 + random()); (tipped ? spill : basket).add(shadowed(pen));
    } else {
      sets[a.inside].forEach((entry, index) => {
        const item = entry.make(); const holder = new THREE.Group(); holder.add(item);
        if (tipped) {
          // Thrown out of the mouth of the basket across the floor.
          const r = 0.22 + index * 0.1 + random() * 0.12, t = (index - 2) * 0.42 + (random() - 0.5) * 0.3;
          const size = new THREE.Box3().setFromObject(item).getSize(new THREE.Vector3());
          const flat = entry.lie || size.y < Math.max(size.x, size.z) * 0.6;
          if (!flat) { item.rotation.z = Math.PI / 2; item.position.y = Math.max(size.x, size.z) / 2; item.position.x = size.y / 2; }
          holder.position.set(Math.sin(t) * r, 0, 0.22 + Math.cos(t) * r * 0.9); holder.rotation.y = random() * Math.PI * 2;
          spill.add(holder);
        } else {
          holder.position.set(entry.at[0], 0.008, entry.at[1]);
          holder.rotation.y = (entry.turn ?? 0) + (random() - 0.5) * 0.5;
          holder.rotation.z = (entry.lean ?? 0) * (1 + topple * 0.8) + (random() - 0.5) * (0.08 + topple * 0.35 + soggy * 0.12);
          holder.rotation.x = (random() - 0.5) * (0.06 + topple * 0.3);
          basket.add(holder);
        }
      });
    }
    if (tipped) { basket.rotation.x = Math.PI / 2 - 0.12; basket.position.set(0, TD / 2 - 0.01, -0.02); }
    else basket.rotation.y = a.position === 'dropped' ? (random() - 0.5) * 0.7 : 0;

    // Forgotten on top: balanced across a corner of the rim, or on the floor if it tipped.
    if (a.forgotten !== 'nothing') {
      const thing = new THREE.Group();
      if (a.forgotten === 'phone') {
        const caller = pick(['MOM', 'HOME', 'DAD', 'WORK', 'UNKNOWN', 'SAM']);
        const screen = paint(128, 256, (ctx) => { ctx.fillStyle = '#10141c'; ctx.fillRect(0, 0, 128, 256); ctx.fillStyle = '#eaf2ff'; ctx.textAlign = 'center'; ctx.font = '900 26px sans-serif'; ctx.fillText(caller, 64, 84, 116); ctx.font = '14px sans-serif'; ctx.fillText('calling...', 64, 110); ctx.fillStyle = '#3cd060'; ctx.beginPath(); ctx.arc(92, 200, 20, 0, 7); ctx.fill(); ctx.fillStyle = '#e83a3a'; ctx.beginPath(); ctx.arc(36, 200, 20, 0, 7); ctx.fill(); });
        thing.add(box([0.075, 0.009, 0.155], [0, 0.0045, 0], mat('#1c1c20', { roughness: 0.3 })));
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.146).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: screen, emissive: '#ffffff', emissiveMap: screen, emissiveIntensity: 1.1, roughness: 0.1 })); glass.position.y = 0.0095; thing.add(glass);
      } else if (a.forgotten === 'keys') {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.003, 6, 18).rotateX(Math.PI / 2), mat('#c8ced2', { metalness: 0.9, roughness: 0.2 })); ring.position.y = 0.004; thing.add(ring);
        for (let i = 0; i < 4; i++) { const key = box([0.012, 0.003, 0.06], [Math.sin(i * 0.5 - 0.6) * 0.045, 0.003 + i * 0.002, Math.cos(i * 0.5 - 0.6) * 0.045], mat(i % 2 ? '#c8a23a' : '#b8c0c4', { metalness: 0.85, roughness: 0.3 })); key.rotation.y = i * 0.5 - 0.6; thing.add(key); }
        thing.add(box([0.04, 0.012, 0.06], [-0.04, 0.006, -0.03], mat(pick(['#f0283c', '#2ab0de', '#f5cb1c', '#5cc21f']))));
      } else if (a.forgotten === 'wallet') {
        thing.add(box([0.11, 0.022, 0.09], [0, 0.011, 0], mat('#5a3a22', { roughness: 0.75 })), box([0.112, 0.004, 0.092], [0, 0.011, 0], mat('#3a2414')), box([0.08, 0.003, 0.02], [0.005, 0.024, -0.03], mat('#3a7a5a')));
      } else if (a.forgotten === 'toy') {
        const fur = mat(pick(['#e8dcc8', '#c8b8a0', '#f2c8d0', '#b8c8d8']), { roughness: 1 });
        thing.add(ball([0.04, 0.03, 0.055], [0, 0.03, 0], fur), ball([0.032, 0.03, 0.032], [0, 0.04, 0.07], fur));
        for (const side of [-1, 1]) { const ear = ball([0.01, 0.008, 0.045], [side * 0.016, 0.05, 0.115], fur); ear.rotation.y = side * 0.25; thing.add(ear, ball([0.014, 0.012, 0.03], [side * 0.045, 0.014, 0.02], fur), ball([0.014, 0.012, 0.03], [side * 0.04, 0.014, -0.05], fur), ball([0.005, 0.005, 0.005], [side * 0.013, 0.058, 0.092], mat('#1c1c20'))); }
      } else thing.add(box([0.05, 0.04, 0.05], [0, 0.02, 0], mat('#2a1c4a', { roughness: 0.95 })), box([0.052, 0.003, 0.052], [0, 0.027, 0], mat('#c8a23a', { metalness: 0.8 })));
      shadowed(thing);
      if (tipped) { thing.position.set(-0.3 - random() * 0.1, 0, 0.3 + random() * 0.15); thing.rotation.y = random() * 6; }
      else {
        const sx = random() < 0.5 ? -1 : 1;
        const local = new THREE.Vector3(sx * (tw - 0.045), H + 0.012, td - 0.05).applyAxisAngle(new THREE.Vector3(0, 1, 0), basket.rotation.y);
        thing.position.copy(local); thing.rotation.y = basket.rotation.y + sx * 0.8;
      }
      s.root.add(thing);
    }

    // Meltwater.
    if (soggy > 0 && a.inside !== 'list') {
      const tint = a.inside === 'dinner' || a.inside === 'birthday' ? '#f0c8d0' : a.inside === 'date' ? '#7a2434' : a.inside === 'sick' ? '#f0b04a' : '#a8b4ba';
      const shape = new THREE.Shape(); const phase = random() * 6, r0 = mix(0.15, 0.3, soggy);
      for (let i = 0; i <= 40; i++) { const t = i / 40 * Math.PI * 2, r = r0 * (1 + 0.16 * Math.sin(t * 3 + phase) + 0.1 * Math.sin(t * 5 + phase * 2)); const x = Math.cos(t) * r * 1.25, y = Math.sin(t) * r; if (i) shape.lineTo(x, y); else shape.moveTo(x, y); }
      const pool = s.mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.06, metalness: 0.25, transparent: true, opacity: 0.8 }), [0.04, 0.003, tipped ? 0.3 : 0.05]);
      pool.castShadow = false;
      if (soggy > 0.9) { const rim = s.mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: new THREE.Color(tint).multiplyScalar(0.6), roughness: 0.6, transparent: true, opacity: 0.5 }), [0.04, 0.002, tipped ? 0.3 : 0.05]); rim.scale.set(1.12, 1, 1.14); rim.castShadow = false; }
    }

    // Beside it.
    const bx = -0.42, bz = 0.12;
    if (a.beside === 'umbrella') {
      const cloth = s.material(pick(['#1c1c24', '#1f3a7a', '#7a1c2a', '#2a5a3a']), { roughness: 0.8 });
      const u = new THREE.Group(); u.add(shadowed(cyl(0.012, 0.035, 0.5, [0, 0, 0], cloth, 10)), shadowed(cyl(0.005, 0.005, 0.12, [0, 0.3, 0], mat('#c8ced2', { metalness: 0.9 }), 6)), shadowed(cyl(0.004, 0.004, 0.06, [0, -0.28, 0], mat('#c8ced2', { metalness: 0.9 }), 6)));
      const crook = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.01, 8, 16, Math.PI), mat('#6a4a2a')); crook.position.set(0.03, 0.36, 0); u.add(shadowed(crook));
      u.rotation.set(0, 0, Math.PI / 2); const holder = new THREE.Group(); holder.add(u); holder.position.set(bx - 0.05, 0.036, bz); holder.rotation.y = 1.2 + random() * 0.5; s.root.add(holder);
      s.cylinder(0.14, 0.14, 0.003, [bx - 0.02, 0.002, bz + 0.2], new THREE.MeshStandardMaterial({ color: '#9aa8b0', roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.7 }), 20).castShadow = false;
    } else if (a.beside === 'mitten') {
      const wool = s.material(pick(['#d02a22', '#2a62c8', '#f5cb1c', '#f078a8']), { roughness: 1 });
      s.ball([0.045, 0.018, 0.06], [bx + 0.08, 0.018, bz + 0.1], wool); s.ball([0.016, 0.014, 0.03], [bx + 0.125, 0.014, bz + 0.085], wool).rotation.y = 0.7;
      s.cylinder(0.036, 0.036, 0.03, [bx + 0.08, 0.018, bz + 0.035], s.material('#f4f0e8', { roughness: 1 }), 12).rotation.x = Math.PI / 2;
    } else if (a.beside === 'footprints') {
      const print = new THREE.MeshStandardMaterial({ color: '#5a646a', roughness: 0.1, transparent: true, opacity: 0.55 });
      for (let i = 0; i < 4; i++) { const m = s.mesh(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), print, [0.32 + i * 0.13, 0.002, 0.16 + (i % 2 ? 0.055 : -0.055) + i * 0.04]); m.scale.set(0.07, 1, 0.032); m.rotation.y = -0.3; m.castShadow = false; }
    } else if (a.beside === 'receipt') {
      const paper = new THREE.MeshStandardMaterial({ color: '#f8f6ee', roughness: 0.9, side: THREE.DoubleSide });
      const pts = Array.from({ length: 9 }, (_u, i) => new THREE.Vector3(bx + i * 0.06, 0.004 + Math.max(0, Math.sin(i * 0.9)) * 0.03, bz + Math.sin(i * 0.5) * 0.06));
      const curve = new THREE.CatmullRomCurve3(pts); const strip = new THREE.TubeGeometry(curve, 30, 0.035, 4, false); strip.scale(1, 0.12, 1);
      s.mesh(strip, paper);
    }
    return s.finish();
  },
});
