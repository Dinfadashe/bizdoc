import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { token, user_id } = await req.json();
    if (!token || !user_id) {
      return NextResponse.json({ error: "token and user_id required" }, { status: 400 });
    }

    const { data: invite } = await supabaseAdmin
      .from("team_members")
      .select("*")
      .eq("invite_token", token)
      .eq("status", "pending")
      .single();

    if (!invite) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
    }

    await supabaseAdmin
      .from("team_members")
      .update({ member_user_id: user_id, status: "active", invite_token: null })
      .eq("id", invite.id);

    return NextResponse.json({ ok: true, business_id: invite.business_id, owner_user_id: invite.owner_user_id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}