import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const HAND = '"Comic Sans MS", "Marker Felt", "Chalkboard SE", "DejaVu Sans", sans-serif';
const HEADERS = { picks: 'STAFF PICKS', recommend: 'WE RECOMMEND', faves: 'EMPLOYEE FAVES', rent: 'RENT THESE!', corner: "DAVE'S CORNER" } as const;
const BOARDS = { tan: ['#c9a876', '#8a6a42'], white: ['#ebe8dd', '#a9a698'], black: ['#2c2d30', '#0f1012'], teal: ['#3f9a94', '#1f5f5a'], red: ['#b8423a', '#6f1f1a'] } as const;
const NAMES = ['DAVE', 'MARIA', 'KEV', 'SAM', 'JO', 'RITA', 'ANDRE', 'LIZ'];
const BRIGHTS = ['#e8382f', '#f6c829', '#2f7fe0', '#3cb563', '#ff8a2a', '#b45ad6', '#23283a', '#ff6fae'];

function paint(w: number, h: number, draw: (c: Ctx) => void, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
  return texture;
}
const scribble = (c: Ctx, x: number, y: number, width: number, random: () => number) => {
  c.beginPath(); c.moveTo(x, y);
  for (let step = 0; step < width; step += 7) c.lineTo(x + step, y + (random() - 0.5) * 9);
  c.stroke();
};
const star = (c: Ctx, x: number, y: number, r: number) => {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, t = i / 10 * Math.PI * 2 - Math.PI / 2; c.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
  c.fill();
};
const heart = (c: Ctx, x: number, y: number, r: number, broken: boolean) => {
  c.beginPath(); c.moveTo(x, y + r); c.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.4); c.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r); c.fill();
  if (broken) { c.strokeStyle = '#fbfaf2'; c.lineWidth = r * 0.18; c.beginPath(); c.moveTo(x - r * 0.1, y - r * 0.5); c.lineTo(x + r * 0.2, y - r * 0.1); c.lineTo(x - r * 0.2, y + r * 0.3); c.lineTo(x + r * 0.05, y + r); c.stroke(); }
};

export default defineThing({
  questions: {
    tone: choice('What is the tone of the recommendation cards?', {
      earnest: 'Earnest: neat index cards, careful handwriting, gold stars, signed with first names.',
      jokey: 'Jokey: bright cards at wild angles, doodles, exclamation marks, SO BAD IT’S GOOD.',
      heartbroken: 'Heartbroken: black marker, broken hearts, LAST PICK and GOODBYE, tear blots.',
      takendown: 'Mostly taken down: pale rectangles and pins where cards were, one left hanging by a corner.',
    }),
    cases: score('How many of the recommended cases are still on their hooks?', ['All six', 'Most', 'A few', 'One', 'None, only empty hooks']),
    photo: choice('Is there a staff photo pinned to it?', {
      group: 'A snapshot of the whole staff grinning behind the counter.',
      solo: 'A single portrait of the manager.',
      removed: 'Only the unfaded patch and four pins where a photo used to be.',
      none: 'There never was one.',
    }),
    farewell: choice('What farewell note is pinned in the middle?', {
      none: 'No note.',
      thanks: 'THANK YOU FOR 20 YEARS, from the staff.',
      rewind: 'BE KIND, REWIND. GOODBYE.',
      signed: 'A big card crowded with customers’ signatures in different pens.',
      final: 'LAST DAY SATURDAY, ALL PICKS $2.',
    }),
    header: choice('What does the header say?', {
      picks: 'STAFF PICKS.', recommend: 'WE RECOMMEND.', faves: 'EMPLOYEE FAVES.', rent: 'RENT THESE!', corner: 'DAVE’S CORNER: one clerk’s personal shrine.',
    }),
    board: choice('What colour is the pegboard?', {
      tan: 'Bare tan hardboard.', white: 'Painted white.', black: 'Black.', teal: 'Shop-livery teal.', red: 'Shop-livery red.',
    }),
    stand: choice('How does it stand?', {
      feet: 'Upright between two timber posts on flat feet.',
      easel: 'Leaning back on a three-legged timber easel.',
      wheels: 'In a steel tube frame on castors, wheeled out each morning.',
    }),
    lights: noul('Is a string of fairy lights draped round the frame?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [boardHex, holeHex] = BOARDS[a.board];
    const W = 1.2, H = 1.3, lift = 0.45;
    const panel = new THREE.Group();
    s.root.add(panel);
    const P = <T extends THREE.Object3D>(node: T) => { panel.add(node); return node; };
    const timber = s.material('#a67c4d');
    const steel = s.material('#b9bfc2', { metalness: 0.75, roughness: 0.35 });
    const hook = s.material('#d9dde0', { metalness: 0.8, roughness: 0.3 });

    const peg = paint(64, 64, (c) => {
      c.fillStyle = boardHex; c.fillRect(0, 0, 64, 64);
      c.fillStyle = holeHex; c.beginPath(); c.arc(32, 32, 7, 0, 7); c.fill();
    }, [24, 26]);
    const boardMat = new THREE.MeshStandardMaterial({ map: peg, roughness: 0.85 });
    const back = s.material(new THREE.Color(boardHex).multiplyScalar(0.7));
    P(s.box([W, H, 0.014], [0, H / 2, 0], [back, back, back, back, boardMat, back] as unknown as THREE.Material));
    for (const x of [-1, 1]) P(s.box([0.03, H + 0.03, 0.03], [x * (W / 2 + 0.012), H / 2, 0], timber));
    P(s.box([W + 0.054, 0.03, 0.03], [0, H + 0.012, 0], timber)); P(s.box([W + 0.054, 0.03, 0.03], [0, -0.012, 0], timber));

    const flat = (texture: THREE.Texture, w: number, h: number, x: number, y: number, turn: number, z = 0.011) => {
      const mesh = P(s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }), [x, y, z]));
      mesh.rotation.z = turn;
      return mesh;
    };
    const pins: { at: [number, number, number]; size: number; color: string }[] = [];
    const pin = (x: number, y: number) => pins.push({ at: [x, y, 0.018], size: 0.009, color: ['#e8382f', '#f6c829', '#2f7fe0', '#3cb563', '#f4f1ea'][Math.floor(random() * 5)] });
    const ghost = (w: number, h: number, x: number, y: number) => {
      P(s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: new THREE.Color(boardHex).lerp(new THREE.Color('#ffffff'), 0.3), roughness: 0.85 }), [x, y, 0.0085]));
      for (const cx of [-1, 1]) for (const cy of [-1, 1]) pin(x + cx * (w / 2 - 0.012), y + cy * (h / 2 - 0.012));
    };

    // Header: cut-paper lettering.
    const headerInk = a.board === 'black' ? '#ffd84a' : '#c3221c';
    flat(paint(512, 96, (c) => {
      c.fillStyle = a.board === 'black' ? '#1b1b1e' : '#fbf6e4'; c.fillRect(0, 0, 512, 96);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold 70px ${HAND}`;
      const text = HEADERS[a.header];
      const total = c.measureText(text).width, squeeze = Math.min(1, 470 / total);
      let x = 256 - total * squeeze / 2;
      [...text].forEach((glyph, index) => {
        const advance = c.measureText(glyph).width * squeeze;
        c.save(); c.translate(x + advance / 2, 50 + (random() - 0.5) * 12); c.rotate((random() - 0.5) * 0.2); c.scale(squeeze, 1);
        c.fillStyle = a.tone === 'jokey' ? BRIGHTS[index % 5] : headerInk; c.fillText(glyph, 0, 0); c.restore();
        x += advance;
      });
    }), 1.0, 0.19, 0, H - 0.13, (random() - 0.5) * 0.04);
    pin(-0.48, H - 0.06); pin(0.48, H - 0.06);

    // Six picks: a case on a wire hook and its card.
    const names = [...NAMES].sort(() => random() - 0.5);
    const kept = Math.round((1 - a.cases) * 6);
    const order = [0, 1, 2, 3, 4, 5].sort(() => random() - 0.5);
    const cases: { m: THREE.Matrix4; color: THREE.Color }[] = [];
    const survivor = Math.floor(random() * 6);
    for (let i = 0; i < 6; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const x = (col - 1) * 0.39, y = H - 0.42 - row * 0.46;
      P(s.rod([x - 0.05, y - 0.095, 0.007], [x - 0.05, y - 0.105, 0.05], 0.004, hook));
      P(s.rod([x + 0.05, y - 0.095, 0.007], [x + 0.05, y - 0.105, 0.05], 0.004, hook));
      P(s.rod([x - 0.05, y - 0.105, 0.05], [x - 0.05, y - 0.085, 0.052], 0.004, hook));
      P(s.rod([x + 0.05, y - 0.105, 0.05], [x + 0.05, y - 0.085, 0.052], 0.004, hook));
      if (order.indexOf(i) < kept) {
        const m = new THREE.Matrix4().makeTranslation(x, y, 0.03).multiply(new THREE.Matrix4().makeRotationX(-0.1)).multiply(new THREE.Matrix4().makeRotationZ((random() - 0.5) * 0.08)).multiply(new THREE.Matrix4().makeScale(0.112, 0.19, 0.028));
        cases.push({ m, color: new THREE.Color(BRIGHTS[Math.floor(random() * BRIGHTS.length)]).lerp(new THREE.Color('#8f8a80'), (1 - mood.cheer) * 0.25) });
      }
      const cy = y - 0.185, cw = 0.25, ch = 0.15;
      if (a.tone === 'takendown' && i !== survivor) { if (random() < 0.75) ghost(cw * 0.9, ch * 0.9, x, cy); else pin(x, cy + 0.05); continue; }
      const tone = a.tone === 'takendown' ? 'earnest' : a.tone;
      const name = names[i % names.length];
      const texture = paint(240, 144, (c) => {
        if (tone === 'earnest') {
          c.fillStyle = '#fbfaf2'; c.fillRect(0, 0, 240, 144);
          c.strokeStyle = '#b9d2ea'; c.lineWidth = 2; for (let line = 52; line < 144; line += 20) { c.beginPath(); c.moveTo(0, line); c.lineTo(240, line); c.stroke(); }
          c.strokeStyle = '#e8a0a0'; c.beginPath(); c.moveTo(0, 36); c.lineTo(240, 36); c.stroke();
          c.fillStyle = '#1b2a6b'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = `bold 26px ${HAND}`; c.fillText(`${name}'S PICK`, 10, 20, 150);
          c.fillStyle = '#e8a91c'; const stars = 3 + Math.floor(random() * 3); for (let n = 0; n < stars; n++) star(c, 172 + n * 15, 19, 8);
          c.strokeStyle = '#1b2a6b'; c.lineWidth = 3; for (let line = 0; line < 4; line++) scribble(c, 12, 60 + line * 20, 130 + random() * 85, random);
        } else if (tone === 'jokey') {
          c.fillStyle = ['#fff36b', '#ff9ec7', '#9df0a0', '#9fd8ff', '#ffc27a'][Math.floor(random() * 5)]; c.fillRect(0, 0, 240, 144);
          c.fillStyle = '#c3221c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold 34px ${HAND}`;
          c.save(); c.translate(120, 36); c.rotate((random() - 0.5) * 0.15); c.fillText(['SO BAD ITS GOOD', 'TRUST ME!!', 'LOL', '10/10 !!!', 'WOW. JUST WOW'][Math.floor(random() * 5)], 0, 0, 220); c.restore();
          c.strokeStyle = '#16171a'; c.lineWidth = 4; scribble(c, 14, 74, 140, random); scribble(c, 14, 96, 110, random);
          c.beginPath(); c.arc(196, 96, 26, 0, 7); c.stroke(); c.beginPath(); c.arc(196, 98, 15, 0.2, Math.PI - 0.2); c.stroke();
          c.fillStyle = '#16171a'; c.beginPath(); c.arc(187, 88, 3.5, 0, 7); c.arc(205, 88, 3.5, 0, 7); c.fill();
          c.font = `bold 22px ${HAND}`; c.textAlign = 'left'; c.fillText(`- ${name}`, 16, 124);
        } else {
          c.fillStyle = '#f1eee4'; c.fillRect(0, 0, 240, 144);
          c.fillStyle = '#16171a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold 34px ${HAND}`;
          c.fillText(['LAST PICK', 'GOODBYE', 'MISS U ALL', 'THE END', 'ONE MORE'][Math.floor(random() * 5)], 100, 30, 180);
          c.strokeStyle = '#16171a'; c.lineWidth = 4; scribble(c, 14, 66, 150, random); scribble(c, 14, 88, 120, random);
          c.font = `bold 22px ${HAND}`; c.textAlign = 'left'; c.fillText(`${name} x`, 14, 122);
          c.fillStyle = '#b3202c'; heart(c, 198, 96, 26, true);
          for (let blot = 0; blot < 3; blot++) { c.fillStyle = 'rgba(90,140,200,0.3)'; c.beginPath(); c.arc(random() * 240, random() * 144, 8 + random() * 12, 0, 7); c.fill(); }
        }
        if (mood.wear > 0.4) { c.fillStyle = `rgba(150,120,70,${(mood.wear - 0.4) * 0.5})`; c.fillRect(0, 0, 240, 144); }
      });
      const hanging = a.tone === 'takendown';
      const turn = hanging ? (random() < 0.5 ? -1 : 1) * (0.7 + random() * 0.4) : tone === 'jokey' ? (random() - 0.5) * 0.5 : tone === 'heartbroken' ? (random() - 0.5) * 0.2 : (random() - 0.5) * 0.06;
      const sheet = flat(texture, cw, ch, x, hanging ? cy - 0.05 : cy, turn, 0.011 + i * 0.0006);
      sheet.rotation.x = hanging ? 0.08 : 0;
      pin(x + (hanging ? Math.sign(turn) * 0.06 : 0), cy + (hanging ? 0.04 : ch / 2 - 0.016));
    }
    if (cases.length) {
      const coverMap = paint(128, 224, (c) => {
        c.fillStyle = '#fff'; c.fillRect(0, 0, 128, 224);
        c.fillStyle = 'rgba(0,0,0,0.62)'; c.fillRect(0, 0, 128, 52); c.fillRect(0, 196, 128, 28);
        c.fillStyle = '#fff'; c.fillRect(14, 14, 100, 12); c.fillRect(30, 32, 68, 8);
        c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(64, 124, 46, 0, 7); c.fill();
        c.fillStyle = 'rgba(0,0,0,0.6)'; c.beginPath(); c.arc(64, 114, 18, 0, 7); c.fill(); c.fillRect(38, 134, 52, 40);
      });
      const side = new THREE.MeshStandardMaterial({ color: '#e9e6de', roughness: 0.6 });
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), [side, side, side, side, new THREE.MeshStandardMaterial({ map: coverMap, roughness: 0.45 }), side], cases.length);
      cases.forEach((item, i) => { mesh.setMatrixAt(i, item.m); mesh.setColorAt(i, item.color); });
      mesh.castShadow = mesh.receiveShadow = true;
      P(mesh);
    }

    // Staff photo, bottom corner.
    const photoX = (random() < 0.5 ? -1 : 1) * 0.44, photoY = 0.14;
    if (a.photo === 'removed') ghost(0.17, 0.15, photoX, photoY);
    else if (a.photo !== 'none') {
      flat(paint(160, 150, (c) => {
        c.fillStyle = '#fbfaf5'; c.fillRect(0, 0, 160, 150);
        const sky = c.createLinearGradient(0, 10, 0, 112); sky.addColorStop(0, '#f1d9a6'); sky.addColorStop(1, '#c98f5a');
        c.fillStyle = sky; c.fillRect(10, 10, 140, 104);
        c.fillStyle = '#7a4b2a'; c.fillRect(10, 86, 140, 28);
        const people = a.photo === 'group' ? [[38, 62, 15], [78, 54, 17], [118, 64, 15], [58, 70, 12], [100, 72, 12]] : [[80, 56, 26]];
        people.forEach(([x, y, r], index) => {
          c.fillStyle = BRIGHTS[(index * 3 + 2) % BRIGHTS.length]; c.fillRect(x - r * 1.3, y + r * 0.8, r * 2.6, 60);
          c.fillStyle = ['#e8b890', '#b9794f', '#f0c8a0', '#8a5a3a', '#e0a878'][index % 5]; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
          c.fillStyle = ['#2a1e16', '#6b3a1f', '#d8b25a', '#1b1b1e', '#8a8a8a'][index % 5]; c.beginPath(); c.arc(x, y - r * 0.3, r, Math.PI, 0); c.fill();
          c.strokeStyle = '#3a2218'; c.lineWidth = 2; c.beginPath(); c.arc(x, y + r * 0.15, r * 0.5, 0.2, Math.PI - 0.2); c.stroke();
        });
        c.fillStyle = '#fbfaf5'; c.fillRect(0, 114, 160, 36);
        c.fillStyle = '#1b2a6b'; c.font = `bold 17px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(a.photo === 'group' ? 'THE GANG  1998' : 'THE BOSS', 80, 132, 150);
        c.fillStyle = `rgba(214,190,130,${0.1 + mood.wear * 0.4})`; c.fillRect(0, 0, 160, 150);
      }), 0.19, 0.178, photoX, photoY + 0.01, (random() - 0.5) * 0.25, 0.013);
      pin(photoX, photoY + 0.085);
    }

    if (a.farewell !== 'none') {
      const big = a.farewell === 'signed';
      const texture = paint(320, 240, (c) => {
        c.fillStyle = a.farewell === 'final' ? '#f9f02a' : big ? '#fbf7ea' : '#fffdf2'; c.fillRect(0, 0, 320, 240);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const write = (text: string, y: number, size: number, colour: string) => { c.fillStyle = colour; c.font = `bold ${size}px ${HAND}`; c.save(); c.translate(160, y); c.rotate((random() - 0.5) * 0.06); c.fillText(text, 0, 0, 296); c.restore(); };
        if (a.farewell === 'thanks') { write('THANK YOU', 52, 56, '#c3221c'); write('FOR 20 YEARS', 116, 46, '#1b2a6b'); write('- all of us', 180, 34, '#1b2a6b'); c.fillStyle = '#c3221c'; heart(c, 270, 190, 20, false); }
        else if (a.farewell === 'rewind') { write('BE KIND,', 50, 54, '#1b2a6b'); write('REWIND.', 110, 60, '#1b2a6b'); write('GOODBYE', 184, 50, '#c3221c'); }
        else if (a.farewell === 'final') { write('LAST DAY', 50, 58, '#16171a'); write('SATURDAY', 112, 54, '#c3221c'); write('ALL PICKS $2', 184, 44, '#16171a'); }
        else {
          write('WE WILL MISS YOU', 34, 34, '#c3221c');
          const pens = ['#1b2a6b', '#16171a', '#c3221c', '#2f7d4f', '#7a35c2'];
          for (let n = 0; n < 22; n++) {
            c.strokeStyle = pens[n % pens.length]; c.lineWidth = 2.5;
            c.save(); c.translate(20 + random() * 220, 70 + random() * 150); c.rotate((random() - 0.5) * 0.7); scribble(c, 0, 0, 40 + random() * 50, random); c.restore();
          }
          c.fillStyle = '#c3221c'; heart(c, 280, 200, 16, false);
        }
      });
      const noteW = big ? 0.42 : 0.33;
      flat(texture, noteW, noteW * 0.75, 0.02 - photoX * 0.25, big ? 0.2 : 0.16, (random() - 0.5) * 0.14, 0.016);
      pin(0.02 - photoX * 0.25, (big ? 0.2 : 0.16) + noteW * 0.33);
    }
    const pinMesh = s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.3 }), pins);
    P(pinMesh);

    const bulbs: THREE.InstancedMesh[] = [];
    if (a.lights) {
      const sets: { at: [number, number, number]; size: number; color: string }[][] = [[], []];
      const hues = mood.warmth > 0.6 ? ['#ffd27a', '#ffb347', '#ffe9b0'] : ['#ff5a5a', '#ffd84a', '#5ad0ff', '#7aff8a', '#ff8ae0'];
      const path: [number, number][] = [];
      for (let i = 0; i <= 10; i++) path.push([-W / 2 - 0.02, i / 10 * H]);
      for (let i = 1; i <= 12; i++) path.push([-W / 2 + i / 12 * W, H + 0.03 - Math.sin(i / 12 * Math.PI * 3) * 0.035]);
      for (let i = 9; i >= 2; i--) path.push([W / 2 + 0.02, i / 10 * H]);
      path.forEach(([x, y], index) => sets[index % 2].push({ at: [x + (random() - 0.5) * 0.02, y, 0.026], size: 0.014, color: hues[Math.floor(random() * hues.length)] }));
      P(s.tube(path.map(([x, y]) => [x, y, 0.022] as const), 0.003, s.material('#1f3d2b')));
      for (const set of sets) { const mesh = s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), set); P(mesh); bulbs.push(mesh); }
    }

    // Stand.
    panel.position.y = lift;
    if (a.stand === 'feet') {
      for (const x of [-1, 1]) {
        s.box([0.05, lift + H + 0.03, 0.04], [x * (W / 2 + 0.05), (lift + H + 0.03) / 2, -0.01], timber);
        s.box([0.07, 0.04, 0.56], [x * (W / 2 + 0.05), 0.02, 0], timber);
      }
      s.box([W + 0.1, 0.04, 0.03], [0, lift - 0.12, -0.01], timber);
    } else if (a.stand === 'easel') {
      const leanBack = 0.2;
      panel.rotation.x = -leanBack;
      const topY = lift + H * Math.cos(leanBack), topZ = -H * Math.sin(leanBack);
      for (const x of [-1, 1]) s.rod([x * 0.6, 0, -0.03], [x * 0.28, topY + 0.12, topZ - 0.045], 0.022, timber);
      s.rod([0, 0, topZ - 0.75], [0, topY + 0.08, topZ - 0.05], 0.022, timber);
      s.box([W + 0.12, 0.035, 0.09], [0, lift - 0.035, 0.035], timber);
      s.rod([-0.4, 0.5, -0.02], [0, 0.5, topZ - 0.42], 0.006, s.material('#2a2c2e'));
      s.rod([0.4, 0.5, -0.02], [0, 0.5, topZ - 0.42], 0.006, s.material('#2a2c2e'));
    } else {
      for (const x of [-1, 1]) {
        s.rod([x * (W / 2 + 0.045), 0.08, 0], [x * (W / 2 + 0.045), lift + H + 0.06, 0], 0.016, steel);
        s.rod([x * (W / 2 + 0.045), 0.08, -0.3], [x * (W / 2 + 0.045), 0.08, 0.3], 0.016, steel);
        for (const z of [-0.28, 0.28]) s.cylinder(0.035, 0.035, 0.024, [x * (W / 2 + 0.045), 0.035, z], s.material('#2a2c2e'), 12).rotation.z = Math.PI / 2;
      }
      s.rod([-W / 2 - 0.045, lift + H + 0.06, 0], [W / 2 + 0.045, lift + H + 0.06, 0], 0.016, steel);
      s.rod([-W / 2 - 0.045, 0.2, 0], [W / 2 + 0.045, 0.2, 0], 0.012, steel);
    }
    // What has dropped off it.
    const dropped = Math.round(mood.wear * 3 + (a.tone === 'takendown' ? 2 : 0));
    for (let i = 0; i < dropped; i++) {
      const sheet = s.box([0.2, 0.002, 0.13], [(random() - 0.5) * 1.1, 0.002 + i * 0.001, 0.2 + random() * 0.35], s.material(i % 2 ? '#fbfaf2' : '#fff36b'));
      sheet.rotation.y = random() * 3;
    }
    const speed = mix(0.6, 4, mood.energy);
    return s.finish({
      footprint: 0.72,
      update: bulbs.length ? (_dt, time) => {
        bulbs.forEach((mesh, index) => { (mesh.material as THREE.MeshBasicMaterial).color.setScalar(0.72 + 0.28 * Math.sin(time * speed + index * Math.PI)); });
      } : undefined,
    });
  },
});
