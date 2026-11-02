import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import type { Question } from '../kit/contract';
import { BELONGS_FLOOR, CastingDecisions, SHORTLIST, type CastCandidate, castName } from '../engine/casting';
import { BATCH_CHARACTERS, MAX_BRIEF_CHARACTERS } from '../engine/decision-limits';
import { noUsage, type Verdict } from '../engine/oracle';
import { decideSchema } from '../server/decision-schema';

interface RequestBody { idea: string; brief: string; questions: Question[] }
const BRIEF = 'Judge every question only by how well it serves the idea.';

/** A catalogue spread over the scales, each thing with a stable idea-only belonging. */
const things: CastCandidate[] = Array.from({ length: 120 }, (_, index) => ({
  id: `things/thing-${index}`,
  title: `Thing ${index}`,
  summary: `A thing numbered ${index}, for a casting test.`,
  scales: index % 3 === 0 ? ['room', 'tabletop'] : index % 3 === 1 ? ['street'] : ['cosmic'],
}));
const ideaOnly = (id: string) => ((Number(id.split('-')[1]) * 37) % 100) / 100;
const kitchen = { id: 'worlds/kitchen', title: 'Apartment kitchen', summary: 'A small kitchen at night.', scales: ['room' as const] };
const bench = { id: 'worlds/worktable', title: 'Worktable', summary: 'A bench under a lamp.', scales: ['tabletop' as const] };
const street = { id: 'worlds/street', title: 'Street corner', summary: 'A corner with a lamp.', scales: ['street' as const] };

function mockModel(context: TestContext, judge: (id: string, brief: string) => number = ideaOnly) {
  const calls: RequestBody[] = [];
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, '/api/decide');
    const body = JSON.parse(init.body as string) as RequestBody;
    decideSchema.parse(body);
    assert.ok(JSON.stringify(body).length + body.questions.length * 24 <= BATCH_CHARACTERS);
    calls.push(body);
    const verdicts: Verdict[] = body.questions.map((question) => {
      assert.equal(question.type, 'noul');
      const id = /\? (Thing \d+):/.exec(question.ask)![1].replace('Thing ', 'things/thing-');
      return { type: 'noul', p: judge(id, body.brief) };
    });
    return new Response(JSON.stringify({ model: 'test/casting', inputTokens: 50, costUsd: 0.0001, verdicts }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  return calls;
}
const askedIds = (call: RequestBody) => call.questions.filter((question) => question.ask.startsWith('Would this belong')).map((question) => /\? (Thing \d+):/.exec(question.ask)![1].replace('Thing ', 'things/thing-'));

test('only things at the setting scales are asked, then a shortlist is judged with the setting in view', async (context) => {
  const calls = mockModel(context);
  const casting = new CastingDecisions('a quiet supper', BRIEF, things, noUsage());
  const belonging = await casting.belongs(kitchen);
  const roomThings = things.filter((thing) => thing.scales.includes('room'));
  assert.equal(belonging.size, roomThings.length);
  assert.equal(calls.length, 2);
  assert.deepEqual(new Set(askedIds(calls[0])), new Set(roomThings.map((thing) => thing.id)));
  assert.equal(calls[0].brief, BRIEF);
  const shortlisted = askedIds(calls[1]);
  assert.ok(shortlisted.length <= SHORTLIST && shortlisted.length > 0);
  assert.match(calls[1].brief, /The setting is Apartment kitchen: A small kitchen at night\./);
  assert.equal(calls[1].questions.filter((question) => question.ask.startsWith('Is this what the idea is about')).length, shortlisted.length, 'the shortlist is also asked which thing the idea is about');
  assert.ok(calls[1].brief.length <= MAX_BRIEF_CHARACTERS);
  const floorOf = Math.min(...shortlisted.map(ideaOnly));
  for (const thing of roomThings) if (!shortlisted.includes(thing.id)) assert.ok(ideaOnly(thing.id) <= floorOf || ideaOnly(thing.id) < BELONGS_FLOOR);
  for (const id of shortlisted) assert.equal(belonging.get(id), ideaOnly(id), 'the shortlist carries the setting-aware verdict');
  const outside = roomThings.find((thing) => !shortlisted.includes(thing.id) && ideaOnly(thing.id) > 0)!;
  assert.ok(belonging.get(outside.id)! < ideaOnly(outside.id), 'things outside the shortlist rank below the re-judged ones');
});

test('the setting changes the answer for the shortlist', async (context) => {
  const calls = mockModel(context, (id, brief) => brief.includes('The setting is') ? 0.05 : ideaOnly(id));
  const casting = new CastingDecisions('a quiet supper', BRIEF, things, noUsage());
  const belonging = await casting.belongs(kitchen);
  for (const id of askedIds(calls[1])) assert.equal(belonging.get(id), 0.05);
});

test('a reroll in the same setting asks nothing; a new setting at the same scales asks one short batch', async (context) => {
  const calls = mockModel(context);
  const casting = new CastingDecisions('a quiet supper', BRIEF, things, noUsage());
  await casting.belongs(kitchen);
  const before = calls.length;
  await casting.belongs(kitchen);
  assert.equal(calls.length, before);
  await casting.belongs(bench);
  assert.equal(calls.length, before + 1, 'tabletop things were already asked with the room things');
  assert.ok(askedIds(calls.at(-1)!).length <= SHORTLIST);
  await casting.belongs(street);
  assert.equal(calls.length, before + 3, 'a new scale asks its things, then its shortlist');
  assert.deepEqual(new Set(askedIds(calls[before + 1])), new Set(things.filter((thing) => thing.scales.includes('street')).map((thing) => thing.id)));
});

test('offline casting asks nothing and leaves every eligible thing equally likely', async (context) => {
  const calls = mockModel(context);
  const casting = new CastingDecisions('a quiet supper', BRIEF, things, noUsage(), { offline: true });
  const belonging = await casting.belongs(kitchen);
  assert.equal(calls.length, 0);
  assert.ok([...belonging.values()].every((p) => p === 0.5));
});

test('a failed batch can be asked again on the next attempt', async (context) => {
  let fail = true;
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as RequestBody;
    if (fail) return new Response(JSON.stringify({ error: 'down' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    const verdicts: Verdict[] = body.questions.map(() => ({ type: 'noul', p: 0.7 }));
    return new Response(JSON.stringify({ model: 'test/casting', inputTokens: 50, costUsd: 0.0001, verdicts }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const casting = new CastingDecisions('a quiet supper', BRIEF, things, noUsage());
  await assert.rejects(casting.belongs(kitchen), /down/);
  fail = false;
  const belonging = await casting.belongs(kitchen);
  assert.ok([...belonging.values()].every((p) => p === 0.7 || p === 0.7 * 0.6));
  assert.equal(castName('things/x'), 'cast:things/x');
});
