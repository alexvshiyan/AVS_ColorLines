// Color Lines PWA Service Worker
// Versioned cache names intentionally change when the service worker changes.
const CACHE_NAME = 'colorlines-v2-20260521';

// Keep the install cache limited to stable PWA assets. Do not pre-cache '/':
// the HTML app shell must be fetched network-first so returning visitors do
// not stay pinned to an old build after a production deploy.
const PRECACHE_URLS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') {
    return;
  }

  // Always go to network for API and tRPC calls.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/manus-storage/')) {
    return;
  }

  // HTML navigations must be network-first. If the user is offline, fall back
  // to the last successfully fetched navigation response, if one exists.
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Cache-first only for immutable hashed/static assets and icons.
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|webp|svg|woff2?|ttf)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
