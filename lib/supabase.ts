import { createClient } from "@supabase/supabase-js";

const url = "https://dmfxgcouxbgvcomartrv.supabase.co";
const anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZnhnY291eGJndmNvbWFydHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwODEzMzAsImV4cCI6MjA5MjY1NzMzMH0.UC0MmiIzv3yGNZ4OjRh0QmNYbhw--hfKJqIrxEBHSLw";
const service = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZnhnY291eGJndmNvbWFydHJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA4MTMzMCwiZXhwIjoyMDkyNjU3MzMwfQ.D3_EnOMKHjwWlsidM8idjopGOSUwLowXcdOd0X5oIJ8";

export const supabase = createClient(url, anon);

export const supabaseAdmin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});
