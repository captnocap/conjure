import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;

function paint(w: number, h: number, draw: (c: Ctx) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

const SEGMENTS: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abfgcd', '-': 'g', ' ': '' };

export default defineThing({
  questions: {
    count: choice('What number does it show?', {
      zero: 'Zero. Something happened today.',
      few: 'A handful of days: the last one is still fresh.',
      weeks: 'A few weeks, an ordinary unremarkable run.',
      streak: 'A proud streak of a few hundred days.',
      record: 'Nearly a thousand days, a legend nobody dares break.',
      missing: 'Unreadable: one digit has fallen off and left a gap.',
      blank: 'Dashes. Nobody keeps count any more.',
    }),
    display: choice('How is the number shown?', {
      cards: 'Numbered cards hung on hooks.',
      led: 'Red glowing seven-segment digits.',
      chalk: 'Chalked by hand on a black panel.',
      marker: 'Written in marker pen on a wipe-clean patch.',
    }),
    style: choice('What does the board look like?', {
      green: 'Safety green and white with a first-aid cross, straight from a catalogue.',
      hazard: 'Yellow and black with hazard chevrons.',
      blue: 'Corporate navy and grey, head-office approved.',
      plywood: 'Hand-painted plywood, a small yard that made its own.',
      whiteboard: 'A whiteboard, every word written by hand.',
    }),
    slogan: choice('What is the slogan across the top?', {
      first: 'SAFETY FIRST',
      think: 'THINK SAFE WORK SAFE',
      zero: 'ZERO HARM',
      today: 'NOBODY GETS HURT TODAY',
      you: 'SAFETY STARTS WITH YOU',
    }),
    mount: choice('How is it mounted?', {
      posts: 'On two steel posts set in the ground.',
      easel: 'Propped on a folding A-frame.',
      wall: 'Screwed to a piece of blockwork wall.',
      wheeled: 'On a rolling stand with castors.',
      fence: 'Cable-tied to a panel of site fencing.',
    }),
    aftermath: choice('What else is there?', {
      plain: 'Nothing: just the board.',
      balloons: 'Balloons tied to the corner: someone is celebrating the number.',
      tape: 'Barrier tape strung across it and a cone at its foot: it has just happened.',
      hat: 'A hard hat hung on the corner and a green first-aid box below.',
      scrawl: 'Somebody has added their own comment in marker pen.',
      plaster: 'A giant sticking plaster stuck across the number.',
    }),
    record: noul('Does it also show the previous best record?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const int = (from: number, to: number) => from + Math.floor(random() * (to - from + 1));
    const value = { zero: 0, few: int(1, 6), weeks: int(11, 58), streak: int(112, 486), record: int(871, 999), missing: int(104, 899), blank: 0 }[a.count];
    let digits = a.count === 'blank' ? '---' : String(value).padStart(3, ' ');
    if (a.count === 'zero' && a.display === 'led') digits = '000';
    const lost = a.count === 'missing' ? int(0, 2) : -1;
    const lostDigit = lost >= 0 ? digits[lost] : '';
    const best = Math.max(value + int(20, 300), int(60, 400));

    const BW = 1.5, BH = 1.1;
    const hand = a.style === 'whiteboard' || a.style === 'plywood';
    const palette = {
      green: { head: '#1f7a45', headInk: '#ffffff', body: '#f4f2ea', ink: '#17341f', edge: '#1f7a45' },
      hazard: { head: '#17181b', headInk: '#f2c21c', body: '#f2c21c', ink: '#17181b', edge: '#17181b' },
      blue: { head: '#1d3f7a', headInk: '#ffffff', body: '#e6eaf0', ink: '#1d3f7a', edge: '#8d97a6' },
      plywood: { head: '#c9a46a', headInk: '#b3261e', body: '#c9a46a', ink: '#1c1a17', edge: '#a8834d' },
      whiteboard: { head: '#fbfbf8', headInk: '#c2261e', body: '#fbfbf8', ink: '#1d3f9a', edge: '#b9bfc4' },
    }[a.style];
    const slogan = { first: 'SAFETY FIRST', think: 'THINK SAFE WORK SAFE', zero: 'ZERO HARM', today: 'NOBODY GETS HURT TODAY', you: 'SAFETY STARTS WITH YOU' }[a.slogan];
    const font = (size: number) => (hand ? `bold ${size}px "Comic Sans MS", "Segoe Print", cursive` : `bold ${size}px sans-serif`);
    const CW = 1024, CH = 748;
    const boardTexture = paint(CW, CH, (c) => {
      c.fillStyle = palette.body; c.fillRect(0, 0, CW, CH);
      if (a.style === 'plywood') for (let i = 0; i < 70; i++) { c.strokeStyle = `rgba(110,75,35,${0.05 + random() * 0.14})`; c.lineWidth = 1 + random() * 3; c.beginPath(); const y = random() * CH; c.moveTo(0, y); c.bezierCurveTo(300, y + (random() - 0.5) * 40, 700, y + (random() - 0.5) * 40, CW, y + (random() - 0.5) * 30); c.stroke(); }
      c.fillStyle = palette.head; c.fillRect(0, 0, CW, 168);
      if (a.style === 'hazard') {
        c.fillStyle = '#17181b';
        for (let x = -60; x < CW; x += 90) for (const y of [CH - 44]) { c.beginPath(); c.moveTo(x, y + 44); c.lineTo(x + 44, y); c.lineTo(x + 89, y); c.lineTo(x + 45, y + 44); c.fill(); }
      }
      let left = 40;
      if (a.style === 'green') { c.fillStyle = '#ffffff'; c.fillRect(44, 34, 100, 100); c.fillStyle = '#1f7a45'; c.fillRect(82, 46, 24, 76); c.fillRect(56, 72, 76, 24); left = 170; }
      if (a.style === 'blue') { c.fillStyle = '#f2c21c'; c.beginPath(); c.moveTo(94, 30); c.lineTo(156, 138); c.lineTo(32, 138); c.fill(); c.fillStyle = '#1d3f7a'; c.fillRect(88, 68, 12, 40); c.fillRect(88, 116, 12, 12); left = 180; }
      const line = (text: string, y: number, size: number, ink: string, x0 = 0, x1 = CW) => {
        c.save();
        c.translate((x0 + x1) / 2, y);
        if (hand) c.rotate((random() - 0.5) * 0.05);
        c.fillStyle = ink; c.font = font(size); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(text, 0, 0, x1 - x0 - 30);
        if (a.style === 'whiteboard') { c.globalAlpha = 0.5; c.fillText(text, 2, 2, x1 - x0 - 30); }
        c.restore();
      };
      line(slogan, 88, slogan.length > 14 ? 74 : 104, palette.headInk, left, CW - 20);
      if (a.style === 'whiteboard' || a.style === 'plywood') { c.strokeStyle = palette.headInk; c.lineWidth = 8; c.beginPath(); c.moveTo(60, 160); c.quadraticCurveTo(500, 150 + random() * 20, 960, 162); c.stroke(); }
      const y0 = 208;
      line('THIS SITE HAS WORKED', y0, 50, palette.ink);
      line('DAYS', y0 + 178, 96, palette.ink, 730, CW - 6);
      line('WITHOUT A LOST TIME ACCIDENT', y0 + 362, 50, palette.ink);
      if (a.record) {
        c.fillStyle = a.style === 'hazard' ? '#17181b' : palette.head === palette.body ? 'rgba(0,0,0,0.12)' : palette.head;
        c.fillRect(250, y0 + 402, 524, 66);
        line(`PREVIOUS BEST  ${best}  DAYS`, y0 + 436, 40, a.style === 'whiteboard' || a.style === 'plywood' ? palette.ink : palette.headInk, 250, 774);
      }
      c.strokeStyle = palette.edge; c.lineWidth = 16; c.strokeRect(8, 8, CW - 16, CH - 16);
      for (const [x, y] of [[30, 30], [CW - 30, 30], [30, CH - 30], [CW - 30, CH - 30]]) { c.fillStyle = '#6f767a'; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); if (wear > 0.35) { const g = c.createLinearGradient(0, y, 0, y + 150 * wear); g.addColorStop(0, 'rgba(120,65,25,0.6)'); g.addColorStop(1, 'rgba(120,65,25,0)'); c.fillStyle = g; c.fillRect(x - 5, y, 10, 150 * wear); } }
      for (let i = 0; i < wear * 260; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '70,60,45' : '235,232,222'},${random() * 0.35})`; c.beginPath(); c.arc(random() * CW, random() * CH, 2 + random() * 9, 0, 7); c.fill(); }
      if (a.aftermath === 'scrawl') {
        const notes = ['LOL', 'since Gary', 'LIES', 'not counting Tuesday', 'who did it??', 'again?!'];
        c.fillStyle = '#16181b'; c.font = 'italic bold 58px "Comic Sans MS", cursive'; c.textAlign = 'center';
        c.save(); c.translate(820 + random() * 60, y0 + 300 + random() * 20); c.rotate(-0.12 - random() * 0.15); c.fillText(notes[Math.floor(random() * notes.length)], 0, 0); c.restore();
        c.strokeStyle = '#16181b'; c.lineWidth = 7; c.lineCap = 'round';
        c.beginPath(); c.moveTo(800, y0 + 250); c.quadraticCurveTo(770, y0 + 240, 735, y0 + 215); c.stroke();
        c.beginPath(); c.moveTo(765, y0 + 212); c.lineTo(733, y0 + 213); c.lineTo(742, y0 + 244); c.stroke();
        if (random() < 0.6) { c.beginPath(); c.moveTo(150, y0 + 378); c.lineTo(880, y0 + 350); c.stroke(); }
      }
    });
    const board = new THREE.Group();
    const frameMat = s.material(a.style === 'plywood' ? '#a8834d' : a.style === 'whiteboard' ? '#b9bfc4' : '#5d646a', { metalness: a.style === 'plywood' ? 0 : 0.5, roughness: 0.6 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 0.03), frameMat);
    plate.castShadow = plate.receiveShadow = true;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.01, BH - 0.01), new THREE.MeshStandardMaterial({ map: boardTexture, roughness: a.style === 'whiteboard' ? 0.25 : 0.7 }));
    face.position.z = 0.0155;
    face.receiveShadow = true;
    board.add(plate, face);
    if (a.style === 'whiteboard') { const tray = new THREE.Mesh(new THREE.BoxGeometry(BW * 0.6, 0.02, 0.06), frameMat); tray.position.set(0, -BH / 2 - 0.005, 0.04); const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 8), s.material('#c2261e')); pen.rotation.z = Math.PI / 2; pen.position.set(0.1 + random() * 0.2, -BH / 2 + 0.015, 0.05); board.add(tray, pen); }

    // The number window.
    const px = BW / CW;
    const y0c = 208;
    const winW = 660 * px, winH = 270 * px;
    const winX = (390 - CW / 2) * px, winY = (CH / 2 - (y0c + 178)) * px;
    const cellW = winW / 3;
    const WW = 660, WH = 270;
    const segment = (c: Ctx, x: number, y: number, w: number, h: number, char: string, on: string, off: string) => {
      const t = w * 0.17, lit = SEGMENTS[char] ?? '';
      const bar = (name: string, bx: number, by: number, bw: number, bh: number) => { c.fillStyle = lit.includes(name) ? on : off; c.beginPath(); (c as Ctx & { roundRect?: Ctx['rect'] }).roundRect ? c.roundRect(bx, by, bw, bh, t / 2) : c.rect(bx, by, bw, bh); c.fill(); };
      bar('a', x + t, y, w - 2 * t, t); bar('g', x + t, y + h / 2 - t / 2, w - 2 * t, t); bar('d', x + t, y + h - t, w - 2 * t, t);
      bar('f', x, y + t * 0.6, t, h / 2 - t * 0.9); bar('b', x + w - t, y + t * 0.6, t, h / 2 - t * 0.9);
      bar('e', x, y + h / 2 + t * 0.3, t, h / 2 - t * 0.9); bar('c', x + w - t, y + h / 2 + t * 0.3, t, h / 2 - t * 0.9);
    };
    const led = a.display === 'led';
    const windowTexture = paint(WW, WH, (c) => {
      if (led) {
        c.fillStyle = '#0c0a0a'; c.fillRect(0, 0, WW, WH);
        for (let i = 0; i < 3; i++) segment(c, 40 + i * 213, 30, 152, 210, i === lost ? ' ' : digits[i], '#ff3a22', '#3a0f0b');
      } else if (a.display === 'chalk') {
        c.fillStyle = '#28302d'; c.fillRect(0, 0, WW, WH);
        for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(230,232,225,${0.03 + random() * 0.07})`; c.beginPath(); c.ellipse(random() * WW, random() * WH, 40 + random() * 70, 14 + random() * 26, random() * 3, 0, 7); c.fill(); }
        c.font = 'bold 250px "Comic Sans MS", "Segoe Print", cursive'; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (let i = 0; i < 3; i++) {
          if (i === lost) { c.fillStyle = 'rgba(232,234,226,0.42)'; c.beginPath(); c.ellipse(110 + i * 220, 135, 90, 100, 0.4, 0, 7); c.fill(); continue; }
          for (let k = 0; k < 3; k++) { c.fillStyle = `rgba(240,240,232,${0.5 + k * 0.2})`; c.fillText(digits[i], 110 + i * 220 + (random() - 0.5) * 6, 146 + (random() - 0.5) * 6); }
        }
      } else if (a.display === 'marker') {
        c.fillStyle = '#fdfdfb'; c.fillRect(0, 0, WW, WH);
        c.strokeStyle = '#9aa0a6'; c.lineWidth = 6; c.strokeRect(3, 3, WW - 6, WH - 6);
        c.font = 'italic bold 236px "Comic Sans MS", "Segoe Print", cursive'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = 'rgba(120,130,150,0.2)';
        for (let i = 0; i < 3; i++) c.fillText(String(int(0, 9)), 114 + i * 216, 140);
        for (let i = 0; i < 3; i++) {
          if (i === lost) { c.strokeStyle = 'rgba(200,40,30,0.3)'; c.lineWidth = 46; c.lineCap = 'round'; c.beginPath(); c.moveTo(50 + i * 220, 80); c.lineTo(180 + i * 220, 195); c.stroke(); continue; }
          c.fillStyle = a.count === 'zero' ? '#c2261e' : '#16181b';
          c.fillText(digits[i], 110 + i * 220 + (random() - 0.5) * 12, 142 + (random() - 0.5) * 14);
        }
      } else {
        c.fillStyle = '#33383d'; c.fillRect(0, 0, WW, WH);
        for (let i = 0; i < 3; i++) { c.fillStyle = '#1f2327'; c.fillRect(14 + i * 220, 12, 192, 246); c.fillStyle = '#c9ccce'; for (const x of [56, 136]) { c.beginPath(); c.arc(14 + i * 220 + x, 28, 7, 0, 7); c.fill(); } }
      }
    });
    const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), led ? new THREE.MeshBasicMaterial({ map: windowTexture }) : new THREE.MeshStandardMaterial({ map: windowTexture, roughness: a.display === 'marker' ? 0.25 : 0.9 }));
    windowMesh.position.set(winX, winY, 0.019);
    board.add(windowMesh);
    const cardMesh = (char: string) => {
      const texture = paint(128, 172, (c) => {
        c.fillStyle = a.count === 'zero' ? '#f6f3e8' : '#f6f3e8'; c.fillRect(0, 0, 128, 172);
        c.strokeStyle = '#8d9296'; c.lineWidth = 4; c.strokeRect(2, 2, 124, 168);
        c.fillStyle = a.count === 'zero' ? '#c2261e' : '#16181b'; c.font = 'bold 140px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(char, 64, 96);
        c.fillStyle = '#33383d'; for (const x of [34, 94]) { c.beginPath(); c.arc(x, 14, 6, 0, 7); c.fill(); }
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(cellW * 0.8, winH * 0.86, 0.006), [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: '#e6e2d6' })).concat([new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: '#e6e2d6' })]));
      mesh.castShadow = true;
      return mesh;
    };
    let fallenCard: THREE.Mesh | null = null;
    if (a.display === 'cards') {
      for (let i = 0; i < 3; i++) {
        if (digits[i] === ' ') continue;
        const card = cardMesh(digits[i]);
        if (i === lost) { fallenCard = card; continue; }
        card.position.set(winX + (i - 1) * cellW, winY - 0.012, 0.026);
        card.rotation.z = (random() - 0.5) * (0.06 + wear * 0.2);
        board.add(card);
      }
    }
    if (a.aftermath === 'plaster') {
      const skin = s.material('#e3b58d', { roughness: 0.9 });
      const strip = new THREE.Group();
      const band = new THREE.Mesh(new THREE.BoxGeometry(winW * 1.12, 0.16, 0.006), skin);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(winW * 0.34, 0.162, 0.008), s.material('#f1dcc2', { roughness: 0.9 }));
      band.castShadow = true;
      strip.add(band, pad);
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) { const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.008, 6), s.material('#c9976c')); dot.rotation.x = Math.PI / 2; dot.position.set(side * (winW * 0.3 + i * 0.05), (k - 0.5) * 0.05, 0.001); strip.add(dot); }
      strip.position.set(winX, winY, 0.034);
      strip.rotation.z = -0.3 + random() * 0.6;
      board.add(strip);
    }

    // Mounts.
    const steel = s.material('#7d8488', { metalness: 0.7, roughness: 0.45 });
    const dark = s.material('#1e2023', { roughness: 0.7 });
    let boardY = 1.55, boardZ = 0.05, tiltX = 0;
    if (a.mount === 'posts') {
      for (const x of [-0.56, 0.56]) {
        s.cylinder(0.03, 0.03, 2.12, [x, 1.06, 0], steel, 12);
        s.cylinder(0.036, 0.036, 0.02, [x, 2.13, 0], dark, 12);
        s.cylinder(0.14, 0.17, 0.08, [x, 0.04, 0], s.material('#a9a69c', { roughness: 1 }), 12);
      }
      for (const y of [1.2, 1.85]) s.box([1.18, 0.04, 0.02], [0, y, 0.025], steel);
    } else if (a.mount === 'easel') {
      const leg = s.material(a.style === 'plywood' ? '#8a6238' : '#e9b21a', { roughness: 0.7 });
      for (const x of [-0.66, 0.66]) {
        s.rod([x, 0, 0.3], [x * 0.92, 1.62, -0.02], 0.022, leg);
        s.rod([x, 0, -0.5], [x * 0.92, 1.62, -0.02], 0.022, leg);
        s.rod([x, 0.5, 0.2], [x, 0.5, -0.34], 0.012, dark);
      }
      s.rod([-0.61, 1.62, -0.02], [0.61, 1.62, -0.02], 0.02, leg);
      s.box([1.4, 0.03, 0.06], [0, 0.5, 0.24], leg);
      boardY = 1.07; boardZ = 0.17; tiltX = -0.195;
    } else if (a.mount === 'wall') {
      const blocks = paint(256, 256, (c) => {
        c.fillStyle = '#a9a8a0'; c.fillRect(0, 0, 256, 256);
        c.fillStyle = 'rgba(60,60,55,0.5)';
        for (let row = 0; row < 4; row++) { c.fillRect(0, row * 64, 256, 3); for (let i = 0; i < 3; i++) c.fillRect(i * 128 + (row % 2) * 64, row * 64, 3, 64); }
        for (let i = 0; i < wear * 30; i++) { c.fillStyle = `rgba(40,35,25,${random() * 0.15})`; c.fillRect(random() * 256, random() * 256, 8 + random() * 40, 30 + random() * 80); }
      });
      blocks.wrapS = blocks.wrapT = THREE.RepeatWrapping;
      blocks.repeat.set(2.5, 2.75);
      s.box([2.0, 2.2, 0.2], [0, 1.1, -0.1], new THREE.MeshStandardMaterial({ map: blocks, roughness: 0.95 }));
      s.cylinder(0.018, 0.018, 2.2, [0.9, 1.1, 0.02], steel, 8);
      s.box([0.1, 0.14, 0.06], [0.9, 0.5, 0.03], s.material('#e6e2d6'));
      boardY = 1.4; boardZ = 0.02;
    } else if (a.mount === 'wheeled') {
      for (const x of [-0.62, 0.62]) {
        s.box([0.05, 1.85, 0.05], [x, 1.03, 0], steel);
        s.box([0.05, 0.05, 0.7], [x, 0.12, 0], steel);
        for (const z of [-0.32, 0.32]) { s.box([0.04, 0.05, 0.03], [x, 0.085, z], dark); s.cylinder(0.04, 0.04, 0.03, [x, 0.04, z], dark, 12).rotation.z = Math.PI / 2; }
      }
      s.box([1.24, 0.05, 0.05], [0, 0.4, 0], steel);
      boardY = 1.4; boardZ = 0.045;
    } else {
      const fw = 2.2, fh = 1.9;
      const mesh = paint(256, 256, (c) => {
        c.clearRect(0, 0, 256, 256);
        c.strokeStyle = '#aab0b3'; c.lineWidth = 5;
        for (let x = 0; x <= 256; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke(); }
        c.lineWidth = 4;
        for (let y = 0; y <= 256; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
      });
      mesh.wrapS = mesh.wrapT = THREE.RepeatWrapping;
      mesh.repeat.set(3, 2);
      const grid = s.mesh(new THREE.PlaneGeometry(fw, fh - 0.15), new THREE.MeshStandardMaterial({ map: mesh, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 }), [0, fh / 2 + 0.1, -0.005]);
      grid.castShadow = true;
      for (const x of [-fw / 2, fw / 2]) { s.cylinder(0.022, 0.022, fh, [x, fh / 2 + 0.03, 0], steel, 10); s.box([0.22, 0.13, 0.62], [x, 0.065, 0], s.material(mood.cheer > 0.5 ? '#e2671c' : '#7a7d80', { roughness: 0.9 })); }
      for (const y of [0.18, fh + 0.03]) s.rod([-fw / 2, y, 0], [fw / 2, y, 0], 0.022, steel);
      for (const x of [-0.7, 0.7]) for (const y of [-0.5, 0.5]) s.ring(0.02, 0.005, [x, 1.15 + y, 0.02], dark);
      boardY = 1.15; boardZ = 0.035; board.rotation.z = (random() - 0.5) * 0.09;
    }
    board.position.set(0, boardY, boardZ);
    board.rotation.x = tiltX;
    s.root.add(board);
    const footZ = a.mount === 'easel' ? 0.45 : a.mount === 'wheeled' ? 0.45 : 0.3;
    if (fallenCard) {
      fallenCard.position.set(-0.2 + random() * 0.5, 0.004, footZ + 0.1 + random() * 0.2);
      fallenCard.rotation.set(-Math.PI / 2, 0, random() * 2 - 1);
      s.root.add(fallenCard);
    }
    const corner = new THREE.Vector3(BW / 2, BH / 2, 0.02).applyEuler(board.rotation).add(board.position);

    // Aftermath.
    const balloons: THREE.Object3D[] = [];
    if (a.aftermath === 'balloons') {
      const hues = mood.cheer > 0.35 ? ['#e83a4c', '#f2c21c', '#2a8fe0', '#3fb36a', '#e86ab0'] : ['#8d9296', '#5d646a', '#b9bfc4'];
      const n = 2 + Math.round(mood.density * 3);
      for (let i = 0; i < n; i++) {
        const sag = wear > 0.7;
        const tip: P3 = [corner.x + 0.1 + (random() - 0.3) * 0.5, sag ? corner.y - 0.5 - random() * 0.4 : corner.y + 0.45 + random() * 0.45, corner.z + (random() - 0.5) * 0.3];
        const holder = new THREE.Group();
        const skin = s.material(hues[Math.floor(random() * hues.length)], { roughness: 0.25 });
        const size = sag ? 0.09 : 0.15;
        const ball = s.ball([size, size * 1.2, size], [0, size * 1.2, 0], skin, 16);
        const knot = s.cylinder(0.006, 0.02, 0.03, [0, 0, 0], skin, 8);
        holder.add(ball, knot);
        holder.position.set(...tip);
        if (sag) holder.rotation.z = Math.PI;
        s.root.add(holder);
        s.rod([corner.x, corner.y, corner.z], tip, 0.003, s.material('#f1eee4'));
        if (!sag) balloons.push(holder);
      }
    } else if (a.aftermath === 'tape') {
      const stripes = paint(256, 32, (c) => { c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, 256, 32); c.fillStyle = '#c7261e'; for (let x = -32; x < 256; x += 64) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 32, 0); c.lineTo(x + 64, 0); c.lineTo(x + 32, 32); c.fill(); } });
      stripes.wrapS = THREE.RepeatWrapping;
      stripes.repeat.set(4, 1);
      const tape = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6, side: THREE.DoubleSide });
      for (const turn of [0.42, -0.5]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(BW * 1.25, 0.075, 0.004), tape);
        band.position.set((random() - 0.5) * 0.1, (random() - 0.5) * 0.1, 0.04);
        band.rotation.z = turn + (random() - 0.5) * 0.15;
        band.castShadow = true;
        board.add(band);
      }
      const orange = s.material('#f0641c', { roughness: 0.6 });
      const cx = 0.75 + random() * 0.15;
      s.box([0.3, 0.03, 0.3], [cx, 0.015, footZ], orange);
      s.cylinder(0.025, 0.11, 0.5, [cx, 0.28, footZ], orange, 14);
      s.cylinder(0.058, 0.08, 0.13, [cx, 0.3, footZ], s.material('#f1eee4'), 14);
    } else if (a.aftermath === 'hat') {
      const helmet = s.material(mood.cheer > 0.5 ? '#f2f0e8' : '#e9b21a', { roughness: 0.35 });
      const hat = new THREE.Group();
      hat.add(s.ball([0.13, 0.11, 0.15], [0, 0.02, 0], helmet, 16), s.cylinder(0.16, 0.16, 0.014, [0, 0, 0.02], helmet, 18), s.box([0.03, 0.02, 0.28], [0, 0.125, 0], helmet));
      hat.position.copy(corner).add(new THREE.Vector3(-0.06, 0.02, 0.02));
      hat.rotation.set(0.25, 0, -0.5);
      s.root.add(hat);
      const kit = s.material('#1f8a4c', { roughness: 0.5 });
      const kx = -0.3 + random() * 0.6;
      s.box([0.34, 0.24, 0.12], [kx, 0.12, footZ], kit).rotation.y = (random() - 0.5) * 0.5;
      s.box([0.1, 0.03, 0.002], [kx, 0.12, footZ + 0.062], s.material('#ffffff'));
      s.box([0.03, 0.1, 0.002], [kx, 0.12, footZ + 0.062], s.material('#ffffff'));
      s.box([0.1, 0.02, 0.03], [kx, 0.25, footZ], dark);
    }

    s.root.rotation.y = 0.22 + (random() - 0.5) * 0.2;
    const sway = mix(0.4, 2.2, mood.energy);
    const phase = balloons.map(() => random() * 6);
    const flicker = led && wear > 0.5 ? (windowMesh.material as THREE.MeshBasicMaterial) : null;
    return s.finish({
      update: balloons.length || flicker ? (_dt, time) => {
        balloons.forEach((balloon, index) => { balloon.rotation.z = Math.sin(time * sway + phase[index]) * 0.12; balloon.rotation.x = Math.cos(time * sway * 0.7 + phase[index]) * 0.08; });
        if (flicker) flicker.color.setScalar(Math.sin(time * 31) * Math.sin(time * 2.3) > 0.55 ? 0.45 : 1);
      } : undefined,
    });
  },
});
