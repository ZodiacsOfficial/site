/* Push only. This worker deliberately has no fetch handler and no cache. */
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === 'string' ? payload.title : 'Today at Zodiacs.org';
  const body = typeof payload.body === 'string' ? payload.body : 'Your daily sky note is ready.';
  const path = typeof payload.url === 'string'
    && payload.url.startsWith('/')
    && !payload.url.startsWith('//')
    ? payload.url
    : '/today/';

  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/assets/app-icons/icon-192.png',
    badge: '/assets/app-icons/icon-192.png',
    tag: 'zodiacs-daily-note',
    data: { url: path },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = typeof event.notification.data?.url === 'string'
    && event.notification.data.url.startsWith('/')
    && !event.notification.data.url.startsWith('//')
    ? event.notification.data.url
    : '/today/';
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
