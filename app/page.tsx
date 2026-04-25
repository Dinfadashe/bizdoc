// Landing / login page
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    const fn = mode === "login"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });

    const { error } = await fn;

    if (error) {
      setMsg(error.message);
    } else {
      if (mode === "signup") {
        setMsg("Check your email to confirm your account.");
      } else {
        router.push("/dashboard");
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 700, color: "var(--green)" }}>BizDoc</div>
          <div style={{ color: "var(--muted)", fontSize: 15, marginTop: 6 }}>Create invoices. Get paid. Auto-receipts.</div>
        </div>

        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
          {/* Tab */}
          <div style={{ display: "flex", background: "#faf9f7", borderBottom: "1px solid var(--border)" }}>
            {(["login", "signup"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: "14px", border: "none", background: mode === m ? "white" : "transparent",
                fontWeight: 700, fontSize: 14, cursor: "pointer", color: mode === m ? "var(--green)" : "var(--muted)",
                fontFamily: "var(--font-body)", borderBottom: mode === m ? "2px solid var(--green)" : "none",
                textTransform: "capitalize",
              }}>{m === "login" ? "Sign In" : "Create Account"}</button>
            ))}
          </div>

          <form onSubmit={handleAuth} style={{ padding: 28 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, outline: "none" }}
                placeholder="you@business.com" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, outline: "none" }}
                placeholder="••••••••" />
            </div>
            {msg && <div style={{ background: msg.includes("Check") ? "var(--green-light)" : "#fff3e0", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, color: msg.includes("Check") ? "var(--green)" : "#b36000" }}>{msg}</div>}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "13px", background: "var(--green)", color: "white", border: "none",
              borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1, fontFamily: "var(--font-body)",
            }}>{loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
