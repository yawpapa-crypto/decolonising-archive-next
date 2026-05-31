/**
 * Auth lifecycle helpers — run server-side immediately after Supabase confirms
 * a successful sign-in. Keep this file free of Next.js-specific imports so it
 * can be called from both Server Actions and Route Handlers.
 */

import { createClient } from "@/src/lib/supabase/server";

/**
 * Stamp last_login_at on the user's profile row.
 * Silently no-ops if the profile row doesn't exist yet (e.g. mid-signup).
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

/**
 * Fire a user_joined admin notification if this is a new account.
 * "New" = created_at within the last 2 minutes.
 * Fire-and-forget: never throws, never blocks auth flow.
 */
export async function notifyAdminOnNewUser(
  userId: string,
  email: string | undefined,
  createdAt: string | undefined,
): Promise<void> {
  if (!createdAt) return;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  if (ageMs > 2 * 60 * 1000) return; // not a new signup

  try {
    // Dynamic import avoids circular dep and keeps this file lightweight
    const { createAdminNotification } = await import("@/lib/admin-notifications");
    void createAdminNotification({
      type: "user_joined",
      title: "New member registered",
      body: email ? `${email} joined the archive.` : "A new member joined the archive.",
      severity: "info",
      targetType: "user",
      targetId: userId,
      metadata: { email: email ?? null },
    });
  } catch {
    // Never block auth flow
  }
}
