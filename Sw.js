
const CACHE_NAME = 'devis-flash-v2026-10-29-FIX-ULTIME';
const urlsToCache = [
  '/',
  '/index.html'
];

// Install - force new cache
self.addEventListener('install', event => {
  console.log('[SW] Install new version - clearing old cache');
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Activate - claim clients immediately
self.addEventListener('activate', event => {
  console.log('[SW] Activate - claiming clients');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Network first for HTML, cache first for assets
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // For HTML pages - always network first
  if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone and cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
  
  // For other assets - cache first
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request);
    })
  );
});
