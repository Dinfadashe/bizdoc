import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false });

  const { data: invite } = await supabaseAdmin
    .from("team_members")
    .select("member_email, business_id, status")
    .eq("invite_token", token)
    .eq("status", "pending")
    .single();

  if (!invite) return NextResponse.json({ valid: false });

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("name")
    .eq("id", invite.business_id)
    .single();

  return NextResponse.json({
    valid: true,
    member_email: invite.member_email,
    business_name: business?.name ?? "a business",
  });
}