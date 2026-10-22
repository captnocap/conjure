import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BuildContext, Capture } from '../kit/contract';
import { seeded } from '../kit/random';
import look from '../components/looks/pencil-and-ink/build';

/** A tiny synthetic frame: two things side by side on a ground, one certain and one doubtful. */
function frame(size: number, confidence: number[] | undefined): Capture {
  const count = size * size;
  const color = new Uint8ClampedArray(count * 4);
  const normal = new Uint8ClampedArray(count * 4);
  const depth = new Uint8Array(count * 4);
  const identity = new Uint8Array(count * 4);
  const diffuse = new Uint8Array(count * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const p = (y * size + x) * 4;
    const ground = y > size * 0.7;
    const left = !ground && x < size * 0.45 && y > size * 0.2;
    const right = !ground && x > size * 0.55 && y > size * 0.2;
    const id = ground ? 1 : left ? 3 : right ? 4 : 0;
    identity[p] = id;
    const tone = id === 0 ? 235 : ground ? 170 : 90;
    color[p] = color[p + 1] = color[p + 2] = tone; color[p + 3] = 255;
    normal[p] = 128; normal[p + 1] = 128; normal[p + 2] = 255; normal[p + 3] = 255;
    diffuse[p] = diffuse[p + 1] = diffuse[p + 2] = id ? 60 : 0; diffuse[p + 3] = 255;
  }
  return {
    size, color, normal, depth, identity, diffuse, near: 0.1, far: 100, pixelWorldSize: 0.01, light: [0, 0, 1],
    baseColors: [null, [170, 170, 170], null, [90, 90, 90], [90, 90, 90]],
    ...(confidence ? { confidence } : {}),
  };
}

const context: BuildContext = {
  idea: 'a look check', mood: { wear: 0.2, warmth: 0.5, energy: 0.3, density: 0.5, daylight: 0.5, cheer: 0.5 }, scale: 'room', seed: 5, random: seeded(5),
};
const answers = { paper: 'white', ink: 'black', commitment: 'balanced', hatching: 'cross', pencil: 0.5, construction: true, wash: 'none', weight: 0.5 } as const;

/** Mean darkness of the pixels belonging to one identity. */
function darkness(capture: Capture, pixels: Uint8ClampedArray, id: number) {
  let sum = 0, count = 0;
  for (let pixel = 0; pixel < capture.size * capture.size; pixel++) {
    if (capture.identity[pixel * 4] !== id) continue;
    sum += 255 - (pixels[pixel * 4] + pixels[pixel * 4 + 1] + pixels[pixel * 4 + 2]) / 3;
    count++;
  }
  return sum / Math.max(1, count);
}

test('a certain thing is inked darker than a doubtful one, which stays pencil', async () => {
  const capture = frame(96, [1, 1, 1, 0.95, 0.2]);
  const result = await look.apply(capture, answers, context, new AbortController().signal);
  assert.equal(result.pixels.length, 96 * 96 * 4);
  const sure = darkness(capture, result.pixels, 3);
  const doubtful = darkness(capture, result.pixels, 4);
  assert.ok(sure > doubtful * 1.5, `inked ${sure.toFixed(1)} vs pencil ${doubtful.toFixed(1)}`);
  assert.match(result.notes.join(' '), /1 of 2 things inked, 1 left in pencil with construction lines/);
});

test('without a confidence channel everything is treated as certain', async () => {
  const capture = frame(96, undefined);
  const result = await look.apply(capture, answers, context, new AbortController().signal);
  const left = darkness(capture, result.pixels, 3);
  const right = darkness(capture, result.pixels, 4);
  assert.ok(Math.abs(left - right) < Math.max(left, right) * 0.12, `${left.toFixed(1)} vs ${right.toFixed(1)}`);
  assert.match(result.notes.join(' '), /2 of 2 things inked, 0 left in pencil/);
});

test('commitment moves the line between ink and pencil', async () => {
  const capture = frame(64, [1, 1, 1, 0.6, 0.6]);
  const sparing = await look.apply(capture, { ...answers, commitment: 'sparing' }, context, new AbortController().signal);
  const most = await look.apply(capture, { ...answers, commitment: 'most' }, context, new AbortController().signal);
  assert.match(sparing.notes.join(' '), /0 of 2 things inked/);
  assert.match(most.notes.join(' '), /2 of 2 things inked/);
  assert.ok(darkness(capture, most.pixels, 3) > darkness(capture, sparing.pixels, 3));
});

test('a cancelled print stops', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(look.apply(frame(64, undefined), answers, context, controller.signal));
});
