import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const STORES = {
  department: { text: "HARMON'S", font: "italic bold {s}px Georgia, 'Times New Roman', serif", track: 0.02 },
  discount: { text: 'VALUMART', font: 'bold {s}px Impact, Arial Black, sans-serif', track: 0.04 },
  catalog: { text: 'bellwether', font: "bold {s}px Georgia, 'Times New Roman', serif", track: 0.01 },
  mercantile: { text: 'MERCANTILE', font: 'bold {s}px Arial, Helvetica, sans-serif', track: 0.22 },
  luxury: { text: 'Ashby & Lowe', font: "italic {s}px Georgia, 'Times New Roman', serif", track: 0.03 },
} as const;
const ERA = {
  sixties: { wall: '#e9e6dc', dark: '#cfd6d2', trim: '#6fb7b2' },
  seventies: { wall: '#a79c8a', dark: '#857a69', trim: '#5d4a3a' },
  eighties: { wall: '#c2a07c', dark: '#7b4c38', trim: '#2f8f95' },
  nineties: { wall: '#ddcdb0', dark: '#c6b393', trim: '#2f6b55' },
} as const;

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    era: choice('What era and material is the facade?', {
      sixties: 'Early 1960s white painted block with a slim flat canopy and breeze-block pattern, optimistic and modern.',
      seventies: 'Brutal 1970s ribbed brown-grey concrete with a heavy overhanging top, a windowless fortress.',
      eighties: 'Tan 1980s brick with a dark brick band and a teal metal stripe.',
      nineties: 'Beige 1990s stucco with a fake pediment and green trim, a late refit.',
    }),
    store: choice('What kind of anchor store left its name behind?', {
      department: "A family department store in elegant slanted serif letters: HARMON'S.",
      discount: 'A discount big-box in fat block capitals: VALUMART.',
      catalog: 'A catalogue store in friendly lowercase: bellwether.',
      mercantile: 'An old dry-goods chain in widely spaced capitals: MERCANTILE.',
      luxury: 'An upscale store in thin italic script: Ashby & Lowe.',
    }),
    scar: choice('How does the labelscar show?', {
      pale: 'Clean pale letters on a wall darkened by decades of grime.',
      shadow: 'Dark protected letters on a sun-bleached wall.',
      holes: 'Almost no ghost: just rows of capped bolt holes weeping rust.',
      remnant: 'A pale ghost with a few real letters still hanging on.',
    }),
    entry: choice('What is at the foot of the wall?', {
      blank: 'Nothing: a blank windowless wall down to the sidewalk.',
      doors: 'A sealed customer entrance, glass doors boarded with plywood.',
      loading: 'A roll-up steel service door with yellow bollards.',
      display: 'Display windows papered over from the inside.',
    }),
    after: choice('What has happened to it since the store left?', {
      nothing: 'Nothing at all. It just waits.',
      graffiti: 'Tags and scrawl along the bottom.',
      lease: 'A huge AVAILABLE banner from a property company.',
      seasonal: 'A temporary costume-shop banner hung half over the scar.',
      demolition: 'Orange demolition marks and a safety fence panel.',
    }),
    width: score('How much of the facade is this?', ['A narrow slab just wider than the name', 'A full storefront', 'A long blank wall with the name lost in it']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const era = ERA[a.era];
    const store = STORES[a.store];
    const W = mix(10, 19, a.width), H = a.era === 'seventies' ? 8 : 7.2, D = 0.9;
    const wear = mood.wear;
    const PX = 80; // pixels per metre
    const cw = Math.round(W * PX), ch = Math.round(H * PX);
    const signY = H * 0.7, letterH = 1.25;
    const signW = Math.min(W * 0.8, 8.2);

    // Lay the name out once so the ghost, bolt holes and surviving letters agree.
    const fontPx = Math.round(letterH * PX * (a.store === 'catalog' || a.store === 'luxury' ? 1.15 : 1));
    const fontSpec = store.font.replace('{s}', String(fontPx));
    const probe = document.createElement('canvas').getContext('2d')!;
    probe.font = fontSpec;
    const chars = [...store.text];
    const widths = chars.map((c) => probe.measureText(c).width + fontPx * store.track);
    const natural = widths.reduce((sum, v) => sum + v, 0);
    const squeeze = Math.min(1, signW * PX / natural);
    let cursor = cw / 2 - natural * squeeze / 2;
    const glyphs = chars.map((c, i) => {
      const x = cursor;
      cursor += widths[i] * squeeze;
      return { c, x, w: widths[i] * squeeze };
    });
    const baseY = ch - (signY - letterH * 0.42) * PX; // canvas y of the baseline
    const keep = glyphs.map((g) => a.scar === 'remnant' && g.c !== ' ' && random() < mix(0.5, 0.2, wear));
    if (a.scar === 'remnant' && !keep.some(Boolean)) keep[Math.floor(random() * keep.length)] = true;
    const drawGlyphs = (ctx: CanvasRenderingContext2D, which: (i: number) => boolean) => {
      ctx.font = fontSpec;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      glyphs.forEach((g, i) => {
        if (!which(i)) return;
        ctx.save();
        ctx.translate(g.x, baseY);
        ctx.scale(squeeze, 1);
        ctx.fillText(g.c, 0, 0);
        ctx.restore();
      });
    };

    const dirt = a.scar === 'pale' || a.scar === 'remnant' ? mix(0.38, 0.62, wear) : mix(0.05, 0.3, wear);
    const front = paint(cw, ch, (ctx, w, h) => {
      ctx.fillStyle = era.wall;
      ctx.fillRect(0, 0, w, h);
      if (a.era === 'eighties') {
        // Brick courses with a darker band.
        for (let y = 0; y < h; y += 6) {
          const band = y > h * 0.5 && y < h * 0.56;
          for (let x = (y / 6) % 2 ? -9 : 0; x < w; x += 18) {
            const v = random();
            ctx.fillStyle = band ? `rgba(90,50,35,${0.75 + v * 0.2})` : `rgba(${130 + v * 40},${90 + v * 30},${60 + v * 20},${0.12 + v * 0.22})`;
            ctx.fillRect(x, y, 17, 5);
          }
        }
      } else if (a.era === 'seventies') {
        // Vertical ribs, light on one flank and shadowed on the other, with a smooth fascia band.
        for (let x = 0; x < w; x += 16) {
          ctx.fillStyle = 'rgba(40,32,24,0.3)'; ctx.fillRect(x, 0, 6, h);
          ctx.fillStyle = 'rgba(255,250,235,0.16)'; ctx.fillRect(x + 6, 0, 4, h);
        }
        ctx.fillStyle = era.wall;
        ctx.fillRect(0, h - (signY + 1.5) * PX, w, 3 * PX);
        ctx.fillStyle = 'rgba(40,32,24,0.35)';
        ctx.fillRect(0, h - (signY + 1.5) * PX, w, 4); ctx.fillRect(0, h - (signY - 1.5) * PX, w, 4);
        for (let x = 0; x < w; x += 2.4 * PX) ctx.fillRect(x, h - (signY + 1.5) * PX, 3, 3 * PX);
      } else if (a.era === 'sixties') {
        // Painted block joints and a breeze-block frieze.
        ctx.strokeStyle = 'rgba(90,100,95,0.18)';
        ctx.lineWidth = 1.5;
        for (let y = 0; y < h; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 16 : 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke(); }
        ctx.fillStyle = era.dark;
        ctx.fillRect(0, 10, w, 76);
        for (let x = 6; x < w; x += 38) {
          for (const y of [14, 52]) {
            ctx.fillStyle = 'rgba(40,60,60,0.55)';
            ctx.beginPath(); ctx.arc(x + 16, y + 15, 12, 0, 7); ctx.fill();
            ctx.fillStyle = era.wall;
            ctx.fillRect(x + 14, y + 2, 4, 26); ctx.fillRect(x + 3, y + 13, 26, 4);
          }
        }
      } else {
        // Stucco panels with reveal joints and a painted accent line.
        ctx.strokeStyle = 'rgba(110,95,70,0.4)';
        ctx.lineWidth = 3;
        for (let x = 0; x < w; x += 3 * PX) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (const y of [h * 0.18, h * 0.58]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        ctx.fillStyle = era.trim;
        ctx.fillRect(0, h * 0.6, w, 14);
        for (let k = 0; k < 2600; k++) { ctx.fillStyle = `rgba(120,100,70,${random() * 0.12})`; ctx.fillRect(random() * w, random() * h, 3, 3); }
      }

      // Decades of grime: streaks from the parapet, darker at the base.
      for (let k = 0; k < 150; k++) {
        const x = random() * w, len = h * mix(0.1, 0.8, random() * random());
        const g = ctx.createLinearGradient(0, 0, 0, len);
        g.addColorStop(0, `rgba(50,42,32,${dirt * mix(0.3, 0.9, random())})`);
        g.addColorStop(1, 'rgba(50,42,32,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, mix(4, 40, random()), len);
      }
      const veil = ctx.createLinearGradient(0, 0, 0, h);
      veil.addColorStop(0, `rgba(60,50,38,${dirt * 0.5})`);
      veil.addColorStop(0.5, `rgba(60,50,38,${dirt * 0.25})`);
      veil.addColorStop(1, `rgba(45,40,30,${dirt * 0.8})`);
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, w, h);
      if (a.scar === 'shadow') { ctx.fillStyle = 'rgba(255,250,240,0.22)'; ctx.fillRect(0, 0, w, h); }

      // The labelscar itself.
      if (a.scar !== 'holes') {
        ctx.save();
        ctx.shadowColor = a.scar === 'shadow' ? 'rgba(40,30,20,0.5)' : 'rgba(40,30,20,0.35)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = a.scar === 'shadow'
          ? `rgba(70,58,44,${mix(0.6, 0.42, wear)})`
          : `rgba(255,252,242,${mix(0.85, 0.6, wear)})`;
        drawGlyphs(ctx, () => true);
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(255,252,242,0.1)';
        drawGlyphs(ctx, () => true);
      }
      // Capped bolt holes with rust weeping below each.
      const strong = a.scar === 'holes' ? 1 : 0.55;
      for (const g of glyphs) {
        if (g.c === ' ') continue;
        for (const [fx, fy] of [[0.25, 0.12], [0.75, 0.12], [0.25, 0.85], [0.75, 0.85], [0.5, 0.5]] as const) {
          const x = g.x + g.w * fx, y = baseY - letterH * PX * (1 - fy) * 0.8;
          const len = mix(20, 150, random()) * mix(0.5, 1.3, wear) * strong;
          const rust = ctx.createLinearGradient(0, y, 0, y + len);
          rust.addColorStop(0, `rgba(140,70,30,${0.75 * strong})`);
          rust.addColorStop(1, 'rgba(140,70,30,0)');
          ctx.fillStyle = rust;
          ctx.fillRect(x - 2.5, y, 5, len);
          ctx.fillStyle = a.scar === 'holes' ? '#3a2a1e' : 'rgba(58,42,30,0.8)';
          ctx.beginPath(); ctx.arc(x, y, a.scar === 'holes' ? 5 : 3.5, 0, 7); ctx.fill();
        }
      }
      // A raceway line where the wiring ran.
      ctx.fillStyle = 'rgba(60,45,30,0.25)';
      ctx.fillRect(glyphs[0].x - 10, baseY + 10, cursor - glyphs[0].x + 20, 3);

      if (a.after === 'graffiti') {
        const inks = ['#1d1d1d', '#c2274a', '#2a66c7', '#e8e8e8', '#3d9a55'];
        const tags = Math.round(mix(4, 12, wear));
        for (let t = 0; t < tags; t++) {
          ctx.strokeStyle = inks[Math.floor(random() * inks.length)];
          ctx.lineWidth = mix(4, 10, random());
          ctx.lineCap = 'round';
          let x = random() * (w - 200), y = h - mix(60, 200, random());
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let k = 0; k < 9; k++) { x += mix(8, 34, random()); y += (random() - 0.5) * 90; y = Math.min(h - 20, Math.max(h - 250, y)); ctx.lineTo(x, y); }
          ctx.stroke();
        }
        ctx.fillStyle = '#1d1d1d';
        ctx.font = `bold 60px 'Comic Sans MS', 'Marker Felt', cursive`;
        ctx.textAlign = 'left';
        ctx.fillText(['WE MET HERE', 'RIP FOOD COURT', 'GONE', 'REMEMBER?'][Math.floor(random() * 4)], w * (random() < 0.5 ? 0.04 : 0.72), h - 270, w * 0.24);
      }
      if (a.after === 'demolition') {
        ctx.strokeStyle = '#ff5a1f'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        for (let t = 0; t < 4; t++) {
          const x = w * (0.1 + t * 0.25 + random() * 0.05), y = h - 170;
          ctx.beginPath(); ctx.moveTo(x - 45, y - 45); ctx.lineTo(x + 45, y + 45); ctx.moveTo(x + 45, y - 45); ctx.lineTo(x - 45, y + 45); ctx.stroke();
        }
        ctx.fillStyle = '#ff5a1f'; ctx.font = 'bold 64px Arial, sans-serif';
        ctx.fillText('DEMO', w * 0.42, h - 250);
      }
    });

    const wallMat = s.material(era.wall, { roughness: 0.95 });
    const darkMat = s.material(era.dark, { roughness: 0.9 });
    const trim = s.material(era.trim, { roughness: 0.5, metalness: 0.3 });
    const concrete = s.material('#b7b2a4', { roughness: 0.95 });
    const steel = s.material('#6c7175', { metalness: 0.5, roughness: 0.5 });
    const black = s.material('#1c1e20', { roughness: 0.8 });

    // The slab, with its painted face.
    s.box([W, H, D], [0, H / 2, -D / 2], wallMat);
    s.mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: front, roughness: 0.95 }), [0, H / 2, 0.006]);
    // Torn ends show the slab is a piece cut out of a longer building.
    for (const x of [-1, 1]) s.box([0.12, H, D + 0.04], [x * (W / 2 + 0.06), H / 2, -D / 2], darkMat);
    // Parapet coping and rooftop plant behind.
    s.box([W + 0.3, 0.14, D + 0.25], [0, H + 0.07, -D / 2], a.era === 'sixties' || a.era === 'nineties' ? trim : concrete);
    s.box([2.2, 1.0, 0.6], [W * 0.26, H + 0.5, -D + 0.25], steel);
    s.cylinder(0.25, 0.25, 0.2, [W * 0.26, H + 1.1, -D + 0.25], black, 12);

    // Surviving letters stand proud of the wall.
    if (a.scar === 'remnant') {
      const letters = paint(cw, ch, (ctx) => {
        ctx.fillStyle = a.era === 'sixties' || a.era === 'nineties' ? '#243a5e' : '#f1ece0';
        drawGlyphs(ctx, (i) => keep[i]);
      });
      const mat = new THREE.MeshStandardMaterial({ map: letters, alphaTest: 0.5, roughness: 0.5, side: THREE.DoubleSide });
      for (const z of [0.05, 0.08, 0.11]) s.mesh(new THREE.PlaneGeometry(W, H), mat, [0, H / 2, z]);
    }

    // Era silhouettes.
    if (a.era === 'seventies') {
      s.box([W + 0.2, 1.3, 0.7], [0, H - 0.65, 0.3], wallMat);
      s.box([W + 0.2, 0.1, 0.72], [0, H - 1.32, 0.3], darkMat);
      const fin = new THREE.BoxGeometry(0.22, 2.6, 0.3);
      s.scatter(fin, darkMat, Array.from({ length: Math.floor(W / 1.2) }, (_u, i) => ({ at: [-W / 2 + 0.6 + i * 1.2, 1.3, 0.15] as const, size: 1 })));
    } else if (a.era === 'sixties') {
      s.box([W + 0.4, 0.16, 2.3], [0, 3.25, 1.1], s.material('#f2f0e8'));
      s.box([W + 0.42, 0.06, 2.32], [0, 3.14, 1.1], trim);
      for (let x = -W / 2 + 0.5; x <= W / 2 - 0.4; x += (W - 1) / Math.max(2, Math.round(W / 3))) s.cylinder(0.05, 0.05, 3.2, [x, 1.6, 2.05], steel, 10);
    } else if (a.era === 'eighties') {
      s.box([W + 0.1, 0.5, 0.16], [0, H - 0.9, 0.07], trim);
      for (const x of [-1, 1]) s.box([0.7, H, 0.3], [x * (W / 2 - 0.35), H / 2, 0.14], darkMat);
    } else {
      const ped = new THREE.Shape();
      ped.moveTo(-3.4, 0); ped.lineTo(3.4, 0); ped.lineTo(0, 1.5); ped.lineTo(-3.4, 0);
      const pedGeo = new THREE.ExtrudeGeometry(ped, { depth: 0.5, bevelEnabled: false });
      s.mesh(pedGeo, wallMat, [0, H + 0.14, -0.3]);
      s.box([7.2, 0.14, 0.7], [0, H + 0.14, -0.05], trim);
      for (const x of [-1, 1]) {
        s.cylinder(0.32, 0.32, 3.4, [x * 2.9, 1.7, 0.5], wallMat, 18);
        s.box([0.9, 0.2, 0.9], [x * 2.9, 3.5, 0.5], trim);
      }
      s.box([6.9, 0.5, 1.1], [0, 3.85, 0.5], wallMat);
    }

    // Foot of the wall.
    const doorW = 4.4, doorH = 2.9;
    if (a.entry === 'doors') {
      s.box([doorW + 0.3, doorH + 0.2, 0.12], [0, doorH / 2 + 0.1, 0.06], steel);
      s.box([doorW, doorH, 0.06], [0, doorH / 2, 0.12], s.material('#27333a', { roughness: 0.2, metalness: 0.4 }));
      const ply = s.material('#b98f55', { roughness: 0.9 });
      const boards = 1 + Math.round(mix(0, 3, wear) + random());
      for (let i = 0; i < 4; i++) {
        const x = (i - 1.5) * (doorW / 4);
        s.box([0.04, doorH, 0.08], [x + doorW / 8, doorH / 2, 0.14], steel);
        if (i < boards) { const p = s.box([doorW / 4 - 0.08, 2.44, 0.03], [x, 1.26, 0.17], ply); p.rotation.z = (random() - 0.5) * 0.03; }
      }
      s.label('CLOSED', 0.8, 0.25, [doorW / 4 - doorW / 2 + doorW / 4, 1.7, 0.2], '#b3201f', '#f1eee4');
    } else if (a.entry === 'loading') {
      const shutter = paint(128, 128, (ctx, w, h) => {
        ctx.fillStyle = '#8d9396'; ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 8) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(0, y, w, 2); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(0, y + 3, w, 2); }
        ctx.fillStyle = `rgba(110,60,25,${wear * 0.5})`; for (let k = 0; k < 9; k++) ctx.fillRect(random() * w, random() * h, 6, 40);
      });
      s.box([3.6, 3.5, 0.12], [-W * 0.18, 1.75, 0.05], steel);
      s.mesh(new THREE.PlaneGeometry(3.3, 3.3), new THREE.MeshStandardMaterial({ map: shutter, roughness: 0.6, metalness: 0.3 }), [-W * 0.18, 1.65, 0.12]);
      const yellow = s.material('#e3b520');
      for (const x of [-2.2, 2.2]) { s.cylinder(0.09, 0.09, 1.1, [-W * 0.18 + x, 0.55, 0.9], yellow, 12); s.ball([0.09, 0.09, 0.09], [-W * 0.18 + x, 1.1, 0.9], yellow, 10); }
      s.box([0.9, 2.1, 0.08], [-W * 0.18 + 3.1, 1.05, 0.04], steel);
    } else if (a.entry === 'display') {
      const paper = paint(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#c7a877'; ctx.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 42) { ctx.fillStyle = `rgba(90,60,30,${0.12 + random() * 0.15})`; ctx.fillRect(x, 0, 3, h); ctx.fillStyle = `rgba(255,240,210,${random() * 0.2})`; ctx.fillRect(x + 3, 0, 39, h); }
      });
      const paperMat = new THREE.MeshStandardMaterial({ map: paper, roughness: 0.7 });
      const n = Math.max(2, Math.floor(W / 4.2));
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * (W / n);
        s.box([W / n - 0.6, 2.5, 0.1], [x, 1.55, 0.04], black);
        s.mesh(new THREE.PlaneGeometry(W / n - 0.8, 2.3), paperMat, [x, 1.55, 0.1]);
      }
    }

    // Afterlife dressing in three dimensions.
    if (a.after === 'lease' || a.after === 'seasonal') {
      const seasonal = a.after === 'seasonal';
      const bw = seasonal ? 4.8 : Math.min(W * 0.55, 6), bh = seasonal ? 1.5 : 1.5;
      const cloth = paint(768, Math.round(768 * bh / bw), (ctx, w, h) => {
        ctx.fillStyle = seasonal ? '#ef7a12' : '#f4f2ea'; ctx.fillRect(0, 0, w, h);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (seasonal) {
          ctx.fillStyle = '#1b1320'; ctx.font = `bold ${h * 0.5}px Impact, Arial Black, sans-serif`;
          ctx.fillText('COSTUME CITY', w / 2, h * 0.4, w * 0.9);
          ctx.font = `bold ${h * 0.2}px Arial, sans-serif`; ctx.fillText('OPEN THRU OCT 31', w / 2, h * 0.8);
        } else {
          ctx.fillStyle = '#b3201f'; ctx.fillRect(0, 0, w, h * 0.16);
          ctx.fillStyle = '#1c2f5c'; ctx.font = `bold ${h * 0.42}px Arial, sans-serif`;
          ctx.fillText('AVAILABLE', w / 2, h * 0.45, w * 0.9);
          ctx.font = `bold ${h * 0.2}px Arial, sans-serif`; ctx.fillText('120,000 SQ FT  555-0142', w / 2, h * 0.8, w * 0.9);
        }
      });
      const geo = new THREE.PlaneGeometry(bw, bh, 14, 3);
      const pos = geo.attributes.position;
      const droop = random() < wear * 0.8;
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k) / (bw / 2), y = pos.getY(k) / (bh / 2);
        pos.setZ(k, 0.04 + Math.sin(x * 6 + y * 2) * 0.03);
        if (droop && x > 0.2 && y > -0.5) pos.setY(k, pos.getY(k) - (x - 0.2) * (y + 0.5) * 1.1);
      }
      geo.computeVertexNormals();
      const banner = s.mesh(geo, new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.8, side: THREE.DoubleSide }),
        [seasonal ? signW * 0.5 - bw * 0.42 : W * 0.5 - bw * 0.5 - 0.6, seasonal ? signY - 0.15 : 4.3, 0.08]);
      banner.rotation.z = (random() - 0.5) * 0.05;
    }
    if (a.after === 'demolition') {
      const orange = s.material('#f2742a', { roughness: 0.7 });
      for (let i = 0; i < 3; i++) {
        const x = -W * 0.3 + i * 2.5, z = 2.2 + (random() - 0.5) * 0.3;
        for (const dx of [-1.15, 1.15]) s.rod([x + dx, 0, z], [x + dx, 1.9, z], 0.03, steel);
        for (const y of [0.25, 1.85]) s.rod([x - 1.15, y, z], [x + 1.15, y, z], 0.025, steel);
        const mesh = s.box([2.3, 1.6, 0.01], [x, 1.05, z], new THREE.MeshStandardMaterial({ color: '#f2742a', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
        mesh.castShadow = false;
        s.box([0.6, 0.12, 0.3], [x - 1.15, 0.06, z], orange);
      }
    }

    // Sidewalk, kerb and what grows in the joint.
    s.box([W + 0.4, 0.16, 3.0], [0, 0.0, 1.5], concrete).position.y = -0.0;
    s.box([W + 0.4, 0.18, 0.18], [0, 0.01, 3.05], s.material(a.entry === 'loading' ? '#e3b520' : '#a9a497', { roughness: 0.9 }));
    const weeds = Math.round(mix(2, 46, wear) * mix(0.6, 1.2, random()));
    const blade = new THREE.ConeGeometry(0.05, 1, 5);
    blade.translate(0, 0.5, 0);
    s.scatter(blade, s.material('#8fa05a', { roughness: 1 }), Array.from({ length: weeds }, () => {
      const atWall = random() < 0.65;
      return {
        at: [(random() - 0.5) * W, 0.08, atWall ? 0.05 + random() * 0.15 : 2.9 + random() * 0.2] as const,
        size: mix(0.2, 0.9, random() * random() + wear * 0.3),
        color: random() < 0.35 ? '#c2b56a' : '#8fa05a',
      };
    }));
    if (mood.density > 0.4) {
      // Something left on the sidewalk.
      const x = W * mix(0.2, 0.42, random()) * (random() < 0.5 ? -1 : 1);
      s.cylinder(0.3, 0.26, 0.85, [x, 0.5, 1.2], s.material('#5e6a5c', { roughness: 0.8 }), 14);
      s.cylinder(0.32, 0.32, 0.06, [x, 0.95, 1.2], black, 14);
    }

    return s.finish({ footprint: W / 2 });
  },
});
