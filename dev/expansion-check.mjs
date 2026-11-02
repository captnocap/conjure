// Real browser checks for the scene library, seven scales, compositions and ten print processes.
// Uses only free catalogue studies; any attempted model request is intercepted and fails QA.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';

const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const out = '.data/expansion';
mkdirSync(`${out}/previews`, { recursive: true });
const scenes = [
  ['galaxy', 'Galaxies meeting in deep space', 'deep-space', ['galaxy', 'nebula', 'black-hole']],
  ['orbit', 'An orbital station around a ringed world', 'orbital-theatre', ['planet', 'space-station', 'satellite']],
  ['temple', 'The flooded temple at the edge of memory', 'flooded-temple', ['temple-gate', 'ancient-ruin', 'lotus-pond']],
  ['desert', 'A pyramid and mesas in a quiet desert basin', 'desert-basin', ['pyramid', 'mesa', 'cactus']],
  ['market', 'The snack aisle at three in the morning', 'gas-station-market', ['market-shelf', 'drinks-fridge', 'cash-register']],
  ['diner', 'An all-night diner still set for two', 'diner-interior', ['diner-booth', 'coffee-machine', 'cash-register']],
  ['kelp', 'A quiet clearing in a kelp forest', 'kelp-forest', ['seaweed', 'jellyfish', 'coral-colony']],
  ['dew', 'A dragonfly in the dew garden', 'dew-garden', ['dragonfly', 'butterfly', 'beetle']],
  ['desk', 'A small collection of treasures on a desk', 'worktable', ['record-player', 'bonsai', 'seashell']],
  ['lunar', 'The rover waits at a small lunar outpost', 'lunar-outpost', ['lunar-rover', 'radio-telescope', 'rocket']],
  ['books', 'A bookshop with one comfortable chair', 'bookshop', ['bookshelf', 'sofa', 'desk-lamp']],
  ['harbour', 'A harbour dock after the last ship leaves', 'harbour-dock', ['sailboat', 'cargo-crane', 'shipping-container']],
  ['molecules', 'A specimen of the smallest living structures', 'molecular-lab', ['dna-helix', 'pollen-grain']],
];

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const reports = [];
let modelRequests = 0;
try {
  const context = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  await context.route('**/@vite/client', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return {accept(){},dispose(){},on(){},data:{}}} export function injectQuery(url){return url}' }));
  await context.route('**/api/decide', async (route) => { modelRequests++; await route.abort(); });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/?offline`);
  await page.locator('#browse').click();
  assert.equal(await page.locator('.library-card').count(), 280);
  await page.locator('#library-scale').selectOption('cosmic');
  assert.equal(await page.locator('.library-card').count(), 40);
  await page.locator('#library-search').fill('black hole');
  assert.ok(await page.locator('.library-card').count() >= 1);
  await page.getByRole('button', { name: 'Use this idea' }).first().click();
  assert.match(await page.locator('#idea').inputValue(), /black hole/i);
  assert.equal(await page.locator('#library').evaluate((dialog) => dialog.open), false);
  await page.locator('#invent').click();
  const prompt = await page.locator('#idea').inputValue();
  assert.ok(prompt.length > 120 && prompt.length <= 600);

  await page.locator('#browse').click();
  await page.locator('#library-search').fill('gas pump');
  await page.locator('#library-scale').selectOption('');
  await page.locator('[data-library-tab="thing"]').click();
  assert.equal(await page.locator('.library-card').count(), 1);
  await page.getByRole('button', { name: 'Study this component' }).click();
  await page.waitForFunction(() => document.title === 'conjure-ready', null, { timeout: 90_000 });
  assert.match(await page.locator('#ledger').innerText(), /Catalogue study: free/);
  assert.deepEqual(await page.evaluate(() => window.__conjure.plan.cast.map((member) => member.entry.id)), ['things/gas-pump']);
  await page.locator('#first').click();
  await page.waitForFunction(() => !document.querySelector('#first').disabled, null, { timeout: 90_000 });
  const fingerprint = () => page.evaluate(() => {
    const plan = window.__conjure.plan;
    return JSON.stringify({ seed: plan.seed, mood: plan.mood,
      world: [plan.world.entry.id, plan.world.answers], look: [plan.look.entry.id, plan.look.answers],
      cast: plan.cast.map((member) => [member.entry.id, member.answers]), design: plan.design });
  });
  const mostLikely = await fingerprint();
  await page.locator('#first').click();
  await page.waitForFunction(() => !document.querySelector('#first').disabled, null, { timeout: 90_000 });
  assert.equal(await fingerprint(), mostLikely);
  const [download] = await Promise.all([
    page.waitForEvent('download'), page.locator('#save-picture').click(),
  ]);
  assert.match(download.suggestedFilename(), /print-roll-0\.png$/);
  await download.saveAs(`${out}/saved-study.png`);
  assert.ok(statSync(`${out}/saved-study.png`).size > 1000);
  await page.locator('#show-print').click();
  assert.equal(await page.locator('.frame').evaluate((frame) => frame.classList.contains('printed')), true);
  reports.push({ check: 'library-search-filter-study-first-choice-repeat-png-download', passed: true });

  for (const [id, idea, world, cast] of scenes) {
    const query = new URLSearchParams({ offline: '', idea, world: `worlds/${world}`, cast: cast.map((name) => `things/${name}`).join(','), t: '1', roll: '3' });
    await page.goto(`${base}/?${query}`);
    await page.waitForFunction(() => document.title.startsWith('conjure-'), null, { timeout: 90_000 });
    const scene = await page.evaluate(() => ({
      title: document.title, world: window.__conjure?.plan.world.entry.id,
      scale: window.__conjure?.plan.scale, reports: window.__conjure?.reports,
      cast: window.__conjure?.plan.cast.map((member) => member.entry.id), status: document.querySelector('#status').textContent,
    }));
    assert.equal(scene.title, 'conjure-ready', scene.status);
    assert.equal(scene.world, `worlds/${world}`);
    assert.equal(scene.reports.filter((report) => report.error).length, 0);
    assert.deepEqual(scene.cast, cast.map((name) => `things/${name}`), `${id} must keep its complete authored cast`);
    for (const name of ['stage', 'print']) {
      const image = await page.locator(`#${name}`).evaluate((canvas) => canvas.toDataURL('image/png'));
      writeFileSync(`${out}/previews/${id}-${name === 'stage' ? 'scene' : 'print'}.png`, Buffer.from(image.split(',')[1], 'base64'));
    }
    reports.push({ check: id, passed: true, ...scene });
    console.log(`pass scene ${id}: ${scene.cast.length} things in ${scene.scale}`);
  }

  // Reuse one actual multi-pass capture to inspect every graphic process on the same scene.
  const prints = await page.evaluate(async () => {
    const { Stage } = await import('/engine/stage.ts');
    const { seeded } = await import('/kit/index.ts');
    const { default: builder } = await import('/components/looks/graphic-press/build.ts');
    const canvas = document.createElement('canvas');
    const stage = new Stage(canvas);
    try {
      const plan = window.__conjure.plan;
      await stage.mount(plan);
      const capture = stage.capture();
      stage.renderer.setAnimationLoop(null);
      const context = { idea: plan.idea, mood: plan.mood, scale: plan.scale, seed: 113, random: seeded(113) };
      const results = [];
      for (const process of Object.keys(builder.questions.process.options)) {
        const answers = { ...plan.look.answers, process, palette: 'harbour', paper: 'cream', linework: 'cross', detail: 'medium', contrast: 0.55, grain: 0.25, contours: 0.65, registration: 'clean' };
        context.random = seeded(113);
        const result = await builder.apply(capture, answers, context, AbortSignal.timeout(15_000));
        if (result.pixels.length !== 720 * 720 * 4) throw new Error(`${process} returned wrong size`);
        const picture = document.createElement('canvas'); picture.width = picture.height = 720;
        picture.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(result.pixels), 720, 720), 0, 0);
        results.push({ process, image: picture.toDataURL('image/png'), notes: result.notes });
      }
      return results;
    } finally { stage.unmount(); stage.renderer.setAnimationLoop(null); stage.renderer.dispose(); }
  });
  for (const print of prints) writeFileSync(`${out}/previews/process-${print.process}.png`, Buffer.from(print.image.split(',')[1], 'base64'));
  assert.equal(prints.length, 10);
  assert.equal(new Set(reports.map((report) => report.scale).filter(Boolean)).size, 7, 'The compositions must exercise all seven scales');
  assert.equal(new Set(prints.map((print) => print.image)).size, 10);
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(modelRequests, 0, 'Offline QA attempted a model request');
  reports.push({ check: 'ten-distinct-graphic-processes', passed: true, processes: prints.map((print) => print.process) });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#browse').click();
  await page.locator('[data-library-tab="world"]').click();
  await page.locator('#library-search').fill('');
  await page.locator('#library-scale').selectOption('');
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#library').getBoundingClientRect().width <= innerWidth);
  assert.ok(fits, 'Mobile page or library overflows horizontally');
  await page.screenshot({ path: `${out}/library-mobile.png` });
  reports.push({ check: 'mobile-library', passed: true });
  await page.goto(`${base}/?idea=test&world=worlds/missing`);
  await page.waitForFunction(() => document.title === 'conjure-failed', null, { timeout: 30_000 });
  assert.match(await page.locator('#status').innerText(), /world is not in the catalogue/);
  assert.equal(modelRequests, 0, 'An invalid study URL entered the model path');
  reports.push({ check: 'invalid-study-world-never-asks-model', passed: true });
  writeFileSync(`${out}/browser-report.json`, JSON.stringify({ passed: true, modelRequests, reports }, null, 2) + '\n');
  console.log(`All ${reports.length} browser checks passed. No model requests. Images: ${out}/previews/.`);
} finally { await browser.close(); }
