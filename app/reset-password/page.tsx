"use client";
export const dynamic = "force-dynamic";
import { Suspense, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function ResetContent() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setMsg("Invalid or expired reset link. Please request a new one.");
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setMsg("Passwords do not match."); return; }
    if (password.length < 6) { setMsg("Password must be at least 6 characters."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setMsg(error.message); return; }
    setMsg("Password updated successfully! Redirecting...");
    setTimeout(() => router.push("/"), 2000);
  };

  const inputStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid #e8e4de", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "var(--font-body)" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="BizDoc" style={{ width: 140, height: "auto" }} />
        </div>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e8e4de", padding: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Set new password</div>
          <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>Enter your new password below.</div>
          {!ready && msg ? (
            <div style={{ background: "#fff0f0", padding: "10px 14px", borderRadius: 8, fontSize: 13, color: "#cc2222" }}>{msg}</div>
          ) : (
            <form onSubmit={handleReset}>
              <div style={{ marginBottom: 16, position: "relative" }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#888", marginBottom: 5 }}>New Password</label>
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required style={{ ...inputStyle, paddingRight: 40 }} minLength={6} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 10, top: 30, background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 16 }}>{showPw ? "🙈" : "👁"}</button>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#888", marginBottom: 5 }}>Confirm Password</label>
                <input type={showPw ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} required style={inputStyle} minLength={6} />
              </div>
              {msg && <div style={{ background: msg.includes("successfully") ? "var(--green-light)" : "#fff0f0", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, color: msg.includes("successfully") ? "var(--green)" : "#cc2222" }}>{msg}</div>}
              <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "var(--font-body)" }}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return <Suspense fallback={<div style={{ padding: 60, textAlign: "center" }}>Loading...</div>}><ResetContent /></Suspense>;
}
