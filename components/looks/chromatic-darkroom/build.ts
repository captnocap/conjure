import { choice, clamp01, defineLook, mix, score, seeded } from '@conjure/kit';

type RGB = readonly [number, number, number];
// Shadow, middle dye, paper. Each chemistry retains a real black and a gentle shoulder.
const DYES: Record<string, readonly [RGB, RGB, RGB]> = {
  petrol: [[12, 32, 48], [67, 137, 145], [252, 228, 193]],
  ember: [[40, 19, 37], [185, 82, 61], [255, 237, 198]],
  lilac: [[29, 26, 62], [133, 114, 180], [246, 226, 235]],
  moss: [[16, 41, 36], [115, 142, 93], [249, 235, 193]],
  silver: [[18, 25, 35], [125, 137, 145], [245, 244, 231]],
  candy: [[31, 18, 68], [205, 89, 153], [248, 232, 179]],
};
const smooth = (lo: number, hi: number, value: number) => {
  const t = clamp01((value - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};

// A separable sliding box is bounded by the image area, not the bloom radius.
async function blur(input: Float32Array, size: number, radius: number, pause: () => Promise<void>) {
  const horizontal = new Float32Array(input.length), output = new Float32Array(input.length);
  const width = radius * 2 + 1;
  for (let y = 0; y < size; y++) {
    if (y % 64 === 0) await pause();
    const row = y * size;
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += input[row + Math.max(0, Math.min(size - 1, k))];
    for (let x = 0; x < size; x++) {
      horizontal[row + x] = sum / width;
      sum += input[row + Math.min(size - 1, x + radius + 1)] - input[row + Math.max(0, x - radius)];
    }
  }
  for (let x = 0; x < size; x++) {
    if (x % 64 === 0) await pause();
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += horizontal[Math.max(0, Math.min(size - 1, k)) * size + x];
    for (let y = 0; y < size; y++) {
      output[y * size + x] = sum / width;
      sum += horizontal[Math.min(size - 1, y + radius + 1) * size + x] - horizontal[Math.max(0, y - radius) * size + x];
    }
  }
  return output;
}

export default defineLook({
  questions: {
    process: choice('Which darkroom chemistry reveals this image?', {
      split: 'A luminous split-toned photograph: cool dense shadows and warm pearly highlights.',
      chromogenic: 'A colour-negative print, rich in coloured dyes with cinematic black levels.',
      bleach: 'A bleach-bypass print: steely silver shadows and muted, bruised colours.',
      infrared: 'False-colour infrared film: vegetation and warm pigments turn rose, with cool cyan shadows.',
      solarized: 'A Sabattier solarization: light partially reverses into dark, with silver halos and unfamiliar tones.',
      photogram: 'A camera-less photogram: objects become pale ghost impressions suspended on saturated dark paper.',
    }),
    chemistry: choice('Which pair of dyes should develop the photograph?', {
      petrol: 'Petrol blue shadows, jade middle tones and apricot white, like a distant summer.',
      ember: 'Plum black, burnt orange and pale gold, intimate and firelit.',
      lilac: 'Midnight indigo, dusty lilac and rose-white, tender and otherworldly.',
      moss: 'Forest black, olive dye and warm ivory, quiet and botanical.',
      silver: 'Blue-black, neutral silver and warm white, restrained and archival.',
      candy: 'Violet-black, hot magenta and butter yellow, exuberant experimental film.',
    }),
    exposure: score('How far was the photographic print exposed?', ['Deep, underexposed blacks', 'Low key', 'Balanced', 'Open luminous tones', 'High-key pearly light']),
    contrast: score('How hard is the darkroom paper grade?', ['Soft and milky', 'Gentle', 'Defined', 'Hard', 'Very crisp and dramatic']),
    diffusion: score('How much do the highlights bloom through the enlarger?', ['No diffusion', 'A trace of halation', 'Soft luminous edges', 'Dreamy glow', 'Velvety blown light']),
    grain: choice('Which photographic emulsion records the detail?', {
      fine: 'Fine-grained slow film: clean detail and subtle texture.',
      pushed: 'Pushed fast film: visible silver grain and energetic darks.',
      coarse: 'Expired high-speed film: coarse clustered grain and soft dye clouds.',
    }),
    leak: choice('Did stray light enter the film holder?', {
      sealed: 'A sealed holder: no stray light.',
      amber: 'A small amber flare burns one edge of the negative.',
      carmine: 'A red-magenta veil enters from a corner.',
      prism: 'A cool prism flare sweeps softly across one edge.',
    }),
    edge: choice('How is the darkroom print presented?', {
      full: 'Full bleed: the photograph fills the sheet.',
      border: 'A narrow warm paper border around the finished photograph.',
      contact: 'A black contact-print surround with tiny exposed rebate marks.',
    }),
  },

  async apply(capture, a, context, signal) {
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      signal.throwIfAborted();
    };
    await pause();
    const { size, color, identity } = capture;
    const count = size * size, small = Math.max(1, Math.ceil(size / 4));
    const light = new Float32Array(small * small);
    const [shadow, middle, white] = DYES[a.chemistry];
    const random = seeded(context.seed ^ 0x46db5923);
    const grainAmount = { fine: 1.5, pushed: 4.0, coarse: 6.7 }[a.grain] * (0.8 + context.mood.wear * 0.4);
    const phase = random() * Math.PI * 2, leakSide = random() < 0.5 ? -1 : 1;
    const leakY = 0.15 + random() * 0.7;
    const margin = a.edge === 'full' ? 0 : Math.max(2, Math.round(size * (a.edge === 'border' ? 0.025 : 0.038)));
    for (let y = 0; y < small; y++) {
      if (y % 48 === 0) await pause();
      for (let x = 0; x < small; x++) {
        const p = (Math.min(size - 1, y * 4 + 2) * size + Math.min(size - 1, x * 4 + 2)) * 4;
        const luminance = (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
        light[y * small + x] = smooth(0.55, 1, luminance);
      }
    }
    const narrow = await blur(light, small, 1 + Math.round(a.diffusion * 2), pause);
    const glow = await blur(narrow, small, 2 + Math.round(a.diffusion * 3), pause);
    const pixels = new Uint8ClampedArray(count * 4);
    const gain = Math.pow(2, (a.exposure - 0.5) * 1.6);
    const hardness = 0.8 + a.contrast * 1.25;
    const retain = a.process === 'chromogenic' ? 0.66 : a.process === 'bleach' ? 0.22 : a.process === 'infrared' ? 0.48 : 0.08;
    for (let y = 0; y < size; y++) {
      if (y % 40 === 0) await pause();
      const v = (y + 0.5) / size;
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = (x + 0.5) / size;
        const raw = (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
        const exposed = clamp01(raw * gain);
        let tone = smooth(0, 1, clamp01((exposed - 0.5) * hardness + 0.5));
        if (a.process === 'solarized') {
          const reversal = 0.57 + a.exposure * 0.16;
          tone = tone > reversal ? clamp01(1 - (tone - reversal) * 2.25) : tone / reversal;
        }
        if (a.process === 'photogram') {
          const ghost = identity[p] >= 2 ? 0.35 + (1 - raw) * 0.6 : identity[p] === 1 ? (1 - raw) * 0.22 : 0;
          tone = clamp01(ghost * gain);
        }
        const bx = Math.min(small - 1, x / 4), by = Math.min(small - 1, y / 4);
        const ix = Math.floor(bx), iy = Math.floor(by), tx = bx - ix, ty = by - iy;
        const x2 = Math.min(small - 1, ix + 1), y2 = Math.min(small - 1, iy + 1);
        const halo = mix(mix(glow[iy * small + ix], glow[iy * small + x2], tx), mix(glow[y2 * small + ix], glow[y2 * small + x2], tx), ty);
        const rim = Math.max(0, halo - smooth(0.55, 1, raw));
        const veil = a.diffusion * (rim * 0.36 + halo * 0.035);
        tone = clamp01(tone + veil * (a.process === 'photogram' ? -0.4 : 1));
        const radial = (u - 0.5) ** 2 + (v - 0.5) ** 2;
        const vignette = 1 - radial * (0.2 + (1 - a.exposure) * 0.24);
        const fineGrain = (random() + random() + random() - 1.5) * grainAmount;
        const cloud = Math.sin(x * 0.065 + phase + Math.sin(y * 0.079)) * Math.cos(y * 0.053 + phase) * (a.grain === 'coarse' ? 1.8 : 0.35);
        const edgeDistance = leakSide < 0 ? u : 1 - u;
        const leak = a.leak === 'sealed' ? 0 : Math.exp(-edgeDistance * edgeDistance / 0.016 - (v - leakY) ** 2 / 0.24) * 0.43;
        const leakColor = a.leak === 'prism' ? [95, 191, 224] : a.leak === 'carmine' ? [246, 68, 121] : [255, 166, 71];
        const t = tone < 0.5 ? smooth(0, 0.5, tone) : smooth(0.5, 1, tone);
        for (let c = 0; c < 3; c++) {
          const dye = tone < 0.5 ? mix(shadow[c], middle[c], t) : mix(middle[c], white[c], t);
          let source = color[p + c];
          if (a.process === 'infrared') source = color[p + [1, 2, 0][c]];
          const photographic = clamp01(((source / 255 * gain - 0.5) * hardness + 0.5)) * 255;
          let value = mix(dye, photographic, retain) * vignette;
          value += rim * a.diffusion * (c === 0 ? 19 : c === 1 ? 5 : 0);
          value = mix(value, leakColor[c], leak) + fineGrain + cloud;
          if (margin && (x < margin || x >= size - margin || y < margin || y >= size - margin)) {
            const rebate = a.edge === 'contact';
            const notch = rebate && y > size - margin * 0.72 && y < size - margin * 0.35 && x % Math.max(8, Math.round(size * 0.08)) < size * 0.011;
            value = rebate ? (notch ? 92 : 15) + fineGrain * 0.12 : white[c] + fineGrain * 0.18;
          }
          pixels[p + c] = value;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.process} developed in ${a.chemistry} dyes`, `${a.grain} emulsion, ${a.leak === 'sealed' ? 'sealed holder' : `${a.leak} light leak`}`, `${a.edge} print, highlight diffusion ${Math.round(a.diffusion * 100)}%`] };
  },
});
