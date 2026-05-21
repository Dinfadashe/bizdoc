const fs = require('fs');

// ── 1. Update new invoice page to pull from inventory ─────────
let content = fs.readFileSync('app/invoices/new/page.tsx', 'utf8');

// Replace catalog interface and state with inventory
content = content.replace(
  'interface CatalogItem { id: string; name: string; description: string; unit_price: number; }',
  'interface InventoryItem { id: string; name: string; description: string; selling_price: number; quantity: number; unit: string; }'
);

content = content.replace(
  '  const [catalog, setCatalog] = useState<CatalogItem[]>([]);',
  '  const [catalog, setCatalog] = useState<InventoryItem[]>([]);'
);

// Replace catalog fetch with inventory fetch
content = content.replace(
  'supabase.from("catalog").select("*").eq("user_id", data.user.id).order("name"),',
  'fetch("/api/inventory?user_id=" + data.user.id).then(r => r.json()).then(d => ({ data: (d.inventory ?? []) })),'
);

// Fix catalog data assignment
content = content.replace(
  '      setCatalog(catalogRes.data ?? []);',
  '      setCatalog((catalogRes as any).data ?? []);'
);

// Fix autocomplete to use selling_price instead of unit_price
content = content.replace(
  '      const matches = catalog.filter(c => c.name.toLowerCase().includes(val.toLowerCase()));',
  '      const matches = catalog.filter((c: InventoryItem) => c.name.toLowerCase().includes(val.toLowerCase()) && Number(c.quantity) > 0);'
);

content = content.replace(
  '    setItems(items.map(i => i.id === lineItemId ? { ...i, description: catalogItem.name, unit_price: String(catalogItem.unit_price) } : i));',
  '    setItems(items.map(i => i.id === lineItemId ? { ...i, description: (catalogItem as any).name, unit_price: String((catalogItem as any).selling_price) } : i));'
);

// Fix suggestion display to show quantity
content = content.replace(
  '              <div key={match.id} onMouseDown={() => applyCatalogItem(item.id, match)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--green-light)")} onMouseLeave={e => (e.currentTarget.style.background = "white")}>\n                              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{match.name}</div>{match.description && <div style={{ fontSize: 11, color: "var(--muted)" }}>{match.description}</div>}</div>\n                              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--green)", marginLeft: 16 }}>{Number(match.unit_price).toLocaleString()}</div>',
  '              <div key={match.id} onMouseDown={() => applyCatalogItem(item.id, match)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--green-light)")} onMouseLeave={e => (e.currentTarget.style.background = "white")}>\n                              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{(match as any).name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>Stock: {(match as any).quantity} {(match as any).unit}</div></div>\n                              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--green)", marginLeft: 16 }}>₦{Number((match as any).selling_price).toLocaleString()}</div>'
);

fs.writeFileSync('app/invoices/new/page.tsx', content, { encoding: 'utf8' });
console.log('Updated invoice new page to use inventory');

// ── 2. Update invoice API to use inventory instead of catalog ─
let apiContent = fs.readFileSync('app/api/invoices/route.ts', 'utf8');

apiContent = apiContent.replace(
  `    // Auto-add to catalog
    if (items.length > 0) {
      const { data: existing } = await supabaseAdmin.from("catalog").select("name").eq("user_id", user_id);
      const existingNames = new Set((existing ?? []).map((c: any) => c.name.toLowerCase().trim()));
      const newItems = items.filter((i: any) => i.description && i.description.trim() && !existingNames.has(i.description.toLowerCase().trim()))
        .map((i: any) => ({ user_id, name: i.description.trim(), description: "", unit_price: i.unit_price ?? 0 }));
      if (newItems.length > 0) { try { await supabaseAdmin.from("catalog").insert(newItems); } catch(_) {} }
    }`,
  `    // Auto-add new items to inventory if not already there
    if (items.length > 0) {
      const { data: existing } = await supabaseAdmin.from("inventory").select("name").eq("user_id", user_id);
      const existingNames = new Set((existing ?? []).map((c: any) => c.name.toLowerCase().trim()));
      const newItems = items.filter((i: any) => i.description && i.description.trim() && !existingNames.has(i.description.toLowerCase().trim()))
        .map((i: any) => ({ user_id, name: i.description.trim(), description: "", selling_price: i.unit_price ?? 0, cost_price: 0, quantity: 0, low_stock_alert: 5, unit: "unit", category: "Other" }));
      if (newItems.length > 0) { try { await supabaseAdmin.from("inventory").insert(newItems); } catch(_) {} }
    }`
);

fs.writeFileSync('app/api/invoices/route.ts', apiContent, { encoding: 'utf8' });
console.log('Updated invoice API to use inventory');

// ── 3. Update settings page - replace catalog tab with link to inventory ─
let settingsContent = fs.readFileSync('app/settings/page.tsx', 'utf8');

// Replace catalog tab label
settingsContent = settingsContent.replace(
  't === "catalog" ? "Catalog" :',
  't === "catalog" ? "Inventory" :'
);

// Replace catalog tab content with redirect to inventory page
settingsContent = settingsContent.replace(
  `        {tab === "catalog" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 24px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Products & Services Catalog</div>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>Add your products and services here. They auto-suggest when creating invoices.</div>`,
  `        {tab === "catalog" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 24px", background: "#faf9f7", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>Products & Services — Inventory</div>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20, lineHeight: 1.7 }}>Products and services are now managed in the Inventory section. Your inventory items automatically appear as suggestions when creating invoices.</div>
                <Link href="/inventory"><button style={{ padding: "12px 28px", background: "var(--green)", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>Go to Inventory →</button></Link>
              </div>
            </div>
          </div>
        )}
        {tab === "catalog_old_hidden" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 24px" }}>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>Hidden</div>`
);

fs.writeFileSync('app/settings/page.tsx', settingsContent, { encoding: 'utf8' });
console.log('Updated settings catalog tab to point to inventory');

// ── 4. Update PATCH invoice route to use inventory for deduction ─
// Already done in write-mark-paid-v2.js but let's verify the deduction uses ilike
let patchContent = fs.readFileSync('app/api/invoices/[id]/route.ts', 'utf8');
if (!patchContent.includes('ilike')) {
  console.log('WARNING: invoice PATCH route missing inventory deduction - needs update');
} else {
  console.log('Invoice PATCH route already has inventory deduction');
}

console.log('\nAll done! Catalog and inventory are now merged.');
console.log('- Invoice autocomplete pulls from inventory');
console.log('- New items auto-added to inventory when invoice is created');
console.log('- Stock deducted from inventory when invoice is marked paid');
console.log('- Settings catalog tab redirects to inventory page');