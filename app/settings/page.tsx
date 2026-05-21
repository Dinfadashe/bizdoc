"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CURRENCIES } from "@/lib/currencies";

interface Bank { name: string; code: string; }
interface CatalogItem { id?: string; name: string; description: string; unit_price: number; }
interface BizAccount { id?: string; account_name: string; account_number: string; bank_name: string; currency: string; is_default: boolean; }

export default function Settings() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [bizId, setBizId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [tab, setTab] = useState<"profile" | "accounts" | "catalog" | "team">(
    searchParams?.get("tab") === "accounts" ? "accounts" :
    searchParams?.get("tab") === "catalog" ? "catalog" :
    searchParams?.get("tab") === "team" ? "team" : "profile"
  );
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", currency: "NGN", logo_url: "" });
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Bank accounts state
  const [bizAccounts, setBizAccounts] = useState<BizAccount[]>([]);
  const [newAccount, setNewAccount] = useState<BizAccount>({ account_name: "", account_number: "", bank_name: "", currency: "NGN", is_default: false });
  const [addingAccount, setAddingAccount] = useState(false);
  const [accountMsg, setAccountMsg] = useState("");

  // Catalog state
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [newItem, setNewItem] = useState<CatalogItem>({ name: "", description: "", unit_price: 0 });
  const [addingItem, setAddingItem] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<CatalogItem>({ name: "", description: "", unit_price: 0 });
  const [catalogSaved, setCatalogSaved] = useState("");

  // Team state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSent, setInviteSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return; }
      setUserId(data.user.id);
      const { data: biz } = await supabase.from("businesses").select("*").eq("user_id", data.user.id).single();
      if (biz) {
        setBizId(biz.id);
        setForm({ name: biz.name ?? "", email: biz.email ?? "", phone: biz.phone ?? "", address: biz.address ?? "", currency: biz.currency ?? "NGN", logo_url: biz.logo_url ?? "" });
        setLogoPreview(biz.logo_url ?? "");
      }
      // Load bank accounts
      const acctRes = await fetch("/api/business-accounts?user_id=" + data.user.id);
      const acctData = await acctRes.json();
      setBizAccounts(acctData.accounts ?? []);
      // Load catalog
      setCatalogLoading(true);
      const { data: catalogData } = await supabase.from("catalog").select("*").eq("user_id", data.user.id).order("name");
      setCatalog(catalogData ?? []);
      setCatalogLoading(false);
      // Load team
      const { data: teamData } = await supabase.from("team_members").select("*").eq("owner_user_id", data.user.id).order("created_at", { ascending: false });
      setTeamMembers(teamData ?? []);
    });
  }, [router]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) { setLogoError("Please upload an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setLogoError("Image must be under 2MB."); return; }
    setUploadingLogo(true); setLogoError("");
    setLogoPreview(URL.createObjectURL(file));
    const ext = file.name.split(".").pop();
    const path = userId + "/logo." + ext;
    const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (uploadError) { setLogoError("Upload failed: " + uploadError.message); setUploadingLogo(false); return; }
    const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
    setForm(f => ({ ...f, logo_url: urlData.publicUrl }));
    setLogoPreview(urlData.publicUrl);
    setUploadingLogo(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    if (bizId) { await supabase.from("businesses").update(form).eq("id", bizId); }
    else { const { data } = await supabase.from("businesses").insert({ ...form, user_id: userId }).select().single(); if (data) setBizId(data.id); }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const handleAddAccount = async () => {
    if (!userId || !newAccount.account_name || !newAccount.account_number || !newAccount.bank_name) return;
    setAddingAccount(true);
    const res = await fetch("/api/business-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newAccount, user_id: userId }),
    });
    const data = await res.json();
    setAddingAccount(false);
    if (data.account) {
      setBizAccounts(prev => [...prev, data.account]);
      setNewAccount({ account_name: "", account_number: "", bank_name: "", currency: "NGN", is_default: false });
      setAccountMsg("Account added!"); setTimeout(() => setAccountMsg(""), 2000);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    await fetch("/api/business-accounts?id=" + id, { method: "DELETE" });
    setBizAccounts(prev => prev.filter(a => a.id !== id));
  };

  const handleAddCatalogItem = async () => {
    if (!userId || !newItem.name.trim()) return;
    setAddingItem(true);
    const { data } = await supabase.from("catalog").insert({ ...newItem, user_id: userId }).select().single();
    if (data) { setCatalog(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name))); setNewItem({ name: "", description: "", unit_price: 0 }); setCatalogSaved("Added!"); setTimeout(() => setCatalogSaved(""), 2000); }
    setAddingItem(false);
  };

  const handleUpdateCatalogItem = async (id: string) => {
    const { data } = await supabase.from("catalog").update(editItem).eq("id", id).select().single();
    if (data) { setCatalog(prev => prev.map(i => i.id === id ? data : i)); setEditingId(null); setCatalogSaved("Saved!"); setTimeout(() => setCatalogSaved(""), 2000); }
  };

  const handleDeleteCatalogItem = async (id: string) => {
    await supabase.from("catalog").delete().eq("id", id);
    setCatalog(prev => prev.filter(i => i.id !== id));
  };

  const handleInvite = async () => {
    if (!userId || !inviteEmail.trim()) return;
    setInviting(true); setInviteError(""); setInviteSent(false);
    const res = await fetch("/api/team/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owner_user_id: userId, member_email: inviteEmail.trim() }) });
    const data = await res.json();
    setInviting(false);
    if (data.ok) { setInviteSent(true); setInviteEmail(""); const { data: td } = await supabase.from("team_members").select("*").eq("owner_user_id", userId).order("created_at", { ascending: false }); setTeamMembers(td ?? []); }
    else setInviteError(data.error ?? "Failed to send invite");
  };

  const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "var(--font-body)" } as const;
  const lbl = { display: "block" as const, fontSize: 11, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <nav style={{ background: "var(--green)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/dashboard"><button style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20 }}>&#8592;</button></Link>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white" }}>Settings</div>
      </nav>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ display: "flex", background: "#e8e4de", borderRadius: 10, padding: 4, gap: 4, marginBottom: 24 }}>
          {(["profile","accounts","catalog","team"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 4px", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)", background: tab === t ? "white" : "transparent", color: tab === t ? "var(--green)" : "var(--muted)", boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
              {t === "accounts" ? "Accounts" : t === "catalog" ? "Inventory" : t === "team" ? "Team" : "Profile"}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ padding: "14px 24px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Business Profile</div>
            <form onSubmit={handleSaveProfile} style={{ padding: 24 }}>
              <div style={{ marginBottom: 24 }}>
                <label style={lbl}>Business Logo</label>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div onClick={() => logoInputRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 12, border: "2px dashed var(--border)", background: "#faf9f7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", flexShrink: 0, position: "relative" }}>
                    {logoPreview ? <img src={logoPreview} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }} /> : <div style={{ textAlign: "center" }}><div style={{ fontSize: 24 }}>&#127962;</div><div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>Upload</div></div>}
                    {uploadingLogo && <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--green)", fontWeight: 700 }}>Uploading...</div>}
                  </div>
                  <div>
                    <button type="button" onClick={() => logoInputRef.current?.click()} style={{ padding: "9px 18px", background: "var(--green-light)", color: "var(--green)", border: "1.5px solid #b8dfc9", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)", display: "block", marginBottom: 6 }}>{logoPreview ? "Change Logo" : "Upload Logo"}</button>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>PNG, JPG · Max 2MB</div>
                    {logoError && <div style={{ fontSize: 11, color: "#cc2222", marginTop: 4 }}>{logoError}</div>}
                  </div>
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div><label style={lbl}>Business Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} required /></div>
                <div><label style={lbl}>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} /></div>
                <div><label style={lbl}>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></div>
                <div><label style={lbl}>Default Currency</label>
                  <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={inp}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 24 }}><label style={lbl}>Address</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inp} /></div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button type="submit" disabled={saving || uploadingLogo} style={{ padding: "11px 28px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save Profile"}</button>
                {saved && <span style={{ color: "var(--green)", fontSize: 14, fontWeight: 600 }}>Saved!</span>}
              </div>
            </form>
          </div>
        )}

        {tab === "accounts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 24px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Bank Accounts</div>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>Add your bank accounts. When creating an invoice, choose which account to display for client payment.</div>
                <div style={{ background: "#faf9f7", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Add New Account</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div><label style={lbl}>Account Name *</label><input value={newAccount.account_name} onChange={e => setNewAccount({ ...newAccount, account_name: e.target.value })} style={inp} placeholder="e.g. JOHN DOE" /></div>
                    <div><label style={lbl}>Account Number *</label><input value={newAccount.account_number} onChange={e => setNewAccount({ ...newAccount, account_number: e.target.value })} style={inp} placeholder="0123456789" /></div>
                    <div><label style={lbl}>Bank Name *</label><input value={newAccount.bank_name} onChange={e => setNewAccount({ ...newAccount, bank_name: e.target.value })} style={inp} placeholder="e.g. GTBank" /></div>
                    <div><label style={lbl}>Currency</label>
                      <select value={newAccount.currency} onChange={e => setNewAccount({ ...newAccount, currency: e.target.value })} style={inp}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                    <input type="checkbox" id="isDefault" checked={newAccount.is_default} onChange={e => setNewAccount({ ...newAccount, is_default: e.target.checked })} style={{ width: 16, height: 16, accentColor: "var(--green)", cursor: "pointer" }} />
                    <label htmlFor="isDefault" style={{ fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>Set as default account</label>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button type="button" onClick={handleAddAccount} disabled={addingAccount || !newAccount.account_name || !newAccount.account_number || !newAccount.bank_name} style={{ padding: "9px 20px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>{addingAccount ? "Adding..." : "+ Add Account"}</button>
                    {accountMsg && <span style={{ color: "var(--green)", fontSize: 13, fontWeight: 600 }}>{accountMsg}</span>}
                  </div>
                </div>
                {bizAccounts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>No accounts yet. Add your first bank account above.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {bizAccounts.map(acct => (
                      <div key={acct.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{acct.account_name}</div>
                          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{acct.bank_name} · {acct.account_number} · <span style={{ background: "var(--green-light)", color: "var(--green)", padding: "1px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{acct.currency}</span></div>
                        </div>
                        {acct.is_default && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", background: "var(--green-light)", padding: "3px 10px", borderRadius: 20 }}>Default</span>}
                        <button type="button" onClick={() => handleDeleteAccount(acct.id!)} style={{ padding: "5px 12px", background: "#fff0f0", color: "#cc2222", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "catalog" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 24px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Products & Services — Inventory</div>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20, lineHeight: 1.7 }}>Products and services are now managed in the Inventory section. Your inventory items automatically appear as suggestions when creating invoices.</div>
                <Link href="/inventory"><button style={{ padding: "12px 28px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Go to Inventory →</button></Link>
              </div>
            </div>
          </div>
        )}
        {tab === "catalog_old_hidden" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 24px" }}>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>Hidden</div>
                <div style={{ background: "#faf9f7", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Add New Item</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div><label style={lbl}>Name *</label><input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} style={inp} placeholder="e.g. Web Design" /></div>
                    <div><label style={lbl}>Unit Price</label><input type="number" min={0} value={newItem.unit_price} onChange={e => setNewItem({ ...newItem, unit_price: Number(e.target.value) })} style={inp} placeholder="0.00" /></div>
                  </div>
                  <div style={{ marginBottom: 12 }}><label style={lbl}>Description (optional)</label><input value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} style={inp} placeholder="Brief description..." /></div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button type="button" onClick={handleAddCatalogItem} disabled={addingItem || !newItem.name.trim()} style={{ padding: "9px 20px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>{addingItem ? "Adding..." : "+ Add Item"}</button>
                    {catalogSaved && <span style={{ color: "var(--green)", fontSize: 13, fontWeight: 600 }}>{catalogSaved}</span>}
                  </div>
                </div>
                {catalogLoading ? <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading...</div> : catalog.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>No items yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {catalog.map(item => (
                      <div key={item.id} style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                        {editingId === item.id ? (
                          <div style={{ padding: 14, background: "#f5f9f7" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                              <div><label style={lbl}>Name</label><input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} style={inp} /></div>
                              <div><label style={lbl}>Unit Price</label><input type="number" min={0} value={editItem.unit_price} onChange={e => setEditItem({ ...editItem, unit_price: Number(e.target.value) })} style={inp} /></div>
                            </div>
                            <div style={{ marginBottom: 10 }}><label style={lbl}>Description</label><input value={editItem.description} onChange={e => setEditItem({ ...editItem, description: e.target.value })} style={inp} /></div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button type="button" onClick={() => handleUpdateCatalogItem(item.id!)} style={{ padding: "7px 16px", background: "var(--green)", color: "white", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Save</button>
                              <button type="button" onClick={() => setEditingId(null)} style={{ padding: "7px 16px", background: "#f5f2ed", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                              {item.description && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{item.description}</div>}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--green)", minWidth: 80, textAlign: "right" }}>{Number(item.unit_price).toLocaleString()}</div>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button type="button" onClick={() => { setEditingId(item.id!); setEditItem({ name: item.name, description: item.description, unit_price: item.unit_price }); }} style={{ padding: "5px 12px", background: "#e8f0ff", color: "#2255cc", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Edit</button>
                              <button type="button" onClick={() => handleDeleteCatalogItem(item.id!)} style={{ padding: "5px 12px", background: "#fff0f0", color: "#cc2222", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Delete</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "team" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 24px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Team Members</div>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>Invite staff to create and manage invoices. They cannot access financials or settings.</div>
                <div style={{ background: "#faf9f7", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Invite Staff Member</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email" placeholder="staff@email.com" style={{ ...inp, flex: 1 }} />
                    <button type="button" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} style={{ padding: "10px 20px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)", whiteSpace: "nowrap" as const }}>{inviting ? "Sending..." : "Send Invite"}</button>
                  </div>
                  {inviteError && <div style={{ fontSize: 12, color: "#cc2222", marginTop: 8 }}>{inviteError}</div>}
                  {inviteSent && <div style={{ fontSize: 12, color: "var(--green)", marginTop: 8, fontWeight: 600 }}>Invite sent!</div>}
                </div>
                {teamMembers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>No team members yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {teamMembers.map(member => (
                      <div key={member.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{member.member_email}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Role: {member.role} · Status: {member.status}</div>
                        </div>
                        <span style={{ padding: "3px 10px", background: member.status === "active" ? "var(--green-light)" : "#fff8e8", color: member.status === "active" ? "var(--green)" : "#b36000", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{member.status === "active" ? "Active" : "Pending"}</span>
                        <button type="button" onClick={async () => { await fetch("/api/team?id=" + member.id, { method: "DELETE" }); setTeamMembers(prev => prev.filter(m => m.id !== member.id)); }} style={{ padding: "5px 12px", background: "#fff0f0", color: "#cc2222", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}