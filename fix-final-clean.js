const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Remove ALL occurrences of isMarketer and isAdmin state declarations
// Then add them back exactly once in the right place

// Remove every duplicate line
const lines = c.split('\n');
const seen = new Set();
const cleaned = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (
    trimmed === 'const [isMarketer, setIsMarketer] = useState(false);' ||
    trimmed === 'const [isAdmin, setIsAdmin] = useState(false);'
  ) {
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      cleaned.push(line);
    }
    // skip duplicates
  } else {
    cleaned.push(line);
  }
}

c = cleaned.join('\n');

// Verify
const mCount = (c.match(/const \[isMarketer, setIsMarketer\]/g) || []).length;
const aCount = (c.match(/const \[isAdmin, setIsAdmin\]/g) || []).length;
console.log('isMarketer count:', mCount);
console.log('isAdmin count:', aCount);

// Make sure marketer/admin fetch exists in useEffect
if (!c.includes('/api/marketer?user_id=')) {
  c = c.replace(
    '      } else {\n        load(data.user.id);\n      }\n    });\n  }, [router, load]);',
    '      } else {\n        load(data.user.id);\n      }\n      fetch("/api/marketer?user_id=" + data.user.id).then(r => r.json()).then(d => { if (d.marketer) setIsMarketer(true); }).catch(() => {});\n      if (data.user.email === "dinfadashe@gmail.com") setIsAdmin(true);\n    });\n  }, [router, load]);'
  );
  console.log('Added fetch');
} else {
  console.log('Fetch already exists');
}

// Make sure buttons exist
if (!c.includes('href="/marketer"')) {
  c = c.replace(
    '          <Link href="/settings">\n            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>\n              Settings\n            </button>\n          </Link>',
    '          <Link href="/settings">\n            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>\n              Settings\n            </button>\n          </Link>\n          {isMarketer && (\n            <Link href="/marketer">\n              <button style={{ background: "#c9a84c", border: "none", color: "#1a1a2e", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>\n                Marketer\n              </button>\n            </Link>\n          )}\n          {isAdmin && (\n            <Link href="/admin">\n              <button style={{ background: "#1a1a2e", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>\n                Admin\n              </button>\n            </Link>\n          )}'
  );
  console.log('Added buttons');
} else {
  console.log('Buttons already exist');
}

fs.writeFileSync('app/dashboard/page.tsx', c, 'utf8');

// Final verify
const final = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
const fm = (final.match(/const \[isMarketer, setIsMarketer\]/g) || []).length;
const fa = (final.match(/const \[isAdmin, setIsAdmin\]/g) || []).length;
console.log('\nFINAL CHECK:');
console.log('isMarketer declarations:', fm, fm === 1 ? 'OK' : 'ERROR');
console.log('isAdmin declarations:', fa, fa === 1 ? 'OK' : 'ERROR');
console.log('Marketer button:', final.includes('href="/marketer"') ? 'OK' : 'MISSING');
console.log('Admin button:', final.includes('href="/admin"') ? 'OK' : 'MISSING');
console.log(fm === 1 && fa === 1 && final.includes('href="/marketer"') ? 'ALL GOOD - READY TO PUSH' : 'STILL HAS ISSUES');