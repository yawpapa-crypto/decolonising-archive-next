"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/src/lib/supabase/admin";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function fail(token: string, message: string): never {
  redirect(`/admin/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);
}

function inviteIsExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());
}

export async function acceptAdminInvite(formData: FormData) {
  const token = text(formData, "token");
  const fullName = text(formData, "full_name");
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!token) fail("", "This admin invite is invalid or has expired.");
  if (!email || !password) fail(token, "Something went wrong. Please try again.");
  if (password.length < 8) fail(token, "Password must be at least 8 characters.");
  if (password !== confirmPassword) fail(token, "Passwords do not match.");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    fail(token, "Something went wrong. Please try again.");
  }

  const admin = createAdminClient();
  const { data: invite, error: inviteError } = await admin
    .from("admin_invites")
    .select("id, email, role, used_at, revoked_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invite) fail(token, "This admin invite is invalid or has expired.");
  if (invite.revoked_at) fail(token, "This admin invite has been revoked.");
  if (invite.used_at) fail(token, "This admin invite has already been used.");
  if (inviteIsExpired(invite.expires_at)) {
    fail(token, "This admin invite is invalid or has expired.");
  }
  if (invite.email && invite.email.toLowerCase() !== email) {
    fail(token, "This invite is locked to a different email address.");
  }

  const reservedAt = new Date().toISOString();
  const { data: reservedInvite, error: reserveError } = await admin
    .from("admin_invites")
    .update({ used_at: reservedAt })
    .eq("id", invite.id)
    .is("used_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (reserveError || !reservedInvite) {
    fail(token, reserveError?.message || "This admin invite has already been used.");
  }

  const releaseReservation = async () => {
    await admin
      .from("admin_invites")
      .update({ used_at: null, used_by: null })
      .eq("id", invite.id)
      .is("used_by", null);
  };

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || null },
  });

  if (createError || !created.user) {
    await releaseReservation();
    fail(token, createError?.message || "Something went wrong. Please try again.");
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.user.id,
    email,
    full_name: fullName || null,
    role: invite.role,
  });

  if (profileError) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(created.user.id);
    if (deleteError) {
      console.error("[admin-invite] failed to delete user after profile sync failure", deleteError.message);
    }
    await releaseReservation();
    fail(token, profileError.message);
  }

  const { error: usedError } = await admin
    .from("admin_invites")
    .update({
      used_by: created.user.id,
      used_at: reservedAt,
    })
    .eq("id", invite.id);

  if (usedError) {
    console.error("[admin-invite] failed to attach accepted user to invite", usedError.message);
  }

  redirect(
    `/admin/signin?updated=${encodeURIComponent(
      "Access account created. Please sign in.",
    )}`,
  );
}
