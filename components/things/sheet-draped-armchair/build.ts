import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Slab = { x0: number; x1: number; z0: number; z1: number; top: number };

export default defineThing({
  questions: {
    chair: choice('What kind of armchair is under the sheet?', {
      wingback: 'A tall wingback with ears either side of the head, a fireside chair.',
      club: 'A low fat club chair with broad rounded arms.',
      nursing: 'A small armless bedroom chair with a high narrow back.',
      recliner: 'A big recliner with its footrest still out.',
    }),
    sheet: choice('How does the dust sheet sit?', {
      neat: 'Neat and square, tucked to the floor, only one front corner lifted.',
      slipping: 'Slipping off to one side, one arm bare and a heap of cloth on the floor.',
      dent: 'Neat, but the seat holds the hollow and creases of someone having sat a moment.',
      thrown: 'Thrown back over the top so the seat and arms are uncovered, as if about to be used.',
    }),
    cloth: choice('What is the sheet?', {
      white: 'A plain white cotton bedsheet.',
      floral: 'An old bedsheet with a faded sprig pattern.',
      striped: 'A striped flannelette sheet from an airing cupboard.',
      decorator: "A decorator's canvas dust sheet, spattered with paint.",
    }),
    upholstery: choice('What upholstery shows where the sheet lifts?', {
      chintz: 'Faded floral chintz, cream with roses.',
      leather: 'Oxblood leather, cracked and buttoned.',
      velvet: 'Mustard velvet worn smooth on the arms.',
      tweed: 'Grey-green tweed.',
      tartan: 'Red tartan wool.',
    }),
    beside: choice('What waits beside it?', {
      slippers: 'A pair of slippers, side by side where feet would be.',
      stick: 'A walking stick leaning on the arm.',
      cushion: 'Its loose cushion on the floor.',
      nothing: 'Nothing at all.',
    }),
    note: choice('Is anything written and left on the seat?', {
      none: 'No, nothing.',
      keep: 'A sheet of paper saying KEEP.',
      lot: 'An auction lot ticket: LOT 41.',
      dads: "A note saying DAD'S CHAIR.",
      free: 'A cardboard sign: FREE TO A GOOD HOME.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const P = {
      wingback: { seatW: 0.56, seatD: 0.56, seatH: 0.45, armW: 0.13, armH: 0.64, backH: 1.12, backT: 0.17, legH: 0.14 },
      club: { seatW: 0.56, seatD: 0.58, seatH: 0.41, armW: 0.24, armH: 0.64, backH: 0.8, backT: 0.26, legH: 0.07 },
      nursing: { seatW: 0.54, seatD: 0.52, seatH: 0.37, armW: 0, armH: 0, backH: 0.92, backT: 0.14, legH: 0.16 },
      recliner: { seatW: 0.6, seatD: 0.6, seatH: 0.45, armW: 0.2, armH: 0.66, backH: 1.04, backT: 0.24, legH: 0.05 },
    }[a.chair];
    const W = P.seatW + P.armW * 2, D = P.seatD + P.backT;
    const zBack = -D / 2, zSeat = zBack + P.backT, zFront = D / 2;
    const dent = a.sheet === 'dent' ? 0.05 : 0;

    // --- upholstery
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const c = cv.getContext('2d')!;
    const fabric = { chintz: '#e6dcc2', leather: '#6e2420', velvet: '#c2932e', tweed: '#7d8468', tartan: '#a5282a' }[a.upholstery];
    c.fillStyle = fabric; c.fillRect(0, 0, 256, 256);
    if (a.upholstery === 'chintz') for (let i = 0; i < 26; i++) {
      const x = random() * 256, y = random() * 256, r = 9 + random() * 9;
      c.fillStyle = '#6f8a55'; c.beginPath(); c.ellipse(x + r, y + r * 0.6, r * 0.9, r * 0.4, 0.6, 0, 7); c.fill();
      c.fillStyle = random() < 0.6 ? '#c9606c' : '#d99aa0';
      for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.26) * r * 0.5, y + Math.sin(p * 1.26) * r * 0.5, r * 0.5, 0, 7); c.fill(); }
      c.fillStyle = '#e8c860'; c.beginPath(); c.arc(x, y, r * 0.25, 0, 7); c.fill();
    } else if (a.upholstery === 'tartan') {
      for (const [at, w, col] of [[20, 26, 'rgba(20,60,40,0.75)'], [70, 6, 'rgba(240,220,120,0.9)'], [128, 34, 'rgba(20,30,70,0.7)'], [200, 6, 'rgba(255,255,255,0.8)']] as const) { c.fillStyle = col; c.fillRect(at, 0, w, 256); c.fillRect(0, at, 256, w); }
    } else if (a.upholstery === 'tweed') {
      for (let i = 0; i < 5000; i++) { c.fillStyle = ['#4f5a44', '#a9ae8f', '#8a6a40', '#5f6e70'][Math.floor(random() * 4)]; c.fillRect(random() * 256, random() * 256, 2, 3); }
    } else for (let i = 0; i < 40 + mood.wear * 120; i++) {
      c.strokeStyle = a.upholstery === 'leather' ? 'rgba(20,5,5,0.3)' : 'rgba(255,240,190,0.12)'; c.lineWidth = 1;
      const x = random() * 256, y = random() * 256; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 40, y + (random() - 0.5) * 40); c.stroke();
    }
    const fabricTex = new THREE.CanvasTexture(cv); fabricTex.colorSpace = THREE.SRGBColorSpace; fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping; fabricTex.repeat.set(2, 2);
    const up = new THREE.MeshStandardMaterial({ map: fabricTex, roughness: a.upholstery === 'leather' ? 0.45 : 0.95 });
    const wood = s.material('#3d2516', { roughness: 0.5 });

    const slabs: Slab[] = [];
    const pad = (w: number, h: number, d: number, x: number, yTop: number, z: number, r = 0.05, solid = true) => {
      const mesh = s.mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), up, [x, yTop - h / 2, z]);
      if (solid) slabs.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, top: yTop });
      return mesh;
    };
    pad(W, P.seatH - 0.1 - P.legH, D, 0, P.seatH - 0.1, 0, 0.03);
    pad(P.seatW, 0.16, P.seatD + 0.02, 0, P.seatH - dent, zSeat + P.seatD / 2 + 0.01, 0.06);
    slabs[slabs.length - 1].top = P.seatH - dent * 0.4;
    pad(W, P.backH - P.legH, P.backT, 0, P.backH, zBack + P.backT / 2, a.chair === 'club' ? 0.12 : 0.07);
    if (P.armW > 0) for (const side of [-1, 1]) {
      pad(P.armW, P.armH - P.legH, P.seatD * 0.96, side * (W / 2 - P.armW / 2), P.armH, zSeat + P.seatD * 0.48, a.chair === 'wingback' ? 0.05 : 0.11);
      if (a.chair === 'wingback') pad(0.09, P.backH - P.armH + 0.02, 0.3, side * (W / 2 - 0.045), P.backH - 0.03, zSeat + 0.13, 0.04);
    }
    if (a.chair === 'recliner') {
      pad(P.seatW, 0.11, 0.42, 0, P.seatH - 0.04, zFront + 0.26, 0.05);
      for (const side of [-1, 1]) s.rod([side * 0.2, 0.2, zFront - 0.05], [side * 0.2, P.seatH - 0.12, zFront + 0.2], 0.012, s.material('#8d9296', { metalness: 0.7 }));
    }
    if (a.upholstery === 'leather') for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++)
      s.ball([0.016, 0.016, 0.01], [(i - 1) * P.seatW * 0.3, P.seatH + 0.14 + j * (P.backH - P.seatH - 0.2) * 0.55, zSeat + 0.004], s.material('#3a100e'), 8);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = s.cylinder(0.028, 0.018, P.legH + 0.02, [sx * (W / 2 - 0.06), P.legH / 2, sz * (D / 2 - 0.06)], wood, 10);
      if (sz < 0) leg.rotation.x = -0.12;
    }

    // --- the sheet: a draped height field
    const N = 128, E = Math.max(W, D + (a.chair === 'recliner' ? 0.9 : 0)) / 2 + 0.4, cell = (2 * E) / N, n1 = N + 1;
    const zShift = a.chair === 'recliner' ? 0.22 : 0;
    const base = new Float32Array(n1 * n1), tent = new Float32Array(n1 * n1), slope = new Float32Array(n1 * n1);
    const heap = a.sheet === 'slipping' ? { x: -W / 2 - 0.24, z: 0.12 } : null;
    const phase = random() * 6.3, phase2 = random() * 6.3, lobes = 9 + Math.floor(random() * 5);
    for (let j = 0; j < n1; j++) for (let i = 0; i < n1; i++) {
      const x = -E + i * cell, z = -E + j * cell + zShift, id = j * n1 + i;
      let h = 0;
      for (const b of slabs) if (x > b.x0 - 0.012 && x < b.x1 + 0.012 && z > b.z0 - 0.012 && z < b.z1 + 0.012) h = Math.max(h, b.top);
      if (dent && h > 0 && Math.abs(h - (P.seatH - dent * 0.4)) < 0.001) {
        const r = Math.hypot(x / (P.seatW * 0.42), (z - (zSeat + P.seatD * 0.5)) / (P.seatD * 0.42));
        h += 0.009 * Math.sin(Math.atan2(z - zSeat - P.seatD * 0.5, x) * 7 + phase) * Math.min(1, r) - 0.03 * Math.exp(-r * r * 2.2);
      }
      if (a.sheet === 'thrown' && z < zSeat && h > 0) h += 0.035 + 0.03 * Math.sin(x * 31 + phase) + 0.02 * Math.sin(x * 57 + phase2);
      if (heap) {
        const r = Math.hypot(x - heap.x, (z - heap.z) / 1.5);
        h = Math.max(h, 0.2 * Math.exp(-r * r * 26) * (0.75 + 0.25 * Math.sin(x * 40 + z * 23 + phase)) - 0.02);
      }
      base[id] = h;
      const angle = Math.atan2(z, x);
      slope[id] = 10 + 3.2 * Math.sin(angle * lobes + phase) + 1.6 * Math.sin(angle * (lobes * 2 + 3) + phase2);
    }
    const reach = Math.ceil(1.25 / 5 / cell);
    for (let j = 0; j < n1; j++) for (let i = 0; i < n1; i++) {
      const id = j * n1 + i, k = slope[id];
      let best = base[id] > 0 ? base[id] : -9;
      for (let dj = -reach; dj <= reach; dj++) {
        const jj = j + dj; if (jj < 0 || jj > N) continue;
        for (let di = -reach; di <= reach; di++) {
          const ii = i + di; if (ii < 0 || ii > N) continue;
          const h = base[jj * n1 + ii]; if (h <= 0 || h <= best) continue;
          const v = h - k * Math.hypot(di, dj) * cell; if (v > best) best = v;
        }
      }
      tent[id] = best;
    }
    const smooth = (t: number, lo: number, hi: number) => { const u = Math.min(1, Math.max(0, (t - lo) / (hi - lo))); return u * u * (3 - 2 * u); };
    const hemAt = (x: number, z: number) => {
      if (a.sheet === 'slipping') return 0.008 + 1.35 * smooth(x * 0.94 + z * 0.34, -0.08, 0.46);
      if (a.sheet === 'thrown') return 0.008 + 1.6 * smooth(z + Math.abs(x) * 0.12, zSeat - 0.02, zSeat + 0.2);
      return 0.008 + 0.34 * smooth(x * 0.6 + z * 0.8, W * 0.3 + D * 0.4 - 0.12, W * 0.3 + D * 0.4 + 0.2);
    };
    const positions = new Float32Array(n1 * n1 * 3), uvs = new Float32Array(n1 * n1 * 2), keep = new Uint8Array(n1 * n1);
    for (let j = 0; j < n1; j++) for (let i = 0; i < n1; i++) {
      const id = j * n1 + i, x = -E + i * cell, z = -E + j * cell + zShift;
      let y = tent[id];
      if (i > 0 && i < N && j > 0 && j < N) y = (tent[id] * 4 + tent[id - 1] + tent[id + 1] + tent[id - n1] + tent[id + n1]) / 8;
      const hem = hemAt(x, z), pool = hem < 0.05 ? mix(0.25, 0.6, 0.5 + 0.5 * Math.sin(Math.atan2(z, x) * 5 + phase2)) : 0.03;
      keep[id] = tent[id] > hem - pool ? 1 : 0;
      y = Math.max(y, 0.004 + 0.006 * Math.abs(Math.sin(x * 37 + z * 29 + phase)));
      positions.set(keep[id] ? [x, y + 0.012, z] : [0, 0.3, 0], id * 3);
      uvs.set([i / N, j / N], id * 2);
    }
    const index: number[] = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const p = j * n1 + i, q = p + 1, r = p + n1, t = r + 1;
      if (keep[p] && keep[q] && keep[r]) index.push(p, r, q);
      if (keep[q] && keep[r] && keep[t]) index.push(q, r, t);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(index); geo.computeVertexNormals();

    const sv = document.createElement('canvas'); sv.width = sv.height = 512;
    const k = sv.getContext('2d')!;
    const white = new THREE.Color(a.cloth === 'decorator' ? '#d9cfb8' : '#f4f1ea').lerp(new THREE.Color(mood.warmth > 0.5 ? '#d8c9a8' : '#c3c8cc'), mood.wear * 0.4);
    k.fillStyle = `#${white.getHexString()}`; k.fillRect(0, 0, 512, 512);
    if (a.cloth === 'striped') { for (let x = 0; x < 512; x += 32) { k.fillStyle = 'rgba(90,130,180,0.5)'; k.fillRect(x, 0, 9, 512); k.fillStyle = 'rgba(200,110,110,0.4)'; k.fillRect(x + 14, 0, 3, 512); } }
    if (a.cloth === 'floral') for (let i = 0; i < 260; i++) {
      const x = random() * 512, y = random() * 512;
      k.fillStyle = 'rgba(110,150,100,0.6)'; k.fillRect(x - 1, y, 2, 9);
      k.fillStyle = ['rgba(200,110,140,0.7)', 'rgba(120,130,200,0.7)', 'rgba(220,180,90,0.7)'][i % 3]; k.beginPath(); k.arc(x, y, 4.5, 0, 7); k.fill();
    }
    if (a.cloth === 'decorator') for (let i = 0; i < 150; i++) {
      k.fillStyle = ['#f7f7f2', '#f7f7f2', '#8fb3c9', '#d9b44a', '#b9584a', '#7d9a6a'][Math.floor(random() * 6)];
      k.beginPath(); k.ellipse(random() * 512, random() * 512, 2 + random() * 13, 2 + random() * 8, random() * 3, 0, 7); k.fill();
    }
    for (let i = 0; i < mood.wear * 30; i++) { k.fillStyle = 'rgba(120,105,80,0.08)'; k.beginPath(); k.ellipse(random() * 512, random() * 512, 20 + random() * 60, 12 + random() * 40, random() * 3, 0, 7); k.fill(); }
    if (dent) {
      const px = (0 + E) / (2 * E) * 512, py = (1 - (zSeat + P.seatD * 0.5 - zShift + E) / (2 * E)) * 512, rx = P.seatW * 0.36 / (2 * E) * 512;
      const shade = k.createRadialGradient(px, py, rx * 0.15, px, py, rx * 1.15);
      shade.addColorStop(0, 'rgba(70,75,90,0.34)'); shade.addColorStop(0.7, 'rgba(70,75,90,0.16)'); shade.addColorStop(1, 'rgba(70,75,90,0)');
      k.fillStyle = shade; k.beginPath(); k.arc(px, py, rx * 1.2, 0, 7); k.fill();
      k.strokeStyle = 'rgba(60,65,80,0.4)'; k.lineCap = 'round';
      for (let i = 0; i < 11; i++) {
        const ang = i / 11 * 6.283 + random() * 0.4, r0 = rx * (0.45 + random() * 0.2), r1 = rx * (1.0 + random() * 0.45);
        k.lineWidth = 1.5 + random() * 2; k.beginPath(); k.moveTo(px + Math.cos(ang) * r0, py + Math.sin(ang) * r0);
        k.quadraticCurveTo(px + Math.cos(ang + 0.25) * (r0 + r1) / 2, py + Math.sin(ang + 0.25) * (r0 + r1) / 2, px + Math.cos(ang + 0.1) * r1, py + Math.sin(ang + 0.1) * r1); k.stroke();
      }
    }
    const sheetTex = new THREE.CanvasTexture(sv); sheetTex.colorSpace = THREE.SRGBColorSpace;
    const sheet = s.mesh(geo, new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.95, side: THREE.DoubleSide }));
    sheet.position.z = 0;

    // --- what was left
    const seatZ = zSeat + P.seatD * 0.55, seatTop = P.seatH + (a.sheet === 'thrown' ? 0.004 : 0.02) - dent * 0.5;
    if (a.note !== 'none') {
      const text = { keep: 'KEEP', lot: 'LOT 41', dads: "DAD'S CHAIR", free: 'FREE TO GOOD HOME' }[a.note];
      const card = s.label(text, a.note === 'free' ? 0.36 : 0.26, a.note === 'lot' ? 0.12 : 0.17, [(random() - 0.5) * 0.08, seatTop + 0.012, seatZ], a.note === 'lot' ? '#8a1c1c' : '#1b1b1f', a.note === 'free' ? '#b99466' : '#fbf8ee');
      card.rotation.set(-Math.PI / 2 + 0.06, 0, (random() - 0.5) * 0.5);
    }
    const out = W / 2 + 0.2;
    if (a.beside === 'slippers') {
      const felt = s.material(mood.cheer > 0.5 ? '#9c3d3a' : '#4b5a78', { roughness: 1 }), sole = s.material('#c9b48a');
      for (const side of [-1, 1]) {
        const x = side * 0.085 + 0.02, z = zFront + (a.chair === 'recliner' ? 0.75 : 0.34) + side * 0.015;
        s.ball([0.048, 0.012, 0.125], [x, 0.012, z], sole, 14);
        s.ball([0.05, 0.035, 0.07], [x, 0.035, z + 0.055], felt, 14).rotation.y = side * 0.08;
      }
    } else if (a.beside === 'stick') {
      const cane = s.material('#6b4426', { roughness: 0.45 });
      const topY = Math.max(P.armH, P.seatH) + 0.3, tx = W / 2 + 0.08, bx = out + 0.2, z = zSeat + 0.3;
      s.rod([bx, 0, z + 0.05], [tx, topY, z], 0.011, cane);
      const hook = s.ring(0.045, 0.011, [tx - 0.045, topY, z], cane, Math.PI); hook.rotation.z = 0;
      s.cylinder(0.013, 0.013, 0.03, [bx, 0.015, z + 0.05], s.material('#1c1c1c'), 8);
    } else if (a.beside === 'cushion') {
      const cushion = s.mesh(new RoundedBoxGeometry(0.42, 0.13, 0.42, 4, 0.06), up, [-out - 0.2, 0.075, zFront + 0.2]);
      cushion.rotation.set(0.08, 0.5 + random(), 0.05);
    }
    return s.finish({ footprint: Math.max(W, D) / 2 + 0.25 });
  },
});
