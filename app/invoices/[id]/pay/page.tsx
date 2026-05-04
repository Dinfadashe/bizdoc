// Public pay page — client views invoice and sees payment instructions
"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Invoice } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface BizAccount {
  account_number: string;
  account_name: string;
  bank_name: string;
  currency: string;
  is_default: boolean;
}

interface Business {
  name: string;
  email: string;
  phone: string;
  address: string;
  logo_url: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  dva_account_number: string;
  dva_account_name: string;
  dva_bank: string;
}

export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [activeAccount, setActiveAccount] = useState<{ account_number: string; account_name: string; bank_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).single();
    if (!inv) { setLoading(false); return; }
    setInvoice(inv);

    const { data: biz } = await supabase.from("businesses").select("*").eq("user_id", inv.user_id).single();
    setBusiness(biz);

    // Resolve best NGN account: default bizAccount > first bizAccount > DVA fallback > legacy
    const acctRes = await fetch("/api/business-accounts?user_id=" + inv.user_id);
    const acctData = await acctRes.json();
    const accounts: BizAccount[] = acctData.accounts ?? [];
    const ngn = accounts.filter(a => !a.currency || a.currency === "NGN");
    const best = ngn.find(a => a.is_default) ?? ngn[0];
    if (best) {
      setActiveAccount({ account_number: best.account_number, account_name: best.account_name, bank_name: best.bank_name });
    } else if (biz?.dva_account_number) {
      setActiveAccount({ account_number: biz.dva_account_number, account_name: biz.dva_account_name, bank_name: biz.dva_bank });
    } else if (biz?.account_number) {
      setActiveAccount({ account_number: biz.account_number, account_name: biz.account_name, bank_name: biz.bank_name });
    }

    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getUssdCodes = () => {
    if (!activeAccount?.account_number || !invoice) return [];
    const acc = activeAccount.account_number;
    const amt = Math.round(Number(invoice.total));
    return [
      { label: "GTBank",    code: `*737*2*${amt}*${acc}#` },
      { label: "Zenith",    code: `*966*${amt}*${acc}#` },
      { label: "Access",    code: `*901*000*${acc}*${amt}#` },
      { label: "First Bank",code: `*894*${acc}*${amt}#` },
      { label: "UBA",       code: `*919*3*${acc}*${amt}#` },
      { label: "OPay",      code: `*955*${acc}*${amt}#` },
      { label: "Kuda",      code: `*5573*${acc}*${amt}#` },
      { label: "Sterling",  code: `*822*3*${acc}*${amt}#` },
    ];
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#888", fontFamily: "Georgia, serif" }}>Loading invoice...</div>;
  if (!invoice) return <div style={{ padding: 60, textAlign: "center", color: "#888" }}>Invoice not found.</div>;

  const isPaid = invoice.status === "paid";
  const showNgnPayment = invoice.currency === "NGN" && activeAccount;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f2ed", padding: "32px 16px", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          {business?.logo_url && (
            <img src={business.logo_url} alt="logo" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 10, marginBottom: 10 }} />
          )}
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1a4a2e" }}>{business?.name || "BizDoc"}</div>
          {business?.email && <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{business.email}</div>}
        </div>

        {isPaid ? (
          /* ── PAID STATE ── */
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #e8e4de", overflow: "hidden", textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1a4a2e", marginBottom: 8 }}>Payment Complete</div>
            <div style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>
              Invoice {invoice.invoice_number} has been paid.
            </div>
            <div style={{ background: "#e8f5ef", borderRadius: 10, padding: "20px 24px", display: "inline-block" }}>
              <div style={{ fontSize: 13, color: "#2e7d52", marginBottom: 4 }}>Amount Paid</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1a4a2e" }}>{formatCurrency(invoice.total, invoice.currency)}</div>
            </div>
          </div>
        ) : (
          <>
            {/* ── INVOICE SUMMARY ── */}
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #e8e4de", overflow: "hidden", marginBottom: 16 }}>
              <div style={{ background: "#1a4a2e", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#a8d5b5", fontSize: 11, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 2 }}>Invoice</div>
                  <div style={{ color: "white", fontSize: 18, fontWeight: 700 }}>{invoice.invoice_number}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#a8d5b5", fontSize: 11, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 2 }}>Amount Due</div>
                  <div style={{ color: "white", fontSize: 22, fontWeight: 700 }}>{formatCurrency(invoice.total, invoice.currency)}</div>
                </div>
              </div>

              <div style={{ padding: "20px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 3 }}>Billed To</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{invoice.client_name}</div>
                    {invoice.client_email && <div style={{ fontSize: 13, color: "#555" }}>{invoice.client_email}</div>}
                  </div>
                  {invoice.due_date && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 3 }}>Due Date</div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: new Date(invoice.due_date) < new Date() ? "#cc2222" : "#1a1a1a" }}>
                        {new Date(invoice.due_date).toDateString()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Line items */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f5f2ed" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.8px" }}>Item</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.8px" }}>Qty</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.8px" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f0ece6" }}>
                        <td style={{ padding: "10px 10px" }}>{item.description}</td>
                        <td style={{ padding: "10px 10px", textAlign: "center", color: "#888" }}>{item.qty}</td>
                        <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 600 }}>{formatCurrency(item.qty * item.unit_price, invoice.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ width: 220 }}>
                    {invoice.discount_amount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#888", padding: "3px 0" }}>
                        <span>Discount</span><span>−{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
                      </div>
                    )}
                    {invoice.tax_amount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#888", padding: "3px 0" }}>
                        <span>Tax ({invoice.tax_rate}%)</span><span>{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 17, borderTop: "2px solid #1a4a2e", paddingTop: 10, marginTop: 6 }}>
                      <span>Total</span><span style={{ color: "#1a4a2e" }}>{formatCurrency(invoice.total, invoice.currency)}</span>
                    </div>
                  </div>
                </div>

                {invoice.notes && (
                  <div style={{ background: "#f5f2ed", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#555", marginTop: 16 }}>
                    <strong style={{ display: "block", marginBottom: 4, color: "#1a1a1a" }}>Notes</strong>
                    {invoice.notes}
                  </div>
                )}
              </div>
            </div>

            {/* ── PAYMENT INSTRUCTIONS ── */}
            {showNgnPayment && (
              <div style={{ background: "white", borderRadius: 14, border: "1px solid #e8e4de", overflow: "hidden", marginBottom: 16 }}>
                <div style={{ background: "#e8f0ff", borderBottom: "1px solid #b8c8ff", padding: "14px 24px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#2255cc", textTransform: "uppercase", letterSpacing: "1px" }}>How to Pay</div>
                </div>
                <div style={{ padding: "20px 24px" }}>
                  {/* Bank transfer details */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Bank Transfer</div>
                    <div style={{ background: "#f5f9ff", border: "1px solid #b8c8ff", borderRadius: 10, padding: "16px 18px" }}>
                      {[
                        { label: "Bank", value: activeAccount!.bank_name },
                        { label: "Account Number", value: activeAccount!.account_number },
                        { label: "Account Name", value: activeAccount!.account_name },
                        { label: "Amount", value: formatCurrency(invoice.total, invoice.currency) },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #e8f0ff" }}>
                          <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontFamily: label === "Account Number" ? "monospace" : "inherit", fontSize: label === "Account Number" ? 16 : 14, letterSpacing: label === "Account Number" ? 1 : 0 }}>{value}</span>
                            {(label === "Account Number" || label === "Amount") && (
                              <button
                                onClick={() => copy(value.replace(/[^\d]/g, ""), label)}
                                style={{ fontSize: 11, padding: "2px 8px", background: copiedField === label ? "#e8f5ef" : "#e8f0ff", color: copiedField === label ? "#1a6b4a" : "#2255cc", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                              >
                                {copiedField === label ? "Copied!" : "Copy"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: "#2255cc", marginTop: 8 }}>⚠️ Transfer the exact amount — include the invoice number as your narration.</div>
                  </div>

                  {/* USSD */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>USSD — No Internet Required</div>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>Dial the code for YOUR bank to transfer to {activeAccount!.bank_name}:</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {getUssdCodes().map(({ label, code }) => (
                        <div key={label} onClick={() => copy(code, label)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: copiedField === label ? "#e8f5ef" : "#f5f9ff", border: `1px solid ${copiedField === label ? "#b8dfc9" : "#b8c8ff"}`, borderRadius: 6, cursor: "pointer", transition: "background 0.15s" }}>
                          <span style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>{label}</span>
                          <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: copiedField === label ? "#1a6b4a" : "#1a1a1a" }}>{copiedField === label ? "Copied!" : code}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>Tap any code to copy it.</div>
                  </div>
                </div>
              </div>
            )}

            {/* Non-NGN or no account */}
            {!showNgnPayment && (
              <div style={{ background: "white", borderRadius: 14, border: "1px solid #e8e4de", padding: "24px 28px", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 6 }}>Payment Information</div>
                <div style={{ fontSize: 14, color: "#555", lineHeight: 1.7 }}>
                  {invoice.payment_info || "Please contact the sender for payment instructions."}
                </div>
              </div>
            )}

            {/* Footer note */}
            <div style={{ textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 8 }}>
              Powered by BizDoc · Once paid, notify {business?.name || "the business"} with your payment reference.
            </div>
          </>
        )}
      </div>
    </div>
  );
}