import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Pen = { g: CanvasRenderingContext2D; random: () => number; wobble: number; colours: string[] };

/** Chalk lettering one glyph at a time, so a hand can be neat or unsteady. `_x` is a subscript, `>` an arrow. */
function write(pen: Pen, text: string, x: number, y: number, size: number, colour = pen.colours[0]) {
  const { g, random, wobble } = pen;
  g.fillStyle = g.strokeStyle = colour;
  g.lineWidth = Math.max(2, size * 0.09);
  let cx = x;
  for (let i = 0; i < text.length; i++) {
    let ch = text[i], small = false;
    if (ch === '_') { ch = text[++i]; small = true; }
    const px = small ? size * 0.6 : size;
    g.font = `${px}px "Comic Sans MS", "Segoe Print", "Bradley Hand", cursive`;
    if (ch === '>') {
      const w = size * 1.1, yy = y - size * 0.3;
      g.beginPath(); g.moveTo(cx + 4, yy); g.lineTo(cx + w, yy); g.moveTo(cx + w - size * 0.25, yy - size * 0.18); g.lineTo(cx + w, yy); g.lineTo(cx + w - size * 0.25, yy + size * 0.18); g.stroke();
      cx += w + size * 0.2;
      continue;
    }
    g.save();
    g.translate(cx, y + (small ? size * 0.22 : 0) + (random() - 0.5) * size * 0.22 * wobble);
    g.rotate((random() - 0.5) * 0.3 * wobble);
    g.fillText(ch, 0, 0);
    g.restore();
    cx += g.measureText(ch).width * (1 + (random() - 0.5) * 0.25 * wobble) + (small ? 1 : 0);
  }
  return cx;
}
const line = (pen: Pen, pts: number[][], width = 5, colour = pen.colours[0]) => {
  const { g, random, wobble } = pen;
  g.strokeStyle = colour; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  pts.forEach(([x, y], i) => { const jx = x + (random() - 0.5) * 6 * wobble, jy = y + (random() - 0.5) * 6 * wobble; if (i) g.lineTo(jx, jy); else g.moveTo(jx, jy); });
  g.stroke();
};

const WRITINGS = {
  equations: 'Chemical equations in rows: reactants, arrows, products, one underlined heading.',
  diagram: 'A labelled diagram: an atom with orbiting electrons beside a flask over a burner.',
  lines: 'The same sentence written out again and again for detention, the hand getting worse.',
  farewell: 'A goodbye message to the class with a drawn sun, for the last day of term.',
  game: 'A game of hangman nearly lost, and noughts and crosses in the corner.',
  homework: 'HOMEWORK with page numbers and a due date, and a boxed warning about a test.',
  tally: 'Rows of tally marks counting down the days.',
  blank: 'Nothing at all: wiped, with only the ghosts of old smears.',
} as const;

function paint(kind: keyof typeof WRITINGS, base: string, pen: Pen, erased: number, wear: number) {
  const { g, random, colours } = pen;
  const W = 1024, H = 640;
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  // Old dust worked into the surface.
  for (let i = 0; i < 26 + wear * 40; i++) {
    g.fillStyle = `rgba(255,255,255,${0.012 + random() * 0.03 * (0.5 + wear)})`;
    g.beginPath(); g.ellipse(random() * W, random() * H, 80 + random() * 220, 20 + random() * 50, (random() - 0.5) * 0.8, 0, 7); g.fill();
  }
  g.globalAlpha = mix(1, 0.5, erased);
  const c1 = colours[1 % colours.length], c2 = colours[2 % colours.length];
  if (kind === 'equations') {
    const end = write(pen, 'Combustion', 60, 100, 76, c1);
    line(pen, [[60, 118], [end, 122]], 5, c1);
    const pool = ['2H_2 + O_2 > 2H_2O', 'CH_4 + 2O_2 > CO_2 + 2H_2O', 'Zn + 2HCl > ZnCl_2 + H_2', '2Mg + O_2 > 2MgO', 'CaCO_3 > CaO + CO_2', 'C + O_2 > CO_2'];
    const start = Math.floor(random() * pool.length);
    for (let i = 0; i < 4; i++) write(pen, pool[(start + i) % pool.length], 70 + random() * 50, 220 + i * 112, 70);
    write(pen, '!', 930, 600, 120, c2);
  } else if (kind === 'diagram') {
    const ax = 250, ay = 320;
    g.fillStyle = c1; g.beginPath(); g.arc(ax, ay, 26, 0, 7); g.fill();
    for (let i = 0; i < 3; i++) {
      g.save(); g.translate(ax, ay); g.rotate(i * Math.PI / 3 + 0.2);
      g.strokeStyle = colours[0]; g.lineWidth = 5; g.beginPath(); g.ellipse(0, 0, 190, 70, 0, 0, 7); g.stroke();
      g.fillStyle = c2; g.beginPath(); g.arc(190 * Math.cos(1 + i * 2), 70 * Math.sin(1 + i * 2), 14, 0, 7); g.fill();
      g.restore();
    }
    write(pen, 'atom', 170, 590, 64);
    line(pen, [[690, 120], [690, 250], [590, 440], [850, 440], [750, 250], [750, 120]], 6);
    line(pen, [[620, 390], [660, 380], [700, 392], [740, 380], [780, 390], [818, 384]], 5, c2);
    line(pen, [[600, 470], [840, 470]], 6);
    line(pen, [[700, 560], [700, 500], [740, 500], [740, 560]], 6);
    line(pen, [[720, 495], [710, 478], [720, 455], [730, 478], [720, 495]], 5, c1);
    line(pen, [[660, 570], [790, 570]], 6);
    line(pen, [[870, 300], [790, 330]], 4); write(pen, 'flask', 870, 300, 46);
    line(pen, [[870, 530], [760, 530]], 4); write(pen, 'heat', 880, 545, 46, c1);
  } else if (kind === 'lines') {
    const sentence = ['I must not talk in class.', 'I will not set fire to things.', 'I must hand in my homework.', 'I will not eat the chemicals.'][Math.floor(random() * 4)];
    const rows = 9;
    for (let i = 0; i < rows; i++) {
      pen.wobble = 0.5 + i * 0.22;
      const text = i === rows - 1 ? sentence.slice(0, 6 + Math.floor(random() * 8)) : sentence;
      write(pen, text, 40 + i * 4, 76 + i * 66, 54);
    }
  } else if (kind === 'farewell') {
    write(pen, 'Goodbye', 90, 190, 150, c1);
    write(pen, ['4B', '3C', '5A', '2D'][Math.floor(random() * 4)] + ' !', 660, 200, 150, c1);
    write(pen, 'have a great summer', 120, 330, 80);
    write(pen, 'x x x', 420, 440, 70, c2);
    g.strokeStyle = g.fillStyle = c2; g.lineWidth = 7;
    g.beginPath(); g.arc(850, 470, 62, 0, 7); g.stroke();
    for (let i = 0; i < 10; i++) { const t = i / 10 * 6.283; g.beginPath(); g.moveTo(850 + Math.cos(t) * 80, 470 + Math.sin(t) * 80); g.lineTo(850 + Math.cos(t) * 112, 470 + Math.sin(t) * 112); g.stroke(); }
    pen.wobble = 2;
    for (let i = 0; i < 5; i++) write(pen, ['Sam', 'Jo', 'Mia', 'Dev', 'Kit', 'Ana', 'Lee'][Math.floor(random() * 7)], 60 + i * 140 + random() * 30, 540 + random() * 70, 40, colours[i % colours.length]);
  } else if (kind === 'game') {
    line(pen, [[120, 520], [320, 520]], 8); line(pen, [[180, 520], [180, 120], [330, 120], [330, 170]], 8);
    g.strokeStyle = colours[0]; g.lineWidth = 7; g.beginPath(); g.arc(330, 205, 35, 0, 7); g.stroke();
    line(pen, [[330, 240], [330, 370]], 7); line(pen, [[280, 290], [330, 270], [380, 290]], 7); line(pen, [[330, 370], [295, 440]], 7);
    const word = ['_ H E _ I S _ R Y', 'S _ _ M _ R', '_ E _ E N _ I O N', 'B _ N S _ N'][Math.floor(random() * 4)];
    write(pen, word.replace(/_/g, '–'), 90, 610, 70, c1);
    const gx = 650, gy = 130, cell = 100;
    for (let i = 1; i < 3; i++) { line(pen, [[gx + i * cell, gy], [gx + i * cell, gy + 3 * cell]], 7); line(pen, [[gx, gy + i * cell], [gx + 3 * cell, gy + i * cell]], 7); }
    for (let i = 0; i < 9; i++) { const r = random(); if (r < 0.3) continue; write(pen, r < 0.65 ? 'X' : 'O', gx + (i % 3) * cell + 20, gy + Math.floor(i / 3) * cell + 82, 84, r < 0.65 ? c1 : c2); }
  } else if (kind === 'homework') {
    const end = write(pen, 'HOMEWORK', 70, 130, 110, c1);
    line(pen, [[70, 152], [end, 150]], 7, c1);
    write(pen, `p. ${20 + Math.floor(random() * 180)}  Q1 - ${4 + Math.floor(random() * 9)}`, 90, 280, 84);
    write(pen, 'due ' + ['MONDAY', 'FRIDAY', 'TUESDAY', 'TOMORROW'][Math.floor(random() * 4)], 90, 400, 84);
    line(pen, [[520, 470], [970, 470], [970, 610], [520, 610], [520, 470]], 7, c2);
    write(pen, 'TEST MON!', 545, 570, 76, c2);
  } else if (kind === 'tally') {
    write(pen, 'days to go', 60, 100, 70, c1);
    const n = 9 + Math.floor(random() * 22);
    for (let i = 0; i < n; i++) {
      const group = Math.floor(i / 5), x = 80 + (group % 6) * 150, y = 170 + Math.floor(group / 6) * 210;
      if (i % 5 === 4) line(pen, [[x - 14, y + 120], [x + 96, y + 20]], 7, c2);
      else line(pen, [[x + (i % 5) * 26, y], [x + (i % 5) * 26 + 3, y + 140]], 7);
    }
  }
  g.globalAlpha = 1;
  // Duster strokes: broad pale swipes that take the chalk with them.
  const swipes = Math.round(erased * erased * 11) + (kind === 'blank' ? 5 : 0) + (kind === 'farewell' ? 3 : 0);
  for (let i = 0; i < swipes; i++) {
    const x = kind === 'farewell' && i < 3 ? 520 + random() * 400 : random() * W, y = random() * H, len = 200 + random() * 380, tilt = (random() - 0.5) * 1.2;
    g.save(); g.translate(x, y); g.rotate(tilt);
    g.fillStyle = base; g.globalAlpha = 0.62; g.fillRect(-len / 2, -45, len, 90);
    g.fillStyle = '#ffffff'; g.globalAlpha = 0.09; g.fillRect(-len / 2, -45, len, 90);
    g.globalAlpha = 0.07; for (let j = 0; j < 5; j++) g.fillRect(-len / 2, -40 + j * 18 + random() * 6, len, 4);
    g.restore();
  }
  g.globalAlpha = 1;
}

export default defineThing({
  questions: {
    writing: choice('What is written on the board?', WRITINGS),
    erased: score('How much of it has been wiped away?', ['Crisp and freshly written', 'A little smudged by sleeves', 'Half rubbed out in broad swipes', 'Only ghosts remain under the smears']),
    hand: choice('Whose handwriting is it?', {
      teacher: 'A teacher\'s: level, practised and legible from the back row.',
      hurried: 'A hurried adult scrawl sloping off the line.',
      pupil: 'A pupil\'s: big wobbly letters that wander up and down.',
    }),
    chalk: choice('What colour is the chalk?', {
      white: 'Plain white only.',
      yellow: 'Soft yellow with white, the anti-dust kind.',
      coloured: 'White with pink, blue and green for the important parts.',
    }),
    board: choice('What kind of board is it?', {
      slate: 'Black slate in a varnished pine frame.',
      green: 'Dull green in a silver aluminium frame, 1970s issue.',
      oak: 'Grey-black in dark oak with turned finials on the posts, very old.',
      steel: 'Black in a red tubular steel frame, primary-school bright.',
    }),
    position: choice('How is the board sitting in its frame?', {
      upright: 'Locked upright.',
      back: 'Tilted back a little, the way a tall teacher writes.',
      forward: 'Tipped forward, facing down toward small children on the carpet.',
      spun: 'Caught mid-flip, nearly flat, with the chalk slid off onto the floor.',
    }),
    tray: choice('What has been left on the chalk tray?', {
      chalk: 'Chalk stubs and a felt duster.',
      apple: 'A duster, a stick of chalk and an apple for the teacher.',
      bare: 'Nothing; the duster lies on the floor in a puff of dust.',
      mug: 'A forgotten mug of tea among the chalk.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 1.8, H = 1.2, CY = 1.2;
    const frameColour = { slate: '#b98a52', green: '#c3c8ca', oak: '#4a3020', steel: '#c8322a' }[a.board];
    const frame = s.material(frameColour, { metalness: a.board === 'green' ? 0.8 : a.board === 'steel' ? 0.3 : 0, roughness: a.board === 'green' ? 0.35 : 0.55 });
    const boardColour = { slate: '#1c1f21', green: '#2f5a44', oak: '#2a2d30', steel: '#17191b' }[a.board];
    const iron = s.material('#2a2b2c', { metalness: 0.5, roughness: 0.6 });
    const palette = { white: ['#f4f2ea'], yellow: ['#f4f2ea', '#f3df7a', '#f3df7a'], coloured: ['#f4f2ea', '#f29ab8', '#8fd0f0', '#a6e39a'] }[a.chalk];

    const face = (kind: keyof typeof WRITINGS, erased: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 640;
      const pen: Pen = { g: canvas.getContext('2d')!, random, wobble: { teacher: 0.25, hurried: 0.9, pupil: 1.8 }[a.hand], colours: palette };
      paint(kind, boardColour, pen, erased, mood.wear);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 });
    };

    // The board, pivoting on its centre pins.
    const board = new THREE.Group();
    board.position.y = CY;
    s.root.add(board);
    const b = <M extends THREE.Object3D>(m: M) => (board.add(m), m);
    b(s.box([W, H, 0.03], [0, 0, 0], s.material(boardColour)));
    b(s.mesh(new THREE.PlaneGeometry(W - 0.1, H - 0.1), face(a.writing, a.erased), [0, 0, 0.0165]));
    const rear = b(s.mesh(new THREE.PlaneGeometry(W - 0.1, H - 0.1), face(random() < 0.5 ? 'blank' : 'tally', 0.8), [0, 0, -0.0165]));
    rear.rotation.y = Math.PI;
    for (const k of [-1, 1]) {
      b(s.box([W + 0.04, 0.06, 0.05], [0, k * (H / 2 - 0.01), 0], frame));
      b(s.box([0.06, H + 0.04, 0.05], [k * (W / 2 - 0.01), 0, 0], frame));
    }
    const spun = a.position === 'spun';
    board.rotation.x = { upright: 0, back: -0.2, forward: 0.22, spun: -1.25 }[a.position] + (random() - 0.5) * 0.04;

    // Tray on the lower edge.
    const ty = -H / 2 - 0.01;
    b(s.box([W * 0.8, 0.02, 0.09], [0, ty, 0.07], frame));
    b(s.box([W * 0.8, 0.035, 0.012], [0, ty + 0.012, 0.115], frame));
    const loose: THREE.Mesh[] = [];
    const chalkCount = Math.round(mix(2, 9, mood.density));
    for (let i = 0; i < chalkCount; i++) {
      const stick = s.cylinder(0.011, 0.011, 0.035 + random() * 0.06, [0, 0, 0], s.material(palette[Math.floor(random() * palette.length)], { roughness: 1 }), 8);
      stick.rotation.set(0, random() * 3, Math.PI / 2);
      stick.userData.x = -W * 0.36 + random() * W * 0.5;
      loose.push(stick);
    }
    const duster = new THREE.Group();
    duster.add(s.box([0.15, 0.035, 0.06], [0, 0.03, 0], s.material('#9a6a3a')), s.box([0.15, 0.022, 0.06], [0, 0.004, 0], s.material('#3a3c44', { roughness: 1 })), s.box([0.15, 0.006, 0.062], [0, 0.016, 0], s.material('#c8c4b8', { roughness: 1 })));
    if (spun || a.tray === 'bare') {
      // Whatever was on the tray is on the floor now.
      if (spun) for (const stick of loose) { stick.position.set(stick.userData.x + (random() - 0.5) * 0.3, 0.011, 0.25 + random() * 0.5); s.root.add(stick); }
      else loose.forEach((stick) => { stick.geometry.dispose(); (stick.material as THREE.Material).dispose(); stick.removeFromParent(); });
      duster.position.set(0.3 + random() * 0.4, 0.008, 0.4 + random() * 0.25);
      duster.rotation.set(0, random() * 3, random() < 0.5 ? Math.PI : 0);
      if (duster.rotation.z) duster.position.y = 0.05;
      s.root.add(duster);
      const puff = s.material('#f1efe6', { transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 });
      s.cylinder(0.22, 0.25, 0.003, [duster.position.x, 0.002, duster.position.z], puff, 20).castShadow = false;
    } else {
      for (const stick of loose) { stick.position.set(stick.userData.x, ty + 0.021, 0.065 + (random() - 0.5) * 0.03); board.add(stick); }
      duster.position.set(W * 0.27, ty + 0.012, 0.068);
      duster.rotation.y = (random() - 0.5) * 0.3;
      board.add(duster);
      if (a.tray === 'apple') {
        const apple = b(s.ball([0.038, 0.035, 0.038], [-W * 0.02 + random() * 0.1, ty + 0.045, 0.07], s.material(mood.cheer > 0.4 ? '#c8242c' : '#7a8a3a', { roughness: 0.3 }), 14));
        b(s.rod([apple.position.x, ty + 0.075, 0.07], [apple.position.x + 0.008, ty + 0.098, 0.07], 0.003, s.material('#4a3320')));
      } else if (a.tray === 'mug') {
        const mx = W * 0.1 + random() * 0.1;
        b(s.cylinder(0.04, 0.035, 0.085, [mx, ty + 0.053, 0.07], s.material(['#2a6fc0', '#e8e2d0', '#c8642a'][Math.floor(random() * 3)]), 16));
        b(s.cylinder(0.034, 0.034, 0.004, [mx, ty + 0.09, 0.07], s.material('#6a4424'), 14));
        b(s.ring(0.024, 0.007, [mx + 0.045, ty + 0.053, 0.07], s.material('#e8e2d0')));
      }
    }

    // Frame: two posts on wheeled feet, a stretcher, pivot knobs.
    const px = W / 2 + 0.07, top = CY + (a.board === 'oak' ? 0.75 : 0.3);
    for (const k of [-1, 1]) {
      const x = k * px;
      if (a.board === 'steel' || a.board === 'green') {
        s.cylinder(0.022, 0.022, top - 0.1, [x, (top + 0.1) / 2, 0], frame, 12);
        s.tube([[x, 0.12, -0.36], [x, 0.14, -0.3], [x, 0.14, 0.3], [x, 0.12, 0.36]], 0.022, frame);
        s.rod([x, 0.5, 0], [x, 0.14, 0.22], 0.014, frame); s.rod([x, 0.5, 0], [x, 0.14, -0.22], 0.014, frame);
      } else {
        s.box([0.06, top - 0.1, 0.06], [x, (top + 0.1) / 2, 0], frame);
        s.box([0.07, 0.07, 0.76], [x, 0.125, 0], frame);
        for (const z of [-1, 1]) s.rod([x, 0.55, z * 0.02], [x, 0.16, z * 0.3], 0.02, frame);
        if (a.board === 'oak') s.lathe([[0, 0], [0.04, 0], [0.045, 0.015], [0.02, 0.03], [0.038, 0.07], [0.02, 0.11], [0, 0.13]], frame, [x, top, 0]);
        else s.box([0.075, 0.02, 0.075], [x, top + 0.01, 0], frame);
      }
      for (const z of [-1, 1]) {
        s.cylinder(0.04, 0.04, 0.03, [x, 0.04, z * 0.33], iron, 12).rotation.z = Math.PI / 2;
        s.box([0.04, 0.03, 0.03], [x, 0.085, z * 0.33], iron);
      }
      const knob = s.cylinder(0.04, 0.04, 0.03, [x + k * 0.04, CY, 0], iron, 14);
      knob.rotation.z = Math.PI / 2;
      s.rod([x - k * 0.08, CY, 0], [x + k * 0.03, CY, 0], 0.012, iron);
    }
    s.box([px * 2, 0.05, 0.035], [0, 0.3, 0], frame);
    if (a.board === 'oak') s.box([px * 2, 0.06, 0.04], [0, top - 0.06, 0], frame), s.label(['SCIENCE', 'FORM IV', 'ROOM 7'][Math.floor(random() * 3)], 0.5, 0.09, [0, top - 0.06, 0.022], '#e2cf98', '#4a3020');

    // Chalk dust on the floor under the board.
    const dust = s.material('#f1efe6', { transparent: true, opacity: mix(0.08, 0.35, Math.max(mood.wear, a.erased)), depthWrite: false, roughness: 1 });
    const patch = s.cylinder(0.5, 0.5, 0.003, [0, 0.002, 0.1], dust, 24);
    patch.scale.set(1.5, 1, 0.38);
    patch.castShadow = false;

    const speed = mix(0, 0.9, mood.energy), start = board.rotation.x;
    return s.finish({
      update(_dt, time) {
        if (spun) board.rotation.x = start - time * speed;
      },
    });
  },
});
