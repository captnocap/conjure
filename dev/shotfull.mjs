// Dev helper: like shot.mjs but captures the full page at a given width.
// usage: node shotfull.mjs <url> <out.png> <titlePrefix> <timeoutMs> <width> [evalExpression]
import { chromium } from '@playwright/test';

const [url, out, title, timeout = '60000', width = '1560', expression] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } });
page.on('pageerror', (error) => console.log(`[pageerror] ${String(error.stack ?? error).slice(0, 900)}`));
page.on('console', (message) => message.type() === 'error' && console.log(`[error] ${message.text().slice(0, 500)}`));
await page.goto(url);
await page.waitForFunction((prefix) => document.title.startsWith(prefix), title, { timeout: Number(timeout) }).catch(() => console.log('[timeout]'));
if (expression) console.log(JSON.stringify(await page.evaluate(expression)));
await page.screenshot({ path: out, fullPage: true });
await browser.close();
