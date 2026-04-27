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
  console.log("Webhook event:", event.event, "channel:", event.data?.channel);

  if (event.event === "charge.success") {
    const { reference, amount, channel, paid_at, metadata } = event.data;

    // Standard Paystack checkout payment (has invoice_id in metadata)
    const invoiceId: string = metadata?.invoice_id;
    if (invoiceId) {
      await handleInvoicePaid({ invoiceId, reference, amount, channel, paid_at });
      return NextResponse.json({ ok: true });
    }

    // DVA payment � match by receiver account number + exact amount
    if (channel === "dedicated_nuban" || channel === "bank_transfer") {
      // Receiver account is in authorization.receiver_bank_account_number
      const receiverAccount = event.data?.authorization?.receiver_bank_account_number
        ?? event.data?.metadata?.receiver_account_number
        ?? null;

      const amountNaira = koboToNaira(amount);
      console.log("DVA payment � receiver:", receiverAccount, "amount (naira):", amountNaira);

      if (!receiverAccount) {
        console.log("Could not determine receiver account");
        return NextResponse.json({ ok: true });
      }

      // Find business by DVA account number
      const { data: business } = await supabaseAdmin
        .from("businesses")
        .select("user_id")
        .eq("dva_account_number", receiverAccount)
        .single();

      if (!business) {
        console.log("No business found with DVA account:", receiverAccount);
        return NextResponse.json({ ok: true });
      }

      // Find all unpaid sent invoices for this business
      const { data: invoices } = await supabaseAdmin
        .from("invoices")
        .select("*")
        .eq("user_id", business.user_id)
        .eq("status", "sent")
        .order("created_at", { ascending: false });

      if (!invoices || invoices.length === 0) {
        console.log("No unpaid invoices for business");
        return NextResponse.json({ ok: true });
      }

      console.log("Unpaid invoices:", invoices.map((i: any) => ({ id: i.id, total: i.total })));

      // Match by exact amount (within 1 naira tolerance)
      const matched = invoices.find((inv: any) => Math.abs(Number(inv.total) - amountNaira) < 1);

      if (!matched) {
        console.log("No invoice matched amount:", amountNaira);
        return NextResponse.json({ ok: true });
      }

      await handleInvoicePaid({ invoiceId: matched.id, reference, amount, channel, paid_at });
    }
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

  console.log("Invoice marked paid:", invoiceId);
}

export const config = { api: { bodyParser: false } };

