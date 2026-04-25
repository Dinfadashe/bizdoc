// POST /api/webhooks/paystack
// Receives Paystack events — marks invoices paid, creates receipts, sends emails
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyWebhookSignature } from "@/lib/paystack";
import { sendReceiptEmail } from "@/lib/email";
import { generateReceiptNumber, koboToNaira } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  // Verify the request is really from Paystack
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    const { reference, amount, channel, paid_at, metadata } = event.data;
    const invoiceId: string = metadata?.invoice_id;

    if (!invoiceId) return NextResponse.json({ ok: true });

    // Fetch the invoice
    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (!invoice || invoice.status === "paid") {
      return NextResponse.json({ ok: true }); // already handled
    }

    // Mark invoice as paid
    await supabaseAdmin
      .from("invoices")
      .update({ status: "paid", paid_at })
      .eq("id", invoiceId);

    // Create receipt
    const receiptNumber = generateReceiptNumber(invoice.invoice_number);
    const { data: receipt } = await supabaseAdmin
      .from("receipts")
      .insert({
        invoice_id: invoiceId,
        user_id: invoice.user_id,
        receipt_number: receiptNumber,
        amount_paid: invoice.currency === "NGN" ? koboToNaira(amount) : amount / 100,
        payment_method: channel,
        paystack_reference: reference,
        paid_at,
      })
      .select()
      .single();

    // Fetch business profile for email
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("*")
      .eq("user_id", invoice.user_id)
      .single();

    // Email receipt to client
    if (invoice.client_email && receipt) {
      await sendReceiptEmail(invoice, receipt, business).catch(console.error);

      // Mark receipt as emailed
      await supabaseAdmin
        .from("receipts")
        .update({ emailed_at: new Date().toISOString() })
        .eq("id", receipt.id);
    }
  }

  return NextResponse.json({ ok: true });
}

// Disable body parsing — we need raw body for signature verification
export const config = { api: { bodyParser: false } };
