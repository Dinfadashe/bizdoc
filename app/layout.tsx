import type { Metadata } from "next";
import "./globals.css";
import SyncStatusBadgeWrapper from "@/components/SyncStatusBadgeWrapper";

export const metadata: Metadata = {
  title: "BizDoc - Business Management, Payment and Sales Records",
  description: "Create professional invoices, receive payments globally, and auto-generate receipts.",
  manifest: "/manifest.json",
  icons: { icon: "/logo-v2.png", apple: "/logo-v2.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "BizDoc" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo-v2.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-v2.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a4a2e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BizDoc" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <script dangerouslySetInnerHTML={{ __html: `
          // Register service worker
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(function(reg) {
                  // Check for updates every 60 seconds
                  setInterval(() => reg.update(), 60000);
                  reg.addEventListener('updatefound', function() {
                    const newSW = reg.installing;
                    if (newSW) {
                      newSW.addEventListener('statechange', function() {
                        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                          // New version available - silently update
                          newSW.postMessage('skipWaiting');
                        }
                      });
                    }
                  });
                })
                .catch(function(err) { console.log('SW failed:', err); });
            });
          }
          // Keep session alive - check every 10 minutes
          setInterval(function() {
            const keys = Object.keys(localStorage);
            const sbKey = keys.find(k => k.includes('supabase') && k.includes('auth'));
            if (sbKey) {
              try {
                const session = JSON.parse(localStorage.getItem(sbKey) || '{}');
                if (session.expires_at) {
                  const expiresAt = new Date(session.expires_at * 1000);
                  const now = new Date();
                  const diffMins = (expiresAt - now) / 60000;
                  // If expiring in less than 10 minutes, the Supabase client will auto-refresh
                  // This just logs so we can debug
                  if (diffMins < 60) console.log('Session expires in', Math.round(diffMins), 'mins');
                }
              } catch(e) {}
            }
          }, 600000);
        `}} />
      </head>
      <body>
        {children}
        <SyncStatusBadgeWrapper />
      </body>
    </html>
  );
}
