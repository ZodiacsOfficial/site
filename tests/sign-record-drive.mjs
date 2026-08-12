/**
 * Focused browser gate for individual Zodiac Registry records.
 *
 * This preserves the mobile geometry, keyboard focus, record continuity, and
 * honest archive-chart checks that used to be interleaved with the retired
 * combined Terminal selector drive.
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const OUT = process.env.OUT_DIR ?? null;
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

if (OUT) await mkdir(OUT, { recursive: true });

await withPreview({ port: 4396 }, async (baseURL) => {
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    headless: true,
    args: STABLE_CHROMIUM_ARGS,
  });

  try {
    for (const width of [390, 781]) {
      for (const record of [
        { slug: 'cancer', current: 'Cancer', next: 'leo', name: 'Leo' },
        { slug: 'pisces', current: 'Pisces', next: 'aries', name: 'Aries' },
      ]) {
        const page = await browser.newPage({ viewport: { width, height: 844 } });
        const errors = [];
        page.on('pageerror', (error) => errors.push(String(error)));
        await page.goto(`${baseURL}/registry/${record.slug}/`, { waitUntil: 'domcontentloaded' });
        const action = page.locator('.lot__next');
        await action.waitFor({ state: 'visible' });
        const state = await action.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const nav = document.querySelector('.wnav');
          const eyebrow = document.querySelector('.lot__eyebrow');
          return {
            href: element.getAttribute('href'),
            height: box.height,
            icon: element.querySelector('img')?.getAttribute('src') ?? '',
            navGap: eyebrow && nav
              ? eyebrow.getBoundingClientRect().top - nav.getBoundingClientRect().bottom
              : -1,
            pageWidth: document.documentElement.scrollWidth,
            viewportWidth: innerWidth,
            eyebrow: eyebrow?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            intro: document.querySelector('.lot__intro')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            sectionHeadings: [...document.querySelectorAll('.sec__title')]
              .map((heading) => heading.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
            constellation: document.querySelector('#constellation img')?.getAttribute('src') ?? '',
            constellationCopy: document.querySelector('#constellation')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          };
        });
        check(`${record.slug} at ${width}px advances to ${record.next}`,
          state.href === `/registry/${record.next}/`, state.href ?? '');
        check(`${record.slug} at ${width}px uses the ${record.name} record icon`,
          state.icon === `/assets/zodiac-icons/48/${record.next}.webp`, state.icon);
        check(`${record.slug} at ${width}px keeps complete record context`,
          /^Official Zodiac Token · Sign \d+ of 12$/.test(state.eyebrow)
            && state.intro === `${record.current} is the transferable token for the ${record.current} sign. The gold sculpture is its collection artwork—not a physical sculpture or a one-of-one NFT.`
            && state.sectionHeadings.includes('Token facts')
            && state.sectionHeadings.includes(`What ${record.current} represents`)
            && state.sectionHeadings.includes(`The story behind ${record.current}`)
            && state.sectionHeadings.includes('Official addresses')
            && state.sectionHeadings.includes(`Get ${record.current}`)
            && state.sectionHeadings.includes('Explore all 12')
            && state.constellation === `/assets/constellations/${record.slug}.svg`
            && /HYG Database v4\.0/.test(state.constellationCopy)
            && /not official IAU boundaries/.test(state.constellationCopy),
          JSON.stringify(state));
        check(`${record.slug} at ${width}px keeps a 44px next-record target`,
          state.height >= 44, String(state.height));
        check(`${record.slug} at ${width}px clears the fixed navigation`,
          state.navGap >= 15.5, String(state.navGap));
        await action.focus();
        const focusVisible = await action.evaluate((element) => {
          const style = getComputedStyle(element);
          return element === document.activeElement
            && style.outlineStyle !== 'none'
            && parseFloat(style.outlineWidth) > 0;
        });
        check(`${record.slug} at ${width}px shows keyboard focus`, focusVisible);
        check(`${record.slug} at ${width}px has no horizontal overflow`,
          state.pageWidth <= state.viewportWidth + 1,
          `${state.pageWidth}/${state.viewportWidth}`);
        check(`${record.slug} at ${width}px is runtime-error free`, errors.length === 0, errors.join(' | '));
        if (OUT && width === 390 && record.slug === 'cancer') {
          await page.screenshot({ path: `${OUT}/registry-sign-record-390.png`, fullPage: false });
        }
        await page.close();
      }
    }

    const chart = await browser.newPage({ viewport: { width: 781, height: 900 } });
    const chartErrors = [];
    chart.on('pageerror', (error) => chartErrors.push(String(error)));
    const sparseDates = [
      ['2026-08-01', 0.00001],
      ['2026-08-02', 0.000012],
      ['2026-08-03', null],
      ['2026-08-04', 0.000011],
      ['2026-08-06', 0.000014],
      ['2026-08-07', 0.000013],
    ];
    await chart.route('**/assets/data/registry-market-history.v1.json', (route) => route.fulfill({
      json: {
        schema: 'zodiacs.registry-market-history.v1',
        version: 1,
        snapshots: sparseDates.map(([date, priceUsd]) => ({
          date,
          source: { provider: 'DexScreener', readAt: `${date}T12:00:00.000Z` },
          coverage: { canonicalAssetCount: 12, assetsWithIndexedPools: 1 },
          assets: [{
            sign: 'leo', displayName: 'Leo', symbol: 'LEO', priceUsd,
            change24hPct: null, marketCapUsd: 120000, fdvUsd: 150000,
            liquidityUsd: 32000, volume24hUsd: 1700, indexedPoolCount: 2,
            deepestPool: { url: 'https://dexscreener.com/solana/fixture-leo' },
          }],
        })),
      },
    }));
    await chart.goto(`${baseURL}/registry/leo/`, { waitUntil: 'domcontentloaded' });
    await chart.locator('[data-market]').scrollIntoViewIfNeeded();
    await chart.locator('[data-market-chart]:not([hidden])').waitFor({ timeout: 15_000 });
    const chartState = await chart.locator('[data-market]').evaluate((panel) => ({
      note: panel.querySelector('[data-market-chart-note]')?.textContent?.trim() ?? '',
      paths: panel.querySelectorAll('[data-market-chart-canvas] path').length,
      points: panel.querySelectorAll('[data-market-chart-canvas] circle').length,
      sevenDisabled: panel.querySelector('[data-market-range="7d"]')?.disabled ?? false,
      thirtyDisabled: panel.querySelector('[data-market-range="30d"]')?.disabled ?? false,
      allPressed: panel.querySelector('[data-market-range="all"]')?.getAttribute('aria-pressed') ?? '',
      metrics: [...panel.querySelectorAll('.market__k')].map((node) => node.textContent?.trim() ?? ''),
      live: panel.querySelector('[data-market-live-link]')?.getAttribute('href') ?? '',
    }));
    check('archive charts preserve nulls and calendar gaps until coverage is honest',
      /^5 dated observations/.test(chartState.note)
        && chartState.paths === 2
        && chartState.points === 5
        && chartState.sevenDisabled
        && chartState.thirtyDisabled
        && chartState.allPressed === 'true'
        && chartState.metrics.includes('Market cap')
        && chartState.metrics.includes('FDV')
        && chartState.live === 'https://dexscreener.com/solana/fixture-leo',
      JSON.stringify(chartState));
    check('archive chart runtime is error free', chartErrors.length === 0, chartErrors.join(' | '));
    await chart.close();
  } finally {
    await browser.close();
  }
});

const failures = results.filter((result) => !result.ok);
for (const result of results) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` · ${result.detail}` : ''}`);
}
console.log(failures.length ? `\n${failures.length} FAILURE${failures.length === 1 ? '' : 'S'}` : `\nALL ${results.length} CHECKS PASS`);
process.exit(failures.length ? 1 : 0);
