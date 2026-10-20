import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role (bypasses RLS)
// Using loosely-typed client to avoid Supabase generics complexity.
// For production, regenerate types with: npx supabase gen types typescript
// NEVER import this in client components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = ReturnType<typeof createClient<any>>;

// Lazy singleton — not initialized at module load time to avoid build-time errors
let _db: AnySupabaseClient | null = null;

export function getDb(): AnySupabaseClient {
  if (_db) return _db;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // Return a no-op client in build/test environments where env vars aren't set
    // In production this will throw properly at request time
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
      );
    }
    // Dev/build fallback — create client with placeholder values
    // Operations will fail at runtime, but module evaluation won't throw
    _db = createClient("https://placeholder.supabase.co", "placeholder-key", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return _db;
  }

  _db = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _db;
}

// Convenience export — use getDb() instead if you need lazy initialization
export const db = new Proxy({} as AnySupabaseClient, {
  get(_target, prop) {
    return getDb()[prop as keyof AnySupabaseClient];
  },
});
