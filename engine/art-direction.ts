import type { Direction, QuestionSet } from '../kit/contract';
import { choice } from '../kit/questions';

/**
 * The art direction a whole picture follows is a catalogue decision like the setting or the look.
 * Every folder under components/directions/ is one direction: words the model reads with every
 * question, and the finishing passes the print receives. The model chooses the one that serves the
 * idea, rerolls tour the plausible ones, and a pinned answer holds. So no single house style is
 * printed on every picture, and anyone can add a direction that leans hard one way and see how
 * the studio answers under it.
 */
/** What every decision is told, before any direction. Tests import it from here: the director needs the catalogue, which only Vite can load. */
export const BRIEF_BASE =
  'You are art-directing a small 3D scene that expresses an idea or mood a person typed. Judge every question only by how well it serves that idea. Prefer specific, characterful answers over safe ones.';

export const HOUSE = 'house';
export const HOUSE_NAMES: readonly string[] = [HOUSE];

/** What the model is told when it chooses the direction; nothing else has been decided yet. */
export const HOUSE_BRIEF =
  'Choose the direction the whole picture will follow. Everything after this, the setting, the things, the medium and the finish, is decided under it, so pick the one that serves this idea best rather than the most striking one.';

export interface DirectionEntry { id: string; summary: string }

export const houseQuestion = (directions: readonly DirectionEntry[]): QuestionSet => ({
  [HOUSE]: choice(
    'Which direction should the whole picture follow?',
    Object.fromEntries(directions.map((direction) => [direction.id, direction.summary])),
  ),
});

/** Plain studies and conformance checks follow no direction: the base brief alone, no finishes. */
export const NO_DIRECTION: Direction = { brief: '', note: '', finishes: [] };

/** The settled answer as a direction id, or the first direction when the answer is not one. */
export function directionOf(answers: Record<string, string | number | boolean>, directions: readonly DirectionEntry[]): string {
  const picked = answers[HOUSE];
  return typeof picked === 'string' && directions.some((direction) => direction.id === picked) ? picked : directions[0].id;
}

/** A brief with the direction appended, trimmed so a direction-less reading adds no stray space. */
export const directed = (base: string, direction: string) => (direction ? `${base} ${direction}` : base);

export const HOUSE_NOTE = 'Rerolls tour the directions the model found plausible, its favourite first. Percentages show model relevance.';
