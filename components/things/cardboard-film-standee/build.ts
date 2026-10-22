import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
interface Part { path(c: Ctx): void; fill: string; detail?: boolean }
type Pt = readonly [number, number];

const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0) => (c: Ctx) => { c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); };
const poly = (points: readonly Pt[]) => (c: Ctx) => { c.beginPath(); points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
const flip = (points: readonly Pt[]): Pt[] => points.map(([x, y]) => [512 - x, y] as const);
const burst = (cx: number, cy: number, outer: number, inner: number, spikes: number) => {
  const points: Pt[] = [];
  for (let i = 0; i < spikes * 2; i++) { const t = i / (spikes * 2) * Math.PI * 2, r = i % 2 ? inner : outer; points.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r * 1.25]); }
  return poly(points);
};

const BACKDROPS = { fire: '#f07a22', midnight: '#2b47a0', pink: '#ee4f9b', toxic: '#8fd13a', gold: '#f0c23a', crimson: '#b3202c' } as const;
const SKIN = '#dba577';

interface Figure { parts: Part[]; head: readonly [number, number, number]; titles: readonly (readonly [string, string])[]; tag: string }

function figure(genre: string, bg: string): Figure {
  const p: Part[] = [];
  const add = (path: (c: Ctx) => void, fill: string, detail = false) => p.push({ path, fill, detail });
  if (genre === 'action') {
    add(burst(256, 400, 236, 176, 13), bg);
    add(burst(256, 400, 150, 105, 11), '#ffe27a', true);
    add(poly([[306, 190], [362, 208], [356, 232], [306, 204]]), '#c8242b');
    for (const side of [0, 1]) {
      const leg: Pt[] = [[212, 540], [258, 565], [204, 892], [118, 892]];
      add(poly(side ? flip(leg) : leg), '#2d3440');
      const boot: Pt[] = [[106, 850], [210, 850], [206, 896], [98, 896]];
      add(poly(side ? flip(boot) : boot), '#17191c');
    }
    add(ell(138, 405, 36, 112, 0.14), SKIN); add(ell(124, 518, 34, 34), SKIN);
    add(ell(378, 322, 34, 80, 1.05), SKIN); add(ell(432, 232, 31, 88, 0.05), SKIN); add(ell(434, 140, 38, 38), SKIN);
    add(poly([[165, 298], [347, 298], [312, 562], [200, 562]]), '#5d6b3a');
    add(poly([[222, 298], [290, 298], [256, 410]]), SKIN, true);
    add(poly([[200, 536], [312, 536], [312, 562], [200, 562]]), '#15161a', true);
    add(poly([[242, 534], [270, 534], [270, 564], [242, 564]]), '#e2bf45', true);
    add(poly([[176, 330], [236, 520], [222, 524], [164, 340]]), '#3b4526', true);
    add(poly([[204, 220], [206, 158], [306, 158], [308, 220]]), '#2a1e16');
    add(ell(256, 228, 50, 60), SKIN);
    add(poly([[206, 188], [306, 188], [306, 204], [206, 204]]), '#c8242b', true);
    add(poly([[212, 214], [300, 214], [296, 238], [262, 238], [256, 226], [250, 238], [216, 238]]), '#101114', true);
    add(ell(256, 268, 20, 5), '#7a4a35', true);
    return { parts: p, head: [256, 228, 50], titles: [['BLAST', 'RADIUS'], ['FIST OF', 'THUNDER'], ['ZERO', 'MERCY']], tag: 'HE IS THE LAW' };
  }
  if (genre === 'monster') {
    add(poly([[330, 760], [468, 700], [500, 590], [486, 720], [424, 826], [330, 866]]), '#35743a');
    for (const side of [0, 1]) {
      const claws: Pt[][] = [[[22, 292], [16, 228], [44, 276]], [[40, 282], [50, 218], [62, 280]], [[58, 286], [84, 236], [74, 298]]];
      for (const claw of claws) add(poly(side ? flip(claw) : claw), '#e3c877');
      const horn: Pt[] = [[160, 214], [124, 100], [210, 180]];
      add(poly(side ? flip(horn) : horn), '#e3c877');
    }
    add(ell(95, 380, 40, 112, -0.5), '#4f9a45'); add(ell(417, 380, 40, 112, 0.5), '#4f9a45');
    add(ell(256, 600, 168, 272), '#4f9a45');
    add(ell(256, 650, 108, 205), '#d2dd92', true);
    for (let i = 0; i < 7; i++) add(poly([[150, 500 + i * 52], [362, 500 + i * 52], [362, 506 + i * 52], [150, 506 + i * 52]]), '#a9b86a', true);
    add(ell(168, 856, 74, 46), '#35743a'); add(ell(344, 856, 74, 46), '#35743a');
    add(ell(256, 270, 128, 106), '#4f9a45');
    add(ell(206, 248, 28, 21, 0.25), '#ffe23d', true); add(ell(306, 248, 28, 21, -0.25), '#ffe23d', true);
    add(ell(206, 248, 6, 18), '#141414', true); add(ell(306, 248, 6, 18), '#141414', true);
    add(poly([[166, 300], [346, 300], [312, 356], [200, 356]]), '#6b1420', true);
    for (let i = 0; i < 8; i++) add(poly([[170 + i * 22, 300], [192 + i * 22, 300], [181 + i * 22, 326]]), '#f7f3e3', true);
    for (let i = 0; i < 5; i++) add(poly([[208 + i * 20, 356], [228 + i * 20, 356], [218 + i * 20, 336]]), '#f7f3e3', true);
    return { parts: p, head: [256, 262, 100], titles: [['CLAWS OF', 'THE DEEP'], ['IT ATE', 'OHIO'], ['GORGATHA', 'RISES']], tag: 'NOBODY IS SAFE' };
  }
  if (genre === 'romance') {
    add(ell(256, 300, 216, 216), bg);
    add(ell(256, 300, 170, 170), '#fff2d8', true);
    add(poly([[148, 560], [252, 560], [246, 892], [162, 892]]), '#1c2030');
    add(poly([[128, 330], [264, 330], [256, 582], [144, 582]]), '#262c40');
    add(poly([[186, 330], [234, 330], [210, 430]]), '#f4f1ea', true);
    add(poly([[204, 340], [216, 340], [222, 420], [210, 440], [198, 420]]), '#8f1d2c', true);
    add(ell(203, 230, 48, 38), '#3b2a1e'); add(ell(208, 262, 41, 48), SKIN);
    add(ell(332, 274, 52, 60), '#8a3a1f'); add(poly([[346, 258], [394, 300], [388, 430], [350, 404]]), '#8a3a1f');
    add(poly([[268, 520], [362, 520], [456, 892], [226, 892]]), '#c8243a');
    add(poly([[274, 362], [366, 362], [360, 534], [270, 534]]), '#c8243a');
    add(ell(320, 356, 52, 22), '#e8b890'); add(ell(314, 288, 37, 45), '#e8b890');
    add(ell(300, 432, 96, 30, 0.2), '#262c40'); add(ell(254, 424, 22, 70, 0.5), '#e8b890');
    add(poly([[300, 560], [330, 890], [318, 890]]), '#9c1a2c', true); add(poly([[380, 600], [420, 890], [408, 890]]), '#9c1a2c', true);
    add(ell(196, 262, 4, 6), '#2a1e16', true); add(ell(302, 288, 4, 6), '#2a1e16', true); add(ell(318, 306, 9, 4), '#b3202c', true);
    return { parts: p, head: [208, 258, 42], titles: [['ALWAYS,', 'MAYBE'], ['PARIS IN', 'APRIL'], ['THE LAST', 'DANCE']], tag: 'LOVE WAITS FOR NO ONE' };
  }
  if (genre === 'cartoon') {
    const fur = '#8ecbf0';
    add(ell(196, 132, 40, 116, -0.15), fur); add(ell(318, 124, 40, 116, 0.22), fur);
    add(ell(196, 138, 18, 84, -0.15), '#f7b6cf', true); add(ell(318, 130, 18, 84, 0.22), '#f7b6cf', true);
    add(ell(410, 470, 31, 96, 0.6), fur); add(ell(463, 386, 38, 38), '#ffffff');
    add(ell(118, 620, 31, 86, 0.5), fur); add(ell(80, 694, 34, 34), '#ffffff');
    add(ell(178, 862, 88, 38), '#f6c829'); add(ell(334, 862, 88, 38), '#f6c829');
    add(ell(256, 640, 128, 178), fur);
    add(poly([[120, 610], [392, 610], [392, 830], [120, 830]]), '#d8322e', true);
    add(poly([[200, 500], [312, 500], [312, 620], [200, 620]]), '#d8322e', true);
    add(ell(214, 520, 12, 12), '#f6c829', true); add(ell(298, 520, 12, 12), '#f6c829', true);
    add(ell(256, 330, 142, 122), fur);
    add(ell(256, 378, 78, 56), '#ffffff', true);
    add(ell(208, 298, 31, 44), '#ffffff', true); add(ell(304, 298, 31, 44), '#ffffff', true);
    add(ell(215, 308, 15, 23), '#141414', true); add(ell(297, 308, 15, 23), '#141414', true);
    add(ell(220, 298, 5, 7), '#ffffff', true); add(ell(302, 298, 5, 7), '#ffffff', true);
    add(ell(256, 350, 17, 12), '#ee4f9b', true);
    add(poly([[241, 392], [271, 392], [271, 424], [241, 424]]), '#fbfbf5', true);
    add(poly([[255, 392], [257, 392], [257, 424], [255, 424]]), '#9aa', true);
    return { parts: p, head: [256, 310, 110], titles: [['BARNABY', 'BUNNY'], ['HOP', 'TO IT!'], ['CARROT', 'CRAZY']], tag: 'FUN FOR ALL THE FAMILY' };
  }
  // The space ranger.
  add(ell(256, 330, 250, 50, -0.3), '#f3e2b0');
  add(ell(256, 330, 205, 205), bg);
  add(ell(190, 270, 60, 40, 0.4), 'rgba(255,255,255,0.18)', true); add(ell(320, 420, 90, 30, -0.3), 'rgba(0,0,0,0.15)', true);
  for (const side of [0, 1]) {
    const leg: Pt[] = [[204, 556], [258, 578], [236, 892], [146, 892]];
    add(poly(side ? flip(leg) : leg), '#eef0ee');
    const boot: Pt[] = [[136, 820], [240, 820], [238, 896], [130, 896]];
    add(poly(side ? flip(boot) : boot), '#f07a22');
  }
  add(ell(140, 440, 35, 116, 0.12), '#eef0ee'); add(ell(126, 556, 32, 32), '#f07a22');
  add(ell(382, 400, 35, 96, 0.7), '#eef0ee');
  add(poly([[420, 296], [504, 280], [504, 314], [458, 326], [452, 366], [426, 366]]), '#d3312b');
  add(ell(440, 330, 30, 30), '#f07a22');
  add(poly([[168, 328], [344, 328], [316, 582], [196, 582]]), '#eef0ee');
  add(poly([[218, 400], [294, 400], [294, 456], [218, 456]]), '#8d989c', true);
  for (let i = 0; i < 3; i++) add(ell(234 + i * 22, 428, 7, 7), ['#e8382f', '#f6c829', '#3cb563'][i], true);
  add(poly([[196, 548], [316, 548], [316, 574], [196, 574]]), '#f07a22', true);
  add(ell(256, 320, 72, 24), '#f07a22');
  add(ell(256, 236, 80, 80), '#cfe6f2');
  add(ell(256, 250, 42, 50), SKIN, true); add(ell(256, 214, 44, 24), '#5a3b22', true);
  add(ell(240, 248, 4, 6), '#1c1c1c', true); add(ell(272, 248, 4, 6), '#1c1c1c', true);
  add(ell(222, 196, 22, 9, -0.7), 'rgba(255,255,255,0.8)', true);
  return { parts: p, head: [256, 248, 46], titles: [['STAR', 'RANGERS'], ['ORBIT', 'ZERO'], ['MOON', 'PATROL']], tag: 'THE GALAXY NEEDS HIM' };
}

export default defineThing({
  questions: {
    genre: choice('What kind of film is the cutout promoting?', {
      action: 'An action hero in a vest and sunglasses, fist raised in front of an explosion.',
      monster: 'A roaring green horned monster with claws up, a creature feature.',
      romance: 'A couple in evening dress leaning together in front of a huge moon.',
      cartoon: 'A waving big-eared cartoon rabbit in red dungarees, for children.',
      space: 'A space ranger in a bubble helmet with a ray gun before a ringed planet.',
    }),
    backdrop: choice('What colour is the printed burst or planet behind the figure?', {
      fire: 'Explosion orange.', midnight: 'Midnight blue.', pink: 'Hot pink.', toxic: 'Toxic green.', gold: 'Gold.', crimson: 'Blood crimson.',
    }),
    sequel: noul('Is it for a sequel, with a big number after the title?'),
    mark: choice('Has someone marked it as spoken for?', {
      none: 'No, it is nobody’s.',
      sold: 'A white SOLD label with a first name scrawled in marker across its chest.',
      hold: 'A yellow sticky note: HOLD FOR, and a name.',
      price: 'A fluorescent star price sticker, a few dollars, still unsold.',
      staff: 'A strip of tape reading NOT FOR SALE: one of the staff is keeping it.',
    }),
    state: choice('How is it holding up?', {
      upright: 'Standing straight on its easel back.',
      bowed: 'Creased across the middle, the top third folding forward in a bow.',
      slumped: 'The strut has given up; it leans back and sideways against nothing.',
      flat: 'Lying flat on its back on the floor, staring up.',
    }),
    size: score('How big is it?', ['Child-height counter display', 'Life size', 'A towering lobby giant']),
    defaced: noul('Has somebody drawn a moustache, glasses and horns on the face?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.05, 2.35, a.size * a.size * 0.55 + a.size * 0.45), W = H / 2;
    const bg: string = BACKDROPS[a.backdrop];
    const fig = figure(a.genre, bg);
    const [t1, t2] = fig.titles[Math.floor(random() * fig.titles.length)];
    const plateColour = new THREE.Color(bg).multiplyScalar(0.45).getStyle();
    fig.parts.push({ path: poly([[38, 868], [474, 868], [474, 1012], [38, 1012]]), fill: plateColour });
    const names = ['DANNY', 'MR K', 'JEN', 'TONY', 'PRIYA', 'LOU', 'MARGE', 'DEV'];
    const name = names[Math.floor(random() * names.length)];
    const foldRow = 256 - Math.round(mix(150, 185, random()));

    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 1024;
    const c = canvas.getContext('2d')!;
    // The die-cut outline: every silhouette part, fattened in bare card white.
    c.fillStyle = c.strokeStyle = '#e9e2cf'; c.lineWidth = 20; c.lineJoin = 'round';
    for (const part of fig.parts) if (!part.detail) { part.path(c); c.fill(); c.stroke(); }
    const mask = c.getImageData(0, 0, 512, 1024).data;
    // The print, with details clipped to the figure.
    const layer = document.createElement('canvas');
    layer.width = 512; layer.height = 1024;
    const l = layer.getContext('2d')!;
    for (const part of fig.parts) if (!part.detail) { part.path(l); l.fillStyle = part.fill; l.fill(); }
    l.globalCompositeOperation = 'source-atop';
    for (const part of fig.parts) { part.path(l); l.fillStyle = part.fill; l.fill(); }
    l.textAlign = 'center'; l.textBaseline = 'middle'; l.lineJoin = 'round';
    const family = 'Impact, "Arial Black", "DejaVu Sans Condensed", sans-serif';
    const second = a.sequel ? `${t2} ${random() < 0.5 ? '2' : 'II'}` : t2;
    [t1, second].forEach((line, index) => {
      l.font = `bold 58px ${family}`;
      l.lineWidth = 8; l.strokeStyle = '#111';
      l.strokeText(line, 256, 905 + index * 54, 410);
      l.fillStyle = index ? '#ffe04a' : '#ffffff';
      l.fillText(line, 256, 905 + index * 54, 410);
    });
    l.font = `bold 20px ${family}`; l.fillStyle = '#fff';
    l.fillText(fig.tag, 256, 994, 400);
    if (a.defaced) {
      const [hx, hy, hr] = fig.head;
      l.strokeStyle = '#141414'; l.lineWidth = Math.max(5, hr * 0.12); l.lineCap = 'round';
      l.beginPath(); l.arc(hx - hr * 0.42, hy - hr * 0.1, hr * 0.32, 0, 7); l.stroke();
      l.beginPath(); l.arc(hx + hr * 0.42, hy - hr * 0.1, hr * 0.32, 0, 7); l.stroke();
      l.beginPath(); l.moveTo(hx - hr * 0.1, hy - hr * 0.1); l.lineTo(hx + hr * 0.1, hy - hr * 0.1); l.stroke();
      l.beginPath(); l.moveTo(hx - hr * 0.75, hy + hr * 0.42); l.quadraticCurveTo(hx - hr * 0.3, hy + hr * 0.2, hx, hy + hr * 0.45); l.quadraticCurveTo(hx + hr * 0.3, hy + hr * 0.2, hx + hr * 0.75, hy + hr * 0.42); l.stroke();
      l.beginPath(); l.moveTo(hx - hr * 0.5, hy - hr * 0.85); l.lineTo(hx - hr * 0.75, hy - hr * 1.3); l.lineTo(hx - hr * 0.2, hy - hr * 0.95); l.stroke();
      l.beginPath(); l.moveTo(hx + hr * 0.5, hy - hr * 0.85); l.lineTo(hx + hr * 0.75, hy - hr * 1.3); l.lineTo(hx + hr * 0.2, hy - hr * 0.95); l.stroke();
    }
    // Years in a sunny window: the print bleaches towards blue, more on one side.
    const fade = l.createLinearGradient(0, 0, 512, 300);
    const strong = 0.12 + mood.wear * 0.36, weak = 0.03 + mood.wear * 0.16, sunLeft = random() < 0.5;
    fade.addColorStop(0, `rgba(196,216,232,${sunLeft ? strong : weak})`); fade.addColorStop(1, `rgba(196,216,232,${sunLeft ? weak : strong})`);
    l.fillStyle = fade; l.fillRect(0, 0, 512, 1024);
    const creases = 1 + Math.round(mood.wear * 4);
    for (let i = 0; i < creases; i++) {
      const y = i === 0 ? foldRow * 4 : 120 + random() * 760, tilt = i === 0 ? 0 : (random() - 0.5) * 240;
      l.strokeStyle = 'rgba(255,255,255,0.55)'; l.lineWidth = 3; l.beginPath(); l.moveTo(0, y); l.lineTo(512, y + tilt); l.stroke();
      l.strokeStyle = 'rgba(40,30,20,0.3)'; l.lineWidth = 2; l.beginPath(); l.moveTo(0, y + 3); l.lineTo(512, y + tilt + 3); l.stroke();
    }
    if (a.mark === 'sold') {
      l.save(); l.translate(256, 478); l.rotate(-0.12 + random() * 0.24);
      l.fillStyle = '#fbfbf6'; l.fillRect(-120, -62, 240, 124); l.strokeStyle = '#c3221c'; l.lineWidth = 6; l.strokeRect(-112, -54, 224, 108);
      l.fillStyle = '#c3221c'; l.font = `bold 62px ${family}`; l.fillText('SOLD', 0, -18, 200);
      l.fillStyle = '#16233f'; l.font = 'bold 36px "Comic Sans MS", "DejaVu Sans", sans-serif'; l.fillText(name, 0, 32, 200);
      l.restore();
    } else if (a.mark === 'hold') {
      l.save(); l.translate(300, 500); l.rotate(0.1 + random() * 0.2);
      l.fillStyle = '#fff36b'; l.fillRect(-80, -80, 160, 160);
      l.fillStyle = '#16233f'; l.font = 'bold 34px "Comic Sans MS", "DejaVu Sans", sans-serif';
      l.fillText('HOLD', 0, -40, 140); l.fillText('FOR', 0, -2, 140); l.fillText(name, 0, 40, 140);
      l.restore();
    } else if (a.mark === 'price') {
      l.save(); l.translate(262, 520); l.rotate(random() * 0.6 - 0.3);
      l.fillStyle = '#ff5fb0'; l.beginPath();
      for (let i = 0; i < 24; i++) { const r = i % 2 ? 66 : 92, t = i / 24 * Math.PI * 2; l.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
      l.fill(); l.fillStyle = '#111'; l.font = `bold 64px ${family}`; l.fillText(['$5', '$10', '$3', '$20'][Math.floor(random() * 4)], 0, 4, 120);
      l.restore();
    } else if (a.mark === 'staff') {
      l.save(); l.translate(256, 520); l.rotate(-0.3);
      l.fillStyle = '#e8dfc2'; l.fillRect(-300, -30, 600, 60);
      l.fillStyle = '#b3202c'; l.font = `bold 40px ${family}`; l.fillText('NOT FOR SALE  -  STAFF', 0, 2, 420);
      l.restore();
    }
    c.drawImage(layer, 0, 0);
    // Scuffed card edge near the floor.
    c.globalCompositeOperation = 'source-atop';
    const scuff = c.createLinearGradient(0, 900, 0, 1024);
    scuff.addColorStop(0, 'rgba(120,100,70,0)'); scuff.addColorStop(1, `rgba(120,100,70,${mood.wear * 0.5})`);
    c.fillStyle = scuff; c.fillRect(0, 0, 512, 1024);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;

    // Cut the card along the painted outline, a thin strip at a time, so it can fold.
    const bow = a.state === 'bowed' ? mix(0.45, 0.9, random()) : mood.wear * 0.12;
    const positions: number[] = [], uvs: number[] = [];
    const bend = (py: number): [number, number] => {
      const y = (1 - py / 1024) * H, foldY = (1 - foldRow * 4 / 1024) * H;
      if (y <= foldY) return [y, 0];
      return [foldY + (y - foldY) * Math.cos(bow), (y - foldY) * Math.sin(bow)];
    };
    for (let row = 0; row < 256; row++) {
      const py = row * 4 + 2;
      let start = -1;
      for (let px = 0; px <= 512; px++) {
        const solid = px < 512 && mask[(py * 512 + px) * 4 + 3] > 110;
        if (solid && start < 0) start = px;
        else if (!solid && start >= 0) {
          const x0 = (start / 512 - 0.5) * W, x1 = (px / 512 - 0.5) * W, u0 = start / 512, u1 = px / 512;
          const [yt, zt] = bend(row * 4), [yb, zb] = bend(row * 4 + 4), vt = 1 - row * 4 / 1024, vb = 1 - (row * 4 + 4) / 1024;
          positions.push(x0, yb, zb, x1, yb, zb, x1, yt, zt, x0, yb, zb, x1, yt, zt, x0, yt, zt);
          uvs.push(u0, vb, u1, vb, u1, vt, u0, vb, u1, vt, u0, vt);
          start = -1;
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    const rig = new THREE.Group();
    s.root.add(rig);
    const card = s.material('#b08a58', { roughness: 0.95, side: THREE.BackSide });
    const front = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.82 }));
    const back = new THREE.Mesh(geometry, card);
    front.castShadow = back.castShadow = front.receiveShadow = true;
    rig.add(front, back);

    const brown = s.material('#b08a58', { roughness: 0.95 });
    const strut = (fromY: number, reach: number, x: number) => {
      const from = new THREE.Vector3(x, fromY, -0.004), to = new THREE.Vector3(x, 0.01, -reach);
      const direction = to.clone().sub(from);
      const mesh = s.box([W * 0.26, direction.length(), 0.008], from.clone().add(to).multiplyScalar(0.5).toArray() as [number, number, number], brown);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      rig.add(mesh);
      const tab = s.box([W * 0.26, 0.008, reach * 0.6], [x, H * 0.2, -reach * 0.3], brown);
      rig.add(tab);
    };
    let lean = 0.1 + random() * 0.05;
    if (a.state === 'flat') {
      rig.rotation.x = -Math.PI / 2 + 0.02;
      rig.rotation.z = (random() - 0.5) * 0.6;
      const loose = s.box([W * 0.26, 0.008, H * 0.5], [W * 0.75, 0.006, -H * 0.4], brown);
      loose.rotation.y = random() * 2;
    } else if (a.state === 'slumped') {
      lean = 0.42 + random() * 0.12;
      strut(H * 0.5, H * 0.1, W * 0.12);
      rig.rotation.order = 'ZXY';
      rig.rotation.x = -lean;
      rig.rotation.z = (random() < 0.5 ? -1 : 1) * (0.16 + random() * 0.12);
    } else {
      strut(H * 0.62, H * 0.3, 0);
      rig.rotation.x = -lean;
    }
    // Repair tape where the fold keeps reopening.
    if (mood.wear > 0.55 && a.state !== 'flat') {
      const foldY = (1 - foldRow * 4 / 1024) * H;
      const tape = s.box([W * 0.3, 0.05, 0.004], [W * 0.05, foldY, -0.006], s.material('#d9c79a', { roughness: 0.4 }));
      tape.rotation.z = 0.3; rig.add(tape);
    }
    const rock = a.state === 'upright' || a.state === 'bowed' ? mix(0, 0.025, mood.energy) : 0;
    const base = rig.rotation.x;
    return s.finish({
      footprint: a.state === 'flat' ? H * 0.5 : Math.max(W * 0.5, H * 0.2),
      update: rock ? (_dt, time) => { rig.rotation.x = base + Math.sin(time * 1.7) * rock; } : undefined,
    });
  },
});
