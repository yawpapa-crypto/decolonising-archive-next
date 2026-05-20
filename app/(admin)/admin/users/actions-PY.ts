"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, type Role } from "@/src/lib/auth";
import { createAdminClient } from "@/src/lib/supabase/admin";

const ROLES: Role[] = ["member", "curator", "admin"];

function getTargetId(formData: FormData) {
  return String(formData.get("user_id") ?? "").trim();
}

function redirectWith(type: "updated" | "error", message: string): never {
  redirect(`/admin/users?${type}=${encodeURIComponent(message)}`);
}

function isMissingProfilesTable(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("public.profiles"))
  );
}

export async function updateUserRole(formData: FormData) {
  const admin = await requireAdmin();
  const userId = getTargetId(formData);
  const role = String(formData.get("role") ?? "") as Role;

  if (!userId || !ROLES.includes(role)) {
    redirectWith("error", "Choose a valid user and role.");
  }

  if (userId === admin.id && role !== "admin") {
    redirectWith("error", "You cannot remove your own admin access.");
  }

  const supabase = createAdminClient();
  const { data: userResult, error: userError } =
    await supabase.auth.admin.getUserById(userId);

  if (userError || !userResult.user) {
    redirectWith("error", userError?.message ?? "User account not found.");
  }

  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    email: userResult.user.email ?? null,
    full_name:
      typeof userResult.user.user_metadata?.full_name === "string"
        ? userResult.user.user_metadata.full_name
        : null,
    role,
  });

  if (error) {
    if (isMissingProfilesTable(error)) {
      redirectWith(
        "error",
        "The profiles table is missing. Apply supabase/migrations/0001_auth_and_research.sql before changing roles."
      );
    }
    redirectWith("error", error.message);
  }

  revalidatePath("/admin/users");
  redirectWith("updated", "User role updated.");
}

export async function updateUserStatus(formData: FormData) {
  const admin = await requireAdmin();
  const userId = getTargetId(formData);
  const status = String(formData.get("status") ?? "");

  if (!userId || !["active", "blocked"].includes(status)) {
    redirectWith("error", "Choose a valid user and status.");
  }

  if (userId === admin.id && status === "blocked") {
    redirectWith("error", "You cannot block your own admin account.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: status === "blocked" ? "876000h" : "none",
  });

  if (error) {
    redirectWith("error", error.message);
  }

  revalidatePath("/admin/users");
  redirectWith(
    "updated",
    status === "blocked" ? "User sign-in blocked." : "User sign-in restored."
  );
}

export async function deleteUserAccount(formData: FormData) {
  const admin = await requireAdmin();
  const userId = getTargetId(formData);
  const confirmation = String(formData.get("confirm") ?? "").trim().toUpperCase();

  if (!userId) {
    redirectWith("error", "Choose a valid user to delete.");
  }

  if (userId === admin.id) {
    redirectWith("error", "You cannot delete your own admin account.");
  }

  if (confirmation !== "DELETE") {
    redirectWith("error", "Type DELETE to confirm account deletion.");
  }

  const supabase = createAdminClient();
  const { data: userResult, error: userError } =
    await supabase.auth.admin.getUserById(userId);

  if (userError || !userResult.user) {
    redirectWith("error", userError?.message ?? "User account not found.");
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    redirectWith("error", error.message);
  }

  revalidatePath("/admin/users");
  redirectWith("updated", "User account deleted.");
}
