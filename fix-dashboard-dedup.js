const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Remove duplicate isMarketer and isAdmin declarations
// Keep only the first occurrence of each
let fixed = c;

// Count occurrences
const marketerCount = (c.match(/const \[isMarketer, setIsMarketer\]/g) || []).length;
const adminCount = (c.match(/const \[isAdmin, setIsAdmin\]/g) || []).length;
console.log('isMarketer declarations:', marketerCount);
console.log('isAdmin declarations:', adminCount);

// Remove the duplicate lines added by fix-dashboard-nav.js
// The duplicate was added BEFORE isStaff, remove those
fixed = fixed.replace(
  '  const [isMarketer, setIsMarketer] = useState(false);\n  const [isAdmin, setIsAdmin] = useState(false);\n  const [isStaff, setIsStaff] = useState(false);\n  const [isMarketer, setIsMarketer] = useState(false);\n  const [isAdmin, setIsAdmin] = useState(false);',
  '  const [isStaff, setIsStaff] = useState(false);\n  const [isMarketer, setIsMarketer] = useState(false);\n  const [isAdmin, setIsAdmin] = useState(false);'
);

fs.writeFileSync('app/dashboard/page.tsx', fixed, 'utf8');

// Verify
const result = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
const mCount = (result.match(/const \[isMarketer, setIsMarketer\]/g) || []).length;
const aCount = (result.match(/const \[isAdmin, setIsAdmin\]/g) || []).length;
console.log('After fix - isMarketer:', mCount, 'isAdmin:', aCount);
console.log(mCount === 1 && aCount === 1 ? 'SUCCESS' : 'STILL HAS DUPLICATES');