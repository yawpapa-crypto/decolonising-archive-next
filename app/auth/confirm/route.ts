// Email confirmation handler (signup verification, password recovery).
// Supabase emails users a link of the form /auth/confirm?token_hash=...&type=...
// We verify the OTP token and then send them on to ?next=... (or /workspace).

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";

function safeNext(value: string | null) {
  if (value?.startsWith("/") && !value.startsWith("//")) return value;
  return "/workspace";
}

function getErrorPath(next: string) {
  return next.startsWith("/admin") ? "/admin/signin" : "/signin";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));
  const errorPath = getErrorPath(next);
  const isRecovery = type === "recovery";

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
    if (isRecovery) {
      return NextResponse.redirect(
        new URL(
          `/signin?error=${encodeURIComponent(
            "Password reset link has expired. Please request a new one.",
          )}`,
          request.url,
        ),
      );
    }

    return NextResponse.redirect(
      new URL(
        `${errorPath}?error=${encodeURIComponent(error.message)}`,
        request.url
      )
    );
  }

  if (isRecovery) {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
