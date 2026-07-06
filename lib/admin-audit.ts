"use server";

import { createClient } from "@/src/lib/supabase/server";

export type AuditAction =
  | "user.ban"
  | "user.unban"
  | "user.role_change"
  | "content.remove"
  | "content.restore"
  | "report.resolve"
  | "report.dismiss"
  | "source_request.accept"
  | "source_request.decline"
  | "feedback.resolve"
  | "feedback.dismiss";

export async function logAdminAction(
  action: AuditAction,
  opts: {
    target_type?: string;
    target_id?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action,
      target_type: opts.target_type ?? null,
      target_id: opts.target_id ?? null,
      description: opts.description ?? null,
      metadata: opts.metadata ?? {},
    });
  } catch (err) {
    // Audit log failures must never break admin actions
    console.error("[admin-audit] log error", err);
  }
}
