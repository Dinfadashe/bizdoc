const fs = require('fs');

let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Add memberships state
c = c.replace(
  '  const [isMarketer, setIsMarketer] = useState(false);\n  const [isAdmin, setIsAdmin] = useState(false);',
  `  const [isMarketer, setIsMarketer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [activeMode, setActiveMode] = useState<"own"|string>("own"); // "own" or team_member id
  const [showSwitcher, setShowSwitcher] = useState(false);`
);

// Load memberships after auth
c = c.replace(
  '      fetch("/api/marketer?user_id=" + data.user.id).then(r => r.json()).then(d => { if (d.marketer) setIsMarketer(true); }).catch(() => {});',
  `      fetch("/api/marketer?user_id=" + data.user.id).then(r => r.json()).then(d => { if (d.marketer) setIsMarketer(true); }).catch(() => {});
      fetch("/api/team/memberships?user_id=" + data.user.id).then(r => r.json()).then(d => { setMemberships(d.memberships ?? []); }).catch(() => {});`
);

// Add switcher UI before the business name in nav
c = c.replace(
  '<div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "white" }}>\n              {business?.name || "BizDoc"}\n            </div>',
  `<div style={{ position: "relative" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "white", cursor: memberships.length > 0 ? "pointer" : "default", display: "flex", alignItems: "center", gap: 6 }} onClick={() => memberships.length > 0 && setShowSwitcher(!showSwitcher)}>
              {business?.name || "BizDoc"}
              {memberships.length > 0 && <span style={{ fontSize: 12, background: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: 10 }}>▾</span>}
            </div>
            {showSwitcher && memberships.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 8, background: "white", borderRadius: 10, border: "1px solid var(--border)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 200, minWidth: 220, overflow: "hidden" }}>
                <div style={{ padding: "8px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Switch Account</div>
                <div onClick={() => { setActiveMode("own"); setShowSwitcher(false); if (user) load(user.id); }} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: activeMode === "own" ? "var(--green-light)" : "white", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0 }}>B</div>
                  <div><div style={{ fontWeight: 700, fontSize: 13 }}>My Business</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Owner account</div></div>
                  {activeMode === "own" && <span style={{ marginLeft: "auto", color: "var(--green)", fontWeight: 700 }}>✓</span>}
                </div>
                {memberships.map((m: any) => (
                  <div key={m.id} onClick={() => { setActiveMode(m.id); setShowSwitcher(false); load(m.owner_user_id); }} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: activeMode === m.id ? "var(--green-light)" : "white", borderBottom: "1px solid var(--border)" }}>
                    {m.businesses?.logo_url ? <img src={m.businesses.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "contain", border: "1px solid var(--border)", flexShrink: 0 }}/> : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e8f0ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#2255cc", flexShrink: 0 }}>{m.businesses?.name?.[0]?.toUpperCase() || "B"}</div>}
                    <div><div style={{ fontWeight: 700, fontSize: 13 }}>{m.businesses?.name || "Business"}</div><div style={{ fontSize: 11, color: "var(--muted)", textTransform: "capitalize" }}>{m.role}</div></div>
                    {activeMode === m.id && <span style={{ marginLeft: "auto", color: "var(--green)", fontWeight: 700 }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>`
);

// Close switcher on outside click - add useEffect
c = c.replace(
  "  useEffect(() => { load(); }, [load]);",
  `  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-switcher]')) setShowSwitcher(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);`
);

fs.writeFileSync('app/dashboard/page.tsx', c, 'utf8');

// Verify
const result = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
console.log('memberships state:', result.includes('memberships'));
console.log('showSwitcher:', result.includes('showSwitcher'));
console.log('Switch Account UI:', result.includes('Switch Account'));
console.log('memberships API call:', result.includes('/api/team/memberships'));
console.log(result.includes('Switch Account') ? 'SUCCESS' : 'FAILED');