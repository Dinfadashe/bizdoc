import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_EMAIL = "dinfadashe@gmail.com";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  const admin = searchParams.get("admin");
  const ticket_id = searchParams.get("ticket_id");

  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  // Verify admin
  if (admin === "1") {
    const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (adminUser?.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (ticket_id) {
      const { data: messages } = await supabaseAdmin
        .from("ticket_messages").select("*").eq("ticket_id", ticket_id)
        .order("created_at");
      // Mark messages as read
      await supabaseAdmin.from("ticket_messages")
        .update({ read: true }).eq("ticket_id", ticket_id).eq("sender_type", "user");
      return NextResponse.json({ messages: messages ?? [] });
    }
    const { data: tickets } = await supabaseAdmin
      .from("support_tickets").select("*, ticket_messages(count)")
      .order("updated_at", { ascending: false });
    return NextResponse.json({ tickets: tickets ?? [] });
  }

  // User: get own tickets
  if (ticket_id) {
    const { data: messages } = await supabaseAdmin
      .from("ticket_messages").select("*").eq("ticket_id", ticket_id)
      .order("created_at");
    await supabaseAdmin.from("ticket_messages")
      .update({ read: true }).eq("ticket_id", ticket_id).eq("sender_type", "admin");
    return NextResponse.json({ messages: messages ?? [] });
  }

  const { data: tickets } = await supabaseAdmin
    .from("support_tickets").select("*").eq("user_id", user_id)
    .order("updated_at", { ascending: false });
  return NextResponse.json({ tickets: tickets ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, user_id, ticket_id, message, subject, priority, admin } = body;

    if (action === "create_ticket") {
      const { data: userInfo } = await supabaseAdmin.auth.admin.getUserById(user_id);
      const email = userInfo?.user?.email || "";
      const { data: biz } = await supabaseAdmin.from("businesses").select("name").eq("user_id", user_id).single();
      const { data: marketer } = await supabaseAdmin.from("marketers").select("id").eq("user_id", user_id).single();
      const role = email === ADMIN_EMAIL ? "Admin" : marketer ? "Marketer" : "Business";
      const { data: ticket, error } = await supabaseAdmin.from("support_tickets").insert({
        user_id, subject, priority: priority || "normal",
        user_email: email,
        business_name: biz?.name || email,
        status: "open",
      }).select().single();
      if (error) throw error;
      // Add first message
      if (message) {
        await supabaseAdmin.from("ticket_messages").insert({
          ticket_id: ticket.id, sender_id: user_id,
          sender_type: "user", message,
          read: false,
        });
      }
      return NextResponse.json({ ticket });
    }

    if (action === "send_message") {
      const isAdmin = admin === "1";
      const { data: msg, error } = await supabaseAdmin.from("ticket_messages").insert({
        ticket_id, sender_id: user_id,
        sender_type: isAdmin ? "admin" : "user",
        message, read: false,
      }).select().single();
      if (error) throw error;
      // Update ticket updated_at and status
      const updates: any = { updated_at: new Date().toISOString() };
      if (!isAdmin) updates.status = "open";
      if (isAdmin) updates.status = "in_progress";
      await supabaseAdmin.from("support_tickets").update(updates).eq("id", ticket_id);
      return NextResponse.json({ message: msg });
    }

    if (action === "update_status") {
      const updates: any = { status: body.status, updated_at: new Date().toISOString() };
      if (body.status === "resolved") updates.resolved_at = new Date().toISOString();
      await supabaseAdmin.from("support_tickets").update(updates).eq("id", ticket_id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}