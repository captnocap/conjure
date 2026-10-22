import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { traceId, traceImage } from '../src/trace-image';
import { traceSchema, summaryOf } from '../server/traces';
import { colourWord, foundEntry } from '../engine/found-entry';
import { FOUND_QUESTIONS, foundThing } from '../engine/found';
import { generateSvg, normalizeTrace, traceSvg, createSvgLayer, type SvgLayer, type TracedImage } from '../kit/svg';
import { visibleBounds } from '../kit/measure';
import { seeded } from '../kit/random';
import { decideSchema } from '../server/decision-schema';

/** A dark disc on a pink field, like a subject on a blanket. */
function photo(width = 96, height = 64) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 4;
    const inside = Math.hypot(x - width / 2, y - height / 2) < height * 0.3;
    data[p] = inside ? 40 : 224; data[p + 1] = inside ? 52 : 60; data[p + 2] = inside ? 70 : 140; data[p + 3] = 255;
  }
  return { width, height, data };
}

test('a photo traces into colour shapes with its border colour marked as background', () => {
  const traced = traceImage(photo(), 'blanket cat', 'pending');
  assert.ok(traced.shapes.length >= 2);
  const pink = traced.shapes.find((shape) => shape.background);
  const disc = traced.shapes.find((shape) => !shape.background);
  assert.ok(pink && disc, 'one background colour and one subject colour');
  assert.ok(disc.tone < pink.tone);
  for (const shape of traced.shapes) assert.match(shape.d, /^[MLQZ0-9.\s-]+$/);
  assert.deepEqual(traceImage(photo(), 'blanket cat', 'pending'), traced, 'tracing is deterministic');
  const id = traceId('Blanket Cat.JPG', traced.shapes);
  assert.match(id, /^blanket-cat-[a-z0-9]+$/);
  assert.equal(traceId('Blanket Cat.JPG', traced.shapes), id);
  assert.throws(() => traceImage({ width: 0, height: 0, data: new Uint8ClampedArray() }, 'empty', 'x'));
});

test('the server schema accepts traced paths and refuses markup, bad colours and oversize', () => {
  const traced = traceImage(photo(), 'blanket cat', 'pending');
  const record = { ...traced, id: traceId('blanket cat', traced.shapes) };
  assert.ok(traceSchema.safeParse(record).success);
  for (const bad of [
    { ...record, shapes: [{ ...record.shapes[0], d: 'M 0 0 L 1 1"/><script>alert(1)</script>' }] },
    { ...record, shapes: [{ ...record.shapes[0], fill: 'url(#x)' }] },
    { ...record, id: '../../etc/passwd' },
    { ...record, shapes: [{ ...record.shapes[0], d: `M ${'1 '.repeat(500_000)}` }] },
    { ...record, extra: true },
  ]) assert.equal(traceSchema.safeParse(bad).success, false);
  const summary = summaryOf({ ...record, createdAt: '2026-10-13T00:00:00Z' });
  assert.equal(summary.name, 'blanket cat');
  assert.equal(summary.darkBackground, true, 'the saturated pink field reads as a mid-dark backdrop (luminance 0.39)');
  assert.ok(summary.colours.length >= 1);
});

test('a trace becomes a catalogue entry the model can judge by name and colour', () => {
  assert.equal(colourWord('#e03c8c'), 'pink');
  assert.equal(colourWord('#203040'), 'dark blue');
  assert.equal(colourWord('#f6f3ec'), 'white');
  const entry = foundEntry({ id: 'biscuit-ab12', name: 'Biscuit, my dog', width: 1, height: 1, createdAt: '', colours: ['#a0703c', '#f6f3ec'], darkBackground: false, bytes: 1 });
  assert.equal(entry.id, 'things/found-biscuit-ab12');
  assert.equal(entry.kind, 'thing');
  assert.match(entry.summary, /Biscuit, my dog/);
  assert.match(entry.summary, /brown|orange/);
  decideSchema.parse({ idea: 'x', brief: 'y', questions: Object.values(FOUND_QUESTIONS) });
});

const context = (seed = 3) => ({ idea: 'a found picture', mood: { wear: 0.2, warmth: 0.5, energy: 0.5, density: 0.5, daylight: 0.5, cheer: 0.5 }, scale: 'room' as const, seed, random: seeded(seed) });

test('every mount builds a grounded object whose surfaces are alpha-tested cut-outs', async () => {
  const traced = traceImage(photo(), 'blanket cat', 'blanket-cat');
  const builder = foundThing(traced);
  for (const mount of Object.keys(FOUND_QUESTIONS.mount.options) as (keyof typeof FOUND_QUESTIONS.mount.options)[]) {
    for (const [backdrop, border] of [[false, 'none'], [true, 'sticker']] as const) {
      const thing = await builder.build({ mount, backdrop, border, size: 0.5, finish: 'card' }, context());
      thing.object.updateMatrixWorld(true);
      const bounds = visibleBounds(thing.object);
      assert.ok(!bounds.isEmpty(), `${mount} built something`);
      assert.ok(bounds.min.y > -0.3 && bounds.min.y < 0.3, `${mount} stands on the ground: ${bounds.min.y}`);
      const size = bounds.getSize(new THREE.Vector3());
      assert.ok(Math.max(size.x, size.y, size.z) < 6, `${mount} has a sane size`);
      let cutouts = 0;
      thing.object.traverse((node) => {
        const material = (node as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (material?.map && material.alphaTest === 0.5) cutouts++;
      });
      assert.ok(cutouts >= 1, `${mount} carries the picture as an alpha-tested map`);
      assert.ok(thing.footprint! > 0);
      thing.update?.(0.016, 1);
      thing.dispose();
    }
  }
});

test('a trace sheet renders in four treatments and drops anything that is not plain path data', () => {
  const traced: TracedImage = traceImage(photo(), 'blanket cat', 'blanket-cat');
  const layer = (style: 'poster' | 'ink' | 'lines' | 'ghost'): SvgLayer => ({ ...createSvgLayer('topography', 1), id: `trace-${style}`, motif: 'trace', trace: { image: traced, style, x: 0.5, y: 0.5, size: 0.6 }, color: '#112233', accent: '#ddccbb' });
  const poster = generateSvg(720, [layer('poster')]);
  const ghost = generateSvg(720, [layer('ghost')]);
  const ink = generateSvg(720, [layer('ink')]);
  const lines = generateSvg(720, [layer('lines')]);
  assert.match(poster, /data-motif="trace"/);
  assert.match(poster, /<title>blanket cat<\/title>/);
  assert.ok((ghost.match(/<path /g) ?? []).length > (poster.match(/<path /g) ?? []).length, 'ghost keeps the background, poster drops it');
  assert.match(ink, /fill="#112233"|fill="#ddccbb"/, 'ink re-inks in the sheet colours');
  assert.doesNotMatch(lines, /fill="#e0/, 'lines never use the photo colours');
  const hostile = { ...layer('poster'), trace: { image: { ...traced, name: '<b>x</b>', shapes: [{ d: 'M0 0"/><script>1</script>', fill: 'red', tone: 9, background: false }, ...traced.shapes] }, style: 'nonsense', x: 9, y: -9, size: 99 } } as unknown as SvgLayer;
  const safe = generateSvg(720, [hostile]);
  assert.doesNotMatch(safe, /<script|<b>/);
  const normal = normalizeTrace(hostile.trace)!;
  assert.equal(normal.style, 'poster');
  assert.equal(normal.x, 1); assert.equal(normal.y, 0); assert.equal(normal.size, 1.2);
  assert.equal(normalizeTrace({ image: { shapes: [] } }), undefined);
  assert.match(traceSvg(traced, 'poster'), /^<svg[^>]*viewBox="0 0 720 720"/);
});
