// The layer studio and new looks in a real browser. All generations are free studies;
// model requests fail this check and gallery saves are intercepted to avoid QA entries.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const out = '.data/layers';
mkdirSync(out, { recursive: true });
const reports = [];
let modelRequests = 0;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

try {
  const context = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  // Publishing another complete component should not reload a long-running QA page.
  await context.route('**/@vite/client', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return {accept(){},dispose(){},on(){},data:{}}} export function injectQuery(url){return url} const styles=new Map(); export function updateStyle(id,css){let style=styles.get(id);if(!style){style=document.createElement("style");styles.set(id,style);document.head.append(style)}style.textContent=css} export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}' }));
  await context.route('**/api/decide', async (route) => { modelRequests++; await route.abort(); });
  await context.route('**/api/gallery', (route) => route.request().method() === 'POST'
    ? route.fulfill({ contentType: 'application/json', body: '{"id":"layer-qa"}' }) : route.continue());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const pass = (check, details = {}) => { reports.push({ check, passed: true, ...details }); console.log(`pass ${check}`); };
  const rows = () => page.locator('#layer-list [data-layer-id]');
  const rowIds = () => rows().evaluateAll((nodes) => nodes.map((node) => node.dataset.layerId));
  const svgText = () => page.locator('#svg-overlay').evaluate(async (image) => {
    await image.decode();
    return (await fetch(image.currentSrc || image.src)).text();
  });
  const mutate = async (action) => {
    const before = Number(await page.locator('#svg-overlay').getAttribute('data-revision') || 0);
    await action();
    await page.waitForFunction((revision) => Number(document.querySelector('#svg-overlay').dataset.revision || 0) > revision, before);
  };
  const setField = async (name, value) => {
    await mutate(() => page.locator(`#layer-settings [data-layer-field="${name}"]`).evaluate((input, next) => {
      input.value = String(next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value));
  };
  const download = async (button, filename) => {
    const [file] = await Promise.all([page.waitForEvent('download'), page.locator(button).click()]);
    await file.saveAs(`${out}/${filename}`);
    return file.suggestedFilename();
  };
  const parseSvg = (text) => page.evaluate((source) => {
    const svg = new DOMParser().parseFromString(source, 'image/svg+xml');
    return {
      valid: !svg.querySelector('parsererror') && svg.documentElement.localName === 'svg',
      viewBox: svg.documentElement.getAttribute('viewBox'),
      namedGroups: [...svg.querySelectorAll('g[id]')].map((group) => ({
        id: group.id,
        name: group.querySelector(':scope > title')?.textContent || group.getAttribute('aria-label') || group.getAttribute('inkscape:label'),
      })),
      images: [...svg.querySelectorAll('image')].map((image) => image.getAttribute('href') || image.getAttribute('xlink:href')),
      unsafe: svg.querySelectorAll('script, foreignObject').length,
      shapes: svg.querySelectorAll('path, circle, ellipse, rect, line, polyline, polygon, text').length,
    };
  }, text);
  const inspectLayer = (source, id) => page.evaluate(([text, layerId]) => {
    const svg = new DOMParser().parseFromString(text, 'image/svg+xml');
    const group = [...svg.querySelectorAll('[data-layer]')].find((node) => node.getAttribute('data-layer') === layerId);
    const clip = group.getAttribute('clip-path') || '';
    const mask = clip ? svg.getElementById(clip.slice(5, -1))?.querySelector('path') : null;
    return {
      shapes: group.querySelectorAll('path, circle, ellipse, rect, line, polyline, polygon').length,
      transform: group.querySelector('g')?.getAttribute('transform'),
      blend: group.getAttribute('style'),
      clip,
      mask: mask?.getAttribute('d') || '',
      rule: mask?.getAttribute('clip-rule'),
    };
  }, [source, id]);
  const ready = async () => {
    await page.waitForFunction(() => document.title === 'conjure-ready' && !document.querySelector('#first').disabled, null, { timeout: 90_000 });
    await page.waitForFunction(() => {
      const frame = document.querySelector('.frame');
      const overlay = document.querySelector('#svg-overlay');
      return frame.classList.contains('printed') && frame.classList.contains('layered') && !!overlay.getAttribute('src') && overlay.complete && overlay.naturalWidth > 0;
    });
  };
  const design = () => page.evaluate(() => window.__conjure.plan.design);
  const assertAutomaticStack = async () => {
    const planned = await design();
    assert.ok(planned?.layers.length >= 1 && planned.layers.length <= 3, 'Every generation must receive a typed SVG design');
    assert.deepEqual(await rowIds(), planned.layers.map((layer) => layer.id).reverse(), 'The layer desk must automatically apply the current design');
    for (const layer of planned.layers) {
      await mutate(() => page.locator(`[data-layer-id="${layer.id}"] [data-layer-action="select"]`).click());
      for (const field of ['opacity', 'density', 'scale']) {
        assert.equal(Number(await page.locator(`[data-layer-field="${field}"]`).inputValue()), layer[field], `The editor must display ${layer.id}'s exact generated ${field}`);
      }
    }
    return planned;
  };
  const study = async (look, duringBuild) => {
    await page.locator('#look-select').selectOption(look);
    await page.locator('#browse').click();
    await page.locator('[data-library-tab="thing"]').click();
    await page.locator('#library-search').fill('teapot');
    await page.locator('#library-scale').selectOption('');
    await page.locator('.library-card').filter({ has: page.getByRole('heading', { name: 'Teapot', exact: true }) }).getByRole('button', { name: 'Study this component' }).click();
    if (duringBuild) await duringBuild();
    await ready();
    const current = await page.evaluate(() => ({ look: window.__conjure.plan.look.entry.id, errors: window.__conjure.reports.filter((report) => report.error) }));
    assert.equal(current.look, look);
    assert.deepEqual(current.errors, []);
    assert.match(await page.locator('#ledger').innerText(), /Catalogue study: free/);
  };

  await page.goto(`${base}/?offline`);
  const looks = await page.locator('#look-select option').evaluateAll((options) => options.map((option) => option.value));
  for (const look of ['looks/atelier', 'looks/graphic-press', 'looks/chromatic-darkroom', 'looks/ink-atlas']) assert.ok(looks.includes(look), `Missing look ${look}`);
  const initialGallery = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/gallery' && request.method() === 'POST');
  // If an earlier UI action fails, browser shutdown must not hide that original error.
  void initialGallery.catch(() => {});
  await study('looks/ink-atlas');
  const initialDesign = await assertAutomaticStack();
  const galleryRecord = (await initialGallery).postDataJSON();
  assert.deepEqual(galleryRecord.record.design, initialDesign, 'Gallery records must retain the typed SVG design');
  await download('#save-picture', 'automatic-print.png');
  const autoPixels = await page.evaluate(async ([svg, saved, gallery]) => {
    const read = async (source) => {
      const image = new Image(); image.src = source; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 720;
      const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0, 720, 720);
      return { canvas, data: context.getImageData(0, 0, 720, 720).data };
    };
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const composition = await read(url); URL.revokeObjectURL(url);
    const exported = await read(`data:image/png;base64,${saved}`);
    const stored = await read(gallery);
    const expectedStored = await read(composition.canvas.toDataURL('image/jpeg', 0.92));
    const base = document.querySelector('#print').getContext('2d').getImageData(0, 0, 720, 720).data;
    let changed = 0, pngMismatch = 0, galleryMismatch = 0;
    for (let i = 0; i < base.length; i++) {
      if (composition.data[i] !== base[i]) changed++;
      if (exported.data[i] !== composition.data[i]) pngMismatch++;
      if (stored.data[i] !== expectedStored.data[i]) galleryMismatch++;
    }
    return { changed, pngMismatch, galleryMismatch };
  }, [await svgText(), readFileSync(`${out}/automatic-print.png`).toString('base64'), galleryRecord.print]);
  assert.ok(autoPixels.changed > 100, 'The first visible print must already include SVG layers');
  assert.equal(autoPixels.pngMismatch, 0, 'Save PNG must include automatic SVG design without manual editing');
  assert.equal(autoPixels.galleryMismatch, 0, 'The gallery print must include automatic SVG design');
  pass('automatic-typed-design-preview-png-and-gallery', autoPixels);
  assert.equal(await page.locator('#gallery-link').count(), 1, 'The gallery entry point must survive the studio changes');
  pass('look-chooser-and-free-study', { look: 'looks/ink-atlas' });

  const sceneFingerprint = () => page.evaluate(() => {
    const { seed, world, cast, mood, look } = window.__conjure.plan;
    return JSON.stringify({ seed, world, cast, mood, look });
  });
  const initialScene = await sceneFingerprint();
  const alternative = await page.evaluate(() => {
    const ruling = window.__conjure.plan.rulings.find((item) => item.owner === 'design' && item.name === 'motif');
    return ruling.options.find((option) => option.label !== ruling.picked).label;
  });
  const motifRow = page.locator('[data-decision-key="design::motif"]');
  assert.equal(await motifRow.count(), 1, 'The decision tree must display the SVG motif question');
  const designBranch = page.locator('#tree > ul > li > details').filter({ has: motifRow });
  if (!await designBranch.evaluate((branch) => branch.open)) await designBranch.locator(':scope > summary').click();
  await motifRow.locator('button.answer').filter({ has: page.locator('span', { hasText: new RegExp(`^${alternative.replace(/-/g, ' ')}$`) }) }).click();
  await ready();
  const pinnedDesign = await assertAutomaticStack();
  assert.equal(pinnedDesign.answers.motif, alternative);
  assert.notDeepEqual(pinnedDesign.layers, initialDesign.layers, 'Pinning another design answer must rebuild the layer stack');
  assert.equal(await sceneFingerprint(), initialScene, 'Design branching must preserve the scene decisions');
  assert.equal(await page.locator('[data-decision-key="design::motif"] button.pinned').count(), 1);
  await page.getByRole('button', { name: /^Release 1 pinned$/ }).click();
  await ready();
  assert.deepEqual(await design(), initialDesign, 'Releasing a pin must restore the same seeded design');
  pass('design-tree-branch-and-release');

  await page.locator('#first').click(); await ready();
  const firstDesign = await design();
  await page.locator('#first').click(); await ready();
  assert.deepEqual(await design(), firstDesign, 'Repeating first choices at the same roll must keep exactly the same design');
  await page.locator('#again').click(); await ready();
  const rerolled = await assertAutomaticStack();
  assert.notEqual(rerolled.layers[0].seed, firstDesign.layers[0].seed, 'Roll again must generate the new roll\'s seeded design');
  await page.locator('#first').click(); await ready();
  const rolledFirst = await design();
  await page.locator('#first').click(); await ready();
  assert.deepEqual(await design(), rolledFirst, 'The new roll must also repeat exactly when its settings are unchanged');
  pass('automatic-design-roll-and-first-choice-reproducibility');

  for (const recipe of ['moon', 'herbarium', 'signal', 'terrain']) {
    await mutate(() => page.locator(`[data-layer-recipe="${recipe}"]`).click());
    assert.ok(await rows().count() >= 2, `${recipe} must provide a layered starting point`);
    await download('#save-svg', `${recipe}-vectors.svg`);
    const svg = await parseSvg(readFileSync(`${out}/${recipe}-vectors.svg`, 'utf8'));
    assert.ok(svg.valid && svg.shapes > 0 && svg.images.length === 0 && svg.unsafe === 0, `${recipe} must generate valid editable vectors`);
    await page.locator('.frame').screenshot({ path: `${out}/recipe-${recipe}.png` });
  }
  pass('four-vector-recipes');

  const originalIds = await rowIds();
  const originalSvg = await svgText();
  const movingId = originalIds[1];
  await mutate(() => page.locator(`[data-layer-id="${movingId}"] [data-layer-action="up"]`).click());
  const movedIds = await rowIds();
  assert.notDeepEqual(movedIds, originalIds, 'Reordering must change stack order');
  assert.notEqual(await svgText(), originalSvg, 'Reordering must change the SVG paint order');
  await mutate(() => page.locator(`[data-layer-id="${movingId}"] [data-layer-action="down"]`).click());
  assert.deepEqual(await rowIds(), originalIds);
  assert.equal(await svgText(), originalSvg, 'Moving back must reproduce exactly the same SVG');
  await mutate(() => page.locator(`[data-layer-id="${movingId}"] [data-layer-action="toggle"]`).click());
  assert.notEqual(await svgText(), originalSvg, 'Hiding a layer must alter rendered vectors');
  await mutate(() => page.locator(`[data-layer-id="${movingId}"] [data-layer-action="toggle"]`).click());
  assert.equal(await svgText(), originalSvg, 'Showing a layer must restore its generated geometry');
  pass('layer-visibility-and-paint-order');

  await mutate(() => page.locator(`[data-layer-id="${movingId}"] [data-layer-action="select"]`).click());
  const seed = await page.locator('[data-layer-field="seed"]').inputValue();
  await setField('seed', Number(seed) + 17);
  assert.notEqual(await svgText(), originalSvg, 'A new seed must alter the composition');
  await setField('seed', seed);
  assert.equal(await svgText(), originalSvg, 'The same seed must reproduce the same vectors');
  const opacity = await page.locator('[data-layer-field="opacity"]').evaluate((input) => ({ max: Number(input.max || 1), value: input.value }));
  await setField('opacity', opacity.max * 0.37);
  assert.notEqual(await svgText(), originalSvg, 'Opacity must affect generated SVG');
  await setField('color', '#ed452b');
  await setField('accent', '#163faa');
  const editedSvg = await svgText();
  assert.match(editedSvg.toLowerCase(), /#ed452b/);
  assert.match(editedSvg.toLowerCase(), /#163faa/);
  pass('seed-reproducibility-opacity-and-colors');

  const initialShapeCount = (await inspectLayer(editedSvg, movingId)).shapes;
  await setField('density', 0.9);
  assert.notEqual((await inspectLayer(await svgText(), movingId)).shapes, initialShapeCount, 'Density must change generated mark count');
  await setField('scale', 1.4);
  await setField('rotation', 45);
  await setField('blend', 'screen');
  await setField('placement', 'subject');
  const subject = await inspectLayer(await svgText(), movingId);
  assert.match(subject.transform, /rotate\(45\) scale\(1\.4\)/);
  assert.match(subject.blend, /mix-blend-mode:screen/);
  assert.match(subject.clip, /-subject\)/);
  assert.ok(subject.mask.length > 20, 'Subject placement needs a nonempty captured silhouette');
  await setField('placement', 'background');
  const background = await inspectLayer(await svgText(), movingId);
  assert.match(background.clip, /-background\)/);
  assert.equal(background.mask, `M0 0H720V720H0Z${subject.mask}`, 'Background placement must cut the same subject silhouette from the frame');
  assert.equal(background.rule, 'evenodd');
  // Leave a readable layered composition for screenshots and export verification.
  await setField('density', 0.5);
  await setField('scale', 1);
  await setField('rotation', 0);
  await setField('blend', 'multiply');
  await setField('placement', 'all');
  assert.equal(await svgText(), editedSvg, 'Restoring design controls must restore the exact same SVG');
  pass('density-transform-blend-and-captured-placement');

  const count = await rows().count();
  const motif = await page.locator('#layer-motif option').first().getAttribute('value');
  await page.locator('#layer-motif').selectOption(motif);
  await mutate(() => page.locator('#layer-add').click());
  assert.equal(await rows().count(), count + 1);
  const addedId = (await rowIds()).find((id) => !originalIds.includes(id));
  assert.ok(addedId);
  await mutate(() => page.locator(`[data-layer-id="${addedId}"] [data-layer-action="remove"]`).click());
  assert.equal(await rows().count(), count);
  assert.equal(await svgText(), editedSvg, 'Removing the added layer must leave earlier edits intact');
  pass('add-and-remove-layer');

  assert.match(await download('#save-svg', 'vectors.svg'), /\.svg$/);
  const vectors = await parseSvg(readFileSync(`${out}/vectors.svg`, 'utf8'));
  assert.ok(vectors.valid && vectors.shapes > 0);
  assert.equal(vectors.images.length, 0, 'Transparent SVG export must contain vectors without a raster backdrop');
  assert.equal(vectors.unsafe, 0);
  assert.ok(vectors.namedGroups.filter((group) => group.name).length >= count, 'Editable vector layers need named groups');
  assert.match(await download('#save-artwork-svg', 'artwork.svg'), /\.svg$/);
  const artwork = await parseSvg(readFileSync(`${out}/artwork.svg`, 'utf8'));
  assert.ok(artwork.valid);
  assert.equal(artwork.images.length, 1, 'Artwork SVG should embed the base print once');
  assert.match(artwork.images[0], /^data:image\/png;base64,/);
  assert.ok(artwork.namedGroups.length >= vectors.namedGroups.length);
  pass('transparent-and-composed-svg-downloads', { groups: vectors.namedGroups.length });

  if (await page.locator('#layers-toggle').getAttribute('aria-pressed') !== 'true') await mutate(() => page.locator('#layers-toggle').click());
  assert.match(await download('#save-picture', 'layered-print.png'), /print-roll-\d+\.png$/);
  await page.locator('#layers-toggle').click();
  await download('#save-picture', 'plain-print.png');
  const pixels = await page.evaluate(async ([layered, plain, composition]) => {
    const read = async (source, vector = false) => {
      const url = vector ? URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' })) : null;
      const image = new Image(); image.src = url || `data:image/png;base64,${source}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      if (url) URL.revokeObjectURL(url);
      return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
    };
    const a = await read(layered); const b = await read(plain); const c = await read(composition, true);
    let changed = 0;
    let svgMismatch = 0;
    for (let i = 0; i < a.data.length; i += 4) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) changed++;
    for (let i = 0; i < a.data.length; i++) if (a.data[i] !== c.data[i]) svgMismatch++;
    return { width: a.width, height: a.height, changed, svgMismatch };
  }, [...['layered-print.png', 'plain-print.png'].map((name) => readFileSync(`${out}/${name}`).toString('base64')), readFileSync(`${out}/artwork.svg`, 'utf8')]);
  assert.deepEqual([pixels.width, pixels.height], [720, 720]);
  assert.ok(pixels.changed > 100, 'PNG export must include the visible vector overlay');
  assert.equal(pixels.svgMismatch, 0, 'Artwork SVG and PNG exports must preserve exactly the same appearance, including blending');
  await mutate(() => page.locator('#layers-toggle').click());
  const beforeToggle = await svgText();
  await page.locator('#show-scene').click();
  assert.equal(await page.locator('.frame').evaluate((frame) => frame.classList.contains('printed')), false);
  await page.locator('#show-print').click();
  assert.equal(await svgText(), beforeToggle, 'Scene/Print must retain the editable layer stack');
  await page.screenshot({ path: `${out}/desktop.png`, fullPage: true });
  pass('layered-png-and-scene-print-preservation', pixels);

  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'The mobile layer studio overflows horizontally');
  await page.locator('#layer-lab').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/mobile.png`, fullPage: true });
  pass('mobile-layer-studio');

  await page.setViewportSize({ width: 1360, height: 1000 });
  const manualIds = await rowIds();
  await study('looks/chromatic-darkroom', async () => {
    assert.equal(await page.locator('#svg-overlay').getAttribute('src'), null, 'Starting another study must release the old preview');
    assert.equal(await page.locator('.frame').evaluate((frame) => frame.classList.contains('layered')), false, 'Old layers must not cover a scene while its next print develops');
  });
  await assertAutomaticStack();
  assert.notDeepEqual(await rowIds(), manualIds, 'A new generation must replace manual recipes with its current typed design');
  assert.ok((await parseSvg(await svgText())).valid);
  pass('second-new-look-study', { look: 'looks/chromatic-darkroom' });
  await page.locator('#layers-clear').click();
  assert.equal(await rows().count(), 0);
  pass('clear-stack');
  const query = new URLSearchParams({ offline: '', idea: 'A teapot with lunar field notes', world: 'worlds/worktable', cast: 'things/teapot', look: 'looks/ink-atlas', t: '1', roll: '2' });
  await page.goto(`${base}/?${query}`);
  await ready();
  await assertAutomaticStack();
  assert.equal(await page.locator('.frame').evaluate((frame) => frame.classList.contains('printed') && frame.classList.contains('layered')), true);
  assert.equal(await page.evaluate(() => window.__conjure.plan.look.entry.id), 'looks/ink-atlas');
  assert.ok((await parseSvg(await svgText())).valid);
  pass('look-url-with-automatic-design');
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(modelRequests, 0, 'Layer studio QA attempted a paid model request');
  writeFileSync(`${out}/browser-report.json`, JSON.stringify({ passed: true, modelRequests, reports }, null, 2) + '\n');
  console.log(`All ${reports.length} layer studio checks passed. No model requests. Evidence: ${out}/.`);
} finally { await browser.close(); }
