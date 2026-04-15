const CACHE = 'slovicka-v1';
const SOUBORY = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SOUBORY))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(klice =>
      Promise.all(klice.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Pouze GET požadavky, přeskočit chrome-extension a jiné schéma
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cachovat jen platné odpovědi
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const klon = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, klon));
        return response;
      });
    })
  );
});
