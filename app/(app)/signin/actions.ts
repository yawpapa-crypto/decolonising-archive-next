"use server";

// Server actions for the sign-in page.
// Email+password and magic link both run server-side; OAuth happens
// client-side because it needs a browser redirect with a session-bound
// PKCE code verifier stored in the browser.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/src/lib/supabase/server";

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

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  const statusPath = safeStatusPath(formData.get("statusPath"));

  if (!email || !password) {
    redirect(
      `${statusPath}?error=${encodeURIComponent("Email and password are required.")}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`${statusPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(next);
}

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNext(formData.get("next"));
  const statusPath = safeStatusPath(formData.get("statusPath"));

  if (!email) {
    redirect(
      `${statusPath}?error=${encodeURIComponent("Email is required for a magic link.")}`
    );
  }

  const h = await headers();
  const origin =
    h.get("origin") ??
    `https://${h.get("host") ?? "localhost:3000"}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`${statusPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`${statusPath}?sent=1&email=${encodeURIComponent(email)}`);
}
