// Color Lines PWA Service Worker
const CACHE_NAME = 'colorlines-v1';

// Assets to cache on install (shell of the app)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always go to network for API and tRPC calls
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/manus-storage/')) {
    return;
  }

  // Cache-first strategy for static assets (JS, CSS, images, fonts)
  if (
    event.request.method === 'GET' &&
    (url.pathname.match(/\.(js|css|png|jpg|jpeg|webp|svg|woff2?|ttf)$/) ||
      url.pathname === '/')
  ) {
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
