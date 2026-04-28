const fs = require('fs');
let content = fs.readFileSync('app/invoices/[id]/page.tsx', 'utf8');

// Find and replace the old single USSD display with multi-bank display
const oldPattern = /\{getUssdCodes\(\)\.length > 0 && \(\s*<div[^>]*>\s*<div[^>]*>USSD Payment Code<\/div>\s*<div[^>]*>\{getUssdCodes\(\)\[0\]\?\.code\}<\/div>\s*<div[^>]*>Dial this code[^<]*<\/div>\s*<\/div>\s*\)\}/s;

const newBlock = `{getUssdCodes().length > 0 && (
                    <div style={{ marginTop: 10, padding: "10px 12px", background: "white", border: "1px solid #b8c8ff", borderRadius: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#2255cc", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px" }}>USSD Payment Codes</div>
                      <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>Dial any code on any phone to pay — no internet required.</div>
                      {getUssdCodes().map(({ bank, code }) => (
                        <div key={bank} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #e8f0ff" }}>
                          <div style={{ fontSize: 12, color: "#555", fontWeight: 600, minWidth: 90 }}>{bank}</div>
                          <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{code}</div>
                        </div>
                      ))}
                    </div>
                  )}`;

if (oldPattern.test(content)) {
  content = content.replace(oldPattern, newBlock);
  fs.writeFileSync('app/invoices/[id]/page.tsx', content, { encoding: 'utf8' });
  console.log('Fixed successfully');
} else {
  console.log('Pattern not found - showing relevant section:');
  const idx = content.indexOf('getUssdCodes()[0]');
  console.log(content.substring(idx - 200, idx + 300));
}