"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { loadInvoices, loadBusiness, attachAutoSync, isOnline } from "@/lib/offline/sync";
import Link from "next/link";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: "#f0f0f0", text: "#888" },
  sent:      { bg: "#e8f0ff", text: "#2255cc" },
  paid:      { bg: "#e8f5ef", text: "#1a6b4a" },
  overdue:   { bg: "#fff0f0", text: "#cc2222" },
  cancelled: { bg: "#f5f5f5", text: "#aaa" },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [staffBusinessOwnerId, setStaffBusinessOwnerId] = useState<string|null>(null);
  const [isMarketer, setIsMarketer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [activeMode, setActiveMode] = useState<"own"|string>("own");
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [reportType, setReportType] = useState<"monthly"|"annual">("monthly");
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportFormat, setReportFormat] = useState<"pdf"|"csv">("pdf");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showReportPanel, setShowReportPanel] = useState(false);

  const load = useCallback(async (userId: string) => {
    setLoading(true);
    const [invData, bizData] = await Promise.all([
      loadInvoices(userId),
      loadBusiness(userId),
    ]);
    setInvoices(invData ?? []);
    setBusiness(bizData);
    setLoading(false);
  }, []);

  useEffect(() => {
    setOnline(isOnline());
    attachAutoSync();
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (!sessionData.session?.user) { router.push("/"); return; }
      const u = sessionData.session.user;
      setUser(u);
      if (u.email === "dinfadashe@gmail.com") setIsAdmin(true);

      const { data: memberData } = await supabase
        .from("team_members")
        .select("owner_user_id, status")
        .eq("member_user_id", u.id)
        .eq("status", "active")
        .single();

      if (memberData) {
        setIsStaff(true);
        setStaffBusinessOwnerId(memberData.owner_user_id);
        load(memberData.owner_user_id);
      } else {
        load(u.id);
      }

      fetch("/api/marketer?user_id=" + u.id)
        .then(r => r.json())
        .then(d => { if (d.marketer) setIsMarketer(true); })
        .catch(() => {});

      fetch("/api/team/memberships?user_id=" + u.id)
        .then(r => r.json())
        .then(d => { setMemberships(d.memberships ?? []); })
        .catch(() => {});
    });

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [router, load]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const generateReport = async () => {
    if (!user) return;
    setGeneratingReport(true);
    const params = new URLSearchParams({
      user_id: isStaff && staffBusinessOwnerId ? staffBusinessOwnerId : user.id,
      type: reportType,
      month: String(reportMonth),
      year: String(reportYear),
      format: reportFormat,
    });
    const res = await fetch("/api/reports?" + params.toString());
    if (reportFormat === "csv") {
      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `bizdoc-report-${reportYear}${reportType === "monthly" ? "-" + String(reportMonth + 1).padStart(2, "0") : ""}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } else {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `bizdoc-report-${reportYear}${reportType === "monthly" ? "-" + String(reportMonth + 1).padStart(2, "0") : ""}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    }
    setGeneratingReport(false);
  };

  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalPending = invoices.filter(i => i.status === "sent").reduce((s, i) => s + i.total, 0);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const navBtnStyle = { background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" } as const;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <style>{`
        .dash-nav-links { display: flex; gap: 8px; align-items: center; flex-wrap: nowrap; }
        .dash-hamburger { display: none !important; }
        .dash-mobile-menu { display: none; }
        @media (max-width: 900px) {
          .dash-nav-links { display: none !important; }
          .dash-hamburger { display: flex !important; }
          .dash-mobile-menu.open { display: flex !important; }
        }
      `}</style>

      {!online && (
        <div style={{ background: "#1a1a2e", color: "white", padding: "6px 16px", fontSize: 12, textAlign: "center", fontWeight: 600 }}>
          📡 You are offline — viewing saved data. Changes will sync when you reconnect.
        </div>
      )}

      <nav style={{ background: "var(--green)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ padding: "0 16px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="BizDoc" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6, background: "white", padding: 2 }} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "white" }}>
              {business?.name || "BizDoc"}
            </div>
          </div>

          <div className="dash-nav-links">
            <Link href="/settings?tab=catalog"><button style={navBtnStyle}>Catalog</button></Link>
            <Link href="/inventory"><button style={navBtnStyle}>Inventory</button></Link>
            <Link href="/expenses"><button style={navBtnStyle}>Expenses</button></Link>
            <Link href="/stats"><button style={navBtnStyle}>Statistics</button></Link>
            <Link href="/subscribe"><button style={navBtnStyle}>Subscription</button></Link>
            <Link href="/settings"><button style={navBtnStyle}>Settings</button></Link>
            <Link href="/support"><button style={navBtnStyle}>Support</button></Link>
            {isMarketer && <Link href="/marketer"><button style={{ ...navBtnStyle, background: "#c9a84c", color: "#1a1a2e", fontWeight: 700 }}>Marketer</button></Link>}
            {isAdmin && <Link href="/admin"><button style={{ ...navBtnStyle, background: "#1a1a2e", fontWeight: 700 }}>Admin</button></Link>}
            {memberships.length > 0 && (
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowSwitcher(!showSwitcher)} style={{ ...navBtnStyle, display: "flex", alignItems: "center", gap: 5 }}>⇄ Switch Account</button>
                {showSwitcher && (
                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, background: "white", borderRadius: 10, border: "1px solid var(--border)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 200, minWidth: 240, overflow: "hidden" }}>
                    <div style={{ padding: "8px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Switch Account</div>
                    <div onClick={() => { setActiveMode("own"); setShowSwitcher(false); if (user) load(user.id); }} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: activeMode === "own" ? "var(--green-light)" : "white", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white" }}>B</div>
                      <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>My Business</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Owner account</div></div>
                      {activeMode === "own" && <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span>}
                    </div>
                    {memberships.map((m: any) => (
                      <div key={m.id} onClick={() => { setActiveMode(m.id); setShowSwitcher(false); load(m.owner_user_id); }} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: activeMode === m.id ? "var(--green-light)" : "white", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e8f0ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#2255cc" }}>{m.businesses?.name?.[0]?.toUpperCase() || "B"}</div>
                        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{m.businesses?.name || "Business"}</div><div style={{ fontSize: 11, color: "var(--muted)", textTransform: "capitalize" }}>{m.role}</div></div>
                        {activeMode === m.id && <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button onClick={signOut} style={navBtnStyle}>Sign Out</button>
          </div>

          <button className="dash-hamburger" onClick={() => setMenuOpen(!menuOpen)} style={{ ...navBtnStyle, display: "none", fontSize: 20 }}>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        <div className={"dash-mobile-menu" + (menuOpen ? " open" : "")} style={{ display: "none", flexDirection: "column", background: "#163d25", padding: "12px 20px", gap: 4, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          {[
            { href: "/settings?tab=catalog", label: "Catalog" },
            { href: "/inventory", label: "Inventory" },
            { href: "/expenses", label: "Expenses" },
            { href: "/stats", label: "Statistics" },
            { href: "/subscribe", label: "Subscription" },
            { href: "/settings", label: "Settings" },
            { href: "/support", label: "Support" },
          ].map(({ href, label }) => (
            <Link key={label} href={href} onClick={() => setMenuOpen(false)}>
              <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "white", padding: "12px 8px", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{label}</button>
            </Link>
          ))}
          {isMarketer && <Link href="/marketer" onClick={() => setMenuOpen(false)}><button style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#c9a84c", padding: "12px 8px", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>⭐ Marketer Dashboard</button></Link>}
          {isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)}><button style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#a8d5b5", padding: "12px 8px", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>🛡 Admin Dashboard</button></Link>}
          {memberships.length > 0 && memberships.map((m: any) => (
            <div key={m.id} onClick={() => { setActiveMode(m.id); setMenuOpen(false); load(m.owner_user_id); }} style={{ padding: "12px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 15 }}>⇄</span>
              <div><div style={{ color: "white", fontSize: 15 }}>{m.businesses?.name}</div><div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Switch to this team</div></div>
            </div>
          ))}
          <button onClick={() => { setMenuOpen(false); signOut(); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#ff8a8a", padding: "12px 8px", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", marginTop: 4 }}>Sign Out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        {business && !business.onboarding_complete && (
          <div style={{ background: "#fff8e8", border: "1px solid #f0d080", borderRadius: 10, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 14, color: "#7a5500" }}><strong>Connect your payout account</strong> — add your bank details so invoice payments reach you.</div>
            <Link href="/settings?tab=payouts"><button style={{ background: "#b36000", color: "white", border: "none", padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Set Up Payouts</button></Link>
          </div>
        )}

        {!isStaff && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
            {[
              { label: "Total Invoices", value: String(invoices.length), mono: false },
              { label: "Revenue Collected", value: formatCurrency(totalPaid), mono: true },
              { label: "Pending Payment", value: formatCurrency(totalPending), mono: true },
            ].map((s) => (
              <div key={s.label} style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: "20px 22px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--muted)", marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: s.mono ? "var(--font-body)" : "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--green)" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {!isStaff && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 24, overflow: "hidden" }}>
            <div onClick={() => setShowReportPanel(!showReportPanel)} style={{ padding: "14px 22px", background: "#faf9f7", borderBottom: showReportPanel ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Sales Reports</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{showReportPanel ? "Hide" : "Download monthly or annual reports"}</div>
            </div>
            {showReportPanel && (
              <div style={{ padding: "20px 22px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 6 }}>Type</label>
                    <select value={reportType} onChange={e => setReportType(e.target.value as any)} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 7, fontSize: 14, fontFamily: "var(--font-body)" }}>
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                  {reportType === "monthly" && (
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 6 }}>Month</label>
                      <select value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 7, fontSize: 14, fontFamily: "var(--font-body)" }}>
                        {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 6 }}>Year</label>
                    <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 7, fontSize: 14, fontFamily: "var(--font-body)" }}>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 6 }}>Format</label>
                    <select value={reportFormat} onChange={e => setReportFormat(e.target.value as any)} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 7, fontSize: 14, fontFamily: "var(--font-body)" }}>
                      <option value="pdf">PDF</option>
                      <option value="csv">CSV / Excel</option>
                    </select>
                  </div>
                </div>
                <button onClick={generateReport} disabled={generatingReport} style={{ padding: "10px 24px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: generatingReport ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", opacity: generatingReport ? 0.7 : 1 }}>
                  {generatingReport ? "Generating..." : `Download ${reportType === "annual" ? reportYear + " Annual" : MONTHS[reportMonth] + " " + reportYear} Report`}
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700 }}>Invoices</h1>
          <Link href="/invoices/new">
            <button style={{ background: "var(--green)", color: "white", border: "none", padding: "10px 22px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>+ New Invoice</button>
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading...</div>
        ) : invoices.length === 0 ? (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 8 }}>No invoices yet</div>
            <div style={{ color: "var(--muted)", marginBottom: 20 }}>Create your first invoice to get started.</div>
            <Link href="/invoices/new"><button style={{ background: "var(--green)", color: "white", border: "none", padding: "10px 22px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Create Invoice</button></Link>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            {invoices.map((inv, idx) => {
              const sc = STATUS_COLORS[inv.status] ?? STATUS_COLORS.draft;
              return (
                <Link key={inv.id} href={"/invoices/" + inv.id}>
                  <div style={{ padding: "16px 20px", borderBottom: idx < invoices.length - 1 ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "background 0.12s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--cream)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3, display: "flex", alignItems: "center", gap: 8 }}>
                        {inv.invoice_number}
                        {inv._pendingSync && <span style={{ fontSize: 10, background: "#fff8e8", color: "#b36000", padding: "2px 7px", borderRadius: 10, fontWeight: 700, border: "1px solid #f0d080" }}>PENDING SYNC</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {inv.client_name || "No client"} · {new Date(inv.issue_date || inv.created_at).toDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{formatCurrency(inv.total, inv.currency)}</div>
                      {inv.due_date && <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Due {new Date(inv.due_date).toDateString()}</div>}
                      <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", background: sc.bg, color: sc.text }}>{inv.status}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
