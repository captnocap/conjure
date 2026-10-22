import express from 'express';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { BudgetLedger } from './budget';
import { gallery } from './gallery';
import { traces } from './traces';
import { decideSchema } from './decision-schema';
import { PROVIDERS, ProviderError, Providers } from './providers';

/**
 * The browser holds the catalogue and writes the questions; this server only adds the API key,
 * enforces the spending limit and returns the model's probabilities. The decision model can come
 * from any configured provider (server/providers.ts); each model is named "<provider>:<model>".
 */
const port = Number(process.env.CONJURE_PORT ?? 3400);
const REQUEST_TIMEOUT_MS = 30_000;
/** Reserved before each request so concurrent batches cannot overrun the budget together. */
const RESERVE_TOKENS = 12_000;

const providers = new Providers(process.env);
await providers.refresh();
const configured = providers.configured.length > 0;
if (configured) console.log(`Decision providers: ${providers.configured.map((provider) => `${provider.title} (${provider.models.length} models)`).join(', ')}. Default ${providers.defaultModel()}.`);
else console.log(`No decision provider is configured: set one of ${Object.values(PROVIDERS).map((provider) => provider.keyEnv).join(', ')} in .env. The studio still works offline (?offline).`);

// Spending is always recorded; it is only capped when CONJURE_BUDGET_USD names a dollar amount.
const budgetSetting = process.env.CONJURE_BUDGET_USD?.trim();
const ledger = new BudgetLedger(
  resolve(process.env.CONJURE_LEDGER_PATH ?? '.data/usage.json'),
  !budgetSetting || /^(none|off|unlimited)$/i.test(budgetSetting) ? null : Number(budgetSetting),
);

const app = express();
const httpServer = createServer(app);
app.disable('x-powered-by');
// The gallery takes whole pictures, so it parses its own larger bodies before the small default.
app.use(gallery);
app.use(traces);
app.use(express.json({ limit: '256kb' }));

app.get('/api/status', (_request, response) =>
  response.json({
    configured,
    defaultModel: providers.defaultModel(),
    models: providers.offered(),
    providers: providers.configured.map((provider) => ({ id: provider.id, title: provider.title, models: provider.models.length })),
    usage: ledger.snapshot(),
  }),
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
  if (!configured) {
    response.status(503).json({ error: `No decision provider is configured. Add one of ${Object.values(PROVIDERS).map((provider) => provider.keyEnv).join(', ')} to the .env file and restart the server.` });
    return;
  }
  const { idea, brief, questions } = parsed.data;
  const model = parsed.data.model ?? providers.defaultModel()!;
  let price: number;
  try {
    price = providers.resolve(model).provider.inputUsdPerMillion;
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    return;
  }
  if (!providers.offered().includes(providers.canonicalise(model))) {
    response.status(400).json({ error: `${model} is not among the offered models (CONJURE_MODELS).` });
    return;
  }
  const reservation = (RESERVE_TOKENS * price) / 1_000_000;
  if (!ledger.reserve(reservation)) {
    response.status(402).json({ error: 'The configured budget is used. Raise CONJURE_BUDGET_USD to continue.' });
    return;
  }
  let settled = false;
  try {
    const decision = await providers.decide(model, idea, brief, questions, { timeoutMs: REQUEST_TIMEOUT_MS });
    ledger.settle(reservation, { cost: decision.costUsd, input: decision.inputTokens, output: 0, decisions: questions.length, estimated: decision.estimated });
    settled = true;
    response.json({ model: decision.model, inputTokens: decision.inputTokens, costUsd: decision.costUsd, verdicts: decision.verdicts });
  } catch (error) {
    // A failed response may still be billed; keep the reservation as a conservative charge.
    if (!settled) ledger.settle(reservation, { cost: reservation, input: 0, output: 0, decisions: 0, estimated: true });
    console.error('Decision request failed:', error instanceof Error ? error.message : error);
    response.status(502).json({ error: error instanceof ProviderError ? error.message : 'The decision model could not be reached.' });
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
