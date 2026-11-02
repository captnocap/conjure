/**
 * Offline render coverage, lifecycle and geometry sensitivity. No model/API calls.
 * CONJURE_URL=http://127.0.0.1:3402 node dev/atelier-check.mjs
 *   --only section-ribs,wholetoning --scenes tabletop --skip-lifecycle --skip-geometry
 *   --timeout-ms 120000 --out .data/atelier-check
 *   --materials-only (22 source shaders on the same teapot, with disposal checks)
 *   --materials (also check materials after the styles)
 *   --finishes (two geometry studies through each existing finish, once per run)
 *   --images section-ribs,chromatic-shadows (export successful 720×720 canvases to images/)
 * Run one browser at a time on the shared software-rendering host.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function parseArgs(args) {
  const options = { materials: false, styles: true, finishes: false, scenes: ['tabletop', 'room', 'street'], only: null, images: [], lifecycle: true, geometry: true, timeout: 120000, out: '.data/atelier-check' };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--finishes') options.finishes = true;
    else if (arg === '--materials') options.materials = true;
    else if (arg === '--materials-only') { options.materials = true; options.styles = false; }
    else if (arg === '--skip-lifecycle') options.lifecycle = false;
    else if (arg === '--skip-geometry') options.geometry = false;
    else if (['--scenes', '--only', '--images', '--timeout-ms', '--out'].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw Error(`Missing value for ${arg}.`);
      if (arg === '--scenes') options.scenes = value.split(',');
      else if (arg === '--only') options.only = value.split(',');
      else if (arg === '--images') options.images = value.split(',');
      else if (arg === '--timeout-ms') options.timeout = Number(value);
      else options.out = value;
    } else throw Error(`Unknown argument: ${arg}`);
  }
  if (!options.scenes.length || options.scenes.some((scene) => !['tabletop', 'room', 'street', 'perspective', 'topology'].includes(scene))) throw Error('Choose --scenes tabletop,room,street,perspective,topology.');
  if (new Set(options.scenes).size !== options.scenes.length) throw Error('Do not repeat scenes.');
  if (!Number.isFinite(options.timeout) || options.timeout < 1000) throw Error('--timeout-ms must be at least 1000.');
  if (options.only?.some((id) => !/^[a-z0-9-]+$/.test(id))) throw Error('Invalid style id.');
  if (options.images.some((id) => !/^[a-z0-9-]+$/.test(id))) throw Error('Invalid image style id.');
  if (new Set(options.images).size !== options.images.length) throw Error('Do not repeat image styles.');
  if (options.images.length && !options.styles) throw Error('--images requires style rendering.');
  if (options.only && options.images.some((id) => !options.only.includes(id))) throw Error('Every --images style must be included in --only.');
  return options;
}

export async function run(args = process.argv.slice(2)) {
  const options = parseArgs(args), base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
  const directory = resolve(options.out);
  mkdirSync(directory, { recursive: true });
  if (options.images.length) mkdirSync(`${directory}/images`, { recursive: true });
  const report = { started: new Date().toISOString(), base, options, scenes: [], blockedRequests: [], pageErrors: [], requestFailures: [], httpErrors: [], workerEvents: [], completed: false };
  const save = () => writeFileSync(`${directory}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let failures = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
    let activeCall = { method: 'navigation', argument: base, started: new Date().toISOString() };
    page.setDefaultTimeout(options.timeout);
    page.on('pageerror', (error) => { report.pageErrors.push(error.message); save(); });
    page.on('crash', () => { report.pageErrors.push(`Browser page crashed at ${new Date().toISOString()}.`); save(); });
    // Telemetry includes deliberate lifecycle cancellations, so it is evidence rather
    // than an independent failure count. Render errors are never retried or suppressed.
    page.on('requestfailed', (request) => {
      report.requestFailures.push({ at: new Date().toISOString(), url: request.url(), method: request.method(), resourceType: request.resourceType(), errorText: request.failure()?.errorText, operation: activeCall });
      save();
    });
    page.on('response', (response) => {
      if (response.status() < 400 || !new URL(response.url()).pathname.startsWith('/atelier/')) return;
      report.httpErrors.push({ at: new Date().toISOString(), url: response.url(), status: response.status(), statusText: response.statusText(), operation: activeCall });
      save();
    });
    page.on('worker', (worker) => {
      const operation = activeCall;
      report.workerEvents.push({ at: new Date().toISOString(), event: 'created', url: worker.url(), operation });
      worker.on('close', () => { report.workerEvents.push({ at: new Date().toISOString(), event: 'closed', url: worker.url(), operation }); save(); });
      save();
    });
    // Reject any attempt to consult a provider or write a gallery item, even if a future
    // fixture accidentally loses its offline/plain options.
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      if (request.method() !== 'GET') {
        report.blockedRequests.push(`${request.method()} ${request.url()}`);
        await route.abort('blockedbyclient'); save();
      } else await route.continue();
    });
    await page.route('**/@vite/client', (route) => route.fulfill({ contentType: 'text/javascript', body: `export function createHotContext(){return{data:{},accept(){},acceptExports(){},dispose(){},prune(){},decline(){},invalidate(){},on(){},off(){},send(){}}}export function injectQuery(url){return url}` }));
    await page.goto(`${base}/dev/atelier-check.html`);
    await page.waitForFunction(() => document.title === 'atelier-check-ready');
    const catalogue = await page.evaluate(() => window.__atelierCheck.styles);
    const ids = options.only ?? catalogue.map((style) => style.id);
    const unknown = [...new Set([...ids, ...options.images])].filter((id) => !catalogue.some((style) => style.id === id));
    if (unknown.length) throw Error(`Unknown studies: ${unknown.join(', ')}`);
    report.catalogue = catalogue;
    const call = async (method, argument) => {
      const token = `run-${Date.now()}-${method}`;
      activeCall = { method, argument, token, started: new Date().toISOString() };
      await page.evaluate(({ method, argument, token }) => {
        window.__atelierPending = { token, done: false };
        Promise.resolve(window.__atelierCheck[method](argument)).then(
          (value) => { window.__atelierPending = { token, done: true, value }; },
          (error) => { window.__atelierPending = { token, done: true, error: window.__atelierCheck.errorDetails(error) }; },
        );
      }, { method, argument, token });
      await page.waitForFunction((token) => window.__atelierPending?.token === token && window.__atelierPending.done, token, { timeout: options.timeout });
      const result = await page.evaluate(() => window.__atelierPending);
      if (result.error) throw Object.assign(Error(`${method}: ${result.error.name}: ${result.error.message}`), { renderError: result.error });
      return result.value;
    };
    let finishesChecked = false, fixtureHealthy = true;
    for (const name of options.styles ? options.scenes : []) {
      const entry = { name, fixture: null, lifecycle: [], geometry: [], renders: [], teardown: null };
      report.scenes.push(entry);
      try {
        entry.fixture = await call('start', name);
        failures += entry.fixture.problems.length;
        console.log(`${name}: ${entry.fixture.geometry?.meshes ?? 0} meshes, ${entry.fixture.geometry?.triangles ?? 0} triangles, identities ${entry.fixture.identities.join(', ')}`);
        for (const problem of entry.fixture.problems) console.log(`  FAIL fixture: ${problem}`);
        if (options.lifecycle) {
          entry.lifecycle = await call('lifecycle');
          failures += entry.lifecycle.filter((result) => !result.passed).length;
          for (const result of entry.lifecycle) console.log(`${result.passed ? 'pass' : 'FAIL'}  ${name} / ${result.check}: ${result.detail}`);
          save();
        }
        for (const id of ids) {
          const result = await call('render', id);
          if (!result.problems.length && options.images.includes(id)) {
            try {
              // Export the already-rendered bitmap, never the CSS-scaled figure or browser chrome.
              const dataUrl = await page.locator(`#sheet figure[data-style="${id}"] canvas`).evaluate((canvas) => {
                if (!(canvas instanceof HTMLCanvasElement) || canvas.width !== 720 || canvas.height !== 720) throw Error('Expected a 720×720 render canvas.');
                return canvas.toDataURL('image/png');
              });
              if (!dataUrl.startsWith('data:image/png;base64,')) throw Error('Canvas did not return PNG data.');
              result.image = `images/${name}--${id}.png`;
              writeFileSync(`${directory}/${result.image}`, Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64'));
            } catch (error) {
              delete result.image;
              result.problems.push(`PNG export failed: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
          entry.renders.push(result);
          failures += result.problems.length;
          console.log(`${result.problems.length ? 'FAIL' : 'pass'}  ${name} / ${id}: ${result.milliseconds} ms${result.problems.length ? ` — ${result.problems.join('; ')}` : ''}`);
          save();
        }
        if (options.finishes && !finishesChecked && (['tabletop', 'topology'].includes(name) || !options.scenes.some((scene) => ['tabletop', 'topology'].includes(scene)))) {
          entry.finishes = [];
          for (const id of ['finite-lenses', 'ink-completed-mix', 'fluted-glass']) {
            const result = await call('finishComposition', id);
            entry.finishes.push(result); failures += result.problems.length;
            console.log(`${result.problems.length ? 'FAIL' : 'pass'}  ${name} / geometry mix + ${id}: ${result.milliseconds} ms${result.problems.length ? ` — ${result.problems.join('; ')}` : ''}`);
            save();
          }
          finishesChecked = true;
        }
        if (name === 'topology') {
          entry.captureSlots = await call('captureSlots');
          failures += entry.captureSlots.problems.length;
          console.log(`${entry.captureSlots.problems.length ? 'FAIL' : 'pass'}  ${name} / mixed material slot capture: ${entry.captureSlots.milliseconds} ms${entry.captureSlots.problems.length ? ` — ${entry.captureSlots.problems.join('; ')}` : ''}`);
          save();
        }
        await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true });
        if (options.geometry) {
          const geometryIds = ['sections', 'voxels', 'surface-dots', 'thickness-exposure', 'section-ribs', 'single-cutaway', 'interior-lattice', 'chromatic-shadows'].filter((id) => ids.includes(id));
          // Geometry tests need two cold solves each. Give each an independent deadline.
          for (const id of geometryIds) {
            const results = await call('geometrySensitivity', [id]);
            entry.geometry.push(...results);
            failures += results.filter((result) => !result.passed).length;
            for (const result of results) console.log(`${result.passed ? 'pass' : 'FAIL'}  ${name} / geometry ${result.id}: ${result.detail ?? `${(result.changedFraction * 100).toFixed(2)}% changed`}`);
            save();
          }
        }
        entry.teardown = await call('finish');
        failures += entry.teardown.problems.length;
      } catch (error) {
        entry.error = error instanceof Error ? error.message : String(error);
        if (error?.renderError) entry.errorDetails = error.renderError;
        failures++;
        await page.screenshot({ path: `${directory}/${name}-interrupted.png`, fullPage: true }).catch(() => {});
        console.log(`FAIL  ${name}: ${entry.error}`);
        // Unknown running state after a timeout must not share a worker with another fixture.
        fixtureHealthy = false;
        break;
      }
      save();
    }
    if (options.materials && fixtureHealthy) {
      report.materials = { fixture: await call('startMaterials'), renders: [] };
      for (const id of report.materials.fixture.materials) {
        const result = await call('renderMaterial', id);
        report.materials.renders.push(result);
        failures += result.problems.length;
        console.log(`${result.problems.length ? 'FAIL' : 'pass'}  material / ${id}: ${result.milliseconds} ms${result.problems.length ? ` — ${result.problems.join('; ')}` : ''}`);
        save();
      }
      const memoryBefore = report.materials.renders.at(-1)?.memory;
      report.materials.repeats = [];
      for (let round = 0; round < 2; round++) for (const id of ['atelier-frosted-glass', 'atelier-woven-linen', 'atelier-perlage-metal']) {
        const result = await call('renderMaterial', { id, repeat: true });
        if (memoryBefore && (result.memory.textures > memoryBefore.textures || result.memory.geometries > memoryBefore.geometries)) result.problems.push('Renderer resources grew on a repeated material cycle.');
        report.materials.repeats.push(result); failures += result.problems.length;
        console.log(`${result.problems.length ? 'FAIL' : 'pass'}  material repeat${round + 1} / ${id}: ${result.milliseconds} ms${result.problems.length ? ` — ${result.problems.join('; ')}` : ''}`);
        save();
      }
      await page.screenshot({ path: `${directory}/materials.png`, fullPage: true });
    }
    failures += report.blockedRequests.length + report.pageErrors.length;
    report.completed = report.scenes.length === (options.styles ? options.scenes.length : 0) && report.scenes.every((scene) => !scene.error && scene.renders.length === ids.length);
  } catch (error) {
    report.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    if (error?.renderError) report.errorDetails = error.renderError;
    failures++;
    console.log(`FAIL  harness: ${report.error}`);
  } finally {
    await browser.close();
    report.finished = new Date().toISOString();
    report.failures = failures;
    save();
  }
  console.log(`\n${failures ? `${failures} failed checks` : 'All checks passed'}. Evidence: ${directory}`);
  return failures ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run().then((code) => { process.exitCode = code; }, (error) => { console.error(error); process.exitCode = 1; });
}
