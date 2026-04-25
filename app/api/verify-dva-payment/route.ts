import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPayment } from "@/lib/paystack";
import { sendReceiptEmail } from "@/lib/email";
import { generateReceiptNumber, koboToNaira } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const ref = new URL(req.url).searchParams.get("ref");
  if (!ref) return NextResponse.json({ error: "ref required" }, { status: 400 });

  try {
    const payment = await verifyPayment(ref);

    if (payment.status !== "success") {
      return NextResponse.json({ error: "Payment not successful", status: payment.status }, { status: 400 });
    }

    const paymentAny = payment as any;
    const receiverAccount = paymentAny.authorization?.receiver_bank_account_number
      ?? paymentAny.metadata?.receiver_account_number
      ?? null;

    const amountNaira = koboToNaira(payment.amount);
    console.log("DVA verify — receiver:", receiverAccount, "amount:", amountNaira);

    if (!receiverAccount) {
      return NextResponse.json({ error: "Could not determine receiver account" }, { status: 400 });
    }

    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("user_id")
      .eq("dva_account_number", receiverAccount)
      .single();

    if (!business) {
      return NextResponse.json({ error: "No business found with DVA account: " + receiverAccount }, { status: 404 });
    }

    const { data: invoices } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("user_id", business.user_id)
      .eq("status", "sent")
      .order("created_at", { ascending: false });

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ error: "No unpaid invoices found" }, { status: 404 });
    }

    const matched = invoices.find((inv: any) => Math.abs(Number(inv.total) - amountNaira) < 1);

    if (!matched) {
      return NextResponse.json({
        error: "No invoice matched amount: " + amountNaira,
        unpaid_invoices: invoices.map((i: any) => ({ id: i.id, total: i.total, invoice_number: i.invoice_number }))
      }, { status: 404 });
    }

    if (matched.status === "paid") {
      return NextResponse.json({ message: "Already marked paid", invoice_id: matched.id });
    }

    await supabaseAdmin
      .from("invoices")
      .update({ status: "paid", paid_at: payment.paid_at })
      .eq("id", matched.id);

    const receiptNumber = generateReceiptNumber(matched.invoice_number);
    const { data: receipt } = await supabaseAdmin
      .from("receipts")
      .insert({
        invoice_id: matched.id,
        user_id: matched.user_id,
        receipt_number: receiptNumber,
        amount_paid: amountNaira,
        payment_method: payment.channel,
        paystack_reference: ref,
        paid_at: payment.paid_at,
      })
      .select()
      .single();

    const { data: bizData } = await supabaseAdmin
      .from("businesses")
      .select("*")
      .eq("user_id", matched.user_id)
      .single();

    if (matched.client_email && receipt) {
      await sendReceiptEmail(matched, receipt, bizData).catch(console.error);
      await supabaseAdmin.from("receipts").update({ emailed_at: new Date().toISOString() }).eq("id", receipt.id);
    }

    return NextResponse.json({
      message: "Payment verified, invoice marked paid, receipt sent",
      invoice_number: matched.invoice_number,
      amount: amountNaira,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}