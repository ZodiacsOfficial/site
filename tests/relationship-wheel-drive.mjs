/**
 * End-to-end drive of the Relationship Wheel against `astro preview`:
 * seed two saved charts, compare, and exercise the bi-wheel — both rings
 * render, cross-chart chords draw, tapping a row focuses its chord, and
 * the swap button puts the other person inside. Also drives saved
 * comparisons: save, reload, one-tap restore, remove, inline-side
 * restore, orphan pruning, and the ES strip. Captures evidence shots.
 *
 *   npm run build
 *   OUT_DIR=/tmp/shots node tests/relationship-wheel-drive.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const OUT = process.env.OUT_DIR ?? null;
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/opt/pw-browsers/chromium';

const chart = (id, name, date, time, lat, lon, tz, place) => ({
  id, name, createdAt: '2026-07-11T00:00:00Z', updatedAt: '2026-07-11T00:00:00Z',
  birth: { date, time, timeKnown: time !== null, place: { name: place, admin1: '', country: '', lat, lon, tz } },
  summary: { engineVersion: '0-stale', utcISO: `${date}T18:00:00Z`, houseSystem: 'whole', bodies: [], angles: null, flags: [] },
});
const profile = {
  version: 1, settings: { houseSystem: 'whole' },
  charts: [
    chart('drive-frida', 'Frida', '1907-07-06', '08:30', 19.35, -99.16, 'America/Mexico_City', 'Coyoacán'),
    chart('drive-diego', 'Diego', '1886-12-08', '20:00', 21.02, -101.26, 'America/Mexico_City', 'Guanajuato'),
  ],
};

const preview = spawn('npx', ['astro', 'preview', '--port', '4399'], { stdio: 'ignore' });
await wait(2500);
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); };
const shot = async (t, p, o = {}) => { if (OUT) await t.screenshot({ path: `${OUT}/${p}`, ...o }).catch(() => {}); };

try {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });
  await page.addInitScript((prof) => localStorage.setItem('zodiacs.profile.v1', JSON.stringify(prof)), profile);
  await page.goto('http://127.0.0.1:4399/compatibility/', { waitUntil: 'networkidle' });

  // Pick the two saved charts and compare.
  await page.locator('#syn-a-source').selectOption('drive-frida');
  await page.locator('#syn-b-source').selectOption('drive-diego');
  await page.locator('.calc__submit').click();
  await page.waitForSelector('.rwheel', { timeout: 20000 });
  await page.waitForSelector('.wheel__transit', { timeout: 15000 });

  // Both rings render: inner natal marks (South Node hidden ⇒ 11) and the
  // outer partner ring (11, Moon included, South Node hidden).
  const innerMarks = await page.locator('.wheel__body:not(.wheel__transit)').count();
  const outerMarks = await page.locator('.wheel__transit').count();
  check('inner wheel renders 11 natal bodies', innerMarks === 11, `${innerMarks}`);
  check('outer ring renders 11 partner bodies', outerMarks === 11, `${outerMarks}`);
  check('cross-chart chords draw', (await page.locator('[data-transit-aspect]').count()) > 0);
  check('caption names both people', /Frida/.test(await page.locator('.tring__caption').textContent() ?? '')
    && /Diego/.test(await page.locator('.tring__caption').textContent() ?? ''));
  await page.locator('.tring__wheelbox').evaluate((n) => n.scrollIntoView({ block: 'center' }));
  await wait(800);
  await shot(page, 'rwheel-both.png', { clip: { x: 0, y: 0, width: 1440, height: 1200 } });

  // Tap a contact row → focus block + chord focus.
  await page.locator('.tring__row').first().click();
  await wait(200);
  check('tapping a row opens the contact reading', await page.locator('.tring__focus').isVisible());
  check('the row is marked focused', (await page.locator('.tring__row.is-focus').count()) === 1);
  await shot(page, 'rwheel-focus.png', { clip: { x: 0, y: 0, width: 1440, height: 1200 } });

  // Swap who's inside: the caption inverts and focus clears.
  const capBefore = await page.locator('.tring__caption').textContent();
  await page.locator('[data-swap]').click();
  await wait(400);
  const capAfter = await page.locator('.tring__caption').textContent();
  check('swap inverts the rings', capBefore !== capAfter && /Diego/.test(capAfter ?? ''), capAfter?.slice(0, 60) ?? '');
  check('swap clears the focused contact', (await page.locator('.tring__row.is-focus').count()) === 0);
  check('rings still render after swap', (await page.locator('.wheel__transit').count()) === 11);
  await shot(page, 'rwheel-swapped.png', { clip: { x: 0, y: 0, width: 1440, height: 1200 } });

  // The invite + pairing blocks survive below the module.
  check('pairing CTA renders', (await page.locator('.calc__actions .btn--ghost').count()) >= 1);

  // Save the comparison → it persists and the button settles.
  await page.locator('[data-save-pair]').click();
  await page.waitForSelector('[data-pair-status]', { timeout: 3000 });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('zodiacs.pairs.v1') ?? '[]'));
  check('saving stores one pair of chart references', stored.length === 1
    && stored[0].a.kind === 'chart' && stored[0].b.kind === 'chart');
  check('save button settles into its saved state', await page.locator('[data-save-pair]').isDisabled());
  await shot(page, 'rwheel-saved.png', { clip: { x: 0, y: 0, width: 1440, height: 1200 } });

  // Reload: the saved comparison offers itself back and restores on tap.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.syn__pair-restore', { timeout: 10000 });
  const chipText = await page.locator('.syn__pair-restore').first().textContent();
  check('saved strip lists the pair by name', /Frida × Diego/.test(chipText ?? ''), chipText ?? '');
  await shot(page, 'rwheel-strip.png');
  await page.locator('.syn__pair-restore').first().click();
  await page.waitForSelector('.rwheel', { timeout: 20000 });
  check('tapping the chip re-runs the comparison', (await page.locator('.wheel__transit').count()) === 11);

  // Remove: the chip goes away and storage empties.
  await page.locator('.syn__pair-remove').first().click();
  await wait(200);
  const afterRemove = await page.evaluate(() => JSON.parse(localStorage.getItem('zodiacs.pairs.v1') ?? '[]'));
  check('removing clears the strip', (await page.locator('.syn__pair').count()) === 0);
  check('removing empties storage', afterRemove.length === 0);
  await page.close();

  // An inline (by-value) side restores as a locked chip and still
  // compares; a pair referencing a missing chart prunes itself.
  const seededPairs = [
    {
      id: 'seeded', createdAt: '2026-07-11T00:00:00Z',
      a: { kind: 'chart', chartId: 'drive-frida', label: 'Frida' },
      b: {
        kind: 'input', label: 'Diego',
        input: {
          date: '1886-12-08', time: '20:00', timeKnown: true,
          lat: 21.02, lon: -101.26, tz: 'America/Mexico_City',
          name: 'Diego', place: 'Guanajuato', houseSystem: 'whole',
        },
      },
    },
    {
      id: 'orphan', createdAt: '2026-07-11T00:00:00Z',
      a: { kind: 'chart', chartId: 'drive-ghost', label: 'Ghost' },
      b: { kind: 'chart', chartId: 'drive-frida', label: 'Frida' },
    },
  ];
  const mixed = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await mixed.addInitScript((prof) => localStorage.setItem('zodiacs.profile.v1', JSON.stringify(prof)), profile);
  await mixed.addInitScript((pairs) => localStorage.setItem('zodiacs.pairs.v1', JSON.stringify(pairs)), seededPairs);
  await mixed.goto('http://127.0.0.1:4399/compatibility/', { waitUntil: 'networkidle' });
  await mixed.waitForSelector('.syn__pair-restore', { timeout: 10000 });
  await wait(400);
  const pruned = await mixed.evaluate(() => JSON.parse(localStorage.getItem('zodiacs.pairs.v1') ?? '[]'));
  check('a pair referencing a missing chart prunes itself', pruned.length === 1 && pruned[0].id === 'seeded');
  check('only the restorable pair is offered', (await mixed.locator('.syn__pair').count()) === 1);
  await mixed.locator('.syn__pair-restore').first().click();
  await mixed.waitForSelector('.rwheel', { timeout: 20000 });
  check('an inline side restores and compares', (await mixed.locator('.wheel__transit').count()) === 11);
  check('the inline side shows as a saved-comparison chip',
    /from a saved comparison/.test(await mixed.locator('#syn-b-linked').inputValue()));
  check('a restored own side still offers the invite', (await mixed.locator('[data-invite-link]').count()) >= 1);
  await shot(mixed, 'rwheel-restored-inline.png', { clip: { x: 0, y: 0, width: 1440, height: 1200 } });
  await mixed.close();

  // ES: the strip renders translated.
  const es = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await es.addInitScript((prof) => localStorage.setItem('zodiacs.profile.v1', JSON.stringify(prof)), profile);
  await es.addInitScript((pairs) => localStorage.setItem('zodiacs.pairs.v1', JSON.stringify(pairs)), [seededPairs[0]]);
  await es.goto('http://127.0.0.1:4399/es/compatibility/', { waitUntil: 'networkidle' });
  await es.waitForSelector('.syn__pair-restore', { timeout: 10000 });
  check('ES strip renders translated', /Comparaciones guardadas/.test(await es.locator('.syn__pairs').textContent() ?? ''));
  await es.close();

  // Profile page: saved comparisons live beside saved charts; the chip
  // deep-links to /compatibility/?pair= which restores and compares.
  const pf = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await pf.addInitScript((prof) => localStorage.setItem('zodiacs.profile.v1', JSON.stringify(prof)), profile);
  await pf.addInitScript((pairs) => localStorage.setItem('zodiacs.pairs.v1', JSON.stringify(pairs)), [seededPairs[0]]);
  await pf.goto('http://127.0.0.1:4399/profile/', { waitUntil: 'networkidle' });
  await pf.waitForSelector('.pf-pairs .syn__pair-restore', { timeout: 10000 });
  check('profile lists the saved comparison', /Frida × Diego/.test(await pf.locator('.pf-pairs').textContent() ?? ''));
  await shot(pf, 'pf-pairs.png');
  await pf.locator('.pf-pairs .syn__pair-restore').first().click();
  await pf.waitForURL(/compatibility\/\?pair=/, { timeout: 10000 });
  await pf.waitForSelector('.rwheel', { timeout: 20000 });
  check('profile chip deep-links into a live comparison', (await pf.locator('.wheel__transit').count()) === 11);
  await pf.close();

  // Removing from the profile page empties storage.
  const pf2 = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await pf2.addInitScript((prof) => localStorage.setItem('zodiacs.profile.v1', JSON.stringify(prof)), profile);
  await pf2.addInitScript((pairs) => localStorage.setItem('zodiacs.pairs.v1', JSON.stringify(pairs)), [seededPairs[0]]);
  await pf2.goto('http://127.0.0.1:4399/profile/', { waitUntil: 'networkidle' });
  await pf2.waitForSelector('.pf-pairs .syn__pair-remove', { timeout: 10000 });
  await pf2.locator('.pf-pairs .syn__pair-remove').first().click();
  await wait(200);
  const pfAfter = await pf2.evaluate(() => JSON.parse(localStorage.getItem('zodiacs.pairs.v1') ?? '[]'));
  check('removing from profile clears the pair', pfAfter.length === 0 && (await pf2.locator('.pf-pairs').count()) === 0);
  await pf2.close();

  // Mobile sanity — with a saved pair of hostile-length names (renamed
  // charts have no length cap; the chips must ellipsize, not overflow).
  const longProfile = JSON.parse(JSON.stringify(profile));
  longProfile.charts[0].name = 'Frida Kahlo de Rivera, painter of Coyoacán and La Casa Azul';
  const mob = await browser.newPage({ viewport: { width: 320, height: 900 }, deviceScaleFactor: 2, hasTouch: true });
  await mob.addInitScript((prof) => localStorage.setItem('zodiacs.profile.v1', JSON.stringify(prof)), longProfile);
  await mob.addInitScript((pairs) => localStorage.setItem('zodiacs.pairs.v1', JSON.stringify(pairs)), [
    {
      id: 'long', createdAt: '2026-07-11T00:00:00Z',
      a: { kind: 'chart', chartId: 'drive-frida', label: 'Frida' },
      b: { kind: 'chart', chartId: 'drive-diego', label: 'Diego' },
    },
  ]);
  await mob.goto('http://127.0.0.1:4399/compatibility/', { waitUntil: 'networkidle' });
  await mob.waitForSelector('.syn__pair-restore', { timeout: 10000 });
  const overflow = await mob.evaluate(() => ({
    doc: document.documentElement.scrollWidth, win: window.innerWidth,
  }));
  check('long-name chip never overflows a 320px screen', overflow.doc <= overflow.win, `${overflow.doc} vs ${overflow.win}`);
  await shot(mob, 'rwheel-mobile-longname.png');
  await mob.locator('#syn-a-source').selectOption('drive-frida');
  await mob.locator('#syn-b-source').selectOption('drive-diego');
  await mob.locator('.calc__submit').click();
  await mob.waitForSelector('.rwheel', { timeout: 20000 });
  check('mobile: bi-wheel renders', (await mob.locator('.wheel__transit').count()) === 11);
  await shot(mob, 'rwheel-mobile.png');
  await mob.close();

  await browser.close();
} finally {
  preview.kill();
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  · ${r.detail.slice(0, 90)}` : ''}`);
}
console.log(failed ? `\n${failed} FAILURES` : '\nALL PASS');
process.exit(failed ? 1 : 0);
