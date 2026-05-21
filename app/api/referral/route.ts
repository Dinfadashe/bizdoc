import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { referral_code, business_user_id, business_email } = await req.json();
    if (!referral_code || !business_user_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    // Find marketer by referral code
    const { data: marketer } = await supabaseAdmin.from("marketers").select("id").eq("referral_code", referral_code).eq("status", "active").single();
    if (!marketer) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    // Check not already referred
    const { data: existing } = await supabaseAdmin.from("referrals").select("id").eq("business_user_id", business_user_id).single();
    if (existing) return NextResponse.json({ ok: true, message: "Already referred" });
    // Get business name
    const { data: biz } = await supabaseAdmin.from("businesses").select("name").eq("user_id", business_user_id).single();
    // Record referral
    await supabaseAdmin.from("referrals").insert({
      marketer_id: marketer.id, business_user_id, business_email,
      business_name: biz?.name || business_email, referral_code
    });
    // Update business referral code
    await supabaseAdmin.from("businesses").update({ referral_code }).eq("user_id", business_user_id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}