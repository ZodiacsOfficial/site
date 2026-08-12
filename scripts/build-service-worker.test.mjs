import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { runInNewContext } from 'node:vm';
import { buildServiceWorker } from './build-service-worker.mjs';

const ROOT = resolve(import.meta.dirname, '..');

async function builtWorker(pushEnabled = true) {
  const outputDirectory = await mkdtemp(resolve(tmpdir(), 'zodiacs-sw-'));
  try {
    await buildServiceWorker({ outputDirectory, pushEnabled });
    return await readFile(resolve(outputDirectory, 'sw.js'), 'utf8');
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
}

function runWorker(source) {
  const handlers = new Map();
  const showNotification = vi.fn(async (_title, _options) => {});
  const openWindow = vi.fn(async () => {});
  const networkFetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    clone: () => ({ ok: true, status: 200 }),
  }));
  const caches = {
    open: vi.fn(async () => ({
      add: vi.fn(), put: vi.fn(), match: vi.fn(), keys: vi.fn(async () => []),
    })),
    keys: vi.fn(async () => []),
    delete: vi.fn(async () => true),
  };
  const self = {
    addEventListener: (name, handler) => handlers.set(name, handler),
    location: { origin: 'https://zodiacs.org' },
    registration: { showNotification },
    clients: {
      claim: vi.fn(async () => {}),
      matchAll: vi.fn(async () => []),
      openWindow,
    },
    skipWaiting: vi.fn(async () => {}),
  };
  runInNewContext(source, { self, URL, Promise, fetch: networkFetch, caches, setTimeout, clearTimeout });
  return { caches, handlers, networkFetch, openWindow, self, showNotification };
}

async function dispatchPush(handler, payload, { malformedJson = false, missingData = false } = {}) {
  let completion;
  handler({
    data: missingData ? undefined : {
      json: () => {
        if (malformedJson) throw new SyntaxError('bad push JSON');
        return payload;
      },
    },
    waitUntil: (promise) => { completion = Promise.resolve(promise); },
  });
  await completion;
}

describe('offline service worker posture', () => {
  it('never stale-serves Registry authority JSON', async () => {
    const source = await readFile(resolve(ROOT, 'public/sw.js'), 'utf8');
    expect(source).toContain("url.pathname === '/registry/zodiacs.registry.json'");
    expect(source).toMatch(/if \(registryAuthority\(url\) \|\| registryVolatileSurface\(url\)\) \{\s*event\.respondWith\(fetch\(request\)\)/);
  });

  it('never caches or stale-serves Registry authority or any build-time Terminal flag surface', async () => {
    const worker = runWorker(await builtWorker(false));
    const handler = worker.handlers.get('fetch');
    const volatilePaths = [
      '/registry', '/registry/', '/registry/index.html',
      '/registry/exchange', '/registry/exchange/', '/registry/exchange/index.html',
      '/terminal', '/terminal/', '/terminal/index.html',
      '/terminal/pro', '/terminal/pro/', '/terminal/pro/index.html',
      '/terminal/markets', '/terminal/markets/', '/terminal/markets/index.html',
    ];
    for (const path of volatilePaths) {
      let completion;
      const request = { method: 'GET', mode: 'navigate', url: `https://zodiacs.org${path}` };
      handler({ request, respondWith: (promise) => { completion = Promise.resolve(promise); } });
      await completion;
    }
    expect(worker.networkFetch).toHaveBeenCalledTimes(volatilePaths.length);
    expect(worker.caches.open).not.toHaveBeenCalled();

    for (const path of ['/terminal/pro/', '/terminal/markets/']) {
      worker.networkFetch.mockRejectedValueOnce(new TypeError('offline'));
      let offline;
      handler({
        request: { method: 'GET', mode: 'navigate', url: `https://zodiacs.org${path}` },
        respondWith: (promise) => { offline = Promise.resolve(promise); },
      });
      await expect(offline, path).rejects.toThrow('offline');
    }
    expect(worker.caches.open).not.toHaveBeenCalled();
  });

  it('keeps non-authoritative Terminal pages network-first with an offline fallback', async () => {
    const worker = runWorker(await builtWorker(false));
    const handler = worker.handlers.get('fetch');
    let completion;
    handler({
      request: {
        method: 'GET',
        mode: 'navigate',
        url: 'https://zodiacs.org/terminal/research/',
      },
      respondWith: (promise) => { completion = Promise.resolve(promise); },
    });
    await completion;
    expect(worker.networkFetch).toHaveBeenCalledOnce();
    expect(worker.caches.open).toHaveBeenCalledOnce();
  });

  it('ships with push disabled and versioned shell/data caches', async () => {
    const source = await readFile(resolve(ROOT, 'public/sw.js'), 'utf8');
    expect(source).toContain('const PUSH_ENABLED = false');
    expect(source).toContain('zodiacs-shell-${CACHE_VERSION}');
    expect(source).toContain('zodiacs-data-${CACHE_VERSION}');
  });

  it('builds an event-only worker without manufactured notification defaults', async () => {
    const built = await builtWorker(false);
    expect(built).toContain('const PUSH_ENABLED = false');
    expect(built).toContain("tag: 'zodiacs-sky-alert'");
    expect(built).not.toContain('PUSH_DEFAULTS');
    expect(built).not.toContain('zodiacs-daily-note');
    expect(built).not.toContain('Your daily sky note is ready.');
  });

  it('shows only bounded, nonempty event payloads with a safe relative event path', async () => {
    const worker = runWorker(await builtWorker(true));
    const handler = worker.handlers.get('push');

    await dispatchPush(handler, {
      title: '  Full moon tonight  ',
      body: '  The Buck Moon — the Moon stands opposite the Sun in Aquarius. Exact at 14:35 UTC. Where it lands for you:  ',
      url: '/full-moon/2026-07-29/',
    });

    expect(worker.showNotification).toHaveBeenCalledTimes(1);
    const [title, options] = worker.showNotification.mock.calls[0];
    expect(title).toBe('Full moon tonight');
    expect(options.body).toBe('The Buck Moon — the Moon stands opposite the Sun in Aquarius. Exact at 14:35 UTC. Where it lands for you:');
    expect(options.tag).toBe('zodiacs-sky-alert');
    expect(options.data.url).toBe('/full-moon/2026-07-29/');

    const invalidPayloads = [
      undefined,
      { title: '', body: 'Body', url: '/events/example/' },
      { title: 'Title', body: ' ', url: '/events/example/' },
      { title: 'T'.repeat(33), body: 'Body', url: '/events/example/' },
      { title: 'Title', body: 'B'.repeat(141), url: '/events/example/' },
      { title: 'Title', body: 'Body', url: '//example.com/events/example/' },
      { title: 'Title', body: 'Body', url: '/events\\example/' },
      { title: 'Title', body: 'Body', url: '/events/example/\u0000' },
      { title: 'Title', body: 'Body', url: '/events/example/?next=/today/' },
      { title: 'Title', body: 'Body', url: '/today/' },
    ];
    for (const payload of invalidPayloads) await dispatchPush(handler, payload);
    await dispatchPush(handler, undefined, { malformedJson: true });
    await dispatchPush(handler, undefined, { missingData: true });

    expect(worker.showNotification).toHaveBeenCalledTimes(1);
  });

  it('accepts every destination in the committed events publication', async () => {
    const publication = JSON.parse(await readFile(resolve(ROOT, 'src/data/events-publication.json'), 'utf8'));
    const worker = runWorker(await builtWorker(true));
    const handler = worker.handlers.get('push');

    for (const event of publication.timeline) {
      await dispatchPush(handler, {
        title: 'Sky alert',
        body: 'A verified event is happening today.',
        url: event.path,
      });
    }

    expect(worker.showNotification).toHaveBeenCalledTimes(publication.timeline.length);
    expect(worker.showNotification.mock.calls.map(([, options]) => options.data.url))
      .toEqual(publication.timeline.map((event) => event.path));
  });

  it('opens validated event destinations and fails closed on invalid click data', async () => {
    const worker = runWorker(await builtWorker(true));
    const handler = worker.handlers.get('notificationclick');
    const navigate = vi.fn(async () => {});
    const focus = vi.fn(async () => {});
    worker.self.clients.matchAll.mockResolvedValue([{
      url: 'https://zodiacs.org/today/',
      navigate,
      focus,
    }]);

    const invalidClose = vi.fn();
    let invalidCompletion;
    handler({
      notification: { close: invalidClose, data: { url: '/today/' } },
      waitUntil: (promise) => { invalidCompletion = Promise.resolve(promise); },
    });
    await invalidCompletion;
    expect(invalidClose).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
    expect(worker.openWindow).not.toHaveBeenCalled();

    const validClose = vi.fn();
    let validCompletion;
    handler({
      notification: {
        close: validClose,
        data: { url: '/retrogrades/#retrograde-saturn-2026-07-26' },
      },
      waitUntil: (promise) => { validCompletion = Promise.resolve(promise); },
    });
    await validCompletion;
    expect(validClose).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('https://zodiacs.org/retrogrades/#retrograde-saturn-2026-07-26');
    expect(focus).toHaveBeenCalledOnce();
    expect(worker.openWindow).not.toHaveBeenCalled();
  });
});
