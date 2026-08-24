import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

async function requireMarkers(relativePath, markers) {
  const source = await readFile(resolve(repoRoot, relativePath), 'utf8').catch(() => null);
  if (source === null) {
    failures.push(`${relativePath}: missing`);
    return;
  }
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${relativePath}: missing ${JSON.stringify(marker)}`);
  }
}

await requireMarkers('src/layouts/Base.astro', [
  "import '../styles/site-footer.css';",
  "import SiteFooter from '../components/SiteFooter.astro';",
  '<SiteFooter',
]);
await requireMarkers('src/components/SiteFooter.astro', [
  '<footer class="zfooter">',
  'class="zfooter__language"',
  'class="zfooter__colophon"',
  'data-footer-guide',
  '.webp?surface=site-footer',
]);
await requireMarkers('src/app.jsx', [
  'function SiteEnd(',
  'className="zfooter zfooter--static"',
  'className="zfooter__language"',
  'className="zfooter__colophon"',
  '.webp?surface=site-footer',
]);
await requireMarkers('scripts/site-footer.mjs', [
  'export function renderStaticFooter(',
  '.webp?surface=site-footer',
]);

for (const generator of [
  'scripts/build-archive.mjs',
  'scripts/build-registry-hub.mjs',
  'scripts/build-sign-pages.mjs',
]) {
  await requireMarkers(generator, [
    "from './site-footer.mjs';",
    'SITE_FOOTER_STYLESHEET',
    'renderStaticFooter(',
  ]);
}

for (const fullPage of [
  'public/archive/index.html',
  'public/registry/index.html',
  'public/thesis/index.html',
  ...[
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ].map((sign) => `public/registry/${sign}/index.html`),
]) {
  await requireMarkers(fullPage, [
    '<link rel="stylesheet" href="/assets/site-footer.css" />',
    'class="zfooter zfooter--static"',
    'class="zfooter__language"',
    'class="zfooter__colophon"',
  ]);
}

for (const compactPage of [
  'public/astrofolio/index.html',
  'public/registry/technical/index.html',
  'public/sdk/index.html',
  'public/sdk/examples/simastry-aura/index.html',
  'public/terminal/index.html',
  'public/terminal/markets/index.html',
]) {
  await requireMarkers(compactPage, [
    '<link rel="stylesheet" href="/assets/site-footer.css" />',
    'class="zfooter zfooter--compact"',
  ]);
}

if (failures.length) {
  console.error(`site-footer-standard: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exitCode = 1;
} else {
  console.log('site-footer-standard: canonical footer sources and surfaces verified');
}
