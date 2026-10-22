import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { FINISHES, type Direction, type Manifest } from '../kit/contract';
import { MAX_BRIEF_CHARACTERS } from '../engine/decision-limits';
import { designBrief } from '../engine/design';
import { BRIEF_BASE, directed } from '../engine/art-direction';
import { OPPOSITE_NOTE } from '../engine/oracle';
import { sceneBrief } from '../engine/scene-brief';

/**
 * Directions are words, not builds, so this is their whole conformance check: the shape and the
 * length rules that keep every brief they join under the request cap. `npm run check` skips them.
 */
const ROOT = 'components/directions';
export const BRIEF_LIMIT = 480;
export const NOTE_LIMIT = 200;
const SUMMARY_RANGE = [60, 420] as const;
const names = readdirSync(ROOT).filter((name) => statSync(`${ROOT}/${name}`).isDirectory()).sort();
const mood = { wear: 0.5, warmth: 0.5, energy: 0.5, density: 0.5, daylight: 0.5, cheer: 0.5 };
const company = Array.from({ length: 6 }, (_, index) => ({ id: `things/companion-${index}`, title: `A long-titled companion thing number ${index}` }));

test('the shipped directions include the Fifth World and one that adds nothing', () => {
  assert.ok(names.includes('fifth-world'));
  assert.ok(names.includes('as-written'));
  assert.ok(names.length >= 3, 'a choice needs more than two directions to mean anything');
});

for (const name of names) {
  const id = `directions/${name}`;
  test(`${id}: manifest and direction keep to their shape and lengths`, async () => {
    const manifest = (await import(`../${ROOT}/${name}/manifest.ts`)).default as Manifest;
    const direction = (await import(`../${ROOT}/${name}/build.ts`)).default as Direction;
    assert.equal(manifest.kind, 'direction');
    assert.deepEqual(manifest.scales, [], 'a direction applies at every scale');
    assert.ok(manifest.title.trim().length > 0);
    assert.ok(manifest.summary.length >= SUMMARY_RANGE[0] && manifest.summary.length <= SUMMARY_RANGE[1], `summary is ${manifest.summary.length} characters; the model chooses the direction from it, so say what it does and what it is for (${SUMMARY_RANGE.join('–')})`);
    assert.equal(typeof direction.brief, 'string');
    assert.equal(typeof direction.note, 'string');
    assert.ok(direction.brief.startsWith('Direction:'), 'the brief opens with "Direction:" so the model reads it as the direction, not the idea');
    assert.ok(direction.note.startsWith('Direction:'));
    assert.ok(direction.brief.length >= 60 && direction.brief.length <= BRIEF_LIMIT, `brief is ${direction.brief.length} characters (60–${BRIEF_LIMIT})`);
    assert.ok(direction.note.length >= 20 && direction.note.length <= NOTE_LIMIT, `note is ${direction.note.length} characters (20–${NOTE_LIMIT})`);
    assert.ok(direction.note.length < direction.brief.length, 'the note is the short form');
    assert.ok(Array.isArray(direction.finishes));
    assert.ok(direction.finishes.every((finish) => FINISHES.includes(finish)), `finishes may only name ${FINISHES.join(', ')}`);
    assert.equal(new Set(direction.finishes).size, direction.finishes.length, 'no finish twice');
    assert.ok(!/\s{2}/.test(direction.brief) && !/\s{2}/.test(direction.note), 'single spaces');
  });

  test(`${id}: every brief it joins stays under the request cap`, async () => {
    const direction = (await import(`../${ROOT}/${name}/build.ts`)).default as Direction;
    const routing = directed(BRIEF_BASE, direction.brief);
    assert.ok(routing.length <= MAX_BRIEF_CHARACTERS, `routing brief is ${routing.length} characters`);
    const opposite = `${OPPOSITE_NOTE} ${routing}`;
    assert.ok(opposite.length <= MAX_BRIEF_CHARACTERS, `opposite routing brief is ${opposite.length} characters`);
    const look = sceneBrief(opposite, { id: 'looks/x', title: 'A look with a fairly long title' }, { world: { id: 'worlds/w', title: 'A setting with a long descriptive title' }, cast: company, look: null });
    assert.ok(look.length <= MAX_BRIEF_CHARACTERS && look.includes(direction.brief), 'a look still hears the whole direction beside its scene');
    const thing = sceneBrief(`${OPPOSITE_NOTE} ${directed(BRIEF_BASE, direction.note)}`, company[0], { world: { id: 'worlds/w', title: 'A setting' }, cast: company, look: { id: 'looks/x', title: 'A look' } });
    assert.ok(thing.length <= MAX_BRIEF_CHARACTERS && thing.includes(direction.note));
    const design = designBrief('A descriptive look title '.repeat(4), mood, (brief) => `${OPPOSITE_NOTE} ${brief}`, direction);
    assert.ok(design.length <= MAX_BRIEF_CHARACTERS && (design.includes(direction.brief) || design.includes(direction.note)), 'the vector composition hears the direction in full or in its note');
  });
}
