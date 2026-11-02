import { choice, clamp01, defineLook, mix, rekey, rekeyOne, score } from '@conjure/kit';

type RGB = readonly [number, number, number];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const FOG: Record<string, RGB> = {
  sky: [159, 199, 226], cream: [229, 218, 176], lavender: [174, 161, 204],
  sea: [115, 180, 170], silver: [194, 203, 210], midnight: [31, 42, 76],
};
/** Under the idea's palette the fog takes its ground (keeping its depth; neutral silver stays) and the life gems its ink. */
const GEM: RGB = [232, 71, 85], GEM_GLINT: RGB = [255, 194, 162];
const css = (c: RGB) => `rgb(${c.map(Math.round).join(',')})`;
const smooth = (lo: number, hi: number, value: number) => {
  const t = clamp01((value - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};
const noise = (x: number, y: number, seed: number) => {
  let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ seed;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
};

export default defineLook({
  questions: {
    direction: choice('Which early 3D cartridge art direction suits this world?', {
      adventure: 'A sunny collectathon: cheerful saturated colours, open light and friendly readable shapes.',
      storybook: 'A storybook quest: soft honeyed light, warm stone and gentle painted colour.',
      racer: 'A bright arcade racer: punchy clean colours and crisp broad lighting.',
      dream: 'A strange exploratory dream: candy-soft colour and a faint lavender cast.',
      stealth: 'A subdued night mission: cooler, lower colour with enough light to read every silhouette.',
    }),
    resolution: choice('How large is the console framebuffer?', {
      low: 'A coarse 160-pixel square crop, chunky early polygon graphics.',
      standard: 'A 240-pixel square crop, soft but clearly recognizable console detail.',
      expanded: 'A 320-pixel square crop, the cleaner look of a higher-resolution cartridge game.',
    }),
    textures: choice('How much texture memory is available for the surfaces?', {
      tiny: 'Tiny texture tiles enlarged heavily: paint and labels smear into broad coloured patches.',
      modest: 'Modest texture tiles: surfaces are softly filtered while their main markings remain.',
      generous: 'Larger texture tiles: most markings survive, with a gentle triangular sampling softness.',
    }),
    lighting: choice('How does the console shade its polygonal surfaces?', {
      vertex: 'Broad interpolated vertex lighting, softly joining a few widely spaced light samples.',
      faceted: 'Stepped light on sculpted facets, emphasizing the angular construction.',
      ambient: 'Simple bright ambient lighting, as though soft shadows were painted into the textures.',
    }),
    fog: choice('What kind of haze fills the distant draw limit? Its colour comes from the picture\u2019s palette.', {
      sky: 'A clear light airy haze, bright and outdoors.',
      cream: 'A pale warm haze, soft, dusty and sunlit.',
      lavender: 'A soft mid-pale mist, enchanted and slightly unreal.',
      sea: 'A deeper coloured haze, rich and heavy, like a lagoon or submerged temple.',
      silver: 'Neutral silver fog, cool and overcast.',
      midnight: 'Deep, dark fog, suitable for a night stage.',
    }),
    haze: score('How much does distance disappear into the console fog?', ['No distance fog', 'A little at the far edge', 'Soft distant haze', 'Noticeably short draw distance', 'A thick atmospheric draw limit']),
    dither: choice('How are the five-bit colour channels rounded?', {
      ordered: 'Restrained ordered dithering, smoothing a 16-bit colour buffer.',
      noise: 'Fine noisy dithering, with faint grain in the colour gradients.',
      bands: 'No dithering: gentle visible bands in the five-bit gradients.',
    }),
    video: choice('How does the console picture reach the display?', {
      clean: 'A clean direct image with softly reconstructed pixel edges.',
      composite: 'An ordinary analogue cable: a little horizontal colour bleed and soft detail.',
      interlaced: 'A lightly interlaced video image, with subtle alternating line brightness.',
    }),
    framing: choice('How is the captured game picture framed?', {
      full: 'An edge-to-edge square crop of the game world.',
      television: 'A central 4:3 picture inside narrow black bars, like a television game frame.',
    }),
    hud: choice('Does a game interface appear over the scene?', {
      none: 'No interface: only the polygonal world.',
      adventure: 'Three simple bright life gems at the upper left, like an adventure-game interface.',
      reticle: 'A small quiet aiming reticle at the centre, like a first-person exploration game.',
    }),
  },

  async apply(capture, a, context, signal) {
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      signal.throwIfAborted();
    };
    await pause();
    const { size, color, normal, identity, depth } = capture;
    const grid = Math.max(1, Math.min(size, { low: 160, standard: 240, expanded: 320 }[a.resolution]));
    const textureGrid = { tiny: 64, modest: 112, generous: 192 }[a.textures];
    const textureStep = Math.max(1, size / textureGrid);
    const lightStep = size / (a.lighting === 'vertex' ? 24 : 44);
    const frame = new Float32Array(grid * grid * 3);
    const light = new Float32Array(size * size), depths = new Float32Array(size * size);
    const illumination = capture.light;
    const lightLength = Math.hypot(...illumination) || 1;
    const lx = illumination[0] / lightLength, ly = -illumination[1] / lightLength, lz = illumination[2] / lightLength;
    let near = 1, far = 0;
    for (let y = 0; y < size; y++) {
      if (y % 64 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const o = y * size + x, p = o * 4;
        light[o] = Math.max(0, (normal[p] / 127.5 - 1) * lx + (normal[p + 1] / 127.5 - 1) * ly + (normal[p + 2] / 127.5 - 1) * lz);
        depths[o] = (depth[p] + depth[p + 1] / 256 + depth[p + 2] / 65536) / 255;
        if (identity[p] > 0) { near = Math.min(near, depths[o]); far = Math.max(far, depths[o]); }
      }
    }
    const depthRange = Math.max(0.001, far - near);
    const fog = a.fog === 'silver' ? FOG.silver : rekeyOne(FOG[a.fog], context.palette, 'ground');
    const saturation = { adventure: 1.28, storybook: 1.05, racer: 1.18, dream: 1.02, stealth: 0.75 }[a.direction];
    const exposure = { adventure: 1.045, storybook: 1.035, racer: 1, dream: 1.045, stealth: 0.84 }[a.direction];
    const tint: RGB = a.direction === 'storybook' ? [4, 1, -3] : a.direction === 'dream' ? [3, -2, 5] : a.direction === 'stealth' ? [-3, 0, 3] : [0, 0, 0];

    // Three-point reconstruction samples a triangle of a texel square. Keep the
    // samples on the same captured object so tiny textures do not erase silhouettes.
    const triangle = (x: number, y: number, step: number, centre: number): [number, number, number, number, number, number] => {
      const u = x / step, v = y / step, ix = Math.floor(u), iy = Math.floor(v), tx = u - ix, ty = v - iy;
      const id = identity[centre * 4];
      const at = (xx: number, yy: number) => {
        const o = Math.max(0, Math.min(size - 1, Math.round(yy * step))) * size + Math.max(0, Math.min(size - 1, Math.round(xx * step)));
        return identity[o * 4] === id ? o : centre;
      };
      return tx + ty <= 1
        ? [at(ix, iy), at(ix + 1, iy), at(ix, iy + 1), 1 - tx - ty, tx, ty]
        : [at(ix + 1, iy + 1), at(ix, iy + 1), at(ix + 1, iy), tx + ty - 1, 1 - tx, 1 - ty];
    };
    for (let y = 0; y < grid; y++) {
      if (y % 32 === 0) await pause();
      const sy = Math.min(size - 1, (y + 0.5) * size / grid);
      for (let x = 0; x < grid; x++) {
        const sx = Math.min(size - 1, (x + 0.5) * size / grid);
        const centre = Math.floor(sy) * size + Math.floor(sx), id = identity[centre * 4];
        const [p0, p1, p2, w0, w1, w2] = triangle(sx, sy, textureStep, centre);
        const [l0, l1, l2, lw0, lw1, lw2] = triangle(sx, sy, lightStep, centre);
        const sourceLight = light[centre];
        const broadLight = a.lighting === 'faceted' ? Math.round(sourceLight * 4) / 4
          : a.lighting === 'ambient' ? 0.72 : light[l0] * lw0 + light[l1] * lw1 + light[l2] * lw2;
        const relight = id === 0 ? 1 : Math.max(0.74, Math.min(1.3, (0.5 + broadLight * 0.5) / (0.5 + sourceLight * 0.5)));
        const red = color[p0 * 4] * w0 + color[p1 * 4] * w1 + color[p2 * 4] * w2;
        const green = color[p0 * 4 + 1] * w0 + color[p1 * 4 + 1] * w1 + color[p2 * 4 + 1] * w2;
        const blue = color[p0 * 4 + 2] * w0 + color[p1 * 4 + 2] * w1 + color[p2 * 4 + 2] * w2;
        const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
        const distance = id === 0 ? 1 : clamp01((depths[centre] - near) / depthRange);
        const fogAmount = smooth(0.24 - a.haze * 0.16, 1.05 - a.haze * 0.12, distance) * a.haze * 0.8;
        const dither = a.dither === 'bands' ? 0 : a.dither === 'ordered'
          ? (BAYER[(y % 4) * 4 + x % 4] / 16 - 0.5) * 0.78
          : (noise(x, y, context.seed) - 0.5) * 0.85;
        const index = (y * grid + x) * 3;
        for (let c = 0; c < 3; c++) {
          let value = (luminance + ([red, green, blue][c] - luminance) * saturation) * exposure * relight + tint[c];
          if (a.direction === 'racer') value = (value - 128) * 1.07 + 128;
          value = mix(value, fog[c], fogAmount);
          // A five-bit RGB framebuffer, followed below by a separate video filter.
          frame[index + c] = Math.max(0, Math.min(31, Math.round(value / 255 * 31 + dither))) * 255 / 31;
        }
      }
    }

    const pixels = new Uint8ClampedArray(size * size * 4);
    const bar = a.framing === 'television' ? Math.round(size / 8) : 0;
    const read = (x: number, y: number, c: number) => frame[(Math.max(0, Math.min(grid - 1, y)) * grid + Math.max(0, Math.min(grid - 1, x))) * 3 + c];
    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) await pause();
      const sy = Math.max(0, Math.min(grid - 1, (y + 0.5) * grid / size - 0.5)), iy = Math.floor(sy), ty = sy - iy;
      const line = a.video === 'interlaced' && Math.floor(y * grid / size) % 2 ? 0.967 : 1;
      for (let x = 0; x < size; x++) {
        const sx = Math.max(0, Math.min(grid - 1, (x + 0.5) * grid / size - 0.5)), ix = Math.floor(sx), tx = sx - ix;
        const p = (y * size + x) * 4;
        for (let c = 0; c < 3; c++) {
          const top = mix(read(ix, iy, c), read(ix + 1, iy, c), tx);
          const bottom = mix(read(ix, iy + 1, c), read(ix + 1, iy + 1, c), tx);
          let value = mix(top, bottom, ty);
          if (a.video === 'composite') {
            const spread = mix(read(ix - 1, iy, c), read(ix + 2, iy, c), c === 0 ? 0.65 : c === 2 ? 0.35 : 0.5);
            value = mix(value, spread, c === 1 ? 0.075 : 0.17);
          }
          pixels[p + c] = y < bar || y >= size - bar ? 7 : value * line;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    if (a.hud !== 'none') {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      const pen = canvas.getContext('2d', { willReadFrequently: true })!;
      pen.putImageData(new ImageData(pixels, size, size), 0, 0);
      const unit = size / 180;
      if (a.hud === 'adventure') {
        const top = bar + unit * 5;
        const gems = rekey({ gem: GEM, glint: GEM_GLINT }, context.palette, { gem: 'ink', glint: 'ink' });
        for (let gem = 0; gem < 3; gem++) {
          const left = unit * (5 + gem * 9);
          pen.fillStyle = 'rgba(14,25,48,0.76)'; pen.fillRect(left + unit, top + unit, unit * 6, unit * 6);
          pen.fillStyle = css(gems.gem); pen.beginPath(); pen.moveTo(left + unit * 3, top); pen.lineTo(left + unit * 6, top + unit * 3); pen.lineTo(left + unit * 3, top + unit * 6); pen.lineTo(left, top + unit * 3); pen.closePath(); pen.fill();
          pen.fillStyle = css(gems.glint); pen.fillRect(left + unit * 2, top + unit, unit * 2, unit);
        }
      } else {
        pen.strokeStyle = 'rgba(247,242,206,0.82)'; pen.lineWidth = Math.max(1, unit * 0.6);
        const centre = size / 2, outer = unit * 3.5, inner = unit * 1.3;
        pen.beginPath(); pen.moveTo(centre - outer, centre); pen.lineTo(centre - inner, centre); pen.moveTo(centre + inner, centre); pen.lineTo(centre + outer, centre); pen.moveTo(centre, centre - outer); pen.lineTo(centre, centre - inner); pen.moveTo(centre, centre + inner); pen.lineTo(centre, centre + outer); pen.stroke();
      }
      signal.throwIfAborted();
      return { pixels: pen.getImageData(0, 0, size, size).data, notes: [`${a.direction} cartridge art, ${grid} × ${grid} framebuffer`, `${a.textures} triangular texture sampling, ${a.lighting} lighting`, `${a.fog} distance fog, ${a.video} video, ${a.hud} interface`] };
    }
    return { pixels, notes: [`${a.direction} cartridge art, ${grid} × ${grid} framebuffer`, `${a.textures} triangular texture sampling, ${a.lighting} lighting`, `${a.fog} distance fog, ${a.video} video, no interface`] };
  },
});
