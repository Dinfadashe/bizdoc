// POST /api/invoices — create a new invoice
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { calcTotals, generateInvoiceNumber } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      user_id,
      client_name, client_email, client_phone, client_address,
      items = [],
      discount_type = "percent",
      discount_value = 0,
      tax_rate = 7.5,
      notes, payment_info,
      issue_date, due_date,
      currency = "NGN",
    } = body;

    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const { subtotal, discountAmount, taxAmount, total } = calcTotals(
      items, discount_type, discount_value, tax_rate
    );

    const { data, error } = await supabaseAdmin
      .from("invoices")
      .insert({
        user_id,
        invoice_number: generateInvoiceNumber(),
        status: "draft",
        currency,
        client_name, client_email, client_phone, client_address,
        items,
        discount_type,
        discount_value,
        discount_amount: discountAmount,
        tax_rate,
        tax_amount: taxAmount,
        subtotal,
        total,
        notes, payment_info,
        issue_date: issue_date ?? new Date().toISOString().split("T")[0],
        due_date,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ invoice: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
