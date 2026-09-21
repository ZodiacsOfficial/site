import { chromium } from 'playwright-core';
const URL_ = process.argv[2] ?? 'http://127.0.0.1:8791/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
const net = [];
page.on('request', (r) => { if (!r.url().startsWith(URL_)) net.push(r.url()); });
const errors = [];
const failed = [];
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(URL_, { waitUntil: 'networkidle' });
console.log('title:', await page.title());
console.log('browser:', browser.version());

// The refusal cases are the contract: every one must refuse.
await page.click('#refusals');
await page.waitForSelector('#refusal-out table tr:nth-child(6)', { timeout: 20000 });
const rows = await page.$$eval('#refusal-out table tr', (trs) => trs.slice(1).map((tr) => tr.children[0].textContent + ' -> ' + tr.children[1].textContent));
console.log('\nrefusal cases:');
for (const r of rows) console.log('  ' + r);

// Precision without a pack must refuse rather than silently use the light path.
await page.click('#run');
await page.waitForFunction(() => document.getElementById('compare-state').textContent.length > 12, null, { timeout: 20000 });
console.log('\ncompare with no pack:', await page.textContent('#compare-state'));

// Responsiveness and real cancellation.
await page.click('#bench');
await page.waitForFunction(() => /…/.test(document.getElementById('bench-state').textContent), null, { timeout: 20000 });
const t0 = Date.now();
await page.click('#cancel');           // main thread must accept input mid-run
const clickMs = Date.now() - t0;
await page.waitForFunction(() => /cancelled|charts of/.test(document.getElementById('bench-state').textContent), null, { timeout: 30000 });
console.log('\nmid-run cancel accepted in', clickMs, 'ms ->', await page.textContent('#bench-state'));

console.log('\noff-origin network requests:', net.length === 0 ? 'none' : net);
console.log('page errors:', errors.length === 0 ? 'none' : errors);
console.log('failed requests:', failed.length === 0 ? 'none' : failed);
await browser.close();
