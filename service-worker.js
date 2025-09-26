const CACHE_NAME = 'makhzonak-plus-cache-v4'; // Incremented cache version
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx',
  'https://cdn.tailwindcss.com',
  '/icon-192.svg',
  '/icon-512.svg',
  '/icon-maskable-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching core assets');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    // Don't cache non-GET requests or non-http requests (e.g., chrome-extension://)
    return;
  }
  
  // Stale-while-revalidate strategy
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // If the request is successful, update the cache
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(error => {
          // Network fetch failed, which is expected offline.
          // If there was no cached response either, this will result in a fetch error.
          console.log('Network request failed:', event.request.url, error);
        });

        // Return the cached response immediately if it exists,
        // while the network request is running in the background.
        return cachedResponse || fetchPromise;
      });
    })
  );
});


// Clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
