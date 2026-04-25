// Public payment page — client lands here after Paystack callback
"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Invoice } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "1";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("invoices").select("*").eq("id", id).single();
    setInvoice(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Poll for status change (webhook may take a moment)
  useEffect(() => {
    if (!verified || !invoice || invoice.status === "paid") return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("invoices").select("status, paid_at").eq("id", id).single();
      if (data?.status === "paid") {
        setInvoice((prev) => prev ? { ...prev, status: "paid", paid_at: data.paid_at } : prev);
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [verified, invoice, id]);

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted)", fontFamily: "var(--font-body)" }}>Loading...</div>;
  if (!invoice) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>Invoice not found.</div>;

  const isPaid = invoice.status === "paid";

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--green)" }}>BizDoc</div>
        </div>

        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
          {isPaid ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--green)", marginBottom: 8 }}>Payment Confirmed!</div>
              <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
                A receipt has been sent to <strong>{invoice.client_email}</strong>
              </div>
              <div style={{ background: "var(--green-light)", borderRadius: 10, padding: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Amount Paid</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--green)" }}>{formatCurrency(invoice.total, invoice.currency)}</div>
                <div style={{ fontSize: 13, color: "#2e7d52", marginTop: 4 }}>{invoice.invoice_number}</div>
              </div>
              <Link href={`/invoices/${id}/receipt`}>
                <button style={{ background: "var(--green)", color: "white", border: "none", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                  View Receipt
                </button>
              </Link>
            </div>
          ) : (
            <>
              <div style={{ background: "var(--green)", padding: "24px 28px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "white" }}>Invoice Payment</div>
                <div style={{ color: "#a8d5b5", fontSize: 13, marginTop: 4 }}>{invoice.invoice_number}</div>
              </div>
              <div style={{ padding: 28 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>PAYING TO</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{invoice.client_name}</div>
                </div>
                <div style={{ background: "var(--green-light)", borderRadius: 10, padding: 20, textAlign: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>AMOUNT DUE</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "var(--green)" }}>{formatCurrency(invoice.total, invoice.currency)}</div>
                  {invoice.due_date && <div style={{ fontSize: 12, color: "#2e7d52", marginTop: 4 }}>Due {new Date(invoice.due_date).toDateString()}</div>}
                </div>

                {verified ? (
                  <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                    Confirming your payment...
                  </div>
                ) : invoice.payment_url ? (
                  <a href={invoice.payment_url} style={{ display: "block", textAlign: "center" }}>
                    <button style={{ width: "100%", padding: "14px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                      Pay Now — {formatCurrency(invoice.total, invoice.currency)}
                    </button>
                  </a>
                ) : (
                  <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Payment link not available yet.</div>
                )}
                <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: 12 }}>
                  🔒 Secured by Paystack · Cards, Bank Transfer, USSD
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
