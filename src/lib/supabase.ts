/**
 * Supabase client singleton. Imported everywhere data is needed.
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.
 * See .env.example for setup.
 *
 * NOTE: For native iOS/Android, auth is persisted via Capacitor Preferences
 * (see useAuth.ts) so sessions survive app restarts.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
    "Copy .env.example to .env.local and fill in your project credentials.",
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
