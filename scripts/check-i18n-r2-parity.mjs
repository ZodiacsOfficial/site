import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const argumentValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const baselineArg = argumentValue('--baseline');
const candidateArg = argumentValue('--candidate', 'dist');
if (!baselineArg) {
  console.error('Usage: node scripts/check-i18n-r2-parity.mjs --baseline /path/to/r1/dist [--candidate dist]');
  process.exit(2);
}

const baseline = resolve(baselineArg);
const candidate = resolve(candidateArg);
const failures = [];
const hash = (value) => createHash('sha256').update(value).digest('hex');

function normalizeBuildManagedHtml(html) {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, '<style data-r2-parity="build-managed"></style>')
    .replace(/\/_astro\/[A-Za-z0-9._-]+/gu, '/_astro/__BUILD_ASSET__')
    .replace(/(<astro-island\b[^>]*\buid=)"[^"]+"/giu, '$1"__BUILD_UID__"')
    .replace(
      /(<dt\b[^>]*>)(?:Sun|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto) as of [^<]+(<\/dt><dd\b[^>]*>)[^<]+(<\/dd>)/giu,
      '$1__BUILD_TIME_RULER__$2__BUILD_TIME_POSITION__$3',
    );
}

function normalizeApprovedRussianDiscovery(html) {
  return html
    .replace(/<link\b[^>]*\bhreflang=["']ru["'][^>]*>/giu, '')
    .replace(/<meta\b[^>]*\bproperty=["']og:locale:alternate["'][^>]*\bcontent=["']ru_RU["'][^>]*>/giu, '')
    .replace(
      /<span\b[^>]*class=["']footer__language-option["'][^>]*><span\b[^>]*class=["']footer__language-separator["'][^>]*>·<\/span><a\b[^>]*\bhreflang=["']ru["'][^>]*>Русский<\/a><\/span>/giu,
      '',
    );
}

function normalizeSitemap(xml) {
  return xml
    .replace(
      /  <url>\n    <loc>https:\/\/zodiacs\.org\/ru\/[^<]*<\/loc>\n[\s\S]*?  <\/url>\n/gu,
      '',
    )
    .replace(/    <xhtml:link\b[^>]*\bhreflang="ru"[^>]*\/>\n/gu, '');
}

async function read(path) {
  try { return await readFile(path); } catch { return null; }
}

async function filesBelow(root, directory = '.') {
  const start = resolve(root, directory);
  const output = new Map();
  async function walk(path) {
    let entries;
    try { entries = await readdir(path, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = resolve(path, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) output.set(relative(start, full).replaceAll('\\', '/'), full);
    }
  }
  await walk(start);
  return output;
}

const baselineSitemap = await read(resolve(baseline, 'sitemap.xml'));
const candidateSitemap = await read(resolve(candidate, 'sitemap.xml'));
if (!baselineSitemap || !candidateSitemap
    || normalizeSitemap(baselineSitemap.toString('utf8')) !== normalizeSitemap(candidateSitemap.toString('utf8'))) {
  failures.push('sitemap.xml changed beyond the approved Russian URL blocks and hreflang lines');
}

let normalizedHtmlMatches = 0;
const baselineFiles = await filesBelow(baseline);
const candidateFiles = await filesBelow(candidate);
const htmlNames = new Set([
  ...[...baselineFiles.keys()].filter((name) => name.endsWith('.html') && !name.startsWith('ru/')),
  ...[...candidateFiles.keys()].filter((name) => name.endsWith('.html') && !name.startsWith('ru/')),
]);
for (const name of [...htmlNames].sort()) {
  const beforeBytes = baselineFiles.get(name) ? await read(baselineFiles.get(name)) : null;
  const afterBytes = candidateFiles.get(name) ? await read(candidateFiles.get(name)) : null;
  if (!beforeBytes || !afterBytes) {
    failures.push(`${name}: missing baseline or candidate HTML`);
    continue;
  }
  const before = normalizeApprovedRussianDiscovery(normalizeBuildManagedHtml(beforeBytes.toString('utf8')));
  const after = normalizeApprovedRussianDiscovery(normalizeBuildManagedHtml(afterBytes.toString('utf8')));
  if (before !== after) failures.push(`${name}: non-Russian rendered output changed beyond approved discovery markup`);
  else normalizedHtmlMatches += 1;
}

const baselineSearch = await read(resolve(baseline, 'search-index.json'));
const candidateSearch = await read(resolve(candidate, 'search-index.json'));
if (!baselineSearch || !candidateSearch || !baselineSearch.equals(candidateSearch)) {
  failures.push('search-index.json changed even though Russian search is deferred');
}

let exactWingFiles = 0;
for (const directory of ['registry', 'sdk', 'archive', 'thesis']) {
  const beforeFiles = await filesBelow(baseline, directory);
  const afterFiles = await filesBelow(candidate, directory);
  const names = new Set([...beforeFiles.keys(), ...afterFiles.keys()]);
  for (const name of names) {
    const before = beforeFiles.get(name) ? await read(beforeFiles.get(name)) : null;
    const after = afterFiles.get(name) ? await read(afterFiles.get(name)) : null;
    if (!before || !after || hash(before) !== hash(after)) {
      failures.push(`${directory}/${name}: protected wing bytes changed`);
    } else {
      exactWingFiles += 1;
    }
  }
}

if (failures.length) {
  console.error(`i18n-r2-parity: ${failures.length} failure(s)`);
  for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `i18n-r2-parity: sitemap normalized exact; ${normalizedHtmlMatches} non-Russian HTML files unchanged outside approved RU discovery markup; search index exact; ${exactWingFiles} Registry-wing files byte-identical`,
);
