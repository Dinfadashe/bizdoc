import { Resend } from 'resend'
import type { Invoice, Receipt } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'info@charitytoken.net'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'

// Send payment link to client
export async function sendInvoiceEmail(invoice: Invoice, business_name: string) {
  const payLink = `${APP_URL}/invoices/${invoice.id}/pay`
  const dueText = invoice.due_date ? ` (due ${invoice.due_date})` : ''

  await resend.emails.send({
    from: FROM,
    to: invoice.client_email!,
    subject: `Invoice ${invoice.invoice_number} from ${business_name}${dueText}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #faf9f7; border-radius: 12px;">
        <h1 style="font-size: 28px; color: #1a1a1a; margin-bottom: 8px;">Invoice ${invoice.invoice_number}</h1>
        <p style="color: #555; font-size: 15px; margin-bottom: 24px;">Hi ${invoice.client_name}, you have a new invoice from <strong>${business_name}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr><td style="padding: 8px 0; color: #888; font-size: 13px;">Amount Due</td><td style="padding: 8px 0; font-size: 20px; font-weight: bold; color: #1a6b4a; text-align: right;">${invoice.currency} ${Number(invoice.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
          ${invoice.due_date ? `<tr><td style="padding: 8px 0; color: #888; font-size: 13px;">Due Date</td><td style="padding: 8px 0; font-size: 14px; text-align: right;">${invoice.due_date}</td></tr>` : ''}
        </table>
        <a href="${payLink}" style="display: block; background: #1a6b4a; color: white; text-align: center; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; margin-bottom: 20px;">Pay Now</a>
        <p style="color: #999; font-size: 12px; text-align: center;">Or copy this link: ${payLink}</p>
        ${invoice.notes ? `<p style="color: #666; font-size: 13px; margin-top: 20px; border-top: 1px solid #e0dcd6; padding-top: 16px;">${invoice.notes}</p>` : ''}
      </div>
    `,
  })
}

// Send receipt to client after payment
export async function sendReceiptEmail(receipt: Receipt, invoice: Invoice, business_name: string) {
  const receiptLink = `${APP_URL}/invoices/${invoice.id}/receipt`

  await resend.emails.send({
    from: FROM,
    to: invoice.client_email!,
    subject: `Receipt ${receipt.receipt_number} — Payment Confirmed`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #faf9f7; border-radius: 12px;">
        <div style="background: #e8f5ef; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 28px;">✅</span>
          <div>
            <div style="font-weight: bold; font-size: 16px; color: #1a6b4a;">Payment Received</div>
            <div style="font-size: 13px; color: #555;">Receipt ${receipt.receipt_number}</div>
          </div>
        </div>
        <h2 style="font-size: 22px; color: #1a1a1a; margin-bottom: 16px;">Thank you, ${invoice.client_name}!</h2>
        <p style="color: #555; font-size: 15px; margin-bottom: 24px;">Your payment to <strong>${business_name}</strong> has been confirmed.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr><td style="padding: 8px 0; color: #888; font-size: 13px; border-bottom: 1px solid #f0ece6;">Invoice</td><td style="padding: 8px 0; font-size: 14px; text-align: right; border-bottom: 1px solid #f0ece6;">${invoice.invoice_number}</td></tr>
          <tr><td style="padding: 8px 0; color: #888; font-size: 13px; border-bottom: 1px solid #f0ece6;">Amount Paid</td><td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #1a6b4a; text-align: right; border-bottom: 1px solid #f0ece6;">${invoice.currency} ${Number(receipt.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
          <tr><td style="padding: 8px 0; color: #888; font-size: 13px; border-bottom: 1px solid #f0ece6;">Payment Method</td><td style="padding: 8px 0; font-size: 14px; text-align: right; border-bottom: 1px solid #f0ece6; text-transform: capitalize;">${receipt.payment_channel || 'Online'}</td></tr>
          <tr><td style="padding: 8px 0; color: #888; font-size: 13px;">Date</td><td style="padding: 8px 0; font-size: 14px; text-align: right;">${new Date(receipt.paid_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}</td></tr>
        </table>
        <a href="${receiptLink}" style="display: block; background: #1a6b4a; color: white; text-align: center; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">View & Download Receipt</a>
      </div>
    `,
  })
}
