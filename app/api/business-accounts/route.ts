import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  const { data } = await supabaseAdmin.from("business_accounts").select("*").eq("user_id", user_id).order("created_at");
  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, account_name, account_number, bank_name, currency, is_default } = await req.json();
    if (!user_id || !account_name || !account_number || !bank_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (is_default) {
      await supabaseAdmin.from("business_accounts").update({ is_default: false }).eq("user_id", user_id);
    }
    const { data, error } = await supabaseAdmin.from("business_accounts").insert({
      user_id, account_name, account_number, bank_name, currency: currency || "NGN", is_default: is_default || false
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ account: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await supabaseAdmin.from("business_accounts").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}