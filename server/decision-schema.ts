import { z } from 'zod';
import { MAX_BRIEF_CHARACTERS, MAX_IDEA_CHARACTERS, MAX_NOUL_ASK_CHARACTERS, MAX_QUESTIONS_PER_REQUEST } from '../engine/decision-limits';

const text = z.string().trim().min(1);
const question = z.discriminatedUnion('type', [
  z.object({ type: z.literal('choice'), ask: text.max(600), options: z.record(text.max(120), z.string().max(600)) }).strict(),
  z.object({ type: z.literal('score'), ask: text.max(600), levels: z.array(z.string().max(300)).min(2).max(12) }).strict(),
  z.object({ type: z.literal('noul'), ask: text.max(MAX_NOUL_ASK_CHARACTERS) }).strict(),
]);

/** The same schema the live API uses, importable without starting a server or loading a key. */
export const decideSchema = z
  .object({
    idea: text.max(MAX_IDEA_CHARACTERS),
    brief: text.max(MAX_BRIEF_CHARACTERS),
    model: z.string().optional(),
    questions: z.array(question).min(1).max(MAX_QUESTIONS_PER_REQUEST),
  })
  .strict();
