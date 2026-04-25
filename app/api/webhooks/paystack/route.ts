import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyWebhookSignature } from "@/lib/paystack";
import { sendReceiptEmail } from "@/lib/email";
import { generateReceiptNumber, koboToNaira } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  // ─── Standard card/USSD/Paystack transfer payment ───────
  if (event.event === "charge.success") {
    const { reference, amount, channel, paid_at, metadata } = event.data;
    const invoiceId: string = metadata?.invoice_id;

    if (!invoiceId) return NextResponse.json({ ok: true });

    await handleInvoicePaid({
      invoiceId,
      reference,
      amount,
      channel,
      paid_at,
    });
  }

  // ─── Dedicated Virtual Account transfer ─────────────────
  if (event.event === "dedicatedaccount.assign.success" ||
      event.event === "transfer.success") {
    const data = event.data;

    // Find business by DVA account number
    const accountNumber = data.dedicated_account?.account_number
      ?? data.recipient?.details?.account_number;

    if (!accountNumber) return NextResponse.json({ ok: true });

    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("user_id")
      .eq("dva_account_number", accountNumber)
      .single();

    if (!business) return NextResponse.json({ ok: true });

    // Find the most recent unpaid invoice for this business
    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("user_id", business.user_id)
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!invoice) return NextResponse.json({ ok: true });

    await handleInvoicePaid({
      invoiceId: invoice.id,
      reference: data.reference ?? data.transfer_code,
      amount: data.amount,
      channel: "bank_transfer",
      paid_at: data.paid_at ?? new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}

async function handleInvoicePaid({
  invoiceId,
  reference,
  amount,
  channel,
  paid_at,
}: {
  invoiceId: string;
  reference: string;
  amount: number;
  channel: string;
  paid_at: string;
}) {
  const { data: invoice } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (!invoice || invoice.status === "paid") return;

  await supabaseAdmin
    .from("invoices")
    .update({ status: "paid", paid_at })
    .eq("id", invoiceId);

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

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("user_id", invoice.user_id)
    .single();

  if (invoice.client_email && receipt) {
    await sendReceiptEmail(invoice, receipt, business).catch(console.error);
    await supabaseAdmin
      .from("receipts")
      .update({ emailed_at: new Date().toISOString() })
      .eq("id", receipt.id);
  }
}

export const config = { api: { bodyParser: false } };