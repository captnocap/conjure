import { type PaletteRole, type RGB, choice, clamp01, defineLook, mix, rekeyOne, score, seeded } from '@conjure/kit';

// The frame is treated as a video signal and then as light from a picture tube:
//   camera  -> what the lens and pickup saw (colour, plain lighting, normals, depth, identity)
//   signal  -> luma and chroma on scan lines, band-limited, noisy, torn, captioned
//   tube    -> beam, phosphor mask, convergence, bloom, curved glass and the room's reflection

/**
 * Single-colour phosphors as linear-light gun weights (the brightest channel at 1). Under the
 * picture's palette the green tube glows in its ink, the amber tube in its second colour and the
 * black-and-white tube takes a faint tint of the ink; the colour tubes come from the scene.
 */
const PHOSPHORS: Record<string, { tint: readonly [number, number, number]; role: PaletteRole }> = {
  white: { tint: [0.8, 0.9, 1], role: 'ink' },
  green: { tint: [0.16, 1, 0.3], role: 'ink' },
  amber: { tint: [1, 0.62, 0.1], role: 'second' },
};
function phosphorTint(name: string, palette: Parameters<typeof rekeyOne>[1]): readonly [number, number, number] {
  const { tint, role } = PHOSPHORS[name];
  if (!palette) return tint;
  const encode = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  const decode = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const keyed = rekeyOne(tint.map(encode) as unknown as RGB, palette, role).map(decode);
  const peak = Math.max(...keyed, 1e-3);
  return [keyed[0] / peak, keyed[1] / peak, keyed[2] / peak];
}

// Classic 5x7 character generator, one byte per column, bit 0 at the top.
const FONT: Record<string, readonly number[]> = {
  '0': [0x3e, 0x51, 0x49, 0x45, 0x3e], '1': [0x00, 0x42, 0x7f, 0x40, 0x00], '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4b, 0x31], '4': [0x18, 0x14, 0x12, 0x7f, 0x10], '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3c, 0x4a, 0x49, 0x49, 0x30], '7': [0x01, 0x71, 0x09, 0x05, 0x03], '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1e], ':': [0x00, 0x36, 0x36, 0x00, 0x00], '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00], '/': [0x20, 0x10, 0x08, 0x04, 0x02], A: [0x7e, 0x11, 0x11, 0x11, 0x7e],
  B: [0x7f, 0x49, 0x49, 0x49, 0x36], C: [0x3e, 0x41, 0x41, 0x41, 0x22], D: [0x7f, 0x41, 0x41, 0x22, 0x1c],
  E: [0x7f, 0x49, 0x49, 0x49, 0x41], F: [0x7f, 0x09, 0x09, 0x09, 0x01], G: [0x3e, 0x41, 0x49, 0x49, 0x7a],
  H: [0x7f, 0x08, 0x08, 0x08, 0x7f], I: [0x00, 0x41, 0x7f, 0x41, 0x00], J: [0x20, 0x40, 0x41, 0x3f, 0x01],
  K: [0x7f, 0x08, 0x14, 0x22, 0x41], L: [0x7f, 0x40, 0x40, 0x40, 0x40], M: [0x7f, 0x02, 0x0c, 0x02, 0x7f],
  N: [0x7f, 0x04, 0x08, 0x10, 0x7f], O: [0x3e, 0x41, 0x41, 0x41, 0x3e], P: [0x7f, 0x09, 0x09, 0x09, 0x06],
  Q: [0x3e, 0x41, 0x51, 0x21, 0x5e], R: [0x7f, 0x09, 0x19, 0x29, 0x46], S: [0x46, 0x49, 0x49, 0x49, 0x31],
  T: [0x01, 0x01, 0x7f, 0x01, 0x01], U: [0x3f, 0x40, 0x40, 0x40, 0x3f], V: [0x1f, 0x20, 0x40, 0x20, 0x1f],
  W: [0x3f, 0x40, 0x38, 0x40, 0x3f], X: [0x63, 0x14, 0x08, 0x14, 0x63], Y: [0x07, 0x08, 0x70, 0x08, 0x07],
  Z: [0x61, 0x51, 0x49, 0x45, 0x43], '>': [0x7f, 0x3e, 0x1c, 0x08, 0x00], '*': [0x1c, 0x3e, 0x3e, 0x3e, 0x1c],
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const two = (n: number) => String(Math.floor(n)).padStart(2, '0');

/** Running-sum box blur along rows, in place. */
function blurRows(data: Float32Array, width: number, height: number, radius: number, scratch: Float32Array) {
  const r = Math.max(0, Math.round(radius));
  if (r === 0) return;
  const span = r * 2 + 1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += data[row + Math.min(width - 1, Math.max(0, k))];
    for (let x = 0; x < width; x++) {
      scratch[x] = sum / span;
      sum += data[row + Math.min(width - 1, x + r + 1)] - data[row + Math.max(0, x - r)];
    }
    for (let x = 0; x < width; x++) data[row + x] = scratch[x];
  }
}
/** Running-sum box blur along columns, in place. */
function blurColumns(data: Float32Array, width: number, height: number, radius: number, scratch: Float32Array) {
  const r = Math.max(0, Math.round(radius));
  if (r === 0) return;
  const span = r * 2 + 1;
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += data[Math.min(height - 1, Math.max(0, k)) * width + x];
    for (let y = 0; y < height; y++) {
      scratch[y] = sum / span;
      sum += data[Math.min(height - 1, y + r + 1) * width + x] - data[Math.max(0, y - r) * width + x];
    }
    for (let y = 0; y < height; y++) data[y * width + x] = scratch[y];
  }
}

export default defineLook({
  questions: {
    source: choice('What kind of picture is the tube showing?', {
      broadcast:
        'An over-the-air television broadcast: soft colour, ringing edges and the faint doubled outlines of a signal that came a long way.',
      vhs: 'A videotape played back: smeared, bleeding colour, soft detail, a noisy seam at the bottom where the heads switch.',
      cctv: 'A security camera feed: grey and flat through a wide lens, corners falling dark, lit at night by the camera’s own infrared lamp.',
      arcade: 'An arcade or console picture: chunky square pixels, a small bright palette and hard dark outlines.',
      terminal:
        'An early computer display: the scene redrawn in a handful of tones by ordered dots on a black screen, outlined like a wireframe.',
      camcorder:
        'A handheld camcorder tape: blown-out highlights that streak vertically, auto-exposure, soft focus behind the subject.',
    }),
    phosphor: choice('How does the tube glow? A single-colour tube glows in the picture\u2019s palette.', {
      colour: 'Full colour from red, green and blue phosphors, as a living-room set.',
      faded: 'An old colour tube with a weak red gun: greenish, washed and tired.',
      hot: 'Colour turned up too far: saturated, reds smearing, almost sickly.',
      white: 'A black-and-white tube: a pale, faintly tinted glow, no colour at all.',
      green: 'A single-colour phosphor, sharp and electric on black: a lab monitor, a radar room, a night shift.',
      amber: 'A single-colour phosphor, mellow and soft on black: an old office terminal.',
    }),
    mask: choice('If it is a colour tube, how are the phosphors laid out up close?', {
      grille: 'Fine unbroken vertical stripes of red, green and blue: a crisp studio monitor.',
      slot: 'Short staggered vertical slots like tiny bricks: an ordinary television.',
      dots: 'A honeycomb of round dot triads: an older set or a computer monitor.',
      coarse: 'Large obvious stripes you can count: a cheap set seen from too close.',
      smooth: 'Too fine to see: only the scanlines show.',
    }),
    scan: score('How visible are the scanlines?', [
      'Barely there: a smooth picture',
      'A fine texture',
      'Clear lines',
      'Dark gaps between bright lines',
      'Thin bright wires on black',
    ]),
    fault: choice('What is going wrong with the picture right now?', {
      steady: 'Nothing: it holds steady.',
      tracking: 'A tracking tear: a band of the picture ripped sideways into noise, as on a worn or badly aligned tape.',
      roll: 'Vertical hold slipping: the picture has rolled, split by a black bar, the bottom above the top.',
      ghost: 'Ghosting: every edge repeated in fainter echoes to the right, a signal bouncing off buildings.',
      skew: 'The top of the picture bends and flags sideways, as when a tape is stretched.',
      interference: 'Interference: slanted herringbone ripples and broad dark hum bars drifting across.',
      dropout: 'Dropouts: short white comet streaks where the tape has shed its coating.',
      colourloss: 'The colour keeps cutting out in bands, with rainbow fringes where it catches again.',
    }),
    signal: score('How strong is the signal?', [
      'Clean and locked',
      'A little grain',
      'Noticeable snow',
      'Weak: the picture swims in snow',
      'Nearly lost in static',
    ]),
    overlay: choice('What is superimposed on the screen, if anything?', {
      none: 'Nothing: only the picture.',
      timestamp: 'Security timestamp: camera number, date and running clock on black bars.',
      play: 'A VCR on-screen display: PLAY with an arrow and a tape counter.',
      rec: 'A camcorder viewfinder: a red REC dot, and an orange date burned into the corner.',
      channel: 'A bright green channel number in the corner, just after changing channels.',
      tracking: 'Surveillance tracking: boxes locked around each object with an id tag, and a MOTION warning.',
      caption: 'A late-night station caption: a coloured lower-third band with call letters and the small hours.',
    }),
    tube: choice('What is the glass like, and how are we seeing it?', {
      flat: 'Edge to edge and flat: only the picture, no cabinet.',
      curved: 'A bulging tube: the picture bows, corners rounded and dim inside a dark bezel.',
      portable: 'A small portable set: coarse lines, strongly rounded corners, a thick bezel, heavy vignette.',
      photo: 'Photographed off the screen in a room: glare from a window on the glass, moiré and a dark refresh band.',
    }),
    bloom: score('How much do bright areas glow and bleed into the dark?', [
      'None: hard and dry',
      'A slight halo',
      'A soft glow',
      'Blooming highlights',
      'Everything bright smears into haze',
    ]),
  },

  async apply(capture, a, context, signal) {
    const N = capture.size;
    const { mood } = context;
    const rnd = seeded((context.seed ^ 0x5c47b10d) >>> 0);
    const scratch = new Float32Array(N);
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };
    const notes: string[] = [];

    // ------------------------------------------------------------------ camera
    const src = a.source;
    const synthetic = src === 'arcade' || src === 'terminal';
    const count = N * N;

    // Depth, normalised over what is actually in the scene. The backdrop is cleared to zero.
    const depth = new Float32Array(count);
    let dMin = 1, dMax = 0, heroDepth = 0, heroCount = 0;
    for (let i = 0; i < count; i++) {
      if (capture.identity[i * 4] === 0) continue;
      const d = (capture.depth[i * 4] + capture.depth[i * 4 + 1] / 256) / 256;
      depth[i] = d;
      if (d < dMin) dMin = d;
      if (d > dMax) dMax = d;
    }
    const dSpan = Math.max(1e-4, dMax - dMin);
    for (let i = 0; i < count; i++) {
      const id = capture.identity[i * 4];
      depth[i] = id === 0 ? 1 : clamp01((depth[i] - dMin) / dSpan) * 0.85;
      if (id >= 3) { heroDepth += depth[i]; heroCount++; }
    }
    heroDepth = heroCount ? heroDepth / heroCount : 0.4;

    // Wide-angle lens for the security camera: sample the capture through a barrel map.
    const fish = src === 'cctv' ? 0.2 : 0;
    const half = (N - 1) / 2;
    const camR = new Float32Array(count), camG = new Float32Array(count), camB = new Float32Array(count);
    const ident = new Uint8Array(count);
    const hot = new Float32Array(count); // specular glints, which bloom, streak and trail
    const lens = new Float32Array(count); // how far out of focus

    const L = [capture.light[0], -capture.light[1], capture.light[2]];
    const hx = L[0], hy = L[1], hz = L[2] + 1;
    const hLen = Math.hypot(hx, hy, hz) || 1;
    const night = clamp01(Math.abs(mood.daylight - 0.5) * 1.4 + (1 - mood.cheer) * 0.3);
    const overexposed = src === 'camcorder' ? 1.12 : src === 'arcade' ? 1.05 : 0.97;

    for (let y = 0; y < N; y++) {
      if (y % 360 === 0) await pause();
      for (let x = 0; x < N; x++) {
        const o = y * N + x;
        let sx = x, sy = y, outside = 0;
        if (fish) {
          const px = (x - half) / half, py = (y - half) / half;
          const r2 = px * px + py * py;
          const k = (1 + fish * r2) / (1 + fish * 1.1);
          sx = half + px * k * half;
          sy = half + py * k * half;
          if (sx < 0 || sy < 0 || sx > N - 1 || sy > N - 1) outside = 1;
          sx = Math.min(N - 1, Math.max(0, Math.round(sx)));
          sy = Math.min(N - 1, Math.max(0, Math.round(sy)));
        }
        const s = (sy * N + sx) * 4;
        const id = outside ? 0 : capture.identity[s];
        ident[o] = id;
        let r = capture.color[s] / 255, g = capture.color[s + 1] / 255, b = capture.color[s + 2] / 255;
        const nx = capture.normal[s] / 127.5 - 1, ny = capture.normal[s + 1] / 127.5 - 1, nz = capture.normal[s + 2] / 127.5 - 1;
        const lit = capture.diffuse[s] / 255;
        const d = depth[sy * N + sx];
        const facing = id >= 1 ? (nx * hx + ny * hy + nz * hz) / hLen : 0;
        const glint = facing > 0.8 ? Math.pow(facing, 26) * (0.35 + lit) : 0;

        if (src === 'cctv') {
          // Day: a flat grey pickup. Night: the scene lit only by a lamp beside the lens, so
          // surfaces facing the camera glow, light falls off with distance and the room is black.
          const day = clamp01((0.299 * r + 0.587 * g + 0.114 * b - 0.08) * 1.12);
          const base = capture.baseColors[id];
          const albedo = base ? 0.45 + 0.55 * ((0.5 * base[0] + 0.4 * base[1] + 0.1 * base[2]) / 255) : 0.6;
          const falloff = 1 / ((1 + d * 2.6) * (1 + d * 2.6));
          const lamp = id === 0 ? 0.05 : albedo * Math.pow(Math.max(0, nz), 0.8) * falloff * 2.3 * (0.6 + 0.4 * lit);
          const edge = Math.hypot(x - half, y - half) / half;
          const pool = clamp01(1.25 - edge * edge * 0.75); // the lamp's pool of light
          const v = outside ? 0 : mix(day, lamp * pool + glint * 0.5, night);
          r = g = b = v;
        } else if (src === 'terminal') {
          // A computer has no backdrop: empty space is an unlit screen.
          // The floor is a sparse field of dots that goes dark in shadow and with distance.
          const v = id === 0 ? 0 : id === 1 ? (lit > 0.6 ? 0.075 : 0) : clamp01(lit * 0.55 + (0.299 * r + 0.587 * g + 0.114 * b) * 0.6 + glint);
          r = g = b = v;
        } else {
          // A video camera's own tone: the bright backdrop is pulled down, corners fall off.
          const ex = (x - half) / half, ey = (y - half) / half;
          let fall = (1 - 0.16 * (ex * ex + ey * ey)) * overexposed;
          if (id <= 1 && !outside) {
            // Backdrop and floor (in a studio the floor sweeps up to become the backdrop).
            if (src === 'arcade') {
              // A game has no studio wall: empty screen is a dithered dusk falling to black,
              // and the floor a dim blue field that still carries the shadows.
              const t = y / N;
              if (id === 0) { r = 0.02 + 0.05 * t * mood.warmth; g = 0.03 + 0.04 * t; b = 0.1 + 0.2 * t; }
              else { r *= 0.34; g *= 0.4; b *= 0.62; }
            } else {
              // A cyclorama: under-lit, darker toward the top, darker at night.
              const wall = src === 'camcorder' ? mix(0.84, 0.45, night) : mix(0.8, 0.36, night);
              fall *= wall * (0.78 + 0.3 * (y / N));
            }
          }
          r = r * (0.45 + 0.55 * r) * fall + glint * 0.5;
          g = g * (0.45 + 0.55 * g) * fall + glint * 0.5;
          b = b * (0.45 + 0.55 * b) * fall + glint * 0.5;
        }
        camR[o] = r; camG[o] = g; camB[o] = b;
        hot[o] = outside ? 0 : glint + (src === 'camcorder' ? Math.max(0, lit - 0.82) * (id >= 3 ? 1.2 : 0) : 0);
        lens[o] = synthetic ? 0 : clamp01(Math.abs(d - heroDepth) * (src === 'camcorder' ? 2.2 : src === 'broadcast' ? 0.7 : 1.3));
      }
    }

    // Cheap fixed-focus lens: blend toward a blurred copy by distance from the subject.
    if (!synthetic) {
      const soft = [new Float32Array(camR), new Float32Array(camG), new Float32Array(camB)];
      for (const plane of soft) {
        blurRows(plane, N, N, 4, scratch);
        blurColumns(plane, N, N, 4, scratch);
        blurRows(plane, N, N, 2, scratch);
      }
      for (let i = 0; i < count; i++) {
        const t = lens[i];
        camR[i] = mix(camR[i], soft[0][i], t);
        camG[i] = mix(camG[i], soft[1][i], t);
        camB[i] = mix(camB[i], soft[2][i], t);
      }
      await pause();
    }

    // Vertical smear from an overloaded pickup: each column leaks its glints up and down.
    if (src === 'camcorder' || src === 'cctv' || src === 'vhs') {
      const column = new Float32Array(N);
      for (let i = 0; i < count; i++) column[i % N] += hot[i];
      blurRows(column, N, 1, 2, scratch);
      const gain = (src === 'camcorder' ? 0.02 : 0.008);
      for (let i = 0; i < count; i++) {
        const add = Math.min(src === 'camcorder' ? 0.3 : 0.2, column[i % N] * gain);
        camR[i] += add; camG[i] += add; camB[i] += add * 1.05;
      }
    }

    // ------------------------------------------------------------------ signal
    const linePx = a.tube === 'portable' ? 4 : 3;
    const lines = Math.floor(N / linePx);
    const W = N;
    const total = lines * W;
    let Y = new Float32Array(total), I = new Float32Array(total), Q = new Float32Array(total);
    const tag = new Uint8Array(total); // identity per signal sample, for outlines and tracking boxes
    const cell = src === 'arcade' ? linePx : src === 'terminal' ? 2 : 1;
    const saturation = (src === 'vhs' ? 1.25 : src === 'arcade' ? 1.5 : src === 'camcorder' ? 1.1 : 0.95) * mix(0.75, 1.2, mood.cheer);
    const lift = src === 'vhs' ? 0.07 : src === 'broadcast' ? 0.04 : src === 'camcorder' ? 0.03 : 0;
    const CGA = [[0, 0, 0], [0.75, 0.15, 0.7], [0.2, 0.85, 0.85], [1, 1, 1]];

    for (let l = 0; l < lines; l++) {
      for (let x = 0; x < W; x += cell) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = 0; dy < linePx; dy++)
          for (let dx = 0; dx < cell && x + dx < W; dx++) {
            const o = (l * linePx + dy) * N + x + dx;
            r += camR[o]; g += camG[o]; b += camB[o]; n++;
          }
        r /= n; g /= n; b /= n;
        const centre = (l * linePx + (linePx >> 1)) * N + Math.min(W - 1, x + (cell >> 1));
        const id = ident[centre];
        const cx = Math.floor(x / cell);
        const dither = (BAYER[(l & 3) * 4 + (cx & 3)] + 0.5) / 16 - 0.5;
        if (src === 'arcade') {
          const levels = 3;
          r = Math.round(clamp01(r * 1.05) * levels + dither * 0.9) / levels;
          g = Math.round(clamp01(g * 1.05) * levels + dither * 0.9) / levels;
          b = Math.round(clamp01(b * 1.05) * levels + dither * 0.9) / levels;
        } else if (src === 'terminal') {
          const level = Math.max(0, Math.min(3, Math.round(clamp01(r * 1.15) * 3 + dither * 0.95)));
          [r, g, b] = CGA[level];
        }
        let y = 0.299 * r + 0.587 * g + 0.114 * b;
        let i = (0.596 * r - 0.274 * g - 0.322 * b) * saturation;
        let q = (0.211 * r - 0.523 * g + 0.312 * b) * saturation;
        if (src === 'cctv') i = q = 0;
        y = lift + y * (1 - lift);
        for (let dx = 0; dx < cell && x + dx < W; dx++) {
          const o = l * W + x + dx;
          Y[o] = y; I[o] = i; Q[o] = q; tag[o] = id;
        }
      }
    }

    // Outlines from identity: sprites get a dark keyline, wireframes a bright one.
    if (synthetic) {
      for (let l = 0; l < lines - 1; l++)
        for (let x = 0; x < W - cell; x++) {
          const o = l * W + x;
          if (tag[o] === tag[o + cell] && tag[o] === tag[o + W]) continue;
          if (src === 'arcade') { Y[o] *= 0.12; I[o] *= 0.3; Q[o] *= 0.3; }
          else { Y[o] = 1; I[o] = Q[o] = 0; }
        }
    } else {
      // Band limits: luma loses fine detail, then the set's sharpening rings at every edge.
      const lumaBlur = src === 'vhs' ? 2 : src === 'camcorder' ? 2 : 1;
      blurRows(Y, W, lines, lumaBlur, scratch);
      if (src === 'vhs' || src === 'camcorder') blurRows(Y, W, lines, 1, scratch);
      const wide = new Float32Array(Y);
      blurRows(wide, W, lines, 5, scratch);
      const ring = src === 'broadcast' ? 0.7 : src === 'cctv' ? 0.9 : 0.4;
      for (let o = 0; o < total; o++) Y[o] += (Y[o] - wide[o]) * ring;
    }

    const wearNoise = clamp01(a.signal * 0.85 + mood.wear * 0.2);
    const noise = (synthetic ? 0.35 : 1) * (0.012 + wearNoise * wearNoise * 0.23);

    // Ghosts: delayed, weaker, alternately inverted copies of the luma.
    const ghosting = (a.fault === 'ghost' ? 0.42 : src === 'broadcast' ? 0.1 + wearNoise * 0.12 : 0);
    if (ghosting > 0) {
      const clean = new Float32Array(Y);
      const d1 = 12 + Math.floor(rnd() * 10), d2 = d1 * 2 + 5 + Math.floor(rnd() * 8), d3 = d2 + d1 + 9;
      for (let l = 0; l < lines; l++)
        for (let x = 0; x < W; x++) {
          const o = l * W + x;
          let add = 0;
          if (x >= d1) add += (clean[o - d1] - 0.5) * ghosting;
          if (x >= d2) add -= (clean[o - d2] - 0.5) * ghosting * 0.55;
          if (x >= d3 && a.fault === 'ghost') add += (clean[o - d3] - 0.5) * ghosting * 0.3;
          Y[o] += add * 0.8;
        }
    }

    // Per-line timing errors move whole lines sideways; a rolled picture moves them vertically.
    const shift = new Float32Array(lines);
    const rip = new Float32Array(lines); // how much of the line is replaced by noise
    const taped = src === 'vhs' || src === 'camcorder';
    const jitter = (taped ? 0.5 + mood.energy * 1.4 + mood.wear * 0.8 : src === 'broadcast' ? wearNoise * 0.9 : 0.05);
    let wander = 0;
    for (let l = 0; l < lines; l++) {
      wander = wander * 0.9 + (rnd() - 0.5) * jitter;
      shift[l] = wander + (rnd() - 0.5) * jitter * 0.6;
    }
    if (taped) {
      // Head-switching seam along the bottom edge of every tape picture.
      const seam = Math.round(lines * 0.03) + 2;
      for (let l = lines - seam; l < lines; l++) {
        const t = (l - (lines - seam)) / seam;
        shift[l] += 18 + t * 40 + (rnd() - 0.5) * 20;
        rip[l] = 0.35 + rnd() * 0.5;
      }
    }
    const energy = 0.6 + mood.energy * 0.8;
    if (a.fault === 'tracking') {
      const bands = 1 + (mood.wear > 0.6 ? 1 : 0) + (rnd() < 0.4 ? 1 : 0);
      for (let k = 0; k < bands; k++) {
        const at = Math.floor(lines * (0.12 + rnd() * 0.68));
        const tall = Math.floor(lines * (0.04 + rnd() * 0.07));
        const lean = (rnd() < 0.5 ? -1 : 1) * (30 + rnd() * 70) * energy;
        for (let l = at; l < Math.min(lines, at + tall * 3); l++) {
          const t = (l - at) / tall;
          if (t < 1) {
            shift[l] += lean * Math.sin(t * Math.PI) + (rnd() - 0.5) * 26;
            rip[l] = Math.max(rip[l], 0.25 + 0.6 * Math.sin(t * Math.PI) * rnd());
          } else shift[l] += lean * 0.25 * Math.exp(-(t - 1) * 2.2); // the picture swings back
        }
      }
    }
    if (a.fault === 'skew') {
      const lean = (rnd() < 0.5 ? -1 : 1) * (50 + rnd() * 60) * energy;
      const reach = lines * (0.1 + rnd() * 0.08);
      for (let l = 0; l < lines; l++) shift[l] += lean * Math.exp(-l / reach) * (1 + 0.25 * Math.sin(l * 0.9));
    }
    {
      const y2 = new Float32Array(total), i2 = new Float32Array(total), q2 = new Float32Array(total);
      for (let l = 0; l < lines; l++) {
        const from = l;
        const dx = shift[l];
        for (let x = 0; x < W; x++) {
          const o = l * W + x;
          const fx = x - dx;
          const x0 = Math.floor(fx);
          if (x0 < 0 || x0 >= W - 1) { y2[o] = 0.02; continue; }
          const t = fx - x0, s = from * W + x0;
          y2[o] = Y[s] + (Y[s + 1] - Y[s]) * t;
          i2[o] = I[s] + (I[s + 1] - I[s]) * t;
          q2[o] = Q[s] + (Q[s + 1] - Q[s]) * t;
        }
      }
      Y = y2; I = i2; Q = q2;
    }
    await pause();

    // Snow, torn lines, hum, herringbone.
    const humPhase = rnd() * 6.283, herring = 0.33 + rnd() * 0.25, herringLean = 0.5 + rnd() * 1.2;
    const interference = a.fault === 'interference' ? 1 : 0;
    for (let l = 0; l < lines; l++) {
      const torn = rip[l];
      const hum = interference ? 0.2 * Math.pow(0.5 + 0.5 * Math.sin((l / lines) * 6.283 * 1.6 + humPhase), 3) : 0;
      let streak = 0;
      for (let x = 0; x < W; x++) {
        const o = l * W + x;
        const white = rnd() - 0.5;
        streak = streak * 0.55 + white * 0.9; // snow is slightly wider than it is tall
        let y = Y[o] + streak * noise * 2;
        if (torn > 0 && rnd() < torn) { y = mix(y, 0.25 + rnd() * 0.75, 0.85); I[o] *= 0.2; Q[o] *= 0.2; }
        if (interference) {
          y -= hum;
          const wave = Math.sin(x * herring + l * herringLean + 3 * Math.sin(l * 0.06));
          y += wave * 0.075;
          I[o] += wave * 0.06;
        }
        Y[o] = y;
      }
    }
    if (a.fault === 'dropout' || (taped && mood.wear > 0.55)) {
      const drops = Math.round((a.fault === 'dropout' ? 26 : 5) * (0.6 + mood.wear));
      for (let k = 0; k < drops; k++) {
        const l = Math.floor(rnd() * lines), x0 = Math.floor(rnd() * W * 0.9), long = 14 + rnd() * rnd() * 190;
        const dark = rnd() < 0.18;
        for (let x = x0; x < Math.min(W, x0 + long); x++) {
          const fade = Math.pow(1 - (x - x0) / long, 0.6);
          const o = l * W + x;
          Y[o] = mix(Y[o], dark ? 0.03 : 1.05, fade);
          I[o] *= 1 - fade; Q[o] *= 1 - fade;
        }
      }
    }
    // Chroma: tape noise in long streaks, colour dropping out, then the narrow band that smears it.
    if (src !== 'cctv') {
      const chromaNoise = (taped ? 0.05 + wearNoise * 0.16 : noise * 0.5) * (synthetic ? 0.3 : 1);
      for (let l = 0; l < lines; l++) {
        let ni = 0, nq = 0;
        for (let x = 0; x < W; x++) {
          if (x % 12 === 0) { ni = (rnd() - 0.5) * chromaNoise * 2; nq = (rnd() - 0.5) * chromaNoise * 2; }
          const o = l * W + x;
          I[o] += ni; Q[o] += nq;
        }
      }
      if (a.fault === 'colourloss') {
        let on = rnd() < 0.5, left = 0, phase = 0;
        for (let l = 0; l < lines; l++) {
          if (left-- <= 0) { on = !on; left = Math.floor(lines * (0.05 + rnd() * 0.16)); phase = 1; }
          for (let x = 0; x < W; x++) {
            const o = l * W + x;
            if (phase > 0.05) {
              // Losing lock: hue spins along the line, painting rainbow bars.
              const turn = x * 0.045 * phase + l * 0.9;
              const c = Math.cos(turn), s = Math.sin(turn);
              const i = I[o] + 0.16 * phase, q = Q[o];
              I[o] = i * c - q * s; Q[o] = i * s + q * c;
            } else if (!on) { I[o] *= 0.04; Q[o] *= 0.04; }
          }
          phase *= 0.72;
        }
      }
      if (!synthetic) {
        const chromaBlur = taped ? 9 : 4, delay = taped ? 5 : 2;
        for (const plane of [I, Q]) {
          blurRows(plane, W, lines, chromaBlur, scratch);
          blurRows(plane, W, lines, Math.ceil(chromaBlur / 2), scratch);
          if (taped) blurColumns(plane, W, lines, 1, scratch);
          for (let l = 0; l < lines; l++)
            for (let x = W - 1; x >= delay; x--) plane[l * W + x] = plane[l * W + x - delay]; // colour lags the luma
        }
      }
    }
    await pause();

    // --------------------------------------------------------------- overlays
    // Drawn by the recorder or the set, so they are clean and sit on top of the noise.
    const charW = 3; // output pixels per font dot, horizontally
    const put = (l: number, x: number, y: number, i: number, q: number, alpha = 1) => {
      if (l < 0 || l >= lines || x < 0 || x >= W) return;
      const o = l * W + x;
      Y[o] = mix(Y[o], y, alpha); I[o] = mix(I[o], i, alpha); Q[o] = mix(Q[o], q, alpha);
    };
    const bar = (x0: number, l0: number, x1: number, l1: number, y: number, i: number, q: number, alpha = 1) => {
      for (let l = l0; l < l1; l++) for (let x = x0; x < x1; x++) put(l, x, y, i, q, alpha);
    };
    const textWidth = (text: string, scale: number) => text.length * 6 * scale * charW;
    const text = (string: string, x0: number, l0: number, scale: number, ink: readonly [number, number, number], shadow = true) => {
      for (let pass = shadow ? 0 : 1; pass < 2; pass++)
        for (let c = 0; c < string.length; c++) {
          const glyph = FONT[string[c]];
          if (!glyph) continue;
          for (let gx = 0; gx < 5; gx++)
            for (let gy = 0; gy < 7; gy++) {
              if (!((glyph[gx] >> gy) & 1)) continue;
              const px = x0 + (c * 6 + gx) * scale * charW;
              const pl = l0 + gy * scale;
              if (pass) {
                for (let dl = 0; dl < scale; dl++)
                  for (let dx = 0; dx < scale * charW; dx++) put(pl + dl, px + dx, ink[0], ink[1], ink[2]);
              } else {
                // A black keyline all round, as character generators key their letters.
                for (let dl = -1; dl < scale + 1; dl++)
                  for (let dx = -charW; dx < (scale + 1) * charW; dx++) put(pl + dl, px + dx, 0.03, 0, 0);
              }
            }
        }
    };
    const WHITE = [0.95, 0, 0] as const, GREEN = [0.72, -0.2, -0.36] as const, RED = [0.4, 0.5, 0.18] as const, ORANGE = [0.7, 0.38, -0.05] as const;
    const margin = Math.round(W * 0.07), top = Math.round(lines * 0.07), bottom = lines - Math.round(lines * 0.07) - 14;
    // Clock from the light: dawn is before six, dusk after seven. The year is the tape's age.
    const hour = Math.floor(mix(4, 21, mood.daylight)) % 24;
    const clock = `${two(hour)}:${two(rnd() * 60)}:${two(rnd() * 60)}`;
    const year = Math.floor(mix(2004, 1984, mood.wear) + rnd() * 3);
    const date = `${two(1 + rnd() * 12)}-${two(1 + rnd() * 28)}-${two(year % 100)}`;
    const camera = 1 + Math.floor(rnd() * 16);

    if (a.overlay === 'timestamp') {
      const head = `CAM ${two(camera)}`;
      bar(margin - 9, top - 3, margin + textWidth(head, 2) + 3, top + 17, 0.02, 0, 0);
      text(head, margin, top, 2, WHITE, false);
      const foot = `${date} ${clock}`;
      const fx = W - margin - textWidth(foot, 2);
      bar(fx - 9, bottom - 3, W - margin + 3, bottom + 17, 0.02, 0, 0);
      text(foot, fx, bottom, 2, WHITE, false);
      notes.push(`camera ${camera}, ${clock}`);
    } else if (a.overlay === 'play') {
      text('PLAY >', margin, top, 2, WHITE);
      const counter = `SP ${Math.floor(rnd() * 2)}:${two(rnd() * 60)}:${two(rnd() * 60)}`;
      text(counter, W - margin - textWidth(counter, 2), bottom, 2, WHITE);
    } else if (a.overlay === 'rec') {
      text('*', margin, top, 2, RED, false);
      text('REC', margin + textWidth('* ', 2), top, 2, WHITE);
      const battery = `${Math.floor(rnd() * 2)}:${two(rnd() * 60)}`;
      text(battery, W - margin - textWidth(battery, 2), top, 2, WHITE);
      const stamp = `${date.replace(/-/g, '.')}`;
      text(stamp, W - margin - textWidth(stamp, 2), bottom, 2, ORANGE);
    } else if (a.overlay === 'channel') {
      const number = `CH ${two(2 + rnd() * 60)}`;
      text(number, W - margin - textWidth(number, 3), top, 3, GREEN);
    } else if (a.overlay === 'tracking') {
      // One box per placed thing, from the identity channel.
      const boxes = new Map<number, [number, number, number, number]>();
      for (let l = 0; l < lines; l++)
        for (let x = 0; x < W; x += 2) {
          const id = ident[(l * linePx + 1) * N + x];
          if (id < 3) continue;
          const box = boxes.get(id);
          if (!box) boxes.set(id, [x, l, x, l]);
          else { if (x < box[0]) box[0] = x; if (x > box[2]) box[2] = x; if (l < box[1]) box[1] = l; if (l > box[3]) box[3] = l; }
        }
      let index = 0;
      for (const [, [bx0, bl0, bx1, bl1]] of [...boxes].sort((p, q) => p[0] - q[0])) {
        if (bx1 - bx0 < 12 || bl1 - bl0 < 4) continue;
        index++;
        const x0 = Math.max(2, bx0 - 8), x1 = Math.min(W - 3, bx1 + 8), l0 = Math.max(1, bl0 - 3), l1 = Math.min(lines - 2, bl1 + 3);
        const arm = Math.min(40, (x1 - x0) / 3), armL = Math.min(13, Math.floor((l1 - l0) / 3));
        for (let x = x0; x <= x1; x++) {
          const corner = x - x0 < arm || x1 - x < arm;
          if (corner || (x >> 2) % 3 === 0) { put(l0, x, GREEN[0], GREEN[1], GREEN[2]); put(l1, x, GREEN[0], GREEN[1], GREEN[2]); }
        }
        for (let l = l0; l <= l1; l++) {
          const corner = l - l0 < armL || l1 - l < armL;
          if (corner || l % 3 === 0) for (let k = 0; k < 3; k++) { put(l, x0 + k, GREEN[0], GREEN[1], GREEN[2]); put(l, x1 - k, GREEN[0], GREEN[1], GREEN[2]); }
        }
        const label = `ID ${two(index)}`;
        const lx = Math.min(W - textWidth(label, 1) - 4, x0), ll = l0 > 12 ? l0 - 10 : l1 + 3;
        bar(lx, ll - 1, lx + textWidth(label, 1) + 3, ll + 8, GREEN[0], GREEN[1], GREEN[2]);
        text(label, lx + 3, ll, 1, [0.02, 0, 0], false);
      }
      text('MOTION', margin, top, 2, RED);
      text(clock, W - margin - textWidth(clock, 2), top, 2, WHITE);
      notes.push(`${index} tracked`);
    } else if (a.overlay === 'caption') {
      const letters = 'KWBCRTXQZNLV';
      const call = (rnd() < 0.5 ? 'K' : 'W') + [0, 1, 2].map(() => letters[Math.floor(rnd() * letters.length)]).join('');
      const small = `${1 + Math.floor(rnd() * 4)}:${two(rnd() * 60)} AM`;
      const l0 = Math.round(lines * 0.78), l1 = l0 + 24;
      // Band colour follows the mood: cold blue to warm maroon.
      const bi = mix(-0.22, 0.3, mood.warmth), bq = mix(0.2, 0.05, mood.warmth);
      bar(0, l0, W, l1, 0.26, bi, bq, 0.86);
      bar(0, l0, W, l0 + 1, 0.9, 0, 0, 0.9);
      bar(0, l1, W, l1 + 2, 0.75, 0.3, -0.1, 0.9);
      text(`${call} ${two(2 + rnd() * 50)}`, margin, l0 + 5, 2, WHITE);
      text(small, W - margin - textWidth(small, 2), l0 + 5, 2, [0.85, 0.2, -0.2]);
      notes.push(`station ${call}`);
    }

    // Vertical hold is the set's own fault, so captions and counters roll with the picture.
    if (a.fault === 'roll') {
      const rollBar = Math.round(lines * 0.075), span = lines + rollBar;
      const rollAt = Math.floor(lines * (0.22 + rnd() * 0.5));
      const y2 = new Float32Array(total), i2 = new Float32Array(total), q2 = new Float32Array(total);
      for (let l = 0; l < lines; l++) {
        const p = (l - rollAt + span) % span;
        const lean = Math.round(5 * Math.sin(l * 0.05));
        for (let x = 0; x < W; x++) {
          const o = l * W + x;
          if (p < rollBar) {
            // The blanking interval: black, with the grey sync block and its hammerhead.
            const t = p / rollBar;
            y2[o] = t > 0.3 && t < 0.7 && x > W * 0.06 && x < W * 0.62 ? 0.22 + 0.08 * Math.sin(x * 0.7) : 0.01;
          } else {
            const sx = x - lean;
            if (sx < 0 || sx >= W) continue;
            const s = (p - rollBar) * W + sx;
            y2[o] = Y[s]; i2[o] = I[s]; q2[o] = Q[s];
          }
        }
      }
      Y = y2; I = i2; Q = q2;
    }

    // ------------------------------------------------------------------- tube
    const mono = a.phosphor === 'white' || a.phosphor === 'green' || a.phosphor === 'amber';
    const tint = phosphorTint(mono ? a.phosphor : 'white', context.palette);
    // The white point drifts with the mood: cold sets are blue, warm sets are yellowed.
    const whiteR = mix(0.93, 1.05, mood.warmth), whiteB = mix(1.1, 0.88, mood.warmth);
    const gunR = a.phosphor === 'faded' ? 0.7 : a.phosphor === 'hot' ? 1.12 : 1;
    const drive = a.phosphor === 'hot' ? 1.55 : a.phosphor === 'faded' ? 0.7 : 1;

    const curve = a.tube === 'curved' ? 0.085 : a.tube === 'portable' ? 0.13 : a.tube === 'photo' ? 0.06 : 0;
    const inset = a.tube === 'curved' ? 1.035 : a.tube === 'portable' ? 1.11 : a.tube === 'photo' ? 1.12 : 1;
    const corner = a.tube === 'curved' ? 0.075 : a.tube === 'portable' ? 0.16 : a.tube === 'photo' ? 0.06 : 0;
    const keystone = a.tube === 'photo' ? (rnd() - 0.5) * 0.12 : 0;
    const tilt = a.tube === 'photo' ? (rnd() - 0.5) * 0.05 : 0;
    const sigma = mix(0.5, 0.17, a.scan);
    // Mean of the beam profile across one line, so thinner beams are driven harder.
    let beamMean = 0;
    for (let k = 0; k < 16; k++) { const d = (k + 0.5) / 16 - 0.5; beamMean += Math.exp(-(d * d) / (2 * sigma * sigma)) / 16; }
    const beamGain = 1 / mix(1, beamMean, 0.7);
    // The beam is a soft-edged line that fattens where it is driven hard: tabulated by
    // distance from the line centre and by drive.
    const BEAM = 33;
    const beamTable = new Float32Array(BEAM * BEAM);
    for (let di = 0; di < BEAM; di++)
      for (let pi = 0; pi < BEAM; pi++) {
        const d = (di / (BEAM - 1)) * 0.5, width = sigma * (1 + 0.4 * (pi / (BEAM - 1)));
        beamTable[di * BEAM + pi] = Math.exp(-(d * d) / (2 * width * width)) * beamGain;
      }
    const maskKind = mono ? 'smooth' : a.mask;
    const maskDark = maskKind === 'coarse' ? 0.16 : 0.26;
    const pitch = maskKind === 'coarse' ? 6 : 3;
    const maskGain = maskKind === 'smooth' ? 1 : (1 / mix(1, (1 + 2 * maskDark) / 3, 0.8)) * (maskKind === 'slot' || maskKind === 'dots' ? 1.12 : 1);
    const converge = mono || synthetic ? 0.15 : 0.5 + mood.wear * 1.6;
    const GAMMA = 2048;
    const decode = new Float32Array(GAMMA + 1);
    for (let k = 0; k <= GAMMA; k++) decode[k] = Math.pow(k / GAMMA, 2.2);
    const lin = (value: number) => decode[value <= 0 ? 0 : value >= 1 ? GAMMA : (value * GAMMA) | 0];

    const eR = new Float32Array(count), eG = new Float32Array(count), eB = new Float32Array(count);
    const glass = new Float32Array(count); // 1 on the picture, 0 on the bezel
    const sample = (plane: Float32Array, line: number, fx: number) => {
      if (fx < 0) fx = 0; else if (fx > W - 1.001) fx = W - 1.001;
      const x0 = fx | 0, o = line * W + x0;
      return plane[o] + (plane[o + 1] - plane[o]) * (fx - x0);
    };
    for (let y = 0; y < N; y++) {
      if (y % 240 === 0) await pause();
      const v0 = ((y + 0.5) / N) * 2 - 1;
      for (let x = 0; x < N; x++) {
        const o = y * N + x;
        const u0 = ((x + 0.5) / N) * 2 - 1;
        let u = (u0 + tilt * v0) * inset * (1 + keystone * v0), v = v0 * inset;
        const su = u * (1 + curve * v * v), sv = v * (1 + curve * u * u);
        u = su; v = sv;
        // Rounded-corner tube face with a soft edge.
        const ax = u < 0 ? -u : u, ay = v < 0 ? -v : v;
        let face = 1;
        if (inset !== 1) {
          let inside = Math.min(1 - ax, 1 - ay);
          if (corner > 0 && ax > 1 - corner && ay > 1 - corner) inside = corner - Math.hypot(ax - (1 - corner), ay - (1 - corner));
          face = clamp01(inside * N * 0.25 + 0.5);
        }
        glass[o] = face;
        if (face <= 0) continue;
        const fy = clamp01(v * 0.5 + 0.5) * (lines - 0.001);
        const line = fy | 0;
        const d = Math.abs(fy - line - 0.5);
        const fx = (u * 0.5 + 0.5) * W - 0.5;
        const yy = sample(Y, line, fx);
        let r: number, g: number, b: number;
        if (mono) {
          const level = lin(yy);
          const core = level * level * 0.35; // the hottest phosphor burns toward white
          r = level * tint[0] + core;
          g = level * tint[1] + core;
          b = level * tint[2] + core;
        } else {
          const shiftC = converge * u;
          const yr = sample(Y, line, fx - shiftC), yb = sample(Y, line, fx + shiftC);
          const ii = sample(I, line, fx) * drive, qq = sample(Q, line, fx) * drive;
          r = lin(yr + 0.956 * ii + 0.621 * qq) * whiteR * gunR;
          g = lin(yy - 0.272 * ii - 0.647 * qq);
          b = lin(yb - 1.106 * ii + 1.703 * qq) * whiteB;
        }
        const peak = r > g ? (r > b ? r : b) : g > b ? g : b;
        const beam = beamTable[((d * 2 * (BEAM - 1)) | 0) * BEAM + ((peak >= 1 ? 1 : peak) * (BEAM - 1) | 0)];
        r *= beam; g *= beam; b *= beam;
        // The mask: only its own colour of phosphor lights under each gun.
        if (maskKind !== 'smooth') {
          let mr = maskDark, mg = maskDark, mb = maskDark, gap = 1;
          if (maskKind === 'grille' || maskKind === 'coarse') {
            const p = (((x % pitch) * 3) / pitch) | 0;
            if (p === 0) mr = 1; else if (p === 1) mg = 1; else mb = 1;
            if (maskKind === 'coarse' && x % 6 === 5) gap = 0.55;
          } else if (maskKind === 'slot') {
            const column = (x / 3) | 0;
            const p = x % 3;
            if (p === 0) mr = 1; else if (p === 1) mg = 1; else mb = 1;
            if ((y + (column & 1) * 3) % 6 === 0) gap = 0.3;
          } else {
            const row = y >> 1;
            const p = (x + (row & 1) * 2) % 3;
            if (p === 0) mr = 1; else if (p === 1) mg = 1; else mb = 1;
            gap = (row & 1 ? 0.78 : 1) * (p === 2 && (y & 1) ? 0.7 : 1);
          }
          const k = gap * maskGain;
          r *= mr * k; g *= mg * k; b *= mb * k;
        }
        eR[o] = r * face; eG[o] = g * face; eB[o] = b * face;
      }
    }

    // Bloom and halation: light scattering in the glass, from a quarter-size blur.
    const B = N >> 2;
    const bloom = [new Float32Array(B * B), new Float32Array(B * B), new Float32Array(B * B)];
    [eR, eG, eB].forEach((plane, channel) => {
      const small = bloom[channel];
      for (let y = 0; y < B; y++)
        for (let x = 0; x < B; x++) {
          let sum = 0;
          for (let dy = 0; dy < 4; dy++) { const row = (y * 4 + dy) * N + x * 4; sum += plane[row] + plane[row + 1] + plane[row + 2] + plane[row + 3]; }
          small[y * B + x] = sum / 16;
        }
    });
    const wideBloom = bloom.map((plane) => new Float32Array(plane));
    const smallScratch = new Float32Array(B);
    for (const plane of bloom) for (let pass = 0; pass < 2; pass++) { blurRows(plane, B, B, 2, smallScratch); blurColumns(plane, B, B, 2, smallScratch); }
    for (const plane of wideBloom) for (let pass = 0; pass < 3; pass++) { blurRows(plane, B, B, 9, smallScratch); blurColumns(plane, B, B, 9, smallScratch); }
    await pause();

    const glow = 0.05 + a.bloom * a.bloom * 0.8 + (a.phosphor === 'hot' ? 0.12 : 0);
    const haze = 0.03 + a.bloom * a.bloom * 0.3;
    const photo = a.tube === 'photo';
    const glare = (photo ? 0.3 : a.tube === 'flat' ? 0.025 : 0.09) * mix(0.5, 1.2, 1 - Math.abs(mood.daylight - 0.5) * 2);
    const glareX = 0.5 + capture.light[0] * 0.33, glareY = 0.42 + capture.light[1] * 0.3;
    const vignette = a.tube === 'portable' ? 0.55 : a.tube === 'flat' ? 0.14 : 0.34;
    const refreshAt = rnd(), moireA = 0.06 + rnd() * 0.05, moireB = rnd() * 6.283;
    const ambient = photo ? 0.02 : 0.004;
    const grain = seeded((context.seed ^ 0x9e3779b1) >>> 0);
    const pixels = new Uint8ClampedArray(count * 4);
    // Encode with a shoulder: highlights roll off instead of clipping, as phosphor saturates.
    const ENCODE = 4096, TOP = 1.6;
    const encodeTable = new Uint8ClampedArray(ENCODE + 1);
    for (let k = 0; k <= ENCODE; k++) {
      const value = (k / ENCODE) * TOP;
      const rolled = value < 0.55 ? value : 0.55 + (1 - Math.exp(-(value - 0.55) * 2.4)) * 0.45;
      encodeTable[k] = 255 * Math.pow(rolled, 1 / 2.2);
    }
    const encode = (value: number) => encodeTable[value <= 0 ? 0 : value >= TOP ? ENCODE : ((value / TOP) * ENCODE) | 0];
    const glareColumn = new Float32Array(N), glareRow = new Float32Array(N);
    for (let k = 0; k < N; k++) {
      const gx = ((k + 0.5) / N - glareX) / 0.24, gy = ((k + 0.5) / N - glareY) / (photo ? 0.3 : 0.2);
      glareColumn[k] = Math.exp(-gx * gx);
      glareRow[k] = Math.exp(-gy * gy) * glare;
    }
    const level = 1 / (1 + glow * 0.45);

    for (let y = 0; y < N; y++) {
      if (y % 240 === 0) await pause();
      const v = (y + 0.5) / N;
      const by = Math.min(B - 1.001, Math.max(0, y / 4 - 0.5));
      const y0 = by | 0, ty = by - y0;
      const band = Math.abs(((v - refreshAt + 1.5) % 1) - 0.5);
      const dip = photo ? 1 - 0.38 * Math.exp(-(band * band) / 0.004) : 1;
      for (let x = 0; x < N; x++) {
        const o = y * N + x;
        const u = (x + 0.5) / N;
        // Bilinear read of the quarter-size bloom.
        const bx = Math.min(B - 1.001, Math.max(0, x / 4 - 0.5));
        const x0 = bx | 0, tx = bx - x0;
        const at = y0 * B + x0;
        const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
        const nearR = bloom[0][at] * w00 + bloom[0][at + 1] * w10 + bloom[0][at + B] * w01 + bloom[0][at + B + 1] * w11;
        const nearG = bloom[1][at] * w00 + bloom[1][at + 1] * w10 + bloom[1][at + B] * w01 + bloom[1][at + B + 1] * w11;
        const nearB = bloom[2][at] * w00 + bloom[2][at + 1] * w10 + bloom[2][at + B] * w01 + bloom[2][at + B + 1] * w11;
        const farR = wideBloom[0][at], farG = wideBloom[1][at], farB = wideBloom[2][at];
        const face = glass[o];
        const e2 = ((u - 0.5) * (u - 0.5) + (v - 0.5) * (v - 0.5)) * 2;
        const shade = (1 - vignette * e2 * (0.4 + 0.6 * e2)) * level;
        let r = (eR[o] + nearR * glow) * shade + farR * haze;
        let g = (eG[o] + nearG * glow) * shade + farG * haze;
        let b = (eB[o] + nearB * glow) * shade + farB * haze;

        let shine = glareColumn[x] * glareRow[y];
        if (photo) {
          // A camera pointed at a tube: beat patterns with its own sensor and a dark band
          // where the shutter caught the beam between fields.
          const beat = (1 + moireA * Math.sin(x * 0.11 + y * 0.9 * (0.02 + 0.03 * u) + moireB + 5 * Math.sin(y * 0.012))) * dip;
          const k = beat * face + (1 - face);
          r *= k; g *= k; b *= k;
          // A window, with its mullions, bent by the glass.
          const wx = (u - glareX) / 0.16 + (v - 0.5) * (v - 0.5) * 0.6, wy = (v - glareY) / 0.2;
          const awx = wx < 0 ? -wx : wx, awy = wy < 0 ? -wy : wy;
          if (awx < 1 && awy < 1 && awx > 0.05 && awy > 0.05) shine += glare * 0.45 * (1 - 0.4 * awy);
        }
        // The room on the glass: a soft reflection of the key light, and a little ambient grey.
        r += (shine * 0.92 + ambient) * face;
        g += (shine * 0.96 + ambient) * face;
        b += (shine + ambient * 1.2) * face;
        if (face < 1) {
          // Bezel: dark plastic that catches a little of the screen's light.
          const spill = 0.05;
          const plastic = 0.006 + 0.008 * (1 - v) + (grain() - 0.5) * 0.003;
          r = mix(plastic + farR * spill, r, face);
          g = mix(plastic + farG * spill, g, face);
          b = mix(plastic * 1.1 + farB * spill, b, face);
        }
        const p = o * 4;
        pixels[p] = encode(r);
        pixels[p + 1] = encode(g);
        pixels[p + 2] = encode(b);
        pixels[p + 3] = 255;
      }
    }

    const SOURCE = { broadcast: 'off-air broadcast', vhs: 'VHS playback', cctv: night > 0.5 ? 'infrared security feed' : 'security feed', arcade: 'arcade picture', terminal: 'computer display', camcorder: 'camcorder tape' } as const;
    const TUBE = { flat: 'flat', curved: 'curved', portable: 'portable', photo: 'photographed' } as const;
    return {
      pixels,
      notes: [
        `${SOURCE[src]} on a ${TUBE[a.tube]} ${mono ? `${a.phosphor} phosphor` : `${a.phosphor} ${maskKind === 'smooth' ? '' : `${maskKind} mask `}colour`} tube`.replace(/\s+/g, ' '),
        `${lines} lines${a.fault === 'steady' ? '' : `, fault: ${a.fault}`}`,
        ...notes,
      ],
    };
  },
});
