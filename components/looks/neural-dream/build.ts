import { choice, defineLook, noul, score } from '@conjure/kit';

/**
 * A coordinate network (Fourier features into a small multilayer perceptron) is fitted to the
 * captured frame with Adam for a bounded number of steps, then asked to paint every pixel.
 * Everything is seeded from the build context, so the same answers dream the same dream.
 * No weights are downloaded and nothing leaves the browser.
 */
const WIDTHS = { tiny: 16, small: 32, medium: 48 } as const;
const SIGMAS = { low: 1.6, medium: 5, high: 12 } as const;
const FREQUENCIES = 14;
const BATCH = 1024;
const RENDER = 360;

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Gaussian draw from the seeded uniform generator. */
const gaussian = (random: () => number) => {
  const u = Math.max(1e-9, random()), v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export default defineLook({
  questions: {
    capacity: choice('How big is the network that dreams the picture?', {
      tiny: 'Very small: broad, soft blobs of colour and little else.',
      small: 'Small: the main shapes emerge while details melt together.',
      medium: 'Medium: recognisable but dreamlike, edges wavering.',
    }),
    training: score('How long does it train before painting?', [
      'Barely: a first glimpse, mostly noise and gradient',
      'Briefly: colour fields in roughly the right places',
      'Enough to recognise the scene',
      'Well trained: a soft copy with artefacts',
      'Until it nearly copies the picture',
    ]),
    frequency: choice('What kind of detail can it represent?', {
      low: 'Only smooth, low-frequency blobs.',
      medium: 'Rippling mid frequencies: rounded forms with wavy edges.',
      high: 'Fine interference fringes and moiré across every surface.',
    }),
    learns: choice('What is the network shown while it learns?', {
      position: 'Only where each pixel is: it must memorise everything.',
      shape: 'Where each pixel is and which way its surface faces, so form comes easily and colour drifts.',
      light: 'Where each pixel is and how brightly it is lit, so shading comes easily and colour drifts.',
    }),
    fidelity: score('How much of the real picture shows through the dream?', [
      'None: the network alone',
      'A trace of the real frame',
      'Half and half',
      'Mostly the real picture, dream in the gaps',
      'A faint neural haze over the real picture',
    ]),
    edges: noul('Are the real outlines inked back over the dream?'),
    palette: choice('How is the dreamed colour treated?', {
      learned: 'As learned: soft, slightly muddy, drifting.',
      vivid: 'Saturation pushed up until it glows.',
      duotone: 'Reduced to two inks, light and dark.',
      posterised: 'Snapped to a few flat levels.',
    }),
  },

  async apply(capture, a, context, signal) {
    const { size, color, normal, depth, diffuse, identity } = capture;
    const random = context.random;
    const width = WIDTHS[a.capacity];
    const steps = Math.round(40 + a.training * 280);
    const sigma = SIGMAS[a.frequency];
    const extra = a.learns === 'position' ? 0 : a.learns === 'shape' ? 4 : 2;
    const inputs = FREQUENCIES * 2 + extra;
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      signal.throwIfAborted();
    };

    // Fourier feature frequencies and the three layers, seeded.
    const B = new Float32Array(FREQUENCIES * 2);
    for (let i = 0; i < B.length; i++) B[i] = gaussian(random) * sigma;
    const layer = (fanIn: number, fanOut: number) => {
      const scale = Math.sqrt(2 / fanIn);
      const w = new Float32Array(fanIn * fanOut);
      for (let i = 0; i < w.length; i++) w[i] = gaussian(random) * scale;
      return { w, b: new Float32Array(fanOut), fanIn, fanOut, mw: new Float32Array(w.length), vw: new Float32Array(w.length), mb: new Float32Array(fanOut), vb: new Float32Array(fanOut), gw: new Float32Array(w.length), gb: new Float32Array(fanOut) };
    };
    const L1 = layer(inputs, width), L2 = layer(width, width), L3 = layer(width, 3);

    const depthAt = (p: number) => depth[p] / 256 + depth[p + 1] / 65536 + depth[p + 2] / 16777216;
    const features = (pixel: number, out: Float32Array) => {
      const x = (pixel % size) / size - 0.5, y = Math.floor(pixel / size) / size - 0.5;
      for (let f = 0; f < FREQUENCIES; f++) {
        const phase = 2 * Math.PI * (B[f * 2] * x + B[f * 2 + 1] * y);
        out[f * 2] = Math.sin(phase);
        out[f * 2 + 1] = Math.cos(phase);
      }
      const p = pixel * 4;
      if (a.learns === 'shape') {
        out[FREQUENCIES * 2] = normal[p] / 127.5 - 1;
        out[FREQUENCIES * 2 + 1] = normal[p + 1] / 127.5 - 1;
        out[FREQUENCIES * 2 + 2] = normal[p + 2] / 127.5 - 1;
        out[FREQUENCIES * 2 + 3] = depthAt(p) * 2 - 1;
      } else if (a.learns === 'light') {
        out[FREQUENCIES * 2] = Math.min(1, diffuse[p] / 110) * 2 - 1;
        out[FREQUENCIES * 2 + 1] = depthAt(p) * 2 - 1;
      }
    };

    const x0 = new Float32Array(inputs), h1 = new Float32Array(width), h2 = new Float32Array(width), o = new Float32Array(3);
    const d3 = new Float32Array(3), d2 = new Float32Array(width), d1 = new Float32Array(width);
    const forward = () => {
      for (let j = 0; j < width; j++) {
        let sum = L1.b[j];
        const row = j * inputs;
        for (let i = 0; i < inputs; i++) sum += L1.w[row + i] * x0[i];
        h1[j] = sum > 0 ? sum : 0;
      }
      for (let j = 0; j < width; j++) {
        let sum = L2.b[j];
        const row = j * width;
        for (let i = 0; i < width; i++) sum += L2.w[row + i] * h1[i];
        h2[j] = sum > 0 ? sum : 0;
      }
      for (let j = 0; j < 3; j++) {
        let sum = L3.b[j];
        const row = j * width;
        for (let i = 0; i < width; i++) sum += L3.w[row + i] * h2[i];
        o[j] = sigmoid(sum);
      }
    };

    // Adam over bounded steps, each on a seeded batch of pixels from the real frame.
    const lr = 0.012, beta1 = 0.9, beta2 = 0.999, eps = 1e-8;
    const adam = (L: ReturnType<typeof layer>, step: number) => {
      const c1 = 1 - beta1 ** step, c2 = 1 - beta2 ** step;
      for (let i = 0; i < L.w.length; i++) {
        const g = L.gw[i] / BATCH;
        L.mw[i] = beta1 * L.mw[i] + (1 - beta1) * g;
        L.vw[i] = beta2 * L.vw[i] + (1 - beta2) * g * g;
        L.w[i] -= lr * (L.mw[i] / c1) / (Math.sqrt(L.vw[i] / c2) + eps);
        L.gw[i] = 0;
      }
      for (let i = 0; i < L.b.length; i++) {
        const g = L.gb[i] / BATCH;
        L.mb[i] = beta1 * L.mb[i] + (1 - beta1) * g;
        L.vb[i] = beta2 * L.vb[i] + (1 - beta2) * g * g;
        L.b[i] -= lr * (L.mb[i] / c1) / (Math.sqrt(L.vb[i] / c2) + eps);
        L.gb[i] = 0;
      }
    };
    for (let step = 1; step <= steps; step++) {
      if (step % 12 === 0) await pause();
      for (let n = 0; n < BATCH; n++) {
        const pixel = Math.floor(random() * size * size);
        features(pixel, x0);
        forward();
        const p = pixel * 4;
        for (let j = 0; j < 3; j++) d3[j] = (o[j] - color[p + j] / 255) * o[j] * (1 - o[j]);
        for (let j = 0; j < width; j++) {
          let sum = 0;
          for (let k = 0; k < 3; k++) {
            sum += L3.w[k * width + j] * d3[k];
            L3.gw[k * width + j] += d3[k] * h2[j];
          }
          d2[j] = h2[j] > 0 ? sum : 0;
        }
        for (let k = 0; k < 3; k++) L3.gb[k] += d3[k];
        for (let j = 0; j < width; j++) {
          let sum = 0;
          for (let k = 0; k < width; k++) {
            sum += L2.w[k * width + j] * d2[k];
            L2.gw[k * width + j] += d2[k] * h1[j];
          }
          d1[j] = h1[j] > 0 ? sum : 0;
        }
        for (let k = 0; k < width; k++) L2.gb[k] += d2[k];
        for (let k = 0; k < width; k++) {
          const row = k * inputs;
          for (let i = 0; i < inputs; i++) L1.gw[row + i] += d1[k] * x0[i];
          L1.gb[k] += d1[k];
        }
      }
      adam(L1, step); adam(L2, step); adam(L3, step);
    }

    // Paint the dream at a lower resolution, then let it blur up into the frame.
    const dream = new Float32Array(RENDER * RENDER * 3);
    for (let y = 0; y < RENDER; y++) {
      if (y % 30 === 0) await pause();
      for (let x = 0; x < RENDER; x++) {
        const sx = Math.min(size - 1, Math.floor((x + 0.5) * size / RENDER)), sy = Math.min(size - 1, Math.floor((y + 0.5) * size / RENDER));
        features(sy * size + sx, x0);
        forward();
        const at = (y * RENDER + x) * 3;
        dream[at] = o[0]; dream[at + 1] = o[1]; dream[at + 2] = o[2];
      }
    }
    const sampleDream = (x: number, y: number, channel: number) => {
      const fx = Math.max(0, Math.min(RENDER - 1, (x + 0.5) * RENDER / size - 0.5)), fy = Math.max(0, Math.min(RENDER - 1, (y + 0.5) * RENDER / size - 0.5));
      const x0i = Math.floor(fx), y0i = Math.floor(fy), x1i = Math.min(RENDER - 1, x0i + 1), y1i = Math.min(RENDER - 1, y0i + 1), tx = fx - x0i, ty = fy - y0i;
      const read = (xx: number, yy: number) => dream[(yy * RENDER + xx) * 3 + channel];
      return (read(x0i, y0i) * (1 - tx) + read(x1i, y0i) * tx) * (1 - ty) + (read(x0i, y1i) * (1 - tx) + read(x1i, y1i) * tx) * ty;
    };

    const pixels = new Uint8ClampedArray(size * size * 4);
    const fidelity = clamp01(a.fidelity);
    const inkColour = [26, 24, 30];
    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4;
        let r = sampleDream(x, y, 0), g = sampleDream(x, y, 1), b = sampleDream(x, y, 2);
        if (a.palette === 'vivid') {
          const mean = (r + g + b) / 3;
          r = clamp01(mean + (r - mean) * 2.2); g = clamp01(mean + (g - mean) * 2.2); b = clamp01(mean + (b - mean) * 2.2);
        } else if (a.palette === 'posterised') {
          r = Math.round(r * 4) / 4; g = Math.round(g * 4) / 4; b = Math.round(b * 4) / 4;
        } else if (a.palette === 'duotone') {
          const tone = r * 0.3 + g * 0.59 + b * 0.11;
          r = 0.12 + tone * 0.82; g = 0.1 + tone * 0.78; b = 0.22 + tone * 0.7;
        }
        // The real frame shows through by fidelity, with the dream filling in flatter areas.
        const real = [color[p] / 255, color[p + 1] / 255, color[p + 2] / 255];
        let value = [r, g, b].map((c, i) => c * (1 - fidelity) + real[i] * fidelity);
        if (a.edges) {
          let edge = 0;
          for (const [dx, dy] of [[2, 0], [0, 2]] as const) {
            const q = (Math.min(size - 1, y + dy) * size + Math.min(size - 1, x + dx)) * 4;
            if (identity[p] !== identity[q]) edge = 1;
            else edge = Math.max(edge, (Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[q + 1])) / 150);
          }
          edge = Math.min(1, edge);
          value = value.map((c, i) => c * (1 - edge * 0.85) + (inkColour[i] / 255) * edge * 0.85);
        }
        const grain = (random() - 0.5) * 4;
        pixels[p] = value[0] * 255 + grain;
        pixels[p + 1] = value[1] * 255 + grain;
        pixels[p + 2] = value[2] * 255 + grain;
        pixels[p + 3] = 255;
      }
    }

    return {
      pixels,
      notes: [
        `a ${width}-wide network trained for ${steps} steps on ${a.learns === 'position' ? 'position alone' : a.learns === 'shape' ? 'position and surface direction' : 'position and lighting'}`,
        `${a.frequency} frequencies, ${a.palette} colour, ${Math.round(fidelity * 100)}% of the real frame${a.edges ? ', outlines inked back' : ''}`,
      ],
    };
  },
});
