/** Shared request boundaries used by the browser's batcher and the decision API validator. */
export const MAX_IDEA_CHARACTERS = 600;
export const MAX_BRIEF_CHARACTERS = 1200;
export const MAX_QUESTIONS_PER_REQUEST = 400;
export const MAX_NOUL_ASK_CHARACTERS = 900;

/** Conservative transport budget, including the repeated idea, brief and question overhead. */
export const BATCH_CHARACTERS = 20_000;

/** Wider choices become independent yes/no questions and are reassembled after consultation. */
export const WIDEST_CHOICE = 100;

export interface RequestLimits {
  /** Questions in one request. */
  questions: number;
  /** Choices wider than this are asked as independent yes/no questions. */
  widestChoice: number;
  /** Transport budget for one request, as in BATCH_CHARACTERS. */
  characters: number;
}

/**
 * Some decision models take less per request than the protocol allows; batches shrink to fit
 * them. Measured on NanoGPT 2026-10-29: vLLM Semantic Router's d3 models take at most 64 questions
 * and 26 choice options, eu/jev Jeff eight questions and 64 options, Cloudflare's Clef admits about
 * 1,800 estimated tokens of brief and questions together, and Kev 4B has an 8K-token context.
 */
export function limitsFor(model?: string): RequestLimits {
  const id = (model ?? '').toLowerCase();
  const limits: RequestLimits = { questions: MAX_QUESTIONS_PER_REQUEST, widestChoice: WIDEST_CHOICE, characters: BATCH_CHARACTERS };
  if (/vllm-sr\/decision-/.test(id)) return { ...limits, questions: 64, widestChoice: 26 };
  if (/eu-jev\//.test(id)) return { ...limits, questions: 8, widestChoice: 64 };
  if (/cloudflare\/clef/.test(id)) return { ...limits, questions: 30, characters: 4_500 };
  if (/kev-4b/.test(id)) return { ...limits, characters: 14_000 };
  return limits;
}
