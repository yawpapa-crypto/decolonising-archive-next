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

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ADMIN_NOTIFICATIONS_FROM_EMAIL;
  if (!apiKey || !from) return { ok: false, error: "Your report was saved. Please email info@yofosuasare.com while delivery is unavailable." };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: ["info@yofosuasare.com"], subject: `Archive feedback: ${type}`, text: `${message}\n\nPage: ${page_url ?? "Not supplied"}` }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Email delivery failed");
  } catch {
    return { ok: false, error: "Your report was saved, but email delivery failed. You can also contact info@yofosuasare.com." };
  }
  return { ok: true };
}
