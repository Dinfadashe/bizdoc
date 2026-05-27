const fs = require('fs');

// ── 1. Add DELETE to invoice API ─────────────────────────────
let apiContent = fs.readFileSync('app/api/invoices/[id]/route.ts', 'utf8');
if (!apiContent.includes('export async function DELETE')) {
  apiContent += `
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data: invoice } = await supabaseAdmin.from("invoices").select("status").eq("id", id).single();
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (invoice.status !== "draft") return NextResponse.json({ error: "Only draft invoices can be deleted" }, { status: 400 });
    await supabaseAdmin.from("receipts").delete().eq("invoice_id", id);
    await supabaseAdmin.from("invoices").delete().eq("id", id);
    return NextResponse.json({ deleted: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}`;
  fs.writeFileSync('app/api/invoices/[id]/route.ts', apiContent, 'utf8');
  console.log('Added DELETE to invoice API');
} else {
  console.log('DELETE already exists');
}

// ── 2. Add calcTotals to utils if missing ────────────────────
let utilsContent = fs.readFileSync('lib/utils.ts', 'utf8');
if (!utilsContent.includes('calcTotals')) {
  utilsContent += `
export function calcTotals(items: { qty: number; unit_price: number }[], discountType: string, discountValue: number, taxRate: number) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const discountAmount = discountType === "percent" ? subtotal * (discountValue / 100) : discountValue;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount;
  return { subtotal, discountAmount, taxAmount, total };
}`;
  fs.writeFileSync('lib/utils.ts', utilsContent, 'utf8');
  console.log('Added calcTotals to utils');
}

// ── 3. Rewrite invoice detail page with edit + mobile fix ────
const invoiceDetailContent = `"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { Invoice, Receipt } from "@/lib/types";
import { formatCurrency, calcTotals } from "@/lib/utils";
import { CURRENCIES } from "@/lib/currencies";
import Link from "next/link";
import QRCode from "qrcode";
import html2canvas from "html2canvas";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: "#f0f0f0", text: "#888" },
  sent:      { bg: "#e8f0ff", text: "#2255cc" },
  paid:      { bg: "#e8f5ef", text: "#1a6b4a" },
  overdue:   { bg: "#fff0f0", text: "#cc2222" },
  cancelled: { bg: "#f5f5f5", text: "#aaa" },
};

interface LineItem { id: number; description: string; qty: number; unit_price: string; }
const emptyItem = (): LineItem => ({ id: Date.now(), description: "", qty: 1, unit_price: "" });

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [business, setBusiness] = useState<any>(null);
  const [bizAccounts, setBizAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingWA, setSharingWA] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<LineItem[]>([emptyItem()]);
  const [editClient, setEditClient] = useState({ name: "", email: "", phone: "", address: "" });
  const [editCurrency, setEditCurrency] = useState("NGN");
  const [editDiscount, setEditDiscount] = useState(0);
  const [editDiscountType, setEditDiscountType] = useState<"percent"|"flat">("percent");
  const [editTax, setEditTax] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<{ itemId: number; matches: any[] } | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).single();
    if (!inv) { router.push("/dashboard"); return; }
    setInvoice(inv);
    const { data: biz } = await supabase.from("businesses").select("*").eq("user_id", inv.user_id).single();
    setBusiness(biz);
    if (biz) {
      const acctRes = await fetch("/api/business-accounts?user_id=" + inv.user_id);
      const acctData = await acctRes.json();
      setBizAccounts(acctData.accounts ?? []);
    }
    const { data: rec } = await supabase.from("receipts").select("*").eq("invoice_id", id).single();
    setReceipt(rec);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!invoice?.id) return;
    const payUrl = typeof window !== "undefined" ? window.location.origin + "/invoices/" + id + "/pay" : "";
    QRCode.toDataURL(payUrl, { width: 160, margin: 1, color: { dark: "#1a4a2e", light: "#ffffff" } })
      .then(setQrDataUrl).catch(console.error);
  }, [invoice?.id, id]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setSuggestions(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const openEditMode = async () => {
    if (!invoice) return;
    setEditItems(invoice.items.map((item: any, i: number) => ({ id: i, description: item.description, qty: item.qty, unit_price: String(item.unit_price) })));
    setEditClient({ name: invoice.client_name || "", email: invoice.client_email || "", phone: invoice.client_phone || "", address: invoice.client_address || "" });
    setEditCurrency(invoice.currency || "NGN");
    setEditDiscount(invoice.discount_value || 0);
    setEditDiscountType(invoice.discount_type || "percent");
    setEditTax(invoice.tax_rate || 0);
    setEditNotes(invoice.notes || "");
    setEditDueDate(invoice.due_date ? invoice.due_date.split("T")[0] : "");
    setEditAccountId(invoice.display_account_id || "");
    // Load inventory for autocomplete
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      const invRes = await fetch("/api/inventory?user_id=" + user.data?.user?.id);
      const invData = await invRes.json();
      setInventory(invData.inventory ?? []);
    }
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!invoice) return;
    setSavingEdit(true);
    const parsedItems = editItems.map(i => ({ description: i.description, qty: Number(i.qty), unit_price: Number(i.unit_price) || 0 }));
    const { subtotal, discountAmount, taxAmount, total } = calcTotals(parsedItems, editDiscountType, editDiscount, editTax);
    const res = await fetch("/api/invoices/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: parsedItems,
        client_name: editClient.name || null,
        client_email: editClient.email || null,
        client_phone: editClient.phone || null,
        client_address: editClient.address || null,
        currency: editCurrency,
        discount_type: editDiscountType,
        discount_value: editDiscount,
        discount_amount: discountAmount,
        tax_rate: editTax,
        tax_amount: taxAmount,
        subtotal,
        total,
        notes: editNotes,
        due_date: editDueDate || null,
        display_account_id: editAccountId || null,
      }),
    });
    const data = await res.json();
    setSavingEdit(false);
    if (data.invoice) {
      setInvoice(data.invoice);
      setEditMode(false);
    } else {
      alert(data.error ?? "Failed to save changes");
    }
  };

  const updateEditItem = (itemId: number, field: keyof LineItem, val: string | number) => {
    setEditItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: val } : i));
    if (field === "description" && typeof val === "string" && val.length >= 1) {
      const matches = inventory.filter(inv => inv.name.toLowerCase().includes(val.toLowerCase()));
      setSuggestions(matches.length > 0 ? { itemId, matches } : null);
    } else if (field === "description") setSuggestions(null);
  };

  const shareWhatsApp = async () => {
    if (!invoice) return;
    setSharingWA(true);
    try {
      const payUrl = window.location.origin + "/invoices/" + id + "/pay";
      const invoiceEl = document.getElementById("invoice-doc-inner");
      if (invoiceEl) {
        const canvas = await html2canvas(invoiceEl, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], "invoice-" + invoice.invoice_number + ".png", { type: "image/png" });
          const msg = "Hi " + (invoice.client_name || "there") + ", please find your invoice " + invoice.invoice_number + " for " + formatCurrency(invoice.total, invoice.currency) + " from " + (business?.name ?? "us") + ".\\n\\nPay here: " + payUrl;
          if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({ text: msg, files: [file] });
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "invoice-" + invoice.invoice_number + ".png"; a.click();
            URL.revokeObjectURL(url);
            setTimeout(() => window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank"), 1000);
          }
        }, "image/png");
      }
    } catch (err) {
      const payUrl = window.location.origin + "/invoices/" + id + "/pay";
      const msg = "Hi, please find invoice " + invoice.invoice_number + " for " + formatCurrency(invoice.total, invoice.currency) + ".\\n\\nPay here: " + payUrl;
      window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
    }
    setSharingWA(false);
  };

  const handleMarkPaid = async () => {
    if (!invoice || !confirm("Mark this invoice as paid (cash payment)?")) return;
    setMarkingPaid(true);
    const res = await fetch("/api/invoices/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid", paid_at: new Date().toISOString(), payment_method: "cash" }),
    });
    const data = await res.json();
    setMarkingPaid(false);
    if (data.invoice) { setInvoice(data.invoice); load(); }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    setDeleting(true);
    const res = await fetch("/api/invoices/" + id, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (data.deleted) { router.push("/dashboard"); }
    else { alert(data.error ?? "Failed to delete invoice"); setShowDeleteConfirm(false); }
  };

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    const invoiceEl = document.getElementById("invoice-doc-inner");
    if (!invoiceEl || !invoice) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(invoiceEl, { scale: 2.5, useCORS: true, backgroundColor: "#ffffff", logging: false });
      const imgData = canvas.toDataURL("image/png", 1.0);
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const imgH = (canvas.height * pageW) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pageW, imgH);
      pdf.save(invoice.invoice_number + ".pdf");
    } catch (err) { console.error("Download failed:", err); }
    setDownloading(false);
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>Loading...</div>;
  if (!invoice) return null;

  const sc = STATUS_COLORS[invoice.status] ?? STATUS_COLORS.draft;
  const payPageUrl = typeof window !== "undefined" ? window.location.origin + "/invoices/" + id + "/pay" : "";
  const editTotals = calcTotals(
    editItems.map(i => ({ qty: Number(i.qty), unit_price: Number(i.unit_price) || 0 })),
    editDiscountType, editDiscount, editTax
  );
  const displayAccount = bizAccounts.find(a => a.id === invoice.display_account_id) || bizAccounts.find(a => a.is_default) || bizAccounts[0];
  const inp = { width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 7, fontSize: 14, outline: "none", fontFamily: "var(--font-body)" } as const;
  const lbl = { display: "block" as const, fontSize: 11, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 5 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <style>{\`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { margin: 0.4cm; size: A4 portrait; }
        }
        @media (max-width: 768px) {
          .invoice-grid { grid-template-columns: 1fr !important; }
          .invoice-table-wrap { overflow-x: auto !important; }
          .invoice-actions { flex-wrap: wrap !important; gap: 8px !important; }
          .invoice-header-inner { flex-direction: column !important; gap: 12px !important; }
          .invoice-totals-row { flex-direction: column !important; align-items: flex-start !important; }
          .invoice-ussd-grid { grid-template-columns: 1fr 1fr !important; }
          .edit-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .invoice-ussd-grid { grid-template-columns: 1fr !important; }
        }
      \`}</style>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "white", borderRadius: 14, padding: 32, maxWidth: 400, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Delete Draft Invoice?</div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
              Invoice <strong>{invoice.invoice_number}</strong> will be permanently deleted. This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: "11px", background: "#f5f2ed", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "11px", background: "#cc2222", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1, fontFamily: "var(--font-body)" }}>
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editMode && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, overflowY: "auto", padding: "20px 16px" }}>
          <div style={{ background: "white", borderRadius: 14, maxWidth: 800, margin: "0 auto", overflow: "hidden" }}>
            <div style={{ background: "var(--green)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "white" }}>Edit Invoice — {invoice.invoice_number}</div>
              <button onClick={() => setEditMode(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 22 }}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              {/* Currency & Due Date */}
              <div className="edit-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div><label style={lbl}>Currency</label>
                  <select value={editCurrency} onChange={e => setEditCurrency(e.target.value)} style={inp}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Due Date</label><input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} style={inp} /></div>
              </div>
              {/* Payment Account */}
              {bizAccounts.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={lbl}>Payment Account</label>
                  <select value={editAccountId} onChange={e => setEditAccountId(e.target.value)} style={inp}>
                    <option value="">— No account —</option>
                    {bizAccounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} · {a.account_number} ({a.currency})</option>)}
                  </select>
                </div>
              )}
              {/* Client */}
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>Client</div>
              <div className="edit-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div><label style={lbl}>Name</label><input value={editClient.name} onChange={e => setEditClient({...editClient, name: e.target.value})} style={inp} placeholder="Client name (optional)" /></div>
                <div><label style={lbl}>Email</label><input value={editClient.email} onChange={e => setEditClient({...editClient, email: e.target.value})} style={inp} placeholder="client@email.com" /></div>
                <div><label style={lbl}>Phone</label><input value={editClient.phone} onChange={e => setEditClient({...editClient, phone: e.target.value})} style={inp} /></div>
                <div><label style={lbl}>Address</label><input value={editClient.address} onChange={e => setEditClient({...editClient, address: e.target.value})} style={inp} /></div>
              </div>
              {/* Items */}
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>Line Items</div>
              <div style={{ overflowX: "auto", marginBottom: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
                  <thead>
                    <tr style={{ background: "var(--green)" }}>
                      {["Description","Qty","Unit Price","Amount",""].map((h,i) => (
                        <th key={h} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "white", textAlign: i >= 3 ? "right" : "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editItems.map(item => (
                      <tr key={item.id}>
                        <td style={{ padding: "6px 6px", position: "relative" }}>
                          <input value={item.description} onChange={e => updateEditItem(item.id, "description", e.target.value)} style={{ ...inp, minWidth: 160 }} placeholder="Item description" />
                          {suggestions?.itemId === item.id && suggestions.matches.length > 0 && (
                            <div ref={suggestionsRef} style={{ position: "absolute", top: "100%", left: 6, right: 6, background: "white", border: "1.5px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 100, maxHeight: 180, overflowY: "auto" }}>
                              {suggestions.matches.slice(0, 5).map((match: any) => (
                                <div key={match.id} onMouseDown={() => { setEditItems(prev => prev.map(i => i.id === item.id ? { ...i, description: match.name, unit_price: String(match.selling_price) } : i)); setSuggestions(null); }} style={{ padding: "9px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--green-light)")} onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                                  <div><div style={{ fontWeight: 700, fontSize: 13 }}>{match.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Stock: {match.quantity} {match.unit}</div></div>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--green)" }}>{Number(match.selling_price).toLocaleString()}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "6px 4px" }}><input type="number" min={0} value={item.qty} onChange={e => updateEditItem(item.id, "qty", e.target.value)} style={{ ...inp, width: 65 }} /></td>
                        <td style={{ padding: "6px 4px" }}><input type="number" min={0} value={item.unit_price} onChange={e => updateEditItem(item.id, "unit_price", e.target.value)} style={{ ...inp, width: 110 }} /></td>
                        <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: 600, fontSize: 13 }}>{formatCurrency(Number(item.qty) * (Number(item.unit_price) || 0), editCurrency)}</td>
                        <td style={{ padding: "6px 4px" }}><button onClick={() => editItems.length > 1 && setEditItems(prev => prev.filter(i => i.id !== item.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 18 }}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => setEditItems(prev => [...prev, emptyItem()])} style={{ padding: "7px 14px", border: "1.5px dashed var(--green)", borderRadius: 7, background: "var(--green-light)", color: "var(--green)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)", marginBottom: 16 }}>+ Add Item</button>
              {/* Discount & Tax */}
              <div className="edit-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div><label style={lbl}>Discount</label><input type="number" min={0} value={editDiscount} onChange={e => setEditDiscount(Number(e.target.value))} style={inp} /></div>
                <div><label style={lbl}>Type</label><select value={editDiscountType} onChange={e => setEditDiscountType(e.target.value as "percent"|"flat")} style={inp}><option value="percent">%</option><option value="flat">Flat</option></select></div>
                <div><label style={lbl}>Tax %</label><input type="number" min={0} max={100} value={editTax} onChange={e => setEditTax(Number(e.target.value))} style={inp} /></div>
              </div>
              {/* Totals preview */}
              <div style={{ background: "#faf9f7", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>Total</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--green)" }}>{formatCurrency(editTotals.total, editCurrency)}</span>
              </div>
              {/* Notes */}
              <div style={{ marginBottom: 20 }}><label style={lbl}>Notes</label><textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} /></div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={handleSaveEdit} disabled={savingEdit} style={{ padding: "12px 28px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: savingEdit ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", opacity: savingEdit ? 0.7 : 1 }}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
                <button onClick={() => setEditMode(false)} style={{ padding: "12px 20px", background: "#f5f2ed", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="no-print" style={{ background: "var(--green)", padding: "0 16px", height: 60, display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/dashboard"><button style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>←</button></Link>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "white", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{invoice.invoice_number}</div>
        <div className="invoice-actions" style={{ display: "flex", gap: 8 }}>
          <button onClick={handlePrint} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Print</button>
          {invoice.status === "draft" && (
            <>
              <button onClick={openEditMode} style={{ background: "#c9a84c", border: "none", color: "#1a1a2e", padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>Edit</button>
              <button onClick={() => setShowDeleteConfirm(true)} style={{ background: "#fff0f0", border: "none", color: "#cc2222", padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>Delete</button>
            </>
          )}
          {invoice.status === "paid" && receipt && (
            <Link href={"/invoices/" + id + "/receipt"}><button style={{ background: "#4caf7d", border: "none", color: "white", padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>Receipt</button></Link>
          )}
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <button onClick={handleMarkPaid} disabled={markingPaid} style={{ background: "#f5f2ed", border: "1.5px solid var(--border)", color: "var(--text)", padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>
              {markingPaid ? "..." : "Mark Paid"}
            </button>
          )}
        </div>
      </nav>

      <div id="invoice-print-wrapper">
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 12px" }}>

          {/* Action bar */}
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <div className="no-print" style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{invoice.status === "draft" ? "Ready to send?" : "Invoice sent"}</div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>{invoice.status === "draft" ? "Share this invoice with your client" : "Waiting for payment"}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={shareWhatsApp} disabled={sharingWA} style={{ padding: "9px 16px", background: "#25D366", color: "white", border: "none", borderRadius: 8, cursor: sharingWA ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)", opacity: sharingWA ? 0.7 : 1 }}>
                  {sharingWA ? "Preparing..." : "Share on WhatsApp"}
                </button>
                <button onClick={handleDownload} disabled={downloading} style={{ padding: "9px 16px", background: "#f5f2ed", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)" }}>
                  {downloading ? "..." : "Download PDF"}
                </button>
              </div>
            </div>
          )}

          {invoice.status === "paid" && (
            <div className="no-print" style={{ background: "var(--green-light)", borderRadius: 12, border: "1px solid #b8dfc9", padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--green)", fontSize: 15 }}>Payment Received</div>
                <div style={{ fontSize: 13, color: "#2e7d52" }}>Paid on {invoice.paid_at ? new Date(invoice.paid_at).toLocaleString() : "—"}{invoice.client_email ? " · Receipt emailed to " + invoice.client_email : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={shareWhatsApp} disabled={sharingWA} style={{ padding: "8px 14px", background: "#25D366", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)" }}>WhatsApp</button>
                <button onClick={handleDownload} disabled={downloading} style={{ padding: "8px 14px", background: "#f5f2ed", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)" }}>{downloading ? "..." : "PDF"}</button>
              </div>
            </div>
          )}

          <div id="invoice-doc-inner" style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ background: "var(--green)", padding: "24px 24px" }}>
              <div className="invoice-header-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  {business?.logo_url && <img src={business.logo_url} alt="logo" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 8, marginBottom: 8 }} />}
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white" }}>{business?.name || "Your Business"}</div>
                  <div style={{ color: "#a8d5b5", fontSize: 12, marginTop: 4, lineHeight: 1.7 }}>
                    {business?.address && <span>{business.address}<br /></span>}
                    {business?.email && <span>{business.email}<br /></span>}
                    {business?.phone}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "white", letterSpacing: -1 }}>INVOICE</div>
                  <div style={{ color: "#a8d5b5", fontSize: 13, marginTop: 4 }}>{invoice.invoice_number}</div>
                  <div style={{ marginTop: 8 }}>
                    <span style={{ background: sc.bg, color: sc.text, padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>{invoice.status}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div style={{ background: "#faf9f7", padding: "12px 24px", display: "flex", gap: 24, flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
              {[
                ["Issue Date", new Date(invoice.issue_date).toDateString()],
                invoice.due_date ? ["Due Date", new Date(invoice.due_date).toDateString()] : null,
                ["Currency", invoice.currency],
                invoice.paid_at ? ["Paid On", new Date(invoice.paid_at).toDateString()] : null,
              ].filter((x): x is string[] => x !== null).map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--muted)", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{val}</div>
                </div>
              ))}
            </div>

            {/* From / Bill To */}
            <div className="invoice-grid" style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--muted)", marginBottom: 6 }}>From</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700 }}>{business?.name || "—"}</div>
                <div style={{ color: "#555", fontSize: 12, lineHeight: 1.7, marginTop: 4 }}>
                  {business?.address && <>{business.address}<br /></>}
                  {business?.email && <>{business.email}<br /></>}
                  {business?.phone}
                </div>
              </div>
              {(invoice.client_name || invoice.client_email) && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--muted)", marginBottom: 6 }}>Bill To</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700 }}>{invoice.client_name || "—"}</div>
                  <div style={{ color: "#555", fontSize: 12, lineHeight: 1.7, marginTop: 4 }}>
                    {invoice.client_address && <>{invoice.client_address}<br /></>}
                    {invoice.client_email && <>{invoice.client_email}<br /></>}
                    {invoice.client_phone}
                  </div>
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="invoice-table-wrap" style={{ padding: "0 24px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
                <thead>
                  <tr style={{ background: "var(--green)" }}>
                    {["#","Description","Qty","Unit Price","Amount"].map((h,i) => (
                      <th key={h} style={{ padding: "9px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "white", textAlign: i >= 3 ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item: any, idx: number) => (
                    <tr key={idx} style={{ background: idx % 2 === 1 ? "#faf9f7" : "white" }}>
                      <td style={{ padding: "10px 10px", color: "var(--muted)", fontSize: 12 }}>{idx + 1}</td>
                      <td style={{ padding: "10px 10px", fontSize: 13 }}>{item.description}</td>
                      <td style={{ padding: "10px 10px", fontSize: 13 }}>{item.qty}</td>
                      <td style={{ padding: "10px 10px", fontSize: 13, textAlign: "right" }}>{formatCurrency(item.unit_price, invoice.currency)}</td>
                      <td style={{ padding: "10px 10px", fontSize: 13, fontWeight: 600, textAlign: "right" }}>{formatCurrency(item.qty * item.unit_price, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="invoice-totals-row" style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: 16 }}>
              {qrDataUrl && invoice.status !== "paid" ? (
                <div style={{ textAlign: "center" }}>
                  <img src={qrDataUrl} alt="QR" style={{ width: 100, height: 100, borderRadius: 8, border: "2px solid var(--green-light)" }} />
                  <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 }}>Scan to Pay</div>
                </div>
              ) : <div style={{ width: 100 }} />}
              <div style={{ minWidth: 220 }}>
                {[
                  ["Subtotal", formatCurrency(invoice.subtotal, invoice.currency)],
                  invoice.discount_amount > 0 ? ["Discount", "-" + formatCurrency(invoice.discount_amount, invoice.currency)] : null,
                  invoice.tax_amount > 0 ? ["Tax (" + invoice.tax_rate + "%)", formatCurrency(invoice.tax_amount, invoice.currency)] : null,
                ].filter((x): x is string[] => x !== null).map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", padding: "3px 0" }}><span>{label}</span><span>{val}</span></div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, borderTop: "2px solid var(--green)", paddingTop: 8, marginTop: 6 }}>
                  <span>Total</span><span style={{ color: "var(--green)" }}>{formatCurrency(invoice.total, invoice.currency)}</span>
                </div>
              </div>
            </div>

            {/* Payment Options */}
            {displayAccount && (
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--muted)", marginBottom: 8 }}>Payment Options</div>
                <div style={{ background: "var(--green-light)", border: "1px solid #b8dfc9", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px" }}>Bank Transfer</div>
                  <div style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 2 }}>
                    <span style={{ color: "var(--muted)" }}>Bank: </span><strong>{displayAccount.bank_name}</strong><br />
                    <span style={{ color: "var(--muted)" }}>Account No: </span><strong style={{ fontFamily: "monospace", fontSize: 15, letterSpacing: 1 }}>{displayAccount.account_number}</strong><br />
                    <span style={{ color: "var(--muted)" }}>Account Name: </span><strong>{displayAccount.account_name}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--muted)", marginBottom: 6 }}>Notes</div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{invoice.notes}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}`;

fs.writeFileSync('app/invoices/[id]/page.tsx', invoiceDetailContent, 'utf8');
console.log('Rewrote invoice detail page');
console.log('All done!');