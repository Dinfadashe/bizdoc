import { NextRequest, NextResponse } from "next/server";
import { resolveBankAccount } from "@/lib/paystack";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const account_number = searchParams.get("account_number") ?? "";
  const bank_code = searchParams.get("bank_code") ?? "";

  if (!account_number || !bank_code) {
    return NextResponse.json({ error: "account_number and bank_code required" }, { status: 400 });
  }

  try {
    const result = await resolveBankAccount(account_number, bank_code);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}