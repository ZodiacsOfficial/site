import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveLighthouseAssets } from './lighthouse-assets.mjs';

const directories = [];
async function directory() {
  const path = await mkdtemp(join(tmpdir(), 'zodiacs-lighthouse-assets-'));
  directories.push(path);
  return path;
}
function result() {
  return {
    lhr: { requestedUrl: 'http://127.0.0.1:4328/horoscopes/', finalDisplayedUrl: 'http://127.0.0.1:4328/horoscopes/' },
    artifacts: {
      Trace: { traceEvents: [{ name: 'RunTask', dur: 450000 }] },
      DevtoolsLog: [{ method: 'Network.requestWillBeSent', params: { request: { url: 'http://127.0.0.1:4328/assets/assistant-ui.js?v=ask-guide-3', headers: { Accept: '*/*' } } } }],
    },
  };
}
afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('raw Lighthouse evidence retention', () => {
  it('preserves the original measured trace and log without changing the result', async () => {
    const path = await directory();
    const measured = result();
    const original = structuredClone(measured);
    await saveLighthouseAssets(measured, path, 'horoscopes-3');
    expect(JSON.parse(await readFile(join(path, 'horoscopes-3.trace.json'), 'utf8'))).toEqual(original.artifacts.Trace);
    expect(JSON.parse(await readFile(join(path, 'horoscopes-3.devtoolslog.json'), 'utf8'))).toEqual(original.artifacts.DevtoolsLog);
    expect(measured).toEqual(original);
  });

  it.each([
    ['a remote audit', (r) => { r.lhr.requestedUrl = 'https://zodiacs.org/horoscopes/'; }],
    ['a remote redirect', (r) => { r.lhr.finalDisplayedUrl = 'https://zodiacs.org/horoscopes/'; }],
    ['embedded credentials', (r) => { r.lhr.requestedUrl = 'http://user:private@127.0.0.1:4328/'; }],
    ['a private query', (r) => { r.lhr.requestedUrl += '?access_token=private'; }],
    ['a remote request', (r) => { r.artifacts.DevtoolsLog[0].params.request.url = 'https://example.com/'; }],
    ['an authorization header', (r) => { r.artifacts.DevtoolsLog[0].params.request.headers.Authorization = 'Bearer private'; }],
    ['a response cookie', (r) => { r.artifacts.DevtoolsLog.push({ params: { response: { headers: { 'Set-Cookie': 'private' } } } }); }],
    ['raw private headers', (r) => { r.artifacts.DevtoolsLog.push({ params: { headersText: 'HTTP/1.1 200 OK\r\nSet-Cookie: private\r\n' } }); }],
    ['request body data', (r) => { r.artifacts.DevtoolsLog[0].params.request.postData = 'private'; }],
    ['a missing trace', (r) => { delete r.artifacts.Trace; }],
    ['a missing log', (r) => { delete r.artifacts.DevtoolsLog; }],
  ])('rejects %s before writing either file', async (_label, change) => {
    const path = await directory();
    const measured = result();
    change(measured);
    await expect(saveLighthouseAssets(measured, path, 'horoscopes-3')).rejects.toThrow();
    expect(await readdir(path)).toEqual([]);
  });
});
