// POST /api/invoices/[id]/payment-link
// Generates a Paystack payment link and saves it on the invoice
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { initializePayment, } from "@/lib/paystack";
import { nairaToKobo } from "@/lib/utils";
import { sendInvoiceEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Fetch invoice
    const { data: invoice, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (invErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Fetch business profile
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("*")
      .eq("user_id", invoice.user_id)
      .single();

    if (!invoice.client_email) {
      return NextResponse.json({ error: "Client email required" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const callbackUrl = `${appUrl}/invoices/${id}/pay?verified=1`;

    // If NGN: send in kobo. Otherwise use amount as-is (Paystack supports multi-currency)
    const amountKobo = invoice.currency === "NGN"
      ? nairaToKobo(invoice.total)
      : Math.round(invoice.total * 100);

    const { authorization_url, access_code, reference } = await initializePayment({
      email: invoice.client_email,
      amountKobo,
      reference: `${invoice.invoice_number}-${Date.now()}`,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name,
      },
      callbackUrl,
    });

    // Save payment URL & reference to invoice + mark as "sent"
    await supabaseAdmin
      .from("invoices")
      .update({
        paystack_reference: reference,
        paystack_access_code: access_code,
        payment_url: authorization_url,
        status: "sent",
      })
      .eq("id", id);

    // Send invoice email to client
    if (invoice.client_email) {
      await sendInvoiceEmail(
        { ...invoice, payment_url: authorization_url },
        business,
        authorization_url
      ).catch(console.error);
    }

    return NextResponse.json({ payment_url: authorization_url, reference });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
