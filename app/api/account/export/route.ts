import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

// Tables that hold a member's own rows. Missing tables or columns are skipped.
const TABLES: Array<[string, string]> = [
  ["profiles", "id"], ["bookmarks", "user_id"], ["collections", "owner_id"], ["collections", "user_id"],
  ["reading_lists", "user_id"], ["saved_searches", "user_id"], ["archive_notes", "user_id"],
  ["notifications", "user_id"], ["feedback_reports", "user_id"], ["workbench_projects", "owner_id"],
];

const csv = (v: unknown) => { const t = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
const TITLE_KEYS = ["title", "name", "query", "body", "message", "full_name", "email"];

/** A CSV copy of the signed-in member's data: one row per item, with a Details column. */
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const rows: string[][] = [["Section", "ID", "Title", "Created", "Details"]];
  rows.push(["account", user.id, user.email ?? "", user.created_at ?? "", JSON.stringify(user.user_metadata ?? {})]);
  for (const [table, col] of TABLES) {
    try {
      const { data: found, error } = await supabase.from(table).select("*").eq(col, user.id).limit(5000);
      if (error || !found) continue;
      for (const r of found as Record<string, unknown>[]) {
        const title = TITLE_KEYS.map((k) => r[k]).find((v) => typeof v === "string" && v) as string | undefined;
        const { id, created_at, ...rest } = r;
        rows.push([table, String(id ?? ""), (title ?? "").slice(0, 200), String(created_at ?? ""), Object.entries(rest).filter(([, v]) => v != null && v !== "").map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" | ")]);
      }
    } catch { /* skip */ }
  }
  const body = "\uFEFF" + rows.map((r) => r.map(csv).join(",")).join("\r\n");
  return new NextResponse(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="ared-my-data.csv"', "Cache-Control": "no-store" },
  });
}
