// Next.js 16 Proxy (formerly Middleware).
//
// Sole responsibility: refresh Supabase auth cookies on every request so
// server components always see a fresh session. Page-level gating
// (Member / Curator / Admin) is enforced inside individual layouts and
// pages via the helpers in src/lib/auth.ts.

import type { NextRequest } from "next/server";
import { updateSession } from "@/src/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
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
