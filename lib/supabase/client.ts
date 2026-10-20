import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Client-side Supabase client (uses anon key, respects RLS)
export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
