import { APIError, TypeSafeClient, type Questions } from '@typesafe-ai/sdk';
import express from 'express';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { z } from 'zod';
import { BudgetLedger } from './budget';
import { gallery } from './gallery';
import { traces } from './traces';
import { decideSchema } from './decision-schema';

/**
 * The browser holds the catalogue and writes the questions; this server only adds the
 * API key, enforces the spending limit and returns the model's probabilities.
 */
const port = Number(process.env.CONJURE_PORT ?? 3400);
const defaultModel = process.env.CONJURE_MODEL ?? 'typesafe/jev-latest';
const models = (process.env.CONJURE_MODELS ?? defaultModel).split(',').map((model) => model.trim()).filter(Boolean);
if (!models.includes(defaultModel)) models.unshift(defaultModel);
const inputPrice = Number(process.env.CONJURE_INPUT_USD_PER_MILLION ?? 0.25);
const REQUEST_TIMEOUT_MS = 30_000;
/** Reserved before each request so concurrent batches cannot overrun the budget together. */
const RESERVE_TOKENS = 12_000;

// Spending is always recorded; it is only capped when CONJURE_BUDGET_USD names a dollar amount.
const budgetSetting = process.env.CONJURE_BUDGET_USD?.trim();
const ledger = new BudgetLedger(
  resolve(process.env.CONJURE_LEDGER_PATH ?? '.data/usage.json'),
  !budgetSetting || /^(none|off|unlimited)$/i.test(budgetSetting) ? null : Number(budgetSetting),
);
const client = process.env.NANO_GPT_API_KEY
  ? new TypeSafeClient({
      apiKey: process.env.NANO_GPT_API_KEY,
      baseURL: process.env.CONJURE_BASE_URL ?? 'https://nano-gpt.com/api',
      defaultModel,
      timeout: REQUEST_TIMEOUT_MS,
      retry: { maxRetries: 0 },
      logLevel: 'off',
    })
  : null;

const probability = z.number().min(0).max(1);
const answerSchema = z.union([
  z.object({ type: z.literal('choice'), probabilities: z.record(z.string(), probability) }),
  z.object({ type: z.literal('score'), score: z.number().nonnegative(), probabilities: z.record(z.string(), probability).optional() }),
  z.object({ type: z.literal('noul'), noul: probability }),
]);
const resultSchema = z.object({
  model: z.string(),
  answers: z.record(z.string(), answerSchema),
  usage: z.object({ input_tokens: z.number().nonnegative(), cost: z.number().nonnegative().optional(), estimated_cost: z.number().nonnegative().optional() }),
});

const app = express();
const httpServer = createServer(app);
app.disable('x-powered-by');
// The gallery takes whole pictures, so it parses its own larger bodies before the small default.
app.use(gallery);
app.use(traces);
app.use(express.json({ limit: '256kb' }));

app.get('/api/status', (_request, response) =>
  response.json({ configured: client !== null, defaultModel, models, usage: ledger.snapshot() }),
);

app.post('/api/decide', async (request, response) => {
  if (request.headers.origin && (!URL.canParse(request.headers.origin) || new URL(request.headers.origin).host !== request.headers.host)) {
    response.status(403).json({ error: 'Requests must come from this application.' });
    return;
  }
  const parsed = decideSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: `Invalid decision request: ${parsed.error.issues[0].path.join('.')} ${parsed.error.issues[0].message}` });
    return;
  }
  if (!client) {
    response.status(503).json({ error: 'Add NANO_GPT_API_KEY to the .env file and restart the server.' });
    return;
  }
  const { idea, brief, questions } = parsed.data;
  const model = parsed.data.model ?? defaultModel;
  if (!models.includes(model)) {
    response.status(400).json({ error: `${model} is not in CONJURE_MODELS.` });
    return;
  }
  const reservation = (RESERVE_TOKENS * inputPrice) / 1_000_000;
  if (!ledger.reserve(reservation)) {
    response.status(402).json({ error: 'The configured budget is used. Raise CONJURE_BUDGET_USD to continue.' });
    return;
  }

  const named: Questions = {};
  questions.forEach((entry, index) => {
    named[`q${index}`] =
      entry.type === 'choice'
        ? { type: 'choice', instructions: entry.ask, criteria: entry.options }
        : entry.type === 'score'
          ? { type: 'score', instructions: entry.ask, criteria: entry.levels as [string, string, ...string[]] }
          : { type: 'noul', instructions: entry.ask };
  });

  let settled = false;
  try {
    const result = resultSchema.parse(await client.systemOne({ model, state: { task: brief, idea }, questions: named }));
    const reported = result.usage.cost ?? result.usage.estimated_cost;
    const costUsd = reported ?? (result.usage.input_tokens * inputPrice) / 1_000_000;
    ledger.settle(reservation, { cost: costUsd, input: result.usage.input_tokens, output: 0, decisions: questions.length, estimated: reported === undefined });
    settled = true;
    const verdicts = questions.map((entry, index) => {
      const answer = result.answers[`q${index}`];
      if (!answer || answer.type !== entry.type) throw new Error(`The model returned no ${entry.type} answer for question ${index}.`);
      if (answer.type === 'choice') return { type: 'choice', probabilities: answer.probabilities };
      if (answer.type === 'noul') return { type: 'noul', p: answer.noul };
      const top = (entry as { levels: string[] }).levels.length - 1;
      return {
        type: 'score',
        value: Math.min(1, answer.score / top),
        probabilities: answer.probabilities ? Array.from({ length: top + 1 }, (_unused, level) => answer.probabilities![level] ?? 0) : [],
      };
    });
    response.json({ model: result.model, inputTokens: result.usage.input_tokens, costUsd, verdicts });
  } catch (error) {
    // A failed response may still be billed; keep the reservation as a conservative charge.
    if (!settled) ledger.settle(reservation, { cost: reservation, input: 0, output: 0, decisions: 0, estimated: true });
    const status = error instanceof APIError ? error.status : null;
    console.error('Decision request failed:', error instanceof Error ? error.message : error);
    response.status(502).json({
      error: status
        ? `The decision model returned HTTP ${status}${error instanceof Error && error.message ? `: ${error.message.slice(0, 200)}` : '.'}`
        : error instanceof z.ZodError
          ? 'The decision model returned an answer in an unexpected shape.'
          : 'The decision model could not be reached.',
    });
  }
});

app.use('/api', (_request, response) => response.status(404).json({ error: 'API route not found.' }));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (_request, response) => response.sendFile(resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true, hmr: { server: httpServer } }, appType: 'spa' });
  app.use(vite.middlewares);
}

httpServer.listen(port, process.env.CONJURE_HOST ?? '127.0.0.1', () => console.log(`Conjure is ready on ${process.env.CONJURE_HOST ?? '127.0.0.1'}:${port}`));
