const fs = require('fs');

fs.mkdirSync('app/expenses', { recursive: true });
fs.writeFileSync('app/expenses/page.tsx', `"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CURRENCIES } from "@/lib/currencies";

const CATEGORIES = ["Rent","Salaries","Utilities","Supplies","Transport","Marketing","Equipment","Software","Food","Legal","Tax","Other"];

interface Expense {
  id: string; title: string; category: string; amount: number;
  currency: string; date: string; note: string; added_by: string;
}

export default function Expenses() {
  const router = useRouter();
  const [userId, setUserId] = useState<string|null>(null);
  const [ownerUserId, setOwnerUserId] = useState<string|null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list"|"add">("list");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0,7));
  const [form, setForm] = useState({
    title: "", category: "Other", amount: 0, currency: "NGN",
    date: new Date().toISOString().split("T")[0], note: ""
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return; }
      setUserId(data.user.id);
      // Check if staff member
      const { data: teamData } = await supabase.from("team_members").select("owner_user_id").eq("member_user_id", data.user.id).single();
      const ownerId = teamData?.owner_user_id || data.user.id;
      setOwnerUserId(ownerId);
      await loadExpenses(ownerId, filterMonth);
    });
  }, [router]);

  const loadExpenses = async (uid: string, month: string) => {
    setLoading(true);
    const from = month + "-01";
    const to = month + "-31";
    const res = await fetch(\`/api/expenses?user_id=\${uid}&from=\${from}&to=\${to}\`);
    const d = await res.json();
    setExpenses(d.expenses ?? []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!userId || !ownerUserId || !form.title.trim() || !form.amount) return;
    setSaving(true);
    const res = await fetch("/api/expenses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, user_id: ownerUserId, added_by: userId })
    });
    const d = await res.json();
    setSaving(false);
    if (d.expense) {
      setExpenses(prev => [d.expense, ...prev]);
      setForm({ title:"", category:"Other", amount:0, currency:"NGN", date: new Date().toISOString().split("T")[0], note:"" });
      setMsg("Expense added!"); setTimeout(() => setMsg(""), 2000);
      setTab("list");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await fetch("/api/expenses?id=" + id, { method: "DELETE" });
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const byCategory = CATEGORIES.map(cat => ({
    cat, total: expenses.filter(e => e.category === cat).reduce((s,e) => s + Number(e.amount), 0)
  })).filter(c => c.total > 0).sort((a,b) => b.total - a.total);

  const inp = { width:"100%", padding:"9px 12px", border:"1.5px solid var(--border)", borderRadius:7, fontSize:14, outline:"none", fontFamily:"var(--font-body)" } as const;
  const lbl = { display:"block" as const, fontSize:11, fontWeight:700 as const, textTransform:"uppercase" as const, letterSpacing:"0.8px", color:"var(--muted)", marginBottom:5 };

  return (
    <div style={{ minHeight:"100vh", background:"var(--cream)" }}>
      <nav style={{ background:"var(--green)", padding:"0 28px", height:60, display:"flex", alignItems:"center", gap:16 }}>
        <Link href="/dashboard"><button style={{ background:"none", border:"none", color:"white", cursor:"pointer", fontSize:20 }}>&#8592;</button></Link>
        <div style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, color:"white", flex:1 }}>Expenses</div>
        {msg && <span style={{ color:"#a8d5b5", fontSize:13, fontWeight:600 }}>{msg}</span>}
      </nav>
      <div style={{ maxWidth:900, margin:"0 auto", padding:"28px 20px" }}>

        <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ display:"flex", background:"#e8e4de", borderRadius:10, padding:4, gap:4 }}>
            {(["list","add"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding:"9px 20px", border:"none", borderRadius:7, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"var(--font-body)", background:tab===t?"white":"transparent", color:tab===t?"var(--green)":"var(--muted)", boxShadow:tab===t?"0 1px 3px rgba(0,0,0,0.1)":"none", textTransform:"uppercase", letterSpacing:"0.5px" }}>
                {t==="list"?"All Expenses":"Add Expense"}
              </button>
            ))}
          </div>
          <input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); if(ownerUserId) loadExpenses(ownerUserId, e.target.value); }} style={{ ...inp, width:160 }} />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
          {[
            ["💸","Total Expenses","₦"+totalExpenses.toLocaleString()],
            ["📂","Categories",byCategory.length.toString()],
            ["📋","Transactions",expenses.length.toString()],
            ["📅","Month",new Date(filterMonth+"-01").toLocaleString("default",{month:"long",year:"numeric"})],
          ].map(([icon,label,val]) => (
            <div key={label} style={{ background:"white", borderRadius:12, border:"1px solid var(--border)", padding:"16px 18px" }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{label}</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:700 }}>{val}</div>
            </div>
          ))}
        </div>

        {tab === "list" && (
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20 }}>
            <div style={{ background:"white", borderRadius:12, border:"1px solid var(--border)", overflow:"hidden" }}>
              <div style={{ padding:"14px 20px", background:"#faf9f7", borderBottom:"1px solid var(--border)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)" }}>Expense Records</div>
              {loading ? <div style={{ padding:40, textAlign:"center", color:"var(--muted)" }}>Loading...</div> :
              expenses.length === 0 ? <div style={{ padding:40, textAlign:"center", color:"var(--muted)" }}>No expenses for this month.</div> :
              <div>
                {expenses.map(exp => (
                  <div key={exp.id} style={{ padding:"14px 20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:"#f5f2ed", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                      {{"Rent":"🏠","Salaries":"👥","Utilities":"⚡","Supplies":"📦","Transport":"🚗","Marketing":"📣","Equipment":"🔧","Software":"💻","Food":"🍽️","Legal":"⚖️","Tax":"📊","Other":"💰"}[exp.category]||"💰"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14 }}>{exp.title}</div>
                      <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{exp.category} · {new Date(exp.date).toLocaleDateString()}{exp.note ? " · " + exp.note : ""}</div>
                    </div>
                    <div style={{ fontWeight:700, fontSize:15, color:"#cc2222" }}>-{exp.currency} {Number(exp.amount).toLocaleString()}</div>
                    <button onClick={() => handleDelete(exp.id)} style={{ padding:"5px 10px", background:"#fff0f0", color:"#cc2222", border:"none", borderRadius:6, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)" }}>Del</button>
                  </div>
                ))}
              </div>}
            </div>
            <div style={{ background:"white", borderRadius:12, border:"1px solid var(--border)", overflow:"hidden", alignSelf:"start" }}>
              <div style={{ padding:"14px 20px", background:"#faf9f7", borderBottom:"1px solid var(--border)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)" }}>By Category</div>
              <div style={{ padding:16 }}>
                {byCategory.length === 0 ? <div style={{ padding:20, textAlign:"center", color:"var(--muted)", fontSize:13 }}>No data</div> :
                byCategory.map(({ cat, total }) => (
                  <div key={cat} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
                      <span style={{ fontWeight:600 }}>{cat}</span>
                      <span style={{ color:"var(--muted)" }}>₦{total.toLocaleString()}</span>
                    </div>
                    <div style={{ height:6, borderRadius:100, background:"#f0ece6", overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:100, background:"var(--green)", width:(total/totalExpenses*100)+"%", transition:"width 0.3s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "add" && (
          <div style={{ background:"white", borderRadius:12, border:"1px solid var(--border)", overflow:"hidden" }}>
            <div style={{ padding:"14px 20px", background:"#faf9f7", borderBottom:"1px solid var(--border)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)" }}>Add New Expense</div>
            <div style={{ padding:24 }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16, marginBottom:16 }}>
                <div><label style={lbl}>Title *</label><input value={form.title} onChange={e => setForm({...form,title:e.target.value})} style={inp} placeholder="e.g. Office Rent" /></div>
                <div><label style={lbl}>Category</label><select value={form.category} onChange={e => setForm({...form,category:e.target.value})} style={inp}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label style={lbl}>Amount *</label><input type="number" min={0} value={form.amount} onChange={e => setForm({...form,amount:Number(e.target.value)})} style={inp} /></div>
                <div><label style={lbl}>Currency</label><select value={form.currency} onChange={e => setForm({...form,currency:e.target.value})} style={inp}>{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}</select></div>
                <div><label style={lbl}>Date</label><input type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})} style={inp} /></div>
              </div>
              <div style={{ marginBottom:20 }}><label style={lbl}>Note (optional)</label><input value={form.note} onChange={e => setForm({...form,note:e.target.value})} style={inp} placeholder="Additional details..." /></div>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <button onClick={handleAdd} disabled={saving||!form.title.trim()||!form.amount} style={{ padding:"11px 28px", background:"var(--green)", color:"white", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:"var(--font-body)", opacity:saving?0.6:1 }}>{saving?"Adding...":"Add Expense"}</button>
                {msg && <span style={{ color:"var(--green)", fontWeight:600, fontSize:14 }}>{msg}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`, { encoding: 'utf8' });
console.log('Done expenses page');