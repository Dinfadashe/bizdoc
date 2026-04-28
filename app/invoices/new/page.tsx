"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { calcTotals, formatCurrency } from "@/lib/utils";

interface LineItem { id: number; description: string; qty: number; unit_price: string; }
interface CatalogItem { id: string; name: string; description: string; unit_price: number; }

const CURRENCIES = ["NGN", "USD", "GBP", "EUR"];
const emptyItem = (): LineItem => ({ id: Date.now(), description: "", qty: 1, unit_price: "" });

export default function NewInvoice() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState("NGN");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [client, setClient] = useState({ name: "", email: "", phone: "", address: "" });
  const [discountType, setDiscountType] = useState<"percent" | "flat">("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(7.5);
  const [notes, setNotes] = useState("");
  const [paymentInfo, setPaymentInfo] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInvoice, setDuplicateInvoice] = useState<{ invoice_number: string; status: string } | null>(null);
  const [pendingSendNow, setPendingSendNow] = useState(false);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [suggestions, setSuggestions] = useState<{ itemId: number; matches: CatalogItem[] } | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return; }
      setUserId(data.user.id);
      const { data: catalogData } = await supabase.from("catalog").select("*").eq("user_id", data.user.id).order("name");
      setCatalog(catalogData ?? []);
    });
  }, [router]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setSuggestions(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const parsedItems = items.map(i => ({ description: i.description, qty: Number(i.qty), unit_price: Number(i.unit_price) || 0 }));
  const { subtotal, discountAmount, taxAmount, total } = calcTotals(parsedItems, discountType, discountValue, taxRate);

  const updateItem = (id: number, field: keyof LineItem, val: string | number) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: val } : i));
    if (field === "description" && typeof val === "string" && val.length >= 1) {
      const matches = catalog.filter(c =>
        c.name.toLowerCase().includes(val.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(val.toLowerCase()))
      );
      setSuggestions(matches.length > 0 ? { itemId: id, matches } : null);
    } else if (field === "description") {
      setSuggestions(null);
    }
  };

  const applyCatalogItem = (lineItemId: number, catalogItem: CatalogItem) => {
    setItems(items.map(i => i.id === lineItemId ? { ...i, description: catalogItem.name, unit_price: String(catalogItem.unit_price) } : i));
    setSuggestions(null);
  };

  const doSave = async (sendNow: boolean) => {
    if (!userId || !client.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        client_name: client.name, client_email: client.email,
        client_phone: client.phone, client_address: client.address,
        items: parsedItems,
        discount_type: discountType, discount_value: discountValue,
        tax_rate: taxRate, notes, payment_info: paymentInfo,
        issue_date: issueDate, due_date: dueDate, currency,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.invoice) {
      if (sendNow && client.email) {
        fetch("/api/invoices/" + data.invoice.id + "/payment-link", { method: "POST" }).catch(() => {});
      }
      router.push("/invoices/" + data.invoice.id + "?created=1" + (sendNow ? "&sent=1" : ""));
    }
  };

  const handleSave = async (sendNow: boolean) => {
    if (!userId || !client.name.trim()) return;
    const { data: existing } = await supabase
      .from("invoices")
      .select("id, invoice_number, status")
      .eq("user_id", userId)
      .eq("client_name", client.name.trim())
      .eq("total", total)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1);
    if (existing && existing.length > 0) {
      setDuplicateInvoice(existing[0]);
      setPendingSendNow(sendNow);
      setShowDuplicateModal(true);
      return;
    }
    await doSave(sendNow);
  };

  const handleConfirmDuplicate = async () => {
    setShowDuplicateModal(false);
    setDuplicateInvoice(null);
    await doSave(pendingSendNow);
  };

  const inputStyle = { width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 7, fontSize: 14, outline: "none", fontFamily: "var(--font-body)" };
  const labelStyle = { display: "block" as const, fontSize: 11, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 5 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>

      {showDuplicateModal && duplicateInvoice && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "white", borderRadius: 14, padding: 32, maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 16 }}>&#x26A0;&#xFE0F;</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>Possible Duplicate Invoice</div>
            <div style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", marginBottom: 20, lineHeight: 1.6 }}>A similar invoice already exists for this client with the same amount.</div>
            <div style={{ background: "#fff8e8", border: "1px solid #f0d080", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: "#7a5500", lineHeight: 1.9 }}>
                <span style={{ color: "#555" }}>Invoice: </span><strong>{duplicateInvoice.invoice_number}</strong><br />
                <span style={{ color: "#555" }}>Client: </span><strong>{client.name}</strong><br />
                <span style={{ color: "#555" }}>Amount: </span><strong>{formatCurrency(total, currency)}</strong><br />
                <span style={{ color: "#555" }}>Status: </span><strong style={{ textTransform: "uppercase" }}>{duplicateInvoice.status}</strong>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => { setShowDuplicateModal(false); setDuplicateInvoice(null); }} style={{ flex: 1, padding: "11px", background: "#f5f2ed", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Cancel</button>
              <button onClick={handleConfirmDuplicate} style={{ flex: 1, padding: "11px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Create Anyway</button>
            </div>
          </div>
        </div>
      )}

      <nav style={{ background: "var(--green)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>&#8592;</button>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white" }}>New Invoice</div>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px" }}>

        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Invoice Details</div>
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
            <div><label style={labelStyle}>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Issue Date</label><input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Due Date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} /></div>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Client Information</div>
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div><label style={labelStyle}>Client Name *</label><input value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} style={inputStyle} placeholder="Client or company name" required /></div>
            <div><label style={{ ...labelStyle }}>Email <span style={{ fontWeight: 400, color: "#bbb", textTransform: "none" }}>(optional)</span></label><input value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} style={inputStyle} placeholder="client@email.com" /></div>
            <div><label style={{ ...labelStyle }}>Phone <span style={{ fontWeight: 400, color: "#bbb", textTransform: "none" }}>(optional)</span></label><input value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} style={inputStyle} placeholder="+234..." /></div>
            <div><label style={{ ...labelStyle }}>Address <span style={{ fontWeight: 400, color: "#bbb", textTransform: "none" }}>(optional)</span></label><input value={client.address} onChange={e => setClient({ ...client, address: e.target.value })} style={inputStyle} /></div>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Line Items</div>
          <div style={{ padding: 20, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Description", "Qty", "Unit Price", "Amount", ""].map(h => (
                  <th key={h} style={{ padding: "8px 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted)", textAlign: h === "Amount" ? "right" : "left", borderBottom: "1.5px solid var(--border)" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{ padding: "7px 6px", position: "relative" }}>
                      <input value={item.description} onChange={e => updateItem(item.id, "description", e.target.value)} style={{ ...inputStyle, minWidth: 200 }} placeholder="Service / product" autoComplete="off" />
                      {suggestions?.itemId === item.id && suggestions.matches.length > 0 && (
                        <div ref={suggestionsRef} style={{ position: "absolute", top: "100%", left: 6, right: 6, background: "white", border: "1.5px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 100, maxHeight: 200, overflowY: "auto" }}>
                          {suggestions.matches.map(match => (
                            <div key={match.id} onMouseDown={() => applyCatalogItem(item.id, match)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--green-light)")} onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{match.name}</div>
                                {match.description && <div style={{ fontSize: 11, color: "var(--muted)" }}>{match.description}</div>}
                              </div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--green)", marginLeft: 16 }}>{Number(match.unit_price).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "7px 6px" }}><input type="number" min={0} value={item.qty} onChange={e => updateItem(item.id, "qty", e.target.value)} style={{ ...inputStyle, width: 70 }} /></td>
                    <td style={{ padding: "7px 6px" }}><input type="number" min={0} value={item.unit_price} onChange={e => updateItem(item.id, "unit_price", e.target.value)} style={{ ...inputStyle, width: 130 }} placeholder="0.00" /></td>
                    <td style={{ padding: "7px 6px", textAlign: "right", fontWeight: 600, fontSize: 14 }}>{formatCurrency(item.qty * (Number(item.unit_price) || 0), currency)}</td>
                    <td style={{ padding: "7px 6px" }}><button onClick={() => items.length > 1 && setItems(items.filter(i => i.id !== item.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 20, lineHeight: 1 }}>x</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setItems([...items, emptyItem()])} style={{ marginTop: 12, padding: "8px 16px", border: "1.5px dashed var(--green-accent)", borderRadius: 7, background: "var(--green-light)", color: "var(--green)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>+ Add Item</button>
          </div>
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, flex: 1, minWidth: 280 }}>
              <div><label style={labelStyle}>Discount</label><input type="number" min={0} value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Discount Type</label><select value={discountType} onChange={e => setDiscountType(e.target.value as "percent" | "flat")} style={inputStyle}><option value="percent">%</option><option value="flat">Flat</option></select></div>
              <div><label style={labelStyle}>Tax Rate %</label><input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} style={inputStyle} /></div>
            </div>
            <div style={{ minWidth: 220 }}>
              {[
                ["Subtotal", formatCurrency(subtotal, currency)],
                discountAmount > 0 ? ["Discount", "-" + formatCurrency(discountAmount, currency)] : null,
                taxAmount > 0 ? ["Tax (" + taxRate + "%)", formatCurrency(taxAmount, currency)] : null,
              ].filter((x): x is string[] => x !== null).map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)", padding: "4px 0" }}>
                  <span>{label}</span><span>{val}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, borderTop: "2px solid var(--green)", paddingTop: 10, marginTop: 6 }}>
                <span>Total</span><span style={{ color: "var(--green)" }}>{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 24, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Notes & Payment Info</div>
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div><label style={labelStyle}>Notes / Terms</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Payment terms, thank you note..." /></div>
            <div><label style={labelStyle}>Additional Payment Instructions</label><textarea value={paymentInfo} onChange={e => setPaymentInfo(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Any extra payment notes..." /></div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => handleSave(false)} disabled={saving || !client.name.trim()} style={{ padding: "12px 24px", background: "#f5f2ed", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: !client.name.trim() ? "not-allowed" : "pointer", opacity: !client.name.trim() ? 0.6 : 1, fontFamily: "var(--font-body)" }}>
            Save as Draft
          </button>
          <button onClick={() => handleSave(true)} disabled={saving || !client.name.trim()} style={{ padding: "12px 28px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving || !client.name.trim() ? "not-allowed" : "pointer", opacity: saving || !client.name.trim() ? 0.7 : 1, fontFamily: "var(--font-body)" }}>
            {saving ? "Saving..." : "Save & Send Invoice"}
          </button>
          {!client.name.trim() && <div style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>Client name is required</div>}
          {client.name.trim() && !client.email && <div style={{ fontSize: 12, color: "#b36000", alignSelf: "center" }}>No email — invoice will be saved but payment link will not be sent</div>}
        </div>
      </div>
    </div>
  );
}