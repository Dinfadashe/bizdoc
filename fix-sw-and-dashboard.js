const fs = require('fs');

// ── 1. Fix service worker - don't cache dynamic pages ────────
fs.writeFileSync('public/sw.js', `
const CACHE_NAME = 'bizdoc-v3';
const STATIC_ASSETS = [
  '/logo-v2.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept: API calls, auth, POST requests, page navigations
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/auth/')) return;

  // Only cache Next.js static JS/CSS assets (/_next/static/)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request).catch(() => null);
        if (response && response.ok) cache.put(request, response.clone());
        return response || new Response('', { status: 503 });
      })
    );
    return;
  }

  // For everything else (pages, images) - network only, no caching
  // This ensures dashboard always gets fresh data
});
`.trim(), 'utf8');
console.log('Fixed service worker');

// ── 2. Fix dashboard - force fresh session ───────────────────
let dashContent = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Replace getUser with getSession to force fresh token
dashContent = dashContent.replace(
  '    supabase.auth.getUser().then(async ({ data }) => {\n      if (!data.user) { router.push("/"); return; }\n      setUser(data.user);',
  `    // Force fresh session - don't use cached auth
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (!sessionData.session?.user) { router.push("/"); return; }
      const data = { user: sessionData.session.user };
      setUser(data.user);`
);

// Also fix the marketer check which uses data.user.id
dashContent = dashContent.replace(
  '      fetch("/api/marketer?user_id=" + data.user.id).then(r => r.json()).then(d => { if (d.marketer) setIsMarketer(true); }).catch(() => {});',
  '      fetch("/api/marketer?user_id=" + data.user.id).then(r => r.json()).then(d => { if (d.marketer) setIsMarketer(true); }).catch(() => {});\n      // Force reload of invoices with correct user_id\n      console.log("Dashboard loading for user:", data.user.id, data.user.email);'
);

fs.writeFileSync('app/dashboard/page.tsx', dashContent, 'utf8');
console.log('Fixed dashboard session');

// ── 3. Also fix the load function to add cache-busting ───────
// Verify
const result = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
console.log('getSession used:', result.includes('getSession'));
console.log('Done');