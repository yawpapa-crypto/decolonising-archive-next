/**
 * Admin notification helpers.
 *
 * Privacy rules enforced here:
 * - Do NOT pass private document/note/canvas body content.
 * - Do NOT pass auth tokens, API keys, or raw passwords.
 * - Allowed: event type, user email/name, search query, counts, paths,
 *   source names, error messages/codes, IDs, timestamps.
 *
 * SERVER-ONLY — never import from a "use client" component.
 */

import "server-only";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { createClient } from "@/src/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminNotificationSeverity = "info" | "success" | "warning" | "urgent";
export type AdminNotificationStatus = "unread" | "read" | "archived";

export type AdminNotificationInput = {
  /** Target admin user ID. If omitted, notifies ALL admins. */
  userId?: string;
  type: string;
  title: string;
  body?: string;
  severity?: AdminNotificationSeverity;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export type AdminNotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  severity: AdminNotificationSeverity;
  status: AdminNotificationStatus;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
};

export type AdminNotificationSettings = {
  id: string;
  user_id: string;
  dashboard_enabled: boolean;
  email_enabled: boolean;
  immediate_email_enabled: boolean;
  daily_digest_enabled: boolean;
  weekly_digest_enabled: boolean;
  digest_time: string;
  timezone: string;
  notify_errors: boolean;
  notify_feedback: boolean;
  notify_moderation: boolean;
  notify_source_requests: boolean;
  notify_user_activity: boolean;
  notify_search_trends: boolean;
  notify_workbench_activity: boolean;
  notify_community_activity: boolean;
};

// Notification types that map to settings categories
const CATEGORY_MAP: Record<string, keyof AdminNotificationSettings> = {
  app_error_logged:             "notify_errors",
  app_error_spike:              "notify_errors",
  schema_error:                 "notify_errors",
  source_fetch_failure:         "notify_errors",
  security_or_permission_error: "notify_errors",
  feedback_received:            "notify_feedback",
  bug_report_received:          "notify_feedback",
  cultural_concern_reported:    "notify_moderation",
  takedown_request_received:    "notify_moderation",
  community_post_reported:      "notify_moderation",
  source_request_received:      "notify_source_requests",
  user_joined:                  "notify_user_activity",
  high_activity_user:           "notify_user_activity",
  search_zero_results_spike:    "notify_search_trends",
  collaboration_activity:       "notify_workbench_activity",
  project_invite_activity:      "notify_workbench_activity",
  community_activity_summary:   "notify_community_activity",
};

// Types where immediate email is always sent regardless of settings
const ALWAYS_IMMEDIATE: Set<string> = new Set([
  "cultural_concern_reported",
  "takedown_request_received",
  "security_or_permission_error",
  "schema_error",
  "app_error_spike",
]);

// ---------------------------------------------------------------------------
// Email abstraction
// ---------------------------------------------------------------------------

export type AdminEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Send an admin email via Resend.
 *
 * Requires RESEND_API_KEY and ADMIN_NOTIFICATIONS_FROM_EMAIL env vars.
 * If either is missing, logs to admin_email_reports with status = 'skipped'
 * and returns { ok: false, skipped: true }.
 *
 * Does NOT throw — failures are logged, never surfaced to users.
 */
export async function sendAdminEmail(
  payload: AdminEmailPayload,
  userId?: string,
  reportType: "immediate_alert" | "daily_digest" | "weekly_digest" | "manual_report" = "immediate_alert",
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ADMIN_NOTIFICATIONS_FROM_EMAIL;
  const supabase = createAdminClient();

  if (!apiKey || !fromEmail) {
    // Log as skipped — provider not configured
    await supabase.from("admin_email_reports").insert({
      user_id: userId ?? null,
      report_type: reportType,
      subject: payload.subject,
      body: payload.text,
      status: "skipped",
      sent_to: payload.to,
      error_message: "Email provider not configured (RESEND_API_KEY or ADMIN_NOTIFICATIONS_FROM_EMAIL missing).",
    });
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      await supabase.from("admin_email_reports").insert({
        user_id: userId ?? null,
        report_type: reportType,
        subject: payload.subject,
        body: payload.text,
        status: "failed",
        sent_to: payload.to,
        error_message: `Resend ${res.status}: ${errorText}`.slice(0, 500),
      });
      return { ok: false, error: errorText };
    }

    await supabase.from("admin_email_reports").insert({
      user_id: userId ?? null,
      report_type: reportType,
      subject: payload.subject,
      body: payload.text,
      status: "sent",
      sent_to: payload.to,
      sent_at: new Date().toISOString(),
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown send error";
    await supabase.from("admin_email_reports").insert({
      user_id: userId ?? null,
      report_type: reportType,
      subject: payload.subject,
      body: payload.text,
      status: "failed",
      sent_to: payload.to,
      error_message: message.slice(0, 500),
    });
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Notification creation
// ---------------------------------------------------------------------------

/**
 * Get all admin user IDs from the profiles table.
 */
async function getAdminUserIds(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  return (data ?? []).map((r) => (r as { id: string }).id);
}

/**
 * Get notification settings for an admin user, returning defaults if none exist.
 */
async function getNotificationSettings(userId: string): Promise<AdminNotificationSettings | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("admin_notification_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as AdminNotificationSettings | null) ?? null;
}

/**
 * Get the email address for a user from auth.users via admin client.
 */
async function getUserEmail(userId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

/**
 * Build an immediate-alert email payload.
 */
function buildAlertEmail(
  input: AdminNotificationInput,
  toEmail: string,
): AdminEmailPayload {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://decolonising-archive.org";
  const severityLabel = input.severity === "urgent" ? "🔴 Urgent" :
    input.severity === "warning" ? "⚠️ Warning" : "ℹ️ Notice";

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <p style="font-size:12px;color:#888;margin:0 0 8px;">${severityLabel}</p>
  <h1 style="font-size:20px;margin:0 0 12px;">${escapeHtml(input.title)}</h1>
  ${input.body ? `<p style="color:#333;margin:0 0 20px;">${escapeHtml(input.body)}</p>` : ""}
  <p style="font-size:12px;color:#888;margin:0 0 20px;">
    ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })} AEST
  </p>
  <a href="${siteUrl}/admin/notifications"
     style="background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;">
    View in Admin Dashboard
  </a>
  <p style="font-size:11px;color:#aaa;margin-top:32px;">
    Decolonising Archive admin notification. Private document content is never included.
    <a href="${siteUrl}/admin/settings/notifications">Manage notification settings</a>
  </p>
</div>`;

  const text = [
    `[${input.severity?.toUpperCase() ?? "INFO"}] ${input.title}`,
    input.body ?? "",
    "",
    `View: ${siteUrl}/admin/notifications`,
    `Manage: ${siteUrl}/admin/settings/notifications`,
  ].filter(Boolean).join("\n");

  return {
    to: toEmail,
    subject: `[Decolonising Archive] ${input.severity === "urgent" ? "Urgent: " : ""}${input.title}`,
    html,
    text,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Whether a notification type qualifies for email given the user's settings.
 */
function qualifiesForEmail(type: string, settings: AdminNotificationSettings): boolean {
  const categoryKey = CATEGORY_MAP[type];
  if (!categoryKey) return settings.notify_errors; // default to error category
  return settings[categoryKey] as boolean;
}

/**
 * Create an admin notification for one or all admins.
 *
 * - If userId is provided, only that admin is notified.
 * - If userId is omitted, all admins are notified.
 * - Dashboard notification is created if dashboard_enabled (or settings missing).
 * - Email is sent if email_enabled + type qualifies, or if type is ALWAYS_IMMEDIATE.
 *
 * Never throws into user-facing actions.
 */
export async function createAdminNotification(
  input: AdminNotificationInput,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const severity = input.severity ?? "info";
    const userIds = input.userId ? [input.userId] : await getAdminUserIds();

    if (userIds.length === 0) return;

    for (const uid of userIds) {
      try {
        const settings = await getNotificationSettings(uid);
        const dashboardEnabled = settings?.dashboard_enabled ?? true;

        // Create dashboard notification
        if (dashboardEnabled) {
          await supabase.from("admin_notifications").insert({
            user_id: uid,
            type: input.type,
            title: input.title,
            body: input.body ?? null,
            severity,
            status: "unread",
            target_type: input.targetType ?? null,
            target_id: input.targetId ?? null,
            metadata: input.metadata ?? {},
          });
        }

        // Email logic
        const emailEnabled = settings?.email_enabled ?? false;
        const immediateEnabled = settings?.immediate_email_enabled ?? false;
        const isAlwaysImmediate = ALWAYS_IMMEDIATE.has(input.type);

        const shouldEmail =
          emailEnabled &&
          (isAlwaysImmediate || (immediateEnabled && qualifiesForEmail(input.type, settings!)));

        if (shouldEmail) {
          const email = await getUserEmail(uid);
          if (email) {
            const payload = buildAlertEmail(input, email);
            await sendAdminEmail(payload, uid, "immediate_alert");
          }
        }
      } catch {
        // Per-user failure should not block other admins
      }
    }
  } catch {
    // Never throw into user-facing actions
    // Log silently — we can't use logErrorEvent here (circular dep risk)
  }
}

// ---------------------------------------------------------------------------
// Digest report generation
// ---------------------------------------------------------------------------

export type DigestRange = "daily" | "weekly";

export type DigestReportPayload = {
  subject: string;
  text: string;
  html: string;
};

/**
 * Generate a daily or weekly admin digest report.
 *
 * Collects: active users, searches, errors, source failures, feedback,
 * moderation reports, source requests, community posts/comments.
 *
 * Does NOT include private document/note/canvas body content.
 */
export async function generateAdminDigestReport(
  range: DigestRange,
): Promise<DigestReportPayload> {
  const supabase = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://decolonising-archive.org";
  const days = range === "daily" ? 1 : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const label = range === "daily" ? "Daily" : "Weekly";

  // Gather data in parallel — failures return null, report continues
  const [
    errorsRes,
    searchesRes,
    feedbackRes,
    communityRes,
    sourceReqRes,
  ] = await Promise.allSettled([
    supabase
      .from("app_error_logs")
      .select("id, area, message, created_at", { count: "exact" })
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("search_events")
      .select("id, query, result_count, created_at", { count: "exact" })
      .gte("created_at", since)
      .limit(5),
    supabase
      .from("feedback_reports")
      .select("id, type, message, created_at", { count: "exact" })
      .gte("created_at", since)
      .eq("status", "new"),
    supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    supabase
      .from("source_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
  ]);

  const errors = errorsRes.status === "fulfilled" ? (errorsRes.value.data ?? []) : [];
  const errorCount = errorsRes.status === "fulfilled" ? (errorsRes.value.count ?? errors.length) : 0;
  const searches = searchesRes.status === "fulfilled" ? (searchesRes.value.data ?? []) : [];
  const searchCount = searchesRes.status === "fulfilled" ? (searchesRes.value.count ?? searches.length) : 0;
  const feedbackItems = feedbackRes.status === "fulfilled" ? (feedbackRes.value.data ?? []) : [];
  const feedbackCount = feedbackRes.status === "fulfilled" ? (feedbackRes.value.count ?? feedbackItems.length) : 0;
  const communityCount = communityRes.status === "fulfilled" ? (communityRes.value.count ?? 0) : 0;
  const sourceReqCount = sourceReqRes.status === "fulfilled" ? (sourceReqRes.value.count ?? 0) : 0;

  const now = new Date().toLocaleString("en-AU", { timeZone: "Australia/Melbourne" });
  const subject = `[Decolonising Archive] ${label} Admin Report — ${now}`;

  const sections: string[] = [
    `${label} Admin Report`,
    `Generated: ${now} AEST`,
    `Period: Last ${days} day${days > 1 ? "s" : ""}`,
    "",
    `Errors: ${errorCount}`,
    `Searches: ${searchCount}`,
    `New feedback reports: ${feedbackCount}`,
    `Community posts: ${communityCount}`,
    `Source requests: ${sourceReqCount}`,
    "",
  ];

  if (errors.length > 0) {
    sections.push("Recent errors:");
    for (const e of errors.slice(0, 5)) {
      const row = e as { area?: string; message?: string; created_at?: string };
      sections.push(`  [${row.area ?? "app"}] ${(row.message ?? "").slice(0, 100)}`);
    }
    sections.push("");
  }

  if (feedbackItems.length > 0) {
    sections.push("Unreviewed feedback:");
    for (const f of feedbackItems.slice(0, 5)) {
      const row = f as { type?: string; message?: string };
      sections.push(`  [${row.type ?? "other"}] ${(row.message ?? "").slice(0, 100)}`);
    }
    sections.push("");
  }

  sections.push(`View dashboard: ${siteUrl}/admin/analytics`);
  sections.push(`Manage notifications: ${siteUrl}/admin/settings/notifications`);

  const text = sections.join("\n");

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;margin:0 0 4px;">${label} Admin Report</h1>
  <p style="font-size:12px;color:#888;margin:0 0 24px;">Generated ${now} AEST &mdash; Last ${days} day${days > 1 ? "s" : ""}</p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <tr>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;"><strong>Errors</strong></td>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;">${errorCount}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;">Searches</td>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;">${searchCount}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;">New feedback reports</td>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;">${feedbackCount}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;">Community posts</td>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;">${communityCount}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;">Source requests</td>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;">${sourceReqCount}</td>
    </tr>
  </table>

  ${errors.length > 0 ? `
  <h2 style="font-size:15px;margin:0 0 8px;">Recent errors</h2>
  <ul style="margin:0 0 20px;padding-left:20px;color:#333;">
    ${errors.slice(0, 5).map((e) => {
      const row = e as { area?: string; message?: string };
      return `<li>[${row.area ?? "app"}] ${escapeHtml((row.message ?? "").slice(0, 100))}</li>`;
    }).join("")}
  </ul>` : ""}

  ${feedbackItems.length > 0 ? `
  <h2 style="font-size:15px;margin:0 0 8px;">Unreviewed feedback</h2>
  <ul style="margin:0 0 20px;padding-left:20px;color:#333;">
    ${feedbackItems.slice(0, 5).map((f) => {
      const row = f as { type?: string; message?: string };
      return `<li>[${row.type ?? "other"}] ${escapeHtml((row.message ?? "").slice(0, 100))}</li>`;
    }).join("")}
  </ul>` : ""}

  <a href="${siteUrl}/admin/analytics"
     style="background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;display:inline-block;margin-bottom:24px;">
    Open Dashboard
  </a>

  <p style="font-size:11px;color:#aaa;margin:0;">
    Private document, note, and canvas body content is not included in this report.
    <a href="${siteUrl}/admin/settings/notifications">Manage notification settings</a>
  </p>
</div>`;

  return { subject, text, html };
}

/**
 * Send a digest report to an admin user.
 * Creates a row in admin_email_reports regardless of email provider status.
 */
export async function sendAdminDigestReport(
  userId: string,
  range: DigestRange,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  try {
    const email = await getUserEmail(userId);
    if (!email) return { ok: false, error: "No email address for user." };

    const report = await generateAdminDigestReport(range);
    return sendAdminEmail(
      { to: email, subject: report.subject, html: report.html, text: report.text },
      userId,
      range === "daily" ? "daily_digest" : "weekly_digest",
    );
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// Settings CRUD (server actions use createClient for RLS)
// ---------------------------------------------------------------------------

export async function getAdminNotificationSettings(
  userId: string,
): Promise<AdminNotificationSettings | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_notification_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as AdminNotificationSettings | null) ?? null;
}

export async function upsertAdminNotificationSettings(
  userId: string,
  patch: Partial<Omit<AdminNotificationSettings, "id" | "user_id">>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_notification_settings")
    .upsert(
      { user_id: userId, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Notification reads (server actions use createClient for RLS)
// ---------------------------------------------------------------------------

export async function getAdminNotifications(
  userId: string,
  filter: "unread" | "urgent" | "all" = "all",
  limit = 50,
): Promise<AdminNotificationRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("admin_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter === "unread") query = query.eq("status", "unread");
  if (filter === "urgent") query = query.eq("severity", "urgent");

  const { data } = await query;
  return (data ?? []) as AdminNotificationRow[];
}

export async function getUnreadAdminNotificationCount(
  userId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("admin_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "unread");
  return count ?? 0;
}

export async function markAdminNotificationRead(
  notificationId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", notificationId);
  return { ok: !error };
}

export async function markAllAdminNotificationsRead(
  userId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "unread");
  return { ok: !error };
}

export async function archiveAdminNotification(
  notificationId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_notifications")
    .update({ status: "archived" })
    .eq("id", notificationId);
  return { ok: !error };
}
