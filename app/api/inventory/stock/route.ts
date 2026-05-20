import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { user_id, inventory_id, type, quantity, reference, note } = await req.json();
    if (!user_id || !inventory_id || !type || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    // Update inventory quantity
    const { data: item } = await supabaseAdmin.from("inventory").select("quantity").eq("id", inventory_id).single();
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    const newQty = type === "in" ? Number(item.quantity) + Number(quantity) : Math.max(0, Number(item.quantity) - Number(quantity));
    await supabaseAdmin.from("inventory").update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("id", inventory_id);
    // Log movement
    const { data: movement } = await supabaseAdmin.from("stock_movements").insert({
      user_id, inventory_id, type, quantity, reference, note
    }).select().single();
    return NextResponse.json({ movement, new_quantity: newQty });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const inventory_id = searchParams.get("inventory_id");
  const user_id = searchParams.get("user_id");
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  let query = supabaseAdmin.from("stock_movements").select("*").eq("user_id", user_id).order("created_at", { ascending: false }).limit(50);
  if (inventory_id) query = query.eq("inventory_id", inventory_id);
  const { data } = await query;
  return NextResponse.json({ movements: data ?? [] });
}