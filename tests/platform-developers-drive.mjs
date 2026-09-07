import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const source = await readFile(new URL('../src/lib/sky-api/examples/today.mjs', import.meta.url), 'utf8');
const output = resolve(process.env.PLATFORM_BROWSER_EVIDENCE ?? 'tests/visual/artifacts/platform');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: await findChromium(), headless: true, args: STABLE_CHROMIUM_ARGS });
const checks = [];
try {
  await withPreview({ port: 4335 }, async (baseURL) => {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await page.goto(`${baseURL}/developers/`, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      const code = page.getByRole('region', { name: 'JavaScript quick start', exact: true });
      assert.equal(await code.locator('code').textContent(), source, 'displayed example must be the executed source');
      await page.getByRole('link', { name: 'chart calculation stays on the device', exact: true }).focus();
      await page.keyboard.press('Tab');
      assert.equal(await code.evaluate((element) => element === document.activeElement), true, 'Tab must reach the code scroller');
      if (width === 390) {
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => document.querySelector('.dev-code').scrollLeft > 0);
      }
      const layout = await code.evaluate((element) => ({
        viewport: innerWidth, pageWidth: document.documentElement.scrollWidth,
        codeWidth: element.clientWidth, codeScrollWidth: element.scrollWidth, codeScrollLeft: element.scrollLeft,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        overlay: !!document.querySelector('astro-error-overlay'),
      }));
      assert.equal(layout.pageWidth, width, 'code must not overflow the page');
      assert.equal(layout.reducedMotion, true);
      assert.equal(layout.overlay, false);
      assert.deepEqual(errors, []);
      await code.evaluate((element) => { element.scrollLeft = 0; });
      await page.screenshot({ path: resolve(output, `developers-${width}.png`) });
      checks.push({ width, sourceMatches: true, keyboardFocus: true, ...layout, pageErrors: errors });
      await context.close();
    }
  });
  const report = { capturedAt: new Date().toISOString(), browser: browser.version(), result: 'passed', checks };
  await writeFile(resolve(output, 'developers-browser.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
