// Just confirm the fix - run this SQL in Supabase:
console.log("Run this in Supabase SQL Editor:");
console.log("DELETE FROM team_members WHERE member_user_id = '7ba42efe-bee4-4e32-b62d-75589239b69c' AND owner_user_id = 'b6019332-03b6-4480-8065-e357ef1057d3';");
console.log("");
console.log("This removes you from the old team that was causing wrong invoices to show.");