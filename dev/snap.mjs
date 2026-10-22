// Dev helper: conjure an idea in a headless browser and save the scene and the print as PNGs.
// usage: node dev/snap.mjs "<idea>" <out-prefix> [extra query, e.g. "t=1&roll=2&offline"]
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const [idea, prefix, extra = ''] = process.argv.slice(2);
const base = process.env.CONJURE_URL ?? 'http://127.0.0.1:3400';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
const page = await browser.newPage({ viewport: { width: 1320, height: 900 } });
page.on('pageerror', (error) => console.log(`[pageerror] ${String(error.stack ?? error).slice(0, 700)}`));
page.on('console', (message) => message.type() === 'error' && console.log(`[error] ${message.text().slice(0, 400)}`));
await page.goto(`${base}/?idea=${encodeURIComponent(idea)}${extra ? `&${extra}` : ''}`);
await page.waitForFunction(() => document.title.startsWith('conjure-'), null, { timeout: 180000 }).catch(() => console.log('[timeout]'));
const summary = await page.evaluate(() => {
  const state = window.__conjure;
  return {
    status: document.querySelector('#status').textContent,
    ledger: document.querySelector('#ledger').textContent,
    world: state && [state.plan.world.entry.id, state.plan.world.answers],
    cast: state?.plan.cast.map((member) => [member.entry.id, Math.round(member.belongs * 100), member.answers]),
    look: state?.notes,
    design: state?.plan.design?.notes,
    failed: state?.reports.filter((report) => report.error),
  };
});
console.log(JSON.stringify(summary));
if (await page.title() !== 'conjure-ready') throw new Error('The scene did not finish; no pictures were saved.');
const data = await page.locator('#stage').evaluate((canvas) => canvas.toDataURL('image/png'));
writeFileSync(`${prefix}-scene.png`, Buffer.from(data.split(',')[1], 'base64'));
// Use the same composed print as the studio; the underlying #print canvas is only its base.
await page.locator('#show-print').click();
const [print] = await Promise.all([page.waitForEvent('download'), page.locator('#save-picture').click()]);
await print.saveAs(`${prefix}-print.png`);
} finally {
await browser.close();
}
