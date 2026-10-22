import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { PROVIDERS, PROVIDER_IDS, ProviderError, Providers, type WireQuestion } from '../server/providers';

const questions: WireQuestion[] = [
  { type: 'choice', ask: 'Which setting?', options: { 'worlds/a': 'A place.', 'worlds/b': 'Another place.' } },
  { type: 'score', ask: 'How worn?', levels: ['New', 'Used', 'Ruined'] },
  { type: 'noul', ask: 'Is it raining?' },
];
const answers = {
  q0: { type: 'choice', choice: 'worlds/b', confidence: 0.6, probabilities: { 'worlds/a': 0.3, 'worlds/b': 0.7 } },
  q1: { type: 'score', score: 1.5, confidence: 0.5, probabilities: { '0': 0, '1': 0.5, '2': 0.5 }, legend: { '0': 'New', '1': 'Used', '2': 'Ruined' } },
  q2: { type: 'noul', noul: 0.9 },
};

function mockFetch(context: TestContext, reply: (url: string, init: RequestInit) => { status?: number; body: unknown }) {
  const calls: { url: string; init: RequestInit; body: Record<string, unknown> }[] = [];
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {}, body: JSON.parse(String(init?.body ?? '{}')) });
    const { status = 200, body } = reply(url, init ?? {});
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': typeof body === 'string' ? 'text/plain' : 'application/json' } });
  }) as typeof fetch;
  context.mock.method(globalThis, 'fetch', fetcher);
  return calls;
}

test('every provider has a key variable, a base URL (except custom) and known models', () => {
  for (const id of PROVIDER_IDS) {
    const provider = PROVIDERS[id];
    assert.equal(provider.id, id);
    assert.ok(provider.keyEnv.endsWith('_API_KEY'));
    assert.ok(id === 'custom' ? provider.baseURL === '' : /^https:\/\//.test(provider.baseURL));
    assert.ok(provider.path.startsWith('/'));
    assert.ok(provider.models.length >= 1);
    assert.ok(provider.inputUsdPerMillion > 0);
  }
});

test('nothing configured: no default, no models, and resolving fails plainly', () => {
  const providers = new Providers({});
  assert.deepEqual(providers.configured, []);
  assert.equal(providers.default, null);
  assert.equal(providers.defaultModel(), null);
  assert.deepEqual(providers.offered(), []);
  assert.throws(() => providers.resolve('jev-latest'), /No decision provider is configured/);
});

test('one key configures one provider; bare model names belong to it and keep working (the original NanoGPT setup)', () => {
  const providers = new Providers({ NANO_GPT_API_KEY: 'k', CONJURE_MODEL: 'typesafe/jev-latest', CONJURE_MODELS: 'typesafe/jev-latest,liquid/d1' });
  assert.deepEqual(providers.configured.map((provider) => provider.id), ['nanogpt']);
  assert.equal(providers.defaultModel(), 'nanogpt:typesafe/jev-latest');
  assert.deepEqual(providers.offered(), ['nanogpt:typesafe/jev-latest', 'nanogpt:liquid/d1']);
  assert.deepEqual(providers.resolve('liquid/d1'), { provider: providers.configured[0], model: 'liquid/d1' });
  assert.equal(providers.configured[0].inputUsdPerMillion, PROVIDERS.nanogpt.inputUsdPerMillion);
});

test('several keys configure several providers, each model named by its provider, with TypeSafe first by default', () => {
  const providers = new Providers({ TYPESAFE_API_KEY: 't', OPENROUTER_API_KEY: 'o', NANO_GPT_API_KEY: 'n' });
  assert.deepEqual(providers.configured.map((provider) => provider.id), ['typesafe', 'openrouter', 'nanogpt']);
  assert.equal(providers.defaultModel(), 'typesafe:jev-latest');
  const offered = providers.offered();
  assert.equal(offered[0], 'typesafe:jev-latest');
  assert.ok(offered.includes('openrouter:liquid/d1') && offered.includes('nanogpt:typesafe/jev-latest'));
  assert.equal(new Set(offered).size, offered.length, 'no model offered twice');
  // A model id may itself contain a colon (OpenRouter's :free variants); only a known provider prefix is split off.
  assert.deepEqual(providers.resolve('openrouter:inception/mercury-decide:free'), { provider: providers.configured[1], model: 'inception/mercury-decide:free' });
  assert.equal(providers.canonicalise('inception/mercury-decide:free'), 'typesafe:inception/mercury-decide:free', 'an unknown prefix is part of the model name on the default provider');
  assert.throws(() => providers.resolve('custom:jev-latest'), /custom is not configured: set CONJURE_API_KEY/);
  assert.throws(() => providers.resolve('openrouter:'), /names no model/);
});

test('CONJURE_PROVIDER picks the default among configured providers, and CONJURE_MODEL joins the offered list', () => {
  const providers = new Providers({ TYPESAFE_API_KEY: 't', OPENROUTER_API_KEY: 'o', CONJURE_PROVIDER: 'openrouter', CONJURE_MODEL: 'liquid/d1-ultra', CONJURE_MODELS: 'typesafe:jev-latest,~typesafe/jev-latest' });
  assert.equal(providers.default?.id, 'openrouter');
  assert.equal(providers.defaultModel(), 'openrouter:liquid/d1-ultra');
  assert.deepEqual(providers.offered(), ['openrouter:liquid/d1-ultra', 'typesafe:jev-latest', 'openrouter:~typesafe/jev-latest']);
  assert.throws(() => new Providers({ TYPESAFE_API_KEY: 't', CONJURE_PROVIDER: 'nanogpt' }), /NANO_GPT_API_KEY is not set/);
  assert.throws(() => new Providers({ TYPESAFE_API_KEY: 't', CONJURE_PROVIDER: 'elsewhere' }), /must be one of/);
});

test('a custom provider needs a base URL and may name its own path and price; base URL overrides lose trailing slashes', () => {
  assert.throws(() => new Providers({ CONJURE_API_KEY: 'c' }), /CONJURE_BASE_URL/);
  const providers = new Providers({ CONJURE_API_KEY: 'c', CONJURE_BASE_URL: 'https://decisions.example/api/', CONJURE_DECISION_PATH: '/decide', CONJURE_INPUT_USD_PER_MILLION: '0.5', OPENROUTER_API_KEY: 'o', OPENROUTER_BASE_URL: 'https://proxy.example/openrouter/' });
  const custom = providers.configured.find((provider) => provider.id === 'custom')!;
  assert.equal(custom.baseURL, 'https://decisions.example/api');
  assert.equal(custom.path, '/decide');
  assert.equal(custom.inputUsdPerMillion, 0.5);
  assert.equal(providers.configured.find((provider) => provider.id === 'openrouter')!.baseURL, 'https://proxy.example/openrouter');
});

test('a decision is one POST per provider in the System One shape, and the answer is normalised', async (context) => {
  const providers = new Providers({ OPENROUTER_API_KEY: 'o-key', TYPESAFE_API_KEY: 't-key', NANO_GPT_API_KEY: 'n-key' });
  const calls = mockFetch(context, (url) => ({ body: { model: url.includes('openrouter') ? 'typesafe/jev-1.14-20261014' : 'jev-1.13.0', answers, usage: url.includes('openrouter') ? { input_tokens: 476, output_tokens: 70, cost: 0.00002 } : url.includes('nano-gpt') ? { input_tokens: 476, estimated_cost: 0.00003 } : { input_tokens: 476, output_tokens: 0 } } }));
  const viaOpenRouter = await providers.decide('openrouter:liquid/d1', 'a quiet harbour', 'Judge well.', questions);
  const [call] = calls;
  assert.equal(call.url, 'https://openrouter.ai/api/alpha/decisions');
  assert.equal(call.init.method, 'POST');
  const headers = call.init.headers as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer o-key');
  assert.equal(headers['X-Title'], 'Conjure');
  assert.equal(call.body.model, 'liquid/d1');
  assert.deepEqual(call.body.state, { task: 'Judge well.', idea: 'a quiet harbour' });
  assert.deepEqual(call.body.questions, {
    q0: { type: 'choice', instructions: 'Which setting?', criteria: { 'worlds/a': 'A place.', 'worlds/b': 'Another place.' } },
    q1: { type: 'score', instructions: 'How worn?', criteria: ['New', 'Used', 'Ruined'] },
    q2: { type: 'noul', instructions: 'Is it raining?' },
  });
  assert.deepEqual(viaOpenRouter, {
    model: 'openrouter:typesafe/jev-1.14-20261014', inputTokens: 476, costUsd: 0.00002, estimated: false,
    verdicts: [
      { type: 'choice', probabilities: { 'worlds/a': 0.3, 'worlds/b': 0.7 } },
      { type: 'score', value: 0.75, probabilities: [0, 0.5, 0.5] },
      { type: 'noul', p: 0.9 },
    ],
  });
  const viaTypeSafe = await providers.decide('jev-latest', 'a quiet harbour', 'Judge well.', questions);
  assert.equal(calls[1].url, 'https://api.typesafe.ai/v1/systemone');
  assert.equal((calls[1].init.headers as Record<string, string>).Authorization, 'Bearer t-key');
  assert.equal(calls[1].body.model, 'jev-latest');
  assert.equal(viaTypeSafe.model, 'typesafe:jev-1.13.0');
  assert.equal(viaTypeSafe.estimated, true, 'TypeSafe reports no cost, so it is computed from the input tokens');
  assert.ok(Math.abs(viaTypeSafe.costUsd - (476 * PROVIDERS.typesafe.inputUsdPerMillion) / 1_000_000) < 1e-12);
  const viaNano = await providers.decide('nanogpt:typesafe/jev-latest', 'a quiet harbour', 'Judge well.', questions);
  assert.equal(calls[2].url, 'https://nano-gpt.com/api/v1/systemone');
  assert.equal(viaNano.costUsd, 0.00003, 'an estimated cost reported by the provider counts as reported');
  assert.equal(viaNano.estimated, false);
});

test('provider failures become one readable message with the HTTP status', async (context) => {
  const providers = new Providers({ OPENROUTER_API_KEY: 'o', TYPESAFE_API_KEY: 't' });
  mockFetch(context, (url, init) => {
    if (url.includes('openrouter')) return { status: 401, body: { error: { message: 'No auth credentials found', code: 401 } } };
    if (String(init.body).includes('"model":"jev-wrong"')) return { status: 422, body: { detail: [{ loc: ['body', 'model'], msg: 'unknown model', type: 'value_error' }] } };
    return { body: { model: 'jev-latest', answers: { q0: { type: 'noul', noul: 0.5 } }, usage: { input_tokens: 1 } } };
  });
  await assert.rejects(providers.decide('openrouter:liquid/d1', 'x', 'y', questions), (error: unknown) => error instanceof ProviderError && error.status === 401 && /OpenRouter returned HTTP 401: No auth credentials found/.test(error.message));
  await assert.rejects(providers.decide('typesafe:jev-wrong', 'x', 'y', questions), (error: unknown) => error instanceof ProviderError && error.status === 422 && /body\.model: unknown model/.test(error.message));
  await assert.rejects(providers.decide('typesafe:jev-latest', 'x', 'y', questions), (error: unknown) => error instanceof ProviderError && /returned no choice answer for question 0/.test(error.message));
});

test('refresh asks TypeSafe and OpenRouter for their decision models and keeps the known list when they cannot answer', async (context) => {
  const providers = new Providers({ TYPESAFE_API_KEY: 't', OPENROUTER_API_KEY: 'o', NANO_GPT_API_KEY: 'n' });
  const calls = mockFetch(context, (url) => {
    if (url === 'https://api.typesafe.ai/v1/models') return { body: { models: [{ name: 'jev-latest', description: '', release_date: '' }, { name: 'jev-preview', description: '', release_date: '' }, { name: 'jev-1.14.0', description: '', release_date: '' }] } };
    if (url.startsWith('https://openrouter.ai/api/v1/models')) return { status: 500, body: 'down' };
    throw new Error(`unexpected ${url}`);
  });
  await providers.refresh();
  assert.deepEqual(calls.map((call) => call.url), ['https://api.typesafe.ai/v1/models', 'https://openrouter.ai/api/v1/models?output_modalities=decisions'], 'NanoGPT has no decision-model listing and is not asked');
  assert.deepEqual(providers.configured[0].models, ['jev-latest', 'jev-preview', 'jev-1.14.0']);
  assert.deepEqual(providers.configured[1].models, [...PROVIDERS.openrouter.models], 'a failed listing keeps the known models');
  assert.ok(providers.offered().includes('typesafe:jev-1.14.0'));
});
