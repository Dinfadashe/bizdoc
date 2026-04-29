import Link from "next/link";
export default function Terms() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "40px 48px" }}>
        <Link href="/"><div style={{ color: "var(--green)", fontWeight: 700, fontSize: 13, marginBottom: 24, cursor: "pointer" }}>← Back</div></Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 32 }}>Last updated: April 2026</p>
        {[
          ["Acceptance of Terms", "By creating an account on BizDoc, you agree to these Terms of Service. If you do not agree, do not use BizDoc."],
          ["Use of Service", "BizDoc is a business invoicing and payment platform. You may use BizDoc only for lawful business purposes. You are responsible for all activity on your account."],
          ["Payments and Fees", "BizDoc charges a 2% platform fee on payments processed through the platform. This fee is automatically deducted at the time of payment. Subscription fees (if applicable) are non-refundable."],
          ["Account Responsibility", "You are responsible for maintaining the security of your account credentials. BizDoc is not liable for any loss resulting from unauthorized access to your account."],
          ["Client Data", "You are responsible for ensuring you have permission to store and process your clients personal data through BizDoc. You must comply with applicable data protection laws."],
          ["Prohibited Activities", "You may not use BizDoc for fraudulent transactions, money laundering, or any illegal activity. Violation will result in immediate account termination and may be reported to authorities."],
          ["Service Availability", "BizDoc aims for 99% uptime but does not guarantee uninterrupted service. We are not liable for losses resulting from service downtime."],
          ["Termination", "We reserve the right to suspend or terminate accounts that violate these terms. You may close your account at any time from Settings."],
          ["Changes to Terms", "We may update these terms at any time. Continued use of BizDoc after changes constitutes acceptance of the new terms."],
          ["Contact", "For terms-related questions, contact us at support@bizdoc.app"],
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