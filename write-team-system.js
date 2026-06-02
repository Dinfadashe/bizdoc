const fs = require('fs');

// ── 1. Update team invite API ────────────────────────────────
fs.mkdirSync('app/api/team', { recursive: true });
fs.writeFileSync('app/api/team/invite/route.ts', `
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://bizdoc.charitytoken.net").replace(/\\/+$/, "");

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
    const html = \`
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f2ed;font-family:'Georgia',serif">
  <div style="max-width:560px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e8e4de">
    <div style="background:#1a4a2e;padding:28px 32px;text-align:center">
      <img src="\${APP_URL}/logo-v2.png" alt="BizDoc" style="height:50px;object-fit:contain;margin-bottom:10px"/>
      <div style="color:#a8d5b5;font-size:13px;letter-spacing:1px;text-transform:uppercase">Team Invitation</div>
    </div>
    <div style="padding:32px">
      <h2 style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 12px">You've been invited to join \${biz.name}</h2>
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 24px">
        <strong>\${biz.name}</strong> has invited you to join their team on BizDoc as a <strong>\${role}</strong>.
        \${existingUser ? "Click below to accept the invitation." : "Create your free BizDoc account to get started."}
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="\${invite_url}" style="display:inline-block;background:#1a4a2e;color:white;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none">
          \${existingUser ? "Accept Invitation" : "Create Account & Join"}
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
</html>\`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "info@charitytoken.net",
      to: member_email,
      subject: \`You're invited to join \${biz.name} on BizDoc\`,
      html,
    }).catch(console.error);

    return NextResponse.json({ ok: true, member, hasAccount: !!existingUser });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
`.trim(), { encoding: 'utf8' });
console.log('Created team invite API');

// ── 2. Update join page ──────────────────────────────────────
fs.mkdirSync('app/join', { recursive: true });
fs.writeFileSync('app/join/page.tsx', `"use client";
export const dynamic = "force-dynamic";
import { Suspense, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [invite, setInvite] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [needsAccount, setNeedsAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"accept"|"signup"|"login">("accept");
  const [authLoading, setAuthLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!token) { setError("Invalid invite link."); setLoading(false); return; }
    // Load invite
    supabase.from("team_members").select("*, businesses(name, logo_url, email)").eq("invite_token", token).single()
      .then(({ data, error: err }) => {
        if (err || !data) { setError("This invite link is invalid or has expired."); setLoading(false); return; }
        if (data.status === "active") { setError("This invitation has already been accepted."); setLoading(false); return; }
        setInvite(data);
        setBusiness(data.businesses);
        setEmail(data.member_email || "");
        setNeedsAccount(data.status === "pending_email");
        setLoading(false);
      });
  }, [token]);

  const acceptInvite = async (userId: string) => {
    setAccepting(true);
    await supabase.from("team_members").update({
      member_user_id: userId,
      status: "active",
      accepted_at: new Date().toISOString(),
    }).eq("invite_token", token);
    setAccepting(false);
    router.push("/dashboard");
  };

  const handleAccept = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      // Check email matches
      if (data.session.user.email?.toLowerCase() !== invite.member_email?.toLowerCase()) {
        setError("Please sign in with the email address this invitation was sent to: " + invite.member_email);
        return;
      }
      await acceptInvite(data.session.user.id);
    } else {
      // Need to login or signup
      setMode(needsAccount ? "signup" : "login");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError("");
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err) { setError(err.message); setAuthLoading(false); return; }
    if (data.user) {
      // Create business profile
      if (name.trim()) {
        await supabase.from("businesses").insert({ user_id: data.user.id, name, email, currency: "NGN", onboarding_complete: false });
      }
      await acceptInvite(data.user.id);
    }
    setAuthLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setAuthLoading(false); return; }
    if (data.user) await acceptInvite(data.user.id);
    setAuthLoading(false);
  };

  const inp = { width: "100%", padding: "11px 14px", border: "1.5px solid #e8e4de", borderRadius: 8, fontSize: 15, outline: "none", fontFamily: "inherit" } as const;
  const lbl = { display: "block" as const, fontSize: 11, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "#888", marginBottom: 6 };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f2ed" }}><div style={{ color: "#888" }}>Loading invitation...</div></div>;

  if (error && !invite) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f2ed", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 14, padding: 40, maxWidth: 420, textAlign: "center", border: "1px solid #e8e4de" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Invalid Invitation</div>
        <div style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>{error}</div>
        <Link href="/"><button style={{ padding: "11px 28px", background: "#1a4a2e", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Go to BizDoc</button></Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f2ed", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "white", borderRadius: 16, border: "1px solid #e8e4de", overflow: "hidden", maxWidth: 460, width: "100%" }}>
        <div style={{ background: "#1a4a2e", padding: "24px 28px", textAlign: "center" }}>
          {business?.logo_url && <img src={business.logo_url} alt="logo" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 8, marginBottom: 10 }}/>}
          <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, color: "white" }}>{business?.name}</div>
          <div style={{ color: "#a8d5b5", fontSize: 13, marginTop: 4 }}>Team Invitation</div>
        </div>

        <div style={{ padding: "28px 28px" }}>
          {mode === "accept" && (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>You're invited to join {business?.name}</div>
              <div style={{ color: "#888", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                You've been invited as a <strong>{invite?.role}</strong> member.
                {needsAccount ? " You'll need to create a BizDoc account to accept." : " Sign in to accept this invitation."}
              </div>
              {error && <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#cc2222", marginBottom: 16 }}>{error}</div>}
              <button onClick={handleAccept} disabled={accepting} style={{ width: "100%", padding: "13px", background: "#1a4a2e", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {accepting ? "Accepting..." : needsAccount ? "Create Account & Join" : "Accept Invitation"}
              </button>
            </>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignup}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Create your BizDoc account</div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Your Name / Business Name</label><input value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="e.g. John Doe" required/></div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} placeholder={invite?.member_email} required/></div>
              <div style={{ marginBottom: 20, position: "relative" }}>
                <label style={lbl}>Password</label>
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} style={{ ...inp, paddingRight: 44 }} minLength={6} required/>
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: 30, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888" }}>{showPw ? "🙈" : "👁"}</button>
              </div>
              {error && <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#cc2222", marginBottom: 16 }}>{error}</div>}
              <button type="submit" disabled={authLoading} style={{ width: "100%", padding: "13px", background: "#1a4a2e", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: authLoading ? 0.7 : 1 }}>
                {authLoading ? "Creating account..." : "Create Account & Accept"}
              </button>
              <button type="button" onClick={() => setMode("login")} style={{ width: "100%", padding: "10px", background: "none", border: "none", color: "#1a4a2e", fontSize: 13, cursor: "pointer", marginTop: 10, fontFamily: "inherit" }}>
                Already have an account? Sign in
              </button>
            </form>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Sign in to accept invitation</div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} required/></div>
              <div style={{ marginBottom: 20, position: "relative" }}>
                <label style={lbl}>Password</label>
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} style={{ ...inp, paddingRight: 44 }} required/>
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: 30, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888" }}>{showPw ? "🙈" : "👁"}</button>
              </div>
              {error && <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#cc2222", marginBottom: 16 }}>{error}</div>}
              <button type="submit" disabled={authLoading} style={{ width: "100%", padding: "13px", background: "#1a4a2e", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: authLoading ? 0.7 : 1 }}>
                {authLoading ? "Signing in..." : "Sign In & Accept"}
              </button>
              <button type="button" onClick={() => setMode("signup")} style={{ width: "100%", padding: "10px", background: "none", border: "none", color: "#1a4a2e", fontSize: 13, cursor: "pointer", marginTop: 10, fontFamily: "inherit" }}>
                Don't have an account? Create one
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return <Suspense fallback={<div style={{ padding: 60, textAlign: "center" }}>Loading...</div>}><JoinContent /></Suspense>;
}
`, { encoding: 'utf8' });
console.log('Created join page');

// ── 3. Account switcher API ──────────────────────────────────
fs.mkdirSync('app/api/team/memberships', { recursive: true });
fs.writeFileSync('app/api/team/memberships/route.ts', `
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  // Get all businesses this user is a team member of
  const { data: memberships } = await supabaseAdmin
    .from("team_members")
    .select("id, role, status, owner_user_id, businesses(id, name, logo_url)")
    .eq("member_user_id", user_id)
    .eq("status", "active");

  return NextResponse.json({ memberships: memberships ?? [] });
}
`.trim(), { encoding: 'utf8' });
console.log('Created memberships API');

console.log('All done!');