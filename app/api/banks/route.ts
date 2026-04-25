import { NextResponse } from "next/server";
import { getBanks } from "@/lib/paystack";

export async function GET() {
  try {
    const banks = await getBanks();
    return NextResponse.json({ banks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}