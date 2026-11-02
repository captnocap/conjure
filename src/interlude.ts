import { hashText, seeded } from '@conjure/kit';
import { FRAME_SIZE } from '../engine/stage';

/**
 * Between pictures the frame never falls back to the bare scene being built. The last print breaks
 * up and keeps moving while the next idea is decided, built and printed, then the new print comes
 * together in its place. Which interlude plays is a pseudorandom pick from the idea and the roll,
 * never the same twice running:
 *   shatter   the print bursts into shards that tumble in a slow swirl, then fly home as the new one
 *   scramble  the print is cut into tiles that keep shuffling, then flip over and slide into order
 *   bounce    the print shrinks to a card that bounces round the frame, changing hue at every wall
 */
type Kind = 'shatter' | 'scramble' | 'bounce';
const KINDS: Kind[] = ['shatter', 'scramble', 'bounce'];
const S = FRAME_SIZE;

type Source = CanvasImageSource;
type Point = [number, number];
interface Shard { points: Point[]; home: Point; box: [number, number, number, number]; x: number; y: number; angle: number; vx: number; vy: number; spin: number; from?: { x: number; y: number; angle: number }; delay: number }
interface Tile { col: number; row: number; slot: number; x: number; y: number; from?: Point; moved: number; delay: number }

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeBack = (t: number) => { const c = 1.6; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export interface Interlude {
  /** Break up the picture now on show; the interlude plays until finish or cancel. */
  start(picture: Source, seedText: string): void;
  /** Bring the new picture together; resolves once it stands whole. */
  finish(picture: Source): Promise<void>;
  /** Stop at once, for a failed or abandoned idea. */
  cancel(): void;
  readonly active: boolean;
}

/** A snapshot, so the interlude keeps its picture while the print canvas is reused underneath. */
function copy(picture: Source): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  canvas.getContext('2d')!.drawImage(picture, 0, 0, S, S);
  return canvas;
}

export function installInterlude(frame: HTMLElement, onChange: () => void): Interlude {
  const canvas = document.createElement('canvas');
  canvas.id = 'interlude';
  canvas.width = canvas.height = S;
  canvas.setAttribute('aria-hidden', 'true');
  frame.append(canvas);
  const context = canvas.getContext('2d')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  let kind: Kind | null = null;
  let last: Kind | null = null;
  let old: HTMLCanvasElement | null = null;
  let next: HTMLCanvasElement | null = null;
  let random = Math.random;
  let began = 0;
  let finishing = 0;
  let previous = 0;
  let frameId = 0;
  let done: (() => void) | null = null;
  let shards: Shard[] = [];
  let tiles: Tile[] = [];
  let grid = 5;
  let swapAt = 0;
  const card = { x: 0, y: 0, vx: 0, vy: 0, size: S * 0.3, hue: 0, flash: 0, hits: 0 };

  const ground = () => getComputedStyle(frame).backgroundColor || '#e5e7de';
  const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#b4532f';

  // Shatter: a jittered grid cut into triangles, blown out from an impact point.
  const shatter = () => {
    const cells = 7 + Math.floor(random() * 4);
    const step = S / cells;
    const points: Point[][] = [];
    for (let i = 0; i <= cells; i++) {
      points.push([]);
      for (let j = 0; j <= cells; j++) {
        const edge = (n: number) => n === 0 || n === cells;
        points[i].push([i * step + (edge(i) ? 0 : (random() - 0.5) * step * 0.8), j * step + (edge(j) ? 0 : (random() - 0.5) * step * 0.8)]);
      }
    }
    const impact: Point = [S * (0.3 + random() * 0.4), S * (0.3 + random() * 0.4)];
    shards = [];
    for (let i = 0; i < cells; i++)
      for (let j = 0; j < cells; j++) {
        const [a, b, c, d] = [points[i][j], points[i + 1][j], points[i + 1][j + 1], points[i][j + 1]];
        for (const triangle of random() < 0.5 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]]) {
          const home: Point = [(triangle[0][0] + triangle[1][0] + triangle[2][0]) / 3, (triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3];
          const xs = triangle.map((p) => p[0]), ys = triangle.map((p) => p[1]);
          const box: Shard['box'] = [Math.floor(Math.min(...xs)), Math.floor(Math.min(...ys)), Math.ceil(Math.max(...xs) - Math.min(...xs)) + 1, Math.ceil(Math.max(...ys) - Math.min(...ys)) + 1];
          const dx = home[0] - impact[0], dy = home[1] - impact[1], distance = Math.hypot(dx, dy) || 1;
          const speed = (170 + random() * 260) * (1.2 - distance / (S * 1.4));
          shards.push({ points: triangle.map((p) => [p[0] - home[0], p[1] - home[1]]) as Point[], home, box, x: home[0], y: home[1], angle: 0, vx: (dx / distance) * speed + (random() - 0.5) * 80, vy: (dy / distance) * speed + (random() - 0.5) * 80, spin: (random() - 0.5) * 7, delay: 0 });
        }
      }
  };
  const moveShards = (dt: number) => {
    for (const shard of shards) {
      if (shard.from) continue;
      // Drag settles the burst into a drift; a gentle swirl and a soft wall keep the debris in the frame.
      const drag = Math.exp(-1.9 * dt);
      shard.vx *= drag; shard.vy *= drag; shard.spin *= Math.exp(-0.6 * dt);
      const rx = shard.x - S / 2, ry = shard.y - S / 2;
      shard.vx += -ry * 0.22 * dt - rx * 0.05 * dt;
      shard.vy += rx * 0.22 * dt - ry * 0.05 * dt;
      for (const [position, axis] of [[shard.x, 'vx'], [shard.y, 'vy']] as const) {
        if (position < S * 0.08) shard[axis] += (S * 0.08 - position) * 9 * dt;
        if (position > S * 0.92) shard[axis] -= (position - S * 0.92) * 9 * dt;
      }
      shard.x += shard.vx * dt; shard.y += shard.vy * dt; shard.angle += shard.spin * dt;
    }
  };
  const drawShards = (time: number) => {
    for (const shard of shards) {
      let { x, y, angle } = shard;
      let picture = old!;
      if (shard.from && next) {
        const t = clamp((time - finishing - shard.delay) / 0.85);
        const k = easeBack(t);
        x = shard.from.x + (shard.home[0] - shard.from.x) * k;
        y = shard.from.y + (shard.home[1] - shard.from.y) * k;
        angle = shard.from.angle * (1 - easeOut(t));
        picture = next;
      }
      const scale = 1 + Math.sin(time * 1.3 + shard.home[0] * 0.02) * 0.04 * (shard.from ? 0 : 1);
      context.setTransform(scale * Math.cos(angle), scale * Math.sin(angle), -scale * Math.sin(angle), scale * Math.cos(angle), x, y);
      context.beginPath();
      shard.points.forEach(([px, py], index) => (index ? context.lineTo(px, py) : context.moveTo(px, py)));
      context.closePath();
      context.save();
      context.clip();
      const [bx, by, bw, bh] = shard.box;
      context.drawImage(picture, bx, by, Math.min(bw, S - bx), Math.min(bh, S - by), bx - shard.home[0], by - shard.home[1], Math.min(bw, S - bx), Math.min(bh, S - by));
      context.restore();
      context.strokeStyle = 'rgba(255,255,255,0.28)';
      context.lineWidth = 0.8;
      context.stroke();
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
  };

  // Scramble: tiles in slots, swapped a few at a time like a sliding puzzle being shaken.
  const slotXY = (slot: number): Point => [(slot % grid) * (S / grid), Math.floor(slot / grid) * (S / grid)];
  const scramble = () => {
    grid = 4 + Math.floor(random() * 4);
    const order = [...Array(grid * grid).keys()];
    for (let at = order.length - 1; at > 0; at--) { const swap = Math.floor(random() * (at + 1)); [order[at], order[swap]] = [order[swap], order[at]]; }
    tiles = order.map((slot, index) => {
      const home = slotXY(index);
      return { col: index % grid, row: Math.floor(index / grid), slot, x: home[0], y: home[1], from: home, moved: 0, delay: random() * 0.35 };
    });
    swapAt = 0.9;
  };
  const moveTiles = (time: number) => {
    if (finishing || time < swapAt) return;
    swapAt = time + 0.3;
    for (let n = 0; n < 1 + Math.floor(random() * 3); n++) {
      const a = tiles[Math.floor(random() * tiles.length)], b = tiles[Math.floor(random() * tiles.length)];
      if (a === b) continue;
      a.from = [a.x, a.y]; b.from = [b.x, b.y];
      [a.slot, b.slot] = [b.slot, a.slot];
      a.moved = b.moved = time; a.delay = b.delay = 0;
    }
  };
  const drawTiles = (time: number) => {
    const size = S / grid, gap = Math.max(2, size * 0.035);
    for (const tile of tiles) {
      let flip = 1;
      let inset = gap;
      let picture = old!;
      let [tx, ty] = slotXY(tile.slot);
      if (finishing && next) {
        const t = clamp((time - finishing - tile.delay) / 0.7);
        const home = slotXY(tile.row * grid + tile.col);
        const k = easeInOut(t);
        tx = tile.x + (home[0] - tile.x) * k; ty = tile.y + (home[1] - tile.y) * k;
        flip = Math.abs(Math.cos(Math.PI * k));
        // The gaps close as the tiles land.
        inset = gap * (1 - k);
        if (k > 0.5) picture = next;
      } else if (tile.from) {
        const t = easeInOut(clamp((time - tile.moved - tile.delay) / (tile.moved ? 0.28 : 0.6)));
        tx = tile.from[0] + (tx - tile.from[0]) * t; ty = tile.from[1] + (ty - tile.from[1]) * t;
        tile.x = tx; tile.y = ty;
      }
      const w = (size - inset * 2) * Math.max(0.02, flip);
      context.drawImage(picture, tile.col * size, tile.row * size, size, size, tx + size / 2 - w / 2, ty + inset, w, size - inset * 2);
    }
  };

  // Bounce: a card of the print loose in the frame, a new hue at every wall, a flash in a corner.
  const bounce = () => {
    const angle = Math.PI / 4 + (random() - 0.5) * 0.5 + Math.floor(random() * 4) * (Math.PI / 2);
    const speed = 190 + random() * 70;
    Object.assign(card, { x: S / 2, y: S / 2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: S * (0.26 + random() * 0.08), hue: 0, flash: 0, hits: 0 });
  };
  const moveCard = (dt: number, time: number) => {
    if (finishing || time < 0.55) return;
    card.x += card.vx * dt; card.y += card.vy * dt;
    const half = card.size / 2;
    let walls = 0;
    if (card.x < half) { card.x = half; card.vx = Math.abs(card.vx); walls++; }
    if (card.x > S - half) { card.x = S - half; card.vx = -Math.abs(card.vx); walls++; }
    if (card.y < half) { card.y = half; card.vy = Math.abs(card.vy); walls++; }
    if (card.y > S - half) { card.y = S - half; card.vy = -Math.abs(card.vy); walls++; }
    if (walls) { card.hue = (card.hue + 50 + random() * 100) % 360; card.hits++; }
    if (walls > 1) card.flash = 1;
    card.flash = Math.max(0, card.flash - dt * 1.4);
  };
  const drawCard = (time: number) => {
    let size = card.size, x = card.x, y = card.y;
    if (time < 0.55 && !finishing) {
      const k = easeInOut(time / 0.55);
      size = S + (card.size - S) * k; x = S / 2; y = S / 2;
    }
    if (card.flash) { context.globalAlpha = card.flash * 0.6; context.fillStyle = accent(); context.fillRect(0, 0, S, S); context.globalAlpha = 1; }
    const draw = (picture: Source, alpha: number, filtered: boolean) => {
      context.globalAlpha = alpha;
      context.filter = filtered && card.hits ? `hue-rotate(${card.hue}deg) saturate(1.5)` : 'none';
      context.drawImage(picture, x - size / 2, y - size / 2, size, size);
      context.filter = 'none';
      context.globalAlpha = 1;
    };
    if (finishing && next) {
      const k = easeInOut(clamp((time - finishing) / 0.75));
      size = card.size + (S - card.size) * k;
      x = card.x + (S / 2 - card.x) * k; y = card.y + (S / 2 - card.y) * k;
      draw(old!, 1 - k, true);
      draw(next, k, false);
    } else draw(old!, 1, true);
  };

  const loop = (now: number) => {
    const time = (now - began) / 1000;
    const dt = Math.min(0.05, (now - previous) / 1000);
    previous = now;
    // Trails for the bounce, a clean ground for the rest.
    context.globalAlpha = kind === 'bounce' && !finishing ? 0.35 : 1;
    context.fillStyle = ground();
    context.fillRect(0, 0, S, S);
    context.globalAlpha = 1;
    if (kind === 'shatter') { moveShards(dt); drawShards(time); }
    if (kind === 'scramble') { moveTiles(time); drawTiles(time); }
    if (kind === 'bounce') { moveCard(dt, time); drawCard(time); }
    const length = kind === 'shatter' ? 1.25 : kind === 'scramble' ? 1.1 : 0.8;
    if (finishing && time - finishing >= length) { end(); return; }
    frameId = requestAnimationFrame(loop);
  };
  const end = () => {
    cancelAnimationFrame(frameId);
    canvas.classList.remove('playing');
    kind = null;
    old = next = null;
    finishing = 0;
    const resolve = done;
    done = null;
    resolve?.();
    onChange();
  };

  return {
    start(picture, seedText) {
      if (reduced.matches) return;
      if (kind) end();
      const seed = hashText(seedText);
      random = seeded(seed);
      kind = KINDS[seed % KINDS.length];
      if (kind === last) kind = KINDS[(KINDS.indexOf(kind) + 1) % KINDS.length];
      last = kind;
      old = copy(picture);
      if (kind === 'shatter') shatter();
      if (kind === 'scramble') scramble();
      if (kind === 'bounce') bounce();
      began = previous = performance.now();
      canvas.dataset.kind = kind;
      canvas.classList.add('playing');
      onChange();
      frameId = requestAnimationFrame(loop);
    },
    finish(picture) {
      if (!kind || !old) return Promise.resolve();
      next = copy(picture);
      finishing = Math.max(0.01, (performance.now() - began) / 1000);
      // Shards nearest the middle land first; tiles flip in a scattered order.
      for (const shard of shards) {
        shard.from = { x: shard.x, y: shard.y, angle: shard.angle };
        shard.delay = (Math.hypot(shard.home[0] - S / 2, shard.home[1] - S / 2) / S) * 0.35;
      }
      for (const tile of tiles) tile.delay = random() * 0.4;
      return new Promise((resolve) => { done = resolve; });
    },
    cancel() { if (kind) end(); },
    get active() { return kind !== null; },
  };
}
