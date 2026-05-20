import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../src/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next =
    requestUrl.searchParams.get("next") ||
    (type === "recovery" ? "/reset-password" : "/workspace");

  const origin = requestUrl.origin;
  const supabase = await createClient();

  // Newer Supabase email links often return a code.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        `${origin}/signin?message=${encodeURIComponent(error.message)}`
      );
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // Older / token-hash email links use token_hash + type.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "magiclink" | "recovery" | "invite" | "email_change",
    });

    if (error) {
      return NextResponse.redirect(
        `${origin}/signin?message=${encodeURIComponent(error.message)}`
      );
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(
    `${origin}/signin?message=${encodeURIComponent("Missing email verification token.")}`
  );
}
