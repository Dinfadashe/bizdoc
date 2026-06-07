const fs = require('fs');

const content = `"use client";
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
  const [bizName, setBizName] = useState<string>("");
  const [bizLogo, setBizLogo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"accept"|"signup"|"login">("accept");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bizNameInput, setBizNameInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) { setError("Invalid invite link — no token found."); setLoading(false); return; }
    // Load invite by token
    supabase
      .from("team_members")
      .select("*")
      .eq("invite_token", token)
      .single()
      .then(async ({ data, error: err }) => {
        if (err || !data) {
          setError("This invite link is invalid or has expired.");
          setLoading(false);
          return;
        }
        if (data.status === "active") {
          setError("This invitation has already been accepted.");
          setLoading(false);
          return;
        }
        setInvite(data);
        setEmail(data.member_email || "");
        // Load business info separately
        const { data: biz } = await supabase
          .from("businesses")
          .select("name, logo_url")
          .eq("user_id", data.owner_user_id)
          .single();
        if (biz) {
          setBizName(biz.name || "");
          setBizLogo(biz.logo_url || "");
        }
        setLoading(false);
      });
  }, [token]);

  const acceptInvite = async (userId: string) => {
    setAccepting(true);
    const { error: updateErr } = await supabase
      .from("team_members")
      .update({
        member_user_id: userId,
        status: "active",
        accepted_at: new Date().toISOString(),
      })
      .eq("invite_token", token);
    setAccepting(false);
    if (updateErr) {
      setError("Failed to accept invite: " + updateErr.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  const handleAccept = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      if (data.session.user.email?.toLowerCase() !== invite.member_email?.toLowerCase()) {
        setError("Please sign in with the email this invitation was sent to: " + invite.member_email);
        return;
      }
      await acceptInvite(data.session.user.id);
    } else {
      setMode(invite.status === "pending_email" ? "signup" : "login");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError("");
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err) { setError(err.message); setAuthLoading(false); return; }
    if (data.user) {
      if (bizNameInput.trim()) {
        await supabase.from("businesses").insert({
          user_id: data.user.id, name: bizNameInput, email, currency: "NGN", onboarding_complete: false
        });
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

  const inp = { width: "100%", padding: "11px 14px", border: "1.5px solid #e8e4de", borderRadius: 8, fontSize: 15, outline: "none", fontFamily: "inherit", background: "white" } as const;
  const lbl = { display: "block" as const, fontSize: 11, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "#888", marginBottom: 6 };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f2ed" }}>
      <div style={{ color: "#888", fontSize: 15 }}>Loading invitation...</div>
    </div>
  );

  if (success) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f2ed", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 14, padding: 40, maxWidth: 420, textAlign: "center", border: "1px solid #e8e4de" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Welcome to {bizName}!</div>
        <div style={{ color: "#888", fontSize: 14, marginBottom: 20 }}>You've joined the team. Redirecting to dashboard...</div>
      </div>
    </div>
  );

  if (error && !invite) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f2ed", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 14, padding: 40, maxWidth: 420, textAlign: "center", border: "1px solid #e8e4de" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Invalid Invitation</div>
        <div style={{ color: "#888", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{error}</div>
        <Link href="/"><button style={{ padding: "11px 28px", background: "#1a4a2e", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Go to BizDoc</button></Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f2ed", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "white", borderRadius: 16, border: "1px solid #e8e4de", overflow: "hidden", maxWidth: 460, width: "100%" }}>
        {/* Header */}
        <div style={{ background: "#1a4a2e", padding: "24px 28px", textAlign: "center" }}>
          {bizLogo && <img src={bizLogo} alt="logo" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 8, marginBottom: 10, background: "white", padding: 4 }}/>}
          <img src="/logo-v2.png" alt="BizDoc" style={{ height: 36, objectFit: "contain", display: bizLogo ? "none" : "block", margin: "0 auto 8px" }}/>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 700, color: "white" }}>{bizName || "BizDoc Team"}</div>
          <div style={{ color: "#a8d5b5", fontSize: 13, marginTop: 4 }}>Team Invitation</div>
        </div>

        <div style={{ padding: "28px 24px" }}>
          {/* Accept mode */}
          {mode === "accept" && (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, fontFamily: "Georgia,serif" }}>
                You're invited to join {bizName}
              </div>
              <div style={{ color: "#888", fontSize: 14, marginBottom: 8, lineHeight: 1.6 }}>
                Role: <strong style={{ color: "#1a4a2e", textTransform: "capitalize" }}>{invite?.role || "staff"}</strong>
              </div>
              <div style={{ color: "#888", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                Invitation sent to: <strong>{invite?.member_email}</strong>
                <br/>
                {invite?.status === "pending_email"
                  ? "You don't have a BizDoc account yet. Create one to accept."
                  : "Sign in with this email to accept."}
              </div>
              {error && <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#cc2222", marginBottom: 16 }}>{error}</div>}
              <button onClick={handleAccept} disabled={accepting} style={{ width: "100%", padding: "14px", background: "#1a4a2e", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: accepting ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: accepting ? 0.7 : 1 }}>
                {accepting ? "Accepting..." : invite?.status === "pending_email" ? "Create Account & Accept" : "Accept Invitation"}
              </button>
            </>
          )}

          {/* Signup mode */}
          {mode === "signup" && (
            <form onSubmit={handleSignup}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, fontFamily: "Georgia,serif" }}>Create your BizDoc account</div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Your Business / Name</label>
                <input value={bizNameInput} onChange={e => setBizNameInput(e.target.value)} style={inp} placeholder="e.g. My Business or John Doe"/>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} required/>
              </div>
              <div style={{ marginBottom: 20, position: "relative" }}>
                <label style={lbl}>Password</label>
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} style={{ ...inp, paddingRight: 44 }} minLength={6} required/>
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: 30, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888" }}>{showPw ? "🙈" : "👁"}</button>
              </div>
              {error && <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#cc2222", marginBottom: 16 }}>{error}</div>}
              <button type="submit" disabled={authLoading} style={{ width: "100%", padding: "14px", background: "#1a4a2e", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: authLoading ? 0.7 : 1 }}>
                {authLoading ? "Creating account..." : "Create Account & Join"}
              </button>
              <button type="button" onClick={() => setMode("login")} style={{ width: "100%", padding: "10px", background: "none", border: "none", color: "#1a4a2e", fontSize: 13, cursor: "pointer", marginTop: 8, fontFamily: "inherit" }}>
                Already have an account? Sign in instead
              </button>
            </form>
          )}

          {/* Login mode */}
          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, fontFamily: "Georgia,serif" }}>Sign in to accept invitation</div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} required/>
              </div>
              <div style={{ marginBottom: 20, position: "relative" }}>
                <label style={lbl}>Password</label>
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} style={{ ...inp, paddingRight: 44 }} required/>
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: 30, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888" }}>{showPw ? "🙈" : "👁"}</button>
              </div>
              {error && <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#cc2222", marginBottom: 16 }}>{error}</div>}
              <button type="submit" disabled={authLoading} style={{ width: "100%", padding: "14px", background: "#1a4a2e", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: authLoading ? 0.7 : 1 }}>
                {authLoading ? "Signing in..." : "Sign In & Accept"}
              </button>
              <button type="button" onClick={() => setMode("signup")} style={{ width: "100%", padding: "10px", background: "none", border: "none", color: "#1a4a2e", fontSize: 13, cursor: "pointer", marginTop: 8, fontFamily: "inherit" }}>
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
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: "center", color: "#888" }}>Loading...</div>}>
      <JoinContent />
    </Suspense>
  );
}`;

fs.writeFileSync('app/join/page.tsx', content, 'utf8');
const result = fs.readFileSync('app/join/page.tsx', 'utf8');
console.log('Lines:', result.split('\n').length);
console.log('acceptInvite:', result.includes('acceptInvite'));
console.log('invite_token query:', result.includes('invite_token'));
console.log('businesses query:', result.includes("from(\"businesses\")"));
console.log(result.includes('acceptInvite') ? 'SUCCESS' : 'FAILED');