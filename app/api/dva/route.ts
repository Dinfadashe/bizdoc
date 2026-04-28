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
      .select("account_name, name")
      .eq("user_id", user_id)
      .single();

    // Use payout account_name if available, else business name
    const accountName = business?.account_name || business?.name || "Business Owner";
    const nameParts = accountName.trim().split(" ");
    const firstName = nameParts[0] ?? "Business";
    const lastName = nameParts.slice(1).join(" ") || "Owner";

    const { bank, account_number, account_name, dva_reference } = await createDedicatedVirtualAccount({
      email,
      phone,
      firstName,
      lastName,
      businessName: accountName,
      preferredBank: preferred_bank ?? "titan-paystack",
    });

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
