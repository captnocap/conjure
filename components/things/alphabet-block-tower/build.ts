import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const WORDS = { love: 'LOVE', home: 'HOME', mama: 'MAMA', dada: 'DADA', baby: 'BABY', no: 'NO', bye: 'BYE', help: 'HELP' } as const;
const NAMES = ['MIA', 'LEO', 'NOAH', 'EVA', 'SAM', 'LILY', 'MAX', 'ROSA', 'FINN', 'ADA', 'THEO', 'IVY', 'OMAR', 'JUNE'];
const PALETTES = {
  classic: ['#d0392e', '#2d6db5', '#3d9953', '#e8b32c', '#e07a28'],
  pastel: ['#e9a6b0', '#9cc3e2', '#a9d8b4', '#f2dc94', '#c9b2e2'],
  natural: ['#7a4a2a', '#7a4a2a', '#5d3a22', '#8a5a34', '#6b4226'],
  vintage: ['#a8443a', '#3f5f8a', '#5c7a52', '#c29a3e', '#3a3632'],
} as const;
const ANIMALS = ['cat', 'bunny', 'fish', 'duck', 'star', 'heart'] as const;

export default defineThing({
  questions: {
    spell: choice('What do the letters facing us spell?', {
      name: "A child's first name.",
      jumble: 'Nothing: a meaningless jumble of letters and pictures.',
      abc: 'The start of the alphabet, in order.',
      love: 'LOVE.', home: 'HOME.', mama: 'MAMA.', dada: 'DADA.', baby: 'BABY.',
      no: 'NO: a toddler\'s favourite word.',
      bye: 'BYE.',
      help: 'HELP: unsettling, in a nursery.',
    }),
    state: choice('What state is the tower in?', {
      standing: 'Standing straight, carefully squared up, proudly finished.',
      teetering: 'Teetering: every block a little off, leaning, about to go.',
      toppled: 'Just toppled: the top half lies spilled to one side of the stump.',
      scattered: 'Knocked flat: only a block or two still stacked, the rest strewn about.',
    }),
    stack: choice('How are the blocks built up?', {
      column: 'A single tall column, one block on another.',
      pyramid: 'A stepped pyramid wall, a wide row at the bottom.',
      twin: 'Two short towers bridged by a block across the top.',
    }),
    height: score('How many blocks went into it?', ['Three or four', 'Half a dozen', 'A tall wobbly eight', 'Ten or more, taller than the baby']),
    paint: choice('How are the blocks painted?', {
      classic: 'Bright primary colours on pale wood, the classic set.',
      pastel: 'Soft nursery pastels.',
      natural: 'Unpainted wood with letters burnt in brown.',
      vintage: 'An old lithographed set, cream paper faces with dull red and blue.',
    }),
    topper: choice('What is balanced on top or lying beside it?', {
      none: 'Nothing.',
      ball: 'A small red wooden ball.',
      duck: 'A yellow rubber duck.',
      ring: 'A chunky wooden stacking ring.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const B = 0.045;
    const palette = PALETTES[a.paint];
    const wood = a.paint === 'vintage' ? '#e9dfc4' : '#e2c495';
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    const cache = new Map<string, THREE.MeshStandardMaterial>();
    const face = (glyph: string, colour: string, solid: boolean) => {
      const key = `${glyph}|${colour}|${solid}`;
      const hit = cache.get(key);
      if (hit) return hit;
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const g = canvas.getContext('2d')!;
      const ink = solid ? '#fbf6ea' : colour;
      g.fillStyle = solid ? colour : wood; g.fillRect(0, 0, 128, 128);
      if (!solid && a.paint !== 'vintage') { g.strokeStyle = 'rgba(150,110,60,0.18)'; for (let y = 6; y < 128; y += 9) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(40, y + 5, 90, y - 5, 128, y + 2); g.stroke(); } }
      g.strokeStyle = ink; g.lineWidth = 7; g.strokeRect(13, 13, 102, 102);
      g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = 5; g.lineJoin = 'round';
      if (glyph.length === 1) {
        g.font = 'bold 84px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(glyph, 64, 69);
      } else if (glyph === 'star') {
        g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 16 : 38, q = i * Math.PI / 5 - Math.PI / 2; g.lineTo(64 + Math.cos(q) * r, 66 + Math.sin(q) * r); } g.fill();
      } else if (glyph === 'heart') {
        g.beginPath(); g.moveTo(64, 98); g.bezierCurveTo(10, 60, 34, 22, 64, 48); g.bezierCurveTo(94, 22, 118, 60, 64, 98); g.fill();
      } else if (glyph === 'fish') {
        g.beginPath(); g.ellipse(56, 64, 32, 20, 0, 0, 7); g.fill();
        g.beginPath(); g.moveTo(82, 64); g.lineTo(106, 44); g.lineTo(106, 84); g.fill();
        g.fillStyle = solid ? colour : wood; g.beginPath(); g.arc(40, 58, 4, 0, 7); g.fill();
      } else if (glyph === 'cat') {
        g.beginPath(); g.arc(64, 72, 30, 0, 7); g.fill();
        g.beginPath(); g.moveTo(36, 64); g.lineTo(40, 28); g.lineTo(62, 48); g.moveTo(92, 64); g.lineTo(88, 28); g.lineTo(66, 48); g.fill();
        g.fillStyle = solid ? colour : wood; for (const x of [52, 76]) { g.beginPath(); g.arc(x, 68, 4.5, 0, 7); g.fill(); } g.fillRect(61, 80, 6, 4);
      } else if (glyph === 'bunny') {
        g.beginPath(); g.arc(64, 80, 24, 0, 7); g.fill();
        for (const x of [52, 76]) { g.beginPath(); g.ellipse(x, 42, 8, 24, (x - 64) * 0.012, 0, 7); g.fill(); }
        g.fillStyle = solid ? colour : wood; for (const x of [55, 73]) { g.beginPath(); g.arc(x, 76, 4, 0, 7); g.fill(); }
      } else {
        g.beginPath(); g.ellipse(60, 78, 32, 20, 0, 0, 7); g.fill();
        g.beginPath(); g.arc(84, 52, 16, 0, 7); g.fill();
        g.beginPath(); g.moveTo(98, 50); g.lineTo(114, 56); g.lineTo(98, 60); g.fill();
        g.beginPath(); g.moveTo(30, 74); g.lineTo(20, 56); g.lineTo(44, 66); g.fill();
      }
      // Chips and rubbed corners.
      const chips = Math.floor(mood.wear * 26);
      g.fillStyle = a.paint === 'vintage' ? '#c9b98f' : '#d3b17c';
      for (let i = 0; i < chips; i++) { const edge = random() < 0.6; const x = edge ? (random() < 0.5 ? random() * 16 : 112 + random() * 16) : random() * 128; g.beginPath(); g.ellipse(x, random() * 128, 3 + random() * 7, 2 + random() * 4, random() * 3, 0, 7); g.fill(); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshStandardMaterial({ map: texture, roughness: mix(0.45, 0.85, mood.wear) });
      cache.set(key, material);
      return material;
    };

    const cube = new RoundedBoxGeometry(B, B, B, 3, 0.0035);
    let made = 0;
    const block = (front: string | null) => {
      const tint = palette[(made++ + Math.floor(random() * 2)) % palette.length];
      const other = pick(palette);
      const main = face(front ?? pick([...ANIMALS]), tint, false);
      const picture = face(pick([...ANIMALS]), other, a.paint !== 'natural');
      const spare = face(letters[Math.floor(random() * 26)], other, false);
      const mesh = new THREE.Mesh(cube, [picture, spare, spare, picture, main, face(letters[Math.floor(random() * 26)], tint, a.paint === 'classic' || a.paint === 'pastel')]);
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };

    const word = a.spell === 'name' ? pick(NAMES) : a.spell === 'jumble' ? '' : a.spell === 'abc' ? 'ABCDEFGHIJ' : WORDS[a.spell];
    let count = Math.round(mix(3, 10, a.height) + random() * 1.4);
    if (a.spell !== 'abc' && a.spell !== 'jumble') count = Math.max(count, word.length + (a.stack === 'twin' ? word.length : 0));

    // Lay out where every block would sit in the finished build, top-of-word first.
    type Seat = { x: number; level: number; glyph: string | null };
    const seats: Seat[] = [];
    const glyphAt = (i: number) => (a.spell === 'jumble' ? (random() < 0.6 ? letters[Math.floor(random() * 26)] : null) : i < word.length ? word[i] : random() < 0.5 ? null : letters[Math.floor(random() * 26)]);
    if (a.stack === 'column') {
      for (let i = 0; i < count; i++) seats.push({ x: 0, level: count - 1 - i, glyph: glyphAt(i) });
    } else if (a.stack === 'pyramid') {
      const base = Math.max(a.spell === 'jumble' || a.spell === 'abc' ? 3 : word.length, Math.min(5, Math.ceil((Math.sqrt(8 * count + 1) - 1) / 2)));
      let k = 0;
      for (let row = 0; row < base; row++) for (let i = 0; i < base - row; i++) seats.push({ x: (i - (base - row - 1) / 2) * B * 1.04, level: row, glyph: row === 0 ? glyphAt(i) : glyphAt(base + k++) });
      seats.reverse();
    } else {
      const tall = Math.max(2, Math.min(5, Math.floor((count - 1) / 2)));
      seats.push({ x: 0, level: tall, glyph: glyphAt(0) });
      for (let i = 0; i < tall; i++) for (const side of [-1, 1]) seats.push({ x: side * B * 0.76, level: tall - 1 - i, glyph: glyphAt(1 + i * 2 + (side + 1) / 2) });
    }
    const topLevel = Math.max(...seats.map((seat) => seat.level));
    const keep = a.state === 'toppled' ? Math.ceil((topLevel + 1) * 0.45) : a.state === 'scattered' ? 1 + Math.floor(random() * 1.6) : topLevel + 1;

    const standing: { mesh: THREE.Mesh; x: number; level: number }[] = [];
    const loose = a.state === 'teetering' ? 1 : a.state === 'standing' ? 0.12 : 0.5;
    const drift = (random() < 0.5 ? -1 : 1) * loose * 0.006, fall = random() < 0.5 ? -1 : 1;
    let spilled = 0;
    for (const seat of seats) {
      const mesh = block(seat.glyph);
      if (seat.level < keep) {
        const x = seat.x + drift * seat.level ** 1.25 + (random() - 0.5) * 0.012 * loose;
        mesh.position.set(x, B / 2 + seat.level * B, (random() - 0.5) * 0.012 * loose);
        mesh.rotation.y = (random() - 0.5) * 0.7 * loose;
        if (a.state === 'teetering' && seat.level === topLevel && a.stack !== 'pyramid') mesh.rotation.z = -Math.sign(drift) * 0.09;
        standing.push({ mesh, x, level: seat.level });
      } else {
        // Spilled: tumbled out in the direction of the fall, roughly keeping their order.
        const far = a.state === 'scattered' ? 0.06 + random() * 0.1 : 0.075 + (seat.level - keep) * B * 1.15 + random() * 0.02;
        const angle = a.state === 'scattered' ? random() * Math.PI * 2 : (fall > 0 ? 0 : Math.PI) + (random() - 0.5) * 0.7 + spilled * 0.05;
        mesh.position.set(seat.x * 0.5 + Math.cos(angle) * far, B / 2, Math.sin(angle) * far * 0.9 + 0.02);
        const quarter = Math.PI / 2;
        mesh.rotation.set(random() < 0.35 ? -quarter : 0, (random() - 0.5) * 1.3, a.state === 'toppled' ? -fall * quarter * (random() < 0.7 ? 1 : 0) : Math.floor(random() * 4) * quarter, 'YXZ');
        spilled++;
      }
    }
    // Strays that never made it into the tower.
    const strays = Math.round(mix(0, 5, mood.density) + (a.state === 'standing' ? 0 : 1));
    for (let i = 0; i < strays; i++) {
      const mesh = block(random() < 0.5 ? letters[Math.floor(random() * 26)] : null);
      const angle = Math.PI * (0.15 + 0.7 * random()) * (random() < 0.5 ? 1 : -1) + Math.PI / 2, far = 0.085 + random() * 0.07;
      mesh.position.set(Math.cos(angle) * far, B / 2, Math.sin(angle) * far * 0.8 - 0.03);
      mesh.rotation.set(Math.floor(random() * 4) * Math.PI / 2, random() * 6, 0, 'YXZ');
    }

    // The topper.
    let topper: THREE.Object3D | null = null;
    const up = a.state === 'standing' || a.state === 'teetering';
    const crown = standing.reduce((best, item) => (item.level > best.level ? item : best), standing[0]);
    const tx = up ? crown.mesh.position.x : -fall * (0.08 + random() * 0.03), ty = up ? (crown.level + 1) * B : 0, tz = up ? 0 : 0.08 + random() * 0.04;
    if (a.topper === 'ball') topper = s.ball([0.019, 0.019, 0.019], [tx, ty + 0.019, tz], s.material('#cf3a2f', { roughness: 0.35 }), 18);
    else if (a.topper === 'ring') { topper = s.ring(0.022, 0.011, [tx, ty + 0.011, tz], s.material(palette[1], { roughness: 0.4 })); topper.rotation.x = Math.PI / 2; }
    else if (a.topper === 'duck') {
      const duck = new THREE.Group(); duck.position.set(tx, ty, tz); duck.rotation.y = random() * 6; s.root.add(duck);
      const yellow = s.material('#f2c628', { roughness: 0.35 });
      duck.add(s.ball([0.02, 0.015, 0.016], [0, 0.015, 0], yellow, 14));
      duck.add(s.ball([0.012, 0.012, 0.012], [0.012, 0.034, 0], yellow, 12));
      duck.add(s.ball([0.008, 0.003, 0.006], [0.025, 0.032, 0], s.material('#e8742a'), 8));
      duck.add(s.ball([0.008, 0.006, 0.01], [-0.02, 0.02, 0], yellow, 8));
      topper = duck;
    }

    const sway = up ? mix(0.0004, 0.004, mood.energy) * (a.state === 'teetering' ? 1.6 : 0.4) : 0;
    const phase = random() * 6, topX = topper?.position.x ?? 0;
    return s.finish({
      update: (_dt, time) => {
        if (!sway) return;
        const lean = Math.sin(time * 2.3 + phase) + Math.sin(time * 5.1 + phase) * 0.3;
        for (const item of standing) item.mesh.position.x = item.x + lean * sway * item.level ** 1.3;
        if (topper) topper.position.x = topX + lean * sway * (crown.level + 1) ** 1.3;
      },
    });
  },
});
