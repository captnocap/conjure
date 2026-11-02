import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

const runtime = (file: string) => import(new URL(`../public/atelier/${file}.js`, import.meta.url).href);
const [whole, directional, plans, thread, quill, styleRuntime] = await Promise.all([
  runtime('wholetoning-core'), runtime('directional-color-core'), runtime('directional-color-plan'),
  runtime('continuous-thread'), runtime('quilled-paper'), runtime('styles'),
]);
const digest = (bytes: Uint8Array | Uint8ClampedArray | string) => createHash('sha256').update(bytes).digest('hex');

function graphOf(n: number, star = false) {
  const nodes = Array.from({ length: n }, (_, i) => ({ id: i, owner: i % 3, area: 1,
    meanRGB: [.1 + .7 * (i % 4) / 3, .2 + .6 * (i % 3) / 2, .3 + .4 * (i % 5) / 4] }));
  const counts = new Int32Array(256);
  nodes.forEach(r => counts[r.owner]++);
  const edges = Array.from({ length: n - 1 }, (_, i) => ({ a: star ? 0 : i, b: i + 1,
    length: 1, contrast: (i % 3 + 1) / 4, multiplier: 3 }));
  const adjacency: number[][] = nodes.map(() => []);
  edges.forEach((e, i) => { adjacency[e.a].push(i); adjacency[e.b].push(i); });
  return { nodes, counts, groups: 3, edges, adjacency, plainEdgeLength: edges.length,
    featureWeightedEdgeLength: edges.length * 3, totalArea: n };
}

test('Wholetoning preserves the original connected-block result when its search completes', () => {
  const result = whole.searchWholetoning(graphOf(12));
  assert.deepEqual([...result.labels], [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
  assert.equal(result.completedSweeps, 64);
  assert.equal(result.budgetExhausted, false);
  assert.equal(result.assignments, 12288);
  assert.equal(digest(JSON.stringify(result.sweepEnergy)), '809226e49002f2746663ad420652846f741b8fc16ce080792529fdc15198d9c8');
});

test('Wholetoning retains a valid improved solution on high-degree scenes within actual work budget', () => {
  const graph = graphOf(800, true);
  assert.ok(whole.estimateWholetoningWork(graph).adjacencyVisits > whole.MAX_ADJACENCY_VISITS);
  const initial = whole.wholetoningEnergy(whole.evaluateWholetoning(graph, whole.initialWholetoningLabels(graph)));
  const result = whole.searchWholetoning(graph, { maxAdjacencyVisits: 1_000_000 });
  assert.equal(result.labels.length, graph.nodes.length);
  assert.ok(result.completedBlocks > 0);
  assert.equal(result.budgetExhausted, true);
  assert.ok(result.adjacencyVisits <= result.maxAdjacencyVisits);
  const energy = whole.wholetoningEnergy(whole.evaluateWholetoning(graph, result.labels));
  assert.ok(energy <= initial + 1e-12);
  assert.ok(Math.abs(energy - result.components.energy) < 1e-12);
  assert.ok(result.sweepEnergy.every((e: number, i: number, a: number[]) => i === 0 || e <= a[i - 1] + 1e-12));
});

test('Wholetoning admits complex owner regions without merging distinct objects', () => {
  const size = 720, color = new Uint8Array(size * size * 4), identity = new Uint8Array(color.length);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const at = (y * size + x) * 4, owner = 2 + (Math.floor(x / 12) + Math.floor(y / 12)) % 2;
    color.set([owner === 2 ? 80 : 190, owner === 2 ? 80 : 190, owner === 2 ? 80 : 190, 255], at);
    identity[at] = owner; identity[at + 3] = 255;
  }
  const partition = whole.partitionWholetoning(color, identity);
  assert.equal(partition.graph.nodes.length, 3600);
  for (let i = 0; i < partition.pixels.length; i++)
    assert.equal(partition.graph.nodes[partition.pixels[i]].owner, identity[i * 4]);
});

test('Directional color preserves the original three-pass byte and Float64 output', () => {
  const cases = [
    [32, 40, '179b26a67ebdc8a237d0747a7d64e7c76836c419c927d4b50e44b4730c8035fe', '52e0337e18f3f640e54239dc776628a4947c483cfdf3ea552dc6f3ad44972f4a'],
    [64, 64, '097c9558fd8436dffe0bdde9a7aab13cbf6b7681c84e64fd767457236762fa20', '8192e6a1d43b2dafd5622b7626134ed733398eda14f75a23363caf2c5ab51c82'],
  ] as const;
  for (const [w, h, rgbaHash, floatHash] of cases) {
    const rgb = Uint8Array.from({ length: w * h * 3 }, (_, i) => w === 64 ? 127 :
      (Math.floor(i / 3) % w * 7 + Math.floor(i / (3 * w)) * 13 + i % 3 * 51) % 256);
    const result = directional.directionalCandidate(rgb, w, h);
    assert.equal(result.iterations.length, 3);
    assert.equal(digest(result.rgba), rgbaHash);
    assert.equal(digest(new Uint8Array(result.float64.buffer)), floatHash);
  }
});

test('Directional color cache reuses only exact source bytes and rejects stale replies', () => {
  const rgba = new Uint8Array(720 * 720 * 4).fill(128);
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
  const raw = { size: 720, color: rgba }, cache = plans.createDirectionalColorPlanCache();
  const expected = cache.preparation(raw);
  const packet = plans.compactDirectionalColorPlan({ outputRGBA: new Uint8Array(rgba) }, expected, rgba);
  cache.remember(raw, expected, packet);
  const reused = cache.preparation({ ...raw, color: new Uint8Array(rgba) });
  assert.ok(reused.plan);
  rgba[0]++;
  const changed = cache.preparation(raw);
  assert.ok(!changed.plan);
  assert.throws(() => cache.remember(raw, expected, packet), /Stale/);
  cache.dispose();
});

function imageFrame(size = 90) {
  const color = new Uint8Array(size * size * 4), identity = new Uint8Array(color.length),
    normal = new Uint8Array(color.length), depth = new Uint8Array(color.length);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const at = (y * size + x) * 4, inside = x > size * .2 && x < size * .8 && y > size * .18 && y < size * .82;
    color.set(inside ? [65 + x, 40 + y, 70, 255] : [240, 235, 220, 255], at);
    identity.set([inside ? 2 : 0, 0, 0, 255], at);
    normal.set([128, 128, 255, 255], at);
    depth.set([30, 0, 0, 255], at);
  }
  return styleRuntime.makeFrame({ size, color, identity, normal, depth, pixelWorldSize: 8.2 / size,
    baseColors: [[240, 235, 220], [180, 180, 180], [150, 80, 70]], near: .1, far: 100,
    metalnesses: [0, 0, 0], transmissions: [0, 0, 0] }, 7, .6);
}

test('Continuous thread solves a captured target without a geometry snapshot', () => {
  const frame = imageFrame();
  assert.equal(frame.geometrySnapshot(), null);
  const result = thread.prepareContinuousThread(frame);
  assert.ok(result.stats.accepted > 0);
  assert.ok(result.stats.finalError < result.stats.initialError);
  assert.equal(result.path.length, result.stats.accepted + 1);
  assert.ok(result.gains.every((gain: number) => gain > 0));
  assert.equal(thread.prepareContinuousThread(frame), result);
});

test('Upright paper renders actual side, top and shadow geometry from capture pixels alone', () => {
  const frame = imageFrame(180);
  assert.equal(frame.geometrySnapshot(), null);
  const plan = quill.prepareQuilledPaper(frame), rendered = quill.renderQuilledPaper(frame, plan);
  assert.equal(rendered.pixels.length, frame.w * frame.w * 4);
  assert.ok(rendered.stats.sidePixels > 0);
  assert.ok(rendered.stats.topPixels > 0);
  assert.ok(rendered.stats.shadowedWalls > 0);
  assert.ok(rendered.stats.backingPixels > 0);
  assert.equal(quill.prepareQuilledPaper(frame), plan);
});
