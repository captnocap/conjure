import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Capture } from '../kit/contract';
import { OTHERWORLD_QUESTIONS, RIFTS, RIFT_INKS, applyOtherworld, otherworldOf, printInks, strengthOf, type Rift, type RiftInk } from '../engine/otherworld';
import { decideSchema } from '../server/decision-schema';

/** A cream sky over brown ground, a dark hero box and a second thing, printed in ink on paper. */
function scene(size = 120, things = true): { capture: Capture; print: Uint8ClampedArray } {
  const count = size * size;
  const identity = new Uint8Array(count * 4), normal = new Uint8ClampedArray(count * 4), diffuse = new Uint8Array(count * 4);
  const print = new Uint8ClampedArray(count * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, p = i * 4;
    let id = y > size * 0.7 ? 1 : 0;
    if (things && x > 40 && x < 70 && y > 40 && y < 90) id = 3;
    if (things && x > 85 && x < 100 && y > 70 && y < 88) id = 4;
    identity[p] = id;
    normal.set(x > 55 ? [200, 128, 128, 255] : [128, 200, 128, 255], p);
    diffuse[p] = 90 + (x % 50);
    const rgb = id >= 3 ? [40, 34, 30] : id === 1 ? [150, 120, 90] : [236, 228, 210];
    print.set([...rgb, 255], p);
  }
  return { capture: { size, color: new Uint8ClampedArray(print), normal, depth: new Uint8Array(count * 4), identity, diffuse, near: 0.1, far: 100, pixelWorldSize: 0.01, light: [0, 0, 1], baseColors: [] }, print };
}

test('the otherworld questions are typed and fit the live schema, without a way to opt out', () => {
  decideSchema.parse({ idea: 'x', brief: 'y', questions: Object.values(OTHERWORLD_QUESTIONS) });
  assert.deepEqual(Object.keys(OTHERWORLD_QUESTIONS.rift.options), Object.keys(RIFTS));
  assert.ok(!('none' in OTHERWORLD_QUESTIONS.rift.options), 'the house style is heavy: every plan crosses over');
  assert.equal(OTHERWORLD_QUESTIONS.riftDepth.levels.length, 5);
  assert.ok(strengthOf(0) >= 0.35 && strengthOf(1) === 1);
});

test('settled answers become a valid otherworld, and nonsense falls back safely', () => {
  assert.deepEqual(otherworldOf({ rift: 'echo', riftDepth: 0.4, riftInk: 'acid' }), { rift: 'echo', depth: 0.4, ink: 'acid' });
  assert.deepEqual(otherworldOf({ rift: '__proto__', riftDepth: Number.NaN, riftInk: 'constructor' }), { rift: 'plate', depth: 0, ink: 'own' });
});

test('every effect in every ink changes the print, repeats exactly, and leaves the input alone', () => {
  const { capture, print } = scene();
  const before = new Uint8ClampedArray(print);
  for (const rift of Object.keys(RIFTS) as Rift[]) for (const ink of Object.keys(RIFT_INKS) as RiftInk[]) {
    const world = { rift, depth: 0.6, ink };
    const first = applyOtherworld(print, capture, world, 1234);
    const again = applyOtherworld(print, capture, world, 1234);
    assert.deepEqual(first.pixels, again.pixels, `${rift}/${ink} must repeat for the same seed`);
    assert.deepEqual(print, before, `${rift}/${ink} must not write into the look's pixels`);
    assert.equal(first.pixels.length, print.length);
    let changed = 0;
    for (let i = 0; i < print.length; i += 4) if (first.pixels[i] !== print[i] || first.pixels[i + 1] !== print[i + 1] || first.pixels[i + 2] !== print[i + 2]) changed++;
    assert.ok(changed > print.length / 4 * 0.01, `${rift}/${ink} changed only ${changed} pixels`);
    for (let i = 3; i < print.length; i += 4) assert.equal(first.pixels[i], 255, 'the print stays opaque');
    assert.match(first.note, /^Otherworld: /);
  }
});

test('effects that need a subject become a specimen plate in an empty frame', () => {
  const { capture, print } = scene(100, false);
  for (const rift of ['echo', 'wireframe', 'portal', 'trails', 'colossus'] as Rift[]) {
    const result = applyOtherworld(print, capture, { rift, depth: 1, ink: 'own' }, 9);
    assert.match(result.note, /specimen plate/);
  }
});

test('the print’s own inks are its darkest ink and lightest paper', () => {
  const { print } = scene();
  const { ink, paper } = printInks(print, print.length / 4);
  assert.ok(ink[0] < 80 && paper[0] > 200, `ink ${ink} paper ${paper}`);
});

test('a full-size frame crosses over quickly enough for loops', () => {
  const { capture, print } = scene(720);
  for (const rift of Object.keys(RIFTS) as Rift[]) {
    const started = performance.now();
    applyOtherworld(print, capture, { rift, depth: 1, ink: 'signal' }, 3);
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 2500, `${rift} took ${Math.round(elapsed)} ms`);
  }
});
