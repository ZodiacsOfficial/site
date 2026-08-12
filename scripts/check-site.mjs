/*
 * Static integrity checks for the committed legacy wing in public/.
 * Zero dependencies; run from the repo root:
 *
 *   node scripts/check-site.mjs
 *
 * Checks:
 *   1. public/registry/zodiacs.registry.json — 12 assets, solana + base
 *      representation (with address) on each.
 *   2. archive/feed.json — JSON Feed 1.1 shape, non-empty, dated items.
 *   3. archive/rss.xml — XML declaration, balanced tags, item count
 *      matches feed.json.
 *   4. assets/pulse.json + assets/distribution.json — parse and shape.
 *   5. Every href/src in committed *.html — site-relative and relative
 *      paths must resolve to a file; internal fragment links must point
 *      at an existing id.
 * The Astro-built dist/ has its own checker: scripts/check-dist.mjs.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = resolve(root, 'public');
const failures = [];
const fail = (msg) => { failures.push(msg); };

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

// ---- 1. Registry ----------------------------------------------------------
const registry = JSON.parse(await readFile(resolve(publicRoot, 'registry/zodiacs.registry.json'), 'utf8'));
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
const feed = JSON.parse(await readFile(resolve(publicRoot, 'archive/feed.json'), 'utf8'));
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
const rss = await readFile(resolve(publicRoot, 'archive/rss.xml'), 'utf8');
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

// ---- 4. Data snapshots ------------------------------------------------------
const pulse = JSON.parse(await readFile(resolve(publicRoot, 'assets/pulse.json'), 'utf8'));
if (!pulse.capturedAt) fail('pulse.json: missing capturedAt');
if (await exists(resolve(publicRoot, 'assets/distribution.json'))) {
  const dist = JSON.parse(await readFile(resolve(publicRoot, 'assets/distribution.json'), 'utf8'));
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

// ---- 5. Internal links + fragments in committed HTML ------------------------
async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(path));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

function targetPath(urlPath) {
  const clean = urlPath.split(/[?#]/)[0];
  if (!clean) return null;
  if (clean === '/') return null;
  const abs = resolve(publicRoot, clean.replace(/^\//, ''));
  return clean.endsWith('/') ? join(abs, 'index.html') : abs;
}

const idCache = new Map();
async function hasId(filePath, id) {
  if (!idCache.has(filePath)) {
    idCache.set(filePath, await readFile(filePath, 'utf8'));
  }
  const html = idCache.get(filePath);
  if (html.includes(`id="${id}"`) || html.includes(`id='${id}'`)) return true;
  // Zodiac Terminal renders some sections client-side; ids live in the
  // compiled bundle (JSX id="x" compiles to id: "x").
  if (filePath === resolve(publicRoot, 'terminal/index.html')) {
    const bundlePath = resolve(publicRoot, 'assets/app.js');
    if (!idCache.has(bundlePath)) {
      idCache.set(bundlePath, await readFile(bundlePath, 'utf8'));
    }
    const bundle = idCache.get(bundlePath);
    return bundle.includes(`id: "${id}"`) || bundle.includes(`id:"${id}"`) || bundle.includes(`id="${id}"`);
  }
  return false;
}

const files = await htmlFiles(publicRoot);
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
      if (!abs.startsWith(publicRoot)) { fail(`${rel}: reference escapes public/ — ${value}`); continue; }
      if (abs === publicRoot) continue;
      target = value.split(/[?#]/)[0].endsWith('/') ? join(abs, 'index.html') : abs;
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

// ---- Report ------------------------------------------------------------------
if (failures.length) {
  console.error(`check-site: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check-site: OK — ${files.length} committed HTML files, ${feed.items.length} feed items, registry intact.`);
