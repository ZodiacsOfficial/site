/**
 * Hero-video connection gate against the production build.
 *
 *   npm run build
 *   OUT_DIR=/tmp/hero-video node tests/hero-video-drive.mjs
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const OUT = process.env.OUT_DIR ?? null;
const cases = [
  { name: '3g', effectiveType: '3g', saveData: false, reducedMotion: 'no-preference', attaches: true },
  { name: '2g', effectiveType: '2g', saveData: false, reducedMotion: 'no-preference', attaches: false },
  { name: 'save-data', effectiveType: '4g', saveData: true, reducedMotion: 'no-preference', attaches: false },
  { name: 'reduced-motion', effectiveType: '4g', saveData: false, reducedMotion: 'reduce', attaches: false },
];

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

if (OUT) await mkdir(OUT, { recursive: true });

await withPreview({ port: 4402 }, async (baseURL) => {
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    args: STABLE_CHROMIUM_ARGS,
  });

  try {
    for (const testCase of cases) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      await page.emulateMedia({ reducedMotion: testCase.reducedMotion });
      await page.addInitScript(({ effectiveType, saveData }) => {
        Object.defineProperty(navigator, 'connection', {
          configurable: true,
          value: Object.freeze({ effectiveType, saveData }),
        });
        window.__heroLoadCount = 0;
        const nativeLoad = HTMLMediaElement.prototype.load;
        HTMLMediaElement.prototype.load = function trackedHeroLoad() {
          window.__heroLoadCount += 1;
          return nativeLoad.call(this);
        };
      }, { effectiveType: testCase.effectiveType, saveData: testCase.saveData });

      await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
      const video = page.locator('[data-hero-video]');
      await video.waitFor({ state: 'visible' });
      if (testCase.attaches) {
        await page.waitForFunction(() => document.querySelector('[data-hero-video]')?.dataset.sourcesAttached === 'true');
      } else {
        await page.waitForTimeout(300);
      }

      const state = await video.evaluate((element) => ({
        attached: element.dataset.sourcesAttached === 'true',
        poster: element.getAttribute('poster'),
        sources: [...element.querySelectorAll('source')].map((source) => source.getAttribute('src')),
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      }));
      check(`${testCase.name}: source gate`, state.attached === testCase.attaches, JSON.stringify(state.sources));
      check(
        `${testCase.name}: source attributes follow the gate`,
        testCase.attaches ? state.sources.every(Boolean) : state.sources.every((source) => source === null),
        JSON.stringify(state.sources),
      );
      check(
        `${testCase.name}: poster remains visible`,
        state.poster === '/assets/hero/zodiacs-hero-poster.avif' && state.width > 0 && state.height > 0,
        `${state.poster} · ${state.width.toFixed(0)}×${state.height.toFixed(0)}`,
      );

      if (testCase.name === '3g') {
        const before = await page.evaluate(() => window.__heroLoadCount);
        await video.dispatchEvent('error');
        await page.waitForFunction(() => {
          const element = document.querySelector('[data-hero-video]');
          return element?.dataset.sourceRetry === 'true'
            && [...element.querySelectorAll('source')].every((source) => source.hasAttribute('src'));
        });
        const afterRetry = await page.evaluate(() => window.__heroLoadCount);
        await video.dispatchEvent('error');
        await page.waitForTimeout(100);
        const afterSecondError = await page.evaluate(() => window.__heroLoadCount);
        check('3g: media error reattaches sources once', afterRetry >= before + 2, `${before} → ${afterRetry}`);
        check('3g: second media error does not retry again', afterSecondError === afterRetry, `${afterRetry} → ${afterSecondError}`);
      }

      if (OUT) await page.locator('.hero__frame').screenshot({ path: `${OUT}/hero-${testCase.name}.png` });
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

let failed = 0;
for (const result of results) {
  if (!result.ok) failed += 1;
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` · ${result.detail}` : ''}`);
}
console.log(failed ? `\n${failed} FAILURE${failed === 1 ? '' : 'S'}` : `\nALL ${results.length} CHECKS PASS`);
process.exit(failed ? 1 : 0);
