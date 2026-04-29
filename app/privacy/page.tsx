import Link from "next/link";
export default function Privacy() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "40px 48px" }}>
        <Link href="/"><div style={{ color: "var(--green)", fontWeight: 700, fontSize: 13, marginBottom: 24, cursor: "pointer" }}>← Back</div></Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 32 }}>Last updated: April 2026</p>
        {[
          ["Information We Collect", "We collect information you provide directly to us, such as your business name, email address, phone number, and bank account details for payout purposes. We also collect invoice data, client information you enter, and payment transaction records."],
          ["How We Use Your Information", "We use your information to provide and improve BizDoc services, process payments through Paystack, send transactional emails including invoices and receipts, and communicate important service updates."],
          ["Data Storage", "Your data is stored securely on Supabase infrastructure. Payment processing is handled by Paystack, which maintains its own privacy and security standards. We do not store card details."],
          ["Data Sharing", "We do not sell your personal data. We share data only with service providers necessary to operate BizDoc (Paystack for payments, Resend for emails) and when required by law."],
          ["Your Rights", "You may request access to, correction of, or deletion of your personal data at any time by contacting us. You may also close your account which will delete your data from our systems."],
          ["Cookies", "BizDoc uses essential cookies for authentication and session management. We do not use advertising or tracking cookies."],
          ["Contact", "For privacy-related questions, contact us at support@bizdoc.app"],
        ].map(([title, body]) => (
          <div key={title} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--green)" }}>{title}</h2>
            <p style={{ fontSize: 14, color: "#444", lineHeight: 1.8 }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}