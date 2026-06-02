import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://bizdoc.charitytoken.net").replace(/\/+$/, "");

export async function POST(req: NextRequest) {
  try {
    const { owner_user_id, member_email, role = "staff" } = await req.json();
    if (!owner_user_id || !member_email) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // Get business info
    const { data: biz } = await supabaseAdmin.from("businesses").select("*").eq("user_id", owner_user_id).single();
    if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    // Check if already a member
    const { data: existing } = await supabaseAdmin.from("team_members")
      .select("id, status").eq("owner_user_id", owner_user_id).eq("member_email", member_email.toLowerCase().trim()).single();
    if (existing) return NextResponse.json({ error: "This person is already in your team." }, { status: 400 });

    // Generate invite token
    const invite_token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const invite_url = APP_URL + "/join?token=" + invite_token;

    // Check if user has a bizdoc account
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users?.users?.find((u: any) => u.email?.toLowerCase() === member_email.toLowerCase().trim());

    const status = existingUser ? "pending_account" : "pending_email";
    const member_user_id = existingUser?.id || null;

    // Create team member record
    const { data: member, error } = await supabaseAdmin.from("team_members").insert({
      business_id: biz.id,
      owner_user_id,
      member_email: member_email.toLowerCase().trim(),
      member_user_id,
      invite_email: member_email.toLowerCase().trim(),
      role,
      status,
      invite_token,
    }).select().single();

    if (error) throw error;

    // Send invite email
    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f2ed;font-family:'Georgia',serif">
  <div style="max-width:560px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e8e4de">
    <div style="background:#1a4a2e;padding:28px 32px;text-align:center">
      <img src="${APP_URL}/logo-v2.png" alt="BizDoc" style="height:50px;object-fit:contain;margin-bottom:10px"/>
      <div style="color:#a8d5b5;font-size:13px;letter-spacing:1px;text-transform:uppercase">Team Invitation</div>
    </div>
    <div style="padding:32px">
      <h2 style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 12px">You've been invited to join ${biz.name}</h2>
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 24px">
        <strong>${biz.name}</strong> has invited you to join their team on BizDoc as a <strong>${role}</strong>.
        ${existingUser ? "Click below to accept the invitation." : "Create your free BizDoc account to get started."}
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${invite_url}" style="display:inline-block;background:#1a4a2e;color:white;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none">
          ${existingUser ? "Accept Invitation" : "Create Account & Join"}
        </a>
      </div>
      <p style="color:#888;font-size:13px;line-height:1.7;margin:0">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
    <div style="padding:20px 32px;background:#faf9f7;border-top:1px solid #f0ece6;font-size:12px;color:#aaa;text-align:center">
      BizDoc · Business Management, Payment and Sales Records
    </div>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "info@charitytoken.net",
      to: member_email,
      subject: `You're invited to join ${biz.name} on BizDoc`,
      html,
    }).catch(console.error);

    return NextResponse.json({ ok: true, member, hasAccount: !!existingUser });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}