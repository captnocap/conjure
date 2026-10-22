// Replay a saved generation exactly, with extra pins, and keep its print and series.
// node dev/replay-check.mjs <gallery-entry.json> <out-prefix> [extra pins as JSON]
// Every answer the entry recorded is pinned, so the mocked model only answers what the extra pins add.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const [entryPath, out, extra = '{}'] = process.argv.slice(2);
if (!entryPath || !out) throw new Error('usage: node dev/replay-check.mjs <gallery-entry.json> <out-prefix> [pins]');
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
if (entry.presentation) {
  force['direction::presentation'] = entry.presentation.kind;
  if (entry.presentation.blend) force['direction::blend'] = entry.presentation.blend;
}
// Entries saved before accents existed, or without one, replay without one.
if (entry.accent) {
  force['direction::accent'] = entry.accent.region;
  force['direction::accentEdge'] = entry.accent.edge;
  force['direction::accentLook'] = entry.accent.id;
  for (const [key, value] of Object.entries(entry.accent.answers ?? {})) force[`${entry.accent.id}::${key}`] = value;
} else force['direction::accent'] = 'none';
// Entries saved before the otherworld pass replay without it.
if (entry.otherworld) {
  force['direction::rift'] = entry.otherworld.rift;
  force['direction::riftDepth'] = entry.otherworld.depth;
  force['direction::riftInk'] = entry.otherworld.ink;
} else force['direction::rift'] = 'none';
// Entries saved before the dead-space pass replay without it.
if (entry.vacui) {
  force['direction::vacui'] = entry.vacui.fill;
  force['direction::vacuiGrain'] = entry.vacui.grain;
  force['direction::vacuiReach'] = entry.vacui.reach;
  // Entries saved before forms, inks and drips replay with the landforms, the print's colours and no drips.
  force['direction::vacuiForm'] = entry.vacui.form ?? 'land';
  force['direction::vacuiInk'] = entry.vacui.ink ?? 'print';
  force['direction::vacuiDrip'] = entry.vacui.drip ?? false;
} else force['direction::vacui'] = 'none';
if (entry.camera) force['direction::loopCamera'] = entry.camera;
// The direction the entry followed. Entries saved before directions existed followed the Fifth World
// when they carry its finishes, and nothing in particular otherwise.
force['direction::house'] = entry.direction?.id ?? (entry.otherworld || entry.vacui ? 'directions/fifth-world' : 'directions/as-written');
force['direction::world'] = entry.world.id;
if (entry.look) force['direction::look'] = entry.look.id;
for (const owner of [entry.world, entry.look, ...(entry.cast ?? [])].filter(Boolean))
  for (const [key, value] of Object.entries(owner.answers ?? {})) force[`${owner.id}::${key}`] = value;
for (const member of entry.cast ?? []) force[`direction::cast:${member.id}`] = true;
for (const [key, value] of Object.entries(entry.design?.answers ?? {})) force[`design::${key}`] = value;
Object.assign(force, JSON.parse(extra));

const hash = (text) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const context = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  await context.route('**/@vite/client', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return {accept(){},dispose(){},on(){},data:{}}} export function injectQuery(url){return url} const styles=new Map(); export function updateStyle(id,css){let style=styles.get(id);if(!style){style=document.createElement("style");styles.set(id,style);document.head.append(style)}style.textContent=css} export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}' }));
  let gallery = null;
  await context.route('**/api/**', async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/status') return json({ configured: true, models: ['test/replay'], defaultModel: 'test/replay' });
    if (path === '/api/traces') return json([]);
    if (path === '/api/gallery' && request.method() === 'POST') { gallery = request.postDataJSON(); return json({ id: 'replay', day: '2026-01-01' }); }
    if (path !== '/api/decide') return json({ error: `unexpected ${path}` }, 500);
    const body = request.postDataJSON();
    const verdicts = body.questions.map((question) => {
      if (question.type === 'noul') {
        // Keep the saved cast in its saved order, so the hero is the same thing it was.
        const rank = (entry.cast ?? []).findIndex((member) => question.ask.toLowerCase().includes(member.id.split('/')[1].replace(/-/g, ' ')));
        return { type: 'noul', p: rank >= 0 ? 0.99 - rank * 0.04 : (hash(question.ask) % 60) / 100 };
      }
      if (question.type === 'score') { const top = question.levels.length - 1; return { type: 'score', value: 0.5, probabilities: question.levels.map((_, i) => (i === Math.round(top / 2) ? 0.6 : 0.4 / top)) }; }
      const keys = Object.keys(question.options), pick = keys[hash(question.ask) % keys.length];
      return { type: 'choice', probabilities: Object.fromEntries(keys.map((key) => [key, key === pick ? 0.7 : 0.3 / Math.max(1, keys.length - 1)])) };
    });
    return json({ model: 'test/replay', inputTokens: 1, costUsd: 0, verdicts });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/?idea=${encodeURIComponent(entry.idea)}&t=${entry.temperature ?? 0}&roll=${entry.roll ?? 0}&force=${encodeURIComponent(JSON.stringify(force))}`);
  await page.waitForFunction(() => ['conjure-ready', 'conjure-failed'].includes(document.title), null, { timeout: 300_000 });
  assert.equal(await page.title(), 'conjure-ready', await page.locator('#status').innerText());
  assert.deepEqual(errors, []);
  const notes = await page.evaluate(() => window.__conjure.notes);
  writeFileSync(`${out}.jpg`, Buffer.from(gallery.print.split(',')[1], 'base64'));
  if (gallery.series) writeFileSync(`${out}-series.jpg`, Buffer.from(gallery.series.split(',')[1], 'base64'));
  console.log(`replayed ${entry.idea}: ${notes.join(' | ')}`);
} finally {
  await browser.close();
}
