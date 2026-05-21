const fs = require('fs');
let c = fs.readFileSync('app/settings/page.tsx', 'utf8');
const start = c.indexOf('{tab === "catalog_old_hidden"');
const end = c.indexOf('{tab === "team"');
if (start > 0 && end > 0) {
  c = c.substring(0, start) + c.substring(end);
  fs.writeFileSync('app/settings/page.tsx', c, 'utf8');
  console.log('Fixed');
} else {
  console.log('Pattern not found - start:', start, 'end:', end);
}