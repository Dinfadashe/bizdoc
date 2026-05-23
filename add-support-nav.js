const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

c = c.replace(
  '<Link href="/settings"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Settings</button></Link>',
  '<Link href="/settings"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Settings</button></Link>\n            <Link href="/support"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Support</button></Link>'
);

// Also add to mobile menu
c = c.replace(
  '            { href: "/settings", label: "Settings" },',
  '            { href: "/settings", label: "Settings" },\n            { href: "/support", label: "Support" },'
);

fs.writeFileSync('app/dashboard/page.tsx', c, 'utf8');
console.log('Added Support link to dashboard');