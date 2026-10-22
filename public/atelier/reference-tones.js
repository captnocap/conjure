// Soft influence is measured only against the captured reference's display RGB.
// No gamma decoding, image-sized mask cache, or intermediate byte conversion.
export const layerTones = Object.freeze(["all", "shadows", "midtones", "highlights"]);

export function layerTone(layer) {
  const tone = Object.hasOwn(layer, "tone") ? layer.tone : "all";
  if (!layerTones.includes(tone))
    throw Error("Choose reference tones: all, shadows, midtones or highlights");
  return tone;
}

export const hasReferenceTone = layer => layerTone(layer) !== "all";

function smoothstep(lo, hi, value) {
  const t = Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

export function referenceToneFactor(code, brightness) {
  if (code === 1) return 1 - smoothstep(.25, .60, brightness);
  if (code === 2)
    return smoothstep(.15, .40, brightness) * (1 - smoothstep(.60, .85, brightness));
  if (code === 3) return smoothstep(.55, .90, brightness);
  return 1;
}

// At most eight tone codes and eight reusable, double-precision alpha values.
// null keeps every All-tone job on the original compositor arithmetic.
export function prepareReferenceTones(layers) {
  const codes = layers.map(layer => layerTones.indexOf(layerTone(layer)));
  return codes.some(Boolean)
    ? { codes: Uint8Array.from(codes), alphas: new Float64Array(codes.length) }
    : null;
}

export function referenceToneAlphas(reference, at, sources, tones) {
  const brightness = (.2126 * reference[at] + .7152 * reference[at + 1] +
    .0722 * reference[at + 2]) / 255;
  for (let j = 0; j < sources.length; j++)
    tones.alphas[j] = sources[j][at + 3] * referenceToneFactor(tones.codes[j], brightness);
  return tones.alphas;
}
