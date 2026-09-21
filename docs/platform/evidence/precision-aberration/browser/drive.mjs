/**
 * Drive the isolated browser example in a real browser and record what it
 * produced. Reads `window.ABERRATED_EXAMPLE`, not the rendered HTML: the
 * page's own formatting must not be able to stand in for a measurement.
 *
 *   node serve.mjs 8793 &
 *   node drive.mjs http://127.0.0.1:8793/ --out browser-run.json
 */
import { writeFileSync } from 'node:fs';
import { chromium, firefox } from 'playwright-core';

const argv = process.argv.slice(2);
const base = argv.find((a) => a.startsWith('http')) ?? 'http://127.0.0.1:8793/';
const outAt = argv.indexOf('--out');
const outPath = outAt >= 0 ? argv[outAt + 1] : null;
const only = argv.includes('--browsers') ? argv[argv.indexOf('--browsers') + 1].split(',') : ['chromium'];

const ENGINES = {
  chromium: { type: chromium, executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' },
  firefox: { type: firefox, executablePath: process.env.FIREFOX_PATH ?? '/opt/pw-browsers/firefox-1532/firefox/firefox' },
};

const record = { base, runs: [] };
for (const name of only) {
  const engine = ENGINES[name];
  if (!engine) throw new Error(`unknown browser ${name}`);
  const browser = await engine.type.launch({ executablePath: engine.executablePath });
  const page = await browser.newPage();
  const offOrigin = [];
  const failed = [];
  const errors = [];
  page.on('request', (r) => { if (!r.url().startsWith(base)) offOrigin.push(r.url()); });
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  const started = Date.now();
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.done === '1', null, { timeout: 60000 });
  const result = await page.evaluate(() => window.ABERRATED_EXAMPLE);
  record.runs.push({
    browser: name,
    version: browser.version(),
    title: await page.title(),
    wallMs: Date.now() - started,
    offOriginRequests: offOrigin,
    failedRequests: failed,
    pageErrors: errors,
    result,
  });
  await browser.close();
}

// The driver's own verdict, so a run that "completed" while proving nothing
// cannot be filed as evidence.
const problems = [];
for (const run of record.runs) {
  const tag = run.browser;
  const r = run.result;
  if (!r) { problems.push(`${tag}: the page published no result`); continue; }
  if (r.error) problems.push(`${tag}: ${r.error}`);
  if (!r.ok) problems.push(`${tag}: the page's own checks did not all pass`);
  if (r.rungs.length !== 2) problems.push(`${tag}: ${r.rungs.length} rungs, expected 2`);
  for (const g of r.rungs) {
    if (!g.established) problems.push(`${tag}: ${g.mode} did not establish completeness`);
    if (!g.isExactTotal) problems.push(`${tag}: ${g.mode} did not report an exact total`);
  }
  if (!(Math.abs(r.shiftSec) > 1)) problems.push(`${tag}: the aberration moved the crossing by ${r.shiftSec} s`);
  for (const c of r.refusals) if (!c.pass) problems.push(`${tag}: ${c.what} gave ${c.got}, expected ${c.want}`);
  if (run.offOriginRequests.length) problems.push(`${tag}: ${run.offOriginRequests.length} off-origin requests`);
  if (run.failedRequests.length) problems.push(`${tag}: failed requests ${run.failedRequests.join(', ')}`);
  if (run.pageErrors.length) problems.push(`${tag}: page errors ${run.pageErrors.join(' | ')}`);
}
record.passed = problems.length === 0;
record.problems = problems;

const text = `${JSON.stringify(record, null, 2)}\n`;
if (outPath) writeFileSync(outPath, text);
process.stdout.write(text);
if (!record.passed) process.exitCode = 1;
