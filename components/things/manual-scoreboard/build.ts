import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { Batch, aged, paint } from './lib';

const SCHEMES = {
  green: 'Deep ballpark green with cream lettering and cream plates, the classic.',
  navy: 'Navy blue with white lettering, crisp and booster-club proud.',
  barn: 'Barn red with cream lettering, a farm-town field.',
  black: 'Flat black with school-bus yellow lettering and yellow plates.',
  white: 'Whitewashed boards with blue lettering and dark plates, sun-bleached and plain.',
} as const;
const SCHEME: Record<keyof typeof SCHEMES, { board: string; ink: string; plate: string; plateInk: string }> = {
  green: { board: '#1f4a33', ink: '#f3eedd', plate: '#f3eedd', plateInk: '#1a1c1b' },
  navy: { board: '#1c2e55', ink: '#ffffff', plate: '#ffffff', plateInk: '#14203c' },
  barn: { board: '#8a2f25', ink: '#f4e9cf', plate: '#f4e9cf', plateInk: '#2a1512' },
  black: { board: '#222527', ink: '#f0c535', plate: '#f0c535', plateInk: '#18191a' },
  white: { board: '#e6e2d2', ink: '#1f3d75', plate: '#26303c', plateInk: '#f1efe6' },
};

const TEAMS = {
  tigers: 'HOME OF THE TIGERS',
  mudcats: 'HOME OF THE MUDCATS',
  cardinals: 'CARDINALS BASEBALL',
  memorial: 'MEMORIAL FIELD',
  legion: 'AMERICAN LEGION POST 41',
  little: 'LITTLE LEAGUE',
} as const;

const SPONSORS = {
  hardware: "DALE'S HARDWARE",
  bank: 'FARMERS STATE BANK',
  feed: 'CO-OP FEED & SEED',
  diner: 'EAT AT THE DUGOUT DINER',
  funeral: 'HENSLEY FUNERAL HOME',
  insurance: 'RAY PIKE INSURANCE',
  blank: '',
} as const;

type Line = (number | null)[];
const INNINGS = 7;

export default defineThing({
  questions: {
    game: choice('What story do the numbers on the board tell?', {
      pregame: 'Nothing hung yet: every slot empty, the game has not started or the season is over.',
      blowout: 'A lopsided blowout stopped early by the mercy rule, the home row full of crooked numbers.',
      duel: 'Zeros nearly all the way across, one lonely run deciding it.',
      tied: 'Dead even going into the bottom of the last inning, everything still to play for.',
      walkoff: 'The home team down by one, then a 2 hung in the bottom of the last: a walk-off win.',
      collapse: 'The home team ahead all night until the guests hung a huge number in the final inning.',
      rainout: 'Two and a half innings up, then nothing: called for rain or darkness and never finished.',
    }),
    scheme: choice('What colours is the board painted?', SCHEMES),
    team: choice('What is lettered across the top?', {
      tigers: 'HOME OF THE TIGERS, school pride.',
      mudcats: 'HOME OF THE MUDCATS, a scrappy river-town nickname.',
      cardinals: 'CARDINALS BASEBALL, borrowed from the big leagues.',
      memorial: 'MEMORIAL FIELD, named for someone the town lost.',
      legion: 'AMERICAN LEGION POST 41, veterans and summer ball.',
      little: 'LITTLE LEAGUE, small children in big caps.',
    }),
    sponsor: choice('Whose name is on the sponsor panel hung below?', {
      hardware: "DALE'S HARDWARE, a main-street shop.",
      bank: 'FARMERS STATE BANK, steady and respectable.',
      feed: 'CO-OP FEED & SEED, farm country.',
      diner: 'EAT AT THE DUGOUT DINER, pie after the game.',
      funeral: 'HENSLEY FUNERAL HOME, darkly funny and completely normal.',
      insurance: 'RAY PIKE INSURANCE, a man everybody knows.',
      blank: 'No sponsor: a bare primed panel where a name used to be.',
    }),
    support: choice('How does it stand?', {
      posts: 'Two tall timber posts with diagonal braces, set straight into the outfield grass.',
      pipes: 'Four welded steel pipe legs, municipal and plain.',
      catwalk: 'Timber posts with a plank catwalk and handrail along the bottom for the kid who changes the numbers.',
    }),
    crown: choice('What runs along the top edge?', {
      flat: 'Nothing: a bare flat top.',
      lamps: 'A row of gooseneck sign lamps leaning over the face.',
      roof: 'A little shingled rain roof.',
      pennants: 'A flagpole at one end and a string of pennants.',
    }),
    keeper: noul('Has the scorekeeper left a ladder and a crate of spare number plates at its foot?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const scheme = SCHEME[a.scheme];
    const W = 5.2, H = 2.5, Y0 = 1.75, TOP = Y0 + H, FRONT = 0.03;
    const PX = 1040, PY = 500;
    const toX = (px: number) => (px / PX - 0.5) * W;
    const toY = (py: number) => TOP - (py / PY) * H;
    const boardColour = aged(scheme.board, mood.wear * 0.3);

    // ----- the game -----
    const empty = (): Line => Array.from({ length: INNINGS }, () => null);
    const guest = empty(), home = empty();
    const pick = (max: number) => Math.floor(random() * (max + 1));
    const fill = (line: Line, upTo: number, max: number, zeroBias: number) => {
      for (let i = 0; i < upTo; i++) line[i] = random() < zeroBias ? 0 : 1 + pick(max - 1);
    };
    const total = (line: Line) => line.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    if (a.game === 'blowout') {
      fill(guest, 4, 1, 0.75);
      for (let i = 0; i < 4; i++) home[i] = 2 + pick(5);
    } else if (a.game === 'duel') {
      for (let i = 0; i < INNINGS; i++) guest[i] = 0;
      for (let i = 0; i < INNINGS - 1; i++) home[i] = 0;
      home[2 + pick(3)] = 1;
    } else if (a.game === 'tied') {
      fill(guest, INNINGS, 3, 0.55);
      fill(home, INNINGS - 1, 3, 0.55);
      let gap = total(guest) - total(home);
      for (let i = 0; gap !== 0 && i < 40; i++) {
        const line = gap > 0 ? home : guest, index = pick(INNINGS - 2);
        line[index] = (line[index] ?? 0) + 1;
        gap = total(guest) - total(home);
      }
    } else if (a.game === 'walkoff') {
      fill(guest, INNINGS, 2, 0.6);
      fill(home, INNINGS - 1, 2, 0.6);
      let gap = total(guest) - total(home) - 1;
      for (let i = 0; gap !== 0 && i < 40; i++) {
        const line = gap > 0 ? home : guest, index = pick(INNINGS - 2);
        line[index] = (line[index] ?? 0) + 1;
        gap = total(guest) - total(home) - 1;
      }
      home[INNINGS - 1] = 2;
    } else if (a.game === 'collapse') {
      fill(guest, INNINGS - 1, 1, 0.8);
      fill(home, INNINGS - 1, 2, 0.5);
      if (total(home) <= total(guest)) home[1] = (home[1] ?? 0) + 3;
      guest[INNINGS - 1] = Math.min(9, total(home) - total(guest) + 2 + pick(3));
      home[INNINGS - 1] = 0;
    } else if (a.game === 'rainout') {
      fill(guest, 3, 3, 0.5);
      fill(home, 2, 3, 0.5);
    }
    const playing = a.game !== 'pregame';
    const totals = (line: Line): Line => playing ? [Math.min(total(line), 19), Math.min(total(line) + 1 + pick(4), 19), pick(3)] : [null, null, null];

    // ----- layout shared by the painted face and the hung plates (canvas pixels) -----
    const cell = 76, firstX = 250, totalsX = firstX + INNINGS * cell + 34;
    const columnX = (i: number) => (i < INNINGS ? firstX + i * cell : totalsX + (i - INNINGS) * cell) + cell / 2;
    const rowY = [232, 368];
    const plateW = 60, plateH = 104;

    const face = paint(PX, PY, (ctx, w, h) => {
      ctx.fillStyle = `#${boardColour.getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      // Plywood sheets and grain.
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 2;
      for (let x = 244; x < w; x += 244) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < 70; i++) { const y = random() * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + (random() - 0.5) * 8); ctx.stroke(); }
      ctx.fillStyle = scheme.ink;
      ctx.strokeStyle = scheme.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.font = 'bold 58px Arial, Helvetica, sans-serif';
      ctx.fillText(TEAMS[a.team], w / 2, 58, w - 80);
      ctx.fillRect(30, 100, w - 60, 5);
      ctx.font = 'bold 44px Arial, Helvetica, sans-serif';
      for (let i = 0; i < INNINGS; i++) ctx.fillText(String(i + 1), columnX(i), 138);
      ['R', 'H', 'E'].forEach((letter, i) => ctx.fillText(letter, columnX(INNINGS + i), 138));
      ctx.font = 'bold 62px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('GUEST', 34, rowY[0] + 4, 196);
      ctx.fillText('HOME', 34, rowY[1] + 4, 196);
      // Empty slots: a darker recess and a nail to hang the plate on.
      for (const y of rowY) for (let i = 0; i < INNINGS + 3; i++) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(columnX(i) - plateW / 2 - 3, y - plateH / 2 - 3, plateW + 6, plateH + 6);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.arc(columnX(i), y - plateH / 2 + 10, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      // Count lamps along the bottom.
      ctx.fillStyle = scheme.ink;
      ctx.font = 'bold 36px Arial, Helvetica, sans-serif';
      ctx.fillText('BALL', 60, 462);
      ctx.fillText('STRIKE', 400, 462);
      ctx.fillText('OUT', 760, 462);
      // Weather: peeled patches down to grey ply, and rain streaks from the top edge.
      const peels = Math.floor(mood.wear * mood.wear * 60);
      for (let i = 0; i < peels; i++) {
        ctx.fillStyle = `rgba(${150 + random() * 40},${138 + random() * 30},${112 + random() * 30},${0.55 + random() * 0.4})`;
        ctx.beginPath();
        ctx.ellipse(random() * w, random() < 0.6 ? h - random() * random() * 160 : random() * h, 4 + random() * 22, 3 + random() * 9, (random() - 0.5) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < mood.wear * 60; i++) {
        ctx.fillStyle = `rgba(20,16,10,${0.05 + random() * 0.12})`;
        ctx.fillRect(random() * w, 0, 2 + random() * 5, 60 + random() * 300);
      }
    });

    const paintMaterial = new THREE.MeshStandardMaterial({ map: face, roughness: 0.85 });
    s.mesh(new THREE.PlaneGeometry(W, H), paintMaterial, [0, Y0 + H / 2, FRONT + 0.001]);

    const timber = aged('#8a6a48', mood.wear * 0.5, '#8c8a82');
    const steel = aged('#8f979a', mood.wear * 0.4, '#7a5a40');
    const frame = new Batch();
    frame.box([W, H, FRONT * 2], [0, Y0 + H / 2, 0], aged('#b89b6c', 0.25 + mood.wear * 0.5));
    // Back framing so it is not a blank slab from behind.
    for (const y of [Y0 + 0.08, Y0 + H / 2, TOP - 0.08]) frame.box([W, 0.09, 0.05], [0, y, -FRONT - 0.025], timber);
    for (let x = -W / 2 + 0.05; x <= W / 2; x += (W - 0.1) / 6) frame.box([0.05, H, 0.05], [x, Y0 + H / 2, -FRONT - 0.03], timber);

    // ----- supports -----
    const postX = W / 2 - 0.55, postZ = -FRONT - 0.13;
    if (a.support === 'pipes') {
      for (const x of [-postX, postX]) {
        frame.cyl(0.055, 0.055, TOP - 0.2, [x, (TOP - 0.2) / 2, postZ - 0.02], steel, 10);
        frame.rod([x, 0, postZ - 1.1], [x, TOP - 0.9, postZ - 0.05], 0.045, steel);
        frame.rod([x, 1.2, postZ - 0.05], [x, 1.2, postZ - 0.7], 0.03, steel);
      }
      frame.rod([-postX, 0.9, postZ - 0.02], [postX, Y0 - 0.1, postZ - 0.02], 0.025, steel);
      frame.rod([postX, 0.9, postZ - 0.02], [-postX, Y0 - 0.1, postZ - 0.02], 0.025, steel);
    } else {
      for (const x of [-postX, postX]) {
        frame.box([0.16, TOP + 0.25, 0.16], [x, (TOP + 0.25) / 2 - 0.1, postZ], timber);
        frame.rod([x, 0.05, postZ - 1.1], [x, 2.6, postZ - 0.05], 0.05, timber, 4);
        frame.box([0.2, 0.04, 0.2], [x, TOP + 0.17, postZ], aged('#5d5a52', mood.wear * 0.3));
      }
      frame.rod([-postX, 0.35, postZ], [postX, Y0 - 0.15, postZ], 0.04, timber, 4);
    }
    if (a.support === 'catwalk') {
      const deck = Y0 - 0.12;
      frame.box([W + 0.5, 0.05, 0.62], [0, deck, 0.34], timber);
      for (let x = -W / 2; x <= W / 2 + 0.01; x += W / 4) {
        frame.box([0.07, 0.1, 0.9], [x, deck - 0.07, 0.2], timber);
        frame.rod([x, deck - 0.1, 0.6], [x, deck - 0.75, -0.1], 0.03, timber, 4);
        frame.box([0.05, 0.95, 0.05], [x, deck + 0.47, 0.62], timber);
      }
      frame.box([W + 0.5, 0.05, 0.06], [0, deck + 0.95, 0.62], timber);
      frame.box([W + 0.5, 0.04, 0.04], [0, deck + 0.5, 0.62], timber);
      // A fixed ladder up one end.
      const lx = W / 2 + 0.05;
      for (const dz of [0.15, 0.55]) frame.box([0.05, deck + 1, 0.05], [lx + 0.22, (deck + 1) / 2, dz], timber);
      for (let y = 0.3; y < deck + 0.9; y += 0.3) frame.box([0.035, 0.035, 0.42], [lx + 0.22, y, 0.35], timber);
    }

    // ----- sponsor panel hung below -----
    const sponsorText = SPONSORS[a.sponsor];
    const sponsorColours = { hardware: ['#b3321f', '#fff4d6'], bank: ['#f1ead2', '#1d4a36'], feed: ['#e2b324', '#2a2415'], diner: ['#f5efe0', '#b3321f'], funeral: ['#2b2d38', '#e8dcb8'], insurance: ['#2f5f9a', '#ffffff'], blank: ['#c9c6ba', '#c9c6ba'] }[a.sponsor];
    const sponsorH = 0.62, sponsorY = a.support === 'catwalk' ? Y0 - 0.62 : Y0 - 0.42;
    const sponsorMap = paint(1024, 124, (ctx, w, h) => {
      ctx.fillStyle = `#${aged(sponsorColours[0], mood.wear * 0.35).getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = ctx.fillStyle = sponsorColours[1];
      ctx.lineWidth = 5;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.font = 'bold 74px Georgia, "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sponsorText, w / 2, h / 2 + 4, w - 70);
      for (let i = 0; i < mood.wear * 26; i++) {
        ctx.fillStyle = `rgba(150,140,118,${0.4 + random() * 0.5})`;
        ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 6 + random() * 40, 4 + random() * 14, random() * 3, 0, Math.PI * 2); ctx.fill();
      }
    });
    const sponsorTilt = a.sponsor === 'blank' || mood.wear > 0.7 ? (random() - 0.5) * 0.09 : 0;
    const sponsor = s.mesh(new THREE.BoxGeometry(W - 0.5, sponsorH, 0.03), [
      ...Array.from({ length: 4 }, () => s.material('#b89b6c')),
      new THREE.MeshStandardMaterial({ map: sponsorMap, roughness: 0.85 }), s.material('#b89b6c'),
    ] as unknown as THREE.Material, [0, sponsorY, 0.02]);
    sponsor.rotation.z = sponsorTilt;

    // ----- crown -----
    const bulbs: { at: [number, number, number]; size: number }[] = [];
    if (a.crown === 'lamps') {
      for (let i = 0; i < 4; i++) {
        const x = (i - 1.5) * (W / 4);
        frame.rod([x, TOP, -0.02], [x, TOP + 0.3, 0.1], 0.018, '#30332f');
        frame.rod([x, TOP + 0.3, 0.1], [x, TOP + 0.18, 0.42], 0.018, '#30332f');
        frame.cyl(0.04, 0.15, 0.13, [x, TOP + 0.13, 0.46], '#2f4f3c', 12, [0.5, 0, 0]);
        bulbs.push({ at: [x, TOP + 0.07, 0.49], size: 0.05 });
      }
    } else if (a.crown === 'roof') {
      const shingle = aged('#5a4a42', mood.wear * 0.4);
      frame.box([W + 0.5, 0.05, 0.5], [0, TOP + 0.2, 0.02], shingle, [0.32, 0, 0]);
      frame.box([W + 0.5, 0.05, 0.4], [0, TOP + 0.18, -0.36], shingle, [-0.5, 0, 0]);
      for (let x = -W / 2; x <= W / 2 + 0.01; x += W / 5) frame.box([0.05, 0.05, 0.4], [x, TOP + 0.14, 0.05], timber, [0.32, 0, 0]);
    } else if (a.crown === 'pennants') {
      const px = -postX, poleTop = TOP + 2.1;
      frame.cyl(0.025, 0.035, 2.2, [px, TOP + 1.05, postZ], '#d9dcd8', 8);
      frame.ball([0.05, 0.05, 0.05], [px, poleTop + 0.03, postZ], '#d8b23a', 10);
      const flagColours = ['#c5392b', '#f1ead2', '#2d5aa0', '#e5b22a'];
      const droop = mix(0.55, 0.12, mood.energy);
      frame.box([0.9, 0.55, 0.012], [px + 0.4, poleTop - 0.32 - droop * 0.2, postZ], mood.cheer > 0.45 ? '#c5392b' : '#8d8f96', [0, 0, -droop]);
      const count = 11;
      for (let i = 0; i <= count; i++) {
        const t = i / count, x = mix(px, postX, t), y = mix(poleTop - 0.9, TOP + 0.25, t) - Math.sin(t * Math.PI) * 0.35;
        if (i < count) {
          const t2 = (i + 1) / count;
          frame.rod([x, y, postZ], [mix(px, postX, t2), mix(poleTop - 0.9, TOP + 0.25, t2) - Math.sin(t2 * Math.PI) * 0.35, postZ], 0.006, '#e8e4d8', 4);
        }
        if (i > 0 && (mood.wear < 0.6 || random() > 0.35)) frame.add(new THREE.ConeGeometry(0.11, 0.26, 3), flagColours[i % 4], [x, y - 0.14, postZ], [Math.PI, 0, (random() - 0.5) * 0.5], [1, 1, 0.12]);
      }
    }

    // ----- number plates: one textured mesh, each quad cut from a painted atlas -----
    const COLS = 6, ROWS = 4;
    const atlas = paint(COLS * 80, ROWS * 128, (ctx) => {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let n = 0; n < COLS * ROWS; n++) {
        const x = (n % COLS) * 80, y = Math.floor(n / COLS) * 128;
        ctx.fillStyle = `#${aged(scheme.plate, mood.wear * 0.25 * (0.5 + random())).getHexString()}`;
        ctx.fillRect(x, y, 80, 128);
        ctx.fillStyle = scheme.plateInk;
        ctx.beginPath(); ctx.arc(x + 40, y + 12, 5, 0, Math.PI * 2); ctx.fill();
        if (n > 19) continue;
        ctx.font = `bold ${n > 9 ? 78 : 104}px Arial, Helvetica, sans-serif`;
        ctx.fillText(String(n), x + 40, y + 74, 72);
      }
    });
    const positions: number[] = [], uvs: number[] = [], normals: number[] = [];
    const corner = new THREE.Vector3();
    const quad = (n: number, matrix: THREE.Matrix4, w: number, h: number) => {
      const u0 = (n % COLS) / COLS, v1 = 1 - Math.floor(n / COLS) / ROWS, u1 = u0 + 1 / COLS, v0 = v1 - 1 / ROWS;
      const normal = new THREE.Vector3(0, 0, 1).transformDirection(matrix);
      for (const [x, y, u, v] of [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, -1, u0, v0], [1, 1, u1, v1], [-1, 1, u0, v1]]) {
        corner.set(x * w / 2, y * h / 2 - h / 2, 0).applyMatrix4(matrix);
        positions.push(corner.x, corner.y, corner.z);
        uvs.push(u, v);
        normals.push(normal.x, normal.y, normal.z);
      }
    };
    const pw = (plateW / PX) * W, ph = (plateH / PY) * H;
    const fallen: number[] = [];
    let swinger: THREE.Mesh | null = null;
    const hang = (value: number | null, column: number, row: number) => {
      if (value === null) return;
      if (random() < mood.wear * mood.wear * 0.3) { fallen.push(value); return; }
      const roll = (random() - 0.5) * (0.04 + mood.wear * 0.3);
      const matrix = new THREE.Matrix4().makeRotationZ(roll).setPosition(toX(columnX(column)), toY(rowY[row] - plateH / 2), FRONT + 0.012 + random() * 0.004);
      quad(value, matrix, pw, ph);
    };
    guest.forEach((value, i) => hang(value, i, 0));
    home.forEach((value, i) => hang(value, i, 1));
    totals(guest).forEach((value, i) => hang(value, INNINGS + i, 0));
    totals(home).forEach((value, i) => hang(value, INNINGS + i, 1));

    // Spare and fallen plates on the grass, and the keeper's crate and ladder.
    const groundPlate = (value: number, x: number, z: number) => {
      const matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.PI / 2 + (random() - 0.5) * 0.25, 0, random() * 6.3, 'YXZ')).setPosition(x, 0.02 + random() * 0.03, z);
      quad(value, matrix, pw, ph);
    };
    for (const value of fallen) groundPlate(value, (random() - 0.5) * W * 0.9, 0.3 + random() * 0.55);
    if (a.keeper) {
      const kx = W * 0.2, wood = aged('#a07a4c', mood.wear * 0.4);
      // Stepladder leaning on the face.
      for (const dx of [-0.22, 0.22]) frame.rod([kx + dx, 0, 1.0], [kx + dx * 0.8, Y0 + 0.75, FRONT + 0.06], 0.028, '#c8ccca', 6);
      for (let i = 1; i < 8; i++) { const t = i / 8; frame.rod([kx - 0.22 + t * 0.04, t * (Y0 + 0.75), mix(1.0, FRONT + 0.06, t)], [kx + 0.22 - t * 0.04, t * (Y0 + 0.75), mix(1.0, FRONT + 0.06, t)], 0.018, '#c8ccca', 6); }
      // Crate of spare plates.
      const cx = -W * 0.22, cz = 0.75;
      frame.box([0.55, 0.04, 0.4], [cx, 0.02, cz], wood);
      for (const dz of [-0.19, 0.19]) for (const y of [0.12, 0.27]) frame.box([0.55, 0.1, 0.02], [cx, y, cz + dz], wood);
      for (const dx of [-0.265, 0.265]) for (const y of [0.12, 0.27]) frame.box([0.02, 0.1, 0.4], [cx + dx, y, cz], wood);
      const spare = 5 + Math.floor(mood.density * 6);
      for (let i = 0; i < spare; i++) {
        const matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-0.25 + random() * 0.15, 0.1, 0)).setPosition(cx - 0.2 + (i / spare) * 0.4, 0.06 + ph, cz + 0.12 - i * 0.045);
        quad(Math.floor(random() * 10), matrix, pw, ph);
      }
      for (let i = 0; i < 2 + mood.density * 4; i++) groundPlate(Math.floor(random() * 10), cx + (random() - 0.3) * 1.3, cz + 0.15 + random() * 0.6);
    }
    const plateMaterial = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.7, side: THREE.DoubleSide });
    if (positions.length) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      s.mesh(geometry, plateMaterial);
    } else plateMaterial.dispose(), atlas.dispose();

    // One plate hangs by a single nail and swings: the inning being changed right now.
    const live = a.game === 'tied' || a.game === 'rainout' ? { column: a.game === 'tied' ? INNINGS - 1 : 2, row: 1 } : null;
    if (live && positions.length) {
      const geometry = new THREE.PlaneGeometry(pw, ph);
      geometry.translate(0, -ph / 2, 0);
      const n = 20;
      const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, ((n % COLS) + uv.getX(i)) / COLS, 1 - (Math.floor(n / COLS) + 1 - uv.getY(i)) / ROWS);
      swinger = s.mesh(geometry, plateMaterial, [toX(columnX(live.column)), toY(rowY[live.row] - plateH / 2), FRONT + 0.02]);
      swinger.rotation.z = 0.25;
    }

    // ----- count lamps -----
    const lampY = toY(462), lit = playing ? [pick(3), pick(2), pick(2)] : [0, 0, 0];
    const on: typeof bulbs = [], off: typeof bulbs = [];
    [[150, 3], [540, 2], [850, 2]].forEach(([startX, count], group) => {
      for (let i = 0; i < count; i++) (i < lit[group] ? on : off).push({ at: [toX(startX + i * 48), lampY, FRONT + 0.02], size: 0.06 });
    });
    const glow = mix(0.9, 2.4, Math.abs(mood.daylight - 0.5) * 2);
    const sphere = () => new THREE.SphereGeometry(1, 10, 8);
    const warm = new THREE.Color().setHSL(mix(0.14, 0.07, mood.warmth), 0.9, 0.6);
    if (on.length) s.scatter(sphere(), new THREE.MeshStandardMaterial({ color: '#ffd35a', emissive: '#ffb020', emissiveIntensity: glow }), on);
    if (off.length) s.scatter(sphere(), s.material('#4a4f4c', { roughness: 0.3 }), off);
    if (bulbs.length) s.scatter(sphere(), new THREE.MeshStandardMaterial({ color: '#fff3cf', emissive: warm, emissiveIntensity: glow * 0.9 }), bulbs);

    // Uncut grass around the posts.
    const tufts = Math.floor(mix(6, 60, mood.density) * mix(0.5, 1.4, mood.wear));
    const blades = Array.from({ length: tufts }, () => {
      const side = random() < 0.5 ? -1 : 1, spread = random() < 0.6;
      return {
        at: [spread ? side * (postX + (random() - 0.5) * 0.7) : (random() - 0.5) * (W + 0.6), 0, spread ? postZ + (random() - 0.5) * 0.7 : -0.6 + random() * 0.9] as [number, number, number],
        size: 0.4 + random() * (0.4 + mood.wear * 0.5),
        color: new THREE.Color().setHSL(mix(0.2, 0.3, random()), mix(0.25, 0.5, mood.cheer), mix(0.22, 0.34, random())),
      };
    });
    const blade = new THREE.ConeGeometry(0.05, 0.4, 4);
    blade.translate(0, 0.2, 0);
    s.scatter(blade, new THREE.MeshStandardMaterial({ roughness: 0.9 }), blades);

    frame.into(s.root, { roughness: mix(0.7, 0.95, mood.wear) });
    s.root.rotation.z = (random() - 0.5) * mood.wear * 0.07;

    const speed = mix(0.6, 3.2, mood.energy), reach = mix(0.05, 0.4, mood.energy);
    return s.finish({
      update: swinger ? (_dt, time) => { swinger!.rotation.z = 0.12 + Math.sin(time * speed) * reach; } : undefined,
    });
  },
});
