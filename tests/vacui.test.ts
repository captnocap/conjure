import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Capture } from '../kit/contract';
import { DOODLE_SET_NAMES } from '../engine/doodles';
import { VACUI_FILLS, VACUI_FORMS, VACUI_GRAINS, VACUI_INKS, VACUI_QUESTIONS, applyVacui, vacuiOf, type VacuiFill, type VacuiForm, type VacuiGrain, type VacuiInk } from '../engine/vacui';
import { CAMERA_MOVES, MOTION_QUESTIONS, cameraAt, cameraMoveOf, type CameraMove } from '../engine/motion';
import { decideSchema } from '../server/decision-schema';

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

test('the dead-space and loop camera questions are typed and fit the live schema', () => {
  decideSchema.parse({ idea: 'x', brief: 'y', questions: [...Object.values(VACUI_QUESTIONS), ...Object.values(MOTION_QUESTIONS)] });
  assert.ok(!('none' in VACUI_QUESTIONS.vacui.options), 'horror vacui: the empty space always fills');
  assert.deepEqual(vacuiOf({ vacui: 'lace', vacuiGrain: 'halo', vacuiReach: 0.3, vacuiForm: 'skull', vacuiInk: 'blacklight', vacuiDrip: true, vacuiDoodles: 'fungi' }), { fill: 'lace', grain: 'halo', reach: 0.3, form: 'skull', ink: 'blacklight', drip: true, doodles: 'fungi' });
  assert.deepEqual(vacuiOf({ vacui: '__proto__', vacuiGrain: 7, vacuiReach: Number.NaN, vacuiForm: 'constructor', vacuiDoodles: 'toString' }), { fill: 'tissue', grain: 'hug', reach: 0, form: 'land', ink: 'print', drip: false, doodles: 'machinery' });
  assert.deepEqual(Object.keys(VACUI_QUESTIONS.vacuiDoodles.options), DOODLE_SET_NAMES, 'the doodle question offers every set');
  assert.equal(Object.keys(VACUI_QUESTIONS).at(-1), 'vacuiDoodles', 'the doodle question comes last, so older draws of the dead-space stream are unchanged');
  assert.equal(cameraMoveOf({ loopCamera: 'push' }), 'push');
  assert.equal(cameraMoveOf({ loopCamera: 'constructor' }), 'drift');
});

test('every fill and grain grows in the dead space only, repeats exactly, and leaves the input alone', () => {
  const { capture, print } = scene();
  const before = new Uint8ClampedArray(print);
  for (const fill of Object.keys(VACUI_FILLS) as VacuiFill[]) for (const grain of Object.keys(VACUI_GRAINS) as VacuiGrain[]) {
    const vacui = { fill, grain, reach: 0.7 };
    const first = applyVacui(print, capture, vacui, 77), again = applyVacui(print, capture, vacui, 77);
    assert.deepEqual(first.pixels, again.pixels, `${fill}/${grain} repeats for the same seed`);
    assert.deepEqual(print, before, 'the look’s pixels are not written into');
    let backdrop = 0, subject = 0;
    for (let i = 0; i < print.length / 4; i++) {
      const changed = first.pixels[i * 4] !== print[i * 4] || first.pixels[i * 4 + 1] !== print[i * 4 + 1];
      if (changed && capture.identity[i * 4] === 0) backdrop++;
      if (changed && capture.identity[i * 4] >= 3) subject++;
    }
    assert.ok(backdrop > print.length / 4 * 0.2, `${fill}/${grain} filled only ${backdrop} backdrop pixels`);
    assert.equal(subject, 0, 'the subjects are never painted over');
    assert.match(first.note, /^Dead space: /);
  }
});

test('a picture with no quiet space is left as it was', () => {
  const { capture, print } = scene(120);
  for (let i = 0; i < print.length; i += 4) { const v = (i / 4) % 2 ? 20 : 235; print[i] = print[i + 1] = print[i + 2] = v; }
  const result = applyVacui(print, capture, { fill: 'tissue', grain: 'hug', reach: 1 }, 5);
  assert.deepEqual(result.pixels, print);
  assert.match(result.note, /none to fill/);
});

test('a loop’s tissue drifts and comes back to where it began', () => {
  const { capture, print } = scene();
  const vacui = { fill: 'terrain' as const, grain: 'even' as const, reach: 0.8 };
  const start = applyVacui(print, capture, vacui, 3, 0).pixels, middle = applyVacui(print, capture, vacui, 3, 0.5).pixels, end = applyVacui(print, capture, vacui, 3, 1).pixels;
  let moved = 0, returned = 0;
  for (let i = 0; i < start.length; i++) { if (start[i] !== middle[i]) moved++; if (Math.abs(start[i] - end[i]) > 1) returned++; }
  assert.ok(moved > start.length * 0.05, 'half way round, the landforms have moved');
  assert.equal(returned, 0, 'a full loop returns to the first frame');
});

test('every camera move starts and ends on the printed view, and only a held camera stays put', () => {
  for (const move of Object.keys(CAMERA_MOVES) as CameraMove[]) {
    for (const phase of [0, 1]) {
      const offset = cameraAt(move, phase);
      assert.ok(Math.abs(offset.yaw) < 1e-9 && Math.abs(offset.pitch) < 1e-9 && Math.abs(offset.push) < 1e-9, `${move} at ${phase}`);
    }
    const middle = [0.25, 0.5, 0.75].map((phase) => cameraAt(move, phase));
    const moves = middle.some((offset) => Math.abs(offset.yaw) + Math.abs(offset.pitch) + Math.abs(offset.push) > 0.01);
    assert.equal(moves, move !== 'still', move);
  }
});

test('a full-size frame fills quickly enough for loops', () => {
  const { capture, print } = scene(720);
  for (const fill of Object.keys(VACUI_FILLS) as VacuiFill[]) {
    const started = performance.now();
    applyVacui(print, capture, { fill, grain: 'hug', reach: 1 }, 3, 0.3);
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 4000, `${fill} took ${Math.round(elapsed)} ms`);
    console.log(`${fill}: ${Math.round(elapsed)} ms`);
  }
});

test('a macro form reads from afar: the skull\u2019s sockets are darker than its brow, the eye\u2019s pupil darker than its white', () => {
  const size = 240, count = size * size;
  const print = new Uint8ClampedArray(count * 4).fill(236);
  const capture: Capture = { size, color: new Uint8ClampedArray(print), normal: new Uint8ClampedArray(count * 4), depth: new Uint8Array(count * 4), identity: new Uint8Array(count * 4), diffuse: new Uint8Array(count * 4), near: 0.1, far: 100, pixelWorldSize: 0.01, light: [0, 0, 1], baseColors: [] };
  const mean = (pixels: Uint8ClampedArray, u: number, v: number, form: VacuiForm) => {
    // Face units round the frame's centre, where the form sits when there is no hero.
    const cx = size * 0.5 + u * size * 0.46, cy = size * 0.48 + v * size * 0.46;
    let sum = 0, n = 0;
    for (let y = Math.round(cy) - 6; y <= Math.round(cy) + 6; y++) for (let x = Math.round(cx) - 6; x <= Math.round(cx) + 6; x++) { const i = (y * size + x) * 4; sum += pixels[i] + pixels[i + 1] + pixels[i + 2]; n++; }
    return sum / n / 3;
  };
  for (const ink of Object.keys(VACUI_INKS) as VacuiInk[]) {
    const skull = applyVacui(print, capture, { fill: 'tissue', grain: 'even', reach: 1, form: 'skull', ink, drip: false }, 4).pixels;
    assert.ok(mean(skull, -0.38, -0.12, 'skull') < mean(skull, 0, -0.6, 'skull') - 15, `${ink}: sockets darker than the brow`);
    const eye = applyVacui(print, capture, { fill: 'tissue', grain: 'even', reach: 1, form: 'eye', ink, drip: false }, 4).pixels;
    assert.ok(mean(eye, 0, 0, 'eye') < mean(eye, 0.6, 0, 'eye') - 15, `${ink}: the pupil is darker than the white of the eye`);
  }
});

test('drips run down from solid dark forms, and the blacklight fill glows violet', () => {
  const size = 200, count = size * size;
  const print = new Uint8ClampedArray(count * 4).fill(236);
  const capture: Capture = { size, color: new Uint8ClampedArray(print), normal: new Uint8ClampedArray(count * 4), depth: new Uint8Array(count * 4), identity: new Uint8Array(count * 4), diffuse: new Uint8Array(count * 4), near: 0.1, far: 100, pixelWorldSize: 0.01, light: [0, 0, 1], baseColors: [] };
  const dry = applyVacui(print, capture, { fill: 'lace', grain: 'even', reach: 1, form: 'skull', ink: 'graphite', drip: false }, 8);
  const wet = applyVacui(print, capture, { fill: 'lace', grain: 'even', reach: 1, form: 'skull', ink: 'graphite', drip: true }, 8);
  let darker = 0;
  for (let i = 0; i < count; i++) if (wet.pixels[i * 4] < dry.pixels[i * 4] - 40) darker++;
  assert.ok(darker > count * 0.003, `drips darkened ${darker} pixels`);
  assert.match(wet.note, /dripping/);
  const glow = applyVacui(print, capture, { fill: 'glyphs', grain: 'even', reach: 1, form: 'land', ink: 'blacklight', drip: false }, 8).pixels;
  let blue = 0, red = 0, green = 0;
  for (let i = 0; i < count; i++) { red += glow[i * 4]; green += glow[i * 4 + 1]; blue += glow[i * 4 + 2]; }
  assert.ok(blue > red && red > green, 'violet and pink over indigo');
});

test('the blacklight glows in the idea’s palette, and graphite only tints its paper', () => {
  const size = 200, count = size * size;
  const print = new Uint8ClampedArray(count * 4).fill(236);
  const capture: Capture = { size, color: new Uint8ClampedArray(print), normal: new Uint8ClampedArray(count * 4), depth: new Uint8Array(count * 4), identity: new Uint8Array(count * 4), diffuse: new Uint8Array(count * 4), near: 0.1, far: 100, pixelWorldSize: 0.01, light: [0, 0, 1], baseColors: [] };
  const vacui = { fill: 'glyphs', grain: 'even', reach: 1, form: 'land', ink: 'blacklight', drip: false } as const;
  const sums = (pixels: Uint8ClampedArray) => {
    let red = 0, green = 0, blue = 0;
    for (let i = 0; i < count; i++) { red += pixels[i * 4]; green += pixels[i * 4 + 1]; blue += pixels[i * 4 + 2]; }
    return { red, green, blue };
  };
  const forest = sums(applyVacui(print, capture, vacui, 8, 0, { ink: 'lime', ground: 'forest', second: 'mint' }).pixels);
  assert.ok(forest.green > forest.red && forest.green > forest.blue, `lime on forest is green: ${JSON.stringify(forest)}`);
  const ember = sums(applyVacui(print, capture, vacui, 8, 0, { ink: 'amber', ground: 'rust', second: 'coral' }).pixels);
  assert.ok(ember.red > ember.green && ember.red > ember.blue, `amber on rust is warm: ${JSON.stringify(ember)}`);
  const plain = sums(applyVacui(print, capture, { ...vacui, ink: 'graphite' }, 8).pixels);
  const navy = sums(applyVacui(print, capture, { ...vacui, ink: 'graphite' }, 8, 0, { ink: 'magenta', ground: 'navy', second: 'lime' }).pixels);
  assert.ok(plain.red >= plain.blue, 'graphite paper is warm as made');
  assert.ok(navy.blue > navy.red, `a navy ground cools the paper: ${JSON.stringify(navy)}`);
  assert.ok(Math.abs(navy.green - plain.green) < plain.green * 0.15, 'the pencil keeps its tone');
});
