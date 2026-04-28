const fs = require('fs');
let content = fs.readFileSync('app/invoices/[id]/page.tsx', 'utf8');

// Move USSD section outside the payment box to full width
const oldUssdBlock = `                  {getUssdCodes().length > 0 && (
                    <div style={{ marginTop: 10, padding: "10px 12px", background: "white", border: "1px solid #b8c8ff", borderRadius: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#2255cc", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px" }}>USSD Payment Codes</div>
                      <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>Dial any code on any phone to pay — no internet required.</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                        {getUssdCodes().map(({ bank, code }) => (
                          <div key={bank} style={{ display: "flex", flexDirection: "column", padding: "4px 6px", background: "#f0f4ff", borderRadius: 4 }}>
                            <div style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>{bank}</div>
                            <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{code}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}`;

// Replace with empty string first
content = content.replace(oldUssdBlock, '');

// Now add USSD section as full-width row after the notes/payment grid
const oldAfterGrid = `          {invoice.payment_url && invoice.status !== "paid" && (`;
const newAfterGrid = `          {getUssdCodes().length > 0 && business?.dva_account_number && (
            <div style={{ padding: "12px 32px", borderTop: "1px solid var(--border)", background: "#f0f4ff" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#2255cc", marginBottom: 8 }}>USSD Payment Codes — dial any code to pay, no internet required</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                {getUssdCodes().map(({ bank, code }) => (
                  <div key={bank} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", background: "white", borderRadius: 4, border: "1px solid #b8c8ff" }}>
                    <div style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>{bank}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{code}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {invoice.payment_url && invoice.status !== "paid" && (`;

content = content.replace(oldAfterGrid, newAfterGrid);

fs.writeFileSync('app/invoices/[id]/page.tsx', content, { encoding: 'utf8' });
console.log('Done');