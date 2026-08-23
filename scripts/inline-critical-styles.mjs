/*
 * Inline the emitted CSS only for entry pages whose mobile LCP is dominated by
 * stylesheet round trips. Astro still owns bundling and minification; this
 * postbuild pass changes delivery, not the stylesheet contents. Keeping the
 * opt-in marker on the page avoids duplicating CSS across the programmatic
 * catalogue and preserves shared-cache behavior everywhere else.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = resolve(repo, 'dist');
const marker = 'data-inline-critical-css';
const linkPattern = /<link\b[^>]*>/gi;
const criticalStylePattern = /<style\b[^>]*\bdata-zdx-critical=["'][^"']+["'][^>]*>/gi;
const signs = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const targetPaths = [
  'today/index.html',
  ...signs.map((sign) => `horoscopes/${sign}/index.html`),
  'ru/index.html',
  'ru/birth-chart/index.html',
];

export async function htmlFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    // Astro may remove a transient prerender staging directory between the
    // parent readdir and the recursive walk. It is not part of the deployable
    // output, so a vanished directory is equivalent to an empty one.
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return entry.name.startsWith('.') ? [] : htmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  }));
  return nested.flat();
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'));
  return match?.[1] ?? null;
}

function assertSafeCss(css, href) {
  if (/@import\b/i.test(css)) {
    throw new Error(`inline-critical-styles: @import is not safe to relocate from ${href}`);
  }
  if (/<\/style/i.test(css)) {
    throw new Error(`inline-critical-styles: unsafe style terminator in ${href}`);
  }
  for (const match of css.matchAll(/url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gi)) {
    const url = (match[2] ?? match[3] ?? '').trim();
    if (url && !url.startsWith('/') && !url.startsWith('#') && !url.startsWith('data:')) {
      throw new Error(`inline-critical-styles: relative CSS URL ${url} in ${href}`);
    }
  }
}

export async function inlineCriticalStyles(html, root = distRoot) {
  if (!html.includes(marker)) return { html, stylesheets: 0, bytes: 0 };

  const stylesheetTags = [...html.matchAll(linkPattern)]
    .map((match) => match[0])
    .filter((tag) => attribute(tag, 'rel')?.toLowerCase() === 'stylesheet');
  if (stylesheetTags.length === 0) {
    throw new Error('inline-critical-styles: marked page has no stylesheet links');
  }

  let output = html;
  let bytes = 0;
  for (const tag of stylesheetTags) {
    const href = attribute(tag, 'href');
    if (!href?.startsWith('/_astro/') || !href.endsWith('.css')) {
      throw new Error(`inline-critical-styles: refusing non-build stylesheet ${href ?? '(missing href)'}`);
    }
    const cssPath = resolve(root, `.${href}`);
    const astroRoot = resolve(root, '_astro') + sep;
    if (!cssPath.startsWith(astroRoot)) {
      throw new Error(`inline-critical-styles: stylesheet escaped build root: ${href}`);
    }
    const css = await readFile(cssPath, 'utf8');
    assertSafeCss(css, href);
    bytes += Buffer.byteLength(css);
    output = output.replace(
      tag,
      `<style data-zdx-critical="${basename(href)}">${css}</style>`,
    );
  }

  output = output.replace(/\sdata-inline-critical-css(?:="")?/i, '');
  return { html: output, stylesheets: stylesheetTags.length, bytes };
}

async function main() {
  let pages = 0;
  let alreadyInlined = 0;
  let stylesheets = 0;
  let bytes = 0;
  const allPaths = await htmlFiles(distRoot);
  const markedOutsideScope = allPaths.filter((path) => {
    const relativePath = path.slice(distRoot.length + 1).split(sep).join('/');
    return !targetPaths.includes(relativePath);
  });
  for (const path of markedOutsideScope) {
    const source = await readFile(path, 'utf8');
    if (source.includes(marker)) {
      throw new Error(`inline-critical-styles: marker outside approved scope: ${path}`);
    }
  }

  for (const relativePath of targetPaths) {
    const path = resolve(distRoot, relativePath);
    const source = await readFile(path, 'utf8');
    if (!source.includes(marker)) {
      const inlineCount = source.match(criticalStylePattern)?.length ?? 0;
      const externalCount = [...source.matchAll(linkPattern)]
        .map((match) => match[0])
        .filter((tag) => attribute(tag, 'rel')?.toLowerCase() === 'stylesheet')
        .length;
      if (inlineCount !== 2 || externalCount !== 0) {
        throw new Error(
          `inline-critical-styles: ${relativePath} is neither marked nor completely inlined`,
        );
      }
      alreadyInlined += 1;
      stylesheets += inlineCount;
      continue;
    }
    const result = await inlineCriticalStyles(source, distRoot);
    await writeFile(path, result.html);
    pages += 1;
    stylesheets += result.stylesheets;
    bytes += result.bytes;
  }
  if (pages + alreadyInlined !== 15 || stylesheets !== 32) {
    throw new Error(
      `inline-critical-styles: expected 15 pages / 32 stylesheets, found ${pages + alreadyInlined} / ${stylesheets}`,
    );
  }
  const state = pages > 0
    ? `${stylesheets} stylesheets inlined across ${pages} entry pages · ${(bytes / 1024).toFixed(1)} KB`
    : `${stylesheets} stylesheets already inlined across ${alreadyInlined} entry pages`;
  console.log(`inline-critical-styles: ${state}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
