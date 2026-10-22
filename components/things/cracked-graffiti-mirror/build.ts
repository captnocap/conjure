import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const NAMES = ['JO', 'KAT', 'DEE', 'MAX', 'SID', 'ROXY', 'VIV', 'RAY', 'NIX', 'BEX', 'TAM', 'LOU'];
const BANDS = ['RATS', 'SPIT', 'THE DREGS', 'KAOS', 'NERVE', 'SLUGS', 'BLEACH', 'X-RAY', 'HISS', 'TEETH', 'VERMIN', 'GLUE', 'STATIC'];
const HAIR = ['#3fe01c', '#ff2a9a', '#1d6dff', '#e8262a', '#f1e27a', '#17151a', '#8a3be0', '#ff7a1a'];
const BRIGHT = ['#ff2a7a', '#ffe02a', '#27d0e8', '#7be02a', '#ff7a1a', '#f4f1e6', '#c4122f', '#8a3be0'];

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    writing: choice('What is written on the glass?', {
      nameheart: 'Two names joined by a heart, inside a bigger heart.',
      warning: 'A warning to whoever reads it next, in capitals.',
      lyrics: 'Three lines of a song, slanting downhill.',
      fine: 'YOU LOOK FINE, written by a kind stranger.',
      number: 'CALL ME and a phone number, sealed with a kiss print.',
      kisses: 'No words, only lipstick kiss prints all over.',
      none: 'Nothing is written on it.',
    }),
    ink: choice('What is the writing done in?', {
      red: 'Classic red lipstick, thick and greasy.',
      pink: 'Hot pink lipstick.',
      black: 'Black eyeliner and marker.',
      white: 'White paint pen.',
      purple: 'Dark plum lipstick, nearly black.',
    }),
    broken: choice('How broken is the mirror?', {
      scratched: 'Whole, only scratched and tarnished.',
      hairline: 'One long hairline crack from side to side.',
      corner: 'A corner cracked where something was thrown.',
      web: 'A spider-web crack spreading from one punch.',
      shattered: 'Shattered: a web with pieces fallen out, shards on the ledge and floor.',
    }),
    reflection: choice('What ghost does the glass reflect?', {
      nobody: 'Nobody: just an empty room and a row of stall doors.',
      one: 'One person leaning in close, fixing their eyeliner.',
      friends: 'Two friends with their heads together.',
      crowd: 'A crowd of spiked heads packed shoulder to shoulder.',
      flash: 'A figure taking a photo, the flash a white burst.',
    }),
    edge: choice('What is stuck round the edge?', {
      flyers: 'Photocopied gig flyers on coloured paper.',
      photos: 'Photo-booth strips and instant snapshots.',
      stickers: 'Round band stickers along the frame.',
      nothing: 'Nothing.',
    }),
    frame: choice('How is it framed?', {
      clips: 'Bare glass on four steel clips.',
      steel: 'A thin institutional steel frame.',
      black: 'A chipped black-painted wooden frame.',
      gilt: 'A heavy gold frame somebody rescued from a skip.',
    }),
    ledge: choice('What is on the ledge underneath?', {
      makeup: 'Lipsticks and kohl pencils.',
      drinks: 'Beer bottles and plastic cups.',
      candles: 'A row of dripping candles.',
      empty: 'Nothing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const ink = { red: '#d3122a', pink: '#ff2f9a', black: '#15131a', white: '#f6f4ea', purple: '#5a1248' }[a.ink];
    const MW = 1.42, MH = 0.8, MY = 1.34, WW = 1.78, WH = 1.96;

    const scrawl = (g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, colour: string, wobble = 0.1) => {
      g.font = `bold ${size}px sans-serif`;
      g.textBaseline = 'middle';
      g.textAlign = 'left';
      g.lineJoin = g.lineCap = 'round';
      let cx = x;
      for (const ch of text) {
        g.save();
        g.translate(cx, y + (random() - 0.5) * size * 0.16);
        g.rotate((random() - 0.5) * wobble * 2);
        g.strokeStyle = colour;
        g.lineWidth = size * 0.07;
        g.strokeText(ch, 0, 0);
        g.fillStyle = colour;
        g.fillText(ch, 0, 0);
        g.restore();
        cx += g.measureText(ch).width * (0.95 + random() * 0.12) + size * 0.04;
      }
      return cx - x;
    };
    const widthOf = (g: CanvasRenderingContext2D, text: string, size: number) => { g.font = `bold ${size}px sans-serif`; return g.measureText(text).width * 1.02 + text.length * size * 0.04; };
    const heart = (g: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, fill: boolean) => {
      g.beginPath();
      g.moveTo(x, y + r * 0.9);
      g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.4);
      g.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
      if (fill) { g.fillStyle = colour; g.fill(); } else { g.strokeStyle = colour; g.lineWidth = Math.max(4, r * 0.09); g.stroke(); }
    };
    const kiss = (g: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string) => {
      g.save();
      g.translate(x, y);
      g.rotate((random() - 0.5) * 1.2);
      g.fillStyle = colour;
      g.globalAlpha = 0.85;
      g.beginPath(); g.moveTo(-r, 0); g.quadraticCurveTo(-r * 0.5, -r * 0.75, 0, -r * 0.38); g.quadraticCurveTo(r * 0.5, -r * 0.75, r, 0); g.quadraticCurveTo(0, -r * 0.12, -r, 0); g.fill();
      g.beginPath(); g.moveTo(-r, r * 0.06); g.quadraticCurveTo(0, r * 0.95, r, r * 0.06); g.quadraticCurveTo(0, r * 0.25, -r, r * 0.06); g.fill();
      g.restore();
    };
    /** A head-and-shoulders silhouette for the reflection. */
    const bust = (g: CanvasRenderingContext2D, x: number, base: number, size: number, lit: boolean) => {
      const hair = pick(HAIR), jacket = pick(['#23212a', '#2c3550', '#3a2226', '#1c1b1e']);
      const skinTone = lit ? pick(['#d9b39d', '#b98666', '#8a5c44', '#e6c8b4']) : '#3d3742';
      g.fillStyle = lit ? jacket : '#2f2a36';
      g.beginPath(); g.moveTo(x - size * 1.25, base); g.quadraticCurveTo(x - size * 1.1, base - size * 1.25, x - size * 0.3, base - size * 1.35); g.lineTo(x + size * 0.3, base - size * 1.35); g.quadraticCurveTo(x + size * 1.1, base - size * 1.25, x + size * 1.25, base); g.fill();
      g.fillStyle = skinTone;
      g.fillRect(x - size * 0.2, base - size * 1.7, size * 0.4, size * 0.5);
      const hy = base - size * 2.25;
      g.beginPath(); g.ellipse(x, hy, size * 0.56, size * 0.7, 0, 0, 7); g.fill();
      // Hair: a row of spikes over the crown.
      g.fillStyle = lit ? hair : '#28232e';
      const spikes = 5 + Math.floor(random() * 4), tall = size * (0.5 + random() * 0.7);
      for (let k = 0; k < spikes; k++) {
        const t = (k / (spikes - 1) - 0.5) * 1.5, bx = x + Math.sin(t) * size * 0.5, by = hy - Math.cos(t) * size * 0.6;
        g.beginPath(); g.moveTo(bx - size * 0.13, by + size * 0.1); g.lineTo(bx + Math.sin(t) * tall, by - Math.cos(t) * tall); g.lineTo(bx + size * 0.13, by + size * 0.1); g.fill();
      }
      g.beginPath(); g.ellipse(x, hy - size * 0.42, size * 0.5, size * 0.3, 0, Math.PI, 0); g.fill();
      if (lit) {
        g.fillStyle = '#17141a';
        for (const side of [-1, 1]) { g.beginPath(); g.ellipse(x + side * size * 0.22, hy - size * 0.02, size * 0.13, size * 0.075, side * 0.15, 0, 7); g.fill(); }
        g.fillStyle = pick(['#b01a2c', '#17141a', '#7a1848']);
        g.beginPath(); g.ellipse(x, hy + size * 0.36, size * 0.15, size * 0.05, 0, 0, 7); g.fill();
      }
      return hy;
    };

    // --- The glass: reflection, tarnish, writing and cracks all painted on one canvas.
    const holes: { x: number; y: number }[] = [];
    const glass = paint(1280, 720, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, w, h);
      sky.addColorStop(0, '#c9d6d8');
      sky.addColorStop(0.55, '#a9babf');
      sky.addColorStop(1, new THREE.Color('#9aa9b6').lerp(new THREE.Color('#d7a3bd'), 0.25 + mood.warmth * 0.5).getStyle());
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      // The empty room behind: tile lines, stall doors, the door with pink light under it.
      g.strokeStyle = 'rgba(70,84,92,0.22)';
      g.lineWidth = 2;
      for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h * 0.78); g.stroke(); }
      for (let y = 0; y < h * 0.78; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      const stallColour = pick(['#5f8f78', '#8a4a4c', '#4f86a8', '#c9a9b4']);
      for (let k = 0; k < 3; k++) {
        g.fillStyle = stallColour;
        g.globalAlpha = 0.5;
        g.fillRect(w * (0.08 + k * 0.17), h * 0.12, w * 0.14, h * 0.78);
        g.globalAlpha = 0.35;
        g.fillStyle = '#1e2228';
        g.fillRect(w * (0.08 + k * 0.17) + w * 0.14, h * 0.12, w * 0.012, h * 0.78);
      }
      g.globalAlpha = 0.5;
      g.fillStyle = '#4b4650';
      g.fillRect(w * 0.74, h * 0.1, w * 0.17, h * 0.8);
      g.globalAlpha = 0.9;
      g.fillStyle = '#ff5fb0';
      g.fillRect(w * 0.74, h * 0.88, w * 0.17, h * 0.03);
      g.globalAlpha = 1;
      const glow = g.createRadialGradient(w * 0.82, h * 0.92, 5, w * 0.82, h * 0.92, w * 0.3);
      glow.addColorStop(0, 'rgba(255,95,176,0.5)');
      glow.addColorStop(1, 'rgba(255,95,176,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);

      g.globalAlpha = 0.82;
      if (a.reflection === 'crowd') {
        for (let row = 0; row < 2; row++)
          for (let k = 0; k < 8; k++) bust(g, w * (0.04 + k * 0.135) + (random() - 0.5) * 40 + row * 50, h * (0.92 + row * 0.2) + random() * 30, h * (0.15 + row * 0.04 + random() * 0.03), row === 1);
      } else if (a.reflection === 'one') {
        const x = w * (0.34 + random() * 0.2), size = h * 0.3, hy = bust(g, x, h * 1.12, size, true);
        // The raised arm and the pencil at the eye.
        g.strokeStyle = '#23212a'; g.lineWidth = size * 0.36; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x + size * 1.5, h * 1.05); g.lineTo(x + size * 0.75, hy + size * 0.25); g.stroke();
        g.fillStyle = '#c99f88';
        g.beginPath(); g.arc(x + size * 0.62, hy + size * 0.1, size * 0.19, 0, 7); g.fill();
        g.strokeStyle = '#111'; g.lineWidth = size * 0.05;
        g.beginPath(); g.moveTo(x + size * 0.72, hy + size * 0.2); g.lineTo(x + size * 0.28, hy - size * 0.02); g.stroke();
      } else if (a.reflection === 'friends') {
        const x = w * (0.32 + random() * 0.25), size = h * 0.25;
        g.save(); g.translate(x, h * 1.08); g.rotate(0.14); bust(g, 0, 0, size, true); g.restore();
        g.save(); g.translate(x + size * 1.55, h * 1.1); g.rotate(-0.16); bust(g, 0, 0, size * 0.94, true); g.restore();
      } else if (a.reflection === 'flash') {
        const x = w * (0.4 + random() * 0.2), size = h * 0.26, hy = bust(g, x, h * 1.1, size, false);
        g.globalAlpha = 1;
        const fx = x + size * 0.1, fy = hy + size * 0.55;
        const burst = g.createRadialGradient(fx, fy, 2, fx, fy, size * 1.5);
        burst.addColorStop(0, 'rgba(255,255,255,1)');
        burst.addColorStop(0.25, 'rgba(255,255,240,0.85)');
        burst.addColorStop(1, 'rgba(255,255,240,0)');
        g.fillStyle = burst;
        g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 5;
        for (let k = 0; k < 12; k++) { const t = (k / 12) * 6.283 + 0.2; g.beginPath(); g.moveTo(fx + Math.cos(t) * size * 0.3, fy + Math.sin(t) * size * 0.3); g.lineTo(fx + Math.cos(t) * size * (1 + (k % 2) * 0.7), fy + Math.sin(t) * size * (1 + (k % 2) * 0.7)); g.stroke(); }
      }
      g.globalAlpha = 1;
      // Silvering haze so the reflection stays a ghost.
      g.fillStyle = 'rgba(205,218,222,0.3)';
      g.fillRect(0, 0, w, h);
      const shine = g.createLinearGradient(0, 0, w * 0.6, h);
      shine.addColorStop(0.3, 'rgba(255,255,255,0)');
      shine.addColorStop(0.42, 'rgba(255,255,255,0.28)');
      shine.addColorStop(0.5, 'rgba(255,255,255,0)');
      g.fillStyle = shine;
      g.fillRect(0, 0, w, h);
      // Tarnish creeping in from the edges, and key scratches.
      for (let k = 0; k < 30 + mood.wear * 160; k++) {
        const edge = Math.floor(random() * 4), t = random(), inset = random() * random() * (0.05 + mood.wear * 0.14);
        const x = edge === 0 ? inset * w : edge === 1 ? (1 - inset) * w : t * w, y = edge === 2 ? inset * h : edge === 3 ? (1 - inset) * h : t * h;
        g.fillStyle = `rgba(${52 + random() * 30},${48 + random() * 20},${40},${0.3 + random() * 0.4})`;
        g.beginPath(); g.ellipse(x, y, 3 + random() * 14, 3 + random() * 10, random() * 3, 0, 7); g.fill();
      }
      g.strokeStyle = 'rgba(245,250,250,0.55)';
      g.lineWidth = 1.5;
      for (let k = 0; k < 10 + mood.wear * 60; k++) { const x = random() * w, y = random() * h, t = random() * 6.3, len = 20 + random() * 120; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(t) * len, y + Math.sin(t) * len); g.stroke(); }
      for (let k = 0; k < 2 + mood.density * 5; k++) { g.globalAlpha = 0.6; scrawl(g, pick([...BANDS, ...NAMES]), random() * w * 0.8, h * (0.08 + random() * 0.84), 26 + random() * 16, 'rgba(240,246,246,0.9)', 0.2); g.globalAlpha = 1; }

      // The writing.
      g.save();
      g.translate(w * 0.5, h * 0.45);
      g.rotate((random() - 0.5) * 0.12);
      const lines: string[] =
        a.writing === 'nameheart' ? [] :
        a.writing === 'warning' ? pick([['DONT TRUST', 'THE PROMOTER'], ['HE IS', 'LYING'], ['WATCH YOUR', 'DRINK'], ['GO HOME', 'TOMMY']]) :
        a.writing === 'lyrics' ? pick([['we are the kids', 'nobody wanted', 'and we are LOUD'], ['burn it down', 'build it back', 'with glitter'], ['i was a ghost', 'till the drums', 'came in']]) :
        a.writing === 'fine' ? ['YOU LOOK', 'FINE'] :
        a.writing === 'number' ? ['CALL ME', `555-01${10 + Math.floor(random() * 89)}`] : [];
      if (a.writing === 'nameheart') {
        const left = pick(NAMES), right = pick(NAMES.filter((name) => name !== left)), size = h * 0.2;
        heart(g, 0, -h * 0.02, h * 0.3, ink, false);
        const lw = widthOf(g, left, size), rw = widthOf(g, right, size), total = lw + rw + size * 1.1;
        scrawl(g, left, -total / 2, 0, size, ink);
        heart(g, -total / 2 + lw + size * 0.55, 0, size * 0.3, ink, true);
        scrawl(g, right, -total / 2 + lw + size * 1.1, 0, size, ink);
      } else if (a.writing === 'kisses') {
        for (let k = 0; k < 14 + mood.density * 14; k++) kiss(g, (random() - 0.5) * w * 0.9, (random() - 0.5) * h * 0.85, h * (0.05 + random() * 0.05), pick([ink, ink, '#d3122a', '#ff2f9a']));
      } else if (lines.length) {
        const longest = Math.max(...lines.map((line) => line.length));
        const size = Math.min((h * 0.66) / lines.length, (w * 1.25) / longest);
        lines.forEach((line, index) => {
          const y = (index - (lines.length - 1) / 2) * size * 1.08;
          scrawl(g, line, -widthOf(g, line, size) / 2 + (a.writing === 'lyrics' ? index * size * 0.3 : 0), y, size, ink, 0.07);
        });
        if (a.writing === 'number') kiss(g, w * 0.3, h * 0.24, h * 0.09, a.ink === 'black' || a.ink === 'white' ? '#d3122a' : ink);
        if (a.writing === 'fine') heart(g, w * 0.3, h * 0.2, h * 0.07, ink, true);
      }
      g.restore();

      // Cracks.
      const line = (points: readonly (readonly [number, number])[]) => {
        for (const [dx, colour, width] of [[0, 'rgba(18,22,26,0.9)', 3], [2, 'rgba(255,255,255,0.75)', 1.4]] as const) {
          g.strokeStyle = colour; g.lineWidth = width;
          g.beginPath();
          points.forEach(([x, y], index) => (index ? g.lineTo(x + dx, y + dx) : g.moveTo(x + dx, y + dx)));
          g.stroke();
        }
      };
      if (a.broken === 'hairline') {
        const points: [number, number][] = [];
        let y = h * (0.25 + random() * 0.5);
        for (let x = -10; x <= w + 10; x += 45) { y += (random() - 0.5) * 50; points.push([x, y]); }
        line(points);
      } else if (a.broken !== 'scratched') {
        const corner = a.broken === 'corner';
        const ix = corner ? (random() < 0.5 ? w * 0.06 : w * 0.94) : w * (0.25 + random() * 0.5), iy = corner ? (random() < 0.5 ? h * 0.1 : h * 0.9) : h * (0.3 + random() * 0.4);
        const radials = corner ? 8 : 11 + Math.floor(random() * 5);
        const radii = corner ? [30, 75, 140, 220, 320] : [34, 80, 150, 250, 380, 560, 820, 1500];
        const web: [number, number][][] = [];
        for (let i = 0; i < radials; i++) {
          let angle = (i / radials) * 6.283 + (random() - 0.5) * 0.3;
          const spoke: [number, number][] = [[ix, iy]];
          for (const r of radii) { angle += (random() - 0.5) * 0.09; spoke.push([ix + Math.cos(angle) * r, iy + Math.sin(angle) * r]); }
          web.push(spoke);
        }
        // Fallen pieces first, so the crack lines draw over their edges.
        if (a.broken === 'shattered')
          for (let i = 0; i < radials; i++)
            for (let k = 2; k < radii.length - 1; k++) {
              if (random() > 0.2 + k * 0.04) continue;
              const next = web[(i + 1) % radials];
              const cell = [web[i][k], web[i][k + 1], next[k + 1], next[k]];
              g.fillStyle = '#3b332b';
              g.beginPath();
              cell.forEach(([x, y], index) => (index ? g.lineTo(x, y) : g.moveTo(x, y)));
              g.fill();
              g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 5; g.stroke();
              holes.push({ x: (cell[0][0] + cell[2][0]) / 2 / w, y: (cell[0][1] + cell[2][1]) / 2 / h });
            }
        for (const spoke of web) line(spoke);
        for (let k = 1; k < radii.length - (corner ? 0 : 2); k++)
          for (let i = 0; i < radials; i++) if (random() < 0.82) line([web[i][k], web[(i + 1) % radials][k]]);
        // The crushed white centre of the impact.
        g.fillStyle = 'rgba(245,250,250,0.9)';
        for (let k = 0; k < 40; k++) { const t = random() * 6.3, r = random() * 30; g.fillRect(ix + Math.cos(t) * r, iy + Math.sin(t) * r, 3, 3); }
      }
    });

    // --- Wall slab.
    const tilePalette = pick([['#e4e1d6', '#e4e1d6'], ['#e4e1d6', '#2a2a2f'], ['#a9cdbb', '#a9cdbb'], ['#d9b4ba', '#e9e2d6'], ['#3a3a42', '#3a3a42'], ['#d8cfa6', '#8a3a34']] as const);
    const wallTexture = paint(712, 784, (g, w, h) => {
      g.fillStyle = '#86837a';
      g.fillRect(0, 0, w, h);
      const size = w / 12;
      for (let i = 0; i < 12; i++)
        for (let j = 0; j * size < h; j++) {
          const tint = new THREE.Color(tilePalette[(i + j) % 2]);
          tint.offsetHSL(0, 0, (random() - 0.5) * 0.05 - mood.wear * 0.06);
          g.fillStyle = tint.getStyle();
          g.fillRect(i * size + 2, j * size + 2, size - 4, size - 4);
          if (random() < mood.wear * 0.1) { g.strokeStyle = 'rgba(30,26,22,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(i * size + 2, j * size + random() * size); g.lineTo(i * size + size - 2, j * size + random() * size); g.stroke(); }
        }
      for (let k = 0; k < 3 + mood.density * 8; k++) scrawl(g, pick([...BANDS, ...NAMES, 'OI!', 'XXX']), random() * w * 0.75, h * (0.62 + random() * 0.34), 20 + random() * 22, pick(['#15131a', '#c4122f', '#1d4dff', '#f6f4ea']), 0.2);
      const grime = g.createLinearGradient(0, h, 0, h * 0.6);
      grime.addColorStop(0, `rgba(50,44,36,${0.2 + mood.wear * 0.45})`);
      grime.addColorStop(1, 'rgba(50,44,36,0)');
      g.fillStyle = grime;
      g.fillRect(0, 0, w, h);
    });
    const grout = s.material('#a8a498');
    const wall = new THREE.Mesh(new THREE.BoxGeometry(WW, WH, 0.08), [grout, grout, grout, grout, new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.45 }), grout]);
    wall.position.set(0, WH / 2, 0);
    wall.castShadow = wall.receiveShadow = true;
    s.root.add(wall);
    s.box([WW, 0.1, 0.1], [0, 0.05, 0.02], s.material('#55524c'));

    // --- Mirror.
    const backing = s.material('#3b332b');
    const silver = new THREE.MeshStandardMaterial({ map: glass, roughness: 0.16, metalness: 0.25, emissive: '#ffffff', emissiveMap: glass, emissiveIntensity: 0.22 });
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(MW, MH, 0.014), [backing, backing, backing, backing, silver, backing]);
    mirror.position.set(0, MY, 0.048);
    mirror.castShadow = true;
    if (a.broken === 'shattered') mirror.rotation.z = (random() - 0.5) * 0.03;
    s.root.add(mirror);
    const zf = 0.056;
    if (a.frame === 'clips') {
      const steel = s.material('#c3c8ca', { metalness: 0.85, roughness: 0.3 });
      for (const x of [-0.45, 0.45]) for (const y of [-1, 1]) s.box([0.05, 0.035, 0.02], [x, MY + y * (MH / 2 + 0.006), zf], steel);
    } else {
      const thick = { steel: 0.025, black: 0.05, gilt: 0.09 }[a.frame], deep = { steel: 0.02, black: 0.03, gilt: 0.05 }[a.frame];
      const paintwork = a.frame === 'steel' ? s.material('#c3c8ca', { metalness: 0.85, roughness: 0.3 }) : a.frame === 'black' ? s.material('#1b1a1d', { roughness: 0.5 }) : s.material('#c9a13a', { metalness: 0.75, roughness: 0.35 });
      for (const y of [-1, 1]) s.box([MW + thick * 2, thick, deep], [0, MY + y * (MH / 2 + thick / 2 - 0.004), 0.04 + deep / 2], paintwork);
      for (const x of [-1, 1]) s.box([thick, MH, deep], [x * (MW / 2 + thick / 2 - 0.004), MY, 0.04 + deep / 2], paintwork);
      if (a.frame === 'gilt') {
        for (const x of [-1, 1]) for (const y of [-1, 1]) s.ball([0.07, 0.07, 0.045], [x * (MW / 2 + 0.04), MY + y * (MH / 2 + 0.04), 0.075], paintwork, 14);
        for (let k = 0; k < 9; k++) for (const y of [-1, 1]) s.ball([0.035, 0.03, 0.025], [-MW / 2 + 0.11 + k * ((MW - 0.22) / 8), MY + y * (MH / 2 + 0.045), 0.085], paintwork, 10);
        const crest = s.ball([0.2, 0.09, 0.04], [0, MY + MH / 2 + 0.11, 0.07], paintwork, 16);
        crest.castShadow = true;
      } else if (a.frame === 'black') {
        for (let k = 0; k < 4 + mood.wear * 14; k++) s.box([0.02 + random() * 0.04, 0.012, 0.004], [(random() - 0.5) * MW, MY + (random() < 0.5 ? -1 : 1) * (MH / 2 + 0.02), 0.071], s.material('#a58a62'));
      }
    }

    // --- Strip light over the mirror.
    const tubeColour = new THREE.Color('#eaf6ff').lerp(new THREE.Color('#ffe2b0'), mood.warmth);
    const tube = new THREE.MeshStandardMaterial({ color: tubeColour, emissive: tubeColour, emissiveIntensity: 1.1, roughness: 0.4 });
    s.box([1.0, 0.05, 0.09], [0, MY + MH / 2 + (a.frame === 'gilt' ? 0.24 : 0.13), 0.085], s.material('#d8d8d2', { roughness: 0.5 }));
    const lamp = s.cylinder(0.02, 0.02, 0.92, [0, MY + MH / 2 + (a.frame === 'gilt' ? 0.21 : 0.1), 0.11], tube, 12);
    lamp.rotation.z = Math.PI / 2;
    lamp.castShadow = false;

    // --- Things stuck round the edge.
    const edgeSpot = (k: number, count: number): [number, number] => {
      const t = (k + random() * 0.7) / count, side = Math.floor(t * 4), u = (t * 4) % 1;
      const along = (u - 0.5) * 0.86;
      return side === 0 ? [-MW / 2 - 0.02 + random() * 0.05, MY + along * MH] : side === 1 ? [along * MW, MY + MH / 2 - 0.02 + random() * 0.05] : side === 2 ? [MW / 2 + 0.02 - random() * 0.05, MY + along * MH] : [along * MW, MY - MH / 2 + 0.05 - random() * 0.04];
    };
    const card = (texture: THREE.Texture, w: number, h: number, x: number, y: number, k: number) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, side: THREE.DoubleSide }));
      mesh.position.set(x, y, 0.062 + k * 0.0016 + (a.frame === 'gilt' ? 0.035 : a.frame === 'black' ? 0.012 : 0));
      mesh.rotation.z = (random() - 0.5) * 0.7;
      mesh.rotation.x = -0.03 - random() * 0.05;
      mesh.castShadow = true;
      s.root.add(mesh);
    };
    if (a.edge === 'flyers') {
      const flyers = Array.from({ length: 4 }, () => paint(160, 224, (g, w, h) => {
        const paper = pick(['#f4f1e6', '#ffe45a', '#ff9cc4', '#9be6c0', '#ffb05a', '#b9d8ff']);
        g.fillStyle = paper; g.fillRect(0, 0, w, h);
        g.fillStyle = '#111';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        const band = pick(BANDS);
        g.font = `bold ${Math.min(46, 250 / band.length)}px sans-serif`;
        g.fillText(band, w / 2, 30, w - 12);
        g.fillRect(14, 58, w - 28, 100);
        g.fillStyle = paper;
        g.beginPath(); g.arc(w / 2, 100, 30, 0, 7); g.fill();
        g.fillStyle = '#111';
        g.beginPath(); g.arc(w / 2 - 11, 96, 7, 0, 7); g.arc(w / 2 + 11, 96, 7, 0, 7); g.fill();
        g.fillRect(w / 2 - 12, 114, 24, 5);
        g.fillStyle = paper;
        for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(w / 2 - 28 + k * 14, 76); g.lineTo(w / 2 - 22 + k * 12, 60 - (k % 2) * 4); g.lineTo(w / 2 - 16 + k * 14, 76); g.fill(); }
        g.fillStyle = '#111';
        g.font = 'bold 22px sans-serif';
        g.fillText(`+ ${pick(BANDS)}`, w / 2, 176, w - 12);
        g.font = 'bold 18px sans-serif';
        g.fillText(pick(['FRI 13TH', 'SAT 9PM', 'ALL AGES', 'TONIGHT', 'THURS']) + ' ' + pick(['£2', '$5', 'FREE', '£3']), w / 2, 204, w - 12);
      }));
      const count = 5 + Math.round(mood.density * 7);
      for (let k = 0; k < count; k++) { const [x, y] = edgeSpot(k, count); card(pick(flyers), 0.16, 0.224, x, y, k); }
    } else if (a.edge === 'photos') {
      const strip = paint(64, 256, (g, w, h) => {
        g.fillStyle = '#f4f1e6'; g.fillRect(0, 0, w, h);
        for (let k = 0; k < 4; k++) {
          g.fillStyle = pick(['#3a4a5a', '#5a3a4a', '#2a2a30', '#6a5a3a']); g.fillRect(6, 6 + k * 62, w - 12, 56);
          for (const dx of [-10, 10]) { g.fillStyle = pick(['#d9b39d', '#b98666', '#8a5c44']); g.beginPath(); g.arc(w / 2 + dx, 40 + k * 62, 9, 0, 7); g.fill(); g.fillStyle = pick(HAIR); g.beginPath(); g.arc(w / 2 + dx, 34 + k * 62, 9, Math.PI, 0); g.fill(); }
        }
      });
      const snap = paint(128, 150, (g, w, h) => {
        g.fillStyle = '#f4f1e6'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#3a3442'; g.fillRect(10, 10, w - 20, w - 20);
        g.fillStyle = '#ff5fb0'; g.globalAlpha = 0.5; g.fillRect(10, 70, w - 20, 48); g.globalAlpha = 1;
        for (const dx of [-22, 4, 28]) { g.fillStyle = pick(['#d9b39d', '#b98666', '#8a5c44']); g.beginPath(); g.arc(w / 2 + dx, 70, 13, 0, 7); g.fill(); g.fillStyle = pick(HAIR); g.beginPath(); g.moveTo(w / 2 + dx - 13, 66); g.lineTo(w / 2 + dx, 36); g.lineTo(w / 2 + dx + 13, 66); g.fill(); }
      });
      const count = 4 + Math.round(mood.density * 6);
      for (let k = 0; k < count; k++) { const [x, y] = edgeSpot(k, count); if (k % 2) card(strip, 0.05, 0.2, x, y, k); else card(snap, 0.1, 0.117, x, y, k); }
    } else if (a.edge === 'stickers') {
      const count = 12 + Math.round(mood.density * 20);
      for (let k = 0; k < count; k++) {
        const [x, y] = edgeSpot(k, count), colour = pick(BRIGHT);
        const texture = paint(96, 96, (g, w) => {
          g.fillStyle = colour; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 1, 0, 7); g.fill();
          g.fillStyle = colour === '#f4f1e6' || colour === '#ffe02a' || colour === '#7be02a' ? '#111' : '#f4f1e6';
          g.textAlign = 'center'; g.textBaseline = 'middle';
          const word = pick(BANDS); g.font = `bold ${Math.min(34, 130 / word.length)}px sans-serif`; g.fillText(word, w / 2, w / 2, w - 10);
        });
        const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.03 + random() * 0.025, 20), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6 }));
        mesh.position.set(x, y, 0.058 + k * 0.0006 + (a.frame === 'gilt' ? 0.04 : a.frame === 'black' ? 0.016 : 0));
        mesh.rotation.z = (random() - 0.5) * 1.2;
        s.root.add(mesh);
      }
    }

    // --- Ledge and what sits on it.
    const LY = MY - MH / 2 - 0.13;
    s.box([MW + 0.1, 0.03, 0.16], [0, LY, 0.12], s.material('#e6e3d8', { roughness: 0.35 }));
    for (const x of [-0.55, 0.55]) s.box([0.03, 0.09, 0.12], [x, LY - 0.055, 0.1], s.material('#9aa0a2', { metalness: 0.7, roughness: 0.4 }));
    const top = LY + 0.015;
    const spot = () => [(random() - 0.5) * (MW - 0.1), 0.07 + random() * 0.1] as const;
    if (a.ledge === 'makeup') {
      const gold = s.material('#c9a13a', { metalness: 0.8, roughness: 0.3 }), black = s.material('#18171a', { roughness: 0.4 });
      for (let k = 0; k < 3 + Math.round(mood.density * 4); k++) {
        const [x, z] = spot(), shade = pick(['#d3122a', '#ff2f9a', '#5a1248', '#b01a2c', ink]);
        if (random() < 0.6) {
          s.cylinder(0.012, 0.012, 0.045, [x, top + 0.0225, z], k % 2 ? gold : black, 12);
          s.cylinder(0.008, 0.01, 0.028, [x, top + 0.059, z], s.material(shade, { roughness: 0.35 }), 12);
        } else {
          const lying = s.cylinder(0.012, 0.012, 0.07, [x, top + 0.012, z], k % 2 ? gold : black, 12);
          lying.rotation.set(Math.PI / 2, 0, random() * 3);
        }
      }
      for (let k = 0; k < 2 + Math.round(mood.density * 3); k++) {
        const [x, z] = spot(), turn = random() * 3;
        const pencil = s.cylinder(0.005, 0.005, 0.13, [x, top + 0.005, z], black, 8);
        pencil.rotation.set(Math.PI / 2, 0, turn);
      }
    } else if (a.ledge === 'drinks') {
      for (let k = 0; k < 3 + Math.round(mood.density * 4); k++) {
        const [x, z] = spot();
        if (random() < 0.6) {
          const bottleGlass = new THREE.MeshStandardMaterial({ color: pick(['#6a3d16', '#2f6a3a', '#6a3d16']), roughness: 0.15, metalness: 0.1 });
          s.lathe([[0, 0], [0.03, 0], [0.031, 0.11], [0.022, 0.15], [0.012, 0.18], [0.012, 0.22], [0, 0.22]], bottleGlass, [x, top, z]);
          s.label(pick(BANDS), 0.05, 0.05, [x, top + 0.06, z + 0.0315], '#111', pick(['#f4f1e6', '#ffe02a', '#c4122f']));
        } else {
          s.cylinder(0.038, 0.027, 0.1, [x, top + 0.05, z], s.material(pick(['#f4f1e6', '#d8202a', '#e9e2c8']), { roughness: 0.5 }), 16);
        }
      }
    } else if (a.ledge === 'candles') {
      const flame = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb030', emissiveIntensity: 1.6 });
      for (let k = 0; k < 4 + Math.round(mood.density * 5); k++) {
        const [x, z] = spot(), tall = 0.04 + random() * 0.13, wax = s.material(pick(['#f1ead2', '#18171a', '#7a1420', '#5a1a6a']), { roughness: 0.5 });
        s.cylinder(0.014, 0.016, tall, [x, top + tall / 2, z], wax, 12);
        s.cylinder(0.03 + random() * 0.015, 0.035, 0.006, [x, top + 0.003, z], wax, 14);
        const tip = s.ball([0.008, 0.02, 0.008], [x, top + tall + 0.02, z], flame, 8);
        tip.castShadow = false;
      }
    }
    // --- Shards.
    if (a.broken === 'shattered' || a.broken === 'web' || a.broken === 'corner') {
      const sliver = new THREE.MeshStandardMaterial({ color: '#d6e2e4', roughness: 0.1, metalness: 0.5, emissive: '#b9c7c9', emissiveIntensity: 0.25 });
      const count = a.broken === 'shattered' ? 10 + holes.length * 2 : a.broken === 'web' ? 4 : 2;
      const points = Array.from({ length: Math.min(count, 60) }, (_unused, k) => {
        const onLedge = k % 3 === 0, hole = holes.length ? holes[k % holes.length] : { x: random(), y: 0.5 };
        const x = (hole.x - 0.5) * MW + (random() - 0.5) * 0.4;
        return { at: [x, onLedge ? top + 0.004 : 0.004, onLedge ? 0.08 + random() * 0.1 : 0.2 + random() * 0.5] as const, size: 0.02 + random() * 0.05 };
      });
      const flat = new THREE.TetrahedronGeometry(1, 0);
      flat.scale(1, 0.06, 0.7);
      flat.rotateY(random() * 3);
      s.scatter(flat, sliver, points);
    }

    const energy = mood.energy;
    const phase = random() * 10;
    return s.finish({
      footprint: 0.7,
      update: (_dt, time) => {
        const flicker = Math.sin(time * 31 + phase) * Math.sin(time * 7.3 + phase * 2) > 0.72 - energy * 0.5 ? 0.35 : 1;
        tube.emissiveIntensity = mix(1.1, 1.1 * flicker, energy);
      },
    });
  },
});
