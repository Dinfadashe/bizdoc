// POST /api/dva — create a dedicated virtual account for a business
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createDedicatedVirtualAccount } from "@/lib/paystack";

export async function POST(req: NextRequest) {
  try {
    const { user_id, first_name, last_name, email, phone, preferred_bank } = await req.json();

    if (!user_id || !first_name || !last_name || !email) {
      return NextResponse.json({ error: "user_id, first_name, last_name and email are required" }, { status: 400 });
    }

    const { bank, account_number, account_name, dva_reference } = await createDedicatedVirtualAccount({
      customerId: user_id,
      firstName: first_name,
      lastName: last_name,
      email,
      phone,
      preferredBank: preferred_bank ?? "wema-bank",
    });

    // Save to business profile
    const { data, error } = await supabaseAdmin
      .from("businesses")
      .update({
        dva_bank: bank,
        dva_account_number: account_number,
        dva_account_name: account_name,
        dva_reference,
      })
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ business: data, account_number, bank, account_name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}