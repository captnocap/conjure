import { colourfulness, sample, vivid } from './skin';

/**
 * The name in block letters, each letter a window onto a different print from the gallery, zoomed
 * into a slice of it. On hover a line traces round every letter's outline, drawn in the liveliest
 * colour of the slice it frames. The letters are drawn on a grid of square cells, so the outline is
 * the cells' own boundary and needs no font. On the blank page each click steps to the next letter
 * and gives it a new slice, C first, round and round, and hovering a letter hands its print to the
 * page to wear as a backdrop.
 */
const GLYPHS: Record<string, string[]> = {
  C: ['.#####', '######', '##....', '##....', '##....', '######', '.#####'],
  O: ['.####.', '######', '##..##', '##..##', '##..##', '######', '.####.'],
  N: ['##...##', '###..##', '####.##', '##.####', '##..###', '##...##', '##...##'],
  J: ['....##', '....##', '....##', '....##', '##..##', '######', '.####.'],
  U: ['##..##', '##..##', '##..##', '##..##', '##..##', '######', '.####.'],
  R: ['#####.', '######', '##..##', '######', '####..', '##.###', '##..##'],
  E: ['######', '######', '##....', '#####.', '##....', '######', '######'],
};
const CELL = 10;
const ROWS = 7;
const NS = 'http://www.w3.org/2000/svg';

/** The closed outlines of a glyph's filled cells, as one SVG path (even-odd keeps the holes). */
export function outline(rows: string[], left: number): string {
  const filled = (x: number, y: number) => rows[y]?.[x] === '#';
  const edges = new Map<string, [number, number][]>();
  const add = (from: [number, number], to: [number, number]) => {
    const key = from.join(',');
    edges.set(key, [...(edges.get(key) ?? []), to]);
  };
  rows.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell !== '#') return;
    if (!filled(x, y - 1)) add([x, y], [x + 1, y]);
    if (!filled(x + 1, y)) add([x + 1, y], [x + 1, y + 1]);
    if (!filled(x, y + 1)) add([x + 1, y + 1], [x, y + 1]);
    if (!filled(x - 1, y)) add([x, y + 1], [x, y]);
  }));
  const loops: string[] = [];
  for (const [startKey, outgoing] of edges) {
    while (outgoing.length) {
      const start = startKey.split(',').map(Number) as [number, number];
      const points: [number, number][] = [start];
      let next = outgoing.shift()!;
      while (next.join(',') !== startKey) {
        points.push(next);
        const onward = edges.get(next.join(','));
        if (!onward?.length) break;
        next = onward.shift()!;
      }
      // Drop points in the middle of a straight run.
      const corners = points.filter((point, index) => {
        const before = points[(index - 1 + points.length) % points.length];
        const after = points[(index + 1) % points.length];
        return (point[0] - before[0]) * (after[1] - point[1]) !== (point[1] - before[1]) * (after[0] - point[0]);
      });
      loops.push(`M${corners.map(([x, y]) => `${left + x * CELL} ${y * CELL}`).join('L')}Z`);
    }
  }
  return loops.join('');
}

interface Print { url: string; look: string | null }
/** The print a letter is showing, for the page to wear while the letter is hovered. */
export interface LetterPrint { url: string; image: HTMLImageElement; look: string | null }

/**
 * Prints for the letters, drawn from several places across the whole gallery rather than one run of
 * neighbours (a session or a lap of ideas saves many prints of one look in a row), and at most one per
 * look, so the liveliest-slice pick below cannot fill every letter with the most saturated treatment.
 */
async function randomPrints(count: number): Promise<Print[]> {
  try {
    const head = (await (await fetch('/api/gallery?limit=1')).json()) as { total: number };
    const span = 24;
    const windows = Array.from({ length: 5 }, () => Math.floor(Math.random() * Math.max(1, head.total - span)));
    const pages = await Promise.all(windows.map(async (offset) => (await (await fetch(`/api/gallery?limit=${span}&offset=${offset}`)).json()) as { entries: { day: string; id: string; hasPrint: boolean; look?: { id: string } | null }[] }));
    const prints = pages.flatMap((page) => page.entries).filter((entry) => entry.hasPrint).map((entry) => ({ url: `/gallery/files/${entry.day}/${encodeURIComponent(entry.id)}.print.jpg`, look: entry.look?.id ?? null }));
    for (let at = prints.length - 1; at > 0; at--) { const swap = Math.floor(Math.random() * (at + 1)); [prints[at], prints[swap]] = [prints[swap], prints[at]]; }
    const looks = new Set<string>();
    const urls = new Set<string>();
    return prints.filter((print) => {
      if (urls.has(print.url) || (print.look && looks.has(print.look))) return false;
      urls.add(print.url);
      if (print.look) looks.add(print.look);
      return true;
    }).slice(0, count);
  } catch {
    return [];
  }
}

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = url;
});

export interface Wordmark {
  /** Show a new picture in one of the letters, for a moment of recognition after a print. */
  feature(url: string): void;
  /** Give the next letter in turn a new slice from the gallery. */
  step(): void;
}

export interface WordmarkOptions {
  /** A letter is hovered (its print), or the pointer has left the name (null). */
  hover?(print: LetterPrint | null): void;
}

export function installWordmark(host: HTMLElement, options: WordmarkOptions = {}, word = 'CONJURE'): Wordmark {
  const svg = document.createElementNS(NS, 'svg');
  const letters = [...word].filter((letter) => GLYPHS[letter]);
  let left = 0;
  const glyphs = letters.map((letter, index) => {
    const rows = GLYPHS[letter];
    const width = rows[0].length * CELL;
    const d = outline(rows, left);
    const group = document.createElementNS(NS, 'g');
    group.classList.add('glyph');
    group.style.setProperty('--i', String(index));
    const clip = document.createElementNS(NS, 'clipPath');
    clip.id = `wordmark-clip-${index}`;
    const clipPath = document.createElementNS(NS, 'path');
    clipPath.setAttribute('d', d);
    clip.append(clipPath);
    const pane = document.createElementNS(NS, 'g');
    pane.setAttribute('clip-path', `url(#${clip.id})`);
    const ground = document.createElementNS(NS, 'rect');
    ground.setAttribute('x', String(left));
    ground.setAttribute('width', String(width));
    ground.setAttribute('height', String(ROWS * CELL));
    ground.classList.add('ground');
    const image = document.createElementNS(NS, 'image');
    image.classList.add('slice');
    image.setAttribute('preserveAspectRatio', 'none');
    pane.append(ground, image);
    const edge = document.createElementNS(NS, 'path');
    edge.setAttribute('d', d);
    edge.classList.add('edge');
    const trace = document.createElementNS(NS, 'path');
    trace.setAttribute('d', d);
    trace.setAttribute('pathLength', '1');
    trace.classList.add('trace');
    group.append(clip, pane, edge, trace);
    svg.append(group);
    // A clear box over the whole letter, so the pointer is on it between its strokes too.
    const hit = document.createElementNS(NS, 'rect');
    for (const [name, value] of [['x', left - CELL / 2], ['y', -CELL / 2], ['width', width + CELL], ['height', ROWS * CELL + CELL]] as const) hit.setAttribute(name, String(value));
    hit.classList.add('hit');
    group.append(hit);
    const glyph: { group: SVGElement; image: SVGElement; left: number; width: number; print?: LetterPrint } = { group, image, left, width };
    left += width + CELL;
    return glyph;
  });
  const height = ROWS * CELL;
  svg.setAttribute('viewBox', `-4 -4 ${left - CELL + 8} ${height + 8}`);
  svg.setAttribute('aria-hidden', 'true');
  host.append(svg);

  type Glyph = (typeof glyphs)[number];
  /** A random zoomed slice of a picture for a letter, with its pixels. */
  const slice = (glyph: Glyph, picture: HTMLImageElement) => {
    const size = height * (2 + Math.random() * 2.6);
    const x = glyph.left - Math.random() * (size - glyph.width);
    const y = -Math.random() * (size - height);
    const scale = picture.naturalWidth / size;
    const pixels = sample(picture, { x: (glyph.left - x) * scale, y: -y * scale, width: glyph.width * scale, height: height * scale }, 24);
    return { x, y, size, pixels };
  };
  let hovered: Glyph | null = null;
  for (const glyph of glyphs) glyph.group.addEventListener('pointerenter', () => { hovered = glyph; if (glyph.print) options.hover?.(glyph.print); });
  svg.addEventListener('pointerleave', () => { hovered = null; options.hover?.(null); });
  /** Frame a slice of a picture in a letter, and give its trace the slice's liveliest colour. */
  const show = (glyph: Glyph, url: string, cut: ReturnType<typeof slice>, picture: HTMLImageElement, look: string | null) => {
    glyph.print = { url, image: picture, look };
    if (hovered === glyph) options.hover?.(glyph.print);
    glyph.image.setAttribute('href', url);
    for (const [name, value] of [['x', cut.x], ['y', cut.y], ['width', cut.size], ['height', cut.size]] as const) glyph.image.setAttribute(name, value.toFixed(1));
    const [r, g, b] = vivid(cut.pixels);
    glyph.group.style.setProperty('--trace', `rgb(${r} ${g} ${b})`);
    glyph.group.classList.add('filled');
  };

  // Many prints are pale sheets; each letter takes the most colourful of a few slices from a larger pool.
  const pool: { url: string; look: string | null; picture: HTMLImageElement }[] = [];
  let refilling: Promise<void> | null = null;
  const refill = () => (refilling ??= randomPrints(glyphs.length * 3).then(async (prints) => {
    const loaded = await Promise.all(prints.map(async (print) => ({ url: print.url, look: print.look, picture: await loadImage(print.url).catch(() => null) })));
    const shown = new Set(glyphs.map((glyph) => glyph.image.getAttribute('href')));
    for (const item of loaded) if (item.picture && !shown.has(item.url) && !pool.some((held) => held.url === item.url)) pool.push(item as (typeof pool)[number]);
  }).finally(() => { refilling = null; }));
  /** The liveliest of a few slices from the pool, taken out of it. */
  const pick = (glyph: Glyph) => {
    let best: { at: number; cut: ReturnType<typeof slice>; score: number } | null = null;
    for (let at = 0; at < Math.min(pool.length, 4); at++)
      for (let attempt = 0; attempt < 3; attempt++) {
        const cut = slice(glyph, pool[at].picture);
        const score = colourfulness(cut.pixels);
        if (!best || score > best.score) best = { at, cut, score };
      }
    if (!best) return null;
    const [chosen] = pool.splice(best.at, 1);
    return { url: chosen.url, look: chosen.look, picture: chosen.picture, cut: best.cut };
  };
  void refill().then(() => {
    for (const glyph of glyphs) {
      const next = pick(glyph);
      if (next) show(glyph, next.url, next.cut, next.picture, next.look);
    }
  });

  let turn = 0;
  return {
    feature(url) {
      const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
      void loadImage(url).then((picture) => show(glyph, url, slice(glyph, picture), picture, null)).catch(() => undefined);
    },
    step() {
      const glyph = glyphs[turn++ % glyphs.length];
      const swap = (next: NonNullable<ReturnType<typeof pick>>) => {
        show(glyph, next.url, next.cut, next.picture, next.look);
        // Restart the swap animation even on quick repeat clicks.
        glyph.group.classList.remove('swapped');
        void glyph.group.getBoundingClientRect();
        glyph.group.classList.add('swapped');
      };
      const next = pick(glyph);
      if (next) swap(next);
      else void refill().then(() => { const late = pick(glyph); if (late) swap(late); });
      if (pool.length < 4) void refill();
    },
  };
}
