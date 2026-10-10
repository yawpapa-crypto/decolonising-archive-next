// OAuth + PKCE callback.
// Supabase redirects the browser back here with `?code=...` after a Google /
// GitHub sign-in. Email links use /auth/confirm so they do not depend on a
// browser-local PKCE code verifier.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { safeNextPath } from "@/src/lib/security/validate";
import { updateLastLogin, notifyAdminOnNewUser } from "@/src/lib/auth-hooks";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"), "/home-next/for-you");

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/signin?next=${encodeURIComponent(next)}&error=${encodeURIComponent("Sign-in was cancelled or the link is incomplete. Try again.")}`,
        request.url
      )
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/signin?next=${encodeURIComponent(next)}&error=${encodeURIComponent("This sign-in link has expired. Please try signing in again.")}`,
        request.url
      )
    );
  }

  if (data.user?.id) {
    await updateLastLogin(data.user.id);
    void notifyAdminOnNewUser(data.user.id, data.user.email, data.user.created_at);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
