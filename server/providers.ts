import { z } from 'zod';

/**
 * The decision model behind the studio can come from any host of the System One protocol (typed
 * questions in, probabilities out): TypeSafe AI itself, OpenRouter's Decisions API, NanoGPT, or any
 * other base URL. Any number of providers may be configured at once, each by its own API key, and
 * every model is offered as "<provider>:<model>" so two providers can even read the same idea as the
 * two critics. The server adds the key, forwards the questions and normalises the answer.
 */
export const PROVIDER_IDS = ['typesafe', 'openrouter', 'nanogpt', 'custom'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface ProviderDefinition {
  id: ProviderId;
  title: string;
  /** The environment variable that holds the API key; the provider is configured when it is set. */
  keyEnv: string;
  /** The environment variable that may override the base URL. */
  baseEnv: string;
  baseURL: string;
  /** The decision endpoint under the base URL. */
  path: string;
  /** Dollars per million input tokens, used when the provider does not report a cost. */
  inputUsdPerMillion: number;
  /** Decision models known to be there, offered until the provider lists its own. */
  models: readonly string[];
  /** How to ask the provider which decision models it has, when it can be asked. */
  list?: (baseURL: string, apiKey: string, signal: AbortSignal) => Promise<string[]>;
}

const JEV_USD_PER_MILLION = 0.042;
const json = async (url: string, apiKey: string, signal: AbortSignal): Promise<unknown> => {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }, signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

export const PROVIDERS: Record<ProviderId, ProviderDefinition> = {
  typesafe: {
    id: 'typesafe', title: 'TypeSafe AI', keyEnv: 'TYPESAFE_API_KEY', baseEnv: 'TYPESAFE_BASE_URL',
    baseURL: 'https://api.typesafe.ai', path: '/v1/systemone', inputUsdPerMillion: JEV_USD_PER_MILLION,
    // Bare names: the direct API has no vendor prefix. jev-latest is the stable release, jev-preview the newest.
    models: ['jev-latest', 'jev-preview'],
    list: async (baseURL, apiKey, signal) => {
      const parsed = z.object({ models: z.array(z.object({ name: z.string() })) }).parse(await json(`${baseURL}/v1/models`, apiKey, signal));
      return parsed.models.map((model) => model.name);
    },
  },
  openrouter: {
    id: 'openrouter', title: 'OpenRouter', keyEnv: 'OPENROUTER_API_KEY', baseEnv: 'OPENROUTER_BASE_URL',
    // The Decisions API takes the same body as System One and serves every decision model OpenRouter lists.
    baseURL: 'https://openrouter.ai/api', path: '/alpha/decisions', inputUsdPerMillion: JEV_USD_PER_MILLION,
    models: ['~typesafe/jev-latest', 'typesafe/jev-1.14', 'liquid/d1', 'perplexity/pplx-decider-v1.2', 'openai/gpt-6-luna-decisions', 'microsoft/microsoft-decision-1', 'cloudflare/clef', 'inception/mercury-decide'],
    list: async (baseURL, apiKey, signal) => {
      const parsed = z.object({ data: z.array(z.object({ id: z.string() })) }).parse(await json(`${baseURL}/v1/models?output_modalities=decisions`, apiKey, signal));
      // TypeSafe's models first, then the rest as listed.
      const ids = parsed.data.map((model) => model.id);
      return [...ids.filter((id) => /typesafe\//.test(id)), ...ids.filter((id) => !/typesafe\//.test(id))];
    },
  },
  nanogpt: {
    id: 'nanogpt', title: 'NanoGPT', keyEnv: 'NANO_GPT_API_KEY', baseEnv: 'NANO_GPT_BASE_URL',
    baseURL: 'https://nano-gpt.com/api', path: '/v1/systemone', inputUsdPerMillion: 0.25,
    // NanoGPT reports each request's cost itself; its model list carries no decision flag, so these stay as named.
    models: ['typesafe/jev-latest', 'perplexity/pplx-decider-v1.2', 'liquid/d1', 'llmtech/decider-4b-nvfp4', 'openai/gpt-6-luna-decisions'],
  },
  custom: {
    id: 'custom', title: 'Custom', keyEnv: 'CONJURE_API_KEY', baseEnv: 'CONJURE_BASE_URL',
    baseURL: '', path: '/v1/systemone', inputUsdPerMillion: JEV_USD_PER_MILLION,
    models: ['jev-latest'],
  },
};

export interface Provider {
  id: ProviderId;
  title: string;
  baseURL: string;
  path: string;
  apiKey: string;
  inputUsdPerMillion: number;
  models: string[];
}

/** A model as the studio names it: "<provider>:<model>". */
export const canonical = (provider: ProviderId, model: string) => `${provider}:${model}`;

export type Env = Record<string, string | undefined>;
const read = (env: Env, name: string) => env[name]?.trim() || undefined;

export interface WireQuestion {
  type: 'choice' | 'score' | 'noul';
  ask: string;
  options?: Record<string, string>;
  levels?: string[];
}
export type Verdict =
  | { type: 'choice'; probabilities: Record<string, number> }
  | { type: 'score'; value: number; probabilities: number[] }
  | { type: 'noul'; p: number };

export interface Decision {
  /** "<provider>:<the model that answered>", which may be a dated snapshot of the one asked for. */
  model: string;
  inputTokens: number;
  costUsd: number;
  /** Set when the provider reported no cost and it was computed from the input tokens. */
  estimated: boolean;
  verdicts: Verdict[];
}

const probability = z.number().min(0).max(1);
const answerSchema = z.union([
  z.object({ type: z.literal('choice'), probabilities: z.record(z.string(), probability) }),
  z.object({ type: z.literal('score'), score: z.number().nonnegative(), probabilities: z.record(z.string(), probability).optional() }),
  z.object({ type: z.literal('noul'), noul: probability }),
]);
export const resultSchema = z.object({
  model: z.string(),
  answers: z.record(z.string(), answerSchema),
  usage: z.object({ input_tokens: z.number().nonnegative(), cost: z.number().nonnegative().optional(), estimated_cost: z.number().nonnegative().optional() }),
});

/** What a failed provider request says, for the status line. */
export class ProviderError extends Error {
  constructor(readonly status: number | null, message: string) {
    super(message);
  }
}

const messageOf = (body: unknown): string | null => {
  if (!body || typeof body !== 'object') return typeof body === 'string' ? body : null;
  const record = body as Record<string, unknown>;
  const error = record.error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && typeof (error as Record<string, unknown>).message === 'string') return (error as Record<string, unknown>).message as string;
  if (typeof record.message === 'string') return record.message;
  // TypeSafe's validation errors: { detail: [{ loc, msg }] }.
  if (Array.isArray(record.detail) && record.detail[0] && typeof record.detail[0] === 'object') {
    const first = record.detail[0] as Record<string, unknown>;
    return typeof first.msg === 'string' ? `${Array.isArray(first.loc) ? first.loc.join('.') + ': ' : ''}${first.msg}` : null;
  }
  return null;
};

export class Providers {
  readonly configured: Provider[];
  readonly default: Provider | null;
  #offered: string[] | null;
  #defaultModel: string | null;

  constructor(env: Env) {
    this.configured = PROVIDER_IDS.flatMap((id) => {
      const definition = PROVIDERS[id];
      const apiKey = read(env, definition.keyEnv);
      const baseURL = (read(env, definition.baseEnv) ?? definition.baseURL).replace(/\/+$/, '');
      if (!apiKey) return [];
      if (!baseURL) throw new Error(`${definition.keyEnv} is set but ${definition.baseEnv} is not: a custom provider needs a base URL.`);
      const price = Number(read(env, 'CONJURE_INPUT_USD_PER_MILLION') ?? definition.inputUsdPerMillion);
      return [{ id, title: definition.title, baseURL, path: read(env, 'CONJURE_DECISION_PATH') && id === 'custom' ? read(env, 'CONJURE_DECISION_PATH')! : definition.path, apiKey, inputUsdPerMillion: Number.isFinite(price) ? price : definition.inputUsdPerMillion, models: [...definition.models] }];
    });
    const wanted = read(env, 'CONJURE_PROVIDER');
    if (wanted && !PROVIDER_IDS.includes(wanted as ProviderId)) throw new Error(`CONJURE_PROVIDER must be one of ${PROVIDER_IDS.join(', ')}.`);
    if (wanted && !this.configured.some((provider) => provider.id === wanted)) throw new Error(`CONJURE_PROVIDER is ${wanted} but ${PROVIDERS[wanted as ProviderId].keyEnv} is not set.`);
    this.default = (wanted ? this.configured.find((provider) => provider.id === wanted) : this.configured[0]) ?? null;
    const listed = read(env, 'CONJURE_MODELS');
    this.#offered = listed ? listed.split(',').map((entry) => entry.trim()).filter(Boolean).map((entry) => this.canonicalise(entry)) : null;
    const chosen = read(env, 'CONJURE_MODEL');
    this.#defaultModel = chosen ? this.canonicalise(chosen) : null;
    if (this.#offered && this.#defaultModel && !this.#offered.includes(this.#defaultModel)) this.#offered.unshift(this.#defaultModel);
  }

  /** "<provider>:<model>" as given, or a bare model name on the default provider. */
  resolve(id: string): { provider: Provider; model: string } {
    const colon = id.indexOf(':');
    const prefix = colon > 0 ? id.slice(0, colon) : '';
    if (PROVIDER_IDS.includes(prefix as ProviderId)) {
      const provider = this.configured.find((candidate) => candidate.id === prefix);
      if (!provider) throw new Error(`${prefix} is not configured: set ${PROVIDERS[prefix as ProviderId].keyEnv}.`);
      const model = id.slice(colon + 1).trim();
      if (!model) throw new Error(`${id} names no model.`);
      return { provider, model };
    }
    if (!this.default) throw new Error('No decision provider is configured.');
    return { provider: this.default, model: id.trim() };
  }

  canonicalise(id: string): string {
    const { provider, model } = this.resolve(id);
    return canonical(provider.id, model);
  }

  /** Every model the interface offers, the default first. */
  offered(): string[] {
    const models = this.#offered ?? this.configured.flatMap((provider) => provider.models.map((model) => canonical(provider.id, model)));
    const first = this.defaultModel();
    return first ? [first, ...models.filter((model) => model !== first)] : models;
  }

  defaultModel(): string | null {
    if (this.#defaultModel) return this.#defaultModel;
    if (!this.default) return null;
    return canonical(this.default.id, this.default.models[0]);
  }

  /** Ask each provider that can be asked for its current decision models. Failures keep the known list. */
  async refresh(timeoutMs = 6000): Promise<void> {
    await Promise.all(this.configured.map(async (provider) => {
      const list = PROVIDERS[provider.id].list;
      if (!list) return;
      try {
        const models = await list(provider.baseURL, provider.apiKey, AbortSignal.timeout(timeoutMs));
        if (models.length) provider.models = models;
      } catch (error) {
        console.warn(`${provider.title}: could not list its models (${error instanceof Error ? error.message : error}); offering the known ones.`);
      }
    }));
  }

  /** One request: the questions are sent positionally, so component ids never meet the provider's key syntax. */
  async decide(id: string, idea: string, brief: string, questions: readonly WireQuestion[], options: { signal?: AbortSignal; timeoutMs?: number; fetch?: typeof fetch } = {}): Promise<Decision> {
    const { provider, model } = this.resolve(id);
    const named: Record<string, unknown> = {};
    questions.forEach((entry, index) => {
      named[`q${index}`] =
        entry.type === 'choice' ? { type: 'choice', instructions: entry.ask, criteria: entry.options ?? {} }
          : entry.type === 'score' ? { type: 'score', instructions: entry.ask, criteria: entry.levels ?? [] }
            : { type: 'noul', instructions: entry.ask };
    });
    const doFetch = options.fetch ?? fetch;
    const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(options.timeoutMs ?? 30_000)]) : AbortSignal.timeout(options.timeoutMs ?? 30_000);
    let response: Response;
    try {
      response = await doFetch(`${provider.baseURL}${provider.path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          // Attribution headers OpenRouter reads; harmless elsewhere.
          'HTTP-Referer': 'https://github.com/captnocap/conjure',
          'X-Title': 'Conjure',
        },
        body: JSON.stringify({ model, state: { task: brief, idea }, questions: named }),
        signal,
      });
    } catch (error) {
      throw new ProviderError(null, error instanceof Error && error.name === 'TimeoutError' ? `${provider.title} did not answer within ${Math.round((options.timeoutMs ?? 30_000) / 1000)} s.` : `${provider.title} could not be reached.`);
    }
    const text = await response.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* keep the text */ }
    if (!response.ok) {
      const detail = messageOf(body);
      throw new ProviderError(response.status, `${provider.title} returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : '.'}`);
    }
    const parsed = resultSchema.safeParse(body);
    if (!parsed.success) throw new ProviderError(null, `${provider.title} answered in an unexpected shape.`);
    const result = parsed.data;
    const reported = result.usage.cost ?? result.usage.estimated_cost;
    const verdicts = questions.map((entry, index): Verdict => {
      const answer = result.answers[`q${index}`];
      if (!answer || answer.type !== entry.type) throw new ProviderError(null, `${provider.title} returned no ${entry.type} answer for question ${index}.`);
      if (answer.type === 'choice') return { type: 'choice', probabilities: answer.probabilities };
      if (answer.type === 'noul') return { type: 'noul', p: answer.noul };
      const top = (entry.levels?.length ?? 1) - 1;
      return {
        type: 'score',
        value: Math.min(1, top > 0 ? answer.score / top : 0),
        probabilities: answer.probabilities ? Array.from({ length: top + 1 }, (_unused, level) => answer.probabilities![level] ?? 0) : [],
      };
    });
    return {
      model: canonical(provider.id, result.model),
      inputTokens: result.usage.input_tokens,
      costUsd: reported ?? (result.usage.input_tokens * provider.inputUsdPerMillion) / 1_000_000,
      estimated: reported === undefined,
      verdicts,
    };
  }
}
