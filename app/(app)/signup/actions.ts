"use server";

import { safeNextPath } from "@/src/lib/security/validate";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, hasSupabaseServerConfig } from "@/src/lib/supabase/server";
import { subscribeNewsletter } from "@/lib/brevo";
import { parseSignupProfile, signupMetadata } from "@/lib/signup-profile";

function newsletterOptIn(formData: FormData) {
  return formData.get("newsletter_opt_in") === "on";
}

export async function signUpMember(formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? ""), "/for-you");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const profile = parseSignupProfile(formData);
  const wantsNewsletter = newsletterOptIn(formData);

  if (!email || !password) {
    redirect(`/signup?next=${encodeURIComponent(next)}&error=${encodeURIComponent("Email and password are required.")}`);
  }
  if (password.length < 12) {
    redirect(`/signup?next=${encodeURIComponent(next)}&error=${encodeURIComponent("Password must be at least 12 characters.")}`);
  }

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host") ?? "localhost:3000"}`;

  if (!hasSupabaseServerConfig()) redirect(`/signup?error=${encodeURIComponent("Accounts are temporarily unavailable. Please try again later.")}`);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { ...signupMetadata({ ...profile, newsletterOptIn: wantsNewsletter }), ared_signup_version: 1 },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/signup?next=${encodeURIComponent(next)}&error=${encodeURIComponent("We couldn’t complete this request. Try again, or sign in if you already have an account.")}`);
  }


  if (wantsNewsletter) {
    await subscribeNewsletter({ email, firstName: profile.fullName, source: "signup" });
  }

  if (data.session) redirect(next);
  redirect(`/signup?next=${encodeURIComponent(next)}&sent=1&email=${encodeURIComponent(email)}`);
}

export async function resendSignupConfirmation(formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? ""), "/for-you");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    redirect(`/signup?next=${encodeURIComponent(next)}&error=${encodeURIComponent("Enter your email to resend confirmation.")}`);
  }

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host") ?? "localhost:3000"}`;

  if (!hasSupabaseServerConfig()) redirect(`/signup?error=${encodeURIComponent("Accounts are temporarily unavailable. Please try again later.")}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/signup?next=${encodeURIComponent(next)}&sent=1&email=${encodeURIComponent(email)}&error=${encodeURIComponent("We couldn’t complete this request. Try again, or sign in if you already have an account.")}`);
  }

  redirect(`/signup?next=${encodeURIComponent(next)}&sent=1&email=${encodeURIComponent(email)}&updated=${encodeURIComponent("Confirmation email sent again.")}`);
}
