/**
 * Phase 5A proof rendering.
 *
 * Uses the repository's own browser tooling — playwright-core from the
 * committed lockfile driving a system Chromium through
 * tests/visual/browser.mjs — so no rendering dependency is added.
 *
 * Renders every board at 360/390/781/1280, asserts zero horizontal
 * overflow at each width, and writes a manifest of what was captured.
 *
 * Two documented exemptions keep the render count tractable:
 *   - og-card renders once, at its canonical 1200×630 share size;
 *   - reduced-motion, keyboard-focus and zoom-200 render at 390 and 1280.
 *
 *   node docs/phase5/people-pilot/tools/render-proofs.mjs
 */
import { readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..', '..');
const BOARDS = join(REPO, 'docs', 'acceptance', 'phase5-people');

const { chromium } = await import(pathToFileURL(join(REPO, 'node_modules/playwright-core/index.mjs')).href);
const { findChromium, STABLE_CHROMIUM_ARGS } = await import(
  pathToFileURL(join(REPO, 'tests/visual/browser.mjs')).href
);

const ALL_WIDTHS = [360, 390, 781, 1280];
const NARROW_SET = new Set(['reduced-motion', 'keyboard-focus', 'zoom-200']);
const OG = 'og-card';

const results = [];
const failures = [];

const browser = await chromium.launch({
  executablePath: await findChromium(),
  headless: true,
  args: STABLE_CHROMIUM_ARGS,
});

const boards = (await readdir(BOARDS))
  .filter((name) => name.endsWith('.html'))
  .map((name) => name.replace(/\.html$/u, ''))
  .sort();

try {
  for (const name of boards) {
    const widths = name === OG ? [1200] : NARROW_SET.has(name) ? [390, 1280] : ALL_WIDTHS;
    for (const width of widths) {
      const zoom = name === 'zoom-200';
      const context = await browser.newContext({
        viewport: { width: zoom ? Math.round(width / 2) : width, height: 900 },
        deviceScaleFactor: zoom ? 2 : 1,
        reducedMotion: name === 'reduced-motion' ? 'reduce' : 'no-preference',
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      page.on('requestfailed', (request) => errors.push(`request failed: ${request.url()}`));
      await page.goto(pathToFileURL(join(BOARDS, `${name}.html`)).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);

      const overflow = await page.evaluate(() => (
        document.documentElement.scrollWidth - document.documentElement.clientWidth
      ));
      const file = `${name}-${width}.png`;
      await page.screenshot({ path: join(BOARDS, file), fullPage: true });

      const ok = overflow <= 0 && errors.length === 0;
      results.push({ board: name, width, file, overflow, errors: errors.length });
      if (!ok) failures.push({ board: name, width, overflow, errors });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(
  join(BOARDS, 'manifest.json'),
  `${JSON.stringify({
    schema: 'zodiacs.phase5.proof-manifest.v1',
    tooling: 'playwright-core (repository lockfile) + system Chromium via tests/visual/browser.mjs',
    widths: ALL_WIDTHS,
    exemptions: {
      'og-card': 'rendered once at its canonical 1200×630 share size',
      'reduced-motion / keyboard-focus / zoom-200': 'rendered at 390 and 1280 only',
    },
    boards: boards.length,
    renders: results.length,
    captures: results,
  }, null, 2)}\n`,
  'utf8',
);

for (const result of results) {
  console.log(`${result.overflow <= 0 && result.errors === 0 ? 'PASS' : 'FAIL'} ${result.file} — overflow ${result.overflow}px, ${result.errors} page errors`);
}
console.log(`\n${boards.length} boards, ${results.length} renders.`);
if (failures.length > 0) {
  console.error(`Proof rendering FAILED — ${failures.length} captures.`);
  for (const failure of failures) {
    console.error(`  ${failure.board}@${failure.width}: overflow ${failure.overflow}px; ${failure.errors.join(' | ')}`);
  }
  process.exitCode = 1;
} else {
  console.log('Proof rendering PASSED — zero horizontal overflow, zero page errors.');
}
