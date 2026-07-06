"use server";

import { requireAdmin } from "@/src/lib/auth";
import {
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  archiveAdminNotification,
  sendAdminDigestReport,
  sendAdminEmail,
  generateAdminDigestReport,
  upsertAdminNotificationSettings,
  type AdminNotificationSettings,
} from "@/lib/admin-notifications";
import { revalidatePath } from "next/cache";

export async function actionMarkNotificationRead(notificationId: string) {
  await requireAdmin();
  await markAdminNotificationRead(notificationId);
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/analytics");
}

export async function actionMarkAllRead() {
  const profile = await requireAdmin();
  await markAllAdminNotificationsRead(profile.id);
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/analytics");
}

export async function actionArchiveNotification(notificationId: string) {
  await requireAdmin();
  await archiveAdminNotification(notificationId);
  revalidatePath("/admin/notifications");
}

export async function actionSendDigest(range: "daily" | "weekly") {
  const profile = await requireAdmin();
  return sendAdminDigestReport(profile.id, range);
}

export async function actionSendTestEmail() {
  const profile = await requireAdmin();
  const report = await generateAdminDigestReport("daily");
  return sendAdminEmail(
    {
      to: profile.email ?? "",
      subject: "[Decolonising Archive] Test notification",
      html: report.html.replace("Daily Admin Report", "Test Notification"),
      text: "This is a test notification from Decolonising Archive admin settings.",
    },
    profile.id,
    "manual_report",
  );
}

export async function actionSaveNotificationSettings(formData: FormData) {
  const profile = await requireAdmin();

  function bool(key: string) {
    return formData.get(key) === "on" || formData.get(key) === "true";
  }
  function str(key: string, fallback: string) {
    return String(formData.get(key) ?? fallback).trim() || fallback;
  }

  const patch: Partial<Omit<AdminNotificationSettings, "id" | "user_id">> = {
    dashboard_enabled:         bool("dashboard_enabled"),
    email_enabled:             bool("email_enabled"),
    immediate_email_enabled:   bool("immediate_email_enabled"),
    daily_digest_enabled:      bool("daily_digest_enabled"),
    weekly_digest_enabled:     bool("weekly_digest_enabled"),
    digest_time:               str("digest_time", "09:00"),
    timezone:                  str("timezone", "Australia/Melbourne"),
    notify_errors:             bool("notify_errors"),
    notify_feedback:           bool("notify_feedback"),
    notify_moderation:         bool("notify_moderation"),
    notify_source_requests:    bool("notify_source_requests"),
    notify_user_activity:      bool("notify_user_activity"),
    notify_search_trends:      bool("notify_search_trends"),
    notify_workbench_activity: bool("notify_workbench_activity"),
    notify_community_activity: bool("notify_community_activity"),
  };

  const result = await upsertAdminNotificationSettings(profile.id, patch);
  revalidatePath("/admin/settings/notifications");
  return result;
}
