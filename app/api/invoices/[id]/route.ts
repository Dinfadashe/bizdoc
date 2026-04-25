// GET /api/invoices/[id] — fetch a single invoice
// PATCH /api/invoices/[id] — update an invoice
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { calcTotals } from "@/lib/utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ invoice: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // If items/discount/tax changed, recalculate totals
  if (body.items || body.discount_value !== undefined || body.tax_rate !== undefined) {
    const existing = await supabaseAdmin.from("invoices").select("*").eq("id", id).single();
    const inv = existing.data;
    const items = body.items ?? inv.items;
    const discount_type = body.discount_type ?? inv.discount_type;
    const discount_value = body.discount_value ?? inv.discount_value;
    const tax_rate = body.tax_rate ?? inv.tax_rate;
    const { subtotal, discountAmount, taxAmount, total } = calcTotals(items, discount_type, discount_value, tax_rate);
    Object.assign(body, { subtotal, discount_amount: discountAmount, tax_amount: taxAmount, total });
  }

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoice: data });
}
