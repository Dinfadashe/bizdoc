const fs = require('fs');
let content = fs.readFileSync('app/invoices/[id]/page.tsx', 'utf8');

// 1. Add html2canvas import after QRCode import
content = content.replace(
  'import QRCode from "qrcode";',
  'import QRCode from "qrcode";\nimport html2canvas from "html2canvas";'
);

// 2. Replace shareWhatsApp function with PNG capture version
const oldShare = `  const shareWhatsApp = () => {
    const payUrl = \`\${window.location.origin}/invoices/\${id}/pay\`;
    const msg = encodeURIComponent(
      \`Hi, please find your invoice \${invoice.invoice_number} for \${formatCurrency(invoice.total, invoice.currency)} from \${business?.name ?? "us"}.\\n\\nPay here: \${payUrl}\`
    );
    window.open(\`https://wa.me/?text=\${msg}\`, "_blank");
  };`;

const newShare = `  const shareWhatsApp = async () => {
    const payUrl = \`\${window.location.origin}/invoices/\${id}/pay\`;
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
            \`Hi \${invoice.client_name}, please find your invoice \${invoice.invoice_number} for \${formatCurrency(invoice.total, invoice.currency)} from \${business?.name ?? "us"}.\\n\\nThe invoice image has been downloaded to your device. Please attach it when sending.\\n\\nPay directly here: \${payUrl}\`
          );
          window.open(\`https://wa.me/?text=\${msg}\`, "_blank");
        }, 500);
      }, "image/png", 1.0);
    } catch (err) {
      console.error("Screenshot failed:", err);
      // Fallback to text only
      const msg = encodeURIComponent(
        \`Hi \${invoice.client_name}, please find your invoice \${invoice.invoice_number} for \${formatCurrency(invoice.total, invoice.currency)} from \${business?.name ?? "us"}.\\n\\nPay here: \${payUrl}\`
      );
      window.open(\`https://wa.me/?text=\${msg}\`, "_blank");
    }
  };`;

if (content.includes(oldShare)) {
  content = content.replace(oldShare, newShare);
  console.log('shareWhatsApp function updated');
} else {
  console.log('Pattern not found exactly - trying partial match');
  const idx = content.indexOf('const shareWhatsApp = () => {');
  if (idx > -1) {
    const end = content.indexOf('\n  };', idx) + 5;
    content = content.substring(0, idx) + newShare + content.substring(end);
    console.log('shareWhatsApp replaced via partial match');
  } else {
    console.log('ERROR: shareWhatsApp function not found');
  }
}

// 3. Update WhatsApp button to show loading state - add sharingWA state
content = content.replace(
  '  const [copied, setCopied] = useState(false);',
  '  const [copied, setCopied] = useState(false);\n  const [sharingWA, setSharingWA] = useState(false);'
);

// 4. Update the WhatsApp button
content = content.replace(
  '<button onClick={shareWhatsApp} style={{ padding: "9px 18px", background: "#25D366", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)" }}>\n                  Share on WhatsApp\n                </button>',
  '<button onClick={async () => { setSharingWA(true); await shareWhatsApp(); setSharingWA(false); }} disabled={sharingWA} style={{ padding: "9px 18px", background: "#25D366", color: "white", border: "none", borderRadius: 8, cursor: sharingWA ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)", opacity: sharingWA ? 0.7 : 1 }}>\n                  {sharingWA ? "Preparing..." : "Share on WhatsApp"}\n                </button>'
);

fs.writeFileSync('app/invoices/[id]/page.tsx', content, { encoding: 'utf8' });
console.log('Done');