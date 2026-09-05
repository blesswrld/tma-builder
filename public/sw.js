// TMA Builder - Service Worker v2.0.0
// Robust Cache-First strategy for static assets (fonts, logo, icons, styles)

const CACHE_NAME = 'tma-builder-static-v2';

// Core assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/apple-touch-icon.png'
];

// Determine if a URL can be cached by Cache Storage
function isCacheable(url) {
  // Only http and https schemes are supported by Cache API
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }

  // Never cache API, WebSocket, or Vite internal dev server endpoints
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/ws') ||
    url.pathname.startsWith('/@') ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('__vite')
  ) {
    return false;
  }

  return true;
}

// Determine if request is a static resource suitable for cache-first strategy
function isStaticAsset(url) {
  if (!isCacheable(url)) {
    return false;
  }

  // Fonts from Google Fonts CDN
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    return true;
  }

  // App logo, icons, favicon, manifest
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/logo.svg' ||
    url.pathname === '/manifest.json'
  ) {
    return true;
  }

  // Static bundle assets, styles, fonts, images
  const pathname = url.pathname.toLowerCase();
  return (
    pathname.startsWith('/assets/') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.ico')
  );
}

// 1. Install event: pre-cache critical shell and assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          PRECACHE_ASSETS.map((asset) =>
            fetch(asset, { cache: 'no-cache' })
              .then((res) => {
                if (res && (res.status === 200 || res.status === 0)) {
                  return cache.put(asset, res);
                }
              })
              .catch((err) => {
                console.warn('[SW] Pre-cache item skipped:', asset, err);
              })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activate event: clean up outdated caches and take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch event
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Ignore unsupported protocols (chrome-extension://, moz-extension://, blob:, data:, etc.)
  if (!isCacheable(url)) {
    return;
  }

  // Strategy A: Cache-First for static assets (fonts, logo, styles, images)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache).catch(() => {});
              });
            }
            return networkResponse;
          })
          .catch(async () => {
            // Safe fallback if offline and not in cache
            if (request.destination === 'image') {
              const fallbackIcon = await caches.match('/favicon.svg');
              if (fallbackIcon) return fallbackIcon;
            }
            return new Response('', { status: 408, statusText: 'Request timed out' });
          });
      })
    );
    return;
  }

  // Strategy B: Network-First with cache fallback for navigation / HTML documents
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Robust fallback search for index.html shell
          const cachedDirect = await caches.match(request);
          if (cachedDirect) return cachedDirect;

          const fallbackIndex = await caches.match('/index.html');
          if (fallbackIndex) return fallbackIndex;

          const fallbackRoot = await caches.match('/');
          if (fallbackRoot) return fallbackRoot;

          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="background:#08080b;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>Нет подключения к сети</h2><p>Пожалуйста, проверьте интернет-соединение.</p></div></body></html>',
            {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=UTF-8' }
            }
          );
        })
    );
    return;
  }

  // All other requests (e.g. non-static, dev modules) are NOT intercepted
  // Let the browser handle them naturally so Vite and dev server work without interference
});
