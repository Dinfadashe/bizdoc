const fs = require('fs');

fs.mkdirSync('app/inventory', { recursive: true });
fs.writeFileSync('app/inventory/page.tsx', `"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CURRENCIES } from "@/lib/currencies";

const CATEGORIES = ["Electronics","Clothing","Food & Beverage","Health & Beauty","Home & Garden","Office Supplies","Raw Materials","Services","Software","Transport","Other"];
const UNITS = ["unit","kg","g","litre","ml","piece","box","pack","bag","bottle","roll","metre","pair","set","dozen"];

interface InventoryItem {
  id: string; name: string; description: string; sku: string; category: string;
  cost_price: number; selling_price: number; quantity: number; low_stock_alert: number; unit: string;
}

export default function Inventory() {
  const router = useRouter();
  const [userId, setUserId] = useState<string|null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"items"|"add"|"movements">("items");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string|null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [movLoading, setMovLoading] = useState(false);
  const [stockModal, setStockModal] = useState<InventoryItem|null>(null);
  const [stockType, setStockType] = useState<"in"|"out">("in");
  const [stockQty, setStockQty] = useState(0);
  const [stockNote, setStockNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    name: "", description: "", sku: "", category: "Other",
    cost_price: 0, selling_price: 0, quantity: 0, low_stock_alert: 5, unit: "unit"
  });
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return; }
      setUserId(data.user.id);
      const res = await fetch("/api/inventory?user_id=" + data.user.id);
      const d = await res.json();
      setItems(d.inventory ?? []);
      setLoading(false);
    });
  }, [router]);

  const loadMovements = async (uid: string) => {
    setMovLoading(true);
    const res = await fetch("/api/inventory/stock?user_id=" + uid);
    const d = await res.json();
    setMovements(d.movements ?? []);
    setMovLoading(false);
  };

  const handleAdd = async () => {
    if (!userId || !form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/inventory", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, user_id: userId })
    });
    const d = await res.json();
    setSaving(false);
    if (d.item) {
      setItems(prev => [...prev, d.item].sort((a,b) => a.name.localeCompare(b.name)));
      setForm({ name:"", description:"", sku:"", category:"Other", cost_price:0, selling_price:0, quantity:0, low_stock_alert:5, unit:"unit" });
      setMsg("Item added!"); setTimeout(() => setMsg(""), 2000);
      setTab("items");
    }
  };

  const handleEdit = async (id: string) => {
    setSaving(true);
    const res = await fetch("/api/inventory", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editForm })
    });
    const d = await res.json();
    setSaving(false);
    if (d.item) { setItems(prev => prev.map(i => i.id === id ? d.item : i)); setEditingId(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    await fetch("/api/inventory?id=" + id, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleStockUpdate = async () => {
    if (!userId || !stockModal || !stockQty) return;
    setSaving(true);
    const res = await fetch("/api/inventory/stock", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, inventory_id: stockModal.id, type: stockType, quantity: stockQty, reference: "Manual adjustment", note: stockNote })
    });
    const d = await res.json();
    setSaving(false);
    if (d.new_quantity !== undefined) {
      setItems(prev => prev.map(i => i.id === stockModal.id ? { ...i, quantity: d.new_quantity } : i));
      setStockModal(null); setStockQty(0); setStockNote("");
      setMsg("Stock updated!"); setTimeout(() => setMsg(""), 2000);
    }
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku || "").toLowerCase().includes(search.toLowerCase()));
  const lowStockItems = items.filter(i => Number(i.quantity) <= Number(i.low_stock_alert));

  const inp = { width:"100%", padding:"9px 12px", border:"1.5px solid var(--border)", borderRadius:7, fontSize:14, outline:"none", fontFamily:"var(--font-body)" } as const;
  const lbl = { display:"block" as const, fontSize:11, fontWeight:700 as const, textTransform:"uppercase" as const, letterSpacing:"0.8px", color:"var(--muted)", marginBottom:5 };

  return (
    <div style={{ minHeight:"100vh", background:"var(--cream)" }}>
      {stockModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:"white", borderRadius:14, padding:32, maxWidth:400, width:"100%" }}>
            <div style={{ fontWeight:700, fontSize:18, marginBottom:4 }}>Update Stock</div>
            <div style={{ color:"var(--muted)", fontSize:13, marginBottom:20 }}>{stockModal.name} · Current: <strong>{stockModal.quantity} {stockModal.unit}</strong></div>
            <div style={{ display:"flex", gap:10, marginBottom:16 }}>
              {(["in","out"] as const).map(t => (
                <button key={t} onClick={() => setStockType(t)} style={{ flex:1, padding:"10px", border:"1.5px solid var(--border)", borderRadius:8, fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"var(--font-body)", background:stockType===t ? (t==="in" ? "var(--green)" : "#fff0f0") : "white", color:stockType===t ? (t==="in" ? "white" : "#cc2222") : "var(--muted)", borderColor:stockType===t ? (t==="in" ? "var(--green)" : "#cc2222") : "var(--border)" }}>
                  {t === "in" ? "➕ Stock In" : "➖ Stock Out"}
                </button>
              ))}
            </div>
            <div style={{ marginBottom:14 }}><label style={lbl}>Quantity</label><input type="number" min={0} value={stockQty} onChange={e => setStockQty(Number(e.target.value))} style={inp} /></div>
            <div style={{ marginBottom:20 }}><label style={lbl}>Note (optional)</label><input value={stockNote} onChange={e => setStockNote(e.target.value)} style={inp} placeholder="e.g. Purchase from supplier" /></div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStockModal(null)} style={{ flex:1, padding:"11px", background:"#f5f2ed", color:"var(--text)", border:"1.5px solid var(--border)", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)" }}>Cancel</button>
              <button onClick={handleStockUpdate} disabled={saving || !stockQty} style={{ flex:1, padding:"11px", background:"var(--green)", color:"white", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:saving||!stockQty?"not-allowed":"pointer", fontFamily:"var(--font-body)", opacity:saving||!stockQty?0.6:1 }}>{saving?"Saving...":"Update Stock"}</button>
            </div>
          </div>
        </div>
      )}

      <nav style={{ background:"var(--green)", padding:"0 28px", height:60, display:"flex", alignItems:"center", gap:16 }}>
        <Link href="/dashboard"><button style={{ background:"none", border:"none", color:"white", cursor:"pointer", fontSize:20 }}>&#8592;</button></Link>
        <div style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, color:"white", flex:1 }}>Inventory</div>
        {msg && <span style={{ color:"#a8d5b5", fontSize:13, fontWeight:600 }}>{msg}</span>}
      </nav>

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"28px 20px" }}>

        {lowStockItems.length > 0 && (
          <div style={{ background:"#fff8e8", border:"1px solid #f0d080", borderRadius:10, padding:"12px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <div style={{ fontSize:14 }}><strong>{lowStockItems.length} item{lowStockItems.length>1?"s":""} low on stock:</strong> {lowStockItems.map(i => i.name).join(", ")}</div>
          </div>
        )}

        <div style={{ display:"flex", background:"#e8e4de", borderRadius:10, padding:4, gap:4, marginBottom:24 }}>
          {(["items","add","movements"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); if(t==="movements" && userId) loadMovements(userId); }} style={{ flex:1, padding:"9px 4px", border:"none", borderRadius:7, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"var(--font-body)", background:tab===t?"white":"transparent", color:tab===t?"var(--green)":"var(--muted)", boxShadow:tab===t?"0 1px 3px rgba(0,0,0,0.1)":"none", textTransform:"uppercase", letterSpacing:"0.5px" }}>
              {t==="items"?"All Items":t==="add"?"Add Item":"Stock History"}
            </button>
          ))}
        </div>

        {tab === "items" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px,1fr))", gap:12, marginBottom:24 }}>
              {[
                ["📦", "Total Items", items.length.toString()],
                ["💰", "Inventory Value", "₦" + items.reduce((s,i) => s + Number(i.quantity)*Number(i.cost_price), 0).toLocaleString()],
                ["⚠️", "Low Stock", lowStockItems.length.toString()],
                ["📈", "Total Units", items.reduce((s,i) => s + Number(i.quantity), 0).toLocaleString()],
              ].map(([icon,label,val]) => (
                <div key={label} style={{ background:"white", borderRadius:12, border:"1px solid var(--border)", padding:"16px 18px" }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
                  <div style={{ fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{label}</div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700 }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ background:"white", borderRadius:12, border:"1px solid var(--border)", overflow:"hidden" }}>
              <div style={{ padding:"14px 20px", background:"#faf9f7", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)" }}>Inventory Items</div>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." style={{ ...inp, width:200, padding:"7px 12px" }} />
              </div>
              {loading ? <div style={{ padding:40, textAlign:"center", color:"var(--muted)" }}>Loading...</div> :
              filtered.length === 0 ? <div style={{ padding:40, textAlign:"center", color:"var(--muted)" }}>No items yet. Add your first item.</div> :
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:"#faf9f7" }}>
                      {["Name","SKU","Category","Cost","Price","Stock","Unit",""].map(h => (
                        <th key={h} style={{ padding:"10px 14px", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)", textAlign:"left", borderBottom:"1.5px solid var(--border)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(item => (
                      editingId === item.id ? (
                        <tr key={item.id} style={{ background:"#f5f9f7" }}>
                          <td colSpan={8} style={{ padding:16 }}>
                            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:12 }}>
                              <div><label style={lbl}>Name</label><input value={editForm.name??""} onChange={e => setEditForm({...editForm,name:e.target.value})} style={inp} /></div>
                              <div><label style={lbl}>SKU</label><input value={editForm.sku??""} onChange={e => setEditForm({...editForm,sku:e.target.value})} style={inp} /></div>
                              <div><label style={lbl}>Category</label><select value={editForm.category??""} onChange={e => setEditForm({...editForm,category:e.target.value})} style={inp}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                              <div><label style={lbl}>Cost Price</label><input type="number" min={0} value={editForm.cost_price??0} onChange={e => setEditForm({...editForm,cost_price:Number(e.target.value)})} style={inp} /></div>
                              <div><label style={lbl}>Selling Price</label><input type="number" min={0} value={editForm.selling_price??0} onChange={e => setEditForm({...editForm,selling_price:Number(e.target.value)})} style={inp} /></div>
                              <div><label style={lbl}>Low Stock Alert</label><input type="number" min={0} value={editForm.low_stock_alert??5} onChange={e => setEditForm({...editForm,low_stock_alert:Number(e.target.value)})} style={inp} /></div>
                              <div><label style={lbl}>Unit</label><select value={editForm.unit??""} onChange={e => setEditForm({...editForm,unit:e.target.value})} style={inp}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
                            </div>
                            <div style={{ display:"flex", gap:8 }}>
                              <button onClick={() => handleEdit(item.id)} disabled={saving} style={{ padding:"8px 18px", background:"var(--green)", color:"white", border:"none", borderRadius:7, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)" }}>Save</button>
                              <button onClick={() => setEditingId(null)} style={{ padding:"8px 14px", background:"#f5f2ed", color:"var(--text)", border:"1.5px solid var(--border)", borderRadius:7, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)" }}>Cancel</button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={item.id} style={{ borderBottom:"1px solid var(--border)" }}>
                          <td style={{ padding:"12px 14px" }}>
                            <div style={{ fontWeight:700, fontSize:14 }}>{item.name}</div>
                            {item.description && <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>{item.description}</div>}
                          </td>
                          <td style={{ padding:"12px 14px", fontSize:13, color:"var(--muted)", fontFamily:"monospace" }}>{item.sku||"—"}</td>
                          <td style={{ padding:"12px 14px", fontSize:13 }}>{item.category||"—"}</td>
                          <td style={{ padding:"12px 14px", fontSize:13, color:"var(--muted)" }}>{Number(item.cost_price).toLocaleString()}</td>
                          <td style={{ padding:"12px 14px", fontSize:13, fontWeight:600, color:"var(--green)" }}>{Number(item.selling_price).toLocaleString()}</td>
                          <td style={{ padding:"12px 14px" }}>
                            <span style={{ fontWeight:700, fontSize:14, color:Number(item.quantity)<=Number(item.low_stock_alert)?"#cc2222":"var(--text)" }}>{item.quantity}</span>
                            {Number(item.quantity)<=Number(item.low_stock_alert) && <span style={{ marginLeft:6, fontSize:10, background:"#fff0f0", color:"#cc2222", padding:"2px 6px", borderRadius:100, fontWeight:700 }}>LOW</span>}
                          </td>
                          <td style={{ padding:"12px 14px", fontSize:13, color:"var(--muted)" }}>{item.unit}</td>
                          <td style={{ padding:"12px 14px" }}>
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={() => setStockModal(item)} style={{ padding:"5px 10px", background:"var(--green-light)", color:"var(--green)", border:"none", borderRadius:6, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)" }}>Stock</button>
                              <button onClick={() => { setEditingId(item.id); setEditForm({...item}); }} style={{ padding:"5px 10px", background:"#e8f0ff", color:"#2255cc", border:"none", borderRadius:6, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)" }}>Edit</button>
                              <button onClick={() => handleDelete(item.id)} style={{ padding:"5px 10px", background:"#fff0f0", color:"#cc2222", border:"none", borderRadius:6, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)" }}>Del</button>
                            </div>
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>}
            </div>
          </div>
        )}

        {tab === "add" && (
          <div style={{ background:"white", borderRadius:12, border:"1px solid var(--border)", overflow:"hidden" }}>
            <div style={{ padding:"14px 20px", background:"#faf9f7", borderBottom:"1px solid var(--border)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)" }}>Add New Item</div>
            <div style={{ padding:24 }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16, marginBottom:16 }}>
                <div><label style={lbl}>Name *</label><input value={form.name} onChange={e => setForm({...form,name:e.target.value})} style={inp} placeholder="e.g. Office Chair" /></div>
                <div><label style={lbl}>SKU</label><input value={form.sku} onChange={e => setForm({...form,sku:e.target.value})} style={inp} placeholder="e.g. SKU-001" /></div>
                <div><label style={lbl}>Category</label><select value={form.category} onChange={e => setForm({...form,category:e.target.value})} style={inp}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label style={lbl}>Unit</label><select value={form.unit} onChange={e => setForm({...form,unit:e.target.value})} style={inp}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
                <div><label style={lbl}>Cost Price</label><input type="number" min={0} value={form.cost_price} onChange={e => setForm({...form,cost_price:Number(e.target.value)})} style={inp} /></div>
                <div><label style={lbl}>Selling Price</label><input type="number" min={0} value={form.selling_price} onChange={e => setForm({...form,selling_price:Number(e.target.value)})} style={inp} /></div>
                <div><label style={lbl}>Opening Stock</label><input type="number" min={0} value={form.quantity} onChange={e => setForm({...form,quantity:Number(e.target.value)})} style={inp} /></div>
                <div><label style={lbl}>Low Stock Alert</label><input type="number" min={0} value={form.low_stock_alert} onChange={e => setForm({...form,low_stock_alert:Number(e.target.value)})} style={inp} /></div>
              </div>
              <div style={{ marginBottom:20 }}><label style={lbl}>Description</label><input value={form.description} onChange={e => setForm({...form,description:e.target.value})} style={inp} placeholder="Optional description" /></div>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <button onClick={handleAdd} disabled={saving||!form.name.trim()} style={{ padding:"11px 28px", background:"var(--green)", color:"white", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:saving||!form.name.trim()?"not-allowed":"pointer", fontFamily:"var(--font-body)", opacity:saving||!form.name.trim()?0.6:1 }}>{saving?"Adding...":"Add to Inventory"}</button>
                {msg && <span style={{ color:"var(--green)", fontWeight:600, fontSize:14 }}>{msg}</span>}
              </div>
            </div>
          </div>
        )}

        {tab === "movements" && (
          <div style={{ background:"white", borderRadius:12, border:"1px solid var(--border)", overflow:"hidden" }}>
            <div style={{ padding:"14px 20px", background:"#faf9f7", borderBottom:"1px solid var(--border)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)" }}>Stock Movement History</div>
            {movLoading ? <div style={{ padding:40, textAlign:"center", color:"var(--muted)" }}>Loading...</div> :
            movements.length === 0 ? <div style={{ padding:40, textAlign:"center", color:"var(--muted)" }}>No movements yet.</div> :
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#faf9f7" }}>
                    {["Date","Item","Type","Qty","Reference","Note"].map(h => (
                      <th key={h} style={{ padding:"10px 14px", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)", textAlign:"left", borderBottom:"1.5px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => {
                    const item = items.find(i => i.id === m.inventory_id);
                    return (
                      <tr key={m.id} style={{ borderBottom:"1px solid var(--border)" }}>
                        <td style={{ padding:"10px 14px", fontSize:13, color:"var(--muted)" }}>{new Date(m.created_at).toLocaleDateString()}</td>
                        <td style={{ padding:"10px 14px", fontSize:13, fontWeight:600 }}>{item?.name || "—"}</td>
                        <td style={{ padding:"10px 14px" }}>
                          <span style={{ padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:700, background:m.type==="in"?"var(--green-light)":"#fff0f0", color:m.type==="in"?"var(--green)":"#cc2222" }}>{m.type==="in"?"IN":"OUT"}</span>
                        </td>
                        <td style={{ padding:"10px 14px", fontSize:13, fontWeight:600 }}>{m.quantity}</td>
                        <td style={{ padding:"10px 14px", fontSize:13, color:"var(--muted)" }}>{m.reference||"—"}</td>
                        <td style={{ padding:"10px 14px", fontSize:13, color:"var(--muted)" }}>{m.note||"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}
`, { encoding: 'utf8' });
console.log('Done inventory page');