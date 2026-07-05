"use server";

// Sign-up creates a *Member* account only. Curator and Admin roles are
// assigned manually by an Admin from the dashboard — they cannot be
// self-selected at sign-up.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/src/lib/supabase/server";
import { subscribeNewsletter } from "@/lib/brevo";

function newsletterOptIn(formData: FormData) {
  return formData.get("newsletter_opt_in") === "on";
}

export async function signUpMember(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const wantsNewsletter = newsletterOptIn(formData);

  if (!email || !password) {
    redirect(
      `/signup?error=${encodeURIComponent("Email and password are required.")}`
    );
  }
  if (password.length < 8) {
    redirect(
      `/signup?error=${encodeURIComponent("Password must be at least 8 characters.")}`
    );
  }

  const h = await headers();
  const origin =
    h.get("origin") ??
    `https://${h.get("host") ?? "localhost:3000"}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // user_metadata.full_name is what the on_auth_user_created trigger
      // copies into profiles.full_name; role is hard-coded to 'member'
      // by the trigger, never read from the client.
      data: {
        full_name: fullName || null,
        newsletter_opt_in: wantsNewsletter,
        ...(wantsNewsletter
          ? { newsletter_subscribed_at: new Date().toISOString(), newsletter_source: "signup" }
          : {}),
      },
      emailRedirectTo: `${origin}/auth/confirm?next=/workspace`,
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (wantsNewsletter) {
    await subscribeNewsletter({ email, firstName: fullName, source: "signup" });
  }

  redirect(`/signup?sent=1&email=${encodeURIComponent(email)}`);
}
