/**
 * Desktop/mobile interaction gate for the Registry's featured-sign selector.
 *
 *   npm run legacy:app
 *   npm run build
 *   npm run test:registry-selector:browser
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const OUT = process.env.OUT_DIR ?? null;
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

if (OUT) await mkdir(OUT, { recursive: true });

await withPreview({ port: 4404 }, async (baseURL) => {
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    args: STABLE_CHROMIUM_ARGS,
  });

  try {
    const desktop = await browser.newPage({ viewport: { width: 1126, height: 1180 } });
    const desktopErrors = [];
    desktop.on('pageerror', (error) => desktopErrors.push(String(error)));
    await desktop.goto(`${baseURL}/registry/`, { waitUntil: 'domcontentloaded' });
    await desktop.waitForSelector('.strip__glyph');

    const desktopLayout = await desktop.locator('.strip').evaluate((element) => ({
      display: getComputedStyle(element).display,
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    }));
    check('desktop selector is a grid', desktopLayout.display === 'grid', desktopLayout.display);
    check(
      'desktop exposes all signs without horizontal overflow',
      desktopLayout.scrollWidth <= desktopLayout.width + 1,
      `${desktopLayout.scrollWidth}/${desktopLayout.width}`,
    );
    check(
      'desktop page has no horizontal overflow',
      desktopLayout.pageWidth <= desktopLayout.viewportWidth,
      `${desktopLayout.pageWidth}/${desktopLayout.viewportWidth}`,
    );
    check(
      'desktop shows all twelve sign names',
      await desktop.locator('.strip__name').evaluateAll((elements) => (
        elements.length === 12
        && elements.every((element) => getComputedStyle(element).display !== 'none')
      )),
    );

    const seasonLabel = (await desktop.locator('.hero__season').innerText()).trim();
    const selectedLabel = await desktop.locator('.strip__glyph[aria-pressed="true"]').getAttribute('aria-label');
    check(
      'initial featured sign matches the current season',
      Boolean(selectedLabel) && seasonLabel.toLowerCase().startsWith(selectedLabel.toLowerCase()),
      `${seasonLabel} / ${selectedLabel}`,
    );

    await desktop.locator('[data-sign="pisces"]').click();
    await desktop.waitForSelector('[data-featured-sign="pisces"]');
    check('click updates the featured record', await desktop.locator('[data-featured-sign="pisces"]').count() === 1);
    check(
      'desktop status names the selected sign',
      (await desktop.locator('.strip__status').innerText()).toLowerCase().includes('pisces'),
    );

    await desktop.locator('[data-sign="pisces"]').press('ArrowLeft');
    await desktop.waitForSelector('[data-featured-sign="aquarius"]');
    // The selector deliberately moves focus in requestAnimationFrame after
    // React commits the new active button. Wait for that public focus state
    // instead of racing the scheduled frame after the featured record swaps.
    await desktop.locator('[data-sign="aquarius"]:focus').waitFor({
      state: 'attached',
      timeout: 1_000,
    });
    check('ArrowLeft moves selection', await desktop.locator('[data-sign="aquarius"][aria-pressed="true"]').count() === 1);
    check(
      'keyboard navigation moves focus with selection',
      await desktop.locator('[data-sign="aquarius"]').evaluate((element) => element === document.activeElement),
    );

    await desktop.locator('[data-sign="aquarius"]').press('Home');
    await desktop.waitForSelector('[data-featured-sign="aries"]');
    check('Home moves to the first sign', await desktop.locator('[data-sign="aries"][aria-pressed="true"]').count() === 1);
    check('desktop runtime is error-free', desktopErrors.length === 0, desktopErrors.join(' | '));
    if (OUT) await desktop.locator('.hero').screenshot({ path: `${OUT}/registry-selector-1126.png` });
    await desktop.close();

    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
    });
    await mobile.goto(`${baseURL}/registry/`, { waitUntil: 'domcontentloaded' });
    await mobile.waitForSelector('.strip__glyph');
    const mobileLayout = await mobile.locator('.strip').evaluate((element) => ({
      display: getComputedStyle(element).display,
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
      namesHidden: [...element.querySelectorAll('.strip__name')]
        .every((name) => getComputedStyle(name).display === 'none'),
    }));
    check('mobile keeps the swipe rail', mobileLayout.display === 'flex', mobileLayout.display);
    check('mobile rail genuinely overflows', mobileLayout.scrollWidth > mobileLayout.width, `${mobileLayout.scrollWidth}/${mobileLayout.width}`);
    check('mobile keeps the compact glyph-only treatment', mobileLayout.namesHidden);
    check('mobile guidance describes real input', await mobile.getByText('Swipe or scroll to choose').isVisible());

    await mobile.locator('.strip').evaluate((element) => element.scrollTo({ left: 0, behavior: 'auto' }));
    await mobile.waitForTimeout(50);
    check('mobile start hides the left fade', await mobile.locator('.strip__viewport.can-scroll-left').count() === 0);
    check('mobile start shows the right fade', await mobile.locator('.strip__viewport.can-scroll-right').count() === 1);
    await mobile.locator('.strip').evaluate((element) => element.scrollTo({ left: element.scrollWidth, behavior: 'auto' }));
    await mobile.waitForTimeout(50);
    check('mobile end shows the left fade', await mobile.locator('.strip__viewport.can-scroll-left').count() === 1);
    check('mobile end hides the right fade', await mobile.locator('.strip__viewport.can-scroll-right').count() === 0);
    if (OUT) await mobile.locator('.hero').screenshot({ path: `${OUT}/registry-selector-390.png` });
    await mobile.close();

    const reduced = await browser.newPage({
      viewport: { width: 1126, height: 1180 },
      reducedMotion: 'reduce',
    });
    await reduced.goto(`${baseURL}/registry/`, { waitUntil: 'domcontentloaded' });
    await reduced.waitForSelector('.strip__glyph');
    await reduced.locator('[data-sign="libra"]').click();
    const animationName = await reduced.locator('[data-featured-sign="libra"] .fade-key').first()
      .evaluate((element) => getComputedStyle(element).animationName);
    check('reduced motion swaps records without animation', animationName === 'none', animationName);
    await reduced.close();
  } finally {
    await browser.close();
  }
});

let failures = 0;
for (const result of results) {
  if (!result.ok) failures += 1;
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` · ${result.detail}` : ''}`);
}
console.log(failures ? `\n${failures} FAILURE${failures === 1 ? '' : 'S'}` : `\nALL ${results.length} CHECKS PASS`);
process.exit(failures ? 1 : 0);
