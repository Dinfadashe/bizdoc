"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { calcTotals, formatCurrency } from "@/lib/utils";
import { CURRENCIES } from "@/lib/currencies";

interface LineItem { id: number; description: string; qty: number; unit_price: string; }
interface InventoryItem { id: string; name: string; description: string; selling_price: number; quantity: number; unit: string; }
interface BizAccount { id: string; account_name: string; account_number: string; bank_name: string; currency: string; is_default: boolean; }

const emptyItem = (): LineItem => ({ id: Date.now(), description: "", qty: 1, unit_price: "" });

export default function NewInvoice() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState("NGN");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [client, setClient] = useState({ name: "", email: "", phone: "", address: "" });
  const [discountType, setDiscountType] = useState<"percent"|"flat">("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInvoice, setDuplicateInvoice] = useState<any>(null);
  const [pendingSendNow, setPendingSendNow] = useState(false);
  const [catalog, setCatalog] = useState<InventoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<{ itemId: number; matches: InventoryItem[] } | null>(null);
  const [bizAccounts, setBizAccounts] = useState<BizAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [subscriptionOk, setSubscriptionOk] = useState(true);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return; }
      setUserId(data.user.id);
      const [catalogRes, accountsRes, subRes] = await Promise.all([
        fetch("/api/inventory?user_id=" + data.user.id).then(r => r.json()).then(d => ({ data: (d.inventory ?? []) })),
        fetch("/api/business-accounts?user_id=" + data.user.id),
        fetch("/api/subscription?user_id=" + data.user.id),
      ]);
      setCatalog((catalogRes as any).data ?? []);
      const acctData = await accountsRes.json();
      const accounts = acctData.accounts ?? [];
      setBizAccounts(accounts);
      const defaultAcct = accounts.find((a: BizAccount) => a.is_default) || accounts[0];
      if (defaultAcct) setSelectedAccountId(defaultAcct.id);
      const subData = await subRes.json();
      const sub = subData.subscription;
      if (sub) {
        const isTrial = sub.status === "trial" && new Date(sub.trial_ends_at) > new Date();
        const isActive = sub.status === "active" && new Date(sub.expires_at) > new Date();
        setSubscriptionOk(isTrial || isActive);
      }
    });
  }, [router]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setSuggestions(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const parsedItems = items.map(i => ({ description: i.description, qty: Number(i.qty), unit_price: Number(i.unit_price) || 0 }));
  const { subtotal, discountAmount, taxAmount, total } = calcTotals(parsedItems, discountType, discountValue, taxRate);

  const updateItem = (id: number, field: keyof LineItem, val: string | number) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: val } : i));
    if (field === "description" && typeof val === "string" && val.length >= 1) {
      const matches = catalog.filter((c: InventoryItem) => c.name.toLowerCase().includes(val.toLowerCase()) && Number(c.quantity) > 0);
      setSuggestions(matches.length > 0 ? { itemId: id, matches } : null);
    } else if (field === "description") setSuggestions(null);
  };

  const applyCatalogItem = (lineItemId: number, catalogItem: CatalogItem) => {
    setItems(items.map(i => i.id === lineItemId ? { ...i, description: (catalogItem as any).name, unit_price: String((catalogItem as any).selling_price) } : i));
    setSuggestions(null);
  };

  const doSave = async (sendNow: boolean) => {
    if (!userId) return;
    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        client_name: client.name || null,
        client_email: client.email || null,
        client_phone: client.phone || null,
        client_address: client.address || null,
        items: parsedItems,
        discount_type: discountType, discount_value: discountValue,
        tax_rate: taxRate, notes,
        issue_date: issueDate, due_date: dueDate,
        currency,
        display_account_id: selectedAccountId || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.invoice) {
      router.push("/invoices/" + data.invoice.id + "?created=1");
    } else {
      alert(data.error ?? "Failed to save invoice");
    }
  };

  const handleSave = async (sendNow: boolean) => {
    if (!userId) return;
    if (client.name) {
      const { data: existing } = await supabase.from("invoices").select("id, invoice_number, status")
        .eq("user_id", userId).eq("client_name", client.name.trim()).eq("total", total).neq("status", "cancelled")
        .order("created_at", { ascending: false }).limit(1);
      if (existing && existing.length > 0) {
        setDuplicateInvoice(existing[0]); setPendingSendNow(sendNow); setShowDuplicateModal(true); return;
      }
    }
    await doSave(sendNow);
  };

  if (!subscriptionOk) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "white", borderRadius: 16, border: "1px solid var(--border)", padding: 40, maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#128274;</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Subscription Required</div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.7 }}>Your free trial has expired. Subscribe to continue creating invoices.</div>
          <button onClick={() => router.push("/subscribe")} style={{ padding: "12px 32px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)", marginRight: 10 }}>View Plans</button>
          <button onClick={() => router.push("/dashboard")} style={{ padding: "12px 20px", background: "#f5f2ed", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Dashboard</button>
        </div>
      </div>
    );
  }

  const inp = { width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 7, fontSize: 14, outline: "none", fontFamily: "var(--font-body)" } as const;
  const lbl = { display: "block" as const, fontSize: 11, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 5 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      {showDuplicateModal && duplicateInvoice && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "white", borderRadius: 14, padding: 32, maxWidth: 440, width: "100%" }}>
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 16 }}>&#x26A0;&#xFE0F;</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>Possible Duplicate</div>
            <div style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", marginBottom: 20 }}>A similar invoice exists for this client with the same amount.</div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => { setShowDuplicateModal(false); setDuplicateInvoice(null); }} style={{ flex: 1, padding: "11px", background: "#f5f2ed", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Cancel</button>
              <button onClick={async () => { setShowDuplicateModal(false); setDuplicateInvoice(null); await doSave(pendingSendNow); }} style={{ flex: 1, padding: "11px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Create Anyway</button>
            </div>
          </div>
        </div>
      )}

      <nav style={{ background: "var(--green)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20 }}>&#8592;</button>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white" }}>New Invoice</div>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px" }}>

        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Invoice Details</div>
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
            <div><label style={lbl}>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} style={inp}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Issue Date</label><input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Due Date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inp} /></div>
          </div>
        </div>

        {bizAccounts.length > 0 && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 16, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Payment Account to Display</div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                <div>
                  <label style={lbl}>Select Account</label>
                  <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} style={inp}>
                    <option value="">— No account —</option>
                    {bizAccounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} · {a.account_number} ({a.currency})</option>)}
                  </select>
                </div>
                {selectedAccountId && bizAccounts.find(a => a.id === selectedAccountId) && (
                  <div style={{ background: "var(--green-light)", border: "1px solid #b8dfc9", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Will show on invoice</div>
                    <div style={{ fontSize: 13, color: "#2e7d52", lineHeight: 1.8 }}>
                      <strong>{bizAccounts.find(a => a.id === selectedAccountId)?.account_name}</strong><br/>
                      {bizAccounts.find(a => a.id === selectedAccountId)?.bank_name} · {bizAccounts.find(a => a.id === selectedAccountId)?.account_number}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Client Information</div>
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div><label style={lbl}>Client Name <span style={{ fontWeight: 400, color: "#bbb", textTransform: "none" }}>(optional)</span></label><input value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} style={inp} placeholder="Client or company name" /></div>
            <div><label style={lbl}>Email <span style={{ fontWeight: 400, color: "#bbb", textTransform: "none" }}>(optional)</span></label><input value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} style={inp} placeholder="client@email.com" /></div>
            <div><label style={lbl}>Phone <span style={{ fontWeight: 400, color: "#bbb", textTransform: "none" }}>(optional)</span></label><input value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} style={inp} placeholder="+1..." /></div>
            <div><label style={lbl}>Address <span style={{ fontWeight: 400, color: "#bbb", textTransform: "none" }}>(optional)</span></label><input value={client.address} onChange={e => setClient({ ...client, address: e.target.value })} style={inp} /></div>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Line Items</div>
          <div style={{ padding: 20, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Description","Qty","Unit Price","Amount",""].map(h => (
                  <th key={h} style={{ padding: "8px 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted)", textAlign: h === "Amount" ? "right" : "left", borderBottom: "1.5px solid var(--border)" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{ padding: "7px 6px", position: "relative" }}>
                      <input value={item.description} onChange={e => updateItem(item.id, "description", e.target.value)} style={{ ...inp, minWidth: 200 }} placeholder="Service / product" autoComplete="off" />
                      {suggestions?.itemId === item.id && suggestions.matches.length > 0 && (
                        <div ref={suggestionsRef} style={{ position: "absolute", top: "100%", left: 6, right: 6, background: "white", border: "1.5px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 100, maxHeight: 200, overflowY: "auto" }}>
                          {suggestions.matches.map(match => (
                            <div key={match.id} onMouseDown={() => applyCatalogItem(item.id, match)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--green-light)")} onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{(match as any).name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Stock: {(match as any).quantity} {(match as any).unit}</div></div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--green)", marginLeft: 16 }}>₦{Number((match as any).selling_price).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "7px 6px" }}><input type="number" min={0} value={item.qty} onChange={e => updateItem(item.id, "qty", e.target.value)} style={{ ...inp, width: 70 }} /></td>
                    <td style={{ padding: "7px 6px" }}><input type="number" min={0} value={item.unit_price} onChange={e => updateItem(item.id, "unit_price", e.target.value)} style={{ ...inp, width: 130 }} placeholder="0.00" /></td>
                    <td style={{ padding: "7px 6px", textAlign: "right", fontWeight: 600, fontSize: 14 }}>{formatCurrency(item.qty * (Number(item.unit_price) || 0), currency)}</td>
                    <td style={{ padding: "7px 6px" }}><button onClick={() => items.length > 1 && setItems(items.filter(i => i.id !== item.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 20 }}>x</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setItems([...items, emptyItem()])} style={{ marginTop: 12, padding: "8px 16px", border: "1.5px dashed var(--green-accent)", borderRadius: 7, background: "var(--green-light)", color: "var(--green)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>+ Add Item</button>
          </div>
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, flex: 1, minWidth: 280 }}>
              <div><label style={lbl}>Discount</label><input type="number" min={0} value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Type</label><select value={discountType} onChange={e => setDiscountType(e.target.value as "percent"|"flat")} style={inp}><option value="percent">%</option><option value="flat">Flat</option></select></div>
              <div><label style={lbl}>Tax %</label><input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} style={inp} /></div>
            </div>
            <div style={{ minWidth: 220 }}>
              {[["Subtotal", formatCurrency(subtotal, currency)], discountAmount > 0 ? ["Discount", "-" + formatCurrency(discountAmount, currency)] : null, taxAmount > 0 ? ["Tax (" + taxRate + "%)", formatCurrency(taxAmount, currency)] : null].filter((x): x is string[] => x !== null).map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)", padding: "4px 0" }}><span>{label}</span><span>{val}</span></div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, borderTop: "2px solid var(--green)", paddingTop: 10, marginTop: 6 }}>
                <span>Total</span><span style={{ color: "var(--green)" }}>{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 24, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Notes</div>
          <div style={{ padding: 20 }}>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="Payment terms, thank you note..." />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={() => handleSave(false)} disabled={saving} style={{ padding: "12px 24px", background: "#f5f2ed", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Save as Draft</button>
          <button onClick={() => handleSave(true)} disabled={saving} style={{ padding: "12px 28px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "var(--font-body)" }}>{saving ? "Saving..." : "Save Invoice"}</button>
        </div>
      </div>
    </div>
  );
}
