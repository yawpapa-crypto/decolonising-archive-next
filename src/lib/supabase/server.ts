// Supabase client for use in Server Components, Server Actions, and Route Handlers.
// In Next.js 16, `cookies()` is async and returns a mutable cookie store inside
// Server Actions / Route Handlers. In a pure Server Component the store is
// read-only — Supabase will attempt to write refreshed session cookies, which
// is fine because the proxy (root `proxy.ts`) is the canonical place where
// session refresh writes happen.

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const GET_USER_TIMEOUT_MS =
  process.env.NODE_ENV === "production" ? 5000 : 2000;

/**
 * Public archive routes may be used without Supabase configured (for example,
 * in a content-only local preview). Keep authentication-dependent UI signed
 * out in that case instead of allowing the global navbar to crash the page.
 */
export function hasSupabaseServerConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
}

/** Never let `auth.getUser()` block page render indefinitely (slow/offline Supabase). */
export async function getAuthenticatedUser(
  supabase: SupabaseClient,
): Promise<User | null> {
  const authRequest = supabase.auth.getUser().catch((error: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[supabase] getUser failed", error);
    }
    return { data: { user: null }, error };
  });

  const timeout = new Promise<{ data: { user: null } }>((resolve) => {
    setTimeout(() => resolve({ data: { user: null } }), GET_USER_TIMEOUT_MS);
  });

  const { data } = await Promise.race([authRequest, timeout]);
  return data.user;
}

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseKey,
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
