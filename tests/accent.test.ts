import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Capture } from '../kit/contract';
import { ACCENT_QUESTIONS, HERO_ID, accentMask, composeAccent, morph } from '../engine/accent';
import { decideSchema } from '../server/decision-schema';

/** A white oval hero on a dark field, with a busy striped eye and a flat grey blotch on it. */
function capture(size = 160, withHero = true): Capture {
  const count = size * size;
  const color = new Uint8ClampedArray(count * 4), identity = new Uint8Array(count * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, p = i * 4;
    const inHero = withHero && ((x - 80) / 50) ** 2 + ((y - 80) / 70) ** 2 < 1;
    let rgb = [40, 30, 34];
    if (inHero) {
      rgb = [235, 230, 228];
      if (Math.hypot(x - 80, y - 60) < 14) rgb = (x + y) % 4 < 2 ? [30, 20, 20] : [220, 60, 70];
      if (((x - 70) / 12) ** 2 + ((y - 115) / 8) ** 2 < 1) rgb = [120, 120, 120];
    }
    color.set([...rgb, 255], p);
    identity[p] = inHero ? HERO_ID : y > 140 ? 1 : 0;
  }
  return { size, color, normal: new Uint8ClampedArray(count * 4), depth: new Uint8Array(count * 4), identity, diffuse: new Uint8Array(count * 4), near: 0.1, far: 100, pixelWorldSize: 0.01, light: [0, 0, 1], baseColors: [] };
}
const at = (mask: Uint8Array, x: number, y: number, size = 160) => mask[y * size + x];

test('the accent questions are typed choices that fit the live schema', () => {
  assert.deepEqual(Object.keys(ACCENT_QUESTIONS.accent.options), ['none', 'hero', 'detail']);
  assert.deepEqual(Object.keys(ACCENT_QUESTIONS.accentEdge.options), ['clean', 'feather', 'torn', 'outline']);
  decideSchema.parse({ idea: 'x', brief: 'y', questions: Object.values(ACCENT_QUESTIONS) });
});

test('the hero region is the hero silhouette; the detail region finds the busy eye, not the flat blotch', () => {
  const frame = capture();
  const hero = accentMask(frame, 'hero');
  assert.equal(at(hero, 80, 80), 1);
  assert.equal(at(hero, 5, 5), 0);
  const detail = accentMask(frame, 'detail');
  assert.equal(at(detail, 80, 60), 1, 'the eye is accented');
  assert.equal(at(detail, 70, 115), 0, 'the flat grey blotch is not');
  assert.equal(at(detail, 80, 135), 0, 'plain hero surface is not');
  assert.equal(at(detail, 5, 5), 0, 'nothing outside the hero');
  let area = 0, heroArea = 0;
  for (let i = 0; i < detail.length; i++) { area += detail[i]; heroArea += hero[i]; }
  assert.ok(area > 0 && area < heroArea * 0.35, `a detail is a small part of the hero: ${area} of ${heroArea}`);
  assert.deepEqual(accentMask(frame, 'detail'), detail, 'deterministic');
});

test('with no hero in frame there is nothing to accent', () => {
  const empty = accentMask(capture(160, false), 'detail');
  assert.equal(empty.reduce((sum, value) => sum + value, 0), 0);
});

test('morph grows and shrinks a mask', () => {
  const mask = new Uint8Array(20 * 20);
  mask[10 * 20 + 10] = 1;
  const grown = morph(mask, 20, 2);
  assert.equal(grown.reduce((sum, value) => sum + value, 0), 25);
  assert.equal(morph(grown, 20, -2).reduce((sum, value) => sum + value, 0), 1);
});

test('the accent replaces pixels only inside its region, with each edge style', () => {
  const size = 64, count = size * size;
  const base = new Uint8ClampedArray(count * 4).fill(200), accent = new Uint8ClampedArray(count * 4).fill(10);
  const mask = new Uint8Array(count);
  for (let y = 20; y < 44; y++) for (let x = 20; x < 44; x++) mask[y * size + x] = 1;
  for (const edge of ['clean', 'feather', 'torn', 'outline'] as const) {
    const out = composeAccent(base, accent, mask, size, edge, 9);
    assert.ok(out[(32 * size + 32) * 4] < 30, `${edge}: the middle takes the accent`);
    assert.equal(out[(2 * size + 2) * 4], 200, `${edge}: far outside keeps the base`);
    assert.deepEqual(composeAccent(base, accent, mask, size, edge, 9), out, `${edge}: deterministic`);
  }
  const feather = composeAccent(base, accent, mask, size, 'feather', 9);
  for (const [x, y] of [[19, 32], [44, 32], [32, 19], [32, 44], [19, 19]]) assert.equal(feather[(y * size + x) * 4], 200, `a feather stays inside its region at ${x},${y}`);
  const torn = composeAccent(base, accent, mask, size, 'torn', 9);
  let rim = 0;
  for (let i = 0; i < count; i++) if (torn[i * 4] > 230) rim++;
  assert.ok(rim > 10, 'a torn edge leaves a pale paper rim');
  for (const [x, y] of [[2, 2], [60, 5], [5, 60], [61, 61], [10, 32]]) assert.equal(torn[(y * size + x) * 4], 200, `no paper specks far from the region at ${x},${y}`);
});
