"use server";

import { createClient } from "@/src/lib/supabase/server";
import { createAdminNotification } from "@/lib/admin-notifications";

export type FeedbackResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitFeedbackReport(formData: FormData): Promise<FeedbackResult> {
  const type = String(formData.get("type") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const page_url = String(formData.get("page_url") ?? "").trim() || null;
  const user_agent = String(formData.get("user_agent") ?? "").trim() || null;

  const ALLOWED_TYPES = ["bug", "suggestion", "content", "accessibility", "other"] as const;
  if (!ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
    return { ok: false, error: "Please select a feedback type." };
  }
  if (message.length < 10) {
    return { ok: false, error: "Please write at least 10 characters." };
  }
  if (message.length > 5000) {
    return { ok: false, error: "Message is too long (max 5000 characters)." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("feedback_reports").insert({
    user_id: user?.id ?? null,
    type,
    message,
    page_url,
    user_agent,
    status: "new",
    priority: "normal",
  });

  if (error) {
    console.error("[feedback] insert error", error.message);
    return { ok: false, error: "Could not save your feedback. Please try again." };
  }

  // Notify admins — fire-and-forget, never throws into user action
  const notifType = type === "bug" ? "bug_report_received" : "feedback_received";
  const severity =
    type === "bug" ? "warning" :
    type === "content" ? "warning" :
    "info";
  void createAdminNotification({
    type: notifType,
    title: type === "bug" ? "New bug report submitted" : "New feedback submitted",
    body: `Type: ${type}. ${message.slice(0, 140)}${message.length > 140 ? "…" : ""}`,
    severity,
    targetType: "feedback_report",
    metadata: { feedback_type: type, page_url: page_url ?? undefined },
  });

  return { ok: true };
}
