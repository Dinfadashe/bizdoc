const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Remove switcher from business name area
c = c.replace(
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
          </div>`,
  `<div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "white" }}>
              {business?.name || "BizDoc"}
            </div>`
);

// Add switcher button before Sign Out in desktop nav
c = c.replace(
  `<button onClick={signOut} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Sign Out</button>`,
  `{memberships.length > 0 && (
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowSwitcher(!showSwitcher)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 5 }}>
                  ⇄ Switch Account
                </button>
                {showSwitcher && (
                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, background: "white", borderRadius: 10, border: "1px solid var(--border)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 200, minWidth: 240, overflow: "hidden" }}>
                    <div style={{ padding: "8px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>Switch Account</div>
                    <div onClick={() => { setActiveMode("own"); setShowSwitcher(false); if (user) load(user.id); }} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: activeMode === "own" ? "var(--green-light)" : "white", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0 }}>B</div>
                      <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>My Business</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Owner account</div></div>
                      {activeMode === "own" && <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span>}
                    </div>
                    {memberships.map((m: any) => (
                      <div key={m.id} onClick={() => { setActiveMode(m.id); setShowSwitcher(false); load(m.owner_user_id); }} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: activeMode === m.id ? "var(--green-light)" : "white", borderBottom: "1px solid var(--border)" }}>
                        {m.businesses?.logo_url ? <img src={m.businesses.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "contain", border: "1px solid var(--border)", flexShrink: 0 }}/> : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e8f0ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#2255cc", flexShrink: 0 }}>{m.businesses?.name?.[0]?.toUpperCase() || "B"}</div>}
                        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{m.businesses?.name || "Business"}</div><div style={{ fontSize: 11, color: "var(--muted)", textTransform: "capitalize" as const }}>{m.role}</div></div>
                        {activeMode === m.id && <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button onClick={signOut} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)" }}>Sign Out</button>`
);

// Also add to mobile menu
c = c.replace(
  `          <button onClick={() => { setMenuOpen(false); signOut(); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#ff8a8a", padding: "12px 8px", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", marginTop: 4 }}>
            Sign Out
          </button>`,
  `          {memberships.length > 0 && memberships.map((m: any) => (
            <div key={m.id} onClick={() => { setActiveMode(m.id); setMenuOpen(false); load(m.owner_user_id); }} style={{ padding: "12px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 15 }}>⇄</span>
              <div><div style={{ color: "white", fontSize: 15, fontFamily: "var(--font-body)" }}>{m.businesses?.name}</div><div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Switch to this team</div></div>
              {activeMode === m.id && <span style={{ marginLeft: "auto", color: "#a8d5b5", fontWeight: 700 }}>✓</span>}
            </div>
          ))}
          {activeMode !== "own" && (
            <div onClick={() => { setActiveMode("own"); setMenuOpen(false); if (user) load(user.id); }} style={{ padding: "12px 8px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, fontFamily: "var(--font-body)" }}>⇄ Switch to My Business</span>
            </div>
          )}
          <button onClick={() => { setMenuOpen(false); signOut(); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#ff8a8a", padding: "12px 8px", cursor: "pointer", fontSize: 15, fontFamily: "var(--font-body)", marginTop: 4 }}>
            Sign Out
          </button>`
);

fs.writeFileSync('app/dashboard/page.tsx', c, 'utf8');

const result = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
console.log('Switch Account button near Sign Out:', result.includes('⇄ Switch Account'));
console.log('Mobile switcher:', result.includes('Switch to this team'));
console.log(result.includes('⇄ Switch Account') ? 'SUCCESS' : 'FAILED');