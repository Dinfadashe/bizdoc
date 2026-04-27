"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Invoice } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: "#f0f0f0", text: "#888" },
  sent:      { bg: "#e8f0ff", text: "#2255cc" },
  paid:      { bg: "#e8f5ef", text: "#1a6b4a" },
  overdue:   { bg: "#fff0f0", text: "#cc2222" },
  cancelled: { bg: "#f5f5f5", text: "#aaa" },
};

export default function Dashboard() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [business, setBusiness] = useState<{ name: string; logo_url: string; onboarding_complete: boolean } | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async (userId: string) => {
    const [{ data: invData }, { data: bizData }] = await Promise.all([
      supabase.from("invoices").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("businesses").select("name, logo_url, onboarding_complete").eq("user_id", userId).single(),
    ]);
    setInvoices(invData ?? []);
    setBusiness(bizData);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/"); return; }
      setUser(data.user);
      load(data.user.id);
    });
  }, [router, load]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalPending = invoices.filter(i => i.status === "sent").reduce((s, i) => s + i.total, 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      {/* Nav */}
      <nav style={{ background: "var(--green)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {business?.logo_url && (
            <img src={business.logo_url} alt="logo" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "contain", background: "white", padding: 2 }} />
          )}
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white" }}>
            {business?.name || "BizDoc"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/settings">
            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
              ⚙ Settings
            </button>
          </Link>
          <button onClick={signOut} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>

        {/* Incomplete profile warning */}
        {business && !business.onboarding_complete && (
          <div style={{ background: "#fff8e8", border: "1px solid #f0d080", borderRadius: 10, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 14, color: "#7a5500" }}>
              ⚠️ <strong>Connect your payout account</strong> — add your bank details so invoice payments reach you.
            </div>
            <Link href="/settings?tab=payouts">
              <button style={{ background: "#b36000", color: "white", border: "none", padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                Set Up Payouts →
              </button>
            </Link>
          </div>
        )}

        {/* Stats */}
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

        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700 }}>Invoices</h1>
          <Link href="/invoices/new">
            <button style={{ background: "var(--green)", color: "white", border: "none", padding: "10px 22px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
              + New Invoice
            </button>
          </Link>
        </div>

        {/* Invoice list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading...</div>
        ) : invoices.length === 0 ? (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 8 }}>No invoices yet</div>
            <div style={{ color: "var(--muted)", marginBottom: 20 }}>Create your first invoice to get started.</div>
            <Link href="/invoices/new">
              <button style={{ background: "var(--green)", color: "white", border: "none", padding: "10px 22px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Create Invoice</button>
            </Link>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            {invoices.map((inv, idx) => {
              const sc = STATUS_COLORS[inv.status] ?? STATUS_COLORS.draft;
              return (
                <Link key={inv.id} href={`/invoices/${inv.id}`} style={{ display: "flex", alignItems: "center", padding: "16px 22px", borderBottom: idx < invoices.length - 1 ? "1px solid var(--border)" : "none", gap: 16, cursor: "pointer", textDecoration: "none", color: "inherit" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{inv.invoice_number}</div>
                    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>{inv.client_name || "No client"} · {new Date(inv.issue_date).toDateString()}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{formatCurrency(inv.total, inv.currency)}</div>
                    {inv.due_date && <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>Due {new Date(inv.due_date).toDateString()}</div>}
                  </div>
                  <div style={{ background: sc.bg, color: sc.text, padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", minWidth: 70, textAlign: "center" }}>
                    {inv.status}
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
