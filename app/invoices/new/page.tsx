"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { calcTotals, formatCurrency } from "@/lib/utils";
import { CURRENCIES } from "@/lib/currencies";

interface LineItem { id: number; description: string; qty: number; unit_price: string; }
interface InventoryItem { id: string; name: string; description: string; selling_price: number; quantity: number; unit: string; }
interface BizAccount { id: string; account_name: string; account_number: string; bank_name: string; currency: string; is_default: boolean; }
const emptyItem = (): LineItem => ({ id: Date.now() + Math.random(), description: "", qty: 1, unit_price: "" });

export default function NewInvoice() {
  const router = useRouter();
  const [userId, setUserId] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [currency, setCurrency] = useState("NGN");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [client, setClient] = useState({ name: "", email: "", phone: "", address: "" });
  const [discountType, setDiscountType] = useState<"percent"|"flat">("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [catalog, setCatalog] = useState<InventoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<{ itemId: number; matches: InventoryItem[] } | null>(null);
  const [bizAccounts, setBizAccounts] = useState<BizAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [subscriptionOk, setSubscriptionOk] = useState(true);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return; }
      setUserId(data.user.id);
      const [invRes, acctRes, subRes] = await Promise.all([
        fetch("/api/inventory?user_id=" + data.user.id),
        fetch("/api/business-accounts?user_id=" + data.user.id),
        fetch("/api/subscription?user_id=" + data.user.id),
      ]);
      const invData = await invRes.json();
      setCatalog(invData.inventory ?? []);
      const acctData = await acctRes.json();
      const accounts = acctData.accounts ?? [];
      setBizAccounts(accounts);
      const defaultAcct = accounts.find((a: BizAccount) => a.is_default) || accounts[0];
      if (defaultAcct) setSelectedAccountId(defaultAcct.id);
      const subData = await subRes.json();
      const sub = subData.subscription;
      if (sub) {
        const ok = (sub.status === "trial" && new Date(sub.trial_ends_at) > new Date()) ||
                   (sub.status === "active" && new Date(sub.expires_at) > new Date());
        setSubscriptionOk(ok);
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

  const parsedItems = items.map(i => ({ description: i.description, qty: Number(i.qty) || 1, unit_price: Number(i.unit_price) || 0 }));
  const { subtotal, discountAmount, taxAmount, total } = calcTotals(parsedItems, discountType, discountValue, taxRate);

  const updateItem = (id: number, field: keyof LineItem, val: string | number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));
    if (field === "description" && typeof val === "string" && val.length >= 1) {
      const matches = catalog.filter(c => c.name.toLowerCase().includes(val.toLowerCase())).slice(0, 6);
      setSuggestions(matches.length > 0 ? { itemId: id, matches } : null);
    } else if (field === "description") setSuggestions(null);
  };

  const applyInventoryItem = (lineItemId: number, invItem: InventoryItem) => {
    setItems(prev => prev.map(i => i.id === lineItemId ? { ...i, description: invItem.name, unit_price: String(invItem.selling_price) } : i));
    setSuggestions(null);
  };

  const doSave = async (asDraft: boolean) => {
    if (!userId) return;
    const validItems = parsedItems.filter(i => i.description.trim());
    if (validItems.length === 0) { alert("Please add at least one item."); return; }
    asDraft ? setSavingDraft(true) : setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          status: asDraft ? "draft" : "draft",
          client_name: client.name || null,
          client_email: client.email || null,
          client_phone: client.phone || null,
          client_address: client.address || null,
          items: validItems,
          discount_type: discountType,
          discount_value: discountValue,
          tax_rate: taxRate,
          notes,
          issue_date: issueDate,
          due_date: dueDate || null,
          currency,
          display_account_id: selectedAccountId || null,
        }),
      });
      const data = await res.json();
      if (data.invoice) {
        router.push("/invoices/" + data.invoice.id + "?created=1");
      } else {
        alert(data.error ?? "Failed to save invoice");
      }
    } finally {
      asDraft ? setSavingDraft(false) : setSaving(false);
    }
  };

  const handleSave = async (asDraft: boolean) => {
    if (!userId) return;
    // Check for duplicate
    if (client.name && total > 0) {
      const { data: existing } = await supabase.from("invoices")
        .select("id, invoice_number, status")
        .eq("user_id", userId)
        .eq("client_name", client.name.trim())
        .eq("total", total)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1);
      if (existing && existing.length > 0) {
        setPendingDraft(asDraft);
        setShowDuplicateModal(true);
        return;
      }
    }
    await doSave(asDraft);
  };

  if (!subscriptionOk) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "white", borderRadius: 16, border: "1px solid var(--border)", padding: 40, maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Subscription Required</div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.7 }}>Your free trial has expired. Subscribe to continue creating invoices.</div>
          <button onClick={() => router.push("/subscribe")} style={{ padding: "12px 32px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>View Plans</button>
        </div>
      </div>
    );
  }

  const inp = { width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 7, fontSize: 14, outline: "none", fontFamily: "var(--font-body)", background: "white" } as const;
  const lbl = { display: "block" as const, fontSize: 11, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 5 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <style>{`
        @media(max-width:700px){
          .ni-grid-2{grid-template-columns:1fr!important}
          .ni-grid-3{grid-template-columns:1fr 1fr!important}
          .ni-table{font-size:11px!important}
          .ni-table th,.ni-table td{padding:6px 6px!important}
          .ni-totals{flex-direction:column!important}
          .ni-save-btns{flex-direction:column!important}
          .ni-save-btns button{width:100%!important}
        }
        @media(max-width:400px){.ni-grid-3{grid-template-columns:1fr!important}}
      `}</style>

      {showDuplicateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "white", borderRadius: 14, padding: 32, maxWidth: 440, width: "100%" }}>
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 16 }}>⚠️</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>Possible Duplicate</div>
            <div style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", marginBottom: 20 }}>A similar invoice already exists for this client with the same amount.</div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setShowDuplicateModal(false)} style={{ flex: 1, padding: "11px", background: "#f5f2ed", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Cancel</button>
              <button onClick={async () => { setShowDuplicateModal(false); await doSave(pendingDraft); }} style={{ flex: 1, padding: "11px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Create Anyway</button>
            </div>
          </div>
        </div>
      )}

      <nav style={{ background: "var(--green)", padding: "0 16px", height: 56, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
        <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 22 }}>←</button>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "white", flex: 1 }}>New Invoice</div>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "16px 10px 40px" }}>

        {/* Invoice Details */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 12, overflow: "hidden" }}>
          <div style={{ padding: "11px 16px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Invoice Details</div>
          <div className="ni-grid-2" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <div><label style={lbl}>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} style={inp}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Issue Date</label><input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} style={inp}/></div>
            <div><label style={lbl}>Due Date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inp}/></div>
          </div>
        </div>

        {/* Payment Account */}
        {bizAccounts.length > 0 && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 12, overflow: "hidden" }}>
            <div style={{ padding: "11px 16px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Payment Account</div>
            <div style={{ padding: 16 }}>
              <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} style={inp}>
                <option value="">— No account —</option>
                {bizAccounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} · {a.account_number} ({a.currency})</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Client */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 12, overflow: "hidden" }}>
          <div style={{ padding: "11px 16px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Client <span style={{ fontWeight: 400, textTransform: "none", fontSize: 11, color: "#bbb" }}>(all optional)</span></div>
          <div className="ni-grid-2" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div><label style={lbl}>Name</label><input value={client.name} onChange={e => setClient({...client, name: e.target.value})} style={inp} placeholder="Client or company name"/></div>
            <div><label style={lbl}>Email</label><input value={client.email} onChange={e => setClient({...client, email: e.target.value})} style={inp} placeholder="client@email.com"/></div>
            <div><label style={lbl}>Phone</label><input value={client.phone} onChange={e => setClient({...client, phone: e.target.value})} style={inp} placeholder="+1..."/></div>
            <div><label style={lbl}>Address</label><input value={client.address} onChange={e => setClient({...client, address: e.target.value})} style={inp}/></div>
          </div>
        </div>

        {/* Line Items */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 12, overflow: "hidden" }}>
          <div style={{ padding: "11px 16px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Line Items</div>
          <div style={{ padding: 16, overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
            <table className="ni-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
              <thead>
                <tr style={{ background: "var(--green)" }}>
                  {["Description","Qty","Unit Price","Amount",""].map((h,i) => (
                    <th key={h} style={{ padding: "8px 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "white", textAlign: i >= 3 ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{ padding: "6px 6px", position: "relative", minWidth: 160 }}>
                      <input value={item.description} onChange={e => updateItem(item.id, "description", e.target.value)} style={{ ...inp, padding: "7px 10px" }} placeholder="Product or service" autoComplete="off"/>
                      {suggestions?.itemId === item.id && suggestions.matches.length > 0 && (
                        <div ref={suggestionsRef} style={{ position: "absolute", top: "100%", left: 6, right: 6, background: "white", border: "1.5px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 100, maxHeight: 200, overflowY: "auto" }}>
                          {suggestions.matches.map(match => (
                            <div key={match.id} onMouseDown={() => applyInventoryItem(item.id, match)} style={{ padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--green-light)")} onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{match.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Stock: {match.quantity} {match.unit}</div></div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--green)", marginLeft: 12 }}>{formatCurrency(match.selling_price, currency)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "6px 4px" }}><input type="number" min={1} value={item.qty} onChange={e => updateItem(item.id, "qty", e.target.value)} style={{ ...inp, width: 65, padding: "7px 8px" }}/></td>
                    <td style={{ padding: "6px 4px" }}><input type="number" min={0} value={item.unit_price} onChange={e => updateItem(item.id, "unit_price", e.target.value)} style={{ ...inp, width: 110, padding: "7px 8px" }} placeholder="0.00"/></td>
                    <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>{formatCurrency(item.qty * (Number(item.unit_price) || 0), currency)}</td>
                    <td style={{ padding: "6px 4px" }}><button onClick={() => items.length > 1 && setItems(items.filter(i => i.id !== item.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 20 }}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setItems(prev => [...prev, emptyItem()])} style={{ marginTop: 10, padding: "7px 14px", border: "1.5px dashed var(--green)", borderRadius: 7, background: "var(--green-light)", color: "var(--green)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>+ Add Item</button>
          </div>
          <div className="ni-totals" style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div className="ni-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, flex: 1, minWidth: 240 }}>
              <div><label style={lbl}>Discount</label><input type="number" min={0} value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} style={inp}/></div>
              <div><label style={lbl}>Type</label><select value={discountType} onChange={e => setDiscountType(e.target.value as "percent"|"flat")} style={inp}><option value="percent">%</option><option value="flat">Flat</option></select></div>
              <div><label style={lbl}>Tax %</label><input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} style={inp}/></div>
            </div>
            <div style={{ minWidth: 200 }}>
              {[["Subtotal", formatCurrency(subtotal, currency)], discountAmount > 0 ? ["Discount", "-" + formatCurrency(discountAmount, currency)] : null, taxAmount > 0 ? ["Tax (" + taxRate + "%)", formatCurrency(taxAmount, currency)] : null].filter((x): x is string[] => x !== null).map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)", padding: "3px 0" }}><span>{label}</span><span>{val}</span></div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, borderTop: "2px solid var(--green)", paddingTop: 8, marginTop: 6 }}>
                <span>Total</span><span style={{ color: "var(--green)" }}>{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 20, overflow: "hidden" }}>
          <div style={{ padding: "11px 16px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Notes (optional)</div>
          <div style={{ padding: 16 }}>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="Payment terms, thank you note..."/>
          </div>
        </div>

        {/* SAVE BUTTONS */}
        <div className="ni-save-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={() => handleSave(true)} disabled={savingDraft} style={{ padding: "14px 28px", background: "#f5f2ed", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: savingDraft ? "not-allowed" : "pointer", opacity: savingDraft ? 0.7 : 1, fontFamily: "var(--font-body)" }}>
            {savingDraft ? "Saving draft..." : "💾 Save as Draft"}
          </button>
          <button onClick={() => handleSave(false)} disabled={saving} style={{ padding: "14px 32px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "var(--font-body)" }}>
            {saving ? "Saving..." : "✓ Save Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}