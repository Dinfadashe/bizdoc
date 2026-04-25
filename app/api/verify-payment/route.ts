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

    const invoiceId = payment.metadata?.invoice_id as string;
    if (!invoiceId) return NextResponse.json({ error: "No invoice_id in metadata" }, { status: 400 });

    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (invoice.status === "paid") return NextResponse.json({ message: "Already marked paid", invoice });

    await supabaseAdmin
      .from("invoices")
      .update({ status: "paid", paid_at: payment.paid_at })
      .eq("id", invoiceId);

    const receiptNumber = generateReceiptNumber(invoice.invoice_number);
    const { data: receipt } = await supabaseAdmin
      .from("receipts")
      .insert({
        invoice_id: invoiceId,
        user_id: invoice.user_id,
        receipt_number: receiptNumber,
        amount_paid: invoice.currency === "NGN" ? koboToNaira(payment.amount) : payment.amount / 100,
        payment_method: payment.channel,
        paystack_reference: ref,
        paid_at: payment.paid_at,
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
      await supabaseAdmin.from("receipts").update({ emailed_at: new Date().toISOString() }).eq("id", receipt.id);
    }

    return NextResponse.json({ message: "Payment verified, invoice marked paid, receipt sent" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}