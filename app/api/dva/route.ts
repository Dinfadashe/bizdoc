import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createDedicatedVirtualAccount } from "@/lib/paystack";

export async function POST(req: NextRequest) {
  try {
    const { user_id, email, phone, preferred_bank } = await req.json();

    if (!user_id || !email) {
      return NextResponse.json({ error: "user_id and email are required" }, { status: 400 });
    }

    // Fetch business payout account name
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("account_name, name, phone")
      .eq("user_id", user_id)
      .single();

    // Use payout account_name as DVA name - split into first/last for Paystack
    const displayName = business?.account_name || business?.name || "Business Owner";
    const nameParts = displayName.trim().split(" ");
    const firstName = nameParts.slice(0, -1).join(" ") || nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "Account";
    const businessPhone = phone || business?.phone || "08000000000";

    const { bank, account_number, account_name, dva_reference } = await createDedicatedVirtualAccount({
      email,
      phone: businessPhone,
      firstName,
      lastName,
      businessName: displayName,
      preferredBank: preferred_bank ?? "titan-paystack",
    });

    const { data, error } = await supabaseAdmin
      .from("businesses")
      .update({
        dva_bank: bank,
        dva_account_number: account_number,
        dva_account_name: account_name || displayName,
        dva_reference,
      })
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ business: data, account_number, bank, account_name: account_name || displayName });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
