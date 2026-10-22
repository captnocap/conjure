import { type Framing, NATURAL_FRAMING, type QuestionSet } from '../kit/contract';
import { choice, score } from '../kit/questions';
import type { Ruling } from './settle';

/**
 * The camera is a decision like any other. These are asked once per idea with the mood, and
 * every world built on the diorama helper frames itself from the answers.
 */
export const FRAMING_QUESTIONS = {
  elevation: score('From what height is the scene seen?', [
    'Low, near the ground, looking up at it',
    'Eye level, as a person standing there would see it',
    'A raised three-quarter view, like a model on a table',
    'High above, looking steeply down',
    'Almost straight down, a plan of the place',
  ]),
  distance: score('How close is the viewer?', [
    'Tight on the hero, cropped by the frame',
    'Close: the hero fills the picture',
    'The whole scene, comfortably framed',
    'Wide, with open space around the scene',
    'Far away: the scene is small in a large emptiness',
  ]),
  turn: score('From which side is the scene seen?', [
    'Turned well to the left of its natural angle',
    'A little to the left',
    'Its natural angle',
    'A little to the right',
    'Turned well to the right',
  ]),
  anchor: choice('Where does the hero sit in the frame?', {
    centre: 'In the middle: composed, still, symmetrical.',
    left: 'Off to the left, leaving open space on the right.',
    right: 'Off to the right, leaving open space on the left.',
  }),
  level: choice('Is the frame level?', {
    level: 'Level and steady.',
    tilted: 'Tilted off level, for unease, speed or play.',
  }),
} satisfies QuestionSet;

export const FRAMING_NAMES: readonly string[] = Object.keys(FRAMING_QUESTIONS);

const unit = (value: unknown, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : fallback;
};

/** Settled direction answers become the framing every builder reads. */
export function framingOf(answers: Record<string, string | number | boolean>): Framing {
  const anchor = answers.anchor;
  return {
    elevation: unit(answers.elevation, NATURAL_FRAMING.elevation),
    distance: unit(answers.distance, NATURAL_FRAMING.distance),
    turn: unit(answers.turn, 0.5) * 2 - 1,
    tilt: answers.level === 'tilted' ? 1 : 0,
    anchor: anchor === 'left' || anchor === 'right' ? anchor : 'centre',
  };
}

/** A presentation plate may move the camera; the rulings say so instead of pretending the model chose it. */
export function adjustFraming(framing: Framing, overrides: Partial<Framing> | undefined, rulings: Ruling[], note: string): Framing {
  if (!overrides) return framing;
  const result = { ...framing };
  for (const [key, value] of Object.entries(overrides) as [keyof Framing, Framing[keyof Framing]][]) {
    if (value === undefined) continue;
    (result as Record<string, unknown>)[key] = value;
    const name = key === 'tilt' ? 'level' : key;
    const ruling = rulings.find((candidate) => candidate.owner === 'direction' && candidate.name === name);
    if (!ruling) continue;
    ruling.note = note;
    if (ruling.kind === 'score' && typeof value === 'number') {
      const levels = FRAMING_QUESTIONS[name as 'elevation' | 'distance' | 'turn'].levels;
      const position = key === 'turn' ? (value + 1) / 2 : value;
      ruling.picked = levels[Math.round(Math.min(1, Math.max(0, position)) * (levels.length - 1))];
    } else if (key === 'tilt') ruling.picked = value ? 'tilted' : 'level';
    else if (typeof value === 'string') ruling.picked = value;
  }
  return result;
}
