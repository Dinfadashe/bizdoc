"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PAYSTACK_LINK = "https://paystack.shop/pay/l-mbgz440h";
const MONTHLY_NGN = 1500;
const ANNUAL_NGN = 15000;

export default function Subscribe() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<"monthly"|"annual">("monthly");
  const [usdRate, setUsdRate] = useState<number>(1500);
  const [referralCode, setReferralCode] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get referral code from URL or business
    const urlParams = new URLSearchParams(window.location.search);
    const refFromUrl = urlParams.get("ref");
    if (refFromUrl) setReferralCode(refFromUrl);
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return; }
      setUserId(data.user.id);
      const res = await fetch("/api/subscription?user_id=" + data.user.id);
      const d = await res.json();
      setSubscription(d.subscription);
      setLoading(false);
    });
    // Fetch live USD/NGN rate
    fetch("https://api.exchangerate-api.com/v4/latest/NGN")
      .then(r => r.json())
      .then(d => { if (d.rates?.USD) setUsdRate(Math.round(1 / d.rates.USD)); })
      .catch(() => {});
  }, []);

  const handleSubscribe = () => {
    const meta: any = { user_id: userId, plan };
    if (referralCode) meta.referral_code = referralCode;
    const url = PAYSTACK_LINK + "?metadata=" + encodeURIComponent(JSON.stringify(meta));
    window.open(url, "_blank");
  };

  const trialDaysLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isActive = subscription?.status === "active" && subscription?.expires_at && new Date(subscription.expires_at) > new Date();
  const isTrial = subscription?.status === "trial" && trialDaysLeft > 0;

  const monthlyUSD = (MONTHLY_NGN / usdRate).toFixed(2);
  const annualUSD = (ANNUAL_NGN / usdRate).toFixed(2);

  if (loading) return <div style={{ padding: 60, textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <nav style={{ background: "var(--green)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/dashboard"><button style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20 }}>&#8592;</button></Link>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white" }}>Subscription</div>
      </nav>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}>

        {isActive && (
          <div style={{ background: "var(--green-light)", border: "1px solid #b8dfc9", borderRadius: 12, padding: "20px 24px", marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>&#10003;</div>
            <div style={{ fontWeight: 700, color: "var(--green)", fontSize: 18, marginBottom: 4 }}>Subscription Active</div>
            <div style={{ fontSize: 14, color: "#2e7d52" }}>Plan: <strong>{subscription.plan}</strong> · Expires: <strong>{new Date(subscription.expires_at).toDateString()}</strong></div>
          </div>
        )}

        {isTrial && (
          <div style={{ background: "#fff8e8", border: "1px solid #f0d080", borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: "#7a5500", fontSize: 16, marginBottom: 4 }}>Free Trial Active</div>
            <div style={{ fontSize: 14, color: "#7a5500" }}><strong>{trialDaysLeft} days</strong> remaining in your free trial</div>
          </div>
        )}

        {!isTrial && !isActive && (
          <div style={{ background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: "#cc2222", fontSize: 16, marginBottom: 4 }}>Trial Expired</div>
            <div style={{ fontSize: 14, color: "#cc2222" }}>Subscribe to continue creating invoices</div>
          </div>
        )}

        <div style={{ background: "white", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", background: "#faf9f7", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", marginBottom: 4 }}>BizDoc Subscription</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>Unlimited invoices, all features included</div>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div onClick={() => setPlan("monthly")} style={{ border: plan === "monthly" ? "2px solid var(--green)" : "1.5px solid var(--border)", borderRadius: 12, padding: "16px", cursor: "pointer", background: plan === "monthly" ? "var(--green-light)" : "white", transition: "all 0.15s" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: plan === "monthly" ? "var(--green)" : "var(--text)", marginBottom: 4 }}>Monthly</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: plan === "monthly" ? "var(--green)" : "var(--text)" }}>&#8358;1,500</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>≈ ${monthlyUSD} USD / month</div>
              </div>
              <div onClick={() => setPlan("annual")} style={{ border: plan === "annual" ? "2px solid var(--green)" : "1.5px solid var(--border)", borderRadius: 12, padding: "16px", cursor: "pointer", background: plan === "annual" ? "var(--green-light)" : "white", transition: "all 0.15s", position: "relative" }}>
                <div style={{ position: "absolute", top: -10, right: 10, background: "var(--green)", color: "white", fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 100, letterSpacing: 1 }}>SAVE 17%</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: plan === "annual" ? "var(--green)" : "var(--text)", marginBottom: 4 }}>Annual</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: plan === "annual" ? "var(--green)" : "var(--text)" }}>&#8358;15,000</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>≈ ${annualUSD} USD / year</div>
              </div>
            </div>
            <button onClick={handleSubscribe} style={{ width: "100%", padding: "14px", background: "var(--green)", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)", marginBottom: 12 }}>
              Subscribe {plan === "monthly" ? "Monthly" : "Annually"} — {plan === "monthly" ? "₦1,500" : "₦15,000"}
            </button>
            <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>
              Payment processed securely via Paystack. After payment, your subscription activates automatically.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>What's included:</div>
          {["Unlimited invoice creation","All world currencies","Multiple bank accounts","Team member access","Monthly & annual reports","Product catalog","WhatsApp invoice sharing","Auto receipt on mark as paid"].map(f => (
            <div key={f} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: "var(--green)", fontWeight: 700 }}>&#10003;</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}