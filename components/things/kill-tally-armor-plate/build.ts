import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type V, add, ball, box, cyl, group, paint, rod, stencil, tube } from './h';

const LIVERY = { olive: '#5d6b45', desert: '#bd9f6c', arctic: '#d9dedf', navy: '#465668', crimson: '#8c2f2a', black: '#2b2d30' } as const;
const NAMES = {
  lucky: 'LUCKY SEVEN', fortune: 'MISS FORTUNE', faithful: 'OLD FAITHFUL', widow: 'WIDOWMAKER',
  marie: 'SWEET MARIE', regrets: 'NO REGRETS', angel: 'HOMESICK ANGEL', blank: '',
} as const;
type Ctx = CanvasRenderingContext2D;
type Fn = (x: number) => number;

const W = 1.9, H = 1.7, TH = 0.06;

/** Each outline is a top and a bottom edge over x, so the plate can be built as a bent grid. */
const SHAPES: Record<'pauldron' | 'slab' | 'heater' | 'round', { top: Fn; bottom: Fn; r: number; cy: number }> = {
  pauldron: { top: (t) => 0.5 - 0.16 * t ** 4 - 0.03 * t * t, bottom: (t) => -0.5 + 0.5 * Math.abs(t) ** 1.6, r: 1.15, cy: 0.16 },
  slab: { top: (t) => 0.5 - Math.max(0, Math.abs(t) - 0.72) * 0.75, bottom: (t) => -0.5 + Math.max(0, Math.abs(t) - 0.5) * 0.62, r: 2.6, cy: 0.03 },
  heater: { top: (t) => 0.5 - 0.05 * (1 - Math.abs(t)) ** 2, bottom: (t) => -0.5 + 0.78 * Math.abs(t) ** 1.45, r: 1.5, cy: 0.1 },
  round: { top: (t) => 0.5 * Math.sqrt(Math.max(0, 1 - t ** 6)), bottom: (t) => -0.5 * Math.sqrt(Math.max(0, 1 - t * t)), r: 1.3, cy: 0.2 },
};

function star(ctx: Ctx, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.42 : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
  ctx.closePath();
}
const blob = (ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, rot = 0) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); };
const limb = (ctx: Ctx, pts: readonly (readonly [number, number])[], width: number, colour: string) => {
  ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
};

/** Emblems are drawn in a box running -1..1 both ways, y down. */
const EMBLEMS: Record<'shark' | 'pinup' | 'saint' | 'rabbit' | 'skull' | 'daisy', (ctx: Ctx) => void> = {
  shark(ctx) {
    const U = (s: number): [number, number] => [-1.25 + 2.5 * s, 0.05 - 0.5 * Math.sin(Math.PI * s) - 0.25 * s];
    const L = (s: number): [number, number] => [-1.25 + 2.5 * s, 0.05 + 0.75 * Math.sin(Math.PI * s) ** 0.8 - 0.25 * s];
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) ctx.lineTo(...U(i / 24));
    for (let i = 24; i >= 0; i--) ctx.lineTo(...L(i / 24));
    ctx.closePath();
    ctx.fillStyle = '#b3201b'; ctx.fill();
    ctx.lineWidth = 0.07; ctx.strokeStyle = '#141414'; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.beginPath();
    for (let i = 2; i <= 22; i++) { const [x, y] = U(i / 24), [, y2] = L(i / 24); ctx.lineTo(x, mix(y, y2, 0.36)); }
    for (let i = 22; i >= 2; i--) { const [x, y] = U(i / 24), [, y2] = L(i / 24); ctx.lineTo(x, mix(y, y2, 0.7)); }
    ctx.fillStyle = '#1a0d0c'; ctx.fill();
    ctx.fillStyle = '#f6f1e2';
    const n = 11;
    for (let k = 0; k < n; k++) {
      const s0 = 0.04 + (k / n) * 0.92, s1 = 0.04 + ((k + 1) / n) * 0.92, sm = (s0 + s1) / 2;
      for (const [E, O] of [[U, L], [L, U]] as const) {
        const a = E(s0), b = E(s1), m = E(sm), o = O(sm);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(m[0], mix(m[1], o[1], 0.42)); ctx.closePath(); ctx.fill();
      }
    }
    blob(ctx, 0.62, -0.78, 0.2, 0.15, '#f6f1e2'); blob(ctx, 0.66, -0.76, 0.09, 0.1, '#141414');
    limb(ctx, [[0.36, -0.98], [0.9, -0.84]], 0.07, '#141414');
  },
  pinup(ctx) {
    // A girl riding a bomb, waving.
    ctx.fillStyle = '#d9b23a'; ctx.beginPath(); ctx.ellipse(0.1, 0.62, 0.95, 0.24, -0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a6f1f'; ctx.beginPath(); ctx.moveTo(-0.75, 0.62); ctx.lineTo(-1.1, 0.3); ctx.lineTo(-1.0, 0.66); ctx.lineTo(-1.1, 1.0); ctx.closePath(); ctx.fill();
    blob(ctx, 0.98, 0.57, 0.1, 0.12, '#b3201b');
    const skin = '#f2c6a0';
    blob(ctx, -0.33, -0.6, 0.27, 0.3, '#3a2317'); limb(ctx, [[-0.42, -0.45], [-0.5, -0.1]], 0.2, '#3a2317');
    limb(ctx, [[-0.12, -0.3], [-0.5, -0.5], [-0.62, -0.95]], 0.1, skin);
    limb(ctx, [[0, 0.3], [0.5, 0.36], [0.72, 0.9]], 0.17, skin);
    limb(ctx, [[0, 0.3], [0.56, 0.12], [0.98, 0.34]], 0.17, skin);
    limb(ctx, [[-0.02, 0.28], [-0.14, -0.28]], 0.34, '#c8241d');
    limb(ctx, [[-0.02, -0.26], [0.22, 0.0], [0.4, 0.2]], 0.1, skin);
    blob(ctx, -0.2, -0.62, 0.18, 0.2, skin);
    limb(ctx, [[-0.4, -0.72], [-0.2, -0.86], [-0.02, -0.72]], 0.12, '#3a2317');
    blob(ctx, 0.75, 0.96, 0.1, 0.05, '#c8241d'); blob(ctx, 1.04, 0.36, 0.09, 0.05, '#c8241d');
  },
  saint(ctx) {
    // An icon: pointed gold arch, halo, veil and a robe with hands at prayer.
    ctx.beginPath(); ctx.moveTo(-0.72, 1); ctx.lineTo(-0.72, -0.25); ctx.quadraticCurveTo(-0.7, -0.85, 0, -1.08); ctx.quadraticCurveTo(0.7, -0.85, 0.72, -0.25); ctx.lineTo(0.72, 1); ctx.closePath();
    ctx.fillStyle = '#213a6b'; ctx.fill(); ctx.lineWidth = 0.09; ctx.strokeStyle = '#e3b93a'; ctx.stroke();
    ctx.strokeStyle = '#e3b93a'; ctx.lineWidth = 0.035;
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 0.36, -0.42 + Math.sin(a) * 0.36); ctx.lineTo(Math.cos(a) * 0.56, -0.42 + Math.sin(a) * 0.56); ctx.stroke(); }
    blob(ctx, 0, -0.42, 0.4, 0.4, '#f0cb4a');
    ctx.fillStyle = '#f4efe2'; ctx.beginPath(); ctx.moveTo(0, -0.74); ctx.quadraticCurveTo(-0.42, -0.6, -0.5, 1); ctx.lineTo(0.5, 1); ctx.quadraticCurveTo(0.42, -0.6, 0, -0.74); ctx.fill();
    ctx.fillStyle = '#b3201b'; ctx.beginPath(); ctx.moveTo(-0.2, -0.1); ctx.lineTo(0.2, -0.1); ctx.lineTo(0.3, 1); ctx.lineTo(-0.3, 1); ctx.closePath(); ctx.fill();
    blob(ctx, 0, -0.42, 0.17, 0.21, '#e8bf98');
    blob(ctx, -0.06, -0.44, 0.022, 0.03, '#2a1c14'); blob(ctx, 0.06, -0.44, 0.022, 0.03, '#2a1c14');
    blob(ctx, 0, 0.14, 0.07, 0.17, '#e8bf98'); limb(ctx, [[-0.34, 0.5], [0, 0.26], [0.34, 0.5]], 0.11, '#f4efe2');
  },
  rabbit(ctx) {
    // A grinning cartoon rabbit with its gloves up.
    for (const sx of [-1, 1]) { blob(ctx, sx * 0.24, -0.68, 0.14, 0.42, '#1a1a1a', sx * 0.22); blob(ctx, sx * 0.24, -0.68, 0.1, 0.37, '#f3f0e6', sx * 0.22); blob(ctx, sx * 0.24, -0.66, 0.045, 0.27, '#e79aa0', sx * 0.22); }
    blob(ctx, 0, 0.02, 0.53, 0.48, '#1a1a1a'); blob(ctx, 0, 0.02, 0.49, 0.44, '#f3f0e6');
    for (const sx of [-1, 1]) { blob(ctx, sx * 0.17, -0.12, 0.11, 0.16, '#ffffff'); ctx.lineWidth = 0.03; ctx.strokeStyle = '#1a1a1a'; ctx.stroke(); blob(ctx, sx * 0.15, -0.08, 0.05, 0.08, '#1a1a1a'); limb(ctx, [[sx * 0.3, -0.36], [sx * 0.06, -0.26]], 0.05, '#1a1a1a'); }
    blob(ctx, 0, 0.1, 0.07, 0.05, '#d4505a');
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.moveTo(-0.32, 0.16); ctx.quadraticCurveTo(0, 0.52, 0.32, 0.16); ctx.quadraticCurveTo(0, 0.3, -0.32, 0.16); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-0.09, 0.22, 0.08, 0.14); ctx.fillRect(0.01, 0.22, 0.08, 0.14);
    for (const sx of [-1, 1]) { blob(ctx, sx * 0.72, 0.38, 0.27, 0.3, '#1a1a1a'); blob(ctx, sx * 0.72, 0.38, 0.23, 0.26, '#c8241d'); blob(ctx, sx * 0.56, 0.3, 0.09, 0.11, '#c8241d'); ctx.fillStyle = '#f3f0e6'; ctx.fillRect(sx * 0.72 - 0.17, 0.62, 0.34, 0.11); }
  },
  skull(ctx) {
    // Ace of spades with a skull on it.
    ctx.fillStyle = '#131313';
    ctx.beginPath(); ctx.moveTo(0, -1.02); ctx.bezierCurveTo(0.3, -0.55, 1.05, -0.2, 0.95, 0.3); ctx.bezierCurveTo(0.88, 0.72, 0.32, 0.72, 0.1, 0.42);
    ctx.lineTo(0.3, 1); ctx.lineTo(-0.3, 1); ctx.lineTo(-0.1, 0.42); ctx.bezierCurveTo(-0.32, 0.72, -0.88, 0.72, -0.95, 0.3); ctx.bezierCurveTo(-1.05, -0.2, -0.3, -0.55, 0, -1.02); ctx.fill();
    ctx.lineWidth = 0.05; ctx.strokeStyle = '#f1ecdc'; ctx.stroke();
    blob(ctx, 0, -0.08, 0.4, 0.36, '#f1ecdc'); ctx.fillStyle = '#f1ecdc'; ctx.fillRect(-0.22, 0.14, 0.44, 0.26);
    blob(ctx, -0.16, -0.06, 0.12, 0.13, '#131313'); blob(ctx, 0.16, -0.06, 0.12, 0.13, '#131313');
    ctx.fillStyle = '#131313'; ctx.beginPath(); ctx.moveTo(0, 0.07); ctx.lineTo(0.06, 0.19); ctx.lineTo(-0.06, 0.19); ctx.fill();
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * 0.085 - 0.012, 0.25, 0.024, 0.15);
  },
  daisy(ctx) {
    limb(ctx, [[0, 0.1], [0.08, 0.6], [-0.05, 1.02]], 0.08, '#3f7a36');
    blob(ctx, 0.28, 0.66, 0.24, 0.09, '#3f7a36', -0.5);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; blob(ctx, Math.cos(a) * 0.44, -0.3 + Math.sin(a) * 0.44, 0.3, 0.115, '#f7f4ea', a); }
    blob(ctx, 0, -0.3, 0.21, 0.21, '#e7a81c'); blob(ctx, -0.04, -0.34, 0.1, 0.1, '#f2c540');
  },
};

/** Tally icons are drawn in a box running -1..1, y down. */
const TALLIES: Record<'kills' | 'missions' | 'stars' | 'days' | 'rescues', (ctx: Ctx, ink: string) => void> = {
  kills(ctx, ink) { ctx.fillStyle = ink; ctx.fillRect(-0.55, -0.6, 1.1, 0.7); ctx.fillRect(-0.22, -0.95, 0.44, 0.3); ctx.fillRect(-0.95, -0.5, 0.3, 0.75); ctx.fillRect(0.65, -0.5, 0.3, 0.75); ctx.fillRect(-0.5, 0.1, 0.34, 0.85); ctx.fillRect(0.16, 0.1, 0.34, 0.85); },
  missions(ctx) { blob(ctx, 0, 0.1, 0.42, 0.75, '#e3b93a'); ctx.fillStyle = '#e3b93a'; ctx.beginPath(); ctx.moveTo(0, -0.45); ctx.lineTo(0.55, -0.98); ctx.lineTo(-0.55, -0.98); ctx.fill(); },
  stars(ctx) { star(ctx, 0.95); ctx.fillStyle = '#c8241d'; ctx.fill(); ctx.lineWidth = 0.12; ctx.strokeStyle = '#f4efe2'; ctx.stroke(); },
  days(ctx, ink) { for (let i = 0; i < 4; i++) limb(ctx, [[-0.6 + i * 0.4, -0.85], [-0.66 + i * 0.4, 0.85]], 0.14, ink); limb(ctx, [[-0.95, 0.5], [0.95, -0.5]], 0.14, ink); },
  rescues(ctx) { blob(ctx, 0, 0, 0.9, 0.9, '#f4efe2'); ctx.fillStyle = '#c8241d'; ctx.fillRect(-0.2, -0.62, 0.4, 1.24); ctx.fillRect(-0.62, -0.2, 1.24, 0.4); },
};

export default defineThing({
  questions: {
    emblem: choice('What is the hand-painted nose art?', {
      shark: 'A red shark mouth full of white teeth with a glaring eye.',
      pinup: 'A pin-up girl riding a bomb and waving.',
      saint: 'A haloed saint at prayer in a gold arch, a protector.',
      rabbit: 'A grinning cartoon rabbit with boxing gloves up.',
      skull: 'A skull on the ace of spades.',
      daisy: 'A single white daisy, gentle and out of place.',
    }),
    tally: choice('What do the rows of small marks count?', {
      kills: 'Enemy machines destroyed: small walker silhouettes.',
      missions: 'Sorties flown: yellow bomb stencils.',
      stars: 'Victories as red stars.',
      days: 'Days survived, in five-bar chalk gates.',
      rescues: 'Crews pulled out alive: red crosses on white discs.',
    }),
    count: score('How many marks are there?', ['None yet, a clean plate', 'A handful', 'A couple of rows', 'Crowded right across the plate']),
    name: choice('What name is lettered under the art?', {
      lucky: 'LUCKY SEVEN, a gambler hoping.',
      fortune: 'MISS FORTUNE, a gallows pun.',
      faithful: 'OLD FAITHFUL, a tired workhorse.',
      widow: 'WIDOWMAKER, pure menace.',
      marie: 'SWEET MARIE, someone waiting at home.',
      regrets: 'NO REGRETS, bravado.',
      angel: 'HOMESICK ANGEL, wistful.',
      blank: 'No name at all, only the unit number.',
    }),
    story: choice('Why is the plate off the machine and standing here?', {
      painting: 'It is being painted right now: art half finished, masking tape, open tins and a brush on a drop cloth.',
      servicing: 'Pulled for servicing between sorties: a red tag, a tool tray and loose bolts at its foot.',
      holed: 'It came back with a hole punched clean through it, scorched and sooty.',
      memorial: 'Its pilot did not come back: a black ribbon across the corner, candles, flowers and a helmet at its foot.',
      retired: 'Retired with honour and put on display behind a rope with a brass plaque.',
    }),
    shape: choice('What shape is the plate?', {
      pauldron: 'A deeply curved shoulder cap with a tapering lower edge.',
      slab: 'A nearly flat angular slab with clipped corners.',
      heater: 'A shield shape coming to a point at the bottom.',
      round: 'A domed, rounded cap.',
    }),
    livery: choice('What colour is the armour under the art?', {
      olive: 'Flat olive drab.', desert: 'Sand tan.', arctic: 'Winter white-grey.', navy: 'Blue-grey.', crimson: 'Deep red.', black: 'Night black.',
    }),
    stand: choice('What holds it up?', {
      easel: 'A tall timber easel, like a painting.',
      rack: 'A yellow steel rolling rack on casters.',
      drums: 'Just leaned on a pair of oil drums with timbers under it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = s.root;
    const shape = SHAPES[a.shape];
    const top = (x: number) => shape.top(x / (W / 2)) * H, bottom = (x: number) => shape.bottom(x / (W / 2)) * H;
    const base = new THREE.Color(LIVERY[a.livery]);
    const light = base.getHSL({ h: 0, s: 0, l: 0 }).l > 0.55;
    const ink = light ? '#1d1d1b' : '#f1ecdc';
    const pm = 1024 / W, cw = 1024, ch = Math.round(pm * H);
    const cx = (x: number) => (x / W + 0.5) * cw, cyv = (y: number) => (0.5 - y / H) * ch;
    const inside = (x: number, y: number, margin: number) => Math.abs(x) < W / 2 - margin && y < top(x) - margin && y > bottom(x) + margin;

    // Shot holes cut through both faces by alpha.
    const holes: { x: number; y: number; r: number }[] = [];
    if (a.story === 'holed') {
      holes.push({ x: mix(-0.25, 0.4, random()), y: mix(0.0, 0.35, random()), r: mix(0.13, 0.2, random()) });
      const more = Math.floor(random() * 3 + mood.density * 2);
      for (let i = 0; i < more; i++) { const x = mix(-0.75, 0.75, random()), y = mix(-0.2, 0.6, random()); if (inside(x, y, 0.1)) holes.push({ x, y, r: mix(0.03, 0.07, random()) }); }
    } else if (mood.wear > 0.8 && (a.story === 'servicing' || a.story === 'memorial')) holes.push({ x: mix(-0.6, 0.6, random()), y: mix(0.2, 0.55, random()), r: 0.045 });
    const jag = holes.map((h) => Array.from({ length: 14 }, () => h.r * mix(0.72, 1.2, random())));
    const cut = (ctx: Ctx) => {
      ctx.globalCompositeOperation = 'destination-out';
      holes.forEach((h, n) => { ctx.beginPath(); jag[n].forEach((r, i) => { const ang = i / 14 * Math.PI * 2; ctx.lineTo(cx(h.x) + Math.cos(ang) * r * pm, cyv(h.y) + Math.sin(ang) * r * pm); }); ctx.closePath(); ctx.fill(); });
      ctx.globalCompositeOperation = 'source-over';
    };

    const unit = `${1 + Math.floor(random() * 9)}-${String(1 + Math.floor(random() * 40)).padStart(2, '0')}`;
    const marks = Math.round(mix(0, 46, a.count ** 1.35));
    const ex = 0, ey = a.emblem === 'shark' ? 0.2 * H : 0.17 * H, es = (a.emblem === 'shark' ? 0.22 : 0.27) * H;
    const front = paint(cw, ch, (ctx) => {
      ctx.fillStyle = `#${base.getHexString()}`; ctx.fillRect(0, 0, cw, ch);
      // Mottled paint and a darker lower edge so the bare armour is not flat.
      for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},${0.02 + random() * 0.04})`; ctx.beginPath(); ctx.ellipse(random() * cw, random() * ch, 30 + random() * 120, 20 + random() * 60, random() * 3, 0, 7); ctx.fill(); }
      const grad = ctx.createLinearGradient(0, 0, 0, ch); grad.addColorStop(0, 'rgba(255,255,255,0.08)'); grad.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, cw, ch);
      // Unit band: a diagonal flash across one top corner.
      ctx.save(); ctx.translate(cx(-W * 0.5), cyv(H * 0.2)); ctx.rotate(-0.72);
      ctx.fillStyle = a.livery === 'crimson' ? '#f1ecdc' : '#c8241d'; ctx.fillRect(-50, -34, 620, 30);
      ctx.fillStyle = light ? '#1d1d1b' : '#e3b93a'; ctx.fillRect(-50, 4, 620, 12); ctx.restore();

      // Emblem; when it is still being painted only part is filled in over chalk guides.
      const drawEmblem = () => { ctx.save(); ctx.translate(cx(ex), cyv(ey)); ctx.scale(es * pm, es * pm); EMBLEMS[a.emblem](ctx); ctx.restore(); };
      if (a.story === 'painting') {
        const split = cx(ex + mix(-0.1, 0.25, random()));
        ctx.save(); ctx.globalAlpha = 0.2; drawEmblem(); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, split, ch); ctx.clip(); drawEmblem(); ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.setLineDash([14, 10]);
        ctx.strokeRect(cx(ex) - es * pm * 1.15, cyv(ey) - es * pm * 1.1, es * pm * 2.3, es * pm * 2.2);
        ctx.beginPath(); ctx.moveTo(cx(ex), cyv(ey) - es * pm * 1.2); ctx.lineTo(cx(ex), cyv(ey) + es * pm * 1.2); ctx.moveTo(cx(ex) - es * pm * 1.25, cyv(ey)); ctx.lineTo(cx(ex) + es * pm * 1.25, cyv(ey)); ctx.stroke(); ctx.setLineDash([]);
        // Masking tape.
        ctx.fillStyle = '#e2cf9a';
        for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(cx(ex) + (i < 2 ? -1 : 1) * es * pm * 1.15, cyv(ey) + (i % 2 ? -1 : 1) * es * pm * 1.1); ctx.rotate(0.78 * (i === 0 || i === 3 ? 1 : -1) + (random() - 0.5) * 0.3); ctx.fillRect(-55, -13, 110, 26); ctx.restore(); }
      } else drawEmblem();

      // Name on a scroll under the art.
      const text = NAMES[a.name];
      const ny = ey - es * 1.32;
      if (text) {
        const half = Math.min(0.62, 0.05 * text.length + 0.14) * pm;
        ctx.save(); ctx.translate(cx(ex), cyv(ny)); ctx.rotate(-0.045);
        ctx.fillStyle = '#f1e6c4'; ctx.beginPath(); ctx.moveTo(-half, -36); ctx.quadraticCurveTo(0, -52, half, -36); ctx.lineTo(half + 34, 0); ctx.lineTo(half, 36); ctx.quadraticCurveTo(0, 20, -half, 36); ctx.lineTo(-half - 34, 0); ctx.closePath(); ctx.fill();
        ctx.lineWidth = 5; ctx.strokeStyle = '#1d1d1b'; ctx.stroke();
        ctx.fillStyle = '#9c1f1a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'italic bold 52px Georgia, "Times New Roman", serif';
        if (a.story === 'painting') { ctx.globalAlpha = 0.9; ctx.fillText(text.slice(0, Math.ceil(text.length * 0.6)), -half * 0.28, -6, half * 1.3); } else ctx.fillText(text, 0, -6, half * 1.85);
        ctx.restore();
      }
      // Stencilled housekeeping.
      const sy = ny - 0.17;
      if (inside(0, sy, 0.04)) stencil(ctx, `UNIT ${unit}`, cx(0), cyv(sy), 36, ink, 'center');
      for (const sx of [-1, 1]) if (inside(sx * 0.62, top(sx * 0.62) - 0.1, 0.03)) stencil(ctx, sx < 0 ? 'LIFT HERE' : 'NO STEP', cx(sx * 0.62), cyv(top(sx * 0.62) - 0.1), 22, ink, 'center');

      // Tally rows, filling the left flank first and then the right.
      const step = 0.105, size = 0.04;
      const cells: [number, number][] = [];
      for (const sx of [-1, 1]) for (let row = 0; row < 9; row++) for (let col = 0; col < 5; col++) {
        const x = sx < 0 ? -0.9 + col * step : 0.48 + col * step, y = H * 0.34 - row * step * 1.12;
        if (inside(x, y, 0.06) && Math.abs(x - ex) > es * (a.emblem === 'shark' ? 1.3 : 1.05) + 0.02) cells.push([x, y]);
      }
      cells.slice(0, marks).forEach(([x, y], i) => {
        ctx.save(); ctx.translate(cx(x) + (random() - 0.5) * 5, cyv(y) + (random() - 0.5) * 5); ctx.rotate((random() - 0.5) * 0.14); ctx.scale(size * pm, size * pm);
        ctx.globalAlpha = a.tally === 'days' ? 0.85 : 1;
        TALLIES[a.tally](ctx, ink);
        ctx.restore();
        if (a.story === 'memorial' && i === Math.min(marks, cells.length) - 1) { ctx.strokeStyle = '#c8241d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx(x), cyv(y), size * pm * 1.5, 0, 7); ctx.stroke(); }
      });

      // Sun-fade, then rivets, chips, scratches and rust by wear.
      ctx.fillStyle = `rgba(${Math.round(base.r * 255)},${Math.round(base.g * 255)},${Math.round(base.b * 255)},${mood.wear * 0.3})`; ctx.fillRect(0, 0, cw, ch);
      for (let i = 0; i <= 26; i++) {
        const x = -W / 2 + 0.06 + (W - 0.12) * i / 26;
        for (const y of [top(x) - 0.055, bottom(x) + 0.055]) {
          if (top(x) - bottom(x) < 0.2) continue;
          if (random() < mood.wear * 0.7) { const g = ctx.createLinearGradient(0, cyv(y), 0, cyv(y) + 120); g.addColorStop(0, 'rgba(110,60,30,0.55)'); g.addColorStop(1, 'rgba(110,60,30,0)'); ctx.fillStyle = g; ctx.fillRect(cx(x) - 4, cyv(y), 8, 120); }
          blob(ctx, cx(x), cyv(y), 7, 7, 'rgba(0,0,0,0.5)'); blob(ctx, cx(x) - 1.5, cyv(y) - 1.5, 4, 4, 'rgba(255,255,255,0.35)');
        }
      }
      const chips = Math.round(mood.wear * 60);
      for (let i = 0; i < chips; i++) { const x = (random() - 0.5) * W, edge = random() < 0.5 ? top(x) - random() * 0.05 : bottom(x) + random() * 0.05; blob(ctx, cx(x), cyv(edge), 6 + random() * 22, 4 + random() * 10, random() < 0.5 ? '#8f9598' : '#6d4a34', random() * 3); }
      ctx.lineCap = 'round';
      for (let i = 0; i < Math.round(mood.wear * 45); i++) { ctx.strokeStyle = `rgba(${random() < 0.6 ? '190,196,198' : '30,28,26'},${0.3 + random() * 0.4})`; ctx.lineWidth = 1 + random() * 3; const x = random() * cw, y = random() * ch, ang = random() * 6; const l = 20 + random() * 150; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l); ctx.stroke(); }
      if (a.story === 'memorial') { ctx.save(); ctx.translate(cx(W * 0.5), cyv(H * 0.16)); ctx.rotate(0.74); ctx.fillStyle = '#0f0f10'; ctx.fillRect(-640, -30, 720, 60); ctx.restore(); }
      for (const h of holes) {
        const g = ctx.createRadialGradient(cx(h.x), cyv(h.y), h.r * pm * 0.7, cx(h.x), cyv(h.y), h.r * pm * 2.6);
        g.addColorStop(0, 'rgba(12,10,9,0.95)'); g.addColorStop(0.4, 'rgba(25,20,16,0.6)'); g.addColorStop(1, 'rgba(25,20,16,0)');
        ctx.fillStyle = g; ctx.fillRect(cx(h.x) - h.r * pm * 3, cyv(h.y) - h.r * pm * 3, h.r * pm * 6, h.r * pm * 6);
        ctx.strokeStyle = '#a9afb2'; ctx.lineWidth = 3;
        for (let i = 0; i < 9; i++) { const ang = random() * 7; ctx.beginPath(); ctx.moveTo(cx(h.x) + Math.cos(ang) * h.r * pm, cyv(h.y) + Math.sin(ang) * h.r * pm); ctx.lineTo(cx(h.x) + Math.cos(ang) * h.r * pm * (1.5 + random()), cyv(h.y) + Math.sin(ang) * h.r * pm * (1.5 + random())); ctx.stroke(); }
      }
      if (a.story === 'holed') { ctx.fillStyle = 'rgba(20,16,14,0.22)'; ctx.fillRect(0, 0, cw, ch); }
      cut(ctx);
    });
    const back = paint(512, Math.round(512 * H / W), (ctx, w, h) => {
      ctx.fillStyle = '#6a3f31'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#3b3d40'; for (let i = 1; i < 6; i++) ctx.fillRect(i * w / 6 - 8, 0, 16, h); for (let i = 1; i < 4; i++) ctx.fillRect(0, i * h / 4 - 8, w, 16);
      ctx.save(); ctx.scale(0.5, 0.5); cut(ctx); ctx.restore();
    });

    // The plate: a grid bent round a vertical axis with a little crown top to bottom.
    const P = (x: number, y: number, off: number): V => { const ang = x / shape.r, r = shape.r + off - shape.cy * y * y; return [r * Math.sin(ang), y, r * Math.cos(ang) - shape.r]; };
    const N = 44, M = 16;
    const face = (off: number, flip: boolean) => {
      const pos: number[] = [], uv: number[] = [], idx: number[] = [];
      for (let i = 0; i <= N; i++) { const x = -W / 2 + W * i / N, yb = bottom(x), yt = Math.max(top(x), yb); for (let j = 0; j <= M; j++) { const y = mix(yb, yt, j / M); pos.push(...P(x, y, off)); uv.push(x / W + 0.5, y / H + 0.5); } }
      for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const p = i * (M + 1) + j, q = p + M + 1; if (flip) idx.push(p, q + 1, q, p, p + 1, q + 1); else idx.push(p, q, q + 1, p, q + 1, p + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      return g;
    };
    const rimGeo = () => {
      const loop: [number, number][] = [];
      for (let i = 0; i <= N; i++) { const x = -W / 2 + W * i / N; loop.push([x, Math.max(top(x), bottom(x))]); }
      for (let i = N; i >= 0; i--) { const x = -W / 2 + W * i / N; loop.push([x, bottom(x)]); }
      const pos: number[] = [], idx: number[] = [];
      loop.forEach(([x, y]) => pos.push(...P(x, y, 0), ...P(x, y, -TH)));
      for (let k = 0; k < loop.length; k++) { const p = k * 2, q = ((k + 1) % loop.length) * 2; idx.push(p, q, q + 1, p, q + 1, p + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      return g;
    };

    const steel = s.material('#8b9296', { roughness: 0.4, metalness: 0.75 });
    const dark = s.material('#2c2f32', { roughness: 0.6, metalness: 0.4 });
    const timber = s.material('#b08a55', { roughness: 0.85 });
    const yellow = s.material('#e0ac1b', { roughness: 0.55, metalness: 0.2 });
    const polished = a.story === 'retired';

    const tilt = a.stand === 'drums' ? 0.3 : 0.2;
    const ledgeY = { easel: 0.72, rack: 0.5, drums: 0.12 }[a.stand];
    const G = group(R, [0, 0, 0.3], [-tilt, 0, 0]);
    const plate = group(G, [0, ledgeY + H / 2, 0], [0, 0, a.stand === 'drums' ? (random() - 0.5) * 0.12 : (random() - 0.5) * 0.02]);
    add(plate, face(0, false), new THREE.MeshStandardMaterial({ map: front, alphaTest: 0.5, roughness: polished ? 0.38 : mix(0.6, 0.92, mood.wear), metalness: 0.2 }));
    add(plate, face(-TH, true), new THREE.MeshStandardMaterial({ map: back, alphaTest: 0.5, roughness: 0.85 }));
    add(plate, rimGeo(), new THREE.MeshStandardMaterial({ color: '#7f868a', roughness: 0.45, metalness: 0.7, side: THREE.DoubleSide }));
    // Lifting eyes on the top edge and mounting lugs behind.
    const tags: THREE.Object3D[] = [];
    for (const sx of [-1, 1]) {
      const lx = sx * 0.55, p = P(lx, top(lx), -TH / 2);
      add(plate, new THREE.TorusGeometry(0.055, 0.018, 6, 14), steel, [p[0], p[1] + 0.05, p[2]], [0, sx * -0.4, 0]);
      const q = P(lx, 0.1, -TH - 0.06);
      box(plate, [0.14, 0.3, 0.12], q, dark, [0, lx / shape.r, 0]);
    }

    // Stand.
    const legArc = 0.5, legX = shape.r * Math.sin(legArc / shape.r);
    const legZ = shape.r * (Math.cos(legArc / shape.r) - 1) - TH - shape.cy * (H / 2) ** 2 - 0.1;
    const topY = ledgeY + H + 0.22;
    G.updateMatrix();
    const out = (v: V): V => new THREE.Vector3(v[0], v[1], v[2]).applyMatrix4(G.matrix).toArray() as unknown as V;
    if (a.stand === 'easel') {
      for (const sx of [-1, 1]) box(G, [0.09, topY + 0.1, 0.06], [sx * legX, (topY + 0.1) / 2 - 0.05, legZ], timber);
      box(G, [0.09, topY + 0.35, 0.05], [0, (topY + 0.35) / 2, legZ - 0.02], timber);
      box(G, [legX * 2 + 0.3, 0.08, 0.05], [0, topY - 0.1, legZ + 0.05], timber);
      box(G, [legX * 2 + 0.5, 0.07, 0.16 - legZ], [0, ledgeY - 0.035, (legZ + 0.16) / 2], timber);
      box(G, [legX * 2 + 0.5, 0.11, 0.035], [0, ledgeY + 0.01, 0.16], timber);
      const hinge = out([0, topY - 0.05, legZ - 0.05]);
      const prop = rod(R, hinge, [0, 0, hinge[2] - 1.0], 0.035, timber, 6); prop.scale.set(1.3, 1, 0.8);
      rod(R, out([0, ledgeY - 0.05, legZ]), [0, hinge[1] * 0.3, mix(hinge[2], hinge[2] - 1.0, 0.7)], 0.012, dark, 5);
    } else if (a.stand === 'rack') {
      for (const sx of [-1, 1]) {
        rod(G, [sx * legX, 0.1, legZ], [sx * legX, topY, legZ], 0.035, yellow);
        const hinge = out([sx * legX, topY - 0.3, legZ]);
        rod(R, hinge, [sx * 0.8, 0.16, -0.85], 0.03, yellow);
        rod(R, [sx * 0.8, 0.16, -0.85], [sx * 0.8, 0.16, 0.75], 0.035, yellow);
        rod(R, out([sx * legX, 0.12, legZ]), [sx * 0.8, 0.16, 0.3], 0.03, yellow);
        for (const z of [-0.8, 0.7]) { cyl(R, 0.075, 0.075, 0.05, [sx * 0.8, 0.075, z], dark, [0, 0, Math.PI / 2], 12); box(R, [0.07, 0.08, 0.1], [sx * 0.8, 0.13, z], steel); }
      }
      rod(R, [-0.8, 0.16, -0.85], [0.8, 0.16, -0.85], 0.035, yellow); rod(R, [-0.8, 0.16, 0.75], [0.8, 0.16, 0.75], 0.035, yellow);
      rod(G, [-legX, topY, legZ], [legX, topY, legZ], 0.035, yellow);
      box(G, [legX * 2 + 0.4, 0.06, 0.2 - legZ], [0, ledgeY - 0.03, (legZ + 0.2) / 2], yellow);
      box(G, [legX * 2 + 0.4, 0.12, 0.03], [0, ledgeY + 0.02, 0.2], dark);
    } else {
      for (const sx of [-1, 1]) {
        box(R, [0.16, 0.12, 0.9], [sx * 0.45, 0.06, 0.3], timber, [0, (random() - 0.5) * 0.3, 0]);
        const lean = out([sx * legX, ledgeY + 0.85, legZ + 0.08]);
        const drumTone = s.material(sx < 0 ? '#2f5f7c' : '#a4432c', { roughness: 0.6, metalness: 0.3 });
        const dx = sx * (0.42 + random() * 0.1), dz = lean[2] - 0.34;
        cyl(R, 0.3, 0.3, 0.9, [dx, 0.45, dz], drumTone, [0, random() * 3, 0], 20);
        for (const y of [0.02, 0.3, 0.6, 0.88]) cyl(R, 0.31, 0.31, 0.03, [dx, y, dz], drumTone, [0, 0, 0], 20);
        cyl(R, 0.03, 0.03, 0.03, [dx + 0.15, 0.91, dz + 0.1], dark, [0, 0, 0], 8);
      }
    }

    // What the story leaves around its foot.
    const flames: THREE.Mesh[] = [];
    const fz = 0.75 + (a.stand === 'rack' ? 0.35 : 0);
    const many = (lo: number, hi: number) => Math.round(mix(lo, hi, mood.density) + random() * 0.99 - 0.5);
    if (a.story === 'painting') {
      const cloth = box(R, [2.3, 0.012, 1.3], [0.1, 0.006, fz + 0.15], new THREE.MeshStandardMaterial({ color: '#d9d4c3', roughness: 1 }), [0, (random() - 0.5) * 0.3, 0]);
      cloth.castShadow = false;
      const tints = ['#c8241d', '#f1ecdc', '#e3b93a', '#213a6b', '#141414', '#3f7a36'];
      const tins = many(2, 6);
      for (let i = 0; i < tins; i++) {
        const x = mix(-0.9, 0.9, random()), z = fz + mix(-0.25, 0.5, random()), tint = tints[(i + Math.floor(random() * 6)) % 6];
        cyl(R, 0.085, 0.085, 0.13, [x, 0.077, z], steel, [0, 0, 0], 14);
        cyl(R, 0.075, 0.075, 0.01, [x, 0.143, z], new THREE.MeshStandardMaterial({ color: tint, roughness: 0.25 }), [0, 0, 0], 14);
        const sp = cyl(R, 0.06 + random() * 0.08, 0.06, 0.004, [x + (random() - 0.5) * 0.4, 0.016, z + (random() - 0.5) * 0.3], new THREE.MeshStandardMaterial({ color: tint, roughness: 0.3 }), [0, 0, 0], 10); sp.castShadow = false;
        if (i === 0) { box(R, [0.03, 0.02, 0.26], [x, 0.155, z], timber, [0, random() * 3, 0]); }
      }
      // A stool with the brush pot on it.
      const sx = (random() < 0.5 ? -1 : 1) * 0.85;
      cyl(R, 0.17, 0.17, 0.04, [sx, 0.5, fz - 0.1], timber, [0, 0, 0], 14);
      for (let i = 0; i < 3; i++) rod(R, [sx + Math.cos(i * 2.1) * 0.1, 0.5, fz - 0.1 + Math.sin(i * 2.1) * 0.1], [sx + Math.cos(i * 2.1) * 0.2, 0, fz - 0.1 + Math.sin(i * 2.1) * 0.2], 0.018, timber, 6);
      cyl(R, 0.06, 0.05, 0.12, [sx, 0.58, fz - 0.1], s.material('#5d7f8c'), [0, 0, 0], 12);
      for (let i = 0; i < 3; i++) rod(R, [sx, 0.6, fz - 0.1], [sx + (random() - 0.5) * 0.14, 0.8, fz - 0.1 + (random() - 0.5) * 0.14], 0.008, timber, 5);
    } else if (a.story === 'servicing') {
      const tray = group(R, [mix(-0.6, 0.6, random()), 0, fz], [0, (random() - 0.5) * 0.8, 0]);
      box(tray, [0.7, 0.03, 0.36], [0, 0.015, 0], dark);
      for (const z of [-0.18, 0.18]) box(tray, [0.7, 0.07, 0.02], [0, 0.05, z], s.material('#b3261e'));
      for (const x of [-0.35, 0.35]) box(tray, [0.02, 0.07, 0.36], [x, 0.05, 0], s.material('#b3261e'));
      const tools = many(2, 6);
      for (let i = 0; i < tools; i++) { const z = -0.12 + i * 0.05; rod(tray, [-0.28 + random() * 0.1, 0.045, z], [0.2 + random() * 0.1, 0.045, z + (random() - 0.5) * 0.04], 0.012, steel, 6); }
      const bolts = many(3, 12);
      for (let i = 0; i < bolts; i++) { const x = mix(-1, 1, random()), z = fz + mix(-0.3, 0.45, random()); cyl(R, 0.035, 0.035, 0.03, [x, 0.015, z], steel, [0, random(), 0], 6); cyl(R, 0.018, 0.018, 0.1, [x, 0.05, z], steel, [0, 0, 0], 6); }
      // A red tag wired to one lifting eye, and a job sheet on the stand.
      const lug = P(-0.55, top(-0.55), 0.03);
      const tag = group(plate, [lug[0], lug[1] + 0.02, lug[2] + 0.02]);
      rod(tag, [0, 0, 0], [0, -0.16, 0.01], 0.004, dark, 4);
      box(tag, [0.13, 0.22, 0.006], [0, -0.27, 0.012], new THREE.MeshStandardMaterial({ color: '#d5281f', roughness: 0.7 }));
      tags.push(tag);
      const sheet = out([legX + 0.02, ledgeY - 0.3, 0.2]);
      if (a.stand !== 'drums') { box(R, [0.24, 0.32, 0.015], [sheet[0], Math.max(0.3, sheet[1]), sheet[2]], s.material('#7b5a35'), [-tilt, 0, 0.06]); box(R, [0.2, 0.26, 0.004], [sheet[0], Math.max(0.3, sheet[1]) - 0.01, sheet[2] + 0.012], s.material('#f1efe6'), [-tilt, 0, 0.06]); }
    } else if (a.story === 'holed') {
      const bits = many(5, 16);
      const flake = new THREE.MeshStandardMaterial({ color: `#${base.getHexString()}`, roughness: 0.9 });
      for (let i = 0; i < bits; i++) box(R, [0.04 + random() * 0.12, 0.012, 0.03 + random() * 0.09], [mix(-0.8, 0.8, random()), 0.008, fz + mix(-0.35, 0.4, random())], i % 3 ? flake : dark, [0, random() * 3, 0]);
      const tarp = box(R, [2.1, 0.012, 1.5], [0, 0.006, 0.45], s.material('#5b6a4e', { roughness: 1 }), [0, (random() - 0.5) * 0.2, 0]); tarp.castShadow = false;
    } else if (a.story === 'memorial') {
      const candles = many(2, 9);
      const wax = new THREE.MeshStandardMaterial({ color: '#f1ead6', roughness: 0.6 });
      const fire = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff9a2e', emissiveIntensity: mix(1.2, 3, mood.warmth) });
      for (let i = 0; i < candles; i++) {
        const x = mix(-0.95, 0.95, random()), z = fz + mix(-0.3, 0.35, random()), hgt = 0.08 + random() * 0.2;
        cyl(R, 0.03, 0.033, hgt, [x, hgt / 2, z], wax, [0, 0, 0], 8);
        const f = add(R, new THREE.ConeGeometry(0.018, 0.06, 6), fire, [x, hgt + 0.035, z]); f.castShadow = false; flames.push(f);
      }
      const bloom = mood.cheer > 0.5 ? ['#f4efe2', '#e7a81c', '#d4505a'] : ['#f4efe2', '#e9e4d0', '#b9a7c9'];
      const bunches = many(1, 4);
      for (let b = 0; b < bunches; b++) {
        const g = group(R, [mix(-0.8, 0.8, random()), 0.03, fz + mix(-0.1, 0.5, random())], [0, random() * 6, 0]);
        for (let i = 0; i < 6; i++) { const z = (i - 2.5) * 0.035; rod(g, [-0.22, 0.01, z * 0.3], [0.16, 0.03 + random() * 0.04, z * 1.8], 0.007, s.material('#3f7a36'), 4); ball(g, [0.045, 0.035, 0.045], [0.17, 0.04 + random() * 0.04, z * 1.8], s.material(bloom[i % 3]), 8); }
        box(g, [0.14, 0.05, 0.1], [-0.1, 0.03, 0], s.material('#e9e4d0'));
      }
      const hx = (random() < 0.5 ? -1 : 1) * mix(0.3, 0.75, random());
      const helm = group(R, [hx, 0, fz + 0.1], [0, -hx * 0.5, 0]);
      ball(helm, [0.2, 0.2, 0.23], [0, 0.2, 0], s.material('#eeeeea', { roughness: 0.3 }), 16);
      add(helm, new THREE.SphereGeometry(0.205, 14, 8, Math.PI * 0.08, Math.PI * 0.84, Math.PI * 0.32, Math.PI * 0.3), new THREE.MeshStandardMaterial({ color: '#16191c', metalness: 0.8, roughness: 0.15 }), [0, 0.2, 0.035]);
      cyl(helm, 0.17, 0.15, 0.04, [0, 0.02, 0], dark, [0, 0, 0], 12);
    } else {
      const brass = new THREE.MeshStandardMaterial({ color: '#c9a246', roughness: 0.25, metalness: 0.9 });
      const rope = new THREE.MeshStandardMaterial({ color: '#8c1f24', roughness: 0.9 });
      const posts: V[] = [[-1.25, 0, fz + 0.45], [1.25, 0, fz + 0.45]];
      for (const p of posts) { cyl(R, 0.16, 0.18, 0.04, [p[0], 0.02, p[2]], brass, [0, 0, 0], 16); cyl(R, 0.025, 0.025, 0.95, [p[0], 0.5, p[2]], brass, [0, 0, 0], 10); ball(R, [0.055, 0.055, 0.055], [p[0], 0.99, p[2]], brass, 10); }
      tube(R, [[-1.25, 0.92, fz + 0.45], [-0.6, 0.72, fz + 0.47], [0, 0.66, fz + 0.48], [0.6, 0.72, fz + 0.47], [1.25, 0.92, fz + 0.45]], 0.022, rope);
      // A plaque on a short post.
      const px = mix(-0.5, 0.5, random());
      rod(R, [px, 0, fz + 0.1], [px, 0.7, fz + 0.1], 0.02, brass, 8);
      cyl(R, 0.12, 0.14, 0.03, [px, 0.015, fz + 0.1], brass, [0, 0, 0], 12);
      const plaque = paint(256, 160, (ctx, w, h) => { ctx.fillStyle = '#c9a246'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#5b4516'; ctx.lineWidth = 6; ctx.strokeRect(8, 8, w - 16, h - 16); stencil(ctx, NAMES[a.name] || `UNIT ${unit}`, w / 2, 52, 30, '#3a2b0c', 'center', w - 36); ctx.fillStyle = '#5b4516'; for (let i = 0; i < 3; i++) ctx.fillRect(40, 86 + i * 20, w - 80 - i * 30, 6); });
      box(R, [0.42, 0.27, 0.02], [px, 0.72, fz + 0.1], brass, [-0.5, 0, 0]);
      const pl = add(R, new THREE.PlaneGeometry(0.4, 0.25), new THREE.MeshStandardMaterial({ map: plaque, roughness: 0.3, metalness: 0.6 }), [px, 0.725, fz + 0.112], [-0.5, 0, 0]); pl.castShadow = false;
    }

    return s.finish({
      update: (_dt, time) => {
        flames.forEach((f, i) => { const k = 1 + Math.sin(time * mix(5, 14, mood.energy) + i * 2.3) * mix(0.08, 0.3, mood.energy); f.scale.set(1, k, 1); });
        for (const t of tags) t.rotation.z = Math.sin(time * mix(0.6, 2.2, mood.energy)) * mix(0.02, 0.2, mood.energy);
      },
    });
  },
});
