// Supabase session helper for Next.js 16 Proxy (formerly Middleware).
// Called from the root-level `proxy.ts`; updates the auth cookies on every
// request so server components always see a fresh session.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_REFRESH_TIMEOUT_MS =
  process.env.NODE_ENV === "production" ? 3000 : 1500;

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      global: {
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(AUTH_REFRESH_TIMEOUT_MS) }),
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do NOT remove this `getUser()` call. It refreshes the session
  // when needed and must come immediately after `createServerClient`.
  // Await the bounded request; a Promise.race allowed a late refresh to write
  // cookies onto a response that had already been returned.
  await supabase.auth.getUser().catch(() => null);

  return supabaseResponse;
}
