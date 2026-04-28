import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const owner_user_id = searchParams.get("owner_user_id");
  if (!owner_user_id) return NextResponse.json({ error: "owner_user_id required" }, { status: 400 });

  const { data } = await supabaseAdmin
    .from("team_members")
    .select("*")
    .eq("owner_user_id", owner_user_id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ members: data ?? [] });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await supabaseAdmin.from("team_members").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}