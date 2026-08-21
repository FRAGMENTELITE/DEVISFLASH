const CACHE_NAME = 'devis-flash-v3-2026-tva-statuts-pdf';
const urlsToCache = [
  '/DEVISFLASH/',
  '/DEVISFLASH/index.html',
  '/DEVISFLASH/manifest.json',
  '/DEVISFLASH/robots.txt',
  '/DEVISFLASH/sitemap.xml',
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(()=>caches.match('/DEVISFLASH/'));
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(()=>self.clients.claim())
  );
});
