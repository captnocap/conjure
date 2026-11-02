// Sheets of the dead-space doodle sets, drawn straight from engine/doodles.ts: no browser, no model.
//   node --import tsx dev/doodle-sheet.mjs                     every set, one labelled tile per shape → .data/doodles/<set>.png
//   node --import tsx dev/doodle-sheet.mjs hieroglyphs ascii   only those sets
//   node --import tsx dev/doodle-sheet.mjs --fill [set …]      the live fill: a blank print grown with each set → .data/doodles/fill-<set>.png
//   node --import tsx dev/doodle-sheet.mjs --fill --size 400   a smaller live fill
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { DOODLE_SETS, DOODLE_SHAPES, doodleText } from '../engine/doodles.ts';
import { applyVacui } from '../engine/vacui.ts';

const args = process.argv.slice(2);
const fill = args.includes('--fill');
const sizeAt = args.indexOf('--size');
const size = sizeAt >= 0 ? Number(args.splice(sizeAt, 2)[1]) : 720;
const wanted = args.filter((arg) => !arg.startsWith('--'));
const sets = (wanted.length ? wanted : Object.keys(DOODLE_SETS)).filter((set) => fill ? set in DOODLE_SETS : set in DOODLE_SHAPES);
if (!sets.length) throw new Error(`Name a set: ${Object.keys(DOODLE_SETS).join(', ')}`);
const out = '.data/doodles';
mkdirSync(out, { recursive: true });

const PAPER = [241, 238, 230], INK = [42, 42, 46];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
/** The fill's own pen: full ink within a little over a pixel of the stroke, fading over the next. */
const pen = (distancePx, r) => clamp01(0.65 + 0.02 * r + 0.5 - distancePx);

function png(width, height, rgb) {
  const crcTable = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c; }
  const crc = (bytes) => { let c = -1; for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => {
    const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'ascii');
    const tail = Buffer.alloc(4); tail.writeUInt32BE(crc(Buffer.concat([Buffer.from(type, 'ascii'), data])), 0);
    return Buffer.concat([head, data, tail]);
  };
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 3 + 1)] = 0; rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

if (!fill) {
  const tile = 76, label = 14, columns = 8, r = 28;
  for (const set of sets) {
    const shapes = DOODLE_SHAPES[set];
    const rows = Math.ceil(shapes.length / columns);
    const width = tile * columns, height = (tile + label) * rows;
    const rgb = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const column = Math.floor(x / tile), row = Math.floor(y / (tile + label)), index = row * columns + column;
      const shape = shapes[index];
      let ink = 0;
      const ly = y - row * (tile + label);
      if (shape) {
        if (ly < tile) {
          const u = (x - column * tile - tile / 2 + 0.5) / r, v = (ly - tile / 2 + 0.5) / r;
          // Three variations per tile would hide the shape; one, at the cell's middle number.
          ink = pen(shape.draw(u, v, 0.37, r) * r, r);
          // A faint cell boundary at the live reach, so a shape that would spill past its cell shows.
          if (Math.abs(Math.hypot(u, v) - 1) < 0.02) ink = Math.max(ink, 0.12);
        } else ink = pen(doodleText(x - column * tile - 2, ly - tile - label / 2 + 0.5, shape.name, 0, 0, 4.2), 2.5) * 0.85;
      }
      const j = (y * width + x) * 3;
      for (let c = 0; c < 3; c++) rgb[j + c] = Math.round(PAPER[c] + (INK[c] - PAPER[c]) * ink);
    }
    writeFileSync(`${out}/${set}.png`, png(width, height, rgb));
    console.log(`${set}: ${shapes.length} shapes → ${out}/${set}.png`);
  }
} else {
  // A flat cream print with a dark hero and a lined floor, like the unit tests' scene, grown with each set.
  const count = size * size;
  const identity = new Uint8Array(count * 4), print = new Uint8ClampedArray(count * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, p = i * 4;
    let id = y > size * 0.8 ? 1 : 0;
    if (Math.hypot(x - size * 0.5, y - size * 0.55) < size * 0.14) id = 3;
    identity[p] = id;
    let rgb = PAPER;
    if (id === 1) rgb = (x + y) % 9 === 0 ? [60, 60, 70] : [200, 190, 170];
    if (id >= 3) rgb = [40, 34, 30];
    print.set([...rgb, 255], p);
  }
  const capture = { size, color: new Uint8ClampedArray(print), normal: new Uint8ClampedArray(count * 4), depth: new Uint8Array(count * 4), identity, diffuse: new Uint8Array(count * 4), near: 0.1, far: 100, pixelWorldSize: 0.01, light: [0, 0, 1], baseColors: [] };
  for (const set of sets) {
    const started = performance.now();
    const grown = applyVacui(print, capture, { fill: 'glyphs', grain: 'hug', reach: 1, form: 'land', ink: 'print', drip: false, doodles: set }, 11);
    const rgb = Buffer.alloc(count * 3);
    for (let i = 0; i < count; i++) { rgb[i * 3] = grown.pixels[i * 4]; rgb[i * 3 + 1] = grown.pixels[i * 4 + 1]; rgb[i * 3 + 2] = grown.pixels[i * 4 + 2]; }
    writeFileSync(`${out}/fill-${set}.png`, png(size, size, rgb));
    console.log(`${set} (${Math.round(performance.now() - started)} ms): ${grown.note} → ${out}/fill-${set}.png`);
  }
}
