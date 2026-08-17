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
        { slug: 'cancer', current: 'Cancer' },
        { slug: 'pisces', current: 'Pisces' },
      ]) {
        const page = await browser.newPage({ viewport: { width, height: 844 } });
        const errors = [];
        page.on('pageerror', (error) => errors.push(String(error)));
        await page.goto(`${baseURL}/registry/${record.slug}/`, { waitUntil: 'domcontentloaded' });
        const action = page.locator('[data-team-cta]');
        await action.waitFor({ state: 'visible' });
        // Capture the header at its natural scroll position before reading
        // the fully visible standings below.
        const headerState = await page.evaluate(() => {
          const nav = document.querySelector('.wnav');
          const navWrap = document.querySelector('.wnav-wrap');
          const firstContent = document.querySelector('.lot__crumbs');
          const navBox = nav?.getBoundingClientRect();
          const firstContentBox = firstContent?.getBoundingClientRect();
          return {
            clearance: navBox && firstContentBox ? firstContentBox.top - navBox.bottom : -1,
            firstContentTop: firstContentBox?.top ?? -1,
            navBottom: navBox?.bottom ?? -1,
            navPosition: navWrap ? getComputedStyle(navWrap).position : '',
            scrollY,
          };
        });
        const state = await page.evaluate(() => {
          const teamCta = document.querySelector('[data-team-cta]');
          const teamCtaBox = teamCta?.getBoundingClientRect();
          const eyebrow = document.querySelector('.lot__eyebrow');
          const standingsTargets = [...document.querySelectorAll('[data-standings-list] a')]
            .map((element) => element.getBoundingClientRect().height);
          const currentStanding = document.querySelector('[data-standings-list] a[aria-current="page"]');
          const currentStandingStyle = currentStanding ? getComputedStyle(currentStanding) : null;
          const teamUrl = teamCta instanceof HTMLAnchorElement
            ? new URL(teamCta.href, location.href)
            : null;
          return {
            teamCtaHeight: teamCtaBox?.height ?? 0,
            teamCtaPath: teamUrl ? `${teamUrl.pathname}${teamUrl.search}${teamUrl.hash}` : '',
            teamCtaSameOrigin: teamUrl?.origin === location.origin,
            teamModules: document.querySelectorAll('[data-zodiac-games]').length,
            teamQuestion: document.querySelector('[data-team-question]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            genericShareActions: document.querySelectorAll('[data-share-sign]').length,
            phantomLinks: document.querySelectorAll('a[href*="phantom.com"]').length,
            pageWidth: document.documentElement.scrollWidth,
            viewportWidth: innerWidth,
            eyebrow: eyebrow?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            intro: document.querySelector('.lot__intro')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            sectionHeadings: [...document.querySelectorAll('.sec__title')]
              .map((heading) => heading.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
            detailHeadings: [...document.querySelectorAll('.record-detail__title')]
              .map((heading) => heading.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
            glance: document.querySelector('#glance-title')?.textContent?.trim() ?? '',
            token: document.querySelector('#token-title')?.textContent?.trim() ?? '',
            standingsLabel: document.querySelector('[data-market-standings] .standings__head span')?.textContent?.trim() ?? '',
            standingsTitle: document.querySelector('#standings-title')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            standingsSummary: document.querySelector('[data-standings-summary]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            standingsRows: document.querySelectorAll('[data-standings-list] > li').length,
            standingsCurrent: document.querySelectorAll('[data-standings-list] a[aria-current="page"]').length,
            standingsCurrentOutlined: currentStandingStyle
              ? currentStandingStyle.boxShadow !== 'none'
                || (currentStandingStyle.outlineStyle !== 'none' && parseFloat(currentStandingStyle.outlineWidth) > 0)
                || (currentStandingStyle.borderStyle !== 'none' && parseFloat(currentStandingStyle.borderWidth) > 0)
              : false,
            standingsExpanded: document.querySelector('.standings__all')?.tagName === 'DIV',
            standingsMinHeight: standingsTargets.length ? Math.min(...standingsTargets) : 0,
            people: document.querySelectorAll('.people-block li a[href^="/people/"]').length,
            attention: document.querySelector('[data-attention]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            stripNavs: document.querySelectorAll('nav.strip').length,
            acquireAliases: document.querySelectorAll('span.anchor-alias#acquire[aria-hidden="true"]').length,
            acquisitionSections: document.querySelectorAll('section#acquire, #acquire .acq__cta').length,
            jupiterLinks: document.querySelectorAll('a[href*="jup.ag"], [data-market-jupiter]').length,
            recordIntro: document.querySelector('#record .record-intro')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            recordSafety: document.querySelector('#record .rec__safety')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            tradePanels: document.querySelectorAll('[data-trade-panel]').length,
            constellation: document.querySelector('#constellation img')?.getAttribute('src') ?? '',
            constellationCopy: document.querySelector('#constellation')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          };
        });
        check(`${record.slug} at ${width}px keeps complete record context`,
          /^Zodiac sign · \d+ of 12$/.test(state.eyebrow)
            && state.intro.length > 20
            && state.glance === `${record.current} at a glance`
            && state.token === `The ${record.current} token`
            && state.sectionHeadings.includes(`Born under ${record.current}`)
            && state.sectionHeadings.includes(`${record.current} today`)
            && state.sectionHeadings.includes('Check the token')
            && !state.sectionHeadings.includes('Explore all 12')
            && state.detailHeadings.includes(`${record.current} in the sky`)
            && state.detailHeadings.includes(`The story of ${record.current}`)
            && state.standingsLabel === 'Market standings'
            && /^\d+(st|nd|rd|th) of 12 by total market value$/.test(state.standingsTitle)
            && /This rank only compares total market value\. It does not show how many people support each sign\./.test(state.standingsSummary)
            && !/buy|purchase|swap/i.test(state.standingsSummary)
            && state.standingsRows === 12
            && state.standingsCurrent === 1
            && state.standingsCurrentOutlined
            && state.standingsExpanded
            && state.people === 4
            && /English Wikipedia page/.test(state.attention)
            && !/Ethereum|Dogecoin/.test(state.attention)
            && state.teamModules === 1
            && state.teamQuestion.length > 0
            && state.teamCtaSameOrigin
            && state.teamCtaPath === `/race/?sign=${record.slug}#join`
            && state.genericShareActions === 0
            && state.phantomLinks === 0
            && state.stripNavs === 0
            && state.acquireAliases === 1
            && state.acquisitionSections === 0
            && state.jupiterLinks === 0
            && /like an account number/.test(state.recordIntro)
            && /only shows information/.test(state.recordSafety)
            && state.tradePanels === 0
            && state.constellation === `/assets/constellations/${record.slug}.svg`
            && /HYG Database v4\.0/.test(state.constellationCopy)
            && /not official constellation boundaries/.test(state.constellationCopy),
          JSON.stringify(state));
        check(`${record.slug} at ${width}px keeps 44px Games and standings targets`,
          state.teamCtaHeight >= 44 && state.standingsMinHeight >= 44,
          `${state.teamCtaHeight}/${state.standingsMinHeight}`);
        check(`${record.slug} at ${width}px has no purchase route or Jupiter link`,
          state.acquisitionSections === 0 && state.jupiterLinks === 0,
          `${state.acquisitionSections}/${state.jupiterLinks}`);
        check(`${record.slug} at ${width}px clears the fixed navigation`,
          headerState.navPosition === 'fixed'
            && headerState.scrollY === 0
            && headerState.clearance >= 15.5,
          JSON.stringify(headerState));
        // Move away and back with real keyboard events so Chromium applies the
        // same :focus-visible modality a visitor gets, without coupling this
        // gate to the number of links preceding the Games call to action.
        await action.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        const focusState = await action.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            active: element === document.activeElement,
            focusVisible: element.matches(':focus-visible'),
            outlineStyle: style.outlineStyle,
            outlineWidth: style.outlineWidth,
          };
        });
        check(`${record.slug} at ${width}px shows keyboard focus`,
          focusState.active
            && focusState.focusVisible
            && focusState.outlineStyle !== 'none'
            && parseFloat(focusState.outlineWidth) > 0,
          JSON.stringify(focusState));
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

    const noJs = await browser.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    await noJs.goto(`${baseURL}/registry/leo/`, { waitUntil: 'domcontentloaded' });
    const noJsState = await noJs.evaluate(() => {
      const quick = document.querySelector('[data-live-quote]');
      const detail = document.querySelector('details.record-detail');
      const teamCta = document.querySelector('[data-team-cta]');
      const teamUrl = teamCta instanceof HTMLAnchorElement
        ? new URL(teamCta.href, location.href)
        : null;
      const currentStanding = document.querySelector('[data-standings-list] a[aria-current="page"]');
      const currentStandingStyle = currentStanding ? getComputedStyle(currentStanding) : null;
      return {
        quickVisible: quick ? getComputedStyle(quick).opacity === '1' : false,
        status: quick?.querySelector('[data-live-state]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        detailVisible: detail ? getComputedStyle(detail).opacity === '1' : false,
        recordSafety: document.querySelector('#record .rec__safety')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        acquireAliases: document.querySelectorAll('span.anchor-alias#acquire[aria-hidden="true"]').length,
        acquisitionSections: document.querySelectorAll('section#acquire, #acquire .acq__cta').length,
        jupiterLinks: document.querySelectorAll('a[href*="jup.ag"], [data-market-jupiter]').length,
        people: document.querySelectorAll('.people-block li a[href^="/people/"]').length,
        standingsRows: document.querySelectorAll('[data-standings-list] > li').length,
        standingsCurrent: document.querySelectorAll('[data-standings-list] a[aria-current="page"]').length,
        standingsCurrentOutlined: currentStandingStyle
          ? currentStandingStyle.boxShadow !== 'none'
            || (currentStandingStyle.outlineStyle !== 'none' && parseFloat(currentStandingStyle.outlineWidth) > 0)
            || (currentStandingStyle.borderStyle !== 'none' && parseFloat(currentStandingStyle.borderWidth) > 0)
          : false,
        teamModules: document.querySelectorAll('[data-zodiac-games]').length,
        teamQuestion: document.querySelector('[data-team-question]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        teamCtaHeight: teamCta?.getBoundingClientRect().height ?? 0,
        teamCtaPath: teamUrl ? `${teamUrl.pathname}${teamUrl.search}${teamUrl.hash}` : '',
        teamCtaSameOrigin: teamUrl?.origin === location.origin,
        genericShareActions: document.querySelectorAll('[data-share-sign]').length,
        phantomLinks: document.querySelectorAll('a[href*="phantom.com"]').length,
        stripNavs: document.querySelectorAll('nav.strip').length,
        tradePanels: document.querySelectorAll('[data-trade-panel]').length,
      };
    });
    check('no-JavaScript record keeps the simple path and disclosures visible',
      noJsState.quickVisible
        && /Showing the latest saved price/.test(noJsState.status)
        && noJsState.detailVisible
        && /only shows information/.test(noJsState.recordSafety)
        && noJsState.acquireAliases === 1
        && noJsState.acquisitionSections === 0
        && noJsState.jupiterLinks === 0
        && noJsState.people === 4
        && noJsState.standingsRows === 12
        && noJsState.standingsCurrent === 1
        && noJsState.standingsCurrentOutlined
        && noJsState.teamModules === 1
        && noJsState.teamQuestion.length > 0
        && noJsState.teamCtaHeight >= 44
        && noJsState.teamCtaSameOrigin
        && noJsState.teamCtaPath === '/race/?sign=leo#join'
        && noJsState.genericShareActions === 0
        && noJsState.phantomLinks === 0
        && noJsState.stripNavs === 0
        && noJsState.tradePanels === 0,
      JSON.stringify(noJsState));
    await noJs.close();

    const chart = await browser.newPage({ viewport: { width: 781, height: 900 } });
    const chartErrors = [];
    chart.on('pageerror', (error) => chartErrors.push(String(error)));
    const twoPointDates = [
      ['2026-08-01', 0.00001],
      ['2026-08-02', 0.000012],
    ];
    await chart.route('**/assets/data/registry-market-history.v1.json', (route) => route.fulfill({
      json: {
        schema: 'zodiacs.registry-market-history.v1',
        version: 1,
        snapshots: twoPointDates.map(([date, priceUsd]) => ({
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
    await chart.route('https://api.dexscreener.com/tokens/v1/solana/**', (route) => {
      const mint = decodeURIComponent(route.request().url().split('/').pop() ?? '');
      return route.fulfill({ json: [{
        chainId: 'solana', pairAddress: 'live-leo',
        baseToken: { address: mint }, liquidity: { usd: 42000 },
        priceUsd: '0.0000724', priceChange: { h24: 1.25 },
        url: 'https://dexscreener.com/solana/live-leo',
      }] });
    });
    await chart.goto(`${baseURL}/registry/leo/`, { waitUntil: 'domcontentloaded' });
    await chart.locator('[data-market]').scrollIntoViewIfNeeded();
    await chart.locator('[data-live-price]').waitFor({ state: 'visible' });
    await chart.waitForFunction(() => document.querySelector('[data-live-state]')?.textContent?.includes('Current price checked at'));
    const liveState = await chart.locator('[data-live-quote]').evaluate((panel) => {
      const label = panel.querySelector('[data-live-price-label]');
      return {
        price: panel.querySelector('[data-live-price]')?.textContent?.trim() ?? '',
        change: panel.querySelector('[data-live-change]')?.textContent?.trim() ?? '',
        status: panel.querySelector('[data-live-state]')?.textContent?.trim() ?? '',
        label: label?.textContent?.trim() ?? '',
        labelId: label?.id ?? '',
        labelledBy: panel.getAttribute('aria-labelledby') ?? '',
      };
    });
    check('selected-token quote is live, signed, and plainly labelled',
      liveState.price === '$0.0000724'
        && liveState.change === 'Past 24 hours +1.25%'
        && /Current price checked at/.test(liveState.status)
        && !/DexScreener/.test(liveState.status)
        && liveState.label === 'Current price'
        && liveState.labelId !== ''
        && liveState.labelledBy === liveState.labelId,
      JSON.stringify(liveState));
    await chart.locator('[data-market-chart]:not([hidden])').waitFor({ timeout: 15_000 });
    const chartState = await chart.locator('[data-market]').evaluate((panel) => {
      const currentStanding = document.querySelector('[data-standings-list] a[aria-current="page"]');
      const currentStandingStyle = currentStanding ? getComputedStyle(currentStanding) : null;
      return {
        note: panel.querySelector('[data-market-chart-note]')?.textContent?.trim() ?? '',
        empty: panel.querySelector('.market__chart-empty')?.textContent?.trim() ?? '',
        paths: panel.querySelectorAll('[data-market-chart-canvas] path').length,
        points: panel.querySelectorAll('[data-market-chart-canvas] circle').length,
        chartRole: panel.querySelector('[data-market-chart-canvas] svg')?.getAttribute('role') ?? '',
        chartLabel: panel.querySelector('[data-market-chart-canvas] svg')?.getAttribute('aria-label') ?? '',
        chartTitle: panel.querySelector('[data-market-chart-canvas] svg > title')?.textContent?.trim() ?? '',
        sevenDisabled: panel.querySelector('[data-market-range="7d"]')?.disabled ?? false,
        sevenPressed: panel.querySelector('[data-market-range="7d"]')?.getAttribute('aria-pressed') ?? '',
        thirtyHidden: panel.querySelector('[data-market-range="30d"]')?.hidden ?? false,
        allHidden: panel.querySelector('[data-market-range="all"]')?.hidden ?? false,
        summaryRows: panel.querySelectorAll('[data-chart-summary] > div').length,
        metrics: [...panel.querySelectorAll('.market__k')].map((node) => node.textContent?.trim() ?? ''),
        live: panel.querySelector('[data-market-live-link]')?.getAttribute('href') ?? '',
        standingsRows: document.querySelectorAll('[data-standings-list] > li').length,
        standingsCurrent: document.querySelectorAll('[data-standings-list] a[aria-current="page"]').length,
        standingsCurrentHref: currentStanding?.getAttribute('href') ?? '',
        standingsCurrentOutlined: currentStandingStyle
          ? currentStandingStyle.boxShadow !== 'none'
            || (currentStandingStyle.outlineStyle !== 'none' && parseFloat(currentStandingStyle.outlineWidth) > 0)
            || (currentStandingStyle.borderStyle !== 'none' && parseFloat(currentStandingStyle.borderWidth) > 0)
          : false,
      };
    });
    check('archive charts draw as soon as two daily prices are available',
      /^2 daily prices through .*\.$/.test(chartState.note)
        && chartState.empty === ''
        && chartState.paths === 1
        && chartState.points === 2
        && chartState.chartRole === 'img'
        && chartState.chartLabel === chartState.note
        && chartState.chartTitle === chartState.note
        && !chartState.sevenDisabled
        && chartState.sevenPressed === 'true'
        && chartState.thirtyHidden
        && chartState.allHidden
        && chartState.summaryRows === 4
        && chartState.metrics.length === 2
        && chartState.metrics.includes('Total market value')
        && chartState.metrics.includes('Traded in 24 hours')
        && chartState.live === 'https://dexscreener.com/solana/live-leo',
      JSON.stringify(chartState));
    check('an incomplete fetched snapshot never collapses the all-12 standings',
      chartState.standingsRows === 12
        && chartState.standingsCurrent === 1
        && chartState.standingsCurrentHref === '/registry/leo/'
        && chartState.standingsCurrentOutlined,
      JSON.stringify(chartState));
    check('archive chart runtime is error free', chartErrors.length === 0, chartErrors.join(' | '));
    await chart.close();

    const sparseChart = await browser.newPage({ viewport: { width: 781, height: 900 } });
    const sparseErrors = [];
    sparseChart.on('pageerror', (error) => sparseErrors.push(String(error)));
    const sparseDates = [
      ['2026-08-01', 0.00001],
      ['2026-08-02', 0.000012],
      ['2026-08-03', null],
      ['2026-08-04', 0.000011],
      ['2026-08-06', 0.000014],
      ['2026-08-07', 0.000013],
    ];
    await sparseChart.route('**/assets/data/registry-market-history.v1.json', (route) => route.fulfill({
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
    await sparseChart.route('https://api.dexscreener.com/tokens/v1/solana/**', (route) => route.fulfill({ json: [] }));
    await sparseChart.goto(`${baseURL}/registry/leo/`, { waitUntil: 'domcontentloaded' });
    await sparseChart.locator('[data-market]').scrollIntoViewIfNeeded();
    await sparseChart.locator('[data-market-chart]:not([hidden])').waitFor({ timeout: 15_000 });
    const sparseState = await sparseChart.locator('[data-market]').evaluate((panel) => ({
      empty: panel.querySelector('.market__chart-empty')?.textContent?.trim() ?? '',
      paths: panel.querySelectorAll('[data-market-chart-canvas] path').length,
      points: panel.querySelectorAll('[data-market-chart-canvas] circle').length,
      summaryRows: panel.querySelectorAll('[data-chart-summary] > div').length,
    }));
    check('archive charts leave honest breaks for missing days',
      sparseState.empty === ''
        && sparseState.paths === 2
        && sparseState.points === 5
        && sparseState.summaryRows === 4,
      JSON.stringify(sparseState));
    check('sparse archive runtime is error free', sparseErrors.length === 0, sparseErrors.join(' | '));
    await sparseChart.close();
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
