import { createClient } from "@supabase/supabase-js";

const url = "https://dmfxgcouxbgvcomartrv.supabase.co";
const anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZnhnY291eGJndmNvbWFydHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwODEzMzAsImV4cCI6MjA5MjY1NzMzMH0.UC0MmiIzv3yGNZ4OjRh0QmNYbhw--hfKJqIrxEBHSLw";

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "bizdoc-auth",
  },
});

export const supabaseAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZnhnY291eGJndmNvbWFydHJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA4MTMzMCwiZXhwIjoyMDkyNjU3MzMwfQ.D3_EnOMKHjwWlsidM8idjopGOSUwLowXcdOd0X5oIJ8", {
  auth: { autoRefreshToken: false, persistSession: false },
});
