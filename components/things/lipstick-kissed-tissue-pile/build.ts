import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];
const TAU = Math.PI * 2;

const LIPS = { red: '#cf1430', fuchsia: '#e31c8e', plum: '#571036', coral: '#f0603c', black: '#18141a', violet: '#7a2fd0' } as const;

export default defineThing({
  questions: {
    face: choice('How much of a face has come off onto the tissues?', {
      kiss: 'A single perfect kiss print blotted on one tissue.',
      half: 'Half a face: the lips and one eye, wiped in a hurry.',
      mask: 'The entire face lifted onto one wipe like a shroud: both eyes, brows, contour and mouth.',
      smears: 'Nothing recognisable, only dragged smears of colour across everything.',
    }),
    lipstick: choice('What colour was the lipstick?', {
      red: 'Classic pillar-box red.',
      fuchsia: 'Hot fuchsia pink.',
      plum: 'Dark bruised plum.',
      coral: 'Orange coral.',
      black: 'Black.',
      violet: 'Electric violet.',
    }),
    night: choice('What kind of night was it?', {
      triumph: 'A triumph: a thrown rose, folded tips and glitter everywhere.',
      heartbreak: 'Heartbreak: mascara tears run through the print, a full ashtray and a photograph torn in two.',
      routine: 'Routine, a Tuesday: an open jar of cold cream and cotton buds lined up.',
      farewell: 'The last night ever: a thank-you note, a dressing-room key handed back.',
    }),
    drink: choice('What is the cold drink beside it?', {
      martini: 'A coupe with an olive on a stick, barely touched.',
      highball: 'A tall glass of flat cola with a bent straw and melted ice.',
      tea: 'A mug of tea gone cold with the bag still in.',
      champagne: 'A flute of champagne with the bubbles gone.',
      cup: 'A plastic bar cup of soda water with a lime wedge.',
      bottle: 'A beer bottle with the label picked half off.',
    }),
    pile: score('How many tissues are in the drift?', ['One', 'A few', 'A small heap', 'A snowdrift spilling everywhere']),
    peeled: choice('What else has been peeled off and left there?', {
      lash: 'One huge false lash lying like a centipede.',
      nails: 'A scatter of press-on nails.',
      both: 'A pair of lashes and a full set of press-on nails.',
      jewels: 'Clip-on earrings and a strip of stick-on gems.',
      nothing: 'Nothing else.',
    }),
    under: choice('What is it all sitting on?', {
      bare: 'The bare counter.',
      towel: 'A folded hand towel.',
      tray: 'A round mirrored tray.',
      magazine: 'An open magazine.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lip = LIPS[a.lipstick];
    const rr = (lo: number, hi: number) => mix(lo, hi, random());
    const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, matrices: THREE.Matrix4[]) => {
      const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const paint = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    };

    // ---- What it sits on ----
    let floorY = 0;
    if (a.under === 'towel') {
      const terry = s.material(mood.warmth > 0.5 ? '#e7b9a6' : '#a9c4cf', { roughness: 1 });
      s.box([0.46, 0.014, 0.32], [0, 0.007, 0], terry);
      s.box([0.46, 0.003, 0.03], [0, 0.0155, 0.1], s.material('#f4f0e8', { roughness: 1 }));
      floorY = 0.014;
    } else if (a.under === 'tray') {
      s.cylinder(0.22, 0.22, 0.008, [0, 0.004, 0], s.material('#c8ced2', { metalness: 0.95, roughness: 0.12 }), 40);
      const rim = s.ring(0.22, 0.007, [0, 0.008, 0], s.material('#c9a13c', { metalness: 0.8, roughness: 0.3 }));
      rim.rotation.x = Math.PI / 2;
      floorY = 0.008;
    } else if (a.under === 'magazine') {
      const page = paint(512, 360, (ctx) => {
        ctx.fillStyle = '#f1ece0'; ctx.fillRect(0, 0, 512, 360);
        ctx.fillStyle = '#b7b0a2'; ctx.fillRect(254, 0, 4, 360);
        for (const side of [0, 1]) {
          const x0 = 20 + side * 258;
          ctx.fillStyle = `hsl(${Math.floor(random() * 360)} 55% 55%)`; ctx.fillRect(x0, 20, 214, 130);
          ctx.fillStyle = `hsl(${Math.floor(random() * 360)} 60% 75%)`; ctx.beginPath(); ctx.arc(x0 + 107, 80, 40, 0, TAU); ctx.fill();
          ctx.fillStyle = '#2a2622'; ctx.fillRect(x0, 164, 150 + random() * 60, 16);
          ctx.fillStyle = '#8a8478';
          for (let r = 0; r < 12; r++) for (const col of [0, 1]) ctx.fillRect(x0 + col * 112, 196 + r * 12, 80 + random() * 22, 4);
        }
      });
      const mag = s.mesh(new THREE.BoxGeometry(0.46, 0.006, 0.32), [0, 1, 2, 3, 4, 5].map((i) => new THREE.MeshStandardMaterial(i === 2 ? { map: page, roughness: 0.6 } : { color: '#e8e2d4', roughness: 0.8 })) as unknown as THREE.Material, [0, 0.003, 0]);
      mag.rotation.y = rr(-0.12, 0.12);
      floorY = 0.006;
    }

    // ---- The drift of crumpled tissues ----
    const stains = [new THREE.Color(lip), new THREE.Color('#d9a982'), new THREE.Color('#1b171c'), new THREE.Color().setHSL(random(), 0.6, 0.55)];
    const paper = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
    const count = Math.max(1, Math.round(mix(1, 20, a.pile) + mood.density * 4 - 1));
    const centre: V3 = [-0.07, floorY, -0.01];
    const placed: { x: number; z: number; r: number; top: number }[] = [];
    let pileTop = floorY;
    for (let i = 0; i < count; i++) {
      const r = rr(0.036, 0.058);
      const spread = Math.min(0.14, 0.022 * Math.sqrt(i) * 1.6);
      const ang = random() * TAU, d = Math.sqrt(random()) * spread;
      const x = centre[0] + Math.sin(ang) * d * 1.25, z = centre[2] + Math.cos(ang) * d * 0.8;
      let y = floorY;
      for (const p of placed) if (Math.hypot(p.x - x, p.z - z) < (p.r + r) * 0.8) y = Math.max(y, p.top - r * 0.55);
      const geo = new THREE.IcosahedronGeometry(r, 2);
      const pos = geo.getAttribute('position');
      const f1 = rr(34, 70), f2 = rr(34, 70), f3 = rr(34, 70), o = random() * 10;
      const colours = new Float32Array(pos.count * 3);
      const dirs = stains.map(() => new THREE.Vector3(rr(-1, 1), rr(0.1, 1), rr(-0.2, 1)).normalize());
      const strength = stains.map((_c, k) => (random() < (k === 0 ? 0.75 : 0.25 + mood.wear * 0.3) ? rr(0.55, 0.95) : 0));
      const v = new THREE.Vector3();
      for (let k = 0; k < pos.count; k++) {
        v.fromBufferAttribute(pos, k);
        const n = v.clone().normalize();
        const bump = 1 + 0.24 * Math.sin(v.x * f1 + o) * Math.sin(v.y * f2 + o * 2) + 0.18 * Math.sin(v.z * f3 + v.x * f2 * 0.6 + o * 3) + 0.08 * Math.sin(v.x * f3 * 2.3 + v.y * f1 * 1.9 + o);
        v.multiplyScalar(bump);
        v.y = v.y * 0.7;
        pos.setXYZ(k, v.x, v.y, v.z);
        const c = new THREE.Color('#f7f5f0');
        c.multiplyScalar(mix(0.9, 1, (bump - 0.7) / 0.6));
        dirs.forEach((dir, j) => { const hit = n.dot(dir); if (strength[j] && hit > 0.72) c.lerp(stains[j], Math.min(1, (hit - 0.72) * 9) * strength[j]); });
        colours.set([c.r, c.g, c.b], k * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      geo.computeVertexNormals();
      const tissue = s.mesh(geo, paper, [x, y + r * 0.6, z]);
      tissue.rotation.y = random() * TAU;
      placed.push({ x, z, r, top: y + r * 1.2 });
      if (Math.hypot(x - centre[0], z - centre[2]) < 0.06) pileTop = Math.max(pileTop, y + r * 1.15);
    }

    // ---- The wipe that took the face ----
    const big = a.face === 'mask' || a.face === 'half';
    const ww = big ? 0.3 : 0.2, wh = big ? 0.25 : 0.17;
    const print = paint(640, Math.round(640 * wh / ww), (ctx) => {
      const W = 640, H = Math.round(640 * wh / ww);
      ctx.fillStyle = '#f8f6f1'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(190,196,204,0.35)';
      for (let y = 8; y < H; y += 18) for (let x = 8 + ((y / 18) % 2) * 9; x < W; x += 18) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); }
      const blot = (x: number, y: number, rx: number, ry: number, colour: string, alpha: number, n = 26) => {
        ctx.fillStyle = colour;
        for (let i = 0; i < n; i++) {
          ctx.globalAlpha = alpha * rr(0.25, 0.7);
          ctx.beginPath(); ctx.ellipse(x + rr(-rx, rx) * 0.6, y + rr(-ry, ry) * 0.6, rx * rr(0.25, 0.6), ry * rr(0.25, 0.6), random() * 3, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      };
      const lips = (x: number, y: number, k: number, alpha = 0.92) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rr(-0.12, 0.12)); ctx.scale(k, k);
        ctx.fillStyle = lip; ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.moveTo(-70, 0); ctx.bezierCurveTo(-40, -50, -12, -42, 0, -28); ctx.bezierCurveTo(12, -42, 40, -50, 70, 0); ctx.bezierCurveTo(30, -8, -30, -8, -70, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-70, 4); ctx.bezierCurveTo(-36, 56, 36, 56, 70, 4); ctx.bezierCurveTo(30, 12, -30, 12, -70, 4); ctx.fill();
        ctx.globalAlpha = 0.6; ctx.strokeStyle = '#f8f6f1'; ctx.lineWidth = 1.6;
        for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(i * 9.5, -36); ctx.lineTo(i * 10.5, 42); ctx.stroke(); }
        ctx.restore(); ctx.globalAlpha = 1;
      };
      const shadow = `hsl(${Math.floor(random() * 360)} 70% 52%)`;
      const eye = (x: number, y: number, side: number, k: number) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(side * k, k);
        blot(8, -22, 52, 26, shadow, 0.55, 18);
        ctx.fillStyle = '#17131a'; ctx.globalAlpha = 0.88;
        ctx.beginPath(); ctx.moveTo(-46, 4); ctx.quadraticCurveTo(-6, -26, 44, -8); ctx.lineTo(82, -34); ctx.quadraticCurveTo(52, 6, 30, 8); ctx.quadraticCurveTo(-8, 0, -46, 4); ctx.fill();
        ctx.strokeStyle = '#17131a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let i = 0; i < 12; i++) { const t = i / 11, lx = -40 + t * 84; ctx.beginPath(); ctx.moveTo(lx, -8 - Math.sin(t * 3) * 8); ctx.lineTo(lx + 8 + t * 22, -34 - Math.sin(t * 3) * 22 - t * 12); ctx.stroke(); }
        ctx.lineWidth = 9; ctx.globalAlpha = 0.75; ctx.strokeStyle = '#3a2a22';
        ctx.beginPath(); ctx.moveTo(-50, -62); ctx.quadraticCurveTo(10, -104, 76, -70); ctx.stroke();
        if (a.night === 'heartbreak') {
          ctx.globalAlpha = 0.7; ctx.lineWidth = 5; ctx.strokeStyle = '#17131a';
          for (let i = 0; i < 3; i++) { const tx = rr(-30, 30); ctx.beginPath(); ctx.moveTo(tx, 8); ctx.bezierCurveTo(tx + rr(-8, 8), 50, tx + rr(-12, 12), 90, tx + rr(-10, 10), rr(110, 190)); ctx.stroke(); }
        }
        ctx.restore(); ctx.globalAlpha = 1;
      };
      if (a.face === 'kiss') lips(W / 2 + rr(-30, 30), H / 2 + rr(-20, 20), 1.9);
      else if (a.face === 'half') {
        blot(W * 0.45, H * 0.5, W * 0.3, H * 0.36, '#d9a982', 0.5, 40);
        eye(W * 0.36, H * 0.36, -1, 1.25);
        lips(W * 0.56, H * 0.74, 1.25);
      } else if (a.face === 'mask') {
        blot(W / 2, H / 2, W * 0.34, H * 0.42, '#d9a982', 0.55, 70);
        for (const side of [-1, 1]) {
          blot(W / 2 + side * W * 0.24, H * 0.56, 30, 60, '#8a5a3c', 0.4, 10);
          blot(W / 2 + side * W * 0.19, H * 0.52, 34, 26, '#f0708a', 0.4, 10);
          eye(W / 2 + side * W * 0.15, H * 0.34, side, 0.95);
        }
        blot(W / 2, H * 0.5, 10, 50, '#fbe9d2', 0.5, 8);
        lips(W / 2, H * 0.77, 0.95);
      } else {
        ctx.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          ctx.strokeStyle = [lip, lip, '#17131a', '#d9a982', shadow][Math.floor(random() * 5)];
          ctx.globalAlpha = rr(0.35, 0.85); ctx.lineWidth = rr(14, 46);
          const x = rr(60, W - 60), y = rr(60, H - 60), ang = rr(-0.5, 0.5), len = rr(120, 320);
          ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * len / 2, y - Math.sin(ang) * len / 2);
          ctx.quadraticCurveTo(x + rr(-30, 30), y + rr(-50, 50), x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      if (a.night === 'triumph') {
        for (let i = 0; i < 160; i++) { ctx.fillStyle = random() < 0.6 ? '#e8b93a' : '#f6e7a8'; ctx.globalAlpha = rr(0.6, 1); ctx.fillRect(rr(0, W), rr(0, H), rr(2, 5), rr(2, 5)); }
        ctx.globalAlpha = 1;
      }
    });
    const wipeGeo = new THREE.PlaneGeometry(ww, wh, 20, 16);
    {
      const pos = wipeGeo.getAttribute('position');
      const p1 = random() * 6, p2 = random() * 6;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        const edge = Math.max(Math.abs(x) / (ww / 2), Math.abs(y) / (wh / 2));
        const sag = -Math.pow(edge, 2.2) * (count > 2 ? 0.05 : 0.004);
        pos.setZ(i, sag + Math.sin(x * 55 + p1) * 0.004 + Math.sin(y * 70 + p2) * 0.003 + Math.sin((x + y) * 120) * 0.0015);
      }
      wipeGeo.computeVertexNormals();
    }
    const wipe = s.mesh(wipeGeo, new THREE.MeshStandardMaterial({ map: print, roughness: 0.9, side: THREE.DoubleSide }));
    const wipeY = count > 2 ? pileTop - 0.014 : floorY + 0.008;
    const wipeAt: V3 = count > 2 ? [centre[0], wipeY, centre[2] + 0.015] : [centre[0] + 0.02, wipeY, centre[2] + 0.07];
    wipe.position.set(...wipeAt);
    const baseTilt = -Math.PI / 2 + (count > 2 ? 0.42 : 0.02);
    wipe.rotation.set(baseTilt, 0, rr(-0.2, 0.2), 'YXZ');

    // ---- The cold drink ----
    const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, roughness: 0.04, depthWrite: false, side: THREE.DoubleSide });
    const rimGlass = s.material('#dfe9ee', { roughness: 0.1, metalness: 0.2 });
    const dx = 0.17, dz = -0.07;
    const drink = new THREE.Group();
    drink.position.set(dx, floorY, dz);
    s.root.add(drink);
    const add = <T extends THREE.Object3D>(node: T) => { drink.add(node); return node; };
    const level = rr(0.35, 0.9);
    let rimY = 0.12, rimR = 0.035;
    if (a.drink === 'martini' || a.drink === 'champagne') {
      const flute = a.drink === 'champagne';
      rimY = flute ? 0.2 : 0.14; rimR = flute ? 0.026 : 0.052;
      const bowlH = flute ? 0.11 : 0.045;
      add(s.cylinder(0.034, 0.036, 0.004, [0, 0.002, 0], rimGlass, 24));
      add(s.cylinder(0.004, 0.004, rimY - bowlH, [0, (rimY - bowlH) / 2, 0], rimGlass, 8));
      const profile: [number, number][] = flute ? [[0.004, 0], [0.02, 0.03], [0.026, 0.07], [rimR, bowlH]] : [[0.004, 0], [0.03, 0.012], [0.046, 0.03], [rimR, bowlH]];
      add(s.lathe(profile, glass, [0, rimY - bowlH, 0]));
      const lr = flute ? 0.023 : 0.044, ly = rimY - bowlH + bowlH * mix(0.45, 0.85, level);
      add(s.cylinder(lr, flute ? 0.008 : 0.012, ly - (rimY - bowlH) - 0.004, [0, (ly + rimY - bowlH) / 2 + 0.002, 0], s.material(flute ? '#e9c873' : '#e4e8d6', { roughness: 0.15, transparent: true, opacity: 0.85 }), 20));
      if (!flute) { add(s.rod([-0.03, ly - 0.012, 0], [0.045, rimY + 0.02, 0.01], 0.0015, s.material('#c9a13c', { metalness: 0.8 }))); add(s.ball([0.01, 0.012, 0.01], [-0.012, ly - 0.002, 0.002], s.material('#7d8b34'), 10)); }
    } else if (a.drink === 'tea') {
      rimY = 0.095; rimR = 0.04;
      const mugColour = new THREE.Color().setHSL(random(), 0.45, 0.6);
      add(s.lathe([[0.0, 0], [0.036, 0], [0.04, 0.01], [0.04, rimY], [0.036, rimY], [0.036, 0.012], [0, 0.012]], s.material(mugColour, { roughness: 0.35, side: THREE.DoubleSide })));
      const handle = add(s.ring(0.026, 0.006, [0.046, 0.05, 0], s.material(mugColour, { roughness: 0.35 }), Math.PI)); handle.rotation.z = -Math.PI / 2;
      add(s.cylinder(0.0355, 0.0355, 0.004, [0, rimY * mix(0.5, 0.88, level), 0], s.material('#6a3d1e', { roughness: 0.2 }), 20));
      add(s.rod([-0.03, rimY - 0.01, 0.015], [-0.042, rimY + 0.002, 0.02], 0.0008, s.material('#f1ece0')));
      add(s.rod([-0.042, rimY + 0.002, 0.02], [-0.046, 0.03, 0.03], 0.0008, s.material('#f1ece0')));
      add(s.box([0.016, 0.02, 0.001], [-0.046, 0.022, 0.03], s.material('#d8523a')));
    } else if (a.drink === 'bottle') {
      rimY = 0.23; rimR = 0.012;
      add(s.lathe([[0, 0], [0.03, 0], [0.031, 0.01], [0.031, 0.13], [0.022, 0.16], [0.013, 0.19], [0.013, 0.225], [0.015, 0.23]], s.material('#5a3a17', { roughness: 0.15, metalness: 0.1 })));
      const label = paint(256, 128, (ctx) => {
        ctx.fillStyle = '#efe6cf'; ctx.fillRect(0, 0, 256, 128);
        ctx.fillStyle = '#b3202a'; ctx.beginPath(); ctx.ellipse(128, 64, 90, 44, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#efe6cf'; ctx.font = 'bold 44px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('LAGER', 128, 66);
      });
      add(s.mesh(new THREE.CylinderGeometry(0.0315, 0.0315, 0.06, 20, 1, true, -0.9 + rr(0, 0.5), 1.9 - mood.wear), new THREE.MeshStandardMaterial({ map: label, roughness: 0.8 }), [0, 0.075, 0]));
      for (let i = 0; i < 4; i++) add(s.box([0.012, 0.0006, 0.007], [rr(-0.06, 0.02), 0.0005, rr(0.04, 0.07)], s.material('#efe6cf'))).rotation.y = random() * 3;
    } else {
      const cup = a.drink === 'cup';
      rimY = cup ? 0.11 : 0.15; rimR = cup ? 0.04 : 0.033;
      const bottom = cup ? 0.028 : 0.03;
      add(s.mesh(new THREE.CylinderGeometry(rimR, bottom, rimY, 24, 1, true), glass, [0, rimY / 2, 0]));
      add(s.cylinder(bottom, bottom, 0.006, [0, 0.003, 0], rimGlass, 24));
      const lh = rimY * mix(0.35, 0.8, level);
      add(s.cylinder(mix(bottom, rimR, lh / rimY) - 0.002, bottom - 0.002, lh, [0, 0.006 + lh / 2, 0], s.material(cup ? '#dbe9ea' : '#3a1c12', { roughness: 0.15, transparent: true, opacity: cup ? 0.7 : 0.92 }), 20));
      for (let i = 0; i < 2; i++) add(s.box([0.018, 0.012, 0.018], [rr(-0.01, 0.01), 0.006 + lh - 0.003, rr(-0.01, 0.01)], s.material('#eef6f8', { roughness: 0.1 }))).rotation.y = random() * 3;
      const straw = s.material(cup ? '#e23a4f' : '#f4f4f4', { roughness: 0.5 });
      add(s.rod([-0.012, 0.01, 0.005], [0.02, rimY + 0.03, -0.006], 0.003, straw));
      add(s.rod([0.02, rimY + 0.03, -0.006], [0.045, rimY + 0.036, -0.01], 0.003, straw));
      if (cup) { const lime = add(s.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 14, 1, false, 0, Math.PI), s.material('#8cc63f'), [-rimR + 0.004, rimY, 0.012])); lime.rotation.set(0.3, 0.4, Math.PI / 2); }
    }
    add(s.ring(rimR, 0.0018, [0, rimY, 0], rimGlass)).rotation.x = Math.PI / 2;
    // The lipstick left on the rim, facing the viewer.
    const kiss = add(s.ball([0.012, 0.007, 0.004], [Math.sin(0.5) * rimR, rimY - 0.004, Math.cos(0.5) * rimR], s.material(lip, { roughness: 0.4 }), 10));
    kiss.rotation.y = 0.5;
    // Condensation ring.
    add(s.cylinder(0.055, 0.055, 0.0012, [0.004, 0.0006, 0.006], new THREE.MeshStandardMaterial({ color: '#cfe0e6', roughness: 0.05, transparent: true, opacity: 0.4, depthWrite: false }), 24));
    drink.rotation.y = rr(-0.5, 0.5);

    // ---- Peeled-off extras ----
    const lash = (x: number, z: number, turn: number) => {
      const dark = s.material('#111014', { roughness: 0.5 });
      const g = new THREE.Group();
      const n = 20, R = 0.045, arc = 1.5, ms: THREE.Matrix4[] = [];
      const band: V3[] = [];
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), ang = (t - 0.5) * arc;
        const p = new THREE.Vector3(Math.sin(ang) * R, 0.002, -Math.cos(ang) * R + R);
        if (i % 3 === 0) band.push([p.x, p.y, p.z]);
        const len = mix(0.012, 0.03, Math.sin(t * Math.PI * 0.8 + 0.2)) * rr(0.85, 1.15);
        const out = new THREE.Vector3(Math.sin(ang) * 0.9 + t * 0.4, 0.5, -Math.cos(ang) - 0.2).normalize();
        ms.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), out), new THREE.Vector3(1, len, 1)));
      }
      const hair = new THREE.ConeGeometry(0.0011, 1, 5); hair.translate(0, 0.5, 0);
      const mesh = new THREE.InstancedMesh(hair, dark, ms.length);
      ms.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = true;
      g.add(mesh);
      band.push([Math.sin(arc / 2) * R, 0.002, -Math.cos(arc / 2) * R + R]);
      const tube = s.tube(band, 0.0016, dark); g.add(tube);
      g.position.set(x, floorY, z); g.rotation.y = turn;
      s.root.add(g);
    };
    if (a.peeled === 'lash' || a.peeled === 'both') {
      lash(0.02, 0.11, rr(-0.5, 0.5) + Math.PI);
      if (a.peeled === 'both') lash(0.09, 0.09, rr(2.2, 3.6));
    }
    if (a.peeled === 'nails' || a.peeled === 'both') {
      const nail = new THREE.SphereGeometry(1, 10, 6, 0, TAU, 0, Math.PI / 2);
      const ms: THREE.Matrix4[] = [];
      const n = a.peeled === 'both' ? 10 : 4 + Math.floor(random() * 5);
      for (let i = 0; i < n; i++) {
        const row = a.peeled === 'both' && random() < 0.6;
        const x = row ? 0.03 + i * 0.016 : rr(-0.2, 0.2), z = row ? 0.135 + rr(-0.004, 0.004) : rr(0.07, 0.14);
        ms.push(new THREE.Matrix4().compose(new THREE.Vector3(x, floorY, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(random() < 0.25 ? Math.PI : 0, row ? rr(-0.2, 0.2) : random() * TAU, 0)), new THREE.Vector3(0.0065, 0.0035, 0.015)));
      }
      inst(nail, s.material(lip, { roughness: 0.15, metalness: 0.1, side: THREE.DoubleSide }), ms);
    }
    if (a.peeled === 'jewels') {
      const gold = s.material('#d6ae45', { metalness: 0.85, roughness: 0.25 });
      for (const [x, z] of [[0.03, 0.11], [0.075, 0.125]] as const) {
        const gem = s.mesh(new THREE.OctahedronGeometry(0.014), s.material(lip, { roughness: 0.05, metalness: 0.4, emissive: lip, emissiveIntensity: 0.3 }), [x, floorY + 0.012, z]);
        gem.rotation.y = random() * 3;
        s.ring(0.016, 0.003, [x, floorY + 0.004, z], gold).rotation.x = Math.PI / 2;
        s.ball([0.007, 0.007, 0.007], [x, floorY + 0.007, z - 0.02], s.material('#f6f0e2', { roughness: 0.2 }), 8);
      }
      const gems: { at: V3; size: number; color: THREE.Color }[] = [];
      for (let i = 0; i < 9; i++) gems.push({ at: [-0.19 + i * 0.012, floorY + 0.003, 0.125 + Math.sin(i) * 0.004], size: 1, color: new THREE.Color().setHSL(i / 9, 0.8, 0.6) });
      s.box([0.12, 0.0008, 0.016], [-0.142, floorY + 0.0006, 0.126], s.material('#f4f4f0'));
      s.scatter(new THREE.OctahedronGeometry(0.0045), new THREE.MeshStandardMaterial({ roughness: 0.1, metalness: 0.5 }), gems);
    }

    // ---- The mood of the night ----
    if (a.night === 'triumph') {
      const rose = new THREE.Group();
      const petal = s.material('#b3122a', { roughness: 0.6 });
      rose.add(s.ball([0.02, 0.02, 0.022], [0, 0.02, 0], petal, 12));
      for (let i = 0; i < 6; i++) { const p = s.ring(0.014 + i * 0.0015, 0.005, [Math.cos(i * 2.2) * 0.004, 0.02, Math.sin(i * 2.2) * 0.004], petal, Math.PI * 1.3); p.rotation.set(Math.PI / 2 + rr(-0.4, 0.4), 0, i * 1.1); rose.add(p); }
      const green = s.material('#3f6a34');
      rose.add(s.rod([0, 0.018, -0.015], [0.01, 0.006, -0.2], 0.003, green));
      const leaf = s.ball([0.012, 0.002, 0.022], [0.02, 0.01, -0.1], green, 8); leaf.rotation.y = 0.8; rose.add(leaf);
      rose.position.set(-0.15, floorY, 0.13); rose.rotation.y = rr(1.2, 1.9);
      s.root.add(rose);
      const bill = paint(128, 56, (ctx) => { ctx.fillStyle = '#9db88a'; ctx.fillRect(0, 0, 128, 56); ctx.strokeStyle = '#3d5a34'; ctx.lineWidth = 4; ctx.strokeRect(5, 5, 118, 46); ctx.fillStyle = '#3d5a34'; ctx.beginPath(); ctx.ellipse(64, 28, 16, 20, 0, 0, TAU); ctx.fill(); ctx.font = 'bold 22px monospace'; ctx.fillText('5', 12, 26); ctx.fillText('5', 102, 46); });
      for (let i = 0; i < 2 + Math.round(mood.density * 3); i++) {
        const note = s.mesh(new THREE.PlaneGeometry(0.075, 0.033), new THREE.MeshStandardMaterial({ map: bill, roughness: 0.8, side: THREE.DoubleSide }), [0.1 + rr(-0.03, 0.05), floorY + 0.002 + i * 0.0012, 0.07 + rr(-0.02, 0.04)]);
        note.rotation.set(-Math.PI / 2, 0, random() * 3);
      }
      const bits: { at: V3; size: number; color: THREE.Color }[] = [];
      for (let i = 0; i < 70; i++) bits.push({ at: [rr(-0.22, 0.22), floorY + 0.0012, rr(-0.15, 0.15)], size: rr(0.6, 1.4), color: new THREE.Color().setHSL(random() < 0.6 ? 0.12 : random(), 0.8, 0.6) });
      s.scatter(new THREE.BoxGeometry(0.005, 0.0008, 0.005), new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.6 }), bits);
    } else if (a.night === 'heartbreak') {
      const ax = -0.17, az = 0.1;
      s.lathe([[0, 0], [0.042, 0], [0.048, 0.006], [0.05, 0.018], [0.044, 0.018], [0.04, 0.007], [0, 0.007]], s.material('#6a7f8e', { roughness: 0.15, metalness: 0.2, side: THREE.DoubleSide }), [ax, floorY, az]);
      const filter = s.material('#d9a25a'), white = s.material('#f4f1ea');
      for (let i = 0; i < 3 + Math.round(mood.density * 3); i++) {
        const ang = random() * TAU, r = rr(0, 0.022);
        const butt = s.cylinder(0.0035, 0.0035, 0.022, [ax + Math.cos(ang) * r, floorY + 0.012 + i * 0.002, az + Math.sin(ang) * r], i % 2 ? filter : white, 8);
        butt.rotation.set(Math.PI / 2 + rr(-0.5, 0.5), 0, random() * 3);
      }
      const snap = (side: number) => paint(128, 160, (ctx) => {
        ctx.fillStyle = '#f3efe4'; ctx.fillRect(0, 0, 128, 160);
        ctx.fillStyle = '#5d6b7a'; ctx.fillRect(8, 8, 112, 120);
        ctx.fillStyle = side ? '#e7b9a6' : '#c98f6b'; ctx.beginPath(); ctx.arc(side ? 28 : 100, 60, 26, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(side ? 28 : 100, 128, 44, 44, 0, Math.PI, 0); ctx.fill();
      });
      for (const side of [0, 1]) {
        const half = s.mesh(new THREE.PlaneGeometry(0.04, 0.062), new THREE.MeshStandardMaterial({ map: snap(side), roughness: 0.6, side: THREE.DoubleSide }), [0.055 + side * 0.058, floorY + 0.002, 0.115 + side * 0.012]);
        half.rotation.set(-Math.PI / 2, 0, side ? -0.5 : 0.25);
      }
    } else if (a.night === 'routine') {
      const jx = -0.16, jz = 0.1;
      s.cylinder(0.034, 0.034, 0.04, [jx, floorY + 0.02, jz], s.material('#f1f4f6', { roughness: 0.25 }), 24);
      const cream = s.ball([0.03, 0.01, 0.03], [jx, floorY + 0.04, jz], s.material('#fffdf6', { roughness: 0.5 }), 14);
      cream.rotation.y = random();
      s.ball([0.012, 0.006, 0.012], [jx + rr(-0.01, 0.01), floorY + 0.042, jz + 0.008], s.material('#e6dccb', { roughness: 0.5 }), 8);
      const lid = s.cylinder(0.037, 0.037, 0.012, [jx + 0.02, floorY + 0.006, jz + 0.07], s.material('#3f6f9e', { roughness: 0.3 }), 24);
      lid.rotation.y = random();
      const stick = s.material('#eef2f4'), tip = s.material('#ffffff', { roughness: 1 });
      for (let i = 0; i < 4; i++) {
        const x = 0.04 + i * 0.014, z = 0.12;
        s.rod([x, floorY + 0.002, z - 0.03], [x + rr(-0.002, 0.002), floorY + 0.002, z + 0.03], 0.0012, stick);
        s.ball([0.003, 0.003, 0.006], [x, floorY + 0.003, z - 0.03], i < 2 ? s.material(i ? lip : '#1b171c') : tip, 8);
        s.ball([0.003, 0.003, 0.006], [x, floorY + 0.003, z + 0.03], tip, 8);
      }
    } else {
      const note = paint(256, 180, (ctx) => {
        ctx.fillStyle = '#f6efd9'; ctx.fillRect(0, 0, 256, 180);
        ctx.fillStyle = lip; ctx.font = 'italic bold 44px Georgia, serif'; ctx.textAlign = 'center';
        ctx.fillText('THANK', 128, 66); ctx.fillText('YOU x', 128, 120);
        ctx.strokeStyle = lip; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(60, 146); ctx.quadraticCurveTo(128, 160, 200, 140); ctx.stroke();
      });
      const card = s.mesh(new THREE.PlaneGeometry(0.11, 0.077), new THREE.MeshStandardMaterial({ map: note, roughness: 0.8, side: THREE.DoubleSide }), [0.07, floorY + 0.002, 0.105]);
      card.rotation.set(-Math.PI / 2, 0, rr(-0.3, 0.1));
      const brass = s.material('#b8923a', { metalness: 0.85, roughness: 0.3 });
      const kx = -0.17, kz = 0.11;
      s.ring(0.012, 0.0035, [kx, floorY + 0.004, kz], brass).rotation.x = Math.PI / 2;
      s.rod([kx + 0.012, floorY + 0.004, kz], [kx + 0.06, floorY + 0.004, kz + 0.006], 0.003, brass);
      s.box([0.004, 0.003, 0.01], [kx + 0.05, floorY + 0.004, kz + 0.011], brass);
      s.box([0.004, 0.003, 0.007], [kx + 0.057, floorY + 0.004, kz + 0.01], brass);
      const tag = s.cylinder(0.014, 0.014, 0.002, [kx - 0.03, floorY + 0.002, kz + 0.012], s.material('#c23a3a'), 16);
      tag.castShadow = false;
      s.rod([kx - 0.012, floorY + 0.004, kz], [kx - 0.02, floorY + 0.003, kz + 0.008], 0.0008, brass);
    }

    const flutter = mix(0.004, 0.03, mood.energy);
    return s.finish({
      update: (_dt, time) => { wipe.rotation.x = baseTilt + Math.sin(time * 1.3) * flutter; },
    });
  },
});
// rev 2
// rev 3
