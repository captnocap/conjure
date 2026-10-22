import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const SIGNS = {
  putters: 'PUTTERS',
  return: 'RETURN CLUBS HERE',
  deposit: '£1 DEPOSIT',
  lefties: 'LEFT-HANDED? ASK',
  cheats: 'NO CHEATING',
} as const;
const SIZE_BANDS = ['#d8322b', '#f2b90f', '#2c6fd0', '#2f9a52', '#22262a'];
const PALETTES = {
  mixed: ['#e23b2e', '#f4c20d', '#2f7fd6', '#ef7f1a', '#d94f9b', '#44b85a', '#f2ecdc'],
  white: ['#f4f0e4', '#ebe6d6', '#f8f5ec', '#dcd6c4'],
  fluoro: ['#d9ff2e', '#ff5fa2', '#ff8a1f', '#49f08a', '#39d3ff'],
  sunset: ['#ef7f1a', '#e23b2e', '#f4c20d', '#f29a4a'],
  pastel: ['#e9b9b3', '#e8dba4', '#a9c4de', '#b5d6b8', '#d9c0dd'],
} as const;

export default defineThing({
  questions: {
    putters: choice('How many putters are left in the rack?', {
      full: 'Every slot filled, a neat organ-pipe row from toddler size to adult.',
      most: 'Most of them, with a couple of gaps where a family is still out on the course.',
      few: 'Only three or four, a busy afternoon.',
      one: 'A single putter, the one nobody wants.',
      none: 'An empty rack: every club is out, or the season is over.',
    }),
    grips: choice('How are the grips coloured?', {
      sized: 'Colour-coded by height: red for the smallest, then yellow, blue, green and black for adults.',
      black: 'All plain black rubber.',
      mixed: 'A jumble of whatever coloured grips were bought over the years.',
      taped: 'Black grips wound with bright electrical tape where they split.',
    }),
    balls: choice('What colour are the balls in the bucket?', {
      mixed: 'Every colour, so each player can claim their own.',
      white: 'Old white range balls, yellowed and anonymous.',
      fluoro: 'Fluorescent yellow, pink, orange and green.',
      sunset: 'Oranges, reds and yellows only.',
      pastel: 'Sun-bleached pastels that used to be bright.',
    }),
    fill: score('How full is the ball container?', ['A few rolling in the bottom', 'Half full', 'Heaped over the rim']),
    container: choice('What are the balls kept in?', {
      bucket: 'A galvanised steel bucket with a wire handle.',
      seaside: 'A bright plastic seaside bucket with a white handle.',
      bowl: 'A wide washing-up bowl.',
      crate: 'A square plastic milk crate.',
    }),
    sign: choice('What does the board along the top say?', SIGNS),
    left: choice('What was left behind at the rack?', {
      nothing: 'Nothing, everything is in its place.',
      snapped: 'A putter snapped in two, laid on the ground in disgrace.',
      scorecard: 'One scorecard propped up, with a suspicious hole-in-one ringed in red.',
      glove: "A child's small bright glove, hung on the post in case they come back.",
      hat: 'A sun hat forgotten on top of the post.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const grey = new THREE.Color('#8e8a80');
    const timber = (hex: string) => s.material(new THREE.Color(hex).lerp(grey, mood.wear * 0.55), { roughness: 0.85 });
    const wood = timber('#b58549'), darkWood = timber('#7c5630');
    const steel = s.material('#aeb4b5', { metalness: 0.7, roughness: 0.35 });
    const dark = s.material('#1c1f22', { roughness: 0.7 });

    // Frame: a base board, three posts, a trough for the heads, a notched rail and a header board.
    s.box([1.86, 0.05, 0.5], [0, 0.025, 0.05], darkWood);
    for (const x of [-0.88, 0.36, 0.88]) s.box([0.07, x === 0.36 ? 0.86 : 1.36, 0.07], [x, x === 0.36 ? 0.48 : 0.73, -0.1], wood);
    s.box([1.2, 0.035, 0.2], [-0.26, 0.08, 0.06], wood);
    s.box([1.2, 0.07, 0.025], [-0.26, 0.11, 0.165], wood);
    s.box([1.2, 0.05, 0.06], [-0.26, 0.56, -0.07], wood);
    s.box([1.9, 0.22, 0.03], [0, 1.3, -0.06], timber('#f1e9d2'));
    const board = s.label(SIGNS[a.sign], 1.8, 0.17, [0, 1.3, -0.043], '#1d3f7a', '#f3ecd6');
    board.rotation.z = (random() - 0.5) * 0.03;

    // Putters, shortest on the left.
    const slots = 10;
    const keep = { full: 10, most: 7, few: 3 + Math.floor(random() * 2), one: 1, none: 0 }[a.putters];
    const order = Array.from({ length: slots }, (_u, i) => i).sort(() => random() - 0.5);
    const present = new Set(order.slice(0, keep));
    const any = PALETTES.mixed;
    const makePutter = (length: number, band: number) => {
      const group = new THREE.Group();
      const gripHex = a.grips === 'sized' ? SIZE_BANDS[band] : a.grips === 'mixed' ? any[Math.floor(random() * any.length)] : '#23272b';
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number, z = 0) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
      };
      add(new THREE.CylinderGeometry(0.012, 0.012, length, 8), steel, length / 2);
      add(new THREE.CylinderGeometry(0.027, 0.021, 0.26, 10), s.material(gripHex, { roughness: 0.8 }), length - 0.12);
      if (a.grips === 'taped') add(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10), s.material(any[Math.floor(random() * any.length)]), length - 0.06 - random() * 0.12);
      add(new THREE.BoxGeometry(0.036, 0.04, 0.13), dark, 0.018, 0.045);
      s.root.add(group);
      return group;
    };
    for (let i = 0; i < slots; i++) {
      const x = -0.79 + i * 0.118;
      s.rod([x - 0.059, 0.56, -0.05], [x - 0.059, 0.56, 0.03], 0.009, darkWood);
      if (!present.has(i)) continue;
      const length = mix(0.52, 1.02, i / (slots - 1)) + (random() - 0.5) * 0.03;
      const putter = makePutter(length, Math.min(4, Math.floor(i / 2)));
      putter.position.set(x + (random() - 0.5) * 0.02, 0.1, 0.02);
      putter.rotation.x = -Math.atan2(0.09, 0.46);
      putter.rotation.z = (random() - 0.5) * 0.08;
    }

    // Shelf with the pencil box and the scorecard stack.
    s.box([0.52, 0.03, 0.34], [0.62, 0.82, 0.02], wood);
    s.box([0.03, 0.03, 0.3], [0.62, 0.7, 0.02], wood).rotation.x = 0.5;
    const tray = timber('#d8c9a6');
    s.box([0.2, 0.012, 0.14], [0.51, 0.841, 0.05], tray);
    for (const [w, d, x, z] of [[0.2, 0.012, 0, 0.07], [0.2, 0.012, 0, -0.07], [0.012, 0.14, 0.1, 0], [0.012, 0.14, -0.1, 0]] as const) s.box([w, 0.08, d], [0.51 + x, 0.875, 0.05 + z], tray);
    for (let i = 0; i < 9 + Math.round(mood.density * 8); i++) {
      const x = 0.43 + random() * 0.16, z = 0.0 + random() * 0.1, lean = (random() - 0.5) * 0.07, h = 0.09 + random() * 0.05;
      s.rod([x, 0.85, z], [x + lean, 0.85 + h, z + lean], 0.007, s.material(['#f2c230', '#d8322b', '#2c6fd0', '#2f9a52'][Math.floor(random() * 4)]));
      s.rod([x + lean, 0.85 + h, z + lean], [x + lean * 1.15, 0.865 + h, z + lean * 1.15], 0.007, dark, 0.001);
    }
    const cards = 0.02 + mood.density * 0.06;
    s.box([0.13, cards, 0.21], [0.75, 0.835 + cards / 2, 0.04], s.material('#f6f1e0')).rotation.y = (random() - 0.5) * 0.3;
    const top = s.label('SCORE', 0.12, 0.2, [0.75, 0.837 + cards, 0.04], '#3a6ea5', '#f6f1e0');
    top.rotation.x = -Math.PI / 2;
    top.rotation.z = (random() - 0.5) * 0.5;

    // Ball container under the shelf.
    const bx = 0.62, bz = 0.14;
    const scuff = (hex: string) => new THREE.Color(hex).lerp(grey, mood.wear * 0.35 * random());
    const palette = PALETTES[a.balls];
    const shape = {
      bucket: { top: 0.17, bottom: 0.12, height: 0.3, hex: '#a9afb0', metal: 0.75 },
      seaside: { top: 0.16, bottom: 0.11, height: 0.27, hex: mood.cheer > 0.5 ? '#f2c230' : '#d8322b', metal: 0 },
      bowl: { top: 0.23, bottom: 0.17, height: 0.15, hex: '#3f8fbf', metal: 0 },
      crate: { top: 0.19, bottom: 0.19, height: 0.26, hex: '#2c6fd0', metal: 0 },
    }[a.container];
    const skin = s.material(shape.hex, { metalness: shape.metal, roughness: shape.metal ? 0.4 : 0.55, side: THREE.DoubleSide });
    if (a.container === 'crate') {
      const half = shape.top;
      s.box([half * 2, 0.02, half * 2], [bx, 0.06, bz], skin);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        for (const y of [0.09, 0.19, 0.29]) s.box([dx ? 0.02 : half * 2, 0.045, dz ? 0.02 : half * 2], [bx + dx * half, y, bz + dz * half], skin);
        s.box([0.03, shape.height, 0.03], [bx + (dx || 1) * half * (dz ? dz : 1), 0.05 + shape.height / 2, bz + (dz || -1) * half * (dx ? dx : 1)], skin);
      }
    } else {
      s.lathe([[0.001, 0.012], [shape.bottom, 0.012], [shape.top, shape.height], [shape.top + 0.012, shape.height + 0.004]], skin, [bx, 0.05, bz]);
      if (a.container !== 'bowl') {
        const handle = s.ring(shape.top + 0.005, 0.006, [bx, 0.05 + shape.height, bz], a.container === 'seaside' ? s.material('#f6f1e0') : steel, Math.PI);
        handle.rotation.set(-0.9 - random() * 0.5, 0, 0);
      }
      if (a.container === 'seaside') s.ring((shape.top + shape.bottom) / 2 + 0.004, 0.012, [bx, 0.05 + shape.height * 0.5, bz], s.material('#f6f1e0')).rotation.x = Math.PI / 2;
    }
    const balls: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    const level = mix(0.08, 1.12, a.fill);
    const layers = Math.max(1, Math.round(level * shape.height / 0.05));
    for (let layer = 0; layer < layers; layer++) {
      const y = 0.095 + layer * 0.05;
      const over = y > 0.05 + shape.height;
      const reach = (over ? shape.top * 0.55 : mix(shape.bottom, shape.top, (y - 0.05) / shape.height)) - 0.035;
      const n = layer === layers - 1 && a.fill < 0.2 ? 4 : Math.max(3, Math.round(reach * reach * 420));
      for (let i = 0; i < n; i++) {
        const r = Math.sqrt(random()) * reach, t = random() * Math.PI * 2;
        balls.push({ at: [bx + Math.cos(t) * r, y + random() * 0.02, bz + Math.sin(t) * r], size: 1, color: scuff(palette[Math.floor(random() * palette.length)]) });
      }
    }
    for (let i = 0; i < Math.round(mood.density * 5 + a.fill * 2); i++)
      balls.push({ at: [-0.8 + random() * 1.7, 0.03, 0.34 + random() * 0.2], size: 1, color: scuff(palette[Math.floor(random() * palette.length)]) });
    s.scatter(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: a.balls === 'fluoro' ? '#3a4a10' : '#000000' }), balls);

    // What was left.
    if (a.left === 'snapped') {
      const big = makePutter(0.5, 4), small = makePutter(0.34, 4);
      big.position.set(-0.7, 0.02, 0.44); big.rotation.set(Math.PI / 2, 0, 1.2 + random() * 0.3);
      small.children[small.children.length - 1].visible = false;
      small.children[1].visible = false;
      small.position.set(-0.25, 0.02, 0.4); small.rotation.set(Math.PI / 2, 0, -1.9 + random() * 0.4);
    }
    if (a.left === 'scorecard') {
      const canvas = document.createElement('canvas');
      canvas.width = 180; canvas.height = 256;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#f7f2df'; c.fillRect(0, 0, 180, 256);
      c.fillStyle = '#2f6f4a'; c.fillRect(0, 0, 180, 34);
      c.strokeStyle = '#7b8a93'; c.lineWidth = 2;
      for (let y = 34; y < 256; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(180, y); c.stroke(); }
      for (const x of [44, 112]) { c.beginPath(); c.moveTo(x, 34); c.lineTo(x, 256); c.stroke(); }
      c.fillStyle = '#28303a'; c.font = 'bold 19px monospace'; c.textAlign = 'center';
      const lucky = 2 + Math.floor(random() * 6);
      for (let row = 0; row < 9; row++) {
        c.fillText(String(row + 1), 22, 53 + row * 24);
        c.fillText(String(3 + Math.floor(random() * 4)), 78, 53 + row * 24);
        c.fillText(row === lucky ? '1' : String(2 + Math.floor(random() * 3)), 146, 53 + row * 24);
      }
      c.strokeStyle = '#d6201a'; c.lineWidth = 5;
      c.beginPath(); c.ellipse(146, 46 + lucky * 24, 26, 15, -0.15, 0, 7); c.stroke();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const card = s.mesh(new THREE.PlaneGeometry(0.27, 0.38), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide }), [-0.5, 0.21, 0.36]);
      card.rotation.set(-0.42, 0.15, (random() - 0.5) * 0.12);
      s.box([0.02, 0.36, 0.02], [-0.5, 0.17, 0.27], darkWood).rotation.x = 0.35;
    }
    if (a.left === 'glove') {
      const wool = s.material(mood.cheer > 0.5 ? '#ef4f8f' : '#d8322b', { roughness: 1 });
      s.ball([0.055, 0.075, 0.035], [-0.88, 1.47, -0.1], wool, 12);
      s.ball([0.02, 0.04, 0.02], [-0.83, 1.46, -0.1], wool, 8).rotation.z = -0.7;
      s.cylinder(0.045, 0.05, 0.05, [-0.88, 1.4, -0.1], s.material('#f6f1e0', { roughness: 1 }), 10);
    }
    if (a.left === 'hat') {
      s.lathe([[0.2, 0], [0.09, 0.02], [0.085, 0.09], [0.001, 0.1]], s.material('#e3c98b', { roughness: 1, side: THREE.DoubleSide }), [0.88, 1.41, -0.1]).rotation.z = 0.18;
      s.cylinder(0.09, 0.091, 0.025, [0.875, 1.45, -0.1], s.material('#2c6fd0'), 16).rotation.z = 0.18;
    }

    s.root.rotation.z = (random() - 0.5) * 0.05 * mood.wear;
    return s.finish();
  },
});
