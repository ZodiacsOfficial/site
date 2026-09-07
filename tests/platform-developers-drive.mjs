import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const source = await readFile(new URL('../src/lib/sky-api/examples/today.mjs', import.meta.url), 'utf8');
const starter = JSON.parse(await readFile(new URL('../public/examples/platform-starter.json', import.meta.url), 'utf8'));
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
      const paths = page.getByRole('navigation', { name: 'Developer integration paths', exact: true });
      for (const [name, href] of [
        ['Calculate locally', '/developers/examples/#natal'],
        ['Fetch shared sky data', '#sky-data'],
        ['Embed a tool', '/widgets/'],
        ['Use hosted computation', '/developers/support/#hosted'],
      ]) {
        assert.equal(await paths.getByRole('link', { name, exact: true }).getAttribute('href'), href);
      }
      await page.screenshot({ path: resolve(output, `developer-entry-${width}.png`) });
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

      await page.getByRole('link', { name: 'Compare support, runtime requirements, and known limits', exact: true }).click();
      await page.waitForURL('**/developers/support/');
      await page.waitForLoadState('networkidle');
      const matrix = page.getByRole('region', { name: 'Local engine support matrix', exact: true });
      assert.equal(await matrix.locator('tbody tr').count(), 10);
      assert.equal(await page.locator('footer.zfooter').count(), 1);
      assert.equal(await page.locator('#hosted').textContent(), 'Personalized hosted computation · planned');
      await page.getByRole('link', { name: 'candidate changelog', exact: true }).focus();
      await page.keyboard.press('Tab');
      assert.equal(await matrix.evaluate((element) => element === document.activeElement), true);
      assert.equal(await matrix.evaluate((element) => {
        const style = getComputedStyle(element);
        return element.matches(':focus-visible') && style.outlineStyle !== 'none'
          && Number.parseFloat(style.outlineWidth) >= 2;
      }), true);
      for (const zoom of width === 1280 ? [1, 2] : [1]) {
        // CSS zoom exercises enlarged text and layout reflow. This is explicitly
        // recorded as CSS zoom, not a claim about native browser zoom controls.
        await page.evaluate((value) => { document.documentElement.style.zoom = String(value); }, zoom);
        const supportLayout = await page.evaluate(() => ({
          width: innerWidth, pageWidth: document.documentElement.scrollWidth,
          zoom: getComputedStyle(document.documentElement).zoom,
          overflow: document.documentElement.scrollWidth > innerWidth,
          overlay: !!document.querySelector('astro-error-overlay'),
        }));
        assert.equal(supportLayout.overflow, false, `support matrix must reflow at ${width}px / CSS zoom ${zoom}`);
        assert.equal(supportLayout.overlay, false);
        assert.deepEqual(errors, []);
        await matrix.scrollIntoViewIfNeeded();
        await page.screenshot({ path: resolve(output, `developer-support-${width}-zoom${zoom}.png`) });
        checks.push({ route: '/developers/support/', cssZoom: zoom, keyboardFocus: true,
          canonicalFooter: true, ...supportLayout, pageErrors: [...errors] });
      }
      await page.evaluate(() => { document.documentElement.style.zoom = ''; });
      await page.getByRole('link', { name: 'Run the starter project', exact: true }).click();
      await page.waitForURL('**/developers/examples/');
      await page.waitForLoadState('networkidle');
      const setup = page.getByRole('region', { name: 'Starter setup commands', exact: true });
      const commands = await setup.locator('code').textContent();
      const artifactUrl = `https://raw.githubusercontent.com/ZodiacsOfficial/site/${starter.artifactCommit}/public/examples/${starter.file}`;
      assert.equal(await page.getByRole('link', { name: `Download starter ${starter.version} (.tgz)`, exact: true }).getAttribute('href'), artifactUrl);
      assert.ok(commands.includes(artifactUrl) && commands.includes(starter.sha256));
      assert.ok(commands.includes('npm ci --ignore-scripts --no-audit --no-fund'));
      assert.ok(commands.startsWith('( set -eu\n') && commands.endsWith('npm start\n)'));
      await page.getByRole('link', { name: `Download starter ${starter.version} (.tgz)`, exact: true }).focus();
      await page.keyboard.press('Tab');
      assert.equal(await setup.evaluate((element) => element === document.activeElement && element.matches(':focus-visible')), true);
      if (width === 390) {
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => document.querySelector('pre').scrollLeft > 0);
      }
      assert.equal(await page.locator('footer.zfooter').count(), 1);
      for (const id of ['natal', 'transits', 'widget']) assert.equal(await page.locator(`h2#${id}`).count(), 1);
      assert.deepEqual(errors, []);
      await writeFile(resolve(output, 'starter-setup.sh'), commands + '\n');
      for (const zoom of width === 1280 ? [1, 2] : [1]) {
        await page.evaluate((value) => { document.documentElement.style.zoom = String(value); window.scrollTo(0, 0); }, zoom);
        const examplesLayout = await page.evaluate(() => ({ width: innerWidth, pageWidth: document.documentElement.scrollWidth, overflow: document.documentElement.scrollWidth > innerWidth }));
        assert.equal(examplesLayout.overflow, false);
        await page.screenshot({ path: resolve(output, `developer-examples-${width}-zoom${zoom}.png`) });
        checks.push({ route: '/developers/examples/', cssZoom: zoom, keyboardFocus: true, canonicalFooter: true, artifactUrl, ...examplesLayout, pageErrors: [...errors] });
      }
      await context.close();
    }
  });
  const report = { capturedAt: new Date().toISOString(), browser: browser.version(), result: 'passed', checks };
  await writeFile(resolve(output, 'developers-browser.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
