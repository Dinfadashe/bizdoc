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
    const { status, paid_at, payment_method, ...editFields } = body;

    // Draft invoice edit — update all invoice fields
    if (!status && !paid_at) {
      const { client_name, client_email, client_phone, client_address, items, discount_type, discount_value,
        tax_rate, notes, issue_date, due_date, currency, display_account_id, subtotal, discount_amount, tax_amount, total } = editFields;

      const { data: invoice, error } = await supabaseAdmin
        .from("invoices")
        .update({
          client_name, client_email, client_phone, client_address,
          items, discount_type, discount_value, tax_rate, notes,
          issue_date, due_date, currency, display_account_id,
          subtotal, discount_amount, tax_amount, total,
        })
        .eq("id", id)
        .eq("status", "draft") // safety: only allow editing drafts
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ invoice });
    }

    // Status update (mark as paid, etc.)
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // Only draft invoices can be deleted
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from("invoices")
      .select("status, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (invoice.status !== "draft") {
      return NextResponse.json(
        { error: invoice.status === "paid" ? "Paid invoices cannot be deleted." : "Only draft invoices can be deleted. Pending invoices expire naturally." },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin.from("invoices").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}