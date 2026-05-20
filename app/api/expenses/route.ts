import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  let query = supabaseAdmin.from("expenses").select("*").eq("user_id", user_id).order("date", { ascending: false });
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  const { data } = await query;
  return NextResponse.json({ expenses: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, added_by, title, category, amount, currency, date, note } = await req.json();
    if (!user_id || !title || !amount) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    const { data, error } = await supabaseAdmin.from("expenses").insert({
      user_id, added_by: added_by || user_id, title, category: category || "Other",
      amount, currency: currency || "NGN", date: date || new Date().toISOString().split("T")[0], note
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ expense: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await supabaseAdmin.from("expenses").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}