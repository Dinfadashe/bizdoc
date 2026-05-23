const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Count admin buttons
const adminCount = (c.match(/href="\/admin"/g) || []).length;
const marketerCount = (c.match(/href="\/marketer"/g) || []).length;
console.log('Admin buttons found:', adminCount);
console.log('Marketer buttons found:', marketerCount);

// Remove ALL isMarketer/isAdmin button blocks completely
// Then add back exactly once after Settings link

// Remove all existing marketer/admin button JSX blocks
const marketerBlock = `          {isMarketer && (
            <Link href="/marketer">
              <button style={{ background: "#c9a84c", border: "none", color: "#1a1a2e", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>
                Marketer
              </button>
            </Link>
          )}`;

const adminBlock = `          {isAdmin && (
            <Link href="/admin">
              <button style={{ background: "#1a1a2e", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>
                Admin
              </button>
            </Link>
          )}`;

// Remove all occurrences of both blocks
while (c.includes(marketerBlock)) {
  c = c.replace(marketerBlock, '');
}
while (c.includes(adminBlock)) {
  c = c.replace(adminBlock, '');
}

console.log('After removal - Admin buttons:', (c.match(/href="\/admin"/g) || []).length);
console.log('After removal - Marketer buttons:', (c.match(/href="\/marketer"/g) || []).length);

// Now add exactly once after Settings link
const settingsLink = `          <Link href="/settings">
            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
              Settings
            </button>
          </Link>`;

const settingsLinkWithButtons = settingsLink + `
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
          )}`;

c = c.replace(settingsLink, settingsLinkWithButtons);

fs.writeFileSync('app/dashboard/page.tsx', c, 'utf8');

// Final check
const final = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
console.log('\nFINAL:');
console.log('Admin buttons:', (final.match(/href="\/admin"/g) || []).length, '(should be 1)');
console.log('Marketer buttons:', (final.match(/href="\/marketer"/g) || []).length, '(should be 1)');