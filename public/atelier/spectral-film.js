import { spectralWeights } from "./spectral-data.js";
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
// Exact coherent, lossless dielectric stack for air-side incidence. Each
// polarization retains signed Fresnel amplitudes; average only after squaring.
export function filmReflectance(
  wavelength,
  thickness,
  cosine,
  n0 = 1,
  n1 = 2,
  n2 = 1.5,
) {
  if (
    ![wavelength, thickness, cosine, n0, n1, n2].every(Number.isFinite) ||
    cosine < 0 ||
    cosine > 1
  )
    throw Error(
      "Film parameters must be finite and incidence cosine must lie in [0,1]",
    );
  const c0 = clamp(cosine),
    s0 = Math.max(0, 1 - c0 * c0),
    c1 = Math.sqrt(Math.max(0, 1 - (n0 / n1) ** 2 * s0)),
    c2 = Math.sqrt(Math.max(0, 1 - (n0 / n2) ** 2 * s0));
  if (
    n0 > n1 ||
    n0 > n2 ||
    n0 <= 0 ||
    n1 <= 0 ||
    n2 <= 0 ||
    wavelength <= 0 ||
    thickness < 0
  )
    throw Error(
      "Film model requires nonnegative thickness and nonabsorbing air-side incidence without TIR",
    );
  if (thickness === 0) {
    if (n0 === n2) return 0;
    const rs = (n0 * c0 - n2 * c2) / (n0 * c0 + n2 * c2),
      rp = (n2 * c0 - n0 * c2) / (n2 * c0 + n0 * c2);
    return (rs * rs + rp * rp) * 0.5;
  }
  const safeRatio = (a, b) => (b === 0 ? 0 : a / b),
    s01 = safeRatio(n0 * c0 - n1 * c1, n0 * c0 + n1 * c1),
    s12 = safeRatio(n1 * c1 - n2 * c2, n1 * c1 + n2 * c2),
    p01 = safeRatio(n1 * c0 - n0 * c1, n1 * c0 + n0 * c1),
    p12 = safeRatio(n2 * c1 - n1 * c2, n2 * c1 + n1 * c2),
    sineSquared =
      Math.sin((2 * Math.PI * n1 * thickness * c1) / wavelength) ** 2,
    response = (a, b) => {
      const phaseTerm = 4 * a * b * sineSquared,
        numerator = (a + b) ** 2 - phaseTerm,
        denominator = (1 + a * b) ** 2 - phaseTerm;
      return denominator === 0 ? 0 : clamp(numerator / denominator);
    };
  return (response(s01, s12) + response(p01, p12)) * 0.5;
}
const XYZ_RGB = [
  3.2404542, -1.5371385, -0.4985314, -0.969266, 1.8760108, 0.041556, 0.0556434,
  -0.2040259, 1.0572252,
];
export function filmColor(thickness, cosine, out = [0, 0, 0]) {
  let x = 0,
    y = 0,
    z = 0;
  for (let i = 0; i < spectralWeights.length; i += 4) {
    const r = filmReflectance(spectralWeights[i], thickness, cosine);
    x += r * spectralWeights[i + 1];
    y += r * spectralWeights[i + 2];
    z += r * spectralWeights[i + 3];
  }
  for (let c = 0; c < 3; c++)
    out[c] =
      XYZ_RGB[c * 3] * x + XYZ_RGB[c * 3 + 1] * y + XYZ_RGB[c * 3 + 2] * z;
  return out; // Preserve signed out-of-gamut RGB until the final display mapping.
}
let cachedLut;
export function filmLut() {
  if (cachedLut) return cachedLut;
  const angles = 128,
    thicknesses = 256,
    maxThickness = 1200,
    data = new Float32Array(angles * thicknesses * 3),
    color = [0, 0, 0];
  for (let a = 0; a < angles; a++)
    for (let d = 0; d < thicknesses; d++) {
      filmColor(
        (d / (thicknesses - 1)) * maxThickness,
        a / (angles - 1),
        color,
      );
      data.set(color, (a * thicknesses + d) * 3);
    }
  return (cachedLut = { angles, thicknesses, maxThickness, data });
}
export function sampleFilm(lut, thickness, cosine, out = [0, 0, 0]) {
  const d = clamp(thickness / lut.maxThickness) * (lut.thicknesses - 1),
    a = clamp(cosine) * (lut.angles - 1),
    d0 = Math.floor(d),
    d1 = Math.min(lut.thicknesses - 1, d0 + 1),
    a0 = Math.floor(a),
    a1 = Math.min(lut.angles - 1, a0 + 1),
    u = d - d0,
    v = a - a0;
  for (let c = 0; c < 3; c++) {
    const p00 = lut.data[(a0 * lut.thicknesses + d0) * 3 + c],
      p10 = lut.data[(a0 * lut.thicknesses + d1) * 3 + c],
      p01 = lut.data[(a1 * lut.thicknesses + d0) * 3 + c],
      p11 = lut.data[(a1 * lut.thicknesses + d1) * 3 + c];
    out[c] = (p00 + (p10 - p00) * u) * (1 - v) + (p01 + (p11 - p01) * u) * v;
  }
  return out;
}
export const baseThickness = (strength) => 50 + 600 * strength;
export function thicknessOffset(point, seed) {
  const [x, y, z] = point,
    phase = seed * 0.017;
  return (
    72 * Math.sin(2.3 * x + 0.71 * y + 1.1 * z + phase) +
    46 * Math.sin(1.1 * x - 2.6 * y + 0.9 * z + phase * 0.73) +
    24 * Math.sin(-3.3 * x + 0.5 * y + 2.9 * z + phase * 1.31)
  );
}
export function worldFromPixel(raw, x, y, distance) {
  const w = raw.size,
    m = raw.worldFromClip;
  if (!m)
    return [
      ((x + 0.5 - w / 2) * 8.2) / w,
      ((w / 2 - y - 0.5) * 8.2) / w,
      -distance,
    ];
  const nx = ((x + 0.5) / w) * 2 - 1,
    ny = 1 - ((y + 0.5) / w) * 2,
    nz =
      (2 * (distance - (raw.near ?? 0.1))) /
        ((raw.far ?? 100) - (raw.near ?? 0.1)) -
      1,
    h = m[3] * nx + m[7] * ny + m[11] * nz + m[15];
  return [
    (m[0] * nx + m[4] * ny + m[8] * nz + m[12]) / h,
    (m[1] * nx + m[5] * ny + m[9] * nz + m[13]) / h,
    (m[2] * nx + m[6] * ny + m[10] * nz + m[14]) / h,
  ];
}
export const linearToDisplay = (value) => {
  const x = Math.max(0, value),
    tone = clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14));
  return (
    255 * (tone <= 0.0031308 ? 12.92 * tone : 1.055 * tone ** (1 / 2.4) - 0.055)
  );
};
