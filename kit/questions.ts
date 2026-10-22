import type { ChoiceQuestion, NoulQuestion, ScoreQuestion } from './contract';

export const choice = <const K extends string>(
  ask: string,
  options: Readonly<Record<K, string>>,
): ChoiceQuestion<K> => ({ type: 'choice', ask, options });

export const score = (ask: string, levels: readonly [string, string, ...string[]]): ScoreQuestion => ({
  type: 'score',
  ask,
  levels,
});

export const noul = (ask: string): NoulQuestion => ({ type: 'noul', ask });

/**
 * A choice whose options come from a catalogue at runtime. Each entry is described to the model
 * by `describe`, which should say what the option looks or feels like, not repeat its id.
 */
export const choiceFrom = <T>(
  ask: string,
  entries: readonly T[],
  key: (entry: T) => string,
  describe: (entry: T) => string,
): ChoiceQuestion => ({
  type: 'choice',
  ask,
  options: Object.fromEntries(entries.map((entry) => [key(entry), describe(entry)])),
});

/** "tufted-wingback" → "tufted wingback": a readable fallback when a catalogue has no descriptions. */
export const words = (id: string) => id.replace(/[-_]+/g, ' ').trim();
