import type { Framing, Mood, QuestionSet } from '../kit/contract';
import { choice, noul } from '../kit/questions';
import type { Ruling } from './settle';

/**
 * One idea can come back as one plate or as a short series. The series is decided by typed
 * questions like everything else, and every plate reuses the same settled scene, so a series
 * costs renders, never further consultations.
 */
export const PRESENTATIONS = {
  plate: 'One finished picture.',
  hours: 'Three plates of the same scene as its light moves from first light through noon to last light.',
  strip: 'A three-panel strip that tells it in time: before, the moment, and after.',
  approach: 'Two plates: the whole place seen from far away, then close on the hero.',
  critics: 'Two plates: the same idea as read by two different decision models, side by side.',
  opposite: 'Two plates: the idea, then its exact opposite, with the model told to invert everything.',
  telephone: 'Three plates like a game of telephone: each is a fresh reading of a one-line description of the plate before it, with everything already used ruled out.',
  loop: 'One plate that moves: a short looping print, a couple of seconds of the scene breathing, swaying and turning, drawn frame by frame in the chosen look.',
  styles: 'Three plates of the very same scene in three different art media, like one subject studied by three artists of different eras.',
  portrait: 'A portrait: the hero alone, close and in sharp focus, filling the frame, with the rest of the scene layered in with it.',
} as const;

/** How the scene joins a portrait of the hero. */
export const PORTRAIT_BLENDS = {
  behind: 'The scene softly out of focus behind the hero, like a portrait photographer\u2019s backdrop.',
  inside: 'The scene seen through the hero\u2019s silhouette, like a double exposure.',
  over: 'The scene laid faintly over the whole portrait, like a ghost or a memory.',
  beside: 'The portrait and the scene side by side.',
} as const;
export type PortraitBlend = keyof typeof PORTRAIT_BLENDS;
export type PresentationKind = keyof typeof PRESENTATIONS;

export const ARCS = {
  arrival: 'Something arrives: an empty place, then the full scene, then it settles in.',
  disruption: 'Calm, then a violent moment, then the damage left behind.',
  departure: 'Everything in its place, then the leaving, then what remains.',
  decay: 'New, then worn, then ruined, as the years pass.',
  night: 'Dusk, the dead of night, then first light.',
} as const;
export type Arc = keyof typeof ARCS;

export const PRESENTATION_QUESTIONS = {
  presentation: choice('How should this idea be presented?', PRESENTATIONS),
  arc: choice('If it were told in three panels, what is the arc?', ARCS),
  boil: noul('If the print moves, do its marks redraw every few frames, like hand-drawn animation boiling, rather than holding still?'),
  blend: choice('If the hero is shown as a close portrait, how does the scene join it?', PORTRAIT_BLENDS),
} satisfies QuestionSet;

export const PRESENTATION_NAMES: readonly string[] = Object.keys(PRESENTATION_QUESTIONS);

/** Presentations whose later plates are whole new readings rather than the same settled scene. */
export const SECOND_READINGS: readonly PresentationKind[] = ['critics', 'opposite', 'telephone'];

export interface Plate {
  title: string;
  /** Added to the settled mood, then clamped. */
  shift?: Partial<Mood>;
  /** Replaces settled mood values outright. */
  set?: Partial<Mood>;
  framing?: Partial<Framing>;
}

export interface Presentation {
  kind: PresentationKind;
  arc: Arc | null;
  plates: Plate[];
  /** The plate shown in the frame and saved as the print. */
  primary: number;
  /** A moving print redraws its marks every few frames. Absent means hold still. */
  boil?: boolean;
  /** How the scene joins a portrait of the hero. Present only for a portrait. */
  blend?: PortraitBlend;
}

const STRIPS: Record<Arc, Plate[]> = {
  arrival: [
    { title: 'before', shift: { density: -0.45, energy: -0.2 } },
    { title: 'the moment', shift: { energy: 0.25 } },
    { title: 'after', shift: { energy: -0.3, cheer: 0.1 } },
  ],
  disruption: [
    { title: 'calm', shift: { energy: -0.3, wear: -0.15 } },
    { title: 'the moment', shift: { energy: 0.45, warmth: 0.15 } },
    { title: 'the damage', shift: { wear: 0.4, energy: -0.4, cheer: -0.25, density: -0.2 } },
  ],
  departure: [
    { title: 'all in place', shift: { density: 0.1 } },
    { title: 'the leaving', shift: { energy: 0.2, density: -0.25 } },
    { title: 'what remains', shift: { density: -0.5, wear: 0.15, cheer: -0.2 } },
  ],
  decay: [
    { title: 'new', set: { wear: 0.05 } },
    { title: 'worn', set: { wear: 0.5 } },
    { title: 'ruined', set: { wear: 0.95 }, shift: { density: -0.1 } },
  ],
  night: [
    { title: 'dusk', set: { daylight: 0.9 }, shift: { warmth: 0.15 } },
    { title: 'the dead of night', set: { daylight: 1 }, shift: { warmth: -0.3, cheer: -0.1 } },
    { title: 'first light', set: { daylight: 0.05 }, shift: { warmth: 0.1, cheer: 0.15 } },
  ],
};

/** The plates a settled presentation answer calls for. Unknown answers mean one plate. */
export function presentationOf(answers: Record<string, string | number | boolean>): Presentation {
  const kind = (typeof answers.presentation === 'string' && answers.presentation in PRESENTATIONS ? answers.presentation : 'plate') as PresentationKind;
  const arc = (typeof answers.arc === 'string' && answers.arc in ARCS ? answers.arc : 'arrival') as Arc;
  const presentation = shape(kind, arc);
  if (kind === 'portrait') {
    const blend = (typeof answers.blend === 'string' && answers.blend in PORTRAIT_BLENDS ? answers.blend : 'behind') as PortraitBlend;
    return { ...presentation, blend };
  }
  return answers.boil === true && kind === 'loop' ? { ...presentation, boil: true } : presentation;
}

function shape(kind: PresentationKind, arc: Arc): Presentation {
  switch (kind) {
    case 'hours':
      return {
        kind, arc: null, primary: 1,
        plates: [
          { title: 'first light', set: { daylight: 0.05 }, shift: { warmth: 0.1 } },
          { title: 'noon', set: { daylight: 0.5 }, shift: { warmth: -0.05 } },
          { title: 'last light', set: { daylight: 0.95 }, shift: { warmth: 0.2 } },
        ],
      };
    case 'strip':
      return { kind, arc, primary: 1, plates: STRIPS[arc].map((plate) => ({ ...plate })) };
    case 'approach':
      return {
        kind, arc: null, primary: 1,
        plates: [
          { title: 'from afar', framing: { distance: 0.95, elevation: 0.6 } },
          { title: 'close', framing: { distance: 0.12, elevation: 0.4 } },
        ],
      };
    case 'critics':
      // The second plate is another model's whole reading; the page names the plates after the models.
      return { kind, arc: null, primary: 0, plates: [{ title: 'first critic' }, { title: 'second critic' }] };
    case 'opposite':
      return { kind, arc: null, primary: 0, plates: [{ title: 'the idea' }, { title: 'its opposite' }] };
    case 'telephone':
      return { kind, arc: null, primary: 0, plates: [{ title: 'first hearing' }, { title: 'second hearing' }, { title: 'third hearing' }] };
    case 'loop':
      return { kind, arc: null, primary: 0, plates: [{ title: 'loop' }] };
    case 'portrait':
      // The page renders the hero alone, then composes it with the scene; the second plate is the scene as built.
      return { kind, arc: null, primary: 0, plates: [{ title: 'portrait' }, { title: 'the scene' }] };
    case 'styles':
      // Each later plate moves to the model's next most likely art medium; the page titles plates by their look.
      return { kind, arc: null, primary: 0, plates: [{ title: 'first medium' }, { title: 'second medium' }, { title: 'third medium' }] };
    default:
      return { kind: 'plate', arc: null, primary: 0, plates: [{ title: 'plate' }] };
  }
}

const MOOD_LEVELS: Record<keyof Mood, readonly string[]> = {
  wear: ['Factory new, untouched', 'Lightly used', 'Worn and lived-in', 'Battered and neglected', 'Ruined'],
  warmth: ['Icy blue', 'Cool', 'Neutral daylight', 'Warm', 'Furnace orange'],
  energy: ['Frozen still', 'A slow drift', 'Gentle', 'Lively', 'Frantic'],
  density: ['One lone object', 'A pair', 'A small group', 'Crowded', 'Overflowing'],
  daylight: ['Low from one side, first light', 'A slanting morning sun', 'High overhead, noon', 'A slanting late-afternoon sun', 'Low from the other side, last light'],
  cheer: ['Grim, grieving or menacing', 'Uneasy or melancholy', 'Neutral, matter-of-fact', 'Content, playful', 'Joyful, exuberant'],
};
const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** Apply one plate's mood changes. The direction rulings are annotated so the tree explains the change. */
export function adjustMood(mood: Mood, plate: Plate, rulings: Ruling[], note: string): Mood {
  const result = { ...mood };
  const changed = new Set<keyof Mood>();
  for (const [key, value] of Object.entries(plate.set ?? {}) as [keyof Mood, number][]) {
    if (typeof value !== 'number') continue;
    result[key] = clamp(value);
    changed.add(key);
  }
  for (const [key, value] of Object.entries(plate.shift ?? {}) as [keyof Mood, number][]) {
    if (typeof value !== 'number') continue;
    result[key] = clamp(result[key] + value);
    changed.add(key);
  }
  for (const key of changed) {
    const ruling = rulings.find((candidate) => candidate.owner === 'direction' && candidate.name === key);
    if (!ruling) continue;
    const levels = MOOD_LEVELS[key];
    ruling.picked = levels[Math.round(result[key] * (levels.length - 1))];
    ruling.note = note;
  }
  return result;
}
