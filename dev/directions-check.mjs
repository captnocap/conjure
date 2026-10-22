// The direction tour, in a real browser against the live engine with a fully intercepted decision
// API: no paid calls, no gallery writes. Node 22: node --import tsx dev/directions-check.mjs
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { decideSchema } from '../server/decision-schema.ts';
import { BATCH_CHARACTERS } from '../engine/decision-limits.ts';
import { HOUSE_NOTE } from '../engine/art-direction.ts';

const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const model = 'test/directions';
const idea = 'A lighthouse keeper mending a net at dusk';
const phaseOf = (brief) => brief.includes('Choose the direction the whole picture will follow') ? 'house'
  : brief.startsWith('Choose the art medium separately') ? 'style'
  : brief.startsWith('Choose within the ') ? 'look'
  : brief.startsWith('Art-direct editable SVG') ? 'design'
  : brief.includes('These questions shape one part of the scene:') ? 'component'
  : brief.includes('Place each supporting thing in relation to it') ? 'relations'
  : brief.includes('Judge whether each thing belongs in that setting') ? 'shortlist' : 'routing';
const requests = [], errors = [], contractErrors = [], unexpectedApi = [], gallery = [], checks = [];
let directions = [], report;
mkdirSync('.data/layers', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

try {
  const context = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  await context.route('**/@vite/client', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return {accept(){},dispose(){},on(){},data:{}}} export function injectQuery(url){return url} const styles=new Map(); export function updateStyle(id,css){let style=styles.get(id);if(!style){style=document.createElement("style");styles.set(id,style);document.head.append(style)}style.textContent=css} export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}' }));
  await context.route('**/dev/directions-qa', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Direction tour</title>' }));
  await context.route('**/api/**', async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/status') return json({ configured: true, models: [model], defaultModel: model });
    if (path === '/api/traces' && request.method() === 'GET') return json([]);
    if (path === '/api/gallery' && request.method() === 'POST') { gallery.push(request.postDataJSON()); return json({ id: 'directions-qa', day: '2026-01-01' }); }
    if (path !== '/api/decide' || request.method() !== 'POST') { unexpectedApi.push(`${request.method()} ${path}`); return json({ error: 'Unexpected API request in direction check' }, 500); }
    const body = request.postDataJSON(), phase = phaseOf(body.brief);
    const planningCharacters = request.postData().length + body.questions.length * 24;
    requests.push({ index: requests.length, idea: body.idea, body, phase });
    const parsed = decideSchema.safeParse(body);
    if (!parsed.success || planningCharacters > BATCH_CHARACTERS) {
      contractErrors.push({ index: requests.length - 1, issues: parsed.success ? [] : parsed.error.issues, planningCharacters });
      return json({ error: 'Request violates the live API contract' }, 400);
    }
    const verdicts = body.questions.map((question) => {
      if (question.type === 'score') return { type: 'score', value: 0.5, probabilities: question.levels.map(() => 1 / question.levels.length) };
      if (question.type === 'noul') return { type: 'noul', p: 0.1 };
      const labels = Object.keys(question.options);
      // The direction: a clear favourite, two more plausible ones, and the rest below the exploring floor.
      if (phase === 'house') {
        const weights = labels.map((_, index) => index === 0 ? 0.5 : index === 1 ? 0.3 : index === 2 ? 0.15 : 0.05 / Math.max(1, labels.length - 3));
        return { type: 'choice', probabilities: Object.fromEntries(labels.map((label, index) => [label, weights[index]])) };
      }
      return { type: 'choice', probabilities: Object.fromEntries(labels.map((label, index) => [label, index === 0 ? 1 : 0])) };
    });
    return json({ model, inputTokens: body.questions.length * 7, costUsd: 0, verdicts });
  });

  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/dev/directions-qa`);
  directions = await page.evaluate(async ({ model }) => {
    const { Conjuring } = await import('/engine/director.ts');
    const { entriesOf, loadBuilder } = await import('/engine/catalogue.ts');
    const scenes = new Map();
    window.directionQA = {
      create(key, idea, options = {}) { scenes.set(key, new Conjuring(idea, { world: 'worlds/worktable', cast: ['things/teapot'], model, ...options })); },
      async plan(key, roll, force = {}, temperature = 1) {
        const plan = await scenes.get(key).plan({ roll, temperature, force });
        return { ...plan, world: { id: plan.world.entry.id }, cast: plan.cast.map((member) => member.entry.id), look: plan.look ? { id: plan.look.entry.id, title: plan.look.entry.title } : null, accent: undefined };
      },
    };
    const entries = entriesOf('direction');
    return Promise.all(entries.map(async (entry) => ({ id: entry.id, title: entry.title, summary: entry.summary, ...(await loadBuilder(entry)) })));
  }, { model });
  assert.ok(directions.length >= 3, 'the catalogue holds at least three directions');
  const byId = Object.fromEntries(directions.map((direction) => [direction.id, direction]));
  const offered = [...directions].sort((a, b) => a.id.localeCompare(b.id)).map(({ id }) => id);
  const create = (key, options) => page.evaluate(({ key, idea, options }) => window.directionQA.create(key, idea, options), { key, idea, options });
  const plan = (key, roll, force = {}, temperature = 1) => page.evaluate(({ key, roll, force, temperature }) => window.directionQA.plan(key, roll, force, temperature), { key, roll, force, temperature });
  const ruling = (current, name) => current.rulings.find((item) => item.owner === 'direction' && item.name === name);
  const of = (phase) => requests.filter((request) => request.idea === idea && request.phase === phase);
  const pass = (name, details = {}) => { checks.push({ name, passed: true, ...details }); console.log(`pass ${name}`); };

  await create('open');
  const first = await plan('open', 0, {}, 0);
  assert.equal(first.direction.entry.id, offered[0], 'first choices take the model’s favourite direction');
  assert.equal(ruling(first, 'house').picked, offered[0]);
  assert.notEqual(ruling(first, 'house').forced, true);
  assert.equal(of('house').length, 1, 'the direction is asked once');
  assert.ok(of('house')[0].index < of('routing')[0].index, 'and before routing');
  assert.deepEqual(Object.keys(of('house')[0].body.questions[0].options).sort(), offered, 'every direction is offered');
  assert.ok(!of('house')[0].body.brief.includes('Direction:'), 'under the base brief alone');
  pass('favourite-direction-first', { first: first.direction.entry.id });

  const tour = [];
  for (let roll = 0; roll < 6; roll++) tour.push(await plan('open', roll));
  const visited = tour.map((current) => current.direction.entry.id);
  for (let roll = 1; roll < visited.length; roll++) assert.notEqual(visited[roll], visited[roll - 1], 'no direction twice running');
  assert.deepEqual([...new Set(visited)].sort(), offered.slice(0, 3).sort(), 'rerolls tour the three plausible directions and leave the implausible ones out');
  assert.equal(of('house').length, 1, 'touring asks the direction question no more');
  for (const current of tour) {
    const direction = byId[current.direction.entry.id];
    assert.equal(ruling(current, 'house').note, HOUSE_NOTE);
    assert.deepEqual(current.direction.finishes, direction.finishes, 'the plan carries the direction’s finishes');
    assert.equal(!!current.otherworld, direction.finishes.includes('otherworld'), `${direction.id}: the otherworld pass follows the direction`);
    assert.equal(!!current.vacui, direction.finishes.includes('vacui'), `${direction.id}: the dead-space pass follows the direction`);
    assert.equal(!!ruling(current, 'rift'), direction.finishes.includes('otherworld'), 'the otherworld questions are only asked when the direction brings them');
    assert.equal(!!ruling(current, 'vacui'), direction.finishes.includes('vacui'));
    assert.ok(ruling(current, 'loopCamera'), 'the loop camera is asked under every direction');
    assert.equal(current.world.id, 'worlds/worktable');
    assert.ok(current.design.layers.length > 0);
  }
  for (const id of new Set(visited)) {
    const direction = byId[id];
    const under = (phase) => of(phase).filter(({ body }) => body.brief.includes(direction.brief));
    assert.equal(under('routing').length, 1, `${id}: routing is consulted once under its brief`);
    assert.equal(under('style').length, 1, `${id}: the medium is chosen once under its brief`);
    assert.ok(under('look').length >= 1, `${id}: looks are chosen under its brief`);
    assert.ok(of('design').some(({ body }) => body.brief.includes(direction.brief) || body.brief.includes(direction.note)), `${id}: the vector composition hears it`);
    const components = of('component').filter(({ body }) => body.brief.includes(direction.note) || body.brief.includes(direction.brief));
    assert.ok(components.length >= 2, `${id}: the world, the look and the cast hear it (${components.length})`);
    const looks = of('component').filter(({ body }) => body.brief.includes(direction.brief));
    assert.ok(looks.every(({ body }) => /one part of the scene: [^.]+\./.test(body.brief)), 'a look hears the full brief');
  }
  assert.ok(of('component').every(({ body }) => body.brief.includes('Direction:')), 'every component consultation is written under some direction');
  assert.ok(of('relations').every(({ body }) => !body.brief.includes('Direction:')), 'relations hear no direction');
  pass('rerolls-tour-plausible-directions-and-finishes-follow', { visited });

  const before = requests.length;
  const again = await plan('open', 0);
  assert.equal(requests.length, before, 'a repeated roll reuses every consultation');
  assert.deepEqual({ direction: again.direction, world: again.world, cast: again.cast, look: again.look, mood: again.mood, otherworld: again.otherworld ?? null, vacui: again.vacui ?? null, design: again.design },
    { direction: tour[0].direction, world: tour[0].world, cast: tour[0].cast, look: tour[0].look, mood: tour[0].mood, otherworld: tour[0].otherworld ?? null, vacui: tour[0].vacui ?? null, design: tour[0].design }, 'and lands on the same picture');
  pass('repeat-roll-is-cached-and-identical');

  const faint = offered.at(-1);
  const pinned = await plan('open', 7, { 'direction::house': faint });
  assert.equal(pinned.direction.entry.id, faint, 'a pinned direction holds, however implausible the model found it');
  assert.equal(ruling(pinned, 'house').forced, true);
  assert.deepEqual(pinned.direction.finishes, byId[faint].finishes);
  assert.equal(of('house').length, 1, 'pinning asks nothing more about the direction');
  pass('pinned-direction-holds', { pinned: faint });

  await create('plain', { offline: true, plain: true });
  const plain = await plan('plain', 0);
  assert.equal(plain.direction, undefined, 'a plain study follows no direction');
  assert.equal(ruling(plain, 'house'), undefined);
  assert.equal(plain.otherworld, undefined);
  assert.equal(plain.vacui, undefined);
  pass('plain-study-follows-no-direction');

  // The page: the tree names the direction, and the gallery record keeps it with its finishes.
  const fifth = directions.find(({ id }) => id === 'directions/fifth-world');
  const none = directions.find(({ id }) => id === 'directions/as-written');
  assert.ok(fifth && none, 'the shipped Fifth World and As written directions are present');
  const ready = async () => {
    await page.waitForFunction(() => ['conjure-ready', 'conjure-failed'].includes(document.title), null, { timeout: 120_000 });
    assert.equal(await page.title(), 'conjure-ready', await page.locator('#status').textContent());
    await page.waitForFunction(() => !document.querySelector('#first').disabled);
  };
  const open = (house) => page.goto(`${base}/?${new URLSearchParams({ idea: `${idea} on the page`, force: JSON.stringify({ 'direction::house': house, 'direction::world': 'worlds/worktable', 'direction::cast:things/teapot': true, 'direction::presentation': 'plate' }) })}`);
  await open(fifth.id);
  await ready();
  const shown = await page.evaluate(() => ({ direction: window.__conjure.plan.direction.entry.id, otherworld: !!window.__conjure.plan.otherworld, vacui: !!window.__conjure.plan.vacui, notes: window.__conjure.notes }));
  assert.equal(shown.direction, fifth.id);
  assert.ok(shown.otherworld && shown.vacui, 'the Fifth World prints with both finishing passes');
  const branch = page.locator('#tree > ul > li > details').filter({ has: page.locator('summary b', { hasText: fifth.title }) });
  assert.equal(await branch.count(), 1, 'the tree opens with the direction as its first branch');
  assert.match(await branch.locator('summary small').first().innerText(), /otherworld and vacui/);
  await page.locator('#tree > ul > li > details').first().locator(':scope > summary').click();
  const row = page.locator('[data-decision-key="direction::house"]');
  assert.equal(await row.count(), 1, 'the direction is one pinnable decision');
  assert.equal(await row.locator('button.pinned').count(), 1);
  for (let wait = 0; !gallery.length && wait < 100; wait++) await new Promise((resolve) => setTimeout(resolve, 100));
  assert.deepEqual(gallery.at(-1).record.direction, { id: fifth.id, finishes: [...fifth.finishes] }, 'the gallery record keeps the direction');
  assert.ok(gallery.at(-1).record.otherworld && gallery.at(-1).record.vacui);
  await page.locator('.frame').screenshot({ path: '.data/layers/direction-fifth-world.png' });
  // Branch to the direction that adds nothing: the finishes go with it.
  await row.locator('button.answer').filter({ has: page.locator('span', { hasText: none.title }) }).click();
  await ready();
  const plain2 = await page.evaluate(() => ({ direction: window.__conjure.plan.direction.entry.id, otherworld: !!window.__conjure.plan.otherworld, vacui: !!window.__conjure.plan.vacui }));
  assert.deepEqual(plain2, { direction: none.id, otherworld: false, vacui: false }, 'branching to As written drops both finishing passes');
  for (let wait = 0; gallery.length < 2 && wait < 100; wait++) await new Promise((resolve) => setTimeout(resolve, 100));
  assert.deepEqual(gallery.at(-1).record.direction, { id: none.id, finishes: [] });
  assert.equal(gallery.at(-1).record.otherworld, null);
  await page.locator('.frame').screenshot({ path: '.data/layers/direction-as-written.png' });
  pass('page-shows-and-records-the-direction', { gallerySaves: gallery.length });

  assert.deepEqual(contractErrors, []);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedApi, []);
  report = { passed: true, providerCalls: 0, directions: directions.map(({ id, finishes }) => ({ id, finishes })), checks, requests: requests.length };
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report = { passed: false, providerCalls: 0, error: error.stack ?? String(error), checks, requests: requests.length, contractErrors, errors, unexpectedApi };
  throw error;
} finally {
  writeFileSync('.data/layers/directions-browser.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
