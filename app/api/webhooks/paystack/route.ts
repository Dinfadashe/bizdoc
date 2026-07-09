import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyWebhookSignature } from "@/lib/paystack";
import { sendReceiptEmail } from "@/lib/email";
import { generateReceiptNumber, koboToNaira } from "@/lib/utils";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://bizdoc-app.netlify.app").replace(/\/+$/, "");

async function transferToBusiness(business: any, amountKobo: number) {
  try {
    if (!business.bank_code || !business.account_number) return;
    const businessShareKobo = Math.round(amountKobo * 0.98);
    const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: { Authorization: "Bearer " + PAYSTACK_SECRET, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "nuban", name: business.account_name, account_number: business.account_number, bank_code: business.bank_code, currency: "NGN" }),
    });
    const recipientData = await recipientRes.json();
    if (!recipientData.status) { console.error("Recipient error:", recipientData.message); return; }
    const transferRes = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: { Authorization: "Bearer " + PAYSTACK_SECRET, "Content-Type": "application/json" },
      body: JSON.stringify({ source: "balance", amount: businessShareKobo, recipient: recipientData.data.recipient_code, reason: "BizDoc DVA payout - " + business.name }),
    });
    const transferData = await transferRes.json();
    console.log("Transfer result:", transferData.status, transferData.message);
  } catch (err) {
    console.error("Transfer failed:", err);
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  console.log("Webhook event:", event.event, "channel:", event.data?.channel, "ref:", event.data?.reference);

  if (event.event === "charge.success") {
    const { reference, amount, channel, paid_at, metadata } = event.data;

    // Standard Paystack checkout — invoice_id in metadata
    const invoiceId: string = metadata?.invoice_id;
    if (invoiceId) {
      console.log("Standard payment for invoice:", invoiceId);
      await handleInvoicePaid({ invoiceId, reference, amount, channel, paid_at, isDva: false });
      return NextResponse.json({ ok: true });
    }

    // DVA / bank transfer — match by receiver account + amount
    if (channel === "dedicated_nuban" || channel === "bank_transfer") {
      const receiverAccount = event.data?.authorization?.receiver_bank_account_number
        ?? event.data?.metadata?.receiver_account_number
        ?? null;

      const amountNaira = koboToNaira(amount);
      console.log("DVA payment - receiver:", receiverAccount, "amount:", amountNaira);

      if (!receiverAccount) {
        console.log("No receiver account found in webhook data");
        return NextResponse.json({ ok: true });
      }

      const { data: business } = await supabaseAdmin
        .from("businesses")
        .select("*")
        .eq("dva_account_number", receiverAccount)
        .single();

      if (!business) {
        console.log("No business found for DVA account:", receiverAccount);
        return NextResponse.json({ ok: true });
      }

      // Find sent invoices for this business
      const { data: invoices } = await supabaseAdmin
        .from("invoices")
        .select("*")
        .eq("user_id", business.user_id)
        .in("status", ["sent", "draft"])
        .order("created_at", { ascending: false });

      if (!invoices || invoices.length === 0) {
        console.log("No invoices found for business:", business.user_id);
        return NextResponse.json({ ok: true });
      }

      // Match by exact amount with 2 naira tolerance
      const matched = invoices.find((inv: any) => Math.abs(Number(inv.total) - amountNaira) <= 2);

      if (!matched) {
        console.log("No invoice matched. Amount:", amountNaira, "Available:", invoices.map((i: any) => i.total));
        // Create a receipt anyway so payment is not lost
        const receiptNumber = "RCP-" + Date.now();
        await supabaseAdmin.from("receipts").insert({
          invoice_id: null,
          user_id: business.user_id,
          receipt_number: receiptNumber,
          amount_paid: amountNaira,
          payment_method: channel,
          paystack_reference: reference,
          paid_at,
        });
        return NextResponse.json({ ok: true });
      }

      await handleInvoicePaid({ invoiceId: matched.id, reference, amount, channel, paid_at, isDva: true, business });
    }
  }

  return NextResponse.json({ ok: true });
}

async function handleInvoicePaid({
  invoiceId, reference, amount, channel, paid_at, isDva = false, business: bizData,
}: {
  invoiceId: string; reference: string; amount: number; channel: string;
  paid_at: string; isDva?: boolean; business?: any;
}) {
  const { data: invoice } = await supabaseAdmin
    .from("invoices").select("*").eq("id", invoiceId).single();

  if (!invoice) { console.log("Invoice not found:", invoiceId); return; }
  if (invoice.status === "paid") { console.log("Invoice already paid:", invoiceId); return; }

  // Mark invoice as paid
  const { error: updateError } = await supabaseAdmin
    .from("invoices")
    .update({ status: "paid", paid_at })
    .eq("id", invoiceId);

  if (updateError) { console.error("Failed to update invoice:", updateError); return; }

  // Create receipt
  const receiptNumber = generateReceiptNumber(invoice.invoice_number);
  const { data: receipt, error: receiptError } = await supabaseAdmin
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

  if (receiptError) console.error("Receipt creation error:", receiptError);

  // Get business data
  const { data: business } = bizData
    ? { data: bizData }
    : await supabaseAdmin.from("businesses").select("*").eq("user_id", invoice.user_id).single();

  // Send receipt email to client
  if (invoice.client_email && receipt && business) {
    const emailResult = await sendReceiptEmail(invoice, receipt, business).catch(e => { console.error("Receipt email error:", e); return null; });
    console.log("Receipt email sent:", emailResult ? "success" : "failed");
    if (emailResult) {
      await supabaseAdmin.from("receipts").update({ emailed_at: new Date().toISOString() }).eq("id", receipt.id);
    }
  }

  // For DVA payments auto-transfer 98% to business
  if (isDva && business) {
    await transferToBusiness(business, amount);
  }

  console.log("Invoice marked paid successfully:", invoiceId);
}

export const config = { api: { bodyParser: false } };
