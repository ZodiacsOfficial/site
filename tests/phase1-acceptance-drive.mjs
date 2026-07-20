import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { phase1TemplateSourceSha256, sha256 } from './visual/phase1-evidence-contract.mjs';
import { withPreview } from './visual/preview-server.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactRoot = resolve(root, 'docs/acceptance/phase1/screenshots');
const payloadFiles = {
  daily: 'src/data/daily.json',
  dailyPublication: 'src/data/daily-publication.json',
  dailyPublicationManifest: 'src/data/daily-publication-manifest.json',
  horoscopeProgram: 'src/data/horoscope-program.json',
};
const payloadBytes = Object.fromEntries(await Promise.all(
  Object.entries(payloadFiles).map(async ([name, path]) => [name, await readFile(resolve(root, path))]),
));
const renderPayloadSha256 = Object.fromEntries(
  Object.entries(payloadBytes).map(([name, bytes]) => [name, sha256(bytes)]),
);
const daily = JSON.parse(payloadBytes.daily.toString('utf8'));
const publicationManifest = JSON.parse(payloadBytes.dailyPublicationManifest.toString('utf8'));
const templateSourceSha256 = await phase1TemplateSourceSha256(root);
let buildReceipt;
try {
  buildReceipt = JSON.parse(
    await readFile(resolve(root, 'dist/.phase1-build-receipt.json'), 'utf8'),
  );
} catch {
  throw new Error('Phase 1 acceptance requires a current production build. Run `npm run build` first.');
}
if (buildReceipt.schema !== 'zodiacs.phase1-build-receipt.v1'
  || buildReceipt.templateSourceSha256 !== templateSourceSha256
  || buildReceipt.dailyDate !== daily.date
  || buildReceipt.publicationCanonicalSha256 !== publicationManifest.publication.canonicalSha256
  || Object.entries(renderPayloadSha256).some(([name, digest]) => (
    buildReceipt.renderPayloadSha256?.[name] !== digest
  ))) {
  throw new Error('Phase 1 acceptance found a stale `dist` build. Run `npm run build` before capturing.');
}
const playwrightPackage = JSON.parse(
  await readFile(resolve(root, 'node_modules/playwright-core/package.json'), 'utf8'),
);
const fixedNow = `${daily.date}T12:00:00.000Z`;

const templates = [
  { name: 'today', path: '/today/' },
  { name: 'horoscopes-hub', path: '/horoscopes/' },
  { name: 'daily', path: '/horoscopes/aries/' },
  { name: 'tomorrow', path: '/horoscopes/aries/tomorrow/' },
  { name: 'weekly', path: '/horoscopes/aries/weekly/' },
  { name: 'monthly', path: '/horoscopes/aries/monthly/' },
  { name: 'love', path: '/horoscopes/aries/love/' },
  { name: 'career', path: '/horoscopes/aries/career/' },
  { name: 'yearly', path: '/horoscopes/aries/2027/' },
];

const viewports = [
  { name: '360', width: 360, height: 800 },
  { name: '1280', width: 1280, height: 900 },
];

await mkdir(artifactRoot, { recursive: true });
const executablePath = await findChromium();
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: STABLE_CHROMIUM_ARGS,
});
const browserVersion = await browser.version();

const captures = [];
let failures = 0;

try {
  await withPreview({ port: Number(process.env.PHASE1_ACCEPTANCE_PORT ?? 4331) }, async (baseURL) => {
    for (const template of templates) {
      for (const viewport of viewports) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 1,
          colorScheme: 'dark',
          locale: 'en-US',
          timezoneId: 'UTC',
          reducedMotion: 'no-preference',
        });
        const page = await context.newPage();
        page.setDefaultTimeout(20_000);
        page.setDefaultNavigationTimeout(30_000);
        const errors = [];
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(`console: ${message.text()}`);
        });
        page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
        await page.addInitScript((isoNow) => {
          const NativeDate = Date;
          const fixed = new NativeDate(isoNow).valueOf();
          class FixedDate extends NativeDate {
            constructor(...args) {
              super(...(args.length ? args : [fixed]));
            }
            static now() { return fixed; }
          }
          Object.setPrototypeOf(FixedDate, NativeDate);
          globalThis.Date = FixedDate;
        }, fixedNow);

        console.log(`CAPTURE ${template.name} @ ${viewport.width}: ${template.path}`);
        const response = await page.goto(`${baseURL}${template.path}`, { waitUntil: 'load' });
        await page.evaluate(() => Promise.race([
          document.fonts.ready,
          new Promise((resolveReady) => setTimeout(resolveReady, 10_000)),
        ]));
        const missingZodiacIcons = await page.evaluate(async () => {
          const waitForPaint = () => new Promise((resolvePaint) => requestAnimationFrame(() => resolvePaint()));
          for (const image of document.images) image.loading = 'eager';
          const step = Math.max(480, Math.floor(window.innerHeight * 0.8));
          for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await waitForPaint();
          }
          window.scrollTo(0, 0);
          await waitForPaint();
          await Promise.race([
            Promise.all([...document.images].map((image) => image.decode?.().catch(() => undefined))),
            new Promise((resolveImages) => setTimeout(resolveImages, 10_000)),
          ]);
          return [...document.images]
            .filter((image) => (image.currentSrc || image.src).includes('/assets/zodiac-icons/'))
            .filter((image) => !image.complete || image.naturalWidth === 0)
            .map((image) => image.currentSrc || image.src);
        });
        if (missingZodiacIcons.length > 0) {
          errors.push(`zodiac icons failed to load: ${missingZodiacIcons.join(', ')}`);
        }

        const layout = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          contentLength: document.body.innerText.trim().length,
          overlay: Boolean(document.querySelector('.vite-error-overlay, #webpack-dev-server-client-overlay')),
        }));
        const filename = `${template.name}-${viewport.name}.png`;
        const image = await page.screenshot({ fullPage: true, animations: 'disabled' });
        const png = PNG.sync.read(image);
        await writeFile(resolve(artifactRoot, filename), image);

        const capture = {
          template: template.name,
          path: template.path,
          viewport: { width: viewport.width, height: viewport.height },
          screenshot: {
            file: filename,
            width: png.width,
            height: png.height,
            sha256: sha256(image),
          },
          layout,
          errors,
          status: response?.status() ?? null,
        };
        captures.push(capture);

        const failureReasons = [
          ...(!response?.ok() ? [`HTTP ${response?.status() ?? 'unknown'}`] : []),
          ...(layout.contentLength < 100 ? ['meaningful content missing'] : []),
          ...(layout.overlay ? ['error overlay present'] : []),
          ...(layout.clientWidth !== viewport.width ? [`layout width ${layout.clientWidth} != ${viewport.width}`] : []),
          ...(layout.scrollWidth > layout.clientWidth ? [`horizontal overflow ${layout.scrollWidth} > ${layout.clientWidth}`] : []),
          ...(png.width !== viewport.width ? [`screenshot width ${png.width} != ${viewport.width}`] : []),
          ...(png.height !== layout.scrollHeight ? [`screenshot height ${png.height} != ${layout.scrollHeight}`] : []),
          ...errors,
        ];
        if (failureReasons.length > 0) {
          failures += 1;
          console.error(`FAIL ${template.name} @ ${viewport.width}: ${failureReasons.join('; ')}`);
        } else {
          console.log(`PASS ${template.name} @ ${viewport.width}: ${png.width}×${png.height}`);
        }
        await context.close();
      }
    }
  });
} finally {
  await browser.close();
}

const manifest = {
  schema: 'zodiacs.phase1-visual-acceptance.v3',
  driver: {
    name: 'playwright-core',
    version: playwrightPackage.version,
    script: 'tests/phase1-acceptance-drive.mjs',
    contractVersion: 3,
  },
  capturedAt: new Date().toISOString(),
  browser: `Chromium ${browserVersion}`,
  dailyDate: daily.date,
  publicationCanonicalSha256: publicationManifest.publication.canonicalSha256,
  templateSourceSha256,
  renderPayloadSha256,
  buildReceipt,
  captures,
};
await writeFile(resolve(artifactRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

if (failures > 0) {
  throw new Error(`Phase 1 visual acceptance failed in ${failures}/${captures.length} captures.`);
}
console.log(`Phase 1 visual acceptance: PASS — ${captures.length}/${captures.length} exact-width captures`);
