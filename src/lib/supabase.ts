import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Desktop OAuth comes back through a localhost loopback server (the
    // tauri-plugin-oauth `onUrl` listener hands us the redirect URL, which we
    // exchange for a session ourselves), so disable the browser-only URL
    // detection that would otherwise race us for the auth code.
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});
