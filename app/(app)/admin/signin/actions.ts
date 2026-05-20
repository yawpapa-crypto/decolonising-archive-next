"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/server";

const ADMIN_EMAILS = [
  "papayawofosu@gmail.com",
  "yaw.ofosu-asare@rmit.edu.au",
  "yaw.ofosu-asare@scu.edu.au",
  "yaw.ofosu-asare@ared.design",
].map((email) => email.toLowerCase());

function isAdminEmail(email: string) {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export async function adminPasswordSignIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/admin/signin?message=Enter your email and password.");
  }

  if (!isAdminEmail(email)) {
    redirect("/admin/signin?message=This email is not authorised for admin access.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/admin/signin?message=${encodeURIComponent(error.message)}`);
  }

  if (!data.user?.email || !isAdminEmail(data.user.email)) {
    await supabase.auth.signOut();
    redirect("/admin/signin?message=This account is not authorised for admin access.");
  }

  redirect("/admin");
}

export async function adminResetPassword(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email) {
    redirect("/admin/signin?message=Enter your admin email first.");
  }

  if (!isAdminEmail(email)) {
    redirect("/admin/signin?message=This email is not authorised for admin password reset.");
  }

  const supabase = await createClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset-password`,
  });

  if (error) {
    redirect(`/admin/signin?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/signin?message=Password reset email sent. Check your inbox.");
}
