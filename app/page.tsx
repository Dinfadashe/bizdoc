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
  const [menuOpen, setMenuOpen] = useState(false);
  const [referralCode, setReferralCode] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) setReferralCode(ref);
  }, []);

  useEffect(() => {
    const sl = localStorage.getItem(LOCKOUT_KEY);
    const sa = localStorage.getItem(ATTEMPTS_KEY);
    if (sl) setLockoutUntil(Number(sl));
    if (sa) setAttempts(Number(sa));
  }, []);

  useEffect(() => {
    if (!lockoutUntil) return;
    const iv = setInterval(() => {
      const r = lockoutUntil - Date.now();
      if (r <= 0) { setLockoutUntil(null); setCountdown(""); localStorage.removeItem(LOCKOUT_KEY); }
      else { const m = Math.floor(r/60000); const s = Math.floor((r%60000)/1000); setCountdown(m+"m "+s+"s"); }
    }, 1000);
    return () => clearInterval(iv);
  }, [lockoutUntil]);

  const scrollTo = (id: string, m: "login"|"signup") => {
    setMode(m); setMenuOpen(false);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMsg("");
    if (mode === "login") {
      if (lockoutUntil && Date.now() < lockoutUntil) { setMsg("Account locked. Wait "+countdown+" or reset password."); setLoading(false); return; }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const na = attempts + 1; setAttempts(na); localStorage.setItem(ATTEMPTS_KEY, String(na));
        if (na >= MAX_ATTEMPTS + 1) { setMsg("Too many attempts. Reset your password to continue."); localStorage.removeItem(LOCKOUT_KEY); localStorage.removeItem(ATTEMPTS_KEY); setAttempts(0); setLockoutUntil(null); }
        else if (na >= MAX_ATTEMPTS) { const u = Date.now()+LOCKOUT_MINS*60000; setLockoutUntil(u); localStorage.setItem(LOCKOUT_KEY, String(u)); setMsg("Account locked for "+LOCKOUT_MINS+" minutes."); }
        else { setMsg("Wrong password. "+(MAX_ATTEMPTS-na)+" attempt(s) left."); }
        setLoading(false); return;
      }
      setAttempts(0); localStorage.removeItem(ATTEMPTS_KEY); localStorage.removeItem(LOCKOUT_KEY);
      router.push("/dashboard");
    } else {
      if (!businessName.trim()) { setMsg("Business name is required."); setLoading(false); return; }
      if (!agreed) { setMsg("Please agree to Terms and Privacy Policy."); setLoading(false); return; }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setMsg(error.message); setLoading(false); return; }
      if (data.user) {
        await supabase.from("businesses").insert({ user_id: data.user.id, name: businessName, email, phone, address, currency: "NGN", onboarding_complete: false });
        // Apply referral if present
        if (referralCode) {
          await fetch("/api/referral", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ referral_code: referralCode, business_user_id: data.user.id, business_email: email }) }).catch(() => {});
        }
      }
      setMsg("Account created! Check your email to confirm, then sign in.");
    }
    setLoading(false);
  };

  const isLocked = lockoutUntil && Date.now() < lockoutUntil;

  return (
    <div style={{ background: "#0a1a0f", color: "#fff", fontFamily: "Georgia, serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif}
        ::placeholder{color:rgba(255,255,255,0.25)!important}
        input:-webkit-autofill{-webkit-box-shadow:0 0 0 100px #1a3520 inset!important;-webkit-text-fill-color:#fff!important}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .playfair{font-family:'Playfair Display',serif}
        .gold{color:#c9a84c}
        .muted{color:rgba(138,158,143,1)}
        .btn-gold{display:inline-block;background:#c9a84c;color:#0a1a0f;border:none;border-radius:100px;font-family:'DM Sans',sans-serif;font-weight:500;cursor:pointer;transition:background 0.2s;text-decoration:none}
        .btn-gold:hover{background:#e8c870}
        .btn-ghost{background:none;border:none;color:rgba(255,255,255,0.65);font-family:'DM Sans',sans-serif;cursor:pointer;text-decoration:none;transition:color 0.2s}
        .btn-ghost:hover{color:#fff}
        .nav-a{color:rgba(255,255,255,0.6);text-decoration:none;font-size:14px;font-family:'DM Sans',sans-serif;transition:color 0.2s}
        .nav-a:hover{color:#fff}
        .fcard{background:#0f2318;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:28px;transition:border-color 0.2s}
        .fcard:hover{border-color:rgba(201,168,76,0.25)}
        .tcard{background:#152d1e;border:1px solid rgba(255,255,255,0.06);border-radius:20px;padding:28px}
        .cpill{background:#0f2318;border:1px solid rgba(255,255,255,0.08);border-radius:100px;padding:14px 28px;text-align:center;transition:border-color 0.2s;cursor:default}
        .cpill:hover{border-color:rgba(201,168,76,0.4)}
        .auth-inp{width:100%;padding:12px 16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:10px;font-size:15px;outline:none;font-family:'DM Sans',sans-serif;color:#fff;transition:border-color 0.2s}
        .auth-inp:focus{border-color:rgba(201,168,76,0.5)}
        .tab-btn{flex:1;padding:14px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;transition:all 0.2s}
        .mobile-menu{display:none;flex-direction:column;gap:16px;padding:20px 20px;background:#0f2318;border-top:1px solid rgba(255,255,255,0.06)}
        @media(max-width:768px){
          .mobile-menu.open{display:flex}
          .desktop-nav{display:none!important}
          .hamburger{display:flex!important}
          .hero-grid{flex-direction:column!important}
          .hero-visual{display:none!important}
          .hero-h1{font-size:44px!important;letter-spacing:-1px!important}
          .hero-actions{flex-direction:column!important;align-items:stretch!important}
          .hero-actions a,.hero-actions button{text-align:center!important;justify-content:center!important}
          .hero-stats{gap:20px!important;flex-wrap:wrap!important}
          .sec-pad{padding:60px 20px!important}
          .sec-h2{font-size:34px!important;letter-spacing:-0.5px!important}
          .feat-grid{grid-template-columns:1fr!important}
          .how-grid{grid-template-columns:1fr 1fr!important;gap:24px!important}
          .step-connector{display:none!important}
          .cur-grid{gap:10px!important}
          .test-grid{grid-template-columns:1fr!important}
          .auth-grid{grid-template-columns:1fr!important;gap:32px!important}
          .auth-cta-h{font-size:38px!important}
          .footer-inner{flex-direction:column!important;gap:20px!important;text-align:center!important}
          .footer-links{justify-content:center!important;flex-wrap:wrap!important}
          .sec-header{flex-direction:column!important;gap:20px!important;align-items:flex-start!important}
          .nav-pad{padding:16px 20px!important}
        }
        @media(max-width:480px){
          .hero-h1{font-size:34px!important}
          .sec-h2{font-size:28px!important}
          .how-grid{grid-template-columns:1fr!important}
          .auth-cta-h{font-size:30px!important}
          .cpill{padding:10px 18px!important}
        }
      `}</style>

      {/* NAV */}
      <nav style={{position:"sticky",top:0,background:"rgba(10,26,15,0.95)",backdropFilter:"blur(12px)",zIndex:100,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div className="nav-pad" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 60px"}}>
          <div className="playfair" style={{fontSize:"26px",fontWeight:700}}>Biz<span className="gold">doc</span></div>
          <div className="desktop-nav" style={{display:"flex",gap:"32px",alignItems:"center"}}>
            <a href="#features" className="nav-a">Features</a>
            <a href="#how" className="nav-a">How it works</a>
            <Link href="/faq" className="nav-a">FAQ</Link>
            <button onClick={() => scrollTo("auth-section","login")} className="btn-ghost" style={{fontSize:"14px"}}>Sign In</button>
            <button onClick={() => scrollTo("auth-section","signup")} className="btn-gold" style={{padding:"10px 24px",fontSize:"14px"}}>Get Started Free</button>
          </div>
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} style={{display:"none",background:"none",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",padding:"8px 12px",borderRadius:"8px",cursor:"pointer",fontSize:"18px",fontFamily:"sans-serif"}}>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
        <div className={"mobile-menu" + (menuOpen ? " open" : "")}>
          <a href="#features" className="nav-a" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#how" className="nav-a" onClick={() => setMenuOpen(false)}>How it works</a>
          <Link href="/faq" className="nav-a" onClick={() => setMenuOpen(false)}>FAQ</Link>
          <button onClick={() => scrollTo("auth-section","login")} className="btn-ghost" style={{fontSize:"15px",textAlign:"left"}}>Sign In</button>
          <button onClick={() => scrollTo("auth-section","signup")} className="btn-gold" style={{padding:"12px 24px",fontSize:"15px",textAlign:"center",borderRadius:"10px"}}>Get Started Free</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="sec-pad hero-grid" style={{padding:"80px 60px",display:"flex",alignItems:"center",gap:"40px",position:"relative",overflow:"hidden",minHeight:"88vh"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",backgroundSize:"60px 60px"}} />
        <div style={{position:"absolute",width:"600px",height:"600px",borderRadius:"50%",background:"radial-gradient(circle,rgba(42,107,69,0.15) 0%,transparent 70%)",top:"-100px",right:"-50px"}} />
        <div style={{position:"relative",zIndex:1,flex:1,maxWidth:"640px"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:"8px",background:"rgba(201,168,76,0.1)",border:"1px solid rgba(201,168,76,0.25)",borderRadius:"100px",padding:"6px 16px",fontSize:"11px",color:"#e8c870",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:"28px"}}>
            <span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#c9a84c",animation:"pulse 2s infinite",display:"inline-block"}} />
            Now live globally
          </div>
          <h1 className="playfair hero-h1" style={{fontSize:"72px",lineHeight:1.04,fontWeight:900,letterSpacing:"-2px",marginBottom:"20px"}}>
            Invoice.<br /><em style={{fontStyle:"italic",color:"#c9a84c"}}>Get paid.</em><br />Anywhere.
          </h1>
          <p style={{fontSize:"17px",color:"rgba(255,255,255,0.55)",lineHeight:1.7,marginBottom:"36px",fontWeight:300,fontFamily:"'DM Sans',sans-serif"}}>
            The complete business management platform. Create professional invoices, accept payments in any currency, and auto-generate receipts.
          </p>
          <div className="hero-actions" style={{display:"flex",gap:"14px",alignItems:"center",flexWrap:"wrap"}}>
            <button onClick={() => scrollTo("auth-section","signup")} className="btn-gold" style={{padding:"15px 36px",fontSize:"15px",borderRadius:"100px"}}>Create Free Account</button>
            <button onClick={() => scrollTo("auth-section","login")} className="btn-ghost" style={{fontSize:"15px",display:"flex",alignItems:"center",gap:"8px"}}>
              Sign in <span style={{width:"30px",height:"30px",borderRadius:"50%",border:"1px solid rgba(255,255,255,0.2)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:"13px"}}>→</span>
            </button>
          </div>
          <div className="hero-stats" style={{display:"flex",gap:"40px",marginTop:"56px",paddingTop:"40px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
            {[["100%","Auto-receipt delivery"],["4","Currencies supported"],["24h","Auto invoice expiry"]].map(([n,l]) => (
              <div key={l}><div className="playfair" style={{fontSize:"34px",fontWeight:700}}>{n}</div><div className="muted" style={{fontSize:"12px",marginTop:"4px",fontFamily:"'DM Sans',sans-serif"}}>{l}</div></div>
            ))}
          </div>
        </div>
        <div className="hero-visual" style={{flex:"0 0 400px",position:"relative"}}>
          <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"20px",padding:"26px",backdropFilter:"blur(20px)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"18px"}}>
              <div><div className="playfair" style={{fontSize:"17px",fontWeight:700}}>Darshes Ventures</div><div className="muted" style={{fontSize:"11px",letterSpacing:"1px",marginTop:"3px",fontFamily:"'DM Sans',sans-serif"}}>INV-2604-X9K2</div></div>
              <div style={{background:"rgba(61,153,96,0.2)",border:"1px solid rgba(61,153,96,0.3)",color:"#6fd89a",fontSize:"10px",padding:"3px 10px",borderRadius:"100px",letterSpacing:"1px",textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>Paid</div>
            </div>
            <div style={{height:"1px",background:"rgba(255,255,255,0.06)",margin:"14px 0"}} />
            {[["Web Design Services","$1,200.00"],["Brand Identity","$800.00"],["Tax (7.5%)","$150.00"]].map(([d,a]) => (
              <div key={d} style={{display:"flex",justifyContent:"space-between",fontSize:"13px",color:"rgba(255,255,255,0.5)",marginBottom:"9px",fontFamily:"'DM Sans',sans-serif"}}><span>{d}</span><span>{a}</span></div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
              <span className="muted" style={{fontSize:"13px",fontFamily:"'DM Sans',sans-serif"}}>Total Due</span>
              <span className="playfair gold" style={{fontSize:"26px",fontWeight:700}}>$2,150.00</span>
            </div>
            <div style={{width:"100%",background:"#2a6b45",color:"#fff",borderRadius:"10px",padding:"12px",fontSize:"14px",fontWeight:500,textAlign:"center",marginTop:"16px",fontFamily:"'DM Sans',sans-serif"}}>Pay Now — $2,150.00</div>
          </div>
          <div style={{position:"absolute",bottom:"-12px",right:"-12px",background:"#0f2318",border:"1px solid rgba(61,153,96,0.3)",borderRadius:"14px",padding:"12px 16px",display:"flex",alignItems:"center",gap:"10px",minWidth:"200px"}}>
            <div style={{width:"30px",height:"30px",borderRadius:"50%",background:"rgba(61,153,96,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",flexShrink:0}}>✓</div>
            <div style={{fontFamily:"'DM Sans',sans-serif"}}><div style={{fontSize:"13px",fontWeight:500}}>Payment received</div><div className="muted" style={{fontSize:"11px",marginTop:"2px"}}>Receipt sent automatically</div></div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="sec-pad" style={{padding:"100px 60px"}}>
        <div className="sec-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:"56px",gap:"20px"}}>
          <div>
            <div style={{fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase",color:"#c9a84c",marginBottom:"12px",fontFamily:"'DM Sans',sans-serif"}}>Everything you need</div>
            <h2 className="playfair sec-h2" style={{fontSize:"48px",fontWeight:700,letterSpacing:"-1px",lineHeight:1.1}}>Built for businesses<br />that mean business.</h2>
          </div>
          <p style={{fontSize:"15px",color:"rgba(255,255,255,0.5)",lineHeight:1.7,fontWeight:300,maxWidth:"360px",fontFamily:"'DM Sans',sans-serif"}}>From solo freelancers to growing teams — BizDoc handles your invoicing and payments.</p>
        </div>
        <div className="feat-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"14px"}}>
          {[
            ["⚡","Instant Payment Links","Generate secure payment links in seconds. Clients pay by card, bank transfer, or USSD."],
            ["✉️","Auto Receipt Delivery","Every payment triggers an automatic professional receipt emailed to your client."],
            ["🌍","Multi-Currency","Invoice in NGN, USD, GBP or EUR. Accept international payments seamlessly."],
            ["📊","Sales Reports","Download monthly and annual PDF or CSV reports with full revenue breakdowns."],
            ["👥","Team Management","Invite staff to create invoices. Role-based access keeps financials private."],
            ["📋","Product Catalog","Save products and services with prices. Auto-suggest as you type on new invoices."],
          ].map(([icon,title,desc]) => (
            <div key={title} className="fcard">
              <div style={{width:"46px",height:"46px",borderRadius:"12px",background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",marginBottom:"18px"}}>
                {icon}
              </div>
              <div className="playfair" style={{fontSize:"19px",fontWeight:700,marginBottom:"10px"}}>{title}</div>
              <div style={{fontSize:"14px",color:"rgba(255,255,255,0.45)",lineHeight:1.7,fontWeight:300,fontFamily:"'DM Sans',sans-serif"}}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="sec-pad" style={{padding:"100px 60px",background:"#0f2318"}}>
        <div style={{textAlign:"center",marginBottom:"64px"}}>
          <div style={{fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase",color:"#c9a84c",marginBottom:"12px",fontFamily:"'DM Sans',sans-serif"}}>Simple by design</div>
          <h2 className="playfair sec-h2" style={{fontSize:"48px",fontWeight:700,letterSpacing:"-1px",lineHeight:1.1}}>From invoice to paid<br />in four steps.</h2>
        </div>
        <div className="how-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"0",position:"relative"}}>
          {[["01","Create invoice","Fill in client details, add line items from your catalog, set currency and due date."],["02","Send to client","One click sends a professional invoice email with a secure payment link."],["03","Client pays","Card, bank transfer, or USSD — clients pay however works best for them."],["04","Money arrives","98% goes to your bank. Receipt auto-sent. Invoice marked paid automatically."]].map(([num,title,desc],i) => (
            <div key={num} style={{textAlign:"center",padding:"0 20px",position:"relative"}}>
              {i < 3 && <div className="step-connector" style={{position:"absolute",top:"28px",left:"calc(50% + 28px)",right:"calc(-50% + 28px)",height:"1px",background:"rgba(201,168,76,0.2)"}} />}
              <div className="playfair gold" style={{width:"56px",height:"56px",borderRadius:"50%",border:"1px solid rgba(201,168,76,0.3)",background:"#0f2318",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:"20px",fontWeight:700,position:"relative",zIndex:1}}>{num}</div>
              <div style={{fontSize:"15px",fontWeight:500,marginBottom:"10px",fontFamily:"'DM Sans',sans-serif"}}>{title}</div>
              <div className="muted" style={{fontSize:"13px",lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CURRENCIES */}
      <section className="sec-pad" style={{padding:"100px 60px",textAlign:"center"}}>
        <div style={{fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase",color:"#c9a84c",marginBottom:"12px",fontFamily:"'DM Sans',sans-serif"}}>Global payments</div>
        <h2 className="playfair sec-h2" style={{fontSize:"48px",fontWeight:700,letterSpacing:"-1px",lineHeight:1.1,marginBottom:"14px"}}>One platform,<br />every currency.</h2>
        <p className="muted" style={{fontSize:"15px",fontWeight:300,marginBottom:"40px",fontFamily:"'DM Sans',sans-serif"}}>Invoice clients anywhere in the world without friction.</p>
        <div className="cur-grid" style={{display:"flex",justifyContent:"center",gap:"14px",flexWrap:"wrap"}}>
          {[["₦","Nigerian Naira","NGN"],["$","US Dollar","USD"],["£","British Pound","GBP"],["€","Euro","EUR"]].map(([sym,name,code]) => (
            <div key={code} className="cpill">
              <div className="playfair" style={{fontSize:"26px",fontWeight:700,color:"rgba(255,255,255,0.85)"}}>{sym}</div>
              <div style={{fontSize:"13px",color:"rgba(138,158,143,1)",marginTop:"4px",fontFamily:"'DM Sans',sans-serif"}}>{name}</div>
              <div style={{fontSize:"10px",color:"rgba(138,158,143,0.6)",letterSpacing:"1px",fontFamily:"'DM Sans',sans-serif"}}>{code}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="sec-pad" style={{padding:"100px 60px",background:"#0f2318"}}>
        <div style={{fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase",color:"#c9a84c",marginBottom:"12px",fontFamily:"'DM Sans',sans-serif"}}>Loved by businesses</div>
        <h2 className="playfair sec-h2" style={{fontSize:"48px",fontWeight:700,letterSpacing:"-1px",lineHeight:1.1,marginBottom:"40px"}}>What our users say.</h2>
        <div className="test-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"20px"}}>
          {[
            ["AK","Amara Kone","Creative Director, Lagos","BizDoc completely changed how I run my business. Receipts send themselves and money hits my account automatically."],
            ["JM","James Mensah","Software Consultant, Accra","The multi-currency feature is a game changer. I invoice UK clients in pounds and local clients in naira from one dashboard."],
            ["FO","Fatima Osei","Founder, FO Interiors","I added my whole team on BizDoc. They create invoices, I see the money. Month-end reports save hours of spreadsheet work."],
          ].map(([init,name,role,quote]) => (
            <div key={name} className="tcard">
              <div style={{color:"#c9a84c",fontSize:"13px",letterSpacing:"2px",marginBottom:"14px"}}>★★★★★</div>
              <div className="playfair" style={{fontSize:"16px",lineHeight:1.65,color:"rgba(255,255,255,0.8)",fontStyle:"italic",marginBottom:"20px"}}>"{quote}"</div>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{width:"38px",height:"38px",borderRadius:"50%",background:"#2a6b45",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:500,fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>{init}</div>
                <div style={{fontFamily:"'DM Sans',sans-serif"}}><div style={{fontSize:"14px",fontWeight:500}}>{name}</div><div className="muted" style={{fontSize:"12px",marginTop:"2px"}}>{role}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AUTH */}
      <section id="auth-section" className="sec-pad" style={{padding:"100px 60px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at center,rgba(42,107,69,0.1) 0%,transparent 70%)"}} />
        <div className="auth-grid" style={{position:"relative",zIndex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"72px",alignItems:"center",maxWidth:"1060px",margin:"0 auto"}}>
          <div>
            <div style={{fontSize:"11px",letterSpacing:"2px",textTransform:"uppercase",color:"#c9a84c",marginBottom:"12px",fontFamily:"'DM Sans',sans-serif"}}>Get started today</div>
            <h2 className="playfair auth-cta-h" style={{fontSize:"52px",fontWeight:900,letterSpacing:"-1.5px",lineHeight:1.05,marginBottom:"18px"}}>Ready to get<br /><em style={{fontStyle:"italic",color:"#c9a84c"}}>paid faster?</em></h2>
            <p className="muted" style={{fontSize:"16px",lineHeight:1.7,fontWeight:300,marginBottom:"32px",fontFamily:"'DM Sans',sans-serif"}}>Join thousands of businesses using BizDoc to manage invoices and payments globally. Free to start, no credit card required.</p>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              {[["⚡","Free to get started","Create your account and send your first invoice in minutes."],["🔒","Secure by design","Bank-grade security with Supabase and Paystack infrastructure."],["🌍","Works everywhere","Invoice clients in 4 currencies from anywhere in the world."]].map(([icon,title,desc]) => (
                <div key={title} style={{display:"flex",gap:"12px",alignItems:"flex-start"}}>
                  <span style={{fontSize:"18px",marginTop:"2px"}}>{icon}</span>
                  <div style={{fontFamily:"'DM Sans',sans-serif"}}><div style={{fontSize:"14px",fontWeight:500,marginBottom:"3px"}}>{title}</div><div className="muted" style={{fontSize:"13px",lineHeight:1.5}}>{desc}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"24px",overflow:"hidden"}}>
            <div style={{display:"flex",background:"rgba(0,0,0,0.2)"}}>
              {(["signup","login"] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setMsg(""); }} className="tab-btn" style={{background:mode===m?"rgba(201,168,76,0.1)":"transparent",color:mode===m?"#c9a84c":"rgba(255,255,255,0.45)",borderBottom:mode===m?"2px solid #c9a84c":"2px solid transparent"}}>
                  {m==="login"?"Sign In":"Create Account"}
                </button>
              ))}
            </div>
            <div style={{padding:"32px"}}>
              <form onSubmit={handleAuth}>
                {mode==="signup" && (
                  <>
                    <div style={{marginBottom:"14px"}}>
                      <label style={{display:"block",fontSize:"11px",fontWeight:600,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.4)",marginBottom:"7px",fontFamily:"'DM Sans',sans-serif"}}>Business Name *</label>
                      <input value={businessName} onChange={e=>setBusinessName(e.target.value)} required className="auth-inp" placeholder="e.g. Acme Global Ltd" />
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
                      <div>
                        <label style={{display:"block",fontSize:"11px",fontWeight:600,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.4)",marginBottom:"7px",fontFamily:"'DM Sans',sans-serif"}}>Phone</label>
                        <input value={phone} onChange={e=>setPhone(e.target.value)} className="auth-inp" placeholder="+1..." />
                      </div>
                      <div>
                        <label style={{display:"block",fontSize:"11px",fontWeight:600,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.4)",marginBottom:"7px",fontFamily:"'DM Sans',sans-serif"}}>City</label>
                        <input value={address} onChange={e=>setAddress(e.target.value)} className="auth-inp" placeholder="City, Country" />
                      </div>
                    </div>
                    <div style={{height:"1px",background:"rgba(255,255,255,0.06)",margin:"14px 0"}} />
                  </>
                )}
                <div style={{marginBottom:"14px"}}>
                  <label style={{display:"block",fontSize:"11px",fontWeight:600,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.4)",marginBottom:"7px",fontFamily:"'DM Sans',sans-serif"}}>Email</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="auth-inp" placeholder="you@business.com" />
                </div>
                <div style={{marginBottom:mode==="login"?"6px":"16px"}}>
                  <label style={{display:"block",fontSize:"11px",fontWeight:600,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.4)",marginBottom:"7px",fontFamily:"'DM Sans',sans-serif"}}>Password</label>
                  <div style={{position:"relative"}}>
                    <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} required className="auth-inp" placeholder="••••••••" minLength={6} style={{paddingRight:"44px"}} />
                    <button type="button" onClick={()=>setShowPw(!showPw)} style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.4)",fontSize:"15px"}}>{showPw?"🙈":"👁"}</button>
                  </div>
                </div>
                {mode==="login" && (
                  <div style={{textAlign:"right",marginBottom:"16px"}}>
                    <Link href="/forgot-password" style={{fontSize:"12px",color:"#c9a84c",textDecoration:"none",fontFamily:"'DM Sans',sans-serif"}}>Forgot password?</Link>
                  </div>
                )}
                {mode==="signup" && (
                  <div style={{marginBottom:"16px",display:"flex",alignItems:"flex-start",gap:"10px"}}>
                    <input type="checkbox" id="agree" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{marginTop:"3px",width:"15px",height:"15px",cursor:"pointer",accentColor:"#c9a84c",flexShrink:0}} />
                    <label htmlFor="agree" style={{fontSize:"13px",color:"rgba(255,255,255,0.5)",lineHeight:1.6,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                      I agree to the <Link href="/terms" target="_blank" style={{color:"#c9a84c"}}>Terms</Link> and <Link href="/privacy" target="_blank" style={{color:"#c9a84c"}}>Privacy Policy</Link>
                    </label>
                  </div>
                )}
                {isLocked && (
                  <div style={{background:"rgba(204,34,34,0.1)",border:"1px solid rgba(204,34,34,0.2)",borderRadius:"10px",padding:"11px 14px",marginBottom:"14px",fontSize:"13px",color:"#ff8a8a",fontFamily:"'DM Sans',sans-serif"}}>
                    Locked. Wait <strong>{countdown}</strong> or <Link href="/forgot-password" style={{color:"#ff8a8a",fontWeight:700}}>reset password</Link>.
                  </div>
                )}
                {msg && (
                  <div style={{background:msg.includes("created")?"rgba(42,107,69,0.15)":"rgba(201,168,76,0.1)",border:msg.includes("created")?"1px solid rgba(42,107,69,0.3)":"1px solid rgba(201,168,76,0.2)",borderRadius:"10px",padding:"11px 14px",marginBottom:"14px",fontSize:"13px",color:msg.includes("created")?"#6fd89a":"#e8c870",fontFamily:"'DM Sans',sans-serif"}}>
                    {msg}
                  </div>
                )}
                <button type="submit" disabled={loading||!!isLocked} style={{width:"100%",padding:"14px",background:"#c9a84c",color:"#0a1a0f",border:"none",borderRadius:"12px",fontSize:"15px",fontWeight:500,cursor:loading||isLocked?"not-allowed":"pointer",opacity:loading||isLocked?0.6:1,fontFamily:"'DM Sans',sans-serif",letterSpacing:"0.2px"}}>
                  {loading?"Please wait...":mode==="login"?"Sign In":"Create Free Account"}
                </button>
                <div style={{textAlign:"center",marginTop:"16px",fontSize:"12px",color:"rgba(138,158,143,1)",fontFamily:"'DM Sans',sans-serif"}}>
                  <Link href="/faq" style={{color:"#c9a84c",textDecoration:"none"}}>FAQ</Link>{" · "}
                  <Link href="/terms" style={{color:"#c9a84c",textDecoration:"none"}}>Terms</Link>{" · "}
                  <Link href="/privacy" style={{color:"#c9a84c",textDecoration:"none"}}>Privacy</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"40px 60px"}}>
        <div className="footer-inner" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div className="playfair" style={{fontSize:"22px",fontWeight:700}}>Biz<span className="gold">doc</span></div>
          <div className="footer-links" style={{display:"flex",gap:"28px"}}>
            <Link href="/terms" style={{color:"rgba(138,158,143,1)",textDecoration:"none",fontSize:"13px",fontFamily:"'DM Sans',sans-serif"}}>Terms</Link>
            <Link href="/privacy" style={{color:"rgba(138,158,143,1)",textDecoration:"none",fontSize:"13px",fontFamily:"'DM Sans',sans-serif"}}>Privacy</Link>
            <Link href="/faq" style={{color:"rgba(138,158,143,1)",textDecoration:"none",fontSize:"13px",fontFamily:"'DM Sans',sans-serif"}}>FAQ</Link>
          </div>
          <div style={{fontSize:"12px",color:"rgba(138,158,143,1)",fontFamily:"'DM Sans',sans-serif"}}>© 2026 BizDoc · Powered by Charity Token</div>
        </div>
      </footer>
    </div>
  );
}