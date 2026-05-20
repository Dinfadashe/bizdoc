import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendReceiptEmail } from "@/lib/email";
import { generateReceiptNumber } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabaseAdmin.from("invoices").select("*").eq("id", id).single();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invoice: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, paid_at, payment_method, ...rest } = body;

    const { data: invoice } = await supabaseAdmin.from("invoices").select("*").eq("id", id).single();
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const updateData: any = { ...rest };
    if (status) updateData.status = status;
    if (paid_at) updateData.paid_at = paid_at;

    const { data: updated } = await supabaseAdmin.from("invoices").update(updateData).eq("id", id).select().single();

    // If marking as paid, create receipt and deduct inventory
    if (status === "paid" && invoice.status !== "paid") {
      // Create receipt
      const receiptNumber = generateReceiptNumber(invoice.invoice_number);
      const { data: receipt } = await supabaseAdmin.from("receipts").insert({
        invoice_id: id,
        user_id: invoice.user_id,
        receipt_number: receiptNumber,
        amount_paid: invoice.total,
        payment_method: payment_method || "cash",
        paystack_reference: "MANUAL-" + Date.now(),
        paid_at: paid_at || new Date().toISOString(),
      }).select().single();

      // Send receipt email
      if (invoice.client_email && receipt) {
        const { data: business } = await supabaseAdmin.from("businesses").select("*").eq("user_id", invoice.user_id).single();
        if (business) { await sendReceiptEmail(invoice, receipt, business).catch(console.error); }
      }

      // Deduct inventory for each line item
      if (Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
          if (!item.description) continue;
          // Find matching inventory item by name
          const { data: invItems } = await supabaseAdmin.from("inventory")
            .select("id, quantity, name")
            .eq("user_id", invoice.user_id)
            .ilike("name", item.description.trim());
          if (invItems && invItems.length > 0) {
            const invItem = invItems[0];
            const newQty = Math.max(0, Number(invItem.quantity) - Number(item.qty));
            await supabaseAdmin.from("inventory").update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("id", invItem.id);
            await supabaseAdmin.from("stock_movements").insert({
              user_id: invoice.user_id,
              inventory_id: invItem.id,
              type: "out",
              quantity: item.qty,
              reference: invoice.invoice_number,
              note: "Auto-deducted from invoice " + invoice.invoice_number,
            });
          }
        }
      }
    }

    return NextResponse.json({ invoice: updated });
  } catch (err: unknown) {
    console.error("PATCH invoice error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}