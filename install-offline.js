const fs = require('fs');
const path = require('path');

function write(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
  const lines = content.split('\n').length;
  const bytes = Buffer.byteLength(content, 'utf8');
  console.log('✓', p, '(' + lines + ' lines, ' + bytes + ' bytes)');
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

// 1. Dashboard - offline-capable
write('app/dashboard/page.tsx', read('/home/claude/dashboard-offline.tsx'));

// 2. globals.css addition - ensure CSS vars exist
let css = fs.readFileSync('app/globals.css', 'utf8');
if (!css.includes('--green-light')) {
  css += '\n:root { --green-light: #e8f5ef; --green-accent: #2e7d52; }\n';
  fs.writeFileSync('app/globals.css', css, 'utf8');
  console.log('✓ globals.css patched with missing CSS vars');
}

// 3. Verify offline lib files exist
const required = [
  'lib/offline/db.ts',
  'lib/offline/sync.ts',
  'components/SyncStatusBadge.tsx',
  'components/SyncStatusBadgeWrapper.tsx',
];
let allGood = true;
for (const f of required) {
  if (fs.existsSync(f)) {
    const stat = fs.statSync(f);
    console.log('✓ exists:', f, '(' + stat.size + ' bytes)');
  } else {
    console.log('✗ MISSING:', f);
    allGood = false;
  }
}

if (!allGood) {
  console.log('\nERROR: Some offline lib files are missing. Re-run the file placement step first.');
  process.exit(1);
}

console.log('\nAll done. Ready to push.');
