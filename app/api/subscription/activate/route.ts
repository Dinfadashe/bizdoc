import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

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
    const expires_at = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin.from("subscriptions").upsert({
      user_id,
      status: "active",
      plan,
      subscribed_at: new Date().toISOString(),
      expires_at,
      paystack_reference: reference,
    }, { onConflict: "user_id" });

    console.log("Subscription activated for:", user_id, "plan:", plan, "expires:", expires_at);
  }
  return NextResponse.json({ ok: true });
}

export const config = { api: { bodyParser: false } };