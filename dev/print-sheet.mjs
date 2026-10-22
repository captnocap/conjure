// Compare all ten Graphic press processes against one colourful source capture.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = '.data/expansion/previews';
mkdirSync(out, { recursive: true });
const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  let modelRequests = 0;
  await page.route('**/api/decide', (route) => { modelRequests++; return route.abort(); });
  await page.route('**/@vite/client', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return {accept(){},dispose(){},on(){},data:{}}} export function injectQuery(url){return url}' }));
  const query = new URLSearchParams({ offline: '', idea: 'A colourful all-night market at the end of the highway',
    world: 'worlds/gas-station-market', cast: 'things/market-shelf,things/drinks-fridge,things/cash-register', t: '1', roll: '2' });
  await page.goto(`${base}/?${query}`);
  await page.waitForFunction(() => document.title === 'conjure-ready', null, { timeout: 120_000 });
  const prints = await page.evaluate(async () => {
    const { Stage } = await import('/engine/stage.ts');
    const { seeded } = await import('/kit/index.ts');
    const { default: builder } = await import('/components/looks/graphic-press/build.ts');
    const stage = new Stage(document.createElement('canvas'));
    try {
      const plan = window.__conjure.plan;
      await stage.mount(plan);
      const capture = stage.capture();
      stage.renderer.setAnimationLoop(null);
      const pictures = [{ process: 'reference', image: stage.renderer.domElement.toDataURL('image/png') }];
      for (const process of Object.keys(builder.questions.process.options)) {
        const answers = { ...plan.look.answers, process, palette: 'harbour', paper: 'cream', linework: 'cross',
          detail: 'medium', contrast: 0.35, grain: 0.2, contours: 0.6, registration: 'clean' };
        const context = { idea: plan.idea, mood: plan.mood, scale: plan.scale, seed: 113, random: seeded(113) };
        const result = await builder.apply(capture, answers, context, AbortSignal.timeout(30_000));
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 720;
        canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(result.pixels), 720, 720), 0, 0);
        pictures.push({ process, image: canvas.toDataURL('image/png') });
      }
      return pictures;
    } finally { stage.unmount(); stage.renderer.setAnimationLoop(null); stage.renderer.dispose(); }
  });
  assert.equal(prints.length, 11);
  assert.equal(new Set(prints.map((print) => print.image)).size, 11);
  assert.equal(modelRequests, 0);
  for (const print of prints) writeFileSync(`${out}/process-${print.process}.png`, Buffer.from(print.image.split(',')[1], 'base64'));
  console.log('All ten processes are distinct on the colourful market source. No model requests.');
} finally { await browser.close(); }
