/**
 * Browser contract for the Phase 1 horoscope program.
 *
 *   npm run build
 *   OUT_DIR=/tmp/horoscope-program node tests/horoscope-program-drive.mjs
 *
 * Point ZODIACS_TEST_BASE_URL at an existing preview to skip spawning one.
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const OUT = process.env.OUT_DIR ?? null;
const CHROMIUM = await findChromium();

const PERIODS = [
  ['Daily', ''],
  ['Tomorrow', 'tomorrow'],
  ['Weekly', 'weekly'],
  ['Monthly', 'monthly'],
  ['Love', 'love'],
  ['Career', 'career'],
  ['2027', '2027'],
];

const ROUTES = [
  { key: 'daily', sign: 'aries', name: 'Aries', suffix: '', title: 'daily horoscope', active: 'Daily', minWords: 90 },
  { key: 'tomorrow', sign: 'taurus', name: 'Taurus', suffix: 'tomorrow', title: 'tomorrow horoscope', active: 'Tomorrow', minWords: 90 },
  { key: 'weekly', sign: 'libra', name: 'Libra', suffix: 'weekly', title: 'weekly horoscope', active: 'Weekly', minWords: 200 },
  { key: 'monthly', sign: 'cancer', name: 'Cancer', suffix: 'monthly', title: 'monthly horoscope', active: 'Monthly', minWords: 250 },
  { key: 'love', sign: 'scorpio', name: 'Scorpio', suffix: 'love', title: 'love horoscope', active: 'Love', minWords: 60 },
  { key: 'career', sign: 'capricorn', name: 'Capricorn', suffix: 'career', title: 'career horoscope', active: 'Career', minWords: 60 },
  { key: 'year', sign: 'pisces', name: 'Pisces', suffix: '2027', title: '2027 horoscope', active: '2027', minWords: 1_200 },
].map((route) => ({
  ...route,
  path: `/horoscopes/${route.sign}/${route.suffix ? `${route.suffix}/` : ''}`,
  heading: `${route.name} ${route.title}`,
}));

const VIEWPORTS = [
  { key: 'desktop', width: 1280, height: 900, deviceScaleFactor: 1, hasTouch: false },
  { key: 'mobile', width: 360, height: 800, deviceScaleFactor: 2, hasTouch: true },
];

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

function countWords(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function safeName(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

async function checkStaticHtml(baseURL, route) {
  const response = await fetch(`${baseURL}${route.path}`);
  const html = await response.text();
  const canonical = `https://zodiacs.org${route.path}`;

  check(`${route.key}: static response is 200`, response.status === 200, String(response.status));
  check(`${route.key}: heading is present in initial HTML`, html.includes(route.heading));
  check(
    `${route.key}: canonical is present in initial HTML`,
    html.includes(`rel="canonical" href="${canonical}"`),
    canonical,
  );
  check(`${route.key}: shared reading is server-rendered`, html.includes('class="program__reading'));
  check(
    `${route.key}: pastel hero icon is present in initial HTML`,
    html.includes(`/assets/zodiac-icons/400/${route.sign}.webp`),
  );
  check(`${route.key}: period navigation is present in initial HTML`, html.includes('class="program__periods"'));
}

async function inspectRenderedPage(page, route, viewportKey) {
  const response = await page.goto(route.path, {
    waitUntil: 'networkidle',
  });
  check(`${route.key} ${viewportKey}: browser response is 200`, response?.status() === 200, String(response?.status()));

  const canonical = `https://zodiacs.org${route.path}`;
  const canonicalNode = page.locator('link[rel="canonical"]');
  const canonicalHref = await canonicalNode.count() > 0 ? await canonicalNode.getAttribute('href') : null;
  check(
    `${route.key} ${viewportKey}: canonical URL is exact`,
    canonicalHref === canonical,
    canonicalHref ?? 'missing',
  );
  const headingNode = page.locator('h1').first();
  const headingText = await headingNode.count() > 0 ? (await headingNode.innerText()).trim() : '';
  check(
    `${route.key} ${viewportKey}: expected heading renders`,
    headingText === route.heading,
    headingText || 'missing',
  );

  const iconNode = page.locator('.program__hero .sign-icon img');
  const iconPath = await iconNode.count() > 0 ? await iconNode.getAttribute('src') : null;
  check(
    `${route.key} ${viewportKey}: hero uses the pastel zodiac asset`,
    iconPath === `/assets/zodiac-icons/400/${route.sign}.webp`,
    iconPath ?? 'missing',
  );

  const periodLinks = await page.locator('.program__periods a').evaluateAll((links) => links.map((link) => ({
    text: (link.textContent ?? '').trim(),
    href: link.getAttribute('href'),
    current: link.getAttribute('aria-current'),
  })));
  const expectedLinks = PERIODS.map(([label, suffix]) => ({
    text: label,
    href: `/horoscopes/${route.sign}/${suffix ? `${suffix}/` : ''}`,
  }));
  check(
    `${route.key} ${viewportKey}: period navigation exposes all seven canonical links`,
    JSON.stringify(periodLinks.map(({ text, href }) => ({ text, href }))) === JSON.stringify(expectedLinks),
    JSON.stringify(periodLinks),
  );
  check(
    `${route.key} ${viewportKey}: one period is marked current`,
    periodLinks.filter(({ current }) => current === 'page').length === 1
      && periodLinks.find(({ current }) => current === 'page')?.text === route.active,
    JSON.stringify(periodLinks.filter(({ current }) => current === 'page')),
  );

  const readingNode = page.locator('.program__reading');
  const readingText = await readingNode.count() > 0 ? await readingNode.innerText() : '';
  const words = countWords(readingText);
  check(
    `${route.key} ${viewportKey}: complete editorial reading renders`,
    words >= route.minWords,
    `${words} words / ${route.minWords} minimum`,
  );
  const sourceNode = page.locator('.program__basis');
  const sourceSummary = sourceNode.locator('summary');
  check(
    `${route.key} ${viewportKey}: astrology details stay out of the primary reading`,
    await sourceNode.count() === 1 && !await sourceNode.evaluate((node) => node.hasAttribute('open')),
  );
  check(
    `${route.key} ${viewportKey}: evidence disclosure is keyboard and touch reachable`,
    (await sourceSummary.innerText()).includes('Behind this reading'),
  );
  await sourceSummary.click();
  const sourceText = await sourceNode.innerText();
  check(
    `${route.key} ${viewportKey}: evidence and method remain available on demand`,
    await sourceNode.evaluate((node) => node.hasAttribute('open'))
      && sourceText.includes('Read our method and sources'),
  );

  const layout = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return {
      viewport: innerWidth,
      root: root.scrollWidth,
      body: body.scrollWidth,
      periodClient: document.querySelector('.program__periods')?.clientWidth ?? 0,
      periodScroll: document.querySelector('.program__periods')?.scrollWidth ?? 0,
    };
  });
  check(
    `${route.key} ${viewportKey}: page has no horizontal overflow`,
    Math.max(layout.root, layout.body) <= layout.viewport + 1,
    JSON.stringify(layout),
  );
  if (viewportKey === 'mobile') {
    check(
      `${route.key} mobile: period strip contains its own overflow`,
      layout.periodScroll > layout.periodClient,
      JSON.stringify(layout),
    );
  }

  if (OUT) {
    await page.screenshot({ path: `${OUT}/${safeName(`${route.key}-${viewportKey}`)}.png`, fullPage: true });
  }
}

async function inspectNoJavaScript(browser, baseURL, route) {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    reducedMotion: 'reduce',
    viewport: { width: 900, height: 800 },
  });
  const page = await context.newPage();
  try {
    const response = await page.goto(route.path, { waitUntil: 'networkidle' });
    const readingNode = page.locator('.program__reading');
    const readingText = await readingNode.count() > 0 ? await readingNode.innerText() : '';
    check(`${route.key} no-JavaScript: response is 200`, response?.status() === 200, String(response?.status()));
    check(
      `${route.key} no-JavaScript: heading remains visible`,
      await page.getByRole('heading', { level: 1, name: route.heading, exact: true }).isVisible(),
    );
    check(
      `${route.key} no-JavaScript: editorial copy remains visible`,
      await readingNode.isVisible() && countWords(readingText) >= route.minWords,
    );
    check(
      `${route.key} no-JavaScript: native period links remain available`,
      await page.locator('.program__periods a').count() === PERIODS.length,
    );
    const basis = page.locator('.program__basis');
    await basis.locator('summary').click();
    check(
      `${route.key} no-JavaScript: astrology disclosure remains usable`,
      await basis.evaluate((node) => node.hasAttribute('open'))
        && (await basis.innerText()).includes('Read our method and sources'),
    );
    check(
      `${route.key} no-JavaScript: page is not a loading shell`,
      readingText.length > 0 && !/\bloading\b/i.test(readingText),
    );
  } finally {
    await context.close();
  }
}

await withPreview({ port: 4409 }, async (baseURL) => {
  if (OUT) await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    args: STABLE_CHROMIUM_ARGS,
  });
  try {
    for (const route of ROUTES) await checkStaticHtml(baseURL, route);

    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        baseURL,
        reducedMotion: 'reduce',
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor,
        hasTouch: viewport.hasTouch,
      });
      for (const route of ROUTES) {
        const page = await context.newPage();
        const runtimeErrors = [];
        page.on('pageerror', (error) => runtimeErrors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') runtimeErrors.push(message.text());
        });
        try {
          await inspectRenderedPage(page, route, viewport.key);
          check(
            `${route.key} ${viewport.key}: no browser runtime errors`,
            runtimeErrors.length === 0,
            runtimeErrors.slice(0, 3).join(' | '),
          );
        } finally {
          await page.close();
        }
      }
      await context.close();
    }

    for (const route of ROUTES) await inspectNoJavaScript(browser, baseURL, route);
  } finally {
    await browser.close();
  }
});

let failures = 0;
for (const result of results) {
  if (!result.ok) failures += 1;
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` · ${result.detail}` : ''}`);
}
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
