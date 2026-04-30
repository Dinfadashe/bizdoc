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
  const [mode, setMode] = useState<"login" | "signup">("signup");
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

  const scrollToAuth = (m: "login" | "signup") => {
    setMode(m);
    document.getElementById("auth-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    if (mode === "login") {
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
          setMsg("Too many failed attempts. You must reset your password to continue.");
          localStorage.removeItem(LOCKOUT_KEY);
          localStorage.removeItem(ATTEMPTS_KEY);
          setAttempts(0);
          setLockoutUntil(null);
        } else if (newAttempts >= MAX_ATTEMPTS) {
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
      setAttempts(0);
      localStorage.removeItem(ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_KEY);
      router.push("/dashboard");
    } else {
      if (!businessName.trim()) { setMsg("Business name is required."); setLoading(false); return; }
      if (!agreed) { setMsg("You must agree to the Terms and Privacy Policy."); setLoading(false); return; }
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

  const isLocked = lockoutUntil && Date.now() < lockoutUntil;
  const inp = { width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", fontSize: "15px", outline: "none", fontFamily: "inherit", color: "#fff" } as const;
  const lbl = { display: "block" as const, fontSize: "11px", fontWeight: 600 as const, textTransform: "uppercase" as const, letterSpacing: "1px", color: "rgba(255,255,255,0.45)", marginBottom: "8px" };

  return (
    <div style={{ background: "#0a1a0f", color: "#fff", fontFamily: "'DM Sans', Georgia, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap");
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: rgba(255,255,255,0.25) !important; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #1a3520 inset !important; -webkit-text-fill-color: #fff !important; }
        .nav-link { color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px; transition: color 0.2s; }
        .nav-link:hover { color: #fff; }
        .btn-gold { background: #c9a84c; color: #0a1a0f; padding: 12px 28px; border-radius: 100px; font-size: 14px; font-weight: 500; text-decoration: none; transition: all 0.2s; display: inline-block; cursor: pointer; border: none; font-family: inherit; }
        .btn-gold:hover { background: #e8c870; }
        .btn-ghost { color: rgba(255,255,255,0.7); font-size: 14px; text-decoration: none; transition: color 0.2s; }
        .btn-ghost:hover { color: #fff; }
        .feature-card { background: #0f2318; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 32px; transition: border-color 0.2s; }
        .feature-card:hover { border-color: rgba(201,168,76,0.2); }
        .step-line { position: absolute; top: 28px; left: calc(50% + 28px); right: calc(-50% + 28px); height: 1px; background: rgba(201,168,76,0.2); }
        .currency-pill { background: #0f2318; border: 1px solid rgba(255,255,255,0.08); border-radius: 100px; padding: 14px 32px; transition: all 0.2s; cursor: default; }
        .currency-pill:hover { border-color: rgba(201,168,76,0.4); }
        .tab-btn { flex: 1; padding: 14px; border: none; cursor: pointer; font-family: inherit; font-size: 15px; font-weight: 500; transition: all 0.2s; border-radius: 10px; }
        .inp-wrap { position: relative; }
        .eye-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.4); font-size: 16px; }
        .auth-input:focus { border-color: rgba(201,168,76,0.5) !important; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.6s ease forwards; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* NAV */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 60px", position: "sticky", top: 0, background: "rgba(10,26,15,0.9)", backdropFilter: "blur(12px)", zIndex: 100, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "26px", fontWeight: 700, color: "#fff" }}>Biz<span style={{ color: "#c9a84c" }}>doc</span></div>
        <div style={{ display: "flex", gap: "36px", alignItems: "center" }}>
          <a href="#features" className="nav-link">Features</a>
          <a href="#how" className="nav-link">How it works</a>
          <a href="#auth-section" className="nav-link">Pricing</a>
          <Link href="/faq" className="nav-link">FAQ</Link>
          <button onClick={() => scrollToAuth("login")} className="btn-ghost" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Sign In</button>
          <button onClick={() => scrollToAuth("signup")} className="btn-gold">Get Started Free</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: "92vh", display: "flex", alignItems: "center", padding: "80px 60px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
        <div style={{ position: "absolute", width: "700px", height: "700px", borderRadius: "50%", background: "radial-gradient(circle,rgba(42,107,69,0.15) 0%,transparent 70%)", top: "-150px", right: "-100px" }} />
        <div style={{ position: "absolute", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle,rgba(201,168,76,0.07) 0%,transparent 70%)", bottom: "0", left: "200px" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: "660px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "100px", padding: "6px 16px", fontSize: "11px", color: "#e8c870", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "32px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c9a84c", animation: "pulse 2s infinite", display: "inline-block" }} />
            Now live globally
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "76px", lineHeight: 1.02, fontWeight: 900, letterSpacing: "-2px", marginBottom: "24px" }}>
            Invoice.<br /><em style={{ fontStyle: "italic", color: "#c9a84c" }}>Get paid.</em><br />Anywhere.
          </h1>
          <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: "48px", fontWeight: 300, maxWidth: "500px" }}>
            The complete business management platform. Create professional invoices, accept payments in any currency, and auto-generate receipts — all in one place.
          </p>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <button onClick={() => scrollToAuth("signup")} className="btn-gold" style={{ fontSize: "15px", padding: "16px 40px" }}>Create Free Account</button>
            <button onClick={() => scrollToAuth("login")} className="btn-ghost" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "8px" }}>
              Sign in
              <span style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>→</span>
            </button>
          </div>
          <div style={{ display: "flex", gap: "48px", marginTop: "72px", paddingTop: "48px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            {[["100%","Auto-receipt delivery"],["4","Currencies supported"],["24h","Auto invoice expiry"]].map(([n,l]) => (
              <div key={l}><div style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", fontWeight: 700 }}>{n}</div><div style={{ fontSize: "13px", color: "rgba(138,158,143,1)", marginTop: "4px" }}>{l}</div></div>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", right: "60px", top: "50%", transform: "translateY(-50%)", width: "420px", zIndex: 1 }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "28px", backdropFilter: "blur(20px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div><div style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: 700 }}>Darshes Ventures</div><div style={{ fontSize: "11px", color: "rgba(138,158,143,1)", letterSpacing: "1px", marginTop: "4px" }}>INV-2604-X9K2</div></div>
              <div style={{ background: "rgba(61,153,96,0.2)", border: "1px solid rgba(61,153,96,0.3)", color: "#6fd89a", fontSize: "10px", padding: "4px 10px", borderRadius: "100px", letterSpacing: "1px", textTransform: "uppercase" }}>Paid</div>
            </div>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "16px 0" }} />
            {[["Web Design Services","$1,200.00"],["Brand Identity","$800.00"],["Tax (7.5%)","$150.00"]].map(([d,a]) => (
              <div key={d} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "rgba(255,255,255,0.55)", marginBottom: "10px" }}><span>{d}</span><span>{a}</span></div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "13px", color: "rgba(138,158,143,1)" }}>Total Due</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 700, color: "#c9a84c" }}>$2,150.00</span>
            </div>
            <div style={{ width: "100%", background: "#2a6b45", color: "#fff", border: "none", borderRadius: "12px", padding: "13px", fontSize: "14px", fontWeight: 500, textAlign: "center", marginTop: "18px", fontFamily: "inherit" }}>Pay Now — $2,150.00</div>
          </div>
          <div style={{ position: "absolute", bottom: "-16px", right: "-16px", background: "#0f2318", border: "1px solid rgba(61,153,96,0.3)", borderRadius: "14px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px", minWidth: "220px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(61,153,96,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>✓</div>
            <div><div style={{ fontSize: "13px", fontWeight: 500 }}>Payment received</div><div style={{ fontSize: "11px", color: "rgba(138,158,143,1)", marginTop: "2px" }}>Receipt sent automatically</div></div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: "120px 60px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: "#c9a84c", marginBottom: "16px" }}>Everything you need</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "64px" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "52px", fontWeight: 700, letterSpacing: "-1px", lineHeight: 1.1 }}>Built for businesses<br />that mean business.</h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, fontWeight: 300, maxWidth: "400px" }}>From solo freelancers to growing teams — BizDoc handles your invoicing and payments so you can focus on what you do best.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          {[
            ["⚡","Instant Payment Links","Generate secure payment links in seconds. Clients pay by card, bank transfer, or USSD — you get notified instantly."],
            ["✉","Auto Receipt Delivery","Every payment triggers an automatic, professional receipt emailed directly to your client. Zero manual work."],
            ["🌍","Multi-Currency","Invoice in NGN, USD, GBP or EUR. Accept international payments with automatic currency handling."],
            ["📊","Sales Reports","Download monthly and annual PDF or CSV reports. Track revenue, pending payments, and client breakdowns."],
            ["👥","Team Management","Invite staff to create invoices on your behalf. Role-based access keeps your financials private."],
            ["📋","Product Catalog","Save your products and services. Auto-suggest as you type for lightning-fast invoice creation."],
          ].map(([icon,title,desc]) => (
            <div key={title} className="feature-card">
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", marginBottom: "20px" }}>{icon}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: 700, marginBottom: "10px" }}>{title}</div>
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, fontWeight: 300 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "120px 60px", background: "#0f2318" }}>
        <div style={{ textAlign: "center", marginBottom: "72px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: "#c9a84c", marginBottom: "16px" }}>Simple by design</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "52px", fontWeight: 700, letterSpacing: "-1px", lineHeight: 1.1 }}>From invoice to paid<br />in four steps.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0", position: "relative" }}>
          {[
            ["01","Create invoice","Fill in client details, add line items from your catalog, set currency and due date."],
            ["02","Send to client","One click sends a professional invoice email with a secure payment link to your client."],
            ["03","Client pays","Card, bank transfer, or USSD — clients pay however works best for them."],
            ["04","Money arrives","98% goes to your bank account. Receipt auto-sent. Invoice marked paid automatically."],
          ].map(([num,title,desc], i) => (
            <div key={num} style={{ textAlign: "center", padding: "0 24px", position: "relative" }}>
              {i < 3 && <div className="step-line" />}
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", border: "1px solid rgba(201,168,76,0.3)", background: "#0f2318", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: 700, color: "#c9a84c", position: "relative", zIndex: 1 }}>{num}</div>
              <div style={{ fontSize: "16px", fontWeight: 500, marginBottom: "10px" }}>{title}</div>
              <div style={{ fontSize: "13px", color: "rgba(138,158,143,1)", lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CURRENCIES */}
      <section style={{ padding: "120px 60px", textAlign: "center" }}>
        <div style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: "#c9a84c", marginBottom: "16px" }}>Global payments</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "52px", fontWeight: 700, letterSpacing: "-1px", lineHeight: 1.1, marginBottom: "16px" }}>One platform,<br />every currency.</h2>
        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)", fontWeight: 300, marginBottom: "48px" }}>Invoice clients anywhere in the world without friction.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
          {[["₦","Nigerian Naira","NGN"],["$","US Dollar","USD"],["£","British Pound","GBP"],["€","Euro","EUR"]].map(([sym,name,code]) => (
            <div key={code} className="currency-pill">
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{sym}</div>
              <div style={{ fontSize: "13px", color: "rgba(138,158,143,1)", marginTop: "4px" }}>{name}</div>
              <div style={{ fontSize: "11px", color: "rgba(138,158,143,0.6)", letterSpacing: "1px" }}>{code}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: "120px 60px", background: "#0f2318" }}>
        <div style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: "#c9a84c", marginBottom: "16px" }}>Loved by businesses</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "52px", fontWeight: 700, letterSpacing: "-1px", lineHeight: 1.1, marginBottom: "48px" }}>What our users say.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
          {[
            ["AK","Amara Kone","Creative Director, Lagos","BizDoc completely changed how I run my business. I used to chase payments for weeks. Now receipts send themselves and money hits my account automatically."],
            ["JM","James Mensah","Software Consultant, Accra","The multi-currency feature is a game changer. I invoice UK clients in pounds and local clients in naira — all from the same dashboard."],
            ["FO","Fatima Osei","Founder, FO Interiors","I added my whole team on BizDoc. They create invoices, I see the money. The month-end reports save me hours of manual spreadsheet work."],
          ].map(([init,name,role,quote]) => (
            <div key={name} style={{ background: "#152d1e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "32px" }}>
              <div style={{ color: "#c9a84c", fontSize: "14px", letterSpacing: "2px", marginBottom: "16px" }}>★★★★★</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "17px", lineHeight: 1.65, color: "rgba(255,255,255,0.8)", fontStyle: "italic", marginBottom: "24px" }}>"{quote}"</div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#2a6b45", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 500 }}>{init}</div>
                <div><div style={{ fontSize: "14px", fontWeight: 500 }}>{name}</div><div style={{ fontSize: "12px", color: "rgba(138,158,143,1)", marginTop: "2px" }}>{role}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AUTH SECTION */}
      <section id="auth-section" style={{ padding: "120px 60px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center,rgba(42,107,69,0.12) 0%,transparent 70%)" }} />
        <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center", maxWidth: "1100px", margin: "0 auto" }}>
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: "#c9a84c", marginBottom: "16px" }}>Get started today</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "56px", fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1.05, marginBottom: "20px" }}>Ready to get<br /><em style={{ fontStyle: "italic", color: "#c9a84c" }}>paid faster?</em></h2>
            <p style={{ fontSize: "17px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, fontWeight: 300, marginBottom: "36px" }}>Join thousands of businesses using BizDoc to manage invoices and payments globally. Free to start, no credit card required.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[["⚡","Free to get started","Create your account and send your first invoice in minutes."],["🔒","Secure by design","Bank-grade security with Supabase and Paystack infrastructure."],["🌍","Works everywhere","Invoice clients in 4 currencies from anywhere in the world."]].map(([icon,title,desc]) => (
                <div key={title} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "18px", marginTop: "2px" }}>{icon}</div>
                  <div><div style={{ fontSize: "15px", fontWeight: 500, marginBottom: "3px" }}>{title}</div><div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{desc}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", overflow: "hidden" }}>
              <div style={{ display: "flex", background: "rgba(0,0,0,0.2)" }}>
                {(["signup","login"] as const).map(m => (
                  <button key={m} onClick={() => { setMode(m); setMsg(""); }} className="tab-btn" style={{ background: mode === m ? "rgba(201,168,76,0.12)" : "transparent", color: mode === m ? "#c9a84c" : "rgba(255,255,255,0.45)", borderBottom: mode === m ? "2px solid #c9a84c" : "2px solid transparent" }}>
                    {m === "login" ? "Sign In" : "Create Account"}
                  </button>
                ))}
              </div>
              <div style={{ padding: "36px" }}>
                <form onSubmit={handleAuth}>
                  {mode === "signup" && (
                    <>
                      <div style={{ marginBottom: "16px" }}>
                        <label style={lbl}>Business Name *</label>
                        <input value={businessName} onChange={e => setBusinessName(e.target.value)} required style={inp} className="auth-input" placeholder="e.g. Acme Global Ltd" />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                        <div><label style={lbl}>Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} style={inp} className="auth-input" placeholder="+1..." /></div>
                        <div><label style={lbl}>City</label><input value={address} onChange={e => setAddress(e.target.value)} style={inp} className="auth-input" placeholder="City, Country" /></div>
                      </div>
                      <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "16px 0" }} />
                    </>
                  )}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={lbl}>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} className="auth-input" placeholder="you@business.com" />
                  </div>
                  <div style={{ marginBottom: mode === "login" ? "8px" : "20px", position: "relative" }}>
                    <label style={lbl}>Password</label>
                    <div className="inp-wrap">
                      <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required style={{ ...inp, paddingRight: "44px" }} className="auth-input" placeholder="••••••••" minLength={6} />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="eye-btn">{showPw ? "🙈" : "👁"}</button>
                    </div>
                  </div>
                  {mode === "login" && (
                    <div style={{ textAlign: "right", marginBottom: "20px" }}>
                      <Link href="/forgot-password" style={{ fontSize: "12px", color: "#c9a84c", textDecoration: "none" }}>Forgot password?</Link>
                    </div>
                  )}
                  {mode === "signup" && (
                    <div style={{ marginBottom: "20px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <input type="checkbox" id="agree" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: "3px", width: "16px", height: "16px", cursor: "pointer", accentColor: "#c9a84c" }} />
                      <label htmlFor="agree" style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, cursor: "pointer" }}>
                        I agree to the <Link href="/terms" target="_blank" style={{ color: "#c9a84c" }}>Terms of Service</Link> and <Link href="/privacy" target="_blank" style={{ color: "#c9a84c" }}>Privacy Policy</Link>
                      </label>
                    </div>
                  )}
                  {isLocked && (
                    <div style={{ background: "rgba(204,34,34,0.1)", border: "1px solid rgba(204,34,34,0.2)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#ff8a8a" }}>
                      Account locked. Try again in <strong>{countdown}</strong> or <Link href="/forgot-password" style={{ color: "#ff8a8a", fontWeight: 700 }}>reset your password</Link>.
                    </div>
                  )}
                  {msg && (
                    <div style={{ background: msg.includes("created") ? "rgba(42,107,69,0.15)" : "rgba(201,168,76,0.1)", border: msg.includes("created") ? "1px solid rgba(42,107,69,0.3)" : "1px solid rgba(201,168,76,0.2)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: msg.includes("created") ? "#6fd89a" : "#e8c870" }}>
                      {msg}
                    </div>
                  )}
                  <button type="submit" disabled={loading || !!isLocked} style={{ width: "100%", padding: "14px", background: "#c9a84c", color: "#0a1a0f", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 500, cursor: loading || isLocked ? "not-allowed" : "pointer", opacity: loading || isLocked ? 0.6 : 1, fontFamily: "inherit", letterSpacing: "0.2px" }}>
                    {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Free Account"}
                  </button>
                  <div style={{ textAlign: "center", marginTop: "20px", fontSize: "12px", color: "rgba(138,158,143,1)" }}>
                    <Link href="/faq" style={{ color: "#c9a84c", textDecoration: "none" }}>FAQ</Link>
                    {" · "}
                    <Link href="/terms" style={{ color: "#c9a84c", textDecoration: "none" }}>Terms</Link>
                    {" · "}
                    <Link href="/privacy" style={{ color: "#c9a84c", textDecoration: "none" }}>Privacy</Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 60px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", fontWeight: 700 }}>Biz<span style={{ color: "#c9a84c" }}>doc</span></div>
        <div style={{ display: "flex", gap: "32px" }}>
          <Link href="/terms" style={{ color: "rgba(138,158,143,1)", textDecoration: "none", fontSize: "13px" }}>Terms</Link>
          <Link href="/privacy" style={{ color: "rgba(138,158,143,1)", textDecoration: "none", fontSize: "13px" }}>Privacy</Link>
          <Link href="/faq" style={{ color: "rgba(138,158,143,1)", textDecoration: "none", fontSize: "13px" }}>FAQ</Link>
          <a href="https://bizdoc.charitytoken.net" style={{ color: "rgba(138,158,143,1)", textDecoration: "none", fontSize: "13px" }}>App</a>
        </div>
        <div style={{ fontSize: "12px", color: "rgba(138,158,143,1)" }}>© 2026 BizDoc · Powered by Charity Token</div>
      </footer>
    </div>
  );
}