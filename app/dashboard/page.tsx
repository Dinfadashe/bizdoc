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

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function Dashboard() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [business, setBusiness] = useState<{ name: string; logo_url: string; onboarding_complete: boolean } | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [isMarketer, setIsMarketer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [staffBusinessOwnerId, setStaffBusinessOwnerId] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportType, setReportType] = useState<"monthly" | "annual">("monthly");
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportFormat, setReportFormat] = useState<"pdf" | "csv">("pdf");
  const [showReportPanel, setShowReportPanel] = useState(false);
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
    // Force fresh session - don't use cached auth
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (!sessionData.session?.user) { router.push("/"); return; }
      const data = { user: sessionData.session.user };
      setUser(data.user);
      // Check if this user is a staff member
      const { data: memberData } = await supabase
        .from("team_members")
        .select("owner_user_id, status")
        .eq("member_user_id", data.user.id)
        .eq("status", "active")
        .single();
      if (memberData) {
        setIsStaff(true);
        setStaffBusinessOwnerId(memberData.owner_user_id);
        load(memberData.owner_user_id);
      } else {
        load(data.user.id);
      }
      fetch("/api/marketer?user_id=" + data.user.id).then(r => r.json()).then(d => { if (d.marketer) setIsMarketer(true); }).catch(() => {});
      // Force reload of invoices with correct user_id
      console.log("Dashboard loading for user:", data.user.id, data.user.email);
      if (data.user.email === "dinfadashe@gmail.com") setIsAdmin(true);
    });
  }, [router, load]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const generateReport = async () => {
    if (!user) return;
    setGeneratingReport(true);
    try {
      let from: string, to: string, label: string;
      if (reportType === "monthly") {
        const firstDay = new Date(reportYear, reportMonth, 1);
        const lastDay = new Date(reportYear, reportMonth + 1, 0);
        from = firstDay.toISOString().split("T")[0];
        to = lastDay.toISOString().split("T")[0];
        label = `${MONTHS[reportMonth]} ${reportYear}`;
      } else {
        from = `${reportYear}-01-01`;
        to = `${reportYear}-12-31`;
        label = `Annual ${reportYear}`;
      }

      const res = await fetch(`/api/reports?user_id=${user.id}&from=${from}&to=${to}`);
      const data = await res.json();

      if (reportFormat === "csv") {
        downloadCSV(data, label);
      } else {
        downloadPDF(data, label);
      }
    } catch (err) {
      alert("Failed to generate report");
      console.error(err);
    }
    setGeneratingReport(false);
  };

  const downloadCSV = (data: any, label: string) => {
    const rows = [
      ["BizDoc Sales Report - " + label],
      ["Business:", data.business?.name ?? ""],
      [],
      ["SUMMARY"],
      ["Total Invoices", data.summary.totalInvoices],
      ["Revenue Collected", data.summary.totalRevenue],
      ["Pending Payment", data.summary.totalPending],
      ["Cancelled", data.summary.totalCancelled],
      [],
      ["PAYMENT METHODS"],
      ["Method", "Count", "Total Amount"],
      ...data.paymentMethods.map((m: any) => [m.method, m.count, m.total]),
      [],
      ["INVOICES BY CLIENT"],
      ["Client", "Invoice Count"],
      ...data.clientBreakdown.map((c: any) => [c.name, c.count]),
      [],
      ["ALL INVOICES"],
      ["Invoice No", "Client", "Issue Date", "Due Date", "Amount", "Status"],
      ...data.invoices.map((i: any) => [
        i.invoice_number,
        i.client_name ?? "",
        i.issue_date,
        i.due_date ?? "",
        i.total,
        i.status,
      ]),
    ];
    const csv = rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, "\"\"")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BizDoc-Report-${label.replace(/ /g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async (data: any, label: string) => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    const green = [26, 74, 46] as [number, number, number];
    const lightGreen = [232, 245, 239] as [number, number, number];
    let y = 20;

    // Header
    doc.setFillColor(...green);
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("BizDoc Sales Report", 14, 16);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(label, 14, 25);
    doc.text(data.business?.name ?? "", 196, 25, { align: "right" });
    y = 45;

    // Summary boxes
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, y);
    y += 8;

    const currency = data.invoices?.[0]?.currency ?? "NGN";
    const summaryItems = [
      ["Total Invoices", String(data.summary.totalInvoices)],
      ["Revenue Collected", `${currency} ${Number(data.summary.totalRevenue).toLocaleString()}`],
      ["Pending Payment", `${currency} ${Number(data.summary.totalPending).toLocaleString()}`],
      ["Cancelled", `${currency} ${Number(data.summary.totalCancelled).toLocaleString()}`],
      ["Paid", String(data.summary.paidCount)],
      ["Pending", String(data.summary.pendingCount)],
    ];

    const colW = 90;
    summaryItems.forEach(([k, v], i) => {
      const x = i % 2 === 0 ? 14 : 14 + colW + 6;
      const rowY = y + Math.floor(i / 2) * 16;
      doc.setFillColor(...lightGreen);
      doc.roundedRect(x, rowY, colW, 13, 2, 2, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(k, x + 4, rowY + 5);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(26, 74, 46);
      doc.text(v, x + 4, rowY + 11);
    });
    y += Math.ceil(summaryItems.length / 2) * 16 + 10;

    // Payment methods
    if (data.paymentMethods.length > 0) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Payment Methods", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Method", "Count", "Total Amount"]],
        body: data.paymentMethods.map((m: any) => [
          m.method === "dedicated_nuban" ? "Bank Transfer (DVA)" :
          m.method === "card" ? "Card" :
          m.method === "ussd" ? "USSD" :
          m.method === "bank_transfer" ? "Bank Transfer" : m.method,
          m.count,
          `${currency} ${Number(m.total).toLocaleString()}`,
        ]),
        headStyles: { fillColor: green },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // Client breakdown
    if (data.clientBreakdown.length > 0) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Invoices by Client", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Client", "Invoice Count"]],
        body: data.clientBreakdown.map((c: any) => [c.name, c.count]),
        headStyles: { fillColor: green },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // All invoices
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("All Invoices", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Invoice No", "Client", "Issue Date", "Amount", "Status"]],
      body: data.invoices.map((i: any) => [
        i.invoice_number,
        i.client_name ?? "-",
        new Date(i.issue_date).toLocaleDateString("en-NG"),
        `${i.currency} ${Number(i.total).toLocaleString()}`,
        i.status.toUpperCase(),
      ]),
      headStyles: { fillColor: green },
      margin: { left: 14, right: 14 },
      bodyStyles: { fontSize: 9 },
      didParseCell: (hookData: any) => {
        if (hookData.column.index === 4) {
          const status = hookData.cell.raw as string;
          if (status === "PAID") hookData.cell.styles.textColor = [26, 107, 74];
          else if (status === "SENT") hookData.cell.styles.textColor = [34, 85, 204];
          else if (status === "CANCELLED") hookData.cell.styles.textColor = [170, 170, 170];
        }
      },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated by BizDoc · Page ${i} of ${pageCount}`, 14, 290);
      doc.text(new Date().toLocaleDateString("en-NG"), 196, 290, { align: "right" });
    }

    doc.save(`BizDoc-Report-${label.replace(/ /g, "-")}.pdf`);
  };

  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalPending = invoices.filter(i => i.status === "sent").reduce((s, i) => s + i.total, 0);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <style>{`
        .dash-nav-links { display: flex; gap: 8px; align-items: center; }
        .dash-hamburger { display: none; }
        .dash-mobile-menu { display: none; }
        @media (max-width: 768px) {
          .dash-nav-links { display: none !important; }
          .dash-hamburger { display: flex !important; }
          .dash-mobile-menu.open { display: flex !important; }
        }
      `}</style>
      <nav style={{ background: "var(--green)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="BizDoc" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6, background: "white", padding: 2 }} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "white" }}>
              {business?.name || "BizDoc"}
            </div>
          </div>
          {/* Desktop nav */}
          <div className="dash-nav-links">
            <Link href="/settings?tab=catalog"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Catalog</button></Link>
            <Link href="/inventory"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Inventory</button></Link>
            <Link href="/expenses"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Expenses</button></Link>
            <Link href="/stats"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Statistics</button></Link>
            <Link href="/subscribe"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Subscription</button></Link>
            <Link href="/settings"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Settings</button></Link>
            <Link href="/support"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Support</button></Link>
            {isMarketer && (<Link href="/marketer"><button style={{ background: "#c9a84c", border: "none", color: "#1a1a2e", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>Marketer</button></Link>)}
            {isAdmin && (<Link href="/admin"><button style={{ background: "#1a1a2e", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>Admin</button></Link>)}
            <button onClick={signOut} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Sign Out</button>
          </div>
          {/* Hamburger */}
          <button className="dash-hamburger" onClick={() => setMenuOpen(!menuOpen)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "8px 12px", borderRadius: 6, cursor: "pointer", fontSize: 20, display: "none" }}>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
        {/* Mobile menu */}
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
              <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "white", padding: "12px 8px", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {label}
              </button>
            </Link>
          ))}
          {isMarketer && (
            <Link href="/marketer" onClick={() => setMenuOpen(false)}>
              <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#c9a84c", padding: "12px 8px", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                ⭐ Marketer Dashboard
              </button>
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" onClick={() => setMenuOpen(false)}>
              <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#a8d5b5", padding: "12px 8px", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                🛡 Admin Dashboard
              </button>
            </Link>
          )}
          <button onClick={() => { setMenuOpen(false); signOut(); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#ff8a8a", padding: "12px 8px", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", marginTop: 4 }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>

        {business && !business.onboarding_complete && (
          <div style={{ background: "#fff8e8", border: "1px solid #f0d080", borderRadius: 10, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 14, color: "#7a5500" }}>
              <strong>Connect your payout account</strong> — add your bank details so invoice payments reach you.
            </div>
            <Link href="/settings?tab=payouts">
              <button style={{ background: "#b36000", color: "white", border: "none", padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                Set Up Payouts
              </button>
            </Link>
          </div>
        )}

        {!isStaff && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
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
        </div>}

        {/* Reports Section */}
        {!isStaff && <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 24, overflow: "hidden" }}>
          <div
            onClick={() => setShowReportPanel(!showReportPanel)}
            style={{ padding: "14px 22px", background: "#faf9f7", borderBottom: showReportPanel ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Sales Reports</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{showReportPanel ? "Hide" : "Download monthly or annual reports"}</div>
          </div>
          {showReportPanel && (
            <div style={{ padding: "20px 22px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted)", marginBottom: 6 }}>Report Type</label>
                  <select value={reportType} onChange={e => setReportType(e.target.value as "monthly" | "annual")} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 7, fontSize: 14, fontFamily: "var(--font-body)" }}>
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
                  <select value={reportFormat} onChange={e => setReportFormat(e.target.value as "pdf" | "csv")} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: 7, fontSize: 14, fontFamily: "var(--font-body)" }}>
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV / Excel</option>
                  </select>
                </div>
              </div>
              <button
                onClick={generateReport}
                disabled={generatingReport}
                style={{ padding: "10px 24px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: generatingReport ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", opacity: generatingReport ? 0.7 : 1 }}
              >
                {generatingReport ? "Generating..." : `Download ${reportType === "annual" ? reportYear + " Annual" : MONTHS[reportMonth] + " " + reportYear} Report`}
              </button>
            </div>
          )}
        </div>}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700 }}>Invoices</h1>
          <Link href="/invoices/new">
            <button style={{ background: "var(--green)", color: "white", border: "none", padding: "10px 22px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
              + New Invoice
            </button>
          </Link>
        </div>

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







