/**
 * Time-Lens rail drive: the lazy boundary, all four lenses, degradations,
 * ES chrome, and analytics shape — against the production build.
 *
 *   npm run build
 *   node tests/lens-drive.mjs
 *
 * The lens output is Date-dependent, so the clock is pinned (the visual
 * harness technique) and assertions are structural: rings, receipts, notes,
 * and corpus presence — not specific degrees.
 */
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const FIXED_NOW = '2026-07-13T12:00:00.000Z';
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

function chartFragment({ withTime = true } = {}) {
  const fixture = {
    d: '1907-07-06',
    z: 'America/Mexico_City',
    la: 19.35,
    lo: -99.16,
    ...(withTime ? { t: '08:30' } : {}),
    n: 'Frida Kahlo',
    p: 'Coyoacán, Mexico',
  };
  return `#c=1.${Buffer.from(JSON.stringify(fixture)).toString('base64url')}`;
}

async function preparePage(context) {
  const page = await context.newPage();
  const requests = [];
  page.on('request', (req) => requests.push(req.url()));
  await page.addInitScript((isoNow) => {
    const NativeDate = Date;
    const fixed = new NativeDate(isoNow).valueOf();
    class FixedDate extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    }
    Object.setPrototypeOf(FixedDate, NativeDate);
    globalThis.Date = FixedDate;
    window.__lensEvents = [];
    window.zodiacsAnalytics = Object.freeze({
      track: (name, props) => window.__lensEvents.push({ name, props: props ?? {} }),
    });
  }, FIXED_NOW);
  return { page, requests };
}

const lensChunkRequested = (requests) => requests.some((url) => /ChartLens/i.test(url));

await withPreview({ port: 4406 }, async (baseURL) => {
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    args: STABLE_CHROMIUM_ARGS,
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  // ── EN, timed chart: the full rail ──
  {
    const { page, requests } = await preparePage(context);
    await page.goto(`${baseURL}/birth-chart/${chartFragment()}`, { waitUntil: 'domcontentloaded' });
    const rail = page.locator('.calc__lens-rail');
    await rail.waitFor({ timeout: 30_000 });
    check('rail renders with four lenses', await page.locator('[data-lens-btn]').count() === 4);
    check('natal is the active default', await page.locator('[data-lens-btn="natal"]').getAttribute('aria-pressed') === 'true');
    check('lens chunk does not load before a lens is chosen', !lensChunkRequested(requests));
    // Interactive natal chords render a wide invisible hit twin per chord.
    const natalChords = await page.locator('svg .wheel__hit').count();

    await page.locator('[data-lens-btn="sky"]').click();
    await page.locator('.wheel__overlay').waitFor({ timeout: 30_000 });
    check('lens chunk loads on first choice', lensChunkRequested(requests));
    check('sky lens paints the outer ring', await page.locator('.wheel__overlay').count() === 1);
    check('sky intro renders', await page.locator('.lens__intro').textContent() !== '');
    check('sky ring seat is dashed (moving-sky grammar)',
      await page.locator('.wheel__overlay > circle').first().getAttribute('stroke-dasharray') !== null);
    check('trust line renders', (await page.locator('.lens__trust').textContent() ?? '').includes('computed on this device'));
    const contacts = await page.locator('[data-lens-contact]').count();
    const noneLine = await page.locator('.lens__none').count();
    check('contacts list or its empty state renders', contacts > 0 || noneLine === 1, `contacts=${contacts}`);
    if (contacts > 0) {
      await page.locator('[data-lens-contact]').first().click();
      check('a contact tap focuses its chord', await page.locator('[data-lens-contact].is-active').count() === 1);
    }

    await page.locator('[data-lens-btn="progressed"]').click();
    await page.locator('[data-lens="progressed"]').waitFor({ timeout: 30_000 });
    await page.locator('[data-lens-corpus="moon"]').waitFor({ timeout: 30_000 });
    check('progressed moon corpus line renders (EN)',
      ((await page.locator('[data-lens-corpus="moon"]').textContent()) ?? '').length > 40);
    check('progressed sun note fills degree and sign',
      /°/.test((await page.locator('[data-lens-corpus="sun"]').textContent()) ?? ''));
    check('progressed-angles honesty note renders',
      ((await page.locator('.lens__note').first().textContent()) ?? '').includes('convention'));
    check('progressed ring seat is solid (fixed-self grammar)',
      await page.locator('.wheel__overlay > circle').first().getAttribute('stroke-dasharray') === null);

    await page.locator('[data-lens-btn="return"]').click();
    await page.locator('[data-lens-receipt]').waitFor({ timeout: 30_000 });
    const receipt = (await page.locator('[data-lens-receipt]').textContent()) ?? '';
    check('return receipt shows the instant in UTC and local time',
      receipt.includes('UTC') && receipt.includes('Return instant'), receipt.trim());
    check('solar-return year line renders (EN, located chart)',
      ((await page.locator('[data-lens-corpus="sr-asc"]').textContent().catch(() => '')) ?? '').includes('The year leads with'));

    await page.locator('[data-lens-btn="natal"]').click();
    await page.waitForFunction(() => !document.querySelector('.wheel__overlay'));
    check('natal restores the wheel without an overlay', await page.locator('.wheel__overlay').count() === 0);
    const chordsBack = await page.locator('svg .wheel__hit').count();
    check('natal aspect chords return', chordsBack === natalChords && natalChords > 0, `${chordsBack}/${natalChords}`);

    const events = await page.evaluate(() => window.__lensEvents);
    const lensEvents = events.filter((e) => e.name === 'lens_change').map((e) => e.props.lens);
    check('lens_change fires per switch with the lens prop only',
      JSON.stringify(lensEvents) === JSON.stringify(['sky', 'progressed', 'return', 'natal'])
      && events.filter((e) => e.name === 'lens_change').every((e) => Object.keys(e.props).length === 1),
      JSON.stringify(lensEvents));
    check('srchart_view fires once via lens',
      events.filter((e) => e.name === 'srchart_view' && e.props.via === 'lens').length === 1);
    await page.close();
  }

  // ── EN, no birth time: degradations ──
  {
    const { page } = await preparePage(context);
    await page.goto(`${baseURL}/birth-chart/${chartFragment({ withTime: false })}`, { waitUntil: 'domcontentloaded' });
    await page.locator('.calc__lens-rail').waitFor({ timeout: 30_000 });
    await page.locator('[data-lens-btn="progressed"]').click();
    await page.locator('[data-lens="progressed"]').waitFor({ timeout: 30_000 });
    await page.locator('.lens__note').first().waitFor();
    const notes = (await page.locator('.lens__note').allTextContents()).join(' ');
    check('no-time chart shows the noon note on progressed', notes.includes('noon chart'), notes);
    await page.close();
  }

  // ── ES: chrome localizes, corpus stays EN-only (absent) ──
  {
    const { page } = await preparePage(context);
    await page.goto(`${baseURL}/es/birth-chart/${chartFragment()}`, { waitUntil: 'domcontentloaded' });
    await page.locator('.calc__lens-rail').waitFor({ timeout: 30_000 });
    check('ES rail label localizes', await page.locator('[data-lens-btn="sky"]').textContent() === 'Cielo ahora');
    await page.locator('[data-lens-btn="progressed"]').click();
    await page.locator('[data-lens="progressed"]').waitFor({ timeout: 30_000 });
    await page.locator('.lens__intro').waitFor();
    check('ES intro is Spanish', ((await page.locator('.lens__intro').textContent()) ?? '').includes('progresada'));
    check('ES shows no EN corpus lines', await page.locator('[data-lens-corpus]').count() === 0);
    check('ES trust line is Spanish', ((await page.locator('.lens__trust').textContent()) ?? '').includes('dispositivo'));
    await page.close();
  }

  // ── Reduced motion: switches still work ──
  {
    const rmContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'reduce',
    });
    const { page } = await preparePage(rmContext);
    await page.goto(`${baseURL}/birth-chart/${chartFragment()}`, { waitUntil: 'domcontentloaded' });
    await page.locator('.calc__lens-rail').waitFor({ timeout: 30_000 });
    await page.locator('[data-lens-btn="sky"]').click();
    await page.locator('.wheel__overlay').waitFor({ timeout: 30_000 });
    check('reduced-motion lens switch works', await page.locator('.wheel__overlay').count() === 1);
    await page.close();
    await rmContext.close();
  }

  await browser.close();
});

let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  · ${r.detail}` : ''}`);
}
if (failed) {
  console.error(`\n${failed} CHECK(S) FAILED`);
  process.exit(1);
}
console.log(`\nALL ${results.length} CHECKS PASS`);
