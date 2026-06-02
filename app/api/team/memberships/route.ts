import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  // Get all businesses this user is a team member of
  const { data: memberships } = await supabaseAdmin
    .from("team_members")
    .select("id, role, status, owner_user_id, businesses(id, name, logo_url)")
    .eq("member_user_id", user_id)
    .eq("status", "active");

  return NextResponse.json({ memberships: memberships ?? [] });
}