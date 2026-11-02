import type { Question, QuestionSet } from '@conjure/kit';
import { hashText, seeded } from '../kit/random';
import type { Verdict } from './oracle';

/** One line of the decision sheet: what was asked, what was picked, and how sure the model was. */
export interface Ruling {
  owner: string;
  name: string;
  ask: string;
  picked: string;
  /** The model's probability for the pick, or its position on a rubric. */
  confidence: number;
  /** The strongest alternatives, most likely first. */
  alternatives: { label: string; p: number }[];
  /** How the question was put, so a decision tree can draw it. */
  kind?: 'choice' | 'score' | 'noul';
  /** Every answer that was on the table with the model's probability, most likely first (the widest choices are cut to the top few). */
  options?: { label: string; p: number }[];
  /** Set when a person chose this answer by branching, instead of the model. */
  forced?: boolean;
  /** Explains exploration or a derived constraint without relabeling it as model confidence. */
  note?: string;
}

/** Answers a person has pinned by branching: question name → the answer to use. */
export type Forced = Readonly<Record<string, string | number | boolean>>;
const MOST_OPTIONS = 10;

/**
 * A finish (a look's own answers, the vector composition, the otherworld pass) explores on rerolls
 * instead of resampling: rolling again should never keep printing the same treatment.
 */
export interface Exploring {
  /** Which reroll this is; each one moves a step along every choice's tour. */
  roll: number;
  /** Fixes the tour's order for one idea and one owner. */
  seed: number;
  /** Options under this share sit out of the tour; EXPLORE_FLOOR when absent. */
  floor?: number;
}
/** Options the model gave less than this share are left out of a tour, unless fewer than three would remain. */
export const EXPLORE_FLOOR = 0.03;
const EXPLORE_MINIMUM = 3;
/** Scores and yes/no answers of an exploring finish are drawn this much warmer. */
export const EXPLORE_WARMTH = 1.6;
export const EXPLORE_NOTE = 'Rerolls tour this finish\u2019s plausible answers, the model\u2019s favourite first. Percentages show model relevance.';

/**
 * A repeatable tour of a choice's answers: a weighted random order, so the model's favourite most
 * often comes first but different ideas do not all open on the same answer, with each answer visited
 * once per cycle of rerolls. Answers below `floor` sit out, unless fewer than three would remain.
 * A new cycle never opens on the answer the last one closed on.
 */
export function explore(weights: Readonly<Record<string, number>>, labels: readonly string[], turn: number, seed: number, floor = 0): string {
  if (!labels.length) throw new Error('Cannot explore an empty set of options.');
  const weight = (label: string) => weights[label] ?? 0;
  const tiebreak = seeded(seed ^ 0x51ed270b);
  const jitter = new Map(labels.map((label) => [label, tiebreak()]));
  const ranked = [...labels].sort((a, b) => weight(b) - weight(a) || jitter.get(a)! - jitter.get(b)!);
  const kept = ranked.filter((label, index) => index < EXPLORE_MINIMUM || weight(label) >= floor);
  const step = Math.max(0, Math.floor(turn));
  const cycles = Math.floor(step / kept.length);
  let order: string[] = [];
  for (let cycle = 0; cycle <= cycles; cycle++) {
    const random = seeded(seed ^ Math.imul(cycle + 1, 0x9e3779b9));
    const previous = order.at(-1), next: string[] = [], remaining = [...kept];
    while (remaining.length) {
      const total = remaining.reduce((sum, label) => sum + Math.max(0.01, weight(label)), 0);
      let draw = random() * total, index = remaining.length - 1;
      for (let i = 0; i < remaining.length; i++) if ((draw -= Math.max(0.01, weight(remaining[i]))) <= 0) { index = i; break; }
      next.push(remaining.splice(index, 1)[0]);
    }
    if (next.length > 1 && next[0] === previous) next.push(next.shift()!);
    order = next;
  }
  return order[step % kept.length];
}

/**
 * Temperature 0 always takes the model's first choice. Higher values sample from its
 * probabilities, so a reroll stays inside what the model thought plausible.
 */
function sample(weights: [string, number][], temperature: number, random: () => number): string {
  if (temperature <= 0) return weights.reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
  const sharpened = weights.map(([label, p]) => [label, Math.max(p, 1e-6) ** (1 / temperature)] as const);
  let remaining = random() * sharpened.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [label, weight] of sharpened) if ((remaining -= weight) <= 0) return label;
  return sharpened.at(-1)![0];
}

/**
 * A score's expectation is the right answer for one hump of probability and the wrong one for two:
 * light split between first and last light averages to noon, which the model all but ruled out.
 * When the level nearest the expectation holds under 15% and at least 15% lies on each side of it,
 * the expectation sits in a trough; settle inside the heavier side instead, at its own weighted mean.
 */
export function representative(value: number, probabilities: readonly number[]): number {
  const top = probabilities.length - 1;
  const near = Math.round(value * top);
  if (top < 2 || near <= 0 || near >= top || probabilities[near] >= 0.15) return value;
  const side = (from: number, to: number) => {
    let mass = 0; let sum = 0;
    for (let level = from; level <= to; level++) { mass += probabilities[level]; sum += probabilities[level] * (level / top); }
    return { mass, mean: mass > 0 ? sum / mass : value };
  };
  const below = side(0, near - 1);
  const above = side(near + 1, top);
  if (below.mass < 0.15 || above.mass < 0.15) return value;
  return below.mass >= above.mass ? below.mean : above.mean;
}

export function settleOne(
  question: Question,
  verdict: Verdict | undefined,
  temperature: number,
  random: () => number,
  /** How far a sampled score leans from the model's expectation toward the sampled level. */
  lean = 0.5,
): { value: string | number | boolean; ruling: Omit<Ruling, 'owner' | 'name'> } {
  if (question.type === 'choice') {
    const labels = Object.keys(question.options);
    const known = verdict?.type === 'choice' ? verdict.probabilities : {};
    const weights = labels.map((label) => [label, known[label] ?? 0] as [string, number]);
    // An unanswered question falls back to an even draw rather than always the first option.
    if (!weights.some(([, p]) => p > 0)) weights.forEach((entry) => (entry[1] = 1 / labels.length));
    const picked = sample(weights, verdict ? temperature : 1, random);
    return {
      value: picked,
      ruling: {
        ask: question.ask,
        picked,
        confidence: weights.find(([label]) => label === picked)![1],
        alternatives: weights
          .filter(([label]) => label !== picked)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([label, p]) => ({ label, p })),
        kind: 'choice',
        options: [...weights].sort((a, b) => b[1] - a[1]).slice(0, MOST_OPTIONS).map(([label, p]) => ({ label, p })),
      },
    };
  }
  if (question.type === 'score') {
    const top = question.levels.length - 1;
    let value = verdict?.type === 'score' ? (verdict.probabilities.length === top + 1 ? representative(verdict.value, verdict.probabilities) : verdict.value) : 0.5;
    if (temperature > 0 && verdict?.type === 'score' && verdict.probabilities.length === top + 1) {
      const level = Number(
        sample(
          verdict.probabilities.map((p, index) => [String(index), p]),
          temperature,
          random,
        ),
      );
      // Lean toward the sampled level without leaving the model's expectation behind.
      value = value * (1 - lean) + (level / top) * lean;
    }
    return {
      value,
      ruling: {
        ask: question.ask,
        picked: question.levels[Math.round(value * top)],
        confidence: value,
        alternatives: [],
        kind: 'score',
        options: question.levels.map((label, index) => ({
          label,
          p: verdict?.type === 'score' && verdict.probabilities.length === top + 1 ? verdict.probabilities[index] : 0,
        })),
      },
    };
  }
  const p = verdict?.type === 'noul' ? verdict.p : 0.5;
  // Above temperature 1 a yes/no softens toward even odds, as a choice's probabilities do.
  const soft = temperature > 1 ? p ** (1 / temperature) / (p ** (1 / temperature) + (1 - p) ** (1 / temperature)) : p;
  const yes = temperature <= 0 ? p >= 0.5 : random() < soft;
  return {
    value: yes,
    ruling: {
      ask: question.ask,
      picked: yes ? 'yes' : 'no',
      confidence: yes ? p : 1 - p,
      alternatives: [],
      kind: 'noul',
      options: [
        { label: 'yes', p },
        { label: 'no', p: 1 - p },
      ],
    },
  };
}

/** Turn a pinned answer into a value of the question's own type, or nothing if it does not fit. */
function pin(question: Question, wanted: string | number | boolean | undefined) {
  if (wanted === undefined) return null;
  const chance = (label: string) => (ruling: Omit<Ruling, 'owner' | 'name'>) => ruling.options?.find((option) => option.label === label)?.p ?? 0;
  if (question.type === 'choice')
    return typeof wanted === 'string' && wanted in question.options ? { value: wanted, picked: wanted, confidence: chance(wanted) } : null;
  if (question.type === 'score') {
    const value = Math.min(1, Math.max(0, Number(wanted)));
    if (!Number.isFinite(value)) return null;
    return { value, picked: question.levels[Math.round(value * (question.levels.length - 1))], confidence: () => value };
  }
  const yes = wanted === true || wanted === 'yes';
  return { value: yes, picked: yes ? 'yes' : 'no', confidence: chance(yes ? 'yes' : 'no') };
}

export function settle(
  owner: string,
  questions: QuestionSet,
  verdicts: Record<string, Verdict>,
  temperature: number,
  random: () => number,
  rulings: Ruling[],
  forced: Forced = {},
  exploring?: Exploring,
): Record<string, string | number | boolean> {
  const answers: Record<string, string | number | boolean> = {};
  const warm = !!exploring && temperature > 0;
  for (const [name, question] of Object.entries(questions)) {
    // The draw is always made, so pinning one answer leaves every other draw of the roll as it was.
    let { value, ruling } = settleOne(question, verdicts[name], warm ? temperature * EXPLORE_WARMTH : temperature, random, warm ? 0.75 : 0.5);
    const pinned = pin(question, forced[name]);
    if (warm && !pinned && question.type === 'choice') {
      const verdict = verdicts[name];
      const known = verdict?.type === 'choice' ? verdict.probabilities : {};
      const labels = Object.keys(question.options);
      const weights = Object.fromEntries(labels.map((label) => [label, known[label] ?? 0]));
      value = explore(weights, labels, exploring!.roll, (exploring!.seed ^ hashText(name)) >>> 0, exploring!.floor ?? EXPLORE_FLOOR);
      ruling = {
        ...ruling,
        picked: value,
        confidence: weights[value],
        alternatives: labels.filter((label) => label !== value).sort((a, b) => weights[b] - weights[a]).slice(0, 3).map((label) => ({ label, p: weights[label] })),
        note: EXPLORE_NOTE,
      };
    }
    answers[name] = pinned ? pinned.value : value;
    rulings.push({ owner, name, ...ruling, ...(pinned ? { picked: pinned.picked, confidence: pinned.confidence(ruling), forced: true } : {}) });
  }
  return answers;
}
