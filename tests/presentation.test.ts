import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Mood } from '../kit/contract';
import { ARCS, PRESENTATIONS, PRESENTATION_QUESTIONS, adjustMood, presentationOf } from '../engine/presentation';
import type { Ruling } from '../engine/settle';
import { decideSchema } from '../server/decision-schema';

const mood: Mood = { wear: 0.3, warmth: 0.5, energy: 0.4, density: 0.6, daylight: 0.7, cheer: 0.5 };

test('the presentation questions are typed choices that fit the live request schema', () => {
  assert.deepEqual(Object.keys(PRESENTATION_QUESTIONS), ['presentation', 'arc', 'boil', 'blend']);
  assert.equal(PRESENTATION_QUESTIONS.boil.type, 'noul');
  assert.deepEqual(Object.keys(PRESENTATION_QUESTIONS.presentation.options), Object.keys(PRESENTATIONS));
  assert.deepEqual(Object.keys(PRESENTATION_QUESTIONS.arc.options), Object.keys(ARCS));
  decideSchema.parse({ idea: 'x', brief: 'y', questions: Object.values(PRESENTATION_QUESTIONS) });
});

test('every presentation is one plate or a short series with a primary plate', () => {
  for (const kind of Object.keys(PRESENTATIONS)) {
    for (const arc of Object.keys(ARCS)) {
      const presentation = presentationOf({ presentation: kind, arc });
      assert.equal(presentation.kind, kind);
      assert.ok(presentation.plates.length >= 1 && presentation.plates.length <= 3);
      assert.ok(presentation.primary >= 0 && presentation.primary < presentation.plates.length);
      assert.ok(presentation.plates.every((plate) => plate.title.length > 0));
      assert.equal(presentation.arc, kind === 'strip' ? arc : null);
    }
  }
  assert.deepEqual(presentationOf({}), { kind: 'plate', arc: null, primary: 0, plates: [{ title: 'plate' }] });
  assert.equal(presentationOf({ presentation: 'mural' }).kind, 'plate');
  assert.equal(presentationOf({ presentation: 'strip', arc: 'unknown' }).arc, 'arrival');
});

test('the hours sweep the daylight and the strips follow their arc', () => {
  const hours = presentationOf({ presentation: 'hours' });
  assert.deepEqual(hours.plates.map((plate) => plate.set?.daylight), [0.05, 0.5, 0.95]);
  const decay = presentationOf({ presentation: 'strip', arc: 'decay' });
  assert.deepEqual(decay.plates.map((plate) => plate.set?.wear), [0.05, 0.5, 0.95]);
  const approach = presentationOf({ presentation: 'approach' });
  assert.ok(approach.plates[0].framing!.distance! > approach.plates[1].framing!.distance!);
});

test('a plate adjusts the mood within bounds and annotates the direction rulings', () => {
  const rulings: Ruling[] = [
    { owner: 'direction', name: 'wear', ask: 'Worn?', picked: 'Lightly used', confidence: 0.5, alternatives: [], kind: 'score' },
    { owner: 'direction', name: 'energy', ask: 'Energy?', picked: 'Gentle', confidence: 0.5, alternatives: [], kind: 'score' },
    { owner: 'things/chair', name: 'wear', ask: 'Chair worn?', picked: 'no', confidence: 0.5, alternatives: [], kind: 'noul' },
  ];
  const adjusted = adjustMood(mood, { title: 'the damage', set: { wear: 0.95 }, shift: { energy: -0.9 } }, rulings, 'Set by the strip presentation: the damage.');
  assert.equal(adjusted.wear, 0.95);
  assert.equal(adjusted.energy, 0, 'shifts are clamped to the mood range');
  assert.equal(adjusted.cheer, mood.cheer, 'untouched values stay as settled');
  assert.equal(rulings[0].picked, 'Ruined');
  assert.equal(rulings[1].picked, 'Frozen still');
  assert.match(rulings[0].note ?? '', /strip presentation/);
  assert.equal(rulings[2].note, undefined, 'only direction rulings are annotated');
  assert.equal(rulings[2].picked, 'no');
  assert.deepEqual(adjustMood(mood, { title: 'plate' }, [], ''), mood);
});

test('a styles series has three plates and only a loop boils', () => {
  const styles = presentationOf({ presentation: 'styles' });
  assert.equal(styles.plates.length, 3);
  assert.equal(styles.primary, 0);
  assert.equal(styles.boil, undefined);
  assert.equal(presentationOf({ presentation: 'loop', boil: true }).boil, true);
  assert.equal(presentationOf({ presentation: 'loop', boil: false }).boil, undefined);
  assert.equal(presentationOf({ presentation: 'hours', boil: true }).boil, undefined, 'a still series never boils');
});

test('a portrait carries how the scene joins it, defaulting to behind', () => {
  const portrait = presentationOf({ presentation: 'portrait', blend: 'inside' });
  assert.equal(portrait.plates.length, 2);
  assert.equal(portrait.blend, 'inside');
  assert.equal(presentationOf({ presentation: 'portrait', blend: 'sideways' }).blend, 'behind');
  assert.equal(presentationOf({ presentation: 'plate', blend: 'inside' }).blend, undefined);
});
