"use client";
import { useState } from "react";
import Link from "next/link";

const faqs = [
  { q: "What is BizDoc?", a: "BizDoc is a global invoicing and payment platform that lets businesses create professional invoices, receive payments via card, bank transfer, and USSD, and automatically generate receipts." },
  { q: "How does BizDoc make money?", a: "BizDoc charges a 2% platform fee on payments processed through the platform. This is automatically deducted — you never need to manually pay anything." },
  { q: "How do I receive payments?", a: "Connect your bank account in Settings > Payout Account. You can also generate a Dedicated Virtual Account (DVA) for direct bank transfers. Clients can pay by card, bank transfer, or USSD." },
  { q: "When does money reach my account?", a: "Card payments are settled based on your Paystack settlement schedule (instant or next day). DVA bank transfers are automatically forwarded to your bank account within minutes of receipt." },
  { q: "Can I use BizDoc outside Nigeria?", a: "Yes. BizDoc supports NGN, USD, GBP, and EUR invoicing. International card payments are supported. Bank transfer and USSD options are currently available for NGN invoices only." },
  { q: "How do I invite staff members?", a: "Go to Settings > Team tab > enter your staff members email and click Send Invite. They will receive an email with a link to create their account and join your business." },
  { q: "Can staff access my financial data?", a: "No. Staff members can only create and manage invoices. They cannot see revenue stats, reports, or settings." },
  { q: "What happens if a client does not pay?", a: "Invoices automatically cancel after 24 hours if unpaid. You can create a new invoice and resend it. You can also manually mark an invoice as paid if the client pays by cash." },
  { q: "How do I generate a sales report?", a: "Go to Dashboard > Sales Reports > select Monthly or Annual > choose PDF or CSV > click Download." },
  { q: "Is my data secure?", a: "Yes. BizDoc uses Supabase for secure data storage with row-level security. Payments are processed by Paystack which is PCI-DSS compliant. We never store card details." },
  { q: "How do I reset my password?", a: "On the sign-in page, click Forgot Password and enter your email. You will receive a reset link within a few minutes." },
  { q: "How do I delete my account?", a: "Contact support@bizdoc.app to request account deletion. All your data will be removed within 7 days." },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/"><div style={{ color: "var(--green)", fontWeight: 700, fontSize: 13, marginBottom: 24, cursor: "pointer" }}>← Back</div></Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Frequently Asked Questions</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 32 }}>Everything you need to know about BizDoc.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ background: "white", borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "var(--font-body)" }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{faq.q}</span>
                <span style={{ fontSize: 18, color: "var(--green)", marginLeft: 12 }}>{open === i ? "−" : "+"}</span>
              </button>
              {open === i && (
                <div style={{ padding: "0 20px 16px", fontSize: 14, color: "#444", lineHeight: 1.8 }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}