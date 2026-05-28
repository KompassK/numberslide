// Pastel Push — service worker
// Cache-first strategy so the game works fully offline once installed.

const CACHE_NAME = 'number-slide-v1';

// All files needed to run the game offline. Paths are relative to the SW
// scope (the folder this file lives in), so they work both when served
// from a domain root and from a subdirectory.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

// On install: pre-cache the full app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  // Activate immediately so the new SW takes over the next page load.
  self.skipWaiting();
});

// On activate: clean up old caches from previous versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// On fetch: serve from cache first, fall back to network, then to the
// cached app shell if everything else fails (handles deep links offline).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Stash successful same-origin responses for next time.
          if (response && response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, clone)
            );
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
