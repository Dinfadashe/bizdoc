import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateReceiptNumber } from "@/lib/utils";
import { sendReceiptEmail } from "@/lib/email";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin.from("invoices").select("*").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invoice: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { status, paid_at, payment_method } = body;

    const { data: invoice, error } = await supabaseAdmin
      .from("invoices")
      .update({ status, paid_at })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Create receipt for cash payments
    if (status === "paid" && payment_method === "cash") {
      const receiptNumber = generateReceiptNumber(invoice.invoice_number);
      const { data: receipt } = await supabaseAdmin
        .from("receipts")
        .insert({
          invoice_id: id,
          user_id: invoice.user_id,
          receipt_number: receiptNumber,
          amount_paid: invoice.total,
          payment_method: "cash",
          paystack_reference: "CASH-" + id.slice(0, 8),
          paid_at,
        })
        .select()
        .single();

      const { data: business } = await supabaseAdmin
        .from("businesses")
        .select("*")
        .eq("user_id", invoice.user_id)
        .single();

      if (invoice.client_email && receipt && business) {
        await sendReceiptEmail(invoice, receipt, business).catch(console.error);
      }
    }

    return NextResponse.json({ invoice });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
