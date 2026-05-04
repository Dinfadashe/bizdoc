import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  const { data } = await supabaseAdmin.from("subscriptions").select("*").eq("user_id", user_id).single();
  if (!data) {
    // Create trial if not exists
    const { data: newSub } = await supabaseAdmin.from("subscriptions").insert({
      user_id, status: "trial", trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }).select().single();
    return NextResponse.json({ subscription: newSub });
  }
  return NextResponse.json({ subscription: data });
}