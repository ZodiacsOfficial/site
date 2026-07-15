/*
 * Static integrity checks over the built site (dist/). Zero dependencies;
 * run from the repo root after `npm run build`:
 *
 *   node scripts/check-dist.mjs
 *
 * Checks:
 *   1. registry/zodiacs.registry.json — 12 assets, solana + base
 *      representation (with address) on each.
 *   2. archive/feed.json — JSON Feed 1.1 shape, non-empty, dated items.
 *   3. archive/rss.xml — XML declaration, balanced tags, item count
 *      matches feed.json.
 *   4. assets/pulse.json + assets/distribution.json — parse and shape.
 *   5. Every href/src in built *.html — site-relative and relative paths
 *      must resolve to a file; internal fragment links must point at an
 *      existing id.
 *   6. search-index.json — valid, populated, sorted, and every path resolves;
 *      deferred search/WebMCP assets exist with their expected fingerprints.
 *   7. sitemap.xml — unique dated locs resolve, exclude noindex, and cover
 *      every indexable built page's same-origin canonical.
 *   8. Root artifacts the outside world depends on are present.
 *   9. Source sky, transit, and daily snapshots cover the build date.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join, relative, sep } from 'node:path';
import {
  extractPageMetadata, htmlFileToPath, isEnglishHtml,
  searchIndexShapeFailures, shouldIndexPath,
} from './search-index-lib.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(repo, 'dist');
const failures = [];
const fail = (msg) => { failures.push(msg); };
let searchIndexCount = 0;

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

if (!(await exists(root))) {
  console.error('check-dist: dist/ not found — run `npm run build` first.');
  process.exit(1);
}

// ---- 1. Registry ----------------------------------------------------------
const registry = JSON.parse(await readFile(resolve(root, 'registry/zodiacs.registry.json'), 'utf8'));
if (!Array.isArray(registry.assets) || registry.assets.length !== 12) {
  fail(`registry: expected 12 assets, found ${registry.assets?.length}`);
}
for (const asset of registry.assets ?? []) {
  for (const chain of ['solana', 'base']) {
    const rep = asset.representations?.find((r) => r.chain === chain);
    if (!rep?.address) fail(`registry: ${asset.sign} missing ${chain} address`);
  }
}

// ---- 2. JSON Feed ----------------------------------------------------------
const feed = JSON.parse(await readFile(resolve(root, 'archive/feed.json'), 'utf8'));
if (!String(feed.version || '').includes('jsonfeed.org/version/1.1')) {
  fail(`feed.json: unexpected version ${feed.version}`);
}
if (!Array.isArray(feed.items) || feed.items.length === 0) {
  fail('feed.json: no items');
}
for (const item of feed.items ?? []) {
  for (const key of ['id', 'url', 'title', 'date_published']) {
    if (!item[key]) fail(`feed.json: item ${item.id || '?'} missing ${key}`);
  }
}

// ---- 3. RSS ----------------------------------------------------------------
const rss = await readFile(resolve(root, 'archive/rss.xml'), 'utf8');
if (!rss.startsWith('<?xml')) fail('rss.xml: missing XML declaration');
{
  const stack = [];
  const tagRe = /<\/?([A-Za-z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^"'>])*)>/g;
  let m;
  while ((m = tagRe.exec(rss)) !== null) {
    const [full, name, attrs] = m;
    if (full.startsWith('<?') || full.startsWith('<!')) continue;
    if (full.startsWith('</')) {
      const open = stack.pop();
      if (open !== name) fail(`rss.xml: tag mismatch — expected </${open}>, found </${name}>`);
    } else if (!attrs.trimEnd().endsWith('/')) {
      stack.push(name);
    }
  }
  if (stack.length) fail(`rss.xml: unclosed tags — ${stack.join(', ')}`);
  const itemCount = (rss.match(/<item>/g) || []).length;
  if (itemCount !== (feed.items?.length ?? 0)) {
    fail(`rss.xml: ${itemCount} items vs feed.json ${feed.items?.length}`);
  }
}

// ---- 3b. New-wing RSS feeds --------------------------------------------------
for (const { file, minItems } of [
  { file: 'feeds/horoscopes.xml', minItems: 12 },
  { file: 'feeds/daily-sky.xml', minItems: 1 },
  { file: 'feeds/almanac.xml', minItems: 1 },
]) {
  const path = resolve(root, file);
  if (!(await exists(path))) {
    fail(`${file}: missing`);
    continue;
  }
  const xml = await readFile(path, 'utf8');
  if (!xml.startsWith('<?xml')) fail(`${file}: no XML declaration`);
  if (!xml.includes('<rss version="2.0"')) fail(`${file}: not RSS 2.0`);
  const items = (xml.match(/<item>/g) || []).length;
  if (items < minItems) fail(`${file}: ${items} items, expected >= ${minItems}`);
  for (const m of xml.matchAll(/<link>([^<]+)<\/link>/g)) {
    if (!m[1].startsWith('https://zodiacs.org/')) fail(`${file}: non-absolute link ${m[1]}`);
  }
  for (const m of xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)) {
    if (Number.isNaN(Date.parse(m[1]))) fail(`${file}: bad pubDate ${m[1]}`);
  }
}

// ---- 4. Data snapshots ------------------------------------------------------
const pulse = JSON.parse(await readFile(resolve(root, 'assets/pulse.json'), 'utf8'));
if (!pulse.capturedAt) fail('pulse.json: missing capturedAt');
if (await exists(resolve(root, 'assets/distribution.json'))) {
  const dist = JSON.parse(await readFile(resolve(root, 'assets/distribution.json'), 'utf8'));
  if (!dist.capturedAt) fail('distribution.json: missing capturedAt');
  if (!dist.signs || typeof dist.signs !== 'object') fail('distribution.json: missing signs');
  for (const [sign, d] of Object.entries(dist.signs ?? {})) {
    for (const key of ['top1Pct', 'top10Pct', 'top20Pct']) {
      const v = d[key];
      if (v !== null && (typeof v !== 'number' || v < 0 || v > 100)) {
        fail(`distribution.json: ${sign}.${key} out of range (${v})`);
      }
    }
  }
}

// ---- 5. Internal links + fragments in built HTML -----------------------------
async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(path));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

function targetPath(urlPath) {
  const clean = urlPath.split(/[?#]/)[0];
  if (!clean) return null;
  const abs = resolve(root, clean.replace(/^\//, ''));
  return clean.endsWith('/') ? join(abs, 'index.html') : abs;
}

function isInsideDist(path) {
  return path === root || path.startsWith(`${root}${sep}`);
}

const idCache = new Map();
async function hasId(filePath, id) {
  if (!idCache.has(filePath)) {
    idCache.set(filePath, await readFile(filePath, 'utf8'));
  }
  const html = idCache.get(filePath);
  if (html.includes(`id="${id}"`) || html.includes(`id='${id}'`)) return true;
  // The registry wing landing renders its sections client-side; ids live in
  // the compiled bundle (JSX id="x" compiles to id: "x").
  if (filePath === resolve(root, 'registry/index.html')) {
    const bundlePath = resolve(root, 'assets/app.js');
    if (!idCache.has(bundlePath)) {
      idCache.set(bundlePath, await readFile(bundlePath, 'utf8'));
    }
    const bundle = idCache.get(bundlePath);
    return bundle.includes(`id: "${id}"`) || bundle.includes(`id:"${id}"`) || bundle.includes(`id="${id}"`);
  }
  return false;
}

async function hasGlossaryTermId(filePath, id) {
  if (!idCache.has(filePath)) {
    idCache.set(filePath, await readFile(filePath, 'utf8'));
  }
  const html = idCache.get(filePath);
  return html.includes(`<dt id="${id}"`) || html.includes(`<dt id='${id}'`);
}

const files = await htmlFiles(root);
const refRe = /(?:href|src)="([^"]+)"/g;
for (const file of files) {
  const html = await readFile(file, 'utf8');
  const rel = relative(root, file);
  let m;
  while ((m = refRe.exec(html)) !== null) {
    const value = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:|#|\/\/)/.test(value)) continue;
    if (value.includes('${')) continue; // inline-script template, not markup
    let target;
    if (value.startsWith('/')) {
      target = targetPath(value);
    } else {
      const abs = resolve(dirname(file), value.split(/[?#]/)[0]);
      if (!abs.startsWith(root)) { fail(`${rel}: reference escapes dist — ${value}`); continue; }
      target = value.split(/[?#]/)[0].endsWith('/') || abs === root ? join(abs, 'index.html') : abs;
    }
    if (!target) continue;
    if (!(await exists(target))) {
      fail(`${rel}: broken reference ${value}`);
      continue;
    }
    const fragment = value.includes('#') ? value.split('#')[1] : null;
    if (fragment && target.endsWith('.html') && !(await hasId(target, fragment))) {
      fail(`${rel}: missing fragment target ${value}`);
    }
  }
}

// ---- 5b. Search index -------------------------------------------------------
// The search dialog ships as a stable public URL (see build-search-ui.mjs);
// the inline nav loader imports it at runtime, so a missing bundle would
// fail silently in the wild.
const searchUiPath = resolve(root, 'assets/search-ui.js');
if (!(await exists(searchUiPath))) {
  fail('search-ui: missing assets/search-ui.js');
} else {
  const searchUi = await readFile(searchUiPath, 'utf8');
  if (!searchUi.includes('openSearch') || !searchUi.includes('zsearch')) {
    fail('search-ui: assets/search-ui.js does not look like the search dialog bundle');
  }
}

const webMcpPath = resolve(root, 'assets/webmcp-register.js');
if (!(await exists(webMcpPath))) {
  fail('webmcp: missing assets/webmcp-register.js');
} else {
  const webMcp = await readFile(webMcpPath, 'utf8');
  for (const fingerprint of ['zodiacs.search', 'INVALID_INPUT', 'INDEX_UNAVAILABLE']) {
    if (!webMcp.includes(fingerprint)) {
      fail(`webmcp: assets/webmcp-register.js is missing ${fingerprint}`);
    }
  }
}

for (const relativePath of ['index.html', 'aries/index.html']) {
  const html = await readFile(resolve(root, relativePath), 'utf8');
  if (!html.includes("import('/assets/webmcp-register.js')")) {
    fail(`webmcp: ${relativePath} is missing the English feature detector`);
  }
}
for (const relativePath of [
  'es/index.html',
  'es/aries/index.html',
  'registry/index.html',
  'thesis/index.html',
  'sdk/index.html',
  'archive/index.html',
]) {
  const html = await readFile(resolve(root, relativePath), 'utf8');
  if (html.includes('/assets/webmcp-register.js')) {
    fail(`webmcp: ${relativePath} must not register English tools`);
  }
}

// The assistant follows the same stable, lazy-bundle contract as search. A
// missing artifact would leave every static launcher inert without a build
// error, so keep it inside the distribution gate.
const assistantUiPath = resolve(root, 'assets/assistant-ui.js');
const assistantCssPath = resolve(root, 'assets/assistant-ui.css');
if (!(await exists(assistantUiPath))) {
  fail('assistant-ui: missing assets/assistant-ui.js');
} else {
  const assistantUi = await readFile(assistantUiPath, 'utf8');
  if (
    !assistantUi.includes('openAssistant') ||
    !assistantUi.includes('zassistant') ||
    !assistantUi.includes('/assets/assistant-ui.css')
  ) {
    fail('assistant-ui: assets/assistant-ui.js does not look like the assistant dialog bundle');
  }
}
if (!(await exists(assistantCssPath))) {
  fail('assistant-ui: missing assets/assistant-ui.css');
} else {
  const assistantCss = await readFile(assistantCssPath, 'utf8');
  if (!assistantCss.includes('.zassistant') || !assistantCss.includes('.zassistant__panel')) {
    fail('assistant-ui: assets/assistant-ui.css does not look like the assistant dialog stylesheet');
  }
}

const searchIndexPath = resolve(root, 'search-index.json');
if (!(await exists(searchIndexPath))) {
  fail('search-index: missing search-index.json');
} else {
  let searchIndex;
  let searchIndexParsed = false;
  try {
    searchIndex = JSON.parse(await readFile(searchIndexPath, 'utf8'));
    searchIndexParsed = true;
  } catch (error) {
    fail(`search-index: invalid JSON — ${error.message}`);
  }

  if (searchIndexParsed) {
    searchIndexCount = Array.isArray(searchIndex) ? searchIndex.length : 0;
    for (const message of searchIndexShapeFailures(searchIndex)) {
      fail(`search-index: ${message}`);
    }

    if (Array.isArray(searchIndex)) {
      const indexedTermFragments = new Set();
      let indexedTermEntries = 0;
      for (const [position, entry] of searchIndex.entries()) {
        if (typeof entry?.path !== 'string' || !entry.path.startsWith('/')) continue;
        const [pagePath, encodedFragment] = entry.path.split('#', 2);
        const target = targetPath(pagePath);
        if (!target || !isInsideDist(target)) {
          fail(`search-index: entry ${position} escapes dist — ${entry.path}`);
          continue;
        }
        if (!(await exists(target))) {
          fail(`search-index: entry ${position} does not resolve — ${entry.path}`);
          continue;
        }

        if (entry.kind === 'term' && (pagePath !== '/learn/glossary/' || !encodedFragment)) {
          fail(`search-index: term entry ${position} is not a glossary fragment — ${entry.path}`);
        }
        if (encodedFragment) {
          if (entry.kind !== 'term' || pagePath !== '/learn/glossary/') {
            fail(`search-index: fragment entry ${position} is not a glossary term — ${entry.path}`);
            continue;
          }
          let fragment;
          try {
            fragment = decodeURIComponent(encodedFragment);
          } catch {
            fail(`search-index: entry ${position} has invalid fragment encoding — ${entry.path}`);
            continue;
          }
          indexedTermEntries += 1;
          if (indexedTermFragments.has(fragment)) {
            fail(`search-index: duplicate glossary term anchor #${fragment}`);
          }
          indexedTermFragments.add(fragment);
          if (!target.endsWith('.html') || !(await hasGlossaryTermId(target, fragment))) {
            fail(`search-index: entry ${position} has no glossary term anchor — ${entry.path}`);
          }
        }
      }

      const glossaryPath = resolve(root, 'learn/glossary/index.html');
      if (await exists(glossaryPath)) {
        if (!idCache.has(glossaryPath)) {
          idCache.set(glossaryPath, await readFile(glossaryPath, 'utf8'));
        }
        const glossaryHtml = idCache.get(glossaryPath);
        const glossaryTermIds = new Set(
          [...glossaryHtml.matchAll(/<dt\b[^>]*\bid=(["'])([^"']+)\1/gi)].map((match) => match[2]),
        );
        if (indexedTermEntries !== glossaryTermIds.size) {
          fail(
            `search-index: ${indexedTermEntries} indexed terms vs ${glossaryTermIds.size} glossary anchors`,
          );
        }
        for (const id of glossaryTermIds) {
          if (!indexedTermFragments.has(id)) fail(`search-index: missing glossary term #${id}`);
        }
      }

      // Reverse completeness: every indexable EN page in dist must be IN the
      // index. Without this, a regression in the exclusion predicates could
      // silently drop hundreds of pages and still pass the entry-count floor.
      const indexedPaths = new Set(
        searchIndex
          .filter((entry) => typeof entry?.path === 'string' && !entry.path.includes('#'))
          .map((entry) => entry.path),
      );
      for (const file of files) {
        const rel = relative(root, file).split(sep).join('/');
        const pagePath = htmlFileToPath(rel);
        if (!pagePath || !shouldIndexPath(pagePath)) continue;
        const html = idCache.get(file) ?? (await readFile(file, 'utf8'));
        if (!isEnglishHtml(html)) continue;
        if (extractPageMetadata(html).noindex) continue;
        if (!indexedPaths.has(pagePath)) {
          fail(`search-index: indexable page missing from the index — ${pagePath}`);
        }
      }

      if (await exists(webMcpPath)) {
        try {
          const webMcp = await import(`${pathToFileURL(webMcpPath).href}?dist-check`);
          const fetch = async () => ({ ok: true, json: async () => searchIndex });
          for (const [query, expectedPath] of [
            ['birth charts', '/birth-chart/'],
            ['trines', '/learn/aspects/trine/'],
            ['Aries', '/aries/'],
            ['eclipses', '/eclipses/'],
          ]) {
            const envelope = await webMcp.executeWebMcpSearch({ query }, { fetch });
            const topThree = envelope.ok
              ? envelope.data.results.slice(0, 3).map((entry) => entry.path)
              : [];
            if (!topThree.includes(expectedPath)) {
              fail(`webmcp: ${query} did not place ${expectedPath} in its top three`);
            }
          }
          for (const query of ['registry', 'thesis', 'astrofolio', 'aries record']) {
            const envelope = await webMcp.executeWebMcpSearch({ query }, { fetch });
            const leaked = envelope.ok && envelope.data.results.some((entry) => (
              entry.kind === 'registry'
              || /^\/(?:registry|thesis|sdk|archive|collect)(?:\/|$)/.test(entry.path)
            ));
            if (leaked) fail(`webmcp: ${query} returned a wing entry`);
          }
        } catch (error) {
          fail(`webmcp: deferred asset could not execute — ${error.message}`);
        }
      }
    }
  }
}

// ---- 5c. Share-card images (og:image / twitter:image) -------------------------
// These live in content="…" attributes as absolute URLs, so the href/src
// pass above never sees them — yet a broken share card fails silently in
// the wild. Every referenced card must exist in dist.
const ogRe = /(?:property="og:image"|name="twitter:image")\s+content="([^"]+)"/g;
for (const file of files) {
  const html = idCache.get(file) ?? (await readFile(file, 'utf8'));
  const rel = relative(root, file);
  for (const m of html.matchAll(ogRe)) {
    let path;
    try {
      const url = new URL(m[1], 'https://zodiacs.org');
      if (url.origin !== 'https://zodiacs.org') {
        fail(`${rel}: share image on foreign origin — ${m[1]}`);
        continue;
      }
      path = url.pathname;
    } catch {
      fail(`${rel}: unparsable share image URL — ${m[1]}`);
      continue;
    }
    const target = targetPath(path);
    if (!target || !(await exists(target))) {
      fail(`${rel}: missing share image ${m[1]}`);
    }
  }
}

// ---- 6. Sitemap --------------------------------------------------------------
const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
if (!sitemap.startsWith('<?xml')) fail('sitemap.xml: missing XML declaration');
const sitemapLocs = new Set();
for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const url = new URL(m[1]);
  if (url.origin !== 'https://zodiacs.org') {
    fail(`sitemap.xml: unexpected origin ${m[1]}`);
    continue;
  }
  if (sitemapLocs.has(url.pathname)) fail(`sitemap.xml: duplicate loc ${url.pathname}`);
  sitemapLocs.add(url.pathname);
  const target = targetPath(url.pathname);
  if (!(await exists(target))) {
    fail(`sitemap.xml: loc has no file — ${m[1]}`);
    continue;
  }
  if (target.endsWith('.html')) {
    const html = idCache.get(target) ?? (await readFile(target, 'utf8'));
    if (hasNoindex(html)) fail(`sitemap.xml: noindex page included — ${m[1]}`);
  }
}
for (const block of sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
  const loc = block[1].match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '?';
  const lastmod = block[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
  if (!lastmod || !/^\d{4}-\d{2}-\d{2}$/.test(lastmod) || Number.isNaN(Date.parse(`${lastmod}T00:00:00Z`))) {
    fail(`sitemap.xml: ${loc} has invalid or missing lastmod`);
  }
}

function attr(tag, name) {
  return tag.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, 'i'))?.slice(1).find(Boolean) ?? null;
}

function hasNoindex(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].some((match) =>
    attr(match[0], 'name')?.toLowerCase() === 'robots' &&
    attr(match[0], 'content')?.toLowerCase().split(/\s*,\s*/).includes('noindex'));
}

function canonicalHref(html) {
  const tag = [...html.matchAll(/<link\b[^>]*>/gi)].find((match) =>
    attr(match[0], 'rel')?.toLowerCase().split(/\s+/).includes('canonical'));
  return tag ? attr(tag[0], 'href') : null;
}

// Coordinated indexing baseline (2026-07-15): compatibility prose remains
// English-only under D9, while birthdays, Chinese zodiac, and the Registry
// disclosure ship on every locale rail. Keep exact counts so sitemap drift
// fails loudly.
const sitemapPolicy = {
  total: 2318,
  compatibilityPairs: 78,
  birthdays: 1830,
  chineseZodiac: 65,
  disclosures: 5,
  translatedBlocks: 2025,
};
const indexedFamilies = [
  { label: 'compatibility pairs', pattern: /^\/compatibility\/[a-z]+-[a-z]+\/$/, expected: sitemapPolicy.compatibilityPairs, localized: false },
  { label: 'birthdays', pattern: /^\/(?:(?:es|pt|fr|it)\/)?birthday\/[a-z]+-\d{1,2}\/$/, expected: sitemapPolicy.birthdays, localized: true },
  { label: 'Chinese zodiac', pattern: /^\/(?:(?:es|pt|fr|it)\/)?learn\/chinese-zodiac(?:\/[a-z]+)?\/$/, expected: sitemapPolicy.chineseZodiac, localized: true },
  { label: 'disclosures', pattern: /^\/(?:(?:es|pt|fr|it)\/)?disclosure\/$/, expected: sitemapPolicy.disclosures, localized: true },
];

if (sitemapLocs.size !== sitemapPolicy.total) {
  fail(`sitemap.xml: ${sitemapLocs.size} locs vs coordinated baseline ${sitemapPolicy.total}`);
}
for (const family of indexedFamilies) {
  const locs = [...sitemapLocs].filter((loc) => family.pattern.test(loc));
  if (locs.length !== family.expected) {
    fail(`sitemap.xml: ${locs.length} ${family.label} vs baseline ${family.expected}`);
  }
  for (const loc of locs) {
    const target = targetPath(loc);
    if (!target || !(await exists(target))) continue;
    const html = idCache.get(target) ?? (await readFile(target, 'utf8'));
    const canonical = canonicalHref(html);
    if (canonical !== `https://zodiacs.org${loc}`) {
      fail(`sitemap.xml: ${loc} is not self-canonical — ${canonical ?? 'missing'}`);
    }
    const block = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)]
      .find((match) => match[1].includes(`<loc>https://zodiacs.org${loc}</loc>`))?.[1] ?? '';
    if (!family.localized && /hreflang=/.test(block)) {
      fail(`sitemap.xml: English-only ${family.label} route has hreflang alternates — ${loc}`);
    }
    if (family.localized) {
      for (const hreflang of ['en', 'es', 'pt-BR', 'fr', 'it', 'x-default']) {
        if (!block.includes(`hreflang="${hreflang}"`)) {
          fail(`sitemap.xml: localized ${family.label} route is missing ${hreflang} alternate — ${loc}`);
        }
      }
    }
  }
}
for (const hreflang of ['en', 'es', 'pt-BR', 'fr', 'it', 'x-default']) {
  const count = [...sitemap.matchAll(new RegExp(`hreflang="${hreflang}"`, 'g'))].length;
  if (count !== sitemapPolicy.translatedBlocks) {
    fail(`sitemap.xml: ${count} ${hreflang} alternates vs locale-rail baseline ${sitemapPolicy.translatedBlocks}`);
  }
}

// Reverse coverage: every indexable HTML page must declare a same-origin
// canonical URL that appears in the sitemap.
for (const file of files) {
  const html = idCache.get(file) ?? (await readFile(file, 'utf8'));
  if (hasNoindex(html)) continue;
  const rel = relative(root, file);
  const canonical = canonicalHref(html);
  if (!canonical) {
    fail(`${rel}: indexable page has no canonical URL`);
    continue;
  }
  let url;
  try {
    url = new URL(canonical);
  } catch {
    fail(`${rel}: invalid canonical URL — ${canonical}`);
    continue;
  }
  if (url.origin !== 'https://zodiacs.org') {
    fail(`${rel}: canonical on unexpected origin — ${canonical}`);
    continue;
  }
  if (!sitemapLocs.has(url.pathname)) {
    fail(`${rel}: canonical missing from sitemap — ${url.pathname}`);
  }
}

// ---- 7. External-contract artifacts ------------------------------------------
for (const artifact of [
  'robots.txt',
  'llms.txt',
  'llms-full.txt',
  'd21e17e6-3d58-4604-96d9-3363e13780e2.txt',
  'registry/zodiacs.registry.json',
  'archive/feed.json',
  'archive/rss.xml',
  '404.html',
  'registry/index.html',
  'thesis/index.html',
  'sdk/index.html',
]) {
  if (!(await exists(resolve(root, artifact)))) fail(`missing external-contract artifact: ${artifact}`);
}

// ---- 8. Source-data freshness -------------------------------------------------
// These snapshots are baked into the static output, so checking dist alone cannot
// tell us whether a successful build quietly shipped stale sky data.
const buildNow = new Date();
const buildDay = new Date(Date.UTC(
  buildNow.getUTCFullYear(),
  buildNow.getUTCMonth(),
  buildNow.getUTCDate(),
));
const buildMonth = buildNow.toISOString().slice(0, 7);
const dataRoot = resolve(repo, 'src/data');

const sky = JSON.parse(await readFile(resolve(dataRoot, 'sky.json'), 'utf8'));
const skyThrough = new Date(sky.to);
const minimumSkyHorizon = new Date(buildNow);
minimumSkyHorizon.setUTCDate(minimumSkyHorizon.getUTCDate() + 90);
if (Number.isNaN(skyThrough.getTime())) {
  fail(`sky.json: invalid horizon ${sky.to}`);
} else if (skyThrough < minimumSkyHorizon) {
  fail(`sky.json: horizon ${sky.to} is before build + 90 days (${minimumSkyHorizon.toISOString()})`);
}

const transitFiles = (await readdir(dataRoot))
  .filter((name) => /^transits-\d{4}-\d{2}\.json$/.test(name))
  .sort();
const latestTransitFile = transitFiles.at(-1);
const renderMonthTransitFile = `transits-${buildMonth}.json`;
if (!latestTransitFile) {
  fail('transits: no transits-YYYY-MM.json snapshot found');
} else {
  const latestTransitMonth = latestTransitFile.slice('transits-'.length, -'.json'.length);
  const latestTransits = JSON.parse(await readFile(resolve(dataRoot, latestTransitFile), 'utf8'));
  if (latestTransits.month !== latestTransitMonth) {
    fail(`${latestTransitFile}: month field is ${latestTransits.month}, expected ${latestTransitMonth}`);
  }
  if (latestTransitMonth < buildMonth) {
    fail(`${latestTransitFile}: latest transit month does not cover build month ${buildMonth}`);
  }
  if (!transitFiles.includes(renderMonthTransitFile)) {
    fail(`transits: missing render-month snapshot ${renderMonthTransitFile}`);
  } else if (latestTransitFile !== renderMonthTransitFile) {
    const renderMonthTransits = JSON.parse(await readFile(resolve(dataRoot, renderMonthTransitFile), 'utf8'));
    if (renderMonthTransits.month !== buildMonth) {
      fail(`${renderMonthTransitFile}: month field is ${renderMonthTransits.month}, expected ${buildMonth}`);
    }
  }
}

const daily = JSON.parse(await readFile(resolve(dataRoot, 'daily.json'), 'utf8'));
const dailyDay = new Date(`${daily.date}T00:00:00.000Z`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(daily.date ?? '') || Number.isNaN(dailyDay.getTime())) {
  fail(`daily.json: invalid date ${daily.date}`);
} else {
  const ageDays = Math.floor((buildDay.getTime() - dailyDay.getTime()) / 86_400_000);
  if (ageDays < 0) {
    fail(`daily.json: date ${daily.date} is in the future`);
  } else if (ageDays > 3) {
    const staleOverride = process.env.CI === 'true' && process.env.ZODIACS_ALLOW_STALE_DAILY === '1';
    if (staleOverride) {
      console.warn(`check-dist: daily.json is ${ageDays} days old; CI-only ZODIACS_ALLOW_STALE_DAILY override accepted.`);
    } else {
      fail(`daily.json: ${daily.date} is ${ageDays} days old (maximum 3); CI may explicitly set ZODIACS_ALLOW_STALE_DAILY=1`);
    }
  }
}

// ---- Report ------------------------------------------------------------------
if (failures.length) {
  console.error(`check-dist: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(
  `check-dist: OK — ${files.length} HTML files, ${searchIndexCount} search entries, `
  + `${feed.items.length} feed items, registry intact.`,
);
