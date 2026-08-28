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
const deferredStylePattern = /<template\b[^>]*\bdata-zdx-deferred-style\b[^>]*>/gi;
const deferredStyleLoader = `<script data-zdx-deferred-style-loader>
    (function () {
      var active = false;
      var fallback;
      var events = ['pointerover', 'pointerdown', 'focusin', 'keydown'];
      var activate = function () {
        if (active) return;
        active = true;
        if (fallback) clearTimeout(fallback);
        for (var eventIndex = 0; eventIndex < events.length; eventIndex += 1) {
          document.removeEventListener(events[eventIndex], onIntent, true);
        }
        var templates = document.querySelectorAll('template[data-zdx-deferred-style]');
        for (var index = 0; index < templates.length; index += 1) {
          templates[index].replaceWith(templates[index].content.cloneNode(true));
        }
      };
      var onIntent = function (event) {
        if (event.target && event.target.closest && event.target.closest('astro-island')) activate();
      };
      for (var index = 0; index < events.length; index += 1) {
        document.addEventListener(events[index], onIntent, true);
      }
      var schedule = function () { fallback = setTimeout(activate, 200); };
      if (document.readyState === 'complete') schedule();
      else window.addEventListener('load', schedule, { once: true });
      if (/(?:^|[&#])(?:p|c)=/.test(window.location.hash)) activate();
    })();
  </script>`;
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

export async function inlineCriticalStyles(html, root = distRoot, { deferNonBase = false } = {}) {
  if (!html.includes(marker)) return { html, stylesheets: 0, bytes: 0 };

  const stylesheetTags = [...html.matchAll(linkPattern)]
    .map((match) => match[0])
    .filter((tag) => attribute(tag, 'rel')?.toLowerCase() === 'stylesheet');
  if (stylesheetTags.length === 0) {
    throw new Error('inline-critical-styles: marked page has no stylesheet links');
  }
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
  }

  const selectedTags = deferNonBase
    ? stylesheetTags.filter((tag) => {
      const href = attribute(tag, 'href');
      return href ? /^Base\.[A-Za-z0-9_-]+\.css$/u.test(basename(href)) : false;
    })
    : stylesheetTags;
  const deferredTags = deferNonBase
    ? stylesheetTags.filter((tag) => !selectedTags.includes(tag))
    : [];
  if (deferNonBase && (selectedTags.length !== 1 || deferredTags.length === 0)) {
    throw new Error(
      `inline-critical-styles: expected one Base stylesheet plus deferred tool styles, found ${selectedTags.length} + ${deferredTags.length}`,
    );
  }

  let output = html;
  let bytes = 0;
  for (const tag of selectedTags) {
    const href = attribute(tag, 'href');
    const cssPath = resolve(root, `.${href}`);
    const css = await readFile(cssPath, 'utf8');
    assertSafeCss(css, href);
    bytes += Buffer.byteLength(css);
    output = output.replace(
      tag,
      `<style data-zdx-critical="${basename(href)}">${css}</style>`,
    );
  }

  for (const tag of deferredTags) {
    output = output.replace(
      tag,
      `<template data-zdx-deferred-style>${tag}</template><noscript>${tag}</noscript>`,
    );
  }
  if (deferredTags.length > 0) {
    if (!output.includes('</head>')) {
      throw new Error('inline-critical-styles: cannot install deferred-style loader without </head>');
    }
    output = output.replace('</head>', `${deferredStyleLoader}</head>`);
  }

  output = output.replace(/\sdata-inline-critical-css(?:="")?/i, '');
  return { html: output, stylesheets: selectedTags.length, bytes };
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
    const deferNonBase = relativePath === 'ru/birth-chart/index.html';
    if (!source.includes(marker)) {
      const inlineCount = source.match(criticalStylePattern)?.length ?? 0;
      const externalCount = [...source.matchAll(linkPattern)]
        .map((match) => match[0])
        .filter((tag) => attribute(tag, 'rel')?.toLowerCase() === 'stylesheet')
        .length;
      const deferredCount = source.match(deferredStylePattern)?.length ?? 0;
      const loaderCount = source.match(/data-zdx-deferred-style-loader/g)?.length ?? 0;
      const expectedInlineCount = deferNonBase ? 1 : 2;
      const expectedDeferredCount = deferNonBase ? 3 : 0;
      const expectedExternalCount = deferNonBase ? 6 : 0;
      if (
        inlineCount !== expectedInlineCount
        || deferredCount !== expectedDeferredCount
        || externalCount !== expectedExternalCount
        || loaderCount !== (deferNonBase ? 1 : 0)
      ) {
        throw new Error(
          `inline-critical-styles: ${relativePath} has an unexpected inline/external stylesheet shape`,
        );
      }
      alreadyInlined += 1;
      stylesheets += inlineCount;
      continue;
    }
    const result = await inlineCriticalStyles(source, distRoot, { deferNonBase });
    await writeFile(path, result.html);
    pages += 1;
    stylesheets += result.stylesheets;
    bytes += result.bytes;
  }
  if (pages + alreadyInlined !== 15 || stylesheets !== 29) {
    throw new Error(
      `inline-critical-styles: expected 15 pages / 29 inlined stylesheets, found ${pages + alreadyInlined} / ${stylesheets}`,
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
