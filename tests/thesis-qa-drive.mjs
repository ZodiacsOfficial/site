/**
 * QA drive for /thesis/ against `astro preview`: anchors resolve, the
 * season clock computes, pending chips stand (JSON all-pending), the
 * hydration script stays silent on console, and every new component
 * fits a 375px viewport. Captures the PR evidence shots.
 *
 *   npm run build
 *   OUT_DIR=/tmp/shots node tests/thesis-qa-drive.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const OUT = process.env.OUT_DIR ?? null;
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/opt/pw-browsers/chromium';

const preview = spawn('npx', ['astro', 'preview', '--port', '4399'], { stdio: 'ignore' });
await wait(2500);
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); };
const shot = async (page, sel, path) => {
  if (!OUT) return;
  if (sel) await page.locator(sel).screenshot({ path: `${OUT}/${path}` }).catch(() => {});
  else await page.screenshot({ path: `${OUT}/${path}` }).catch(() => {});
};

try {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  // Script errors and same-origin load failures are page defects; external
  // fetch failures (the Pulse's live Wikimedia refresh) depend on the
  // network the drive runs on and are reported separately, not failed on.
  const errors = [];
  const external = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('requestfailed', (req) => {
    (req.url().startsWith('http://127.0.0.1') ? errors : external).push(req.url());
  });
  await page.goto('http://127.0.0.1:4399/thesis/', { waitUntil: 'networkidle' });

  // Anchors resolve.
  for (const id of ['the-system', 'attention', 'pulse', 'belief-pays', 'belief-becomes-record',
    'the-candidacy', 'what-holding-means', 'the-test', 'why-solana-why-base',
    'the-case-against', 'the-instrument', 'the-slower-bet', 'changelog', 'essay']) {
    check(`anchor #${id} resolves`, (await page.locator(`[id="${id}"]`).count()) === 1);
  }

  // Season clock computed from the embedded ingress table.
  const clock = await page.locator('[data-season-clock]').textContent();
  check('season clock renders', /season · day \d+ of \d+/.test(clock ?? ''), clock ?? '(hidden)');

  // Masthead + footer + changelog link.
  check('masthead reads Nº 05 · Revised', /Nº 05 · Revised/.test(await page.locator('.essay__rail').textContent() ?? ''));
  check('footer links the changelog', (await page.locator('.sig a[href="#changelog"]').count()) === 1);

  // All-pending JSON → every chip still pending after hydration settles.
  await wait(600);
  const chips = await page.locator('.pending-disclosure').count();
  check('pending chips stand with all-pending JSON', chips >= 110, `${chips} chips`);
  check('disclosure last-updated line is honest',
    /no disclosures published yet/.test(await page.locator('[data-disclosure-updated]').textContent() ?? ''));

  // Objection chips link to their sections.
  check('objection chips render', (await page.locator('.chip-ref').count()) === 5);
  check('testable chip targets §VII', (await page.locator('a.chip-ref[href="#the-test"]').count()) === 1);

  // Pulse caption present, directly after the instrument.
  check('pulse caption present', /Attention is an input, never proof of demand\./
    .test(await page.locator('.pulse-caption').textContent() ?? ''));

  // Evidence shots — desktop.
  await shot(page, '#the-candidacy', 'thesis-v-desktop.png');
  await shot(page, '#the-case-against', 'thesis-ix-desktop.png');
  await shot(page, '#the-instrument', 'thesis-x-desktop.png');
  await shot(page, null, 'thesis-hero-desktop.png');

  check('no page errors or same-origin failures (desktop)', errors.length === 0, errors.slice(0, 2).join(' | '));
  if (external.length) console.log(`  note: ${external.length} external fetch(es) failed on this network: ${[...new Set(external.map((u) => new URL(u).host))].join(', ')}`);
  await page.close();

  // 375px pass — nothing overflows; the table scrolls inside its region.
  const mob = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, hasTouch: true });
  const mobErrors = [];
  mob.on('pageerror', (err) => mobErrors.push(String(err)));
  mob.on('requestfailed', (req) => { if (req.url().startsWith('http://127.0.0.1')) mobErrors.push(req.url()); });
  await mob.goto('http://127.0.0.1:4399/thesis/', { waitUntil: 'networkidle' });
  await wait(600);
  const overflow = await mob.evaluate(() => ({
    doc: document.documentElement.scrollWidth, win: window.innerWidth,
  }));
  check('375px: no page-level horizontal overflow', overflow.doc <= overflow.win, `${overflow.doc} vs ${overflow.win}`);
  const discScroll = await mob.locator('.disc-scroll').evaluate((n) => n.scrollWidth > n.clientWidth);
  check('375px: disclosure table scrolls inside its own region', discScroll);
  for (const sel of ['.tline-scroll', '.tcard', '.score', '.ednote']) {
    const fits = await mob.locator(sel).first().evaluate((n, w) => n.getBoundingClientRect().right <= w + 1, 375);
    check(`375px: ${sel} fits the viewport`, fits);
  }
  await mob.locator('#the-candidacy').scrollIntoViewIfNeeded();
  await shot(mob, '#the-candidacy', 'thesis-v-mobile.png');
  await shot(mob, '#the-case-against', 'thesis-ix-mobile.png');
  await shot(mob, '#the-instrument', 'thesis-x-mobile.png');
  check('no page errors or same-origin failures (375px)', mobErrors.length === 0, mobErrors.slice(0, 2).join(' | '));
  await mob.close();
  await browser.close();
} finally {
  preview.kill();
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  · ${r.detail.slice(0, 80)}` : ''}`);
}
console.log(failed ? `\n${failed} FAILURES` : '\nALL PASS');
process.exit(failed ? 1 : 0);
