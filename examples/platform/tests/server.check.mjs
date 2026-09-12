import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { startServer } from '../scripts/server.mjs';

test('localhost server serves only exact built assets and never accepts submissions', async () => {
  const server = await startServer(0);
  const port = server.address().port;
  const get = (path, method = 'GET', host = `127.0.0.1:${port}`) => new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method, headers: { Host: host } }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.end();
  });
  try {
    assert.equal(server.address().address, '127.0.0.1');
    const natal = await get('/natal.html');
    assert.equal(natal.status, 200);
    assert.match(natal.body, /Synthetic birth input/);
    assert.match(natal.headers['content-security-policy'], /connect-src 'none'/);
    assert.match(natal.headers['content-security-policy'], /form-action 'none'/);
    assert.match(natal.headers['content-security-policy'], /frame-src 'none'/);
    assert.equal(natal.headers['access-control-allow-origin'], undefined);
    assert.equal(natal.headers['cache-control'], 'no-store');
    assert.equal(natal.headers['x-content-type-options'], 'nosniff');
    const head = await get('/natal.html', 'HEAD');
    assert.equal(head.status, natal.status);
    assert.equal(head.body, '');
    assert.equal(head.headers['content-length'], natal.headers['content-length']);
    assert.equal(head.headers['content-type'], natal.headers['content-type']);
    for (const path of ['/transits.html', '/widget.html', '/app.js', '/widget.js', '/styles.css', '/favicon.svg', '/THIRD_PARTY_NOTICES.txt']) {
      assert.equal((await get(path)).status, 200, path);
    }
    const widget = await get('/widget.html');
    assert.match(widget.headers['content-security-policy'], /frame-src https:\/\/zodiacs.org/);
    for (const path of ['/package.json', '/candidate.json', '/node_modules/', '/src/calculate.mjs', '/../package.json', '/%2e%2e/package.json', '//natal.html', '/natal.html?birth=synthetic', '/natal.html%00', '/dist/', '/.env']) {
      const response = await get(path);
      assert.equal(response.status, 404, path);
      assert.equal(response.body, 'Not found');
    }
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
      const response = await get('/natal.html', method);
      assert.equal(response.status, 405);
      assert.equal(response.headers.allow, 'GET, HEAD');
    }
    assert.equal((await get('/natal.html', 'GET', 'attacker.example')).status, 421);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
