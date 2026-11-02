import { type Palette, type PaletteRole, type RGB as Paint, choice, clamp01, defineLook, mix, paintIsMetal, rekey, rekeyOne, score } from '@conjure/kit';

/**
 * Early CGI: the frame is re-rendered the way a 1990s machine would have drawn it.
 *
 *   capture  -> view-space positions from depth (orthographic or perspective, fitted from the
 *               ground), the floor plane and its axes, shadows read from the plain-lit pass
 *   shade    -> Phong plastic with a point-light highlight, chrome and gold reading an analytic
 *               sky-over-checkerboard environment, glass bending the floor behind it
 *   floor    -> a supersampled checkerboard (marble on CD-ROM) with hard shadows, a screen-space
 *               mirror marched through the depth buffer, and haze that dissolves into the sky
 *   wire     -> iso-lines of height and angle on every thing, a tile grid on the floor,
 *               silhouettes from identity, depth and normal breaks; flat facets fill row by row
 *   output   -> render progress, lens flare, an interface frame, then the display's palette
 */

type RGB = [number, number, number];
type Vec = [number, number, number];

const SCHEMES = {
  juggler: 'A deep sky paling to a misty horizon over a bright two-colour checkerboard: the classic home-computer raytracing demo, with glowing phosphor wireframes.',
  sunset: 'A synthetic sunset sweeping through three hues to a pale glow, over a black and vivid checkerboard, with white wireframes.',
  studio: 'A cool graphics-lab backdrop over a black and white checkerboard, with crisp white wireframes.',
  corporate: 'A dark void with a glowing horizon over saturated and silver tiles: a corporate logo flythrough, with bright wireframes.',
  desert: 'A dusty warm sky over earthy and pale tiles: a planetary-probe animation, with contrasting wireframes.',
} as const;
type SchemeKey = keyof typeof SCHEMES;

const SCHEME_COLOURS: Record<SchemeKey, { zenith: string; mid: string; horizon: string; tileA: string; tileB: string; wire: string; panel: string }> = {
  juggler: { zenith: '#0b2a8c', mid: '#3c70d4', horizon: '#d6e6f2', tileA: '#2f8a34', tileB: '#ecd84a', wire: '#55ff78', panel: '#8e9aa8' },
  sunset: { zenith: '#2a0f4a', mid: '#a8459a', horizon: '#f8b083', tileA: '#16101c', tileB: '#c8357f', wire: '#fff0fa', panel: '#9a7f98' },
  studio: { zenith: '#215f63', mid: '#5f9fa0', horizon: '#a8d4cf', tileA: '#1c1c1e', tileB: '#eeeee6', wire: '#f2f2f2', panel: '#97a3a1' },
  corporate: { zenith: '#030820', mid: '#123172', horizon: '#eab64e', tileA: '#1d409a', tileB: '#bcc6d0', wire: '#ffb22e', panel: '#8d8673' },
  desert: { zenith: '#5e2614', mid: '#bd6236', horizon: '#f4c890', tileA: '#8e3c22', tileB: '#e3c597', wire: '#62e8ff', panel: '#a48d76' },
};

/**
 * Under the picture's palette each scheme keeps its tonal design: the sky gradient takes the ground,
 * the checkerboard's lead tile (and corporate's horizon glow) the ink, its other tile the second, and
 * wireframes glow in the ink. Black and white tiles, white wires and silver stay as they are.
 */
const SCHEME_ROLES: Record<SchemeKey, Partial<Record<'zenith' | 'mid' | 'horizon' | 'tileA' | 'tileB', PaletteRole>> & { wire?: boolean }> = {
  juggler: { zenith: 'ground', mid: 'ground', horizon: 'ground', tileA: 'second', tileB: 'ink', wire: true },
  sunset: { zenith: 'ground', mid: 'ground', horizon: 'ground', tileB: 'ink' },
  studio: { zenith: 'ground', mid: 'ground', horizon: 'ground' },
  corporate: { zenith: 'ground', mid: 'ground', horizon: 'ink', tileA: 'second', wire: true },
  desert: { zenith: 'ground', mid: 'ground', horizon: 'ground', tileA: 'ink', tileB: 'second', wire: true },
};
const hexPaint = (h: string): Paint => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const paintHexOf = (c: Paint) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
function schemeIn(key: SchemeKey, palette: Palette | undefined) {
  const scheme = SCHEME_COLOURS[key];
  if (!palette) return scheme;
  const { wire, ...roles } = SCHEME_ROLES[key];
  const sky = rekey({ zenith: hexPaint(scheme.zenith), mid: hexPaint(scheme.mid), horizon: hexPaint(scheme.horizon), tileA: hexPaint(scheme.tileA), tileB: hexPaint(scheme.tileB) }, palette, roles);
  return {
    zenith: paintHexOf(sky.zenith), mid: paintHexOf(sky.mid), horizon: paintHexOf(sky.horizon), tileA: paintHexOf(sky.tileA), tileB: paintHexOf(sky.tileB),
    wire: wire ? paintHexOf(rekeyOne(hexPaint(scheme.wire), palette, 'ink')) : scheme.wire,
    panel: paintHexOf(rekeyOne(hexPaint(scheme.panel), palette, 'ground')),
  };
}

const VGA: RGB[] = [
  [0, 0, 0], [0, 0, 170], [0, 170, 0], [0, 170, 170], [170, 0, 0], [170, 0, 170], [170, 85, 0], [170, 170, 170],
  [85, 85, 85], [85, 85, 255], [85, 255, 85], [85, 255, 255], [255, 85, 85], [255, 85, 255], [255, 255, 85], [255, 255, 255],
];
const BAYER8 = (() => {
  const m = new Float32Array(64);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      let v = 0, xx = x, yy = y ^ x;
      for (let bit = 0; bit < 3; bit++) {
        v = (v << 2) | ((yy & 1) << 1) | (xx & 1);
        xx >>= 1; yy >>= 1;
      }
      // Bit-reversed interleave gives the classic 8x8 ordered matrix.
      let r = 0;
      for (let b = 0; b < 6; b++) r |= ((v >> b) & 1) << (5 - b);
      m[y * 8 + x] = (r + 0.5) / 64;
    }
  return m;
})();

const TO_LIN = (() => {
  const t = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    t[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return t;
})();
const SRGB_STEPS = 8192;
const TO_SRGB = (() => {
  const t = new Float32Array(SRGB_STEPS + 1);
  for (let i = 0; i <= SRGB_STEPS; i++) {
    const v = i / SRGB_STEPS;
    t[i] = 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  }
  return t;
})();
const srgb = (v: number) => (v <= 0 ? 0 : v >= 1 ? 255 : TO_SRGB[(v * SRGB_STEPS) | 0]);
const hexLin = (h: string): Vec => [TO_LIN[parseInt(h.slice(1, 3), 16)], TO_LIN[parseInt(h.slice(3, 5), 16)], TO_LIN[parseInt(h.slice(5, 7), 16)]];

const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const norm = (v: Vec): Vec => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const vnoise = (x: number, y: number, seed: number) => {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const fbm = (x: number, y: number, seed: number) =>
  vnoise(x, y, seed) * 0.5 + vnoise(x * 2.03, y * 2.03, seed + 7) * 0.27 + vnoise(x * 4.1, y * 4.1, seed + 13) * 0.15 + vnoise(x * 8.3, y * 8.3, seed + 29) * 0.08;
const percentile = (values: ArrayLike<number>, at: number) => {
  if (!values.length) return 0;
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * at)))];
};

/** Least squares val = A x + B y + C over (x, y, z) triples, val being z or 1/z. */
function fitPlane(samples: number[], inverse: boolean) {
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, n = 0, sxv = 0, syv = 0, sv = 0;
  for (let i = 0; i < samples.length; i += 3) {
    const x = samples[i], y = samples[i + 1], v = inverse ? 1 / samples[i + 2] : samples[i + 2];
    sxx += x * x; sxy += x * y; syy += y * y; sx += x; sy += y; n++;
    sxv += x * v; syv += y * v; sv += v;
  }
  const m = [sxx, sxy, sx, sxy, syy, sy, sx, sy, n];
  const det3 = (q: number[]) => q[0] * (q[4] * q[8] - q[5] * q[7]) - q[1] * (q[3] * q[8] - q[5] * q[6]) + q[2] * (q[3] * q[7] - q[4] * q[6]);
  const det = det3(m);
  if (!det || !n) return { A: 0, B: 0, C: 0, err: Infinity };
  const swap = (col: number) => { const q = m.slice(); q[col] = sxv; q[col + 3] = syv; q[col + 6] = sv; return det3(q) / det; };
  const A = swap(0), B = swap(1), C = swap(2);
  let res = 0, mean = 0;
  for (let i = 0; i < samples.length; i += 3) {
    const v = inverse ? 1 / samples[i + 2] : samples[i + 2];
    const e = v - (A * samples[i] + B * samples[i + 1] + C);
    res += e * e; mean += Math.abs(v);
  }
  return { A, B, C, err: Math.sqrt(res / n) / Math.max(1e-9, mean / n) };
}

/** Median cut over a sample of the picture: the colours a 256-colour encoder would keep. */
function medianCut(rgb: Uint8ClampedArray, count: number, step: number): RGB[] {
  const pts: number[] = [];
  for (let i = 0; i < rgb.length / 4; i += step) pts.push(rgb[i * 4], rgb[i * 4 + 1], rgb[i * 4 + 2]);
  type Box = { idx: number[]; axis: number; spread: number };
  const describe = (idx: number[]): Box => {
    let r0 = 255, r1 = 0, g0 = 255, g1 = 0, b0 = 255, b1 = 0;
    for (const p of idx) {
      const r = pts[p], g = pts[p + 1], b = pts[p + 2];
      if (r < r0) r0 = r; if (r > r1) r1 = r; if (g < g0) g0 = g; if (g > g1) g1 = g; if (b < b0) b0 = b; if (b > b1) b1 = b;
    }
    const sr = r1 - r0, sg = (g1 - g0) * 1.2, sb = (b1 - b0) * 0.9;
    const axis = sr >= sg && sr >= sb ? 0 : sg >= sb ? 1 : 2;
    return { idx, axis, spread: Math.max(sr, sg, sb) * Math.sqrt(idx.length) };
  };
  const boxes: Box[] = [describe(Array.from({ length: pts.length / 3 }, (_, k) => k * 3))];
  while (boxes.length < count) {
    let best = -1;
    for (let k = 0; k < boxes.length; k++) if (boxes[k].idx.length > 1 && (best < 0 || boxes[k].spread > boxes[best].spread)) best = k;
    if (best < 0 || boxes[best].spread <= 0) break;
    const box = boxes[best];
    box.idx.sort((p, q) => pts[p + box.axis] - pts[q + box.axis]);
    const half = box.idx.length >> 1;
    boxes.splice(best, 1, describe(box.idx.slice(0, half)), describe(box.idx.slice(half)));
  }
  return boxes.map((box) => {
    let r = 0, g = 0, b = 0;
    for (const p of box.idx) { r += pts[p]; g += pts[p + 1]; b += pts[p + 2]; }
    const n = Math.max(1, box.idx.length);
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)] as RGB;
  });
}

/** Nearest palette entry through a 15-bit cache, as an inverse colour map would. */
function nearestOf(palette: RGB[]) {
  const cache = new Int16Array(32768).fill(-1);
  return (r: number, g: number, b: number) => {
    const ri = Math.max(0, Math.min(31, r >> 3)), gi = Math.max(0, Math.min(31, g >> 3)), bi = Math.max(0, Math.min(31, b >> 3));
    const key = (ri << 10) | (gi << 5) | bi;
    let k = cache[key];
    if (k < 0) {
      const cr = ri * 8 + 4, cg = gi * 8 + 4, cb = bi * 8 + 4;
      let bestD = Infinity;
      for (let q = 0; q < palette.length; q++) {
        const p = palette[q];
        const d = (p[0] - cr) ** 2 * 0.3 + (p[1] - cg) ** 2 * 0.59 + (p[2] - cb) ** 2 * 0.11;
        if (d < bestD) { bestD = d; k = q; }
      }
      cache[key] = k;
    }
    return k;
  };
}

export default defineLook({
  questions: {
    tradition: choice('Which 1990s computer-graphics tradition renders the picture?', {
      raytrace: 'A raytraced demo: smooth glossy plastic with a hard white highlight, chrome mirroring the sky, a reflective checkerboard floor fading into a gradient horizon.',
      wireframe: 'A wireframe render: glowing line meshes of every surface on a black screen, with flat-shaded polygons filling in row by row from the top.',
      cdrom: 'An early CD-ROM render: moody pre-rendered rooms with marble floors and spotlight pools, crushed to a dithered 256-colour palette with banding in every gradient.',
    }),
    scheme: choice('What character has the synthetic world\u2019s colour scheme? Its colours come from the picture\u2019s palette.', SCHEMES),
    material: choice('What are the objects made of?', {
      plastic: 'Everything is smooth glossy plastic in its own colours, each with a hard white highlight: toy-like and new.',
      chrome: 'The main object is mirror chrome reflecting the sky and the checkerboard; the rest stay plastic.',
      allchrome: 'Every object is mirror chrome: a showroom of liquid metal.',
      gold: 'The main object is polished gold, the rest plastic: the glint of a logo animation.',
      glass: 'The main object is clear glass bending the checkerboard behind it; the rest stay plastic.',
    }),
    reflection: score('How reflective are the floor and surfaces?', ['Matte: no reflections', 'A faint sheen', 'Polished', 'Glassy', 'A perfect mirror']),
    specular: score('How sharp is the specular highlight?', ['A broad satin sheen', 'Soft gloss', 'Glossy', 'A hard white dot', 'A pinpoint glint']),
    palette: choice('How many colours can the display show?', {
      millions: 'Millions of colours: smooth 24-bit gradients from a graphics workstation.',
      thousands: 'Thousands of colours: faint stepped contours in the smoothest gradients.',
      adaptive: 'Two hundred and fifty-six colours picked for this picture, error-diffused into a fine wormy grain.',
      system: 'A fixed 256-colour system palette with an ordered crosshatch dither: coarse, stippled and slightly off-colour.',
      banded: 'A cramped palette with no dithering at all: hard contour bands across every sky and shadow.',
      vga: 'The sixteen colours of a VGA card, heavily dithered: garish, grainy and loud.',
    }),
    progress: score('How far down the frame has the renderer reached?', [
      'Finished: every row drawn',
      'Nearly done: the last few rows still dark',
      'Three-quarters of the way down',
      'A little over halfway',
      'Under halfway: the lower half still waiting',
    ]),
    flare: choice('Does a lens flare cross the frame?', {
      none: 'No flare: a clean, quiet render.',
      streak: 'A hot white core with one long horizontal streak, like an anamorphic lens.',
      ghosts: 'A starburst with a chain of coloured hexagon and ring ghosts running across the frame.',
      full: 'Everything the 1990s flare filter had: starburst, streak, halo ring and ghost chain.',
    }),
    frame: choice('How is the render presented?', {
      none: 'Edge to edge: just the rendered image.',
      window: 'Inside a grey desktop window with a blue title bar and a status line counting rendered rows.',
      bevel: 'Inside a bevelled multimedia interface with a title plate and chunky navigation buttons, like a CD-ROM adventure.',
      viewport: 'In a modelling program’s camera viewport: a thin border, a camera label, a safe frame and an axis tripod.',
    }),
  },

  async apply(capture, a, context, signal) {
    // Timers are throttled in a hidden tab, so yield through a message port instead.
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => { channel.port1.close(); resolve(); };
        channel.port2.postMessage(0);
      });
      signal.throwIfAborted();
    };
    const { size, color, normal, depth, identity, diffuse } = capture;
    const N = size * size;
    const c0 = size / 2;
    const mood = context.mood;
    const seed = context.seed | 0;
    const random = context.random;
    const tradition = a.tradition;
    const wireMode = tradition === 'wireframe';
    const cdrom = tradition === 'cdrom';
    const palette = cdrom && (a.palette === 'millions' || a.palette === 'thousands') ? 'adaptive' : a.palette;
    const scheme = schemeIn(a.scheme, context.palette);
    // Gold stays gold unless the palette's ink is itself a metal.
    const gold: Vec = context.palette && paintIsMetal(context.palette.ink)
      ? (() => { const g = rekeyOne([srgb(GOLD[0]), srgb(GOLD[1]), srgb(GOLD[2])].map(Math.round) as unknown as Paint, context.palette, 'ink').map((v) => TO_LIN[v]); const peak = Math.max(...g, 1e-3); return [g[0] / peak, g[1] / peak, g[2] / peak]; })()
      : GOLD;
    const zenith = hexLin(scheme.zenith), midSky = hexLin(scheme.mid), horizon = hexLin(scheme.horizon);
    let tileA = hexLin(scheme.tileA), tileB = hexLin(scheme.tileB);
    if (cdrom) {
      // Pre-rendered stone: slabs of the scheme's lighter tile, every other one veined darker, set in grout.
      const grey: Vec = [0.4, 0.38, 0.35];
      const slab: Vec = [mix(tileB[0], grey[0], 0.5), mix(tileB[1], grey[1], 0.5), mix(tileB[2], grey[2], 0.5)];
      tileA = [mix(slab[0], tileA[0], 0.45), mix(slab[1], tileA[1], 0.45), mix(slab[2], tileA[2], 0.45)];
      tileB = slab;
    }
    const wire = hexLin(scheme.wire);
    const sky = (q: number, out: Vec) => {
      q = clamp01(q);
      if (q < 0.5) { const t = q * 2; out[0] = mix(horizon[0], midSky[0], t); out[1] = mix(horizon[1], midSky[1], t); out[2] = mix(horizon[2], midSky[2], t); }
      else { const t = (q - 0.5) * 2; out[0] = mix(midSky[0], zenith[0], t); out[1] = mix(midSky[1], zenith[1], t); out[2] = mix(midSky[2], zenith[2], t); }
      return out;
    };

    // 1. Decode the capture.
    const id = new Uint8Array(N);
    const Z = new Float32Array(N);
    const NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N);
    const lit = new Float32Array(N);
    const range = Math.max(1e-6, capture.far - capture.near);
    for (let i = 0; i < N; i++) {
      const p = i * 4;
      const v = identity[p];
      id[i] = v;
      Z[i] = v ? capture.near + ((depth[p] + depth[p + 1] / 256 + depth[p + 2] / 65536) / 256) * range : Infinity;
      const x = normal[p] / 127.5 - 1, y = normal[p + 1] / 127.5 - 1, z = normal[p + 2] / 127.5 - 1;
      const l = Math.hypot(x, y, z) || 1;
      NX[i] = x / l; NY[i] = y / l; NZ[i] = z / l;
      lit[i] = diffuse[p];
    }
    await pause();

    const litList: number[] = [];
    for (let i = 0; i < N; i += 3) if (id[i]) litList.push(lit[i]);
    const litRef = Math.max(8, percentile(litList, 0.97));

    // 2. The floor's up direction, the camera model and the floor's own axes.
    let up: Vec = [0, 0, 0];
    let upCount = 0;
    for (let i = 0; i < N; i += 3) if (id[i] === 1 && NY[i] > 0.2) { up[0] += NX[i]; up[1] += NY[i]; up[2] += NZ[i]; upCount++; }
    if (upCount < 150) {
      up = [0, 0, 0]; upCount = 0;
      for (let i = 0; i < N; i += 3) if (id[i] === 2 && NY[i] > 0.6) { up[0] += NX[i]; up[1] += NY[i]; up[2] += NZ[i]; upCount++; }
    }
    up = upCount >= 150 ? norm(up) : norm([0, 0.85, 0.5]);

    const samples: number[] = [];
    for (let i = 0; i < N; i += 5)
      if (id[i] === 1 && NX[i] * up[0] + NY[i] * up[1] + NZ[i] * up[2] > 0.97 && Z[i] < capture.far * 0.999)
        samples.push((i % size) + 0.5 - c0, Math.floor(i / size) + 0.5 - c0, Z[i]);
    const pw = capture.pixelWorldSize > 0 ? capture.pixelWorldSize : 1 / size;
    let persp = false, k = 0, planar = false;
    if (samples.length / 3 > 300) {
      const flat = fitPlane(samples, false), inv = fitPlane(samples, true);
      if (inv.err < flat.err * 0.3 && Math.abs(inv.C) > 1e-9) {
        const kk = Math.abs(up[1]) > Math.abs(up[0]) ? (inv.B * up[2]) / (inv.C * up[1]) : -(inv.A * up[2]) / (inv.C * up[0]);
        if (kk > (2 * Math.tan(0.04)) / size && kk < (2 * Math.tan(1.2)) / size) { persp = true; k = kk; }
      }
      planar = (persp ? inv.err : flat.err) < 0.004;
    }
    const viewAt = (x: number, y: number, z: number, out: Vec) => {
      const sx = x - c0, sy = y - c0;
      if (persp) { out[0] = sx * k * z; out[1] = -sy * k * z; } else { out[0] = sx * pw; out[1] = -sy * pw; }
      out[2] = -z;
      return out;
    };
    const project = (X: number, Y: number, Zv: number, out: Vec) => {
      const z = -Zv;
      if (persp) { const f = 1 / (k * Math.max(1e-6, z)); out[0] = c0 + X * f; out[1] = c0 - Y * f; } else { out[0] = c0 + X / pw; out[1] = c0 - Y / pw; }
      out[2] = z;
      return out;
    };

    // View-space positions and the floor's coordinates for every surface.
    const PX = new Float32Array(N), PY = new Float32Array(N), PZ = new Float32Array(N);
    const tmp: Vec = [0, 0, 0];
    for (let i = 0; i < N; i++) {
      if (!id[i]) continue;
      viewAt((i % size) + 0.5, Math.floor(i / size) + 0.5, Z[i], tmp);
      PX[i] = tmp[0]; PY[i] = tmp[1]; PZ[i] = tmp[2];
    }
    let t1 = norm([1 - up[0] * up[0], -up[0] * up[1], -up[0] * up[2]]);
    let t2 = cross(up, t1);
    // Turn the checkerboard square to the set and things: their walls face along the world's axes.
    {
      let c4 = 0, s4 = 0, w4 = 0;
      for (let i = 0; i < N; i += 3) {
        if (id[i] < 2) continue;
        const dn = NX[i] * up[0] + NY[i] * up[1] + NZ[i] * up[2];
        if (Math.abs(dn) > 0.3) continue;
        const th = Math.atan2(NX[i] * t2[0] + NY[i] * t2[1] + NZ[i] * t2[2], NX[i] * t1[0] + NY[i] * t1[1] + NZ[i] * t1[2]);
        c4 += Math.cos(4 * th); s4 += Math.sin(4 * th); w4++;
      }
      if (w4 > 200 && Math.hypot(c4, s4) / w4 > 0.2) {
        const phi = Math.atan2(s4, c4) / 4, cp = Math.cos(phi), sp = Math.sin(phi);
        const n1: Vec = [t1[0] * cp + t2[0] * sp, t1[1] * cp + t2[1] * sp, t1[2] * cp + t2[2] * sp];
        const n2: Vec = [-t1[0] * sp + t2[0] * cp, -t1[1] * sp + t2[1] * cp, -t1[2] * sp + t2[2] * cp];
        t1 = n1; t2 = n2;
      }
    }
    const U = new Float32Array(N), V = new Float32Array(N), Hh = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      if (!id[i]) continue;
      const x = PX[i], y = PY[i], z = PZ[i];
      U[i] = x * t1[0] + y * t1[1] + z * t1[2];
      V[i] = x * t2[0] + y * t2[1] + z * t2[2];
      Hh[i] = x * up[0] + y * up[1] + z * up[2];
    }
    const floorH: number[] = [];
    for (let i = 0; i < N; i += 7) if (id[i] === 1) floorH.push(Hh[i]);
    const d0 = floorH.length ? percentile(floorH, 0.5) : 0;
    await pause();

    // 3. Per-surface statistics: where each thing stands, how tall and how wide it is.
    const MAXID = 256;
    const cnt = new Float64Array(MAXID), sU = new Float64Array(MAXID), sV = new Float64Array(MAXID);
    const sX = new Float64Array(MAXID), sY = new Float64Array(MAXID), sZ = new Float64Array(MAXID);
    const hMin = new Float64Array(MAXID).fill(Infinity), hMax = new Float64Array(MAXID).fill(-Infinity);
    const xMin = new Float64Array(MAXID).fill(Infinity), xMax = new Float64Array(MAXID).fill(-Infinity);
    const yMin = new Float64Array(MAXID).fill(Infinity), yMax = new Float64Array(MAXID).fill(-Infinity);
    for (let i = 0; i < N; i++) {
      const v = id[i];
      if (!v) continue;
      const x = i % size, y = (i / size) | 0;
      cnt[v]++; sU[v] += U[i]; sV[v] += V[i]; sX[v] += PX[i]; sY[v] += PY[i]; sZ[v] += PZ[i];
      if (Hh[i] < hMin[v]) hMin[v] = Hh[i]; if (Hh[i] > hMax[v]) hMax[v] = Hh[i];
      if (x < xMin[v]) xMin[v] = x; if (x > xMax[v]) xMax[v] = x;
      if (y < yMin[v]) yMin[v] = y; if (y > yMax[v]) yMax[v] = y;
    }
    let cx3 = 0, cy3 = 0, cz3 = 0, cAll = 0, hasThing = false;
    for (let v = 3; v < MAXID; v++) if (cnt[v]) { cx3 += sX[v]; cy3 += sY[v]; cz3 += sZ[v]; cAll += cnt[v]; hasThing = true; }
    if (!cAll) for (let v = 1; v < 3; v++) { cx3 += sX[v]; cy3 += sY[v]; cz3 += sZ[v]; cAll += cnt[v]; }
    const centre: Vec = cAll ? [cx3 / cAll, cy3 / cAll, cz3 / cAll] : [0, 0, -(capture.near + capture.far) / 2];
    const zFocus = -centre[2];
    const W = size * (persp ? k * zFocus : pw);
    const heroScreen = (() => {
      const v = cnt[3] ? 3 : -1;
      if (v < 0) return [c0, c0 * 1.05];
      return [(xMin[v] + xMax[v]) / 2, (yMin[v] + yMax[v]) / 2];
    })();

    const tile = W / (cdrom ? 9 + random() * 4 : 14 + random() * 8);
    const phaseU = random() * tile, phaseV = random() * tile;
    const checker = (u: number, v: number) => (Math.floor((u + phaseU) / tile) + Math.floor((v + phaseV) / tile)) & 1;

    // 4. Light: a point light up the key direction, so flat faces still catch a hot spot.
    let Lv = norm([capture.light[0], -capture.light[1], capture.light[2]]);
    if (!Number.isFinite(Lv[0])) Lv = norm([-0.45, 0.5, 0.74]);
    const lightPos: Vec = [centre[0] + Lv[0] * W * 2.4, centre[1] + Lv[1] * W * 2.4, centre[2] + Lv[2] * W * 2.4];
    const warm = mood.warmth;
    const lightCol: Vec = [mix(0.9, 1.1, warm), mix(0.97, 0.98, warm), mix(1.1, 0.82, warm)];
    const ambient = (cdrom ? 0.13 : 0.2) - mood.wear * 0.05;
    const ambTint: Vec = (() => { const s = sky(0.55, [0, 0, 0]); const l = (s[0] + s[1] + s[2]) / 3 || 1; return [mix(1, s[0] / l, 0.35), mix(1, s[1] / l, 0.35), mix(1, s[2] / l, 0.35)]; })();
    const saturation = 1.08 + mood.cheer * 0.3 - (cdrom ? 0.12 : 0);

    // Shadows: the plain-lit pass, divided by what a lit surface facing that way receives.
    const BINS = 32;
    const binned: number[][] = Array.from({ length: BINS }, () => []);
    for (let i = 0; i < N; i += 2) {
      if (!id[i]) continue;
      const ndl = NX[i] * Lv[0] + NY[i] * Lv[1] + NZ[i] * Lv[2];
      binned[Math.min(BINS - 1, Math.max(0, Math.floor(((ndl + 1) / 2) * BINS)))].push(lit[i]);
    }
    const expected = new Float32Array(BINS).fill(NaN);
    for (let b = 0; b < BINS; b++) if (binned[b].length > 25) expected[b] = percentile(binned[b], 0.9);
    {
      let last = NaN;
      for (let b = 0; b < BINS; b++) { if (Number.isNaN(expected[b])) expected[b] = last; else last = expected[b]; }
      let next = NaN;
      for (let b = BINS - 1; b >= 0; b--) { if (Number.isNaN(expected[b])) expected[b] = next; else next = expected[b]; }
      for (let b = 1; b < BINS; b++) expected[b] = Math.max(expected[b], expected[b - 1]);
      for (let b = 0; b < BINS; b++) if (Number.isNaN(expected[b])) expected[b] = 128;
    }
    const shadowAt = (i: number, hard: boolean) => {
      const ndl = NX[i] * Lv[0] + NY[i] * Lv[1] + NZ[i] * Lv[2];
      if (ndl < 0.08) return 1;
      const ratio = lit[i] / Math.max(4, expected[Math.min(BINS - 1, Math.max(0, Math.floor(((ndl + 1) / 2) * BINS)))]);
      return hard ? smooth(0.6, 0.7, ratio) : smooth(0.45, 0.8, ratio);
    };
    await pause();

    // 5. The environment chrome reads: sky above the horizon, checkerboard below it.
    const camH = W * 0.9;
    const hasFloor = floorH.length > 50;
    /** What a mirror at pixel `at` (or nowhere in particular, -1) sees along r. */
    const env = (r: Vec, out: Vec, at = -1, soft = false) => {
      const e = dot(r, up);
      if (e >= 0) {
        sky(Math.pow(e, 0.55) * 1.05, out);
        const sun = dot(r, Lv);
        // A window of light around the key, and the hot sun inside it.
        const g = smooth(0.82, 0.97, sun) * 0.45 + smooth(0.97, 0.995, sun) * 2.2;
        out[0] += g * lightCol[0]; out[1] += g * lightCol[1]; out[2] += g * lightCol[2];
        return out;
      }
      const height = at >= 0 && hasFloor ? Math.max(W * 0.004, Hh[at] - d0) : camH;
      const t = height / Math.max(0.02, -e);
      const u = (at >= 0 ? U[at] : 0) + (r[0] * t1[0] + r[1] * t1[1] + r[2] * t1[2]) * t;
      const v = (at >= 0 ? V[at] : 0) + (r[0] * t2[0] + r[1] * t2[1] + r[2] * t2[2]) * t;
      // A soft reflection sees the floor as its average tone, not its pattern.
      const c = soft ? MEAN : checker(u, v) ? tileB : tileA;
      if (soft) { MEAN[0] = (tileA[0] + tileB[0]) / 2; MEAN[1] = (tileA[1] + tileB[1]) / 2; MEAN[2] = (tileA[2] + tileB[2]) / 2; }
      const lightUp = ambient + 0.9 * Math.max(0, dot(up, Lv));
      const fog = 1 - Math.exp(-t / (W * 3));
      out[0] = mix(c[0] * lightUp, horizon[0], fog);
      out[1] = mix(c[1] * lightUp, horizon[1], fog);
      out[2] = mix(c[2] * lightUp, horizon[2], fog);
      return out;
    };

    // Depth haze over the floor.
    const groundZ: number[] = [];
    for (let i = 0; i < N; i += 5) if (id[i] === 1) groundZ.push(Z[i]);
    const zRef = Math.min(zFocus, groundZ.length ? percentile(groundZ, 0.3) : zFocus);
    const zFar = groundZ.length ? Math.max(zRef + 1e-6, percentile(groundZ, 0.995)) : zRef + 1;

    /** The checkerboard ground seen at any screen point, when the ground is one plane. */
    const floorAt = (sx: number, sy: number, out: Vec): boolean => {
      if (!planar) return false;
      let ox: number, oy: number, dx: number, dy: number, dz: number;
      if (persp) { ox = 0; oy = 0; dx = (sx - c0) * k; dy = -(sy - c0) * k; dz = -1; } else { ox = (sx - c0) * pw; oy = -(sy - c0) * pw; dx = 0; dy = 0; dz = -1; }
      const denom = up[0] * dx + up[1] * dy + up[2] * dz;
      if (Math.abs(denom) < 1e-9) return false;
      const t = (d0 - (up[0] * ox + up[1] * oy)) / denom;
      if (t <= 0) return false;
      const X = ox + dx * t, Y = oy + dy * t, Zv = dz * t;
      const u = X * t1[0] + Y * t1[1] + Zv * t1[2], v = X * t2[0] + Y * t2[1] + Zv * t2[2];
      const c = checker(u, v) ? tileB : tileA;
      const l = ambient + Math.max(0, dot(up, Lv)) * 0.9;
      const fogT = (-Zv - zRef) / (zFar - zRef);
      const fog = smooth(0.45, 1, fogT) * 0.92;
      sky(smooth(0.75, 1, fogT) * 0.45, tmp);
      out[0] = mix(c[0] * l, tmp[0], fog); out[1] = mix(c[1] * l, tmp[1], fog); out[2] = mix(c[2] * l, tmp[2], fog);
      return true;
    };

    // 6. Shade every surface.
    const img = new Float32Array(N * 3);
    const refl = a.reflection;
    const s = a.specular;
    const shin = Math.pow(2, 2.4 + s * 5.6);
    const hardSpec = s > 0.45;
    const specGain = hardSpec ? 1.15 : 0.35 + s * 0.7;
    const heroId = 3;
    const metalOf = (v: number): 'plastic' | 'chrome' | 'gold' | 'glass' => {
      if (v < 3) return 'plastic';
      if (a.material === 'allchrome') return 'chrome';
      if (v !== heroId) return 'plastic';
      return a.material === 'chrome' ? 'chrome' : a.material === 'gold' ? 'gold' : a.material === 'glass' ? 'glass' : 'plastic';
    };
    const receiver = new Uint8Array(N);
    const mirror = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const v = id[i];
      if (v !== 1 && v !== 2) continue;
      const dn = NX[i] * up[0] + NY[i] * up[1] + NZ[i] * up[2];
      if ((v === 1 && dn > 0.6) || (v === 2 && dn > 0.92)) receiver[i] = 1;
    }
    const objSize = (v: number) => Math.max(8, Math.max(xMax[v] - xMin[v], yMax[v] - yMin[v]));
    const nrm: Vec = [0, 0, 0], Vd: Vec = [0, 0, 1], Lp: Vec = [0, 0, 0], rv: Vec = [0, 0, 0], e3: Vec = [0, 0, 0], bg: Vec = [0, 0, 0];

    // Facets for the wireframe tradition: rings of height and slices of angle on each thing,
    // a block grid on the set, tiles on the ground.
    const fa = new Float32Array(N), fb = new Float32Array(N), fc = new Float32Array(N);
    const period = new Float32Array(MAXID);
    const ringStep = new Float64Array(MAXID), cu = new Float64Array(MAXID), cv = new Float64Array(MAXID);
    for (let v = 3; v < MAXID; v++) {
      if (!cnt[v]) continue;
      cu[v] = sU[v] / cnt[v]; cv[v] = sV[v] / cnt[v];
      const px = persp ? k * zFocus : pw;
      ringStep[v] = Math.max((hMax[v] - hMin[v]) / 13, px * 4);
      period[v] = xMax[v] - xMin[v] > 70 ? 20 : xMax[v] - xMin[v] > 30 ? 12 : 8;
    }
    const block = tile / 2;
    for (let i = 0; i < N; i++) {
      const v = id[i];
      if (!v) continue;
      if (v === 1) { const g = wireMode ? tile * 2 : tile; fa[i] = (U[i] + phaseU) / g; fb[i] = (V[i] + phaseV) / g; fc[i] = 0.5; }
      else if (v === 2) { fa[i] = (U[i] + phaseU) / block; fb[i] = (V[i] + phaseV) / block; fc[i] = (Hh[i] - d0) / block; }
      else {
        fa[i] = (Hh[i] - hMin[v]) / ringStep[v];
        fb[i] = ((Math.atan2(V[i] - cv[v], U[i] - cu[v]) + Math.PI) / (2 * Math.PI)) * period[v];
        fc[i] = 0.5;
      }
    }

    // Albedo: the render's colour with its lighting divided back out, then saturated like plastic.
    const albedo = new Float32Array(N * 3);
    // Light the plain-lit pass cannot explain is the surface's own glow: signs, screens, lamps.
    const emis = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      if (!id[i]) continue;
      const p = i * 4;
      const l = 0.3 + 0.85 * Math.min(1.2, lit[i] / litRef);
      for (let c = 0; c < 3; c++) emis[i * 3 + c] = Math.max(0, TO_LIN[color[p + c]] - l * 1.1);
      let r = TO_LIN[color[p]] / l, g = TO_LIN[color[p + 1]] / l, b = TO_LIN[color[p + 2]] / l;
      const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
      r = y + (r - y) * saturation; g = y + (g - y) * saturation; b = y + (b - y) * saturation;
      albedo[i * 3] = Math.min(1, Math.max(0, r)); albedo[i * 3 + 1] = Math.min(1, Math.max(0, g)); albedo[i * 3 + 2] = Math.min(1, Math.max(0, b));
    }
    await pause();

    // Flat facets average their normal and colour.
    let facetIndex: Int32Array | null = null, facetN: Float32Array | null = null, facetA: Float32Array | null = null;
    if (wireMode) {
      facetIndex = new Int32Array(N).fill(-1);
      const keys = new Map<number, number>();
      const acc: number[] = [];
      for (let i = 0; i < N; i++) {
        const v = id[i];
        if (!v) continue;
        const bucket = (Math.round(NX[i] * 1.6) + 2) * 25 + (Math.round(NY[i] * 1.6) + 2) * 5 + (Math.round(NZ[i] * 1.6) + 2);
        const key = ((((v * 8192 + (Math.floor(fa[i]) + 4096)) * 8192 + (Math.floor(fb[i]) + 4096)) * 512 + (Math.floor(fc[i]) + 256)) * 128 + bucket);
        let f = keys.get(key);
        if (f === undefined) { f = keys.size; keys.set(key, f); acc.push(0, 0, 0, 0, 0, 0, 0); }
        facetIndex[i] = f;
        const o = f * 7;
        acc[o] += NX[i]; acc[o + 1] += NY[i]; acc[o + 2] += NZ[i];
        acc[o + 3] += albedo[i * 3]; acc[o + 4] += albedo[i * 3 + 1]; acc[o + 5] += albedo[i * 3 + 2]; acc[o + 6]++;
      }
      const F = keys.size;
      facetN = new Float32Array(F * 3); facetA = new Float32Array(F * 3);
      for (let f = 0; f < F; f++) {
        const o = f * 7, n = Math.max(1, acc[o + 6]);
        const nn = norm([acc[o], acc[o + 1], acc[o + 2]]);
        facetN[f * 3] = nn[0]; facetN[f * 3 + 1] = nn[1]; facetN[f * 3 + 2] = nn[2];
        facetA[f * 3] = acc[o + 3] / n; facetA[f * 3 + 1] = acc[o + 4] / n; facetA[f * 3 + 2] = acc[o + 5] / n;
      }
    }

    // The hard highlight: every thing gets its dot, on the part of it that best mirrors the light,
    // sized by how sharp the highlight is, as a 1990s Phong render always seemed to.
    const dotAt = new Float32Array(MAXID).fill(Infinity);
    const dotFloor = new Float32Array(MAXID);
    if (hardSpec && !wireMode) {
      const per: number[][] = [];
      for (let i = 0; i < N; i += 2) {
        const v = id[i];
        if (v < 3) continue;
        let lx = lightPos[0] - PX[i], ly = lightPos[1] - PY[i], lz = lightPos[2] - PZ[i];
        const ll = Math.hypot(lx, ly, lz) || 1; lx /= ll; ly /= ll; lz /= ll;
        const ndl = NX[i] * lx + NY[i] * ly + NZ[i] * lz;
        if (ndl <= 0.05) continue;
        let vx = 0, vy = 0, vz = 1;
        if (persp) { const l = Math.hypot(PX[i], PY[i], PZ[i]) || 1; vx = -PX[i] / l; vy = -PY[i] / l; vz = -PZ[i] / l; }
        // Blinn's half vector: forgiving enough that a thing lit from behind still gets its dot.
        const hx = lx + vx, hy = ly + vy, hz = lz + vz, hl = Math.hypot(hx, hy, hz) || 1;
        (per[v] ??= []).push((NX[i] * hx + NY[i] * hy + NZ[i] * hz) / hl);
      }
      const share = mix(0.03, 0.005, clamp01((s - 0.45) / 0.55));
      per.forEach((list, v) => {
        if (!list || list.length < 40) return;
        const q = percentile(list, 1 - share);
        if (q > 0.45) { dotAt[v] = q; dotFloor[v] = smooth(0.45, 0.85, q); }
      });
    }

    const backSample: number[][] = [[], [], []];
    for (let i = 0; i < N; i += 3) if (!id[i]) for (let c = 0; c < 3; c++) backSample[c].push(TO_LIN[color[i * 4 + c]]);
    const backMedian = backSample.map((list) => (list.length ? percentile(list, 0.5) : 1));
    const darkBack = backSample[0].length > 200 && backMedian[0] * 0.2126 + backMedian[1] * 0.7152 + backMedian[2] * 0.0722 < 0.05;
    let backRow = -1;
    for (let i = 0; i < N; i++) if (!id[i]) backRow = Math.max(backRow, (i / size) | 0);
    const marbleSeed = seed ^ 0x5bd1e995;

    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const i = y * size + x, o = i * 3, v = id[i];
        if (!v) {
          // The backdrop: a graded sky.
          if (persp) {
            const d = norm(viewAt(x + 0.5, y + 0.5, 1, e3));
            sky(Math.pow(Math.max(0, dot(d, up)) * 3, 0.6), bg);
          } else sky(clamp01(1 - (y + 0.5) / Math.max(size * 0.35, backRow + 1)) * 0.95 + 0.05, bg);
          // A night or space backdrop stays dark; stars and glows drawn on it are kept.
          const dark = darkBack ? 0.14 : cdrom ? 0.22 : 1, p = i * 4;
          for (let c = 0; c < 3; c++) img[o + c] = bg[c] * dark + Math.max(0, TO_LIN[color[p + c]] - backMedian[c] * (darkBack ? 0.6 : 1.15)) * (darkBack ? 1 : 0.8);
          continue;
        }
        const facet = wireMode && facetIndex && facetN && facetA ? facetIndex[i] : -1;
        if (facet >= 0) { nrm[0] = facetN![facet * 3]; nrm[1] = facetN![facet * 3 + 1]; nrm[2] = facetN![facet * 3 + 2]; }
        else { nrm[0] = NX[i]; nrm[1] = NY[i]; nrm[2] = NZ[i]; }
        if (persp) { const l = Math.hypot(PX[i], PY[i], PZ[i]) || 1; Vd[0] = -PX[i] / l; Vd[1] = -PY[i] / l; Vd[2] = -PZ[i] / l; }
        else { Vd[0] = 0; Vd[1] = 0; Vd[2] = 1; }
        if (wireMode) { Lp[0] = Lv[0]; Lp[1] = Lv[1]; Lp[2] = Lv[2]; }
        else { Lp[0] = lightPos[0] - PX[i]; Lp[1] = lightPos[1] - PY[i]; Lp[2] = lightPos[2] - PZ[i]; const l = Math.hypot(Lp[0], Lp[1], Lp[2]) || 1; Lp[0] /= l; Lp[1] /= l; Lp[2] /= l; }
        const ndl = dot(nrm, Lp);
        const ndv = Math.max(0, dot(nrm, Vd));
        // Mirror of the eye about the normal.
        rv[0] = 2 * ndv * nrm[0] - Vd[0]; rv[1] = 2 * ndv * nrm[1] - Vd[1]; rv[2] = 2 * ndv * nrm[2] - Vd[2];
        const fres = Math.pow(1 - ndv, 4);

        if (receiver[i] && v === 1) {
          // The checkerboard floor, supersampled 2x2 from the floor's own coordinates.
          const right = x + 1 < size && id[i + 1] === v ? i + 1 : -1, left = x > 0 && id[i - 1] === v ? i - 1 : -1;
          const down = y + 1 < size && id[i + size] === v ? i + size : -1, upper = y > 0 && id[i - size] === v ? i - size : -1;
          const dux = right >= 0 ? U[right] - U[i] : left >= 0 ? U[i] - U[left] : 0;
          const dvx = right >= 0 ? V[right] - V[i] : left >= 0 ? V[i] - V[left] : 0;
          const duy = down >= 0 ? U[down] - U[i] : upper >= 0 ? U[i] - U[upper] : 0;
          const dvy = down >= 0 ? V[down] - V[i] : upper >= 0 ? V[i] - V[upper] : 0;
          let cov = 0, grout = 0;
          if (Math.max(Math.abs(dux), Math.abs(dvx), Math.abs(duy), Math.abs(dvy)) > tile * 0.6) { cov = 0.5; grout = cdrom ? 0.08 : 0; }
          else
            for (const [ox, oy] of SUB) {
              const uu = U[i] + dux * ox + duy * oy, vv = V[i] + dvx * ox + dvy * oy;
              cov += checker(uu, vv) * 0.25;
              if (cdrom) {
                const fu = (uu + phaseU) / tile, fv = (vv + phaseV) / tile, gu = fu - Math.floor(fu), gv = fv - Math.floor(fv);
                if (Math.min(gu, 1 - gu, gv, 1 - gv) < 0.02) grout += 0.25;
              }
            }
          let r = mix(tileA[0], tileB[0], cov), g = mix(tileA[1], tileB[1], cov), b = mix(tileA[2], tileB[2], cov);
          if (cdrom) {
            // Marble: mottled stone with dark veins wandering across the tiles.
            const mu = (U[i] + phaseU) / tile, mv = (V[i] + phaseV) / tile;
            const n1 = fbm(mu * 1.7, mv * 1.7, marbleSeed);
            const vein = Math.abs(Math.sin((mu * 0.9 + mv * 1.3 + n1 * 5.5) * Math.PI));
            const dark = smooth(0.12, 0.0, vein) * 0.6 + (fbm(mu * 2.2, mv * 2.2, marbleSeed + 3) - 0.5) * 0.22;
            r *= 1 - dark; g *= 1 - dark; b *= 1 - dark * 0.92;
            r *= 1 - grout * 0.65; g *= 1 - grout * 0.65; b *= 1 - grout * 0.6;
          }
          const sh = shadowAt(i, true);
          const dif = Math.max(0, ndl) * sh;
          const l = ambient + dif * 0.95;
          r *= l * (sh < 0.5 ? ambTint[0] : 1); g *= l * (sh < 0.5 ? ambTint[1] : 1); b *= l * (sh < 0.5 ? ambTint[2] : 1);
          if (!wireMode) {
            const hv = Math.max(0, (2 * ndl * nrm[0] - Lp[0]) * Vd[0] + (2 * ndl * nrm[1] - Lp[1]) * Vd[1] + (2 * ndl * nrm[2] - Lp[2]) * Vd[2]);
            const sp = Math.pow(hv, 24 + s * 120) * (0.15 + refl * 0.6) * sh;
            r += sp * lightCol[0]; g += sp * lightCol[1]; b += sp * lightCol[2];
          }
          img[o] = r * lightCol[0]; img[o + 1] = g * lightCol[1]; img[o + 2] = b * lightCol[2];
          continue;
        }

        const kind = wireMode ? 'plastic' : metalOf(v);
        const ar = facet >= 0 ? facetA![facet * 3] : albedo[o], ag = facet >= 0 ? facetA![facet * 3 + 1] : albedo[o + 1], ab = facet >= 0 ? facetA![facet * 3 + 2] : albedo[o + 2];
        const sh = shadowAt(i, true);
        const rl = (2 * ndl * nrm[0] - Lp[0]) * Vd[0] + (2 * ndl * nrm[1] - Lp[1]) * Vd[1] + (2 * ndl * nrm[2] - Lp[2]) * Vd[2];
        let spec = ndl > 0 && rl > 0 ? Math.pow(rl, shin) : 0;
        if (hardSpec) {
          let dot = 0;
          if (dotFloor[v] > 0 && ndl > 0.05) {
            const hx = Lp[0] + Vd[0], hy = Lp[1] + Vd[1], hz = Lp[2] + Vd[2], hl = Math.hypot(hx, hy, hz) || 1;
            dot = smooth(dotAt[v] - 0.002, dotAt[v] + 0.002, (nrm[0] * hx + nrm[1] * hy + nrm[2] * hz) / hl) * dotFloor[v];
          }
          spec = Math.max(smooth(0.42, 0.5, spec), dot);
        }
        spec *= specGain * sh;
        if (kind === 'plastic') {
          const dif = Math.max(0, ndl) * sh;
          let l = ambient + dif * (wireMode ? 0.9 : 1.0);
          if (cdrom && v === 2) {
            // The set is dressed in the same veined marble as the floor.
            const mu = (U[i] + Hh[i] * 0.7 + phaseU) / tile, mv = (V[i] - Hh[i] * 0.5 + phaseV) / tile;
            const vein = Math.abs(Math.sin((mu * 0.9 + mv * 1.3 + fbm(mu * 1.7, mv * 1.7, marbleSeed + 5) * 5.5) * Math.PI));
            l *= 1 - smooth(0.14, 0, vein) * 0.5;
          }
          let r = ar * l * (sh < 0.5 || ndl < 0 ? ambTint[0] : 1), g = ag * l * (sh < 0.5 || ndl < 0 ? ambTint[1] : 1), b = ab * l * (sh < 0.5 || ndl < 0 ? ambTint[2] : 1);
          r *= lightCol[0]; g *= lightCol[1]; b *= lightCol[2];
          if (!wireMode) {
            env(rv, e3, i, true);
            const amt = (0.025 + refl * 0.11) * (0.25 + 0.75 * fres) + (v === 2 && receiver[i] ? refl * 0.2 : 0);
            r += e3[0] * amt; g += e3[1] * amt; b += e3[2] * amt;
          }
          img[o] = r + spec * lightCol[0] + emis[o]; img[o + 1] = g + spec * lightCol[1] + emis[o + 1]; img[o + 2] = b + spec * lightCol[2] + emis[o + 2];
        } else if (kind === 'chrome' || kind === 'gold') {
          mirror[i] = kind === 'gold' ? 2 : 1;
          // Swell the normals a little, as if every face were slightly domed: a convex mirror
          // shows sky above a horizon line instead of one flat colour per face.
          const gcx = (xMin[v] + xMax[v]) / 2, gcy = (yMin[v] + yMax[v]) / 2;
          const hw = Math.max(4, (xMax[v] - xMin[v]) / 2), hh = Math.max(4, (yMax[v] - yMin[v]) / 2);
          const bn = norm([nrm[0] + ((x + 0.5 - gcx) / hw) * 0.55, nrm[1] - ((y + 0.5 - gcy) / hh) * 0.55, nrm[2]]);
          const bdv = Math.max(0, dot(bn, Vd));
          rv[0] = 2 * bdv * bn[0] - Vd[0]; rv[1] = 2 * bdv * bn[1] - Vd[1]; rv[2] = 2 * bdv * bn[2] - Vd[2];
          env(rv, e3, i);
          const tint: Vec = kind === 'gold' ? gold : [STEEL[0] * mix(1, ar * 1.6, 0.2), STEEL[1] * mix(1, ag * 1.6, 0.2), STEEL[2] * mix(1, ab * 1.6, 0.2)];
          // Polished metal shows a deeper, contrastier world than the one around it, brightening at the rim.
          const dim = (0.7 + 0.3 * sh) * mix(0.82, 1.1, Math.pow(1 - bdv, 3));
          // Gold keeps mostly its own colour; steel lets the world's colours through.
          const lum = e3[0] * 0.2126 + e3[1] * 0.7152 + e3[2] * 0.0722, keep = kind === 'gold' ? 0.7 : 0.25, gain = kind === 'gold' ? 1.3 : 1;
          for (let c = 0; c < 3; c++) img[o + c] = Math.pow(mix(e3[c], lum, keep), 1.15) * tint[c] * dim * gain + spec * 1.4;
        } else {
          // Glass: the floor behind, bent through the body, with a rim of reflected sky.
          // A solid lens: the floor behind shows shrunk and upside down, bent at the edges.
          const bend = objSize(v) * 0.08, gcx = (xMin[v] + xMax[v]) / 2, gcy = (yMin[v] + yMax[v]) / 2;
          const sx = gcx - (x + 0.5 - gcx) * 0.6 + nrm[0] * bend, sy = gcy - (y + 0.5 - gcy) * 0.6 - nrm[1] * bend;
          if (!floorAt(sx, sy, bg)) {
            const d: Vec = norm([-Vd[0] - nrm[0] * 0.6, -Vd[1] - nrm[1] * 0.6, -Vd[2] - nrm[2] * 0.6]);
            env(d, bg);
          }
          env(rv, e3, i);
          const tint: Vec = [GLASS[0] * mix(1, ar * 1.8, 0.35), GLASS[1] * mix(1, ag * 1.8, 0.35), GLASS[2] * mix(1, ab * 1.8, 0.35)];
          const rim = 0.14 + 0.8 * fres;
          // Glass edges go dark where the light is turned back inside the body.
          const body = 0.78 * (0.35 + 0.65 * smooth(0.05, 0.55, ndv));
          img[o] = bg[0] * tint[0] * body * (1 - rim) + e3[0] * rim + spec * 1.3;
          img[o + 1] = bg[1] * tint[1] * body * (1 - rim) + e3[1] * rim + spec * 1.3;
          img[o + 2] = bg[2] * tint[2] * body * (1 - rim) + e3[2] * rim + spec * 1.3;
        }
      }
    }
    await pause();

    // 7. Mirrors: march each reflected ray through the depth buffer until it passes behind a surface.
    const mq: Vec = [0, 0, 0];
    const thick = W * 0.07;
    let marchFade = 0;
    const march = (i: number, dir: Vec, skip: number): number => {
      const x0 = PX[i], y0 = PY[i], z0 = PZ[i];
      project(x0 + dir[0] * W * 0.01, y0 + dir[1] * W * 0.01, z0 + dir[2] * W * 0.01, mq);
      const per = Math.hypot(mq[0] - ((i % size) + 0.5), mq[1] - (((i / size) | 0) + 0.5)) / (W * 0.01);
      if (!(per > 1e-6)) return -1;
      const dt = 2 / per, maxT = (size * 0.85) / per;
      for (let t = dt * 1.5; t < maxT; t += dt) {
        project(x0 + dir[0] * t, y0 + dir[1] * t, z0 + dir[2] * t, mq);
        if (mq[0] < 0 || mq[1] < 0 || mq[0] >= size || mq[1] >= size) return -1;
        const j = (mq[1] | 0) * size + (mq[0] | 0);
        if (!id[j] || receiver[j] || id[j] === skip) continue;
        const gap = mq[2] - Z[j];
        if (gap > 0 && gap < thick) {
          // Bisect back to the surface.
          let lo = t - dt, hi = t;
          for (let it = 0; it < 5; it++) {
            const m = (lo + hi) / 2;
            project(x0 + dir[0] * m, y0 + dir[1] * m, z0 + dir[2] * m, mq);
            const mj = Math.min(size - 1, Math.max(0, mq[1] | 0)) * size + Math.min(size - 1, Math.max(0, mq[0] | 0));
            if (id[mj] && !receiver[mj] && id[mj] !== skip && mq[2] - Z[mj] > 0) hi = m; else lo = m;
          }
          project(x0 + dir[0] * hi, y0 + dir[1] * hi, z0 + dir[2] * hi, mq);
          const h = Math.min(size - 1, Math.max(0, mq[1] | 0)) * size + Math.min(size - 1, Math.max(0, mq[0] | 0));
          marchFade = (1 - Math.pow(t / maxT, 2)) * smooth(0, size * 0.04, mq[1]);
          return id[h] && !receiver[h] && id[h] !== skip ? h : j;
        }
      }
      return -1;
    };
    // Chrome and gold also mirror the other things around them.
    if (!wireMode) {
      const dir: Vec = [0, 0, 0];
      for (let i = 0; i < N; i++) {
        if (i % (size * 60) === 0) await pause();
        if (!mirror[i]) continue;
        let vx = 0, vy = 0, vz = -1;
        if (persp) { const l = Math.hypot(PX[i], PY[i], PZ[i]) || 1; vx = PX[i] / l; vy = PY[i] / l; vz = PZ[i] / l; }
        const vn = vx * NX[i] + vy * NY[i] + vz * NZ[i];
        dir[0] = vx - 2 * vn * NX[i]; dir[1] = vy - 2 * vn * NY[i]; dir[2] = vz - 2 * vn * NZ[i];
        const hit = march(i, dir, id[i]);
        if (hit < 0) continue;
        const o = i * 3, f = marchFade * 0.85, tint = mirror[i] === 2 ? gold : STEEL;
        img[o] = mix(img[o], img[hit * 3] * tint[0], f); img[o + 1] = mix(img[o + 1], img[hit * 3 + 1] * tint[1], f); img[o + 2] = mix(img[o + 2], img[hit * 3 + 2] * tint[2], f);
      }
    }
    if (!wireMode && refl > 0.04) {
      const Hs = size >> 1;
      const rr = new Float32Array(Hs * Hs * 3), rw = new Float32Array(Hs * Hs), ok = new Uint8Array(Hs * Hs);
      const dir: Vec = [0, 0, 0];
      for (let gy = 0; gy < Hs; gy++) {
        if (gy % 30 === 0) await pause();
        for (let gx = 0; gx < Hs; gx++) {
          const x = gx * 2, y = gy * 2, i = y * size + x;
          if (!receiver[i]) continue;
          ok[gy * Hs + gx] = 1;
          let vx = 0, vy = 0, vz = -1;
          if (persp) { const l = Math.hypot(PX[i], PY[i], PZ[i]) || 1; vx = PX[i] / l; vy = PY[i] / l; vz = PZ[i] / l; }
          const n: Vec = id[i] === 1 && planar ? up : [NX[i], NY[i], NZ[i]];
          const vn = vx * n[0] + vy * n[1] + vz * n[2];
          dir[0] = vx - 2 * vn * n[0]; dir[1] = vy - 2 * vn * n[1]; dir[2] = vz - 2 * vn * n[2];
          const hit = march(i, dir, -1);
          if (hit >= 0) rw[gy * Hs + gx] = marchFade;
          const g3 = (gy * Hs + gx) * 3;
          if (hit >= 0) {
            rr[g3] = img[hit * 3]; rr[g3 + 1] = img[hit * 3 + 1]; rr[g3 + 2] = img[hit * 3 + 2];
          } else {
            env(dir, e3);
            rr[g3] = e3[0]; rr[g3 + 1] = e3[1]; rr[g3 + 2] = e3[2];
            rw[gy * Hs + gx] = 0.4;
          }
        }
      }
      await pause();
      const strength = mix(0, 0.88, refl);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          if (!receiver[i]) continue;
          const fx = x / 2, fy = y / 2, gx0 = Math.min(Hs - 1, Math.floor(fx)), gy0 = Math.min(Hs - 1, Math.floor(fy));
          const tx = fx - gx0, ty = fy - gy0;
          let r = 0, g = 0, b = 0, w = 0, ws = 0;
          for (let dy = 0; dy < 2; dy++)
            for (let dx = 0; dx < 2; dx++) {
              const gx = Math.min(Hs - 1, gx0 + dx), gy = Math.min(Hs - 1, gy0 + dy), gi = gy * Hs + gx;
              if (!ok[gi]) continue;
              const bw = (dx ? tx : 1 - tx) * (dy ? ty : 1 - ty) + 1e-4;
              r += rr[gi * 3] * bw; g += rr[gi * 3 + 1] * bw; b += rr[gi * 3 + 2] * bw; w += rw[gi] * bw; ws += bw;
            }
          if (!ws) continue;
          let vn = NZ[i];
          if (persp) { const l = Math.hypot(PX[i], PY[i], PZ[i]) || 1; vn = -(PX[i] * NX[i] + PY[i] * NY[i] + PZ[i] * NZ[i]) / l; }
          const f = strength * (w / ws) * (0.7 + 0.3 * Math.pow(1 - Math.max(0, vn), 3));
          const o = i * 3;
          img[o] = mix(img[o], r / ws, f); img[o + 1] = mix(img[o + 1], g / ws, f); img[o + 2] = mix(img[o + 2], b / ws, f);
        }
      }
    }

    // 8. Haze: the far floor dissolves into the sky gradient.
    for (let i = 0; i < N; i++) {
      if (id[i] !== 1 || wireMode) continue;
      const fogT = (Z[i] - zRef) / (zFar - zRef);
      const fog = cdrom ? smooth(0.2, 1, fogT) * 0.96 : smooth(0.45, 1, fogT) * 0.93;
      if (fog <= 0) continue;
      sky(smooth(0.72, 1, fogT) * 0.5, bg);
      // A pre-rendered room ends in darkness, not sky.
      if (cdrom) { const t = 0.16 + 0.1 * (1 - fogT); bg[0] = mix(zenith[0], midSky[0], 0.4) * t; bg[1] = mix(zenith[1], midSky[1], 0.4) * t; bg[2] = mix(zenith[2], midSky[2], 0.4) * t; }
      const o = i * 3;
      img[o] = mix(img[o], bg[0], fog); img[o + 1] = mix(img[o + 1], bg[1], fog); img[o + 2] = mix(img[o + 2], bg[2], fog);
    }
    if (cdrom) {
      // A spotlight pool around the hero: the gradients a 256-colour palette will band.
      const hx = heroScreen[0], hy = heroScreen[1];
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const d = Math.hypot(x - hx, (y - hy) * 1.15) / size;
          const pool = mix(1.18, 0.3, smooth(0.1, 0.62, d));
          const o = (y * size + x) * 3;
          img[o] *= pool; img[o + 1] *= pool; img[o + 2] *= pool * 1.02;
        }
    }
    await pause();

    // 9. The wireframe: silhouettes, creases, iso-lines and the floor grid, glowing on black.
    const doneFrac = wireMode ? 0.62 * Math.pow(1 - a.progress, 0.8) : mix(1, 0.45, a.progress);
    const doneRow = Math.min(size, Math.round(doneFrac * size));
    const partial = Math.floor(random() * size);
    const out = new Float32Array(N * 3);
    if (wireMode) {
      const line = new Float32Array(N);
      const zs: number[] = [];
      for (let i = 0; i < N; i += 5) if (id[i]) zs.push(Z[i]);
      const zLo = percentile(zs, 0.02), zHi = Math.max(zLo + 1e-6, percentile(zs, 0.98));
      const cue = (i: number) => 1 - 0.7 * clamp01((Z[i] - zLo) / (zHi - zLo));
      const jump = W * 0.025;
      const isoLine = (i: number, j: number, which: Float32Array, per: number) => {
        let d = which[j] - which[i];
        if (per) { if (d > per / 2) d -= per; else if (d < -per / 2) d += per; }
        return Math.abs(d) < 0.6 && Math.floor(which[i]) !== Math.floor(which[j]);
      };
      for (let y = 0; y < size; y++) {
        if (y % 90 === 0) await pause();
        for (let x = 0; x < size; x++) {
          const i = y * size + x, v = id[i];
          for (const j of [x + 1 < size ? i + 1 : -1, y + 1 < size ? i + size : -1]) {
            if (j < 0) continue;
            const w2 = id[j];
            if (!v && !w2) continue;
            if (v !== w2 || Math.abs(Z[i] - Z[j]) > jump || NX[i] * NX[j] + NY[i] * NY[j] + NZ[i] * NZ[j] < 0.72) {
              const near = !v ? j : !w2 ? i : Z[i] < Z[j] ? i : j;
              const strength = cue(near);
              line[i] = Math.max(line[i], strength); line[j] = Math.max(line[j], strength);
              continue;
            }
            const per = v >= 3 ? period[v] : 0;
            const iso = isoLine(i, j, fa, 0) || isoLine(i, j, fb, per) || (v === 2 && isoLine(i, j, fc, 0));
            if (iso) line[i] = Math.max(line[i], (v === 1 ? 0.42 : 0.75) * cue(i));
          }
        }
      }
      // Phosphor glow: two box blurs of the line mask.
      const glow = Float32Array.from(line);
      const scratch = new Float32Array(size);
      for (let pass = 0; pass < 2; pass++) { blurRows(glow, size, 3, scratch); blurCols(glow, size, 3, scratch); }
      await pause();
      const base = 0.004;
      for (let i = 0; i < N; i++) {
        const l = Math.min(1.4, line[i] * 1.05 + glow[i] * 0.75);
        const o = i * 3;
        out[o] = base + wire[0] * l; out[o + 1] = base + wire[1] * l; out[o + 2] = base * 1.4 + wire[2] * l;
      }
      // The filled rows above the scanline.
      for (let y = 0; y < Math.min(size, doneRow + 1); y++) {
        const limit = y === doneRow ? partial : size;
        for (let x = 0; x < limit; x++) {
          const o = (y * size + x) * 3;
          out[o] = img[o]; out[o + 1] = img[o + 1]; out[o + 2] = img[o + 2];
        }
      }
      if (doneRow < size) for (let x = 0; x < size; x++) { const o = (doneRow * size + x) * 3; out[o] = wire[0] * 1.2; out[o + 1] = wire[1] * 1.2; out[o + 2] = wire[2] * 1.2; }
    } else {
      out.set(img);
      if (doneRow < size) {
        if (cdrom) {
          // Interlaced loading: below the line only every eighth row has arrived, stretched down.
          for (let y = doneRow + 1; y < size; y++) {
            const src = y - (y % 8);
            for (let x = 0; x < size; x++) {
              const o = (y * size + x) * 3, so = (src * size + x) * 3;
              out[o] = img[so]; out[o + 1] = img[so + 1]; out[o + 2] = img[so + 2];
            }
          }
          for (let x = partial; x < size; x++) {
            const o = (doneRow * size + x) * 3, so = ((doneRow - (doneRow % 8)) * size + x) * 3;
            out[o] = img[so]; out[o + 1] = img[so + 1]; out[o + 2] = img[so + 2];
          }
        } else {
          // Below the line nothing has been traced yet; the line itself is half done.
          out.fill(0, (doneRow + 1) * size * 3);
          for (let x = partial; x < size; x++) { const o = (doneRow * size + x) * 3; out[o] = 0; out[o + 1] = 0; out[o + 2] = 0; }
          for (let x = Math.max(0, partial - 3); x < Math.min(size, partial + 1); x++) { const o = (doneRow * size + x) * 3; out[o] = 1; out[o + 1] = 1; out[o + 2] = 1; }
        }
      }
    }
    await pause();

    // 10. Lens flare from the key light's place in the frame.
    const lxy = Math.hypot(Lv[0], Lv[1]);
    let sunX = lxy > 0.15 ? c0 + (Lv[0] / lxy) * size * 0.44 : size * 0.2, sunY = lxy > 0.15 ? c0 - (Lv[1] / lxy) * size * 0.44 : size * 0.16;
    if (sunY > c0) sunY = size - sunY;
    sunX = Math.min(size * 0.86, Math.max(size * 0.14, sunX)); sunY = Math.min(size * 0.3, Math.max(size * 0.1, sunY));
    if (a.flare !== 'none') {
      const S = size, power = 0.7 + mood.energy * 0.6;
      const streak = a.flare === 'streak' || a.flare === 'full', star = a.flare === 'ghosts' || a.flare === 'full', ring = a.flare === 'full';
      const spin = random() * Math.PI;
      for (let y = 0; y < S; y++) {
        if (y % 120 === 0) await pause();
        for (let x = 0; x < S; x++) {
          const dx = x + 0.5 - sunX, dy = y + 0.5 - sunY, r2 = dx * dx + dy * dy, r = Math.sqrt(r2);
          let w = Math.exp(-r2 / (2 * (S * 0.013) ** 2)) * 2.2 + Math.exp(-r / (S * 0.04)) * 0.4;
          let cr = w, cg = w * 0.96, cb = w * 0.86;
          if (streak) {
            const st = Math.exp(-(dy * dy) / (2 * (S * 0.0032) ** 2)) * Math.exp(-Math.abs(dx) / (S * 0.32)) * 1.1
              + Math.exp(-(dy * dy) / (2 * (S * 0.011) ** 2)) * Math.exp(-Math.abs(dx) / (S * 0.16)) * 0.22;
            cr += st * 0.85; cg += st * 0.92; cb += st * 1.1;
          }
          if (star) {
            const th = Math.atan2(dy, dx);
            const sp = Math.pow(Math.abs(Math.cos(th * 6 + spin)), 110) * Math.exp(-r / (S * 0.07)) * 0.7
              + Math.pow(Math.abs(Math.cos(th * 4 + spin * 1.7)), 300) * Math.exp(-r / (S * 0.15)) * 0.3;
            cr += sp; cg += sp * 0.95; cb += sp * 0.85;
          }
          if (ring) {
            const rg = Math.exp(-((r - S * 0.15) ** 2) / (2 * (S * 0.006) ** 2)) * 0.22;
            cr += rg * 0.6; cg += rg * 0.9; cb += rg * 1.2;
          }
          const o = (y * S + x) * 3;
          out[o] += cr * power * lightCol[0]; out[o + 1] += cg * power * lightCol[1]; out[o + 2] += cb * power * lightCol[2];
        }
      }
      if (a.flare !== 'streak') {
        const GHOSTS: [number, number, Vec, number, number][] = [
          // [position along sun->centre, radius, colour, opacity, shape 0 disc 1 hexagon 2 ring]
          [0.42, 0.022, [0.5, 1, 0.55], 0.22, 0], [0.7, 0.05, [1, 0.45, 0.85], 0.12, 1], [1.08, 0.03, [1, 0.75, 0.35], 0.2, 0],
          [1.32, 0.085, [0.45, 0.75, 1], 0.09, 1], [1.6, 0.04, [0.75, 1, 0.45], 0.16, 2], [1.86, 0.11, [1, 0.6, 0.5], 0.07, 1],
        ];
        for (const [along, rad, col, op, shape] of GHOSTS) {
          const gx = sunX + (c0 - sunX) * along, gy = sunY + (c0 - sunY) * along, R = rad * S;
          for (let y = Math.max(0, Math.floor(gy - R - 3)); y < Math.min(S, Math.ceil(gy + R + 3)); y++)
            for (let x = Math.max(0, Math.floor(gx - R - 3)); x < Math.min(S, Math.ceil(gx + R + 3)); x++) {
              const px = Math.abs(x + 0.5 - gx), py = Math.abs(y + 0.5 - gy);
              const d = shape === 1 ? Math.max(px * 0.866 + py * 0.5, py) : Math.hypot(px, py);
              let w = smooth(R + 1.2, R - 1.2, d);
              if (shape === 2) w = Math.exp(-((d - R) ** 2) / (2 * 1.6 ** 2)) * 2;
              else w *= 0.75 + 0.5 * smooth(R * 0.75, R, d);
              const o = (y * S + x) * 3, f = w * op * power;
              out[o] += col[0] * f; out[o + 1] += col[1] * f; out[o + 2] += col[2] * f;
            }
        }
      }
    }

    // 11. To display colour, with a little sampling grain where the mood is worn.
    const pixels = new Uint8ClampedArray(N * 4);
    const grain = mood.wear * 0.035;
    const grainEnd = wireMode ? Math.min(N, doneRow * size) : N;
    for (let i = 0; i < N; i++) {
      const o = i * 3, p = i * 4;
      const n = grain && i < grainEnd && out[o] + out[o + 1] + out[o + 2] > 0.02 ? (hash(i % size, (i / size) | 0, seed + 11) - 0.5) * grain : 0;
      pixels[p] = srgb(out[o] + n); pixels[p + 1] = srgb(out[o + 1] + n); pixels[p + 2] = srgb(out[o + 2] + n); pixels[p + 3] = 255;
    }
    await pause();

    // 12. The display's palette. A CD-ROM frame is a 360-line picture shown doubled.
    if (cdrom) {
      const h = size >> 1;
      const small = new Uint8ClampedArray(h * h * 4);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < h; x++) {
          const q = (y * h + x) * 4, p0 = (y * 2 * size + x * 2) * 4;
          for (let c = 0; c < 3; c++) small[q + c] = (pixels[p0 + c] + pixels[p0 + 4 + c] + pixels[p0 + size * 4 + c] + pixels[p0 + size * 4 + 4 + c]) / 4;
          small[q + 3] = 255;
        }
      await quantize(small, h, palette, pause);
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const p = (y * size + x) * 4, q = (Math.min(h - 1, y >> 1) * h + Math.min(h - 1, x >> 1)) * 4;
          pixels[p] = small[q]; pixels[p + 1] = small[q + 1]; pixels[p + 2] = small[q + 2];
        }
    } else await quantize(pixels, size, palette, pause);
    signal.throwIfAborted();

    // 13. The interface it is shown in.
    const fileName = `${(context.idea || 'scene').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8) || 'SCENE'}.${cdrom ? 'PCX' : wireMode ? 'DXF' : 'TGA'}`;
    let framed = pixels;
    if (a.frame !== 'none') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const pen = canvas.getContext('2d', { willReadFrequently: true })!;
      pen.putImageData(new ImageData(pixels, size, size), 0, 0);
      const u = size / 720;
      const font = (px: number, bold = true) => `${bold ? 'bold ' : ''}${Math.round(px * u)}px sans-serif`;
      const bevel = (x: number, y: number, w: number, h: number, raised: boolean, t: number, face?: string) => {
        if (face) { pen.fillStyle = face; pen.fillRect(x, y, w, h); }
        pen.fillStyle = raised ? '#ffffff' : '#404040';
        pen.fillRect(x, y, w, t); pen.fillRect(x, y, t, h);
        pen.fillStyle = raised ? '#404040' : '#ffffff';
        pen.fillRect(x, y + h - t, w, t); pen.fillRect(x + w - t, y, t, h);
      };
      const tri = (x: number, y: number, r: number, dir: 'l' | 'r' | 'u' | 'd', fill: string) => {
        pen.fillStyle = fill; pen.beginPath();
        if (dir === 'l') { pen.moveTo(x + r, y - r); pen.lineTo(x - r, y); pen.lineTo(x + r, y + r); }
        else if (dir === 'r') { pen.moveTo(x - r, y - r); pen.lineTo(x + r, y); pen.lineTo(x - r, y + r); }
        else if (dir === 'u') { pen.moveTo(x - r, y + r * 0.6); pen.lineTo(x, y - r * 0.6); pen.lineTo(x + r, y + r * 0.6); }
        else { pen.moveTo(x - r, y - r * 0.6); pen.lineTo(x, y + r * 0.6); pen.lineTo(x + r, y - r * 0.6); }
        pen.closePath(); pen.fill();
      };
      const elapsed = Math.floor(600 + random() * 9000) * Math.max(0.2, doneFrac);
      const clock = `${String(Math.floor(elapsed / 3600)).padStart(2, '0')}:${String(Math.floor(elapsed / 60) % 60).padStart(2, '0')}:${String(Math.floor(elapsed) % 60).padStart(2, '0')}`;
      if (a.frame === 'window') {
        const b = Math.round(5 * u), tb = Math.round(24 * u), sb = Math.round(24 * u);
        pen.fillStyle = '#c0c0c0';
        pen.fillRect(0, 0, size, b + tb); pen.fillRect(0, size - sb - b, size, sb + b);
        pen.fillRect(0, 0, b, size); pen.fillRect(size - b, 0, b, size);
        bevel(0, 0, size, size, true, Math.max(1, Math.round(u * 1.5)));
        pen.fillStyle = '#000080'; pen.fillRect(b, b, size - 2 * b, tb - 2);
        bevel(b, b, tb, tb - 2, true, Math.max(1, Math.round(u)), '#c0c0c0');
        pen.fillStyle = '#000000'; pen.fillRect(b + tb * 0.22, b + tb * 0.42, tb * 0.56, Math.max(2, 3 * u));
        bevel(size - b - tb * 2, b, tb, tb - 2, true, Math.max(1, Math.round(u)), '#c0c0c0');
        tri(size - b - tb * 1.5, b + tb * 0.48, tb * 0.22, 'd', '#000000');
        bevel(size - b - tb, b, tb, tb - 2, true, Math.max(1, Math.round(u)), '#c0c0c0');
        tri(size - b - tb * 0.5, b + tb * 0.48, tb * 0.22, 'u', '#000000');
        pen.fillStyle = '#ffffff'; pen.font = font(14); pen.textAlign = 'center'; pen.textBaseline = 'middle';
        pen.fillText(`Render - ${fileName}`, size / 2, b + tb / 2);
        pen.fillStyle = '#000000'; pen.fillRect(b - 1, b + tb - 1, size - 2 * b + 2, 1); pen.fillRect(b - 1, size - sb - b, size - 2 * b + 2, 1);
        const sy = size - sb - b + Math.round(3 * u), sh = sb - Math.round(5 * u);
        const panels: [number, number, string][] = [
          [b + 3 * u, size * 0.38, wireMode ? `Wireframe  ${Math.round(doneFrac * 100)}% shaded` : doneRow >= size ? 'Done' : `Line ${doneRow} of ${size}`],
          [size * 0.4, size * 0.22, clock],
          [size * 0.63, size * 0.37 - b, palette === 'millions' ? '24-bit colour' : palette === 'thousands' ? '16-bit colour' : palette === 'vga' ? '16 colours' : '256 colours'],
        ];
        pen.font = font(12, false); pen.textAlign = 'left';
        for (const [x, w, label] of panels) {
          bevel(x, sy, w, sh, false, Math.max(1, Math.round(u)));
          pen.fillStyle = '#000000'; pen.fillText(label, x + 6 * u, sy + sh / 2 + u);
        }
      } else if (a.frame === 'bevel') {
        const side = Math.round(26 * u), top = Math.round(40 * u), bottom = Math.round(70 * u);
        const panel = scheme.panel;
        // Brushed metal in a dozen stepped bands, as a 256-colour interface would draw it.
        pen.save();
        pen.beginPath(); pen.rect(0, 0, size, size); pen.rect(side, top, size - 2 * side, size - top - bottom);
        pen.clip('evenodd');
        const bands = 12;
        for (let k = 0; k < bands; k++) {
          pen.fillStyle = shade(panel, mix(1.4, 0.5, k / (bands - 1)));
          pen.fillRect(0, (k * size) / bands, size, size / bands + 1);
        }
        pen.restore();
        const t = Math.max(2, Math.round(4 * u));
        bevel(0, 0, size, size, true, t);
        bevel(side - t, top - t, size - 2 * side + 2 * t, size - top - bottom + 2 * t, false, t);
        // The title plate.
        const pw2 = size * 0.46, ph = top * 0.62, px = (size - pw2) / 2, py = (top - ph) / 2 - t * 0.3;
        bevel(px, py, pw2, ph, false, Math.max(1, Math.round(2 * u)), shade(panel, 0.42));
        pen.fillStyle = shade(panel, 1.6); pen.font = font(15); pen.textAlign = 'center'; pen.textBaseline = 'middle';
        pen.fillText(titleOf(context.idea), size / 2, py + ph / 2 + u);
        // Navigation buttons.
        const bh = bottom * 0.62, by = size - bottom + (bottom - bh) / 2 + t * 0.3, bw = bh * 1.25;
        const icons: ('l' | 'u' | 'r' | 'map' | 'quit')[] = ['l', 'u', 'r', 'map', 'quit'];
        const startX = size / 2 - (icons.length * bw + (icons.length - 1) * 12 * u) / 2;
        icons.forEach((icon, n) => {
          const bx = startX + n * (bw + 12 * u);
          bevel(bx, by, bw, bh, true, Math.max(2, Math.round(3 * u)), shade(panel, 1.1));
          const ink = shade(panel, 0.32);
          if (icon === 'l' || icon === 'r' || icon === 'u') tri(bx + bw / 2, by + bh / 2, bh * 0.22, icon, ink);
          else {
            pen.fillStyle = ink; pen.font = font(13); pen.textAlign = 'center';
            pen.fillText(icon === 'map' ? 'MAP' : 'QUIT', bx + bw / 2, by + bh / 2 + u);
          }
        });
        // A small status lamp and disc counter.
        pen.fillStyle = shade(panel, 0.35); pen.font = font(11); pen.textAlign = 'left';
        pen.fillText(`DISC 1  ${clock}`, side, size - bottom / 2);
        pen.fillStyle = doneRow >= size ? '#3fd34a' : '#e8b020';
        pen.beginPath(); pen.arc(size - side - 10 * u, size - bottom / 2, 6 * u, 0, Math.PI * 2); pen.fill();
      } else {
        // The modeller's camera viewport.
        const bw = Math.max(2, Math.round(3 * u));
        pen.strokeStyle = '#f0f0f0'; pen.lineWidth = bw; pen.strokeRect(bw / 2, bw / 2, size - bw, size - bw);
        pen.strokeStyle = 'rgba(255,190,60,0.85)'; pen.lineWidth = Math.max(1, u);
        pen.setLineDash([6 * u, 5 * u]);
        const inset = size * 0.07; pen.strokeRect(inset, inset, size - 2 * inset, size - 2 * inset);
        pen.setLineDash([]);
        pen.font = font(13); pen.textAlign = 'left'; pen.textBaseline = 'top';
        pen.fillStyle = 'rgba(0,0,0,0.55)'; pen.fillRect(bw + 4 * u, bw + 4 * u, 250 * u, 20 * u);
        pen.fillStyle = '#ffffff';
        pen.fillText(`Camera01  [${wireMode ? 'Wireframe' : cdrom ? 'Smooth + Textures' : 'Smooth + Highlight'}]`, bw + 9 * u, bw + 7 * u);
        // The axis tripod: the floor's axes and up, as the camera sees them.
        const ox = 46 * u, oy = size - 46 * u, L = 30 * u;
        const axes: [Vec, string, string][] = [[t1, '#ff4040', 'X'], [t2, '#40e040', 'Y'], [up, '#5080ff', 'Z']];
        pen.lineWidth = Math.max(2, 2 * u); pen.font = font(12); pen.textBaseline = 'middle'; pen.textAlign = 'center';
        for (const [axis, col, label] of axes) {
          const ex = ox + axis[0] * L, ey = oy - axis[1] * L;
          pen.strokeStyle = col; pen.beginPath(); pen.moveTo(ox, oy); pen.lineTo(ex, ey); pen.stroke();
          pen.fillStyle = col; pen.fillText(label, ox + axis[0] * (L + 10 * u), oy - axis[1] * (L + 10 * u));
        }
        pen.fillStyle = '#ffffff'; pen.textAlign = 'right'; pen.textBaseline = 'bottom'; pen.font = font(12, false);
        pen.fillText(`${fileName}   ${clock}`, size - 10 * u, size - 8 * u);
      }
      framed = pen.getImageData(0, 0, size, size).data;
    }
    signal.throwIfAborted();

    for (let p = 3; p < framed.length; p += 4) framed[p] = 255;
    signal.throwIfAborted();

    const materialNote = { plastic: 'glossy plastic', chrome: 'a chrome hero', allchrome: 'all chrome', gold: 'a gold hero', glass: 'a glass hero' }[a.material];
    return {
      pixels: framed,
      notes: [
        `${tradition === 'raytrace' ? 'raytraced demo' : wireMode ? 'wireframe render' : 'CD-ROM render'} in the ${a.scheme} scheme${persp ? ', perspective' : ''}`,
        wireMode ? `flat facets filled ${Math.round(doneFrac * 100)}% down the frame` : `${materialNote}, ${refl < 0.15 ? 'matte' : refl < 0.6 ? 'polished' : 'mirror'} floor, ${hardSpec ? 'hard' : 'soft'} highlights`,
        `${palette} palette${a.flare === 'none' ? '' : `, ${a.flare} flare`}${a.frame === 'none' ? '' : `, ${a.frame} frame`}`,
      ],
    };
  },
});

const SUB: [number, number][] = [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]];
const STEEL: Vec = [0.8, 0.86, 0.94];
const MEAN: Vec = [0, 0, 0];
const GOLD: Vec = [1.0, 0.68, 0.26];
const GLASS: Vec = [0.8, 0.97, 0.88];

/** Lighten or darken a hex colour for interface bevels. */
function shade(hexColour: string, f: number) {
  const c = [1, 3, 5].map((o) => parseInt(hexColour.slice(o, o + 2), 16));
  const out = c.map((v) => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f))));
  return `rgb(${out[0]},${out[1]},${out[2]})`;
}

function titleOf(idea: string) {
  const words = (idea || 'Untitled').replace(/[^A-Za-z0-9 '\-]+/g, ' ').trim().split(/\s+/).slice(0, 5).join(' ');
  return (words || 'Untitled').toUpperCase().slice(0, 30);
}

function blurRows(data: Float32Array, size: number, r: number, scratch: Float32Array) {
  const span = r * 2 + 1;
  for (let y = 0; y < size; y++) {
    const row = y * size;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += data[row + Math.min(size - 1, Math.max(0, k))];
    for (let x = 0; x < size; x++) {
      scratch[x] = sum / span;
      sum += data[row + Math.min(size - 1, x + r + 1)] - data[row + Math.max(0, x - r)];
    }
    data.set(scratch.subarray(0, size), row);
  }
}

function blurCols(data: Float32Array, size: number, r: number, scratch: Float32Array) {
  const span = r * 2 + 1;
  for (let x = 0; x < size; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += data[Math.min(size - 1, Math.max(0, k)) * size + x];
    for (let y = 0; y < size; y++) {
      scratch[y] = sum / span;
      sum += data[Math.min(size - 1, y + r + 1) * size + x] - data[Math.max(0, y - r) * size + x];
    }
    for (let y = 0; y < size; y++) data[y * size + x] = scratch[y];
  }
}

/** Cut the picture to what the display can show, in place. */
async function quantize(buf: Uint8ClampedArray, side: number, palette: string, pause: () => Promise<void>) {
  if (palette === 'thousands') {
    for (let p = 0; p < buf.length; p += 4)
      for (let c = 0; c < 3; c++) buf[p + c] = Math.round((buf[p + c] / 255) * 31) * (255 / 31);
  } else if (palette === 'system') {
    for (let y = 0; y < side; y++)
      for (let x = 0; x < side; x++) {
        const p = (y * side + x) * 4, t = BAYER8[(y & 7) * 8 + (x & 7)] - 0.5;
        for (let c = 0; c < 3; c++) buf[p + c] = Math.max(0, Math.min(5, Math.round(buf[p + c] / 51 + t * 0.95))) * 51;
      }
  } else if (palette !== 'millions') {
    const colours = palette === 'vga' ? VGA : medianCut(buf, palette === 'banded' ? 40 : 256, 7);
    const nearest = nearestOf(colours);
    if (palette === 'banded') {
      for (let p = 0; p < buf.length; p += 4) {
        const q = colours[nearest(buf[p], buf[p + 1], buf[p + 2])];
        buf[p] = q[0]; buf[p + 1] = q[1]; buf[p + 2] = q[2];
      }
    } else {
      // Floyd–Steinberg, serpentine.
      const err = new Float32Array((side + 2) * 2 * 3);
      const scale = palette === 'vga' ? 0.85 : 1;
      for (let y = 0; y < side; y++) {
        if (y % 120 === 0) await pause();
        const cur = (y & 1) * (side + 2) * 3, nxt = ((y + 1) & 1) * (side + 2) * 3;
        err.fill(0, nxt, nxt + (side + 2) * 3);
        const ltr = (y & 1) === 0;
        for (let n = 0; n < side; n++) {
          const x = ltr ? n : side - 1 - n, step = ltr ? 1 : -1;
          const p = (y * side + x) * 4, e = cur + (x + 1) * 3;
          const r = buf[p] + err[e], g = buf[p + 1] + err[e + 1], b = buf[p + 2] + err[e + 2];
          const q = colours[nearest(Math.round(r), Math.round(g), Math.round(b))];
          buf[p] = q[0]; buf[p + 1] = q[1]; buf[p + 2] = q[2];
          const er = (r - q[0]) * scale, eg = (g - q[1]) * scale, eb = (b - q[2]) * scale;
          const ahead = cur + (x + 1 + step) * 3, below = nxt + (x + 1) * 3, belowAhead = nxt + (x + 1 + step) * 3, belowBehind = nxt + (x + 1 - step) * 3;
          err[ahead] += er * 7 / 16; err[ahead + 1] += eg * 7 / 16; err[ahead + 2] += eb * 7 / 16;
          err[belowBehind] += er * 3 / 16; err[belowBehind + 1] += eg * 3 / 16; err[belowBehind + 2] += eb * 3 / 16;
          err[below] += er * 5 / 16; err[below + 1] += eg * 5 / 16; err[below + 2] += eb * 5 / 16;
          err[belowAhead] += er / 16; err[belowAhead + 1] += eg / 16; err[belowAhead + 2] += eb / 16;
        }
      }
    }
  }
}
