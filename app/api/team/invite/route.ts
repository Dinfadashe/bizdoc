import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { owner_user_id, member_email } = await req.json();
    if (!owner_user_id || !member_email) {
      return NextResponse.json({ error: "owner_user_id and member_email required" }, { status: 400 });
    }

    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("id, name")
      .eq("user_id", owner_user_id)
      .single();

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const { data: existing } = await supabaseAdmin
      .from("team_members")
      .select("id, status")
      .eq("business_id", business.id)
      .eq("member_email", member_email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: "This email has already been invited" }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bizdoc-app.netlify.app";
    const inviteUrl = appUrl.replace(/\/+$/, "") + "/join?token=" + token;

    await supabaseAdmin.from("team_members").insert({
      business_id: business.id,
      owner_user_id,
      member_email: member_email.toLowerCase(),
      invite_token: token,
      status: "pending",
      role: "staff",
    });

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "info@charitytoken.net",
      to: member_email,
      subject: "You have been invited to join " + business.name + " on BizDoc",
      html: "<div style=\"font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;\">" +
        "<h2 style=\"color: #1a4a2e;\">You have been invited to BizDoc</h2>" +
        "<p>" + business.name + " has invited you to join their team on BizDoc as a staff member.</p>" +
        "<p>As a staff member you can create and manage invoices on behalf of " + business.name + ".</p>" +
        "<a href=\"" + inviteUrl + "\" style=\"display: inline-block; background: #1a4a2e; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;\">Accept Invitation</a>" +
        "<p style=\"color: #888; font-size: 13px;\">This link expires in 7 days. If you did not expect this invitation, ignore this email.</p>" +
        "</div>",
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

