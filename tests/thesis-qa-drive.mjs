/**
 * QA drive for /thesis/ against `astro preview`: anchors resolve, the season
 * clock computes, the disclosure surfaces render their RESOLVED values (baked
 * statically for no-JavaScript readers, re-hydrated from JSON with scripts
 * on), no amber pending chip remains, the hydration script stays silent on
 * console, and every illustrated module fits 375/390/810/1280/1440 viewports.
 * It also verifies the always-visible binary comparison, no-JavaScript
 * visibility, and the reduced-motion final state.
 *
 *   npm run build
 *   OUT_DIR=/tmp/shots node tests/thesis-qa-drive.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as wait } from 'node:timers/promises';

const OUT = process.env.OUT_DIR ?? null;
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync('/opt/pw-browsers/chromium')
    ? '/opt/pw-browsers/chromium'
    : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');

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
  if (sel) {
    const target = page.locator(sel);
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    await target.screenshot({ path: `${OUT}/${path}` }).catch(() => {});
  } else {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${path}` }).catch(() => {});
  }
};

const isVisuallyExposed = async (locator) => {
  if (await locator.count() !== 1) return false;
  await locator.scrollIntoViewIfNeeded();
  // IntersectionObserver and the longest entrance transition settle within
  // 440ms. Sampling after that window tests the final state, not a random
  // frame before the element has entered the viewport.
  await wait(500);
  return locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    let current = node;
    let opacity = 1;
    while (current instanceof Element) {
      const style = getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      opacity *= Number.parseFloat(style.opacity || '1');
      current = current.parentElement;
    }
    return opacity > 0.01;
  });
};

const VISUAL_MODULES = [
  ['history transmission', '#fig-1 .transmission'],
  ['seasonal wheel', '#fig-2 .cadence'],
  ['history, ownership, and rails convergence', '#fig-3 .source-convergence'],
  ['comparison', '#fig-3 .comparison-panel'],
  ['consumer journey', '.journey'],
  ['public scrapbook', '.scrapbook'],
];

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
  for (const id of ['everyone-has-a-sign', 'where-the-signs-come-from', 'worth-holding',
    'pulse', 'the-candidacy', 'what-holding-means', 'the-public-record', 'the-test',
    'why-solana-why-base', 'the-case-against', 'the-instrument', 'the-honest-ending',
    'changelog', 'essay']) {
    check(`anchor #${id} resolves`, (await page.locator(`[id="${id}"]`).count()) === 1);
  }

  // Season clock computed from the embedded ingress table.
  const clock = await page.locator('[data-season-clock]').textContent();
  check('season clock renders', /season · day \d+ of \d+/.test(clock ?? ''), clock ?? '(hidden)');

  // Masthead + footer + changelog entries.
  check('masthead reads Nº 09 · Why Zodiacs Matter', /Nº 09 · Why Zodiacs Matter/.test(await page.locator('.essay__rail').textContent() ?? ''));
  check('hero leads with the consumer thesis',
    /Bitcoin made digital ownership possible\. Zodiacs makes it personal\./.test(await page.locator('.hero__epi').textContent() ?? ''));
  const heroVideo = page.locator('.hero video.hero__media');
  check('hero uses one ambient zodiac-clock video', (await heroVideo.count()) === 1);
  const heroVideoStart = await heroVideo.evaluate((video) => ({
    autoplay: video.hasAttribute('autoplay'),
    currentTime: video.currentTime,
    filter: getComputedStyle(video).filter,
    loop: video.loop,
    muted: video.muted,
    objectFit: getComputedStyle(video).objectFit,
    objectPosition: getComputedStyle(video).objectPosition,
    paused: video.paused,
    playsInline: video.playsInline,
    poster: new URL(video.poster).pathname,
    readyState: video.readyState,
    source: new URL(video.currentSrc).pathname,
  }));
  await wait(350);
  const heroVideoLater = await heroVideo.evaluate((video) => ({
    currentTime: video.currentTime,
    paused: video.paused,
  }));
  check('hero ambient video is loaded, looping, muted, inline, and moving',
    heroVideoStart.readyState >= 2
      && !heroVideoStart.autoplay
      && heroVideoStart.loop
      && heroVideoStart.muted
      && heroVideoStart.playsInline
      && heroVideoStart.poster === '/assets/art/zodiac-clock-768.avif'
      && heroVideoStart.source === '/assets/art/zodiac-clock.mp4'
      && !heroVideoStart.paused
      && !heroVideoLater.paused
      && heroVideoLater.currentTime !== heroVideoStart.currentTime,
    JSON.stringify({ start: heroVideoStart, later: heroVideoLater }));
  check('hero keeps the original cover crop and color treatment',
    heroVideoStart.objectFit === 'cover'
      && heroVideoStart.objectPosition === '28% 50%'
      && heroVideoStart.filter === 'saturate(0.92) brightness(0.9)',
    JSON.stringify(heroVideoStart));
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await wait(250);
  const heroVideoOffscreen = await heroVideo.evaluate((video) => ({ paused: video.paused, currentTime: video.currentTime }));
  check('hero ambient video pauses off screen', heroVideoOffscreen.paused, JSON.stringify(heroVideoOffscreen));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(350);
  const heroVideoReturned = await heroVideo.evaluate((video) => ({ paused: video.paused, currentTime: video.currentTime }));
  check('hero ambient video resumes on screen',
    !heroVideoReturned.paused && heroVideoReturned.currentTime > heroVideoOffscreen.currentTime,
    JSON.stringify({ offscreen: heroVideoOffscreen, returned: heroVideoReturned }));
  check('hero has no static artwork canvas', (await page.locator('[data-hero-art]').count()) === 0);
  const heroSignSlugs = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];
  const heroIcons = page.locator('.hero__twelve .hero__twelve-icon');
  const heroIconState = await heroIcons.evaluateAll((icons) => icons.map((icon) => ({
    complete: icon.complete,
    naturalWidth: icon.naturalWidth,
    src: new URL(icon.currentSrc || icon.src).pathname,
    alt: icon.getAttribute('alt'),
  })));
  const heroLinks = await page.locator('.hero__twelve a').evaluateAll((links) => links.map((link) => ({
    href: new URL(link.href).pathname,
    label: link.getAttribute('aria-label'),
  })));
  check('hero uses all twelve canonical pastel zodiac icons',
    heroIconState.length === 12
      && heroIconState.every((icon, index) => icon.complete
        && icon.naturalWidth === 48
        && icon.src === `/assets/zodiac-icons/48/${heroSignSlugs[index]}.webp`
        && icon.alt === ''),
    JSON.stringify(heroIconState));
  check('hero pastel icons keep their registry links and accessible names',
    heroLinks.length === 12 && heroLinks.every((link, index) => {
      const slug = heroSignSlugs[index];
      return link.href === `/registry/${slug}/`
        && link.label === `${slug[0].toUpperCase()}${slug.slice(1)} — registry record`;
    }));
  check('hero contains no platform zodiac emoji fallback',
    (await page.locator('.hero__twelve-glyph').count()) === 0
      && !/[♈♉♊♋♌♍♎♏♐♑♒♓]/u.test(await page.locator('.hero__twelve').textContent() ?? ''));
  check('essay opens with a familiar sign',
    /Before you had a username, you had a sign\./.test(await page.locator('#everyone-has-a-sign').textContent() ?? ''));
  check('essay closes with a concrete invitation',
    /Find your sign\. See its record\. Decide what it means to you\./.test(await page.locator('#the-honest-ending').textContent() ?? ''));
  check('essay close links the changelog',
    (await page.locator('.thesis-close__sig a[href="#changelog"]').count()) === 1);
  const changelog = await page.locator('#changelog').textContent() ?? '';
  check('changelog carries Nº 09 and preserves Nº 08 and Nº 07',
    /Nº 09/.test(changelog) && /Nº 08 — Why Zodiacs Matter/.test(changelog)
      && /Nº 07 — July 2026\. The Zodiac Standard/.test(changelog));

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
  const scoreText = await page.locator('#the-candidacy .score').textContent() ?? '';
  check('candidacy readings stay search-scoped, not exhaustive',
    /no qualifying/i.test(scoreText) && !/(^|[^\d.])0 (verified|editorial)/i.test(scoreText));
  const tcard = await page.locator('.tcard').textContent() ?? '';
  check('test card is preregistered, not pending', /PREREGISTERED/.test(tcard) && !/PENDING/i.test(tcard.replace(/PREREGISTERED[^.]*/, '')));
  check('test card admits the test has not begun', /has not begun/.test(tcard));
  check('test card fixes the no-later-than date', /2026-10-31/.test(tcard));

  // F3 stays open and says everything through row labels plus standalone marks.
  const comparison = page.locator('#fig-3 .comparison-panel .ztbl');
  check('comparison is always visible', await isVisuallyExposed(comparison));
  check('comparison is not nested in details', (await page.locator('#fig-3 details .ztbl').count()) === 0);
  check('comparison has four scoped column headers',
    (await comparison.locator('thead th[scope="col"]').count()) === 4);
  check('comparison has eleven scoped property rows',
    (await comparison.locator('tbody tr').count()) === 11
      && (await comparison.locator('tbody th[scope="row"]').count()) === 11);
  check('comparison has exactly thirty-three standalone marks',
    (await comparison.locator('tbody td .comparison-mark').count()) === 33);
  check('comparison gives every mark an sr-only label',
    (await comparison.locator('tbody td .sr-only').count()) === 33);
  const cellContent = await comparison.locator('tbody td').evaluateAll((cells) => cells.map((cell) => {
    const clone = cell.cloneNode(true);
    clone.querySelectorAll('.sr-only').forEach((node) => node.remove());
    return clone.textContent.trim();
  }));
  check('comparison cells contain only checks and X marks',
    cellContent.length === 33 && cellContent.every((value) => value === '✓' || value === '×'),
    [...new Set(cellContent)].join(', '));
  const zodiacMarks = await comparison.locator('tbody tr td:nth-of-type(3)').evaluateAll((cells) => cells.map((cell) => {
    const clone = cell.cloneNode(true);
    clone.querySelectorAll('.sr-only').forEach((node) => node.remove());
    return clone.textContent.trim();
  }));
  check('Zodiacs receives all eleven checks',
    zodiacMarks.length === 11 && zodiacMarks.every((mark) => mark === '✓'));
  const comparisonNotes = page.locator('#fig-3 details.evidence-drawer');
  await comparisonNotes.locator('summary').focus();
  await page.keyboard.press('Enter');
  check('comparison evidence drawer opens from the keyboard', await comparisonNotes.getAttribute('open') !== null);
  await page.keyboard.press('Enter');
  check('comparison evidence drawer closes from the keyboard', await comparisonNotes.getAttribute('open') === null);
  const evidenceVault = page.locator('details.evidence-vault');
  await evidenceVault.locator(':scope > summary').focus();
  await page.keyboard.press('Enter');
  check('evidence vault opens from the keyboard', await evidenceVault.getAttribute('open') !== null);
  await page.keyboard.press('Enter');
  check('evidence vault closes from the keyboard', await evidenceVault.getAttribute('open') === null);

  // The human visual layer renders before the detailed evidence.
  check('seven-era transmission renders', (await page.locator('.transmission .era').count()) === 7);
  check('twelve-sign seasonal wheel renders', (await page.locator('.zodiac-wheel__sign').count()) === 12);
  check('Gold, Bitcoin, and Solana convergence renders',
    (await page.locator('#fig-3 .source-convergence .source-card').count()) === 3);
  check('comparison headers render Gold, Bitcoin, and the complete zodiac wheel',
    (await comparison.locator('.ztbl-brand--gold svg').count()) === 1
      && (await comparison.locator('.ztbl-brand--bitcoin').count()) === 1
      && (await comparison.locator('.ztbl-brand--zodiacs .brand-wheel i').count()) === 12);
  check('consumer journey renders', (await page.locator('.journey__step').count()) === 4);
  check('public scrapbook renders positive milestones', (await page.locator('.scrapbook__entry').count()) >= 4);
  check('plain candidacy snapshot renders', (await page.locator('.human-score__item').count()) === 4);
  check('three-question test renders', (await page.locator('.test-question').count()) === 3);
  check('plain-language instrument renders', (await page.locator('.fact-card').count()) === 6);
  check('technical evidence is progressively disclosed', (await page.locator('details.evidence-drawer').count()) >= 6);

  // Entrances use one short transition and a restrained 50ms child stagger.
  // Sample the transmission after it enters; computed timing remains available
  // after the one-time transition has completed.
  const motionSample = page.locator('#fig-1 .transmission');
  await motionSample.scrollIntoViewIfNeeded();
  await wait(850);
  const motionTimings = await motionSample.locator(':scope > *').evaluateAll((nodes) => nodes.slice(0, 4).map((node) => {
    const style = getComputedStyle(node);
    return {
      duration: Number.parseFloat(style.transitionDuration),
      delay: Number.parseFloat(style.transitionDelay),
      animation: style.animationName,
    };
  }));
  check('motion: entrances last 360–460ms and do not loop',
    motionTimings.length === 4
      && motionTimings.every((timing) => timing.duration >= 0.36 && timing.duration <= 0.46
        && timing.animation === 'none'));
  check('motion: child entrances stagger by 40–60ms',
    motionTimings.length === 4
      && motionTimings.slice(1).every((timing, index) => {
        const delta = timing.delay - motionTimings[index].delay;
        return delta >= 0.04 && delta <= 0.06;
      }),
    motionTimings.map((timing) => `${timing.delay}s`).join(', '));

  // Origin receipts stay linked from the public-history story.
  check('public history links the registry disclosure origin row',
    (await page.locator('#the-public-record a[href="https://zodiacs.org/disclosure/#origin"]').count()) === 1);

  // Evidence shots — desktop.
  await shot(page, '#fig-1', 'thesis-f1-desktop.png');
  await shot(page, '#fig-2', 'thesis-f2-desktop.png');
  await shot(page, '#fig-3', 'thesis-f3-desktop.png');
  await shot(page, '#what-holding-means', 'thesis-journey-desktop.png');
  await shot(page, '#the-public-record', 'thesis-history-desktop.png');
  await page.locator('details.evidence-vault').evaluate((node) => { node.open = true; });
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
  await mid.locator('details.evidence-vault').evaluate((node) => { node.open = true; });
  await shot(mid, '#the-instrument', 'thesis-x-1280.png');
  await shot(mid, null, 'thesis-hero-1280.png');
  await mid.close();

  // The annotated review viewport keeps the full four-column matrix.
  const review = await browser.newPage({ viewport: { width: 810, height: 1054 } });
  const reviewErrors = [];
  review.on('pageerror', (err) => reviewErrors.push(String(err)));
  review.on('requestfailed', (req) => { if (req.url().startsWith('http://127.0.0.1')) reviewErrors.push(req.url()); });
  await review.goto('http://127.0.0.1:4399/thesis/', { waitUntil: 'networkidle' });
  await wait(600);
  const reviewOverflow = await review.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
  }));
  check('810px: no page-level horizontal overflow', reviewOverflow.doc <= reviewOverflow.win,
    `${reviewOverflow.doc} vs ${reviewOverflow.win}`);
  const reviewTable = review.locator('#fig-3 .ztbl');
  const reviewTableLayout = await reviewTable.evaluate((table) => ({
    row: getComputedStyle(table.tBodies[0].rows[0]).display,
    scroll: table.parentElement.scrollWidth,
    client: table.parentElement.clientWidth,
  }));
  check('810px: comparison remains a full table', reviewTableLayout.row === 'table-row', reviewTableLayout.row);
  check('810px: comparison fits without local scrolling',
    reviewTableLayout.scroll <= reviewTableLayout.client + 1,
    `${reviewTableLayout.scroll} vs ${reviewTableLayout.client}`);
  for (const [name, selector] of VISUAL_MODULES) {
    check(`810px: ${name} is visible`, await isVisuallyExposed(review.locator(selector).first()));
  }
  await shot(review, '#fig-1', 'thesis-f1-810.png');
  await shot(review, '#fig-2', 'thesis-f2-810.png');
  await shot(review, '#fig-3', 'thesis-f3-810.png');
  await shot(review, '#what-holding-means', 'thesis-journey-810.png');
  await shot(review, '#the-public-record', 'thesis-history-810.png');
  await review.locator('details.evidence-vault').evaluate((node) => { node.open = true; });
  await shot(review, '#the-candidacy', 'thesis-v-810.png');
  await shot(review, '#the-test', 'thesis-vii-810.png');
  await shot(review, '#the-instrument', 'thesis-x-810.png');
  check('no page errors or same-origin failures (810px)', reviewErrors.length === 0,
    reviewErrors.slice(0, 2).join(' | '));
  await review.close();

  // Exact annotated mobile/tablet viewport — the almanac modules should feel
  // compact at 623×1054 without giving up their chronology or structure.
  const compact = await browser.newPage({ viewport: { width: 623, height: 1054 } });
  const compactErrors = [];
  compact.on('pageerror', (err) => compactErrors.push(String(err)));
  compact.on('requestfailed', (req) => {
    if (req.url().startsWith('http://127.0.0.1')) compactErrors.push(req.url());
  });
  await compact.goto('http://127.0.0.1:4399/thesis/', { waitUntil: 'networkidle' });
  await wait(600);
  const compactPage = await compact.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  check('623px: no page-level horizontal overflow',
    compactPage.documentWidth <= compactPage.viewportWidth + 1,
    `${compactPage.documentWidth} vs ${compactPage.viewportWidth}`);

  const chronology = await compact.locator('#fig-1 .era__time').allTextContents();
  check('623px: transmission retains seven chronological anchors',
    JSON.stringify(chronology.map((value) => value.trim())) === JSON.stringify([
      'c. 450 BCE',
      '150 BCE–150 CE',
      '850–1150 CE',
      'c. 1500',
      'c. 1910',
      'c. 2010',
      '5 Jul 2024',
    ]),
    chronology.join(' · '));

  const compactModules = [
    ['history transmission', '#fig-1 .story-figure', 0.24],
    ['attention summary', '.truth-panel', 0.24],
    ['source convergence', '#fig-3 .source-convergence', 0.44],
    ['modern rails', '.rail-map', 0.20],
    ['consumer journey', '.journey', 0.30],
  ];
  for (const [name, selector, maxViewportFraction] of compactModules) {
    const geometry = await compact.locator(selector).first().evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        height: rect.height,
        left: rect.left,
        right: rect.right,
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      };
    });
    check(`623px: ${name} stays compact`,
      geometry.height <= geometry.viewportHeight * maxViewportFraction,
      `${geometry.height.toFixed(1)}px / ${(geometry.viewportHeight * maxViewportFraction).toFixed(1)}px cap`);
    check(`623px: ${name} fits without local overflow`,
      geometry.left >= -1
        && geometry.right <= geometry.viewportWidth + 1
        && geometry.scrollWidth <= geometry.clientWidth + 1,
      JSON.stringify(geometry));
  }
  const compactRows = await compact.evaluate(() => {
    const sameRow = (selector) => {
      const tops = [...document.querySelectorAll(selector)].map((node) => node.getBoundingClientRect().top);
      return tops.length > 0 && Math.max(...tops) - Math.min(...tops) <= 2;
    };
    return {
      eras: sameRow('#fig-1 .era'),
      rails: sameRow('.rail-map__item'),
      journey: sameRow('.journey__step'),
      truth: sameRow('.truth-panel__side'),
    };
  });
  check('623px: compact modules use their intended horizontal summaries',
    compactRows.eras && compactRows.rails && compactRows.journey && compactRows.truth,
    JSON.stringify(compactRows));
  await shot(compact, '#fig-1', 'thesis-f1-623.png');
  await shot(compact, '#fig-3', 'thesis-f3-623.png');
  await shot(compact, '#what-holding-means', 'thesis-journey-623.png');
  check('no page errors or same-origin failures (623px)', compactErrors.length === 0,
    compactErrors.slice(0, 2).join(' | '));
  await compact.close();

  // No-JavaScript pass — the baked static values must stand on their own.
  const nojsContext = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
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
  const nojsHeroVideo = await nojs.locator('.hero video.hero__media').evaluate((video) => ({
    autoplay: video.hasAttribute('autoplay'),
    paused: video.paused,
  }));
  check('no-JS + reduced motion: ambient hero video stays paused',
    !nojsHeroVideo.autoplay && nojsHeroVideo.paused,
    JSON.stringify(nojsHeroVideo));
  for (const [name, selector] of VISUAL_MODULES) {
    check(`no-JS: ${name} is visually exposed`, await isVisuallyExposed(nojs.locator(selector).first()));
  }
  await nojsContext.close();

  // Reduced motion shows final states without transitions or transforms.
  const reducedContext = await browser.newContext({ reducedMotion: 'reduce' });
  const reduced = await reducedContext.newPage();
  await reduced.setViewportSize({ width: 1280, height: 1000 });
  await reduced.goto('http://127.0.0.1:4399/thesis/', { waitUntil: 'networkidle' });
  await wait(600);
  const reducedHeroVideo = await reduced.locator('.hero video.hero__media').evaluate((video) => ({
    autoplay: video.hasAttribute('autoplay'),
    paused: video.paused,
  }));
  check('reduced motion: ambient hero video is paused',
    !reducedHeroVideo.autoplay && reducedHeroVideo.paused,
    JSON.stringify(reducedHeroVideo));
  const reducedStates = await reduced.locator('.reveal, [data-visual-reveal], [data-almanac-reveal], [data-visual-reveal] > *, [data-almanac-reveal] > *').evaluateAll((nodes) => nodes.map((node) => {
    const style = getComputedStyle(node);
    return {
      opacity: Number.parseFloat(style.opacity),
      transform: style.transform,
      transition: style.transitionDuration,
      animation: style.animationName,
    };
  }));
  check('reduced motion: reveal targets render in their final state',
    reducedStates.length > 0 && reducedStates.every((state) => state.opacity > 0.99 && state.transform === 'none'),
    JSON.stringify(reducedStates.find((state) => state.opacity <= 0.99 || state.transform !== 'none') ?? ''));
  check('reduced motion: reveal targets have no active transitions or animations',
    reducedStates.every((state) => state.transition.split(',').every((duration) => Number.parseFloat(duration) === 0)
      && state.animation === 'none'));
  for (const [name, selector] of VISUAL_MODULES) {
    check(`reduced motion: ${name} is visually exposed`, await isVisuallyExposed(reduced.locator(selector).first()));
  }
  await reducedContext.close();

  // A preference change after load must stop the ambient video immediately.
  const changingMotionContext = await browser.newContext({ reducedMotion: 'no-preference' });
  const changingMotion = await changingMotionContext.newPage();
  await changingMotion.goto('http://127.0.0.1:4399/thesis/', { waitUntil: 'networkidle' });
  const changingHeroVideo = changingMotion.locator('.hero video.hero__media');
  await wait(350);
  const beforeMotionChange = await changingHeroVideo.evaluate((video) => ({ paused: video.paused, currentTime: video.currentTime }));
  await changingMotion.emulateMedia({ reducedMotion: 'reduce' });
  await wait(150);
  const afterMotionChange = await changingHeroVideo.evaluate((video) => ({ paused: video.paused, currentTime: video.currentTime }));
  check('runtime reduced-motion change pauses the ambient hero video',
    !beforeMotionChange.paused && afterMotionChange.paused,
    JSON.stringify({ before: beforeMotionChange, after: afterMotionChange }));
  await changingMotionContext.close();

  // Small-viewport passes — illustrated modules and comparison cards never scroll sideways.
  for (const width of [375, 390]) {
    const mob = await browser.newPage({ viewport: { width, height: 812 }, deviceScaleFactor: 2, hasTouch: true });
    const mobErrors = [];
    mob.on('pageerror', (err) => mobErrors.push(String(err)));
    mob.on('requestfailed', (req) => { if (req.url().startsWith('http://127.0.0.1')) mobErrors.push(req.url()); });
    await mob.goto('http://127.0.0.1:4399/thesis/', { waitUntil: 'networkidle' });
    await wait(600);
    const heroRibbon = await mob.locator('.hero__twelve').evaluate((row) => {
      const links = [...row.querySelectorAll('a')];
      return {
        count: links.length,
        rows: new Set(links.map((link) => link.getBoundingClientRect().top.toFixed(1))).size,
        scroll: row.scrollWidth,
        client: row.clientWidth,
      };
    });
    check(`${width}px: all twelve hero icons stay on one row`,
      heroRibbon.count === 12 && heroRibbon.rows === 1 && heroRibbon.scroll <= heroRibbon.client + 1,
      JSON.stringify(heroRibbon));
    const overflow = await mob.evaluate(() => ({
      doc: document.documentElement.scrollWidth, win: window.innerWidth,
    }));
    check(`${width}px: no page-level horizontal overflow`, overflow.doc <= overflow.win, `${overflow.doc} vs ${overflow.win}`);
    const mobileTable = await mob.locator('#fig-3 .ztbl').evaluate((table) => ({
      row: getComputedStyle(table.tBodies[0].rows[0]).display,
      scroll: table.parentElement.scrollWidth,
      client: table.parentElement.clientWidth,
    }));
    check(`${width}px: comparison rows become cards`, /^(?:grid|block)$/.test(mobileTable.row), mobileTable.row);
    check(`${width}px: comparison has no local horizontal overflow`,
      mobileTable.scroll <= mobileTable.client + 1, `${mobileTable.scroll} vs ${mobileTable.client}`);
    const mobileBodyDecorations = await mob.locator('#fig-3 .ztbl tbody tr').evaluateAll((rows) => rows.map((row) => (
      [...row.querySelectorAll('td')].map((cell) => {
        const pseudo = getComputedStyle(cell, '::before');
        return pseudo.backgroundImage;
      })
    )));
    check(`${width}px: comparison body cells contain marks without repeated brand icons`,
      mobileBodyDecorations.length === 11 && mobileBodyDecorations.every((decorations) => (
        decorations.length === 3 && decorations.every((image) => image === 'none')
      )));
    await mob.locator('details.evidence-vault').evaluate((node) => { node.open = true; });
    await mob.locator('#the-instrument details.evidence-drawer').evaluate((n) => { n.open = true; });
    const discScroll = await mob.locator('.disc-scroll').evaluate((n) => n.scrollWidth > n.clientWidth);
    check(`${width}px: disclosure table scrolls inside its own region`, discScroll);
    for (const [name, selector] of VISUAL_MODULES) {
      const nodes = mob.locator(selector);
      const fits = await nodes.evaluateAll((elements, viewportWidth) => elements.length > 0 && elements.every((node) => {
        const rect = node.getBoundingClientRect();
        return rect.left >= -1 && rect.right <= viewportWidth + 1 && node.scrollWidth <= node.clientWidth + 1;
      }), width);
      check(`${width}px: ${name} fits without local overflow`, fits);
    }
    if (width === 375) {
      await shot(mob, '#fig-1', 'thesis-f1-mobile.png');
      await shot(mob, '#fig-2', 'thesis-f2-mobile.png');
      await shot(mob, '#fig-3', 'thesis-f3-mobile.png');
      await shot(mob, '#what-holding-means', 'thesis-journey-mobile.png');
      await shot(mob, '#the-public-record', 'thesis-history-mobile.png');
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
console.log(failed ? `\n${results.length - failed} PASSED · ${failed} FAILED` : `\nALL PASS · ${results.length} checks`);
process.exit(failed ? 1 : 0);
