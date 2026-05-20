// OAuth + PKCE callback.
// Supabase redirects the browser back here with `?code=...` after a Google /
// GitHub sign-in. Email links use /auth/confirm so they do not depend on a
// browser-local PKCE code verifier.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { safeNextPath } from "@/src/lib/security/validate";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/signin?error=${encodeURIComponent("Missing OAuth code.")}`,
        request.url
      )
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/signin?error=${encodeURIComponent(error.message)}`,
        request.url
      )
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
