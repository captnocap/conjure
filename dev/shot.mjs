// Dev helper: open a page headlessly, wait for a title, report console errors, save a screenshot.
// usage: node shot.mjs <url> <out.png> [titlePrefix] [timeoutMs] [evalExpression]
import { chromium } from '@playwright/test';

const [url, out, title = '', timeout = '60000', expression] = process.argv.slice(2);
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (message) => {
  if (['error', 'warning'].includes(message.type())) console.log(`[${message.type()}] ${message.text().slice(0, 600)}`);
});
page.on('pageerror', (error) => console.log(`[pageerror] ${String(error.stack ?? error).slice(0, 900)}`));
const started = Date.now();
await page.goto(url);
try {
  if (title) await page.waitForFunction((prefix) => document.title.startsWith(prefix), title, { timeout: Number(timeout) });
} catch {
  console.log(`[timeout] title is "${await page.title()}" after ${Date.now() - started} ms`);
}
console.log(`title="${await page.title()}" after ${Date.now() - started} ms`);
if (expression) console.log(JSON.stringify(await page.evaluate(expression), null, 1));
await page.screenshot({ path: out });
await browser.close();
