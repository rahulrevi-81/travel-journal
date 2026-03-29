// VR Family Travels — Service Worker
// Caches all key pages and data for offline access

const CACHE_NAME = 'vr-travels-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/trips/europe-2026-planb.html',
  '/trips/today.html',
  '/trips/emergency.html',
  '/data/europe-2026-planb.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Install — cache all key assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      // Cache what we can, don't fail on external resources
      return Promise.allSettled(
        URLS_TO_CACHE.map(url => cache.add(url).catch(e => console.warn('[SW] Could not cache:', url, e)))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for our assets, network-first for external
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always try network first for JSON data (keeps it fresh when online)
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for everything else (HTML, CSS, fonts)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('/trips/europe-2026-planb.html');
        }
      });
    })
  );
});
