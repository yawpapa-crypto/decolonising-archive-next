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

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
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
    expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
  });

  if (error) fail(error.message);
  revalidatePath("/admin/invites");
  redirect("/admin/invites?updated=Invite created.");
}
