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
        const navPage = await browser.newPage({ viewport: { width, height: 900 } });
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
          // The morph itself lasts 220ms. Leave a scheduling margin so slower
          // CI runners are measured at the settled X rather than one frame
          // before the transition completes.
          await navPage.waitForTimeout(320);
          const openState = await burger.evaluate((element, prefix) => {
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

    const homeMaterialPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const registryMaterialPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await Promise.all([
      homeMaterialPage.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' }),
      registryMaterialPage.goto(`${baseURL}/registry/`, { waitUntil: 'domcontentloaded' }),
    ]);
    const material = async (page, selector, lens) => {
      await page.evaluate((enabled) => document.documentElement.classList.toggle('zdx-lens', enabled), lens);
      // Let the Registry's existing 420ms button background transition settle
      // after switching between the Chromium lens and Safari/iOS fallback
      // recipes. Sampling mid-transition makes equivalent settled materials
      // serialize with different alpha values in Chromium.
      await page.waitForTimeout(480);
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
        const recordPage = await browser.newPage({ viewport: { width, height: 844 } });
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
    const initialFeaturedSlug = await desktop.locator('[data-featured-sign]').getAttribute('data-featured-sign');
    const initialBrowseHref = await desktop.locator('[data-registry-browse]').getAttribute('href');
    const initialNuggetHref = await desktop.locator('.nugget-link').getAttribute('href');
    check(
      'hero browse action follows the current-season featured record',
      initialBrowseHref === `/registry/${initialFeaturedSlug}/` && initialBrowseHref === initialNuggetHref,
      `${initialBrowseHref}/${initialNuggetHref}`,
    );
    const auraEnabled = await desktop.locator('meta[name="zodiacs-registry-aura-enabled"]').getAttribute('content') === '1';
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
        await desktop.locator('[data-registry-collection]').getAttribute('href') === '/registry/aura/',
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
