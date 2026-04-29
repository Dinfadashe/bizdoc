"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const MAX_ATTEMPTS = 4;
const LOCKOUT_MINS = 30;
const LOCKOUT_KEY = "bizdoc_lockout";
const ATTEMPTS_KEY = "bizdoc_attempts";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [countdown, setCountdown] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedLockout = localStorage.getItem(LOCKOUT_KEY);
    const storedAttempts = localStorage.getItem(ATTEMPTS_KEY);
    if (storedLockout) setLockoutUntil(Number(storedLockout));
    if (storedAttempts) setAttempts(Number(storedAttempts));
  }, []);

  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const remaining = lockoutUntil - Date.now();
      if (remaining <= 0) {
        setLockoutUntil(null);
        setCountdown("");
        localStorage.removeItem(LOCKOUT_KEY);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setCountdown(mins + "m " + secs + "s");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    if (mode === "login") {
      // Check lockout
      if (lockoutUntil && Date.now() < lockoutUntil) {
        setMsg("Account locked. Please wait " + countdown + " or reset your password.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem(ATTEMPTS_KEY, String(newAttempts));

        if (newAttempts >= MAX_ATTEMPTS + 1) {
          // 5th attempt — force reset
          setMsg("Too many failed attempts. You must reset your password to continue.");
          localStorage.removeItem(LOCKOUT_KEY);
          localStorage.removeItem(ATTEMPTS_KEY);
          setAttempts(0);
          setLockoutUntil(null);
        } else if (newAttempts >= MAX_ATTEMPTS) {
          // 4th attempt — lockout for 30 mins
          const until = Date.now() + LOCKOUT_MINS * 60 * 1000;
          setLockoutUntil(until);
          localStorage.setItem(LOCKOUT_KEY, String(until));
          setMsg("Too many failed attempts. Account locked for " + LOCKOUT_MINS + " minutes.");
        } else {
          setMsg("Incorrect email or password. " + (MAX_ATTEMPTS - newAttempts) + " attempt(s) remaining.");
        }
        setLoading(false);
        return;
      }

      // Success — clear attempts
      setAttempts(0);
      localStorage.removeItem(ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_KEY);
      router.push("/dashboard");

    } else {
      if (!businessName.trim()) { setMsg("Business name is required."); setLoading(false); return; }
      if (!agreed) { setMsg("You must agree to the Terms of Service and Privacy Policy."); setLoading(false); return; }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setMsg(error.message); setLoading(false); return; }

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

  const inputStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid #e8e4de", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "var(--font-body)" };
  const labelStyle = { display: "block" as const, fontSize: 11, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "#888", marginBottom: 5 };
  const isLocked = lockoutUntil && Date.now() < lockoutUntil;
  const mustReset = attempts > MAX_ATTEMPTS;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <img src="/logo.png" alt="BizDoc" style={{ width: 180, height: "auto", marginBottom: 4 }} />
          <div style={{ color: "#888", fontSize: 15, marginTop: 2 }}>Business Management | Payment & Sales Records</div>
        </div>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e8e4de", overflow: "hidden" }}>
          <div style={{ display: "flex", background: "#faf9f7", borderBottom: "1px solid #e8e4de" }}>
            {(["login", "signup"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setMsg(""); }} style={{ flex: 1, padding: "14px", border: "none", background: mode === m ? "white" : "transparent", fontWeight: 700, fontSize: 14, cursor: "pointer", color: mode === m ? "var(--green)" : "#888", fontFamily: "var(--font-body)", borderBottom: mode === m ? "2px solid var(--green)" : "2px solid transparent" }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleAuth} style={{ padding: 28 }}>
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
            <div style={{ marginBottom: mode === "login" ? 8 : 24, position: "relative" }}>
              <label style={labelStyle}>Password</label>
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required style={{ ...inputStyle, paddingRight: 44 }} placeholder="••••••••" minLength={6} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: 30, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888", lineHeight: 1 }}>
                {showPw ? "🙈" : "👁"}
              </button>
            </div>

            {mode === "login" && (
              <div style={{ textAlign: "right", marginBottom: 20 }}>
                <Link href="/forgot-password" style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, textDecoration: "none" }}>Forgot password?</Link>
              </div>
            )}

            {mode === "signup" && (
              <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10 }}>
                <input type="checkbox" id="agree" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, cursor: "pointer", accentColor: "var(--green)" }} />
                <label htmlFor="agree" style={{ fontSize: 13, color: "#555", lineHeight: 1.6, cursor: "pointer" }}>
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" style={{ color: "var(--green)", fontWeight: 600 }}>Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" target="_blank" style={{ color: "var(--green)", fontWeight: 600 }}>Privacy Policy</Link>
                </label>
              </div>
            )}

            {isLocked && (
              <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#cc2222" }}>
                Account locked. Try again in <strong>{countdown}</strong> or{" "}
                <Link href="/forgot-password" style={{ color: "#cc2222", fontWeight: 700 }}>reset your password</Link>.
              </div>
            )}

            {mustReset && (
              <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#cc2222" }}>
                Too many failed attempts.{" "}
                <Link href="/forgot-password" style={{ color: "#cc2222", fontWeight: 700 }}>Reset your password</Link>{" "}to continue.
              </div>
            )}

            {msg && (
              <div style={{ background: msg.includes("created") ? "var(--green-light)" : "#fff3e0", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, color: msg.includes("created") ? "var(--green)" : "#b36000" }}>
                {msg}
                {msg.includes("reset") && <>{" "}<Link href="/forgot-password" style={{ color: "var(--green)", fontWeight: 700 }}>Reset password</Link></>}
              </div>
            )}

            <button type="submit" disabled={loading || !!isLocked} style={{ width: "100%", padding: "13px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading || isLocked ? "not-allowed" : "pointer", opacity: loading || isLocked ? 0.6 : 1, fontFamily: "var(--font-body)" }}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>

            <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#aaa" }}>
              <Link href="/faq" style={{ color: "var(--green)", fontWeight: 600, textDecoration: "none" }}>FAQ</Link>
              {" · "}
              <Link href="/terms" style={{ color: "var(--green)", fontWeight: 600, textDecoration: "none" }}>Terms</Link>
              {" · "}
              <Link href="/privacy" style={{ color: "var(--green)", fontWeight: 600, textDecoration: "none" }}>Privacy</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
