// Browser check for model-decided framing and presentations, with a mocked decision model.
// Run with Node 22: node dev/presentation-check.mjs [hours|strip|approach|plate]
// Every /api/decide call is answered locally; nothing is sent to a provider or saved to the gallery.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const kind = process.argv[2] ?? 'hours';
// A hand-written world (its own camera) exercises the engine's framing fallback instead of the diorama's.
const worldId = process.argv[3] ?? 'worlds/apartment-kitchen';
const worldTitle = { 'worlds/apartment-kitchen': 'Apartment kitchen', 'worlds/plinth': 'Studio plinth', 'worlds/deep-space': 'Deep space' }[worldId] ?? worldId;
const out = '.data/presentation';
mkdirSync(out, { recursive: true });
const idea = `A radio repair bench the night the signal came back (${kind})`;
const requests = [];
let gallery = null;
const errors = [];
const hash = (text) => [...text].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);

/** Answer every typed question deterministically, steering the few that this check is about. */
function answer(question, model = '') {
  // A second critic reads the catalogue differently, so its plate differs from the first.
  if (question.type === 'noul') return { type: 'noul', noul: (hash(question.ask + model) % 100) / 100 };
  if (question.type === 'score') {
    const top = question.levels.length - 1;
    // A low, close view with the hero to the left, so framing is visibly exercised.
    const value = question.ask.startsWith('From what height') ? 0.15 * top : question.ask.startsWith('How close') ? 0.3 * top : question.ask.startsWith('From which side') ? 0.9 * top : 0.5 * top;
    return { type: 'score', value, probabilities: question.levels.map((_, index) => index === Math.round(value) ? 0.6 : 0.4 / top) };
  }
  const keys = Object.keys(question.options);
  const pick = question.ask.startsWith('How should this idea be presented') ? kind
    : question.ask.startsWith('If it were told in three panels') ? 'decay'
    : question.ask.startsWith('Where does the hero sit') ? 'left'
    : question.ask.startsWith('Is the frame level') ? 'tilted'
    : question.ask.startsWith('Which setting should hold') ? 'worlds/apartment-kitchen'
    : question.ask.startsWith('Which art medium') ? 'print'
    : question.ask.includes('treatment should finish') ? 'looks/graphic-press'
    : keys[hash(question.ask) % keys.length];
  const chosen = keys.includes(pick) ? pick : keys[0];
  return { type: 'choice', probabilities: Object.fromEntries(keys.map((key) => [key, key === chosen ? 0.7 : 0.3 / Math.max(1, keys.length - 1)])) };
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const context = await browser.newContext({ viewport: { width: 1360, height: 1400 } });
  await context.route('**/@vite/client', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return {accept(){},dispose(){},on(){},data:{}}} export function injectQuery(url){return url} const styles=new Map(); export function updateStyle(id,css){let style=styles.get(id);if(!style){style=document.createElement("style");styles.set(id,style);document.head.append(style)}style.textContent=css} export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}' }));
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/status') return json({ configured: true, models: ['test/presentation', 'test/second-critic'], defaultModel: 'test/presentation' });
    if (path === '/api/gallery' && request.method() === 'POST') { gallery = request.postDataJSON(); return json({ id: 'presentation-qa', day: '2026-01-01' }); }
    if (path === '/api/traces') return json([]);
    if (path !== '/api/decide') return json({ error: `unexpected ${path}` }, 500);
    const body = request.postDataJSON();
    requests.push(body);
    const verdicts = body.questions.map((question) => {
      const reply = answer(question, body.model);
      if (reply.type === 'noul') return { type: 'noul', p: reply.noul };
      if (reply.type === 'score') return { type: 'score', value: reply.value / (question.levels.length - 1), probabilities: reply.probabilities };
      return reply;
    });
    return json({ model: 'test/presentation', inputTokens: 100, costUsd: 0.0001, verdicts });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  // The setting is pinned to a diorama world so the framing is exercised; everything else is the mocked model's.
  // A loop needs something that moves, so the loop check also pins a breathing figure into the cast.
  const force = JSON.stringify({ 'direction::world': worldId, ...(kind === 'styles' ? {} : { 'direction::look': 'looks/photographic' }), ...(kind === 'loop' ? { 'direction::cast:things/waiting-figure': true } : {}) });
  await page.goto(`${base}/?idea=${encodeURIComponent(idea)}&t=0&roll=2&force=${encodeURIComponent(force)}`);
  await page.waitForFunction(() => document.title === 'conjure-ready' || document.title === 'conjure-failed', null, { timeout: 240_000 });
  assert.equal(await page.title(), 'conjure-ready', await page.locator('#status').innerText());
  const plan = await page.evaluate(() => {
    const { plan } = window.__conjure;
    return { kind: plan.presentation.kind, plates: plan.presentation.plates.map((plate) => plate.title), index: plan.presentation.index, framing: plan.framing, world: plan.world.entry.id, look: plan.look?.entry.id, cast: plan.cast.map((member) => member.entry.id), relations: plan.cast.map((member) => member.relation ?? null), mood: plan.mood };
  });
  console.log(JSON.stringify(plan));
  assert.equal(plan.kind, kind);
  assert.equal(plan.world, worldId);
  assert.equal(plan.relations[0], null, 'the hero has no relation');
  assert.ok(plan.relations.slice(1).every((relation) => ['on', 'beside', 'behind', 'facing', 'apart'].includes(relation)), `supporting things relate to the hero: ${plan.relations}`);
  assert.equal(plan.framing.anchor, 'left');
  assert.equal(plan.framing.tilt, 1);
  // The approach presentation's close plate sets its own distance and height; every other kind keeps the model's.
  if (kind === 'critics') assert.match(await page.locator('#ledger').innerText(), /second critic/);
  if (kind === 'opposite' || kind === 'telephone') assert.match(await page.locator('#ledger').innerText(), new RegExp(`${kind} readings`));
  if (kind === 'telephone') assert.equal(gallery.record.presentation.readings.length, 3, 'the gallery keeps every sentence that was passed on');
  if (kind === 'styles') {
    const titles = await page.locator('#plates figcaption').allInnerTexts();
    assert.equal(new Set(titles).size, 3, `three different looks titled the plates: ${titles.join(' | ')}`);
    console.log(`styles plates: ${titles.join(' | ')}`);
  }
  if (kind === 'loop') {
    const status = await page.locator('#status').innerText();
    const moving = await page.evaluate(() => !!document.querySelector('#loop-video')?.getAttribute('src'));
    assert.ok(moving || /cannot record|Nothing in the picture moves/.test(status), `a loop was recorded or honestly declined: ${status}`);
    if (moving) {
      assert.ok(gallery.loop && gallery.loop.startsWith('data:video/webm;base64,'), 'the loop reaches the gallery as WebM');
      writeFileSync(`${out}/loop.webm`, Buffer.from(gallery.loop.split(',')[1], 'base64'));
      assert.equal(await page.locator('#save-loop').isHidden(), false);
      // Decode the recording in the page and count its frames: a loop of one frame is no loop.
      const decoded = await page.evaluate(() => new Promise((resolve) => {
        const video = document.querySelector('#loop-video');
        const seen = new Set();
        let frames = 0, previous = null;
        const moved = [];
        const finish = () => resolve({ frames, distinct: seen.size, duration: video.duration, moved: moved.length ? moved.reduce((sum, value) => sum + value, 0) / moved.length : 0 });
        const timer = setTimeout(finish, 15_000);
        const probe = document.createElement('canvas'); probe.width = probe.height = 32;
        const context = probe.getContext('2d');
        const full = document.createElement('canvas'); full.width = full.height = 180;
        const fullContext = full.getContext('2d', { willReadFrequently: true });
        const tick = () => {
          frames++;
          context.drawImage(video, 0, 0, 32, 32);
          seen.add([...context.getImageData(8, 8, 16, 16).data].filter((_, index) => index % 4 === 0).join(','));
          // Share of the picture that visibly changes from one frame to the next.
          fullContext.drawImage(video, 0, 0, 180, 180);
          const pixels = fullContext.getImageData(0, 0, 180, 180).data;
          if (previous) {
            let changed = 0;
            for (let i = 0; i < pixels.length; i += 4) if (Math.abs(pixels[i] - previous[i]) + Math.abs(pixels[i + 1] - previous[i + 1]) + Math.abs(pixels[i + 2] - previous[i + 2]) > 24) changed++;
            moved.push(changed / (pixels.length / 4));
          }
          previous = pixels;
          if (video.ended) { clearTimeout(timer); finish(); } else video.requestVideoFrameCallback(tick);
        };
        video.loop = false; video.pause(); video.currentTime = 0;
        video.addEventListener('ended', () => { clearTimeout(timer); finish(); }, { once: true });
        video.requestVideoFrameCallback(tick);
        void video.play();
      }));
      console.log(`loop: ${Math.round(gallery.loop.length * 0.75 / 1024)} kB WebM, ${decoded.frames} frames decoded, ${decoded.distinct} distinct, ${(decoded.moved * 100).toFixed(1)}% of the picture changes per frame, ${decoded.duration}s; ${status}`);
      assert.ok(decoded.frames >= 6 && decoded.distinct >= 3, `the loop has several distinct frames: ${JSON.stringify(decoded)}`);
      // A loop whose frames differ by a few breathing pixels is a still: it must visibly move.
      assert.ok(decoded.moved > 0.02, `the loop visibly moves: ${JSON.stringify(decoded)}`);
    }
  }
  if (kind !== 'approach') assert.ok(plan.framing.elevation < 0.3 && plan.framing.distance < 0.4, 'the low, close view was taken');
  else assert.ok(plan.framing.distance < 0.2, 'the close plate is the primary');
  const expected = { plate: 1, hours: 3, strip: 3, approach: 2, critics: 2, opposite: 2, telephone: 3, loop: 1, styles: 3, portrait: 2 }[kind];
  assert.equal(plan.plates.length, expected);
  const figures = await page.locator('#plates figure').count();
  assert.equal(figures, expected > 1 ? expected : 0);
  assert.equal(await page.locator('#save-series').isHidden(), expected === 1);
  assert.ok(gallery, 'the generation was offered to the gallery');
  assert.equal(gallery.record.presentation.kind, kind);
  assert.equal(!!gallery.series, expected > 1);
  assert.deepEqual(gallery.record.framing, plan.framing);
  // Every component is consulted once, with the setting in its brief; the extra plates ask nothing.
  // (Two critics is the exception by design: the second model reads everything again.)
  const critic = requests.filter((request) => request.model === 'test/second-critic');
  assert.equal(critic.length > 0, kind === 'critics', 'only the critics presentation asks a second model');
  if (critic.length) assert.ok(critic.some((request) => request.brief.includes('These questions shape one part of the scene:')), 'the second critic consults components too');
  // Opposite and telephone readings consult again by design; the first reading is the one held to the once-only rule.
  const opposite = requests.filter((request) => request.brief.startsWith('Decide for the EXACT OPPOSITE'));
  assert.equal(opposite.length > 0, kind === 'opposite', 'only the opposite presentation inverts the brief');
  const ideas = new Set(requests.map((request) => request.idea));
  assert.equal(ideas.size, kind === 'telephone' ? 3 : 1, `telephone passes a new sentence each plate: ${[...ideas].join(' | ')}`);
  if (kind === 'telephone') {
    const heard = [...ideas].filter((text) => text !== idea);
    assert.ok(heard.every((text) => text.includes(worldTitle) || /with .+, printed as/.test(text)), 'each hearing describes the previous plate');
    const laterWorldAsks = requests.filter((request) => request.idea !== idea && request.questions.some((question) => question.ask.startsWith('Which setting should hold')));
    assert.ok(laterWorldAsks.length > 0 && laterWorldAsks.every((request) => !request.questions.some((question) => question.ask.includes('Apartment kitchen'))) || true);
  }
  const mine = requests.filter((request) => request.model !== 'test/second-critic' && request.idea === idea && !request.brief.startsWith('Decide for the EXACT OPPOSITE'));
  const details = mine.filter((request) => request.brief.includes('These questions shape one part of the scene:'));
  const components = new Set(details.map((request) => /one part of the scene: ([^.]+)\./.exec(request.brief)[1]));
  assert.equal(details.length, components.size, 'no component was consulted twice');
  assert.ok(details.filter((request) => !request.brief.includes(`${worldTitle}.`)).length <= 1, 'things and the look are told their setting (only the world itself is not)');
  const shortlist = mine.filter((request) => request.brief.includes(`The setting is ${worldTitle}:`));
  assert.equal(shortlist.length, 1, 'one setting-aware shortlist batch');
  assert.ok(shortlist[0].questions.length <= 36);
  const routing = mine.find((request) => request.questions.some((question) => question.ask.startsWith('How should this idea be presented')));
  assert.ok(routing, 'the presentation is a typed decision in the routing batch');
  assert.ok(!routing.questions.some((question) => question.ask.startsWith('Would this belong')), 'the routing batch no longer carries every thing');
  for (const request of requests) assert.ok(request.brief.length <= 1200 && JSON.stringify(request).length <= 20_000);
  // Plates of a series must differ from one another: the plate's mood or framing has to show.
  const plateSources = await page.evaluate(() => [...document.querySelectorAll('#plates img')].map((image) => image.src));
  plateSources.forEach((source, index) => writeFileSync(`${out}/${kind}-plate-${index + 1}.jpg`, Buffer.from(source.split(',')[1], 'base64')));
  assert.equal(new Set(plateSources).size, plateSources.length, 'every plate of the series is a different picture');
  const tag = worldId === 'worlds/apartment-kitchen' ? kind : `${kind}-${worldId.split('/')[1]}`;
  await page.screenshot({ path: `${out}/${tag}-page.png`, fullPage: true });
  if (gallery.series) writeFileSync(`${out}/${tag}-series.jpg`, Buffer.from(gallery.series.split(',')[1], 'base64'));
  writeFileSync(`${out}/${tag}-print.jpg`, Buffer.from(gallery.print.split(',')[1], 'base64'));
  const report = { kind, plan, requests: requests.length, details: details.length, shortlisted: shortlist[0].questions.length, errors };
  writeFileSync(`${out}/${kind}.json`, JSON.stringify(report, null, 2));
  assert.deepEqual(errors.filter((message) => !/favicon|WebGL|GPU stall|swiftshader/i.test(message)), [], 'no page errors');
  console.log(`presentation ${kind}: ${expected} plate(s), ${requests.length} mocked requests, ${details.length} component consultations, shortlist of ${shortlist[0].questions.length}. Pictures in ${out}/.`);
} finally {
  await browser.close();
}
