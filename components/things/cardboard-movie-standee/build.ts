import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
type Key = readonly [y: number, half: number];
const U = 0.95; // one canvas unit in metres: the sheet is 1 unit wide and up to 2 tall

const PROFILES: Record<string, readonly Key[]> = {
  hero: [[0, 0.46], [0.36, 0.46], [0.4, 0.33], [0.9, 0.31], [1.12, 0.36], [1.32, 0.43], [1.5, 0.4], [1.58, 0.21], [1.7, 0.17], [1.82, 0.15], [1.88, 0.09]],
  monster: [[0, 0.46], [0.36, 0.46], [0.4, 0.4], [1.0, 0.43], [1.4, 0.47], [1.68, 0.46], [1.78, 0.36], [1.87, 0.24]],
  couple: [[0, 0.46], [0.36, 0.46], [0.4, 0.4], [1.0, 0.36], [1.4, 0.36], [1.6, 0.31], [1.76, 0.24], [1.84, 0.13]],
  animal: [[0, 0.46], [0.36, 0.46], [0.4, 0.33], [0.9, 0.31], [1.06, 0.37], [1.3, 0.44], [1.52, 0.42], [1.66, 0.33], [1.74, 0.18]],
};
const TITLES = {
  explosive: ['FIST OF TUESDAY', 'DETONATOR DAN', 'COLD COP HOT LEAD', 'MAXIMUM PAYDAY'],
  spooky: ['IT CRAWLS AT NOON', 'MOSSMOUTH', 'THE GLOAMING THING', 'NIGHT OF THE GLORP'],
  swoony: ['ALWAYS, SEPTEMBER', 'A LETTER TO CALLOWAY', 'TWO HEARTS ONE FERRY', 'THE LAST SLOW DANCE'],
  goofy: ['BARKLEY SAVES SUMMER', 'PIZZA DOG', 'AGENT WHISKERS', 'TOTALLY TUBULAR TED'],
} as const;
const STRAPS = { coming: 'COMING SOON', now: 'NOW ON VIDEO', rent: 'RENT IT TONIGHT', hit: "THE #1 MOVIE IN AMERICA*", own: 'OWN IT TODAY $19.95' } as const;

function halfAt(keys: readonly Key[], y: number) {
  for (let i = 1; i < keys.length; i++) {
    if (y <= keys[i][0]) {
      const t = (y - keys[i - 1][0]) / Math.max(keys[i][0] - keys[i - 1][0], 1e-5);
      return mix(keys[i - 1][1], keys[i][1], t * t * (3 - 2 * t));
    }
  }
  return keys[keys.length - 1][1];
}

const ell = (c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, turn = 0) => { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2); c.fill(); };
const poly = (c: Ctx, points: readonly (readonly [number, number])[], fill: string) => { c.fillStyle = fill; c.beginPath(); points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); };
const rays = (c: Ctx, x: number, y: number, r: number, n: number, fill: string) => { c.fillStyle = fill; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2, w = Math.PI / n * 0.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(t - w) * r, y + Math.sin(t - w) * r); c.lineTo(x + Math.cos(t + w) * r, y + Math.sin(t + w) * r); c.fill(); } };

const FIGURES: Record<string, { face: readonly [number, number]; draw(c: Ctx): void }> = {
  hero: {
    face: [0.5, 1.63],
    draw(c) {
      const g = c.createRadialGradient(0.5, 1.2, 0.05, 0.5, 1.2, 0.95);
      g.addColorStop(0, '#fff3a0'); g.addColorStop(0.35, '#ff9a1a'); g.addColorStop(0.75, '#c8281a'); g.addColorStop(1, '#3a0d0d');
      c.fillStyle = g; c.fillRect(0, 0, 1, 2);
      rays(c, 0.5, 1.2, 1.2, 14, 'rgba(255,240,150,0.35)');
      const skin = '#d99a6c', shade = '#b0714a';
      poly(c, [[0.35, 0.3], [0.485, 0.3], [0.5, 0.98], [0.515, 0.3], [0.65, 0.3], [0.66, 1.04], [0.34, 1.04]], '#27477c');
      poly(c, [[0.34, 1.0], [0.66, 1.0], [0.66, 1.05], [0.34, 1.05]], '#1a1410');
      poly(c, [[0.47, 1.0], [0.53, 1.0], [0.53, 1.05], [0.47, 1.05]], '#d9b23a');
      poly(c, [[0.35, 1.04], [0.65, 1.04], [0.73, 1.47], [0.27, 1.47]], '#ece7d8');
      ell(c, 0.5, 1.47, 0.25, 0.085, skin);
      ell(c, 0.24, 1.32, 0.075, 0.2, skin, 0.12); ell(c, 0.76, 1.32, 0.075, 0.2, skin, -0.12);
      ell(c, 0.5, 1.24, 0.24, 0.07, shade); ell(c, 0.5, 1.26, 0.22, 0.06, skin);
      ell(c, 0.3, 1.25, 0.06, 0.06, skin); ell(c, 0.7, 1.25, 0.06, 0.06, skin);
      poly(c, [[0.45, 1.5], [0.55, 1.5], [0.55, 1.6], [0.45, 1.6]], shade);
      ell(c, 0.5, 1.66, 0.09, 0.11, skin);
      poly(c, [[0.405, 1.72], [0.595, 1.72], [0.6, 1.8], [0.4, 1.8]], '#2a1a10');
      poly(c, [[0.405, 1.705], [0.595, 1.705], [0.595, 1.735], [0.405, 1.735]], '#d81e1e');
      poly(c, [[0.42, 1.655], [0.58, 1.655], [0.57, 1.7], [0.43, 1.7]], '#0c0c10');
      poly(c, [[0.46, 1.585], [0.54, 1.585], [0.54, 1.595], [0.46, 1.595]], '#6a3a28');
    },
  },
  monster: {
    face: [0.5, 1.47],
    draw(c) {
      const g = c.createLinearGradient(0, 0, 0, 2);
      g.addColorStop(0, '#3a1a5a'); g.addColorStop(1, '#0e0a22');
      c.fillStyle = g; c.fillRect(0, 0, 1, 2);
      ell(c, 0.72, 1.62, 0.2, 0.2, '#f6e58a');
      const hide = '#4f9a3a', dark = '#2c5f22', belly = '#b9d86a';
      poly(c, [[0.3, 1.3], [0.12, 1.5], [0.1, 1.74], [0.24, 1.6], [0.4, 1.4]], hide);
      poly(c, [[0.7, 1.3], [0.88, 1.5], [0.9, 1.74], [0.76, 1.6], [0.6, 1.4]], hide);
      for (const [x, d] of [[0.1, -1], [0.9, 1]] as const) for (let i = 0; i < 3; i++) poly(c, [[x + i * 0.045 * -d, 1.7], [x + (i * 0.045 + 0.04) * -d, 1.7], [x + (i * 0.045 + 0.005) * -d + d * 0.02, 1.83]], '#f4f1e0');
      ell(c, 0.5, 0.9, 0.33, 0.6, hide);
      ell(c, 0.5, 0.8, 0.2, 0.42, belly);
      for (let i = 0; i < 6; i++) poly(c, [[0.34, 0.5 + i * 0.12], [0.66, 0.5 + i * 0.12], [0.66, 0.51 + i * 0.12], [0.34, 0.51 + i * 0.12]], 'rgba(60,90,20,0.35)');
      poly(c, [[0.34, 1.6], [0.3, 1.84], [0.44, 1.66]], '#e8e0c0'); poly(c, [[0.66, 1.6], [0.7, 1.84], [0.56, 1.66]], '#e8e0c0');
      ell(c, 0.5, 1.5, 0.23, 0.21, hide);
      ell(c, 0.36, 1.2, 0.05, 0.05, dark); ell(c, 0.66, 1.08, 0.04, 0.04, dark); ell(c, 0.3, 0.9, 0.04, 0.04, dark);
      ell(c, 0.41, 1.58, 0.06, 0.045, '#ffe23a', -0.3); ell(c, 0.59, 1.58, 0.06, 0.045, '#ffe23a', 0.3);
      ell(c, 0.41, 1.58, 0.012, 0.04, '#101010'); ell(c, 0.59, 1.58, 0.012, 0.04, '#101010');
      ell(c, 0.5, 1.42, 0.16, 0.085, '#3a0a14');
      for (let i = 0; i < 7; i++) { poly(c, [[0.36 + i * 0.04, 1.49], [0.4 + i * 0.04, 1.49], [0.38 + i * 0.04, 1.43]], '#f4f1e0'); poly(c, [[0.37 + i * 0.04, 1.35], [0.41 + i * 0.04, 1.35], [0.39 + i * 0.04, 1.4]], '#f4f1e0'); }
    },
  },
  couple: {
    face: [0.6, 1.5],
    draw(c) {
      const g = c.createLinearGradient(0, 0, 0, 2);
      g.addColorStop(0, '#f6c66a'); g.addColorStop(0.5, '#f08a8a'); g.addColorStop(1, '#8a4a9a');
      c.fillStyle = g; c.fillRect(0, 0, 1, 2);
      ell(c, 0.5, 1.2, 0.36, 0.36, '#fff0b8');
      const skinA = '#c98a62', skinB = '#f0c8a4';
      poly(c, [[0.56, 1.36], [0.72, 1.3], [0.9, 0.3], [0.44, 0.3], [0.5, 1.0]], '#c4161c');
      poly(c, [[0.6, 1.0], [0.84, 0.3], [0.7, 0.3]], '#96101a');
      poly(c, [[0.2, 0.3], [0.52, 0.3], [0.54, 1.0], [0.56, 1.44], [0.24, 1.46], [0.18, 1.1]], '#1c2030');
      poly(c, [[0.36, 1.46], [0.44, 1.46], [0.42, 1.1]], '#f4f1e8');
      poly(c, [[0.24, 1.3], [0.34, 1.34], [0.66, 1.08], [0.62, 1.0]], '#262b40');
      ell(c, 0.66, 1.05, 0.045, 0.04, skinA);
      ell(c, 0.64, 1.48, 0.13, 0.2, '#3a1c10', 0.2);
      poly(c, [[0.56, 1.3], [0.66, 1.3], [0.64, 1.42], [0.58, 1.42]], skinB);
      ell(c, 0.6, 1.52, 0.08, 0.1, skinB, -0.25);
      ell(c, 0.72, 1.3, 0.06, 0.1, skinB, 0.3);
      poly(c, [[0.36, 1.44], [0.44, 1.44], [0.44, 1.56], [0.36, 1.56]], skinA);
      ell(c, 0.42, 1.65, 0.085, 0.105, skinA, 0.2);
      ell(c, 0.4, 1.73, 0.095, 0.05, '#1a1210', 0.2);
      ell(c, 0.57, 1.47, 0.02, 0.008, '#b3202a'); ell(c, 0.57, 1.55, 0.016, 0.006, '#2a1a14'); ell(c, 0.46, 1.66, 0.016, 0.006, '#2a1a14');
    },
  },
  animal: {
    face: [0.5, 1.2],
    draw(c) {
      c.fillStyle = '#3ab0f0'; c.fillRect(0, 0, 1, 2);
      rays(c, 0.5, 1.1, 1.3, 12, '#ffe23a');
      const fur = '#e89a3a', deep = '#8a4a1c', cream = '#fbe9c4';
      ell(c, 0.36, 0.34, 0.11, 0.07, '#e02a2a'); ell(c, 0.64, 0.34, 0.11, 0.07, '#e02a2a');
      ell(c, 0.5, 0.72, 0.21, 0.36, fur);
      ell(c, 0.5, 0.68, 0.13, 0.25, cream);
      poly(c, [[0.66, 0.9], [0.84, 1.12], [0.9, 1.06], [0.74, 0.8]], fur);
      ell(c, 0.88, 1.12, 0.06, 0.06, cream); ell(c, 0.9, 1.2, 0.025, 0.05, cream);
      ell(c, 0.28, 0.76, 0.06, 0.17, fur, -0.3);
      ell(c, 0.21, 1.25, 0.09, 0.24, deep, 0.25); ell(c, 0.79, 1.25, 0.09, 0.24, deep, -0.25);
      ell(c, 0.5, 1.32, 0.27, 0.25, fur);
      ell(c, 0.5, 1.2, 0.17, 0.12, cream);
      ell(c, 0.4, 1.42, 0.075, 0.1, '#ffffff'); ell(c, 0.6, 1.42, 0.075, 0.1, '#ffffff');
      ell(c, 0.42, 1.4, 0.035, 0.05, '#101010'); ell(c, 0.58, 1.4, 0.035, 0.05, '#101010');
      ell(c, 0.43, 1.43, 0.012, 0.015, '#ffffff'); ell(c, 0.59, 1.43, 0.012, 0.015, '#ffffff');
      ell(c, 0.5, 1.28, 0.055, 0.04, '#101010');
      ell(c, 0.5, 1.13, 0.09, 0.045, '#5a1c1c'); ell(c, 0.5, 1.1, 0.05, 0.04, '#f07a9a');
      poly(c, [[0.26, 1.5], [0.74, 1.5], [0.7, 1.68], [0.5, 1.73], [0.3, 1.68]], '#d81e1e');
      poly(c, [[0.2, 1.5], [0.46, 1.5], [0.46, 1.54], [0.18, 1.54]], '#a01414');
    },
  },
};

export default defineThing({
  questions: {
    figure: choice('Who is painted on it?', {
      hero: 'A square-jawed action hero in sunglasses with his arms crossed in front of an explosion.',
      monster: 'A green rubber-suit monster with raised claws under a full moon.',
      couple: 'A romance couple embracing against a huge sunset.',
      animal: 'A grinning cartoon dog in a backwards red cap giving a thumbs up.',
    }),
    title: choice('What mood is the title of this film that never existed?', {
      explosive: 'Punchy and violent, stencil letters in yellow on black.',
      spooky: 'Dripping and ominous, sickly green on purple-black.',
      swoony: 'Soft and yearning, cream script feeling on deep rose.',
      goofy: 'Loud and silly, bouncing red letters on yellow.',
    }),
    sequel: noul('Is it an unasked-for sequel with a number after the title?'),
    strap: choice('What does the strap line under the title say?', STRAPS),
    state: choice('What shape is the standee in?', {
      fresh: 'Freshly assembled, upright and crisp.',
      bowing: 'Creased at the neck, the head folded forward as if bowing.',
      buckled: 'Buckled at the waist and sagging backward over its easel.',
      leaning: 'Leaning hard to one side, the easel slipping.',
      fallen: 'Flat on its back on the floor, still smiling at the ceiling.',
    }),
    moustache: noul('Has someone drawn a moustache on the face in marker?'),
    extra: choice('What has been added to it?', {
      none: 'Nothing.',
      balloons: 'Two balloons are tied to it for the release weekend.',
      leaflets: 'A cardboard pocket of leaflets is stapled to the base.',
      claimed: 'A paper note taped across it says a clerk has claimed it for when the promotion ends.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const keys = PROFILES[a.figure];
    const top = keys[keys.length - 1][0];
    const figure = FIGURES[a.figure];
    const style = { explosive: ['#141414', '#ffd21a', '#ffffff'], spooky: ['#150a22', '#8ef03a', '#d8c8f0'], swoony: ['#7a1c3c', '#fff0d0', '#f6b8c8'], goofy: ['#ffd21a', '#e0201c', '#1c3fa0'] }[a.title];
    const names = TITLES[a.title];
    let title: string = names[Math.floor(random() * names.length)];
    if (a.sequel) title += ` ${['2', 'II', '3', '4', 'III'][Math.floor(random() * 5)]}`;

    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 1024;
    const c = canvas.getContext('2d')!;
    c.setTransform(512, 0, 0, -512, 0, 1024);
    figure.draw(c);
    if (a.moustache) {
      const [fx, fy] = figure.face;
      c.strokeStyle = '#0a0a0c'; c.lineCap = 'round'; c.lineWidth = 0.022;
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(fx, fy - 0.035); c.bezierCurveTo(fx + d * 0.05, fy - 0.01, fx + d * 0.09, fy - 0.07, fx + d * 0.12, fy - 0.0); c.stroke(); }
      c.lineWidth = 0.012; c.beginPath(); c.ellipse(fx - 0.05, fy + 0.045, 0.045, 0.035, 0, 0, 7); c.stroke(); c.beginPath(); c.ellipse(fx + 0.05, fy + 0.045, 0.045, 0.035, 0, 0, 7); c.stroke();
    }
    // Title block.
    c.fillStyle = style[0]; c.fillRect(0, 0, 1, 0.37);
    c.fillStyle = style[2]; c.fillRect(0, 0.355, 1, 0.015);
    // White die-cut margin following the outline.
    c.strokeStyle = '#f6f3ea'; c.lineWidth = 0.035; c.lineJoin = 'round';
    c.beginPath();
    for (let i = 0; i <= 80; i++) { const y = (i / 80) * top; c.lineTo(0.5 - halfAt(keys, y), y); }
    for (let i = 80; i >= 0; i--) { const y = (i / 80) * top; c.lineTo(0.5 + halfAt(keys, y), y); }
    c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(0.5 - halfAt(keys, top), top); c.lineTo(0.5 + halfAt(keys, top), top); c.stroke();
    // Lettering, in pixels.
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const words = title.split(' ');
    let lines = [title];
    if (title.length > 11 && words.length > 1) {
      let best = 1, score = 1e9;
      for (let i = 1; i < words.length; i++) { const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length); if (d < score) { score = d; best = i; } }
      lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    }
    const longest = Math.max(...lines.map((line) => line.length));
    const size = Math.min(lines.length === 1 ? 92 : 62, 760 / longest);
    c.font = `${a.title === 'swoony' ? 'italic ' : ''}900 ${size}px ${a.title === 'swoony' ? 'serif' : a.title === 'explosive' ? 'monospace' : 'sans-serif'}`;
    lines.forEach((line, i) => {
      const y = 1024 - 512 * 0.235 + (i - (lines.length - 1) / 2) * size * 1.02;
      c.save(); c.translate(256, y); if (a.title === 'goofy') c.rotate((i % 2 ? 1 : -1) * 0.04);
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillText(line, 3, 4, 440);
      c.fillStyle = style[1]; c.fillText(line, 0, 0, 440); c.restore();
    });
    c.font = '700 25px sans-serif'; c.fillStyle = style[2];
    c.fillText(STRAPS[a.strap], 256, 1024 - 512 * 0.065, 440);
    // Sun fade, scuffs and crease lines.
    c.fillStyle = `rgba(214,226,232,${mood.wear * 0.28})`; c.fillRect(0, 0, 512, 1024);
    c.strokeStyle = 'rgba(250,246,236,0.6)'; c.lineWidth = 2;
    for (let i = 0; i < mood.wear * 12; i++) { const y = 80 + random() * 900; c.beginPath(); c.moveTo(0, y); c.lineTo(512, y + (random() - 0.5) * 60); c.stroke(); }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;

    // The die-cut sheet: rows of the outline, bent at the crease.
    const foldY = a.state === 'bowing' ? 1.49 : a.state === 'buckled' ? 1.02 : 99;
    const foldAngle = a.state === 'bowing' ? mix(0.8, 1.5, random()) : a.state === 'buckled' ? -mix(0.35, 0.6, random()) : 0;
    const curl = mix(0.005, 0.07, mood.wear);
    const bend = (x: number, y: number): [number, number, number] => {
      let py = y, pz = curl * (x * x * 4) * (y / top) * (a.state === 'fallen' ? 0.4 : 1);
      if (y > foldY) { py = foldY + (y - foldY) * Math.cos(foldAngle); pz += (y - foldY) * Math.sin(foldAngle); }
      return [x * U, py * U, pz * U];
    };
    const ROWS = 72, COLS = 6, positions: number[] = [], uvs: number[] = [], index: number[] = [];
    for (let r = 0; r <= ROWS; r++) {
      const y = (r / ROWS) * top, half = halfAt(keys, y);
      for (let k = 0; k <= COLS; k++) {
        const x = mix(-half, half, k / COLS);
        positions.push(...bend(x, y)); uvs.push(x + 0.5, y / 2);
      }
    }
    for (let r = 0; r < ROWS; r++) for (let k = 0; k < COLS; k++) {
      const i = r * (COLS + 1) + k;
      index.push(i, i + 1, i + COLS + 1, i + 1, i + COLS + 2, i + COLS + 1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    const card = s.material('#a8845a', { roughness: 0.95, side: THREE.BackSide });
    const brown = s.material('#a8845a', { roughness: 0.95 });
    const g = new THREE.Group();
    s.root.add(g);
    g.add(s.mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, roughness: mix(0.5, 0.9, mood.wear) })));
    const back = s.mesh(geometry, card);
    back.position.z = -0.004;
    g.add(back);

    // Easel back: a folded strut and a locking tab.
    const strutTop = Math.min(foldY - 0.06, 1.25) * U;
    const reach = a.state === 'fallen' ? 0.03 : a.state === 'leaning' ? 0.3 : 0.48;
    const strut = s.rod([0, strutTop, -0.006], [0, 0.0, -reach], 0.004, brown);
    strut.scale.set(26, 1, 1);
    g.add(strut);
    const tab = s.box([0.14, 0.006, reach * 0.55], [0, strutTop * 0.42, -reach * 0.3], brown);
    g.add(tab);

    if (a.extra === 'claimed') {
      const who = ['KEV', 'DAVE', 'TINA', 'MO'][Math.floor(random() * 4)];
      const note = s.label(`SAVED 4 ${who}`, 0.42, 0.2, [0.02, 0.86 * U, 0.008], '#1c2a8a', '#fbf7e6');
      note.rotation.z = (random() - 0.5) * 0.3;
      g.add(note);
      for (const x of [-1, 1]) { const strip = s.box([0.07, 0.03, 0.002], [0.02 + x * 0.2, 0.86 * U + 0.09, 0.01], s.material('#d8c896')); strip.rotation.z = x * 0.6; g.add(strip); }
    }
    if (a.extra === 'leaflets') {
      g.add(s.box([0.26, 0.16, 0.04], [0.2, 0.47 * U, 0.024], brown));
      const paper = s.material(style[1], { roughness: 0.8 });
      for (let i = 0; i < 4; i++) { const leaf = s.box([0.22, 0.2, 0.004], [0.2 + (random() - 0.5) * 0.02, 0.53 * U, 0.012 + i * 0.008], i % 2 ? paper : s.material('#f6f2e6')); leaf.rotation.z = (random() - 0.5) * 0.12; g.add(leaf); }
    }
    const balloons: THREE.Group[] = [];
    if (a.extra === 'balloons') {
      const colours = mood.cheer > 0.4 ? ['#e8261c', '#ffd21a', '#2f8fe0', '#f06aa8'] : ['#8a8f9a', '#b9a88a', '#5a6a7a'];
      const limp = a.state === 'fallen' || mood.wear > 0.7;
      for (let i = 0; i < 2; i++) {
        const b = new THREE.Group();
        const length = limp ? 0.5 : 1.0 + random() * 0.35 + i * 0.25;
        const ballM = s.material(colours[Math.floor(random() * colours.length)], { roughness: 0.25, emissive: '#000000' });
        const size = limp ? 0.09 : 0.14;
        b.add(s.rod([0, 0, 0], [0, length, 0], 0.0025, s.material('#f2f2f2')));
        b.add(s.ball([size, size * 1.2, size], [0, length + size * 1.15, 0], ballM, 18));
        b.add(s.cylinder(0.006, 0.02, 0.03, [0, length + 0.005, 0], ballM, 8));
        b.position.set((i ? 1 : -1) * 0.4, 0.3 * U, 0.02);
        b.rotation.z = limp ? (i ? -1 : 1) * 2.2 : (i ? -1 : 1) * (0.12 + random() * 0.2);
        b.rotation.x = limp ? 0.6 : (random() - 0.5) * 0.3;
        (a.state === 'fallen' ? s.root : g).add(b);
        if (a.state === 'fallen') { b.position.set((i ? 1 : -1) * 0.5, 0.0, -0.1 - i * 0.4); b.rotation.set(Math.PI / 2 - 0.12, 0, (i ? -1 : 1) * 1.3); }
        else if (!limp) balloons.push(b);
      }
    }

    if (a.state === 'fallen') { g.rotation.x = -Math.PI / 2 + 0.02; g.rotation.z = (random() - 0.5) * 0.5; g.position.y = 0.012; }
    else if (a.state === 'leaning') { g.rotation.z = (random() < 0.5 ? -1 : 1) * mix(0.14, 0.24, random()); g.rotation.x = -0.2; g.position.y = 0.05; }
    else g.rotation.x = -mix(0.05, 0.1, random());
    g.rotation.y = (random() - 0.5) * 0.1;

    const sway = mix(0.01, 0.09, mood.energy);
    const rest = balloons.map((b) => [b.rotation.x, b.rotation.z]);
    return s.finish({
      footprint: a.state === 'fallen' ? undefined : 0.5,
      update: balloons.length ? (_dt, time) => balloons.forEach((b, i) => { b.rotation.x = rest[i][0] + Math.sin(time * 1.3 + i * 2) * sway; b.rotation.z = rest[i][1] + Math.sin(time * 0.9 + i) * sway; }) : undefined,
    });
  },
});
