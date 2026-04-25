"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Settings() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [bizId, setBizId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", currency: "NGN", logo_url: "" });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return; }
      setUserId(data.user.id);
      const { data: biz } = await supabase.from("businesses").select("*").eq("user_id", data.user.id).single();
      if (biz) {
        setBizId(biz.id);
        setForm({ name: biz.name ?? "", email: biz.email ?? "", phone: biz.phone ?? "", address: biz.address ?? "", currency: biz.currency ?? "NGN", logo_url: biz.logo_url ?? "" });
      }
    });
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
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

  const inputStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "var(--font-body)" };
  const labelStyle = { display: "block" as const, fontSize: 11, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <nav style={{ background: "var(--green)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/dashboard"><button style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20 }}>←</button></Link>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white" }}>Business Settings</div>
      </nav>

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ padding: "14px 24px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>
            Business Profile (appears on all invoices)
          </div>
          <form onSubmit={handleSave} style={{ padding: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div><label style={labelStyle}>Business Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Web3.0 Alliance Ltd" required /></div>
              <div><label style={labelStyle}>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="info@theweb3alliance.org" /></div>
              <div><label style={labelStyle}>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} placeholder="+234..." /></div>
              <div><label style={labelStyle}>Default Currency</label>
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={inputStyle}>
                  {["NGN", "USD", "GBP", "EUR"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Address</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inputStyle} placeholder="Jos, Plateau State, Nigeria" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Logo URL (paste image URL or upload to Supabase Storage)</label>
              <input value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} style={inputStyle} placeholder="https://..." />
              {form.logo_url && <img src={form.logo_url} alt="logo preview" style={{ marginTop: 10, width: 60, height: 60, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border)" }} />}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button type="submit" disabled={saving} style={{ padding: "11px 28px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Save Settings"}
              </button>
              {saved && <span style={{ color: "var(--green)", fontSize: 14, fontWeight: 600 }}>✓ Saved!</span>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
