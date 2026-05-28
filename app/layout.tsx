import type { Metadata } from "next";
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
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('SW registered'); })
                .catch(function(err) { console.log('SW failed:', err); });
            });
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}