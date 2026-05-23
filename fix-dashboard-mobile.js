const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Add menuOpen state
c = c.replace(
  '  const [isMarketer, setIsMarketer] = useState(false);\n  const [isAdmin, setIsAdmin] = useState(false);',
  '  const [isMarketer, setIsMarketer] = useState(false);\n  const [isAdmin, setIsAdmin] = useState(false);\n  const [menuOpen, setMenuOpen] = useState(false);'
);

// Replace the entire nav section
const oldNav = `      <nav style={{ background: "var(--green)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {business?.logo_url && (
            <img src={business.logo_url} alt="logo" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "contain", background: "white", padding: 2 }} />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="BizDoc" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6, background: "white", padding: 2 }} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "white" }}>
              {business?.name || "BizDoc"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/settings?tab=catalog">
            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
              Catalog
            </button>
          </Link>
          <Link href="/inventory">
            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
              Inventory
            </button>
          </Link>
          <Link href="/expenses">
            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
              Expenses
            </button>
          </Link>
          <Link href="/stats">
            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
              Statistics
            </button>
          </Link>
          <Link href="/subscribe">
            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
              Subscription
            </button>
          </Link>
          <Link href="/settings">
            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
              Settings
            </button>
          </Link>
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
          )}
          <button onClick={signOut} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>
            Sign Out
          </button>
        </div>
      </nav>`;

const newNav = `      <style>{\`
        .dash-nav-links { display: flex; gap: 8px; align-items: center; }
        .dash-hamburger { display: none; }
        .dash-mobile-menu { display: none; }
        @media (max-width: 768px) {
          .dash-nav-links { display: none !important; }
          .dash-hamburger { display: flex !important; }
          .dash-mobile-menu.open { display: flex !important; }
        }
      \`}</style>
      <nav style={{ background: "var(--green)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="BizDoc" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6, background: "white", padding: 2 }} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "white" }}>
              {business?.name || "BizDoc"}
            </div>
          </div>
          {/* Desktop nav */}
          <div className="dash-nav-links">
            <Link href="/settings?tab=catalog"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Catalog</button></Link>
            <Link href="/inventory"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Inventory</button></Link>
            <Link href="/expenses"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Expenses</button></Link>
            <Link href="/stats"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Statistics</button></Link>
            <Link href="/subscribe"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Subscription</button></Link>
            <Link href="/settings"><button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Settings</button></Link>
            {isMarketer && (<Link href="/marketer"><button style={{ background: "#c9a84c", border: "none", color: "#1a1a2e", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>Marketer</button></Link>)}
            {isAdmin && (<Link href="/admin"><button style={{ background: "#1a1a2e", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 700 }}>Admin</button></Link>)}
            <button onClick={signOut} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Sign Out</button>
          </div>
          {/* Hamburger */}
          <button className="dash-hamburger" onClick={() => setMenuOpen(!menuOpen)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "8px 12px", borderRadius: 6, cursor: "pointer", fontSize: 20, display: "none" }}>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
        {/* Mobile menu */}
        <div className={"dash-mobile-menu" + (menuOpen ? " open" : "")} style={{ display: "none", flexDirection: "column", background: "#163d25", padding: "12px 20px", gap: 4, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          {[
            { href: "/settings?tab=catalog", label: "Catalog" },
            { href: "/inventory", label: "Inventory" },
            { href: "/expenses", label: "Expenses" },
            { href: "/stats", label: "Statistics" },
            { href: "/subscribe", label: "Subscription" },
            { href: "/settings", label: "Settings" },
          ].map(({ href, label }) => (
            <Link key={label} href={href} onClick={() => setMenuOpen(false)}>
              <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "white", padding: "12px 8px", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {label}
              </button>
            </Link>
          ))}
          {isMarketer && (
            <Link href="/marketer" onClick={() => setMenuOpen(false)}>
              <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#c9a84c", padding: "12px 8px", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                ⭐ Marketer Dashboard
              </button>
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" onClick={() => setMenuOpen(false)}>
              <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#a8d5b5", padding: "12px 8px", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                🛡 Admin Dashboard
              </button>
            </Link>
          )}
          <button onClick={() => { setMenuOpen(false); signOut(); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#ff8a8a", padding: "12px 8px", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", marginTop: 4 }}>
            Sign Out
          </button>
        </div>
      </nav>`;

if (c.includes(oldNav)) {
  c = c.replace(oldNav, newNav);
  console.log('Nav replaced successfully');
} else {
  console.log('Nav pattern not found - trying partial match');
  // Find the nav opening and replace up to closing nav tag
  const navStart = c.indexOf('      <nav style={{ background: "var(--green)", padding: "0 28px"');
  const navEnd = c.indexOf('      </nav>', navStart) + '      </nav>'.length;
  if (navStart > -1 && navEnd > -1) {
    c = c.substring(0, navStart) + newNav + c.substring(navEnd);
    console.log('Nav replaced via position');
  } else {
    console.log('ERROR: Could not find nav');
  }
}

fs.writeFileSync('app/dashboard/page.tsx', c, 'utf8');

const result = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
console.log('menuOpen state:', result.includes('menuOpen'));
console.log('Hamburger button:', result.includes('dash-hamburger'));
console.log('Mobile menu:', result.includes('dash-mobile-menu'));
console.log('Admin button:', (result.match(/href="\/admin"/g) || []).length, '(should be 2 - desktop+mobile)');