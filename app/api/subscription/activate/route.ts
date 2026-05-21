import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

const COMMISSION_RATE = 0.30;
const MONTHLY_AMOUNT = 1500;
const ANNUAL_AMOUNT = 15000;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const secret = process.env.PAYSTACK_SECRET_KEY!;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  if (hash !== signature) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const event = JSON.parse(rawBody);
  if (event.event === "charge.success") {
    const { reference, metadata } = event.data;
    const user_id = metadata?.user_id;
    const plan = metadata?.plan ?? "monthly";
    if (!user_id) return NextResponse.json({ ok: true });

    const months = plan === "annual" ? 12 : 1;
    const subscriptionAmount = plan === "annual" ? ANNUAL_AMOUNT : MONTHLY_AMOUNT;
    const expires_at = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();
    const month = new Date().toISOString().slice(0, 7);

    // Activate subscription
    await supabaseAdmin.from("subscriptions").upsert({
      user_id, status: "active", plan,
      subscribed_at: new Date().toISOString(),
      expires_at, paystack_reference: reference,
    }, { onConflict: "user_id" });

    // Check if business was referred
    const { data: biz } = await supabaseAdmin.from("businesses").select("referral_code, name").eq("user_id", user_id).single();
    if (biz?.referral_code) {
      const { data: marketer } = await supabaseAdmin.from("marketers").select("id, email").eq("referral_code", biz.referral_code).eq("status", "active").single();
      if (marketer) {
        const commission = subscriptionAmount * COMMISSION_RATE;
        // Record earning for each month of subscription
        for (let i = 0; i < months; i++) {
          const earningMonth = new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);
          await supabaseAdmin.from("marketer_earnings").insert({
            marketer_id: marketer.id,
            business_user_id: user_id,
            business_name: biz.name,
            subscription_amount: subscriptionAmount,
            commission_amount: commission,
            month: earningMonth,
            plan, paid: false,
            paystack_reference: reference,
          }).onConflict ? null : null;
        }
        // Update marketer total earned
        const totalCommission = commission * months;
        await supabaseAdmin.rpc("increment_marketer_earned", { marketer_id: marketer.id, amount: totalCommission }).catch(() => {
          supabaseAdmin.from("marketers").select("total_earned").eq("id", marketer.id).single().then(({ data }) => {
            if (data) supabaseAdmin.from("marketers").update({ total_earned: Number(data.total_earned) + totalCommission }).eq("id", marketer.id);
          });
        });
        console.log("Commission recorded for marketer:", marketer.email, "amount:", totalCommission);
      }
    }

    console.log("Subscription activated for:", user_id, "plan:", plan);
  }
  return NextResponse.json({ ok: true });
}

export const config = { api: { bodyParser: false } };