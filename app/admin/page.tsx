"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ADMIN_EMAIL = "dinfadashe@gmail.com";
const COMMISSION_RATE = 30;

export default function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string|null>(null);
  const [tab, setTab] = useState<"overview"|"marketers"|"referrals"|"earnings"|"support">("overview");
  const [stats, setStats] = useState<any>(null);
  const [marketers, setMarketers] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [payingMonth, setPayingMonth] = useState<string|null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any|null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [adminReply, setAdminReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [selectedMarketer, setSelectedMarketer] = useState<string|null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push("/"); return; }
      if (data.session.user.email !== ADMIN_EMAIL) { router.push("/dashboard"); return; }
      setToken(data.session.access_token);
      await loadAll(data.session.access_token);
    });
  }, [router]);

  const api = async (url: string, opts?: RequestInit) => {
    const t = token || (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(url, { ...opts, headers: { ...((opts?.headers) as any || {}), "Authorization": "Bearer " + t, "Content-Type": "application/json" } });
    return res.json();
  };

  const loadAll = async (t?: string) => {
    setLoading(true);
    const headers = { "Authorization": "Bearer " + t, "Content-Type": "application/json" };
    const [s, m, r, e] = await Promise.all([
      fetch("/api/admin?type=stats", { headers }).then(r => r.json()),
      fetch("/api/admin?type=marketers", { headers }).then(r => r.json()),
      fetch("/api/admin?type=referrals", { headers }).then(r => r.json()),
      fetch("/api/admin?type=earnings", { headers }).then(r => r.json()),
    ]);
    setStats(s);
    setMarketers(m.marketers ?? []);
    setReferrals(r.referrals ?? []);
    setEarnings(e.earnings ?? []);
    const session = await supabase.auth.getSession();
    const adminId = session.data.session?.user?.id;
    const tRes = await fetch("/api/support?user_id=" + adminId + "&admin=1", { headers });
    const tData = await tRes.json();
    setTickets(tData.tickets ?? []);
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setInviteMsg(""); setInviteError("");
    const d = await api("/api/admin", { method: "POST", body: JSON.stringify({ action: "invite_marketer", email: inviteEmail.trim() }) });
    setInviting(false);
    if (d.marketer) {
      setInviteMsg("Marketer added! Referral code: " + d.marketer.referral_code);
      setInviteEmail("");
      await loadAll();
    } else setInviteError(d.error || "Failed to add marketer");
  };

  const handleMarkPaid = async (marketer_id: string, month: string) => {
    setPayingMonth(month + marketer_id);
    const d = await api("/api/admin", { method: "POST", body: JSON.stringify({ action: "mark_paid", marketer_id, month }) });
    setPayingMonth(null);
    if (d.ok) { await loadAll(); }
  };

  const handleRemove = async (marketer_id: string) => {
    if (!confirm("Deactivate this marketer?")) return;
    await api("/api/admin", { method: "POST", body: JSON.stringify({ action: "remove_marketer", marketer_id }) });
    await loadAll();
  };

  // Group earnings by marketer and month
  const earningsByMarketer: Record<string, any> = {};
  earnings.forEach(e => {
    if (!earningsByMarketer[e.marketer_id]) earningsByMarketer[e.marketer_id] = {};
    const key = e.marketer_id + e.month;
    if (!earningsByMarketer[e.marketer_id][e.month]) {
      earningsByMarketer[e.marketer_id][e.month] = { month: e.month, total: 0, paid: true, items: [], marketer_id: e.marketer_id, marketerEmail: e.marketers?.email };
    }
    earningsByMarketer[e.marketer_id][e.month].total += Number(e.commission_amount);
    earningsByMarketer[e.marketer_id][e.month].paid = earningsByMarketer[e.marketer_id][e.month].paid && e.paid;
    earningsByMarketer[e.marketer_id][e.month].items.push(e);
  });

  const openAdminTicket = async (ticket: any) => {
    setActiveTicket(ticket);
    const t = token || (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch("/api/support?user_id=" + ticket.user_id + "&ticket_id=" + ticket.id + "&admin=1&viewer=" + (await supabase.auth.getSession()).data.session?.user.id, {
      headers: { "Authorization": "Bearer " + t }
    });
    const d = await res.json();
    setTicketMessages(d.messages ?? []);
  };

  const handleAdminReply = async (ticketId: string) => {
    if (!adminReply.trim()) return;
    setSendingReply(true);
    const session = (await supabase.auth.getSession()).data.session;
    await fetch("/api/support", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_message", user_id: session?.user.id, ticket_id: ticketId, message: adminReply, admin: "1" })
    });
    setSendingReply(false);
    setAdminReply("");
    const res = await fetch("/api/support?user_id=" + activeTicket.user_id + "&ticket_id=" + ticketId + "&admin=1&viewer=" + session?.user.id);
    const d = await res.json();
    setTicketMessages(d.messages ?? []);
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: "in_progress", updated_at: new Date().toISOString() } : t));
  };

  const handleResolve = async (ticketId: string) => {
    await fetch("/api/support", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", ticket_id: ticketId, status: "resolved", user_id: (await supabase.auth.getSession()).data.session?.user.id })
    });
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: "resolved" } : t));
    if (activeTicket?.id === ticketId) setActiveTicket((prev: any) => ({ ...prev, status: "resolved" }));
  };

  const allMonthlyRows: any[] = [];
  Object.values(earningsByMarketer).forEach((months: any) => {
    Object.values(months).forEach((row: any) => allMonthlyRows.push(row));
  });
  allMonthlyRows.sort((a, b) => b.month.localeCompare(a.month));

  const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "var(--font-body)" } as const;

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>Loading admin dashboard...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <nav style={{ background: "#1a1a2e", padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/dashboard"><button style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20 }}>&#8592;</button></Link>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white", flex: 1 }}>&#128737; Admin Dashboard</div>
        <div style={{ background: "rgba(255,255,255,0.1)", padding: "4px 12px", borderRadius: 100, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>BizDoc Admin</div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
          {[
            ["👥", "Marketers", stats?.totalMarketers ?? 0, "#2255cc"],
            ["🔗", "Referrals", stats?.totalReferrals ?? 0, "var(--green)"],
            ["✅", "Active Subs", stats?.activeSubscriptions ?? 0, "var(--green)"],
            ["💰", "Total Commissions", "₦" + (stats?.totalCommissions ?? 0).toLocaleString(), "#7a5500"],
            ["⏳", "Unpaid", "₦" + (stats?.unpaidCommissions ?? 0).toLocaleString(), "#cc2222"],
          ].map(([icon, label, val, color]) => (
            <div key={label as string} style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: "16px 18px" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: color as string }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#e8e4de", borderRadius: 10, padding: 4, gap: 4, marginBottom: 24 }}>
          {(["overview", "marketers", "referrals", "earnings", "support"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "9px 4px", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)", background: tab === t ? "white" : "transparent", color: tab === t ? "#1a1a2e" : "var(--muted)", boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {t === "overview" ? "Overview" : t === "marketers" ? "Marketers" : t === "referrals" ? "Referrals" : t === "earnings" ? "Commissions" : "Support"}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Invite Marketer</div>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>Enter the email of a registered BizDoc user to make them a marketer. They must already have an account.</div>
                <div style={{ marginBottom: 12 }}>
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email" placeholder="marketer@email.com" style={inp} onKeyDown={e => e.key === "Enter" && handleInvite()} />
                </div>
                <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} style={{ width: "100%", padding: "11px", background: "#1a1a2e", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: inviting ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", opacity: inviting ? 0.7 : 1 }}>
                  {inviting ? "Adding..." : "Add as Marketer"}
                </button>
                {inviteMsg && <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--green-light)", border: "1px solid #b8dfc9", borderRadius: 8, fontSize: 13, color: "var(--green)", fontWeight: 600 }}>{inviteMsg}</div>}
                {inviteError && <div style={{ marginTop: 12, padding: "10px 14px", background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, fontSize: 13, color: "#cc2222" }}>{inviteError}</div>}
              </div>
            </div>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Unpaid Commissions This Month</div>
              <div style={{ padding: 16 }}>
                {allMonthlyRows.filter(r => !r.paid && r.month === new Date().toISOString().slice(0, 7)).length === 0 ?
                  <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>All commissions paid ✓</div> :
                  allMonthlyRows.filter(r => !r.paid && r.month === new Date().toISOString().slice(0, 7)).map(row => (
                    <div key={row.marketer_id + row.month} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{row.marketerEmail}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{row.month} · {row.items.length} referral{row.items.length > 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: "#cc2222" }}>₦{row.total.toLocaleString()}</div>
                      <button onClick={() => handleMarkPaid(row.marketer_id, row.month)} disabled={payingMonth === row.month + row.marketer_id} style={{ padding: "6px 14px", background: "var(--green)", color: "white", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                        {payingMonth === row.month + row.marketer_id ? "..." : "Mark Paid"}
                      </button>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {/* Marketers Tab */}
        {tab === "marketers" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>All Marketers</div>
              <button onClick={() => setTab("overview")} style={{ padding: "6px 14px", background: "#1a1a2e", color: "white", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>+ Add Marketer</button>
            </div>
            {marketers.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No marketers yet.</div> :
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#faf9f7" }}>
                    {["Email", "Referral Code", "Status", "Total Earned", "Total Paid", "Joined", ""].map(h => (
                      <th key={h} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", textAlign: "left", borderBottom: "1.5px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {marketers.map(m => (
                    <tr key={m.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: 14 }}>{m.email}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <code style={{ background: "#f0f0f0", padding: "3px 8px", borderRadius: 4, fontSize: 13, fontWeight: 700 }}>{m.referral_code}</code>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: m.status === "active" ? "var(--green-light)" : "#f5f5f5", color: m.status === "active" ? "var(--green)" : "#aaa" }}>{m.status}</span>
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--green)" }}>₦{Number(m.total_earned).toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", color: "var(--muted)" }}>₦{Number(m.total_paid).toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>{new Date(m.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <button onClick={() => handleRemove(m.id)} style={{ padding: "5px 12px", background: "#fff0f0", color: "#cc2222", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                          {m.status === "active" ? "Deactivate" : "Inactive"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </div>
        )}

        {/* Referrals Tab */}
        {tab === "referrals" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>All Referrals</div>
            {referrals.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No referrals yet.</div> :
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#faf9f7" }}>
                    {["Business", "Referral Code", "Marketer", "Date"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", textAlign: "left", borderBottom: "1.5px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(r => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.business_name || "—"}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.business_email}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}><code style={{ background: "#f0f0f0", padding: "3px 8px", borderRadius: 4, fontSize: 13 }}>{r.referral_code}</code></td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>{r.marketers?.email || "—"}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </div>
        )}

        {/* Commissions Tab */}
        {tab === "earnings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {allMonthlyRows.length === 0 ? (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: 40, textAlign: "center", color: "var(--muted)" }}>No commissions yet.</div>
            ) : allMonthlyRows.map(row => (
              <div key={row.marketer_id + row.month} style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", background: row.paid ? "#f5f9f5" : "#fff8e8", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{row.marketerEmail}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{row.month} · {row.items.length} subscription{row.items.length > 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: row.paid ? "var(--green)" : "#b36000" }}>₦{row.total.toLocaleString()}</div>
                  <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: row.paid ? "var(--green-light)" : "#fff8e8", color: row.paid ? "var(--green)" : "#b36000", border: row.paid ? "1px solid #b8dfc9" : "1px solid #f0d080" }}>
                    {row.paid ? "✓ Paid" : "Unpaid"}
                  </span>
                  {!row.paid && (
                    <button onClick={() => handleMarkPaid(row.marketer_id, row.month)} disabled={payingMonth === row.month + row.marketer_id} style={{ padding: "8px 18px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                      {payingMonth === row.month + row.marketer_id ? "Processing..." : "Mark as Paid"}
                    </button>
                  )}
                </div>
                <div style={{ padding: "0 20px" }}>
                  {row.items.map((item: any, i: number) => (
                    <div key={item.id} style={{ padding: "10px 0", borderBottom: i < row.items.length - 1 ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.business_name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{item.plan} · Sub: ₦{Number(item.subscription_amount).toLocaleString()} · {COMMISSION_RATE}% commission</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: item.paid ? "var(--green)" : "#b36000" }}>₦{Number(item.commission_amount).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "support" && (
          <div style={{ display: "grid", gridTemplateColumns: activeTicket ? "1fr 1fr" : "1fr", gap: 20 }}>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--muted)" }}>Support Tickets ({tickets.length})</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{tickets.filter(t => t.status === "open").length} open · {tickets.filter(t => t.status === "in_progress").length} in progress</div>
              </div>
              {tickets.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No tickets yet.</div> :
              <div style={{ overflowY: "auto", maxHeight: "60vh" }}>
                {tickets.map(ticket => (
                  <div key={ticket.id} onClick={() => openAdminTicket(ticket)} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: activeTicket?.id === ticket.id ? "var(--green-light)" : "white", transition: "background 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 700, background: ticket.status === "open" ? "#e8f0ff" : ticket.status === "in_progress" ? "#fff8e8" : "#e8f5ef", color: ticket.status === "open" ? "#2255cc" : ticket.status === "in_progress" ? "#b36000" : "#1a6b4a" }}>
                        {ticket.status.replace("_", " ").toUpperCase()}
                      </span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: "#f5f2ed", color: "var(--muted)", fontWeight: 600 }}>{ticket.priority?.toUpperCase()}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{ticket.subject}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{ticket.business_name || ticket.user_email} · {new Date(ticket.updated_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>}
            </div>
            {activeTicket && (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", display: "flex", flexDirection: "column", height: "65vh" }}>
                <div style={{ padding: "14px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{activeTicket.subject}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{activeTicket.business_name} · {activeTicket.user_email}</div>
                  </div>
                  {activeTicket.status !== "resolved" && (
                    <button onClick={() => handleResolve(activeTicket.id)} style={{ padding: "6px 14px", background: "var(--green)", color: "white", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                      ✓ Resolve
                    </button>
                  )}
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  {ticketMessages.length === 0 && <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No messages yet.</div>}
                  {ticketMessages.map(msg => (
                    <div key={msg.id} style={{ display: "flex", justifyContent: msg.sender_type === "admin" ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "80%", background: msg.sender_type === "admin" ? "#1a1a2e" : "#f5f2ed", color: msg.sender_type === "admin" ? "white" : "var(--text)", borderRadius: msg.sender_type === "admin" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", fontSize: 13, lineHeight: 1.5 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 3, opacity: 0.7 }}>{msg.sender_type === "admin" ? "YOU (Admin)" : activeTicket.business_name}</div>
                        {msg.message}
                        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 3, textAlign: "right" }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {activeTicket.status !== "resolved" ? (
                  <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
                    <input value={adminReply} onChange={e => setAdminReply(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdminReply(activeTicket.id)} placeholder="Type reply..." style={{ flex: 1, padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "var(--font-body)" }} />
                    <button onClick={() => handleAdminReply(activeTicket.id)} disabled={sendingReply || !adminReply.trim()} style={{ padding: "9px 16px", background: "#1a1a2e", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                      {sendingReply ? "..." : "Reply"}
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", textAlign: "center", color: "var(--green)", fontSize: 13, fontWeight: 600 }}>✓ Resolved</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


