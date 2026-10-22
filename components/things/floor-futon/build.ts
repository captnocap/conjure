import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(w: number, h: number, draw: Draw, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
  }
  return texture;
}

/** A rounded slab lying on y = 0..t, w wide (x) and l long (z). */
function slab(w: number, l: number, t: number, r: number, bev: number) {
  const x = w / 2 - bev, y = l / 2 - bev, rr = Math.max(r - bev, 0.002);
  const sh = new THREE.Shape();
  sh.moveTo(-x + rr, -y);
  sh.lineTo(x - rr, -y); sh.quadraticCurveTo(x, -y, x, -y + rr);
  sh.lineTo(x, y - rr); sh.quadraticCurveTo(x, y, x - rr, y);
  sh.lineTo(-x + rr, y); sh.quadraticCurveTo(-x, y, -x, y - rr);
  sh.lineTo(-x, -y + rr); sh.quadraticCurveTo(-x, -y, -x + rr, -y);
  const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(t - 2 * bev, 0.001), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bev, 0);
  return g;
}

/** A squashed cushion: a sphere pushed toward a box with pinched seams. */
function pillowGeometry() {
  const g = new THREE.SphereGeometry(1, 28, 18);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = Math.sign(p.getX(i)) * Math.abs(p.getX(i)) ** 0.55;
    const z = Math.sign(p.getZ(i)) * Math.abs(p.getZ(i)) ** 0.55;
    const edge = Math.max(Math.abs(x), Math.abs(z));
    p.setXYZ(i, x, p.getY(i) * (1 - 0.72 * edge ** 3), z);
  }
  g.computeVertexNormals();
  return g;
}

const smooth = (v: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const COVERS = {
  white: 'Plain white cotton gone slightly grey, a starter-pack duvet set.',
  marl: 'Grey marl jersey, soft and anonymous.',
  stripe: 'Navy and white ticking stripes, a grown-up attempt.',
  stars: 'A childhood print of yellow stars and moons on blue, brought from home.',
  floral: 'A faded floral hand-me-down from a parent or grandparent.',
  bare: 'No cover at all: the bare yellowing quilted duvet.',
} as const;

export default defineThing({
  questions: {
    size: choice('What kind of mattress is it?', {
      single: 'A narrow single mattress, room for one and no more.',
      double: 'A double mattress that takes up most of the floor.',
      roll: 'A thin fold-out futon pad barely thicker than a blanket.',
      pallets: 'A double mattress raised a hand-width on wooden shipping pallets.',
    }),
    state: choice('What state is the bed in right now?', {
      made: 'Neatly made, duvet pulled flat and turned down, nobody home.',
      slept: 'Slept-in: the duvet twisted and shoved to one side in a heap.',
      occupied: 'Occupied: a duvet-shaped lump of someone curled on their side, only hair showing.',
      stripped: 'Stripped bare: the duvet dumped on the floor and the stained mattress exposed.',
    }),
    cover: choice('What is the duvet cover like?', COVERS),
    pillow: choice('What is there for a pillow?', {
      one: 'One flat, tired pillow.',
      two: 'Two pillows stacked, one of them borrowed.',
      hoodie: 'No pillow, just a rolled-up hoodie.',
    }),
    phone: choice('What is the phone at the edge of the bed doing?', {
      dark: 'Face down and dark on its charger, deliberately ignored.',
      glow: 'Lit with a lock screen and unread notifications, casting a blue pool.',
      alarm: 'Blazing orange with an alarm going off.',
      none: 'Gone: only the charger cable lies there with nothing plugged in.',
    }),
    beside: choice('What sits on the floor beside it?', {
      water: 'A glass of water and a strip of painkillers.',
      books: 'A stack of paperbacks with a small lamp standing on top.',
      cans: 'Crushed drink cans and a full ashtray.',
      clock: 'A red-digit alarm clock and a mug.',
      nothing: 'Nothing at all, bare floor.',
    }),
    under: choice('What is the mattress lying on?', {
      boards: 'A patch of bare wooden floorboards.',
      rug: 'A worn patterned rug that slides about.',
      cardboard: 'Flattened moving boxes laid down against the cold.',
      none: 'Whatever floor the room has, nothing added.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const narrow = a.size === 'single' || a.size === 'roll';
    const hw = narrow ? 0.46 : 0.7, hl = 0.98;
    const thick = a.size === 'roll' ? 0.075 : 0.2;
    const F = a.under === 'none' ? 0 : a.under === 'boards' ? 0.025 : 0.014;
    const base = F + (a.size === 'pallets' ? 0.14 : 0);
    const top = base + thick;
    const side = random() < 0.5 ? -1 : 1;
    const stripped = a.state === 'stripped';

    // What it lies on.
    if (a.under === 'boards') {
      const planks = paint(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#a8845c'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = `hsl(${28 + random() * 8},${30 + random() * 14}%,${mix(52, 40, mood.wear) + random() * 9}%)`;
          ctx.fillRect(i * 32, 0, 31, h);
          ctx.fillStyle = 'rgba(50,30,15,0.55)';
          ctx.fillRect(i * 32 + 4, Math.floor(random() * h), 24, 2);
        }
      });
      s.box([hw * 2 + 1.3, F, hl * 2 + 0.75], [0, F / 2, 0], new THREE.MeshStandardMaterial({ map: planks, roughness: 0.75 }));
    } else if (a.under === 'rug') {
      const hue = mix(200, 12, mood.warmth);
      const rug = paint(256, 256, (ctx, w, h) => {
        ctx.fillStyle = `hsl(${hue},35%,38%)`; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#e2d3b0'; ctx.lineWidth = 6; ctx.strokeRect(14, 14, w - 28, h - 28);
        ctx.strokeStyle = `hsl(${hue + 150},40%,60%)`; ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.moveTo(48 + i * 40, 28 + j * 40); ctx.lineTo(68 + i * 40, 48 + j * 40); ctx.lineTo(48 + i * 40, 68 + j * 40); ctx.lineTo(28 + i * 40, 48 + j * 40); ctx.closePath(); ctx.stroke(); }
      });
      const m = s.box([hw * 2 + 0.9, F, hl * 2 + 0.5], [side * 0.08, F / 2, 0.05], new THREE.MeshStandardMaterial({ map: rug, roughness: 0.95 }));
      m.rotation.y = (random() - 0.5) * 0.14;
    } else if (a.under === 'cardboard') {
      const card = s.material('#b48a5a', { roughness: 0.9 });
      const tape = s.material('#d9c9a0', { roughness: 0.5 });
      for (const [x, z, r] of [[-0.3, -0.45, 0.06], [0.28, 0.5, -0.09], [0.1, -0.1, 0.02]] as const) {
        const m = s.box([hw * 2 + 0.5, F * (0.5 + random() * 0.5), 1.25], [x, F / 2, z], card);
        m.rotation.y = r + (random() - 0.5) * 0.1;
        const t = s.box([0.06, 0.002, 1.25], [x, F + 0.001, z], tape);
        t.rotation.y = m.rotation.y;
      }
    }

    if (a.size === 'pallets') {
      const wood = s.material('#b79466', { roughness: 0.9 });
      for (const pz of [-hl / 2, hl / 2]) {
        for (const x of [-hw + 0.06, 0, hw - 0.06]) s.box([0.09, 0.09, hl - 0.03], [x, F + 0.045 + 0.02, pz], wood);
        for (let i = 0; i < 5; i++) s.box([hw * 2, 0.022, 0.1], [0, F + 0.129, pz - hl / 2 + 0.07 + i * (hl - 0.14) / 4], wood);
        for (const dz of [-hl / 2 + 0.07, 0, hl / 2 - 0.07]) s.box([hw * 2, 0.02, 0.1], [0, F + 0.01, pz + dz], wood);
      }
    }

    // Mattress, and a fitted sheet unless it has been stripped.
    const dirt = mood.wear;
    const ticking = paint(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#e9e2cf'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(120,130,150,0.55)'; ctx.lineWidth = 2;
      for (let i = -8; i < 16; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32 + h, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * 32 + h, 0); ctx.lineTo(i * 32, h); ctx.stroke(); }
    }, [3, 3]);
    s.mesh(slab(hw * 2, hl * 2, thick, 0.07, Math.min(0.03, thick * 0.3)), new THREE.MeshStandardMaterial({ map: ticking, roughness: 0.9 }), [0, base, 0]);
    if (stripped) {
      const stains = 2 + Math.floor(dirt * 4 + random() * 2);
      for (let i = 0; i < stains; i++) {
        const m = s.cylinder(1, 1, 0.003, [(random() - 0.5) * hw * 1.3, top + 0.001, (random() - 0.5) * hl * 1.4], s.material(i % 2 ? '#c9b178' : '#b99a72', { transparent: true, opacity: 0.5 + dirt * 0.3 }), 18);
        m.scale.set(0.08 + random() * 0.16, 1, 0.07 + random() * 0.14);
        m.castShadow = false;
      }
    } else {
      const sheetColour = { white: '#e9e7e0', marl: '#d5d5d3', stripe: '#dfe3ea', stars: '#f1e9c9', floral: '#ead9d2', bare: '#e6e2d4' }[a.cover];
      s.mesh(slab(hw * 2 + 0.012, hl * 2 + 0.012, thick * 0.6 + 0.006, 0.075, Math.min(0.03, thick * 0.25)), s.material(sheetColour, { roughness: 0.95 }), [0, base + thick * 0.4, 0]);
    }

    // Pillows.
    const pillowY = top + 0.012;
    const caseColour = stripped ? '#e3d9bd' : { white: '#f1efe9', marl: '#bdbdbd', stripe: '#f1f1ee', stars: '#3f67b5', floral: '#e7c9c2', bare: '#f1efe9' }[a.cover];
    const pg = pillowGeometry();
    const pz = -hl + 0.25;
    if (a.pillow === 'hoodie') {
      const hood = s.material(mood.cheer > 0.5 ? '#b5483c' : '#4a5361', { roughness: 0.95 });
      const roll = s.mesh(pg, hood, [side * 0.05, pillowY + 0.07, pz]);
      roll.scale.set(0.24, 0.075, 0.13);
      roll.rotation.y = (random() - 0.5) * 0.5;
      const cap = s.mesh(pg.clone(), hood, [side * 0.05 + 0.2, pillowY + 0.05, pz + 0.04]);
      cap.scale.set(0.12, 0.055, 0.12);
      s.tube([[side * 0.05 + 0.14, pillowY + 0.1, pz + 0.1], [side * 0.05 + 0.18, pillowY + 0.03, pz + 0.2], [side * 0.05 + 0.1, pillowY + 0.006, pz + 0.3]], 0.004, s.material('#e8e4da'));
    } else {
      const count = a.pillow === 'two' ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const m = s.mesh(i ? pg.clone() : pg, s.material(i ? '#d8cfb4' : caseColour, { roughness: 0.95 }), [(narrow ? 0 : side * -0.22) + i * 0.07 * side, pillowY + 0.055 + i * 0.085, pz + i * 0.03]);
        m.scale.set(0.34, a.pillow === 'one' ? 0.058 : 0.07, 0.21);
        m.rotation.y = (random() - 0.5) * (i ? 0.7 : 0.3);
        m.rotation.z = i ? 0.08 : 0;
      }
    }

    // Duvet: a heightfield draped over whatever is beneath it.
    const cheer = mood.cheer;
    const sat = mix(0.55, 1.1, cheer);
    const cover = paint(256, 256, (ctx, w, h) => {
      const dots = (n: number, f: () => void) => { for (let i = 0; i < n; i++) f(); };
      if (a.cover === 'white') { ctx.fillStyle = '#eceae3'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(160,160,170,0.18)'; dots(40, () => ctx.fillRect(random() * w, 0, 1, h)); }
      else if (a.cover === 'marl') { ctx.fillStyle = '#a9a9ab'; ctx.fillRect(0, 0, w, h); dots(2600, () => { ctx.fillStyle = random() < 0.5 ? 'rgba(235,235,235,0.5)' : 'rgba(80,80,86,0.4)'; ctx.fillRect(random() * w, random() * h, 2, 5); }); }
      else if (a.cover === 'stripe') { ctx.fillStyle = '#f0efe9'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = `hsl(222,${45 * sat}%,30%)`; for (let i = 0; i < 8; i++) { ctx.fillRect(i * 32, 0, 12, h); ctx.fillRect(i * 32 + 17, 0, 2, h); } }
      else if (a.cover === 'stars') {
        ctx.fillStyle = `hsl(218,${55 * sat}%,36%)`; ctx.fillRect(0, 0, w, h);
        dots(13, () => {
          const x = 20 + random() * (w - 40), y = 20 + random() * (h - 40), r = 9 + random() * 9;
          ctx.fillStyle = `hsl(48,${85 * sat}%,62%)`;
          if (random() < 0.35) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.fillStyle = `hsl(218,${55 * sat}%,36%)`; ctx.beginPath(); ctx.arc(x + r * 0.45, y - r * 0.2, r * 0.85, 0, 7); ctx.fill(); }
          else { ctx.beginPath(); for (let k = 0; k < 10; k++) { const q = k * Math.PI / 5, rad = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.sin(q) * rad, y - Math.cos(q) * rad); } ctx.fill(); }
        });
      } else if (a.cover === 'floral') {
        ctx.fillStyle = '#e9dcc6'; ctx.fillRect(0, 0, w, h);
        dots(26, () => {
          const x = random() * w, y = random() * h, r = 7 + random() * 8, hue = random() < 0.6 ? 345 : 265;
          ctx.fillStyle = `hsl(110,${22 * sat}%,48%)`; ctx.beginPath(); ctx.ellipse(x + r, y + r, r * 1.1, r * 0.45, 0.7, 0, 7); ctx.fill();
          ctx.fillStyle = `hsl(${hue},${48 * sat}%,66%)`;
          for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.sin(k * 1.257) * r * 0.7, y + Math.cos(k * 1.257) * r * 0.7, r * 0.55, 0, 7); ctx.fill(); }
          ctx.fillStyle = '#e3c45c'; ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, 7); ctx.fill();
        });
      } else {
        ctx.fillStyle = '#e2d8b6'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(140,120,70,0.5)'; ctx.lineWidth = 2;
        for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(w, i * 64); ctx.stroke(); }
      }
      ctx.fillStyle = `rgba(110,95,70,${dirt * 0.22})`; ctx.fillRect(0, 0, w, h);
    }, [3, 3]);
    const duvetMaterial = new THREE.MeshStandardMaterial({ map: cover, roughness: 0.95, side: THREE.DoubleSide });

    const waves = Array.from({ length: 5 }, () => ({ a: random() * Math.PI, f: mix(5, 13, random()), p: random() * 6.28 }));
    const wrinkle = (x: number, z: number) => {
      let v = 0;
      for (const w of waves) v += 1 - Math.abs(Math.sin((x * Math.cos(w.a) + z * Math.sin(w.a)) * w.f + w.p));
      return v / waves.length;
    };
    const gauss = (dx: number, dz: number, sigma: number) => Math.exp(-(dx * dx + dz * dz) / (2 * sigma * sigma));
    const surface = (x: number, z: number) => {
      const d = Math.hypot(Math.max(Math.abs(x) - hw, 0), Math.max(Math.abs(z) - hl, 0));
      return mix(top + 0.014, F + 0.012, smooth(d, 0, 0.16));
    };
    const cloth = (w: number, l: number, cx: number, cz: number, rot: number, bump: (lx: number, lz: number, wx: number, wz: number) => number) => {
      const g = new THREE.PlaneGeometry(w, l, Math.round(w * 36), Math.round(l * 36));
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position, c = Math.cos(rot), sn = Math.sin(rot);
      for (let i = 0; i < p.count; i++) {
        const lx = p.getX(i), lz = p.getZ(i);
        const wx = cx + lx * c + lz * sn, wz = cz - lx * sn + lz * c;
        const puff = smooth(Math.min(w / 2 - Math.abs(lx), l / 2 - Math.abs(lz)), 0, 0.09);
        p.setXYZ(i, wx, surface(wx, wz) + 0.004 + puff * bump(lx, lz, wx, wz), wz);
      }
      g.computeVertexNormals();
      return s.mesh(g, duvetMaterial);
    };

    const dw = hw * 2 + 0.46;
    let lumpMesh: THREE.Mesh | null = null;
    if (a.state === 'made') {
      const l = 1.5;
      cloth(dw, l, 0, hl - l / 2 + 0.1, (random() - 0.5) * 0.05, (lx, lz) => 0.05 + 0.018 * wrinkle(lx, lz) + 0.035 * smooth(lz, -l / 2 + 0.26, -l / 2 + 0.2));
    } else if (a.state === 'slept') {
      const l = 1.7, hx = side * (0.1 + random() * 0.2), hz = -0.25 + random() * 0.5;
      cloth(dw, l, side * mix(0.18, 0.38, random()), 0.3, side * mix(0.25, 0.6, random()), (lx, lz) =>
        0.045 + 0.16 * wrinkle(lx, lz) ** 1.6 + 0.34 * gauss(lx - hx, lz - hz, 0.24) + 0.2 * gauss(lx - hx - side * 0.3, lz - hz + 0.35, 0.2));
    } else if (a.state === 'occupied') {
      const l = 1.72, bx = narrow ? 0 : side * -0.2, curl = -side * mix(0.12, 0.26, random());
      // A spine from the shoulders to the feet, bent at the hips and knees.
      const spine: [number, number, number, number][] = [
        [bx, -hl + 0.5, 0.2, 0.13], [bx + curl * 0.2, -hl + 0.68, 0.25, 0.16], [bx + curl * 0.6, -hl + 0.9, 0.19, 0.15],
        [bx + curl, -hl + 1.1, 0.24, 0.16], [bx - curl * 0.5, -hl + 1.32, 0.2, 0.14], [bx - curl * 1.3, -hl + 1.5, 0.16, 0.12], [bx + curl * 0.1, -hl + 1.66, 0.1, 0.1],
      ];
      const samples: [number, number, number, number][] = [];
      for (let i = 0; i < spine.length - 1; i++) for (let k = 0; k < 4; k++) samples.push(spine[i].map((v, j) => mix(v, spine[i + 1][j], k / 4)) as [number, number, number, number]);
      lumpMesh = cloth(dw, l, 0, hl - l / 2 + 0.08, (random() - 0.5) * 0.12, (lx, lz, wx, wz) => {
        let lump = 0;
        for (const [x, z, h, sg] of samples) lump = Math.max(lump, h * 1.45 * gauss(wx - x, wz - z, sg * 1.1));
        return 0.04 + 0.03 * wrinkle(lx, lz) + lump;
      });
      const hair = ['#2a211c', '#4a3020', '#8a5a2c', '#16161a', '#b9a36a'][Math.floor(random() * 5)];
      const head = s.ball([0.1, 0.085, 0.115], [bx - curl * 0.1, pillowY + 0.12 + (a.pillow === 'two' ? 0.08 : 0), -hl + 0.32], s.material(hair, { roughness: 1 }), 16);
      head.rotation.y = random();
    } else {
      const cx = side * (hw + 0.3), cz = hl - 0.35 - random() * 0.4;
      cloth(1.5, 1.5, cx, cz, random() * 3, (lx, lz) => 0.05 + 0.14 * wrinkle(lx, lz) ** 1.4 + 0.46 * gauss(lx, lz, 0.25) + 0.3 * gauss(lx - 0.3, lz + 0.25, 0.17));
    }

    // Phone, charger and cable on the floor by the pillow.
    const px = -side * (hw + 0.2), phz = -hl + 0.62;
    const white = s.material('#ecebe6', { roughness: 0.5 });
    const strip = s.box([0.07, 0.04, 0.26], [px - side * 0.1, F + 0.02, -hl + 0.16], white);
    strip.rotation.y = (random() - 0.5) * 0.5;
    s.box([0.022, 0.012, 0.03], [px - side * 0.1, F + 0.044, -hl + 0.06], s.material('#d8402c', { emissive: '#ff2a10', emissiveIntensity: 0.9 }));
    s.box([0.045, 0.05, 0.045], [px - side * 0.1, F + 0.062, -hl + 0.2], white);
    const cableEnd: [number, number, number] = [px, F + 0.008, phz - 0.08];
    s.tube([[px - side * 0.1, F + 0.085, -hl + 0.2], [px - side * 0.14, F + 0.02, -hl + 0.27], [px - side * 0.2, F + 0.006, -hl + 0.4], [px - side * 0.06, F + 0.006, -hl + 0.46], cableEnd], 0.005, white);
    let glow: THREE.MeshStandardMaterial | null = null;
    if (a.phone !== 'none') {
      const phone = new THREE.Group();
      phone.position.set(px, F, phz);
      phone.rotation.y = (random() - 0.5) * 0.5;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.01, 0.16), s.material('#1b1d22', { roughness: 0.3, metalness: 0.4 }));
      body.position.y = 0.005;
      body.castShadow = true;
      phone.add(body);
      if (a.phone === 'dark') {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.004, 12), s.material('#3b4048', { metalness: 0.7, roughness: 0.2 }));
        lens.position.set(-0.022, 0.011, -0.058);
        phone.add(lens);
      } else {
        const alarm = a.phone === 'alarm';
        const tint = alarm ? '#ff9a3c' : new THREE.Color().setHSL(mix(0.6, 0.55, mood.warmth), 0.8, 0.62).getStyle();
        const screen = paint(128, 256, (ctx, w, h) => {
          const grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, alarm ? '#ffb347' : '#3a6fe0'); grad.addColorStop(1, alarm ? '#e2502a' : '#1b2c6e');
          ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = 'bold 44px monospace';
          ctx.fillText(alarm ? '6:00' : ['3:07', '2:48', '4:12', '3:33'][Math.floor(random() * 4)], w / 2, 70);
          if (alarm) { ctx.beginPath(); ctx.arc(w / 2, 170, 34, 0, 7); ctx.fill(); }
          else for (let i = 0; i < 2 + Math.floor(random() * 3); i++) { ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.fillRect(12, 104 + i * 38, w - 24, 30); }
        });
        glow = new THREE.MeshStandardMaterial({ map: screen, emissiveMap: screen, emissive: '#ffffff', emissiveIntensity: 1, roughness: 0.2 });
        const face = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.15), glow);
        face.rotation.x = -Math.PI / 2;
        face.position.y = 0.0108;
        phone.add(face);
        const pool = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.2, depthWrite: false }));
        pool.rotation.x = -Math.PI / 2;
        pool.position.y = 0.003;
        phone.add(pool);
      }
      s.root.add(phone);
    }

    // The bedside floor.
    const bx = side * (hw + 0.26), bz = -hl + 0.45;
    if (a.beside === 'water') {
      s.cylinder(0.036, 0.03, 0.12, [bx, F + 0.06, bz], new THREE.MeshStandardMaterial({ color: '#cfe6ee', transparent: true, opacity: 0.45, roughness: 0.05, depthWrite: false }), 16);
      s.cylinder(0.031, 0.027, 0.07, [bx, F + 0.04, bz], s.material('#9ccbe0', { roughness: 0.1, transparent: true, opacity: 0.8 }), 16);
      s.ring(0.036, 0.003, [bx, F + 0.12, bz], s.material('#eef6f8', { roughness: 0.1 })).rotation.x = Math.PI / 2;
      const pack = s.box([0.1, 0.006, 0.05], [bx + side * 0.06, F + 0.003, bz + 0.16], s.material('#c9ced2', { metalness: 0.8, roughness: 0.3 }));
      pack.rotation.y = random() * 2;
      for (let i = 0; i < 8; i++) if (random() > mood.wear * 0.6) { const pill = s.ball([0.008, 0.005, 0.008], [0, 0, 0], white, 8); pill.position.set((i % 4 - 1.5) * 0.022, 0.005, (Math.floor(i / 4) - 0.5) * 0.022); pack.add(pill); }
    } else if (a.beside === 'books') {
      const n = 3 + Math.floor(random() * 3 + mood.density * 2);
      let y = F;
      for (let i = 0; i < n; i++) {
        const t = 0.02 + random() * 0.025;
        const b = s.box([0.13 + random() * 0.03, t, 0.19 + random() * 0.02], [bx + (random() - 0.5) * 0.03, y + t / 2, bz], s.material(new THREE.Color().setHSL(random(), 0.45 * sat, 0.42)));
        b.rotation.y = (random() - 0.5) * 0.6;
        const pages = s.box([0.12, t * 0.7, 0.18], [0.008, 0, 0], s.material('#efe7d2'));
        b.add(pages);
        y += t;
      }
      const shade = new THREE.Color().setHSL(mix(0.13, 0.07, mood.warmth), 0.9, 0.7);
      s.cylinder(0.045, 0.05, 0.012, [bx, y + 0.006, bz], s.material('#2f3238'), 16);
      s.rod([bx, y, bz], [bx, y + 0.17, bz], 0.006, s.material('#2f3238'));
      s.cylinder(0.04, 0.075, 0.1, [bx, y + 0.2, bz], s.material(shade, { emissive: shade, emissiveIntensity: 0.9, side: THREE.DoubleSide }), 18);
    } else if (a.beside === 'cans') {
      const n = 3 + Math.floor(random() * 2 + mood.density * 4);
      for (let i = 0; i < n; i++) {
        const tipped = random() < 0.45;
        const can = s.cylinder(0.033, 0.033, 0.12 * (tipped ? 1 : mix(1, 0.7, random() * mood.wear)), [bx + (random() - 0.5) * 0.34, F + (tipped ? 0.033 : 0.06), bz + (random() - 0.2) * 0.6], s.material(['#c8ccd0', '#2d8a4e', '#c9352c', '#1f3f8c', '#e0b030'][Math.floor(random() * 5)], { metalness: 0.7, roughness: 0.35 }), 14);
        if (tipped) { can.rotation.z = Math.PI / 2; can.rotation.y = random() * 3; }
      }
      s.cylinder(0.06, 0.05, 0.025, [bx, F + 0.0125, bz - 0.2], s.material('#6f7f86', { roughness: 0.2 }), 18);
      for (let i = 0; i < 6; i++) s.rod([bx + (random() - 0.5) * 0.06, F + 0.026, bz - 0.2 + (random() - 0.5) * 0.06], [bx + (random() - 0.5) * 0.1, F + 0.04, bz - 0.2 + (random() - 0.5) * 0.1], 0.004, s.material(i % 2 ? '#e9e2d0' : '#c98a4a'));
    } else if (a.beside === 'clock') {
      s.box([0.15, 0.07, 0.08], [bx, F + 0.035, bz], s.material('#26282c', { roughness: 0.4 }));
      const face = s.label(['3:07', '2:48', '4:12', '5:59'][Math.floor(random() * 4)], 0.13, 0.05, [bx, F + 0.036, bz + 0.0405], '#ff2b1c', '#140606');
      const fm = face.material as THREE.MeshStandardMaterial;
      fm.emissiveMap = fm.map; fm.emissive.set('#ffffff'); fm.emissiveIntensity = 1;
      const mug = new THREE.Color().setHSL(random(), 0.5 * sat, 0.55);
      s.cylinder(0.04, 0.035, 0.09, [bx + side * 0.05, F + 0.045, bz + 0.2], s.material(mug), 16);
      s.cylinder(0.034, 0.034, 0.004, [bx + side * 0.05, F + 0.08, bz + 0.2], s.material('#3a2618'), 16);
      s.ring(0.025, 0.006, [bx + side * 0.05 + 0.045, F + 0.045, bz + 0.2], s.material(mug));
    }

    // Loose things that gather around a floor bed.
    const litter = Math.floor(mood.density * 6 + random() * 1.5);
    for (let i = 0; i < litter; i++) {
      const ang = random() * 6.28, r = 0.2 + random() * 0.14;
      const x = Math.sin(ang) * (hw + r), z = Math.cos(ang) * (hl + r) * 0.9;
      if (i % 2) {
        const sock = s.ball([0.09, 0.018, 0.035], [x, F + 0.014, z], s.material(['#e9e6df', '#2b2d33', '#b3413a', '#5b6d8c'][Math.floor(random() * 4)], { roughness: 1 }), 10);
        sock.rotation.y = random() * 3;
        const toe = s.ball([0.4, 1, 1.7], [0.8, 0, 0.9], sock.material as THREE.Material, 8);
        sock.add(toe);
      } else {
        const tissue = s.mesh(new THREE.IcosahedronGeometry(0.035 + random() * 0.015, 0), s.material('#f3f1ea', { roughness: 1, flatShading: true }), [x, F + 0.03, z]);
        tissue.rotation.set(random() * 3, random() * 3, 0);
      }
    }

    const energy = mood.energy;
    return s.finish({
      update: (_dt, time) => {
        if (lumpMesh) lumpMesh.scale.y = 1 + Math.sin(time * mix(0.9, 2.2, energy)) * 0.012;
        if (glow) glow.emissiveIntensity = a.phone === 'alarm' ? 0.75 + 0.45 * Math.sign(Math.sin(time * mix(4, 12, energy))) : 0.95 + 0.08 * Math.sin(time * 1.3);
      },
    });
  },
});
