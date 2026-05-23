const fs = require('fs');

// Add Support tab to admin page
let adminContent = fs.readFileSync('app/admin/page.tsx', 'utf8');

// Add tickets state
adminContent = adminContent.replace(
  "  const [payingMonth, setPayingMonth] = useState<string|null>(null);",
  `  const [payingMonth, setPayingMonth] = useState<string|null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any|null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [adminReply, setAdminReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);`
);

// Add tickets to tab type
adminContent = adminContent.replace(
  '  const [tab, setTab] = useState<"overview"|"marketers"|"referrals"|"earnings">("overview");',
  '  const [tab, setTab] = useState<"overview"|"marketers"|"referrals"|"earnings"|"support">("overview");'
);

// Load tickets in loadAll
adminContent = adminContent.replace(
  "    setLoading(false);",
  `    const tRes = await fetch("/api/support?user_id=" + data.session.user.id + "&admin=1", { headers });
    const tData = await tRes.json();
    setTickets(tData.tickets ?? []);
    setLoading(false);`
);

// Add Support tab button
adminContent = adminContent.replace(
  `          {(["overview", "marketers", "referrals", "earnings"] as const).map(t => (`,
  `          {(["overview", "marketers", "referrals", "earnings", "support"] as const).map(t => (`
);

adminContent = adminContent.replace(
  `              {t === "overview" ? "Overview" : t === "marketers" ? "Marketers" : t === "referrals" ? "Referrals" : "Commissions"}`,
  `              {t === "overview" ? "Overview" : t === "marketers" ? "Marketers" : t === "referrals" ? "Referrals" : t === "earnings" ? "Commissions" : "Support"}`
);

// Add openTicket function before return
adminContent = adminContent.replace(
  "  const allMonthlyRows",
  `  const openAdminTicket = async (ticket: any) => {
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

  const allMonthlyRows`
);

// Add Support tab content before the closing div
adminContent = adminContent.replace(
  `      </div>
    </div>
  );
}`,
  `        {tab === "support" && (
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
}`
);

fs.writeFileSync('app/admin/page.tsx', adminContent, 'utf8');
console.log('Updated admin page with support tab');