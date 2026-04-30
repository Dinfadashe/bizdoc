const fs = require('fs');
const content = [
'import type { Metadata } from "next";',
'import "./globals.css";',
'',
'export const metadata: Metadata = {',
'  title: "BizDoc - Business Management, Payment and Sales Records",',
'  description: "Create professional invoices, receive payments globally, and auto-generate receipts. BizDoc is the complete business management platform.",',
'  icons: {',
'    icon: "/logo.png",',
'    apple: "/logo.png",',
'    shortcut: "/logo.png",',
'  },',
'};',
'',
'export default function RootLayout({ children }: { children: React.ReactNode }) {',
'  return (',
'    <html lang="en">',
'      <head>',
'        <link rel="icon" href="/logo.png" type="image/png" />',
'        <link rel="apple-touch-icon" href="/logo.png" />',
'      </head>',
'      <body>{children}</body>',
'    </html>',
'  );',
'}',
].join('\n');
fs.writeFileSync('app/layout.tsx', content, { encoding: 'utf8' });
console.log('Done');