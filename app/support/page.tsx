"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PRIORITIES = ["low", "normal", "high", "urgent"];
const PRIORITY_COLORS: Record<string, string> = { low: "#888", normal: "#2255cc", high: "#b36000", urgent: "#cc2222" };
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "#e8f0ff", text: "#2255cc" },
  in_progress: { bg: "#fff8e8", text: "#b36000" },
  resolved: { bg: "#e8f5ef", text: "#1a6b4a" },
};

export default function SupportPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string|null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any|null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list"|"new"|"chat">("list");
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "", priority: "normal" });
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState("Business");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return; }
      setUserId(data.user.id);
      const mRes = await fetch("/api/marketer?user_id=" + data.user.id);
      const mData = await mRes.json();
      if (mData.marketer) setRole("Marketer");
      const res = await fetch("/api/support?user_id=" + data.user.id);
      const d = await res.json();
      setTickets(d.tickets ?? []);
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openTicket = async (ticket: any) => {
    setActiveTicket(ticket);
    setView("chat");
    const res = await fetch("/api/support?user_id=" + userId + "&ticket_id=" + ticket.id);
    const d = await res.json();
    setMessages(d.messages ?? []);
  };

  const handleCreate = async () => {
    if (!userId || !form.subject.trim() || !form.message.trim()) return;
    setCreating(true);
    const res = await fetch("/api/support", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_ticket", user_id: userId, subject: form.subject, message: form.message, priority: form.priority })
    });
    const d = await res.json();
    setCreating(false);
    if (d.ticket) {
      setTickets(prev => [d.ticket, ...prev]);
      setForm({ subject: "", message: "", priority: "normal" });
      await openTicket(d.ticket);
    }
  };

  const handleSend = async () => {
    if (!userId || !activeTicket || !newMsg.trim()) return;
    setSending(true);
    const res = await fetch("/api/support", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_message", user_id: userId, ticket_id: activeTicket.id, message: newMsg })
    });
    const d = await res.json();
    setSending(false);
    if (d.message) {
      setMessages(prev => [...prev, d.message]);
      setNewMsg("");
      setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, updated_at: new Date().toISOString() } : t));
    }
  };

  const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "var(--font-body)" } as const;
  const lbl = { display: "block" as const, fontSize: 11, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 5 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <nav style={{ background: "var(--green)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/dashboard"><button style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20 }}>&#8592;</button></Link>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white", flex: 1 }}>Support</div>
        {view !== "list" && <button onClick={() => setView("list")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>All Tickets</button>}
        {view === "list" && <button onClick={() => setView("new")} style={{ background: "#c9a84c", border: "none", color: "#1a1a2e", padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>+ New Ticket</button>}
      </nav>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px" }}>

        {view === "list" && (
          <div>
            {loading ? <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading...</div> :
            tickets.length === 0 ? (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎫</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No support tickets yet</div>
                <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>Have a question or issue? Create a ticket and we'll get back to you.</div>
                <button onClick={() => setView("new")} style={{ padding: "12px 28px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Create First Ticket</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {tickets.map(ticket => (
                  <div key={ticket.id} onClick={() => openTicket(ticket)} style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, transition: "box-shadow 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{ticket.subject}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(ticket.created_at).toLocaleDateString()} · Priority: <span style={{ color: PRIORITY_COLORS[ticket.priority], fontWeight: 600 }}>{ticket.priority}</span></div>
                    </div>
                    <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: STATUS_COLORS[ticket.status]?.bg, color: STATUS_COLORS[ticket.status]?.text }}>
                      {ticket.status.replace("_", " ").toUpperCase()}
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: 20 }}>›</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "new" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ padding: "14px 24px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>New Support Ticket</div>
            <div style={{ padding: 24 }}>
              <div style={{ background: "var(--green-light)", border: "1px solid #b8dfc9", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#2e7d52" }}>
                You are submitting as: <strong>{role}</strong>
              </div>
              <div style={{ marginBottom: 16 }}><label style={lbl}>Subject *</label><input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} style={inp} placeholder="e.g. Invoice not sending" /></div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Priority</label>
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} style={inp}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}><label style={lbl}>Describe your issue *</label><textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={5} style={{ ...inp, resize: "vertical" }} placeholder="Please describe your issue in detail..." /></div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={handleCreate} disabled={creating || !form.subject.trim() || !form.message.trim()} style={{ padding: "11px 28px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", opacity: creating ? 0.7 : 1 }}>{creating ? "Creating..." : "Submit Ticket"}</button>
                <button onClick={() => setView("list")} style={{ padding: "11px 20px", background: "#f5f2ed", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {view === "chat" && activeTicket && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", display: "flex", flexDirection: "column", height: "70vh" }}>
            <div style={{ padding: "14px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{activeTicket.subject}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Ticket #{activeTicket.id.slice(0,8).toUpperCase()} · Priority: <span style={{ color: PRIORITY_COLORS[activeTicket.priority], fontWeight: 600 }}>{activeTicket.priority}</span></div>
              </div>
              <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: STATUS_COLORS[activeTicket.status]?.bg, color: STATUS_COLORS[activeTicket.status]?.text }}>
                {activeTicket.status.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.length === 0 && <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, padding: 20 }}>No messages yet. Admin will respond shortly.</div>}
              {messages.map(msg => (
                <div key={msg.id} style={{ display: "flex", justifyContent: msg.sender_type === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "75%", background: msg.sender_type === "user" ? "var(--green)" : "white", color: msg.sender_type === "user" ? "white" : "var(--text)", border: msg.sender_type === "admin" ? "1px solid var(--border)" : "none", borderRadius: msg.sender_type === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", fontSize: 14, lineHeight: 1.5 }}>
                    {msg.sender_type === "admin" && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>BizDoc Support</div>}
                    <div>{msg.message}</div>
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "right" }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {activeTicket.status !== "resolved" ? (
              <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder="Type your message..." style={{ ...inp, flex: 1, margin: 0 }} />
                <button onClick={handleSend} disabled={sending || !newMsg.trim()} style={{ padding: "10px 20px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: sending || !newMsg.trim() ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", opacity: sending || !newMsg.trim() ? 0.6 : 1 }}>
                  {sending ? "..." : "Send"}
                </button>
              </div>
            ) : (
              <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", textAlign: "center", color: "var(--green)", fontSize: 14, fontWeight: 600 }}>✓ This ticket has been resolved</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
