import { schedule } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Runs every hour
export const handler = schedule("0 * * * *", async () => {
  const now = new Date().toISOString();

  // Find all sent invoices with a due_date in the past
  const { data: overdueInvoices, error } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, due_date")
    .eq("status", "sent")
    .lt("due_date", now);

  if (error) {
    console.error("Error fetching overdue invoices:", error);
    return { statusCode: 500 };
  }

  if (!overdueInvoices || overdueInvoices.length === 0) {
    console.log("No overdue invoices found");
    return { statusCode: 200 };
  }

  console.log(`Cancelling ${overdueInvoices.length} overdue invoices`);

  const ids = overdueInvoices.map((inv: any) => inv.id);

  const { error: updateError } = await supabaseAdmin
    .from("invoices")
    .update({ status: "cancelled" })
    .in("id", ids);

  if (updateError) {
    console.error("Error cancelling invoices:", updateError);
    return { statusCode: 500 };
  }

  console.log("Cancelled invoices:", ids);
  return { statusCode: 200 };
});