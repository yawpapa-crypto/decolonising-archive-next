// Next.js 16 Proxy (formerly Middleware).
//
// Sole responsibility: refresh Supabase auth cookies on every request so
// server components always see a fresh session. Page-level gating
// (Member / Curator / Admin) is enforced inside individual layouts and
// pages via the helpers in src/lib/auth.ts.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/src/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Retired Research Bench entry points no longer execute their route handlers.
  const pathname = request.nextUrl.pathname;
  if (pathname === "/my/workbench" || pathname.startsWith("/my/workbench/")) {
    return NextResponse.redirect(new URL("/home-next/library", request.url));
  }
  if (pathname === "/api/workbench" || pathname.startsWith("/api/workbench/")) {
    return NextResponse.json({ error: "Research Bench has been retired." }, { status: 410 });
  }
  // Public requests need no refresh. Authenticated development sessions must
  // refresh too, otherwise returning accounts fail after their token expires.
  const skipAuthRefresh = process.env.SUPABASE_PROXY_SKIP_AUTH === "1" ||
    !request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));

  if (skipAuthRefresh) {
    return NextResponse.next({ request });
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico, og-image, public assets
     * - auth/callback, auth/confirm (route handlers manage their own cookies)
     */
    "/((?!_next/static|_next/image|favicon.ico|og-image.jpg|assets/|auth/callback|auth/confirm).*)",
  ],
};
