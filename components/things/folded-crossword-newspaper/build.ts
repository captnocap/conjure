import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const HEADLINES = {
  peace: ['PEACE AT LAST', 'Crowds fill the streets'],
  war: ['WAR DECLARED', 'Reservists called up'],
  local: ['PRIZE MARROW STOLEN', 'Show committee baffled'],
  sport: ['CITY WIN THE CUP', 'Late goal settles it'],
  weather: ['SNOW BY MORNING', 'Roads likely to close'],
  money: ['MARKETS TUMBLE', 'Savers told not to panic'],
  moon: ['MAN ON THE MOON', 'The world watches'],
} as const;

export default defineThing({
  questions: {
    complete: score('How much of the crossword is filled in?', [
      'Untouched, not a letter',
      'A few easy ones',
      'About half, stuck',
      'Nearly done, two clues left',
      'Finished, every square',
    ]),
    grid: choice('What kind of crossword is it?', {
      cryptic: 'A British cryptic: a lattice grid with many black squares.',
      american: 'A dense American grid, nearly all white squares.',
      quick: 'A small quick crossword with big squares, done over one cup of tea.',
    }),
    headline: choice('What is the tone of the headline showing above the fold?', {
      peace: 'Joyful: the war is over.',
      war: 'Dreadful: war has been declared.',
      local: 'Parochial and comic: a prize vegetable has been stolen.',
      sport: 'Triumphant sport: the local team has won.',
      weather: 'Mild foreboding: snow is coming.',
      money: 'Anxious: the markets have fallen.',
      moon: 'Historic wonder: a man is on the moon.',
    }),
    coffee: choice('Has a drink left its mark on the paper?', {
      none: 'No, the paper is clean.',
      ring: 'One brown ring where a cup stood.',
      rings: 'Several overlapping rings: the cup came back to the same place all morning.',
      mug: 'The mug is still standing on the paper.',
      spill: 'A splash has soaked one corner brown.',
    }),
    glasses: choice('What reading glasses lie on top?', {
      halfmoon: 'Gold wire half-moons.',
      tortoise: 'Round tortoiseshell frames.',
      black: 'Heavy black square frames.',
      cord: 'Thin steel frames on a neck cord.',
      none: 'None: they went with whoever left.',
    }),
    writer: choice('What has it been filled in with?', {
      pencil: 'A yellow pencil with a rubber on the end.',
      stub: 'A chewed stub of pencil.',
      biro: 'A blue ballpoint: confident.',
      fountain: 'A black fountain pen, cap off.',
    }),
    mistakes: noul('Are there crossed-out and overwritten answers?'),
    extra: choice('What else has been left with it?', {
      none: 'Nothing.',
      dictionary: 'A small fat dictionary, for when nobody is looking.',
      pills: 'A weekly pill organiser with its lids flipped.',
      magnifier: 'A magnifying glass.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wobble = (amount: number) => (random() - 0.5) * 2 * amount;
    const W = 0.32, D = 0.24, T = 0.012;
    const age = mood.wear;
    const paperTone = `rgb(${Math.round(238 - age * 28)},${Math.round(234 - age * 40)},${Math.round(222 - age * 70)})`;
    const ink = a.writer === 'biro' ? '#1f3fa8' : a.writer === 'fountain' ? '#15151c' : '#55555a';

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const g = canvas.getContext('2d')!;
    g.fillStyle = paperTone;
    g.fillRect(0, 0, 1024, 768);
    const grey = (x: number, y: number, w: number, lines: number, gap = 9) => {
      g.fillStyle = 'rgba(40,40,40,0.55)';
      for (let i = 0; i < lines; i++) g.fillRect(x, y + i * gap, w * (i === lines - 1 ? 0.55 + random() * 0.3 : 0.92 + random() * 0.08), 3.5);
    };
    // Above the fold: the rest of the news.
    const [head, sub] = HEADLINES[a.headline];
    g.fillStyle = '#1a1a1a';
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.font = '900 78px Georgia, "Times New Roman", serif';
    g.fillText(head, 28, 64, 968);
    g.font = 'italic 30px Georgia, serif';
    g.fillText(sub, 30, 124, 620);
    g.fillRect(28, 150, 968, 4);
    g.fillRect(28, 158, 968, 1.5);
    // Grid.
    const n = a.grid === 'quick' ? 9 : a.grid === 'cryptic' ? 13 : 15;
    const gx = 40, gy = 196, size = 540, cell = size / n;
    const black: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false));
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        if (r * n + c > (n * n) / 2) continue;
        const dark = a.grid === 'american' ? random() < 0.15 : (r % 2 === 1 && c % 2 === 1) || random() < 0.08;
        black[r][c] = black[n - 1 - r][n - 1 - c] = dark;
      }
    const filled: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false));
    const run = (cells: [number, number][], chance: number) => { if (cells.length > 1 && random() < chance) for (const [r, c] of cells) filled[r][c] = true; };
    for (let pass = 0; pass < 2; pass++)
      for (let i = 0; i < n; i++) {
        let cells: [number, number][] = [];
        for (let j = 0; j <= n; j++) {
          const [r, c] = pass ? [j, i] : [i, j];
          if (j < n && !black[r][c]) cells.push([r, c]);
          else { run(cells, a.complete >= 0.98 ? 1 : a.complete * 0.82); cells = []; }
        }
      }
    g.fillStyle = '#fbf9f2';
    g.fillRect(gx, gy, size, size);
    let number = 1;
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const x = gx + c * cell, y = gy + r * cell;
        if (black[r][c]) { g.fillStyle = '#17171a'; g.fillRect(x, y, cell + 0.5, cell + 0.5); continue; }
        g.strokeStyle = '#17171a';
        g.lineWidth = 1.6;
        g.strokeRect(x, y, cell, cell);
        if ((r === 0 || black[r - 1][c] || c === 0 || black[r][c - 1]) && n < 14) {
          g.fillStyle = '#333'; g.font = `${cell * 0.26}px sans-serif`; g.textAlign = 'left';
          g.fillText(String(number++), x + 2.5, y + cell * 0.2);
        }
        if (a.complete >= 0.98 ? true : filled[r][c] && a.complete > 0.02) {
          g.fillStyle = ink;
          g.textAlign = 'center';
          g.font = `${cell * 0.74}px "Comic Sans MS", "Segoe Print", cursive`;
          g.save();
          g.translate(x + cell / 2 + wobble(cell * 0.06), y + cell * 0.58 + wobble(cell * 0.06));
          g.rotate(wobble(0.12));
          g.fillText('ETAOINSHRDLUCMPGB'[Math.floor(random() * 17)], 0, 0);
          g.restore();
          if (a.mistakes && random() < 0.13) {
            g.strokeStyle = ink;
            g.lineWidth = cell * 0.09;
            g.beginPath();
            for (let k = 0; k < 6; k++) g.lineTo(x + cell * (0.15 + 0.7 * (k % 2)), y + cell * (0.2 + k * 0.12));
            g.stroke();
          }
        }
      }
    g.strokeStyle = '#17171a';
    g.lineWidth = 5;
    g.strokeRect(gx, gy, size, size);
    // Clues.
    g.textAlign = 'left';
    for (const [col, title] of [[0, 'ACROSS'], [1, 'DOWN']] as const) {
      const x = 612 + col * 198;
      g.fillStyle = '#1a1a1a';
      g.font = 'bold 26px Georgia, serif';
      g.fillText(title, x, 208);
      for (let i = 0; i < 16; i++) {
        const y = 236 + i * 31;
        g.fillStyle = '#1a1a1a';
        g.font = 'bold 15px Georgia, serif';
        g.fillText(String(i * 2 + 1 + col * 2), x, y + 6);
        grey(x + 26, y, 150, 2, 11);
        // Solved clues are struck through.
        if (random() < a.complete * 0.9) { g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 2, y + 8 + wobble(3)); g.lineTo(x + 176, y + 6 + wobble(4)); g.stroke(); }
      }
    }
    if (a.mistakes) {
      // Anagram workings in the margin.
      g.fillStyle = ink;
      g.font = '26px "Comic Sans MS", "Segoe Print", cursive';
      g.save(); g.translate(640, 744); g.rotate(-0.05);
      g.fillText('R E T A I N S ?   N A S T I E R', 0, 0); g.restore();
      g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.ellipse(700, 172, 60, 16, 0.05, 0, Math.PI * 2); g.stroke();
    }
    // Drink marks.
    const ringAt = (x: number, y: number, r: number, strength: number) => {
      g.strokeStyle = `rgba(110,65,25,${strength})`;
      g.lineWidth = 9;
      g.beginPath(); g.arc(x, y, r, wobble(1), Math.PI * (1.6 + random() * 0.4) + 1); g.stroke();
      g.fillStyle = `rgba(140,90,40,${strength * 0.18})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    };
    const mugSpot: [number, number] = [860, 110];
    if (a.coffee === 'ring' || a.coffee === 'mug') ringAt(mugSpot[0], mugSpot[1], 96, 0.6);
    if (a.coffee === 'rings') for (let i = 0; i < 4; i++) ringAt(mugSpot[0] - 60 + wobble(110), mugSpot[1] + 30 + wobble(70), 96, 0.3 + random() * 0.35);
    if (a.coffee === 'spill') {
      for (let i = 0; i < 16; i++) { g.fillStyle = `rgba(110,65,25,${0.2 + random() * 0.2})`; g.beginPath(); g.ellipse(880 + wobble(150), 90 + wobble(120), 40 + random() * 90, 30 + random() * 60, random() * 3, 0, Math.PI * 2); g.fill(); }
    }
    if (age > 0.4) for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(150,110,50,${0.05 + random() * 0.08})`; g.beginPath(); g.ellipse(random() * 1024, random() * 768, 60 + random() * 140, 40 + random() * 90, random() * 3, 0, Math.PI * 2); g.fill(); }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    // The folded paper: a stack of leaves with a soft fold along the back edge.
    const pulp = new THREE.MeshStandardMaterial({ color: paperTone, roughness: 1 });
    const edge = new THREE.MeshStandardMaterial({ color: new THREE.Color(paperTone).multiplyScalar(0.86), roughness: 1 });
    const paper = new Sculpture(context);
    const leaves = 4;
    for (let i = 0; i < leaves; i++) {
      const leaf = paper.box([W - (leaves - 1 - i) * 0.004 * random(), T / leaves - 0.0004, D - 0.004], [wobble(0.003), (i + 0.5) * (T / leaves), 0.002 + wobble(0.002)], i % 2 ? pulp : edge);
      leaf.rotation.y = wobble(0.012);
    }
    const fold = paper.cylinder(T / 2, T / 2, W, [0, T / 2, -D / 2 + 0.001], pulp, 12);
    fold.rotation.z = Math.PI / 2;
    const face = paper.mesh(new THREE.PlaneGeometry(W - 0.002, D - 0.002, 8, 1), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 }), [0, T + 0.0006, 0]);
    face.rotation.x = -Math.PI / 2;
    face.castShadow = false;
    // One corner of the top leaf curls up.
    const curl = paper.mesh(new THREE.PlaneGeometry(0.05, 0.05), new THREE.MeshStandardMaterial({ color: paperTone, roughness: 1, side: THREE.DoubleSide }), [-W / 2 + 0.022, T + 0.006 + mood.wear * 0.004, D / 2 - 0.022]);
    curl.rotation.set(-Math.PI / 2 + 0.35, 0, -0.3, 'YXZ');
    paper.root.rotation.y = wobble(0.08);
    s.root.add(paper.root);
    const onPaper = (u: number, v: number): [number, number, number] => [(u / 1024 - 0.5) * W, T + 0.001, (v / 768 - 0.5) * D];

    if (a.coffee === 'mug') {
      const [mx, my, mz] = onPaper(mugSpot[0], mugSpot[1]);
      const glaze = s.material(mood.cheer > 0.5 ? '#d9a03a' : '#6f7f8f', { roughness: 0.3, side: THREE.DoubleSide });
      s.lathe([[0, 0.003], [0.033, 0.003], [0.036, 0.008], [0.038, 0.088], [0.035, 0.088], [0.033, 0.01], [0, 0.008]], glaze, [mx, my, mz]);
      const ear = s.ring(0.022, 0.0055, [mx + 0.05, my + 0.046, mz], glaze, Math.PI * 1.1);
      ear.rotation.z = -Math.PI * 0.55;
      s.cylinder(0.034, 0.034, 0.001, [mx, my + 0.03 + random() * 0.03, mz], new THREE.MeshStandardMaterial({ color: '#3a2212', roughness: 0.15 }), 24);
    }

    // Pencil or pen, lying across the grid.
    const pen = new Sculpture(context);
    if (a.writer === 'pencil' || a.writer === 'stub') {
      const len = a.writer === 'stub' ? 0.065 : 0.16;
      const body = pen.cylinder(0.0036, 0.0036, len, [0, 0, 0], pen.material(a.writer === 'stub' ? '#2f6b4a' : '#e8b820', { roughness: 0.4, flatShading: true }), 6);
      body.rotation.z = Math.PI / 2;
      const wood = pen.cylinder(0.0036, 0.0008, 0.012, [len / 2 + 0.006, 0, 0], pen.material('#e3c08f'), 6);
      wood.rotation.z = Math.PI / 2;
      pen.cylinder(0.001, 0.0001, 0.004, [len / 2 + 0.013, 0, 0], pen.material('#2a2a2e'), 6).rotation.z = Math.PI / 2;
      if (a.writer === 'pencil') {
        pen.cylinder(0.0039, 0.0039, 0.01, [-len / 2 - 0.005, 0, 0], pen.material('#c9ccce', { metalness: 0.8, roughness: 0.3 }), 10).rotation.z = Math.PI / 2;
        pen.cylinder(0.0036, 0.0036, 0.008, [-len / 2 - 0.014, 0, 0], pen.material('#e88a8a'), 10).rotation.z = Math.PI / 2;
      } else pen.ball([0.004, 0.0038, 0.0038], [-len / 2, 0, 0], pen.material('#cdb48a', { roughness: 1 }), 8);
    } else {
      const barrel = pen.material(a.writer === 'biro' ? '#e9eef2' : '#16161a', { roughness: 0.2 });
      const cap = pen.material(a.writer === 'biro' ? '#1f3fa8' : '#16161a', { roughness: 0.25 });
      pen.cylinder(0.004, 0.004, 0.125, [0, 0, 0], barrel, 12).rotation.z = Math.PI / 2;
      pen.cylinder(0.004, 0.001, 0.014, [0.0695, 0, 0], a.writer === 'biro' ? barrel : pen.material('#c9a544', { metalness: 0.9, roughness: 0.25 }), 12).rotation.z = Math.PI / 2;
      pen.cylinder(0.0042, 0.0042, 0.012, [-0.0665, 0, 0], cap, 12).rotation.z = Math.PI / 2;
      if (a.writer === 'fountain') {
        // The cap, set down separately.
        pen.cylinder(0.0048, 0.0048, 0.055, [-0.02, 0.0008, 0.04], cap, 12).rotation.set(0, 0.6, Math.PI / 2);
        pen.cylinder(0.005, 0.005, 0.004, [-0.02, 0.0008, 0.04], pen.material('#c9a544', { metalness: 0.9, roughness: 0.25 }), 12).rotation.set(0, 0.6, Math.PI / 2);
      } else pen.box([0.03, 0.0012, 0.002], [-0.05, 0.0048, 0], cap);
    }
    pen.root.position.set(...onPaper(300 + wobble(60), 520 + wobble(60)));
    pen.root.position.y += 0.0038;
    pen.root.rotation.y = 0.5 + wobble(0.5);
    s.root.add(pen.root);

    // Reading glasses.
    if (a.glasses !== 'none') {
      const specs = new Sculpture(context);
      const frameTint = { halfmoon: '#c9a544', tortoise: '#6b3a17', black: '#141416', cord: '#b9bdc0' }[a.glasses];
      const metal = a.glasses === 'halfmoon' || a.glasses === 'cord';
      const frame = specs.material(frameTint, { metalness: metal ? 0.9 : 0, roughness: metal ? 0.25 : 0.3 });
      const lens = new THREE.MeshPhysicalMaterial({ color: '#dceaf2', transparent: true, opacity: 0.18, roughness: 0.02, depthWrite: false, side: THREE.DoubleSide });
      const rr = a.glasses === 'black' ? 0.023 : 0.021, tube = metal ? 0.0012 : 0.003, squash = a.glasses === 'halfmoon' ? 0.62 : a.glasses === 'black' ? 0.82 : 1;
      const cy = rr * squash + tube;
      for (const side of [-1, 1]) {
        const x = side * (rr + 0.007);
        const rim = specs.mesh(new THREE.TorusGeometry(rr, tube, 8, a.glasses === 'black' ? 4 : 40), frame, [x, cy, 0]);
        if (a.glasses === 'black') rim.rotation.z = Math.PI / 4;
        rim.scale.set(a.glasses === 'black' ? 1.25 : 1, squash, 1);
        const glassDisc = specs.mesh(new THREE.CircleGeometry(rr, a.glasses === 'black' ? 4 : 28), lens, [x, cy, 0]);
        if (a.glasses === 'black') glassDisc.rotation.z = Math.PI / 4;
        glassDisc.scale.set(a.glasses === 'black' ? 1.25 : 1, squash, 1);
        glassDisc.castShadow = false;
        const hinge: [number, number, number] = [side * (rr * (a.glasses === 'black' ? 1.25 * 0.72 : 1) + rr + 0.007 - rr + tube + (a.glasses === 'black' ? 0.004 : 0) + rr * 0), cy + rr * squash * 0.35, 0];
        hinge[0] = side * (rr + 0.007 + rr * (a.glasses === 'black' ? 0.9 : 1) + tube);
        specs.rod(hinge, [hinge[0] + side * 0.004, hinge[1] - 0.004, -0.105], tube * 0.8 + 0.0004, frame);
        specs.rod([hinge[0] + side * 0.004, hinge[1] - 0.004, -0.105], [hinge[0] + side * 0.003, 0.002, -0.128], tube * 0.8 + 0.0004, frame);
      }
      specs.tube([[-0.0075, cy + 0.003, 0], [0, cy + 0.008, 0.001], [0.0075, cy + 0.003, 0]], tube * 0.9 + 0.0003, frame);
      if (a.glasses === 'cord') {
        const cordSkin = specs.material('#2d2d33', { roughness: 0.9 });
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([Math.cos(t * Math.PI) * 0.055, 0.0015, -0.128 - Math.sin(t * Math.PI) * (0.07 + random() * 0.01) + Math.sin(t * 19) * 0.006]); }
        specs.tube(pts, 0.0009, cordSkin);
      }
      specs.root.position.set(...onPaper(560 + wobble(50), 330 + wobble(40)));
      specs.root.rotation.y = -0.45 + wobble(0.5);
      s.root.add(specs.root);
    }

    // Left with it.
    const ex = W / 2 + 0.06, ez = 0.02;
    if (a.extra === 'dictionary') {
      const cover = s.material(mood.cheer > 0.5 ? '#9a2a26' : '#22395e', { roughness: 0.7 });
      const book = new Sculpture(context);
      book.box([0.085, 0.036, 0.125], [0, 0.018, 0], cover);
      book.box([0.079, 0.03, 0.127], [0.004, 0.018, 0], book.material('#efe6cf', { roughness: 1 }));
      book.box([0.087, 0.0015, 0.127], [0, 0.0362, 0], cover);
      book.label('DICTIONARY', 0.06, 0.016, [0, 0.0372, -0.03], '#e8c96a', mood.cheer > 0.5 ? '#9a2a26' : '#22395e').rotation.x = -Math.PI / 2;
      book.root.position.set(ex, 0, ez);
      book.root.rotation.y = 0.25 + wobble(0.2);
      s.root.add(book.root);
    } else if (a.extra === 'pills') {
      const box = new Sculpture(context);
      const shell = box.material('#dfe9ef', { roughness: 0.35 });
      const tints = ['#e85d4a', '#f2c230', '#f7f3ea', '#4aa3d8', '#f2a0b0'];
      for (let i = 0; i < 7; i++) {
        const z = (i - 3) * 0.026;
        box.box([0.034, 0.016, 0.024], [0, 0.008, z], shell);
        const opened = random() < 0.2 + (i < 4 ? 0.6 : 0);
        const lidMesh = box.box([0.034, 0.002, 0.024], [opened ? -0.03 : 0, opened ? 0.022 : 0.017, z], box.material(['#4aa3d8', '#6cc070'][i % 2], { roughness: 0.4 }));
        if (opened) lidMesh.rotation.z = -1.1;
        else continue;
        if (random() < 0.5) for (let p = 0; p < 2; p++) box.ball([0.004, 0.003, 0.004], [wobble(0.008), 0.018, z + wobble(0.006)], box.material(tints[Math.floor(random() * tints.length)]), 8);
      }
      box.root.position.set(ex - 0.01, 0, ez);
      box.root.rotation.y = wobble(0.2);
      s.root.add(box.root);
    } else if (a.extra === 'magnifier') {
      const brassy = s.material('#b9973f', { metalness: 0.9, roughness: 0.3 });
      const glass = new Sculpture(context);
      glass.ring(0.036, 0.004, [0, 0.005, 0], brassy).rotation.x = Math.PI / 2;
      const disc = glass.cylinder(0.035, 0.035, 0.003, [0, 0.005, 0], new THREE.MeshPhysicalMaterial({ color: '#e6f2f6', transparent: true, opacity: 0.3, roughness: 0.02 }), 28);
      disc.castShadow = false;
      glass.rod([0, 0.005, 0.04], [0, 0.007, 0.13], 0.006, glass.material('#3a2a1c', { roughness: 0.5 }), 0.0075);
      glass.root.position.set(W / 2 - 0.02, T + 0.001, D / 2 - 0.05);
      glass.root.rotation.y = -0.7 + wobble(0.3);
      s.root.add(glass.root);
    }
    // Rubbings-out.
    if (a.writer === 'pencil' && a.mistakes) {
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#d98f8f', { roughness: 1 }), Array.from({ length: Math.round(mix(10, 40, mood.density)) }, () => ({
        at: [wobble(W * 0.3) - 0.04, T + 0.0015, wobble(D * 0.3) + 0.02] as const, size: 0.0008 + random() * 0.0012,
      })));
    }

    return s.finish();
  },
});
