import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !anon) {
  console.error("Missing Supabase env vars:", { url: !!url, anon: !!anon });
}

export const supabase = url && anon ? createClient(url, anon) : null as any;

export const supabaseAdmin = url && service ? createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
}) : null as any;
