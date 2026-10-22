import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { brickTexture, grime, panel, pick, tiledBox, write } from './lib';

const MESSAGES = {
  pun: 'A groaning pun: "CH  CH / WHAT IS MISSING? / U R".',
  scripture: 'A plain verse: "BE STILL AND KNOW THAT I AM GOD".',
  'fish-fry': 'A supper notice: "FISH FRY FRIDAY, 5 PM TIL GONE, ALL WELCOME".',
  memorial: 'A homegoing notice in loving memory of a named sister, with the service time.',
  revival: 'REVIVAL NIGHTLY 7 PM, COME AS YOU ARE.',
  wedding: 'Congratulations to a newly married couple, with a date.',
  heat: 'A weary joke: "TOO HOT TO KEEP CHANGING SIGN / SIN BAD / JESUS GOOD".',
  welcome: 'A soft invitation: "YOU ARE NOT TOO FAR GONE / COME HOME".',
  blank: 'Nothing at all: empty tracks and one or two stranded letters.',
} as const;
const LINES: Record<keyof typeof MESSAGES, string[]> = {
  pun: ['CH    CH', 'WHAT IS', 'MISSING?', 'U R'],
  scripture: ['BE STILL AND', 'KNOW THAT', 'I AM GOD', 'PSALM 46:10'],
  'fish-fry': ['FISH FRY', 'FRIDAY 5 PM', 'TIL GONE', 'ALL WELCOME'],
  memorial: ['IN LOVING MEMORY', 'SISTER RUTH', 'HOMEGOING', 'SAT 11 AM'],
  revival: ['REVIVAL', 'NIGHTLY 7 PM', 'COME AS', 'YOU ARE'],
  wedding: ['CONGRATS', 'DEJA + MARCUS', 'JUNE 14', 'GOD BLESS'],
  heat: ['TOO HOT TO KEEP', 'CHANGING SIGN', 'SIN BAD', 'JESUS GOOD'],
  welcome: ['YOU ARE NOT', 'TOO FAR GONE', 'COME HOME', 'SUN 11 AM'],
  blank: ['', '   E', '', '        M'],
};
const NAMES = {
  'mt-zion': 'MT. ZION A.M.E.',
  'first-baptist': 'FIRST BAPTIST',
  'new-hope': 'NEW HOPE MISSIONARY BAPTIST',
  'st-luke': 'ST. LUKE LUTHERAN',
  'full-gospel': 'FULL GOSPEL TABERNACLE',
  'san-miguel': 'IGLESIA SAN MIGUEL',
  'union-chapel': 'UNION CHAPEL METHODIST',
} as const;

export default defineThing({
  questions: {
    style: choice('What kind of sign structure is it?', {
      'brick-monument': 'A low, wide red-brick monument with two brick piers and a concrete cap, solid and well funded.',
      'post-lightbox': 'A lit plastic cabinet up on two steel posts above a small brick planter, visible from the highway.',
      'arched-brick': 'A tall brick slab with an arched top and a cross above, the board set into it like a window.',
      'painted-plywood': 'A hand-painted plywood board on two wooden posts with a little shingled roof, on a few courses of block.',
    }),
    message: choice('What does the changeable-letter board say?', MESSAGES),
    letters: choice('What state are the letters in?', {
      complete: 'Every letter straight and in place, changed this week.',
      'few-missing': 'A few letters have dropped out, so words have gaps.',
      crooked: 'Letters sit tilted and uneven, some upside down or swapped for red ones because the box ran short.',
      'mostly-fallen': 'Most letters have fallen and lie in the grass; only fragments of the message remain.',
    }),
    name: choice('Which congregation does the header name?', {
      'mt-zion': 'Mt. Zion A.M.E., a historic Black congregation.',
      'first-baptist': 'First Baptist, the big church in a small town.',
      'new-hope': 'New Hope Missionary Baptist.',
      'st-luke': 'St. Luke Lutheran, Midwestern and reserved.',
      'full-gospel': 'Full Gospel Tabernacle, Pentecostal and loud.',
      'san-miguel': 'Iglesia San Miguel, a Spanish-speaking parish.',
      'union-chapel': 'Union Chapel Methodist, tiny and old.',
    }),
    glow: noul('Is the board lit from within?'),
    foot: choice('What is at the foot of the sign?', {
      flowers: 'A tended bed of marigolds and petunias.',
      mulch: 'Bare mulch and two clipped shrubs.',
      weeds: 'Tall weeds and grass nobody mows.',
      flags: 'Small flags and a few memorial candles and bouquets left at the base.',
      nothing: 'Just mown grass.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const lit = a.glow;
    const glow = lit ? mix(0.45, 1, Math.abs(mood.daylight - 0.5) * 2) : 0;

    const brickTone = pick(random, ['#9a4b38', '#a3573f', '#8a4334', '#b0674a']);
    const brick = new THREE.MeshStandardMaterial({ map: brickTexture(random, brickTone, '#cfc6b4', wear), roughness: 0.9 });
    const concrete = s.material('#cfcabd', { roughness: 0.95 });
    const frameColour = { 'brick-monument': '#2c3a33', 'post-lightbox': '#1f3b6e', 'arched-brick': '#3a2a24', 'painted-plywood': '#f1ead8' }[a.style];
    const frame = s.material(frameColour, { roughness: 0.6, metalness: a.style === 'painted-plywood' ? 0 : 0.3 });
    const add = (mesh: THREE.Object3D, at: readonly [number, number, number]) => { mesh.position.set(...at); s.root.add(mesh); return mesh; };

    // The letter board itself: tracks and letters painted on a canvas.
    const boardW = a.style === 'arched-brick' ? 1.5 : a.style === 'painted-plywood' ? 1.7 : 2.0;
    const boardH = a.style === 'post-lightbox' ? 1.0 : 1.05;
    const lines = LINES[a.message];
    const fallen: number[] = [];
    const drawBoard = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const paper = a.style === 'painted-plywood' ? '#ece4cc' : lit ? '#fff9e6' : '#f1efe6';
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, w, h);
      const rows = 4, rowH = h / rows;
      for (let r = 0; r <= rows; r++) { ctx.fillStyle = 'rgba(70,70,66,0.5)'; ctx.fillRect(0, r * rowH - 2, w, 4); }
      const cols = 16, cell = w / (cols + 1);
      lines.forEach((line, r) => {
        const start = (cols - line.length) / 2 + 1;
        [...line].forEach((ch, i) => {
          if (ch === ' ') return;
          let keep = true, tilt = 0, red = false, flip = false;
          if (a.letters === 'few-missing') keep = random() > 0.14;
          if (a.letters === 'mostly-fallen') keep = random() > 0.68;
          if (a.letters === 'crooked') { tilt = (random() - 0.5) * 0.5; red = random() < 0.22; flip = random() < 0.08; }
          else tilt = (random() - 0.5) * 0.04 * (1 + wear * 3);
          if (!keep) { fallen.push(1); return; }
          const x = (start + i) * cell, y = (r + 0.5) * rowH + (a.letters === 'crooked' ? (random() - 0.3) * rowH * 0.12 : 0);
          write(ctx, ch, x, y, rowH * 0.74, red ? '#b3261e' : '#16181a', { tilt: tilt + (flip ? Math.PI : 0), max: cell * 0.9 });
        });
      });
      grime(ctx, w, h, wear * 0.9, random, a.style === 'painted-plywood' ? '90,70,40' : '120,110,60');
    };
    const board = panel(boardW, boardH, drawBoard, { px: 640, glow: glow * 0.8, roughness: 0.5 });
    const header = (w: number, h: number, ink: string, paper: string) => panel(w, h, (ctx, cw, ch) => {
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, cw, ch);
      const words = NAMES[a.name].split(' ');
      const two = NAMES[a.name].length > 16;
      if (two) {
        const cut = Math.ceil(words.length / 2);
        write(ctx, words.slice(0, cut).join(' '), cw / 2, ch * 0.3, ch * 0.34, ink, { max: cw * 0.92 });
        write(ctx, words.slice(cut).join(' '), cw / 2, ch * 0.7, ch * 0.34, ink, { max: cw * 0.92 });
      } else write(ctx, NAMES[a.name], cw / 2, ch * 0.5, ch * 0.5, ink, { max: cw * 0.92 });
      grime(ctx, cw, ch, wear * 0.7, random);
    }, { px: 512, glow: glow * 0.5 });

    let boardY = 1.2;
    let baseW = 2.6;
    if (a.style === 'brick-monument') {
      baseW = 3.0;
      add(tiledBox([3.0, 0.55, 0.7], 0.64, brick), [0, 0.275, 0]);
      add(tiledBox([3.1, 0.08, 0.8], 1, concrete), [0, 0.59, 0]);
      for (const x of [-1.27, 1.27]) {
        add(tiledBox([0.46, 1.75, 0.5], 0.64, brick), [x, 1.5, 0]);
        add(tiledBox([0.56, 0.09, 0.6], 1, concrete), [x, 2.42, 0]);
        s.ball([0.11, 0.11, 0.11], [x, 2.56, 0], concrete, 12);
      }
      boardY = 1.25;
      s.box([2.1, boardH + 0.1, 0.22], [0, boardY, 0], frame);
      s.box([2.1, 0.5, 0.22], [0, boardY + boardH / 2 + 0.3, 0], frame);
      for (const z of [0.115, -0.115]) add(header(1.95, 0.4, '#f3ecd6', frameColour), [0, boardY + boardH / 2 + 0.3, z]).rotation.y = z < 0 ? Math.PI : 0;
    } else if (a.style === 'post-lightbox') {
      baseW = 2.4;
      add(tiledBox([2.4, 0.45, 0.9], 0.64, brick), [0, 0.225, 0]);
      add(tiledBox([2.5, 0.07, 1.0], 1, concrete), [0, 0.485, 0]);
      const steel = s.material('#d8d8d2', { metalness: 0.5, roughness: 0.5 });
      for (const x of [-0.8, 0.8]) s.box([0.12, 2.2, 0.12], [x, 1.5, 0], steel);
      boardY = 2.3;
      s.box([2.16, boardH + 0.62, 0.3], [0, boardY + 0.25, 0], frame);
      for (const z of [0.155, -0.155]) add(header(2.0, 0.45, '#ffffff', '#1f3b6e'), [0, boardY + boardH / 2 + 0.26, z]).rotation.y = z < 0 ? Math.PI : 0;
    } else if (a.style === 'arched-brick') {
      baseW = 2.2;
      add(tiledBox([2.2, 0.3, 0.75], 0.64, brick), [0, 0.15, 0]);
      add(tiledBox([1.9, 2.1, 0.45], 0.64, brick), [0, 1.35, 0]);
      const capMap = brickTexture(random, brickTone, '#cfc6b4', wear);
      capMap.repeat.set(3, 3);
      const cap = new THREE.MeshStandardMaterial({ map: capMap, roughness: 0.9 });
      const arch = s.mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.45, 28), s.material(brickTone, { roughness: 0.9 }), [0, 2.4, 0]);
      (arch as THREE.Mesh).material = [s.material(brickTone, { roughness: 0.9 }), cap, cap];
      arch.rotation.x = Math.PI / 2;
      boardY = 1.3;
      s.box([boardW + 0.12, boardH + 0.12, 0.5], [0, boardY, 0], frame);
      for (const z of [0.256, -0.256]) add(header(1.4, 0.36, '#2a221c', '#e7dfc8'), [0, 2.32, z < 0 ? -0.23 : 0.23]).rotation.y = z < 0 ? Math.PI : 0;
      const white = s.material('#f4f1e8');
      s.box([0.09, 0.7, 0.09], [0, 3.65, 0], white);
      s.box([0.42, 0.09, 0.09], [0, 3.75, 0], white);
    } else {
      baseW = 2.3;
      const block = s.material('#b9b5aa', { roughness: 0.95 });
      for (const x of [-0.95, 0.95]) s.box([0.42, 0.4, 0.42], [x, 0.2, 0], block);
      const wood = s.material(wear > 0.5 ? '#8f8674' : '#e9e2cf');
      const lean = (random() - 0.5) * 0.06 * (1 + wear * 3);
      for (const x of [-0.95, 0.95]) s.box([0.11, 2.5, 0.11], [x, 1.5, 0], wood).rotation.z = lean * 0.3;
      boardY = 1.45;
      s.box([boardW + 0.16, boardH + 0.75, 0.05], [0, boardY + 0.3, 0], frame);
      for (const z of [0.03, -0.03]) add(header(1.7, 0.5, '#7a1f1f', '#f1ead8'), [0, boardY + boardH / 2 + 0.32, z]).rotation.y = z < 0 ? Math.PI : 0;
      // A little shingled gable roof.
      const shingle = s.material('#4d4038', { roughness: 0.95 });
      for (const side of [-1, 1]) {
        const slab = s.box([1.25, 0.05, 0.5], [side * 0.56, 2.86, 0], shingle);
        slab.rotation.z = -side * 0.42;
      }
      s.root.rotation.z = lean;
    }

    const depth = { 'brick-monument': 0.116, 'post-lightbox': 0.156, 'arched-brick': 0.256, 'painted-plywood': 0.032 }[a.style];
    add(board, [0, boardY, depth]);
    const back = add(board.clone(), [0, boardY, -depth]);
    back.rotation.y = Math.PI;

    // Fallen letters lie in the grass in front.
    const letterMat = s.material('#1a1c1d');
    const dropped = Math.min(fallen.length, 26);
    for (let i = 0; i < dropped; i++) {
      const tile = s.box([0.09, 0.006, 0.13], [(random() - 0.5) * baseW, 0.004 + random() * 0.01, 0.55 + random() * 0.6], letterMat);
      tile.rotation.y = random() * Math.PI;
    }

    // The foot of the sign.
    const front = 0.62;
    if (a.foot === 'flowers' || a.foot === 'mulch' || a.foot === 'flags') {
      s.box([baseW + 0.5, 0.06, 0.55], [0, 0.03, front + 0.1], s.material('#5a3f2c', { roughness: 1 }));
    }
    if (a.foot === 'flowers') {
      const colours = mood.cheer > 0.4 ? ['#f2a620', '#e8552d', '#d93f87', '#f4e04a', '#ffffff'] : ['#b9a676', '#a58aa0', '#d8d2c0'];
      const count = Math.round(mix(14, 70, mood.density));
      s.scatter(new THREE.SphereGeometry(1, 7, 5), s.material('#ffffff'), Array.from({ length: count }, () => ({
        at: [(random() - 0.5) * (baseW + 0.3), 0.14 + random() * 0.1, front - 0.1 + random() * 0.4] as const, size: 0.045 + random() * 0.035, color: pick(random, colours),
      })));
      s.scatter(new THREE.ConeGeometry(0.6, 1.6, 5), s.material('#4f7a3a'), Array.from({ length: count }, () => ({
        at: [(random() - 0.5) * (baseW + 0.3), 0.08, front - 0.1 + random() * 0.4] as const, size: 0.07 + random() * 0.04,
      })));
    } else if (a.foot === 'mulch') {
      for (const x of [-baseW / 2 + 0.2, baseW / 2 - 0.2]) s.ball([0.34, 0.28, 0.3], [x, 0.26, front + 0.1], s.material('#3f6a3a'), 10);
    } else if (a.foot === 'weeds') {
      const count = Math.round(mix(40, 140, (mood.density + wear) / 2));
      s.scatter(new THREE.ConeGeometry(0.25, 2, 4), s.material('#7d8a4a'), Array.from({ length: count }, () => {
        const angle = random() * Math.PI * 2, r = 0.5 + random() * 0.9;
        return { at: [Math.cos(angle) * r * baseW * 0.6, 0.1 + random() * 0.25, Math.sin(angle) * r * 0.7] as const, size: 0.14 + random() * 0.3, color: pick(random, ['#7d8a4a', '#9a9a52', '#5f7a3c', '#b3a25a']) };
      }));
    } else if (a.foot === 'flags') {
      const pole = s.material('#c9c9c0', { metalness: 0.4 });
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * baseW * 0.2 + (random() - 0.5) * 0.1, z = front + random() * 0.25;
        s.rod([x, 0, z], [x, 0.5, z], 0.006, pole);
        s.box([0.16, 0.11, 0.008], [x + 0.08, 0.44, z], s.material(pick(random, ['#b3261e', '#f1efe6', '#27408b'])));
      }
      for (let i = 0; i < 4; i++) {
        const x = (random() - 0.5) * baseW * 0.9, z = front + 0.25 + random() * 0.2;
        s.cylinder(0.035, 0.035, 0.14, [x, 0.13, z], s.material('#f4ead0', { emissive: '#ffb14a', emissiveIntensity: 0.5 }), 10);
      }
      for (let i = 0; i < 3; i++) {
        const x = (random() - 0.5) * baseW * 0.8, z = front + 0.05 + random() * 0.2;
        const bunch = s.cylinder(0.11, 0.03, 0.32, [x, 0.14, z], s.material('#3f6a3a'), 8);
        bunch.rotation.x = Math.PI / 2 - 0.3;
        s.ball([0.12, 0.09, 0.09], [x, 0.2, z + 0.17], s.material(pick(random, ['#e8e2d0', '#d93f57', '#f2c230'])), 8);
      }
    }

    return s.finish();
  },
});
