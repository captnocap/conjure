import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BRIEF_BASE, HOUSE, HOUSE_BRIEF, NO_DIRECTION, directed, directionOf, houseQuestion } from '../engine/art-direction';
import { MAX_BRIEF_CHARACTERS } from '../engine/decision-limits';
import { settle } from '../engine/settle';
import { seeded } from '../kit/random';
import { decideSchema } from '../server/decision-schema';

const directions = [
  { id: 'directions/alpha', summary: 'The first way of seeing.' },
  { id: 'directions/beta', summary: 'The second way of seeing.' },
  { id: 'directions/gamma', summary: 'The third way of seeing.' },
  { id: 'directions/delta', summary: 'The fourth way of seeing.' },
];

test('the direction is one typed choice whose options are the directions’ own summaries', () => {
  const questions = houseQuestion(directions);
  assert.deepEqual(Object.keys(questions), [HOUSE]);
  const question = questions[HOUSE];
  assert.equal(question.type, 'choice');
  assert.deepEqual(question.type === 'choice' ? question.options : {}, Object.fromEntries(directions.map((direction) => [direction.id, direction.summary])));
  const body = { idea: 'a quiet harbour', brief: `${BRIEF_BASE} ${HOUSE_BRIEF}`, questions: Object.values(questions) };
  assert.ok(decideSchema.safeParse(body).success, 'the direction request fits the live schema');
  assert.ok(body.brief.length <= MAX_BRIEF_CHARACTERS);
});

test('a settled answer that is not a direction falls back to the first direction', () => {
  assert.equal(directionOf({ [HOUSE]: 'directions/gamma' }, directions), 'directions/gamma');
  assert.equal(directionOf({ [HOUSE]: 'directions/nowhere' }, directions), 'directions/alpha');
  assert.equal(directionOf({}, directions), 'directions/alpha');
});

test('rerolls tour the plausible directions, the favourite first most often, and a pin holds', () => {
  const questions = houseQuestion(directions);
  const verdicts = { [HOUSE]: { type: 'choice' as const, probabilities: { 'directions/alpha': 0.55, 'directions/beta': 0.3, 'directions/gamma': 0.14, 'directions/delta': 0.01 } } };
  const first = settle('direction', questions, verdicts, 0, seeded(1), [], {});
  assert.equal(first[HOUSE], 'directions/alpha', 'first choices take the favourite');
  const seen = new Set<string>();
  let previous = '';
  for (let roll = 0; roll < 8; roll++) {
    const picked = settle('direction', questions, verdicts, 1, seeded(roll), [], {}, { roll, seed: 77 })[HOUSE] as string;
    assert.notEqual(picked, previous, 'no direction twice running');
    seen.add(picked);
    previous = picked;
  }
  assert.ok(seen.size >= 3, `rerolls visit the plausible directions: ${[...seen].join(', ')}`);
  assert.ok(!seen.has('directions/delta'), 'a direction the model found implausible sits the tour out while three others remain');
  const rulings: { forced?: boolean; picked: string }[] = [];
  const pinned = settle('direction', questions, verdicts, 1, seeded(3), rulings as never, { [HOUSE]: 'directions/delta' }, { roll: 3, seed: 77 });
  assert.equal(pinned[HOUSE], 'directions/delta');
  assert.equal(rulings[0].forced, true);
});

test('a brief under no direction is the base brief alone, with no stray space', () => {
  assert.deepEqual(NO_DIRECTION, { brief: '', note: '', finishes: [] });
  assert.equal(directed(BRIEF_BASE, NO_DIRECTION.brief), BRIEF_BASE);
  assert.equal(directed('Base.', 'Direction: lean left.'), 'Base. Direction: lean left.');
});
