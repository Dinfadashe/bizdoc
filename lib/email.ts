import { Resend } from "resend";
import { Invoice, Receipt, Business } from "./types";
import { formatCurrency } from "./utils";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "info@charitytoken.net";

// ─── Send invoice to client ───────────────────────────────
export async function sendInvoiceEmail(
  invoice: Invoice,
  business: Business,
  paymentUrl: string
) {
  const itemRows = invoice.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ece6">${item.description}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ece6;text-align:center">${item.qty}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ece6;text-align:right">${formatCurrency(item.unit_price, invoice.currency)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ece6;text-align:right;font-weight:600">${formatCurrency(item.qty * item.unit_price, invoice.currency)}</td>
      </tr>`
    )
    .join("");

  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"/></head>
  <body style="margin:0;padding:0;background:#f5f2ed;font-family:'Georgia',serif">
    <div style="max-width:620px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e8e4de">
      <!-- Header -->
      <div style="background:#1a4a2e;padding:28px 32px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:28px;font-weight:700;color:white;letter-spacing:-0.5px">${business.name || "BizDoc"}</div>
          <div style="color:#a8d5b5;font-size:13px;margin-top:4px">${business.email ?? ""}</div>
        </div>
        <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 16px;text-align:center">
          <div style="color:#a8d5b5;font-size:10px;letter-spacing:1px;text-transform:uppercase">Invoice</div>
          <div style="color:white;font-size:16px;font-weight:700">${invoice.invoice_number}</div>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:32px">
        <p style="color:#555;font-size:15px;margin:0 0 24px">Dear <strong style="color:#1a1a1a">${invoice.client_name}</strong>,</p>
        <p style="color:#555;font-size:15px;margin:0 0 24px">
          Please find your invoice from <strong>${business.name}</strong> below.
          ${invoice.due_date ? `Payment is due by <strong>${new Date(invoice.due_date).toDateString()}</strong>.` : ""}
        </p>

        <!-- Items table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead>
            <tr style="background:#1a4a2e">
              <th style="padding:10px 12px;text-align:left;color:white;font-size:12px;text-transform:uppercase;letter-spacing:0.8px">Description</th>
              <th style="padding:10px 12px;text-align:center;color:white;font-size:12px;text-transform:uppercase;letter-spacing:0.8px">Qty</th>
              <th style="padding:10px 12px;text-align:right;color:white;font-size:12px;text-transform:uppercase;letter-spacing:0.8px">Unit Price</th>
              <th style="padding:10px 12px;text-align:right;color:white;font-size:12px;text-transform:uppercase;letter-spacing:0.8px">Amount</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <!-- Totals -->
        <div style="display:flex;justify-content:flex-end">
          <table style="width:240px">
            <tr><td style="padding:4px 0;color:#888;font-size:13px">Subtotal</td><td style="text-align:right;font-size:13px">${formatCurrency(invoice.subtotal, invoice.currency)}</td></tr>
            ${invoice.discount_amount > 0 ? `<tr><td style="padding:4px 0;color:#888;font-size:13px">Discount</td><td style="text-align:right;font-size:13px">−${formatCurrency(invoice.discount_amount, invoice.currency)}</td></tr>` : ""}
            ${invoice.tax_amount > 0 ? `<tr><td style="padding:4px 0;color:#888;font-size:13px">Tax (${invoice.tax_rate}%)</td><td style="text-align:right;font-size:13px">${formatCurrency(invoice.tax_amount, invoice.currency)}</td></tr>` : ""}
            <tr style="border-top:2px solid #1a4a2e">
              <td style="padding:10px 0 0;font-size:17px;font-weight:700;color:#1a1a1a">Total</td>
              <td style="padding:10px 0 0;text-align:right;font-size:17px;font-weight:700;color:#1a4a2e">${formatCurrency(invoice.total, invoice.currency)}</td>
            </tr>
          </table>
        </div>

        <!-- Pay button -->
        <div style="text-align:center;margin:32px 0">
          <a href="${paymentUrl}" style="display:inline-block;background:#1a4a2e;color:white;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px">
            Pay Now — ${formatCurrency(invoice.total, invoice.currency)}
          </a>
        </div>

        ${invoice.notes ? `<div style="background:#f5f2ed;border-radius:8px;padding:16px;font-size:13px;color:#666;margin-top:16px"><strong style="display:block;margin-bottom:4px;color:#1a1a1a">Notes</strong>${invoice.notes}</div>` : ""}
      </div>

      <!-- Footer -->
      <div style="padding:20px 32px;background:#faf9f7;border-top:1px solid #f0ece6;font-size:12px;color:#999;text-align:center">
        ${business.name} · ${business.address ?? ""} · ${business.phone ?? ""}
      </div>
    </div>
  </body>
  </html>`;

  return resend.emails.send({
    from: FROM,
    to: invoice.client_email,
    subject: `Invoice ${invoice.invoice_number} from ${business.name} — ${formatCurrency(invoice.total, invoice.currency)}`,
    html,
  });
}

// ─── Send receipt to client ───────────────────────────────
export async function sendReceiptEmail(
  invoice: Invoice,
  receipt: Receipt,
  business: Business
) {
  const html = `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#f5f2ed;font-family:'Georgia',serif">
    <div style="max-width:620px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e8e4de">
      <div style="background:#1a4a2e;padding:28px 32px">
        <div style="font-size:28px;font-weight:700;color:white">${business.name}</div>
        <div style="color:#a8d5b5;margin-top:4px;font-size:14px">Payment Receipt</div>
      </div>
      <div style="padding:32px">
        <div style="background:#e8f5ef;border-radius:10px;padding:24px;text-align:center;margin-bottom:28px">
          <div style="font-size:40px;margin-bottom:8px">✅</div>
          <div style="font-size:22px;font-weight:700;color:#1a4a2e">${formatCurrency(receipt.amount_paid, invoice.currency)}</div>
          <div style="color:#555;font-size:14px;margin-top:4px">Payment Confirmed</div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333">
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0ece6;color:#888">Receipt No.</td><td style="text-align:right;font-weight:600">${receipt.receipt_number}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0ece6;color:#888">Invoice No.</td><td style="text-align:right">${invoice.invoice_number}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0ece6;color:#888">Paid By</td><td style="text-align:right">${invoice.client_name}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0ece6;color:#888">Payment Method</td><td style="text-align:right">${receipt.payment_method}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0ece6;color:#888">Reference</td><td style="text-align:right;font-family:monospace;font-size:12px">${receipt.paystack_reference}</td></tr>
          <tr><td style="padding:10px 0;color:#888">Date</td><td style="text-align:right">${new Date(receipt.paid_at).toLocaleString("en-NG")}</td></tr>
        </table>

        <p style="margin-top:28px;color:#555;font-size:14px">Thank you for your payment, <strong>${invoice.client_name}</strong>. This is your official receipt.</p>
      </div>
      <div style="padding:20px 32px;background:#faf9f7;border-top:1px solid #f0ece6;font-size:12px;color:#999;text-align:center">
        ${business.name} · ${business.address ?? ""} · ${business.phone ?? ""}
      </div>
    </div>
  </body>
  </html>`;

  return resend.emails.send({
    from: FROM,
    to: invoice.client_email,
    subject: `Receipt ${receipt.receipt_number} — Payment Confirmed`,
    html,
  });
}
