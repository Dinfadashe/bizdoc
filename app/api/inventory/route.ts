import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  const { data } = await supabaseAdmin.from("inventory").select("*").eq("user_id", user_id).order("name");
  return NextResponse.json({ inventory: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, name, description, sku, category, cost_price, selling_price, quantity, low_stock_alert, unit } = body;
    if (!user_id || !name) return NextResponse.json({ error: "user_id and name required" }, { status: 400 });
    const { data, error } = await supabaseAdmin.from("inventory").insert({
      user_id, name, description, sku, category, cost_price: cost_price || 0,
      selling_price: selling_price || 0, quantity: quantity || 0,
      low_stock_alert: low_stock_alert || 5, unit: unit || "unit"
    }).select().single();
    if (error) throw error;
    // Log stock movement if initial quantity > 0
    if (quantity > 0) {
      await supabaseAdmin.from("stock_movements").insert({
        user_id, inventory_id: data.id, type: "in", quantity, reference: "Initial stock", note: "Opening stock"
      });
    }
    return NextResponse.json({ item: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { data, error } = await supabaseAdmin.from("inventory").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await supabaseAdmin.from("inventory").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}