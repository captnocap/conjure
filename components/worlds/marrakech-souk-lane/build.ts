import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';

const W = 14, D = 8, WALL = 4.5, PX = 1024 / W;
const DYES = ['#d42a3a', '#1f6fd0', '#e8b81e', '#16a070', '#c22a8c', '#f07a1a', '#6a35b8', '#f2efe4', '#19a6c4'];
const TRADES = ['fabric', 'pottery', 'metal', 'food'] as const;
type Trade = (typeof TRADES)[number];

export default defineWorld({
  questions: {
    roof: choice('What covers the lane overhead?', {
      reed: 'Slatted reed mats, laying thin regular stripes of sun on the ground.',
      cloth: 'Coloured cloth sails strung wall to wall, tinting the light beneath.',
      lattice: 'A criss-cross wooden lattice, scattering diamonds of light.',
      open: 'Only bare roof poles: the lane lies in full hard sun.',
    }),
    trade: choice('What is sold in the stalls along the wall?', {
      mixed: 'A bit of everything, each stall a different trade.',
      fabric: 'Cloth and dyed wool, bolts and scarves in every colour.',
      pottery: 'Tagines, jars and glazed bowls.',
      metal: 'Brass trays, teapots and lanterns.',
      food: 'Spices, olives and dates in sacks and cones.',
    }),
    open: score('How open for business is the lane?', ['Every shutter down, silent', 'Half the stalls shut for the midday rest', 'Every stall open and spilling out']),
    plaster: choice('What are the walls like?', {
      ochre: 'Warm ochre plaster.',
      rose: 'Marrakech rose-pink.',
      white: 'Whitewash with a blue-painted lower band.',
      earth: 'Raw rammed earth, unpainted.',
    }),
    overhead: choice('What hangs across the lane?', {
      none: 'Nothing.',
      skeins: 'Freshly dyed hanks of wool drying on a pole, every colour.',
      lanterns: 'A row of brass lanterns, lit even at noon.',
      cables: 'Sagging electric cables with bare bulbs.',
    }),
    floor: choice('What is underfoot?', {
      earth: 'Packed earth, dry and dusty.',
      cobbles: 'Worn grey cobbles.',
      wet: 'Earth just hosed down against the dust, dark with puddles.',
    }),
    end: choice('What shows through the gateway at the end of the lane?', {
      square: 'A blinding sunlit square with a palm.',
      minaret: 'A minaret tower against blue sky.',
      lane: 'More arches receding into shade, the souk going on and on.',
      blue: 'A blue-washed alley with steps.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const gap: [number, number] = [-0.9, 1.3];
    const { art: s, world } = diorama(context, {
      background: '#ecebe2', floor: '#ffffff', width: W, depth: D, maxHeight: 3.3, radius: 1.7, pitch: 30, yaw: 28,
      slots: [[0.2, 1.1], [-3.6, -0.9], [3.9, -0.7], [-3.7, 2.2], [4, 2.1], [0.3, -2.1, 0, 0.85]],
    });

    // Floor: shade, with the sun that gets through the roof painted on.
    const floor = document.createElement('canvas');
    floor.width = 1024; floor.height = Math.round(D * PX);
    const g = floor.getContext('2d')!;
    const H = floor.height;
    g.fillStyle = { earth: '#9c6c44', cobbles: '#8c8074', wet: '#6e4e36' }[a.floor];
    g.fillRect(0, 0, 1024, H);
    if (a.floor === 'cobbles') {
      for (let y = 0; y < H; y += 20) for (let x = (y / 20 % 2) * 14; x < 1024; x += 28) {
        g.fillStyle = `hsl(${28 + random() * 10},${10 + random() * 8}%,${40 + random() * 16}%)`;
        g.beginPath(); g.ellipse(x + 2, y + 10, 12, 8.5, 0, 0, 7); g.fill();
      }
    } else for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${random() < 0.5 ? '60,40,20' : '230,200,160'},0.12)`; g.fillRect(random() * 1024, random() * H, 2 + random() * 5, 2 + random() * 3); }
    const slant = (mood.daylight - 0.5) * 1.1;
    const beam = (x0: number, x1: number, alpha: number, ink = '255,214,140') => {
      g.fillStyle = `rgba(${ink},${alpha})`;
      g.beginPath();
      g.moveTo((x0 + W / 2 - slant * D / 2) * PX, 0); g.lineTo((x1 + W / 2 - slant * D / 2) * PX, 0);
      g.lineTo((x1 + W / 2 + slant * D / 2) * PX, H); g.lineTo((x0 + W / 2 + slant * D / 2) * PX, H);
      g.fill();
    };
    const sun = mix(0.5, 0.85, 1 - Math.abs(mood.daylight - 0.5) * 2);
    if (a.roof === 'reed') { for (let x = -9; x < 9; x += 0.42) if (x + 0.14 < gap[0] || x > gap[1]) beam(x, x + 0.14, sun * 0.8); }
    else if (a.roof === 'cloth') {
      const tints = ['200,40,40', '40,90,200', '230,170,20', '240,240,230'];
      [[-6.9, -4.4], [-4.1, -1.2], [1.6, 4.2], [4.5, 6.9]].forEach(([x0, x1], index) => beam(x0, x1, 0.2, tints[index]));
      beam(-4.4, -4.1, sun); beam(4.2, 4.5, sun);
    } else if (a.roof === 'lattice') {
      g.fillStyle = `rgba(255,226,160,${sun * 0.85})`;
      for (let x = -40; x < 1064; x += 34) for (let y = 0; y < H + 30; y += 34) {
        const sx = x + (y / 34 % 2) * 17 + slant * y * 0.3;
        if (sx > (gap[0] + W / 2) * PX - 20 && sx < (gap[1] + W / 2) * PX + 20) continue;
        g.beginPath(); g.moveTo(sx, y - 9); g.lineTo(sx + 9, y); g.lineTo(sx, y + 9); g.lineTo(sx - 9, y); g.fill();
      }
    } else {
      beam(-9, 9, sun * 0.5);
      g.fillStyle = 'rgba(70,45,25,0.35)';
      for (let x = -7; x <= 7.01; x += 14 / 6) g.fillRect((x + W / 2 + slant) * PX - 5, 0, 10, H);
    }
    beam(gap[0], gap[1], Math.min(1, sun + 0.15));
    const shade = g.createLinearGradient(0, 0, 0, H * 0.22);
    shade.addColorStop(0, 'rgba(50,30,15,0.5)'); shade.addColorStop(1, 'rgba(50,30,15,0)');
    g.fillStyle = shade; g.fillRect(0, 0, 1024, H * 0.22);
    if (a.floor === 'wet') for (let i = 0; i < 9; i++) {
      const x = random() * 1024, y = H * 0.25 + random() * H * 0.7, rx = 30 + random() * 50, ry = 12 + random() * 18;
      g.fillStyle = 'rgba(40,28,22,0.38)'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(150,190,210,0.22)'; g.beginPath(); g.ellipse(x, y, rx * 0.8, ry * 0.75, 0, 0, 7); g.fill();
    }
    for (let i = 0; i < mood.wear * 14; i++) { g.fillStyle = 'rgba(45,30,20,0.25)'; g.beginPath(); g.ellipse(random() * 1024, random() * H, 20 + random() * 40, 8 + random() * 16, random() * 3, 0, 7); g.fill(); }
    const floorTexture = new THREE.CanvasTexture(floor);
    floorTexture.colorSpace = THREE.SRGBColorSpace;
    const groundPaint = (world.ground as THREE.Mesh).material as THREE.MeshStandardMaterial;
    groundPaint.map = floorTexture;
    groundPaint.roughness = a.floor === 'wet' ? 0.55 : 0.95;

    // Plaster.
    const base = { ochre: '#d9a25e', rose: '#d48c6e', white: '#ece4d2', earth: '#b98a5c' }[a.plaster];
    const dado = { ochre: '#b97c42', rose: '#b56a52', white: '#3f7fc0', earth: '#a5774c' }[a.plaster];
    const plaster = (width: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 512;
      const p = canvas.getContext('2d')!;
      p.fillStyle = base; p.fillRect(0, 0, 1024, 512);
      for (let i = 0; i < 90; i++) { p.fillStyle = `rgba(${random() < 0.5 ? '255,240,210' : '90,55,30'},0.07)`; p.beginPath(); p.ellipse(random() * 1024, random() * 512, 30 + random() * 90, 15 + random() * 50, random() * 3, 0, 7); p.fill(); }
      p.fillStyle = dado; p.globalAlpha = 0.85; p.fillRect(0, 512 - 512 / WALL * 1.05, 1024, 512); p.globalAlpha = 1;
      for (let i = 0; i < mood.wear * 16; i++) {
        const x = random() * 1024, y = random() * 512;
        p.fillStyle = 'rgba(60,40,25,0.22)'; p.fillRect(x, y, 6 + random() * 14, 60 + random() * 160);
        if (i % 3 === 0) { p.fillStyle = '#a8623c'; p.beginPath(); p.ellipse(random() * 1024, 200 + random() * 300, 20 + random() * 40, 14 + random() * 26, random() * 3, 0, 7); p.fill(); }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.repeat.set(1 / width, 1 / WALL);
      texture.offset.set(0.5, 0);
      return texture;
    };
    const edge = s.material(base, { roughness: 0.95 });
    const arch = (cx: number, hw: number, hs: number, r: number) => {
      const d = Math.sqrt(r * r - hw * hw), t0 = Math.atan2(d, hw);
      const path = new THREE.Path();
      path.moveTo(cx - hw, 0); path.lineTo(cx + hw, 0); path.lineTo(cx + hw, hs);
      path.absarc(cx, hs + d, r, -t0, Math.PI + t0, false);
      path.lineTo(cx - hw, 0);
      return path;
    };
    const wall = (width: number, holes: THREE.Path[]) => {
      const shape = new THREE.Shape();
      shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(width / 2, WALL); shape.lineTo(-width / 2, WALL); shape.closePath();
      shape.holes.push(...holes);
      const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false, curveSegments: 20 }), [new THREE.MeshStandardMaterial({ map: plaster(width), roughness: 0.95 }), edge]);
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const centres = [-5.1, -1.7, 1.7, 5.1];
    wall(W, centres.map((cx) => arch(cx, 1.1, 1.35, 1.2))).position.set(0, 0, -D / 2 - 0.4);
    const gate = wall(D, [arch(0, 1.5, 1.9, 1.75)]);
    gate.rotation.y = Math.PI / 2;
    gate.position.set(-W / 2 - 0.4, 0, 0);
    s.box([0.6, WALL, 0.6], [-W / 2 - 0.3, WALL / 2, -D / 2 - 0.3], edge);

    // Through the gateway.
    const far = document.createElement('canvas');
    far.width = far.height = 512;
    const f = far.getContext('2d')!;
    if (a.end === 'square' || a.end === 'minaret') {
      f.fillStyle = '#a9d8f0'; f.fillRect(0, 0, 512, 512);
      f.fillStyle = '#e7b98a'; f.fillRect(0, 300, 512, 90); f.fillStyle = '#d9a06c'; f.fillRect(60, 270, 150, 120); f.fillRect(330, 250, 182, 140);
      f.fillStyle = '#f6e3b8'; f.fillRect(0, 385, 512, 127);
      if (a.end === 'minaret') {
        f.fillStyle = '#d99a62'; f.fillRect(214, 70, 84, 320);
        f.fillStyle = '#c4824c'; for (const y of [100, 190, 280]) f.fillRect(214, y, 84, 10);
        f.fillStyle = '#7a4a2a'; for (const y of [130, 220]) { f.beginPath(); f.arc(256, y + 12, 12, Math.PI, 0); f.fillRect(244, y + 12, 24, 26); f.fill(); }
        f.fillStyle = '#d99a62'; f.fillRect(238, 30, 36, 44); f.beginPath(); f.arc(256, 30, 18, Math.PI, 0); f.fill();
        f.fillStyle = '#e8c44a'; f.fillRect(254, -2, 4, 18);
      } else {
        f.strokeStyle = '#7a5a34'; f.lineWidth = 12; f.beginPath(); f.moveTo(250, 400); f.quadraticCurveTo(270, 280, 262, 170); f.stroke();
        f.strokeStyle = '#2f8a3a'; f.lineWidth = 10;
        for (let k = 0; k < 9; k++) { const angle = -Math.PI + k * Math.PI / 8; f.beginPath(); f.moveTo(262, 170); f.quadraticCurveTo(262 + Math.cos(angle) * 60, 150 + Math.sin(angle) * 70, 262 + Math.cos(angle) * 110, 190 + Math.sin(angle) * 50); f.stroke(); }
      }
    } else if (a.end === 'lane') {
      f.fillStyle = '#3a2a1e'; f.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 6; i++) {
        const inset = i * 38, light = i % 2 === 0;
        f.fillStyle = light ? '#e8bf82' : '#6a4a30';
        f.fillRect(inset + 40, 60 + inset * 0.9, 432 - inset * 2, 452 - inset * 0.9);
        f.beginPath(); f.arc(256, 60 + inset * 0.9, 216 - inset, Math.PI, 0); f.fill();
      }
      f.fillStyle = '#fff0c4'; f.fillRect(236, 300, 40, 212);
    } else {
      f.fillStyle = '#a9d8f0'; f.fillRect(0, 0, 512, 100);
      f.fillStyle = '#4f8fd8'; f.fillRect(0, 60, 512, 452); f.fillStyle = '#3f77c0'; f.fillRect(0, 60, 150, 452); f.fillRect(362, 60, 150, 452);
      for (let i = 0; i < 7; i++) { f.fillStyle = i % 2 ? '#dfeaf6' : '#9cc0ea'; f.fillRect(150, 470 - i * 42, 212, 42); }
      f.fillStyle = '#b8402a'; f.fillRect(100, 380, 40, 50); f.fillStyle = '#2f8a3a'; f.beginPath(); f.arc(120, 360, 34, 0, 7); f.fill();
    }
    const farTexture = new THREE.CanvasTexture(far);
    farTexture.colorSpace = THREE.SRGBColorSpace;
    const beyond = s.mesh(new THREE.PlaneGeometry(4.6, 4.3), new THREE.MeshStandardMaterial({ map: farTexture, emissiveMap: farTexture, emissive: '#ffffff', emissiveIntensity: 0.8, roughness: 1 }), [-W / 2 - 0.9, 2.15, 0]);
    beyond.rotation.y = Math.PI / 2;
    beyond.castShadow = false;

    // Stalls behind the arches.
    const wood = s.material('#6a4628', { roughness: 0.9 });
    const brass = s.material('#d0a23e', { metalness: 0.8, roughness: 0.3 });
    const nicheDark = new THREE.MeshStandardMaterial({ color: '#4a3526', side: THREE.BackSide, roughness: 1 });
    const zf = -D / 2 - 0.4, zb = zf - 1.5;
    const pickDye = () => DYES[Math.floor(random() * DYES.length)];
    type Dot = { at: [number, number, number]; size: number; color: string };
    const rank = centres.map((_unused, index) => index).sort(() => random() - 0.5);
    centres.forEach((cx, index) => {
      const niche = new THREE.Mesh(new THREE.BoxGeometry(2.7, 3.2, 1.5), nicheDark);
      niche.position.set(cx, 1.6, (zf + zb) / 2);
      niche.receiveShadow = true;
      s.root.add(niche);
      const shut = (rank[index] + 0.5) / centres.length > a.open;
      if (shut) {
        const paint = ['#2f7a55', '#2f6fb0', '#8a8f92', '#7a4a2a'][Math.floor(random() * 4)];
        for (const side of [-1, 1]) {
          s.box([1.12, 3.0, 0.07], [cx + side * 0.57, 1.5, zf - 0.12], s.material(paint, { roughness: 0.8 }));
          for (const y of [0.5, 1.5, 2.3]) s.box([1.0, 0.07, 0.02], [cx + side * 0.57, y, zf - 0.075], s.material('#2b2a2c', { metalness: 0.6 }));
        }
        s.box([0.14, 0.16, 0.06], [cx, 1.2, zf - 0.05], brass);
        if (random() < 0.6) s.cylinder(0.2, 0.17, 0.42, [cx + 0.6 + random() * 0.3, 0.21, zf + 0.75], wood, 10);
        return;
      }
      const trade: Trade = a.trade === 'mixed' || random() < 0.2 ? TRADES[(index + Math.floor(random() * 4)) % 4] : a.trade;
      s.label({ fabric: 'TISSUS', pottery: 'POTERIE', metal: 'CUIVRES', food: 'EPICES' }[trade], 1.5, 0.34, [cx, 3.45, -D / 2 + 0.02], '#f3e6c4', ['#7a2a1e', '#23463f', '#2a3f7a'][index % 3]);
      const plenty = mix(0.45, 1, mood.density);
      if (trade === 'fabric') {
        s.box([2.3, 2.3, 0.45], [cx, 1.15, zb + 0.3], wood);
        const bolts: Dot[] = [];
        for (let row = 0; row < 4; row++) for (let col = 0; col < 6; col++) if (random() < plenty) bolts.push({ at: [cx - 0.92 + col * 0.37, 0.4 + row * 0.52, zb + 0.56], size: 1, color: pickDye() });
        s.scatter(new THREE.BoxGeometry(0.32, 0.2, 0.3), s.material('#ffffff', { roughness: 1 }), bolts);
        s.box([1.9, 0.75, 0.6], [cx, 0.375, zf - 0.55], wood);
        const folds: Dot[] = [];
        for (let stack = 0; stack < 4; stack++) for (let k = 0; k < 2 + Math.floor(random() * 5 * plenty); k++) folds.push({ at: [cx - 0.68 + stack * 0.45, 0.79 + k * 0.07, zf - 0.55], size: 1, color: pickDye() });
        s.scatter(new THREE.BoxGeometry(0.38, 0.065, 0.46), s.material('#ffffff', { roughness: 1 }), folds);
        for (let k = 0; k < 5; k++) if (random() < plenty) s.box([0.3, 1 + random() * 0.6, 0.03], [cx - 0.8 + k * 0.4, 2.1 - random() * 0.2, zf - 0.08], s.material(pickDye(), { roughness: 1, side: THREE.DoubleSide }));
      } else if (trade === 'pottery') {
        const glazes = ['#b8562e', '#1f6fa8', '#2f8a5c', '#e0b030', '#f1ead6', '#8a2a20'];
        const pots: Dot[] = [];
        for (let step = 0; step < 3; step++) {
          s.box([2.3, 0.35 + step * 0.4, 0.42], [cx, (0.35 + step * 0.4) / 2, zf - 0.35 - step * 0.42], wood);
          for (let k = 0; k < 5; k++) if (random() < plenty) pots.push({ at: [cx - 0.9 + k * 0.45, 0.35 + step * 0.4, zf - 0.35 - step * 0.42], size: 0.85 + random() * 0.3, color: glazes[Math.floor(random() * glazes.length)] });
        }
        const tagine = new THREE.LatheGeometry([[0, 0], [0.2, 0], [0.22, 0.05], [0.19, 0.07], [0.17, 0.09], [0.06, 0.3], [0.035, 0.34], [0.05, 0.37], [0, 0.39]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
        s.scatter(tagine, s.material('#ffffff', { roughness: 0.4 }), pots);
        for (const side of [-1, 1]) s.lathe([[0, 0], [0.16, 0], [0.3, 0.3], [0.28, 0.6], [0.14, 0.78], [0.17, 0.85]], s.material(glazes[Math.floor(random() * 3)], { roughness: 0.5 }), [cx + side * 0.75, 0, zf + 0.55]);
      } else if (trade === 'metal') {
        for (let k = 0; k < 5; k++) s.cylinder(0.3 + random() * 0.2, 0.3 + random() * 0.2, 0.03, [cx - 0.85 + k * 0.42, 0.9 + (k % 2) * 0.8 + random() * 0.2, zb + 0.08], brass, 20).rotation.x = Math.PI / 2 - 0.12;
        s.box([2.1, 0.7, 0.6], [cx, 0.35, zf - 0.55], wood);
        const pots: Dot[] = [];
        for (let k = 0; k < 6; k++) if (random() < plenty) pots.push({ at: [cx - 0.85 + k * 0.34, 0.7, zf - 0.55 + (random() - 0.5) * 0.2], size: 0.8 + random() * 0.5, color: random() < 0.5 ? '#d9dcdf' : '#d0a23e' });
        s.scatter(new THREE.LatheGeometry([[0.06, 0], [0.12, 0.08], [0.13, 0.15], [0.07, 0.24], [0.02, 0.32], [0, 0.33]].map(([x, y]) => new THREE.Vector2(x, y)), 12), s.material('#ffffff', { metalness: 0.85, roughness: 0.25 }), pots);
        const lamps: Dot[] = [];
        for (let k = 0; k < 6; k++) if (random() < plenty) {
          const x = cx - 0.8 + k * 0.32, y = 1.75 + random() * 0.7;
          lamps.push({ at: [x, y, zf - 0.1], size: 0.8 + random() * 0.5, color: ['#ffab2e', '#e62a3c', '#2f66ea', '#1fb46c'][Math.floor(random() * 4)] });
          s.rod([x, y + 0.3, zf - 0.1], [x, 3.0, zf - 0.1], 0.008, wood);
        }
        s.scatter(new THREE.LatheGeometry([[0.03, 0], [0.13, 0.1], [0.14, 0.18], [0.06, 0.32], [0.02, 0.36]].map(([x, y]) => new THREE.Vector2(x, y)), 10), s.material('#ffffff', { emissive: '#ff9a2e', emissiveIntensity: mix(0.3, 0.8, mood.cheer), roughness: 0.4 }), lamps);
      } else {
        const spices = ['#e2a310', '#c6341c', '#8a6a3a', '#2b3fa0', '#d96a12', '#6b7a2c'];
        s.box([2.2, 0.8, 0.6], [cx, 0.4, zf - 0.6], wood);
        const cones: Dot[] = [];
        for (let k = 0; k < 6; k++) if (random() < plenty) cones.push({ at: [cx - 0.9 + k * 0.36, 0.8, zf - 0.6], size: 0.8 + random() * 0.4, color: spices[k % spices.length] });
        s.scatter(new THREE.ConeGeometry(0.15, 0.42, 14).translate(0, 0.21, 0), s.material('#ffffff', { roughness: 1 }), cones);
        const sack = s.material('#b89a68', { roughness: 1 });
        for (let k = 0; k < 4; k++) if (random() < plenty) {
          const x = cx - 0.85 + k * 0.56, z = zf + 0.5 + random() * 0.15;
          s.lathe([[0.16, 0], [0.24, 0.1], [0.25, 0.4], [0.22, 0.48]], sack, [x, 0, z]);
          s.ball([0.21, 0.09, 0.21], [x, 0.47, z], s.material(['#3a2a1a', '#6b7a2c', '#c6341c', '#e8d9a8'][k], { roughness: 0.9 }), 12);
        }
        for (let k = 0; k < 4; k++) s.box([0.5, 0.05, 0.3], [cx - 0.75 + k * 0.5, 1.6 + (k % 2) * 0.5, zb + 0.2], wood);
      }
    });

    // Roof: poles across the lane, and a covering cut back so the stalls can be seen.
    const pole = s.material('#8a6a42', { roughness: 0.95 });
    const roofY = WALL + 0.06;
    for (let x = -7; x <= 7.01; x += 14 / 6) s.rod([x, roofY - 0.05, -D / 2 - 0.4], [x, roofY - 0.05, D / 2], 0.065, pole).castShadow = a.roof === 'open';
    for (const z of [-4.5, -3.3, -2.1]) s.rod([-W / 2 - 0.4, roofY, z], [W / 2, roofY, z], 0.05, pole);
    const cover = { z0: -D / 2 - 0.3, z1: -1.9 };
    if (a.roof === 'reed') {
      const reeds: THREE.Matrix4[] = [], tints: THREE.Color[] = [];
      for (let x = -7.3, i = 0; x < 7; x += 0.105, i++) {
        if (i % 4 === 3 || (x > gap[0] && x < gap[1])) continue;
        const reach = random() < 0.12 ? 0.6 + random() : 0;
        reeds.push(new THREE.Matrix4().compose(new THREE.Vector3(x, roofY + 0.07 + random() * 0.02, (cover.z0 + cover.z1 - reach) / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (random() - 0.5) * 0.03, 0)), new THREE.Vector3(1, 1, (cover.z1 - reach - cover.z0))));
        tints.push(new THREE.Color().setHSL(0.1 + random() * 0.02, 0.5, 0.4 + random() * 0.14));
      }
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.085, 0.03, 1), new THREE.MeshStandardMaterial({ roughness: 1 }), reeds.length);
      reeds.forEach((matrix, index) => { mesh.setMatrixAt(index, matrix); mesh.setColorAt(index, tints[index]); });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      s.root.add(mesh);
      for (let k = 0; k < 4; k++) s.box([0.085, 0.03, 1.2], [gap[0] + 0.3 + k * 0.5, roofY - 0.25, cover.z0 + 0.9], s.material('#c9a45e', { roughness: 1 })).rotation.x = 0.5 + random() * 0.4;
    } else if (a.roof === 'cloth') {
      const inks = ['#c8362a', '#2f5fc8', '#e6aa14', '#f0ece0'];
      [[-6.9, -4.4], [-4.1, -1.2], [1.6, 4.2], [4.5, 6.9]].forEach(([x0, x1], index) => {
        const geometry = new THREE.PlaneGeometry(x1 - x0, cover.z1 - cover.z0, 8, 4);
        geometry.rotateX(-Math.PI / 2);
        const at = geometry.getAttribute('position');
        for (let i = 0; i < at.count; i++) at.setY(i, -0.3 * Math.cos(at.getX(i) / (x1 - x0) * Math.PI) * (0.6 + 0.4 * Math.cos(at.getZ(i) * 1.1)));
        geometry.computeVertexNormals();
        s.mesh(geometry, s.material(inks[index], { roughness: 1, side: THREE.DoubleSide }), [(x0 + x1) / 2, roofY + 0.2, (cover.z0 + cover.z1) / 2]);
      });
    } else if (a.roof === 'lattice') {
      const laths: THREE.Matrix4[] = [];
      const length = (cover.z1 - cover.z0) * Math.SQRT2;
      for (const turn of [-1, 1]) for (let x = -5.9; x < 6; x += 0.48) {
        if (x > gap[0] - 0.4 && x < gap[1] + 0.4) continue;
        laths.push(new THREE.Matrix4().compose(new THREE.Vector3(x, roofY + 0.06 + (turn > 0 ? 0.03 : 0), (cover.z0 + cover.z1) / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn * Math.PI / 4, 0)), new THREE.Vector3(1, 1, length)));
      }
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.03, 1), s.material('#7a5a36', { roughness: 1 }), laths.length);
      laths.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      s.root.add(mesh);
    }

    // What hangs across the lane.
    const hang = new THREE.Group();
    hang.position.set(0, 3.95, -3.55);
    s.root.add(hang);
    const hung = (mesh: THREE.Object3D) => { mesh.removeFromParent(); mesh.position.sub(hang.position); hang.add(mesh); };
    if (a.overhead === 'skeins' || a.overhead === 'lanterns') {
      hung(s.rod([-W / 2, 3.95, -3.55], [W / 2, 3.95, -3.55], 0.035, pole));
      const count = Math.round(mix(8, 20, mood.density));
      const items: Dot[] = [];
      for (let k = 0; k < count; k++) {
        const x = mix(-6.4, 6.4, (k + random() * 0.6) / count);
        if (a.overhead === 'skeins') items.push({ at: [x, 3.55 - random() * 0.08, -3.55], size: 0.85 + random() * 0.4, color: pickDye() });
        else {
          const drop = 0.25 + random() * 0.5;
          items.push({ at: [x, 3.55 - drop, -3.55], size: 0.9 + random() * 0.5, color: ['#ffc45e', '#ff8a5e', '#ffe0a0', '#9ec4ff', '#8ee0a8'][Math.floor(random() * 5)] });
          hung(s.rod([x, 3.95, -3.55], [x, 3.9 - drop, -3.55], 0.008, wood));
        }
      }
      if (a.overhead === 'skeins') hung(s.scatter(new THREE.TorusGeometry(0.2, 0.085, 6, 14).scale(0.6, 1.9, 0.75), s.material('#ffffff', { roughness: 1 }), items));
      else hung(s.scatter(new THREE.LatheGeometry([[0.02, 0], [0.13, 0.1], [0.15, 0.19], [0.07, 0.32], [0.03, 0.36], [0.05, 0.38]].map(([x, y]) => new THREE.Vector2(x, y)), 12), s.material('#ffffff', { emissive: '#ff9a2e', emissiveIntensity: mix(0.5, 1.1, mood.cheer), roughness: 0.4 }), items));
    } else if (a.overhead === 'cables') {
      const cable = s.material('#1f1d1c', { roughness: 0.8 });
      const bulb = s.material('#fff3c0', { emissive: '#ffd66a', emissiveIntensity: 1.6 });
      for (let k = 0; k < 4; k++) {
        const x0 = -6 + k * 3.6 + random(), x1 = x0 + (random() - 0.5) * 3, sag = 0.5 + random() * 0.5;
        s.tube([[x0, 4.3, -D / 2], [mix(x0, x1, 0.35), 4.3 - sag, -1.4], [mix(x0, x1, 0.7), 4.3 - sag * 0.9, 1.6], [x1, 4.35, D / 2]], 0.018, cable);
        for (const t of [0.3, 0.62]) {
          const bx = mix(x0, x1, t), bz = mix(-D / 2, D / 2, t);
          s.rod([bx, 4.3 - sag * 0.95, bz], [bx, 4.05 - sag, bz], 0.01, cable);
          s.ball([0.07, 0.09, 0.07], [bx, 3.98 - sag, bz], bulb, 8);
        }
      }
    }

    // The near wall, cut low so the lane can be looked into, with gaps where its own stall mouths would be.
    const cut = s.material('#8a4a30', { roughness: 1 });
    for (const [x0, x1] of [[-7, -5.9], [-4.3, -2.5], [2.5, 4.3], [5.9, 7]]) {
      s.box([x1 - x0, 0.36, 0.38], [(x0 + x1) / 2, 0.18, D / 2 - 0.19], edge);
      s.box([x1 - x0 + 0.01, 0.03, 0.39], [(x0 + x1) / 2, 0.375, D / 2 - 0.19], cut);
    }

    // Fixed dressing by the gateway: a bench and a water jar.
    s.box([0.5, 0.45, 1.9], [-W / 2 + 0.3, 0.225, 2.3], s.material(dado, { roughness: 0.95 }));
    s.lathe([[0, 0], [0.14, 0], [0.3, 0.3], [0.32, 0.55], [0.2, 0.8], [0.13, 0.9], [0.17, 0.96]], s.material('#b8562e', { roughness: 0.7 }), [-W / 2 + 0.55, 0, -2.6]);

    const sway = mix(0.004, 0.035, mood.energy);
    world.update = (_dt, time) => { hang.rotation.x = Math.sin(time * 0.9) * sway; };
    return world;
  },
});
