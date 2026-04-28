const fs = require('fs');
let content = fs.readFileSync('app/invoices/[id]/page.tsx', 'utf8');

// Fix the notes/payment grid to use full width for payment when no notes
const oldGrid = `          <div style={{ padding: "20px 32px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              {invoice.notes && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{invoice.notes}</div>
                </>
              )}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 8 }}>Payment Options</div>`;

const newGrid = `          <div style={{ padding: "20px 32px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: invoice.notes ? "1fr 1fr" : "1fr", gap: 24 }}>
            {invoice.notes && (
            <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{invoice.notes}</div>
            </div>
            )}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 8 }}>Payment Options</div>`;

content = content.replace(oldGrid, newGrid);

// Also remove the old empty notes div that was inside
const oldNotesDiv = `            <div>
              {invoice.notes && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "var(--muted)", marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{invoice.notes}</div>
                </>
              )}
            </div>`;

fs.writeFileSync('app/invoices/[id]/page.tsx', content, { encoding: 'utf8' });
console.log('Done - check output');
console.log('Notes div still present:', content.includes(oldNotesDiv));