// Supabase client for use in Server Components, Server Actions, and Route Handlers.
// In Next.js 16, `cookies()` is async and returns a mutable cookie store inside
// Server Actions / Route Handlers. In a pure Server Component the store is
// read-only — Supabase will attempt to write refreshed session cookies, which
// is fine because the proxy (root `proxy.ts`) is the canonical place where
// session refresh writes happen.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if the proxy is refreshing sessions.
          }
        },
      },
    }
  );
}
