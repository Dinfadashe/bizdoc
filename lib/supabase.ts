
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = typeof window !== "undefined" || process.env.NEXT_PUBLIC_SUPABASE_URL

  ? createClient(url, anon)

  : null as any;

export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY

  ? createClient(url, service, {

      auth: { autoRefreshToken: false, persistSession: false },

    })

  : null as any;

