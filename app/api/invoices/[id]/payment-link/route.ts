import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendInvoiceEmail } from "@/lib/email";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://bizdoc-app.netlify.app").replace(/\/+$/, "");

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("*")
      .eq("user_id", invoice.user_id)
      .single();

    // The pay page is the payment URL — no Paystack involved
    const paymentUrl = `${APP_URL}/invoices/${id}/pay`;

    await supabaseAdmin
      .from("invoices")
      .update({ status: "sent", payment_url: paymentUrl })
      .eq("id", id);

    // Email invoice to client with pay page link
    if (invoice.client_email && business) {
      console.log("Sending invoice email to:", invoice.client_email);
      const emailResult = await sendInvoiceEmail(invoice, business, paymentUrl);
      console.log("Invoice email result:", JSON.stringify(emailResult));
    } else {
      console.log("Skipping email - missing:", { email: invoice.client_email, business: !!business });
    }

    return NextResponse.json({ payment_url: paymentUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Payment link error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}