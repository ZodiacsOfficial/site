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
        fallbackState.links.length === 7
          && fallbackState.links.every((link) => (
            link.width > 0
            && link.left >= -1
            && link.right <= fallbackState.viewportWidth + 1
          )),
        JSON.stringify(fallbackState.links),
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
        material(registryMaterialPage, '.cine__cta .btn', lens),
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

    const desktop = await newPage({ viewport: { width: 1126, height: 1180 } });
    const desktopErrors = [];
    desktop.on('pageerror', (error) => desktopErrors.push(String(error)));
    await stubNoWebgl(desktop);
    await desktop.goto(`${baseURL}/registry/`, { waitUntil: 'domcontentloaded' });
    await desktop.waitForSelector('.strip__glyph');
    check(
      'denied WebGL renders the strip, not the band',
      await desktop.evaluate(() => (
        !document.documentElement.classList.contains('gallery-live')
        && document.querySelectorAll('.gband').length === 0
        && document.querySelectorAll('.strip-wrap').length === 1
      )),
    );

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
    const initialFeaturedSlug = await desktop.locator('[data-featured-sign]').getAttribute('data-featured-sign');
    const initialBrowseHref = await desktop.locator('[data-registry-browse]').getAttribute('href');
    const initialNuggetHref = await desktop.locator('.nugget-link').getAttribute('href');
    check(
      'hero browse action follows the current-season featured record',
      initialBrowseHref === `/registry/${initialFeaturedSlug}/` && initialBrowseHref === initialNuggetHref,
      `${initialBrowseHref}/${initialNuggetHref}`,
    );
    const auraEnabled = await desktop.locator('meta[name="zodiacs-registry-collection-enabled"]').getAttribute('content') === '1';
    const collectionActions = await desktop.locator('[data-registry-collection]').count();
    check(
      'Registry hero uses the approved reader-facing introduction',
      (await desktop.locator('.cine__line').innerText()).trim()
        === 'Meet the twelve signs through their symbols, stories, and living traditions.',
    );
    check(
      'Cabinet hero action follows the existing build flag',
      collectionActions === (auraEnabled ? 1 : 0),
      `${auraEnabled ? 'on' : 'off'}/${collectionActions}`,
    );
    if (auraEnabled) {
      check(
        'enabled Cabinet hero action uses the fixed Aura route',
        await desktop.locator('[data-registry-collection]').getAttribute('href') === '/registry/collection/',
      );
      const actionMaterials = await desktop.locator('.cine__cta .btn').evaluateAll((actions) => actions.map((action) => {
        const style = getComputedStyle(action);
        const rect = action.getBoundingClientRect();
        return {
          label: action.innerText.trim().replace(/\s+/g, ' '),
          height: rect.height,
          background: style.backgroundColor,
          backdrop: style.backdropFilter || style.webkitBackdropFilter,
        };
      }));
      check(
        'Registry hero actions share the nav glass material and 48px geometry',
        actionMaterials.length === 2
          && actionMaterials.every((action) => Math.abs(action.height - 48) <= 0.5)
          && actionMaterials[0].background === actionMaterials[1].background
          && actionMaterials[0].backdrop === actionMaterials[1].backdrop,
        JSON.stringify(actionMaterials),
      );
      check(
        'Cabinet action uses the approved label',
        actionMaterials[1].label === 'Open the Cabinet →',
        actionMaterials[1].label,
      );
      const cabinetLine = await desktop.locator('[data-registry-collection]').evaluate((element) => {
        const style = getComputedStyle(element, '::after');
        return { content: style.content, display: style.display };
      });
      check(
        'Cabinet hero action has no decorative underline',
        cabinetLine.content === 'none' || cabinetLine.display === 'none',
        JSON.stringify(cabinetLine),
      );
    }

    await desktop.locator('[data-sign="pisces"]').click();
    await desktop.waitForSelector('[data-featured-sign="pisces"]');
    check('click updates the featured record', await desktop.locator('[data-featured-sign="pisces"]').count() === 1);
    const piscesBrowseHref = await desktop.locator('[data-registry-browse]').getAttribute('href');
    const piscesNuggetHref = await desktop.locator('.nugget-link').getAttribute('href');
    check(
      'hero browse action stays synchronized with the selected nugget',
      piscesBrowseHref === '/registry/pisces/' && piscesBrowseHref === piscesNuggetHref,
      `${piscesBrowseHref}/${piscesNuggetHref}`,
    );
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

    const mobile = await newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
    });
    await stubNoWebgl(mobile);
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

    const reduced = await newPage({
      viewport: { width: 1126, height: 1180 },
      reducedMotion: 'reduce',
    });
    await stubNoWebgl(reduced);
    await reduced.goto(`${baseURL}/registry/`, { waitUntil: 'domcontentloaded' });
    await reduced.waitForSelector('.strip__glyph');
    await reduced.locator('[data-sign="libra"]').click();
    const animationName = await reduced.locator('[data-featured-sign="libra"] .fade-key').first()
      .evaluate((element) => getComputedStyle(element).animationName);
    check('reduced motion swaps records without animation', animationName === 'none', animationName);
    await reduced.close();

    // ---- the gallery band: the selector wherever WebGL exists -------------
    // CI browsers without GL take the strip path above; the band checks then
    // record themselves as skipped rather than failing the gate.
    // The dock wave is motion, and the scene withholds it under a reduced
    // motion preference — which some CI browsers report by default. State the
    // preference explicitly so this section tests the wave, not the runner.
    for (const [label, viewport] of [
      ['1280', { viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' }],
      ['390', {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        hasTouch: true,
        reducedMotion: 'no-preference',
      }],
    ]) {
      const band = await newPage(viewport);
      const bandErrors = [];
      band.on('pageerror', (error) => bandErrors.push(String(error)));
      await band.goto(`${baseURL}/registry/`, { waitUntil: 'domcontentloaded' });
      const bandLive = await band.evaluate(() => document.documentElement.classList.contains('gallery-live'));
      if (!bandLive) {
        check(`band at ${label} (skipped — this browser reports no WebGL)`, true);
        await band.close();
        continue;
      }
      check(`band at ${label} replaces the strip`, await band.evaluate(() => (
        document.querySelectorAll('.strip-wrap').length === 0
        && document.querySelectorAll('[data-gallery-stage][data-gallery-embed]').length === 1
      )));
      await band.evaluate(() => document.querySelector('.gband')?.scrollIntoView({
        block: 'center',
        behavior: 'instant',
      }));
      let bandReady = true;
      try {
        await band.waitForSelector('.gband.is-ready', { timeout: 30000 });
      } catch {
        bandReady = false;
      }
      check(`band at ${label} mounts the scene`, bandReady);
      if (bandReady) {
        check(
          `band at ${label} rails all twelve`,
          await band.locator('.gband .rail__tick').count() === 12,
        );
        check(
          `band at ${label} rail carries the wallet discs`,
          await band.locator('.gband .rail__tick img').count() === 12,
        );
        // At rest the current sign stands proud, so touch and keyboard
        // readers see the selection without a cursor.
        const restWidths = await band.locator('.gband .rail__tick').evaluateAll((ticks) => {
          const current = ticks.findIndex((t) => t.getAttribute('aria-current') === 'true');
          const visualWidth = (tick) => tick.querySelector('picture').getBoundingClientRect().width;
          const hitWidths = ticks.map((tick) => tick.getBoundingClientRect().width);
          return {
            current: visualWidth(ticks[current]),
            other: visualWidth(ticks[(current + 5) % ticks.length]),
            hitSpread: Math.max(...hitWidths) - Math.min(...hitWidths),
          };
        });
        check(
          `band at ${label} rests with the current disc proud`,
          restWidths.current > restWidths.other + 1,
          `${restWidths.current.toFixed(1)} vs ${restWidths.other.toFixed(1)}`,
        );
        check(
          `band at ${label} keeps stable rail hit areas`,
          restWidths.hitSpread <= 0.5,
          restWidths.hitSpread.toFixed(1),
        );
        if (label === '1280') {
          // The dock wave: the disc under the cursor swells most, its
          // neighbour less, and the far end of the rail is untouched.
          const target = band.locator('.gband .rail__tick').nth(6);
          const spot = await target.boundingBox();
          const rail = band.locator('.gband .rail');
          // Use a real pointer move so :hover and the pointer event agree.
          // A synthetic event can leave the rail reporting :hover=false,
          // allowing its resting state to replace the test wave.
          await band.mouse.move(
            spot.x + (spot.width / 2),
            spot.y + (spot.height / 2),
          );
          await band.waitForTimeout(420);
          const wave = await band.locator('.gband .rail__tick').evaluateAll((ticks) => (
            ticks.map((t) => t.querySelector('picture').getBoundingClientRect().width)
          ));
          check(
            `band at ${label} rail magnifies like a dock`,
            wave[6] > wave[5] && wave[5] > wave[4] && wave[4] > wave[0] && wave[6] > wave[0] * 1.4,
            wave.map((w) => w.toFixed(0)).join(','),
          );
          const waveBounds = await rail.evaluate((element) => {
            const railBox = element.getBoundingClientRect();
            const pictureBox = element
              .querySelector('.rail__tick[data-index="6"] picture')
              .getBoundingClientRect();
            return { railTop: railBox.top, pictureTop: pictureBox.top };
          });
          check(
            `band at ${label} keeps the hovered disc inside the rail`,
            waveBounds.pictureTop >= waveBounds.railTop + 1,
            `${waveBounds.pictureTop.toFixed(1)} vs ${waveBounds.railTop.toFixed(1)}`,
          );
          check(
            `band at ${label} the wave names its disc`,
            await band.evaluate(() => {
              const el = document.querySelector('.gband__name');
              return Boolean(el?.classList.contains('is-visible'))
                && Boolean(el?.classList.contains('is-rail'));
            }),
          );
          await band.mouse.move(0, 0);
          await band.waitForTimeout(420);

          // The same rail under a reduced motion preference: the current sign
          // still stands proud, but the cursor raises no wave.
          const calm = await newPage({
            viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce',
          });
          await calm.goto(`${baseURL}/registry/`, { waitUntil: 'domcontentloaded' });
          await calm.evaluate(() => document.querySelector('.gband')?.scrollIntoView({
            block: 'center',
            behavior: 'instant',
          }));
          try {
            await calm.waitForSelector('.gband.is-ready', { timeout: 30000 });
            const calmSpot = await calm.locator('.gband .rail__tick').nth(6).boundingBox();
            await calm.mouse.move(calmSpot.x + (calmSpot.width / 2), calmSpot.y + (calmSpot.height / 2));
            await calm.waitForTimeout(420);
            const calmWave = await calm.locator('.gband .rail__tick').evaluateAll((ticks) => (
              ticks.map((t) => Math.round(t.querySelector('picture').getBoundingClientRect().width))
            ));
            const proud = calmWave.filter((w) => w > Math.min(...calmWave) + 1).length;
            check(
              'band withholds the wave under reduced motion',
              proud <= 1,
              calmWave.join(','),
            );
          } catch {
            check('band withholds the wave under reduced motion (skipped — no scene)', true);
          }
          await calm.close();
        }
        // The band opens on the seasonal sign, so the walk target is chosen
        // relative to it — two along, wrapping — rather than a fixed tick.
        const startIndex = Number(
          await band.locator('.rail__tick[aria-current="true"]').getAttribute('data-index'),
        );
        const targetIndex = (startIndex + 2) % 12;
        const targetTick = band.locator(`.rail__tick[data-index="${targetIndex}"]`);
        const targetName = (await targetTick.getAttribute('aria-label')).split(',')[0];
        await targetTick.click();
        await band.waitForTimeout(1100);
        check(
          `band at ${label} rail drives the Museum label`,
          await band.locator('[data-museum-sign]').getAttribute('data-museum-sign')
            === targetName.toLowerCase(),
          targetName,
        );
        check(
          `band at ${label} leaves the address bar alone`,
          await band.evaluate(() => window.location.hash === ''),
        );
        const openerLabel = (await band.locator('.gband__open').innerText()).trim();
        check(
          `band at ${label} opener names the selection`,
          openerLabel === `View ${targetName}`,
          openerLabel,
        );
        // The second press on the current tick is the keyboard door into the
        // record: the card opens in place, the band grows for the viewing.
        await targetTick.click();
        let cardOpen = true;
        try {
          await band.waitForSelector('.gcard.is-open', { timeout: 8000 });
        } catch {
          cardOpen = false;
        }
        check(`band at ${label} opens the record in place`, cardOpen);
        await band.evaluate((name) => { window.__bandTargetName = name; }, targetName);
        if (cardOpen) {
          check(
            `band at ${label} card names the piece and its market`,
            await band.evaluate(() => {
              const name = document.querySelector('[data-card-name]')?.textContent;
              const state = document.querySelector('[data-market-state]')?.textContent ?? '';
              const risk = document.querySelector('.gcard .card__risk')?.textContent ?? '';
              return name === window.__bandTargetName
                && /market context/i.test(state)
                && risk.includes('can lose all market value');
            }),
          );
          check(
            `band at ${label} grows for the viewing`,
            await band.evaluate(() => document.querySelector('.gband')?.classList.contains('is-open')),
          );
          check(
            `band at ${label} still leaves the address bar alone`,
            await band.evaluate(() => window.location.hash === ''),
          );
          await band.keyboard.press('Escape');
          await band.waitForTimeout(900);
          check(
            `band at ${label} Escape returns the sculpture`,
            await band.evaluate(() => !document.querySelector('.gband')?.classList.contains('is-open')),
          );
          check(
            `band at ${label} Escape immediately restores the opener`,
            (await band.locator('.gband__open').innerText()).trim() === `View ${targetName}`,
            (await band.locator('.gband__open').innerText()).trim(),
          );
        }
        if (label === '1280') {
          // Hover is the invitation: the figure lifts, the cursor says
          // pointer, and the label names the piece. Where exactly the
          // focused figure sits on the canvas shifts a few pixels with the
          // runner's layout, so the probe sweeps likely body points and
          // stops at the first hit rather than trusting one coordinate.
          const box = await band.locator('.gband canvas').boundingBox();
          if (box) {
            let hovered = false;
            const points = [];
            for (const fy of [0.42, 0.5, 0.34, 0.58, 0.26]) {
              for (const fx of [0.5, 0.46, 0.54]) points.push([fx, fy]);
            }
            for (const [fx, fy] of points) {
              await band.mouse.move(box.x + (box.width * fx), box.y + (box.height * fy));
              await band.waitForTimeout(250);
              hovered = await band.evaluate(() => (
                document.querySelector('.gband canvas')?.style.cursor === 'pointer'
              ));
              if (hovered) break;
            }
            check(
              `band at ${label} hover invites the click`,
              hovered && await band.evaluate(() => {
                const labelEl = document.querySelector('.gband__name');
                return Boolean(labelEl?.classList.contains('is-visible'))
                  && /Lot/.test(labelEl?.textContent ?? '');
              }),
              hovered ? 'hit' : 'no point hovered',
            );
          }
        }
        check(
          `band at ${label} removes the duplicate featured card`,
          await band.evaluate(() => document.querySelector('#featured-sign') === null),
        );
      }
      check(`band at ${label} runtime is error-free`, bandErrors.length === 0, bandErrors.join(' | '));
      if (OUT) await band.screenshot({ path: `${OUT}/registry-band-${label}.png` });
      await band.close();
    }
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
