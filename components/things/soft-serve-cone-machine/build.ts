import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function instances(geometry: THREE.BufferGeometry, material: THREE.Material, items: { at: V3; rot?: V3; size?: V3; color?: THREE.ColorRepresentation }[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  items.forEach((item, index) => {
    e.set(...(item.rot ?? [0, 0, 0]));
    q.setFromEuler(e);
    matrix.compose(new THREE.Vector3(...item.at), q, new THREE.Vector3(...(item.size ?? [1, 1, 1])));
    mesh.setMatrixAt(index, matrix);
    if (item.color !== undefined) mesh.setColorAt(index, new THREE.Color(item.color));
  });
  mesh.count = items.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

const FLAVOURS = {
  'vanilla-chocolate': { left: '#f6f0dc', right: '#5a3521', names: ['VANILLA', 'TWIST', 'CHOC'] },
  'strawberry-vanilla': { left: '#f3a6b8', right: '#f6f0dc', names: ['STRAWB', 'TWIST', 'VANILLA'] },
  vanilla: { left: '#f6f0dc', right: '#f6f0dc', names: ['VANILLA', 'VANILLA', 'VANILLA'] },
  chocolate: { left: '#5a3521', right: '#5a3521', names: ['CHOC', 'CHOC', 'CHOC'] },
  'blue-vanilla': { left: '#6fb9ea', right: '#f6f0dc', names: ['BLUE MOON', 'TWIST', 'VANILLA'] },
  'mango-pistachio': { left: '#f5b23a', right: '#a8c66c', names: ['MANGO', 'TWIST', 'PISTACHIO'] },
} as const;

/** A soft-serve swirl: a ridged lathe tapering to a curled tip, standing on y = 0. */
function swirlGeometry(height: number, radius: number) {
  const profile: [number, number][] = [];
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ridge = 1 + 0.22 * Math.sin(t * Math.PI * 7);
    const r = radius * ridge * (1 - t * t * 0.96) * (t < 0.08 ? mix(0.75, 1, t / 0.08) : 1);
    profile.push([Math.max(0.0015, r), t * height]);
  }
  profile.push([0.0005, height + radius * 0.3]);
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 28);
}

export default defineThing({
  questions: {
    flavours: choice('What flavours are loaded?', {
      'vanilla-chocolate': 'Vanilla on the left, chocolate on the right, a twist in the middle.',
      'strawberry-vanilla': 'Pink strawberry and vanilla.',
      vanilla: 'Vanilla only, both hoppers.',
      chocolate: 'Chocolate only.',
      'blue-vanilla': 'Electric blue moon and vanilla, a flavour nobody can describe.',
      'mango-pistachio': 'Mango orange and pale pistachio green.',
    }),
    state: choice('What is the machine doing right now?', {
      pouring: 'Mid-pour: a cone under the nozzle, the swirl piling up tall.',
      dripping: 'Idle, a long drip hardening from the nozzle into a puddle on the tray.',
      broken: 'Out of order: a hand-written BROKEN sign taped over the levers.',
      clean: 'Wiped down and idle, ready for the next customer.',
    }),
    swirl: score('If a cone is being poured, how tall is the swirl?', ['A modest curl', 'A proper peak', 'A leaning tower']),
    beside: choice('What sits beside the machine?', {
      cones: 'A rack of empty cones standing point-down in a holder.',
      sprinkles: 'A tub of rainbow sprinkles with a scoop.',
      cups: 'A stack of paper cups and a box of spoons.',
      nothing: 'Nothing: bare counter.',
    }),
    body: choice('What kind of unit is it?', {
      counter: 'A stainless countertop unit.',
      cart: 'A cart on wheels with striped side panels and a push handle.',
    }),
    sign: choice('What does the header sign say, if it has one?', {
      'soft-serve': 'SOFT SERVE in a lit header.',
      'ice-cream': 'ICE CREAM in a lit header.',
      cones: 'CONES 99¢ in a lit header.',
      none: 'No header sign.',
    }),
    dispenser: noul('Is a clear tube of stacked cones mounted beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const flavour = FLAVOURS[a.flavours];
    const steel = s.material('#c4c8ca', { metalness: 0.8, roughness: 0.28 });
    const chrome = s.material('#e4e8ea', { metalness: 0.95, roughness: 0.15 });
    const dark = s.material('#2c2f33', { roughness: 0.55 });
    const white = s.material('#f1f1ec', { roughness: 0.5 });
    const accent = new THREE.Color().setHSL(pick([0.98, 0.58, 0.9]), mix(0.5, 0.9, mood.cheer), 0.52).getStyle();

    // ---- the cart base or the counter the unit stands on
    const W = 0.56, D = 0.62, H = 0.8;
    let base = 0;
    if (a.body === 'cart') {
      base = 0.62;
      const stripes = paint(128, 64, (ctx) => {
        ctx.fillStyle = '#f4f1ea';
        ctx.fillRect(0, 0, 128, 64);
        ctx.fillStyle = accent;
        for (let x = 0; x < 128; x += 32) ctx.fillRect(x, 0, 16, 64);
      });
      stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
      stripes.repeat.set(3, 1);
      const panel = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.7 });
      s.box([W + 0.2, base - 0.12, D + 0.1], [0, base / 2 + 0.03, 0], steel);
      const front = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.18, base - 0.16), panel);
      front.position.set(0, base / 2 + 0.03, D / 2 + 0.051);
      s.root.add(front);
      for (const side of [-1, 1]) {
        const panelSide = new THREE.Mesh(new THREE.PlaneGeometry(D + 0.08, base - 0.16), panel);
        panelSide.position.set(side * (W / 2 + 0.101), base / 2 + 0.03, 0);
        panelSide.rotation.y = side * Math.PI / 2;
        s.root.add(panelSide);
      }
      s.box([W + 0.24, 0.03, D + 0.14], [0, base - 0.015, 0], steel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        const wheel = s.cylinder(0.07, 0.07, 0.04, [x * (W / 2 + 0.02), 0.07, z * (D / 2 - 0.06)], dark, 16);
        wheel.rotation.z = Math.PI / 2;
        s.cylinder(0.03, 0.03, 0.045, [x * (W / 2 + 0.02), 0.07, z * (D / 2 - 0.06)], chrome, 12).rotation.z = Math.PI / 2;
      }
      s.rod([-W / 2, base - 0.02, -D / 2 - 0.1], [-W / 2, base + 0.32, -D / 2 - 0.1], 0.014, chrome);
      s.rod([W / 2, base - 0.02, -D / 2 - 0.1], [W / 2, base + 0.32, -D / 2 - 0.1], 0.014, chrome);
      s.rod([-W / 2, base + 0.32, -D / 2 - 0.1], [W / 2, base + 0.32, -D / 2 - 0.1], 0.016, dark);
    } else {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.02, 0.024, 0.04, [x * (W / 2 - 0.05), 0.02, z * (D / 2 - 0.06)], dark, 10);
      base = 0.04;
    }

    // ---- the machine body: a stainless box with a dark front panel and a drip tray
    const Y = base;
    s.box([W, H, D], [0, Y + H / 2, 0], steel);
    s.box([W - 0.06, 0.34, 0.02], [0, Y + H * 0.42, D / 2 + 0.005], dark);
    for (let i = 0; i < 9; i++) s.box([W * 0.7, 0.006, 0.004], [0, Y + 0.06 + i * 0.016, D / 2 + 0.003], dark);
    for (const x of [-1, 1]) for (let i = 0; i < 12; i++) s.box([0.004, H * 0.5, 0.3], [x * (W / 2 + 0.002), Y + H * 0.45, -0.1 + i * 0.012 - 0.06], dark);
    // Drip tray with a grille.
    s.box([W - 0.08, 0.025, 0.16], [0, Y + 0.17, D / 2 + 0.07], steel);
    for (let i = 0; i < 10; i++) s.box([W - 0.12, 0.004, 0.006], [0, Y + 0.184, D / 2 + 0.01 + i * 0.014], dark);
    const trayY = Y + 0.186;
    // Hoppers on top: two lidded drums.
    for (const x of [-1, 1]) {
      s.cylinder(0.12, 0.12, 0.09, [x * 0.135, Y + H + 0.045, -0.08], white, 24);
      s.cylinder(0.125, 0.125, 0.02, [x * 0.135, Y + H + 0.095, -0.08], chrome, 24);
      s.cylinder(0.03, 0.03, 0.03, [x * 0.135, Y + H + 0.12, -0.08], dark, 12);
    }
    // Flavour strip: three swatches with names.
    const strip = paint(512, 96, (ctx) => {
      ctx.fillStyle = '#f4f2ea';
      ctx.fillRect(0, 0, 512, 96);
      const colours = [flavour.left, null, flavour.right];
      colours.forEach((colour, i) => {
        const x = 20 + i * 164;
        if (colour) { ctx.fillStyle = colour; ctx.fillRect(x, 12, 140, 40); }
        else {
          ctx.fillStyle = flavour.left; ctx.fillRect(x, 12, 70, 40);
          ctx.fillStyle = flavour.right; ctx.fillRect(x + 70, 12, 70, 40);
        }
        ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.strokeRect(x, 12, 140, 40);
        ctx.fillStyle = '#222'; ctx.font = '700 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(flavour.names[i], x + 70, 74, 136);
      });
    });
    const stripMesh = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.1, (W - 0.1) * 96 / 512), new THREE.MeshStandardMaterial({ map: strip, roughness: 0.7 }));
    stripMesh.position.set(0, Y + H * 0.42 + 0.12, D / 2 + 0.016);
    s.root.add(stripMesh);
    // Nozzles and levers.
    const nozzleX = [-0.14, 0, 0.14];
    const nozzleY = Y + H * 0.42 - 0.15;
    for (const [i, x] of nozzleX.entries()) {
      s.box([0.06, 0.08, 0.06], [x, nozzleY + 0.04, D / 2 + 0.03], chrome);
      s.cylinder(0.014, 0.02, 0.035, [x, nozzleY - 0.012, D / 2 + 0.03], chrome, 12);
      if (i !== 1 || a.state === 'broken') {
        const pulled = a.state === 'pouring' && i === 0 ? 0.9 : 0.25;
        const lever = s.rod([x, nozzleY + 0.1, D / 2 + 0.04], [x + (i === 0 ? -0.02 : 0.02), nozzleY + 0.1 + 0.11 * Math.cos(pulled), D / 2 + 0.04 + 0.11 * Math.sin(pulled)], 0.007, chrome);
        void lever;
        s.ball([0.02, 0.02, 0.02], [x + (i === 0 ? -0.02 : 0.02), nozzleY + 0.1 + 0.11 * Math.cos(pulled), D / 2 + 0.04 + 0.11 * Math.sin(pulled)], s.material(i === 0 ? flavour.left : flavour.right, { roughness: 0.4 }), 12);
      }
    }
    // The centre pull handle is a short horizontal bar.
    s.rod([-0.03, nozzleY + 0.1, D / 2 + 0.07], [0.03, nozzleY + 0.1, D / 2 + 0.07], 0.01, dark);
    // Header sign: a small lightbox on top, lit.
    if (a.sign !== 'none') {
      const text = { 'soft-serve': 'SOFT SERVE', 'ice-cream': 'ICE CREAM', cones: 'CONES 99¢' }[a.sign];
      s.box([W + 0.04, 0.16, 0.06], [0, Y + H + 0.2, 0.08], white);
      const face = s.label(text, W - 0.02, 0.12, [0, Y + H + 0.2, 0.111], accent, '#fffbea');
      (face.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#fff4c8');
      (face.material as THREE.MeshStandardMaterial).emissiveMap = (face.material as THREE.MeshStandardMaterial).map;
      (face.material as THREE.MeshStandardMaterial).emissiveIntensity = mix(0.3, 0.7, mood.cheer);
      for (const x of [-1, 1]) s.rod([x * 0.2, Y + H + 0.12, 0.08], [x * 0.2, Y + H + 0.12, 0.08 - 0.1], 0.008, chrome);
    }

    // ---- what the nozzle is doing
    const cream = (colour: string) => s.material(colour, { roughness: 0.35 });
    const twistTexture = paint(64, 256, (ctx) => {
      ctx.fillStyle = flavour.left;
      ctx.fillRect(0, 0, 64, 256);
      ctx.fillStyle = flavour.right;
      for (let i = -4; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * 48);
        ctx.lineTo(64, i * 48 - 64);
        ctx.lineTo(64, i * 48 - 40);
        ctx.lineTo(0, i * 48 + 24);
        ctx.closePath();
        ctx.fill();
      }
    });
    const twist = new THREE.MeshStandardMaterial({ map: twistTexture, roughness: 0.35 });
    const servedFrom = a.state === 'pouring' ? pick([0, 1, 2]) : 1;
    const swirlPaint = servedFrom === 0 ? cream(flavour.left) : servedFrom === 2 ? cream(flavour.right) : flavour.left === flavour.right ? cream(flavour.left) : twist;
    const waffle = paint(64, 64, (ctx) => {
      ctx.fillStyle = '#d8a35a';
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = '#8c5a28';
      ctx.lineWidth = 3;
      for (let i = -64; i < 128; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 64, 64); ctx.moveTo(i, 64); ctx.lineTo(i + 64, 0); ctx.stroke(); }
    });
    waffle.wrapS = waffle.wrapT = THREE.RepeatWrapping;
    waffle.repeat.set(4, 2);
    const conePaint = new THREE.MeshStandardMaterial({ map: waffle, roughness: 0.85 });
    const coneGeometry = new THREE.CylinderGeometry(0.034, 0.003, 0.12, 14);
    let swirl: THREE.Mesh | null = null;
    if (a.state === 'pouring') {
      const x = nozzleX[servedFrom];
      const cone = s.mesh(coneGeometry, conePaint, [x, trayY + 0.06, D / 2 + 0.03]);
      cone.rotation.y = random() * 3;
      const height = mix(0.08, 0.22, a.swirl);
      swirl = s.mesh(swirlGeometry(height, 0.042), swirlPaint, [x, trayY + 0.115, D / 2 + 0.03]);
      swirl.rotation.y = random() * 3;
      if (a.swirl > 0.6) swirl.rotation.z = jitter(0.3);
      const streamTop = nozzleY - 0.03, streamBottom = trayY + 0.115 + height;
      if (streamTop > streamBottom + 0.01) s.cylinder(0.012, 0.016, streamTop - streamBottom, [x, (streamTop + streamBottom) / 2, D / 2 + 0.03], swirlPaint, 10);
    } else if (a.state === 'dripping') {
      const x = nozzleX[servedFrom];
      const drip = s.mesh(new THREE.CylinderGeometry(0.004, 0.012, 0.09, 8), swirlPaint, [x, nozzleY - 0.075, D / 2 + 0.03]);
      void drip;
      s.ball([0.012, 0.016, 0.012], [x, nozzleY - 0.125, D / 2 + 0.03], swirlPaint, 10);
      const puddle = s.cylinder(0.05, 0.055, 0.008, [x + jitter(0.01), trayY + 0.004, D / 2 + 0.04], swirlPaint, 18);
      puddle.scale.z = 0.7;
      if (random() < 0.5) s.ball([0.02, 0.012, 0.02], [x + 0.02, trayY + 0.01, D / 2 + 0.05], swirlPaint, 10);
    } else if (a.state === 'broken') {
      const sign = s.label(pick(['BROKEN', 'OUT OF ORDER', 'SORRY!', 'NO ICE CREAM']), 0.26, 0.13, [jitter(0.04), nozzleY + 0.11, D / 2 + 0.085], '#2a2a2a', '#f7f1dd');
      sign.rotation.set(-0.1, 0, jitter(0.25));
      for (const x of [-0.1, 0.1]) {
        const tape = s.box([0.05, 0.02, 0.002], [sign.position.x + x, sign.position.y + 0.06, D / 2 + 0.087], new THREE.MeshStandardMaterial({ color: '#d9d2b8', roughness: 0.4, transparent: true, opacity: 0.7 }));
        tape.rotation.z = jitter(0.5);
      }
    } else {
      // Clean and idle: a folded cloth on the tray.
      s.box([0.12, 0.02, 0.09], [W / 2 - 0.12, trayY + 0.01, D / 2 + 0.07], s.material(pick(['#4a7fb5', '#d9d9d0', '#c0392b']), { roughness: 0.95 }));
    }

    // ---- the cone dispenser tube, clamped to the side
    const sideX = W / 2 + 0.07;
    if (a.dispenser) {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#dfeff5', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false });
      s.cylinder(0.042, 0.042, 0.48, [sideX, Y + H * 0.55, 0.05], glass, 20);
      s.cylinder(0.046, 0.046, 0.02, [sideX, Y + H * 0.55 + 0.24, 0.05], chrome, 20);
      s.cylinder(0.046, 0.046, 0.02, [sideX, Y + H * 0.55 - 0.24, 0.05], chrome, 20);
      for (const y of [Y + H * 0.35, Y + H * 0.75]) s.box([0.08, 0.02, 0.03], [W / 2 + 0.035, y, 0.05], chrome);
      const count = 5 + Math.round(random() * 9);
      const stack = Array.from({ length: count }, (_, i) => ({ at: [sideX, Y + H * 0.55 - 0.2 + i * 0.03, 0.05] as V3 }));
      s.root.add(instances(coneGeometry, conePaint, stack));
    }

    // ---- what sits beside it on the counter
    const besideX = a.dispenser ? -(W / 2 + 0.16) : (random() < 0.5 ? -1 : 1) * (W / 2 + 0.14);
    if (a.beside === 'cones') {
      s.box([0.16, 0.08, 0.16], [besideX, Y + 0.04, 0.12], s.material(accent, { roughness: 0.5 }));
      const rack: { at: V3; rot?: V3 }[] = [];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (random() < 0.85) rack.push({ at: [besideX - 0.05 + i * 0.05, Y + 0.125, 0.07 + j * 0.05], rot: [0, random() * 3, 0] });
      s.root.add(instances(coneGeometry, conePaint, rack));
    } else if (a.beside === 'sprinkles') {
      s.cylinder(0.09, 0.08, 0.1, [besideX, Y + 0.05, 0.12], white, 20);
      s.cylinder(0.084, 0.084, 0.012, [besideX, Y + 0.1, 0.12], s.material('#f7f3e8'), 20);
      const colours = ['#e63946', '#f4d35e', '#2a9d8f', '#f28482', '#4361ee', '#f3722c'];
      const bits = Array.from({ length: 160 }, () => {
        const r = random() * 0.078, t = random() * Math.PI * 2;
        return { at: [besideX + Math.cos(t) * r, Y + 0.107 + random() * 0.006, 0.12 + Math.sin(t) * r] as V3, rot: [jitter(1), random() * 3, jitter(1)] as V3, color: pick(colours) };
      });
      s.root.add(instances(new THREE.CylinderGeometry(0.002, 0.002, 0.009, 5), s.material('#ffffff', { roughness: 0.4 }), bits));
      s.rod([besideX + 0.04, Y + 0.1, 0.12], [besideX + 0.11, Y + 0.17, 0.14], 0.006, chrome);
    } else if (a.beside === 'cups') {
      const stack = 6 + Math.round(random() * 6);
      for (let i = 0; i < stack; i++) s.cylinder(0.04, 0.03, 0.075, [besideX, Y + 0.038 + i * 0.013, 0.12], white, 16);
      s.box([0.1, 0.06, 0.07], [besideX + 0.12 * Math.sign(besideX), Y + 0.03, 0.14], s.material('#e8dcc0', { roughness: 0.9 }));
    }

    const energy = mood.energy;
    return s.finish({
      update(_dt, time) {
        if (swirl && a.state === 'pouring') swirl.rotation.y += 0.01 * (0.4 + energy) * Math.sin(time * 0.5) ** 2;
      },
    });
  },
});
