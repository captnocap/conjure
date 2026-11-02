import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PAINT_NAMES } from '../kit/paint';
import { type Palette, oklch, paintRGB, rekey, rekeyOne } from '../kit/palette';
import { INK_CLEARANCE, PALETTE_NAMES, PALETTE_QUESTIONS, SECOND_CLEARANCE, paintDistance, paletteOf, settlePalette } from '../engine/palette';
import type { Verdict } from '../engine/oracle';
import type { Ruling } from '../engine/settle';
import { replayOf } from '../src/replay';

const TONER = { black: [21, 15, 22], low: [57, 38, 47], hot: [229, 57, 64], flash: [250, 161, 133], drift: [132, 126, 164] } as const;
const ROLES = { black: 'ground', low: 'ground', hot: 'ink', flash: 'ink', drift: 'second' } as const;
const hueGap = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

test('without a palette a look keeps its own inks', () => {
  assert.equal(rekey(TONER, undefined, ROLES), TONER);
});

test('every paint can key every role, and the result is valid RGB', () => {
  for (const ink of PAINT_NAMES) {
    const keyed = rekey(TONER, { ink, ground: ink === 'gold' ? 'black' : ink as Palette['ground'], second: ink }, ROLES);
    for (const colour of Object.values(keyed)) for (const channel of colour) assert.ok(Number.isInteger(channel) && channel >= 0 && channel <= 255, `${ink}: ${colour}`);
  }
});

test('the ink lands on the palette hue and the toner keeps its tonal design', () => {
  for (const ink of ['lime', 'teal', 'blue', 'amber', 'magenta'] as const) {
    const keyed = rekey(TONER, { ink, ground: 'black', second: 'lavender' }, ROLES);
    assert.ok(hueGap(oklch(keyed.hot)[2], oklch(paintRGB(ink))[2]) < 0.12, `${ink} hot ${keyed.hot}`);
    // Black stock stays black, the flash stays paler than the hot ink.
    assert.ok(oklch(keyed.black)[0] < 0.25, `${ink} black ${keyed.black}`);
    assert.ok(oklch(keyed.flash)[0] > oklch(keyed.hot)[0], `${ink} flash ${keyed.flash}`);
  }
});

test('a light ink is not printed muddy, and a grey one drains the colour', () => {
  const lime = rekey(TONER, { ink: 'lime', ground: 'black', second: 'grey' }, ROLES);
  assert.ok(oklch(lime.hot)[0] > oklch(TONER.hot)[0] + 0.05, `lime is lifted: ${lime.hot}`);
  const grey = rekey(TONER, { ink: 'grey', ground: 'black', second: 'grey' }, ROLES);
  assert.ok(oklch(grey.hot)[1] < 0.03 && oklch(grey.drift)[1] < 0.03, `grey drains: ${grey.hot} ${grey.drift}`);
});

test('a colourless preset takes a moderate tint, and a single colour can be re-keyed alone', () => {
  const tinted = rekeyOne([200, 200, 200], { ink: 'blue', ground: 'black', second: 'grey' }, 'ink');
  assert.ok(oklch(tinted)[1] > 0.03 && hueGap(oklch(tinted)[2], oklch(paintRGB('blue'))[2]) < 0.15, `${tinted}`);
});

test('the palette is asked in the shared paint names, and reads back with fallbacks', () => {
  assert.deepEqual(Object.keys(PALETTE_QUESTIONS.paletteInk.options), PAINT_NAMES);
  assert.ok(!('gold' in PALETTE_QUESTIONS.paletteGround.options), 'no metal ground');
  assert.deepEqual(PALETTE_NAMES, ['paletteGround', 'paletteInk', 'paletteSecond']);
  assert.deepEqual(paletteOf({ paletteInk: 'teal', paletteGround: 'cream', paletteSecond: 'rust' }), { ink: 'teal', ground: 'cream', second: 'rust' });
  assert.deepEqual(paletteOf({ paletteInk: 'nonsense' }), { ink: 'red', ground: 'black', second: 'lavender' });
});

test('a replay of a picture made before palettes pins the palette off; a newer one keeps its colours', () => {
  const old = replayOf({ idea: 'a lamp', world: { id: 'worlds/plinth' }, rulings: [{ owner: 'direction', name: 'cheer', picked: 'Neutral', confidence: 0.5, kind: 'score' }] });
  assert.equal(old.force['direction::palette'], 'none');
  const fresh = replayOf({ idea: 'a lamp', world: { id: 'worlds/plinth' }, rulings: [
    { owner: 'direction', name: 'paletteInk', picked: 'teal', confidence: 0.4, kind: 'choice' },
  ] });
  assert.equal(fresh.force['direction::palette'], undefined);
  assert.equal(fresh.force['direction::paletteInk'], 'teal');
});

/** The model's habit: the idea's one colour three times over. */
const monotone = (colour: string): Record<string, Verdict> => Object.fromEntries(['paletteGround', 'paletteInk', 'paletteSecond'].map((name) => [name, {
  type: 'choice', probabilities: Object.fromEntries(PAINT_NAMES.map((paint) => [paint, paint === colour ? 0.7 : paint === 'charcoal' ? 0.2 : 0.1 / (PAINT_NAMES.length - 2)])),
} as Verdict]));

test('the ink stands out from its ground and the second colour differs from both, on every roll', () => {
  for (const colour of ['black', 'white', 'magenta', 'navy'] as const) for (let roll = 0; roll < 8; roll++) {
    const rulings: Ruling[] = [];
    const palette = settlePalette(monotone(colour), 1, 1000 + roll, rulings, {}, { roll, seed: 7 });
    assert.ok(paintDistance(palette.ink, palette.ground) >= INK_CLEARANCE, `${colour} roll ${roll}: ${JSON.stringify(palette)}`);
    assert.ok(paintDistance(palette.second, palette.ink) >= SECOND_CLEARANCE && paintDistance(palette.second, palette.ground) >= SECOND_CLEARANCE, `${colour} roll ${roll}: ${JSON.stringify(palette)}`);
    assert.deepEqual(rulings.map((ruling) => ruling.name), ['paletteGround', 'paletteInk', 'paletteSecond']);
  }
});

test('the palette repeats for the same roll, rerolls move the ink, and a pinned clash holds', () => {
  const verdicts = monotone('black');
  const once = settlePalette(verdicts, 1, 5, [], {}, { roll: 2, seed: 9 });
  assert.deepEqual(settlePalette(verdicts, 1, 5, [], {}, { roll: 2, seed: 9 }), once);
  const inks = new Set(Array.from({ length: 6 }, (_, roll) => settlePalette(verdicts, 1, 5, [], {}, { roll, seed: 9 }).ink));
  assert.ok(inks.size >= 3, `rerolls tour the ink: ${[...inks]}`);
  assert.deepEqual(settlePalette(verdicts, 1, 5, [], { paletteGround: 'black', paletteInk: 'black' }, { roll: 0, seed: 9 }).ink, 'black');
});
