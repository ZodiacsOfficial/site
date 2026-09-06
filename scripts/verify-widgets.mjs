import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const routes = ['moon', 'sky', 'chart'];
const failures = [];

for (const route of routes) {
  const path = resolve(root, 'dist', 'embed', route, 'index.html');
  let html = '';
  try {
    html = await readFile(path, 'utf8');
  } catch {
    failures.push(`/embed/${route}/ did not build`);
    continue;
  }
  if (!html.includes('Powered by Zodiacs.org')) failures.push(`/embed/${route}/ lacks the required backlink`);
  if (!html.includes('/assets/zodiac-icons/48/')) failures.push(`/embed/${route}/ lacks canonical zodiac icons`);
  if (/plausible|zodiacsAnalytics|_vercel\/insights|session[-_ ]?record|fingerprint/i.test(html)) {
    failures.push(`/embed/${route}/ contains analytics or invasive-tracking code`);
  }
  if (!html.includes('data-zodiacs-widget-theme')) failures.push(`/embed/${route}/ lacks the inline theme script`);
  if (!/:root\[data-theme=light\]/.test(html) || !/<html[^>]*data-theme="(?:dark|light)"/.test(html)) {
    failures.push(`/embed/${route}/ does not ship both palettes keyed on data-theme`);
  }
  if (/fetch\(|XMLHttpRequest|navigator\.sendBeacon|localStorage|document\.cookie/.test(html)) {
    failures.push(`/embed/${route}/ inline code must not fetch, beacon, or store`);
  }
}

const loaderPath = resolve(root, 'public/assets/widgets.js');
const loader = await readFile(loaderPath);
const loaderGzip = gzipSync(loader).byteLength;
if (loaderGzip >= 60 * 1024) failures.push(`widget loader is ${loaderGzip} bytes gzip (limit: <60KB)`);
if (/analytics|plausible|_vercel\/insights|fingerprint/i.test(loader.toString('utf8'))) failures.push('widget loader contains analytics code');

async function initialJavaScriptGzip(route) {
  const htmlPath = resolve(root, 'dist', 'embed', route, 'index.html');
  const html = await readFile(htmlPath, 'utf8');
  const pending = [...html.matchAll(/(?:src|href|component-url|renderer-url)="(\/_astro\/[^"?#]+\.js)"/g)].map((match) => match[1]);
  const seen = new Set();
  let total = 0;

  while (pending.length > 0) {
    const asset = pending.pop();
    if (!asset || seen.has(asset)) continue;
    seen.add(asset);
    const path = resolve(root, 'dist', asset.slice(1));
    const source = await readFile(path, 'utf8');
    total += gzipSync(source).byteLength;
    for (const match of source.matchAll(/(?:from\s*|import\s*)["'](\.\/[^"']+\.js)["']/g)) {
      const next = posix.normalize(posix.join(posix.dirname(asset), match[1]));
      if (!seen.has(next)) pending.push(next);
    }
  }
  return total;
}

for (const route of routes) {
  const gzip = await initialJavaScriptGzip(route);
  if (gzip >= 60 * 1024) failures.push(`/embed/${route}/ initial JS is ${gzip} bytes gzip (limit: <60KB)`);
  console.log(`/embed/${route}/ initial JS: ${(gzip / 1024).toFixed(1)} KB gzip`);
}

for (const route of routes) {
  const size = await stat(resolve(root, 'dist', 'embed', route, 'index.html'));
  console.log(`/embed/${route}/ HTML: ${(size.size / 1024).toFixed(1)} KB`);
}
console.log(`widget loader: ${(loaderGzip / 1024).toFixed(1)} KB gzip`);

if (failures.length > 0) {
  throw new Error(`Widget verification failed:\n- ${failures.join('\n- ')}`);
}
console.log('verify-widgets: OK');
