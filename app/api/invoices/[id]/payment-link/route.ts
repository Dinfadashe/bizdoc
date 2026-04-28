import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

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
      .select("subaccount_code, name")
      .eq("user_id", invoice.user_id)
      .single();

    const amountKobo = Math.round(Number(invoice.total) * 100);

    const body: any = {
      email: invoice.client_email || "customer@bizdoc.app",
      amount: amountKobo,
      currency: invoice.currency || "NGN",
      metadata: { invoice_id: id },
      callback_url: process.env.NEXT_PUBLIC_APP_URL + "/invoices/" + id + "/pay",
    };

    if (business?.subaccount_code && invoice.currency === "NGN") {
      body.subaccount = business.subaccount_code;
      body.bearer = "subaccount";
      body.transaction_charge = Math.round(amountKobo * 0.02);
    }

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + PAYSTACK_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!data.status) throw new Error(data.message ?? "Paystack error");

    await supabaseAdmin
      .from("invoices")
      .update({
        status: "sent",
        payment_url: data.data.authorization_url,
        paystack_access_code: data.data.access_code,
        paystack_reference: data.data.reference,
      })
      .eq("id", id);

    return NextResponse.json({ payment_url: data.data.authorization_url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Payment link error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}