"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function fail(message: string): never {
  redirect(`/admin/invites?error=${encodeURIComponent(message)}`);
}

function success(message: string): never {
  redirect(`/admin/invites?updated=${encodeURIComponent(message)}`);
}

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function inviteId(formData: FormData) {
  return text(formData, "invite_id");
}

function parseExpiry(value: string) {
  return value ? new Date(`${value}T23:59:59`).toISOString() : null;
}

async function loadPendingInvite(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data, error } = await supabase
    .from("admin_invites")
    .select("id, used_at, revoked_at")
    .eq("id", id)
    .maybeSingle();

  if (error) fail(error.message);
  if (!data) fail("Invite not found.");
  if (data.used_at) fail("Accepted invites cannot be changed.");
  return data;
}

function assertNotRevoked(invite: { revoked_at?: string | null }) {
  if (invite.revoked_at) fail("Revoked invites cannot be edited or resent.");
}

export async function createAdminInvite(formData: FormData) {
  const profile = await requireAdmin();
  const email = text(formData, "email").toLowerCase();
  const role = text(formData, "role") || "admin";
  const label = text(formData, "label");
  const expiresAt = text(formData, "expires_at");

  if (role !== "admin" && role !== "curator") {
    fail("Something went wrong. Please try again.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("admin_invites").insert({
    token: randomToken(),
    email: email || null,
    role,
    label: label || null,
    created_by: profile.id,
    expires_at: parseExpiry(expiresAt),
  });

  if (error) fail(error.message);
  revalidatePath("/admin/invites");
  success("Invite created.");
}

export async function updateAdminInvite(formData: FormData) {
  await requireAdmin();
  const id = inviteId(formData);
  const email = text(formData, "email").toLowerCase();
  const role = text(formData, "role") || "admin";
  const label = text(formData, "label");
  const expiresAt = text(formData, "expires_at");

  if (!id) fail("Invite not found.");
  if (role !== "admin" && role !== "curator") {
    fail("Choose a valid invite role.");
  }

  const supabase = await createClient();
  const invite = await loadPendingInvite(supabase, id);
  assertNotRevoked(invite);

  const { error } = await supabase
    .from("admin_invites")
    .update({
      email: email || null,
      role,
      label: label || null,
      expires_at: parseExpiry(expiresAt),
    })
    .eq("id", id)
    .is("used_at", null);

  if (error) fail(error.message);
  revalidatePath("/admin/invites");
  success("Invite updated.");
}

export async function revokeAdminInvite(formData: FormData) {
  const admin = await requireAdmin();
  const id = inviteId(formData);
  if (!id) fail("Invite not found.");

  const supabase = await createClient();
  const invite = await loadPendingInvite(supabase, id);
  if (invite.revoked_at) success("Invite already revoked.");

  const { error } = await supabase
    .from("admin_invites")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: admin.id,
    })
    .eq("id", id)
    .is("used_at", null);

  if (error) fail(error.message);
  revalidatePath("/admin/invites");
  success("Invite revoked.");
}

export async function deleteAdminInvite(formData: FormData) {
  await requireAdmin();
  const id = inviteId(formData);
  if (!id) fail("Invite not found.");

  const supabase = await createClient();
  const invite = await loadPendingInvite(supabase, id);
  assertNotRevoked(invite);

  const { error } = await supabase
    .from("admin_invites")
    .delete()
    .eq("id", id)
    .is("used_at", null);

  if (error) fail(error.message);
  revalidatePath("/admin/invites");
  success("Invite deleted.");
}

export async function resendAdminInvite(formData: FormData) {
  await requireAdmin();
  const id = inviteId(formData);
  if (!id) fail("Invite not found.");

  const supabase = await createClient();
  const invite = await loadPendingInvite(supabase, id);
  assertNotRevoked(invite);

  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 14);

  const { error } = await supabase
    .from("admin_invites")
    .update({
      token: randomToken(),
      revoked_at: null,
      revoked_by: null,
      resent_at: new Date().toISOString(),
      expires_at: defaultExpiry.toISOString(),
    })
    .eq("id", id)
    .is("used_at", null);

  if (error) fail(error.message);
  revalidatePath("/admin/invites");
  success("Invite link regenerated and expiry extended.");
}
