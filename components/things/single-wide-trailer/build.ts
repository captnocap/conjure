import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = readonly [number, number, number];

function paint(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    era: choice('What era is the trailer from?', {
      fifties: 'A 1950s trailer with rounded bullet ends and a polished look, short enough to tow behind a car.',
      seventies: 'A 1970s single-wide: a long flat-sided box with a bowed metal roof.',
      eighties: 'A 1980s model trying to look like a house: a shallow pitched shingle roof and beige siding.',
    }),
    band: choice('What colour is its trim band?', {
      turquoise: 'Turquoise.',
      'harvest-gold': 'Harvest gold.',
      avocado: 'Avocado green.',
      rust: 'Burnt orange rust.',
      pink: 'Powder pink.',
      brown: 'Chocolate brown.',
      'sky-blue': 'Sky blue.',
    }),
    stripe: choice('How is the colour band laid out?', {
      straight: 'One straight stripe below the windows, end to end.',
      swoosh: 'A Z-shaped swoosh that steps down halfway along.',
      'two-tone': 'The whole lower half is coloured, white above.',
    }),
    state: choice('What is going on with it?', {
      'lived-in': 'Lived in and cared for: curtains, a porch light, plants by the door, the screen door ajar.',
      'for-sale': 'Emptied out and up for sale, a sign staked in front.',
      'storm-damaged': 'Hit by a storm: roof metal peeled back, a tarp weighted over the hole, the awning hanging, skirting blown across the yard.',
      abandoned: 'Abandoned: windows boarded with plywood and a notice taped to the door.',
    }),
    awning: choice('What is the awning like?', {
      'green-white': 'Green and white stripes.',
      'red-white': 'Red and white stripes.',
      'yellow-white': 'Yellow and white stripes.',
      'orange-brown': 'Orange and brown stripes.',
      aluminium: 'Plain ribbed aluminium, no colour.',
    }),
    porch: choice('What is at the front door?', {
      'wood-deck': 'A small home-built wooden deck with a railing and steps.',
      'concrete-steps': 'Precast concrete steps with a wrought-iron handrail.',
      'block-steps': 'Stacked cinder blocks for steps.',
      none: 'Nothing: the door opens onto a drop.',
    }),
    rooftop: choice('What is on the roof?', {
      nothing: 'Nothing.',
      tyres: 'Old tyres laid out to stop the roof metal rumbling in the wind.',
      antenna: 'A tall TV antenna on a guyed mast.',
      dish: 'A satellite dish.',
      cooler: 'A boxy swamp cooler.',
    }),
    windows: choice('What shows in the windows?', {
      lace: 'White lace curtains.',
      foil: 'Tinfoil taped up against the heat.',
      flag: 'A flag hung as a curtain in the big window.',
      blinds: 'Bent venetian blinds.',
      sheets: 'Bedsheets tacked up, one floral.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fifties = a.era === 'fifties', eighties = a.era === 'eighties';
    const L = fifties ? 8.6 : eighties ? 12.2 : 11, D = fifties ? 3.0 : 3.6;
    const skirtH = 0.55, wallH = fifties ? 2.15 : 2.35, floorY = skirtH, topY = skirtH + wallH;
    const straight = fifties ? L - D : L; // the flat-sided part
    const Z = D / 2;
    const storm = a.state === 'storm-damaged', abandoned = a.state === 'abandoned', lived = a.state === 'lived-in', forSale = a.state === 'for-sale';
    const bandHex = { turquoise: '#2fb0ad', 'harvest-gold': '#d9a52a', avocado: '#7d8f3a', rust: '#c2602a', pink: '#f0a3b8', brown: '#6a4630', 'sky-blue': '#6fb2e0' }[a.band];
    const age = (hex: string, amount = 0.3) => new THREE.Color(hex).lerp(new THREE.Color('#cfc8b6'), mood.wear * amount);
    const lit = lived && (mood.daylight > 0.72 || mood.daylight < 0.18);

    // Ribbed aluminium siding with rust and algae according to wear.
    const siding = paint(512, 256, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 12; i++) { c.fillStyle = 'rgba(0,0,0,0.13)'; c.fillRect(0, i * 256 / 12, 512, 3); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(0, i * 256 / 12 + 3, 512, 2); }
      for (let i = 0; i < mood.wear * 60; i++) {
        const x = random() * 512, y = random() * 120, h = 30 + random() * 130;
        const g = c.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, 'rgba(120,66,28,0.6)'); g.addColorStop(1, 'rgba(120,66,28,0)');
        c.fillStyle = g; c.fillRect(x, y, 3 + random() * 9, h);
      }
      if (mood.wear > 0.25) { const g = c.createLinearGradient(0, 256, 0, 190); g.addColorStop(0, `rgba(86,104,62,${mood.wear * 0.6})`); g.addColorStop(1, 'rgba(86,104,62,0)'); c.fillStyle = g; c.fillRect(0, 190, 512, 66); }
    });
    const wallColour = eighties ? age('#e2d6b8') : fifties ? age('#e6e9e8', 0.2) : age('#f3f0e6');
    const wall = new THREE.MeshStandardMaterial({ color: wallColour, map: siding, roughness: fifties ? 0.3 : 0.6, metalness: fifties ? 0.55 : 0.15 });
    const bandMaterial = new THREE.MeshStandardMaterial({ color: age(bandHex, 0.4), map: siding, roughness: 0.55, metalness: 0.15 });
    const alu = s.material('#c9cdcc', { metalness: 0.7, roughness: 0.4 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1a1b1c', roughness: 1 });
    const wood = s.material(mood.wear > 0.55 ? '#958c78' : '#a97c4c', { roughness: 0.95 });
    const block = s.material('#9d9d96', { roughness: 1 });

    // Skirting, with panels missing where it has been kicked in or blown out.
    const ribs = paint(256, 32, (c) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 32); for (let i = 0; i < 32; i++) { c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(i * 8, 0, 2, 32); } if (mood.wear > 0.3) { c.fillStyle = `rgba(92,110,64,${mood.wear * 0.5})`; c.fillRect(0, 18, 256, 14); } });
    const skirtMaterial = new THREE.MeshStandardMaterial({ color: age('#e9e6dc', 0.5), map: ribs, roughness: 0.6, metalness: 0.2 });
    s.box([straight - 0.06, skirtH, D - 0.06], [0, skirtH / 2, 0], skirtMaterial);
    s.box([straight - 0.3, skirtH - 0.04, D - 0.3], [0, skirtH / 2, 0], dark);
    const gaps = Math.round((storm ? 4 : abandoned ? 2 : 0) + mood.wear * 3);
    const blown: P[] = [];
    for (let i = 0; i < gaps; i++) {
      const x = (random() - 0.5) * (straight - 1.6);
      s.box([0.95, skirtH - 0.05, 0.03], [x, skirtH / 2 - 0.01, Z - 0.02], dark);
      s.box([0.4, 0.2, 0.2], [x + (random() - 0.5) * 0.3, 0.1, Z - 0.3], block);
      s.box([0.4, 0.2, 0.2], [x, 0.3, Z - 0.3], block).rotation.y = Math.PI / 2;
      blown.push([x + (random() - 0.5) * 2, 0.012, Z + 1.2 + random() * 2.2]);
    }
    if (storm || mood.wear > 0.7) for (const at of blown) { const sheet = s.box([0.95, 0.012, skirtH - 0.05], at, skirtMaterial); sheet.rotation.y = random() * 3; sheet.rotation.z = (random() - 0.5) * 0.2; }

    // The body.
    s.box([straight, wallH, D], [0, floorY + wallH / 2, 0], wall);
    if (fifties) for (const x of [-1, 1]) {
      s.cylinder(Z, Z, wallH, [x * straight / 2, floorY + wallH / 2, 0], wall, 28);
      s.cylinder(Z - 0.03, Z - 0.03, skirtH, [x * straight / 2, skirtH / 2, 0], skirtMaterial, 24);
    }
    const band = (x0: number, x1: number, y: number, h: number) => {
      s.box([x1 - x0, h, D + 0.024], [(x0 + x1) / 2, y, 0], bandMaterial);
      if (!fifties) return;
      if (x0 <= -straight / 2 + 0.01) s.cylinder(Z + 0.012, Z + 0.012, h, [-straight / 2, y, 0], bandMaterial, 28);
      if (x1 >= straight / 2 - 0.01) s.cylinder(Z + 0.012, Z + 0.012, h, [straight / 2, y, 0], bandMaterial, 28);
    };
    const ends = fifties ? 0 : 0.012;
    if (a.stripe === 'straight') band(-straight / 2 - ends, straight / 2 + ends, floorY + 0.62, 0.44);
    else if (a.stripe === 'two-tone') band(-straight / 2 - ends, straight / 2 + ends, floorY + 0.5, 1.0);
    else {
      const hi = floorY + 0.78, lo = floorY + 0.3, h = 0.34, turn = straight * 0.16;
      band(-straight / 2 - ends, turn - 0.5, hi, h);
      band(turn + 0.5, straight / 2 + ends, lo, h);
      for (const z of [Z + 0.008, -Z - 0.008]) { const link = s.box([Math.hypot(1.0, hi - lo) + 0.2, h * 0.9, 0.012], [turn, (hi + lo) / 2, z], bandMaterial); link.rotation.z = -Math.atan2(hi - lo, 1.0); }
    }
    // Chrome trim line under the roof, corner caps.
    s.box([straight + 0.03, 0.05, D + 0.03], [0, topY - 0.04, 0], alu);

    // Roof.
    const roofColour = eighties ? age('#6a5a4c', 0.3) : age('#dfe2dd', 0.5).lerp(new THREE.Color('#8a5a34'), mood.wear * 0.25);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: roofColour, roughness: eighties ? 0.95 : 0.5, metalness: eighties ? 0 : 0.45 });
    const crown = eighties ? 0.62 : 0.3, eave = eighties ? 0.3 : 0.1;
    const section = new THREE.Shape();
    const half = Z + eave;
    section.moveTo(-half, 0);
    if (eighties) { section.lineTo(0, crown); section.lineTo(half, 0); }
    else for (let i = 1; i <= 16; i++) { const z = -half + i / 16 * half * 2; section.lineTo(z, crown * Math.sqrt(Math.max(0, 1 - (z / half) ** 2))); }
    section.lineTo(half, -0.07); section.lineTo(-half, -0.07);
    const roofLength = straight + (fifties ? 0 : eave * 2 + 0.1);
    const roofGeometry = new THREE.ExtrudeGeometry(section, { depth: roofLength, bevelEnabled: false });
    roofGeometry.rotateY(Math.PI / 2);
    roofGeometry.translate(-roofLength / 2, topY + 0.07, 0);
    s.mesh(roofGeometry, roofMaterial);
    if (fifties) for (const x of [-1, 1]) {
      const dome = s.mesh(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), roofMaterial, [x * straight / 2, topY + 0.07, 0]);
      dome.scale.set(half, crown, half);
      s.cylinder(half, half, 0.07, [x * straight / 2, topY + 0.035, 0], roofMaterial, 28);
    }
    const roofY = (z: number) => topY + 0.07 + (eighties ? crown * (1 - Math.abs(z) / half) : crown * Math.sqrt(Math.max(0, 1 - (z / half) ** 2)));
    if (!eighties) for (let x = -straight / 2 + 0.9; x < straight / 2; x += 1.22) s.box([0.03, 0.03, D * 0.92], [x, roofY(0) - 0.035, 0], alu).scale.y = 1;

    // Windows: frames, what hangs behind them, and tilted jalousie slats.
    const slats: THREE.Matrix4[] = [];
    const glowMaterial = new THREE.MeshStandardMaterial({ color: '#ffe6a8', emissive: '#ffcf70', emissiveIntensity: 1.1, roughness: 0.8 });
    const curtain = (index: number, big: boolean) => {
      if (forSale) return new THREE.MeshStandardMaterial({ color: '#2a3238', roughness: 0.3 });
      if (a.windows === 'foil') return new THREE.MeshStandardMaterial({ color: '#d5d9da', metalness: 0.9, roughness: 0.35 });
      if (lit && index % 3 !== 2) return glowMaterial;
      if (a.windows === 'flag' && big) return new THREE.MeshStandardMaterial({ roughness: 0.9, map: paint(128, 64, (c) => { for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? '#f1ede0' : '#b3262c'; c.fillRect(0, i * 64 / 7, 128, 64 / 7 + 1); } c.fillStyle = '#27386e'; c.fillRect(0, 0, 54, 36); c.fillStyle = '#f1ede0'; for (let i = 0; i < 12; i++) c.fillRect(6 + (i % 4) * 12, 5 + Math.floor(i / 4) * 10, 3, 3); }) });
      if (a.windows === 'sheets') return new THREE.MeshStandardMaterial({ color: index % 2 ? '#e6c8d6' : '#c9d6e6', roughness: 0.95, map: index % 2 ? paint(64, 64, (c) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 64, 64); for (let i = 0; i < 10; i++) { c.fillStyle = ['#d8486a', '#e0a02a', '#5a8a4a'][i % 3]; c.beginPath(); c.arc(random() * 64, random() * 64, 5, 0, 7); c.fill(); } }) : null });
      if (a.windows === 'blinds') return new THREE.MeshStandardMaterial({ roughness: 0.7, map: paint(32, 64, (c) => { c.fillStyle = '#e9e4d2'; c.fillRect(0, 0, 32, 64); for (let i = 0; i < 16; i++) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, i * 4 + (i === 9 ? 2 : 0), 32, 1.2); } }) });
      return new THREE.MeshStandardMaterial({ roughness: 0.95, map: paint(64, 64, (c) => { c.fillStyle = '#39424a'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#f6f3ea'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(26, 30, 0, 64); c.fill(); c.beginPath(); c.moveTo(64, 0); c.quadraticCurveTo(38, 30, 64, 64); c.fill(); c.fillRect(0, 0, 64, 9); }) });
    };
    let windowIndex = 0;
    const windowAt = (x: number, y: number, w: number, h: number, face: 1 | -1, shutters: boolean) => {
      const index = windowIndex++;
      const z = face * (Z + 0.012);
      const boarded = abandoned ? random() < 0.8 : storm ? random() < 0.3 : false;
      s.box([w + 0.12, h + 0.12, 0.05], [x, y, z], alu);
      const broken = !boarded && (storm ? random() < 0.4 : random() < mood.wear * 0.25);
      s.box([w, h, 0.03], [x, y, z + face * 0.018], broken ? dark : curtain(index, w > 1.2));
      if (boarded) { const ply = s.box([w + 0.24, h + 0.2, 0.03], [x, y, z + face * 0.06], s.material('#c2a06a', { roughness: 0.95 })); ply.rotation.z = (random() - 0.5) * 0.06; }
      else if (!broken) {
        const count = Math.round(h / 0.115);
        for (let i = 0; i < count; i++) slats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y - h / 2 + (i + 0.5) * h / count, z + face * 0.045), new THREE.Quaternion().setFromEuler(new THREE.Euler(face * 0.75, 0, 0)), new THREE.Vector3(w - 0.02, 1, 1)));
        if (w > 1.2) s.box([0.04, h, 0.06], [x, y, z + face * 0.03], alu);
      }
      if (shutters) for (const side of [-1, 1]) {
        const shutter = s.box([0.26, h + 0.1, 0.035], [x + side * (w / 2 + 0.2), y, z], bandMaterial);
        if (storm && random() < 0.35 || random() < mood.wear * 0.25) { shutter.rotation.z = (random() - 0.5) * 0.7; shutter.position.y -= 0.12; }
      }
      return z;
    };
    const doorX = -straight * 0.2, bigX = straight * 0.11;
    const winY = floorY + 1.52;
    windowAt(-straight * 0.4, winY, 0.8, 0.95, 1, true);
    windowAt(bigX, winY - 0.05, fifties ? 1.3 : 1.75, 1.05, 1, true);
    if (!fifties) windowAt(straight * 0.3, winY + 0.25, 0.55, 0.45, 1, false);
    windowAt(straight * 0.42, winY, 0.8, 0.95, 1, !fifties);
    for (const x of [-0.34, 0.02, 0.36]) windowAt(straight * x, winY, 0.8, 0.9, -1, false);
    if (slats.length) {
      const pane = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.105, 0.008), new THREE.MeshStandardMaterial({ color: '#b9d2d8', roughness: 0.08, metalness: 0.35 }), slats.length);
      slats.forEach((m, i) => pane.setMatrixAt(i, m));
      pane.castShadow = true;
      s.root.add(pane);
    }
    if (mood.warmth > 0.55 && !forSale && !abandoned) {
      // A window air conditioner hanging out of the end bedroom, dripping.
      const ax = straight * 0.42;
      s.box([0.62, 0.42, 0.5], [ax, winY - 0.26, Z + 0.24], s.material('#d8d4c6', { roughness: 0.6 }));
      s.box([0.56, 0.3, 0.02], [ax, winY - 0.26, Z + 0.495], dark);
      s.rod([ax - 0.25, winY - 0.47, Z + 0.45], [ax - 0.25, winY - 0.95, Z + 0.02], 0.014, alu);
    }

    // The door.
    const doorH = 1.95;
    s.box([0.98, doorH + 0.08, 0.05], [doorX, floorY + doorH / 2 + 0.02, Z + 0.012], alu);
    const doorHinge = new THREE.Group();
    doorHinge.position.set(doorX - 0.44, floorY, Z + 0.04);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.88, doorH, 0.04), new THREE.MeshStandardMaterial({ color: age(a.stripe === 'two-tone' ? '#f3f0e6' : bandHex, 0.35), roughness: 0.55 }));
    leaf.position.set(0.44, doorH / 2, 0);
    leaf.castShadow = true;
    const diamond = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05), lit ? glowMaterial : new THREE.MeshStandardMaterial({ color: '#27323a', roughness: 0.2 }));
    diamond.position.set(0.44, doorH * 0.72, 0);
    diamond.rotation.z = Math.PI / 4;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), alu);
    knob.position.set(0.8, doorH * 0.48, 0.04);
    doorHinge.add(leaf, diamond, knob);
    doorHinge.rotation.y = lived ? -mix(0.25, 0.9, random()) : storm ? -0.15 : 0;
    s.root.add(doorHinge);
    s.box([0.9, doorH, 0.02], [doorX, floorY + doorH / 2, Z + 0.02], dark);
    if (abandoned) s.label('NOTICE', 0.3, 0.2, [doorX, floorY + 1.15, Z + 0.07], '#b3261e', '#f6f3e6').rotation.z = 0.05;
    if (lived || lit) s.ball([0.07, 0.09, 0.07], [doorX + 0.72, floorY + 1.85, Z + 0.1], new THREE.MeshStandardMaterial({ color: '#fff0c0', emissive: '#ffc860', emissiveIntensity: lit ? 2.2 : 0.3, roughness: 0.4 }), 10);

    // Porch.
    const stepsOut = a.porch === 'none' ? 0 : a.porch === 'wood-deck' ? 1.6 : 1.0;
    if (a.porch === 'wood-deck') {
      const w = 2.6, d = 1.6, cx = doorX + 0.3, z0 = Z + 0.02;
      s.box([w, 0.1, d], [cx, floorY - 0.07, z0 + d / 2], wood);
      for (let i = 0; i < 9; i++) s.box([0.01, 0.102, d], [cx - w / 2 + (i + 0.5) * w / 9, floorY - 0.069, z0 + d / 2], dark);
      for (const x of [-1, 1]) for (const z of [0.1, d - 0.08]) s.box([0.09, floorY + 0.95, 0.09], [cx + x * (w / 2 - 0.05), (floorY + 0.95) / 2, z0 + z], wood);
      s.box([0.06, 0.07, d - 0.1], [cx + w / 2 - 0.05, floorY + 0.9, z0 + d / 2], wood);
      s.box([0.06, 0.07, d - 0.1], [cx - w / 2 + 0.05, floorY + 0.9, z0 + d / 2], wood);
      s.box([w * 0.55, 0.07, 0.06], [cx + w * 0.225 - 0.05, floorY + 0.9, z0 + d - 0.08], wood);
      for (let i = 0; i < 5; i++) s.box([0.04, 0.85, 0.04], [cx - 0.1 + i * 0.3, floorY + 0.45, z0 + d - 0.08], wood);
      for (let i = 0; i < 2; i++) s.box([1.0, 0.07, 0.3], [cx - w / 2 + 0.55, floorY - 0.07 - (i + 1) * 0.17, z0 + d + 0.15 + i * 0.3], wood);
      if (lived) s.box([0.7, 0.02, 0.45], [doorX, floorY - 0.01, z0 + 0.35], s.material(mood.cheer > 0.5 ? '#3f8a45' : '#6a5a44', { roughness: 1 }));
    } else if (a.porch === 'concrete-steps') {
      const concrete = s.material('#b3b0a6', { roughness: 0.95 });
      for (let i = 0; i < 3; i++) s.box([1.3, floorY - i * 0.18, 0.32], [doorX, (floorY - i * 0.18) / 2 - 0.02, Z + 0.17 + i * 0.32], concrete);
      const iron = s.material('#1f1f20', { roughness: 0.6, metalness: 0.4 });
      for (const x of [-0.6, 0.6]) {
        s.rod([doorX + x, floorY, Z + 0.1], [doorX + x, floorY + 0.9, Z + 0.1], 0.016, iron);
        s.rod([doorX + x, 0.2, Z + 0.9], [doorX + x, 1.0, Z + 0.9], 0.016, iron);
        s.rod([doorX + x, floorY + 0.9, Z + 0.1], [doorX + x, 1.0, Z + 0.9], 0.02, iron);
        s.rod([doorX + x, floorY + 0.45, Z + 0.1], [doorX + x, 0.6, Z + 0.9], 0.012, iron);
      }
    } else if (a.porch === 'block-steps') {
      for (let i = 0; i < 2; i++) for (let j = 0; j <= i; j++) for (const x of [-0.21, 0.21]) s.box([0.4, 0.195, 0.2], [doorX + x + (random() - 0.5) * 0.03, 0.1 + j * 0.2, Z + 0.56 - i * 0.22 - 0.1], block).rotation.y = (random() - 0.5) * 0.1;
      s.box([1.0, 0.04, 0.3], [doorX, 0.42, Z + 0.24], wood);
    }

    // Awnings: one over the door, one over the big window.
    const stripes = a.awning === 'aluminium' ? ['#d9dcda', '#c3c8c6'] : { 'green-white': ['#2f7d4a', '#f4f1e6'], 'red-white': ['#c2312b', '#f4f1e6'], 'yellow-white': ['#e8b92a', '#f4f1e6'], 'orange-brown': ['#d9772a', '#6a4630'] }[a.awning];
    const awningSkin = paint(128, 16, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = age(stripes[i % 2], 0.5).getStyle(); c.fillRect(i * 16, 0, 16, 16); } });
    const canvasMaterial = new THREE.MeshStandardMaterial({ map: awningSkin, side: THREE.DoubleSide, roughness: a.awning === 'aluminium' ? 0.4 : 0.9, metalness: a.awning === 'aluminium' ? 0.6 : 0 });
    const awningOver = (x: number, width: number, top: number, reach: number, drop: number, poles: boolean, torn: boolean) => {
      const g = new Sculpture(context);
      const length = Math.hypot(reach, drop), tilt = Math.atan2(drop, reach);
      const sheet = g.mesh(new THREE.PlaneGeometry(width, length), canvasMaterial, [0, -drop / 2, reach / 2]);
      sheet.rotation.x = -Math.PI / 2 + tilt;
      const scallops = Math.round(width / 0.32);
      for (let i = 0; i < scallops; i++) g.mesh(new THREE.CircleGeometry(width / scallops / 2, 10, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ color: age(stripes[i % 2], 0.5), side: THREE.DoubleSide, roughness: 0.9 }), [-width / 2 + (i + 0.5) * width / scallops, -drop - 0.02, reach]);
      g.box([width, 0.05, 0.03], [0, -drop, reach], alu);
      for (const side of [-1, 1]) g.rod([side * width / 2, 0, 0], [side * width / 2, -drop, reach], 0.014, alu);
      if (!poles) for (const side of [-1, 1]) g.rod([side * width / 2, -drop - 0.5, 0], [side * width / 2, -drop, reach], 0.012, alu);
      g.root.position.set(x, top, Z + 0.03);
      if (torn) { g.root.rotation.z = -0.5; g.root.rotation.x = 0.5; g.root.position.x += 0.35; g.root.position.y -= 0.25; }
      s.root.add(g.root);
      if (poles) for (const side of [-1, 1]) {
        const foot = a.porch === 'wood-deck' ? floorY : 0;
        if (torn && side === 1) s.rod([x + 0.9, 0.03, Z + reach + 0.3], [x + 2.4, 0.03, Z + reach + 1.4], 0.02, alu);
        else if (!torn) s.rod([x + side * (width / 2 - 0.05), top - drop, Z + reach], [x + side * (width / 2 - 0.05), foot, Z + reach], 0.02, alu);
      }
    };
    awningOver(doorX + (a.porch === 'wood-deck' ? 0.3 : 0), a.porch === 'wood-deck' ? 2.7 : 1.9, topY - 0.14, Math.max(stepsOut, 1.1), 0.42, a.porch !== 'none', storm);
    if (!fifties) awningOver(bigX, 2.3, topY - 0.14, 0.75, 0.36, false, false);

    // The tow hitch end, with propane.
    const hx = -straight / 2 - (fifties ? Z : 0);
    const steelDark = s.material('#3a3b3c', { metalness: 0.5, roughness: 0.6 });
    for (const z of [-1, 1]) s.rod([hx + 0.05, 0.42, z * (fifties ? 0.5 : 1.0)], [hx - 1.15, 0.42, 0], 0.04, steelDark);
    s.rod([hx - 1.1, 0.42, 0], [hx - 1.1, 0.0, 0], 0.03, steelDark);
    s.cylinder(0.09, 0.09, 0.03, [hx - 1.1, 0.015, 0], steelDark, 10);
    s.ball([0.07, 0.05, 0.07], [hx - 1.2, 0.45, 0], alu, 10);
    for (const z of [-0.2, 0.2]) {
      s.cylinder(0.16, 0.16, 0.5, [hx - 0.42, 0.72, z], s.material('#eeeae0', { roughness: 0.45 }), 14);
      s.ball([0.16, 0.1, 0.16], [hx - 0.42, 0.97, z], s.material('#eeeae0', { roughness: 0.45 }), 12);
      s.cylinder(0.05, 0.05, 0.1, [hx - 0.42, 1.08, z], alu, 8);
    }
    s.box([0.5, 0.04, 0.8], [hx - 0.42, 0.45, 0], steelDark);

    // Rooftop.
    if (a.rooftop === 'tyres') {
      const rubber = s.material('#222224', { roughness: 0.95 });
      for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) { const z = (random() - 0.5) * D * 0.6, x = (random() - 0.5) * (straight - 1.2); const t = s.ring(0.24, 0.1, [x, roofY(z) + 0.08, z], rubber); t.rotation.x = Math.PI / 2 + (z / half) * 0.3; }
    } else if (a.rooftop === 'antenna') {
      const ax = straight * 0.28, lean = (storm ? 0.5 : mood.wear * 0.15);
      const mast = new Sculpture(context);
      mast.rod([0, 0, 0], [0, 2.6, 0], 0.02, alu);
      for (let i = 0; i < 6; i++) mast.rod([-0.55 + i * 0.05, 2.5 - i * 0.02, -0.5 + i * 0.2], [0.55 - i * 0.05, 2.5 - i * 0.02, -0.5 + i * 0.2], 0.008, alu);
      mast.rod([0, 2.5, -0.6], [0, 2.4, 0.7], 0.012, alu);
      mast.root.position.set(ax, roofY(0) - 0.02, 0);
      mast.root.rotation.z = lean;
      s.root.add(mast.root);
      if (!storm) for (const [dx, dz] of [[1.4, 1.0], [-1.4, 1.0], [0, -1.3]]) s.rod([ax, roofY(0) + 1.6, 0], [ax + dx, roofY(dz) , dz], 0.004, steelDark);
    } else if (a.rooftop === 'dish') {
      const dx = straight * 0.33;
      s.rod([dx, roofY(Z * 0.5), Z * 0.5], [dx, roofY(Z * 0.5) + 0.45, Z * 0.5], 0.02, steelDark);
      const dish = s.mesh(new THREE.SphereGeometry(0.4, 18, 8, 0, Math.PI * 2, 0, 0.75), new THREE.MeshStandardMaterial({ color: '#8d9396', roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }), [dx, roofY(Z * 0.5) + 0.62, Z * 0.5 + 0.1]);
      dish.rotation.set(-2.0, 0.5, 0, 'YXZ');
    } else if (a.rooftop === 'cooler') {
      const cx = straight * 0.2;
      s.box([0.95, 0.75, 0.95], [cx, roofY(0) + 0.35, 0], s.material('#b9b6a8', { roughness: 0.6, metalness: 0.3 }));
      for (const [dx, dz, w, d] of [[0, 0.48, 0.8, 0.02], [0, -0.48, 0.8, 0.02], [0.48, 0, 0.02, 0.8], [-0.48, 0, 0.02, 0.8]]) s.box([w, 0.6, d], [cx + dx, roofY(0) + 0.36, dz], s.material('#6a6a5e', { roughness: 0.9 }));
    }
    s.cylinder(0.05, 0.05, 0.4, [-straight * 0.05, roofY(-Z * 0.4) + 0.15, -Z * 0.4], alu, 8);
    s.cylinder(0.08, 0.05, 0.04, [-straight * 0.05, roofY(-Z * 0.4) + 0.36, -Z * 0.4], alu, 8);

    // What the state adds.
    if (storm) {
      const px = straight * 0.3;
      s.box([2.3, 0.03, D * 0.9], [px, roofY(0) + 0.04, 0], new THREE.MeshStandardMaterial({ color: '#e8a0b4', roughness: 1 }));
      const flap = new THREE.Group();
      flap.position.set(px + 1.15, roofY(0) + 0.04, 0);
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.02, D + 0.2), roofMaterial);
      sheet.position.x = 1.15;
      sheet.castShadow = true;
      flap.add(sheet);
      flap.rotation.z = 0.75;
      flap.rotation.y = 0.12;
      s.root.add(flap);
      const tarp = s.box([2.6, 0.035, D + 0.9], [-straight * 0.22, roofY(0) + 0.05, 0], new THREE.MeshStandardMaterial({ color: '#2f6fc0', roughness: 0.7 }));
      tarp.rotation.y = 0.06;
      for (const z of [-1, 1]) s.box([2.6, 0.5, 0.03], [-straight * 0.22, topY - 0.15, z * (Z + half - Z + 0.42)], new THREE.MeshStandardMaterial({ color: '#2f6fc0', roughness: 0.7 })).rotation.x = z * -0.25;
      for (let i = 0; i < 4; i++) s.box([0.2, 0.07, 0.1], [-straight * 0.22 + (i % 2 ? 1 : -1) * 1.1, roofY(0) + 0.1, (i < 2 ? -1 : 1) * 0.8], s.material('#9a4a34'));
      // A snapped limb across the roof.
      const bark = s.material('#5a4632', { roughness: 1 });
      s.rod([straight * 0.02, roofY(0) + 0.1, -Z - 0.6], [straight * 0.1, roofY(0) + 0.35, Z + 0.9], 0.11, bark, 0.05);
      s.scatter(new THREE.IcosahedronGeometry(0.4, 0), s.material('#4f7a3a', { roughness: 1 }), Array.from({ length: 9 }, () => ({ at: [straight * 0.09 + (random() - 0.5) * 1.3, roofY(0) + 0.3 + random() * 0.6, Z + (random() - 0.2) * 1.4] as P, size: 0.6 + random() * 0.8 })));
    }
    if (forSale) {
      const sx = bigX + 0.4, sz = Z + 2.3;
      const lean = (random() - 0.5) * (0.06 + mood.wear * 0.3);
      const post = new Sculpture(context);
      post.box([0.07, 1.5, 0.07], [-0.5, 0.75, 0], post.material('#f1eee4'));
      post.box([1.1, 0.07, 0.07], [0, 1.45, 0], post.material('#f1eee4'));
      post.label('FOR SALE', 0.9, 0.34, [0.08, 1.2, 0.01], '#ffffff', '#c2281f');
      post.label('BY OWNER', 0.9, 0.2, [0.08, 0.92, 0.01], '#c2281f', '#ffffff');
      post.label(mood.wear > 0.5 ? 'PRICE REDUCED' : 'MUST BE MOVED', 0.9, 0.14, [0.08, 0.74, 0.01], '#1c1c1c', '#f4dc3a');
      post.root.position.set(sx, 0, sz);
      post.root.rotation.set(0, -0.15, lean);
      s.root.add(post.root);
    }
    if (lived) {
      // Pots by the door, and something of the family left out.
      const potX = doorX + (a.porch === 'wood-deck' ? 1.35 : 0.95), potY = a.porch === 'wood-deck' ? floorY - 0.02 : 0, potZ = Z + (a.porch === 'wood-deck' ? 0.3 : 0.35);
      const count = 1 + Math.round(mood.density * 3);
      const blooms: { at: P; size: number; color: string }[] = [];
      for (let i = 0; i < count; i++) {
        const px = potX + (i % 2) * 0.34 - (a.porch === 'wood-deck' ? 0.3 : 0), pz = potZ + Math.floor(i / 2) * 0.36;
        s.cylinder(0.14, 0.1, 0.22, [px, potY + 0.11, pz], s.material(i % 2 ? '#b8562f' : '#e9e4d2', { roughness: 0.9 }), 12);
        for (let k = 0; k < 9; k++) blooms.push({ at: [px + (random() - 0.5) * 0.24, potY + 0.28 + random() * 0.2, pz + (random() - 0.5) * 0.24], size: 0.7 + random() * 0.7, color: k % 3 ? (mood.cheer > 0.4 ? ['#e8323c', '#f06aa0', '#f2c230'][i % 3] : '#b9a66a') : '#4f8a3f' });
      }
      s.scatter(new THREE.IcosahedronGeometry(0.06, 0), s.material('#ffffff', { roughness: 0.8 }), blooms);
    }

    // Weeds along the skirting.
    const weeds = Array.from({ length: Math.round(mix(10, 150, mood.wear) * (abandoned ? 1.6 : lived ? 0.5 : 1)) }, () => {
      const tall = 0.5 + random() * (0.8 + mood.wear * 2.2);
      return { at: [(random() - 0.5) * (straight + 0.6), tall * 0.14, Z + 0.05 + random() * 0.35] as P, size: tall, color: random() < mood.wear * 0.6 ? '#a59a4e' : '#5d9442' };
    });
    s.scatter(new THREE.ConeGeometry(0.03, 0.28, 4), s.material('#ffffff', { roughness: 1 }), weeds);

    const sag = new THREE.Group();
    void sag;
    const breeze = mix(0.004, 0.05, mood.energy);
    return s.finish({
      footprint: Math.max(L, D) / 2,
      update: (_dt, time) => { if (lived) doorHinge.rotation.y += Math.sin(time * 1.3) * breeze * 0.02; },
    });
  },
});
