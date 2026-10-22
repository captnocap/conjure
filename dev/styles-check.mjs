// Real browser/director integration with a fully intercepted decision API. No paid
// provider calls or gallery writes. Node 22: node --import tsx dev/styles-check.mjs
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { decideSchema } from '../server/decision-schema.ts';
import { BATCH_CHARACTERS } from '../engine/decision-limits.ts';

const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const model = 'test/style-integration';
const ideas = {
  open: 'A teapot waiting patiently for a visitor',
  requested: 'A teapot waiting for a visitor, rendered as N64 cartridge graphics',
  chosen: 'A teapot awaiting a visitor in the selected treatment',
  failed: 'A teapot whose style consultation fails during browser validation',
  ui: 'A teapot balanced between bright colour and patient geometry',
};
const phaseOf = (brief) => brief.startsWith('Choose the art medium separately') ? 'style'
  : brief.startsWith('Choose within the ') ? 'look'
  : brief.startsWith('Art-direct editable SVG') ? 'design'
  : brief.includes('These questions shape one part of the scene:') ? 'component' : 'routing';
const requests = [], errors = [], contractErrors = [], unexpectedApi = [], gallery = [], checks = [];
const active = new Map(), peaks = new Map();
let inventory = [], report, styleRejectedWithRoutingActive = false;
mkdirSync('.data/layers', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

try {
  const context = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  await context.route('**/@vite/client', route => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return {accept(){},dispose(){},on(){},data:{}}} export function injectQuery(url){return url} const styles=new Map(); export function updateStyle(id,css){let style=styles.get(id);if(!style){style=document.createElement("style");styles.set(id,style);document.head.append(style)}style.textContent=css} export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}' }));
  await context.route('**/dev/styles-qa', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Style integration</title>' }));
  await context.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/status') return json({ configured: true, models: [model], defaultModel: model });
    if (path === '/api/traces' && request.method() === 'GET') return json([]);
    if (path === '/api/gallery' && request.method() === 'POST') {
      gallery.push(request.postDataJSON());
      return json({ id: 'styles-qa' });
    }
    if (path !== '/api/decide' || request.method() !== 'POST') {
      unexpectedApi.push(`${request.method()} ${path}`);
      return json({ error: 'Unexpected API request in style check' }, 500);
    }
    const body = request.postDataJSON(), phase = phaseOf(body.brief);
    const planningCharacters = request.postData().length + body.questions.length * 24;
    const entry = { index: requests.length, body, phase, planningCharacters };
    requests.push(entry);
    const parsed = decideSchema.safeParse(body);
    if (!parsed.success || planningCharacters > BATCH_CHARACTERS) {
      contractErrors.push({ index: entry.index, issues: parsed.success ? [] : parsed.error.issues, planningCharacters });
      return json({ error: 'Request violates the live API contract' }, 400);
    }
    if (body.idea === ideas.failed && phase === 'style') {
      styleRejectedWithRoutingActive = [...active].some(([key, count]) => key.startsWith(`${body.idea}\0`) && count > 0);
      return json({ error: 'Intentional style failure for integration validation' }, 500);
    }
    const key = `${body.idea}\0${body.brief}`, running = (active.get(key) ?? 0) + 1;
    active.set(key, running); peaks.set(key, Math.max(running, peaks.get(key) ?? 0));
    await new Promise(resolve => setTimeout(resolve, 15));
    const requested = body.idea === ideas.requested;
    const designLook = phase === 'design' ? inventory.find(({ title }) => body.brief.includes(title)) : null;
    const designPalette = designLook?.medium === 'game' ? 'carnival' : designLook?.medium === 'print' ? 'acid' : 'editorial';
    const verdicts = body.questions.map(question => {
      if (question.type === 'score') return { type: 'score', value: 0.5, probabilities: question.levels.map((_, index) => index === 2 ? 1 : 0) };
      if (question.type === 'noul') return { type: 'noul', p: phase === 'style' ? requested ? 0.82 : 0.08 : 0.1 };
      const labels = Object.keys(question.options);
      let favored;
      if (phase === 'style') favored = requested ? 'game' : 'print';
      else if (phase === 'look' && requested) favored = 'looks/cartridge-64';
      else if (phase === 'design' && labels.includes('acid') && labels.includes('editorial')) favored = designPalette;
      else if (phase === 'design' && labels.includes('background')) favored = 'background';
      else favored = labels[0];
      // Nonzero alternatives exercise exploration and explicit-intent constraints;
      // an exact one-hot mock would conceal accidental rerolling of requested styles.
      const confidence = phase === 'style' ? 0.58 : phase === 'look' && requested ? 0.62 : 1;
      return { type: 'choice', probabilities: Object.fromEntries(labels.map(label => [label, labels.length === 1 ? 1 : label === favored ? confidence : (1 - confidence) / (labels.length - 1)])) };
    });
    active.set(key, active.get(key) - 1);
    return json({ model, inputTokens: body.questions.length * 7, costUsd: 0, verdicts });
  });

  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/dev/styles-qa`);
  inventory = await page.evaluate(async () => {
    const { Conjuring } = await import('/engine/director.ts');
    const { entriesOf } = await import('/engine/catalogue.ts');
    const scenes = new Map();
    window.styleQA = {
      create(key, idea, look, fullRouting) { scenes.set(key, new Conjuring(idea, { ...(!fullRouting ? { world: 'worlds/worktable', cast: ['things/teapot'] } : {}), model: 'test/style-integration', ...(look ? { look } : {}) })); },
      // The direction is pinned so this check stays about style; dev/directions-check.mjs exercises the direction tour.
      async plan(key, roll, force = {}, temperature = 1) { return scenes.get(key).plan({ roll, temperature, force: { 'direction::house': 'directions/as-written', ...force } }); },
    };
    return entriesOf('look').map(({ id, title, medium }) => ({ id, title, medium: medium ?? 'mixed' }));
  });
  const media = [...new Set(inventory.map(({ medium }) => medium))].sort();
  assert.ok(media.includes('game') && media.includes('painting') && media.includes('realism'), 'The requested new style families must exist');
  const create = (key, look, fullRouting = false) => page.evaluate(({ key, idea, look, fullRouting }) => window.styleQA.create(key, idea, look, fullRouting), { key, idea: ideas[key], look, fullRouting });
  const plan = (key, roll, force = {}, temperature = 1) => page.evaluate(({ key, roll, force, temperature }) => window.styleQA.plan(key, roll, force, temperature), { key, roll, force, temperature });
  const of = (key, phase) => requests.filter(request => request.body.idea === ideas[key] && (!phase || request.phase === phase));
  const mediumOf = plan => plan.look.entry.medium ?? 'mixed';
  const ruling = (plan, name) => plan.rulings.find(item => item.owner === 'direction' && item.name === name);
  const paidUsage = (key, current) => {
    const calls = of(key);
    assert.equal(current.usage.requests, calls.length, 'Cached consultations must not count as paid requests');
    assert.equal(current.usage.inputTokens, calls.reduce((sum, { body }) => sum + body.questions.length * 7, 0));
  };
  const pass = (name, details = {}) => { checks.push({ name, passed: true, ...details }); console.log(`pass ${name}`); };

  await create('open');
  const cycle = [];
  for (let roll = 0; roll < media.length; roll++) cycle.push(await plan('open', roll));
  assert.deepEqual(cycle.map(mediumOf).sort(), media, 'One open-style cycle must visit every family despite unequal relevance weights and family sizes');
  assert.equal(of('open', 'style').length, 1, 'Style intent and family probabilities are consulted once per idea');
  for (const current of cycle) {
    assert.equal(current.world.entry.id, 'worlds/worktable');
    assert.deepEqual(current.cast.map(({ entry }) => entry.id), ['things/teapot']);
    assert.equal(ruling(current, 'medium').picked, mediumOf(current));
    assert.match(ruling(current, 'medium').note, /explore each available medium/);
    assert.ok(current.design.layers.length > 0);
  }
  const consultedFamilies = of('open', 'look').map(({ body }) => {
    const labels = Object.keys(body.questions[0].options);
    const families = [...new Set(labels.map(id => inventory.find(entry => entry.id === id)?.medium))];
    assert.equal(families.length, 1, 'Every look consultation must stay inside one family');
    assert.deepEqual(labels.sort(), inventory.filter(entry => entry.medium === families[0]).map(({ id }) => id).sort());
    return families[0];
  });
  assert.deepEqual(consultedFamilies.sort(), media.filter(medium => inventory.filter(entry => entry.medium === medium).length > 1).sort());
  const first = cycle[0], beforeReplay = requests.length;
  const replay = await plan('open', 0);
  assert.deepEqual({ mood: replay.mood, world: replay.world, cast: replay.cast, look: replay.look, design: replay.design }, { mood: first.mood, world: first.world, cast: first.cast, look: first.look, design: first.design });
  assert.equal(requests.length, beforeReplay, 'An identical roll must reuse every cached consultation');
  paidUsage('open', replay);
  pass('all-families-in-one-open-cycle-and-repeatable-cached-replay', { media: cycle.map(mediumOf), looks: cycle.map(current => current.look.entry.id) });

  const seenLooks = new Set(cycle.map(current => current.look.entry.id));
  assert.equal(of('open', 'design').length, seenLooks.size, 'SVG direction must consult each new look and cache repeated looks');
  for (const current of cycle) {
    assert.equal(of('open', 'design').filter(({ body }) => body.brief.includes(current.look.entry.title)).length, 1, 'Every SVG request must identify its current look');
    const expectedPalette = mediumOf(current) === 'game' ? 'carnival' : mediumOf(current) === 'print' ? 'acid' : 'editorial';
    // Rerolls tour the palettes, so the current look's consultation shows as the ruling's favourite.
    const palette = current.rulings.find(item => item.owner === 'design' && item.name === 'palette');
    assert.equal(palette.options[0].label, expectedPalette, 'The SVG plan must use the current look consultation result');
    assert.ok(palette.options.some(option => option.label === current.design.answers.palette), 'The toured palette must be one the consultation offered');
  }
  pass('svg-reconsults-per-look-and-reuses-repeat-look');

  let pinned;
  for (let roll = 0; roll < media.length; roll++) {
    pinned = await plan('open', roll, { 'direction::look': 'looks/cartridge-64', 'direction::medium': 'print' });
    assert.equal(pinned.look.entry.id, 'looks/cartridge-64');
    assert.equal(ruling(pinned, 'medium').picked, 'game', 'A pinned look must determine its actual family');
    assert.equal(ruling(pinned, 'look').forced, true);
  }
  assert.equal(of('open', 'style').length, 1);
  assert.equal(of('open', 'look').filter(({ body }) => body.brief.startsWith('Choose within the game ')).length, 1, 'Returning to a family must reuse its look probabilities');
  paidUsage('open', pinned);
  const pinnedFamilies = [];
  for (let roll = 0; roll < media.length; roll++) pinnedFamilies.push(mediumOf(await plan('open', roll, { 'direction::medium': 'painting' })));
  assert.deepEqual(pinnedFamilies, media.map(() => 'painting'));
  pass('pinned-look-and-pinned-family-remain-stable');

  await create('requested');
  const requested = [];
  for (let roll = 0; roll < media.length * 2; roll++) requested.push(await plan('requested', roll));
  // A requested medium survives every reroll; its treatments take turns in a weighted order.
  assert.ok(requested.slice(0, inventory.filter(entry => entry.medium === 'game').length).some(current => current.look.entry.id === 'looks/cartridge-64'), 'The favourite treatment comes round within the first cycle');
  assert.ok(requested.every(current => mediumOf(current) === 'game'), 'An explicitly requested medium must survive rerolls with nonzero alternative probabilities');
  for (let roll = 1; roll < requested.length; roll++) assert.notEqual(requested[roll].look.entry.id, requested[roll - 1].look.entry.id, 'A reroll must not reprint the treatment it just printed');
  assert.ok(requested.every(current => ruling(current, 'styleSpecified').picked === 'yes'));
  assert.equal(of('requested', 'style').length, 1);
  assert.equal(of('requested', 'look').length, 1);
  const requestedLooks = new Set(requested.map(current => current.look.entry.id));
  assert.equal(of('requested', 'design').length, requestedLooks.size, 'SVG direction is consulted once per treatment visited');
  paidUsage('requested', requested.at(-1));
  pass('typed-explicit-style-keeps-its-medium-and-tours-treatments', { rolls: requested.length, looks: [...requestedLooks] });

  await create('chosen', 'looks/photographic');
  const chosen = [];
  for (let roll = 0; roll < 3; roll++) chosen.push(await plan('chosen', roll));
  assert.ok(chosen.every(current => current.look.entry.id === 'looks/photographic'));
  assert.equal(of('chosen', 'style').length, 0, 'The explicit look option must bypass automatic medium direction');
  assert.equal(of('chosen', 'look').length, 0);
  assert.equal(of('chosen', 'design').length, 1);
  paidUsage('chosen', chosen.at(-1));
  pass('explicit-look-option-skips-style-selection');

  await create('failed', undefined, true);
  await assert.rejects(plan('failed', 0), /Intentional style failure/);
  const failedRequests = of('failed');
  assert.ok(failedRequests.filter(({ phase }) => phase === 'routing').length > 1, 'The failure fixture must exercise the entire catalogue routing chain');
  assert.equal(failedRequests.at(-1).phase, 'style');
  assert.equal(styleRejectedWithRoutingActive, false, 'Style rejection must occur after the routing chain has completed');
  assert.ok(failedRequests.every(({ phase }) => phase === 'routing' || phase === 'style'), 'Rejected style direction must not trigger component or SVG consultations');
  const afterRejection = requests.length;
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(requests.length, afterRejection, 'No background batch may continue after the plan rejects');
  assert.ok([...active.values()].every(count => count === 0));
  pass('style-failure-leaves-no-routing-or-detail-requests-running', { routingBatches: failedRequests.length - 1 });

  const force = { 'direction::house': 'directions/as-written', 'direction::world': 'worlds/worktable', 'direction::look': 'looks/xerox-noir', 'direction::density': 0, 'direction::cast:things/teapot': true };
  await page.goto(`${base}/?${new URLSearchParams({ idea: ideas.ui, force: JSON.stringify(force) })}`);
  const ready = async () => {
    await page.waitForFunction(() => ['conjure-ready', 'conjure-failed'].includes(document.title), null, { timeout: 90_000 });
    assert.equal(await page.title(), 'conjure-ready', await page.locator('#status').textContent());
    await page.waitForFunction(() => !document.querySelector('#first').disabled && document.querySelector('#svg-overlay').complete && document.querySelector('#svg-overlay').naturalWidth > 0);
    assert.deepEqual(await page.evaluate(() => window.__conjure.reports.filter(report => report.error)), []);
  };
  const current = () => page.evaluate(() => window.__conjure.plan);
  await ready();
  assert.equal((await current()).look.entry.id, 'looks/xerox-noir');
  const familyRow = page.locator('[data-decision-key="direction::medium"]');
  assert.equal(await familyRow.count(), 1, 'The tree must expose the family as a typed decision');
  assert.match(await familyRow.locator('.note').innerText(), /pinned look/);
  await familyRow.locator('button.answer').filter({ has: page.locator('span', { hasText: /^game$/ }) }).click();
  await ready();
  const game = await current();
  assert.equal(mediumOf(game), 'game', 'Branching to a family must release a previously pinned look from another family');
  assert.equal(ruling(game, 'medium').forced, true);
  assert.notEqual(ruling(game, 'look').forced, true);
  assert.equal(game.design.answers.palette, 'carnival');
  assert.equal(await familyRow.locator('button.pinned').count(), 1);
  const lookRow = page.locator('[data-decision-key="direction::look"]');
  const lookBranch = page.locator('#tree > ul > li > details').filter({ has: lookRow });
  if (!await lookBranch.evaluate(branch => branch.open)) await lookBranch.locator(':scope > summary').click();
  const otherLook = inventory.find(entry => entry.medium === 'game' && entry.id !== game.look.entry.id);
  assert.ok(otherLook, 'The game family must offer at least two different treatments');
  await lookRow.locator('button.answer').filter({ has: page.locator('span', { hasText: otherLook.title }) }).click();
  await ready();
  const leaf = await current();
  assert.equal(leaf.look.entry.id, otherLook.id);
  assert.equal(ruling(leaf, 'look').forced, true);
  assert.notEqual(ruling(leaf, 'medium').forced, true, 'A pinned look replaces the explicit family pin');
  const beforeAgain = of('ui').length;
  await page.locator('#again').click();
  await ready();
  assert.equal((await current()).look.entry.id, otherLook.id, 'The pinned tree leaf must survive a real Roll again action');
  assert.equal(of('ui').length, beforeAgain, 'A pinned reroll must reuse the current style and SVG consultations');
  // Rolling again tours the vector palette; the gallery keeps whatever this roll printed.
  assert.equal(gallery.at(-1).record.design.answers.palette, (await current()).design.answers.palette);
  assert.ok(gallery.length >= 4, 'All UI gallery saves must be intercepted');
  await page.locator('.frame').screenshot({ path: '.data/layers/style-tree-game.png' });
  pass('actual-tree-family-and-look-pins-replace-each-other-and-survive-roll', { firstGame: game.look.entry.id, pinnedGame: otherLook.id, interceptedGallerySaves: gallery.length });

  assert.deepEqual(contractErrors, []);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedApi, []);
  for (const [key, peak] of peaks) assert.equal(peak, 1, `A consultation may send only one batch at a time: ${key.slice(0, 90)}`);
  report = { passed: true, providerCalls: 0, media, checks, requests: requests.length, maxPlanningCharacters: Math.max(...requests.map(({ planningCharacters }) => planningCharacters)), consultationPeakConcurrent: Math.max(...peaks.values()), gallerySavesIntercepted: gallery.length };
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report = { passed: false, providerCalls: 0, error: error.stack ?? String(error), checks, requests: requests.length, contractErrors, errors, unexpectedApi };
  throw error;
} finally {
  writeFileSync('.data/layers/style-browser.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
