const fs = require('fs');
let content = fs.readFileSync('app/invoices/[id]/page.tsx', 'utf8');

// Fix USSD display to use 2-column grid
const oldUssd = `                      {getUssdCodes().map(({ bank, code }) => (
                        <div key={bank} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #e8f0ff" }}>
                          <div style={{ fontSize: 12, color: "#555", fontWeight: 600, minWidth: 90 }}>{bank}</div>
                          <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{code}</div>
                        </div>
                      ))}`;

const newUssd = `                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                        {getUssdCodes().map(({ bank, code }) => (
                          <div key={bank} style={{ display: "flex", flexDirection: "column", padding: "4px 6px", background: "#f0f4ff", borderRadius: 4 }}>
                            <div style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>{bank}</div>
                            <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{code}</div>
                          </div>
                        ))}
                      </div>`;

if (content.includes(oldUssd.trim())) {
  content = content.replace(oldUssd, newUssd);
  console.log('USSD grid updated');
} else {
  // Try flexible match
  const idx = content.indexOf('getUssdCodes().map');
  if (idx > -1) {
    const start = content.lastIndexOf('{getUssdCodes().map', idx);
    const end = content.indexOf('))}', idx) + 3;
    content = content.substring(0, start) + newUssd + content.substring(end);
    console.log('USSD grid updated via flex match');
  } else {
    console.log('Could not find USSD map section');
  }
}

// Tighten print scale
content = content.replace(
  '#invoice-print-wrapper { transform-origin: top left; transform: scale(0.72); width: 139% !important; }',
  '#invoice-print-wrapper { transform-origin: top left; transform: scale(0.68); width: 147% !important; }'
);

fs.writeFileSync('app/invoices/[id]/page.tsx', content, { encoding: 'utf8' });
console.log('Done');