// Browser check: a traced picture cast into a scene as a real object, printed through several looks.
// node dev/trace-check.mjs <trace.json> [outdir]
// The decision model, the trace library and the gallery are all mocked: nothing is spent or saved.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const [tracePath, out = '.data/traces-check'] = process.argv.slice(2);
if (!tracePath) throw new Error('usage: node dev/trace-check.mjs <trace.json> [outdir]');
mkdirSync(out, { recursive: true });
const trace = JSON.parse(readFileSync(tracePath, 'utf8'));
const kept = trace.shapes.filter((shape) => !shape.background).sort((a, b) => b.d.length - a.d.length);
const summary = { id: trace.id, name: trace.name, width: trace.width, height: trace.height, createdAt: '2026-10-13T00:00:00Z', colours: kept.slice(0, 4).map((shape) => shape.fill), darkBackground: true, bytes: 1 };
const thing = `things/found-${trace.id}`;
const hash = (text) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

// PORTRAIT=1 prints portraits of the hero instead, one blend per look. SHEET=1 lays the trace over
// the print as a vector sheet instead of casting it, one treatment per look.
const portrait = !!process.env.PORTRAIT;
const sheet = !!process.env.SHEET;
const runs = (sheet ? [
  ['looks/watercolor-studio', 'ghost', 'centre'], ['looks/graphic-press', 'ink', 'right'],
  ['looks/photographic', 'lines', 'left'], ['looks/ukiyo-e', 'poster', 'corner'],
] : portrait ? [
  ['looks/watercolor-studio', 'standee', 'behind'], ['looks/plotter-pen', 'standee', 'inside'],
  ['looks/ukiyo-e', 'standee', 'over'], ['looks/photographic', 'standee', 'behind'],
] : [
  ['looks/photographic', 'standee'], ['looks/watercolor-studio', 'standee'], ['looks/plotter-pen', 'standee'],
  ['looks/ukiyo-e', 'relief'], ['looks/pencil-and-ink', 'decal'], ['looks/collage-studio', 'cutout'],
]).filter(([look]) => !process.env.ONLY || look.includes(process.env.ONLY));

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
try {
  for (const [look, mount, blend] of runs) {
    const context = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
    await context.route('**/@vite/client', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return {accept(){},dispose(){},on(){},data:{}}} export function injectQuery(url){return url} const styles=new Map(); export function updateStyle(id,css){let style=styles.get(id);if(!style){style=document.createElement("style");styles.set(id,style);document.head.append(style)}style.textContent=css} export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}' }));
    let gallery = null;
    await context.route('**/api/**', async (route) => {
      const request = route.request(), path = new URL(request.url()).pathname;
      const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (path === '/api/status') return json({ configured: true, models: ['test/traces'], defaultModel: 'test/traces' });
      if (path === '/api/traces') return json([summary]);
      if (path === `/api/traces/${trace.id}`) return json(trace);
      if (path === '/api/gallery' && request.method() === 'POST') { gallery = request.postDataJSON(); return json({ id: 'trace-qa', day: '2026-01-01' }); }
      if (path !== '/api/decide') return json({ error: `unexpected ${path}` }, 500);
      const body = request.postDataJSON();
      const verdicts = body.questions.map((question) => {
        if (question.type === 'noul') return { type: 'noul', p: question.ask.includes(trace.name) ? 0.95 : (hash(question.ask) % 60) / 100 };
        if (question.type === 'score') { const top = question.levels.length - 1; return { type: 'score', value: 0.5, probabilities: question.levels.map((_, i) => (i === Math.round(top / 2) ? 0.6 : 0.4 / top)) }; }
        const keys = Object.keys(question.options), pick = keys[hash(question.ask) % keys.length];
        return { type: 'choice', probabilities: Object.fromEntries(keys.map((key) => [key, key === pick ? 0.7 : 0.3 / Math.max(1, keys.length - 1)])) };
      });
      return json({ model: 'test/traces', inputTokens: 10, costUsd: 0, verdicts });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const force = {
      'direction::world': 'worlds/apartment-kitchen', 'direction::look': look, 'direction::density': 0.2,
      'direction::presentation': portrait ? 'portrait' : 'plate', ...(blend ? { 'direction::blend': blend } : {}),
      'direction::elevation': 0.45, 'direction::distance': 0.45, 'direction::level': 'level',
      ...(sheet ? { [`direction::cast:${thing}`]: false, 'design::traceSheet': trace.id, 'design::traceStyle': mount, 'design::traceSpot': blend, 'design::traceSize': 0.7, 'design::placement': 'all' } : {}),
      [`direction::cast:${thing}`]: !sheet, [`${thing}::mount`]: mount, [`${thing}::backdrop`]: false,
      [`${thing}::border`]: mount === 'standee' ? 'sticker' : 'none', [`${thing}::size`]: 0.55, [`${thing}::finish`]: 'card',
    };
    await page.goto(`${base}/?idea=${encodeURIComponent('two cats asleep in the kitchen')}&t=0&force=${encodeURIComponent(JSON.stringify(force))}`);
    await page.waitForFunction(() => ['conjure-ready', 'conjure-failed'].includes(document.title), null, { timeout: 240_000 });
    const status = await page.locator('#status').innerText();
    assert.equal(await page.title(), 'conjure-ready', status);
    const plan = await page.evaluate(() => ({ cast: window.__conjure.plan.cast.map((member) => member.entry.id), look: window.__conjure.plan.look?.entry.id, failed: window.__conjure.reports.filter((report) => report.error).map((report) => `${report.id}: ${report.error}`) }));
    if (sheet) {
      const layers = await page.evaluate(() => window.__conjure.plan.design.layers.map((layer) => layer.motif));
      assert.ok(layers.includes('trace'), `the trace joined the vector composition: ${layers.join(', ')}`);
      assert.ok(!plan.cast.includes(thing), 'and was not cast as a thing');
    } else assert.ok(plan.cast.includes(thing), `the traced picture was cast: ${plan.cast.join(', ')}`);
    assert.deepEqual(plan.failed, [], 'every component built');
    assert.deepEqual(errors, []);
    const name = `${sheet ? 'sheet-' : portrait ? 'portrait-' : ''}${look.split('/')[1]}-${sheet ? mount : blend ?? mount}`;
    writeFileSync(`${out}/${name}.jpg`, Buffer.from(gallery.print.split(',')[1], 'base64'));
    writeFileSync(`${out}/${name}-scene.jpg`, Buffer.from(gallery.scene.split(',')[1], 'base64'));
    results.push({ look, mount, cast: plan.cast });
    console.log(`pass ${look} ${mount}: cast ${plan.cast.length} (${plan.cast.join(', ')})`);
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
console.log(`${results.length} traced-picture scenes printed. Pictures in ${out}/.`);
