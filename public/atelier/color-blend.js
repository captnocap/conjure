// W3C Compositing Level 1, Color = SetLum(source, Lum(backdrop)).
// Non-premultiplied display RGB in [0, 1], not physical linear-light luminance.
// Caller-owned three-channel output keeps pixel loops allocation-bounded.
export function colorBlendInto(out, br, bg, bb, sr, sg, sb) {
  const delta = (0.3 * br + 0.59 * bg + 0.11 * bb) -
    (0.3 * sr + 0.59 * sg + 0.11 * sb);
  let r = sr + delta, g = sg + delta, b = sb + delta;
  // ClipColor compresses gamut around Lum, rather than clipping each channel.
  // L, n and x are saved before either correction, exactly as W3C specifies.
  const L = 0.3 * r + 0.59 * g + 0.11 * b,
    n = Math.min(r, g, b), x = Math.max(r, g, b);
  if (n < 0) {
    r = L + ((r - L) * L) / (L - n);
    g = L + ((g - L) * L) / (L - n);
    b = L + ((b - L) * L) / (L - n);
  }
  if (x > 1) {
    r = L + ((r - L) * (1 - L)) / (x - L);
    g = L + ((g - L) * (1 - L)) / (x - L);
    b = L + ((b - L) * (1 - L)) / (x - L);
  }
  // Restore the blend's mathematical [0, 1] range after floating-point roundoff.
  // Otherwise a tiny negative endpoint can make a later ClipColor divide by 0.
  // This is not byte quantization; the completed stack alone rounds to RGBA8.
  out[0] = Math.max(0, Math.min(1, r));
  out[1] = Math.max(0, Math.min(1, g));
  out[2] = Math.max(0, Math.min(1, b));
}
