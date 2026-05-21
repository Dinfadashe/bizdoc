"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const APP_URL = "https://bizdoc.charitytoken.net";

export default function MarketerDashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string|null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"overview"|"referrals"|"earnings">("overview");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: userData }) => {
      if (!userData.user) { router.push("/"); return; }
      setUserId(userData.user.id);
      const res = await fetch("/api/marketer?user_id=" + userData.user.id);
      const d = await res.json();
      if (!d.marketer) { router.push("/dashboard"); return; }
      setData(d);
      setLoading(false);
    });
  }, [router]);

  const referralLink = data?.marketer ? APP_URL + "?ref=" + data.marketer.referral_code : "";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>Loading...</div>;
  if (!data) return null;

  const { marketer, referrals, earningsByMonth, totalEarned, totalPaid, totalPending } = data;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <nav style={{ background: "#1a1a2e", padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/dashboard"><button style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20 }}>&#8592;</button></Link>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white", flex: 1 }}>&#128279; Marketer Dashboard</div>
        <div style={{ background: "rgba(255,255,255,0.1)", padding: "4px 12px", borderRadius: 100, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{marketer.email}</div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>

        {/* Referral Link Card */}
        <div style={{ background: "linear-gradient(135deg,#1a1a2e,#2a2a4e)", borderRadius: 16, padding: 28, marginBottom: 24, color: "white" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Your Unique Referral Link</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Earn 30% on every subscription</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 20 }}>Share your link. When a business subscribes, you earn 30% of their subscription fee every month.</div>
          <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontFamily: "monospace", fontSize: 14, color: "#c9a84c", flex: 1, wordBreak: "break-all" }}>{referralLink}</div>
            <button onClick={copyLink} style={{ padding: "8px 18px", background: copied ? "#2a6b45" : "#c9a84c", color: copied ? "white" : "#1a1a2e", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.2s", whiteSpace: "nowrap" as const }}>
              {copied ? "✓ Copied!" : "Copy Link"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={() => window.open("https://wa.me/?text=" + encodeURIComponent("Hey! Use my referral link to sign up on BizDoc — the best invoicing platform for businesses. Get 1 month free: " + referralLink), "_blank")} style={{ padding: "8px 16px", background: "#25D366", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Share on WhatsApp</button>
            <button onClick={() => window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent("Manage your business invoices professionally with BizDoc! Get 1 month free: " + referralLink), "_blank")} style={{ padding: "8px 16px", background: "#1DA1F2", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Share on Twitter</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
          {[
            ["🔗", "Total Referrals", referrals.length.toString(), "var(--text)"],
            ["💰", "Total Earned", "₦" + Number(totalEarned).toLocaleString(), "var(--green)"],
            ["✅", "Total Paid", "₦" + Number(totalPaid).toLocaleString(), "var(--green)"],
            ["⏳", "Pending Payment", "₦" + Number(totalPending).toLocaleString(), Number(totalPending) > 0 ? "#b36000" : "var(--muted)"],
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
          {(["overview", "referrals", "earnings"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "9px 4px", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)", background: tab === t ? "white" : "transparent", color: tab === t ? "#1a1a2e" : "var(--muted)", boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {t === "overview" ? "Overview" : t === "referrals" ? "My Referrals" : "My Earnings"}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Monthly Commission Summary</div>
            {earningsByMonth.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔗</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No earnings yet</div>
                <div style={{ fontSize: 14 }}>Share your referral link to start earning 30% commissions</div>
              </div>
            ) : earningsByMonth.map((row: any) => (
              <div key={row.month} style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{new Date(row.month + "-01").toLocaleString("default", { month: "long", year: "numeric" })}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{row.items.length} active referral{row.items.length > 1 ? "s" : ""}</div>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: row.paid ? "var(--green)" : "#b36000" }}>₦{row.total.toLocaleString()}</div>
                <span style={{ padding: "4px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: row.paid ? "var(--green-light)" : "#fff8e8", color: row.paid ? "var(--green)" : "#b36000", border: row.paid ? "1px solid #b8dfc9" : "1px solid #f0d080" }}>
                  {row.paid ? "✓ Paid" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === "referrals" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Businesses I Referred</div>
            {referrals.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No referrals yet. Share your link!</div>
            ) : referrals.map((r: any) => (
              <div key={r.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--green-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏢</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.business_name || r.businesses?.name || "Business"}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{r.business_email} · Joined {new Date(r.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "earnings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {earningsByMonth.length === 0 ? (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: 40, textAlign: "center", color: "var(--muted)" }}>No earnings yet.</div>
            ) : earningsByMonth.map((row: any) => (
              <div key={row.month} style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", background: row.paid ? "#f5f9f5" : "#fff8e8", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{new Date(row.month + "-01").toLocaleString("default", { month: "long", year: "numeric" })}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{row.items.length} subscription{row.items.length > 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: row.paid ? "var(--green)" : "#b36000" }}>₦{row.total.toLocaleString()}</div>
                  <span style={{ padding: "4px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: row.paid ? "var(--green-light)" : "#fff8e8", color: row.paid ? "var(--green)" : "#b36000", border: row.paid ? "1px solid #b8dfc9" : "1px solid #f0d080" }}>
                    {row.paid ? "✓ Paid to you" : "Awaiting payment"}
                  </span>
                </div>
                <div style={{ padding: "0 20px" }}>
                  {row.items.map((item: any, i: number) => (
                    <div key={item.id} style={{ padding: "10px 0", borderBottom: i < row.items.length - 1 ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.business_name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{item.plan} plan · Sub amount: ₦{Number(item.subscription_amount).toLocaleString()} · 30% = ₦{Number(item.commission_amount).toLocaleString()}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: item.paid ? "var(--green)" : "#b36000" }}>₦{Number(item.commission_amount).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
