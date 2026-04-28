"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    fetch("/api/team/check?token=" + token)
      .then(r => r.json())
      .then(d => {
        if (d.valid) { setTokenValid(true); setBusinessName(d.business_name); setEmail(d.member_email); }
        else setTokenValid(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");
    let userId: string | null = null;
    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) { setError(signUpError.message); setLoading(false); return; }
      userId = data.user?.id ?? null;
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) { setError(signInError.message); setLoading(false); return; }
      userId = data.user?.id ?? null;
    }
    if (!userId) { setError("Authentication failed"); setLoading(false); return; }
    const res = await fetch("/api/team/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, user_id: userId }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      router.push("/dashboard");
    } else {
      setError(data.error ?? "Failed to accept invite");
    }
  };

  const inputStyle = { width: "100%", padding: "11px 14px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "sans-serif", boxSizing: "border-box" as const };

  if (tokenValid === null) return <div style={{ padding: 60, textAlign: "center", color: "#888" }}>Checking invite...</div>;
  if (tokenValid === false) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f2ed" }}>
      <div style={{ background: "white", borderRadius: 14, padding: 40, maxWidth: 400, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>&#x274C;</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Invalid Invite</div>
        <div style={{ color: "#888" }}>This invite link is invalid or has already been used.</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f2ed", padding: 20 }}>
      <div style={{ background: "white", borderRadius: 14, padding: 40, maxWidth: 420, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#1a4a2e", marginBottom: 8 }}>BizDoc</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Join {businessName}</div>
          <div style={{ fontSize: 13, color: "#888" }}>You have been invited to join as a staff member</div>
        </div>
        <div style={{ display: "flex", background: "#f0f0f0", borderRadius: 8, padding: 4, gap: 4, marginBottom: 24 }}>
          {(["signup", "login"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", background: mode === m ? "white" : "transparent", color: mode === m ? "#1a4a2e" : "#888" }}>
              {m === "signup" ? "Create Account" : "Sign In"}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#888", marginBottom: 6 }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#888", marginBottom: 6 }}>Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" style={inputStyle} required minLength={6} />
          </div>
          {error && <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#cc2222", marginBottom: 16 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", background: "#1a4a2e", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Please wait..." : mode === "signup" ? "Create Account & Join" : "Sign In & Join"}
          </button>
        </form>
      </div>
    </div>
  );
}