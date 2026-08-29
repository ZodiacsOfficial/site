import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const OUT = process.env.OUT_DIR ?? null;
const CHROMIUM = await findChromium();
const expectedPrimary = ['/birth-chart/', '/astrofolio/'];
const expectedSigns = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const failures = [];

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` · ${detail}` : ''}`);
  if (!ok) failures.push(name);
}

await withPreview({ port: Number(process.env.BIO_DRIVE_PORT ?? 4431) }, async (BASE) => {
  if (OUT) await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: STABLE_CHROMIUM_ARGS });

  try {
    for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 1024, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'annotation', width: 412, height: 915 },
  ]) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.name === 'mobile' || viewport.name === 'annotation',
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${BASE}/bio/`, { waitUntil: 'networkidle' });

    const evidence = await page.evaluate(() => ({
      title: document.title,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      robots: document.querySelector('meta[name="robots"]')?.content,
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      navCount: document.querySelectorAll('.wnav').length,
      fullFooterCount: document.querySelectorAll('.zfooter').length,
      mainPaddingTop: getComputedStyle(document.querySelector('main')).paddingTop,
      card: (() => {
        const rect = document.querySelector('.bio-card')?.getBoundingClientRect();
        return rect ? { left: rect.left, right: rect.right, width: rect.width } : null;
      })(),
    }));

    check(`${viewport.name}: route renders without page errors`, errors.length === 0, errors.join(' | '));
    check(`${viewport.name}: no horizontal overflow`, evidence.width <= evidence.viewport, `${evidence.width}/${evidence.viewport}`);
    check(`${viewport.name}: canonical nav and footer remain present`, evidence.navCount === 1 && evidence.fullFooterCount === 1);
    check(`${viewport.name}: canonical navigation spacing remains present`, evidence.mainPaddingTop === '96px', evidence.mainPaddingTop);
    check(`${viewport.name}: card stays inside viewport`, Boolean(evidence.card && evidence.card.left >= 0 && evidence.card.right <= viewport.width));

    if (viewport.name === 'desktop') {
      const primary = await page.locator('.bio-links a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      const signsHeading = await page.locator('#signs-title').textContent();
      const signs = await page.locator('.bio-sign').evaluateAll((links) => links.map((link) => ({
        href: link.getAttribute('href'),
        label: link.getAttribute('aria-label'),
      })));
      check('primary links are exact', JSON.stringify(primary) === JSON.stringify(expectedPrimary), JSON.stringify(primary));
      check('horoscope heading is plain and stable', signsHeading === 'Daily horoscopes', signsHeading ?? '');
      check('all twelve signs appear once in canonical order',
        signs.length === 12 && signs.every((link, index) => (
          link.href === `/horoscopes/${expectedSigns[index]}/`
          && link.label === `${expectedSigns[index][0].toUpperCase()}${expectedSigns[index].slice(1)} daily horoscope`
        )), JSON.stringify(signs));
      check('page is self-canonical and noindex, follow',
        evidence.canonical === 'https://zodiacs.org/bio/'
          && evidence.robots?.includes('noindex') && evidence.robots?.includes('follow'),
        JSON.stringify(evidence));

      const sitemapResponse = await page.request.get(`${BASE}/sitemap.xml`);
      const sitemap = await sitemapResponse.text();
      check('noindex bio page stays out of the sitemap', sitemapResponse.ok() && !sitemap.includes('/bio/'));

      const searchResponse = await page.request.get(`${BASE}/search-index.json`);
      const searchIndex = await searchResponse.json();
      check('noindex bio page stays out of site search',
        searchResponse.ok() && Array.isArray(searchIndex)
          && !searchIndex.some((entry) => entry?.path === '/bio/'));

      await page.evaluate(() => {
        window.__bioEvents = [];
        window.zodiacsAnalytics = {
          track: (name, properties) => window.__bioEvents.push({ name, properties }),
        };
        document.querySelector('.bio-link')?.addEventListener('click', (event) => event.preventDefault(), { once: true });
      });
      await page.locator('.bio-link').first().click();
      const bioEvents = await page.evaluate(() => window.__bioEvents);
      check('primary CTA emits only its bounded destination',
        JSON.stringify(bioEvents) === JSON.stringify([
          { name: 'bio_click', properties: { destination: 'birth_chart' } },
        ]), JSON.stringify(bioEvents));

      if (OUT) await page.screenshot({ path: `${OUT}/bio-${viewport.name}.png`, fullPage: true });
      await page.keyboard.press('Tab');
      check('keyboard focus enters the page', await page.locator(':focus-visible').count() === 1);
    }
    else if (OUT) await page.screenshot({ path: `${OUT}/bio-${viewport.name}.png`, fullPage: true });
    await page.close();
  }

    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await reduced.goto(`${BASE}/bio/`, { waitUntil: 'networkidle' });
    const motion = await reduced.locator('.bio-link').first().evaluate((node) => ({
      transition: getComputedStyle(node).transitionDuration,
      animation: getComputedStyle(node).animationName,
    }));
    check('reduced motion removes bio transitions and animation',
      motion.transition.split(',').every((duration) => duration.trim() === '0s') && motion.animation === 'none',
      JSON.stringify(motion));
    await reduced.close();
  } finally {
    await browser.close();
  }
});

console.log(failures.length ? `\n${failures.length} FAILURES` : '\nALL PASS');
process.exit(failures.length ? 1 : 0);
