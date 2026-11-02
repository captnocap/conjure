import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';

const hash = (x: number, y: number, seed: number) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const fract = (x: number) => x - Math.floor(x);

export default defineLook({
  questions: {
    curl: choice('How are the paper strips curled?', {
      spiral: 'Loose round spirals show a clearly open centre.',
      tight: 'Closely rolled concentric coils pack into tiny buttons.',
      leaf: 'Pinched elongated leaf coils follow the subject’s surfaces.',
      scroll: 'Paired S-shaped scrolls curl in opposite directions.',
    }),
    gauge: score('How fine are the individual quilled shapes?', ['Broad decorative curls', 'Open large coils', 'Medium quilling', 'Fine paper curls', 'Minute close quilling']),
    strip: choice('What kind of paper strips are used?', {
      plain: 'Plain dyed paper with a lighter cut edge.',
      gilt: 'A fine golden edge runs along each coloured strip.',
      white: 'White-faced strips have coloured sides and pale tops.',
      corrugated: 'Small corrugations ripple along each strip.',
    }),
    arrangement: choice('How are the coils arranged inside each subject?', {
      rows: 'Quiet rows of matching coils.',
      stagger: 'Close-packed alternating rows like a flowerbed.',
      flow: 'Coils turn along the subject’s captured surface direction.',
      scatter: 'Small variations of turn and size make the assembly feel hand placed.',
    }),
    palette: choice('What family of paper colours carries the scene? Hues follow the picture palette.', {
      garden: 'Soft green, ochre and rose paper with dark outlines.',
      jewel: 'Deep bright paper colours with pale glinting edges.',
      pastel: 'Pale powder colours beside fine charcoal outlines.',
      ivory: 'Ivory and sepia strips make a restrained monochrome keepsake.',
    }),
    relief: score('How tall do the paper strips stand above the backing?', ['Almost flat', 'Low edge', 'Clear paper relief', 'Tall curls', 'Deep cast shadows']),
    outline: choice('How are the silhouettes edged?', {
      dark: 'A dark continuous paper strip describes each silhouette.',
      light: 'A pale edge strip catches the outline.',
      double: 'Two close coloured strips reinforce the outer shape.',
      open: 'The individual coils end naturally at the silhouette.',
    }),
    backing: choice('What surface supports the paper curls?', {
      cream: 'Smooth warm cream backing card.',
      blue: 'A quiet dark blue board behind the paper.',
      kraft: 'Fibrous brown kraft board.',
      white: 'Clean white mounting card with a slight tooth.',
    }),
    frame: choice('What finishes the quilled panel?', {
      none: 'The quilling extends to the edge of the backing.',
      strip: 'A narrow band of upright paper frames it.',
      petals: 'Small paper teardrops form a petalled border.',
      corners: 'Four curled corner ornaments leave the sides open.',
    }),
    state: choice('What stage of making does the panel show?', {
      finished: 'Every curl is glued down in a completed panel.',
      loose: 'A few loosely wound curls have opened up.',
      working: 'A small lower corner is still awaiting its paper strips.',
      restored: 'A compact patch uses slightly different replacement paper.',
    }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720;
    const pixels = new Uint8ClampedArray(size * size * 4);
    const palettes = {
      garden: { ink: [45, 65, 53], middle: [133, 145, 93], light: [242, 229, 196], accent: [186, 111, 94] },
      jewel: { ink: [38, 35, 70], middle: [106, 95, 151], light: [234, 222, 203], accent: [185, 90, 57] },
      pastel: { ink: [69, 70, 83], middle: [176, 181, 190], light: [248, 236, 221], accent: [189, 146, 161] },
      ivory: { ink: [67, 51, 40], middle: [178, 153, 116], light: [241, 229, 198], accent: [157, 119, 72] },
    } as const;
    const dyes = rekey(palettes[a.palette], context.palette, { ink: 'ink', middle: 'second', light: 'ground', accent: 'second' });
    const back = { cream: [235, 225, 204], blue: [47, 61, 75], kraft: [167, 138, 99], white: [244, 242, 234] }[a.backing];
    const bounds = new Map<number, number[]>();
    for (let y = 0; y < size; y++) {
      if (y % 96 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const id = identity[(y * size + x) * 4], b = bounds.get(id) ?? [x, y, x, y];
        b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); bounds.set(id, b);
      }
    }
    const step = Math.max(1, Math.round(unit));
    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, id = identity[p], b = bounds.get(id)!;
        const cell = id >= 3 ? Math.max(4 * unit, Math.min(mix(20, 8, a.gauge) * unit, Math.max(b[2] - b[0], b[3] - b[1]) / 13)) : mix(20, 8, a.gauge) * unit;
        const row = Math.floor(y / cell), shift = a.arrangement === 'stagger' ? row % 2 * 0.5 : 0;
        const col = Math.floor(x / cell - shift), cx = (col + shift + 0.5) * cell, cy = (row + 0.5) * cell;
        let dx = (x - cx) / cell, dy = (y - cy) / cell;
        const angle = a.arrangement === 'flow' ? Math.atan2(normal[p + 1] - 128, normal[p] - 128) : a.arrangement === 'scatter' ? hash(col, row, context.seed) * Math.PI : 0;
        const oldX = dx; dx = oldX * Math.cos(angle) - dy * Math.sin(angle); dy = oldX * Math.sin(angle) + dy * Math.cos(angle);
        if (a.curl === 'leaf') { dx *= 0.85; dy *= 1.55; }
        if (a.curl === 'scroll') { dx = (dx < 0 ? dx + 0.23 : dx - 0.23) * 1.8; dy *= dx < 0 ? 1 : -1; }
        const loose = a.state === 'loose' && hash(col, row, context.seed + 19) > 0.88;
        const radius = Math.hypot(dx, dy), theta = Math.atan2(dy, dx);
        const turns = a.curl === 'tight' ? 2.6 : loose ? 0.8 : 1.6;
        const phase = radius * turns * 2 - (a.curl === 'tight' ? 0 : theta / (Math.PI * 2));
        const loop = fract(phase), width = Math.min(0.42, 0.14 + 0.5 * unit / cell);
        const cut = Math.abs(loop - 0.5) / width;
        const ribbon = cut < 1 && radius < 0.49;
        const shadow = Math.abs(fract(phase - 0.06 - a.relief * 0.12) - 0.5) < width * 1.35 && radius < 0.51;
        const sample = (Math.max(0, Math.min(size - 1, Math.round(cy))) * size + Math.max(0, Math.min(size - 1, Math.round(cx)))) * 4;
        const q = identity[sample] === id ? sample : p;
        const lum = clamp01(((color[q] * 0.2126 + color[q + 1] * 0.7152 + color[q + 2] * 0.0722) * 0.4 + (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) * 0.6) / 255);
        const right = (y * size + Math.min(size - 1, x + step)) * 4, down = (Math.min(size - 1, y + step) * size + x) * 4;
        const contour = id >= 2 && (id !== identity[right] || id !== identity[down] || Math.abs(normal[p] - normal[right]) + Math.abs(normal[p + 1] - normal[down + 1]) > 95);
        const interior = id >= 2 && (Math.abs(color[p] - color[right]) + Math.abs(color[p + 1] - color[down + 1]) > 65);
        const farther = (y * size + Math.min(size - 1, x + step * 3)) * 4;
        const outer = a.outline === 'double' && id >= 2 && id !== identity[farther];
        const u = x / size, v = y / size, edge = Math.min(u, v, 1 - u, 1 - v);
        const border = a.frame === 'strip' ? edge > 0.017 && edge < 0.023 : a.frame === 'petals' ? edge < 0.034 && Math.abs(Math.sin((x + y) / unit * 0.21)) > 0.4 : a.frame === 'corners' && edge < 0.085 && (u < 0.085 || u > 0.915) && (v < 0.085 || v > 0.915);
        const blank = a.state === 'working' && u + v > 1.77;
        for (let c = 0; c < 3; c++) {
          let paper = lum < 0.5 ? mix(dyes.ink[c], dyes.middle[c], lum * 2) : mix(dyes.middle[c], dyes.light[c], lum * 2 - 1);
          if (a.palette !== 'ivory') paper = mix(paper, color[q + c], 0.25);
          if (a.state === 'restored' && u > 0.77 && u < 0.9 && v > 0.77 && v < 0.91) paper = dyes.accent[c];
          const backing = id === 0 ? back[c] : mix(back[c], paper, 0.48);
          let value = backing + (hash(x, y, context.seed + 3) - 0.5) * (a.backing === 'kraft' ? 7 : 2);
          if (shadow && id !== 0) value *= mix(0.88, 0.48, a.relief);
          if (ribbon && id !== 0) {
            value = paper + (1 - cut) * 28 - cut * a.relief * 35 + (-dx - dy) * 11;
            if (a.strip === 'gilt' && cut < 0.3) value = mix(value, [213, 178, 91][c], 0.75);
            if (a.strip === 'white' && cut < 0.42) value = mix(value, 246, 0.7);
            if (a.strip === 'corrugated') value += Math.sin(theta * 25 + radius * 30) * 13;
          }
          if (interior) value = mix(value, dyes.ink[c], 0.48);
          if (contour && a.outline !== 'open' || outer) value = a.outline === 'light' ? dyes.light[c] : dyes.ink[c];
          if (border && ribbon) value = dyes.accent[c] + (1 - cut) * 15;
          if (blank) value = back[c];
          pixels[p + c] = value;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.curl} curls in ${a.arrangement}, ${a.strip} strips`, `${a.palette} paper over ${a.backing} backing`, `${a.outline} outlines, ${a.frame} frame, ${a.state} panel`] };
  },
});
