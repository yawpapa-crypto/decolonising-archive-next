/**
 * /api/admin/reports/weekly
 *
 * Triggers a weekly digest email to all admins with weekly_digest_enabled.
 *
 * Protection:
 * - Vercel Cron calls this with Authorization: Bearer $CRON_SECRET
 * - Without CRON_SECRET, the route returns 403 unless the caller is an active admin session.
 *
 * Vercel cron config (vercel.json):
 *   { "path": "/api/admin/reports/weekly", "schedule": "0 9 * * 1" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { sendAdminDigestReport } from "@/lib/admin-notifications";

async function isAuthorised(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth === `Bearer ${cronSecret}`) return true;
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    return (data as { role?: string } | null)?.role === "admin";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorised(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data: admins } = await adminClient
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (!admins?.length) {
    return NextResponse.json({ ok: true, sent: 0, message: "No admin users found." });
  }

  const results: Array<{ userId: string; ok: boolean; skipped?: boolean; error?: string }> = [];

  for (const admin of admins as { id: string }[]) {
    const { data: settings } = await adminClient
      .from("admin_notification_settings")
      .select("weekly_digest_enabled, email_enabled")
      .eq("user_id", admin.id)
      .maybeSingle();

    const emailEnabled = (settings as { email_enabled?: boolean } | null)?.email_enabled ?? false;
    const digestEnabled = (settings as { weekly_digest_enabled?: boolean } | null)?.weekly_digest_enabled ?? true;

    if (!emailEnabled || !digestEnabled) {
      results.push({ userId: admin.id, ok: true, skipped: true });
      continue;
    }

    const result = await sendAdminDigestReport(admin.id, "weekly");
    results.push({ userId: admin.id, ...result });
  }

  const sent = results.filter((r) => r.ok && !r.skipped).length;
  return NextResponse.json({ ok: true, sent, results });
}

export const GET = POST;
