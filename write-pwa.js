const fs = require('fs');

// ── 1. PWA Manifest ──────────────────────────────────────────
fs.writeFileSync('public/manifest.json', JSON.stringify({
  name: "BizDoc - Business Management",
  short_name: "BizDoc",
  description: "Create invoices, track payments and manage your business",
  start_url: "/dashboard",
  display: "standalone",
  background_color: "#f5f2ed",
  theme_color: "#1a4a2e",
  orientation: "portrait-primary",
  icons: [
    { src: "/logo-v2.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
    { src: "/logo-v2.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
  ],
  categories: ["business", "finance", "productivity"],
  shortcuts: [
    { name: "New Invoice", url: "/invoices/new", description: "Create a new invoice" },
    { name: "Dashboard", url: "/dashboard", description: "View dashboard" }
  ]
}, null, 2), 'utf8');
console.log('Created manifest.json');

// ── 2. Service Worker ────────────────────────────────────────
fs.writeFileSync('public/sw.js', `
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
`.trim(), 'utf8');
console.log('Created service worker');

// ── 3. Update layout to register SW and add PWA meta tags ────
const layoutContent = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BizDoc - Business Management, Payment and Sales Records",
  description: "Create professional invoices, receive payments globally, and auto-generate receipts.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-v2.png",
    apple: "/logo-v2.png",
    shortcut: "/logo-v2.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BizDoc",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo-v2.png?v=2" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-v2.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a4a2e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BizDoc" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: \`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('SW registered'); })
                .catch(function(err) { console.log('SW failed:', err); });
            });
          }
        \`}} />
      </head>
      <body>{children}</body>
    </html>
  );
}`;

fs.writeFileSync('app/layout.tsx', layoutContent, 'utf8');
console.log('Updated layout with PWA support');
console.log('Done!');