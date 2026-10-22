import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { dir, fuse, globe, inkText, painted, placed, scribble, skin, spot, stain } from './form';
import { HEAD_UNIT, earParts, headShape, paintFace } from './head';

/** The sagittal section is painted in head units: z across (2.7 wide), y up (3.6 tall). */
const SPAN = { z: 1.35, top: 1.1, bottom: -2.5 } as const;
const NECK = { z: -0.12, top: -0.85, bottom: -2.2, r0: 0.43, r1: 0.47 } as const;

export default defineThing({
  questions: {
    cut: choice('How has the head been cut open?', {
      half: 'Sliced clean in half down the middle: one flat painted section from crown to neck.',
      quarter: 'One front quarter lifted out, so two cut faces meet at a right angle behind half a face.',
      layers: 'Sliced in half with the removable pieces taken out and set beside it: half a brain, the skull cap, an eye.',
    }),
    exposed: choice('What does the model set out to show?', {
      airway: 'The airway: nose, mouth and windpipe picked out in bright blue.',
      muscles: 'The muscles: the skin is gone from the face, leaving bands of red fibre and white tendon.',
      brain: 'The skull and brain, each lobe painted its own colour.',
      nerves: 'The nerves, branching in yellow across the face and through the section.',
    }),
    finish: choice('What state is the paintwork in?', {
      glossy: 'Glossy and new, straight from the supplier.',
      chipped: 'Chipped: white plaster shows through at the edges and nose.',
      lettered: 'Hand-lettered with numbers in little white discs, keyed to a lost chart.',
    }),
    expression: choice('What expression does the intact side wear?', {
      blank: 'Blank, eyes open, looking at nothing.',
      serene: 'Serene: eye closed, a faint smile.',
      startled: 'Startled: the eye wide, brow up, mouth open.',
    }),
    era: choice('When was it made?', {
      wax: 'Victorian wax: yellowed flesh and deep reds on an ebonised moulded base.',
      plaster: '1950s plaster: chalky pastel colours on a plain turned wooden base.',
      plastic: 'Modern plastic: bright primary colours on a white slab with a steel pin.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const shape = headShape({ gape: a.expression === 'startled' ? 0.85 : 0 });
    const quarter = a.cut === 'quarter', layers = a.cut === 'layers';
    const vivid = a.exposed;

    // Every colour passes through the era: wax yellows and deepens, plaster chalks, plastic stays loud.
    const era = (hex: string) => {
      const c = new THREE.Color(hex);
      if (a.era === 'wax') c.lerp(new THREE.Color('#b8862f'), 0.2).multiplyScalar(0.92);
      if (a.era === 'plaster') c.lerp(new THREE.Color('#e9e2d2'), 0.3);
      c.lerp(new THREE.Color('#8a8172'), mood.wear * 0.18);
      return `#${c.getHexString()}`;
    };
    const fleshTone = era(a.era === 'plastic' ? '#f0b594' : '#e8c3a0');
    const bone = era('#f1e4c2'), muscle = era('#c9544a'), deep = era('#6d2226');
    const blue = era(vivid === 'airway' ? '#2a9fe6' : '#a8cfe0'), yellow = era('#f0c62a');
    const brainTone = era('#e7b3a3');
    const lobes = vivid === 'brain' ? [era('#e77f86'), era('#f0c758'), era('#79bf7c'), era('#7c9fe0'), era('#c08ad6')] : [brainTone, brainTone, brainTone, era('#d9968a'), era('#ead9a8')];
    const lineInk = '#2a1c18';

    // The outline of the head down its middle and across at the ears, for the flat cut faces.
    const front: [number, number][] = [], back: [number, number][] = [], across: [number, number][] = [];
    for (let lat = 90; lat >= -90; lat -= 2) {
      const p = shape(dir(0, lat), 0, lat); front.push([p.z, p.y]);
      const q = shape(dir(180, lat), 180, lat); back.push([q.z, q.y]);
      const r = shape(dir(90, lat), 90, lat); across.push([r.x, r.y]);
    }

    const outer = skin(1024, 512, (ctx) => {
      ctx.fillStyle = fleshTone;
      ctx.fillRect(-180, -90, 360, 180);
      if (vivid === 'muscles') {
        ctx.fillStyle = muscle; ctx.fillRect(-180, -90, 360, 180);
        const fibre = era('#8e2f2c'), tendon = era('#f1e6cf');
        // Tendon cap over the crown, then fibres: brow, temples, cheeks, jaw and neck.
        ctx.fillStyle = tendon; ctx.fillRect(-180, 40, 360, 50);
        for (let lon = -180; lon < 180; lon += 3.2) scribble(ctx, [[lon + jitter(1), 40], [lon + jitter(2), 12 + (Math.abs(lon) > 60 ? -30 : 0)]], 0.9, fibre, 0.5, random);
        for (const side of [-1, 1]) {
          for (let k = 0; k < 14; k++) { const t = k / 14 * Math.PI; scribble(ctx, [[side * 88, -8], [side * (88 - 34 * Math.cos(t)), -8 + 44 * Math.sin(t)]], 0.8, fibre, 0.4, random); }
          ctx.strokeStyle = fibre; ctx.lineWidth = 0.8;
          for (let r = 9; r <= 15; r += 2) { ctx.beginPath(); ctx.ellipse(side * 24, -9, r, r * 0.72, 0, 0, Math.PI * 2); ctx.stroke(); }
          for (let k = 0; k < 9; k++) scribble(ctx, [[side * (36 + k * 3), -20], [side * (30 + k * 3.4), -58]], 1, fibre, 0.4, random);
          for (let k = 0; k < 6; k++) scribble(ctx, [[side * (34 + k * 2), -18 - k], [side * 14, -40 - k * 0.5]], 0.8, fibre, 0.4, random);
          ctx.fillStyle = tendon; ctx.beginPath(); ctx.ellipse(side * 48, -17, 9, 3, side * 0.25, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = fibre; ctx.lineWidth = 0.8;
        for (let r = 6; r <= 12; r += 2) { ctx.beginPath(); ctx.ellipse(0, -43.5, r * 1.5, r * 0.62, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = tendon; ctx.fillRect(-3.5, -30, 7, 26);
        for (let lon = -180; lon < 180; lon += 4) scribble(ctx, [[lon, -62], [lon + jitter(3), -90]], 0.9, fibre, 0.5, random);
      } else {
        for (const side of [-1, 1]) stain(ctx, side * 46, -30, 15, era('#e08a80'), a.era === 'wax' ? 0.5 : 0.3);
        stain(ctx, 0, -27, 7, era('#e08a80'), 0.3);
      }
      paintFace(ctx, {
        eyes: vivid === 'muscles' ? 'wide' : a.expression === 'serene' ? 'closed' : a.expression === 'startled' ? 'wide' : 'open',
        iris: era(a.era === 'plastic' ? '#2e7bd0' : '#5b7f8f'), line: lineInk, white: '#f7f3ea',
        brows: vivid === 'muscles' ? null : era('#5a4030'), lips: vivid === 'muscles' ? null : era('#b9514d'),
        mouth: a.expression === 'serene' ? 'smile' : a.expression === 'startled' ? 'open' : 'neutral',
      });
      if (vivid === 'nerves') {
        for (const side of [-1, 1]) {
          const root: [number, number] = [side * 78, -24];
          for (const end of [[40, 22], [22, 8], [30, -2], [14, -22], [34, -30], [12, -40], [16, -52], [44, -60], [60, 28], [70, -70]] as const) {
            const mid: [number, number] = [side * (end[0] * 0.5 + 39) + jitter(3), (end[1] - 24) / 2 + jitter(4)];
            scribble(ctx, [root, mid, [side * end[0], end[1]]], 1.3, yellow, 0.7, random);
            spot(ctx, side * end[0], end[1], 1.1, yellow);
          }
          spot(ctx, root[0], root[1], 2.6, yellow);
        }
      }
      if (a.finish === 'chipped') {
        spot(ctx, 0, -29, 4.2, '#f4f1ea');
        for (let i = 0; i < Math.round(mix(8, 26, mood.wear)); i++) spot(ctx, random() < 0.5 ? -jitter(8) - 6 : jitter(180), jitter(80), 1.2 + random() * 3.2, '#f4f1ea', 0.6 + random());
      }
      if (a.finish === 'lettered') {
        const marks: [number, number][] = [[-24, 6], [-52, -22], [-10, -18], [-30, -44], [-8, -58], [-70, 30], [-88, -30], [-40, 50], [-120, 20]];
        marks.forEach(([lon, lat], index) => { spot(ctx, lon, lat, 3.8, '#f8f5ec'); inkText(ctx, String(index + 1), lon, lat, 5.2, '#16151a', 0, 'bold serif'); });
      }
    });

    const label = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string, flip: number) => {
      ctx.fillStyle = '#f8f5ec'; ctx.beginPath(); ctx.arc(x, y, 0.075, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.scale(flip * 0.006, -0.006);
      ctx.font = 'bold 20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#16151a';
      ctx.fillText(text, 0, 1); ctx.restore();
    };
    const chips = (ctx: CanvasRenderingContext2D, edge: readonly (readonly [number, number])[]) => {
      if (a.finish !== 'chipped') return;
      ctx.fillStyle = '#f4f1ea';
      for (let i = 0; i < Math.round(mix(10, 30, mood.wear)); i++) {
        const [x, y] = edge[Math.floor(random() * edge.length)];
        ctx.beginPath(); ctx.ellipse(x * 0.97 + jitter(0.04), y * 0.97 + jitter(0.04), 0.03 + random() * 0.07, 0.02 + random() * 0.05, random() * 3, 0, Math.PI * 2); ctx.fill();
      }
    };
    const poly = (ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], fill: string | null, stroke: string | null = null, width = 0.03) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
    };
    const path = (ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], colour: string, width: number) => {
      ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineCap = ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length - 1; i++) ctx.quadraticCurveTo(points[i][0], points[i][1], (points[i][0] + points[i + 1][0]) / 2, (points[i][1] + points[i + 1][1]) / 2);
      ctx.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
      ctx.stroke();
    };

    // The sagittal section: what you see when a head is cut exactly in half.
    const sagittal = painted(768, 1024, (ctx, w, h) => {
      ctx.setTransform(-w / (SPAN.z * 2), 0, 0, -h / (SPAN.top - SPAN.bottom), w / 2, h * SPAN.top / (SPAN.top - SPAN.bottom));
      ctx.fillStyle = muscle; ctx.fillRect(-2, -3, 4, 5);
      for (let i = 0; i < 70; i++) scribble(ctx, [[jitter(1.3), -0.6 - random() * 1.9], [jitter(1.3), -0.6 - random() * 1.9]], 0.012, deep, 0, random);
      // Spine: bodies in front, the cord in its canal, spines behind.
      path(ctx, [[-0.2, -0.6], [-0.3, -1.2], [-0.34, -1.8], [-0.36, -2.5]], bone, 0.2);
      path(ctx, [[-0.2, -0.55], [-0.3, -1.2], [-0.34, -1.8], [-0.36, -2.5]], yellow, 0.075);
      for (let i = 0; i < 7; i++) {
        const y = -0.86 - i * 0.24, z = -0.06 - i * 0.012;
        ctx.fillStyle = bone; ctx.beginPath(); ctx.ellipse(z, y, 0.13, 0.095, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = lineInk; ctx.lineWidth = 0.012; ctx.stroke();
        poly(ctx, [[z - 0.42, y + 0.03], [z - 0.68, y - 0.08], [z - 0.42, y - 0.06]], bone, lineInk, 0.012);
      }
      // Skull and brain.
      const vault: [number, number][] = [];
      for (let k = -10; k <= 206; k += 6) vault.push([-0.03 + 0.89 * Math.cos(k * Math.PI / 180), 0.03 + 0.76 * Math.sin(k * Math.PI / 180)]);
      const cavity: [number, number][] = [...vault, [-0.6, -0.56], [-0.3, -0.66], [-0.1, -0.62], [0.08, -0.36], [0.42, -0.3]];
      poly(ctx, cavity, layers ? deep : lobes[1], bone, 0.13);
      if (!layers) {
        ctx.save();
        ctx.beginPath(); cavity.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.clip();
        ctx.fillStyle = lobes[0]; ctx.fillRect(0.12, -1, 1, 2);
        ctx.fillStyle = lobes[2]; ctx.fillRect(-1.2, -1, 0.62, 2);
        for (let i = 0; i < 46; i++) {
          const x = jitter(0.9), y = jitter(0.75);
          path(ctx, [[x, y], [x + jitter(0.1), y + 0.07], [x + jitter(0.14), y + jitter(0.1)], [x + jitter(0.16), y - 0.08]], lineInk, 0.014);
        }
        path(ctx, [[0.42, -0.02], [0.2, 0.2], [-0.15, 0.22], [-0.38, 0.02]], bone, 0.09);
        ctx.fillStyle = era('#d39a8c'); ctx.beginPath(); ctx.ellipse(0.0, -0.06, 0.2, 0.12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = lobes[3]; ctx.beginPath(); ctx.ellipse(-0.5, -0.4, 0.3, 0.2, 0.3, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 9; i++) path(ctx, [[-0.28, -0.4], [-0.5 + jitter(0.1), -0.4 + (i - 4) * 0.045], [-0.76, -0.4 + (i - 4) * 0.05]], lineInk, 0.01);
        ctx.restore();
        path(ctx, [[0.0, -0.14], [-0.1, -0.4], [-0.2, -0.62]], lobes[4], 0.16);
      }
      ctx.strokeStyle = lineInk; ctx.lineWidth = 0.014; ctx.beginPath(); cavity.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
      // Face: sinus, nasal cavity with its scrolls, palate, mouth, tongue, jaw and teeth.
      poly(ctx, [[0.9, -0.02], [0.78, 0.05], [0.72, -0.1], [0.84, -0.16]], deep, bone, 0.04);
      poly(ctx, [[0.92, -0.26], [0.36, -0.36], [0.14, -0.6], [0.5, -0.63], [0.9, -0.62], [1.04, -0.6], [1.0, -0.5]], deep);
      for (const [x, y, r] of [[0.62, -0.38, 0.2], [0.58, -0.47, 0.24], [0.56, -0.56, 0.26]] as const) { ctx.fillStyle = era('#eb9d9a'); ctx.beginPath(); ctx.ellipse(x, y, r, 0.03, -0.12, 0, Math.PI * 2); ctx.fill(); }
      poly(ctx, [[0.94, -0.62], [0.24, -0.64], [0.24, -0.7], [0.9, -0.71], [0.96, -0.8], [1.0, -0.7]], bone, lineInk, 0.012);
      const open = a.expression === 'startled' ? 0.12 : 0;
      poly(ctx, [[0.88, -0.71], [0.2, -0.7], [0.08, -0.98], [0.3, -1.2 - open], [0.7, -1.12 - open], [0.9, -0.95 - open]], deep);
      path(ctx, [[0.25, -0.67], [0.14, -0.78], [0.12, -0.9]], era('#e78f8c'), 0.07);
      poly(ctx, [[0.84, -0.84 - open], [0.66, -0.76 - open * 0.6], [0.44, -0.75 - open * 0.4], [0.24, -0.84], [0.18, -1.0], [0.26, -1.2 - open], [0.6, -1.16 - open], [0.8, -1.0 - open]], era('#dd5f6b'), lineInk, 0.012);
      for (let i = 0; i < 7; i++) path(ctx, [[0.3, -1.12 - open], [0.4 + i * 0.05, -0.95 - open * 0.7], [0.36 + i * 0.07, -0.79 - open * 0.5]], era('#b8404e'), 0.008);
      ctx.fillStyle = bone; ctx.beginPath(); ctx.ellipse(0.78, -1.14 - open, 0.11, 0.16, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = lineInk; ctx.lineWidth = 0.012; ctx.stroke();
      poly(ctx, [[0.9, -0.7], [0.97, -0.72], [0.95, -0.87], [0.9, -0.84]], '#fdfbf2', lineInk, 0.01);
      poly(ctx, [[0.84, -1.02 - open], [0.9, -1.0 - open], [0.9, -0.86 - open], [0.85, -0.88 - open]], '#fdfbf2', lineInk, 0.01);
      // Airway: from the nose down behind the tongue into the windpipe; the gullet runs behind it.
      path(ctx, [[0.04, -1.3], [0.02, -1.8], [0.0, -2.5]], deep, 0.07);
      path(ctx, [[0.3, -0.5], [0.08, -0.62], [0.06, -0.95], [0.1, -1.25], [0.2, -1.5], [0.2, -2.0], [0.2, -2.5]], blue, 0.13);
      if (vivid === 'airway') { path(ctx, [[0.95, -0.56], [0.5, -0.6], [0.3, -0.52]], blue, 0.05); path(ctx, [[0.86, -0.78], [0.5, -0.73], [0.16, -0.86]], blue, 0.04); }
      for (let i = 0; i < 9; i++) { ctx.fillStyle = bone; ctx.fillRect(0.27, -1.56 - i * 0.105, 0.05, 0.07); }
      poly(ctx, [[0.3, -1.3], [0.4, -1.36], [0.36, -1.52], [0.27, -1.5]], bone, lineInk, 0.012);
      path(ctx, [[0.2, -1.22], [0.24, -1.08], [0.16, -1.0]], bone, 0.045);
      ctx.fillStyle = bone; ctx.beginPath(); ctx.ellipse(0.4, -1.26 - open, 0.06, 0.035, 0, 0, Math.PI * 2); ctx.fill();
      if (vivid === 'nerves') {
        for (const end of [[0.86, 0.2], [0.8, -0.3], [0.9, -0.66], [0.7, -0.98], [0.5, -1.0], [0.6, -1.3], [-0.6, 0.3], [0.2, 0.6]] as const) path(ctx, [[-0.08, -0.36], [(end[0] - 0.08) / 2 + jitter(0.1), (end[1] - 0.36) / 2 + jitter(0.1)], end], yellow, 0.028);
      }
      // Skin and fat as a rim round the whole outline.
      const rim = [...front, ...back.slice().reverse()];
      ctx.beginPath(); rim.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.strokeStyle = vivid === 'muscles' ? era('#8e2f2c') : fleshTone; ctx.lineWidth = 0.09; ctx.stroke();
      ctx.strokeStyle = fleshTone; ctx.lineWidth = 0.05;
      for (const x of [NECK.z - NECK.r0, NECK.z + NECK.r0]) { ctx.beginPath(); ctx.moveTo(x, -1.25); ctx.lineTo(x, -2.5); ctx.stroke(); }
      chips(ctx, rim);
      if (a.finish === 'lettered') {
        ([[0.3, 0.38], [-0.5, -0.4], [-0.1, -0.42], [0.6, -0.47], [0.5, -0.95], [0.78, -1.14], [0.2, -1.8], [-0.07, -1.58], [-0.33, -2.05], [0.8, -0.03], [-0.5, 0.3]] as const)
          .forEach(([x, y], index) => label(ctx, x, y, String(index + 1), -1));
      }
    });

    // The coronal section, across the head at the ears. Used only by the quarter cut.
    const coronal = quarter ? painted(384, 1024, (ctx, w, h) => {
      ctx.setTransform(w / 1.0, 0, 0, -h / (SPAN.top - SPAN.bottom), 0, h * SPAN.top / (SPAN.top - SPAN.bottom));
      ctx.fillStyle = muscle; ctx.fillRect(-1, -3, 3, 5);
      for (let i = 0; i < 40; i++) { const x = random() * 0.8, y = -0.6 - random() * 1.9; scribble(ctx, [[x, y], [x + jitter(0.04), y - 0.2]], 0.012, deep, 0, random); }
      const ring: [number, number][] = [[0, 0.82]];
      for (let k = 90; k >= -62; k -= 6) ring.push([0.7 * Math.cos(k * Math.PI / 180), 0.03 + 0.79 * Math.sin(k * Math.PI / 180)]);
      ring.push([0.2, -0.6], [0, -0.62]);
      poly(ctx, ring, lobes[1], bone, 0.12);
      ctx.save(); ctx.beginPath(); ring.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.clip();
      ctx.fillStyle = lobes[2]; ctx.fillRect(0.3, -0.7, 0.6, 0.5);
      for (let i = 0; i < 26; i++) { const x = random() * 0.7, y = jitter(0.75); path(ctx, [[x, y], [x + jitter(0.1), y + 0.07], [x + jitter(0.12), y - 0.06]], lineInk, 0.014); }
      ctx.fillStyle = deep; ctx.beginPath(); ctx.ellipse(0.1, 0.05, 0.09, 0.16, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = bone; ctx.fillRect(0, 0.2, 0.3, 0.07);
      ctx.restore();
      path(ctx, [[0.03, -0.2], [0.04, -0.62]], lobes[4], 0.16);
      poly(ctx, [[0, -0.68], [0.16, -0.7], [0.18, -2.5], [0, -2.5]], bone, lineInk, 0.012);
      for (let i = 0; i < 7; i++) { ctx.fillStyle = era('#9cc3d6'); ctx.fillRect(0, -0.93 - i * 0.24, 0.17, 0.045); }
      path(ctx, [[0.01, -0.62], [0.01, -2.5]], yellow, 0.07);
      poly(ctx, [[0.5, -0.45], [0.6, -0.45], [0.58, -1.1], [0.46, -1.16], [0.42, -1.0]], bone, lineInk, 0.012);
      path(ctx, [[0.25, -0.7], [0.3, -1.0], [0.26, -1.3]], blue, 0.09);
      if (vivid === 'nerves') for (const end of [[0.66, -0.3], [0.6, -0.8], [0.4, -1.4], [0.3, -2.0]] as const) path(ctx, [[0.05, -0.5], [end[0] / 2, (end[1] - 0.5) / 2], end], yellow, 0.028);
      ctx.beginPath(); across.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = vivid === 'muscles' ? era('#8e2f2c') : fleshTone; ctx.lineWidth = 0.09; ctx.stroke();
      chips(ctx, across);
      if (a.finish === 'lettered') ([[0.35, 0.3], [0.08, -1.2], [0.52, -0.8], [0.27, -1.0], [0.5, -0.4]] as const).forEach(([x, y], index) => label(ctx, x, y, String(index + 12), 1));
    }) : null;

    const gloss = { glossy: 0.2, chipped: 0.78, lettered: 0.5 }[a.finish] * (a.era === 'plaster' ? 1.25 : 1);
    const skinMat = new THREE.MeshStandardMaterial({ map: outer, roughness: Math.min(0.95, gloss) });
    const plainMat = new THREE.MeshStandardMaterial({ color: vivid === 'muscles' ? muscle : fleshTone, roughness: Math.min(0.95, gloss) });
    const cutMat = new THREE.MeshStandardMaterial({ map: sagittal, roughness: Math.min(0.95, gloss), side: THREE.DoubleSide });

    const G = new THREE.Group();
    const M = new THREE.Group();
    G.add(M);
    G.scale.setScalar(HEAD_UNIT);
    s.root.add(G);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = M) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const height = NECK.top - NECK.bottom;
    const neck = (from: number, length: number) => placed(new THREE.CylinderGeometry(NECK.r0, NECK.r1, height, 28, 1, false, from, length), [0, (NECK.top + NECK.bottom) / 2, NECK.z]);
    /** A flat cut face from outlines given in its own plane, with the section texture stretched over it. */
    const cutFace = (outlines: readonly (readonly (readonly [number, number])[])[], wide: number, offset: number) => {
      const g = new THREE.ShapeGeometry(outlines.map((o) => new THREE.Shape(o.map(([x, y]) => new THREE.Vector2(x, y)))));
      const position = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) uv.setXY(i, (position.getX(i) + offset) / wide, (position.getY(i) - SPAN.bottom) / (SPAN.top - SPAN.bottom));
      return g;
    };

    if (!quarter) {
      add(globe(shape, 80, 100, -180, 0), skinMat);
      add(fuse([neck(Math.PI, Math.PI), ...earParts([-1])], plainMat).geometry, plainMat);
      const outline = [...front, ...back.slice().reverse()].map(([z, y]) => [-z, y] as const);
      const neckBox = [[-(NECK.z - NECK.r0), NECK.top], [-(NECK.z + NECK.r0), NECK.top], [-(NECK.z + NECK.r1), NECK.bottom], [-(NECK.z - NECK.r1), NECK.bottom]] as const;
      const face = cutFace([outline, neckBox], SPAN.z * 2, SPAN.z);
      face.rotateY(Math.PI / 2);
      add(face, cutMat).castShadow = false;
    } else {
      add(globe(shape, 80, 100, -180, 0), skinMat);
      add(globe(shape, 40, 100, 90, 180), skinMat);
      add(fuse([neck(Math.PI / 2, Math.PI * 1.5), ...earParts([-1])], plainMat).geometry, plainMat);
      const outline = [...front, [0, front[front.length - 1][1]] as const, [0, front[0][1]] as const].map(([z, y]) => [-z, y] as const);
      const dz = Math.sqrt(NECK.r0 ** 2 - NECK.z ** 2) + NECK.z;
      const neckBox = [[0, NECK.top], [-dz, NECK.top], [-dz - 0.03, NECK.bottom], [0, NECK.bottom]] as const;
      const face = cutFace([outline, neckBox], SPAN.z * 2, SPAN.z);
      face.rotateY(Math.PI / 2);
      add(face, cutMat).castShadow = false;
      const dx = Math.sqrt(NECK.r0 ** 2 - NECK.z ** 2);
      const side = cutFace([[...across, [0, across[across.length - 1][1]], [0, across[0][1]]], [[0, NECK.top], [dx, NECK.top], [dx + 0.03, NECK.bottom], [0, NECK.bottom]]], 1, 0);
      add(side, new THREE.MeshStandardMaterial({ map: coronal, roughness: Math.min(0.95, gloss), side: THREE.DoubleSide })).castShadow = false;
    }
    M.rotation.y = (quarter ? -0.66 : -0.8) + jitter(0.08);

    // The stand.
    const baseTop = NECK.bottom;
    let floor: number;
    if (a.era === 'plastic') {
      const white = s.material('#eeeeea', { roughness: 0.35 });
      const steel = new THREE.MeshStandardMaterial({ color: '#b9c0c4', metalness: 0.9, roughness: 0.28 });
      add(placed(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 12), [0, baseTop - 0.14, NECK.z]), steel, G);
      add(placed(new THREE.BoxGeometry(1.7, 0.16, 1.5), [0, baseTop - 0.36, NECK.z]), white, G);
      floor = baseTop - 0.44;
      const tag = add(new THREE.PlaneGeometry(0.7, 0.11), new THREE.MeshStandardMaterial({ map: painted(256, 40, (ctx, w, h) => { ctx.fillStyle = '#1f4fa8'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`HEAD · MODEL ${100 + Math.floor(random() * 800)}`, w / 2, h / 2 + 1, w - 10); }), roughness: 0.5 }), G);
      tag.position.set(0, baseTop - 0.36, NECK.z + 0.752);
    } else {
      const wax = a.era === 'wax';
      const wood = s.material(wax ? '#17130f' : mood.warmth > 0.5 ? '#7b5230' : '#5f4a36', { roughness: wax ? 0.3 : 0.55 });
      const profile: [number, number][] = wax
        ? [[0, 0], [0.9, 0], [0.92, 0.05], [0.84, 0.1], [0.76, 0.13], [0.74, 0.24], [0.8, 0.28], [0.64, 0.34], [0.55, 0.42], [0.53, 0.52], [0, 0.52]]
        : [[0, 0], [0.84, 0], [0.84, 0.1], [0.76, 0.17], [0.58, 0.23], [0.54, 0.34], [0, 0.34]];
      const tall = profile[profile.length - 1][1];
      const foot = add(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 40), wood, G);
      foot.position.set(0, baseTop - tall, NECK.z);
      floor = baseTop - tall;
      const text = wax ? 'CAPUT · SECTIO' : `FIG. ${1 + Math.floor(random() * 40)}`;
      const plate = painted(256, 64, (ctx, w, h) => {
        ctx.fillStyle = wax ? '#c9a24a' : '#efe6cc'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1a1612'; ctx.font = 'bold 34px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, w / 2, h / 2 + 2, w - 16);
      });
      const r = wax ? 0.745 : 0.845;
      add(placed(new THREE.CylinderGeometry(r, r, 0.09, 16, 1, true, -0.36, 0.72), [0, baseTop - tall + (wax ? 0.185 : 0.05), NECK.z]), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.5, metalness: wax ? 0.6 : 0 }), G);
    }

    if (layers) {
      // The loose pieces: half a brain flat side down, the skull cap like a bowl, an eye on its stalk.
      const brainSkin = skin(256, 128, (ctx) => {
        ctx.fillStyle = lobes[1]; ctx.fillRect(-180, -90, 360, 180);
        ctx.fillStyle = lobes[0]; ctx.fillRect(-60, -90, 120, 180);
        ctx.fillStyle = lobes[2]; ctx.fillRect(120, -90, 60, 180); ctx.fillRect(-180, -90, 60, 180);
        for (let i = 0; i < 90; i++) { const x = jitter(180), y = jitter(80); scribble(ctx, [[x, y], [x + jitter(18), y + jitter(10)], [x + jitter(24), y + jitter(16)]], 2.2, lineInk, 3, random); }
      });
      const P = new THREE.Group();
      G.add(P);
      const brain = add(globe((d) => new THREE.Vector3(d.x * 0.6, Math.max(0, d.y) * 0.62 * (1 + 0.04 * Math.sin(d.x * 20) * Math.sin(d.z * 17)), d.z * 0.82), 40, 24), new THREE.MeshStandardMaterial({ map: brainSkin, roughness: Math.min(0.95, gloss) }), P);
      brain.rotation.y = 0.5 + jitter(0.4);
      brain.position.set(1.3, floor, 0.75);
      const boneMat = new THREE.MeshStandardMaterial({ color: bone, roughness: 0.6, side: THREE.DoubleSide });
      const cap = add(new THREE.SphereGeometry(0.86, 28, 10, 0, Math.PI, 0, Math.PI * 0.42), boneMat, P);
      cap.scale.set(0.95, 0.85, 1.05);
      cap.rotation.set(Math.PI + 0.2, jitter(0.5), 0.1);
      cap.position.set(1.15, floor + 0.74, -0.55);
      const eye = new THREE.Group();
      add(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshStandardMaterial({ color: '#f6f2e8', roughness: 0.25 }), eye);
      add(placed(new THREE.SphereGeometry(0.07, 12, 8), [0, 0, 0.085], [1, 1, 0.5]), new THREE.MeshStandardMaterial({ color: era('#2e7bd0'), roughness: 0.3 }), eye);
      add(placed(new THREE.SphereGeometry(0.032, 8, 6), [0, 0, 0.115], [1, 1, 0.4]), new THREE.MeshStandardMaterial({ color: '#0b0b0e', roughness: 0.3 }), eye);
      add(placed(new THREE.CylinderGeometry(0.03, 0.02, 0.22, 6), [0, 0, -0.2], [1, 1, 1], [Math.PI / 2, 0, 0]), new THREE.MeshStandardMaterial({ color: yellow, roughness: 0.6 }), eye);
      eye.position.set(0.35 + jitter(0.15), floor + 0.13, 1.25);
      eye.rotation.set(-0.5, 0.6 + jitter(0.6), 0);
      P.add(eye);
    }
    return s.finish();
  },
});
