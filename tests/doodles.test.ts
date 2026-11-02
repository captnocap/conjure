import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Capture } from '../kit/contract';
import { DOODLE_SETS, DOODLE_SET_NAMES, DOODLE_SHAPES, type DoodleSet, type ThemedSet, doodleAt, doodleIndexOf, doodleSetOf, doodleText, doodleTurn, hashPair } from '../engine/doodles';
import { applyVacui } from '../engine/vacui';

const THEMED = DOODLE_SET_NAMES.filter((set): set is ThemedSet => set !== 'notebook');
/** The fill's pen: how much ink a pixel takes at a distance (px) from a stroke in a cell of reach r. */
const pen = (distance: number, r: number) => Math.min(1, Math.max(0, 0.65 + 0.02 * r + 0.5 - distance));
/** The share of a cell's pixels a shape inks, drawn at reach r. */
function coverage(draw: (u: number, v: number, k: number, r: number) => number, r: number, k = 0.37): number {
  let inked = 0, total = 0;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = draw((x + 0.5) / r, (y + 0.5) / r, k, r);
    assert.ok(!Number.isNaN(d), 'a distance is a number');
    if (pen(d * r, r) > 0.5) inked++;
    total++;
  }
  return inked / total;
}

/** A flat cream backdrop, a drawn floor with lines, and a dark hero with a second thing. */
function scene(size = 160): { capture: Capture; print: Uint8ClampedArray } {
  const count = size * size;
  const identity = new Uint8Array(count * 4), print = new Uint8ClampedArray(count * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, p = i * 4;
    let id = y > size * 0.75 ? 1 : 0;
    if (x > size * 0.35 && x < size * 0.55 && y > size * 0.3 && y < size * 0.8) id = 3;
    if (x > size * 0.7 && x < size * 0.8 && y > size * 0.6 && y < size * 0.78) id = 4;
    identity[p] = id;
    let rgb = [236, 228, 210];
    if (id === 1) rgb = (x + y) % 9 === 0 ? [60, 60, 70] : [200, 190, 170];
    if (id >= 3) rgb = [40, 34, 30];
    print.set([...rgb, 255], p);
  }
  return { capture: { size, color: new Uint8ClampedArray(print), normal: new Uint8ClampedArray(count * 4), depth: new Uint8Array(count * 4), identity, diffuse: new Uint8Array(count * 4), near: 0.1, far: 100, pixelWorldSize: 0.01, light: [0, 0, 1], baseColors: [] }, print };
}

test('every doodle set is described for the model and holds a notebook of named shapes', () => {
  for (const set of DOODLE_SET_NAMES) {
    assert.match(DOODLE_SETS[set], /^[A-Z].+: .+\.$/, `${set} is described as "Name: what it draws."`);
    assert.ok(DOODLE_SETS[set].length <= 600, `${set}: the description fits the decision schema`);
  }
  for (const set of THEMED) {
    const shapes = DOODLE_SHAPES[set];
    assert.ok(shapes.length >= (set === 'machinery' ? 8 : 16), `${set} holds ${shapes.length} shapes`);
    assert.equal(new Set(shapes.map((shape) => shape.name)).size, set === 'machinery' ? shapes.length - 1 : shapes.length, `${set}: shapes are named apart`);
  }
  assert.equal(DOODLE_SHAPES.ascii.length, 61, 'A–Z, 0–9 and 25 marks of punctuation');
});

test('every shape inks a drawing, not a blot and not nothing, at the fill’s small and large cell sizes', () => {
  for (const set of THEMED) for (const [index, shape] of DOODLE_SHAPES[set].entries()) {
    if (set === 'machinery' && shape.name === 'blank') continue;
    for (const r of [9, 16, 26]) {
      const share = coverage(shape.draw, r);
      assert.ok(share > 0.003, `${set}/${shape.name} (#${index}) at reach ${r} inks only ${(share * 100).toFixed(1)}%`);
      assert.ok(share < 0.6, `${set}/${shape.name} (#${index}) at reach ${r} is a blot: ${(share * 100).toFixed(1)}%`);
    }
    // The cell's own number varies a shape without breaking it.
    for (const k of [0, 0.5, 0.999]) assert.ok(coverage(shape.draw, 14, k) > 0.01, `${set}/${shape.name} draws at k=${k}`);
  }
});

test('shapes stay inside their cell: nothing is inked out past the cell’s reach', () => {
  // Contours are small maps that fill their whole cell up to the wall, on purpose.
  for (const set of THEMED) for (const shape of DOODLE_SHAPES[set]) {
    if (set === 'contours') continue;
    let outside = 0;
    for (let i = 0; i < 400; i++) { const a = i / 400 * 2 * Math.PI, u = Math.cos(a) * 1.08, v = Math.sin(a) * 1.08; if (pen(shape.draw(u, v, 0.37, 20) * 20, 20) > 0.5) outside++; }
    assert.ok(outside < 8, `${set}/${shape.name} inks ${outside} of 400 points beyond the reach`);
  }
});

test('machinery turns as it always did, upright sets only lean, and the notebook takes from every set', () => {
  const seen = new Set<ThemedSet>();
  for (let cell = 0; cell < 3000; cell++) {
    assert.equal(doodleTurn('machinery', cell), hashPair(cell, 99) * Math.PI);
    for (const set of ['hieroglyphs', 'ascii', 'furniture', 'buildings', 'fungi'] as const) assert.ok(Math.abs(doodleTurn(set, cell)) < 0.2, `${set} stays upright`);
    assert.equal(doodleSetOf('fungi', cell), 'fungi');
    seen.add(doodleSetOf('notebook', cell));
  }
  assert.deepEqual([...seen].sort(), [...THEMED].sort());
  let blank = 0;
  for (let cell = 0; cell < 6000; cell++) if (doodleIndexOf('hieroglyphs', cell) < 0) blank++;
  assert.ok(Math.abs(blank / 6000 - 1 / 12) < 0.02, `about one cell in twelve is blank: ${blank}`);
  assert.equal(doodleAt('hieroglyphs', 5, 100, 100, 10), Infinity, 'far outside a cell there is nothing to ink');
});

test('the ASCII font writes a label the sheet tool can read', () => {
  let inked = 0;
  for (let y = -8; y <= 8; y++) for (let x = 0; x < 60; x++) if (pen(doodleText(x, y, 'Doodle 42!', 0, 0, 5), 2.5) > 0.5) inked++;
  assert.ok(inked > 80 && inked < 600, `the label inks ${inked} pixels`);
  assert.equal(doodleText(0, 0, '', 0, 0, 5), Infinity);
});

test('the glyph fill grows every doodle set in the dead space, repeats exactly, names the set, and runs quickly', () => {
  const { capture, print } = scene();
  for (const set of DOODLE_SET_NAMES) {
    const vacui = { fill: 'glyphs' as const, grain: 'hug' as const, reach: 0.8, form: 'land' as const, ink: 'print' as const, drip: false, doodles: set as DoodleSet };
    const first = applyVacui(print, capture, vacui, 77), again = applyVacui(print, capture, vacui, 77);
    assert.deepEqual(first.pixels, again.pixels, `${set} repeats for the same seed`);
    let backdrop = 0, subject = 0;
    for (let i = 0; i < print.length / 4; i++) {
      const changed = first.pixels[i * 4] !== print[i * 4] || first.pixels[i * 4 + 1] !== print[i * 4 + 1];
      if (changed && capture.identity[i * 4] === 0) backdrop++;
      if (changed && capture.identity[i * 4] >= 3) subject++;
    }
    assert.ok(backdrop > print.length / 4 * 0.2, `${set} filled only ${backdrop} backdrop pixels`);
    assert.equal(subject, 0, 'the subjects are never painted over');
    assert.match(first.note, new RegExp(`^Dead space: glyphs of ${DOODLE_SETS[set].slice(0, DOODLE_SETS[set].indexOf(':')).toLowerCase()} grows`));
  }
  const big = scene(720);
  for (const set of ['fractals', 'contours', 'notebook'] as const) {
    const started = performance.now();
    applyVacui(big.print, big.capture, { fill: 'glyphs', grain: 'hug', reach: 1, doodles: set }, 3, 0.3);
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 4000, `${set} took ${Math.round(elapsed)} ms`);
    console.log(`glyphs of ${set}: ${Math.round(elapsed)} ms`);
  }
});

test('different sets draw different pictures, and a plan without a set draws machinery', () => {
  const { capture, print } = scene(120);
  const base = { fill: 'glyphs' as const, grain: 'even' as const, reach: 1 };
  const machinery = applyVacui(print, capture, base, 5).pixels, named = applyVacui(print, capture, { ...base, doodles: 'machinery' }, 5).pixels, letters = applyVacui(print, capture, { ...base, doodles: 'ascii' }, 5).pixels;
  assert.deepEqual(machinery, named);
  let different = 0;
  for (let i = 0; i < machinery.length; i++) if (machinery[i] !== letters[i]) different++;
  assert.ok(different > machinery.length * 0.02, `letters differ from machinery in ${different} bytes`);
});
