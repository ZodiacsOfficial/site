/**
 * Homepage chart-preview drive against the production build.
 *
 *   npm run build
 *   node tests/home-demo-drive.mjs
 */
import { chromium } from 'playwright-core';
import { setTimeout as wait } from 'node:timers/promises';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const EXPECTED_HUES = [
  '--sign-leo',
  '--sign-cancer',
  '--sign-gemini',
  '--sign-taurus',
  '--sign-aries',
  '--sign-sagittarius',
  '--sign-capricorn',
  '--sign-aquarius',
  '--sign-pisces',
  '--sign-scorpio',
];

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

async function settledBox(locator) {
  let previous = await locator.boundingBox();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await wait(100);
    const current = await locator.boundingBox();
    if (previous && current
      && Math.abs(current.x - previous.x) < 0.25
      && Math.abs(current.y - previous.y) < 0.25) return current;
    previous = current;
  }
  return previous;
}

async function documentTop(locator) {
  return locator.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
}

await withPreview({ port: 4394 }, async (baseURL) => {
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    args: STABLE_CHROMIUM_ARGS,
  });

  try {
    for (const width of [1440, 375]) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
      });
      await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
      const demo = page.locator('[data-demo-preview]');
      const stage = page.locator('.demo__wheel-stage');
      await stage.evaluate((element) => element.scrollIntoView({ block: 'center' }));
      const reveal = page.locator('.reveal.is-in', { has: demo });
      await reveal.waitFor({ state: 'visible' });
      await settledBox(stage);

      check(
        `${width}px: preview is promoted ahead of the zero-input daily section`,
        await page.locator('#chart-preview').evaluate((section) => {
          const daily = Array.from(document.querySelectorAll('section')).find((candidate) =>
            candidate.querySelector('.tbs'));
          return !daily || Boolean(section.compareDocumentPosition(daily) & Node.DOCUMENT_POSITION_FOLLOWING);
        }),
      );
      check(
        `${width}px: Sun is the useful default instead of an empty chart`,
        await demo.getAttribute('data-active-id') === 'body:Sun'
          && await demo.getAttribute('data-active-layer') === 'planets'
          && await page.locator('[data-demo-highlight][data-active="true"]').count() === 1,
      );

      const jumps = page.locator('[data-demo-jump]');
      check(`${width}px: three explicit preview starting points render`, await jumps.count() === 3);
      const jumpHeights = await jumps.evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
      check(
        `${width}px: preview controls meet the 44px touch floor`,
        jumpHeights.every((height) => height >= 44),
        jumpHeights.map((height) => height.toFixed(1)).join(', '),
      );

      const chartFrame = page.locator('.demo__wheel');
      const initialChartTop = await documentTop(chartFrame);
      const houseJump = page.locator('[data-demo-jump^="house:"]');
      await houseJump.click();
      await wait(70);
      const houseChartTop = await documentTop(chartFrame);
      check(
        `${width}px: house preview illuminates a wedge and updates the live explanation`,
        await demo.getAttribute('data-active-layer') === 'houses'
          && await page.locator('[data-demo-highlight-kind="house"][data-active="true"]').count() === 1
          && await page.locator('[data-demo-kind-output]').textContent() === 'Life area',
      );

      const aspectJump = page.locator('[data-demo-jump^="aspect:"]');
      const aspectUrl = page.url();
      await aspectJump.click();
      await wait(70);
      const aspectChartTop = await documentTop(chartFrame);
      check(
        `${width}px: aspect preview traces one connection with two endpoints`,
        await demo.getAttribute('data-active-layer') === 'aspects'
          && await page.locator('[data-demo-highlight-kind="aspect"][data-active="true"] .demo__focus-node').count() === 2
          && await page.locator('[data-demo-kind-output]').textContent() === 'Connection',
      );
      check(`${width}px: preview exploration does not mutate the page URL`, page.url() === aspectUrl);
      check(
        `${width}px: chart frame stays pinned across preview states`,
        Math.max(
          Math.abs(houseChartTop - initialChartTop),
          Math.abs(aspectChartTop - initialChartTop),
        ) < 0.75,
        [initialChartTop, houseChartTop, aspectChartTop].map((top) => top.toFixed(2)).join(', '),
      );

      await jumps.first().focus();
      await jumps.first().press('Enter');
      const keyboardTransitions = await Promise.all([
        jumps.first().evaluate((node) => getComputedStyle(node).transitionDuration),
        page.locator('.demo__wheel-stage .wheel__body').first().evaluate((node) => getComputedStyle(node).transitionDuration),
        page.locator('[data-demo-highlight="body:Sun"]').evaluate((node) => getComputedStyle(node).transitionDuration),
      ]);
      check(
        `${width}px: keyboard selection is immediate`,
        await demo.getAttribute('data-demo-motion') === 'instant'
          && await demo.getAttribute('data-active-id') === 'body:Sun'
          && keyboardTransitions.every((duration) => duration === '0s'),
        keyboardTransitions.join(', '),
      );

      await stage.evaluate((element) => element.scrollIntoView({ block: 'center' }));
      await settledBox(stage);

      const targets = page.locator('[data-demo-body]');
      const count = await targets.count();
      check(`${width}px: all planet targets render`, count === 11, String(count));

      for (let index = 0; index < count; index += 1) {
        const target = targets.nth(index);
        const body = await target.getAttribute('data-demo-body');
        const copy = await target.getAttribute('data-demo-copy');
        const marker = page.locator(`[data-preview-body="${body}"] circle`).first();

        await settledBox(target);
        const [targetBox, markerBox] = await Promise.all([
          target.boundingBox(),
          marker.boundingBox(),
        ]);
        const centerDelta = targetBox && markerBox
          ? Math.hypot(
              targetBox.x + targetBox.width / 2 - markerBox.x - markerBox.width / 2,
              targetBox.y + targetBox.height / 2 - markerBox.y - markerBox.height / 2,
            )
          : Number.POSITIVE_INFINITY;
        check(
          `${width}px: ${body} target follows its fanned marker`,
          centerDelta < 0.75,
          `${centerDelta.toFixed(3)}px`,
        );

        const centerOwner = await target.evaluate((button) => {
          const box = button.getBoundingClientRect();
          const owner = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return {
            owns: owner === button,
            tag: owner?.tagName ?? '',
            className: typeof owner?.className === 'string' ? owner.className : owner?.getAttribute('class') ?? '',
            demoId: owner?.getAttribute('data-demo-id') ?? '',
          };
        });
        check(
          `${width}px: ${body} owns its pointer center`,
          centerOwner.owns,
          `${centerOwner.tag}.${centerOwner.className} ${centerOwner.demoId}`,
        );

        await target.click();
        const caption = await page.locator('[data-demo-caption]').textContent();
        const pressed = await target.getAttribute('aria-pressed');
        if (index === 0) {
          check(
            `${width}px: pointer selection uses the explanatory arrival cue`,
            await demo.getAttribute('data-demo-motion') === 'animated',
          );
        }
        check(
          `${width}px: ${body} click selects its own caption`,
          pressed === 'true' && caption === copy && caption?.startsWith(`Her ${body} `),
          `${pressed} · ${caption ?? ''}`,
        );
      }

      const allTargets = page.locator('[data-demo-copy]');
      const secondPerson = await allTargets.evaluateAll((buttons) => buttons
        .map((button) => button.getAttribute('data-demo-copy') ?? '')
        .filter((copy) => /\b(?:you|your)\b/i.test(copy)));
      check(`${width}px: Frida captions stay third-person`, secondPerson.length === 0, secondPerson.join(' | '));
      const calloutSecondPerson = await page.locator('.demo__callout p').evaluateAll((paragraphs) => paragraphs
        .map((paragraph) => paragraph.textContent ?? '')
        .filter((copy) => /\b(?:you|your)\b/i.test(copy)));
      check(
        `${width}px: Frida big-three preview stays third-person`,
        calloutSecondPerson.length === 0,
        calloutSecondPerson.join(' | '),
      );
      const malformed = await allTargets.evaluateAll((buttons) => buttons
        .map((button) => button.getAttribute('data-demo-copy') ?? '')
        .filter((copy) => /\bshe (?:arrive|point|seat|remember)\b/i.test(copy)));
      check(`${width}px: third-person verbs agree`, malformed.length === 0, malformed.join(' | '));
      check(
        `${width}px: visitor conversion link stays second-person`,
        await page.locator('.demo__cta').textContent() === 'See my birth chart↗',
      );
      await page.close();
    }

    const reducedPage = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    await reducedPage.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
    const reducedDemo = reducedPage.locator('[data-demo-preview]');
    const reducedAspect = reducedPage.locator('[data-demo-jump^="aspect:"]');
    await reducedAspect.click();
    const reducedHighlight = reducedPage.locator('[data-demo-highlight-kind="aspect"][data-active="true"]');
    const reducedStyle = await reducedHighlight.evaluate((node) => {
      const style = getComputedStyle(node);
      return { transitionProperty: style.transitionProperty, transform: style.transform };
    });
    check(
      'reduced motion: preview keeps a gentle opacity cue without movement',
      await reducedDemo.getAttribute('data-demo-motion') === 'reduced'
        && reducedStyle.transitionProperty === 'opacity'
        && reducedStyle.transform === 'none',
      JSON.stringify(reducedStyle),
    );
    await reducedPage.close();

    const planetPage = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    await planetPage.goto(`${baseURL}/learn/planets/`, { waitUntil: 'networkidle' });
    const discHues = await planetPage.locator('.cluster-row__glyph .pglyph--disc').evaluateAll((discs) =>
      discs.map((disc) => disc.getAttribute('style')?.match(/--sign:var\((--sign-[^)]+)\)/)?.[1] ?? ''),
    );
    check(
      'planet discs consume the existing ruler-sign CSS variables',
      JSON.stringify(discHues) === JSON.stringify(EXPECTED_HUES),
      discHues.join(', '),
    );
    await planetPage.close();
  } finally {
    await browser.close();
  }
});

let failed = 0;
for (const result of results) {
  if (!result.ok) failed += 1;
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` · ${result.detail}` : ''}`);
}
console.log(failed ? `\n${failed} FAILURES` : `\nALL ${results.length} CHECKS PASS`);
process.exit(failed ? 1 : 0);
