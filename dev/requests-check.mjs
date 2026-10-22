// Exercise the ordinary online browser flow against the live API contract without
// making provider calls or saving test generations to the gallery.
// Run with Node 22: node --import tsx dev/requests-check.mjs
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { decideSchema } from '../server/decision-schema.ts';
import { BATCH_CHARACTERS, MAX_BRIEF_CHARACTERS } from '../engine/decision-limits.ts';

const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const out = '.data/layers/request-chain-browser.json';
const model = 'test/request-chain';
const hashOf = (text) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const idea = 'A lone teapot remembered as acid cyan toner on a near-black wall';
const force = {
  'direction::house': 'directions/fifth-world',
  'direction::world': 'worlds/worktable',
  'direction::look': 'looks/xerox-noir',
  'direction::density': 0,
  'direction::cast:things/teapot': true,
  'design::motif': 'halftone',
  'design::palette': 'acid',
};
const requests = [];
const phaseOf = ({ brief, questions }) => brief.includes('Choose the direction the whole picture will follow') ? 'house'
  : brief.startsWith('Choose the art medium separately') ? 'style'
  : brief.startsWith('Choose within the ') ? 'look'
  : brief.startsWith('Art-direct editable SVG') ? 'design'
  : brief.includes('These questions shape one part of the scene:') ? 'component'
  : brief.includes('Judge whether each thing belongs in that setting') ? 'shortlist'
  : brief.includes('Place each supporting thing in relation to it') ? 'relations'
  : questions.every((question) => question.ask.startsWith('Would this belong in the scene? ')) ? 'casting' : 'routing';
const active = new Map();
const peakActive = new Map();
const errors = [];
const contractErrors = [];
const unexpectedApi = [];
let statusRequests = 0;
let gallery;
let report;
mkdirSync('.data/layers', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

try {
  const context = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  // Catalogue publication elsewhere must not reload this long-lived check.
  await context.route('**/@vite/client', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return {accept(){},dispose(){},on(){},data:{}}} export function injectQuery(url){return url} const styles=new Map(); export function updateStyle(id,css){let style=styles.get(id);if(!style){style=document.createElement("style");styles.set(id,style);document.head.append(style)}style.textContent=css} export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}' }));
  // One catch-all API mock makes it impossible for this page to reach a paid path.
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/status') {
      statusRequests++;
      return json({ configured: true, models: [model], defaultModel: model });
    }
    // The trace library loads on every page; an empty one keeps this check about decisions.
    if (path === '/api/traces' && request.method() === 'GET') return json([]);
    if (path === '/api/gallery' && request.method() === 'POST') {
      gallery = request.postDataJSON();
      return json({ id: 'request-contract-qa' });
    }
    if (path !== '/api/decide' || request.method() !== 'POST') {
      unexpectedApi.push(`${request.method()} ${path}`);
      return json({ error: 'Unexpected API request in contract check' }, 500);
    }
    const body = request.postDataJSON();
    const entry = {
      index: requests.length,
      phase: phaseOf(body),
      body,
      transportCharacters: request.postData().length,
      planningCharacters: request.postData().length + body.questions.length * 24,
      briefCharacters: body.brief.length,
    };
    requests.push(entry);
    const validation = decideSchema.safeParse(body);
    if (!validation.success || entry.planningCharacters > BATCH_CHARACTERS) {
      contractErrors.push({ index: entry.index, schema: validation.success ? null : validation.error.issues, planningCharacters: entry.planningCharacters });
      return json({ error: 'Request violates the live contract', details: contractErrors.at(-1) }, 400);
    }
    const running = (active.get(body.brief) ?? 0) + 1;
    active.set(body.brief, running);
    peakActive.set(body.brief, Math.max(running, peakActive.get(body.brief) ?? 0));
    // Keep requests in flight long enough to expose eager parallel batch dispatch.
    await new Promise((resolve) => setTimeout(resolve, 30));
    const verdicts = body.questions.map((question) => question.type === 'choice'
      ? { type: 'choice', probabilities: Object.fromEntries(Object.keys(question.options).map((key, index) => [key, index === 0 ? 1 : 0])) }
      : question.type === 'score'
        ? { type: 'score', value: 0.5, probabilities: question.levels.map(() => 1 / question.levels.length) }
        // Spread casting verdicts so a shortlist forms; every other yes/no stays a quiet no.
        : { type: 'noul', p: question.ask.startsWith('Would this belong in the scene? ') ? (hashOf(question.ask) % 90 + 5) / 100 : 0.1 });
    active.set(body.brief, active.get(body.brief) - 1);
    return json({ model, inputTokens: body.questions.length * 7, costUsd: 0, verdicts });
  });

  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const query = new URLSearchParams({ idea, force: JSON.stringify(force) });
  await page.goto(`${base}/?${query}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => ['conjure-ready', 'conjure-failed'].includes(document.title), null, { timeout: 90_000 });
  assert.deepEqual(contractErrors, [], 'Every frontend decision request must satisfy the live server schema and transport budget');
  assert.equal(await page.title(), 'conjure-ready', await page.locator('#status').textContent());
  await page.waitForFunction(() => {
    const frame = document.querySelector('.frame');
    const image = document.querySelector('#svg-overlay');
    return frame.classList.contains('printed') && frame.classList.contains('layered') && image.complete && image.naturalWidth > 0;
  });
  const result = await page.evaluate(async () => {
    const { CATALOGUE } = await import('/engine/catalogue.ts');
    return {
      plan: window.__conjure.plan,
      reports: window.__conjure.reports,
      catalogue: CATALOGUE.map(({ id, kind, title, summary, medium, scales }) => ({ id, kind, title, summary, medium, scales })),
      layerIds: [...document.querySelectorAll('#layer-list [data-layer-id]')].map((node) => node.dataset.layerId),
      ledger: document.querySelector('#ledger').textContent,
    };
  });
  assert.equal(statusRequests, 1, 'The test must exercise online status/model selection');
  assert.deepEqual(unexpectedApi, []);
  assert.deepEqual(errors, []);
  assert.deepEqual(result.reports.filter((item) => item.error), [], 'The forced online composition must build successfully');
  assert.ok(requests.length > 1);
  for (const { body } of requests) {
    assert.equal(body.idea, idea);
    assert.equal(body.model, model);
  }
  const routingRequests = requests.filter(({ phase }) => phase === 'routing');
  const routingBrief = routingRequests[0].body.brief;
  const routing = routingRequests.flatMap(({ body }) => body.questions);
  assert.ok(routingRequests.length > 1, 'The live catalogue must exercise multiple routing batches');
  const houseRequests = requests.filter(({ phase }) => phase === 'house');
  const directions = result.catalogue.filter(({ kind }) => kind === 'direction');
  assert.equal(houseRequests.length, 1, 'The direction is asked once, in one request of one question');
  assert.equal(houseRequests[0].body.questions.length, 1);
  assert.ok(houseRequests[0].index < routingRequests[0].index, 'The direction is chosen before routing, which is written under it');
  assert.deepEqual(Object.keys(houseRequests[0].body.questions[0].options).sort(), directions.map(({ id }) => id).sort(), 'Every direction in the catalogue is offered, described by its summary');
  assert.ok(directions.length >= 3);
  assert.equal(result.plan.direction.entry.id, force['direction::house'], 'The pinned direction is followed');
  assert.deepEqual(result.plan.direction.finishes, ['otherworld', 'vacui'], 'The Fifth World brings both finishing passes');
  assert.ok(routingBrief.includes('Direction: Fifth-Worldly'), 'Routing is written under the direction');
  assert.ok(!houseRequests[0].body.brief.includes('Direction:'), 'The direction is chosen under the base brief alone');
  assert.ok(requests.filter(({ phase }) => phase === 'casting').every(({ body }) => !body.brief.includes('Direction:')), 'Casting hears no direction: it is asked once per idea');
  for (const phase of ['style', 'look', 'design', 'component']) assert.ok(requests.filter((request) => request.phase === phase).every(({ body }) => body.brief.includes('Direction: Fifth-Worldly')), `${phase} consultations are written under the direction`);
  for (const [brief, peak] of peakActive) assert.equal(peak, 1, `Batches within one consultation must execute sequentially: ${brief.slice(0, 80)}`);
  const castingRequests = requests.filter(({ phase }) => phase === 'casting');
  const shortlistRequests = requests.filter(({ phase }) => phase === 'shortlist');
  assert.ok(castingRequests.every(({ index }) => index > routingRequests.at(-1).index), 'Casting must start after the entire routing chain');
  assert.ok(requests.filter(({ phase }) => phase === 'component' || phase === 'design' || phase === 'relations').every(({ index }) => index > shortlistRequests.at(-1).index), 'Detail consultation must start after casting');
  const relationRequests = requests.filter(({ phase }) => phase === 'relations');
  assert.ok(relationRequests.length <= 1, 'Relations are asked in one batch per scene');
  for (const { body } of relationRequests) assert.ok(body.questions.every((question) => question.type === 'choice' && Object.keys(question.options).join() === 'on,beside,behind,facing,apart'), 'Each supporting thing answers one typed relation');
  const things = result.catalogue.filter(({ kind }) => kind === 'thing');
  const worlds = result.catalogue.filter(({ kind }) => kind === 'world');
  const looks = result.catalogue.filter(({ kind }) => kind === 'look');
  const forcedWorld = worlds.find(({ id }) => id === force['direction::world']);
  const eligible = things.filter(({ scales }) => scales.some((scale) => forcedWorld.scales.includes(scale)));
  assert.ok(eligible.length < things.length, 'The forced world must leave some things out of scale, so scale-first casting is exercised');
  const casting = castingRequests.flatMap(({ body }) => body.questions);
  assert.deepEqual(casting.map(({ ask }) => ask).sort(), eligible.map(({ title, summary }) => `Would this belong in the scene? ${title}: ${summary}`).sort(), 'Every current thing at the setting scales must be asked exactly once, and nothing out of scale');
  assert.equal(shortlistRequests.length, 1, 'The closest things are judged once more with the setting in view, in one batch');
  const shortlist = shortlistRequests[0].body.questions;
  assert.ok(shortlist.length > 0 && shortlist.length <= 36, `The shortlist holds at most 36 things, got ${shortlist.length}`);
  assert.ok(shortlist.every(({ ask }) => casting.some((question) => question.ask === ask)), 'The shortlist is drawn from the things already asked');
  assert.match(shortlistRequests[0].body.brief, new RegExp(`The setting is ${forcedWorld.title}:`));
  assert.ok(!routing.some(({ ask }) => ask.startsWith('Would this belong in the scene? ')), 'The routing chain no longer carries the catalogue of things');
  assert.equal(routing.filter(({ type }) => type === 'score').length, 11, 'All six mood, three framing, the otherworld depth and the dead-space reach scores must survive batching');
  assert.ok(routing.some(({ ask }) => ask.startsWith('How does the empty space fill with micro-macro detail')), 'The dead-space fill is a typed routing decision');
  assert.ok(routing.some(({ ask }) => ask.startsWith('If the print moves, how does the camera move?')), 'The loop camera is a typed routing decision');
  assert.ok(routing.some(({ ask }) => ask.startsWith('How does this picture show that it comes from another dimension?')), 'The otherworld is a typed routing decision');
  assert.ok(routing.some(({ ask }) => ask.startsWith('How should this idea be presented?')), 'The presentation is a typed routing decision');
  const choiceCoverage = (source, ask, entries) => {
    const questions = source.filter((question) => question.ask === ask || question.ask.startsWith(`${ask} Would this be the right answer? `));
    if (questions.length === 1 && questions[0].type === 'choice' && Object.hasOwn(questions[0].options, entries[0].id)) {
      assert.deepEqual(questions[0].options, Object.fromEntries(entries.map(({ id, summary }) => [id, summary])));
    } else {
      assert.deepEqual(questions.map((question) => question.type === 'noul' ? question.ask.slice(`${ask} Would this be the right answer? `.length) : question.options.yes).sort(), entries.map(({ summary }) => summary).sort(), 'Wide choice comparisons must cover each current option exactly once');
    }
    return questions.length;
  };
  const worldQuestions = choiceCoverage(routing, 'Which setting should hold this scene?', worlds);
  assert.equal(routing.length, 6 + 5 + 4 + 2 + 3 + 6 + 1 + worldQuestions, 'Scene routing must contain only mood, framing, presentation, accent, otherworld, dead-space, loop camera and world questions');

  const { plan } = result;
  const styleRequests = requests.filter(({ phase }) => phase === 'style');
  const style = styleRequests.flatMap(({ body }) => body.questions);
  assert.equal(style.length, 2, 'Art direction must separately ask whether style was requested and which medium fits');
  assert.equal(style.filter(({ type }) => type === 'noul').length, 1);
  const media = style.find(({ type }) => type === 'choice');
  assert.deepEqual(Object.keys(media.options).sort(), [...new Set(looks.map(({ medium }) => medium ?? 'mixed'))].sort(), 'Every available family must enter the medium consultation once');
  const medium = plan.look.entry.medium ?? 'mixed';
  assert.equal(plan.rulings.find(({ owner, name }) => owner === 'direction' && name === 'medium').picked, medium, 'A pinned look must determine its family');
  const lookRequests = requests.filter(({ phase }) => phase === 'look');
  const lookChoices = lookRequests.flatMap(({ body }) => body.questions);
  const familyLooks = looks.filter((entry) => (entry.medium ?? 'mixed') === medium);
  if (familyLooks.length > 1) {
    const lookQuestions = choiceCoverage(lookChoices, `Which ${medium} treatment should finish the picture? Honor any specifically requested style.`, familyLooks);
    assert.equal(lookChoices.length, lookQuestions, 'The look consultation must contain only the selected family');
  } else assert.equal(lookChoices.length, 0, 'Single-look media need no additional model request');
  const totalQuestions = requests.reduce((sum, { body }) => sum + body.questions.length, 0);
  assert.equal(plan.usage.requests, requests.length, 'Usage must count every successful batch once');
  assert.equal(plan.usage.inputTokens, totalQuestions * 7);
  assert.equal(plan.usage.model, model);
  assert.equal(plan.usage.costUsd, 0);
  assert.equal(plan.world.entry.id, force['direction::world']);
  assert.equal(plan.look.entry.id, force['direction::look']);
  assert.deepEqual(plan.cast.map(({ entry }) => entry.id), ['things/teapot']);
  assert.equal(plan.design.answers.motif, 'halftone');
  assert.equal(plan.design.answers.palette, 'acid');
  assert.deepEqual(result.layerIds, plan.design.layers.map(({ id }) => id).reverse());
  assert.ok(plan.design.layers.length >= 1, 'The online result must apply its generated vector layers automatically');
  assert.ok(gallery?.print?.startsWith('data:image/jpeg;base64,'));
  assert.equal(gallery.record.source, 'model');
  assert.equal(gallery.record.model, model);
  assert.deepEqual(gallery.record.design, plan.design);
  assert.deepEqual(gallery.record.usage, plan.usage);
  assert.deepEqual(gallery.record.direction, { id: force['direction::house'], finishes: ['otherworld', 'vacui'] }, 'The gallery record keeps the direction and its finishes');
  assert.match(result.ledger, new RegExp(`${requests.length} requests`));
  report = {
    passed: true,
    providerCalls: 0,
    catalogue: { worlds: worlds.length, things: things.length, looks: looks.length, total: result.catalogue.length },
    requests: requests.length,
    totalQuestions,
    routingBatches: routingRequests.length,
    routingQuestions: routing.length,
    castingBatches: castingRequests.length,
    castingQuestions: casting.length,
    eligibleThings: eligible.length,
    catalogueThings: things.length,
    shortlistQuestions: shortlist.length,
    relationQuestions: relationRequests.reduce((sum, { body }) => sum + body.questions.length, 0),
    routingPeakConcurrent: peakActive.get(routingBrief),
    consultationPeakConcurrent: Math.max(...peakActive.values()),
    styleQuestions: style.length,
    selectedMedium: medium,
    maxBriefCharacters: Math.max(...requests.map(({ briefCharacters }) => briefCharacters)),
    briefLimit: MAX_BRIEF_CHARACTERS,
    maxPlanningCharacters: Math.max(...requests.map(({ planningCharacters }) => planningCharacters)),
    planningLimit: BATCH_CHARACTERS,
    batches: requests.map(({ index, phase, body, briefCharacters, transportCharacters, planningCharacters }) => ({ index, phase, questions: body.questions.length, briefCharacters, transportCharacters, planningCharacters })),
    usage: plan.usage,
    automaticDesign: { motif: plan.design.answers.motif, palette: plan.design.answers.palette, layers: plan.design.layers.length },
    galleryIntercepted: true,
    errors,
  };
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report = { passed: false, providerCalls: 0, error: error.stack ?? String(error), requests: requests.length, contractErrors, errors, unexpectedApi };
  throw error;
} finally {
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
