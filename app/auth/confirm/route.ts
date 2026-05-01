// Email confirmation handler (signup verification, password recovery).
// Supabase emails users a link of the form /auth/confirm?token_hash=...&type=...
// We verify the OTP token and then send them on to ?next=... (or /workspace).

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";

function getErrorPath(next: string) {
  return next.startsWith("/admin") ? "/admin-login" : "/signin";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/workspace";
  const errorPath = getErrorPath(next);

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL(
        `${errorPath}?error=${encodeURIComponent("Missing email verification token.")}`,
        request.url
      )
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    return NextResponse.redirect(
      new URL(
        `${errorPath}?error=${encodeURIComponent(error.message)}`,
        request.url
      )
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
