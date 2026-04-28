const fs = require('fs');

let content = fs.readFileSync('app/invoices/[id]/page.tsx', 'utf8');

// 1. Add WhatsApp share function after copyLink function
const copyLinkFn = `  const copyLink = () => {
    if (!invoice?.payment_url) return;
    navigator.clipboard.writeText(invoice.payment_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };`;

const copyLinkFnNew = `  const copyLink = () => {
    if (!invoice?.payment_url) return;
    navigator.clipboard.writeText(invoice.payment_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const payUrl = \`\${window.location.origin}/invoices/\${id}/pay\`;
    const msg = encodeURIComponent(
      \`Hi, please find your invoice \${invoice.invoice_number} for \${formatCurrency(invoice.total, invoice.currency)} from \${business?.name ?? "us"}.\\n\\nPay here: \${payUrl}\`
    );
    window.open(\`https://wa.me/?text=\${msg}\`, "_blank");
  };

  const getUssdCode = () => {
    if (!business?.dva_account_number) return null;
    const bank = business?.dva_bank ?? "";
    const amount = invoice?.total ?? 0;
    if (bank.toLowerCase().includes("titan") || bank.toLowerCase().includes("paystack")) {
      return \`*901*000*\${business.dva_account_number}*\${amount}#\`;
    }
    if (bank.toLowerCase().includes("wema") || bank.toLowerCase().includes("alat")) {
      return \`*945*\${business.dva_account_number}*\${amount}#\`;
    }
    return null;
  };`;

content = content.replace(copyLinkFn, copyLinkFnNew);

// 2. Add WhatsApp button in action banner next to Copy Link
const copyLinkBtn = `              {invoice.payment_url && (
                <button onClick={copyLink} style={{ padding: "9px 18px", background: copied ? "var(--green-light)" : "#f5f2ed", color: copied ? "var(--green)" : "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)" }}>
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              )}`;

const copyLinkBtnNew = `              {invoice.payment_url && (
                <button onClick={copyLink} style={{ padding: "9px 18px", background: copied ? "var(--green-light)" : "#f5f2ed", color: copied ? "var(--green)" : "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)" }}>
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              )}
              {invoice.payment_url && (
                <button onClick={shareWhatsApp} style={{ padding: "9px 18px", background: "#25D366", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)" }}>
                  Share on WhatsApp
                </button>
              )}`;

content = content.replace(copyLinkBtn, copyLinkBtnNew);

// 3. Add USSD code in Payment Options section after DVA details
const dvaTransferNote = `                  <div style={{ fontSize: 11, color: "#2255cc", marginTop: 6 }}>Transfer exact amount — receipt will be sent automatically.</div>`;

const dvaTransferNoteNew = `                  <div style={{ fontSize: 11, color: "#2255cc", marginTop: 6 }}>Transfer exact amount — receipt will be sent automatically.</div>
                  {getUssdCode() && (
                    <div style={{ marginTop: 10, padding: "10px 12px", background: "white", border: "1px solid #b8c8ff", borderRadius: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#2255cc", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.8px" }}>USSD Payment Code</div>
                      <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: "#1a1a1a", letterSpacing: 1 }}>{getUssdCode()}</div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>Dial this code on any phone to pay — no internet required.</div>
                    </div>
                  )}`;

content = content.replace(dvaTransferNote, dvaTransferNoteNew);

// 4. Update business type to include dva_bank
content = content.replace(
  'const [business, setBusiness] = useState<{ name: string; email: string; phone: string; address: string; logo_url: string; account_name: string; account_number: string; bank_name: string; dva_account_number: string; dva_account_name: string; dva_bank: string } | null>(null);',
  'const [business, setBusiness] = useState<{ name: string; email: string; phone: string; address: string; logo_url: string; account_name: string; account_number: string; bank_name: string; dva_account_number: string; dva_account_name: string; dva_bank: string } | null>(null);'
);

fs.writeFileSync('app/invoices/[id]/page.tsx', content, { encoding: 'utf8' });
console.log('Done');