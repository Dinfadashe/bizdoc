const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Step 1: Add states after isStaff
c = c.replace(
  '  const [isStaff, setIsStaff] = useState(false);',
  '  const [isStaff, setIsStaff] = useState(false);\n  const [isMarketer, setIsMarketer] = useState(false);\n  const [isAdmin, setIsAdmin] = useState(false);'
);

// Step 2: Add fetch after load(data.user.id) in the else block
c = c.replace(
  '      } else {\n        load(data.user.id);\n      }\n    });\n  }, [router, load]);',
  '      } else {\n        load(data.user.id);\n      }\n      fetch("/api/marketer?user_id=" + data.user.id).then(r => r.json()).then(d => { if (d.marketer) setIsMarketer(true); }).catch(() => {});\n      if (data.user.email === "dinfadashe@gmail.com") setIsAdmin(true);\n    });\n  }, [router, load]);'
);

// Step 3: Add buttons - find the Settings link and add after it
c = c.replace(
  '          <Link href="/settings">\n            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>\n              Settings\n            </button>\n          </Link>',
  '          <Link href="/settings">\n            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>\n              Settings\n            </button>\n          </Link>\n          {isMarketer && (\n            <Link href="/marketer">\n              <button style={{ background: "#c9a84c", border: "none", color: "#1a1a2e", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>\n                Marketer\n              </button>\n            </Link>\n          )}\n          {isAdmin && (\n            <Link href="/admin">\n              <button style={{ background: "#1a1a2e", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>\n                Admin\n              </button>\n            </Link>\n          )}'
);

fs.writeFileSync('app/dashboard/page.tsx', c, 'utf8');

// Verify all 3 changes
const result = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
console.log('1. isMarketer state:', result.includes('const [isMarketer, setIsMarketer]'));
console.log('2. isAdmin state:', result.includes('const [isAdmin, setIsAdmin]'));
console.log('3. Marketer fetch:', result.includes('/api/marketer?user_id='));
console.log('4. Admin email check:', result.includes('dinfadashe@gmail.com'));
console.log('5. Marketer button:', result.includes('href="/marketer"'));
console.log('6. Admin button:', result.includes('href="/admin"'));