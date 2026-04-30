const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Replace the style block with a responsive one
const oldStyle = '        @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap");';

const newStyle = `        @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap");
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: rgba(255,255,255,0.25) !important; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #1a3520 inset !important; -webkit-text-fill-color: #fff !important; }
        .nav-link { color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px; transition: color 0.2s; }
        .nav-link:hover { color: #fff; }
        .btn-gold { background: #c9a84c; color: #0a1a0f; padding: 12px 28px; border-radius: 100px; font-size: 14px; font-weight: 500; text-decoration: none; transition: all 0.2s; display: inline-block; cursor: pointer; border: none; font-family: inherit; }
        .btn-gold:hover { background: #e8c870; }
        .btn-ghost { color: rgba(255,255,255,0.7); font-size: 14px; text-decoration: none; transition: color 0.2s; }
        .btn-ghost:hover { color: #fff; }
        .feature-card { background: #0f2318; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 32px; transition: border-color 0.2s; }
        .feature-card:hover { border-color: rgba(201,168,76,0.2); }
        .step-line { position: absolute; top: 28px; left: calc(50% + 28px); right: calc(-50% + 28px); height: 1px; background: rgba(201,168,76,0.2); }
        .currency-pill { background: #0f2318; border: 1px solid rgba(255,255,255,0.08); border-radius: 100px; padding: 14px 32px; transition: all 0.2s; cursor: default; }
        .currency-pill:hover { border-color: rgba(201,168,76,0.4); }
        .tab-btn { flex: 1; padding: 14px; border: none; cursor: pointer; font-family: inherit; font-size: 15px; font-weight: 500; transition: all 0.2s; border-radius: 10px; }
        .inp-wrap { position: relative; }
        .eye-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.4); font-size: 16px; }
        .auth-input:focus { border-color: rgba(201,168,76,0.5) !important; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.6s ease forwards; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .hero-visual-wrap { position: absolute; right: 60px; top: 50%; transform: translateY(-50%); width: 420px; z-index: 1; }
        .nav-desktop { display: flex; gap: 36px; align-items: center; }
        .nav-mobile-btn { display: none; background: none; border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 18px; }
        @media (max-width: 900px) {
          .nav-desktop { display: none; }
          .nav-mobile-btn { display: block; }
          .hero-visual-wrap { display: none; }
          .hero-title-size { font-size: 48px !important; letter-spacing: -1px !important; }
          .hero-section { padding: 60px 24px !important; min-height: auto !important; }
          .hero-content-width { max-width: 100% !important; }
          .hero-stats { gap: 24px !important; flex-wrap: wrap; }
          .section-pad { padding: 80px 24px !important; }
          .section-title-size { font-size: 36px !important; letter-spacing: -0.5px !important; }
          .features-grid-resp { grid-template-columns: 1fr !important; }
          .how-steps-resp { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          .step-line { display: none !important; }
          .currencies-resp { gap: 10px !important; }
          .currency-pill { padding: 10px 20px !important; }
          .testimonials-resp { grid-template-columns: 1fr !important; }
          .auth-grid-resp { grid-template-columns: 1fr !important; gap: 40px !important; }
          .auth-cta-title { font-size: 40px !important; }
          .footer-resp { flex-direction: column !important; gap: 24px !important; text-align: center !important; }
          .footer-links-resp { flex-wrap: wrap !important; justify-content: center !important; }
          .section-header-resp { flex-direction: column !important; gap: 20px !important; }
        }
        @media (max-width: 600px) {
          .hero-title-size { font-size: 38px !important; }
          .section-title-size { font-size: 30px !important; }
          .how-steps-resp { grid-template-columns: 1fr !important; }
          .features-grid-resp { grid-template-columns: 1fr !important; }
          .hero-actions-resp { flex-direction: column !important; align-items: flex-start !important; }
          .stat-num-size { font-size: 28px !important; }
          .nav-pad { padding: 16px 20px !important; }
          .auth-cta-title { font-size: 32px !important; }
        }`;

// Replace just the import line (the rest of the style is already in the file)
const oldStyleBlock = content.indexOf('        @import url("https://fonts.googleapis.com');
const oldStyleEnd = content.indexOf('`}</style>');

if (oldStyleBlock > -1 && oldStyleEnd > -1) {
  const beforeStyle = content.substring(0, oldStyleBlock);
  const afterStyle = content.substring(oldStyleEnd);
  content = beforeStyle + newStyle + '\n      ' + afterStyle;
  console.log('Style block replaced');
} else {
  console.log('Style block not found - indices:', oldStyleBlock, oldStyleEnd);
}

// Add responsive classes to key elements
content = content.replace(
  'padding: "80px 60px", position: "relative", overflow: "hidden" }}>',
  'padding: "80px 60px", position: "relative", overflow: "hidden" }} className="hero-section">'
);

content = content.replace(
  'style={{ position: "relative", zIndex: 1, maxWidth: "660px" }}>',
  'style={{ position: "relative", zIndex: 1, maxWidth: "660px" }} className="hero-content-width">'
);

content = content.replace(
  'fontSize: "76px", lineHeight: 1.02, fontWeight: 900, letterSpacing: "-2px", marginBottom: "24px" }}>',
  'fontSize: "76px", lineHeight: 1.02, fontWeight: 900, letterSpacing: "-2px", marginBottom: "24px" }} className="hero-title-size">'
);

content = content.replace(
  'style={{ display: "flex", gap: "16px", alignItems: "center" }}>',
  'style={{ display: "flex", gap: "16px", alignItems: "center" }} className="hero-actions-resp">'
);

content = content.replace(
  'style={{ display: "flex", gap: "48px", marginTop: "72px", paddingTop: "48px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>',
  'style={{ display: "flex", gap: "48px", marginTop: "72px", paddingTop: "48px", borderTop: "1px solid rgba(255,255,255,0.07)" }} className="hero-stats">'
);

content = content.replace(
  'style={{ position: "absolute", right: "60px", top: "50%", transform: "translateY(-50%)", width: "420px", zIndex: 1 }}>',
  'className="hero-visual-wrap">'
);

// Features section
content = content.replace(
  'style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>',
  'style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }} className="features-grid-resp">'
);

// Section padding
content = content.replace(/style=\{\{ padding: "120px 60px" \}\}/g, 'style={{ padding: "120px 60px" }} className="section-pad"');
content = content.replace(/style=\{\{ padding: "120px 60px", background: "#0f2318" \}\}/g, 'style={{ padding: "120px 60px", background: "#0f2318" }} className="section-pad"');
content = content.replace(/style=\{\{ padding: "120px 60px", textAlign: "center" \}\}/g, 'style={{ padding: "120px 60px", textAlign: "center" }} className="section-pad"');
content = content.replace(/style=\{\{ padding: "120px 60px", position: "relative", overflow: "hidden" \}\}/g, 'style={{ padding: "120px 60px", position: "relative", overflow: "hidden" }} className="section-pad"');

// Section titles
content = content.replace(/fontSize: "52px", fontWeight: 700, letterSpacing: "-1px", lineHeight: 1\.1, marginBottom: "20px"/g, 'fontSize: "52px", fontWeight: 700, letterSpacing: "-1px", lineHeight: 1.1, marginBottom: "20px"');
content = content.replace(/fontSize: "52px", fontWeight: 700, letterSpacing: "-1px", lineHeight: 1\.1 \}/g, 'fontSize: "52px", fontWeight: 700, letterSpacing: "-1px", lineHeight: 1.1 }} className="section-title-size"');
content = content.replace(/fontSize: "52px", fontWeight: 700, letterSpacing: "-1px", lineHeight: 1\.1, marginBottom: "48px"/g, 'fontSize: "52px", fontWeight: 700, letterSpacing: "-1px", lineHeight: 1.1, marginBottom: "48px"');

// How steps
content = content.replace(
  'style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0", position: "relative" }}>',
  'style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0", position: "relative" }} className="how-steps-resp">'
);

// Testimonials
content = content.replace(
  'style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>',
  'style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }} className="testimonials-resp">'
);

// Auth grid
content = content.replace(
  'style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center", maxWidth: "1100px", margin: "0 auto" }}>',
  'style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center", maxWidth: "1100px", margin: "0 auto" }} className="auth-grid-resp">'
);

// Footer
content = content.replace(
  'style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 60px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>',
  'style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 60px", display: "flex", justifyContent: "space-between", alignItems: "center" }} className="footer-resp">'
);

// Nav padding
content = content.replace(
  'style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 60px", position: "sticky"',
  'style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 60px", position: "sticky"'
);

// Nav links div
content = content.replace(
  '<div style={{ display: "flex", gap: "36px", alignItems: "center" }}>',
  '<div className="nav-desktop">'
);

// Section header flex
content = content.replace(
  'style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "64px" }}>',
  'style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "64px" }} className="section-header-resp">'
);

// Currencies flex
content = content.replace(
  'style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>',
  'style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }} className="currencies-resp">'
);

fs.writeFileSync('app/page.tsx', content, { encoding: 'utf8' });
console.log('Done - responsive landing page written');