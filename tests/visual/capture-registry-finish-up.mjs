import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './browser.mjs';
import { projectRoot, withPreview } from './preview-server.mjs';

const label = process.argv[2];
if (!['before', 'after'].includes(label)) {
  throw new Error('Usage: node tests/visual/capture-registry-finish-up.mjs before|after');
}

const outputDir = resolve(projectRoot, 'docs/evidence/finish-up');
await mkdir(outputDir, { recursive: true });

await withPreview({ port: 4333 }, async (baseURL) => {
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    headless: true,
    args: STABLE_CHROMIUM_ARGS,
  });

  try {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile-320', width: 320, height: 900 },
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        locale: 'en-US',
        reducedMotion: 'reduce',
        timezoneId: 'UTC',
      });
      const page = await context.newPage();

      await page.goto(`${baseURL}/registry/#official-twelve`, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      });
      await page.addStyleTag({
        content: '*,*::before,*::after{animation:none!important;transition:none!important}',
      });

      const lots = page.locator('.cat__lots');
      await lots.waitFor({ state: 'visible', timeout: 15_000 });
      await lots.locator('img').evaluateAll(async (images) => {
        images.forEach((image) => { image.loading = 'eager'; });
        await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
      });

      await lots.screenshot({
        path: resolve(outputDir, `registry-catalog-${label}-${viewport.name}.png`),
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

console.log(`Registry catalogue ${label} evidence written to ${outputDir}`);
