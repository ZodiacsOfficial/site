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
 *   6. sitemap.xml — well-formed, every loc resolves to a built file.
 *   7. Root artifacts the outside world depends on are present.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(repo, 'dist');
const failures = [];
const fail = (msg) => { failures.push(msg); };

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

// ---- 5b. Share-card images (og:image / twitter:image) -------------------------
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
for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const url = new URL(m[1]);
  if (url.origin !== 'https://zodiacs.org') {
    fail(`sitemap.xml: unexpected origin ${m[1]}`);
    continue;
  }
  const target = targetPath(url.pathname);
  if (!(await exists(target))) fail(`sitemap.xml: loc has no file — ${m[1]}`);
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

// ---- Report ------------------------------------------------------------------
if (failures.length) {
  console.error(`check-dist: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check-dist: OK — ${files.length} HTML files, ${feed.items.length} feed items, registry intact.`);
