import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const supabase = createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "bizdoc-auth" } });
export const supabaseAdmin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
