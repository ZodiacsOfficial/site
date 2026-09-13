import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const ASSETS = {
  '/': ['natal.html', 'text/html; charset=utf-8'],
  '/natal.html': ['natal.html', 'text/html; charset=utf-8'],
  '/transits.html': ['transits.html', 'text/html; charset=utf-8'],
  '/widget.html': ['widget.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/widget.js': ['widget.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml'],
  '/THIRD_PARTY_NOTICES.txt': ['THIRD_PARTY_NOTICES.txt', 'text/plain; charset=utf-8'],
};

export async function startServer(port = 4178) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new RangeError('Invalid localhost port.');
  const assets = new Map(await Promise.all(Object.entries(ASSETS).map(async ([route, [file, type]]) =>
    [route, { type, bytes: await readFile(new URL(`../dist/${file}`, import.meta.url)) }])));
  const server = createServer((request, response) => {
    const headers = {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; frame-src ${request.url === '/widget.html' ? 'https://zodiacs.org' : "'none'"}; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    };
    const finish = (status, bytes = Buffer.from('Not found'), extra = {}) => {
      response.writeHead(status, { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': bytes.byteLength, ...extra });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    };
    if (!['GET', 'HEAD'].includes(request.method)) return finish(405, Buffer.from('Method not allowed'), { Allow: 'GET, HEAD' });
    if (request.headers.host !== `127.0.0.1:${server.address().port}`) return finish(421, Buffer.from('Use the printed 127.0.0.1 URL'));
    const asset = assets.get(request.url); // Exact route map: no URL decoding or filesystem path derived from a request.
    if (!asset) return finish(404);
    finish(200, asset.bytes, { 'Content-Type': asset.type });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await startServer(process.argv[2] === undefined ? 4178 : Number(process.argv[2]));
  console.log(`Examples: http://127.0.0.1:${server.address().port}/ — Ctrl+C to stop`);
}
