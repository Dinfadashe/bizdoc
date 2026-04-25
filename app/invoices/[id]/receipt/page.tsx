"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Invoice, Receipt } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [business, setBusiness] = useState<{ name: string; email: string; phone: string; address: string; logo_url: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).single();
    if (!inv) { setLoading(false); return; }
    setInvoice(inv);
    const { data: rec } = await supabase.from("receipts").select("*").eq("invoice_id", id).single();
    setReceipt(rec);
    const { data: biz } = await supabase.from("businesses").select("*").eq("user_id", inv.user_id).single();
    setBusiness(biz);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>Loading...</div>;
  if (!invoice || !receipt) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>Receipt not found.</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", fontFamily: "var(--font-body)" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
      <div className="no-print" style={{ maxWidth: 700, margin: "0 auto", padding: "24px 20px 0", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => window.print()} style={{ padding: "9px 20px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
          Print Receipt
        </button>
      </div>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px" }}>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ background: "var(--green)", padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              {business?.logo_url && (
                <img src={business.logo_url} alt="logo" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 8, marginBottom: 10 }} />
              )}
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white" }}>{business?.name || "Business"}</div>
              <div style={{ color: "#a8d5b5", fontSize: 12, lineHeight: 1.7 }}>
                {business?.address && <>{business.address}<br /></>}
                {business?.email}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "white", letterSpacing: -0.5 }}>RECEIPT</div>
              <div style={{ color: "#a8d5b5", fontSize: 13, marginTop: 6 }}>{receipt.receipt_number}</div>
              <div style={{ marginTop: 10 }}>
                <span style={{ background: "#e8f5ef", color: "#1a6b4a", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const }}>PAID</span>
              </div>
            </div>
          </div>
          <div style={{ background: "var(--green-light)", padding: "20px 32px", borderBottom: "1px solid #b8dfc9", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 36 }}>&#x2705;</div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--green)" }}>
                {formatCurrency(receipt.amount_paid, invoice.currency)} Received
              </div>
              <div style={{ color: "#2e7d52", fontSize: 13 }}>
                Payment confirmed on {new Date(receipt.paid_at).toLocaleString("en-NG")}
              </div>
            </div>
          </div>
          <div style={{ padding: "24px 32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 8 }}>Paid By</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 }}>{invoice.client_name}</div>
                <div style={{ color: "#555", fontSize: 13, marginTop: 4, lineHeight: 1.7 }}>
                  {invoice.client_email && <>{invoice.client_email}<br /></>}
                  {invoice.client_address}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 8 }}>Payment Details</div>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <tbody>
                    {[
                      ["Receipt No.", receipt.receipt_number],
                      ["Invoice No.", invoice.invoice_number],
                      ["Method", receipt.payment_method],
                      ["Reference", receipt.paystack_reference],
                    ].map(([label, val]) => (
                      <tr key={label}>
                        <td style={{ color: "var(--muted)", paddingBottom: 4, paddingRight: 16 }}>{label}</td>
                        <td style={{ fontWeight: 600, wordBreak: "break-all" as const, fontSize: label === "Reference" ? 11 : 13 }}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
              <thead>
                <tr style={{ background: "var(--green)" }}>
                  {["Description", "Qty", "Unit Price", "Amount"].map((h, i) => (
                    <th key={h} style={{ padding: "9px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "white", textAlign: i >= 2 ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 1 ? "#faf9f7" : "white", borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 12px", fontSize: 14 }}>{item.description}</td>
                    <td style={{ padding: "10px 12px", fontSize: 14 }}>{item.qty}</td>
                    <td style={{ padding: "10px 12px", fontSize: 14, textAlign: "right" }}>{formatCurrency(item.unit_price, invoice.currency)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 600, textAlign: "right" }}>{formatCurrency(item.qty * item.unit_price, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: 260 }}>
                {[
                  ["Subtotal", formatCurrency(invoice.subtotal, invoice.currency)],
                  invoice.discount_amount > 0 ? ["Discount", "-" + formatCurrency(invoice.discount_amount, invoice.currency)] : null,
                  invoice.tax_amount > 0 ? ["Tax (" + invoice.tax_rate + "%)", formatCurrency(invoice.tax_amount, invoice.currency)] : null,
                ].filter(Boolean).map(([label, val]) => (
                  <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)", padding: "4px 0" }}>
                    <span>{label}</span><span>{val as string}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, borderTop: "2px solid var(--green)", paddingTop: 10, marginTop: 6 }}>
                  <span>Amount Paid</span>
                  <span style={{ color: "var(--green)" }}>{formatCurrency(invoice.total, invoice.currency)}</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: "#faf9f7", padding: "16px 32px", borderTop: "1px solid var(--border)", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
            {business?.name} · {business?.address} · {business?.phone}
            <div style={{ marginTop: 4 }}>This is an official payment receipt. Keep it for your records.</div>
          </div>
        </div>
      </div>
    </div>
  );
}