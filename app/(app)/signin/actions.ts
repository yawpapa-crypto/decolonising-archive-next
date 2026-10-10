"use server";

// Server actions for the sign-in page.
// Email+password and email and password both run server-side; OAuth happens
// client-side because it needs a browser redirect with a session-bound
// PKCE code verifier stored in the browser.

import { safeNextPath } from "@/src/lib/security/validate";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { updateLastLogin } from "@/src/lib/auth-hooks";
import { recordNewsletterOptIn } from "@/lib/newsletter-consent";

function newsletterOptIn(formData: FormData) {
  return formData.get("newsletter_opt_in") === "on";
}

function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelUrl = process.env.VERCEL_URL?.trim();
  const raw = configured || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  return raw.replace(/\/$/, "");
}

function safeNext(value: FormDataEntryValue | null): string {
  return safeNextPath(typeof value === "string" ? value : null, "/for-you");
}

function safeStatusPath(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  if (v === "/admin-login" || v === "/settings") return v;
  return "/signin";
}

function formatSignInError(message: string): string {
  return message.trim() === "Invalid login credentials"
    ? "The email or password is incorrect. Try again or reset your password."
    : "We couldn’t sign you in. Please try again.";
}

export async function signInWithPassword(formData: FormData) {
  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = emailRaw.toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  const statusPath = safeStatusPath(formData.get("statusPath"));
  const wantsNewsletter = newsletterOptIn(formData);

  if (!email || !password) {
    redirect(
      `${statusPath}?next=${encodeURIComponent(next)}&error=${encodeURIComponent("Email and password are required.")}`
    );
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  ) {
    redirect(
      `${statusPath}?next=${encodeURIComponent(next)}&error=${encodeURIComponent(
        "Accounts are temporarily unavailable. Please try again later.",
      )}`
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password }).catch(() => ({ data: { user: null }, error: { message: "Network unavailable" } }));

  if (error) {
    redirect(`${statusPath}?next=${encodeURIComponent(next)}&error=${encodeURIComponent(formatSignInError(error.message))}`);
  }

  if (data.user?.id) {
    await updateLastLogin(data.user.id);
    if (wantsNewsletter) {
      const fullName =
        typeof data.user.user_metadata?.full_name === "string"
          ? data.user.user_metadata.full_name
          : null;
      await recordNewsletterOptIn({
        userId: data.user.id,
        email,
        firstName: fullName,
        source: "signin",
      });
    }
  }

  revalidatePath("/", "layout");
  redirect(next);
}



export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const statusPath = safeStatusPath(formData.get("statusPath"));
  const next = safeNextPath(String(formData.get("next") ?? ""), "/for-you");

  if (!email) {
    redirect(
      `${statusPath}?next=${encodeURIComponent(next)}&error=${encodeURIComponent("Email is required for password recovery.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent(`/auth/reset-password?next=${encodeURIComponent(next)}`)}`,
  });

  if (error) {
    redirect(`${statusPath}?next=${encodeURIComponent(next)}&error=${encodeURIComponent("The reset link could not be sent. Please wait a moment and try again.")}`);
  }

  redirect(`${statusPath}?next=${encodeURIComponent(next)}&resetSent=1`);
}
