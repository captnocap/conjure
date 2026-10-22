import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Capture } from '../kit/contract';
import { createSvgLayer, generateSvg, rasterizeSvg, SVG_MOTIFS, type SvgLayer } from '../src/svg';

function captureIdentity(rows: number[][]): Capture {
  const size = rows.length, identity = new Uint8Array(size * size * 4);
  rows.flat().forEach((id, index) => { identity[index * 4] = id; });
  return { size, identity } as Capture;
}

test('each vector system repeats its geometry and changes when rerolled', () => {
  const geometry = (svg: string) => svg.replace(/conjure-\d+/g, 'conjure-id').replace(/data-layer="[^"]+"/g, '');
  const shapes = new Set<string>();
  for (const { id } of SVG_MOTIFS) {
    const layer = Object.freeze(createSvgLayer(id, 73));
    const first = generateSvg(720, [layer]);
    assert.equal(first, generateSvg(720, [layer]), id);
    assert.notEqual(geometry(first), geometry(generateSvg(720, [{ ...layer, seed: 74 }])), `${id} must reroll actual marks`);
    assert.match(first, new RegExp(`data-motif="${id}"`));
    assert.ok(!/<(?:image|script|foreignObject|filter)\b|(?:href|onload|onerror)=/i.test(first), `${id} must be portable vectors`);
    assert.ok(!/NaN|Infinity/.test(first), id);
    shapes.add(geometry(first));
  }
  assert.equal(shapes.size, SVG_MOTIFS.length);
});

test('distressed motifs keep distinct editable structures and preserve negative space', () => {
  const make = (motif: 'interference' | 'fracture' | 'halftone', density = 1) => generateSvg(720, [{ ...createSvgLayer(motif, 97), density }]);
  const interference = make('interference'), fracture = make('fracture'), halftone = make('halftone');
  assert.match(interference, /data-vector-part="raster"/);
  assert.match(interference, /data-vector-part="phosphor"/);
  assert.match(interference, /<rect [^>]+width="[1-4]\.\d+"/, 'phosphor damage uses small isolated blocks');
  const scanline = interference.match(/<path d="([^"]+)"/)![1];
  assert.ok((scanline.match(/M/g) ?? []).length > 2, 'broken scanlines must contain actual transparent gaps');
  assert.match(fracture, /data-vector-part="faults"/);
  assert.match(fracture, /data-vector-part="shards"/);
  assert.match(fracture, /<path d="M[^"]+C/, 'the leading crust boundaries flow continuously');
  assert.match(fracture, /<path d="M[^"]+A/, 'open stress arcs accompany the branches');
  const shards = fracture.split('data-vector-part="shards"')[1];
  assert.ok((shards.match(/<path /g) ?? []).length <= 3, 'shards remain sparse, never a field of stickers');
  assert.match(halftone, /data-vector-part="screen"/);
  assert.match(halftone, /data-vector-part="grit"/);
  const radii = [...halftone.matchAll(/<circle [^>]+r="([^"]+)"/g)].map((match) => Number(match[1]));
  assert.ok(radii.length > 100 && new Set(radii).size > 20, 'the distressed screen has genuine spatial dot-size variation');
  assert.ok(Math.max(...radii) <= 1.35, 'fine damaged ink must not grow into large polka dots');
  assert.match(halftone, /<path d="M[^"]+A[^"]+L[^"]+Z"/, 'chipped dots expose paper through absent ink');
  for (const motif of ['interference', 'fracture', 'halftone'] as const) {
    const low = make(motif, 0), high = make(motif, 1);
    assert.ok((high.match(/<(?:path|circle|rect) /g) ?? []).length > (low.match(/<(?:path|circle|rect) /g) ?? []).length, `${motif} density changes real geometry`);
    assert.ok(!/<rect[^>]+(?:width="720"|height="720")/.test(high), `${motif} cannot cover the scene with an opaque full-frame plate`);
  }
});

test('distressed motifs stay bounded and portable at extreme settings and seeds', () => {
  for (const motif of ['interference', 'fracture', 'halftone'] as const) for (const seed of [0, 73, 4294967295]) {
    const svg = generateSvg(720, [{ ...createSvgLayer(motif, seed), density: 1e100, scale: 1e100, rotation: -1e100, color: 'url(https://invalid.test)' }]);
    assert.ok(svg.length < 230_000, `${motif}/${seed} is ${svg.length} bytes`);
    assert.ok((svg.match(/<(?:path|circle|rect) /g) ?? []).length < 2500, `${motif}/${seed} stays within its mark budget`);
    assert.ok(!/NaN|Infinity|https:|<image|<script|foreignObject/.test(svg));
    assert.match(svg, /scale\(2.4\)/);
  }
});

test('exports preserve named layer order, visibility, transparency and separate transforms', () => {
  const back = { ...createSvgLayer('topography', 1), id: 'terrain', opacity: 0.4 };
  const front = { ...createSvgLayer('botanical', 2), id: 'leaves', rotation: 33, scale: 1.5, blend: 'multiply' as const };
  const svg = generateSvg(1440, [back, { ...back, id: 'hidden', visible: false }, front, { ...back, id: 'invisible', opacity: 0 }]);
  assert.match(svg, /width="1440" height="1440" viewBox="0 0 720 720" fill="none"/);
  assert.ok(svg.indexOf('data-layer="terrain"') < svg.indexOf('data-layer="leaves"'));
  assert.ok(!svg.includes('data-layer="hidden"') && !svg.includes('data-layer="invisible"'));
  assert.match(svg, /opacity="0.4"/);
  assert.match(svg, /mix-blend-mode:multiply/);
  assert.match(svg, /rotate\(33\) scale\(1.5\)/);
  assert.equal((svg.match(/data-layer=/g) ?? []).length, 2);
  assert.ok(!/<rect[^>]+(?:width="720"|height="720")/.test(svg), 'no opaque full-frame background');
});

test('layer metadata and paint cannot inject SVG markup or external references', () => {
  const layer = {
    ...createSvgLayer('collage', 2),
    id: '"/><script>alert(1)</script>&\u0000',
    color: 'url(https://example.invalid/tracker.svg)', accent: '#fff" onload="alert(1)',
    blend: 'normal;filter:url(https://example.invalid)' as SvgLayer['blend'],
    placement: 'all" onclick="alert(1)' as SvgLayer['placement'],
    motif: '<script>oops</script>' as SvgLayer['motif'],
  };
  const svg = generateSvg(720, [layer]);
  assert.match(svg, /data-layer="&quot;\/&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;&amp;"/);
  assert.ok(!svg.includes('<script') && !svg.includes('example.invalid') && !svg.includes('onload=') && !svg.includes('onclick='));
  assert.match(svg, /data-motif="topography"/);
  assert.match(svg, /stroke="#264c65"/);
  assert.match(svg, /stroke="#d89257"/);
});

test('numeric extremes are finite and geometry, dimensions and layer count are bounded', () => {
  const layer = { ...createSvgLayer('stipple', Infinity), density: 1e100, rotation: Infinity, scale: -1e100, opacity: NaN };
  const svg = generateSvg(1e100, Array.from({ length: 100 }, () => layer));
  assert.match(svg, /width="4096" height="4096"/);
  assert.match(svg, /rotate\(0\) scale\(0.35\)/);
  assert.ok(!/NaN|Infinity/.test(svg));
  assert.equal((svg.match(/data-layer=/g) ?? []).length, 24);
  assert.equal((svg.match(/<circle /g) ?? []).length, 24 * 900);
  assert.ok(svg.length < 2_500_000, `${svg.length} bytes`);
  assert.match(generateSvg(-20, []), /width="1" height="1"/);
  assert.match(generateSvg(NaN, []), /width="720" height="720"/);
});

test('subject and background clips follow captured identities and remain outside layer transforms', () => {
  const capture = captureIdentity([
    [0, 0, 1, 1],
    [0, 2, 7, 1],
    [0, 2, 7, 1],
    [0, 0, 1, 1],
  ]);
  const layer = { ...createSvgLayer('collage', 8), placement: 'subject' as const, rotation: 35 };
  const svg = generateSvg(720, [layer, { ...layer, id: 'back', placement: 'background' }], capture);
  assert.match(svg, /-subject" clipPathUnits="userSpaceOnUse"><path d="M180 180h360v360h-360Z"/);
  assert.match(svg, /-background" clipPathUnits="userSpaceOnUse"><path d="M0 0H720V720H0ZM180 180h360v360h-360Z" clip-rule="evenodd"/);
  assert.match(svg, /clip-path="url\(#[^)]+-subject\)"><title>[^<]+<\/title><g transform="[^"]+rotate\(35\)/);
  const empty = generateSvg(720, [layer], captureIdentity([[0, 1], [1, 0]]));
  assert.match(empty, /-subject" clipPathUnits="userSpaceOnUse"><path d=""/);
  assert.notEqual(svg, generateSvg(720, [layer], captureIdentity([[2, 2], [2, 2]])));
});

test('capture clipping falls back to the full frame only when capture is missing or invalid', () => {
  const layer = { ...createSvgLayer('orbital', 8), placement: 'background' as const };
  const plain = generateSvg(720, [layer]);
  assert.ok(!plain.includes('clip-path'));
  assert.equal(plain, generateSvg(720, [layer], { size: 720, identity: new Uint8Array(4) } as Capture));
  assert.equal(plain, generateSvg(720, [layer], { size: Infinity, identity: new Uint8Array(4) } as Capture));
});

test('identity clipping stays compact even for a large uniform capture', () => {
  const identity = new Uint8Array(720 * 720 * 4);
  for (let index = 0; index < identity.length; index += 4) identity[index] = 2;
  const svg = generateSvg(720, [{ ...createSvgLayer('orbital', 4), placement: 'subject' }], { size: 720, identity } as Capture);
  assert.match(svg, /<path d="M0 0h720v720h-720Z"/);
  assert.ok(svg.length < 6000);
});

test('already cancelled rasterization fails before allocating browser resources', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(rasterizeSvg(generateSvg(32, []), 32, controller.signal), { name: 'AbortError' });
});

test('rasterization releases the image and object URL on success, failure and cancellation', async (context) => {
  let revoked = 0, allocated = 0, image: FakeImage | undefined;
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    src = '';
    constructor() { image = this; }
  }
  const pixels = new Uint8ClampedArray(16);
  context.mock.method(URL, 'createObjectURL', () => { allocated++; return 'blob:test'; });
  context.mock.method(URL, 'revokeObjectURL', (url: string) => { assert.equal(url, 'blob:test'); revoked++; });
  const previousImage = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'Image', { value: FakeImage, configurable: true });
  Object.defineProperty(globalThis, 'document', { value: { createElement: () => ({ getContext: () => ({ drawImage() {}, getImageData: () => ({ data: pixels }) }) }) }, configurable: true });
  try {
    const success = rasterizeSvg('<svg/>', 2, new AbortController().signal);
    image!.onload!();
    assert.equal(await success, pixels);
    assert.equal(image!.src, '');
    assert.equal(image!.onload, null);
    const failure = rasterizeSvg('<svg/>', 2, new AbortController().signal);
    image!.onerror!();
    await assert.rejects(failure, /could not be rasterized/);
    const controller = new AbortController();
    const cancelled = rasterizeSvg('<svg/>', 2, controller.signal);
    controller.abort();
    await assert.rejects(cancelled, { name: 'AbortError' });
    assert.equal(image!.src, '');
    assert.equal(image!.onerror, null);
    Object.defineProperty(globalThis, 'Image', { value: class { constructor() { throw new Error('Image unavailable'); } }, configurable: true });
    await assert.rejects(rasterizeSvg('<svg/>', 2, new AbortController().signal), /Image unavailable/);
    assert.equal(allocated, 4);
    assert.equal(revoked, allocated);
  } finally {
    if (previousImage) Object.defineProperty(globalThis, 'Image', previousImage);
    else Reflect.deleteProperty(globalThis, 'Image');
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
