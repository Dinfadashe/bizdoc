const fs = require('fs');

// Update subscribe page to pass referral code to Paystack metadata
let subContent = fs.readFileSync('app/subscribe/page.tsx', 'utf8');

// Add referral code capture from URL
subContent = subContent.replace(
  "const PAYSTACK_LINK = \"https://paystack.shop/pay/l-mbgz440h\";",
  `const PAYSTACK_LINK = "https://paystack.shop/pay/l-mbgz440h";`
);

subContent = subContent.replace(
  "  const [usdRate, setUsdRate] = useState<number>(1500);",
  `  const [usdRate, setUsdRate] = useState<number>(1500);
  const [referralCode, setReferralCode] = useState<string>("");`
);

subContent = subContent.replace(
  "    supabase.auth.getUser().then(async ({ data }) => {",
  `    // Get referral code from URL or business
    const urlParams = new URLSearchParams(window.location.search);
    const refFromUrl = urlParams.get("ref");
    if (refFromUrl) setReferralCode(refFromUrl);
    supabase.auth.getUser().then(async ({ data }) => {`
);

subContent = subContent.replace(
  "    const url = PAYSTACK_LINK + \"?metadata=\" + encodeURIComponent(JSON.stringify({ user_id: userId, plan }));",
  `    const meta: any = { user_id: userId, plan };
    if (referralCode) meta.referral_code = referralCode;
    const url = PAYSTACK_LINK + "?metadata=" + encodeURIComponent(JSON.stringify(meta));`
);

fs.writeFileSync('app/subscribe/page.tsx', subContent, { encoding: 'utf8' });
console.log('Updated subscribe page with referral tracking');

// Update dashboard to show marketer/admin links
let dashContent = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Add marketer and admin check
dashContent = dashContent.replace(
  "  const [loading, setLoading] = useState(true);",
  `  const [loading, setLoading] = useState(true);
  const [isMarketer, setIsMarketer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);`
);

dashContent = dashContent.replace(
  "      setLoading(false);",
  `      // Check marketer status
      const mRes = await fetch("/api/marketer?user_id=" + data.user.id);
      const mData = await mRes.json();
      setIsMarketer(!!mData.marketer);
      setIsAdmin(data.user.email === "dinfadashe@gmail.com");
      setLoading(false);`
);

// Add links to nav after settings
dashContent = dashContent.replace(
  `          <Link href="/settings">
            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
              Settings
            </button>
          </Link>`,
  `          <Link href="/settings">
            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
              Settings
            </button>
          </Link>
          {isMarketer && (
            <Link href="/marketer">
              <button style={{ background: "#c9a84c", border: "none", color: "#1a1a2e", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>
                Marketer
              </button>
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin">
              <button style={{ background: "#1a1a2e", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>
                Admin
              </button>
            </Link>
          )}`
);

fs.writeFileSync('app/dashboard/page.tsx', dashContent, { encoding: 'utf8' });
console.log('Updated dashboard with marketer/admin links');

// Update landing page to capture referral code from URL
let landingContent = fs.readFileSync('app/page.tsx', 'utf8');

// Add referral code state
landingContent = landingContent.replace(
  "  const [menuOpen, setMenuOpen] = useState(false);",
  `  const [menuOpen, setMenuOpen] = useState(false);
  const [referralCode, setReferralCode] = useState<string>("");`
);

// Capture referral from URL on load
landingContent = landingContent.replace(
  "  useEffect(() => {",
  `  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) setReferralCode(ref);
  }, []);

  useEffect(() => {`
);

// Store referral in localStorage after signup so it can be applied
landingContent = landingContent.replace(
  "      if (data.user) {\n        await supabase.from(\"businesses\").insert({ user_id: data.user.id, name: businessName, email, phone, address, currency: \"NGN\", onboarding_complete: false });",
  `      if (data.user) {
        await supabase.from("businesses").insert({ user_id: data.user.id, name: businessName, email, phone, address, currency: "NGN", onboarding_complete: false });
        // Apply referral if present
        if (referralCode) {
          await fetch("/api/referral", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ referral_code: referralCode, business_user_id: data.user.id, business_email: email }) }).catch(() => {});
        }`
);

fs.writeFileSync('app/page.tsx', landingContent, { encoding: 'utf8' });
console.log('Updated landing page with referral capture');

console.log('All done!');