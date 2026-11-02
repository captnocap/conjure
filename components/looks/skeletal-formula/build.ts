import { type Palette, type PaletteRole, choice, clamp01, defineLook, fromOklch, mix, oklch, rekey, rekeyOne, score, seeded } from '@conjure/kit';

/**
 * The scene redrawn as chemistry. Every silhouette and crease becomes a zig-zag carbon chain,
 * every surface is tiled with a honeycomb of rings that packs closer where the plain-lit pass is
 * dark (or, on a dark sheet, where it is lit), ground and walls carry their lattice foreshortened
 * by their own normal, bonds that run steeply into depth become wedges and hashes, and the free
 * stretches of floor and wall hold large drawn skeletons (indole, tryptamine, ergoline,
 * phenethylamine) with structure-sheet annotations.
 */

type RGB = readonly [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const css = ([r, g, b]: RGB) => `rgb(${r | 0},${g | 0},${b | 0})`;
const toHex = (c: RGB) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const lerpRGB = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const smooth = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / Math.max(1e-6, e1 - e0));
  return t * t * (3 - 2 * t);
};
const SQ3 = Math.sqrt(3);
const DEG = Math.PI / 180;
const SANS = 'Helvetica, Arial, "Liberation Sans", "DejaVu Sans", sans-serif';
const HAND = '"Segoe Print", "Bradley Hand", "Comic Neue", "Comic Sans MS", "DejaVu Sans", cursive';

// ---- sheets ---------------------------------------------------------------------------------
interface Sheet {
  name: string;
  description: string;
  paper: string;
  paperWarm: string;
  ink: string;
  fill: string;
  label: string;
  motif: string;
  accent: string;
  dark: boolean;
  chalk?: boolean;
  grid?: 'blueprint' | 'graph';
  fountain?: boolean;
  hand?: boolean;
}
const SHEETS = {
  textbook: {
    name: 'textbook plate', description: 'A textbook plate: crisp black bond lines on white paper, a little grey fill in the rings and one spot colour, like a page of an organic chemistry text.',
    paper: '#f7f7f4', paperWarm: '#f4eddb', ink: '#151515', fill: '#3c3c3c', label: '#151515', motif: '#151515', accent: '#b0262a', dark: false,
  },
  chalkboard: {
    name: 'chalkboard', description: 'A lecture-hall chalkboard: chalky white and coloured-chalk structures on a dark painted board, smudged with old erasing.',
    paper: '#2c4a3d', paperWarm: '#33483a', ink: '#ebe7da', fill: '#ebe7da', label: '#f2d465', motif: '#f2d465', accent: '#f2a6a0', dark: true, chalk: true, hand: true,
  },
  blueprint: {
    name: 'blueprint', description: 'A blueprint: white lines on a deep, saturated ground with a faint drafting grid, as if the scene were an engineered compound.',
    paper: '#173f78', paperWarm: '#1d4376', ink: '#f1f5ff', fill: '#cddcff', label: '#ffffff', motif: '#ffffff', accent: '#ffe08a', dark: true, grid: 'blueprint',
  },
  blacklight: {
    name: 'black-light sheet', description: 'A psychedelic sheet: rings filled with saturated, clashing gradient inks glowing on black like a black-light poster.',
    paper: '#0b0a0d', paperWarm: '#0e0a0a', ink: '#fff3da', fill: '#ffffff', label: '#ffe83a', motif: '#ffe83a', accent: '#ff3d8b', dark: true,
  },
  notebook: {
    name: 'lab notebook', description: 'A lab notebook page: ballpoint structures on pale graph paper, a contrasting margin line, worked out by hand.',
    paper: '#f6f6f0', paperWarm: '#f5f0e0', ink: '#22348c', fill: '#22348c', label: '#22348c', motif: '#22348c', accent: '#c42d2d', dark: false, grid: 'graph', hand: true,
  },
  fountain: {
    name: 'split-fountain print', description: 'A split-fountain poster print: one pass of ink blending from one colour into its answer across pale stock, sixties concert-poster style.',
    paper: '#f3ead5', paperWarm: '#f2e3c6', ink: '#000000', fill: '#000000', label: '#000000', motif: '#000000', accent: '#000000', dark: false, fountain: true,
  },
} satisfies Record<string, Sheet>;

const describe = <T extends Record<string, { description: string }>>(table: T) =>
  Object.fromEntries(Object.entries(table).map(([key, entry]) => [key, entry.description])) as Record<keyof T & string, string>;

const POSTER_JOY = ['#ff2d78', '#ff8a12', '#ffe21f', '#5cf23a', '#12d6b5', '#ff47d0'].map(hex);
const POSTER_GRIM = ['#b8142c', '#ff5a14', '#d8c21c', '#3fa83a', '#a3125e', '#ff8a3c'].map(hex);
const FOUNTAIN = ['#cf1259', '#e8401c', '#e27a12', '#1c9677', '#2759a8'].map(hex);

/**
 * How each sheet takes the picture's palette: its stock tints to the ground, its coloured inks to the
 * ink and second. White chalk and blueprint lines, black textbook and fountain lines stay as they are.
 */
type SheetColour = 'paper' | 'paperWarm' | 'ink' | 'fill' | 'label' | 'motif' | 'accent';
const SHEET_ROLES: Record<string, Partial<Record<SheetColour, PaletteRole>>> = {
  textbook: { paper: 'ground', paperWarm: 'ground', accent: 'ink' },
  chalkboard: { paper: 'ground', paperWarm: 'ground', label: 'ink', motif: 'ink', accent: 'second' },
  blueprint: { paper: 'ground', paperWarm: 'ground', fill: 'ink', accent: 'second' },
  blacklight: { paper: 'ground', paperWarm: 'ground', label: 'ink', motif: 'ink', accent: 'second' },
  notebook: { paper: 'ground', paperWarm: 'ground', ink: 'ink', fill: 'ink', label: 'ink', motif: 'ink', accent: 'second' },
  fountain: { paper: 'ground', paperWarm: 'ground' },
};
/** Poster gradient inks: the warm run takes the ink and the cool pair the second, each keeping its spread. */
const POSTER_JOY_ROLES: PaletteRole[] = ['ink', 'ink', 'ink', 'second', 'second', 'ink'];
const POSTER_GRIM_ROLES: PaletteRole[] = ['ink', 'ink', 'ink', 'second', 'ink', 'ink'];
/** The fountain blends from the ink's run into the second's. */
const FOUNTAIN_ROLES: PaletteRole[] = ['ink', 'ink', 'ink', 'second', 'second'];
function rekeyList(colours: RGB[], palette: Palette | undefined, roles: PaletteRole[]): RGB[] {
  if (!palette) return colours;
  const out = rekey(Object.fromEntries(colours.map((c, i) => [i, c])), palette, Object.fromEntries(roles.map((r, i) => [i, r])));
  return colours.map((_, i) => out[i]);
}
function rekeySheet(sheet: Sheet, palette: Palette | undefined, roles: Partial<Record<SheetColour, PaletteRole>>): Sheet {
  if (!palette) return sheet;
  const keys = Object.keys(roles) as SheetColour[];
  const out = rekey(Object.fromEntries(keys.map((k) => [k, hex(sheet[k])])), palette, roles);
  return { ...sheet, ...Object.fromEntries(keys.map((k) => [k, toHex(out[k])])) };
}

// ---- molecules ------------------------------------------------------------------------------
interface MAtom { x: number; y: number; el?: string; h?: string }
interface MBond { a: number; b: number; o: number; ring: number; st?: 'w' | 'h' }
class Mol {
  atoms: MAtom[] = [];
  bonds: MBond[] = [];
  rings: { ids: number[]; cx: number; cy: number }[] = [];
  note = '';
  noteAt = -1;
  constructor(readonly name: string, readonly iupac: string, readonly formula: string, readonly mw: string) {}
  add(x: number, y: number) {
    for (let i = 0; i < this.atoms.length; i++) {
      const a = this.atoms[i];
      if (Math.hypot(a.x - x, a.y - y) < 0.3) {
        a.x = (a.x + x) / 2;
        a.y = (a.y + y) / 2;
        return i;
      }
    }
    this.atoms.push({ x, y });
    return this.atoms.length - 1;
  }
  find(a: number, b: number) {
    return this.bonds.find((bd) => (bd.a === a && bd.b === b) || (bd.a === b && bd.b === a));
  }
  bond(a: number, b: number, o = 1) {
    const found = this.find(a, b);
    if (found) return found;
    const bd: MBond = { a, b, o, ring: -1 };
    this.bonds.push(bd);
    return bd;
  }
  poly(n: number, a?: number, b?: number): number[] {
    let pts: [number, number][];
    if (a === undefined || b === undefined) {
      const R = 1 / (2 * Math.sin(Math.PI / n));
      pts = Array.from({ length: n }, (_, k) => [R * Math.cos(-Math.PI / 2 + (2 * Math.PI * k) / n), R * Math.sin(-Math.PI / 2 + (2 * Math.PI * k) / n)]);
    } else {
      const A = this.atoms[a], B = this.atoms[b];
      const host = this.rings.find((r) => r.ids.includes(a) && r.ids.includes(b));
      const ref = host ? [host.cx, host.cy] : [this.atoms.reduce((s, t) => s + t.x, 0) / this.atoms.length, this.atoms.reduce((s, t) => s + t.y, 0) / this.atoms.length];
      const build = (sign: number) => {
        const out: [number, number][] = [[A.x, A.y], [B.x, B.y]];
        let phi = Math.atan2(B.y - A.y, B.x - A.x);
        for (let k = 0; k < n - 2; k++) {
          phi += (sign * 2 * Math.PI) / n;
          const last = out[out.length - 1];
          out.push([last[0] + Math.cos(phi), last[1] + Math.sin(phi)]);
        }
        return out;
      };
      const centre = (p: [number, number][]) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
      const p1 = build(1), p2 = build(-1);
      const c1 = centre(p1), c2 = centre(p2);
      pts = Math.hypot(c1[0] - ref[0], c1[1] - ref[1]) > Math.hypot(c2[0] - ref[0], c2[1] - ref[1]) ? p1 : p2;
    }
    const ids = pts.map(([x, y]) => this.add(x, y));
    const r = this.rings.length;
    for (let k = 0; k < n; k++) {
      const bd = this.bond(ids[k], ids[(k + 1) % n]);
      if (bd.ring < 0) bd.ring = r;
    }
    this.rings.push({ ids, cx: ids.reduce((s, i) => s + this.atoms[i].x, 0) / n, cy: ids.reduce((s, i) => s + this.atoms[i].y, 0) / n });
    return ids;
  }
  dbl(a: number, b: number) {
    const bd = this.find(a, b);
    if (bd) bd.o = 2;
  }
  out(i: number) {
    let x = 0, y = 0;
    for (const bd of this.bonds) {
      const j = bd.a === i ? bd.b : bd.b === i ? bd.a : -1;
      if (j < 0) continue;
      const dx = this.atoms[i].x - this.atoms[j].x, dy = this.atoms[i].y - this.atoms[j].y, l = Math.hypot(dx, dy) || 1;
      x += dx / l;
      y += dy / l;
    }
    return Math.atan2(y, x) / DEG;
  }
  branch(from: number, angle: number, o = 1) {
    const a = this.atoms[from];
    const id = this.add(a.x + Math.cos(angle * DEG), a.y + Math.sin(angle * DEG));
    this.bond(from, id, o);
    return id;
  }
  chain(from: number, angle: number, n: number, turn = 1) {
    const ids = [from];
    for (let k = 0; k < n; k++) ids.push(this.branch(ids[ids.length - 1], angle + (k % 2 ? -60 * turn : 0)));
    return ids;
  }
  lab(i: number, el: string, h = '') {
    this.atoms[i].el = el;
    this.atoms[i].h = h;
  }
  /** Alternating double bonds over the given atoms: a perfect matching found by backtracking. */
  kekule(ids: number[]) {
    const set = new Set(ids);
    const matched = new Set<number>();
    const pairs: [number, number][] = [];
    const nb = (i: number) => this.bonds.filter((bd) => (bd.a === i || bd.b === i) && set.has(bd.a) && set.has(bd.b)).map((bd) => (bd.a === i ? bd.b : bd.a));
    const solve = (): boolean => {
      const free = ids.find((i) => !matched.has(i));
      if (free === undefined) return true;
      for (const j of nb(free)) {
        if (matched.has(j)) continue;
        matched.add(free).add(j);
        pairs.push([free, j]);
        if (solve()) return true;
        pairs.pop();
        matched.delete(free);
        matched.delete(j);
      }
      return false;
    };
    if (solve()) for (const [a, b] of pairs) this.dbl(a, b);
  }
}

const benzeneCore = (m: Mol) => {
  const v = m.poly(6);
  return v;
};
const indoleCore = (m: Mol) => {
  const v = m.poly(6);
  const p = m.poly(5, v[1], v[2]);
  // p = [C3a, C7a, N1, C2, C3]
  m.lab(p[2], 'N', 'H');
  m.kekule([...v, p[3], p[4]]);
  return { v, N1: p[2], C2: p[3], C3: p[4] };
};
const tryptamine = (dimethyl: boolean, oh: number, name: string, iupac: string, formula: string, mw: string) => {
  const m = new Mol(name, iupac, formula, mw);
  const { v, C3 } = indoleCore(m);
  const ch = m.chain(C3, m.out(C3), 3, 1);
  const N = ch[3];
  if (dimethyl) {
    m.lab(N, 'N');
    const din = m.out(N);
    m.branch(N, din + 60);
    m.branch(N, din - 60);
  } else m.lab(N, 'N', 'H2');
  if (oh >= 0) m.lab(m.branch(v[oh], m.out(v[oh])), 'O', 'H');
  return m;
};
const phenethyl = (ohs: number[], methoxys: number[], name: string, iupac: string, formula: string, mw: string) => {
  const m = new Mol(name, iupac, formula, mw);
  const v = benzeneCore(m);
  m.kekule(v);
  const ch = m.chain(v[1], m.out(v[1]), 3, 1);
  m.lab(ch[3], 'N', 'H2');
  for (const k of ohs) m.lab(m.branch(v[k], m.out(v[k])), 'O', 'H');
  for (const k of methoxys) {
    const a = m.out(v[k]);
    const o = m.branch(v[k], a);
    m.lab(o, 'O');
    m.branch(o, a + (k % 2 ? 60 : -60));
  }
  return m;
};
const ergoline = (variant: 'lsd' | 'acid' | 'bare') => {
  const m =
    variant === 'lsd'
      ? new Mol('LSD', '(8β)-9,10-didehydro-N,N-diethyl-6-methylergoline-8-carboxamide', 'C20H25N3O', '323.44')
      : variant === 'acid'
        ? new Mol('lysergic acid', '(8β)-9,10-didehydro-6-methylergoline-8-carboxylic acid', 'C16H16N2O2', '268.31')
        : new Mol('ergoline', '4,6,6a,7,8,9,10,10a-octahydroindolo[4,3-fg]quinoline', 'C14H16N2', '212.29');
  const v = m.poly(6);
  const p = m.poly(5, v[1], v[2]);
  m.lab(p[2], 'N', 'H');
  const c = m.poly(6, v[0], v[1]); // [C.., C3a, C3, C4, C5, C10]
  const d = m.poly(6, c[4], c[3]); // [C10?, C5, N6, C7, C8, C9]
  m.kekule([...v, p[3], p[4]]);
  const N6 = d[2], C8 = d[4], C9 = d[5];
  if (variant === 'bare') m.lab(N6, 'N', 'H');
  else {
    m.lab(N6, 'N');
    m.branch(N6, m.out(N6));
    m.dbl(C9, d[0]);
    const a = m.out(C8);
    const cA = m.branch(C8, a);
    const bd = m.find(C8, cA);
    if (bd) bd.st = 'w';
    const O = m.branch(cA, a - 60, 2);
    m.lab(O, 'O');
    const X = m.branch(cA, a + 60);
    if (variant === 'lsd') {
      m.lab(X, 'N');
      const xa = a + 60;
      m.chain(X, xa - 60, 2, -1);
      m.chain(X, xa + 60, 2, 1);
    } else m.lab(X, 'O', 'H');
    m.note = '8β';
    m.noteAt = C8;
  }
  return m;
};
const caffeine = () => {
  const m = new Mol('caffeine', '1,3,7-trimethyl-3,7-dihydro-1H-purine-2,6-dione', 'C8H10N4O2', '194.19');
  const v = m.poly(6);
  const p = m.poly(5, v[1], v[2]); // [C5, C4, N9, C8, N7]
  m.lab(v[5], 'N');
  m.lab(v[3], 'N');
  m.lab(p[2], 'N');
  m.lab(p[4], 'N');
  m.dbl(v[1], v[2]);
  m.dbl(p[2], p[3]);
  m.lab(m.branch(v[0], m.out(v[0]), 2), 'O');
  m.lab(m.branch(v[4], m.out(v[4]), 2), 'O');
  m.branch(v[5], m.out(v[5]));
  m.branch(v[3], m.out(v[3]));
  m.branch(p[4], m.out(p[4]));
  return m;
};
const aspirin = () => {
  const m = new Mol('aspirin', '2-(acetyloxy)benzoic acid', 'C9H8O4', '180.16');
  const v = m.poly(6);
  m.kekule(v);
  const cA = m.branch(v[0], -90);
  m.lab(m.branch(cA, -150, 2), 'O');
  m.lab(m.branch(cA, -30), 'O', 'H');
  const oe = m.branch(v[5], -150);
  m.lab(oe, 'O');
  const cE = m.branch(oe, 150);
  m.lab(m.branch(cE, 90, 2), 'O');
  m.branch(cE, -150);
  return m;
};
const acene = (n: number, name: string, formula: string, mw: string) => {
  const m = new Mol(name, n === 1 ? 'benzene' : n === 2 ? 'naphthalene' : 'anthracene', formula, mw);
  let r = m.poly(6);
  const all = [...r];
  for (let k = 1; k < n; k++) {
    r = m.poly(6, r[k === 1 ? 1 : 3], r[k === 1 ? 2 : 4]);
    all.push(...r);
  }
  m.kekule([...new Set(all)]);
  return m;
};

const FAMILIES = {
  tryptamines: {
    description: 'Tryptamines: indole, tryptamine, DMT, psilocin and serotonin, the indole ring with its ethylamine tail.',
    make: () => [
      tryptamine(false, -1, 'tryptamine', '2-(1H-indol-3-yl)ethan-1-amine', 'C10H12N2', '160.22'),
      tryptamine(true, -1, 'DMT', '2-(1H-indol-3-yl)-N,N-dimethylethan-1-amine', 'C12H16N2', '188.27'),
      tryptamine(true, 0, 'psilocin', '3-[2-(dimethylamino)ethyl]-1H-indol-4-ol', 'C12H16N2O', '204.27'),
      tryptamine(false, 5, 'serotonin', '3-(2-aminoethyl)-1H-indol-5-ol', 'C10H12N2O', '176.22'),
      (() => { const m = new Mol('indole', '1H-indole', 'C8H7N', '117.15'); indoleCore(m); return m; })(),
    ],
  },
  ergolines: {
    description: 'Ergolines: the four fused rings of the ergot alkaloids, LSD and lysergic acid with the 8β amide on its wedge.',
    make: () => [ergoline('lsd'), ergoline('acid'), ergoline('bare')],
  },
  phenethylamines: {
    description: 'Phenethylamines: a benzene ring with an ethylamine chain, mescaline with its three methoxy arms, dopamine.',
    make: () => [
      phenethyl([], [], 'phenethylamine', '2-phenylethan-1-amine', 'C8H11N', '121.18'),
      phenethyl([], [3, 4, 5], 'mescaline', '2-(3,4,5-trimethoxyphenyl)ethan-1-amine', 'C11H17NO3', '211.26'),
      phenethyl([3, 4], [], 'dopamine', '4-(2-aminoethyl)benzene-1,2-diol', 'C8H11NO2', '153.18'),
    ],
  },
  everyday: {
    description: 'Everyday molecules: caffeine, aspirin, benzene and naphthalene, a kitchen-table chemistry.',
    make: () => [caffeine(), aspirin(), acene(1, 'benzene', 'C6H6', '78.11'), acene(2, 'naphthalene', 'C10H8', '128.17')],
  },
  polycyclic: {
    description: 'Polycyclic sheets: naphthalene, anthracene and long fused-ring ribbons, like soot, graphite and tar.',
    make: () => [acene(3, 'anthracene', 'C14H10', '178.23'), acene(2, 'naphthalene', 'C10H8', '128.17'), acene(3, 'anthracene', 'C14H10', '178.23')],
  },
  none: { description: 'No large structures: only the tiling and the chains of the scene itself.', make: () => [] as Mol[] },
} as const;

const SMALL = [
  () => { const m = new Mol('', '', '', ''); m.kekule(m.poly(6)); return m; },
  () => { const m = new Mol('', '', '', ''); m.poly(6); return m; },
  () => { const m = new Mol('', '', '', ''); const v = m.poly(5); m.lab(v[0], 'N', 'H'); m.dbl(v[1], v[2]); m.dbl(v[3], v[4]); return m; },
  () => { const m = new Mol('', '', '', ''); m.add(0, 0); const c = m.chain(0, -30, 4, 1); m.lab(c[4], 'O', 'H'); return m; },
  () => { const m = new Mol('', '', '', ''); const v = m.poly(6); m.kekule(v); const c = m.chain(v[1], m.out(v[1]), 2); m.lab(c[2], 'O'); m.dbl(c[1], c[2]); return m; },
];

// ---- drawing structures --------------------------------------------------------------------
interface Atom { x: number; y: number; el?: string; h?: string; fs: number; col: string; deg: number; val: number; nx: number; ny: number; ring: boolean }
interface Bond { a: number; b: number; o: number; cx: number; cy: number; side: boolean; st: 0 | 1 | 2 | 3; w: number; col: string }
interface Fill { pts: number[]; c1: string; c2?: string; cx: number; cy: number; r: number; alpha: number }
interface Text { text: string; x: number; y: number; fs: number; col: string; align: CanvasTextAlign; weight?: string; italic?: boolean; hand?: boolean; rich?: boolean; knock?: boolean }

class Layer {
  atoms: Atom[] = [];
  bonds: Bond[] = [];
  fills: Fill[] = [];
  circles: { pts: number[]; w: number; col: string }[] = [];
  polylines: { pts: number[]; w: number; col: string }[] = [];
  knocks: { x: number; y: number; r: number }[] = [];
  texts: Text[] = [];
  atom(x: number, y: number, fs: number, col: string) {
    this.atoms.push({ x, y, fs, col, deg: 0, val: 0, nx: 0, ny: 0, ring: false });
    return this.atoms.length - 1;
  }
  bond(a: number, b: number, w: number, col: string, o = 1) {
    const A = this.atoms[a], B = this.atoms[b];
    const dx = B.x - A.x, dy = B.y - A.y, l = Math.hypot(dx, dy) || 1;
    A.deg++; B.deg++;
    A.val += o; B.val += o;
    A.nx += dx / l; A.ny += dy / l;
    B.nx -= dx / l; B.ny -= dy / l;
    const bd: Bond = { a, b, o, cx: 0, cy: 0, side: false, st: 0, w, col };
    this.bonds.push(bd);
    return bd;
  }
}

export default defineLook({
  questions: {
    sheet: choice('What is the structure drawn on?', describe(SHEETS)),
    convention: choice('How are the bonds drawn?', {
      kekule: 'Kekulé rings with alternating double bonds, outlines as plain zig-zag carbon chains: the textbook default.',
      aromatic: 'Aromatic circles inside every ring, outlines as zig-zag chains: calm, round, modern.',
      conjugated: 'Every outline a conjugated polyene, zig-zags with alternating double bonds, like carotene: busy and electric.',
      saturated: 'Saturated rings without double bonds and many wedge and hashed stereo bonds, like a steroid or a sugar.',
      haworth: 'Haworth perspective: the near edge of each ring drawn bold so every surface lies back in space, wedges where forms turn away.',
    }),
    weight: score('How heavy are the bond lines?', ['Hairline', 'Fine', 'Standard', 'Bold', 'Heavy marker']),
    density: score('How densely do rings tile the surfaces?', ['Sparse: open chains, a few rings', 'Light', 'Balanced', 'Dense', 'Packed fused sheets like graphite']),
    labels: score('How many atom labels (N, O, OH, NH, CH3) sit at the vertices?', ['None: a bare carbon skeleton', 'A few', 'Some', 'Many', 'Crowded with heteroatoms']),
    fill: choice('How are the rings filled?', {
      none: 'Not at all: open line drawing, all shading from line density.',
      tone: 'A grey (or chalk-white) wash in the rings, deeper where the light falls away.',
      colour: 'Each ring tinted with the colour of the thing it lies on, like a hand-coloured plate.',
      gradient: 'Saturated gradient inks in every ring, banded around each object like a psychedelic poster.',
    }),
    motifs: choice('Which compounds are drawn large on the floor and walls?', Object.fromEntries(Object.entries(FAMILIES).map(([k, f]) => [k, f.description])) as Record<keyof typeof FAMILIES, string>),
    annotation: choice('How is the sheet annotated?', {
      none: 'Not at all: only the structures.',
      sheet: 'As a structure sheet: a plate title, the whole scene’s formula and weight, each compound captioned with its IUPAC name, a bond-length scale bar.',
      notebook: 'As a chemist’s working page: hand-written heading, a reaction arrow with reagents, the main thing circled with a query.',
      patent: 'As a patent drawing: FIG. 1, a sheet number, and every thing in the scene called out by a numbered leader line.',
    }),
    state: choice('What has happened to the sheet?', {
      fresh: 'Nothing: a fresh, clean sheet.',
      blotter: 'It has been perforated into a grid of tiny blotter tabs, and a corner of tabs has been torn away.',
      stained: 'It has been used: a coffee ring, a dog-eared corner, foxing.',
      erased: 'It was half erased: broad smeared swipes where the structures were wiped and drawn over.',
      folded: 'It was folded in quarters and carried in a pocket: two creases cross the sheet.',
    }),
  },

  async apply(capture, a, context, signal) {
    const N = capture.size, total = N * N, s = N / 720;
    const { mood, seed } = context;
    const random = seeded((seed ^ 0x6c0ffee) >>> 0);
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length) % list.length];
    const breathe = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      signal.throwIfAborted();
    };
    const sheet: Sheet = rekeySheet(SHEETS[a.sheet], context.palette, SHEET_ROLES[a.sheet] ?? {});
    // The fountain's run keeps its own depth so it still prints dark enough on the pale stock.
    const fountainInks = rekeyList(FOUNTAIN, context.palette, FOUNTAIN_ROLES).map((c, i) => {
      const [, C, h] = oklch(c);
      return context.palette ? fromOklch(oklch(FOUNTAIN[i])[0], C, h) : c;
    });
    const marginCol = context.palette ? toHex(rekeyOne(hex('#d05050'), context.palette, 'second')) : '#d05050';
    const graphCol: RGB = context.palette ? rekeyOne([120, 160, 215], context.palette, 'second') : [120, 160, 215];
    const dark = sheet.dark;
    const hash = (x: number, y: number, salt: number) => {
      let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((salt + seed) | 0, 1274126177);
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const noise = (x: number, y: number, salt: number) => {
      const ix = Math.floor(x), iy = Math.floor(y);
      let fx = x - ix, fy = y - iy;
      fx = fx * fx * (3 - 2 * fx);
      fy = fy * fy * (3 - 2 * fy);
      return mix(mix(hash(ix, iy, salt), hash(ix + 1, iy, salt), fx), mix(hash(ix, iy + 1, salt), hash(ix + 1, iy + 1, salt), fx), fy);
    };
    const cpk = !dark && !sheet.fountain && mood.cheer > 0.6;
    const elementColour = (el: string, base: string) => (cpk ? (el === 'O' ? '#c42027' : el === 'N' ? '#1f47b8' : base) : base);
    const inkCol = sheet.ink, labelCol = sheet.label, motifCol = sheet.motif;
    const joy = mood.cheer > 0.4;
    const palette = rekeyList(joy ? POSTER_JOY : POSTER_GRIM, context.palette, joy ? POSTER_JOY_ROLES : POSTER_GRIM_ROLES).slice();
    if (mood.warmth < 0.4) palette.reverse();

    // ---- read the capture -------------------------------------------------------------------
    const { identity, depth, diffuse, color, normal } = capture;
    const ID = new Uint8Array(total), D = new Float32Array(total), NX = new Float32Array(total), NY = new Float32Array(total), NZ = new Float32Array(total);
    const lit = new Float32Array(total), lum = new Float32Array(total);
    const histogram = new Uint32Array(256);
    let solid = 0;
    let maxId = 0;
    for (let at = 0; at < total; at++) {
      const o = at * 4;
      const id = identity[o];
      ID[at] = id;
      if (id > maxId) maxId = id;
      D[at] = (depth[o] + depth[o + 1] / 255 + depth[o + 2] / 65025) / 256;
      NX[at] = normal[o] / 127.5 - 1;
      NY[at] = normal[o + 1] / 127.5 - 1;
      NZ[at] = normal[o + 2] / 127.5 - 1;
      const plain = diffuse[o] * 0.3 + diffuse[o + 1] * 0.59 + diffuse[o + 2] * 0.11;
      lit[at] = plain;
      lum[at] = (color[o] * 0.2126 + color[o + 1] * 0.7152 + color[o + 2] * 0.0722) / 255;
      if (id >= 1) {
        histogram[Math.round(plain)]++;
        solid++;
      }
    }
    const percentile = (fraction: number) => {
      let seen = 0;
      for (let v = 0; v < 256; v++) {
        seen += histogram[v];
        if (seen >= solid * fraction) return v;
      }
      return 255;
    };
    const dim = percentile(0.03), bright = Math.max(dim + 12, percentile(0.88));
    const belonging = (id: number) => (id >= 3 ? (capture.confidence?.[id] ?? 1) : 1);
    /** 0 where the sheet stays bare, 1 where the marks pile up. */
    const MT = new Float32Array(total);
    const LIGHT = new Float32Array(total);
    for (let at = 0; at < total; at++) {
      const id = ID[at];
      if (!id) continue;
      const l = clamp01((lit[at] - dim) / (bright - dim));
      LIGHT[at] = l;
      const shade = clamp01(0.7 * (1 - l) + 0.3 * (1 - lum[at]));
      const value = dark ? clamp01(0.72 * l + 0.28 * lum[at]) : shade;
      MT[at] = Math.pow(value, 1.15) * mix(0.55, 1, belonging(id));
    }
    const depthWorld = capture.far - capture.near;
    await breathe();

    // ---- regions ----------------------------------------------------------------------------
    // Ground and set are split by the facing of their surfaces, so every wall and floor plane
    // carries its own foreshortened lattice; each thing is one region with rings sized to it.
    const BIN = new Uint8Array(total);
    const regionKey = (id: number, bin: number) => (id >= 3 ? id * 8 : id * 8 + bin);
    const keyToRegion = new Map<number, number>();
    interface Region { id: number; bin: number; area: number; x0: number; y0: number; x1: number; y1: number; sx: number; sy: number; nx: number; ny: number; nz: number; r: number; g: number; b: number; m: number }
    const regions: Region[] = [];
    const RG = new Int16Array(total).fill(-1);
    for (let at = 0; at < total; at++) {
      const id = ID[at];
      if (!id) continue;
      let bin = 0;
      if (id <= 2) {
        if (NZ[at] < 0.93) bin = 1 + (Math.floor(((Math.atan2(-NY[at], NX[at]) + Math.PI) / (2 * Math.PI)) * 6) % 6);
      }
      BIN[at] = bin;
      const key = regionKey(id, bin);
      let r = keyToRegion.get(key);
      if (r === undefined) {
        r = regions.length;
        keyToRegion.set(key, r);
        regions.push({ id, bin, area: 0, x0: N, y0: N, x1: 0, y1: 0, sx: 0, sy: 0, nx: 0, ny: 0, nz: 0, r: 0, g: 0, b: 0, m: 0 });
      }
      RG[at] = r;
      const R = regions[r];
      const x = at % N, y = (at / N) | 0;
      R.area++;
      if (x < R.x0) R.x0 = x;
      if (x > R.x1) R.x1 = x;
      if (y < R.y0) R.y0 = y;
      if (y > R.y1) R.y1 = y;
      R.sx += x; R.sy += y;
      R.nx += NX[at]; R.ny += NY[at]; R.nz += NZ[at];
      const o = at * 4;
      R.r += color[o]; R.g += color[o + 1]; R.b += color[o + 2];
      R.m += MT[at];
    }
    // Per thing: the pixel nearest its centroid, as an anchor for callouts.
    const thingArea = new Float64Array(maxId + 1), thingSX = new Float64Array(maxId + 1), thingSY = new Float64Array(maxId + 1);
    for (const R of regions) {
      thingArea[R.id] += R.area;
      thingSX[R.id] += R.sx;
      thingSY[R.id] += R.sy;
    }
    const anchor = new Int32Array(maxId + 1).fill(-1), anchorD = new Float64Array(maxId + 1).fill(1e18);
    for (let at = 0; at < total; at++) {
      const id = ID[at];
      if (!id || !thingArea[id]) continue;
      const x = at % N, y = (at / N) | 0;
      const d = (x - thingSX[id] / thingArea[id]) ** 2 + (y - thingSY[id] / thingArea[id]) ** 2;
      if (d < anchorD[id]) {
        anchorD[id] = d;
        anchor[id] = at;
      }
    }
    // Distance from any thing, for finding open floor and wall.
    const DIST = new Float32Array(total);
    for (let at = 0; at < total; at++) DIST[at] = ID[at] >= 3 ? 0 : 1e6;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const at = y * N + x;
        let d = DIST[at];
        if (x > 0) d = Math.min(d, DIST[at - 1] + 1);
        if (y > 0) {
          d = Math.min(d, DIST[at - N] + 1);
          if (x > 0) d = Math.min(d, DIST[at - N - 1] + 1.414);
          if (x < N - 1) d = Math.min(d, DIST[at - N + 1] + 1.414);
        }
        DIST[at] = d;
      }
    for (let y = N - 1; y >= 0; y--)
      for (let x = N - 1; x >= 0; x--) {
        const at = y * N + x;
        let d = DIST[at];
        if (x < N - 1) d = Math.min(d, DIST[at + 1] + 1);
        if (y < N - 1) {
          d = Math.min(d, DIST[at + N] + 1);
          if (x < N - 1) d = Math.min(d, DIST[at + N + 1] + 1.414);
          if (x > 0) d = Math.min(d, DIST[at + N - 1] + 1.414);
        }
        DIST[at] = d;
      }
    await breathe();

    // ---- canvases ---------------------------------------------------------------------------
    const makeCanvas = () => {
      const c = document.createElement('canvas');
      c.width = c.height = N;
      return c.getContext('2d', { willReadFrequently: true })!;
    };
    const planeCtx = makeCanvas(), thingCtx = makeCanvas(), topCtx = makeCanvas();
    const planes = new Layer(), things = new Layer(), top = new Layer();
    const RES = new Uint8Array(total);
    const reserveDisc = (cx: number, cy: number, r: number) => {
      for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(N - 1, Math.ceil(cy + r)); y++)
        for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(N - 1, Math.ceil(cx + r)); x++)
          if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) RES[y * N + x] = 1;
    };
    const reserveRect = (x0: number, y0: number, x1: number, y1: number) => {
      for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(N - 1, Math.ceil(y1)); y++)
        for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(N - 1, Math.ceil(x1)); x++) RES[y * N + x] = 1;
    };

    const W = mix(0.65, 2.5, a.weight) * s * (sheet.chalk ? 1.35 : 1);
    const dens = a.density;
    const hand = !!sheet.hand;
    const fontOf = (t: { fs: number; weight?: string; italic?: boolean; hand?: boolean }) =>
      `${t.italic ? 'italic ' : ''}${t.weight ?? '400'} ${Math.round(t.fs)}px ${t.hand ? HAND : SANS}`;
    const textWidth = (text: string, fs: number, weight = '400', isHand = false) => {
      topCtx.font = fontOf({ fs, weight, hand: isHand });
      return topCtx.measureText(text).width;
    };

    // Plane foreshortening for a region: rotate, then squash along the projected normal.
    const planeMatrix = (R: Region | null, theta: number, minF: number) => {
      const c = Math.cos(theta), sn = Math.sin(theta);
      let m00 = c, m01 = -sn, m10 = sn, m11 = c;
      if (R) {
        const l = Math.hypot(R.nx, R.ny, R.nz) || 1;
        const ux0 = R.nx / l, uy0 = -R.ny / l, nz = Math.abs(R.nz / l);
        const ul = Math.hypot(ux0, uy0);
        if (ul > 0.05) {
          const ux = ux0 / ul, uy = uy0 / ul, f = Math.max(minF, Math.min(1, nz));
          const f00 = 1 + (f - 1) * ux * ux, f01 = (f - 1) * ux * uy, f11 = 1 + (f - 1) * uy * uy;
          [m00, m01, m10, m11] = [f00 * m00 + f01 * m10, f00 * m01 + f01 * m11, f01 * m00 + f11 * m10, f01 * m01 + f11 * m11];
        }
      }
      return [m00, m01, m10, m11] as const;
    };

    // ---- motifs and layout -----------------------------------------------------------------
    interface Placed { mol: Mol; cx: number; cy: number; bm: number; M: readonly [number, number, number, number]; R: number; ox: number; oy: number }
    const placed: Placed[] = [];
    const titleBlock = { x: 0, y: 0, w: 0, h: 0, corner: -1, on: a.annotation !== 'none' };
    const margin = 16 * s;
    if (titleBlock.on) {
      titleBlock.w = (a.annotation === 'patent' ? 0.3 : 0.44) * N;
      titleBlock.h = (a.annotation === 'sheet' ? 0.13 : 0.09) * N;
      const corners = [
        [margin, margin], [N - margin - titleBlock.w, margin],
        [margin, N - margin - titleBlock.h], [N - margin - titleBlock.w, N - margin - titleBlock.h],
      ];
      let best = 0, bestScore = -1;
      corners.forEach(([x0, y0], k) => {
        let free = 0, n = 0;
        for (let y = y0; y < y0 + titleBlock.h; y += 4 * s)
          for (let x = x0; x < x0 + titleBlock.w; x += 4 * s) {
            const at = (Math.min(N - 1, y | 0)) * N + Math.min(N - 1, x | 0);
            n++;
            if (ID[at] === 0) free += 1;
            else if (ID[at] <= 2) free += 0.55 - MT[at] * 0.4;
          }
        const sc = free / Math.max(1, n) + random() * 0.05 + (k < 2 ? 0.03 : 0);
        if (sc > bestScore) {
          bestScore = sc;
          best = k;
        }
      });
      [titleBlock.x, titleBlock.y] = corners[best];
      titleBlock.corner = best;
      reserveRect(titleBlock.x - 4 * s, titleBlock.y - 4 * s, titleBlock.x + titleBlock.w + 4 * s, titleBlock.y + titleBlock.h + 4 * s);
    }
    const family = FAMILIES[a.motifs];
    const mols = family.make();
    for (let i = mols.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [mols[i], mols[j]] = [mols[j], mols[i]];
    }
    const want = Math.min(mols.length, Math.round(mix(1, 3.4, mood.density) + (a.annotation === 'sheet' ? 0.4 : 0)));
    const captionH = a.annotation === 'sheet' ? 40 * s : a.annotation === 'notebook' ? 18 * s : 0;
    for (let k = 0; k < want; k++) {
      const mol = mols[k];
      let xs = mol.atoms.map((t) => t.x), ys = mol.atoms.map((t) => t.y);
      const ox = (Math.min(...xs) + Math.max(...xs)) / 2, oy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const theta = (a.sheet === 'textbook' || a.annotation === 'sheet' ? 0 : (random() - 0.5) * mix(10, 70, mood.energy)) * DEG;
      let done = false;
      for (let bm = mix(15, 21, random()) * s; bm >= 9 * s && !done; bm *= 0.82) {
        let best = -1, bestScore = -1;
        const step = 12 * s;
        for (let y = step; y < N - step; y += step)
          for (let x = step; x < N - step; x += step) {
            const at = (y | 0) * N + (x | 0);
            const id = ID[at];
            if (id >= 3 || RES[at]) continue;
            const R = regions[RG[at]] ?? null;
            const M = planeMatrix(id ? R : null, theta, 0.6);
            let rad = 0;
            for (const t of mol.atoms) {
              const px = (M[0] * (t.x - ox) + M[1] * (t.y - oy)) * bm, py = (M[2] * (t.x - ox) + M[3] * (t.y - oy)) * bm;
              rad = Math.max(rad, Math.hypot(px, py));
            }
            rad += bm * 0.9;
            if (DIST[at] < rad + 8 * s) continue;
            if (x - rad < margin || x + rad > N - margin || y - rad < margin || y + rad + captionH > N - margin) continue;
            if (placed.some((p) => Math.hypot(p.cx - x, p.cy - y) < p.R + rad + captionH * 0.6)) continue;
            let clear = true;
            for (let q = 0; q < 12 && clear; q++) {
              const qx = (x + Math.cos(q * 0.5236) * rad) | 0, qy = (y + Math.sin(q * 0.5236) * rad) | 0;
              if (RES[qy * N + qx]) clear = false;
            }
            if (!clear) continue;
            if (captionH && RES[Math.min(N - 1, (y + rad + captionH) | 0) * N + (x | 0)]) continue;
            const sc = (id === 1 || id === 2 ? 0.6 : 0.1) + Math.min(1, DIST[at] / (rad * 3)) * 0.3 + random() * 0.35;
            if (sc > bestScore) {
              bestScore = sc;
              best = at;
            }
          }
        if (best < 0) continue;
        const cx = best % N, cy = (best / N) | 0;
        const R = regions[RG[best]] ?? null;
        const M = planeMatrix(ID[best] ? R : null, theta, 0.6);
        let rad = 0;
        for (const t of mol.atoms) rad = Math.max(rad, Math.hypot((M[0] * (t.x - ox) + M[1] * (t.y - oy)) * bm, (M[2] * (t.x - ox) + M[3] * (t.y - oy)) * bm));
        rad += bm * 0.9;
        placed.push({ mol, cx, cy, bm, M, R: rad, ox, oy });
        reserveDisc(cx, cy, rad);
        if (captionH) reserveRect(cx - rad * 1.3, cy + rad * 0.6, cx + rad * 1.3, cy + rad + captionH);
        done = true;
      }
      xs = ys = [];
    }
    await breathe();

    // ---- lattices ---------------------------------------------------------------------------
    const VX = [0, SQ3 / 2, SQ3 / 2, 0, -SQ3 / 2, -SQ3 / 2], VY = [-1, -0.5, 0.5, 1, 0.5, -0.5];
    const BX = [SQ3 / 2, 0, -SQ3 / 2, -SQ3 / 2, 0, SQ3 / 2], BY = [0.5, 1, 0.5, -0.5, -1, -0.5];
    const conv = a.convention;
    const chainP = mix(0.25, 0.7, mood.density) * mix(0.8, 1.2, dens);
    let ringCount = 0;
    const depthAt = (x: number, y: number) => D[Math.min(N - 1, Math.max(0, y | 0)) * N + Math.min(N - 1, Math.max(0, x | 0))];
    const colourAt = (x: number, y: number): RGB => {
      const o = (Math.min(N - 1, Math.max(0, y | 0)) * N + Math.min(N - 1, Math.max(0, x | 0))) * 4;
      return [color[o], color[o + 1], color[o + 2]];
    };
    const fillFor = (layer: Layer, pts: number[], cx: number, cy: number, r: number, m: number, R: Region, tintBase: RGB) => {
      if (a.fill === 'none') return;
      if (a.fill === 'tone') {
        layer.fills.push({ pts, c1: sheet.fill, cx, cy, r, alpha: (dark ? 0.32 : 0.36) * smooth(0.05, 1, m) + 0.04 });
      } else if (a.fill === 'colour') {
        const c = colourAt(cx, cy);
        const base: RGB = dark ? lerpRGB(c, [255, 255, 255], 0.25) : lerpRGB(c, tintBase, 0.12);
        layer.fills.push({ pts, c1: css(base), cx, cy, r, alpha: dark ? mix(0.22, 0.6, m) : mix(0.3, 0.75, m) });
      } else {
        const ccx = R.sx / R.area, ccy = R.sy / R.area;
        const band = Math.hypot(cx - ccx, cy - ccy) / Math.max(6 * s, r * 2.2) + noise(cx / 40, cy / 40, 31) * 1.4 + R.id * 0.7;
        const k = Math.floor(band) % palette.length;
        layer.fills.push({ pts, c1: css(palette[k]), c2: css(palette[(k + 1) % palette.length]), cx, cy, r, alpha: dark ? mix(0.5, 1, m) : mix(0.35, 0.85, m) });
      }
    };

    const tile = (R: Region, ri: number, layer: Layer, kind: 'ground' | 'set' | 'thing') => {
      const extent = Math.sqrt(R.area);
      let b: number;
      if (kind === 'thing') b = Math.max(2.6 * s, Math.min(12 * s, extent / mix(6, 11, dens)));
      else b = mix(15, 9, dens) * s * mix(0.9, 1.12, random());
      if (R.area < b * b * 3) return;
      const theta = (random() * 60 + (kind === 'thing' ? 0 : 0)) * DEG * mix(0.6, 1, mood.energy + 0.4);
      const M = kind === 'thing' ? planeMatrix(null, theta, 1) : planeMatrix(R, theta, 0.32);
      const det = M[0] * M[3] - M[1] * M[2];
      const I = [M[3] / det, -M[1] / det, -M[2] / det, M[0] / det];
      const ox = random() * b * 3, oy = random() * b * 3;
      const w = W * (kind === 'thing' ? Math.min(1.15, Math.max(0.55, b / (8 * s))) : kind === 'set' ? 0.75 : 0.65);
      const fs = Math.min(14 * s, Math.max(7.5 * s, b * 0.95));
      const labelable = b >= 6 * s;
      const col = inkCol;
      const inside = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= N || y >= N) return false;
        const at = (y | 0) * N + (x | 0);
        return RG[at] === ri && (kind === 'thing' || !RES[at]);
      };
      const toImg = (px: number, py: number) => [ox + (M[0] * px + M[1] * py) * b, oy + (M[2] * px + M[3] * py) * b] as const;
      // plane-space bounds
      let pi0 = 1e9, pi1 = -1e9, pj0 = 1e9, pj1 = -1e9;
      for (const [x, y] of [[R.x0, R.y0], [R.x1, R.y0], [R.x0, R.y1], [R.x1, R.y1]]) {
        const dx = (x - ox) / b, dy = (y - oy) / b;
        const px = I[0] * dx + I[1] * dy, py = I[2] * dx + I[3] * dy;
        const j = py / 1.5, i = px / SQ3 - j / 2;
        pi0 = Math.min(pi0, i); pi1 = Math.max(pi1, i); pj0 = Math.min(pj0, j); pj1 = Math.max(pj1, j);
      }
      const vmap = new Map<number, number>();
      const vkey = (px: number, py: number) => (Math.round(px / (SQ3 / 2)) + 30000) * 70000 + Math.round(py * 2) + 30000;
      const pos = new Map<number, [number, number]>();
      interface Cell { cx: number; cy: number; pcx: number; pcy: number; v: number[]; m: number; ring: boolean }
      const cells: Cell[] = [];
      const minIn = kind === 'thing' ? 4 : 6;
      for (let j = Math.floor(pj0) - 1; j <= Math.ceil(pj1) + 1; j++)
        for (let i = Math.floor(pi0) - 2; i <= Math.ceil(pi1) + 2; i++) {
          const pcx = SQ3 * (i + j / 2), pcy = 1.5 * j;
          const [cx, cy] = toImg(pcx, pcy);
          if (!inside(cx, cy)) continue;
          let n = 0;
          const vimg: [number, number][] = [];
          for (let k = 0; k < 6; k++) {
            const q = toImg(pcx + VX[k], pcy + VY[k]);
            vimg.push([q[0], q[1]]);
            if (inside(q[0], q[1])) n++;
          }
          if (n < minIn) continue;
          let m = MT[(cy | 0) * N + (cx | 0)];
          for (let k = 0; k < 6; k += 2) m += MT[Math.min(N - 1, Math.max(0, vimg[k][1] | 0)) * N + Math.min(N - 1, Math.max(0, vimg[k][0] | 0))];
          m /= 4;
          const v: number[] = [];
          for (let k = 0; k < 6; k++) {
            const key = vkey(pcx + VX[k], pcy + VY[k]);
            let idx = vmap.get(key);
            if (idx === undefined) {
              idx = layer.atom(vimg[k][0], vimg[k][1], fs, col);
              vmap.set(key, idx);
              pos.set(idx, [pcx + VX[k], pcy + VY[k]]);
            }
            v.push(idx);
          }
          cells.push({ cx, cy, pcx, pcy, v, m, ring: false });
        }
      if (!cells.length) return;
      const scaleK = (kind === 'ground' ? 0.8 : kind === 'set' ? 0.9 : 1) * (dark && kind !== 'thing' ? 0.66 : 1);
      const edges = new Map<number, Bond>();
      const ekey = (p: number, q: number) => (p < q ? p * 1048576 + q : q * 1048576 + p);
      const bondWorld = b * capture.pixelWorldSize;
      for (const c of cells) {
        const m = c.m * scaleK;
        const p = m < 0.05 ? 0 : clamp01(smooth(0.05, 0.85, m) * mix(0.5, 1.08, dens) + 0.03);
        const v = 0.7 * random() + 0.3 * noise(c.pcx / 2.2, c.pcy / 2.2, ri * 7 + 3);
        const floor = m < 0.02 ? 0 : kind === 'thing' ? 0.1 + 0.22 * dens : 0.025 + 0.07 * dens;
        c.ring = v < Math.max(p, floor);
        if (!c.ring) continue;
        ringCount++;
        const pts: number[] = [];
        for (const k of c.v) pts.push(layer.atoms[k].x, layer.atoms[k].y);
        fillFor(layer, pts, c.cx, c.cy, b, m, R, hex(sheet.paper));
        for (let k = 0; k < 6; k++) {
          const p0 = c.v[k], p1 = c.v[(k + 1) % 6];
          const key = ekey(p0, p1);
          if (edges.has(key)) continue;
          const bd = layer.bond(p0, p1, w, col);
          bd.cx = c.cx; bd.cy = c.cy; bd.side = true;
          edges.set(key, bd);
          layer.atoms[p0].ring = layer.atoms[p1].ring = true;
        }
        if (conv === 'aromatic' && b >= 4.2 * s) {
          const pts2: number[] = [];
          for (let k = 0; k < 16; k++) {
            const t = (k / 16) * Math.PI * 2;
            const q = toImg(c.pcx + Math.cos(t) * 0.52, c.pcy + Math.sin(t) * 0.52);
            pts2.push(q[0], q[1]);
          }
          layer.circles.push({ pts: pts2, w: w * 0.8, col });
        }
      }
      // Five-membered rings fused onto the free edge of a six, like indole, here and there.
      const cellAt = new Map<number, Cell>();
      for (const c of cells) cellAt.set(Math.round(c.pcx * 10) * 100000 + Math.round(c.pcy * 10), c);
      const blocked = new Set<number>();
      const pentDoubles: number[] = [];
      for (const c of cells) {
        if (!c.ring || random() > 0.16 + 0.1 * dens) continue;
        const k = Math.floor(random() * 6);
        const ang = (-60 + 60 * k) * DEG;
        const ncx = c.pcx + SQ3 * Math.cos(ang), ncy = c.pcy + SQ3 * Math.sin(ang);
        const nb = cellAt.get(Math.round(ncx * 10) * 100000 + Math.round(ncy * 10));
        if (!nb || nb.ring || nb.v.some((i) => blocked.has(i))) continue;
        const p0 = c.v[k], p1 = c.v[(k + 1) % 6];
        if (layer.atoms[p0].deg > 2 || layer.atoms[p1].deg > 2) continue;
        // regular pentagon on the edge, away from this ring's centre (plane space)
        const P = pos.get(p0)!, Q = pos.get(p1)!;
        const pts5: [number, number][] = [[P[0], P[1]], [Q[0], Q[1]]];
        const build = (sign: number) => {
          const o: [number, number][] = [[P[0], P[1]], [Q[0], Q[1]]];
          let phi = Math.atan2(Q[1] - P[1], Q[0] - P[0]);
          for (let q = 0; q < 3; q++) {
            phi += sign * 72 * DEG;
            const last = o[o.length - 1];
            o.push([last[0] + Math.cos(phi), last[1] + Math.sin(phi)]);
          }
          return o;
        };
        const A = build(1), B = build(-1);
        const far = (o: [number, number][]) => Math.hypot(o[3][0] - c.pcx, o[3][1] - c.pcy);
        const chosen = far(A) > far(B) ? A : B;
        pts5.length = 0;
        pts5.push(...chosen);
        if (!pts5.slice(2).every(([px, py]) => { const q = toImg(px, py); return inside(q[0], q[1]); })) continue;
        nb.v.forEach((i) => blocked.add(i));
        const ids = [p0, p1, ...pts5.slice(2).map(([px, py]) => { const q = toImg(px, py); return layer.atom(q[0], q[1], fs, col); })];
        const [ccx, ccy] = toImg((pts5.reduce((sx, q) => sx + q[0], 0)) / 5, (pts5.reduce((sy, q) => sy + q[1], 0)) / 5);
        const fpts: number[] = [];
        for (const i of ids) fpts.push(layer.atoms[i].x, layer.atoms[i].y);
        fillFor(layer, fpts, ccx, ccy, b * 0.85, c.m * scaleK, R, hex(sheet.paper));
        for (let q = 1; q < 5; q++) {
          const bd = layer.bond(ids[q], ids[(q + 1) % 5], w, col);
          bd.cx = ccx; bd.cy = ccy; bd.side = true;
          edges.set(ekey(ids[q], ids[(q + 1) % 5]), bd);
          if (q === 2 && (conv === 'kekule' || conv === 'conjugated') && b >= 4.2 * s) {
            bd.o = 2;
            layer.atoms[ids[2]].val++; layer.atoms[ids[3]].val++;
            pentDoubles.push(ids[2], ids[3]);
          }
        }
        ringCount++;
        if (b >= 6 * s && random() < 0.25 + a.labels * 0.6) {
          const nA = layer.atoms[ids[4]];
          nA.el = 'N'; nA.h = 'H'; nA.col = elementColour('N', labelCol);
        }
      }
      // Kekulé double bonds: three per ring where valence allows.
      const hasDouble = new Uint8Array(layer.atoms.length + 1);
      for (const i of pentDoubles) hasDouble[i] = 1;
      if ((conv === 'kekule' || conv === 'conjugated') && b >= 4.2 * s) {
        for (const c of cells) {
          if (!c.ring) continue;
          const par = random() < 0.5 ? 0 : 1;
          for (let k = par; k < 6; k += 2) {
            const p0 = c.v[k], p1 = c.v[(k + 1) % 6];
            const bd = edges.get(ekey(p0, p1));
            if (!bd || bd.o === 2 || hasDouble[p0] || hasDouble[p1]) continue;
            bd.o = 2;
            bd.cx = c.cx; bd.cy = c.cy;
            hasDouble[p0] = hasDouble[p1] = 1;
            layer.atoms[p0].val++; layer.atoms[p1].val++;
          }
        }
      }
      // Haworth: the nearest edges of each ring drawn bold.
      if (conv === 'haworth') {
        for (const c of cells) {
          if (!c.ring) continue;
          const dc = depthAt(c.cx, c.cy);
          let bestK = -1, bestD = 0;
          for (let k = 0; k < 6; k++) {
            const A = layer.atoms[c.v[k]], B = layer.atoms[c.v[(k + 1) % 6]];
            const dd = (dc - depthAt((A.x + B.x) / 2, (A.y + B.y) / 2)) * depthWorld;
            if (dd > bestD) { bestD = dd; bestK = k; }
          }
          if (bestK >= 0 && bestD > bondWorld * 0.12) {
            for (const k of [bestK]) {
              const A = layer.atoms[c.v[k]], B = layer.atoms[c.v[(k + 1) % 6]];
              const dd = (dc - depthAt((A.x + B.x) / 2, (A.y + B.y) / 2)) * depthWorld;
              const bd = edges.get(ekey(c.v[k], c.v[(k + 1) % 6]));
              if (bd && dd > bondWorld * 0.1) bd.st = 3;
            }
          }
        }
      }
      // Stereo: a bond that runs steeply into depth becomes a wedge or a hash.
      const stereoP = conv === 'saturated' || conv === 'haworth' ? 0.85 : 0.45;
      const stereo = (bd: Bond) => {
        const A = layer.atoms[bd.a], B = layer.atoms[bd.b];
        const dd = (depthAt(A.x, A.y) - depthAt(B.x, B.y)) * depthWorld;
        if (Math.abs(dd) > bondWorld * 0.35 && random() < stereoP) bd.st = dd > 0 ? 1 : 2;
        else if (conv === 'saturated' && random() < 0.18) bd.st = random() < 0.5 ? 1 : 2;
      };
      const neighbours = (idx: number) => {
        const p = pos.get(idx)!;
        const out: { idx: number; k: number }[] = [];
        for (let k = 0; k < 6; k++) {
          const q = vmap.get(vkey(p[0] + BX[k], p[1] + BY[k]));
          if (q !== undefined) out.push({ idx: q, k });
        }
        return out;
      };
      const walk = (start: number, steps: number, fromRing: boolean) => {
        let cur = start, lastK = -1, lastTurn = 0;
        const path = [start];
        for (let st = 0; st < steps; st++) {
          const cands = neighbours(cur).filter((n) => layer.atoms[n.idx].deg === 0 && !blocked.has(n.idx) && !edges.has(ekey(cur, n.idx)));
          if (!cands.length) break;
          let choiceN = cands[0];
          if (lastK >= 0 && cands.length > 1) {
            const turn = (n: { k: number }) => {
              const cross = BX[lastK] * BY[n.k] - BY[lastK] * BX[n.k];
              return cross > 0 ? 1 : -1;
            };
            const zig = cands.filter((n) => turn(n) !== lastTurn);
            choiceN = zig.length && random() < 0.82 ? pick(zig) : pick(cands);
            lastTurn = turn(choiceN);
          } else choiceN = pick(cands);
          const bd = layer.bond(cur, choiceN.idx, w, col);
          edges.set(ekey(cur, choiceN.idx), bd);
          if (st === 0 && fromRing) stereo(bd);
          else if (random() < 0.5) stereo(bd);
          if (conv === 'conjugated' && st % 2 === 1 && b >= 4.2 * s && !hasDouble[cur] && !hasDouble[choiceN.idx]) {
            bd.o = 2;
            const prev = layer.atoms[path[path.length - 2] ?? cur];
            bd.cx = prev.x; bd.cy = prev.y; bd.side = true;
            hasDouble[cur] = hasDouble[choiceN.idx] = 1;
          }
          path.push(choiceN.idx);
          cur = choiceN.idx;
          lastK = choiceN.k;
        }
        return path;
      };
      const ends: number[][] = [];
      for (const c of cells) {
        const m = c.m * scaleK;
        if (m < 0.04) continue;
        const mid = 1 - Math.abs(m - 0.45) * 1.6;
        if (c.ring) {
          for (const idx of c.v) {
            if (layer.atoms[idx].deg !== 2) continue;
            if (random() < chainP * clamp01(0.12 + 0.4 * mid)) {
              const path = walk(idx, 1 + Math.floor(random() * mix(1.5, 4.5, mood.energy)), true);
              if (path.length > 1) ends.push(path);
            }
          }
        } else if (random() < chainP * 0.5 * smooth(0.04, 0.4, m)) {
          const start = c.v[Math.floor(random() * 6)];
          if (layer.atoms[start].deg === 0 && !blocked.has(start)) {
            const path = walk(start, 2 + Math.floor(random() * 4), false);
            if (path.length > 2) ends.push(path);
          }
        }
      }
      // Atom labels: heteroatoms at chain ends and in some rings.
      if (labelable && a.labels > 0.02) {
        const pl = a.labels;
        for (const path of ends) {
          const end = path[path.length - 1];
          const A = layer.atoms[end];
          if (A.deg !== 1 || random() > pl * 0.75) continue;
          const r = random();
          if (r < 0.3) { A.el = 'O'; A.h = 'H'; }
          else if (r < 0.5) { A.el = 'N'; A.h = 'H2'; }
          else if (r < 0.65) {
            A.el = 'O';
            const bd = edges.get(ekey(path[path.length - 2], end));
            if (bd && bd.o === 1 && bd.st === 0) { bd.o = 2; bd.side = false; }
          } else if (r < 0.82) { A.el = 'C'; A.h = 'H3'; }
          else {
            A.el = 'H';
            const bd = edges.get(ekey(path[path.length - 2], end));
            if (bd) { bd.st = random() < 0.5 ? 1 : 2; if (bd.a !== path[path.length - 2]) { const t = bd.a; bd.a = bd.b; bd.b = t; } }
          }
          A.col = elementColour(A.el, labelCol);
          for (let q = 1; q < path.length - 1; q++)
            if (random() < pl * 0.12 && layer.atoms[path[q]].deg === 2) {
              const B = layer.atoms[path[q]];
              B.el = random() < 0.5 ? 'O' : 'N';
              B.h = B.el === 'N' ? 'H' : '';
              B.col = elementColour(B.el, labelCol);
            }
        }
        for (const c of cells) {
          if (!c.ring || random() > pl * 0.18) continue;
          const idx = c.v[Math.floor(random() * 6)];
          const A = layer.atoms[idx];
          if (A.el || A.deg !== 2) continue;
          A.el = random() < 0.65 ? 'N' : 'O';
          A.h = A.el === 'N' && !hasDouble[idx] && random() < 0.6 ? 'H' : '';
          A.col = elementColour(A.el, labelCol);
        }
      }
    };

    const order = regions.map((R, i) => ({ R, i })).sort((p, q) => q.R.area - p.R.area);
    for (const { R, i } of order) {
      signal.throwIfAborted();
      if (R.id >= 3) tile(R, i, things, 'thing');
      else tile(R, i, planes, R.id === 1 ? 'ground' : 'set');
    }
    await breathe();

    // Floating molecules in the open backdrop.
    {
      const g = 64 * s;
      const pf = mix(0.04, 0.32, mood.density) * mix(0.6, 1.2, dens) * (dark ? 1.3 : 1);
      for (let gy = 0; gy < N; gy += g)
        for (let gx = 0; gx < N; gx += g) {
          if (random() > pf) continue;
          const cx = gx + random() * g, cy = gy + random() * g;
          const bf = mix(6, 10, random()) * s;
          const rad = bf * 2.6;
          let ok = cx > rad && cy > rad && cx < N - rad && cy < N - rad;
          for (let q = 0; q < 9 && ok; q++) {
            const qx = (cx + (q === 0 ? 0 : Math.cos(q * 0.785) * rad)) | 0, qy = (cy + (q === 0 ? 0 : Math.sin(q * 0.785) * rad)) | 0;
            const at = qy * N + qx;
            if (ID[at] !== 0 || RES[at]) ok = false;
          }
          if (!ok) continue;
          const mol = pick(SMALL)();
          stamp(planes, mol, cx, cy, bf, planeMatrix(null, random() * Math.PI * 2, 1), W * 0.75, inkCol, labelCol, Math.max(7.5 * s, bf * 0.9), random() < 0.5 && a.fill !== 'none');
        }
    }

    function stamp(layer: Layer, mol: Mol, cx: number, cy: number, bm: number, M: readonly [number, number, number, number], w: number, col: string, lcol: string, fs: number, fillRings: boolean, ox0?: number, oy0?: number) {
      const xs = mol.atoms.map((t) => t.x), ys = mol.atoms.map((t) => t.y);
      const ox = ox0 ?? (Math.min(...xs) + Math.max(...xs)) / 2, oy = oy0 ?? (Math.min(...ys) + Math.max(...ys)) / 2;
      const P = (x: number, y: number) => [cx + (M[0] * (x - ox) + M[1] * (y - oy)) * bm, cy + (M[2] * (x - ox) + M[3] * (y - oy)) * bm] as const;
      const base = layer.atoms.length;
      for (const t of mol.atoms) {
        const [x, y] = P(t.x, t.y);
        const idx = layer.atom(x, y, fs, lcol);
        if (t.el) {
          layer.atoms[idx].el = t.el;
          layer.atoms[idx].h = t.h;
          layer.atoms[idx].col = elementColour(t.el, lcol);
        }
      }
      if (fillRings)
        mol.rings.forEach((r, k) => {
          const pts: number[] = [];
          for (const i of r.ids) pts.push(layer.atoms[base + i].x, layer.atoms[base + i].y);
          const [rcx, rcy] = P(r.cx, r.cy);
          if (a.fill === 'gradient' || a.sheet === 'blacklight') {
            const c = (k + Math.floor(cx / 37)) % palette.length;
            layer.fills.push({ pts, c1: css(palette[c]), c2: css(palette[(c + 2) % palette.length]), cx: rcx, cy: rcy, r: bm, alpha: dark ? 0.95 : 0.8 });
          } else if (a.fill === 'colour' && !dark) {
            layer.fills.push({ pts, c1: css(palette[(k + 2) % palette.length]), cx: rcx, cy: rcy, r: bm, alpha: 0.35 });
          } else layer.fills.push({ pts, c1: sheet.fill, cx: rcx, cy: rcy, r: bm, alpha: dark ? 0.16 : 0.12 });
        });
      for (const bd of mol.bonds) {
        const B = layer.bond(base + bd.a, base + bd.b, w, col, bd.o);
        if (bd.st) B.st = bd.st === 'w' ? 1 : 2;
        if (bd.o === 2) {
          if (bd.ring >= 0) {
            const [rcx, rcy] = P(mol.rings[bd.ring].cx, mol.rings[bd.ring].cy);
            B.cx = rcx; B.cy = rcy; B.side = true;
          } else B.side = false;
        }
      }
      if (a.convention === 'aromatic')
        mol.rings.forEach((r) => {
          if (r.ids.length !== 6 || r.ids.some((i) => mol.atoms[i].el)) return;
          const pts: number[] = [];
          for (let k = 0; k < 20; k++) {
            const t = (k / 20) * Math.PI * 2;
            const [x, y] = P(r.cx + Math.cos(t) * 0.55, r.cy + Math.sin(t) * 0.55);
            pts.push(x, y);
          }
          layer.circles.push({ pts, w: w * 0.85, col });
          for (const bd of layer.bonds.slice(layer.bonds.length - mol.bonds.length)) if (bd.side && r.ids.includes(bd.a - base) && r.ids.includes(bd.b - base)) bd.o = 1;
        });
      return P;
    }

    // ---- contours ---------------------------------------------------------------------------
    const OWN = new Int16Array(total).fill(-1);
    const depthBreak = (capture.pixelWorldSize * 6) / Math.max(1e-6, depthWorld);
    const markEdge = (p: number, q: number) => {
      const ip = ID[p], iq = ID[q];
      if (ip !== iq) {
        const fg = ip === 0 ? q : iq === 0 ? p : D[p] <= D[q] ? p : q;
        OWN[fg] = ID[fg];
      } else if (ip >= 1) {
        if (Math.abs(D[p] - D[q]) > depthBreak || NX[p] * NX[q] + NY[p] * NY[q] + NZ[p] * NZ[q] < 0.72) {
          const fg = D[p] <= D[q] ? p : q;
          OWN[fg] = ip;
        }
      }
    };
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const at = y * N + x;
        if (x + 1 < N) markEdge(at, at + 1);
        if (y + 1 < N) markEdge(at, at + N);
      }
    // Different bins of the same plane are not edges unless the facing really turns.
    const VIS = new Uint8Array(total);
    const DXS = [1, 1, 0, -1, -1, -1, 0, 1], DYS = [0, 1, 1, 1, 0, -1, -1, -1];
    const walkEdge = (from: number, owner: number) => {
      const out: number[] = [];
      let cur = from, pd = -1;
      for (;;) {
        const x = cur % N, y = (cur / N) | 0;
        let best = -1, bestK = -1, bestScore = 1e9;
        for (let k = 0; k < 8; k++) {
          const nx = x + DXS[k], ny = y + DYS[k];
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const q = ny * N + nx;
          if (OWN[q] !== owner || VIS[q]) continue;
          const turn = pd < 0 ? 0 : Math.min(Math.abs(k - pd), 8 - Math.abs(k - pd));
          if (turn > 2) continue;
          const sc = turn + (k % 2) * 0.2;
          if (sc < bestScore) { bestScore = sc; best = q; bestK = k; }
        }
        if (best < 0) break;
        const bx = best % N, by = (best / N) | 0;
        for (let k = 0; k < 8; k++) {
          const nx = x + DXS[k], ny = y + DYS[k];
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const q = ny * N + nx;
          if (OWN[q] === owner && !VIS[q] && Math.abs(nx - bx) <= 1 && Math.abs(ny - by) <= 1) VIS[q] = 1;
        }
        VIS[best] = 1;
        out.push(best);
        cur = best;
        pd = bestK;
      }
      return out;
    };
    let contourCount = 0;
    for (let at = 0; at < total; at++) {
      const owner = OWN[at];
      if (owner < 0 || VIS[at]) continue;
      if ((at & 4095) === 0) signal.throwIfAborted();
      VIS[at] = 1;
      const f = walkEdge(at, owner);
      const bk = walkEdge(at, owner);
      const pix = [...bk.reverse(), at, ...f];
      const kind = owner >= 3 ? 'thing' : owner === 2 ? 'set' : 'ground';
      const extent = Math.sqrt(thingArea[owner]);
      const bc = kind === 'thing' ? Math.max(2.6 * s, Math.min(8 * s, extent / 9)) : Math.min(9 * s, mix(11, 7, dens) * s * 0.75);
      if (pix.length < Math.max(4 * s, bc * 1.3)) continue;
      // smooth
      let xs = pix.map((p) => (p % N) + 0.5), ys = pix.map((p) => ((p / N) | 0) + 0.5);
      const rad = Math.max(1, Math.min(4, Math.round(bc * 0.45)));
      for (let pass = 0; pass < 2; pass++) {
        const nx: number[] = [], ny: number[] = [];
        for (let i = 0; i < xs.length; i++) {
          let sx = 0, sy = 0, n = 0;
          for (let j = Math.max(0, i - rad); j <= Math.min(xs.length - 1, i + rad); j++) { sx += xs[j]; sy += ys[j]; n++; }
          nx.push(sx / n); ny.push(sy / n);
        }
        xs = nx; ys = ny;
      }
      // resample
      const stepL = bc * 0.866;
      const rx: number[] = [xs[0]], ry: number[] = [ys[0]];
      let acc = 0;
      for (let i = 1; i < xs.length; i++) {
        let seg = Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
        let px = xs[i - 1], py = ys[i - 1];
        while (acc + seg >= stepL) {
          const t = (stepL - acc) / seg;
          px = px + (xs[i] - px) * t;
          py = py + (ys[i] - py) * t;
          rx.push(px); ry.push(py);
          seg = Math.hypot(xs[i] - px, ys[i] - py);
          acc = 0;
        }
        acc += seg;
      }
      if (acc > stepL * 0.4) { rx.push(xs[xs.length - 1]); ry.push(ys[ys.length - 1]); }
      if (rx.length < 2) continue;
      contourCount++;
      const amp = bc * 0.25;
      const zx: number[] = [], zy: number[] = [];
      let votes = 0;
      for (let k = 0; k < rx.length; k++) {
        const p = Math.max(0, k - 1), q = Math.min(rx.length - 1, k + 1);
        let tx = rx[q] - rx[p], ty = ry[q] - ry[p];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl; ty /= tl;
        const sgn = k % 2 ? 1 : -1;
        zx.push(rx[k] - ty * amp * sgn);
        zy.push(ry[k] + tx * amp * sgn);
        const sx = (rx[k] - ty * 2.5 * s) | 0, sy = (ry[k] + tx * 2.5 * s) | 0;
        if (sx >= 0 && sy >= 0 && sx < N && sy < N) votes += ID[sy * N + sx] === owner ? 1 : -1;
      }
      const inSide = votes >= 0 ? 1 : -1;
      const wBase = W * (kind === 'thing' ? (extent < 60 * s ? 1.6 : 1.35) : kind === 'set' ? 1.0 : 0.9);
      let prev = top.atom(zx[0], zy[0], 0, inkCol);
      for (let k = 1; k < zx.length; k++) {
        const idx = top.atom(zx[k], zy[k], 0, inkCol);
        const at2 = Math.min(N - 1, Math.max(0, zy[k] | 0)) * N + Math.min(N - 1, Math.max(0, zx[k] | 0));
        const shadow = 1 - (dark ? 1 - LIGHT[at2] : LIGHT[at2]);
        const w = Math.round(wBase * (1 + 0.55 * (dark ? 1 - shadow : shadow)) * 4) / 4;
        const bd = top.bond(prev, idx, w, inkCol);
        if (conv === 'conjugated' && k % 2 === 0 && bc >= 4.5 * s) {
          const tx = zx[k] - zx[k - 1], ty = zy[k] - zy[k - 1];
          bd.o = 2; bd.side = true;
          const mx = (zx[k] + zx[k - 1]) / 2, my = (zy[k] + zy[k - 1]) / 2;
          bd.cx = mx - ty * inSide * 3; bd.cy = my + tx * inSide * 3;
        }
        prev = idx;
      }
    }
    await breathe();

    // ---- motifs on the top layer ------------------------------------------------------------
    const motifFs = (bm: number) => Math.max(9 * s, Math.min(15 * s, bm * 0.78));
    const captions: string[] = [];
    placed.forEach((p, k) => {
      top.knocks.push({ x: p.cx, y: p.cy, r: p.R * 0.92 });
      const P = stamp(top, p.mol, p.cx, p.cy, p.bm, p.M, W * 1.3 + 0.4 * s, motifCol, labelCol, motifFs(p.bm), a.fill !== 'none' || a.sheet === 'blacklight', p.ox, p.oy);
      if (p.mol.noteAt >= 0) {
        const t = p.mol.atoms[p.mol.noteAt];
        const [x, y] = P(t.x, t.y);
        top.texts.push({ text: p.mol.note, x: x - p.bm * 0.55, y: y - p.bm * 0.25, fs: motifFs(p.bm) * 0.72, col: sheet.accent === '#000000' ? motifCol : sheet.accent, align: 'right', italic: true, hand });
      }
      captions.push(p.mol.name);
      const capY = p.cy + p.R * 0.78;
      if (a.annotation === 'sheet') {
        top.texts.push({ text: `Fig. ${k + 1}  ${p.mol.name}`, x: p.cx, y: capY + 10 * s, fs: 11.5 * s, col: labelCol, align: 'center', weight: '700', knock: true });
        top.texts.push({ text: p.mol.iupac, x: p.cx, y: capY + 23 * s, fs: 8.5 * s, col: labelCol, align: 'center', italic: true, knock: true });
        top.texts.push({ text: `${p.mol.formula}   M ${p.mol.mw}`, x: p.cx, y: capY + 35 * s, fs: 9 * s, col: labelCol, align: 'center', rich: true, knock: true });
      } else if (a.annotation === 'notebook') {
        top.texts.push({ text: p.mol.name + (random() < 0.4 ? ' ?' : ''), x: p.cx, y: capY + 9 * s, fs: 12 * s, col: sheet.accent, align: 'center', hand: true, knock: true });
      }
    });

    // ---- annotations ------------------------------------------------------------------------
    // The scene as one molecule: count what was actually drawn.
    let nC = 0, nH = 0, nN = 0, nO = 0;
    for (const L of [planes, things, top]) {
      if (L === top) {
        // contour chains are carbon too
      }
      for (const t of L.atoms) {
        if (!t.deg) continue;
        const el = t.el ?? 'C';
        const hcount = t.h ? Number(t.h.slice(1) || 1) : 0;
        if (el === 'C') { nC++; nH += Math.max(0, 4 - t.val) + (t.el ? 0 : 0); }
        else if (el === 'N') { nN++; nH += hcount; }
        else if (el === 'O') { nO++; nH += hcount; }
        else if (el === 'H') nH++;
      }
    }
    const mw = nC * 12.011 + nH * 1.008 + nN * 14.007 + nO * 15.999;
    const formula = `C${nC}H${nH}${nN ? `N${nN}` : ''}${nO ? `O${nO}` : ''}`;
    const idea = context.idea.trim().replace(/\s+/g, ' ');
    const shortIdea = idea.length > 52 ? `${idea.slice(0, 50).trim()}…` : idea;
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][seed % 12];
    const tb = titleBlock;
    const strokes: { pts: number[]; w: number; col: string }[] = top.polylines;
    if (a.annotation === 'sheet') {
      const x = tb.x + 8 * s, y = tb.y + 14 * s;
      top.texts.push({ text: `PLATE ${roman}`, x, y, fs: 15 * s, col: labelCol, align: 'left', weight: '700' });
      top.texts.push({ text: shortIdea ? `Skeletal formula of ${shortIdea.toLowerCase()}` : 'Skeletal formula of the scene', x, y: y + 17 * s, fs: 10 * s, col: labelCol, align: 'left', italic: true });
      top.texts.push({ text: `${formula}`, x, y: y + 34 * s, fs: 10.5 * s, col: labelCol, align: 'left', rich: true });
      top.texts.push({ text: `M ${mw.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} g/mol · ${ringCount} rings`, x, y: y + 48 * s, fs: 9 * s, col: labelCol, align: 'left' });
      const barL = 40 * s, bx = x, by = y + 62 * s;
      strokes.push({ pts: [bx, by, bx + barL, by], w: 1.2 * s, col: labelCol });
      strokes.push({ pts: [bx, by - 3 * s, bx, by + 3 * s], w: 1.2 * s, col: labelCol });
      strokes.push({ pts: [bx + barL, by - 3 * s, bx + barL, by + 3 * s], w: 1.2 * s, col: labelCol });
      top.texts.push({ text: 'C–C  1.54 Å', x: bx + barL + 6 * s, y: by, fs: 8.5 * s, col: labelCol, align: 'left' });
      const inset = 9 * s;
      strokes.push({ pts: [inset, inset, N - inset, inset, N - inset, N - inset, inset, N - inset, inset, inset], w: 1 * s, col: labelCol });
    } else if (a.annotation === 'notebook') {
      const x = tb.x + 8 * s, y = tb.y + 16 * s;
      const head = shortIdea ? `re: ${shortIdea}` : 're: the scene';
      top.texts.push({ text: head, x, y, fs: 15 * s, col: inkCol, align: 'left', hand: true });
      const hw = Math.min(tb.w - 10 * s, textWidth(head, 15 * s, '400', true));
      strokes.push({ pts: [x, y + 10 * s, x + hw * 0.5, y + 11.5 * s, x + hw, y + 9 * s], w: 1.3 * s, col: inkCol });
      top.texts.push({ text: `exp. ${10 + (seed % 89)} · p. ${2 + (seed % 37)}   ${formula}`, x, y: y + 26 * s, fs: 10.5 * s, col: inkCol, align: 'left', hand: true, rich: true });
      if (placed.length >= 2) {
        const p = placed[0], q = placed[1];
        const ang = Math.atan2(q.cy - p.cy, q.cx - p.cx);
        const x0 = p.cx + Math.cos(ang) * p.R * 0.9, y0 = p.cy + Math.sin(ang) * p.R * 0.9;
        const x1 = q.cx - Math.cos(ang) * q.R * 0.9, y1 = q.cy - Math.sin(ang) * q.R * 0.9;
        if (Math.hypot(x1 - x0, y1 - y0) > 30 * s) {
          strokes.push({ pts: [x0, y0, x1, y1], w: 1.4 * s, col: sheet.accent });
          const hl = 9 * s;
          strokes.push({ pts: [x1 - Math.cos(ang - 0.4) * hl, y1 - Math.sin(ang - 0.4) * hl, x1, y1, x1 - Math.cos(ang + 0.4) * hl, y1 - Math.sin(ang + 0.4) * hl], w: 1.4 * s, col: sheet.accent });
          top.texts.push({ text: pick(['H⁺, Δ', 'hν', '[O]', 'MeI, K₂CO₃', 'enzymes?', 'H₂, Pd/C']), x: (x0 + x1) / 2 - Math.sin(ang) * 10 * s, y: (y0 + y1) / 2 + Math.cos(ang) * -10 * s, fs: 12 * s, col: sheet.accent, align: 'center', hand: true, knock: true });
        }
      }
      let hero = -1;
      for (let id = 3; id <= maxId; id++) if (thingArea[id] > 30 * s * s && (hero < 0 || id < hero)) hero = id;
      if (hero >= 0) {
        let x0 = N, y0 = N, x1 = 0, y1 = 0;
        for (const R of regions) if (R.id === hero) { x0 = Math.min(x0, R.x0); y0 = Math.min(y0, R.y0); x1 = Math.max(x1, R.x1); y1 = Math.max(y1, R.y1); }
        const ccx = (x0 + x1) / 2, ccy = (y0 + y1) / 2, rx = (x1 - x0) / 2 + 10 * s, ry = (y1 - y0) / 2 + 10 * s;
        const pts: number[] = [];
        const start = random() * Math.PI * 2;
        for (let k = 0; k <= 40; k++) {
          const t = start + (k / 36) * Math.PI * 2;
          const wob = 1 + (noise(k * 0.4, 1, 77) - 0.5) * 0.12;
          pts.push(ccx + Math.cos(t) * rx * wob, ccy + Math.sin(t) * ry * wob);
        }
        strokes.push({ pts, w: 1.5 * s, col: sheet.accent });
        const qx = Math.min(N - 30 * s, ccx + rx + 6 * s), qy = Math.max(20 * s, ccy - ry);
        top.texts.push({ text: pick(['chiral?', 'active site', 'cf. Fig. 2', '??', 'binds here']), x: qx, y: qy, fs: 13 * s, col: sheet.accent, align: 'left', hand: true, knock: true });
      }
      if (!dark && a.sheet === 'notebook') strokes.push({ pts: [48 * s, 0, 48 * s, N], w: 1 * s, col: marginCol });
    } else if (a.annotation === 'patent') {
      top.texts.push({ text: 'FIG. 1', x: tb.x + tb.w / 2, y: tb.y + tb.h * 0.42, fs: 22 * s, col: labelCol, align: 'center', weight: '700', italic: true });
      top.texts.push({ text: `Sheet ${1 + (seed % 3)} of ${4 + (seed % 3)}`, x: tb.x + tb.w / 2, y: tb.y + tb.h * 0.82, fs: 9.5 * s, col: labelCol, align: 'center' });
      const ids: number[] = [];
      for (let id = 3; id <= maxId; id++) if (thingArea[id] > 60 * s * s && anchor[id] >= 0) ids.push(id);
      ids.sort((p, q) => thingArea[q] - thingArea[p]);
      const callouts = ids.slice(0, 7);
      if (thingArea[2] > 0 && anchor[2] >= 0) callouts.push(2);
      if (thingArea[1] > 0 && anchor[1] >= 0) callouts.push(1);
      const used: [number, number][] = [];
      callouts.forEach((id, k) => {
        const at = anchor[id];
        const x0 = at % N, y0 = (at / N) | 0;
        let dx = x0 - N / 2, dy = y0 - N / 2;
        const l = Math.hypot(dx, dy) || 1;
        dx /= l; dy /= l;
        if (l < 4) { dx = -0.7; dy = -0.7; }
        let x1 = 0, y1 = 0;
        for (let tries = 0; tries < 6; tries++) {
          const L = (42 + tries * 12) * s;
          const ang = Math.atan2(dy, dx) + (tries % 2 ? 0.35 : -0.35) * tries * 0.5;
          x1 = Math.min(N - 22 * s, Math.max(22 * s, x0 + Math.cos(ang) * L));
          y1 = Math.min(N - 18 * s, Math.max(18 * s, y0 + Math.sin(ang) * L));
          if (!used.some(([ux, uy]) => Math.hypot(ux - x1, uy - y1) < 26 * s)) break;
        }
        used.push([x1, y1]);
        const mx = (x0 + x1) / 2 + (y1 - y0) * 0.15, my = (y0 + y1) / 2 - (x1 - x0) * 0.15;
        const pts: number[] = [];
        for (let t = 0; t <= 1.0001; t += 0.1) {
          const u = 1 - t;
          pts.push(u * u * x0 + 2 * u * t * mx + t * t * x1, u * u * y0 + 2 * u * t * my + t * t * y1);
        }
        strokes.push({ pts, w: 0.9 * s, col: labelCol });
        const num = id === 2 ? '20' : id === 1 ? '30' : String(10 + k * 2);
        top.texts.push({ text: num, x: x1 + (x1 > x0 ? 3 : -3) * s, y: y1, fs: 13 * s, col: labelCol, align: x1 > x0 ? 'left' : 'right', weight: '700', knock: true });
      });
    }
    await breathe();

    // ---- render the layers -----------------------------------------------------------------
    const renderLayer = (ctx: CanvasRenderingContext2D, L: Layer) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const f of L.fills) {
        ctx.beginPath();
        ctx.moveTo(f.pts[0], f.pts[1]);
        for (let i = 2; i < f.pts.length; i += 2) ctx.lineTo(f.pts[i], f.pts[i + 1]);
        ctx.closePath();
        if (f.c2) {
          const g = ctx.createRadialGradient(f.cx, f.cy, 0, f.cx, f.cy, f.r);
          g.addColorStop(0, f.c1);
          g.addColorStop(1, f.c2);
          ctx.fillStyle = g;
        } else ctx.fillStyle = f.c1;
        ctx.globalAlpha = Math.min(1, f.alpha);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const k of L.knocks) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      const batches = new Map<string, Path2D>();
      const line = (x0: number, y0: number, x1: number, y1: number, w: number, col: string) => {
        const key = `${col}|${w.toFixed(2)}`;
        let p = batches.get(key);
        if (!p) batches.set(key, (p = new Path2D()));
        p.moveTo(x0, y0);
        p.lineTo(x1, y1);
      };
      const wedges: { pts: number[]; col: string }[] = [];
      for (const bd of L.bonds) {
        const A = L.atoms[bd.a], B = L.atoms[bd.b];
        const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
        const px = -dy / len, py = dx / len;
        if (bd.st === 1) {
          const hw = Math.max(bd.w * 1.4, len * 0.15);
          wedges.push({ pts: [A.x, A.y, B.x + px * hw, B.y + py * hw, B.x - px * hw, B.y - py * hw], col: bd.col });
          continue;
        }
        if (bd.st === 2) {
          const n = Math.max(3, Math.round(len / Math.max(2.2 * s, bd.w * 2.4)));
          const hw = Math.max(bd.w * 1.4, len * 0.15);
          for (let i = 1; i <= n; i++) {
            const t = i / (n + 0.3), x = A.x + dx * t, y = A.y + dy * t, h = hw * t;
            line(x - px * h, y - py * h, x + px * h, y + py * h, Math.max(0.6 * s, bd.w * 0.75), bd.col);
          }
          continue;
        }
        if (bd.st === 3) {
          line(A.x, A.y, B.x, B.y, Math.round(bd.w * 2.3 * 4) / 4, bd.col);
          continue;
        }
        if (bd.o === 2 && !bd.side) {
          const off = Math.max(bd.w * 1.2, len * 0.09);
          line(A.x + px * off, A.y + py * off, B.x + px * off, B.y + py * off, bd.w, bd.col);
          line(A.x - px * off, A.y - py * off, B.x - px * off, B.y - py * off, bd.w, bd.col);
          continue;
        }
        line(A.x, A.y, B.x, B.y, bd.w, bd.col);
        if (bd.o === 2) {
          const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
          const sgn = (bd.cx - mx) * px + (bd.cy - my) * py > 0 ? 1 : -1;
          const off = Math.max(bd.w * 1.8, len * 0.2) * sgn;
          line(A.x + dx * 0.16 + px * off, A.y + dy * 0.16 + py * off, B.x - dx * 0.16 + px * off, B.y - dy * 0.16 + py * off, Math.round(bd.w * 0.85 * 4) / 4, bd.col);
        }
      }
      for (const c of L.circles) {
        const key = `${c.col}|${c.w.toFixed(2)}`;
        let p = batches.get(key);
        if (!p) batches.set(key, (p = new Path2D()));
        p.moveTo(c.pts[0], c.pts[1]);
        for (let i = 2; i < c.pts.length; i += 2) p.lineTo(c.pts[i], c.pts[i + 1]);
        p.closePath();
      }
      for (const pl of L.polylines) {
        const key = `${pl.col}|${pl.w.toFixed(2)}`;
        let p = batches.get(key);
        if (!p) batches.set(key, (p = new Path2D()));
        p.moveTo(pl.pts[0], pl.pts[1]);
        for (let i = 2; i < pl.pts.length; i += 2) p.lineTo(pl.pts[i], pl.pts[i + 1]);
      }
      for (const [key, p] of batches) {
        const [col, w] = key.split('|');
        ctx.strokeStyle = col;
        ctx.lineWidth = Number(w);
        ctx.stroke(p);
      }
      for (const wd of wedges) {
        ctx.fillStyle = wd.col;
        ctx.beginPath();
        ctx.moveTo(wd.pts[0], wd.pts[1]);
        ctx.lineTo(wd.pts[2], wd.pts[3]);
        ctx.lineTo(wd.pts[4], wd.pts[5]);
        ctx.closePath();
        ctx.fill();
      }
      // atom labels: knock the bonds back, then letter
      ctx.textBaseline = 'middle';
      for (const t of L.atoms) {
        if (!t.el) continue;
        const fs = t.fs;
        const font = `500 ${Math.round(fs)}px ${SANS}`;
        const sub = `500 ${Math.round(fs * 0.66)}px ${SANS}`;
        ctx.font = font;
        const wEl = ctx.measureText(t.el).width;
        const hLetter = t.h ? 'H' : '';
        const hDigits = t.h ? t.h.slice(1) : '';
        const wH = hLetter ? ctx.measureText('H').width : 0;
        ctx.font = sub;
        const wD = hDigits ? ctx.measureText(hDigits).width : 0;
        let dx = -t.nx, dy = -t.ny;
        const dl = Math.hypot(dx, dy);
        if (dl < 0.2) { dx = 1; dy = 0; } else { dx /= dl; dy /= dl; }
        const horizontal = Math.abs(dx) >= 0.45 || !hLetter;
        const pieces: { text: string; x: number; y: number; font: string }[] = [{ text: t.el, x: t.x, y: t.y, font }];
        if (hLetter) {
          if (horizontal && dx >= 0) {
            pieces.push({ text: 'H', x: t.x + wEl / 2 + wH / 2, y: t.y, font });
            if (hDigits) pieces.push({ text: hDigits, x: t.x + wEl / 2 + wH + wD / 2, y: t.y + fs * 0.3, font: sub });
          } else if (horizontal) {
            const right = t.x - wEl / 2;
            if (hDigits) pieces.push({ text: hDigits, x: right - wD / 2, y: t.y + fs * 0.3, font: sub });
            pieces.push({ text: 'H', x: right - wD - wH / 2, y: t.y, font });
          } else {
            const hy = t.y + Math.sign(dy) * fs * 0.95;
            pieces.push({ text: 'H', x: t.x, y: hy, font });
            if (hDigits) pieces.push({ text: hDigits, x: t.x + wH / 2 + wD / 2, y: hy + fs * 0.3, font: sub });
          }
        }
        ctx.globalCompositeOperation = 'destination-out';
        for (const p of pieces) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, fs * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = t.col;
        ctx.textAlign = 'center';
        for (const p of pieces) {
          ctx.font = p.font;
          ctx.fillText(p.text, p.x, p.y);
        }
      }
      // annotations
      for (const t of L.texts) {
        ctx.font = fontOf(t);
        ctx.textAlign = t.align;
        const parts: { text: string; subscript: boolean }[] = [];
        if (t.rich) {
          for (const m of t.text.matchAll(/([A-Za-z\s·.,/()+\-–]+|[0-9]+|[^A-Za-z0-9\s]+)/g)) {
            const tok = m[0];
            const subscript = /^[0-9]+$/.test(tok) && m.index! > 0 && /[A-Za-z)]/.test(t.text[m.index! - 1]);
            parts.push({ text: tok, subscript });
          }
        } else parts.push({ text: t.text, subscript: false });
        const subFont = fontOf({ ...t, fs: t.fs * 0.68 });
        let width = 0;
        for (const p of parts) {
          ctx.font = p.subscript ? subFont : fontOf(t);
          width += ctx.measureText(p.text).width;
        }
        let x = t.align === 'center' ? t.x - width / 2 : t.align === 'right' || t.align === 'end' ? t.x - width : t.x;
        if (t.knock) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillRect(x - 3 * s, t.y - t.fs * 0.62, width + 6 * s, t.fs * 1.24);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.fillStyle = t.col;
        ctx.textAlign = 'left';
        for (const p of parts) {
          ctx.font = p.subscript ? subFont : fontOf(t);
          ctx.fillText(p.text, x, t.y + (p.subscript ? t.fs * 0.28 : 0));
          x += ctx.measureText(p.text).width;
        }
      }
    };
    renderLayer(planeCtx, planes);
    await breathe();
    renderLayer(thingCtx, things);
    await breathe();
    renderLayer(topCtx, top);
    await breathe();
    const P1 = planeCtx.getImageData(0, 0, N, N).data, P2 = thingCtx.getImageData(0, 0, N, N).data, P3 = topCtx.getImageData(0, 0, N, N).data;

    // ---- paper and composite ---------------------------------------------------------------
    const paper0 = lerpRGB(hex(sheet.paper), hex(sheet.paperWarm), clamp01(mood.warmth * 1.2 - 0.1));
    const out = new Uint8ClampedArray(total * 4);
    const wear = mood.wear;
    // erase swipes
    const swipes = a.state === 'erased'
      ? Array.from({ length: 3 + Math.floor(random() * 2) }, () => ({ ang: (random() - 0.5) * 1.2 + (random() < 0.5 ? 0 : Math.PI / 2), off: (random() - 0.5) * N * 0.7, wid: mix(40, 90, random()) * s, len: mix(0.4, 0.9, random()) * N, cx: N * mix(0.25, 0.75, random()), cy: N * mix(0.25, 0.75, random()) }))
      : [];
    const eraseAt = (x: number, y: number) => {
      let e = 0;
      for (const sw of swipes) {
        const c = Math.cos(sw.ang), sn = Math.sin(sw.ang);
        const u = (x - sw.cx) * c + (y - sw.cy) * sn, v = -(x - sw.cx) * sn + (y - sw.cy) * c;
        const across = 1 - smooth(sw.wid * 0.35, sw.wid * 0.55, Math.abs(v + (noise(u / 30, 0, 5) - 0.5) * 18 * s));
        const along = 1 - smooth(sw.len * 0.4, sw.len * 0.5, Math.abs(u));
        e = Math.max(e, across * along * (0.75 + 0.25 * noise(u / 9, v / 3, 6)));
      }
      return e;
    };
    const coffee = a.state === 'stained'
      ? { x: N * mix(0.15, 0.85, random()), y: N * mix(0.15, 0.85, random()), r: mix(55, 95, random()) * s }
      : null;
    const fold = a.state === 'folded' ? { x: N * mix(0.45, 0.55, random()), y: N * mix(0.45, 0.55, random()) } : null;
    const fountainAt = (x: number, y: number): RGB => {
      const t = clamp01((x * 0.85 + y * 0.35) / (N * 1.2)) * (fountainInks.length - 1);
      const i = Math.min(fountainInks.length - 2, Math.floor(t));
      return lerpRGB(fountainInks[i], fountainInks[i + 1], smooth(0, 1, t - i));
    };
    const gridStep = (sheet.grid === 'blueprint' ? 24 : 18) * s;
    for (let y = 0; y < N; y++) {
      if ((y & 63) === 0) signal.throwIfAborted();
      for (let x = 0; x < N; x++) {
        const at = y * N + x, o = at * 4;
        const n1 = noise(x / (60 * s), y / (60 * s), 11), n2 = noise(x / (9 * s), y / (9 * s), 12);
        let r = paper0[0], g = paper0[1], b = paper0[2];
        const mottle = (n1 - 0.5) * (dark ? 10 : 9) * (1 + wear * 1.5) + (n2 - 0.5) * 4;
        r += mottle; g += mottle; b += mottle;
        if (sheet.chalk) {
          const haze = smooth(0.45, 0.95, noise(x / (110 * s), y / (40 * s), 13)) * 22 * (0.6 + wear);
          r += haze; g += haze * 1.05; b += haze;
        }
        if (sheet.grid) {
          const gx = Math.abs(((x + gridStep / 2) % gridStep) - gridStep / 2), gy = Math.abs(((y + gridStep / 2) % gridStep) - gridStep / 2);
          const major = sheet.grid === 'blueprint' && (Math.abs(((x + gridStep * 2.5) % (gridStep * 5)) - gridStep * 2.5) < 0.8 * s || Math.abs(((y + gridStep * 2.5) % (gridStep * 5)) - gridStep * 2.5) < 0.8 * s);
          const onLine = gx < 0.55 * s || gy < 0.55 * s;
          if (onLine || major) {
            const gc: RGB = sheet.grid === 'blueprint' ? [255, 255, 255] : graphCol;
            const ga = sheet.grid === 'blueprint' ? (major ? 0.16 : 0.08) : 0.35;
            r = mix(r, gc[0], ga); g = mix(g, gc[1], ga); b = mix(b, gc[2], ga);
          }
        }
        if (!dark && wear > 0.35) {
          const fox = smooth(0.78, 0.9, noise(x / (14 * s), y / (14 * s), 14)) * (wear - 0.35) * 40;
          r -= fox * 0.6; g -= fox * 0.9; b -= fox * 1.4;
        }
        if (coffee) {
          const d = Math.hypot(x - coffee.x, y - coffee.y);
          const wob = coffee.r * (1 + (noise(Math.atan2(y - coffee.y, x - coffee.x) * 3 + 10, 0, 15) - 0.5) * 0.08);
          const ring = Math.exp(-(((d - wob) / (3.2 * s)) ** 2)) * 0.45 + (d < wob ? 0.1 + 0.06 * noise(x / 20, y / 20, 16) : 0);
          const cc: RGB = [120, 74, 32];
          const k = ring * (dark ? 0.6 : 1);
          r = mix(r, r * cc[0] / 255, k); g = mix(g, g * cc[1] / 255, k); b = mix(b, b * cc[2] / 255, k);
        }
        const e = swipes.length ? eraseAt(x, y) : 0;
        if (e > 0) {
          const smear = e * (dark ? 18 : -10);
          r += smear; g += smear; b += smear;
        }
        // inks
        let grain = 1;
        if (sheet.chalk) grain = mix(0.35, 1, smooth(0.2, 0.62, 0.55 * noise(x / (1.6 * s), y / (1.6 * s), 21) + 0.45 * hash(x, y, 22)));
        else if (!dark && wear > 0.5) grain = mix(0.75, 1, smooth(0.15, 0.5, noise(x / (2 * s), y / (2 * s), 23)));
        const fade = 1 - e * 0.82;
        for (let L = 0; L < 3; L++) {
          const src = L === 0 ? P1 : L === 1 ? P2 : P3;
          let al = src[o + 3] / 255;
          if (al <= 0) continue;
          if (L === 1 && ID[at] < 3) continue;
          if (L === 0 && ID[at] >= 3) continue;
          al *= grain * fade;
          let ir = src[o], ig = src[o + 1], ib = src[o + 2];
          if (sheet.fountain && ir + ig + ib < 40) [ir, ig, ib] = fountainAt(x, y);
          r = mix(r, ir, al); g = mix(g, ig, al); b = mix(b, ib, al);
        }
        if (fold) {
          const dxF = x - fold.x, dyF = y - fold.y;
          const cr = Math.exp(-((dxF / (1.4 * s)) ** 2)) + Math.exp(-((dyF / (1.4 * s)) ** 2));
          const side = (dxF > 0 ? 0.03 : -0.02) + (dyF > 0 ? -0.025 : 0.015);
          const hl = Math.exp(-(((dxF + 2.2 * s) / (1.5 * s)) ** 2)) + Math.exp(-(((dyF + 2.2 * s) / (1.5 * s)) ** 2));
          const k = 1 + side - cr * 0.18 + hl * 0.08;
          r *= k; g *= k; b *= k;
        }
        out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
      }
    }
    await breathe();

    // ---- finishing the sheet ----------------------------------------------------------------
    const table: RGB = dark ? [196, 186, 168] : [52, 44, 38];
    if (a.state === 'blotter') {
      const tab = Math.round(N / Math.round(mix(12, 16, random())));
      const others = [0, 1, 2, 3].filter((c) => c !== titleBlock.corner);
      const corner = others[Math.floor(random() * others.length)];
      const nTabs = Math.ceil(N / tab);
      const torn = new Set<number>();
      const depthK = 1 + Math.floor(random() * 3);
      for (let i = 0; i < nTabs; i++)
        for (let j = 0; j < nTabs; j++) if (i + j < depthK || (i + j === depthK && random() < 0.5)) torn.add(i * 100 + j);
      const tabAt = (x: number, y: number) => {
        let i = Math.floor(x / tab), j = Math.floor(y / tab);
        if (corner === 1 || corner === 3) i = nTabs - 1 - i;
        if (corner >= 2) j = nTabs - 1 - j;
        return i * 100 + j;
      };
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const o = (y * N + x) * 4;
          // ragged tear along the perforation
          const jx = x + (hash(x >> 1, y, 41) - 0.5) * 2.4 * s, jy = y + (hash(x, y >> 1, 42) - 0.5) * 2.4 * s;
          if (torn.has(tabAt(jx, jy))) {
            let sh = 0;
            for (const [ddx, ddy] of [[-3, -3], [-5, -5]]) if (!torn.has(tabAt(x + ddx * s, y + ddy * s))) sh += 0.22;
            const f = 1 - sh;
            const fib = (hash(x, y, 43) - 0.5) * 8;
            out[o] = table[0] * f + fib; out[o + 1] = table[1] * f + fib; out[o + 2] = table[2] * f + fib;
            continue;
          }
          const px = x % tab, py = y % tab;
          const pitch = Math.max(4, Math.round(4.5 * s));
          const onPerf = (px < 1.7 * s || py < 1.7 * s) && ((px < 1.7 * s ? y : x) % pitch < 1.8 * s);
          if (onPerf) {
            const k = dark ? 1.9 : 0.6;
            out[o] *= k; out[o + 1] *= k; out[o + 2] *= k;
          } else if (px < 1.6 * s || py < 1.6 * s) {
            const k = dark ? 1.08 : 0.94;
            out[o] *= k; out[o + 1] *= k; out[o + 2] *= k;
          }
        }
    } else if (a.state === 'stained') {
      const S = mix(46, 70, random()) * s;
      const corner = Math.floor(random() * 4);
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const cx = corner & 1 ? N - 1 - x : x, cy = corner & 2 ? N - 1 - y : y;
          const u = cx + cy;
          if (u > S) continue;
          const o2 = (y * N + x) * 4;
          // the missing triangle at the corner
          if (u < S / 2) {
            out[o2] = table[0]; out[o2 + 1] = table[1]; out[o2 + 2] = table[2];
          } else {
            const t = (u - S / 2) / (S / 2);
            const back = lerpRGB(paper0, dark ? [paper0[0] * 1.15, paper0[1] * 1.15, paper0[2] * 1.15] : [paper0[0] * 0.9, paper0[1] * 0.88, paper0[2] * 0.84], 0.6 + 0.4 * (1 - t));
            const edge = Math.abs(u - S / 2) < 1.2 * s ? 0.8 : 1;
            out[o2] = back[0] * edge; out[o2 + 1] = back[1] * edge; out[o2 + 2] = back[2] * edge;
          }
        }
      // a soft shadow under the flap's free edge
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const cx = corner & 1 ? N - 1 - x : x, cy = corner & 2 ? N - 1 - y : y;
          const u = cx + cy;
          if (u <= S || u > S + 6 * s) continue;
          const o = (y * N + x) * 4;
          const k = 1 - 0.22 * (1 - (u - S) / (6 * s));
          out[o] *= k; out[o + 1] *= k; out[o + 2] *= k;
        }
    }

    const motifNames = placed.map((p) => p.mol.name);
    return {
      pixels: out,
      notes: [
        `skeletal formula on a ${sheet.name}`,
        `${ringCount} rings, ${contourCount} outline chains, ${a.convention} bonds`,
        ...(motifNames.length ? [`drawn large: ${motifNames.join(', ')}`] : []),
        ...(a.annotation !== 'none' ? [`annotated as a ${a.annotation === 'sheet' ? 'structure sheet' : a.annotation === 'notebook' ? 'notebook page' : 'patent drawing'}`] : []),
        ...(a.state !== 'fresh' ? [`the sheet ${a.state === 'blotter' ? 'perforated into blotter tabs, a corner torn away' : a.state === 'stained' ? 'coffee-ringed and dog-eared' : a.state === 'erased' ? 'half erased' : 'folded in quarters'}`] : []),
      ],
    };
  },
});
