"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";

export type NotificationType = "system" | "moderation" | "community" | "admin" | "onboarding";

export interface CreateNotificationOpts {
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send a notification to a single user.
 * Uses the service-role admin client so it can bypass RLS.
 */
export async function createNotification(opts: CreateNotificationOpts): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("notifications").insert({
      user_id: opts.user_id,
      type: opts.type,
      title: opts.title,
      body: opts.body ?? null,
      link: opts.link ?? null,
      metadata: opts.metadata ?? {},
    });
    if (error) {
      console.error("[notifications] insert error", error.message);
    }
  } catch (err) {
    console.error("[notifications] unexpected error", err);
  }
}

/**
 * Mark a notification as read. Must be called by an authenticated server action
 * with the recipient's supabase client (respects RLS).
 */
export async function markNotificationRead(
  supabase: Awaited<ReturnType<typeof import("@/src/lib/supabase/server").createClient>>,
  notificationId: string
): Promise<void> {
  await supabase.from("notifications").update({ read: true }).eq("id", notificationId);
}
