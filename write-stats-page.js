const fs = require('fs');

fs.mkdirSync('app/stats', { recursive: true });
fs.writeFileSync('app/stats/page.tsx', `"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface MonthData { month:number; label:string; revenue:number; expenses:number; }
interface Stats {
  totalRevenue:number; totalExpenses:number; grossProfit:number;
  totalOutstanding:number; invoiceCount:number; paidCount:number;
  months:MonthData[]; expenseByCategory:Record<string,number>;
  lowStock:any[]; inventoryValue:number; topProducts:any[];
}

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats|null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return; }
      const res = await fetch(\`/api/stats?user_id=\${data.user.id}&year=\${year}\`);
      const d = await res.json();
      setStats(d);
      setLoading(false);
    });
  }, [router, year]);

  if (loading) return <div style={{ padding:60, textAlign:"center", color:"var(--muted)" }}>Loading statistics...</div>;
  if (!stats) return null;

  const maxBar = Math.max(...stats.months.map(m => Math.max(m.revenue, m.expenses)), 1);
  const profitMargin = stats.totalRevenue > 0 ? ((stats.grossProfit / stats.totalRevenue) * 100).toFixed(1) : "0";
  const isProfit = stats.grossProfit >= 0;
  const totalExpCat = Object.values(stats.expenseByCategory).reduce((s,v) => s+v, 0) || 1;

  return (
    <div style={{ minHeight:"100vh", background:"var(--cream)" }}>
      <nav style={{ background:"var(--green)", padding:"0 28px", height:60, display:"flex", alignItems:"center", gap:16 }}>
        <Link href="/dashboard"><button style={{ background:"none", border:"none", color:"white", cursor:"pointer", fontSize:20 }}>&#8592;</button></Link>
        <div style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, color:"white", flex:1 }}>Business Statistics</div>
        <select value={year} onChange={e => setYear(e.target.value)} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"white", padding:"6px 12px", borderRadius:6, fontSize:14, cursor:"pointer" }}>
          {[2024,2025,2026,2027].map(y => <option key={y} value={y} style={{ color:"black" }}>{y}</option>)}
        </select>
      </nav>
      <div style={{ maxWidth:1000, margin:"0 auto", padding:"28px 20px" }}>

        {/* Key metrics */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:24 }}>
          {[
            ["💰","Total Revenue","₦"+stats.totalRevenue.toLocaleString(),"var(--green)"],
            ["💸","Total Expenses","₦"+stats.totalExpenses.toLocaleString(),"#cc2222"],
            [isProfit?"📈":"📉",isProfit?"Net Profit":"Net Loss","₦"+Math.abs(stats.grossProfit).toLocaleString(),isProfit?"var(--green)":"#cc2222"],
            ["⏳","Outstanding","₦"+stats.totalOutstanding.toLocaleString(),"#b36000"],
            ["📄","Invoices",stats.invoiceCount.toString(),"var(--text)"],
            ["✅","Paid",stats.paidCount.toString(),"var(--green)"],
            ["📊","Profit Margin",profitMargin+"%",isProfit?"var(--green)":"#cc2222"],
            ["📦","Stock Value","₦"+stats.inventoryValue.toLocaleString(),"#2255cc"],
          ].map(([icon,label,val,color]) => (
            <div key={label} style={{ background:"white", borderRadius:12, border:"1px solid var(--border)", padding:"16px 18px" }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{label}</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, color:color as string }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Revenue vs Expenses Chart */}
        <div style={{ background:"white", borderRadius:12, border:"1px solid var(--border)", padding:24, marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)", marginBottom:20 }}>Revenue vs Expenses — {year}</div>
          <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:12, height:12, borderRadius:3, background:"var(--green)" }}/><span style={{ fontSize:12, color:"var(--muted)" }}>Revenue</span></div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:12, height:12, borderRadius:3, background:"#ff6b6b" }}/><span style={{ fontSize:12, color:"var(--muted)" }}>Expenses</span></div>
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:200 }}>
            {stats.months.map(m => (
              <div key={m.month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                <div style={{ width:"100%", display:"flex", gap:2, alignItems:"flex-end", height:160 }}>
                  <div style={{ flex:1, background:"var(--green)", borderRadius:"4px 4px 0 0", height:Math.max(2,(m.revenue/maxBar)*160)+"px", opacity:0.85, minHeight:m.revenue>0?4:0, transition:"height 0.3s" }} title={"Revenue: ₦"+m.revenue.toLocaleString()} />
                  <div style={{ flex:1, background:"#ff6b6b", borderRadius:"4px 4px 0 0", height:Math.max(2,(m.expenses/maxBar)*160)+"px", opacity:0.85, minHeight:m.expenses>0?4:0, transition:"height 0.3s" }} title={"Expenses: ₦"+m.expenses.toLocaleString()} />
                </div>
                <div style={{ fontSize:10, color:"var(--muted)", textAlign:"center" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
          {/* Top Products */}
          <div style={{ background:"white", borderRadius:12, border:"1px solid var(--border)", overflow:"hidden" }}>
            <div style={{ padding:"14px 20px", background:"#faf9f7", borderBottom:"1px solid var(--border)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)" }}>Top Selling Products</div>
            <div style={{ padding:16 }}>
              {stats.topProducts.length === 0 ? <div style={{ padding:20, textAlign:"center", color:"var(--muted)", fontSize:13 }}>No sales data yet</div> :
              stats.topProducts.map((p, i) => (
                <div key={p.name} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ width:28, height:28, borderRadius:50, background:"var(--green-light)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"var(--green)", flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>
                    <div style={{ fontSize:11, color:"var(--muted)" }}>Qty: {p.qty}</div>
                  </div>
                  <div style={{ fontWeight:700, fontSize:13, color:"var(--green)" }}>₦{Number(p.revenue).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Breakdown */}
          <div style={{ background:"white", borderRadius:12, border:"1px solid var(--border)", overflow:"hidden" }}>
            <div style={{ padding:"14px 20px", background:"#faf9f7", borderBottom:"1px solid var(--border)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)" }}>Expense Breakdown</div>
            <div style={{ padding:16 }}>
              {Object.keys(stats.expenseByCategory).length === 0 ? <div style={{ padding:20, textAlign:"center", color:"var(--muted)", fontSize:13 }}>No expenses yet</div> :
              Object.entries(stats.expenseByCategory).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => (
                <div key={cat} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
                    <span style={{ fontWeight:600 }}>{cat}</span>
                    <span style={{ color:"var(--muted)" }}>₦{Number(amt).toLocaleString()} ({(amt/totalExpCat*100).toFixed(0)}%)</span>
                  </div>
                  <div style={{ height:6, borderRadius:100, background:"#f0ece6", overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:100, background:"#ff6b6b", width:(amt/totalExpCat*100)+"%", transition:"width 0.3s" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        {stats.lowStock.length > 0 && (
          <div style={{ background:"#fff8e8", border:"1px solid #f0d080", borderRadius:12, padding:20, marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"#7a5500", marginBottom:12 }}>⚠️ Low Stock Items</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:10 }}>
              {stats.lowStock.map(item => (
                <div key={item.id} style={{ background:"white", borderRadius:8, padding:"10px 14px", border:"1px solid #f0d080" }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{item.name}</div>
                  <div style={{ fontSize:12, color:"#cc2222", marginTop:2 }}>Only {item.quantity} {item.unit || "units"} left (alert: {item.low_stock_alert})</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Profit/Loss Table */}
        <div style={{ background:"white", borderRadius:12, border:"1px solid var(--border)", overflow:"hidden" }}>
          <div style={{ padding:"14px 20px", background:"#faf9f7", borderBottom:"1px solid var(--border)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)" }}>Monthly Profit / Loss</div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#faf9f7" }}>
                  {["Month","Revenue","Expenses","Profit/Loss","Margin"].map(h => (
                    <th key={h} style={{ padding:"10px 16px", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)", textAlign:"left", borderBottom:"1.5px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.months.filter(m => m.revenue > 0 || m.expenses > 0).map(m => {
                  const profit = m.revenue - m.expenses;
                  const margin = m.revenue > 0 ? (profit/m.revenue*100).toFixed(0) : "—";
                  return (
                    <tr key={m.month} style={{ borderBottom:"1px solid var(--border)" }}>
                      <td style={{ padding:"12px 16px", fontWeight:600, fontSize:14 }}>{m.label}</td>
                      <td style={{ padding:"12px 16px", fontSize:13, color:"var(--green)", fontWeight:600 }}>₦{m.revenue.toLocaleString()}</td>
                      <td style={{ padding:"12px 16px", fontSize:13, color:"#cc2222" }}>₦{m.expenses.toLocaleString()}</td>
                      <td style={{ padding:"12px 16px", fontSize:13, fontWeight:700, color:profit>=0?"var(--green)":"#cc2222" }}>{profit>=0?"+":""}₦{profit.toLocaleString()}</td>
                      <td style={{ padding:"12px 16px", fontSize:13, color:profit>=0?"var(--green)":"#cc2222" }}>{margin !== "—" ? margin+"%" : "—"}</td>
                    </tr>
                  );
                })}
                <tr style={{ background:"#faf9f7", borderTop:"2px solid var(--green)" }}>
                  <td style={{ padding:"12px 16px", fontWeight:700, fontSize:14 }}>Total {year}</td>
                  <td style={{ padding:"12px 16px", fontSize:14, color:"var(--green)", fontWeight:700 }}>₦{stats.totalRevenue.toLocaleString()}</td>
                  <td style={{ padding:"12px 16px", fontSize:14, color:"#cc2222", fontWeight:700 }}>₦{stats.totalExpenses.toLocaleString()}</td>
                  <td style={{ padding:"12px 16px", fontSize:14, fontWeight:700, color:isProfit?"var(--green)":"#cc2222" }}>{isProfit?"+":""}₦{stats.grossProfit.toLocaleString()}</td>
                  <td style={{ padding:"12px 16px", fontSize:14, fontWeight:700, color:isProfit?"var(--green)":"#cc2222" }}>{profitMargin}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
`, { encoding: 'utf8' });
console.log('Done stats page');