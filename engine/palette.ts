import type { ChoiceQuestion, Palette, QuestionSet } from '@conjure/kit';
import { PAINTS, PAINT_NAMES, type PaintName, choice, hashText, oklch, paintRGB, seeded } from '@conjure/kit';
import type { Verdict } from './oracle';
import { type Exploring, type Forced, type Ruling, settle } from './settle';

/**
 * The print's palette: which colours carry it, decided once per idea from the shared paint names and
 * toured on rerolls, so a look that prints in inks of its own design stops printing every idea in its
 * favourite. Looks re-key their inks to it (`rekey` in the kit); so do the finishing passes.
 */
const options = (names: readonly PaintName[]) => Object.fromEntries(names.map((name) => [name, PAINTS[name].says])) as Record<PaintName, string>;
const GROUNDS = PAINT_NAMES.filter((name) => !('metal' in PAINTS[name]));

export const PALETTE_QUESTIONS = {
  paletteGround: choice(
    'If this picture were printed in inks of its own, what colour is the ground they lie on: the paper, the stock, the dark or pale field beneath everything? Choose for this idea.',
    options(GROUNDS),
  ),
  paletteInk: choice(
    'Against that ground, which colour carries the picture: the hue a viewer remembers, the strongest pigment, glow or line? It must stand out from the ground, not repeat it. Choose from this idea’s own subject, materials, place and feeling, not from the habits of a style.',
    options(PAINT_NAMES),
  ),
  paletteSecond: choice(
    'Which second colour answers that one, for echoes, shadows, offset edges and small accents? It must differ from both the carrying colour and the ground. Choose for this idea.',
    options(PAINT_NAMES),
  ),
} satisfies QuestionSet;

export const PALETTE_NAMES: readonly string[] = Object.keys(PALETTE_QUESTIONS);

const named = (value: unknown, fallback: PaintName): PaintName => (typeof value === 'string' && Object.hasOwn(PAINTS, value) ? value as PaintName : fallback);

export function paletteOf(answers: Record<string, string | number | boolean>): Palette {
  return {
    ink: named(answers.paletteInk, 'red'),
    ground: named(answers.paletteGround, 'black'),
    second: named(answers.paletteSecond, 'lavender'),
  };
}

/** Distance in OKLab between two paints: black to charcoal is 0.15, white to cream 0.06, red to crimson 0.18. */
export function paintDistance(a: PaintName, b: PaintName): number {
  const lab = (name: PaintName) => { const [L, C, h] = oklch(paintRGB(name)); return [L, C * Math.cos(h), C * Math.sin(h)]; };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}
/** An ink this close to its ground disappears into it (charcoal on black, cream on white). */
export const INK_CLEARANCE = 0.155;
/** A second colour this close to the ink or the ground is the same colour again. */
export const SECOND_CLEARANCE = 0.1;

/** The question without the colours too near what is already chosen; a pinned answer always stays. */
const without = (question: ChoiceQuestion<PaintName>, near: (name: PaintName) => boolean, pinned: unknown): ChoiceQuestion<PaintName> => ({
  ...question,
  options: Object.fromEntries(Object.entries(question.options).filter(([name]) => name === pinned || !near(name as PaintName))) as Record<PaintName, string>,
});

/** The ink tours only colours the model gave at least this share, so rerolls stay sincere. */
export const INK_FLOOR = 0.05;
/** The ground is drawn this much cooler than the roll: rerolls change the colour, not the stock. */
export const GROUND_COOLING = 0.4;
/** The second colour is drawn a little cooler, so it answers the ink rather than wandering. */
export const SECOND_COOLING = 0.7;

/**
 * Ground first, then an ink that stands out from it, then a second colour unlike both, so the model's
 * habit of naming the idea's one colour three times (black on black, magenta with magenta) never
 * reaches a print. Each is drawn from the model's own odds over what is left, on its own stream. The
 * ink is the colour rerolls change: it tours the plausible ones, the favourite most often first; the
 * ground is drawn cool so it mostly holds, and the second colour is sampled at the roll's temperature.
 * A pinned answer holds even when it clashes: a person chose it.
 */
export function settlePalette(
  verdicts: Record<string, Verdict>,
  temperature: number,
  seed: number,
  rulings: Ruling[],
  forced: Forced,
  exploring?: Exploring,
): Palette {
  const draw = (name: keyof typeof PALETTE_QUESTIONS, question: ChoiceQuestion<PaintName>, heat: number, tour?: Exploring) =>
    settle('direction', { [name]: question }, verdicts, heat, seeded(seed ^ hashText(name)), rulings, forced, tour)[name] as PaintName;
  const ground = draw('paletteGround', PALETTE_QUESTIONS.paletteGround, temperature * GROUND_COOLING);
  const ink = draw('paletteInk', without(PALETTE_QUESTIONS.paletteInk, (name) => paintDistance(name, ground) < INK_CLEARANCE, forced.paletteInk), temperature, exploring && { ...exploring, floor: INK_FLOOR });
  const second = draw('paletteSecond', without(PALETTE_QUESTIONS.paletteSecond, (name) => paintDistance(name, ink) < SECOND_CLEARANCE || paintDistance(name, ground) < SECOND_CLEARANCE, forced.paletteSecond), temperature * SECOND_COOLING);
  return { ink, ground, second };
}

/** The palette in words, for the activity feed and the decision sheet. */
export const paletteWords = (palette: Palette) => `${palette.ink} on ${palette.ground}, with ${palette.second}`;
