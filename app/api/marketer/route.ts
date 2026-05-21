import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const { data: marketer } = await supabaseAdmin.from("marketers").select("*").eq("user_id", user_id).single();
  if (!marketer) return NextResponse.json({ marketer: null });

  const { data: referrals } = await supabaseAdmin.from("referrals")
    .select("*, businesses(name)")
    .eq("marketer_id", marketer.id)
    .order("created_at", { ascending: false });

  const { data: earnings } = await supabaseAdmin.from("marketer_earnings")
    .select("*")
    .eq("marketer_id", marketer.id)
    .order("month", { ascending: false });

  // Group earnings by month
  const byMonth: Record<string, any> = {};
  (earnings ?? []).forEach((e: any) => {
    if (!byMonth[e.month]) byMonth[e.month] = { month: e.month, total: 0, paid: true, items: [] };
    byMonth[e.month].total += Number(e.commission_amount);
    byMonth[e.month].paid = byMonth[e.month].paid && e.paid;
    byMonth[e.month].items.push(e);
  });

  const totalEarned = (earnings ?? []).reduce((s: number, e: any) => s + Number(e.commission_amount), 0);
  const totalPaid = (earnings ?? []).filter((e: any) => e.paid).reduce((s: number, e: any) => s + Number(e.commission_amount), 0);
  const totalPending = totalEarned - totalPaid;

  return NextResponse.json({
    marketer,
    referrals: referrals ?? [],
    earningsByMonth: Object.values(byMonth).sort((a: any, b: any) => b.month.localeCompare(a.month)),
    totalEarned, totalPaid, totalPending,
  });
}