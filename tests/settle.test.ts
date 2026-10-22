import assert from 'node:assert/strict';
import { test } from 'node:test';
import { choice, noul, score, seeded } from '../kit/index';
import { settleOne } from '../engine/settle';

const colour = choice('Which colour?', { red: 'Red', green: 'Green', blue: 'Blue' });

test('temperature 0 takes the most likely option', () => {
  const verdict = { type: 'choice' as const, probabilities: { red: 0.2, green: 0.7, blue: 0.1 } };
  const { value, ruling } = settleOne(colour, verdict, 0, seeded(1));
  assert.equal(value, 'green');
  assert.equal(ruling.confidence, 0.7);
  assert.deepEqual(ruling.alternatives.map((option) => option.label), ['red', 'blue']);
});

test('sampling follows the probabilities and repeats for the same seed', () => {
  const verdict = { type: 'choice' as const, probabilities: { red: 0.2, green: 0.7, blue: 0.1 } };
  const draw = (seed: number) => {
    const random = seeded(seed);
    return Array.from({ length: 400 }, () => settleOne(colour, verdict, 1, random).value);
  };
  assert.deepEqual(draw(7), draw(7));
  const share = draw(7).filter((value) => value === 'green').length / 400;
  assert.ok(share > 0.6 && share < 0.8, `green was drawn ${share} of the time`);
});

test('an unanswered choice is an even draw, never always the first option', () => {
  const random = seeded(3);
  const drawn = new Set(Array.from({ length: 60 }, () => settleOne(colour, undefined, 0, random).value));
  assert.equal(drawn.size, 3);
});

test('a probability for an option that was never offered is ignored', () => {
  const verdict = { type: 'choice' as const, probabilities: { purple: 0.9, blue: 0.1 } };
  assert.equal(settleOne(colour, verdict, 0, seeded(1)).value, 'blue');
});

test('scores are a position between the first and last level', () => {
  const wear = score('How worn?', ['New', 'Used', 'Ruined']);
  const { value, ruling } = settleOne(wear, { type: 'score', value: 0.9, probabilities: [0, 0.2, 0.8] }, 0, seeded(1));
  assert.equal(value, 0.9);
  assert.equal(ruling.picked, 'Ruined');
  assert.equal(settleOne(wear, undefined, 0, seeded(1)).value, 0.5);
});

test('yes/no settles at one half and samples by probability', () => {
  const rain = noul('Is it raining?');
  assert.equal(settleOne(rain, { type: 'noul', p: 0.51 }, 0, seeded(1)).value, true);
  assert.equal(settleOne(rain, { type: 'noul', p: 0.49 }, 0, seeded(1)).value, false);
  const random = seeded(5);
  const yes = Array.from({ length: 500 }, () => settleOne(rain, { type: 'noul', p: 0.25 }, 1, random).value).filter(Boolean).length;
  assert.ok(yes > 90 && yes < 160, `${yes} of 500 were yes`);
});

test('a tour visits every plausible answer once per cycle, opening on a weighted draw', async () => {
  const { explore } = await import('../engine/settle');
  const weights = { red: 0.6, green: 0.3, blue: 0.08, gold: 0.015, grey: 0.005 };
  const labels = Object.keys(weights);
  const tour = Array.from({ length: 16 }, (_, roll) => explore(weights, labels, roll, 41, 0.03));
  assert.deepEqual(tour, Array.from({ length: 16 }, (_, roll) => explore(weights, labels, roll, 41, 0.03)), 'repeatable');
  // Gold and grey fall under the floor and sit out, leaving cycles of three.
  for (let cycle = 0; cycle < 5; cycle++) assert.deepEqual([...tour.slice(cycle * 3, cycle * 3 + 3)].sort(), ['blue', 'green', 'red']);
  for (let roll = 1; roll < tour.length; roll++) assert.notEqual(tour[roll], tour[roll - 1], 'no answer twice running, even across a cycle boundary');
  // Different ideas open on different answers, the favourite most often.
  const openings = Array.from({ length: 400 }, (_, seed) => explore(weights, labels, 0, seed, 0.03));
  const share = (label: string) => openings.filter((opening) => opening === label).length / openings.length;
  assert.ok(share('red') > 0.45 && share('red') < 0.8, `red opened ${share('red')}`);
  assert.ok(share('green') > 0.15, `green opened ${share('green')}`);
  const kept = new Set(Array.from({ length: 3 }, (_, roll) => explore(weights, labels, roll, 41, 0.03)));
  assert.deepEqual(kept, new Set(['red', 'green', 'blue']), 'answers below the floor sit out once three remain');
  assert.equal(new Set(Array.from({ length: 5 }, (_, roll) => explore(weights, labels, roll, 41, 0))).size, 5, 'with no floor every answer is visited');
  assert.equal(explore({}, ['only'], 9, 1), 'only');
  assert.throws(() => explore({}, [], 0, 1), /empty/);
  // An unanswered question does not always start on its first option.
  const starts = new Set(Array.from({ length: 30 }, (_, seed) => explore({}, labels, 0, seed)));
  assert.ok(starts.size > 2);
});

test('an exploring settle tours choices, keeps pins, and leaves the other draws of the roll alone', async () => {
  const { settle, EXPLORE_NOTE } = await import('../engine/settle');
  const questions = { colour, wear: score('How worn?', ['New', 'Used', 'Ruined']), lit: noul('Is it lit?') };
  const verdicts = {
    colour: { type: 'choice' as const, probabilities: { red: 0.05, green: 0.9, blue: 0.05 } },
    wear: { type: 'score' as const, value: 0.5, probabilities: [0.3, 0.4, 0.3] },
    lit: { type: 'noul' as const, p: 0.9 },
  };
  const picks: string[] = [];
  for (let roll = 0; roll < 6; roll++) {
    const rulings: import('../engine/settle').Ruling[] = [];
    const answers = settle('looks/test', questions, verdicts, 1, seeded(roll), rulings, {}, { roll, seed: 5 });
    picks.push(answers.colour as string);
    assert.equal(rulings[0].note, EXPLORE_NOTE);
    assert.equal(rulings[0].confidence, verdicts.colour.probabilities[answers.colour as 'red']);
  }
  assert.equal(picks[0], 'green');
  for (let roll = 1; roll < picks.length; roll++) assert.notEqual(picks[roll], picks[roll - 1]);
  const pinned = settle('looks/test', questions, verdicts, 1, seeded(1), [], { colour: 'blue' }, { roll: 3, seed: 5 });
  assert.equal(pinned.colour, 'blue');
  // The same number of draws is made, so a draw after the settle is the same with or without exploring.
  const plainRandom = seeded(77), exploringRandom = seeded(77);
  settle('x', questions, verdicts, 1, plainRandom, []);
  settle('x', questions, verdicts, 1, exploringRandom, [], {}, { roll: 2, seed: 5 });
  assert.equal(plainRandom(), exploringRandom());
  // First choices are untouched by exploring.
  assert.equal(settle('x', questions, verdicts, 0, seeded(1), [], {}, { roll: 4, seed: 5 }).colour, 'green');
});
