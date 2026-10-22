import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

export default defineThing({
  questions: {
    steps: choice('How many steps does the chest climb?', {
      three: 'Three broad steps, a low chest under a window.',
      four: 'Four steps, head high at the tall end.',
      five: 'Five narrow steps, a real staircase to a loft.',
    }),
    wood: choice('What wood is it?', {
      keyaki: 'Red-brown zelkova with a strong dark grain, rubbed to a glow.',
      kiri: 'Pale silvery paulownia, light and soft.',
      black: 'Black-stained cedar with the grain showing through.',
      pine: 'Honey-yellow pine, a farmhouse piece.',
    }),
    metal: choice('What are the fittings?', {
      iron: 'Hand-forged black iron handles and corner plates.',
      brass: 'Polished brass, brighter and more citified.',
    }),
    rise: choice('Which way does it climb?', {
      right: 'Low on the left, rising to the right.',
      left: 'Low on the right, rising to the left.',
    }),
    display: choice('What sits on the steps?', {
      keepsakes: 'Family keepsakes: a red daruma, a wooden clock, a doll in a glass case, kokeshi and a beckoning cat.',
      tea: 'Tea things: a teapot on a tray, a vase with a flowering branch, stacked bowls and a caddy.',
      newyear: 'New Year decorations: stacked rice cakes, pine and bamboo, a sake flask and cups.',
      study: 'A black dial telephone, a radio, piles of books and a framed photograph.',
      plants: 'Plants: a bonsai, trailing ivy and a branch in a vase.',
      bare: 'Nothing: bare dusted steps and one folded cloth.',
    }),
    drawer: choice('One drawer has been left ajar. What shows?', {
      shut: 'None: every drawer is pushed home.',
      kimono: 'Folded silk, one bright sleeve spilling over the edge.',
      letters: 'Bundles of old letters tied with string, and a few photographs.',
      sewing: 'Spools of thread, a pincushion and scissors.',
      empty: 'Nothing at all: it has been cleared out.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = { three: 3, four: 4, five: 5 }[a.steps];
    const cw = n === 3 ? 0.52 : n === 4 ? 0.46 : 0.4;
    const rise = n === 3 ? 0.44 : n === 4 ? 0.42 : 0.37;
    const D = 0.42, dir = a.rise === 'right' ? 1 : -1;
    const tone = { keyaki: '#6b3420', kiri: '#cdbf9f', black: '#2a2420', pine: '#c8964a' }[a.wood];
    const grainInk = { keyaki: '30,10,4', kiri: '120,104,78', black: '0,0,0', pine: '110,60,14' }[a.wood];
    const grain = (vertical: boolean) => {
      const map = paint(256, 128, (c, w, h) => {
        c.fillStyle = tone; c.fillRect(0, 0, w, h);
        for (let k = 0; k < 34; k++) {
          c.strokeStyle = `rgba(${grainInk},${0.1 + random() * 0.3})`; c.lineWidth = 0.6 + random() * 2;
          const y0 = random() * h, bend = (random() - 0.5) * 34;
          c.beginPath();
          if (vertical) { c.moveTo(y0 * 2, 0); c.bezierCurveTo(y0 * 2 + bend, h * 0.3, y0 * 2 - bend, h * 0.7, y0 * 2 + bend * 0.4, h); }
          else { c.moveTo(0, y0); c.bezierCurveTo(w * 0.3, y0 + bend, w * 0.7, y0 - bend, w, y0 + bend * 0.4); }
          c.stroke();
        }
        if (mood.wear > 0.3) for (let k = 0; k < mood.wear * 40; k++) { c.strokeStyle = `rgba(230,215,190,${random() * 0.3})`; c.lineWidth = 1; const x = random() * w, y = random() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 40, y + (random() - 0.5) * 12); c.stroke(); }
      });
      return new THREE.MeshStandardMaterial({ map, roughness: mix(0.42, 0.85, mood.wear) });
    };
    const fronts = [grain(false), grain(false), grain(true)];
    const carcass = s.material(new THREE.Color(tone).offsetHSL(0, 0, -0.07), { roughness: 0.6 });
    const metal = a.metal === 'iron' ? s.material('#1c1b1a', { roughness: 0.6, metalness: 0.5 }) : s.material('#c9a03a', { roughness: 0.3, metalness: 0.85 });
    const shadow = s.material('#120e0b', { roughness: 1 });

    // --- Carcass: one column per step ------------------------------------------------------------
    type Front = { x: number; y: number; w: number; h: number; door: boolean };
    const drawers: Front[] = [];
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * cw * dir, h = (i + 1) * rise;
      s.box([cw, h - 0.03, D], [x, 0.03 + (h - 0.03) / 2, 0], carcass);
      s.box([cw - 0.06, 0.03, D - 0.04], [x, 0.015, 0], shadow);
      s.box([cw + 0.012, 0.022, D + 0.02], [x, h - 0.011, 0.004], fronts[2]);
      for (let m = 0; m <= i; m++) {
        const y0 = 0.045 + m * rise * ((h - 0.07) / h), mh = rise * ((h - 0.07) / h);
        const pick = random();
        const style = m === 0 && i > 0 && pick < 0.6 ? 'door' : pick < 0.35 ? 'one' : pick < 0.7 ? 'two' : 'pair';
        if (style === 'door') drawers.push({ x, y: y0 + mh / 2, w: cw - 0.04, h: mh - 0.02, door: true });
        else if (style === 'one') drawers.push({ x, y: y0 + mh / 2, w: cw - 0.04, h: mh - 0.02, door: false });
        else if (style === 'two') for (const half of [0.25, 0.75]) drawers.push({ x, y: y0 + mh * half, w: cw - 0.04, h: mh / 2 - 0.016, door: false });
        else {
          drawers.push({ x, y: y0 + mh * 0.3, w: cw - 0.04, h: mh * 0.6 - 0.016, door: false });
          for (const side of [-1, 1]) drawers.push({ x: x + side * (cw - 0.04) / 4, y: y0 + mh * 0.8, w: (cw - 0.04) / 2 - 0.012, h: mh * 0.4 - 0.016, door: false });
        }
      }
      // Corner plates on the leading edges of each step.
      for (const side of [-1, 1]) for (const y of [0.06, h - 0.045]) s.box([0.03, 0.05, 0.006], [x + side * (cw / 2 - 0.016), y, D / 2 + 0.002], metal);
    }
    const candidates = drawers.filter((front) => !front.door && front.y > 0.25 && front.y < 1.25 && front.w > 0.25);
    const ajar = a.drawer === 'shut' || !candidates.length ? null : candidates[Math.floor(random() * candidates.length)];
    const missing = mood.wear > 0.6 ? drawers[Math.floor(random() * drawers.length)] : null;
    drawers.forEach((front, index) => {
      const pull = front === ajar ? mix(0.14, 0.24, random()) : 0;
      const z = D / 2 + 0.006 + pull;
      const face = fronts[front.door ? 2 : index % 2];
      if (front.door) {
        for (const side of [-1, 1]) {
          s.mesh(new THREE.BoxGeometry(front.w / 2 - 0.004, front.h, 0.012), face, [front.x + side * front.w / 4, front.y, z + (side > 0 ? 0 : -0.008)]);
          s.cylinder(0.015, 0.015, 0.004, [front.x + side * 0.03, front.y, z + 0.007 + (side > 0 ? 0 : -0.008)], metal, 12).rotation.x = Math.PI / 2;
        }
        return;
      }
      s.mesh(new THREE.BoxGeometry(front.w, front.h, 0.014), face, [front.x, front.y, z]);
      if (front !== missing) {
        const wide = front.w > 0.25;
        for (const hx of wide ? [-front.w * 0.27, front.w * 0.27] : [0]) {
          const handle = s.ring(wide ? 0.032 : 0.024, 0.0045, [front.x + hx, front.y + 0.012, z + 0.012], metal, Math.PI);
          handle.rotation.set(0.25, 0, Math.PI);
          for (const side of [-1, 1]) s.box([0.012, 0.016, 0.006], [front.x + hx + side * (wide ? 0.032 : 0.024), front.y + 0.014, z + 0.008], metal);
        }
        if (wide) s.cylinder(0.02, 0.02, 0.004, [front.x, front.y + 0.008, z + 0.008], metal, 14).rotation.x = Math.PI / 2;
      }
      if (pull) {
        // The drawer box itself and whatever is inside it.
        const depth = pull + 0.1, zc = z - depth / 2, top = front.y + front.h / 2;
        s.box([front.w - 0.02, 0.008, depth], [front.x, front.y - front.h / 2 + 0.006, zc], carcass);
        for (const side of [-1, 1]) s.box([0.01, front.h - 0.02, depth], [front.x + side * (front.w / 2 - 0.012), front.y - 0.008, zc], carcass);
        s.box([front.w - 0.03, front.h - 0.03, 0.004], [front.x, front.y, z - pull - 0.004], shadow);
        const inside = front.w - 0.05;
        if (a.drawer === 'kimono') {
          const silks = ['#b0242c', '#2f4a7a', '#c96f8c', '#5a8a6a', '#e6c25a', '#6a4a8a'];
          for (let k = 0; k < 3; k++) s.box([inside * (0.95 - k * 0.05), 0.022, pull - 0.03], [front.x, top - 0.07 + k * 0.024, z - pull / 2 - 0.01], s.material(silks[Math.floor(random() * silks.length)], { roughness: 0.6 }));
          const sleeve = s.material(silks[Math.floor(random() * 3)], { roughness: 0.55 });
          const sx = front.x + (random() - 0.5) * inside * 0.5;
          s.box([inside * 0.36, 0.012, 0.08], [sx, top - 0.004, z - 0.03], sleeve);
          s.box([inside * 0.36, mix(0.12, 0.22, random()), 0.012], [sx, top - 0.09, z + 0.014], sleeve).rotation.z = (random() - 0.5) * 0.2;
        } else if (a.drawer === 'letters') {
          for (let k = 0; k < 4; k++) {
            const lx = front.x - inside / 2 + 0.06 + k * (inside - 0.1) / 3.2;
            s.box([0.09, 0.03 + random() * 0.03, 0.14], [lx, top - 0.05, z - pull / 2 - 0.01], s.material(['#efe6cc', '#e3d6b4', '#f4efe2', '#d9c9a0'][k], { roughness: 0.9 })).rotation.y = (random() - 0.5) * 0.4;
            s.box([0.094, 0.004, 0.006], [lx, top - 0.02, z - pull / 2 - 0.01], s.material('#b0242c'));
          }
          s.box([0.07, 0.003, 0.09], [front.x + inside * 0.2, top + 0.002, z - 0.02], s.material('#b8a888')).rotation.set(0.5, 0.3, 0);
        } else if (a.drawer === 'sewing') {
          const threads = ['#c0282c', '#2f4a7a', '#e6c25a', '#f3f1ea', '#5a8a6a', '#1a1818', '#c96f8c'];
          for (let k = 0; k < 7; k++) s.cylinder(0.014, 0.014, 0.03, [front.x - inside / 2 + 0.04 + k * (inside - 0.08) / 6, top - 0.03, z - pull / 2 - 0.02 + (k % 2) * 0.04], s.material(threads[k], { roughness: 0.8 }), 10);
          s.ball([0.03, 0.022, 0.03], [front.x + inside * 0.25, top - 0.01, z - 0.045], s.material('#c0282c', { roughness: 1 }), 10);
          s.rod([front.x - inside * 0.3, top + 0.002, z - 0.06], [front.x - inside * 0.05, top + 0.002, z - 0.012], 0.004, s.material('#b9bcb8', { metalness: 0.8, roughness: 0.3 }));
        }
      }
    });

    // --- Things displayed on the steps --------------------------------------------------------
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dff0f4', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false });
    const white = s.material('#f4f1e8', { roughness: 0.5 });
    const black = s.material('#1a1818', { roughness: 0.4 });
    const red = s.material('#c0282c', { roughness: 0.5 });
    const gold = s.material('#d9a93a', { metalness: 0.7, roughness: 0.35 });
    const green = s.material('#3f6a2f', { roughness: 0.8 });
    const brown = s.material('#5a3a22', { roughness: 0.7 });
    type Maker = (x: number, y: number, z: number) => void;
    const makers: Record<string, Maker> = {
      daruma: (x, y, z) => {
        s.lathe([[0, 0], [0.06, 0.004], [0.085, 0.05], [0.082, 0.1], [0.062, 0.145], [0.03, 0.165], [0, 0.17]], red, [x, y, z]);
        s.ball([0.052, 0.045, 0.02], [x, y + 0.11, z + 0.066], white, 12);
        const wished = mood.cheer > 0.6;
        for (const side of [-1, 1]) { s.ball([0.014, 0.014, 0.006], [x + side * 0.022, y + 0.118, z + 0.084], s.material('#fbfaf4'), 8); if (side < 0 || wished) s.ball([0.007, 0.007, 0.004], [x + side * 0.022, y + 0.118, z + 0.089], black, 6); }
        s.box([0.03, 0.05, 0.004], [x, y + 0.05, z + 0.084], gold);
      },
      clock: (x, y, z) => {
        s.box([0.2, 0.26, 0.1], [x, y + 0.13, z], brown);
        s.box([0.23, 0.02, 0.12], [x, y + 0.27, z], brown); s.box([0.23, 0.02, 0.12], [x, y + 0.01, z], brown);
        const hour = random() * 6.283, minute = random() * 6.283;
        const face = paint(128, 128, (c, w) => {
          c.fillStyle = '#f1ead2'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill();
          c.strokeStyle = '#2a2018'; c.lineWidth = 4; c.beginPath(); c.arc(64, 64, 58, 0, 7); c.stroke();
          for (let k = 0; k < 12; k++) c.fillRect(64 + Math.cos(k * 0.5236) * 48 - 3, 64 + Math.sin(k * 0.5236) * 48 - 3, 6, 6);
          c.lineCap = 'round'; c.lineWidth = 6; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(hour) * 26, 64 + Math.sin(hour) * 26); c.stroke();
          c.lineWidth = 3; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(minute) * 42, 64 + Math.sin(minute) * 42); c.stroke(); void w;
        });
        s.mesh(new THREE.CircleGeometry(0.075, 24), new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 }), [x, y + 0.165, z + 0.052]);
        s.box([0.07, 0.06, 0.004], [x, y + 0.055, z + 0.051], black);
        s.cylinder(0.018, 0.018, 0.004, [x + (random() - 0.5) * 0.03, y + 0.05, z + 0.054], gold, 12).rotation.x = Math.PI / 2;
      },
      doll: (x, y, z) => {
        s.box([0.2, 0.02, 0.16], [x, y + 0.01, z], black);
        const case_ = s.box([0.185, 0.26, 0.145], [x, y + 0.15, z], glass); case_.castShadow = false;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.box([0.006, 0.26, 0.006], [x + sx * 0.092, y + 0.15, z + sz * 0.072], black);
        s.box([0.2, 0.008, 0.16], [x, y + 0.284, z], black);
        const kimono = s.material(['#b0242c', '#6a4a8a', '#2f6a8a'][Math.floor(random() * 3)], { roughness: 0.6 });
        s.lathe([[0, 0], [0.05, 0], [0.04, 0.05], [0.026, 0.1], [0.03, 0.14], [0, 0.145]], kimono, [x, y + 0.02, z]);
        s.cylinder(0.031, 0.031, 0.026, [x, y + 0.115, z], gold, 12);
        s.ball([0.024, 0.026, 0.024], [x, y + 0.19, z], white, 12);
        s.ball([0.027, 0.02, 0.027], [x, y + 0.203, z - 0.004], black, 12);
        for (const side of [-1, 1]) s.rod([x + side * 0.03, y + 0.15, z], [x + side * 0.052, y + 0.09, z + 0.02], 0.012, kimono);
      },
      kokeshi: (x, y, z) => {
        for (const [dx, scale] of [[-0.04, 1], [0.05, 0.72]] as const) {
          s.cylinder(0.024 * scale, 0.03 * scale, 0.12 * scale, [x + dx, y + 0.06 * scale, z], s.material('#e9d9b4', { roughness: 0.5 }), 14);
          for (const band of [0.03, 0.05, 0.09]) s.cylinder(0.031 * scale - band * 0.05, 0.031 * scale - band * 0.05, 0.008 * scale, [x + dx, y + band * scale, z], red, 14);
          s.ball([0.034 * scale, 0.034 * scale, 0.034 * scale], [x + dx, y + 0.15 * scale, z], s.material('#f1e4c4', { roughness: 0.5 }), 14);
          s.ball([0.035 * scale, 0.02 * scale, 0.035 * scale], [x + dx, y + 0.168 * scale, z - 0.003], black, 12);
        }
      },
      maneki: (x, y, z) => {
        s.ball([0.06, 0.07, 0.055], [x, y + 0.07, z], white, 14);
        s.ball([0.05, 0.045, 0.045], [x, y + 0.16, z], white, 14);
        for (const side of [-1, 1]) { s.mesh(new THREE.ConeGeometry(0.018, 0.03, 4), white, [x + side * 0.03, y + 0.205, z]); s.ball([0.006, 0.008, 0.004], [x + side * 0.018, y + 0.168, z + 0.042], black, 6); }
        s.rod([x + 0.05, y + 0.1, z + 0.01], [x + 0.058, y + 0.215, z + 0.02], 0.016, white, 0.02);
        s.cylinder(0.047, 0.047, 0.012, [x, y + 0.125, z], red, 14);
        s.cylinder(0.03, 0.03, 0.006, [x - 0.02, y + 0.07, z + 0.055], gold, 12).rotation.x = Math.PI / 2;
      },
      teaset: (x, y, z) => {
        s.box([0.3, 0.012, 0.2], [x, y + 0.006, z], black);
        const clay = s.material('#7a3626', { roughness: 0.5 });
        s.ball([0.055, 0.045, 0.055], [x - 0.06, y + 0.055, z], clay, 14);
        s.cylinder(0.022, 0.026, 0.012, [x - 0.06, y + 0.1, z], clay, 12);
        s.rod([x - 0.06, y + 0.06, z + 0.04], [x - 0.06, y + 0.085, z + 0.12], 0.011, clay, 0.013);
        s.rod([x - 0.11, y + 0.06, z], [x - 0.15, y + 0.085, z], 0.012, clay, 0.006);
        for (const dx of [0.05, 0.11]) s.cylinder(0.026, 0.02, 0.045, [x + dx, y + 0.034, z + (dx > 0.08 ? -0.04 : 0.04)], white, 12);
      },
      vase: (x, y, z) => {
        s.lathe([[0, 0], [0.03, 0], [0.055, 0.06], [0.05, 0.12], [0.02, 0.17], [0.026, 0.2]], s.material(['#2f5a7a', '#e9e4d2', '#5a6a4a'][Math.floor(random() * 3)], { roughness: 0.3 }), [x, y, z]);
        const bloom = s.material(random() < 0.5 ? '#d92a4a' : '#f6ece2', { roughness: 0.7 });
        const twig = (from: [number, number, number], ang: number, len: number, depth: number) => {
          const to: [number, number, number] = [from[0] + Math.sin(ang) * len, from[1] + Math.cos(ang) * len, from[2] + (random() - 0.5) * 0.06];
          s.rod(from, to, 0.004 + depth * 0.0015, brown, 0.003);
          s.ball([0.014, 0.014, 0.014], to, bloom, 8);
          if (depth > 0) { twig(to, ang + 0.5 + random() * 0.4, len * 0.7, depth - 1); twig(to, ang - 0.4 - random() * 0.4, len * 0.6, depth - 1); }
        };
        twig([x, y + 0.19, z], (random() - 0.5) * 0.5, 0.14, 2);
      },
      bowls: (x, y, z) => {
        const count = 3 + Math.floor(random() * 3);
        for (let k = 0; k < count; k++) s.lathe([[0, 0.006], [0.03, 0.006], [0.062, 0.04], [0.066, 0.045], [0.03, 0.012], [0, 0.012]], k % 2 ? black : s.material('#8a1c16', { roughness: 0.25 }), [x, y + k * 0.02, z]);
        s.cylinder(0.04, 0.04, 0.09, [x + 0.12, y + 0.045, z + 0.02], s.material('#3a5a3a', { roughness: 0.4 }), 16);
        s.cylinder(0.041, 0.041, 0.02, [x + 0.12, y + 0.095, z + 0.02], black, 16);
      },
      mochi: (x, y, z) => {
        s.box([0.17, 0.07, 0.17], [x, y + 0.035, z], s.material('#d9c08a', { roughness: 0.7 }));
        s.box([0.21, 0.012, 0.21], [x, y + 0.076, z], s.material('#d9c08a', { roughness: 0.7 }));
        s.box([0.14, 0.003, 0.24], [x, y + 0.084, z + 0.02], white);
        s.ball([0.085, 0.036, 0.085], [x, y + 0.118, z], white, 16);
        s.ball([0.062, 0.03, 0.062], [x, y + 0.172, z], white, 16);
        s.ball([0.03, 0.025, 0.03], [x, y + 0.222, z], s.material('#f08a1c', { roughness: 0.5 }), 12);
        s.ball([0.022, 0.002, 0.01], [x + 0.02, y + 0.248, z], green, 6);
      },
      kadomatsu: (x, y, z) => {
        s.cylinder(0.06, 0.065, 0.1, [x, y + 0.05, z], s.material('#c9a45a', { roughness: 0.9 }), 14);
        for (const band of [0.03, 0.07]) s.cylinder(0.068, 0.068, 0.008, [x, y + band, z], brown, 14);
        const cane = s.material('#6a9a3a', { roughness: 0.45 });
        for (const [dx, dz, tall] of [[0, -0.01, 0.34], [-0.03, 0.02, 0.27], [0.03, 0.02, 0.21]] as const) {
          s.cylinder(0.02, 0.02, tall, [x + dx, y + tall / 2, z + dz], cane, 10);
          const cut = s.cylinder(0.019, 0.019, 0.002, [x + dx, y + tall + 0.006, z + dz], s.material('#e9e2b4'), 10); cut.rotation.x = 0.7; cut.scale.z = 1.3;
        }
        for (let k = 0; k < 7; k++) s.mesh(new THREE.ConeGeometry(0.03, 0.09, 6), green, [x + Math.cos(k * 0.9) * 0.05, y + 0.13, z + Math.sin(k * 0.9) * 0.05]);
        s.ball([0.012, 0.012, 0.012], [x + 0.04, y + 0.12, z + 0.055], red, 8);
      },
      sake: (x, y, z) => {
        s.box([0.24, 0.01, 0.16], [x, y + 0.005, z], s.material('#8a1c16', { roughness: 0.25 }));
        s.lathe([[0, 0], [0.03, 0], [0.04, 0.05], [0.034, 0.09], [0.014, 0.12], [0.02, 0.145]], white, [x - 0.05, y + 0.01, z]);
        s.ring(0.036, 0.004, [x - 0.05, y + 0.07, z], s.material('#2f4a7a')).rotation.x = Math.PI / 2;
        for (const dx of [0.03, 0.085]) s.lathe([[0, 0], [0.012, 0], [0.024, 0.022], [0.026, 0.024], [0.01, 0.006], [0, 0.006]], white, [x + dx, y + 0.01, z + (dx > 0.05 ? 0.03 : -0.02)]);
      },
      books: (x, y, z) => {
        const covers = ['#7a2a2a', '#2a4a6a', '#5a6a3a', '#c9b88a', '#3a3a44', '#8a5a2c'];
        const count = 3 + Math.floor(random() * 3);
        for (let k = 0; k < count; k++) s.box([0.2 - random() * 0.04, 0.03, 0.15], [x - 0.03, y + 0.015 + k * 0.03, z], s.material(covers[Math.floor(random() * covers.length)], { roughness: 0.8 })).rotation.y = (random() - 0.5) * 0.3;
        for (let k = 0; k < 3; k++) s.box([0.028, 0.2, 0.14], [x + 0.1 + k * 0.03, y + 0.1, z], s.material(covers[(k * 2) % covers.length], { roughness: 0.8 })).rotation.z = k === 2 ? -0.25 : 0;
      },
      phone: (x, y, z) => {
        const bakelite = s.material('#141414', { roughness: 0.25 });
        s.lathe([[0, 0], [0.085, 0], [0.085, 0.02], [0.06, 0.075], [0.035, 0.085], [0, 0.085]], bakelite, [x, y, z]).rotation.y = Math.PI / 4;
        const dial = s.cylinder(0.042, 0.042, 0.008, [x, y + 0.05, z + 0.058], white, 18); dial.rotation.x = 1.05;
        const hub = s.cylinder(0.016, 0.016, 0.012, [x, y + 0.052, z + 0.06], bakelite, 12); hub.rotation.x = 1.05;
        s.rod([x - 0.085, y + 0.11, z], [x + 0.085, y + 0.11, z], 0.014, bakelite);
        for (const side of [-1, 1]) { s.ball([0.026, 0.02, 0.026], [x + side * 0.085, y + 0.103, z], bakelite, 10); s.rod([x + side * 0.03, y + 0.08, z], [x + side * 0.03, y + 0.1, z], 0.008, bakelite); }
        s.tube([[x - 0.09, y + 0.1, z], [x - 0.13, y + 0.04, z + 0.03], [x - 0.11, y + 0.01, z + 0.08], [x - 0.06, y + 0.008, z + 0.1]], 0.004, bakelite);
      },
      radio: (x, y, z) => {
        s.box([0.28, 0.17, 0.11], [x, y + 0.085, z], brown);
        const grille = paint(128, 64, (c, w, h) => { c.fillStyle = '#c9b88a'; c.fillRect(0, 0, w, h); c.fillStyle = '#6a5a3a'; for (let k = 0; k < 16; k++) c.fillRect(k * 8, 0, 3, h); });
        s.mesh(new THREE.PlaneGeometry(0.15, 0.11), new THREE.MeshStandardMaterial({ map: grille, roughness: 0.9 }), [x - 0.05, y + 0.09, z + 0.056]);
        s.box([0.08, 0.04, 0.004], [x + 0.085, y + 0.115, z + 0.056], s.material('#f1e6b4', { emissive: '#f1c96a', emissiveIntensity: mix(0.1, 0.9, mood.warmth) }));
        for (const dx of [0.065, 0.105]) s.cylinder(0.014, 0.014, 0.014, [x + dx, y + 0.05, z + 0.06], white, 12).rotation.x = Math.PI / 2;
        s.rod([x + 0.12, y + 0.17, z - 0.03], [x + 0.2, y + 0.4, z - 0.03], 0.003, s.material('#cfd3d2', { metalness: 0.8 }));
      },
      frame: (x, y, z) => {
        const picture = paint(96, 128, (c, w, h) => {
          c.fillStyle = '#b89a6a'; c.fillRect(0, 0, w, h);
          c.fillStyle = '#4a3a26'; c.beginPath(); c.ellipse(48, 134, 40, 52, 0, Math.PI, 0); c.fill();
          c.fillStyle = '#e2c9a0'; c.beginPath(); c.ellipse(48, 58, 20, 25, 0, 0, 7); c.fill();
          c.fillStyle = '#2a2018'; c.beginPath(); c.ellipse(48, 44, 22, 16, 0, Math.PI, 0); c.fill();
        });
        const frame = s.box([0.15, 0.2, 0.014], [x, y + 0.098, z], black); frame.rotation.x = -0.2;
        const image = s.mesh(new THREE.PlaneGeometry(0.12, 0.165), new THREE.MeshStandardMaterial({ map: picture, roughness: 0.5 }), [x, y + 0.099, z + 0.0085]); image.rotation.x = -0.2;
        s.cylinder(0.03, 0.036, 0.05, [x + 0.13, y + 0.025, z + 0.02], s.material('#2f5a7a', { roughness: 0.3 }), 12);
        for (let k = 0; k < 3; k++) s.rod([x + 0.13, y + 0.05, z + 0.02], [x + 0.11 + k * 0.02, y + 0.16, z + 0.02], 0.004, s.material(['#e0b22c', '#b0242c', '#2f4a7a'][k]));
      },
      bonsai: (x, y, z) => {
        s.box([0.2, 0.05, 0.13], [x, y + 0.03, z], s.material('#3a4a5a', { roughness: 0.5 }));
        s.box([0.18, 0.01, 0.11], [x, y + 0.056, z], s.material('#4a5a2f', { roughness: 1 }));
        const lean = random() < 0.5 ? -1 : 1;
        s.tube([[x - lean * 0.03, y + 0.05, z], [x, y + 0.13, z + 0.01], [x + lean * 0.06, y + 0.18, z], [x + lean * 0.03, y + 0.27, z - 0.01]], 0.014, brown);
        for (const [dx, dy, size] of [[0.03, 0.29, 0.07], [0.11, 0.2, 0.055], [-0.05, 0.21, 0.05], [0.0, 0.34, 0.045]] as const) s.ball([size, size * 0.42, size * 0.8], [x + lean * dx, y + dy, z], green, 10);
      },
      ivy: (x, y, z) => {
        s.cylinder(0.065, 0.05, 0.1, [x, y + 0.05, z], s.material('#b86a4a', { roughness: 0.9 }), 14);
        const leaf = s.material('#4a8a3a', { roughness: 0.7 });
        s.ball([0.08, 0.05, 0.08], [x, y + 0.12, z], leaf, 10);
        for (let k = 0; k < 4; k++) {
          const dx = (k - 1.5) * 0.045, drop = 0.2 + random() * 0.3;
          s.tube([[x + dx, y + 0.11, z + 0.03], [x + dx * 1.3, y + 0.12, z + D * 0.3], [x + dx * 1.4, y - 0.02, z + D * 0.42], [x + dx * 1.5, y - drop, z + D * 0.43]], 0.003, leaf);
          for (let l = 0; l < 5; l++) s.ball([0.018, 0.004, 0.014], [x + dx * 1.45 + (random() - 0.5) * 0.03, y - drop * (l / 5), z + D * 0.44], leaf, 6).rotation.x = Math.PI / 2 - 0.3;
        }
      },
      cloth: (x, y, z) => {
        s.box([0.24, 0.035, 0.2], [x, y + 0.0175, z], s.material('#2f4a7a', { roughness: 1 })).rotation.y = (random() - 0.5) * 0.4;
        s.box([0.24, 0.006, 0.05], [x, y + 0.038, z], white).rotation.y = (random() - 0.5) * 0.4;
      },
    };
    const themes: Record<string, string[]> = {
      keepsakes: ['daruma', 'clock', 'doll', 'kokeshi', 'maneki'],
      tea: ['teaset', 'vase', 'bowls', 'kokeshi', 'sake'],
      newyear: ['mochi', 'kadomatsu', 'sake', 'daruma', 'maneki'],
      study: ['phone', 'radio', 'books', 'frame', 'clock'],
      plants: ['bonsai', 'ivy', 'vase', 'ivy', 'bonsai'],
      bare: ['cloth'],
    };
    const cast = themes[a.display].slice();
    const shift = Math.floor(random() * cast.length);
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * cw * dir, y = (i + 1) * rise;
      if (a.display === 'bare') { if (i === Math.min(1, n - 1)) makers.cloth(x, y, 0.02); continue; }
      if (mood.density < 0.2 && i % 2 === 1) continue;
      makers[cast[(i + shift) % cast.length]](x + (random() - 0.5) * 0.05, y, (random() - 0.5) * 0.06);
    }
    // Dust on a neglected chest.
    if (mood.wear > 0.7) for (let i = 0; i < n; i++) s.box([cw - 0.02, 0.002, D - 0.02], [(i - (n - 1) / 2) * cw * dir, (i + 1) * rise + 0.001, 0], s.material('#b8b0a0', { roughness: 1, transparent: true, opacity: 0.45, depthWrite: false })).castShadow = false;

    return s.finish();
  },
});
