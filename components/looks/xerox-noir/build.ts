import { choice, clamp01, defineLook, mix, score, seeded } from '@conjure/kit';

type RGB = readonly [number, number, number];
const INKS: Record<string, { black: RGB; low: RGB; hot: RGB; flash: RGB; drift: RGB }> = {
  cyan: { black: [7, 12, 18], low: [20, 44, 48], hot: [29, 216, 212], flash: [190, 252, 229], drift: [78, 94, 157] },
  ember: { black: [25, 12, 28], low: [71, 32, 55], hot: [236, 91, 47], flash: [255, 191, 92], drift: [137, 70, 125] },
  acid: { black: [16, 18, 23], low: [48, 55, 37], hot: [202, 220, 57], flash: [253, 247, 189], drift: [67, 138, 144] },
  violet: { black: [18, 11, 29], low: [53, 35, 77], hot: [180, 108, 232], flash: [242, 192, 244], drift: [45, 190, 193] },
  vermilion: { black: [21, 15, 22], low: [57, 38, 47], hot: [229, 57, 64], flash: [250, 161, 133], drift: [132, 126, 164] },
  bone: { black: [13, 17, 23], low: [42, 47, 58], hot: [195, 204, 190], flash: [245, 240, 219], drift: [129, 154, 175] },
};
const smooth = (lo: number, hi: number, value: number) => {
  const t = clamp01((value - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};
const grainAt = (x: number, y: number, seed: number) => {
  let hash = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ seed;
  hash = Math.imul(hash ^ hash >>> 13, 1274126177);
  return ((hash ^ hash >>> 16) >>> 0) / 4294967296;
};
function cloudAt(x: number, y: number, unit: number, seed: number) {
  const u = x / unit, v = y / unit, ix = Math.floor(u), iy = Math.floor(v);
  const tx = smooth(0, 1, u - ix), ty = smooth(0, 1, v - iy);
  return mix(mix(grainAt(ix, iy, seed), grainAt(ix + 1, iy, seed), tx), mix(grainAt(ix, iy + 1, seed), grainAt(ix + 1, iy + 1, seed), tx), ty);
}

export default defineLook({
  questions: {
    process: choice('Which electrographic reproduction process transforms the frame?', {
      toner: 'A hard-charged toner print: coarse, luminous pigment islands preserve the original light and shadow.',
      recopy: 'A photocopy of a photocopy: details clot together, edges fray, and dragged pigment leaves ghost impressions.',
      reversal: 'A photographic reversal copied onto black: shadow shapes burn bright while the lights fall into darkness.',
      relief: 'An electrostatic relief copy: surface ridges, folds and boundaries catch the pigment like a rubbed printing plate.',
    }),
    inks: choice('Which hot pigment burns through the black stock?', {
      cyan: 'Acid cyan and pale mint on blue-black, with a cold violet separation.',
      ember: 'Orange ember and incandescent gold on deep plum, with bruised magenta shadows.',
      acid: 'Sulphur yellow and bone white on graphite, with oxidized turquoise drift.',
      violet: 'Ultraviolet and pale orchid on aubergine, with a little electric cyan.',
      vermilion: 'Hot vermilion and pale salmon on soot, with a dusty lilac echo.',
      bone: 'Chalk-white and dirty silver on blue-black, like a copy room after midnight.',
    }),
    shadows: choice('What survives in the dark parts of the copied scene?', {
      crushed: 'Crushed absolute dark: only the strongest pigment and structural edges survive.',
      bruised: 'Dense tinted shadows retain a little internal volume and a plum-like undertone.',
      ghost: 'A faint second exposure holds the dark forms together like smoke beneath the toner.',
    }),
    charge: score('How heavily is the electrostatic plate charged with pigment?', ['A sparse brittle transfer', 'Light pigment', 'Balanced', 'Heavy toner masses', 'Dense clogged pigment']),
    erosion: score('How incomplete is the pigment transfer?', ['Unbroken pigment', 'Tiny pinholes', 'Dry ragged areas', 'Scraped and pitted', 'Large missing toner islands']),
    surface: choice('What marks does the copy bed impress into the image?', {
      powder: 'Fine scattered toner dust, with no directional scratches.',
      scuff: 'Dry rubbed patches and shallow diagonal scuffs across the toner.',
      roller: 'Thin broken roller tracks and occasional uneven vertical pigment bands.',
      cracked: 'Irregular little fractures, like a print folded and copied flat again.',
    }),
    separation: choice('How do the two pigment impressions align?', {
      exact: 'A single precisely registered impression.',
      slipped: 'A narrow coloured edge slips a couple of pixels from the main print.',
      dragged: 'A longer uneven colour ghost trails one side of the shapes.',
      doubled: 'Two opposing faint impressions produce an unsettled double edge.',
    }),
    hotspot: choice('How is the strongest pigment distributed across the picture?', {
      even: 'Even pigment strength across the whole copied field.',
      focused: 'One broad hot pool of pigment concentrates around the main subject.',
      flare: 'A fierce off-centre flare leaves one bright region and lets the rest fall into black.',
    }),
    edge: choice('What remains around the copied image?', {
      full: 'The electrographic field runs right to the sheet edges.',
      rebate: 'A narrow black copy-bed rebate, broken by little flecks of pigment.',
      torn: 'A ragged unprinted dark margin surrounds the image.',
    }),
  },

  async apply(capture, a, context, signal) {
    const pause = async () => {
      signal.throwIfAborted();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      signal.throwIfAborted();
    };
    await pause();
    const { size, color, normal, identity, depth } = capture, count = size * size;
    const { black, low, hot, flash, drift } = INKS[a.inks];
    const random = seeded(context.seed ^ 0x5ea74b3f);
    const luminance = new Float32Array(count), distance = new Float32Array(count);
    const field = new Float32Array(count), edges = new Float32Array(count), pigment = new Float32Array(count);
    let backgroundTotal = 0, backgroundCount = 0, subjectX = 0, subjectY = 0, subjectCount = 0;
    let near = 1, far = 0;
    for (let y = 0; y < size; y++) {
      if (y % 64 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const o = y * size + x, p = o * 4;
        luminance[o] = (color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255;
        distance[o] = (depth[p] + depth[p + 1] / 256 + depth[p + 2] / 65536) / 255;
        if (identity[p] === 0) { backgroundTotal += luminance[o]; backgroundCount++; }
        else { near = Math.min(near, distance[o]); far = Math.max(far, distance[o]); }
        if (identity[p] >= 2) { subjectX += x; subjectY += y; subjectCount++; }
      }
    }
    const backdrop = backgroundCount ? backgroundTotal / backgroundCount : 1;
    const depthRange = Math.max(0.001, far - near);
    const centreX = subjectCount ? subjectX / subjectCount / size : 0.5;
    const centreY = subjectCount ? subjectY / subjectCount / size : 0.5;
    const hotX = clamp01(centreX + (random() - 0.5) * (a.hotspot === 'flare' ? 0.5 : 0.12));
    const hotY = clamp01(centreY + (random() - 0.5) * (a.hotspot === 'flare' ? 0.38 : 0.1));
    const driftSign = random() < 0.5 ? -1 : 1;
    const displacement = a.separation === 'exact' ? 0 : a.separation === 'slipped' ? 2 : a.separation === 'dragged' ? 7 : 4;
    const shift = Math.max(1, Math.round(displacement * size / 720));
    const clusterSeed = context.seed ^ 0x912effe3, fractureSeed = context.seed ^ 0x63ae91bd;
    const damage = a.erosion * (0.78 + context.mood.wear * 0.22);
    const threshold = 0.68 - a.charge * 0.36;
    const isRecopy = a.process === 'recopy';
    const edgeWidth = Math.max(1, Math.round(size / 720 * (isRecopy ? 2 : 1)));
    const margin = a.edge === 'full' ? 0 : size * (a.edge === 'torn' ? 0.034 : 0.024);

    for (let y = 0; y < size; y++) {
      if (y % 48 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const o = y * size + x, p = o * 4, id = identity[p];
        const right = y * size + Math.min(size - 1, x + edgeWidth);
        const below = Math.min(size - 1, y + edgeWidth) * size + x;
        const left = y * size + Math.max(0, x - edgeWidth);
        const above = Math.max(0, y - edgeWidth) * size + x;
        let structural = 0, tonal = 0;
        for (const at of [right, below, left, above]) {
          const q = at * 4;
          const difference = identity[q] !== id ? 0.9 : Math.max(
            (Math.abs(normal[p] - normal[q]) + Math.abs(normal[p + 1] - normal[q + 1]) + Math.abs(normal[p + 2] - normal[q + 2])) / 450,
            Math.abs(distance[o] - distance[at]) / depthRange * 1.8,
          );
          structural = Math.max(structural, difference);
          tonal = Math.max(tonal, Math.abs(luminance[o] - luminance[at]));
        }
        edges[o] = clamp01(structural * 0.68 + tonal * 0.75);
        // Identity distinguishes objects from paper, while colour contrast retains
        // stars, sprites and transparent glows absent from the auxiliary passes.
        const luminousBackdrop = clamp01(Math.abs(luminance[o] - backdrop) * 1.8);
        let tone = luminance[o];
        if (a.process === 'reversal') tone = 1 - tone;
        if (a.process === 'relief') tone = tone * 0.56 + (normal[p + 1] / 255) * 0.24 + edges[o] * 0.66;
        else tone = tone * 0.86 + edges[o] * (isRecopy ? 0.22 : 0.14);
        // The world's pale floor is the unprinted stock, not a solid sheet of toner.
        // Keep its contact shadows low so the objects have true negative space.
        const visibility = id >= 2 ? 1 : id === 1 ? 0.18 + (1 - luminance[o]) * 0.48 : luminousBackdrop;
        field[o] = clamp01(tone * visibility + edges[o] * (id >= 2 ? 0.14 : 0.06));
        const clustered = cloudAt(x, y, Math.max(2, size / 47), clusterSeed);
        const grit = grainAt(Math.floor(x / (isRecopy ? 2 : 1)), Math.floor(y / (isRecopy ? 2 : 1)), context.seed);
        const transfer = field[o] + (clustered - 0.5) * (isRecopy ? 0.32 : 0.2) + (grit - 0.5) * (0.08 + damage * 0.14);
        const charged = smooth(threshold - 0.07, threshold + 0.07, transfer);
        let loss = smooth(0.60 - damage * 0.10, 0.88, clustered) * damage * 0.65;
        if (grit > 1 - damage * 0.15) loss = Math.max(loss, 0.84);
        if (a.surface === 'scuff') {
          const scratch = Math.abs(Math.sin(x * 0.09 + y * 0.62 + cloudAt(x, y, 35, fractureSeed) * 8));
          loss += scratch > 0.996 ? damage * 0.72 : 0;
        } else if (a.surface === 'roller') {
          const column = grainAt(Math.floor(x / Math.max(1, size / 480)), 0, fractureSeed);
          loss += column > 0.975 && cloudAt(x, y, 47, fractureSeed) > 0.38 ? 0.34 + damage * 0.5 : 0;
        } else if (a.surface === 'cracked') {
          const fracture = cloudAt(x, y, Math.max(7, size / 24), fractureSeed);
          loss += Math.abs(fracture - 0.51) < 0.006 + damage * 0.006 ? damage * 0.83 : 0;
        }
        pigment[o] = clamp01(charged * (1 - clamp01(loss)));
      }
    }

    const pixels = new Uint8ClampedArray(count * 4);
    for (let y = 0; y < size; y++) {
      if (y % 40 === 0) await pause();
      for (let x = 0; x < size; x++) {
        const o = y * size + x, p = o * 4, id = identity[p];
        const u = (x + 0.5) / size, v = (y + 0.5) / size;
        const hotDistance = ((u - hotX) / 0.45) ** 2 + ((v - hotY) / 0.45) ** 2;
        const hotPool = a.hotspot === 'even' ? 0.55 : Math.exp(-hotDistance * (a.hotspot === 'flare' ? 1.6 : 0.9));
        const focus = a.hotspot === 'even' ? 1 : a.hotspot === 'flare' ? 0.45 + hotPool * 0.55 : 0.75 + hotPool * 0.25;
        const dense = pigment[o] * focus;
        const halfway = a.shadows === 'crushed' ? 0 : a.shadows === 'bruised' ? field[o] * 0.55 : field[o] * 0.84;
        const ghostX = Math.max(0, Math.min(size - 1, x - shift * driftSign));
        const ghostY = Math.max(0, y - (a.separation === 'dragged' ? Math.round(shift / 3) : 0));
        const shifted = pigment[ghostY * size + ghostX];
        const other = pigment[y * size + Math.max(0, Math.min(size - 1, x + shift * driftSign))];
        const mismatch = displacement ? Math.max(0, shifted - pigment[o]) * (a.separation === 'dragged' ? 0.66 : 0.8)
          + (a.separation === 'doubled' ? Math.max(0, other - pigment[o]) * 0.43 : 0) : 0;
        const sparkle = smooth(0.82, 1, field[o]) * dense * (0.2 + hotPool * 0.45);
        const trace = edges[o] * (a.process === 'relief' ? 0.5 : 0.13) * (0.7 + a.charge * 0.3);
        const fleck = random();
        const dust = fleck > 0.9985 - damage * 0.001 && (id > 0 || a.edge === 'rebate') ? (fleck - 0.997) * 95 : 0;
        const paperNoise = (grainAt(x, y, fractureSeed) - 0.5) * (1 + context.mood.wear * 1.4);
        const rag = a.edge === 'torn' ? (cloudAt(x, y, 11, fractureSeed) - 0.5) * size * 0.014 : 0;
        const inRebate = Math.min(x, y, size - 1 - x, size - 1 - y) < margin + rag;
        for (let c = 0; c < 3; c++) {
          let value = mix(black[c], low[c], halfway);
          value = mix(value, drift[c], clamp01(mismatch * focus));
          value = mix(value, hot[c], clamp01(dense + trace + dust));
          value = mix(value, flash[c], sparkle);
          if (inRebate) value = black[c] + (a.edge === 'rebate' && dust > 0 ? (hot[c] - black[c]) * dust * 0.28 : 0);
          pixels[p + c] = value + paperNoise;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.process} electrograph in ${a.inks} pigment on black stock`, `${a.shadows} shadows, ${a.surface} transfer, ${a.separation} separations`, `${a.hotspot} hot pigment, ${a.edge} sheet edges`] };
  },
});
