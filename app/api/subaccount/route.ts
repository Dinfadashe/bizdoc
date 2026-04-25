import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createSubaccount } from "@/lib/paystack";

export async function POST(req: NextRequest) {
  try {
    const { user_id, business_name, bank_code, bank_name, account_number } = await req.json();

    if (!user_id || !business_name || !bank_code || !account_number) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const { subaccount_code, subaccount_id, account_name } = await createSubaccount({
      businessName: business_name,
      bankCode: bank_code,
      accountNumber: account_number,
    });

    const { data, error } = await supabaseAdmin
      .from("businesses")
      .update({
        account_name,
        account_number,
        bank_code,
        bank_name,
        subaccount_code,
        subaccount_id,
        onboarding_complete: true,
      })
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ business: data, subaccount_code });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}