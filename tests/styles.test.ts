import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { LOOK_MEDIA, type LookMedium, type Question } from '../kit/contract';
import { STYLE_MEDIA, StyleDecisions, exploreMedium, mediumOf, styleQuestions, type StyleLook } from '../engine/styles';
import { BATCH_CHARACTERS } from '../engine/decision-limits';
import { noUsage, type Verdict } from '../engine/oracle';
import type { Ruling } from '../engine/settle';
import { decideSchema } from '../server/decision-schema';

interface RequestBody { idea: string; brief: string; model?: string; questions: Question[] }
const inventory: StyleLook[] = LOOK_MEDIA.flatMap((medium) => [1, 2].map((number) => ({
  id: `looks/${medium}-${number}`, title: `${medium} ${number}`, summary: `The ${number === 1 ? 'first' : 'second'} ${medium} treatment.`, medium,
})));
const ruling = (rulings: Ruling[], name: string) => {
  const found = rulings.find((entry) => entry.name === name);
  assert.ok(found, `Missing ${name} ruling`);
  return found;
};

function mockModel(context: TestContext, options: { specified?: number; media?: Partial<Record<LookMedium, number>>; delay?: number } = {}) {
  const calls: { body: RequestBody; signal: AbortSignal | null | undefined }[] = [];
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, '/api/decide');
    assert.equal(init.method, 'POST');
    const body = JSON.parse(init.body as string) as RequestBody;
    decideSchema.parse(body);
    assert.ok(JSON.stringify(body).length + body.questions.length * 24 <= BATCH_CHARACTERS);
    calls.push({ body, signal: init.signal });
    if (options.delay) await new Promise<void>((resolve) => setTimeout(resolve, options.delay));
    const verdicts: Verdict[] = body.questions.map((question) => {
      if (question.type === 'noul') return { type: 'noul', p: options.specified ?? 0.1 };
      assert.equal(question.type, 'choice', 'Style routing should use only typed intent and named choices');
      const keys = Object.keys(question.options);
      const family = keys.every((key) => LOOK_MEDIA.includes(key as LookMedium));
      const weights = keys.map((key, index) => family ? options.media?.[key as LookMedium] ?? 1 : index === 0 ? 0.56 : 0.44 / (keys.length - 1));
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      return { type: 'choice', probabilities: Object.fromEntries(keys.map((key, index) => [key, weights[index] / total])) };
    });
    return new Response(JSON.stringify({ model: 'test/style-model', inputTokens: 101, costUsd: 0.002, verdicts }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  return calls;
}

test('medium questions present each available family once, independent of its number of child looks', () => {
  const crowded = [...inventory, ...Array.from({ length: 140 }, (_, index) => ({ id: `looks/extra-print-${index}`, title: 'Another print', summary: 'Another ink process.', medium: 'print' as const }))];
  const original = styleQuestions(inventory), expanded = styleQuestions(crowded);
  assert.deepEqual(expanded, original, 'Adding print treatments must not change the first-stage question or its weighting');
  assert.equal(original.styleSpecified.type, 'noul');
  assert.equal(original.medium.type, 'choice');
  assert.deepEqual(original.medium.options, STYLE_MEDIA);
  assert.deepEqual(Object.keys(original), ['styleSpecified', 'medium']);
  const limited = styleQuestions(inventory.filter(({ medium }) => medium === 'game' || medium === 'painting'));
  assert.equal(limited.medium.type, 'choice');
  assert.deepEqual(Object.keys(limited.medium.options), ['painting', 'game'], 'Unavailable media must not be offered');
});

test('older looks without medium metadata remain available as mixed media', async (context) => {
  const legacy: StyleLook = { id: 'looks/legacy', title: 'An older look', summary: 'An existing studio treatment.' };
  assert.equal(mediumOf(legacy), 'mixed');
  assert.equal(mediumOf(inventory[0]), 'realism');
  const calls = mockModel(context, { specified: 1, media: { realism: 0, mixed: 1 } });
  const rulings: Ruling[] = [];
  const result = await new StyleDecisions('An archival studio treatment', [inventory[0], legacy], noUsage()).plan({ temperature: 0, roll: 0, rulings });
  assert.equal(result, legacy.id);
  assert.equal(ruling(rulings, 'medium').picked, 'mixed');
  assert.equal(calls.length, 1, 'A sole child needs no extra model consultation');
  const question = calls[0].body.questions.find((entry) => entry.type === 'choice');
  assert.ok(question?.type === 'choice');
  assert.deepEqual(Object.keys(question.options), ['realism', 'mixed']);
});

test('open-style exploration visits every family once per deterministic cycle, including zero-weight families', () => {
  const verdict: Verdict = { type: 'choice', probabilities: { realism: 0.9, painting: 0.1, game: 0, print: 0, optical: 0, craft: 0, mixed: 0 } };
  const first = Array.from({ length: LOOK_MEDIA.length * 4 }, (_, roll) => exploreMedium(LOOK_MEDIA, verdict, roll, 948));
  assert.deepEqual(first, Array.from({ length: first.length }, (_, roll) => exploreMedium(LOOK_MEDIA, verdict, roll, 948)));
  for (let cycle = 0; cycle < 4; cycle++) {
    const sequence = first.slice(cycle * LOOK_MEDIA.length, (cycle + 1) * LOOK_MEDIA.length);
    assert.deepEqual([...sequence].sort(), [...LOOK_MEDIA].sort(), 'Catalogue variety must not starve less probable media');
  }
  for (let roll = 1; roll < first.length; roll++) assert.notEqual(first[roll], first[roll - 1], 'No medium twice running, even across cycles');
  const openings = Array.from({ length: 300 }, (_, seed) => exploreMedium(LOOK_MEDIA, verdict, 0, seed));
  const realism = openings.filter((medium) => medium === 'realism').length / openings.length;
  assert.ok(realism > 0.6 && realism < 0.97, `Different ideas open in the most relevant medium most often, not always (${realism})`);
  assert.equal(exploreMedium(['painting'], undefined, 99, 1), 'painting');
  assert.equal(exploreMedium(LOOK_MEDIA, verdict, -9, 948), first[0]);
  assert.throws(() => exploreMedium([], undefined, 0, 1), /medium|media|empty/i);
});

test('explicit style requests keep their medium while rerolls tour its treatments', async (context) => {
  const calls = mockModel(context, { specified: 0.51, media: { realism: 0.01, painting: 0.52, game: 0.43, print: 0.01, optical: 0.01, craft: 0.01, mixed: 0.01 } });
  const usage = noUsage(), decisions = new StyleDecisions('Paint this waiting room in watercolor', inventory, usage);
  const looks: string[] = [];
  for (let roll = 0; roll < 30; roll++) {
    const rulings: Ruling[] = [];
    looks.push((await decisions.plan({ temperature: 1, roll, rulings }))!);
    assert.equal(ruling(rulings, 'styleSpecified').picked, 'yes');
    assert.equal(ruling(rulings, 'styleSpecified').confidence, 0.51);
    assert.equal(ruling(rulings, 'medium').picked, 'painting');
    assert.ok(!ruling(rulings, 'medium').note?.includes('Open style'));
    assert.match(ruling(rulings, 'look').note ?? '', /You asked for this medium/);
  }
  for (let roll = 1; roll < looks.length; roll++) assert.notEqual(looks[roll], looks[roll - 1], 'A reroll never reprints the treatment it just printed');
  assert.deepEqual(new Set(looks), new Set(['looks/painting-1', 'looks/painting-2']));
  const first: Ruling[] = [];
  assert.equal(await decisions.plan({ temperature: 0, roll: 7, rulings: first }), 'looks/painting-1', 'First choices still take the favourite');
  assert.equal(calls.length, 2, 'Intent and the requested medium\u2019s treatments are consulted once');
  assert.equal(usage.requests, 2);
});

test('an open idea that returns to a medium visits another of its treatments', async (context) => {
  mockModel(context, { specified: 0.1 });
  const decisions = new StyleDecisions('A strange quiet place between dimensions', inventory, noUsage());
  const visits = new Map<string, string[]>();
  for (let roll = 0; roll < LOOK_MEDIA.length * 4; roll++) {
    const rulings: Ruling[] = [];
    const look = (await decisions.plan({ temperature: 1, roll, rulings }))!;
    const family = ruling(rulings, 'medium').picked;
    visits.set(family, [...(visits.get(family) ?? []), look]);
  }
  for (const [family, looks] of visits) {
    assert.equal(looks.length, 4);
    for (let index = 1; index < looks.length; index++) assert.notEqual(looks[index], looks[index - 1], `${family} reprinted the same treatment on consecutive visits`);
  }
});

test('typed intent and medium pins override the model while a pinned look determines its own family', async (context) => {
  const calls = mockModel(context, { specified: 0.1, media: { realism: 0.8, painting: 0.1, game: 0.06, print: 0.01, optical: 0.01, craft: 0.01, mixed: 0.01 } });
  const decisions = new StyleDecisions('A restless idea with an explicit override', inventory, noUsage());
  for (let roll = 0; roll < 10; roll++) {
    const rulings: Ruling[] = [];
    assert.equal(await decisions.plan({ temperature: 1, roll, rulings, forced: { styleSpecified: true, medium: 'game' } }), roll % 2 ? 'looks/game-2' : 'looks/game-1');
    assert.equal(ruling(rulings, 'styleSpecified').picked, 'yes');
    assert.equal(ruling(rulings, 'styleSpecified').forced, true);
    assert.equal(ruling(rulings, 'medium').picked, 'game');
    assert.equal(ruling(rulings, 'medium').forced, true);
  }
  const rulings: Ruling[] = [];
  assert.equal(await decisions.plan({ temperature: 1, roll: 19, rulings, forced: { medium: 'game', look: 'looks/painting-2' } }), 'looks/painting-2');
  const medium = ruling(rulings, 'medium');
  assert.equal(medium.picked, 'painting');
  assert.match(medium.note ?? '', /pinned look/i);
  assert.equal(medium.forced, false, 'A family derived from a pinned look must not claim that the conflicting old medium pin was taken');
  assert.ok(Math.abs(medium.confidence - 0.1) < 1e-12);
  assert.ok(medium.alternatives.every(({ label }) => label !== medium.picked), 'Alternatives must describe the final family selection');
  assert.equal(ruling(rulings, 'look').forced, true);
  assert.equal(calls.length, 3, 'Pin changes reuse intent and previously consulted families');
});

test('a pinned medium constrains open-style rerolls without selecting another family', async (context) => {
  const calls = mockModel(context, { specified: 0.49 });
  const decisions = new StyleDecisions('A strange quiet place', inventory, noUsage());
  for (let roll = 0; roll < 15; roll++) {
    const rulings: Ruling[] = [];
    const look = await decisions.plan({ temperature: 1, roll, rulings, forced: { medium: 'craft' } });
    assert.ok(look?.startsWith('looks/craft-'));
    assert.equal(ruling(rulings, 'styleSpecified').picked, 'no', 'Intent must not be sampled into a new constraint');
    assert.equal(ruling(rulings, 'medium').picked, 'craft');
    assert.equal(ruling(rulings, 'medium').forced, true);
  }
  assert.equal(calls.length, 2);
});

test('invalid and inherited medium or look pins cannot escape the typed inventory', async (context) => {
  mockModel(context, { specified: 1, media: { realism: 1, painting: 0, game: 0, print: 0, optical: 0, craft: 0, mixed: 0 } });
  const decisions = new StyleDecisions('A precise natural-color photograph', inventory, noUsage());
  for (const value of ['unavailable', 'constructor', '__proto__', 'toString']) {
    const rulings: Ruling[] = [];
    assert.equal(await decisions.plan({ temperature: 1, roll: 0, rulings, forced: { medium: value, look: value } }), 'looks/realism-1');
    assert.ok(!ruling(rulings, 'medium').forced);
    assert.ok(!ruling(rulings, 'look').forced);
  }
});

test('concurrent plans share in-flight intent and per-family consultation with accurate usage', async (context) => {
  const calls = mockModel(context, { delay: 5 });
  const usage = noUsage(), controller = new AbortController();
  const decisions = new StyleDecisions('One cached photographic idea', inventory, usage, { model: 'chosen/style-model', signal: controller.signal });
  const firstRulings: Ruling[] = [], repeatedRulings: Ruling[] = [];
  const results = await Promise.all([firstRulings, repeatedRulings].map((rulings) => decisions.plan({ temperature: 0, roll: 0, rulings, forced: { medium: 'realism' } })));
  assert.deepEqual(results, ['looks/realism-1', 'looks/realism-1']);
  assert.deepEqual(firstRulings, repeatedRulings);
  assert.equal(calls.length, 2);
  for (const { body, signal } of calls) {
    assert.equal(body.idea, 'One cached photographic idea');
    assert.equal(body.model, 'chosen/style-model');
    assert.equal(signal, controller.signal);
  }
  assert.deepEqual(calls[0].body.questions, Object.values(styleQuestions(inventory)));
  const familyQuestion = calls[1].body.questions[0];
  assert.ok(familyQuestion.type === 'choice');
  assert.deepEqual(Object.keys(familyQuestion.options), ['looks/realism-1', 'looks/realism-2']);
  assert.equal(usage.requests, 2);
  assert.equal(usage.inputTokens, 202);
  assert.equal(usage.costUsd, 0.004);
  assert.equal(usage.model, 'test/style-model');
});

test('complete exploration cycles consult each family only once and never mix child inventories', async (context) => {
  const calls = mockModel(context, { specified: 0.1 });
  const usage = noUsage(), decisions = new StyleDecisions('An open invitation to try different media', inventory, usage);
  const selected: string[] = [];
  for (let roll = 0; roll < LOOK_MEDIA.length * 3; roll++) {
    const rulings: Ruling[] = [];
    const look = await decisions.plan({ temperature: 1, roll, rulings });
    const family = ruling(rulings, 'medium');
    selected.push(family.picked);
    assert.ok(look?.startsWith(`looks/${family.picked}-`));
    assert.equal(ruling(rulings, 'styleSpecified').picked, 'no');
    assert.match(family.note ?? '', /each available medium once per cycle/);
    assert.ok(family.alternatives.every(({ label }) => label !== family.picked));
  }
  for (const medium of LOOK_MEDIA) assert.equal(selected.filter((entry) => entry === medium).length, 3);
  assert.equal(calls.length, LOOK_MEDIA.length + 1);
  for (const { body } of calls.slice(1)) {
    assert.equal(body.questions.length, 1);
    const question = body.questions[0];
    assert.ok(question.type === 'choice');
    const keys = Object.keys(question.options);
    const family = inventory.find(({ id }) => id === keys[0])!.medium;
    assert.deepEqual(keys, inventory.filter(({ medium }) => medium === family).map(({ id }) => id));
  }
  assert.equal(usage.requests, calls.length);
  assert.equal(usage.inputTokens, calls.length * 101);
  assert.ok(Math.abs(usage.costUsd - calls.length * 0.002) < 1e-12);
});

test('offline exploration remains deterministic and balanced without fetch or usage', async (context) => {
  context.mock.method(globalThis, 'fetch', () => { throw new Error('Offline style planning must not fetch'); });
  const crowded = [...inventory, ...Array.from({ length: 50 }, (_, index) => ({ id: `looks/more-print-${index}`, title: 'A print', summary: 'Ink.', medium: 'print' as const }))];
  const usage = noUsage(), decisions = new StyleDecisions('An offline open-medium study', crowded, usage, { offline: true });
  const replay = new StyleDecisions('An offline open-medium study', crowded, noUsage(), { offline: true });
  const families: string[] = [];
  for (let roll = 0; roll < LOOK_MEDIA.length * 2; roll++) {
    const rulings: Ruling[] = [], repeatedRulings: Ruling[] = [];
    const next = await decisions.plan({ temperature: 1, roll, rulings });
    assert.equal(next, await replay.plan({ temperature: 1, roll, rulings: repeatedRulings }));
    assert.deepEqual(rulings, repeatedRulings);
    families.push(ruling(rulings, 'medium').picked);
    assert.equal(ruling(rulings, 'styleSpecified').picked, 'no');
  }
  for (const medium of LOOK_MEDIA) assert.equal(families.filter((family) => family === medium).length, 2);
  assert.deepEqual(usage, noUsage());
});

test('exploration preserves exact model confidence instead of reporting its sampling floor as probability', async (context) => {
  mockModel(context, { specified: 0.1, media: { realism: 1, painting: 0, game: 0, print: 0, optical: 0, craft: 0, mixed: 0 } });
  const decisions = new StyleDecisions('A style-open idea with a strong model preference', inventory, noUsage());
  for (let roll = 0; roll < LOOK_MEDIA.length; roll++) {
    const rulings: Ruling[] = [];
    await decisions.plan({ temperature: 1, roll, rulings });
    const family = ruling(rulings, 'medium');
    assert.equal(family.confidence, family.picked === 'realism' ? 1 : 0);
    assert.equal(family.options?.find(({ label }) => label === family.picked)?.p, family.confidence);
    assert.ok(family.options?.every(({ label, p }) => p === (label === 'realism' ? 1 : 0)));
    assert.ok(family.alternatives.every(({ label }) => label !== family.picked));
  }
});

test('a directly selected look and an empty catalogue need no style consultation', async (context) => {
  context.mock.method(globalThis, 'fetch', () => { throw new Error('No style consultation is needed'); });
  const usage = noUsage(), rulings: Ruling[] = [];
  const decisions = new StyleDecisions('A selected look', inventory, usage);
  assert.equal(await decisions.plan({ temperature: 1, roll: 50, rulings, look: 'looks/game-2' }), 'looks/game-2');
  await assert.rejects(decisions.plan({ temperature: 1, roll: 51, rulings, look: 'looks/not-registered' }), /Unknown look/);
  assert.equal(await new StyleDecisions('No looks', [], usage).plan({ temperature: 1, roll: 0, rulings }), null);
  assert.deepEqual(rulings, []);
  assert.deepEqual(usage, noUsage());
});

test('a failed family consultation surfaces without changing media or silently retrying', async (context) => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    calls++;
    const body = JSON.parse(init.body as string) as RequestBody;
    if (calls === 1) return new Response(JSON.stringify({ model: 'test/style-model', inputTokens: 101, costUsd: 0.002, verdicts: body.questions.map((question) => question.type === 'noul' ? { type: 'noul', p: 1 } : { type: 'choice', probabilities: { painting: 1 } }) }), { status: 200 });
    return new Response(JSON.stringify({ error: 'Painting consultation unavailable' }), { status: 503 });
  });
  const usage = noUsage(), decisions = new StyleDecisions('Watercolor without a hidden fallback', inventory, usage);
  await assert.rejects(decisions.plan({ temperature: 0, roll: 0, rulings: [] }), /Painting consultation unavailable/);
  await assert.rejects(decisions.plan({ temperature: 1, roll: 1, rulings: [] }), /Painting consultation unavailable/);
  assert.equal(calls, 2);
  assert.equal(usage.requests, 1, 'Only the completed direction consultation is accounted');
  assert.equal(usage.inputTokens, 101);
});

test('a rejected intent consultation is cached consistently with the director and does not ask for leaf choices', async (context) => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return new Response(JSON.stringify({ error: 'Style direction unavailable' }), { status: 503 });
  });
  const usage = noUsage(), decisions = new StyleDecisions('A failed style consultation', inventory, usage);
  for (const roll of [0, 1]) {
    const rulings: Ruling[] = [];
    await assert.rejects(decisions.plan({ temperature: roll, roll, rulings }), /Style direction unavailable/);
    assert.deepEqual(rulings, []);
  }
  assert.equal(calls, 1);
  assert.deepEqual({ ...usage, milliseconds: 0 }, noUsage());
});

test('a shifted plate moves down the model ranking of media and sets aside pinned looks', async (context) => {
  mockModel(context, { specified: 0.1, media: { painting: 0.5, print: 0.3, craft: 0.15, realism: 0.05, game: 0, optical: 0, mixed: 0 } });
  const decisions = new StyleDecisions('One scene in several media', inventory, noUsage());
  const mediumOfPlate = async (shift: number, forced = {}) => {
    const rulings: Ruling[] = [];
    const id = await decisions.plan({ temperature: 0, roll: 0, rulings, forced, shift });
    const picked = ruling(rulings, 'medium');
    return { medium: picked.picked, look: id, note: picked.note ?? '' };
  };
  const first = await mediumOfPlate(0);
  const second = await mediumOfPlate(1);
  const third = await mediumOfPlate(2);
  assert.deepEqual([first.medium, second.medium, third.medium], ['painting', 'print', 'craft'], 'plates follow the model ranking');
  assert.ok(inventory.find((look) => look.id === second.look)?.medium === 'print');
  assert.match(second.note, /Plate 2 of a series/);
  const pinned = await mediumOfPlate(1, { look: 'looks/painting-2', medium: 'painting' });
  assert.equal(pinned.medium, 'print', 'a pinned look or medium does not hold a shifted plate in the first medium');
  const wrapped = await mediumOfPlate(LOOK_MEDIA.length);
  assert.equal(wrapped.medium, 'painting', 'the shift wraps round the available media');
});
