"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
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
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [tab, setTab] = useState<"profile" | "payouts">(searchParams?.get("tab") === "payouts" ? "payouts" : "profile");
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", currency: "NGN", logo_url: "" });
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

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

  // DVA state
  const [dvaAccountNumber, setDvaAccountNumber] = useState("");
  const [dvaAccountName, setDvaAccountName] = useState("");
  const [dvaBank, setDvaBank] = useState("");
  const [dvaEmail, setDvaEmail] = useState("");
  const [dvaPreferredBank, setDvaPreferredBank] = useState("titan-paystack");
  const [creatingDva, setCreatingDva] = useState(false);
  const [dvaError, setDvaError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return; }
      setUserId(data.user.id);
      const { data: biz } = await supabase.from("businesses").select("*").eq("user_id", data.user.id).single();
      if (biz) {
        setBizId(biz.id);
        setForm({ name: biz.name ?? "", email: biz.email ?? "", phone: biz.phone ?? "", address: biz.address ?? "", currency: biz.currency ?? "NGN", logo_url: biz.logo_url ?? "" });
        setLogoPreview(biz.logo_url ?? "");
        setBankCode(biz.bank_code ?? "");
        setBankName(biz.bank_name ?? "");
        setAccountNumber(biz.account_number ?? "");
        setAccountName(biz.account_name ?? "");
        setSubaccountCode(biz.subaccount_code ?? "");
        setOnboardingComplete(biz.onboarding_complete ?? false);
        setDvaAccountNumber(biz.dva_account_number ?? "");
        setDvaAccountName(biz.dva_account_name ?? "");
        setDvaBank(biz.dva_bank ?? "");
        setDvaEmail(biz.email ?? "");
      }
    });
    fetch("/api/banks").then(r => r.json()).then(d => setBanks(d.banks ?? [])).catch(() => {});
  }, [router]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) { setLogoError("Please upload an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setLogoError("Image must be under 2MB."); return; }
    setUploadingLogo(true);
    setLogoError("");
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);
    const ext = file.name.split(".").pop();
    const path = `${userId}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (uploadError) { setLogoError("Upload failed: " + uploadError.message); setUploadingLogo(false); return; }
    const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    setForm(f => ({ ...f, logo_url: publicUrl }));
    setLogoPreview(publicUrl);
    setUploadingLogo(false);
  };

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

  const handleCreateDVA = async () => {
    if (!userId || !dvaEmail) return;
    setCreatingDva(true);
    setDvaError("");
    const res = await fetch("/api/dva", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        email: dvaEmail,
        phone: form.phone,
        preferred_bank: dvaPreferredBank,
      }),
    });
    const data = await res.json();
    setCreatingDva(false);
    if (data.account_number) {
      setDvaAccountNumber(data.account_number);
      setDvaAccountName(data.account_name);
      setDvaBank(data.bank);
    } else {
      setDvaError(data.error ?? "Failed to create virtual account");
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
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "var(--font-body)", background: tab === t ? "white" : "transparent", color: tab === t ? "var(--green)" : "var(--muted)", boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
              {t === "payouts" ? "Payout Account" : "Business Profile"}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ padding: "14px 24px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Business Profile</div>
            <form onSubmit={handleSaveProfile} style={{ padding: 24 }}>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Business Logo</label>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div onClick={() => logoInputRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 12, border: "2px dashed var(--border)", background: "#faf9f7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", flexShrink: 0, position: "relative" }}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }} />
                    ) : (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 24 }}>🏢</div>
                        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>Click to upload</div>
                      </div>
                    )}
                    {uploadingLogo && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--green)", fontWeight: 700 }}>Uploading...</div>
                    )}
                  </div>
                  <div>
                    <button type="button" onClick={() => logoInputRef.current?.click()} style={{ padding: "9px 18px", background: "var(--green-light)", color: "var(--green)", border: "1.5px solid #b8dfc9", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)", display: "block", marginBottom: 6 }}>
                      {logoPreview ? "Change Logo" : "Upload Logo"}
                    </button>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>PNG, JPG or SVG · Max 2MB</div>
                    {logoError && <div style={{ fontSize: 11, color: "#cc2222", marginTop: 4 }}>{logoError}</div>}
                  </div>
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div><label style={labelStyle}>Business Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} required /></div>
                <div><label style={labelStyle}>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} placeholder="+2348012345678" /></div>
                <div><label style={labelStyle}>Default Currency</label>
                  <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={inputStyle}>
                    {["NGN", "USD", "GBP", "EUR"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Address</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button type="submit" disabled={saving || uploadingLogo} style={{ padding: "11px 28px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving..." : "Save Profile"}
                </button>
                {saved && <span style={{ color: "var(--green)", fontSize: 14, fontWeight: 600 }}>Saved!</span>}
              </div>
            </form>
          </div>
        )}

        {/* Payouts Tab */}
        {tab === "payouts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Payout account */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 24px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Payout Account</div>
              {onboardingComplete && (
                <div style={{ margin: 24, marginBottom: 0, background: "var(--green-light)", border: "1px solid #b8dfc9", borderRadius: 10, padding: "16px 20px" }}>
                  <div style={{ fontWeight: 700, color: "var(--green)", marginBottom: 8 }}>Payout account connected</div>
                  <div style={{ fontSize: 13, color: "#2e7d52", lineHeight: 1.9 }}>
                    <span style={{ color: "#1a6b4a" }}>Bank: </span><strong>{bankName}</strong><br />
                    <span style={{ color: "#1a6b4a" }}>Account No: </span><strong style={{ fontFamily: "monospace", letterSpacing: 1 }}>{accountNumber}</strong><br />
                    <span style={{ color: "#1a6b4a" }}>Account Name: </span><strong>{accountName}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: "#2e7d52", marginTop: 8, fontFamily: "monospace" }}>Subaccount: {subaccountCode}</div>
                </div>
              )}
              <form onSubmit={handleSavePayout} style={{ padding: 24 }}>
                <div style={{ background: "#fff8e8", border: "1px solid #f0d080", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#7a5500" }}>
                  Invoice payments go directly to this bank account. Platform deducts 2% automatically.
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Bank</label>
                  <select value={bankCode} onChange={e => { const s = banks.find(b => b.code === e.target.value); setBankCode(e.target.value); setBankName(s?.name ?? ""); setAccountName(""); }} style={inputStyle} required>
                    <option value="">Select your bank...</option>
                    {banks.map((b, idx) => <option key={`${b.code}-${idx}`} value={b.code}>{b.name}</option>)}
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
                  {payoutSaved && <span style={{ color: "var(--green)", fontSize: 14, fontWeight: 600 }}>Connected!</span>}
                </div>
              </form>
            </div>

            {/* DVA Section */}
            {onboardingComplete && (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                <div style={{ padding: "14px 24px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Virtual Account (for direct bank transfers)</div>

                {dvaAccountNumber ? (
                  <div style={{ padding: 24 }}>
                    <div style={{ background: "#e8f0ff", border: "1px solid #b8c8ff", borderRadius: 10, padding: "16px 20px" }}>
                      <div style={{ fontWeight: 700, color: "#2255cc", marginBottom: 8 }}>Virtual account active</div>
                      <div style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.9 }}>
                        <span style={{ color: "#555" }}>Bank: </span><strong>{dvaBank}</strong><br />
                        <span style={{ color: "#555" }}>Account No: </span><strong style={{ fontFamily: "monospace", fontSize: 15, letterSpacing: 1 }}>{dvaAccountNumber}</strong><br />
                        <span style={{ color: "#555" }}>Account Name: </span><strong>{dvaAccountName}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: "#2255cc", marginTop: 8 }}>This account appears on all your invoices. Any transfer to it triggers automatic receipt generation and BizDoc earns its 2% split.</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 24 }}>
                    <div style={{ background: "#e8f0ff", border: "1px solid #b8c8ff", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#2255cc" }}>
                      A dedicated virtual account lets clients pay by direct bank transfer or USSD and still triggers automatic receipt generation. All transfers are tracked by Paystack.
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                      <div>
                        <label style={labelStyle}>Business Email</label>
                        <input value={dvaEmail} onChange={e => setDvaEmail(e.target.value)} style={inputStyle} placeholder="your@email.com" />
                      </div>
                      <div>
                        <label style={labelStyle}>Preferred Bank</label>
                        <select value={dvaPreferredBank} onChange={e => setDvaPreferredBank(e.target.value)} style={inputStyle}>
                          <option value="titan-paystack">Paystack-Titan</option>
                          <option value="wema-bank">Wema Bank (ALAT)</option>
                        </select>
                      </div>
                    </div>
                    {dvaError && (
                      <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#cc2222", marginBottom: 16 }}>
                        {dvaError}
                      </div>
                    )}
                    <button type="button" onClick={handleCreateDVA} disabled={creatingDva || !dvaEmail} style={{ padding: "11px 24px", background: "#2255cc", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: creatingDva || !dvaEmail ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", opacity: creatingDva || !dvaEmail ? 0.7 : 1 }}>
                      {creatingDva ? "Creating..." : "Generate Virtual Account"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


