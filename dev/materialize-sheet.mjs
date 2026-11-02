// One scene through every material and several looks: the hero dressed in each material in turn
// (and, on the last rows, a glitter and a velvet backdrop), printed by each look with the materialize
// pass at full weight, so a material can be judged in every medium at once. No model requests.
//   node dev/materialize-sheet.mjs                                  (teapot on a plinth, five looks)
//   node dev/materialize-sheet.mjs --looks looks/stained-glass,looks/plotter-pen
//   node dev/materialize-sheet.mjs --world worlds/plinth --cast things/teapot --idea 'a teapot' --name teapot
//   node dev/materialize-sheet.mjs --whole      (the whole frame in each tile instead of a zoom on the hero)
// Needs the dev server (npm run dev). Sheets go to .data/materials/<name>.png.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : fallback; };
const looks = option('--looks', 'looks/photographic,looks/watercolor-studio,looks/xerox-noir,looks/stained-glass,looks/plotter-pen').split(',');
const world = option('--world', 'worlds/plinth');
const cast = option('--cast', 'things/teapot');
const idea = option('--idea', 'a teapot on a plinth');
const name = option('--name', cast.split('/').pop());
const whole = args.includes('--whole');
const out = '.data/materials';
mkdirSync(out, { recursive: true });
const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  let modelRequests = 0;
  await page.route('**/api/decide', (route) => { modelRequests++; return route.abort(); });
  await page.route('**/@vite/client', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return {accept(){},dispose(){},on(){},data:{}}} export function injectQuery(url){return url}' }));
  page.on('pageerror', (error) => console.error(`[pageerror] ${String(error.stack ?? error).slice(0, 600)}`));
  // Every material and colour question pinned as made, so the only dressing is the sheet's own.
  const force = { 'direction::materialize': 1, 'direction::accent': 'none', 'direction::presentation': 'plate', 'direction::house': 'directions/as-written' };
  for (const owner of [world, ...cast.split(',')]) for (const key of ['materialBody', 'materialSky', 'paintBody', 'paintTrim', 'paintLight', 'paintSky']) force[`${owner}::${key}`] = 'as-made';
  const query = new URLSearchParams({ offline: '', idea, world, cast, t: '0', roll: '1', force: JSON.stringify(force) });
  await page.goto(`${base}/?${query}`);
  await page.waitForFunction(() => document.title === 'conjure-ready', null, { timeout: 120_000 });
  const sheet = await page.evaluate(async ({ looks, whole }) => {
    const { Stage } = await import('/engine/stage.ts');
    const { entryOf, loadBuilder } = await import('/engine/catalogue.ts');
    const { MATERIAL_NAMES } = await import('/kit/index.ts');
    const stage = new Stage(document.createElement('canvas'));
    const rows = [...MATERIAL_NAMES.map((name) => ({ name, body: name })), { name: 'as made', body: undefined }, { name: 'glitter backdrop', body: undefined, sky: 'glitter' }, { name: 'velvet backdrop', body: undefined, sky: 'velvet' }];
    const tile = 300, label = 18;
    const canvas = document.createElement('canvas');
    canvas.width = tile * looks.length; canvas.height = (tile + label) * rows.length;
    const g = canvas.getContext('2d');
    g.fillStyle = '#111'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.font = '12px sans-serif';
    const failures = [], notes = {};
    try {
      const base = window.__conjure.plan;
      const builders = await Promise.all(looks.map((id) => loadBuilder(entryOf(id))));
      for (const [r, row] of rows.entries()) {
        const plan = { ...base, otherworld: undefined, vacui: undefined, accent: undefined, materialize: { weight: 1 },
          world: { ...base.world, material: row.sky ? { sky: row.sky } : undefined },
          cast: base.cast.map((member, at) => (at === 0 && row.body ? { ...member, material: { body: row.body } } : { ...member, material: undefined })) };
        for (const [c, id] of looks.entries()) {
          const answers = Object.fromEntries(Object.entries(builders[c].questions).map(([key, q]) => [key, q.type === 'choice' ? Object.keys(q.options)[0] : q.type === 'score' ? 0.5 : false]));
          try {
            await stage.mount({ ...plan, look: { entry: entryOf(id), belongs: 1, answers } });
            await new Promise((resolve) => setTimeout(resolve, 250));
            const capture = stage.capture();
            const result = await stage.develop(AbortSignal.timeout(90_000), capture);
            const print = document.createElement('canvas'); print.width = print.height = 720;
            print.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(result.pixels), 720, 720), 0, 0);
            // Zoom on the hero: the square round its pixels, with a margin, so highlights and grain can be judged.
            let x0 = 720, y0 = 720, x1 = 0, y1 = 0;
            for (let i = 0; i < 720 * 720; i++) if (capture.identity[i * 4] >= 3) { const x = i % 720, y = (i / 720) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            const side = whole || x1 <= x0 ? 720 : Math.min(720, Math.max(x1 - x0, y1 - y0) * 1.3 + 40);
            const sx = whole || x1 <= x0 ? 0 : Math.max(0, Math.min(720 - side, (x0 + x1) / 2 - side / 2)), sy = whole || x1 <= x0 ? 0 : Math.max(0, Math.min(720 - side, (y0 + y1) / 2 - side / 2));
            g.drawImage(print, sx, sy, side, side, c * tile, r * (tile + label) + label, tile, tile);
            if (r === 0) notes[id] = result.notes.at(-1);
          } catch (error) { failures.push(`${row.name} × ${id}: ${error.message}`); }
          g.fillStyle = '#eee';
          g.fillText(`${row.name} · ${id.slice(6)}`, c * tile + 4, r * (tile + label) + 13);
        }
      }
    } finally { stage.unmount(); stage.renderer.setAnimationLoop(null); stage.renderer.dispose(); }
    return { image: canvas.toDataURL('image/png'), failures, notes };
  }, { looks, whole });
  const file = `${out}/${name}.png`;
  writeFileSync(file, Buffer.from(sheet.image.split(',')[1], 'base64'));
  for (const [id, note] of Object.entries(sheet.notes)) console.log(`${id}: ${note}`);
  if (sheet.failures.length) { console.error(sheet.failures.join('\n')); process.exitCode = 1; }
  console.log(`${file}${modelRequests ? ` (${modelRequests} model requests blocked)` : ''}`);
} finally { await browser.close(); }
