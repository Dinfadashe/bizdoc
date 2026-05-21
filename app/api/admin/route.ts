import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_EMAIL = "dinfadashe@gmail.com";

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user || data.user.email !== ADMIN_EMAIL) return null;
  return data.user;
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "marketers") {
    const { data } = await supabaseAdmin.from("marketers").select("*").order("created_at", { ascending: false });
    return NextResponse.json({ marketers: data ?? [] });
  }
  if (type === "referrals") {
    const { data } = await supabaseAdmin.from("referrals").select("*, marketers(email, referral_code)").order("created_at", { ascending: false });
    return NextResponse.json({ referrals: data ?? [] });
  }
  if (type === "earnings") {
    const { data } = await supabaseAdmin.from("marketer_earnings").select("*, marketers(email, referral_code)").order("created_at", { ascending: false });
    return NextResponse.json({ earnings: data ?? [] });
  }
  if (type === "stats") {
    const [mRes, rRes, eRes, sRes] = await Promise.all([
      supabaseAdmin.from("marketers").select("id", { count: "exact" }),
      supabaseAdmin.from("referrals").select("id", { count: "exact" }),
      supabaseAdmin.from("marketer_earnings").select("commission_amount, paid"),
      supabaseAdmin.from("subscriptions").select("status", { count: "exact" }).eq("status", "active"),
    ]);
    const earnings = eRes.data ?? [];
    const totalCommissions = earnings.reduce((s: number, e: any) => s + Number(e.commission_amount), 0);
    const unpaidCommissions = earnings.filter((e: any) => !e.paid).reduce((s: number, e: any) => s + Number(e.commission_amount), 0);
    return NextResponse.json({
      totalMarketers: mRes.count ?? 0,
      totalReferrals: rRes.count ?? 0,
      totalCommissions,
      unpaidCommissions,
      activeSubscriptions: sRes.count ?? 0,
    });
  }
  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, ...body } = await req.json();

  if (action === "invite_marketer") {
    const { email } = body;
    // Find user by email
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find((u: any) => u.email === email);
    if (!user) return NextResponse.json({ error: "No account found with that email. Ask them to register first." }, { status: 404 });
    // Check if already a marketer
    const { data: existing } = await supabaseAdmin.from("marketers").select("id").eq("user_id", user.id).single();
    if (existing) return NextResponse.json({ error: "This user is already a marketer." }, { status: 400 });
    // Generate referral code
    const referral_code = "BIZ-" + email.split("@")[0].toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const { data, error } = await supabaseAdmin.from("marketers").insert({
      user_id: user.id, email, referral_code, status: "active"
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ marketer: data });
  }

  if (action === "mark_paid") {
    const { marketer_id, month } = body;
    const { data } = await supabaseAdmin.from("marketer_earnings")
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq("marketer_id", marketer_id).eq("month", month).eq("paid", false)
      .select();
    const totalPaid = (data ?? []).reduce((s: number, e: any) => s + Number(e.commission_amount), 0);
    await supabaseAdmin.from("marketers").update({ total_paid: supabaseAdmin.rpc("increment", { x: totalPaid }) }).eq("id", marketer_id);
    return NextResponse.json({ ok: true, count: data?.length ?? 0 });
  }

  if (action === "remove_marketer") {
    const { marketer_id } = body;
    await supabaseAdmin.from("marketers").update({ status: "inactive" }).eq("id", marketer_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}