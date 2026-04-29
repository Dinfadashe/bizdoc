"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: (process.env.NEXT_PUBLIC_APP_URL || "https://bizdoc-app.netlify.app") + "/reset-password",
    });
    setLoading(false);
    if (error) { setMsg(error.message); return; }
    setSent(true);
  };

  const inputStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid #e8e4de", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "var(--font-body)" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="BizDoc" style={{ width: 140, height: "auto" }} />
        </div>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e8e4de", padding: 32 }}>
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>&#9993;</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Check your email</div>
              <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>We sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the link.</div>
              <Link href="/"><button style={{ marginTop: 24, padding: "10px 24px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Back to Sign In</button></Link>
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Reset your password</div>
              <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>Enter your email and we will send you a reset link.</div>
              <form onSubmit={handleReset}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#888", marginBottom: 5 }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="you@business.com" />
                </div>
                {msg && <div style={{ background: "#fff3e0", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, color: "#b36000" }}>{msg}</div>}
                <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "var(--font-body)" }}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <Link href="/" style={{ color: "var(--green)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Back to Sign In</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
