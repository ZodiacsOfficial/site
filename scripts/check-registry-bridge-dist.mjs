import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distRoot = resolve(repoRoot, 'dist');
const birthdays = JSON.parse(await readFile(
  new URL('../src/data/birthdays.json', import.meta.url),
  'utf8',
));
const locales = ['en', 'es', 'pt', 'fr', 'it'];
const signs = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const failures = [];

function localePrefix(locale) {
  return locale === 'en' ? '' : `/${locale}`;
}

function htmlPath(locale, route) {
  return resolve(distRoot, locale === 'en' ? route : `${locale}/${route}`, 'index.html');
}

function bridgeBands(html, surface) {
  return [...html.matchAll(
    new RegExp(`<aside\\b[^>]*data-registry-bridge-surface="${surface}"[^>]*>[\\s\\S]*?<\\/aside>`, 'gu'),
  )].map((match) => match[0]);
}

for (const [slug, entry] of Object.entries(birthdays.days)) {
  for (const locale of locales) {
    const html = await readFile(htmlPath(locale, `birthday/${slug}`), 'utf8');
    const bands = bridgeBands(html, 'birthday');
    const label = `${locale}/birthday/${slug}`;
    if (entry.sign) {
      if (bands.length !== 1) failures.push(`${label}: expected one birthday bridge, found ${bands.length}`);
      const band = bands[0] ?? '';
      if (!band.includes(`data-registry-bridge-sign="${entry.sign}"`)) {
        failures.push(`${label}: bridge sign does not match ${entry.sign}`);
      }
      if (!band.includes(`data-registry-bridge-locale="${locale}"`)) {
        failures.push(`${label}: bridge locale does not match ${locale}`);
      }
      if (!band.includes(`href="/registry/${entry.sign}/"`)) {
        failures.push(`${label}: missing /registry/${entry.sign}/`);
      }
    } else if (bands.length !== 0) {
      failures.push(`${label}: cusp page rendered ${bands.length} birthday bridge(s)`);
    }

    if (entry.cusp) {
      const chartHref = `${localePrefix(locale)}/birth-chart/`;
      if (!html.includes(`href="${chartHref}"`)) {
        failures.push(`${label}: cusp page lost its ${chartHref} chart CTA`);
      }
    }
  }
}

for (const sign of signs) {
  for (const locale of locales) {
    const html = await readFile(htmlPath(locale, sign), 'utf8');
    const bands = bridgeBands(html, 'sign_guide');
    const label = `${locale}/${sign}`;
    if (bands.length !== 1) failures.push(`${label}: expected one sign-guide bridge, found ${bands.length}`);
    const band = bands[0] ?? '';
    if (!band.includes(`data-registry-bridge-sign="${sign}"`)
      || !band.includes(`href="/registry/${sign}/"`)) {
      failures.push(`${label}: sign-guide bridge does not resolve to ${sign}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`registry-bridge-dist: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('registry-bridge-dist: 1,830 birthday pages and 60 sign guides match the record/cusp contract');
