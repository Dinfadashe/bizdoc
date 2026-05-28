const CACHE_NAME = 'bizdoc-v2';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/invoices/new',
  '/inventory',
  '/expenses',
  '/stats',
  '/settings',
  '/support',
  '/logo-v2.png',
  '/manifest.json',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and API calls (always network for those)
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/_next/')) {
    // Cache Next.js static files aggressively
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request).catch(() => null);
        if (response && response.ok) cache.put(request, response.clone());
        return response || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // For pages: network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || caches.match('/dashboard') || new Response('You are offline. Please check your connection.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      })
  );
});