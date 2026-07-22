import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';

const args = process.argv.slice(2);
const argumentValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const baselineArg = argumentValue('--baseline');
const candidateArg = argumentValue('--candidate', 'dist');
if (!baselineArg) {
  console.error('Usage: node scripts/check-i18n-r0-parity.mjs --baseline /path/to/dist [--candidate dist]');
  process.exit(2);
}

const baseline = resolve(baselineArg);
const candidate = resolve(candidateArg);
const failures = [];
const hash = (value) => createHash('sha256').update(value).digest('hex');

function normalizeBuildManagedHtml(html) {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style data-r0-parity="build-managed"></style>')
    .replace(/\/_astro\/[A-Za-z0-9._-]+/g, '/_astro/__BUILD_ASSET__')
    .replace(/(<astro-island\b[^>]*\buid=)"[^"]+"/gi, '$1"__BUILD_UID__"')
    // Rising-sign pages intentionally calculate a current build-time ruler
    // receipt. Compare its surrounding markup, not its minute-sensitive sky.
    .replace(
      /(<dt\b[^>]*>)(?:Sun|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto) as of [^<]+(<\/dt><dd\b[^>]*>)[^<]+(<\/dd>)/gi,
      '$1__BUILD_TIME_RULER__$2__BUILD_TIME_POSITION__$3',
    );
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
      else if (entry.isFile()) output.set(relative(start, full), full);
    }
  }
  await walk(start);
  return output;
}

const baselineSitemap = await read(resolve(baseline, 'sitemap.xml'));
const candidateSitemap = await read(resolve(candidate, 'sitemap.xml'));
if (!baselineSitemap || !candidateSitemap || !baselineSitemap.equals(candidateSitemap)) {
  failures.push('sitemap.xml is not byte-identical');
}

let normalizedHtmlMatches = 0;
const baselineFiles = await filesBelow(baseline);
const candidateFiles = await filesBelow(candidate);
const htmlNames = new Set([
  ...[...baselineFiles.keys()].filter((name) => name.endsWith('.html')),
  ...[...candidateFiles.keys()].filter((name) => name.endsWith('.html')),
]);
for (const name of [...htmlNames].sort()) {
  const baselineHtml = baselineFiles.get(name) ? await read(baselineFiles.get(name)) : null;
  const candidateHtml = candidateFiles.get(name) ? await read(candidateFiles.get(name)) : null;
  if (!baselineHtml || !candidateHtml) {
    failures.push(`${name}: missing baseline or candidate HTML`);
    continue;
  }
  const before = normalizeBuildManagedHtml(baselineHtml.toString('utf8'));
  const after = normalizeBuildManagedHtml(candidateHtml.toString('utf8'));
  if (before !== after) {
    failures.push(`${name}: rendered markup changed outside build-managed style/assets`);
  } else {
    normalizedHtmlMatches += 1;
  }
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
      failures.push(`${directory}/${name}: Registry-wing bytes changed`);
    } else {
      exactWingFiles += 1;
    }
  }
}

if (failures.length) {
  console.error(`i18n-r0-parity: ${failures.length} failure(s)`);
  for (const failure of failures.slice(0, 30)) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`i18n-r0-parity: sitemap exact; ${normalizedHtmlMatches} HTML files byte-identical outside intentional stylesheet/build-asset and build-time sky fingerprints; ${exactWingFiles} Registry-wing files byte-identical`);
