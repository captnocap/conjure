import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const BOARDS = {
  green: 'Classic dull green.',
  black: 'True black slate, the old kind.',
  blue: 'A faded blue-grey board, oddly modern for its time.',
  brown: 'A worn brown-black painted board, patchy from repainting.',
} as const;
const BOARD: Record<keyof typeof BOARDS, string> = { green: '#2f5a44', black: '#1f2224', blue: '#32475a', brown: '#3a2f2a' };

export default defineThing({
  questions: {
    legible: choice('What is still legible on the board?', {
      goodbye: 'A goodbye: HAVE A LOVELY SUMMER, with kisses and children’s signatures.',
      countdown: 'A countdown of days to the holidays, each number crossed off down to the last.',
      lesson: 'The last lesson: a labelled diagram of the water cycle with a title underlined.',
      sum: 'Sums: a column addition and a long multiplication left unfinished.',
      drawing: 'A child’s drawing in coloured chalk: a house, a sun and a stick family.',
      hangman: 'An abandoned game of hangman, one limb from losing.',
      lines: 'Lines: I MUST NOT TALK IN CLASS written out again and again.',
      blank: 'Nothing; wiped right back to grey ghosts and smears.',
    }),
    wiped: score('How much has been wiped away?', ['Untouched, every word crisp', 'One careless swipe', 'Half gone', 'Nearly everything, a corner survives']),
    board: choice('What colour is the board?', BOARDS),
    frame: choice('What is the frame like?', {
      steel: 'Grey tubular steel with a swivel board, standard issue.',
      oak: 'A heavy varnished oak frame with turned knobs, generations old.',
      bright: 'A chunky frame painted primary red and yellow, for an infant class.',
    }),
    tilt: choice('How has the board been left?', {
      upright: 'Upright and square, ready for a lesson.',
      back: 'Tipped back at a lazy angle.',
      forward: 'Swung forward, bowing toward the floor.',
      flat: 'Swivelled almost flat like a table.',
    }),
    tray: choice('What is on the chalk tray?', {
      stubs: 'A felt eraser and a few worn stubs of white chalk.',
      colours: 'A felt eraser and a rainbow of coloured chalks.',
      box: 'An open cardboard box of new chalk beside the eraser.',
      bare: 'Nothing but dust.',
    }),
    left: choice('What has been left with the board?', {
      nothing: 'Nothing.',
      cloth: 'A dusty yellow cloth hung over one corner.',
      pointer: 'A long wooden pointer leaning against the frame.',
      note: 'A sheet of paper taped to the corner of the board.',
      satchel: 'A forgotten school bag at its foot.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const BW = 1.5, BH = 1.0, CY = 1.22;
    const textures: THREE.Texture[] = [];

    const paintBoard = (content: boolean) => {
      const c = document.createElement('canvas'); c.width = 768; c.height = 512;
      const g = c.getContext('2d')!;
      const base = new THREE.Color(BOARD[a.board]);
      const css = `#${base.getHexString()}`;
      g.fillStyle = css; g.fillRect(0, 0, 768, 512);
      // Old dust: broad pale ghosts of everything ever written here.
      for (let i = 0; i < 14 + wear * 30; i++) {
        g.strokeStyle = `rgba(235,238,230,${0.02 + random() * 0.035})`; g.lineWidth = 40 + random() * 70; g.lineCap = 'round';
        g.beginPath(); const x = random() * 768, y = random() * 512; g.moveTo(x, y); g.quadraticCurveTo(x + (random() - 0.5) * 300, y + (random() - 0.5) * 120, x + (random() - 0.5) * 500, y + (random() - 0.5) * 160); g.stroke();
      }
      if (a.board === 'brown') for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(20,16,14,${0.2 + random() * 0.2})`; g.fillRect(random() * 700, random() * 450, 80 + random() * 160, 50 + random() * 90); }
      const chalk = (colour = '#f4f4ec') => { g.strokeStyle = colour; g.fillStyle = colour; g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = 0.92; };
      const write = (text: string, x: number, y: number, size: number, colour = '#f4f4ec') => {
        chalk(colour); g.font = `bold ${size}px "Comic Sans MS", "Chalkboard SE", "Segoe Print", cursive, sans-serif`; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
        let cx = x;
        for (const ch of text) { g.save(); g.translate(cx, y + (random() - 0.5) * size * 0.1); g.rotate((random() - 0.5) * 0.09); g.fillText(ch, 0, 0); g.restore(); cx += g.measureText(ch).width * 1.02; }
        return cx;
      };
      const line = (pts: number[], width = 5, colour?: string) => { chalk(colour); g.lineWidth = width; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i] + (random() - 0.5) * 3, pts[i + 1] + (random() - 0.5) * 3); g.stroke(); };
      const circle = (x: number, y: number, r: number, width = 5, colour?: string, fill = false) => { chalk(colour); g.lineWidth = width; g.beginPath(); g.ellipse(x, y, r, r * (0.92 + random() * 0.1), 0, 0.1, 6.5); if (fill) g.fill(); else g.stroke(); };
      if (content) {
        if (a.legible === 'goodbye') {
          write('Have a lovely', 70, 140, 82);
          write('SUMMER!', 150, 270, 118, '#f6e27a');
          write('x x x', 520, 345, 54, '#f2a6c0');
          const names = ['Sam', 'Aisha', 'Tom', 'Mei', 'Jo', 'Ben', 'Lily', 'Kofi', 'Ana'];
          for (let i = 0; i < 7; i++) write(names[Math.floor(random() * names.length)], 40 + (i % 4) * 180 + random() * 30, 400 + Math.floor(i / 4) * 62 + random() * 14, 34 + random() * 12, ['#f4f4ec', '#a9d8f2', '#f2a6c0', '#bfe8a8'][Math.floor(random() * 4)]);
          circle(660, 120, 44, 6, '#f6e27a'); for (let i = 0; i < 8; i++) line([660 + Math.cos(i * 0.785) * 56, 120 + Math.sin(i * 0.785) * 56, 660 + Math.cos(i * 0.785) * 78, 120 + Math.sin(i * 0.785) * 78], 5, '#f6e27a');
        } else if (a.legible === 'countdown') {
          write('DAYS TO GO', 150, 110, 76);
          line([150, 128, 620, 128], 5);
          const start = 5 + Math.floor(random() * 3);
          for (let i = 0; i < 4; i++) { const x = 70 + i * 120; write(String(start - i), x, 300, 120); line([x - 10, 320, x + 80, 190], 7, '#f29a8a'); }
          write(String(start - 4), 560, 330, 200, '#f6e27a');
          circle(615, 262, 115, 7, '#f6e27a');
          write('nearly there!', 90, 440, 54, '#a9d8f2');
        } else if (a.legible === 'lesson') {
          write('The Water Cycle', 150, 80, 62); line([150, 96, 610, 96], 5);
          for (const [x, y, r] of [[470, 190, 38], [520, 170, 48], [575, 192, 36]]) circle(x, y, r, 5);
          for (let i = 0; i < 5; i++) line([470 + i * 28, 245, 458 + i * 28, 290], 4, '#a9d8f2');
          line([330, 420, 420, 290, 470, 350, 560, 240, 700, 420], 6, '#bfe8a8');
          chalk('#a9d8f2'); g.lineWidth = 6; g.beginPath(); for (let x = 40; x < 330; x += 8) g.lineTo(x, 430 + Math.sin(x * 0.07) * 9); g.stroke();
          circle(110, 190, 42, 6, '#f6e27a');
          line([180, 400, 210, 290, 250, 240], 5); line([250, 240, 228, 250], 5); line([250, 240, 248, 264], 5);
          write('evaporation', 40, 330, 30); write('rain', 600, 280, 32); write('sea', 150, 485, 34, '#a9d8f2'); write('condensation', 330, 150, 26);
        } else if (a.legible === 'sum') {
          write('347', 110, 130, 86); write('+ 285', 50, 225, 86); line([50, 245, 300, 245], 6); write('632', 110, 335, 86); line([270, 380, 300, 350, 330, 300], 7, '#bfe8a8');
          write('46', 520, 130, 86); write('x 27', 440, 225, 86); line([430, 245, 680, 245], 6); write('322', 480, 335, 86); write('9', 520, 430, 86); write('?', 600, 430, 96, '#f6e27a');
          write('show your working', 60, 470, 34, '#a9d8f2');
        } else if (a.legible === 'drawing') {
          line([150, 420, 150, 260, 330, 260, 330, 420, 150, 420], 7, '#f2a6c0'); line([130, 262, 240, 160, 350, 262], 7, '#f29a8a');
          line([215, 420, 215, 340, 265, 340, 265, 420], 6, '#a9d8f2'); line([170, 290, 205, 290, 205, 325, 170, 325, 170, 290], 5, '#f6e27a');
          circle(640, 100, 50, 8, '#f6e27a', true); for (let i = 0; i < 10; i++) line([640 + Math.cos(i * 0.63) * 66, 100 + Math.sin(i * 0.63) * 66, 640 + Math.cos(i * 0.63) * 98, 100 + Math.sin(i * 0.63) * 98], 6, '#f6e27a');
          [[430, 100], [505, 76], [570, 100], [470, 62]].forEach(([x, h], i) => { const y = 420 - h; circle(x, y - 28, 20 - i, 5); line([x, y - 8, x, 395], 5); line([x - 26, y + 20, x, y + 6, x + 26, y + 20], 5); line([x - 18, 425, x, 395, x + 18, 425], 5); });
          chalk('#bfe8a8'); g.lineWidth = 6; g.beginPath(); for (let x = 20; x < 750; x += 14) { g.moveTo(x, 440); g.lineTo(x + 5, 422 + random() * 8); } g.stroke();
          for (const x of [60, 100, 690]) { line([x, 425, x, 380], 4, '#bfe8a8'); circle(x, 370, 12, 6, ['#f2a6c0', '#f29a8a', '#a9d8f2'][Math.floor(random() * 3)], true); }
          write('my famly', 400, 490, 40, '#a9d8f2');
        } else if (a.legible === 'hangman') {
          line([80, 440, 260, 440], 8); line([130, 440, 130, 110, 290, 110, 290, 160], 8); line([130, 170, 190, 110], 6);
          circle(290, 192, 32, 6); line([290, 224, 290, 330], 6); line([290, 250, 245, 300], 6); line([290, 250, 335, 300], 6); line([290, 330, 255, 400], 6);
          const word = ['SUMMER', 'HOLIDAY', 'FREEDOM', 'GOODBYE'][Math.floor(random() * 4)];
          [...word].forEach((ch, i) => { const x = 400 + i * 50; line([x, 330, x + 36, 330], 5); if (random() < 0.55) write(ch, x + 4, 322, 44, '#f6e27a'); });
          let wx = 410; for (const ch of 'TQXZ') { wx = write(ch, wx, 180, 50, '#f29a8a') + 26; line([wx - 70, 190, wx - 30, 140], 4, '#f29a8a'); }
        } else if (a.legible === 'lines') {
          for (let i = 0; i < 7; i++) write('I must not talk in class.', 40 + random() * 10, 68 + i * 66, 46 - i * 1.2);
        }
      }
      g.globalAlpha = 1;
      // The eraser: broad felt swipes coming in from one side.
      const amount = content ? a.wiped : 0.5;
      const swipes = Math.round(amount * 9);
      const fromRight = random() < 0.5;
      for (let i = 0; i < swipes; i++) {
        const reach = 768 * mix(0.25, 0.9, amount) * (0.6 + random() * 0.4);
        const y = random() * 512, x0 = fromRight ? 780 : -12, x1 = fromRight ? 768 - reach : reach;
        const path = () => { g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo((x0 + x1) / 2, y + (random() - 0.5) * 60, x1, y + (random() - 0.5) * 140); };
        const width = 70 + random() * 50;
        g.lineCap = 'butt';
        g.strokeStyle = css; g.globalAlpha = 0.86; g.lineWidth = width; path(); g.stroke();
        g.strokeStyle = '#e8eae0'; g.globalAlpha = 0.07; g.lineWidth = width * 1.05; path(); g.stroke();
      }
      g.globalAlpha = 1;
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; textures.push(t);
      return t;
    };

    const frameColour = { steel: '#8f969a', oak: '#7a5230', bright: '#d8352c' }[a.frame];
    const frame = s.material(frameColour, { metalness: a.frame === 'steel' ? 0.7 : 0.05, roughness: a.frame === 'steel' ? 0.4 : 0.55 });
    const accent = a.frame === 'bright' ? s.material('#f0c020', { roughness: 0.5 }) : frame;
    const rim = s.material(a.frame === 'steel' ? '#c2c6c8' : a.frame === 'oak' ? '#8a5f38' : '#f0c020', { metalness: a.frame === 'steel' ? 0.6 : 0.05, roughness: 0.5 });
    const dark = s.material('#1f2022', { roughness: 0.7 });

    // The swivelling board, built in its own group about the pivot.
    const board = new THREE.Group();
    board.position.set(0, CY, 0);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: [number, number, number]) => { const m = new THREE.Mesh(geometry, material); m.position.set(...at); m.castShadow = m.receiveShadow = true; board.add(m); return m; };
    const edge = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.8 });
    const face = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, roughness: 0.92 });
    add(new THREE.BoxGeometry(BW, BH, 0.024), [edge, edge, edge, edge, face(paintBoard(true)), face(paintBoard(false))], [0, 0, 0]);
    const rw = 0.045;
    for (const side of [-1, 1]) { add(new THREE.BoxGeometry(rw, BH + rw * 2, 0.045), rim, [side * (BW / 2 + rw / 2), 0, 0]); add(new THREE.BoxGeometry(BW, rw, 0.045), rim, [0, side * (BH / 2 + rw / 2), 0]); }
    // Chalk tray along the bottom of the front face.
    const trayY = -BH / 2 - rw + 0.005, trayZ = 0.065;
    add(new THREE.BoxGeometry(BW * 0.9, 0.014, 0.09), rim, [0, trayY, trayZ]);
    add(new THREE.BoxGeometry(BW * 0.9, 0.03, 0.01), rim, [0, trayY + 0.012, trayZ + 0.045]);
    const dust = new THREE.MeshStandardMaterial({ color: '#e9e9e0', roughness: 1 });
    add(new THREE.BoxGeometry(BW * 0.86, 0.003, 0.07), dust, [0, trayY + 0.008, trayZ]).castShadow = false;
    const chalkStick = (x: number, len: number, colour: string) => { const m = add(new THREE.CylinderGeometry(0.006, 0.006, len, 8), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.95 }), [x, trayY + 0.016, trayZ + (random() - 0.5) * 0.03]); m.rotation.set(0, (random() - 0.5) * 0.8, Math.PI / 2); };
    if (a.tray !== 'bare') {
      const ex = (random() < 0.5 ? -1 : 1) * BW * 0.25;
      add(new THREE.BoxGeometry(0.13, 0.022, 0.05), new THREE.MeshStandardMaterial({ color: '#8a5f38', roughness: 0.6 }), [ex, trayY + 0.043, trayZ]);
      add(new THREE.BoxGeometry(0.135, 0.022, 0.055), new THREE.MeshStandardMaterial({ color: '#55585c', roughness: 1 }), [ex, trayY + 0.021, trayZ]);
      const colours = a.tray === 'colours' ? ['#f6e27a', '#f2a6c0', '#a9d8f2', '#bfe8a8', '#f29a8a', '#c9a8f0'] : ['#f4f4ec'];
      const n = a.tray === 'colours' ? 7 : 3 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) chalkStick(-ex + (i - n / 2) * 0.06 + (random() - 0.5) * 0.03, a.tray === 'stubs' ? 0.02 + random() * 0.03 : 0.05 + random() * 0.03, colours[i % colours.length]);
      if (a.tray === 'box') { add(new THREE.BoxGeometry(0.11, 0.035, 0.07), new THREE.MeshStandardMaterial({ color: '#e8e2c8', roughness: 0.9 }), [ex * 0.2, trayY + 0.025, trayZ]); add(new THREE.BoxGeometry(0.1, 0.01, 0.06), new THREE.MeshStandardMaterial({ color: '#f4f4ec', roughness: 0.9 }), [ex * 0.2, trayY + 0.04, trayZ]); add(new THREE.BoxGeometry(0.11, 0.07, 0.004), new THREE.MeshStandardMaterial({ color: '#3f7ac0', roughness: 0.9 }), [ex * 0.2, trayY + 0.06, trayZ - 0.036]); }
    }
    if (a.left === 'cloth') {
      const cloth = new THREE.MeshStandardMaterial({ color: '#e0c040', roughness: 1 });
      const cx = BW / 2 - 0.12;
      add(new THREE.BoxGeometry(0.24, 0.035, 0.06), cloth, [cx, BH / 2 + rw + 0.01, 0]);
      add(new THREE.BoxGeometry(0.22, 0.26, 0.012), cloth, [cx, BH / 2 + rw - 0.11, 0.03]).rotation.z = 0.05;
      add(new THREE.BoxGeometry(0.2, 0.16, 0.012), cloth, [cx - 0.01, BH / 2 + rw - 0.06, -0.03]);
    } else if (a.left === 'note') {
      const note = add(new THREE.BoxGeometry(0.21, 0.29, 0.002), new THREE.MeshStandardMaterial({ color: '#f6f2e4', roughness: 0.9 }), [-BW / 2 + 0.17, BH / 2 - 0.2, 0.015]);
      note.rotation.z = (random() - 0.5) * 0.3; note.castShadow = false;
      for (let i = 0; i < 5; i++) { const l = add(new THREE.BoxGeometry(0.15 - (i === 4 ? 0.06 : 0), 0.008, 0.001), dark, [-BW / 2 + 0.17, BH / 2 - 0.11 - i * 0.04, 0.017]); l.rotation.z = note.rotation.z; l.castShadow = false; }
      add(new THREE.BoxGeometry(0.07, 0.025, 0.002), new THREE.MeshStandardMaterial({ color: '#d9c27a', roughness: 0.6 }), [-BW / 2 + 0.17, BH / 2 - 0.06, 0.018]);
    }
    const angle = { upright: -0.06, back: -0.38, forward: 0.3, flat: -1.3 }[a.tilt] + (random() - 0.5) * 0.06;
    board.rotation.x = angle;
    s.root.add(board);

    // The stand: two uprights on castor feet, a low stretcher, pivot knobs.
    const px = BW / 2 + rw + 0.045, footL = 0.62;
    for (const side of [-1, 1]) {
      const x = side * px;
      if (a.frame === 'steel') {
        s.rod([x, 0.1, 0], [x, CY + 0.12, 0], 0.02, frame);
        s.rod([x, 0.1, -footL / 2], [x, 0.1, footL / 2], 0.02, frame);
        s.rod([x, 0.1, -footL / 2 + 0.08], [x, 0.5, 0], 0.012, frame); s.rod([x, 0.1, footL / 2 - 0.08], [x, 0.5, 0], 0.012, frame);
      } else {
        s.box([0.05, CY + 0.2, 0.07], [x, 0.1 + (CY + 0.2) / 2, 0], frame);
        s.box([0.06, 0.07, footL], [x, 0.115, 0], accent);
        for (const z of [-1, 1]) s.box([0.035, 0.5, 0.04], [x, 0.36, z * 0.14], accent).rotation.x = -z * 0.55;
        s.ball([0.04, 0.04, 0.04], [x, CY + 0.34, 0], accent, 12);
      }
      const knob = s.cylinder(0.04, 0.04, 0.05, [x + side * 0.035, CY, 0], a.frame === 'steel' ? dark : accent, 14); knob.rotation.z = Math.PI / 2;
      s.rod([side * (BW / 2 + rw), CY, 0], [x, CY, 0], 0.012, dark);
      for (const z of [-1, 1]) {
        const cz = z * (footL / 2 - 0.03), swivel = (random() - 0.5) * 1.6;
        s.cylinder(0.014, 0.014, 0.04, [x, 0.075, cz], dark, 8);
        const wheel = s.cylinder(0.04, 0.04, 0.028, [x + Math.sin(swivel) * 0.012, 0.04, cz + Math.cos(swivel) * 0.012], dark, 14);
        wheel.rotation.set(0, swivel, Math.PI / 2);
      }
    }
    if (a.frame === 'steel') s.rod([-px, 0.22, 0], [px, 0.22, 0], 0.016, frame); else s.box([px * 2, 0.07, 0.035], [0, 0.26, 0], frame);

    if (a.left === 'pointer') {
      const wood = s.material('#c9a064', { roughness: 0.6 });
      s.rod([px + 0.2, 0, 0.3], [px + 0.03, CY + 0.25, 0.04], 0.009, wood, 0.005);
      s.cylinder(0.011, 0.011, 0.03, [px + 0.03, CY + 0.25, 0.04], dark, 8).visible = false;
    } else if (a.left === 'satchel') {
      const leather = s.material(mood.cheer > 0.5 ? '#c8402c' : '#6a4526', { roughness: 0.75 });
      const bx = -px + 0.28, bz = 0.42;
      const bag = s.box([0.36, 0.26, 0.12], [bx, 0.13, bz], leather); bag.rotation.y = 0.3;
      const flap = s.box([0.37, 0.15, 0.13], [bx, 0.2, bz + 0.004], s.material(mood.cheer > 0.5 ? '#a8301f' : '#553519', { roughness: 0.7 })); flap.rotation.y = 0.3;
      for (const dx of [-0.09, 0.09]) { const strap = s.box([0.03, 0.12, 0.006], [bx + dx * Math.cos(0.3) + 0.065 * Math.sin(0.3), 0.14, bz - dx * Math.sin(0.3) + 0.065 * Math.cos(0.3)], s.material('#d8b23a', { metalness: 0.5 })); strap.rotation.y = 0.3; }
      s.tube([[bx - 0.15, 0.25, bz + 0.04], [bx - 0.3, 0.12, bz + 0.2], [bx - 0.1, 0.012, bz + 0.34], [bx + 0.16, 0.012, bz + 0.26], [bx + 0.17, 0.25, bz - 0.06]], 0.012, leather);
    }

    const thing = s.finish();
    const dispose = thing.dispose;
    return { ...thing, dispose: () => { for (const t of textures) t.dispose(); dispose(); } };
  },
});
