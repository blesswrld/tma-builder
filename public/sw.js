// TMA Builder Service Worker - Auto-cleanup and transparent pass-through
// Cleans up any stale cache storage entries and avoids intercepting manifest or API calls

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});

// Do not intercept network requests so all resources (manifest, APIs, chunks) are fetched directly
self.addEventListener('fetch', () => {
  return;
});
