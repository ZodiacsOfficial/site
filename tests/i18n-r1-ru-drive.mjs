import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const OUT = process.env.OUT_DIR ?? null;
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const signs = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const routes = [
  '/', '/tools/', '/birth-chart/', '/compatibility/', '/moon-sign/',
  '/rising-sign/', '/moon-phase/', '/saturn-return/', '/transits/',
  '/baby-zodiac/', '/profile/', '/methodology/', '/privacy/', '/disclosure/',
  '/404/', ...signs.map((sign) => `/${sign}/`),
].map((path) => `/ru${path}`);

if (OUT) await mkdir(OUT, { recursive: true });

await withPreview({ port: 4418 }, async (baseURL) => {
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    args: STABLE_CHROMIUM_ARGS,
  });
  try {
    for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 900 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
      const page = await context.newPage();
      const browserErrors = [];
      page.on('pageerror', (error) => browserErrors.push(error.message));

      for (const route of routes) {
        const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
        check(response?.status() === 200, `${route}@${viewport.width}: expected 200, got ${response?.status()}`);
        const state = await page.evaluate(() => ({
          lang: document.documentElement.lang,
          dir: document.documentElement.getAttribute('dir'),
          robots: document.querySelector('meta[name="robots"]')?.getAttribute('content'),
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
          alternates: document.querySelectorAll('link[rel="alternate"][hreflang]').length,
          width: document.documentElement.scrollWidth,
          viewport: innerWidth,
          selectorEntries: document.querySelectorAll('.footer__languages .footer__language-option').length,
          selectorText: document.querySelector('.footer__languages')?.textContent ?? '',
          cyrillic: (document.body.innerText.match(/[А-Яа-яЁё]/gu) ?? []).length,
          arHref: Boolean(document.querySelector('a[href="/ar"], a[href^="/ar/"]')),
        }));
        check(state.lang === 'ru', `${route}@${viewport.width}: lang=${state.lang}`);
        check(state.dir === null, `${route}@${viewport.width}: Russian page emitted dir=${state.dir}`);
        check(state.robots === 'noindex, follow, max-image-preview:large', `${route}: robots=${state.robots}`);
        check(state.canonical === `https://zodiacs.org${route}`, `${route}: canonical=${state.canonical}`);
        check(state.alternates === 0, `${route}: emitted ${state.alternates} hreflangs`);
        check(state.width <= state.viewport + 1, `${route}@${viewport.width}: ${state.width}px overflow`);
        check(state.selectorEntries === 5, `${route}: language selector has ${state.selectorEntries} public entries`);
        check(!/Русский|العربية/u.test(state.selectorText), `${route}: staged selector entry became visible`);
        check(state.cyrillic >= 60, `${route}: too little Russian copy (${state.cyrillic} Cyrillic letters)`);
        check(!state.arHref, `${route}: Arabic route leaked`);

        if (route === '/ru/' && viewport.width === 1280) {
          const desktopEnglishSeams = await page.locator('.nav__deferred').allTextContents();
          check(desktopEnglishSeams.length === 3, `Russian desktop nav exposes ${desktopEnglishSeams.length} English-only seams; expected 3`);
          check(desktopEnglishSeams.every((value) => value.trim() === '— пока по-английски'), 'Russian desktop nav seam copy drifted');
          check(await page.locator('.nav__search').count() === 0, 'English-only search control leaked into Russian desktop nav');
        }

        if (OUT && ['/ru/', '/ru/birth-chart/', '/ru/aries/'].includes(route)) {
          const name = route === '/ru/' ? 'home' : route.split('/').filter(Boolean).at(-1);
          await page.screenshot({ path: `${OUT}/${name}-${viewport.width}.png`, fullPage: true });
        }
      }

      check(browserErrors.length === 0, `${viewport.width}px browser errors: ${browserErrors.join(' | ')}`);
      await context.close();
    }

    const mobile = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(`${baseURL}/ru/`, { waitUntil: 'domcontentloaded' });
    const menu = mobilePage.locator('[data-menu-toggle]');
    check(await menu.getAttribute('aria-label') === 'Открыть меню', 'mobile menu open label is not Russian');
    await menu.focus();
    await menu.press('Enter');
    check(await menu.getAttribute('aria-expanded') === 'true', 'mobile menu did not open from keyboard');
    check(await menu.getAttribute('aria-label') === 'Закрыть меню', 'mobile menu close label is not Russian');
    check(await mobilePage.locator('[data-mobile-menu]').isVisible(), 'mobile menu is not visible after keyboard open');
    check(await mobilePage.locator('[data-mobile-menu] a[href="/birthday/"]').count() === 0, 'deferred birthday tool leaked into Russian mobile menu');
    check(await mobilePage.locator('[data-mobile-menu] a[href="/learn/"][hreflang="en"]').count() === 1, 'Russian mobile Learn seam is not declared English');
    check(await mobilePage.locator('[data-mobile-menu] a[href="/registry/"][hreflang="en"]').count() === 1, 'Russian mobile Registry seam is not declared English');
    const focusOutline = await menu.evaluate((node) => getComputedStyle(node).outlineStyle);
    check(focusOutline !== 'none', 'mobile menu focus is not visible');
    await mobile.close();

    const reduced = await browser.newContext({
      viewport: { width: 360, height: 800 },
      reducedMotion: 'reduce',
    });
    const reducedPage = await reduced.newPage();
    await reducedPage.goto(`${baseURL}/ru/`, { waitUntil: 'networkidle' });
    const reducedState = await reducedPage.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      hiddenReveal: Array.from(document.querySelectorAll('.reveal')).some((node) => getComputedStyle(node).opacity === '0'),
    }));
    check(reducedState.width <= reducedState.viewport + 1, 'reduced-motion Russian home overflows');
    check(!reducedState.hiddenReveal, 'reduced-motion Russian home leaves content hidden');
    await reduced.close();

    const chartContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const chart = await chartContext.newPage();
    const chartErrors = [];
    chart.on('pageerror', (error) => chartErrors.push(error.message));
    await chart.goto(`${baseURL}/ru/birth-chart/`, { waitUntil: 'networkidle' });
    check(await chart.getByLabel('Дата рождения').count() === 1, 'Russian birth-date label is missing');
    check(await chart.getByLabel('Время рождения').count() === 1, 'Russian birth-time label is missing');
    check(await chart.getByLabel('Место рождения').count() === 1, 'Russian birthplace label is missing');
    await chart.locator('#birth-date').fill('1990-06-15');
    await chart.locator('#birth-time').fill('08:30');
    await chart.locator('#place').fill('New York');
    await chart.locator('#place-list [role="option"]').first().waitFor({ timeout: 10_000 });
    await chart.locator('#place-list [role="option"]').first().click();
    await chart.locator('form.calc__form button[type="submit"]').click();
    await chart.locator('.calc__result').waitFor({ timeout: 20_000 });
    const chartText = await chart.locator('.calc__result').innerText();
    check(/[А-Яа-яЁё]/u.test(chartText), 'computed chart result has no Russian copy');
    check(!/Your (?:Moon|Rising)|Birth chart|House system/u.test(chartText), 'computed chart result leaked English interface copy');
    check(await chart.locator('.calc__result').evaluate((node) => node.scrollWidth <= node.clientWidth + 1), 'computed Russian chart result overflows');
    check(chartErrors.length === 0, `Russian chart browser errors: ${chartErrors.join(' | ')}`);
    await chartContext.close();

    const fontPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await fontPage.goto(`${baseURL}/ru/`, { waitUntil: 'networkidle' });
    const fonts = await fontPage.evaluate(async () => {
      await document.fonts.ready;
      return {
        golos: document.fonts.check('16px "Golos Text"', 'Натальная карта'),
        garamond: document.fonts.check('32px "EB Garamond Cyrillic"', 'Знаки'),
        mono: document.fonts.check('12px "JetBrains Mono Cyrillic"', 'ДАТА'),
      };
    });
    check(fonts.golos && fonts.garamond && fonts.mono, `Russian fonts did not load: ${JSON.stringify(fonts)}`);
    await fontPage.close();
  } finally {
    await browser.close();
  }
});

if (failures.length) {
  console.error(`i18n-r1-ru-drive: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('i18n-r1-ru-drive: 27 private routes passed at 360/1280, plus keyboard, reduced-motion, chart-result, and font checks');
