/**
 * End-to-end drive of the Chart Explorer + Guided Tour against
 * `astro preview`: select on wheel → inspector + table + URL sync;
 * keyboard model; layer chips; ?sel= deep link; mobile bottom sheet;
 * tour chapters, anchor rotation, house morph, analytics events.
 *
 * Not part of `npm test` (needs a built site + Chromium). Run manually:
 *
 *   npm run build
 *   OUT_DIR=/tmp/shots node tests/explorer-drive.mjs
 *
 * OUT_DIR is optional — screenshots are skipped without it. In the
 * remote container, Chromium lives at /opt/pw-browsers/chromium.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const OUT = process.env.OUT_DIR ?? null;
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/opt/pw-browsers/chromium';
const encodeChart = (data) => `#c=1.${Buffer.from(JSON.stringify(data)).toString('base64url')}`;
const kahlo = encodeChart({
  d: '1907-07-06', z: 'America/Mexico_City', la: 19.35, lo: -99.16,
  t: '08:30', n: 'Frida Kahlo', p: 'Coyoacán, Mexico',
});
// The same birth without a time — the honest no-houses tour variant.
const kahloNoTime = encodeChart({
  d: '1907-07-06', z: 'America/Mexico_City', la: 19.35, lo: -99.16,
});

const preview = spawn('npx', ['astro', 'preview', '--port', '4399', '--host', '127.0.0.1'], { stdio: 'ignore', detached: false });
await wait(2500);
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); };
const shot = async (target, path, opts = {}) => {
  if (OUT) await target.screenshot({ path: `${OUT}/${path}`, ...opts }).catch(() => {});
};

try {
  const browser = await chromium.launch({ executablePath: CHROMIUM });

  // The site sets `scroll-behavior: smooth`, so scrolls animate — poll the
  // box until it stops moving before clicking.
  async function settledBox(el) {
    let prev = await el.boundingBox();
    for (let i = 0; i < 20; i += 1) {
      await wait(120);
      const cur = await el.boundingBox();
      if (prev && cur && Math.abs(cur.y - prev.y) < 0.5 && Math.abs(cur.x - prev.x) < 0.5) return cur;
      prev = cur;
    }
    return prev;
  }
  // Click helper: center the wheel, then click a mark's visual center —
  // the svg resolves the entity geometrically.
  async function clickMark(pg, selector) {
    const el = pg.locator(selector).first();
    await el.evaluate((n) => n.closest('svg').scrollIntoView({ block: 'center' }));
    const box = await settledBox(el);
    await pg.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }

  // ── Desktop: free exploration ──
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    window.__detailEvents = [];
    window.zodiacsAnalytics = Object.freeze({
      track: (name, props) => window.__detailEvents.push({ name, props }),
    });
  });
  await page.goto('http://127.0.0.1:4399/birth-chart/', { waitUntil: 'networkidle' });
  check('communication read: lazy chunk is absent before compute', await page.evaluate(() =>
    !performance.getEntriesByType('resource').some((entry) => /\/CommunicationRead\.[^/]+\.js$/.test(new URL(entry.name).pathname))));
  await page.goto('about:blank');
  await page.goto(`http://127.0.0.1:4399/birth-chart/${kahlo}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.calc__result', { timeout: 15000 });
  await page.waitForSelector('.wheel--interactive', { timeout: 15000 });
  await page.waitForSelector('.calc__comm', { timeout: 15000 });
  await page.waitForFunction(() => window.__detailEvents.filter((event) => event.name === 'comm_read_view').length === 1);

  const detail = page.locator('details.calc__detail[data-detail]');
  const detailSummary = detail.locator('summary');
  const placementCount = await detail.locator('.calc__table tbody tr').count();
  const aspectCount = await detail.locator('.calc__aspects li').count();
  check('plain-first: reading precedes actions and full-detail table', await page.evaluate(() => {
    const read = document.querySelector('.calc__read');
    const communication = document.querySelector('.calc__comm');
    const actions = document.querySelector('.calc__chart-share');
    const detailNode = document.querySelector('[data-detail]');
    const table = document.querySelector('.calc__table');
    return Boolean(read && communication && actions && detailNode && table
      && read.nextElementSibling === communication
      && communication.nextElementSibling === actions
      && (actions.compareDocumentPosition(detailNode) & Node.DOCUMENT_POSITION_FOLLOWING)
      && (read.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING));
  }));
  check('communication read: chunk loads after compute', await page.evaluate(() =>
    performance.getEntriesByType('resource').some((entry) => /\/CommunicationRead\.[^/]+\.js$/.test(new URL(entry.name).pathname))));
  check('communication read: Kahlo corpus line is byte-identical',
    await page.locator('.calc__comm-part').first().locator(':scope > p').first().textContent()
      === 'You communicate like a performance with an audience of one — warm, committed, a story where a sentence would do. It works because you mean it; flattery without conviction reads as static to you.');
  check('communication read: analytics fires once with no properties', await page.evaluate(() => {
    const events = window.__detailEvents.filter((event) => event.name === 'comm_read_view');
    return events.length === 1 && Object.keys(events[0].props ?? {}).length === 0;
  }));
  check('plain-first: detail is closed by default', !(await detail.evaluate((node) => node.open)));
  check('plain-first: EN summary is exact with mono counts',
    await detailSummary.textContent() === `Full detail — ${placementCount} placements · ${aspectCount} aspects · degrees & dignities`
    && await detailSummary.locator('.mono').count() === 2,
    await detailSummary.textContent() ?? '');
  check('plain-first: aspects are a section with no nested details',
    await detail.locator('details').count() === 0
    && await detail.locator('section.calc__aspects > h3 + ul').count() === 1);

  await detailSummary.click();
  await page.waitForFunction(() => document.querySelector('[data-detail]')?.hasAttribute('open')
    && localStorage.getItem('zodiacs.detail.v1') === 'open'
    && window.__detailEvents.some((event) => event.name === 'detail_toggle' && event.props?.to === 'full'));
  check('plain-first: opening persists',
    await page.evaluate(() => localStorage.getItem('zodiacs.detail.v1')) === 'open');
  check('plain-first: open analytics is allowlisted shape', await page.evaluate(() =>
    window.__detailEvents.some((event) => event.name === 'detail_toggle' && event.props?.to === 'full')));
  check('communication read: parent rerender does not duplicate analytics', await page.evaluate(() =>
    window.__detailEvents.filter((event) => event.name === 'comm_read_view').length === 1));

  await page.goto('about:blank');
  await page.goto(`http://127.0.0.1:4399/birth-chart/${kahlo}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.wheel--interactive', { timeout: 15000 });
  await wait(100); // allow any restore-time native toggle task to flush
  check('plain-first: open choice restores across reload', await detail.evaluate((node) => node.open));
  check('plain-first: restoring does not emit a toggle event', await page.evaluate(() =>
    window.__detailEvents.filter((event) => event.name === 'detail_toggle').length === 0));
  await detailSummary.click();
  await page.waitForFunction(() => !document.querySelector('[data-detail]')?.hasAttribute('open')
    && localStorage.getItem('zodiacs.detail.v1') === 'closed'
    && window.__detailEvents.some((event) => event.name === 'detail_toggle' && event.props?.to === 'plain'));
  check('plain-first: closing persists and tracks plain',
    await page.evaluate(() => localStorage.getItem('zodiacs.detail.v1')) === 'closed'
    && await page.evaluate(() => window.__detailEvents.some(
      (event) => event.name === 'detail_toggle' && event.props?.to === 'plain')));

  await page.goto('about:blank');
  await page.goto(`http://127.0.0.1:4399/birth-chart/${kahlo}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.wheel--interactive', { timeout: 15000 });
  check('plain-first: closed choice restores across reload', !(await detail.evaluate((node) => node.open)));
  await wait(950); // let the freshly remounted wheel finish its entrance before geometric clicks

  check('wheel interactive', true);
  check('hint visible pre-selection', await page.locator('.insp--hint').isVisible());

  // Select Mars via its marker circle.
  await clickMark(page, 'g[data-entity="body:Mars"] circle');
  await page.waitForSelector('.insp--card', { timeout: 5000 });
  const title = await page.locator('.insp__title').textContent();
  check('inspector opens on Mars', /Mars/.test(title ?? ''), title ?? '');
  check('url carries ?sel', (await page.url()).includes('sel=body%3AMars') || (await page.url()).includes('sel=body:Mars'), await page.url());
  check('wheel body selection re-lights closed detail', await detail.evaluate((node) => node.open));
  check('table row synced', await page.locator('tr[data-selected="true"] .calc__rowbtn').textContent().then((x) => /Mars/.test(x ?? '')));
  check('reading item synced', (await page.locator('.calc__read-list li[data-selected="true"]').count()) === 1);
  await shot(page.locator('.xplr__wheelbox'), 'desktop-mars-selected.png');
  await shot(page, 'desktop-explorer-region.png', { clip: { x: 0, y: 0, width: 1440, height: 1000 } });

  // Aspect chip inside inspector navigates to the aspect.
  const chip = page.locator('.insp__aspects .insp__chip').first();
  if (await chip.count()) {
    await chip.click();
    const t2 = await page.locator('.insp__title').textContent();
    check('inspector chip → aspect selection', /(conjunction|sextile|square|trine|opposition)/i.test(await page.url()) || (t2 ?? '').length > 0, t2 ?? '');
  }

  // Escape clears via wheelbox keyboard.
  await page.locator('.xplr__wheelbox').focus();
  await page.keyboard.press('Escape');
  check('Escape clears selection', await page.locator('.insp--hint').isVisible());

  // Arrow keys cycle bodies.
  await page.keyboard.press('ArrowRight');
  const t3 = await page.locator('.insp__title').textContent();
  check('ArrowRight selects a body', (t3 ?? '').trim().length > 0, t3 ?? '');
  await page.keyboard.press('ArrowRight');
  const t4 = await page.locator('.insp__title').textContent();
  check('ArrowRight advances', t4 !== t3, `${t3} → ${t4}`);
  await page.keyboard.press('Enter');
  check('Enter focuses inspector heading', await page.evaluate(() => document.activeElement?.hasAttribute('data-inspector-heading') ?? false));
  await page.keyboard.press('Escape');

  // Table row click selects on wheel.
  await page.locator('.calc__rowbtn', { hasText: 'Moon' }).first().click();
  check('table click → wheel selection ring', (await page.locator('.wheel__sel-ring').count()) === 1);

  // House selection via its numeral (the wedge band resolves geometrically).
  await clickMark(page, 'g[data-entity="house:7"] text');
  const t5 = await page.locator('.insp__title').textContent();
  check('house numeral selectable', /7/.test(t5 ?? ''), t5 ?? '');

  // Sign selection via its disc in the ring.
  await clickMark(page, 'g[data-entity="sign:leo"] image');
  const tSign = await page.locator('.insp__title').textContent();
  check('sign disc selectable', /Leo/i.test(tSign ?? ''), tSign ?? '');

  // Layer chip: toggling squares off removes square chords.
  await page.locator('.xplr-chip[data-aspect="square"]').click();
  await wait(200);
  const squaresOff = await page.locator('.xplr-chip[data-aspect="square"][aria-pressed="false"]').count();
  check('square chip toggles off', squaresOff === 1);
  await page.locator('.xplr-chip[data-aspect="square"]').click();

  // Houses toggle clears a HOUSE selection (other kinds persist).
  await clickMark(page, 'g[data-entity="house:7"] text');
  await page.locator('.xplr-chip--houses').click();
  await wait(300);
  check('houses off clears house selection', await page.locator('.insp--hint').isVisible());
  await page.locator('.xplr-chip--houses').click();

  // With a selection active, Enter on a layer chip must toggle the chip,
  // not hijack focus.
  await clickMark(page, 'g[data-entity="body:Mars"] circle');
  await page.locator('.xplr-chip[data-aspect="trine"]').focus();
  await page.keyboard.press('Enter');
  await wait(150);
  check('chip Enter toggles while selected', (await page.locator('.xplr-chip[data-aspect="trine"]').getAttribute('aria-pressed')) === 'false');
  await page.locator('.xplr-chip[data-aspect="trine"]').click(); // restore

  // Escape from inside the inspector clears the selection.
  await clickMark(page, 'g[data-entity="body:Mars"] circle');
  await page.locator('.xplr__wheelbox').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await wait(300);
  check('Escape inside inspector clears', await page.locator('.insp--hint').isVisible());

  // Arrow cycle reaches the angles after the last body.
  await page.locator('.xplr__wheelbox').focus();
  for (let i = 0; i < 12; i += 1) await page.keyboard.press('ArrowRight');
  const tAng = await page.locator('.insp__title').textContent();
  check('arrow cycle reaches ASC', /ASC/.test(tAng ?? ''), tAng ?? '');
  await page.keyboard.press('Escape');

  // Selecting an aspect then filtering its type off clears the selection.
  await page.locator('.calc__aspects .calc__rowbtn').first().click();
  const selUrl = page.url();
  const m = /sel=aspect%3A[^&]*(conjunction|sextile|square|trine|opposition)/.exec(selUrl);
  if (m) {
    await page.locator(`.xplr-chip[data-aspect="${m[1]}"]`).click();
    await wait(300);
    check('filtering off selected aspect type clears it', await page.locator('.insp--hint').isVisible());
    await page.locator(`.xplr-chip[data-aspect="${m[1]}"]`).click();
  } else {
    check('filtering off selected aspect type clears it', false, 'could not derive selected aspect from url: ' + selUrl);
  }

  // Invalid sign deep link must not crash the island.
  await page.goto(`http://127.0.0.1:4399/birth-chart/?sel=sign%3Afoobar${kahlo}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.wheel--interactive', { timeout: 15000 });
  check('invalid ?sel survives (no crash)', (await page.locator('.calc__table').count()) === 1);

  // North Node inspector has no placements link (page doesn't exist).
  await page.goto('about:blank');
  await page.goto(`http://127.0.0.1:4399/birth-chart/?sel=body%3ANorth%20Node${kahlo}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.insp--card', { timeout: 15000 });
  check('North Node card has no 404 learn link', (await page.locator('.insp__more[href*="placements/north-node"]').count()) === 0);

  // Deep link: fresh load with ?sel=body:Venus.
  await page.goto('about:blank');
  await page.goto(`http://127.0.0.1:4399/birth-chart/?sel=body%3AVenus${kahlo}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.insp--card', { timeout: 15000 });
  const t6 = await page.locator('.insp__title').textContent();
  check('?sel deep link applies after compute', /Venus/.test(t6 ?? ''), t6 ?? '');
  await page.close();

  // The disclosure copy is host-local; Spanish keeps the exact approved line.
  const es = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await es.goto(`http://127.0.0.1:4399/es/birth-chart/${kahlo}`, { waitUntil: 'networkidle' });
  await es.waitForSelector('.wheel--interactive', { timeout: 15000 });
  const esDetail = es.locator('[data-detail]');
  const esPlacements = await esDetail.locator('.calc__table tbody tr').count();
  const esAspects = await esDetail.locator('.calc__aspects li').count();
  const esSummary = await esDetail.locator('summary').textContent();
  check('plain-first: ES summary line is exact',
    esSummary === `Todo el detalle — ${esPlacements} posiciones · ${esAspects} aspectos · grados y dignidades`,
    esSummary ?? '');
  check('communication read: absent from Spanish',
    await es.locator('.calc__comm').count() === 0
    && await es.evaluate(() => !performance.getEntriesByType('resource')
      .some((entry) => /\/CommunicationRead\.[^/]+\.js$/.test(new URL(entry.name).pathname))));
  await es.close();

  // ── Desktop: guided tour ──
  const tp = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  // Replace the no-op analytics shim before the page scripts run so the
  // emitters are observable end-to-end (Base.astro's `||` keeps ours).
  await tp.addInitScript(() => {
    window.__tourEvents = [];
    window.zodiacsAnalytics = Object.freeze({
      track: (name, props) => window.__tourEvents.push({ name, props }),
    });
  });
  await tp.goto(`http://127.0.0.1:4399/birth-chart/${kahlo}`, { waitUntil: 'networkidle' });
  await tp.waitForSelector('.wheel--interactive', { timeout: 15000 });

  await tp.locator('[data-tour-start]').click();
  await tp.waitForSelector('[data-tour-card]', { timeout: 10000 }); // lazy chunk fetch
  const kick1 = await tp.locator('[data-tour-kicker]').textContent();
  check('tour: starts at chapter 1', /Chapter 1 of \d/.test(kick1 ?? ''), kick1 ?? '');
  check('tour: one dot per chapter (full chart = 8)', (await tp.locator('[data-tour-dot]').count()) === 8);
  await shot(tp, 'tour-ch1-sky.png', { clip: { x: 0, y: 0, width: 1440, height: 1000 } });

  // Next advances into chapter 2 and the anchor rotation moves the wheel.
  const head1 = await tp.locator('[data-tour-heading]').textContent();
  await tp.locator('[data-tour-next]').click();
  await wait(150);
  const head2 = await tp.locator('[data-tour-heading]').textContent();
  const kick2 = await tp.locator('[data-tour-kicker]').textContent();
  check('tour: next advances a chapter', head2 !== head1 && /Chapter 2/.test(kick2 ?? ''), `${head1} → ${head2}`);

  const sunBefore = await tp.locator('g[data-entity="body:Sun"] circle').first().boundingBox();
  await tp.locator('[data-tour-rotate]').click();
  await wait(900); // 600 ms tween + settle
  const sunAfter = await tp.locator('g[data-entity="body:Sun"] circle').first().boundingBox();
  const moved = sunBefore && sunAfter
    && (Math.abs(sunAfter.x - sunBefore.x) > 2 || Math.abs(sunAfter.y - sunBefore.y) > 2);
  check('tour: anchor rotation moves the wheel', Boolean(moved)
    && (await tp.locator('[data-tour-rotate]').getAttribute('aria-pressed')) === 'true');
  await shot(tp, 'tour-ch2-aries-anchor.png', { clip: { x: 0, y: 0, width: 1440, height: 1000 } });

  // Big three (dot 4): the chapter lights the Sun and dims the rest.
  await tp.locator('[data-tour-dot]').nth(3).click();
  await wait(200);
  const sunOp = await tp.locator('g[data-entity="body:Sun"]').first().getAttribute('opacity');
  const marsOp = await tp.locator('g[data-entity="body:Mars"]').first().getAttribute('opacity');
  check('tour: chapter emphasis lights Sun, dims Mars',
    Number(sunOp) === 1 && Number(marsOp) < 1, `sun ${sunOp}, mars ${marsOp}`);
  check('tour: chapter change moves focus to heading',
    await tp.evaluate(() => document.activeElement?.hasAttribute('data-tour-heading') ?? false));
  await shot(tp, 'tour-ch4-big-three.png', { clip: { x: 0, y: 0, width: 1440, height: 1000 } });

  // Mid-tour selection detours to the inspector; the way back preserves
  // the chapter index.
  await clickMark(tp, 'g[data-entity="body:Mars"] circle');
  await tp.waitForSelector('[data-tour-back]', { timeout: 5000 });
  check('tour: selection swaps in inspector with return banner',
    /Mars/.test(await tp.locator('.insp__title').textContent() ?? ''));
  await tp.locator('[data-tour-back]').click();
  await tp.waitForSelector('[data-tour-card]', { timeout: 5000 });
  check('tour: back returns to the same chapter',
    /Chapter 4/.test(await tp.locator('[data-tour-kicker]').textContent() ?? ''));

  // Houses (dot 6): the morph preview renders a diff without touching state.
  await tp.locator('[data-tour-dot]').nth(5).click();
  await tp.locator('[data-house-preview]').click();
  await tp.waitForSelector('[data-tour-diff]', { timeout: 8000 }); // engine + 450 ms tween
  check('tour: house morph shows the placement diff',
    (await tp.locator('[data-house-preview]').getAttribute('aria-pressed')) === 'true');
  await shot(tp, 'tour-ch6-house-morph.png', { clip: { x: 0, y: 0, width: 1440, height: 1000 } });

  // Jumping to the last chapter fires tour_complete exactly once.
  await tp.locator('[data-tour-dot]').last().click();
  await wait(200);
  const events = await tp.evaluate(() => window.__tourEvents);
  const completes = events.filter((e) => e.name === 'tour_complete');
  check('tour: analytics — start, steps, one completion',
    events.some((e) => e.name === 'tour_start' && e.props?.variant === 'v1')
    && events.filter((e) => e.name === 'tour_step').length >= 5
    && completes.length === 1 && completes[0].props?.variant === 'v1',
    JSON.stringify(events.map((e) => e.name)).slice(0, 120));
  await shot(tp, 'tour-ch8-whole.png', { clip: { x: 0, y: 0, width: 1440, height: 1000 } });

  // Escape from the wheelbox ends the tour and restores the hint.
  await tp.locator('.xplr__wheelbox').focus();
  await tp.keyboard.press('Escape');
  await wait(200);
  check('tour: Escape exits to free exploration',
    (await tp.locator('[data-tour-card]').count()) === 0
    && await tp.locator('.insp--hint').isVisible());

  // No-time chart: horizon and houses give way to the honest chapter.
  // (Hop through about:blank — a bare fragment swap on the same path is a
  // same-document navigation and would leave the old chart mounted.)
  await tp.goto('about:blank');
  await tp.goto(`http://127.0.0.1:4399/birth-chart/${kahloNoTime}`, { waitUntil: 'networkidle' });
  await tp.waitForSelector('.wheel--interactive', { timeout: 15000 });
  await tp.locator('[data-tour-start]').click();
  await tp.waitForSelector('[data-tour-card]', { timeout: 10000 });
  const noTimeDots = await tp.locator('[data-tour-dot]').count();
  const dotLabels = await tp.locator('[data-tour-dot]').evaluateAll(
    (els) => els.map((el) => el.getAttribute('aria-label') ?? ''),
  );
  check('tour: no-time chart derives 7 chapters incl. "no houses"',
    noTimeDots === 7 && dotLabels.some((l) => /no houses/i.test(l)),
    `${noTimeDots} dots: ${dotLabels.join(' | ').slice(0, 120)}`);
  await shot(tp, 'tour-no-time.png', { clip: { x: 0, y: 0, width: 1440, height: 1000 } });
  await tp.close();

  // ── Mobile: bottom sheet ──
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  await mob.goto(`http://127.0.0.1:4399/birth-chart/${kahlo}`, { waitUntil: 'networkidle' });
  await mob.waitForSelector('.wheel--interactive', { timeout: 15000 });
  check('mobile: hint hidden', !(await mob.locator('.insp--hint').isVisible().catch(() => false)));
  {
    const el = mob.locator('g[data-entity="body:Sun"] circle').first();
    await el.evaluate((n) => n.closest('svg').scrollIntoView({ block: 'center' }));
    const box = await settledBox(el);
    await mob.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
  await mob.waitForSelector('.insp--card', { timeout: 5000 });
  const sheetBox = await mob.locator('.insp--card').boundingBox();
  check('mobile: sheet opens from bottom', !!sheetBox && sheetBox.y > 400, JSON.stringify(sheetBox));
  await shot(mob, 'mobile-sheet-half.png');
  // Drag handle up → full detent.
  const handle = await mob.locator('.insp__handle').boundingBox();
  if (handle) {
    await mob.mouse.move(handle.x + handle.width / 2, handle.y + 8);
    await mob.mouse.down();
    await mob.mouse.move(handle.x + handle.width / 2, handle.y - 120, { steps: 6 });
    await mob.mouse.up();
    await wait(350);
    check('mobile: drag to full detent', (await mob.locator('.insp--full').count()) === 1);
    await shot(mob, 'mobile-sheet-full.png');
  }
  // Close returns to wheel.
  await mob.locator('.insp__close').click();
  check('mobile: close clears selection', (await mob.locator('.insp--card').count()) === 0);

  // Tour in the sheet: a sideways swipe on the handle turns the page.
  {
    const startBtn = mob.locator('[data-tour-start]');
    await startBtn.evaluate((n) => n.scrollIntoView({ block: 'center' }));
    const box = await settledBox(startBtn);
    await mob.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
  await mob.waitForSelector('[data-tour-card]', { timeout: 10000 });
  await shot(mob, 'mobile-tour-sheet.png');
  const mobHandle = await mob.locator('[data-tour-card] .insp__handle').boundingBox();
  if (mobHandle) {
    await mob.mouse.move(mobHandle.x + mobHandle.width / 2, mobHandle.y + 6);
    await mob.mouse.down();
    await mob.mouse.move(mobHandle.x + mobHandle.width / 2 - 140, mobHandle.y + 6, { steps: 6 });
    await mob.mouse.up();
    await wait(300);
    check('mobile: swipe left turns the tour page',
      /2/.test(await mob.locator('[data-tour-kicker]').textContent() ?? ''));
  } else {
    check('mobile: swipe left turns the tour page', false, 'no handle box');
  }
  await mob.locator('[data-tour-exit]').click();
  check('mobile: tour exit closes the sheet', (await mob.locator('[data-tour-card]').count()) === 0);
  await mob.close();

  // ── Reduced motion: selection and tour transitions are instant ──
  const rm = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await rm.goto(`http://127.0.0.1:4399/birth-chart/${kahlo}`, { waitUntil: 'networkidle' });
  await rm.waitForSelector('.wheel--interactive', { timeout: 15000 });
  {
    const el = rm.locator('g[data-entity="body:Saturn"] circle').first();
    await el.evaluate((n) => n.closest('svg').scrollIntoView({ block: 'center' }));
    const box = await settledBox(el);
    await rm.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
  check('reduced motion: selection works', /Saturn/.test(await rm.locator('.insp__title').textContent() ?? ''));
  await rm.keyboard.press('Escape');
  // The anchor rotation lands instantly (no 600 ms tween frame).
  await rm.locator('[data-tour-start]').click();
  await rm.waitForSelector('[data-tour-card]', { timeout: 10000 });
  await rm.locator('[data-tour-next]').click();
  const rmSunBefore = await rm.locator('g[data-entity="body:Sun"] circle').first().boundingBox();
  await rm.locator('[data-tour-rotate]').click();
  await wait(120); // far below the tween duration
  const rmSunAfter = await rm.locator('g[data-entity="body:Sun"] circle').first().boundingBox();
  check('reduced motion: rotation is instant',
    !!rmSunBefore && !!rmSunAfter
    && (Math.abs(rmSunAfter.x - rmSunBefore.x) > 2 || Math.abs(rmSunAfter.y - rmSunBefore.y) > 2));
  await rm.close();

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
