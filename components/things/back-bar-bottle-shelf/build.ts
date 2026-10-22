import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
const JAR = { tips: 'TIPS', college: 'COLLEGE\nFUND', bail: 'BAIL\nMONEY', karma: 'GOOD\nKARMA', eddie: 'FOR\nEDDIE', divorce: 'DIVORCE\nFUND' } as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    stock: score('How well stocked are the shelves?', ['Three sad bottles', 'Gappy, the good stuff is gone', 'Comfortably full', 'Crammed shoulder to shoulder']),
    above: choice('What hangs above the mirror?', {
      fish: 'A mounted fish on a wooden plaque, somebody\'s proudest day.',
      bat: 'A signed baseball bat on two brackets.',
      photo: 'A framed photo of a dead regular with a black ribbon across the corner.',
      clock: 'A round beer-brand clock stopped years ago.',
      trophies: 'A dusty row of league trophies for darts and bowling.',
      nothing: 'Nothing, just the cornice and the lights.',
    }),
    jar: choice('What does the hand-written label on the tip jar say?', {
      tips: 'TIPS', college: 'COLLEGE FUND', bail: 'BAIL MONEY', karma: 'GOOD KARMA', eddie: 'FOR EDDIE', divorce: 'DIVORCE FUND',
    }),
    register: choice('What state is the cash register in?', {
      closed: 'Closed, polished, the last price still showing.',
      nosale: 'Drawer open and empty, the NO SALE flag up.',
      cash: 'Drawer hanging open with the night\'s cash in it.',
    }),
    mirror: choice('What is on the mirror?', {
      plain: 'Just the mirror, a little smoky.',
      cracked: 'A long crack from one corner, never replaced.',
      soap: 'CASH ONLY written across it in soap.',
      tucked: 'Dollar bills, postcards and snapshots tucked along the frame.',
    }),
    wood: choice('What is the cabinet made of?', {
      mahogany: 'Dark red mahogany with turned columns.',
      oak: 'Golden oak gone orange with varnish.',
      black: 'Black-painted wood with brass edging.',
      green: 'Chipped pub-green paint.',
    }),
    lights: choice('What are the Christmas lights like?', {
      multi: 'Fat multicoloured bulbs.',
      warm: 'Small warm white fairy lights.',
      red: 'All red chilli-pepper lights.',
      dead: 'Still hanging, but half the bulbs are dead.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 2.3, counterY = 0.95, mirrorTop = 2.15, backZ = -0.3;
    const woodHex = { mahogany: '#5c2620', oak: '#b47a35', black: '#232224', green: '#2f4d3a' }[a.wood];
    const wood = s.material(woodHex, { roughness: 0.45 });
    const woodDark = s.material(new THREE.Color(woodHex).multiplyScalar(0.7), { roughness: 0.5 });
    const brass = s.material('#c9a03c', { metalness: 0.85, roughness: 0.28 });
    const dark = s.material('#18181b');

    // Lower cabinet with doors, counter slab, side columns, cornice and header board.
    s.box([W, counterY - 0.05, 0.6], [0, (counterY - 0.05) / 2, 0], wood);
    for (let i = 0; i < 4; i++) { const x = (i - 1.5) * (W / 4); s.box([W / 4 - 0.08, 0.6, 0.02], [x, 0.48, 0.3], woodDark); s.ball([0.02, 0.02, 0.02], [x + (i % 2 ? -1 : 1) * (W / 8 - 0.09), 0.5, 0.32], brass, 8); }
    s.box([W + 0.08, 0.05, 0.68], [0, counterY - 0.025, 0.02], a.wood === 'black' ? brass : woodDark);
    for (const x of [-1, 1]) {
      s.box([0.14, mirrorTop - counterY, 0.14], [x * (W / 2 - 0.07), (mirrorTop + counterY) / 2, backZ + 0.07], wood);
      s.cylinder(0.05, 0.05, mirrorTop - counterY - 0.2, [x * (W / 2 - 0.07), (mirrorTop + counterY) / 2, backZ + 0.16], woodDark, 12);
    }
    s.box([W + 0.16, 0.12, 0.3], [0, mirrorTop + 0.06, backZ + 0.13], wood);
    s.box([W + 0.24, 0.04, 0.36], [0, mirrorTop + 0.14, backZ + 0.15], woodDark);
    const header = a.above === 'nothing' ? 0.12 : 0.56;
    s.box([W, header, 0.06], [0, mirrorTop + 0.16 + header / 2, backZ + 0.03], wood);
    s.box([W, mirrorTop + 0.16, 0.04], [0, (mirrorTop + 0.16) / 2, backZ - 0.02], woodDark);

    // Mirror.
    const mirror = paint(512, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#c9d8dc'); g.addColorStop(0.5, '#8fa5ad'); g.addColorStop(1, '#b7c8cc');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      for (const x of [60, 150, 330]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 46, 0); ctx.lineTo(x - 80, h); ctx.lineTo(x - 126, h); ctx.fill(); }
      for (let i = 0; i < 60 * mood.wear; i++) { ctx.fillStyle = `rgba(60,50,35,${0.15 + random() * 0.3})`; ctx.beginPath(); ctx.arc(random() < 0.5 ? random() * 60 : w - random() * 60, random() * h, 2 + random() * 9, 0, 7); ctx.fill(); }
      if (a.mirror === 'cracked') { ctx.strokeStyle = '#243036'; ctx.lineWidth = 3; ctx.beginPath(); let x = 0, y = 20 + random() * 60; ctx.moveTo(x, y); while (x < w * 0.7) { x += 30 + random() * 50; y += (random() - 0.2) * 50; ctx.lineTo(x, y); if (random() < 0.4) { ctx.lineTo(x + 30, y - 40 * random()); ctx.moveTo(x, y); } } ctx.stroke(); }
      if (a.mirror === 'soap') { ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = 'italic bold 62px cursive'; ctx.textAlign = 'center'; ctx.save(); ctx.translate(w / 2, 82); ctx.rotate(-0.04); ctx.fillText('CASH ONLY', 0, 0, 440); ctx.restore(); }
    });
    const mw = W - 0.28, mh = mirrorTop - counterY;
    s.mesh(new THREE.PlaneGeometry(mw, mh), new THREE.MeshStandardMaterial({ map: mirror, roughness: 0.2, metalness: 0.15 }), [0, counterY + mh / 2, backZ + 0.005]);
    if (a.mirror === 'tucked') for (let i = 0; i < 12; i++) {
      const side = random() < 0.5 ? -1 : 1, top = random() < 0.35;
      const card = s.box([0.15, 0.07 + random() * 0.05, 0.004], top ? [(random() - 0.5) * mw * 0.9, mirrorTop - 0.06, backZ + 0.014] : [side * (mw / 2 - 0.07), counterY + 0.5 + random() * 0.6, backZ + 0.014], s.material(random() < 0.55 ? '#8fae84' : random() < 0.5 ? '#f1ead6' : '#d98a5a', { roughness: 0.9 }));
      card.rotation.z = (random() - 0.5) * 0.7;
    }

    // Bottles: three lathe shapes instanced on three steps and two glass shelves.
    const steps = [0, 1, 2].map((k) => ({ y: counterY + k * 0.14, z: 0.02 - k * 0.12 }));
    for (let k = 1; k < 3; k++) s.box([mw, 0.14 * k, 0.12], [0, counterY + 0.07 * k, steps[k].z], woodDark);
    const glass = new THREE.MeshStandardMaterial({ color: '#d8ecee', transparent: true, opacity: 0.35, roughness: 0.05 });
    const rows = [...steps, { y: 1.62, z: backZ + 0.11 }, { y: 1.9, z: backZ + 0.11 }];
    for (const row of rows.slice(3)) { s.box([mw, 0.014, 0.16], [0, row.y - 0.007, row.z], glass); for (const x of [-0.5, 0.5]) s.box([0.02, 0.05, 0.14], [x, row.y - 0.035, row.z], brass); }
    const shapes: [number, number][][] = [
      [[0, 0], [0.036, 0], [0.038, 0.02], [0.038, 0.17], [0.015, 0.23], [0.013, 0.3], [0, 0.3]],
      [[0, 0], [0.048, 0], [0.05, 0.02], [0.05, 0.12], [0.02, 0.17], [0.016, 0.23], [0, 0.23]],
      [[0, 0], [0.03, 0], [0.031, 0.2], [0.012, 0.27], [0.012, 0.34], [0, 0.34]],
    ];
    const tints = ['#7a4a16', '#2f6b3a', '#d9e6e2', '#3b6fb0', '#a3262a', '#2a2019', '#c98a2a', '#e6d9a8'];
    const bins = shapes.map(() => [] as { at: P3; size: number; color: string }[]);
    const labels: { at: P3; size: number; color: string }[] = [];
    const keep = mix(0.04, 1, a.stock);
    rows.forEach((row, r) => {
      const gap = mix(0.13, 0.092, a.stock);
      for (let x = -mw / 2 + 0.08; x < mw / 2 - 0.05; x += gap) {
        if (random() > keep) continue;
        if (r === 0 && x > 0.05 && x < 1.0) continue;
        const shape = Math.floor(random() * 3), size = 0.9 + random() * 0.2;
        const at: P3 = [x + (random() - 0.5) * 0.02, row.y, row.z + (random() - 0.5) * 0.02];
        bins[shape].push({ at, size, color: tints[Math.floor(random() * tints.length)] });
        labels.push({ at: [at[0], at[1] + 0.085 * size, at[2]], size: size * (shape === 1 ? 1.3 : shape === 2 ? 0.82 : 1), color: ['#f1e9d0', '#f1e9d0', '#b02a2a', '#1b1b1b', '#d9b24a'][Math.floor(random() * 5)] });
      }
    });
    if (bins.every((bin) => bin.length === 0)) bins[0].push({ at: [-0.5, steps[2].y, steps[2].z], size: 1, color: tints[0] });
    shapes.forEach((profile, i) => { if (bins[i].length) s.scatter(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 12), new THREE.MeshStandardMaterial({ roughness: 0.15 }), bins[i]); });
    if (labels.length) s.scatter(new THREE.CylinderGeometry(0.0395, 0.0395, 0.07, 12), new THREE.MeshStandardMaterial({ roughness: 0.8 }), labels);

    // Brass cash register.
    const rx = 0.55, rz = 0.14;
    const profile = new THREE.Shape();
    profile.moveTo(-0.19, 0); profile.lineTo(0.19, 0); profile.lineTo(0.19, 0.1); profile.lineTo(0.08, 0.14); profile.lineTo(-0.02, 0.34); profile.lineTo(-0.02, 0.44); profile.lineTo(-0.19, 0.44); profile.closePath();
    const reg = s.mesh(new THREE.ExtrudeGeometry(profile, { depth: 0.38, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1 }), brass, [rx + 0.19, counterY + 0.11, rz]);
    reg.rotation.y = -Math.PI / 2;
    s.box([0.42, 0.11, 0.4], [rx, counterY + 0.055, rz], woodDark);
    const keys: { at: P3; size: number; color: string }[] = [];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 6; col++) keys.push({ at: [rx - 0.14 + col * 0.056, counterY + 0.27 + row * 0.044, rz + 0.17 - row * 0.022], size: 1, color: col < 2 ? '#b02a2a' : col < 4 ? '#f1ead6' : '#1b1b1b' });
    s.scatter(new THREE.CylinderGeometry(0.017, 0.017, 0.02, 10), new THREE.MeshStandardMaterial({ roughness: 0.4 }), keys);
    const flag = a.register === 'nosale' ? 'NO SALE' : '$' + (1 + Math.floor(random() * 8)) + '.' + ['00', '25', '50', '75'][Math.floor(random() * 4)];
    s.box([0.3, 0.12, 0.05], [rx, counterY + 0.61, rz - 0.09], brass);
    s.label(flag, 0.26, 0.085, [rx, counterY + 0.61, rz - 0.063], a.register === 'nosale' ? '#f4efe0' : '#16130f', a.register === 'nosale' ? '#a3262a' : '#f4efe0');
    s.rod([rx + 0.2, counterY + 0.3, rz - 0.02], [rx + 0.26, counterY + 0.3, rz - 0.02], 0.012, brass);
    s.rod([rx + 0.26, counterY + 0.3, rz - 0.02], [rx + 0.26, counterY + 0.4, rz + 0.04], 0.01, brass);
    s.ball([0.022, 0.022, 0.022], [rx + 0.26, counterY + 0.4, rz + 0.04], dark, 10);
    const open = a.register !== 'closed';
    s.box([0.38, 0.08, 0.36], [rx, counterY + 0.055, rz + (open ? 0.24 : 0.03)], brass);
    if (open) {
      s.box([0.34, 0.01, 0.3], [rx, counterY + 0.096, rz + 0.25], dark);
      if (a.register === 'cash') for (let i = 0; i < 4; i++) { s.box([0.065, 0.012 + random() * 0.02, 0.15], [rx - 0.123 + i * 0.082, counterY + 0.108, rz + 0.3], s.material('#8fae84', { roughness: 0.9 })); s.cylinder(0.03, 0.03, 0.012, [rx - 0.123 + i * 0.082, counterY + 0.104, rz + 0.16], s.material(i % 2 ? '#c9ccd0' : '#b87333', { metalness: 0.7 }), 10); }
    }

    // Tip jar with a hand-written label.
    const jx = 0.02, jz = 0.2, jy = counterY;
    s.cylinder(0.085, 0.08, 0.2, [jx, jy + 0.1, jz], new THREE.MeshStandardMaterial({ color: '#e4f2f0', transparent: true, opacity: 0.4, roughness: 0.05 }), 18);
    s.ring(0.078, 0.008, [jx, jy + 0.2, jz], new THREE.MeshStandardMaterial({ color: '#cfe0de', roughness: 0.1 })).rotation.x = Math.PI / 2;
    const fill = mix(0.02, 0.13, mood.cheer * 0.6 + random() * 0.4);
    s.cylinder(0.072, 0.072, fill, [jx, jy + 0.01 + fill / 2, jz], s.material('#8fae84', { roughness: 0.95 }), 12);
    for (let i = 0; i < 3; i++) s.box([0.1, 0.004, 0.045], [jx + (random() - 0.5) * 0.04, jy + fill + 0.02 + i * 0.012, jz], s.material('#9cbf8e', { roughness: 0.9 })).rotation.set(random() * 0.8, random() * 3, random() * 0.8);
    const words = JAR[a.jar].split('\n');
    const tag = paint(256, 200, (ctx) => {
      ctx.fillStyle = '#f7f1dc'; ctx.fillRect(0, 0, 256, 200); ctx.fillStyle = '#1c2a7a'; ctx.textAlign = 'center';
      ctx.font = `italic bold ${words.length > 1 ? 74 : 110}px cursive`;
      words.forEach((word, i) => { ctx.save(); ctx.translate(128, words.length > 1 ? 82 + i * 82 : 136); ctx.rotate((random() - 0.5) * 0.1); ctx.fillText(word, 0, 0, 240); ctx.restore(); });
    });
    const tagMesh = s.mesh(new THREE.CylinderGeometry(0.087, 0.083, 0.13, 18, 1, true, -0.95, 1.9), new THREE.MeshStandardMaterial({ map: tag, roughness: 0.9, side: THREE.DoubleSide }), [jx, jy + 0.1, jz]);
    tagMesh.rotation.y = (random() - 0.5) * 0.3;

    // What hangs above.
    const hy = mirrorTop + 0.16 + header / 2, hz = backZ + 0.07;
    if (a.above === 'fish') {
      const plaque = s.cylinder(0.26, 0.26, 0.03, [0, hy, hz], woodDark, 28); plaque.rotation.x = Math.PI / 2; plaque.scale.set(2.1, 1, 0.8);
      const fishMat = s.material('#7d8f6a', { roughness: 0.35, metalness: 0.3 });
      s.ball([0.36, 0.1, 0.06], [-0.03, hy + 0.01, hz + 0.07], fishMat, 20).rotation.z = 0.12;
      s.ball([0.3, 0.05, 0.062], [-0.03, hy - 0.03, hz + 0.07], s.material('#e6dfc6', { roughness: 0.4 }), 16).rotation.z = 0.12;
      const tail = new THREE.Shape(); tail.moveTo(0, 0); tail.lineTo(0.16, 0.13); tail.lineTo(0.12, 0); tail.lineTo(0.16, -0.13); tail.closePath();
      s.mesh(new THREE.ExtrudeGeometry(tail, { depth: 0.015, bevelEnabled: false }), fishMat, [0.29, hy + 0.05, hz + 0.06]).rotation.z = 0.25;
      const fin = new THREE.Shape(); fin.moveTo(-0.1, 0); fin.lineTo(0.02, 0.1); fin.lineTo(0.1, 0); fin.closePath();
      s.mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.012, bevelEnabled: false }), fishMat, [-0.02, hy + 0.09, hz + 0.065]);
      s.ball([0.016, 0.016, 0.01], [-0.3, hy + 0.0, hz + 0.115], dark, 8);
    } else if (a.above === 'bat') {
      s.rod([-0.48, hy - 0.04, hz + 0.06], [0.42, hy + 0.05, hz + 0.06], 0.017, s.material('#d9b77a', { roughness: 0.4 }), 0.036);
      s.ball([0.03, 0.03, 0.03], [-0.49, hy - 0.041, hz + 0.06], s.material('#d9b77a'), 10);
      for (const x of [-0.3, 0.25]) s.box([0.03, 0.09, 0.07], [x, hy - 0.045 + x * 0.1, hz + 0.035], brass);
      s.tube(Array.from({ length: 9 }, (_u, i) => [0.05 + i * 0.03, hy + 0.012 + i * 0.003 + (i % 2 ? 0.014 : -0.012), hz + 0.094] as P3), 0.003, s.material('#1c2a7a'));
    } else if (a.above === 'photo') {
      const portrait = paint(200, 256, (ctx) => {
        ctx.fillStyle = '#cdbb96'; ctx.fillRect(0, 0, 200, 256);
        ctx.fillStyle = '#5a4630'; ctx.beginPath(); ctx.arc(100, 96, 44, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(100, 250, 82, 96, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#3a2c1c'; ctx.fillRect(48, 50, 104, 18); ctx.fillRect(70, 22, 60, 34);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(110, 0); ctx.lineTo(150, 0); ctx.lineTo(200, 50); ctx.lineTo(200, 90); ctx.fill();
      });
      s.box([0.34, 0.42, 0.03], [0, hy, hz], s.material('#2b2420'));
      s.mesh(new THREE.PlaneGeometry(0.28, 0.36), new THREE.MeshStandardMaterial({ map: portrait, roughness: 0.6 }), [0, hy, hz + 0.017]);
      s.box([0.2, 0.035, 0.012], [0, hy - 0.25, hz], brass);
      for (const x of [-0.28, 0.28]) { s.cylinder(0.022, 0.026, 0.1, [x, hy - 0.19, hz + 0.05], s.material('#f1ead6'), 10); s.ball([0.012, 0.02, 0.012], [x, hy - 0.125, hz + 0.05], new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff9a2a', emissiveIntensity: 1.2 }), 8); s.box([0.08, 0.02, 0.1], [x, hy - 0.25, hz + 0.04], woodDark); }
    } else if (a.above === 'clock') {
      const face = paint(256, 256, (ctx) => {
        ctx.fillStyle = '#f3ecd6'; ctx.beginPath(); ctx.arc(128, 128, 126, 0, 7); ctx.fill();
        ctx.fillStyle = '#a3262a'; ctx.font = 'bold 30px serif'; ctx.textAlign = 'center'; ctx.fillText('OLD GOAT', 128, 88); ctx.font = 'bold 18px serif'; ctx.fillText('LAGER', 128, 176);
        ctx.fillStyle = '#222'; for (let i = 0; i < 12; i++) { ctx.save(); ctx.translate(128, 128); ctx.rotate(i * Math.PI / 6); ctx.fillRect(-4, -118, 8, 20); ctx.restore(); }
        const hour = random() * 6.28, minute = random() * 6.28; ctx.strokeStyle = '#111'; ctx.lineCap = 'round';
        ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128 + Math.sin(hour) * 56, 128 - Math.cos(hour) * 56); ctx.stroke();
        ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128 + Math.sin(minute) * 92, 128 - Math.cos(minute) * 92); ctx.stroke();
      });
      s.cylinder(0.25, 0.25, 0.06, [0, hy, hz], s.material('#a3262a'), 32).rotation.x = Math.PI / 2;
      s.mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshStandardMaterial({ map: face, roughness: 0.5, emissiveMap: face, emissive: '#ffffff', emissiveIntensity: 0.25 * mood.cheer }), [0, hy, hz + 0.032]);
    } else if (a.above === 'trophies') {
      s.box([1.5, 0.03, 0.14], [0, hy - 0.2, hz + 0.05], woodDark);
      const gold = s.material('#d9b24a', { metalness: 0.8, roughness: 0.3 });
      for (let i = 0; i < 6; i++) {
        const x = -0.62 + i * 0.25 + (random() - 0.5) * 0.06, h = 0.16 + random() * 0.18;
        s.box([0.09, 0.05, 0.08], [x, hy - 0.16, hz + 0.05], dark);
        s.cylinder(0.012, 0.016, h, [x, hy - 0.135 + h / 2, hz + 0.05], gold, 8);
        if (i % 2) s.lathe([[0, 0], [0.02, 0.01], [0.05, 0.07], [0.055, 0.1], [0.04, 0.1], [0.03, 0.04], [0, 0.03]], gold, [x, hy - 0.135 + h, hz + 0.05]);
        else s.ball([0.045, 0.045, 0.045], [x, hy - 0.1 + h, hz + 0.05], gold, 10);
      }
    }

    // Christmas lights in scallops under the cornice.
    const wire: P3[] = [], bulbs: P3[] = [];
    const pegs = 6, ly = mirrorTop + 0.02, lz = backZ + 0.3;
    for (let i = 0; i <= pegs * 8; i++) {
      const t = i / (pegs * 8), sag = Math.abs(Math.sin(t * pegs * Math.PI)) * (0.1 + (Math.floor(t * pegs) % 2) * 0.05);
      const p: P3 = [-W / 2 - 0.04 + t * (W + 0.08), ly - sag, lz];
      if (i % 2 === 0) wire.push(p);
      bulbs.push([p[0], p[1] - 0.025, p[2]]);
    }
    s.tube(wire, 0.005, s.material('#1f3d2a'));
    const palette = { multi: ['#ff3b30', '#35c759', '#3478f6', '#ffcc00'], warm: ['#ffd9a0', '#ffe9c4'], red: ['#ff2a1f', '#ff5a2a'], dead: ['#ff3b30', '#35c759', '#3478f6', '#ffcc00'] }[a.lights];
    const big = a.lights === 'warm' ? 0.014 : 0.024;
    const strings = palette.map((color, k) => {
      const mine = bulbs.filter((_p, i) => i % palette.length === k);
      const alive = mine.filter(() => a.lights !== 'dead' || random() < 0.45);
      const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.3 });
      if (alive.length) s.scatter(new THREE.SphereGeometry(big, 8, 6), material, alive.map((at) => ({ at, size: 1 })));
      const deadOnes = mine.filter((p) => !alive.includes(p));
      if (deadOnes.length) s.scatter(new THREE.SphereGeometry(big, 8, 6), s.material('#6f6a60'), deadOnes.map((at) => ({ at, size: 1 })));
      return material;
    });
    const glowBase = mix(0.5, 1.1, mood.cheer), speed = mix(0.3, 4, mood.energy);
    for (const m of strings) m.emissiveIntensity = glowBase;
    return s.finish({ update(_dt, time) { strings.forEach((m, k) => { m.emissiveIntensity = glowBase * (0.65 + 0.35 * Math.sin(time * speed + k * 1.6)); }); } });
  },
});
