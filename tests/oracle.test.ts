import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Question, QuestionSet } from '../kit/contract';
import { consult, noUsage, type Verdict } from '../engine/oracle';
import { BATCH_CHARACTERS, MAX_BRIEF_CHARACTERS, MAX_IDEA_CHARACTERS, MAX_QUESTIONS_PER_REQUEST, WIDEST_CHOICE } from '../engine/decision-limits';
import { decideSchema } from '../server/decision-schema';

interface RequestBody {
  idea: string;
  brief: string;
  model?: string;
  questions: Question[];
}

const IDEA = 'A little listening station in a storm';
const BRIEF = 'Judge each typed question by the idea.';
const oneQuestion: QuestionSet = { belongs: { type: 'noul', ask: 'Does it belong?' } };
const manyQuestions = (count = 850): QuestionSet => Object.fromEntries(
  Array.from({ length: count }, (_, index) => [`component/${index}:belongs`, { type: 'noul', ask: '?' }]),
);

/** Assert against the live API schema and the complete request budget, not a duplicate schema. */
function requestBody(url: string, init: RequestInit): RequestBody {
  assert.equal(url, '/api/decide');
  assert.equal(init.method, 'POST');
  const body = JSON.parse(init.body as string) as RequestBody;
  decideSchema.parse(body);
  assert.ok(body.questions.length <= MAX_QUESTIONS_PER_REQUEST);
  assert.ok(
    JSON.stringify(body).length + body.questions.length * 24 <= BATCH_CHARACTERS,
    'the envelope, idea, brief, model and per-question planning overhead all fit the request budget',
  );
  return body;
}

const answerFor = (question: Question, position = 0): Verdict => question.type === 'noul'
  ? { type: 'noul', p: (position % 97 + 1) / 100 }
  : question.type === 'score'
    ? { type: 'score', value: 0.6, probabilities: question.levels.map(() => 1 / question.levels.length) }
    : { type: 'choice', probabilities: Object.fromEntries(Object.keys(question.options).map((key) => [key, 1 / Object.keys(question.options).length])) };

function response(verdicts: Verdict[], inputTokens = 101, costUsd = 0.002) {
  return new Response(JSON.stringify({ model: 'test/chained-model', inputTokens, costUsd, verdicts }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}

test('oversized briefs and ideas fail before any request or usage is incurred', async (context) => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('preflight must stop this fetch'); });
  for (const [idea, brief, field] of [
    [IDEA, 'b'.repeat(MAX_BRIEF_CHARACTERS + 1), 'brief'],
    ['i'.repeat(MAX_IDEA_CHARACTERS + 1), BRIEF, 'idea'],
  ]) {
    const usage = noUsage();
    await assert.rejects(consult(idea, brief, oneQuestion, usage), new RegExp(field, 'i'));
    assert.equal(usage.requests, 0);
    assert.equal(usage.inputTokens, 0);
    assert.equal(usage.costUsd, 0);
  }
  assert.equal(calls, 0);
});

test('exact brief and idea limits are accepted and included in batch planning', async (context) => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    calls++;
    const body = requestBody(url, init);
    assert.equal(body.brief.length, MAX_BRIEF_CHARACTERS);
    assert.equal(body.idea.length, MAX_IDEA_CHARACTERS);
    return response(body.questions.map(answerFor));
  });
  const usage = noUsage();
  const verdicts = await consult('i'.repeat(MAX_IDEA_CHARACTERS), 'b'.repeat(MAX_BRIEF_CHARACTERS), oneQuestion, usage);
  assert.deepEqual(Object.keys(verdicts), ['belongs']);
  assert.equal(calls, 1);
  assert.equal(usage.requests, 1);
});

test('large inventories are chained sequentially, preserve question names and account each response once', async (context) => {
  const questions = manyQuestions();
  const controller = new AbortController();
  const calls: RequestBody[] = [];
  let active = 0, mostActive = 0, position = 0;
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    const body = requestBody(url, init);
    assert.equal(init.signal, controller.signal);
    assert.equal(body.model, 'chosen/model');
    calls.push(body);
    active++;
    mostActive = Math.max(mostActive, active);
    try {
      // Any eagerly started sibling would overlap this pending request.
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      return response(body.questions.map((question) => answerFor(question, position++)));
    } finally { active--; }
  });
  const usage = noUsage();
  const verdicts = await consult(IDEA, BRIEF, questions, usage, { model: 'chosen/model', signal: controller.signal });
  assert.equal(mostActive, 1, 'the next batch must wait for the previous response');
  assert.ok(calls.length >= Math.ceil(Object.keys(questions).length / MAX_QUESTIONS_PER_REQUEST));
  assert.equal(calls.reduce((sum, call) => sum + call.questions.length, 0), Object.keys(questions).length);
  assert.deepEqual(Object.keys(verdicts), Object.keys(questions));
  Object.keys(questions).forEach((name, index) => assert.deepEqual(verdicts[name], answerFor(questions[name], index)));
  assert.equal(usage.requests, calls.length);
  assert.equal(usage.inputTokens, calls.length * 101);
  assert.ok(Math.abs(usage.costUsd - calls.length * 0.002) < 1e-12);
  assert.equal(usage.model, 'test/chained-model');
  assert.ok(usage.milliseconds >= 0);
});

test('the complete envelope limits batches even when descriptions contain JSON escapes', async (context) => {
  const questions: QuestionSet = Object.fromEntries(Array.from({ length: 90 }, (_, index) => [
    `escaped-${index}`, { type: 'noul', ask: `Decision ${index}: ` + '"\\'.repeat(170) },
  ]));
  let calls = 0, count = 0;
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    const body = requestBody(url, init);
    calls++; count += body.questions.length;
    return response(body.questions.map(answerFor));
  });
  await consult('i'.repeat(MAX_IDEA_CHARACTERS), 'b'.repeat(MAX_BRIEF_CHARACTERS), questions, noUsage(), { model: 'test/long-model-name' });
  assert.ok(calls > 1);
  assert.equal(count, 90);
});

test('wide choices are normalized only after every independent option probability returns', async (context) => {
  const count = WIDEST_CHOICE + 31;
  const options = Object.fromEntries(Array.from({ length: count }, (_, index) => [
    `world/${index}`, `OPTION_${String(index).padStart(3, '0')} ${'a specific atmospheric setting '.repeat(6)}`,
  ]));
  const questions: QuestionSet = {
    before: { type: 'noul', ask: 'Does the scene feel close?' },
    world: { type: 'choice', ask: 'Which world?', options },
    after: { type: 'score', ask: 'How bright?', levels: ['Low', 'Middle', 'High'] },
  };
  let calls = 0, optionCount = 0;
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    const body = requestBody(url, init);
    calls++;
    return response(body.questions.map((question) => {
      const match = /OPTION_(\d{3})/.exec(question.ask);
      if (!match) return answerFor(question);
      optionCount++;
      const index = Number(match[1]);
      assert.equal(question.type, 'noul');
      assert.ok(question.ask.includes(options[`world/${index}`]), 'the full option description is retained');
      return { type: 'noul', p: (index + 1) / count };
    }));
  });
  const verdicts = await consult(IDEA, BRIEF, questions, noUsage());
  assert.ok(calls > 1, 'this wide choice crosses a transport boundary');
  assert.equal(optionCount, count);
  assert.deepEqual(Object.keys(verdicts), ['before', 'world', 'after']);
  const world = verdicts.world;
  assert.equal(world.type, 'choice');
  if (world.type !== 'choice') throw new Error('Expected a reassembled choice');
  assert.deepEqual(Object.keys(world.probabilities), Object.keys(options));
  const denominator = count * (count + 1) / 2;
  for (let index = 0; index < count; index++) assert.ok(Math.abs(world.probabilities[`world/${index}`] - (index + 1) / denominator) < 1e-12);
  assert.ok(Math.abs(Object.values(world.probabilities).reduce((sum, p) => sum + p, 0) - 1) < 1e-12);
  assert.equal(verdicts.before.type, 'noul');
  assert.equal(verdicts.after.type, 'score');
});

test('a choice with fewer than 100 options still widens when its serialized descriptions cannot fit', async (context) => {
  const options = Object.fromEntries(Array.from({ length: 40 }, (_, index) => [
    `look-${index}`, `DESCRIPTION_${index} ${'d'.repeat(570)}`,
  ]));
  let calls = 0, count = 0;
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    const body = requestBody(url, init);
    calls++;
    assert.ok(body.questions.every((question) => question.type === 'noul'));
    for (const question of body.questions) {
      const match = /DESCRIPTION_(\d+)/.exec(question.ask);
      assert.ok(match);
      assert.ok(question.ask.includes(options[`look-${match[1]}`]));
      count++;
    }
    return response(body.questions.map(() => ({ type: 'noul', p: 0.5 })));
  });
  const verdicts = await consult(IDEA, BRIEF, { treatment: { type: 'choice', ask: 'Which process?', options } }, noUsage());
  assert.ok(calls > 1);
  assert.equal(count, 40);
  assert.equal(verdicts.treatment.type, 'choice');
  if (verdicts.treatment.type === 'choice') assert.ok(Object.values(verdicts.treatment.probabilities).every((p) => Math.abs(p - 1 / 40) < 1e-12));
});

test('long valid asks and descriptions widen through binary choices without truncation', async (context) => {
  const count = 40, ask = 'a'.repeat(600);
  const options = Object.fromEntries(Array.from({ length: count }, (_, index) => [
    `long-${index}`, `LONG_${index} `.padEnd(600, 'd'),
  ]));
  let calls = 0, seen = 0;
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    const body = requestBody(url, init); calls++;
    return response(body.questions.map((question) => {
      assert.equal(question.type, 'choice', 'a concatenated noul would exceed the API ask limit');
      if (question.type !== 'choice') throw new Error('Expected binary choice');
      assert.equal(question.ask, ask);
      assert.deepEqual(Object.keys(question.options), ['yes', 'no']);
      const match = /^LONG_(\d+)/.exec(question.options.yes);
      assert.ok(match);
      const index = Number(match[1]);
      assert.equal(question.options.yes, options[`long-${index}`]);
      seen++;
      // These probabilities need not sum to one: narrow first normalizes the
      // yes/no pair, then compares the independent probabilities across options.
      return { type: 'choice', probabilities: { yes: 0.2 + index / (count - 1) * 0.6, no: 0.4 } };
    }));
  });
  const verdicts = await consult(IDEA, BRIEF, { material: { type: 'choice', ask, options } }, noUsage());
  assert.ok(calls > 1);
  assert.equal(seen, count);
  const material = verdicts.material;
  assert.equal(material.type, 'choice');
  if (material.type !== 'choice') throw new Error('Expected original material choice');
  const raw = Array.from({ length: count }, (_, index) => {
    const yes = 0.2 + index / (count - 1) * 0.6;
    return yes / (yes + 0.4);
  });
  const total = raw.reduce((sum, p) => sum + p, 0);
  raw.forEach((p, index) => assert.ok(Math.abs(material.probabilities[`long-${index}`] - p / total) < 1e-12));
});

test('an already-aborted consultation never starts a fetch', async (context) => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('aborted request must not start'); });
  const controller = new AbortController(); controller.abort();
  const usage = noUsage();
  await assert.rejects(consult(IDEA, BRIEF, manyQuestions(), usage, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 0);
  assert.equal(usage.requests, 0);
});

test('aborting an in-flight fetch prevents later requests without claiming a response', async (context) => {
  const controller = new AbortController();
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    requestBody(url, init); calls++;
    assert.equal(init.signal, controller.signal);
    return new Promise<Response>((_resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true });
      queueMicrotask(() => controller.abort());
    });
  });
  const usage = noUsage();
  await assert.rejects(consult(IDEA, BRIEF, manyQuestions(), usage, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 1);
  assert.equal(usage.requests, 0);
  assert.equal(usage.inputTokens, 0);
  assert.equal(usage.costUsd, 0);
});

test('cancellation after a decoded paid response stops the remaining chain without losing its usage', async (context) => {
  const controller = new AbortController();
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    const body = requestBody(url, init); calls++;
    const result = response(body.questions.map(answerFor));
    const json = result.json.bind(result);
    result.json = async () => { const decoded = await json(); controller.abort(); return decoded; };
    return result;
  });
  const usage = noUsage();
  await assert.rejects(consult(IDEA, BRIEF, manyQuestions(), usage, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 1);
  assert.equal(usage.requests, 1);
  assert.equal(usage.inputTokens, 101);
  assert.equal(usage.costUsd, 0.002);
});

test('failure stops future batches while retaining usage from completed responses', async (context) => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    const body = requestBody(url, init); calls++;
    return calls === 1 ? response(body.questions.map(answerFor))
      : new Response(JSON.stringify({ error: 'Second batch unavailable' }), { status: 503 });
  });
  const usage = noUsage();
  await assert.rejects(consult(IDEA, BRIEF, manyQuestions(1300), usage), /Second batch unavailable/);
  assert.equal(calls, 2);
  assert.equal(usage.requests, 1);
  assert.equal(usage.inputTokens, 101);
  assert.equal(usage.costUsd, 0.002);
});

test('a paid response with the wrong verdict count is rejected after its usage is recorded', async (context) => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    const body = requestBody(url, init); calls++;
    return response(body.questions.slice(1).map(answerFor));
  });
  const usage = noUsage();
  await assert.rejects(consult(IDEA, BRIEF, manyQuestions(), usage), /answer|verdict|question|response|count/i);
  assert.equal(calls, 1);
  assert.equal(usage.requests, 1);
  assert.equal(usage.inputTokens, 101);
  assert.equal(usage.costUsd, 0.002);
});

test('a paid response with a mismatched verdict type is rejected instead of silently falling back', async (context) => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    requestBody(url, init); calls++;
    return response([{ type: 'choice', probabilities: { wrong: 1 } }]);
  });
  const usage = noUsage();
  await assert.rejects(consult(IDEA, BRIEF, oneQuestion, usage), /answer|verdict|question|response|type/i);
  assert.equal(calls, 1);
  assert.equal(usage.requests, 1);
  assert.equal(usage.inputTokens, 101);
  assert.equal(usage.costUsd, 0.002);
});

test('offline consultations leave questions unanswered without fetching or accruing usage', async (context) => {
  context.mock.method(globalThis, 'fetch', () => { throw new Error('offline consultation must not fetch'); });
  const usage = noUsage();
  const questions = manyQuestions();
  assert.deepEqual(await consult(IDEA, BRIEF, questions, usage, { offline: true }), {});
  assert.deepEqual(await consult(IDEA, BRIEF, questions, usage, { offline: true }), {});
  assert.deepEqual(usage, noUsage());
});
