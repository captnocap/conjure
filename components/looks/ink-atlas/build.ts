import { choice, clamp01, defineLook, mix, score, seeded } from '@conjure/kit';

type RGB = readonly [number, number, number];
const PALETTES: Record<string, { ink: RGB; paper: RGB; wash: RGB; accent: RGB }> = {
  pelagic: { ink: [25, 57, 72], paper: [242, 237, 216], wash: [92, 153, 163], accent: [189, 99, 67] },
  lichen: { ink: [37, 65, 47], paper: [244, 236, 209], wash: [144, 160, 97], accent: [170, 98, 61] },
  cinnabar: { ink: [87, 38, 42], paper: [249, 234, 211], wash: [204, 121, 103], accent: [47, 109, 123] },
  ultramarine: { ink: [33, 47, 97], paper: [239, 235, 223], wash: [128, 151, 195], accent: [206, 144, 67] },
  graphite: { ink: [43, 45, 45], paper: [237, 233, 219], wash: [159, 163, 147], accent: [159, 101, 79] },
  plum: { ink: [62, 39, 68], paper: [242, 232, 222], wash: [172, 135, 166], accent: [83, 135, 133] },
};
const css = (color: RGB, alpha: number) => `rgba(${color.join(',')},${alpha})`;

export default defineLook({
  questions: {
    plate: choice('What kind of atlas plate describes this scene?', {
      survey: 'A topographic survey: crisp nesting contour bands and restrained colour washes.',
      engraving: 'An expedition engraving: fine flowing strokes model the shaded forms, with sparse contours.',
      currents: 'A chart of currents: long wandering streamlines and blue-green pigment pools.',
      fieldbook: 'A hand-painted field study: luminous mineral washes with only a few delicate pen marks.',
    }),
    measure: choice('What imaginary quantity do the contour lines measure?', {
      relief: 'The distance and tilt of surfaces: objects become tiny mountain ranges.',
      radiance: 'The fall of light: shadows become valleys and highlights become summits.',
      substance: 'The colour and density of material: ink maps the interior character of each object.',
    }),
    palette: choice('Which mineral inks belong in this atlas?', {
      pelagic: 'Deep ocean ink, pale turquoise wash and rust-red notes on warm ivory.',
      lichen: 'Moss ink and lichen green wash, with a little burnt sienna.',
      cinnabar: 'Wine-red ink and cinnabar wash, with a cool verdigris accent.',
      ultramarine: 'Ultramarine ink and faded blue wash, with small ochre accents.',
      graphite: 'Soft graphite and grey-green wash on old bone-coloured paper.',
      plum: 'Aubergine ink and muted violet wash, with a blue-green counterpoint.',
    }),
    interval: choice('How closely spaced are the survey intervals?', {
      close: 'Many fine close contours, an intricate detailed survey.',
      balanced: 'Clearly separated contour bands with room for the paper to breathe.',
      broad: 'Only a few broad terraces, a deliberately simplified map.',
    }),
    wash: score('How much transparent pigment was brushed into the map?', ['Barely tinted paper', 'A pale wash', 'Mineral colour', 'Deep pools of dye', 'Rich painted fields']),
    pressure: score('How heavily does the surveyor press the pen?', ['A hairline whisper', 'Delicate', 'Confident', 'Dark engraved marks', 'Bold ink']),
    hatching: choice('How does the engraving follow the surface?', {
      flowing: 'Curved strokes follow each form, like currents around an island.',
      cross: 'Two interwoven families of curved strokes, dense in the shadows.',
      stipple: 'Tiny survey dots build up the shaded areas, leaving the contours clear.',
      none: 'Open washes and contour lines without any engraved shading.',
    }),
    grid: choice('What surveying marks lie behind the picture?', {
      none: 'Unmarked paper, with no coordinates.',
      graticule: 'A very faint ruled graticule with ticks around the border.',
      soundings: 'Sparse little crosses, like points recorded in a field survey.',
    }),
    sheet: choice('How is the atlas sheet finished?', {
      open: 'The drawing runs freely to the edges of the paper.',
      folio: 'A quiet double-rule folio border and a small compass rose.',
      deckle: 'An irregular blank paper margin, as on a torn sheet from a field notebook.',
    }),
  },

  async apply(capture, a, context, signal) {
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      signal.throwIfAborted();
    };
    await pause();
    const { size, color, depth, normal, identity } = capture, count = size * size;
    const { ink, paper, wash, accent } = PALETTES[a.palette];
    const random = seeded(context.seed ^ 0x6829fbad), phase = random() * 6.283;
    const rawField = new Float32Array(count), field = new Float32Array(count), horizontal = new Float32Array(count);
    const luminance = new Float32Array(count), z = new Float32Array(count);
    let near = 1, far = 0;
    for (let y = 0; y < size; y++) {
      if (y % 64 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const o = y * size + x, p = o * 4;
        luminance[o] = (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
        z[o] = (depth[p] + depth[p + 1] / 256 + depth[p + 2] / 65536) / 255;
        if (identity[p] > 0) { near = Math.min(near, z[o]); far = Math.max(far, z[o]); }
      }
    }
    const range = Math.max(0.001, far - near);
    for (let y = 0; y < size; y++) {
      if (y % 64 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const o = y * size + x, p = o * 4;
        const relief = clamp01((z[o] - near) / range);
        const tilt = normal[p + 1] / 255;
        rawField[o] = a.measure === 'relief' ? relief * 0.68 + tilt * 0.2 + luminance[o] * 0.12
          : a.measure === 'radiance' ? luminance[o] * 0.85 + relief * 0.15
          : color[p] / 255 * 0.38 + color[p + 2] / 255 * 0.3 + tilt * 0.22 + relief * 0.1;
      }
    }
    // Soften tonal terraces within a surface; never smear across object boundaries.
    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const o = y * size + x, id = identity[o * 4];
        let sum = rawField[o] * 2, weight = 2;
        for (let k = -3; k <= 3; k++) {
          const at = y * size + Math.max(0, Math.min(size - 1, x + k));
          if (identity[at * 4] === id) { sum += rawField[at]; weight++; }
        }
        horizontal[o] = sum / weight;
      }
    }
    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const o = y * size + x, id = identity[o * 4];
        let sum = horizontal[o] * 2, weight = 2;
        for (let k = -3; k <= 3; k++) {
          const at = Math.max(0, Math.min(size - 1, y + k)) * size + x;
          if (identity[at * 4] === id) { sum += horizontal[at]; weight++; }
        }
        field[o] = sum / weight;
      }
    }
    const pixels = new Uint8ClampedArray(count * 4);
    const bands = { close: 46, balanced: 26, broad: 14 }[a.interval];
    const contourStrength = { survey: 0.68, engraving: 0.23, currents: 0.32, fieldbook: 0.16 }[a.plate];
    const gridUnit = Math.max(12, Math.round(size / 12)), margin = a.sheet === 'open' ? 0 : size * 0.04;
    for (let y = 0; y < size; y++) {
      if (y % 40 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const o = y * size + x, p = o * 4, id = identity[p];
        const left = y * size + Math.max(0, x - 1), right = y * size + Math.min(size - 1, x + 1);
        const above = Math.max(0, y - 1) * size + x, below = Math.min(size - 1, y + 1) * size + x;
        const sample = (at: number) => identity[at * 4] === id ? field[at] : field[o];
        const dx = (sample(right) - sample(left)) * 0.5, dy = (sample(below) - sample(above)) * 0.5;
        const gradient = Math.hypot(dx, dy) * bands;
        const height = field[o] * bands, nearest = Math.round(height);
        const major = nearest % 5 === 0;
        const width = (0.28 + a.pressure * 0.5) * (major ? 1.55 : 1);
        const contour = id && gradient > 0.002 ? clamp01(width + 0.5 - Math.abs(height - nearest) / gradient) * contourStrength : 0;
        const boundary = id > 0 && (identity[left * 4] !== id || identity[above * 4] !== id) ? 0.2 + a.pressure * 0.35 : 0;
        const shade = 1 - luminance[o];
        const cloud = Math.sin(x * 0.019 + Math.sin(y * 0.013) + phase) * Math.sin(y * 0.031 + phase);
        const pool = (0.35 + shade * 0.55 + cloud * 0.075) * (0.12 + a.wash * 0.73);
        const tint = id ? pool : (1 - luminance[o]) * a.wash * 0.3;
        const tide = id && Math.abs((field[o] * 7.3) % 1 - 0.55) < 0.026 ? a.wash * 0.035 : 0;
        const noise = (random() - 0.5) * (2.5 + context.mood.wear * 4);
        const fibre = Math.sin(y * 1.37 + Math.sin(x * 0.014) * 1.5) * 0.7;
        let grid = 0;
        if (a.grid === 'graticule') grid = x % gridUnit === 0 || y % gridUnit === 0 ? 0.09 : 0;
        if (a.grid === 'soundings') grid = (x % gridUnit < 5 && Math.abs(y % gridUnit - 2) < 1) || (y % gridUnit < 5 && Math.abs(x % gridUnit - 2) < 1) ? 0.19 : 0;
        const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
        const deckle = a.sheet === 'deckle' ? Math.sin(x * 0.064 + phase) * 1.5 + Math.sin(y * 0.081) * 1.8 : 0;
        const inside = edge > margin + deckle;
        for (let c = 0; c < 3; c++) {
          const warmPigment = mix(wash[c], accent[c], clamp01((color[p] - color[p + 2]) / 255) * 0.8);
          let value = mix(paper[c], warmPigment, tint + tide);
          value = mix(value, ink[c], clamp01(contour + boundary + grid));
          pixels[p + c] = (inside ? value : paper[c]) + noise + fibre;
        }
        pixels[p + 3] = 255;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const pen = canvas.getContext('2d', { willReadFrequently: true })!;
    pen.putImageData(new ImageData(pixels, size, size), 0, 0);
    pen.save();
    pen.beginPath(); pen.rect(margin + 3, margin + 3, size - margin * 2 - 6, size - margin * 2 - 6); pen.clip();
    pen.lineCap = 'round';
    const strokeCount = Math.round(size * size / (a.plate === 'engraving' ? 70 : a.plate === 'currents' ? 115 : 220));
    const long = a.plate === 'currents';
    const strokeLength = long ? 27 : a.plate === 'fieldbook' ? 7 : 12;
    const cross = a.hatching === 'cross';
    if (a.hatching !== 'none') {
      for (let stroke = 0; stroke < strokeCount; stroke++) {
        if (stroke % 300 === 0) await pause();
        let x = random() * (size - 2) + 1, y = random() * (size - 2) + 1;
        const first = Math.floor(y) * size + Math.floor(x), id = identity[first * 4];
        const shade = 1 - luminance[first];
        if (!id || random() > 0.15 + shade * 0.85) continue;
        pen.strokeStyle = css(ink, (0.12 + shade * 0.29) * (0.65 + a.pressure * 0.8));
        pen.fillStyle = pen.strokeStyle;
        pen.lineWidth = (0.36 + a.pressure * 0.6) * size / 720;
        if (a.hatching === 'stipple') {
          pen.beginPath(); pen.arc(x, y, (0.32 + random() * 0.6) * size / 720, 0, Math.PI * 2); pen.fill();
          continue;
        }
        pen.beginPath(); pen.moveTo(x, y);
        const tilt = cross && stroke % 2 === 0 ? 1.24 : 0;
        let previousAngle: number | undefined;
        for (let step = 0; step < strokeLength; step++) {
          const ix = Math.floor(x), iy = Math.floor(y), o = iy * size + ix, p = o * 4;
          if (ix < 1 || ix >= size - 1 || iy < 1 || iy >= size - 1 || identity[p] !== id) break;
          const dx = field[o + 1] - field[o - 1], dy = field[o + size] - field[o - size];
          // A coherent undulation on flat forms; contours steer the flow on rounded ones.
          const base = -0.45 + Math.sin(x * 0.009 + y * 0.006 + phase) * 0.55;
          let angle = Math.abs(dx) + Math.abs(dy) > 0.001 ? Math.atan2(dy, dx) + Math.PI / 2 : base;
          angle += tilt;
          if (previousAngle !== undefined) {
            let turn = Math.atan2(Math.sin(angle - previousAngle), Math.cos(angle - previousAngle));
            if (Math.abs(turn) > Math.PI / 2) turn -= Math.sign(turn) * Math.PI;
            angle = previousAngle + turn * 0.25;
          }
          previousAngle = angle;
          x += Math.cos(angle) * (long ? 2.1 : 1.5) * size / 720;
          y += Math.sin(angle) * (long ? 2.1 : 1.5) * size / 720;
          pen.lineTo(x, y);
        }
        pen.stroke();
      }
    }
    pen.restore();
    if (a.sheet === 'folio') {
      pen.strokeStyle = css(ink, 0.46); pen.lineWidth = 0.7;
      pen.strokeRect(margin * 0.48, margin * 0.48, size - margin * 0.96, size - margin * 0.96);
      pen.strokeStyle = css(ink, 0.22);
      pen.strokeRect(margin * 0.65, margin * 0.65, size - margin * 1.3, size - margin * 1.3);
      // A compass glyph belongs to the print; no invented place names or measurements.
      const cx = size - margin * 2.15, cy = margin * 2.15, radius = size * 0.015;
      pen.fillStyle = css(paper, 0.86); pen.beginPath(); pen.arc(cx, cy, radius * 1.7, 0, Math.PI * 2); pen.fill();
      pen.strokeStyle = css(ink, 0.66); pen.fillStyle = css(ink, 0.7);
      pen.beginPath(); pen.moveTo(cx, cy - radius); pen.lineTo(cx + radius * 0.27, cy); pen.lineTo(cx, cy + radius); pen.lineTo(cx - radius * 0.27, cy); pen.closePath(); pen.stroke();
      pen.beginPath(); pen.moveTo(cx, cy - radius); pen.lineTo(cx, cy); pen.lineTo(cx - radius * 0.27, cy); pen.closePath(); pen.fill();
      pen.beginPath(); pen.moveTo(cx - radius * 0.8, cy); pen.lineTo(cx + radius * 0.8, cy); pen.stroke();
    }
    signal.throwIfAborted();
    return { pixels: pen.getImageData(0, 0, size, size).data, notes: [`${a.plate} plate in ${a.palette} mineral inks`, `${a.interval} contours surveying ${a.measure}, ${a.hatching} shading`, `${a.sheet} sheet, ${a.grid} surveying marks`] };
  },
});
