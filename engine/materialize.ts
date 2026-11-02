import type { Capture, MaterialName, Palette, QuestionSet } from '@conjure/kit';
import { MATERIAL_NAMES, impliedMaterial, paintRGB, score, sparkleAt, surfaceAt } from '@conjure/kit';
import { printInks } from './otherworld';

/**
 * Materials made visible through any medium. After the look (and any accent) has printed the frame,
 * one pass reads what each surface is made of from the capture and shows it in the print's own
 * inks: mirror metal takes banded reflections, lacquer a hard glint, chalk loses its highlights and
 * gains a tooth, velvet darkens where it faces you and lights along its edges, glitter twinkles,
 * glass rims with light, a luminous thing haloes. The print's lightest and darkest colours are the
 * only ones it adds, so a watercolour stays a watercolour and a toner print a toner print; a look
 * that renders materials in its own medium declares `materials: 'own'` and is left alone. One typed
 * routing question says how far the surfaces show through the medium at all.
 */
export const MATERIALIZE_QUESTIONS = {
  materialize: score('How much should the surfaces of things show through the medium of this print: the shine of metal, the glint of glass, the sparkle of glitter, the flatness of chalk?', [
    'Not at all: the medium flattens every surface alike',
    'A hint: only the strongest shine and sparkle come through',
    'Clearly: metal shines, glass glints, matte stays flat',
    'Fully: the print itself seems made of each thing’s material',
  ]),
} satisfies QuestionSet;

export const MATERIALIZE_NAMES: readonly string[] = Object.keys(MATERIALIZE_QUESTIONS);

export interface Materialize {
  /** 0 the medium flattens everything … 1 the print seems made of each material. */
  weight: number;
}

/** Below this weight the medium flattens every surface and the pass is skipped. */
export const MATERIALIZE_FLOOR = 0.12;

export function materializeOf(answers: Record<string, string | number | boolean>): Materialize {
  const weight = Number(answers.materialize);
  return { weight: Number.isFinite(weight) ? Math.min(1, Math.max(0, weight)) : 0 };
}

type RGB = readonly [number, number, number];
const WHITE: RGB = [255, 255, 255];
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (lo: number, hi: number, value: number) => { const t = clamp01((value - lo) / (hi - lo)); return t * t * (3 - 2 * t); };
const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** A repeatable hash of a lattice point, in [0, 1). */
function hash(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, y: number, s: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(0, 1, x - ix), fy = smooth(0, 1, y - iy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
/** Distances to the nearest and second-nearest jittered lattice points, in units of the spacing. */
function cellular(x: number, y: number, spacing: number, s: number): [number, number] {
  const u = x / spacing, v = y / spacing, iu = Math.floor(u), iv = Math.floor(v);
  let first = 9, second = 9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = iu + i + hash(iu + i, iv + j, s), cy = iv + j + hash(iu + i, iv + j, s + 1);
    const d = Math.hypot(u - cx, v - cy);
    if (d < first) second = first, first = d;
    else if (d < second) second = d;
  }
  return [first, second];
}

/** Box blur in place, a few passes for a soft bell. */
function blur(field: Float32Array, n: number, radius: number, passes: number) {
  const line = new Float32Array(n);
  const span = radius * 2 + 1;
  for (let pass = 0; pass < passes; pass++) {
    for (let axis = 0; axis < 2; axis++) {
      const step = axis === 0 ? 1 : n, other = axis === 0 ? n : 1;
      for (let row = 0; row < n; row++) {
        const base = row * other;
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += field[base + Math.min(n - 1, Math.max(0, k)) * step];
        for (let k = 0; k < n; k++) {
          line[k] = sum / span;
          sum += field[base + Math.min(n - 1, k + radius + 1) * step] - field[base + Math.max(0, k - radius) * step];
        }
        for (let k = 0; k < n; k++) field[base + k * step] = line[k];
      }
    }
  }
}

/**
 * The environment a mirror reflects, as the print's own tones: a bright horizon band, a paler sky
 * above, dark ground below, and two thin streak lights, varying round the reflection's azimuth.
 */
function environment(rx: number, ry: number, seed: number): number {
  const band = Math.exp(-(((ry - 0.06) / 0.09) ** 2));
  const sky = ry > 0.05 ? 0.25 + 0.45 * smooth(0.05, 0.55, ry) : 0.08 + 0.1 * smooth(-0.6, -0.05, ry);
  const streak1 = 0.45 * Math.exp(-(((ry - 0.42) / 0.025) ** 2)) * (0.55 + 0.45 * Math.cos(rx * 4 + seed * 0.001));
  const streak2 = 0.3 * Math.exp(-(((ry + 0.3) / 0.03) ** 2)) * (0.5 + 0.5 * Math.cos(rx * 2.5 + seed * 0.0017));
  return clamp01(sky + 0.7 * band + streak1 + streak2);
}

const ALL: readonly MaterialName[] = MATERIAL_NAMES;
const index = (name: MaterialName) => ALL.indexOf(name) + 1;
const CHROME = index('chrome'), BRUSHED = index('brushed'), GLOSS = index('gloss'), SATIN = index('satin'), MATTE = index('matte'), VELVET = index('velvet');
const RUBBER = index('rubber'), LEATHER = index('leather'), GLASS = index('glass'), GLITTER = index('glitter'), WET = index('wet'), GLOW = index('glow');

/**
 * Show every surface's material through the print, in the print's own lightest and darkest colours.
 * `phase` moves the glitter's twinkle round a loop; the same seed and phase repeat exactly. The
 * input pixels are left as they were.
 */
export function applyMaterialize(pixels: Uint8ClampedArray, capture: Capture, materialize: Materialize, seed: number, phase = 0, palette?: Palette): { pixels: Uint8ClampedArray; note: string } {
  const n = capture.size, N = n * n, unit = n / 720;
  const weight = clamp01(materialize.weight);
  if (weight < MATERIALIZE_FLOOR) return { pixels, note: 'Materials: the medium flattens every surface alike' };
  if (!capture.material && !capture.backdrop) return { pixels, note: 'Materials: none recorded with this capture' };

  // What each pixel shows, and how strongly: the named material, or the one its build implies.
  const treat = new Uint8Array(N);
  const strength = new Float32Array(N);
  const area = new Float64Array(ALL.length + 1), built = new Float64Array(ALL.length + 1);
  for (let i = 0; i < N; i++) {
    if (capture.material?.[i * 4 + 2] === 255) continue;
    const surface = surfaceAt(capture, i);
    const implied = impliedMaterial(surface);
    if (!implied) continue;
    const at = index(implied.name);
    treat[i] = at;
    strength[i] = implied.strength * weight;
    area[at]++;
    if (!surface.material) built[at]++;
  }
  let treated = 0;
  for (let at = 1; at <= ALL.length; at++) treated += area[at];
  if (!treated) return { pixels, note: 'Materials: every surface is plain, nothing to show' };

  const { ink, paper } = printInks(pixels, N);
  const hi = mixRGB(paper, WHITE, 0.45), hot = mixRGB(paper, WHITE, 0.75), lo = ink;
  const second: RGB = palette ? paintRGB(palette.second) : hi;
  const sheenColour = mixRGB(hi, second, palette ? 0.3 : 0);
  const [lx, ly, lz] = capture.light;
  const lightLength = Math.hypot(lx, ly, lz) || 1;
  // Normals are view space with y up; the capture's light has y down.
  const Lx = lx / lightLength, Ly = -ly / lightLength, Lz = lz / lightLength;
  const hLength = Math.hypot(Lx, Ly, Lz + 1) || 1;
  const Hx = Lx / hLength, Hy = Ly / hLength, Hz = (Lz + 1) / hLength;
  // Full light, as the plain-lit pass shows it: the level the brightest twentieth of surfaces reach.
  const tones = new Uint32Array(256);
  let solid = 0;
  for (let i = 0; i < N; i++) if (capture.identity[i * 4] > 0) tones[capture.diffuse[i * 4]]++, solid++;
  let lit = 255;
  for (let seen = 0; lit > 20 && seen < solid * 0.05; lit--) seen += tones[lit];

  const out = new Uint8ClampedArray(pixels);
  const need = (at: number) => area[at] > 0;
  // A soft local mean of the print, for surfaces that swallow their highlights.
  let mean: Float32Array[] | null = null;
  if (need(MATTE) || need(RUBBER)) {
    mean = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
    for (let i = 0; i < N; i++) mean[0][i] = pixels[i * 4], mean[1][i] = pixels[i * 4 + 1], mean[2][i] = pixels[i * 4 + 2];
    for (const channel of mean) blur(channel, n, Math.max(1, Math.round(2 * unit)), 2);
  }
  const wetShine = need(WET) ? new Float32Array(N) : null;
  const glowMask = need(GLOW) ? new Float32Array(N) : null;
  let glowR = 0, glowG = 0, glowB = 0, glowCount = 0;
  if (glowMask) for (let i = 0; i < N; i++) if (treat[i] === GLOW) glowR += pixels[i * 4], glowG += pixels[i * 4 + 1], glowB += pixels[i * 4 + 2], glowCount++;
  const glowColour: RGB = glowCount ? mixRGB([glowR / glowCount, glowG / glowCount, glowB / glowCount], hi, 0.4) : hi;
  const step = Math.floor(((phase % 1) + 1) % 1 * 8);
  const glintCell = Math.max(2, Math.round(3 * unit)), starCell = Math.max(3, Math.round(4 * unit)), dustCell = Math.max(2, Math.round(2 * unit));
  const pebble = Math.max(3, 5 * unit);

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x, at = treat[i];
      if (!at) continue;
      const t = strength[i];
      const p = i * 4;
      let r = pixels[p], g = pixels[p + 1], b = pixels[p + 2];
      const backdrop = capture.identity[p] === 0;
      const nx = capture.normal[p] / 127.5 - 1, ny = capture.normal[p + 1] / 127.5 - 1, nz = capture.normal[p + 2] / 127.5 - 1;
      const ndl = nx * Lx + ny * Ly + nz * Lz;
      const ndh = Math.max(0, nx * Hx + ny * Hy + nz * Hz);
      const facing = clamp01(nz);
      const fresnel = (1 - facing) ** 3;
      // Specular light is weak in shadow: the plain-lit pass says where the light reaches.
      const shade = backdrop ? 1 : clamp01(capture.diffuse[p] / lit);
      const specMask = 0.25 + 0.75 * shade;
      const L = luma(r, g, b);
      const lift = (colour: RGB, amount: number) => { const k = clamp01(amount); r += (colour[0] - r) * k; g += (colour[1] - g) * k; b += (colour[2] - b) * k; };
      const tintOf = (): RGB => { const l = Math.max(L, 1); return [Math.min(1.5, Math.max(0.5, r / l)), Math.min(1.5, Math.max(0.5, g / l)), Math.min(1.5, Math.max(0.5, b / l))]; };
      const saturate = (amount: number) => { const l = luma(r, g, b); r = l + (r - l) * amount; g = l + (g - l) * amount; b = l + (b - l) * amount; };

      switch (at) {
        case CHROME: {
          const rx = 2 * nz * nx, ry = 2 * nz * ny;
          const E = environment(rx, ry, seed);
          const tint = tintOf();
          const mirror = mixRGB(lo, hi, E);
          lift([mirror[0] * (0.55 + 0.45 * tint[0]), mirror[1] * (0.55 + 0.45 * tint[1]), mirror[2] * (0.55 + 0.45 * tint[2])], 0.8 * t);
          lift(hot, ndh ** 48 * specMask * 0.9 * t);
          break;
        }
        case BRUSHED: {
          const ry = 2 * nz * ny;
          const line = (hash(y + Math.round(nx * 14), Math.floor(x / (7 * unit)), seed + 3) - 0.5) * 0.18;
          const E = clamp01(0.15 + 0.5 * smooth(-0.5, 0.5, ry) + 0.35 * Math.exp(-(((ry - 0.1) / 0.25) ** 2)) + line);
          const tint = tintOf();
          const metal = mixRGB(lo, hi, E);
          lift([metal[0] * (0.55 + 0.45 * tint[0]), metal[1] * (0.55 + 0.45 * tint[1]), metal[2] * (0.55 + 0.45 * tint[2])], 0.6 * t);
          lift(hi, ndh ** 8 * 0.35 * specMask * t);
          break;
        }
        case GLOSS: {
          lift(hot, (ndh ** 70 * 0.9 + ndh ** 10 * 0.18) * specMask * t);
          if (ndl < 0.25) lift(lo, 0.2 * t * (0.25 - ndl) / 1.25);
          saturate(1 + 0.2 * t);
          break;
        }
        case SATIN:
          lift(sheenColour, (ndh ** 8 * 0.45 + fresnel * 0.3) * specMask * t);
          break;
        case MATTE: {
          const m: RGB = [mean![0][i], mean![1][i], mean![2][i]];
          // Highlights sink into the surface; shadows lift a little; a fine tooth throughout.
          if (L > luma(m[0], m[1], m[2])) lift(m, 0.5 * t);
          if (L < luma(lo[0], lo[1], lo[2]) + 30) lift(mixRGB(lo, hi, 0.25), 0.15 * t);
          const tooth = (hash(x, y, seed + 5) - 0.5) * 18 * t * (0.5 + 0.5 * clamp01(ndl));
          r += tooth; g += tooth; b += tooth;
          break;
        }
        case VELVET: {
          const rim = (1 - facing) ** 1.5;
          lift(lo, 0.3 * t * facing * facing);
          lift(hi, 0.55 * t * rim * (0.4 + 0.6 * clamp01(ndl * 0.5 + 0.5)));
          const nap = (hash(x + Math.round(y * 0.3), y, seed + 7) - 0.5) * 8 * t;
          r += nap; g += nap; b += nap;
          break;
        }
        case RUBBER: {
          lift(lo, 0.14 * t);
          const m: RGB = [mean![0][i], mean![1][i], mean![2][i]];
          if (L > luma(m[0], m[1], m[2])) lift(m, 0.3 * t);
          lift(mixRGB(hi, [r, g, b], 0.5), ndh ** 10 * 0.25 * specMask * t);
          break;
        }
        case LEATHER: {
          const [first, secondCell] = cellular(x, y, pebble, seed + 9);
          const wall = 1 - clamp01((secondCell - first) / 0.35);
          lift(lo, 0.18 * t * wall * (0.6 + 0.4 * (1 - shade)));
          if (Math.abs(noise(x / (55 * unit), y / (55 * unit), seed + 11) - 0.5) < 0.012) lift(lo, 0.3 * t);
          lift(hi, ndh ** 16 * 0.3 * specMask * t);
          break;
        }
        case GLASS: {
          lift(mixRGB([r, g, b], hi, 0.35), 0.35 * t);
          lift(hot, ((1 - facing) ** 2.5 * 0.75 + ndh ** 120 * 0.95 * specMask) * t);
          if (ndl < -0.3) lift(hi, 0.25 * t * (-ndl - 0.3) / 0.7);
          break;
        }
        case GLITTER: {
          if (!backdrop) {
            lift(hi, ndh ** 6 * 0.12 * specMask * t);
            // Every cell holds one facet, tilted its own way; the facets that catch the light flash.
            lift(WHITE, sparkleAt(x, y, [nx, ny, nz], [Hx, Hy, Hz], glintCell, seed, step) * t);
          } else {
            // Glitter on the backdrop: a field of stars, a few bright ones flaring, dust between them.
            const pale = L > 160;
            const starColour = (seedOffset: number) => (pale ? mixRGB(lo, second, 0.5) : hash(x, y, seedOffset) < 0.2 ? mixRGB(WHITE, second, 0.4) : WHITE);
            let star = 0;
            const cu = Math.floor(x / starCell), cv = Math.floor(y / starCell);
            for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
              const gu = cu + k, gv = cv + j;
              if (hash(gu, gv, seed + 19) > 0.35) continue;
              const gx = (gu + hash(gu, gv, seed + 20)) * starCell, gy = (gv + hash(gu, gv, seed + 21)) * starCell;
              const dx = x + 0.5 - gx, dy = y + 0.5 - gy;
              const bright = hash(gu, gv, seed + 22) ** 2.2 * (0.3 + 0.7 * hash(gu, gv, seed + 23 + step));
              const radius = 0.8 + 1.4 * bright * bright;
              const d = Math.hypot(dx, dy);
              const core = d < radius ? bright * (1 - (d / radius) * 0.5) : 0;
              const arm = bright > 0.75 && ((Math.abs(dx) < 0.6 && Math.abs(dy) < 3.5) || (Math.abs(dy) < 0.6 && Math.abs(dx) < 3.5)) ? bright * 0.45 * (1 - Math.max(Math.abs(dx), Math.abs(dy)) / 3.5) : 0;
              star = Math.max(star, core, arm);
            }
            const du = Math.floor(x / dustCell), dv = Math.floor(y / dustCell);
            if (hash(du, dv, seed + 25) < 0.5 && Math.floor((du + hash(du, dv, seed + 26)) * dustCell) === x && Math.floor((dv + hash(du, dv, seed + 27)) * dustCell) === y) star = Math.max(star, hash(du, dv, seed + 28) ** 4 * 0.35);
            lift(starColour(seed + 29), star * (pale ? 0.5 : 1) * t);
          }
          break;
        }
        case WET: {
          lift(lo, 0.2 * t);
          saturate(1 + 0.25 * t);
          // Highlights stretch tall, as reflections do on a wet surface.
          const sl = Math.hypot(nx, ny * 0.3, nz) || 1;
          const shine = Math.max(0, (nx * Hx + ny * 0.3 * Hy + nz * Hz) / sl) ** 50 * 0.95 * specMask;
          wetShine![i] = shine * t;
          lift(hot, shine * 0.6 * t);
          break;
        }
        case GLOW:
          lift(hi, 0.3 * t);
          glowMask![i] = t * (0.5 + 0.5 * surfaceAt(capture, i).glow);
          break;
      }
      out[p] = r; out[p + 1] = g; out[p + 2] = b;
    }
  }

  // Wet reflections run downward from each highlight.
  if (wetShine) {
    for (let x = 0; x < n; x++) {
      let run = 0;
      for (let y = 0; y < n; y++) {
        const i = y * n + x;
        if (treat[i] !== WET) { run = 0; continue; }
        run = Math.max(wetShine[i], run * 0.92);
        const k = clamp01(run * 0.35);
        if (k <= 0.002) continue;
        const p = i * 4;
        out[p] += (hi[0] - out[p]) * k; out[p + 1] += (hi[1] - out[p + 1]) * k; out[p + 2] += (hi[2] - out[p + 2]) * k;
      }
    }
  }
  // Luminous surfaces halo into their surroundings.
  if (glowMask) {
    blur(glowMask, n, Math.max(2, Math.round(8 * unit)), 2);
    for (let i = 0; i < N; i++) {
      if (treat[i] === GLOW) continue;
      const k = clamp01(glowMask[i] * 0.9);
      if (k <= 0.004) continue;
      const p = i * 4;
      out[p] += (glowColour[0] - out[p]) * k; out[p + 1] += (glowColour[1] - out[p + 1]) * k; out[p + 2] += (glowColour[2] - out[p + 2]) * k;
    }
  }

  // A material is "as built" when most of its surface was never named: the build itself said so.
  const shown = ALL.map((name, at) => ({ name, share: area[at + 1] / N, built: built[at + 1] * 2 > area[at + 1] }))
    .filter((item) => item.share > 0)
    .sort((a, b) => b.share - a.share)
    .map((item) => `${item.name}${capture.backdrop === item.name ? ' backdrop' : ''}${item.built ? ' (as built)' : ''} ${item.share >= 0.005 ? Math.round(item.share * 100) : '<1'}%`);
  return { pixels: out, note: `Materials at ${Math.round(weight * 100)}%: ${shown.join(', ')}` };
}
