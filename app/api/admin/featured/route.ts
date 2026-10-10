/**
 * /api/admin/featured — Featured health check (admins only; never shown in the public app).
 *
 * GET returns today's publication date, eligible/selected counts, duplicate rejections, the last
 * refresh on this server instance, provider errors and cache behaviour. If this instance has not
 * built today's selection yet, it builds it first (this also warms provider caches).
 *
 * Protection (same as /api/admin/reports/daily): Vercel Cron with Bearer $CRON_SECRET, or an
 * active admin session. Vercel cron (vercel.json) calls it shortly after midnight Africa/Accra.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { featuredHealth, getExplorePage } from "@/lib/home/for-you";
import { FEATURED_TIMEZONE, FEATURED_VERSION, featuredDate, featuredOrder } from "@/lib/home/featured";
import { loadCatalogueRecords } from "@/lib/catalogue/store";
import { allowed } from "@/lib/recommendations/catalogue";

async function isAuthorised(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && (req.headers.get("authorization") ?? "") === `Bearer ${cronSecret}`) return true;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await createAdminClient().from("profiles").select("role").eq("id", user.id).maybeSingle();
    return (data as { role?: string } | null)?.role === "admin";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorised(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const today = featuredDate();
  const errors: string[] = [];
  if (featuredHealth.date !== today) {
    await getExplorePage({ page: 1, q: "", seen: [], day: today }).catch((e) => { errors.push(e instanceof Error ? e.message : "Featured build failed"); });
  }
  const pool = loadCatalogueRecords().filter(allowed);
  const { main, relaxed } = featuredOrder(pool.map((r) => ({ id: r.id, region: r.region, periodId: r.periodId, recordType: r.recordType, visualSystemId: r.visualSystemId, institution: r.institutionOrCollection })), today, { perDay: 24 });
  const response = NextResponse.json({
    version: FEATURED_VERSION,
    timezone: FEATURED_TIMEZONE,
    selectionDate: today,
    lastSuccessfulRefresh: featuredHealth.date === today ? featuredHealth.lastRefreshAt : null,
    catalogue: { eligible: pool.length, selected: main.length, cooldownRelaxed: relaxed },
    external: { topics: featuredHealth.topics, candidates: featuredHealth.candidates, selected: featuredHealth.selected, duplicatesRejected: featuredHealth.duplicatesRejected },
    cache: {
      api: "private, no-store (the selection is a pure function of the date, so it cannot go stale)",
      providers: "1 hour per query and page; queries change daily with the topics",
      scope: "per server instance diagnostics",
    },
    errors: [...errors, ...(featuredHealth.date === today ? featuredHealth.providerErrors : [])],
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
