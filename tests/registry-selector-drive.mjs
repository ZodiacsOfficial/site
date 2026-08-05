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
 * Pass { fail: true } to exercise the unavailable state instead.
 */
async function mockDexscreener(page, { fail = false } = {}) {
  await page.route('https://api.dexscreener.com/**', async (route) => {
    if (fail) return route.abort();
    const url = route.request().url();
    if (!url.includes('/tokens/v1/solana/')) return route.fulfill({ json: { pairs: [] } });
    const mints = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '').split(',');
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
        pairCreatedAt: 1721000000000,
      })),
    });
  });
}

/** The Cabinet is deployment-flagged. Enable it on visual consumer pages so
 * this gate exercises the same purpose card the public Registry ships. */
async function withCollectionFlag(page) {
  await page.route('**/registry/', async (route) => {
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
      { path: '/registry/', selector: '.wnav-wrap .wnav', prefix: 'wnav' },
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
                === JSON.stringify(['/learn/', '/horoscopes/', '/profile/', '/registry/']),
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
      await fallbackPage.goto(`${baseURL}/registry/`, { waitUntil: 'domcontentloaded' });
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
        staticPriceNote: document.body.textContent?.includes('Live prices appear with JavaScript') ?? false,
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
        fallbackState.staticTokenRows === 12 && fallbackState.staticPriceNote,
        JSON.stringify({ rows: fallbackState.staticTokenRows, note: fallbackState.staticPriceNote }),
      );
      await fallbackPage.close();
    }

    const homeMaterialPage = await newPage({ viewport: { width: 390, height: 844 } });
    const registryMaterialPage = await newPage({ viewport: { width: 390, height: 844 } });
    await Promise.all([
      homeMaterialPage.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' }),
      registryMaterialPage.goto(`${baseURL}/registry/`, { waitUntil: 'domcontentloaded' }),
    ]);
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
          border: style.borderColor,
          shadow: style.boxShadow,
        };
      }));
    };
    for (const lens of [false, true]) {
      const [homeActions, registryActions] = await Promise.all([
        material(homeMaterialPage, '.hero__ctas .btn', lens),
        material(registryMaterialPage, '.stage-placard__pill', lens),
      ]);
      check(
        `homepage hero actions match the Registry glass material (${lens ? 'lens' : 'iOS fallback'})`,
        homeActions.length === 2
          && registryActions.length >= 1
          && homeActions.every((action) => (
            action.background === registryActions[0].background
            && action.backdrop === registryActions[0].backdrop
            && action.border === registryActions[0].border
            && action.shadow === registryActions[0].shadow
          )),
        JSON.stringify({ homeActions, registryActions }),
      );
    }
    await Promise.all([homeMaterialPage.close(), registryMaterialPage.close()]);

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

    // Exact review viewport: the consumer journey stays compact, uses the
    // promised six-by-two sign grid, and leaves technical material on its own
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
    await compactRegistry.goto(`${baseURL}/registry/`, { waitUntil: 'domcontentloaded' });
    await compactRegistry.locator('[data-consumer-sign]').first().waitFor({ state: 'visible' });
    const compactRegistryLayout = await compactRegistry.evaluate(() => {
      const shell = document.querySelector('.zd');
      const explorer = document.querySelector('.consumer-explorer');
      const controls = [...document.querySelectorAll('[data-consumer-sign]')];
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
        heavySections: ['pulse', 'standings', 'onchain-access', 'builders', 'sdk', 'security']
          .filter((id) => document.getElementById(id)),
      };
    });
    check('Registry at 623×1054 has no document overflow',
      compactRegistryLayout.documentWidth <= compactRegistryLayout.viewportWidth + 1,
      `${compactRegistryLayout.documentWidth}/${compactRegistryLayout.viewportWidth}`);
    check('Registry at 623×1054 uses the broad responsive content shell',
      compactRegistryLayout.shell
        && compactRegistryLayout.shell.width >= compactRegistryLayout.clientWidth * 0.88,
      `${compactRegistryLayout.shell?.width ?? 0}/${compactRegistryLayout.clientWidth}`);
    check('Registry at 623×1054 offers all twelve signs on one rail',
      compactRegistryLayout.controlCount === 12
        && compactRegistryLayout.rowCounts.length === 1,
      JSON.stringify(compactRegistryLayout.rowCounts));
    check('Registry at 623×1054 keeps the consumer journey under 7,500px',
      compactRegistryLayout.pageHeight <= 7500,
      String(compactRegistryLayout.pageHeight));
    check('Registry at 623×1054 leaves technical sections off the consumer route',
      compactRegistryLayout.heavySections.length === 0,
      compactRegistryLayout.heavySections.join(','));
    await compactRegistry.goto(`${baseURL}/registry/#identity`, { waitUntil: 'domcontentloaded' });
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
    await tabletEdge.goto(`${baseURL}/registry/`, { waitUntil: 'domcontentloaded' });
    await tabletEdge.locator('[data-consumer-sign]').first().waitFor({ state: 'visible' });
    const tabletRows = await tabletEdge.locator('[data-consumer-sign]').evaluateAll((controls) => {
      const tops = controls.map((control) => Math.round(control.getBoundingClientRect().top));
      return [...new Set(tops)].map((top) => tops.filter((candidate) => candidate === top).length);
    });
    check(
      'Registry one pixel under the stage breakpoint still rails the twelve',
      JSON.stringify(tabletRows) === JSON.stringify([12]),
      JSON.stringify(tabletRows),
    );
    await tabletEdge.close();

    for (const width of [390, 781]) {
      for (const record of [
        { slug: 'cancer', next: 'leo', name: 'Leo' },
        { slug: 'pisces', next: 'aries', name: 'Aries' },
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

    // The grid explorer's own assertions run with WebGL denied — the path
    // narrow, non-WebGL, and stage-failure readers actually get. The stage
    // is asserted separately, on an unstubbed page.
    const desktop = await newPage({ viewport: { width: 1126, height: 1180 } });
    await stubNoWebgl(desktop);
    await mockDexscreener(desktop);
    await withCollectionFlag(desktop);
    const desktopErrors = [];
    const desktopGalleryRequests = [];
    desktop.on('pageerror', (error) => desktopErrors.push(String(error)));
    desktop.on('request', (request) => {
      if (new URL(request.url()).pathname === '/assets/gallery.js') {
        desktopGalleryRequests.push(request.url());
      }
    });
    await desktop.goto(baseURL + '/registry/', { waitUntil: 'domcontentloaded' });
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
    check(
      'the plate opens the page without WebGL, carrying the same headline',
      await desktop.locator('.cine').count() === 0
        && await desktop.locator('h1.stage-hero__title').count() === 1
        && (await desktop.locator('.stage-hero__line').innerText()).trim()
          .startsWith('Every sign has one official token. Explore its story, its record, and its market.'),
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
      'desktop consumer Registry has no horizontal overflow and stays below 6,500px',
      desktopDimensions.width <= desktopDimensions.viewport + 1
        && desktopDimensions.height <= 6500,
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
      scrollY,
    }));
    check(
      'selecting Pisces relabels the placard without moving the page',
      piscesPlacard.name === 'Pisces'
        && piscesPlacard.record === '/registry/pisces/'
        && piscesPlacard.trade === '/registry/pisces/#acquire'
        && piscesPlacard.base === false
        && piscesPlacard.guide === false
        && Math.abs(piscesPlacard.scrollY - scrollBeforePick) <= 2,
      JSON.stringify(piscesPlacard),
    );
    check(
      'choosing a sign turns the carousel to its sculpture',
      await desktop.locator('.stage-carousel__slide.is-active .stage-carousel__art')
        .getAttribute('src') === '/assets/sculptures/512/pisces.webp',
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
    const watchlist = await desktop.locator('.consumer-token').evaluateAll((rows) => rows.map((row) => ({
      href: row.getAttribute('href'),
      priced: Boolean(row.querySelector('.consumer-token__price')),
    })));
    check(
      'the twelve-token watchlist stays in zodiac order and links every official record',
      watchlist.length === 12
        && watchlist.every((row, index) => row.href === '/registry/' + [
          'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
          'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
        ][index] + '/')
        && watchlist.every((row) => row.priced),
      JSON.stringify(watchlist),
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
        seatImages: [...(collection?.querySelectorAll('.consumer-cabinet__seat.is-filled img') || [])]
          .map((image) => image.getAttribute('src') ?? ''),
        thesisHref: thesis?.getAttribute('href') ?? '',
        thesisImage: thesisImage?.getAttribute('src') ?? '',
        thesisAlt: thesisImage?.getAttribute('alt') ?? '',
      };
    });
    check(
      'collection and thesis links preview the artwork found at their destinations',
      purposeArt.collectionHref === '/registry/collection/'
        && purposeArt.seats === 12
        && purposeArt.filledSeats === 5
        && purposeArt.seatImages.length === 5
        && purposeArt.seatImages.filter((src) => src.startsWith('/assets/cabinet-materials/')).length === 3
        && purposeArt.seatImages.filter((src) => src.startsWith('/assets/zodiac-icons/')).length === 2
        && purposeArt.thesisHref === '/thesis/'
        && purposeArt.thesisImage.includes('/assets/art/zodiac-clock-')
        && purposeArt.thesisAlt.length > 0,
      JSON.stringify(purposeArt),
    );
    check('desktop consumer runtime is error-free', desktopErrors.length === 0, desktopErrors.join(' | '));
    if (OUT) await desktop.screenshot({ path: OUT + '/registry-consumer-1126.png', fullPage: false });
    await desktop.close();

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
      await mockDexscreener(mobile);
      await withCollectionFlag(mobile);
      const mobileGalleryRequests = [];
      mobile.on('request', (request) => {
        if (new URL(request.url()).pathname === '/assets/gallery.js') {
          mobileGalleryRequests.push(request.url());
        }
      });
      await mobile.goto(baseURL + '/registry/', { waitUntil: 'domcontentloaded' });
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
      const label = `${width}×${height}`;
      check(
        `mobile explorer at ${label} rails all twelve signs in one row`,
        mobileState.count === 12 && mobileState.rowCounts.length === 1,
        JSON.stringify(mobileState),
      );
      check(
        `mobile Registry at ${label} has no horizontal overflow and keeps 44px targets`,
        mobileState.pageWidth <= mobileState.viewportWidth + 1
          && mobileState.pageHeight <= 7500
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
        `phones at ${label} never request the scene bundle`,
        mobileGalleryRequests.length === 0,
        JSON.stringify(mobileGalleryRequests),
      );
      if (OUT && width === 390) {
        await mobile.screenshot({ path: OUT + '/registry-consumer-390.png', fullPage: false });
      }
      await mobile.close();
    }

    // Loading narrow and then crossing the stage breakpoint used to leave an
    // empty mount because the gallery script only inspected the first DOM.
    // Exercise the complete mobile → desktop → mobile → desktop cycle.
    const responsiveStage = await newPage({ viewport: { width: 390, height: 844 } });
    await mockDexscreener(responsiveStage);
    const responsiveStageRequests = [];
    const responsiveStageErrors = [];
    responsiveStage.on('request', (request) => {
      if (new URL(request.url()).pathname === '/assets/gallery.js') responsiveStageRequests.push(request.url());
    });
    responsiveStage.on('pageerror', (error) => responsiveStageErrors.push(String(error)));
    await responsiveStage.goto(baseURL + '/registry/', { waitUntil: 'domcontentloaded' });
    await responsiveStage.locator('.gband--flat').waitFor({ state: 'visible' });
    const responsiveStageLive = await responsiveStage.evaluate(() => (
      document.documentElement.classList.contains('gallery-live')
    ));
    if (responsiveStageLive) {
      const cycleSelections = [
        { slug: 'gemini', name: 'Gemini', index: 2 },
        { slug: 'scorpio', name: 'Scorpio', index: 7 },
      ];
      for (let cycle = 1; cycle <= 2; cycle += 1) {
        await responsiveStage.setViewportSize({ width: 1280, height: 900 });
        const liveBand = responsiveStage.locator('.gband--consumer[data-gallery-stage]');
        await liveBand.waitFor({ state: 'visible' });
        await liveBand.locator('.stage__canvas').waitFor({ state: 'attached', timeout: 30_000 });
        await liveBand.locator('button.rail__tick').first().waitFor({ state: 'visible', timeout: 30_000 });
        const liveShape = await liveBand.evaluate((band) => {
          const canvas = band.querySelector('.stage__canvas');
          const box = canvas?.getBoundingClientRect();
          const tickButtons = [...band.querySelectorAll('button.rail__tick')];
          return {
            ready: band.classList.contains('is-ready'),
            canvases: band.querySelectorAll('.stage__canvas').length,
            tickButtons: tickButtons.length,
            enabledTicks: tickButtons.filter((tick) => !tick.disabled).length,
            tickImages: band.querySelectorAll('button.rail__tick img').length,
            placeholders: band.querySelectorAll('.rail__tick--placeholder').length,
            canvasWidth: box?.width ?? 0,
            canvasHeight: box?.height ?? 0,
          };
        });
        check(
          `responsive gallery cycle ${cycle} mounts one usable desktop stage`,
          liveShape.ready && liveShape.canvases === 1
            && liveShape.tickButtons === 12 && liveShape.enabledTicks === 12
            && liveShape.tickImages === 12 && liveShape.placeholders === 0
            && liveShape.canvasWidth > 0 && liveShape.canvasHeight >= 360,
          JSON.stringify(liveShape),
        );
        const selection = cycleSelections[cycle - 1];
        const liveTick = liveBand.locator('button.rail__tick').nth(selection.index);
        await liveTick.click();
        const livePlacard = liveBand.locator(`[data-consumer-preview="${selection.slug}"]`);
        await livePlacard.waitFor({ state: 'visible' });
        check(
          `responsive gallery cycle ${cycle} keeps its rail interactive`,
          await liveTick.getAttribute('aria-pressed') === 'true'
            && (await livePlacard.locator('.stage-placard__name').innerText()).trim() === selection.name,
        );
        await responsiveStage.setViewportSize({ width: 390, height: 844 });
        await responsiveStage.locator('.gband--flat').waitFor({ state: 'visible' });
        check(
          `responsive gallery cycle ${cycle} restores the mobile carousel`,
          await responsiveStage.locator('.stage-carousel__slide').count() === 1
            && await responsiveStage.locator('[data-consumer-sign]').count() === 12
            && await responsiveStage.locator('[data-gallery-stage]').count() === 0,
        );
      }
      check(
        'responsive gallery loads its scene bundle once across remounts',
        responsiveStageRequests.length === 1,
        JSON.stringify(responsiveStageRequests),
      );
    } else {
      await responsiveStage.setViewportSize({ width: 1280, height: 900 });
      await responsiveStage.locator('.gband--flat').waitFor({ state: 'visible' });
      check(
        'non-WebGL responsive fallback remains a complete carousel',
        await responsiveStage.locator('.stage-carousel__slide').count() === 1
          && await responsiveStage.locator('[data-consumer-sign]').count() === 12
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
    await reduced.goto(baseURL + '/registry/', { waitUntil: 'domcontentloaded' });
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
    stagePage.on('request', (request) => {
      if (new URL(request.url()).pathname === '/assets/gallery.js') stageRequests.push(request.url());
    });
    await stagePage.goto(baseURL + '/registry/', { waitUntil: 'domcontentloaded' });
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
      check(
        'the rail exposes one pressed tick for the current sign',
        await stagePage.locator('.rail__tick[aria-pressed="true"]').count() === 1,
      );
      // One opening scene: the film hero stands down, the headline rides the
      // stage, the rail picks beneath it, the chosen sculpture stands large,
      // and the placard at its feet says name, dates, price — nothing more.
      const shape = await stagePage.evaluate(() => {
        const box = (sel) => {
          const el = document.querySelector(sel);
          return el ? el.getBoundingClientRect() : null;
        };
        const head = box('.stage-hero__head');
        const plate = box('.gband--consumer');
        const rail = box('.gband--consumer [data-gallery-rail]');
        const canvas = box('.gband--consumer [data-gallery-canvas]');
        const placard = box('.stage-placard');
        return {
          filmHero: document.querySelectorAll('.cine').length,
          h1: document.querySelectorAll('h1').length,
          headAboveRail: Boolean(head && rail && head.bottom <= rail.top + 1),
          railAboveCanvas: Boolean(rail && canvas && rail.bottom <= canvas.top + 1),
          canvasAbovePlacard: Boolean(placard && canvas
            && canvas.bottom <= placard.top + 1),
          plateFramed: Boolean(plate && plate.width < innerWidth - 40 && plate.width <= 1402),
          plateRadius: plate ? getComputedStyle(document.querySelector('.gband--consumer')).borderTopLeftRadius : '',
          headInsidePlate: Boolean(head && plate && head.top >= plate.top - 1 && head.bottom <= plate.bottom + 1),
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
        'the plate frames the opening scene: headline, rail, sculpture, placard',
        shape.filmHero === 0 && shape.h1 === 1
          && shape.headAboveRail && shape.railAboveCanvas && shape.canvasAbovePlacard
          && shape.plateFramed && shape.plateRadius.startsWith('26') && shape.headInsidePlate
          && shape.chrome === 0
          && shape.previewInside === 1 && shape.previewTotal === 1
          && shape.flatArt === 0
          && shape.figureHeight >= 380,
        JSON.stringify(shape),
      );

      // Centre it first. The rail rides the top of the rectangle and the
      // site's nav floats over the top of the page, so scrolling the tick
      // just barely into view would slide it under the pill.
      const geminiTick = stagePage.locator('.rail__tick').nth(2);
      await geminiTick.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await geminiTick.click();
      await stagePage.locator('[data-consumer-preview="gemini"]').waitFor({ timeout: 10_000 });
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

      // Tapping a sculpture on the stage chooses it. There is nothing to
      // draw out to — the placard is already at its feet — so the card must
      // stay shut however the canvas is used.
      const canvasBox = await stagePage.locator('.gband--consumer [data-gallery-canvas]').boundingBox();
      await stagePage.mouse.click(canvasBox.x + (canvasBox.width / 2), canvasBox.y + (canvasBox.height / 2));
      await stagePage.evaluate(() => new Promise((resolve) => setTimeout(resolve, 700)));
      check(
        'the stage never draws a sculpture out over its own placard',
        await stagePage.locator('.gband.is-open').count() === 0
          && await stagePage.locator('[data-gallery-card]:not([hidden])').count() === 0,
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

    // ---- the trade panel, with its flag turned on ------------------------
    //
    // The committed shell is always flag-off, so the deployed state is
    // simulated by rewriting the one meta the build stamps. Jupiter is
    // stubbed: this drive proves the panel's wiring, not the venue's.
    const tradeOrders = [];
    const withTradeFlag = async (page) => {
      await page.route('**/registry/', async (route) => {
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
      const tradeBundle = [];
      tradePage.on('request', (request) => {
        if (new URL(request.url()).pathname === '/assets/trade.js') tradeBundle.push(request.url());
      });
      const ordersBefore = tradeOrders.length;
      await mockDexscreener(tradePage);
      if (stub) await stubNoWebgl(tradePage);
      await withTradeFlag(tradePage);
      await tradePage.goto(baseURL + '/registry/', { waitUntil: 'domcontentloaded' });
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
          method: methods.find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent ?? '',
          ramps: tp.querySelectorAll('.ramps li').length,
          rampNames: [...tp.querySelectorAll('.ramp__name')].map((n) => n.textContent),
          fomoRow: [...tp.querySelectorAll('.ramp')]
            .find((r) => /fomo/i.test(r.textContent))?.textContent.replace(/\s+/g, ' ').trim() ?? '',
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
        `the ${label} lists four ways to pay, branded, alphabetical, none ranked`,
        /Card|Apple Pay/i.test(panel.method)
          && panel.ramps === 4 && panel.go === 0
          && panel.rampNames.join(' · ') === 'Coinbase · fomo · MoonPay · Ramp Network'
          && panel.heroButton === 0
          && panel.applePayBadge === 1
          && /Apple Pay/.test(panel.fomoRow)
          && panel.marks >= 4,
        JSON.stringify({ names: panel.rampNames, method: panel.method, marks: panel.marks }),
      );

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
      await legacy.goto(baseURL + '/registry/#' + legacyHash, { waitUntil: 'domcontentloaded' });
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
