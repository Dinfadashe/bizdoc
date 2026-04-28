const https = require('https');

const PAYSTACK_SECRET = 'sk_live_77bb9f248fa692e3c215fb90e64d0ce2ebc8b4f1';
const SUPABASE_URL = 'https://dmfxgcouxbgvcomartrv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZnhnY291eGJndmNvbWFydHJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA4MTMzMCwiZXhwIjoyMDkyNjU3MzMwfQ.D3_EnOMKHjwWlsidM8idjopGOSUwLowXcdOd0X5oIJ8';

async function fetch(url, options = {}) {
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch(url, options);
}

async function main() {
  // Get all businesses with DVA
  const bizRes = await fetch(
    `${SUPABASE_URL}/rest/v1/businesses?dva_account_number=not.is.null&select=user_id,name,dva_reference,dva_account_number`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    }
  );
  const businesses = await bizRes.json();
  console.log(`Found ${businesses.length} businesses with DVA`);

  for (const biz of businesses) {
    if (!biz.dva_reference) {
      console.log(`Skipping ${biz.name} - no dva_reference`);
      continue;
    }

    const nameParts = (biz.name ?? 'Business Owner').trim().split(' ');
    const firstName = nameParts[0] ?? 'Business';
    const lastName = nameParts.slice(1).join(' ') || 'Owner';

    console.log(`Updating customer ${biz.dva_reference} for ${biz.name}...`);

    // Update Paystack customer with correct name
    const updateRes = await fetch(`https://api.paystack.co/customer/${biz.dva_reference}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
      }),
    });
    const updateData = await updateRes.json();
    console.log(`Customer update:`, updateData.status, updateData.message);
  }

  console.log('Migration complete');
}

main().catch(console.error);