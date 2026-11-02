import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';

const hash = (x: number, y: number, seed: number) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
export default defineLook({
  questions: {
    compartments: choice('How does the metal divide the enamel?', {
      curved: 'Softly curved compartments bend with the depicted surfaces.',
      diamond: 'Small diagonal diamond cells make a formal decorative field.',
      petal: 'Rounded petal-shaped compartments curl around the larger forms.',
      rectilinear: 'Small ordered rectangular compartments hold the colours.',
    }),
    fineness: score('How finely is the wirework divided?', ['Large quiet compartments', 'Open decorative cells', 'Balanced small cells', 'Fine detailed wirework', 'Very fine miniature compartments']),
    wire: choice('What metal forms the raised partitions?', {
      gold: 'Warm golden wires with bright polished ridges.',
      silver: 'Cool silver wires with a white reflective ridge.',
      copper: 'Warm red copper, darkened beside the enamel.',
      blackened: 'Blackened metal wires with narrow bright rubbed edges.',
    }),
    thickness: score('How prominent are the metal partitions?', ['Hairline partitions', 'Fine wire', 'Clear raised divisions', 'Strong broad wires', 'Heavy decorative metal divisions']),
    palette: choice('What enamel colours lead the picture? Hues follow its palette.', {
      cobalt: 'Cobalt and turquoise enamel with pale ivory light.',
      ruby: 'Ruby, garnet and honey tones with pale gold light.',
      garden: 'Deep leaf green, moss and pale celadon enamel.',
      ivory: 'Warm ivory enamel with slate and dark bronze accents.',
    }),
    enamel: choice('How does the fired enamel hold light?', {
      opaque: 'Dense even enamel with a soft polished surface.',
      translucent: 'Clearer glassy enamel with a bright inner glow.',
      flecked: 'Tiny lighter inclusions sit beneath the glossy surface.',
      streaked: 'Fine flowing colour streaks remain inside each compartment.',
    }),
    polish: choice('How is the enamel surface finished?', {
      flat: 'Ground flat to meet the wire, with restrained highlights.',
      domed: 'Rounded enamel rises slightly within each compartment.',
      satin: 'A satin polish scatters the light into broad soft gleams.',
      mirror: 'Highly polished enamel carries small sharp glints.',
    }),
    backing: choice('What surrounds the enamel picture?', {
      enamel: 'A continuous field of enamel fills the outer ground.',
      brass: 'A gently brushed brass plate surrounds the coloured scene.',
      silver: 'A softly marked silver plate forms the backing.',
      velvet: 'Deep muted velvet surrounds the small enamel panel.',
    }),
    frame: choice('How is the edge of the panel finished?', {
      full: 'The enamel runs to the edge without a separate frame.',
      bezel: 'A plain raised metal bezel holds the panel.',
      beaded: 'A row of small metal beads follows the edge.',
      scroll: 'A fine scrolling wire border finishes the plate.',
    }),
    history: choice('What history is visible in the enamel?', {
      fresh: 'Freshly polished enamel with every compartment filled.',
      chipped: 'A few tiny chips reveal dark metal beneath the enamel.',
      repaired: 'One small area is filled with a contrasting repair colour.',
      unfinished: 'Some corner compartments still show bare metal awaiting enamel.',
    }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720;
    const pixels = new Uint8ClampedArray(size * size * 4);
    const palettes = {
      cobalt: { dark: [22, 43, 72], middle: [46, 125, 150], light: [226, 231, 214], accent: [196, 151, 70] },
      ruby: { dark: [69, 26, 35], middle: [164, 69, 61], light: [241, 218, 172], accent: [207, 150, 55] },
      garden: { dark: [28, 54, 43], middle: [85, 139, 103], light: [220, 228, 190], accent: [198, 143, 64] },
      ivory: { dark: [55, 54, 55], middle: [155, 153, 140], light: [240, 231, 205], accent: [130, 93, 53] },
    } as const;
    const dye = rekey(palettes[a.palette], context.palette, { dark: 'ink', middle: 'second', light: 'ground', accent: 'second' });
    const metal = { gold: [196, 153, 65], silver: [186, 194, 198], copper: [178, 107, 72], blackened: [56, 59, 61] }[a.wire];
    const bounds = new Map<number, { minX: number; minY: number; maxX: number; maxY: number }>();
    for (let y = 0; y < size; y++) {
      if (y % 64 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const id = identity[(y * size + x) * 4], b = bounds.get(id);
        if (b) { b.minX = Math.min(b.minX, x); b.maxX = Math.max(b.maxX, x); b.minY = Math.min(b.minY, y); b.maxY = Math.max(b.maxY, y); }
        else bounds.set(id, { minX: x, minY: y, maxX: x, maxY: y });
      }
    }
    const cells = new Map<number, number>();
    for (const [id, b] of bounds) cells.set(id, Math.max(3 * unit, Math.min(mix(36, 12, a.fineness) * unit, Math.max(b.maxX - b.minX, b.maxY - b.minY) / (id >= 3 ? 11 : 20))));
    const step = Math.max(1, Math.round(unit)), width = mix(0.012, 0.04, a.thickness);
    for (let y = 0; y < size; y++) {
      if (y % 40 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, id = identity[p], u = x / size, v = y / size;
        const cell = cells.get(id)!;
        let gx = (x + normal[p] * unit * 0.04) / cell, gy = (y + normal[p + 1] * unit * 0.04) / cell;
        if (a.compartments === 'curved') { gx += Math.sin(gy * 0.8) * 0.3; gy += Math.sin(gx * 0.7) * 0.25; }
        if (a.compartments === 'diamond') { const oldX = gx; gx = (gx + gy) * 0.71; gy = (gy - oldX) * 0.71; }
        if (a.compartments === 'petal') { gx += Math.sin(gy * Math.PI) * 0.32; gy += Math.sin(gx * Math.PI) * 0.3; }
        const fx = gx - Math.floor(gx), fy = gy - Math.floor(gy), edgeCell = Math.min(fx, 1 - fx, fy, 1 - fy);
        const q = (y * size + Math.min(size - 1, x + step)) * 4, r = (Math.min(size - 1, y + step) * size + x) * 4;
        const contour = id >= 1 && (id !== identity[q] || id !== identity[r] || Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[r + 1]) > 90);
        const edge = Math.min(u, v, 1 - u, 1 - v), along = Math.min(u, 1 - u) < Math.min(v, 1 - v) ? y / unit : x / unit;
        const rim = a.frame === 'bezel' ? edge < 0.016 : a.frame === 'beaded' ? edge < 0.022 && Math.sin(along * 0.55) > -0.5 : a.frame === 'scroll' && edge < 0.034 && Math.abs(Math.sin(along * 0.25 + Math.sin(edge * 190))) > 0.84;
        const wire = edgeCell < width || contour || rim;
        const tone = clamp01((color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255);
        const dome = Math.sin(fx * Math.PI) * Math.sin(fy * Math.PI);
        const glint = Math.exp(-((fx - 0.29) ** 2 + (fy - 0.25) ** 2) * (a.polish === 'mirror' ? 130 : 32));
        const grain = hash(Math.floor(gx), Math.floor(gy), context.seed);
        for (let c = 0; c < 3; c++) {
          let value = tone < 0.5 ? mix(dye.dark[c], dye.middle[c], tone * 2) : mix(dye.middle[c], dye.light[c], tone * 2 - 1);
          value = mix(value, color[p + c], 0.3);
          if (a.enamel === 'translucent') value += dome * 13 - (1 - dome) * 7;
          if (a.enamel === 'flecked' && hash(x, y, context.seed + 3) > 0.965) value = mix(value, dye.light[c], 0.26);
          if (a.enamel === 'streaked') value += Math.sin(fx * 24 + Math.sin(fy * 6) * 3) * 5;
          value += a.polish === 'flat' ? glint * 4 : a.polish === 'domed' ? dome * 9 + glint * 22 - 6 : a.polish === 'satin' ? dome * 7 : glint * 48 - (1 - dome) * 5;
          if (wire) value = mix(value, metal[c] + (edgeCell / width < 0.4 ? 35 : -28), contour || rim ? 1 : 0.78);
          if (id === 0 && a.backing !== 'enamel' && !rim) {
            const back = a.backing === 'brass' ? [176, 148, 91] : a.backing === 'silver' ? [179, 185, 182] : [47, 57, 57];
            value = back[c] + Math.sin(y / unit * 1.4) * (a.backing === 'velvet' ? 1.5 : 3);
          }
          if (a.history === 'chipped' && id >= 1 && !wire && grain > 0.985 && fx + fy < 0.65) value = metal[c] * 0.4;
          if (a.history === 'repaired' && u > 0.78 && u < 0.89 && v > 0.79 && v < 0.9 && !wire) value = mix(dye.accent[c], value, 0.22);
          if (a.history === 'unfinished' && u + v > 1.81 && !wire) value = metal[c] * 0.72 + dome * 12;
          pixels[p + c] = value;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.compartments} compartments with ${a.wire} wire`, `${a.palette} ${a.enamel} enamel, ${a.polish} polish`, `${a.backing} backing and ${a.frame} edge, ${a.history}`] };
  },
});
