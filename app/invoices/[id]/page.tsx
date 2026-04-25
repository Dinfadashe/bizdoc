"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { Invoice, Receipt } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: "#f0f0f0", text: "#888" },
  sent:      { bg: "#e8f0ff", text: "#2255cc" },
  paid:      { bg: "#e8f5ef", text: "#1a6b4a" },
  overdue:   { bg: "#fff0f0", text: "#cc2222" },
  cancelled: { bg: "#f5f5f5", text: "#aaa" },
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [business, setBusiness] = useState<{ name: string; email: string; phone: string; address: string; logo_url: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingLink, setSendingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [printMode, setPrintMode] = useState(false);

  const load = useCallback(async () => {
    const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).single();
    if (!inv) { router.push("/dashboard"); return; }
    setInvoice(inv);

    const { data: biz } = await supabase.from("businesses").select("*").eq("user_id", inv.user_id).single();
    setBusiness(biz);

    const { data: rec } = await supabase.from("receipts").select("*").eq("invoice_id", id).single();
    setReceipt(rec);

    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const generatePaymentLink = async () => {
    if (!invoice) return;
    setSendingLink(true);
    const res = await fetch(`/api/invoices/${id}/payment-link`, { method: "POST" });
    const data = await res.json();
    setSendingLink(false);
    if (data.payment_url) {
      setInvoice({ ...invoice, payment_url: data.payment_url, status: "sent" });
    } else {
      alert(data.error ?? "Failed to generate payment link");
    }
  };

  const copyLink = () => {
    if (!invoice?.payment_url) return;
    navigator.clipboard.writeText(invoice.payment_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => { window.print(); setPrintMode(false); }, 200);
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>Loading...</div>;
  if (!invoice) return null;

  const sc = STATUS_COLORS[invoice.status] ?? STATUS_COLORS.draft;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      {/* Nav */}
      {!printMode && (
        <nav className="no-print" style={{ background: "var(--green)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/dashboard">
            <button style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>←</button>
          </Link>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white", flex: 1 }}>
            {invoice.invoice_number}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handlePrint} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
              🖨 Print
            </button>
            {invoice.status === "paid" && receipt && (
              <Link href={`/invoices/${id}/receipt`}>
                <button style={{ background: "#4caf7d", border: "none", color: "white", padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>
                  View Receipt
                </button>
              </Link>
            )}
          </div>
        </nav>
      )}

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 20px" }}>

        {/* Action banner */}
        {!printMode && invoice.status !== "paid" && invoice.status !== "cancelled" && (
          <div className="no-print" style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
                {invoice.status === "draft" ? "Ready to send?" : "Payment link active"}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                {invoice.status === "draft"
                  ? "Generate a Paystack payment link and email it to your client."
                  : invoice.payment_url
                    ? `Client can pay via: ${invoice.payment_url.slice(0, 50)}...`
                    : "No payment link yet."}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {invoice.payment_url && (
                <button onClick={copyLink} style={{ padding: "9px 18px", background: copied ? "var(--green-light)" : "#f5f2ed", color: copied ? "var(--green)" : "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)" }}>
                  {copied ? "✓ Copied!" : "Copy Link"}
                </button>
              )}
              <button onClick={generatePaymentLink} disabled={sendingLink} style={{ padding: "9px 20px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, cursor: sendingLink ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)", opacity: sendingLink ? 0.7 : 1 }}>
                {sendingLink ? "Generating..." : invoice.payment_url ? "Resend Invoice" : "Generate & Send →"}
              </button>
            </div>
          </div>
        )}

        {/* Paid banner */}
        {invoice.status === "paid" && (
          <div className="no-print" style={{ background: "var(--green-light)", borderRadius: 12, border: "1px solid #b8dfc9", padding: "16px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: "var(--green)", fontSize: 15 }}>Payment Received</div>
              <div style={{ fontSize: 13, color: "#2e7d52" }}>
                Paid on {invoice.paid_at ? new Date(invoice.paid_at).toLocaleString("en-NG") : "—"} · Receipt auto-emailed to {invoice.client_email}
              </div>
            </div>
          </div>
        )}

        {/* Invoice document */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }} id="invoice-doc">

          {/* Header */}
          <div style={{ background: "var(--green)", padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              {business?.logo_url && <img src={business.logo_url} alt="logo" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8, marginBottom: 10 }} />}
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "white" }}>{business?.name || "Your Business"}</div>
              <div style={{ color: "#a8d5b5", fontSize: 13, marginTop: 4, lineHeight: 1.7 }}>
                {business?.address && <span>{business.address}<br /></span>}
                {business?.email}<br />
                {business?.phone}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, color: "white", letterSpacing: -1 }}>INVOICE</div>
              <div style={{ color: "#a8d5b5", fontSize: 14, marginTop: 6 }}>{invoice.invoice_number}</div>
              <div style={{ marginTop: 10 }}>
                <span style={{ background: sc.bg, color: sc.text, padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px" }}>
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>

          {/* Meta strip */}
          <div style={{ background: "#faf9f7", padding: "14px 32px", display: "flex", gap: 32, flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
            {[
              ["Issue Date", new Date(invoice.issue_date).toDateString()],
              invoice.due_date ? ["Due Date", new Date(invoice.due_date).toDateString()] : null,
              ["Currency", invoice.currency],
              invoice.paid_at ? ["Paid On", new Date(invoice.paid_at).toDateString()] : null,
            ].filter(Boolean).map(([label, val]) => (
              <div key={label as string}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{val as string}</div>
              </div>
            ))}
          </div>

          {/* Parties */}
          <div style={{ padding: "24px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 8 }}>From</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 }}>{business?.name || "—"}</div>
              <div style={{ color: "#555", fontSize: 13, lineHeight: 1.7, marginTop: 4 }}>
                {business?.address}<br />{business?.email}<br />{business?.phone}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 8 }}>Bill To</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 }}>{invoice.client_name || "—"}</div>
              <div style={{ color: "#555", fontSize: 13, lineHeight: 1.7, marginTop: 4 }}>
                {invoice.client_address && <>{invoice.client_address}<br /></>}
                {invoice.client_email && <>{invoice.client_email}<br /></>}
                {invoice.client_phone}
              </div>
            </div>
          </div>

          {/* Items table */}
          <div style={{ padding: "0 32px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--green)" }}>
                  {["#", "Description", "Qty", "Unit Price", "Amount"].map((h, i) => (
                    <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "white", textAlign: i >= 3 ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 1 ? "#faf9f7" : "white" }}>
                    <td style={{ padding: "11px 12px", color: "var(--muted)", fontSize: 13 }}>{idx + 1}</td>
                    <td style={{ padding: "11px 12px", fontSize: 14 }}>{item.description}</td>
                    <td style={{ padding: "11px 12px", fontSize: 14 }}>{item.qty}</td>
                    <td style={{ padding: "11px 12px", fontSize: 14, textAlign: "right" }}>{formatCurrency(item.unit_price, invoice.currency)}</td>
                    <td style={{ padding: "11px 12px", fontSize: 14, fontWeight: 600, textAlign: "right" }}>{formatCurrency(item.qty * item.unit_price, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ padding: "20px 32px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border)" }}>
            <div style={{ width: 260 }}>
              {[
                ["Subtotal", formatCurrency(invoice.subtotal, invoice.currency)],
                invoice.discount_amount > 0 ? ["Discount", `−${formatCurrency(invoice.discount_amount, invoice.currency)}`] : null,
                invoice.tax_amount > 0 ? [`Tax (${invoice.tax_rate}%)`, formatCurrency(invoice.tax_amount, invoice.currency)] : null,
              ].filter(Boolean).map(([label, val]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)", padding: "4px 0" }}>
                  <span>{label}</span><span>{val as string}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, borderTop: "2px solid var(--green)", paddingTop: 10, marginTop: 6 }}>
                <span>Total</span><span style={{ color: "var(--green)" }}>{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes & payment info */}
          {(invoice.notes || invoice.payment_info) && (
            <div style={{ padding: "20px 32px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {invoice.notes && <div><div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 6 }}>Notes</div><div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{invoice.notes}</div></div>}
              {invoice.payment_info && <div><div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 6 }}>Payment Instructions</div><div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{invoice.payment_info}</div></div>}
            </div>
          )}

          {/* Pay button for client (shown if payment_url exists & not paid) */}
          {invoice.payment_url && invoice.status !== "paid" && (
            <div style={{ padding: "24px 32px", borderTop: "1px solid var(--border)", textAlign: "center", background: "var(--green-light)" }}>
              <a href={invoice.payment_url} target="_blank" rel="noreferrer">
                <button style={{ background: "var(--green)", color: "white", border: "none", padding: "14px 40px", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                  Pay Now — {formatCurrency(invoice.total, invoice.currency)}
                </button>
              </a>
              <div style={{ color: "#2e7d52", fontSize: 12, marginTop: 8 }}>Secured by Paystack · Cards, Bank Transfer, USSD</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
