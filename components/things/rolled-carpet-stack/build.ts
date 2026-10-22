import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const FAMILIES = {
  beniourain: 'Beni Ourain: a plain field crossed by a loose hand-drawn diamond lattice.',
  boucherouite: 'Boucherouite rag rug: chaotic stripes and zigzags of every scrap colour.',
  kilim: 'Flat-woven kilim: broad bands filled with rows of triangles.',
  azilal: 'Azilal: scattered little symbols, crosses, combs and diamonds, like a diary.',
  zemmour: 'Zemmour: many fine stripes of tiny repeated motifs.',
  medallion: 'A bordered city carpet with one great central diamond medallion.',
} as const;
type Family = keyof typeof FAMILIES;
const PALETTES = {
  madder: ['#a3261f', '#e0a13a', '#1f2f55', '#efe2c4', '#3a1410'],
  indigo: ['#1f3f7a', '#efe2c4', '#c2452a', '#e0a13a', '#101c38'],
  natural: ['#ece2cc', '#3a2c22', '#8a6a48', '#c9b089', '#2a201a'],
  sunset: ['#e0527a', '#f29a2e', '#f4d03f', '#7a2fa0', '#5a1838'],
  oasis: ['#2f7a5a', '#efe2c4', '#e0a13a', '#b8332a', '#143826'],
} as const;
type Palette = keyof typeof PALETTES;

function weave(family: Family, palette: Palette, random: () => number, fade: number) {
  const [ground, a, b, c, dark] = PALETTES[palette];
  const W = 256, H = 384;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d')!;
  const pick = () => [a, b, c, dark, ground][Math.floor(random() * 5)];
  const diamond = (x: number, y: number, rx: number, ry: number) => { g.beginPath(); g.moveTo(x, y - ry); g.lineTo(x + rx, y); g.lineTo(x, y + ry); g.lineTo(x - rx, y); g.closePath(); };
  g.fillStyle = ground; g.fillRect(0, 0, W, H);
  if (family === 'beniourain') {
    g.strokeStyle = palette === 'natural' ? a : dark; g.lineWidth = 6; g.lineJoin = 'round';
    for (let k = -4; k < 8; k++) for (const dir of [1, -1]) {
      g.beginPath();
      for (let y = 0; y <= H; y += 32) g.lineTo(k * 72 + dir * y * 0.75 + (random() - 0.5) * 10 + (dir < 0 ? 216 : 0), y);
      g.stroke();
    }
  } else if (family === 'boucherouite') {
    for (let y = 0; y < H;) {
      const h = 8 + random() * 22;
      g.fillStyle = pick(); g.fillRect(0, y, W, h + 1);
      if (random() < 0.4) {
        g.strokeStyle = pick(); g.lineWidth = 4; g.beginPath();
        for (let x = 0; x <= W; x += 16) g.lineTo(x, y + (x / 16 % 2 ? 2 : h - 2));
        g.stroke();
      }
      y += h;
    }
    for (let k = 0; k < 4; k++) { g.fillStyle = pick(); diamond(random() * W, random() * H, 26 + random() * 20, 34 + random() * 26); g.fill(); }
  } else if (family === 'kilim') {
    const inks = [ground, a, b, c];
    for (let i = 0; i < 8; i++) {
      g.fillStyle = inks[i % 4]; g.fillRect(0, i * 48, W, 48);
      g.fillStyle = inks[(i + 2) % 4];
      for (let x = 0; x < 8; x++) { g.beginPath(); g.moveTo(x * 32, i * 48 + 42); g.lineTo(x * 32 + 16, i * 48 + 8); g.lineTo(x * 32 + 32, i * 48 + 42); g.fill(); }
      g.fillStyle = dark; g.fillRect(0, i * 48, W, 4);
    }
  } else if (family === 'azilal') {
    g.strokeStyle = dark; g.lineWidth = 4; g.strokeRect(14, 22, W - 28, H - 44);
    for (let k = 0; k < 26; k++) {
      const x = 34 + random() * (W - 68), y = 42 + random() * (H - 84), kind = Math.floor(random() * 4);
      g.fillStyle = g.strokeStyle = [a, b, c, dark][Math.floor(random() * 4)]; g.lineWidth = 4;
      if (kind === 0) { diamond(x, y, 13, 17); g.fill(); }
      else if (kind === 1) { g.fillRect(x - 13, y - 3, 26, 6); g.fillRect(x - 3, y - 13, 6, 26); }
      else if (kind === 2) { g.beginPath(); for (let i = 0; i < 5; i++) g.lineTo(x - 20 + i * 10, y + (i % 2 ? -9 : 9)); g.stroke(); }
      else { g.fillRect(x - 15, y - 2, 30, 4); for (let i = 0; i < 4; i++) g.fillRect(x - 15 + i * 9, y, 4, 14); }
    }
  } else if (family === 'zemmour') {
    for (let i = 0; i < 16; i++) {
      const y = i * 24;
      g.fillStyle = i % 4 === 0 ? dark : i % 2 ? ground : b; g.fillRect(0, y, W, 24);
      g.fillStyle = i % 3 ? a : c;
      for (let x = 0; x < 16; x++) { diamond(x * 16 + 8, y + 12, 6, 8); g.fill(); }
      g.fillStyle = c; g.fillRect(0, y, W, 2);
    }
  } else {
    g.fillStyle = b; g.fillRect(12, 20, W - 24, H - 40);
    g.fillStyle = a; g.fillRect(24, 34, W - 48, H - 68);
    g.fillStyle = ground; g.fillRect(34, 46, W - 68, H - 92);
    const rings = [dark, a, c, b, ground, a];
    rings.forEach((ink, i) => { g.fillStyle = ink; diamond(W / 2, H / 2, 86 - i * 14, 130 - i * 21); g.fill(); });
    g.fillStyle = a;
    for (const x of [34, W - 34]) for (const y of [46, H - 46]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (x < 128 ? 40 : -40), y); g.lineTo(x, y + (y < 192 ? 56 : -56)); g.fill(); }
  }
  // Fringe at both ends.
  for (const y of [0, H - 12]) {
    g.fillStyle = '#efe6cf'; g.fillRect(0, y, W, 12);
    g.fillStyle = '#9a8c6c';
    for (let x = 0; x < W; x += 6) g.fillRect(x, y, 2, 12);
  }
  g.fillStyle = `rgba(200,185,160,${fade * 0.25})`; g.fillRect(0, 0, W, H);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    family: choice('What pattern is on the carpet that has been unrolled?', FAMILIES),
    palette: choice('What are its colours?', {
      madder: 'Deep madder red with gold, navy and cream.',
      indigo: 'Indigo blue with cream and rust.',
      natural: 'Undyed wool: cream, brown and black.',
      sunset: 'Hot pink, orange and yellow, loud and joyful.',
      oasis: 'Palm green with cream, gold and red.',
    }),
    rolls: score('How many rolled carpets are in the stack?', ['Two or three, a thin day', 'A good dozen', 'A wall of them, more than anyone could look through']),
    open: choice('What is on the open carpet?', {
      bare: 'Nothing: it is laid out to be looked at.',
      tea: 'A little tray with glasses of mint tea, the sale under way.',
      flipped: 'One corner is thrown back to show the knots on the underside.',
      layered: 'A second carpet has been flung half across it, and the seller is not done.',
      cat: 'A cat is asleep in the middle of it.',
    }),
    size: choice('What size is the open carpet?', {
      room: 'A broad room carpet.',
      runner: 'A long narrow corridor runner.',
      mat: 'A small mat, prayer-rug sized.',
    }),
    rest: choice('What do the upright rolls lean against?', {
      rail: 'A rough wooden rail on two posts.',
      wall: 'A stub of plastered wall.',
      none: 'Nothing: every roll is piled flat on the ground.',
    }),
    tags: noul('Do paper price tags dangle from the rolls?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const families = Object.keys(FAMILIES) as Family[], palettes = Object.keys(PALETTES) as Palette[];
    const cache = new Map<string, THREE.MeshStandardMaterial>();
    const cloth = (family: Family, palette: Palette) => {
      const key = family + palette;
      let found = cache.get(key);
      if (!found) cache.set(key, found = new THREE.MeshStandardMaterial({ map: weave(family, palette, random, mood.wear), roughness: 1, side: THREE.DoubleSide }));
      return found;
    };
    const stock: THREE.MeshStandardMaterial[] = [cloth(a.family, a.palette)];
    for (let i = 0; i < 5; i++) stock.push(cloth(families[Math.floor(random() * families.length)], random() < 0.5 ? a.palette : palettes[Math.floor(random() * palettes.length)]));

    // The end of a roll: a spiral of backing and pile.
    const spiral = document.createElement('canvas');
    spiral.width = spiral.height = 128;
    const g = spiral.getContext('2d')!;
    g.fillStyle = '#d9c9a4'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#5a4630'; g.lineWidth = 3; g.beginPath();
    for (let t = 0; t < 40; t += 0.1) g.lineTo(64 + Math.cos(t) * t * 1.5, 64 + Math.sin(t) * t * 1.5);
    g.stroke();
    const endTexture = new THREE.CanvasTexture(spiral);
    endTexture.colorSpace = THREE.SRGBColorSpace;
    const end = new THREE.MeshStandardMaterial({ map: endTexture, roughness: 1 });
    const rope = s.material('#e6dcc0', { roughness: 1 });
    const tag = s.material('#f3ecd8', { side: THREE.DoubleSide });

    const roll = (from: THREE.Vector3, to: THREE.Vector3, radius: number, skin: THREE.Material) => {
      const direction = to.clone().sub(from), length = direction.length();
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 18), [skin, end, end]);
      body.castShadow = body.receiveShadow = true;
      group.add(body);
      for (const side of [-1, 1]) {
        const tie = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.01, 0.008, 5, 18), rope);
        tie.rotation.x = Math.PI / 2;
        tie.position.y = side * length * 0.3;
        group.add(tie);
      }
      if (a.tags && random() < 0.7) {
        const label = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.11), tag);
        label.position.set(0, length / 2 + 0.01, radius * 0.6);
        label.rotation.x = Math.PI / 2 + 0.3;
        label.castShadow = true;
        group.add(label);
      }
      group.position.copy(from).add(to).multiplyScalar(0.5);
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      s.root.add(group);
    };

    const total = Math.round(mix(2, 13, a.rolls) + mood.density * 2);
    const leaning = a.rest === 'none' ? 0 : Math.floor(total * 0.4);
    const piled = total - leaning;
    const R = 0.16;
    let bottom = 1;
    while (bottom * (bottom + 1) / 2 < piled) bottom++;
    let placed = 0;
    for (let row = 0; row < bottom && placed < piled; row++) {
      const count = Math.min(bottom - row, piled - placed);
      for (let j = 0; j < count; j++, placed++) {
        const z = -0.2 - bottom * R + (j - (count - 1) / 2) * R * 2.04, y = R + row * R * 1.76;
        const length = 1.5 + random() * 0.7, x = (random() - 0.5) * 0.3;
        const skew = (random() - 0.5) * 0.08;
        roll(new THREE.Vector3(x - length / 2, y, z - skew), new THREE.Vector3(x + length / 2, y, z + skew), R * mix(0.82, 1, random()), stock[Math.floor(random() * stock.length)]);
      }
    }
    const backZ = -0.2 - bottom * R * 2 - 0.25;
    if (a.rest === 'rail') {
      const wood = s.material('#6d4a2c', { roughness: 0.9 });
      for (const x of [-1.25, 1.25]) {
        s.box([0.08, 1.6, 0.08], [x, 0.8, backZ - 0.36], wood);
        s.rod([x, 0.9, backZ - 0.36], [x, 0, backZ - 0.9], 0.03, wood);
      }
      s.box([2.8, 0.07, 0.07], [0, 1.5, backZ - 0.33], wood);
    } else if (a.rest === 'wall') {
      s.box([3, 2.05, 0.24], [0, 1.025, backZ - 0.56], s.material(mood.warmth > 0.4 ? '#d9a868' : '#d6cdb8', { roughness: 0.95 }));
      s.box([3.04, 0.4, 0.26], [0, 0.2, backZ - 0.56], s.material('#a8743f', { roughness: 0.95 }));
    }
    for (let i = 0; i < leaning; i++) {
      const x = leaning === 1 ? 0 : mix(-1.05, 1.05, i / (leaning - 1)) + (random() - 0.5) * 0.1;
      const length = 1.75 + random() * 0.45;
      const base = new THREE.Vector3(x, 0, backZ + (random() - 0.5) * 0.06);
      const aim = new THREE.Vector3(x + (random() - 0.5) * 0.3, 1.5, backZ - 0.3 + R).sub(base).normalize();
      roll(base, base.clone().addScaledVector(aim, length), R * mix(0.75, 1, random()), stock[Math.floor(random() * stock.length)]);
    }

    // The open carpet, gently rumpled, its far end still curled.
    const [w, full] = { room: [1.7, 2.1], runner: [0.85, 2.4], mat: [1, 1.4] }[a.size];
    const fold = a.open === 'flipped' ? 0.5 : 0, l = full - fold;
    const spread = (width: number, length: number, skin: THREE.Material, x: number, z: number, y: number, turn: number) => {
      const geometry = new THREE.PlaneGeometry(width, length, 10, 28);
      geometry.rotateX(-Math.PI / 2);
      const at = geometry.getAttribute('position');
      const p1 = random() * 6, p2 = random() * 6;
      for (let i = 0; i < at.count; i++) at.setY(i, 0.012 * (1 + Math.sin(at.getZ(i) * 5 + p1) * Math.cos(at.getX(i) * 4 + p2)));
      geometry.computeVertexNormals();
      const mesh = s.mesh(geometry, skin, [x, y, z]);
      mesh.rotation.y = turn;
      return mesh;
    };
    const turn = (random() - 0.5) * 0.24, cz = 0.2 + l / 2;
    spread(w, l, stock[0], 0, cz, 0.004, turn);
    const tip = new THREE.Vector3(0, 0.09, -l / 2 + 0.06).applyAxisAngle(new THREE.Vector3(0, 1, 0), turn);
    const across = new THREE.Vector3(w / 2, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), turn);
    roll(new THREE.Vector3(0, 0, cz).add(tip).sub(across), new THREE.Vector3(0, 0, cz).add(tip).add(across), 0.085, stock[0]);

    if (a.open === 'tea') {
      const brass = s.material('#c99a3c', { metalness: 0.8, roughness: 0.3 });
      const tx = (random() - 0.5) * w * 0.3, tz = cz + (random() - 0.3) * l * 0.2;
      s.lathe([[0, 0], [0.25, 0.006], [0.28, 0.035]], brass, [tx, 0.03, tz]);
      const tea = s.material('#c98a1e', { roughness: 0.2, emissive: '#c98a1e', emissiveIntensity: 0.25 });
      const count = 2 + Math.floor(random() * 3);
      for (let k = 0; k < count; k++) {
        const angle = k * 1.4 + random(), gx = tx + Math.cos(angle) * 0.16, gz = tz + Math.sin(angle) * 0.16;
        s.cylinder(0.038, 0.03, 0.11, [gx, 0.09, gz], tea, 12);
        s.cylinder(0.039, 0.039, 0.014, [gx, 0.146, gz], brass, 12);
      }
      const silver = s.material('#d5d8da', { metalness: 0.9, roughness: 0.25 });
      s.lathe([[0.04, 0], [0.075, 0.03], [0.08, 0.08], [0.05, 0.13], [0.035, 0.15], [0.045, 0.16], [0.01, 0.2], [0, 0.21]], silver, [tx - 0.04, 0.04, tz - 0.04]);
      s.tube([[tx + 0.03, 0.1, tz - 0.04], [tx + 0.1, 0.13, tz - 0.04], [tx + 0.13, 0.2, tz - 0.04]], 0.01, silver);
    } else if (a.open === 'flipped') {
      // The near end is thrown back on itself, pale knotted underside up.
      const yAxis = new THREE.Vector3(0, 1, 0);
      const local = (x: number, y: number, z: number) => new THREE.Vector3(x, 0, z).applyAxisAngle(yAxis, turn).add(new THREE.Vector3(0, y, cz));
      const flap = s.box([w, 0.02, fold], local(0, 0.045, l / 2 - fold / 2).toArray(), s.material('#d9ccaa', { roughness: 1 }));
      flap.rotation.y = turn;
      const lines = s.material('#a8966c', { roughness: 1 });
      for (let k = 1; k < 5; k++) s.box([w * 0.94, 0.004, 0.012], local(0, 0.057, l / 2 - fold + k * fold / 5).toArray(), lines).rotation.y = turn;
      roll(local(-w / 2, 0.04, l / 2), local(w / 2, 0.04, l / 2), 0.04, stock[0]);
    } else if (a.open === 'layered') {
      spread(1.2, 1.9, stock[1 + Math.floor(random() * 4)], w * 0.38, cz + 0.2, 0.035, 0.6 + random() * 0.4);
    } else if (a.open === 'cat') {
      const fur = s.material(['#d98a3a', '#2c2a2a', '#9a9a98', '#efe6d6'][Math.floor(random() * 4)], { roughness: 1 });
      const kx = (random() - 0.5) * w * 0.3, kz = cz + (random() - 0.5) * l * 0.3;
      s.ball([0.2, 0.09, 0.14], [kx, 0.1, kz], fur, 16);
      s.ball([0.075, 0.068, 0.075], [kx + 0.17, 0.09, kz + 0.07], fur, 14);
      for (const side of [-1, 1]) s.mesh(new THREE.ConeGeometry(0.025, 0.045, 4), fur, [kx + 0.17 + side * 0.035, 0.16, kz + 0.07 - side * 0.02]);
      s.tube([[kx - 0.18, 0.04, kz], [kx - 0.2, 0.04, kz + 0.14], [kx - 0.06, 0.04, kz + 0.19], [kx + 0.08, 0.04, kz + 0.17]], 0.022, fur);
    }
    return s.finish();
  },
});
