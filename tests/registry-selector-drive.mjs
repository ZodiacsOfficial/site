/**
 * Desktop/mobile interaction gate for the Registry's featured-sign selector.
 *
 *   npm run legacy:app
 *   npm run build
 *   npm run test:registry-selector:browser
 */
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const OUT = process.env.OUT_DIR ?? null;
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });
async function waitForSettledCanvas(page, canvas, {
  consecutive = 4,
  interval = 350,
  attempts = 18,
} = {}) {
  let previous = null;
  let streak = 0;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const frame = await canvas.screenshot();
    streak = previous?.equals(frame) ? streak + 1 : 1;
    previous = frame;
    if (streak >= consecutive) return { frame, settled: true, attempts: attempt + 1 };
    await page.waitForTimeout(interval);
  }
  return { frame: previous, settled: false, attempts };
}
// The consumer route includes the live market board and one concise briefing.
// Keep a ceiling as a regression guard for the intentional narrative.
const MAX_COMPACT_REGISTRY_HEIGHT = 9_000;
// Narrow phones retain the sculpture, market board, and one continuous
// briefing, but no duplicate research ledger or twelve-sign signal wheel.
// The fully revealed WebGL path, including the readable market-and-venue
// notice, measures 10.3–10.6k across the supported phones. Keep a tight
// ceiling with enough room for cross-platform font metrics.
const MAX_PHONE_REGISTRY_HEIGHT = 10_750;
// The 42px live tape now owns one row of the framed hero. The scene camera fits
// the sculpture to the room it receives, so 260px is the useful desktop floor;
// mobile retains its separate 200px floor and explicit placard-clearance gate.
const MIN_DESKTOP_STAGE_HEIGHT = 260;
const committedOutlook = JSON.parse(await readFile(
  new URL('../public/assets/registry-outlook.json', import.meta.url),
  'utf8',
));
const COMMITTED_OUTLOOK_REFERENCE = committedOutlook.daily.horizon.referenceAt;
const committedRegistry = JSON.parse(await readFile(
  new URL('../public/registry/zodiacs.registry.json', import.meta.url),
  'utf8',
));
const REGISTRY_MINT_BY_SIGN = Object.fromEntries(
  committedRegistry.assets.map((asset) => [asset.sign, asset.native.address]),
);

async function freezeRegistryClock(page) {
  await page.addInitScript((referenceAt) => {
    const NativeDate = Date;
    const fixedTime = new NativeDate(referenceAt).getTime();
    class RegistryDate extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [fixedTime]));
      }

      static now() {
        return fixedTime;
      }
    }
    Object.setPrototypeOf(RegistryDate, NativeDate);
    window.Date = RegistryDate;
  }, COMMITTED_OUTLOOK_REFERENCE);
}

/**
 * The gallery band replaces the strip wherever WebGL exists, so the strip's
 * own assertions run with WebGL denied — the fallback those readers actually
 * get. The band is asserted separately, on an unstubbed page.
 */
async function stubNoWebgl(page) {
  await page.addInitScript(() => {
    const real = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (type === 'webgl' || type === 'webgl2') return null;
      return real.call(this, type, ...rest);
    };
  });
}

/**
 * Consumer market reads stay hermetic: the batch token endpoint answers from
 * a fixture so quote assertions never depend on DexScreener availability.
 * Pass { fail: true } or { empty: true } to exercise unavailable states. A
 * singleRequestGate can hold the desk's one-mint liquidity read while the
 * twelve-mint market fixture continues immediately.
 */
async function mockDexscreener(page, {
  fail = false,
  empty = false,
  singleRequestGate = null,
} = {}) {
  await page.route('https://api.dexscreener.com/**', async (route) => {
    if (fail) return route.abort();
    const url = route.request().url();
    if (!url.includes('/tokens/v1/solana/')) return route.fulfill({ json: { pairs: [] } });
    if (empty) return route.fulfill({ json: [] });
    const mints = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '').split(',');
    if (mints.length === 1 && singleRequestGate) await singleRequestGate;
    return route.fulfill({
      json: mints.map((mint, index) => ({
        chainId: 'solana',
        dexId: 'raydium',
        url: 'https://dexscreener.com/solana/fixture',
        pairAddress: `FIXTUREPAIR${index}`,
        baseToken: { address: mint },
        priceUsd: String((index + 1) * 0.00042),
        priceChange: { h24: index % 3 === 0 ? 4.2 : index % 3 === 1 ? -2.1 : 0 },
        liquidity: { usd: 250000 + index },
        marketCap: 1000000 + index,
        fdv: 1200000 + index,
        volume: { h24: 64000 + index },
        pairCreatedAt: 1721000000000,
      })),
    });
  });
}

/**
 * The selected-token placard owns one small GeckoTerminal request: the 24
 * closed hourly candles for its current canonical mint and deepest pool. The
 * provider fills no-swap clock hours with the preceding close and zero volume;
 * the fixture mirrors that contract so the UI can distinguish active candles
 * from idle ticks without fabricating a swap.
 */
async function mockGeckoHourly(page, {
  requests = [],
  missingIndex = 9,
  includedIndexes = null,
} = {}) {
  await page.route('https://api.geckoterminal.com/api/v2/**', (route) => {
    const url = new URL(route.request().url());
    const parts = url.pathname.split('/').filter(Boolean);
    const poolIndex = parts.indexOf('pools') + 1;
    const pool = poolIndex > 0 ? decodeURIComponent(parts[poolIndex] ?? '') : '';
    const token = url.searchParams.get('token') ?? '';
    const beforeTimestamp = Number(url.searchParams.get('before_timestamp'));
    const limit = Number(url.searchParams.get('limit'));
    requests.push({
      aggregate: url.searchParams.get('aggregate'),
      beforeTimestamp,
      currency: url.searchParams.get('currency'),
      includeEmptyIntervals: url.searchParams.get('include_empty_intervals'),
      limit,
      pathname: url.pathname,
      pool,
      token,
    });

    const candles = [];
    const activeIndexes = new Set(includedIndexes ?? Array.from(
      { length: 24 },
      (_, index) => index,
    ).filter((index) => index !== missingIndex));
    let previousClose = 0.00004;
    for (let index = 0; index < 24; index += 1) {
      const timestamp = beforeTimestamp - ((24 - index) * 3_600);
      const active = activeIndexes.has(index);
      if (active) {
        const open = previousClose;
        const close = 0.00004 + (index * 0.000001);
        const high = Math.max(open, close) + 0.0000008;
        const low = Math.min(open, close) - 0.0000009;
        candles.push([timestamp, open, high, low, close, 1_200 + index]);
        previousClose = close;
      } else {
        candles.push([timestamp, previousClose, previousClose, previousClose, previousClose, 0]);
      }
    }

    return route.fulfill({
      json: {
        data: {
          type: 'ohlcv_request_response',
          attributes: { ohlcv_list: candles.reverse() },
        },
      },
    });
  });
}

/** Deterministic eight-day fallback for constrained-connection checks. */
async function mockSelectedTokenArchive(page, sign = 'leo') {
  const start = Date.UTC(2026, 6, 20, 12);
  await page.route('**/assets/data/registry-market-history.v1.json', (route) => route.fulfill({
    json: {
      schema: 'zodiacs.registry-market-history.v1',
      version: 1,
      snapshots: Array.from({ length: 8 }, (_, index) => {
        const instant = new Date(start + (index * 86_400_000));
        const date = instant.toISOString().slice(0, 10);
        return {
          date,
          source: { provider: 'DexScreener', readAt: instant.toISOString() },
          coverage: { canonicalAssetCount: 12, assetsWithIndexedPools: 1 },
          assets: [{
            sign,
            displayName: sign[0].toUpperCase() + sign.slice(1),
            symbol: sign.toUpperCase(),
            priceUsd: 0.00003 + (index * 0.000001),
            change24hPct: null,
            marketCapUsd: 120_000,
            fdvUsd: 150_000,
            liquidityUsd: 32_000,
            volume24hUsd: 1_700,
            indexedPoolCount: 2,
            deepestPool: {
              pairAddress: 'FIXTUREPAIR4',
              url: 'https://dexscreener.com/solana/fixture-leo',
            },
          }],
        };
      }),
    },
  }));
}

/** The advanced terminal is deployment-flagged independently of trading. */
async function withExchangeFlag(page) {
  await page.route('**/terminal/', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    const body = (await response.text()).replace(
      '<meta name="zodiacs-registry-exchange-enabled" content="0" />',
      '<meta name="zodiacs-registry-exchange-enabled" content="1" />',
    );
    return route.fulfill({ response, body, headers: { ...response.headers(), 'content-length': undefined } });
  });
}

/** Keep the landing briefing's independent source boundary deterministic.
 * Three fresh outside headlines prove that the landing renders at most two;
 * the Pisces topic also proves selected-sign relevance wins over chronology. */
function registryBriefingNewsPayload() {
  const publishedAt = new Date(Date.parse(COMMITTED_OUTLOOK_REFERENCE) - 86_400_000).toISOString();
  return {
    schema: 'registry-news.v1', updatedAt: publishedAt,
    items: [
      {
        id: 'astrology-headline', sourceType: 'astrology-news', publisher: 'The Astrology Podcast',
        publishedAt, title: 'Independent astrology headline', url: 'https://theastrologypodcast.com/example',
        author: 'External author', topics: ['pisces'], signs: ['pisces'],
      },
      {
        id: 'astronomy-headline', sourceType: 'astronomy', publisher: 'NASA',
        publishedAt, title: 'Independent astronomy headline', url: 'https://www.nasa.gov/example',
        author: 'NASA', topics: ['astronomy'], signs: [],
      },
      {
        id: 'extra-astrology-headline', sourceType: 'astrology-news', publisher: 'The Mountain Astrologer',
        publishedAt: new Date(Date.parse(publishedAt) - 3_600_000).toISOString(),
        title: 'A third fresh headline', url: 'https://mountainastrologer.com/example',
        author: 'External author', topics: ['leo'], signs: ['leo'],
      },
    ],
  };
}

async function mockRegistryBriefingSources(page) {
  await page.route('**/api/registry/news', (route) => route.fulfill({
    json: registryBriefingNewsPayload(),
  }));
}

/** The Cabinet is deployment-flagged. Enable it on visual consumer pages so
 * this gate exercises the same purpose card the public Registry ships. */
async function withCollectionFlag(page) {
  await page.route('**/terminal/', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    const body = (await response.text()).replace(
      '<meta name="zodiacs-registry-collection-enabled" content="0" />',
      '<meta name="zodiacs-registry-collection-enabled" content="1" />',
    );
    return route.fulfill({ response, body, headers: { ...response.headers(), 'content-length': undefined } });
  });
}

if (OUT) await mkdir(OUT, { recursive: true });

await withPreview({ port: 4404 }, async (baseURL) => {
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    args: STABLE_CHROMIUM_ARGS,
  });

  // The hub loads React from unpkg at runtime. A sandbox that cannot reach
  // the CDN can point REACT_UMD_DIR at a directory holding the two UMD
  // builds; CI never sets it and takes the network path.
  const reactShimDir = process.env.REACT_UMD_DIR ?? null;
  const shimReact = async (page) => {
    if (!reactShimDir) return;
    await page.route('https://unpkg.com/react@18.3.1/umd/react.production.min.js', (route) =>
      route.fulfill({ path: `${reactShimDir}/react.production.min.js` }));
    await page.route('https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js', (route) =>
      route.fulfill({ path: `${reactShimDir}/react-dom.production.min.js` }));
  };
  const newPage = async (options) => {
    const page = await browser.newPage(options);
    await shimReact(page);
    return page;
  };

  try {
    const navRoutes = [
      { path: '/', selector: '.nav-wrap .nav', prefix: 'nav' },
      { path: '/terminal/', selector: '.wnav-wrap .wnav', prefix: 'wnav' },
      { path: '/registry/aries/', selector: '.wnav-wrap .wnav', prefix: 'wnav' },
      { path: '/sdk/', selector: '.wnav-wrap .wnav', prefix: 'wnav' },
    ];
    for (const width of [390, 781, 1280]) {
      let referenceGeometry = null;
      let referenceMenuVisual = null;
      for (const route of navRoutes) {
        const navPage = await newPage({ viewport: { width, height: 900 } });
        await navPage.goto(`${baseURL}${route.path}`, { waitUntil: 'domcontentloaded' });
        const nav = navPage.locator(route.selector).first();
        await nav.waitFor({ state: 'visible' });
        const geometry = await nav.evaluate((element, { prefix, viewportWidth }) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const chip = element.querySelector(`.${prefix}__chip`);
          const search = element.querySelector(`.${prefix}__search`);
          const burger = element.querySelector(`.${prefix}__burger`);
          const sep = element.querySelector(`.${prefix}__sep`);
          const dim = element.querySelector(`.${prefix}__dim`);
          const chipStyle = chip ? getComputedStyle(chip) : null;
          const visible = (node) => Boolean(node && getComputedStyle(node).display !== 'none');
          const size = (node) => {
            if (!node) return null;
            const box = node.getBoundingClientRect();
            return { width: box.width, height: box.height };
          };
          const colorAlpha = (value) => {
            const match = value.match(/rgba?\([^)]*[ ,\/]([\d.]+)\)$/);
            return match ? Number(match[1]) : 1;
          };
          return {
            width: rect.width,
            left: rect.left,
            height: rect.height,
            paddingLeft: parseFloat(style.paddingLeft),
            paddingRight: parseFloat(style.paddingRight),
            gap: parseFloat(style.gap),
            borderWidth: parseFloat(style.borderTopWidth),
            borderAlpha: colorAlpha(style.borderTopColor),
            backgroundAlpha: colorAlpha(style.backgroundColor),
            backdrop: style.backdropFilter || style.webkitBackdropFilter,
            chipText: chip?.textContent?.trim() ?? '',
            chipHeight: chip ? chip.getBoundingClientRect().height : 0,
            chipTracking: chipStyle ? parseFloat(chipStyle.letterSpacing) : 0,
            searchVisible: visible(search),
            searchSize: size(search),
            burgerVisible: visible(burger),
            burgerSize: size(burger),
            sepVisible: visible(sep),
            dimVisible: visible(dim),
            pageWidth: document.documentElement.scrollWidth,
            viewportWidth,
          };
        }, { prefix: route.prefix, viewportWidth: width });
        const label = `${route.path} at ${width}px`;
        const desktopNav = width >= 820;
        if (!referenceGeometry) {
          referenceGeometry = geometry;
        } else {
          check(
            `${label} matches the main nav width and centering`,
            Math.abs(geometry.width - referenceGeometry.width) <= 0.75
              && Math.abs(geometry.left - referenceGeometry.left) <= 0.5,
            `${geometry.width}/${geometry.left} vs ${referenceGeometry.width}/${referenceGeometry.left}`,
          );
        }
        check(`${label} uses the 52px nav shell`, Math.abs(geometry.height - 52) <= 0.5, String(geometry.height));
        check(
          `${label} uses the shared padding and gap`,
          Math.abs(geometry.paddingLeft - 20) <= 0.1
            && Math.abs(geometry.paddingRight - 10) <= 0.1
            && Math.abs(geometry.gap - (desktopNav ? 18 : 10)) <= 0.1,
          `${geometry.paddingLeft}/${geometry.paddingRight}/${geometry.gap}`,
        );
        check(
          `${label} keeps the shared hairline and glass floor`,
          Math.abs(geometry.borderWidth - 1) <= 0.1
            && geometry.borderAlpha >= 0.15
            && geometry.borderAlpha <= 0.17
            && geometry.backgroundAlpha >= 0.5
            && geometry.backgroundAlpha <= 0.7
            && geometry.backdrop !== 'none',
          `${geometry.borderWidth}/${geometry.borderAlpha}/${geometry.backgroundAlpha}/${geometry.backdrop}`,
        );
        check(
          `${label} uses the shared Registry tracking`,
          Math.abs(geometry.chipTracking - (desktopNav ? 1.82 : 1.04)) <= 0.12
            && Math.abs(geometry.chipHeight - 34) <= 0.5,
          `${geometry.chipTracking}/${geometry.chipHeight}`,
        );
        if (route.path === '/terminal/') {
          check(`${label} keeps the Terminal nav label`, geometry.chipText === 'Terminal', geometry.chipText);
        }
        if (desktopNav) {
          check(`${label} shows the full desktop lockup`, geometry.sepVisible && geometry.dimVisible);
        } else {
          check(`${label} shows the compact ZODIACS lockup`, !geometry.sepVisible && !geometry.dimVisible);
          check(
            `${label} uses 34px mobile controls`,
            geometry.searchVisible
              && geometry.burgerVisible
              && Math.abs(geometry.searchSize.width - 34) <= 0.5
              && Math.abs(geometry.searchSize.height - 34) <= 0.5
              && Math.abs(geometry.burgerSize.width - 34) <= 0.5
              && Math.abs(geometry.burgerSize.height - 34) <= 0.5,
            JSON.stringify({ search: geometry.searchSize, burger: geometry.burgerSize }),
          );
          const burger = navPage.locator(`.${route.prefix}__burger`);
          const burgerLines = burger.locator(`.${route.prefix}__burger-line`);
          const closedLines = await burgerLines.evaluateAll((lines) => lines.map((line) => ({
            width: line.getBoundingClientRect().width,
            position: getComputedStyle(line).position,
            transition: getComputedStyle(line).transition,
            center: (() => {
              const rect = line.getBoundingClientRect();
              return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            })(),
          })));
          check(
            `${label} uses the refined three-stroke menu icon`,
            closedLines.length === 3
              && closedLines.every((line) => Math.abs(line.width - 18) <= 0.5)
              && closedLines.every((line) => line.position === 'absolute')
              && closedLines.every((line) => line.transition.includes('0.22s')),
            JSON.stringify(closedLines),
          );
          check(
            `${label} keeps the three menu strokes tightly grouped`,
            Math.abs(closedLines[0].center.x - closedLines[1].center.x) <= 0.5
              && Math.abs(closedLines[1].center.x - closedLines[2].center.x) <= 0.5
              && Math.abs((closedLines[1].center.y - closedLines[0].center.y) - 5) <= 0.5
              && Math.abs((closedLines[2].center.y - closedLines[1].center.y) - 5) <= 0.5,
            JSON.stringify(closedLines.map((line) => line.center)),
          );
          await burger.click();
          // The morph itself lasts 220ms, but a loaded runner can paint the
          // settled frame well after any fixed margin — one sample at +320ms
          // has been caught at 90% of the animation. Poll for the settled X
          // instead; a genuinely broken morph still fails when the poll
          // exhausts, with the final state in the detail.
          let openState = null;
          const readBurger = () => burger.evaluate((element, prefix) => {
            const lines = [...element.querySelectorAll(`.${prefix}__burger-line`)];
            return {
              expanded: element.getAttribute('aria-expanded'),
              label: element.getAttribute('aria-label'),
              transforms: lines.map((line) => getComputedStyle(line).transform),
              opacities: lines.map((line) => Number(getComputedStyle(line).opacity)),
              centers: lines.map((line) => {
                const rect = line.getBoundingClientRect();
                return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
              }),
            };
          }, route.prefix);
          for (let attempt = 0; attempt < 20; attempt += 1) {
            openState = await readBurger();
            const settled = openState.opacities[1] === 0
              && Math.abs(openState.centers[0].y - openState.centers[2].y) <= 0.5
              && Math.abs(openState.centers[0].x - openState.centers[2].x) <= 0.5;
            if (settled) break;
            await navPage.waitForTimeout(150);
          }
          check(
            `${label} morphs cleanly into an accessible close control`,
            openState.expanded === 'true'
              && openState.label === 'Close menu'
              && openState.transforms[0] !== 'none'
              && openState.transforms[2] !== 'none'
              && openState.opacities[1] === 0
              && Math.abs(openState.centers[0].x - openState.centers[2].x) <= 0.5
              && Math.abs(openState.centers[0].y - openState.centers[2].y) <= 0.5,
            JSON.stringify(openState),
          );
          const menuRoot = route.prefix === 'nav' ? 'mobile-menu' : 'wnav-menu';
          const menu = navPage.locator(`.${menuRoot}`);
          await menu.waitFor({ state: 'visible' });
          const menuContract = await menu.evaluate((element, root) => {
            const groups = [...element.querySelectorAll(`:scope > nav > .${root}__group`)];
            const innerNav = element.querySelector(':scope > nav');
            const innerRect = innerNav?.getBoundingClientRect();
            const rootStyle = getComputedStyle(element);
            const toolLinks = [...element.querySelectorAll(`.${root}__tool`)];
            return {
              labels: groups.map((group) => group.querySelector(`.${root}__label`)?.textContent?.trim() ?? ''),
              siteHrefs: [...(groups[0]?.querySelectorAll(`:scope > .${root}__link`) ?? [])]
                .map((link) => link.getAttribute('href')),
              toolNames: [...element.querySelectorAll(`.${root}__tool`)]
                .map((link) => link.textContent?.trim() ?? ''),
              toolHrefs: [...element.querySelectorAll(`.${root}__tool`)]
                .map((link) => link.getAttribute('href')),
              toolAccessibleNames: toolLinks.map((link) => link.getAttribute('aria-label')),
              visibleDescriptions: element.querySelectorAll(`.${root}__tool-desc`).length,
              lastToolBorder: toolLinks.length > 0 ? getComputedStyle(toolLinks.at(-1)).borderBottomWidth : null,
              itemAnimation: groups[0]?.querySelector(`.${root}__link`)
                ? getComputedStyle(groups[0].querySelector(`.${root}__link`)).animationName
                : null,
              visual: {
                background: rootStyle.backgroundColor,
                paddingTop: parseFloat(rootStyle.paddingTop),
                paddingLeft: parseFloat(rootStyle.paddingLeft),
                paddingRight: parseFloat(rootStyle.paddingRight),
                navLeft: innerRect?.left ?? null,
                navWidth: innerRect?.width ?? null,
              },
              signCount: element.querySelectorAll(`.${root}__sign`).length,
            };
          }, menuRoot);
          const expectedTools = [
            ['Birth chart', '/birth-chart/', 'Birth chart. See your sun, moon, rising, planets, houses, and what they mean.'],
            ['Compatibility', '/compatibility/', 'Compatibility. Compare two charts and see where they click, clash, and grow.'],
            ['Transits', '/transits/', "Transits. See today's sky next to your chart."],
            ['Moon sign', '/moon-sign/', 'Moon sign. How you feel, and what settles you.'],
            ['Rising sign', '/rising-sign/', 'Rising sign. Find the sign people meet first. Birth time helps.'],
            ['Moon phase', '/moon-phase/', 'Moon phase. Tonight’s moon, and the moon of any date you care about.'],
            ['Saturn return', '/saturn-return/', 'Saturn return. When yours hits, exactly, and what it tends to ask.'],
            ['Birthday', '/birthday/', 'Birthday. Pick your birthday and get the receipts: sun sign verified across 1940–2030, exact degree spans, decans with traditional rulers, and year-by-year cusp tables.'],
          ];
          check(
            `${label} uses the shared three-part mobile menu`,
            JSON.stringify(menuContract.labels.map((value) => value.toLowerCase()))
              === JSON.stringify(['the site', 'tools', 'the twelve'])
              && JSON.stringify(menuContract.siteHrefs)
                === JSON.stringify(['/learn/', '/horoscopes/', '/profile/', '/terminal/']),
            JSON.stringify(menuContract),
          );
          check(
            `${label} uses the shared name-only tool list`,
            JSON.stringify(menuContract.toolNames) === JSON.stringify(expectedTools.map(([name]) => name))
              && JSON.stringify(menuContract.toolHrefs) === JSON.stringify(expectedTools.map(([, href]) => href))
              && JSON.stringify(menuContract.toolAccessibleNames) === JSON.stringify(expectedTools.map(([, , accessibleName]) => accessibleName))
              && menuContract.visibleDescriptions === 0,
            JSON.stringify(menuContract),
          );
          check(`${label} ends the tool group cleanly`, menuContract.lastToolBorder === '0px', menuContract.lastToolBorder);
          check(`${label} uses the main menu's calm, immediate presentation`, menuContract.itemAnimation === 'none', menuContract.itemAnimation);
          if (!referenceMenuVisual) {
            referenceMenuVisual = menuContract.visual;
          } else {
            check(
              `${label} matches the main menu overlay geometry and tint`,
              menuContract.visual.background === referenceMenuVisual.background
                && Math.abs(menuContract.visual.paddingTop - referenceMenuVisual.paddingTop) <= 0.5
                && Math.abs(menuContract.visual.paddingLeft - referenceMenuVisual.paddingLeft) <= 0.5
                && Math.abs(menuContract.visual.paddingRight - referenceMenuVisual.paddingRight) <= 0.5
                && Math.abs(menuContract.visual.navLeft - referenceMenuVisual.navLeft) <= 0.5
                && Math.abs(menuContract.visual.navWidth - referenceMenuVisual.navWidth) <= 0.5,
              JSON.stringify({ actual: menuContract.visual, expected: referenceMenuVisual }),
            );
          }
          check(`${label} retains all twelve pastel sign links`, menuContract.signCount === 12, String(menuContract.signCount));
        }
        check(
          `${label} has no document overflow`,
          geometry.pageWidth <= geometry.viewportWidth + 1,
          `${geometry.pageWidth}/${geometry.viewportWidth}`,
        );
        if (route.path === '/sdk/') {
          const heroGap = await navPage.evaluate(() => {
            const nav = document.querySelector('.wnav');
            const eyebrow = document.querySelector('.hero .eyebrow');
            return nav && eyebrow
              ? eyebrow.getBoundingClientRect().top - nav.getBoundingClientRect().bottom
              : null;
          });
          check(
            `${label} keeps the SDK hero clear of the fixed navigation`,
            heroGap !== null && heroGap >= 16,
            String(heroGap),
          );
        }
        await navPage.close();
      }
    }

    for (const width of [360, 390]) {
      const fallbackPage = await newPage({
        viewport: { width, height: 844 },
        javaScriptEnabled: false,
      });
      await fallbackPage.goto(`${baseURL}/terminal/`, { waitUntil: 'domcontentloaded' });
      const fallbackState = await fallbackPage.locator('.static-site__nav').evaluate((nav) => ({
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        identityTarget: Boolean(document.getElementById('identity')),
        registryTargetExplainsRegistry: Boolean(
          document.getElementById('registry')?.closest('section')?.querySelector('#registry-does-title'),
        ),
        visibleCollectionSections: [...document.querySelectorAll('.static-collection-section')]
          .filter((section) => getComputedStyle(section).display !== 'none').length,
        deadGalleryLinks: document.querySelectorAll('a[href*="gallery=gold"]').length,
        staticTokenRows: document.querySelectorAll('.static-token-list li').length,
        staticPriceNote: document.body.textContent?.includes('Live figures and sharing appear with JavaScript') ?? false,
        marketEyebrow: document.querySelector('#market > .static-site__eyebrow')
          ?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        marketHeading: document.querySelector('#market > h2')
          ?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        briefingCount: document.querySelectorAll('section#briefing').length,
        briefingHeading: document.querySelector('#briefing > h2')
          ?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        briefingAliases: ['research', 'outlook'].every((id) => (
          document.getElementById(id)?.closest('section')?.id === 'briefing'
        )),
        briefingCta: document.querySelector('#briefing a[href^="/terminal/research/"]')
          ?.getAttribute('href') ?? '',
        removedLandingResearch: /Research Pulse|Sky signals\. Market checks\.|Markets Research preview/i
          .test(document.body.textContent ?? ''),
        h1Count: document.querySelectorAll('h1').length,
        h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        deck: document.querySelector('.static-capital .capital-masthead__title > p')
          ?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        cinematicNodes: document.querySelectorAll('.cine, [data-cine-video]').length,
        astrofolioIdentity: /Astrofolio/i.test(document.querySelector('.static-capital')?.textContent ?? ''),
        marketNotice: (() => {
          const notice = document.querySelector('[data-terminal-market-notice]');
          const box = notice?.getBoundingClientRect();
          return {
            count: document.querySelectorAll('[data-terminal-market-notice]').length,
            text: notice?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            links: notice?.querySelectorAll('a').length ?? -1,
            directoryLinks: document.querySelectorAll('.static-site__footer > nav a').length,
            left: box?.left ?? -1,
            right: box?.right ?? -1,
          };
        })(),
        links: [...nav.querySelectorAll('a')].map((link) => {
          const rect = link.getBoundingClientRect();
          return {
            label: link.textContent?.trim() ?? '',
            left: rect.left,
            right: rect.right,
            width: rect.width,
          };
        }),
      }));
      check(
        `Registry no-JavaScript fallback at ${width}px has no document overflow`,
        fallbackState.pageWidth <= fallbackState.viewportWidth + 1,
        `${fallbackState.pageWidth}/${fallbackState.viewportWidth}`,
      );
      check(
        `Registry no-JavaScript fallback at ${width}px keeps every primary link onscreen`,
        fallbackState.links.length === 4
          && fallbackState.links.every((link) => (
            link.width > 0
            && link.left >= -1
            && link.right <= fallbackState.viewportWidth + 1
          )),
        JSON.stringify(fallbackState.links),
      );
      check(
        `Registry no-JavaScript fallback at ${width}px omits disabled or inactive modes`,
        fallbackState.identityTarget
          && fallbackState.registryTargetExplainsRegistry
          && fallbackState.visibleCollectionSections === 0
          && fallbackState.deadGalleryLinks === 0,
        JSON.stringify(fallbackState),
      );
      check(
        `Registry no-JavaScript fallback at ${width}px lists the twelve tokens with a plain price note`,
        fallbackState.staticTokenRows === 12
          && fallbackState.staticPriceNote
          && fallbackState.marketEyebrow === 'Live market board'
          && fallbackState.marketHeading === 'The twelve, ranked live.'
          && fallbackState.h1Count === 1
          && fallbackState.h1 === 'Zodiac Terminal'
          && fallbackState.deck === 'Twelve signs. Twelve transferable tokens. One live public market.'
          && fallbackState.cinematicNodes === 0
          && !fallbackState.astrofolioIdentity,
        JSON.stringify({
          rows: fallbackState.staticTokenRows,
          note: fallbackState.staticPriceNote,
          eyebrow: fallbackState.marketEyebrow,
          heading: fallbackState.marketHeading,
        }),
      );
      check(
        `Registry no-JavaScript fallback at ${width}px exposes one concise briefing and both legacy anchors`,
        fallbackState.briefingCount === 1
          && fallbackState.briefingHeading === 'Today’s market briefing'
          && fallbackState.briefingAliases
          && fallbackState.briefingCta === '/terminal/research/?sign=leo'
          && !fallbackState.removedLandingResearch,
        JSON.stringify(fallbackState),
      );
      check(
        `Registry no-JavaScript fallback at ${width}px carries the complete market and venue notice without a link farm`,
        fallbackState.marketNotice.count === 1
          && fallbackState.marketNotice.links === 0
          && fallbackState.marketNotice.directoryLinks === 6
          && fallbackState.marketNotice.left >= -1
          && fallbackState.marketNotice.right <= fallbackState.viewportWidth + 1
          && fallbackState.marketNotice.text.includes('speculative, thinly traded digital assets')
          && fallbackState.marketNotice.text.includes('does not operate a DEX, exchange, broker, or custodial service')
          && fallbackState.marketNotice.text.includes('Jupiter, an independent third-party liquidity aggregator')
          && fallbackState.marketNotice.text.includes('may not be available in all regions'),
        JSON.stringify(fallbackState.marketNotice),
      );
      await fallbackPage.close();
    }

    const registryMaterialPage = await newPage({ viewport: { width: 390, height: 844 } });
    await registryMaterialPage.goto(`${baseURL}/terminal/`, { waitUntil: 'domcontentloaded' });
    await registryMaterialPage.locator('footer:not(.ftr--technical) [data-terminal-market-notice]').waitFor();
    await registryMaterialPage.locator('footer:not(.ftr--technical) [data-terminal-market-notice]').scrollIntoViewIfNeeded();
    const marketNoticeState = await registryMaterialPage.locator('footer:not(.ftr--technical) [data-terminal-market-notice]').evaluate((notice) => {
      const box = notice.getBoundingClientRect();
      const style = getComputedStyle(notice.querySelector('p'));
      const directory = notice.previousElementSibling;
      const origin = notice.nextElementSibling;
      return {
        count: document.querySelectorAll('footer:not(.ftr--technical) [data-terminal-market-notice]').length,
        text: notice.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        links: notice.querySelectorAll('a').length,
        directoryLinks: directory?.querySelectorAll('a').length ?? -1,
        ordered: directory?.classList.contains('ftr__directory')
          && origin?.classList.contains('ftr__row--origin'),
        left: box.left,
        right: box.right,
        viewportWidth: innerWidth,
        pageWidth: document.documentElement.scrollWidth,
        fontSize: parseFloat(style.fontSize),
        lineHeight: parseFloat(style.lineHeight),
      };
    });
    check(
      'the mobile Terminal presents readable, link-free market and DEX fine print below the six-link directory',
      marketNoticeState.count === 1
        && marketNoticeState.links === 0
        && marketNoticeState.directoryLinks === 6
        && marketNoticeState.ordered
        && marketNoticeState.left >= -1
        && marketNoticeState.right <= marketNoticeState.viewportWidth + 1
        && marketNoticeState.pageWidth <= marketNoticeState.viewportWidth + 1
        && marketNoticeState.fontSize >= 11
        && marketNoticeState.lineHeight / marketNoticeState.fontSize >= 1.5
        && marketNoticeState.text.includes('could lose all money used to acquire one')
        && marketNoticeState.text.includes('receives no trading or referral compensation')
        && marketNoticeState.text.includes('not an offer or solicitation'),
      JSON.stringify(marketNoticeState),
    );
    const material = async (page, selector, lens) => {
      // This assertion compares the settled material recipes, not animation
      // timing. CI runners can briefly suspend a page while another page is
      // sampled, so a wall-clock delay can still catch the 420ms transition
      // between its endpoints. Disable that transition for this measurement.
      await page.locator(selector).evaluateAll((actions) => {
        for (const action of actions) {
          action.style.setProperty('transition', 'none', 'important');
        }
      });
      await page.evaluate((enabled) => document.documentElement.classList.toggle('zdx-lens', enabled), lens);
      await page.evaluate(() => new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }));
      return page.locator(selector).evaluateAll((actions) => actions.map((action) => {
        const style = getComputedStyle(action);
        return {
          background: style.backgroundColor,
          backdrop: style.backdropFilter || style.webkitBackdropFilter,
          filter: style.filter,
          border: style.borderColor,
          shadow: style.boxShadow,
        };
      }));
    };
    let stageMaterialReference = null;
    for (const lens of [false, true]) {
      const registryActions = await material(registryMaterialPage, '.stage-placard__pill', lens);
      check(
        `Registry stage pills stay painted and filter-free (${lens ? 'lens' : 'iOS fallback'})`,
        registryActions.length >= 2
          && registryActions.every((action) => (
            action.background !== 'rgba(0, 0, 0, 0)'
            && action.backdrop === 'none'
            && action.filter === 'none'
            && action.shadow.includes('inset')
          ))
          && (!stageMaterialReference
            || JSON.stringify(registryActions) === JSON.stringify(stageMaterialReference)),
        JSON.stringify({ registryActions, stageMaterialReference }),
      );
      stageMaterialReference = registryActions;
    }
    const mediaClient = await registryMaterialPage.context().newCDPSession(registryMaterialPage);
    const accessibilityPillStyles = async (name, value) => {
      await mediaClient.send('Emulation.setEmulatedMedia', {
        media: 'screen',
        features: [{ name, value }],
      });
      await registryMaterialPage.locator('.market-board__sort button[aria-pressed="true"]').waitFor();
      await registryMaterialPage.locator([
        '.stage-placard .btn--primary.stage-placard__pill',
        '.stage-placard .btn--ghost.stage-placard__pill',
        '.market-board__sort button[aria-pressed="true"]',
      ].join(', ')).evaluateAll((controls) => {
        for (const control of controls) control.style.setProperty('transition', 'none', 'important');
      });
      await registryMaterialPage.evaluate(() => new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }));
      return registryMaterialPage.evaluate(() => [
        ['Buy', document.querySelector('.stage-placard .btn--primary.stage-placard__pill')],
        ['Ghost', document.querySelector('.stage-placard .btn--ghost.stage-placard__pill')],
        ['Selected', document.querySelector('.market-board__sort button[aria-pressed="true"]')],
      ].map(([name, control]) => {
        const style = getComputedStyle(control);
        return {
          name,
          background: style.backgroundColor,
          backdrop: style.backdropFilter || style.webkitBackdropFilter,
          filter: style.filter,
          border: style.borderColor,
          color: style.color,
        };
      }));
    };
    const reducedTransparencyPills = await accessibilityPillStyles('prefers-reduced-transparency', 'reduce');
    check(
      'reduced transparency gives Buy, ghost, and selected Registry pills one opaque floor',
      reducedTransparencyPills.length === 3
        && reducedTransparencyPills.every((control) => (
          control.background === 'rgb(17, 20, 27)'
            && control.backdrop === 'none'
            && control.filter === 'none'
        )),
      JSON.stringify(reducedTransparencyPills),
    );
    const contrastPills = await accessibilityPillStyles('prefers-contrast', 'more');
    check(
      'increased contrast wins over Buy, ghost, and selected Registry pill states',
      contrastPills.length === 3
        && contrastPills.every((control) => (
          control.border === 'rgba(238, 241, 247, 0.72)'
            && control.color === contrastPills[0].color
            && control.backdrop === 'none'
            && control.filter === 'none'
        )),
      JSON.stringify(contrastPills),
    );
    await mediaClient.send('Emulation.setEmulatedMedia', { media: 'screen', features: [] });
    await mediaClient.detach();
    await registryMaterialPage.close();

    const reducedContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    });
    const reducedPage = await reducedContext.newPage();
    await shimReact(reducedPage);
    await reducedPage.goto(`${baseURL}/registry/aries/`, { waitUntil: 'domcontentloaded' });
    const reducedBurger = reducedPage.locator('.wnav__burger');
    await reducedBurger.click();
    const reducedTransitions = await reducedBurger.locator('.wnav__burger-line').evaluateAll((lines) => (
      lines.map((line) => getComputedStyle(line).transitionDuration)
    ));
    check(
      'reduced-motion menu morph changes state without animated travel',
      reducedTransitions.every((duration) => duration === '0s'),
      JSON.stringify(reducedTransitions),
    );
    await reducedContext.close();

    // Exact review viewport: the consumer journey stays compact, keeps all
    // twelve choices on one rail, and leaves technical material on its own
    // route rather than in the everyday reader's scroll.
    const compactRegistry = await newPage({
      viewport: { width: 623, height: 1054 },
      reducedMotion: 'no-preference',
    });
    const compactRegistryErrors = [];
    compactRegistry.on('pageerror', (error) => compactRegistryErrors.push(String(error)));
    compactRegistry.on('requestfailed', (request) => {
      if (request.url().startsWith(baseURL)) compactRegistryErrors.push(request.url());
    });
    await compactRegistry.goto(`${baseURL}/terminal/`, { waitUntil: 'domcontentloaded' });
    const compactRegistryLive = await compactRegistry.evaluate(() => (
      document.documentElement.classList.contains('gallery-live')
    ));
    const compactControls = compactRegistryLive
      ? compactRegistry.locator('.gband--consumer button.rail__tick')
      : compactRegistry.locator('[data-consumer-sign]');
    await compactControls.first().waitFor({ state: 'visible', timeout: 30_000 });
    if (compactRegistryLive) {
      await compactRegistry.locator('.gband--consumer .stage__canvas')
        .waitFor({ state: 'visible', timeout: 30_000 });
    }
    const compactRegistryLayout = await compactRegistry.evaluate((live) => {
      const shell = document.querySelector('.zd');
      const explorer = document.querySelector('.consumer-explorer');
      const controls = [...document.querySelectorAll(
        live ? '.gband--consumer button.rail__tick' : '[data-consumer-sign]',
      )];
      const rowTops = controls.map((node) => Math.round(node.getBoundingClientRect().top));
      const rows = [...new Set(rowTops)];
      const box = (node) => {
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        };
      };
      return {
        documentWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        pageHeight: document.documentElement.scrollHeight,
        shell: box(shell),
        explorer: box(explorer),
        controlCount: controls.length,
        rowCounts: rows.map((top) => rowTops.filter((candidate) => candidate === top).length),
        liveStage: document.querySelectorAll('.gband--consumer[data-gallery-stage]').length,
        flatStage: document.querySelectorAll('.gband--flat').length,
        canvases: document.querySelectorAll('.gband--consumer .stage__canvas').length,
        heavySections: ['pulse', 'standings', 'onchain-access', 'builders', 'sdk', 'security']
          .filter((id) => document.getElementById(id)),
      };
    }, compactRegistryLive);
    check('Registry at 623×1054 has no document overflow',
      compactRegistryLayout.documentWidth <= compactRegistryLayout.viewportWidth + 1,
      `${compactRegistryLayout.documentWidth}/${compactRegistryLayout.viewportWidth}`);
    check('Registry at 623×1054 uses the broad responsive content shell',
      compactRegistryLayout.shell
        && compactRegistryLayout.shell.width >= compactRegistryLayout.clientWidth * 0.88,
      `${compactRegistryLayout.shell?.width ?? 0}/${compactRegistryLayout.clientWidth}`);
    check('Registry at 623×1054 offers all twelve signs on one rail',
      compactRegistryLayout.controlCount === 12
        && compactRegistryLayout.rowCounts.length === 1
        && (compactRegistryLive
          ? compactRegistryLayout.liveStage === 1
            && compactRegistryLayout.flatStage === 0
            && compactRegistryLayout.canvases === 1
          : compactRegistryLayout.liveStage === 0
            && compactRegistryLayout.flatStage === 1
            && compactRegistryLayout.canvases === 0),
      JSON.stringify(compactRegistryLayout));
    check('Registry at 623×1054 keeps the expanded consumer journey under 9,000px',
      compactRegistryLayout.pageHeight <= MAX_COMPACT_REGISTRY_HEIGHT,
      String(compactRegistryLayout.pageHeight));
    check('Registry at 623×1054 leaves technical sections off the consumer route',
      compactRegistryLayout.heavySections.length === 0,
      compactRegistryLayout.heavySections.join(','));
    await compactRegistry.goto(`${baseURL}/terminal/#identity`, { waitUntil: 'domcontentloaded' });
    await compactRegistry.locator('#identity').waitFor({ state: 'attached' });
    await compactRegistry.waitForTimeout(1200);
    const compactHashTop = await compactRegistry.locator('#identity').evaluate((node) => (
      node.getBoundingClientRect().top
    ));
    check('Registry direct consumer hashes align below the fixed navigation',
      compactHashTop >= 70 && compactHashTop <= 180,
      `${compactHashTop.toFixed(1)}px from viewport top`);
    if (OUT) await compactRegistry.screenshot({ path: `${OUT}/registry-623.png`, fullPage: false });
    check('Registry at 623×1054 runtime is error-free',
      compactRegistryErrors.length === 0,
      compactRegistryErrors.join(' | '));
    await compactRegistry.close();

    const tabletEdge = await newPage({ viewport: { width: 1020, height: 900 } });
    await tabletEdge.goto(`${baseURL}/terminal/`, { waitUntil: 'domcontentloaded' });
    const tabletStageLive = await tabletEdge.evaluate(() => (
      document.documentElement.classList.contains('gallery-live')
    ));
    const tabletControls = tabletStageLive
      ? tabletEdge.locator('.gband--consumer button.rail__tick')
      : tabletEdge.locator('[data-consumer-sign]');
    await tabletControls.first().waitFor({ state: 'visible', timeout: 30_000 });
    if (tabletStageLive) {
      await tabletEdge.locator('.gband--consumer .stage__canvas')
        .waitFor({ state: 'visible', timeout: 30_000 });
    }
    const tabletRows = await tabletControls.evaluateAll((controls) => {
      const tops = controls.map((control) => Math.round(control.getBoundingClientRect().top));
      return [...new Set(tops)].map((top) => tops.filter((candidate) => candidate === top).length);
    });
    check(
      'Registry at 1020px keeps all twelve choices on the active stage rail',
      JSON.stringify(tabletRows) === JSON.stringify([12])
        && await tabletEdge.locator(tabletStageLive
          ? '.gband--consumer[data-gallery-stage]'
          : '.gband--flat').count() === 1,
      JSON.stringify({ rows: tabletRows, live: tabletStageLive }),
    );
    await tabletEdge.close();

    for (const width of [390, 781]) {
      for (const record of [
        { slug: 'cancer', current: 'Cancer', next: 'leo', name: 'Leo' },
        { slug: 'pisces', current: 'Pisces', next: 'aries', name: 'Aries' },
      ]) {
        const recordPage = await newPage({ viewport: { width, height: 844 } });
        await recordPage.goto(`${baseURL}/registry/${record.slug}/`, { waitUntil: 'domcontentloaded' });
        const action = recordPage.locator('.lot__next');
        await action.waitFor({ state: 'visible' });
        const actionState = await action.evaluate((element) => {
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
            detailHeadings: [...document.querySelectorAll('.record-detail__title')]
              .map((heading) => heading.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
            quickAction: document.querySelector('.quick__action')?.getAttribute('href') ?? '',
            constellation: document.querySelector('#constellation img')?.getAttribute('src') ?? '',
            constellationCopy: document.querySelector('#constellation')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          };
        });
        check(
          `${record.slug} at ${width}px advances to ${record.next}`,
          actionState.href === `/registry/${record.next}/`,
          actionState.href,
        );
        check(
          `${record.slug} at ${width}px uses the pastel ${record.name} next-record icon`,
          actionState.icon === `/assets/zodiac-icons/48/${record.next}.webp`,
          actionState.icon,
        );
        check(
          `${record.slug} at ${width}px explains a transferable token with chart and constellation context`,
          /^Official Zodiac Token · Sign \d+ of 12$/.test(actionState.eyebrow)
            && actionState.intro === `${record.current} is the official digital token for the ${record.current} zodiac sign. See today’s price, verify the address, and learn how buying works.`
            && actionState.detailHeadings.includes('Key facts')
            && actionState.detailHeadings.includes(`About ${record.current}`)
            && actionState.detailHeadings.includes(`Read the ${record.current} story`)
            && actionState.sectionHeadings.includes('Official addresses')
            && actionState.sectionHeadings.includes(`How to buy ${record.current}`)
            && actionState.sectionHeadings.includes('Explore all 12')
            && actionState.quickAction === '#acquire'
            && actionState.constellation === `/assets/constellations/${record.slug}.svg`
            && /HYG Database v4\.0/.test(actionState.constellationCopy)
            && /not official IAU boundaries/.test(actionState.constellationCopy),
          JSON.stringify(actionState),
        );
        check(
          `${record.slug} at ${width}px keeps a 44px next-record target`,
          actionState.height >= 44,
          String(actionState.height),
        );
        check(
          `${record.slug} at ${width}px clears the fixed nav by 16px`,
          actionState.navGap >= 15.5,
          String(actionState.navGap),
        );
        await action.focus();
        const focusState = await action.evaluate((element) => {
          const style = getComputedStyle(element);
          return element === document.activeElement
            && style.outlineStyle !== 'none'
            && parseFloat(style.outlineWidth) > 0;
        });
        check(`${record.slug} at ${width}px shows keyboard focus`, focusState);
        check(
          `${record.slug} at ${width}px has no horizontal overflow`,
          actionState.pageWidth <= actionState.viewportWidth + 1,
          `${actionState.pageWidth}/${actionState.viewportWidth}`,
        );
        await recordPage.close();
      }
    }

    const sparseChart = await newPage({ viewport: { width: 781, height: 900 } });
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
    await sparseChart.goto(`${baseURL}/registry/leo/`, { waitUntil: 'domcontentloaded' });
    await sparseChart.locator('#market > summary').click();
    await sparseChart.locator('[data-market]').scrollIntoViewIfNeeded();
    await sparseChart.locator('[data-market-chart]:not([hidden])').waitFor({ timeout: 15_000 });
    const sparseChartState = await sparseChart.locator('[data-market]').evaluate((panel) => ({
      note: panel.querySelector('[data-market-chart-note]')?.textContent?.trim() ?? '',
      empty: panel.querySelector('.market__chart-empty')?.textContent?.trim() ?? '',
      paths: panel.querySelectorAll('[data-market-chart-canvas] path').length,
      points: panel.querySelectorAll('[data-market-chart-canvas] circle').length,
      sevenDisabled: panel.querySelector('[data-market-range="7d"]')?.disabled ?? false,
      thirtyDisabled: panel.querySelector('[data-market-range="30d"]')?.disabled ?? false,
      allPressed: panel.querySelector('[data-market-range="all"]')?.getAttribute('aria-pressed') ?? '',
      metrics: [...panel.querySelectorAll('.market__k')].map((node) => node.textContent?.trim() ?? ''),
      live: panel.querySelector('[data-market-live-link]')?.getAttribute('href') ?? '',
    }));
    check(
      'archived charts preserve nulls and calendar gaps while ranges wait for honest coverage',
      /^Archive through .* · 5 daily closes\.$/.test(sparseChartState.note)
        && /5 daily closes recorded\. A trend line will appear after 8 honest daily closes\./.test(sparseChartState.empty)
        && sparseChartState.paths === 0
        && sparseChartState.points === 0
        && sparseChartState.sevenDisabled
        && sparseChartState.thirtyDisabled
        && sparseChartState.allPressed === 'true'
        && sparseChartState.metrics.includes('Market cap')
        && sparseChartState.metrics.includes('FDV')
        && sparseChartState.live === 'https://dexscreener.com/solana/fixture-leo',
      JSON.stringify(sparseChartState),
    );
    await sparseChart.close();

    // The landing placard asks GeckoTerminal for one selected sign only. The
    // fixture marks one closed hour as zero-volume so this drive can prove the
    // OHLC candle, idle-tick, volume, accessibility, and request boundaries.
    for (const width of [320, 360, 390]) {
      const selectedChartPage = await newPage({
        viewport: { width, height: width === 320 ? 568 : width === 360 ? 640 : 844 },
        hasTouch: true,
      });
      const geckoRequests = [];
      await freezeRegistryClock(selectedChartPage);
      await stubNoWebgl(selectedChartPage);
      await mockDexscreener(selectedChartPage);
      await mockRegistryBriefingSources(selectedChartPage);
      await mockSelectedTokenArchive(selectedChartPage);
      await mockGeckoHourly(selectedChartPage, { requests: geckoRequests });
      await withExchangeFlag(selectedChartPage);
      await selectedChartPage.goto(`${baseURL}/terminal/`, { waitUntil: 'domcontentloaded' });
      const selectedChart = selectedChartPage.locator('[data-token-chart="leo"]');
      await selectedChart.scrollIntoViewIfNeeded();
      await selectedChart.locator('.token-spark--live').waitFor({ state: 'visible', timeout: 20_000 });
      const state = await selectedChart.evaluate((chart) => {
        const figure = chart.querySelector('.token-spark--live');
        const svg = figure?.querySelector('svg');
        const rect = chart.getBoundingClientRect();
        const advanced = document.querySelector('.capital-advanced');
        const advancedRect = advanced?.getBoundingClientRect();
        return {
          aria: svg?.getAttribute('aria-label') ?? '',
          bodies: svg?.querySelectorAll('.token-spark__body').length ?? 0,
          caption: figure?.querySelector('figcaption')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          idle: svg?.querySelectorAll('.token-spark__idle').length ?? 0,
          chartCount: document.querySelectorAll('[data-token-chart]').length,
          chartLeft: rect.left,
          chartRight: rect.right,
          documentWidth: document.documentElement.scrollWidth,
          expectedPoints: figure?.querySelector('p')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          polylines: [...(svg?.querySelectorAll('polyline') ?? [])]
            .map((line) => line.getAttribute('points') ?? ''),
          volumes: svg?.querySelectorAll('.token-spark__volume').length ?? 0,
          wicks: svg?.querySelectorAll('.token-spark__wick').length ?? 0,
          advanced: advanced ? {
            height: advancedRect?.height ?? 0,
            href: advanced.getAttribute('href'),
            target: advanced.getAttribute('target'),
            visible: getComputedStyle(advanced).display !== 'none' && (advancedRect?.height ?? 0) > 0,
          } : null,
          viewportWidth: innerWidth,
        };
      });
      const request = geckoRequests[0] ?? null;
      check(
        `selected Leo owns one honest 24H Gecko chart at ${width}px`,
        geckoRequests.length === 1
          && request?.token === REGISTRY_MINT_BY_SIGN.leo
          && request?.pool === 'FIXTUREPAIR4'
          && request?.aggregate === '1'
          && request?.limit === 24
          && request?.currency === 'usd'
          && request?.includeEmptyIntervals === 'true'
          && Number.isSafeInteger(request?.beforeTimestamp)
          && request.beforeTimestamp % 3_600 === 0
          && state.chartCount === 1
          && state.caption.includes('LEO / USD · 24H')
          && state.caption.includes('Reference pool · GeckoTerminal · UTC')
          && state.expectedPoints.startsWith('23 active hours · 1 no-swap hour carries last close')
          && state.bodies === 23
          && state.wicks === 23
          && state.volumes === 23
          && state.idle === 1
          && state.polylines.length === 0
          && /Leo closed hourly history covers 24 hourly slots/.test(state.aria)
          && /24-hour candlestick chart/.test(state.aria)
          && /23 hours contained swaps; 1 no-swap hour carries the preceding close with zero volume/.test(state.aria),
        JSON.stringify({ requests: geckoRequests, state }),
      );
      check(
        `selected-token chart at ${width}px stays inside the phone without overflow`,
        state.documentWidth <= state.viewportWidth + 1
          && state.chartLeft >= -1
          && state.chartRight <= state.viewportWidth + 1,
        JSON.stringify(state),
      );
      check(
        `exchange rail at ${width}px is a visible same-tab 44px route for Leo`,
        state.advanced?.visible
          && state.advanced.height >= 44
          && state.advanced.target === null
          && state.advanced.href === '/terminal/markets/#leo',
        JSON.stringify(state.advanced),
      );
      await selectedChartPage.close();
    }

    // A thinly traded pool still reads as a financial chart. Eight real OHLCV
    // hours get bodies, wicks, and volume; sixteen documented zero-volume
    // carry hours get faint idle ticks rather than invented candle bodies.
    const sparseLivePage = await newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await freezeRegistryClock(sparseLivePage);
    await stubNoWebgl(sparseLivePage);
    await mockDexscreener(sparseLivePage);
    await mockRegistryBriefingSources(sparseLivePage);
    await mockSelectedTokenArchive(sparseLivePage);
    await mockGeckoHourly(sparseLivePage, {
      includedIndexes: [0, 1, 4, 5, 9, 13, 17, 22],
    });
    await withExchangeFlag(sparseLivePage);
    await sparseLivePage.goto(`${baseURL}/terminal/`, { waitUntil: 'domcontentloaded' });
    const sparseLiveChart = sparseLivePage.locator('[data-token-chart="leo"]');
    await sparseLiveChart.scrollIntoViewIfNeeded();
    await sparseLiveChart.locator('.token-spark--live').waitFor({ state: 'visible', timeout: 20_000 });
    const sparseLiveState = await sparseLiveChart.evaluate((chart) => {
      const figure = chart.querySelector('.token-spark--live');
      const plot = figure?.querySelector('.token-spark__plot');
      const svg = plot?.querySelector('svg');
      const rect = plot?.getBoundingClientRect();
      return {
        areas: svg?.querySelectorAll('.token-spark__area').length ?? 0,
        axes: svg?.querySelectorAll('.token-spark__axis').length ?? 0,
        bodies: svg?.querySelectorAll('.token-spark__body').length ?? 0,
        coverage: figure?.querySelector(':scope > p')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        idle: svg?.querySelectorAll('.token-spark__idle').length ?? 0,
        latest: svg?.querySelectorAll('.token-spark__latest-ring').length ?? 0,
        plotHeight: rect?.height ?? 0,
        plotWidth: rect?.width ?? 0,
        points: svg?.querySelectorAll('.token-spark__point').length ?? 0,
        priceScale: figure?.querySelector('.token-spark__price-scale')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        segments: [...(svg?.querySelectorAll('.token-spark__line') ?? [])]
          .map((line) => (line.getAttribute('points') ?? '').trim().split(/\s+/).length),
        timeScale: [...(figure?.querySelectorAll('.token-spark__time-scale span') ?? [])]
          .map((label) => label.textContent?.trim() ?? ''),
        volumes: svg?.querySelectorAll('.token-spark__volume').length ?? 0,
        wicks: svg?.querySelectorAll('.token-spark__wick').length ?? 0,
      };
    });
    check(
      'eight active hours render as a full-width OHLCV chart with honest idle slots',
      sparseLiveState.plotWidth >= 300
        && sparseLiveState.plotHeight >= 145
        && sparseLiveState.axes === 2
        && sparseLiveState.bodies === 8
        && sparseLiveState.wicks === 8
        && sparseLiveState.volumes === 8
        && sparseLiveState.idle === 16
        && sparseLiveState.points === 0
        && sparseLiveState.latest === 1
        && sparseLiveState.areas === 0
        && sparseLiveState.segments.length === 0
        && sparseLiveState.coverage.startsWith('8 active hours · 16 no-swap hours carry last close')
        && /\$0\.0000/u.test(sparseLiveState.priceScale)
        && sparseLiveState.timeScale.length === 3
        && sparseLiveState.timeScale.every((value) => /^\d{2}:\d{2}$/u.test(value)),
      JSON.stringify(sparseLiveState),
    );
    await sparseLivePage.close();

    // Let the initial Leo request settle, then change four signs inside the
    // 220ms selection debounce. No intermediate sign may touch GeckoTerminal;
    // the one surviving request and attached chart must both belong to Pisces.
    const rapidChartPage = await newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const rapidGeckoRequests = [];
    await freezeRegistryClock(rapidChartPage);
    await stubNoWebgl(rapidChartPage);
    await mockDexscreener(rapidChartPage);
    await mockRegistryBriefingSources(rapidChartPage);
    await mockSelectedTokenArchive(rapidChartPage);
    await mockGeckoHourly(rapidChartPage, { requests: rapidGeckoRequests });
    await withExchangeFlag(rapidChartPage);
    await rapidChartPage.goto(`${baseURL}/terminal/`, { waitUntil: 'domcontentloaded' });
    const initialSelectedChart = rapidChartPage.locator('[data-token-chart="leo"]');
    await initialSelectedChart.scrollIntoViewIfNeeded();
    await initialSelectedChart.locator('.token-spark--live').waitFor({ state: 'visible', timeout: 20_000 });
    rapidGeckoRequests.length = 0;
    const finalGeckoRequest = rapidChartPage.waitForRequest(
      (request) => request.url().startsWith('https://api.geckoterminal.com/api/v2/'),
      { timeout: 20_000 },
    );
    await rapidChartPage.evaluate(async (slugs) => {
      for (const [index, slug] of slugs.entries()) {
        document.querySelector(`[data-consumer-sign="${slug}"]`)?.click();
        if (index < slugs.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    }, ['aries', 'taurus', 'gemini', 'pisces']);
    await finalGeckoRequest;
    await rapidChartPage.waitForFunction(() => {
      const chart = document.querySelector('[data-token-chart="pisces"]');
      return /^Pisces closed hourly history covers 24 hourly slots/u.test(
        chart?.querySelector('svg')?.getAttribute('aria-label') ?? '',
      );
    });
    await rapidChartPage.waitForTimeout(350);
    const rapidState = await rapidChartPage.evaluate(() => ({
      advancedHref: document.querySelector('.capital-advanced')?.getAttribute('href') ?? '',
      charts: [...document.querySelectorAll('[data-token-chart]')]
        .map((chart) => chart.getAttribute('data-token-chart')),
      selected: document.querySelector('[data-consumer-sign][aria-pressed="true"]')
        ?.getAttribute('data-consumer-sign') ?? '',
    }));
    check(
      'rapid sign changes debounce to one Gecko request and one final selected chart',
      rapidGeckoRequests.length === 1
        && rapidGeckoRequests[0].token === REGISTRY_MINT_BY_SIGN.pisces
        && rapidGeckoRequests[0].pool === 'FIXTUREPAIR11'
        && JSON.stringify(rapidState.charts) === JSON.stringify(['pisces'])
        && rapidState.selected === 'pisces',
      JSON.stringify({ requests: rapidGeckoRequests, rapidState }),
    );
    check(
      'the enabled exchange rail follows the final selected sign without opening a new context',
      rapidState.advancedHref === '/terminal/markets/#pisces'
        && await rapidChartPage.locator('.capital-advanced').getAttribute('target') === null,
      JSON.stringify(rapidState),
    );
    await rapidChartPage.close();

    // Data Saver and 2g skip the third-party request altogether while still
    // presenting the owned daily archive. This is a network policy, not an
    // empty-chart state, and the accessible summary must say why it fell back.
    for (const constrained of [
      {
        label: 'Data Saver', saveData: true, effectiveType: '4g',
        reason: 'Live hourly prices were skipped because data saving is enabled.',
      },
      {
        label: '2g', saveData: false, effectiveType: '2g',
        reason: 'Live hourly prices were skipped on this constrained connection.',
      },
    ]) {
      const constrainedPage = await newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
      await freezeRegistryClock(constrainedPage);
      await constrainedPage.addInitScript(({ saveData, effectiveType }) => {
        const connection = { saveData, effectiveType };
        for (const key of ['connection', 'mozConnection', 'webkitConnection']) {
          try {
            Object.defineProperty(navigator, key, {
              configurable: true,
              get: () => connection,
            });
          } catch {}
        }
      }, constrained);
      const constrainedGeckoRequests = [];
      await stubNoWebgl(constrainedPage);
      await mockDexscreener(constrainedPage);
      await mockRegistryBriefingSources(constrainedPage);
      await mockSelectedTokenArchive(constrainedPage);
      await mockGeckoHourly(constrainedPage, { requests: constrainedGeckoRequests });
      await constrainedPage.goto(`${baseURL}/terminal/`, { waitUntil: 'domcontentloaded' });
      const constrainedChart = constrainedPage.locator('[data-token-chart="leo"]');
      await constrainedChart.scrollIntoViewIfNeeded();
      await constrainedChart.locator('.token-spark--archive').waitFor({ state: 'visible', timeout: 20_000 });
      const constrainedState = await constrainedChart.evaluate((chart) => ({
        aria: chart.querySelector('svg')?.getAttribute('aria-label') ?? '',
        caption: chart.querySelector('figcaption')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        count: document.querySelectorAll('[data-token-chart]').length,
        exchangeRailCount: document.querySelectorAll('.capital-advanced').length,
        note: chart.querySelector('.token-spark--archive > p')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      }));
      check(
        `${constrained.label} makes zero Gecko requests and uses the Registry archive fallback`,
        constrainedGeckoRequests.length === 0
          && constrainedState.count === 1
          && constrainedState.caption.includes('Registry archive')
          && constrainedState.note.startsWith('8 of 8 daily closes')
          && constrainedState.aria.includes(constrained.reason),
        JSON.stringify({ requests: constrainedGeckoRequests, constrainedState }),
      );
      if (constrained.label === 'Data Saver') {
        check(
          'the exchange rail is absent when its deployment flag is off',
          constrainedState.exchangeRailCount === 0,
          JSON.stringify(constrainedState),
        );
      }
      await constrainedPage.close();
    }

    const relatedResearch = await newPage({ viewport: { width: 781, height: 900 } });
    await relatedResearch.route('**/api/registry/news', (route) => route.fulfill({
      json: registryBriefingNewsPayload(),
    }));
    await relatedResearch.goto(
      `${baseURL}/terminal/research/?sign=leo&type=daily`,
      { waitUntil: 'domcontentloaded' },
    );
    const relatedScope = relatedResearch.locator('#research-scope');
    await relatedScope.waitFor({ state: 'visible' });
    const relatedScopeState = await relatedResearch.evaluate(() => ({
      label: document.querySelector('#research-scope span')?.textContent?.trim() ?? '',
      sign: new URL(location.href).searchParams.get('sign'),
      type: new URL(location.href).searchParams.get('type'),
    }));
    check(
      'token-record research links restore a visible Leo daily-brief scope',
      relatedScopeState.label === 'Related to Leo · Daily market briefs'
        && relatedScopeState.sign === 'leo'
        && relatedScopeState.type === 'daily',
      JSON.stringify(relatedScopeState),
    );
    await relatedScope.getByRole('button', { name: 'Clear related filter' }).click();
    await relatedResearch.waitForFunction(() => (
      document.querySelector('#research-scope')?.hidden
      && !new URL(location.href).searchParams.has('sign')
      && !new URL(location.href).searchParams.has('type')
    ));
    const clearedScope = await relatedResearch.evaluate(() => ({
      hidden: document.querySelector('#research-scope')?.hidden ?? false,
      search: location.search,
    }));
    check(
      'Clear related filter removes the query scope and returns to the full ledger',
      clearedScope.hidden && clearedScope.search === '',
      JSON.stringify(clearedScope),
    );
    const researchFilters = await relatedResearch.locator('.research-filters button')
      .evaluateAll((buttons) => buttons.map((button) => button.textContent?.trim() ?? ''));
    const sourceUpdates = relatedResearch.locator('#research-source-updates');
    await sourceUpdates.waitFor({ state: 'visible', timeout: 15_000 });
    check(
      'the dedicated Research Desk retains its five filters and queued source-update control',
      JSON.stringify(researchFilters) === JSON.stringify([
        'All', 'Zodiacs Research', 'Astrology News', 'Astronomy', 'Calendar',
      ])
        && await sourceUpdates.innerText() === 'Show 3 source updates',
      JSON.stringify(researchFilters),
    );
    await sourceUpdates.click();
    await relatedResearch.getByRole('button', { name: 'Astrology News', exact: true }).click();
    const dedicatedFilterState = await relatedResearch.evaluate(() => ({
      active: document.querySelector('.research-filters button[aria-pressed="true"]')
        ?.textContent?.trim() ?? '',
      categories: [...document.querySelectorAll('#research-items [data-category]')]
        .filter((item) => !item.hidden)
        .map((item) => item.getAttribute('data-category')),
      filter: new URL(location.href).searchParams.get('filter'),
      updatesHidden: document.querySelector('#research-source-updates')?.hidden ?? false,
    }));
    check(
      'Research Desk filtering keeps external astrology separate after explicit acceptance',
      dedicatedFilterState.active === 'Astrology News'
        && dedicatedFilterState.categories.length === 2
        && dedicatedFilterState.categories.every((category) => category === 'astrology-news')
        && dedicatedFilterState.filter === 'astrology-news'
        && dedicatedFilterState.updatesHidden,
      JSON.stringify(dedicatedFilterState),
    );
    await relatedResearch.close();

    // The grid explorer's own assertions run with WebGL denied — the path
    // narrow, non-WebGL, and stage-failure readers actually get. The stage
    // is asserted separately, on an unstubbed page.
    const desktop = await newPage({ viewport: { width: 1126, height: 1180 } });
    // The primary briefing assertions exercise the complete current-edition
    // path. Anchor this page to the receipt's disclosed reference time so a
    // committed daily artifact does not become stale merely because the gate
    // runs after midnight. Routed cases independently prove stale and partial
    // editions are disclosed without bringing the old signal controls back.
    await desktop.addInitScript((referenceAt) => {
      const NativeDate = Date;
      const fixedTime = new NativeDate(referenceAt).getTime();
      class ReceiptDate extends NativeDate {
        constructor(...args) {
          super(...(args.length ? args : [fixedTime]));
        }

        static now() {
          return fixedTime;
        }
      }
      Object.setPrototypeOf(ReceiptDate, NativeDate);
      window.Date = ReceiptDate;
    }, COMMITTED_OUTLOOK_REFERENCE);
    await stubNoWebgl(desktop);
    await mockDexscreener(desktop);
    const desktopGeckoRequests = [];
    await mockGeckoHourly(desktop, { requests: desktopGeckoRequests });
    await mockRegistryBriefingSources(desktop);
    await withCollectionFlag(desktop);
    const desktopErrors = [];
    const desktopGalleryRequests = [];
    const desktopOutlookRequests = [];
    const desktopLandingResearchRequests = [];
    const desktopNewsRequests = [];
    desktop.on('pageerror', (error) => desktopErrors.push(String(error)));
    desktop.on('request', (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname === '/assets/gallery.js') {
        desktopGalleryRequests.push(request.url());
      }
      if (pathname === '/assets/registry-outlook.json') desktopOutlookRequests.push(request.url());
      if (pathname === '/assets/registry-research-feed.json') desktopLandingResearchRequests.push(request.url());
      if (pathname === '/api/registry/news') desktopNewsRequests.push(request.url());
    });
    await desktop.goto(baseURL + '/terminal/', { waitUntil: 'domcontentloaded' });
    await desktop.locator('[data-consumer-sign]').first().waitFor({ state: 'visible' });

    const expectedSigns = [
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
    ];
    const explorerState = await desktop.locator('[data-consumer-sign]').evaluateAll((controls) => (
      controls.map((control) => {
        const rect = control.getBoundingClientRect();
        return {
          slug: control.getAttribute('data-consumer-sign'),
          pressed: control.getAttribute('aria-pressed'),
          tabIndex: control.tabIndex,
          src: control.querySelector('img')?.getAttribute('src') ?? '',
          width: rect.width,
          height: rect.height,
        };
      })
    ));
    check(
      'consumer explorer presents twelve pastel sign controls in zodiac order',
      JSON.stringify(explorerState.map((item) => item.slug)) === JSON.stringify(expectedSigns)
        && explorerState.every((item) => item.src === '/assets/zodiac-icons/48/' + item.slug + '.webp'),
      JSON.stringify(explorerState),
    );
    check(
      'consumer explorer exposes one active, roving-tabindex control',
      explorerState.filter((item) => item.pressed === 'true').length === 1
        && explorerState.filter((item) => item.tabIndex === 0).length === 1
        && explorerState.every((item) => item.width >= 44 && item.height >= 44),
      JSON.stringify(explorerState),
    );
    const desktopMasthead = await desktop.locator('.capital-masthead').evaluate((masthead) => {
      const title = masthead.querySelector('.capital-masthead__title');
      const heading = title?.querySelector('h1');
      const caption = title?.querySelector('p');
      const tape = masthead.querySelector(':scope > .market-tape');
      const pulse = masthead.querySelector(':scope > .capital-pulse');
      const opening = masthead.nextElementSibling;
      const headingStyle = heading ? getComputedStyle(heading) : null;
      return {
        text: heading?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        label: title?.querySelector(':scope > span')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        caption: caption?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        captionVisible: Boolean(caption && getComputedStyle(caption).display !== 'none'
          && getComputedStyle(caption).visibility !== 'hidden'
          && caption.getBoundingClientRect().height > 0),
        tapeDirect: tape?.parentElement === masthead,
        pulseDirect: pulse?.parentElement === masthead,
        pulseCount: pulse?.querySelectorAll(':scope > div').length ?? 0,
        openingImmediate: opening?.classList.contains('consumer-capital-opening') ?? false,
        openingChildren: opening ? [...opening.children].map((node) => node.id || node.className) : [],
        cineCount: document.querySelectorAll('.cine').length,
        legacyHeroCount: document.querySelectorAll('.stage-hero__head, .stage-hero__title, .stage-hero__eyebrow, .stage-hero__line').length,
        h1Count: document.querySelectorAll('h1').length,
        headingVisible: Boolean(heading
          && headingStyle?.display !== 'none'
          && headingStyle?.visibility !== 'hidden'
          && heading.getBoundingClientRect().height > 0),
      };
    });
    check(
      'one Zodiac Terminal H1 leads tape, pulse, sculpture, and compact board',
      desktopMasthead.cineCount === 0
        && desktopMasthead.legacyHeroCount === 0
        && desktopMasthead.h1Count === 1
        && desktopMasthead.headingVisible
        && desktopMasthead.text === 'Zodiac Terminal'
        && desktopMasthead.label === 'Verified by the Zodiacs Registry'
        && desktopMasthead.caption === 'Twelve signs. Twelve transferable tokens. One live public market.'
        && desktopMasthead.captionVisible
        && desktopMasthead.tapeDirect
        && desktopMasthead.pulseDirect
        && desktopMasthead.pulseCount === 3
        && desktopMasthead.openingImmediate
        && desktopMasthead.openingChildren[0] === 'official-twelve'
        && desktopMasthead.openingChildren[1] === 'market',
      JSON.stringify(desktopMasthead),
    );
    const openingMaterial = await desktop.locator('.gband--consumer').evaluate((band) => {
      const season = band.querySelector('.season-now');
      const rail = band.querySelector('.rail');
      const progress = season?.querySelector('.season-now__progress');
      const read = (node) => {
        if (!node) return null;
        const style = getComputedStyle(node);
        return {
          borderWidths: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
          borderRadius: style.borderTopLeftRadius,
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          backdropFilter: style.backdropFilter || style.webkitBackdropFilter || '',
          transitionProperty: style.transitionProperty,
        };
      };
      const progressRect = progress?.getBoundingClientRect();
      const seasonRect = season?.getBoundingClientRect();
      const progressStyle = progress ? getComputedStyle(progress) : null;
      return {
        oldHero: band.querySelectorAll('.stage-hero__head, .stage-hero__title, .stage-hero__eyebrow, .stage-hero__line').length,
        oldCopy: /The Official Registry|Twelve signs|One register/i.test(band.textContent ?? ''),
        season: read(season),
        seasonDirect: season?.parentElement === band,
        seasonText: season?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        seasonLabel: season?.getAttribute('aria-label') ?? '',
        seasonImage: season?.querySelector('img')?.getAttribute('src') ?? '',
        seasonPriceNodes: season?.querySelectorAll('.season-now__market-row, .season-now__change, .season-now__price').length ?? 0,
        progress: progressRect && seasonRect && progressStyle ? {
          width: progressRect.width,
          seasonWidth: seasonRect.width,
          height: progressRect.height,
          radius: parseFloat(progressStyle.borderTopLeftRadius),
        } : null,
        tapeInside: band.querySelectorAll('.market-tape').length,
        rail: read(rail),
      };
    });
    check(
      'the compact season sculpture and long progress pill replace the nested hero container',
      openingMaterial.season
        && openingMaterial.oldHero === 0
        && !openingMaterial.oldCopy
        && openingMaterial.seasonDirect
        && openingMaterial.seasonImage === '/assets/sculptures/512/leo.webp'
        && openingMaterial.seasonPriceNodes === 0
        && !/\$|\bprice\b/i.test(`${openingMaterial.seasonText} ${openingMaterial.seasonLabel}`)
        && openingMaterial.progress
        && openingMaterial.progress.width >= 160
        && openingMaterial.progress.width >= openingMaterial.progress.seasonWidth * 0.5
        && openingMaterial.progress.height >= 5
        && openingMaterial.progress.radius >= openingMaterial.progress.height / 2 - 1
        && openingMaterial.tapeInside === 0
        && openingMaterial.season.borderWidths.every((width) => width === '0px')
        && openingMaterial.season.borderRadius === '0px'
        && openingMaterial.season.backgroundColor === 'rgba(0, 0, 0, 0)'
        && openingMaterial.season.backgroundImage === 'none'
        && openingMaterial.rail
        && openingMaterial.rail.borderWidths.every((width) => width === '0px')
        && openingMaterial.rail.borderRadius === '0px'
        && openingMaterial.rail.backgroundColor === 'rgba(0, 0, 0, 0)'
        && openingMaterial.rail.backgroundImage === 'none'
        && openingMaterial.rail.backdropFilter === 'none',
      JSON.stringify(openingMaterial),
    );
    check(
      'the fallback stage shows one synchronized gold sculpture where the scene cannot',
      await desktop.locator('.stage-carousel__slide').count() === 1
        && await desktop.locator('.stage-carousel__slide.is-active .stage-carousel__art')
          .getAttribute('src') === '/assets/sculptures/512/leo.webp',
    );
    check(
      'without WebGL the preserved scene mount stays inert and its bundle is never requested',
      desktopGalleryRequests.length === 0
        && await desktop.locator('[data-gallery-canvas] canvas').count() === 0
        && await desktop.locator('[data-gallery-canvas][hidden]').count() === 1
        && await desktop.locator('.gband--flat').count() === 1,
      JSON.stringify({ requests: desktopGalleryRequests }),
    );
    const desktopDimensions = await desktop.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      height: document.documentElement.scrollHeight,
      heavy: ['pulse', 'standings', 'onchain-access', 'builders', 'sdk', 'security']
        .filter((id) => document.getElementById(id)),
    }));
    check(
      'desktop consumer Registry has no horizontal overflow and stays below 9,000px',
      desktopDimensions.width <= desktopDimensions.viewport + 1
        && desktopDimensions.height <= 9000,
      JSON.stringify(desktopDimensions),
    );
    check(
      'market, access, and builder chapters are absent from the consumer route',
      desktopDimensions.heavy.length === 0,
      desktopDimensions.heavy.join(','),
    );

    const piscesControl = desktop.locator('[data-consumer-sign="pisces"]');
    await piscesControl.scrollIntoViewIfNeeded();
    const scrollBeforePick = await desktop.evaluate(() => scrollY);
    await piscesControl.click();
    await desktop.locator('[data-consumer-preview="pisces"]').waitFor({ state: 'visible' });
    await desktop.locator('[data-token-chart="pisces"] .token-spark--live svg')
      .waitFor({ state: 'visible', timeout: 20_000 });
    const piscesPlacard = await desktop.locator('[data-consumer-preview="pisces"]').evaluate((placard) => ({
      text: placard.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      name: placard.querySelector('.stage-placard__name')?.textContent ?? '',
      record: placard.querySelector('a.btn--ghost')?.getAttribute('href'),
      trade: placard.querySelector('a.btn--primary')?.getAttribute('href'),
      price: placard.querySelector('.stage-placard__price')?.textContent ?? '',
      // Two things the placard deliberately does not carry: the second chain,
      // and a detour into the astrology guide.
      base: placard.textContent?.includes('Also recorded on Base') ?? false,
      guide: Boolean(placard.querySelector('a[href="/pisces/"]')),
      marketSign: placard.querySelector('.stage-market')?.getAttribute('data-stage-market') ?? '',
      chartLabel: placard.querySelector('[data-token-chart="pisces"] svg')?.getAttribute('aria-label') ?? '',
      scrollY,
    }));
    check(
      'selecting Pisces relabels the placard without moving the page',
      piscesPlacard.name === 'Pisces'
        && piscesPlacard.record === '/registry/pisces/'
        && piscesPlacard.trade === '/registry/pisces/#acquire'
        && piscesPlacard.base === false
        && piscesPlacard.guide === false
        && piscesPlacard.marketSign === 'pisces'
        && /Pisces closed hourly history covers 24 hourly slots/i.test(piscesPlacard.chartLabel)
        && Math.abs(piscesPlacard.scrollY - scrollBeforePick) <= 2,
      JSON.stringify(piscesPlacard),
    );
    check(
      'choosing a sign turns the carousel to its sculpture',
      await desktop.locator('.stage-carousel__slide.is-active .stage-carousel__art')
        .getAttribute('src') === '/assets/sculptures/512/pisces.webp',
    );
    await desktop.locator(
      '.gband__constellation[data-stage-constellation="pisces"] img.is-entering[src="/assets/constellations/pisces.svg"]',
    ).waitFor({ state: 'attached' });
    const briefing = desktop.locator('#briefing');
    await briefing.scrollIntoViewIfNeeded();
    await desktop.locator('#briefing[aria-busy="false"]').waitFor({ timeout: 15_000 });
    const synchronizedContext = await briefing.evaluate((section) => ({
      constellation: document.querySelector('.gband__constellation')?.getAttribute('data-stage-constellation') ?? '',
      constellationSrc: document.querySelector('.gband__constellation img.is-entering')?.getAttribute('src') ?? '',
      heading: section.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      sign: section.getAttribute('data-briefing-sign'),
      signName: section.querySelector('.consumer-briefing__sign strong')?.textContent?.trim() ?? '',
      event: section.querySelector('[data-briefing-event] h3')?.textContent?.trim() ?? '',
      reading: section.querySelector('[data-briefing-reading] p')?.textContent?.trim() ?? '',
      nextEvent: section.querySelector('[data-briefing-next-event]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      marketLabels: [...section.querySelectorAll('[data-briefing-market] dt')]
        .map((node) => node.textContent?.trim() ?? ''),
      marketValues: [...section.querySelectorAll('[data-briefing-market] dd')]
        .map((node) => node.textContent?.trim() ?? ''),
      headlineCount: section.querySelectorAll('.consumer-briefing__headline').length,
      headlineTitles: [...section.querySelectorAll('.consumer-briefing__headline h3')]
        .map((node) => node.textContent?.trim() ?? ''),
      headlineLinks: [...section.querySelectorAll('.consumer-briefing__headline a')].map((link) => ({
        rel: link.getAttribute('rel') ?? '',
        href: link.getAttribute('href') ?? '',
        dateTime: link.querySelector('time')?.getAttribute('datetime') ?? '',
      })),
      cta: section.querySelector('.consumer-briefing__cta')?.getAttribute('href') ?? '',
      removedControls: section.querySelectorAll([
        '.research-updates', '.consumer-research__filters', '.outlook-wheel',
        '.outlook-score', '.outlook-lab__toolbar', '.outlook-reading__actions',
      ].join(',')).length,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    }));
    check(
      'selected Pisces synchronizes sculpture, constellation, market briefing, sources, and Research CTA',
      synchronizedContext.constellation === 'pisces'
        && synchronizedContext.constellationSrc === '/assets/constellations/pisces.svg'
        && synchronizedContext.heading === 'Today’s market briefing'
        && synchronizedContext.sign === 'pisces'
        && synchronizedContext.signName === 'Pisces'
        && synchronizedContext.event === 'No concentrated event today'
        && /Pisces/i.test(synchronizedContext.reading)
        && /No additional exact event is scheduled for Pisces/i.test(synchronizedContext.nextEvent)
        && JSON.stringify(synchronizedContext.marketLabels) === JSON.stringify([
          'Price', '24H change', 'Liquidity', '24H volume',
        ])
        && synchronizedContext.marketValues[0] === '$0.00504'
        && synchronizedContext.marketValues[1] === '0.00%'
        && synchronizedContext.marketValues[2] === '$250K'
        && synchronizedContext.marketValues[3] === '$64K'
        && synchronizedContext.headlineCount === 2
        && synchronizedContext.headlineTitles[0] === 'Independent astrology headline'
        && synchronizedContext.headlineLinks.every((link) => (
          link.href.startsWith('https://')
            && link.rel.split(/\s+/).includes('external')
            && Boolean(link.dateTime)
        ))
        && synchronizedContext.cta === '/terminal/research/?sign=pisces'
        && synchronizedContext.removedControls === 0
        && synchronizedContext.pageWidth <= synchronizedContext.viewportWidth + 1,
      JSON.stringify(synchronizedContext),
    );
    check(
      'landing briefing performs one Outlook read, one news read, and no Research Desk feed read',
      desktopOutlookRequests.length === 1
        && desktopNewsRequests.length === 1
        && desktopLandingResearchRequests.length === 0,
      JSON.stringify({
        outlook: desktopOutlookRequests,
        news: desktopNewsRequests,
        research: desktopLandingResearchRequests,
      }),
    );
    await desktop.locator('.stage-placard__price').waitFor({ timeout: 15_000 });
    const placardQuote = await desktop.locator('.stage-placard').evaluate((placard) => ({
      price: placard.querySelector('.stage-placard__price')?.textContent ?? '',
      change: placard.querySelector('.stage-placard__change')?.textContent ?? '',
      directional: Boolean(placard.querySelector(
        '.market__change--up, .market__change--down, .market__change--flat',
      )),
    }));
    check(
      'the placard quotes a live price with a signed 24h change',
      /^\$\d/.test(placardQuote.price)
        && /%$/.test(placardQuote.change)
        && placardQuote.directional,
      JSON.stringify(placardQuote),
    );
    const compactWatchlist = await desktop.locator('.market-row').count();
    const expandMarket = desktop.locator('.market-board__expand');
    check(
      'desktop first paint shows six leaders behind an explicit Show all 12 control',
      compactWatchlist === 6
        && await expandMarket.getAttribute('aria-expanded') === 'false'
        && (await expandMarket.innerText()).includes('Show all 12'),
      `${compactWatchlist}/${await expandMarket.innerText()}`,
    );
    await expandMarket.click();
    await desktop.waitForFunction(() => document.querySelectorAll('#market .market-row').length === 12);
    const watchlist = await desktop.locator('.market-row').evaluateAll((rows) => rows.map((row) => {
      const record = row.querySelector('.market-row__record');
      return {
        slug: row.getAttribute('data-market-sign'),
        href: record?.getAttribute('href'),
        priced: /^\$/.test(row.querySelector('.market-row__metric--price strong')?.textContent ?? ''),
        recordLabel: record?.getAttribute('aria-label') ?? '',
        recordText: record?.querySelector('.market-row__record-label')?.textContent?.trim() ?? '',
        recordPill: record?.classList.contains('registry-pill') ?? false,
        sculptureActions: row.querySelectorAll('.market-row__view').length,
      };
    }));
    check(
      'Show all 12 expands the descending market-cap board and links every official record',
      watchlist.length === 12
        && JSON.stringify(watchlist.map((row) => row.slug)) === JSON.stringify([
          'pisces', 'aquarius', 'capricorn', 'sagittarius', 'scorpio', 'libra',
          'virgo', 'leo', 'cancer', 'gemini', 'taurus', 'aries',
        ])
        && watchlist.every((row) => row.href === `/registry/${row.slug}/`)
        && watchlist.every((row) => row.priced)
        && watchlist.every((row) => (
          row.recordLabel === `Open the official ${row.slug.charAt(0).toUpperCase() + row.slug.slice(1)} record`
            && row.recordText === 'Official record'
            && row.recordPill
            && row.sculptureActions === 0
        )),
      JSON.stringify(watchlist),
    );
    const marketMaterial = await desktop.locator('#market').evaluate((section) => {
      const inspect = (button) => {
        if (!button) return null;
        const rect = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        return {
          label: button.getAttribute('aria-label') || button.textContent.replace(/\s+/g, ' ').trim(),
          text: button.textContent.replace(/\s+/g, ' ').trim(),
          pill: button.classList.contains('registry-pill'),
          svg: Boolean(button.querySelector('svg')),
          width: rect.width,
          height: rect.height,
          backgroundImage: style.backgroundImage,
          backgroundColor: style.backgroundColor,
          backdropFilter: style.backdropFilter || style.webkitBackdropFilter || '',
          borderWidth: style.borderTopWidth,
          borderRadius: style.borderTopLeftRadius,
          fontFamily: style.fontFamily,
          boxShadow: style.boxShadow,
        };
      };
      return {
        eyebrow: section.querySelector('.consumer-section-head__eyebrow')
          ?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        heading: section.querySelector('#consumer-market-title')
          ?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        buy: inspect(document.querySelector('.stage-placard .btn--primary.stage-placard__pill')),
        sortShell: inspect(section.querySelector('.market-board__sort')),
        sort: [...section.querySelectorAll('.market-board__sort button')].map(inspect),
        share: [...section.querySelectorAll('.market-board__share button')].map(inspect),
        rowActions: [...section.querySelectorAll('.market-row__record')].map(inspect),
        sculptureActions: section.querySelectorAll('.market-row__view').length,
        legacyGlass: document.querySelectorAll('.market-glass').length,
      };
    });
    check(
      'the live market board uses the approved capital-markets identity without repetition',
      marketMaterial.eyebrow === 'Live market board'
        && marketMaterial.heading === 'The twelve, ranked live.',
      JSON.stringify({ eyebrow: marketMaterial.eyebrow, heading: marketMaterial.heading }),
    );
    check(
      'market filters, sharing, and records use the stage Buy pill language without Market glass',
      marketMaterial.buy
        && marketMaterial.buy.height >= 43.5
        && marketMaterial.legacyGlass === 0
        && marketMaterial.sortShell
        && marketMaterial.sortShell.backgroundImage === 'none'
        && marketMaterial.sortShell.backdropFilter === 'none'
        && marketMaterial.sortShell.borderWidth === '0px'
        && marketMaterial.sort.length === 3
        && marketMaterial.share.length === 4
        && marketMaterial.sort.every((control) => (
          control.pill
            && control.height >= 43.5
            && control.backdropFilter === 'none'
            && control.borderWidth === marketMaterial.buy.borderWidth
            && control.borderRadius === marketMaterial.buy.borderRadius
            && control.fontFamily === marketMaterial.buy.fontFamily
        ))
        && JSON.stringify(marketMaterial.share.map((control) => control.label))
          === JSON.stringify(['Share snapshot', 'Share on X', 'Share on Telegram', 'Share on WhatsApp'])
        && marketMaterial.share[0]?.text === 'Share'
        && marketMaterial.share.every((control) => (
          control.pill
            && control.svg
            && control.width >= 43.5
            && control.height >= 43.5
            && control.backdropFilter === 'none'
            && control.borderWidth === marketMaterial.buy.borderWidth
            && control.borderRadius === marketMaterial.buy.borderRadius
            && control.fontFamily === marketMaterial.buy.fontFamily
            && control.boxShadow.includes('inset')
        ))
        && marketMaterial.sculptureActions === 0
        && marketMaterial.rowActions.length === 12
        && marketMaterial.rowActions.every((control) => (
          control.pill
            && control.height >= 43.5
            && control.backdropFilter === 'none'
            && control.borderRadius === marketMaterial.buy.borderRadius
            && control.fontFamily === marketMaterial.buy.fontFamily
        )),
      JSON.stringify(marketMaterial),
    );
    await desktop.evaluate(() => {
      window.__registryMarketIntents = [];
      window.open = (...args) => {
        window.__registryMarketIntents.push(args);
        return null;
      };
      for (const label of ['X', 'Telegram', 'WhatsApp']) {
        document.querySelector(`.market-board__social[aria-label="Share on ${label}"]`)?.click();
      }
    });
    const marketIntents = await desktop.evaluate(() => window.__registryMarketIntents);
    const [xIntent, telegramIntent, whatsappIntent] = marketIntents.map(([url, target, features]) => ({
      url: new URL(url),
      target,
      features,
    }));
    const xShared = xIntent ? new URL(xIntent.url.searchParams.get('url')) : null;
    const telegramShared = telegramIntent ? new URL(telegramIntent.url.searchParams.get('url')) : null;
    check(
      'social logos open canonical share intents while preserving the ranked Registry view',
      marketIntents.length === 3
        && xIntent.url.hostname === 'x.com'
        && xIntent.url.pathname === '/intent/post'
        && telegramIntent.url.hostname === 't.me'
        && telegramIntent.url.pathname === '/share/url'
        && whatsappIntent.url.hostname === 'wa.me'
        && xShared.pathname === '/terminal/'
        && xShared.searchParams.get('rank') === 'marketCap'
        && xShared.searchParams.get('sign') === 'pisces'
        && xShared.hash === '#market'
        && telegramShared.href === xShared.href
        && whatsappIntent.url.searchParams.get('text').includes(xShared.href)
        && [xIntent, telegramIntent, whatsappIntent].every((intent) => (
          intent.target === '_blank' && intent.features === 'noopener,noreferrer'
        ))
        && (await desktop.locator('.market-board__share-state').innerText()) === 'WhatsApp share opened.',
      JSON.stringify(marketIntents),
    );
    check(
      'the polite selection status announces the chosen sign',
      (await desktop.locator('[data-consumer-live]').innerText()).includes('Pisces selected'),
    );
    await desktop.locator('[data-consumer-sign="pisces"]').press('ArrowLeft');
    await desktop.locator('[data-consumer-sign="aquarius"][aria-pressed="true"]').waitFor();
    check(
      'consumer explorer keyboard navigation moves both selection and focus',
      await desktop.locator('[data-consumer-sign="aquarius"]').evaluate((control) => (
        control === document.activeElement && control.tabIndex === 0
      )),
    );
    await desktop.locator('[data-consumer-sign="aquarius"]').press('Home');
    await desktop.locator('[data-consumer-sign="aries"][aria-pressed="true"]').waitFor();
    check(
      'Home moves the consumer explorer to Aries',
      await desktop.locator('[data-consumer-preview="aries"]').count() === 1,
    );

    const expectedAriesDaily = committedOutlook.daily.signs.find((item) => item.sign === 'aries');
    const expectedAriesNext = committedOutlook.weekly.signs
      .find((item) => item.sign === 'aries')?.factors
      .filter((factor) => (
        factor.kind !== 'occupancy'
          && Date.parse(factor.at) > Date.parse(COMMITTED_OUTLOOK_REFERENCE)
      ))
      .sort((left, right) => Date.parse(left.at) - Date.parse(right.at))[0];
    const ariesBriefing = desktop.locator('#briefing');
    await ariesBriefing.scrollIntoViewIfNeeded();
    await desktop.locator('#briefing[data-briefing-sign="aries"][aria-busy="false"]')
      .waitFor({ timeout: 15_000 });
    const ariesBriefingState = await ariesBriefing.evaluate((section) => ({
      event: section.querySelector('[data-briefing-event] h3')?.textContent?.trim() ?? '',
      eventAt: section.querySelector('[data-briefing-event] > time')?.getAttribute('datetime') ?? '',
      reading: section.querySelector('[data-briefing-reading] p')?.textContent?.trim() ?? '',
      marketLabels: [...section.querySelectorAll('[data-briefing-market] dt')]
        .map((node) => node.textContent?.trim() ?? ''),
      marketValues: [...section.querySelectorAll('[data-briefing-market] dd')]
        .map((node) => node.textContent?.trim() ?? ''),
      marketSeparation: section.querySelector('[data-briefing-market] > p')?.textContent?.trim() ?? '',
      nextLabel: section.querySelector('[data-briefing-next-event] > strong')?.textContent?.trim() ?? '',
      nextAt: section.querySelector('[data-briefing-next-event] time')?.getAttribute('datetime') ?? '',
      countdown: section.querySelector('[data-briefing-next-event] em')?.textContent?.trim() ?? '',
      disclaimer: section.querySelector('.consumer-briefing__foot p')?.textContent?.trim() ?? '',
      headlineCount: section.querySelectorAll('.consumer-briefing__headline').length,
      oldWheel: document.querySelectorAll('.outlook-wheel').length,
      oldScores: document.querySelectorAll('.outlook-score, .outlook-dial').length,
      oldFilters: document.querySelectorAll('.consumer-research__filters').length,
      shareSignal: [...document.querySelectorAll('button')]
        .some((button) => /share signal/i.test(button.textContent ?? '')),
    }));
    check(
      'the Aries briefing keeps one exact event, practical reading, four observed metrics, and next-event countdown',
      ariesBriefingState.event === expectedAriesDaily?.primaryFactor?.label
        && ariesBriefingState.eventAt === expectedAriesDaily?.primaryFactor?.at
        && /Traditional astrology/i.test(ariesBriefingState.reading)
        && /Aries/i.test(ariesBriefingState.reading)
        && /does not imply a higher token price|market direction remains independent|does not predict price direction or volatility|check whether volume and liquidity actually show greater activity|without assuming direction|use it as context, not a market forecast/i
          .test(ariesBriefingState.reading)
        && JSON.stringify(ariesBriefingState.marketLabels) === JSON.stringify([
          'Price', '24H change', 'Liquidity', '24H volume',
        ])
        && ariesBriefingState.marketValues[0] === '$0.00042'
        && ariesBriefingState.marketValues[1] === '+4.20%'
        && ariesBriefingState.marketValues[2] === '$250K'
        && ariesBriefingState.marketValues[3] === '$64K'
        && /Market data never changes the sky reading/i.test(ariesBriefingState.marketSeparation)
        && ariesBriefingState.nextLabel === expectedAriesNext?.label
        && ariesBriefingState.nextAt === expectedAriesNext?.at
        && /^in (?:(?:\d+d )?\d+h(?: \d+m)?)$/i.test(ariesBriefingState.countdown)
        && /not a price forecast/i.test(ariesBriefingState.disclaimer)
        && /no established predictive relationship/i.test(ariesBriefingState.disclaimer)
        && ariesBriefingState.headlineCount === 2
        && ariesBriefingState.oldWheel === 0
        && ariesBriefingState.oldScores === 0
        && ariesBriefingState.oldFilters === 0
        && !ariesBriefingState.shareSignal,
      JSON.stringify({ expectedAriesDaily, expectedAriesNext, ariesBriefingState }),
    );

    const registry = await fetch(baseURL + '/registry/zodiacs.registry.json').then((response) => response.json());
    const leo = registry.assets.find((asset) => asset.sign === 'leo');
    const verifier = desktop.locator('#verify');
    await verifier.locator('#vrf-input').fill(leo.native.address);
    await verifier.locator('#vrf-input').press('Enter');
    await verifier.locator('[data-verifier-state="official"]').waitFor();
    check(
      'verifier identifies an official native record in plain language',
      (await verifier.locator('[data-verifier-state="official"]').innerText())
        .includes('Official Leo address on Solana.'),
    );
    const base58Alphabet = new Set('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
    const solanaMutationIndex = [...leo.native.address].findIndex((character) => {
      const toggled = character === character.toLowerCase()
        ? character.toUpperCase()
        : character.toLowerCase();
      return toggled !== character && base58Alphabet.has(toggled);
    });
    const caseMutatedSolanaAddress = [
      ...leo.native.address.slice(0, solanaMutationIndex),
      leo.native.address[solanaMutationIndex] === leo.native.address[solanaMutationIndex].toLowerCase()
        ? leo.native.address[solanaMutationIndex].toUpperCase()
        : leo.native.address[solanaMutationIndex].toLowerCase(),
      ...leo.native.address.slice(solanaMutationIndex + 1),
    ].join('');
    await verifier.locator('#vrf-input').fill(caseMutatedSolanaAddress);
    await verifier.locator('#vrf-input').press('Enter');
    await verifier.locator('[data-verifier-state="not-found"]').waitFor();
    check(
      'verifier treats Solana addresses as case-sensitive',
      (await verifier.locator('[data-verifier-state="not-found"]').innerText())
        .includes('This address isn’t in the official Zodiac list.'),
    );
    const leoBaseAddress = leo.representations.find((representation) => representation.chain === 'base').address;
    await verifier.locator('#vrf-input').fill(leoBaseAddress.toLowerCase());
    await verifier.locator('#vrf-input').press('Enter');
    await verifier.locator('[data-verifier-state="official"]').waitFor();
    check(
      'verifier treats Base addresses as case-insensitive',
      (await verifier.locator('[data-verifier-state="official"]').innerText())
        .includes('Official Leo address on Base.'),
    );
    await verifier.locator('#vrf-input').fill('0x0000000000000000000000000000000000000001');
    await verifier.locator('#vrf-input').press('Enter');
    await verifier.locator('[data-verifier-state="not-found"]').waitFor();
    check(
      'verifier distinguishes a valid-looking unknown address',
      (await verifier.locator('[data-verifier-state="not-found"]').innerText())
        .includes('This address isn’t in the official Zodiac list.'),
    );
    await verifier.locator('#vrf-input').fill('not an address');
    await verifier.locator('#vrf-input').press('Enter');
    await verifier.locator('[data-verifier-state="invalid"]').waitFor();
    check(
      'verifier distinguishes malformed input',
      (await verifier.locator('[data-verifier-state="invalid"]').innerText())
        .includes('That doesn’t look like a Solana or Base address.'),
    );
    check(
      'verifier states its read-only boundary beside the form',
      (await verifier.innerText()).includes('never connects a wallet, requests a signature, or starts a transaction'),
    );
    const compactConsumerTargets = await desktop.locator(
      '.vrf__example, .consumer-preview__actions a.btn, .consumer-closing__actions > a:not(.btn)',
    ).evaluateAll((targets) => targets.map((target) => ({
      label: target.textContent.trim(),
      height: target.getBoundingClientRect().height,
    })));
    check(
      'compact consumer controls retain 44px touch targets',
      compactConsumerTargets.length >= 3
        && compactConsumerTargets.every(({ height }) => height >= 44),
      JSON.stringify(compactConsumerTargets),
    );
    check(
      'consumer Registry shows exactly five quick answers',
      await desktop.locator('#faq .consumer-faq__item').count() === 5,
    );
    const purposeArt = await desktop.locator('#thesis').evaluate((section) => {
      const collection = section.querySelector('.consumer-collection__link');
      const thesis = section.querySelector('.consumer-thesis__link');
      const thesisImage = thesis?.querySelector('img');
      return {
        collectionHref: collection?.getAttribute('href') ?? '',
        seats: collection?.querySelectorAll('.consumer-cabinet__seat').length ?? 0,
        filledSeats: collection?.querySelectorAll('.consumer-cabinet__seat.is-filled').length ?? 0,
        occupied: [...(collection?.querySelectorAll('.consumer-cabinet__seat.is-filled') || [])]
          .map((seat) => ({
            finish: seat.getAttribute('data-cabinet-sample-finish') ?? '',
            src: seat.querySelector('img')?.getAttribute('src') ?? '',
            edition: seat.querySelector('.consumer-cabinet__edition')?.textContent?.trim() ?? '',
            count: seat.querySelector('.consumer-cabinet__count')?.textContent?.trim() ?? '',
          })),
        thesisHref: thesis?.getAttribute('href') ?? '',
        thesisImage: thesisImage?.getAttribute('src') ?? '',
        thesisAlt: thesisImage?.getAttribute('alt') ?? '',
      };
    });
    const expectedCabinetSample = [
      { finish: 'crown', src: '/assets/cabinet-materials/gold/aries.webp', edition: 'V', count: '×12' },
      { finish: 'pastel', src: '/assets/zodiac-icons/128/cancer.webp', edition: 'I', count: '' },
      { finish: 'bronze', src: '/assets/zodiac-icons/128/leo.webp', edition: 'II', count: '' },
      { finish: 'silver', src: '/assets/zodiac-icons/128/scorpio.webp', edition: 'III', count: '' },
      { finish: 'gold', src: '/assets/cabinet-materials/gold/aquarius.webp', edition: 'IV', count: '×3' },
    ];
    check(
      'collection and thesis links preview the exact artwork found at their destinations',
      purposeArt.collectionHref === '/registry/collection/'
        && purposeArt.seats === 12
        && purposeArt.filledSeats === 5
        && JSON.stringify(purposeArt.occupied) === JSON.stringify(expectedCabinetSample)
        && purposeArt.occupied.filter(({ src }) => src.startsWith('/assets/cabinet-materials/')).length === 2
        && purposeArt.occupied.filter(({ src }) => src.startsWith('/assets/zodiac-icons/')).length === 3
        && purposeArt.thesisHref === '/thesis/'
        && purposeArt.thesisImage.includes('/assets/art/zodiac-clock-')
        && purposeArt.thesisAlt.length > 0,
      JSON.stringify(purposeArt),
    );
    check('desktop consumer runtime is error-free', desktopErrors.length === 0, desktopErrors.join(' | '));
    if (OUT) await desktop.screenshot({ path: OUT + '/registry-consumer-1126.png', fullPage: false });
    await desktop.close();

    const emptyMarket = await newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    await freezeRegistryClock(emptyMarket);
    await stubNoWebgl(emptyMarket);
    await mockDexscreener(emptyMarket, { empty: true });
    await mockRegistryBriefingSources(emptyMarket);
    await emptyMarket.goto(baseURL + '/terminal/', { waitUntil: 'domcontentloaded' });
    await emptyMarket.locator('#market').scrollIntoViewIfNeeded();
    await emptyMarket.locator('.market-board__state').waitFor({ timeout: 15_000 });
    const emptyMarketState = await emptyMarket.locator('#market').evaluate((section) => ({
      rows: section.querySelectorAll('.market-row').length,
      recordLinks: section.querySelectorAll('.market-row__actions a[href^="/registry/"]').length,
      shareDisabled: [...section.querySelectorAll('.market-board__share button')]
        .every((button) => button.disabled),
      pulse: [...document.querySelectorAll('.capital-pulse strong')]
        .map((node) => node.textContent.trim()),
      meta: section.querySelector('.market-board__meta')?.textContent ?? '',
      expandText: section.querySelector('.market-board__expand')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    }));
    check(
      'an empty upstream feed is unavailable, never a shareable zero-dollar market',
      emptyMarketState.rows === 3
        && emptyMarketState.recordLinks === 3
        && emptyMarketState.shareDisabled
        && emptyMarketState.pulse.every((value) => value === '—')
        && /unavailable/i.test(emptyMarketState.meta)
        && /Show all 12/i.test(emptyMarketState.expandText),
      JSON.stringify(emptyMarketState),
    );
    await emptyMarket.locator('#briefing').scrollIntoViewIfNeeded();
    await emptyMarket.locator('#briefing[aria-busy="false"]').waitFor({ timeout: 15_000 });
    const marketFailureBriefing = await emptyMarket.locator('#briefing').evaluate((section) => ({
      skyFailure: section.querySelectorAll('.consumer-briefing__state').length,
      event: section.querySelector('[data-briefing-event] h3')?.textContent?.trim() ?? '',
      values: [...section.querySelectorAll('[data-briefing-market] dd')]
        .map((node) => node.textContent?.trim() ?? ''),
      marketStatus: section.querySelector('[data-briefing-market] header small')?.textContent?.trim() ?? '',
      headlines: section.querySelectorAll('.consumer-briefing__headline').length,
      cta: section.querySelector('.consumer-briefing__cta')?.getAttribute('href') ?? '',
    }));
    check(
      'market failure leaves sky context, two outside headlines, and deeper Research available',
      marketFailureBriefing.skyFailure === 0
        && Boolean(marketFailureBriefing.event)
        && JSON.stringify(marketFailureBriefing.values) === JSON.stringify(['—', '—', '—', '—'])
        && marketFailureBriefing.marketStatus === 'Live read unavailable'
        && marketFailureBriefing.headlines === 2
        && marketFailureBriefing.cta === '/terminal/research/?sign=leo',
      JSON.stringify(marketFailureBriefing),
    );
    await emptyMarket.route('**/assets/registry-outlook.json', async (route) => {
      const response = await route.fetch();
      const payload = await response.json();
      payload.daily.date = '2000-01-01';
      payload.weekly.date = '2000-01-01';
      await route.fulfill({
        response,
        body: JSON.stringify(payload),
        headers: { ...response.headers(), 'content-length': undefined },
      });
    });
    await emptyMarket.goto(
      baseURL + '/terminal/?rank=liquidity&sign=pisces#outlook',
      { waitUntil: 'domcontentloaded' },
    );
    await emptyMarket.locator('#briefing[aria-busy="false"]')
      .waitFor({ timeout: 15_000 });
    const sharedState = await emptyMarket.evaluate(() => ({
      sign: document.querySelector('.stage-placard__name')?.textContent?.trim() ?? '',
      rank: document.querySelector('.market-board__sort button[aria-pressed="true"]')
        ?.textContent?.trim() ?? '',
      briefingSign: document.querySelector('#briefing')?.getAttribute('data-briefing-sign') ?? '',
      stale: document.querySelector('#briefing .consumer-briefing__notice')?.textContent?.trim() ?? '',
      cta: document.querySelector('#briefing .consumer-briefing__cta')?.getAttribute('href') ?? '',
      hash: location.hash,
      aliasInsideBriefing: document.querySelector('#briefing > #outlook')?.getAttribute('aria-hidden') ?? '',
      briefingTop: document.querySelector('#briefing')?.getBoundingClientRect().top ?? innerHeight,
      oldHorizonControls: document.querySelectorAll('.outlook-lab__toolbar, [name="outlook"]').length,
    }));
    check(
      '#outlook deep-links to the consolidated briefing while restoring sign and market rank',
      sharedState.sign === 'Pisces'
        && sharedState.rank === 'Liquidity'
        && sharedState.briefingSign === 'pisces'
        && /Latest published sky edition/i.test(sharedState.stale)
        && sharedState.cta === '/terminal/research/?sign=pisces'
        && sharedState.hash === '#outlook'
        && sharedState.aliasInsideBriefing === 'true'
        && sharedState.briefingTop > 0
        && sharedState.briefingTop < 220
        && sharedState.oldHorizonControls === 0,
      JSON.stringify(sharedState),
    );
    await emptyMarket.unroute('**/assets/registry-outlook.json');
    await emptyMarket.route('**/assets/registry-outlook.json', async (route) => {
      const response = await route.fetch();
      const payload = await response.json();
      const today = new Date().toISOString().slice(0, 10);
      payload.daily.date = today;
      payload.daily.coverage = {
        ...payload.daily.coverage,
        overall: 'partial',
        events: 'partial',
        missingTransitMonths: [today.slice(0, 7)],
      };
      await route.fulfill({
        response,
        body: JSON.stringify(payload),
        headers: { ...response.headers(), 'content-length': undefined },
      });
    });
    await emptyMarket.goto(baseURL + '/terminal/?sign=aries#outlook', { waitUntil: 'domcontentloaded' });
    await emptyMarket.locator('#briefing[aria-busy="false"]').waitFor({ timeout: 15_000 });
    const partialSignal = await emptyMarket.locator('#briefing').evaluate((section) => ({
      notices: [...section.querySelectorAll('.consumer-briefing__notice')]
        .map((notice) => notice.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
      sign: section.getAttribute('data-briefing-sign'),
      cta: section.querySelector('.consumer-briefing__cta')?.getAttribute('href') ?? '',
      oldSignalControls: section.querySelectorAll('.outlook-lab__toolbar, .outlook-reading__actions').length,
    }));
    check(
      'partial sky coverage is announced without reviving signal horizons or sharing',
      partialSignal.notices.length === 1
        && /partial sky coverage/i.test(partialSignal.notices[0])
        && /may omit an event/i.test(partialSignal.notices[0])
        && partialSignal.sign === 'aries'
        && partialSignal.cta === '/terminal/research/?sign=aries'
        && partialSignal.oldSignalControls === 0,
      JSON.stringify(partialSignal),
    );
    await emptyMarket.close();

    const skyFailure = await newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await freezeRegistryClock(skyFailure);
    await stubNoWebgl(skyFailure);
    await mockDexscreener(skyFailure);
    await mockRegistryBriefingSources(skyFailure);
    await skyFailure.route('**/assets/registry-outlook.json', (route) => route.abort());
    await skyFailure.goto(baseURL + '/terminal/#outlook', { waitUntil: 'domcontentloaded' });
    const failedSky = skyFailure.locator('#briefing .consumer-briefing__state');
    await failedSky.waitFor({ timeout: 15_000 });
    await skyFailure.locator('#briefing[aria-busy="false"]').waitFor({ timeout: 15_000 });
    const failedSkyState = await skyFailure.locator('#briefing').evaluate((section) => {
      const state = section.querySelector('.consumer-briefing__state');
      const retry = state?.querySelector('button');
      return {
        text: state?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        retryText: retry?.textContent?.trim() ?? '',
        retryPill: retry?.classList.contains('registry-pill') ?? false,
        retryHeight: retry?.getBoundingClientRect().height ?? 0,
        edition: section.querySelector('.consumer-briefing__sign em')?.textContent?.trim() ?? '',
        next: section.querySelector('[data-briefing-next-event] p')?.textContent?.trim() ?? '',
        marketValues: [...section.querySelectorAll('[data-briefing-market] dd')]
          .map((node) => node.textContent?.trim() ?? ''),
        headlines: section.querySelectorAll('.consumer-briefing__headline').length,
        cta: section.querySelector('.consumer-briefing__cta')?.getAttribute('href') ?? '',
        hashAlias: Boolean(section.querySelector(':scope > #outlook')) && location.hash === '#outlook',
      };
    });
    check(
      'sky failure leaves market and news independent and offers an accessible retry',
      /Sky context unavailable/i.test(failedSkyState.text)
        && /Market and source feeds load independently/i.test(failedSkyState.text)
        && failedSkyState.retryText === 'Retry sky data'
        && failedSkyState.retryPill
        && failedSkyState.retryHeight >= 43.5
        && failedSkyState.edition === 'Sky edition unavailable'
        && failedSkyState.next === 'Next-event schedule unavailable.'
        && failedSkyState.marketValues.every((value) => !['…', '—'].includes(value))
        && failedSkyState.headlines === 2
        && failedSkyState.cta === '/terminal/research/?sign=leo'
        && failedSkyState.hashAlias,
      JSON.stringify(failedSkyState),
    );
    await skyFailure.close();

    const newsFailure = await newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await freezeRegistryClock(newsFailure);
    await stubNoWebgl(newsFailure);
    await mockDexscreener(newsFailure);
    await newsFailure.route('**/api/registry/news', (route) => route.abort());
    await newsFailure.goto(baseURL + '/terminal/#briefing', { waitUntil: 'domcontentloaded' });
    await newsFailure.locator('#briefing[aria-busy="false"]').waitFor({ timeout: 15_000 });
    const failedNewsState = await newsFailure.locator('#briefing').evaluate((section) => ({
      text: section.querySelector('.consumer-briefing__news-state')?.textContent?.trim() ?? '',
      sourceMeta: section.querySelector('.consumer-briefing__news > header small')?.textContent?.trim() ?? '',
      skyFailure: section.querySelectorAll('.consumer-briefing__state').length,
      event: section.querySelector('[data-briefing-event] h3')?.textContent?.trim() ?? '',
      marketValues: [...section.querySelectorAll('[data-briefing-market] dd')]
        .map((node) => node.textContent?.trim() ?? ''),
      cta: section.querySelector('.consumer-briefing__cta')?.getAttribute('href') ?? '',
    }));
    check(
      'news failure leaves the sky, market observation, and Research CTA intact',
      failedNewsState.text === 'Source headlines are temporarily unavailable.'
        && failedNewsState.sourceMeta === 'Fresh source coverage is unavailable'
        && failedNewsState.skyFailure === 0
        && Boolean(failedNewsState.event)
        && failedNewsState.marketValues.every((value) => !['…', '—'].includes(value))
        && failedNewsState.cta === '/terminal/research/?sign=leo',
      JSON.stringify(failedNewsState),
    );
    await newsFailure.close();

    const loadingBriefing = await newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await freezeRegistryClock(loadingBriefing);
    await stubNoWebgl(loadingBriefing);
    await mockDexscreener(loadingBriefing);
    await mockRegistryBriefingSources(loadingBriefing);
    let releaseSkyLoading;
    let releaseNewsLoading;
    const skyLoadingGate = new Promise((resolve) => { releaseSkyLoading = resolve; });
    const newsLoadingGate = new Promise((resolve) => { releaseNewsLoading = resolve; });
    await loadingBriefing.route('**/assets/registry-outlook.json', async (route) => {
      await skyLoadingGate;
      const response = await route.fetch();
      await route.fulfill({ response });
    });
    await loadingBriefing.route('**/api/registry/news', async (route) => {
      await newsLoadingGate;
      await route.fulfill({ json: registryBriefingNewsPayload() });
    });
    await loadingBriefing.goto(baseURL + '/terminal/#briefing', { waitUntil: 'domcontentloaded' });
    await loadingBriefing.locator('#briefing[aria-busy="true"]').waitFor({ timeout: 15_000 });
    const loadingState = await loadingBriefing.locator('#briefing').evaluate((section) => ({
      busy: section.getAttribute('aria-busy'),
      event: section.querySelector('[data-briefing-event] h3')?.textContent?.trim() ?? '',
      edition: section.querySelector('.consumer-briefing__sign em')?.textContent?.trim() ?? '',
      next: section.querySelector('[data-briefing-next-event] p')?.textContent?.trim() ?? '',
      placeholders: section.querySelectorAll('.consumer-briefing__headline--placeholder').length,
      liveHeadlines: section.querySelectorAll('[data-briefing-headline]').length,
    }));
    check(
      'the briefing exposes an honest busy state while its published sky edition is pending',
      loadingState.busy === 'true'
        && loadingState.event === 'Reading the published sky…'
        && loadingState.edition === 'Loading today’s edition'
        && loadingState.next === 'Loading the published seven-day schedule…'
        && loadingState.placeholders === 2
        && loadingState.liveHeadlines === 0,
      JSON.stringify(loadingState),
    );
    releaseSkyLoading();
    releaseNewsLoading();
    await loadingBriefing.locator('#briefing[aria-busy="false"]').waitFor({ timeout: 15_000 });
    check(
      'the pending briefing settles without a reload',
      await loadingBriefing.locator('[data-briefing-event] h3').innerText() !== 'Reading the published sky…'
        && await loadingBriefing.locator('.consumer-briefing__headline--placeholder').count() === 0
        && await loadingBriefing.locator('[data-briefing-headline]').count() === 2,
    );
    await loadingBriefing.close();

    const reducedTape = await newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    await stubNoWebgl(reducedTape);
    await mockDexscreener(reducedTape);
    await reducedTape.goto(baseURL + '/terminal/', { waitUntil: 'domcontentloaded' });
    await reducedTape.locator('.market-tape__track').waitFor({ state: 'visible' });
    const reducedTapeState = await reducedTape.locator('.market-tape').evaluate((tape) => {
      const viewport = tape.querySelector('.market-tape__viewport');
      const track = tape.querySelector('.market-tape__track');
      const echo = tape.querySelector('.market-tape__group[aria-hidden="true"]');
      const gallery = document.querySelector('#gallery');
      return {
        beforeGallery: Boolean(gallery && (tape.compareDocumentPosition(gallery) & Node.DOCUMENT_POSITION_FOLLOWING)),
        animationName: track ? getComputedStyle(track).animationName : '',
        animationPlayState: track ? getComputedStyle(track).animationPlayState : '',
        echoDisplay: echo ? getComputedStyle(echo).display : '',
        overflowX: viewport ? getComputedStyle(viewport).overflowX : '',
        scrollWidth: viewport?.scrollWidth ?? 0,
        clientWidth: viewport?.clientWidth ?? 0,
        interactive: tape.querySelectorAll('button, a').length,
        visibleItems: [...tape.querySelectorAll('.market-tape__group')]
          .filter((group) => getComputedStyle(group).display !== 'none')
          .reduce((count, group) => count + group.querySelectorAll('.market-tape__item').length, 0),
      };
    });
    check(
      'reduced motion keeps the top market tape as one static native-scroll row',
      reducedTapeState.beforeGallery
        && reducedTapeState.animationName === 'none'
        && reducedTapeState.echoDisplay === 'none'
        && ['auto', 'scroll'].includes(reducedTapeState.overflowX)
        && reducedTapeState.scrollWidth > reducedTapeState.clientWidth
        && reducedTapeState.interactive === 0
        && reducedTapeState.visibleItems === 12,
      JSON.stringify(reducedTapeState),
    );
    await reducedTape.close();

    // The sculpture renders have very different visible silhouettes. Check
    // every sign at the three narrow widths that previously let the tall
    // pieces run behind the placard. Measure the non-transparent sculpture
    // pixels rather than the square WebP canvas: the source art intentionally
    // contains optical padding and the visitor only perceives the silhouette.
    for (const [width, height] of [[320, 568], [360, 640], [390, 844]]) {
      const mobile = await newPage({
        viewport: { width, height },
        deviceScaleFactor: 2,
        hasTouch: true,
      });
      await freezeRegistryClock(mobile);
      await mockDexscreener(mobile);
      await mockRegistryBriefingSources(mobile);
      await withCollectionFlag(mobile);
      const mobileGalleryRequests = [];
      mobile.on('request', (request) => {
        if (new URL(request.url()).pathname === '/assets/gallery.js') {
          mobileGalleryRequests.push(request.url());
        }
      });
      await mobile.goto(baseURL + '/terminal/', { waitUntil: 'domcontentloaded' });
      const label = `${width}×${height}`;
      const mobileMasthead = await mobile.locator('.capital-masthead').evaluate((masthead) => {
        const title = masthead.querySelector('.capital-masthead__title');
        const heading = title?.querySelector('h1');
        const caption = title?.querySelector('p');
        const tape = masthead.querySelector(':scope > .market-tape');
        const pulse = masthead.querySelector(':scope > .capital-pulse');
        const opening = masthead.nextElementSibling;
        const nav = document.querySelector('.wnav-wrap');
        const headingRect = heading?.getBoundingClientRect();
        const navRect = nav?.getBoundingClientRect();
        const captionStyle = caption ? getComputedStyle(caption) : null;
        return {
          text: heading?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          visible: heading ? getComputedStyle(heading).visibility === 'visible' && headingRect.height > 0 : false,
          direct: heading?.parentElement === title,
          label: title?.querySelector(':scope > span')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          caption: caption?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          captionDisplay: captionStyle?.display ?? '',
          tapeDirect: tape?.parentElement === masthead,
          pulseDirect: pulse?.parentElement === masthead,
          openingImmediate: opening?.classList.contains('consumer-capital-opening') ?? false,
          left: headingRect?.left ?? -1,
          right: headingRect?.right ?? innerWidth + 1,
          top: headingRect?.top ?? -1,
          navBottom: navRect?.bottom ?? 0,
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
        };
      });
      check(
        `Zodiac Terminal at ${label} is visible below navigation without overflow`,
        mobileMasthead.text === 'Zodiac Terminal'
          && mobileMasthead.visible
          && mobileMasthead.direct
          && mobileMasthead.label === 'Verified by the Zodiacs Registry'
          && mobileMasthead.caption === 'Twelve signs. Twelve transferable tokens. One live public market.'
          && mobileMasthead.captionDisplay !== 'none'
          && mobileMasthead.tapeDirect
          && mobileMasthead.pulseDirect
          && mobileMasthead.openingImmediate
          && mobileMasthead.top >= mobileMasthead.navBottom - 1
          && mobileMasthead.left >= -1
          && mobileMasthead.right <= width + 1
          && mobileMasthead.pageWidth <= mobileMasthead.viewportWidth + 1,
        JSON.stringify(mobileMasthead),
      );
      const mobileStageLive = await mobile.evaluate(() => (
        document.documentElement.classList.contains('gallery-live')
      ));
      await mobile.locator('.market-tape__track').waitFor({ state: 'visible' });
      const readTapeMotion = () => mobile.locator('.market-tape').evaluate((tape) => {
        const track = tape.querySelector('.market-tape__track');
        const gallery = document.querySelector('#gallery');
        const style = track ? getComputedStyle(track) : null;
        const animations = track?.getAnimations() ?? [];
        return {
          beforeGallery: Boolean(gallery && (tape.compareDocumentPosition(gallery) & Node.DOCUMENT_POSITION_FOLLOWING)),
          groups: tape.querySelectorAll('.market-tape__group').length,
          items: tape.querySelectorAll('.market-tape__item').length,
          interactive: tape.querySelectorAll('button, a').length,
          viewportHidden: tape.querySelector('.market-tape__viewport')?.getAttribute('aria-hidden') === 'true',
          animationName: style?.animationName ?? '',
          animationPlayState: style?.animationPlayState ?? '',
          transform: style?.transform ?? '',
          currentTime: Number(animations[0]?.currentTime ?? 0),
        };
      });
      const tapeFrameA = await readTapeMotion();
      await mobile.waitForTimeout(260);
      const tapeFrameB = await readTapeMotion();
      check(
        `market tape at ${label} precedes the gallery and continuously advances`,
        tapeFrameA.beforeGallery
          && tapeFrameA.groups === 2
          && tapeFrameA.items === 24
          && tapeFrameA.interactive === 0
          && tapeFrameA.viewportHidden
          && tapeFrameA.animationName !== 'none'
          && tapeFrameA.animationPlayState === 'running'
          && tapeFrameB.animationPlayState === 'running'
          && tapeFrameB.currentTime > tapeFrameA.currentTime + 100
          && tapeFrameB.transform !== tapeFrameA.transform,
        JSON.stringify({ before: tapeFrameA, after: tapeFrameB }),
      );
      const mobileMarket = mobile.locator('#market');
      await mobileMarket.scrollIntoViewIfNeeded();
      await mobileMarket.locator('.market-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const compactRowCount = await mobileMarket.locator('.market-row').count();
      const compactExpand = mobileMarket.locator('.market-board__expand');
      check(
        `mobile market at ${label} starts with three leaders and an explicit expansion`,
        compactRowCount === 3
          && await compactExpand.getAttribute('aria-expanded') === 'false'
          && (await compactExpand.innerText()).includes('Show all 12'),
        `${compactRowCount}/${await compactExpand.innerText()}`,
      );
      await compactExpand.click();
      await mobile.waitForFunction(() => document.querySelectorAll('#market .market-row').length === 12);
      const compactMarketMaterial = await mobileMarket.evaluate((section) => {
        const measure = (node) => {
          const rect = node.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            left: rect.left,
            right: rect.right,
          };
        };
        return {
          sort: [...section.querySelectorAll('.market-board__sort button')].map(measure),
          share: [...section.querySelectorAll('.market-board__share button')].map(measure),
          social: [...section.querySelectorAll('.market-board__social')].map(measure),
          rowActions: [...section.querySelectorAll('.market-row__record')].map(measure),
          sculptureActions: section.querySelectorAll('.market-row__view').length,
          recordFills: [...section.querySelectorAll('.market-row__actions')].map((actions) => {
            const parent = actions.getBoundingClientRect();
            const record = actions.querySelector('.market-row__record')?.getBoundingClientRect();
            return record ? {
              parentWidth: parent.width,
              recordWidth: record.width,
              leftGap: record.left - parent.left,
              rightGap: parent.right - record.right,
            } : null;
          }),
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
        };
      });
      check(
        `expanded Registry market pills at ${label} keep every social and row action touchable without overflow`,
        compactMarketMaterial.sort.length === 3
          && compactMarketMaterial.share.length === 4
          && compactMarketMaterial.social.length === 3
          && compactMarketMaterial.sculptureActions === 0
          && compactMarketMaterial.rowActions.length === 12
          && compactMarketMaterial.recordFills.length === 12
          && compactMarketMaterial.recordFills.every((item) => (
            item
              && Math.abs(item.recordWidth - item.parentWidth) <= 0.75
              && Math.abs(item.leftGap) <= 0.75
              && Math.abs(item.rightGap) <= 0.75
          ))
          && [
            ...compactMarketMaterial.sort,
            ...compactMarketMaterial.share,
            ...compactMarketMaterial.rowActions,
          ].every(({ width: targetWidth, height: targetHeight, left, right }) => (
            targetWidth >= 43.5
              && targetHeight >= 43.5
              && left >= -1
              && right <= compactMarketMaterial.viewportWidth + 1
          ))
          && compactMarketMaterial.pageWidth <= compactMarketMaterial.viewportWidth + 1,
        JSON.stringify(compactMarketMaterial),
      );
      const mobileBriefing = mobile.locator('#briefing');
      await mobileBriefing.scrollIntoViewIfNeeded();
      await mobile.locator('#briefing[aria-busy="false"]').waitFor({ timeout: 15_000 });
      const compactBriefing = await mobileBriefing.evaluate((section) => {
        const box = (selector) => {
          const node = section.querySelector(selector);
          const rect = node?.getBoundingClientRect();
          return rect ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } : null;
        };
        const targets = [...section.querySelectorAll('.consumer-briefing__headline > a, .consumer-briefing__cta')]
          .map((target) => {
            const rect = target.getBoundingClientRect();
            return {
              text: target.textContent?.replace(/\s+/g, ' ').trim() ?? '',
              width: rect.width,
              height: rect.height,
              left: rect.left,
              right: rect.right,
            };
          });
        const sign = section.getAttribute('data-briefing-sign') ?? '';
        return {
          count: document.querySelectorAll('.consumer-briefing').length,
          heading: section.querySelector('h2')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          sign,
          aliasesInside: ['research', 'outlook'].every((id) => section.querySelector(`:scope > #${id}`)),
          labels: [...section.querySelectorAll('[data-briefing-market] dt')]
            .map((node) => node.textContent?.trim() ?? ''),
          values: [...section.querySelectorAll('[data-briefing-market] dd')]
            .map((node) => node.textContent?.trim() ?? ''),
          event: section.querySelector('[data-briefing-event] h3')?.textContent?.trim() ?? '',
          reading: section.querySelector('[data-briefing-reading] p')?.textContent?.trim() ?? '',
          next: section.querySelector('[data-briefing-next-event]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          headlineCount: section.querySelectorAll('.consumer-briefing__headline').length,
          liveHeadlineCount: section.querySelectorAll('[data-briefing-headline]').length,
          cta: section.querySelector('.consumer-briefing__cta')?.getAttribute('href') ?? '',
          targets,
          boxes: [
            box('.consumer-briefing__head'),
            box('.consumer-briefing__lead'),
            box('.consumer-briefing__market'),
            box('.consumer-briefing__next'),
            box('.consumer-briefing__news'),
            box('.consumer-briefing__foot'),
          ],
          oldUi: document.querySelectorAll([
            '.research-pulse', '.consumer-research', '.outlook-lab', '.outlook-wheel',
            '.outlook-score', '.consumer-research__filters',
          ].join(',')).length,
          details: section.querySelectorAll('details').length,
          tabs: section.querySelectorAll('[role="tab"], [role="tablist"]').length,
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
        };
      });
      const continuousBriefing = compactBriefing.boxes.every(Boolean)
        && compactBriefing.boxes.every((box, index, boxes) => (
          index === 0 || box.top >= boxes[index - 1].top
        ));
      check(
        `Today's market briefing at ${label} is one continuous selected-sign stack without overflow`,
        compactBriefing.count === 1
          && compactBriefing.heading === 'Today’s market briefing'
          && compactBriefing.aliasesInside
          && JSON.stringify(compactBriefing.labels) === JSON.stringify([
            'Price', '24H change', 'Liquidity', '24H volume',
          ])
          && compactBriefing.values.every((value) => !['…', '—'].includes(value))
          && Boolean(compactBriefing.event)
          && Boolean(compactBriefing.reading)
          && Boolean(compactBriefing.next)
          && compactBriefing.headlineCount === 2
          && compactBriefing.liveHeadlineCount === 2
          && compactBriefing.cta === `/terminal/research/?sign=${compactBriefing.sign}`
          && continuousBriefing
          && compactBriefing.oldUi === 0
          && compactBriefing.details === 0
          && compactBriefing.tabs === 0
          && compactBriefing.targets.length === 3
          && compactBriefing.targets.every((target) => (
            target.width >= 43.5
              && target.height >= 43.5
              && target.left >= -1
              && target.right <= compactBriefing.viewportWidth + 1
          ))
          && compactBriefing.pageWidth <= compactBriefing.viewportWidth + 1,
        JSON.stringify(compactBriefing),
      );
      await mobile.locator('#official-twelve').scrollIntoViewIfNeeded();

      // A capable phone keeps the same real turntable as desktop. Exercise
      // every rail control here: this catches both breakpoint regressions
      // that silently swap the scene for a flat render and scene/page state
      // drift after several selections.
      if (mobileStageLive) {
        const liveBand = mobile.locator('.gband--consumer[data-gallery-stage]');
        await liveBand.waitFor({ state: 'visible' });
        await liveBand.locator('.stage__canvas').waitFor({ state: 'visible', timeout: 30_000 });
        await liveBand.locator('button.rail__tick').first().waitFor({ state: 'visible', timeout: 30_000 });
        await mobile.waitForFunction(() => (
          document.querySelector('.gband--consumer')?.classList.contains('is-ready')
          && document.querySelectorAll('.gband--consumer button.rail__tick').length === 12
        ), null, { timeout: 30_000 });
        await mobile.waitForTimeout(400);

        const liveMobileState = await liveBand.evaluate((band) => {
          const rect = (selector) => {
            const node = band.querySelector(selector);
            if (!node) return null;
            const box = node.getBoundingClientRect();
            return {
              top: box.top,
              right: box.right,
              bottom: box.bottom,
              left: box.left,
              width: box.width,
              height: box.height,
            };
          };
          const ticks = [...band.querySelectorAll('button.rail__tick')];
          const tickTops = ticks.map((tick) => Math.round(tick.getBoundingClientRect().top));
          const canvas = rect('.stage__canvas');
          const placard = rect('.stage-placard');
          const plate = band.getBoundingClientRect();
          return {
            ready: band.classList.contains('is-ready'),
            stageCount: document.querySelectorAll('.gband--consumer[data-gallery-stage]').length,
            flatCount: document.querySelectorAll('.gband--flat').length,
            carouselSlides: document.querySelectorAll('.stage-carousel__slide').length,
            canvases: band.querySelectorAll('.stage__canvas').length,
            tickButtons: ticks.length,
            enabledTicks: ticks.filter((tick) => !tick.disabled).length,
            tickImages: band.querySelectorAll('button.rail__tick img').length,
            tickRows: new Set(tickTops).size,
            minTarget: Math.min(...ticks.map((tick) => {
              const box = tick.getBoundingClientRect();
              return Math.min(box.width, box.height);
            })),
            canvas,
            placard,
            plate: {
              top: plate.top,
              right: plate.right,
              bottom: plate.bottom,
              left: plate.left,
            },
            clearance: canvas && placard ? placard.top - canvas.bottom : -Infinity,
            pageWidth: document.documentElement.scrollWidth,
            viewportWidth: innerWidth,
            pageHeight: document.documentElement.scrollHeight,
          };
        });
        check(
          `WebGL phone at ${label} keeps one live scene and all twelve rail buttons`,
          liveMobileState.ready
            && liveMobileState.stageCount === 1
            && liveMobileState.flatCount === 0
            && liveMobileState.carouselSlides === 0
            && liveMobileState.canvases === 1
            && liveMobileState.tickButtons === 12
            && liveMobileState.enabledTicks === 12
            && liveMobileState.tickImages === 12
            && liveMobileState.tickRows === 1,
          JSON.stringify(liveMobileState),
        );
        check(
          `WebGL phone at ${label} fits the canvas above the placard without page overflow`,
          Boolean(liveMobileState.canvas && liveMobileState.placard)
            && liveMobileState.canvas.width > 0
            && liveMobileState.canvas.height >= 200
            && liveMobileState.clearance >= 0
            && liveMobileState.canvas.left >= liveMobileState.plate.left - 1
            && liveMobileState.canvas.right <= liveMobileState.plate.right + 1
            && liveMobileState.placard.left >= liveMobileState.plate.left - 1
            && liveMobileState.placard.right <= liveMobileState.plate.right + 1
            && liveMobileState.pageWidth <= liveMobileState.viewportWidth + 1
            && liveMobileState.pageHeight <= MAX_PHONE_REGISTRY_HEIGHT
            && liveMobileState.minTarget >= 44,
          JSON.stringify(liveMobileState),
        );

        await liveBand.evaluate((band) => {
          band.__zodiacsSelectionPaints = [];
          band.addEventListener('zodiacs:gallery-sign', (event) => {
            band.__zodiacsSelectionPaints.push({
              selected: event?.detail?.slug ?? '',
              rendered: event?.detail?.renderedSlug ?? '',
              renderedAttribute: band.dataset.galleryRenderedSign ?? '',
            });
          });
        });
        const liveSelections = [];
        for (const [index, slug] of expectedSigns.entries()) {
          const tick = liveBand.locator('button.rail__tick').nth(index);
          await tick.click();
          await mobile.waitForFunction(({ selected, selectedIndex }) => {
            const ticks = [...document.querySelectorAll('.gband--consumer button.rail__tick')];
            const preview = document.querySelector('.gband--consumer [data-consumer-preview]');
            return ticks[selectedIndex]?.getAttribute('aria-pressed') === 'true'
              && preview?.getAttribute('data-consumer-preview') === selected;
          }, { selected: slug, selectedIndex: index });
          liveSelections.push({
            slug,
            pressed: await tick.getAttribute('aria-pressed'),
            preview: await liveBand.locator('[data-consumer-preview]').getAttribute('data-consumer-preview'),
            rendered: await liveBand.getAttribute('data-gallery-rendered-sign'),
          });
        }
        const selectionPaints = await liveBand.evaluate((band) => band.__zodiacsSelectionPaints ?? []);
        check(
          `all twelve live rail choices at ${label} paint before publishing the selected sign`,
          liveSelections.every((item) => (
            item.pressed === 'true'
              && item.preview === item.slug
              && item.rendered === item.slug
          ))
            && selectionPaints.length === expectedSigns.length
            && selectionPaints.every((item) => item.selected === item.rendered),
          JSON.stringify({ liveSelections, selectionPaints }),
        );
        await mobile.waitForFunction(() => {
          const band = document.querySelector('.gband--consumer');
          return band?.dataset.galleryRenderedSign === 'pisces'
            && band.dataset.galleryResidentTextures === '1'
            && band.dataset.galleryTextureSigns === 'pisces';
        }, null, { timeout: 10_000 });
        await mobile.waitForTimeout(1000);
        const settledSelection = await liveBand.evaluate((band) => ({
          rendered: band.dataset.galleryRenderedSign ?? '',
          textures: band.dataset.galleryTextureSigns ?? '',
          resident: band.dataset.galleryResidentTextures ?? '',
          preview: band.querySelector('[data-consumer-preview]')?.getAttribute('data-consumer-preview') ?? '',
          pressed: [...band.querySelectorAll('.rail__tick')]
            .find((tick) => tick.getAttribute('aria-pressed') === 'true')
            ?.querySelector('img')?.getAttribute('src') ?? '',
          season: band.querySelector('[data-season-sign]')?.getAttribute('data-season-sign') ?? '',
        }));
        check(
          `rapid live choices at ${label} settle on one Pisces cast without a stale Leo rebound`,
          settledSelection.rendered === 'pisces'
            && settledSelection.textures === 'pisces'
            && settledSelection.resident === '1'
            && settledSelection.preview === 'pisces'
            && settledSelection.pressed === '/assets/zodiac-icons/48/pisces.webp'
            // The selected cast and the calendar season are separate facts.
            && settledSelection.season === 'leo',
          JSON.stringify(settledSelection),
        );
        if (width === 390) {
          // A room drag is intentionally fluid, unlike a labelled rail
          // choice. Its public selection must still wait for the cast that is
          // actually painted instead of letting the placard lead the canvas.
          const leoTick = liveBand.locator('button.rail__tick').nth(4);
          await leoTick.click();
          await mobile.waitForFunction(() => (
            document.querySelector('.gband--consumer')?.dataset.galleryRenderedSign === 'leo'
          ));
          await liveBand.evaluate((band) => { band.__zodiacsSelectionPaints = []; });
          const roomCanvas = liveBand.locator('.stage__canvas');
          const roomBox = await roomCanvas.boundingBox();
          const roomStart = {
            x: roomBox.x + (roomBox.width * 0.14),
            y: roomBox.y + (roomBox.height * 0.18),
          };
          await mobile.mouse.move(roomStart.x, roomStart.y);
          await mobile.mouse.down();
          await mobile.mouse.move(roomStart.x + (roomBox.width * 0.58), roomStart.y, { steps: 10 });
          await mobile.mouse.up();
          await mobile.waitForFunction(() => (
            (document.querySelector('.gband--consumer')?.__zodiacsSelectionPaints?.length ?? 0) > 0
          ));
          await mobile.waitForTimeout(1000);
          const roomBrowse = await liveBand.evaluate((band) => ({
            rendered: band.dataset.galleryRenderedSign ?? '',
            preview: band.querySelector('[data-consumer-preview]')?.getAttribute('data-consumer-preview') ?? '',
            selected: [...band.querySelectorAll('.rail__tick')]
              .findIndex((tick) => tick.getAttribute('aria-pressed') === 'true'),
            paints: band.__zodiacsSelectionPaints ?? [],
          }));
          check(
            'a fluid room browse publishes only sculptures that have reached the canvas',
            roomBrowse.paints.length > 0
              && roomBrowse.paints.every((item) => item.selected === item.rendered)
              && roomBrowse.rendered === roomBrowse.preview
              && roomBrowse.selected !== 4,
            JSON.stringify(roomBrowse),
          );
        }
        check(
          `WebGL phone at ${label} requests the scene bundle exactly once`,
          mobileGalleryRequests.length === 1,
          JSON.stringify(mobileGalleryRequests),
        );
        if (OUT && width === 390) {
          await mobile.screenshot({ path: OUT + '/registry-consumer-390.png', fullPage: false });
        }
        await mobile.close();
        continue;
      }

      // A phone whose pre-paint probe cannot create WebGL receives the
      // bounded one-image carousel. Keep the silhouette/placard collision
      // checks below as the explicit fallback contract.
      await mobile.locator('[data-consumer-sign]').first().waitFor({ state: 'visible' });
      const mobileState = await mobile.locator('[data-consumer-sign]').evaluateAll((controls) => {
        const tops = controls.map((control) => Math.round(control.getBoundingClientRect().top));
        const rows = [...new Set(tops)];
        return {
          count: controls.length,
          rowCounts: rows.map((top) => tops.filter((candidate) => candidate === top).length),
          minTarget: Math.min(...controls.map((control) => {
            const rect = control.getBoundingClientRect();
            return Math.min(rect.width, rect.height);
          })),
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          pageHeight: document.documentElement.scrollHeight,
        };
      });
      check(
        `mobile explorer at ${label} rails all twelve signs in one row`,
        mobileState.count === 12 && mobileState.rowCounts.length === 1,
        JSON.stringify(mobileState),
      );
      check(
        `mobile Registry at ${label} has no horizontal overflow and keeps 44px targets`,
        mobileState.pageWidth <= mobileState.viewportWidth + 1
          && mobileState.pageHeight <= MAX_PHONE_REGISTRY_HEIGHT
          && mobileState.minTarget >= 44,
        JSON.stringify(mobileState),
      );

      const sculptureGeometry = [];
      for (const slug of expectedSigns) {
        await mobile.locator(`[data-consumer-sign="${slug}"]`).click();
        await mobile.locator(`[data-consumer-preview="${slug}"]`).waitFor({ state: 'visible' });
        await mobile.waitForFunction((selected) => {
          const slide = document.querySelector('.stage-carousel__slide.is-active');
          const image = slide?.querySelector('.stage-carousel__art');
          return image?.getAttribute('src')?.endsWith(`/${selected}.webp`)
            && image.complete && image.naturalWidth > 0;
        }, slug);
        // Measure the resting sculpture, not a frame of its 240ms entrance.
        // The collision guarantee is about where the artwork comes to rest.
        await mobile.locator('.stage-carousel__slide.is-active .stage-carousel__art')
          .evaluate(async (image) => {
            await Promise.all(image.getAnimations().map((animation) => animation.finished.catch(() => {})));
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          });
        sculptureGeometry.push(await mobile.evaluate(async (selected) => {
          const rect = (selector) => {
            const node = document.querySelector(selector);
            if (!node) return null;
            const box = node.getBoundingClientRect();
            return {
              top: box.top,
              right: box.right,
              bottom: box.bottom,
              left: box.left,
              width: box.width,
              height: box.height,
            };
          };
          const artNode = document.querySelector('.stage-carousel__slide.is-active .stage-carousel__art');
          const art = rect('.stage-carousel__slide.is-active .stage-carousel__art');
          const carousel = rect('.stage-carousel');
          const placard = rect('.stage-placard');
          const plate = rect('.gband--flat');
          let visibleArt = null;
          if (artNode instanceof HTMLImageElement && artNode.naturalWidth > 0 && art) {
            const alphaCanvas = document.createElement('canvas');
            alphaCanvas.width = artNode.naturalWidth;
            alphaCanvas.height = artNode.naturalHeight;
            const context = alphaCanvas.getContext('2d', { willReadFrequently: true });
            context.drawImage(artNode, 0, 0);
            const pixels = context.getImageData(0, 0, alphaCanvas.width, alphaCanvas.height).data;
            let minX = alphaCanvas.width;
            let minY = alphaCanvas.height;
            let maxX = -1;
            let maxY = -1;
            for (let y = 0; y < alphaCanvas.height; y += 1) {
              for (let x = 0; x < alphaCanvas.width; x += 1) {
                if (pixels[((y * alphaCanvas.width) + x) * 4 + 3] > 8) {
                  minX = Math.min(minX, x);
                  minY = Math.min(minY, y);
                  maxX = Math.max(maxX, x);
                  maxY = Math.max(maxY, y);
                }
              }
            }
            if (maxX >= minX && maxY >= minY) {
              visibleArt = {
                top: art.top + ((minY / alphaCanvas.height) * art.height),
                right: art.left + (((maxX + 1) / alphaCanvas.width) * art.width),
                bottom: art.top + (((maxY + 1) / alphaCanvas.height) * art.height),
                left: art.left + ((minX / alphaCanvas.width) * art.width),
              };
            }
          }
          const pressed = document.querySelector('[data-consumer-sign][aria-pressed="true"]')
            ?.getAttribute('data-consumer-sign');
          const preview = document.querySelector('[data-consumer-preview]')
            ?.getAttribute('data-consumer-preview');
          const asset = document.querySelector('.stage-carousel__slide.is-active .stage-carousel__art')
            ?.getAttribute('src') ?? '';
          return {
            slug: selected,
            art,
            visibleArt,
            carousel,
            placard,
            plate,
            pressed,
            preview,
            asset,
            activeSlides: document.querySelectorAll('.stage-carousel__slide.is-active').length,
            clearance: visibleArt && placard ? placard.top - visibleArt.bottom : -Infinity,
            pageWidth: document.documentElement.scrollWidth,
            viewportWidth: innerWidth,
          };
        }, slug));
      }
      const brokenSculptures = sculptureGeometry.filter((item) => (
        !item.art || !item.visibleArt || !item.carousel || !item.placard || !item.plate
        || item.activeSlides !== 1
        || item.pressed !== item.slug
        || item.preview !== item.slug
        || !item.asset.endsWith(`/${item.slug}.webp`)
        || item.clearance < 15
        || item.visibleArt.top < item.carousel.top - 1
        || item.visibleArt.left < item.plate.left - 1
        || item.visibleArt.right > item.plate.right + 1
        || item.placard.left < item.plate.left - 1
        || item.placard.right > item.plate.right + 1
        || item.pageWidth > item.viewportWidth + 1
      ));
      check(
        `all twelve sculptures at ${label} stay synchronized and clear the placard by 16px`,
        brokenSculptures.length === 0,
        JSON.stringify(brokenSculptures),
      );
      await mobile.evaluate(() => new Promise((resolve) => setTimeout(resolve, 400)));
      check(
        `non-WebGL phones at ${label} never request the scene bundle`,
        mobileGalleryRequests.length === 0,
        JSON.stringify(mobileGalleryRequests),
      );
      if (OUT && width === 390) {
        await mobile.screenshot({ path: OUT + '/registry-consumer-390.png', fullPage: false });
      }
      await mobile.close();
    }

    // The capable-WebGL stage is now width-independent. Exercise the complete
    // mobile → desktop → mobile → desktop cycle and prove that viewport
    // changes preserve the same canvas, selection, and single bundle load.
    const responsiveStage = await newPage({ viewport: { width: 390, height: 844 } });
    await mockDexscreener(responsiveStage);
    const responsiveStageRequests = [];
    const responsiveStageErrors = [];
    responsiveStage.on('request', (request) => {
      if (new URL(request.url()).pathname === '/assets/gallery.js') responsiveStageRequests.push(request.url());
    });
    responsiveStage.on('pageerror', (error) => responsiveStageErrors.push(String(error)));
    await responsiveStage.goto(baseURL + '/terminal/', { waitUntil: 'domcontentloaded' });
    const responsiveStageLive = await responsiveStage.evaluate(() => (
      document.documentElement.classList.contains('gallery-live')
    ));
    if (responsiveStageLive) {
      const liveBand = responsiveStage.locator('.gband--consumer[data-gallery-stage]');
      await liveBand.waitFor({ state: 'visible' });
      await liveBand.locator('.stage__canvas').waitFor({ state: 'visible', timeout: 30_000 });
      await liveBand.locator('button.rail__tick').first().waitFor({ state: 'visible', timeout: 30_000 });
      await responsiveStage.waitForFunction(() => (
        document.querySelector('.gband--consumer')?.classList.contains('is-ready')
        && document.querySelectorAll('.gband--consumer button.rail__tick').length === 12
      ), null, { timeout: 30_000 });
      await responsiveStage.evaluate(() => {
        window.__registryResponsiveCanvas = document.querySelector('.gband--consumer .stage__canvas');
      });

      const readResponsiveShape = () => liveBand.evaluate((band) => {
        const canvas = band.querySelector('.stage__canvas');
        const box = canvas?.getBoundingClientRect();
        const tickButtons = [...band.querySelectorAll('button.rail__tick')];
        return {
          ready: band.classList.contains('is-ready'),
          sameCanvas: window.__registryResponsiveCanvas === canvas,
          stages: document.querySelectorAll('.gband--consumer[data-gallery-stage]').length,
          flats: document.querySelectorAll('.gband--flat').length,
          carousels: document.querySelectorAll('.stage-carousel__slide').length,
          canvases: band.querySelectorAll('.stage__canvas').length,
          tickButtons: tickButtons.length,
          enabledTicks: tickButtons.filter((tick) => !tick.disabled).length,
          tickImages: band.querySelectorAll('button.rail__tick img').length,
          placeholders: band.querySelectorAll('.rail__tick--placeholder').length,
          canvasWidth: box?.width ?? 0,
          canvasHeight: box?.height ?? 0,
          selectedIndex: tickButtons.findIndex((tick) => tick.getAttribute('aria-pressed') === 'true'),
          preview: band.querySelector('[data-consumer-preview]')
            ?.getAttribute('data-consumer-preview') ?? '',
        };
      });
      const initialMobileShape = await readResponsiveShape();
      check(
        'responsive WebGL gallery opens on mobile as one usable live stage',
        initialMobileShape.ready && initialMobileShape.sameCanvas
          && initialMobileShape.stages === 1 && initialMobileShape.flats === 0
          && initialMobileShape.carousels === 0 && initialMobileShape.canvases === 1
          && initialMobileShape.tickButtons === 12 && initialMobileShape.enabledTicks === 12
          && initialMobileShape.tickImages === 12 && initialMobileShape.placeholders === 0
          && initialMobileShape.canvasWidth > 0 && initialMobileShape.canvasHeight >= 200,
        JSON.stringify(initialMobileShape),
      );

      const cycleSelections = [
        { slug: 'gemini', name: 'Gemini', index: 2 },
        { slug: 'scorpio', name: 'Scorpio', index: 7 },
      ];
      for (let cycle = 1; cycle <= 2; cycle += 1) {
        const selection = cycleSelections[cycle - 1];
        const liveTick = liveBand.locator('button.rail__tick').nth(selection.index);
        await liveTick.click();
        await responsiveStage.waitForFunction(({ slug, index }) => {
          const band = document.querySelector('.gband--consumer');
          const ticks = [...(band?.querySelectorAll('button.rail__tick') || [])];
          return ticks[index]?.getAttribute('aria-pressed') === 'true'
            && band?.querySelector('[data-consumer-preview]')
              ?.getAttribute('data-consumer-preview') === slug;
        }, { slug: selection.slug, index: selection.index });
        const mobileSelectionShape = await readResponsiveShape();
        check(
          `responsive gallery cycle ${cycle} selects ${selection.name} on mobile`,
          mobileSelectionShape.sameCanvas
            && mobileSelectionShape.selectedIndex === selection.index
            && mobileSelectionShape.preview === selection.slug,
          JSON.stringify(mobileSelectionShape),
        );

        await responsiveStage.setViewportSize({ width: 1280, height: 900 });
        await responsiveStage.waitForFunction(() => innerWidth === 1280);
        await responsiveStage.waitForTimeout(120);
        const desktopShape = await readResponsiveShape();
        check(
          `responsive gallery cycle ${cycle} keeps the same selected live stage on desktop`,
          desktopShape.ready && desktopShape.sameCanvas
            && desktopShape.stages === 1 && desktopShape.flats === 0
            && desktopShape.carousels === 0 && desktopShape.canvases === 1
            && desktopShape.tickButtons === 12 && desktopShape.enabledTicks === 12
            && desktopShape.selectedIndex === selection.index
            && desktopShape.preview === selection.slug
            && desktopShape.canvasWidth > 0
            && desktopShape.canvasHeight >= MIN_DESKTOP_STAGE_HEIGHT
            && await liveBand.getAttribute('data-gallery-paused') === null,
          JSON.stringify(desktopShape),
        );

        await responsiveStage.setViewportSize({ width: 390, height: 844 });
        await responsiveStage.waitForFunction(() => innerWidth === 390);
        await responsiveStage.waitForTimeout(120);
        const returnedMobileShape = await readResponsiveShape();
        check(
          `responsive gallery cycle ${cycle} retains ${selection.name} when it returns to mobile`,
          returnedMobileShape.ready && returnedMobileShape.sameCanvas
            && returnedMobileShape.stages === 1 && returnedMobileShape.flats === 0
            && returnedMobileShape.carousels === 0 && returnedMobileShape.canvases === 1
            && returnedMobileShape.tickButtons === 12
            && returnedMobileShape.selectedIndex === selection.index
            && returnedMobileShape.preview === selection.slug
            && returnedMobileShape.canvasWidth > 0 && returnedMobileShape.canvasHeight >= 200,
          JSON.stringify(returnedMobileShape),
        );
      }
      await responsiveStage.waitForTimeout(400);
      check(
        'responsive gallery loads its scene bundle once across viewport changes',
        responsiveStageRequests.length === 1,
        JSON.stringify(responsiveStageRequests),
      );
    } else {
      await responsiveStage.locator('.gband--flat').waitFor({ state: 'visible' });
      await responsiveStage.locator('[data-consumer-sign="scorpio"]').click();
      await responsiveStage.locator('[data-consumer-preview="scorpio"]').waitFor({ state: 'visible' });
      await responsiveStage.setViewportSize({ width: 1280, height: 900 });
      await responsiveStage.locator('.gband--flat').waitFor({ state: 'visible' });
      check(
        'non-WebGL responsive fallback remains a complete selected carousel',
        await responsiveStage.locator('.stage-carousel__slide').count() === 1
          && await responsiveStage.locator('[data-consumer-sign]').count() === 12
          && await responsiveStage.locator('[data-consumer-sign="scorpio"]').getAttribute('aria-pressed') === 'true'
          && await responsiveStage.locator('[data-consumer-preview="scorpio"]').count() === 1
          && await responsiveStage.locator('[data-gallery-stage]').count() === 0
          && responsiveStageRequests.length === 0,
        JSON.stringify(responsiveStageRequests),
      );
    }
    check(
      'responsive gallery mode changes are runtime-error free',
      responsiveStageErrors.length === 0,
      responsiveStageErrors.join(' | '),
    );
    await responsiveStage.close();

    const reduced = await newPage({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    });
    await stubNoWebgl(reduced);
    await mockDexscreener(reduced);
    await reduced.goto(baseURL + '/terminal/', { waitUntil: 'domcontentloaded' });
    await reduced.locator('[data-consumer-sign]').first().waitFor({ state: 'visible' });
    check(
      'reduced motion leaves no film attached to the rendered page',
      await reduced.locator('.cine__media').count() === 0,
    );
    await reduced.locator('[data-consumer-sign="libra"]').click();
    await reduced.waitForFunction(() => {
      const image = document.querySelector('.stage-carousel__slide.is-active .stage-carousel__art');
      return image?.complete && image.naturalWidth > 0;
    });
    const reducedDurations = await reduced.locator('.stage-carousel__slide.is-active .stage-carousel__figure')
      .evaluate((figure) => {
        const style = getComputedStyle(figure);
        return {
          animation: parseFloat(style.animationDuration) || 0,
          transition: parseFloat(style.transitionDuration) || 0,
        };
      });
    check(
      'reduced motion turns the carousel without animated travel',
      reducedDurations.animation <= 0.02 && reducedDurations.transition <= 0.02,
      JSON.stringify(reducedDurations),
    );
    const reducedFit = await reduced.locator('.stage-carousel__slide.is-active .stage-carousel__art')
      .evaluate((image) => {
        const art = image.getBoundingClientRect();
        const placard = document.querySelector('.stage-placard')?.getBoundingClientRect();
        const alphaCanvas = document.createElement('canvas');
        alphaCanvas.width = image.naturalWidth;
        alphaCanvas.height = image.naturalHeight;
        const context = alphaCanvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, alphaCanvas.width, alphaCanvas.height).data;
        let maxY = -1;
        for (let y = 0; y < alphaCanvas.height; y += 1) {
          for (let x = 0; x < alphaCanvas.width; x += 1) {
            if (pixels[((y * alphaCanvas.width) + x) * 4 + 3] > 8) maxY = y;
          }
        }
        const visibleBottom = maxY < 0
          ? Infinity
          : art.top + (((maxY + 1) / alphaCanvas.height) * art.height);
        return {
          transform: getComputedStyle(image).transform,
          clearance: placard ? placard.top - visibleBottom : -Infinity,
        };
      });
    check(
      'reduced motion preserves optical fitting and mobile placard clearance',
      reducedFit.transform !== 'none' && reducedFit.clearance >= 15,
      JSON.stringify(reducedFit),
    );
    await reduced.close();

    // The stage scenario runs unstubbed: where the runner offers WebGL the
    // sculpture stage IS the explorer; otherwise the pastel grid serves and
    // the scene bundle never loads. Both outcomes are asserted.
    const stagePage = await newPage({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'no-preference',
    });
    await mockDexscreener(stagePage);
    const stageRequests = [];
    const stageSculptureRequests = [];
    stagePage.on('request', (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname === '/assets/gallery.js') stageRequests.push(request.url());
      if (pathname.startsWith('/assets/sculptures/')) stageSculptureRequests.push(pathname);
    });
    await stagePage.goto(baseURL + '/terminal/', { waitUntil: 'domcontentloaded' });
    await stagePage.locator('.consumer-explorer').waitFor({ state: 'visible' });
    const stageLive = await stagePage.evaluate(() => document.documentElement.classList.contains('gallery-live'));
    if (stageLive) {
      await stagePage.locator('.gband--consumer').waitFor({ state: 'attached' });
      check(
        'the sculpture stage is the wide-screen explorer and retires the grid',
        await stagePage.locator('[data-consumer-sign]').count() === 0,
      );
      await stagePage.locator('.gband.is-ready').waitFor({ state: 'attached', timeout: 30_000 });
      check(
        'the live stage swaps its placeholder rail for twelve live ticks',
        await stagePage.locator('.gband .rail__tick').count() === 12
          && await stagePage.locator('.gband .rail__tick img').count() === 12
          && await stagePage.locator('.rail__tick--placeholder').count() === 0,
      );
      check(
        'the default-open stage requests its bundle exactly once',
        stageRequests.length === 1,
        JSON.stringify(stageRequests),
      );
      await stagePage.waitForFunction(() => (
        performance.getEntriesByType('resource')
          .some((entry) => new URL(entry.name).pathname === '/assets/sculptures/1024/leo.webp')
      ), null, { timeout: 30_000 });
      const initialSculptureSlugs = [...new Set(stageSculptureRequests.map((pathname) => (
        pathname.split('/').pop()?.replace(/\.webp$/, '')
      )))];
      check(
        'the opening WebGL stage requests only its selected sculpture plate',
        initialSculptureSlugs.length === 1 && initialSculptureSlugs[0] === 'leo',
        JSON.stringify(stageSculptureRequests),
      );
      check(
        'the rail exposes one pressed tick for the current sign',
        await stagePage.locator('.rail__tick[aria-pressed="true"]').count() === 1,
      );
      // One opening scene: the ticker leads, the compact season sculpture and
      // rail sit above the chosen piece, and the overall sculpture room keeps
      // its frame after the nested title/season cards disappear.
      const shape = await stagePage.evaluate(() => {
        const box = (sel) => {
          const el = document.querySelector(sel);
          return el ? el.getBoundingClientRect() : null;
        };
        const tape = box('.market-tape');
        const plate = box('.gband--consumer');
        const season = box('.gband--consumer .season-now');
        const rail = box('.gband--consumer [data-gallery-rail]');
        const canvas = box('.gband--consumer [data-gallery-canvas]');
        const placard = box('.stage-placard');
        return {
          filmHero: document.querySelectorAll('.cine').length,
          oldHero: document.querySelectorAll('.stage-hero__head, .stage-hero__title, .stage-hero__eyebrow, .stage-hero__line').length,
          tapeBeforePlate: Boolean(tape && plate && tape.bottom <= plate.top + 1),
          seasonAboveRail: Boolean(season && rail && season.bottom <= rail.top + 1),
          railAboveCanvas: Boolean(rail && canvas && rail.bottom <= canvas.top + 1),
          canvasAbovePlacard: Boolean(placard && canvas
            && canvas.bottom <= placard.top + 1),
          plateStyle: plate ? (() => {
            const style = getComputedStyle(document.querySelector('.gband--consumer'));
            return {
              border: style.borderTopWidth,
              radius: style.borderTopLeftRadius,
              backgroundColor: style.backgroundColor,
              backgroundImage: style.backgroundImage,
            };
          })() : null,
          seasonDirect: document.querySelector('.gband--consumer > .season-now') !== null,
          // The rail must not wear .gband__chrome: the scene reads that
          // element's offsetTop as the floor of the band it may paint into.
          chrome: document.querySelectorAll('.gband--consumer .gband__chrome').length,
          previewInside: document.querySelectorAll('.gband--consumer [data-consumer-preview]').length,
          previewTotal: document.querySelectorAll('[data-consumer-preview]').length,
          flatArt: document.querySelectorAll('.consumer-preview__art').length,
          figureHeight: canvas ? Math.round(canvas.height) : 0,
        };
      });
      check(
        'the framed sculpture room runs ticker, season, rail, sculpture, placard without a nested hero',
        shape.filmHero === 0 && shape.oldHero === 0
          && shape.tapeBeforePlate && shape.seasonAboveRail
          && shape.railAboveCanvas && shape.canvasAbovePlacard
          && shape.plateStyle?.border === '1px'
          && parseFloat(shape.plateStyle?.radius ?? '0') >= 20
          && shape.plateStyle?.backgroundColor !== 'rgba(0, 0, 0, 0)'
          && shape.plateStyle?.backgroundImage !== 'none'
          && shape.seasonDirect
          && shape.chrome === 0
          && shape.previewInside === 1 && shape.previewTotal === 1
          && shape.flatArt === 0
          && shape.figureHeight >= MIN_DESKTOP_STAGE_HEIGHT,
        JSON.stringify(shape),
      );

      // Centre it first. The rail rides the top of the rectangle and the
      // site's nav floats over the top of the page, so scrolling the tick
      // just barely into view would slide it under the pill.
      const geminiTick = stagePage.locator('.rail__tick').nth(2);
      await geminiTick.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await stagePage.locator('.gband--consumer').evaluate((band) => {
        band.__zodiacsSelectionPaints = [];
        band.addEventListener('zodiacs:gallery-sign', (event) => {
          band.__zodiacsSelectionPaints.push({
            selected: event?.detail?.slug ?? '',
            rendered: event?.detail?.renderedSlug ?? '',
            renderedAttribute: band.dataset.galleryRenderedSign ?? '',
          });
        });
      });
      await geminiTick.click();
      await stagePage.locator('[data-consumer-preview="gemini"]').waitFor({ timeout: 10_000 });
      await stagePage.waitForFunction(() => (
        performance.getEntriesByType('resource')
          .some((entry) => new URL(entry.name).pathname === '/assets/sculptures/1024/gemini.webp')
      ), null, { timeout: 30_000 });
      const geminiPlacard = await stagePage.locator('[data-consumer-preview="gemini"]').evaluate((placard) => ({
        name: placard.querySelector('.stage-placard__name')?.textContent,
        trade: placard.querySelector('a.btn--primary, button.btn--primary') !== null,
        tradeHref: placard.querySelector('a.btn--primary')?.getAttribute('href') ?? null,
        record: placard.querySelector('a.btn--ghost')?.getAttribute('href'),
      }));
      check(
        'walking the rail drives the placard',
        geminiPlacard.name === 'Gemini'
          && geminiPlacard.trade
          // Flag-off the trade pill is the door to the catalogue page's panel.
          && (geminiPlacard.tradeHref === null || geminiPlacard.tradeHref === '/registry/gemini/#acquire')
          && geminiPlacard.record === '/registry/gemini/',
        JSON.stringify(geminiPlacard),
      );
      const geminiPresentation = await stagePage.locator('.gband--consumer').evaluate((band) => ({
        rendered: band.dataset.galleryRenderedSign ?? '',
        paints: band.__zodiacsSelectionPaints ?? [],
      }));
      check(
        'the wide-screen scene paints Gemini before publishing the Gemini selection',
        geminiPresentation.rendered === 'gemini'
          && geminiPresentation.paints.some((item) => (
            item.selected === 'gemini' && item.rendered === 'gemini'
          )),
        JSON.stringify(geminiPresentation),
      );
      const requestedGeminiPaths = stageSculptureRequests.filter((pathname) => pathname.endsWith('/gemini.webp'));
      check(
        'a new selection requests its high-resolution plate without the twelve-image row batch',
        requestedGeminiPaths.includes('/assets/sculptures/1024/gemini.webp')
          && !requestedGeminiPaths.includes('/assets/sculptures/512/gemini.webp')
          && !stageSculptureRequests.some((pathname) => (
            pathname.includes('/512/') && !pathname.endsWith('/leo.webp')
          )),
        JSON.stringify(stageSculptureRequests),
      );
      await stagePage.waitForFunction(() => {
        const band = document.querySelector('.gband--consumer');
        return band?.dataset.galleryResidentTextures === '1'
          && band.dataset.galleryTextureSigns === 'gemini';
      }, null, { timeout: 3_000 });
      const settledGeminiTexture = await stagePage.locator('.gband--consumer').evaluate((band) => ({
        resident: band.dataset.galleryResidentTextures ?? '',
        signs: band.dataset.galleryTextureSigns ?? '',
      }));
      check(
        'the spotlight releases the previous decoded plate after handoff',
        settledGeminiTexture.resident === '1' && settledGeminiTexture.signs === 'gemini',
        JSON.stringify(settledGeminiTexture),
      );

      const liveStage = stagePage.locator('.gband--consumer');
      const liveCanvas = liveStage.locator('.stage__canvas');
      await stagePage.waitForFunction(() => (
        document.querySelector('.gband--consumer')?.dataset.galleryRotation === 'ambient'
      ));
      await stagePage.waitForTimeout(900);
      const ambientFrameA = await liveCanvas.screenshot();
      await stagePage.waitForTimeout(500);
      const ambientFrameB = await liveCanvas.screenshot();
      const turnHint = (await liveStage.locator('[data-gallery-turn-hint]').innerText())
        .replace(/\s+/g, ' ').trim();
      check(
        'the Registry spotlight begins one quiet inspection sweep',
        !ambientFrameA.equals(ambientFrameB)
          && turnHint.toLowerCase().includes('drag the figure to turn')
          && turnHint.toLowerCase().includes('drag the room to browse'),
        JSON.stringify({ framesEqual: ambientFrameA.equals(ambientFrameB), turnHint }),
      );
      await stagePage.waitForFunction(() => (
        document.querySelector('.gband--consumer')?.dataset.galleryRotation === 'rest'
      ), null, { timeout: 7_000 });
      const restingFrameA = await liveCanvas.screenshot();
      await stagePage.waitForTimeout(500);
      const restingFrameB = await liveCanvas.screenshot();
      check(
        'the inspection sweep returns face-first and releases the render loop',
        restingFrameA.equals(restingFrameB),
      );

      // Find the cast rather than assuming its silhouette fills the centre:
      // Gemini has a deliberate gap between the twins. Hover picking exposes
      // the same proxy the real drag uses.
      const canvasBox = await liveCanvas.boundingBox();
      let sculpturePoint = null;
      for (const xShare of [0.5, 0.44, 0.56, 0.38, 0.62]) {
        for (const yShare of [0.48, 0.58, 0.38, 0.68]) {
          const point = {
            x: canvasBox.x + (canvasBox.width * xShare),
            y: canvasBox.y + (canvasBox.height * yShare),
          };
          await stagePage.mouse.move(point.x, point.y);
          await stagePage.waitForTimeout(20);
          if (await liveCanvas.evaluate((canvas) => canvas.style.cursor === 'pointer')) {
            sculpturePoint = point;
            break;
          }
        }
        if (sculpturePoint) break;
      }
      check('the spotlight cast exposes a direct-manipulation hit area', Boolean(sculpturePoint));
      if (sculpturePoint) {
        const dragX = sculpturePoint.x > canvasBox.x + (canvasBox.width * 0.65) ? -120 : 120;
        await stagePage.mouse.move(sculpturePoint.x, sculpturePoint.y);
        await stagePage.mouse.down();
        await stagePage.mouse.move(sculpturePoint.x + dragX, sculpturePoint.y - 18, { steps: 5 });
        await stagePage.mouse.up();
        await stagePage.waitForFunction(() => (
          document.querySelector('.gband--consumer')?.dataset.galleryRotation === 'held'
        ));
        await stagePage.waitForTimeout(800);
        const heldFrameA = await liveCanvas.screenshot();
        await stagePage.waitForTimeout(500);
        const heldFrameB = await liveCanvas.screenshot();
        const heldState = await liveStage.evaluate((band) => ({
          rotation: band.dataset.galleryRotation,
          pressed: band.querySelector('.rail__tick[aria-pressed="true"]')?.dataset.index,
          preview: band.querySelector('[data-consumer-preview]')?.dataset.consumerPreview,
          open: band.classList.contains('is-open'),
          card: band.querySelectorAll('[data-gallery-card]:not([hidden])').length,
        }));
        check(
          'dragging turns the sculpture without changing its sign or opening a card',
          heldState.rotation === 'held'
            && heldState.pressed === '2'
            && heldState.preview === 'gemini'
            && !heldState.open
            && heldState.card === 0
            && heldFrameA.equals(heldFrameB),
          JSON.stringify({ ...heldState, framesEqual: heldFrameA.equals(heldFrameB) }),
        );
        // A no-move press during the inspection pause interrupts the timer,
        // then must re-arm it instead of leaving the cast held forever.
        await stagePage.mouse.move(sculpturePoint.x, sculpturePoint.y);
        await stagePage.mouse.down();
        await stagePage.waitForTimeout(80);
        await stagePage.mouse.up();
        check(
          'a held sculpture survives a tap and still schedules its quiet return',
          await liveStage.getAttribute('data-gallery-rotation') === 'held',
        );
        await stagePage.waitForFunction(() => (
          document.querySelector('.gband--consumer')?.dataset.galleryRotation === 'ambient'
        ), null, { timeout: 4_000 });
        const resumedFrameA = await liveCanvas.screenshot();
        await stagePage.waitForTimeout(500);
        const resumedFrameB = await liveCanvas.screenshot();
        check(
          'a fresh bounded inspection sweep resumes after the inspection pause',
          !resumedFrameA.equals(resumedFrameB),
        );
      }

      // Tapping a sculpture on the stage chooses it. There is nothing to
      // draw out to — the placard is already at its feet — so the card must
      // stay shut however the canvas is used.
      await stagePage.waitForFunction(() => (
        document.querySelector('.gband--consumer')?.dataset.galleryRotation === 'rest'
      ), null, { timeout: 7_000 });
      const mountBox = await stagePage.locator('.gband--consumer [data-gallery-canvas]').boundingBox();
      await stagePage.mouse.move(mountBox.x + (mountBox.width / 2), mountBox.y + (mountBox.height / 2));
      await stagePage.mouse.down();
      await stagePage.waitForTimeout(80);
      await stagePage.mouse.up();
      await stagePage.evaluate(() => new Promise((resolve) => setTimeout(resolve, 700)));
      check(
        'the stage never draws a sculpture out over its own placard',
        await stagePage.locator('.gband.is-open').count() === 0
          && await stagePage.locator('[data-gallery-card]:not([hidden])').count() === 0,
      );
      const tappedFrameA = await liveCanvas.screenshot();
      await stagePage.waitForTimeout(500);
      const tappedFrameB = await liveCanvas.screenshot();
      check(
        'a tap leaves the completed inspection pose at rest',
        tappedFrameA.equals(tappedFrameB)
          && await liveStage.getAttribute('data-gallery-rotation') === 'rest',
      );

      const stageText = await stagePage.locator('.consumer-explorer').innerText();
      check(
        'the stage drops the second chain and the guide detour',
        !stageText.includes('Also recorded on Base') && !/astrology guide/i.test(stageText),
      );
    } else {
      check(
        'without WebGL the pastel grid serves as the explorer',
        await stagePage.locator('[data-consumer-sign]').count() === 12
          && await stagePage.locator('.gband').count() === 0,
      );
      await stagePage.evaluate(() => new Promise((resolve) => setTimeout(resolve, 400)));
      check(
        'without WebGL the scene bundle is never requested',
        stageRequests.length === 0,
        JSON.stringify(stageRequests),
      );
    }
    await stagePage.close();

    const reducedStage = await newPage({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'reduce',
    });
    let bitmapReferenceFrame = null;
    await mockDexscreener(reducedStage);
    await reducedStage.goto(baseURL + '/terminal/', { waitUntil: 'domcontentloaded' });
    const reducedStageLive = await reducedStage.evaluate(() => (
      document.documentElement.classList.contains('gallery-live')
    ));
    if (reducedStageLive) {
      const band = reducedStage.locator('.gband--consumer');
      const canvas = band.locator('.stage__canvas');
      await canvas.waitFor({ state: 'visible', timeout: 30_000 });
      await reducedStage.waitForFunction(() => (
        document.querySelector('.gband--consumer')?.dataset.galleryRotation === 'manual'
      ));
      await reducedStage.waitForFunction(() => (
        document.querySelector('.gband--consumer')?.dataset.galleryResidentTextures === '1'
      ), null, { timeout: 30_000 });
      const quiet = await waitForSettledCanvas(reducedStage, canvas);
      check(
        'reduced motion keeps the WebGL spotlight still until the reader moves it',
        quiet.settled
          && await band.getAttribute('data-gallery-rotation') === 'manual',
        JSON.stringify({ settled: quiet.settled, attempts: quiet.attempts }),
      );
      bitmapReferenceFrame = quiet.frame;
    }
    await reducedStage.close();

    // ImageBitmap bypasses THREE.Texture.flipY. Its decode options must
    // produce the exact same upright plate as the HTMLImage fallback, or the
    // fast path silently turns every sculpture upside down.
    if (bitmapReferenceFrame) {
      const imageFallbackStage = await newPage({
        viewport: { width: 1280, height: 900 },
        reducedMotion: 'reduce',
      });
      await imageFallbackStage.addInitScript(() => {
        try { delete globalThis.createImageBitmap; } catch {}
      });
      await mockDexscreener(imageFallbackStage);
      await imageFallbackStage.goto(baseURL + '/terminal/', { waitUntil: 'domcontentloaded' });
      const fallbackBand = imageFallbackStage.locator('.gband--consumer');
      const fallbackCanvas = fallbackBand.locator('.stage__canvas');
      await fallbackCanvas.waitFor({ state: 'visible', timeout: 30_000 });
      await imageFallbackStage.waitForFunction(() => (
        document.querySelector('.gband--consumer')?.dataset.galleryRotation === 'manual'
          && document.querySelector('.gband--consumer')?.dataset.galleryResidentTextures === '1'
      ));
      const fallback = await waitForSettledCanvas(imageFallbackStage, fallbackCanvas);
      check(
        'ImageBitmap and HTMLImage decode the sculpture with identical upright orientation',
        await imageFallbackStage.evaluate(() => typeof globalThis.createImageBitmap === 'undefined')
          && fallback.settled
          && bitmapReferenceFrame.equals(fallback.frame),
        JSON.stringify({ settled: fallback.settled, attempts: fallback.attempts }),
      );
      await imageFallbackStage.close();
    }

    const saverStage = await newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    await saverStage.addInitScript(() => {
      const constrained = { saveData: true, effectiveType: '4g' };
      for (const key of ['connection', 'mozConnection', 'webkitConnection']) {
        try {
          Object.defineProperty(navigator, key, {
            configurable: true,
            get: () => constrained,
          });
        } catch {}
      }
    });
    await mockDexscreener(saverStage);
    await mockRegistryBriefingSources(saverStage);
    const saverRequests = [];
    saverStage.on('request', (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname === '/assets/gallery.js' || pathname.startsWith('/assets/sculptures/')) {
        saverRequests.push(pathname);
      }
    });
    await saverStage.goto(baseURL + '/terminal/', { waitUntil: 'domcontentloaded' });
    await saverStage.locator('.consumer-explorer').waitFor({ state: 'visible' });
    await saverStage.waitForTimeout(700);
    const saverState = await saverStage.evaluate(() => ({
      live: document.documentElement.classList.contains('gallery-live'),
      canvas: document.querySelectorAll('.gband .stage__canvas').length,
      carousel: document.querySelectorAll('[data-gallery-carousel]').length,
    }));
    const saverSculptureSlugs = [...new Set(saverRequests
      .filter((pathname) => pathname.startsWith('/assets/sculptures/'))
      .map((pathname) => pathname.split('/').pop()?.replace(/\.webp$/, '')))];
    check(
      'Data Saver keeps the poster path and never requests WebGL or neighboring sculptures',
      !saverState.live && saverState.canvas === 0 && saverState.carousel === 1
        && !saverRequests.includes('/assets/gallery.js')
        && saverSculptureSlugs.length === 1 && saverSculptureSlugs[0] === 'leo',
      JSON.stringify({ saverState, saverRequests }),
    );
    await saverStage.close();

    // ---- the trade panel, with its flag turned on ------------------------
    //
    // The committed shell is always flag-off, so the deployed state is
    // simulated by rewriting the one meta the build stamps. Jupiter is
    // stubbed: this drive proves the panel's wiring, not the venue's.
    const tradeOrders = [];
    const withTradeFlag = async (page) => {
      await page.route('**/terminal/', async (route) => {
        if (route.request().resourceType() !== 'document') return route.continue();
        const response = await route.fetch();
        const body = (await response.text()).replace(
          '<meta name="zodiacs-registry-trade-enabled" content="0" />',
          '<meta name="zodiacs-registry-trade-enabled" content="1" />',
        );
        return route.fulfill({ response, body, headers: { ...response.headers(), 'content-length': undefined } });
      });
      await page.route('**/lite-api.jup.ag/**', async (route) => {
        const url = new URL(route.request().url());
        tradeOrders.push(Object.fromEntries(url.searchParams));
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            inputMint: url.searchParams.get('inputMint'),
            outputMint: url.searchParams.get('outputMint'),
            inAmount: url.searchParams.get('amount'),
            outAmount: '347222000000',
            priceImpactPct: '0.41',
            feeBps: 10,
            slippageBps: 50,
            outUsdValue: 24.94,
            requestId: 'drive-fixture',
            transaction: null,
          }),
        });
      });
    };

    // Trading is a deliberate placard action at every width. The sculpture
    // remains a selector, while the modal owns focus and scroll only after
    // the explicit Trade pill is pressed.
    for (const [label, width, height, stub] of [
      ['sheet', 1280, 900, false],
      ['flat', 1126, 1000, true],
      ['pocket-320', 320, 568, true],
      ['pocket-360', 360, 640, true],
      ['pocket-390', 390, 844, true],
    ]) {
      const tradePage = await newPage({
        viewport: { width, height },
        reducedMotion: 'no-preference',
        isMobile: width < 500,
        hasTouch: width < 500,
      });
      if (label === 'sheet') {
        // Exercise the real quote-age interval without adding ten seconds to
        // this already broad drive. The old full repaint detached whichever
        // provider link held focus at every age tick.
        await tradePage.addInitScript(() => {
          const nativeSetInterval = window.setInterval.bind(window);
          window.__registryQuoteAgeTicks = 0;
          window.setInterval = (callback, timeout, ...args) => {
            if (timeout !== 10_000) return nativeSetInterval(callback, timeout, ...args);
            return nativeSetInterval((...tickArgs) => {
              window.__registryQuoteAgeTicks += 1;
              callback(...tickArgs);
            }, 50, ...args);
          };
        });
      }
      const tradeBundle = [];
      tradePage.on('request', (request) => {
        if (new URL(request.url()).pathname === '/assets/trade.js') tradeBundle.push(request.url());
      });
      const ordersBefore = tradeOrders.length;
      let releaseSingleRequest = null;
      const singleRequestGate = label === 'sheet'
        ? new Promise((resolve) => { releaseSingleRequest = resolve; })
        : null;
      await mockDexscreener(tradePage, { singleRequestGate });
      if (stub) await stubNoWebgl(tradePage);
      await withTradeFlag(tradePage);
      await tradePage.goto(baseURL + '/terminal/', { waitUntil: 'domcontentloaded' });
      await tradePage.locator('.stage-placard').waitFor({ state: 'visible', timeout: 20_000 });
      await tradePage.evaluate(() => new Promise((resolve) => setTimeout(resolve, 700)));
      check(
        `the ${label} asks Jupiter nothing until the trade is opened`,
        tradeBundle.length === 0
          && tradeOrders.length === ordersBefore
          && await tradePage.locator('.tp').count() === 0,
        JSON.stringify({ bundle: tradeBundle.length, orders: tradeOrders.length - ordersBefore }),
      );

      const mobileSheet = width < 500;
      if (mobileSheet) {
        const statue = tradePage.locator('.stage-carousel__slide.is-active .stage-carousel__figure');
        await statue.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await statue.click();
        await tradePage.waitForTimeout(100);
        check(
          `the ${label} sculpture selects without opening a purchase sheet`,
          await tradePage.locator('.stage-sheet').count() === 0,
        );
      }
      const tradePill = tradePage.locator('button.stage-placard__pill');
      await tradePill.click();
      await tradePage.locator('.stage-sheet').waitFor({ state: 'visible', timeout: 10_000 });
      await tradePage.locator('.tp').waitFor({ state: 'visible', timeout: 20_000 });
      await tradePage.locator('.tp .out').waitFor({ state: 'visible', timeout: 20_000 });

      const ceiling = await tradePage.evaluate(() => {
        const sheet = document.querySelector('.stage-sheet__panel');
        const tp = sheet.querySelector('.tp');
        const box = sheet.getBoundingClientRect();
        return {
          lore: sheet.querySelectorAll('.consumer-preview__lore').length,
          quote: sheet.querySelectorAll('[data-token-quote]').length,
          record: sheet.querySelector('.stage-sheet__record')?.getAttribute('href'),
          // How far down the sheet the reader must look to find the trade.
          panelTop: tp ? Math.round(tp.getBoundingClientRect().top - box.top) : -1,
          // On a phone the panel rises from the bottom edge and owns the width.
          fromBottom: Math.round(innerHeight - box.bottom),
          widthShare: box.width / innerWidth,
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
        };
      });
      check(
        `the ${label} opens on the panel rather than on a second copy of the record`,
        ceiling.lore === 0 && ceiling.quote === 0
          && ceiling.record === '/registry/leo/'
          && ceiling.panelTop >= 0 && ceiling.panelTop <= 120,
        JSON.stringify(ceiling),
      );
      if (mobileSheet) {
        check(
          `the ${label} panel rises from the bottom edge and owns the width`,
          ceiling.fromBottom <= 1 && ceiling.widthShare >= 0.99
            && ceiling.pageWidth <= ceiling.viewportWidth + 1,
          JSON.stringify(ceiling),
        );
      }

      const panel = await tradePage.evaluate(() => {
        const tp = document.querySelector('.tp');
        const host = tp.closest('.consumer-trade');
        const sheet = tp.closest('.stage-sheet__panel');
        const close = sheet.querySelector('.stage-sheet__close');
        const chips = [...tp.querySelectorAll('.amts button')];
        const methods = [...tp.querySelectorAll('.payseg button')];
        const box = (node) => {
          const rect = node?.getBoundingClientRect();
          return rect ? {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          } : null;
        };
        const body = sheet.querySelector('.stage-sheet__body');
        const fomoRamp = [...tp.querySelectorAll('.ramp')]
          .find((ramp) => /fomo/i.test(ramp.textContent));
        const bodyStyle = getComputedStyle(body);
        const contentWidth = body.clientWidth
          - parseFloat(bodyStyle.paddingLeft)
          - parseFloat(bodyStyle.paddingRight);
        let background = document.querySelector('main#main');
        while (background?.parentElement && background.parentElement !== document.body) {
          background = background.parentElement;
        }
        return {
          host: tp.closest('.stage-sheet') ? 'sheet' : 'loose',
          amount: tp.querySelector('.pay__input')?.value,
          chips: chips.map((b) => b.textContent),
          chipHeights: chips.map((b) => b.getBoundingClientRect().height),
          pressed: chips.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent),
          receive: tp.querySelector('.out')?.textContent ?? '',
          facts: [...tp.querySelectorAll('.fact')].map((f) => f.textContent),
          methods: methods.map((button) => ({
            id: button.dataset.method,
            eyebrow: button.querySelector('.payseg__eyebrow')?.textContent ?? '',
            label: button.querySelector('.payseg__label')?.textContent ?? '',
            pressed: button.getAttribute('aria-pressed') === 'true',
          })),
          ramps: tp.querySelectorAll('.ramps li').length,
          rampNames: [...tp.querySelectorAll('.ramp__name')].map((n) => n.textContent),
          fomoRow: fomoRamp?.textContent.replace(/\s+/g, ' ').trim() ?? '',
          fomoApplePay: Boolean(fomoRamp?.querySelector('.tp__mark.ap[aria-label="Apple Pay"]')),
          applePayBadge: tp.querySelectorAll('.tp__mark.ap').length,
          marks: tp.querySelectorAll('.ramps .tp__mark').length,
          go: tp.querySelectorAll('.tp__go').length,
          heroButton: tp.querySelectorAll('.route__go, .route__t').length,
          sheet: box(sheet),
          bodyBox: box(body),
          hostBox: box(host),
          tpBox: box(tp),
          closeBox: box(close),
          contentWidth,
          sheetScrollWidth: sheet.scrollWidth,
          sheetClientWidth: sheet.clientWidth,
          bodyOverflow: getComputedStyle(document.body).overflow,
          backgroundInert: Boolean(background?.inert),
          focusInside: Boolean(document.activeElement?.closest('.stage-sheet')),
        };
      });
      check(
        `the ${label} opens the panel already showing what $25 buys`,
        panel.host === 'sheet'
          && panel.amount === '25'
          && panel.chips.join(' ') === '$25 $50 $100 $250'
          && panel.pressed.join('') === '$25'
          && /\d/.test(panel.receive)
          && panel.facts.length === 2
          && panel.facts.some((f) => /\$|¢/.test(f))
          && panel.facts.some((f) => /%/.test(f))
          && panel.chipHeights.every((height) => height >= 44),
        JSON.stringify(panel),
      );
      check(
        `the ${label} uses one full-width trade surface without close-button collision`,
        panel.bodyBox && panel.hostBox && panel.tpBox && panel.closeBox
          && panel.hostBox.width >= panel.contentWidth - 1
          && panel.tpBox.width >= panel.hostBox.width - 1
          && panel.closeBox.bottom <= panel.hostBox.top + 1
          && panel.sheetScrollWidth <= panel.sheetClientWidth + 1,
        JSON.stringify({
          sheet: panel.sheet,
          body: panel.bodyBox,
          host: panel.hostBox,
          trade: panel.tpBox,
          close: panel.closeBox,
          contentWidth: panel.contentWidth,
          scrollWidth: panel.sheetScrollWidth,
          clientWidth: panel.sheetClientWidth,
        }),
      );
      check(
        `the ${label} sheet owns focus and locks the background`,
        panel.focusInside && panel.backgroundInert && panel.bodyOverflow === 'hidden',
        JSON.stringify({
          focusInside: panel.focusInside,
          backgroundInert: panel.backgroundInert,
          bodyOverflow: panel.bodyOverflow,
        }),
      );

      // From the first focusable control, Shift+Tab must wrap to the last
      // control rather than escape behind the scrim; Tab then wraps back.
      const focusableCount = await tradePage.evaluate(() => {
        const dialog = document.querySelector('.stage-sheet');
        const focusable = [...dialog.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )].filter((node) => {
          const style = getComputedStyle(node);
          const box = node.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' && box.width > 0 && box.height > 0;
        });
        focusable[0]?.focus();
        return focusable.length;
      });
      await tradePage.keyboard.press('Shift+Tab');
      const wrappedToLast = await tradePage.evaluate(() => (
        document.activeElement?.classList.contains('stage-sheet__record') ?? false
      ));
      await tradePage.keyboard.press('Tab');
      const wrappedToFirst = await tradePage.evaluate(() => (
        document.activeElement?.classList.contains('stage-sheet__close') ?? false
      ));
      check(
        `the ${label} traps keyboard focus in both directions`,
        focusableCount >= 3 && wrappedToLast && wrappedToFirst,
        JSON.stringify({ count: focusableCount, wrappedToLast, wrappedToFirst }),
      );
      check(
        `the ${label} separates funding from the direct swap and keeps providers unranked`,
        JSON.stringify(panel.methods) === JSON.stringify([
          { id: 'card', eyebrow: 'Fund first', label: 'I’m new to crypto', pressed: true },
          { id: 'usdc', eyebrow: 'Direct swap', label: 'I already have USDC', pressed: false },
        ])
          && panel.ramps === 4 && panel.go === 0
          && panel.rampNames.join(' · ') === 'Coinbase · fomo · MoonPay · Ramp Network'
          && panel.heroButton === 0
          && panel.applePayBadge === 1
          && panel.fomoApplePay
          && /verify the mint/i.test(panel.fomoRow)
          && panel.marks >= 4,
        JSON.stringify({
          names: panel.rampNames,
          methods: panel.methods,
          fomo: panel.fomoRow,
          marks: panel.marks,
        }),
      );

      if (label === 'sheet') {
        const focusedProvider = tradePage.locator('.tp .ramp').first();
        const ticksBeforeFocus = await tradePage.evaluate(() => window.__registryQuoteAgeTicks);
        await focusedProvider.focus();
        await tradePage.waitForFunction(
          (priorTicks) => window.__registryQuoteAgeTicks > priorTicks,
          ticksBeforeFocus,
        );
        check(
          'a quote-age tick updates in place without dropping provider keyboard focus',
          await focusedProvider.evaluate((provider) => (
            provider === document.activeElement && Boolean(provider.closest('.stage-sheet'))
          )),
        );

        releaseSingleRequest();
        await tradePage.locator('.tp .detail').filter({ hasText: 'Indexed liquidity' })
          .waitFor({ state: 'visible', timeout: 5_000 });
        check(
          'late liquidity context reconciles without dropping provider keyboard focus',
          await focusedProvider.evaluate((provider) => (
            provider === document.activeElement && Boolean(provider.closest('.stage-sheet'))
          )),
        );
      }

      const usdc = tradePage.locator('.tp .payseg button').nth(1);
      await usdc.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await usdc.click();
      await tradePage.locator('.tp__go').waitFor({ state: 'visible', timeout: 10_000 });
      check(
        `the ${label} offers a wallet review once USDC is chosen`,
        /review/i.test(await tradePage.locator('.tp__go').innerText())
          && await tradePage.locator('.tp .ramps').count() === 0,
      );
      check(
        `the ${label} fetches its bundle once and prices without an address`,
        tradeBundle.length === 1
          && tradeOrders.length > ordersBefore
          && tradeOrders.every((q) => q.amount && q.inputMint && q.outputMint && !('taker' in q)),
        JSON.stringify({ bundle: tradeBundle.length, orders: tradeOrders.length - ordersBefore }),
      );

      await tradePage.keyboard.press('Escape');
      // The closing state remains mounted long enough to animate out.
      const exitWasPresent = await tradePage.locator('.stage-sheet').count() === 1;
      await tradePage.locator('.stage-sheet').waitFor({ state: 'detached', timeout: 3_000 });
      const restored = await tradePage.evaluate(() => {
        let background = document.querySelector('main#main');
        while (background?.parentElement && background.parentElement !== document.body) {
          background = background.parentElement;
        }
        return {
          bodyOverflow: getComputedStyle(document.body).overflow,
          backgroundInert: Boolean(background?.inert),
          focus: document.activeElement?.classList.contains('stage-placard__pill') ?? false,
        };
      });
      check(
        `escape returns the ${label} from the sheet untouched`,
        exitWasPresent
          && await tradePage.locator('.stage-sheet').count() === 0
          && await tradePage.locator('.stage-placard').count() === 1
          && restored.bodyOverflow !== 'hidden'
          && restored.backgroundInert === false
          && restored.focus,
        JSON.stringify({ exitWasPresent, restored }),
      );
      await tradePage.close();
    }

    for (const [legacyHash, destination] of [
      ['pulse', 'market-transparency'],
      ['standings', 'market-transparency'],
      ['onchain-access', 'access-third-parties'],
      ['builders', 'builder-tools'],
      ['sdk', 'builder-tools'],
      ['security', 'safety-evidence'],
    ]) {
      const legacy = await newPage({ viewport: { width: 900, height: 800 } });
      await legacy.goto(baseURL + '/terminal/#' + legacyHash, { waitUntil: 'domcontentloaded' });
      await legacy.waitForURL('**/registry/technical/#' + destination);
      check(
        'legacy #' + legacyHash + ' opens its matching technical group',
        new URL(legacy.url()).pathname === '/registry/technical/'
          && new URL(legacy.url()).hash === '#' + destination,
        legacy.url(),
      );
      await legacy.close();
    }

    const technicalRuntime = await newPage({ viewport: { width: 390, height: 844 } });
    await technicalRuntime.goto(baseURL + '/registry/technical/', { waitUntil: 'domcontentloaded' });
    await technicalRuntime.locator('main#main.technical-registry').waitFor({ state: 'visible' });
    const technicalSkipHref = await technicalRuntime.locator('.technical-static__skip').getAttribute('href');
    check(
      'technical skip link retains a valid target after the runtime mounts',
      technicalSkipHref === '#main'
        && await technicalRuntime.locator(technicalSkipHref).count() === 1,
      technicalSkipHref ?? '',
    );
    const technicalCaption = await technicalRuntime.locator('.technical-records__table caption')
      .evaluate((caption) => {
        const rect = caption.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
    check(
      'technical address caption stays horizontal and full-width on mobile',
      technicalCaption.width >= 340 && technicalCaption.height <= 72,
      JSON.stringify(technicalCaption),
    );
    await technicalRuntime.close();

    const technicalContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      javaScriptEnabled: false,
    });
    const technical = await technicalContext.newPage();
    await technical.goto(baseURL + '/registry/technical/', { waitUntil: 'domcontentloaded' });
    const technicalState = await technical.evaluate(() => ({
      signs: document.querySelectorAll('[data-technical-sign]').length,
      representations: document.querySelectorAll('[data-technical-representation]').length,
      groups: [
        'records-networks',
        'market-transparency',
        'access-third-parties',
        'builder-tools',
        'safety-evidence',
      ].filter((id) => document.getElementById(id)).length,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      checkerLinks: document.querySelectorAll('a[href="/registry/#verify"]').length,
    }));
    check(
      'technical route remains complete and readable without JavaScript',
      technicalState.signs === 12
        && technicalState.representations === 24
        && technicalState.groups === 5
        && technicalState.checkerLinks >= 1
        && technicalState.pageWidth <= technicalState.viewportWidth + 1,
      JSON.stringify(technicalState),
    );
    await technicalContext.close();
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
