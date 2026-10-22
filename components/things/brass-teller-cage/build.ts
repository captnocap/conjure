import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const PLATES = {
  teller: 'TELLER',
  paying: 'PAYING',
  receiving: 'RECEIVING',
  savings: 'SAVINGS',
  number: 'A plain window number, such as No. 4.',
  cashier: 'CASHIER',
} as const;

const STONE = {
  white: ['#e9e6de', '#8f9299'],
  verde: ['#3f6b55', '#d7e4d2'],
  black: ['#2b2a2e', '#d8c58a'],
  rose: ['#c9978a', '#f4e6dc'],
  travertine: ['#d9c7a2', '#a58e62'],
} as const;

function marble(random: () => number, base: string, vein: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = vein;
  for (let i = 0; i < 11; i++) {
    const broad = i < 4;
    ctx.globalAlpha = broad ? 0.1 + random() * 0.1 : 0.2 + random() * 0.3;
    ctx.lineWidth = broad ? 5 + random() * 9 : 0.5 + random() * 1.2;
    ctx.beginPath();
    let x = random() * 330 - 80, y = -10;
    const drift = 8 + random() * 14;
    ctx.moveTo(x, y);
    while (y < 266) {
      x += drift + (random() - 0.5) * 30;
      y += 14 + random() * 22;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    grille: choice('What style is the brass grille?', {
      bars: 'Plain upright bars with spear finials, stern as a jail.',
      lattice: 'A fine diamond lattice, like a confessional screen.',
      deco: 'Art Deco sunbursts fanning up from the counter between stepped rails.',
      scroll: 'Victorian scrollwork: wide bars with rings and curls between them.',
      frosted: 'Hardly a grille at all: a frosted glass screen in a thin brass frame, later and blander.',
    }),
    status: choice('Is the window serving?', {
      open: 'Open: the green-shaded lamp is lit behind the grille.',
      closed: 'Closed: a NEXT WINDOW PLEASE sign hangs in the pass-through and the lamp is dark.',
      shuttered: 'Shut for good: a roller blind is pulled down behind the whole grille.',
      abandoned: 'Deserted mid-shift: lamp still on, cash drawer hanging open, nobody there.',
    }),
    counter: choice('What lies on the customer side of the counter?', {
      rolls: 'A neat stack of paper-wrapped coin rolls.',
      note: 'A single folded note pushed halfway through the pass-through.',
      passbook: 'One small savings passbook, left behind.',
      coins: 'A scatter of loose coins, as if spilled from a hand.',
      bell: 'A brass call bell waiting to be struck.',
      bag: 'A fat canvas money bag tied at the neck.',
      nothing: 'Nothing at all: polished empty stone.',
    }),
    plate: choice('What does the nameplate above the window say?', PLATES),
    stone: choice('What stone is the counter?', {
      white: 'White marble with grey veins, cold and classical.',
      verde: 'Dark green marble with pale veins, rich and clubby.',
      black: 'Black marble veined with gold, severe and expensive.',
      rose: 'Rose-pink marble, a provincial bank trying to be grand.',
      travertine: 'Honey travertine, sun-warmed and Mediterranean.',
    }),
    crest: choice('What tops the cage?', {
      pediment: 'A small triangular brass pediment, a temple in miniature.',
      clock: 'A round clock set in a brass arch.',
      finials: 'A row of spear-point finials, nothing more.',
      flat: 'A flat stepped cornice.',
    }),
    forced: noul('Has the grille been forced: bars bent apart and the glass behind broken?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [base, vein] = STONE[a.stone];
    const stoneMap = marble(random, base, vein);
    const stone = new THREE.MeshStandardMaterial({ map: stoneMap, roughness: mix(0.25, 0.8, mood.wear) });
    const stoneDark = s.material(new THREE.Color(base).multiplyScalar(0.72), { roughness: 0.5 });
    const brassTint = new THREE.Color('#d6a640').lerp(new THREE.Color('#6f7a55'), mood.wear * 0.6);
    const brass = new THREE.MeshStandardMaterial({ color: brassTint, metalness: 0.6, roughness: mix(0.28, 0.7, mood.wear) });
    const brassDark = new THREE.MeshStandardMaterial({ color: brassTint.clone().multiplyScalar(0.6), metalness: 0.6, roughness: 0.5 });
    const dark = s.material('#2a2622');
    const paper = s.material('#efe8d2');

    const W = 1.7, CH = 1.05, GH = 1.2, D = 0.7;
    const top = CH + 0.06;
    // Counter: plinth, panelled body, overhanging slab.
    s.box([W + 0.06, 0.14, D + 0.04], [0, 0.07, 0], stoneDark);
    s.box([W, CH - 0.14, D], [0, 0.14 + (CH - 0.14) / 2, 0], stone);
    for (const x of [-0.52, 0, 0.52]) {
      s.box([0.44, 0.6, 0.02], [x, 0.58, D / 2 + 0.01], stoneDark);
      s.box([0.36, 0.52, 0.02], [x, 0.58, D / 2 + 0.022], stone);
    }
    s.box([W + 0.12, 0.06, D + 0.14], [0, CH + 0.03, 0.02], stone);
    s.box([W + 0.14, 0.02, D + 0.16], [0, CH - 0.01, 0.02], brass);

    // Cage frame: corner posts, rails, and a solid brass wicket plate with the arched opening.
    const gz = -0.05;
    for (const x of [-1, 1]) {
      s.cylinder(0.035, 0.04, GH, [x * (W / 2 - 0.04), top + GH / 2, gz], brass, 12);
      s.cylinder(0.055, 0.055, 0.04, [x * (W / 2 - 0.04), top + 0.02, gz], brass, 12);
      s.ball([0.05, 0.06, 0.05], [x * (W / 2 - 0.04), top + GH + 0.1, gz], brass, 12);
    }
    s.box([W - 0.04, 0.05, 0.06], [0, top + GH, gz], brass);
    s.box([W - 0.08, 0.03, 0.05], [0, top + 0.015, gz], brass);
    const ow = 0.4, oh = 0.42;
    const plate = new THREE.Shape();
    plate.moveTo(-ow / 2 - 0.05, 0); plate.lineTo(ow / 2 + 0.05, 0); plate.lineTo(ow / 2 + 0.05, oh + 0.06); plate.lineTo(-ow / 2 - 0.05, oh + 0.06); plate.closePath();
    const hole = new THREE.Path();
    const r = ow / 2 - 0.03;
    hole.moveTo(-r, 0.0); hole.lineTo(-r, oh - r - 0.03); hole.absarc(0, oh - r - 0.03, r, Math.PI, 0, true); hole.lineTo(r, 0.0); hole.closePath();
    plate.holes.push(hole);
    const wicket = s.mesh(new THREE.ExtrudeGeometry(plate, { depth: 0.03, bevelEnabled: false }), brass, [0, top, gz - 0.015]);
    wicket.name = 'wicket';
    s.ring(r + 0.012, 0.012, [0, top + oh - r - 0.03, gz + 0.02], brassDark, Math.PI);

    // Grille panels: left, right, and the strip above the wicket.
    const bent = a.forced;
    const panels: [number, number, number, number][] = [
      [-W / 2 + 0.08, -ow / 2 - 0.05, top + 0.03, top + GH - 0.025],
      [ow / 2 + 0.05, W / 2 - 0.08, top + 0.03, top + GH - 0.025],
      [-ow / 2 - 0.05, ow / 2 + 0.05, top + oh + 0.06, top + GH - 0.025],
    ];
    const bar = (x0: number, y0: number, x1: number, y1: number, radius = 0.009) => s.rod([x0, y0, gz], [x1, y1, gz], radius, brass);
    panels.forEach(([x0, x1, y0, y1], index) => {
      const w = x1 - x0, h = y1 - y0;
      const wreck = bent && index === 1;
      if (a.grille === 'bars') {
        const n = Math.max(2, Math.round(w / 0.075));
        for (let i = 1; i < n; i++) {
          const x = x0 + (w * i) / n;
          const bow = wreck ? Math.sin((i / n) * Math.PI) * (i < n / 2 ? -0.09 : 0.09) : 0;
          if (bow) s.tube([[x, y0, gz], [x + bow, y0 + h * 0.5, gz + 0.06], [x, y1, gz]], 0.009, brass);
          else bar(x, y0, x, y1);
        }
        s.box([w, 0.02, 0.025], [x0 + w / 2, y0 + h * 0.72, gz], brass);
      } else if (a.grille === 'lattice') {
        const step = 0.11;
        for (let c = x0 - h; c < x1; c += step) {
          for (const dir of [1, -1]) {
            // Line through (c, y0) rising at 45 degrees, or mirrored, clipped to the panel.
            const sx = dir === 1 ? c : c + h, ex = dir === 1 ? c + h : c;
            const ax = Math.max(x0, Math.min(sx, ex)), bx = Math.min(x1, Math.max(sx, ex));
            if (bx - ax < 0.02) continue;
            const yAt = (x: number) => (dir === 1 ? y0 + (x - c) : y0 + (c + h - x));
            if (wreck && random() < 0.45) continue;
            bar(ax, yAt(ax), bx, yAt(bx), 0.006);
          }
        }
      } else if (a.grille === 'deco') {
        const cx = x0 + w / 2;
        const rays = Math.max(3, Math.round(w / 0.07));
        for (let i = 0; i <= rays; i++) {
          const t = i / rays;
          const angle = mix(-1.05, 1.05, t);
          const len = Math.min(h / Math.cos(angle), (w / 2) / Math.max(Math.abs(Math.sin(angle)), 0.001));
          if (wreck && i > rays * 0.3 && i < rays * 0.7) continue;
          bar(cx, y0, cx + Math.sin(angle) * len, y0 + Math.cos(angle) * len, 0.008);
        }
        s.ring(Math.min(w * 0.3, 0.16), 0.01, [cx, y0, gz], brass, Math.PI);
        for (const f of [0.55, 0.78]) s.box([w * (1.25 - f), 0.022, 0.025], [cx, y0 + h * f, gz], brass);
      } else if (a.grille === 'scroll') {
        const n = Math.max(1, Math.round(w / 0.16));
        const cell = w / n;
        for (let i = 0; i <= n; i++) bar(x0 + cell * i, y0, x0 + cell * i, y1, 0.011);
        const rows = Math.max(1, Math.round(h / 0.2));
        for (let i = 0; i < n; i++)
          for (let j = 0; j < rows; j++) {
            if (wreck && random() < 0.5) continue;
            const ring = s.ring(Math.min(cell, h / rows) * 0.36, 0.007, [x0 + cell * (i + 0.5), y0 + (h / rows) * (j + 0.5), gz], brass, j % 2 ? Math.PI * 2 : Math.PI * 1.5);
            ring.rotation.z = j % 2 ? 0 : (i % 2 ? 1 : -1) * 0.8;
          }
      } else {
        const glass = new THREE.MeshStandardMaterial({ color: '#dfe8e4', transparent: true, opacity: 0.55, roughness: 0.9 });
        if (!wreck) s.box([w, h, 0.012], [x0 + w / 2, y0 + h / 2, gz], glass);
        else for (let i = 0; i < 4; i++) {
          const shard = s.mesh(new THREE.ConeGeometry(0.09 + random() * 0.08, 0.2 + random() * 0.3, 3), glass, [x0 + w * (0.15 + i * 0.23), y0 + 0.12, gz]);
          shard.scale.z = 0.06;
        }
        s.box([w, 0.015, 0.02], [x0 + w / 2, y0 + h / 2, gz], brass);
      }
      s.box([0.02, h, 0.03], [x0, y0 + h / 2, gz], brass);
      s.box([0.02, h, 0.03], [x1, y0 + h / 2, gz], brass);
    });
    if (bent) {
      // Shards on the counter and a dark starred hole behind the bars.
      for (let i = 0; i < 9; i++) {
        const shard = s.mesh(new THREE.ConeGeometry(0.02 + random() * 0.03, 0.05 + random() * 0.06, 3), new THREE.MeshStandardMaterial({ color: '#cfe0dc', roughness: 0.2 }), [0.25 + random() * 0.55, top + 0.006, 0.05 + random() * 0.3]);
        shard.rotation.set(Math.PI / 2, 0, random() * 6);
        shard.scale.z = 0.15;
      }
    }

    // Crest and nameplate.
    const crestY = top + GH + 0.025;
    const text = a.plate === 'number' ? `No. ${1 + Math.floor(random() * 9)}` : PLATES[a.plate];
    s.box([0.74, 0.17, 0.05], [0, crestY + 0.085, gz], brassDark);
    s.label(text, 0.68, 0.12, [0, crestY + 0.085, gz + 0.027], '#f1dc9a', '#2a2a22');
    let crestTop = crestY + 0.17;
    if (a.crest === 'pediment') {
      const tri = new THREE.Shape();
      tri.moveTo(-0.5, 0); tri.lineTo(0.5, 0); tri.lineTo(0, 0.24); tri.closePath();
      s.mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.06, bevelEnabled: false }), brass, [0, crestTop, gz - 0.03]);
      s.ball([0.04, 0.05, 0.04], [0, crestTop + 0.27, gz], brass, 10);
    } else if (a.crest === 'clock') {
      s.cylinder(0.2, 0.2, 0.07, [0, crestTop + 0.2, gz], brass, 28).rotation.x = Math.PI / 2;
      s.cylinder(0.165, 0.165, 0.075, [0, crestTop + 0.2, gz], s.material('#f3ecd6'), 28).rotation.x = Math.PI / 2;
      const hour = random() * Math.PI * 2, minute = random() * Math.PI * 2;
      s.rod([0, crestTop + 0.2, gz + 0.04], [Math.sin(hour) * 0.08, crestTop + 0.2 + Math.cos(hour) * 0.08, gz + 0.04], 0.009, dark);
      s.rod([0, crestTop + 0.2, gz + 0.042], [Math.sin(minute) * 0.13, crestTop + 0.2 + Math.cos(minute) * 0.13, gz + 0.042], 0.006, dark);
      for (let i = 0; i < 12; i++) s.box([0.012, 0.03, 0.004], [Math.sin(i * Math.PI / 6) * 0.14, crestTop + 0.2 + Math.cos(i * Math.PI / 6) * 0.14, gz + 0.039], dark).rotation.z = -i * Math.PI / 6;
    } else if (a.crest === 'finials') {
      for (let i = 0; i < 11; i++) {
        const x = -W / 2 + 0.12 + (i * (W - 0.24)) / 10;
        if (Math.abs(x) < 0.4) continue;
        s.mesh(new THREE.ConeGeometry(0.022, 0.12, 8), brass, [x, top + GH + 0.085, gz]);
      }
    } else {
      s.box([1.0, 0.05, 0.07], [0, crestTop + 0.025, gz], brass);
      s.box([0.6, 0.05, 0.07], [0, crestTop + 0.075, gz], brass);
    }

    // Behind the grille: the teller's side.
    const lampOn = a.status === 'open' || a.status === 'abandoned';
    const glow = mix(0.9, 2.2, mood.cheer);
    const shade = new THREE.MeshStandardMaterial({ color: '#1f7a4a', emissive: '#2fd27a', emissiveIntensity: lampOn ? glow : 0, roughness: 0.4 });
    const lx = -0.45, lz = -0.2;
    s.cylinder(0.07, 0.08, 0.02, [lx, top + 0.01, lz], brass, 16);
    s.rod([lx, top + 0.02, lz], [lx, top + 0.3, lz], 0.01, brass);
    const lampShade = s.cylinder(0.07, 0.07, 0.26, [lx, top + 0.32, lz + 0.02], shade, 16);
    lampShade.rotation.z = Math.PI / 2;
    lampShade.scale.z = 1.25;
    const bulb = new THREE.MeshStandardMaterial({ color: '#fff3c8', emissive: '#ffe9a0', emissiveIntensity: lampOn ? glow * 1.2 : 0 });
    s.box([0.2, 0.012, 0.12], [lx, top + 0.262, lz + 0.02], bulb);
    if (lampOn) {
      const pool = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0.35, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(lx, top + 0.004, lz + 0.05);
      s.root.add(pool);
    }
    if (a.status === 'shuttered') {
      s.box([W - 0.16, GH - 0.06, 0.015], [0, top + GH / 2, gz - 0.06], s.material('#6b6a4c', { roughness: 0.95 }));
      for (let i = 1; i < 9; i++) s.box([W - 0.16, 0.006, 0.004], [0, top + (GH * i) / 9, gz - 0.05], dark);
      s.rod([0, top + 0.06, gz - 0.05], [0, top + 0.16, gz - 0.05], 0.004, paper);
      s.ring(0.02, 0.005, [0, top + 0.05, gz - 0.05], brass);
    } else {
      // A back ledger shelf so the cage has depth.
      s.box([W - 0.2, 0.03, 0.2], [0, top + 0.5, -D / 2 + 0.08], s.material('#5a3b26'));
      s.box([0.03, 0.5, 0.2], [-W / 2 + 0.12, top + 0.25, -D / 2 + 0.08], s.material('#5a3b26'));
      s.box([0.03, 0.5, 0.2], [W / 2 - 0.12, top + 0.25, -D / 2 + 0.08], s.material('#5a3b26'));
      const spines = ['#7a2a26', '#27483a', '#2d3557', '#8a6a2c'];
      let bx = -0.2;
      while (bx < W / 2 - 0.2) {
        const bw = 0.03 + random() * 0.035, bh = 0.2 + random() * 0.1;
        s.box([bw, bh, 0.15], [bx + bw / 2, top + 0.515 + bh / 2, -D / 2 + 0.08], s.material(spines[Math.floor(random() * spines.length)])).rotation.z = random() < 0.15 ? 0.12 : 0;
        bx += bw + 0.006;
        if (random() < mix(0.3, 0.02, mood.density)) bx += 0.08;
      }
    }
    let sign: THREE.Object3D | null = null;
    if (a.status === 'closed') {
      sign = new THREE.Group();
      sign.position.set(0, top + oh - 0.03, gz + 0.045);
      s.root.add(sign);
      const card = s.label('NEXT WINDOW', 0.34, 0.1, [0, -0.13, 0], '#f3ead0', '#7a1f1f');
      const card2 = s.label('PLEASE', 0.34, 0.09, [0, -0.225, 0], '#f3ead0', '#7a1f1f');
      const c1 = s.rod([-0.13, 0, 0], [-0.13, -0.08, 0], 0.003, brass), c2 = s.rod([0.13, 0, 0], [0.13, -0.08, 0], 0.003, brass);
      for (const part of [card, card2, c1, c2]) sign.add(part);
    }
    if (a.status === 'abandoned') {
      // Cash drawer hanging out on the teller side, notes spilling over the counter edge.
      s.box([0.5, 0.1, 0.4], [0.35, CH - 0.2, -D / 2 - 0.15], s.material('#4a3324'));
      const note = s.material('#8fae84');
      for (let i = 0; i < 7; i++) {
        const bill = s.box([0.15, 0.003, 0.065], [0.15 + random() * 0.5, top + 0.004 + i * 0.003, -0.28 + random() * 0.16], note);
        bill.rotation.y = random() * 3;
      }
      const stool = s.cylinder(0.16, 0.16, 0.04, [-0.2, 0.02, -D / 2 - 0.45], s.material('#3b2a1e'), 16);
      stool.rotation.z = Math.PI / 2;
      stool.position.y = 0.16;
      for (let i = 0; i < 3; i++) s.rod([-0.18, 0.16, -D / 2 - 0.45], [0.45, 0.04 + i * 0.12, -D / 2 - 0.55 + i * 0.1], 0.015, s.material('#3b2a1e'));
    }

    // The customer's side of the counter.
    const fz = 0.2;
    if (a.counter === 'rolls') {
      const wraps = ['#b5553c', '#3f6f9a', '#c9a23a', '#5f8a55'];
      const n = 4 + Math.floor(mix(2, 8, mood.density) * random());
      for (let i = 0; i < n; i++) {
        const row = i < 4 ? 0 : 1;
        const roll = s.cylinder(0.02, 0.02, 0.13, [0.45 + (row ? 0.022 : 0) + (i % 4) * 0.044, top + 0.02 + row * 0.036, fz], s.material(wraps[i % 4]), 10);
        roll.rotation.x = Math.PI / 2;
      }
    } else if (a.counter === 'note') {
      const n = s.box([0.16, 0.004, 0.1], [0.02, top + 0.004, gz + 0.06], paper);
      n.rotation.y = (random() - 0.5) * 0.5;
      s.box([0.1, 0.002, 0.006], [0.02, top + 0.007, gz + 0.06], dark).rotation.y = n.rotation.y;
    } else if (a.counter === 'passbook') {
      const b = s.box([0.1, 0.012, 0.15], [0.3, top + 0.006, fz], s.material('#27407a'));
      b.rotation.y = 0.3 + random() * 0.5;
      const l = s.box([0.06, 0.002, 0.03], [0.3, top + 0.013, fz], s.material('#d9c27a'));
      l.rotation.y = b.rotation.y;
    } else if (a.counter === 'coins') {
      const coin = new THREE.CylinderGeometry(0.014, 0.014, 0.003, 10);
      const points = Array.from({ length: 14 + Math.floor(random() * 14) }, () => ({ at: [(random() - 0.5) * 0.9, top + 0.002, 0.08 + random() * 0.26] as [number, number, number], size: 0.8 + random() * 0.5, color: random() < 0.5 ? '#d8b24a' : '#c8cdd0' }));
      s.scatter(coin, new THREE.MeshStandardMaterial({ metalness: 0.5, roughness: 0.35 }), points);
    } else if (a.counter === 'bell') {
      s.cylinder(0.055, 0.06, 0.012, [0.4, top + 0.006, fz], dark, 16);
      const dome = s.ball([0.05, 0.035, 0.05], [0.4, top + 0.012, fz], brass, 16);
      dome.scale.y = 0.035;
      s.cylinder(0.008, 0.008, 0.02, [0.4, top + 0.055, fz], brass, 8);
    } else if (a.counter === 'bag') {
      const canvasMat = s.material('#cbb98c', { roughness: 0.95 });
      s.ball([0.12, 0.11, 0.1], [-0.42, top + 0.1, fz], canvasMat, 16);
      s.cylinder(0.05, 0.03, 0.06, [-0.42, top + 0.23, fz], canvasMat, 10);
      s.ring(0.032, 0.006, [-0.42, top + 0.2, fz], dark).rotation.x = Math.PI / 2;
      s.label('$', 0.09, 0.09, [-0.42, top + 0.1, fz + 0.101], '#3a3327', '#cbb98c');
    }

    // Dust and neglect.
    if (mood.wear > 0.6) {
      for (let i = 0; i < 5; i++) s.box([0.1 + random() * 0.15, 0.002, 0.07 + random() * 0.08], [(random() - 0.5) * 1.3, top + 0.002, 0.1 + random() * 0.25], s.material('#b9b3a4', { roughness: 1 })).rotation.y = random() * 3;
    }

    const flicker = mood.energy;
    return s.finish({
      update: (_dt, time) => {
        if (sign) sign.rotation.z = Math.sin(time * mix(0.6, 3, flicker)) * mix(0.01, 0.09, flicker);
        if (lampOn) shade.emissiveIntensity = glow * (1 - flicker * 0.25 * Math.max(0, Math.sin(time * 23) * Math.sin(time * 7.3)));
      },
    });
  },
});
