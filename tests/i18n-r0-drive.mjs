import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const LOCALES = [
  { code: 'en', prefix: '', lang: 'en', hreflang: 'en' },
  { code: 'es', prefix: '/es', lang: 'es', hreflang: 'es' },
  { code: 'pt', prefix: '/pt', lang: 'pt-BR', hreflang: 'pt-BR' },
  { code: 'fr', prefix: '/fr', lang: 'fr', hreflang: 'fr' },
  { code: 'it', prefix: '/it', lang: 'it', hreflang: 'it' },
];
const HREFLANGS = [...LOCALES.map((entry) => entry.hreflang), 'x-default'];
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const localizedPath = (prefix, path) => `${prefix}${path}` || '/';

await withPreview({ port: 4417 }, async (baseURL) => {
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    args: STABLE_CHROMIUM_ARGS,
  });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      const page = await browser.newPage({ viewport });
      const browserErrors = [];
      page.on('pageerror', (error) => browserErrors.push(error.message));

      for (const route of ['/', '/birth-chart/', '/birthday/july-15/', '/learn/chinese-zodiac/dragon/']) {
        for (const locale of LOCALES) {
          const path = localizedPath(locale.prefix, route);
          const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded' });
          check(response?.status() === 200, `${path}@${viewport.width}: expected 200, got ${response?.status()}`);
          const state = await page.evaluate(() => ({
            lang: document.documentElement.lang,
            dirAttribute: document.documentElement.getAttribute('dir'),
            width: document.documentElement.scrollWidth,
            viewport: innerWidth,
            canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
            alternates: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'))
              .map((node) => [node.getAttribute('hreflang'), node.href]),
            selector: Array.from(document.querySelectorAll('.footer__languages .footer__language-option'))
              .map((node) => node.textContent?.replace(/^\s*·\s*/, '').trim()),
            inactiveText: /Русский|العربية/u.test(document.body.textContent ?? ''),
            inactiveHref: Boolean(document.querySelector(
              'a[href="/ru"], a[href^="/ru/"], a[href="/ar"], a[href^="/ar/"], '
              + 'a[href="https://zodiacs.org/ru"], a[href^="https://zodiacs.org/ru/"], '
              + 'a[href="https://zodiacs.org/ar"], a[href^="https://zodiacs.org/ar/"]',
            )),
          }));
          check(state.lang === locale.lang, `${path}@${viewport.width}: lang ${state.lang}`);
          check(state.dirAttribute === null, `${path}@${viewport.width}: LTR output gained dir=${state.dirAttribute}`);
          check(state.width <= state.viewport + 1, `${path}@${viewport.width}: ${state.width}px overflow`);
          check(state.canonical === `https://zodiacs.org${path}`, `${path}: canonical ${state.canonical}`);
          check(JSON.stringify(state.alternates.map(([lang]) => lang)) === JSON.stringify(HREFLANGS),
            `${path}: hreflangs ${state.alternates.map(([lang]) => lang).join(',')}`);
          check(state.selector.length === 5, `${path}: selector has ${state.selector.length} entries`);
          check(!state.inactiveText && !state.inactiveHref, `${path}: staged locale leaked into rendered UI`);
        }
      }

      for (const { path, selectorCount } of [
        { path: '/today/', selectorCount: 5 },
        { path: '/horoscopes/aries/', selectorCount: 5 },
        { path: '/events/', selectorCount: 5 },
        { path: '/registry/', selectorCount: 0 },
      ]) {
        const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded' });
        check(response?.status() === 200, `${path}@${viewport.width}: deferred route is unavailable`);
        const state = await page.evaluate(() => ({
          alternates: document.querySelectorAll('link[rel="alternate"][hreflang]').length,
          selector: document.querySelectorAll('.footer__languages .footer__language-option').length,
          width: document.documentElement.scrollWidth,
          viewport: innerWidth,
          inactiveHref: Boolean(document.querySelector(
            'a[href="/ru"], a[href^="/ru/"], a[href="/ar"], a[href^="/ar/"], '
            + 'a[href="https://zodiacs.org/ru"], a[href^="https://zodiacs.org/ru/"], '
            + 'a[href="https://zodiacs.org/ar"], a[href^="https://zodiacs.org/ar/"]',
          )),
        }));
        check(state.alternates === 0, `${path}: deferred route emitted ${state.alternates} hreflangs`);
        check(state.selector === selectorCount,
          `${path}: deferred route locale-home selector has ${state.selector} entries`);
        check(state.width <= state.viewport + 1, `${path}@${viewport.width}: ${state.width}px overflow`);
        check(!state.inactiveHref, `${path}: staged locale href leaked`);
      }
      check(browserErrors.length === 0, `${viewport.width}px browser errors: ${browserErrors.join(' | ')}`);
      await page.close();
    }

    const page = await browser.newPage();
    for (const path of ['/ar/', '/ar/birth-chart/']) {
      const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded' });
      check(response?.status() === 404, `${path}: expected 404, got ${response?.status()}`);
    }
    await page.close();
  } finally {
    await browser.close();
  }
});

if (failures.length) {
  console.error(`i18n-r0-drive: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('i18n-r0-drive: public locale rails remain isolated; Arabic routes remain absent');
