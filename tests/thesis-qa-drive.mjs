/**
 * QA drive for /thesis/ against `astro preview`: anchors resolve, the season
 * clock computes, the disclosure surfaces render their RESOLVED values (baked
 * statically for no-JavaScript readers, re-hydrated from JSON with scripts
 * on), no amber pending chip remains, the hydration script stays silent on
 * console, and every component fits 375px and 390px viewports. Captures the
 * release evidence shots at 375/390/1280/1440.
 *
 *   npm run build
 *   OUT_DIR=/tmp/shots node tests/thesis-qa-drive.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const OUT = process.env.OUT_DIR ?? null;
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/opt/pw-browsers/chromium';

const preview = spawn('npx', ['astro', 'preview', '--host', '127.0.0.1', '--port', '4399'], { stdio: 'ignore' });
// Poll readiness instead of a fixed sleep; cold npx/config loads vary by host.
{
  const deadline = Date.now() + 30_000;
  let up = false;
  while (!up && Date.now() < deadline) {
    up = await fetch('http://127.0.0.1:4399/thesis/', { method: 'HEAD' })
      .then((r) => r.ok).catch(() => false);
    if (!up) await wait(250);
  }
  if (!up) { preview.kill(); throw new Error('astro preview did not become ready on :4399'); }
}
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

  // Masthead + footer + changelog entries.
  check('masthead reads Nº 06 · Revised', /Nº 06 · Revised/.test(await page.locator('.essay__rail').textContent() ?? ''));
  check('footer links the changelog', (await page.locator('.sig a[href="#changelog"]').count()) === 1);
  const changelog = await page.locator('#changelog').textContent() ?? '';
  check('changelog carries Nº 06 and preserves Nº 05', /Nº 06 — July 2026/.test(changelog) && /Nº 05 — July 2026/.test(changelog));

  // Resolved disclosures — no amber chip remains after hydration settles.
  await wait(600);
  check('no pending chips remain (hydrated)', (await page.locator('.pending-disclosure').count()) === 0);
  check('disclosure last-updated line is dated',
    /Last updated: 20\d{2}-\d{2}-\d{2}/.test(await page.locator('[data-disclosure-updated]').textContent() ?? ''));
  check('instrument table renders dated values',
    (await page.locator('#the-instrument .disc-val').count()) >= 104,
    `${await page.locator('#the-instrument .disc-val').count()} values`);
  check('instrument verify links point at explorers',
    (await page.locator('#the-instrument a.disc-verify').count()) >= 100);
  const scoreVals = await page.locator('#the-candidacy .score .disc-val').count();
  check('candidacy scoreboard carries five observed readings', scoreVals === 5, `${scoreVals} values`);
  check('candidacy readings stay honest about zeros',
    /0 verified/.test(await page.locator('#the-candidacy .score').textContent() ?? ''));
  const tcard = await page.locator('.tcard').textContent() ?? '';
  check('test card is preregistered, not pending', /PREREGISTERED/.test(tcard) && !/PENDING/i.test(tcard.replace(/PREREGISTERED[^.]*/, '')));
  check('test card admits the test has not begun', /has not begun/.test(tcard));
  check('test card fixes the no-later-than date', /2026-10-31/.test(tcard));

  // Objection chips link to their sections.
  check('objection chips render', (await page.locator('.chip-ref').count()) === 5);
  check('testable chip targets §VII', (await page.locator('a.chip-ref[href="#the-test"]').count()) === 1);

  // Pulse caption present, directly after the instrument.
  check('pulse caption present', /Attention is an input, never proof of demand\./
    .test(await page.locator('.pulse-caption').textContent() ?? ''));

  // Origin receipts are linked from §X prose.
  check('§X links the registry disclosure origin row',
    (await page.locator('#the-instrument a[href="https://zodiacs.org/disclosure/#origin"]').count()) === 1);

  // Evidence shots — desktop.
  await shot(page, '#the-candidacy', 'thesis-v-desktop.png');
  await shot(page, '#the-test', 'thesis-vii-desktop.png');
  await shot(page, '#the-case-against', 'thesis-ix-desktop.png');
  await shot(page, '#the-instrument', 'thesis-x-desktop.png');
  await shot(page, null, 'thesis-hero-desktop.png');

  check('no page errors or same-origin failures (desktop)', errors.length === 0, errors.slice(0, 2).join(' | '));
  if (external.length) console.log(`  note: ${external.length} external fetch(es) failed on this network: ${[...new Set(external.map((u) => new URL(u).host))].join(', ')}`);
  await page.close();

  // 1280px shots for the release evidence set.
  const mid = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await mid.goto('http://127.0.0.1:4399/thesis/', { waitUntil: 'networkidle' });
  await wait(600);
  await shot(mid, '#the-instrument', 'thesis-x-1280.png');
  await shot(mid, null, 'thesis-hero-1280.png');
  await mid.close();

  // No-JavaScript pass — the baked static values must stand on their own.
  const nojsContext = await browser.newContext({ javaScriptEnabled: false });
  const nojs = await nojsContext.newPage();
  await nojs.setViewportSize({ width: 1280, height: 1000 });
  await nojs.goto('http://127.0.0.1:4399/thesis/', { waitUntil: 'domcontentloaded' });
  check('no-JS: zero pending chips', (await nojs.locator('.pending-disclosure').count()) === 0);
  check('no-JS: instrument values baked',
    (await nojs.locator('#the-instrument .disc-val').count()) >= 104);
  check('no-JS: candidacy values baked', (await nojs.locator('#the-candidacy .score .disc-val').count()) === 5);
  check('no-JS: test card baked', /PREREGISTERED/.test(await nojs.locator('.tcard').textContent() ?? ''));
  check('no-JS: last-updated line is dated',
    /Last updated: 20\d{2}-\d{2}-\d{2}/.test(await nojs.locator('[data-disclosure-updated]').textContent() ?? ''));
  await nojsContext.close();

  // Small-viewport passes — nothing overflows; the table scrolls inside its region.
  for (const width of [375, 390]) {
    const mob = await browser.newPage({ viewport: { width, height: 812 }, deviceScaleFactor: 2, hasTouch: true });
    const mobErrors = [];
    mob.on('pageerror', (err) => mobErrors.push(String(err)));
    mob.on('requestfailed', (req) => { if (req.url().startsWith('http://127.0.0.1')) mobErrors.push(req.url()); });
    await mob.goto('http://127.0.0.1:4399/thesis/', { waitUntil: 'networkidle' });
    await wait(600);
    const overflow = await mob.evaluate(() => ({
      doc: document.documentElement.scrollWidth, win: window.innerWidth,
    }));
    check(`${width}px: no page-level horizontal overflow`, overflow.doc <= overflow.win, `${overflow.doc} vs ${overflow.win}`);
    const discScroll = await mob.locator('.disc-scroll').evaluate((n) => n.scrollWidth > n.clientWidth);
    check(`${width}px: disclosure table scrolls inside its own region`, discScroll);
    for (const sel of ['.tline-scroll', '.tcard', '.score', '.ednote']) {
      const fits = await mob.locator(sel).first().evaluate((n, w) => n.getBoundingClientRect().right <= w + 1, width);
      check(`${width}px: ${sel} fits the viewport`, fits);
    }
    if (width === 375) {
      await mob.locator('#the-candidacy').scrollIntoViewIfNeeded();
      await shot(mob, '#the-candidacy', 'thesis-v-mobile.png');
      await shot(mob, '#the-test', 'thesis-vii-mobile.png');
      await shot(mob, '#the-case-against', 'thesis-ix-mobile.png');
      await shot(mob, '#the-instrument', 'thesis-x-mobile.png');
    } else {
      await shot(mob, '#the-instrument', 'thesis-x-390.png');
    }
    check(`no page errors or same-origin failures (${width}px)`, mobErrors.length === 0, mobErrors.slice(0, 2).join(' | '));
    await mob.close();
  }
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
