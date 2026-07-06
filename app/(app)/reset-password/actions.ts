"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    redirect(
      `/reset-password?error=${encodeURIComponent(
        "Password must be at least 8 characters.",
      )}`,
    );
  }

  if (password !== confirmPassword) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Passwords do not match.")}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/signin?error=${encodeURIComponent(
        "Password reset link has expired. Please request a new one.",
      )}`,
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  redirect(
    `/signin?updated=${encodeURIComponent("Password updated. Please sign in.")}`,
  );
}
