const CACHE_NAME = 'bizdoc-v5';
const APP_SHELL = [
  '/',
  '/dashboard',
  '/invoices/new',
  '/inventory',
  '/expenses',
  '/stats',
  '/settings',
  '/support',
  '/subscribe',
  '/logo-v2.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request).catch(() => null);
        if (response && response.ok) cache.put(request, response.clone());
        return response || cached || new Response('', { status: 503 });
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);

      if (cached) {
        fetchPromise;
        return cached;
      }
      const fresh = await fetchPromise;
      if (fresh) return fresh;
      return new Response(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BizDoc - Offline</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#f5f2ed;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}.card{background:white;border-radius:16px;border:1px solid #e8e4de;padding:48px 32px;max-width:400px;width:100%;text-align:center}.icon{font-size:56px;margin-bottom:16px}.title{font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:8px}.msg{color:#888;font-size:14px;line-height:1.7;margin-bottom:24px}.btn{display:inline-block;padding:12px 28px;background:#1a4a2e;color:white;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none}</style></head><body><div class="card"><div class="icon">📡</div><div class="title">You are offline</div><div class="msg">This page has not been saved for offline use yet. Your previously visited pages and data are still available.</div><a href="/dashboard" class="btn">Go to Dashboard</a></div></body></html>',
        { status: 503, headers: { 'Content-Type': 'text/html' } }
      );
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
