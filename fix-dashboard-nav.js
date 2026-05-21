const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// 1. Add isMarketer and isAdmin states after existing state declarations
c = c.replace(
  '  const [isStaff, setIsStaff] = useState(false);',
  '  const [isStaff, setIsStaff] = useState(false);\n  const [isMarketer, setIsMarketer] = useState(false);\n  const [isAdmin, setIsAdmin] = useState(false);'
);

// 2. Add marketer/admin check after the staff check in useEffect
c = c.replace(
  '      } else {\n        load(data.user.id);\n      }\n    });\n  }, [router, load]);',
  '      } else {\n        load(data.user.id);\n      }\n      // Check marketer and admin\n      fetch("/api/marketer?user_id=" + data.user.id)\n        .then(r => r.json())\n        .then(d => { if (d.marketer) setIsMarketer(true); })\n        .catch(() => {});\n      if (data.user.email === "dinfadashe@gmail.com") setIsAdmin(true);\n    });\n  }, [router, load]);'
);

// 3. Add Marketer and Admin buttons before Sign Out
c = c.replace(
  '          <button onClick={signOut} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>\n            Sign Out\n          </button>',
  '          {isMarketer && (\n            <Link href="/marketer">\n              <button style={{ background: "#c9a84c", border: "none", color: "#1a1a2e", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>\n                Marketer\n              </button>\n            </Link>\n          )}\n          {isAdmin && (\n            <Link href="/admin">\n              <button style={{ background: "#1a1a2e", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>\n                Admin\n              </button>\n            </Link>\n          )}\n          <button onClick={signOut} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>\n            Sign Out\n          </button>'
);

fs.writeFileSync('app/dashboard/page.tsx', c, 'utf8');

// Verify
const result = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
const hasMarketer = result.includes('isMarketer');
const hasAdmin = result.includes('isAdmin');
const hasButtons = result.includes('href="/marketer"');
console.log('isMarketer state:', hasMarketer);
console.log('isAdmin state:', hasAdmin);
console.log('Marketer button:', hasButtons);
console.log(hasMarketer && hasAdmin && hasButtons ? 'SUCCESS' : 'FAILED');