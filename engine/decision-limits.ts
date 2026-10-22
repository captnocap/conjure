/** Shared request boundaries used by the browser's batcher and the decision API validator. */
export const MAX_IDEA_CHARACTERS = 600;
export const MAX_BRIEF_CHARACTERS = 1200;
export const MAX_QUESTIONS_PER_REQUEST = 400;
export const MAX_NOUL_ASK_CHARACTERS = 900;

/** Conservative transport budget, including the repeated idea, brief and question overhead. */
export const BATCH_CHARACTERS = 20_000;

/** Wider choices become independent yes/no questions and are reassembled after consultation. */
export const WIDEST_CHOICE = 100;
