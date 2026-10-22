import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const sheet = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d')! };
};
const textureOf = (canvas: HTMLCanvasElement) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const EN = ['KID GAVIN', 'SAILOR MACK', 'TOMMY BELL', 'IRON JOE REESE', 'BIG CHARLIE', 'YOUNG FINN', 'LEFTY DOYLE', 'AL "THE HAMMER"'];
const ES = ['KID AZÚCAR', 'EL TORO RUIZ', 'CHICO VEGA', 'PUPI MORALES', 'EL GATO LEÓN', 'NIÑO PÉREZ', 'MANOS DE PIEDRA', 'EL ZURDO'];

const fighter = (c: Ctx, x: number, y: number, r: number, skin: string, glove: string, flip: number) => {
  c.fillStyle = skin;
  c.beginPath(); c.ellipse(x, y + r * 1.9, r * 1.25, r * 1.5, 0, Math.PI, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x, y, r * 0.62, 0, 7); c.fill();
  c.fillStyle = glove;
  c.beginPath(); c.ellipse(x + flip * r * 0.95, y + r * 0.55, r * 0.5, r * 0.58, 0, 0, 7); c.fill();
  c.beginPath(); c.ellipse(x - flip * r * 0.55, y + r * 1.0, r * 0.5, r * 0.56, 0, 0, 7); c.fill();
};

export default defineThing({
  questions: {
    era: choice('What era are the posters from?', {
      twenties: '1920s letterpress broadsides: cream paper, black and red slab type, crowded with small print.',
      fifties: '1950s golden age: yellow stock, two fighters facing off in round portraits, red and black ink.',
      seventies: '1970s: hot pink, orange and turquoise, fat rounded type and starbursts.',
      nineties: '1990s pay-per-view gloss: black backgrounds, gold lettering, looming figures.',
    }),
    language: choice('What language are they printed in?', {
      english: 'English: BOXING, rounds, Friday night at the arena.',
      spanish: 'Spanish: BOXEO, asaltos, gran función.',
      mixed: 'Both, pasted over each other, a neighbourhood that speaks two languages.',
    }),
    bout: choice('What is the headline poster announcing?', {
      title: 'A world title fight, fifteen rounds, a belt on the line.',
      local: 'A local amateur card: six bouts of neighbourhood names.',
      cancelled: 'A big fight with CANCELLED stamped across it in red.',
      rematch: 'The rematch everyone demanded.',
      benefit: 'A black-bordered benefit night for a fighter who is gone.',
    }),
    layers: choice('How thickly is the wall papered?', {
      single: 'One poster, pasted square and alone.',
      row: 'A tidy row of three, put up by somebody careful.',
      layered: 'Dozens overlapping at all angles, years deep.',
      scraps: 'Mostly torn away: ragged scraps and paste ghosts with the brick showing through.',
    }),
    rule: choice('What rule is painted above?', {
      nospit: 'NO SPITTING · NO SWEARING · NO QUITTING',
      dues: 'DUES ARE DUE — PAY UP OR STAY OUT',
      train: 'TRAIN HARD · FIGHT EASY',
      sudar: 'AQUÍ SE VIENE A SUDAR',
      showup: 'RULE ONE: SHOW UP',
      ghost: 'A rule faded past reading, only the ghost of letters left.',
    }),
    photo: choice('What hangs in the frame?', {
      champion: 'A sepia portrait of a champion wearing his belt.',
      trainer: 'An old trainer with a towel on his shoulder beside a skinny kid.',
      team: 'A team photograph, two rows of young fighters.',
      missing: 'Nothing: the frame is gone, leaving a clean rectangle and a nail.',
    }),
    foot: choice('What is at the foot of the wall?', {
      paste: 'A paste bucket, a long brush and fresh rolled posters: someone is still putting them up.',
      scraps: 'A drift of torn paper strips that nobody swept.',
      chair: 'A folding chair with a newspaper left on the seat.',
      bare: 'Nothing but the floor.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 2.8, H = 2.5, D = 0.24, PX = 1024 / W, TH = Math.round(H * PX);
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const brickHue = mood.warmth > 0.5 ? '#9c4a35' : '#8a4a40';

    // ---- posters, drawn on their own layer so they can be torn ----
    const paperLayer = sheet(1024, TH);
    const pc = paperLayer.ctx;
    const scraps: string[] = [];
    const poster = (x: number, y: number, w: number, h: number, turn: number, headline: boolean) => {
      const es = a.language === 'spanish' || (a.language === 'mixed' && random() > 0.5);
      const names = es ? ES : EN;
      const one = pick(names); let two = pick(names); if (two === one) two = names[(names.indexOf(one) + 3) % names.length];
      const seventies = pick(['#ef5fa0', '#f58a2a', '#34b6b0', '#f2d43c']);
      const pal = { twenties: ['#e6dbbd', '#1d1a17', '#a5281d'], fifties: [pick(['#f0cf55', '#efe2b0', '#f0cf55']), '#1b1917', '#c0261b'], seventies: [seventies, '#1b1637', '#fff3c4'], nineties: ['#16161c', '#f1e9d0', '#d8a92e'] }[a.era];
      const [paper, ink, accent] = pal;
      const face = a.era === 'twenties' || a.era === 'fifties' ? 'serif' : 'sans-serif';
      scraps.push(paper);
      pc.save(); pc.translate(x, y); pc.rotate(turn);
      pc.shadowColor = 'rgba(0,0,0,0.45)'; pc.shadowBlur = 6; pc.shadowOffsetY = 2;
      pc.fillStyle = paper; pc.fillRect(-w / 2, -h / 2, w, h);
      pc.shadowColor = 'transparent';
      pc.beginPath(); pc.rect(-w / 2, -h / 2, w, h); pc.clip();
      pc.translate(-w / 2, -h / 2);
      const benefit = headline && a.bout === 'benefit';
      pc.strokeStyle = benefit ? '#0d0d0d' : ink; pc.lineWidth = benefit ? w * 0.07 : w * 0.012; pc.strokeRect(w * 0.035, w * 0.035, w * 0.93, h - w * 0.07);
      pc.textAlign = 'center'; pc.textBaseline = 'middle';
      const text = (t: string, yy: number, size: number, colour: string, max = 0.84) => { pc.fillStyle = colour; pc.font = `bold ${Math.round(size * h)}px ${face}`; pc.fillText(t, w / 2, yy * h, w * max); };
      if (a.era === 'seventies') { pc.fillStyle = accent; pc.beginPath(); for (let i = 0; i < 24; i++) { const t = i / 24 * 6.283, r = (i % 2 ? 0.3 : 0.45) * w; pc.lineTo(w / 2 + Math.cos(t) * r, h * 0.12 + Math.sin(t) * r * 0.42); } pc.fill(); }
      if (a.era === 'nineties') { const g = pc.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(160,30,25,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); pc.fillStyle = g; pc.fillRect(0, 0, w, h); }
      text(es ? 'BOXEO' : 'BOXING', 0.12, 0.15, a.era === 'seventies' ? ink : accent);
      const sub = !headline ? pick(es ? ['GRAN FUNCIÓN', 'SÁBADO 9 P.M.', 'ARENA DEL BARRIO', 'NOCHE DE CAMPEONES'] : ['FRIDAY NIGHT', 'AT THE ARENA', 'ALL-STAR CARD', 'SAT. 8.30 P.M.'])
        : { title: es ? 'CAMPEONATO MUNDIAL' : 'WORLD TITLE FIGHT', local: es ? 'NOCHE AMATEUR · 6 PELEAS' : 'LOCAL CARD · 6 BOUTS', cancelled: es ? 'CAMPEONATO MUNDIAL' : 'WORLD TITLE FIGHT', rematch: es ? 'LA REVANCHA' : 'THE REMATCH', benefit: es ? 'FUNCIÓN BENÉFICA' : 'BENEFIT NIGHT' }[a.bout];
      pc.fillStyle = a.era === 'nineties' ? accent : ink; pc.fillRect(w * 0.08, h * 0.205, w * 0.84, h * 0.062);
      text(sub, 0.238, 0.05, a.era === 'nineties' ? '#16161c' : paper, 0.78);
      if (headline && a.bout === 'local') {
        for (let i = 0; i < 6; i++) {
          const yy = 0.34 + i * 0.085; const p = pick(names), q = names[(names.indexOf(p) + 1 + i) % names.length];
          pc.font = `bold ${Math.round(h * 0.045)}px ${face}`; pc.fillStyle = ink; pc.textAlign = 'right'; pc.fillText(p, w * 0.44, yy * h, w * 0.36);
          pc.textAlign = 'left'; pc.fillText(q, w * 0.56, yy * h, w * 0.36); pc.textAlign = 'center'; pc.fillStyle = accent === paper ? ink : accent; pc.fillText('v', w / 2, yy * h);
          pc.fillStyle = ink; pc.fillRect(w * 0.1, (yy + 0.04) * h, w * 0.8, 1.5);
        }
      } else {
        let top = 0.3;
        if (a.era !== 'twenties') {
          const skin = a.era === 'nineties' ? '#3a2f2a' : a.era === 'seventies' ? ink : '#7c6a52';
          for (const side of [-1, 1]) {
            if (a.era === 'fifties') { pc.fillStyle = '#e9e1c8'; pc.beginPath(); pc.arc(w / 2 + side * w * 0.22, h * 0.41, w * 0.19, 0, 7); pc.fill(); pc.strokeStyle = ink; pc.lineWidth = 3; pc.stroke(); pc.save(); pc.clip(); }
            fighter(pc, w / 2 + side * w * 0.22, h * (a.era === 'nineties' ? 0.37 : 0.38), w * (a.era === 'nineties' ? 0.17 : 0.11), skin, a.era === 'nineties' ? '#a8231c' : a.era === 'seventies' ? accent : '#2a2420', -side);
            if (a.era === 'fifties') pc.restore();
          }
          if (a.era === 'nineties') { const g = pc.createLinearGradient(0, h * 0.4, 0, h * 0.62); g.addColorStop(0, 'rgba(22,22,28,0)'); g.addColorStop(1, 'rgba(22,22,28,1)'); pc.fillStyle = g; pc.fillRect(0, h * 0.4, w, h * 0.24); }
          top = 0.56;
        } else {
          pc.fillStyle = ink; for (let i = 0; i < 3; i++) pc.fillRect(w * 0.14, h * (0.3 + i * 0.022), w * (0.72 - i * 0.08), h * 0.008);
          top = 0.4;
        }
        text(one, top + 0.04, 0.095, ink);
        text(es ? 'contra' : 'vs.', top + 0.125, 0.05, a.era === 'seventies' ? accent : a.era === 'nineties' ? accent : accent);
        text(two, top + 0.21, 0.095, ink);
        if (headline && (a.bout === 'title' || a.bout === 'cancelled') && a.era === 'twenties') {
          pc.fillStyle = '#c79a2c'; pc.fillRect(w * 0.2, h * 0.715, w * 0.6, h * 0.035); pc.beginPath(); pc.ellipse(w / 2, h * 0.732, w * 0.11, h * 0.045, 0, 0, 7); pc.fill(); pc.strokeStyle = ink; pc.lineWidth = 2; pc.stroke();
        }
      }
      const rounds = headline ? { title: 15, local: 4, cancelled: 15, rematch: 12, benefit: 10 }[a.bout] : pick([6, 8, 10]);
      pc.fillStyle = a.era === 'seventies' ? ink : accent; pc.fillRect(w * 0.08, h * 0.855, w * 0.84, h * 0.085);
      text(`${rounds} ${es ? 'ASALTOS' : 'ROUNDS'}`, 0.9, 0.058, a.era === 'seventies' ? accent : a.era === 'nineties' ? '#16161c' : paper, 0.76);
      if (a.era === 'twenties' || a.era === 'fifties') { pc.fillStyle = ink; for (let i = 0; i < 2; i++) pc.fillRect(w * 0.16, h * (0.795 + i * 0.022), w * 0.68, h * 0.007); }
      if (headline && a.bout === 'cancelled') {
        pc.save(); pc.translate(w / 2, h * 0.5); pc.rotate(-0.42); pc.globalAlpha = 0.9; pc.fillStyle = '#d3231b'; pc.fillRect(-w * 0.72, -h * 0.075, w * 1.44, h * 0.15);
        pc.fillStyle = '#fbf3e0'; pc.font = `bold ${Math.round(h * 0.115)}px sans-serif`; pc.fillText(es ? 'CANCELADO' : 'CANCELLED', 0, h * 0.006, w * 1.05); pc.restore();
      }
      // age
      pc.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 3 + mood.wear * 10; i++) { pc.fillStyle = `rgba(110,80,40,${0.05 + random() * 0.1 * (0.5 + mood.wear)})`; pc.beginPath(); pc.ellipse(random() * w, random() * h, w * (0.1 + random() * 0.3), h * (0.05 + random() * 0.2), random() * 3, 0, 7); pc.fill(); }
      pc.restore();
    };
    const tear = (x: number, y: number, r: number) => {
      pc.save(); pc.globalCompositeOperation = 'destination-out'; pc.beginPath();
      const n = 11; for (let i = 0; i < n; i++) { const t = i / n * 6.283, rr = r * (0.45 + random() * 0.8); pc.lineTo(x + Math.cos(t) * rr * (0.7 + random() * 0.6), y + Math.sin(t) * rr); }
      pc.fill(); pc.restore();
    };

    const bandH = 0.46 * PX, areaTop = bandH + 26, areaH = TH - areaTop - 30;
    const frameX = 2.22 * PX, frameY = areaTop + 0.42 * PX;      // canvas coordinates of the frame centre
    const hw = 0.82 * PX, hh = 1.18 * PX;                         // headline poster
    const ghosts: [number, number, number, number, number][] = [];
    const hx = a.layers === 'single' ? 1.02 * PX : 1.05 * PX, hy = areaTop + areaH * 0.5;
    if (a.layers === 'row') {
      for (const [i, x] of [0.5, 2.25].entries()) poster(x * PX + (i ? -0.02 : 0) * PX, areaTop + areaH * (i ? 0.72 : 0.5), 0.6 * PX, 0.86 * PX, (random() - 0.5) * 0.03, false);
    } else if (a.layers !== 'single') {
      const count = a.layers === 'layered' ? 14 + Math.floor(mood.density * 8) : 11;
      for (let i = 0; i < count; i++) {
        const w = (0.42 + random() * 0.3) * PX, h = w * (1.35 + random() * 0.2);
        const x = (0.2 + random() * 2.4) * PX, y = areaTop + h * 0.35 + random() * (areaH - h * 0.6);
        if (Math.abs(x - frameX) < 0.4 * PX && Math.abs(y - frameY) < 0.5 * PX && a.photo !== 'missing') continue;
        ghosts.push([x, y, w, h, (random() - 0.5) * 0.2]);
        poster(x, y, w, h, (random() - 0.5) * (a.layers === 'layered' ? 0.28 : 0.16), false);
        if (random() < 0.5 + mood.wear * 0.4) tear(x + (random() - 0.5) * w, y + (random() - 0.5) * h, w * (0.15 + random() * 0.25));
      }
    }
    poster(hx, hy, hw, hh, (random() - 0.5) * (a.layers === 'row' || a.layers === 'single' ? 0.02 : 0.1), true);
    if (a.layers === 'scraps') {
      for (let i = 0; i < 30; i++) tear(random() * 1024, areaTop + random() * areaH, (0.12 + random() * 0.26) * PX);
      for (let i = 0; i < 5; i++) tear(hx + (random() - 0.5) * hw * 1.1, hy + (random() > 0.5 ? 1 : -1) * hh * (0.3 + random() * 0.25), 0.2 * PX);
    } else {
      const rips = Math.floor((a.layers === 'layered' ? 5 : 1) + mood.wear * 7);
      for (let i = 0; i < rips; i++) { const side = random() > 0.5 ? 1 : -1; tear(hx + side * hw * (0.42 + random() * 0.15), hy + (random() - 0.5) * hh * 1.1, (0.05 + random() * 0.1) * PX); }
      for (let i = 0; i < rips; i++) tear(random() * 1024, TH - random() * 0.5 * PX, (0.06 + random() * 0.12) * PX);
    }

    // ---- the wall face ----
    const wall = sheet(1024, TH);
    const c = wall.ctx;
    c.fillStyle = '#5a4f47'; c.fillRect(0, 0, 1024, TH);
    const bh = 0.076 * PX, bw = 0.225 * PX;
    for (let row = 0; row * bh < TH; row++) for (let col = -1; col * bw < 1024; col++) {
      const colour = new THREE.Color(brickHue).offsetHSL((random() - 0.5) * 0.02, (random() - 0.5) * 0.1, (random() - 0.5) * 0.12);
      if (random() < 0.06) colour.lerp(new THREE.Color('#3a2f2c'), 0.6);
      c.fillStyle = `#${colour.getHexString()}`; c.fillRect(col * bw + (row % 2) * bw / 2 + 2, row * bh + 2, bw - 4, bh - 4);
    }
    // old whitewash on the lower courses and soot above
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(225,215,195,${0.03 + random() * 0.06})`; c.beginPath(); c.ellipse(random() * 1024, TH - random() * TH * 0.5, 40 + random() * 120, 20 + random() * 60, 0, 0, 7); c.fill(); }
    for (let i = 0; i < 30 * (0.3 + mood.wear); i++) { c.fillStyle = `rgba(20,16,14,${0.05 + random() * 0.08})`; c.beginPath(); c.ellipse(random() * 1024, random() * TH, 30 + random() * 120, 30 + random() * 90, 0, 0, 7); c.fill(); }
    // the painted rule
    const ruleText = { nospit: ['NO SPITTING · NO SWEARING', 'NO QUITTING'], dues: ['DUES ARE DUE', 'PAY UP OR STAY OUT'], train: ['TRAIN HARD', 'FIGHT EASY'], sudar: ['AQUÍ SE VIENE', 'A SUDAR'], showup: ['RULE ONE:', 'SHOW UP'], ghost: ['NO ADMITTANCE', 'WITHOUT YOUR DUES'] }[a.rule];
    const ghostRule = a.rule === 'ghost';
    const bandCol = mood.cheer > 0.6 ? '#e7dcb8' : mood.cheer > 0.3 ? '#1f4a43' : '#1c1b1b', letter = mood.cheer > 0.6 ? '#9d231a' : '#efe6c8';
    c.globalAlpha = ghostRule ? 0.3 : mix(0.95, 0.78, mood.wear); c.fillStyle = bandCol; c.fillRect(34, 22, 956, bandH - 26);
    c.strokeStyle = letter; c.lineWidth = 5; c.strokeRect(46, 34, 932, bandH - 50);
    c.fillStyle = letter; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.globalAlpha = ghostRule ? 0.28 : 1;
    c.font = `bold ${Math.round(bandH * 0.27)}px serif`; c.fillText(ruleText[0], 512, 22 + (bandH - 26) * 0.33, 880);
    c.font = `bold ${Math.round(bandH * 0.36)}px serif`; c.fillText(ruleText[1], 512, 22 + (bandH - 26) * 0.7, 880);
    c.globalAlpha = 1;
    // flaking: bricks show back through the paint
    for (let i = 0; i < (ghostRule ? 160 : 20 + mood.wear * 160); i++) { c.fillStyle = `#${new THREE.Color(brickHue).offsetHSL(0, 0, (random() - 0.5) * 0.1).getHexString()}`; c.fillRect(34 + random() * 950, 22 + random() * (bandH - 30), 4 + random() * 16, 3 + random() * 9); }
    // paste ghosts where older posters were
    for (const [x, y, w, h, turn] of ghosts) { c.save(); c.translate(x + 10, y - 8); c.rotate(turn); c.fillStyle = 'rgba(226,214,186,0.3)'; c.fillRect(-w / 2, -h / 2, w, h); c.restore(); }
    if (a.photo === 'missing') { c.fillStyle = 'rgba(235,220,190,0.28)'; c.fillRect(frameX - 0.23 * PX, frameY - 0.28 * PX, 0.46 * PX, 0.56 * PX); }
    c.drawImage(paperLayer.canvas, 0, 0);

    const brick = s.material(brickHue, { roughness: 0.95 });
    const mortar = s.material('#6a5f57', { roughness: 1 });
    s.box([W, H, D], [0, H / 2, 0], brick);
    s.mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: textureOf(wall.canvas), roughness: 0.92 }), [0, H / 2, D / 2 + 0.002]);
    s.box([W + 0.06, 0.14, D + 0.08], [0, 0.07, 0], mortar);
    // a broken, stepped top: this is a fragment of a bigger wall
    let run = -W / 2;
    while (run < W / 2 - 0.1) {
      const len = Math.min(0.225 * (1 + Math.floor(random() * 4)), W / 2 - run), courses = Math.floor(random() * 3.4);
      for (let k = 0; k < courses; k++) { const l = len - k * 0.11; if (l > 0.1) s.box([l - 0.01, 0.07, D], [run + l / 2 + (k % 2) * 0.05, H + 0.038 + k * 0.076, 0], brick); }
      run += len;
    }
    for (const side of [-1, 1]) for (let k = 0; k < 5; k++) if (random() > 0.45) s.box([0.11, 0.07, D], [side * (W / 2 + 0.05), 0.3 + k * 0.152 * 3 + random() * 0.1, 0], brick);

    // the framed photograph
    const fx = 2.22 - W / 2, fy = H - frameY / PX;
    if (a.photo === 'missing') {
      s.rod([fx, fy + 0.22, D / 2], [fx, fy + 0.235, D / 2 + 0.04], 0.006, s.material('#55595c', { metalness: 0.7 }));
    } else {
      const photo = sheet(256, 320); const p = photo.ctx;
      p.fillStyle = '#c9b48c'; p.fillRect(0, 0, 256, 320);
      const g = p.createRadialGradient(128, 140, 30, 128, 160, 220); g.addColorStop(0, 'rgba(240,225,190,0.9)'); g.addColorStop(1, 'rgba(90,65,40,0.9)'); p.fillStyle = g; p.fillRect(0, 0, 256, 320);
      if (a.photo === 'champion') {
        fighter(p, 128, 96, 62, '#5b4630', '#2c2118', 1);
        p.fillStyle = '#e2c55a'; p.fillRect(48, 232, 160, 28); p.beginPath(); p.ellipse(128, 246, 34, 26, 0, 0, 7); p.fill(); p.strokeStyle = '#5b4630'; p.lineWidth = 3; p.stroke();
      } else if (a.photo === 'trainer') {
        p.fillStyle = '#4e3d2b'; p.beginPath(); p.arc(88, 92, 34, 0, 7); p.fill(); p.fillRect(40, 130, 100, 190);
        p.fillStyle = '#efe6cf'; p.fillRect(40, 130, 34, 80); p.fillStyle = '#2a211a'; p.fillRect(56, 60, 66, 14);
        fighter(p, 184, 150, 34, '#6b5438', '#2c2118', -1);
      } else {
        for (let row = 0; row < 2; row++) for (let i = 0; i < 4 + row; i++) { const x = 128 + (i - (3 + row) / 2) * 50, y = 110 + row * 80; p.fillStyle = row ? '#5b4630' : '#4a3927'; p.beginPath(); p.arc(x, y, 19, 0, 7); p.fill(); p.fillRect(x - 22, y + 20, 44, 110); p.fillStyle = '#e9dfc4'; p.fillRect(x - 22, y + 70, 44, 24); }
      }
      p.strokeStyle = '#f0e7cf'; p.lineWidth = 22; p.strokeRect(0, 0, 256, 320);
      const frame = s.material(mood.cheer > 0.5 ? '#b08d3c' : '#2e2119', { metalness: mood.cheer > 0.5 ? 0.6 : 0.1, roughness: 0.45 });
      const tilt = (random() - 0.5) * mix(0.02, 0.2, mood.wear);
      const group = new THREE.Group(); group.position.set(fx, fy, D / 2 + 0.03); group.rotation.z = tilt; s.root.add(group);
      const put = (mesh: THREE.Mesh) => { mesh.removeFromParent(); group.add(mesh); return mesh; };
      put(s.box([0.5, 0.6, 0.04], [0, 0, 0], frame));
      put(s.mesh(new THREE.PlaneGeometry(0.42, 0.52), new THREE.MeshStandardMaterial({ map: textureOf(photo.canvas), roughness: 0.35 }), [0, 0, 0.022]));
      for (const side of [-1, 1]) { put(s.box([0.03, 0.6, 0.06], [side * 0.25, 0, 0.005], frame)); put(s.box([0.53, 0.03, 0.06], [0, side * 0.3, 0.005], frame)); }
    }

    // a lamp over the rule, and a conduit
    const iron = s.material('#2f3336', { metalness: 0.6, roughness: 0.5 });
    const lx = 2.22 - W / 2 + (random() - 0.5) * 0.1;
    s.tube([[lx, H - 0.03, D / 2], [lx, H + 0.16, D / 2 + 0.08], [lx, H + 0.2, D / 2 + 0.28], [lx, H + 0.1, D / 2 + 0.4]], 0.014, iron);
    s.lathe([[0.02, 0.09], [0.05, 0.07], [0.15, 0], [0.155, -0.008]], s.material('#2c5d4c', { side: THREE.DoubleSide, roughness: 0.4 }), [lx, H + 0.02, D / 2 + 0.41]).rotation.x = 0.35;
    const glow = Math.abs(mood.daylight - 0.5) * 2;
    s.ball([0.035, 0.045, 0.035], [lx, H + 0.02, D / 2 + 0.4], new THREE.MeshStandardMaterial({ color: '#fff1c2', emissive: '#ffd98a', emissiveIntensity: mix(0.25, 2.2, glow) }), 10);
    s.rod([-W / 2 + 0.12, 0.14, D / 2 + 0.02], [-W / 2 + 0.12, H - 0.5 * random(), D / 2 + 0.02], 0.016, iron);

    // peeling flaps standing off the wall
    const flaps = Math.round(mix(1, 7, mood.wear) * (a.layers === 'single' ? 0.4 : 1));
    for (let i = 0; i < flaps; i++) {
      const fw = 0.1 + random() * 0.16, fh = 0.1 + random() * 0.2;
      const flap = s.mesh(new THREE.PlaneGeometry(fw, fh, 1, 4), new THREE.MeshStandardMaterial({ color: pick(scraps), roughness: 0.9, side: THREE.DoubleSide }), [-W / 2 + 0.25 + random() * (W - 1.1), 0.35 + random() * (H - 1.2), D / 2 + 0.01]);
      const pos = flap.geometry.getAttribute('position');
      for (let k = 0; k < pos.count; k++) { const t = 0.5 - pos.getY(k) / fh; pos.setZ(k, t * t * (0.05 + random() * 0.02)); }
      flap.geometry.computeVertexNormals(); flap.rotation.z = (random() - 0.5) * 0.5;
    }

    // what is at the foot
    if (a.foot === 'paste') {
      const bx = 0.75 + random() * 0.3, bz = D / 2 + 0.34;
      s.lathe([[0.001, 0], [0.13, 0], [0.16, 0.3], [0.165, 0.3], [0.15, 0.31]], s.material('#8a9196', { metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide }), [bx, 0, bz]);
      s.cylinder(0.15, 0.15, 0.01, [bx, 0.25, bz], s.material('#e8e1cc', { roughness: 0.3 }), 20);
      s.rod([bx + 0.05, 0.22, bz], [bx - 0.5, 1.25, D / 2 + 0.03], 0.016, s.material('#8a6a44'));
      s.box([0.22, 0.09, 0.05], [bx - 0.52, 1.3, D / 2 + 0.05], s.material('#3a2c22')).rotation.z = 0.45;
      for (let i = 0; i < 3; i++) { const roll = s.cylinder(0.035, 0.035, 0.75, [bx - 0.5 - i * 0.09, 0.036 + (i === 2 ? 0.06 : 0), bz + 0.1 + (i === 2 ? -0.02 : i * 0.02)], s.material(pick(scraps)), 12); roll.rotation.z = Math.PI / 2; roll.rotation.y = (random() - 0.5) * 0.5; }
    } else if (a.foot === 'scraps') {
      const points = Array.from({ length: 46 }, () => ({ at: [(random() - 0.5) * (W - 0.3), 0.004 + random() * 0.03, D / 2 + 0.06 + random() * random() * 0.7] as [number, number, number], size: 0.5 + random() * 0.9, color: `#${new THREE.Color(pick(scraps)).lerp(new THREE.Color('#e6dcc0'), 0.35 + random() * 0.5).getHexString()}` }));
      const drift = s.scatter(new THREE.BoxGeometry(0.13, 0.004, 0.045), new THREE.MeshStandardMaterial({ roughness: 0.95 }), points);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      points.forEach((point, i) => { e.set((random() - 0.5) * 0.5, random() * 6.28, (random() - 0.5) * 0.5); q.setFromEuler(e); m.compose(new THREE.Vector3(...point.at), q, new THREE.Vector3(point.size, 1, point.size)); drift.setMatrixAt(i, m); });
      drift.instanceMatrix.needsUpdate = true;
    } else if (a.foot === 'chair') {
      const cx = 0.8 + random() * 0.3, cz = D / 2 + 0.5, turn = -0.5 + random() * 0.4;
      const chair = new THREE.Group(); chair.position.set(cx, 0, cz); chair.rotation.y = turn; s.root.add(chair);
      const put = (mesh: THREE.Mesh) => { mesh.removeFromParent(); chair.add(mesh); return mesh; };
      const tube = s.material('#7b8388', { metalness: 0.7, roughness: 0.4 }), seat = s.material('#7a2d24');
      for (const side of [-1, 1]) { put(s.rod([side * 0.2, 0, 0.2], [side * 0.2, 0.86, -0.22], 0.012, tube)); put(s.rod([side * 0.2, 0, -0.22], [side * 0.2, 0.46, 0.2], 0.012, tube)); }
      put(s.box([0.42, 0.03, 0.4], [0, 0.46, 0], seat)); put(s.box([0.42, 0.2, 0.025], [0, 0.76, -0.19], seat)).rotation.x = -0.2;
      const paper = put(s.label('SPORTS', 0.3, 0.2, [0.02, 0.482, 0.02], '#2a2622', '#ded7c2')); paper.rotation.x = -Math.PI / 2; paper.rotation.z = 0.3;
    }

    return s.finish();
  },
});
