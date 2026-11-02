import { choice, clamp01, defineLook, mix, rekey, score } from '@conjure/kit';

const hash = (x: number, y: number, seed: number) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const fract = (x: number) => x - Math.floor(x);

export default defineLook({
  questions: {
    lathe: choice('What repeating lathe curve engraves the picture?', {
      wave: 'Parallel undulating curves sweep through the tonal forms.',
      rosette: 'Small interlocking petalled rosettes fill each subject.',
      oval: 'Nested eccentric ovals make soft moiré-like fans.',
      braid: 'Two crossing curved line families weave a braided mesh.',
    }),
    eccentricity: score('How far do the lathe gears move off centre?', ['Nearly straight or circular', 'A restrained wave', 'Clearly lobed curves', 'Elaborate turning', 'Deeply interlaced curves']),
    pitch: score('How close are the engraved lines?', ['Open fine wires', 'Broad spaced curves', 'Even engraving', 'Closely ruled', 'Microscopic dense lines']),
    weight: score('How firmly are the fine engraved lines printed?', ['Hairline impression', 'Light fine print', 'Balanced line', 'Strong inked curves', 'Dense dark engraving']),
    inks: choice('What pair of security-print inks carries the picture? Hues follow the picture palette.', {
      forest: 'Deep forest green and muted bronze on cream paper.',
      plum: 'Aubergine and faded rose on pale ivory.',
      indigo: 'Dark indigo and restrained russet on pale blue-white.',
      sepia: 'Old sepia and warm ochre on pale rag paper.',
    }),
    separation: choice('How are the two ink plates separated?', {
      tone: 'The dark plate models shadows while the second ink fills middle tones.',
      subject: 'The second ink distinguishes the subjects from their surrounding set.',
      cross: 'The two crossing line families use different inks.',
      register: 'One ink prints the fine curves and the second reinforces outlines.',
    }),
    border: choice('What engine-turned border surrounds the engraving?', {
      none: 'The engraving continues across an unframed sheet.',
      rope: 'A narrow woven rope border runs around the sheet.',
      medals: 'Small circular corner medallions join a fine ruled frame.',
      oval: 'A large oval guilloché frame encloses the composition.',
    }),
    registration: choice('How do the engraved plates align?', {
      exact: 'The plates meet exactly with very crisp printing.',
      double: 'A faint second impression sits just beside the first.',
      diagonal: 'The second plate drifts slightly along a diagonal.',
      bowed: 'A softly bowed sheet shifts the curves across the image.',
    }),
    thread: choice('What additional fine security motif crosses the paper?', {
      none: 'Only the picture and its engine turning are printed.',
      vertical: 'One narrow vertical band carries an alternating tiny wave.',
      diagonal: 'A pale diagonal braid crosses the sheet behind the image.',
      rings: 'A very faint set of concentric watermark rings sits behind the scene.',
    }),
    impression: choice('What happened during the printing of this document?', {
      proof: 'A fresh crisp proof with an even ink film.',
      weak: 'One side received a lighter impression and fades gradually.',
      skip: 'A thin uninked crease interrupts a few engraved lines.',
      overprint: 'A small second-colour cancellation rosette overlays the lower corner.',
    }),
  },
  async apply(capture, a, context, signal) {
    signal.throwIfAborted();
    const { size, color, identity, normal } = capture, unit = size / 720;
    const pixels = new Uint8ClampedArray(size * size * 4);
    const palettes = {
      forest: { ink: [33, 70, 54], second: [151, 119, 65], ground: [237, 229, 203] },
      plum: { ink: [78, 45, 71], second: [165, 109, 117], ground: [240, 227, 213] },
      indigo: { ink: [38, 57, 94], second: [157, 87, 64], ground: [229, 234, 229] },
      sepia: { ink: [78, 55, 36], second: [168, 125, 61], ground: [239, 224, 192] },
    } as const;
    const palette = rekey(palettes[a.inks], context.palette, { ink: 'ink', second: 'second', ground: 'ground' });
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
        const u = x / size, v = y / size, xx = x / unit, yy = y / unit;
        const scale = id >= 3 ? clamp01(Math.max(b[2] - b[0], b[3] - b[1]) / (90 * unit)) * 0.65 + 0.35 : 1;
        const spacing = mix(7.2, 2.8, a.pitch) * scale;
        const localX = (x - b[0]) / unit, localY = (y - b[1]) / unit;
        const surface = (normal[p] - 128) / 128;
        let px = localX + surface * 5 * a.eccentricity, py = localY;
        if (a.registration === 'bowed') px += Math.sin(v * Math.PI) * 1.3;
        const bend = mix(0.15, 4.3, a.eccentricity), tile = 22 * scale;
        const tx = (px / tile - Math.floor(px / tile) - 0.5) * 2, ty = (py / tile - Math.floor(py / tile) - 0.5) * 2;
        const radius = Math.hypot(tx, ty), theta = Math.atan2(ty, tx);
        let phase1 = py / spacing + Math.sin(px / (19 * scale)) * bend;
        let phase2 = px / spacing + Math.sin(py / (21 * scale)) * bend;
        if (a.lathe === 'rosette') { phase1 = radius * (tile / spacing) + Math.cos(theta * 5) * bend * 0.22; phase2 = radius * (tile / spacing) - Math.sin(theta * 7) * bend * 0.15; }
        if (a.lathe === 'oval') { phase1 = Math.hypot(tx * 0.72 + Math.sin(py / 40) * 0.24 * bend, ty) * tile / spacing; phase2 = Math.hypot(tx * 1.3, ty + 0.2) * tile / spacing; }
        if (a.lathe === 'braid') { phase1 = (px + py) / spacing + Math.sin((px - py) / (17 * scale)) * bend; phase2 = (px - py) / spacing - Math.sin((px + py) / (17 * scale)) * bend; }
        if (a.registration === 'diagonal') phase2 += 0.24;
        const lum = clamp01((color[p] * 0.2126 + color[p + 1] * 0.7152 + color[p + 2] * 0.0722) / 255);
        const darkness = id === 0 ? 0.06 : clamp01((1 - lum) * 1.05 + (id >= 2 ? 0.05 : 0));
        const thickness = mix(0.035, 0.13, a.weight) + darkness * mix(0.08, 0.22, a.weight);
        const line1 = Math.abs(fract(phase1) - 0.5) < thickness;
        const line2 = Math.abs(fract(phase2) - 0.5) < thickness * 0.65 && (darkness > 0.13 || a.lathe === 'braid');
        const double = a.registration === 'double' && Math.abs(fract(phase1 + 0.22) - 0.5) < thickness * 0.45;
        const right = (y * size + Math.min(size - 1, x + step)) * 4, down = (Math.min(size - 1, y + step) * size + x) * 4;
        const contour = id >= 2 && (id !== identity[right] || id !== identity[down] || Math.abs(normal[p] - normal[right]) + Math.abs(normal[p + 1] - normal[down + 1]) > 90);
        const edge = Math.min(u, v, 1 - u, 1 - v);
        const band = a.border === 'rope' && edge < 0.035 && Math.abs(Math.sin((xx + yy) * 0.31 + edge * 190)) > 0.73;
        const frame = a.border === 'medals' && Math.abs(edge - 0.025) < 0.0015;
        const mx = Math.min(u, 1 - u) - 0.06, my = Math.min(v, 1 - v) - 0.06;
        const medal = a.border === 'medals' && Math.hypot(mx, my) < 0.046 && Math.sin(Math.hypot(mx, my) * 1300 + Math.sin(Math.atan2(my, mx) * 10) * 2) > 0.55;
        const ovalRadius = Math.hypot((u - 0.5) / 0.46, (v - 0.5) / 0.45);
        const oval = a.border === 'oval' && Math.abs(ovalRadius - 1) < 0.035 && Math.sin(ovalRadius * 270 + Math.sin(Math.atan2(v - 0.5, u - 0.5) * 60)) > 0.5;
        const thread = a.thread === 'vertical' ? Math.abs(u - 0.19) < 0.006 && Math.sin(yy * 0.65 + Math.sin(xx * 0.9)) > 0 : a.thread === 'diagonal' ? Math.abs(u + v - 0.9) < 0.013 && Math.sin((xx - yy) * 0.7) > 0 : a.thread === 'rings' && Math.abs(Math.sin(Math.hypot(u - 0.62, v - 0.38) * 170)) > 0.985;
        const skip = a.impression === 'skip' && Math.abs(v - 0.7 - Math.sin(u * 9) * 0.003) < 0.0018;
        const cancelRadius = Math.hypot(u - 0.8, v - 0.82), cancelAngle = Math.atan2(v - 0.82, u - 0.8);
        const cancel = a.impression === 'overprint' && cancelRadius < 0.07 && Math.sin(cancelRadius * 800 + Math.cos(cancelAngle * 11) * 2) > 0.67;
        for (let c = 0; c < 3; c++) {
          const second = a.separation === 'subject' ? id >= 3 : a.separation === 'cross' ? line2 && !line1 : a.separation === 'register' ? contour : darkness < 0.42;
          const ink = second ? palette.second[c] : palette.ink[c];
          let value = mix(palette.ground[c], ink, darkness * 0.24);
          if (line1 || line2 || double) value = mix(value, ink, id === 0 ? 0.18 : 0.42 + darkness * 0.52);
          if (contour) value = mix(value, a.separation === 'register' ? palette.second[c] : palette.ink[c], 0.72);
          if (band || frame || medal || oval || cancel) value = palette.second[c];
          if (thread) value = mix(value, palette.second[c], id >= 2 ? 0.2 : 0.4);
          if (a.impression === 'weak') value = mix(value, palette.ground[c], u * 0.4);
          if (skip) value = palette.ground[c];
          pixels[p + c] = value + (hash(x, y, context.seed) - 0.5) * 2;
        }
        pixels[p + 3] = 255;
      }
    }
    signal.throwIfAborted();
    return { pixels, notes: [`${a.lathe} engine turning in ${a.inks} inks`, `${a.separation} separation with ${a.registration} registration`, `${a.border} border, ${a.thread} motif, ${a.impression} impression`] };
  },
});
