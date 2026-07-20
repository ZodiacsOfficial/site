/* Generated cache metadata is injected by scripts/build-service-worker.mjs. */
const CACHE_VERSION = 'development'; // @build cache-version
const PRECACHE_URLS = [ // @build precache-start
  '/',
  '/tools/',
  '/birth-chart/',
  '/compatibility/',
  '/transits/',
  '/moon-sign/',
  '/rising-sign/',
  '/moon-phase/',
  '/saturn-return/',
  '/birthday/',
  '/eclipses/',
  '/retrogrades/',
  '/horoscopes/',
  '/today/',
  '/profile/',
  '/site.webmanifest',
]; // @build precache-end
const PUSH_ENABLED = false; // @build push-enabled

const SKY_ALERT_TITLE_MAX = 32;
const SKY_ALERT_BODY_MAX = 140;
const SKY_ALERT_PATH_MAX = 512;
const SKY_ALERT_PATH_PREFIXES = [
  '/eclipses/',
  '/events/',
  '/full-moon/',
  '/mars-retrograde/',
  '/mercury-retrograde/',
  '/new-moon/',
  '/retrogrades/',
  '/venus-retrograde/',
];

const SHELL_CACHE = `zodiacs-shell-${CACHE_VERSION}`;
const DATA_CACHE = `zodiacs-data-${CACHE_VERSION}`;
const CACHE_PREFIX = 'zodiacs-';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // One optional asset must never prevent the current accuracy cache from
    // activating; each URL gets an independent receipt.
    await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== SHELL_CACHE && name !== DATA_CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

function registryAuthority(url) {
  return url.pathname === '/registry/zodiacs.registry.json'
    || (url.pathname.startsWith('/registry/') && url.pathname.endsWith('.json'));
}

function registryWing(url) {
  return ['/registry/', '/sdk/', '/thesis/', '/archive/', '/disclosure/']
    .some((prefix) => url.pathname.startsWith(prefix));
}

async function networkFirst(request, cacheName, allowFallback = true) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    if (!allowFallback) throw error;
    const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

function boundedAlertText(value, maxLength) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > maxLength || /[\u0000-\u001F\u007F]/.test(text)) return null;
  return text;
}

function safeEventPath(value) {
  if (typeof value !== 'string'
    || !value
    || value.length > SKY_ALERT_PATH_MAX
    || !value.startsWith('/')
    || value.startsWith('//')
    || value.includes('\\')
    || value.includes('?')
    || /[\u0000-\u001F\u007F]/.test(value)
    || !SKY_ALERT_PATH_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return null;
  }

  const parts = value.split('#');
  if (parts.length > 2
    || !/^\/[a-z0-9/-]+\/$/i.test(parts[0])
    || (parts.length === 2 && !/^[a-z0-9-]+$/i.test(parts[1]))) {
    return null;
  }

  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin || `${url.pathname}${url.hash}` !== value) return null;
  } catch {
    return null;
  }
  return value;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The machine-readable Registry is live authority. Offline must be an
  // honest network failure, never an old identity verdict.
  if (registryAuthority(url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (registryWing(url)) {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  if (url.pathname.startsWith('/data/')
    || url.pathname.startsWith('/_astro/')
    || url.pathname.startsWith('/assets/zodiac-icons/')
    || url.pathname.startsWith('/fonts/')) {
    event.respondWith(cacheFirst(request, url.pathname.startsWith('/data/') ? DATA_CACHE : SHELL_CACHE));
  }
});

if (PUSH_ENABLED) {
  self.addEventListener('push', (event) => {
    let payload;
    try {
      payload = event.data?.json();
    } catch {
      return;
    }

    const title = boundedAlertText(payload?.title, SKY_ALERT_TITLE_MAX);
    const body = boundedAlertText(payload?.body, SKY_ALERT_BODY_MAX);
    const path = safeEventPath(payload?.url);
    if (!title || !body || !path) return;

    event.waitUntil(self.registration.showNotification(title, {
      body,
      icon: '/assets/app-icons/icon-192.png',
      badge: '/assets/app-icons/icon-192.png',
      tag: 'zodiacs-sky-alert',
      data: { url: path },
    }));
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const path = safeEventPath(event.notification.data?.url);
    if (!path) return;
    const target = new URL(path, self.location.origin).href;

    event.waitUntil((async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })());
  });
}
