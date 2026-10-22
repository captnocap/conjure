// Dev helper: open a conjure page, wait, and print mean colours of the frame's corners and centre.
import { chromium } from '@playwright/test';
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 760, height: 760 } });
page.on('pageerror', (error) => console.log(`[pageerror] ${String(error.stack ?? error).slice(0, 900)}`));
page.on('console', (message) => message.type() === 'error' && console.log(`[error] ${message.text().slice(0, 500)}`));
await page.goto(url);
await page.waitForFunction(() => document.title.startsWith('conjure-ready'), null, { timeout: 90000 }).catch(() => console.log('[timeout]'));
console.log(JSON.stringify(await page.evaluate(() => {
  const canvas = document.querySelector('#stage');
  const probe = document.createElement('canvas'); probe.width = probe.height = 720;
  const context = probe.getContext('2d'); context.drawImage(canvas, 0, 0);
  const at = (x, y) => Array.from(context.getImageData(x, y, 1, 1).data.slice(0, 3));
  return { corner: at(20, 20), bottom: at(360, 700), centre: at(360, 360), plan: window.__conjure?.plan.cast.map((c) => c.entry.id), reports: window.__conjure?.reports };
})));
await page.locator('#stage').screenshot({ path: out });
await browser.close();
