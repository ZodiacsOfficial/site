import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(repo, 'dist');
const failures = [];
const fail = (message) => failures.push(message);

const signs = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const core = [
  '/', '/tools/', '/birth-chart/', '/compatibility/', '/moon-sign/',
  '/rising-sign/', '/moon-phase/', '/saturn-return/', '/transits/',
  '/baby-zodiac/', '/profile/', '/methodology/', '/privacy/', '/disclosure/',
  '/404/', ...signs.map((sign) => `/${sign}/`),
];
const expectedRoutes = core.map((path) => `/ru${path}`);
const expectedFiles = new Map(expectedRoutes.map((route) => [
  route,
  resolve(dist, route.replace(/^\//, ''), 'index.html'),
]));

const htmlFiles = (await readdir(dist, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => resolve(entry.parentPath, entry.name));
const russianFiles = htmlFiles.filter((file) => {
  const rel = relative(dist, file);
  return rel === `ru${sep}index.html` || rel.startsWith(`ru${sep}`);
});

for (const [route, file] of expectedFiles) {
  try {
    await stat(file);
  } catch {
    fail(`${route}: expected private preview page is missing`);
  }
}
if (russianFiles.length !== expectedRoutes.length) {
  fail(`Russian preview has ${russianFiles.length} HTML files; expected exactly ${expectedRoutes.length}`);
}

const englishLeakPhrases = [
  'Free birth chart', 'Get your free birth chart', 'Birth date', 'Birth time',
  'Birthplace', 'House system', 'Saved charts', 'Open menu', 'Close menu',
  'The twelve signs', 'Start with your chart', 'Compatibility calculator',
  'Moon sign calculator', 'Rising sign calculator', 'Check your transits',
  'Your profile', 'Privacy policy', 'How we calculate', 'Page not found',
  'This page does not exist', 'Read the pair', 'Ask Zodiacs',
];
const publicCorePaths = new Set(core.filter((path) => path !== '/' && path !== '/404/'));

function hasSilentEnglishCoreLink(html) {
  const anchors = html.matchAll(/<a\b([^>]*?)\bhref=(["'])(.*?)\2([^>]*)>([\s\S]*?)<\/a>/giu);
  for (const match of anchors) {
    const href = match[3].replace(/^https:\/\/zodiacs\.org/u, '').split(/[?#]/u, 1)[0];
    if (!publicCorePaths.has(href)) continue;
    const attrs = `${match[1]} ${match[4]}`;
    const visiblyMarked = /пока по-английски/u.test(match[5]);
    const languageChoice = /\bhreflang=["']en["']/u.test(attrs) && /\blang=["']en["']/u.test(attrs);
    const explained = /Материал пока доступен по-английски/u.test(attrs);
    if (!languageChoice && !visiblyMarked && !explained) return true;
  }
  return false;
}

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/giu, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/giu, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/giu, ' ')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&(?:nbsp|amp|quot|#39|lt|gt);/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

for (const file of russianFiles) {
  const rel = relative(dist, file);
  const html = await readFile(file, 'utf8');
  const text = visibleText(html);
  if (!/<html\b[^>]*\blang=["']ru["']/u.test(html)) fail(`${rel}: html lang is not ru`);
  if (/<html\b[^>]*\bdir=/u.test(html)) fail(`${rel}: Russian LTR page must not emit dir`);
  if (!/<meta\s+name=["']robots["']\s+content=["']noindex, follow, max-image-preview:large["']/u.test(html)) {
    fail(`${rel}: missing the exact noindex preview directive`);
  }
  if (/<link\b[^>]*rel=["']alternate["'][^>]*hreflang=/u.test(html)) {
    fail(`${rel}: private preview emitted hreflang`);
  }
  if (!/<meta\b[^>]*property=["']og:locale["'][^>]*content=["']ru_RU["']/u.test(html)) {
    fail(`${rel}: Russian Open Graph locale is missing`);
  }
  if (/href=["'](?:https:\/\/zodiacs\.org)?\/ar(?:\/|["'#?])/u.test(html)) {
    fail(`${rel}: Arabic route leaked into Russian preview`);
  }
  if (hasSilentEnglishCoreLink(html)) {
    fail(`${rel}: a Russian core-page link silently points to the English route`);
  }
  for (const phrase of englishLeakPhrases) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) {
      fail(`${rel}: English interface phrase leaked — ${phrase}`);
    }
  }
  const cyrillic = (text.match(/[А-Яа-яЁё]/gu) ?? []).length;
  const latin = (text.match(/[A-Za-z]/gu) ?? []).length;
  if (cyrillic < 80 || cyrillic / Math.max(1, cyrillic + latin) < 0.58) {
    fail(`${rel}: visible copy is not predominantly Russian (${cyrillic} Cyrillic / ${latin} Latin letters)`);
  }
}

for (const file of htmlFiles.filter((file) => !russianFiles.includes(file))) {
  const html = await readFile(file, 'utf8');
  const rel = relative(dist, file);
  if (/href=["'](?:https:\/\/zodiacs\.org)?\/ru(?:\/|["'#?])/u.test(html)) {
    fail(`${rel}: private Russian preview leaked into public navigation`);
  }
  if (/hreflang=["']ru["']/u.test(html) || /Русский/u.test(html)) {
    fail(`${rel}: Russian selector or alternate leaked into a public page`);
  }
}

for (const discovery of ['sitemap.xml', 'search-index.json']) {
  const value = await readFile(resolve(dist, discovery), 'utf8');
  if (/(?:https:\/\/zodiacs\.org)?\/ru(?:\/|["'?#<])/u.test(value)) {
    fail(`${discovery}: Russian preview leaked into discovery output`);
  }
}

const fontFiles = [
  'golos-text-cyr-a.woff2', 'golos-text-cyr-b.woff2',
  'eb-garamond-cyrillic-500-normal.woff2', 'jetbrains-mono-cyrillic-400-500.woff2',
];
let fontBytes = 0;
for (const name of fontFiles) {
  try {
    fontBytes += (await stat(resolve(repo, 'public/fonts', name))).size;
  } catch {
    fail(`Russian font is missing: ${name}`);
  }
}
if (fontBytes > 80 * 1024) fail(`Russian font payload is ${fontBytes} bytes; budget is 81920`);
for (const license of ['OFL-golos-text.txt', 'OFL-eb-garamond.txt', 'OFL-jetbrains-mono.txt']) {
  try {
    const value = await readFile(resolve(repo, 'public/fonts', license), 'utf8');
    if (!value.includes('SIL OPEN FONT LICENSE Version 1.1')) fail(`${license}: incomplete OFL text`);
  } catch {
    fail(`Russian font license is missing: ${license}`);
  }
}

if (failures.length) {
  console.error(`i18n-r1-ru: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`i18n-r1-ru: OK — ${russianFiles.length} private noindex routes, no discovery leaks, ${fontBytes} font bytes`);
