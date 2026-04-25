"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Bank { name: string; code: string; }

export default function Settings() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [bizId, setBizId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"profile" | "payouts">("profile");
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", currency: "NGN", logo_url: "" });
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [subaccountCode, setSubaccountCode] = useState("");
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutSaved, setPayoutSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return; }
      setUserId(data.user.id);
      const { data: biz } = await supabase.from("businesses").select("*").eq("user_id", data.user.id).single();
      if (biz) {
        setBizId(biz.id);
        setForm({ name: biz.name ?? "", email: biz.email ?? "", phone: biz.phone ?? "", address: biz.address ?? "", currency: biz.currency ?? "NGN", logo_url: biz.logo_url ?? "" });
        setBankCode(biz.bank_code ?? "");
        setBankName(biz.bank_name ?? "");
        setAccountNumber(biz.account_number ?? "");
        setAccountName(biz.account_name ?? "");
        setSubaccountCode(biz.subaccount_code ?? "");
        setOnboardingComplete(biz.onboarding_complete ?? false);
      }
    });
    fetch("/api/banks").then(r => r.json()).then(d => setBanks(d.banks ?? [])).catch(() => {});
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    if (bizId) {
      await supabase.from("businesses").update(form).eq("id", bizId);
    } else {
      const { data } = await supabase.from("businesses").insert({ ...form, user_id: userId }).select().single();
      if (data) setBizId(data.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  useEffect(() => {
    if (accountNumber.length === 10 && bankCode) {
      setResolving(true);
      setResolveError("");
      setAccountName("");
      fetch(`/api/banks/resolve?account_number=${accountNumber}&bank_code=${bankCode}`)
        .then(r => r.json())
        .then(d => {
          if (d.account_name) setAccountName(d.account_name);
          else setResolveError(d.error ?? "Could not verify account");
        })
        .catch(() => setResolveError("Could not verify account"))
        .finally(() => setResolving(false));
    }
  }, [accountNumber, bankCode]);

  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !accountName) return;
    setSavingPayout(true);
    const res = await fetch("/api/subaccount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, business_name: form.name, bank_code: bankCode, bank_name: bankName, account_number: accountNumber }),
    });
    const data = await res.json();
    setSavingPayout(false);
    if (data.subaccount_code) {
      setSubaccountCode(data.subaccount_code);
      setOnboardingComplete(true);
      setPayoutSaved(true);
      setTimeout(() => setPayoutSaved(false), 3000);
    } else {
      setResolveError(data.error ?? "Failed to set up payouts");
    }
  };

  const inputStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "var(--font-body)" };
  const labelStyle = { display: "block" as const, fontSize: 11, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <nav style={{ background: "var(--green)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/dashboard"><button style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20 }}>←</button></Link>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white" }}>Settings</div>
      </nav>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ display: "flex", background: "#e8e4de", borderRadius: 10, padding: 4, gap: 4, marginBottom: 24 }}>
          {(["profile", "payouts"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "var(--font-body)", background: tab === t ? "white" : "transparent", color: tab === t ? "var(--green)" : "var(--muted)", boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none", textTransform: "capitalize" }}>
              {t === "payouts" ? "💳 Payout Account" : "🏢 Business Profile"}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ padding: "14px 24px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Business Profile</div>
            <form onSubmit={handleSaveProfile} style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div><label style={labelStyle}>Business Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} required /></div>
                <div><label style={labelStyle}>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Default Currency</label>
                  <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={inputStyle}>
                    {["NGN", "USD", "GBP", "EUR"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}><label style={labelStyle}>Address</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inputStyle} /></div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Logo URL</label>
                <input value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} style={inputStyle} placeholder="https://..." />
                {form.logo_url && <img src={form.logo_url} alt="logo" style={{ marginTop: 10, width: 60, height: 60, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border)" }} />}
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button type="submit" disabled={saving} style={{ padding: "11px 28px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving..." : "Save Profile"}
                </button>
                {saved && <span style={{ color: "var(--green)", fontSize: 14, fontWeight: 600 }}>✓ Saved!</span>}
              </div>
            </form>
          </div>
        )}

        {tab === "payouts" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ padding: "14px 24px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Payout Account</div>
            {onboardingComplete && (
              <div style={{ margin: 24, background: "var(--green-light)", border: "1px solid #b8dfc9", borderRadius: 10, padding: "16px 20px" }}>
                <div style={{ fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>✅ Payout account connected</div>
                <div style={{ fontSize: 13, color: "#2e7d52" }}>{accountName} · {bankName} · ****{accountNumber.slice(-4)}</div>
                <div style={{ fontSize: 12, color: "#2e7d52", marginTop: 4, fontFamily: "monospace" }}>Subaccount: {subaccountCode}</div>
              </div>
            )}
            <form onSubmit={handleSavePayout} style={{ padding: 24 }}>
              <div style={{ background: "#fff8e8", border: "1px solid #f0d080", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#7a5500" }}>
                💡 Invoice payments go directly to this bank account. Platform deducts <strong>2%</strong> automatically.
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Bank</label>
                <select value={bankCode} onChange={e => { const s = banks.find(b => b.code === e.target.value); setBankCode(e.target.value); setBankName(s?.name ?? ""); setAccountName(""); }} style={inputStyle} required>
                  <option value="">Select your bank...</option>
                  {banks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Account Number</label>
                <input value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} style={inputStyle} placeholder="10-digit account number" maxLength={10} required />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Account Name</label>
                <div style={{ padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, background: "#faf9f7", color: accountName ? "var(--green)" : "var(--muted)", fontWeight: accountName ? 700 : 400 }}>
                  {resolving ? "Verifying..." : accountName || resolveError || "Auto-fills after entering account number"}
                </div>
                {resolveError && <div style={{ color: "#cc2222", fontSize: 12, marginTop: 4 }}>{resolveError}</div>}
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button type="submit" disabled={savingPayout || !accountName || resolving} style={{ padding: "11px 28px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: savingPayout || !accountName ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", opacity: savingPayout || !accountName ? 0.7 : 1 }}>
                  {savingPayout ? "Setting up..." : onboardingComplete ? "Update Payout Account" : "Connect Payout Account"}
                </button>
                {payoutSaved && <span style={{ color: "var(--green)", fontSize: 14, fontWeight: 600 }}>✓ Connected!</span>}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}