import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_BRIEF_CHARACTERS } from '../engine/decision-limits';
import { sceneBrief } from '../engine/scene-brief';

const base = 'You are art-directing a small scene.';
const world = { id: 'worlds/flooded-temple', title: 'Flooded temple' };
const chair = { id: 'things/chair', title: 'Chair' };
const lantern = { id: 'things/lantern', title: 'Paper lantern' };
const look = { id: 'looks/ink-atlas', title: 'Ink atlas' };

test('a thing is told its setting, its company and the print, without naming itself', () => {
  const brief = sceneBrief(base, chair, { world, cast: [chair, lantern], look });
  assert.equal(brief, `${base} These questions shape one part of the scene: Chair. The setting is Flooded temple. Also in the scene: Paper lantern. It will be printed as Ink atlas.`);
});

test('the world is not told it is its own setting and the look is not told it is its own print', () => {
  assert.equal(sceneBrief(base, world, { world, cast: [chair], look }), `${base} These questions shape one part of the scene: Flooded temple. Also in the scene: Chair. It will be printed as Ink atlas.`);
  assert.equal(sceneBrief(base, look, { world, cast: [], look }), `${base} These questions shape one part of the scene: Ink atlas. The setting is Flooded temple.`);
  assert.equal(sceneBrief(base, chair, { world, cast: [chair], look: null }), `${base} These questions shape one part of the scene: Chair. The setting is Flooded temple.`);
});

test('a crowded scene drops the furthest companions until the brief fits the limit', () => {
  const crowd = Array.from({ length: 40 }, (_, index) => ({ id: `things/${index}`, title: `A thing with a long title number ${index}` }));
  const brief = sceneBrief('x'.repeat(900), chair, { world, cast: [chair, ...crowd], look });
  assert.ok(brief.length <= MAX_BRIEF_CHARACTERS);
  assert.match(brief, /These questions shape one part of the scene: Chair\. The setting is Flooded temple\./);
  assert.match(brief, / and more\./, 'the cut is admitted');
  assert.match(brief, /It will be printed as Ink atlas\.$/, 'the print survives the cut');
});

test('an oversized lead is still cut to the limit', () => {
  const brief = sceneBrief('x'.repeat(MAX_BRIEF_CHARACTERS + 50), chair, { world, cast: [], look: null });
  assert.equal(brief.length, MAX_BRIEF_CHARACTERS);
});
