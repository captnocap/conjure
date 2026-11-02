import { choice, defineLook, noul, rekeyOne, score } from '@conjure/kit';

/**
 * The capture's confidence channel decides what gets inked: the model's belonging for each
 * placed thing. Certain things are drawn in ink; doubtful ones stay graphite, with the
 * construction lines an artist leaves under an unresolved part of a drawing.
 */
const PAPERS = {
  white: { hex: '#f7f5ee', description: 'Bright white cartridge paper.' },
  cream: { hex: '#efe6d0', description: 'Soft tinted sketchbook paper, pale and warm in feel.' },
  grey: { hex: '#d6d6d0', description: 'Mid-toned paper, a little darker, for highlights to sit on.' },
  kraft: { hex: '#c9ad85', description: 'Brown kraft paper, like a wrapping-paper sketch.' },
} as const;
const INKS = {
  black: { hex: '#1a1a1c', description: 'Black India ink.' },
  sepia: { hex: '#4a2f1b', description: 'A soft, dark coloured ink, mellow like an old letter.' },
  indigo: { hex: '#1f2a52', description: 'A deep, dense coloured ink, nearly black in the darks.' },
  sanguine: { hex: '#7a3a2a', description: 'A lighter, chalky coloured ink, like an old master study.' },
} as const;
/** Black ink, white cartridge paper and kraft are materials and keep their colour; the coloured inks follow the palette's ink, the toned papers its ground. */
const FIXED = new Set(['black', 'white', 'kraft']);
const WASHES = { none: null, grey: '#8c8f93', tint: null } as const;
const THRESHOLDS = { most: 0.35, balanced: 0.55, sparing: 0.75 } as const;

const rgb = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export default defineLook({
  questions: {
    paper: choice('What paper is the drawing on?', Object.fromEntries(Object.entries(PAPERS).map(([key, paper]) => [key, paper.description])) as Record<keyof typeof PAPERS, string>),
    ink: choice('Which ink goes over the pencil? Coloured inks take the picture\u2019s palette.', Object.fromEntries(Object.entries(INKS).map(([key, ink]) => [key, ink.description])) as Record<keyof typeof INKS, string>),
    commitment: choice('How much of the drawing is committed to ink?', {
      most: 'Ink nearly everything; only real doubts stay pencil.',
      balanced: 'Ink what the artist was fairly sure of; the rest stays sketched.',
      sparing: 'Ink only the certainties; most of the scene remains a pencil study.',
    }),
    hatching: choice('How are the shadows drawn in ink?', {
      diagonal: 'Even diagonal hatching.',
      cross: 'Cross-hatching that deepens in the darks.',
      contour: 'Hatching that follows the form, like engraved contours.',
      flat: 'No hatching: outlines and solid black masses only.',
    }),
    pencil: score('How heavy is the pencil underdrawing?', ['A ghost of graphite', 'Light', 'A clear sketch', 'Dark and worked', 'Smudged and heavy']),
    construction: noul('Should faint construction lines, boxes and guide marks remain under the unresolved parts?'),
    wash: choice('Is there a wash over the inked parts?', {
      none: 'No wash: paper, pencil and ink only.',
      grey: 'A light grey wash in the shadows.',
      tint: 'A single wash of the ink colour, diluted.',
    }),
    weight: score('How bold are the ink lines?', ['Fine nib', 'Light', 'Medium', 'Bold brush', 'Heavy marker']),
  },

  async apply(capture, a, context, signal) {
    const { size, color, identity, normal, diffuse, confidence } = capture;
    const pixels = new Uint8ClampedArray(size * size * 4);
    const keyed = (hex: string, key: string, role: 'ink' | 'ground') => FIXED.has(key) ? rgb(hex) : [...rekeyOne(rgb(hex) as [number, number, number], context.palette, role)];
    const paper = keyed(PAPERS[a.paper].hex, a.paper, 'ground');
    const ink = keyed(INKS[a.ink].hex, a.ink, 'ink');
    const graphite = a.paper === 'kraft' || a.paper === 'grey' ? rgb('#3f4146') : rgb('#5a5c60');
    const washColour = a.wash === 'grey' ? rgb(WASHES.grey!) : a.wash === 'tint' ? ink.map((c, i) => lerp(c, paper[i], 0.55)) : null;
    const threshold = THRESHOLDS[a.commitment];
    const unit = Math.round(4 + (1 - a.weight) * 3);
    const lineWidth = Math.max(1, Math.round(1 + a.weight * 2.5));
    const pencilWeight = 0.25 + a.pencil * 0.75;

    // How surely each identity belongs: the ground and the set are certain; things carry the model's belonging.
    const inkOf = (id: number) => {
      if (id === 0) return 0;
      if (id <= 2) return 1;
      return smooth(threshold - 0.12, threshold + 0.08, confidence?.[id] ?? 1);
    };
    const ids = new Set<number>();
    const boxes = new Map<number, [number, number, number, number]>();
    for (let pixel = 0; pixel < size * size; pixel++) {
      const id = identity[pixel * 4];
      if (id < 3) continue;
      ids.add(id);
      const x = pixel % size, y = Math.floor(pixel / size);
      const box = boxes.get(id);
      if (!box) boxes.set(id, [x, y, x, y]);
      else {
        box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y);
        box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y);
      }
    }
    const sketched = [...ids].filter((id) => inkOf(id) < 0.5);
    const guides = a.construction ? sketched.map((id) => boxes.get(id)!) : [];
    const inked = ids.size - sketched.length;

    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) {
        signal.throwIfAborted();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4;
        const id = identity[p];
        const luminance = (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
        // The plain-lit pass shades without material colour, so a dark object still shows its form.
        const shade = Math.min(1, (diffuse[p] / 255) * 2.4);
        const dark = clamp01(1 - (luminance * 0.55 + shade * 0.45)) ;
        const noise = context.random();
        let edge = 0, soft = 0;
        for (const [dx, dy] of [[lineWidth, 0], [0, lineWidth], [1, 0], [0, 1]] as const) {
          const q = (Math.min(size - 1, y + dy) * size + Math.min(size - 1, x + dx)) * 4;
          const wide = dx > 1 || dy > 1;
          if (identity[p] !== identity[q]) { if (wide) edge = 1; else soft = 1; }
          else {
            const bend = (Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[q + 1])) / 140;
            if (wide) edge = Math.max(edge, bend); else soft = Math.max(soft, bend);
          }
        }
        const inkiness = inkOf(id);
        const setPart = id === 1 || id === 2;
        let value = [...paper];

        // Pencil underdrawing: everything that is not fully inked, and faintly the set.
        const pencilHere = id === 0 ? 0 : (1 - inkiness) + (setPart ? 0.18 : 0);
        if (pencilHere > 0) {
          const hatch = ((x + y + 1000) % 5 < dark * 2.6 ? 1 : 0) * dark;
          const tone = clamp01(hatch * 0.5 + Math.min(1, soft) * 0.55 + dark * 0.18 + (noise - 0.5) * 0.08) * pencilWeight;
          value = value.map((c, i) => lerp(c, graphite[i], Math.min(1, tone) * pencilHere * 0.85));
        }
        // Construction lines under unresolved things.
        if (guides.length) {
          for (const [x0, y0, x1, y1] of guides) {
            const onBox = (Math.abs(x - x0) <= 0 || Math.abs(x - x1) <= 0) && y >= y0 - 6 && y <= y1 + 6
              || (Math.abs(y - y0) <= 0 || Math.abs(y - y1) <= 0) && x >= x0 - 6 && x <= x1 + 6;
            const width = Math.max(1, x1 - x0), height = Math.max(1, y1 - y0);
            const onDiagonal = x >= x0 && x <= x1 && (Math.abs((y - y0) - (x - x0) * height / width) < 0.7 || Math.abs((y - y0) - (x1 - x) * height / width) < 0.7);
            const onCentre = (Math.abs(x - (x0 + x1) / 2) < 0.6 && y >= y0 && y <= y1) || (Math.abs(y - (y0 + y1) / 2) < 0.6 && x >= x0 && x <= x1);
            if (onBox || onDiagonal || onCentre) value = value.map((c, i) => lerp(c, graphite[i], 0.28 * pencilWeight));
          }
        }
        // Ink: outlines, and hatching or masses where it is dark.
        if (inkiness > 0) {
          const strength = setPart ? 0.6 : 1;
          let mark = 0;
          if (a.hatching !== 'flat') {
            const nx = normal[p] / 127.5 - 1, ny = normal[p + 1] / 127.5 - 1;
            const along = a.hatching === 'contour' ? x * nx + y * ny : x + y;
            const first = (((along % unit) + unit) % unit) < dark * unit * 0.55 ? 1 : 0;
            const second = a.hatching === 'cross' && (((x - y) % unit) + unit) % unit < (dark - 0.45) * unit * 1.1 ? 1 : 0;
            mark = (first || second) && dark > 0.3 ? 1 : 0;
            if (dark > 0.86) mark = 1;
          } else mark = dark > 0.62 ? 1 : 0;
          const inkHere = clamp01(Math.max(edge * 1.1, mark * (0.65 + dark * 0.35)) * strength * inkiness);
          if (washColour && inkHere < 0.9) value = value.map((c, i) => lerp(c, washColour[i], dark * 0.4 * inkiness * (setPart ? 0.5 : 1)));
          value = value.map((c, i) => lerp(c, ink[i], inkHere));
        }
        // Paper grain.
        const grain = (noise - 0.5) * 6;
        pixels[p] = value[0] + grain;
        pixels[p + 1] = value[1] + grain;
        pixels[p + 2] = value[2] + grain;
        pixels[p + 3] = 255;
      }
    }

    return {
      pixels,
      notes: [
        `${INKS[a.ink].description.replace(/\.$/, '')} on ${PAPERS[a.paper].description.replace(/\.$/, '').toLowerCase()}`,
        ids.size ? `${inked} of ${ids.size} things inked, ${sketched.length} left in pencil${a.construction && sketched.length ? ' with construction lines' : ''}` : 'an empty scene in pencil',
        `${a.hatching} hatching, ${a.wash === 'none' ? 'no wash' : `${a.wash} wash`}`,
      ],
    };
  },
});
