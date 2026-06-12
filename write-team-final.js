const fs = require('fs');

// ── 1. Join page - no login required, works for anyone ───────
fs.writeFileSync('app/join/page.tsx', `"use client";
export const dynamic = "force-dynamic";
import { Suspense, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [invite, setInvite] = useState<any>(null);
  const [bizName, setBizName] = useState("");
  const [bizLogo, setBizLogo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"info"|"signup"|"login">("info");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [myName, setMyName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setError("No invite token found in link."); setLoading(false); return; }
    // Use supabaseAdmin via API to avoid RLS issues
    fetch("/api/team/accept?token=" + token)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setInvite(d.invite);
        setBizName(d.bizName || "");
        setBizLogo(d.bizLogo || "");
        setEmail(d.invite.member_email || "");
        setLoading(false);
      })
      .catch(() => { setError("Failed to load invitation."); setLoading(false); });
  }, [token]);

  const acceptWithUser = async (userId: string) => {
    const res = await fetch("/api/team/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, user_id: userId }),
    });
    const d = await res.json();
    if (d.ok) { setDone(true); setTimeout(() => router.push("/dashboard"), 2000); }
    else setError(d.error || "Failed to accept invitation.");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err) { setError(err.message); setBusy(false); return; }
    if (data.user) {
      if (myName.trim()) {
        await supabase.from("businesses").insert({ user_id: data.user.id, name: myName.trim(), email, currency: "NGN", onboarding_complete: false });
      }
      await acceptWithUser(data.user.id);
    }
    setBusy(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setBusy(false); return; }
    if (data.user) await acceptWithUser(data.user.id);
    setBusy(false);
  };

  const handleAcceptLoggedIn = async () => {
    setBusy(true); setError("");
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      await acceptWithUser(data.session.user.id);
    } else {
      setMode(invite?.status === "pending_email" ? "signup" : "login");
    }
    setBusy(false);
  };

  const inp = { width: "100%", padding: "11px 14px", border: "1.5px solid #e8e4de", borderRadius: 8, fontSize: 15, outline: "none", fontFamily: "inherit", background: "white", boxSizing: "border-box" } as const;
  const lbl = { display: "block" as const, fontSize: 11, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "#888", marginBottom: 6 };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f2ed" }}>
      <div style={{ color: "#888" }}>Loading invitation...</div>
    </div>
  );

  if (done) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f2ed", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 14, padding: 40, maxWidth: 420, textAlign: "center", border: "1px solid #e8e4de" }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Welcome to {bizName}!</div>
        <div style={{ color: "#888", fontSize: 14 }}>Redirecting to dashboard...</div>
      </div>
    </div>
  );

  if (error && !invite) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f2ed", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 14, padding: 40, maxWidth: 420, textAlign: "center", border: "1px solid #e8e4de" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Invalid Invitation</div>
        <div style={{ color: "#888", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{error}</div>
        <a href="/"><button style={{ padding: "11px 28px", background: "#1a4a2e", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Go to BizDoc</button></a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f2ed", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "white", borderRadius: 16, border: "1px solid #e8e4de", overflow: "hidden", maxWidth: 460, width: "100%" }}>
        <div style={{ background: "#1a4a2e", padding: "24px 28px", textAlign: "center" }}>
          {bizLogo && <img src={bizLogo} alt="logo" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 8, marginBottom: 10, background: "white", padding: 4 }}/>}
          <img src="/logo-v2.png" alt="BizDoc" style={{ height: 36, objectFit: "contain", display: "block", margin: "0 auto 8px" }}/>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 700, color: "white" }}>{bizName || "BizDoc"}</div>
          <div style={{ color: "#a8d5b5", fontSize: 13, marginTop: 4 }}>Team Invitation</div>
        </div>

        <div style={{ padding: "28px 24px" }}>
          {error && <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#cc2222", marginBottom: 16 }}>{error}</div>}

          {mode === "info" && (
            <>
              <div style={{ fontFamily: "Georgia,serif", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>You're invited to join {bizName}</div>
              <div style={{ color: "#555", fontSize: 14, marginBottom: 6, lineHeight: 1.6 }}>
                Role: <strong style={{ color: "#1a4a2e", textTransform: "capitalize" }}>{invite?.role || "staff"}</strong>
              </div>
              <div style={{ color: "#888", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                Sent to: <strong>{invite?.member_email}</strong>
              </div>
              <button onClick={handleAcceptLoggedIn} disabled={busy} style={{ width: "100%", padding: "14px", background: "#1a4a2e", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10, opacity: busy ? 0.7 : 1 }}>
                {busy ? "Processing..." : "Accept Invitation"}
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setMode("signup")} style={{ flex: 1, padding: "11px", background: "#f5f2ed", color: "#1a4a2e", border: "1.5px solid #e8e4de", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Create Account</button>
                <button onClick={() => setMode("login")} style={{ flex: 1, padding: "11px", background: "#f5f2ed", color: "#1a4a2e", border: "1.5px solid #e8e4de", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Sign In</button>
              </div>
            </>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignup}>
              <div style={{ fontFamily: "Georgia,serif", fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Create your BizDoc account</div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Your Name / Business Name</label><input value={myName} onChange={e => setMyName(e.target.value)} style={inp} placeholder="e.g. John Doe"/></div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} required/></div>
              <div style={{ marginBottom: 20, position: "relative" }}>
                <label style={lbl}>Password</label>
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} style={{ ...inp, paddingRight: 44 }} minLength={6} required/>
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: 30, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888" }}>{showPw ? "🙈" : "👁"}</button>
              </div>
              <button type="submit" disabled={busy} style={{ width: "100%", padding: "14px", background: "#1a4a2e", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.7 : 1, marginBottom: 10 }}>{busy ? "Creating..." : "Create Account & Accept"}</button>
              <button type="button" onClick={() => setMode("login")} style={{ width: "100%", padding: "10px", background: "none", border: "none", color: "#1a4a2e", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Already have an account? Sign in</button>
            </form>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <div style={{ fontFamily: "Georgia,serif", fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Sign in to accept</div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} required/></div>
              <div style={{ marginBottom: 20, position: "relative" }}>
                <label style={lbl}>Password</label>
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} style={{ ...inp, paddingRight: 44 }} required/>
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: 30, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888" }}>{showPw ? "🙈" : "👁"}</button>
              </div>
              <button type="submit" disabled={busy} style={{ width: "100%", padding: "14px", background: "#1a4a2e", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.7 : 1, marginBottom: 10 }}>{busy ? "Signing in..." : "Sign In & Accept"}</button>
              <button type="button" onClick={() => setMode("signup")} style={{ width: "100%", padding: "10px", background: "none", border: "none", color: "#1a4a2e", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Don't have an account? Create one</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return <Suspense fallback={<div style={{ padding: 60, textAlign: "center", color: "#888" }}>Loading...</div>}><JoinContent /></Suspense>;
}`, { encoding: 'utf8' });
console.log('Join page written:', fs.readFileSync('app/join/page.tsx', 'utf8').split('\n').length, 'lines');

// ── 2. Team accept API ───────────────────────────────────────
fs.mkdirSync('app/api/team/accept', { recursive: true });
fs.writeFileSync('app/api/team/accept/route.ts', `import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "No token provided" }, { status: 400 });

  const { data: invite, error } = await supabaseAdmin
    .from("team_members")
    .select("*")
    .eq("invite_token", token)
    .single();

  if (error || !invite) return NextResponse.json({ error: "Invalid or expired invitation link." }, { status: 404 });
  if (invite.status === "active") return NextResponse.json({ error: "This invitation has already been accepted." }, { status: 400 });

  // Get business info
  const { data: biz } = await supabaseAdmin
    .from("businesses")
    .select("name, logo_url")
    .eq("user_id", invite.owner_user_id)
    .single();

  return NextResponse.json({ invite, bizName: biz?.name || "", bizLogo: biz?.logo_url || "" });
}

export async function POST(req: NextRequest) {
  try {
    const { token, user_id } = await req.json();
    if (!token || !user_id) return NextResponse.json({ error: "Missing token or user_id" }, { status: 400 });

    const { data: invite } = await supabaseAdmin
      .from("team_members")
      .select("*")
      .eq("invite_token", token)
      .single();

    if (!invite) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });

    // Accept the invite
    const { error } = await supabaseAdmin
      .from("team_members")
      .update({
        member_user_id: user_id,
        status: "active",
        accepted_at: new Date().toISOString(),
      })
      .eq("invite_token", token);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}`, { encoding: 'utf8' });
console.log('Accept API written');

// ── 3. Fix memberships API to include pending_account too ────
fs.mkdirSync('app/api/team/memberships', { recursive: true });
fs.writeFileSync('app/api/team/memberships/route.ts', `import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const { data: memberships } = await supabaseAdmin
    .from("team_members")
    .select("id, role, status, owner_user_id")
    .eq("member_user_id", user_id)
    .eq("status", "active");

  // Get business info for each membership
  const result = [];
  for (const m of memberships ?? []) {
    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("id, name, logo_url")
      .eq("user_id", m.owner_user_id)
      .single();
    result.push({ ...m, businesses: biz });
  }

  return NextResponse.json({ memberships: result });
}`, { encoding: 'utf8' });
console.log('Memberships API written');

console.log('All done!');