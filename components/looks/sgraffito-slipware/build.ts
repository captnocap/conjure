import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';

const noise = (x: number, y: number, seed: number) => {
  let h = Math.imul(x | 0, 1597334677) ^ Math.imul(y | 0, 3812015801) ^ seed;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

export default defineLook({
  questions: {
    body: choice('What fired clay is exposed through the scratched slip? Its hues follow the picture palette.', {
      red: 'Rich earthenware with a dark warm body and creamy slip.',
      black: 'Dense almost-black clay under an ivory slip.',
      buff: 'Pale sandy stoneware under a darker engobe.',
      iron: 'Iron-speckled clay under a softly translucent light slip.',
    }),
    tool: choice('Which tool cuts the image through the slip?', {
      needle: 'Thin needle incisions, close and precise.',
      loop: 'Wide loop-tool cuts with rounded edges.',
      comb: 'Parallel comb teeth drag three thin lines at once.',
      chisel: 'Firm broad chisel cuts alternate with narrow scratches.',
    }),
    field: choice('How are the shaded clay areas carved?', {
      hatch: 'Short diagonal hatching packs into the shadows.',
      curve: 'Curving scratches follow the surfaces and their normals.',
      stipple: 'Small pinpricks pierce the slip in clusters.',
      islands: 'Broad scraped clay islands are joined by fine incisions.',
    }),
    cut: score('How much of the coloured slip is scraped away?', ['Fine outlines only', 'Light incisions', 'Half carved', 'Broad exposed clay', 'Heavily scraped relief']),
    relief: score('How deep do the incisions appear under grazing kiln light?', ['Flat decoration', 'A slight lip', 'Clear incised edge', 'Deep grooves', 'Thick carved relief']),
    glaze: choice('What glaze covers the decorated ceramic?', {
      dry: 'Unglazed matte clay, soft and tactile.',
      clear: 'A clear gloss with a broad gentle sheen.',
      crackle: 'A transparent crackle glaze with fine irregular crazing.',
      pooled: 'A thick honey glaze pooled in the carved cuts.',
    }),
    border: choice('How is the decorated tile or platter edged?', {
      full: 'Decoration continues to the edge.',
      line: 'A narrow pair of hand-cut lines frames the tile.',
      scallop: 'A scalloped border cut into the outer rim.',
      dash: 'A broad rim with alternating short carved notches.',
    }),
    firing: choice('What happened in the kiln?', {
      even: 'An even firing with clear slip and clay.',
      freckles: 'Fine iron freckles cluster through the body.',
      smoke: 'A soft smoky reduction stain darkens one corner.',
      blush: 'A pale flashed patch opens along the upper edge.',
    }),
    slip: choice('How was the slip applied before carving?', {
      smooth: 'Even dipped slip with a quiet surface.',
      brushed: 'Broad horizontal brush ridges remain under the cuts.',
      poured: 'A poured slip with slow curving flow bands.',
      sponged: 'A softly mottled sponged coat.',
    }),
    history: choice('What physical trace remains on the ceramic?', {
      fresh: 'A freshly fired intact tile.',
      chips: 'Small chips expose the clay along the lower rim.',
      repaired: 'One fine pale repair seam crosses the decoration.',
      fragment: 'A chipped corner makes the object feel excavated.',
    }),
  },
  async apply(capture, a, context, signal) {
    const { size, color, identity, normal } = capture;
    const out = new Uint8ClampedArray(size * size * 4), unit = size / 720;
    const palettes = {
      red: { clay: [99, 46, 32], slip: [235, 219, 174], pool: [161, 100, 40] },
      black: { clay: [36, 35, 31], slip: [240, 231, 204], pool: [117, 112, 78] },
      buff: { clay: [217, 185, 132], slip: [73, 88, 77], pool: [129, 142, 112] },
      iron: { clay: [93, 68, 51], slip: [221, 212, 182], pool: [158, 131, 77] },
    } as const;
    const colours = rekey(palettes[a.body], context.palette, { clay: 'ink', slip: 'ground', pool: 'second' });
    const step = Math.max(1, Math.round(unit));
    const lum = (p: number) => (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
    const bounds = new Map<number, number[]>();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const id = identity[(y * size + x) * 4];
      const b = bounds.get(id) ?? [x, y, x, y];
      b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y);
      bounds.set(id, b);
    }
    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) { signal.throwIfAborted(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4, u = x / size, v = y / size;
        const right = (y * size + Math.min(size - 1, x + step)) * 4;
        const down = (Math.min(size - 1, y + step) * size + x) * 4;
        const id = identity[p];
        const luminance = lum(p), shade = id === 0 ? 0 : clamp01((1 - luminance) * 1.2);
        const edge = identity[p] !== identity[right] || identity[p] !== identity[down] || Math.abs(normal[p] - normal[right]) + Math.abs(normal[p + 1] - normal[down + 1]) > 68;
        const xx = x / unit, yy = y / unit;
        const nx = normal[p] / 255 * 2 - 1, ny = normal[p + 1] / 255 * 2 - 1;
        const direction = a.field === 'curve' ? xx * (0.65 + nx * 0.25) + yy * (0.45 + ny * 0.3) : xx + yy * 0.7;
        const b = bounds.get(id)!;
        const extent = Math.max(b[2] - b[0], b[3] - b[1]) / unit;
        const markScale = Math.max(0.22, Math.min(1, extent / 380));
        const tooth = { needle: 1.15, loop: 0.65, comb: 1.25, chisel: 0.55 }[a.tool] / markScale;
        let line = Math.sin(direction * tooth);
        if (a.tool === 'comb') line = Math.min(line, Math.sin(direction * 0.24) + 0.25);
        const amount = shade * mix(0.18, 1.15, a.cut) * (id === 1 ? 0.45 : 1);
        let cut = edge ? 1 : line > 1 - amount * 1.4 ? 0.8 : 0;
        if (a.field === 'stipple' && !edge) cut = noise(Math.floor(xx), Math.floor(yy), context.seed) < amount * 0.48 ? 0.9 : 0;
        if (a.field === 'islands' && !edge) cut = shade > 0.44 - a.cut * 0.16 ? 0.95 : cut * 0.3;
        const distance = Math.min(u, v, 1 - u, 1 - v);
        if (a.border !== 'full' && distance < 0.036) {
          const rim = distance > 0.025 && distance < 0.028 || distance > 0.011 && distance < 0.014;
          const along = Math.min(u, 1 - u) < Math.min(v, 1 - v) ? yy : xx;
          cut = rim || (a.border === 'dash' && distance > 0.016 && distance < 0.024 && along % 18 < 5) || (a.border === 'scallop' && Math.abs(distance - 0.021 - Math.sin(along * 0.1) * 0.005) < 0.0018) ? 1 : 0;
        }
        let surface = (noise(x, y, context.seed + 13) - 0.5) * 3;
        if (a.slip === 'brushed') surface += Math.sin(yy * 0.45 + Math.sin(xx * 0.025)) * 3;
        if (a.slip === 'poured') surface += Math.sin(yy * 0.065 + Math.sin(xx * 0.02) * 2) * 4;
        if (a.slip === 'sponged') surface += (noise(Math.floor(xx / 4), Math.floor(yy / 4), context.seed) - 0.5) * 9;
        if (a.firing === 'freckles' && noise(Math.floor(xx), Math.floor(yy), context.seed + 72) > 0.992) cut = 0.65;
        if (a.firing === 'smoke') surface -= 35 * Math.exp(-((u - 0.05) ** 2 + (v - 0.9) ** 2) * 10);
        if (a.firing === 'blush') surface += 15 * Math.exp(-((u - 0.6) ** 2 + (v - 0.1) ** 2) * 18);
        const crack = a.glaze === 'crackle' && Math.abs(Math.sin(xx * 0.035 + Math.sin(yy * 0.022) * 2.1)) < 0.024;
        if (crack) surface -= 23;
        const chip = a.history === 'chips' && v > 0.986 - noise(Math.floor(xx / 7), 0, context.seed) * 0.012;
        if (chip || a.history === 'fragment' && u + v > 1.91) cut = 1;
        const repair = a.history === 'repaired' && Math.abs(u - 0.62 + Math.sin(v * 11) * 0.035) < 0.0017;
        const sheen = a.glaze === 'dry' ? 0 : Math.exp(-((u - 0.32) ** 2 / 0.13 + (v - 0.25) ** 2 / 0.035)) * 12;
        for (let c = 0; c < 3; c++) {
          const field = mix(colours.slip[c], colours.clay[c], shade * 0.58);
          let value = mix(field, colours.clay[c], cut);
          if (a.glaze === 'pooled') value = mix(value, colours.pool[c], cut * 0.24);
          const lip = edge ? -a.relief * 16 : cut > 0 ? a.relief * Math.cos(direction * tooth) * 7 : 0;
          out[p + c] = repair ? colours.slip[c] + 12 : value + surface + sheen + lip;
        }
        out[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels: out, notes: [`${a.tool} cut ${a.field} through ${a.slip} slip`, `${a.body} body, ${a.glaze} glaze, ${a.firing} firing`, `${a.history} ceramic with ${a.border} border`] };
  },
});
