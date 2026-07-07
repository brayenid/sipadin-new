const CACHE_NAME = 'sipadin-offline-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // PWA requires a fetch event listener to be installable.
  // We leave this empty to let the browser handle all requests natively.
  // This completely avoids any Next.js App Router interception bugs.
  // The offline UI is handled by React (OfflineIndicator.tsx).
});
