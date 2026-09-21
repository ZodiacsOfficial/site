/**
 * Does the live birth-chart route load any of the precision preview?
 *
 *   node docs/platform/evidence/precision-of-date/chart-route-requests.mjs \
 *     --base https://zodiacs.org --out chart-route-requests.json
 *
 * It must not: the preview is a developer surface on its own route, and an
 * ordinary chart runs on the released engine. The structural guarantee is
 * `scripts/report-bundles.mjs`, which enforces the astronomy-engine import
 * allowlist in CI; this is the observational one, against production.
 *
 * It records EVERY request the route makes, same-origin included, because
 * "no preview code" and "nothing unexpected" are different claims and only
 * the full list settles the second.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const argv = process.argv.slice(2);
const base = (argv.find((a) => a.startsWith('http')) ?? 'https://zodiacs.org').replace(/\/$/, '');
const outAt = argv.indexOf('--out');
const outPath = outAt >= 0 ? argv[outAt + 1] : null;
const exe = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();
const requests = [];
const errors = [];
page.on('request', (r) => requests.push(r.url()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${base}/birth-chart/`, { waitUntil: 'networkidle' });
// Fill what can be filled without a place lookup; the point of this check
// is which code the ROUTE loads, not a full chart computation.
const filled = await page.evaluate(() => {
  const set = (sel, v) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  return { date: set('input[type="date"]', '1990-06-15'), time: set('input[type="time"]', '14:30') };
});
await page.waitForTimeout(3000);
await browser.close();

const rel = requests.map((u) => (u.startsWith(base) ? u.slice(base.length) : u));
const preview = rel.filter((u) => u.includes('/precision-preview/'));
const offOrigin = requests.filter((u) => !u.startsWith(base));
const astro = rel.filter((u) => u.startsWith('/_astro/'));

const problems = [];
if (preview.length) problems.push(`the chart route requested preview code: ${preview.join(', ')}`);
if (errors.length) problems.push(`page errors: ${errors.join(' | ')}`);

const record = {
  base,
  route: '/birth-chart/',
  ranAt: new Date().toISOString(),
  chromium: exe,
  filled,
  totalRequests: requests.length,
  astroChunks: astro.length,
  previewRequests: preview,
  offOrigin,
  errors,
  requests: rel,
  scope: 'This establishes which code the ROUTE loads. It does not drive a '
    + 'full chart through the place lookup; Site Check does that against the built site.',
  problems,
  passed: problems.length === 0,
};
const text = `${JSON.stringify(record, null, 2)}\n`;
if (outPath) writeFileSync(outPath, text);
process.stdout.write(`${JSON.stringify({ ...record, requests: `${rel.length} recorded` }, null, 2)}\n`);
if (!record.passed) process.exitCode = 1;
