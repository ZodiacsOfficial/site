/**
 * Serve this directory at `/` and the PACKAGE ITSELF at `/pkg/`, localhost
 * only. No bundler: the bytes the browser runs are the bytes the package
 * ships.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const HERE = new URL('.', import.meta.url).pathname;
const PKG = resolve(HERE, '../../../../../examples/precision-alpha');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript',
  '.js': 'text/javascript', '.json': 'application/json', '.bin': 'application/octet-stream',
};
const port = Number(process.argv[2] ?? 8795);

createServer(async (req, res) => {
  const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  if (rel === '/favicon.ico') { res.writeHead(204).end(); return; }
  const underPkg = rel.startsWith('/pkg/');
  const root = underPkg ? PKG : HERE;
  const file = join(root, underPkg ? rel.slice(4) : (rel === '/' ? 'index.html' : rel));
  if (!file.startsWith(root)) { res.writeHead(403).end('no'); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end('not found'); }
}).listen(port, '127.0.0.1', () => process.stderr.write(`http://127.0.0.1:${port}/\n`));
