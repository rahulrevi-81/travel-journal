// VR Family Travels — Service Worker v3
const CACHE_NAME = 'vr-travels-v3';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/trips/europe-2026.html',
  '/trips/today.html',
  '/trips/emergency.html',
  '/data/europe-2026.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(URLS_TO_CACHE.map(url =>
        cache.add(url).catch(e => console.warn('[SW] Could not cache:', url, e))
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // ── Let browser handle ALL document navigations directly ──
  // This prevents the SW redirect error on page loads
  if (event.request.mode === 'navigate') return;

  const url = new URL(event.request.url);

  // Network-first for JSON
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request, { redirect: 'follow' })
        .then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for everything else (fonts, scripts, images)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request, { redirect: 'follow' }).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      });
    })
  );
});
