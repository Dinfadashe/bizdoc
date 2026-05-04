"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { Invoice, Receipt } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import QRCode from "qrcode";
import html2canvas from "html2canvas";

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
  const [business, setBusiness] = useState<{ name: string; email: string; phone: string; address: string; logo_url: string; account_name: string; account_number: string; bank_name: string; dva_account_number: string; dva_account_name: string; dva_bank: string } | null>(null);
  const [bizAccounts, setBizAccounts] = useState<{ id: string; account_name: string; account_number: string; bank_name: string; currency: string; is_default: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingLink, setSendingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharingWA, setSharingWA] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const load = useCallback(async () => {
    const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).single();
    if (!inv) { router.push("/dashboard"); return; }
    setInvoice(inv);
    const { data: biz } = await supabase.from("businesses").select("*").eq("user_id", inv.user_id).single();
    setBusiness(biz);
    // Load business-connected accounts (NGN, default first)
    const acctRes = await fetch("/api/business-accounts?user_id=" + inv.user_id);
    const acctData = await acctRes.json();
    setBizAccounts(acctData.accounts ?? []);
    const { data: rec } = await supabase.from("receipts").select("*").eq("invoice_id", id).single();
    setReceipt(rec);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!invoice?.payment_url) return;
    const payUrl = `${window.location.origin}/invoices/${id}/pay`;
    QRCode.toDataURL(payUrl, {
      width: 160,
      margin: 1,
      color: { dark: "#1a4a2e", light: "#ffffff" },
    }).then(setQrDataUrl).catch(console.error);
  }, [invoice?.payment_url, id]);

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

  const shareWhatsApp = async () => {
    const payUrl = `${window.location.origin}/invoices/${id}/pay`;
    const invoiceEl = document.getElementById("invoice-doc");
    if (!invoiceEl) return;

    try {
      // Capture invoice as PNG
      const canvas = await html2canvas(invoiceEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Convert to blob and download as PNG
      canvas.toBlob((blob) => {
        if (!blob) return;
        // Download the PNG
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = invoice.invoice_number + ".png";
        a.click();
        URL.revokeObjectURL(url);

        // Open WhatsApp with payment link
        setTimeout(() => {
          const msg = encodeURIComponent(
            `Hi ${invoice.client_name}, please find your invoice ${invoice.invoice_number} for ${formatCurrency(invoice.total, invoice.currency)} from ${business?.name ?? "us"}.\n\nThe invoice image has been downloaded to your device. Please attach it when sending.\n\nPay directly here: ${payUrl}`
          );
          window.open(`https://wa.me/?text=${msg}`, "_blank");
        }, 500);
      }, "image/png", 1.0);
    } catch (err) {
      console.error("Screenshot failed:", err);
      // Fallback to text only
      const msg = encodeURIComponent(
        `Hi ${invoice.client_name}, please find your invoice ${invoice.invoice_number} for ${formatCurrency(invoice.total, invoice.currency)} from ${business?.name ?? "us"}.\n\nPay here: ${payUrl}`
      );
      window.open(`https://wa.me/?text=${msg}`, "_blank");
    }
  };

  // Determine the best NGN account to show: default bizAccount > first bizAccount > fallback DVA > fallback legacy
  const activeAccount = (() => {
    const ngn = bizAccounts.filter(a => !a.currency || a.currency === "NGN");
    const def = ngn.find(a => a.is_default) ?? ngn[0];
    if (def) return { account_number: def.account_number, account_name: def.account_name, bank_name: def.bank_name };
    if (business?.dva_account_number) return { account_number: business.dva_account_number, account_name: business.dva_account_name, bank_name: business.dva_bank };
    if (business?.account_number) return { account_number: business.account_number, account_name: business.account_name, bank_name: business.bank_name };
    return null;
  })();

  const getUssdCodes = () => {
    if (!activeAccount?.account_number) return [];
    const acc = activeAccount.account_number;
    const amt = Math.round(Number(invoice?.total ?? 0));
    // Each entry: the bank the SENDER dials from to transfer to ANY account
    // Format: "If you bank with X, dial this code"
    return [
      { bank: "GTBank sender",    code: `*737*2*${amt}*${acc}#`,          label: "GTBank" },
      { bank: "Zenith sender",    code: `*966*${amt}*${acc}#`,            label: "Zenith Bank" },
      { bank: "Access sender",    code: `*901*000*${acc}*${amt}#`,        label: "Access Bank" },
      { bank: "First Bank sender",code: `*894*${acc}*${amt}#`,            label: "First Bank" },
      { bank: "UBA sender",       code: `*919*3*${acc}*${amt}#`,          label: "UBA" },
      { bank: "OPay sender",      code: `*955*${acc}*${amt}#`,            label: "OPay" },
      { bank: "Kuda sender",      code: `*5573*${acc}*${amt}#`,           label: "Kuda" },
      { bank: "Sterling sender",  code: `*822*3*${acc}*${amt}#`,          label: "Sterling" },
    ];
  };

  const handlePrint = () => window.print();

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>Loading...</div>;
  if (!invoice) return null;

  const sc = STATUS_COLORS[invoice.status] ?? STATUS_COLORS.draft;
  const payPageUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/invoices/${id}/pay`;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <style>{`
        @media print {
            #invoice-print-wrapper * { font-size: 10px !important; line-height: 1.3 !important; }
            #invoice-print-wrapper h1, #invoice-print-wrapper .invoice-title { font-size: 28px !important; }
            #invoice-print-wrapper th { font-size: 9px !important; padding: 5px 6px !important; }
            #invoice-print-wrapper td { font-size: 9px !important; padding: 5px 6px !important; }
            #invoice-print-wrapper .total-amount { font-size: 14px !important; }
            #invoice-print-wrapper img { width: 80px !important; height: 80px !important; }
            #invoice-print-wrapper [style*="padding: \"20px 32px\""] { padding: 10px 32px !important; }
            #invoice-print-wrapper [style*="padding: \"12px 32px\""] { padding: 6px 32px !important; }
            #invoice-print-wrapper [style*="padding: \"28px 32px\""] { padding: 12px 32px !important; }
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          @page { margin: 0.4cm; size: A4 portrait; }
          #invoice-doc { box-shadow: none !important; border-radius: 0 !important; border: none !important; }
          div[style*="maxWidth: 820"] { padding: 0 !important; max-width: 100% !important; }
          table { page-break-inside: avoid !important; }
          tr { page-break-inside: avoid !important; }
          img { max-width: 100% !important; }
        }
      `}</style>

      <nav className="no-print" style={{ background: "var(--green)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/dashboard">
          <button style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>←</button>
        </Link>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white", flex: 1 }}>
          {invoice.invoice_number}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handlePrint} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
            Print
          </button>
          {invoice.status === "paid" && receipt && (
            <Link href={`/invoices/${id}/receipt`}>
              <button style={{ background: "#4caf7d", border: "none", color: "white", padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>
                View Receipt
              </button>
            </Link>
          )}
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <button onClick={async () => {
              if (!confirm("Mark this invoice as paid (cash payment)?")) return;
              const res = await fetch(`/api/invoices/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "paid", paid_at: new Date().toISOString(), payment_method: "cash" }),
              });
              const data = await res.json();
              if (data.invoice) {
                setInvoice({ ...invoice, status: "paid", paid_at: data.invoice.paid_at });
                load();
              }
            }} style={{ background: "#f5f2ed", border: "1.5px solid var(--border)", color: "var(--text)", padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>
              Mark as Paid
            </button>
          )}
        </div>
      </nav>

      <div id="invoice-print-wrapper"><div id="invoice-doc" style={{ maxWidth: 820, margin: "0 auto", padding: "28px 20px" }}>

        {invoice.status !== "paid" && invoice.status !== "cancelled" && (
          <div className="no-print" style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
                {invoice.status === "draft" ? "Ready to send?" : "Payment link active"}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                {invoice.status === "draft"
                  ? invoice.client_email
                    ? "Generate a Paystack payment link and email it to your client."
                    : "No client email — you can still print this invoice with bank transfer details."
                  : `Payment URL: ${invoice.payment_url?.slice(0, 48)}...`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {invoice.payment_url && (
                <button onClick={copyLink} style={{ padding: "9px 18px", background: copied ? "var(--green-light)" : "#f5f2ed", color: copied ? "var(--green)" : "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)" }}>
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              )}
              {invoice.payment_url && (
                <button onClick={async () => { setSharingWA(true); await shareWhatsApp(); setSharingWA(false); }} disabled={sharingWA} style={{ padding: "9px 18px", background: "#25D366", color: "white", border: "none", borderRadius: 8, cursor: sharingWA ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)", opacity: sharingWA ? 0.7 : 1 }}>
                  {sharingWA ? "Preparing..." : "Share on WhatsApp"}
                </button>
              )}
              {invoice.client_email && (
                <button onClick={generatePaymentLink} disabled={sendingLink} style={{ padding: "9px 20px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, cursor: sendingLink ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)", opacity: sendingLink ? 0.7 : 1 }}>
                  {sendingLink ? "Generating..." : invoice.payment_url ? "Resend Invoice" : "Generate & Send"}
                </button>
              )}
              <button onClick={handlePrint} style={{ padding: "9px 18px", background: "#f5f2ed", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)" }}>
                Print Invoice
              </button>
            </div>
          </div>
        )}

        {invoice.status === "paid" && (
          <div className="no-print" style={{ background: "var(--green-light)", borderRadius: 12, border: "1px solid #b8dfc9", padding: "16px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: "var(--green)", fontSize: 15 }}>Payment Received</div>
              <div style={{ fontSize: 13, color: "#2e7d52" }}>
                Paid on {invoice.paid_at ? new Date(invoice.paid_at).toLocaleString("en-NG") : "—"}
                {invoice.client_email && ` · Receipt auto-emailed to ${invoice.client_email}`}
              </div>
            </div>
          </div>
        )}

        <div id="invoice-doc" style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>

          <div style={{ background: "var(--green)", padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              {business?.logo_url && <img src={business.logo_url} alt="logo" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8, marginBottom: 10 }} />}
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "white" }}>{business?.name || "Your Business"}</div>
              <div style={{ color: "#a8d5b5", fontSize: 13, marginTop: 4, lineHeight: 1.7 }}>
                {business?.address && <span>{business.address}<br /></span>}
                {business?.email && <span>{business.email}<br /></span>}
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

          <div style={{ background: "#faf9f7", padding: "14px 32px", display: "flex", gap: 32, flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
            {[
              ["Issue Date", new Date(invoice.issue_date).toDateString()],
              invoice.due_date ? ["Due Date", new Date(invoice.due_date).toDateString()] : null,
              ["Currency", invoice.currency],
              invoice.paid_at ? ["Paid On", new Date(invoice.paid_at).toDateString()] : null,
            ].filter((x): x is string[] => x !== null).map(([label, val]) => (
              <div key={label as string}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{val as string}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "24px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 8 }}>From</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 }}>{business?.name || "—"}</div>
              <div style={{ color: "#555", fontSize: 13, lineHeight: 1.7, marginTop: 4 }}>
                {business?.address && <>{business.address}<br /></>}
                {business?.email && <>{business.email}<br /></>}
                {business?.phone}
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

          <div style={{ padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: 20 }}>
            {qrDataUrl && invoice.status !== "paid" ? (
              <div style={{ textAlign: "center" }}>
                <img src={qrDataUrl} alt="Payment QR Code" style={{ width: 120, height: 120, borderRadius: 8, border: "2px solid var(--green-light)" }} />
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 }}>Scan to Pay</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{payPageUrl}</div>
              </div>
            ) : invoice.status === "paid" ? (
              <div style={{ textAlign: "center", opacity: 0.4 }}>
                <div style={{ fontSize: 40 }}>✅</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Paid</div>
              </div>
            ) : (
              <div style={{ width: 120 }} />
            )}
            <div style={{ minWidth: 260 }}>
              {[
                ["Subtotal", formatCurrency(invoice.subtotal, invoice.currency)],
                invoice.discount_amount > 0 ? ["Discount", "-" + formatCurrency(invoice.discount_amount, invoice.currency)] : null,
                invoice.tax_amount > 0 ? ["Tax (" + invoice.tax_rate + "%)", formatCurrency(invoice.tax_amount, invoice.currency)] : null,
              ].filter((x): x is string[] => x !== null).map(([label, val]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)", padding: "4px 0" }}>
                  <span>{label}</span><span>{val as string}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, borderTop: "2px solid var(--green)", paddingTop: 10, marginTop: 6 }}>
                <span>Total</span><span style={{ color: "var(--green)" }}>{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
            </div>
          </div>

          <div style={{ padding: "20px 32px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: invoice.notes ? "1fr 1fr" : "1fr", gap: 24 }}>
            {invoice.notes && (
            <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{invoice.notes}</div>
            </div>
            )}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 8 }}>Payment Options</div>
              {activeAccount && invoice.currency === "NGN" ? (
                <div style={{ background: "#e8f0ff", border: "1px solid #b8c8ff", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#2255cc", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.8px" }}>Bank Transfer / USSD</div>
                  <div style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 2 }}>
                    <span style={{ color: "var(--muted)" }}>Bank: </span><strong>{activeAccount.bank_name}</strong><br />
                    <span style={{ color: "var(--muted)" }}>Account No: </span><strong style={{ fontFamily: "monospace", fontSize: 15, letterSpacing: 1 }}>{activeAccount.account_number}</strong><br />
                    <span style={{ color: "var(--muted)" }}>Account Name: </span><strong>{activeAccount.account_name}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: "#2255cc", marginTop: 6 }}>Transfer exact amount — receipt will be sent automatically.</div>
                </div>
              ) : invoice.currency !== "NGN" ? (
                <div style={{ background: "#e8f0ff", border: "1px solid #b8c8ff", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#2255cc", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.8px" }}>International Payment</div>
                  <div style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.8 }}>
                    This invoice is in <strong>{invoice.currency}</strong>. Use the payment link above to pay securely via card.
                  </div>
                  {invoice.payment_info && <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>{invoice.payment_info}</div>}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {invoice.payment_info || "No bank details added. Go to Settings to add."}
                </div>
              )}
              {invoice.payment_info && (business?.dva_account_number || business?.account_name) && (
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7, marginTop: 8 }}>{invoice.payment_info}</div>
              )}
            </div>
          </div>

          {getUssdCodes().length > 0 && activeAccount && invoice.currency === "NGN" && (
            <div style={{ padding: "12px 32px", borderTop: "1px solid var(--border)", background: "#f0f4ff" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#2255cc", marginBottom: 8 }}>USSD Payment — dial from your bank to transfer to {activeAccount.bank_name} · {activeAccount.account_number}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                {getUssdCodes().map(({ label, code }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", background: "white", borderRadius: 4, border: "1px solid #b8c8ff" }}>
                    <div style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>{label}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{code}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>Each code is for senders banking with that institution — the destination is always your {activeAccount.bank_name} account.</div>
            </div>
          )}
          {invoice.payment_url && invoice.status !== "paid" && (
            <div className="no-print" style={{ padding: "24px 32px", borderTop: "1px solid var(--border)", textAlign: "center", background: "var(--green-light)" }}>
              <a href={invoice.payment_url} target="_blank" rel="noreferrer">
                <button style={{ background: "var(--green)", color: "white", border: "none", padding: "14px 40px", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                  Pay Now — {formatCurrency(invoice.total, invoice.currency)}
                </button>
              </a>
              <div style={{ color: "#2e7d52", fontSize: 12, marginTop: 8 }}>Cards, Bank Transfer, USSD</div>
            </div>
          )}
        </div>
      </div>
    </div></div>
  );
}