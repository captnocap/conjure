import type { Question, QuestionSet } from '@conjure/kit';
import { BATCH_CHARACTERS, MAX_BRIEF_CHARACTERS, MAX_IDEA_CHARACTERS, MAX_NOUL_ASK_CHARACTERS, MAX_QUESTIONS_PER_REQUEST, WIDEST_CHOICE } from './decision-limits';

/** What the decision model said about one question, before anything is picked. */
export type Verdict =
  | { type: 'choice'; probabilities: Record<string, number> }
  | { type: 'score'; value: number; probabilities: number[] }
  | { type: 'noul'; p: number };

export interface Usage {
  requests: number;
  inputTokens: number;
  costUsd: number;
  milliseconds: number;
  model: string;
}

export const noUsage = (): Usage => ({
  requests: 0,
  inputTokens: 0,
  costUsd: 0,
  milliseconds: 0,
  model: '',
});

const SPLIT = '\u0000';

// One JSON separator plus a conservative allowance for the provider's positional key.
const weightOf = (question: Question) => JSON.stringify(question).length + 25;

/**
 * Yes/no probabilities are independent, so they compare across batches. That lets a
 * catalogue of any width be ranked across a chain of bounded requests.
 */
function widen(questions: QuestionSet, capacity: number): QuestionSet {
  const asked: Record<string, Question> = {};
  for (const [name, question] of Object.entries(questions)) {
    if (question.type !== 'choice' || Object.keys(question.options).length <= WIDEST_CHOICE && weightOf(question) <= capacity) {
      asked[name] = question;
      continue;
    }
    for (const [label, description] of Object.entries(question.options)) {
      const ask = `${question.ask} Would this be the right answer? ${description}`;
      // Long valid asks/descriptions cannot be concatenated into a 900-character
      // noul. A binary choice preserves both fields and the same yes/no meaning.
      asked[`${name}${SPLIT}${label}`] = ask.length <= MAX_NOUL_ASK_CHARACTERS
        ? { type: 'noul', ask }
        : { type: 'choice', ask: question.ask, options: { yes: description, no: 'An alternative answer fits better.' } };
    }
  }
  return asked;
}

function narrow(questions: QuestionSet, asked: Record<string, Verdict>): Record<string, Verdict> {
  const verdicts: Record<string, Verdict> = {};
  for (const [name, question] of Object.entries(questions)) {
    if (asked[name]) {
      verdicts[name] = asked[name];
      continue;
    }
    if (question.type !== 'choice') continue;
    const raw = Object.keys(question.options).map((label) => {
      const verdict = asked[`${name}${SPLIT}${label}`];
      const yes = verdict?.type === 'choice' ? verdict.probabilities.yes ?? 0 : 0;
      const total = verdict?.type === 'choice' ? yes + (verdict.probabilities.no ?? 0) : 0;
      return [label, verdict?.type === 'noul' ? verdict.p : total > 0 ? yes / total : 0] as const;
    });
    const total = raw.reduce((sum, [, p]) => sum + p, 0);
    if (total > 0) verdicts[name] = { type: 'choice', probabilities: Object.fromEntries(raw.map(([label, p]) => [label, p / total])) };
  }
  return verdicts;
}

function batches(questions: QuestionSet, capacity: number): [string, Question][][] {
  const groups: [string, Question][][] = [[]];
  let size = 0;
  for (const entry of Object.entries(questions)) {
    const weight = weightOf(entry[1]);
    if (weight > capacity) throw new Error(`Decision question "${entry[0]}" is too large for one request.`);
    if ((size + weight > capacity || groups.at(-1)!.length >= MAX_QUESTIONS_PER_REQUEST) && groups.at(-1)!.length) {
      groups.push([]);
      size = 0;
    }
    groups.at(-1)!.push(entry);
    size += weight;
  }
  return groups.filter((group) => group.length);
}

export interface ConsultOptions {
  model?: string;
  signal?: AbortSignal;
  /** Ask no one: every question is left unanswered and settles as an even draw. For tests and galleries. */
  offline?: boolean;
  /** Read the idea for its exact opposite: every brief says so. */
  stance?: 'opposite';
}

/** Prefixed to every brief when the stance is the opposite of the idea. */
export const OPPOSITE_NOTE = 'Decide for the EXACT OPPOSITE of the idea, not the idea itself: the reverse mood, the place it would never happen, the things that belong to its opposite, the medium that contradicts it.';
export const stanceBrief = (brief: string, options: ConsultOptions | undefined) => options?.stance === 'opposite' ? `${OPPOSITE_NOTE} ${brief}` : brief;

interface DecideResponse {
  model: string;
  inputTokens: number;
  costUsd: number;
  verdicts: Verdict[];
}

/**
 * Put questions to the decision model in a bounded sequence. Keep all probabilities
 * together until the chain finishes, so transport boundaries never affect settlement.
 */
export async function consult(
  idea: string,
  brief: string,
  questions: QuestionSet,
  usage: Usage,
  options: ConsultOptions = {},
): Promise<Record<string, Verdict>> {
  const started = performance.now();
  const verdicts: Record<string, Verdict> = {};
  if (options.offline) return verdicts;
  idea = idea.trim();
  brief = brief.trim();
  if (!idea || idea.length > MAX_IDEA_CHARACTERS)
    throw new Error(`The idea must contain 1–${MAX_IDEA_CHARACTERS} characters.`);
  if (!brief || brief.length > MAX_BRIEF_CHARACTERS)
    throw new Error(`The decision brief is ${brief.length} characters; it must contain 1–${MAX_BRIEF_CHARACTERS}.`);
  const contextSize = JSON.stringify({ idea, brief, model: options.model, questions: [] }).length;
  const capacity = BATCH_CHARACTERS - contextSize;
  if (capacity <= 0) throw new Error('The decision context is too large for one request.');
  // Prepare the whole chain before sending anything: an impossible later question
  // must not spend money on earlier batches before its validation error is found.
  const chain = batches(widen(questions, capacity), capacity);
  try {
    for (const batch of chain) {
      options.signal?.throwIfAborted();
      const response = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: options.signal,
        body: JSON.stringify({
          idea,
          brief,
          model: options.model,
          // Positional names keep component ids out of the provider's key syntax.
          questions: batch.map(([, question]) => question),
        }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error ?? `The decision service returned HTTP ${response.status}.`);
      }
      const result = (await response.json()) as DecideResponse;
      usage.requests++;
      usage.inputTokens += result.inputTokens;
      usage.costUsd += result.costUsd;
      usage.model = result.model;
      if (!Array.isArray(result.verdicts) || result.verdicts.length !== batch.length)
        throw new Error('The decision service returned an incomplete batch of answers.');
      batch.forEach(([name, question], index) => {
        if (result.verdicts[index]?.type !== question.type)
          throw new Error(`The decision service returned the wrong answer type for "${name}".`);
        verdicts[name] = result.verdicts[index];
      });
      options.signal?.throwIfAborted();
    }
  } finally {
    usage.milliseconds += performance.now() - started;
  }
  return narrow(questions, verdicts);
}
