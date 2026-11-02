import { choice } from './questions';
import type { ChoiceQuestion } from './contract';

/** One named colour the decision model can ask for. Metals also change the finish. */
export interface PaintSwatch {
  hex: string;
  says: string;
  metal?: boolean;
}

/**
 * The shared colour vocabulary. Components ask with `paint(ask)` and read `paintHex(answer)`;
 * the engine uses the same names when it repaints a built thing or world for an idea that names
 * its colours ("a red piano", "a pink city at night").
 */
export const PAINTS = {
  red: { hex: '#c8102e', says: 'Strong red: pillar boxes, fire engines, lipstick.' },
  crimson: { hex: '#7e1828', says: 'Deep crimson: wine, velvet, dried blood.' },
  coral: { hex: '#f2735a', says: 'Coral: warm pinkish orange, salmon.' },
  orange: { hex: '#ee7a12', says: 'Bright orange: traffic cones, tangerines, hazard.' },
  rust: { hex: '#a4471e', says: 'Rust and terracotta: burnt earth, clay pots.' },
  amber: { hex: '#f0a215', says: 'Amber and marigold: honeyed yellow-orange.' },
  yellow: { hex: '#f4d40c', says: 'Lemon and taxi yellow, sunflowers.' },
  cream: { hex: '#efe3c4', says: 'Cream and ivory: a soft warm white.' },
  lime: { hex: '#9bd10f', says: 'Acid lime green, highlighter.' },
  green: { hex: '#2f9e44', says: 'Grass and leaf green.' },
  forest: { hex: '#1f4a2b', says: 'Dark forest and bottle green, racing green.' },
  olive: { hex: '#77762f', says: 'Olive and khaki: military drab.' },
  mint: { hex: '#9fe3c2', says: 'Pale mint and seafoam, pastel green.' },
  teal: { hex: '#138585', says: 'Teal: deep blue-green, peacock.' },
  turquoise: { hex: '#2ec4c4', says: 'Turquoise and aqua: swimming pools, tropical water.' },
  sky: { hex: '#7ec3ef', says: 'Pale sky blue, baby blue.' },
  blue: { hex: '#1f5fd1', says: 'Strong royal blue, cobalt.' },
  navy: { hex: '#1b2a55', says: 'Navy and midnight blue.' },
  indigo: { hex: '#3b2a8a', says: 'Indigo: ink blue-violet, denim dye.' },
  lavender: { hex: '#b9a5e6', says: 'Lavender and lilac: pale violet.' },
  purple: { hex: '#7b2fa8', says: 'Purple and violet: royal, grape.' },
  magenta: { hex: '#d6198a', says: 'Hot magenta and fuchsia, neon pink.' },
  pink: { hex: '#f4a3c0', says: 'Soft pink: bubblegum, blush, candy floss.' },
  brown: { hex: '#6b4428', says: 'Chocolate and walnut brown.' },
  tan: { hex: '#c8a77e', says: 'Tan, sand and camel.' },
  white: { hex: '#f4f2ec', says: 'White: snow, porcelain, chalk.' },
  grey: { hex: '#8c8f93', says: 'Mid grey: concrete, pewter, ash.' },
  charcoal: { hex: '#34363a', says: 'Charcoal and slate: almost black.' },
  black: { hex: '#111214', says: 'Black: jet, soot, lacquer.' },
  gold: { hex: '#d4a537', says: 'Polished gold or brass, gilded metal.', metal: true },
  silver: { hex: '#c9ccd1', says: 'Silver and chrome, polished steel.', metal: true },
  copper: { hex: '#b8643a', says: 'Copper and bronze, burnished metal.', metal: true },
} as const satisfies Record<string, PaintSwatch>;

export type PaintName = keyof typeof PAINTS;
export const PAINT_NAMES = Object.keys(PAINTS) as PaintName[];

/** A choice among the shared colours, for a component's own colour questions. */
export function paint(ask: string, names: readonly PaintName[] = PAINT_NAMES): ChoiceQuestion<PaintName> {
  return choice(ask, Object.fromEntries(names.map((name) => [name, PAINTS[name].says])) as Record<PaintName, string>);
}

/** The colour of a named paint, as a hex string; an unknown name gives the fallback. */
export function paintHex(name: string, fallback = '#8c8f93'): string {
  return (PAINTS as Record<string, PaintSwatch>)[name]?.hex ?? fallback;
}

/** Whether a named paint is a metal, so a builder can raise metalness with it. */
export function paintIsMetal(name: string): boolean {
  return !!(PAINTS as Record<string, PaintSwatch>)[name]?.metal;
}
