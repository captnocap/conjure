import { choice } from './questions';
import type { Capture, ChoiceQuestion } from './contract';
import { isAtelierMaterial } from './atelier-materials';

/**
 * What a surface is made of, as the print should show it. Paint says what colour a thing is; a
 * material says how its surface meets the light: mirror metal, glossy lacquer, chalky plaster,
 * velvet pile, glitter. The capture carries it per pixel (`Capture.material`), every look can read
 * it with `surfaceAt`, and the engine's materialize pass shows it through any medium that does
 * not render it itself. The decision model chooses one for each cast thing, the setting and the
 * backdrop from this same vocabulary, so "a chrome skull" or "a velvet armchair" works for
 * components that never thought about their surfaces.
 */
export interface MaterialSwatch {
  /** How the material is described to the decision model. */
  says: string;
  /** The physically based settings a built surface takes when it is made of this. */
  metalness: number;
  roughness: number;
  /** Set for see-through materials: the surface is made transparent at this opacity. */
  opacity?: number;
  /** Set for surfaces that are themselves a light: emissive strength added to the surface. */
  emissive?: number;
  /** Set for materials whose surface carries a fine relief the live render should catch the light with. */
  relief?: 'sparkle' | 'pebble';
}

export const MATERIALS = {
  chrome: { says: 'Mirror-polished metal: chrome, silver plate, a steel blade, a brass bell, polished gold. It reflects its surroundings in bands of light and dark.', metalness: 1, roughness: 0.08 },
  brushed: { says: 'Brushed or burnished metal: satin steel, old iron, pewter, worn bronze. Soft, long streaks of light instead of a mirror.', metalness: 1, roughness: 0.45 },
  gloss: { says: 'Glossy lacquer: enamel, car paint, glazed ceramic, varnish, a candy shell, patent leather. Small sharp bright highlights on deep colour.', metalness: 0, roughness: 0.1 },
  satin: { says: 'Satin and pearl: silk, eggshell, waxed wood, mother of pearl. A broad soft sheen that moves as the surface turns.', metalness: 0.1, roughness: 0.35 },
  matte: { says: 'Matte and chalky: plaster, clay, raw stone, cardboard, felt, dust, unglazed pottery. Flat, with no shine at all.', metalness: 0, roughness: 1 },
  velvet: { says: 'Velvet and suede: deep soft pile, moss, peach fuzz. Dark where it faces you and bright along its edges.', metalness: 0, roughness: 0.95 },
  rubber: { says: 'Rubber and soft silicone: tyres, grips, a wetsuit, matte vinyl. Dull, dark and smooth, with one broad dim gleam.', metalness: 0, roughness: 0.6 },
  leather: { says: 'Leather and hide: a pebbled grain, creases, a warm low sheen. Saddles, boots, armchairs, old books.', metalness: 0, roughness: 0.55, relief: 'pebble' },
  glass: { says: 'Glass, crystal and ice: clear or tinted and see-through, with bright rims and one hard glint.', metalness: 0, roughness: 0.05, opacity: 0.55 },
  glitter: { says: 'Glitter, sequins and stardust: a surface of countless tiny sparkles that twinkle as it moves.', metalness: 0.6, roughness: 0.35, relief: 'sparkle' },
  wet: { says: 'Wet and oily: rain-soaked, slick, dripping, fresh paint. Darkened and saturated, with streaked mirror-like highlights.', metalness: 0.05, roughness: 0.08 },
  glow: { says: 'Luminous: neon, bioluminescence, embers, a lit screen, something radioactive. The surface is itself a light and haloes into its surroundings.', metalness: 0, roughness: 0.6, emissive: 1 },
} as const satisfies Record<string, MaterialSwatch>;

export type MaterialName = keyof typeof MATERIALS;
export const MATERIAL_NAMES = Object.keys(MATERIALS) as MaterialName[];

/** Materials a backdrop or sky can be made of: a void of glitter, a velvet drape, a sheet of matte paper. */
export const BACKDROP_MATERIALS: readonly MaterialName[] = ['glitter', 'velvet', 'matte', 'satin', 'chrome', 'glow'];

/** A choice among the shared materials, for a component's own material questions. */
export function material(ask: string, names: readonly MaterialName[] = MATERIAL_NAMES): ChoiceQuestion<MaterialName> {
  return choice(ask, Object.fromEntries(names.map((name) => [name, MATERIALS[name].says])) as Record<MaterialName, string>);
}

/** Whether a name is one of the shared materials. */
export const isMaterial = (name: unknown): name is MaterialName => typeof name === 'string' && Object.hasOwn(MATERIALS, name);

/** The byte the capture's material pass writes for a named material: 0 means as built. */
// 255 marks an authored Atelier shader, already rendered into the capture. The original
// twelve indices remain stable; the generic post-print pass must not imitate that shader.
export const materialByte = (name: string | undefined): number =>
  isAtelierMaterial(name) ? 255 : isMaterial(name) ? MATERIAL_NAMES.indexOf(name) + 1 : 0;
export const materialOfByte = (byte: number): MaterialName | null => (byte >= 1 && byte <= MATERIAL_NAMES.length ? MATERIAL_NAMES[byte - 1] : null);

/**
 * Declare what a built surface is made of. The material is tagged for the capture (`userData.material`)
 * and its metalness, roughness, opacity and glow are set to suit, so the live render and every print
 * agree. Works on any Three.js material; properties it does not have are left alone.
 */
export function madeOf<M extends { userData: Record<string, unknown> }>(target: M, name: MaterialName): M {
  const swatch: MaterialSwatch = MATERIALS[name];
  const surface = target as M & { metalness?: number; roughness?: number; opacity?: number; transparent?: boolean; emissive?: { setRGB(r: number, g: number, b: number): unknown; r: number; g: number; b: number }; color?: { r: number; g: number; b: number }; emissiveIntensity?: number; needsUpdate?: boolean };
  surface.userData.material = name;
  if (typeof surface.metalness === 'number') surface.metalness = swatch.metalness;
  if (typeof surface.roughness === 'number') surface.roughness = swatch.roughness;
  if (swatch.opacity !== undefined && typeof surface.opacity === 'number') {
    surface.opacity = Math.min(surface.opacity, swatch.opacity);
    surface.transparent = true;
  }
  if (swatch.emissive && surface.emissive && surface.color) {
    const { r, g, b } = surface.color;
    const peak = Math.max(r, g, b, 0.05);
    // A surface that is a light glows in its own colour, at full brightness.
    surface.emissive.setRGB(r / peak, g / peak, b / peak);
    surface.emissiveIntensity = Math.max(surface.emissiveIntensity ?? 0, swatch.emissive);
  }
  surface.needsUpdate = true;
  return target;
}

/** One pixel's surface, as the capture's material pass recorded it. */
export interface Surface {
  /** The named material, when the builder or the decision model gave one; null when the surface is as built. */
  material: MaterialName | null;
  /** 0 dielectric … 1 metal */
  metalness: number;
  /** 0 mirror … 1 fully diffuse */
  roughness: number;
  /** 0 unlit … 1 the surface is itself a light */
  glow: number;
}

const AS_BUILT: Surface = { material: null, metalness: 0, roughness: 1, glow: 0 };

/**
 * The surface under one pixel. The backdrop (identity 0) reports the backdrop material when the
 * setting was given one. Captures made before materials existed, and conformance checks, report
 * everything as a plain diffuse surface.
 */
export function surfaceAt(capture: Pick<Capture, 'material' | 'identity' | 'backdrop'>, index: number): Surface {
  const at = index * 4;
  if (capture.identity[at] === 0) return capture.backdrop ? { material: capture.backdrop, ...SETTINGS_OF[capture.backdrop] } : AS_BUILT;
  const bytes = capture.material;
  if (!bytes) return AS_BUILT;
  return { material: materialOfByte(bytes[at + 2]), metalness: bytes[at] / 255, roughness: bytes[at + 1] / 255, glow: bytes[at + 3] / 255 };
}
const SETTINGS_OF = Object.fromEntries(MATERIAL_NAMES.map((name) => { const swatch: MaterialSwatch = MATERIALS[name]; return [name, { metalness: swatch.metalness, roughness: swatch.roughness, glow: swatch.emissive ?? 0 }]; })) as Record<MaterialName, Omit<Surface, 'material'>>;

/** A repeatable hash of a lattice point, in [0, 1). */
function hash(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Glitter at one pixel, 0–1. Every cell of `cell` pixels holds one facet tilted its own way about the
 * surface normal; the facets that catch the light (the half vector between light and viewer, view
 * space, y up) flash, the brightest with a thin cross flare. `step` moves the twinkle round a loop.
 */
export function sparkleAt(x: number, y: number, normal: readonly [number, number, number], half: readonly [number, number, number], cell: number, seed: number, step = 0): number {
  const [nx, ny, nz] = normal, [hx, hy, hz] = half;
  const cu = Math.floor(x / cell), cv = Math.floor(y / cell);
  let flash = 0;
  for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
    const gu = cu + k, gv = cv + j;
    const gx = (gu + hash(gu, gv, seed + 13)) * cell, gy = (gv + hash(gu, gv, seed + 14)) * cell;
    const dx = x + 0.5 - gx, dy = y + 0.5 - gy;
    if (Math.abs(dx) > 2.6 || Math.abs(dy) > 2.6) continue;
    const fx = nx + (hash(gu, gv, seed + 15) - 0.5) * 1.2, fy = ny + (hash(gu, gv, seed + 16) - 0.5) * 1.2;
    const fl = Math.hypot(fx, fy, nz) || 1;
    const twinkle = 0.4 + 0.6 * hash(gu, gv, seed + 17 + step);
    const bright = Math.max(0, (fx * hx + fy * hy + nz * hz) / fl) ** 24 * twinkle;
    if (bright < 0.12) continue;
    const core = Math.hypot(dx, dy) < 0.9 ? bright : 0;
    const arm = bright > 0.6 && ((Math.abs(dx) < 0.6 && Math.abs(dy) < 2.6) || (Math.abs(dy) < 0.6 && Math.abs(dx) < 2.6)) ? bright * 0.4 * (1 - Math.max(Math.abs(dx), Math.abs(dy)) / 2.6) : 0;
    flash = Math.max(flash, core, arm);
  }
  return flash;
}

/**
 * How a surface should be shown: the named material at full strength, or the one its built
 * metalness, roughness and glow imply, at a strength that says how far it is from plain. A plain
 * diffuse surface (most things) implies nothing: only shine, sparkle and light are read from a
 * build, never flatness, so an ordinary thing in an ordinary print is left alone.
 */
export function impliedMaterial(surface: Surface): { name: MaterialName; strength: number } | null {
  if (surface.material) return { name: surface.material, strength: 1 };
  const { metalness, roughness, glow } = surface;
  if (glow > 0.15) return { name: 'glow', strength: Math.min(1, glow) };
  if (metalness >= 0.5) {
    if (roughness < 0.3) return { name: 'chrome', strength: 0.85 * metalness * (1 - roughness / 0.3) };
    if (roughness < 0.75) return { name: 'brushed', strength: 0.7 * metalness * (1 - (roughness - 0.3) / 0.45) };
    return null;
  }
  if (roughness < 0.25) return { name: 'gloss', strength: 0.8 * (1 - metalness) * (1 - roughness / 0.25) };
  if (roughness < 0.55) return { name: 'satin', strength: 0.6 * (1 - metalness) * (1 - (roughness - 0.25) / 0.3) };
  return null;
}
