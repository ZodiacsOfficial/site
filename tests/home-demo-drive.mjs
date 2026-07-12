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

        const ownsCenter = await target.evaluate((button) => {
          const box = button.getBoundingClientRect();
          return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2) === button;
        });
        check(`${width}px: ${body} owns its pointer center`, ownsCenter);

        await target.click();
        const caption = await page.locator('[data-demo-caption]').textContent();
        const pressed = await target.getAttribute('aria-pressed');
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
      const malformed = await allTargets.evaluateAll((buttons) => buttons
        .map((button) => button.getAttribute('data-demo-copy') ?? '')
        .filter((copy) => /\bshe (?:arrive|point|seat|remember)\b/i.test(copy)));
      check(`${width}px: third-person verbs agree`, malformed.length === 0, malformed.join(' | '));
      check(
        `${width}px: visitor conversion link stays second-person`,
        await page.locator('.demo__caption a').textContent() === 'Get your free birth chart →',
      );
      await page.close();
    }

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
