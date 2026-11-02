// Print one saved generation through every otherworld effect, everything else pinned as it was saved.
// node dev/otherworld-sheet.mjs <gallery-entry.json> <out-dir> [ink] [depth]
// node dev/otherworld-sheet.mjs <gallery-entry.json> <out-dir> --vacui [reach]
// node dev/otherworld-sheet.mjs <gallery-entry.json> <out-dir> --forms [reach] [fill]   (macro form × ink)
// node dev/otherworld-sheet.mjs <gallery-entry.json> <out-dir> --doodles [reach]       (the glyph fill with each doodle set)
// Writes <out-dir>/<variant>.jpg for each effect (the dead-space pass off), or with --vacui for each
// dead-space fill and grain (the otherworld off). The model is mocked; nothing is saved to the gallery.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const [entryPath, out, ink = 'own', depth = '0.5'] = process.argv.slice(2);
if (!entryPath || !out) throw new Error('usage: node dev/otherworld-sheet.mjs <gallery-entry.json> <out-dir> [ink] [depth]');
const RIFTS = ['plate', 'echo', 'tear', 'wireframe', 'portal', 'sky', 'trails', 'colossus'];
const vacuiMode = ink === '--vacui', formsMode = ink === '--forms', doodlesMode = ink === '--doodles';
// The doodle sets of engine/doodles.ts; the dead-space pass is pinned to machinery elsewhere on this sheet, as older pictures drew.
const DOODLE_SETS = ['machinery', 'hieroglyphs', 'ascii', 'anatomy', 'furniture', 'buildings', 'nature', 'gems', 'flowers', 'sacred', 'contours', 'fractals', 'fungi', 'notebook'];
const fillArg = process.argv[6] ?? 'glyphs';
const VARIANTS = doodlesMode
  ? DOODLE_SETS.map((set) => ({ name: `doodles-${set}`, pins: { 'direction::rift': 'none', 'direction::vacui': 'glyphs', 'direction::vacuiGrain': 'hug', 'direction::vacuiReach': Number(depth), 'direction::vacuiForm': 'land', 'direction::vacuiInk': 'print', 'direction::vacuiDrip': false, 'direction::vacuiDoodles': set } }))
  : formsMode
  ? ['land', 'skull', 'eye'].flatMap((form) => ['print', 'graphite', 'blacklight'].map((tint) => ({ name: `${form}-${tint}`, pins: { 'direction::rift': 'none', 'direction::vacui': fillArg, 'direction::vacuiGrain': 'hug', 'direction::vacuiReach': Number(depth), 'direction::vacuiForm': form, 'direction::vacuiInk': tint, 'direction::vacuiDrip': form === 'skull', 'direction::vacuiDoodles': 'machinery' } })))
  : vacuiMode
  ? ['tissue', 'terrain', 'lace', 'glyphs'].flatMap((fill) => ['hug', 'halo', 'even'].map((grain) => ({ name: `${fill}-${grain}`, pins: { 'direction::rift': 'none', 'direction::vacui': fill, 'direction::vacuiGrain': grain, 'direction::vacuiReach': Number(depth), 'direction::vacuiForm': 'land', 'direction::vacuiInk': 'print', 'direction::vacuiDrip': false, 'direction::vacuiDoodles': 'machinery' } })))
  : RIFTS.map((rift) => ({ name: rift, pins: { 'direction::vacui': 'none', 'direction::rift': rift, 'direction::riftDepth': Number(depth), 'direction::riftInk': ink } }));
const entry = JSON.parse(readFileSync(entryPath, 'utf8'));
const force = {};
for (const [key, value] of Object.entries(entry.mood ?? {})) force[`direction::${key}`] = value;
if (entry.framing) {
  force['direction::elevation'] = entry.framing.elevation;
  force['direction::distance'] = entry.framing.distance;
  force['direction::turn'] = (entry.framing.turn + 1) / 2;
  force['direction::anchor'] = entry.framing.anchor;
  force['direction::level'] = entry.framing.tilt ? 'tilted' : 'level';
}
// One plate each: a series or portrait would print every effect several times over.
force['direction::presentation'] = 'plate';
// The finishes belong to the Fifth World direction; the sheet prints every effect under it.
force['direction::house'] = 'directions/fifth-world';
if (entry.accent) {
  force['direction::accent'] = entry.accent.region;
  force['direction::accentEdge'] = entry.accent.edge;
  force['direction::accentLook'] = entry.accent.id;
  for (const [key, value] of Object.entries(entry.accent.answers ?? {})) force[`${entry.accent.id}::${key}`] = value;
} else force['direction::accent'] = 'none';
force['direction::world'] = entry.world.id;
if (entry.look) force['direction::look'] = entry.look.id;
for (const owner of [entry.world, entry.look, ...(entry.cast ?? [])].filter(Boolean))
  for (const [key, value] of Object.entries(owner.answers ?? {})) force[`${owner.id}::${key}`] = value;
for (const member of entry.cast ?? []) force[`direction::cast:${member.id}`] = true;
// Entries saved before materials were asked keep every surface as built; those saved before the
// materialize pass existed print flat, as they did.
if (!(entry.rulings ?? []).some((ruling) => ruling.name === 'materialBody' || ruling.name === 'materialSky')) {
  for (const name of ['materialBody', 'materialSky']) force[`${entry.world.id}::${name}`] = 'as-made';
  for (const member of entry.cast ?? []) force[`${member.id}::materialBody`] = 'as-made';
}
force['direction::materialize'] = entry.materialize ? entry.materialize.weight : 'none';

for (const [key, value] of Object.entries(entry.design?.answers ?? {})) force[`design::${key}`] = value;

const hash = (text) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const context = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  await context.route('**/@vite/client', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return {accept(){},dispose(){},on(){},data:{}}} export function injectQuery(url){return url} const styles=new Map(); export function updateStyle(id,css){let style=styles.get(id);if(!style){style=document.createElement("style");styles.set(id,style);document.head.append(style)}style.textContent=css} export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}' }));
  let gallery = null;
  await context.route('**/api/**', async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/status') return json({ configured: true, models: ['test/otherworld'], defaultModel: 'test/otherworld' });
    if (path === '/api/traces') return json([]);
    if (path === '/api/gallery' && request.method() === 'POST') { gallery = request.postDataJSON(); return json({ id: 'otherworld', day: '2026-01-01' }); }
    if (path !== '/api/decide') return json({ error: `unexpected ${path}` }, 500);
    const body = request.postDataJSON();
    const verdicts = body.questions.map((question) => {
      if (question.type === 'noul') {
        const rank = (entry.cast ?? []).findIndex((member) => question.ask.toLowerCase().includes(member.id.split('/')[1].replace(/-/g, ' ')));
        return { type: 'noul', p: rank >= 0 ? 0.99 - rank * 0.04 : (hash(question.ask) % 60) / 100 };
      }
      if (question.type === 'score') { const top = question.levels.length - 1; return { type: 'score', value: 0.5, probabilities: question.levels.map((_, i) => (i === Math.round(top / 2) ? 0.6 : 0.4 / top)) }; }
      const keys = Object.keys(question.options), pick = keys[hash(question.ask) % keys.length];
      return { type: 'choice', probabilities: Object.fromEntries(keys.map((key) => [key, key === pick ? 0.7 : 0.3 / Math.max(1, keys.length - 1)])) };
    });
    return json({ model: 'test/otherworld', inputTokens: 1, costUsd: 0, verdicts });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const { name: rift, pins: variant } of VARIANTS) {
    gallery = null;
    const pins = { ...force, ...variant };
    const started = Date.now();
    await page.goto(`${base}/?idea=${encodeURIComponent(entry.idea)}&t=${entry.temperature ?? 0}&roll=${entry.roll ?? 0}&force=${encodeURIComponent(JSON.stringify(pins))}`);
    await page.waitForFunction(() => ['conjure-ready', 'conjure-failed'].includes(document.title), null, { timeout: 300_000 });
    assert.equal(await page.title(), 'conjure-ready', await page.locator('#status').innerText());
    await page.waitForFunction(() => window.__conjure?.notes?.length >= 0);
    for (let wait = 0; !gallery && wait < 100; wait++) await new Promise((resolve) => setTimeout(resolve, 100));
    assert.ok(gallery?.print, `${rift}: the print reached the gallery`);
    const notes = await page.evaluate(() => window.__conjure.notes);
    writeFileSync(join(out, `${rift}.jpg`), Buffer.from(gallery.print.split(',')[1], 'base64'));
    console.log(`${rift} (${Date.now() - started} ms): ${notes.at(-1)}`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
