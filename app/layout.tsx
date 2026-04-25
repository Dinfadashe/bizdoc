import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BizDoc — Invoices & Receipts",
  description: "Create, send, and get paid. Invoices with Paystack built in.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
