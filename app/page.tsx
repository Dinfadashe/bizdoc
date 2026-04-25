"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setMsg(error.message); setLoading(false); return; }
      router.push("/dashboard");
    } else {
      if (!businessName.trim()) { setMsg("Business name is required."); setLoading(false); return; }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setMsg(error.message); setLoading(false); return; }

      // Auto-create business profile
      if (data.user) {
        await supabase.from("businesses").insert({
          user_id: data.user.id,
          name: businessName,
          email,
          phone,
          address,
          currency: "NGN",
          onboarding_complete: false,
        });
      }

      setMsg("Account created! Check your email to confirm, then sign in.");
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px",
    border: "1.5px solid #e8e4de", borderRadius: 8,
    fontSize: 14, outline: "none", fontFamily: "var(--font-body)",
  };
  const labelStyle = {
    display: "block" as const, fontSize: 11, fontWeight: 700 as const,
    textTransform: "uppercase" as const, letterSpacing: "0.8px",
    color: "#888", marginBottom: 5,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 460 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 700, color: "var(--green)" }}>BizDoc</div>
          <div style={{ color: "#888", fontSize: 15, marginTop: 6 }}>Create invoices. Get paid. Auto-receipts.</div>
        </div>

        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e8e4de", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ display: "flex", background: "#faf9f7", borderBottom: "1px solid #e8e4de" }}>
            {(["login", "signup"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setMsg(""); }} style={{
                flex: 1, padding: "14px", border: "none",
                background: mode === m ? "white" : "transparent",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                color: mode === m ? "var(--green)" : "#888",
                fontFamily: "var(--font-body)",
                borderBottom: mode === m ? "2px solid var(--green)" : "2px solid transparent",
              }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleAuth} style={{ padding: 28 }}>

            {/* Signup-only fields */}
            {mode === "signup" && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Business Name *</label>
                  <input value={businessName} onChange={e => setBusinessName(e.target.value)} required style={inputStyle} placeholder="e.g. Acme Nigeria Ltd" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} placeholder="+234..." />
                  </div>
                  <div>
                    <label style={labelStyle}>Address</label>
                    <input value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} placeholder="City, State" />
                  </div>
                </div>
                <div style={{ height: 1, background: "#f0ece6", marginBottom: 16 }} />
              </>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="you@business.com" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" minLength={6} />
            </div>

            {msg && (
              <div style={{ background: msg.includes("created") ? "var(--green-light)" : "#fff3e0", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, color: msg.includes("created") ? "var(--green)" : "#b36000" }}>
                {msg}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "13px",
              background: "var(--green)", color: "white",
              border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              fontFamily: "var(--font-body)",
            }}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>

            {mode === "signup" && (
              <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
                By creating an account you agree to our terms of service.
                You can add your logo and bank account details after signup.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}