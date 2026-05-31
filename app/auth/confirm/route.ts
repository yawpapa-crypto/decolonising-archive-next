import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../src/lib/supabase/server";
import { safeNextPath } from "@/src/lib/security/validate";
import { updateLastLogin, notifyAdminOnNewUser } from "@/src/lib/auth-hooks";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  const origin = requestUrl.origin;
  const supabase = await createClient();

  // Newer Supabase email links often return a code.
  if (code) {
    const { data: codeData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        `${origin}/signin?message=${encodeURIComponent(error.message)}`
      );
    }

    if (codeData.user?.id) {
      await updateLastLogin(codeData.user.id);
      void notifyAdminOnNewUser(
        codeData.user.id,
        codeData.user.email,
        codeData.user.created_at,
      );
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // Older / token-hash email links use token_hash + type.
  if (tokenHash && type) {
    const { data: otpData, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "magiclink" | "recovery" | "invite" | "email_change",
    });

    if (error) {
      return NextResponse.redirect(
        `${origin}/signin?message=${encodeURIComponent(error.message)}`
      );
    }

    if (otpData.user?.id) {
      await updateLastLogin(otpData.user.id);
      // type === "signup" means this is a confirmed new account
      if (type === "signup") {
        void notifyAdminOnNewUser(
          otpData.user.id,
          otpData.user.email,
          otpData.user.created_at,
        );
      }
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(
    `${origin}/signin?message=${encodeURIComponent("Missing email verification token.")}`
  );
}
