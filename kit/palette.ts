import { PAINTS, type PaintName } from './paint';

/**
 * The picture's own colours, decided once per idea like the mood. A look that prints in inks of its
 * own design (a toner on black stock, a blacklight glow, a two-colour riso) re-keys those inks to the
 * palette with `rekey`, so the same look prints a lemon grove in sulphur and a deep sea in teal
 * instead of always reaching for its favourite. Naturalistic looks ignore it: the palette is the
 * print's inks, not the objects' colours (those are the engine's paint questions).
 */
export interface Palette {
  /** The colour that carries the picture: the strongest pigment, glow or ink. */
  ink: PaintName;
  /** The stock, paper or field beneath. */
  ground: PaintName;
  /** A second colour that answers the first: echoes, separations, offset edges, shadows. */
  second: PaintName;
}
export type PaletteRole = keyof Palette;

export type RGB = readonly [number, number, number];

/** A named paint as 0–255 RGB. */
export function paintRGB(name: string): RGB {
  const hex = ((PAINTS as Record<string, { hex: string }>)[name]?.hex ?? '#8c8f93').slice(1);
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

const toLinear = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const toByte = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055);

/** OKLCh: perceptual lightness 0–1, chroma (about 0–0.37) and hue in radians. */
export function oklch([r8, g8, b8]: RGB): [number, number, number] {
  const r = toLinear(r8), g = toLinear(g8), b = toLinear(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

function linearOf(L: number, C: number, h: number): [number, number, number] {
  const A = C * Math.cos(h), B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** Back to 0–255 RGB, giving up chroma (never lightness or hue) until the colour fits the screen. */
export function fromOklch(L: number, C: number, h: number): [number, number, number] {
  const fits = (c: number) => linearOf(L, c, h).every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  let chroma = Math.max(0, C);
  if (!fits(chroma)) {
    let lo = 0, hi = chroma;
    for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
    chroma = lo;
  }
  const [r, g, b] = linearOf(Math.min(1, Math.max(0, L)), chroma, h);
  return [toByte(r), toByte(g), toByte(b)].map((v) => Math.round(Math.min(255, Math.max(0, v)))) as [number, number, number];
}

/** Below this chroma a colour has no hue worth keeping: greys, blacks, paper whites. */
const NEUTRAL = 0.025;
/** The most colour a ground takes at a lightness: a tint on pale paper, more on dark stock. */
const groundChroma = (L: number) => 0.03 + 0.14 * Math.max(0, 1 - L);

/**
 * Re-key a look's designed colours to the palette. Each colour listed in `roles` keeps its tonal
 * place, so the look's design (black stock, pale flash, mid drift) survives, and turns to its role's
 * palette colour: the group's most vivid member lands on the palette hue and the others keep their
 * hue offsets from it, with chroma scaled by how vivid the palette colour is against that member.
 * Inks also lean part of the way to the palette colour's lightness (lime must not print as olive);
 * a ground keeps its own, so black stock stays black and only takes the tint, and a pale ground takes
 * only a tint's worth of colour (ivory under a forest palette is a green-white, not mint). A grey palette
 * colour drains its group; a vivid one fed into a neutral group (a bone toner asked for in cobalt) gives
 * it a moderate tint. Colours without a role, or no palette, pass through.
 */
export function rekey<T extends Readonly<Record<string, RGB>>>(colours: T, palette: Palette | undefined, roles: { readonly [K in keyof T]?: PaletteRole }): { [K in keyof T]: RGB } {
  if (!palette) return colours;
  const out = { ...colours } as Record<string, RGB>;
  const groups = new Map<PaletteRole, string[]>();
  for (const [key, role] of Object.entries(roles) as [string, PaletteRole | undefined][]) {
    if (!role || !(key in colours)) continue;
    groups.set(role, [...(groups.get(role) ?? []), key]);
  }
  for (const [role, keys] of groups) {
    const [targetL, targetC, targetH] = oklch(paintRGB(palette[role]));
    const lch = new Map(keys.map((key) => [key, oklch(colours[key])]));
    const anchor = keys.reduce((best, key) => (lch.get(key)![1] > lch.get(best)![1] ? key : best));
    const [anchorL, anchorC, anchorH] = lch.get(anchor)!;
    const lift = role === 'ground' ? 0 : Math.min(0.2, Math.max(-0.18, (targetL - anchorL) * 0.7));
    const vividAnchor = anchorC >= NEUTRAL;
    const ratio = vividAnchor ? Math.min(2.5, targetC / anchorC) : 0;
    for (const key of keys) {
      const [L, C, h] = lch.get(key)!;
      const offset = vividAnchor && C >= NEUTRAL ? h - anchorH : 0;
      const chroma = vividAnchor ? C * ratio : targetC * 0.6 * Math.min(1, 0.4 + 2 * Math.min(L, 1 - L));
      const capped = role === 'ground' ? Math.min(chroma, Math.max(C, groundChroma(L))) : chroma;
      out[key] = fromOklch(Math.min(0.98, Math.max(0.02, L + lift)), targetC < NEUTRAL ? Math.min(capped, targetC) : capped, targetH + offset);
    }
  }
  return out as { [K in keyof T]: RGB };
}

/** One colour re-keyed on its own: keeps its lightness, takes the role's hue and vividness. */
export function rekeyOne(colour: RGB, palette: Palette | undefined, role: PaletteRole): RGB {
  return rekey({ colour }, palette, { colour: role }).colour;
}
