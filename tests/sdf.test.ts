import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bakeTrace, distanceTransform, parsePath, rasterize } from '../kit/sdf';
import type { TracedImage } from '../kit/svg';

const square = (x0: number, y0: number, x1: number, y1: number) => `M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${y1} L ${x0} ${y1} Z`;
const identity = (x: number, y: number): [number, number] => [x, y];

test('path data parses into closed rings and curves flatten', () => {
  const rings = parsePath(`${square(0, 0, 10, 10)} M 20 20 Q 30 20 30 30 L 20 30 Z`, 4);
  assert.equal(rings.length, 2);
  assert.equal(rings[0].length, 4);
  assert.equal(rings[1].length, 1 + 4 + 1, 'a quadratic becomes four segments');
  assert.deepEqual(rings[1][4], [30, 30]);
  assert.deepEqual(parsePath('garbage'), []);
});

test('rasterising fills inside, leaves holes empty under even-odd and samples pixel centres', () => {
  const mask = rasterize(parsePath(`${square(2, 2, 18, 18)} ${square(6, 6, 14, 14)}`), 20, 20, identity);
  const at = (x: number, y: number) => mask[y * 20 + x];
  assert.equal(at(3, 3), 1);
  assert.equal(at(10, 10), 0, 'the inner square is a hole');
  assert.equal(at(1, 1), 0);
  assert.equal(at(17, 17), 1);
  assert.equal(at(18, 18), 0, 'the right and bottom edges are exclusive at pixel centres');
  const filled = mask.reduce((sum, value) => sum + value, 0);
  assert.equal(filled, 16 * 16 - 8 * 8);
});

test('the distance transform is exact and reports the nearest site', () => {
  const width = 9, height = 7;
  const site = (index: number) => index === 3 * width + 4;
  const { distance, from } = distanceTransform(site, width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    assert.ok(Math.abs(distance[y * width + x] - Math.hypot(x - 4, y - 3)) < 1e-6);
    assert.equal(from[y * width + x], 3 * width + 4);
  }
});

const picture = (background: boolean): TracedImage => ({
  id: 'disc', name: 'A test disc', width: 100, height: 60,
  shapes: [
    { d: square(0, 0, 100, 60), fill: '#e03c8c', tone: 0.45, background },
    { d: square(30, 10, 70, 50), fill: '#203040', tone: 0.15, background: false },
  ],
});

test('a bake crops to the kept shapes, puts the edge at half alpha and colours the outside', () => {
  const bake = bakeTrace(picture(true), { resolution: 128, spread: 8 });
  assert.ok(Math.abs(bake.sourceWidth - 40) < 1e-6 && Math.abs(bake.sourceHeight - 40) < 1e-6, 'the background was dropped and the bake cropped to the subject');
  assert.equal(bake.width, bake.height, 'a square subject bakes square');
  const alpha = (x: number, y: number) => bake.data[(y * bake.width + x) * 4 + 3];
  const centre = Math.floor(bake.width / 2);
  assert.equal(alpha(centre, centre), 255, 'deep inside is fully opaque');
  assert.equal(alpha(0, 0), 0, 'far outside is clear');
  // Along the middle row the alpha crosses 128 within a pixel of the outline.
  let crossing = -1;
  for (let x = 0; x < centre; x++) if (alpha(x, centre) < 128 && alpha(x + 1, centre) >= 128) crossing = x;
  assert.ok(crossing > 0, 'there is an edge');
  const [r, g, b] = [0, 1, 2].map((c) => bake.data[(centre * bake.width + 1) * 4 + c]);
  assert.deepEqual([r, g, b], [0x20, 0x30, 0x40], 'outside takes the nearest inside colour so filtering never darkens the edge');
  assert.ok(bake.depth[centre * bake.width + centre] > 0.9 && bake.depth[0] === 0);
});

test('keeping the background keeps the whole picture, and a border widens the outline in its colour', () => {
  const whole = bakeTrace(picture(true), { resolution: 128, keepBackground: true });
  assert.ok(Math.abs(whole.sourceWidth - 100) < 1e-6);
  const plain = bakeTrace(picture(true), { resolution: 128, spread: 8 });
  const bordered = bakeTrace(picture(true), { resolution: 128, spread: 8, border: 5, borderColor: '#f6f3ec' });
  const band = (bake: typeof plain) => { let count = 0; for (let i = 0; i < bake.data.length; i += 4) if (bake.data[i + 3] >= 128 && bake.data[i] === 0xf6 && bake.data[i + 1] === 0xf3) count++; return count; };
  assert.equal(band(plain), 0);
  assert.ok(band(bordered) > 4 * 40, `the border adds a visible outline band: ${band(bordered)} pixels`);
  const [r, g, b] = [0, 1, 2].map((c) => bordered.data[c]);
  assert.deepEqual([r, g, b], [0xf6, 0xf3, 0xec]);
  assert.deepEqual(bakeTrace(picture(true), { resolution: 128, spread: 8 }).data, plain.data, 'a bake is deterministic');
});
