// Runs the conformance check for components in a headless browser.
//   npm run check                    every component
//   npm run check things/chair       one component (any number of ids)
//   npm run check -- --rolls 12      more random builds each
//   npm run check -- --max-ms 30000  a bounded timing allowance on a busy rendering host
//   npm run check -- --reuse-page    reuse a loaded catalogue between components
// Needs the dev server running (npm run dev). Contact sheets go to .data/check/.
import { chromium } from '@playwright/test';
import { mkdirSync, readdirSync, statSync } from 'node:fs';

const args = process.argv.slice(2);
const rollsAt = args.indexOf('--rolls');
const rolls = rollsAt >= 0 ? Number(args.splice(rollsAt, 2)[1]) : 6;
const timingAt = args.indexOf('--max-ms');
const maxMs = timingAt >= 0 ? Number(args.splice(timingAt, 2)[1]) : 8000;
const reuseAt = args.indexOf('--reuse-page');
const reusePage = reuseAt >= 0;
if (reusePage) args.splice(reuseAt, 1);
if (!Number.isInteger(rolls) || rolls < 1 || !Number.isFinite(maxMs) || maxMs < 1)
  throw new Error('Use a positive integer --rolls and a positive --max-ms.');
const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const all = readdirSync('components').flatMap((kind) =>
  readdirSync(`components/${kind}`)
    .filter((name) => statSync(`components/${kind}/${name}`).isDirectory())
    .map((name) => `${kind}/${name}`),
);
// Directions are words, not builds: npm test holds them to their shape and length rules.
const skipped = (args.length ? args : all).filter((id) => id.startsWith('directions/'));
if (skipped.length) console.log(`skip  ${skipped.join(', ')}: directions are checked by npm test, not built`);
const ids = (args.length ? args : all).filter((id) => !id.startsWith('directions/'));
mkdirSync('.data/check', { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failures = 0;
let sharedPage = null;
try {
for (const id of ids) {
  const page = sharedPage ?? await browser.newPage({ viewport: { width: 1300, height: 900 } });
  if (sharedPage) {
    // run() resets the title and results synchronously before its first await. The
    // previous component finished before this call, so trials cannot overlap.
    await page.evaluate((nextId) => { void window.__runCheck(nextId); }, id);
  } else {
  // Contributors publish new manifests while this runs. A catalogue update normally
  // reloads every tab, silently restarting trials; validation needs a stable module graph.
  await page.route('**/@vite/client', (route) => route.fulfill({
    contentType: 'text/javascript',
    body: `export function createHotContext() {
      return { data: {}, accept() {}, acceptExports() {}, dispose() {}, prune() {},
        decline() {}, invalidate() {}, on() {}, off() {}, send() {} };
    }
    export function injectQuery(url) { return url; }`,
  }));
  await page.goto(`${base}/dev/check.html?id=${encodeURIComponent(id)}&rolls=${rolls}&maxMs=${maxMs}`);
  }
  const finished = await page
    .waitForFunction(() => document.title === 'check-ready', null, { timeout: 60_000 + rolls * Math.max(20_000, maxMs + 5000) })
    .then(() => true, () => false);
  const trials = finished ? await page.evaluate(() => window.__check) : [{ roll: -1, milliseconds: 0, problems: ['the check page did not finish'] }];
  await page.screenshot({ path: `.data/check/${id.replace('/', '--')}.png`, fullPage: true });
  const bad = trials.filter((trial) => trial.problems.length);
  // A timeout or failed component may leave damaged state. Give its successor a
  // fresh page while preserving the original failing result and contact sheet.
  if (reusePage && finished && !bad.length) sharedPage = page;
  else { await page.close(); sharedPage = null; }
  failures += bad.length;
  const slowest = Math.max(...trials.map((trial) => trial.milliseconds));
  console.log(`${bad.length ? 'FAIL' : 'pass'}  ${id.padEnd(28)} ${trials.length} rolls, slowest ${slowest} ms`);
  for (const trial of bad) console.log(`        roll ${trial.roll}: ${trial.problems.join('; ')}`);
}
} finally {
await browser.close();
}
console.log(failures ? `\n${failures} failing rolls (timing allowance ${maxMs} ms). Contact sheets are in .data/check/.` : `\nEvery component passed (timing allowance ${maxMs} ms). Contact sheets are in .data/check/.`);
process.exit(failures ? 1 : 0);
