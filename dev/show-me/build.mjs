import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, process.argv[2] || 'build/show-me');
await mkdir(output, { recursive: true });
const fixtures = await build({ entryPoints: [resolve(root, 'dev/show-me/fixtures.ts')], bundle: true, platform: 'node', format: 'esm', write: false });
// Import the generated fixture module in memory; the engine never enters the browser bundle.
const { examples } = await import(`data:text/javascript;base64,${Buffer.from(fixtures.outputFiles[0].text).toString('base64')}`);
const app = await build({ entryPoints: [resolve(root, 'dev/show-me/app.ts')], bundle: true, platform: 'browser', format: 'iife', write: false, minify: true });
let css = await readFile(resolve(root, 'dev/show-me/style.css'), 'utf8');
for (const [key, file] of [['INSTRUMENT_FONT', 'instrument-sans-latin-wght-normal.woff2'], ['GARAMOND_FONT', 'eb-garamond-latin-400-normal.woff2']]) {
  css = css.replace(key, `data:font/woff2;base64,${(await readFile(resolve(root, 'public/fonts', file))).toString('base64')}`);
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Show me · Zodiacs interaction preview</title><style>${css}</style></head><body><div id="app"></div><script id="examples" type="application/json">${JSON.stringify(examples).replace(/</g, '\\u003c')}</script><script>if(new URLSearchParams(location.search).has('mobile'))document.documentElement.dataset.mobile='';</script><script>${app.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
const licenses = await Promise.all(['OFL-instrument-sans.txt', 'OFL-eb-garamond.txt'].map(file => readFile(resolve(root, 'public/fonts', file), 'utf8')));
await writeFile(resolve(output, 'index.html'), html + '\n<!-- Bundled font licenses\n' + licenses.join('\n\n').replace(/-->/g, '-- >') + '\n-->');
console.log(`Built ${resolve(output, 'index.html')} (${Buffer.byteLength(html)} bytes; no network dependencies)`);
