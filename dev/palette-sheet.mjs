// A look under the picture's palette: one row per option of the look's colour question, one column
// with no palette (as the look was made) and one per test palette. No model requests.
//   node dev/palette-sheet.mjs looks/xerox-noir inks
//   node dev/palette-sheet.mjs looks/blueprint stock --set linework=fine,contrast=0.6
//   node dev/palette-sheet.mjs looks/xerox-noir          (no question: one row of the default answers)
// Needs the dev server (npm run dev). Sheets go to .data/palettes/<look>.png.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const setAt = args.indexOf('--set');
const set = setAt >= 0 ? Object.fromEntries(args.splice(setAt, 2)[1].split(',').map((pair) => {
  const [key, value] = pair.split('=');
  return [key, value === 'true' ? true : value === 'false' ? false : Number.isFinite(Number(value)) ? Number(value) : value];
})) : {};
const [id, question] = args;
if (!id?.startsWith('looks/')) throw new Error('Name a look: node dev/palette-sheet.mjs looks/<name> [question] [--set key=value,…]');
const PALETTES = [
  null,
  { ink: 'lime', ground: 'forest', second: 'mint' },
  { ink: 'turquoise', ground: 'navy', second: 'coral' },
  { ink: 'amber', ground: 'charcoal', second: 'magenta' },
  { ink: 'pink', ground: 'cream', second: 'teal' },
  { ink: 'grey', ground: 'white', second: 'rust' },
];

const out = '.data/palettes';
mkdirSync(out, { recursive: true });
const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  let modelRequests = 0;
  await page.route('**/api/decide', (route) => { modelRequests++; return route.abort(); });
  // A sheet is not a generation to keep: answer the page's save instead of filling the gallery.
  await page.route('**/api/gallery', (route) => route.request().method() === 'POST' ? route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'sheet', day: '2026-01-01' }) }) : route.fallback());
  await page.route('**/api/gallery/entry/*/*/window', (route) => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await page.route('**/@vite/client', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return {accept(){},dispose(){},on(){},data:{}}} export function injectQuery(url){return url}' }));
  const query = new URLSearchParams({ offline: '', idea: 'A colourful all-night market at the end of the highway',
    world: 'worlds/gas-station-market', cast: 'things/market-shelf,things/drinks-fridge,things/cash-register', t: '1', roll: '2' });
  await page.goto(`${base}/?${query}`);
  await page.waitForFunction(() => document.title === 'conjure-ready', null, { timeout: 120_000 });
  const sheet = await page.evaluate(async ({ id, question, set, palettes }) => {
    const { Stage } = await import('/engine/stage.ts');
    const { seeded } = await import('/kit/index.ts');
    const { default: builder } = await import(`/components/${id}/build.ts`);
    const stage = new Stage(document.createElement('canvas'));
    try {
      const plan = window.__conjure.plan;
      await stage.mount(plan);
      const capture = stage.capture();
      stage.renderer.setAnimationLoop(null);
      const defaults = Object.fromEntries(Object.entries(builder.questions).map(([name, q]) =>
        [name, q.type === 'choice' ? Object.keys(q.options)[0] : q.type === 'score' ? 0.5 : false]));
      const rows = question ? Object.keys(builder.questions[question].options) : [null];
      const tile = 240, label = 18;
      const canvas = document.createElement('canvas');
      canvas.width = tile * palettes.length; canvas.height = (tile + label) * rows.length;
      const g = canvas.getContext('2d');
      g.fillStyle = '#111'; g.fillRect(0, 0, canvas.width, canvas.height);
      g.font = '12px sans-serif';
      const failures = [];
      for (const [r, option] of rows.entries()) {
        const answers = { ...defaults, ...set, ...(question ? { [question]: option } : {}) };
        for (const [c, palette] of palettes.entries()) {
          const context = { idea: plan.idea, mood: plan.mood, scale: plan.scale, seed: 113, random: seeded(113), ...(palette ? { palette } : {}) };
          try {
            const result = await builder.apply(capture, answers, context, AbortSignal.timeout(60_000));
            const print = document.createElement('canvas'); print.width = print.height = capture.size;
            print.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(result.pixels), capture.size, capture.size), 0, 0);
            g.drawImage(print, c * tile, r * (tile + label) + label, tile, tile);
          } catch (error) { failures.push(`${option ?? 'default'} × ${palette ? palette.ink : 'none'}: ${error.message}`); }
          g.fillStyle = '#eee';
          g.fillText(`${option ?? 'default'} · ${palette ? `${palette.ink}/${palette.ground}/${palette.second}` : 'as made'}`, c * tile + 4, r * (tile + label) + 13);
        }
      }
      return { image: canvas.toDataURL('image/png'), failures };
    } finally { stage.unmount(); stage.renderer.setAnimationLoop(null); stage.renderer.dispose(); }
  }, { id, question, set, palettes: PALETTES });
  const file = `${out}/${id.slice('looks/'.length)}.png`;
  writeFileSync(file, Buffer.from(sheet.image.split(',')[1], 'base64'));
  if (sheet.failures.length) { console.error(sheet.failures.join('\n')); process.exitCode = 1; }
  console.log(`${file}${modelRequests ? ` (${modelRequests} model requests blocked)` : ''}`);
} finally { await browser.close(); }
