const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

const oldBtn = `          <button onClick={signOut} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
            Sign Out
          </button>
        </div>
      </nav>`;

const newBtn = `          {isMarketer && (
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
          )}
          <button onClick={signOut} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
            Sign Out
          </button>
        </div>
      </nav>`;

if (c.includes(oldBtn)) {
  c = c.replace(oldBtn, newBtn);
  fs.writeFileSync('app/dashboard/page.tsx', c, 'utf8');
  console.log('SUCCESS - buttons added');
} else {
  // Try normalizing line endings
  const normalized = c.replace(/\r\n/g, '\n');
  const oldNorm = oldBtn.replace(/\r\n/g, '\n');
  if (normalized.includes(oldNorm)) {
    const result = normalized.replace(oldNorm, newBtn);
    fs.writeFileSync('app/dashboard/page.tsx', result, 'utf8');
    console.log('SUCCESS - buttons added (normalized)');
  } else {
    console.log('FAILED - pattern not found');
    // Show what is near Sign Out
    const idx = c.indexOf('Sign Out');
    console.log('Context around Sign Out:', JSON.stringify(c.substring(idx - 100, idx + 100)));
  }
}