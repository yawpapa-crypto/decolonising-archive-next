"use server";

// Server actions for the sign-in page.
// Email+password and email and password both run server-side; OAuth happens
// client-side because it needs a browser redirect with a session-bound
// PKCE code verifier stored in the browser.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { updateLastLogin } from "@/src/lib/auth-hooks";

function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelUrl = process.env.VERCEL_URL?.trim();
  const raw = configured || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  return raw.replace(/\/$/, "");
}

function safeNext(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  // Only allow same-origin paths.
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  return "/workspace";
}

function safeStatusPath(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  if (v === "/admin-login") return v;
  return "/signin";
}

function formatSignInError(message: string): string {
  const m = message.trim();
  if (m === "Invalid login credentials") {
    return (
      "Invalid email or password, or no matching user in this Supabase project. " +
      "Confirm NEXT_PUBLIC_SUPABASE_URL and publishable key match your project, check the account is not banned (Authentication → Users), or use a email and password."
    );
  }
  return m;
}

export async function signInWithPassword(formData: FormData) {
  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = emailRaw.toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  const statusPath = safeStatusPath(formData.get("statusPath"));

  if (!email || !password) {
    redirect(
      `${statusPath}?error=${encodeURIComponent("Email and password are required.")}`
    );
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  ) {
    redirect(
      `${statusPath}?error=${encodeURIComponent(
        "Server is missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      )}`
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`${statusPath}?error=${encodeURIComponent(formatSignInError(error.message))}`);
  }

  if (data.user?.id) {
    await updateLastLogin(data.user.id);
  }

  revalidatePath("/", "layout");
  redirect(next);
}



export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const statusPath = safeStatusPath(formData.get("statusPath"));

  if (!email) {
    redirect(
      `${statusPath}?error=${encodeURIComponent("Email is required for password recovery.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/auth/reset-password`,
  });

  if (error) {
    redirect(`${statusPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`${statusPath}?resetSent=1&email=${encodeURIComponent(email)}`);
}
