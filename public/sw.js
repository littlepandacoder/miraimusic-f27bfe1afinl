const CACHE = 'musicable-v3';

const PRECACHE = ['/', '/index.html', '/logo.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Push notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Musicable', {
      body: data.body || 'Time to practise! 🎹',
      icon: data.icon || '/logo.png',
      badge: data.badge || '/logo.png',
      data: { url: data.url || '/login' },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = e.notification.data?.url || '/login';
  e.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((wins) => {
        const existing = wins.find((w) => w.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          existing.navigate(target);
        } else {
          clients.openWindow(target);
        }
      })
  );
});
