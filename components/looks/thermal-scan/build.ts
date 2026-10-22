import { choice, clamp01, defineLook, mix, score, seeded } from '@conjure/kit';

type Rgb = [number, number, number];
const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const RAMPS = {
  ironbow: ['#000004', '#160a4a', '#4f0f86', '#a51f7c', '#e4532c', '#fbae1c', '#fff9c8'],
  phosphor: ['#000300', '#03240b', '#0d5f1a', '#35b535', '#a8fb8e', '#efffec'],
  copper: ['#040200', '#351604', '#83450b', '#d08b20', '#ffdc82', '#fffae2'],
  film: ['#01030a', '#0b1a30', '#2b4f72', '#789fbe', '#cfe3f0', '#ffffff'],
  turbo: ['#3b1a6e', '#4669e0', '#1ccfd3', '#62fc6b', '#d2e935', '#fe9b2d', '#e2400a', '#b01a10'],
  white: ['#000000', '#3a3a3a', '#8c8c8c', '#d6d6d6', '#ffffff'],
  rainbow: ['#00003c', '#0022d0', '#00b4e0', '#12d84a', '#f4e800', '#ff7a00', '#ff0000', '#ffffff'],
  amber: ['#040100', '#3a1a00', '#a25600', '#ffae00', '#ffe7a2'],
  arctic: ['#00030a', '#05284c', '#0a6aa2', '#3ccbe6', '#e8ffff'],
  blood: ['#050000', '#3a0000', '#960a0a', '#ff391c', '#ffd0b0'],
} as const;
const NATIVE = { thermal: 'ironbow', night: 'phosphor', sonar: 'copper', xray: 'film', lidar: 'turbo' } as const;

function lutOf(stops: readonly string[]): Uint8Array {
  const lut = new Uint8Array(768);
  const c = stops.map(hex);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (c.length - 1);
    const k = Math.min(c.length - 2, Math.floor(t));
    for (let j = 0; j < 3; j++) lut[i * 3 + j] = Math.round(mix(c[k][j], c[k + 1][j], t - k));
  }
  return lut;
}

function blur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return src;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const span = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / span;
      sum += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / span;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export default defineLook({
  questions: {
    instrument: choice('Which instrument is looking at the scene?', {
      thermal: 'A thermal camera: soft false-colour heat, warm bodies glowing against cold ground, a temperature scale.',
      night: 'A night-vision tube: grainy amplified starlight in glowing phosphor, bright things blooming, sparkle in the dark.',
      sonar: 'An imaging sonar: speckled acoustic returns out of black water, hard echoes and long acoustic shadows.',
      xray: 'An x-ray negative: objects as pale translucent shells with bright edges on black film, clinical and exposing.',
      lidar: 'A lidar point cloud: the scene dissolved into coloured dots along scan rings on a black void, machine-precise.',
    }),
    palette: choice('How is the signal coloured?', {
      native: "The instrument's own classic colours: ironbow heat, green phosphor, copper sonar, blue film, rainbow range.",
      white: 'White-hot greyscale: stark, military, unsentimental.',
      rainbow: 'A full medical or weather-radar rainbow: garish, analytical, every level a different colour.',
      amber: 'Monochrome amber, like an old terminal or a submarine console.',
      arctic: 'Cold cyan and deep blue: clinical, underwater, lonely.',
      blood: 'Black and red only: darkroom, alarm, predator.',
    }),
    signal: choice('What gives the strongest signal on the instrument?', {
      bodies: 'The things themselves: warm bodies standing out from cold empty ground.',
      sunlit: 'Whatever the light has been falling on: baked surfaces bright, shadows cold and dead.',
      near: 'Whatever is closest: the signal fades with range until the far distance is lost.',
      quarry: 'One thing only: the main subject burns bright and everything else is barely there. Something is being hunted or found.',
      cores: 'The hearts of things: surfaces facing the instrument glow from within and their outlines cool away, like living bodies.',
      even: 'Nothing in particular: a flat, even survey with no favourite.',
    }),
    overlay: choice('What does the instrument draw over the picture?', {
      none: 'Nothing: the bare sensor image.',
      spot: 'A centre spot meter with a reading and a colour scale down the side, like a handheld inspection camera.',
      reticle: 'A full aiming reticle with range ticks: a weapon sight or a telescope.',
      track: 'Brackets locked around each object with a tag and a reading: tracking, surveillance, targets.',
      survey: 'Edge rulers, grid crosses and a scale bar: a mapped and measured survey.',
      clinical: 'A side marker, an identity plate and a ruler: a medical or forensic record.',
    }),
    frame: choice('How is the image presented?', {
      screen: 'Full screen on a modern display, edge to edge.',
      scope: 'Through a round eyepiece: a bright circle in darkness.',
      crt: 'On an old curved tube monitor with scan lines and a dark bezel.',
      fan: 'As a fan-shaped sector sweeping out from the instrument, with range arcs.',
      print: 'Printed on pale thermal paper in dark dots, like a receipt from the machine.',
      film: 'As a sheet of film clipped to a lightbox, with a notched border.',
    }),
    fault: choice('What is wrong with the device or the recording?', {
      none: 'Nothing: it is working as designed.',
      tearing: 'The video signal tears and rolls: interlaced lines, a band of the picture slipped sideways.',
      dead: 'The sensor is damaged: dead columns, stuck bright pixels, striped gain.',
      ghost: 'The image lags: a doubled ghost trails behind everything, as if it just moved.',
      dropout: 'Data is missing: blocks and rows of the picture never arrived.',
      overload: 'The sensor is overloaded: bright areas flare, bleed and wash out their surroundings.',
    }),
    resolution: score('How fine is the sensor?', ['A few chunky cells', 'Coarse', 'Ordinary', 'Fine', 'Laboratory sharp']),
    noise: score('How noisy is the signal?', ['Clean', 'A little grain', 'Grainy', 'Rough', 'Barely readable through the noise']),
    gain: score('How hard is the gain pushed?', ['Flat and faint', 'Soft', 'Balanced', 'Punchy', 'Crushed to black and blown to white']),
  },

  async apply(capture, a, context, signal) {
    const n = capture.size;
    const N = n * n;
    const rng = seeded((context.seed ^ 0x7e57ab1e) >>> 0);
    const { wear, energy, warmth } = context.mood;
    const inst = a.instrument;

    // ---- channels -------------------------------------------------------------------------
    const L = new Float32Array(N);
    const D = new Float32Array(N);
    const Z = new Float32Array(N);
    const NZ = new Float32Array(N);
    const ID = new Uint8Array(N);
    const boxes = new Map<number, { x0: number; y0: number; x1: number; y1: number; count: number }>();
    let dmax = 0.001;
    let zmin = 1;
    let zmax = 0;
    let gmax = 0;
    for (let i = 0; i < N; i++) {
      const o = i * 4;
      L[i] = (capture.color[o] * 0.2126 + capture.color[o + 1] * 0.7152 + capture.color[o + 2] * 0.0722) / 255;
      D[i] = (capture.diffuse[o] + capture.diffuse[o + 1] + capture.diffuse[o + 2]) / 765;
      NZ[i] = clamp01(capture.normal[o + 2] / 127.5 - 1);
      const id = (ID[i] = capture.identity[o]);
      const z = (Z[i] = (capture.depth[o] * 65536 + capture.depth[o + 1] * 256 + capture.depth[o + 2]) / 16777215);
      if (id > 0 && D[i] > dmax) dmax = D[i];
      if (id === 1 && z > gmax) gmax = z;
      if (id >= 2) {
        if (z < zmin) zmin = z;
        if (z > zmax) zmax = z;
        const x = i % n;
        const y = (i / n) | 0;
        const b = boxes.get(id);
        if (!b) boxes.set(id, { x0: x, y0: y, x1: x, y1: y, count: 1 });
        else {
          if (x < b.x0) b.x0 = x;
          if (x > b.x1) b.x1 = x;
          if (y > b.y1) b.y1 = y;
          b.count++;
        }
      }
    }
    if (zmax <= zmin) {
      zmin = 0;
      zmax = Math.max(gmax, 0.001);
    }
    const zspan = Math.max(1e-5, zmax - zmin);
    for (let i = 0; i < N; i++) {
      D[i] = Math.min(1, D[i] / dmax);
      Z[i] = ID[i] === 0 ? 1 : clamp01(0.12 + 0.6 * ((Z[i] - zmin) / zspan));
    }
    const heat = Array.from({ length: 256 }, () => rng());
    const hero = boxes.size ? Math.min(...boxes.keys()) : 2;

    const emphasis = (i: number): number => {
      const id = ID[i];
      switch (a.signal) {
        case 'bodies':
          return id >= 2 ? 0.72 + 0.28 * heat[id] : id === 1 ? 0.14 + 0.12 * D[i] : 0.04;
        case 'sunlit':
          return id === 0 ? 0.05 : 0.12 + 0.88 * D[i] * D[i];
        case 'near':
          return id === 0 ? 0.02 : Math.pow(1 - Z[i], 1.6) * 1.25;
        case 'quarry':
          return id === hero ? 1 : id >= 2 ? 0.26 : id === 1 ? 0.12 + 0.05 * D[i] : 0.03;
        case 'cores':
          return id >= 2 ? 0.2 + 0.8 * Math.pow(NZ[i], 1.6) : id === 1 ? 0.16 : 0.04;
        default:
          return id === 0 ? 0.08 : 0.6;
      }
    };

    // ---- the instrument's raw response ------------------------------------------------------
    let V: Float32Array = new Float32Array(N); // brightness of the signal
    let H: Float32Array | null = null; // lidar only: colour by range, separate from brightness
    const cell = Math.max(1, Math.round(mix(inst === 'thermal' ? 11 : 8, inst === 'thermal' ? 3 : 1, a.resolution)));
    const noiseAmp = mix(0.012, 0.3, a.noise) + energy * 0.03;

    if (inst === 'lidar') {
      H = new Float32Array(N);
      const sp = Math.round(mix(9, 3, a.resolution));
      const q = Math.log(1 + mix(0.11, 0.035, a.resolution));
      const cx = n / 2;
      const cy = n * 1.12;
      const rowJit = Array.from({ length: n }, () => Math.floor(rng() * 3));
      const jitter = a.noise * 2.5;
      for (let y = 0; y < n; y++) {
        if (y % 360 === 0) {
          signal.throwIfAborted();
          await pause();
        }
        for (let x = 0; x < n; x++) {
          const i = y * n + x;
          const id = ID[i];
          if (id === 0) {
            if (rng() < 0.00004 + a.noise * 0.0012) {
              V[i] = 0.5 + rng() * 0.5;
              H[i] = rng();
            }
            continue;
          }
          let hit = false;
          if (id === 1) {
            const dx = x - cx;
            const dy = (y - cy) / 0.5;
            const rr = Math.hypot(dx, dy);
            const u = Math.log(rr / 40) / q;
            const off = Math.abs(u - Math.round(u)) * rr * q * 0.6;
            const along = Math.atan2(dx, -dy) * rr;
            hit = off < 0.75 && ((along / 3) | 0) % 2 === 0 && D[i] > 0.42;
          } else {
            const yy = y + (jitter > 0.3 ? Math.round((heat[(x >> 3) & 255] - 0.5) * jitter) : 0);
            hit = yy % sp === 0 && (x + rowJit[y]) % 3 !== 2 && rng() < 0.25 + NZ[i] * 1.6;
            // silhouettes: a thing's outline always returns
            if (!hit && x + 1 < n && y + 1 < n && (ID[i + 1] !== id || ID[i + n] !== id)) hit = rng() < 0.55;
          }
          if (!hit || rng() < a.noise * 0.3) continue;
          V[i] = clamp01((0.5 + 0.5 * D[i]) * (0.45 + 0.75 * emphasis(i)) + 0.2);
          H[i] = clamp01(0.75 * (1 - Z[i]) + 0.3 * (1 - y / n) + (rng() - 0.5) * a.noise * 0.2);
        }
      }
      // fatten points a little and give them a glow, carrying their colour with them
      const fat = new Float32Array(N);
      const hue = new Float32Array(N);
      for (let i = 0; i < N - n - 1; i++) {
        if (V[i] <= 0) continue;
        for (const j of sp > 5 ? [i, i + 1, i + n, i + n + 1] : [i, i + 1]) {
          if (V[i] > fat[j]) {
            fat[j] = V[i];
            hue[j] = H[i];
          }
        }
      }
      const glow = blur(fat, n, n, 2);
      const hueGlow = blur(hue, n, n, 2);
      for (let i = 0; i < N; i++) {
        if (fat[i] <= 0 && glow[i] > 0.001) hue[i] = Math.min(1, hueGlow[i] / Math.max(glow[i], 0.05));
        fat[i] = Math.min(1, fat[i] + glow[i] * 0.9);
      }
      V = fat;
      H = hue;
      const contrast = mix(0.7, 1.9, a.gain);
      for (let i = 0; i < N; i++) V[i] = clamp01(V[i] * contrast);
    } else {
      // sample the response on the sensor's own grid
      const cw = Math.ceil(n / cell);
      let S: Float32Array = new Float32Array(cw * cw);
      const rowGain = Array.from({ length: cw }, () => 1 + (rng() - 0.5) * 0.22);
      for (let gy = 0; gy < cw; gy++) {
        if (gy % 180 === 0) {
          signal.throwIfAborted();
          await pause();
        }
        for (let gx = 0; gx < cw; gx++) {
          let sum = 0;
          let count = 0;
          for (let y = gy * cell; y < Math.min(n, gy * cell + cell); y++)
            for (let x = gx * cell; x < Math.min(n, gx * cell + cell); x++) {
              const i = y * n + x;
              const id = ID[i];
              const e = emphasis(i);
              let v: number;
              if (inst === 'thermal') {
                v = e * (0.78 + 0.22 * NZ[i]) + (id > 0 ? (L[i] - 0.5) * 0.14 : 0);
              } else if (inst === 'night') {
                const lum = id === 0 ? 0.1 + 0.08 * (1 - y / n) : Math.pow(L[i] * 0.55 + D[i] * 0.45, 0.85);
                v = lum * (0.4 + 0.9 * e);
              } else if (inst === 'sonar') {
                const echo = id === 0 ? 0.015 : id === 1 ? 0.06 + 0.3 * D[i] * D[i] : 0.12 + 0.88 * D[i] * (0.55 + 0.45 * (1 - NZ[i]));
                v = echo * (0.45 + 0.85 * e);
              } else {
                const dense = id === 0 ? 0 : id === 1 ? 0.07 + 0.04 * D[i] : 0.2 + 0.62 * Math.pow(1 - NZ[i], 1.3) + (1 - L[i]) * 0.22;
                v = dense * (0.5 + 0.7 * e);
              }
              sum += v;
              count++;
            }
          S[gy * cw + gx] = count ? sum / count : 0;
        }
      }
      if (inst === 'thermal') S = blur(S, cw, cw, cell <= 4 ? 2 : 1);
      if (inst === 'xray' && cell <= 3) S = blur(S, cw, cw, 1);

      // auto-range like a real instrument, then the operator's gain
      const histogram = new Uint32Array(512);
      for (let i = 0; i < S.length; i++) histogram[Math.min(511, Math.max(0, (S[i] * 400) | 0))]++;
      let lo = 0;
      let hi = 511;
      for (let acc = 0; lo < 511 && (acc += histogram[lo]) < S.length * 0.01; lo++);
      for (let acc = 0; hi > lo + 1 && (acc += histogram[hi]) < S.length * 0.003; hi--);
      const contrast = mix(0.62, 2.6, a.gain);
      const lift = inst === 'thermal' ? (warmth - 0.5) * 0.1 : 0;
      const colOff = Array.from({ length: cw }, () => rng() - 0.5);
      for (let gy = 0; gy < cw; gy++)
        for (let gx = 0; gx < cw; gx++) {
          const k = gy * cw + gx;
          let v = (S[k] * 400 - lo) / Math.max(1, hi - lo);
          v = (v - 0.5) * contrast + 0.5 + lift;
          if (inst === 'sonar') {
            const speckle = Math.sqrt(-Math.log(1 - rng() * 0.999)) * 1.13;
            v = v * mix(1, speckle, 0.45 + a.noise * 0.5) * rowGain[gy] + rng() * 0.03;
          } else if (inst === 'thermal') v += colOff[gx] * (0.02 + a.noise * 0.09);
          S[k] = v + (rng() - 0.5) * noiseAmp * (inst === 'night' ? 1.5 : 1);
        }

      const smooth = inst !== 'sonar' && cell > 1;
      for (let y = 0; y < n; y++) {
        const fy = Math.max(0, Math.min(cw - 1.001, (y + 0.5) / cell - 0.5));
        const y0 = Math.floor(fy);
        const ty = fy - y0;
        for (let x = 0; x < n; x++) {
          if (!smooth) {
            V[y * n + x] = S[Math.min(cw - 1, (y / cell) | 0) * cw + Math.min(cw - 1, (x / cell) | 0)];
            continue;
          }
          const fx = Math.max(0, Math.min(cw - 1.001, (x + 0.5) / cell - 0.5));
          const x0 = Math.floor(fx);
          const tx = fx - x0;
          const k = y0 * cw + x0;
          const y1 = Math.min(cw - 1, y0 + 1) * cw + x0;
          V[y * n + x] = mix(mix(S[k], S[k + 1], tx), mix(S[y1], S[y1 + 1], tx), ty);
        }
      }

      if (inst === 'night') {
        const bright = new Float32Array(N);
        for (let i = 0; i < N; i++) bright[i] = Math.max(0, V[i] - 0.62);
        const halo = blur(blur(bright, n, n, 7), n, n, 7);
        for (let i = 0; i < N; i++) {
          const x = (i % n) / n - 0.5;
          const y = ((i / n) | 0) / n - 0.5;
          let v = V[i] + halo[i] * 2.2;
          v *= 1 - 1.5 * (x * x + y * y);
          if (rng() < 0.0006 + a.noise * 0.006) v += 0.35 + rng() * 0.6; // scintillation
          V[i] = v;
        }
      }
      if (inst === 'xray') {
        // film grain and a soft density falloff toward the edges of the plate
        for (let i = 0; i < N; i++) V[i] += (rng() - 0.5) * (0.03 + a.noise * 0.1);
      }
    }
    signal.throwIfAborted();
    await pause();

    // ---- faults -----------------------------------------------------------------------------
    const rowShift = new Int16Array(n);
    const rowMul = new Float32Array(n).fill(1);
    if (a.fault === 'tearing') {
      const bandTop = Math.floor(n * (0.15 + rng() * 0.6));
      const bandH = Math.floor(n * (0.05 + rng() * 0.09));
      const slip = Math.round((18 + rng() * 60) * (rng() < 0.5 ? -1 : 1));
      const roll = Math.floor(rng() * n);
      for (let y = 0; y < n; y++) {
        rowShift[y] = Math.round((rng() - 0.5) * (1 + energy * 5));
        if (y >= bandTop && y < bandTop + bandH) rowShift[y] += slip + Math.round((rng() - 0.5) * 10);
        if (y % 2) rowMul[y] = 0.66;
        const d = (y - roll + n) % n;
        if (d < 46) rowMul[y] *= 1.25 + 0.35 * Math.sin((d / 46) * Math.PI);
      }
      const src = V;
      const hsrc = H;
      V = new Float32Array(N);
      if (hsrc) H = new Float32Array(N);
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const sx = x - rowShift[y];
          if (sx < 0 || sx >= n) continue;
          V[y * n + x] = src[y * n + sx] * rowMul[y] + (rowMul[y] > 1.2 ? 0.06 : 0);
          if (H && hsrc) H[y * n + x] = hsrc[y * n + sx];
        }
    } else if (a.fault === 'ghost') {
      const dx = Math.round(14 + rng() * 22) * (rng() < 0.5 ? -1 : 1);
      const dy = Math.round((rng() - 0.5) * 10);
      const src = V;
      V = new Float32Array(N);
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const i = y * n + x;
          let v = src[i];
          for (let k = 1; k <= 3; k++) {
            const sx = x - (dx * k) / 1.5;
            const sy = y - (dy * k) / 1.5;
            if (sx < 0 || sx >= n || sy < 0 || sy >= n) continue;
            const j = (sy | 0) * n + (sx | 0);
            const g = src[j] * (0.62 - k * 0.15);
            if (g > v) {
              v = g;
              if (H) H[i] = H[j];
            }
          }
          V[i] = v;
        }
    } else if (a.fault === 'overload') {
      const bright = new Float32Array(N);
      for (let i = 0; i < N; i++) bright[i] = Math.max(0, V[i] - 0.5);
      const flare = blur(blur(bright, n, n, 14), n, n, 14);
      const streak = new Float32Array(N); // vertical smear down the columns, like a saturated CCD
      for (let x = 0; x < n; x++) {
        let top = 0;
        for (let y = 0; y < n; y++) top = Math.max(top, bright[y * n + x]);
        for (let y = 0; y < n; y++) streak[y * n + x] = top > 0.3 ? (top - 0.3) * 0.5 : 0;
      }
      for (let i = 0; i < N; i++) V[i] = V[i] * 1.15 + flare[i] * 2.4 + streak[i];
    }
    const deadCols = new Set<number>();
    const stuck: number[] = [];
    const deadCount = (a.fault === 'dead' ? 4 + Math.floor(rng() * 5) : 0) + (wear > 0.6 ? Math.floor((wear - 0.6) * 6) : 0);
    for (let k = 0; k < deadCount; k++) deadCols.add(Math.floor(rng() * n));
    const stuckCount = Math.floor((a.fault === 'dead' ? 90 : 0) + wear * wear * 40);
    for (let k = 0; k < stuckCount; k++) stuck.push(Math.floor(rng() * N));
    if (a.fault === 'dead') {
      const stripe = Array.from({ length: Math.ceil(n / 6) }, () => 1 + (rng() - 0.5) * 0.5);
      for (let i = 0; i < N; i++) V[i] *= stripe[((i % n) / 6) | 0];
    }
    for (const x of deadCols) {
      const from = rng() < 0.4 ? Math.floor(rng() * n * 0.7) : 0;
      const value = rng() < 0.3 ? 1.2 : 0;
      const wide = Math.max(1, Math.min(3, cell >> 1));
      for (let y = from; y < n; y++) for (let w = 0; w < wide && x + w < n; w++) V[y * n + x + w] = value;
    }
    for (const i of stuck) {
      const value = rng() < 0.7 ? 1.3 : 0;
      const s = Math.max(2, Math.min(cell, 5));
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) if (i + dy * n + dx < N) V[i + dy * n + dx] = value;
    }
    if (a.fault === 'dropout') {
      const block = Math.max(16, cell * 4);
      for (let k = 0; k < 26; k++) {
        const bx = Math.floor((rng() * n) / block) * block;
        const by = Math.floor((rng() * n) / block) * block;
        const bw = block * (1 + Math.floor(rng() * 5));
        const bh = block * (1 + Math.floor(rng() * 2));
        const mode = rng();
        const fromRow = Math.min(n - 1, by + bh);
        for (let y = by; y < Math.min(n, by + bh); y++)
          for (let x = bx; x < Math.min(n, bx + bw); x++) V[y * n + x] = mode < 0.55 ? 0 : mode < 0.8 ? V[fromRow * n + x] : ((x >> 2) + (y >> 2)) % 2 ? 0.55 : 0.1;
      }
      for (let k = 0; k < 7; k++) {
        const y0 = Math.floor(rng() * n);
        const hgt = 1 + Math.floor(rng() * 5);
        for (let y = y0; y < Math.min(n, y0 + hgt); y++) for (let x = 0; x < n; x++) V[y * n + x] = 0;
      }
    }

    // ---- colour -----------------------------------------------------------------------------
    const rampName = a.palette === 'native' ? NATIVE[inst] : a.palette;
    const lut = lutOf(RAMPS[rampName]);
    const pixels = new Uint8ClampedArray(N * 4);
    for (let i = 0; i < N; i++) {
      const o = i * 4;
      if (H) {
        // lidar: hue from range, brightness from return strength; keep away from the ramp's black end
        const k = Math.round(clamp01(0.3 + 0.7 * H[i]) * 255) * 3;
        const b = clamp01(V[i]);
        const white = Math.max(0, b - 0.8) * 2.2;
        pixels[o] = lut[k] * b + 255 * white + 3;
        pixels[o + 1] = lut[k + 1] * b + 255 * white + 4;
        pixels[o + 2] = lut[k + 2] * b + 255 * white + 7;
      } else {
        const k = Math.round(clamp01(V[i]) * 255) * 3;
        pixels[o] = lut[k];
        pixels[o + 1] = lut[k + 1];
        pixels[o + 2] = lut[k + 2];
      }
      pixels[o + 3] = 255;
    }
    signal.throwIfAborted();
    await pause();

    // ---- overlay graphics, drawn as a mask ----------------------------------------------------
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = n;
    const g = canvas.getContext('2d', { willReadFrequently: true })!;
    g.strokeStyle = g.fillStyle = '#fff';
    g.lineWidth = 1.5;
    g.font = '600 14px monospace';
    g.textBaseline = 'middle';
    const pad = a.frame === 'print' ? 52 : a.frame === 'film' ? 58 : a.frame === 'crt' ? 44 : 22;
    const line = (x0: number, y0: number, x1: number, y1: number) => {
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    };
    const tmin = Math.round(mix(-14, 17, warmth) + (rng() - 0.5) * 4);
    const tmax = tmin + Math.round(22 + rng() * 40);
    const width = capture.pixelWorldSize * n;
    const at = (x: number, y: number) => {
      let sum = 0;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) sum += clamp01(V[Math.max(0, Math.min(n - 1, y + dy)) * n + Math.max(0, Math.min(n - 1, x + dx))]);
      return sum / 49;
    };
    const read = (x: number, y: number): string => {
      const v = at(x | 0, y | 0);
      const zi = Z[Math.max(0, Math.min(N - 1, (y | 0) * n + (x | 0)))];
      if (inst === 'thermal') return `${mix(tmin, tmax, v).toFixed(1)}°C`;
      if (inst === 'night') return `${Math.round(v * 100)}%`;
      if (inst === 'sonar') return `${(-58 + 50 * v).toFixed(0)}dB`;
      if (inst === 'xray') return `${Math.round(v * 4095)}`;
      return `${(width * (0.6 + 1.6 * zi)).toFixed(1)}m`;
    };
    const title = { thermal: 'IR LWIR 8-14µm', night: 'NVG GEN3 AUTO', sonar: 'SONAR 455kHz', xray: 'DX 72kVp 8mAs', lidar: 'LIDAR 64CH 10Hz' }[inst];
    const two = (v: number) => String(Math.floor(v)).padStart(2, '0');
    const clock = `${two(rng() * 24)}:${two(rng() * 60)}:${two(rng() * 60)}`;
    const serial = `${String.fromCharCode(65 + Math.floor(rng() * 26))}${Math.floor(1000 + rng() * 9000)}`;
    let scaleBar = false;

    if (a.frame === 'fan') {
      const ax = n / 2;
      const ay = n * 0.98;
      g.globalAlpha = 0.55;
      for (let k = 1; k <= 5; k++) {
        g.beginPath();
        g.arc(ax, ay, k * 0.19 * n, -Math.PI / 2 - 0.9076, -Math.PI / 2 + 0.9076);
        g.stroke();
      }
      for (const ang of [-0.9076, -0.4538, 0, 0.4538, 0.9076]) line(ax + Math.sin(ang) * 0.05 * n, ay - Math.cos(ang) * 0.05 * n, ax + Math.sin(ang) * 0.95 * n, ay - Math.cos(ang) * 0.95 * n);
      g.globalAlpha = 1;
      for (let k = 1; k <= 4; k++) g.fillText(`${(k * 0.19 * width).toFixed(width < 10 ? 1 : 0)}m`, ax + 6, ay - k * 0.19 * n - 10);
    }
    if (a.overlay !== 'none') {
      g.fillText(title, pad, pad);
      g.textAlign = 'right';
      g.fillText(a.overlay === 'clinical' ? `ID ${serial}` : `● REC ${clock}`, n - pad, pad);
      g.textAlign = 'left';
    }
    if (a.overlay === 'spot') {
      const c = n / 2;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) line(c + dx * 9, c + dy * 9, c + dx * 30, c + dy * 30);
      g.strokeRect(c - 5, c - 5, 10, 10);
      g.font = '600 18px monospace';
      g.fillText(read(c, c), c + 16, c - 22);
      g.font = '600 14px monospace';
      g.fillText(inst === 'thermal' ? `ε 0.95  Trefl ${Math.round(mix(4, 24, warmth))}°` : `SPOT ${read(c, c)}`, pad, n - pad);
      scaleBar = true;
      const bx = n - pad - 16;
      g.strokeRect(bx - 1, 139, 16, 442);
      g.textAlign = 'right';
      const ends = inst === 'thermal' ? [`${tmax}°`, `${tmin}°`] : inst === 'sonar' ? ['-8dB', '-58dB'] : ['MAX', 'MIN'];
      g.fillText(ends[0], bx + 15, 124);
      g.fillText(ends[1], bx + 15, 597);
      g.textAlign = 'left';
    } else if (a.overlay === 'reticle') {
      const c = n / 2;
      line(pad + 40, c, c - 16, c);
      line(c + 16, c, n - pad - 40, c);
      line(c, pad + 40, c, c - 16);
      line(c, c + 16, c, n - pad - 40);
      for (let k = 1; k <= 7; k++) {
        const t = k * 36;
        const s = k % 2 ? 5 : 9;
        for (const sgn of [-1, 1]) {
          line(c + sgn * t, c - s, c + sgn * t, c + s);
          line(c - s, c + sgn * t, c + s, c + sgn * t);
        }
      }
      g.beginPath();
      g.arc(c, c, 108, 0, Math.PI * 2);
      g.stroke();
      g.fillRect(c - 1.5, c - 1.5, 3, 3);
      g.fillText(`RNG ${(width * (0.6 + 1.6 * Z[c * n + c])).toFixed(1)}m`, c + 14, c + 124);
      g.fillText(`${read(c, c)}`, c + 14, c - 124);
      g.fillText(`AZ ${Math.floor(rng() * 360)}°  EL ${(rng() * 20 - 10).toFixed(1)}°`, pad, n - pad);
    } else if (a.overlay === 'track') {
      let tag = 1;
      for (const [id, b] of [...boxes.entries()].sort((p, r) => p[0] - r[0])) {
        if (b.count < 260 || tag > 9) continue;
        const x0 = Math.max(4, b.x0 - 7);
        const y0 = Math.max(4, b.y0 - 7);
        const x1 = Math.min(n - 4, b.x1 + 7);
        const y1 = Math.min(n - 4, b.y1 + 7);
        const s = Math.max(8, Math.min(26, (x1 - x0) / 4, (y1 - y0) / 4));
        g.lineWidth = id === hero ? 2.5 : 1.5;
        for (const [px, py, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
          line(px, py, px + sx * s, py);
          line(px, py, px, py + sy * s);
        }
        g.lineWidth = 1.5;
        const cx = (x0 + x1) >> 1;
        const cy = (y0 + y1) >> 1;
        const label = `${id === hero ? 'TGT' : 'T'}${tag++} ${read(cx, cy)}`;
        const ly = y0 > pad + 34 ? y0 - 11 : y1 + 12;
        g.fillText(label, Math.min(x0, n - 8 - g.measureText(label).width), ly);
        if (id === hero) {
          line(cx - 7, cy, cx + 7, cy);
          line(cx, cy - 7, cx, cy + 7);
        }
      }
      g.fillText(`TRK ${tag - 1}  LOCK ${boxes.has(hero) ? 'ON' : '--'}`, pad, n - pad);
    } else if (a.overlay === 'survey') {
      for (let t = 40; t < n; t += 40) {
        const s = t % 200 === 0 ? 14 : 7;
        line(t, 0, t, s);
        line(t, n, t, n - s);
        line(0, t, s, t);
        line(n, t, n - s, t);
      }
      g.globalAlpha = 0.6;
      for (let y = 120; y < n; y += 120) for (let x = 120; x < n; x += 120) {
        line(x - 6, y, x + 6, y);
        line(x, y - 6, x, y + 6);
      }
      g.globalAlpha = 1;
      // a scale bar in true scene units
      const target = width * 0.22;
      const mag = Math.pow(10, Math.floor(Math.log10(Math.max(1e-9, target))));
      const nice = [1, 2, 5, 10].map((m) => m * mag).reduce((best, m) => (Math.abs(m - target) < Math.abs(best - target) ? m : best));
      const len = nice / capture.pixelWorldSize;
      const by = n - pad - 22;
      g.fillRect(pad, by, len / 2, 5);
      g.strokeRect(pad, by, len, 5);
      const unit = nice >= 1000 ? `${nice / 1000} km` : nice >= 1 ? `${nice} m` : nice >= 0.01 ? `${Math.round(nice * 100)} cm` : `${+(nice * 1000).toPrecision(1)} mm`;
      g.fillText(unit, pad + len + 10, by + 3);
      g.fillText(`${(rng() * 80).toFixed(4)}N ${(rng() * 170).toFixed(4)}W`, pad, n - pad);
      const ax = n - pad - 18;
      const ay = n - pad - 14;
      line(ax, ay + 16, ax, ay - 20);
      g.beginPath();
      g.moveTo(ax, ay - 28);
      g.lineTo(ax - 6, ay - 14);
      g.lineTo(ax + 6, ay - 14);
      g.fill();
      g.fillText('N', ax - 22, ay - 20);
    } else if (a.overlay === 'clinical') {
      g.font = '700 30px monospace';
      g.fillText(rng() < 0.5 ? 'L' : 'R', n - pad - 34, pad + 52);
      g.lineWidth = 2.5;
      g.strokeRect(n - pad - 44, pad + 30, 38, 42);
      g.lineWidth = 1.5;
      g.font = '600 14px monospace';
      g.fillText(`SUBJ ${serial}-${Math.floor(rng() * 90 + 10)}`, pad, pad + 20);
      g.fillText(`${clock}  SER ${Math.floor(rng() * 9) + 1}/9`, pad, pad + 40);
      const step = 0.01 / capture.pixelWorldSize; // one centimetre
      const tick = step >= 5 ? step : step * 10 >= 5 ? step * 10 : step * 100 >= 5 ? step * 100 : step * 1000;
      const rx = pad + 4;
      line(rx, 150, rx, n - 110);
      for (let k = 0, y = n - 110; y >= 150; k++, y -= tick) line(rx, y, rx + (k % 5 === 0 ? 14 : 7), y);
      g.fillText('AP  SUPINE', pad, n - pad);
    }
    if (a.overlay !== 'none' && a.fault !== 'none') {
      g.textAlign = 'right';
      g.fillText({ tearing: 'SYNC', dead: 'CAL REQ', ghost: 'LAG', dropout: 'NO DATA', overload: 'SAT' }[a.fault as 'tearing'] ?? '', n - pad, n - pad);
      g.textAlign = 'left';
    }
    const mask = g.getImageData(0, 0, n, n).data;

    // ---- presentation ---------------------------------------------------------------------------
    const mid: Rgb = [lut[150 * 3], lut[150 * 3 + 1], lut[150 * 3 + 2]];
    const top: Rgb = [lut[232 * 3], lut[232 * 3 + 1], lut[232 * 3 + 2]];
    const hud: Rgb = rampName === 'ironbow' || rampName === 'rainbow' || rampName === 'turbo' ? [240, 244, 240] : [Math.max(top[0], 150), Math.max(top[1], 150), Math.max(top[2], 150)];
    const inkTone: Rgb = [mid[0] * 0.22 + 14, mid[1] * 0.22 + 12, mid[2] * 0.22 + 20];
    const paperTone: Rgb = [238, 233, 221];
    const streaks = Array.from({ length: n }, () => (rng() < 0.03 ? 0.25 + rng() * 0.4 : 0));
    const notch = [0.62, 0.68, 0.78].map((t) => t * n);

    for (let y = 0; y < n; y++) {
      if (y % 360 === 0) {
        signal.throwIfAborted();
        await pause();
      }
      for (let x = 0; x < n; x++) {
        const o = (y * n + x) * 4;
        let r = pixels[o];
        let gr = pixels[o + 1];
        let b = pixels[o + 2];
        if (scaleBar && x >= n - pad - 16 && x < n - pad - 2 && y >= 140 && y < 580) {
          const k = Math.round((1 - (y - 140) / 440) * 255) * 3;
          const dim = H ? 0.9 : 1;
          r = lut[k] * dim;
          gr = lut[k + 1] * dim;
          b = lut[k + 2] * dim;
        }
        const m = mask[o + 3] / 255;
        const nx = x / n - 0.5;
        const ny = y / n - 0.5;
        let hudMix = m * 0.92;

        if (a.frame === 'screen') {
          const v = 1 - 0.5 * (nx * nx + ny * ny);
          r *= v;
          gr *= v;
          b *= v;
        } else if (a.frame === 'scope') {
          const d = Math.hypot(nx, ny);
          const inside = clamp01((0.47 - d) / 0.012);
          const fall = 1 - Math.pow(clamp01(d / 0.47), 5) * 0.75;
          const ring = Math.max(0, 1 - Math.abs(d - 0.474) / 0.006) * 0.18;
          r = r * inside * fall + mid[0] * ring;
          gr = gr * inside * fall + mid[1] * ring;
          b = b * inside * fall + mid[2] * ring;
        } else if (a.frame === 'crt') {
          const ex = Math.max(0, Math.abs(nx) - 0.5 + 0.022 + 0.085) / 0.085;
          const ey = Math.max(0, Math.abs(ny) - 0.5 + 0.022 + 0.085) / 0.085;
          const corner = Math.hypot(ex, ey);
          const inside = clamp01((1 - corner) * 14);
          const scan = y % 3 === 2 ? 0.62 : 1;
          const bulge = 1 - 0.9 * (nx * nx + ny * ny) * (nx * nx + ny * ny) * 4;
          const glass = Math.max(0, 1 - Math.hypot(nx + 0.24, ny + 0.3) / 0.3) * 14;
          const bezel = 20 + (1 - clamp01((corner - 1) * 5)) * 20;
          r = mix(bezel, r * scan * bulge * 1.12 + mid[0] * 0.05 + glass, inside);
          gr = mix(bezel, gr * scan * bulge * 1.12 + mid[1] * 0.05 + glass, inside);
          b = mix(bezel + 2, b * scan * bulge * 1.12 + mid[2] * 0.05 + glass, inside);
          hudMix *= inside;
        } else if (a.frame === 'fan') {
          const dx = x - n / 2;
          const dy = n * 0.98 - y;
          const rad = Math.hypot(dx, dy) / n;
          const ang = Math.abs(Math.atan2(dx, dy));
          const inside = clamp01((0.9076 - ang) * rad * n * 0.6) * clamp01((0.95 - rad) * n * 0.5) * clamp01((rad - 0.05) * n * 0.5);
          const sweep = 1 - 0.25 * rad;
          r = mix(7, r * sweep, inside);
          gr = mix(8, gr * sweep, inside);
          b = mix(11, b * sweep, inside);
        } else if (a.frame === 'print') {
          const border = Math.min(x, n - 1 - x, y, n - 1 - y);
          const lum = (r * 0.3 + gr * 0.55 + b * 0.15) / 255;
          const fibre = (rng() - 0.5) * 9;
          let inkAmount = 0;
          if (border >= 30) {
            const level = Math.pow(clamp01(lum), 0.8) * (1 - streaks[x]) * (0.9 + 0.1 * Math.sin(y * 0.021 + x * 0.002));
            const threshold = (BAYER[((y >> 1) & 3) * 4 + ((x >> 1) & 3)] + 0.5) / 16;
            inkAmount = level > threshold ? 0.88 + (rng() - 0.5) * 0.14 : 0;
            if (m > 0.3) inkAmount = 0.95;
          } else if (m > 0.3) inkAmount = 0.95;
          const edge = border < 3 ? 0.86 : 1;
          const feed = x < 16 && y % 30 < 12 && x > 6 ? 0.8 : 1; // sprocket marks down the margin
          r = mix(paperTone[0] + fibre, inkTone[0], inkAmount) * edge * feed;
          gr = mix(paperTone[1] + fibre, inkTone[1], inkAmount) * edge * feed;
          b = mix(paperTone[2] + fibre, inkTone[2], inkAmount) * edge * feed;
          hudMix = 0;
        } else {
          // film on a lightbox
          const border = Math.min(x, n - 1 - x, y, n - 1 - y);
          const onFilm = border >= 12 && !(y < 26 && notch.some((t) => Math.abs(x - t) < 9));
          const inImage = border >= 40;
          if (!onFilm) {
            const glow = 232 + ny * 16 + (rng() - 0.5) * 4;
            r = glow - 4;
            gr = glow;
            b = glow + 3;
            hudMix = 0;
          } else {
            const base = inImage ? 1 : 0;
            const leak = 20 + 8 * (0.5 - Math.hypot(nx, ny));
            r = r * base * 0.9 + leak * 0.75 + mid[0] * 0.04;
            gr = gr * base * 0.9 + leak * 0.95 + mid[1] * 0.04;
            b = b * base * 0.9 + leak * 1.25 + mid[2] * 0.04;
            if (wear > 0.35 && rng() < (wear - 0.35) * 0.004) {
              r += 70;
              gr += 70;
              b += 70;
            }
          }
        }
        pixels[o] = mix(r, hud[0], hudMix);
        pixels[o + 1] = mix(gr, hud[1], hudMix);
        pixels[o + 2] = mix(b, hud[2], hudMix);
      }
    }

    const names = { thermal: 'thermal camera', night: 'night vision', sonar: 'imaging sonar', xray: 'x-ray negative', lidar: 'lidar point cloud' };
    return {
      pixels,
      notes: [
        `${names[inst]} in ${rampName} colours, strongest on ${a.signal}`,
        `${a.frame} presentation, ${a.overlay === 'none' ? 'no overlay' : `${a.overlay} overlay`}`,
        ...(a.fault === 'none' ? [] : [`fault: ${a.fault}`]),
      ],
    };
  },
});
