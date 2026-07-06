"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/src/lib/supabase/server";
import { subscribeNewsletter } from "@/lib/brevo";
import { parseSignupProfile, signupMetadata, syncSignupProfile } from "@/lib/signup-profile";

function newsletterOptIn(formData: FormData) {
  return formData.get("newsletter_opt_in") === "on";
}

export async function signUpMember(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const profile = parseSignupProfile(formData);
  const wantsNewsletter = newsletterOptIn(formData);

  if (!email || !password) {
    redirect(`/signup?error=${encodeURIComponent("Email and password are required.")}`);
  }
  if (password.length < 8) {
    redirect(`/signup?error=${encodeURIComponent("Password must be at least 8 characters.")}`);
  }

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host") ?? "localhost:3000"}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: signupMetadata({ ...profile, newsletterOptIn: wantsNewsletter }),
      emailRedirectTo: `${origin}/auth/confirm?next=/workspace`,
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user?.id) {
    await syncSignupProfile(data.user.id, profile);
  }

  if (wantsNewsletter) {
    await subscribeNewsletter({ email, firstName: profile.fullName, source: "signup" });
  }

  redirect(`/signup?sent=1&email=${encodeURIComponent(email)}`);
}

export async function resendSignupConfirmation(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    redirect(`/signup?error=${encodeURIComponent("Enter your email to resend confirmation.")}`);
  }

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host") ?? "localhost:3000"}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/workspace`,
    },
  });

  if (error) {
    redirect(`/signup?sent=1&email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/signup?sent=1&email=${encodeURIComponent(email)}&updated=${encodeURIComponent("Confirmation email sent again.")}`);
}
