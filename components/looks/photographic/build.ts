import { choice, clamp01, defineLook, mix, score, seeded } from '@conjure/kit';

type RGB = readonly [number, number, number];
const STOCKS: Record<string, { shadow: RGB; light: RGB; saturation: number; contrast: number }> = {
  faithful: { shadow: [1, 1, 1], light: [1, 1, 1], saturation: 1, contrast: 1 },
  daylight: { shadow: [0.995, 1.004, 1.012], light: [1.018, 1.004, 0.982], saturation: 1.015, contrast: 0.98 },
  editorial: { shadow: [0.988, 1.002, 1.015], light: [1.006, 1.004, 0.988], saturation: 0.94, contrast: 1.045 },
  cinema: { shadow: [0.974, 1.006, 1.026], light: [1.028, 1.004, 0.968], saturation: 0.97, contrast: 1.035 },
  warm: { shadow: [1.015, 1.001, 0.982], light: [1.042, 1.004, 0.953], saturation: 1.005, contrast: 0.99 },
  cool: { shadow: [0.981, 1.003, 1.027], light: [0.973, 1.002, 1.03], saturation: 0.975, contrast: 1.005 },
};
const smooth = (lo: number, hi: number, value: number) => {
  const t = clamp01((value - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};
const luminance = (r: number, g: number, b: number) => r * 0.2126 + g * 0.7152 + b * 0.0722;
const linear = Float32Array.from({ length: 256 }, (_, value) => {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
});
const display = (value: number) => {
  const v = clamp01(value);
  return (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055) * 255;
};

async function blur(input: Float32Array, size: number, radius: number, pause: () => Promise<void>) {
  const horizontal = new Float32Array(input.length), output = new Float32Array(input.length);
  const span = radius * 2 + 1;
  for (let y = 0; y < size; y++) {
    if (y % 48 === 0) await pause();
    const row = y * size;
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += input[row + Math.max(0, Math.min(size - 1, k))];
    for (let x = 0; x < size; x++) {
      horizontal[row + x] = sum / span;
      sum += input[row + Math.min(size - 1, x + radius + 1)] - input[row + Math.max(0, x - radius)];
    }
  }
  for (let x = 0; x < size; x++) {
    if (x % 48 === 0) await pause();
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += horizontal[Math.max(0, Math.min(size - 1, k)) * size + x];
    for (let y = 0; y < size; y++) {
      output[y * size + x] = sum / span;
      sum += horizontal[Math.min(size - 1, y + radius + 1) * size + x] - horizontal[Math.max(0, y - radius) * size + x];
    }
  }
  return output;
}

// A small, fixed disk keeps optical softness bounded and predictable at every size.
const DISK = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.707, 0.707], [-0.707, 0.707], [0.707, -0.707], [-0.707, -0.707], [0.4, 0.2], [-0.4, -0.2], [-0.2, 0.4], [0.2, -0.4]] as const;

export default defineLook({
  questions: {
    stock: choice('What photographic colour rendition serves this scene?', {
      faithful: 'Faithful neutral capture: accurate material colours and clean, natural shading.',
      daylight: 'Daylight negative: gentle warm highlights and open, slightly cool shadows.',
      editorial: 'Editorial studio: restrained saturation, clean whites and precise material detail.',
      cinema: 'Subtle cinematic negative: cool shadow separation and warm highlights, retaining the real colours.',
      warm: 'Warm portrait stock: mild amber warmth, soft highlights and welcoming natural colour.',
      cool: 'Cool daylight stock: crisp blue-white light, calm shadows and quiet, realistic colour.',
    }),
    exposure: score('How bright should the photographic exposure feel?', ['Low-key but readable', 'Slightly subdued', 'Natural exposure', 'Luminous', 'Bright and airy']),
    contrast: score('How firmly should the photograph separate light from shade?', ['Soft open shadows', 'Gentle', 'Natural contrast', 'Crisp', 'Rich and defined']),
    latitude: score('How softly should the brightest highlights roll into white?', ['Crisp digital highlights', 'A little highlight protection', 'Smooth filmic whites', 'Supple negative-film highlights', 'Very gentle highlight roll-off']),
    saturation: score('How vivid are the real material colours in the finished photograph?', ['Quiet colour', 'Restrained', 'Natural', 'Lively', 'Rich but credible colour']),
    focus: choice('Where should the photographic lens hold sharp focus?', {
      deep: 'Deep focus: keep the whole captured scene sharp, suitable for architecture and product detail.',
      subject: 'Focus on the main subject, with restrained optical softness in surfaces farther from its depth.',
      near: 'Focus on the nearer subject surfaces, with a gentle fall-off into the distance.',
    }),
    separation: score('How much optical separation should accompany selective focus?', ['Almost deep focus', 'Barely softened distance', 'Gentle depth separation', 'Soft distance', 'Shallow but restrained focus']),
    detail: score('How clearly should existing surface texture and fine material detail resolve?', ['Soft natural detail', 'Gentle definition', 'Clean detail', 'Crisp material texture', 'Precise editorial detail']),
    bloom: score('How much subtle lens diffusion should bright light produce?', ['Clean optical glass', 'A trace of diffusion', 'Gentle highlight bloom', 'Soft luminous highlights', 'A light cinematic diffusion filter']),
    grain: choice('What fine photographic texture should remain?', {
      clean: 'Clean digital capture, with no added grain.',
      fine: 'Very fine monochrome grain, like a slow photographic negative.',
      fast: 'A restrained fast-film grain, visible up close without hiding the material texture.',
    }),
    vignette: score('How gently should the lens shade the outer frame?', ['Even exposure to the edges', 'Almost imperceptible falloff', 'A gentle lens falloff', 'Softly gathered corners', 'A restrained photographic vignette']),
  },

  async apply(capture, a, context, signal) {
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      signal.throwIfAborted();
    };
    await pause();
    const { size, color, depth, identity } = capture, count = size * size;
    const rgb = new Float32Array(count * 3), light = new Float32Array(count), z = new Float32Array(count);
    const heroDepths: number[] = [], objectDepths: number[] = [];
    let nearest = 1, farthest = 0;
    for (let y = 0; y < size; y++) {
      if (y % 40 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const i = y * size + x, p = i * 4, c = i * 3;
        const r = rgb[c] = linear[color[p]], g = rgb[c + 1] = linear[color[p + 1]], b = rgb[c + 2] = linear[color[p + 2]];
        light[i] = luminance(r, g, b);
        // Three.js RGBADepthPacking, including its 255/256 unpack correction.
        z[i] = depth[p] / 256 + depth[p + 1] / 65536 + depth[p + 2] / 16777216 + depth[p + 3] / (255 * 16777216);
        if (identity[p] > 0) {
          nearest = Math.min(nearest, z[i]); farthest = Math.max(farthest, z[i]);
          if (x % 4 === 0 && y % 4 === 0 && identity[p] >= 2) {
            objectDepths.push(z[i]);
            if (identity[p] === 3) heroDepths.push(z[i]);
          }
        }
      }
    }
    const focusSamples = heroDepths.length ? heroDepths : objectDepths;
    focusSamples.sort((left, right) => left - right);
    const focus = focusSamples[Math.floor((focusSamples.length - 1) * (a.focus === 'near' ? 0.25 : 0.5))] ?? (nearest + farthest) / 2;
    const depthSpan = Math.max(0.00001, farthest - nearest);
    const small = Math.max(1, Math.ceil(size / 4));
    const highlights = new Float32Array(small * small);
    for (let y = 0; y < small; y++) {
      if (y % 48 === 0) await pause();
      for (let x = 0; x < small; x++) {
        const i = Math.min(size - 1, y * 4 + 2) * size + Math.min(size - 1, x * 4 + 2);
        highlights[y * small + x] = Math.max(0, light[i] - 0.58);
      }
    }
    const glow = a.bloom > 0 ? await blur(await blur(highlights, small, 2, pause), small, 3, pause) : highlights;
    const stock = STOCKS[a.stock];
    const exposure = 2 ** ((a.exposure - 0.5) * 0.95);
    const contrast = (0.9 + a.contrast * 0.2) * stock.contrast;
    const saturation = (0.84 + a.saturation * 0.32) * stock.saturation;
    const grainAmount = { clean: 0, fine: 0.55, fast: 1.25 }[a.grain];
    const random = seeded(context.seed ^ 0x49b10f35);
    const pixels = new Uint8ClampedArray(count * 4);
    const sampleStep = Math.max(1, Math.round(size / 240));
    const neighbours = [[sampleStep, 0], [-sampleStep, 0], [0, sampleStep], [0, -sampleStep]] as const;
    for (let y = 0; y < size; y++) {
      if (y % 24 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const i = y * size + x, p = i * 4, c = i * 3, id = identity[p];
        let r = rgb[c], g = rgb[c + 1], b = rgb[c + 2];
        // Keep the foreground silhouette and its colour out of distant surfaces.
        const defocus = a.focus === 'deep' || id === 0 ? 0 : smooth(0.045, 0.58, Math.abs(z[i] - focus) / depthSpan) * a.separation;
        const radius = defocus * 4.2 * size / 720;
        if (radius > 0.45) {
          let red = r * 2, green = g * 2, blue = b * 2, weight = 2;
          for (const [dx, dy] of DISK) {
            const sx = Math.max(0, Math.min(size - 1, Math.round(x + dx * radius)));
            const sy = Math.max(0, Math.min(size - 1, Math.round(y + dy * radius)));
            const at = sy * size + sx;
            if (identity[at * 4] !== id || Math.abs(z[at] - z[i]) > depthSpan * 0.09) continue;
            red += rgb[at * 3]; green += rgb[at * 3 + 1]; blue += rgb[at * 3 + 2]; weight++;
          }
          r = red / weight; g = green / weight; b = blue / weight;
        }
        // Existing fine texture supplies the detail; no invented surface texture.
        let local = light[i] * 2, weight = 2;
        for (const [dx, dy] of neighbours) {
          const at = Math.max(0, Math.min(size - 1, y + dy)) * size + Math.max(0, Math.min(size - 1, x + dx));
          if (identity[at * 4] !== id || Math.abs(z[at] - z[i]) > depthSpan * 0.025) continue;
          local += light[at]; weight++;
        }
        const detail = Math.max(-0.06, Math.min(0.06, (light[i] - local / weight) * a.detail * 0.8)) * (1 - defocus);
        const bx = Math.min(small - 1, x / 4), by = Math.min(small - 1, y / 4);
        const ix = Math.floor(bx), iy = Math.floor(by), nx = Math.min(small - 1, ix + 1), ny = Math.min(small - 1, iy + 1);
        const halo = mix(mix(glow[iy * small + ix], glow[iy * small + nx], bx - ix), mix(glow[ny * small + ix], glow[ny * small + nx], bx - ix), by - iy) * a.bloom * 0.065;
        const value = Math.max(0.00001, luminance(r, g, b));
        const exposed = Math.max(0, value + detail + halo) * exposure;
        let tone = 0.18 * (exposed / 0.18) ** contrast;
        // Capture is already display-referred, so this is a mild secondary shoulder.
        if (tone > 0.65) tone = mix(tone, 0.65 + 0.35 * (1 - Math.exp(-(tone - 0.65) / 0.35)), 0.3 + a.latitude * 0.6);
        tone = clamp01(tone);
        const shade = smooth(0.02, 0.7, tone);
        const gain = tone / value;
        const radial = ((x + 0.5) / size - 0.5) ** 2 + ((y + 0.5) / size - 0.5) ** 2;
        const vignette = 1 - a.vignette * 0.25 * (radial / 0.5) ** 1.5;
        r = Math.max(0, mix(value, r, saturation)) * gain * mix(stock.shadow[0], stock.light[0], shade) * vignette;
        g = Math.max(0, mix(value, g, saturation)) * gain * mix(stock.shadow[1], stock.light[1], shade) * vignette;
        b = Math.max(0, mix(value, b, saturation)) * gain * mix(stock.shadow[2], stock.light[2], shade) * vignette;
        // Gamut compression keeps bright coloured surfaces coloured rather than clipping a channel.
        const peak = Math.max(1, r, g, b);
        const grain = (random() + random() + random() - 1.5) * grainAmount * (1.1 - tone * 0.5);
        pixels[p] = display(r / peak) + grain;
        pixels[p + 1] = display(g / peak) + grain;
        pixels[p + 2] = display(b / peak) + grain;
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.stock} colour, natural material detail and filmic highlight roll-off`, `${a.focus} focus, ${a.grain} texture, restrained optical diffusion`, 'Photographic finishing preserves the captured procedural geometry.'] };
  },
});
